/* Dagsetningarval Atrium (2.71.0)
   Í stað sjálfgefna vafradagatalsins (sem sýnir t.d. 12/25/2026 eftir stillingum tölvunnar) kemur hnappur með íslenskri
   dagsetningu („fim. 25. des. 2026“) og eigið dagatal: vikan byrjar á mánudegi, í dag merktur, tímabil Afhending–Skil
   (eða Frá–Til) litað. Upprunalegi reiturinn er áfram í DOM (falinn) svo allur annar kóði les .value og fær input/change eins og áður.
   Aðeins á tölvu (fín bendill) – í síma er kerfisdagatalið betra. */
(() => {
  if (!matchMedia("(pointer:fine)").matches) return;
  const MAN = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
  const MS = ["jan.", "feb.", "mar.", "apr.", "maí", "jún.", "júl.", "ágú.", "sep.", "okt.", "nóv.", "des."];
  const VD = ["sun.", "mán.", "þri.", "mið.", "fim.", "fös.", "lau."], HD = ["Má", "Þr", "Mi", "Fi", "Fö", "La", "Su"];
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const pd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const fmt = s => { const d = pd(s); return d ? `${VD[d.getDay()]} ${d.getDate()}. ${MS[d.getMonth()]} ${d.getFullYear()}` : ""; };
  const IC = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>';
  const PAIR = { fra: "til", til: "fra", fraD: "tilD", tilD: "fraD", start: "end", end: "start" };
  const partner = inp => { const k = inp.dataset.h || inp.name || inp.id || ""; const o = PAIR[k]; if (!o) return null;
    const box = inp.closest(".two, form, .tbsec, section, .sheet, dialog") || inp.parentElement?.parentElement; return box?.querySelector(`input[type=date][data-h="${o}"], input[type=date][name="${o}"], input[type=date]#${CSS.escape(o)}`) || null; };
  let pop = null, cur = null, view = null;

  function label(inp) { const b = inp._dpb; if (!b) return; const v = desc.get.call(inp); b.querySelector(".dpt").textContent = v ? fmt(v) : (inp.placeholder || "Veldu dag"); b.classList.toggle("dpe", !v); b.disabled = inp.disabled; }
  function wrap(inp) {
    if (inp.dataset.dp) return; inp.dataset.dp = "1";
    const b = document.createElement("button"); b.type = "button"; b.className = "dpbtn"; b.innerHTML = `${IC}<span class="dpt"></span>`;
    b.setAttribute("aria-label", (inp.closest("label")?.firstChild?.textContent || "Dagsetning").trim() + " – velja dag");
    inp._dpb = b; inp.classList.add("dpin"); inp.after(b);
    Object.defineProperty(inp, "value", { configurable: true, get() { return desc.get.call(this); }, set(v) { desc.set.call(this, v); label(this); } });
    inp.addEventListener("change", () => label(inp)); label(inp);
    b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); pop && cur === inp ? close() : open(inp); });
  }
  function close() { pop?.remove(); pop = null; cur = null; }
  function open(inp) {
    close(); cur = inp; const v = pd(desc.get.call(inp)) || pd(partner(inp)?.value) || new Date(); view = new Date(v.getFullYear(), v.getMonth(), 1);
    pop = document.createElement("div"); pop.className = "dpop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Velja dag");
    document.body.append(pop); draw(); place();
  }
  function place() { if (!pop || !cur) return; const r = cur._dpb.getBoundingClientRect(), h = pop.offsetHeight, w = pop.offsetWidth;
    let top = r.bottom + 6; if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 6);
    pop.style.top = top + "px"; pop.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + "px"; }
  function draw() {
    const inp = cur, sel = desc.get.call(inp), pt = partner(inp), pv = pt ? desc.get.call(pt) : "", k = inp.dataset.h || inp.name || "";
    const isEnd = /^(til|tilD|end)$/.test(k), lo = isEnd ? pv : sel, hi = isEnd ? sel : pv, mn = inp.min || (isEnd ? pv : ""), mx = inp.max || "";
    const y = view.getFullYear(), m = view.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), t = iso(new Date());
    let cells = ""; for (let i = 0; i < first; i++) cells += `<span></span>`;
    for (let d = 1; d <= n; d++) { const s = iso(new Date(y, m, d)), dis = (mn && s < mn) || (mx && s > mx);
      const cl = ["dpd", s === t ? "dpt0" : "", s === sel ? "dpsel" : "", s === pv ? "dpp" : "", lo && hi && s > lo && s < hi ? "dprng" : "", lo && hi && s === lo && lo !== hi ? "dplo" : "", lo && hi && s === hi && lo !== hi ? "dphi" : ""].filter(Boolean).join(" ");
      cells += `<button type="button" class="${cl}" data-d="${s}"${dis ? " disabled" : ""}>${d}</button>`; }
    pop.innerHTML = `<div class="dph"><button type="button" class="dpn" data-n="-1" aria-label="Fyrri mánuður">‹</button><b>${MAN[m]} ${y}</b><button type="button" class="dpn" data-n="1" aria-label="Næsti mánuður">›</button></div>
      <div class="dpw">${HD.map(x => `<span>${x}</span>`).join("")}</div><div class="dpg">${cells}</div>
      <div class="dpf"><button type="button" data-q="tdy">Í dag</button>${pt && pv && !sel ? `<button type="button" data-q="same">Sami dagur</button>` : ""}${sel && !inp.required ? `<button type="button" data-q="clr">Hreinsa</button>` : ""}</div>`;
  }
  function pick(s) { const inp = cur; if (!inp) return; desc.set.call(inp, s); label(inp);
    inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true })); close(); }
  document.addEventListener("click", e => {
    if (!pop) return; if (!pop.contains(e.target)) { if (!e.target.closest(".dpbtn")) close(); return; }
    e.stopPropagation(); const n = e.target.closest("[data-n]"), d = e.target.closest("[data-d]"), q = e.target.closest("[data-q]");
    if (n) { view.setMonth(view.getMonth() + +n.dataset.n); draw(); place(); }
    else if (d && !d.disabled) pick(d.dataset.d);
    else if (q) { const v = q.dataset.q; if (v === "tdy") pick(iso(new Date())); else if (v === "clr") pick(""); else if (v === "same") pick(desc.get.call(partner(cur))); }
  }, true);
  document.addEventListener("keydown", e => { if (pop && e.key === "Escape") { e.stopPropagation(); const b = cur?._dpb; close(); b?.focus(); } }, true);
  addEventListener("resize", place); document.addEventListener("scroll", () => place(), true);
  const scan = () => { document.querySelectorAll('input[type="date"]:not([data-dp])').forEach(wrap); if (cur && !cur.isConnected) close(); };
  let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; try { scan(); } catch (e) {} }); }).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
