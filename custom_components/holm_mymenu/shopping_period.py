"""Période de la liste de courses, commune aux rappels et aux envois.

HOLM conserve une plage ``shopping.range`` (dates ISO inclusives). Elle doit
rester indépendante de ``shopping.generated`` : envoyer la liste plus tard ne
change jamais la période pour laquelle elle a été préparée.
"""
from __future__ import annotations
from datetime import date

MAX_DAYS = 31  # durée maximale d'une liste de courses (jours inclus)


def parse_range(start: str, end: str) -> tuple[date, date]:
    """Valide une plage de dates ISO (inclusive) ; lève ValueError sinon."""
    d0, d1 = date.fromisoformat(start), date.fromisoformat(end)
    if d1 < d0:
        raise ValueError("La date de fin est avant la date de début")
    if (d1 - d0).days + 1 > MAX_DAYS:
        raise ValueError(f"Période trop longue ({MAX_DAYS} jours au maximum)")
    return d0, d1


def is_week(start: date, end: date) -> bool:
    """Vraie semaine du lundi au dimanche."""
    return start.weekday() == 0 and (end - start).days == 6


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
        if is_week(start, end):
            return f"Week of {start:%d/%m/%Y} to {end:%d/%m/%Y}"
        return f"Shopping period: {start:%d/%m/%Y} – {end:%d/%m/%Y}"
    if is_week(start, end):
        return f"Semaine du {start:%d/%m/%Y} au {end:%d/%m/%Y}"
    if start == end:
        return f"Courses du {start:%d/%m/%Y}"
    return f"Courses du {start:%d/%m/%Y} au {end:%d/%m/%Y}"
