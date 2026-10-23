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
  if (T) { const i = T.tabs.findIndex(t => t[0] === "ltilbod"); if (i >= 0) T.tabs.splice(i, 1, ["ltilbod", "Öll tilboð"], ["tbl", "Leiga"], ["tbs", "Sala"], ["tbt", "Þjónusta"]); }
  if (B) B.tabs.unshift(["vyfir", "Yfirlit"]);
  Object.assign(window.TAB_EIN = window.TAB_EIN || {}, { tbl: ["tilbod", "leiga"], tbs: ["tilbod", "sala"], tbt: "tilbod", vyfir: "bunadur" });
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
        h += `<div class="tsubs">${vis.map(([k, l]) => `<button type="button" class="tab tsub" data-tab="${k}"${k === act ? ' aria-current="true"' : ""}>${esc(["Leiga", "Sala", "Þjónusta"].includes(l) && window.svidHeiti ? svidHeiti(l) : l)}</button>`).join("")}</div>`;
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
  const PH = { verkefni: "verkefni", vsk: "viðskiptavini", tilbod: "tilboð", pantanir: "pantanir", lvorur: "búnað", svorur: "vörur", vvinna: "þjónustu", fundir: "fundi", tfaer: "færslur", trk: "reikninga", fjarmal: "reikninga", undir: "undirverk", heim: "lista" };
  let full = false, flt = "";
  const _render = window.render || render;
  function renderI() {
    const v = document.getElementById("view");
    if (!desk() || !S || !LIST.has(tab)) {
      document.body.classList.remove("hassplit", "spfull"); _render();
      if (desk() && S && !DETAIL && window.UI1V?.[tab]) { v.innerHTML = UI1V[tab](); return; }
      if (tab === "stillingar" && !window.STSUB && typeof STPAGES !== "undefined" && STPAGES.svid && can("stillingar")) { const r = v.querySelector('[data-act="stsub:einingar"]'); if (r && !v.querySelector('[data-act="stsub:svid"]')) r.insertAdjacentHTML("afterend", mrow("stsub:svid", "Svið", { d: STPAGES.svid.d })); }
      // Yfirflokkur í smáu letri fyrir ofan heiti undirsíðu (t.d. Tímar › Vikan)
      const sup = desk() && S && !DETAIL ? SUPER() : "", ph = v.querySelector(".phead"), tl = ph?.querySelector(".ptitle"), lab = (secOf(tab).tabs.find(t => t[0] === tab) || [])[1];
      if (sup && tl && lab) { tl.textContent = lab; ph.insertAdjacentHTML("afterbegin", `<div class="spsup">${esc(sup)}</div>`); }
      return;
    }
    let det = "";
    if (DETAIL) { _render(); det = v.innerHTML; const k = DETAIL; DETAIL = null; _render(); DETAIL = k; drawMenu(); }
    else { full = false; _render(); }
    const list = window.UI1V?.[tab] ? UI1V[tab]() : v.innerHTML, sup = window.UI1V?.[tab] ? "" : SUPER();
    document.body.classList.add("hassplit"); document.body.classList.toggle("spfull", !!DETAIL && full);
    v.innerHTML = `<div class="split"><section class="splist" aria-label="Listi">${sup ? `<div class="spsup">${esc(sup)}</div>` : ""}${list}</section>`
      + `<section class="spdet" aria-label="Nánar">${DETAIL ? `<button type="button" class="spexp" data-ui1="exp" aria-label="${full ? "Minnka" : "Stækka"} glugga" title="${full ? "Minnka" : "Stækka"}">${full ? COL : EXP}</button>${det}` : `<div class="spempty">Veldu atriði úr listanum</div>`}</section></div>`;
    // Sía efst í listanum (síar línur og spjöld eftir texta)
    const sl = v.querySelector(".splist"), ph = sl.querySelector(".phead");
    const f = document.createElement("label"); f.className = "spfilt";
    f.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 5h18M6 12h12M10 19h4"/></svg><input type="search" placeholder="Sía ${esc(PH[tab] || PH[secOf(tab).k] || "lista")}…" aria-label="Sía lista" value="${esc(flt)}"><kbd>/</kbd>`;
    (ph ? ph.after(f) : sl.prepend(f));
    const inp = f.querySelector("input"); inp.addEventListener("input", () => { flt = inp.value; applyFilt(sl); }); applyFilt(sl);
    if (DETAIL) sl.querySelector(`[data-open="${CSS.escape(String(DETAIL))}"]`)?.classList.add("spsel");
    if (DETAIL) fixDet(v.querySelector(".spdet"));
    const tl = sl.querySelector(".ptitle"), lab = (secOf(tab).tabs.find(t => t[0] === tab) || [])[1]; if (tl && lab && sup) tl.textContent = lab;
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
      const ks = el.querySelector('[data-act^="kstart:"]'); if (ks) act.append(ks);
      const ss = el.querySelector('select[aria-label="Staða verkefnis"]'); if (ss) { const w = document.createElement("label"); w.className = "ustsel"; w.textContent = "Staða"; w.append(ss); act.append(w); ss.closest(".fsels")?.remove(); }
      [...el.querySelectorAll(".viewtitle")].find(x => x.textContent.trim() === "Staða verkefnis")?.remove();
      const p = findProj(id);
      if (p && window.svidOf) { const sv = svidOf(p); hd.insertAdjacentHTML("beforeend", `<div class="usvid">Svið ${sv.map((x, i) => `<span class="upill${i === 0 ? " dark" : ""}">${sv.length > 1 && i === 0 ? "★ " : ""}${esc(window.svidHeiti ? svidHeiti(x) : x)}</span>`).join("")}</div>`); }
      if (DTAB === "fundir" && p) { const th = (S?.thraedir || []).filter(t => t.verkefniId === p.id), po = (S?.postar || []).filter(t => t.verkefniId === p.id);
        const body = el.querySelector(".dbody"); if (body) body.insertAdjacentHTML("afterbegin", `<div class="viewtitle" style="margin-top:14px">Póstar · ${th.length + po.length}</div>` + ([...th.map(t => `<a class="ucpr" href="#" data-act="tab:postur"><span><b>✉ ${esc(t.efni || "Póstþráður")}</b><small>tengt ${esc(String(t.tengt || "").slice(0, 10).split("-").reverse().join("."))}${t.af ? " · " + esc(t.af) : ""}</small></span><span class="upill">Póstur</span></a>`), ...po.map(t => `<div class="ucpr"><span><b>✉ ${esc(t.efni || "")}</b><small>${esc(t.fra || "")} · ${esc(String(t.dags || "").slice(0, 10).split("-").reverse().join("."))}</small></span><span class="upill">Eldri póstur</span></div>`)].join("") || `<div class="usub" style="padding:6px 0">Engir póstar tengdir verkefninu. Tengdu póst úr Pósti.</div>`) + `<div class="viewtitle">Fundir</div>`); }
      const nav = el.querySelector(".dtabs");
      if (nav) { const by = k => nav.querySelector(`[data-act="dtab:${k}"]`); const f = by("fundir"); if (f) { const nth = (S?.thraedir || []).filter(t => t.verkefniId === p?.id).length + (S?.postar || []).filter(t => t.verkefniId === p?.id).length, dc = f.querySelector(".dc"), nf = +(dc?.textContent || 0); f.firstChild.textContent = "Samskipti "; if (dc) dc.textContent = nf + nth; else if (nth) f.insertAdjacentHTML("beforeend", `<span class="dc">${nth}</span>`); }
        ["yfirlit", "undir", "fundir", "tilbod", "timar", "skrar", "stillingar"].map(by).filter(Boolean).forEach(b => nav.append(b)); }
    }
    if (kind === "vara" && window.u1VaraTop) {
      const top = u1VaraTop(id);
      if (top) {
        // fjarlægja gamla verðspjaldið og Útleigu-hlutann; Breyta/Eyða í hausinn
        el.querySelector(".card")?.matches(".card") && [...el.querySelectorAll(":scope > .card")].slice(0, 1).forEach(c => c.querySelector(".sub-i") && c.remove());
        const ut = [...el.querySelectorAll(".viewtitle")].find(x => x.textContent.trim() === "Útleiga");
        if (ut) { let n = ut.nextElementSibling; ut.remove(); while (n && !n.matches(".viewtitle")) { const nx = n.nextElementSibling; n.remove(); n = nx; } }
        const lk = [...el.querySelectorAll(".links")].find(x => x.querySelector('[data-act^="vrnew:"]')); if (lk) { act.append(...lk.querySelectorAll("button")); lk.remove(); }
        hd._top = `<div class="utop">${top}</div>`;
      }
    }
    (kick || h).before(hd); kick?.remove(); h.remove(); sub?.remove();
    if (hd._top) hd.insertAdjacentHTML("afterend", hd._top);
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
