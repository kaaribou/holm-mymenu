"""HOLM My Menu — recettes, ingrédients, menus de la semaine et liste de courses."""
from __future__ import annotations

import hashlib
import logging
import os

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import CARD_URL, CONF_SERVINGS, DOMAIN, MEDIA_PATH, STATIC_PATH, VERSION
from .store import MenuStore
from .websocket import async_register

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.SENSOR]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    store = MenuStore(hass, int(entry.options.get(CONF_SERVINGS, 4)))
    await store.async_load()
    first = DOMAIN not in hass.data
    hass.data[DOMAIN] = {"store": store, "options": dict(entry.options)}
    if first:
        async_register(hass)
        # dossier des photos : créé ici et servi par l'intégration elle-même, pour fonctionner
        # même si config/www n'existait pas au démarrage de Home Assistant (/local inactif)
        media = hass.config.path("www", "holm_mymenu")
        await hass.async_add_executor_job(lambda: os.makedirs(media, exist_ok=True))
        await hass.http.async_register_static_paths([
            StaticPathConfig(STATIC_PATH, os.path.join(os.path.dirname(__file__), "www"), False),
            StaticPathConfig(MEDIA_PATH, media, False),
        ])
        card = os.path.join(os.path.dirname(__file__), "www", "holm-mymenu-card.js")
        digest = await hass.async_add_executor_job(_file_hash, card)
        url = f"{CARD_URL}?v={VERSION}-{digest}"
        if not await _register_resource(hass, url):
            add_extra_js_url(hass, url)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_options_updated))
    return True


async def _register_resource(hass: HomeAssistant, url: str) -> bool:
    """Déclare la carte comme ressource Lovelace (mode stockage) ; met à jour la version si besoin.

    Une ressource est relue à chaque ouverture du tableau de bord : le navigateur ne peut pas
    garder une ancienne version de la page sans la carte. Renvoie False en mode YAML.
    """
    try:
        data = hass.data.get("lovelace")
        resources = getattr(data, "resources", None) or (data.get("resources") if isinstance(data, dict) else None)
        if resources is None or not hasattr(resources, "async_create_item"):
            return False
        if not getattr(resources, "loaded", True):
            await resources.async_load()
            resources.loaded = True
        mine = [r for r in resources.async_items() if str(r.get("url", "")).split("?")[0] == CARD_URL]
        if not mine:
            await resources.async_create_item({"res_type": "module", "url": url})
        else:
            if mine[0].get("url") != url:
                await resources.async_update_item(mine[0]["id"], {"res_type": "module", "url": url})
            for extra in mine[1:]:
                await resources.async_delete_item(extra["id"])
        return True
    except Exception as err:  # noqa: BLE001 — repli sur add_extra_js_url
        _LOGGER.debug("Ressource Lovelace non enregistrée (%s), chargement par extra_js_url", err)
        return False


def _file_hash(path: str) -> str:
    """Empreinte courte de la carte : le navigateur recharge la carte dès qu'elle change."""
    try:
        with open(path, "rb") as f:
            return hashlib.sha1(f.read()).hexdigest()[:8]
    except OSError:
        return "0"


async def _options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    hass.data[DOMAIN]["options"] = dict(entry.options)
    hass.data[DOMAIN]["store"].servings = int(entry.options.get(CONF_SERVINGS, 4))


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
