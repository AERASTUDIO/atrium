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
  const YF = { verkyf: "verk", pnyf: "pantanir", tbyf: "ltilbod", tbfer: "ltilbod", rkyf: "trk", timyf: "timar", vskyf: "vsk", vyfir: "lvorur" };
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
    const list = s.tabs.filter(t => !YF[t[0]] && ok(t[0]) && (!t[2] || t[2] === 2 || ALLL[t[0]] || t[0] === cur()));
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
    const nx2 = v.querySelector('.spdet .links [data-act^="tbst:"][data-act$=":Afhent"]:not(.primary)');   // 2.78.4: Afhenda líka á nýrri pöntun
    const all = [...(nx ? [nx] : []), ...(nx2 ? [nx2] : []), ...btns].slice(0, 3); if (!all.length) return;
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
    chev: '<path d="M9 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    verk: '<path d="M3.5 7h17v12.5h-17zM8 7V4.5h8V7"/>',
    pant: '<path d="M5 7.5h14l-1.3 11a1.5 1.5 0 0 1-1.5 1.3H7.8a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>'
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
    PN().filter(P => !window.tbMine || tbMine(P)).forEach(P => { // 2.86.1: aðeins pantanir sem notandinn er skráður á
      if (P.fra && String(P.fra).slice(0, 10) === t && ["Ný", "Staðfest"].includes(P.stada)) R.push({ time: hm(P.fra), title: (P.nr || "") + " " + (P.heiti || ""), sub: "Afhending · " + (P.tengilidur || P.vidskiptavinur || ""), open: "tb:" + P.id, scan: "ut:" + P.id });
      const til = String(P.til || P.fra || "").slice(0, 10);
      if (P.stada === "Afhent" && til && til <= t) R.push({ time: hm(P.til), title: (P.nr || "") + " " + (P.heiti || ""), sub: (til < t ? "Skil – seint · " : "Skil · ") + (P.tengilidur || P.vidskiptavinur || ""), open: "tb:" + P.id, scan: "inn:" + P.id, late: til < t });
    });
    return R.sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  }
  const curProj = () => { const k = kl(); if (k?.pid) return proj(k.pid); const a = agenda().find(x => /^verk:|^fund:/.test(x.open || "")); if (a && a.open.startsWith("verk:")) return proj(a.open.slice(5)); return recentProjects()[0] || null; };
  function dagHTML(home) {
    const d = new Date(), k = kl(), kp = k ? proj(k.pid) : null, ed = canEd();
    const clock = k ? `<section class="sdk on"><div class="sdkr"><div class="sdkt"><span class="sdl">Klukkan gengur${kp ? " · " + E(kp.nr || "") : ""}</span><b class="kt" data-start="${E(k.start)}">${E(typeof elapsed === "function" ? elapsed(k) : "")}</b><span class="sdl">${E(kp?.stutt || kp?.nafn || k.desc || "")}</span></div>${ed ? `<button type="button" class="sdbtn dark" data-simk="stop">${ico("stop", 15)}Stoppa</button>` : ""}</div></section>`
      : `<section class="sdk"><div class="sdkr"><div class="sdkt"><span class="sdl">Klukka</span><b>0:00:00</b></div>${ed ? `<button type="button" class="sdbtn" data-act="kstart:">Annað…</button>` : ""}</div>${ed ? `<div class="sdrec">${recentProjects().map(p => `<button type="button" class="sdchip" data-simk="go:${E(p.id)}">${ico("play", 12)}<span><b>${E(p.nr || "")}</b> ${E(p.stutt || p.nafn || "")}</span></button>`).join("")}</div>` : ""}</section>`;
    const ag = agenda();
    const list = ag.length ? ag.map(a => `<div class="sdrow${a.late ? " late" : ""}"><a class="sdmain" ${a.open ? `data-open="${E(a.open)}" role="button" tabindex="0"` : ""}><span class="sdtm">${E(a.time || "–")}</span><span class="sdtx"><b>${E(a.title)}</b><small>${E(a.sub)}</small></span></a>${a.scan && window.qrScanOrder && ON("qr") ? `<button type="button" class="sdbtn sm" data-qrp="${E(a.scan)}">${ico("scan", 14)}${a.scan.startsWith("ut") ? "Út" : "Inn"}</button>` : ""}</div>`).join("") : `<div class="sdempty">Ekkert á dagskrá í dag.</div>`;
    const p = curProj();
    const cm = p ? (p.athugasemdir || []).slice().sort((a, b) => String(b.d).localeCompare(String(a.d))).slice(0, 2) : [];
    const pc = p ? `<section class="sdp"><div class="sdph"><a data-open="verk:${E(p.id)}" role="button" tabindex="0"><span class="sdl">${k ? "Þú ert á" : "Næst"} · ${E(p.nr || "")}</span><b>${E(p.stutt || p.nafn || "")}</b></a>${ico("chev", 16)}</div>${ed ? `<div class="sdpa"><button type="button" class="sdbtn" data-simk="mynd:${E(p.id)}">${ico("cam", 15)}Mynd</button><button type="button" class="sdbtn" data-simk="ath:${E(p.id)}">${ico("note", 15)}Athugasemd</button></div>` : ""}${cm.map(c => `<div class="sdcm"><small>${E(typeof starfName === "function" ? starfName(c.sk) : c.sk)} · ${E(String(c.d || "").slice(0, 10).split("-").reverse().join("."))}</small>${E(c.t)}</div>`).join("")}</section>` : "";
    const mods = (() => { try { if (!window.UI1V?.yfirlit) return ""; const h = UI1V.yfirlit(), i = h.indexOf('<div class="u2grid">'); return i < 0 ? "" : h.slice(i); } catch (e) { return ""; } })();
    return `<div class="sd${home ? " shome" : ""}">${home ? heimTop() : `<div class="sdh"><span class="sdl">${DN[d.getDay()]} ${d.getDate()}. ${MN[d.getMonth()]}<button type="button" class="btn u2sers" onclick="idagSersnida()">Sérsníða</button></span><h1>Í dag</h1></div>${clock}`}${(() => { const n = window.vtBidaN ? vtBidaN() : 0; return n ? `<a class="sdk" data-act="vtsta" role="button" tabindex="0" style="display:flex;flex-direction:row;text-align:left;justify-content:space-between;align-items:center;text-decoration:none;color:inherit;cursor:pointer"><span><b>${n === 1 ? "1 tími bíður" : n + " tímar bíða"} staðfestingar</b><br><span class="sdl">Skráðir af vettvangsnotendum</span></span><span aria-hidden="true">›</span></a>` : ""; })()}<div class="sdsec">Dagskrá</div><section class="sdlist">${list}</section>${p ? `<div class="sdsec">Verkefni</div>${pc}` : ""}${mods ? `${home ? `<div class="shsec"><span>Í dag</span><button type="button" class="shed" onclick="idagSersnida()">Sérsníða</button></div>` : ""}<div class="sdmods">${mods}</div>` : ""}</div>`;
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
  const GRP = { heim: "Mitt", dagatal: "Mitt", timar: "Mitt", verkefni: "Starfsemi", pantanir: "Starfsemi", verkdag: "Starfsemi", bunadur: "Starfsemi", vidsk: "Viðskipti", tilbod: "Viðskipti", fjarmal: "Viðskipti", postur: "Samskipti", spjall: "Samskipti", skjol: "Samskipti" };
  function meiraHTML() {
    let c = {}; try { c = secCounts(); } catch (e) {}
    const S0 = secs().filter(x => x.k !== "meira" && x.k !== "heim" && !x.nobar && x.tabs.some(t => ok(t[0])));
    if (window.secRank) { const rk = secRank(); S0.sort((a, b) => rk(a) - rk(b)); }
    const groups = [];
    S0.forEach(x => { const g = GRP[x.k] ?? "Annað"; let G = groups.find(y => y.g === g); if (!G) groups.push(G = { g, xs: [] }); G.xs.push(x); });
    const first = x => (x.tabs.find(t => !YF[t[0]] && ok(t[0])) || x.tabs[0])[0];
    const U = window.USER || {}, nm = U.nafn || (typeof starfName === "function" ? starfName(me()) : "") || me();
    const rows = groups.map(G => `${G.g && G.xs.length > 1 ? `<div class="sdsec">${E(G.g)}</div>` : ""}<section class="sdlist">${G.xs.map(x => `<div class="sdrow"><a class="sdmain sdnav" data-act="tab:${E(first(x))}" role="button" tabindex="0"><span class="sdico">${x.ic || ""}</span><span class="sdtx"><b>${E(x.l)}</b></span><span class="sdcnt">${E(c[x.k] || "")}</span>${ico("chev", 15)}</a></div>`).join("")}</section>`).join("");
    const lq = window.qrScan && window.ON && ON("qr") ? `<section class="sdlist"><div class="sdrow"><a class="sdmain sdnav" data-act="tab:leit" role="button" tabindex="0"><span class="sdico">${ico("leit", 18)}</span><span class="sdtx"><b>Leita</b></span>${ico("chev", 15)}</a></div></section>` : "";
    void lq; return `<div class="sd"><div class="sdh"><h1>Allt</h1></div>${rows}<div class="sdsec">Þú</div><section class="sdlist">
      <div class="sdrow"><div class="sdmain"><span class="sdav">${E(String(me() || "?").slice(0, 2))}</span><span class="sdtx"><b>${E(nm)}</b><small>${E(U.email || "")}</small></span></div></div>
      <div class="sdrow"><a class="sdmain sdnav" data-act="tab:stillingar" role="button" tabindex="0"><span class="sdtx"><b>Stillingar</b></span>${ico("chev", 15)}</a></div>
      <div class="sdrow"><a class="sdmain sdnav" role="button" tabindex="0" onclick="document.getElementById('themebtn')?.click()"><span class="sdtx"><b>Útlit</b><small>Ljóst · dökkt · eftir tæki</small></span></a></div>
      <div class="sdrow"><a class="sdmain sdnav" role="button" tabindex="0" onclick="window.atrEndurhlada?atrEndurhlada():location.reload()"><span class="sdtx"><b>Endurhlaða</b><small>Sækja nýjustu útgáfu og gögn</small></span></a></div>
      <div class="sdrow"><a class="sdmain sdnav" role="button" tabindex="0" onclick="window.aeraSignOut&&aeraSignOut()"><span class="sdtx"><b>Skrá út</b></span></a></div></section></div>`;
  }
  /* ---------- 2.153.0: Mælaborð símans (tillaga A á striganum „Atrium – símaapp“) ----------
     Heim = kveðja, grafítspjald (vikan þín + klukka), flísar fyrir svæðin með lifandi tölu (notandi velur og raðar),
     Póstur · Spjall · Allt, svo dagskrá dagsins og Í dag-einingarnar. Vettvangur heldur sínum einfalda skjá (vett-ui.js).
     Neðri stika: Heim · Leita · + · Dagatal · Ég (fljótandi grafítstika). „+“ opnar blað með fljótlegri skráningu. */
  Object.assign(IC, {
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    tilb: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M14 3.5v5h5M9 13h6M9 16.5h4"/>',
    reikn: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M3.5 10h17M7 15h4"/>',
    vsk: '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 7M21 20a6 6 0 0 0-4-5.6"/>',
    skjol: '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    spj: '<path d="M20.5 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 20.5 12z"/>',
    post: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M3.5 7.5l8.5 6 8.5-6"/>',
    up: '<path d="M6 14l6-6 6 6"/>', grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'
  });
  const tr = (f, d) => { try { return f(); } catch (e) { return d; } };
  const vett = () => tr(() => !!window.isVett?.(), false);
  const isRent = () => tr(() => ON("pantanir") && (ON("leiga") || ON("sala")), false);
  const fName = () => { const U = window.VIEWAS || window.USER || {}; return String(U.nafn || tr(() => starfName(me()), "") || "").split(" ")[0]; };
  const secOk = k => secs().find(x => x.k === k && !x.nobar && x.tabs.some(t => ok(t[0])) && !(vett() && (window.VETT_FELA || []).includes(k)));
  const firstTab = x => (x.tabs.find(t => !YF[t[0]] && ok(t[0])) || x.tabs[0])[0];
  const N = n => tr(() => num(n), String(n));
  const myWeek = () => tr(() => { const k = kl(); return weekSum(0, STARFS().length > 1 ? me() : null, true) + (k ? liveWeekH(k.start) : 0); }, 0);
  const goalH = () => tr(() => +CFG().vikumark || 40, 40);
  // Tóm virk dagsetning í vikunni (mán til gær) – „Ekkert skráð á mið“
  const gapDays = () => tr(() => { const a = mondayOf(new Date()), t = isoT(), mine = new Set(faerslur().filter(e => (e.starfsmadur || me()) === me()).map(e => String(e.date).slice(0, 10))), out = [];
    for (let i = 0; i < 5; i++) { const x = new Date(a); x.setDate(x.getDate() + i); const k = isoDay(x); if (k >= t) break; if (!mine.has(k)) out.push(["mán", "þri", "mið", "fim", "fös"][i]); } return out; }, []);
  // Flísar: [merki, tákn, tala, eining, undirlína, tónn (bad|warn|ok|"")]
  const TILE = {
    verkefni: () => { const ps = tr(() => verkefni().filter(p => !isDone(p) && (!vett() || !window.vettMine || vettMine(p))), []), late = ps.filter(p => p.skiladagur && daysTo(p.skiladagur) < 0).length, soon = ps.filter(p => p.skiladagur && daysTo(p.skiladagur) >= 0 && daysTo(p.skiladagur) <= 7).length;
      return [ps.length, "", late ? late + " seint" + (soon ? " · " + soon + " skil í vikunni" : "") : soon ? soon + (soon === 1 ? " skil" : " skil") + " í vikunni" : "Allt á áætlun", late ? "bad" : soon ? "" : "ok"]; },
    tilbod: () => { const T = tr(() => salaAPI.TB(), []), dr = T.filter(x => x.stada === "Drög").length, se = T.filter(x => x.stada === "Sent"), old = se.filter(x => daysTo(x.sent || x.dags) <= -7).length, bi = se.filter(x => x.bidur).length;
      return [dr + se.length, "", bi ? bi + " samþykkt – staðfesta" : old ? old + " ósvöruð í 7+ daga" : se.length + " send · " + dr + " drög", bi ? "ok" : old ? "warn" : ""]; },
    pantanir: () => { const t = isoT(), P = PN().filter(x => !["Skilað", "Lokið", "Hætt við", "Hafnað"].includes(x.stada) && (!vett() || !window.tbMine || tbMine(x))), afh = P.filter(x => String(x.fra || "").slice(0, 10) === t && ["Ný", "Staðfest"].includes(x.stada)).length, late = P.filter(x => x.stada === "Afhent" && String(x.til || x.fra || "").slice(0, 10) < t).length;
      return [P.length, "", late ? late + (late === 1 ? " skil sein" : " skil sein") : afh ? afh + (afh === 1 ? " afhending" : " afhendingar") + " í dag" : "Ekkert í dag", late ? "bad" : ""]; },
    timar: () => { const g = gapDays(), w = myWeek(); return [N(Math.round(w * 10) / 10), "klst.", g.length ? "Ekkert skráð " + g.join(", ") : "af " + goalH() + " klst. í vikunni", g.length ? "warn" : ""]; },
    fjarmal: () => { if (!tr(() => can("fjarmal"), false)) return null; const R = tr(() => (S.reikningar || []).filter(r => r.stada !== "Ógilt"), []), og = R.filter(r => r.stada !== "Greitt"), late = og.filter(r => r.gjalddagi && daysTo(r.gjalddagi) < 0).length;
      return [N(og.reduce((a, r) => a + (+r.tot || 0), 0)), "kr.", og.length + " ógreiddir · " + (late ? late + " seint" : "allt á tíma"), late ? "bad" : "ok", "sm"]; },
    dagatal: () => { const n = tr(() => (calItems().get(isoT()) || []).filter(i => !i.span).length, 0); return [n, "", "á dagskrá í dag", ""]; },
    verkdag: () => { const n = tr(() => (calItems().get(isoT()) || []).filter(i => !i.span).length, 0); return [n, "", "verk í dag", ""]; },
    vidsk: () => [tr(() => vskList().length, ""), "", "viðskiptavinir", ""],
    bunadur: () => ["", "", "búnaður og staða", ""],
    skjol: () => ["", "", "OneDrive og SharePoint", ""]
  };
  const TIC = { verkefni: "verk", tilbod: "tilb", pantanir: "pant", timar: "tim", fjarmal: "reikn", dagatal: "cal", verkdag: "cal", vidsk: "vsk", bunadur: "box", skjol: "skjol" };
  const TDEF = () => isRent() ? ["pantanir", "verkefni", "tilbod", "timar", "fjarmal", "dagatal", "verkdag", "bunadur", "vidsk", "skjol"] : ["verkefni", "tilbod", "timar", "fjarmal", "pantanir", "dagatal", "verkdag", "vidsk", "bunadur", "skjol"];
  const tAvail = () => TDEF().filter(k => secOk(k) && (k !== "fjarmal" || tr(() => can("fjarmal"), false)));
  const tGet = () => { let L = null; try { L = JSON.parse(localStorage.getItem("atr-simflis") || "null"); } catch (e) {} const A = tAvail(); return Array.isArray(L) ? L.filter(k => A.includes(k)) : A.slice(0, 6); };
  const tSet = L => { try { localStorage.setItem("atr-simflis", JSON.stringify(L)); } catch (e) {} };
  function tileHTML(k) {
    const x = secOk(k); if (!x) return ""; const d = tr(() => TILE[k]?.(), null); if (TILE[k] && !d) return "";
    const [n, u, sub, tone, sz] = d || ["", "", "", ""];
    return `<a class="shti" data-act="tab:${E(firstTab(x))}" role="button" tabindex="0"><span class="shth"><span class="shtic">${x.ic || ico(TIC[k] || "grid", 18)}</span><b>${E(x.l)}</b></span>${n !== "" ? `<span class="shtn${sz ? " " + sz : ""}">${E(String(n))}${u ? `<u>${E(u)}</u>` : ""}</span>` : ""}<span class="shts${tone ? " " + tone : ""}">${E(sub)}</span></a>`;
  }
  function keyCard() {
    const k = kl(), kp = k ? proj(k.pid) : null, ed = canEd(), tim = tr(() => ON("timar"), true); if (!tim) return "";
    const w = myWeek(), g = goalH();
    const clk = k ? `<div class="shkr"><div class="shkt"><b class="kt" data-start="${E(k.start)}">${E(tr(() => elapsed(k), ""))}</b><small>${E([kp?.nr, kp?.stutt || kp?.nafn || k.desc].filter(Boolean).join(" · ") || "Klukka í gangi")}</small></div>${ed ? `<button type="button" class="shkb" data-simk="stop">${ico("stop", 14)}Stöðva</button>` : ""}</div>`
      : `<div class="shkr"><div class="shkt"><b>Klukka</b><small>Engin klukka í gangi</small></div>${ed ? `<button type="button" class="shkb" onclick="kind='tima';PREFILL={timer:true};openSheet()">${ico("play", 13)}Byrja</button>` : ""}</div>${ed ? `<div class="shkrec">${recentProjects().slice(0, 3).map(p => `<button type="button" data-simk="go:${E(p.id)}">${ico("play", 11)}<span><b>${E(p.nr || "")}</b> ${E(p.stutt || p.nafn || "")}</span></button>`).join("")}</div>` : ""}`;
    return `<section class="shk"><a class="shkw" data-act="tab:timar" role="button" tabindex="0"><span class="shl">Vikan þín</span><span class="shkwv">${E(N(Math.round(w * 10) / 10))} af ${g} klst.</span></a><div class="shkm" aria-hidden="true"><i style="width:${Math.min(100, w / g * 100)}%"></i></div>${clk}</section>`;
  }
  const greet = () => { const h = new Date().getHours(), nm = fName(); return `${h < 12 ? "Góðan dag" : h < 18 ? "Góðan dag" : "Gott kvöld"}${nm ? `, <b>${E(nm)}</b>` : ""}`; };
  function pills() {
    const sp = tr(() => window.spUnread ? spUnread() : 0, 0), P = secOk("postur"), C = secOk("spjall");
    return `<div class="shpills">${P ? `<a data-act="tab:${E(firstTab(P))}" role="button" tabindex="0">${ico("post", 16)}Póstur</a>` : ""}${C ? `<a data-act="tab:${E(firstTab(C))}" role="button" tabindex="0">${ico("spj", 16)}Spjall${sp ? `<i>${sp}</i>` : ""}</a>` : ""}<a data-act="tab:meira" role="button" tabindex="0">${ico("grid", 16)}Allt</a></div>`;
  }
  function heimTop() {
    const d = new Date(), L = tGet();
    let un = 0; try { un = window.u1TilkN ? u1TilkN() : 0; } catch (e) {}
    return `<div class="shd"><div class="shdt"><span class="sdl">${DN[d.getDay()]} ${d.getDate()}. ${MN[d.getMonth()]}</span><h1>${greet()}</h1></div>${window.u1Tilk ? `<button type="button" class="shbell" onclick="u1Tilk()" aria-label="Tilkynningar${un ? ", " + un + " ólesnar" : ""}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>${un ? `<span>${un > 99 ? "99+" : un}</span>` : ""}</button>` : ""}</div>${keyCard()}`
      + `<div class="shsec"><span>Svæði</span><button type="button" class="shed" data-simk="flis">Breyta</button></div><div class="sht">${L.map(tileHTML).join("")}</div>${pills()}`;
  }
  // „+“: fljótleg skráning
  function plusSheet() {
    const p = curProj(), ed = canEd(), k = kl(), rentQ = window.qrScan && tr(() => ON("qr"), false) && isRent();
    const it = (attr, icn, t, s) => `<button type="button" class="shpi" ${attr}>${ico(icn, 22)}<span><b>${E(t)}</b><small>${E(s)}</small></span></button>`;
    const L = [];
    if (p && ed) { L.push(it(`data-pl="mynd:${E(p.id)}"`, "cam", "Mynd á verkefni", p.nr || p.stutt || "")); L.push(it(`data-pl="ath:${E(p.id)}"`, "note", "Athugasemd", p.nr || p.stutt || "")); }
    if (rentQ) L.push(it(`data-pl="scan"`, "scan", "Skanna búnað", "Út eða inn"));
    if (ed && !vett() && secOk("tilbod") && window.FAB_EXT?.ltilbod) L.push(it(`data-pl="tilbod"`, "tilb", "Nýtt tilboð", "Leiga, sala eða þjónusta"));
    if (ed && !vett() && secOk("pantanir") && window.FAB_EXT?.pantanir) L.push(it(`data-pl="pontun"`, "pant", "Ný pöntun", "Leiga eða sala"));
    const w = document.createElement("div"); w.className = "qrcard shplus"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", "Skrá");
    w.innerHTML = `<div class="qrscrim" data-x="1"></div><div class="qrsheet"><div class="grab" aria-hidden="true"></div><div class="shph"><b>Skrá</b><button type="button" class="shpx" data-x="1" aria-label="Loka"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`
      + (tr(() => ON("timar"), true) && ed ? `<button type="button" class="shpt" data-pl="tima">${ico("tim", 22)}<span><b>Skrá tíma</b><small>${E(p ? "Síðast: " + (p.nr || "") + " " + (p.stutt || p.nafn || "") : "Á verkefni eða án verkefnis")}</small></span>${ico("chev", 16)}</button>${!k ? `<button type="button" class="shpk" data-pl="klukka">${ico("play", 14)}Byrja klukku</button>` : ""}` : "")
      + `<div class="shpg">${L.join("")}</div></div>`;
    document.body.append(w); const close = () => w.remove();
    w.addEventListener("click", e => { if (e.target.closest("[data-x]")) return close(); const b = e.target.closest("[data-pl]"); if (!b) return; const [a, id] = b.dataset.pl.split(/:(.*)/s); close();
      if (a === "tima") { if (window.s2Skra) return window.s2Skra(); try { kind = "tima"; PREFILL = null; openSheet(); } catch (x) {} }
      else if (a === "klukka") { try { kind = "tima"; PREFILL = { timer: true }; openSheet(); } catch (x) {} }
      else if (a === "mynd") photo(id); else if (a === "ath") noteSheet(id); else if (a === "scan") window.qrScan?.();
      else if (a === "tilbod") window.FAB_EXT.ltilbod(); else if (a === "pontun") window.FAB_EXT.pantanir(); });
    w.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    setTimeout(() => w.querySelector(".shpt,.shpi,.shpx")?.focus(), 60);
  }
  // Velja og raða flísum
  function flisSheet() {
    const A = tAvail(); let L = tGet();
    const w = document.createElement("div"); w.className = "qrcard shplus"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", "Svæði á mælaborði");
    const draw = () => { const rest = A.filter(k => !L.includes(k)), lab = k => secOk(k)?.l || k;
      w.querySelector(".shfl").innerHTML = [...L, ...rest].map(k => { const on = L.includes(k), i = L.indexOf(k); return `<div class="shfr"><label><input type="checkbox" data-fk="${E(k)}"${on ? " checked" : ""}> ${E(lab(k))}</label>${on && i > 0 ? `<button type="button" data-fu="${E(k)}" aria-label="Færa ${E(lab(k))} upp">${ico("up", 16)}</button>` : ""}</div>`; }).join(""); };
    w.innerHTML = `<div class="qrscrim" data-x="1"></div><div class="qrsheet"><div class="grab" aria-hidden="true"></div><div class="shph"><b>Svæði á mælaborði</b><button type="button" class="shpx" data-x="1" aria-label="Loka"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><p class="shpn">Hakaðu við svæðin sem eiga að sjást og færðu þau upp eða niður. Öll svæði eru líka undir „Allt“.</p><div class="shfl"></div><div class="sdpa"><button type="button" class="sdbtn" data-fr="1">Sjálfgefið</button><button type="button" class="sdbtn dark" data-x="1">Lokið</button></div></div>`;
    document.body.append(w); draw();
    const save = () => { tSet(L); render(); };
    w.addEventListener("change", e => { const k = e.target.dataset?.fk; if (!k) return; L = e.target.checked ? [...L, k] : L.filter(x => x !== k); draw(); save(); });
    w.addEventListener("click", e => { if (e.target.closest("[data-x]")) return w.remove(); const u = e.target.closest("[data-fu]")?.dataset.fu; if (u) { const i = L.indexOf(u); if (i > 0) { L.splice(i, 1); L.splice(i - 1, 0, u); draw(); save(); } }
      if (e.target.closest("[data-fr]")) { try { localStorage.removeItem("atr-simflis"); } catch (x) {} L = tGet(); draw(); render(); } });
    w.addEventListener("keydown", e => { if (e.key === "Escape") w.remove(); });
  }
  function bar() {
    const tb = document.getElementById("tbar"); if (!tb) return;
    const t = cur(), D = det(), inDag = t === "yfirlit" && !D, inLeit = t === "leit" && !D, inTim = /^(timar|tfaer|tskyr|timyf|trk)$/.test(t) && !D;
    const B = (k, l, icn, on, extra = "") => `<button type="button" class="tab tb${k === "scan" || k === "skra" ? " simscan" : ""}" ${k === "scan" || k === "skra" ? `data-simk="${k}"` : `data-tab="${k}"`} aria-label="${l}"${on ? ' aria-current="page"' : ""}${extra}>${ico(icn, k === "scan" || k === "skra" ? 22 : 21)}<span class="tl">${l}</span></button>`;
    // 2.129.0: annar hnappurinn er aðalferill fyrirtækisins – Pantanir með Leigu/Sölu, annars Verkefni (Leita fer í Meira ef Skanna er í boði)
    let rent = false; try { rent = ON("pantanir") && (ON("leiga") || ON("sala")); } catch (e) {}
    /* 2.151.0: Skanna aðeins hjá fyrirtækjum með leigu/sölu (búnað); annars er „Skrá tíma“ í miðjunni */
    const qr = window.qrScan && ON("qr") && rent, skra = !qr && ON("timar");
    const FK = rent ? "pantanir" : "verkefni", fs = (() => { try { return SECTIONS; } catch (e) { return []; } })().find(x => x.k === FK), ft = fs && (fs.tabs.find(t => !YF[t[0]] && ok(t[0])) || fs.tabs[0])[0];
    const inFl = !!fs && !inDag && !inLeit && !inTim && (D ? (FK === "verkefni" ? /^verk:/.test(String(D)) : /^tb:/.test(String(D))) : secOf(t)?.k === FK);
    // 2.153.0: Heim · Leita · + · Dagatal · Ég – svæðin eru á mælaborðinu (Heim)
    const DC = secOk("dagatal") || secOk("verkdag"), dt = DC ? firstTab(DC) : null, inCal = !!DC && !D && secOf(t)?.k === DC.k;
    const U = window.VIEWAS || window.USER || {}, av = String(U.sk || me() || "?").slice(0, 2).toUpperCase();
    void inFl; void qr; void skra;
    tb.innerHTML = B("yfirlit", "Heim", "dag", inDag) + B("leit", "Leita", "leit", inLeit) + `<button type="button" class="tab tb simplus" data-simk="plus" aria-label="Skrá">${ico("plus", 24)}</button>` + (dt ? B(dt, "Dagatal", "cal", inCal) : B("timar", "Tímar", "tim", inTim)) + `<button type="button" class="tab tb" data-tab="meira" aria-label="Ég og öll svæði"${t === "meira" && !D ? ' aria-current="page"' : ""}><span class="simav">${E(av)}</span><span class="tl">Ég</span></button>`;
  }
  // 2.142.0: bjalla í haus símans (við hlið prófílmyndar) – tilkynningar opnast í spjaldi eins og í tölvu
  function bell() {
    const av = document.getElementById("avbtn"); if (!av || !window.u1Tilk) return;
    let b = document.getElementById("simbell"); if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "simbell"; b.className = "simbell"; b.onclick = () => u1Tilk(); av.before(b); }
    let un = 0; try { un = (window.u1TilkN ? u1TilkN() : 0); } catch (e) {}
    b.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>${un ? `<span>${un > 99 ? "99+" : un}</span>` : ""}`;
    b.setAttribute("aria-label", "Tilkynningar" + (un ? ", " + un + " ólesnar" : ""));
  }
  function views() {
    const v = document.getElementById("view"); if (!v || det()) return;
    const t = cur();
    if (t === "yfirlit") { v.innerHTML = dagHTML(true); document.body.classList.add("simdag"); }
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
  window.simiPhoto = id => photo(id); window.simiNote = id => noteSheet(id);
  // 2.155.0: símaskelin (simi/skel.js) notar þessa hluta
  window.simiApi = { keyCard: () => keyCard(), tiles: () => { try { return tGet().map(tileHTML).join(""); } catch (e) { return ""; } }, plus: () => plusSheet(), flis: () => flisSheet(), meira: () => meiraHTML() };
  async function startOn(pid) {
    try { await saveSnapshot(s => { s.klukka = { pid, sid: null, desc: "", sk: me(), start: new Date().toISOString() }; }); toast?.("Klukkan er farin af stað"); } catch (e) {}
  }
  document.addEventListener("click", e => {
    if (!phone()) return;
    const b = e.target.closest("[data-simk]"); if (!b) return; e.preventDefault();
    const [k, a] = b.dataset.simk.split(/:(.*)/s);
    if (k === "scan") return window.qrScan?.();
    if (k === "plus") return plusSheet();
    if (k === "flis") return flisSheet();
    if (k === "skra") { try { kind = "tima"; PREFILL = null; openSheet(); } catch (x) {} return; }
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
  // Spjall í síma: rásalistinn fyrst; samtalið opnast þegar rás er valin, með „Til baka“ í listann
  function spjallFix() {
    if (cur() !== "spjall") return; const w = document.querySelector("#view .spwrap"); if (!w) return;
    w.classList.add("simsp");
    if (!window.SIMSP) { w.querySelector(".spconv")?.remove(); return; }
    w.classList.add("simspc");
    const c = w.querySelector(".spconv"); if (c && !c.querySelector(".simback")) c.insertAdjacentHTML("afterbegin", `<button type="button" class="uback simback" data-simsp="0">${ico("chev", 14).replace("M9 6l6 6-6 6", "M15 6l-6 6 6 6")}Spjall</button>`);
    const m = w.querySelector(".spmsgs"); if (m) m.scrollTop = m.scrollHeight;
  }
  document.addEventListener("click", e => {
    if (!phone()) return;
    if (e.target.closest('[data-act^="spras:"],[data-act^="spto:"],[data-act^="spopen:"]')) window.SIMSP = true;
    else if (e.target.closest('[data-simsp="0"]')) { window.SIMSP = false; render(); }
    if (e.target.closest('[data-act^="u1tm:"]')) window.SIMTM = true;
    else if (e.target.closest('[data-simtm="0"]')) { window.SIMTM = false; render(); }
    else if (e.target.closest('[data-act^="tab:"],button[data-tab],a[data-tab],[data-simtab]')) { window.SIMTM = false; if (!e.target.closest('[data-act^="spto:"],[data-act^="spopen:"]')) window.SIMSP = false; }
  }, true);
  function decorate() {
    document.body.classList.toggle("simidet", !!det());
    if (!phone()) { document.getElementById("simact")?.remove(); document.body.classList.remove("simhasact"); return; }
    document.body.classList.remove("simdag");
    views(); splitFix(); spjallFix(); secChips(); actBar(); bar(); try { bell(); } catch (e) {}
    // Hlutar sem neðri stikan opnar beint (Í dag, Leita, Tímar, Meira) eru efsta stig – enginn „Til baka“
    if (!det() && /^(yfirlit|leit|meira|timar|tfaer|tskyr|timyf)$/.test(cur())) document.querySelectorAll("#view .uback:not(.simback)").forEach(b => b.remove());
    // „Meira“ í neðri stiku: virkt þegar opinn hluti er ekki í stikunni
    const mb = document.querySelector('#tbar [data-tab="meira"] .tl'); if (mb) mb.textContent = "Ég";
  }
  const _dm = window.drawMenu; if (_dm) { const dmS = function () { const r = _dm.apply(this, arguments); try { if (phone()) bar(); } catch (e) {} return r; }; window.drawMenu = dmS; try { drawMenu = dmS; } catch (e) {} }
  const _render = window.render || render;
  function renderS() { mapTab(); _render.apply(this, arguments); try { decorate(); } catch (e) { console.warn("simi", e); } }
  window.render = renderS; try { render = renderS; } catch (e) {}
  matchMedia("(min-width:1024px)").addEventListener?.("change", () => { drawer(false); try { if (typeof S !== "undefined" && S) render(); } catch (e) {} });
})();
