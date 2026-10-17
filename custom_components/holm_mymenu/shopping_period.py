"""Période de la liste de courses, commune aux rappels et aux envois.

HOLM conserve une plage ``shopping.range`` (dates ISO inclusives). Elle doit
rester indépendante de ``shopping.generated`` : envoyer la liste plus tard ne
change jamais la semaine pour laquelle elle a été préparée.
"""
from __future__ import annotations
from datetime import date


# DATES : la période vient de shopping.range, jamais de la date d’envoi.
def shopping_period(shopping: dict, language: str = "fr") -> str:
    """Libellé de la période, vide si la liste n'a pas de plage valide."""
    period = shopping.get("range") or {}
    try:
        start = date.fromisoformat(period["start"])
        end = date.fromisoformat(period["end"])
    except (KeyError, TypeError, ValueError):
        return ""
    if end < start:
        return ""
    if language == "en":
        return f"Shopping period: {start:%d/%m/%Y} – {end:%d/%m/%Y}"
    return f"Semaine du {start:%d/%m/%Y} au {end:%d/%m/%Y}"
