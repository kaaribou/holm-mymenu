"""Analyse des lignes d'ingrédients (français), normalisation et rayons."""
from __future__ import annotations

import re
import unicodedata

_FRACTIONS = {"½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3}

# unité canonique -> variantes (singulier / pluriel / abréviations)
_UNITS: dict[str, tuple[str, ...]] = {
    "kg": ("kg", "kilo", "kilos", "kilogramme", "kilogrammes", "kilogram", "kilograms"),
    "g": ("g", "gr", "grs", "gramme", "grammes", "gram", "grams"),
    "mg": ("mg",),
    "fl oz": ("fluid ounce", "fluid ounces", "fl oz", "fl. oz"),
    "l": ("l", "litre", "litres", "liter", "liters", "litre(s)"),
    "dl": ("dl",),
    "cl": ("cl", "centilitre", "centilitres"),
    "ml": ("ml", "millilitre", "millilitres", "milliliter", "milliliters"),
    "c. à soupe": ("cuillère à soupe", "cuillères à soupe", "cuillere a soupe", "cuilleres a soupe", "c. à soupe", "c.à soupe",
                   "c à soupe", "c. a soupe", "cas", "càs", "c.s.", "cs", "cuil. à soupe", "cuillerée à soupe", "cuillerées à soupe", "tablespoon", "tablespoons", "tbsp"),
    "c. à café": ("cuillère à café", "cuillères à café", "cuillere a cafe", "cuilleres a cafe", "c. à café", "c.à café", "c à café",
                  "c. a cafe", "cac", "càc", "c.c.", "cc", "cuil. à café", "cuillerée à café", "cuillerées à café", "teaspoon", "teaspoons", "tsp"),
    "pincée": ("pincée", "pincées", "pincee", "pincees", "pinch"),
    "gousse": ("gousse", "gousses"),
    "tranche": ("tranche", "tranches"),
    "paquet": ("paquet", "paquets"),
    "sachet": ("sachet", "sachets"),
    "boîte": ("boîte", "boîtes", "boite", "boites"),
    "pot": ("pot", "pots"),
    "feuille": ("feuille", "feuilles"),
    "branche": ("branche", "branches"),
    "brin": ("brin", "brins"),
    "botte": ("botte", "bottes"),
    "bouquet": ("bouquet", "bouquets"),
    "verre": ("verre", "verres"),
    "tasse": ("tasse", "tasses"),
    "bol": ("bol", "bols"),
    "morceau": ("morceau", "morceaux"),
    "filet": ("filet", "filets"),
    "poignée": ("poignée", "poignées", "poignee", "poignees"),
    "brique": ("brique", "briques"),
    "bouteille": ("bouteille", "bouteilles"),
    "rouleau": ("rouleau", "rouleaux"),
    "noix": ("noix",),
    "noisette": ("noisette",),
    "zeste": ("zeste", "zestes"),
    "bocal": ("bocal", "bocaux"),
    "barquette": ("barquette", "barquettes"),
    "tablette": ("tablette", "tablettes"),
    "cube": ("cube", "cubes"),
    "dose": ("dose", "doses"),
    "louche": ("louche", "louches"),
    "trait": ("trait", "traits"),
    "goutte": ("goutte", "gouttes"),
}
_UNIT_LOOKUP = sorted(((v, k) for k, vs in _UNITS.items() for v in vs), key=lambda x: -len(x[0]))

# conversions vers une unité de base pour additionner
BASE = {"kg": ("g", 1000), "g": ("g", 1), "mg": ("g", 0.001), "l": ("ml", 1000), "dl": ("ml", 100), "cl": ("ml", 10), "ml": ("ml", 1)}

_NUM = r"(?:\d+(?:[.,]\d+)?(?:\s*/\s*\d+)?|[½¼¾⅓⅔]|\d+\s*[½¼¾⅓⅔])"
_LEAD = re.compile(rf"^\s*(?P<q>{_NUM})(?:\s*(?:à|-|ou)\s*(?P<q2>{_NUM}))?\s*", re.I)
_WORD_NUM = {"un": 1, "une": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5, "six": 6, "dix": 10, "demi": 0.5, "une demi": 0.5, "un demi": 0.5}


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def _num(s: str) -> float | None:
    s = s.strip().replace(",", ".")
    try:
        if s in _FRACTIONS:
            return _FRACTIONS[s]
        m = re.match(r"^(\d+)\s*([½¼¾⅓⅔])$", s)
        if m:
            return int(m.group(1)) + _FRACTIONS[m.group(2)]
        if "/" in s:
            a, b = s.split("/", 1)
            return float(a) / float(b)
        return float(s)
    except (ValueError, ZeroDivisionError):
        return None


def _singular(word: str) -> str:
    w = word
    if len(w) > 3 and w.endswith("aux") and not w.endswith("eaux"):
        return w[:-3] + "al"
    if len(w) > 3 and (w.endswith("eaux") or w.endswith("eux") or w.endswith("oux")):
        return w[:-1]
    if len(w) > 3 and w.endswith("s") and not w.endswith(("ss", "us", "is", "as")):
        return w[:-1]
    if len(w) > 3 and w.endswith("x") and not w.endswith("ix"):
        return w[:-1]
    return w


def ingredient_key(name: str) -> str:
    """Clé de rapprochement : minuscules, sans accents, au singulier, sans articles."""
    s = strip_accents(name.lower())
    s = re.sub(r"\(.*?\)", " ", s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    words = [w for w in s.split() if w not in ("de", "d", "du", "des", "la", "le", "les", "l", "un", "une", "a", "au", "aux", "en", "et")]
    return " ".join(_singular(w) for w in words).strip()


def clean_name(name: str) -> str:
    n = re.sub(r"\s+", " ", name).strip(" ,.;:-")
    return n[:1].upper() + n[1:] if n else n


def parse_line(line: str) -> dict:
    """« 600 g de boeuf haché » -> {qty: 600, unit: 'g', name: 'Boeuf haché', note: ''}."""
    raw = re.sub(r"\s+", " ", str(line or "")).strip()
    s = raw
    qty = None
    m = _LEAD.match(s)
    if m:
        qty = _num(m.group("q"))
        if m.group("q2"):
            q2 = _num(m.group("q2"))
            if q2 is not None and qty is not None:
                qty = max(qty, q2)
        s = s[m.end():]
    else:
        low = s.lower()
        for w, v in sorted(_WORD_NUM.items(), key=lambda x: -len(x[0])):
            if low.startswith(w + " "):
                qty = v
                s = s[len(w) + 1:]
                break
    unit = ""
    low = s.lower()
    for variant, canon in _UNIT_LOOKUP:
        if low.startswith(variant) and (len(low) == len(variant) or not low[len(variant)].isalpha()):
            unit = canon
            s = s[len(variant):]
            break
    s = re.sub(r"^\s*(?:de |d'|d’|des |du )", "", s, flags=re.I)
    note = ""
    nm = re.match(r"^(.*?)(?:\s*[,(]\s*(.*?)\)?\s*)$", s)
    if nm and nm.group(2):
        s, note = nm.group(1), nm.group(2)
    name = clean_name(s)
    if not name:
        name, qty, unit = clean_name(raw), None, ""
    return {"qty": qty, "unit": unit, "name": name, "note": note.strip(), "raw": raw}


def to_base(qty: float | None, unit: str) -> tuple[float | None, str]:
    if qty is None:
        return None, unit
    if unit in BASE:
        b, f = BASE[unit]
        return qty * f, b
    return qty, unit


def pretty_qty(qty: float | None, unit: str) -> str:
    if qty is None:
        return unit or ""
    if unit == "g" and qty >= 1000:
        qty, unit = qty / 1000, "kg"
    elif unit == "ml" and qty >= 1000:
        qty, unit = qty / 1000, "l"
    elif unit == "ml" and qty >= 100 and qty % 10 == 0:
        qty, unit = qty / 10, "cl"
    q = round(qty, 2)
    qs = str(int(q)) if q == int(q) else str(q).replace(".", ",")
    if q >= 2 and unit and " " not in unit and "." not in unit and len(unit) > 2 and not unit.endswith(("s", "x")):
        unit += "s"  # 6 tranches, 2 pots, 3 gousses
    return f"{qs} {unit}".strip()


# ---------- rayons ----------
_AISLE_WORDS = {
    "fruits_legumes": "pomme poire banane orange citron fraise framboise abricot peche raisin melon pasteque ananas mangue kiwi cerise prune "
                      "tomate carotte oignon echalote ail poireau courgette aubergine poivron concombre salade laitue epinard chou brocoli "
                      "chou fleur haricot vert petit pois champignon pomme terre patate celeri radis betterave navet potiron courge potimarron "
                      "avocat fenouil artichaut asperge endive mache roquette gingembre citron vert pamplemousse figue",
    "boucherie": "boeuf veau porc agneau poulet dinde canard lapin jambon lardon saucisse steak hache viande escalope filet mignon "
                 "roti cote bavette merguez chipolata chorizo bacon saumon thon cabillaud colin crevette moule poisson truite sardine "
                 "maquereau dorade bar lieu calamar seiche noix saint jacques gambas",
    "cremerie": "lait beurre creme oeuf yaourt yogourt fromage blanc petit suisse mascarpone ricotta creme fraiche margarine",
    "fromage": "fromage emmental gruyere comte parmesan mozzarella cheddar chevre feta roquefort camembert brie raclette reblochon "
               "tomme mimolette cantal munster bleu",
    "boulangerie": "pain baguette brioche pain mie croissant tortilla wrap pita burger bun",
    "epicerie": "pate riz semoule couscous quinoa lentille pois chiche haricot rouge farine maizena fecule levure chapelure "
                "lasagne spaghetti tagliatelle penne coquillette macaroni nouille vermicelle bouillon conserve sauce tomate "
                "puree tomate concentre coulis huile vinaigre moutarde mayonnaise ketchup olive cornichon thon boite mais flocon avoine",
    "epicerie_sucree": "sucre cassonade miel confiture chocolat nutella pate tartiner cacao vanille cereale biscuit gateau compote "
                       "sirop caramel amande noisette noix pistache raisin sec pruneau levure chimique sucre glace",
    "condiments": "sel poivre thym laurier basilic persil ciboulette coriandre menthe romarin origan estragon aneth sauge cumin curry "
                  "paprika curcuma muscade cannelle piment herbe provence clou girofle gingembre moulu safran ras hanout epice",
    "surgeles": "surgele glace sorbet frite poelee",
    "boissons": "eau jus vin biere cidre soda limonade cafe the tisane champagne rhum porto cognac",
    "maison": "papier essuie tout sopalin film aluminium sac poubelle lessive liquide vaisselle eponge savon dentifrice shampoing",
}
_AISLE_INDEX = [(k, set(v.split())) for k, v in _AISLE_WORDS.items()]
_PHRASES = [("fromage blanc", "cremerie"), ("creme fraiche", "cremerie"), ("pomme de terre", "fruits_legumes"), ("pomme terre", "fruits_legumes"),
            ("puree tomate", "epicerie"), ("sauce tomate", "epicerie"), ("pate feuilletee", "cremerie"), ("pate brisee", "cremerie"),
            ("pate sablee", "cremerie"), ("pate pizza", "cremerie"), ("herbe provence", "condiments"), ("noix muscade", "condiments"),
            ("lait coco", "epicerie"), ("pate tartiner", "epicerie_sucree"), ("chocolat noir", "epicerie_sucree"), ("pain mie", "boulangerie")]
_OFF_CATS = [("en:frozen-foods", "surgeles"), ("en:beverages", "boissons"), ("en:cheeses", "fromage"), ("en:dairies", "cremerie"),
             ("en:eggs", "cremerie"), ("en:meats", "boucherie"), ("en:seafood", "boucherie"), ("en:fishes", "boucherie"),
             ("en:breads", "boulangerie"), ("en:fruits", "fruits_legumes"), ("en:vegetables", "fruits_legumes"),
             ("en:sweet-spreads", "epicerie_sucree"), ("en:chocolates", "epicerie_sucree"), ("en:sugary-snacks", "epicerie_sucree"),
             ("en:breakfasts", "epicerie_sucree"), ("en:condiments", "condiments"), ("en:spices", "condiments"), ("en:sauces", "epicerie"),
             ("en:cereals-and-potatoes", "epicerie"), ("en:pastas", "epicerie"), ("en:canned-foods", "epicerie")]


def guess_aisle(name: str, off_categories: list[str] | None = None) -> str:
    for tag, aisle in _OFF_CATS:
        if off_categories and tag in off_categories:
            return aisle
    key = ingredient_key(name)
    for phrase, aisle in _PHRASES:
        if phrase in key:
            return aisle
    words = key.split()
    best, score = "autre", 0
    for aisle, vocab in _AISLE_INDEX:
        s = sum(2 if i == 0 else 1 for i, w in enumerate(words) if w in vocab)
        if s > score:
            best, score = aisle, s
    return best


def parse_duration(v) -> int | None:
    """ISO 8601 (PT1H35M) -> minutes."""
    if not v or not isinstance(v, str):
        return None
    m = re.match(r"^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?", v.strip())
    if not m:
        return None
    d, h, mi = (int(x) if x else 0 for x in m.groups())
    total = d * 1440 + h * 60 + mi
    return total or None


def parse_yield(v) -> int | None:
    if isinstance(v, list):
        v = v[0] if v else None
    if isinstance(v, (int, float)):
        return int(v)
    if isinstance(v, str):
        m = re.search(r"\d+", v)
        return int(m.group()) if m else None
    return None


def singular_name(name: str) -> str:
    """« Oignons jaunes » -> « Oignon jaune » (affichage), en gardant les accents."""
    keep = {"de", "d", "du", "des", "la", "le", "les", "à", "au", "aux", "en", "et", "l"}
    out = []
    for w in name.split():
        lw = w.lower()
        if lw in keep or "'" in w or "’" in w:
            out.append(w)
            continue
        out.append(_singular(w) if lw not in ("noix", "pois", "radis", "anis", "riz", "jus", "cassis", "maïs", "mais", "frais", "gras") else w)
    return clean_name(" ".join(out))
