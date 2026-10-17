"""API WebSocket utilisée par la carte HOLM My Menu."""
from __future__ import annotations

import base64
import binascii
import secrets
import time
import logging

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import CONF_MEALIE_TOKEN, CONF_MEALIE_URL, DOMAIN, SIGNAL_UPDATED, SLOTS
from .sources import SourceError, import_recipe_url, marmiton_search, mealie_export, mealie_recipe, mealie_recipes, off_product, off_search
from .mailer import MailError, build_bodies, send_mail, smtp_settings
from .store import MenuStore, gather_limited
from .shopping_period import shopping_period
from .calendar_export import export_to_calendar
from .document_import import analyze, DocumentImportError

_LOGGER = logging.getLogger(__name__)


def _store(hass: HomeAssistant) -> MenuStore:
    return hass.data[DOMAIN]["store"]


def _light(store: MenuStore) -> dict:
    snap = store.snapshot()
    snap["recipes"] = {k: {**{x: v for x, v in r.items() if x != "steps"}, "n_steps": len(r.get("steps") or [])} for k, r in snap["recipes"].items()}
    return snap


def _err(connection, msg, e: Exception) -> None:
    connection.send_error(msg["id"], "holm_mymenu_error", str(e) or e.__class__.__name__)


@callback
def async_register(hass: HomeAssistant) -> None:
    for fn in (ws_subscribe, ws_ing_search, ws_ing_add, ws_ing_update, ws_ing_delete, ws_ing_merge, ws_recipe_get, ws_marmiton,
               ws_import, ws_recipe_save, ws_recipe_delete, ws_plan_set, ws_plan_add, ws_plan_move, ws_shop_generate, ws_shop_add,
               ws_shop_toggle, ws_shop_toggle_group, ws_shop_remove_group, ws_shop_remove, ws_shop_update, ws_aisle_create, ws_aisle_update, ws_aisle_delete, ws_shop_restore, ws_mealie_list, ws_mealie_import, ws_mealie_export, ws_contact_save, ws_contact_delete,
               ws_shop_send, ws_stats, ws_image_upload, ws_barcode, ws_mail_info, ws_calendar_export, ws_document_upload_start,
               ws_document_upload_chunk, ws_document_upload_finish, ws_document_upload_cancel,
               ws_reminder_save, ws_reminder_delete, ws_reminder_test):
        websocket_api.async_register_command(hass, fn)


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/subscribe"})
@websocket_api.async_response
async def ws_subscribe(hass, connection, msg):
    store = _store(hass)

    @callback
    def changed(_what=None):
        connection.send_message(websocket_api.event_message(msg["id"], {"state": _light(store)}))

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, SIGNAL_UPDATED, changed)
    connection.send_result(msg["id"])
    changed()


# ---------------- ingrédients ----------------
@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/ingredient/search", vol.Required("query"): str, vol.Optional("off", default=True): bool})
@websocket_api.async_response
async def ws_ing_search(hass, connection, msg):
    store, q = _store(hass), msg["query"].strip()
    from .parser import ingredient_key
    key = ingredient_key(q)
    local = [i for i in store.data["ingredients"].values() if key and (key in i["key"] or any(key in a for a in i.get("aliases", [])))][:20]
    off, err = [], None
    if msg["off"] and len(q) >= 2:
        try:
            off = await off_search(async_get_clientsession(hass), q)
        except SourceError as e:
            err = str(e)
    connection.send_result(msg["id"], {"local": local, "off": off, "off_error": err})


async def _with_off(hass, store: MenuStore, ing: dict, off: dict) -> None:
    """Complète la fiche via l'API produit (tous les champs) et met la photo en cache local."""
    session = async_get_clientsession(hass)
    full = await off_product(session, off.get("code", "")) if off.get("code") else None
    store.apply_off(ing, {**off, **(full or {})})
    await store.cache_image(session, ing)


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/ingredient/add", vol.Required("name"): str, vol.Optional("off"): dict, vol.Optional("aisle"): str})
@websocket_api.async_response
async def ws_ing_add(hass, connection, msg):
    store, off = _store(hass), msg.get("off") or {}
    extra = {"categories": off.get("categories") or []} if off else {}
    if msg.get("aisle"):
        extra["aisle"] = msg["aisle"]
    ing = store.add_ingredient(msg["name"], **extra)
    if off:
        await _with_off(hass, store, ing, off)
    store.changed("ingredients")
    connection.send_result(msg["id"], ing)


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/ingredient/update", vol.Required("ingredient_id"): str, vol.Required("changes"): dict, vol.Optional("off"): dict})
@websocket_api.async_response
async def ws_ing_update(hass, connection, msg):
    store = _store(hass)
    try:
        ing = store.update_ingredient(msg["ingredient_id"], msg["changes"])
    except KeyError as e:
        return _err(connection, msg, e)
    if msg.get("off"):
        await _with_off(hass, store, ing, msg["off"])
    store.changed("ingredients")
    connection.send_result(msg["id"], ing)


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/ingredient/delete", vol.Required("ingredient_id"): str})
@websocket_api.async_response
async def ws_ing_delete(hass, connection, msg):
    store = _store(hass)
    store.delete_ingredient(msg["ingredient_id"])
    store.changed("ingredients")
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/ingredient/merge", vol.Required("keep"): str, vol.Required("drop"): str})
@websocket_api.async_response
async def ws_ing_merge(hass, connection, msg):
    store = _store(hass)
    store.merge_ingredients(msg["keep"], msg["drop"])
    store.changed("ingredients")
    connection.send_result(msg["id"])


# ---------------- recettes ----------------
@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/recipe/get", vol.Required("recipe_id"): str})
@websocket_api.async_response
async def ws_recipe_get(hass, connection, msg):
    r = _store(hass).data["recipes"].get(msg["recipe_id"])
    if not r:
        return connection.send_error(msg["id"], "not_found", "Recette introuvable")
    opts = hass.data[DOMAIN].get("options", {})
    # Indique à la carte si l'export Mealie est possible (bouton discret affiché seulement dans ce cas).
    connection.send_result(msg["id"], {**r, "mealie_enabled": bool(opts.get(CONF_MEALIE_URL) and opts.get(CONF_MEALIE_TOKEN))})


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/recipe/marmiton_search", vol.Required("query"): str})
@websocket_api.async_response
async def ws_marmiton(hass, connection, msg):
    store = _store(hass)
    try:
        res = await marmiton_search(async_get_clientsession(hass), msg["query"])
    except SourceError as e:
        return _err(connection, msg, e)
    for r in res:
        ex = store.find_recipe_by_url(r["url"])
        r["recipe_id"] = ex["id"] if ex else None
    connection.send_result(msg["id"], res)


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/recipe/import", vol.Required("url"): str})
@websocket_api.async_response
async def ws_import(hass, connection, msg):
    store, url = _store(hass), msg["url"].strip()
    ex = store.find_recipe_by_url(url)
    if ex:
        return connection.send_result(msg["id"], {"recipe": ex, "existing": True})
    session = async_get_clientsession(hass)
    try:
        data = await import_recipe_url(session, url)
    except SourceError as e:
        return _err(connection, msg, e)
    rec = store.save_recipe(data)
    await store.cache_image(session, rec)
    store.changed("recipes")
    connection.send_result(msg["id"], {"recipe": rec, "existing": False})


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/recipe/save", vol.Optional("recipe_id"): vol.Any(str, None), vol.Required("recipe"): dict})
@websocket_api.async_response
async def ws_recipe_save(hass, connection, msg):
    store = _store(hass)
    rec = store.save_recipe(dict(msg["recipe"]), msg.get("recipe_id"))
    if str(rec.get("image", "")).startswith("http"):
        await store.cache_image(async_get_clientsession(hass), rec)
    store.changed("recipes")
    connection.send_result(msg["id"], rec)


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/recipe/delete", vol.Required("recipe_id"): str})
@websocket_api.async_response
async def ws_recipe_delete(hass, connection, msg):
    store = _store(hass)
    store.delete_recipe(msg["recipe_id"])
    store.changed("recipes")
    connection.send_result(msg["id"])


# ---------------- planning ----------------
_ENTRY = vol.Schema({vol.Required("type"): vol.In(["recipe", "ingredient", "text"])}, extra=vol.ALLOW_EXTRA)


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/plan/set", vol.Required("day"): str, vol.Required("slot"): vol.In(SLOTS), vol.Required("entries"): [_ENTRY]})
@websocket_api.async_response
async def ws_plan_set(hass, connection, msg):
    store = _store(hass)
    store.set_slot(msg["day"], msg["slot"], msg["entries"])
    store.changed("plan")
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/plan/add", vol.Required("day"): str, vol.Required("slot"): vol.In(SLOTS), vol.Required("entry"): _ENTRY})
@websocket_api.async_response
async def ws_plan_add(hass, connection, msg):
    store = _store(hass)
    cur = list(store.data["plan"].get(msg["day"], {}).get(msg["slot"], []))
    e = msg["entry"]
    dup = any(x.get("type") == e.get("type") and ((e.get("type") == "recipe" and x.get("recipe_id") == e.get("recipe_id"))
              or (e.get("type") == "ingredient" and x.get("ingredient_id") == e.get("ingredient_id"))
              or (e.get("type") == "text" and x.get("text", "").strip().lower() == str(e.get("text", "")).strip().lower())) for x in cur)
    if not dup:
        store.set_slot(msg["day"], msg["slot"], cur + [e])
    store.changed("plan")
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/plan/move", vol.Required("src_day"): str, vol.Required("src_slot"): vol.In(SLOTS),
                                  vol.Required("dst_day"): str, vol.Required("dst_slot"): vol.In(SLOTS), vol.Optional("copy", default=False): bool})
@websocket_api.async_response
async def ws_plan_move(hass, connection, msg):
    store = _store(hass)
    if msg["copy"]:
        store.set_slot(msg["dst_day"], msg["dst_slot"], list(store.data["plan"].get(msg["src_day"], {}).get(msg["src_slot"], [])))
    else:
        store.move_slot(msg["src_day"], msg["src_slot"], msg["dst_day"], msg["dst_slot"])
    store.changed("plan")
    connection.send_result(msg["id"])


# ---------------- courses ----------------
@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/shopping/generate", vol.Required("start"): str, vol.Required("end"): str})
@websocket_api.async_response
# API COURSES : générer à partir des recettes sans perdre les ajouts manuels.
async def ws_shop_generate(hass, connection, msg):
    store = _store(hass)
    store.generate_shopping(msg["start"], msg["end"])
    store.changed("shopping")
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/shopping/add", vol.Required("name"): str, vol.Optional("qty", default=""): str})
@websocket_api.async_response
async def ws_shop_add(hass, connection, msg):
    store = _store(hass)
    store.shopping_add(msg["name"], msg["qty"])
    store.changed("shopping")
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/shopping/toggle", vol.Required("item_id"): str, vol.Optional("checked"): bool})
@websocket_api.async_response
async def ws_shop_toggle(hass, connection, msg):
    store = _store(hass)
    store.shopping_toggle(msg["item_id"], msg.get("checked"))
    store.changed("shopping")
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/shopping/toggle_group", vol.Required("item_ids"): [str]})
@websocket_api.async_response
async def ws_shop_toggle_group(hass, connection, msg):
    store = _store(hass)
    ids = set(msg["item_ids"])
    found = [it for it in store.data["shopping"].get("items", []) if it["id"] in ids]
    if found:
        checked = not all(it.get("checked") for it in found)
        for it in found:
            it["checked"] = checked
        store.changed("shopping")
    connection.send_result(msg["id"], {})


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/shopping/remove_group", vol.Required("item_ids"): [str]})
@websocket_api.async_response
# API EXCLUSIONS : retrait de la liste uniquement, pas de suppression de recette.
async def ws_shop_remove_group(hass, connection, msg):
    store = _store(hass)
    ids = set(msg["item_ids"])
    store.shopping_remove_group(list(ids))
    store.changed("shopping")
    connection.send_result(msg["id"], {})


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/shopping/remove", vol.Optional("item_id"): str, vol.Optional("checked_only", default=False): bool})
@websocket_api.async_response
async def ws_shop_remove(hass, connection, msg):
    store = _store(hass)
    store.shopping_remove(msg.get("item_id"), msg["checked_only"])
    store.changed("shopping")
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/aisle/create", vol.Required("name"): str, vol.Optional("icon", default="🟣"): str})
@websocket_api.async_response
# API RAYONS : les catégories personnalisées sont stockées par HOLM.
async def ws_aisle_create(hass, connection, msg):
    store = _store(hass)
    try:
        a = store.aisle_create(msg["name"], msg["icon"])
        store.changed("all")
        connection.send_result(msg["id"], a)
    except ValueError as e:
        _err(connection, msg, e)


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/aisle/update", vol.Required("aisle_id"): str, vol.Optional("name"): str, vol.Optional("icon"): str})
@websocket_api.async_response
async def ws_aisle_update(hass, connection, msg):
    store = _store(hass)
    try:
        store.aisle_update(msg["aisle_id"], msg.get("name"), msg.get("icon"))
        store.changed("all")
        connection.send_result(msg["id"], {})
    except ValueError as e:
        _err(connection, msg, e)


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/aisle/delete", vol.Required("aisle_id"): str})
@websocket_api.async_response
async def ws_aisle_delete(hass, connection, msg):
    store = _store(hass)
    try:
        store.aisle_delete(msg["aisle_id"])
        store.changed("all")
        connection.send_result(msg["id"], {})
    except ValueError as e:
        _err(connection, msg, e)


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/shopping/update", vol.Required("item_ids"): [str], vol.Required("changes"): dict})
@websocket_api.async_response
async def ws_shop_update(hass, connection, msg):
    store = _store(hass)
    try:
        store.shopping_update(msg["item_ids"], msg["changes"])
        store.changed("shopping")
        connection.send_result(msg["id"], {})
    except ValueError as e:
        _err(connection, msg, e)


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/shopping/restore", vol.Optional("keys"): [str]})
@websocket_api.async_response
async def ws_shop_restore(hass, connection, msg):
    store = _store(hass)
    store.shopping_restore(msg.get("keys"))
    store.changed("shopping")
    connection.send_result(msg["id"], {})


# ---------------- Mealie ----------------
def _mealie(hass):
    opts = hass.data[DOMAIN].get("options", {})
    url, token = opts.get(CONF_MEALIE_URL), opts.get(CONF_MEALIE_TOKEN)
    if not url or not token:
        raise SourceError("Renseignez l'adresse et le jeton Mealie dans les options de l'intégration")
    return url, token


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/mealie/list"})
@websocket_api.async_response
async def ws_mealie_list(hass, connection, msg):
    store = _store(hass)
    try:
        url, token = _mealie(hass)
        items = await mealie_recipes(async_get_clientsession(hass), url, token)
    except SourceError as e:
        return _err(connection, msg, e)
    have = {r.get("mealie_slug") for r in store.data["recipes"].values()}
    connection.send_result(msg["id"], [{"slug": i.get("slug"), "name": i.get("name"), "imported": i.get("slug") in have,
                                        "image": f"{url.rstrip('/')}/api/media/recipes/{i.get('id')}/images/min-original.webp" if i.get("image") else ""} for i in items])


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/mealie/import", vol.Required("slugs"): [str]})
@websocket_api.async_response
async def ws_mealie_import(hass, connection, msg):
    store = _store(hass)
    try:
        url, token = _mealie(hass)
    except SourceError as e:
        return _err(connection, msg, e)
    session = async_get_clientsession(hass)
    have = {r.get("mealie_slug") for r in store.data["recipes"].values()}
    todo = [s for s in msg["slugs"] if s not in have]
    res = await gather_limited([mealie_recipe(session, url, token, s) for s in todo], 4)
    ok, errors = 0, []
    for r in res:
        if isinstance(r, Exception):
            errors.append(str(r))
            continue
        rec = store.save_recipe(r)
        await store.cache_image(session, rec)
        ok += 1
    store.changed("recipes")
    connection.send_result(msg["id"], {"imported": ok, "skipped": len(msg["slugs"]) - len(todo), "errors": errors[:5]})


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/mealie/export", vol.Required("recipe_id"): str})
@websocket_api.async_response
async def ws_mealie_export(hass, connection, msg):
    """Envoie une recette vers Mealie (sans doublon : une recette déjà envoyée renvoie son lien)."""
    store = _store(hass)
    rec = store.data["recipes"].get(msg["recipe_id"])
    if not rec:
        return connection.send_error(msg["id"], "not_found", "Recette introuvable")
    try:
        url, token = _mealie(hass)
        image = await hass.async_add_executor_job(store.local_image, rec)
        out = await mealie_export(async_get_clientsession(hass), url, token, rec, image)
    except SourceError as e:
        return _err(connection, msg, e)
    rec["mealie_slug"] = out["slug"]
    rec["mealie_link"] = out["link"]
    store.changed("recipes")
    connection.send_result(msg["id"], out)


# ---------------- carnet d'adresses et envoi ----------------
@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/contact/save", vol.Required("name"): str, vol.Required("email"): str,
                                  vol.Optional("contact_id"): vol.Any(str, None)})
@websocket_api.async_response
async def ws_contact_save(hass, connection, msg):
    store = _store(hass)
    try:
        c = store.save_contact(msg["name"], msg["email"], msg.get("contact_id"))
    except ValueError as e:
        return _err(connection, msg, e)
    store.changed("contacts")
    connection.send_result(msg["id"], c)


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/contact/delete", vol.Required("contact_id"): str})
@websocket_api.async_response
async def ws_contact_delete(hass, connection, msg):
    store = _store(hass)
    store.delete_contact(msg["contact_id"])
    store.changed("contacts")
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/mail/info"})
@websocket_api.async_response
async def ws_mail_info(hass, connection, msg):
    s = smtp_settings(hass)
    connection.send_result(msg["id"], {"smtp": bool(s), "sender": s["sender"] if s else "", "name": s["title"] if s else ""})


# Regroupement de présentation : les identifiants de courses originaux sont
# conservés pour les cases à cocher et la synchronisation Telegram.
def _shopping_groups(store: MenuStore) -> tuple[str, list]:
    """Prépare le titre daté et les articles non cochés par rayon pour l’envoi.

    Les groupes sont uniquement une présentation : les identifiants HOLM
    d’origine restent disponibles pour les interactions avec Telegram.
    """
    sh = store.data["shopping"]
    from .shopping_groups import shopping_groups
    items = [g for g in shopping_groups(sh.get("items", [])) if not g["checked"]]
    groups = [(label, sorted([i for i in items if i["aisle"] == key], key=lambda x: x["name"].lower())) for key, label in store.aisles()]
    groups = [g for g in groups if g[1]]
    # Initialiser le titre avant d’ajouter éventuellement la période des courses.
    # Le même titre est utilisé dans le sujet e-mail et la notification HA.
    title = "Liste de courses"
    # La période vient de la génération des courses, pas de la date d’envoi.
    period = shopping_period(sh)
    if period:
        title += f" — {period}"
    return title, groups


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/shopping/send", vol.Optional("contacts", default=[]): [str],
                                  vol.Optional("emails", default=[]): [str], vol.Optional("entities", default=[]): [str],
                                  vol.Optional("telegram_targets", default=[]): [dict]})
@websocket_api.async_response
# API ENVOI : une même période de courses pour Telegram, e-mail et HA.
async def ws_shop_send(hass, connection, msg):
    """Envoie la liste via SMTP, notifications HA et/ou Telegram.

    La période provient de la liste générée, et non du jour de l’envoi.
    L’envoi SMTP précède les notifications ; les erreurs sont renvoyées au client.
    """
    store = _store(hass)
    title, groups = _shopping_groups(store)
    if not groups:
        return connection.send_error(msg["id"], "holm_mymenu_error", "La liste de courses est vide")
    text, body = build_bodies(title, groups, "Envoyé depuis HOLM My Menu")
    emails = [c["email"] for c in store.data["contacts"] if c["id"] in msg["contacts"]] + [e.strip() for e in msg["emails"] if "@" in e]
    emails = list(dict.fromkeys(emails))
    sent = {"emails": [], "entities": [], "telegram_targets": []}
    if emails:
        settings = smtp_settings(hass)
        if not settings:
            return connection.send_error(msg["id"], "holm_mymenu_error", "Aucune intégration SMTP n'est configurée dans Home Assistant pour envoyer des e-mails")
        try:
            await hass.async_add_executor_job(send_mail, settings, emails, title, text, body)
        except MailError as e:
            return _err(connection, msg, e)
        sent["emails"] = emails
    # Les notifications mobiles affichent aussi la plage complète dans le
    # corps : certains téléphones tronquent le titre de la notification.
    short = "\n".join(f"{label} : " + ", ".join(i["name"] + (f" ({i['display']})" if i.get("display") else "") for i in items) for label, items in groups)
    period = shopping_period(store.data["shopping"])
    if period:
        short = period + "\n\n" + short
    for ent in msg["entities"]:
        if not ent.startswith("notify."):
            continue
        try:
            await hass.services.async_call("notify", "send_message", {"title": title, "message": short}, target={"entity_id": ent}, blocking=True)
            sent["entities"].append(ent)
        except Exception as e:  # noqa: BLE001
            return _err(connection, msg, e)
    sync = hass.data[DOMAIN].get("telegram_sync")
    if msg["telegram_targets"]:
        if sync is None:
            return connection.send_error(msg["id"], "holm_mymenu_error", "Synchronisation Telegram indisponible")
        try:
            for target in msg["telegram_targets"]:
                chat_id = int(target["chat_id"])
                thread_id = int(target["thread_id"]) if str(target.get("thread_id", "")).strip() else None
                await sync.publish(chat_id, thread_id)
                sent["telegram_targets"].append({"chat_id": chat_id, "thread_id": thread_id})
        except (ValueError, KeyError, RuntimeError) as err:
            return _err(connection, msg, err)
    connection.send_result(msg["id"], sent)


# ---------------- statistiques ----------------
@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/stats"})
@websocket_api.async_response
async def ws_stats(hass, connection, msg):
    connection.send_result(msg["id"], await _store(hass).stats())


# ---------------- photos et code-barre ----------------
@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/image/upload", vol.Required("kind"): vol.In(["recipe", "ingredient"]),
                                  vol.Required("item_id"): str, vol.Required("data"): str})
@websocket_api.async_response
async def ws_image_upload(hass, connection, msg):
    store = _store(hass)
    obj = store.data["recipes" if msg["kind"] == "recipe" else "ingredients"].get(msg["item_id"])
    if not obj:
        return connection.send_error(msg["id"], "not_found", "Élément introuvable")
    raw = msg["data"].split(",", 1)[-1]
    try:
        body = base64.b64decode(raw, validate=False)
    except ValueError as e:
        return _err(connection, msg, e)
    if len(body) > 6_000_000 or not (body[:3] == b"\xff\xd8\xff" or body[:8] == b"\x89PNG\r\n\x1a\n" or body[8:12] == b"WEBP"):
        return connection.send_error(msg["id"], "holm_mymenu_error", "Image non reconnue ou trop lourde")
    await store.save_image(obj, body)
    store.changed(msg["kind"])
    connection.send_result(msg["id"], {"image": obj["image"]})


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/ingredient/barcode", vol.Required("code"): str})
@websocket_api.async_response
async def ws_barcode(hass, connection, msg):
    code = "".join(ch for ch in msg["code"] if ch.isdigit())
    if len(code) < 6:
        return connection.send_error(msg["id"], "holm_mymenu_error", "Code-barre invalide")
    store = _store(hass)
    have = next((i for i in store.data["ingredients"].values() if i.get("off_code") == code), None)
    p = await off_product(async_get_clientsession(hass), code)
    if not p and not have:
        return connection.send_error(msg["id"], "not_found", f"Produit {code} inconnu d'Open Food Facts")
    connection.send_result(msg["id"], {"product": p, "existing": have})


# ---------------- export calendrier ----------------
@websocket_api.websocket_command({
    vol.Required("type"): "holm_mymenu/calendar/export",
    vol.Required("entity_id"): str,
    vol.Required("start"): str,
    vol.Required("end"): str,
    vol.Optional("prefix", default=""): str,
    vol.Optional("mode", default="sync"): vol.In(["sync", "missing"]),
    vol.Optional("confirm_delete", default=False): bool,
})
@websocket_api.async_response
async def ws_calendar_export(hass, connection, msg):
    """Déclenche un export manuel, sans synchronisation permanente.

    « missing » ajoute les repas absents ; « sync » actualise les événements
    HOLM et exige confirm_delete avant toute suppression prévue.
    """
    try:
        result = await export_to_calendar(
            hass, _store(hass), msg["entity_id"], msg["start"], msg["end"], msg["prefix"][:80], msg["mode"], msg["confirm_delete"]
        )
    except Exception as err:  # noqa: BLE001 — réponse d’erreur WebSocket
        return _err(connection, msg, err)
    connection.send_result(msg["id"], result)


# ---------------- import de documents par fragments ----------------
# Les limites WebSocket de HA interdisent un PDF de plusieurs Mo en un seul
# message. Un transfert n'existe qu'en RAM, expire au bout de 10 minutes et
# est rattaché à la connexion WebSocket qui l'a créé.
_UPLOAD_MAX = 8 * 1024 * 1024
_UPLOAD_CHUNK = 128 * 1024
_UPLOAD_TTL = 600


def _uploads(hass):
    """Récupère les transferts en RAM et purge ceux inactifs depuis dix minutes."""
    pending = hass.data[DOMAIN].setdefault("_document_uploads", {})
    now = time.monotonic()
    for key, item in list(pending.items()):
        if now - item["updated"] > _UPLOAD_TTL:
            pending.pop(key, None)
    return pending


def _owned_upload(hass, connection, upload_id):
    """Refuse un transfert expiré ou créé par une autre connexion WebSocket."""
    pending = _uploads(hass)
    item = pending.get(upload_id)
    if item is None or item["connection"] is not connection:
        raise DocumentImportError("Transfert introuvable ou expiré : recommencez")
    return item


@websocket_api.websocket_command({
    vol.Required("type"): "holm_mymenu/recipe/document_upload_start",
    vol.Required("filename"): str,
    vol.Required("size"): vol.All(vol.Coerce(int), vol.Range(min=1, max=_UPLOAD_MAX)),
})
@websocket_api.async_response
async def ws_document_upload_start(hass, connection, msg):
    """Ouvre un transfert PDF de 8 Mo maximum, limité à deux par connexion."""
    pending = _uploads(hass)
    if sum(item["connection"] is connection for item in pending.values()) >= 2:
        return _err(connection, msg, DocumentImportError("Deux transferts déjà en cours"))
    upload_id = secrets.token_urlsafe(24)
    pending[upload_id] = {
        "connection": connection, "filename": msg["filename"][:180],
        "size": msg["size"], "parts": [], "received": 0,
        "updated": time.monotonic(),
    }
    connection.send_result(msg["id"], {"upload_id": upload_id})


@websocket_api.websocket_command({
    vol.Required("type"): "holm_mymenu/recipe/document_upload_chunk",
    vol.Required("upload_id"): str,
    vol.Required("index"): vol.All(vol.Coerce(int), vol.Range(min=0)),
    vol.Required("data"): str,
})
@websocket_api.async_response
async def ws_document_upload_chunk(hass, connection, msg):
    """Accepte un fragment base64 de 128 Kio maximum dans l’ordre attendu."""
    try:
        item = _owned_upload(hass, connection, msg["upload_id"])
        if msg["index"] != len(item["parts"]):
            raise DocumentImportError("Fragments reçus dans le désordre")
        if len(msg["data"]) > 180_000:
            raise DocumentImportError("Fragment trop volumineux")
        try:
            part = base64.b64decode(msg["data"], validate=True)
        except (ValueError, binascii.Error) as err:
            raise DocumentImportError("Fragment corrompu") from err
        if not part or len(part) > _UPLOAD_CHUNK or item["received"] + len(part) > item["size"]:
            raise DocumentImportError("Taille de fichier incorrecte")
        item["parts"].append(part)
        item["received"] += len(part)
        item["updated"] = time.monotonic()
        connection.send_result(msg["id"], {"received": item["received"]})
    except DocumentImportError as err:
        _err(connection, msg, err)


@websocket_api.websocket_command({
    vol.Required("type"): "holm_mymenu/recipe/document_upload_finish",
    vol.Required("upload_id"): str,
})
@websocket_api.async_response
async def ws_document_upload_finish(hass, connection, msg):
    """Assemble les fragments, supprime le transfert puis analyse le PDF."""
    try:
        item = _owned_upload(hass, connection, msg["upload_id"])
        _uploads(hass).pop(msg["upload_id"], None)
        if item["received"] != item["size"]:
            raise DocumentImportError("Fichier incomplet")
        data = b"".join(item["parts"])
        item["parts"].clear()
        result = await analyze(hass, data, item["filename"])
        connection.send_result(msg["id"], result)
    except Exception as err:  # noqa: BLE001
        _err(connection, msg, err)


@websocket_api.websocket_command({
    vol.Required("type"): "holm_mymenu/recipe/document_upload_cancel",
    vol.Required("upload_id"): str,
})
@websocket_api.async_response
async def ws_document_upload_cancel(hass, connection, msg):
    """Annule uniquement un transfert appartenant à la connexion courante."""
    pending = _uploads(hass)
    item = pending.get(msg["upload_id"])
    if item and item["connection"] is connection:
        pending.pop(msg["upload_id"], None)
    connection.send_result(msg["id"], {})


# ---------------- rappels ----------------
@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/reminder/save", vol.Required("reminder"): dict, vol.Optional("reminder_id"): str})
@websocket_api.async_response
# API RAPPELS : valider les destinations et conserver la configuration enregistrée.
async def ws_reminder_save(hass, connection, msg):
    """Valide et enregistre un rappel ; retourne son ID et ses paramètres."""
    try:
        result = hass.data[DOMAIN]["reminders"].save(msg["reminder"], msg.get("reminder_id"))
        connection.send_result(msg["id"], result)
    except (ValueError, TypeError) as err:
        _err(connection, msg, err)

@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/reminder/delete", vol.Required("reminder_id"): str})
@websocket_api.async_response
async def ws_reminder_delete(hass, connection, msg):
    """Supprime un rappel identifié, ou retourne une erreur s’il est absent."""
    try:
        hass.data[DOMAIN]["reminders"].delete(msg["reminder_id"])
        connection.send_result(msg["id"], {})
    except ValueError as err:
        _err(connection, msg, err)

@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/reminder/test", vol.Required("reminder_id"): str})
@websocket_api.async_response
async def ws_reminder_test(hass, connection, msg):
    """Teste l’envoi immédiatement, sans consommer son prochain déclenchement."""
    manager = hass.data[DOMAIN]["reminders"]
    reminder = next((r for r in manager.store.data["reminders"] if r["id"] == msg["reminder_id"]), None)
    if reminder is None:
        return connection.send_error(msg["id"], "not_found", "Rappel introuvable")
    try:
        result = await manager.execute(reminder, test=True)
        connection.send_result(msg["id"], {"status": result})
    except Exception as err:
        _err(connection, msg, err)
