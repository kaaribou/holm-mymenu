"""Base de données HOLM My Menu : ingrédients, recettes, planning, liste de courses."""
from __future__ import annotations

import asyncio
import logging
import os
import re
import time
import uuid
from datetime import date, timedelta

import aiohttp

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store

from .const import AISLES, MEDIA_PATH, SIGNAL_UPDATED, SLOTS, STORAGE_KEY, STORAGE_VERSION
from .parser import guess_aisle, ingredient_key, parse_line, pretty_qty, singular_name, to_base

_LOGGER = logging.getLogger(__name__)
_AISLE_IDS = [a for a, _ in AISLES]


def _id() -> str:
    return uuid.uuid4().hex[:12]


class MenuStore:
    def __init__(self, hass: HomeAssistant, servings: int = 4) -> None:
        self.hass = hass
        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.servings = servings
        self.data: dict = {"ingredients": {}, "recipes": {}, "plan": {}, "shopping": {"items": [], "range": None},
                           "contacts": [], "history": {}}
        self._img_dir = hass.config.path("www", "holm_mymenu")

    async def async_load(self) -> None:
        d = await self._store.async_load()
        if isinstance(d, dict):
            for k in self.data:
                if k in d:
                    self.data[k] = d[k]
        dirty = self._migrate_media()
        if not self.data["history"] and self.data["plan"]:
            self._history_from_plan()
            dirty = True
        self._clean_plan()
        if self._repair_units() or dirty:
            self.changed("all")

    def _migrate_media(self) -> bool:
        """Anciennes adresses /local/holm_mymenu/… → /holm_mymenu_media/… (indépendant de /local)."""
        changed = False
        for coll in ("recipes", "ingredients"):
            for o in self.data[coll].values():
                img = o.get("image") or ""
                if img.startswith("/local/holm_mymenu/"):
                    o["image"] = MEDIA_PATH + img[len("/local/holm_mymenu"):]
                    changed = True
        for it in self.data["shopping"].get("items", []):
            img = it.get("image") or ""
            if img.startswith("/local/holm_mymenu/"):
                it["image"] = MEDIA_PATH + img[len("/local/holm_mymenu"):]
                changed = True
        return changed

    # ---------------- historique (recettes les plus planifiées) ----------------
    def _history_from_plan(self) -> None:
        for day in sorted(self.data["plan"]):
            for entries in self.data["plan"][day].values():
                for e in entries:
                    if e.get("type") == "recipe":
                        self._count(e["recipe_id"], day)

    def _count(self, rid: str, day: str, n: int = 1) -> None:
        h = self.data["history"].setdefault(rid, {"count": 0, "first": day, "last": day})
        h["count"] = max(0, h["count"] + n)
        if day > h.get("last", ""):
            h["last"] = day
        if day < h.get("first", day):
            h["first"] = day

    # ---------------- carnet d'adresses ----------------
    def save_contact(self, name: str, email: str, cid: str | None = None) -> dict:
        email = email.strip()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            raise ValueError("Adresse e-mail invalide")
        for c in self.data["contacts"]:
            if (cid and c["id"] == cid) or (not cid and c["email"].lower() == email.lower()):
                c.update({"name": name.strip() or email, "email": email})
                return c
        c = {"id": _id(), "name": name.strip() or email, "email": email}
        self.data["contacts"].append(c)
        return c

    def delete_contact(self, cid: str) -> None:
        self.data["contacts"] = [c for c in self.data["contacts"] if c["id"] != cid]

    # ---------------- photos envoyées depuis la carte ----------------
    async def save_image(self, obj: dict, body: bytes) -> None:
        name = f"{obj['id']}.jpg"

        def _write() -> None:
            os.makedirs(self._img_dir, exist_ok=True)
            for ext in (".jpg", ".webp"):
                old = os.path.join(self._img_dir, f"{obj['id']}{ext}")
                if os.path.exists(old):
                    os.remove(old)
            with open(os.path.join(self._img_dir, name), "wb") as f:
                f.write(body)
        await self.hass.async_add_executor_job(_write)
        obj["image"] = f"{MEDIA_PATH}/{name}?v={int(time.time())}"
        obj.pop("image_remote", None)

    _BAD_UNITS = {"gram", "grams", "kilogram", "kilograms", "liter", "liters", "milliliter", "milliliters",
                  "tablespoon", "tablespoons", "teaspoon", "teaspoons", "tbsp", "tsp", "pinch", "fluid"}

    def _repair_units(self) -> bool:
        """Corrige les lignes importées avec une unité anglaise (Mealie : « 400 gram blanc de poulet »)."""
        fixed, suspects = False, set()
        for r in self.data["recipes"].values():
            for line in r.get("ingredients", []):
                first = (line.get("name") or "").lower().split(" ", 1)[0]
                if first in self._BAD_UNITS and line.get("raw"):
                    p = parse_line(line["raw"])
                    if p["name"]:
                        suspects.add(line.get("ingredient_id"))
                        ing = self.add_ingredient(p["name"])
                        line.update({**p, "ingredient_id": ing["id"]})
                        fixed = True
        if fixed:
            used = {l.get("ingredient_id") for r in self.data["recipes"].values() for l in r.get("ingredients", [])}
            used |= {e.get("ingredient_id") for d in self.data["plan"].values() for es in d.values() for e in es}
            for iid in suspects - used:
                ing = self.data["ingredients"].get(iid)
                if ing and not ing.get("off_code"):
                    del self.data["ingredients"][iid]
        return fixed

    @callback
    def changed(self, what: str = "all") -> None:
        self._store.async_delay_save(lambda: self.data, 1.0)
        async_dispatcher_send(self.hass, SIGNAL_UPDATED, what)

    def _clean_plan(self) -> None:
        """Garde 8 semaines d'historique."""
        limit = (date.today() - timedelta(days=56)).isoformat()
        for k in [k for k in self.data["plan"] if k < limit]:
            del self.data["plan"][k]

    # ---------------- ingrédients ----------------
    def find_ingredient(self, name: str) -> dict | None:
        key = ingredient_key(name)
        if not key:
            return None
        for ing in self.data["ingredients"].values():
            if ing.get("key") == key or key in (ing.get("aliases") or []):
                return ing
        return None

    def add_ingredient(self, name: str, **extra) -> dict:
        found = self.find_ingredient(name)
        if found:
            for k, v in extra.items():
                if v not in (None, "", []) and not found.get(k):
                    found[k] = v
            return found
        disp = singular_name(name)
        ing = {"id": _id(), "name": disp, "key": ingredient_key(disp), "aisle": extra.pop("aisle", None) or guess_aisle(disp, extra.get("categories")),
               "image": "", "brand": "", "off_code": "", "nutriscore": "", "kcal100": None, "aliases": [], "created": time.time()}
        extra.pop("categories", None)
        ing.update({k: v for k, v in extra.items() if v not in (None,)})
        if ingredient_key(name) != ing["key"]:
            ing["aliases"].append(ingredient_key(name))
        self.data["ingredients"][ing["id"]] = ing
        return ing

    OFF_KEYS = ("brand", "quantity", "nutriscore", "ecoscore", "nova", "kcal100", "nutrition", "ingredients_text", "allergens", "labels", "stores")

    def apply_off(self, ing: dict, off: dict) -> dict:
        """Copie la fiche Open Food Facts dans l'ingrédient (l'image est mise en cache ensuite)."""
        for k in self.OFF_KEYS:
            if k in off:
                ing[k] = off[k]
        ing["off_code"] = off.get("code", "")
        ing["image"] = off.get("image_full") or off.get("image") or ing.get("image", "")
        if not ing.get("aisle_manual") and off.get("categories"):
            ing["aisle"] = guess_aisle(ing["name"], off["categories"])
        return ing

    def update_ingredient(self, iid: str, changes: dict) -> dict:
        ing = self.data["ingredients"][iid]
        if "aisle" in changes:
            ing["aisle_manual"] = True
        for k in ("name", "aisle", "image", "off_code", "default_unit", "notes", *self.OFF_KEYS):
            if k in changes:
                ing[k] = changes[k]
        if "name" in changes:
            old = ing.get("key")
            ing["key"] = ingredient_key(ing["name"])
            if old and old != ing["key"] and old not in ing["aliases"]:
                ing["aliases"].append(old)
        if "aisle" in changes and changes["aisle"] not in _AISLE_IDS:
            ing["aisle"] = "autre"
        return ing

    def delete_ingredient(self, iid: str) -> None:
        self.data["ingredients"].pop(iid, None)
        for ext in (".jpg", ".webp"):
            path = os.path.join(self._img_dir, f"{iid}{ext}")
            if os.path.exists(path):
                self.hass.async_add_executor_job(os.remove, path)
        for r in self.data["recipes"].values():
            for line in r.get("ingredients", []):
                if line.get("ingredient_id") == iid:
                    line["ingredient_id"] = None

    def merge_ingredients(self, keep: str, drop: str) -> None:
        a, b = self.data["ingredients"].get(keep), self.data["ingredients"].get(drop)
        if not a or not b or keep == drop:
            return
        a["aliases"] = list({*a.get("aliases", []), b["key"], *b.get("aliases", [])})
        for r in self.data["recipes"].values():
            for line in r.get("ingredients", []):
                if line.get("ingredient_id") == drop:
                    line["ingredient_id"] = keep
        for day in self.data["plan"].values():
            for slot in day.values():
                for e in slot:
                    if e.get("ingredient_id") == drop:
                        e["ingredient_id"] = keep
        del self.data["ingredients"][drop]

    # ---------------- recettes ----------------
    @staticmethod
    def _split_lines(lines: list) -> list:
        """« sel, poivre » / « sel et poivre » → deux lignes (sans quantité uniquement)."""
        out = []
        for raw in lines:
            if isinstance(raw, str) and not re.match(r"^\s*[\d½¼¾]", raw):
                parts = [p.strip() for p in re.split(r",| et ", raw) if p.strip()]
                if 1 < len(parts) <= 4 and all(len(p.split()) <= 3 for p in parts):
                    out.extend(parts)
                    continue
            out.append(raw)
        return out

    def _link_lines(self, lines: list) -> list[dict]:
        out = []
        for raw in self._split_lines(lines):
            if isinstance(raw, dict):  # déjà structurée (édition depuis la carte)
                p = {"qty": raw.get("qty"), "unit": raw.get("unit") or "", "name": raw.get("name") or "", "note": raw.get("note") or "", "raw": raw.get("raw") or ""}
                iid = raw.get("ingredient_id")
                if iid and iid in self.data["ingredients"]:
                    out.append({**p, "ingredient_id": iid})
                    continue
            else:
                p = parse_line(raw)
            if not p["name"]:
                continue
            ing = self.add_ingredient(p["name"])
            out.append({**p, "ingredient_id": ing["id"]})
        return out

    def find_recipe_by_url(self, url: str) -> dict | None:
        if not url:
            return None
        return next((r for r in self.data["recipes"].values() if r.get("source_url") == url), None)

    def save_recipe(self, rec: dict, rid: str | None = None) -> dict:
        lines = rec.pop("lines", None)
        if rid and rid in self.data["recipes"]:
            r = self.data["recipes"][rid]
        else:
            r = {"id": _id(), "created": time.time(), "favorite": False, "tags": [], "ingredients": [], "steps": []}
            self.data["recipes"][r["id"]] = r
        for k in ("name", "image", "source_url", "source", "servings", "prep", "cook", "total", "category", "rating", "steps", "tags",
                  "favorite", "notes", "mealie_slug", "image_remote"):
            if k in rec:
                r[k] = rec[k]
        if lines is not None:
            r["ingredients"] = self._link_lines(lines)
        elif "ingredients" in rec:
            r["ingredients"] = self._link_lines(rec["ingredients"])
        r["servings"] = int(r.get("servings") or self.servings)
        r["updated"] = time.time()
        return r

    def delete_recipe(self, rid: str) -> None:
        self.data["recipes"].pop(rid, None)
        self.data["history"].pop(rid, None)
        for day in self.data["plan"].values():
            for slot in list(day):
                day[slot] = [e for e in day[slot] if e.get("recipe_id") != rid]
        path = os.path.join(self._img_dir, f"{rid}.jpg")
        if os.path.exists(path):
            self.hass.async_add_executor_job(os.remove, path)

    async def cache_image(self, session: aiohttp.ClientSession, rec: dict) -> None:
        """Copie locale de la photo (évite les liens externes et le contenu mixte)."""
        url = rec.get("image") or ""
        if not url.startswith("http"):
            return
        try:
            async with session.get(url, headers={"User-Agent": "Mozilla/5.0 HOLM-MyMenu"}, timeout=aiohttp.ClientTimeout(total=20)) as resp:
                if resp.status != 200 or not (resp.headers.get("Content-Type", "").startswith("image")):
                    return
                body = await resp.read()
        except (aiohttp.ClientError, TimeoutError):
            return
        ext = ".webp" if url.lower().split("?")[0].endswith(".webp") or "webp" in resp.headers.get("Content-Type", "") else ".jpg"
        name = f"{rec['id']}{ext}"

        def _write() -> None:
            os.makedirs(self._img_dir, exist_ok=True)
            with open(os.path.join(self._img_dir, name), "wb") as f:
                f.write(body)
        await self.hass.async_add_executor_job(_write)
        rec["image_remote"] = url
        rec["image"] = f"{MEDIA_PATH}/{name}?v={int(time.time())}"

    # ---------------- planning ----------------
    def set_slot(self, day: str, slot: str, entries: list[dict], track: bool = True) -> None:
        if slot not in SLOTS:
            raise ValueError("créneau inconnu")
        before = [e.get("recipe_id") for e in self.data["plan"].get(day, {}).get(slot, []) if e.get("type") == "recipe"]
        clean = []
        for e in entries:
            t = e.get("type")
            if t == "recipe" and e.get("recipe_id") in self.data["recipes"]:
                clean.append({"type": "recipe", "recipe_id": e["recipe_id"], "servings": int(e.get("servings") or self.data["recipes"][e["recipe_id"]].get("servings") or self.servings)})
            elif t == "ingredient" and e.get("ingredient_id") in self.data["ingredients"]:
                clean.append({"type": "ingredient", "ingredient_id": e["ingredient_id"], "qty": e.get("qty"), "unit": e.get("unit") or ""})
            elif t == "text" and str(e.get("text") or "").strip():
                clean.append({"type": "text", "text": str(e["text"]).strip()[:120]})
        if track:
            after = [e["recipe_id"] for e in clean if e["type"] == "recipe"]
            for rid in set(after) - set(before):
                self._count(rid, day)
            for rid in set(before) - set(after):
                if day >= date.today().isoformat():  # retiré d'un repas à venir : il n'a pas été mangé
                    self._count(rid, day, -1)
        d = self.data["plan"].setdefault(day, {})
        if clean:
            d[slot] = clean
        else:
            d.pop(slot, None)
            if not d:
                self.data["plan"].pop(day, None)

    def move_slot(self, src_day: str, src_slot: str, dst_day: str, dst_slot: str, swap: bool = True) -> None:
        a = list(self.data["plan"].get(src_day, {}).get(src_slot, []))
        b = list(self.data["plan"].get(dst_day, {}).get(dst_slot, []))
        self.set_slot(dst_day, dst_slot, a, track=False)
        self.set_slot(src_day, src_slot, b if swap else [], track=False)

    def entry_label(self, e: dict) -> str:
        if e["type"] == "recipe":
            return self.data["recipes"].get(e["recipe_id"], {}).get("name", "?")
        if e["type"] == "ingredient":
            return self.data["ingredients"].get(e["ingredient_id"], {}).get("name", "?")
        return e.get("text", "")

    def slot_summary(self, day: str, slot: str) -> dict:
        entries = self.data["plan"].get(day, {}).get(slot, [])
        img = ""
        for e in entries:
            if e["type"] == "recipe":
                img = self.data["recipes"].get(e["recipe_id"], {}).get("image", "")
                if img:
                    break
        return {"label": " · ".join(self.entry_label(e) for e in entries), "entries": entries, "image": img}

    # ---------------- liste de courses ----------------
    def generate_shopping(self, start: str, end: str, keep_manual: bool = True) -> None:
        acc: dict[tuple, dict] = {}

        def add(iid, name, qty, unit, source):
            q, u = to_base(qty, unit)
            k = (iid or ingredient_key(name), u)
            it = acc.get(k)
            if not it:
                ing = self.data["ingredients"].get(iid) if iid else None
                it = acc[k] = {"id": _id(), "ingredient_id": iid, "name": ing["name"] if ing else name, "qty": None, "unit": u,
                               "aisle": (ing or {}).get("aisle") or guess_aisle(name), "image": (ing or {}).get("image", ""),
                               "checked": False, "manual": False, "sources": []}
            if q is not None:
                it["qty"] = (it["qty"] or 0) + q
            if source and source not in it["sources"]:
                it["sources"].append(source)

        d0, d1 = date.fromisoformat(start), date.fromisoformat(end)
        d = d0
        while d <= d1:
            for slot, entries in self.data["plan"].get(d.isoformat(), {}).items():
                for e in entries:
                    if e["type"] == "recipe":
                        r = self.data["recipes"].get(e["recipe_id"])
                        if not r:
                            continue
                        f = (e.get("servings") or r.get("servings") or 1) / (r.get("servings") or 1)
                        for line in r.get("ingredients", []):
                            add(line.get("ingredient_id"), line.get("name"), line["qty"] * f if line.get("qty") is not None else None, line.get("unit", ""), r["name"])
                    elif e["type"] == "ingredient":
                        ing = self.data["ingredients"].get(e["ingredient_id"])
                        if ing:
                            add(ing["id"], ing["name"], e.get("qty"), e.get("unit", ""), None)
            d += timedelta(days=1)
        old = self.data["shopping"].get("items", [])
        checked = {(i.get("ingredient_id") or ingredient_key(i["name"]), i.get("unit")) for i in old if i.get("checked") and not i.get("manual")}
        items = list(acc.values())
        for it in items:
            if (it["ingredient_id"] or ingredient_key(it["name"]), it["unit"]) in checked:
                it["checked"] = True
            it["display"] = pretty_qty(it["qty"], it["unit"])
        if keep_manual:
            items += [i for i in old if i.get("manual")]
        self.data["shopping"] = {"items": items, "range": {"start": start, "end": end}, "generated": time.time()}

    def shopping_add(self, name: str, qty: str = "") -> dict:
        ing = self.find_ingredient(name)
        it = {"id": _id(), "ingredient_id": ing["id"] if ing else None, "name": ing["name"] if ing else singular_name(name), "qty": None, "unit": "",
              "display": qty, "aisle": (ing or {}).get("aisle") or guess_aisle(name), "image": (ing or {}).get("image", ""),
              "checked": False, "manual": True, "sources": []}
        self.data["shopping"].setdefault("items", []).append(it)
        return it

    def shopping_toggle(self, item_id: str, checked: bool | None = None) -> None:
        for it in self.data["shopping"].get("items", []):
            if it["id"] == item_id:
                it["checked"] = (not it["checked"]) if checked is None else bool(checked)

    def shopping_remove(self, item_id: str | None = None, checked_only: bool = False) -> None:
        items = self.data["shopping"].get("items", [])
        if item_id:
            items = [i for i in items if i["id"] != item_id]
        elif checked_only:
            items = [i for i in items if not i.get("checked")]
        else:
            items = []
        self.data["shopping"]["items"] = items

    # ---------------- statistiques ----------------
    def _dir_size(self) -> tuple[int, int]:
        total = n = 0
        if os.path.isdir(self._img_dir):
            for e in os.scandir(self._img_dir):
                if e.is_file():
                    total += e.stat().st_size
                    n += 1
        return total, n

    async def stats(self) -> dict:
        d = self.data
        recipes, ings = d["recipes"], d["ingredients"]
        img_bytes, img_n = await self.hass.async_add_executor_job(self._dir_size)
        db_path = self.hass.config.path(".storage", STORAGE_KEY)
        db_bytes = await self.hass.async_add_executor_job(lambda: os.path.getsize(db_path) if os.path.exists(db_path) else 0)
        sources: dict[str, int] = {}
        for r in recipes.values():
            k = r.get("source") or ("web" if r.get("source_url") else "manuel")
            sources[k] = sources.get(k, 0) + 1
        hist = d["history"]
        top = sorted(((rid, h) for rid, h in hist.items() if rid in recipes and h.get("count")), key=lambda x: (x[1]["count"], x[1].get("last", "")), reverse=True)[:15]
        # ingrédients les plus utilisés : pondérés par le nombre de fois où leurs recettes ont été planifiées
        ing_use: dict[str, int] = {}
        for rid, h in hist.items():
            for line in recipes.get(rid, {}).get("ingredients", []):
                if line.get("ingredient_id") in ings:
                    ing_use[line["ingredient_id"]] = ing_use.get(line["ingredient_id"], 0) + h.get("count", 0)
        for day in d["plan"].values():
            for es in day.values():
                for e in es:
                    if e.get("type") == "ingredient" and e.get("ingredient_id") in ings:
                        ing_use[e["ingredient_id"]] = ing_use.get(e["ingredient_id"], 0) + 1
        top_ing = sorted(ing_use.items(), key=lambda x: -x[1])[:15]
        # repas planifiés par semaine (8 dernières semaines + semaine suivante)
        today = date.today()
        mon = today - timedelta(days=today.weekday())
        weeks = []
        for k in range(-7, 2):
            w0 = mon + timedelta(weeks=k)
            n_meals = sum(1 for i in range(7) for es in d["plan"].get((w0 + timedelta(days=i)).isoformat(), {}).values() if es)
            weeks.append({"start": w0.isoformat(), "meals": n_meals})
        planned_ever = {rid for rid, h in hist.items() if h.get("count")}
        return {
            "recipes": len(recipes), "ingredients": len(ings),
            "ingredients_off": sum(1 for i in ings.values() if i.get("off_code")),
            "ingredients_img": sum(1 for i in ings.values() if i.get("image")),
            "recipes_img": sum(1 for r in recipes.values() if r.get("image")),
            "favorites": sum(1 for r in recipes.values() if r.get("favorite")),
            "never_planned": sum(1 for rid in recipes if rid not in planned_ever),
            "meals_planned": sum(1 for day in d["plan"].values() for es in day.values() if es),
            "shopping": len(d["shopping"].get("items", [])), "contacts": len(d["contacts"]),
            "sources": sources, "db_bytes": db_bytes, "img_bytes": img_bytes, "img_files": img_n,
            "top_recipes": [{"id": rid, "name": recipes[rid]["name"], "image": recipes[rid].get("image", ""), "count": h["count"], "last": h.get("last")} for rid, h in top],
            "top_ingredients": [{"id": iid, "name": ings[iid]["name"], "image": ings[iid].get("image", ""), "count": n} for iid, n in top_ing],
            "weeks": weeks,
        }

    # ---------------- état pour la carte ----------------
    def snapshot(self) -> dict:
        return {"ingredients": self.data["ingredients"], "recipes": self.data["recipes"], "plan": self.data["plan"],
                "shopping": self.data["shopping"], "contacts": self.data["contacts"],
                "history": {k: v.get("count", 0) for k, v in self.data["history"].items()},
                "aisles": AISLES, "slots": list(SLOTS), "servings": self.servings}


async def gather_limited(coros, limit: int = 4):
    sem = asyncio.Semaphore(limit)

    async def run(c):
        async with sem:
            return await c
    return await asyncio.gather(*(run(c) for c in coros), return_exceptions=True)
