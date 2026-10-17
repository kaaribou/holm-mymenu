"""Synchronisation facultative des courses avec Telegram via Home Assistant.

Utilise l’intégration telegram_bot existante : aucun jeton de bot n’est stocké ici.
"""
from __future__ import annotations

import asyncio
import html
import logging
import re
import unicodedata
from datetime import datetime, timezone
from homeassistant.util import dt as dt_util
from homeassistant.helpers.storage import Store

import voluptuous as vol
from homeassistant.core import callback, SupportsResponse
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers import config_validation as cv
from .const import DOMAIN, SIGNAL_UPDATED
from .parser import to_base
from .shopping_groups import shopping_groups
from .shopping_period import shopping_period

_LOGGER = logging.getLogger(__name__)


def register_shopping_services(hass):
    """Expose la liste et le cochage via des services HA, même sans Telegram.

    Le magasin est relu à chaque appel : après un rechargement de l'intégration,
    les services agissent sur les données courantes et non sur une ancienne copie.
    """
    def _current():
        return hass.data[DOMAIN]["store"]

    async def get_list(call):
        store = _current()
        return {"range": store.data["shopping"].get("range"),
                "items": [dict(item) for item in store.data["shopping"].get("items", [])]}

    async def set_item(call):
        store = _current()
        item_id = call.data["item_id"]
        found = next((x for x in store.data["shopping"].get("items", []) if x["id"] == item_id), None)
        if found is None:
            raise ValueError(f"Article introuvable : {item_id}")
        store.shopping_toggle(item_id, call.data["checked"])
        store.changed("shopping")

    hass.services.async_register(DOMAIN, "get_shopping_list", get_list, supports_response=SupportsResponse.ONLY)
    hass.services.async_register(DOMAIN, "set_shopping_item", set_item,
                                 schema=vol.Schema({vol.Required("item_id"): cv.string,
                                                    vol.Required("checked"): cv.boolean}))


# TELEGRAM : un flux partagé par destination ; les boutons agissent sur les IDs originaux.
# Les messages de rappel restent distincts de la liste interactive.
class TelegramShoppingSync:
    """Conserve les messages interactifs par destination (chat, sujet facultatif).

    Chaque destination garde ses identifiants de messages dans le stockage HA.
    Les rappels Telegram sont distincts et ne remplacent jamais cette liste.
    """

    def __init__(self, hass, store):
        self.hass, self.store = hass, store
        self.destinations = {}  # (chat, sujet) -> identifiants des pages envoyées
        self._unsubs = []
        self._task = None
        self._lock = asyncio.Lock()
        self._storage = Store(hass, 1, "holm_mymenu_telegram_destinations")
        self._sent_content = {}  # (destination, page) -> (texte, boutons)

    async def async_start(self):
        saved = await self._storage.async_load() or {}
        for target in saved.get("destinations", []):
            key = (int(target["chat_id"]), target.get("thread_id"))
            self.destinations[key] = list(target.get("message_ids", []))
        self._unsubs.append(self.hass.bus.async_listen("telegram_callback", self._on_callback))
        self._unsubs.append(async_dispatcher_connect(self.hass, SIGNAL_UPDATED, self._on_updated))

    async def async_stop(self):
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        if self._task:
            self._task.cancel()

    def _save(self):
        self._storage.async_delay_save(
            lambda: {"destinations": [
                {"chat_id": chat, "thread_id": thread, "message_ids": ids}
                for (chat, thread), ids in self.destinations.items()
            ]}, 1.0
        )

    def _language(self):
        """Use Home Assistant's language, falling back to French."""
        language = (getattr(self.hass.config, "language", None) or "fr").lower()
        return "en" if language.startswith("en") else "fr"

    @staticmethod
    def _ingredient_name(name, language="fr"):
        """Recognize a small, explicit set of equivalent ingredient variants.

        Never use fuzzy prefix matching: olive oil is not sunflower oil,
        and cherry tomatoes are not automatically standard tomatoes.
        """
        name = re.sub(r"\s+", " ", str(name or "").strip())
        normalized = "".join(c for c in unicodedata.normalize("NFD", name.casefold())
                             if unicodedata.category(c) != "Mn")
        normalized = normalized.replace("œ", "oe").replace("’", "'")
        normalized = re.sub(r"[^a-z0-9 ]+", " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized).strip()

        egg_fr = r"(?:oeufs?|oeufs? par personne|jaunes? d? ?oeufs?|blancs? d? ?oeufs?)"
        egg_en = r"(?:eggs?|eggs? per person|egg yolks?|egg whites?|yolks? of eggs?|whites? of eggs?)"
        if re.fullmatch(egg_fr + "|" + egg_en, normalized):
            return ("Eggs" if language == "en" else "Œufs"), "ingredient:eggs"

        # Potatoes: preparation/variety qualifiers, but not sweet potatoes.
        potato_fr = r"(?:pommes? de terre|patates?)(?: (?:moyennes?|petites?|grosses?|grandes?|chair ferme|a chair ferme|farineuses?|nouvelles?|de conservation|rouges?|blanches?))*"
        potato_en = r"(?:potatoes?|white potatoes?|red potatoes?|waxy potatoes?|floury potatoes?|medium potatoes?|small potatoes?|large potatoes?|new potatoes?)"
        if re.fullmatch(potato_fr + "|" + potato_en, normalized):
            return ("Potatoes" if language == "en" else "Pommes de terre"), "ingredient:potatoes"

        tomato_fr = r"tomates?(?: (?:rondes?|grappes?|en grappe|classiques?|moyennes?|grosses?|petites?))*"
        tomato_en = r"(?:(?:round|vine|regular|medium|large|small) )?tomatoes?"
        if re.fullmatch(tomato_fr + "|" + tomato_en, normalized):
            return ("Tomatoes" if language == "en" else "Tomates"), "ingredient:tomatoes"

        # Common names and explicitly equivalent variants.
        # Other varieties stay distinct: olive/sunflower oil, dark/white
        # chocolate, wheat/corn flour, baker's yeast/chemical raising agent.
        baking_powder = {"levure", "levure chimique", "poudre a lever",
                         "baking powder", "chemical yeast"}
        if normalized in baking_powder:
            return ("Baking powder" if language == "en" else "Levure chimique"), "ingredient:baking_powder"

        # Exact names also merge despite capitalization, accents and punctuation.
        return name, "exact:" + normalized

    @staticmethod
    def _amount(item):
        """Return numeric base-unit quantity or keep an opaque display unchanged."""
        q, unit = item.get("qty"), item.get("unit") or ""
        if isinstance(q, (int, float)) and not isinstance(q, bool):
            base_qty, base_unit = to_base(float(q), unit)
            return float(base_qty), base_unit, ""
        display = str(item.get("display") or "").strip()
        m = re.fullmatch(r"(\d+(?:[.,]\d+)?)\s*(.*)", display)
        if m:
            raw = float(m.group(1).replace(",", "."))
            parsed, base_unit = to_base(raw, m.group(2).strip())
            if parsed is not None:
                return float(parsed), base_unit, ""
        return None, unit, display

    def _grouped_items(self):
        """Regroupe uniquement l’affichage ; chaque article HOLM garde son ID.

        Le bouton Telegram d’un groupe agit sur tous les articles sous-jacents.
        """
        items = []
        for item in self.store.data["shopping"].get("items", []):
            cloned = dict(item)
            label, key = self._ingredient_name(item.get("name", ""), self._language())
            if key.startswith("ingredient:"):
                cloned["name"] = label
            egg_name = str(item.get("name") or "").casefold().replace("œ", "oe").replace("’", "'")
            egg_match = re.fullmatch(
                r"\s*(?:jaunes?\s+d[' ]?oeufs?|blancs?\s+d[' ]?oeufs?)"
                r"\s*\+\s*(\d+(?:[.,]\d+)?)\s*(?:oeufs? entiers?|oeufs?)\s*",
                egg_name,
            )
            if egg_match and isinstance(item.get("qty"), (int, float)):
                cloned["name"] = "Œufs" if self._language() == "fr" else "Eggs"
                cloned["qty"] = item["qty"] + float(egg_match.group(1).replace(",", "."))
            items.append(cloned)
        return shopping_groups(items)

    def _group_display(self, group):
        return group["display"]

    def _generation_header(self):
        stamp = self.store.data["shopping"].get("generated")
        language = self._language()
        if isinstance(stamp, (int, float)):
            local = dt_util.as_local(datetime.fromtimestamp(stamp, tz=timezone.utc))
            prefix = "Generated on " if language == "en" else "Générée le "
            separator = " at " if language == "en" else " à "
            return prefix + local.strftime("%d/%m/%Y") + separator + local.strftime("%H:%M")
        return "Generation date unavailable" if language == "en" else "Date de génération indisponible"

    @staticmethod
    def _aisle_icon(name):
        """Colored dots as Telegram does not support arbitrary font colors."""
        label = name.casefold()
        if "fruit" in label or "légume" in label: return "🟢"
        if "viande" in label or "poisson" in label: return "🔴"
        if "crèmerie" in label or "œuf" in label: return "🟡"
        if "sucr" in label: return "🟣"
        if "condiment" in label or "épice" in label or "herbe" in label: return "🟤"
        if "épicerie" in label: return "🟠"
        if "maison" in label or "entretien" in label or "hygiène" in label: return "🔵"
        return "⚪"

    @staticmethod
    def _aisle_title(name):
        """Sentence case without lowercasing acronyms embedded in item names."""
        label = name.strip().lower()
        return label[:1].upper() + label[1:]

    def _pages(self):
        """Construit les pages Telegram dans l’ordre des rayons HOLM.

        Un bouton par groupe permet de cocher toutes ses entrées originales.
        La pagination limite chaque message à 3 800 caractères et 70 boutons ;
        le titre, la période et les en-têtes de rayon sont répétés si nécessaire.
        """
        groups = self._grouped_items()
        language = self._language()
        aisle_names = dict(self.store.aisles())
        aisle_order = {key: idx for idx, (key, _) in enumerate(self.store.aisles())}
        for group in groups:
            source = group["items"][0]
            group["aisle"] = source.get("aisle") or "autre"
        groups.sort(key=lambda g: (
            aisle_order.get(g["aisle"], len(self.store.aisles())),
            g["name"].casefold(),
        ))

        pages = []
        position = 0
        while position < len(groups) or not pages:
            page_no = len(pages) + 1
            title = "🛒 Shopping list" if language == "en" else "🛒 Liste de courses"
            if page_no > 1:
                title += f" (part {page_no})" if language == "en" else f" (suite {page_no})"
            # La date de génération et la période couverte sont deux informations
            # distinctes. La période doit rester visible sur chaque page Telegram.
            period = shopping_period(self.store.data["shopping"], language)
            lines = [f"<b>{html.escape(title)}</b>",
                     f"<i>HOLM MyMenu - {html.escape(self._generation_header())}</i>"]
            if period:
                lines.append(f"<b>{html.escape(period)}</b>")
            buttons = []
            current_aisle = None
            while position < len(groups):
                group = groups[position]
                checked = all(i.get("checked") for i in group["items"])
                qty = self._group_display(group)
                aisle = group["aisle"]
                heading = ("\n" + next((a.get("icon", "🟣") for a in self.store.data.get("custom_aisles", []) if a["id"] == aisle), self._aisle_icon(aisle_names.get(aisle, aisle))) +
                           " <b>" + html.escape(self._aisle_title(aisle_names.get(aisle, aisle))) + "</b>") if aisle != current_aisle else ""
                ingredient = html.escape(group["name"])
                if checked:
                    ingredient = "<s>" + ingredient + "</s>"
                line = ("✓ " if checked else "▫ ") + ingredient + (" <i>· " + html.escape(qty) + "</i>" if qty else "")
                candidate = heading + "\n" + line
                # Garder une marge pour les balises HTML et la limite Telegram.
                if len("\n".join(lines)) + len(candidate) + 20 > 3800 and buttons:
                    break
                if len(buttons) >= 70:
                    break
                if heading:
                    lines.append(heading)
                    current_aisle = aisle
                lines.append(line)
                # La syntaxe inline_keyboard de HA sépare les boutons par des
                # virgules : nettoyer seulement le libellé visible, pas l’ID.
                aisle_icon = next((a.get("icon", "🟣") for a in self.store.data.get("custom_aisles", []) if a["id"] == aisle), self._aisle_icon(aisle_names.get(aisle, aisle)))
                label = aisle_icon + (" ☑ " if checked else " ☐ ") + group["name"]
                if qty:
                    label += " — " + qty
                label = label.replace(",", "·").replace(":", " - ").replace("\n", " ")
                # Tronquer le libellé pour respecter les limites des boutons Telegram.
                if len(label) > 58:
                    label = label[:57] + "…"
                buttons.append(f"{label}:/holm:{group['items'][0]['id']}")
                position += 1
            if not buttons:
                lines.append("(empty list)" if language == "en" else "(liste vide)")
            # Un bouton par ligne pour faciliter le cochage sur mobile.
            keyboard = list(buttons)
            pages.append(("\n".join(lines), keyboard))
        return pages

    async def _call(self, action, data):
        if not self.hass.services.has_service("telegram_bot", action):
            raise RuntimeError(f"Action telegram_bot.{action} indisponible")
        return await self.hass.services.async_call("telegram_bot", action, data, blocking=True, return_response=(action == "send_message"))

    @staticmethod
    def _extract_message_id(response, chat_id):
        chats = (response or {}).get("chats", [])
        message_id = next((int(c["message_id"]) for c in chats
                           if int(c["chat_id"]) == chat_id), None)
        if message_id is None:
            raise RuntimeError("Telegram n'a pas renvoyé l'identifiant du message")
        return message_id

    async def publish(self, chat_id, thread_id=None):
        """Publie ou actualise la liste dans un chat et, si fourni, son sujet."""
        key = (int(chat_id), int(thread_id) if thread_id is not None else None)
        async with self._lock:
            self.destinations.setdefault(key, [])
            await self._refresh_one(key)
            self._save()

    async def _refresh_one(self, key, force_new=False):
        """Modifie les pages existantes ou crée/remplace les messages absents.

        Le sujet Telegram n’est utilisé qu’à la création. Les UID des messages
        permettent les mises à jour, sans renvoyer toute la liste à chaque clic.
        Les pages devenues inutiles sont supprimées si Telegram l’autorise.
        """
        chat_id, thread_id = key
        pages = self._pages()
        ids = self.destinations.get(key, [])
        # Les identifiants des messages proviennent de la réponse send_message.
        for index, (body, keyboard) in enumerate(pages):
            data = {"chat_id": chat_id, "message": body, "inline_keyboard": keyboard,
                    "parse_mode": "html"}
            if thread_id is not None:
                data["message_thread_id"] = thread_id
            if not force_new and index < len(ids):
                edit = {"chat_id": chat_id, "message_id": ids[index], "message": body,
                        "inline_keyboard": keyboard, "parse_mode": "html"}
                content_key = (key, index)
                content = (body, tuple(keyboard))
                if self._sent_content.get(content_key) == content:
                    continue
                try:
                    await self._call("edit_message", edit)
                    self._sent_content[content_key] = content
                    continue
                except Exception as err:
                    detail = str(err).lower()
                    if "message is not modified" in detail:
                        self._sent_content[content_key] = content
                        continue
                    if "message to edit not found" in detail or "message can't be edited" in detail:
                        # Message supprimé ou issu d’un autre bot : remplacer
                        # l’identifiant périmé par celui d’un nouveau message.
                        _LOGGER.warning(
                            "Telegram message %s unavailable in chat %s; sending a replacement",
                            ids[index], chat_id,
                        )
                        response = await self._call("send_message", data)
                        new_id = self._extract_message_id(response, chat_id)
                        ids[index] = new_id
                        self._sent_content[content_key] = content
                        self._save()
                        continue
                    _LOGGER.exception("Telegram message update failed for chat %s", chat_id)
                    # Conserver l’ID ; réessayer au prochain changement de liste.
                    continue
            response = await self._call("send_message", data)
            message_id = self._extract_message_id(response, chat_id)
            ids.append(message_id)
            self._sent_content[(key, index)] = (body, tuple(keyboard))
            self._save()
        # Supprimer les anciennes pages excédentaires quand la liste raccourcit.
        if not force_new and len(ids) > len(pages):
            for old_id in ids[len(pages):]:
                try:
                    await self._call("delete_message", {"chat_id": chat_id, "message_id": old_id})
                except Exception:
                    _LOGGER.warning("Could not delete stale Telegram message %s", old_id)
            self.destinations[key] = ids[:len(pages)]
            for page_index in range(len(pages), len(ids)):
                self._sent_content.pop((key, page_index), None)
            self._save()

    @callback
    def _on_callback(self, event):
        """Accepte uniquement les clics de messages HOLM connus.

        Le bouton contient l’ID d’un article ; si celui-ci représente un groupe,
        toutes ses entrées sont cochées/décochées ensemble puis synchronisées.
        """
        data = event.data
        payload = str(data.get("data") or "")
        if not payload.startswith("/holm:"):
            return
        try:
            chat = int(data.get("chat_id"))
        except (TypeError, ValueError):
            return
        message = data.get("message") or {}
        try:
            message_id = int(message.get("message_id"))
        except (ValueError, TypeError):
            return
        if not any(key[0] == chat and message_id in ids for key, ids in self.destinations.items()):
            return
        item_id = payload[6:]
        item = next((i for i in self.store.data["shopping"].get("items", []) if i["id"] == item_id), None)
        if item is None:
            return
        # Le bouton d’un groupe représente toutes les entrées HOLM associées.
        group = next((g for g in self._grouped_items()
                      if any(i["id"] == item_id for i in g["items"])), None)
        if group is None:
            return
        new_checked = not all(i.get("checked") for i in group["items"])
        for entry in group["items"]:
            self.store.shopping_toggle(entry["id"], new_checked)
        self.store.changed("shopping")
        # Acquitter le clic pour arrêter l’indicateur de chargement Telegram.
        callback_id = data.get("id")
        if callback_id and self.hass.services.has_service("telegram_bot", "answer_callback_query"):
            self.hass.async_create_task(self._ack_callback(callback_id))

    async def _ack_callback(self, callback_id):
        try:
            await self._call("answer_callback_query", {
                "callback_query_id": callback_id, "message": "Article mis à jour"
            })
        except Exception:
            _LOGGER.exception("Unable to acknowledge Telegram shopping callback")

    @callback
    def _on_updated(self, what):
        """Planifie une actualisation après une modification de la liste HOLM."""
        if what != "shopping" or not self.destinations:
            return
        if self._task and not self._task.done():
            self._task.cancel()
        self._task = self.hass.async_create_task(self._refresh_debounced())

    async def _refresh_debounced(self):
        """Regroupe les changements sur 0,6 s pour limiter les appels Telegram."""
        try:
            await asyncio.sleep(0.6)
            async with self._lock:
                for key in list(self.destinations):
                    await self._refresh_one(key)
        except asyncio.CancelledError:
            raise
        except Exception:
            _LOGGER.exception("Telegram shopping sync failed")
