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

from .const import CARD_URL, CONF_SERVINGS, DOMAIN, STATIC_PATH, VERSION
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
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_PATH, os.path.join(os.path.dirname(__file__), "www"), False)]
        )
        card = os.path.join(os.path.dirname(__file__), "www", "holm-mymenu-card.js")
        digest = await hass.async_add_executor_job(_file_hash, card)
        add_extra_js_url(hass, f"{CARD_URL}?v={VERSION}-{digest}")
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_options_updated))
    return True


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
