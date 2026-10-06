"""Capteurs : menu du jour (midi / soir) et prochain repas."""
from __future__ import annotations

from datetime import date, datetime, timedelta

from homeassistant.components.sensor import SensorEntity
from homeassistant.core import callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.event import async_track_time_change

from .const import DOMAIN, SIGNAL_UPDATED

NAMES = {"midi": "Menu du midi", "soir": "Menu du soir", "next": "Prochain repas"}
ICONS = {"midi": "mdi:silverware-fork-knife", "soir": "mdi:food-variant", "next": "mdi:clock-outline"}


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([MenuSensor(hass, entry, k) for k in ("midi", "soir", "next")])


class MenuSensor(SensorEntity):
    _attr_has_entity_name = False
    _attr_should_poll = False

    def __init__(self, hass, entry, kind):
        self.hass, self._kind = hass, kind
        self._attr_unique_id = f"{entry.entry_id}_{kind}"
        self._attr_name = NAMES[kind]
        self._attr_icon = ICONS[kind]
        self.entity_id = f"sensor.holm_mymenu_{kind}"

    async def async_added_to_hass(self):
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL_UPDATED, self._refresh))
        self.async_on_remove(async_track_time_change(self.hass, self._refresh, minute=0, second=5))
        self._refresh()

    @callback
    def _refresh(self, *_):
        store = self.hass.data[DOMAIN]["store"]
        today = date.today()
        if self._kind == "next":
            now = datetime.now()
            order = [(today, "midi"), (today, "soir"), (today + timedelta(days=1), "midi"), (today + timedelta(days=1), "soir")]
            if now.hour >= 14:
                order = order[1:]
            if now.hour >= 21:
                order = order[1:]
            day, slot = next(((d, s) for d, s in order if store.data["plan"].get(d.isoformat(), {}).get(s)), order[0])
        else:
            day, slot = today, self._kind
        s = store.slot_summary(day.isoformat(), slot)
        self._attr_native_value = (s["label"] or "Rien de prévu")[:250]
        recipes = [store.data["recipes"].get(e["recipe_id"]) for e in s["entries"] if e["type"] == "recipe"]
        self._attr_entity_picture = s["image"] or None
        self._attr_extra_state_attributes = {
            "date": day.isoformat(), "slot": slot,
            "recipes": [{"id": r["id"], "name": r["name"], "total": r.get("total"), "servings": r.get("servings")} for r in recipes if r],
            "entries": [store.entry_label(e) for e in s["entries"]],
        }
        if self.hass and self.entity_id:
            self.async_write_ha_state()
