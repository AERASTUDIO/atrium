/* Útlit I (2.23.0, ORG.utlit === "I" – fyrst í dev/): dökk vinstri stika með hlutum og undirflipum,
   listi og spjald hlið við hlið á tölvu, sía efst í listum, stækka spjald. Síminn er óbreyttur.
   Áfangi 1: aðeins útlit og leiðsögn – engin ný gögn. */
(function () {
  if (window.ORG?.utlit !== "I" || !window.ORG?.pakkaval) return;
  document.body.classList.add("ui1");
  if (window.ORG?.kerfi) document.body.classList.add("kerfi");
  // Dráttarlína fyrir tölvuapp án titilstiku (window-controls-overlay, 2.51.2)
  if (!document.getElementById("wcodrag")) { const g = document.createElement("div"); g.id = "wcodrag"; g.setAttribute("aria-hidden", "true"); document.body.append(g); }  // hönnunarkerfið (2.49.0, kerfi.css)

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
  if (V && !V.tabs.some(t => t[0] === "tverk")) { const i = V.tabs.findIndex(t => t[0] === "sverk"); V.tabs.splice(i >= 0 ? i + 1 : 1, 0, ["tverk", "Þjónusta"]); }
  if (P) P.tabs = [["pantanir", "Allar"], ["pnl", "Leiga"], ["pns", "Sala"], ["pnt", "Þjónusta"]];
  if (T) { const i = T.tabs.findIndex(t => t[0] === "ltilbod"); if (i >= 0) T.tabs.splice(i, 1, ["ltilbod", "Öll tilboð"], ["tbl", "Leiga"], ["tbs", "Sala"], ["tbt", "Þjónusta"]); }
  if (B) B.tabs.unshift(["vyfir", "Yfirlit"]);
  Object.assign(window.TAB_EIN = window.TAB_EIN || {}, { tbl: ["tilbod", "leiga"], tbs: ["tilbod", "sala"], tbt: "tilbod", vyfir: "bunadur", tverk: "verkefni", pnl: ["pantanir", "leiga"], pns: ["pantanir", "sala"], pnt: "pantanir" });
  if (TI) TI.tabs = TI.tabs.map(t => t[0] === "timar" ? ["timar", "Vikan"] : t);
  // Viðskiptavinir eigin hluti í Kjarna (ekki undir Verkefnum)
  let C = by("vidsk");
  if (V && !C) { V.tabs = V.tabs.filter(t => t[0] !== "vsk"); C = { k: "vidsk", l: "Viðskiptavinir", ic: TABDEF.find(t => t[0] === "vsk")[2], tabs: [["vsk", "Viðskiptavinir"]] }; SECTIONS_ALL.splice(SECTIONS_ALL.indexOf(V) + 1, 0, C); }
  // Pantanir beint fyrir neðan Heim
  if (P && H) { SECTIONS_ALL.splice(SECTIONS_ALL.indexOf(P), 1); SECTIONS_ALL.splice(SECTIONS_ALL.indexOf(H) + 1, 0, P); }
  // Yfirlit fremst; listar flokkaðir eftir sviðum (Leiga · Sala · Þjónusta) – „Öll/Allar“ falið en virkar áfram sem tenglar
  const hide = (S0, k) => { const t = S0?.tabs.find(x => x[0] === k); if (t) t[2] = 1; };
  if (V) { hide(V, "verk"); V.tabs.unshift(["verkyf", "Yfirlit"]); }
  if (C) C.tabs = [["vskyf", "Yfirlit"], ["vsk", "Viðskiptavinir", 1], ["vskl", "Leiga"], ["vsks", "Sala"], ["vskt", "Þjónusta"]];
  if (P) { hide(P, "pantanir"); P.tabs.unshift(["pnyf", "Yfirlit"]); }
  if (T) { hide(T, "ltilbod"); T.tabs.unshift(["tbyf", "Yfirlit"]); }
  if (TI) TI.tabs.unshift(["timyf", "Yfirlit"]);
  Object.assign(window.TAB_EIN, { verkyf: "verkefni", vskyf: "vidskiptavinir", vskl: ["vidskiptavinir", "leiga"], vsks: ["vidskiptavinir", "sala"], vskt: "vidskiptavinir", pnyf: "pantanir", tbyf: "tilbod", timyf: "timar" });
  _einSig = null; applyEin();
  // Merki fyrirtækis í dökku stikunni: dökka útgáfan (ljóst merki) óháð þema
  const coSide = () => { const l = ORG.merki || ORG.logo || {}, src = l.dokk || l.ljos; const i = document.querySelector(".side .colog"); if (i && src && i.getAttribute("src") !== src) i.src = src; };
  coSide(); new MutationObserver(coSide).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const GRP = { heim: "Kjarni", verkefni: "Kjarni", vidsk: "Kjarni", pantanir: "Kjarni", dagatal: "Verkfæri", timar: "Verkfæri", tilbod: "Verkfæri", bunadur: "Verkfæri", fjarmal: "Verkfæri", skjol: "Tengingar", postur: "Tengingar", spjall: "Tengingar" };
  // Símaútlit I (2.46.0, ORG.simi === "I"): síminn notar sama útlit og tölvan (listi og spjald, simi-ui1.css + simi.css);
  // wideScr() = raunverulegur breiður skjár, desk() = tölvuútlitið er í notkun
  const SIMI = window.ORG?.simi === "I";
  const wideScr = () => window.matchMedia("(min-width:1024px)").matches;
  const desk = () => wideScr() || SIMI;

  /* ---------- Vinstri stika: hlutar í hópum, undirflipar valins hluta, engar tölur ---------- */
  const _draw = window.drawMenu || drawMenu;
  function drawI() {
    _draw();
    const el = document.getElementById("sitems"); if (!el) return;
    const cur = tab === "upphaf" ? null : secOf(tab); let last = null, h = "";
    SECTIONS.filter(x => !x.nobar).forEach(x => {
      const g = GRP[x.k] || ""; if (g !== last) { h += `<div class="sgrp">${g}</div>`; last = g; }
      const on = x === cur && tab !== "leit" && tab !== "stillingar";
      h += `<button type="button" class="tab" data-tab="${x.tabs[0][0]}"${on ? ' aria-current="page"' : ""} aria-label="${esc(x.l)}">${x.ic}<span class="tl">${esc(x.l)}</span></button>`;
      const vis = x.tabs.filter(t => !t[2]);
      if (on && vis.length > 1) {
        const act = vis.some(t => t[0] === tab) ? tab : vis[0][0];
        h += `<div class="tsubs">${vis.map(([k, l]) => `<button type="button" class="tab tsub" data-tab="${k}"${k === act ? ' aria-current="true"' : ""}>${esc(["Leiga", "Sala", "Þjónusta"].includes(l) && window.svidHeiti ? svidHeiti(l) : l)}</button>`).join("")}</div>`;
      }
    });
    el.innerHTML = h;
  }
  window.drawMenu = drawI; try { drawMenu = drawI; } catch (e) {}

  /* ---------- Listi og spjald hlið við hlið ---------- */
  const LIST = new Set(["vskl", "vsks", "vskt", "postur", "tverk", "pnl", "pns", "pnt", "verk", "lverk", "sverk", "undir", "vsk", "ltilbod", "pantanir", "lvorur", "svorur", "vvinna", "fundir", "tfaer", "trk", "hfrag", "hfram", "hnyl"]);
  const SUPER = () => { const s = secOf(tab), vis = s.tabs.filter(t => !t[2]); return vis.length > 1 && s.k !== "heim" || (s.k === "heim" && tab !== "yfirlit") ? s.l : ""; };
  const EXP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  const COL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>';
  const PH = { verkefni: "verkefni", vsk: "viðskiptavini", vidsk: "viðskiptavini", tilbod: "tilboð", pantanir: "pantanir", lvorur: "búnað", svorur: "vörur", vvinna: "þjónustu", fundir: "fundi", tfaer: "færslur", trk: "reikninga", fjarmal: "reikninga", undir: "undirverk", heim: "lista" };
  let full = false, flt = "", DETAIL_K = null, fltTab = "";
  const SPH = { verkefni: "heiti eða verknr.", vsk: "nafni eða tengilið", vidsk: "nafni eða tengilið", tilbod: "heiti, nr. eða viðskiptavini", pantanir: "heiti, nr. eða viðskiptavini", lvorur: "heiti eða vnr.", svorur: "heiti eða vnr.", vvinna: "heiti eða vnr.", bunadur: "heiti eða vnr.", fundir: "heiti fundar", tfaer: "lýsingu eða verknr.", timar: "lýsingu eða verknr.", trk: "nafni eða nr.", fjarmal: "nafni eða nr.", heim: "heiti", postur: "sendanda eða efni" };
  const _render = window.render || render;
  function renderI() {
    if (fltTab !== tab) { flt = ""; window.u1Q = ""; fltTab = tab; }
    const v = document.getElementById("view");
    if (tab === "upphaf") {
      if (!wideScr()) { tab = "yfirlit"; return renderI(); }
      document.body.classList.remove("hassplit", "spfull"); document.body.classList.add("onstart"); drawMenu();
      v.innerHTML = startHTML();
      return;
    }
    document.body.classList.remove("onstart"); document.body.dataset.tab = tab;
    if (desk() && S && tab === "stillingar" && !DETAIL) return stSplit(v);
    if (!desk() || !S || !LIST.has(tab)) {
      document.body.classList.remove("hassplit", "spfull"); _render();
      if (desk() && S && !DETAIL && window.UI1V?.[tab]) { v.innerHTML = UI1V[tab](); return; }
      if (tab === "stillingar" && !window.STSUB && typeof STPAGES !== "undefined" && STPAGES.svid && can("stillingar")) { const r = v.querySelector('[data-act="stsub:einingar"]'); if (r && !v.querySelector('[data-act="stsub:svid"]')) r.insertAdjacentHTML("afterend", mrow("stsub:svid", "Svið", { d: STPAGES.svid.d })); }
      // Yfirflokkur í smáu letri fyrir ofan heiti undirsíðu (t.d. Tímar › Vikan)
      const sup = desk() && S && !DETAIL ? SUPER() : "", ph = v.querySelector(".phead"), tl = ph?.querySelector(".ptitle"), lab = (secOf(tab).tabs.find(t => t[0] === tab) || [])[1];
      if (sup && tl && lab) { tl.textContent = lab; ph.insertAdjacentHTML("afterbegin", `<div class="spsup">${esc(sup)}</div>`); }
      // Spjall eins og á borðinu: listi vinstra megin með haus og síum, samtal hægra megin með haus
      if (desk() && S && !DETAIL && tab === "spjall") { const w = v.querySelector(".spwrap"), ch = v.querySelector(".spchans"), hd0 = v.querySelector(".sphead"), ph = v.querySelector(".phead");
        if (w && ch && ph) { const f = window._spf || ""; ch.prepend(ph); ph.insertAdjacentHTML("beforeend", `<div class="ulbar">${[["", "Allt"], ["r", "Rásir"], ["d", "Bein skilaboð"]].map(([k, l]) => `<button type="button" class="uchip${k === f ? " on" : ""}" onclick="window._spf='${k}';render()">${l}</button>`).join("")}</div>`);
          ch.querySelectorAll(".spch").forEach(b => { const r = (b.getAttribute("data-act") || "").slice(6); if (f === "r" && r !== "almennt" || f === "d" && r === "almennt") b.style.display = "none"; });
          ch.insertAdjacentHTML("afterbegin", ""); ch.insertAdjacentHTML("beforeend", `<div class="spfoot">↑↓ fletta · Enter opna · N nýtt</div>`);
          if (hd0) { const t = hd0.querySelector("b")?.textContent || "", sb = hd0.querySelector("span")?.textContent || "", gen = /^#/.test(t);
            hd0.outerHTML = `<div class="udh2"><div class="udl"><div class="spsup">${gen ? "Rás · " + esc(sb) : "Bein skilaboð"}</div><h2 class="ptitle">${esc(t)}</h2><div class="usub">${gen ? "Allir starfsmenn" : esc(sb)}</div></div><div class="uact">${gen ? "" : `<a class="btn" href="https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(sb.split(" ")[0])}" target="_blank" rel="noopener">Teams</a>`}</div></div>`; }
          document.body.classList.add("hassplit"); } }
      // Dagatal eins og á borðinu: mánuður sem heiti; Mánuður/Vika/Dagur, flettingar og + Fundur hægra megin í hausnum
      if (desk() && S && !DETAIL && tab === "dagatal") { const ch = v.querySelector(".cal-head"), seg = v.querySelector(".seg.calseg"), h2 = ph?.querySelector(".ptitle");
        if (ch && ph && h2) { const m = ch.querySelector("h2")?.textContent.trim() || ""; h2.textContent = m + (/\d{4}/.test(m) ? "" : " " + (window.calY || new Date().getFullYear()));
          const nb = ph.querySelector(".pnew"); if (nb) { nb.innerHTML = "+ Fundur"; nb.classList.add("u1pn"); }
          const box = document.createElement("div"); box.className = "ucalctl"; if (seg) box.append(seg); const [td, pv, nx] = [ch.querySelector(".chipbtn"), ...ch.querySelectorAll(".iconbtn")];
          [pv, td, nx].filter(Boolean).forEach(b => { b.className = "btn sm"; box.append(b); }); if (nb) box.append(nb); ph.querySelector(".phrow")?.append(box); ch.remove(); v.querySelector(".legend")?.remove(); } }
      return;
    }
    let det = "";
    const dk = String(DETAIL || ""), dkk = dk.split(":")[0], dki = dk.slice(dkk.length + 1);
    const vp = !DETAIL ? null : dkk === "vara" && window.u1VaraPanel ? u1VaraPanel(dki) : window.UI1D?.[dkk] ? UI1D[dkk](dki) : null;
    if (vp) { DETAIL_K = DETAIL; const k = DETAIL; DETAIL = null; _render(); DETAIL = k; drawMenu(); det = vp; }
    else if (DETAIL) { _render(); det = v.innerHTML; const k = DETAIL; DETAIL = null; _render(); DETAIL = k; drawMenu(); }
    else { full = false; _render(); }
    // Ekkert valið (2.36.0): listinn nær yfir allan skjáinn með fleiri dálkum; spjaldið birtist fyrst þegar atriði er valið (ekki í Pósti)
    const wide = !DETAIL && tab !== "postur"; window.u1Wide = wide && wideScr();
    const list = window.UI1V?.[tab] ? UI1V[tab]() : v.innerHTML, sup = window.UI1V?.[tab] ? "" : SUPER();
    document.body.classList.add("hassplit"); document.body.classList.toggle("spfull", !!DETAIL && full); document.body.classList.toggle("spwide", wide);
    v.innerHTML = `<div class="split${wide ? " nodet" : ""}"><section class="splist" aria-label="Listi">${sup ? `<div class="spsup">${esc(sup)}</div>` : ""}${list}</section>`
      + (wide ? "" : `<section class="spdet" aria-label="Nánar">${DETAIL ? `<button type="button" class="spx" data-ui1="close" aria-label="Loka spjaldi" title="Loka (Esc)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><button type="button" class="spwin" data-ui1="win" aria-label="Opna í nýjum glugga" title="Opna í nýjum glugga (⌘/Ctrl-smellur á línu)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="14" height="14" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v11"/></svg></button><button type="button" class="spexp" data-ui1="exp" aria-label="${full ? "Minnka" : "Stækka"} glugga" title="${full ? "Minnka" : "Stækka"}">${full ? COL : EXP}</button>${det}` : `<div class="spempty">Veldu atriði úr listanum</div>`}</section>`) + `</div>`;
    // Sía efst í listanum (síar línur og spjöld eftir texta)
    const sl = v.querySelector(".splist"), ph = sl.querySelector(".phead");
    // Síuflipar inn í gráa hausinn (eins og á útlitsborðinu) og flýtilyklar neðst
    if (ph) { const lb = sl.querySelector(":scope > .ulbar"); if (lb) ph.append(lb); }
    if (!sl.querySelector(".spfoot")) sl.insertAdjacentHTML("beforeend", `<div class="spfoot">/ sía · ↑↓ fletta · Enter opna · N nýtt</div>`);
    if (tab === "postur") { if (DETAIL) { sl.querySelector(`[data-open="${CSS.escape(String(DETAIL))}"]`)?.classList.add("spsel"); fixDet(v.querySelector(".spdet")); } return; }
    if (fltTab !== tab) { flt = ""; window.u1Q = ""; fltTab = tab; }
    const f = document.createElement("label"); f.className = "spfilt";
    f.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg><input type="search" placeholder="Leita eftir ${esc(SPH[tab] || SPH[secOf(tab).k] || "nafni eða númeri")}…" aria-label="Leita í lista" value="${esc(flt)}"><kbd>/</kbd>`;
    (ph ? ph.after(f) : sl.prepend(f));
    const inp = f.querySelector("input");
    // Leit: í öllum stöðum og flokkum meðan eitthvað er slegið inn (listinn teiknaður aftur þegar leit hefst eða endar), Enter opnar fyrstu, Esc hreinsar
    const reList = () => { const pos = inp.selectionStart; render(); const i2 = document.querySelector(".splist .spfilt input"); if (i2) { i2.focus(); try { i2.setSelectionRange(pos, pos); } catch (e) {} } };
    inp.addEventListener("input", () => { const was = !!String(window.u1Q || "").trim(); flt = inp.value; window.u1Q = flt; if (was !== !!flt.trim() && window.UI1V?.[tab]) reList(); else applyFilt(sl); });
    inp.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); if (flt) { flt = ""; window.u1Q = ""; reList(); } else inp.blur(); }
      if (e.key === "Enter") { e.preventDefault(); const r = [...sl.querySelectorAll("[data-open]")].find(x => x.style.display !== "none" && x.offsetParent); if (r) { r.click(); } }
      if (e.key === "ArrowDown") { e.preventDefault(); inp.blur(); const r = [...sl.querySelectorAll("[data-open]")].find(x => x.style.display !== "none" && x.offsetParent); if (r) r.click(); } });
    sl.classList.toggle("srch", !!flt.trim());
    if (flt.trim() && window.UI1V?.[tab]) sl.querySelector(".spfilt")?.insertAdjacentHTML("afterend", `<div class="srchnote">Leitað í öllum stöðum · Esc hreinsar</div>`);
    applyFilt(sl);
    if (DETAIL) sl.querySelector(`[data-open="${CSS.escape(String(DETAIL))}"]`)?.classList.add("spsel");
    if (DETAIL && !vp) fixDet(v.querySelector(".spdet"));
    const tl = sl.querySelector(".ptitle"), lab = (secOf(tab).tabs.find(t => t[0] === tab) || [])[1]; if (tl && lab && sup) tl.textContent = lab;
  }
  // Stillingar: listi vinstra megin og valin undirsíða hægra megin (eins og á útlitsborðinu)
  function stSplit(v) {
    const sub = window.STSUB || null; window.STSUB = null; _render(); window.STSUB = sub;
    if (typeof STPAGES !== "undefined" && STPAGES.svid && can("stillingar")) { const r = v.querySelector('[data-act="stsub:einingar"]'); if (r && !v.querySelector('[data-act="stsub:svid"]')) r.insertAdjacentHTML("afterend", mrow("stsub:svid", "Svið", { d: STPAGES.svid.d })); }
    v.querySelector(".pback")?.remove();
    // Flatur listi: hópur (Ég/Admin) undir heiti, síuflipar Allt/Ég/Fyrirtækið
    let grp = ""; const f0 = window._stf || "";
    v.querySelectorAll(".mgroup, .mrow").forEach(n => { if (n.matches(".mgroup")) { grp = /admin|fyrirt/i.test(n.textContent) ? "Admin" : /^ég/i.test(n.textContent.trim()) ? "Ég" : n.textContent.trim(); return; }
      const mt = n.querySelector(".mt"); if (mt) { mt.querySelectorAll("small").forEach(x => x.remove()); mt.insertAdjacentHTML("beforeend", `<small>${esc(grp)}</small>`); }
      if (f0 && !(f0 === "eg" ? grp === "Ég" : grp === "Admin")) n.style.display = "none"; });
    const ph0 = v.querySelector(".phead"); if (ph0) ph0.insertAdjacentHTML("beforeend", `<div class="ulbar">${[["", "Allt"], ["eg", "Ég"], ["fyr", "Fyrirtækið"]].map(([k, l]) => `<button type="button" class="uchip${k === f0 ? " on" : ""}" onclick="window._stf='${k}';render()">${l}</button>`).join("")}</div>`);
    // Leit í stillingum: heiti, lýsing og undirkaflar hverrar síðu (STPAGES[k].s)
    const kw = r => { const k = (r.getAttribute("data-act") || "").slice(6), P0 = typeof STPAGES !== "undefined" ? STPAGES[k] : null; return [r.textContent, P0?.l, P0?.d, ...(P0?.s || [])].filter(Boolean).join(" "); };
    v.querySelectorAll(".mrow").forEach(r => r.setAttribute("data-kw", kw(r)));
    if (ph0) ph0.insertAdjacentHTML("afterend", `<label class="spfilt stq"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg><input type="search" id="u1stq" placeholder="Leita í stillingum…" aria-label="Leita í stillingum" value="${esc(window._stq || "")}"><kbd>/</kbd></label>`);
    const list = v.innerHTML;
    const cur = sub;  // ekkert valið þegar Stillingar eru opnaðar
    let det = `<div class="spempty">Veldu stillingu úr listanum</div>`;
    if (cur && typeof STPAGES !== "undefined" && STPAGES[cur]) { window.STSUB = cur; _render(); window.STSUB = sub;
      const ph = v.querySelector(".phead"); const t = STPAGES[cur].l; ph?.remove();
      det = `<div class="udh2"><div class="udl"><div class="spsup">Stillingar${STPAGES[cur].adm ? " · admin" : ""}</div><h2 class="ptitle">${esc(t)}</h2>${STPAGES[cur].d ? `<div class="usub">${esc(STPAGES[cur].d)}</div>` : ""}</div><div class="uact"></div></div><div class="stdet">${v.innerHTML}</div>`; }
    drawMenu();
    document.body.classList.add("hassplit"); document.body.classList.remove("spfull");
    v.innerHTML = `<div class="split"><section class="splist" aria-label="Listi">${list}</section><section class="spdet" aria-label="Nánar">${det}</section></div>`;
    v.querySelector(`.splist [data-act="stsub:${CSS.escape(cur || "")}"]`)?.classList.add("spsel");
    const q = v.querySelector("#u1stq"), apply = () => { const t = fold((window._stq = q.value).trim()); let n = 0; v.querySelectorAll(".splist .mrow").forEach(r => { const hit = !t || fold(r.getAttribute("data-kw") || "").includes(t); if (r.dataset.hid !== "1") r.style.display = hit ? "" : "none"; if (hit && r.style.display !== "none") n++; });
      let e0 = v.querySelector(".splist .stnone"); if (!n && t) { if (!e0) v.querySelector(".splist").insertAdjacentHTML("beforeend", `<div class="uempty stnone">Ekkert fannst.</div>`); } else e0?.remove(); };
    v.querySelectorAll(".splist .mrow").forEach(r => { if (r.style.display === "none") r.dataset.hid = "1"; });
    if (q) { q.addEventListener("input", apply); q.addEventListener("keydown", e => { if (e.key === "Enter") { const r = [...v.querySelectorAll(".splist .mrow")].find(x => x.style.display !== "none"); if (r) { e.preventDefault(); r.click(); } } }); apply(); }
  }
  /* Spjaldið hægra megin í stíl útlitsborðsins: haus með yfirlínu, heiti og aðgerðum; Svið; flipar í réttri röð */
  function fixDet(el) {
    if (!el) return; el.querySelector(".backrow")?.remove();
    const kick = el.querySelector(".kicker"), h = el.querySelector("h2.big"), sub = h?.nextElementSibling?.matches?.("p.sub") ? h.nextElementSibling : null;
    if (!h) return;
    const hd = document.createElement("div"); hd.className = "udh2";
    const kt = kick ? [...kick.querySelectorAll(".nr,.stag")].map(x => x.textContent.trim()).filter(Boolean).join(" · ") : "";
    const pills = kick ? [...kick.querySelectorAll(".pill")].map(x => x.outerHTML).join("") : "";
    hd.innerHTML = `<div class="udl"><div class="spsup">${esc(kt)}</div><h2 class="ptitle">${esc(h.textContent)}</h2><div class="usub">${sub ? sub.innerHTML : ""}${pills ? `<span class="upills">${pills}</span>` : ""}</div></div><div class="uact"></div>`;
    const act = hd.querySelector(".uact");
    const [kind, id] = String(DETAIL).split(":");
    if (kind === "verk") {
      const ks = el.querySelector('[data-act^="kstart:"]'); if (ks) act.append(ks); else if (MCP && ON("timar") && !klukka()) act.insertAdjacentHTML("beforeend", `<button type="button" class="btn primary" data-act="kstart:${esc(id)}">▶ Byrja klukku</button>`);
      if (!el.querySelector('select[aria-label="Staða verkefnis"]') && MCP && findProj(id)) { const pp = findProj(id); act.insertAdjacentHTML("beforeend", `<label class="ustsel">Staða<select aria-label="Staða" onchange="doAct('status:verk:${esc(id)}:'+this.value,this)">${STODUR().filter(x => !x.falin || x.n === pp.stada).map(x => `<option${x.n === pp.stada ? " selected" : ""}>${esc(x.n)}</option>`).join("")}</select></label>`); }
      const ss = el.querySelector('select[aria-label="Staða verkefnis"]'); if (ss) { const w = document.createElement("label"); w.className = "ustsel"; w.textContent = "Staða"; w.append(ss); act.append(w); ss.closest(".fsels")?.remove(); }
      [...el.querySelectorAll(".viewtitle")].find(x => x.textContent.trim() === "Staða verkefnis")?.remove();
      const p = findProj(id);
      if (p && window.svidOf) { const sv = svidOf(p), vf = sv.includes("Þjónusta") ? (p.thjonusta || []) : []; hd.insertAdjacentHTML("beforeend", `<div class="usvid">Svið ${sv.map((x, i) => `<span class="upill${i === 0 ? " dark" : ""}">${sv.length > 1 && i === 0 ? "★ " : ""}${esc(window.svidHeiti ? svidHeiti(x) : x)}</span>`).join("")}${vf.length ? `<span class="usvf">Verkflokkur ${vf.map(x => `<span class="upill">${esc(x)}</span>`).join("")}</span>` : ""}</div>`); }
      if (DTAB === "fundir" && p) { const th = (S?.thraedir || []).filter(t => t.verkefniId === p.id), po = (S?.postar || []).filter(t => t.verkefniId === p.id);
        const body = el.querySelector(".dbody"); if (body) body.insertAdjacentHTML("afterbegin", `<div class="viewtitle" style="margin-top:14px">Póstar · ${th.length + po.length}</div>` + ([...th.map(t => `<a class="ucpr" href="#" data-act="tab:postur"><span><b>✉ ${esc(t.efni || "Póstþráður")}</b><small>tengt ${esc(String(t.tengt || "").slice(0, 10).split("-").reverse().join("."))}${t.af ? " · " + esc(t.af) : ""}</small></span><span class="upill">Póstur</span></a>`), ...po.map(t => `<div class="ucpr"><span><b>✉ ${esc(t.efni || "")}</b><small>${esc(t.fra || "")} · ${esc(String(t.dags || "").slice(0, 10).split("-").reverse().join("."))}</small></span><span class="upill">Eldri póstur</span></div>`)].join("") || `<div class="usub" style="padding:6px 0">Engir póstar tengdir verkefninu. Tengdu póst úr Pósti.</div>`) + `<div class="viewtitle">Fundir</div>`); }
      if ((!DTAB || DTAB === "yfirlit") && p && window.u1VerkYfir) { const kp = el.querySelector(".dbody > .kpis"); if (kp) { const ub = [...kp.children].find(c => /óreikn/i.test(c.textContent)); const v = ub ? (ub.querySelector("b,strong,.n,.kv") || ub.firstElementChild)?.textContent.trim() : ""; kp.outerHTML = u1VerkYfir(p.id, v); } }
      if (p) {
        // Lýsingarlína án merkja (eins og á borðinu): viðskiptavinur · tímabil/skil · staður
        const T = (window.salaAPI?.TB() || []).filter(t => t.verkefniId === p.id && t.fra && t.stada !== "Hafnað").sort((a, b) => String(a.fra).localeCompare(String(b.fra)))[0];
        const parts = [p.vidskiptavinur, T ? u1D.rngIS(T.fra, T.til) : p.skiladagur ? "skil " + u1D.dIS(p.skiladagur) : "", T?.stadsetning].filter(Boolean);
        const us = hd.querySelector(".usub"); if (us) us.textContent = parts.join(" · ");
        const lb = el.querySelector(".lokabtn")?.getAttribute("data-act"); el.querySelector(".lokabtn")?.remove();
        if (MCP) act.insertAdjacentHTML("beforeend", `<details class="umore"><summary aria-label="Fleiri aðgerðir">⋯</summary><div><button type="button" data-act="edit:verk:${esc(p.id)}">✎ Breyta verkefni</button><button type="button" data-act="dtab:stillingar">Stillingar verkefnis</button>${lb ? `<button type="button" data-act="${esc(lb)}">✓ Loka verkefni</button>` : ""}${window.can && can("eyda") ? `<button type="button" class="danger" data-act="del:verk:${esc(p.id)}">Eyða verkefni…</button>` : ""}</div></details>`);
      }
      const nav = el.querySelector(".dtabs");
      const ct = p && window.u1VerkTab && (DTAB === "undir" || DTAB === "fundir") ? u1VerkTab(p, DTAB) : null;
      if (ct !== null && ct !== undefined) { const body = el.querySelector(".dbody"); if (body) body.innerHTML = ct; }
      if (nav) { if (DTAB !== "stillingar") nav.querySelector('[data-act="dtab:stillingar"]')?.remove(); const by = k => nav.querySelector(`[data-act="dtab:${k}"]`); const f = by("fundir"); if (f) { const nth = (S?.thraedir || []).filter(t => t.verkefniId === p?.id).length + (S?.postar || []).filter(t => t.verkefniId === p?.id).length, dc = f.querySelector(".dc"), nf = +(dc?.textContent || 0); f.firstChild.textContent = "Samskipti "; if (dc) dc.textContent = nf + nth; else if (nth) f.insertAdjacentHTML("beforeend", `<span class="dc">${nth}</span>`); }
        ["yfirlit", "undir", "fundir", "tilbod", "timar", "skrar", "stillingar"].map(by).filter(Boolean).forEach(b => nav.append(b)); }
    }
    if (kind === "vsk" && window.u1VskTabs) {
      const r = u1VskTabs(id);
      if (r) { const c = (S?.vidskiptavinir || []).find(x => String(x.id) === String(id));
        if (c) { hd.querySelector(".spsup").textContent = "Viðskiptavinur" + (c.kennitala ? " · kt. " + c.kennitala : ""); const us = hd.querySelector(".usub"); if (us) us.textContent = [c.heimilisfang, [c.postnumer, c.stadur].filter(Boolean).join(" "), c.netfang].filter(Boolean).join(" · "); }
        const ed = el.querySelector('[data-act^="edit:vsk:"]'), nv = [...el.querySelectorAll("button")].find(b => /\+ Verkefni/.test(b.textContent));
        if (ed) act.append(ed); if (nv) { nv.classList.add("primary"); act.append(nv); }
        const kp = el.querySelector(".kpis"), body = el.querySelector(".dbody") || kp?.parentElement;
        if (kp) { const wrap = document.createElement("div"); wrap.className = "uorig"; let n = kp.nextElementSibling; while (n) { const nx = n.nextElementSibling; wrap.append(n); n = nx; }
          kp.insertAdjacentHTML("afterend", r.tabs + (r.body !== null ? `<div class="uvy">${r.body}</div>` : ""));
          if (r.body === null) kp.parentElement.append(wrap); }
      }
    }
    if (kind === "tb" && window.salaAPI) {
      const api = salaAPI, T = [...api.TB(), ...api.PN()].find(x => String(x.id) === id);
      if (T) {
        const sup = kick?.querySelector(".kind")?.textContent.trim(); if (sup) hd.querySelector(".spsup").textContent = sup;
        const ed = el.querySelector('[data-act^="tbed:start"]'), pv = el.querySelector('[data-act^="tbpdf:pv"]');
        if (ed) { ed.classList.remove("primary"); act.append(ed); } if (pv) { pv.textContent = "PDF"; act.append(pv); }
        const fs = el.querySelector(".fsels"), sel = fs?.querySelector("select");
        if (sel) { const w = document.createElement("label"); w.className = "ustsel"; w.textContent = "Staða"; w.append(sel); act.append(w); const kd = fs.previousElementSibling; if (kd?.matches(".kind")) kd.remove(); fs.remove(); }
        const L = T.linur || [], has = t => L.some(l => l.teg === t), sv = [has("leiga") && "Leiga", has("sala") && "Sala", has("vinna") && "Þjónusta"].filter(Boolean);
        if (sv.length) hd.insertAdjacentHTML("beforeend", `<div class="usvid">Svið ${sv.map((x, i) => `<span class="upill${i === 0 ? " dark" : ""}">${esc(window.svidHeiti ? svidHeiti(x) : x)}</span>`).join("")}</div>`);
        const tt = api.totals(T) || {}, isP = !!T.pontun;
        let av = "–", avL = "Búnaður";
        if (has("leiga")) { let miss = 0; L.filter(l => l.teg === "leiga").forEach(l => { const v = api.VR().find(x => String(x.id) === String(l.v)); if (!v || v.tegund === "pakki") return; const cap = (+v.fjoldi || 0) - (window.u1Ovirk ? u1Ovirk(v) : 0), oth = api.upptekid(v.id, T.fra, T.til || T.fra, T.id).max || 0; miss += Math.max(0, (+l.magn || 0) - (cap - oth)); }); av = miss ? miss + " vantar" : "allt laust"; }
        else if (has("sala")) { avL = "Lager"; let miss = 0; L.filter(l => l.teg === "sala").forEach(l => { const v = api.VR().find(x => String(x.id) === String(l.v)); miss += Math.max(0, (+l.magn || 0) - (+v?.fjoldi || 0)); }); av = miss ? miss + " vantar" : "allt á lager"; }
        else { avL = "Vinna"; av = L.reduce((a, l) => a + (/klst/.test(l.ein || "") ? +l.magn || 0 : 0), 0).toLocaleString("de-DE") + " klst."; }
        const dd = x => x ? String(x).slice(0, 10).split("-").reverse().map((v, i) => i < 2 ? +v : v).slice(0, 2).join(".") + "." : "–";
        const kp = (a, b) => `<div class="ukp"><small>${esc(a)}</small><b>${esc(b)}</b></div>`;
        const kpis = `<div class="ukps">${kp("Samtals án VSK", (Math.round(tt.net || 0)).toLocaleString("de-DE") + " kr.")}${isP ? kp("Afhending", dd(T.fra)) : kp("Gildir til", dd(T.gildir))}${kp(avL, av)}</div>`;
        const tab = el.querySelector(".tbtab");
        if (tab) { const tv = el.querySelector(".viewtitle"); const rows = L.map(l => { const dg = l.teg === "leiga" ? (+l.dagar || (T.fra ? Math.max(1, Math.round((new Date(T.til || T.fra) - new Date(T.fra)) / 864e5) + 1) : "")) : ""; return `<div class="utbr"><span>${esc(l.heiti || "")}</span><span>${esc(String(l.magn ?? ""))}${l.ein && l.ein !== "stk." ? " " + esc(l.ein) : ""}</span><span>${dg || ""}</span><span>${(Math.round(api.lSum(l, T) || 0)).toLocaleString("de-DE")} kr.</span></div>`; }).join("");
          tab.outerHTML = `<div class="utb"><div class="utbr h"><span>Lína</span><span>Magn</span><span>Dagar</span><span>Upphæð</span></div>${rows}</div>`; if (tv) tv.remove(); }
        const lk = [...el.querySelectorAll(".links")]; const bottom = lk.find(x => x.querySelector('[data-act^="tbutg:"],[data-act^="tbverk:"],[data-act^="tbdel:"]'));
        const dl = lk.find(x => x.querySelector('[data-act^="tbpdf:dl"]')); if (dl && bottom) { bottom.prepend(...dl.querySelectorAll("button")); dl.remove(); }
        const sumc = el.querySelector(".rksum"); if (bottom && sumc) sumc.after(bottom);
        // Lýsingarlína án merkja; verkefni sem tengill í sviðslínunni; samtölur í einni línu; næsta skref neðst
        const isP2 = !!T.pontun, nD = T.fra ? Math.max(1, Math.round((new Date(T.til || T.fra) - new Date(T.fra)) / 864e5) + 1) : 0;
        const parts = isP2 ? [T.tengilidur || T.vidskiptavinur, T.simi, T.fra ? u1D.rngIS(T.fra, T.til) : ""] : [T.vidskiptavinur || T.tengilidur, T.fra ? u1D.rngIS(T.fra, T.til) : "", has("leiga") && nD ? nD + (nD === 1 ? " dagur" : " dagar") : "", T.stadsetning];
        const us = hd.querySelector(".usub"); if (us) us.textContent = parts.filter(Boolean).join(" · ");
        const pj = [...el.querySelectorAll("p.sub")].find(x => /Verkefni:/.test(x.textContent)); if (pj) { const a = pj.querySelector("a"); const sv = hd.querySelector(".usvid"); if (a && sv) { a.classList.add("usvp"); a.textContent = "Verkefni " + a.textContent + " →"; sv.append(a); } pj.remove(); }
        const sumc2 = el.querySelector(".rksum"); if (sumc2) sumc2.outerHTML = `<div class="utbt"><span>Samtals með VSK</span><b>${(Math.round(tt.tot || 0)).toLocaleString("de-DE")} kr.</b></div>`;
        const bot = [...el.querySelectorAll(".links")].find(x => x.querySelector('[data-act^="tbutg:"],[data-act^="tbverk:"],[data-act^="tbdel:"]'));
        if (bot && MCP) {
          if (isP2) { const NX = { "Ný": ["Staðfesta", "Staðfest"], "Staðfest": ["Afhenda →", "Afhent"], "Afhent": ["Skila →", "Skilað"], "Skilað": ["Loka pöntun", "Lokið"] }[T.stada];
            const conf = T.netfang && window.poCompose ? `<button type="button" class="btn" data-act="u1pnconf:${esc(T.id)}">Senda staðfestingu</button>` : "";
            bot.insertAdjacentHTML("afterbegin", (NX ? `<button type="button" class="btn primary" data-act="tbst:${esc(T.id)}:${esc(NX[1])}">${esc(NX[0])}</button>` : "") + conf); }
          else { const sd = bot.querySelector('[data-act^="tbsend:"]'); if (sd) { sd.classList.add("primary"); bot.prepend(sd); } }
          act.insertAdjacentHTML("beforeend", `<details class="umore"><summary aria-label="Fleiri aðgerðir">⋯</summary><div><button type="button" data-act="tbpdf:save:${esc(T.id)}">Vista PDF…</button>${isP2 ? `<button type="button" data-act="tbpdf:pv:${esc(T.id)}">Forskoða PDF</button>` : ""}</div></details>`);
          const del = bot.querySelector('[data-act^="tbdel:"]'); if (del) act.querySelector(".umore>div").append(del);
          bot.querySelector('[data-act^="tbpdf:dl"]')?.replaceWith(Object.assign(document.createElement("button"), { type: "button", className: "btn", textContent: "Vista PDF…", onclick: () => doAct("tbpdf:save:" + T.id) }));
        }
        hd._top = kpis;
      }
    }
    if (kind === "vara" && window.u1VaraTop) {
      const top = u1VaraTop(id);
      if (top) {
        // fjarlægja gamla verðspjaldið og Útleigu-hlutann; Breyta/Eyða í hausinn
        el.querySelector(".card")?.matches(".card") && [...el.querySelectorAll(":scope > .card")].slice(0, 1).forEach(c => c.querySelector(".sub-i") && c.remove());
        const ut = [...el.querySelectorAll(".viewtitle")].find(x => x.textContent.trim() === "Útleiga");
        if (ut) { let n = ut.nextElementSibling; ut.remove(); while (n && !n.matches(".viewtitle")) { const nx = n.nextElementSibling; n.remove(); n = nx; } }
        const lk = [...el.querySelectorAll(".links")].find(x => x.querySelector('[data-act^="vrnew:"]')); if (lk) { act.append(...lk.querySelectorAll("button")); lk.remove(); }
        const vv = window.salaAPI?.VR().find(x => String(x.id) === id);
        if (vv?.tegund === "vinna") { [...el.querySelectorAll(".viewtitle")].filter(x => /^Á tilboðum/.test(x.textContent.trim())).forEach(t => { let n = t.nextElementSibling; t.remove(); while (n && !n.matches(".viewtitle,.links,.cmbox")) { const nx = n.nextElementSibling; n.remove(); n = nx; } }); }
        hd._top = `<div class="utop">${top}</div>`;
      }
    }
    (kick || h).before(hd); kick?.remove(); h.remove(); sub?.remove();
    if (hd._top) { const sb = hd.nextElementSibling?.matches?.("p.sub") ? hd.nextElementSibling : hd; sb.insertAdjacentHTML("afterend", hd._top); }
  }
  // Leit í listum: aðeins eftir númeri og heiti (heiti, viðskiptavinur, tengiliður) – ekki dagsetningum, stöðum eða upphæðum
  const keyText = n => {
    if (n.matches(".urow")) { const c = n.children; const t = n.querySelector(".t"); return [c[0]?.matches(".t") ? "" : c[0]?.textContent, t?.textContent].filter(Boolean).join(" "); }
    if (n.matches(".lrow")) return [n.querySelector(".nr")?.textContent, n.querySelector(".lt")?.textContent].filter(Boolean).join(" ");
    if (n.matches(".porow")) return [n.querySelector(".pofrom")?.textContent, n.querySelector(".ls")?.textContent].filter(Boolean).join(" ");
    return n.textContent;
  };
  function applyFilt(sl) {
    const q = fold(flt.trim()), rows = sl.querySelectorAll(".urow,.lrow,.vrow,.row,.item,.porow,tr");
    rows.forEach(n => { if (n.closest(".phead,.spfilt") || n.matches(".ucols")) return; n.style.display = !q || fold(keyText(n)).includes(q) ? "" : "none"; });
    // fela hópfyrirsagnir sem standa eftir tómar
    sl.querySelectorAll(".ugrp").forEach(g => { let x = g.nextElementSibling, any = false; while (x && !x.matches(".ugrp")) { if (x.style.display !== "none" && (x.matches(".urow,.lrow,.porow"))) { any = true; break; } x = x.nextElementSibling; } g.style.display = !q || any ? "" : "none"; });
    let e0 = sl.querySelector(".fltnone"), vis = [...rows].some(n => n.style.display !== "none" && !n.closest(".phead"));
    if (q && !vis) { if (!e0) sl.querySelector(".spfoot")?.insertAdjacentHTML("beforebegin", `<div class="uempty fltnone">Ekkert fannst fyrir „${esc(flt.trim())}“.</div>`); } else e0?.remove();
  }

  // Upphafsskjár (2.52.0): dagleg samantekt – dagskrá dagsins, tímar, skil framundan og pantanir. Atrium-merkið lítið í horninu.
  function startHTML() {
    const P = ["0,0 72,0 58,14 0,14", "0,14 58,14 72,28 0,28", "72,0 72,28 58,14", "100,0 100,72 86,58 86,0", "86,0 86,58 72,72 72,0", "100,72 72,72 86,58",
      "100,100 28,100 42,86 100,86", "100,86 42,86 28,72 100,72", "28,100 28,72 42,86", "0,100 0,28 14,42 14,100", "14,100 14,42 28,28 28,100", "0,28 28,28 14,42"];
    const mark = `<svg class="uwire usmall" viewBox="-4 -4 108 108" aria-hidden="true">${P.map(pt => `<polygon points="${pt}"/>`).join("")}</svg>`;
    const ver = `<div class="uver">Atrium ${esc(typeof APP_VERSION !== "undefined" ? APP_VERSION : "")}</div>`;
    if (!S) return `<div class="ustart">${mark}${ver}</div>`;
    const tr = f => { try { return f(); } catch (e) { return null; } };
    const now = new Date(), iso = x => tr(() => isoDay(x)) || "", t = iso(now), hr = now.getHours();
    const DN = ["Sunnudagur", "Mánudagur", "Þriðjudagur", "Miðvikudagur", "Fimmtudagur", "Föstudagur", "Laugardagur"], MN = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
    const greet = hr < 5 ? "Góða nótt" : hr < 11 ? "Góðan daginn" : hr < 18 ? "Góðan dag" : "Gott kvöld";
    const nm = String(window.USER?.nafn || "").split(/\s+/)[0];
    const sk = tr(() => ME()) || "", F = tr(() => faerslur()) || [], hm = w => { const m = String(w || "").match(/T(\d\d:\d\d)/); return m ? m[1] : ""; };
    const H = n => (Math.round((+n || 0) * 10) / 10).toLocaleString("is-IS");
    const mon = tr(() => iso(mondayOf(now))) || t;
    const mine = F.filter(e => (e.starfsmadur || "") === sk);
    const hToday = mine.filter(e => String(e.date || "").slice(0, 10) === t).reduce((a, e) => a + (+e.timar || 0), 0);
    const hWeek = mine.filter(e => { const x = String(e.date || "").slice(0, 10); return x >= mon && x <= t; }).reduce((a, e) => a + (+e.timar || 0), 0);
    const goal = +(tr(() => CFG().vikumark)) || 40;
    const cal = tr(() => calItems()) || new Map(), PN = window.salaAPI?.PN?.() || [];
    // Dagskrá dagsins: fundir, skil og viðburðir + afhendingar og skil pantana
    const ag = [];
    (cal.get(t) || []).filter(i => !i.span && !i.done).forEach(i => ag.push({ time: hm(i.when), title: i.title || "", sub: [i.kind, i.nr].filter(Boolean).join(" · "), open: i.open, t: i.t }));
    PN.forEach(Pn => {
      if (Pn.fra && String(Pn.fra).slice(0, 10) === t && ["Ný", "Staðfest"].includes(Pn.stada)) ag.push({ time: hm(Pn.fra), title: (Pn.nr || "") + " " + (Pn.heiti || ""), sub: "Afhending · " + (Pn.tengilidur || Pn.vidskiptavinur || ""), open: "tb:" + Pn.id, t: "pn" });
      const til = String(Pn.til || Pn.fra || "").slice(0, 10);
      if (Pn.stada === "Afhent" && til && til <= t) ag.push({ time: hm(Pn.til), title: (Pn.nr || "") + " " + (Pn.heiti || ""), sub: (til < t ? "Skil – komið fram yfir · " : "Skil · ") + (Pn.tengilidur || Pn.vidskiptavinur || ""), open: "tb:" + Pn.id, t: "pn", late: til < t });
    });
    ag.sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
    // Skil næstu 7 daga (verkefni og undirverk)
    const soon = []; for (let k = 1; k <= 7; k++) { const x = new Date(now); x.setDate(x.getDate() + k); const ix = iso(x);
      (cal.get(ix) || []).filter(i => (i.t === "skil" || i.t === "undir") && !i.done).forEach(i => soon.push({ d: x, ...i })); }
    const late = (tr(() => verkefni()) || []).filter(p => p.skiladagur && String(p.skiladagur).slice(0, 10) < t && !tr(() => isDone(p)));
    const newPn = PN.filter(x => x.stada === "Ný");
    const unread = tr(() => window.spUnread?.()) || 0;
    const rel = x => { const n = Math.round((new Date(iso(x)) - new Date(t)) / 864e5); return n === 1 ? "Á morgun" : DN[x.getDay()].slice(0, 3) + " " + x.getDate() + "."; };
    const row = (o, a, b, c, cls = "") => `<a class="dsr${cls}" ${o ? (o.startsWith("tab:") ? `data-act="${esc(o)}"` : `data-open="${esc(o)}"`) + ` role="button" tabindex="0"` : ""}><span class="dst">${esc(a || "–")}</span><span class="dsx"><b>${esc(b)}</b>${c ? `<small>${esc(c)}</small>` : ""}</span></a>`;
    const box = (h, n, body, empty, more) => `<section class="dsb"><div class="dsh"><span>${h}</span>${n ? `<i>${n}</i>` : ""}${more || ""}</div>${body || `<div class="dse">${empty}</div>`}</section>`;
    const kpi = (l, v, sub, warn) => `<div class="dsk${warn ? " warn" : ""}"><small>${l}</small><b>${v}</b>${sub ? `<span>${sub}</span>` : ""}</div>`;
    const att = [];
    if (late.length) att.push(row("tab:verk", "!", late.length + (late.length === 1 ? " verkefni" : " verkefni") + " komin fram yfir skil", late.slice(0, 3).map(p => p.nr + " " + (p.stutt || "")).join(" · "), " late"));
    if (newPn.length) att.push(row("tab:pantanir", "Ný", newPn.length + (newPn.length === 1 ? " pöntun bíður" : " pantanir bíða") + " staðfestingar", newPn.slice(0, 3).map(x => x.nr + " " + (x.heiti || "")).join(" · ")));
    if (unread) att.push(row("tab:spjall", "✉", unread + " ólesin skilaboð", "Spjall"));
    return `<div class="ustart udash">
      <div class="dshd"><div><span class="dsl">${DN[now.getDay()]} ${now.getDate()}. ${MN[now.getMonth()]}</span><h1>${greet}${nm ? ", " + esc(nm) : ""}</h1></div>${mark}</div>
      <div class="dsks">${kpi("Í dag", H(hToday) + " klst.", "skráð")}${kpi("Vikan", H(hWeek) + " <small>/ " + H(goal) + " klst.</small>", `<span class="dsbar"><i style="width:${Math.min(100, hWeek / goal * 100)}%"></i></span>`)}${kpi("Dagskrá", ag.length, ag.length === 1 ? "atriði í dag" : "atriði í dag")}${kpi("Skil næstu 7 daga", soon.length, late.length ? late.length + " komin fram yfir" : "", late.length)}</div>
      <div class="dsgrid">
        ${box("Dagskrá dagsins", ag.length, ag.map(a => row(a.open, a.time, a.title, a.sub, a.late ? " late" : "")).join(""), "Ekkert á dagskrá í dag.")}
        <div class="dscol">
          ${att.length ? box("Þarf athygli", att.length, att.join(""), "") : ""}
          ${box("Skil framundan", soon.length, soon.slice(0, 8).map(i => row(i.open, rel(i.d), i.title, [i.kind, i.nr].filter(Boolean).join(" · "))).join(""), "Engin skil næstu 7 daga.")}
        </div>
      </div>${ver}</div>`;
  }

  // Fleiri gluggar (2.33.0): staða hvers glugga í slóðinni (#t=flipi&o=atriði&d=undirflipi) – opna í nýjum glugga og muna stað við endurhleðslu
  const winHash = (t, o, dt) => "#t=" + encodeURIComponent(t || "") + (o ? "&o=" + encodeURIComponent(o) : "") + (o && dt && dt !== "yfirlit" ? "&d=" + encodeURIComponent(dt) : "");
  const winUrl = (t, o, dt) => location.pathname + location.search + winHash(t, o, dt);
  const fromHash = () => { const m = location.hash.match(/^#t=([^&]*)(?:&o=([^&]*))?(?:&d=([^&]*))?/); if (!m) return false; const t = decodeURIComponent(m[1] || ""); if (!t) return false;
    tab = t; DETAIL = m[2] ? decodeURIComponent(m[2]) : null; if (m[3]) DTAB = decodeURIComponent(m[3]); return true; };
  let _wk = "";
  const syncHash = () => { if (!desk()) return; const h = tab === "upphaf" ? "" : winHash(tab, DETAIL, DTAB); if (h === _wk) return; _wk = h; try { history.replaceState(history.state, "", location.pathname + location.search + h); } catch (e) {} };
  window.u1OpenWin = (t, o, dt) => { const w = window.open(winUrl(t, o, dt), "atrium-" + Date.now(), "popup,width=1280,height=860"); if (!w) toast?.("Leyfðu sprettiglugga til að opna í nýjum glugga"); };
  // ⌘/Ctrl-smellur eða miðjusmellur á línu opnar atriðið í nýjum glugga
  const winClick = e => { const r = e.target.closest?.("[data-open]"); if (!r || !document.body.classList.contains("ui1") || !desk()) return;
    if (!(e.metaKey || e.ctrlKey || e.button === 1)) return; e.preventDefault(); e.stopImmediatePropagation(); u1OpenWin(tab, r.getAttribute("data-open")); };
  document.addEventListener("click", winClick, true); document.addEventListener("auxclick", e => { if (e.button === 1) winClick(e); }, true);
  document.addEventListener("mousedown", e => { if (e.button === 1 && e.target.closest?.("[data-open]")) e.preventDefault(); }, true);
  document.addEventListener("click", e => { const b = e.target.closest('[data-ui1="win"]'); if (!b) return; u1OpenWin(tab, DETAIL, DTAB); });
  if (!(desk() && fromHash()) && wideScr()) { tab = "upphaf"; }
  // Smellt aftur á opinn yfirflokk: hann lokast og upphafsskjárinn birtist
  document.addEventListener("click", e => { const b = e.target.closest('#sitems .tab:not(.tsub)[aria-current="page"]'); if (!b || !document.body.classList.contains("ui1") || !wideScr()) return; e.preventDefault(); e.stopImmediatePropagation(); DETAIL = null; window.STSUB = null; tab = "upphaf"; render(); }, true);
  document.addEventListener("click", e => { const b = e.target.closest(".side .cobrand, .side .logo"); if (!b || !document.body.classList.contains("ui1") || !wideScr()) return; e.preventDefault(); e.stopImmediatePropagation(); DETAIL = null; window.STSUB = null; tab = "upphaf"; render(); }, true);
  // Til baka (2.38.0): saga yfir skjái og spjöld sem opnuð eru (flipi, atriði, undirflipi, stillingasíða); ← Til baka, Alt+← og bakhnappur músar
  const NAV = []; let navLast = null, navBusy = false;
  const navNow = () => ({ tab, o: DETAIL || null, d: (typeof DTAB !== "undefined" && DETAIL ? DTAB : null) || null, st: window.STSUB || null });
  const navKey = x => x ? [x.tab, x.o, x.d, x.st].join("|") : "";
  const navTrack = () => { if (!desk() || !document.body.classList.contains("ui1")) return; const n = navNow();
    if (navBusy) { navBusy = false; navLast = n; return; }
    // Hliðarskref (2.47.2) fara ekki í söguna: að skipta um svið/undirflipa innan sama hluta (Leiga · Sala · Þjónusta …)
    // eða um flipa á sama spjaldi. „Til baka“ fer þá þangað sem hlutinn eða spjaldið var opnað frá (t.d. Meira eða listinn).
    const lateral = navLast && (!n.o && !navLast.o && n.st === navLast.st && secOf(n.tab) === secOf(navLast.tab)) || (n.o && n.o === navLast?.o && n.tab === navLast?.tab);
    if (navLast && navKey(n) !== navKey(navLast)) { if (n.tab === "upphaf") NAV.length = 0; else if (!lateral) { NAV.push(navLast); if (NAV.length > 60) NAV.shift(); } }
    navLast = n; };
  const navBtn = () => { document.querySelectorAll("#view .uback").forEach(x => x.remove()); if (!NAV.length || tab === "upphaf" || !desk()) return;
    const prev = NAV[NAV.length - 1], lab = (secOf(prev.tab)?.tabs || []).find(t => t[0] === prev.tab)?.[1] || "";
    const btn = `<button type="button" class="uback" data-ui1="back" title="Til baka${lab ? " – " + esc(lab) : ""} (Alt+←)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>Til baka</button>`;
    const det = DETAIL && document.querySelector("#view .spdet"), ph = document.querySelector("#view .phead, #view .uhead > div:first-child");
    if (det) det.insertAdjacentHTML("afterbegin", btn); else if (ph) ph.insertAdjacentHTML("afterbegin", btn); else document.getElementById("view")?.insertAdjacentHTML("afterbegin", btn); };
  // Skrunstaða (2.50.7): hver staður í sögunni man hvar var skrunað – „Til baka“ fer þangað aftur, ekki efst
  document.addEventListener("scroll", e => { if (!navLast || navBusy) return; const t = e.target;
    if (t === document || t === document.documentElement || t === document.scrollingElement) navLast.y = window.scrollY;
    else if (t?.classList?.contains("splist")) navLast.ly = t.scrollTop;
    else if (t?.id === "view" || t?.classList?.contains("spdet")) navLast.vy = t.scrollTop; }, { capture: true, passive: true });
  const navRestore = p => { const go = () => { if (p.y != null) window.scrollTo(0, p.y);
      const sl = document.querySelector("#view .splist"); if (sl && p.ly != null) sl.scrollTop = p.ly;
      const sd = document.querySelector("#view .spdet") || document.getElementById("view"); if (sd && p.vy != null) sd.scrollTop = p.vy; };
    requestAnimationFrame(() => { go(); requestAnimationFrame(go); }); setTimeout(go, 120); };
  window.u1Back = () => { const prev = NAV.pop(); if (!prev) return false; navBusy = true; tab = prev.tab; DETAIL = prev.o; if (prev.d && typeof DTAB !== "undefined") DTAB = prev.d; window.STSUB = prev.st; full = false; render(); navRestore(prev); return true; };
  document.addEventListener("click", e => { if (!e.target.closest?.('[data-ui1="back"]')) return; e.preventDefault(); u1Back(); });
  document.addEventListener("keydown", e => { if (e.altKey && e.key === "ArrowLeft" && document.body.classList.contains("ui1") && desk() && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) { if (u1Back()) e.preventDefault(); } });
  document.addEventListener("mouseup", e => { if (e.button === 3 && document.body.classList.contains("ui1") && desk() && NAV.length) { e.preventDefault(); u1Back(); } });
  const _ri = renderI; renderI = function () { const r = _ri.apply(this, arguments); syncHash(); try { navTrack(); navBtn(); } catch (e) {} return r; };
  window.render = renderI; try { render = renderI; } catch (e) {}

  document.addEventListener("click", e => { const b = e.target.closest('[data-ui1="exp"]'); if (!b) return; full = !full; render(); });
  // Loka spjaldi: listinn fer aftur yfir allan skjáinn
  const closeDet = () => { DETAIL = null; full = false; render(); };
  document.addEventListener("click", e => { const b = e.target.closest('[data-ui1="close"]'); if (!b) return; closeDet(); });
  // Smellt aftur á valið atriði í listanum: spjaldið lokast og stóri listinn birtist aftur
  document.addEventListener("click", e => { if (!DETAIL || !desk() || !document.body.classList.contains("ui1") || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    const r = e.target.closest?.(".splist [data-open]"); if (!r || e.target.closest("button, a, input, select, label") && e.target.closest("button, a, input, select, label") !== r) return;
    if (r.getAttribute("data-open") !== String(DETAIL)) return; e.preventDefault(); e.stopImmediatePropagation(); closeDet(); }, true);
  document.addEventListener("keydown", e => { if (e.key !== "Escape" || !DETAIL || !document.body.classList.contains("hassplit") || !document.querySelector(".split .spdet") || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) return; const sw = document.getElementById("sheetwrap"); if (sw && !sw.hidden) return; if (document.querySelector("dialog[open], .modal.open")) return; e.preventDefault(); closeDet(); });
  // Flýtilyklar í listum: ↑↓ fletta, Enter opna, N nýtt
  document.addEventListener("keydown", e => {
    if (!document.body.classList.contains("hassplit") || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "") || e.metaKey || e.ctrlKey || e.altKey) return; const sw = document.getElementById("sheetwrap"); if (sw && !sw.hidden) return;
    const rows = [...document.querySelectorAll(".splist [data-open]")].filter(r => r.offsetParent); if (!rows.length) return;
    const cur = rows.findIndex(r => r.classList.contains("spsel"));
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const i = Math.max(0, Math.min(rows.length - 1, cur + (e.key === "ArrowDown" ? 1 : -1))); rows[i].click(); setTimeout(() => document.querySelector(".splist .spsel")?.scrollIntoView({ block: "nearest" }), 30); }
    else if (e.key === "Enter" && cur < 0) { e.preventDefault(); rows[0].click(); }
    else if ((e.key === "n" || e.key === "N") && document.querySelector('.splist .phead [data-act^="fabnew"], .splist .phead .pnew')) { e.preventDefault(); document.querySelector('.splist .phead [data-act^="fabnew"], .splist .phead .pnew').click(); }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "") && document.querySelector(".spfilt input")) { e.preventDefault(); const i = document.querySelector(".spfilt input"); i.focus(); i.select?.(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { const q = document.getElementById("topq"); if (q) { e.preventDefault(); q.focus(); } }
  });
  window.addEventListener("resize", () => { clearTimeout(renderI._r); renderI._r = setTimeout(() => S && render(), 200); });

  /* ---------- Tilboð eftir sviði (síað eftir línutegund) ---------- */
  const A = () => window.salaAPI;
  const tbView = f => () => { A()?.tbLina(f); return window.VIEWS_EXT.ltilbod_i(); };
  if (window.VIEWS_EXT?.ltilbod) {
    VIEWS_EXT.ltilbod_i = VIEWS_EXT.ltilbod;
    Object.assign(VIEWS_EXT, { ltilbod: tbView(""), tbl: tbView("leiga"), tbs: tbView("sala"), tbt: tbView("vinna"), vyfir: () => vYfirVL() });
    ["tbl", "tbs", "tbt"].forEach(k => { if (window.NEWBTN && NEWBTN.ltilbod) NEWBTN[k] = NEWBTN.ltilbod; if (window.FAB_EXT?.ltilbod) FAB_EXT[k] = FAB_EXT.ltilbod; });
    ["tbl", "tbs", "tbt"].forEach(k => LIST.add(k));
  }

  /* ---------- Vörulisti › Yfirlit: leiga, sala og þjónusta (úr samþykktum tilboðum og pöntunum) ---------- */
  const MN = ["jan", "feb", "mar", "apr", "maí", "jún", "júl", "ágú", "sep", "okt", "nóv", "des"];
  const krM = n => (n / 1e6).toFixed(1).replace(".", ",") + " m.kr.";
  const krs = n => Math.round(n).toLocaleString("de-DE") + " kr.";
  function vYfirVL() {
    const api = A(); if (!api) return `<div class="empty">Vörulistinn er ekki virkur.</div>`;
    const now = new Date(), mon = []; for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); mon.push({ k: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"), l: MN[d.getMonth()], L: 0, S: 0, V: 0 }); }
    const byK = Object.fromEntries(mon.map(m => [m.k, m]));
    const docs = [...api.TB().filter(T => T.stada === "Samþykkt"), ...api.PN().filter(P => P.stada !== "Ný")];
    docs.forEach(T => { const k = String(T.fra || T.dags || "").slice(0, 7), m = byK[k]; if (!m) return;
      (T.linur || []).forEach(l => { const v = api.lSum(l, T) || 0; if (l.teg === "leiga") m.L += v; else if (l.teg === "sala") m.S += v; else m.V += v; }); });
    const tot = mon.reduce((a, m) => ({ L: a.L + m.L, S: a.S + m.S, V: a.V + m.V }), { L: 0, S: 0, V: 0 });
    const opin = api.TB().filter(T => T.stada === "Sent" || T.stada === "Drög"), opinV = opin.reduce((a, T) => a + (T.linur || []).reduce((b, l) => b + (api.lSum(l, T) || 0), 0), 0);
    const VR = api.VR(), lei = VR.filter(v => api.vDeild(v) === "leiga" && v.tegund !== "vinna" && v.tegund !== "pakki"), sol = VR.filter(v => api.vDeild(v) === "sala" && v.tegund !== "vinna");
    const lagV = sol.reduce((a, v) => a + (+v.fjoldi || 0) * (+v.innkaupsverd || +v.soluverd || 0), 0);
    // Nýting næstu 30 daga: frátekið hæsta dagsgildi á móti fjölda
    const iso = d => d.toISOString().slice(0, 10), f0 = iso(now), f1 = iso(new Date(now.getTime() + 30 * 864e5));
    const nyt = lei.map(v => { const u = api.upptekid(v.id, f0, f1); return { v, max: u.max, n: u.bs.length, cap: +v.fjoldi || 0 }; });
    const full = nyt.filter(x => x.cap && x.max >= x.cap).sort((a, b) => b.n - a.n), most = nyt.filter(x => x.n).sort((a, b) => b.n - a.n || b.max / (b.cap || 1) - a.max / (a.cap || 1));
    const lag = sol.filter(v => (+v.fjoldi || 0) <= 2).sort((a, b) => (+a.fjoldi || 0) - (+b.fjoldi || 0));
    const mx = Math.max(1, ...mon.map(m => m.L + m.S + m.V)), H = 110;
    const bars = mon.map((m, i) => { const t = m.L + m.S + m.V, h = v => Math.max(v ? 2 : 0, Math.round(v / mx * H));
      return `<div class="vyb"><span class="vyv${i === 11 ? " on" : ""}">${t ? (t / 1e6).toFixed(1).replace(".", ",") : ""}</span><div class="vys"><i style="height:${h(m.V)}px;background:#9DB7D3"></i><i style="height:${h(m.S)}px;background:#5E86B3"></i><i style="height:${h(m.L)}px;background:#1F5A96"></i></div><span class="vyl">${m.l}</span></div>`; }).join("");
    const kpi = (l, v) => `<div class="vyk"><small>${l}</small><b>${v}</b></div>`;
    const card = (t, hint, rows, empty) => `<section class="card vyc"><h3>${t}</h3><div class="vyh">${hint}</div>${rows.length ? rows.map(([a, b]) => `<div class="vyr"><span>${a}</span><span>${b}</span></div>`).join("") : `<div class="vyh">${empty}</div>`}</section>`;
    const sw = (c, t) => `<span class="vysw"><i style="background:${c}"></i>${t}</span>`;
    return `<div class="vyk6">${kpi("Tekjur 12 mán.", krM(tot.L + tot.S + tot.V))}${kpi("Leiga", krM(tot.L))}${kpi("Sala", krM(tot.S))}${kpi("Þjónusta", krM(tot.V))}${kpi("Opin tilboð", krM(opinV))}${kpi("Lagervirði sölu", krM(lagV))}</div>
      <section class="card vyc"><div class="vyt"><h3>Tekjur á mánuði <span class="vyh">· m.kr. · samþykkt tilboð og pantanir</span></h3><span>${sw("#1F5A96", "Leiga")}${sw("#5E86B3", "Sala")}${sw("#9DB7D3", "Þjónusta")}</span></div><div class="vybars">${bars}</div></section>
      <div class="vy3">${card("Mest bókað", "Næstu 30 dagar", most.slice(0, 4).map(x => [esc(x.v.heiti), `${x.n} bókanir · ${x.max} af ${x.cap}`]), "Engar bókanir framundan.")}
      ${card("Uppbókað", "Íhuga að kaupa fleiri", full.slice(0, 4).map(x => [esc(x.v.heiti), `<span class="vyred">${x.max} af ${x.cap}</span>`]), "Ekkert uppbókað næstu 30 daga.")}
      ${card("Lítið á lager", "Söluvörur með 2 eða færri", lag.slice(0, 4).map(v => [esc(v.heiti), `<span class="${(+v.fjoldi || 0) === 0 ? "vyred" : ""}">${+v.fjoldi || 0} stk.</span>`]), "Allt í lagi.")}
      ${card("Opin tilboð", "Send eða í drögum", opin.slice(0, 4).map(T => [`<span class="nr">${esc(T.nr || "")}</span> ${esc(T.heiti || "")}`, krs((T.linur || []).reduce((b, l) => b + (api.lSum(l, T) || 0), 0))]), "Engin opin tilboð.")}
      ${card("Leigubúnaður", "Í vörulista", [["Tæki", lei.length], ["Stykki alls", lei.reduce((a, v) => a + (+v.fjoldi || 0), 0)], ["Pakkar", VR.filter(v => v.tegund === "pakki").length]], "")}
      ${card("Söluvörur", "Í vörulista", [["Vörur", sol.length], ["Á lager alls", sol.reduce((a, v) => a + (+v.fjoldi || 0), 0) + " stk."], ["Lagervirði", krs(lagV)]], "")}</div>`;
  }

  /* ---------- Heim: samantekt án spjaldanna efst, merki fyrirtækisins neðst ---------- */
  const _heim = window.vHeim2;
  if (_heim) window.vHeim2 = function () {
    const l = ORG.merki || ORG.logo || {}, src = l.ljos || l.dokk || "";
    const k = klukka ? klukka() : null, g = +CFG().vikumark || 40, wk = (weekSum(0, STARFS().length > 1 ? ME() : null, true) || 0) + (k && window.liveWeekH ? liveWeekH(k.start) : 0);
    const bar = ON("timar") ? `<div class="usum"><div><small>Vikan þín</small><b>${num(Math.round(wk * 10) / 10)} <small>af ${num(g)} klst.</small></b></div><div class="usb"><div class="ubar"><i style="width:${Math.min(100, wk / g * 100)}%"></i></div><div class="usl"><span>${num(Math.max(0, Math.round((g - wk) * 10) / 10))} klst. eftir af vikunni</span><span><a href="#" data-act="tab:timar">Opna vikuna →</a></span></div></div></div>` : "";
    return _heim().replace(/Bíður þín/g, "Óklárað").replace('<div class="h2grid3">', bar + '<div class="h2grid3">') + (src ? `<div class="h2logo"><img src="${esc(src)}" alt="${esc(ORG.nafn || "")}"></div>` : "");
  };
})();
