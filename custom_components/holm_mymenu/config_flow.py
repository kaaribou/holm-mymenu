"""Configuration de HOLM My Menu."""
from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback

from .const import CONF_MEALIE_TOKEN, CONF_MEALIE_URL, CONF_SERVINGS, DOMAIN


class HolmMyMenuFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is not None:
            return self.async_create_entry(title="HOLM My Menu", data={}, options={CONF_SERVINGS: user_input[CONF_SERVINGS]})
        return self.async_show_form(step_id="user", data_schema=vol.Schema({vol.Required(CONF_SERVINGS, default=4): vol.All(int, vol.Range(min=1, max=20))}))

    @staticmethod
    @callback
    def async_get_options_flow(entry):
        return HolmMyMenuOptions()


class HolmMyMenuOptions(config_entries.OptionsFlow):
    async def async_step_init(self, user_input=None):
        o = self.config_entry.options
        if user_input is not None:
            data = {k: v for k, v in user_input.items() if v not in ("", None)}
            return self.async_create_entry(data=data)
        return self.async_show_form(step_id="init", data_schema=vol.Schema({
            vol.Required(CONF_SERVINGS, default=o.get(CONF_SERVINGS, 4)): vol.All(int, vol.Range(min=1, max=20)),
            vol.Optional(CONF_MEALIE_URL, description={"suggested_value": o.get(CONF_MEALIE_URL, "")}): str,
            vol.Optional(CONF_MEALIE_TOKEN, description={"suggested_value": o.get(CONF_MEALIE_TOKEN, "")}): str,
        }))
