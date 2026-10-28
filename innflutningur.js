/* Innflutningur og kostnaðarverð (2.109.0, eining „innflutningur“, sjálfgefið óvirk – virk hjá Sonik).
   Markmið: tilboð byggð á verðum frá erlendum birgjum á nokkrum mínútum, með öllum gjöldum reiknuðum inn, og eftirfylgni
   sem ber áætlaðan kostnað saman við raunkostnað úr tollskýrslunni (tekjuleki).

   1. Reiknir á tilboði/pöntun („Reikna úr verðum birgja“): ein eða fleiri sendingar (ein á hvern birgi).
      Tollverð (CIF) = kaupverð + flutningur + vátrygging, fært í krónur á tollgengi (tollafgreiðslugengi Skattsins).
      Aukagjöld (t.d. úrvinnslugjald) = % af tollverði (áætlað – fer eftir tollskrárnúmeri; raunupphæð kemur úr tollskýrslu).
      Gjald utan Evrópu (sjálfgefið 1 % af tollverði) og tollskýrslugerð (föst upphæð á sendingu).
      Kostnaðarverð = tollverð + aukagjöld + gjald utan Evrópu + tollskýrslugerð. VSK við komu (24 % af tollverði + aukagjöldum)
      er ekki kostnaður (innskattur) – sýndur sem útlagt fé. Flutningur, vátrygging og tollskýrslugerð dreifast á línur eftir
      gjaldskyldri þyngd (raunþyngd eða rúmmálsþyngd L×B×H/5000, hvor sem er hærri), annars eftir verði.
      Söluverð = kostnaðarverð × (1 + álagning), námundað upp. Álagning: Stillingar › Innflutningur (sjálfgefið), birgir, lína.
      „Setja í tilboð“ skrifar sölulínur (verð til viðskiptavinar) – innkaupsupplýsingar eru á línunni (l.ik) og á skjalinu (T.ink),
      aldrei á PDF eða síðu viðskiptavinar.
   2. Innkaup á pöntun: hver sending fær stöðu (Ekki pantað → Pantað → Komið) og tollskýrslu (raunverulegar tölur).
      Raunkostnaður borinn saman við áætlun – frávik í kr. og framlegð áætluð/raun. Yfirlit á Pantanir › Yfirlit.
   Gögn (engin ný söfn, engar nýjar reglur):
     tilbod|pantanir/{id}.ink = { dags, gengi: { k: {EUR: 145.3 …}, dags, src }, s: [ sending ] }
       sending = { id, birgir, mynt, utan (bool), flutn, flutnM ("ISK"|mynt), vatr, tollsk, linur: [ { k, v?, heiti, bnr, magn, verd,
                   kg, l, b, h, agj (%), alag (%), sv (handvirkt söluverð/stk) } ],
                   stada: "" | "pantad" | "komid", pantad, komid, ts: { nr, dags, gengi, tollverd, gjold, vsk, midlun, utan, innlent } }
     línur skjalsins: l.ik = { k (lína í reikni), s (sending-id), kostn (kostnaðarverð/stk) }
     app/state.stillingar.innflutningur = { alag, utanP, tollsk, namun, agj, birgjar: [{ id, nafn, mynt, utan, alag, land }], gengi }
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
  const DEMO_GENGI = { EUR: 136.4, USD: 121.92, GBP: 162.73, DKK: 18.248, SEK: 12.246, NOK: 13.047, CHF: 147.57, JPY: 0.7743, CNY: 18.283, CAD: 86.91, AUD: 85.64, PLN: 30.973 };   // tollgengi 27.10.2026

  /* ---------- Stillingar ---------- */
  const CFG = () => ({ alag: 30, utanP: 1, tollsk: 17500, namun: 10, agj: 0, flutnP: 10, birgjar: [], ...(tr(() => S.stillingar.innflutningur, null) || {}) });
  const saveCfg = fn => saveSnapshot(s => { s.stillingar = s.stillingar || {}; s.stillingar.innflutningur = { ...CFG(), ...(s.stillingar.innflutningur || {}) }; fn(s.stillingar.innflutningur, s); });
  const tom = x => x === "" || x == null;
  const alagB = b => b && !tom(b.alag) ? +b.alag : CFG().alag;            // álagning birgis eða sjálfgefin
  const alagS = s => !tom(s.alag) ? +s.alag : alagB(birgir(s.birgir));   // álagning sendingar
  const birgir = n => CFG().birgjar.find(b => String(b.nafn || "").toLowerCase() === String(n || "").trim().toLowerCase()) || null;
  /* Reynsla (2.111.0): úr skráðum tollskýrslum – flutningur (og vátrygging) sem % af kaupverði og aðflutningsgjöld sem % af tollverði,
     meðaltal síðustu 5 sendinga frá sama birgi. Flutningur á tollskýrslu = skráð upphæð, annars tollverð − kaupverð á tollgengi (CIF − FOB). */
  const kaupMyntS = s => (s.linur || []).reduce((a, l) => a + (+l.magn || 0) * (+l.verd || 0), 0);
  function reynsla(nafn) {
    const n = String(nafn || "").trim().toLowerCase(); if (!n) return { n: 0 };
    const seen = new Set(), L = [];
    tr(() => A().PN().concat(A().TB()), []).forEach(T => (T.ink?.s || []).forEach(s => { const t = s.ts;
      if (!t || seen.has(s.id) || String(s.birgir || "").trim().toLowerCase() !== n) return; seen.add(s.id);
      const g = s.mynt === "ISK" ? 1 : +t.gengi || +(T.ink.gengi?.k || {})[s.mynt] || 0, kaup = kaupMyntS(s) * g; if (!kaup || !(+t.tollverd)) return;
      const fl = !tom(t.flutn) ? +t.flutn : +t.tollverd - kaup; L.push({ d: t.dags || "", fp: fl / kaup * 100, ap: (+t.gjold || 0) / +t.tollverd * 100 }); }));
    const X = L.filter(x => isFinite(x.fp) && x.fp >= 0).sort((a, b) => String(b.d).localeCompare(String(a.d))).slice(0, 5); if (!X.length) return { n: 0 };
    return { n: X.length, flutnP: X.reduce((a, x) => a + x.fp, 0) / X.length, agjP: X.reduce((a, x) => a + x.ap, 0) / X.length };
  }
  // Flutningsálag og aukagjöld sendingar: fryst gildi (vistað tilboð) eða ný upplausn (reiknir opinn) – sending › birgir › reynsla › sjálfgefið
  function upplausn(s, live) {
    if (s.fz) return s.fz;   // fryst þegar tilboðið var vistað – breytist ekki þótt reynslan breytist (eytt ef sendingunni er breytt)
    const C = CFG(), b = birgir(s.birgir), R = reynsla(s.birgir);
    const fl = !tom(s.flutnP) ? [+s.flutnP, "% sendingar"] : b && !tom(b.flutnP) ? [+b.flutnP, "% birgis"] : R.n ? [R.flutnP, `reynsla, ${R.n} ${R.n === 1 ? "sending" : "sendingar"}`] : [+C.flutnP || 0, "sjálfgefið"];
    const ag = R.n ? [R.agjP, `reynsla, ${R.n} ${R.n === 1 ? "sending" : "sendingar"}`] : [+C.agj || 0, "sjálfgefið"];
    return { flutnP: fl[0], flutnSrc: fl[1], agjP: ag[0], agjSrc: ag[1] };
  }
  const upph = s => s.flutnH ? s.flutnH === "upph" : !tom(s.flutn) && +s.flutn > 0;   // eldri sendingar með upphæð = þekkt upphæð

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
  // Skilar fyrir hverja sendingu: línur með kostn/stk og söluverði, og samtölur. G: { EUR: … } gengi.
  function reikna(ink, live) {
    const C = CFG(), G = (ink.gengi && ink.gengi.k) || {}, out = [];
    let T = { kaup: 0, tollverd: 0, agj: 0, utan: 0, tollsk: 0, kostn: 0, sala: 0, vsk: 0, kg: 0 };
    (ink.s || []).forEach(s => {
      const g = s.mynt === "ISK" ? 1 : (+s.gengi || +G[s.mynt] || 0), alag0 = alagS(s);
      const L = (s.linur || []).filter(l => (+l.magn || 0) > 0 && (+l.verd > 0 || +l.sv > 0));   // aðeins línur með verði
      const rows = L.map(l => { const m = +l.magn || 0, kg = +l.kg || 0, vol = (+l.l || 0) * (+l.b || 0) * (+l.h || 0) / 5000;
        return { l, m, kaupM: (+l.verd || 0) * m, kgj: Math.max(kg, vol) * m, vol }; });
      const kaupM = rows.reduce((a, r) => a + r.kaupM, 0), kgAll = rows.reduce((a, r) => a + r.kgj, 0), allKg = rows.length && rows.every(r => r.kgj > 0);
      const U = upplausn(s, live), up = upph(s);
      const flutnISK = up ? (+s.flutn || 0) * (s.flutnM === "ISK" ? 1 : g) : kaupM * g * U.flutnP / 100, vatrISK = up ? (+s.vatr || 0) * (s.flutnM === "ISK" ? 1 : g) : 0, tollsk = !kaupM ? 0 : s.tollsk === "" || s.tollsk == null ? +C.tollsk || 0 : +s.tollsk || 0;
      const share = r => allKg ? r.kgj / kgAll : kaupM ? r.kaupM / kaupM : 1 / rows.length;
      const S1 = { kaup: 0, tollverd: 0, agj: 0, utan: 0, tollsk: 0, kostn: 0, sala: 0, vsk: 0 };
      const lines = rows.map(r => { const sh = share(r), kaup = r.kaupM * g, tollverd = kaup + (flutnISK + vatrISK) * sh, agjP = r.l.agj !== "" && r.l.agj != null ? +r.l.agj : U.agjP;
        const agj = tollverd * agjP / 100, utan = s.utan ? tollverd * (+C.utanP || 0) / 100 : 0, ts = tollsk * sh, kostn = tollverd + agj + utan + ts, kstk = r.m ? kostn / r.m : 0;
        const alag = r.l.alag !== "" && r.l.alag != null ? +r.l.alag : alag0, nm = Math.max(1, +C.namun || 1);
        const svA = Math.ceil(kstk * (1 + alag / 100) / nm) * nm, sv = +r.l.sv > 0 ? +r.l.sv : svA, sala = sv * r.m, vsk = (tollverd + agj) * 0.24;
        Object.entries({ kaup, tollverd, agj, utan, tollsk: ts, kostn, sala, vsk }).forEach(([k, v]) => { S1[k] += v; });
        return { ...r, kaup, tollverd, agj, utan, ts, kostn, kstk, sv, svA, sala, alag: kstk ? (sv / kstk - 1) * 100 : 0, alagSj: alag, handv: +r.l.sv > 0, fram: sala - kostn }; });
      Object.keys(S1).forEach(k => { T[k] += S1[k]; }); T.kg += kgAll;
      S1.kaupM = kaupM;
      out.push({ s, g, lines, sum: S1, kgAll, allKg, flutnISK, vatrISK, tollsk, U, up });
    });
    T.fram = T.sala - T.kostn; T.framP = T.sala ? T.fram / T.sala * 100 : 0;
    return { send: out, T };
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
    const myntir = [...new Set(ink.s.map(s => s.mynt).filter(m => m && m !== "ISK"))];
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
          <label class="ikin">Kg/stk<input data-f="l:${si}:${li}:kg" inputmode="decimal" value="${V(l, "kg")}"></label>
          <label class="ikin">L × B × H (cm)<span class="iklbh"><input data-f="l:${si}:${li}:l" inputmode="decimal" value="${V(l, "l")}" placeholder="L"><input data-f="l:${si}:${li}:b" inputmode="decimal" value="${V(l, "b")}" placeholder="B"><input data-f="l:${si}:${li}:h" inputmode="decimal" value="${V(l, "h")}" placeholder="H"></span></label>
          <label class="ikin">Aukagjöld %<input data-f="l:${si}:${li}:agj" inputmode="decimal" value="${V(l, "agj")}" placeholder="${E(fx(C.agj, 1))}"></label>
          <label class="ikin wide">Hópur á tilboði<input data-f="l:${si}:${li}:hopur" list="ikhl" value="${E(l.hopur || "")}" placeholder="${E(s.hopur || "Vörur")}"></label></div>
          ${x ? `<p class="ikhint" style="margin:6px 0 0">Tollverð ${E(kr(x.tollverd / x.m))}/stk · aukagjöld ${E(kr(x.agj / x.m))} · ${s.utan ? "utan Evrópu " + E(kr(x.utan / x.m)) + " · " : ""}tollskýrslugerð ${E(kr(x.ts / x.m))}${x.vol ? " · rúmmálsþyngd " + E(fx(x.vol, 1)) + " kg" : ""}</p>` : ""}</td></tr>` : "";
        return main + det; }).join("");
      const R5 = reynsla(s.birgir);
      const chips = [r.up ? `Flutningur ${E(kr(r.flutnISK))} (þekkt)` : `Flutningur ${E(fx(r.U.flutnP, 1))} % – ${E(r.U.flutnSrc)} = ${E(kr(r.flutnISK))}`, r.up && +s.vatr ? `vátrygging ${E(kr(r.vatrISK))}` : "", `aukagjöld ${E(fx(r.U.agjP, 1))} %${r.U.agjSrc !== "sjálfgefið" ? " (" + E(r.U.agjSrc) + ")" : ""}`, `tollskýrslugerð ${E(kr(r.tollsk))}`, `álagning ${E(fx(alagS(s), 1))} %`, s.syn === "ein" ? "ein lína á tilboði" : ""].filter(Boolean).join(" · ");
      return `<section class="iks"><div class="ikrow ikshead"><input class="ikbn" data-f="s:${si}:birgir" list="ikbl" value="${E(s.birgir)}" placeholder="Birgir" aria-label="Birgir">
          <select class="ikmy" data-f="s:${si}:mynt" aria-label="Mynt">${["ISK", ...MYNTIR].map(m => `<option${m === s.mynt ? " selected" : ""}>${m}</option>`).join("")}</select>
          <button type="button" class="ikchip${s.utan ? " on" : ""}" data-ik="utan:${si}" aria-pressed="${!!s.utan}">Utan Evrópu${s.utan ? " +" + E(fx(C.utanP, 1)) + " %" : ""}</button>
          <span class="sp"></span><span class="iksf">${sm.sala ? `<b class="${fr >= 0 ? "pos" : "neg"}">${E(kr(fr))}</b> framlegð · ${E(fx(sm.sala ? fr / sm.sala * 100 : 0, 1))} %` : ""}</span>${ink.s.length > 1 ? `<button type="button" class="ikib" data-ik="ds:${si}" title="Fjarlægja sendingu">×</button>` : ""}</div>
        <div class="ikrow ikcost"><button type="button" class="iklink" data-ik="op:${E(s.id)}" aria-expanded="${op}">${chips} <span aria-hidden="true">${op ? "▴" : "▾"}</span></button></div>
        ${op ? `<div class="ikrow ikopt"><label class="ikin wide">Flutningur<select data-f="s:${si}:flutnH"><option value="pct"${r.up ? "" : " selected"}>Áætlaður – % af kaupverði</option><option value="upph"${r.up ? " selected" : ""}>Þekkt upphæð</option></select></label>
          ${r.up ? `<label class="ikin">Flutningur<input data-f="s:${si}:flutn" inputmode="decimal" value="${V(s, "flutn")}" placeholder="0"></label><label class="ikin">Vátrygging<input data-f="s:${si}:vatr" inputmode="decimal" value="${V(s, "vatr")}" placeholder="0"></label>
          <label class="ikin">Í mynt<select data-f="s:${si}:flutnM"><option value="ISK"${s.flutnM === "ISK" ? " selected" : ""}>ISK</option>${s.mynt !== "ISK" ? `<option value="${E(s.mynt)}"${s.flutnM !== "ISK" ? " selected" : ""}>${E(s.mynt)}</option>` : ""}</select></label>`
          : `<label class="ikin">Flutningur %<input data-f="s:${si}:flutnP" inputmode="decimal" value="${V(s, "flutnP")}" placeholder="${E(fx(r.U.flutnP, 1))}" title="Autt = ${E(r.U.flutnSrc)}"></label>`}
          <label class="ikin">Tollskýrslugerð<input data-f="s:${si}:tollsk" inputmode="decimal" value="${V(s, "tollsk")}" placeholder="${E(String(C.tollsk))}"></label>
          <label class="ikin">Álagning %<input data-f="s:${si}:alag" inputmode="decimal" value="${V(s, "alag")}" placeholder="${E(fx(alagB(b), 1))}"></label>
          <label class="ikin wide">Hópur á tilboði<input data-f="s:${si}:hopur" list="ikhl" value="${E(s.hopur || "")}" placeholder="Vörur"></label>
          <label class="ikin wide">Á tilboði<select data-f="s:${si}:syn"><option value="linur"${s.syn !== "ein" ? " selected" : ""}>Hver vara sér lína</option><option value="ein"${s.syn === "ein" ? " selected" : ""}>Ein lína (samtala)</option></select></label>
          ${s.syn === "ein" ? `<label class="ikin wide">Heiti línunnar<input data-f="s:${si}:lysing" value="${E(s.lysing || "")}" placeholder="${E("Vörur frá " + (s.birgir || "birgi"))}"></label>` : ""}</div>
          <p class="ikhint" style="margin:0">${R5.n ? `Reynsla af ${E(s.birgir)}: flutningur ${E(fx(R5.flutnP, 1))} % af kaupverði og aðflutningsgjöld ${E(fx(R5.agjP, 1))} % af tollverði (meðaltal ${R5.n} ${R5.n === 1 ? "sendingar" : "síðustu sendinga"}). ` : s.birgir ? "Engin tollskýrsla skráð enn frá þessum birgi – sjálfgefið álag notað þar til reynsla fæst. " : ""}${r.kgAll ? "Gjaldskyld þyngd " + E(fx(r.kgAll, 1)) + " kg – flutningi dreift " + (r.allKg ? "eftir þyngd" : "eftir verði (vantar þyngd á sumar línur)") : "Flutningi dreift eftir verði – skráðu kg eða mál á línur (▾) til að dreifa eftir þyngd."}</p>` : ""}
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
      if (["flutn", "vatr", "tollsk", "alag", "flutnP"].includes(p[2])) s[p[2]] = val === "" ? "" : num(val); else s[p[2]] = val;
      if (["birgir", "flutnP", "flutnH"].includes(p[2])) delete s.fz;
      if (["hopur", "lysing"].includes(p[2])) return;   // texti – ekki teikna aftur
      if (p[2] === "birgir" && e.type === "change") { const b = birgir(val); if (b) { s.mynt = b.mynt || s.mynt; s.utan = !!b.utan; } }
      if (p[2] === "mynt" && s.flutnM !== "ISK") s.flutnM = val; }
    else if (p[0] === "l") { const l = ink.s[+p[1]]?.linur[+p[2]]; if (!l) return; const k = p[3];
      if (k === "hopur") { l.hopur = val; return; }
      if (k === "heiti" || k === "bnr") { l[k] = val; if (k === "heiti" && e.type === "change") { const v = VR().find(x => x.heiti === val); l.v = v ? v.id : null; if (v) { if (!l.bnr && v.fnr) l.bnr = v.fnr; if (!l.kg && v.kg) l.kg = v.kg; if (l.agj === "" && v.agj != null) l.agj = v.agj; } } }
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
    ink.s.forEach(s => { s.linur = s.linur.filter(l => l.heiti || +l.verd); if (!s.fz) s.fz = upplausn(s); });
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
  const raunS = s => { const t = s.ts; if (!t) return null; return (+t.tollverd || 0) + (+t.gjold || 0) + (+t.utan || 0) + (+t.midlun || 0) + (+t.innlent || 0); };
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
  function tollskyrsla(T, s) {
    const R = reikna(T.ink), r = R.send.find(x => x.s.id === s.id), t = s.ts || {}, C = CFG();
    const pre = { nr: t.nr || "", dags: t.dags || new Date().toISOString().slice(0, 10), gengi: t.gengi ?? (r?.g || ""), tollverd: t.tollverd ?? "", gjold: t.gjold ?? "", vsk: t.vsk ?? "", utan: t.utan ?? (s.utan ? "" : 0), flutn: t.flutn ?? "", midlun: t.midlun ?? "", innlent: t.innlent ?? "" };
    const f = (k, l, ph) => `<label>${l}<input id="ikts-${k}" inputmode="${k === "nr" ? "text" : k === "dags" ? "text" : "decimal"}" ${k === "dags" ? 'type="date"' : ""} value="${E(pre[k] === "" || pre[k] == null ? "" : String(pre[k]).replace(".", ","))}" placeholder="${E(ph || "")}"></label>`;
    const { w, close } = modal("Tollskýrsla · " + (s.birgir || ""), `<p class="pfhint">Skráðu tölurnar af tollskýrslunni og reikningi flutningsmiðlara. Raunkostnaðurinn er borinn saman við áætlunina á tilboðinu (${E(kr(r?.sum.kostn || 0))}).</p>
      <div class="ikg3">${f("nr", "Tollskýrslunúmer", "")}${f("dags", "Dagsetning", "")}${f("gengi", "Tollgengi " + E(s.mynt), r?.g ? fx(r.g, 2) : "")}</div>
      <div class="ikg3">${f("tollverd", "Tollverð (kr.)", r ? String(Math.round(r.sum.tollverd)) : "")}${f("gjold", "Aðflutningsgjöld önnur en VSK (kr.)", r ? String(Math.round(r.sum.agj)) : "")}${f("vsk", "VSK við komu (kr.)", r ? String(Math.round(r.sum.vsk)) : "")}</div>
      <div class="ikg3">${f("flutn", "Flutningur og vátrygging (kr.)", "")}<label style="grid-column:span 2;font-size:12px;color:var(--muted);align-self:end" id="ikts-fh"></label></div>
      <div class="ikg3">${f("utan", "Gjald utan Evrópu (kr.)", r ? String(Math.round(r.sum.utan)) : "")}${f("midlun", "Tollskýrslugerð / miðlun (kr.)", String(r ? Math.round(r.sum.tollsk) : C.tollsk))}${f("innlent", "Akstur innanlands o.fl. (kr.)", "0")}</div>
      <div class="pfhint" id="ikts-sum"></div>
      <div class="pfact"><button type="button" class="btn" data-x="1">Hætta við</button><button type="button" class="btn primary" id="ikts-ok">Vista tollskýrslu</button></div>`);
    const val = k => { const el = w.querySelector("#ikts-" + k); if (!el) return ""; if (k === "nr" || k === "dags") return el.value.trim(); return el.value.trim() === "" ? (k === "utan" || k === "innlent" ? 0 : num(el.placeholder)) : num(el.value); };
    const kaupM = kaupMyntS(s), flPh = () => Math.max(0, Math.round(val("tollverd") - kaupM * (s.mynt === "ISK" ? 1 : val("gengi")))), flEl = w.querySelector("#ikts-flutn");
    const upd = () => { flEl.placeholder = String(flPh()); const fl = val("flutn"), kISK = kaupM * (s.mynt === "ISK" ? 1 : val("gengi"));
      w.querySelector("#ikts-fh").textContent = kISK ? `Tollverð − kaupverð = ${kr(flPh())} · flutningur var ${fx(fl / kISK * 100, 1)} % af kaupverði (áætlað ${fx(r && r.sum.kaup ? r.flutnISK / r.sum.kaup * 100 : 0, 1)} %) – fer í reynslu birgisins.` : "";
      const raun = val("tollverd") + val("gjold") + val("utan") + val("midlun") + val("innlent"), d = raun - (r?.sum.kostn || 0);
      w.querySelector("#ikts-sum").innerHTML = `Raunkostnaður <b>${E(kr(raun))}</b> · áætlað ${E(kr(r?.sum.kostn || 0))} · frávik <b style="color:${d > 0 ? "#b4462f" : "#1d7a4f"}">${d > 0 ? "+" : ""}${E(kr(d))}</b> · tómir reitir nota áætlunina.`; };
    w.addEventListener("input", upd); upd();
    w.querySelector("#ikts-ok").onclick = async () => { const ts = { nr: val("nr"), dags: val("dags"), gengi: val("gengi"), tollverd: val("tollverd"), gjold: val("gjold"), vsk: val("vsk"), utan: val("utan"), flutn: val("flutn"), midlun: val("midlun"), innlent: val("innlent"), af: tr(() => ME(), ""), skrad: new Date().toISOString() };
      await saveDoc(T.id, q => { const x = (q.ink?.s || []).find(y => y.id === s.id); if (x) { x.ts = ts; x.stada = "komid"; x.komid = x.komid || ts.dags; } }).catch(e => toast?.("Vistaðist ekki: " + (e?.message || e)));
      close(); toast?.("Tollskýrsla skráð"); render(); };
  }
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
  function settingsHTML() {
    const C = CFG(), g = C.gengi;
    return `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px"><p class="hint" style="margin:0">Sjálfgefin gildi í reikninum „Reikna úr verðum birgja“. Öllu má breyta á hverri sendingu og línu.</p>
      <div class="two"><label>Álagning (%)<input id="ikc-alag" inputmode="decimal" value="${E(fx(C.alag, 1))}"></label><label>Gjald utan Evrópu (% af tollverði)<input id="ikc-utanP" inputmode="decimal" value="${E(fx(C.utanP, 2))}"></label></div>
      <div class="two"><label>Tollskýrslugerð á sendingu (kr.)<input id="ikc-tollsk" inputmode="numeric" value="${E(String(C.tollsk))}"></label><label>Aukagjöld, áætluð (% af tollverði)<input id="ikc-agj" inputmode="decimal" value="${E(fx(C.agj, 2))}"></label></div>
      <div class="two"><label>Flutningur, áætlaður (% af kaupverði)<input id="ikc-flutnP" inputmode="decimal" value="${E(fx(C.flutnP, 1))}"></label><label>Námunda söluverð upp í næstu (kr.)<input id="ikc-namun" inputmode="numeric" value="${E(String(C.namun))}"></label></div>
      <p class="hint" style="margin:0">Flutningur og aukagjöld lærast af skráðum tollskýrslum: meðaltal síðustu 5 sendinga frá hverjum birgi kemur í stað sjálfgefnu talnanna.</p>
      <button type="button" class="btn primary" onclick="window.innflVistaStill&&innflVistaStill()">Vista</button></div>
      <div class="viewtitle">Birgjar</div><div class="card" style="padding:12px 16px">${C.birgjar.length ? C.birgjar.map((b, i) => `<div class="two" style="grid-template-columns:2fr 1fr 1fr 1fr 1fr auto;align-items:end;margin-bottom:8px"><label>Nafn<input data-ikb="${i}:nafn" value="${E(b.nafn)}"></label><label>Mynt<select data-ikb="${i}:mynt">${["ISK", ...MYNTIR].map(m => `<option${m === b.mynt ? " selected" : ""}>${m}</option>`).join("")}</select></label><label>Álagning %<input data-ikb="${i}:alag" inputmode="decimal" value="${E(b.alag === "" || b.alag == null ? "" : fx(b.alag, 1))}" placeholder="${E(fx(C.alag, 1))}"></label><label>Flutningur %<input data-ikb="${i}:flutnP" inputmode="decimal" value="${E(tom(b.flutnP) ? "" : fx(b.flutnP, 1))}" placeholder="${(() => { const R = reynsla(b.nafn); return E(R.n ? fx(R.flutnP, 1) + " (reynsla)" : fx(C.flutnP, 1)); })()}"></label><label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" data-ikb="${i}:utan"${b.utan ? " checked" : ""}> Utan Evrópu</label><button type="button" class="btn" onclick="innflEydaBirgi(${i})">Eyða</button></div>`).join("") : `<p class="hint">Birgjar bætast hér við sjálfkrafa þegar þeir eru notaðir í reikninum.</p>`}
      <button type="button" class="btn" onclick="innflNyrBirgir()">+ Birgir</button></div>
      <div class="viewtitle">Tollgengi</div><div class="card" style="padding:12px 16px"><p class="hint" style="margin:0 0 8px">${g && g.k ? `Síðast sótt ${E(String(g.sott || g.dags || "").slice(0, 10).split("-").reverse().join("."))} (${E(g.src || "")}): ` + Object.entries(g.k).filter(([m]) => ["EUR", "USD", "GBP", "DKK", "SEK", "NOK"].includes(m)).map(([m, v]) => E(m) + " " + E(fx(v, 2))).join(" · ") : "Ekki sótt enn."} Tollafgreiðslugengi Skattsins (skráð á mánudögum, gildir frá þriðjudegi).</p><button type="button" class="btn" onclick="innflSaekjaGengi()">Sækja tollgengi</button></div>`;
  }
  window.innflVistaStill = async () => { const v = k => document.getElementById("ikc-" + k)?.value;
    await saveCfg(c => { c.alag = num(v("alag")); c.utanP = num(v("utanP")); c.tollsk = Math.round(num(v("tollsk"))); c.agj = num(v("agj")); c.namun = Math.max(1, Math.round(num(v("namun")))); c.flutnP = num(v("flutnP")); }); toast?.("Stillingar innflutnings vistaðar"); render(); };
  document.addEventListener("change", e => { const k = e.target?.dataset?.ikb; if (!k) return; const [i, f] = k.split(":"); const val = e.target.type === "checkbox" ? e.target.checked : f === "alag" || f === "flutnP" ? (e.target.value.trim() === "" ? "" : num(e.target.value)) : e.target.value;
    saveCfg(c => { const b = (c.birgjar || [])[+i]; if (b) b[f] = val; }).then(() => toast?.("Birgir uppfærður")); });
  window.innflNyrBirgir = () => saveCfg(c => { c.birgjar = (c.birgjar || []).concat([{ id: uid(), nafn: "Nýr birgir", mynt: "EUR", utan: false, alag: "" }]); }).then(render);
  window.innflEydaBirgi = i => saveCfg(c => { (c.birgjar || []).splice(i, 1); }).then(render);
  window.innflSaekjaGengi = async () => { const g = await gengiNu(true); toast?.(g ? "Tollgengi sótt" : "Náði ekki í tollgengið – það má slá það inn í reikninum"); render(); };
  const addPage = () => { if (typeof STPAGES === "undefined") return false; STPAGES.innfl = { l: "Innflutningur", d: "Álagning, gjöld, birgjar og tollgengi fyrir tilboð úr verðum birgja", s: ["Innflutningur", "Álagning", "Birgjar", "Tollgengi", "Tollskýrslugerð"], adm: 1, fn: () => settingsHTML() }; return true; };
  if (!addPage()) { const iv = setInterval(() => { if (addPage()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }

  /* ---------- Sýnidæmi (aðeins í sýniútgáfu): tilboð og pöntun hljóðkerfis úr verðum tveggja erlendra birgja ---------- */
  function demoData() {
    if (!window.AERA_DEMO || !on()) return true; let s0 = null; try { s0 = S; } catch (e) {} if (!s0 || !s0.tilbod || !s0.pantanir) return false;
    if (s0.tilbod.some(T => T.ink) || s0.pantanir.some(P => P.ink)) return true;
    const iso = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    const kap = VR().find(v => /Hátalarakapall/.test(v.heiti || "")), vsk = (s0.vidskiptavinir || [])[0];
    const ink = { dags: new Date().toISOString(), gengi: { k: { ...DEMO_GENGI }, dags: iso(-1), src: "sýnigengi" }, s: [
      { id: "dS1", birgir: "Klangwerk GmbH", mynt: "EUR", utan: false, flutnH: "pct", flutn: "", flutnM: "ISK", vatr: "", tollsk: "", alag: "", fz: { flutnP: 9.2, flutnSrc: "reynsla, 3 sendingar", agjP: 0.8, agjSrc: "reynsla, 3 sendingar" }, linur: [
        nyLina({ k: "dL1", heiti: "Loftahátalari 8\" (hvítur)", bnr: "KW-C8W", magn: 12, verd: 112, kg: 3.2, agj: 0.8, hopur: "Hátalarar" }),
        nyLina({ k: "dL2", heiti: "Magnari 4 × 120 W", bnr: "KW-A4120", magn: 2, verd: 640, kg: 9.5, l: 46, b: 44, h: 12, agj: 0.8, hopur: "Magnarar og stýring" }),
        nyLina({ k: "dL3", heiti: "Veggstjórnborð með hljóðstyrk", bnr: "KW-WP2", magn: 2, verd: 85, kg: 0.4, agj: 0.8, hopur: "Magnarar og stýring" }) ] },
      { id: "dS2", birgir: "Pro AV Supply Inc.", mynt: "USD", utan: true, flutnH: "upph", flutn: 420, flutnM: "USD", vatr: 30, tollsk: "", alag: 35, fz: { flutnP: 10, flutnSrc: "sjálfgefið", agjP: 0.8, agjSrc: "sjálfgefið" }, linur: [
        nyLina({ k: "dL4", heiti: "Þráðlaust hljóðnemakerfi (2 rása)", bnr: "PAV-WM2", magn: 2, verd: 1150, kg: 4.2, agj: 0.8, hopur: "Hljóðnemar" }) ] } ] };
    const R = reikna(ink), lin = [];
    R.send.forEach(r => r.lines.forEach(x => lin.push({ id: uid(), v: null, heiti: x.l.heiti, teg: "sala", hl: x.l.hopur || "Vörur", magn: x.m, ein: "stk.", verd: Math.round(x.sv), dagar: null, afsl: 0, ik: { k: x.l.k, s: r.s.id, kostn: Math.round(x.kstk) } })));
    if (kap) lin.push({ id: uid(), v: kap.id, heiti: kap.heiti, teg: "sala", hl: "Uppsetningarefni", magn: 120, ein: kap.eining || "m", verd: +kap.soluverd || 690, dagar: null, afsl: 0 });
    const base = { deild: "sala", vskId: vsk?.id || null, vidskiptavinur: "Hótel Hekla", tengilidur: "Anna Guðmundsdóttir", netfang: "anna@hotelhekla.example", stadsetning: "Hótel Hekla, fundarsalur", afsl: 0, athugasemd: "Sýnidæmi: verð frá tveimur erlendum birgjum reiknuð í Innflutningi", prufa: true };
    const T = { ...base, id: "ikdemoT", nr: "S-0950", heiti: "Hljóðkerfi í fundarsal", dags: iso(-6), fra: iso(12), stada: "Samþykkt", sent: iso(-5), utgafa: 1, eldri: [], linur: lin, ink: structuredClone(ink) };
    const ink2 = structuredClone(ink), e1 = R.send[0].sum;
    ink2.s[0].stada = "komid"; ink2.s[0].pantad = iso(-4) + "T10:00:00Z"; ink2.s[0].komid = iso(-1);
    ink2.s[0].ts = { nr: "TS-2026-04417", dags: iso(-1), gengi: 137.2, tollverd: Math.round(e1.tollverd * 1.006 + 14800), gjold: Math.round(e1.agj + 2600), vsk: Math.round((e1.tollverd * 1.006 + 14800 + e1.agj + 2600) * 0.24), utan: 0, midlun: 19900, innlent: 6500, af: "JJ", skrad: iso(-1) };
    ink2.s[1].stada = "pantad"; ink2.s[1].pantad = iso(-3) + "T14:00:00Z";
    const P = { ...base, id: "ikdemoP", pontun: true, nr: "P-0950", deild: "blandad", heiti: "Hljóðkerfi í fundarsal", uppruni: "tilbod", ytriNr: null, dags: iso(-4), fra: iso(12), til: iso(12), stada: "Staðfest", starfsmenn: [], linur: lin.map(l => ({ ...l, id: uid() })), tilbodId: "ikdemoT", ink: ink2 };
    // Saga: þrjár eldri sendingar frá Klangwerk með tollskýrslu (flutningur 8,6 / 9,4 / 9,6 % af kaupverði) – grunnur reynslunnar
    const saga = [[-95, "P-0861", "Hátalarar í verslun", 6, 112, 8.6], [-60, "P-0893", "Fundarherbergi", 4, 640, 9.4], [-28, "P-0917", "Veitingastaður – hljóð", 10, 98, 9.6]].map(([d, nr, h, m, v, fp], i) => {
      const g = 135.8 + i * 0.4, kaup = m * v * g, tv = Math.round(kaup * (1 + fp / 100)), gj = Math.round(tv * 0.008);
      return { ...base, id: "ikdemoH" + i, pontun: true, nr, deild: "blandad", heiti: h, vidskiptavinur: ["Verslunin Hljómur", "Lögmenn Laugavegi", "Kaffihús Hafnar"][i], tengilidur: null, netfang: null, uppruni: "tilbod", dags: iso(d), fra: iso(d + 14), til: iso(d + 14), stada: "Lokið", starfsmenn: [], athugasemd: null,
        linur: [{ id: uid(), v: null, heiti: ["Loftahátalari 8\" (hvítur)", "Magnari 4 × 120 W", "Loftahátalari 6,5\""][i], teg: "sala", hl: "Vörur", magn: m, ein: "stk.", verd: Math.round(v * g * 1.45 / 10) * 10, dagar: null, afsl: 0 }],
        ink: { gengi: { k: { EUR: g }, dags: iso(d), src: "tollgengi" }, s: [{ id: "dH" + i, birgir: "Klangwerk GmbH", mynt: "EUR", utan: false, flutnH: "pct", linur: [nyLina({ k: "dHL" + i, heiti: "Vara", magn: m, verd: v })], stada: "komid", pantad: iso(d), komid: iso(d + 10),
          ts: { nr: "TS-2026-0" + (3100 + i * 211), dags: iso(d + 10), gengi: g, tollverd: tv, gjold: gj, vsk: Math.round((tv + gj) * 0.24), utan: 0, flutn: Math.round(kaup * fp / 100), midlun: 17500, innlent: 0, af: "JJ", skrad: iso(d + 10) } }] } }; });
    saveSnapshot(s => { s.tilbod = s.tilbod || []; s.pantanir = s.pantanir || []; if (!s.tilbod.some(x => x.id === "ikdemoT")) s.tilbod.push(T); if (!s.pantanir.some(x => x.id === "ikdemoP")) s.pantanir.push(P);
      saga.forEach(H => { if (!s.pantanir.some(x => x.id === H.id)) s.pantanir.push(H); });
      s.stillingar = s.stillingar || {}; s.stillingar.innflutningur = { ...CFG(), ...(s.stillingar.innflutningur || {}), birgjar: [{ id: "dB1", nafn: "Klangwerk GmbH", mynt: "EUR", utan: false, alag: "" }, { id: "dB2", nafn: "Pro AV Supply Inc.", mynt: "USD", utan: true, alag: 35 }] }; }).catch(() => {});
    return true;
  }
  if (window.AERA_DEMO) { const iv = setInterval(() => { if (demoData()) clearInterval(iv); }, 500); setTimeout(() => clearInterval(iv), 20000); }

  window.innflAPI = { reikna, framlegd, samanburdur, CFG };
})();
