"""Presentation-only shopping grouping. Original entries and checkboxes are preserved."""
from __future__ import annotations
import re
import unicodedata
from .parser import to_base, pretty_qty


# DOUBLONS : équivalences explicites uniquement (œufs, lardons, beurre doux, etc.).
# Ne pas fusionner les variantes culinaires non interchangeables (ex. beurre demi-sel).
def normalized_name(name: str) -> tuple[str, str]:
    raw = re.sub(r"\s+", " ", str(name or "").strip())
    key = "".join(c for c in unicodedata.normalize("NFD", raw.casefold()) if unicodedata.category(c) != "Mn")
    key = key.replace("œ", "oe").replace("’", "'")
    key = re.sub(r"[^a-z0-9 ]+", " ", key).strip()
    key = re.sub(r"\s+", " ", key)
    # HOLM : variantes explicitement équivalentes, sans fusion approximative.
    # Les ingrédients d'origine et leurs IDs restent intacts (édition/suppression/Telegram).
    if key in ("lardon", "lardons", "lardon nature ou fume", "lardons nature ou fumes",
               "lardon fume", "lardons fumes", "lardon nature", "lardons nature"):
        return "Lardons", "lardons"
    # « beurre demi-sel », « beurre salé » et les beurres aromatisés restent distincts.
    if key in ("beurre", "beurre doux"):
        return "Beurre", "beurre"
    if key in ("sel", "sels"): return "Sel", "sel"
    if key in ("poivre", "poivres"): return "Poivre", "poivre"
    if key in ("sucre", "sucres"): return "Sucre", "sucre"
    if key in ("persil",): return "Persil", "persil"
    if key in ("oeuf", "oeufs", "oeuf par personne", "oeufs par personne"):
        return "Œufs", "oeufs"
    if key in ("pomme de terre", "pommes de terre", "pomme de terre moyennes", "pommes de terre moyennes", "pomme de terre chair ferme"):
        return "Pommes de terre", "pommes de terre"
    return raw, key


# AFFICHAGE : regrouper sans modifier les IDs, indispensables aux actions HOLM/Telegram.
def shopping_groups(items: list[dict]) -> list[dict]:
    """Fusionne les doublons *pour l'affichage* (HOLM, mail, Telegram).

    Les unités incompatibles restent séparées dans ``display`` ; ``ids`` et
    ``items`` conservent les entrées originales pour les actions groupées.
    """
    groups = []
    lookup = {}
    for item in items:
        name, key = normalized_name(item.get("name", ""))
        aisle = item.get("aisle") or "autre"
        group_key = (aisle, key)
        if group_key not in lookup:
            group = {"name": name, "aisle": aisle, "items": [], "ids": [], "checked": True,
                     "parts": {}, "unknown": False, "opaque": []}
            groups.append(group)
            lookup[group_key] = group
        group = lookup[group_key]
        group["items"].append(item)
        group["ids"].append(item["id"])
        group["checked"] = group["checked"] and bool(item.get("checked"))
        qty, unit = item.get("qty"), item.get("unit") or ""
        if isinstance(qty, (int, float)) and not isinstance(qty, bool):
            base, unit = to_base(float(qty), unit)
            group["parts"][unit] = group["parts"].get(unit, 0) + base
        else:
            display = str(item.get("display") or "").strip()
            m = re.fullmatch(r"(\d+(?:[.,]\d+)?)\s*(.*)", display)
            if m:
                q, u = to_base(float(m.group(1).replace(",", ".")), m.group(2).strip())
                group["parts"][u] = group["parts"].get(u, 0) + q
            elif display and display != "quantité non précisée":
                if display not in group["opaque"]:
                    group["opaque"].append(display)
            else:
                group["unknown"] = True
    for group in groups:
        parts = [pretty_qty(q, u) for u, q in group["parts"].items()]
        parts.extend(group["opaque"])
        if group["unknown"]:
            parts.append("quantité non précisée")
        group["display"] = " + ".join(parts)
        del group["parts"], group["unknown"], group["opaque"]
    return groups
