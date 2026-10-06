"""Sources externes : Open Food Facts, Marmiton (et tout site schema.org Recipe), Mealie."""
from __future__ import annotations

import html
import json
import logging
import re
from urllib.parse import quote_plus, urljoin

import aiohttp

from .const import USER_AGENT
from .parser import parse_duration, parse_yield

_LOGGER = logging.getLogger(__name__)
_TIMEOUT = aiohttp.ClientTimeout(total=20)
_BROWSER_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 HOLM-MyMenu/1.0"


class SourceError(Exception):
    """Erreur lisible renvoyée à la carte."""


# ---------------- Open Food Facts ----------------
_OFF_FIELDS = ("code,product_name_fr,product_name,generic_name_fr,brands,quantity,image_front_url,image_front_small_url,image_small_url,"
               "nutriscore_grade,nova_group,ecoscore_grade,categories_tags,nutriments,ingredients_text_fr,ingredients_text,allergens_tags,labels_tags,stores")
_NUTRI = (("energy_kcal", "energy-kcal_100g"), ("fat", "fat_100g"), ("saturated_fat", "saturated-fat_100g"), ("carbohydrates", "carbohydrates_100g"),
          ("sugars", "sugars_100g"), ("fiber", "fiber_100g"), ("proteins", "proteins_100g"), ("salt", "salt_100g"))


def _tags(lst) -> list[str]:
    return [t.split(":", 1)[-1].replace("-", " ") for t in (lst or []) if isinstance(t, str)]


_ALLERGENS_FR = {"milk": "lait", "nuts": "fruits à coque", "gluten": "gluten", "eggs": "œufs", "soybeans": "soja", "peanuts": "arachides",
                 "fish": "poisson", "crustaceans": "crustacés", "celery": "céleri", "mustard": "moutarde", "sesame seeds": "sésame",
                 "sulphur dioxide and sulphites": "sulfites", "lupin": "lupin", "molluscs": "mollusques"}


def _grade(g) -> str:
    g = str(g or "").lower()
    return g if g in ("a", "b", "c", "d", "e") else ""


def off_normalize(p: dict) -> dict | None:
    """Produit Open Food Facts → fiche ingrédient (tous les champs utiles)."""
    name = (p.get("product_name_fr") or p.get("product_name") or p.get("generic_name_fr") or "").strip()
    if not name:
        return None
    brands = p.get("brands") or ""
    if isinstance(brands, list):
        brand = str(brands[0]) if brands else ""
    else:
        brand = str(brands).split(",")[0]
    n = p.get("nutriments") or {}
    nutrition = {k: n.get(src) for k, src in _NUTRI if isinstance(n.get(src), (int, float))}
    nova = p.get("nova_group")
    return {
        "code": str(p.get("code") or ""),
        "name": html.unescape(name),
        "brand": brand.strip(),
        "quantity": p.get("quantity") or "",
        "image": p.get("image_front_small_url") or p.get("image_small_url") or "",
        "image_full": p.get("image_front_url") or p.get("image_front_small_url") or "",
        "nutriscore": _grade(p.get("nutriscore_grade")),
        "ecoscore": _grade(p.get("ecoscore_grade")),
        "nova": int(nova) if isinstance(nova, (int, float)) or (isinstance(nova, str) and nova.isdigit()) else None,
        "kcal100": nutrition.get("energy_kcal"),
        "nutrition": nutrition,
        "ingredients_text": str(p.get("ingredients_text_fr") or p.get("ingredients_text") or "").strip(),
        "allergens": [_ALLERGENS_FR.get(a, a) for a in _tags(p.get("allergens_tags"))],
        "labels": _tags(p.get("labels_tags"))[:8],
        "stores": p.get("stores") if isinstance(p.get("stores"), str) else "",
        "categories": p.get("categories_tags") or [],
    }


async def _off_json(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"}, timeout=_TIMEOUT) as r:
        if r.status != 200:
            raise SourceError(f"HTTP {r.status}")
        return await r.json(content_type=None)


async def off_search(session: aiohttp.ClientSession, query: str, limit: int = 12) -> list[dict]:
    """Recherche Open Food Facts : moteur search.openfoodfacts.org, repli sur l'ancienne API."""
    errors = []
    attempts = (
        ("hits", f"https://search.openfoodfacts.org/search?q={quote_plus(query)}&langs=fr&page_size={limit}&fields={_OFF_FIELDS}"),
        ("products", "https://fr.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1"
                     f"&search_terms={quote_plus(query)}&page_size={limit}&fields={_OFF_FIELDS}"),
    )
    for key, url in attempts:
        try:
            data = await _off_json(session, url)
        except (aiohttp.ClientError, TimeoutError, SourceError, ValueError) as e:
            errors.append(str(e) or e.__class__.__name__)
            continue
        return [x for x in (off_normalize(p) for p in data.get(key) or [] if isinstance(p, dict)) if x]
    raise SourceError("Open Food Facts indisponible (" + " / ".join(errors) + ")")


async def off_product(session: aiohttp.ClientSession, code: str) -> dict | None:
    """Fiche complète d'un produit (API v2)."""
    if not code:
        return None
    try:
        data = await _off_json(session, f"https://world.openfoodfacts.org/api/v2/product/{quote_plus(code)}.json?fields={_OFF_FIELDS}")
    except (aiohttp.ClientError, TimeoutError, SourceError, ValueError):
        return None
    p = data.get("product")
    return off_normalize({**p, "code": code}) if isinstance(p, dict) else None


# ---------------- Marmiton : recherche ----------------
async def _get_text(session: aiohttp.ClientSession, url: str) -> str:
    try:
        async with session.get(url, headers={"User-Agent": _BROWSER_UA, "Accept-Language": "fr-FR,fr;q=0.9"}, timeout=_TIMEOUT) as r:
            if r.status != 200:
                raise SourceError(f"Page inaccessible ({r.status})")
            return await r.text()
    except (aiohttp.ClientError, TimeoutError) as e:
        raise SourceError("Le site ne répond pas") from e


async def marmiton_search(session: aiohttp.ClientSession, query: str, limit: int = 18) -> list[dict]:
    page = await _get_text(session, f"https://www.marmiton.org/recettes/recherche.aspx?aqt={quote_plus(query)}")
    out, seen = [], set()
    # chaque carte de résultat : image + lien vers /recettes/recette_xxx.aspx
    for block in re.split(r'<div class="card-vertical-detailed', page)[1:]:
        m = re.search(r'href="(/recettes/recette_[^"]+\.aspx)"[^>]*>\s*([^<]+?)\s*</a>', block)
        if not m:
            continue
        href = urljoin("https://www.marmiton.org", m.group(1))
        if href in seen:
            continue
        seen.add(href)
        img = re.search(r'<img[^>]+src="(https://[^"]+)"', block)
        rating = re.search(r'(\d[.,]\d)\s*<span[^>]*>\s*/\s*5', block) or re.search(r'"ratingValue"\s*:\s*"?(\d[.,]?\d?)', block)
        reviews = re.search(r'\((\d[\d\s]*)\s*avis\)', block)
        out.append({
            "url": href,
            "name": html.unescape(m.group(2)).strip(),
            "image": img.group(1) if img else "",
            "rating": float(rating.group(1).replace(",", ".")) if rating else None,
            "reviews": int(reviews.group(1).replace(" ", "")) if reviews else None,
            "source": "marmiton",
        })
        if len(out) >= limit:
            break
    if not out:  # mise en page différente : repli sur les liens seuls
        for m in re.finditer(r'href="(/recettes/recette_[^"]+\.aspx)"[^>]*>\s*([^<]{3,120}?)\s*</a>', page):
            href = urljoin("https://www.marmiton.org", m.group(1))
            if href not in seen:
                seen.add(href)
                out.append({"url": href, "name": html.unescape(m.group(2)).strip(), "image": "", "rating": None, "reviews": None, "source": "marmiton"})
            if len(out) >= limit:
                break
    return out


# ---------------- import d'une recette (schema.org Recipe) ----------------
def _find_recipe(node):
    if isinstance(node, list):
        for n in node:
            r = _find_recipe(n)
            if r:
                return r
    elif isinstance(node, dict):
        t = node.get("@type")
        if t == "Recipe" or (isinstance(t, list) and "Recipe" in t):
            return node
        for k in ("@graph", "mainEntity", "itemListElement"):
            if k in node:
                r = _find_recipe(node[k])
                if r:
                    return r
    return None


def _steps(instr) -> list[str]:
    out: list[str] = []
    if isinstance(instr, str):
        return [s.strip() for s in re.split(r"\n+|(?<=\.)\s{2,}", html.unescape(re.sub(r"<[^>]+>", "\n", instr))) if s.strip()]
    for s in instr or []:
        if isinstance(s, str):
            out.append(s.strip())
        elif isinstance(s, dict):
            if s.get("@type") == "HowToSection":
                out.extend(_steps(s.get("itemListElement")))
            elif s.get("text"):
                out.append(html.unescape(re.sub(r"<[^>]+>", "", str(s["text"]))).strip())
    return [s for s in out if s]


def _image(img) -> str:
    if isinstance(img, list):
        jpg = [i for i in img if isinstance(i, str) and i.lower().split("?")[0].endswith((".jpg", ".jpeg", ".png"))]
        img = (jpg or img or [""])[0]
    if isinstance(img, dict):
        img = img.get("url") or ""
    return img if isinstance(img, str) else ""


async def import_recipe_url(session: aiohttp.ClientSession, url: str) -> dict:
    page = await _get_text(session, url)
    recipe = None
    for m in re.finditer(r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', page, re.S | re.I):
        try:
            recipe = _find_recipe(json.loads(m.group(1).strip()))
        except ValueError:
            continue
        if recipe:
            break
    if not recipe:
        raise SourceError("Aucune recette lisible sur cette page")
    name = html.unescape(str(recipe.get("name") or "Recette")).strip()
    name = re.sub(r"\s*:\s*la (meilleure )?recette.*$", "", name, flags=re.I)
    rating = recipe.get("aggregateRating") or {}
    cat = recipe.get("recipeCategory")
    return {
        "name": name,
        "image": _image(recipe.get("image")),
        "source_url": url,
        "source": "marmiton" if "marmiton.org" in url else "web",
        "servings": parse_yield(recipe.get("recipeYield")) or 4,
        "prep": parse_duration(recipe.get("prepTime")),
        "cook": parse_duration(recipe.get("cookTime")),
        "total": parse_duration(recipe.get("totalTime")),
        "category": (cat[0] if isinstance(cat, list) and cat else cat) or "",
        "rating": float(rating.get("ratingValue")) if rating.get("ratingValue") else None,
        "lines": [html.unescape(str(x)).strip() for x in recipe.get("recipeIngredient") or recipe.get("ingredients") or [] if str(x).strip()],
        "steps": _steps(recipe.get("recipeInstructions")),
    }


# ---------------- Mealie ----------------
async def mealie_recipes(session: aiohttp.ClientSession, base: str, token: str) -> list[dict]:
    base = base.rstrip("/")
    head = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    out, page = [], 1
    try:
        while page < 50:
            async with session.get(f"{base}/api/recipes?page={page}&perPage=100", headers=head, timeout=_TIMEOUT) as r:
                if r.status in (401, 403):
                    raise SourceError("Jeton Mealie refusé")
                if r.status != 200:
                    raise SourceError(f"Mealie indisponible ({r.status})")
                data = await r.json()
            items = data.get("items") or []
            out.extend(items)
            if page >= (data.get("total_pages") or data.get("totalPages") or 1) or not items:
                break
            page += 1
    except (aiohttp.ClientError, TimeoutError) as e:
        raise SourceError("Mealie ne répond pas") from e
    return out


async def mealie_recipe(session: aiohttp.ClientSession, base: str, token: str, slug: str) -> dict:
    base = base.rstrip("/")
    head = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    async with session.get(f"{base}/api/recipes/{slug}", headers=head, timeout=_TIMEOUT) as r:
        if r.status != 200:
            raise SourceError(f"Recette Mealie {slug} illisible ({r.status})")
        d = await r.json()
    lines = []
    for i in d.get("recipeIngredient") or []:
        if isinstance(i, str):
            lines.append(i)
            continue
        disp = i.get("display") or i.get("originalText") or ""
        if not disp:
            q = i.get("quantity")
            u = (i.get("unit") or {}).get("name", "") if isinstance(i.get("unit"), dict) else ""
            f = (i.get("food") or {}).get("name", "") if isinstance(i.get("food"), dict) else ""
            disp = " ".join(str(x) for x in (q if q else "", u, f, i.get("note") or "") if x)
        if disp.strip():
            lines.append(disp.strip())
    steps = [s.get("text", "").strip() for s in d.get("recipeInstructions") or [] if isinstance(s, dict) and s.get("text")]
    rid = d.get("id")
    return {
        "name": d.get("name") or slug,
        "image": f"{base}/api/media/recipes/{rid}/images/original.webp" if rid and d.get("image") else "",
        "source_url": d.get("orgURL") or "",
        "source": "mealie",
        "servings": parse_yield(d.get("recipeYield")) or parse_yield(d.get("recipeServings")) or 4,
        "prep": parse_duration(d.get("prepTime")) if str(d.get("prepTime") or "").startswith("P") else None,
        "cook": parse_duration(d.get("performTime")) if str(d.get("performTime") or "").startswith("P") else None,
        "total": parse_duration(d.get("totalTime")) if str(d.get("totalTime") or "").startswith("P") else None,
        "category": ((d.get("recipeCategory") or [{}])[0] or {}).get("name", "") if d.get("recipeCategory") else "",
        "rating": d.get("rating"),
        "lines": lines,
        "steps": steps,
        "mealie_slug": slug,
    }
