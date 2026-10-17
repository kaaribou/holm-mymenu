"""Conservative, source-agnostic recipe text extraction.

Never treat arbitrary page text as ingredients. Low-confidence items stay out of the
structured fields and produce an explicit warning for manual review.
"""
from __future__ import annotations

import re
from pathlib import Path

SPACE = re.compile(r"[ \t\u00a0]+")
QUANTITY = re.compile(r"^(?:[-•*]\s*)?(?:(?:\d+(?:[.,]\d+)?|[¼½¾⅓⅔]|\d+\s*/\s*\d+)\s*(?:à\s*\d+(?:[.,]\d+)?)?\s*)(?:kg|g|mg|ml|cl|dl|l|litres?|cuill[eè]res?|c\.?\s*[àa]\.?\s*(?:soupe|caf[eé])|càs|càc|pinc[eé]es?|tranches?|pi[eè]ces?|sachets?|bo[iî]tes?|bottes?|branches?|gousses?|feuilles?|pots?|verres?|tasses?|poign[eé]es?|unit[eé]s?|oeufs?|œufs?)?\b", re.I)
INGREDIENT_HEADING = re.compile(r"^(?:liste\s+des\s+)?ingr[eé]dients?(?:\s*(?:pour|\(|:).*)?$|^il vous faut\s*:?$|^ce qu.il vous faut\s*:?$|^pour la recette\s*:?$", re.I)
STEP_HEADING = re.compile(r"^(?:pr[eé]paration|instructions?|[eé]tapes?(?:\s+de\s+pr[eé]paration)?|r[eé]alisation|m[eé]thode|mode op[eé]ratoire|d[eé]roul[eé]|comment faire|la recette|en cuisine)(?:\s*[:\-].*)?$", re.I)
OTHER_HEADING = re.compile(r"^(?:astuces?|conseils?|nutrition|valeurs? nutritionnelles?|bon app[eé]tit|mat[eé]riel|ustensiles?|allerg[eè]nes?|infos? pratiques?|conservation|notes?)\b", re.I)
DURATION = re.compile(r"(?:(temps\s+de\s+)?(pr[eé]paration|cuisson|repos|total|dur[eé]e)\s*[:\-]?\s*(\d{1,3})\s*(min(?:utes?)?|h(?:eures?)?)|(?:(\d{1,3})\s*(min(?:utes?)?|h(?:eures?)?)\s*(?:de\s+)?(pr[eé]paration|cuisson)))", re.I)
SERVINGS = re.compile(r"(?:pour\s+|portions?\s*[:\-]?\s*|personnes?\s*[:\-]?\s*)(\d{1,2})\s*(?:personnes?|portions?|parts?)?|\b(\d{1,2})\s*(?:personnes?|portions?|parts?)\b", re.I)
STEP_START = re.compile(r"^(?:(?:[eé]tape\s*)?\d{1,2}[.)\-:]\s+|[-•]\s+)", re.I)
STEP_VERB = re.compile(r"^(?:pr[eé]chauffez?|faites?|faire|coupez?|[eé]pluchez?|lavez?|ajoutez?|m[eé]langez?|versez?|mettez?|mettre|placez?|servez?|d[eé]posez?|enfournez?|laissez?|remuez?|incorporez?|chauffez?|cuisez?|cuire|disposez?|r[eé]servez?|assaisonnez?|d[eé]coupez?|retirez?|[eé]gouttez?|saisissez?|po[eê]lez?|portez?|battez?|fouettez?|rincez?|[eé]mincez?|[eé]talez?|saupoudrez?|mixez?|assemblez?|d[eé]gustez?)\b", re.I)
NOISE = re.compile(r"^(?:www\.|https?://|©|copyright|page\s*\d+|\d+\s*/\s*\d+|quitoque|marmiton|hellofresh|scannez|code qr|d[eé]couvrez nos recettes)", re.I)
SECTION_TITLE = re.compile(r"^(?:pour\s+)?(?:la|le|les)\s+.{2,45}:?$", re.I)


def _lines(text: str) -> list[str]:
    out = []
    for raw in text.replace("\r", "\n").split("\n"):
        line = SPACE.sub(" ", raw).strip(" \t•\u200b")
        if not line or len(line) > 700:
            continue
        if out and line == out[-1]:
            continue
        out.append(line)
    return out


def _is_ingredient(line: str, in_section: bool) -> bool:
    if NOISE.match(line) or DURATION.fullmatch(line) or SERVINGS.fullmatch(line) or re.fullmatch(r"\d{1,3}\s*(?:min(?:utes?)?|h(?:eures?)?)", line, re.I):
        return False
    if re.match(r"^\d{1,2}\s+(?:pr[eé]chauffez|d[eé]gustez|coupez|ajoutez|m[eé]langez|versez|servez|faites|mettez|enfournez|laissez)\b", line, re.I):
        return False
    if STEP_START.match(line) and (len(line) > 65 or STEP_VERB.match(STEP_START.sub("", line))):
        return False
    if STEP_VERB.match(line):
        return False
    if re.match(r"^\d{1,2}\s+(?:l[ea']|les|le\s+riz|la\s+farce)\b", line, re.I):
        return False
    if QUANTITY.match(line) and 3 <= len(line) <= 125:
        return True
    if in_section and re.match(r"^[-•*]\s*\S", line) and 3 <= len(line) <= 110:
        return True
    if in_section and len(line) <= 55 and re.match(r"^(?:sel|poivre|huile|eau|beurre|farine|sucre|ail|persil|thym|basilic|romarin|paprika|cumin|cannelle|vinaigre|moutarde|citron|oignon|[eé]pices|quelques|un peu de|au go[uû]t)\b", line, re.I):
        return True
    return False


def _is_step(line: str, in_section: bool) -> bool:
    if len(line) < 12 or NOISE.match(line) or DURATION.fullmatch(line):
        return False
    if _is_ingredient(line, False):
        return False
    if re.match(r"^\d{1,2}\s+", line) and STEP_VERB.match(re.sub(r"^\d{1,2}\s+", "", line)) and len(line) >= 24:
        return True
    if STEP_VERB.match(STEP_START.sub("", line)) and len(line) >= 22:
        return True
    if in_section and len(line) >= 65 and ("." in line or ";" in line):
        return True
    if STEP_START.match(line) and len(line) >= 65:
        return True
    return False


def _duration_info(text: str) -> tuple[int | None, int | None]:
    prep = cook = None
    for match in DURATION.finditer(text):
        if match.group(2):
            kind, value, unit = match.group(2), match.group(3), match.group(4)
        else:
            kind, value, unit = match.group(7), match.group(5), match.group(6)
        if not value:
            continue
        minutes = int(value) * (60 if unit.lower().startswith("h") else 1)
        if minutes > 720:
            continue
        if kind.lower().startswith("pr"):
            prep = minutes
        elif kind.lower().startswith("cui"):
            cook = minutes
    return prep, cook


def parse_recipe_text(text: str, filename: str = "") -> dict:
    lines = _lines(text)
    if not lines:
        raise ValueError("Aucun texte reconnu dans le document")
    # The original filename is the most predictable title across publishers.
    title = Path(filename).stem.replace("_", " ").strip() if filename else ""
    if not title:
        title = next((line for line in lines[:15] if 8 <= len(line) <= 110 and not NOISE.match(line) and not INGREDIENT_HEADING.match(line) and not STEP_HEADING.match(line) and not DURATION.fullmatch(line)), "Recette importée")
    servings_match = SERVINGS.search(text)
    servings = int(next((g for g in servings_match.groups() if g), "4")) if servings_match else 4
    servings = max(1, min(30, servings))
    prep, cook = _duration_info(text)
    ingredients: list[str] = []
    steps: list[str] = []
    section = ""
    unclassified: list[str] = []
    for i, line in enumerate(lines):
        if INGREDIENT_HEADING.match(line):
            section = "ingredients"
            continue
        if STEP_HEADING.match(line):
            section = "steps"
            continue
        if OTHER_HEADING.match(line):
            section = ""
            continue
        if NOISE.match(line) or DURATION.fullmatch(line) or SERVINGS.fullmatch(line):
            continue
        if line == title or (filename and line == Path(filename).stem):
            continue
        # Avoid mistaking a recipe's numbered subheadings for ingredient amounts.
        if re.match(r"^\d{1,2}\s+(?:L['’]|Le\s|La\s|Les\s)", line, re.I):
            if section == "ingredients":
                section = "steps"
            continue
        if _is_step(line, section == "steps"):
            cleaned = re.sub(r"^\d{1,2}\s+(?=[A-ZÀ-Ö])", "", STEP_START.sub("", line)).strip()
            if cleaned not in steps:
                steps.append(cleaned)
            if section == "ingredients":
                section = "steps"
            continue
        if _is_ingredient(line, section == "ingredients"):
            if line not in ingredients:
                ingredients.append(re.sub(r"^[-•*]\s*", "", line))
            continue
        if section == "steps" and steps and not SECTION_TITLE.match(line):
            # Reconstituer les paragraphes coupés par l'extraction PDF,
            # même lorsque la ligne de continuation est courte.
            if len(line) >= 12 and not QUANTITY.match(line):
                steps[-1] += " " + line
                continue
        if section == "ingredients" and ingredients and len(line) <= 80:
            # Nom d'ingrédient sur la ligne suivante (colonnes / retour à la ligne).
            previous = ingredients[-1]
            if (QUANTITY.match(previous) and len(previous.split()) <= 3
                    and not STEP_VERB.match(line) and not STEP_START.match(line)
                    and not OTHER_HEADING.match(line)):
                ingredients[-1] += " " + line
                continue
        if (len(line) >= 4 and not INGREDIENT_HEADING.match(line)
                and not STEP_HEADING.match(line) and not SECTION_TITLE.match(line)
                and not re.fullmatch(r"\d+", line)):
            unclassified.append(line)
    warnings = []
    if not ingredients:
        warnings.append("Ingrédients non identifiés avec certitude : renseignez-les manuellement.")
    if not steps:
        warnings.append("Étapes non identifiées avec certitude : renseignez-les manuellement.")
    if not servings_match:
        warnings.append("Nombre de personnes non identifié : valeur par défaut 4.")
    if unclassified:
        warnings.append(f"{len(unclassified)} ligne(s) non classée(s) : consultez-les dans l'éditeur.")
    return {"name": title[:180], "servings": servings, "prep": prep, "cook": cook,
            "lines": ingredients[:90], "steps": steps[:60], "unclassified": unclassified[:150],
            "source": "document", "warnings": warnings}
