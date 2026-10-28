/* Reikningar: reikningsfæra tímavinnu og útlagðan kostnað (eitt eða fleiri verkefni á sama reikning),
   forskoða, búa til PDF (skjalagerd.js) og Excel, vista PDF í OneDrive: AERA/Stofa/Reikningar/<ár>/.
   Gögn: S.reikningar[], S.stillingar.reikn{}, verkefni.timagjald, færsla.reikningur / kostnaður.reikningur = id reiknings. */
(function () {
  const NONE = "_"; // lykill fyrir tíma/kostnað án verkefnis
  const RK = () => ({ nafn: ORG.nafn, kt: "", heimilisfang: "", vsknr: "", banki: "", netfang: "", simi: "", vsk: window.VERD && !VERD().vskSkra ? 0 : 24, frestur: 14, nastaNr: 1001, timagjald: 0, ...(CFG().reikn || {}) });
  const reikningar = () => S?.reikningar || [];
  /* Bókhaldsflokkar (2.90.0): hver lína á reikningi fær flokk, VSK % og tekjulykil – sameiginlegur grunnur fyrir tengingu við Payday eða DK.
     Stillingar: S.stillingar.reikn.flokkar = { leiga|sala|vinna|kostn|auka: { vsk, lykill } }; vsk vantar = VSK fyrirtækisins. */
  const FLOKKAR = [["vinna", "Vinna og þjónusta"], ["leiga", "Leiga"], ["sala", "Sala á vörum"], ["auka", "Aukagjöld (seinkun, týnt, skemmt)"], ["kostn", "Útlagður kostnaður"]];
  const flk = k => { const f = (RK().flokkar || {})[k] || {}; return { vsk: f.vsk === "" || f.vsk == null ? (+RK().vsk || 0) : +f.vsk, lykill: f.lykill || "" }; };
  const tagL = (l, k) => { const f = flk(k); return { ...l, flokkur: k, vsk: f.vsk, lykill: f.lykill }; };
  const ktOK = k => /^\d{6}-?\d{4}$/.test(String(k || "").trim());
  const findR = id => reikningar().find(r => r.id === id);
  const pidsOf = R => R.verkefniIds || (R.verkefniId ? [R.verkefniId] : []);
  const rate = p => +(p?.timagjald || (window.rateOf ? rateOf(p) : 0) || RK().timagjald || 0); // verðskrá (verdskra.js)
  const addDays = (iso, n) => { const x = d(iso); x.setDate(x.getDate() + n); return isoDay(x); };
  const kaupandi = p => findVsk(p?.vskId) || findVsk(p?.vkId) || null; // greiðandi = viðskiptavinur (verkkaupi aflagður 1.4.0)
  const fx = n => String(n).replace(".", ",");
  const keyOf = x => x.verkefniId || NONE;
  /* Innheimtuháttur verkefnis (2.42.0): timar = tímavinna (tímar × tímagjald rukkaðir); tilbod = fast verð skv. tilboði/pöntun (tímar til yfirsýnar);
     ekki = ekki rukkað. p.innheimta ræður; annars sjálfgefið: í útliti I fær verkefni með búnaði/vörum á tilboði eða pöntun „tilbod“, annars tímavinna.
     Utan útlits I er sjálfgefið tímavinna (óbreytt hegðun). */
  const INNH = { timar: "Tímavinna – rukkað eftir unnum tímum", tilbod: "Fast verð – rukkað skv. tilboði eða pöntun", ekki: "Ekki rukkað" };
  window.INNH = INNH;
  window.innheimtaOf = p => { if (!p) return window.ORG?.utlit === "I" ? "ekki" : "timar"; /* tímar án verkefnis = Innra */ if (INNH[p.innheimta]) return p.innheimta; if (window.ORG?.utlit !== "I") return "timar";
    const api = window.salaAPI; if (["leiga", "sala"].includes(p.deild)) return "tilbod";
    if (api) { const docs = [...api.TB(), ...api.PN()].filter(T => T.verkefniId === p.id || T.id === p.tilbodId || T.id === p.pontunId); if (docs.some(T => T.stada !== "Hafnað" && (T.linur || []).some(l => l.teg !== "vinna"))) return "tilbod"; }
    return INNH[CFG().innheimta] ? CFG().innheimta : "timar"; };
  // Á færsla að fara á reikning? Tímavinna: já nema merkt „ekki rukka“; fast verð / ekki rukkað: aðeins ef merkt sem aukavinna (e.rukka)
  // 2.66.0: tímar af ógiltum reikningi eru alltaf reikningshæfir aftur – þeir voru rukkaðir einu sinni, óháð innheimtuhætti verkefnisins
  let _ogK = null, _ogT = new Set();
  const ogiltirTimar = () => { const og = reikningar().filter(r => r.stada === "Ógilt"), k = og.map(r => r.id + ":" + (r.timaIds || []).length).join(); if (k !== _ogK) { _ogK = k; _ogT = new Set(og.flatMap(r => r.timaIds || []).map(String)); } return _ogT; };
  window.timiRukka = e => { if (!e || e.reikningur) return false; if (e.vett && !e.stadfest) return false; /* 2.100.0: óstaðfestir vettvangstímar */ if (e.id && ogiltirTimar().has(String(e.id))) return true; const p = e.verkefniId ? findProj(e.verkefniId) : null; return window.innheimtaOf(p) === "timar" ? !e.ekkiRk : e.rukka === true; };
  const obilled = pid => ({ es: faerslur().filter(e => keyOf(e) === (pid || NONE) && !e.reikningur && window.timiRukka(e) && e.id && !isTmp(e.id)), ks: kostn().filter(k => keyOf(k) === (pid || NONE) && !k.reikningur) });
  // Öll verkefni (og „án verkefnis“) sem eiga eitthvað óreikningsfært
  const openGroups = () => [...verkefni().map(p => p.id), NONE].map(k => ({ k, p: k === NONE ? null : findProj(k), ...obilled(k === NONE ? null : k) })).filter(g => g.es.length || g.ks.length);
  window.rkUnbilled = obilled;
  // Krónur fyrir tímafærslur: hver færsla með gjaldi eigin þjónustu eða gjaldi verkefnisins (projRate)
  const esKr = (es, projRate) => es.reduce((a, e) => a + (+e.timar || 0) * (window.entryRate ? entryRate(e, projRate) : projRate), 0);
  window.rkUnbilledKr = pid => { const u = obilled(pid), p = pid ? findProj(pid) : null; return esKr(u.es, rate(p)) + sumK(u.ks); };
  /* Óinnheimt (frá 1.6.0): óreikningsfærðir tímar × tímagjald + óreikningsfærður kostnaður, auk ógreiddra reikninga (með VSK) */
  window.rkOinnheimt = () => {
    const gs = openGroups().map(g => ({ ...g, h: sumT(g.es), kr: esKr(g.es, rate(g.p)) + sumK(g.ks) })).sort((a, b) => b.kr - a.kr);
    const og = reikningar().filter(r => r.stada !== "Greitt" && r.stada !== "Ógilt"), late = og.filter(r => r.gjalddagi && daysTo(r.gjalddagi) < 0);
    const sum = xs => xs.reduce((a, r) => a + (+r.tot || 0), 0), pn = ordersToBill(), pnKr = pn.reduce((a, P) => a + pnNet(P), 0), ub = gs.reduce((a, g) => a + g.kr, 0) + pnKr;
    return { gs, ub, og, ogKr: sum(og), late, lateKr: sum(late), tot: ub + sum(og), h: gs.reduce((a, g) => a + g.h, 0), pn, pnKr };
  };
  window.rkOinnheimtCard = (full) => {
    const o = rkOinnheimt(); if (!o.tot && !full) return "";
    return `<div class="chart"><div class="chh4"><b>Óinnheimt</b><span>${esc(kr(o.tot))} alls</span></div>
      <div class="chkpi"><a class="tap" data-act="tab:trk"><b>${esc(kr(o.ub))}</b><span>óreikningsfært · ${esc(num(Math.round(o.h * 10) / 10))} klst.${o.pn.length ? " · " + o.pn.length + (o.pn.length === 1 ? " pöntun" : " pantanir") : ""}</span></a><a class="tap" data-act="tab:trk"><b>${esc(kr(o.ogKr))}</b><span>ógreiddir reikningar · ${o.og.length}</span></a>${o.late.length ? `<a class="tap late" data-act="tab:trk"><b>${esc(kr(o.lateKr))}</b><span>fram yfir gjalddaga</span></a>` : ""}</div>
      ${o.gs.length ? `<div class="chh" style="margin-top:12px">${o.gs.slice(0, full ? 50 : 5).map(g => { const mx = o.gs[0].kr || 1; return `<a class="chr tap" ${g.p ? `data-open="verk:${esc(g.p.id)}"` : `data-act="tab:trk"`}><span class="chrl">${g.p ? `<span class="nr">${esc(g.p.nr)}</span> ${esc(g.p.stutt || "")}` : "Almennt"}</span><span class="chrb"><i style="width:${Math.max(2, Math.round(g.kr / mx * 100))}%"></i></span><span class="chrv">${esc(kr(g.kr))}</span></a>`; }).join("")}</div>` : ""}
      <p class="hint" style="margin:10px 0 0">Óreikningsfært er reiknað með tímagjaldi úr verðskrá, án VSK. Ógreiddir reikningar eru með VSK.</p></div>`;
  };
  window.rkFind = findR; window.rkVidbunadur = id => { const R = findR(id); return R ? vidbunadur(R) : []; };

  /* ---------- Reikningar úr pöntunum (2.89.0) ----------
     Pöntun viðskiptavinar í reikningi (ekki staðgreiðslu) sem hefur verið afhent fær reikning beint úr línunum sínum
     (leiga, sala, þjónusta, aukagjöld úr skilauppgjöri, afsláttur). R.pontunIds tengir; P.reikningur = id reiknings. */
  const PNs = () => (window.salaAPI?.PN?.() || []);
  const hattur = P => { const c = P.vskId ? findVsk(P.vskId) : null; return P.greidsluhattur || (c ? (c.greidsla || "reikningur") : "stadgreitt"); };
  // Í reikningi: afhent og ógreitt. Staðgreitt (2.91.0): greitt á pöntun – reikningur (kvittun) þarf samt að fara í bókhald.
  const pnStadg = P => !!P?.greitt && hattur(P) === "stadgreitt";
  const pnBillable = P => P && P.pontun !== false && !P.reikningur && (P.linur || []).length && P.stada !== "Hafnað" && (pnStadg(P) || (!P.greitt && hattur(P) === "reikningur" && ["Afhent", "Skilað", "Lokið"].includes(P.stada)));
  const ordersToBill = () => PNs().filter(pnBillable).sort((a, b) => String(a.fra || a.dags || "").localeCompare(String(b.fra || b.dags || "")));
  const pnNet = P => { try { return window.salaAPI.totals(P).net; } catch (e) { return 0; } };
  window.rkOrders = ordersToBill; window.rkPnBillable = pnBillable; window.rkPnStadg = pnStadg;
  function orderLines(Ps) {
    const multi = Ps.length > 1, L = [], A = window.salaAPI;
    Ps.forEach(P => {
      const pre = multi ? P.nr + " · " : "", d0 = P.fra ? dIS(P.fra) + (P.til && P.til !== P.fra ? "–" + dIS(P.til) : "") : "";
      const af = +P.afsl || 0;
      if (multi || d0 || af) L.push({ lysing: (multi ? P.nr + " " : "Pöntun " + P.nr + " ") + (P.heiti && P.heiti !== "Pöntun" ? "– " + P.heiti + " " : "") + (d0 ? "(" + d0 + ")" : "") + (af ? " · " + fx(af) + " % afsláttur innifalinn" : ""), magn: 0, eining: "", verd: 0, haus: true });
      // Afsláttur pöntunar er felldur inn í hverja línu (svo VSK-flokkar haldist réttir)
      (P.linur || []).forEach(l => { const amt = Math.round(A.lSum(l, P) * (1 - af / 100)), m = +l.magn || 0; if (!amt && !m) return;
        const k = l.aukagjald ? "auka" : ["leiga", "sala", "vinna"].includes(l.teg) ? l.teg : "sala";
        const lys = pre + (l.heiti || "") + (l.teg === "leiga" ? " – leiga" : "");
        if (m && Math.abs(Math.round(amt / m) * m - amt) < 1) L.push(tagL({ lysing: lys, magn: m, eining: l.ein || "stk.", verd: Math.round(amt / m) }, k));
        else L.push(tagL({ lysing: lys + (m ? ` (${fx(m)} ${l.ein || "stk."})` : ""), magn: 1, eining: "", verd: amt }, k)); });
    });
    return L;
  }
  function modal(title, html) {
    const w = document.createElement("div"); w.className = "qrcard pfm rkpm"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true");
    w.innerHTML = `<div class="qrscrim" data-x="1"></div><div class="qrsheet pfs"><div class="grab" aria-hidden="true"></div><div class="pfh"><h2>${esc(title)}</h2><button type="button" class="qrx" data-x="1" aria-label="Loka">✕</button></div>${html}</div>`;
    document.body.append(w); document.body.classList.add("qropen");
    const close = () => { w.remove(); document.body.classList.remove("qropen"); };
    w.addEventListener("click", e => { if (e.target.closest("[data-x]")) close(); }); w.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    return { w, close };
  }
  // Gluggi: velja pantanir sama viðskiptavinar → reikningur
  function billOrders(pid0) {
    const P0 = PNs().find(x => x.id === pid0); if (!P0) return;
    if (!pnBillable(P0)) return toast(P0.reikningur ? "Pöntunin er þegar á reikningi." : hattur(P0) !== "reikningur" ? "Pöntunin er í staðgreiðslu – skráðu greiðslu á pöntunina." : "Pöntunin þarf að vera afhent áður en reikningur er gerður.");
    if (!P0.vskId && !pnStadg(P0)) return toast("Veldu viðskiptavin á pöntunina fyrst.");
    if (P0.vskId && !pnStadg(P0) && !ktOK(findVsk(P0.vskId)?.kennitala)) { toast(`Kennitölu vantar á ${findVsk(P0.vskId)?.name || "viðskiptavininn"} – skráðu hana fyrst.`); try { openDetail("vsk:" + P0.vskId); } catch (e) {} return; }
    const xs = P0.vskId ? ordersToBill().filter(x => x.vskId === P0.vskId && pnStadg(x) === pnStadg(P0)) : [P0], rk = RK(), c = P0.vskId ? findVsk(P0.vskId) : null;
    const st0 = pnStadg(P0);
    const { w, close } = modal("Reikningur · " + (c?.name || P0.tengilidur || "Staðgreiðsla"), `
      ${st0 ? `<p class="pfhint" style="margin:0 0 8px">Staðgreitt – greiðslan er skráð á pöntunina. Reikningurinn (kvittun) er búinn til sem <b>greiddur</b> og fer í bókhaldið eins og aðrir.${c && !ktOK(c.kennitala) ? " Kennitölu vantar á viðskiptavininn – hún er valfrjáls fyrir staðgreiðslu." : ""}</p>` : ""}
      ${xs.length > 1 ? `<p class="pfhint" style="margin:0 0 8px">Fleiri afhentar pantanir þessa viðskiptavinar eru án reiknings – hakaðu við þær sem eiga að fara á sama reikning.</p>` : ""}
      <div class="rkpl">${xs.map(x => `<label class="rkpr"><input type="checkbox" value="${esc(x.id)}"${x.id === pid0 ? " checked" : ""}><span><b>${esc(x.nr)}</b> ${esc(x.heiti && x.heiti !== "Pöntun" ? x.heiti : "")}<small>${esc([x.fra ? dIS(x.fra) : "", x.stada].filter(Boolean).join(" · "))}</small></span><b>${esc(kr(pnNet(x)))}</b></label>`).join("")}</div>
      <div class="two" style="margin-top:12px"><label>Reikningsdagur<input id="rkp-d" type="date" value="${isoDay(today)}"></label><label>Gjalddagi<input id="rkp-g" type="date" value="${addDays(isoDay(today), +rk.frestur || 14)}"></label></div>
      <label>${DROG() ? "Númer draga" : "Reikningsnúmer"}<input id="rkp-n" inputmode="numeric" value="${esc(String(rk.nastaNr))}"></label>
      <div class="rkpsum"></div>
      <div class="pfact"><button type="button" class="btn rkp-ut" title="T.d. eldri pöntun sem var reikningsfærð beint í bókhaldskerfinu">Reikningsfært annars staðar</button><button type="button" class="btn" data-x="1">Hætta við</button><button type="button" class="btn primary" id="rkp-ok">Búa til ${DROG() ? "reikningsdrög" : "reikning"}</button></div>`);
    const picked = () => [...w.querySelectorAll(".rkpl input:checked")].map(i => xs.find(x => x.id === i.value)).filter(Boolean);
    const upd = () => { const L = orderLines(picked()), t = totals(L, +rk.vsk || 0); w.querySelector(".rkpsum").innerHTML = `<div class="sub-i"><span>Án VSK</span><b>${esc(kr(t.net))}</b></div>${t.vskSund.map(x => `<div class="sub-i"><span>VSK ${esc(fx(x.p))} %${t.vskSund.length > 1 ? " af " + esc(kr(x.net)) : ""}</span><b>${esc(kr(x.vsk))}</b></div>`).join("")}<div class="sub-i" style="font-size:16px"><span>Samtals</span><b>${esc(kr(t.tot))}</b></div>`; };
    w.addEventListener("change", upd); upd();
    w.querySelector(".rkp-ut").onclick = async () => { const Ps = picked(); if (!Ps.length) return toast("Veldu pöntun.");
      if (!confirm(`Merkja ${Ps.map(x => x.nr).join(", ")} sem reikningsfært utan Atrium? Þá birtist ${Ps.length === 1 ? "hún" : "þær"} ekki lengur sem óreikningsfært.`)) return;
      const ids = new Set(Ps.map(x => x.id)); await saveSnapshot(st => { (st.pantanir || []).forEach(q => { if (ids.has(q.id)) q.reikningur = "utan"; }); }); close(); toast("Merkt reikningsfært utan Atrium"); render(); };
    w.querySelector("#rkp-ok").onclick = async () => {
      const Ps = picked(), nr = parseInt(w.querySelector("#rkp-n").value) || 0; if (!Ps.length) return toast("Veldu pöntun."); if (!nr) return toast("Skráðu númer.");
      if (reikningar().some(r => r.nr === nr) && !confirm(`Reikningur nr. ${nr} er þegar til. Nota samt sama númer?`)) return;
      const L = orderLines(Ps), vskP = +rk.vsk || 0, sl = { ...rk }; delete sl.nastaNr; delete sl.timagjald;
      const pids = [...new Set(Ps.map(x => x.verkefniId).filter(Boolean))], ids = new Set(Ps.map(x => x.id));
      const R = { id: newId(), nr, dags: w.querySelector("#rkp-d").value, gjalddagi: w.querySelector("#rkp-g").value, verkefniIds: pids, verkefniId: pids[0] || null, pontunIds: [...ids], vskId: P0.vskId, kaupandi: buyerOf(c), seljandi: sl, linur: L, vskP, ...totals(L, vskP), timaIds: [], kostnIds: [], stada: "Ógreitt", stofnad: new Date().toISOString() };
      if (!R.kaupandi) R.kaupandi = { name: P0.tengilidur || "Staðgreiðsluviðskiptavinur", kennitala: "", heimilisfang: "", postnumer: "", stadur: "", netfang: P0.netfang || "" };
      if (Ps.every(pnStadg)) { R.stada = "Greitt"; R.greitt = Ps.map(x => String(x.greitt.dags).slice(0, 10)).sort().pop(); R.stadgreitt = true; R.gjalddagi = R.dags; }
      w.querySelector("#rkp-ok").disabled = true;
      try { await saveSnapshot(st => { (st.reikningar = st.reikningar || []).push(R); (st.pantanir || []).forEach(q => { if (ids.has(q.id)) q.reikningur = R.id; });
          st.stillingar = st.stillingar || {}; st.stillingar.reikn = { ...(st.stillingar.reikn || {}), nastaNr: Math.max(nr + 1, +(st.stillingar.reikn?.nastaNr || 0)) }; });
        close(); toast(`${NRL(R)} ${DROG() ? "búin" : "búinn"} til`); try { tab = "trk"; } catch (e) {} openDetail("reikn:" + R.id); if (window.MS && MS.on()) saveToOneDrive(R.id, true);
      } catch (e) { w.querySelector("#rkp-ok").disabled = false; toast("Tókst ekki: " + (e?.message || e)); } };
  }
  window.rkBillOrders = billOrders;

  /* ---------- Sjálfvirk reikningsdrög úr pöntunum (2.96.0) ----------
     stillingar.reikn.sjalfvirkt (sjálfgefið á). Viðskiptavinur í reikningi: drög myndast þegar pöntun er staðfest (Staðfest/Afhent/…),
     uppfærast með pöntuninni (línur, afsláttur, aukagjöld úr skilauppgjöri) og verða tilbúin (lifandi = false, tilbuid) við skil eða
     afhendingu söluvara. Staðgreitt: greiddur reikningur (kvittun) um leið og greiðsla er skráð. Valfrjálst (dkSjalf): tilbúin drög
     fara sjálfkrafa í DK ef ekkert vantar. Aðeins pantanir frá virkjun (sjalfFra) – eldri fara áfram handvirkt um „Pantanir án reiknings“.
     Keyrir í appi fjármálanotanda (reglur: aðeins admin/bókari skrifa reikninga); auðkenni draga = "pn" + id pöntunar svo tveir
     notendur búi ekki til tvenn drög. R.sjalf, R.lifandi, R.tilbuid. */
  const AUTO_ST = ["Staðfest", "Afhent", "Skilað", "Lokið"];
  const autoOn = () => RK().sjalfvirkt !== false && !!(window.ON && ON("pantanir"));
  window.rkAutoOn = autoOn;
  const pnDone = P => P.stada === "Skilað" || P.stada === "Lokið" || (P.stada === "Afhent" && !!window.pnSkil && !pnSkil(P));
  const autoWant = (P, fra) => P && !P.rkEytt && P.pontun !== false && (P.linur || []).length && P.stada !== "Hafnað" && String(P.dags || P.fra || "") >= fra
    && (pnStadg(P) || (!P.greitt && hattur(P) === "reikningur" && !!P.vskId && AUTO_ST.includes(P.stada)));
  const mkAuto = (P, nr, rk) => { const c = P.vskId ? findVsk(P.vskId) : null, L = orderLines([P]), vskP = +rk.vsk || 0, sl = { ...rk }, d0 = isoDay(new Date());
    ["nastaNr", "timagjald", "sjalfvirkt", "sjalfFra", "dkSjalf", "flokkar", "dk", "bokhald"].forEach(k => delete sl[k]);
    const R = { id: "pn" + P.id, nr, dags: d0, gjalddagi: addDays(d0, +rk.frestur || 14), verkefniIds: P.verkefniId ? [P.verkefniId] : [], verkefniId: P.verkefniId || null, pontunIds: [P.id], vskId: P.vskId || null,
      kaupandi: buyerOf(c) || { name: P.tengilidur || "Staðgreiðsluviðskiptavinur", kennitala: "", heimilisfang: "", postnumer: "", stadur: "", netfang: P.netfang || "" },
      seljandi: sl, linur: L, vskP, ...totals(L, vskP), timaIds: [], kostnIds: [], stada: "Ógreitt", stofnad: new Date().toISOString(), sjalf: true, lifandi: true };
    if (pnStadg(P)) { R.stada = "Greitt"; R.greitt = String(P.greitt.dags).slice(0, 10); R.stadgreitt = true; R.gjalddagi = R.dags; R.lifandi = false; R.tilbuid = new Date().toISOString(); }
    else if (pnDone(P)) { R.lifandi = false; R.tilbuid = new Date().toISOString(); }
    return R; };
  const dkAuto = (R, rk) => { if (rk.bokhald === "dk" && rk.dkSjalf && !R.bokhald && !vidbunadur(R).length) R.bokhald = { kerfi: "dk", stada: "bidur", beidni: new Date().toISOString(), af: "sjálfvirkt" }; };
  let autoBusy = false, autoSig = "";
  async function autoSync() {
    if (autoBusy || typeof S === "undefined" || !S || !window.salaAPI) return;
    try { if (!FJ() || !autoOn()) return; } catch (e) { return; }
    const rk = RK(), Ps = PNs(), Rs = reikningar();
    if (!rk.sjalfFra) { autoBusy = true; try { await saveSnapshot(st => { st.stillingar = st.stillingar || {}; st.stillingar.reikn = { ...(st.stillingar.reikn || {}), sjalfFra: isoDay(new Date()) }; }); } catch (e) {} autoBusy = false; return; }
    const sig = JSON.stringify([Ps.map(p => [p.id, p.stada, p.reikningur, p.greitt?.dags, p.linur, p.afsl, p.vskId, p.greidsluhattur]), Rs.map(r => [r.id, r.lifandi, !!r.bokhald, r.stada]), rk.sjalfFra, rk.dkSjalf, rk.bokhald]);
    if (sig === autoSig) return;
    const nyjar = Ps.filter(P => !P.reikningur && autoWant(P, rk.sjalfFra)), upd = [];
    Ps.forEach(P => { if (!P.reikningur || P.reikningur === "utan") return; const R = Rs.find(r => r.id === P.reikningur);
      if (!R || !R.sjalf || !R.lifandi || R.bokhald || OGILT(R) || (R.pontunIds || []).length !== 1) return;
      const L = orderLines([P]); if (JSON.stringify(L) !== JSON.stringify(R.linur) || pnDone(P) || R.vskId !== (P.vskId || null)) upd.push([P, L]); });
    if (!nyjar.length && !upd.length) { autoSig = sig; return; }
    autoBusy = true; const made = [];
    try {
      await saveSnapshot(st => { st.reikningar = st.reikningar || []; st.stillingar = st.stillingar || {}; const r0 = { ...RK(), ...(st.stillingar.reikn || {}) }; let nr = +r0.nastaNr || 1001;
        nyjar.forEach(P0 => { const q = (st.pantanir || []).find(x => x.id === P0.id); if (!q || q.reikningur) return;
          const ex = st.reikningar.find(r => r.id === "pn" + q.id); if (ex) { q.reikningur = ex.id; return; }
          while (st.reikningar.some(r => r.nr === nr)) nr++;
          const R = mkAuto(q, nr++, r0); dkAuto(R, r0); st.reikningar.push(R); q.reikningur = R.id; made.push(R.nr + " (" + q.nr + ")"); });
        st.stillingar.reikn = { ...(st.stillingar.reikn || {}), nastaNr: Math.max(nr, +(st.stillingar.reikn?.nastaNr || 0)) };
        upd.forEach(([P, L]) => { const R = st.reikningar.find(r => r.id === P.reikningur); if (!R || !R.lifandi || R.bokhald) return;
          R.linur = L; Object.assign(R, totals(L, +R.vskP || 0)); R.vskId = P.vskId || null; { const c = P.vskId ? findVsk(P.vskId) : null; if (c) R.kaupandi = buyerOf(c); }
          if (pnDone(P)) { R.lifandi = false; R.tilbuid = new Date().toISOString(); R.dags = isoDay(new Date()); R.gjalddagi = addDays(R.dags, +r0.frestur || 14); dkAuto(R, r0); } });
      });
      if (made.length) toast(`${made.length === 1 ? "Reikningsdrög" : made.length + " reikningsdrög"} ${made.length === 1 ? "búin til" : "búin til"} úr pöntun: ${made.slice(0, 3).join(", ")}${made.length > 3 ? " …" : ""}`);
      autoSig = "";
    } catch (e) { autoSig = sig; console.warn("Sjálfvirk reikningsdrög:", e); }
    autoBusy = false;
  }
  window.rkAutoSync = autoSync;
  setInterval(() => { autoSync().catch(() => {}); }, 4000);

  function buildLines(groups, sund) {
    const multi = groups.length > 1, L = [];
    groups.forEach(({ p, es, ks, verd }) => {
      const pre = multi ? (p ? p.nr + " · " : "Almennt · ") : "";
      // Hver færsla fær gjald eigin þjónustu (e.taxti) ef hún er önnur en verkefnisins, annars gjald verkefnisins
      const ev = e => window.entryRate ? entryRate(e, verd) : verd, tx = e => (ev(e) !== verd && e.taxti && window.lidOf) ? lidOf(e.taxti) : null;
      if (sund) es.slice().sort((a, b) => String(a.date + (a.fra || "")).localeCompare(String(b.date + (b.fra || "")))).forEach(e => L.push({ flokkur: "vinna", lysing: pre + dIS(String(e.date).slice(0, 10)) + " – " + cleanLys(e.lysing) + (tx(e) ? " (" + tx(e).heiti + ")" : ""), magn: Math.round((+e.timar || 0) * 100) / 100, eining: "klst.", verd: ev(e) }));
      else {
        const g = new Map();
        es.forEach(e => { const r = e.undirverkId ? findSub(e.undirverkId) : null, t = tx(e); const k = (r ? r.u.id : "_") + "|" + (t ? t.id : "") + "|" + ev(e);
          if (!g.has(k)) g.set(k, { lysing: pre + "Tímavinna – " + (r ? subName(r.u) : p ? (p.stutt || p.nafn) : "almenn vinna") + (t ? " (" + t.heiti + ")" : ""), magn: 0, verd: ev(e) }); g.get(k).magn += +e.timar || 0; });
        [...g.values()].forEach(x => L.push({ flokkur: "vinna", lysing: x.lysing, magn: Math.round(x.magn * 100) / 100, eining: "klst.", verd: x.verd }));
      }
      ks.forEach(k => L.push({ flokkur: "kostn", lysing: pre + "Útlagður kostnaður – " + (k.lysing || ""), magn: 1, eining: "stk.", verd: Math.round(+k.upphaed || 0) }));
    });
    return L.map(l => tagL(l, l.flokkur));
  }
  // VSK reiknast á hvern VSK-flokk (lína.vsk, annars vskP) – vskSund: [{ p, net, vsk }]
  const totals = (L, vskP) => { const m = new Map(); L.filter(l => !l.haus).forEach(l => { const p = l.vsk ?? vskP, a = Math.round(l.magn * l.verd); m.set(p, (m.get(p) || 0) + a); });
    const vskSund = [...m.entries()].sort((a, b) => b[0] - a[0]).map(([p, net]) => ({ p, net, vsk: Math.round(net * p / 100) }));
    const net = vskSund.reduce((a, x) => a + x.net, 0), vsk = vskSund.reduce((a, x) => a + x.vsk, 0); return { net, vsk, tot: net + vsk, vskSund }; };
  const vskRows = R => R.vskSund?.length ? R.vskSund.filter(x => x.net || x.p) : [{ p: R.vskP, net: R.net, vsk: R.vsk }];
  const buyerOf = c => c ? { name: c.name, kennitala: c.kennitala || "", heimilisfang: c.heimilisfang || "", postnumer: c.postnumer || "", stadur: c.stadur || "", netfang: c.netfang || "" } : null;

  /* ---------- Form: reikningsfæra (eitt eða fleiri verkefni) ---------- */
  function openForm(pid) {
    const groups = openGroups(), rk = RK();
    if (!groups.length) { toast("Ekkert óreikningsfært."); return; }
    if (pid && !groups.some(g => g.k === pid)) { toast("Engir óreikningsfærðir tímar eða kostnaður á verkefninu."); return; }
    const p0 = pid ? findProj(pid) : null, buyer0 = kaupandi(p0) || kaupandi(groups.find(g => g.p)?.p);
    const missing = !rk.kt || !rk.banki;
    const grpHTML = g => `<details class="rkg" data-g="${esc(g.k)}"><summary><label class="rkrow rkgh" onclick="event.stopPropagation()"><input type="checkbox" data-gall="${esc(g.k)}"><span><b>${g.p ? `<span class="nr">${esc(g.p.nr)}</span> ${esc(g.p.stutt)}` : "Án verkefnis (almennt)"}</b></span><b class="rkgt"></b></label></summary>
      <div class="rkgb">${g.es.length ? `<label class="rkrate">Tímagjald kr./klst.<input data-rate="${esc(g.k)}" inputmode="numeric" value="${rate(g.p) || ""}" placeholder="t.d. 15000"></label>` : ""}
      <div class="rkpick">${g.es.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).map(e => `<label class="rkrow"><input type="checkbox" data-rke="${esc(e.id)}" data-gk="${esc(g.k)}"><span>${esc(dIS(String(e.date).slice(0, 10)))} · ${esc(cleanLys(e.lysing))}${e.taxti && window.lidOf && lidOf(e.taxti) ? ` <span class="tag">${esc(lidOf(e.taxti).heiti)}</span>` : ""}</span><b>${esc(hrs(e.timar))}</b></label>`).join("")}
      ${g.ks.map(k => `<label class="rkrow"><input type="checkbox" data-rkk="${esc(k.id)}" data-gk="${esc(g.k)}"><span>${esc(dIS(k.date))} · 🧾 ${esc(k.lysing)}</span><b>${esc(kr(k.upphaed))}</b></label>`).join("")}</div></div></details>`;
    sheet.innerHTML = `<h3 id="sheet-h">Nýr reikningur</h3>
      ${missing ? `<div class="msg err" style="margin-bottom:10px">Upplýsingar um seljanda vantar (kennitala og bankareikningur). Fylltu þær út í Stillingum → Reikningar áður en reikningur er sendur.</div>` : ""}
      <form id="rkf" novalidate>
      <label>Viðskiptavinur (greiðandi)<select id="rk-buyer"><option value="">– Veldu –</option>${vskList().map(c => `<option value="${esc(c.id)}"${buyer0 && sameId(buyer0.id, c.id) ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
      <div class="two"><label>Reikningsdagur<input id="rk-dags" type="date" value="${isoDay(today)}"></label><label>Gjalddagi<input id="rk-gjd" type="date" value="${addDays(isoDay(today), +rk.frestur || 14)}"></label></div>
      <label>Reikningsnúmer<input id="rk-nr" inputmode="numeric" value="${esc(String(rk.nastaNr))}"></label>
      <div class="kind" style="margin-top:4px">Verkefni á reikningnum</div>
      <p class="hint" style="margin:-4px 0 2px">Hakaðu við eitt eða fleiri verkefni. Verkefni greiðandans eru valin sjálfkrafa.</p>
      <div class="rkgs">${groups.map(grpHTML).join("")}</div>
      <label class="chk" style="flex-direction:row;align-items:center;gap:8px;color:var(--ink);font-size:14.5px"><input type="checkbox" id="rk-sund" style="width:auto">Ein lína á hverja tímafærslu (annars tekið saman eftir undirverkum)</label>
      <div class="card rksum" id="rk-sum"></div>
      <div id="f-msg"></div>
      <div class="actions three-a"><button type="button" class="btn" id="rk-cancel">Hætta við</button><button type="button" class="btn" id="rk-prev">Forskoða</button><button class="btn primary" id="rk-save">Búa til</button></div></form>
      <div id="rk-pv" hidden></div>`;
    sheet.closest(".sheet").classList.add("wide"); sheetwrap.hidden = false;
    const Q = sel => [...sheet.querySelectorAll(sel)];
    const setGroup = (k, on) => { Q(`[data-gk="${CSS.escape(k)}"]`).forEach(c => c.checked = on); };
    const mine = (g, bid) => !!(bid && g.p && (sameId(g.p.vkId, bid) || sameId(g.p.vskId, bid)));
    const defaults = () => { const bid = val("rk-buyer"); groups.forEach(g => setGroup(g.k, mine(g, bid))); };
    const sel = () => groups.map(g => ({ k: g.k, p: g.p, verd: parseKr(sheet.querySelector(`[data-rate="${CSS.escape(g.k)}"]`)?.value), es: g.es.filter(e => sheet.querySelector(`[data-rke="${CSS.escape(e.id)}"]`)?.checked), ks: g.ks.filter(k => sheet.querySelector(`[data-rkk="${CSS.escape(k.id)}"]`)?.checked) })).filter(g => g.es.length || g.ks.length);
    const upd = () => {
      groups.forEach(g => { const cs = Q(`[data-gk="${CSS.escape(g.k)}"]`), n = cs.filter(c => c.checked).length, h = sheet.querySelector(`[data-gall="${CSS.escape(g.k)}"]`);
        h.checked = n > 0 && n === cs.length; h.indeterminate = n > 0 && n < cs.length;
        const s = sel().find(x => x.k === g.k); sheet.querySelector(`.rkg[data-g="${CSS.escape(g.k)}"] .rkgt`).textContent = s ? [s.es.length ? hrs(sumT(s.es)) : "", s.ks.length ? kr(sumK(s.ks)) : ""].filter(Boolean).join(" + ") : ""; });
      const G = sel(), L = buildLines(G, document.getElementById("rk-sund").checked), t = totals(L, +RK().vsk || 0);
      document.getElementById("rk-sum").innerHTML = G.length ? `${G.map(g => `<div class="sub-i"><span>${esc(g.p ? g.p.nr + " " + g.p.stutt : "Almennt")}${g.es.length ? ` · ${num(sumT(g.es))} klst.${g.es.every(e => (window.entryRate ? entryRate(e, g.verd) : g.verd) === g.verd) ? " × " + esc(kr(g.verd)) : ""}` : ""}</span><b>${esc(kr(Math.round(esKr(g.es, g.verd)) + sumK(g.ks)))}</b></div>`).join("")}
        ${t.vskSund.map(x => `<div class="sub-i"><span>VSK ${esc(fx(x.p))}%${t.vskSund.length > 1 ? " af " + esc(kr(x.net)) : ""}</span><b>${esc(kr(x.vsk))}</b></div>`).join("")}<div class="sub-i" style="font-size:16px"><span>Samtals til greiðslu</span><b>${esc(kr(t.tot))}</b></div>` : `<span class="hint">Ekkert valið.</span>`; };
    Q("[data-gall]").forEach(h => h.addEventListener("change", () => { setGroup(h.dataset.gall, h.checked); h.closest("details").open = h.checked; upd(); }));
    sheet.addEventListener("input", upd); sheet.addEventListener("change", e => { if (!e.target.dataset.gall) upd(); });
    document.getElementById("rk-buyer").addEventListener("change", () => { defaults(); groups.forEach(g => { sheet.querySelector(`.rkg[data-g="${CSS.escape(g.k)}"]`).open = Q(`[data-gk="${CSS.escape(g.k)}"]`).some(c => c.checked); }); upd(); });
    if (pid) groups.forEach(g => setGroup(g.k, g.k === pid)); else defaults();
    groups.forEach(g => { sheet.querySelector(`.rkg[data-g="${CSS.escape(g.k)}"]`).open = Q(`[data-gk="${CSS.escape(g.k)}"]`).some(c => c.checked); });
    upd();
    document.getElementById("rk-cancel").onclick = closeSheet;

    const draft = () => {
      const G = sel(), nr = parseInt(val("rk-nr")) || 0, bid = val("rk-buyer");
      if (!G.length) { msg("Veldu að minnsta kosti eina færslu.", "err"); return null; }
      const noRate = G.find(g => g.es.some(e => !(window.entryRate ? entryRate(e, g.verd) : g.verd))); if (noRate) { msg(`Skráðu tímagjald fyrir ${noRate.p ? noRate.p.nr : "almenna tíma"}.`, "err"); return null; }
      if (!bid) { msg("Veldu viðskiptavin.", "err"); return null; }
      if (!ktOK(findVsk(bid)?.kennitala)) { msg(`Kennitölu vantar á ${findVsk(bid)?.name || "viðskiptavininn"} – bókhaldskerfi þurfa hana. Skráðu hana á viðskiptavininn.`, "err"); return null; }
      if (!nr) { msg("Skráðu reikningsnúmer.", "err"); return null; }
      const L = buildLines(G, document.getElementById("rk-sund").checked), vskP = +RK().vsk || 0;
      const sl = { ...RK() }; delete sl.nastaNr; delete sl.timagjald;
      const pids = G.map(g => g.p?.id).filter(Boolean);
      return { G, R: { id: newId(), nr, dags: val("rk-dags"), gjalddagi: val("rk-gjd"), verkefniIds: pids, verkefniId: pids[0] || null, vskId: bid, kaupandi: buyerOf(findVsk(bid)), seljandi: sl, linur: L, vskP, ...totals(L, vskP),
        timaIds: G.flatMap(g => g.es.map(e => e.id)), kostnIds: G.flatMap(g => g.ks.map(k => k.id)), stada: "Ógreitt", stofnad: new Date().toISOString() } };
    };
    const create = async (D) => {
      const { G, R } = D;
      if (reikningar().some(r => r.nr === R.nr) && !confirm(`Reikningur nr. ${R.nr} er þegar til. Nota samt sama númer?`)) return;
      const eIds = new Set(R.timaIds), kIds = new Set(R.kostnIds);
      Q("#rk-save, #rk-pv-save").forEach(b => b.disabled = true);
      await saveSnapshot(st => {
        (st.reikningar = st.reikningar || []).push(R);
        const T = st.timar || {}; [...(T.faerslur || []), ...(T.nyjast || [])].forEach(e => { if (eIds.has(e.id)) e.reikningur = R.id; });
        (st.kostnadur || []).forEach(k => { if (kIds.has(k.id)) k.reikningur = R.id; });
        st.stillingar = st.stillingar || {}; st.stillingar.reikn = { ...(st.stillingar.reikn || {}), nastaNr: Math.max(R.nr + 1, +(st.stillingar.reikn?.nastaNr || 0)) };
        G.forEach(g => { const q = g.p && sFindP(st, g.p.id); if (q && g.verd && g.verd !== (window.rateOf ? rateOf({ ...q, timagjald: null }) : 0)) q.timagjald = g.verd; }); // aðeins ef vikið er frá verðskrá
      });
      toast(`${NRL(R)} ${DROG() ? "búin" : "búinn"} til`); closeSheet(); openDetail("reikn:" + R.id);
      if (window.MS && MS.on()) saveToOneDrive(R.id, true);
    };
    document.getElementById("rk-prev").onclick = () => { msg(""); const D = draft(); if (!D) return;
      const pv = document.getElementById("rk-pv"), f = document.getElementById("rkf");
      pv.innerHTML = `<p class="hint" style="margin:0 0 8px">Forskoðun · reikningurinn hefur ekki verið búinn til.</p><div class="invwrap" style="margin-top:0">${invoiceHTML(D.R)}</div>
        <div class="actions three-a" style="margin-top:14px"><button type="button" class="btn" id="rk-pv-back">‹ Breyta</button><button type="button" class="btn" id="rk-pv-pdf">Sækja PDF</button><button type="button" class="btn primary" id="rk-pv-save">Búa til</button></div>`;
      f.hidden = true; pv.hidden = false; document.getElementById("sheet-h").textContent = "Forskoðun reiknings"; sheet.closest(".sheet").scrollTop = 0;
      document.getElementById("rk-pv-back").onclick = () => { pv.hidden = true; f.hidden = false; document.getElementById("sheet-h").textContent = "Nýr reikningur"; };
      document.getElementById("rk-pv-pdf").onclick = () => downloadPdf({ ...D.R, _drog: true });
      document.getElementById("rk-pv-save").onclick = () => create(D); };
    document.getElementById("rkf").onsubmit = ev => { ev.preventDefault(); msg(""); const D = draft(); if (D) create(D); };
  }

  /* ---------- Reikningsdrög (frá 2.9.0) ----------
     Lögformlegur reikningur (rg. 505/2013, lög 145/1994: samfelld númeraröð, ekki eytt, yfirlýsing og kerfislýsing)
     er gefinn út í bókhaldskerfi. Á meðan ekkert bókhaldskerfi er tengt (Stillingar › Reikningar › Bókhaldskerfi)
     býr Atrium til REIKNINGSDRÖG: grunn að reikningi sem er færður í bókhaldskerfið. Drögum er ekki eytt heldur ógilt. */
  const DROG = () => true; // 2.92.0: reikningur í Atrium er alltaf drög – lögformlegur reikningur er gefinn út í bókhaldskerfinu (handvirkt eða með tengingu)
  const BK = () => RK().bokhald || "", DKON = () => BK() === "dk", DKC = () => ({ solumadur: "", lykill: "", mati: "", skilmali: "", stadgKt: "", stadgMati: "", stadgSkilmali: "", grId: "", grNafn: "", post: false, ...(RK().dk || {}) });
  const BKS = { bidur: "Sendist í DK…", sent: "Í DK", villa: "Villa frá DK" };
  const TT = () => DROG() ? "Reikningsdrög" : "Reikningur";
  const NRL = R => (DROG() ? "Drög nr. " : "Reikningur nr. ") + R.nr;
  const DROG_TXT = "Reikningsdrög – ekki reikningur. Lögformlegur reikningur er gefinn út í bókhaldskerfi.";
  const OGILT = R => R.stada === "Ógilt";
  /* ---------- Reikningurinn sjálfur (HTML: forskoðun á skjá og prentun) ---------- */
  const entriesOf = R => faerslur().filter(e => (R.timaIds || []).includes(e.id)).sort((a, b) => String(a.date + (a.fra || "")).localeCompare(String(b.date + (b.fra || ""))));
  const projNames = R => pidsOf(R).map(findProj).filter(Boolean).map(p => p.nafn);
  function invoiceHTML(R) {
    const s = R.seljandi || {}, b = R.kaupandi || {}, pn = projNames(R), es = entriesOf(R), multi = new Set(es.map(e => e.verkefniId || "")).size > 1;
    return `<div class="inv">
      <div class="inv-h"><div><img class="inv-logo" src="${esc(ORG.docLogo || "icons/doc-logo.png")}" alt="${esc(ORG.nafn)}"><div class="inv-s">${esc(s.nafn || "")}</div><div class="inv-m">${[s.kt && "Kt. " + s.kt, s.vsknr && "VSK-nr. " + s.vsknr].filter(Boolean).map(esc).join(" · ")}<br>${esc(s.heimilisfang || "")}<br>${[s.netfang, s.simi].filter(Boolean).map(esc).join(" · ")}</div></div>
        <div style="text-align:right"><div class="inv-t">${TT()}</div><div class="inv-m">${DROG() ? "Drög nr." : "Nr."} <b>${esc(String(R.nr))}</b>${R.bokhaldNr ? `<br>Reikningur í bókhaldi: <b>${esc(String(R.bokhaldNr))}</b>` : ""}<br>Dags. ${esc(dIS(R.dags))}<br>Gjalddagi ${esc(dIS(R.gjalddagi))}</div></div></div>
      <div class="inv-b"><div class="inv-k">Greiðandi</div><b>${esc(b.name || "")}</b><br>${b.kennitala ? "Kt. " + esc(b.kennitala) + "<br>" : ""}${esc(b.heimilisfang || "")}${b.postnumer || b.stadur ? "<br>" + esc([b.postnumer, b.stadur].filter(Boolean).join(" ")) : ""}</div>
      ${pn.length ? `<div class="inv-m" style="margin:10px 0 0">${pn.length > 1 ? "Verkefni" : "Verkefni"}: <b>${pn.map(esc).join(", ")}</b></div>` : ""}
      ${(R.pontunIds || []).length ? `<div class="inv-m" style="margin:6px 0 0">${R.pontunIds.length > 1 ? "Pantanir" : "Pöntun"}: <b>${R.pontunIds.map(i => PNs().find(x => x.id === i)?.nr || "").filter(Boolean).map(esc).join(", ")}</b></div>` : ""}
      <table class="inv-tab"><thead><tr><th>Lýsing</th><th class="r">Magn</th><th>Ein.</th><th class="r">Einingaverð</th><th class="r">Upphæð</th></tr></thead><tbody>
        ${R.linur.map(l => l.haus ? `<tr class="inv-hd"><td colspan="5"><b>${esc(l.lysing)}</b></td></tr>` : `<tr><td>${esc(l.lysing)}</td><td class="r">${esc(fx(l.magn))}</td><td>${esc(l.eining)}</td><td class="r">${esc(kr(l.verd))}</td><td class="r">${esc(kr(Math.round(l.magn * l.verd)))}</td></tr>`).join("")}
      </tbody></table>
      <div class="inv-tot"><div><span>Samtals án VSK</span><b>${esc(kr(R.net))}</b></div>${vskRows(R).map(x => `<div><span>VSK ${esc(fx(x.p))}%${vskRows(R).length > 1 ? " af " + esc(kr(x.net)) : ""}</span><b>${esc(kr(x.vsk))}</b></div>`).join("")}<div class="g"><span>Samtals til greiðslu</span><b>${esc(kr(R.tot))}</b></div></div>
      ${DROG() ? `<div class="inv-pay" style="font-weight:500">${esc(DROG_TXT)}</div>` : ""}${OGILT(R) ? `<div class="inv-pay" style="font-weight:500">ÓGILT ${esc(dIS(R.ogilt || ""))}</div>` : ""}
      <div class="inv-pay">${s.banki ? `Greiðist inn á reikning <b>${esc(s.banki)}</b>${s.kt ? ", kt. " + esc(s.kt) : ""}, í síðasta lagi ${esc(dIS(R.gjalddagi))}. Vinsamlegast merkið greiðslu með reikningsnúmeri ${esc(String(R.nr))}.` : ""}</div>
      ${es.length ? `<div class="inv-sund"><div class="inv-k">Sundurliðun tíma</div><table class="inv-tab"><thead><tr><th>Dags.</th>${multi ? "<th>Verk</th>" : ""}<th>Lýsing</th><th>Tími</th><th class="r">Klst.</th></tr></thead><tbody>
        ${es.map(e => `<tr><td>${esc(dIS(String(e.date).slice(0, 10)))}</td>${multi ? `<td>${esc(findProj(e.verkefniId)?.nr || "–")}</td>` : ""}<td>${esc(cleanLys(e.lysing))}</td><td>${esc(e.fra ? e.fra + (e.til ? "–" + e.til : "") : "")}</td><td class="r">${esc(fx(Math.round((+e.timar || 0) * 100) / 100))}</td></tr>`).join("")}
        <tr class="g"><td colspan="${multi ? 4 : 3}">Samtals</td><td class="r">${esc(fx(Math.round(sumT(es) * 100) / 100))}</td></tr></tbody></table></div>` : ""}
    </div>`;
  }

  /* ---------- PDF (frá 1.7.0: skjalagerd.js – merki, Poppins, haus og fótur) ---------- */
  async function invoicePdf(R) {
    const P = await DOK.pdf(), { C, M, X1 } = P, s = R.seljandi || {}, b = R.kaupandi || {}, label = NRL(R);
    let y = P.head(TT(), [[DROG() ? "Drög nr." : "Reikningur nr.", String(R.nr)], ["Dagsetning", dIS(R.dags)], ["Gjalddagi", dIS(R.gjalddagi)]]);
    const need = h => { if (y + h > P.H - 60) { P.doc.addPage(); y = P.contHead(label); return true; } return false; };
    // Seljandi og greiðandi hlið við hlið
    const col2 = M + (X1 - M) / 2 + 10, sl = [s.nafn, [s.kt && "kt. " + s.kt, s.vsknr && "VSK-nr. " + s.vsknr].filter(Boolean).join(" · "), s.heimilisfang, [s.netfang, s.simi].filter(Boolean).join(" · ")].filter(Boolean);
    const bl = [b.name, b.kennitala && "kt. " + b.kennitala, b.heimilisfang, [b.postnumer, b.stadur].filter(Boolean).join(" ")].filter(Boolean);
    P.text("SELJANDI", M, y, { size: 7.5, color: C.stal, space: 1.2 }); P.text("GREIÐANDI", col2, y, { size: 7.5, color: C.stal, space: 1.2 }); y += 15;
    const rows = Math.max(sl.length, bl.length);
    for (let i = 0; i < rows; i++) { if (sl[i]) P.text(sl[i], M, y + i * 13, { w: i ? "regular" : "medium", size: i ? 9 : 10 }); if (bl[i]) P.text(bl[i], col2, y + i * 13, { w: i ? "regular" : "medium", size: i ? 9 : 10 }); }
    y += rows * 13 + 8;
    const pn = projNames(R); if (pn.length) { P.wrap("Verkefni: " + pn.join(", "), X1 - M, 9).forEach(t => { P.text(t, M, y, { size: 9, color: C.grafit }); y += 12; }); }
    y += 10;
    // Línur
    const X = { d: M + 8, m: 360, e: 368, v: 460, u: X1 - 8 };
    const head = () => { P.rect(M, y, X1 - M, 22, C.grafit); [["Lýsing", X.d], ["Magn", X.m, "right"], ["Ein.", X.e], ["Einingaverð", X.v, "right"], ["Upphæð", X.u, "right"]].forEach(([t, x, a]) => P.text(t, x, y + 14.5, { w: "medium", size: 8.5, color: C.hvitt, align: a })); y += 22; };
    head();
    R.linur.forEach((l, i) => { if (l.haus) { if (need(24)) head(); P.text(l.lysing, X.d, y + 16, { size: 9, w: "medium" }); y += 22; P.line(M, y, X1, y); return; }
      const ls = P.wrap(l.lysing, X.m - 46 - X.d, 9), h = 10 + ls.length * 12; if (need(h)) head();
      if (i % 2) P.rect(M, y, X1 - M, h, C.pappir);
      ls.forEach((t, j) => P.text(t, X.d, y + 14 + j * 12, { size: 9 }));
      P.text(fx(l.magn), X.m, y + 14, { size: 9, align: "right" }); P.text(l.eining, X.e, y + 14, { size: 9 });
      P.text(kr(l.verd), X.v, y + 14, { size: 9, align: "right" }); P.text(kr(Math.round(l.magn * l.verd)), X.u, y + 14, { size: 9, w: "medium", align: "right" });
      y += h; P.line(M, y, X1, y); });
    need(90); y += 20; const tx = 330;
    P.text("Samtals án VSK", tx, y, { size: 9.5, color: C.grafit }); P.text(kr(R.net), X1 - 8, y, { size: 9.5, align: "right" }); y += 16;
    { const vr = vskRows(R); vr.forEach((x, i) => { P.text("VSK " + fx(x.p) + "%" + (vr.length > 1 ? " af " + kr(x.net) : (+x.p ? "" : " (félagið er ekki á VSK-skrá)")), tx, y, { size: 9.5, color: C.grafit }); P.text(kr(x.vsk), X1 - 8, y, { size: 9.5, align: "right" }); y += i < vr.length - 1 ? 16 : 10; }); }
    P.rect(tx - 8, y, X1 - tx + 8, 30, C.nott); P.text("Samtals til greiðslu", tx, y + 19.5, { w: "medium", size: 10.5, color: C.hvitt }); P.text(kr(R.tot), X1 - 8, y + 19.5, { w: "medium", size: 11.5, color: C.hvitt, align: "right" }); y += 50;
    if (s.banki) { need(50); P.text("GREIÐSLUUPPLÝSINGAR", M, y, { size: 7.5, color: C.stal, space: 1.2 }); y += 14;
      if (DROG()) { P.text(DROG_TXT, M, y, { w: "medium", size: 9 }); y += 14; }
      P.wrap(`Greiðist inn á reikning ${s.banki}${s.kt ? ", kt. " + s.kt : ""}, í síðasta lagi ${dIS(R.gjalddagi)}. Vinsamlegast merkið greiðslu með reikningsnúmeri ${R.nr}.`, X1 - M, 9).forEach(t => { P.text(t, M, y, { size: 9 }); y += 12.5; }); }
    // Sundurliðun tíma á nýrri síðu
    const es = entriesOf(R);
    if (es.length) {
      const multi = new Set(es.map(e => e.verkefniId || "")).size > 1;
      P.doc.addPage(); y = P.contHead(label);
      P.text("Sundurliðun tíma", M, y, { w: "light", size: 16, color: C.grafit }); y += 20;
      const D = { d: M + 8, p: M + 72, l: multi ? M + 122 : M + 72, t: 432, k: X1 - 8 };
      const h2 = () => { P.rect(M, y, X1 - M, 20, C.grafit); [["Dags.", D.d], ...(multi ? [["Verk", D.p]] : []), ["Lýsing", D.l], ["Tími", D.t], ["Klst.", D.k, "right"]].forEach(([t, x, a]) => P.text(t, x, y + 13.5, { w: "medium", size: 8.5, color: C.hvitt, align: a })); y += 20; };
      h2();
      es.forEach((e, i) => { const ls = P.wrap(cleanLys(e.lysing) + (e.taxti && window.lidOf && lidOf(e.taxti) ? " (" + lidOf(e.taxti).heiti + ")" : ""), D.t - D.l - 10, 8.5), h = 8 + ls.length * 11.5; if (need(h)) h2();
        if (i % 2) P.rect(M, y, X1 - M, h, C.pappir);
        P.text(dIS(String(e.date).slice(0, 10)), D.d, y + 12.5, { size: 8.5 }); if (multi) P.text(findProj(e.verkefniId)?.nr || "–", D.p, y + 12.5, { size: 8.5 });
        ls.forEach((t, j) => P.text(t, D.l, y + 12.5 + j * 11.5, { size: 8.5 }));
        P.text(e.fra ? e.fra + (e.til ? "–" + e.til : "") : "", D.t, y + 12.5, { size: 8.5 }); P.text(fx(Math.round((+e.timar || 0) * 100) / 100), D.k, y + 12.5, { size: 8.5, align: "right" });
        y += h; P.line(M, y, X1, y); });
      need(24); y += 16; P.text("Samtals", D.d, y, { w: "medium", size: 9 }); P.text(fx(Math.round(sumT(es) * 100) / 100) + " klst.", D.k, y, { w: "medium", size: 9, align: "right" });
    }
    return P.finish(label);
  }
  window.rkSaveDoc = async id => { const R = (S?.reikningar || []).find(x => String(x.id) === String(id)); if (!R || !window.saveDoc) return; toast("Bý til PDF…");
    try { const b = await invoicePdf(R); saveDoc({ data: b, name: fileBase(R) + ".pdf", type: "application/pdf", kind: "Reikningar", coDir: ORG.od.reikningar + "/" + String(R.dags || "").slice(0, 4) }); } catch (e) { toast("PDF tókst ekki: " + (e?.message || e)); } };
  const fileBase = R => `${TT()} ${R.nr} ${R.kaupandi?.name || ""}`.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  async function downloadPdf(R) {
    toast("Bý til PDF…"); let bytes; try { bytes = await invoicePdf(R); } catch (e) { return toast("PDF tókst ekki: " + (e?.message || e)); }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    a.download = fileBase(R) + (R._drog ? " (drög)" : "") + ".pdf"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); toast("PDF sótt");
  }
  async function saveToOneDrive(id, quiet) {
    const R = findR(id); if (!R) return;
    if (!(window.MS && MS.on())) { toast("Tengdu Microsoft í Stillingum til að vista í " + ODN() + "."); return; }
    try {
      const it = await msSaveFile(ORG.od.reikningar + "/" + String(R.dags || "").slice(0, 4), fileBase(R) + ".pdf", new Blob([await invoicePdf(R)], { type: "application/pdf" }), "application/pdf", !!R.pdfId);
      await saveSnapshot(s => { const q = (s.reikningar || []).find(x => x.id === id); if (q) { q.pdfUrl = it.webUrl; q.pdfId = it.id; } });
      toast(quiet ? "Reikningurinn vistaður í " + ODN() + " (Stofa › Reikningar)" : "Vistað í " + ODN());
    } catch (e) { toast("Vistun í " + ODN() + " tókst ekki: " + (e?.message || "villa")); }
  }

  function printInv(R) {
    let pa = document.getElementById("printarea");
    if (!pa) { pa = document.createElement("div"); pa.id = "printarea"; document.body.appendChild(pa); }
    pa.innerHTML = invoiceHTML(R);
    const old = document.title; document.title = fileBase(R);
    document.body.classList.add("printinv");
    const done = () => { document.body.classList.remove("printinv"); document.title = old; window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    setTimeout(() => { window.print(); setTimeout(done, 1500); }, 50);
  }

  async function invXlsx(R) {
    const logo = window.DOK ? await DOK.logo().catch(() => null) : null;
    const S_ = (v, s) => ({ v, s }), rows = [], s = R.seljandi || {}, b = R.kaupandi || {}, pn = projNames(R);
    rows.push([S_(NRL(R), 1)]); if (DROG()) rows.push([S_(DROG_TXT, 2)]);
    rows.push([S_([s.nafn, s.kt && "kt. " + s.kt, s.heimilisfang].filter(Boolean).join("   ·   "), 2)]);
    rows.push([S_("Dags. " + dIS(R.dags) + "   ·   Gjalddagi " + dIS(R.gjalddagi), 2)]);
    rows.push([S_("Greiðandi: " + [b.name, b.kennitala && "kt. " + b.kennitala, b.heimilisfang].filter(Boolean).join(", "), 2)]);
    if (pn.length) rows.push([S_("Verkefni: " + pn.join(", "), 2)]);
    rows.push([]);
    rows.push([S_("Lýsing", 3), S_("Magn", 13), S_("Ein.", 3), S_("Einingaverð", 13), S_("Upphæð", 13)]);
    R.linur.forEach(l => l.haus ? rows.push([S_(l.lysing, 12)]) : rows.push([S_(l.lysing, 12), S_(l.magn, 6), S_(l.eining, 4), S_(Math.round(l.verd), 15), S_(Math.round(l.magn * l.verd), 15)]));
    rows.push([S_("Samtals án VSK", 8), S_("", 8), S_("", 8), S_("", 8), S_(R.net, 16)]);
    vskRows(R).forEach(x => rows.push([S_("VSK " + fx(x.p) + "%" + (vskRows(R).length > 1 ? " af " + x.net : ""), 8), S_("", 8), S_("", 8), S_("", 8), S_(x.vsk, 16)]));
    rows.push([S_("Samtals til greiðslu", 10), S_("", 10), S_("", 10), S_("", 10), S_(R.tot, 17)]);
    if (s.banki) { rows.push([]); rows.push([S_("Greiðist inn á reikning " + s.banki + (s.kt ? ", kt. " + s.kt : "") + ", í síðasta lagi " + dIS(R.gjalddagi) + ".", 2)]); }
    const es = entriesOf(R);
    if (es.length) { rows.push([], [S_("Sundurliðun tíma", 7), S_("", 7), S_("", 7), S_("", 7), S_("", 14)]);
      rows.push([S_("Dags. og lýsing", 3), S_("Frá", 3), S_("Til", 3), S_("Verk", 3), S_("Klst.", 13)]);
      es.forEach(e => rows.push([S_(dIS(String(e.date).slice(0, 10)) + "   " + cleanLys(e.lysing), 12), S_(e.fra || "", 4), S_(e.til || "", 4), S_(findProj(e.verkefniId)?.nr || "", 4), S_(Math.round((+e.timar || 0) * 100) / 100, 6)]));
      rows.push([S_("Samtals", 8), S_("", 8), S_("", 8), S_("", 8), S_(Math.round(sumT(es) * 100) / 100, 9)]); }
    const bytes = makeXlsx({ sheet: TT() + " " + R.nr, cols: [46, 9, 7, 14, 15], rows, merges: ["A1:E1"], freezeRow: 0, heights: { 0: 30 }, logo, footer: (window.DOK ? DOK.coLine() + "   ·   " : "") + NRL(R) });
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    a.download = fileBase(R) + ".xlsx"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); toast(TT() + " sótt sem Excel");
  }

  // Reikningar: allir starfsmenn sjá þá, en aðeins admin og bókari búa til, breyta og senda (firestore.rules framfylgir).
  const FJ = () => !!MCP && (!window.can || can("fjarmal"));
  /* ---------- Reikningspakki fyrir bókhaldskerfi (2.90.0) ----------
     Sameiginlegt snið sem tenging við Payday eða DK (síðar, um Cloud Function) þýðir yfir á sitt API. Þangað til má sækja hann sem CSV. */
  function pakki(R) {
    const s = R.seljandi || RK(), b = R.kaupandi || {}, c = R.vskId ? findVsk(R.vskId) : null, dflt = +R.vskP || 0;
    const linur = (R.linur || []).filter(l => !l.haus).map(l => { const f = l.flokkur ? flk(l.flokkur) : null, vsk = l.vsk ?? dflt, net = Math.round(l.magn * l.verd);
      return { lysing: l.lysing, magn: l.magn, eining: l.eining || "", einingaverd: l.verd, upphaed: net, vsk, vskUpphaed: Math.round(net * vsk / 100), flokkur: l.flokkur || "", lykill: l.lykill || f?.lykill || "" }; });
    return { utgefandi: { nafn: s.nafn, kt: s.kt, vsknr: s.vsknr }, kaupandi: { kt: b.kennitala || c?.kennitala || "", nafn: b.name || "", heimilisfang: b.heimilisfang || "", postnumer: b.postnumer || "", stadur: b.stadur || "", netfang: b.netfang || c?.netfang || "" },
      atriumNr: R.nr, dags: R.dags, gjalddagi: R.gjalddagi, tilvisun: [...pidsOf(R).map(findProj).filter(Boolean).map(p => p.nr), ...(R.pontunIds || []).map(i => PNs().find(x => x.id === i)?.nr).filter(Boolean)].join(", "),
      linur, samtals: { net: R.net, vsk: R.vsk, tot: R.tot, vskSund: vskRows(R) } };
  }
  window.rkPakki = id => { const R = findR(id); return R ? pakki(R) : null; };
  // Hvað vantar áður en reikningurinn getur farið sjálfvirkt í bókhald
  const vidbunadur = R => { const P = pakki(R), v = [];
    if (!R.stadgreitt && !ktOK(P.kaupandi.kt)) v.push("kennitölu greiðanda"); if (!ktOK(P.utgefandi.kt)) v.push("kennitölu seljanda (Stillingar › Reikningar)");
    if (DKON()) { const d = DKC(); if (R.stadgreitt && !ktOK(P.kaupandi.kt) && !d.stadgKt) v.push("staðgreiðsluviðskiptavin í DK (Stillingar › Reikningar › DK)"); if (R.stadgreitt && !d.grId) v.push("greiðslumáta staðgreiðslu í DK"); }
    const nl = [...new Set(P.linur.filter(l => !l.lykill).map(l => (FLOKKAR.find(f => f[0] === l.flokkur) || [, "óflokkaðar línur"])[1].toLowerCase()))]; if (nl.length) v.push((DKON() ? "vörunúmer í DK fyrir " : "tekjulykil fyrir ") + nl.join(", "));
    return v; };
  // 2.92.0: staða í bókhaldi og „Senda í DK“ (netþjónninn – fallið bokhaldDk – sér um sendinguna; lykillinn er í Secret Manager)
  window.rkBkHTML = function (R) {
    if (!R || OGILT(R)) return ""; const b = R.bokhald || {}, fj = FJ(), v = vidbunadur(R);
    const pn = R.sjalf ? (PNs().find(x => (R.pontunIds || [])[0] === x.id) || null) : null;
    const au = R.sjalf ? `<div class="rkauto${R.lifandi ? "" : " ok"}">${R.lifandi ? `<b>Sjálfvirk drög</b> úr pöntun ${esc(pn?.nr || "")} – uppfærast með pöntuninni þar til henni er skilað.` : `<b>Sjálfvirk drög</b> úr pöntun ${esc(pn?.nr || "")} – ${R.stadgreitt ? "greidd (kvittun)" : "tilbúin"}${R.bokhald ? "" : " til bókunar"}.`}</div>` : "";
    return au + rkBkInner(R, b, fj, v);
  };
  function rkBkInner(R, b, fj, v) {
    if (DKON()) {
      if (b.stada === "sent") return `<div class="rkvb ok"><b>✓ Í DK</b> – reikningur nr. <b>${esc(String(b.nr || R.bokhaldNr || ""))}</b>${b.dags ? " · " + esc(dIS(String(b.dags).slice(0, 10))) : ""}${b.post ? " · sendur greiðanda úr DK" : ""}</div>`;
      if (b.stada === "bidur") return `<div class="rkvb"><b>Sendist í DK…</b> Netþjónninn stofnar viðskiptavin ef þarf og reikninginn í DK.</div>`;
      const err = b.stada === "villa" ? `<b>Villa frá DK:</b> ${esc(b.villa || "óþekkt")}<br>` : "";
      return `<div class="rkvb ${v.length || err ? "no" : "ok"}">${err}${v.length ? `<b>Ekki tilbúið:</b> vantar ${esc(v.join(" og "))}.` : `<b>✓ Tilbúið</b> – greiðandi og allar línur með VSK og vörunúmeri í DK.`}
        ${fj && !v.length ? `<button type="button" class="btn sm primary" data-act="rkdk:${esc(R.id)}" style="margin-left:6px">${err ? "Reyna aftur" : "Senda í DK"}</button>` : ""} <button type="button" class="pflink" data-act="rkcsv:${esc(R.id)}">CSV</button></div>`;
    }
    return `<div class="rkvb ${v.length ? "no" : "ok"}">${v.length ? `<b>Ekki tilbúið fyrir bókhaldstengingu:</b> vantar ${esc(v.join(" og "))}.` : `<b>✓ Tilbúið fyrir bókhald</b> – greiðandi með kennitölu og allar línur með VSK og tekjulykli.`} <button type="button" class="pflink" data-act="rkcsv:${esc(R.id)}">Sækja fyrir bókhald (CSV)</button></div>`;
  };
  function csvOf(R) { const P = pakki(R), q = x => `"${String(x ?? "").replace(/"/g, '""')}"`, n = x => String(x ?? "").replace(".", ",");
    const H = ["Atrium nr.", "Dags.", "Gjalddagi", "Kt. greiðanda", "Greiðandi", "Tilvísun", "Lýsing", "Magn", "Eining", "Einingaverð", "Upphæð án VSK", "VSK %", "VSK", "Tekjulykill", "Flokkur"];
    return "\ufeff" + [H.map(q).join(";"), ...P.linur.map(l => [P.atriumNr, P.dags, P.gjalddagi, P.kaupandi.kt, P.kaupandi.nafn, P.tilvisun, l.lysing, n(l.magn), l.eining, l.einingaverd, l.upphaed, n(l.vsk), l.vskUpphaed, l.lykill, l.flokkur].map(q).join(";"))].join("\r\n"); }

  /* ---------- Síða reiknings ---------- */
  window.rkDetail = function (R) {
    const greitt = R.stada === "Greitt", late = !greitt && daysTo(R.gjalddagi) < 0, ps = pidsOf(R).map(findProj).filter(Boolean), on = window.MS && MS.on();
    return backBar() + `<div class="kicker"><span class="kind">${TT()}</span><span class="pill ${late && !OGILT(R) ? "late" : ""}">${OGILT(R) ? "Ógilt" : greitt ? "Greitt" : late ? "Kominn fram yfir gjalddaga" : "Ógreitt"}</span>${R.bokhaldNr ? `<span class="pill">Í bókhaldi: ${esc(String(R.bokhaldNr))}</span>` : DROG() && !OGILT(R) ? `<span class="pill">Ekki komið í bókhald</span>` : ""}${R.sent ? `<span class="pill">Sendur ${esc(dIS(R.sent))}</span>` : ""}</div>
      <h2 class="big" style="margin-top:6px">${DROG() ? "Drög " : "Nr. "}${esc(String(R.nr))} · ${esc(R.kaupandi?.name || "")}</h2>
      <p class="sub">${ps.map(projLink).join(", ")}${ps.length ? " · " : ""}${(R.pontunIds || []).map(i => PNs().find(x => x.id === i)).filter(Boolean).map(x => `<a class="plink" data-open="tb:${esc(x.id)}">${esc(x.nr)}</a>`).join(", ")}${(R.pontunIds || []).length ? " · " : ""}${esc(kr(R.tot))} með VSK</p>
      <div class="links"><button type="button" class="btn primary" data-act="rkpdf:${esc(R.id)}">Sækja PDF</button><button type="button" class="btn" data-act="rkpv:${esc(R.id)}">Forskoða PDF</button>
        ${R.pdfUrl ? `<a class="btn" href="${esc(R.pdfUrl)}" target="_blank" rel="noopener">📁 Í ${ODN()}</a>` : on && FJ() ? `<button type="button" class="btn" data-act="rkod:${esc(R.id)}">Vista í OneDrive</button>` : ""}
        <button type="button" class="btn" data-act="rkprint:${esc(R.id)}">Prenta</button><button type="button" class="btn" data-act="rkxlsx:${esc(R.id)}">Excel</button>
        ${FJ() && !OGILT(R) ? `${DROG() ? `<button type="button" class="btn" data-act="rkbok:${esc(R.id)}">${R.bokhaldNr ? "Breyta númeri í bókhaldi" : "Skrá í bókhald"}</button>` : ""}<button type="button" class="btn" data-act="rkpaid:${esc(R.id)}">${greitt ? "Merkja ógreitt" : "✓ Merkja greitt"}</button><button type="button" class="btn danger" data-act="rkogilda:${esc(R.id)}">Ógilda</button>` : ""}</div>
      ${DROG() ? `<p class="hint" style="margin-top:8px">${esc(DROG_TXT)} Þegar reikningurinn hefur verið gefinn út þar: <b>Skrá í bókhald</b> og skráðu númerið.</p>` : ""}
      ${FJ() ? rkBkHTML(R) : ""}
      <div class="invwrap">${invoiceHTML(R)}</div>
      ${R.pdfUrl ? `<p class="hint" style="margin-top:8px">PDF vistað í ${ODN()}: ${esc(ORG.od.reikningar.replace(/\//g, " › "))} › ${esc(String(R.dags || "").slice(0, 4))}.${on && FJ() ? ` <a class="plink" data-act="rkod:${esc(R.id)}">Vista aftur</a>` : ""}</p>` : ""}`;
  };
  const rkRow = R => { const greitt = R.stada === "Greitt", late = !greitt && !OGILT(R) && daysTo(R.gjalddagi) < 0, nrs = pidsOf(R).map(findProj).filter(Boolean).map(p => p.nr);
    return lrow("reikn:" + R.id, { lead: `<b>${esc(String(R.nr).slice(-3))}</b><small>nr.</small>`, title: esc(R.kaupandi?.name || ""), sub: esc([nrs.join(", "), dIS(R.dags), R.bokhaldNr ? "Í bókhaldi " + R.bokhaldNr : DROG() && !OGILT(R) ? "Drög" : "", OGILT(R) ? "Ógilt" : greitt ? "Greitt" : late ? "Fram yfir gjalddaga" : "Gjalddagi " + dIS(R.gjalddagi)].filter(Boolean).join(" · ")), right: `<span class="lc">${esc(kr(R.tot))}</span>` }); };
  window.rkList = (pred, title) => { const xs = reikningar().filter(pred || (() => true)).slice().sort((a, b) => (b.nr || 0) - (a.nr || 0));
    return xs.length ? `<div class="viewtitle">${title || "Reikningar"} · ${xs.length}</div>${llist(xs.map(rkRow))}` : ""; };

  window.rkProjSection = function (pid) {
    const { es, ks } = obilled(pid);
    const box = FJ() && (es.length || ks.length) ? `<div class="card rkopen"><div class="sub-i"><span>Óreikningsfært</span><b>${esc(hrs(sumT(es)))}${ks.length ? " + " + esc(kr(sumK(ks))) : ""}</b></div>${MCP ? `<button type="button" class="btn primary" data-act="rknew:${esc(pid)}" style="width:100%;margin-top:10px">Reikningsfæra</button>` : ""}</div>` : "";
    return (box ? `<div class="viewtitle">Reikningsfærsla</div>${box}` : "") + rkList(r => pidsOf(r).includes(pid), "Reikningar verkefnisins");
  };
  window.rkTimarSection = function () {
    const gs = FJ() ? openGroups().sort((a, b) => sumT(b.es) - sumT(a.es)) : [];
    const open = gs.length ? `<div class="viewtitle" style="display:flex;align-items:center;gap:8px">Óreikningsfært${MCP ? `<a class="plink" data-act="rknew:" style="margin-left:auto">+ Nýr reikningur</a>` : ""}</div>${llist(gs.map(g => `<div class="lrow"><div class="lm"><div class="lt">${g.p ? `<span class="nr">${esc(g.p.nr)}</span>&nbsp; ${esc(g.p.stutt)}` : "Án verkefnis (almennt)"}</div><div class="ls">${esc([g.es.length ? hrs(sumT(g.es)) : "", g.ks.length ? kr(sumK(g.ks)) + " kostnaður" : "", rate(g.p) ? "≈ " + kr(sumT(g.es) * rate(g.p) + sumK(g.ks)) + " án VSK" : ""].filter(Boolean).join(" · "))}</div></div>${MCP ? `<button type="button" class="btn" data-act="rknew:${esc(g.k)}" style="flex:none">Reikningsfæra</button>` : ""}</div>`))}` : "";
    return (FJ() ? `<div style="margin-top:14px">${rkOinnheimtCard(true)}</div>` : "") + open + rkList(null, "Reikningar");
  };
  window.rkTag = e => e.reikningur ? (findR(e.reikningur) ? "Reikn. " + findR(e.reikningur).nr : "Reikningsfært") : "";

  window.rkStillingarHTML = function () {
    const r = RK(), f = (k, l, extra = "") => `<label>${l}<input id="rk-${k}" value="${esc(String(r[k] ?? ""))}" ${extra}></label>`;
    return `<div class="viewtitle">Reikningar</div>
      <label>Bókhaldskerfi<select id="rk-bokhald"><option value="">Ekkert tengt – drög færð handvirkt (CSV)</option><option value="dk"${r.bokhald === "dk" ? " selected" : ""}>DK (dkPlus)</option><option value="payday" disabled>Payday – kemur síðar</option></select></label>
      <p class="hint" style="margin:0 0 12px">Lögformlegir reikningar (samfelld númeraröð, ekki eytt, varðveittir í 7 ár) eru gefnir út í bókhaldskerfi. Á meðan ekkert er tengt eru reikningar í Atrium <b>reikningsdrög</b>: grunnur sem er færður í bókhaldskerfið, og númer reikningsins þar er skráð á drögin. Tenging við bókhaldskerfi (t.d. Payday eða DK) verður valmöguleiki hér.</p>
      <p class="hint" style="margin:0 0 8px">Upplýsingar um seljanda sem birtast á reikningum. PDF reikninga vistast í ${ODN()}: ${esc(ORG.od.reikningar.replace(/\//g, " › "))} › ár.</p>
      ${f("nafn", "Nafn seljanda")}
      <div class="two">${f("kt", "Kennitala", 'inputmode="numeric" placeholder="000000-0000"')}${f("vsknr", "VSK-númer", 'inputmode="numeric"')}</div>
      ${f("heimilisfang", "Heimilisfang", 'placeholder="Gata 1, 101 Reykjavík"')}
      <div class="two">${f("netfang", "Netfang", 'type="email"')}${f("simi", "Sími", 'inputmode="tel"')}</div>
      ${f("banki", "Bankareikningur", 'placeholder="0000-26-000000"')}
      <div class="two">${f("timagjald", "Sjálfgefið tímagjald (kr./klst.)", 'inputmode="numeric"')}${f("vsk", "VSK %", 'inputmode="decimal"')}</div>
      <div class="two">${f("frestur", "Greiðslufrestur (dagar)", 'inputmode="numeric"')}${f("nastaNr", DROG() ? "Næsta númer draga" : "Næsta reikningsnúmer", 'inputmode="numeric"')}</div>
      ${window.ON && ON("pantanir") ? `<label style="flex-direction:row;align-items:center;gap:8px;color:var(--ink);margin-top:6px"><input type="checkbox" id="rk-sjalfvirkt"${r.sjalfvirkt !== false ? " checked" : ""} style="width:auto"> Reikningsdrög myndast sjálfkrafa úr pöntunum</label>
      <p class="hint" style="margin:0 0 8px">Viðskiptavinur í reikningi: drög verða til þegar pöntun er staðfest, uppfærast með henni og eru tilbúin við skil. Staðgreitt: greiddur reikningur (kvittun) þegar greiðsla er skráð. Gildir um pantanir frá ${esc(r.sjalfFra ? dIS(r.sjalfFra) : "deginum í dag")}.</p>
      ${r.bokhald === "dk" ? `<label style="flex-direction:row;align-items:center;gap:8px;color:var(--ink)"><input type="checkbox" id="rk-dkSjalf"${r.dkSjalf ? " checked" : ""} style="width:auto"> Senda tilbúin drög sjálfkrafa í DK (ef ekkert vantar)</label>` : ""}` : ""}
      ${r.bokhald === "dk" ? (() => { const d = { ...(r.dk || {}) }, fd = (k, l, ph = "") => `<label>${l}<input id="rk-dk-${k}" value="${esc(String(d[k] ?? ""))}" placeholder="${esc(ph)}"></label>`;
        return `<div class="viewtitle" style="margin-top:22px">DK (dkPlus)</div>
        <p class="hint" style="margin:0 0 8px">„Senda í DK“ á reikningsdrögum stofnar viðskiptavin (eftir kennitölu) og sölureikning í DK. Aðgangslykillinn úr dkPlus er geymdur á netþjóninum (Secret Manager), aldrei í appinu. Gildin hér fást hjá bókara úr DK.</p>
        <div class="two">${fd("solumadur", "Sölumaður (númer í DK)", "t.d. 1")}${fd("lykill", "Viðskiptamannaflokkur / lykill", "t.d. 1")}</div>
        <div class="two">${fd("mati", "Greiðslumáti – reikningur", "t.d. MI")}${fd("skilmali", "Greiðsluskilmálar – reikningur", "t.d. 14")}</div>
        <div class="two">${fd("stadgKt", "Staðgreiðsluviðskiptavinur (nr. í DK)", "notaður ef kennitölu vantar")}${fd("grId", "Greiðslumáti staðgreiðslu – auðkenni", "t.d. 10")}</div>
        <div class="two">${fd("grNafn", "Greiðslumáti staðgreiðslu – heiti", "t.d. Posi")}${fd("stadgMati", "Greiðslumáti (Mode) staðgreiðslu", "t.d. ST")}</div>
        <label style="flex-direction:row;align-items:center;gap:8px;color:var(--ink)"><input type="checkbox" id="rk-dk-post"${d.post ? " checked" : ""} style="width:auto"> DK sendir reikninginn á netfang greiðanda</label>`; })() : ""}
      <div class="viewtitle" style="margin-top:22px">Bókhaldsflokkar</div>
      <p class="hint" style="margin:0 0 8px">Hver lína á reikningi fær flokk. Hér er VSK og tekjulykill (bókhaldslykill eða vörunúmer í bókhaldskerfinu) fyrir hvern flokk – sama hvort tengt verður við Payday eða DK. Autt VSK = VSK fyrirtækisins (${esc(String(r.vsk))} %).${r.bokhald === "dk" ? " <b>Í DK ræður varan VSK-flokknum</b> – VSK hér verður að passa við VSK vörunnar í DK, svo upphæðir á drögum og í DK stemmi." : ""}</p>
      <div class="rkfl">${FLOKKAR.map(([k, l]) => { const f = (r.flokkar || {})[k] || {}; return `<div class="rkflr"><span>${esc(l)}</span><select id="rk-f-${k}-vsk" aria-label="VSK ${esc(l)}"><option value="">Sjálfgefið (${esc(String(r.vsk))} %)</option>${[24, 11, 0].map(v => `<option value="${v}"${f.vsk !== "" && f.vsk != null && +f.vsk === v ? " selected" : ""}>${v} %</option>`).join("")}</select><input id="rk-f-${k}-lykill" value="${esc(f.lykill || "")}" placeholder="${r.bokhald === "dk" ? "Vörunúmer í DK" : "Tekjulykill, t.d. 3100"}" aria-label="${r.bokhald === "dk" ? "Vörunúmer í DK" : "Tekjulykill"} ${esc(l)}"></div>`; }).join("")}</div>
      <button type="button" class="btn" data-act="rkcfg" style="margin-top:8px">Vista upplýsingar</button>`;
  };

  window.rkAct = function (k, r) {
    const id = r.join(":");
    if (["rknew", "rkpn", "rkdk", "rkod", "rksend", "rkpaid", "rkdel", "rkogilda", "rkbok", "rkcfg"].includes(k) && !FJ()) return toast("Aðeins admin og bókari geta breytt reikningum.");
    if (k === "rknew") { openForm(id || null); return; }
    if (k === "rkpn") { billOrders(id); return; }
    if (k === "rkdk") { const R = findR(id); if (!R) return; const v = vidbunadur(R); if (v.length) return toast("Vantar: " + v.join(", "));
      if (!confirm(`Senda drög ${R.nr} (${kr(R.tot)}) í DK?\n\nDK gefur út reikninginn með sínu númeri${DKC().post ? " og sendir hann greiðanda í tölvupósti" : ""}.`)) return;
      saveSnapshot(s => { const q = (s.reikningar || []).find(x => x.id === id); if (q) q.bokhald = { kerfi: "dk", stada: "bidur", beidni: new Date().toISOString(), af: window.USER?.email || "" }; }).then(() => toast("Sendist í DK…")); return; }
    if (k === "rkcsv") { const R = findR(id); if (!R) return; const b = new Blob([csvOf(R)], { type: "text/csv;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = fileBase(R) + " – bókhald.csv"; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("CSV sótt"); return; }
    if (k === "rkvb") { const R = findR(id); if (!R) return; const v = vidbunadur(R); toast(v.length ? "Vantar: " + v.join(", ") : "Tilbúið fyrir bókhald"); return; }
    if (k === "rkpdf") { const R = findR(id); if (R) downloadPdf(R); return; }
    if (k === "rkpv") { const R = findR(id); if (!R) return; toast("Bý til PDF…"); invoicePdf(R).then(b => blobPreview(new Blob([b], { type: "application/pdf" }), fileBase(R) + ".pdf")).catch(e => toast("PDF tókst ekki: " + (e?.message || e))); return; }
    if (k === "rkod") { toast("Vista í " + ODN() + "…"); saveToOneDrive(id, false); return; }
    if (k === "rksend") { const R = findR(id); if (!R || !window.poCompose) return; toast("Bý til PDF…"); invoicePdf(R).then(bytes => { const s = R.seljandi || {};
      poCompose({ to: R.kaupandi?.netfang || "", subject: `${NRL(R)} frá ${s.nafn || ORG.nafn}`, pid: pidsOf(R)[0] || null,
        body: `Góðan dag,

Meðfylgjandi ${DROG() ? "eru reikningsdrög nr." : "er reikningur nr."} ${R.nr} að upphæð ${kr(R.tot)} með gjalddaga ${dIS(R.gjalddagi)}.${s.banki ? `
Greiðist inn á reikning ${s.banki}${s.kt ? ", kt. " + s.kt : ""}.` : ""}`,
        atts: [{ name: fileBase(R) + ".pdf", type: "application/pdf", size: bytes.length, data: bytes }],
        onSent: () => saveSnapshot(st => { const q = (st.reikningar || []).find(x => x.id === id); if (q) q.sent = isoDay(new Date()); }) }); }).catch(e => toast("PDF tókst ekki: " + (e?.message || e))); return; }
    if (k === "rkprint") { const R = findR(id); if (R) printInv(R); return; }
    if (k === "rkxlsx") { const R = findR(id); if (R) invXlsx(R); return; }
    if (k === "rkpaid") { saveSnapshot(s => { const q = (s.reikningar || []).find(x => x.id === id); if (q) { q.stada = q.stada === "Greitt" ? "Ógreitt" : "Greitt"; q.greitt = q.stada === "Greitt" ? isoDay(new Date()) : null; } }).then(() => toast("Staða reiknings uppfærð")); return; }
    if (k === "rkbok") { const R = findR(id); if (!R) return; const v = prompt(`Númer reikningsins í bókhaldskerfinu (fyrir drög ${R.nr}):`, R.bokhaldNr || ""); if (v === null) return;
      saveSnapshot(s => { const q = (s.reikningar || []).find(x => x.id === id); if (q) { q.bokhaldNr = v.trim() || null; q.bokhaldDags = v.trim() ? isoDay(new Date()) : null; } }).then(() => toast(v.trim() ? "Skráð í bókhald" : "Bókhaldsnúmer fjarlægt")); return; }
    if (k === "rkogilda") { const R = findR(id); if (!R || !confirm(`Ógilda ${NRL(R).toLowerCase()}?\n\nDrögin haldast skráð (merkt ógild) en tímarnir og kostnaðurinn verða aftur óreikningsfærð.${R.bokhaldNr ? "\n\nATH: reikningurinn er skráður í bókhaldi (" + R.bokhaldNr + ") – þar þarf að gefa út kreditreikning." : ""}`)) return;
      saveSnapshot(s => { const q = (s.reikningar || []).find(x => x.id === id); if (q) { q.stada = "Ógilt"; q.ogilt = isoDay(new Date()); } const T = s.timar || {}; [...(T.faerslur || []), ...(T.nyjast || [])].forEach(e => { if (e.reikningur === id) delete e.reikningur; }); (s.kostnadur || []).forEach(x => { if (x.reikningur === id) delete x.reikningur; }); (s.pantanir || []).forEach(x => { if (x.reikningur === id) delete x.reikningur; }); })
        .then(() => toast("Ógilt – tímar, kostnaður og pantanir aftur óreikningsfærð")); return; }
    if (k === "rkdel" && window.can && !can("eyda")) return toast("Aðeins admin getur eytt reikningum.");
    if (k === "rkdel") { const R = findR(id); if (!R || !confirm(`Eyða reikningi nr. ${R.nr}?\n\nTímarnir og kostnaðurinn verða aftur óreikningsfærð.${R.pdfUrl ? "\nPDF-skjalið í OneDrive eyðist ekki." : ""}`)) return;
      rkDelMany([id]).then(() => { toast("Reikningi eytt"); goBack(); }); return; }
    if (k === "rkcfg") { const g = x => (document.getElementById("rk-" + x)?.value || "").trim(), n = x => parseFloat(g(x).replace(",", ".")) || 0;
      const o = { nafn: g("nafn"), kt: g("kt"), vsknr: g("vsknr"), heimilisfang: g("heimilisfang"), netfang: g("netfang"), simi: g("simi"), banki: g("banki"), timagjald: parseKr(g("timagjald")), vsk: n("vsk"), frestur: Math.round(n("frestur")) || 14, nastaNr: Math.round(n("nastaNr")) || 1001, bokhald: g("bokhald") || null,
        flokkar: Object.fromEntries(FLOKKAR.map(([k]) => [k, { vsk: g("f-" + k + "-vsk"), lykill: g("f-" + k + "-lykill") }])) };
      ["sjalfvirkt", "dkSjalf"].forEach(x => { const el = document.getElementById("rk-" + x); if (el) o[x] = el.checked; });
      if (document.getElementById("rk-dk-solumadur")) o.dk = { ...Object.fromEntries(["solumadur", "lykill", "mati", "skilmali", "stadgKt", "grId", "grNafn", "stadgMati"].map(x => [x, g("dk-" + x)])), post: !!document.getElementById("rk-dk-post")?.checked };
      saveSnapshot(s => { s.stillingar = s.stillingar || {}; s.stillingar.reikn = { ...(s.stillingar.reikn || {}), ...o }; }).then(() => { toast("Upplýsingar um seljanda vistaðar"); render(); }); return; }
  };
  window.rkPdfBytes = invoicePdf;
  // 2.113.2: eyða reikningum (einum eða mörgum, t.d. úr lista) – tímar, kostnaður og pantanir verða aftur óreikningsfærð.
  // Pöntun sem missir sjálfvirk drög fær ekki ný sjálfkrafa (rkEytt) – „Búa til reikning“ er áfram í boði.
  window.rkDelMany = ids => { const I = new Set(ids.map(String)); return saveSnapshot(s => { s.reikningar = (s.reikningar || []).filter(x => !I.has(String(x.id)));
    const T = s.timar || {}; [...(T.faerslur || []), ...(T.nyjast || [])].forEach(e => { if (I.has(String(e.reikningur))) delete e.reikningur; });
    (s.kostnadur || []).forEach(x => { if (I.has(String(x.reikningur))) delete x.reikningur; });
    (s.pantanir || []).forEach(q => { if (I.has(String(q.reikningur))) { delete q.reikningur; q.rkEytt = true; } }); }); };
})();
