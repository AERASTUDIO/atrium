/* u2sel.js (2.144.1) – Fellivöl í U2d-útliti með leit.
   Innbyggði listinn í vafranum (bláa línan, Windows-letrið) er ekki hægt að stíla, svo á tölvu (fín bendill) opnast
   í staðinn spjald í U2d-útliti: leitarreitur (ef valkostir eru fleiri en 7), hópar (optgroup) sem smámerki, örvar/Enter/Esc.
   <select> heldur áfram að vera gildið sjálft – valið setur select.value og sendir input + change (sömu aðgerðir og áður).
   Í síma er innbyggði valinn notaður áfram. */
(function () {
  const fine = () => matchMedia("(pointer:fine)").matches;
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ð/g, "d").replace(/þ/g, "th").replace(/æ/g, "ae").replace(/ö/g, "o").toLowerCase();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let pop = null, cur = null, items = [], hi = -1;
  const ok = s => s && s.tagName === "SELECT" && !s.multiple && !s.disabled && !(s.size > 1) && !s.closest(".u2nosel") && document.body.classList.contains("kerfi");

  function close(focus) { if (!pop) return; pop.remove(); pop = null; const s = cur; cur = null; items = []; hi = -1; s?.classList.remove("u2selon"); if (focus && s?.isConnected) s.focus({ preventScroll: true }); }
  function choose(i) { const it = items[i]; if (!it || it.dis) return; const s = cur;
    if (s.value !== it.v || s.selectedIndex !== it.ix) { s.selectedIndex = it.ix;
      ["input", "change"].forEach(t => { const e = new Event(t, { bubbles: true }); e.u2user = true; s.dispatchEvent(e); }); }
    close(true); }
  function mark(i, scroll) { if (!pop) return; const els = pop.querySelectorAll(".u2so"); els.forEach(e => e.classList.remove("hi"));
    hi = i; const el = pop.querySelector(`.u2so[data-i="${i}"]`); if (el) { el.classList.add("hi"); if (scroll) el.scrollIntoView({ block: "nearest" }); } }
  function list(q) { const n = norm(q).trim(), parts = n.split(/\s+/).filter(Boolean); let h = "", lastG = null, shown = [];
    items.forEach((it, i) => { if (parts.length && !parts.every(p => it.k.includes(p))) return;
      if (it.g !== lastG) { h += it.g ? `<div class="u2sg">${esc(it.g)}</div>` : (lastG ? `<div class="u2sd"></div>` : ""); lastG = it.g; }
      h += `<div class="u2so${it.sel ? " sel" : ""}${it.dis ? " dis" : ""}${it.g ? " ing" : ""}" role="option" data-i="${i}" aria-selected="${it.sel}">${esc(it.t)}${it.sel ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : ""}</div>`; shown.push(i); });
    pop.querySelector(".u2sl").innerHTML = h || `<div class="u2se">Ekkert fannst</div>`;
    const first = shown.find(i => !items[i].dis); mark(n ? (first ?? -1) : (shown.find(i => items[i].sel && !items[i].dis) ?? first ?? -1), true); return shown; }
  function place() { if (!pop || !cur) return; const r = cur.getBoundingClientRect(), W = Math.min(Math.max(r.width, 240), innerWidth - 16);
    let x = Math.min(Math.max(8, r.left), innerWidth - W - 8); pop.style.width = W + "px"; pop.style.left = x + "px";
    const below = innerHeight - r.bottom - 12, above = r.top - 12, up = below < 260 && above > below, room = Math.max(160, Math.min(420, up ? above : below));
    pop.style.maxHeight = room + "px"; if (up) { pop.style.top = ""; pop.style.bottom = (innerHeight - r.top + 6) + "px"; } else { pop.style.bottom = ""; pop.style.top = (r.bottom + 6) + "px"; } }
  function open(s) { close(); cur = s; s.classList.add("u2selon");
    items = []; [...s.options].forEach((o, ix) => { if (o.hidden) return; const g = o.parentElement?.tagName === "OPTGROUP" ? o.parentElement.label : ""; const t = (o.label || o.textContent || "").replace(/\s+/g, " ").trim();
      items.push({ ix, v: o.value, t: t || "—", g, k: norm(t + " " + g), sel: ix === s.selectedIndex, dis: o.disabled || o.parentElement?.disabled }); });
    const srch = items.length > 7;
    pop = document.createElement("div"); pop.className = "u2pop"; pop.setAttribute("role", "listbox");
    pop.innerHTML = (srch ? `<div class="u2ss"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg><input type="text" placeholder="Leita…" aria-label="Leita í lista" autocomplete="off" spellcheck="false"></div>` : "") + `<div class="u2sl"></div>`;
    document.body.appendChild(pop); place(); list("");
    const inp = pop.querySelector("input"); (inp || pop).focus?.({ preventScroll: true }); if (!inp) pop.tabIndex = -1, pop.focus({ preventScroll: true });
    inp?.addEventListener("input", () => list(inp.value));
    pop.addEventListener("mousedown", e => { if (!e.target.closest("input")) e.preventDefault(); });
    pop.addEventListener("click", e => { const o = e.target.closest(".u2so"); if (o) choose(+o.dataset.i); });
    pop.addEventListener("mousemove", e => { const o = e.target.closest(".u2so:not(.dis)"); if (o && +o.dataset.i !== hi) mark(+o.dataset.i); });
    pop.addEventListener("keydown", e => { const vis = [...pop.querySelectorAll(".u2so:not(.dis)")].map(x => +x.dataset.i), p = vis.indexOf(hi);
      if (e.key === "ArrowDown") { e.preventDefault(); mark(vis[Math.min(vis.length - 1, p + 1)] ?? vis[0], true); }
      else if (e.key === "ArrowUp") { e.preventDefault(); mark(vis[Math.max(0, p - 1)] ?? vis[0], true); }
      else if (e.key === "Home" && !inp) { e.preventDefault(); mark(vis[0], true); } else if (e.key === "End" && !inp) { e.preventDefault(); mark(vis[vis.length - 1], true); }
      else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (hi >= 0) choose(hi); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (e.key === "Tab") { close(false); } });
  }
  document.addEventListener("mousedown", e => { const s = e.target.closest?.("select");
    if (pop && !e.target.closest(".u2pop")) { const was = cur; close(false); if (s === was) { e.preventDefault(); return; } }
    if (e.button === 0 && ok(s) && fine()) { e.preventDefault(); s.focus({ preventScroll: true }); open(s); } }, true);
  document.addEventListener("keydown", e => { const s = e.target; if (pop || !ok(s) || !fine()) return;
    if (e.key === "Enter" || e.key === " " || e.key === "F4" || (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp"))) { e.preventDefault(); e.stopPropagation(); open(s); } }, true);
  addEventListener("resize", () => close(false));
  document.addEventListener("scroll", e => { if (pop && !pop.contains(e.target)) close(false); }, true);
  window.u2SelClose = close;
})();
