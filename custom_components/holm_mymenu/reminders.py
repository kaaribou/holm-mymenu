"""Rappels HOLM persistants, planifiés selon l’heure locale de Home Assistant."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from .mailer import smtp_settings, send_mail
from .shopping_period import shopping_period
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)
TYPES = {"shopping", "planning", "recipe", "custom"}
FREQUENCIES = {"once", "daily", "weekly"}


def validate(data):
    """Valide fréquence, horaire et destinataires avant stockage du rappel.

    Les jours hebdomadaires suivent weekday() : lundi=0, dimanche=6.
    """
    title = str(data.get("title", "")).strip()
    if not title or len(title) > 100:
        raise ValueError("Titre requis (100 caractères maximum)")
    kind = data.get("kind", "custom")
    freq = data.get("frequency", "weekly")
    if kind not in TYPES or freq not in FREQUENCIES:
        raise ValueError("Type ou fréquence invalide")
    clock = str(data.get("time", ""))
    try:
        hour, minute = map(int, clock.split(":"))
        if not 0 <= hour < 24 or not 0 <= minute < 60: raise ValueError()
    except (ValueError, TypeError):
        raise ValueError("Heure invalide (HH:MM)") from None
    days = data.get("days", [4])
    if not isinstance(days, list) or any(type(d) is not int or d not in range(7) for d in days):
        raise ValueError("Jours invalides")
    on_date = str(data.get("date", ""))
    if freq == "once":
        try: datetime.strptime(on_date, "%Y-%m-%d")
        except ValueError: raise ValueError("Date requise pour un rappel ponctuel") from None
    targets = data.get("telegram_targets", [])
    if not isinstance(targets, list) or len(targets) > 30:
        raise ValueError("Destinations Telegram invalides")
    cleaned_targets = []
    for target in targets:
        try:
            chat = int(target["chat_id"])
            thread = target.get("thread_id")
            cleaned_targets.append({"chat_id": chat, "thread_id": int(thread) if thread not in (None, "") else None})
        except (TypeError, ValueError, KeyError):
            raise ValueError("Identifiant Telegram invalide") from None
    notify = str(data.get("notify_service", "")).strip()
    if notify and (not notify.startswith("notify.") or len(notify) > 120):
        raise ValueError("Le service doit commencer par notify.")
    notify_entities = data.get("notify_entities", [])
    if not isinstance(notify_entities, list) or len(notify_entities) > 30 or any(not isinstance(e, str) or not e.startswith("notify.") or len(e) > 120 for e in notify_entities):
        raise ValueError("Appareils de notification invalides")
    emails = data.get("emails", [])
    if not isinstance(emails, list) or len(emails) > 30 or any(not isinstance(e, str) or len(e) > 254 or "@" not in e for e in emails):
        raise ValueError("Adresses e-mail invalides")
    return {"notify_entities": list(dict.fromkeys(notify_entities)), "emails": list(dict.fromkeys(e.strip() for e in emails)), "title": title, "kind": kind, "frequency": freq, "time": f"{hour:02d}:{minute:02d}",
            "days": days, "date": on_date, "enabled": bool(data.get("enabled", True)),
            "only_if_needed": bool(data.get("only_if_needed", True)), "message": str(data.get("message", ""))[:1000],
            "telegram_targets": cleaned_targets, "notify_service": notify}


# RAPPELS : planification selon le fuseau HA, état persistant et protection anti-doublons.
# Canaux indépendants : notification mobile, Telegram et e-mail.
class ReminderManager:
    """Gère les rappels enregistrés et leurs envois multicanaux.

    Vérification toutes les 30 secondes dans le fuseau HA ; le marqueur last_run
    empêche un second envoi pendant la même minute, même après redémarrage.
    """
    def __init__(self, hass, store):
        self.hass, self.store = hass, store
        self._unsub = None
        self._lock = False

    async def async_start(self):
        self._unsub = async_track_time_interval(self.hass, self._tick, timedelta(seconds=30))
        await self._tick(None)

    async def async_stop(self):
        if self._unsub:
            self._unsub()
            self._unsub = None

    def save(self, payload, reminder_id=None):
        """Crée ou modifie un rappel, sans réarmer une simple modification de texte."""
        data = validate(payload)
        existing = next((r for r in self.store.data["reminders"] if r["id"] == reminder_id), None)
        if reminder_id and not existing:
            raise ValueError("Rappel introuvable")
        if existing:
            # Conserver last_run lors d’un changement de titre ou de message.
            # Réinitialiser uniquement si la date, les jours ou l’heure changent.
            changed_schedule = any(existing.get(k) != data[k] for k in ("time", "frequency", "days", "date"))
            existing.update(data)
            if changed_schedule:
                existing["last_run"] = ""
            result = existing
        else:
            result = {"id": uuid.uuid4().hex[:12], **data, "last_run": "", "last_status": ""}
            self.store.data["reminders"].append(result)
        self.store.changed("reminders")
        return result

    def delete(self, reminder_id):
        before = len(self.store.data["reminders"])
        self.store.data["reminders"] = [r for r in self.store.data["reminders"] if r["id"] != reminder_id]
        if len(self.store.data["reminders"]) == before:
            raise ValueError("Rappel introuvable")
        self.store.changed("reminders")

    def _due(self, r, now):
        """Teste l’heure locale et la récurrence (ponctuelle, quotidienne, hebdo)."""
        if not r.get("enabled", True): return False
        if r.get("time") != now.strftime("%H:%M"): return False
        frequency = r.get("frequency")
        if frequency == "once": return r.get("date") == now.date().isoformat()
        if frequency == "weekly": return now.weekday() in r.get("days", [])
        return frequency == "daily"

    def _message(self, r):
        """Prépare le message commun et ignore les rappels inutiles si demandé."""
        kind = r["kind"]
        if kind == "custom": return r.get("message") or r["title"]
        if kind == "shopping":
            # Tous les canaux (Telegram, mobile et e-mail) partagent ce corps
            # de message : inclure ici la période évite les divergences.
            period = shopping_period(self.store.data["shopping"])
            pending = [i for i in self.store.data["shopping"].get("items", []) if not i.get("checked")]
            if not pending and r.get("only_if_needed", True): return None
            return (f"🛒 {r['title']}\n"
                    + (period + "\n" if period else "")
                    + f"{len(pending)} article(s) restant(s) à acheter.")
        if kind == "planning":
            today = dt_util.now().date()
            # Examiner les sept prochains jours du planning, sans confondre
            # les ingrédients d’une recette avec un repas planifié.
            plan = self.store.data["plan"]
            missing = [ (today + timedelta(days=i)).strftime("%d/%m") for i in range(7)
                        if any(not plan.get((today + timedelta(days=i)).isoformat(), {}).get(slot)
                               for slot in ("midi", "soir"))]
            if not missing and r.get("only_if_needed", True): return None
            return f"📅 {r['title']}\n{len(missing)} jour(s) avec au moins un repas non planifié sur les 7 prochains jours."
        # Le rappel de préparation est saisi par l’utilisateur : pas d’inférence
        # automatique depuis les ingrédients ou les étapes de la recette.
        if kind == "recipe": return "🍳 " + (r.get("message") or r["title"])
        return r["title"]

    async def _send(self, r, body):
        """Envoie un même texte à Telegram, aux notifications HA et par SMTP.

        Les messages de rappel Telegram restent séparés de la liste interactive.
        En cas d’échec d’un canal, une exception interrompt la suite des envois ;
        les canaux déjà traités ne sont pas annulés.
        """
        sent = 0
        for target in r.get("telegram_targets", []):
            if not self.hass.services.has_service("telegram_bot", "send_message"):
                raise RuntimeError("Service telegram_bot.send_message indisponible")
            data = {"chat_id": target["chat_id"], "message": body}
            if target.get("thread_id") is not None: data["message_thread_id"] = target["thread_id"]
            await self.hass.services.async_call("telegram_bot", "send_message", data, blocking=True)
            sent += 1
        service = r.get("notify_service") or ""
        if service:
            domain, name = service.split(".", 1)
            if not self.hass.services.has_service(domain, name):
                raise RuntimeError(f"Service {service} indisponible")
            await self.hass.services.async_call(domain, name, {"title": "HOLM My Menu", "message": body}, blocking=True)
            sent += 1
        for entity in r.get("notify_entities", []):
            if not self.hass.services.has_service("notify", "send_message"):
                raise RuntimeError("Service notify.send_message indisponible")
            await self.hass.services.async_call("notify", "send_message", {"title": "HOLM My Menu", "message": body}, target={"entity_id": entity}, blocking=True)
            sent += 1
        emails = r.get("emails", [])
        if emails:
            settings = smtp_settings(self.hass)
            if not settings:
                raise RuntimeError("Aucun serveur SMTP configuré dans Home Assistant")
            await self.hass.async_add_executor_job(send_mail, settings, emails, "🔔 Rappel HOLM My Menu", body, "<div style='font-family:sans-serif;white-space:pre-line'>" + __import__('html').escape(body) + "</div>")
            sent += len(emails)
        if not sent:
            raise RuntimeError("Aucun destinataire configuré")

    async def execute(self, r, test=False):
        """Exécute le rappel ; un test ne change pas son statut ni last_run."""
        body = self._message(r)
        if body is None:
            if not test:
                r["last_status"] = "Ignoré : aucune action nécessaire"
                self.store.changed("reminders")
            return "Aucun rappel nécessaire"
        await self._send(r, body)
        if not test:
            r["last_status"] = "Envoyé"
            self.store.changed("reminders")
        return "Notification envoyée"

    async def _tick(self, _now):
        """Contrôle les rappels dus et mémorise leur minute avant l’envoi.

        En cas d’erreur, last_status contient l’échec mais last_run reste posé :
        aucun renvoi automatique n’a lieu dans la même minute. Le verrou
        évite que deux passages du minuteur s’exécutent simultanément.
        """
        if self._lock: return
        self._lock = True
        try:
            now = dt_util.now()
            key = now.strftime("%Y-%m-%d %H:%M")
            for r in list(self.store.data.get("reminders", [])):
                if not self._due(r, now) or r.get("last_run") == key: continue
                # Persister last_run avant l’envoi pour éviter un doublon après
                # redémarrage, même si un canal échoue ensuite.
                r["last_run"] = key
                self.store.changed("reminders")
                try: await self.execute(r)
                except Exception as err:
                    r["last_status"] = f"Erreur : {err}"[:200]
                    self.store.changed("reminders")
                    _LOGGER.warning("HOLM reminder %s: %s", r["id"], err)
        finally:
            self._lock = False
