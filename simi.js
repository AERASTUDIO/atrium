/* Símaútlit I (2.45.0 / 2.46.0, ORG.simi === "I" – fyrst í dev/). Aðeins á skjám mjórri en 1024 px; tölvan er óbreytt.
   Frá 2.46.0 er síminn einföldun af tölvuappinu (Útlit I): sama kóði og sama útlit (utlit-i.js keyrir líka í síma,
   simi-ui1.css afritar tölvureglurnar sjálfkrafa), en staflað: listi fyrst, spjaldið yfir allan skjáinn.
   - Neðri stika: Heim, Verkefni, Pantanir, Tímar, Meira. „Meira“ opnar dökku vinstri stikuna úr tölvunni sem skúffu.
   - Yfirlitsflipar hluta sleppast í síma – stikan opnar listann (Öll verkefni, Allar pantanir, Vikan …);
     undirflipar hlutans (Leiga · Sala · Þjónusta …) sem flögur efst í listanum.
   - Spjöld: aðgerðir hausins (Byrja klukku, Afhenda →, Senda …) í fastri stiku neðst, þar sem þumallinn nær til.
   Frá 2.47.0 byggir síminn á fimm verkum: skrá tíma/klukka, dagskrá dagsins, skanna búnað, finna og hringja, mynd eða athugasemd.
   - Neðri stika: Í dag · Leita · [Skanna] · Tímar · Meira (skúffa). Listar og spjöld eru áfram tölvuútlitið, staflað.
   - „Í dag“ (Heim í síma): klukka með nýlegum verkefnum, dagskrá dagsins (fundir, skil, afhendingar og skil á búnaði með
     skannahnappi), verkefnið sem þú ert á með Mynd og Athugasemd.
   - „Leita“: ein leit yfir verkefni, pantanir og viðskiptavini, með hringihnappi.
   Útlitið sjálft: simi-ui1.css (sjálfvirkt) og simi.css (uppröðun fyrir mjóan skjá), allt undir body.simi1. */
(function () {
  if (window.ORG?.simi !== "I") return;
  document.body.classList.add("simi1");
  const phone = () => !matchMedia("(min-width:1024px)").matches;
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  // Yfirlitsflipar hluta → listinn sem opnast í staðinn í síma
  const YF = { verkyf: "verk", pnyf: "pantanir", tbyf: "ltilbod", timyf: "timar", vskyf: "vsk", vyfir: "lvorur" };
  const ALLL = { verk: "Öll", pantanir: "Allar", ltilbod: "Öll", vsk: "Allir" };
  const secs = () => { try { return typeof SECTIONS_ALL !== "undefined" ? SECTIONS_ALL : window.SECTIONS || []; } catch (e) { return []; } };
  const cur = () => { try { return tab; } catch (e) { return ""; } };
  const det = () => { try { return DETAIL; } catch (e) { return null; } };
  const ok = t => !window.tabOn || tabOn(t);
  const mapTab = () => { try { if (phone() && YF[tab]) { const s = secs().find(x => x.tabs.some(t => t[0] === tab)); const to = YF[tab]; const q = s?.tabs.find(t => t[0] === to && ok(to)) || s?.tabs.find(t => !YF[t[0]] && ok(t[0])); if (q) tab = q[0]; } } catch (e) {} };

  // Undirflipar hlutans sem flögur efst í listanum (í tölvu eru þeir í vinstri stikunni)
  function secChips() {
    const v = document.getElementById("view"); if (!v || det()) return;
    const s = secs().find(x => x.tabs.some(t => t[0] === cur())); if (!s || s.k === "heim" || s.k === "meira" || cur() === "stillingar") return;
    const list = s.tabs.filter(t => !YF[t[0]] && ok(t[0]) && (!t[2] || ALLL[t[0]] || t[0] === cur()));
    if (list.length < 2) return;
    const host = v.querySelector(".splist .phead") || v.querySelector(".phead"); if (!host || host.querySelector(".simsub")) return;
    const lab = t => ALLL[t[0]] || (["Leiga", "Sala", "Þjónusta"].includes(t[1]) && window.svidHeiti ? svidHeiti(t[1]) : t[1]);
    host.insertAdjacentHTML("beforeend", `<div class="simsub" role="tablist" aria-label="${E(s.l)}">${list.map(t => `<button type="button" role="tab" data-act="tab:${E(t[0])}" aria-selected="${t[0] === cur()}">${E(lab(t))}</button>`).join("")}</div>`);
    host.querySelector('.simsub [aria-selected="true"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }
  // Spjald: aðgerðir hausins (nema Staða og ⋯) í fasta stiku neðst
  function actBar() {
    document.getElementById("simact")?.remove(); document.body.classList.remove("simhasact");
    if (!det()) return;
    const v = document.getElementById("view"), act = v?.querySelector(".spdet .udh2 .uact"); if (!act) return;
    const btns = [...act.querySelectorAll(":scope > button.btn, :scope > a.btn")];
    // næsta skref á pöntun/tilboði (neðst á spjaldinu í tölvu) fer líka í stikuna
    const nx = v.querySelector('.spdet .links [data-act^="tbst:"].primary, .spdet .links [data-act^="tbsend:"].primary');
    const all = [...(nx ? [nx] : []), ...btns].slice(0, 3); if (!all.length) return;
    const bar = document.createElement("div"); bar.id = "simact"; bar.className = "simact";
    all.forEach((b, i) => { const c = b.cloneNode(true); c.removeAttribute("id"); c.classList.toggle("primary", i === 0); bar.append(c); b.classList.add("simmoved"); });
    v.append(bar); document.body.classList.add("simhasact");  // inni í #view svo smellir fari í gegnum doAct eins og áður
  }
  // Skúffa: dökka vinstri stikan
  const scrim = () => { let s = document.getElementById("simscrim"); if (!s) { s = document.createElement("div"); s.id = "simscrim"; s.className = "simscrim"; s.onclick = drawer.bind(null, false); document.body.append(s); } return s; };
  function drawer(open) {
    document.body.classList.toggle("simdrw", !!open); scrim();
    const sd = document.querySelector(".side"); if (sd) { sd.setAttribute("aria-hidden", open ? "false" : "true"); if (open) setTimeout(() => sd.querySelector(".tab")?.focus(), 60); }
  }
  window.simiDrawer = drawer;
  document.addEventListener("click", e => {
    if (!phone()) return;
    // Meira (2.47.1): síða í stíl „Í dag“ í stað dökku skúffunnar; JJ-hnappurinn opnar hana líka
    const m = e.target.closest("#avbtn"); if (m) { e.preventDefault(); e.stopImmediatePropagation(); try { DETAIL = null; tab = "meira"; } catch (x) {} render(); window.scrollTo({ top: 0 }); return; }
    if (document.body.classList.contains("simdrw") && e.target.closest(".side .tab, .side .btn, .side .syncbtn, .side [data-act]")) setTimeout(() => drawer(false), 0);
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("simdrw")) drawer(false); });

  /* ---------- Fimm verk símans (2.47.0) ---------- */
  const IC = {
    dag: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
    leit: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8 8h3v3H8zM13 13h3v3h-3z"/>',
    tim: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l3 2M10 3h4"/>',
    meira: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    play: '<path d="M8 5.5l10 6.5-10 6.5z"/>', stop: '<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
    cam: '<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', note: '<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8 9h8M8 12.5h5"/>',
    tel: '<path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"/>',
    chev: '<path d="M9 6l6 6-6 6"/>'
  };
  const ico = (k, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;
  const SS = () => { try { return typeof S !== "undefined" ? S : null; } catch (e) { return null; } };
  const me = () => { try { return ME(); } catch (e) { return ""; } };
  const isoT = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const hm = w => { const m = String(w || "").match(/T(\d\d:\d\d)/); return m ? m[1] : ""; };
  const proj = id => { try { return findProj(id); } catch (e) { return null; } };
  const kl = () => { try { return klukka(); } catch (e) { return null; } };
  const canEd = () => { try { return !!MCP; } catch (e) { return false; } };
  const PN = () => window.salaAPI?.PN?.() || [];
  const DN = ["Sunnudagur", "Mánudagur", "Þriðjudagur", "Miðvikudagur", "Fimmtudagur", "Föstudagur", "Laugardagur"], MN = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
  // nýleg verkefni sem ÉG hef skráð tíma á (vantar þau: verkefni í gangi)
  function recentProjects() {
    const s = SS(), L = s?.timar?.faerslur || s?.timar?.nyjast || [], seen = new Set(), out = [];
    L.filter(e => (e.starfsmadur || me()) === me() && e.verkefniId).sort((a, b) => String(b.date + (b.fra || "")).localeCompare(String(a.date + (a.fra || "")))).forEach(e => { if (!seen.has(e.verkefniId)) { const p = proj(e.verkefniId); if (p) { seen.add(e.verkefniId); out.push(p); } } });
    if (out.length < 4) { try { verkefni().filter(p => !seen.has(p.id) && !/Lokið/.test(p.stada || "")).slice(0, 4 - out.length).forEach(p => out.push(p)); } catch (e) {} }
    return out.slice(0, 4);
  }
  function agenda() {
    const t = isoT(), R = [];
    try { (calItems().get(t) || []).filter(i => !i.span && !i.done).forEach(i => R.push({ time: hm(i.when), title: i.title || "", sub: [i.kind, i.nr].filter(Boolean).join(" · "), open: i.open })); } catch (e) {}
    PN().forEach(P => {
      if (P.fra && String(P.fra).slice(0, 10) === t && ["Ný", "Staðfest"].includes(P.stada)) R.push({ time: hm(P.fra), title: (P.nr || "") + " " + (P.heiti || ""), sub: "Afhending · " + (P.tengilidur || P.vidskiptavinur || ""), open: "tb:" + P.id, scan: "ut:" + P.id });
      const til = String(P.til || P.fra || "").slice(0, 10);
      if (P.stada === "Afhent" && til && til <= t) R.push({ time: hm(P.til), title: (P.nr || "") + " " + (P.heiti || ""), sub: (til < t ? "Skil – seint · " : "Skil · ") + (P.tengilidur || P.vidskiptavinur || ""), open: "tb:" + P.id, scan: "inn:" + P.id, late: til < t });
    });
    return R.sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  }
  const curProj = () => { const k = kl(); if (k?.pid) return proj(k.pid); const a = agenda().find(x => /^verk:|^fund:/.test(x.open || "")); if (a && a.open.startsWith("verk:")) return proj(a.open.slice(5)); return recentProjects()[0] || null; };
  function dagHTML() {
    const d = new Date(), k = kl(), kp = k ? proj(k.pid) : null, ed = canEd();
    const clock = k ? `<section class="sdk on"><div class="sdkr"><div class="sdkt"><span class="sdl">Klukkan gengur${kp ? " · " + E(kp.nr || "") : ""}</span><b class="kt" data-start="${E(k.start)}">${E(typeof elapsed === "function" ? elapsed(k) : "")}</b><span class="sdl">${E(kp?.stutt || kp?.nafn || k.desc || "")}</span></div>${ed ? `<button type="button" class="sdbtn dark" data-simk="stop">${ico("stop", 15)}Stoppa</button>` : ""}</div></section>`
      : `<section class="sdk"><div class="sdkr"><div class="sdkt"><span class="sdl">Klukka</span><b>0:00:00</b></div>${ed ? `<button type="button" class="sdbtn" data-act="kstart:">Annað…</button>` : ""}</div>${ed ? `<div class="sdrec">${recentProjects().map(p => `<button type="button" class="sdchip" data-simk="go:${E(p.id)}">${ico("play", 12)}<span><b>${E(p.nr || "")}</b> ${E(p.stutt || p.nafn || "")}</span></button>`).join("")}</div>` : ""}</section>`;
    const ag = agenda();
    const list = ag.length ? ag.map(a => `<div class="sdrow${a.late ? " late" : ""}"><a class="sdmain" ${a.open ? `data-open="${E(a.open)}" role="button" tabindex="0"` : ""}><span class="sdtm">${E(a.time || "–")}</span><span class="sdtx"><b>${E(a.title)}</b><small>${E(a.sub)}</small></span></a>${a.scan && window.qrScanOrder && ON("qr") ? `<button type="button" class="sdbtn sm" data-qrp="${E(a.scan)}">${ico("scan", 14)}${a.scan.startsWith("ut") ? "Út" : "Inn"}</button>` : ""}</div>`).join("") : `<div class="sdempty">Ekkert á dagskrá í dag.</div>`;
    const p = curProj();
    const cm = p ? (p.athugasemdir || []).slice().sort((a, b) => String(b.d).localeCompare(String(a.d))).slice(0, 2) : [];
    const pc = p ? `<section class="sdp"><div class="sdph"><a data-open="verk:${E(p.id)}" role="button" tabindex="0"><span class="sdl">${k ? "Þú ert á" : "Næst"} · ${E(p.nr || "")}</span><b>${E(p.stutt || p.nafn || "")}</b></a>${ico("chev", 16)}</div>${ed ? `<div class="sdpa"><button type="button" class="sdbtn" data-simk="mynd:${E(p.id)}">${ico("cam", 15)}Mynd</button><button type="button" class="sdbtn" data-simk="ath:${E(p.id)}">${ico("note", 15)}Athugasemd</button></div>` : ""}${cm.map(c => `<div class="sdcm"><small>${E(typeof starfName === "function" ? starfName(c.sk) : c.sk)} · ${E(String(c.d || "").slice(0, 10).split("-").reverse().join("."))}</small>${E(c.t)}</div>`).join("")}</section>` : "";
    return `<div class="sd"><div class="sdh"><span class="sdl">${DN[d.getDay()]} ${d.getDate()}. ${MN[d.getMonth()]}</span><h1>Í dag</h1></div>${clock}<div class="sdsec">Dagskrá</div><section class="sdlist">${list}</section>${p ? `<div class="sdsec">Verkefni</div>${pc}` : ""}</div>`;
  }
  let Q = "";
  const fold = x => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  function leitHTML(onlyRes) {
    const q = fold(Q.trim()), has = q.length > 0, hit = (...xs) => xs.some(x => fold(x).includes(q));
    let V = [], P = [], C = [];
    try { V = verkefni().filter(p => has ? hit(p.nr, p.stutt, p.nafn, p.vidskiptavinur) : !/Lokið/.test(p.stada || "")).slice(0, has ? 12 : 6); } catch (e) {}
    P = PN().filter(x => has ? hit(x.nr, x.heiti, x.vidskiptavinur, x.tengilidur, x.simi) : !["Skilað", "Lokið"].includes(x.stada)).slice(0, has ? 10 : 4);
    try { C = has ? vskList().filter(c => hit(c.name, c.tengilidur, c.simi, c.simiT, c.netfang)).slice(0, 10) : []; } catch (e) {}
    const tel = n => n ? `<a class="sdtel" href="tel:${E(String(n).replace(/[^\d+]/g, ""))}" aria-label="Hringja í ${E(n)}">${ico("tel", 16)}</a>` : "";
    const vsk = n => { try { return vskByName(n); } catch (e) { return null; } };
    const row = (open, a, b, c, n) => `<div class="sdrow"><a class="sdmain" data-open="${E(open)}" role="button" tabindex="0"><span class="sdtm">${E(a)}</span><span class="sdtx"><b>${E(b)}</b><small>${E(c)}</small></span></a>${tel(n)}</div>`;
    const grp = (t, xs) => xs.length ? `<div class="sdsec">${t}</div><section class="sdlist">${xs.join("")}</section>` : "";
    const out = grp(has ? "Verkefni" : "Verkefni í gangi", V.map(p => { const c = vsk(p.vidskiptavinur); return row("verk:" + p.id, p.nr || "", p.stutt || p.nafn || "", [p.vidskiptavinur, p.stada].filter(Boolean).join(" · "), c?.simiT || c?.simi); }))
      + grp(has ? "Pantanir" : "Opnar pantanir", P.map(x => row("tb:" + x.id, x.nr || "", x.heiti || "", [x.tengilidur || x.vidskiptavinur, x.stada].filter(Boolean).join(" · "), x.simi || vsk(x.vidskiptavinur)?.simi)))
      + grp("Viðskiptavinir", C.map(c => row("vsk:" + c.id, "", c.name || "", [c.tengilidur, c.simiT || c.simi].filter(Boolean).join(" · "), c.simiT || c.simi)));
    const res = out || `<div class="sdempty">Ekkert fannst fyrir „${E(Q)}“.</div>`;
    if (onlyRes) return res;
    return `<div class="sd"><div class="sdh"><h1>Leita</h1></div><label class="sdq">${ico("leit", 17)}<input type="search" id="simq" placeholder="Verkefni, pöntun, viðskiptavinur eða sími" value="${E(Q)}" autocomplete="off" enterkeyhint="search" aria-label="Leita"></label><div id="simres">${res}</div></div>`;
  }
  // Meira: allir hlutar flokkaðir eins og í tölvunni (Kjarni / Verkfæri / Tengingar), prófíll og stillingar neðst
  const GRP = { heim: "", verkefni: "Kjarni", vidsk: "Kjarni", pantanir: "Kjarni", dagatal: "Verkfæri", timar: "Verkfæri", tilbod: "Verkfæri", bunadur: "Verkfæri", fjarmal: "Verkfæri", skjol: "Tengingar", postur: "Tengingar", spjall: "Tengingar" };
  function meiraHTML() {
    let c = {}; try { c = secCounts(); } catch (e) {}
    const S0 = secs().filter(x => x.k !== "meira" && x.k !== "heim" && !x.nobar && x.tabs.some(t => ok(t[0])));
    const groups = [];
    S0.forEach(x => { const g = GRP[x.k] ?? "Annað"; let G = groups.find(y => y.g === g); if (!G) groups.push(G = { g, xs: [] }); G.xs.push(x); });
    const first = x => (x.tabs.find(t => !YF[t[0]] && ok(t[0])) || x.tabs[0])[0];
    const U = window.USER || {}, nm = U.nafn || (typeof starfName === "function" ? starfName(me()) : "") || me();
    const rows = groups.map(G => `${G.g ? `<div class="sdsec">${E(G.g)}</div>` : ""}<section class="sdlist">${G.xs.map(x => `<div class="sdrow"><a class="sdmain sdnav" data-act="tab:${E(first(x))}" role="button" tabindex="0"><span class="sdico">${x.ic || ""}</span><span class="sdtx"><b>${E(x.l)}</b></span><span class="sdcnt">${E(c[x.k] || "")}</span>${ico("chev", 15)}</a></div>`).join("")}</section>`).join("");
    return `<div class="sd"><div class="sdh"><h1>Meira</h1></div>${rows}<div class="sdsec">Þú</div><section class="sdlist">
      <div class="sdrow"><div class="sdmain"><span class="sdav">${E(String(me() || "?").slice(0, 2))}</span><span class="sdtx"><b>${E(nm)}</b><small>${E(U.email || "")}</small></span></div></div>
      <div class="sdrow"><a class="sdmain sdnav" data-act="tab:stillingar" role="button" tabindex="0"><span class="sdtx"><b>Stillingar</b></span>${ico("chev", 15)}</a></div>
      <div class="sdrow"><a class="sdmain sdnav" role="button" tabindex="0" onclick="document.getElementById('themebtn')?.click()"><span class="sdtx"><b>Útlit</b><small>Ljóst · dökkt · eftir tæki</small></span></a></div>
      <div class="sdrow"><a class="sdmain sdnav" role="button" tabindex="0" onclick="window.aeraSignOut&&aeraSignOut()"><span class="sdtx"><b>Skrá út</b></span></a></div></section></div>`;
  }
  function bar() {
    const tb = document.getElementById("tbar"); if (!tb) return;
    const t = cur(), D = det(), inDag = t === "yfirlit" && !D, inLeit = t === "leit" && !D, inTim = /^(timar|tfaer|tskyr|timyf|trk)$/.test(t) && !D;
    const B = (k, l, icn, on, extra = "") => `<button type="button" class="tab tb${k === "scan" ? " simscan" : ""}" ${k === "scan" ? 'data-simk="scan"' : `data-tab="${k}"`} aria-label="${l}"${on ? ' aria-current="page"' : ""}${extra}>${ico(icn, k === "scan" ? 22 : 21)}<span class="tl">${l}</span></button>`;
    const qr = window.qrScan && ON("qr");
    tb.innerHTML = B("yfirlit", "Í dag", "dag", inDag) + B("leit", "Leita", "leit", inLeit) + (qr ? B("scan", "Skanna", "scan", false) : "") + B("timar", "Tímar", "tim", inTim) + B("meira", "Meira", "meira", !inDag && !inLeit && !inTim);
  }
  function views() {
    const v = document.getElementById("view"); if (!v || det()) return;
    const t = cur();
    if (t === "yfirlit") { v.innerHTML = dagHTML(); document.body.classList.add("simdag"); }
    else if (t === "leit") { v.innerHTML = leitHTML(); document.body.classList.add("simdag"); }
    else if (t === "meira") { v.innerHTML = meiraHTML(); document.body.classList.add("simdag"); }
  }
  document.addEventListener("input", e => { if (e.target.id !== "simq") return; Q = e.target.value; const r = document.getElementById("simres"); if (r) r.innerHTML = leitHTML(true); });
  // Mynd og athugasemd á verkefni
  function noteSheet(pid) {
    const p = proj(pid); if (!p) return;
    const w = document.createElement("div"); w.className = "qrcard"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", "Athugasemd");
    w.innerHTML = `<div class="qrscrim" data-x="1"></div><form class="qrsheet simnote"><div class="grab" aria-hidden="true"></div><div class="qrsup">${E(p.nr || "")} · ${E(p.stutt || p.nafn || "")}</div><label for="simnt"><b>Athugasemd</b></label><textarea id="simnt" rows="4" placeholder="Skrifaðu athugasemd…"></textarea><div class="sdpa"><button type="button" class="sdbtn" data-x="1">Hætta við</button><button type="submit" class="sdbtn dark">Vista</button></div></form>`;
    document.body.append(w); const ta = w.querySelector("textarea"); setTimeout(() => ta.focus(), 50);
    const close = () => w.remove();
    w.addEventListener("click", e => { if (e.target.closest("[data-x]")) close(); });
    w.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    w.querySelector("form").addEventListener("submit", e => { e.preventDefault(); const t = ta.value.trim(); if (!t) return;
      saveSnapshot(s => { const q = (s.verkefni || []).find(x => x.id === pid) || (typeof sFindP === "function" ? sFindP(s, pid) : null); if (q) (q.athugasemdir = q.athugasemdir || []).push({ id: (typeof newId === "function" ? newId() : String(Date.now())), t, d: new Date().toISOString(), sk: me() }); }).then(() => toast?.("Athugasemd vistuð")).catch(() => {}); close(); });
  }
  function photo(pid) {
    const p = proj(pid); if (!p) return;
    const i = document.createElement("input"); i.type = "file"; i.accept = "image/*"; i.capture = "environment";
    i.onchange = () => { const f = i.files?.[0]; if (!f) return; const d = new Date(), nm = `${p.nr || "Verkefni"} mynd ${isoT()} ${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}.${(f.name.split(".").pop() || "jpg").toLowerCase()}`;
      if (window.saveDoc) saveDoc({ data: f, name: nm, type: f.type || "image/jpeg", kind: "Myndir", pid: p.id }); else toast?.("Ekki hægt að vista mynd hér"); };
    i.click();
  }
  async function startOn(pid) {
    try { await saveSnapshot(s => { s.klukka = { pid, sid: null, desc: "", sk: me(), start: new Date().toISOString() }; }); toast?.("Klukkan er farin af stað"); } catch (e) {}
  }
  document.addEventListener("click", e => {
    if (!phone()) return;
    const b = e.target.closest("[data-simk]"); if (!b) return; e.preventDefault();
    const [k, a] = b.dataset.simk.split(/:(.*)/s);
    if (k === "scan") return window.qrScan?.();
    if (k === "stop") return typeof stopKlukka === "function" && stopKlukka();
    if (k === "go") return startOn(a);
    if (k === "ath") return noteSheet(a);
    if (k === "mynd") return photo(a);
  });
  // opna atriði úr „Í dag“ og „Leita“ (utan #view-smella doAct notar data-open)
  document.addEventListener("click", e => { if (!phone()) return; const r = e.target.closest(".sd [data-open]"); if (!r || e.target.closest(".sdtel,[data-simk],[data-qrp]")) return; e.preventDefault(); e.stopPropagation(); try { openDetail(r.dataset.open); } catch (x) {} }, true);

  // Stillingar og Póstur eru tveir dálkar í tölvu (listi + valið atriði): í síma listinn fyrst, svo valið atriði með „Til baka“
  function splitFix() {
    const v = document.getElementById("view"), sp = v?.querySelector(".split"); if (!sp) return;
    const t = cur();
    if (t === "stillingar") {
      if (!window.STSUB) { sp.classList.add("nodet"); sp.querySelector(".spdet")?.remove(); }
      else if (!sp.querySelector(".spdet .simback")) sp.querySelector(".spdet")?.insertAdjacentHTML("afterbegin", `<button type="button" class="uback simback" data-act="stsub:">${ico("chev", 14).replace("M9 6l6 6-6 6", "M15 6l-6 6 6 6")}Stillingar</button>`);
    }
    if (t === "postur" && !det()) { sp.classList.add("nodet"); sp.querySelector(".spdet")?.remove(); }
    // Samstarfsfólk: í tölvu er fyrsta manneskjan valin sjálfkrafa – í síma listinn fyrst
    if (t === "teymi") {
      if (!window.SIMTM) { sp.classList.add("nodet"); sp.querySelector(".spdet")?.remove(); }
      else if (!sp.querySelector(".spdet .simback")) sp.querySelector(".spdet .spdetin, .spdet")?.insertAdjacentHTML("afterbegin", `<button type="button" class="uback simback" data-simtm="0">${ico("chev", 14).replace("M9 6l6 6-6 6", "M15 6l-6 6 6 6")}Samstarfsfólk</button>`);
    }
  }
  document.addEventListener("click", e => {
    if (!phone()) return;
    if (e.target.closest('[data-act^="u1tm:"]')) window.SIMTM = true;
    else if (e.target.closest('[data-simtm="0"]')) { window.SIMTM = false; render(); }
    else if (e.target.closest('[data-act^="tab:"],[data-tab],[data-simtab]')) window.SIMTM = false;
  }, true);
  function decorate() {
    document.body.classList.toggle("simidet", !!det());
    if (!phone()) { document.getElementById("simact")?.remove(); document.body.classList.remove("simhasact"); return; }
    document.body.classList.remove("simdag");
    views(); splitFix(); secChips(); actBar(); bar();
    // „Meira“ í neðri stiku: virkt þegar opinn hluti er ekki í stikunni
    const mb = document.querySelector('#tbar [data-tab="meira"] .tl'); if (mb) mb.textContent = "Meira";
  }
  const _dm = window.drawMenu; if (_dm) { const dmS = function () { const r = _dm.apply(this, arguments); try { if (phone()) bar(); } catch (e) {} return r; }; window.drawMenu = dmS; try { drawMenu = dmS; } catch (e) {} }
  const _render = window.render || render;
  function renderS() { mapTab(); _render.apply(this, arguments); try { decorate(); } catch (e) { console.warn("simi", e); } }
  window.render = renderS; try { render = renderS; } catch (e) {}
  matchMedia("(min-width:1024px)").addEventListener?.("change", () => { drawer(false); try { if (typeof S !== "undefined" && S) render(); } catch (e) {} });
})();
