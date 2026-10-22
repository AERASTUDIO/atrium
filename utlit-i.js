/* Útlit I (2.23.0, ORG.utlit === "I" – fyrst í dev/): dökk vinstri stika með hlutum og undirflipum,
   listi og spjald hlið við hlið á tölvu, sía efst í listum, stækka spjald. Síminn er óbreyttur.
   Áfangi 1: aðeins útlit og leiðsögn – engin ný gögn. */
(function () {
  if (window.ORG?.utlit !== "I" || !window.ORG?.pakkaval) return;
  document.body.classList.add("ui1");

  /* ---------- Hlutar og undirflipar ---------- */
  const by = k => SECTIONS_ALL.find(x => x.k === k);
  const H = by("heim"), V = by("verkefni"), T = by("tilbod"), B = by("bunadur"), P = by("pantanir"), TI = by("timar");
  if (H) H.tabs = [["yfirlit", "Yfirlit"], ["hfrag", "Óklárað"], ["hfram", "Framundan"], ["hnyl", "Tilkynningar"]];
  if (V) V.tabs = V.tabs.map(t => t[0] === "verk" ? ["verk", "Öll verkefni"] : t[0] === "lverk" ? ["lverk", "Leiga"] : t[0] === "sverk" ? ["sverk", "Sala"] : t[0] === "undir" ? ["undir", "Undirverk", 1] : t);
  if (T && B) {
    const vv = T.tabs.find(t => t[0] === "vvinna");
    T.tabs = T.tabs.filter(t => t[0] !== "vvinna").map(t => t[0] === "ltilbod" ? ["ltilbod", "Tilboð"] : t);
    B.tabs = B.tabs.map(t => t[0] === "lvorur" ? ["lvorur", "Leiga"] : t[0] === "svorur" ? ["svorur", "Sala"] : t[0] === "vutl" ? ["vutl", "Útleiga", 1] : t);
    if (vv) B.tabs.push(["vvinna", "Þjónusta"]);
  }
  if (TI) TI.tabs = TI.tabs.map(t => t[0] === "timar" ? ["timar", "Vikan"] : t);
  // Pantanir í Kjarna, á eftir Verkefnum
  if (P && V) { SECTIONS_ALL.splice(SECTIONS_ALL.indexOf(P), 1); SECTIONS_ALL.splice(SECTIONS_ALL.indexOf(V) + 1, 0, P); }
  _einSig = null; applyEin();
  // Merki fyrirtækis í dökku stikunni: dökka útgáfan (ljóst merki) óháð þema
  const coSide = () => { const l = ORG.merki || ORG.logo || {}, src = l.dokk || l.ljos; const i = document.querySelector(".side .colog"); if (i && src && i.getAttribute("src") !== src) i.src = src; };
  coSide(); new MutationObserver(coSide).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const GRP = { heim: "Kjarni", verkefni: "Kjarni", pantanir: "Kjarni", dagatal: "Pakkar", timar: "Pakkar", tilbod: "Pakkar", bunadur: "Pakkar", fjarmal: "Pakkar", skjol: "Tengingar", postur: "Tengingar", spjall: "Tengingar" };
  const desk = () => window.matchMedia("(min-width:1024px)").matches;

  /* ---------- Vinstri stika: hlutar í hópum, undirflipar valins hluta, engar tölur ---------- */
  const _draw = window.drawMenu || drawMenu;
  function drawI() {
    _draw();
    const el = document.getElementById("sitems"); if (!el) return;
    const cur = secOf(tab); let last = null, h = "";
    SECTIONS.filter(x => !x.nobar).forEach(x => {
      const g = GRP[x.k] || ""; if (g !== last) { h += `<div class="sgrp">${g}</div>`; last = g; }
      const on = x === cur && tab !== "leit" && tab !== "stillingar";
      h += `<button type="button" class="tab" data-tab="${x.tabs[0][0]}"${on ? ' aria-current="page"' : ""} aria-label="${esc(x.l)}">${x.ic}<span class="tl">${esc(x.l)}</span></button>`;
      const vis = x.tabs.filter(t => !t[2]);
      if (on && vis.length > 1) {
        const act = vis.some(t => t[0] === tab) ? tab : vis[0][0];
        h += `<div class="tsubs">${vis.map(([k, l]) => `<button type="button" class="tab tsub" data-tab="${k}"${k === act ? ' aria-current="true"' : ""}>${esc(l)}</button>`).join("")}</div>`;
      }
    });
    el.innerHTML = h;
  }
  window.drawMenu = drawI; try { drawMenu = drawI; } catch (e) {}

  /* ---------- Listi og spjald hlið við hlið ---------- */
  const LIST = new Set(["verk", "lverk", "sverk", "undir", "vsk", "ltilbod", "pantanir", "lvorur", "svorur", "vvinna", "fundir", "tfaer", "trk", "hfrag", "hfram", "hnyl"]);
  const SUPER = () => { const s = secOf(tab), vis = s.tabs.filter(t => !t[2]); return vis.length > 1 && s.k !== "heim" || (s.k === "heim" && tab !== "yfirlit") ? s.l : ""; };
  const EXP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  const COL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>';
  let full = false, flt = "";
  const _render = window.render || render;
  function renderI() {
    const v = document.getElementById("view");
    if (!desk() || !S || !LIST.has(tab)) {
      document.body.classList.remove("hassplit", "spfull"); _render();
      // Yfirflokkur í smáu letri fyrir ofan heiti undirsíðu (t.d. Tímar › Vikan)
      const sup = desk() && S && !DETAIL ? SUPER() : "", ph = v.querySelector(".phead"), tl = ph?.querySelector(".ptitle"), lab = (secOf(tab).tabs.find(t => t[0] === tab) || [])[1];
      if (sup && tl && lab) { tl.textContent = lab; ph.insertAdjacentHTML("afterbegin", `<div class="spsup">${esc(sup)}</div>`); }
      return;
    }
    let det = "";
    if (DETAIL) { _render(); det = v.innerHTML; const k = DETAIL; DETAIL = null; _render(); DETAIL = k; drawMenu(); }
    else { full = false; _render(); }
    const list = v.innerHTML, sup = SUPER();
    document.body.classList.add("hassplit"); document.body.classList.toggle("spfull", !!DETAIL && full);
    v.innerHTML = `<div class="split"><section class="splist" aria-label="Listi">${sup ? `<div class="spsup">${esc(sup)}</div>` : ""}${list}</section>`
      + `<section class="spdet" aria-label="Nánar">${DETAIL ? `<button type="button" class="spexp" data-ui1="exp" aria-label="${full ? "Minnka" : "Stækka"} glugga" title="${full ? "Minnka" : "Stækka"}">${full ? COL : EXP}</button>${det}` : `<div class="spempty">Veldu atriði úr listanum</div>`}</section></div>`;
    // Sía efst í listanum (síar línur og spjöld eftir texta)
    const sl = v.querySelector(".splist"), ph = sl.querySelector(".phead");
    const f = document.createElement("label"); f.className = "spfilt";
    f.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 5h18M6 12h12M10 19h4"/></svg><input type="search" placeholder="Sía ${esc((secOf(tab).tabs.find(t => t[0] === tab) || [, ""])[1].toLowerCase())}…" aria-label="Sía lista" value="${esc(flt)}"><kbd>/</kbd>`;
    (ph ? ph.after(f) : sl.prepend(f));
    const inp = f.querySelector("input"); inp.addEventListener("input", () => { flt = inp.value; applyFilt(sl); }); applyFilt(sl);
    if (DETAIL) sl.querySelector(`[data-open="${CSS.escape(String(DETAIL))}"]`)?.classList.add("spsel");
    const tl = sl.querySelector(".ptitle"), lab = (secOf(tab).tabs.find(t => t[0] === tab) || [])[1]; if (tl && lab && sup) tl.textContent = lab;
  }
  function applyFilt(sl) {
    const q = fold(flt.trim()); const items = sl.querySelectorAll(".card,.lrow,.vrow,.row,.item,li,tr");
    items.forEach(n => { if (n.closest(".phead,.spfilt")) return; n.style.display = !q || fold(n.textContent).includes(q) ? "" : "none"; });
  }
  window.render = renderI; try { render = renderI; } catch (e) {}

  document.addEventListener("click", e => { const b = e.target.closest('[data-ui1="exp"]'); if (!b) return; full = !full; render(); });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "") && document.querySelector(".spfilt input")) { e.preventDefault(); document.querySelector(".spfilt input").focus(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { const q = document.getElementById("topq"); if (q) { e.preventDefault(); q.focus(); } }
  });
  window.addEventListener("resize", () => { clearTimeout(renderI._r); renderI._r = setTimeout(() => S && render(), 200); });

  /* ---------- Heim: samantekt án spjaldanna efst, merki fyrirtækisins neðst ---------- */
  const _heim = window.vHeim2;
  if (_heim) window.vHeim2 = function () {
    const l = ORG.merki || ORG.logo || {}, src = l.ljos || l.dokk || "";
    return _heim() + (src ? `<div class="h2logo"><img src="${esc(src)}" alt="${esc(ORG.nafn || "")}"></div>` : "");
  };
})();
