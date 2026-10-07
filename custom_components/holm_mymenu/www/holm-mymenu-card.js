/* HOLM My Menu Card — menus de la semaine, recettes, ingrédients et liste de courses.
 * Fait partie de HOLM — Home Orchestration & Living Management. https://github.com/kaaribou/holm-mymenu — licence MIT
 *   type: custom:holm-mymenu-card
 *   title: Menus            view: full | today | week | stats        tab: week | recipes | ingredients | shopping | stats
 *   today_slots: [midi, soir]   list_height: 620   show_frame: false
 */
(() => {
const VERSION = "1.1.0";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const monday = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); const k = (x.getDay() + 6) % 7; return addDays(x, -k); };
const fdate = (d, o) => d.toLocaleDateString("fr-FR", o);
const mins = (m) => (!m ? "" : m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const SLOT_LBL = { midi: "Midi", soir: "Soir" };
const NUTRI = { a: "#038141", b: "#85bb2f", c: "#fecb02", d: "#ee8100", e: "#e63e11" };
const fq = (q) => { if (q == null) return ""; const r = Math.round(q * 100) / 100; return (r === Math.floor(r) ? String(r) : String(r).replace(".", ",")); };

class HolmMyMenuCard extends HTMLElement {
  setConfig(c) {
    this._c = { title: "Menus", view: "full", tab: "week", ...c };
    this._tab = this._tab || this._c.tab;
    this._week = this._week || monday(new Date());
    this._q = this._q || { recipes: "", ingredients: "" };
    this._lim = { recipes: 12, ingredients: 36 };
    if (this.shadowRoot) this._render();
  }
  set hass(h) {
    this._hass = h;
    if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._render(); }
    if (!this._sub && h.connection) this._subscribe();
  }
  connectedCallback() { if (this._hass && !this._sub) this._subscribe(); }
  disconnectedCallback() { if (this._sub) { this._sub.then((u) => u && u()).catch(() => {}); this._sub = null; } }
  _subscribe() {
    this._sub = this._hass.connection.subscribeMessage((m) => { this._s = m.state; this._update(); this._refreshModal(); }, { type: "holm_mymenu/subscribe" });
    this._sub.catch((e) => { this._err = e && e.code === "unknown_command" ? "L'intégration HOLM My Menu n'est pas installée ou pas encore chargée." : (e && e.message) || String(e); this._sub = null; this._render(); });
  }
  _update() {
    const a = this.shadowRoot && this.shadowRoot.activeElement;
    if (a && a.matches("input.search, input.shop-add") && this._renderList !== undefined) {
      if (a.matches("input.search") && this._renderList()) return;
      if (a.matches("input.shop-add")) { const v = a.value; this._render(); const n = this.shadowRoot.querySelector("input.shop-add"); if (n) { n.value = v; n.focus(); } return; }
    }
    this._render();
  }
  _ws(type, data = {}) { return this._hass.callWS({ type: `holm_mymenu/${type}`, ...data }); }
  _toast(msg) { const ev = new Event("hass-notification", { bubbles: true, composed: true }); ev.detail = { message: msg }; (document.querySelector("home-assistant") || this).dispatchEvent(ev); }
  async _do(p, ok) { try { const r = await p; if (ok) this._toast(ok); return r; } catch (e) { this._toast(`HOLM My Menu : ${(e && e.message) || e}`); throw e; } }

  // ---------------- rendu principal ----------------
  _render() {
    if (!this.shadowRoot || !this._c) return;
    const c = this._c, s = this._s;
    let body;
    if (this._err) body = `<div class="empty">${esc(this._err)}</div>`;
    else if (!s) body = `<div class="empty">Chargement…</div>`;
    else if (c.view === "today") body = this._today();
    else if (c.view === "week") body = this._weekRO();
    else if (c.view === "stats") body = this._statsView();
    else body = ({ week: this._weekView, recipes: this._recipesView, ingredients: this._ingView, shopping: this._shopView, stats: this._statsView }[this._tab] || this._weekView).call(this);
    const tabs = [["week", "mdi:calendar-week", "Semaine"], ["recipes", "mdi:book-open-page-variant", "Recettes"], ["ingredients", "mdi:food-apple", "Ingrédients"], ["shopping", "mdi:cart-outline", "Courses"], ["stats", "mdi:chart-box-outline", "Stats"]];
    const nShop = s ? (s.shopping.items || []).filter((i) => !i.checked).length : 0;
    const keepModal = this.shadowRoot.querySelector(".modal-root");
    this.shadowRoot.innerHTML = `<style>${CSS}</style>
      <ha-card class="${c.show_frame === false ? "noframe" : ""}">
        <div class="hd"><div class="tt"><ha-icon icon="mdi:silverware-variant"></ha-icon>${esc(c.title)}</div>
          ${c.view === "today" || c.view === "week" || c.view === "stats" ? "" : `<div class="tabs">${tabs.map(([k, i, l]) => `<button class="tab ${this._tab === k ? "on" : ""}" data-tab="${k}"><ha-icon icon="${i}"></ha-icon><span>${l}</span>${k === "shopping" && nShop ? `<em>${nShop}</em>` : ""}</button>`).join("")}</div>`}
        </div>
        <div class="bd">${body}</div>
      </ha-card>`;
    if (keepModal) this.shadowRoot.appendChild(keepModal);
    this._bind();
  }
  _moreHtml(more, total, word) {
    return more > 0 ? `<button class="more" data-act="more">Afficher la suite · ${more} ${word}${more > 1 ? "s" : ""} sur ${total}</button>` : "";
  }
  _more() {
    const k = this._tab === "recipes" ? "recipes" : "ingredients";
    this._lim[k] += k === "recipes" ? 12 : 36;
    this._renderList();
  }
  // met à jour la seule liste (le champ de recherche garde le focus)
  _renderList() {
    const box = this.shadowRoot && this.shadowRoot.querySelector(".lst");
    if (!box || !this._s) return false;
    box.innerHTML = this._tab === "recipes" ? this._recipesList() : this._ingList();
    box.querySelectorAll("[data-act]").forEach((el) => el.addEventListener(el.dataset.ev || "click", (e) => this._act(el.dataset.act, el, e)));
    return true;
  }
  _bind() {
    const r = this.shadowRoot;
    r.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => { this._tab = b.dataset.tab; this._render(); }));
    r.querySelectorAll("[data-act]").forEach((el) => el.addEventListener(el.dataset.ev || "click", (e) => this._act(el.dataset.act, el, e)));
    // glisser-déposer des créneaux
    r.querySelectorAll(".slot[draggable]").forEach((el) => {
      el.addEventListener("dragstart", (e) => { this._drag = { day: el.dataset.day, slot: el.dataset.slot }; e.dataTransfer.effectAllowed = "copyMove"; el.classList.add("dragging"); });
      el.addEventListener("dragend", () => el.classList.remove("dragging"));
    });
    r.querySelectorAll(".slot").forEach((el) => {
      el.addEventListener("dragover", (e) => { if (this._drag) { e.preventDefault(); el.classList.add("over"); } });
      el.addEventListener("dragleave", () => el.classList.remove("over"));
      el.addEventListener("drop", (e) => {
        e.preventDefault(); el.classList.remove("over");
        const d = this._drag; this._drag = null;
        if (!d || (d.day === el.dataset.day && d.slot === el.dataset.slot)) return;
        this._do(this._ws("plan/move", { src_day: d.day, src_slot: d.slot, dst_day: el.dataset.day, dst_slot: el.dataset.slot, copy: e.ctrlKey || e.altKey }));
      });
    });
    const qi = r.querySelector("input.search");
    if (qi) {
      qi.addEventListener("input", () => { this._q[qi.dataset.k] = qi.value; this._lim = { recipes: 12, ingredients: 36 }; clearTimeout(this._qt); this._qt = setTimeout(() => this._renderList(), 150); });
      qi.addEventListener("keydown", (e) => e.stopPropagation());
    }
    const lst = r.querySelector(".lst");
    if (lst) lst.addEventListener("scroll", () => { if (lst.scrollTop + lst.clientHeight > lst.scrollHeight - 160 && lst.querySelector(".more")) this._more(); }, { passive: true });
    if (lst && this._c.list_height !== 0) lst.style.maxHeight = `${this._c.list_height || 620}px`;
    const ai = r.querySelector("input.shop-add");
    if (ai) ai.addEventListener("keydown", (e) => { if (e.key === "Enter" && ai.value.trim()) { this._do(this._ws("shopping/add", { name: ai.value.trim() })); ai.value = ""; } });
  }
  async _act(a, el, e) {
    const s = this._s, d = el.dataset;
    switch (a) {
      case "week-prev": this._week = addDays(this._week, -7); return this._render();
      case "week-next": this._week = addDays(this._week, 7); return this._render();
      case "week-now": this._week = monday(new Date()); return this._render();
      case "slot": return this._slotModal(d.day, d.slot);
      case "recipe": return this._recipeModal(d.id);
      case "add-recipe": return this._addRecipeModal();
      case "fav-filter": this._favOnly = !this._favOnly; this._lim.recipes = 12; return this._render();
      case "more": return this._more();
      case "stats-refresh": this._stats = null; return this._render();
      case "ing": return this._ingModal(d.id);
      case "add-ing": return this._addIngModal(this._q.ingredients || "");
      case "shop-gen": {
        const st = this._shopWeek || monday(new Date());
        await this._do(this._ws("shopping/generate", { start: iso(st), end: iso(addDays(st, 6)) }), "Liste de courses générée");
        return;
      }
      case "shop-week-prev": this._shopWeek = addDays(this._shopWeek || monday(new Date()), -7); return this._render();
      case "shop-week-next": this._shopWeek = addDays(this._shopWeek || monday(new Date()), 7); return this._render();
      case "shop-toggle": return this._ws("shopping/toggle", { item_id: d.id });
      case "shop-del": e.stopPropagation(); return this._ws("shopping/remove", { item_id: d.id });
      case "shop-clear-checked": return this._ws("shopping/remove", { checked_only: true });
      case "shop-clear": if (confirm("Vider toute la liste de courses ?")) return this._ws("shopping/remove", {}); return;
      case "shop-share": return this._shareModal();
      case "shop-copy": try { await navigator.clipboard.writeText(this._shopText()); this._toast("Liste copiée"); } catch (_) { this._toast("Copie impossible sur cet appareil"); } return;
      case "today-slot": return this._slotModal(d.day, d.slot);
      case "view-recipe": return this._recipeModal(d.id, null, { readonly: true, servings: +d.sv || 0 });
      case "view-ing": return this._ingModal(d.id, true);
    }
  }

  // ---------------- Semaine ----------------
  _slotHtml(day, slot, compact = false) {
    const s = this._s, entries = (s.plan[day] || {})[slot] || [];
    const recs = entries.filter((e) => e.type === "recipe").map((e) => s.recipes[e.recipe_id]).filter(Boolean);
    const img = (recs.find((r) => r.image) || {}).image;
    const lbl = recs.map((r) => r.name);
    const ings = entries.filter((e) => e.type === "ingredient").map((e) => s.ingredients[e.ingredient_id]).filter(Boolean);
    const txt = entries.filter((e) => e.type === "text").map((e) => e.text);
    const top = lbl.length || txt.length;
    return `<div class="slot ${entries.length ? "full" : ""}" draggable="${entries.length ? "true" : "false"}" data-act="slot" data-day="${day}" data-slot="${slot}">
        <div class="shero ${img ? "img" : ""} ${!top && ings.length ? "mini" : ""}" ${img ? `style="--img:url('${esc(img)}')"` : ""}><span class="sl">${SLOT_LBL[slot]}</span>
          ${top ? `<div class="sx">${lbl.map((l) => `<b>${esc(l)}</b>`).join("")}${txt.map((l) => `<i>${esc(l)}</i>`).join("")}</div>` : entries.length ? "" : `<div class="sx add"><ha-icon icon="mdi:plus"></ha-icon></div>`}</div>
        ${ings.length ? `<div class="sxi">${ings.map((i) => `<span>${i.image ? `<em style="background-image:url('${esc(i.image)}')"></em>` : `<ha-icon icon="mdi:food-apple-outline"></ha-icon>`}${esc(i.name)}</span>`).join("")}</div>` : ""}</div>`;
  }
  _weekView() {
    const s = this._s, w0 = this._week, today = iso(new Date());
    const days = [...Array(7)].map((_, i) => addDays(w0, i));
    const w1 = days[6];
    return `<div class="bar"><button class="ib" data-act="week-prev"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
        <div class="wk">Semaine du ${fdate(w0, { day: "numeric", month: w0.getMonth() === w1.getMonth() ? undefined : "short" })} au ${fdate(w1, { day: "numeric", month: "long" })}</div>
        <button class="ib" data-act="week-next"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
        <button class="pill" data-act="week-now">Aujourd'hui</button></div>
      <div class="week">${days.map((d) => { const k = iso(d); return `<div class="day ${k === today ? "today" : ""} ${k < today ? "past" : ""}">
          <div class="dn"><b>${fdate(d, { weekday: "short" })}</b><span>${d.getDate()}</span></div>
          ${this._viewSlots().map((sl) => this._slotHtml(k, sl)).join("")}</div>`; }).join("")}</div>
      <div class="hint">Toucher un repas pour le choisir · glisser un repas sur un autre pour les échanger (Ctrl pour copier)</div>`;
  }
  _viewSlots() {
    const s = this._s, want = Array.isArray(this._c.today_slots) && this._c.today_slots.length ? this._c.today_slots : s.slots;
    return s.slots.filter((sl) => want.includes(sl));
  }
  // tuile en consultation (vues « Menu du jour » et « Semaine ») : recettes, puis ingrédients, puis notes
  _tile(day, sl, small = false) {
    const s = this._s, entries = (s.plan[day] || {})[sl] || [];
    const recs = entries.filter((e) => e.type === "recipe" && s.recipes[e.recipe_id]);
    const ings = entries.filter((e) => e.type === "ingredient" && s.ingredients[e.ingredient_id]);
    const txts = entries.filter((e) => e.type === "text");
    const img = (recs.map((e) => s.recipes[e.recipe_id]).find((r) => r.image) || {}).image;
    const top = recs.length || txts.length;
    return `<div class="tslot ${small ? "sm" : ""}">
      <div class="thero ${img ? "img" : ""} ${!top && ings.length ? "mini" : ""}" ${img ? `style="--img:url('${esc(img)}')"` : ""}>
        <span class="sl">${SLOT_LBL[sl]}</span>
        ${top ? `<div class="tents">
          ${recs.map((e) => { const r = s.recipes[e.recipe_id]; return `<button class="te" data-act="view-recipe" data-id="${r.id}" data-sv="${e.servings || ""}"><b>${esc(r.name)}</b>${small ? "" : `<small>${[r.total ? mins(r.total) : "", e.servings ? `${e.servings} pers.` : ""].filter(Boolean).join(" · ")}</small>`}</button>`; }).join("")}
          ${txts.map((e) => `<div class="te txt"><i>${esc(e.text)}</i></div>`).join("")}</div>` : entries.length ? "" : `<div class="tempty">Rien de prévu</div>`}
      </div>
      ${ings.length ? `<div class="tings">${ings.map((e) => { const i = s.ingredients[e.ingredient_id]; return `<button class="tchip" data-act="view-ing" data-id="${i.id}">${i.image ? `<span class="ti" style="background-image:url('${esc(i.image)}')"></span>` : `<span class="ti no"><ha-icon icon="mdi:food-apple-outline"></ha-icon></span>`}<span class="tn">${esc(i.name)}</span></button>`; }).join("")}</div>` : ""}</div>`;
  }
  _today() {
    const k = iso(new Date()), slots = this._viewSlots();
    return `<div class="todayv n${slots.length}">${slots.map((sl) => this._tile(k, sl)).join("")}</div>`;
  }
  _weekRO() {
    const w0 = this._week, today = iso(new Date()), slots = this._viewSlots();
    const days = [...Array(7)].map((_, i) => addDays(w0, i)), w1 = days[6];
    return `<div class="bar"><button class="ib" data-act="week-prev"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
        <div class="wk">Semaine du ${fdate(w0, { day: "numeric", month: w0.getMonth() === w1.getMonth() ? undefined : "short" })} au ${fdate(w1, { day: "numeric", month: "long" })}</div>
        <button class="ib" data-act="week-next"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
        ${iso(w0) === iso(monday(new Date())) ? "" : `<button class="pill" data-act="week-now">Aujourd'hui</button>`}</div>
      <div class="weekro n${slots.length}">${days.map((d) => { const k = iso(d); return `<div class="rday ${k === today ? "today" : ""} ${k < today ? "past" : ""}">
          <div class="rdn"><b>${fdate(d, { weekday: "long" })}</b><span>${d.getDate()}</span></div>
          <div class="rsl">${slots.map((sl) => this._tile(k, sl, true)).join("")}</div></div>`; }).join("")}</div>`;
  }

  // ---------------- Recettes ----------------
  _recipesView() {
    return `<div class="bar"><input class="search" data-k="recipes" placeholder="Rechercher une recette ou un ingrédient…" value="${esc(this._q.recipes)}">
        <button class="ib ${this._favOnly ? "on" : ""}" data-act="fav-filter" title="Favoris"><ha-icon icon="mdi:heart${this._favOnly ? "" : "-outline"}"></ha-icon></button>
        <button class="pill main" data-act="add-recipe"><ha-icon icon="mdi:plus"></ha-icon>Ajouter</button></div>
      <div class="lst">${this._recipesList()}</div>`;
  }
  _recipesList() {
    const s = this._s, q = norm(this._q.recipes);
    let list = Object.values(s.recipes).filter((r) => !q || norm(r.name).includes(q) || (r.ingredients || []).some((l) => norm(l.name).includes(q)));
    if (this._favOnly) list = list.filter((r) => r.favorite);
    list.sort((a, b) => (b.favorite - a.favorite) || a.name.localeCompare(b.name, "fr"));
    const total = list.length, more = total - this._lim.recipes;
    list = list.slice(0, this._lim.recipes);
    return `${list.length ? `<div class="rgrid">${list.map((r) => `<div class="rc" data-act="recipe" data-id="${r.id}">
          <div class="ri" ${r.image ? `style="background-image:url('${esc(r.image)}')"` : ""}>${r.image ? "" : `<ha-icon icon="mdi:chef-hat"></ha-icon>`}${r.favorite ? `<i class="fav"><ha-icon icon="mdi:heart"></ha-icon></i>` : ""}</div>
          <div class="rn">${esc(r.name)}</div>
          <div class="rm">${r.total ? `<span><ha-icon icon="mdi:clock-outline"></ha-icon>${mins(r.total)}</span>` : ""}<span><ha-icon icon="mdi:account-multiple-outline"></ha-icon>${r.servings}</span>${r.rating ? `<span><ha-icon icon="mdi:star"></ha-icon>${fq(r.rating)}</span>` : ""}</div></div>`).join("")}</div>${this._moreHtml(more, total, "recette")}`
      : `<div class="empty">${q ? "Aucune recette ne correspond." : "Aucune recette pour l'instant : ajoutez-en depuis Marmiton, un lien, Mealie ou à la main."}</div>`}`;
  }

  // ---------------- Ingrédients ----------------
  _ingView() {
    return `<div class="bar"><input class="search" data-k="ingredients" placeholder="Rechercher un ingrédient…" value="${esc(this._q.ingredients)}">
        <button class="pill main" data-act="add-ing"><ha-icon icon="mdi:plus"></ha-icon>Ajouter</button></div>
      <div class="lst">${this._ingList()}</div>`;
  }
  _ingList() {
    const s = this._s, q = norm(this._q.ingredients);
    const all = Object.values(s.ingredients).filter((i) => !q || norm(i.name).includes(q))
      .sort((a, b) => (s.aisles.findIndex((x) => x[0] === (a.aisle || "autre")) - s.aisles.findIndex((x) => x[0] === (b.aisle || "autre"))) || a.name.localeCompare(b.name, "fr"));
    const list = all.slice(0, this._lim.ingredients), more = all.length - list.length;
    const used = {};
    Object.values(s.recipes).forEach((r) => (r.ingredients || []).forEach((l) => { if (l.ingredient_id) used[l.ingredient_id] = (used[l.ingredient_id] || 0) + 1; }));
    const groups = s.aisles.map(([k, l]) => [k, l, list.filter((i) => (i.aisle || "autre") === k)]).filter((g) => g[2].length);
    return `${groups.length ? groups.map(([k, l, items]) => `<div class="grp"><div class="gh">${esc(l)}<em>${items.length}</em></div><div class="igrid">
          ${items.map((i) => `<div class="ic" data-act="ing" data-id="${i.id}"><div class="ii" ${i.image ? `style="background-image:url('${esc(i.image)}')"` : ""}>${i.image ? "" : esc(i.name.slice(0, 1))}</div>
            <div class="in"><b>${esc(i.name)}</b><small>${esc(i.brand || "")}${used[i.id] ? `${i.brand ? " · " : ""}${used[i.id]} recette${used[i.id] > 1 ? "s" : ""}` : ""}</small></div>
            ${i.nutriscore ? `<span class="ns" style="background:${NUTRI[i.nutriscore] || "#888"}">${i.nutriscore.toUpperCase()}</span>` : ""}</div>`).join("")}</div></div>`).join("") + this._moreHtml(more, all.length, "ingrédient")
      : `<div class="empty">${q ? `Aucun ingrédient « ${esc(this._q.ingredients)} ». <button class="lnk" data-act="add-ing">Le chercher sur Open Food Facts</button>` : "Aucun ingrédient pour l'instant."}</div>`}`;
  }

  // ---------------- Statistiques ----------------
  _loadStats() {
    if (this._statsBusy) return;
    this._statsBusy = true;
    this._ws("stats").then((st) => { this._stats = st; this._statsAt = Date.now(); }).catch((e) => { this._stats = { error: (e && e.message) || String(e) }; })
      .finally(() => { this._statsBusy = false; if (this._c.view === "stats" || this._tab === "stats") this._render(); });
  }
  _statsView() {
    const st = this._stats;
    if (!st || Date.now() - (this._statsAt || 0) > 60000) this._loadStats();
    if (!st) return `<div class="empty">Calcul des statistiques…</div>`;
    if (st.error) return `<div class="empty">${esc(st.error)}</div>`;
    const size = (b) => b >= 1048576 ? `${fq(Math.round(b / 104857.6) / 10)} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`;
    const SRC = { marmiton: "Marmiton", mealie: "Mealie", web: "Lien", manual: "À la main", manuel: "À la main" };
    const tile = (icon, n, label, sub = "") => `<div class="stile"><ha-icon icon="${icon}"></ha-icon><b>${n}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ""}</div>`;
    const wmax = Math.max(1, ...st.weeks.map((w) => w.meals));
    const thisMon = iso(monday(new Date()));
    const tmax = Math.max(1, ...st.top_recipes.map((r) => r.count));
    const imax = Math.max(1, ...st.top_ingredients.map((r) => r.count));
    const srcs = Object.entries(st.sources).sort((a, b) => b[1] - a[1]);
    return `<div class="bar"><div class="wk">Votre base HOLM My Menu</div><button class="ib" data-act="stats-refresh" title="Actualiser"><ha-icon icon="mdi:refresh"></ha-icon></button></div>
      <div class="stiles">
        ${tile("mdi:book-open-page-variant", st.recipes, "recettes", `${st.favorites} favori${st.favorites > 1 ? "s" : ""} · ${st.never_planned} jamais planifiée${st.never_planned > 1 ? "s" : ""}`)}
        ${tile("mdi:food-apple", st.ingredients, "ingrédients", `${st.ingredients_off} avec fiche produit · ${st.ingredients_img} avec photo`)}
        ${tile("mdi:calendar-check", st.meals_planned, "repas planifiés", "sur les 8 dernières semaines et à venir")}
        ${tile("mdi:database", size(st.db_bytes + st.img_bytes), "occupés", `base ${size(st.db_bytes)} · ${st.img_files} photos ${size(st.img_bytes)}`)}
      </div>
      <div class="scols">
        <div class="sbox"><div class="sh">Recettes les plus planifiées</div>
          ${st.top_recipes.length ? `<div class="toplist">${st.top_recipes.map((r, k) => `<div class="tr" data-act="recipe" data-id="${r.id}" title="Dernière fois : ${r.last ? fdate(new Date(r.last + "T00:00"), { day: "numeric", month: "long" }) : "—"}">
              <span class="rk">${k + 1}</span><span class="ti" ${r.image ? `style="background-image:url('${esc(r.image)}');background-size:cover"` : ""}></span>
              <span class="tn2"><b>${esc(r.name)}</b><span class="tbar"><i style="width:${Math.round((r.count / tmax) * 100)}%"></i></span></span><em>${r.count}×</em></div>`).join("")}</div>`
            : `<div class="muted pad">Planifiez des repas : les recettes les plus cuisinées apparaîtront ici.</div>`}</div>
        <div class="sbox"><div class="sh">Repas planifiés par semaine</div>
          <div class="wbars" role="img" aria-label="Repas planifiés par semaine">${st.weeks.map((w) => { const d = new Date(w.start + "T00:00"); return `<div class="wb ${w.start === thisMon ? "now" : ""}" title="Semaine du ${fdate(d, { day: "numeric", month: "long" })} : ${w.meals} repas">
              <span class="wv">${w.meals || ""}</span><span class="wcol"><i style="height:${Math.round((w.meals / wmax) * 100)}%"></i></span><span class="wl">${d.getDate()}/${d.getMonth() + 1}</span></div>`; }).join("")}</div>
          <div class="sh">Ingrédients les plus utilisés</div>
          ${st.top_ingredients.length ? `<div class="toplist sm">${st.top_ingredients.slice(0, 10).map((r) => `<div class="tr" data-act="ing" data-id="${r.id}">
              <span class="ti ${r.image ? "" : "no"}" ${r.image ? `style="background-image:url('${esc(r.image)}')"` : ""}>${r.image ? "" : `<ha-icon icon="mdi:food-apple-outline"></ha-icon>`}</span>
              <span class="tn2"><b>${esc(r.name)}</b><span class="tbar"><i style="width:${Math.round((r.count / imax) * 100)}%"></i></span></span><em>${r.count}</em></div>`).join("")}</div>` : `<div class="muted pad">—</div>`}
          <div class="sh">Origine des recettes</div>
          <div class="srcs">${srcs.map(([k, n]) => `<span class="chip">${esc(SRC[k] || k)} <b>${n}</b></span>`).join("") || "—"}</div>
        </div>
      </div>`;
  }

  // ---------------- Courses ----------------
  _shopView() {
    const s = this._s, sh = s.shopping || {}, items = sh.items || [];
    const w0 = this._shopWeek || monday(new Date()), w1 = addDays(w0, 6);
    const groups = s.aisles.map(([k, l]) => [l, items.filter((i) => (i.aisle || "autre") === k)]).filter((g) => g[1].length);
    const done = items.filter((i) => i.checked).length;
    const rng = sh.range ? `Générée pour la semaine du ${fdate(new Date(sh.range.start + "T00:00"), { day: "numeric", month: "short" })}` : "";
    return `<div class="bar"><button class="ib" data-act="shop-week-prev"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
        <div class="wk">Semaine du ${fdate(w0, { day: "numeric", month: "short" })} au ${fdate(w1, { day: "numeric", month: "short" })}</div>
        <button class="ib" data-act="shop-week-next"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
        <button class="pill main" data-act="shop-gen"><ha-icon icon="mdi:cart-arrow-down"></ha-icon>Générer</button></div>
      <div class="bar"><input class="shop-add" placeholder="Ajouter un article (Entrée)…"></div>
      ${items.length ? `<div class="shopmeta">${rng}${rng ? " · " : ""}${done}/${items.length} pris
          ${done ? `<button class="lnk" data-act="shop-clear-checked">Retirer les articles pris</button>` : ""}</div>
        <div class="row act shopact"><button class="pill" data-act="shop-share"><ha-icon icon="mdi:email-outline"></ha-icon>Envoyer par mail</button><button class="pill" data-act="shop-copy"><ha-icon icon="mdi:content-copy"></ha-icon>Copier</button><button class="pill danger" data-act="shop-clear"><ha-icon icon="mdi:delete-sweep-outline"></ha-icon>Vider la liste</button></div>
        ${groups.map(([l, its]) => `<div class="grp"><div class="gh">${esc(l)}<em>${its.filter((i) => !i.checked).length}</em></div>
          ${its.sort((a, b) => a.checked - b.checked || a.name.localeCompare(b.name, "fr")).map((i) => `<div class="si ${i.checked ? "ck" : ""}" data-act="shop-toggle" data-id="${i.id}" title="${esc((i.sources || []).join(", "))}">
            <span class="cb"><ha-icon icon="mdi:check"></ha-icon></span><b>${esc(i.name)}</b><span class="q">${esc(i.display || "")}</span>
            ${i.sources && i.sources.length ? `<small>${esc(i.sources.slice(0, 2).join(", "))}${i.sources.length > 2 ? "…" : ""}</small>` : i.manual ? `<small>ajouté</small>` : "<small></small>"}
            <button class="x" data-act="shop-del" data-id="${i.id}"><ha-icon icon="mdi:close"></ha-icon></button></div>`).join("")}</div>`).join("")}`
      : `<div class="empty">La liste est vide. Choisissez une semaine et touchez <b>Générer</b> : les ingrédients des repas prévus sont additionnés et rangés par rayon.</div>`}`;
  }

  _shopText(withChecked = false) {
    const s = this._s, sh = s.shopping || {}, items = (sh.items || []).filter((i) => withChecked || !i.checked);
    const head = sh.range ? `Liste de courses — semaine du ${fdate(new Date(sh.range.start + "T00:00"), { day: "numeric", month: "long" })}` : "Liste de courses";
    const parts = s.aisles.map(([k, l]) => [l, items.filter((i) => (i.aisle || "autre") === k)]).filter((g) => g[1].length)
      .map(([l, its]) => `${l.toUpperCase()}\n${its.sort((a, b) => a.name.localeCompare(b.name, "fr")).map((i) => `- ${i.name}${i.display ? ` : ${i.display}` : ""}`).join("\n")}`);
    return `${head}\n\n${parts.join("\n\n") || "(liste vide)"}\n\n— HOLM My Menu`;
  }
  _shareModal() {
    const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (_) { return d; } };
    const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
    const selC = new Set(load("holm-mymenu-to", [])), selE = new Set(load("holm-mymenu-devices", []));
    let info = null;
    this._ws("mail/info").then((x) => { info = x; draw(); }).catch(() => {});
    const devices = () => Object.keys(this._hass.states).filter((e) => e.startsWith("notify.") && ((this._hass.entities || {})[e] || {}).platform !== "smtp")
      .map((e) => [e, this._hass.states[e].attributes.friendly_name || e]).sort((a, b) => a[1].localeCompare(b[1], "fr"));
    let draw = () => {
      const contacts = (this._s.contacts || []).slice().sort((a, b) => a.name.localeCompare(b.name, "fr"));
      const text = this._shopText();
      const picked = contacts.filter((c) => selC.has(c.id));
      const mailto = `mailto:${encodeURIComponent(picked.map((c) => c.email).join(","))}?subject=${encodeURIComponent(text.split("\n")[0])}&body=${encodeURIComponent(text)}`;
      const devs = devices();
      const mb = this._modal("Envoyer la liste de courses", `
        <div class="sh">Par e-mail</div>
        ${contacts.length ? `<div class="clist">${contacts.map((c) => `<label class="ct ${selC.has(c.id) ? "on" : ""}"><input type="checkbox" data-c="${c.id}" ${selC.has(c.id) ? "checked" : ""}>
            <span class="av">${esc(c.name.slice(0, 1).toUpperCase())}</span><span class="cn"><b>${esc(c.name)}</b><small>${esc(c.email)}</small></span>
            <button class="ib" data-del="${c.id}" title="Retirer du carnet"><ha-icon icon="mdi:close"></ha-icon></button></label>`).join("")}</div>`
          : `<div class="muted">Votre carnet d'adresses est vide : ajoutez les personnes à qui envoyer la liste.</div>`}
        <div class="row addc"><input class="f cnm" placeholder="Nom (Oliv, Ln…)"><input class="f grow cem" type="email" placeholder="adresse e-mail"><button class="pill" data-x="addc"><ha-icon icon="mdi:account-plus"></ha-icon>Ajouter</button></div>
        ${info && !info.smtp ? `<div class="warn">Aucune intégration SMTP n'est configurée dans Home Assistant : utilisez « Ouvrir ma messagerie », ou ajoutez l'intégration SMTP pour envoyer directement.</div>` : info ? `<div class="muted small2">Envoyé par ${esc(info.sender)} (intégration ${esc(info.name)}), en un seul message à toutes les adresses cochées.</div>` : ""}
        ${devs.length ? `<div class="sh">Sur un téléphone ou une tablette (notification)</div>
          <div class="dlist">${devs.map(([e, n]) => `<label class="chip ${selE.has(e) ? "on" : ""}"><input type="checkbox" data-e="${e}" ${selE.has(e) ? "checked" : ""}>${esc(n)}</label>`).join("")}</div>` : ""}
        <div class="row end sendrow"><a class="pill" href="${mailto}"><ha-icon icon="mdi:email-edit-outline"></ha-icon>Ouvrir ma messagerie</a>
          <button class="pill main" data-x="send" ${selC.size || selE.size ? "" : "disabled"}><ha-icon icon="mdi:send"></ha-icon>Envoyer${selC.size + selE.size ? ` (${selC.size + selE.size})` : ""}</button></div>
        <details class="adv"><summary>Aperçu de la liste</summary><pre class="prev">${esc(text)}</pre></details>`, { wide: true });
      mb.querySelectorAll("input").forEach((x) => { x.addEventListener("keydown", (e) => e.stopPropagation()); x.addEventListener("keyup", (e) => e.stopPropagation()); });
      mb.querySelectorAll("[data-c]").forEach((x) => x.addEventListener("change", () => { x.checked ? selC.add(x.dataset.c) : selC.delete(x.dataset.c); save("holm-mymenu-to", [...selC]); draw(); }));
      mb.querySelectorAll("[data-e]").forEach((x) => x.addEventListener("change", () => { x.checked ? selE.add(x.dataset.e) : selE.delete(x.dataset.e); save("holm-mymenu-devices", [...selE]); draw(); }));
      mb.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async (e) => {
        e.preventDefault(); e.stopPropagation();
        const c = contacts.find((x) => x.id === b.dataset.del);
        if (!confirm(`Retirer ${c.name} du carnet d'adresses ?`)) return;
        selC.delete(c.id); save("holm-mymenu-to", [...selC]);
        await this._do(this._ws("contact/delete", { contact_id: c.id }));
      }));
      const add = async () => {
        const nm = mb.querySelector(".cnm").value.trim(), em = mb.querySelector(".cem").value.trim();
        if (!em) return this._toast("Indiquez une adresse e-mail");
        const c = await this._do(this._ws("contact/save", { name: nm, email: em }), `${nm || em} ajouté au carnet`);
        selC.add(c.id); save("holm-mymenu-to", [...selC]);
      };
      mb.querySelector('[data-x="addc"]').addEventListener("click", add);
      mb.querySelector(".cem").addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
      mb.querySelector('[data-x="send"]').addEventListener("click", async (e) => {
        const btn = e.currentTarget; btn.disabled = true; btn.lastChild.textContent = "Envoi…";
        try {
          const out = await this._ws("shopping/send", { contacts: [...selC], entities: [...selE] });
          const n = out.emails.length, d = out.entities.length;
          this._toast(`Liste envoyée${n ? ` à ${n} adresse${n > 1 ? "s" : ""}` : ""}${n && d ? " et" : ""}${d ? ` à ${d} appareil${d > 1 ? "s" : ""}` : ""}`);
          this._close();
        } catch (err) { this._toast(`Envoi impossible : ${(err && err.message) || err}`); draw(); }
      });
    };
    const refresh = () => { const a = this.shadowRoot.activeElement; if (!a || !a.matches("input.cnm, input.cem")) draw(); };
    const _draw = draw;
    draw = () => { _draw(); this._refresher = refresh; };
    draw();
  }

  // ---------------- fenêtres ----------------
  _modal(title, html, opts = {}) {
    let root = this.shadowRoot.querySelector(".modal-root");
    if (!root) { root = document.createElement("div"); root.className = "modal-root"; this.shadowRoot.appendChild(root); }
    root.innerHTML = `<div class="ov"><div class="mdl ${opts.wide ? "wide" : ""}"><div class="mh">${opts.back ? `<button class="ib mback"><ha-icon icon="mdi:arrow-left"></ha-icon></button>` : ""}<div class="mt">${title}</div><button class="ib mclose"><ha-icon icon="mdi:close"></ha-icon></button></div><div class="mb">${html}</div></div></div>`;
    root.querySelector(".ov").addEventListener("click", (e) => { if (e.target.classList.contains("ov")) this._close(); });
    root.querySelector(".mclose").addEventListener("click", () => this._close());
    if (opts.back) root.querySelector(".mback").addEventListener("click", opts.back);
    this._refresher = opts.refresh || null;
    return root.querySelector(".mb");
  }
  _close() { const r = this.shadowRoot.querySelector(".modal-root"); if (r) r.remove(); this._refresher = null; }
  _refreshModal() { if (this._refresher) this._refresher(); }

  // ----- créneau -----
  _slotModal(day, slot) {
    let picked = false;
    const same = (a, b) => a.type === b.type && ((a.type === "recipe" && a.recipe_id === b.recipe_id) || (a.type === "ingredient" && a.ingredient_id === b.ingredient_id) || (a.type === "text" && norm(a.text) === norm(b.text)));
    const draw = () => {
      const s = this._s, entries = (s.plan[day] || {})[slot] || [];
      const dt = new Date(day + "T00:00");
      const mb = this._modal(`${SLOT_LBL[slot]} · ${fdate(dt, { weekday: "long", day: "numeric", month: "long" })}`, `
        ${entries.length ? [["recipe", "Recettes", "mdi:chef-hat"], ["ingredient", "Ingrédients", "mdi:food-apple-outline"], ["text", "Notes", "mdi:text"]].map(([t, lbl, ic]) => {
          const list = entries.map((e, i) => [e, i]).filter(([e]) => e.type === t);
          if (!list.length) return "";
          return `<div class="egrp"><div class="rh"><ha-icon icon="${ic}"></ha-icon>${lbl}<em>${list.length}</em></div><div class="ents">${list.map(([e, i]) => {
            if (t === "recipe") { const r = s.recipes[e.recipe_id] || {}; return `<div class="ent"><div class="ei op" data-open="${e.recipe_id}" ${r.image ? `style="background-image:url('${esc(r.image)}')"` : ""}></div>
                <div class="en"><b class="lnk2" data-open="${e.recipe_id}">${esc(r.name || "?")}</b><small>${r.total ? mins(r.total) + " · " : ""}<span class="stp"><button data-sv="${i}" data-d="-1">−</button>${e.servings} pers.<button data-sv="${i}" data-d="1">+</button></span></small></div>
                <button class="ib" data-rm="${i}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>`; }
            if (t === "ingredient") { const g = s.ingredients[e.ingredient_id] || {}; return `<div class="ent"><div class="ei sm op ${g.image ? "pic" : ""}" data-oping="${e.ingredient_id}" ${g.image ? `style="background-image:url('${esc(g.image)}')"` : ""}>${g.image ? "" : `<ha-icon icon="mdi:food-apple-outline"></ha-icon>`}</div>
                <div class="en"><b class="lnk2" data-oping="${e.ingredient_id}">${esc(g.name || "?")}</b><small>${esc([g.brand, g.quantity].filter(Boolean).join(" · ") || "ingrédient")}</small></div>
                <button class="ib" data-rm="${i}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>`; }
            return `<div class="ent"><div class="ei sm"><ha-icon icon="mdi:text"></ha-icon></div><div class="en"><b>${esc(e.text)}</b><small>note</small></div><button class="ib" data-rm="${i}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>`;
          }).join("")}</div></div>`;
        }).join("") : `<div class="muted">Rien de prévu pour ce repas.</div>`}
        ${entries.length ? `<div class="muted small2">Vous pouvez ajouter plusieurs recettes et plusieurs ingrédients à ce repas.</div>` : ""}
        <div class="addbox"><input class="pick" placeholder="Ajouter : recette, ingrédient ou texte libre…" autofocus><div class="res"></div></div>
        ${entries.length ? `<div class="row"><span class="muted">Déplacer vers</span><select class="mv"><option value="">—</option>${this._weekOptions(day, slot)}</select><label class="muted"><input type="checkbox" class="cp"> copier</label></div>` : ""}`,
        { refresh: () => {
          const root = this.shadowRoot.querySelector(".modal-root"), res = root && root.querySelector(".res"), old = root && root.querySelector(".pick");
          if (res && res.querySelector(".mgrid") && !picked) return; // résultats Marmiton affichés : on ne les efface pas
          picked = false;
          const v = old ? old.value : "", focus = old && this.shadowRoot.activeElement === old;
          draw();
          const n = this.shadowRoot.querySelector(".modal-root .pick");
          if (n && v) { n.value = v; n.dispatchEvent(new Event("input")); }
          if (n && focus) n.focus();
        } });
      const save = (ents) => this._do(this._ws("plan/set", { day, slot, entries: ents }));
      mb.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => { const n = entries.slice(); n.splice(+b.dataset.rm, 1); save(n); }));
      mb.querySelectorAll("[data-sv]").forEach((b) => b.addEventListener("click", () => { const n = entries.map((x) => ({ ...x })); const x = n[+b.dataset.sv]; x.servings = Math.max(1, (x.servings || 1) + +b.dataset.d); save(n); }));
      mb.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => this._recipeModal(b.dataset.open, () => this._slotModal(day, slot))));
      mb.querySelectorAll("[data-oping]").forEach((b) => b.addEventListener("click", () => this._ingModal(b.dataset.oping, false, () => this._slotModal(day, slot))));
      const mv = mb.querySelector(".mv");
      if (mv) mv.addEventListener("change", () => { if (!mv.value) return; const [dd, ss] = mv.value.split("|"); this._do(this._ws("plan/move", { src_day: day, src_slot: slot, dst_day: dd, dst_slot: ss, copy: mb.querySelector(".cp").checked })); this._close(); });
      this._picker(mb.querySelector(".pick"), mb.querySelector(".res"), (entry) => {
        const cur = ((this._s.plan[day] || {})[slot] || []);
        if (cur.some((x) => same(x, entry))) return this._toast("Déjà dans ce repas");
        picked = true;
        return this._do(this._ws("plan/add", { day, slot, entry }));
      });
    };
    draw();
  }
  _weekOptions(day, slot) {
    const w0 = monday(new Date(day + "T00:00")), out = [];
    for (let i = -7; i < 14; i++) { const d = addDays(w0, i), k = iso(d); for (const sl of this._s.slots) if (!(k === day && sl === slot)) out.push(`<option value="${k}|${sl}">${fdate(d, { weekday: "short", day: "numeric", month: "short" })} · ${SLOT_LBL[sl]}</option>`); }
    return out.join("");
  }
  // champ de recherche commun : recettes locales, ingrédients, Marmiton, texte libre
  _picker(input, res, onPick) {
    const s = this._s;
    const draw = () => {
      const q = input.value.trim(), nq = norm(q);
      if (!q) { const favs = Object.values(s.recipes).filter((r) => r.favorite).slice(0, 8);
        res.innerHTML = favs.length ? `<div class="rh">Favoris</div>${favs.map((r) => this._resRecipe(r)).join("")}` : ""; bind(); return; }
      const recs = Object.values(s.recipes).filter((r) => norm(r.name).includes(nq)).slice(0, 8);
      const ings = Object.values(s.ingredients).filter((i) => norm(i.name).includes(nq)).slice(0, 5);
      res.innerHTML = `${recs.length ? `<div class="rh">Mes recettes</div>${recs.map((r) => this._resRecipe(r)).join("")}` : ""}
        ${ings.length ? `<div class="rh">Ingrédients</div>${ings.map((i) => `<div class="ri2" data-ing="${i.id}"><div class="ei sm" ${i.image ? `style="background-image:url('${esc(i.image)}')"` : ""}>${i.image ? "" : `<ha-icon icon="mdi:food-apple-outline"></ha-icon>`}</div><b>${esc(i.name)}</b></div>`).join("")}` : ""}
        <div class="rh">Autres choix</div>
        <div class="ri2" data-marmiton="1"><div class="ei sm mm"><ha-icon icon="mdi:magnify"></ha-icon></div><b>Chercher « ${esc(q)} » sur Marmiton</b></div>
        ${ings.some((i) => norm(i.name) === nq) ? "" : `<div class="ri2" data-newing="1"><div class="ei sm"><ha-icon icon="mdi:food-apple-outline"></ha-icon></div><b>Ajouter « ${esc(q)} » comme ingrédient</b></div>`}
        <div class="ri2" data-text="1"><div class="ei sm"><ha-icon icon="mdi:text"></ha-icon></div><b>Ajouter « ${esc(q)} » comme note</b></div>
        <div class="offbox">${q.length >= 3 ? `<div class="rh">Open Food Facts</div><div class="muted pad">Recherche…</div>` : ""}</div>`;
      bind();
      clearTimeout(offT);
      if (q.length >= 3) offT = setTimeout(() => offSearch(q), 450);
    };
    let offT, offSeq = 0;
    const cap = (v) => v.charAt(0).toUpperCase() + v.slice(1);
    const offSearch = async (q) => {
      const seq = ++offSeq;
      let out;
      try { out = await this._ws("ingredient/search", { query: q, off: true }); } catch (e) { out = { off: [], off_error: (e && e.message) || String(e) }; }
      const box = res.querySelector(".offbox");
      if (seq !== offSeq || input.value.trim() !== q || !box) return;
      box.innerHTML = `<div class="rh">Open Food Facts${out.off_error ? ` — ${esc(out.off_error)}` : ""}</div>
        ${out.off.length ? `<div class="offg">${out.off.slice(0, 8).map((p, i) => this._offTile(p, i)).join("")}</div>` : out.off_error ? "" : `<div class="muted pad">Aucun produit.</div>`}`;
      box.querySelectorAll("[data-off]").forEach((b) => b.addEventListener("click", async () => {
        const p = out.off[+b.dataset.off];
        b.classList.add("busy");
        const ing = await this._do(this._ws("ingredient/add", { name: cap(q), off: p }), `« ${cap(q)} » ajouté à vos ingrédients`);
        onPick({ type: "ingredient", ingredient_id: ing.id }); input.value = ""; draw();
      }));
    };
    const bind = () => {
      res.querySelectorAll("[data-rec]").forEach((b) => b.addEventListener("click", () => { onPick({ type: "recipe", recipe_id: b.dataset.rec }); input.value = ""; draw(); }));
      res.querySelectorAll("[data-ing]").forEach((b) => b.addEventListener("click", () => { onPick({ type: "ingredient", ingredient_id: b.dataset.ing }); input.value = ""; draw(); }));
      res.querySelector("[data-text]")?.addEventListener("click", () => { onPick({ type: "text", text: input.value.trim() }); input.value = ""; draw(); });
      res.querySelector("[data-newing]")?.addEventListener("click", async () => { const v = cap(input.value.trim()); const ing = await this._do(this._ws("ingredient/add", { name: v })); onPick({ type: "ingredient", ingredient_id: ing.id }); input.value = ""; draw(); });
      res.querySelector("[data-marmiton]")?.addEventListener("click", () => this._marmitonResults(input.value.trim(), res, (rid) => { onPick({ type: "recipe", recipe_id: rid }); input.value = ""; draw(); }));
    };
    input.addEventListener("focus", () => (this._typing = true));
    input.addEventListener("blur", () => setTimeout(() => (this._typing = false), 300));
    input.addEventListener("input", draw);
    input.addEventListener("keyup", (e) => e.stopPropagation());
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && input.value.trim()) { const first = res.querySelector("[data-rec],[data-ing]"); if (first) first.click(); else res.querySelector("[data-marmiton]")?.click(); } });
    draw();
  }
  _offTile(p, i) {
    return `<div class="off" data-off="${i}"><div class="oi" ${p.image ? `style="background-image:url('${esc(p.image)}')"` : ""}></div><div class="otn"><b>${esc(p.name)}</b><small>${esc([p.brand, p.quantity].filter(Boolean).join(" · "))}</small></div>${p.nutriscore ? `<span class="ns" style="background:${NUTRI[p.nutriscore] || "#888"}">${p.nutriscore.toUpperCase()}</span>` : ""}</div>`;
  }
  // choisir une photo (galerie / fichier) ou la prendre avec l'appareil, réduite à 1280 px en JPEG
  _pickImage(capture = false) {
    return new Promise((resolve) => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*";
      if (capture) inp.setAttribute("capture", "environment");
      inp.style.display = "none";
      inp.addEventListener("change", async () => {
        const f = inp.files && inp.files[0]; inp.remove();
        if (!f) return resolve(null);
        try { resolve(await this._shrink(f)); } catch (e) { this._toast("Photo illisible"); resolve(null); }
      });
      document.body.appendChild(inp); inp.click();
      setTimeout(() => inp.remove(), 120000);
    });
  }
  async _shrink(file, max = 1280) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.85);
    } finally { URL.revokeObjectURL(url); }
  }
  _photoBox(current) {
    return `<div class="photobox"><div class="pv" ${current ? `style="background-image:url('${esc(current)}')"` : ""}>${current ? "" : `<ha-icon icon="mdi:image-outline"></ha-icon>`}</div>
      <div class="pb"><button class="pill" data-ph="pick"><ha-icon icon="mdi:image-plus"></ha-icon>Choisir une photo</button>
        <button class="pill" data-ph="cam"><ha-icon icon="mdi:camera"></ha-icon>Prendre une photo</button></div></div>`;
  }
  _bindPhoto(root, onImage) {
    root.querySelectorAll("[data-ph]").forEach((b) => b.addEventListener("click", async () => {
      const data = await this._pickImage(b.dataset.ph === "cam");
      if (!data) return;
      const pv = root.querySelector(".photobox .pv"); if (pv) { pv.style.backgroundImage = `url('${data}')`; pv.innerHTML = ""; }
      onImage(data);
    }));
  }
  _resRecipe(r) {
    return `<div class="ri2" data-rec="${r.id}"><div class="ei sm" ${r.image ? `style="background-image:url('${esc(r.image)}')"` : ""}>${r.image ? "" : `<ha-icon icon="mdi:chef-hat"></ha-icon>`}</div><b>${esc(r.name)}</b><small>${mins(r.total)}</small></div>`;
  }
  async _marmitonResults(q, box, onDone) {
    box.innerHTML = `<div class="muted pad">Recherche sur Marmiton…</div>`;
    let res;
    try { res = await this._ws("recipe/marmiton_search", { query: q }); } catch (e) { box.innerHTML = `<div class="muted pad">${esc(e.message || e)}</div>`; return; }
    if (!res.length) { box.innerHTML = `<div class="muted pad">Aucune recette trouvée sur Marmiton.</div>`; return; }
    box.innerHTML = `<div class="rh">Marmiton · ${res.length} résultats</div><div class="mgrid">${res.map((r, i) => `<div class="mc" data-i="${i}"><div class="ri" style="background-image:url('${esc(r.image)}')">${r.recipe_id ? `<i class="have">déjà importée</i>` : ""}</div><div class="rn">${esc(r.name)}</div>${r.rating ? `<div class="rm"><span><ha-icon icon="mdi:star"></ha-icon>${fq(r.rating)}${r.reviews ? ` (${r.reviews})` : ""}</span></div>` : ""}</div>`).join("")}</div>`;
    box.querySelectorAll(".mc").forEach((el) => el.addEventListener("click", async () => {
      const r = res[+el.dataset.i];
      if (r.recipe_id) return onDone(r.recipe_id);
      el.classList.add("busy");
      try { const out = await this._ws("recipe/import", { url: r.url }); this._toast(`« ${out.recipe.name} » importée`); onDone(out.recipe.id); }
      catch (e) { el.classList.remove("busy"); this._toast(`Import impossible : ${e.message || e}`); }
    }));
  }

  // ----- recette -----
  async _recipeModal(id, back, opts = {}) {
    let r;
    try { r = await this._ws("recipe/get", { recipe_id: id }); } catch (e) { return this._toast("Recette introuvable"); }
    let sv = opts.servings || r.servings || 4;
    const ro = !!opts.readonly;
    const draw = () => {
      const f = sv / (r.servings || 1);
      const mb = this._modal(esc(r.name), `
        <div class="rhero" ${r.image ? `style="background-image:url('${esc(r.image)}')"` : ""}></div>
        <div class="rmeta">${r.prep ? `<span><ha-icon icon="mdi:knife"></ha-icon>Prépa ${mins(r.prep)}</span>` : ""}${r.cook ? `<span><ha-icon icon="mdi:stove"></ha-icon>Cuisson ${mins(r.cook)}</span>` : ""}${r.total ? `<span><ha-icon icon="mdi:clock-outline"></ha-icon>${mins(r.total)}</span>` : ""}${r.category ? `<span><ha-icon icon="mdi:tag-outline"></ha-icon>${esc(r.category)}</span>` : ""}${r.rating ? `<span><ha-icon icon="mdi:star"></ha-icon>${fq(r.rating)}</span>` : ""}</div>
        ${ro ? (r.source_url ? `<div class="row act"><a class="pill" href="${esc(r.source_url)}" target="_blank" rel="noopener"><ha-icon icon="mdi:open-in-new"></ha-icon>Voir la recette d'origine</a></div>` : "") : `<div class="row act"><button class="pill main" data-x="plan"><ha-icon icon="mdi:calendar-plus"></ha-icon>Planifier</button>
          <button class="pill" data-x="fav"><ha-icon icon="mdi:heart${r.favorite ? "" : "-outline"}"></ha-icon>${r.favorite ? "Favori" : "Ajouter aux favoris"}</button>
          <button class="pill" data-x="edit"><ha-icon icon="mdi:pencil"></ha-icon>Modifier</button>
          ${r.source_url ? `<a class="pill" href="${esc(r.source_url)}" target="_blank" rel="noopener"><ha-icon icon="mdi:open-in-new"></ha-icon>Source</a>` : ""}
          <button class="pill danger" data-x="del"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>`}
        <div class="cols"><div><div class="sh">Ingrédients <span class="stp"><button data-s="-1">−</button>${sv} pers.<button data-s="1">+</button></span></div>
            <ul class="ingl">${(r.ingredients || []).map((l) => `<li ${l.ingredient_id && this._s.ingredients[l.ingredient_id] ? `class="lk" data-ing="${l.ingredient_id}"` : ""}><b>${l.qty != null ? fq(l.qty * f) + (l.unit ? " " + esc(l.unit) : "") : esc(l.unit || "")}</b> ${esc(l.name)}${l.note ? ` <small>(${esc(l.note)})</small>` : ""}</li>`).join("")}</ul></div>
          <div><div class="sh">Préparation</div><ol class="steps">${(r.steps || []).map((s) => `<li>${esc(s)}</li>`).join("") || `<li class="muted">Aucune étape.</li>`}</ol></div></div>`,
        { wide: true, back });
      mb.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => { sv = Math.max(1, sv + +b.dataset.s); draw(); }));
      mb.querySelectorAll("li[data-ing]").forEach((li) => li.addEventListener("click", () => this._ingModal(li.dataset.ing, ro, () => this._recipeModal(id, back, { ...opts, servings: sv }))));
      if (ro) return;
      mb.querySelector('[data-x="fav"]').addEventListener("click", async () => { r = await this._ws("recipe/save", { recipe_id: r.id, recipe: { favorite: !r.favorite } }); draw(); });
      mb.querySelector('[data-x="edit"]').addEventListener("click", () => this._editRecipe(r));
      mb.querySelector('[data-x="del"]').addEventListener("click", async () => { if (!confirm(`Supprimer « ${r.name} » ?`)) return; await this._ws("recipe/delete", { recipe_id: r.id }); this._close(); });
      mb.querySelector('[data-x="plan"]').addEventListener("click", () => this._planRecipe(r, sv, () => draw()));
    };
    draw();
  }
  _planRecipe(r, sv, back) {
    const w0 = monday(new Date()), today = iso(new Date());
    const days = [...Array(14)].map((_, i) => addDays(w0, i)).filter((d) => iso(d) >= today);
    const mb = this._modal(`Planifier « ${esc(r.name)} »`, `<div class="muted">${sv} personnes · choisissez un repas</div>
      <div class="plgrid">${days.map((d) => { const k = iso(d); return `<div class="pld"><b>${fdate(d, { weekday: "short", day: "numeric", month: "short" })}</b>${this._s.slots.map((sl) => { const n = ((this._s.plan[k] || {})[sl] || []).length; return `<button class="pill ${n ? "busy" : ""}" data-k="${k}" data-sl="${sl}">${SLOT_LBL[sl]}${n ? " •" : ""}</button>`; }).join("")}</div>`; }).join("")}</div>`, { back });
    mb.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", async () => {
      await this._do(this._ws("plan/add", { day: b.dataset.k, slot: b.dataset.sl, entry: { type: "recipe", recipe_id: r.id, servings: sv } }), `Ajoutée au ${SLOT_LBL[b.dataset.sl].toLowerCase()} du ${fdate(new Date(b.dataset.k + "T00:00"), { weekday: "long", day: "numeric" })}`);
      back();
    }));
  }
  _editRecipe(r) {
    const isNew = !r || !r.id;
    r = r || { name: "", servings: this._s.servings, ingredients: [], steps: [] };
    const lines = (r.ingredients || []).map((l) => [l.qty != null ? fq(l.qty) : "", l.unit, l.name, l.note ? `(${l.note})` : ""].filter(Boolean).join(" ")).join("\n");
    const mb = this._modal(isNew ? "Nouvelle recette" : `Modifier « ${esc(r.name)} »`, `
      <label class="fl">Nom<input class="f" data-f="name" value="${esc(r.name)}"></label>
      <div class="row"><label class="fl">Personnes<input class="f" type="number" min="1" data-f="servings" value="${r.servings || 4}"></label>
        <label class="fl">Préparation (min)<input class="f" type="number" min="0" data-f="prep" value="${r.prep || ""}"></label>
        <label class="fl">Cuisson (min)<input class="f" type="number" min="0" data-f="cook" value="${r.cook || ""}"></label></div>
      <label class="fl">Catégorie<input class="f" data-f="category" value="${esc(r.category || "")}" placeholder="Plat principal, dessert…"></label>
      <div class="fl">Photo${this._photoBox(r.image)}</div>
      <details class="adv"><summary>Ou une adresse d'image sur Internet</summary><input class="f" data-f="image" value="${esc(r.image_remote || (String(r.image || "").startsWith("http") ? r.image : ""))}" placeholder="https://…"></details>
      <label class="fl">Ingrédients — un par ligne (ex. « 200 g de farine »)<textarea class="f" rows="8" data-f="lines">${esc(lines)}</textarea></label>
      <label class="fl">Étapes — une par ligne<textarea class="f" rows="8" data-f="steps">${esc((r.steps || []).join("\n"))}</textarea></label>
      <div class="row end"><button class="pill" data-x="cancel">Annuler</button><button class="pill main" data-x="save"><ha-icon icon="mdi:content-save"></ha-icon>Enregistrer</button></div>`,
      { wide: true, back: isNew ? () => this._addRecipeModal() : () => this._recipeModal(r.id) });
    let photo = null;
    this._bindPhoto(mb, (d) => { photo = d; });
    mb.querySelectorAll("input,textarea").forEach((x) => { x.addEventListener("keydown", (e) => e.stopPropagation()); x.addEventListener("keyup", (e) => e.stopPropagation()); });
    mb.querySelector('[data-x="cancel"]').addEventListener("click", () => (isNew ? this._close() : this._recipeModal(r.id)));
    mb.querySelector('[data-x="save"]').addEventListener("click", async () => {
      const v = (k) => mb.querySelector(`[data-f="${k}"]`).value.trim();
      if (!v("name")) return this._toast("Donnez un nom à la recette");
      const rec = { name: v("name"), servings: +v("servings") || 4, prep: +v("prep") || null, cook: +v("cook") || null, category: v("category"),
        lines: v("lines").split("\n").map((x) => x.trim()).filter(Boolean), steps: v("steps").split("\n").map((x) => x.trim()).filter(Boolean) };
      rec.total = (rec.prep || 0) + (rec.cook || 0) || null;
      const img = v("image"); if (!photo && img && img !== (r.image_remote || r.image || "")) rec.image = img;
      if (isNew) rec.source = "manual";
      const out = await this._do(this._ws("recipe/save", { recipe_id: isNew ? null : r.id, recipe: rec }), photo ? null : "Recette enregistrée");
      if (photo) await this._do(this._ws("image/upload", { kind: "recipe", item_id: out.id, data: photo }), "Recette et photo enregistrées");
      this._recipeModal(out.id);
    });
  }
  _addRecipeModal(mode = "marmiton") {
    const mb = this._modal("Ajouter une recette", `
      <div class="seg">${[["marmiton", "mdi:magnify", "Marmiton"], ["url", "mdi:link-variant", "Lien"], ["mealie", "mdi:chef-hat", "Mealie"], ["manual", "mdi:pencil", "À la main"]].map(([k, i, l]) => `<button class="${mode === k ? "on" : ""}" data-m="${k}"><ha-icon icon="${i}"></ha-icon>${l}</button>`).join("")}</div>
      <div class="pane"></div>`, { wide: true });
    mb.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => this._addRecipeModal(b.dataset.m)));
    const pane = mb.querySelector(".pane");
    if (mode === "marmiton") {
      pane.innerHTML = `<div class="row"><input class="f grow" placeholder="Ex. lasagnes, gratin dauphinois, tarte aux pommes…"><button class="pill main">Chercher</button></div><div class="res"></div>`;
      const inp = pane.querySelector("input"), go = () => inp.value.trim() && this._marmitonResults(inp.value.trim(), pane.querySelector(".res"), (rid) => this._recipeModal(rid));
      pane.querySelector("button").addEventListener("click", go); inp.addEventListener("keydown", (e) => e.key === "Enter" && go()); setTimeout(() => inp.focus(), 50);
    } else if (mode === "url") {
      pane.innerHTML = `<div class="muted">Collez l'adresse d'une recette : Marmiton, 750g, CuisineAZ, Journal des Femmes… (tout site qui décrit ses recettes au format standard).</div>
        <div class="row"><input class="f grow" placeholder="https://www.marmiton.org/recettes/…"><button class="pill main">Importer</button></div>`;
      const inp = pane.querySelector("input");
      const go = async () => { const u = inp.value.trim(); if (!/^https?:\/\//.test(u)) return this._toast("Adresse invalide");
        const b = pane.querySelector("button"); b.disabled = true; b.textContent = "Import…";
        try { const out = await this._ws("recipe/import", { url: u }); this._toast(out.existing ? "Cette recette est déjà dans votre base" : `« ${out.recipe.name} » importée`); this._recipeModal(out.recipe.id); }
        catch (e) { this._toast(`Import impossible : ${e.message || e}`); b.disabled = false; b.textContent = "Importer"; } };
      pane.querySelector("button").addEventListener("click", go); inp.addEventListener("keydown", (e) => e.key === "Enter" && go()); setTimeout(() => inp.focus(), 50);
    } else if (mode === "mealie") {
      pane.innerHTML = `<div class="muted pad">Lecture de vos recettes Mealie…</div>`;
      this._ws("mealie/list").then((list) => {
        const sel = new Set(list.filter((x) => !x.imported).map((x) => x.slug));
        const drawM = () => {
          pane.innerHTML = `<div class="row"><span class="muted">${list.length} recettes · ${list.filter((x) => x.imported).length} déjà importées</span><span class="grow"></span>
              <button class="lnk" data-all="1">Tout cocher</button><button class="lnk" data-all="0">Tout décocher</button></div>
            <div class="mlist">${list.map((x) => `<label class="ml ${x.imported ? "done" : ""}"><input type="checkbox" data-slug="${esc(x.slug)}" ${x.imported ? "disabled checked" : sel.has(x.slug) ? "checked" : ""}><b>${esc(x.name)}</b>${x.imported ? "<small>importée</small>" : ""}</label>`).join("")}</div>
            <div class="row end"><button class="pill main" data-go="1"><ha-icon icon="mdi:download"></ha-icon>Importer ${sel.size} recette${sel.size > 1 ? "s" : ""}</button></div>`;
          pane.querySelectorAll("[data-slug]").forEach((c) => c.addEventListener("change", () => { c.checked ? sel.add(c.dataset.slug) : sel.delete(c.dataset.slug); pane.querySelector("[data-go]").innerHTML = `<ha-icon icon="mdi:download"></ha-icon>Importer ${sel.size} recette${sel.size > 1 ? "s" : ""}`; }));
          pane.querySelectorAll("[data-all]").forEach((b) => b.addEventListener("click", () => { list.filter((x) => !x.imported).forEach((x) => (b.dataset.all === "1" ? sel.add(x.slug) : sel.delete(x.slug))); drawM(); }));
          pane.querySelector("[data-go]").addEventListener("click", async (e) => {
            if (!sel.size) return; const b = e.currentTarget; b.disabled = true; b.textContent = `Import de ${sel.size} recettes…`;
            try { const out = await this._ws("mealie/import", { slugs: [...sel] }); this._toast(`${out.imported} recette(s) importée(s) depuis Mealie${out.errors.length ? ` · ${out.errors.length} erreur(s)` : ""}`); this._close(); this._tab = "recipes"; this._render(); }
            catch (err) { this._toast(`Import Mealie : ${err.message || err}`); b.disabled = false; }
          });
        };
        drawM();
      }).catch((e) => { pane.innerHTML = `<div class="muted pad">${esc(e.message || e)}</div>`; });
    } else {
      this._editRecipe(null);
    }
  }

  // ----- ingrédients -----
  _addIngModal(q = "") {
    const cap = (v) => v.charAt(0).toUpperCase() + v.slice(1);
    const mb = this._modal("Ajouter un ingrédient", `<div class="row"><input class="f grow" placeholder="Ex. purée, Nutella… ou un code-barre" value="${esc(q)}"><button class="pill main">Chercher</button>
      <button class="pill" data-x="scan" title="Scanner un code-barre"><ha-icon icon="mdi:barcode-scan"></ha-icon>Scanner</button></div><div class="res"></div>`, { wide: true });
    const inp = mb.querySelector("input"), res = mb.querySelector(".res");
    inp.addEventListener("keyup", (e) => e.stopPropagation());
    mb.querySelector('[data-x="scan"]').addEventListener("click", async () => { const code = await this._scanBarcode(); if (code) this._barcodeResult(code); else if (code === "") this._addIngModal(inp.value.trim()); });
    const go = async () => {
      const v = inp.value.trim(); if (!v) return;
      if (/^\d{8,14}$/.test(v.replace(/\s/g, ""))) return this._barcodeResult(v.replace(/\s/g, ""));
      res.innerHTML = `<div class="muted pad">Recherche dans votre base et sur Open Food Facts…</div>`;
      let out;
      try { out = await this._ws("ingredient/search", { query: v, off: true }); } catch (e) { res.innerHTML = `<div class="muted pad">${esc(e.message || e)}</div>`; return; }
      res.innerHTML = `${out.local.length ? `<div class="rh">Déjà dans votre base</div>${out.local.map((i) => `<div class="ri2" data-open="${i.id}"><div class="ei sm" ${i.image ? `style="background-image:url('${esc(i.image)}')"` : ""}></div><b>${esc(i.name)}</b><small>${esc(i.brand || "")}</small></div>`).join("")}` : ""}
        <label class="fl">Nom dans votre base<input class="f nm" value="${esc(cap(v))}"></label>
        <div class="ri2" data-plain="1"><div class="ei sm"><ha-icon icon="mdi:plus"></ha-icon></div><b>Ajouter sans produit</b><small>vous pourrez associer un produit plus tard</small></div>
        <div class="rh">Ou choisir un produit Open Food Facts${out.off_error ? ` — ${esc(out.off_error)}` : ` · ${out.off.length} résultat${out.off.length > 1 ? "s" : ""}`}</div>
        <div class="offg">${out.off.map((p, i) => this._offTile(p, i)).join("")}</div>`;
      const nm = () => res.querySelector(".nm").value.trim() || cap(v);
      res.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => this._ingModal(b.dataset.open)));
      res.querySelector("[data-plain]").addEventListener("click", async () => { const ing = await this._do(this._ws("ingredient/add", { name: nm() }), `« ${nm()} » ajouté`); this._ingModal(ing.id); });
      res.querySelectorAll("[data-off]").forEach((b) => b.addEventListener("click", async () => {
        b.classList.add("busy");
        const ing = await this._do(this._ws("ingredient/add", { name: nm(), off: out.off[+b.dataset.off] }), `« ${nm()} » ajouté avec sa fiche produit`);
        this._ingModal(ing.id);
      }));
    };
    mb.querySelector("button.main").addEventListener("click", go); inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") go(); });
    setTimeout(() => inp.focus(), 50);
    if (q) go();
  }
  // ----- code-barre -----
  async _barcodeResult(code) {
    const mb = this._modal(`Code-barre ${esc(code)}`, `<div class="muted pad">Recherche du produit sur Open Food Facts…</div>`, { wide: true, back: () => this._addIngModal() });
    let out;
    try { out = await this._ws("ingredient/barcode", { code }); } catch (e) {
      mb.innerHTML = `<div class="muted pad">${esc(e.message || e)}</div><div class="row end"><button class="pill" data-x="again"><ha-icon icon="mdi:barcode-scan"></ha-icon>Scanner à nouveau</button></div>`;
      mb.querySelector('[data-x="again"]').addEventListener("click", async () => { const c = await this._scanBarcode(); if (c) this._barcodeResult(c); });
      return;
    }
    if (out.existing) { this._toast(`« ${out.existing.name} » est déjà dans vos ingrédients`); return this._ingModal(out.existing.id); }
    const p = out.product;
    mb.innerHTML = `<div class="ihead"><div class="oi big" ${p.image ? `style="background-image:url('${esc(p.image_full || p.image)}')"` : ""}></div>
        <div class="ihd"><b style="font-size:16px">${esc(p.name)}</b><div class="ibr">${esc([p.brand, p.quantity].filter(Boolean).join(" · "))}</div>
        ${p.nutriscore ? `<span class="ns lg" style="background:${NUTRI[p.nutriscore]}">Nutri-Score ${p.nutriscore.toUpperCase()}</span>` : ""}</div></div>
      <label class="fl">Nom dans votre base<input class="f nm" value="${esc(p.name)}"></label>
      <div class="row end"><button class="pill main" data-x="add"><ha-icon icon="mdi:plus"></ha-icon>Ajouter à mes ingrédients</button></div>`;
    const nm = mb.querySelector(".nm"); nm.addEventListener("keydown", (e) => e.stopPropagation()); nm.addEventListener("keyup", (e) => e.stopPropagation());
    mb.querySelector('[data-x="add"]').addEventListener("click", async (e) => {
      e.currentTarget.disabled = true;
      const name = nm.value.trim() || p.name;
      const ing = await this._do(this._ws("ingredient/add", { name, off: p }), `« ${name} » ajouté avec sa fiche produit`);
      this._ingModal(ing.id);
    });
  }
  // lecture d'un code-barre : caméra (BarcodeDetector, sinon ZXing), photo du code, ou saisie
  _scanBarcode() {
    return new Promise((resolve) => {
      let done = false, stream = null, timer = null, zx = null;
      const stop = () => { clearInterval(timer); if (stream) stream.getTracks().forEach((t) => t.stop()); try { zx && zx.stop(); } catch (_) {} };
      const finish = (code) => { if (done) return; done = true; stop(); resolve(code === "" ? "" : code || null); };
      const mb = this._modal("Scanner un code-barre", `
        <div class="scan"><video playsinline muted></video><div class="aim"></div><div class="scanmsg">Ouverture de la caméra…</div></div>
        <div class="row"><input class="f grow code" inputmode="numeric" placeholder="ou tapez le numéro sous le code-barre"><button class="pill main" data-x="ok">Valider</button></div>
        <div class="row"><button class="pill" data-x="photo"><ha-icon icon="mdi:camera"></ha-icon>Photographier le code</button></div>`, { back: () => { finish(""); } });
      const root = this.shadowRoot.querySelector(".modal-root");
      const obs = new MutationObserver(() => { if (!this.shadowRoot.contains(root) || !root.contains(mb)) { obs.disconnect(); finish(null); } });
      obs.observe(this.shadowRoot, { childList: true, subtree: true });
      const video = mb.querySelector("video"), msg = mb.querySelector(".scanmsg"), codeIn = mb.querySelector(".code");
      codeIn.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter" && codeIn.value.trim()) finish(codeIn.value.replace(/\D/g, "")); });
      codeIn.addEventListener("keyup", (e) => e.stopPropagation());
      mb.querySelector('[data-x="ok"]').addEventListener("click", () => codeIn.value.trim() && finish(codeIn.value.replace(/\D/g, "")));
      const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];
      const zxing = async () => (await import("https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm"));
      mb.querySelector('[data-x="photo"]').addEventListener("click", async () => {
        const data = await this._pickImage(true); if (!data) return;
        msg.textContent = "Lecture de la photo…";
        try {
          let code = null;
          if ("BarcodeDetector" in window) {
            const img = new Image(); img.src = data; await img.decode();
            const r = await new window.BarcodeDetector({ formats: FORMATS }).detect(img); code = r[0] && r[0].rawValue;
          } else {
            const Z = await zxing(); const r = await new Z.BrowserMultiFormatReader().decodeFromImageUrl(data); code = r && r.getText();
          }
          if (code) finish(code); else msg.textContent = "Aucun code-barre lu sur la photo. Réessayez de plus près.";
        } catch (e) { msg.textContent = "Aucun code-barre lu sur la photo. Réessayez de plus près."; }
      });
      (async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = "Caméra indisponible ici : photographiez le code ou tapez son numéro."; return; }
        try {
          if ("BarcodeDetector" in window) {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
            if (done) return stop();
            video.srcObject = stream; await video.play(); msg.textContent = "Visez le code-barre";
            const det = new window.BarcodeDetector({ formats: FORMATS });
            timer = setInterval(async () => { try { const r = await det.detect(video); if (r[0]) finish(r[0].rawValue); } catch (_) {} }, 250);
          } else {
            msg.textContent = "Chargement du lecteur…";
            const Z = await zxing(); if (done) return;
            zx = await new Z.BrowserMultiFormatReader().decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, video, (r) => { if (r) finish(r.getText()); });
            msg.textContent = "Visez le code-barre";
          }
        } catch (e) { msg.textContent = "Caméra refusée ou indisponible : photographiez le code ou tapez son numéro."; }
      })();
    });
  }
  _ingModal(id, ro = false, back = null) {
    const s = this._s, i = s.ingredients[id];
    if (!i) return this._close();
    const recs = Object.values(s.recipes).filter((r) => (r.ingredients || []).some((l) => l.ingredient_id === id));
    const n = i.nutrition || {};
    const NL = [["energy_kcal", "Énergie", "kcal"], ["fat", "Matières grasses", "g"], ["saturated_fat", "dont saturées", "g"], ["carbohydrates", "Glucides", "g"], ["sugars", "dont sucres", "g"], ["fiber", "Fibres", "g"], ["proteins", "Protéines", "g"], ["salt", "Sel", "g"]];
    const rows = NL.filter(([k]) => n[k] != null).map(([k, l, u]) => `<tr class="${l.startsWith("dont") ? "sub" : ""}"><td>${l}</td><td>${fq(k === "energy_kcal" ? Math.round(n[k]) : n[k])} ${u}</td></tr>`).join("");
    const ECO = { a: "#1e8f4e", b: "#60ac0e", c: "#e3a21a", d: "#e7642b", e: "#c62828" };
    const badges = [i.nutriscore ? `<span class="ns lg" style="background:${NUTRI[i.nutriscore]}">Nutri-Score ${i.nutriscore.toUpperCase()}</span>` : "",
      i.ecoscore ? `<span class="ns lg" style="background:${ECO[i.ecoscore]}">Éco-Score ${i.ecoscore.toUpperCase()}</span>` : "",
      i.nova ? `<span class="ns lg" style="background:${["", "#00aa00", "#ffcc00", "#ff6600", "#ff0000"][i.nova] || "#888"}">NOVA ${i.nova}</span>` : ""].join("");
    const mb = this._modal(esc(i.name), `
      <div class="ihead"><div class="oi big" ${i.image ? `style="background-image:url('${esc(i.image)}')"` : ""}>${i.image ? "" : `<ha-icon icon="mdi:food-apple-outline"></ha-icon>`}</div>
        <div class="ihd"><div class="ibr">${i.brand ? esc(i.brand) : '<span class="muted">Sans marque</span>'}${i.quantity ? ` · ${esc(i.quantity)}` : ""}</div>
          ${badges ? `<div class="badges">${badges}</div>` : ""}
          ${i.off_code ? `<a class="lnk" href="https://fr.openfoodfacts.org/produit/${esc(i.off_code)}" target="_blank" rel="noopener">Fiche Open Food Facts · ${esc(i.off_code)}</a>` : ""}</div></div>
      ${rows || i.ingredients_text || (i.allergens || []).length ? `<div class="offinfo">
        ${rows ? `<div><div class="sh">Pour 100 g</div><table class="nut">${rows}</table></div>` : ""}
        <div>${i.ingredients_text ? `<div class="sh">Composition</div><div class="small">${esc(i.ingredients_text)}</div>` : ""}
          ${(i.allergens || []).length ? `<div class="sh">Allergènes</div><div class="chips">${i.allergens.map((a) => `<span class="chip warn">${esc(a)}</span>`).join("")}</div>` : ""}
          ${(i.labels || []).length ? `<div class="sh">Labels</div><div class="chips">${i.labels.map((a) => `<span class="chip">${esc(a)}</span>`).join("")}</div>` : ""}</div></div>` : ""}
      ${ro ? (i.notes ? `<div class="sh">Notes</div><div class="small">${esc(i.notes)}</div>` : "") + (recs.length ? `<div class="sh">Dans les recettes</div><div class="chips">${recs.map((r) => `<button class="chip" data-r="${r.id}">${esc(r.name)}</button>`).join("")}</div>` : "") : `
      <div class="sh">Fiche</div>
      <div class="row"><label class="fl">Nom<input class="f" data-f="name" value="${esc(i.name)}"></label>
        <label class="fl">Rayon<select class="f" data-f="aisle">${s.aisles.map(([k, l]) => `<option value="${k}" ${k === (i.aisle || "autre") ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label></div>
      <div class="row"><label class="fl">Marque<input class="f" data-f="brand" value="${esc(i.brand || "")}"></label>
        <label class="fl">Conditionnement<input class="f" data-f="quantity" value="${esc(i.quantity || "")}" placeholder="500 g, 1 l…"></label>
        <label class="fl">Magasins<input class="f" data-f="stores" value="${esc(i.stores || "")}"></label></div>
      <div class="fl">Photo${this._photoBox(i.image)}</div>
      <label class="fl">Notes<input class="f" data-f="notes" value="${esc(i.notes || "")}" placeholder="Ex. prendre la version bio"></label>
      <div class="row end"><button class="pill" data-x="off"><ha-icon icon="mdi:barcode-scan"></ha-icon>${i.off_code ? "Changer de produit" : "Associer un produit Open Food Facts"}</button><button class="pill main" data-x="save">Enregistrer</button></div>
      <div class="sh">Utilisé dans ${recs.length} recette${recs.length > 1 ? "s" : ""}</div>
      <div class="chips">${recs.map((r) => `<button class="chip" data-r="${r.id}">${esc(r.name)}</button>`).join("") || '<span class="muted">Aucune.</span>'}</div>
      <div class="row end"><button class="pill danger" data-x="del"><ha-icon icon="mdi:delete-outline"></ha-icon>Supprimer l'ingrédient</button></div>`}`, { wide: true, back });
    mb.querySelectorAll("[data-r]").forEach((b) => b.addEventListener("click", () => this._recipeModal(b.dataset.r, () => this._ingModal(id, ro, back), { readonly: ro })));
    if (ro) return;
    mb.querySelectorAll("input").forEach((x) => { x.addEventListener("keydown", (e) => e.stopPropagation()); x.addEventListener("keyup", (e) => e.stopPropagation()); });
    this._bindPhoto(mb, (d) => this._do(this._ws("image/upload", { kind: "ingredient", item_id: id, data: d }), "Photo enregistrée"));
    mb.querySelector('[data-x="save"]').addEventListener("click", async () => {
      const ch = {};
      mb.querySelectorAll("[data-f]").forEach((f) => { ch[f.dataset.f] = f.value.trim(); });
      ch.name = ch.name || i.name;
      if (ch.aisle === (i.aisle || "autre")) delete ch.aisle;
      await this._do(this._ws("ingredient/update", { ingredient_id: id, changes: ch }), "Ingrédient enregistré");
      back ? back() : this._close();
    });
    mb.querySelector('[data-x="del"]').addEventListener("click", async () => { if (!confirm(`Supprimer « ${i.name} » ? Les recettes garderont le texte de l'ingrédient.`)) return; await this._ws("ingredient/delete", { ingredient_id: id }); this._close(); });
    mb.querySelector('[data-x="off"]').addEventListener("click", () => this._offLink(i));
  }
  _offLink(i) {
    const mb = this._modal(`Produit pour « ${esc(i.name)} »`, `<div class="row"><input class="f grow" value="${esc(i.name)}"><button class="pill main">Chercher</button></div><div class="res"></div>`, { wide: true, back: () => this._ingModal(i.id) });
    const inp = mb.querySelector("input"), res = mb.querySelector(".res");
    inp.addEventListener("keyup", (e) => e.stopPropagation());
    const go = async () => {
      const v = inp.value.trim(); if (!v) return;
      res.innerHTML = `<div class="muted pad">Recherche sur Open Food Facts…</div>`;
      let out;
      try { out = await this._ws("ingredient/search", { query: v, off: true }); } catch (e) { res.innerHTML = `<div class="muted pad">${esc(e.message || e)}</div>`; return; }
      res.innerHTML = out.off.length ? `<div class="offg">${out.off.map((p, k) => this._offTile(p, k)).join("")}</div>` : `<div class="muted pad">${esc(out.off_error || "Aucun produit trouvé.")}</div>`;
      res.querySelectorAll("[data-off]").forEach((b) => b.addEventListener("click", async () => {
        b.classList.add("busy");
        await this._do(this._ws("ingredient/update", { ingredient_id: i.id, changes: {}, off: out.off[+b.dataset.off] }), "Produit associé");
        this._ingModal(i.id);
      }));
    };
    mb.querySelector("button.main").addEventListener("click", go); inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") go(); });
    go();
  }

  getCardSize() { return this._c && this._c.view === "today" ? 3 : this._c && this._c.view === "week" ? 8 : 10; }
  getGridOptions() { return this._c && this._c.view === "today" ? { columns: 6, rows: "auto", min_columns: 4 } : { columns: 12, rows: "auto", min_columns: 6 }; }
  static getStubConfig() { return { title: "Menus" }; }
  static getConfigElement() { return document.createElement("holm-mymenu-card-editor"); }
}

const CSS = `
:host { display:block; --ac:#0abfbf; --ac2:#e3a21a; --sf:color-mix(in srgb, var(--primary-text-color) 6%, transparent); --bd:color-mix(in srgb, var(--primary-text-color) 10%, transparent); }
ha-card { padding:14px; box-sizing:border-box; container-type:inline-size; overflow:hidden; }
ha-card.noframe { background:none !important; box-shadow:none !important; border:none !important; backdrop-filter:none !important; }
button { font:inherit; color:inherit; cursor:pointer; }
.hd { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px; }
.tt { display:flex; align-items:center; gap:8px; font-size:17px; font-weight:700; margin-right:auto; color:var(--primary-text-color); }
.tt ha-icon { color:var(--ac); }
.tabs { display:flex; gap:3px; padding:3px; border-radius:14px; background:var(--sf); }
.tab { display:flex; align-items:center; gap:6px; border:0; background:none; padding:7px 12px; border-radius:11px; font-size:13px; font-weight:600; color:var(--secondary-text-color); position:relative; }
.tab ha-icon { --mdc-icon-size:18px; }
.tab.on { background:color-mix(in srgb, var(--ac) 22%, transparent); color:var(--primary-text-color); }
.tab em { font-style:normal; font-size:10.5px; min-width:16px; height:16px; line-height:16px; border-radius:8px; background:var(--ac2); color:#111; padding:0 4px; }
@container (max-width: 560px) { .tab span { display:none; } .tab { padding:8px 11px; } }
.bar { display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
.wk { font-weight:600; font-size:14px; flex:1; text-align:center; min-width:140px; }
.ib { width:34px; height:34px; border-radius:10px; border:0; background:var(--sf); display:grid; place-items:center; flex:none; }
.ib.on { color:#e05a8a; }
.ib ha-icon { --mdc-icon-size:20px; }
.pill { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--bd); background:var(--sf); padding:7px 12px; border-radius:11px; font-size:13px; font-weight:600; text-decoration:none; color:var(--primary-text-color); white-space:nowrap; }
.pill ha-icon { --mdc-icon-size:17px; }
.pill.main { background:var(--ac); border-color:var(--ac); color:#0b1416; }
.pill.danger { color:var(--error-color, #e05252); }
.pill.busy { opacity:.65; }
.pill:disabled { opacity:.5; cursor:default; }
.lnk { border:0; background:none; color:var(--ac); font-weight:600; font-size:12.5px; padding:2px 4px; text-decoration:none; }
input.search, .f { flex:1; min-width:0; box-sizing:border-box; padding:9px 12px; border-radius:11px; border:1px solid var(--bd); background:var(--card-background-color, transparent); color:var(--primary-text-color); font:inherit; font-size:14px; }
.shop-add { flex:1; padding:9px 12px; border-radius:11px; border:1px dashed var(--bd); background:none; color:var(--primary-text-color); font:inherit; }
.empty, .muted { color:var(--secondary-text-color); font-size:13px; }
.empty { padding:24px 8px; text-align:center; line-height:1.6; }
.pad { padding:14px 4px; }
.hint { margin-top:8px; font-size:11.5px; color:var(--secondary-text-color); text-align:center; opacity:.8; }
/* semaine */
.week { display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); gap:8px; }
@container (max-width: 860px) { .week { grid-template-columns:1fr; } .day { display:grid; grid-template-columns:52px 1fr 1fr; align-items:stretch; gap:6px; } }
.day { display:flex; flex-direction:column; gap:6px; padding:6px; border-radius:16px; background:var(--sf); }
.day.today { box-shadow:inset 0 0 0 1.5px var(--ac); }
.day.past { opacity:.6; }
.dn { display:flex; align-items:baseline; gap:6px; padding:2px 4px; text-transform:capitalize; }
@container (max-width: 860px) { .dn { flex-direction:column; align-items:center; justify-content:center; gap:0; } }
.dn b { font-size:13px; } .dn span { font-size:12px; color:var(--secondary-text-color); }
.day.today .dn span { color:var(--ac); font-weight:700; }
.slot { position:relative; min-height:78px; border-radius:12px; padding:6px 8px; cursor:pointer; display:flex; flex-direction:column; gap:3px; overflow:hidden;
  background:color-mix(in srgb, var(--primary-text-color) 4%, transparent); border:1px dashed var(--bd); transition:transform .15s, box-shadow .15s; }
.slot.full { border-style:solid; }
.slot { padding:0 !important; gap:0 !important; }
.shero { position:relative; flex:1; min-height:70px; padding:6px 8px; display:flex; flex-direction:column; gap:3px; }
.shero.img { background-image:linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.72)), var(--img); background-size:cover; background-position:center; color:#fff; }
.shero.mini { flex:none; min-height:0; } .shero.mini + .sxi { flex:1; border-top:none; background:none; } .thero.mini + .tings { flex:1; border-top:none; }
.slot .sxi { display:flex; flex-direction:column; gap:3px; padding:5px 6px 6px; margin:0; background:color-mix(in srgb, var(--primary-text-color) 5%, transparent); border-top:1px solid var(--bd); }
.slot .sxi span { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:600; padding:0; background:none; border-radius:0; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.slot .sxi em { width:18px; height:18px; flex:none; border-radius:5px; background:#fff center/contain no-repeat; } .slot .sxi ha-icon { --mdc-icon-size:15px; flex:none; color:var(--ac); }
.slot:hover { transform:translateY(-1px); box-shadow:0 6px 16px rgba(0,0,0,.25); }
.slot.over { box-shadow:0 0 0 2px var(--ac2); }
.slot.dragging { opacity:.4; }
.sl { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; opacity:.75; }
.sx { display:flex; flex-direction:column; gap:2px; margin-top:auto; }
.sx b { font-size:12.5px; line-height:1.25; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.sx i { font-size:11.5px; opacity:.85; } .sxi { display:flex; flex-wrap:wrap; gap:3px; margin-top:2px; } .sxi span { font-size:10.5px; font-weight:600; padding:1px 6px; border-radius:999px; background:color-mix(in srgb, var(--ac) 28%, rgba(0,0,0,.2)); }
.sx.add { align-items:center; justify-content:center; flex:1; color:var(--secondary-text-color); }
.todayv { display:grid; grid-template-columns:1fr 1fr; gap:10px; } .todayv.n1 { grid-template-columns:1fr; } @container (max-width:360px) { .todayv { grid-template-columns:1fr; } }
.tslot { position:relative; border-radius:16px; display:flex; flex-direction:column; overflow:hidden; background:var(--sf); }
.thero { position:relative; flex:1; min-height:130px; padding:10px 12px; display:flex; flex-direction:column; justify-content:flex-end; gap:6px; box-sizing:border-box; }
.thero.img { background-image:linear-gradient(180deg, rgba(0,0,0,.05) 20%, rgba(0,0,0,.78)), var(--img); background-size:cover; background-position:center; color:#fff; }
.thero.mini { flex:none; min-height:38px; }
.tslot .sl { position:absolute; top:9px; left:10px; font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; padding:3px 8px; border-radius:999px; background:color-mix(in srgb, var(--ac) 85%, transparent); color:#fff; }
.tents { display:flex; flex-direction:column; gap:4px; } .te { all:unset; cursor:pointer; display:flex; flex-direction:column; border-radius:10px; padding:4px 6px; margin:0 -6px; } .te.txt { cursor:default; }
.te:not(.txt):hover { background:rgba(255,255,255,.12); } .te b { font-size:15px; font-weight:700; line-height:1.25; } .te small { font-size:12px; opacity:.85; }
.tslot.sm { border-radius:13px; } .tslot.sm .thero { min-height:92px; padding:8px 10px; } .tslot.sm .thero.mini { min-height:32px; } .tslot.sm .sl { top:7px; left:8px; font-size:10px; padding:2px 7px; } .tslot.sm .te b { font-size:13.5px; }
.tings { display:flex; flex-wrap:wrap; gap:6px; padding:8px 10px; border-top:1px solid var(--bd); }
.tchip { all:unset; cursor:pointer; display:inline-flex; align-items:center; gap:7px; font-size:12.5px; font-weight:600; padding:3px 10px 3px 3px; border-radius:999px; background:color-mix(in srgb, var(--ac) 14%, transparent); color:var(--primary-text-color); max-width:100%; box-sizing:border-box; }
.tchip:hover { background:color-mix(in srgb, var(--ac) 32%, transparent); } .tn { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ti { width:26px; height:26px; border-radius:50%; background:#fff center/contain no-repeat; flex:none; box-shadow:0 0 0 1px var(--bd); } .ti.no { background:color-mix(in srgb, var(--ac) 20%, transparent); display:grid; place-items:center; color:var(--ac); } .ti ha-icon { --mdc-icon-size:15px; }
.tslot.sm .ti { width:22px; height:22px; } .tslot.sm .tings { padding:6px 8px; gap:5px; }
.te.txt i { font-size:13px; opacity:.9; }
.weekro { display:flex; flex-direction:column; gap:8px; }
.rday { display:grid; grid-template-columns:74px 1fr; gap:10px; align-items:stretch; } .rday.past { opacity:.55; }
.rdn { display:flex; flex-direction:column; justify-content:center; align-items:flex-start; padding:6px 8px; border-radius:12px; background:var(--sf); } .rdn b { font-size:12px; text-transform:capitalize; color:var(--secondary-text-color); } .rdn span { font-size:22px; font-weight:800; line-height:1.1; }
.rday.today .rdn { background:color-mix(in srgb, var(--ac) 22%, transparent); } .rday.today .rdn b { color:var(--ac); }
.rsl { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px; }
@container (max-width:420px) { .rday { grid-template-columns:1fr; gap:4px; } .rdn { flex-direction:row; gap:8px; align-items:baseline; padding:2px 4px; background:none; } .rdn span { font-size:15px; } }
.tempty { font-size:13px; color:var(--secondary-text-color); padding-bottom:4px; }
.lst { overflow-y:auto; overscroll-behavior:contain; margin-right:-6px; padding-right:6px; scrollbar-width:thin; }
.more { display:block; width:100%; margin:10px 0 2px; padding:9px; border-radius:12px; border:1px dashed var(--bd); background:none; color:var(--secondary-text-color); font-size:13px; } .more:hover { color:var(--primary-text-color); border-color:var(--ac); }
/* recettes */
.rgrid, .mgrid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:10px; }
.rc, .mc { border-radius:14px; background:var(--sf); overflow:hidden; cursor:pointer; transition:transform .15s; display:flex; flex-direction:column; }
.rc:hover, .mc:hover { transform:translateY(-2px); }
.mc.busy { opacity:.5; pointer-events:none; }
.ri { aspect-ratio:4/3; background:color-mix(in srgb, var(--ac) 12%, transparent) center/cover; display:grid; place-items:center; color:var(--ac); position:relative; }
.ri ha-icon { --mdc-icon-size:34px; opacity:.6; }
.fav { position:absolute; top:6px; right:6px; color:#e05a8a; } .fav ha-icon { --mdc-icon-size:18px; opacity:1; }
.have { position:absolute; left:6px; top:6px; font-style:normal; font-size:10.5px; background:var(--ac); color:#0b1416; padding:2px 6px; border-radius:6px; font-weight:700; }
.rn { font-size:13px; font-weight:600; padding:7px 9px 2px; line-height:1.25; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.rm { display:flex; gap:8px; padding:2px 9px 8px; font-size:11.5px; color:var(--secondary-text-color); flex-wrap:wrap; }
.rm span { display:flex; align-items:center; gap:3px; } .rm ha-icon { --mdc-icon-size:13px; }
/* ingrédients */
.grp { margin-bottom:12px; }
.gh { font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--secondary-text-color); margin:4px 2px 6px; display:flex; gap:6px; }
.gh em { font-style:normal; opacity:.7; }
.igrid { display:grid; grid-template-columns:repeat(auto-fill, minmax(210px, 1fr)); gap:6px; }
.ic { display:flex; align-items:center; gap:9px; padding:6px 8px; border-radius:12px; background:var(--sf); cursor:pointer; }
.ii, .oi { width:36px; height:36px; border-radius:10px; flex:none; background:#fff center/contain no-repeat; display:grid; place-items:center; font-weight:700; color:#0b1416; }
.ii:not([style]) { background:color-mix(in srgb, var(--ac) 22%, transparent); color:var(--primary-text-color); }
.oi.big { width:110px; height:110px; border-radius:16px; } .oi:not([style]) { background:var(--sf); color:var(--secondary-text-color); }
.ihd { display:flex; flex-direction:column; gap:6px; align-items:flex-start; min-width:0; } .ibr { font-size:14px; font-weight:600; }
.badges { display:flex; gap:5px; flex-wrap:wrap; } .mdl { container-type:inline-size; } .ns.lg { font-size:11.5px; padding:3px 8px; }
.offinfo { display:grid; grid-template-columns:minmax(180px, 240px) 1fr; gap:14px; margin-top:10px; } @container (max-width:520px) { .offinfo { grid-template-columns:1fr; } }
table.nut { width:100%; border-collapse:collapse; font-size:12.5px; } table.nut td { padding:4px 6px; border-bottom:1px solid var(--bd); } table.nut td:last-child { text-align:right; font-weight:600; white-space:nowrap; } table.nut tr.sub td:first-child { padding-left:16px; color:var(--secondary-text-color); }
.small { font-size:12.5px; line-height:1.45; color:var(--secondary-text-color); max-height:110px; overflow:auto; }
.chip.warn { border-color:color-mix(in srgb, #e3a21a 55%, transparent); background:color-mix(in srgb, #e3a21a 14%, transparent); }
pre.prev { white-space:pre-wrap; font:12.5px/1.45 var(--code-font-family, monospace); background:var(--sf); border-radius:12px; padding:10px 12px; max-height:220px; overflow:auto; margin:0; }
a.pill { text-decoration:none; display:inline-flex; align-items:center; gap:6px; }
.shopact { margin:-4px 0 12px; }
.scan { position:relative; border-radius:16px; overflow:hidden; background:#000; aspect-ratio:4/3; margin-bottom:10px; }
.scan video { width:100%; height:100%; object-fit:cover; display:block; }
.scan .aim { position:absolute; left:12%; right:12%; top:35%; bottom:35%; border:2px solid rgba(255,255,255,.85); border-radius:12px; box-shadow:0 0 0 999px rgba(0,0,0,.35); }
.scanmsg { position:absolute; left:0; right:0; bottom:10px; text-align:center; color:#fff; font-size:13px; text-shadow:0 1px 3px #000; padding:0 12px; }
.photobox { display:flex; align-items:center; gap:12px; margin-top:4px; } .photobox .pv { width:86px; height:64px; border-radius:12px; flex:none; background:var(--sf) center/cover no-repeat; display:grid; place-items:center; color:var(--secondary-text-color); }
.photobox .pb { display:flex; flex-wrap:wrap; gap:6px; } details.adv summary { cursor:pointer; font-size:12px; color:var(--secondary-text-color); margin:4px 0; } details.adv .f { width:100%; }
.clist { display:flex; flex-direction:column; gap:5px; } .ct { display:flex; align-items:center; gap:10px; padding:6px 8px; border-radius:12px; background:var(--sf); cursor:pointer; }
.ct.on { box-shadow:inset 0 0 0 1.5px var(--ac); } .ct input, .dlist input { accent-color:var(--ac); width:17px; height:17px; margin:0; }
.av { width:30px; height:30px; border-radius:50%; display:grid; place-items:center; font-weight:800; background:color-mix(in srgb, var(--ac) 28%, transparent); flex:none; }
.cn { flex:1; min-width:0; display:flex; flex-direction:column; } .cn small { color:var(--secondary-text-color); font-size:12px; overflow:hidden; text-overflow:ellipsis; }
.addc { margin-top:8px; } .addc .cnm { flex:0 1 150px; } .dlist { display:flex; flex-wrap:wrap; gap:6px; } .dlist .chip { display:inline-flex; align-items:center; gap:6px; cursor:pointer; } .dlist .chip.on { border-color:var(--ac); }
.warn { margin-top:8px; padding:8px 10px; border-radius:10px; font-size:12.5px; background:color-mix(in srgb, #e3a21a 16%, transparent); } .sendrow { margin-top:14px; } .pill[disabled] { opacity:.5; pointer-events:none; }
.stiles { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px; margin-bottom:12px; }
.stile { display:flex; flex-direction:column; gap:2px; padding:12px; border-radius:14px; background:var(--sf); } .stile ha-icon { color:var(--ac); --mdc-icon-size:20px; margin-bottom:4px; }
.stile b { font-size:24px; font-weight:800; line-height:1.1; } .stile span { font-size:13px; color:var(--primary-text-color); } .stile small { font-size:11.5px; color:var(--secondary-text-color); }
.scols { display:grid; grid-template-columns:1fr 1fr; gap:12px; } @container (max-width:640px) { .scols { grid-template-columns:1fr; } }
.sbox { padding:4px 2px; min-width:0; } .toplist { display:flex; flex-direction:column; gap:4px; }
.tr { display:flex; align-items:center; gap:9px; padding:5px 6px; border-radius:10px; cursor:pointer; } .tr:hover { background:var(--sf); }
.tr .rk { width:18px; text-align:right; font-size:12px; font-weight:700; color:var(--secondary-text-color); flex:none; } .tr .ti { width:34px; height:34px; border-radius:9px; background-color:var(--sf); }
.toplist.sm .tr .ti { width:26px; height:26px; border-radius:50%; background-size:contain; background-color:#fff; } .toplist.sm .tr .ti.no { background-color:var(--sf); }
.tn2 { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; } .tn2 b { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tbar { height:6px; border-radius:3px; background:var(--sf); overflow:hidden; } .tbar i { display:block; height:100%; border-radius:3px; background:var(--ac); }
.tr em { font-style:normal; font-size:12.5px; font-weight:700; color:var(--primary-text-color); min-width:28px; text-align:right; }
.wbars { display:flex; align-items:stretch; gap:6px; height:130px; padding:4px 0 2px; } .wb { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; min-width:0; cursor:default; }
.wcol { flex:1; width:100%; max-width:30px; display:flex; align-items:flex-end; border-bottom:1px solid var(--bd); } .wcol i { display:block; width:100%; border-radius:4px 4px 0 0; background:color-mix(in srgb, var(--ac) 55%, transparent); min-height:0; }
.wb.now .wcol i { background:var(--ac); } .wb:hover .wcol i { background:var(--ac); } .wv { font-size:11px; font-weight:700; height:14px; } .wl { font-size:10.5px; color:var(--secondary-text-color); } .wb.now .wl { color:var(--ac); font-weight:700; }
.srcs { display:flex; flex-wrap:wrap; gap:6px; } .srcs b { margin-left:4px; }
.off.busy, .ri2.busy { opacity:.5; pointer-events:none; }
.in { min-width:0; flex:1; display:flex; flex-direction:column; } .in b { font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .in small { font-size:11.5px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ns { font-size:11px; font-weight:800; color:#fff; padding:2px 7px; border-radius:6px; display:inline-block; }
/* courses */
.shopmeta { font-size:12.5px; color:var(--secondary-text-color); margin:2px 2px 10px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.si { display:grid; grid-template-columns:24px minmax(0,1fr) auto 28px; grid-template-rows:auto auto; column-gap:9px; align-items:center; padding:7px 6px; border-radius:10px; cursor:pointer; border-bottom:1px solid var(--bd); }
.si:hover { background:var(--sf); }
.si .cb { grid-row:1 / span 2; grid-column:1; width:22px; height:22px; border-radius:7px; border:2px solid var(--bd); display:grid; place-items:center; color:transparent; }
.si .cb ha-icon { --mdc-icon-size:16px; }
.si b { font-size:14px; font-weight:600; } .si .q { font-size:13px; font-weight:600; color:var(--ac); text-align:right; white-space:nowrap; }
.si small { grid-column:2 / 4; font-size:11px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.si .x { grid-row:1 / span 2; grid-column:4; border:0; background:none; opacity:.4; } .si .x ha-icon { --mdc-icon-size:16px; }
.si.ck .cb { background:var(--ac); border-color:var(--ac); color:#0b1416; } .si.ck b, .si.ck .q { text-decoration:line-through; opacity:.5; }
/* fenêtres */
.ov { position:fixed; inset:0; z-index:9999; background:rgba(4,8,12,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box; }
.mdl { width:100%; max-width:520px; max-height:100%; overflow:auto; border-radius:22px; background:var(--card-background-color, #1c1c1c); color:var(--primary-text-color); box-shadow:0 20px 60px rgba(0,0,0,.5); border:1px solid var(--bd); }
.mdl.wide { max-width:820px; }
.mh { display:flex; align-items:center; gap:8px; padding:12px 14px; position:sticky; top:0; background:inherit; z-index:2; border-bottom:1px solid var(--bd); }
.mt { flex:1; font-weight:700; font-size:16px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mb { padding:14px; display:flex; flex-direction:column; gap:10px; }
@media (max-width: 560px) { .ov { padding:0; align-items:flex-end; } .mdl { border-radius:22px 22px 0 0; max-height:92vh; } }
.row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; } .row.end { justify-content:flex-end; } .row.act { gap:6px; } .grow { flex:1; }
.fl { display:flex; flex-direction:column; gap:4px; font-size:12px; color:var(--secondary-text-color); flex:1; min-width:120px; }
textarea.f { resize:vertical; font-family:inherit; }
.ents { display:flex; flex-direction:column; gap:6px; }
.egrp + .egrp { margin-top:12px; } .egrp .rh { display:flex; align-items:center; gap:6px; } .egrp .rh ha-icon { --mdc-icon-size:16px; color:var(--ac); } .egrp .rh em { font-style:normal; font-size:11px; padding:0 6px; border-radius:999px; background:var(--sf); }
.ei.op { cursor:pointer; } .ei.pic { background-color:#fff; background-size:contain; background-repeat:no-repeat; } .small2 { font-size:12px; margin-top:8px; }
.ent, .ri2 { display:flex; align-items:center; gap:10px; padding:6px; border-radius:12px; background:var(--sf); }
.ri2 { cursor:pointer; background:none; } .ri2:hover { background:var(--sf); }
.ri2 b { flex:1; font-size:13.5px; font-weight:600; } .ri2 small { font-size:11.5px; color:var(--secondary-text-color); }
.ei { width:52px; height:40px; border-radius:9px; flex:none; background:color-mix(in srgb, var(--ac) 15%, transparent) center/cover; display:grid; place-items:center; color:var(--ac); }
.ei.sm { width:34px; height:34px; } .ei.mm { background:color-mix(in srgb, #e3a21a 25%, transparent); color:#e3a21a; } .ei ha-icon { --mdc-icon-size:18px; }
.en { flex:1; min-width:0; display:flex; flex-direction:column; } .en b { font-size:14px; } .en small { font-size:12px; color:var(--secondary-text-color); }
.ingl li.lk { cursor:pointer; } .ingl li.lk:hover { box-shadow:inset 0 0 0 1.5px var(--ac); }
.lnk2 { cursor:pointer; } .lnk2:hover { color:var(--ac); }
.stp { display:inline-flex; align-items:center; gap:6px; } .stp button { width:22px; height:22px; border-radius:6px; border:1px solid var(--bd); background:var(--sf); padding:0; line-height:1; }
.addbox { display:flex; flex-direction:column; gap:6px; }
.pick { padding:10px 12px; border-radius:12px; border:1px solid var(--ac); background:none; color:var(--primary-text-color); font:inherit; }
.res { display:flex; flex-direction:column; gap:2px; }
.rh { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--secondary-text-color); margin:8px 4px 2px; }
.rhero { aspect-ratio:16/7; border-radius:14px; background:color-mix(in srgb, var(--ac) 12%, transparent) center/cover; }
.rmeta { display:flex; gap:12px; flex-wrap:wrap; font-size:12.5px; color:var(--secondary-text-color); } .rmeta span { display:flex; align-items:center; gap:4px; } .rmeta ha-icon { --mdc-icon-size:16px; }
.cols { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.5fr); gap:18px; }
@media (max-width: 640px) { .cols { grid-template-columns:1fr; } }
.sh { font-weight:700; font-size:14px; margin:4px 0 6px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.ingl { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:5px; font-size:13.5px; }
.ingl li { padding:5px 8px; border-radius:8px; background:var(--sf); } .ingl b { color:var(--ac); }
.steps { margin:0; padding-left:20px; display:flex; flex-direction:column; gap:8px; font-size:13.5px; line-height:1.5; }
.seg { display:flex; gap:3px; padding:3px; border-radius:12px; background:var(--sf); }
.seg button { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; border:0; background:none; padding:8px; border-radius:9px; font-size:13px; font-weight:600; color:var(--secondary-text-color); }
.seg button.on { background:color-mix(in srgb, var(--ac) 22%, transparent); color:var(--primary-text-color); } .seg ha-icon { --mdc-icon-size:17px; }
.offg { display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:6px; }
.off { display:flex; align-items:center; gap:9px; padding:7px; border-radius:12px; background:var(--sf); cursor:pointer; } .off:hover { box-shadow:inset 0 0 0 1.5px var(--ac); }
.otn { flex:1; min-width:0; display:flex; flex-direction:column; } .otn b { font-size:13px; } .otn small { font-size:11.5px; color:var(--secondary-text-color); }
.ihead { display:flex; gap:14px; align-items:center; font-size:13px; } .ihead > div:last-child { display:flex; flex-direction:column; gap:4px; align-items:flex-start; }
.chips { display:flex; flex-wrap:wrap; gap:6px; } .chip { border:1px solid var(--bd); background:var(--sf); border-radius:999px; padding:5px 11px; font-size:12.5px; }
.plgrid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:8px; }
.pld { display:flex; flex-direction:column; gap:5px; padding:8px; border-radius:12px; background:var(--sf); } .pld b { font-size:12.5px; text-transform:capitalize; }
.mlist { display:flex; flex-direction:column; gap:2px; max-height:50vh; overflow:auto; }
.ml { display:flex; align-items:center; gap:9px; padding:6px 8px; border-radius:9px; font-size:13.5px; } .ml:hover { background:var(--sf); } .ml b { flex:1; font-weight:500; } .ml.done { opacity:.55; } .ml small { font-size:11.5px; }
`;

class HolmMyMenuCardEditor extends HTMLElement {
  setConfig(c) { this._c = { ...c }; this._draw(); }
  set hass(h) { this._hass = h; if (this._f) this._f.hass = h; else this._draw(); }
  _draw() {
    if (!this._hass || !this._c) return;
    if (!this._f) {
      this._f = document.createElement("ha-form");
      this._f.computeLabel = (s) => ({ title: "Titre", view: "Affichage", tab: "Onglet à l'ouverture", show_frame: "Afficher le cadre", today_slots: "Repas affichés (toutes les vues)", list_height: "Hauteur des listes en px (0 = sans limite)" }[s.name] || s.name);
      this._f.schema = [{ name: "title", selector: { text: {} } },
        { type: "grid", name: "", schema: [
          { name: "view", selector: { select: { mode: "dropdown", options: [{ value: "full", label: "Complet (semaine, recettes, ingrédients, courses)" }, { value: "today", label: "Menu du jour (compact, consultation)" }, { value: "week", label: "Semaine (planning, consultation)" }, { value: "stats", label: "Statistiques" }] } } },
          { name: "tab", selector: { select: { mode: "dropdown", options: [{ value: "week", label: "Semaine" }, { value: "recipes", label: "Recettes" }, { value: "ingredients", label: "Ingrédients" }, { value: "shopping", label: "Courses" }, { value: "stats", label: "Statistiques" }] } } }] },
        { name: "today_slots", selector: { select: { multiple: true, mode: "list", options: [{ value: "midi", label: "Midi" }, { value: "soir", label: "Soir" }] } } },
        { name: "list_height", selector: { number: { min: 0, max: 2000, step: 20, mode: "box", unit_of_measurement: "px" } } },
        { name: "show_frame", selector: { boolean: {} } }];
      this._f.addEventListener("value-changed", (e) => {
        const v = { ...this._c, ...e.detail.value };
        ["view", "tab"].forEach((k) => { if (v[k] === { view: "full", tab: "week" }[k]) delete v[k]; });
        if (v.show_frame !== false) delete v.show_frame;
        if (Array.isArray(v.today_slots) && (!v.today_slots.length || v.today_slots.length === 2)) delete v.today_slots;
        if (v.list_height === 620 || v.list_height === undefined || v.list_height === null) delete v.list_height;
        this._c = v;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: v }, bubbles: true, composed: true }));
      });
      this.appendChild(this._f);
    }
    this._f.hass = this._hass;
    this._f.data = { view: "full", tab: "week", show_frame: true, today_slots: ["midi", "soir"], list_height: 620, ...this._c };
  }
}

if (!customElements.get("holm-mymenu-card")) customElements.define("holm-mymenu-card", HolmMyMenuCard);
if (!customElements.get("holm-mymenu-card-editor")) customElements.define("holm-mymenu-card-editor", HolmMyMenuCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "holm-mymenu-card"))
  window.customCards.push({ type: "holm-mymenu-card", name: "HOLM – My Menu", description: "Menus de la semaine, recettes (Marmiton, Mealie), ingrédients (Open Food Facts) et liste de courses", preview: false });
console.info(`%c HOLM-MYMENU %c ${VERSION} `, "background:#0abfbf;color:#0b1416;border-radius:3px 0 0 3px", "background:#123;color:#fff;border-radius:0 3px 3px 0");
})();
