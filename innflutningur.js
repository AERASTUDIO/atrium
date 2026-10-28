/* Innflutningur og kostnaðarverð (2.109.0–2.113.0, eining „innflutningur“, sjálfgefið óvirk – virk hjá Sonik).
   Markmið: tilboð byggð á verðum frá erlendum birgjum, með öllum gjöldum áætluðum, og eftirfylgni sem ber áætlun saman við
   raunkostnað úr tollskýrslunni (tekjuleki). Líkanið (2.113.0) byggir á raunverulegri sendingu Sonik (SAD og CUSTAR, DHL, okt. 2026):
     Tollverð = kaupverð × tollgengi + flutningur (nema birgir sjái um flutning, t.d. CPT/DAP – þá innifalinn í verði).
     Úrvinnslugjöld = kr./kg (raftæki nettó + umbúðir). VSK = 24 % af tollverði + tollum + úrvinnslugjöldum (innskattur, ekki kostnaður).
     Miðlun = gjöld flutningsaðila/tollmiðlara eftir gjaldskrá hans (DHL, Eimskip …) eða reynslu.
     Flutningur: innifalinn · upphæð úr tilboði · áætlaður eftir kg (kr./kg úr reynslu birgis) · % af kaupverði.
     Kostnaðarverð = tollverð + úrvinnslugjöld + gjald utan Evrópu + miðlun + óvissuálag (meðan reynsla er lítil).
   Reynsla: meðaltal síðustu 5 tollskýrslna (pantanir) og eldri sendinga (Stillingar) – fryst á tilboði þegar það er vistað.
   Tollskýrslu má lesa úr PDF (SAD og CUSTAR) með pdf.js.
   Gögn (engin ný söfn, engar nýjar reglur):
     tilbod|pantanir/{id}.ink = { dags, gengi: { k, dags, src }, s: [ sending ] }
       sending = { id, birgir, mynt, utan, fa (flutningsaðili), flutnH (inni|upph|kg|pct), kg, m3, flutn, flutnM, vatr, flutnKg, flutnP,
                   tollsk (miðlun handvirkt), alag, hopur, syn, lysing, fz (frosin upplausn), linur: [ { k, v?, heiti, bnr, magn, verd, kg, alag, sv, hopur } ],
                   stada, pantad, komid, ts: { nr, dags, gengi, tollverd, tollur, urv, vsk, kg, flutn, utan, midlun, innlent } }
     línur skjalsins: l.ik = { k, s, kostn (kostnaðarverð/stk) }
     app/state.stillingar.innflutningur = { alag, namun, flutnP, urvKg, umbKg, nettoP, ovissa, ovissaN, utanP, fyrirvari, gengi,
       fa: [ flutningsaðilar með gjaldskrá ], birgjar: [{ nafn, mynt, fa, inni, flutnKg, flutnP, alag, utan }], saga: [ eldri sendingar ] }
   Tollgengi: netþjónsfallið tollgengi (functions/index.js) sækir XML Skattsins; annars slegið inn. */
(function () {
  if (window.__innfl) return; window.__innfl = 1;
  const tr = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const on = () => tr(() => ON("innflutningur"), false);
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const A = () => window.salaAPI;
  const VR = () => tr(() => A().VR(), []) || [];
  const findV = id => VR().find(v => String(v.id) === String(id));
  const vett = () => tr(() => window.isVett(), false);
  const ed = () => tr(() => !!MCP, false) && !vett();
  const uid = () => (crypto.randomUUID?.() || String(Date.now() + Math.random())).replace(/-/g, "").slice(0, 12);
  const kr = n => String(Math.round(+n || 0)).replace(/-/, "−").replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " kr.";
  const fx = (n, d = 2) => { const v = Math.round((+n || 0) * 10 ** d) / 10 ** d; return String(v).replace(".", ","); };
  const num = s => { let t = String(s ?? "").trim().replace(/\s|kr\.?|€|\$|£/gi, ""); if (!t) return 0;
    if (/,\d{1,2}$/.test(t) || (/,/.test(t) && /\./.test(t) && t.lastIndexOf(",") > t.lastIndexOf("."))) t = t.replace(/\./g, "").replace(",", "."); else t = t.replace(/,/g, "");
    const v = parseFloat(t); return isFinite(v) ? v : 0; };
  const DOC = id => tr(() => A().TB().concat(A().PN()).find(x => String(x.id) === String(id)), null);
  const saveDoc = (id, fn) => saveSnapshot(s => { const q = (s.tilbod || []).find(x => String(x.id) === String(id)) || (s.pantanir || []).find(x => String(x.id) === String(id)); if (q) fn(q, s); });
  const MYNTIR = ["EUR", "USD", "GBP", "DKK", "SEK", "NOK", "CHF", "JPY", "CNY", "CAD", "AUD", "PLN"];
  /* 2.114.4 (fyrst í dev – ORG.innflV2): flutningur og vátrygging eins og á aðflutningsskýrslu Skattsins.
     Flutningur er alltaf þekkt upphæð: frá birgja eða úr tilboði íslensks flutningsaðila, í þeirri mynt sem hann er gefinn upp í.
     Vátrygging: raunupphæð ef hún liggur fyrir, annars hlutfall af vöruverði + flutningi – 1 % almennt, 1,5 % bifreiðar, 2 % gler (leiðbeiningar Skattsins).
     Tollverð = kaupverð × tollgengi + flutningur × tollgengi myntar hans + vátrygging. Tollmiðlun og gjöld flutningsaðila eru sér (Miðlun).
     Reitir á sendingu: flutnUr (birgir | fa), flutnNr, flutnM, vatrH (pct | upph), vatrP, vatrM. */
  const V2 = () => !!window.ORG?.innflV2;
  const VATR_P = [[1, "1 % – almennt"], [1.5, "1,5 % – bifreiðar"], [2, "2 % – gler"]];
  const DEMO_GENGI = { EUR: 136.4, USD: 121.92, GBP: 162.73, DKK: 18.248, SEK: 12.246, NOK: 13.047, CHF: 147.57, JPY: 0.7743, CNY: 18.283, CAD: 86.91, AUD: 85.64, PLN: 30.973 };   // tollgengi 27.10.2026

  /* ---------- Stillingar ---------- */
  /* Líkanið (2.113.0, byggt á raunverulegri sendingu Sonik: SAD og CUSTAR frá DHL, október 2026):
     Tollverð (CIF) = kaupverð á tollgengi + flutningur + vátrygging (ef birgir sér ekki um flutning – CPT/DAP: innifalinn í verði).
     Úrvinnslugjöld eru kr./kg: raftæki (BU, t.d. 24 kr./kg nettó) og umbúðir (BY o.fl.) – ekki % af verði.
     VSK (Ö6) = 24 % af tollverði + tollum + úrvinnslugjöldum – innskattur, ekki kostnaður.
     Miðlun = gjöld flutningsaðila/tollmiðlara (tollafgreiðsla, tollskýrslugerð, uppskipun …) eftir gjaldskrá hans, eða reynslu.
     Flutningur: innifalinn (birgir sér um) · þekkt upphæð (úr tilboði) · áætlaður eftir kg (kr./kg úr reynslu) · % af kaupverði. */
  const FYRIRVARI = "Verð á vörum sem fluttar eru inn sérstaklega fyrir þetta tilboð er með fyrirvara um breytingar á gengi og flutningskostnaði.";
  // Flutningsaðilar með gjaldskrá (sjálfgefin gildi úr birtum gjaldskrám – breytanleg í Stillingar › Innflutningur)
  const FA0 = [
    { id: "dhl", nafn: "DHL Express", tollafgr: 1400, tollafgrP: 2, tollafgrMin: 2500, tollsk: 0, tollskLina: 0, uppskM3: 0, uppskT: 0, uppskMin: 0, annad: 0, heimild: "DHL Express Iceland, verðskrá 2024" },
    { id: "eimskip", nafn: "Eimskip – sjófrakt", tollafgr: 0, tollafgrP: 0, tollafgrMin: 0, tollsk: 14081, tollskLina: 967, uppskM3: 6475, uppskT: 12896, uppskMin: 9650, annad: 0, heimild: "Eimskip, gjaldskrá 1.7.2026" },
    { id: "annad", nafn: "Annar flutningsaðili", tollafgr: 0, tollafgrP: 0, tollafgrMin: 0, tollsk: 14081, tollskLina: 967, uppskM3: 0, uppskT: 0, uppskMin: 0, annad: 0, heimild: "" }];
  const CFG = () => { const c = { alag: 30, utanP: 1, namun: 10, flutnP: 10, urvKg: 24, umbKg: 7, nettoP: 90, ovissa: 3, ovissaN: 3, fyrirvari: FYRIRVARI, saga: [], birgjar: [], ...(tr(() => S.stillingar.innflutningur, null) || {}) };
    c.fa = c.fa && c.fa.length ? c.fa : FA0.map(x => ({ ...x })); return c; };
  const saveCfg = fn => saveSnapshot(s => { s.stillingar = s.stillingar || {}; s.stillingar.innflutningur = { ...CFG(), ...(s.stillingar.innflutningur || {}) }; fn(s.stillingar.innflutningur, s); });
  const tom = x => x === "" || x == null;
  const alagB = b => b && !tom(b.alag) ? +b.alag : CFG().alag;            // álagning birgis eða sjálfgefin
  const alagS = s => !tom(s.alag) ? +s.alag : alagB(birgir(s.birgir));   // álagning sendingar
  const birgir = n => CFG().birgjar.find(b => String(b.nafn || "").toLowerCase() === String(n || "").trim().toLowerCase()) || null;
  const faOf = id => CFG().fa.find(f => f.id === id) || null;
  const faDef = s => s.fa || birgir(s.birgir)?.fa || "annad";
  const kaupMyntS = s => (s.linur || []).reduce((a, l) => a + (+l.magn || 0) * (+l.verd || 0), 0);
  const kgS = s => !tom(s.kg) && +s.kg > 0 ? +s.kg : (s.linur || []).reduce((a, l) => a + (+l.kg || 0) * (+l.magn || 0), 0);
  // Flutningsmáti sendingar: inni (birgir sér um flutning) · upph (þekkt upphæð) · kg (áætlaður eftir kg) · pct (% af kaupverði)
  const flM = s => s.flutnH || (!tom(s.flutn) && +s.flutn > 0 ? "upph" : kgS(s) ? "kg" : "pct");

  /* Reynsla: úr skráðum tollskýrslum (pöntunum) og eldri sendingum – meðaltal síðustu 5.
     Eftir birgi: flutningur kr./kg (ef kg skráð) og % af kaupverði, úrvinnslugjöld kr./kg og % af tollverði.
     Eftir flutningsaðila: miðlun (gjöld flutningsaðila/tollmiðlara á sendingu). */
  function faerslur() {
    const L = [], seen = new Set();
    tr(() => A().PN().concat(A().TB()), []).forEach(T => (T.ink?.s || []).forEach(s => { const t = s.ts; if (!t || seen.has(s.id)) return; seen.add(s.id);
      const g = s.mynt === "ISK" ? 1 : +t.gengi || +(T.ink.gengi?.k || {})[s.mynt] || 0;
      L.push({ birgir: s.birgir, fa: faDef(s), inni: flM(s) === "inni", d: t.dags || "", kaup: kaupMyntS(s) * g, kg: +t.kg || kgS(s), tollverd: +t.tollverd || 0, urv: !tom(t.urv) ? +t.urv : +t.gjold || 0, flutn: t.flutn, midlun: +t.midlun || 0 }); }));
    (CFG().saga || []).forEach(h => L.push({ birgir: h.birgir, fa: h.fa || birgir(h.birgir)?.fa || "annad", inni: !!h.inni, d: h.dags || "", kaup: (+h.kaupM || 0) * (h.mynt === "ISK" ? 1 : +h.gengi || 0), kg: +h.kg || 0, tollverd: +h.tollverd || 0, urv: !tom(h.urv) ? +h.urv : +h.gjold || 0, flutn: h.flutn, midlun: +h.midlun || 0 }));
    return L.filter(x => x.kaup > 0 && x.tollverd > 0);
  }
  const medal = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const sid5 = a => a.sort((x, y) => String(y.d).localeCompare(String(x.d))).slice(0, 5);
  function reynsla(nafn) {
    const n = String(nafn || "").trim().toLowerCase(); if (!n) return { n: 0 };
    const X = sid5(faerslur().filter(x => String(x.birgir || "").trim().toLowerCase() === n)); if (!X.length) return { n: 0 };
    const F = X.filter(x => !x.inni).map(x => ({ ...x, fl: !tom(x.flutn) ? +x.flutn : x.tollverd - x.kaup })).filter(x => x.fl >= 0);
    return { n: X.length, flutnP: medal(F.map(x => x.fl / x.kaup * 100)), flutnKg: medal(F.filter(x => x.kg > 0).map(x => x.fl / x.kg)), nKg: F.filter(x => x.kg > 0).length,
      urvKg: medal(X.filter(x => x.kg > 0).map(x => x.urv / x.kg)), urvP: medal(X.map(x => x.urv / x.tollverd * 100)), inni: X.filter(x => x.inni).length };
  }
  function reynslaFA(fa) { const X = sid5(faerslur().filter(x => x.fa === fa && x.midlun > 0)); return { n: X.length, midlun: medal(X.map(x => x.midlun)) }; }
  const rsT = n => `reynsla, ${n} ${n === 1 ? "sending" : "sendingar"}`;
  // Upplausn sendingar (fryst á tilboðinu þegar það er vistað): flutningur, úrvinnslugjöld, miðlun og óvissuálag
  function upplausn(s) {
    if (s.fz && s.fz.v === 2) return s.fz;
    const C = CFG(), b = birgir(s.birgir), R = reynsla(s.birgir), RF = reynslaFA(faDef(s));
    const flP = !tom(s.flutnP) ? [+s.flutnP, "% sendingar"] : b && !tom(b.flutnP) ? [+b.flutnP, "% birgis"] : R.flutnP != null ? [R.flutnP, rsT(R.n)] : [+C.flutnP || 0, "sjálfgefið"];
    const flKg = !tom(s.flutnKg) ? [+s.flutnKg, "slegið inn"] : b && !tom(b.flutnKg) ? [+b.flutnKg, "kr./kg birgis"] : R.flutnKg != null ? [R.flutnKg, rsT(R.nKg)] : [null, ""];
    const urv = R.urvKg != null ? [R.urvKg, rsT(R.n)] : [(+C.urvKg || 0) * (+C.nettoP || 0) / 100 + (+C.umbKg || 0), "sjálfgefið"];
    const ov = flM(s) !== "upph" && flM(s) !== "inni" && R.n < (+C.ovissaN || 0) ? +C.ovissa || 0 : 0;
    return { v: 2, flutnP: flP[0], flutnPSrc: flP[1], flutnKg: flKg[0], flutnKgSrc: flKg[1], urvKg: urv[0], urvSrc: urv[1], urvP: R.urvP, ovP: ov, ovSrc: ov ? (R.n ? `aðeins ${R.n} ${R.n === 1 ? "tollskýrsla" : "tollskýrslur"}` : "engin reynsla") : "",
      midlun: RF.midlun != null ? Math.round(RF.midlun) : null, midlunSrc: RF.midlun != null ? rsT(RF.n) : "" };
  }
  // Miðlun eftir gjaldskrá flutningsaðila: tollafgreiðsla (+ % af aðflutningsgjöldum, lágmark) + tollskýrslugerð (+ aukalínur) + uppskipun
  function midlunGjaldskra(F, tl, kg, m3, gjold) {
    if (!F) return 0; let x = (+F.tollafgr || 0) + (+F.tollsk || 0) + Math.max(0, tl - 1) * (+F.tollskLina || 0) + (+F.annad || 0);
    if (+F.tollafgrP || +F.tollafgrMin) x += Math.max(+F.tollafgrMin || 0, gjold * (+F.tollafgrP || 0) / 100);
    if (+F.uppskM3 || +F.uppskT || +F.uppskMin) x += Math.max(+F.uppskMin || 0, (+F.uppskM3 || 0) * (+m3 || 0), (+F.uppskT || 0) * (+kg || 0) / 1000);
    return x;
  }

  /* ---------- Tollgengi ---------- */
  // Dagsetning í ISO-sniði (Skatturinn skilar dd-mm-áááá eða áááá-mm-dd)
  const isoD = d => { const t = String(d || "").slice(0, 10), m = t.match(/^(\d{2})[-.](\d{2})[-.](\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : t; };
  async function saekjaGengi() {
    if (window.AERA_DEMO) return { k: { ...DEMO_GENGI }, dags: new Date().toISOString().slice(0, 10), src: "sýnigengi" };
    const pid = window.ORG?.firebase?.projectId;
    if (pid) { try { const r = await fetch(`https://europe-west1-${pid}.cloudfunctions.net/tollgengi`, { cache: "no-store" }); if (r.ok) { const j = await r.json(); if (j && j.k && Object.keys(j.k).length) return { ...j, dags: isoD(j.dags), src: "Skatturinn (tollgengi)" }; } } catch (e) {} }
    return null;
  }
  async function gengiNu(force) {
    const g = CFG().gengi, t = new Date().toISOString().slice(0, 10);
    if (!force && g && g.k && g.sott && g.sott.slice(0, 10) === t) return g;
    const n = await saekjaGengi();
    if (n) { const v = { ...n, sott: new Date().toISOString() }; if (ed()) await saveCfg(c => { c.gengi = v; }).catch(() => {}); return v; }
    return g || null;
  }

  /* ---------- Útreikningur ---------- */
  function reikna(ink) {
    const C = CFG(), G = (ink.gengi && ink.gengi.k) || {}, out = [];
    let T = { kaup: 0, flutn: 0, tollverd: 0, urv: 0, utan: 0, midlun: 0, ov: 0, kostn: 0, sala: 0, vsk: 0, kg: 0 };
    (ink.s || []).forEach(s => {
      const g = s.mynt === "ISK" ? 1 : (+s.gengi || +G[s.mynt] || 0), alag0 = alagS(s), U = upplausn(s), mt = flM(s);
      const L = (s.linur || []).filter(l => (+l.magn || 0) > 0 && (+l.verd > 0 || +l.sv > 0));   // aðeins línur með verði
      const rows = L.map(l => { const m = +l.magn || 0; return { l, m, kaupM: (+l.verd || 0) * m, kgL: (+l.kg || 0) * m }; });
      const kaupM = rows.reduce((a, r) => a + r.kaupM, 0), kaup = kaupM * g, kg = kgS(s), allKg = rows.length && rows.every(r => r.kgL > 0), kgL = rows.reduce((a, r) => a + r.kgL, 0);
      // Flutningur og vátrygging (í krónum)
      let flutn = 0, flSrc = "", vatr = 0, vatrSrc = "";
      const gM = m => !m || m === "ISK" ? 1 : (+G[m] || 0);
      if (V2()) {
        { const fm = s.flutnM || s.mynt, fv = +s.flutn || 0; flutn = fv * gM(fm); flSrc = (s.flutnUr === "fa" ? "tilboð flutningsaðila" + (s.flutnNr ? " nr. " + s.flutnNr : "") : "frá birgja") + (fm && fm !== "ISK" && fv ? ` · ${fx(fv)} ${fm} × ${fx(gM(fm), 4)}` : "") + (!fv ? " – vantar upphæð" : ""); }
        if ((s.vatrH || (+s.vatr > 0 ? "upph" : "pct")) === "upph") { const vm = s.vatrM || s.mynt; vatr = (+s.vatr || 0) * gM(vm); vatrSrc = "raunupphæð" + (vm && vm !== "ISK" ? ` (${fx(+s.vatr || 0)} ${vm})` : ""); }
        else { const vp = +(s.vatrP ?? 1) || 1; vatr = (kaup + flutn) * vp / 100; vatrSrc = `${fx(vp, 1)} % af vöruverði + flutningi`; }
      }
      else if (mt === "upph") { flutn = ((+s.flutn || 0) + (+s.vatr || 0)) * (s.flutnM === "ISK" ? 1 : g); flSrc = "þekkt upphæð"; }
      else if (mt === "kg" && kg && U.flutnKg != null) { flutn = kg * U.flutnKg; flSrc = `${fx(U.flutnKg, 0)} kr./kg × ${fx(kg, 1)} kg (${U.flutnKgSrc})`; }
      else if (mt === "inni") { flutn = 0; flSrc = "innifalinn í verði birgis"; }
      else { flutn = kaup * (U.flutnP || 0) / 100; flSrc = `${fx(U.flutnP, 1)} % af kaupverði (${U.flutnPSrc})${mt === "kg" ? " – vantar " + (kg ? "reynslu í kr./kg" : "þyngd") : ""}`; }
      const flutnV = flutn + vatr;   // dreift á línur saman (V2: vátrygging sér í samtölum)
      const tollverd = kaup + flutnV;
      const urv = V2() ? kgL * U.urvKg : kg ? kg * U.urvKg : tollverd * (U.urvP != null ? U.urvP : 0.1) / 100, urvSrc = V2() ? (kgL ? `${fx(U.urvKg, 1)} kr./kg × ${fx(kgL, 1)} kg á vörum` : "engin þyngd skráð á vörur") : kg ? `${fx(U.urvKg, 1)} kr./kg (${U.urvSrc})` : "áætlað (vantar þyngd)";
      const utan = s.utan && !V2() ? tollverd * (+C.utanP || 0) / 100 : 0, vsk = (tollverd + urv) * 0.24;
      const tl = new Set(rows.map(r => (r.l.v && findV(r.l.v)?.tollnr) || r.l.tollnr || r.l.k)).size, F = faOf(faDef(s));
      const midlun = !kaupM ? 0 : V2() ? (+s.tollsk || 0) : !tom(s.tollsk) ? +s.tollsk : U.midlun != null ? U.midlun : midlunGjaldskra(F, tl, kg, s.m3, vsk + urv);
      const midlunSrc = V2() ? (tom(s.tollsk) ? "vantar upphæð" : "slegið inn") : !tom(s.tollsk) ? "slegið inn" : U.midlun != null ? U.midlunSrc : (F ? F.nafn + ", gjaldskrá" : "");
      const ov = tollverd * (+U.ovP || 0) / 100;
      const fast = urv + utan + midlun + ov;   // dreift á línur
      const share = r => allKg && !V2() ? r.kgL / kgL : kaupM ? r.kaupM / kaupM : 1 / rows.length;
      const S1 = { kaup: 0, flutn: 0, tollverd: 0, urv: 0, utan: 0, midlun: 0, ov: 0, kostn: 0, sala: 0, vsk: 0 };
      const lines = rows.map(r => { const sh = share(r), k = r.kaupM * g, f = flutnV * sh, tv = k + f, kostn = tv + fast * sh, kstk = r.m ? kostn / r.m : 0;
        const alag = !tom(r.l.alag) ? +r.l.alag : alag0, nm = Math.max(1, +C.namun || 1);
        const svA = Math.ceil(kstk * (1 + alag / 100) / nm) * nm, sv = +r.l.sv > 0 ? +r.l.sv : svA, sala = sv * r.m;
        const o = { kaup: k, flutn: f, tollverd: tv, urv: urv * sh, utan: utan * sh, midlun: midlun * sh, ov: ov * sh, kostn, sala, vsk: vsk * sh };
        Object.entries(o).forEach(([q, v]) => { S1[q] += v; });
        return { ...r, ...o, kstk, sv, svA, alag: kstk ? (sv / kstk - 1) * 100 : 0, alagSj: alag, handv: +r.l.sv > 0, fram: sala - kostn }; });
      Object.keys(S1).forEach(q => { T[q] += S1[q]; }); T.kg += kg; S1.kaupM = kaupM;
      S1.vatr = vatr; S1.flutnA = flutn; T.vatr = (T.vatr || 0) + vatr;
      out.push({ s, g, lines, sum: S1, kg, mt, flSrc, urvSrc, midlunSrc, tl, U, F, vatr, vatrSrc });
    });
    T.fram = T.sala - T.kostn; T.framP = T.sala ? T.fram / T.sala * 100 : 0;
    return { send: out, T };
  }

  // 2.114.4: flutningur og vátrygging (V2) – tveir kostir fyrir flutning, vátrygging eftir reglum Skattsins
  function flV2(s, si, r) {
    const V = (x, k) => x[k] === "" || x[k] == null ? "" : String(x[k]).replace(".", ",");
    const mt = s.flutnUr === "fa" ? "fa" : "birgir", myS = (k, cur) => `<select data-f="s:${si}:${k}" aria-label="Mynt">${["ISK", ...MYNTIR].map(m => `<option${m === cur ? " selected" : ""}>${m}</option>`).join("")}</select>`;
    const vH = s.vatrH || (+s.vatr > 0 ? "upph" : "pct"), vSel = vH === "upph" ? "upph" : String(+(s.vatrP ?? 1) || 1);
    return `<div class="ikrow ikflm" role="group" aria-label="Flutningur">${[["birgir", "Flutningur frá birgja"], ["fa", "Tilboð frá flutningsaðila"]].map(([k, l]) => `<button type="button" class="ikchip${mt === k ? " on" : ""}" data-ik="flu:${si}:${k}" aria-pressed="${mt === k}">${l}</button>`).join("")}
      ${true ? `<label class="ikin">Flutningsgjald<input data-f="s:${si}:flutn" inputmode="decimal" value="${V(s, "flutn")}" placeholder="0"></label><label class="ikin">Mynt${myS("flutnM", s.flutnM || s.mynt)}</label>` : ""}
      ${mt === "fa" ? `<label class="ikin">Flutningsaðili<select data-f="s:${si}:fa">${CFG().fa.map(f => `<option value="${E(f.id)}"${f.id === faDef(s) ? " selected" : ""}>${E(f.nafn)}</option>`).join("")}</select></label>` : ""}
      ${mt === "fa" ? `<label class="ikin">Tilboð nr.<input data-f="s:${si}:flutnNr" value="${E(s.flutnNr || "")}" placeholder="Valfrjálst"></label>` : ""}
      <label class="ikin">Vátrygging<select data-f="s:${si}:vatrSel">${VATR_P.map(([v, l]) => `<option value="${v}"${vSel === String(v) ? " selected" : ""}>${l}</option>`).join("")}<option value="upph"${vSel === "upph" ? " selected" : ""}>Raunupphæð…</option></select></label>
      ${vH === "upph" ? `<label class="ikin">Upphæð<input data-f="s:${si}:vatr" inputmode="decimal" value="${V(s, "vatr")}" placeholder="0"></label><label class="ikin">Mynt${myS("vatrM", s.vatrM || s.mynt)}</label>` : ""}
      <label class="ikin">Tollmiðlun (kr.)<input data-f="s:${si}:tollsk" inputmode="decimal" value="${V(s, "tollsk")}" placeholder="0" title="Gjöld flutningsaðila/tollmiðlara fyrir sendinguna – sér liður, ekki í tollverði"></label>
      <span class="ikhint" style="flex-basis:100%">Tollverð ${E(kr(r.sum.tollverd))} = kaupverð ${E(kr(r.sum.kaup))} + flutningur ${E(kr(r.sum.flutnA))} + vátrygging ${E(kr(r.vatr))}</span></div>`;
  }

  /* ---------- Reiknir (gluggi) ---------- */
  const css = document.createElement("style");
  css.textContent = `
  .ikw{position:fixed;inset:0;z-index:180;background:rgba(10,16,20,.45);display:flex;align-items:stretch;justify-content:center;font-family:var(--f-display,Poppins,system-ui,sans-serif)}
  .ikw .ikb{background:var(--bg,#f5f7f8);color:var(--ink,#121416);width:min(1240px,100%);height:100%;overflow:auto;display:flex;flex-direction:column}
  @media (min-width:900px){.ikw{padding:24px}.ikw .ikb{border-radius:18px;height:auto;max-height:100%}}
  .ikw .ikh{position:sticky;top:0;z-index:3;background:var(--bg,#f5f7f8);display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--line,#dce3e8)}
  .ikw .ikh h2{margin:0;font-size:19px;font-weight:500;flex:1}.ikw .ikh small{display:block;font-size:12.5px;color:var(--muted);font-weight:400}
  .ikw .ikc{padding:16px 20px 8px;display:flex;flex-direction:column;gap:16px}
  .ikw .iks{background:var(--surface,#fff);border:1px solid var(--line,#dce3e8);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:12px}
  .ikw .ikg{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;align-items:end}
  .ikw label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)}
  .ikw input,.ikw select{font:inherit;font-size:14px;color:var(--ink);background:var(--bg,#fff);border:1px solid var(--line,#d5dde2);border-radius:9px;padding:8px 9px;min-height:38px;box-sizing:border-box;width:100%}
  .ikw input[type=checkbox]{width:auto;min-height:0}
  .ikw .ikchk{flex-direction:row;align-items:center;gap:8px;font-size:13px;color:var(--ink);min-height:38px}
  .ikw .iktw{overflow-x:auto}
  .ikw table{border-collapse:collapse;width:100%;min-width:1060px;font-size:13px}
  .ikw th{font-weight:500;color:var(--muted);text-align:left;padding:6px 4px;font-size:11.5px;white-space:nowrap}
  .ikw td{padding:3px 4px;vertical-align:middle}.ikw td input{min-height:34px;padding:6px 7px;font-size:13px}
  .ikw td.n,.ikw th.n{text-align:right;white-space:nowrap}.ikw td.n b{font-weight:500}
  .ikw .w-h{min-width:190px}.ikw .w-s{width:74px}.ikw .w-m{width:96px}.ikw .w-x{width:48px}
  .ikw .ikdel{border:0;background:none;color:var(--muted);font-size:18px;cursor:pointer;padding:4px 8px}
  .ikw .iksum{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px 16px;font-size:13px}
  .ikw .iksum div{display:flex;flex-direction:column}.ikw .iksum span{color:var(--muted);font-size:12px}.ikw .iksum b{font-weight:500;font-size:15px}
  .ikw .iksum .hi b{font-size:18px}.ikw .pos{color:#1d7a4f}.ikw .neg{color:#b4462f}
  .ikw .ikf{position:sticky;bottom:0;background:var(--bg,#f5f7f8);border-top:1px solid var(--line,#dce3e8);padding:12px 20px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
  .ikw .ikf .sp{flex:1}.ikw .ikhint{font-size:12.5px;color:var(--muted)}
  .ikw .ikrow{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .ikw textarea{font:inherit;font-size:13px;width:100%;min-height:110px;border:1px solid var(--line);border-radius:9px;padding:8px;box-sizing:border-box;background:var(--bg,#fff);color:var(--ink)}
  .ikw .ikman{color:#b4462f}.ikw .ikalg{color:var(--muted);font-size:11.5px;display:block}
  /* 2.110.0: hreinna útlit – minni rammar, reitir í töflu án ramma fyrr en þeir fá fókus, nánar undir ▾ */
  .ikw .ikb{width:min(1080px,100%)}
  .ikw .ikh{gap:10px;padding:14px 20px}.ikw .ikh h2{font-size:18px}
  .ikw .ikgh{display:flex}
  .ikw .ikchip{font:inherit;font-size:12.5px;border:1px solid var(--line,#d5dde2);background:var(--surface,#fff);color:var(--ink);border-radius:20px;padding:5px 11px;cursor:pointer;white-space:nowrap}
  .ikw .ikchip.on{background:#e6eef7;border-color:#bcd0e6;color:#1f5a96}
  .ikw .ikib{border:0;background:none;color:var(--muted);font-size:15px;line-height:1;cursor:pointer;padding:6px 7px;border-radius:8px}.ikw .ikib:hover{background:var(--bg,#eef2f4);color:var(--ink)}.ikw .ikib.big{font-size:22px}
  .ikw .iklink{border:0;background:none;font:inherit;font-size:13px;color:var(--accent,#2a7289);cursor:pointer;padding:4px 2px;text-align:left}
  .ikw .ikc{gap:12px;padding:14px 20px 8px}
  .ikw .iks{padding:12px 14px;gap:8px;border-radius:12px}
  .ikw .ikslim{gap:8px}.ikw .ikslim b{font-weight:500}
  .ikw .ikshead{gap:8px}.ikw .ikbn{max-width:280px;font-weight:500}.ikw .ikmy{width:auto;min-width:84px}
  .ikw .iksf{font-size:13px;color:var(--muted)}.ikw .iksf b{font-weight:500}
  .ikw .ikcost{margin-top:-2px}.ikw .ikcost .iklink{color:var(--muted);font-size:12.5px}
  .ikw .ikopt{gap:8px;align-items:flex-end;background:var(--bg,#f5f7f8);border-radius:10px;padding:10px}
  .ikw .ikin{display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:var(--muted);width:120px}.ikw .ikin.wide{width:200px}
  .ikw .ikin input,.ikw .ikin select{min-height:34px;padding:6px 8px;font-size:13px}
  .ikw .iklbh{display:flex;gap:3px}.ikw .iklbh input{width:44px;min-width:0}
  .ikw table{min-width:760px}
  .ikw thead th{border-bottom:1px solid var(--line,#e3e8ec);padding:4px 6px}
  .ikw tr.ikl td{border-bottom:1px solid var(--line,#eef1f3);padding:2px 4px}
  .ikw tr.ikl td input{border-color:transparent;background:transparent;min-height:34px}
  .ikw tr.ikl td input:hover{border-color:var(--line,#d5dde2)}.ikw tr.ikl td input:focus{border-color:var(--accent,#2a7289);background:var(--surface,#fff);outline:none}
  .ikw td input.n{text-align:right}.ikw td input.man{color:#b4462f}
  .ikw td.c{color:var(--muted)}.ikw .ikalg.neg{color:#b4462f}
  .ikw td.ikact{white-space:nowrap;width:1%;text-align:right}
  .ikw tr.ikdet td{background:var(--bg,#f5f7f8);padding:10px;border-bottom:1px solid var(--line,#eef1f3)}
  .ikw .w-h{min-width:220px}.ikw .w-s{width:70px}.ikw .w-m{width:104px}
  .ikw .ikf{gap:12px}.ikw .iktot{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:var(--muted)}.ikw .iktot b{color:var(--ink);font-weight:500;font-size:15px}.ikw .iktot b.pos{color:#1d7a4f}.ikw .iktot b.neg{color:#b4462f}
  .ikw .sp{flex:1}
  .ikw .ikkg{display:flex;flex-direction:row;align-items:center;gap:4px;font-size:13px;color:var(--muted)}.ikw .ikkg input{width:78px;text-align:right}
  .ikw .ikflm{gap:6px;align-items:flex-end}.ikw .ikflm .ikin{width:110px}
  .ikcard{border:1px solid var(--line,#dce3e8);border-radius:14px;padding:14px 16px;background:var(--surface,#fff);margin:12px 0;display:flex;flex-direction:column;gap:10px}
  .ikcard .ikct{display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap}.ikcard .ikct b{font-weight:500;font-size:15px}
  .ikcard .ikct small{color:var(--muted);font-weight:400;font-size:12.5px;display:block}
  .ikcard .ikk{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px 14px}
  .ikcard .ikk div{display:flex;flex-direction:column}.ikcard .ikk span{color:var(--muted);font-size:12px}.ikcard .ikk b{font-weight:500;font-size:16px}
  .ikcard .pos{color:#1d7a4f}.ikcard .neg{color:#b4462f}
  .ikcard .ikbs{display:flex;flex-direction:column;gap:8px}
  .ikcard .ikbr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 12px;align-items:center;border-top:1px solid var(--line,#e3e8ec);padding-top:10px}
  .ikcard .ikbr small{color:var(--muted);display:block;font-size:12px}.ikcard .ikbr .ikbb{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
  .ikcard .ikst{display:inline-block;font-size:11.5px;border-radius:20px;padding:2px 9px;background:var(--bg,#eef2f4);color:var(--muted);margin-left:6px}
  .ikcard .ikst.ok{background:#e3f3ea;color:#1d7a4f}.ikcard .ikst.go{background:#e6eef7;color:#1f5a96}.ikcard .ikst.wa{background:#fbefe0;color:#9a5b12}
  .ikg3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:8px}@media (max-width:640px){.ikg3{grid-template-columns:1fr 1fr}}
  .ikg3 label{display:flex;flex-direction:column;gap:4px;font-size:12.5px}
  .iktsdrop{display:flex;flex-direction:column;gap:2px;border:1.5px dashed var(--line,#c9d3da);border-radius:12px;padding:12px 14px;cursor:pointer;font-size:13px}.iktsdrop b{font-weight:500}.iktsdrop span{color:var(--muted);font-size:12.5px}.iktsdrop.on{border-color:var(--accent,#2a7289);background:rgba(42,114,137,.06)}
  .ikfa table{border-collapse:collapse;font-size:13px}.ikfa th{font-weight:500;color:var(--muted);text-align:left;font-size:11.5px;padding:4px;white-space:nowrap}.ikfa td{padding:3px 4px}.ikfa input,.ikfa select{min-height:34px;padding:5px 7px;font-size:13px}.ikfa select{min-width:84px}.ikfa td:first-child input{min-width:150px}
  .iksaga .ls{white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
  .ikstrip{border:1px solid var(--line,#dce3e8);border-radius:14px;padding:12px 16px;background:var(--surface,#fff);margin:12px 0;display:flex;gap:18px;flex-wrap:wrap;align-items:center;cursor:pointer}
  .ikstrip b{font-weight:500}.ikstrip span{color:var(--muted);font-size:12.5px}.ikstrip .neg{color:#b4462f}.ikstrip .pos{color:#1d7a4f}
  `;
  document.head.appendChild(css);

  let W = null;   // { id, ink (vinnueintak), el }
  function nySending(b) { const B = b ? birgir(b) : null; return { id: uid(), birgir: B?.nafn || b || "", mynt: B?.mynt || "EUR", utan: !!B?.utan, flutn: "", flutnM: "ISK", vatr: "", tollsk: "", alag: "", hopur: "", syn: "linur", linur: [nyLina()] }; }
  function nyLina(o) { return { k: uid(), v: null, heiti: "", bnr: "", magn: 1, verd: "", kg: "", l: "", b: "", h: "", agj: "", alag: "", sv: "", hopur: "", ...(o || {}) }; }

  async function opna(id) {
    const T = DOC(id); if (!T) return;
    const ink = T.ink ? structuredClone(T.ink) : { s: [nySending()] };
    if (!ink.s || !ink.s.length) ink.s = [nySending()];
    const w = document.createElement("div"); w.className = "ikw"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", "Reikna úr verðum birgja");
    w.innerHTML = `<div class="ikb"><div class="ikh"><h2>Reikna úr verðum birgja<small>${E((T.nr || "") + " · " + (T.heiti || T.vidskiptavinur || ""))}</small></h2><span class="ikgh"></span><button type="button" class="ikib big" data-ik="x" aria-label="Loka">×</button></div><div class="ikc"></div><div class="ikf"></div></div>`;
    document.body.append(w); document.body.classList.add("qropen");
    W = { id, ink, el: w };
    if (!ink.gengi || !ink.gengi.k) { const g = await gengiNu(); ink.gengi = g ? { k: { ...g.k }, dags: g.dags || "", src: g.src || "" } : { k: {}, dags: "", src: "slegið inn" }; }
    draw();
    w.addEventListener("click", klikk); w.addEventListener("input", inn); w.addEventListener("change", inn);
    w.addEventListener("keydown", e => { if (e.key === "Escape") loka(); });
  }
  function loka() { if (!W) return; W.el.remove(); W = null; document.body.classList.remove("qropen"); }
  const V = (x, k) => x[k] === "" || x[k] == null ? "" : String(x[k]).replace(".", ",");

  const dIS = d => { const t = isoD(d); return t ? t.split("-").reverse().join(".") : ""; };
  function draw(keepFocus) {
    if (!W) return; const { ink, el } = W, R = reikna(ink), C = CFG(), G = ink.gengi || { k: {} }, ui = W.ui || (W.ui = { opin: {}, lx: {}, gengi: false });
    const af = document.activeElement, fk = af && af.dataset ? af.dataset.f : null, fp = af && af.selectionStart;
    const myntir = [...new Set(ink.s.flatMap(s => [s.mynt, ...(V2() ? [+s.flutn ? (s.flutnM || s.mynt) : null, s.vatrH === "upph" ? (s.vatrM || s.mynt) : null] : [])]).filter(m => m && m !== "ISK"))];
    // Haus: tollgengi sem lítil merki – smellt til að breyta
    const gtxt = myntir.map(m => E(m) + " " + (G.k && G.k[m] ? E(fx(G.k[m], 2)) : '<span class="ikman">vantar</span>')).join(" · ");
    el.querySelector(".ikgh").innerHTML = `<button type="button" class="ikchip" data-ik="tg">Tollgengi${G.dags ? " " + E(dIS(G.dags)) : ""} · ${gtxt || "–"} <span aria-hidden="true">✎</span></button>`;
    const gengiH = ui.gengi ? `<section class="iks ikslim"><div class="ikrow"><b>Tollgengi</b><span class="ikhint">${E(G.src || "")}${G.dags ? " · gildir frá " + E(dIS(G.dags)) : ""} · festist á tilboðinu</span><span class="sp"></span><button type="button" class="btn sm" data-ik="gengi">Sækja tollgengi dagsins</button></div>
      <div class="ikrow">${(myntir.length ? myntir : ["EUR"]).map(m => `<label class="ikin">${E(m)}<input data-f="g:${E(m)}" inputmode="decimal" value="${E(G.k && G.k[m] != null ? String(G.k[m]).replace(".", ",") : "")}" placeholder="0"></label>`).join("")}</div></section>` : "";
    const sH = R.send.map((r, si) => { const s = r.s, b = birgir(s.birgir), sm = r.sum, fr = sm.sala - sm.kostn, op = !!ui.opin[s.id];
      const rows = s.linur.map((l, li) => { const x = r.lines.find(z => z.l === l), lx = !!ui.lx[l.k];
        const main = `<tr class="ikl${lx ? " open" : ""}"><td class="w-h"><input data-f="l:${si}:${li}:heiti" list="ikvl" value="${E(l.heiti)}" placeholder="Vara eða lýsing"></td>
          <td class="w-s"><input class="n" data-f="l:${si}:${li}:magn" inputmode="decimal" value="${V(l, "magn")}"></td>
          <td class="w-m"><input class="n" data-f="l:${si}:${li}:verd" inputmode="decimal" value="${V(l, "verd")}" placeholder="0"></td>
          <td class="n c">${x ? E(kr(x.kstk)) : ""}</td>
          <td class="w-s"><input class="n" data-f="l:${si}:${li}:alag" inputmode="decimal" value="${V(l, "alag")}" placeholder="${E(fx(alagS(s), 1))}"></td>
          <td class="w-m"><input class="n${x && x.handv ? " man" : ""}" data-f="l:${si}:${li}:sv" inputmode="decimal" value="${V(l, "sv")}" placeholder="${x ? E(String(Math.round(x.svA))) : ""}" title="Autt = reiknað út frá álagningu"></td>
          <td class="n">${x ? `<b>${E(kr(x.sala))}</b><span class="ikalg ${x.fram >= 0 ? "" : "neg"}">framlegð ${E(kr(x.fram))}</span>` : ""}</td>
          <td class="ikact"><button type="button" class="ikib" data-ik="lx:${E(l.k)}" aria-expanded="${lx}" title="Nánar: nr. birgis, þyngd, mál, aukagjöld, hópur">${lx ? "▴" : "▾"}</button><button type="button" class="ikib" data-ik="dl:${si}:${li}" aria-label="Eyða línu">×</button></td></tr>`;
        const det = lx ? `<tr class="ikdet"><td colspan="8"><div class="ikrow">
          <label class="ikin">Nr. birgis<input data-f="l:${si}:${li}:bnr" value="${E(l.bnr)}"></label>
          <label class="ikin">Kg/stk<input data-f="l:${si}:${li}:kg" inputmode="decimal" value="${V(l, "kg")}" title="Valfrjálst – ræður skiptingu flutnings milli vara"></label>
          <label class="ikin wide">Hópur á tilboði<input data-f="l:${si}:${li}:hopur" list="ikhl" value="${E(l.hopur || "")}" placeholder="${E(s.hopur || "Vörur")}"></label></div>
          ${x ? `<p class="ikhint" style="margin:6px 0 0">Á stk.: kaupverð ${E(kr(x.kaup / x.m))} · flutningur ${E(kr(x.flutn / x.m))} · úrvinnslugjöld ${E(kr(x.urv / x.m))} · miðlun ${E(kr(x.midlun / x.m))}${x.utan ? " · utan Evrópu " + E(kr(x.utan / x.m)) : ""}${x.ov ? " · óvissuálag " + E(kr(x.ov / x.m)) : ""}</p>` : ""}</td></tr>` : "";
        return main + det; }).join("");
      const R5 = reynsla(s.birgir), FAs = CFG().fa;
      const chips = [V2() ? `Flutningur ${E(kr(sm.flutnA))} – ${E(r.flSrc)} · vátrygging ${E(kr(r.vatr))} (${E(r.vatrSrc)})` : `Flutningur ${E(kr(sm.flutn))} – ${E(r.flSrc)}`, `úrvinnslugjöld ${E(kr(sm.urv))}`, `miðlun ${E(kr(sm.midlun))} (${E(r.midlunSrc)})`, sm.ov ? `óvissuálag ${E(kr(sm.ov))} (${E(r.U.ovSrc)})` : "", `álagning ${E(fx(alagS(s), 1))} %`, s.syn === "ein" ? "ein lína á tilboði" : ""].filter(Boolean).join(" · ");
      return `<section class="iks"><div class="ikrow ikshead"><input class="ikbn" data-f="s:${si}:birgir" list="ikbl" value="${E(s.birgir)}" placeholder="Birgir" aria-label="Birgir">
          <select class="ikmy" data-f="s:${si}:mynt" aria-label="Mynt">${["ISK", ...MYNTIR].map(m => `<option${m === s.mynt ? " selected" : ""}>${m}</option>`).join("")}</select>
          ${V2() ? "" : `<label class="ikkg"><input data-f="s:${si}:kg" inputmode="decimal" value="${V(s, "kg")}" placeholder="${kgS(s) && tom(s.kg) ? E(fx(kgS(s), 1)) : "kg"}" aria-label="Heildarþyngd sendingar (kg)"> kg</label>`}
          ${V2() ? "" : `<select class="ikmy" data-f="s:${si}:fa" aria-label="Flutningsaðili">${FAs.map(f => `<option value="${E(f.id)}"${f.id === faDef(s) ? " selected" : ""}>${E(f.nafn)}</option>`).join("")}</select>
          <button type="button" class="ikchip${s.utan ? " on" : ""}" data-ik="utan:${si}" aria-pressed="${!!s.utan}">Utan Evrópu${s.utan ? " +" + E(fx(C.utanP, 1)) + " %" : ""}</button>`}
          <span class="sp"></span><span class="iksf">${sm.sala ? `<b class="${fr >= 0 ? "pos" : "neg"}">${E(kr(fr))}</b> framlegð · ${E(fx(sm.sala ? fr / sm.sala * 100 : 0, 1))} %` : ""}</span>${ink.s.length > 1 ? `<button type="button" class="ikib" data-ik="ds:${si}" title="Fjarlægja sendingu">×</button>` : ""}</div>
        ${V2() ? flV2(s, si, r) : ""}<div class="ikrow ikflm" role="group" aria-label="Flutningur"${V2() ? " hidden" : ""}>${[["inni", "Birgir sér um flutning"], ["upph", "Flutningur í tilboði"], ["kg", "Áætla eftir kg"], ["pct", "% af kaupverði"]].map(([k, l]) => `<button type="button" class="ikchip${r.mt === k ? " on" : ""}" data-ik="flm:${si}:${k}" aria-pressed="${r.mt === k}">${l}</button>`).join("")}
          ${r.mt === "upph" ? `<label class="ikin">Flutningur<input data-f="s:${si}:flutn" inputmode="decimal" value="${V(s, "flutn")}" placeholder="0"></label><label class="ikin">Vátrygging<input data-f="s:${si}:vatr" inputmode="decimal" value="${V(s, "vatr")}" placeholder="0"></label><label class="ikin">Í mynt<select data-f="s:${si}:flutnM"><option value="ISK"${s.flutnM === "ISK" ? " selected" : ""}>ISK</option>${s.mynt !== "ISK" ? `<option value="${E(s.mynt)}"${s.flutnM !== "ISK" ? " selected" : ""}>${E(s.mynt)}</option>` : ""}</select></label>` : ""}
          ${r.mt === "kg" ? `<label class="ikin">kr./kg<input data-f="s:${si}:flutnKg" inputmode="decimal" value="${V(s, "flutnKg")}" placeholder="${r.U.flutnKg != null ? E(fx(r.U.flutnKg, 0)) : "engin reynsla"}" title="Autt = ${E(r.U.flutnKgSrc || "vantar reynslu")}"></label>` : ""}
          ${r.mt === "pct" ? `<label class="ikin">Flutningur %<input data-f="s:${si}:flutnP" inputmode="decimal" value="${V(s, "flutnP")}" placeholder="${E(fx(r.U.flutnP, 1))}" title="Autt = ${E(r.U.flutnPSrc)}"></label>` : ""}</div>
        <div class="ikrow ikcost"><button type="button" class="iklink" data-ik="op:${E(s.id)}" aria-expanded="${op}">${chips} <span aria-hidden="true">${op ? "▴" : "▾"}</span></button></div>
        ${op ? `<div class="ikrow ikopt">
          ${V2() ? "" : `<label class="ikin">Miðlun (kr.)<input data-f="s:${si}:tollsk" inputmode="decimal" value="${V(s, "tollsk")}" placeholder="${E(String(Math.round(sm.midlun)))}" title="Gjöld flutningsaðila/tollmiðlara á sendingu. Autt = ${E(r.midlunSrc)}"></label>`}
          ${!V2() && r.F && (+r.F.uppskM3 || +r.F.uppskT) ? `<label class="ikin">Rúmmál (m³)<input data-f="s:${si}:m3" inputmode="decimal" value="${V(s, "m3")}" placeholder="0"></label>` : ""}
          <label class="ikin">Álagning %<input data-f="s:${si}:alag" inputmode="decimal" value="${V(s, "alag")}" placeholder="${E(fx(alagB(b), 1))}"></label>
          <label class="ikin wide">Hópur á tilboði<input data-f="s:${si}:hopur" list="ikhl" value="${E(s.hopur || "")}" placeholder="Vörur"></label>
          <label class="ikin wide">Á tilboði<select data-f="s:${si}:syn"><option value="linur"${s.syn !== "ein" ? " selected" : ""}>Hver vara sér lína</option><option value="ein"${s.syn === "ein" ? " selected" : ""}>Ein lína (samtala)</option></select></label>
          ${s.syn === "ein" ? `<label class="ikin wide">Heiti línunnar<input data-f="s:${si}:lysing" value="${E(s.lysing || "")}" placeholder="${E("Vörur frá " + (s.birgir || "birgi"))}"></label>` : ""}</div>
          <p class="ikhint" style="margin:0">Tollverð ${E(kr(sm.tollverd))} · úrvinnslugjöld ${E(r.urvSrc)} · VSK við komu ${E(kr(sm.vsk))} (innskattur). ${R5.n ? `Reynsla af ${E(s.birgir)}: ${R5.n} ${R5.n === 1 ? "sending" : "sendingar"}${R5.flutnKg != null ? ", flutningur " + E(fx(R5.flutnKg, 0)) + " kr./kg" : ""}${R5.flutnP != null ? ", " + E(fx(R5.flutnP, 1)) + " % af kaupverði" : ""}${R5.inni ? `, ${R5.inni} með flutningi inniföldum` : ""}.` : s.birgir ? "Engin tollskýrsla skráð enn frá þessum birgi." : ""}</p>` : ""}
        <div class="iktw"><table><thead><tr><th>Vara</th><th class="n">Magn</th><th class="n">Verð/stk ${E(s.mynt)}</th><th class="n">Kostn./stk</th><th class="n">Álagn. %</th><th class="n">Söluverð/stk</th><th class="n">Samtals</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="ikrow"><button type="button" class="iklink" data-ik="al:${si}">+ Lína</button><button type="button" class="iklink" data-ik="paste:${si}">Líma úr Excel</button>${s.mynt !== "ISK" && !r.g ? `<span class="ikman">Vantar tollgengi ${E(s.mynt)}</span>` : ""}<span class="sp"></span><span class="ikhint">Kostnaður ${E(kr(sm.kostn))} · sala ${E(kr(sm.sala))}</span></div></section>`; }).join("");
    const T = R.T;
    const hopar = [...new Set(ink.s.flatMap(s => [s.hopur, ...s.linur.map(l => l.hopur)]).concat(VR().map(v => v.flokkur)).filter(Boolean))];
    el.querySelector(".ikc").innerHTML = gengiH + sH + `<div class="ikrow"><button type="button" class="iklink" data-ik="as">+ Sending frá öðrum birgi</button><span class="sp"></span><span class="ikhint">VSK við komu ${E(kr(T.vsk))} (útlagt – fæst til baka sem innskattur)</span></div>
      <datalist id="ikvl">${VR().filter(v => !["pakki", "vinna"].includes(v.tegund)).slice(0, 400).map(v => `<option value="${E(v.heiti)}">${E([v.nr, v.fnr].filter(Boolean).join(" · "))}</option>`).join("")}</datalist>
      <datalist id="ikbl">${CFG().birgjar.map(b => `<option value="${E(b.nafn)}">${E([b.mynt, b.utan ? "utan Evrópu" : ""].filter(Boolean).join(" · "))}</option>`).join("")}</datalist>
      <datalist id="ikhl">${hopar.map(h => `<option value="${E(h)}"></option>`).join("")}</datalist>`;
    const lin = R.send.reduce((a, r) => a + r.lines.length, 0);
    el.querySelector(".ikf").innerHTML = `<div class="iktot"><span>Kostnaður <b>${E(kr(T.kostn))}</b></span><span>Söluverð <b>${E(kr(T.sala))}</b></span><span>Framlegð <b class="${T.fram >= 0 ? "pos" : "neg"}">${E(kr(T.fram))} · ${E(fx(T.framP, 1))} %</b></span></div><span class="sp"></span><button type="button" class="btn" data-ik="x">Hætta við</button>${ed() ? `<button type="button" class="btn primary" data-ik="save"${lin ? "" : " disabled"}>Setja í tilboð</button>` : ""}`;
    if (fk) { const n = el.querySelector(`[data-f="${CSS.escape(fk)}"]`); if (n) { n.focus(); try { if (fp != null && n.setSelectionRange && n.type !== "number") n.setSelectionRange(fp, fp); } catch (e) {} } }
  }
  let tmo = null;
  function inn(e) {
    if (!W) return; const f = e.target.dataset?.f; if (!f) return; const p = f.split(":"), val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    const ink = W.ink;
    if (p[0] === "g") { ink.gengi = ink.gengi || { k: {} }; ink.gengi.k = ink.gengi.k || {}; ink.gengi.k[p[1]] = num(val); ink.gengi.src = "slegið inn"; }
    else if (p[0] === "s") { const s = ink.s[+p[1]]; if (!s) return;
      if (p[2] === "vatrSel") { if (val === "upph") s.vatrH = "upph"; else { s.vatrH = "pct"; s.vatrP = num(val); } }
      else if (["flutn", "vatr", "tollsk", "alag", "flutnP", "flutnKg", "kg", "m3"].includes(p[2])) s[p[2]] = val === "" ? "" : num(val); else s[p[2]] = val;
      if (p[2] === "flutnNr") return;
      if (["birgir", "flutnP", "flutnKg", "flutnH", "fa", "kg"].includes(p[2])) delete s.fz;
      if (["hopur", "lysing"].includes(p[2])) return;   // texti – ekki teikna aftur
      if (p[2] === "birgir" && e.type === "change") { const b = birgir(val); if (b) { s.mynt = b.mynt || s.mynt; s.utan = !!b.utan; if (b.fa && !s.fa) s.fa = b.fa; if (b.inni && !s.flutnH) s.flutnH = "inni"; } }
      if (p[2] === "mynt" && s.flutnM !== "ISK" && !V2()) s.flutnM = val; }
    else if (p[0] === "l") { const l = ink.s[+p[1]]?.linur[+p[2]]; if (!l) return; const k = p[3];
      if (k === "hopur") { l.hopur = val; return; }
      if (k === "heiti" || k === "bnr") { l[k] = val; if (k === "heiti" && e.type === "change") { const v = VR().find(x => x.heiti === val); l.v = v ? v.id : null; if (v) { if (!l.bnr && v.fnr) l.bnr = v.fnr; if (!l.kg && v.kg) l.kg = v.kg; } } }
      else l[k] = val === "" ? "" : num(val); }
    // teikna aftur (tölur) – ekki meðan skrifað er í textareit sem endurteiknast ekki
    clearTimeout(tmo); tmo = setTimeout(() => draw(true), e.type === "change" ? 0 : 250);
  }
  async function klikk(e) {
    if (!W) return; const b = e.target.closest("[data-ik]"); if (!b) return; const [k, a, c] = b.dataset.ik.split(":"), ink = W.ink;
    if (k === "x") return loka();
    if (k === "gengi") { b.disabled = true; b.textContent = "Sæki…"; const g = await gengiNu(true); if (g) { ink.gengi = { k: { ...g.k }, dags: isoD(g.dags) || "", src: g.src || "" }; toast?.("Tollgengi sótt" + (g.dags ? " (gildir frá " + dIS(g.dags) + ")" : "")); } else toast?.("Náði ekki í tollgengið – sláðu það inn (Skatturinn › Tollafgreiðslugengi)"); return draw(); }
    if (k === "tg") { W.ui.gengi = !W.ui.gengi; return draw(); }
    if (k === "op") { W.ui.opin[a] = !W.ui.opin[a]; return draw(); }
    if (k === "lx") { W.ui.lx[a] = !W.ui.lx[a]; return draw(); }
    if (k === "utan") { ink.s[+a].utan = !ink.s[+a].utan; return draw(); }
    if (k === "flm") { ink.s[+a].flutnH = c; delete ink.s[+a].fz; return draw(); }
    if (k === "flu") { const S0 = ink.s[+a]; S0.flutnH = "upph"; S0.flutnUr = c; if (!S0.flutnM) S0.flutnM = S0.mynt; delete S0.fz; return draw(); }
    if (k === "al") { ink.s[+a].linur.push(nyLina()); return draw(); }
    if (k === "dl") { ink.s[+a].linur.splice(+c, 1); if (!ink.s[+a].linur.length) ink.s[+a].linur.push(nyLina()); return draw(); }
    if (k === "as") { ink.s.push(nySending()); return draw(); }
    if (k === "ds") { ink.s.splice(+a, 1); return draw(); }
    if (k === "paste") return limaExcel(+a);
    if (k === "save") return vista();
  }
  // Líma úr Excel: hver lína = vara/nr. (texti), magn, verð [, kg]. Tölur í íslensku eða ensku sniði.
  function limaExcel(si) {
    const box = document.createElement("div"); box.className = "iks"; box.innerHTML = `<b style="font-weight:500">Líma úr Excel eða verðtilboði</b><p class="ikhint" style="margin:0">Afritaðu línurnar úr Excel (eða CSV) og límdu hér. Dálkar: vara eða vörunúmer · magn · verð á stk. · (kg). Ef aðeins ein tala er í línu er hún verðið og magnið 1.</p><textarea placeholder="Loftahátalari 6,5&quot;	12	89,50	1,8"></textarea><div class="ikrow"><button type="button" class="btn primary">Bæta við línum</button><button type="button" class="btn">Hætta við</button></div>`;
    const sec = W.el.querySelectorAll(".ikc > .iks")[si + 1]; (sec || W.el.querySelector(".ikc")).after(box); box.querySelector("textarea").focus();
    const [ok, no] = box.querySelectorAll("button");
    no.onclick = () => box.remove();
    ok.onclick = () => { const s = W.ink.s[si]; let n = 0;
      box.querySelector("textarea").value.split(/\r?\n/).map(r => r.trim()).filter(Boolean).forEach(r => {
        const c = r.split(/\t|;|\s{2,}/).map(x => x.trim()).filter(Boolean); if (!c.length) return;
        const isN = x => /^-?[\d.,\s]+$/.test(x) && /\d/.test(x), txt = c.filter(x => !isN(x)), nums = c.filter(isN).map(num);
        if (!nums.length) return; const nm = txt.join(" ");
        const hit = VR().find(v => [v.nr, v.fnr, v.heiti, ...String(v.strikamerki || "").split(/[\s,;]+/)].filter(Boolean).some(z => String(z).toLowerCase() === nm.toLowerCase() || txt.some(t => String(z).toLowerCase() === t.toLowerCase())));
        const L = nyLina({ heiti: hit ? hit.heiti : nm, v: hit ? hit.id : null, bnr: hit?.fnr || (txt.length > 1 ? txt[0] : ""), magn: nums.length > 1 ? nums[0] : 1, verd: nums.length > 1 ? nums[1] : nums[0], kg: nums.length > 2 ? nums[2] : (hit?.kg || "") });
        s.linur = s.linur.filter(x => x.heiti || x.verd); s.linur.push(L); n++; });
      box.remove(); toast?.(n + (n === 1 ? " lína bætt við" : " línum bætt við")); draw(); };
  }
  async function vista() {
    const { id, ink } = W, R = reikna(ink), T = DOC(id); if (!T) return;
    ink.dags = new Date().toISOString();
    ink.s.forEach(s => { s.linur = s.linur.filter(l => l.heiti || +l.verd); s.fz = upplausn(s); if (!s.fa) s.fa = faDef(s); if (!s.flutnH) s.flutnH = flM(s); });
    // Sundurliðun á tilboðinu: hver vara sér lína (hópur = hópur línu › hópur sendingar › vöruflokkur › „Vörur“), eða ein lína fyrir sendinguna
    const nyjar = []; R.send.forEach(r => { const s = r.s;
      if (s.syn === "ein") { if (!r.lines.length) return; nyjar.push({ id: uid(), v: null, heiti: (s.lysing || "").trim() || "Vörur frá " + (s.birgir || "birgi"), teg: "sala", hl: (s.hopur || "").trim() || "Vörur", magn: 1, ein: "stk.", verd: Math.round(r.sum.sala), dagar: null, afsl: 0, ik: { k: "S" + s.id, s: s.id, kostn: Math.round(r.sum.kostn) } }); return; }
      r.lines.forEach(x => { const v = x.l.v ? findV(x.l.v) : null;
        nyjar.push({ id: uid(), v: v ? v.id : null, heiti: x.l.heiti || "Vara frá " + (s.birgir || "birgi"), teg: "sala", hl: (x.l.hopur || "").trim() || (s.hopur || "").trim() || v?.flokkur || "Vörur", magn: x.m, ein: v?.eining || "stk.", verd: Math.round(x.sv), dagar: null, afsl: 0, ik: { k: x.l.k, s: s.id, kostn: Math.round(x.kstk) } }); }); });
    // nýir birgjar fara í birgjalistann (nafn, mynt, utan Evrópu)
    const nyirB = ink.s.filter(s => s.birgir && !birgir(s.birgir)).map(s => ({ id: uid(), nafn: s.birgir.trim(), mynt: s.mynt, utan: !!s.utan, alag: "" }));
    try {
      await saveDoc(id, q => { const old = (q.linur || []).filter(l => !l.ik || !l.ik.k), pos = (q.linur || []).findIndex(l => l.ik && l.ik.k);
        // reiknilínur koma í stað eldri reiknilína (á sama stað), aðrar línur haldast óbreyttar
        q.linur = pos < 0 ? old.concat(nyjar) : old.slice(0, pos).concat(nyjar, old.slice(pos));
        const prev = q.ink || {}; q.ink = { ...JSON.parse(JSON.stringify(ink)) };
        (q.ink.s || []).forEach(s => { const p = (prev.s || []).find(x => x.id === s.id); if (p) { ["stada", "pantad", "komid", "ts"].forEach(f => { if (p[f] !== undefined && s[f] === undefined) s[f] = p[f]; }); } }); });
      if (nyirB.length) await saveCfg(c => { c.birgjar = (c.birgjar || []).concat(nyirB.filter(b => !(c.birgjar || []).some(x => x.nafn.toLowerCase() === b.nafn.toLowerCase()))); }).catch(() => {});
      loka(); toast?.(nyjar.length + (nyjar.length === 1 ? " lína sett" : " línur settar") + " í " + (T.nr || "tilboðið") + " · framlegð " + kr(R.T.fram)); render();
    } catch (err) { toast?.("Vistaðist ekki: " + (err?.message || err)); }
  }
  window.innflReiknir = opna;

  /* ---------- Kostnaður og framlegð á tilboði/pöntun ---------- */
  // Allar sölulínur: kostnaður úr reikni (l.ik.kostn) eða innkaupsverði vörunnar (lagervara)
  function framlegd(T) {
    let sala = 0, kostn = 0, vant = 0; const ad = 1 - (+T.afsl || 0) / 100;
    (T.linur || []).filter(l => l.teg === "sala" && !l.aukagjald).forEach(l => { const m = +l.magn || 0, s = (+l.verd || 0) * m * (1 - (+l.afsl || 0) / 100) * ad;
      const k = l.ik && l.ik.kostn != null ? +l.ik.kostn : +(findV(l.v)?.innkaupsverd) || 0; sala += s; if (k) kostn += k * m; else vant++; });
    return { sala, kostn, fram: sala - kostn, P: sala ? (sala - kostn) / sala * 100 : 0, vant };
  }
  // Raunkostnaður sendingar úr tollskýrslu (ef skráð): tollverð + gjöld + gjald utan Evrópu + tollskýrslugerð + innlendur kostnaður
  function samanburdur(T) {
    if (!T.ink || !T.ink.s) return null; const R = reikna(T.ink); let aetl = 0, raun = 0, n = 0;
    R.send.forEach(r => { const x = raunS(r.s); if (x != null) { aetl += r.sum.kostn; raun += x; n++; } });
    return n ? { aetl, raun, frav: raun - aetl, n, R } : { R, n: 0 };
  }
  const STA = { "": ["Ekki pantað", "wa"], pantad: ["Pantað", "go"], komid: ["Komið", "ok"] };
  function cardHTML(T) {
    const F = framlegd(T), isP = !!T.pontun, C = samanburdur(T), R = T.ink ? reikna(T.ink) : null;
    const k = [`<div><span>Söluverð (vörur)</span><b>${E(kr(F.sala))}</b></div>`, `<div><span>Kostnaðarverð</span><b>${E(kr(F.kostn))}</b></div>`, `<div><span>Framlegð</span><b class="${F.fram >= 0 ? "pos" : "neg"}">${E(kr(F.fram))} · ${E(fx(F.P, 1))} %</b></div>`];
    if (C && C.n) k.push(`<div><span>Raunkostnaður (tollskýrsla)</span><b>${E(kr(C.raun))}</b></div>`, `<div><span>Frávik frá áætlun</span><b class="${C.frav > 0 ? "neg" : "pos"}">${C.frav > 0 ? "+" : ""}${E(kr(C.frav))}</b></div>`);
    const send = R ? R.send.map((r, i) => { const s = r.s, [stl, stc] = s.ts ? ["Tollskýrsla skráð", "ok"] : STA[s.stada || ""] || STA[""], x = raunS(s);
      return `<div class="ikbr"><div><b style="font-weight:500">${E(s.birgir || "Birgir " + (i + 1))}</b>${isP ? `<span class="ikst ${stc}">${E(stl)}</span>` : ""}<small>${r.lines.length} ${r.lines.length === 1 ? "lína" : "línur"} · ${E(s.mynt)}${s.mynt !== "ISK" && r.g ? " á " + E(fx(r.g, 2)) : ""}${s.utan ? " · utan Evrópu" : ""} · áætlaður kostnaður ${E(kr(r.sum.kostn))}${x != null ? " · raun " + E(kr(x)) + ` (<span class="${x - r.sum.kostn > 0 ? "neg" : "pos"}">${x - r.sum.kostn > 0 ? "+" : ""}${E(kr(x - r.sum.kostn))}</span>)` : ""}${s.pantad ? " · pantað " + E(String(s.pantad).slice(0, 10).split("-").reverse().join(".")) : ""}</small></div>
        ${isP && ed() ? `<div class="ikbb">${!s.stada ? `<button type="button" class="btn sm" data-ikp="pant:${E(T.id)}:${E(s.id)}">Panta hjá birgi</button>` : ""}${s.stada === "pantad" ? `<button type="button" class="btn sm" data-ikp="komid:${E(T.id)}:${E(s.id)}">Komið</button>` : ""}<button type="button" class="btn sm${s.stada === "komid" && !s.ts ? " primary" : ""}" data-ikp="ts:${E(T.id)}:${E(s.id)}">${s.ts ? "Tollskýrsla" : "Skrá tollskýrslu"}</button></div>` : ""}</div>`; }).join("") : "";
    return `<section class="ikcard"><div class="ikct"><div><b>Kostnaður og framlegð</b><small>Aðeins starfsfólk sér þetta${F.vant ? ` · ${F.vant} ${F.vant === 1 ? "lína" : "línur"} án kostnaðarverðs` : ""}</small></div>${ed() ? `<button type="button" class="btn${T.ink ? "" : " primary"}" data-ikp="reiknir:${E(T.id)}">${T.ink ? "Opna reikni" : "Reikna úr verðum birgja"}</button>` : ""}</div>
      <div class="ikk">${k.join("")}</div>${send ? `<div class="ikbs">${send}</div>` : ""}</section>`;
  }

  /* ---------- Innkaup: panta, komið, tollskýrsla ---------- */
  function pantaTexti(T, s) {
    const R = reikna(T.ink), r = R.send.find(x => x.s.id === s.id); if (!r) return "";
    return `Pöntun – ${window.ORG?.nafn || ""}\nTilvísun: ${T.nr || ""}\n\n` + r.lines.map(x => `${x.m} × ${x.l.bnr ? x.l.bnr + " – " : ""}${x.l.heiti} @ ${fx(x.l.verd, 2)} ${s.mynt}`).join("\n") + `\n\nSamtals: ${fx(r.lines.reduce((a, x) => a + (+x.l.verd || 0) * x.m, 0), 2)} ${s.mynt}\n`;
  }
  function modal(title, html) {
    const w = document.createElement("div"); w.className = "qrcard pfm wide"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", title);
    w.innerHTML = `<div class="qrscrim" data-x="1"></div><div class="qrsheet pfs"><div class="grab" aria-hidden="true"></div><div class="pfh"><h2>${E(title)}</h2><button type="button" class="qrx" data-x="1" aria-label="Loka">✕</button></div>${html}</div>`;
    document.body.append(w); document.body.classList.add("qropen");
    const close = () => { w.remove(); document.body.classList.remove("qropen"); };
    w.addEventListener("click", e => { if (e.target.closest("[data-x]")) close(); }); w.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    return { w, close };
  }
  /* ---------- Lestur tollskýrslu (2.113.0): SAD (aðflutningsskýrsla) og CUSTAR (skuldfærslutilkynning) sem PDF ----------
     Textinn er lesinn með pdf.js (þegar í appinu). Reitir SAD eru tölusettir eins og á eyðublaði E1 (22 mynt og fjárhæð, 23 gengi,
     35 brúttóþyngd, 38 nettóþyngd, 46 hagskýrsluverð = tollverð, 20 afhendingarskilmálar, 33 vörunúmer = tollskrárnúmer).
     CUSTAR: gjöld eftir tegund – A* tollur, Ö* VSK, annað (BU, BY …) úrvinnslugjöld o.fl. */
  async function pdfTexti(file) {
    const lib = await (typeof loadPdfjs === "function" ? loadPdfjs() : Promise.reject(new Error("PDF-lesari ekki til")));
    const d = await lib.getDocument({ data: await file.arrayBuffer() }).promise, T = [];
    for (let i = 1; i <= d.numPages; i++) { const c = await (await d.getPage(i)).getTextContent(); c.items.forEach(x => { const t = String(x.str || "").trim(); if (t) T.push(t); }); }
    return T;
  }
  const nIS = t => { const v = parseFloat(String(t).replace(/\./g, "").replace(",", ".")); return isFinite(v) ? v : null; };
  const isN = t => /^-?[\d.]+(,\d+)?$/.test(String(t));
  function lesaTollskjal(T) {
    const o = {}, eftir = (lab, n = 1) => { const i = T.findIndex(x => x.startsWith(lab)); return i >= 0 ? T[i + n] : null; }, allEftir = lab => T.map((x, i) => x.startsWith(lab) ? T[i + 1] : null).filter(Boolean);
    if (T.some(x => /CUSTAR|Skuldfærslutilkynning/.test(x))) {
      o.teg = "custar"; o.nr = eftir("Tollskjalanúmer"); o.dags = isoD(eftir("Tollafgreiðsludagsetning") || ""); o.midlari = eftir("Tollmiðlari");
      let tollur = 0, vsk = 0, urv = 0, nl = new Set();
      T.forEach((x, i) => { if (/^\d{8}$/.test(x) && /^[A-ZÁÐÉÍÓÚÝÞÆÖ]{1,2}\d?$/.test(T[i + 1] || "") && isN(T[i + 2] || "")) { const tg = T[i + 1], v = nIS(T[i + 2]) || 0; nl.add(x);
        if (/^A/.test(tg)) tollur += v; else if (/^Ö/.test(tg)) vsk += v; else urv += v; } });
      Object.assign(o, { tollur, vsk, urv, tl: nl.size });
    } else if (T.some(x => /Hagskýrsluverð/.test(x))) {
      o.teg = "sad";
      const i = T.findIndex((x, k) => /^[A-Z]{3}$/.test(x) && isN(T[k + 1] || "") && isN(T[k + 2] || "") && !/^(KEF|CPT|DAP|DDP|EXW|FOB|CIF|FCA|CIP|DAT|DPU|CFR)$/.test(x));
      if (i >= 0) { o.mynt = T[i]; o.upph = nIS(T[i + 1]); o.gengi = nIS(T[i + 2]); }
      o.tollverd = allEftir("46 Hagskýrsluverð").map(nIS).filter(v => v != null).reduce((a, v) => a + v, 0) || null;
      o.kg = allEftir("35 Þyngd brúttó").map(nIS).filter(v => v != null).reduce((a, v) => a + v, 0) || null;
      o.kgNet = allEftir("38 Þyngd nettó").map(nIS).filter(v => v != null).reduce((a, v) => a + v, 0) || null;
      o.afh = eftir("20 Afhendingarskilmálar"); o.tl = new Set(allEftir("33 Vörunúmer").filter(x => /^\d{8}$/.test(x))).size || null;
      o.sendandi = eftir("2 Sendandi"); const dg = T.find(x => /\d{2}\.\d{2}\.\d{4}$/.test(x) && /^\D+ \d/.test(x)); if (dg) o.dags = isoD(dg.match(/(\d{2}\.\d{2}\.\d{4})/)[1]);
      o.tilv = eftir("7 Tilvísunarnúmer", 3);
    }
    return o;
  }
  // Raunkostnaður sendingar úr tollskýrslu: tollverð + tollur + úrvinnslugjöld + gjald utan Evrópu + miðlun + akstur innanlands (VSK ekki)
  const raunS = s => { const t = s.ts; if (!t) return null; return (+t.tollverd || 0) + (+t.tollur || 0) + (!tom(t.urv) ? +t.urv : +t.gjold || 0) + (+t.utan || 0) + (+t.midlun || 0) + (+t.innlent || 0); };
  function tollskyrsla(T, s) {
    const R = reikna(T.ink), r = R.send.find(x => x.s.id === s.id), t = s.ts || {}, est = r ? r.sum : {};
    const pre = { nr: t.nr || "", dags: t.dags || new Date().toISOString().slice(0, 10), gengi: t.gengi ?? "", tollverd: t.tollverd ?? "", tollur: t.tollur ?? "", urv: t.urv ?? t.gjold ?? "", vsk: t.vsk ?? "", kg: t.kg ?? "", flutn: t.flutn ?? "", utan: t.utan ?? "", midlun: t.midlun ?? "", innlent: t.innlent ?? "" };
    const ph = { gengi: r?.g ? fx(r.g, 3) : "", tollverd: String(Math.round(est.tollverd || 0)), tollur: "0", urv: String(Math.round(est.urv || 0)), vsk: String(Math.round(est.vsk || 0)), kg: r?.kg ? fx(r.kg, 1) : "", flutn: "", utan: String(Math.round(est.utan || 0)), midlun: String(Math.round(est.midlun || 0)), innlent: "0" };
    const f = (k, l) => `<label>${l}<input id="ikts-${k}" ${k === "dags" ? 'type="date"' : `inputmode="${k === "nr" ? "text" : "decimal"}"`} value="${E(pre[k] === "" || pre[k] == null ? "" : String(pre[k]).replace(".", ","))}" placeholder="${E(ph[k] || "")}"></label>`;
    const { w, close } = modal("Tollskýrsla · " + (s.birgir || ""), `<label class="iktsdrop" id="ikts-drop"><input type="file" accept="application/pdf" multiple hidden id="ikts-file"><b>Lesa úr PDF</b><span>Dragðu tollskýrsluna (SAD) og skuldfærslutilkynninguna (CUSTAR) hingað, eða smelltu til að velja. Reitirnir fyllast sjálfkrafa.</span></label><div class="pfhint" id="ikts-lest"></div>
      <div class="ikg3">${f("nr", "Tollskjalanúmer")}${f("dags", "Tollafgreiðsludagur")}${f("gengi", "Tollgengi " + E(s.mynt))}</div>
      <div class="ikg3">${f("tollverd", "Tollverð / hagskýrsluverð (kr.)")}${f("tollur", "Tollur (kr.)")}${f("urv", "Önnur gjöld – úrvinnslugjöld (kr.)")}</div>
      <div class="ikg3">${f("vsk", "VSK (kr.) – innskattur")}${f("kg", "Brúttóþyngd (kg)")}${f("flutn", "Flutningur og vátrygging (kr.)")}</div>
      <div class="ikg3">${f("midlun", "Reikningur miðlara/flutningsaðila (kr. án VSK)")}${f("utan", "Gjald utan Evrópu (kr.)")}${f("innlent", "Akstur innanlands o.fl. (kr.)")}</div>
      <div class="pfhint" id="ikts-sum"></div>
      <div class="pfact"><button type="button" class="btn" data-x="1">Hætta við</button><button type="button" class="btn primary" id="ikts-ok">Vista tollskýrslu</button></div>`);
    const el = k => w.querySelector("#ikts-" + k);
    const val = k => { const e = el(k); if (!e) return ""; if (k === "nr" || k === "dags") return e.value.trim(); return e.value.trim() === "" ? (["tollur", "utan", "innlent", "flutn"].includes(k) ? 0 : num(e.placeholder)) : num(e.value); };
    const kaupM = kaupMyntS(s), inni = flM(s) === "inni";
    const upd = () => { const kISK = kaupM * (s.mynt === "ISK" ? 1 : val("gengi")), flCalc = Math.max(0, Math.round(val("tollverd") - kISK));
      el("flutn").placeholder = inni ? "innifalinn" : String(flCalc);
      const raun = val("tollverd") + val("tollur") + val("urv") + val("utan") + val("midlun") + val("innlent"), d = raun - (est.kostn || 0), kg = val("kg"), fl = el("flutn").value.trim() ? val("flutn") : flCalc;
      el("sum").innerHTML = `Raunkostnaður <b>${E(kr(raun))}</b> · áætlað ${E(kr(est.kostn || 0))} · frávik <b style="color:${d > 0 ? "#b4462f" : "#1d7a4f"}">${d > 0 ? "+" : ""}${E(kr(d))}</b>`
        + (!inni && kISK ? `<br>Flutningur ${E(kr(fl))} = ${E(fx(fl / kISK * 100, 1))} % af kaupverði${kg ? " · " + E(fx(fl / kg, 0)) + " kr./kg" : ""}` : "") + (kg ? ` · úrvinnslugjöld ${E(fx(val("urv") / kg, 1))} kr./kg` : "") + ` – fer í reynslu birgis og flutningsaðila.`; };
    w.addEventListener("input", upd); upd();
    // PDF: lesa og fylla út
    const lesa = async files => { const L = el("lest"); L.textContent = "Les…"; const fundid = [];
      for (const fl of files) { try { const o = lesaTollskjal(await pdfTexti(fl));
          if (!o.teg) { fundid.push(fl.name + ": þekkti ekki sniðið"); continue; }
          const set = (k, v, d) => { if (v == null || v === "" || (typeof v === "number" && !isFinite(v))) return; el(k).value = typeof v === "number" ? String(Math.round(v * 10 ** (d || 0)) / 10 ** (d || 0)).replace(".", ",") : v; };
          if (o.teg === "sad") { set("gengi", o.gengi, 4); set("tollverd", o.tollverd); set("kg", o.kg, 2); if (o.dags && !el("dags").value) set("dags", o.dags);
            fundid.push(`SAD: ${o.mynt || ""} ${o.upph != null ? fx(o.upph, 2) : ""} á ${o.gengi != null ? fx(o.gengi, 3) : "?"} · tollverð ${o.tollverd != null ? kr(o.tollverd) : "?"} · ${o.kg != null ? fx(o.kg, 2) + " kg" : ""}${o.afh ? " · " + o.afh : ""}${o.mynt && o.mynt !== s.mynt ? ` – athugaðu: mynt á skýrslu (${o.mynt}) er ekki sú sama og á sendingu (${s.mynt})` : ""}`); }
          if (o.teg === "custar") { set("nr", o.nr); if (o.dags) set("dags", o.dags); set("tollur", o.tollur); set("urv", o.urv); set("vsk", o.vsk);
            fundid.push(`CUSTAR ${o.nr || ""}: tollur ${kr(o.tollur)} · önnur gjöld ${kr(o.urv)} · VSK ${kr(o.vsk)}${o.midlari ? " · miðlari " + o.midlari : ""}`); }
        } catch (x) { fundid.push(fl.name + ": " + (x.message || x)); } }
      L.innerHTML = fundid.map(x => E(x)).join("<br>") + (fundid.length ? "<br>Reikningur miðlarans (tollafgreiðslugjald) kemur sér – skráðu hann þegar hann berst." : ""); upd(); };
    el("file").addEventListener("change", e => { if (e.target.files.length) lesa([...e.target.files]); });
    const dz = el("drop"); ["dragover", "dragenter"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add("on"); })); ["dragleave", "drop"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove("on"); }));
    dz.addEventListener("drop", e => { const fs = [...(e.dataTransfer?.files || [])].filter(x => /pdf$/i.test(x.type) || /\.pdf$/i.test(x.name)); if (fs.length) lesa(fs); });
    el("ok").onclick = async () => { const ts = { nr: val("nr"), dags: val("dags"), gengi: val("gengi"), tollverd: val("tollverd"), tollur: val("tollur"), urv: val("urv"), vsk: val("vsk"), kg: val("kg"), flutn: el("flutn").value.trim() ? val("flutn") : "", utan: val("utan"), midlun: val("midlun"), innlent: val("innlent"), af: tr(() => ME(), ""), skrad: new Date().toISOString() };
      await saveDoc(T.id, q => { const x = (q.ink?.s || []).find(y => y.id === s.id); if (x) { x.ts = ts; x.stada = "komid"; x.komid = x.komid || ts.dags; } }).catch(e => toast?.("Vistaðist ekki: " + (e?.message || e)));
      close(); toast?.("Tollskýrsla skráð"); render(); };
  }
  window.innflLesaTollskjal = async f => lesaTollskjal(await pdfTexti(f));   // prófanir
  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-ikp]"); if (!b) return; e.preventDefault();
    const [k, id, sid] = b.dataset.ikp.split(":"), T = DOC(id); if (!T) return;
    if (k === "reiknir") return opna(id);
    if (k === "ikyf") return yfirlitModal();
    const s = (T.ink?.s || []).find(x => x.id === sid); if (!s) return;
    if (k === "ts") return tollskyrsla(T, s);
    if (k === "komid") { await saveDoc(id, q => { const x = q.ink.s.find(y => y.id === sid); if (x) { x.stada = "komid"; x.komid = new Date().toISOString().slice(0, 10); } }); toast?.("Merkt komið – skráðu tollskýrsluna þegar hún berst"); return render(); }
    if (k === "pant") {
      const txt = pantaTexti(T, s), { w, close } = modal("Panta hjá " + (s.birgir || "birgi"), `<p class="pfhint">Pöntunartexti til birgisins. Afritaðu hann í póst (eða sendu úr Pósti) og merktu pantað.</p><textarea id="ikpt" style="width:100%;min-height:200px;font:inherit;font-size:13px;border:1px solid var(--line);border-radius:10px;padding:10px;box-sizing:border-box">${E(txt)}</textarea>
        <div class="pfact"><button type="button" class="btn" id="ikpc">Afrita texta</button><button type="button" class="btn" data-x="1">Hætta við</button><button type="button" class="btn primary" id="ikpo">Merkja pantað</button></div>`);
      w.querySelector("#ikpc").onclick = async () => { try { await navigator.clipboard.writeText(w.querySelector("#ikpt").value); toast?.("Afritað"); } catch (x) { w.querySelector("#ikpt").select(); } };
      w.querySelector("#ikpo").onclick = async () => { await saveDoc(id, q => { const x = q.ink.s.find(y => y.id === sid); if (x) { x.stada = "pantad"; x.pantad = new Date().toISOString(); } }); close(); toast?.("Merkt pantað hjá " + (s.birgir || "birgi")); render(); };
    }
  }, true);

  /* ---------- Yfirlit innkaupa (Pantanir › Yfirlit) ---------- */
  function allSend() {
    const out = []; tr(() => A().PN(), []).forEach(P => { if (!P.ink || !P.ink.s || ["Hætt við", "Hafnað"].includes(P.stada)) return; const R = reikna(P.ink);
      R.send.forEach(r => out.push({ P, s: r.s, aetl: r.sum.kostn, raun: raunS(r.s) })); });
    return out;
  }
  function stripHTML() {
    const L = allSend(); if (!L.length) return "";
    const ekki = L.filter(x => !x.s.stada).length, leid = L.filter(x => x.s.stada === "pantad").length, vant = L.filter(x => x.s.stada === "komid" && !x.s.ts).length, m = L.filter(x => x.raun != null), frav = m.reduce((a, x) => a + x.raun - x.aetl, 0);
    return `<div class="ikstrip" data-ikp="ikyf:${E(L[0].P.id)}" role="button" tabindex="0"><b>Innkaup frá birgjum</b><span>${ekki} ekki pantað</span><span>${leid} á leiðinni</span><span>${vant} vantar tollskýrslu</span>${m.length ? `<span>Frávik frá áætlun: <b class="${frav > 0 ? "neg" : "pos"}">${frav > 0 ? "+" : ""}${E(kr(frav))}</b> (${m.length} ${m.length === 1 ? "sending" : "sendingar"})</span>` : ""}<span style="margin-left:auto">Opna →</span></div>`;
  }
  function yfirlitModal() {
    const L = allSend().sort((a, b) => (a.s.stada === "komid" && a.s.ts ? 1 : 0) - (b.s.stada === "komid" && b.s.ts ? 1 : 0) || String(a.P.fra || "").localeCompare(String(b.P.fra || "")));
    const { w, close } = modal("Innkaup frá birgjum", `<div class="ikcard" style="margin:0">${L.map(x => { const [stl, stc] = x.s.ts ? ["Tollskýrsla skráð", "ok"] : STA[x.s.stada || ""] || STA[""], d = x.raun != null ? x.raun - x.aetl : null;
      return `<div class="ikbr"><div><b style="font-weight:500">${E(x.s.birgir || "Birgir")}</b><span class="ikst ${stc}">${E(stl)}</span><small>${E((x.P.nr || "") + " · " + (x.P.heiti || x.P.vidskiptavinur || ""))} · áætlað ${E(kr(x.aetl))}${d != null ? ` · raun ${E(kr(x.raun))} (<span class="${d > 0 ? "neg" : "pos"}">${d > 0 ? "+" : ""}${E(kr(d))}</span>)` : ""}</small></div><div class="ikbb"><button type="button" class="btn sm" data-open-pn="${E(x.P.id)}">Opna pöntun</button></div></div>`; }).join("") || `<p class="pfhint">Engin innkaup skráð.</p>`}</div>`);
    w.addEventListener("click", e => { const b = e.target.closest("[data-open-pn]"); if (!b) return; close(); try { tab = "pantanir"; DETAIL = null; } catch (x) {} render(); openDetail("tb:" + b.dataset.openPn); });
  }

  /* ---------- Tengt inn eftir hverja teikningu ---------- */
  function decorate() {
    if (!on() || vett()) return; let D = null; try { D = DETAIL; } catch (e) {}
    const root = document.getElementById("view"); if (!root) return;
    if (D && String(D).startsWith("tb:")) {
      const T = DOC(String(D).slice(3)), host = root.querySelector(".spdet") || root;
      if (T && !host.querySelector(".ikcard") && (T.ink || (T.linur || []).some(l => l.teg === "sala") || tr(() => ON("sala"), false))) {
        const anchor = host.querySelector(".qrbox") || host.querySelector(".utb") || [...host.querySelectorAll(".viewtitle,.tbsh")].find(x => /^Línur/.test(x.textContent.trim()));
        anchor ? anchor.insertAdjacentHTML("beforebegin", cardHTML(T)) : host.insertAdjacentHTML("beforeend", cardHTML(T));
      }
    }
    let t = null; try { t = tab; } catch (e) {}
    if (!D && t === "pnyf" && !root.querySelector(".ikstrip")) { const h = stripHTML(); if (h) { const at = root.querySelector(".pdstrip") || root.querySelector(".ukps"); at ? at.insertAdjacentHTML("afterend", h) : (root.querySelector(".splist") || root).insertAdjacentHTML("afterbegin", h); } }
  }
  const hook = () => { if (typeof window.render !== "function" || window.render.__ik) return false; const o = window.render; window.render = function () { const r = o.apply(this, arguments); try { decorate(); } catch (e) { console.warn("innflutningur", e); } return r; }; window.render.__ik = true; try { render = window.render; } catch (e) {} return true; };
  if (!hook()) { const iv = setInterval(() => { if (hook()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 15000); }

  /* ---------- Stillingar › Innflutningur ---------- */
  const inp = (attr, val, ph, w) => `<input ${attr} inputmode="decimal" value="${E(tom(val) ? "" : String(val).replace(".", ","))}" placeholder="${E(ph ?? "")}"${w ? ` style="width:${w}px"` : ""}>`;
  function settingsHTML() {
    const C = CFG(), g = C.gengi, faSel = (attr, cur) => `<select ${attr}><option value="">–</option>${C.fa.map(f => `<option value="${E(f.id)}"${f.id === cur ? " selected" : ""}>${E(f.nafn)}</option>`).join("")}</select>`;
    return `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px"><p class="hint" style="margin:0">Sjálfgefin gildi í reikninum „Reikna úr verðum birgja“. Reynsla (skráðar tollskýrslur og eldri sendingar) gengur framar sjálfgefnu gildunum.</p>
      <div class="two"><label>Álagning (%)<input id="ikc-alag" inputmode="decimal" value="${E(fx(C.alag, 1))}"></label><label>Námunda söluverð upp í næstu (kr.)<input id="ikc-namun" inputmode="numeric" value="${E(String(C.namun))}"></label></div>
      <div class="two"><label>Úrvinnslugjald raftækja (kr./kg nettó)<input id="ikc-urvKg" inputmode="decimal" value="${E(fx(C.urvKg, 1))}"></label><label>Úrvinnslugjald umbúða (kr./kg brúttó)<input id="ikc-umbKg" inputmode="decimal" value="${E(fx(C.umbKg, 1))}"></label></div>
      <div class="two"><label>Nettóþyngd sem % af brúttó<input id="ikc-nettoP" inputmode="decimal" value="${E(fx(C.nettoP, 0))}"></label><label>Flutningur ef engin reynsla (% af kaupverði)<input id="ikc-flutnP" inputmode="decimal" value="${E(fx(C.flutnP, 1))}"></label></div>
      <div class="two"><label>Óvissuálag (% af tollverði)<input id="ikc-ovissa" inputmode="decimal" value="${E(fx(C.ovissa, 1))}"></label><label>…þar til tollskýrslur frá birgi eru orðnar<input id="ikc-ovissaN" inputmode="numeric" value="${E(String(C.ovissaN))}"></label></div>
      <div class="two"><label>Gjald utan Evrópu (% af tollverði)<input id="ikc-utanP" inputmode="decimal" value="${E(fx(C.utanP, 2))}"></label><span></span></div>
      <label>Fyrirvari á tilboðum með innfluttum vörum<textarea id="ikc-fyrirvari" rows="2" style="font:inherit">${E(C.fyrirvari || "")}</textarea></label>
      <p class="hint" style="margin:0">Úrvinnslugjald raftækja er kr./kg nettóþyngdar eftir tollskrárnúmeri (t.d. 24 kr./kg á myndavélum, 8525.8300, í tollskýrslu Sonik 26.10.2026). Umbúðagjald er reiknað af áætlaðri þyngd umbúða.</p>
      <button type="button" class="btn primary" onclick="window.innflVistaStill&&innflVistaStill()">Vista</button></div>
      <div class="viewtitle">Flutningsaðilar og tollmiðlarar</div><div class="card ikfa" style="padding:12px 16px;overflow-x:auto"><p class="hint" style="margin:0 0 8px">Gjöld á sendingu eftir gjaldskrá – notuð þar til reynsla fæst (reikningar miðlara skráðir með tollskýrslum).</p>
        <table><thead><tr><th>Nafn</th><th>Tollafgr. kr.</th><th>+ % af gjöldum</th><th>lágmark</th><th>Tollskýrslugerð</th><th>+ á aukalínu</th><th>Uppskipun kr./m³</th><th>kr./tonn</th><th>lágmark</th><th>Reynsla</th><th></th></tr></thead><tbody>
        ${C.fa.map((f, i) => { const R = reynslaFA(f.id); return `<tr><td><input data-ikfa="${i}:nafn" value="${E(f.nafn)}" style="width:170px"></td>${["tollafgr", "tollafgrP", "tollafgrMin", "tollsk", "tollskLina", "uppskM3", "uppskT", "uppskMin"].map(k => `<td>${inp(`data-ikfa="${i}:${k}"`, f[k], "0", 86)}</td>`).join("")}<td class="ikhint">${R.n ? E(kr(R.midlun)) + " (" + R.n + ")" : "–"}</td><td>${C.fa.length > 1 ? `<button type="button" class="btn" onclick="innflEydaFa(${i})">Eyða</button>` : ""}</td></tr>`; }).join("")}</tbody></table>
        <p class="hint" style="margin:8px 0 0">${C.fa.filter(f => f.heimild).map(f => E(f.nafn) + ": " + E(f.heimild)).join(" · ")}</p>
        <button type="button" class="btn" onclick="innflNyrFa()">+ Flutningsaðili</button></div>
      <div class="viewtitle">Birgjar</div><div class="card ikfa" style="padding:12px 16px;overflow-x:auto">${C.birgjar.length ? `<table><thead><tr><th>Nafn</th><th>Mynt</th><th>Flutningsaðili</th><th>Sér um flutning</th><th>Flutningur kr./kg</th><th>Flutningur %</th><th>Álagning %</th><th>Utan Evrópu</th><th>Reynsla</th><th></th></tr></thead><tbody>
        ${C.birgjar.map((b, i) => { const R = reynsla(b.nafn); return `<tr><td><input data-ikb="${i}:nafn" value="${E(b.nafn)}" style="width:170px"></td><td><select data-ikb="${i}:mynt">${["ISK", ...MYNTIR].map(m => `<option${m === b.mynt ? " selected" : ""}>${m}</option>`).join("")}</select></td><td>${faSel(`data-ikb="${i}:fa"`, b.fa)}</td>
          <td style="text-align:center"><input type="checkbox" data-ikb="${i}:inni"${b.inni ? " checked" : ""} title="Birgir greiðir flutning til Íslands (t.d. CPT/DAP)"></td>
          <td>${inp(`data-ikb="${i}:flutnKg"`, b.flutnKg, R.flutnKg != null ? fx(R.flutnKg, 0) : "", 80)}</td><td>${inp(`data-ikb="${i}:flutnP"`, b.flutnP, fx(R.flutnP != null ? R.flutnP : C.flutnP, 1), 70)}</td><td>${inp(`data-ikb="${i}:alag"`, b.alag, fx(C.alag, 1), 70)}</td>
          <td style="text-align:center"><input type="checkbox" data-ikb="${i}:utan"${b.utan ? " checked" : ""}></td><td class="ikhint">${R.n ? R.n + (R.n === 1 ? " sending" : " sendingar") : "–"}</td><td><button type="button" class="btn" onclick="innflEydaBirgi(${i})">Eyða</button></td></tr>`; }).join("")}</tbody></table>` : `<p class="hint">Birgjar bætast hér við sjálfkrafa þegar þeir eru notaðir í reikninum.</p>`}
        <button type="button" class="btn" onclick="innflNyrBirgir()">+ Birgir</button></div>
      <div class="viewtitle">Eldri sendingar (reynsla)</div><div class="card iksaga" style="padding:12px 16px"><p class="hint" style="margin:0 0 8px">Skráðu eldri innflutning (tollskýrsla og reikningur miðlara) svo fyrstu tilboðin byggi á raunverulegum tölum. Sendingar á pöntunum í Atrium teljast sjálfkrafa með.</p>
        ${(C.saga || []).slice().sort((a, b) => String(b.dags).localeCompare(String(a.dags))).map(h => { const k = (+h.kaupM || 0) * (h.mynt === "ISK" ? 1 : +h.gengi || 0), fl = !tom(h.flutn) ? +h.flutn : +h.tollverd - k, fa = faOf(h.fa);
          return `<div class="lrow"><div class="lm"><div class="lt">${E(h.birgir)} · ${E(dIS(h.dags))}${fa ? " · " + E(fa.nafn) : ""}</div><div class="ls">${E(fx(h.kaupM, 2))} ${E(h.mynt)} á ${E(fx(h.gengi, 3))} · tollverð ${E(kr(h.tollverd))}${h.inni ? " · flutningur innifalinn" : ` · flutningur ${E(kr(fl))}${+h.kg ? " (" + E(fx(fl / h.kg, 0)) + " kr./kg)" : ""}`} · úrvinnslugjöld ${E(kr(!tom(h.urv) ? h.urv : h.gjold))}${+h.kg ? " · " + E(fx(h.kg, 1)) + " kg" : ""} · miðlun ${E(kr(h.midlun))}</div></div><div class="lr"><button type="button" class="btn" onclick="innflEydaSogu('${E(h.id)}')">Eyða</button></div></div>`; }).join("")}
        <button type="button" class="btn" onclick="innflNySaga()">+ Skrá eldri sendingu</button></div>
      <div class="viewtitle">Tollgengi</div><div class="card" style="padding:12px 16px"><p class="hint" style="margin:0 0 8px">${g && g.k ? `Síðast sótt ${E(String(g.sott || g.dags || "").slice(0, 10).split("-").reverse().join("."))} (${E(g.src || "")}): ` + Object.entries(g.k).filter(([m]) => ["EUR", "USD", "GBP", "DKK", "SEK", "NOK"].includes(m)).map(([m, v]) => E(m) + " " + E(fx(v, 2))).join(" · ") : "Ekki sótt enn."} Tollafgreiðslugengi Skattsins (skráð á mánudögum, gildir frá þriðjudegi).</p><button type="button" class="btn" onclick="innflSaekjaGengi()">Sækja tollgengi</button></div>`;
  }
  window.innflVistaStill = async () => { const v = k => document.getElementById("ikc-" + k)?.value;
    await saveCfg(c => { c.alag = num(v("alag")); c.utanP = num(v("utanP")); c.namun = Math.max(1, Math.round(num(v("namun")))); c.flutnP = num(v("flutnP")); c.urvKg = num(v("urvKg")); c.umbKg = num(v("umbKg")); c.nettoP = num(v("nettoP")); c.ovissa = num(v("ovissa")); c.ovissaN = Math.max(0, Math.round(num(v("ovissaN")))); c.fyrirvari = (v("fyrirvari") || "").trim(); }); toast?.("Stillingar innflutnings vistaðar"); render(); };
  const TOLUR = ["alag", "flutnP", "flutnKg", "tollafgr", "tollafgrP", "tollafgrMin", "tollsk", "tollskLina", "uppskM3", "uppskT", "uppskMin", "annad"];
  const gildi = (t, f) => t.type === "checkbox" ? t.checked : TOLUR.includes(f) ? (t.value.trim() === "" ? "" : num(t.value)) : t.value;
  document.addEventListener("change", e => { const t = e.target, kb = t?.dataset?.ikb, kf = t?.dataset?.ikfa; if (!kb && !kf) return;
    if (kb) { const [i, f] = kb.split(":"); saveCfg(c => { const b = (c.birgjar || [])[+i]; if (b) b[f] = gildi(t, f); }).then(() => toast?.("Birgir uppfærður")); }
    if (kf) { const [i, f] = kf.split(":"); saveCfg(c => { c.fa = (c.fa && c.fa.length ? c.fa : FA0.map(x => ({ ...x }))); const x = c.fa[+i]; if (x) x[f] = gildi(t, f); }).then(() => toast?.("Flutningsaðili uppfærður")); } });
  window.innflNyrFa = () => saveCfg(c => { c.fa = (c.fa && c.fa.length ? c.fa : FA0.map(x => ({ ...x }))).concat([{ id: uid(), nafn: "Nýr flutningsaðili", tollafgr: 0, tollafgrP: 0, tollafgrMin: 0, tollsk: 0, tollskLina: 0, uppskM3: 0, uppskT: 0, uppskMin: 0, annad: 0 }]); }).then(render);
  window.innflEydaFa = i => saveCfg(c => { c.fa = (c.fa && c.fa.length ? c.fa : FA0.map(x => ({ ...x }))); c.fa.splice(i, 1); }).then(render);
  window.innflEydaSogu = id => saveCfg(c => { c.saga = (c.saga || []).filter(h => h.id !== id); }).then(render);
  window.innflNySaga = () => { const C = CFG();
    const f = (k, l, ph) => `<label>${l}<input id="iks-${k}" ${k === "dags" ? 'type="date"' : `inputmode="${k === "birgir" ? "text" : "decimal"}"`} placeholder="${E(ph || "")}"${k === "birgir" ? ' list="iksbl"' : ""}></label>`;
    const { w, close } = modal("Skrá eldri sendingu", `<label class="iktsdrop" id="iks-drop"><input type="file" accept="application/pdf" multiple hidden id="iks-file"><b>Lesa úr PDF</b><span>Tollskýrsla (SAD) og skuldfærslutilkynning (CUSTAR) – reitirnir fyllast sjálfkrafa.</span></label><div class="pfhint" id="iks-lest"></div>
      <div class="ikg3">${f("birgir", "Birgir")}<label>Mynt<select id="iks-mynt">${["EUR", "USD", "GBP", "DKK", "SEK", "NOK", "CHF", "ISK", "JPY", "CNY", "CAD", "AUD", "PLN"].map(m => `<option>${m}</option>`).join("")}</select></label>${f("dags", "Dagsetning tollskýrslu")}</div>
      <div class="ikg3"><label>Flutningsaðili<select id="iks-fa">${C.fa.map(x => `<option value="${E(x.id)}">${E(x.nafn)}</option>`).join("")}</select></label><label class="ikchk" style="flex-direction:row;align-items:center;gap:8px;align-self:end;min-height:40px"><input type="checkbox" id="iks-inni"> Birgir sá um flutning (t.d. CPT/DAP)</label>${f("kg", "Brúttóþyngd (kg)")}</div>
      <div class="ikg3">${f("kaupM", "Kaupverð alls (í mynt)", "t.d. 4.250")}${f("gengi", "Tollgengi", "t.d. 136,4")}${f("tollverd", "Tollverð (kr.)")}</div>
      <div class="ikg3">${f("urv", "Önnur gjöld – úrvinnslugjöld (kr.)")}${f("midlun", "Reikningur miðlara (kr. án VSK)")}${f("flutn", "Flutningur og vátrygging (kr.) – valfrjálst")}</div>
      <datalist id="iksbl">${C.birgjar.map(b => `<option value="${E(b.nafn)}">`).join("")}</datalist><div class="pfhint" id="iks-sum"></div>
      <div class="pfact"><button type="button" class="btn" data-x="1">Hætta við</button><button type="button" class="btn" id="iks-meira">Vista og skrá aðra</button><button type="button" class="btn primary" id="iks-ok">Vista</button></div>`);
    const el = k => w.querySelector("#iks-" + k), v = k => el(k)?.value.trim() || "";
    el("birgir").addEventListener("change", e => { const b = birgir(e.target.value); if (b) { el("mynt").value = b.mynt || "EUR"; if (b.fa) el("fa").value = b.fa; el("inni").checked = !!b.inni; } });
    const upd = () => { const k = num(v("kaupM")) * (v("mynt") === "ISK" ? 1 : num(v("gengi"))), tv = num(v("tollverd")), fl = v("flutn") ? num(v("flutn")) : tv - k, kg = num(v("kg"));
      el("sum").textContent = k && tv ? (el("inni").checked ? "Flutningur innifalinn í verði" : `Flutningur ${kr(fl)} = ${fx(fl / k * 100, 1)} % af kaupverði${kg ? " · " + fx(fl / kg, 0) + " kr./kg" : ""}`) + (kg ? ` · úrvinnslugjöld ${fx(num(v("urv")) / kg, 1)} kr./kg` : "") : ""; };
    w.addEventListener("input", upd); w.addEventListener("change", upd);
    const lesa = async files => { const L = el("lest"); L.textContent = "Les…"; const msg = [];
      for (const fl of files) { try { const o = lesaTollskjal(await pdfTexti(fl)); const set = (k, x, d) => { if (x == null || x === "") return; el(k).value = typeof x === "number" ? String(Math.round(x * 10 ** (d || 0)) / 10 ** (d || 0)).replace(".", ",") : x; };
          if (o.teg === "sad") { if (o.mynt) el("mynt").value = o.mynt; set("kaupM", o.upph, 2); set("gengi", o.gengi, 4); set("tollverd", o.tollverd); set("kg", o.kg, 2); if (o.dags) set("dags", o.dags);
            if (o.sendandi && !v("birgir")) set("birgir", o.sendandi.replace(/\b(\w)(\w*)/g, (m, a, b) => a + b.toLowerCase()));
            if (/^(CPT|CIP|DAP|DPU|DDP|CIF|CFR)$/.test(o.afh || "")) el("inni").checked = true; msg.push(`SAD: ${o.mynt || ""} ${o.upph != null ? fx(o.upph, 2) : ""} · tollverð ${kr(o.tollverd)} · ${fx(o.kg, 2)} kg · ${o.afh || ""}`); }
          else if (o.teg === "custar") { set("urv", (o.urv || 0) + (o.tollur || 0)); if (o.dags) set("dags", o.dags); if (/DHL/i.test(o.midlari || "")) { const d = CFG().fa.find(x => /dhl/i.test(x.nafn)); if (d) el("fa").value = d.id; }
            msg.push(`CUSTAR: tollur ${kr(o.tollur)} · önnur gjöld ${kr(o.urv)} · VSK ${kr(o.vsk)}${o.midlari ? " · " + o.midlari : ""}`); }
          else msg.push(fl.name + ": þekkti ekki sniðið"); } catch (x) { msg.push(fl.name + ": " + (x.message || x)); } }
      L.innerHTML = msg.map(E).join("<br>"); upd(); };
    el("file").addEventListener("change", e => { if (e.target.files.length) lesa([...e.target.files]); });
    const dz = el("drop"); ["dragover", "dragenter"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add("on"); })); ["dragleave", "drop"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove("on"); }));
    dz.addEventListener("drop", e => { const fs = [...(e.dataTransfer?.files || [])].filter(x => /\.pdf$/i.test(x.name)); if (fs.length) lesa(fs); });
    const save = async again => { if (!v("birgir") || !num(v("kaupM")) || !num(v("tollverd"))) { toast?.("Skráðu birgi, kaupverð og tollverð"); return; }
      const h = { id: uid(), birgir: v("birgir"), mynt: v("mynt"), dags: v("dags") || new Date().toISOString().slice(0, 10), fa: v("fa"), inni: el("inni").checked, kg: num(v("kg")) || "", kaupM: num(v("kaupM")), gengi: v("mynt") === "ISK" ? 1 : num(v("gengi")), tollverd: num(v("tollverd")), urv: num(v("urv")), midlun: v("midlun") ? num(v("midlun")) : 0, flutn: v("flutn") ? num(v("flutn")) : "" };
      await saveCfg(c => { c.saga = (c.saga || []).concat([h]); const B = (c.birgjar || []).find(b => b.nafn.toLowerCase() === h.birgir.toLowerCase());
        if (!B) c.birgjar = (c.birgjar || []).concat([{ id: uid(), nafn: h.birgir, mynt: h.mynt, fa: h.fa, inni: h.inni, utan: false, alag: "" }]); else { if (!B.fa) B.fa = h.fa; if (h.inni && B.inni == null) B.inni = true; } });
      toast?.("Sending skráð – " + h.birgir); close(); render(); if (again) setTimeout(() => window.innflNySaga(), 150); };
    el("ok").onclick = () => save(false); el("meira").onclick = () => save(true); };
  window.innflNyrBirgir = () => saveCfg(c => { c.birgjar = (c.birgjar || []).concat([{ id: uid(), nafn: "Nýr birgir", mynt: "EUR", utan: false, alag: "" }]); }).then(render);
  window.innflEydaBirgi = i => saveCfg(c => { (c.birgjar || []).splice(i, 1); }).then(render);
  window.innflSaekjaGengi = async () => { const g = await gengiNu(true); toast?.(g ? "Tollgengi sótt" : "Náði ekki í tollgengið – það má slá það inn í reikninum"); render(); };
  const addPage = () => { if (typeof STPAGES === "undefined") return false; STPAGES.innfl = { l: "Innflutningur", d: "Álagning, gjöld, flutningsaðilar, birgjar og tollgengi fyrir tilboð úr verðum birgja", s: ["Innflutningur", "Álagning", "Birgjar", "Flutningsaðilar", "Tollgengi", "Tollskýrslugerð", "Úrvinnslugjald"], adm: 1, fn: () => settingsHTML() }; return true; };
  if (!addPage()) { const iv = setInterval(() => { if (addPage()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }

  /* ---------- Sýnidæmi (aðeins í sýniútgáfu) ----------
     Tilboð S-0950 og pöntun P-0950 (hljóðkerfi í fundarsal) úr verðum tveggja birgja:
     1) Klangwerk GmbH (EUR) – sjófrakt með Eimskip, flutningur áætlaður eftir kg úr reynslu (3 eldri sendingar);
     2) Nordisk AV ApS (DKK) – birgir sér um flutning (CPT), DHL Express sér um tollafgreiðslu – eins og raunveruleg sending Sonik í október 2026. */
  function demoData() {
    if (!window.AERA_DEMO || !on()) return true; let s0 = null; try { s0 = S; } catch (e) {} if (!s0 || !s0.tilbod || !s0.pantanir) return false;
    if (s0.tilbod.some(T => T.ink) || s0.pantanir.some(P => P.ink)) return true;
    const iso = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    const kap = VR().find(v => /Hátalarakapall/.test(v.heiti || "")), vskd = (s0.vidskiptavinir || [])[0];
    // Eldri sendingar (reynsla): Klangwerk með Eimskip – flutningur ~290–330 kr./kg; Nordisk AV með DHL – flutningur innifalinn
    const saga = [
      { id: "dH1", birgir: "Klangwerk GmbH", mynt: "EUR", dags: iso(-95), fa: "eimskip", inni: false, kg: 48, kaupM: 1340, gengi: 135.8, flutn: 14400, tollverd: Math.round(1340 * 135.8 + 14400), urv: 1430, midlun: 26100 },
      { id: "dH2", birgir: "Klangwerk GmbH", mynt: "EUR", dags: iso(-60), fa: "eimskip", inni: false, kg: 71, kaupM: 2560, gengi: 136.2, flutn: 21900, tollverd: Math.round(2560 * 136.2 + 21900), urv: 2150, midlun: 27050 },
      { id: "dH3", birgir: "Klangwerk GmbH", mynt: "EUR", dags: iso(-28), fa: "eimskip", inni: false, kg: 39, kaupM: 980, gengi: 136.6, flutn: 12800, tollverd: Math.round(980 * 136.6 + 12800), urv: 1170, midlun: 25700 },
      { id: "dH4", birgir: "Nordisk AV ApS", mynt: "DKK", dags: iso(-40), fa: "dhl", inni: true, kg: 6, kaupM: 11200, gengi: 18.3, flutn: "", tollverd: Math.round(11200 * 18.3), urv: 170, midlun: 3900 }];
    const ink = { dags: new Date().toISOString(), gengi: { k: { ...DEMO_GENGI }, dags: iso(-1), src: "sýnigengi" }, s: [
      { id: "dS1", birgir: "Klangwerk GmbH", mynt: "EUR", utan: false, fa: "eimskip", flutnH: "kg", kg: 64, m3: 0.6, flutn: "", flutnM: "ISK", vatr: "", tollsk: "", alag: "", linur: [
        nyLina({ k: "dL1", heiti: "Loftahátalari 8\" (hvítur)", bnr: "KW-C8W", magn: 12, verd: 112, kg: 3.2, hopur: "Hátalarar" }),
        nyLina({ k: "dL2", heiti: "Magnari 4 × 120 W", bnr: "KW-A4120", magn: 2, verd: 640, kg: 9.5, hopur: "Magnarar og stýring" }),
        nyLina({ k: "dL3", heiti: "Veggstjórnborð með hljóðstyrk", bnr: "KW-WP2", magn: 2, verd: 85, kg: 0.4, hopur: "Magnarar og stýring" }) ] },
      { id: "dS2", birgir: "Nordisk AV ApS", mynt: "DKK", utan: false, fa: "dhl", flutnH: "inni", kg: 8.4, flutn: "", flutnM: "ISK", vatr: "", tollsk: "", alag: 35, linur: [
        nyLina({ k: "dL4", heiti: "Þráðlaust hljóðnemakerfi (2 rása)", bnr: "NAV-WM2", magn: 2, verd: 8570, kg: 4.2, hopur: "Hljóðnemar" }) ] } ] };
    const C0 = CFG();
    // reynslan þarf að vera komin í stillingar áður en reiknað er – reiknað á bráðabirgðastillingum
    const cfgDemo = { ...C0, saga, birgjar: [{ id: "dB1", nafn: "Klangwerk GmbH", mynt: "EUR", fa: "eimskip", inni: false, utan: false, alag: "" }, { id: "dB2", nafn: "Nordisk AV ApS", mynt: "DKK", fa: "dhl", inni: true, utan: false, alag: 35 }] };
    saveSnapshot(s => { s.stillingar = s.stillingar || {}; s.stillingar.innflutningur = { ...(s.stillingar.innflutningur || {}), ...cfgDemo }; }).then(() => {
      const R = reikna(ink), lin = []; ink.s.forEach(s => { s.fz = upplausn(s); });
      R.send.forEach(r => r.lines.forEach(x => lin.push({ id: uid(), v: null, heiti: x.l.heiti, teg: "sala", hl: x.l.hopur || "Vörur", magn: x.m, ein: "stk.", verd: Math.round(x.sv), dagar: null, afsl: 0, ik: { k: x.l.k, s: r.s.id, kostn: Math.round(x.kstk) } })));
      if (kap) lin.push({ id: uid(), v: kap.id, heiti: kap.heiti, teg: "sala", hl: "Uppsetningarefni", magn: 120, ein: kap.eining || "m", verd: +kap.soluverd || 690, dagar: null, afsl: 0 });
      const base = { deild: "sala", vskId: vskd?.id || null, vidskiptavinur: "Hótel Hekla", tengilidur: "Anna Guðmundsdóttir", netfang: "anna@hotelhekla.example", stadsetning: "Hótel Hekla, fundarsalur", afsl: 0, athugasemd: "Sýnidæmi: verð frá tveimur erlendum birgjum reiknuð í Innflutningi", prufa: true };
      const T = { ...base, id: "ikdemoT", nr: "S-0950", heiti: "Hljóðkerfi í fundarsal", dags: iso(-6), fra: iso(12), stada: "Samþykkt", sent: iso(-5), utgafa: 1, eldri: [], linur: lin, ink: structuredClone(ink) };
      const ink2 = structuredClone(ink), e1 = R.send[0].sum, e2 = R.send[1].sum;
      // Sending 1 komin: flutningur reyndist hærri (82 kg í stað 64) og miðlun hærri en áætlað
      ink2.s[0].stada = "komid"; ink2.s[0].pantad = iso(-4) + "T10:00:00Z"; ink2.s[0].komid = iso(-1);
      ink2.s[0].ts = { nr: "IMP26402215", dags: iso(-1), gengi: 137.2, kg: 82, tollverd: Math.round(e1.kaup / 136.4 * 137.2 + 82 * 312), tollur: 0, urv: Math.round(82 * 30.2), vsk: Math.round((e1.kaup / 136.4 * 137.2 + 82 * 312 + 82 * 30.2) * 0.24), flutn: "", utan: 0, midlun: 27400, innlent: 8500, af: "JJ", skrad: iso(-1) };
      // Sending 2 (CPT, DHL): tollskýrsla skráð, nánast eins og áætlað
      ink2.s[1].stada = "komid"; ink2.s[1].pantad = iso(-3) + "T14:00:00Z"; ink2.s[1].komid = iso(-1);
      ink2.s[1].ts = { nr: "IMP26402188", dags: iso(-1), gengi: 18.248, kg: 8.4, tollverd: Math.round(17140 * 18.248), tollur: 0, urv: 250, vsk: Math.round((17140 * 18.248 + 250) * 0.24), flutn: "", utan: 0, midlun: 3950, innlent: 0, af: "JJ", skrad: iso(-1) };
      const P = { ...base, id: "ikdemoP", pontun: true, nr: "P-0950", deild: "blandad", heiti: "Hljóðkerfi í fundarsal", uppruni: "tilbod", ytriNr: null, dags: iso(-4), fra: iso(12), til: iso(12), stada: "Staðfest", starfsmenn: [], linur: lin.map(l => ({ ...l, id: uid() })), tilbodId: "ikdemoT", ink: ink2 };
      return saveSnapshot(s => { s.tilbod = s.tilbod || []; s.pantanir = s.pantanir || []; if (!s.tilbod.some(x => x.id === "ikdemoT")) s.tilbod.push(T); if (!s.pantanir.some(x => x.id === "ikdemoP")) s.pantanir.push(P); });
    }).catch(() => {});
    return true;
  }
  if (window.AERA_DEMO) { const iv = setInterval(() => { if (demoData()) clearInterval(iv); }, 500); setTimeout(() => clearInterval(iv), 20000); }

  // Fyrirvari um gengi og flutning á tilboði/pöntun með vörum frá erlendum birgjum (PDF og síða viðskiptavinar)
  window.innflFyrirvari = T => on() && T && T.ink && (T.ink.s || []).some(s => (s.linur || []).some(l => +l.verd > 0)) ? (CFG().fyrirvari || "").trim() : "";
  window.innflAPI = { reikna, framlegd, samanburdur, CFG, reynsla };
})();
