"""Export manuel du planning HOLM vers un calendrier Home Assistant, local ou distant."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
import hashlib
import logging
import re
from homeassistant.helpers.storage import Store
from zoneinfo import ZoneInfo

from homeassistant.core import HomeAssistant
from homeassistant.components.calendar import CalendarEntityFeature
from homeassistant.components.calendar.const import DATA_COMPONENT

SLOT_HOURS = {"midi": (12, 13), "soir": (19, 20)}


def calendar_events(store, start: str, end: str, prefix: str, tz_name: str):
    """Prépare un événement par repas (midi/soir), même si plusieurs recettes sont prévues.

    Les dates et heures utilisent le fuseau horaire configuré dans Home Assistant.
    Cette étape prépare uniquement les données : aucun calendrier n’est modifié.
    """
    first, last = date.fromisoformat(start), date.fromisoformat(end)
    if last < first or (last - first).days > 31:
        raise ValueError("Sélectionnez une période de 1 à 32 jours maximum")
    tz = ZoneInfo(tz_name)
    result = []
    for offset in range((last - first).days + 1):
        day = first + timedelta(days=offset)
        slots = store.data["plan"].get(day.isoformat(), {})
        for slot, (hour_start, hour_end) in SLOT_HOURS.items():
            recipes = []
            for entry in slots.get(slot, []):
                if entry.get("type") != "recipe":
                    continue
                recipe = store.data["recipes"].get(entry.get("recipe_id"))
                if recipe:
                    recipes.append(recipe)
            if not recipes:
                continue
            names = [r.get("name") or "Recette" for r in recipes]
            label = "Midi" if slot == "midi" else "Soir"
            summary = f"{prefix}{' · '.join(names)}"[:255]
            details = [f"{label} — {day.strftime('%d/%m/%Y')}", "", *[f"• {name}" for name in names]]
            for r in recipes:
                url = r.get("source_url")
                if url:
                    details.append(f"{r.get('name')}: {url}")
            result.append({
                "summary": summary,
                "description": "\n".join(details),
                "start_date_time": datetime.combine(day, time(hour_start), tz).isoformat(),
                "end_date_time": datetime.combine(day, time(hour_end), tz).isoformat(),
                "day": day.isoformat(), "slot": slot,
            })
    return result


# Marqueur stable, indépendant du titre : seuls les événements marqués HOLM sont gérés.
_MARKER = "HOLM-MY-MENU:" 
_LOGGER = logging.getLogger(__name__)


def _key(day: str, slot: str) -> str:
    return f"{day}:{slot}"


def _tag(description: str, key: str) -> str:
    return f"{description}\n\n[{_MARKER}{key}]"


def _extract(description: str) -> str | None:
    match = re.search(r"\[HOLM-MY-MENU:(\d{4}-\d{2}-\d{2}:(?:midi|soir))\]", description or "")
    return match.group(1) if match else None


def _field(event, name, default=None):
    if isinstance(event, dict):
        return event.get(name, default)
    return getattr(event, name, default)


def _when(value):
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, time.min)
    return None


def _equivalent(current, desired):
    if _field(current, "summary", "") != desired["summary"]:
        return False
    if (_field(current, "description", "") or "").strip() != desired["description"].strip():
        return False
    for actual_key, desired_key in (("start", "start_date_time"), ("end", "end_date_time")):
        actual, expected = _when(_field(current, actual_key)), _when(desired[desired_key])
        if actual is None or expected is None:
            return False
        if actual.tzinfo is None:
            actual = actual.replace(tzinfo=expected.tzinfo)
        if actual.astimezone(timezone.utc) != expected.astimezone(timezone.utc):
            return False
    return True


# CALENDRIER : export idempotent, sans doublons, à partir des événements réellement présents.
# Conserver les UID pour modifier ou supprimer les événements HOLM existants.
async def export_to_calendar(hass: HomeAssistant, store, entity_id: str, start: str, end: str,
                             prefix: str, mode: str = "sync", confirm_delete: bool = False):
    """Exporte le planning vers une entité calendrier Home Assistant.

    Mode « missing » : ajoute uniquement les repas absents ; ne modifie ni ne
    supprime les événements HOLM déjà présents, même si leur contenu a changé.
    Mode « sync » : ajoute les repas absents, actualise ceux qui ont changé et
    retire les anciens événements HOLM après confirmation explicite.

    Les événements non marqués HOLM ne sont jamais concernés. La lecture du
    calendrier et les capacités de modification/suppression sont vérifiées
    avant toute écriture pour éviter les doublons et les pertes involontaires.
    """
    if mode not in ("sync", "missing"):
        raise ValueError("Mode de synchronisation inconnu")
    if not entity_id.startswith("calendar.") or not hass.states.get(entity_id):
        raise ValueError("Calendrier introuvable")
    if not hass.services.has_service("calendar", "create_event"):
        raise ValueError("Création d'événement non disponible")
    # Lire d’abord les événements via le service public de Home Assistant.
    # L’ancien accès hass.data["calendar"].entity_component n’est plus fiable.
    if not hass.services.has_service("calendar", "get_events"):
        raise ValueError("Le service calendar.get_events est indisponible")
    first = date.fromisoformat(start)
    last = date.fromisoformat(end)
    if last < first or (last - first).days > 31:
        raise ValueError("Période invalide (maximum 32 jours)")
    tz = ZoneInfo(hass.config.time_zone)
    from_dt = datetime.combine(first - timedelta(days=1), time.min, tz)
    to_dt = datetime.combine(last + timedelta(days=2), time.min, tz)
    try:
        response = await hass.services.async_call(
            "calendar", "get_events",
            {
                "entity_id": entity_id,
                "start_date_time": from_dt.isoformat(),
                "end_date_time": to_dt.isoformat(),
            },
            blocking=True,
            return_response=True,
        )
        calendar_response = (response or {}).get(entity_id)
        if not isinstance(calendar_response, dict):
            raise ValueError("Réponse calendrier inattendue")
        existing = calendar_response.get("events")
        if not isinstance(existing, list):
            raise ValueError("Liste des événements absente")
    except Exception as err:
        raise ValueError(
            f"Impossible de lire les événements via calendar.get_events : {err}. "
            "Export annulé pour éviter les doublons"
        ) from err
    # Retrouver l’entité calendrier pour accéder à ses UID et à ses capacités.
    # DATA_COMPONENT couvre les calendriers locaux, Google et CalDAV ; ne pas
    # filtrer sur platform.domain, qui ne fonctionne pas pour tous les fournisseurs.
    calendar_entity = None
    try:
        component = hass.data.get(DATA_COMPONENT)
        if component is not None:
            calendar_entity = component.get_entity(entity_id)
    except (AttributeError, KeyError):
        calendar_entity = None

    if calendar_entity is not None:
        try:
            # La lecture directe fournit les objets CalendarEvent et leurs UID,
            # nécessaires pour mettre à jour ou supprimer un événement précis.
            existing = await calendar_entity.async_get_events(hass, from_dt, to_dt)
        except Exception as err:
            raise ValueError(
                f"Lecture du calendrier impossible : {err}. Aucun changement effectué"
            ) from err
    # Ne gérer que les événements identifiés par le marqueur HOLM et situés
    # dans la période choisie : les rendez-vous personnels restent intacts.
    owned = {}
    for event in existing:
        key = _extract(_field(event, "description", ""))
        if key and start <= key[:10] <= end:
            owned.setdefault(key, []).append(event)
    if any(len(events) > 1 for events in owned.values()):
        raise ValueError("Plusieurs événements HOLM existent pour un même repas. Corriger les doublons avant de synchroniser")
    # Construire l’état attendu du planning ; la clé date + créneau est stable,
    # même si le nom de la recette ou le préfixe change.
    desired = {}
    for event in calendar_events(store, start, end, prefix, hass.config.time_zone):
        key = _key(event["day"], event["slot"])
        desired[key] = {**event, "description": _tag(event["description"], key)}
    # Comparer l’état actuel à l’état attendu. En mode « missing », un repas
    # déjà présent est laissé tel quel ; en mode « sync », il est actualisé.
    to_create = []
    to_update = []
    to_delete = []
    unchanged = 0
    for key, event in desired.items():
        current = owned.get(key)
        if not current:
            to_create.append(event)
        elif _equivalent(current[0], event):
            unchanged += 1
        elif mode == "sync":
            to_update.append((current[0], event))
        else:
            unchanged += 1
    if mode == "sync":
        for key, current in owned.items():
            if key not in desired:
                to_delete.append(current[0])
    # Vérifier les fonctions annoncées par le calendrier avant toute écriture.
    # Sans prise en charge de la modification/suppression, on refuse l’opération
    # plutôt que de recréer des événements ou de laisser un export partiel.
    features = getattr(calendar_entity, "supported_features", 0) if calendar_entity is not None else 0
    has_update = bool(features & CalendarEntityFeature.UPDATE_EVENT)
    has_delete = bool(features & CalendarEntityFeature.DELETE_EVENT)
    if to_update and not has_update:
        raise ValueError(f"{len(to_update)} événement(s) à modifier, mais le calendrier ne permet pas la modification. Aucun changement effectué.")
    if to_delete and not has_delete:
        raise ValueError(f"{len(to_delete)} événement(s) à supprimer, mais le calendrier ne permet pas la suppression. Aucun changement effectué.")
    if to_delete and not confirm_delete:
        raise ValueError(f"Confirmation nécessaire avant la suppression de {len(to_delete)} événement(s) HOLM")
    for current, _ in to_update:
        if not _field(current, "uid"):
            raise ValueError("Événement sans UID : modification impossible en sécurité")
    for current in to_delete:
        if not _field(current, "uid"):
            raise ValueError("Événement sans UID : suppression impossible en sécurité")
    result = {"created": 0, "updated": 0, "deleted": 0, "unchanged": unchanged, "total": len(desired)}
    # Exécuter les changements uniquement après validation des capacités, des
    # confirmations de suppression et de la présence des UID nécessaires.
    for current, event in to_update:
        uid = _field(current, "uid")
        # L’API async_update_event attend « dtstart » / « dtend », contrairement
        # aux attributs « start » / « end » des CalendarEvent. Conserver le
        # fuseau horaire pour ne pas décaler les heures des repas.
        await calendar_entity.async_update_event(
            uid,
            {
                "summary": event["summary"],
                "description": event["description"],
                "dtstart": _when(event["start_date_time"]),
                "dtend": _when(event["end_date_time"]),
            },
        )
        result["updated"] += 1
    for current in to_delete:
        uid = _field(current, "uid")
        await calendar_entity.async_delete_event(uid)
        result["deleted"] += 1
    # Ajouter en dernier les repas manquants, sans toucher aux autres événements.
    for event in to_create:
        payload = {"entity_id": entity_id, **{k: event[k] for k in ("summary", "description", "start_date_time", "end_date_time")}}
        await hass.services.async_call("calendar", "create_event", payload, blocking=True)
        result["created"] += 1
    return result
