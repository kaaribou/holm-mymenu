"""API WebSocket utilisée par la carte HOLM My Menu."""
from __future__ import annotations

import logging

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import CONF_MEALIE_TOKEN, CONF_MEALIE_URL, DOMAIN, SIGNAL_UPDATED, SLOTS
from .sources import SourceError, import_recipe_url, marmiton_search, mealie_recipe, mealie_recipes, off_product, off_search
from .store import MenuStore, gather_limited

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
               ws_shop_toggle, ws_shop_remove, ws_mealie_list, ws_mealie_import):
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
    connection.send_result(msg["id"], r)


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


@websocket_api.websocket_command({vol.Required("type"): "holm_mymenu/shopping/remove", vol.Optional("item_id"): str, vol.Optional("checked_only", default=False): bool})
@websocket_api.async_response
async def ws_shop_remove(hass, connection, msg):
    store = _store(hass)
    store.shopping_remove(msg.get("item_id"), msg["checked_only"])
    store.changed("shopping")
    connection.send_result(msg["id"])


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
