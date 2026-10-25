/* Leiga og Sala (frá 2.4.0; aðskildar deildir frá 2.5.0): tvær einingar, hvor með sinn vörulista og sín tilboð.
   Sjálfgefið óvirkar – uppsetning (fyrirtaeki.js › einingar: { leiga: true, sala: true }) eða admin kveikir á þeim.
   Gögn (Firestore-söfn, sjá gogn.js) – sömu söfn, aðgreind með reitnum deild:
   - vorur/{id}: { deild: leiga|sala, nr, heiti, flokkur, tegund (leiga: leiga|pakki|vinna; sala: sala|vinna), eining,
                   leiguverd (kr. á dag), soluverd, innkaupsverd, fjoldi, lysing, innihald: [{ v, m }] (pakki), prufa }
   - tilbod/{id}: { deild, nr (L-… / S-…), heiti, vskId, vidskiptavinur, tengilidur, netfang, stadsetning, fra, til (leiga),
                    gildir, dags, stada: Drög|Sent|Samþykkt|Hafnað, sent, utgafa, eldri: [{ utgafa, dags, net }], afsl (%), athugasemd,
                    linur: [{ id, v, heiti, teg: leiga|sala|vinna, hl (hluti), magn, ein, verd, dagar, afsl }], verkefniId, prufa }
   - S.stillingar.tilbod: { flokkarL, flokkarS, studlar (dagstuðlar leigu), vsk, gildisdagar, nastaNrL, nastaNrS, skilmalarL, skilmalarS }
   Leigulína = magn × verð × dagstuðull(dagar) × (1 − afsl.); sölu- og vinnulína = magn × verð × (1 − afsl.).
   Prufugögn (prufa: true) má hlaða inn og eyða í einu lagi (vörulisti, admin).
   - pantanir/{id} (2.20.0, eining „pantanir“): { pontun: true, nr (P-…), deild: "blandad", heiti, vskId, vidskiptavinur, tengilidur, simi, netfang,
                    uppruni: simi|postur|shopify|vefur|stadur|tilbod|annad, ytriNr (t.d. Shopify-pöntunarnúmer), fra (afhending), til (skil),
                    stada: Ný|Staðfest|Afhent|Skilað|Lokið, afsl, athugasemd, linur (sama snið og tilboð), verkefniId, tilbodId, dags, prufa }
     Sama ritill og línur og blandað tilboð. Shopify síðar: milliliður (t.d. Cloud Function) skrifar pantanir/{shopify-<id>} með uppruni "shopify" og ytriNr.
   Frátekning (2.20.0): samþykkt tilboð og opnar pantanir (Ný, Staðfest, Afhent) taka frá leigubúnað frá–til (pakkar leystir upp í innihald);
   tilboð sem pöntun hefur verið stofnuð úr telst ekki aftur. Árekstur = þörf + frátekið annars staðar > fjöldi til. */
(function () {
  const VR = () => S?.vorur || [], TB = () => S?.tilbod || [];
  const PN = () => S?.pantanir || [];
  const findV = id => VR().find(x => x.id === id), findT = id => TB().find(x => x.id === id) || PN().find(x => x.id === id);
  // Deild vöru (eldri færslur án deildar: sala → sala, annað → leiga)
  const vDeild = v => v.deild || (v.tegund === "sala" ? "sala" : "leiga");
  const tDeild = T => T.deild === "sala" ? "sala" : "leiga";
  // Ein tilboðsvél (2.17.0, ORG.pakkaval): blandað tilboð (deild „blandad“, T-númer) með þjónustu-, leigu-, sölu-, pakka- og sérlínum.
  // Hagar sér eins og leigutilboð (frá–til fyrir leigulínur); línur úr báðum vörulistum og þjónusta úr verðskrá.
  const PV = () => !!window.ORG?.pakkaval, isMix = T => T?.deild === "blandad", DK = T => isMix(T) ? "blandad" : tDeild(T);
  const DL = {
    leiga: { l: "Leiga", pre: "L-", vt: "lvorur", tt: "ltilbod", vl: "Búnaður", vl1: "Búnaður", ein: "leiga", tegs: ["leiga", "pakki", "vinna"] },
    sala: { l: "Sala", pre: "S-", vt: "svorur", tt: "stilbod", vl: "Vörur", vl1: "Vara", ein: "sala", tegs: ["sala", "vinna"] },
    blandad: { l: "Tilboð", pre: "T-", vt: "lvorur", tt: "ltilbod", vl: "Búnaður og vörur", vl1: "Vara", ein: "leiga", tegs: ["leiga", "pakki", "sala", "vinna"] }
  };
  const VRd = D => VR().filter(v => vDeild(v) === D), TBd = D => TB().filter(T => tDeild(T) === D);
  const DEF = {
    flokkarL: ["Hljóð", "Ljós", "LED", "Skjáir", "Annað"], flokkarS: ["Hátalarar", "Magnarar og stýring", "Hljóðnemar", "Skjáir", "Uppsetningarefni", "Annað"],
    studlar: [1, 1.5, 2, 2.5, 3, 3.25, 3.5], vsk: 24, gildisdagar: 14, nastaNrL: 1001, nastaNrS: 1001, nastaNrT: 1001,
    skilmalarL: "Öll verð eru án VSK. Leiguverð miðast við tímabilið sem tilgreint er. Flutningur, uppsetning og tæknimenn eru aðeins innifalin ef þau koma fram í tilboðinu. Leigutaki ber ábyrgð á búnaði frá afhendingu til skila.",
    skilmalarS: "Öll verð eru án VSK. Afhendingartími er háður lagerstöðu birgja. Uppsetning og frágangur eru aðeins innifalin ef þau koma fram í tilboðinu. Greiðsluskilmálar: 14 dagar frá reikningsdegi."
  };
  // Eldri stillingar (2.4.0: flokkar, nastaNr, skilmalar) gilda fyrir Leigu
  const CF = () => { const c = (typeof CFG === "function" && CFG().tilbod) || {}; return { ...DEF, ...(c.flokkar ? { flokkarL: c.flokkar } : {}), ...(c.nastaNr ? { nastaNrL: c.nastaNr } : {}), ...(c.skilmalar ? { skilmalarL: c.skilmalar } : {}), ...c }; };
  const nK = D => D === "sala" ? "nastaNrS" : D === "blandad" ? "nastaNrT" : "nastaNrL";
  const FLOKKAR = D => { const f = (D === "sala" ? CF().flokkarS : CF().flokkarL) || []; const extra = [...new Set(VRd(D).map(v => v.flokkur).filter(Boolean))].filter(x => !f.includes(x)); return f.concat(extra); };
  const TEG = { leiga: "Búnaður til leigu", sala: "Vara til sölu", baedi: "Búnaður til leigu", vinna: "Vinna og þjónusta", pakki: "Pakki" };
  const LTEG = { leiga: "Leiga", sala: "Sala", vinna: "Vinna" }; const lteg = k => (k === "vinna" && window.ORG?.pakkaval ? "Þjónusta" : LTEG[k]);
  const STADA = ["Drög", "Sent", "Samþykkt", "Hafnað"], STC = { "Drög": "pc-slate", "Sent": "pc-blue", "Samþykkt": "pc-teal", "Hafnað": "pc-red" };
  const ADM = () => !window.can || can("stillingar");
  const DEL = () => !window.can || can("eyda");
  const n0 = v => { const x = parseFloat(String(v ?? "").replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return isFinite(x) ? x : 0; };
  const fx = n => String(Math.round((+n || 0) * 100) / 100).replace(".", ",");
  const krs = n => num(Math.round(+n || 0)) + " kr.";
  const gid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(16) + Math.random().toString(16).slice(2)).replace(/-/g, "");
  const dOf = iso => { const [y, m, dd] = String(iso || "").slice(0, 10).split("-").map(Number); return y ? new Date(y, m - 1, dd) : null; };

  /* ---------- Útreikningar ---------- */
  const tbDagar = T => { const a = dOf(T?.fra), b = dOf(T?.til) || a; if (!a) return 1; return Math.max(1, Math.round((b - a) / 864e5) + 1); };
  const studull = d => { const s = (CF().studlar || DEF.studlar).map(Number).filter(x => x > 0); d = Math.max(1, Math.round(+d || 1)); if (!s.length) return d;
    return d <= s.length ? s[d - 1] : s[s.length - 1] + 0.25 * (d - s.length); };
  const lDagar = (l, T) => l.teg === "leiga" ? (+l.dagar || tbDagar(T)) : null;
  const lSum = (l, T) => { let b = (+l.magn || 0) * (+l.verd || 0); if (l.teg === "leiga") b *= studull(lDagar(l, T)); return Math.round(b * (1 - (+l.afsl || 0) / 100)); };
  const vskP = () => +CF().vsk;
  function totals(T) {
    const o = { leiga: 0, sala: 0, vinna: 0 }; (T.linur || []).forEach(l => { o[l.teg in o ? l.teg : "sala"] += lSum(l, T); });
    const brutto = o.leiga + o.sala + o.vinna, afsl = Math.round(brutto * (+T.afsl || 0) / 100), net = brutto - afsl, vsk = Math.round(net * vskP() / 100);
    return { ...o, brutto, afsl, net, vsk, tot: net + vsk };
  }
  window.tbTotals = totals;

  /* ---------- Pantanir og frátekning búnaðar (2.20.0) ---------- */
  const isP = T => !!T?.pontun;
  const PSTADA = ["Ný", "Staðfest", "Afhent", "Skilað", "Lokið"], PSTC = { "Ný": "pc-blue", "Staðfest": "pc-teal", "Afhent": "pc-amber", "Skilað": "pc-slate", "Lokið": "pc-gray" };
  const UPPRUNI = [["simi", "Sími"], ["postur", "Tölvupóstur"], ["shopify", "Shopify"], ["vefur", "Vefur"], ["stadur", "Á staðnum"], ["tilbod", "Tilboð"], ["annad", "Annað"]];
  const UPL = k => (UPPRUNI.find(x => x[0] === k) || [null, ""])[1];
  // 2.69.2: aðeins leigubúnaði er skilað – pöntun með söluvörum/þjónustu eingöngu fer Afhent → Lokið (ekkert „Taka á móti“)
  const pnSkil = P => (P?.linur || []).some(l => l.teg === "leiga") || (!(P?.linur || []).length && (P?.svid || []).includes("Leiga")); window.pnSkil = pnSkil;
  const STOD = T => isP(T) ? (pnSkil(T) || T.stada === "Skilað" ? PSTADA : PSTADA.filter(s => s !== "Skilað")) : STADA, STCOL = T => (isP(T) ? PSTC : STC)[T.stada] || "";
  const PNON = () => PV() && !!window.ON && ON("pantanir");
  const blokkar = T => isP(T) ? ["Ný", "Staðfest", "Afhent"].includes(T.stada) : T.stada === "Samþykkt" && !PN().some(P => P.tilbodId === T.id);
  // Leigubúnaður sem skjal þarf (pakkar leystir upp): { vId: magn }
  const tharfir = T => { const o = {}; (T.linur || []).forEach(l => { if (l.teg !== "leiga" || !l.v) return; const v = findV(l.v); if (!v) return; const m = +l.magn || 0;
      if (v.tegund === "pakki") (v.innihald || []).forEach(i => { if (i.v) o[i.v] = (o[i.v] || 0) + m * (+i.m || 1); }); else if (v.tegund !== "vinna") o[v.id] = (o[v.id] || 0) + m; }); return o; };
  const tilOf = T => T.til && T.til >= T.fra ? T.til : T.fra;
  let _bk = null, _bkS = null;
  const bokanir = () => { if (_bk && _bkS === S) return _bk; _bkS = S; _bk = [];
    [...TB(), ...PN()].filter(T => T.fra && blokkar(T)).forEach(T => Object.entries(tharfir(T)).forEach(([v, m]) => { if (m > 0) _bk.push({ v, m, fra: T.fra, til: tilOf(T), T }); }));
    return _bk; };
  const dagar = (fra, til) => { const a = dOf(fra), b = dOf(til || fra) || a, out = []; if (!a) return out; for (let d = new Date(a), i = 0; d <= b && i < 370; d.setDate(d.getDate() + 1), i++) out.push(isoDay(d)); return out; };
  // Frátekið magn vöru á tímabili (hæsta dagsgildi), án skjalsins exId
  const upptekid = (vId, fra, til, exId) => { const bs = bokanir().filter(b => b.v === vId && b.T.id !== exId && b.fra <= (til || fra) && b.til >= fra); let max = 0;
    if (bs.length) dagar(fra, til).forEach(d => { const x = bs.reduce((a, b) => a + (b.fra <= d && b.til >= d ? b.m : 0), 0); if (x > max) max = x; });
    return { max, bs }; };
  const arekstrar = T => { if (!T?.fra) return []; const til = tilOf(T);
    return Object.entries(tharfir(T)).map(([vId, need]) => { const v = findV(vId); if (!v) return null; const u = upptekid(vId, T.fra, til, T.id), fj = +v.fjoldi || 0;
      return need + u.max > fj ? { v, need, fj, laus: Math.max(0, fj - u.max), docs: [...new Map(u.bs.map(b => [b.T.id, b.T])).values()] } : null; }).filter(Boolean); };
  const arekHTML = T => { const a = arekstrar(T); if (!a.length) return "";
    return `<div class="card arek"><b>⚠ Búnaður ekki laus ${esc(dRange(T))}</b>${a.map(x => `<div class="arek-r"><span><b>${esc(x.v.heiti)}</b>: ${esc(fx(x.need))} ${isP(T) ? "í pöntuninni" : "á tilboðinu"} – ${x.laus ? "aðeins " + esc(fx(x.laus)) + " laus" : "ekkert laust"} af ${esc(fx(x.fj))}</span>${x.docs.length ? `<span class="ls">Frátekið í ${x.docs.map(D => `<a class="plink" data-open="tb:${esc(D.id)}">${esc(D.nr)}</a> ${esc(D.heiti || D.vidskiptavinur || "")} (${esc(dRange(D))})`).join(", ")}</span>` : ""}</div>`).join("")}</div>`; };
  const arekTxt = T => arekstrar(T).map(x => `• ${x.v.heiti}: ${fx(x.need)} þarf, ${fx(x.laus)} laus af ${fx(x.fj)}${x.docs.length ? " (frátekið í " + x.docs.map(D => D.nr).join(", ") + ")" : ""}`).join("\n");
  // Fyrir Heim (2.21.1): skjöl sem taka frá búnað (samþykkt tilboð, opnar pantanir) og opnar pantanir
  window.utlDocs = () => [...new Map(bokanir().map(b => [b.T.id, b.T])).values()].map(T => ({ T, fra: T.fra, til: tilOf(T), nr: T.nr, heiti: T.heiti || T.vidskiptavinur || "", vsk: T.vidskiptavinur || T.tengilidur || "", P: isP(T) }));
  // Útlit I (2.23.2): aðgangur fyrir Vörulisti › Yfirlit og undirflipa tilboða (Leiga · Sala · Þjónusta)
  // Sala sem hefur átt sér stað (2.38.1): samþykkt tilboð sem ekki urðu að pöntun + staðfestar/afhentar/skilaðar/lokið pantanir – hver sala talin einu sinni.
  // Upphæðir án VSK og eftir afslátt (líka afslátt á öllu skjalinu).
  const PSELD = ["Staðfest", "Afhent", "Skilað", "Lokið"];
  // 2.41.0: þar sem Pantanir eru virkar verður samþykkt tilboð með búnaði eða vörum að pöntun – það telst sem sala í gegnum pöntunina.
  // Tilboð með eingöngu vinnu verða að verkefni og teljast sem sala þegar þau eru samþykkt. Án Pantana (t.d. Sonik) telst samþykkt tilboð sem sala.
  const vinnaEin = T => (T.linur || []).length > 0 && (T.linur || []).every(l => l.teg === "vinna");
  const vantarPontun = T => !isP(T) && T.stada === "Samþykkt" && PNON() && !vinnaEin(T) && !PN().some(P => P.tilbodId === T.id);
  const seld = () => [...TB().filter(T => T.stada === "Samþykkt" && !PN().some(P => P.tilbodId === T.id) && (!PNON() || vinnaEin(T))), ...PN().filter(P => PSELD.includes(P.stada))];
  const netLine = (l, T) => Math.round(lSum(l, T) * (1 - (+T.afsl || 0) / 100));
  window.salaAPI = { pdf: T => tbPdf(T), fileBase: T => fileBase(T), stTxt: T => stTxt(T), TB, VR, PN, lSum, totals, seld, vinnaEin, vantarPontun, netLine, netOf: T => totals(T).net, bokanir, upptekid, vDeild, studull: d => studull(d), lineFrom: (v, T) => lineFrom(v, T), saveT: (id, fn) => saveT(id, fn), tbForm: (D, pre) => tbForm(D, pre), pnForm: pre => pnForm(pre), tbLina: f => { TL.f = f || ""; }, arekstrar: T => arekstrar(T), findV: id => findV(id), CF: () => (S?.stillingar?.tilbod || {}) };
  window.pnOpnar = () => PNON() ? PN().filter(P => !["Skilað", "Lokið"].includes(P.stada)) : [];
  // Laust á tímabili skjals (fyrir valglugga): pakki = hve margir heilir pakkar
  const lausFyrir = (v, T) => { if (!T?.fra || vDeild(v) !== "leiga" || v.tegund === "vinna") return null; const til = tilOf(T), mine = tharfir(T);
    const one = (id, per) => { const x = findV(id); if (!x) return 0; return Math.floor((Math.max(0, (+x.fjoldi || 0) - upptekid(id, T.fra, til, T.id).max - (mine[id] || 0))) / (per || 1)); };
    return v.tegund === "pakki" ? Math.min(...((v.innihald || []).length ? v.innihald.map(i => one(i.v, +i.m || 1)) : [0])) : one(v.id, 1); };
  // Hlutar tilboðs í þeirri röð sem þeir birtast fyrst
  const groups = T => { const m = new Map(); (T.linur || []).forEach(l => { const k = l.hl || "Annað"; if (!m.has(k)) m.set(k, []); m.get(k).push(l); }); return [...m.entries()]; };
  const vPrice = v => v.tegund === "sala" || v.tegund === "vinna" || vDeild(v) === "sala" ? v.soluverd : v.leiguverd;
  const lineFrom = (v, T) => { const D = T && !isMix(T) ? tDeild(T) : vDeild(v), teg = v.tegund === "vinna" ? "vinna" : D === "sala" ? "sala" : "leiga";
    return { id: gid(), v: v.id, heiti: v.heiti, teg, hl: v.tegund === "vinna" ? "Vinna og þjónusta" : (v.flokkur || "Annað"), magn: 1, ein: v.eining || (teg === "vinna" ? "klst." : "stk."), verd: +(teg === "leiga" ? v.leiguverd : v.soluverd) || 0, dagar: null, afsl: 0 }; };
  // 2.78.0: línur úr sniðmáti eða eldra tilboði/pöntun – ný auðkenni, núgildandi verð úr vörulista, leigudagar fylgja nýja skjalinu
  const baseLines = (B, T) => (B?.linur || []).filter(l => !l.aukagjald).map(l => { const v = l.v ? findV(l.v) : null, n = v ? lineFrom(v, T) : null;
    return { ...l, id: gid(), ...(n ? { verd: n.verd, heiti: l.heiti || n.heiti } : {}), dagar: l.teg === "leiga" ? null : l.dagar ?? null }; });
  const applyBase = (T, B) => { if (!B) return; T.linur = baseLines(B, T); T.afsl = +B.afsl || 0; T.athugasemd = B.athugasemd || null; if (!T.stadsetning && B.stadsetning) T.stadsetning = B.stadsetning;
    T.ur = { src: B.src || "", id: B.id || null, nr: B.nr || null, heiti: B.snHeiti || null }; };
  // 2.78.2: ný pöntun opnast alltaf undir Pantanir (ekki á flipanum sem stofnað var frá); tóm pöntun í breytingaham, annars pöntunarsíðan
  window.pnOpenNew = P => { try { if (!/^(pantanir|pnl|pns|pnt)$/.test(tab)) tab = "pantanir"; window.STSUB = null; } catch (e) {}
    EDT = (P.linur || []).length ? null : structuredClone(P); openDetail("tb:" + P.id); };
  // Val efst í „Nýtt tilboð“ / „Ný pöntun“: autt, sniðmát eða afrit af eldra (snidmat.js sér um gluggann)
  const byrjaHTML = () => window.snPick ? `<div class="snbyrja" id="snb"><span class="snbl">Byrja út frá</span><button type="button" class="uchip on" data-snb="">Autt</button><button type="button" class="uchip" data-snb="snid">Sniðmát…</button><button type="button" class="uchip" data-snb="afrit">Eldra tilboð eða pöntun…</button></div>` : "";
  function wireByrja(kind, B0, fill) { const box = document.getElementById("snb"); if (!box) return () => B0 || null; let B = B0 || null;
    const draw = () => { box.querySelectorAll("[data-snb]").forEach(x => x.classList.toggle("on", B ? x.dataset.snb === (B.src === "snid" ? "snid" : "afrit") : x.dataset.snb === "")); box.querySelector(".snbx")?.remove();
      if (B) box.insertAdjacentHTML("beforeend", `<span class="snbx">${esc(B.snHeiti || [B.nr, B.heiti].filter(Boolean).join(" "))} · ${(B.linur || []).filter(l => !l.aukagjald).length} línur</span>`); };
    box.addEventListener("click", async e => { const b = e.target.closest("[data-snb]"); if (!b) return; const m = b.dataset.snb; if (!m) { B = null; draw(); return; }
      const r = await window.snPick(kind, m); if (r) { B = r; fill(r); draw(); } });
    if (B) { fill(B); draw(); } return () => B; }
  const pakkiTxt = v => (v?.innihald || []).map(i => { const x = findV(i.v); return x ? (+i.m || 1) + " × " + x.heiti : null; }).filter(Boolean).join(", ");
  const dRange = T => !T.fra ? "" : tDeild(T) === "sala" ? "Afhending " + dIS(T.fra) : dIS(T.fra) + (T.til && T.til !== T.fra ? " – " + dIS(T.til) : "");
  const chip = (act, l, on) => `<button type="button" class="chipbtn" data-act="${act}" aria-pressed="${on}">${esc(l)}</button>`;

  /* ---------- Vörulisti (hvor deild sinn) ---------- */
  const VF = { leiga: "", sala: "" }, VK = { leiga: "", sala: "" }; let VQ = "";
  const vMatch = D => v => (!VF[D] || v.tegund === VF[D] || (VF[D] === "leiga" && v.tegund === "baedi")) && (!VK[D] || v.flokkur === VK[D]);
  const vRight = v => { const D = vDeild(v), p = [];
    if (D === "leiga" && v.tegund !== "vinna" && +v.leiguverd) p.push(krs(v.leiguverd) + "/dag");
    if ((D === "sala" || v.tegund === "vinna") && +v.soluverd) p.push(krs(v.soluverd) + (v.tegund === "vinna" ? "/" + String(v.eining || "klst.").replace(/\.$/, "") : ""));
    return `<span class="lc">${esc(p.join(" · "))}</span>`; };
  const vRow = v => lrow("vara:" + v.id, { title: esc(v.heiti) + (v.prufa ? ' <span class="tag">prufa</span>' : "") + (v.listi ? ' <span class="tag">listi</span>' : ""), sub: esc([v.nr, v.flokkur, v.tegund === "pakki" ? "Pakki · " + pakkiTxt(v) : v.tegund === "vinna" ? "Vinna og þjónusta" : (+v.fjoldi ? num(v.fjoldi) + " " + (v.eining || "stk.") + (vDeild(v) === "sala" ? " á lager" : " til") : "")].filter(Boolean).join(" · ")), right: vRight(v) })
    .replace('class="lrow tap"', `class="lrow tap" data-s="${esc((v.heiti + " " + (v.nr || "") + " " + (v.flokkur || "") + " " + (v.lysing || "")).toLowerCase())}"`);
  // Vinna og þjónusta (2.18.3, pakkaval): eigin listi – úr báðum vörulistum (tegund „vinna“); Búnaður og Vörur sýna þá aðeins hluti
  // Flokkað eftir tegund/flokki (2.19.2): fyrirsögn á hvern flokk þegar „Allir flokkar“ er valið
  const grpList = (xs, order) => { const fk = [...new Set(xs.map(v => v.flokkur || "Án flokks"))].sort((a, b) => { const i = order.indexOf(a), j = order.indexOf(b); return (i < 0 ? 999 : i) - (j < 0 ? 999 : j) || a.localeCompare(b, "is"); });
    return fk.length < 2 ? llist(xs.map(vRow)) : fk.map(f => { const ys = xs.filter(v => (v.flokkur || "Án flokks") === f); return `<div class="vgrp"><div class="viewtitle">${esc(f)} · ${ys.length}</div>${llist(ys.map(vRow))}</div>`; }).join(""); };
  const VFL = ["Tæknifólk", "Uppsetning", "Akstur", "Álag"];
  function vVinna() {
    const xs = VR().filter(v => v.tegund === "vinna").slice().sort((a, b) => String(a.nr || "").localeCompare(String(b.nr || ""), "is", { numeric: true }) || String(a.heiti).localeCompare(String(b.heiti), "is"));
    // 2.22.0 (pakkaval): ein síða fyrir allar þjónustur – liðir verðskrár (tímagjald á verkefnum, tímum og tilboðum) og vinna með verði á einingu
    const vl = PV() && window.ON && ON("verdskra") && window.VERD ? (VERD().lidir || []) : [];
    const vs = vl.length ? `<div class="viewtitle">Tímagjald · ${vl.length}</div>${llist(vl.map(x => `<div class="lrow tap" ${tapAttr("verdskra", "aera")}><div class="lm"><div class="lt">${esc(x.heiti)}</div><div class="ls">${esc([x.sjalfgefid ? "Sjálfgefið" : "", x.almennt ? "Tímar án verkefnis" : "", (x.verkefni || []).length ? "Verkefni " + x.verkefni.join(", ") : ""].filter(Boolean).join(" · ") || "Tímagjald")}</div></div><div class="lr"><span class="lc">${esc(krs(x.verd))}/klst.</span></div></div>`))}` : "";
    return `<p class="hint" style="margin:16px 0 10px">${PV() ? "Þjónustur sem eru seldar á tilboðum og tímagjald á verkefnum. Tímagjaldið er breytt í verðskránni (smelltu á lið); vinna á einingarverði (t.d. tæknimaður, akstur) er skráð með „+ Nýtt“." : "Vinna og þjónusta sem er seld á tilboðum, t.d. tæknimaður, uppsetning eða akstur – verð á einingu (klst., ferð, km)."}</p>` + vs
      + (xs.length ? (vs ? `<div class="viewtitle" style="margin-top:18px">Vinna og þjónusta · ${xs.length}</div>` : "") + grpList(xs, VFL) : vs ? "" : `<div class="empty">Engin vinna eða þjónusta skráð.${MCP ? " Bættu við með „+ Nýtt“." : ""}</div>`);
  }
  const vinnaForm = () => { const o = VF.leiga; VF.leiga = "vinna"; varaForm("leiga", null); VF.leiga = o; };
  function vVorur(D) {
    const all = VRd(D).filter(v => !(PV() && v.tegund === "vinna")), xs = all.filter(vMatch(D)).slice().sort((a, b) => FLOKKAR(D).indexOf(a.flokkur) - FLOKKAR(D).indexOf(b.flokkur) || String(a.nr || "").localeCompare(String(b.nr || ""), "is", { numeric: true }) || String(a.heiti).localeCompare(String(b.heiti), "is"));
    const nPv = VR().filter(v => v.prufa).length, nPt = TB().filter(t => t.prufa).length;
    const fl = FLOKKAR(D).filter(f => all.some(v => v.flokkur === f));
    const tegs = (D === "leiga" ? [["", "Allt"], ["leiga", "Búnaður"], ["pakki", "Pakkar"], ["vinna", "Vinna og þjónusta"]] : [["", "Allt"], ["sala", "Vörur"], ["vinna", "Vinna og þjónusta"]]).filter(([k]) => !(PV() && k === "vinna"));
    let h = PV() ? `<div class="fsels" style="margin:16px 0 10px">${tegs.length > 2 ? fsel(tegs.map(([k, l]) => [`vrf:${D}:${k}`, k ? l : "Allar tegundir", VF[D] === k]), "Tegund") : ""}${fl.length > 1 ? fsel([[`vrk:${D}:`, "Allir flokkar", !VK[D]], ...fl.map(f => [`vrk:${D}:${f}`, f, VK[D] === f])], "Flokkur") : ""}</div>` : tegs.length > 2 ? `<div class="chips" style="margin:16px 0 8px">${tegs.map(([k, l]) => chip(`vrf:${D}:${k}`, l, VF[D] === k)).join("")}</div>` : `<div style="height:16px"></div>`;
    if (fl.length > 1 && !PV()) h += `<div class="chips" style="margin:0 0 10px">${chip(`vrk:${D}:`, "Allir flokkar", !VK[D])}${fl.map(f => chip(`vrk:${D}:${f}`, f, VK[D] === f)).join("")}</div>`;
    if (all.length) h += `<input type="search" id="vr-q" placeholder="Leita í ${D === "leiga" ? "búnaði" : "vörum"}…" value="${esc(VQ)}" style="margin:0 0 10px" autocomplete="off">`;
    if (!all.length) h += `<div class="empty">${D === "leiga" ? "Búnaðarlisti leigunnar" : "Vörulisti sölunnar"} er tómur.${MCP ? " Bættu við með +." : ""}${MCP && ADM() && !nPv ? `<div class="links" style="margin-top:12px;justify-content:center"><button type="button" class="btn" data-act="vrprufa:inn">Hlaða inn prufugögnum</button></div><p class="hint" style="margin-top:8px">Prufubúnaður og prufutilboð fyrir bæði leigu og sölu (merkt „prufa“) sem má eyða öllum í einu síðar.</p>` : ""}</div>`;
    else if (!xs.length) h += `<div class="empty">Ekkert passar við síuna.</div>`;
    else h += `<p class="hint" style="margin:0 0 6px" id="vr-n">${xs.length} ${xs.length === 1 ? "lína" : "línur"}</p>` + (VK[D] ? llist(xs.map(vRow)) : grpList(xs, FLOKKAR(D)));
    if (D === "leiga" && window.BUNADARLISTI && MCP && ADM()) { const nL = VR().filter(v => v.listi).length;
      h += `<div class="card" style="margin-top:16px"><div class="sub-i"><span>${nL ? `Staðlaður búnaðarlisti: ${nL} línur (merktar „listi“). Verð og fjöldi eru viðmið – lagaðu að þínu.` : "Staðlaður búnaðarlisti fyrir tækjaleigu: " + BUNADARLISTI.bunadur.length + " tæki í " + BUNADARLISTI.flokkar.length + " flokkum, " + BUNADARLISTI.pakkar.length + " pakkar og " + BUNADARLISTI.vinna.length + " liðir í vinnu og þjónustu."}</span>${nL ? `<button type="button" class="btn danger" data-act="vrlisti:ut">Eyða búnaðarlista</button>` : `<button type="button" class="btn" data-act="vrlisti:inn">Hlaða inn búnaðarlista</button>`}</div></div>`; }
    if ((nPv || nPt) && MCP && ADM()) h += `<div class="card" style="margin-top:16px"><div class="sub-i"><span>Prufugögn (leiga og sala): ${nPv} vörur og ${nPt} tilboð merkt „prufa“.</span><button type="button" class="btn danger" data-act="vrprufa:ut">Eyða prufugögnum</button></div></div>`;
    return h;
  }
  // Leit án þess að teikna síðuna upp á nýtt (heldur fókus í reitnum)
  document.addEventListener("input", e => { if (e.target?.id !== "vr-q") return; VQ = e.target.value; const q = VQ.trim().toLowerCase(); let n = 0;
    document.querySelectorAll("#view .lrow[data-s]").forEach(r => { const on = !q || q.split(/\s+/).every(w => r.dataset.s.includes(w)); r.style.display = on ? "" : "none"; if (on) n++; });
    document.querySelectorAll("#view .vgrp").forEach(g => { g.style.display = [...g.querySelectorAll(".lrow[data-s]")].some(r => r.style.display !== "none") ? "" : "none"; });
    const c = document.getElementById("vr-n"); if (c) c.textContent = n + " " + (n === 1 ? "lína" : "línur"); });

  // Útleiga á síðu leigubúnaðar (2.20.0): laust í dag og bókanir framundan
  function utlVara(v) { if (vDeild(v) !== "leiga" || v.tegund === "vinna" || v.tegund === "pakki") return ""; const idag = isoDay(new Date()), fj = +v.fjoldi || 0, nu = upptekid(v.id, idag, idag).max;
    const bs = bokanir().filter(b => b.v === v.id && b.til >= idag).sort((a, b) => a.fra.localeCompare(b.fra));
    return `<div class="viewtitle">Útleiga</div><div class="kpis"><div class="card"><b>${esc(fx(Math.max(0, fj - nu)))}</b><span>laus í dag af ${esc(fx(fj))}</span></div><div class="card"><b>${bs.length}</b><span>${bs.length === 1 ? "bókun" : "bókanir"} framundan</span></div></div>
      ${bs.length ? llist(bs.map(b => lrow("tb:" + b.T.id, { title: `<span class="nr">${esc(b.T.nr)}</span>&nbsp; ${esc(b.T.heiti || b.T.vidskiptavinur || "")}`, sub: esc([dRange(b.T), b.T.vidskiptavinur, b.T.stada].filter(Boolean).join(" · ")), right: `<span class="lc">${esc(fx(b.m))} ${esc(v.eining || "stk.")}</span>` }))) : `<div class="empty">Ekkert frátekið framundan.</div>`}
      <div class="links" style="margin-top:10px"><button type="button" class="btn" data-act="pnutv:${esc(v.flokkur || "")}">Opna útleiguyfirlit</button></div>`; }
  window.dVara = function (v) {
    const D = vDeild(v), tbs = TB().filter(t => (t.linur || []).some(l => l.v === v.id)).sort((a, b) => String(b.dags || "").localeCompare(String(a.dags || "")));
    const row = (k, x) => x != null && x !== "" ? `<div class="sub-i"><span>${esc(k)}</span><b>${x}</b></div>` : "";
    const al = D === "sala" && +v.soluverd && +v.innkaupsverd ? Math.round((v.soluverd - v.innkaupsverd) / v.soluverd * 100) : null;
    return backBar() + `<div class="kicker"><span class="kind">${esc(DL[D].l)} · ${esc(TEG[v.tegund] || "Vara")}</span>${v.flokkur ? `<span class="pill">${esc(v.flokkur)}</span>` : ""}${v.prufa ? '<span class="tag">prufa</span>' : ""}</div>
      <h2 class="big" style="margin-top:6px">${esc(v.heiti)}</h2>${v.nr ? `<p class="sub">Vörunúmer ${esc(v.nr)}</p>` : ""}
      <div class="card" style="margin-top:12px">
        ${D === "leiga" && v.tegund !== "vinna" ? row("Leiguverð á dag", esc(krs(v.leiguverd))) : ""}
        ${D === "sala" || v.tegund === "vinna" ? row(v.tegund === "vinna" ? "Verð á " + (v.eining || "klst.") : "Söluverð", esc(krs(v.soluverd))) : ""}
        ${ADM() && +v.innkaupsverd ? row("Innkaupsverð", esc(krs(v.innkaupsverd))) : ""}${ADM() && al != null ? row("Framlegð", esc(al + "%")) : ""}
        ${v.tegund !== "vinna" ? row(D === "sala" ? "Á lager" : "Fjöldi til", esc(num(+v.fjoldi || 0) + " " + (v.eining || "stk."))) : ""}
      </div>
      ${v.tegund === "pakki" ? `<div class="viewtitle">Innihald pakka</div>${llist((v.innihald || []).map(i => { const x = findV(i.v); return x ? lrow("vara:" + x.id, { lead: `<b>${esc(fx(i.m || 1))}</b><small>stk.</small>`, title: esc(x.heiti), sub: esc(x.flokkur || "") }) : ""; }))}` : ""}
      ${v.lysing ? `<div class="viewtitle">Lýsing</div><p style="white-space:pre-wrap;margin:0">${esc(v.lysing)}</p>` : ""}
      ${MCP ? `<div class="links" style="margin-top:14px"><button type="button" class="btn" data-act="vrnew:${D}:${esc(v.id)}">✎ Breyta</button>${DEL() ? `<button type="button" class="btn danger" data-act="vrdel:${esc(v.id)}">Eyða</button>` : ""}</div>` : ""}
      ${utlVara(v)}
      ${tbs.length ? `<div class="viewtitle">Á tilboðum · ${tbs.length}</div>${llist(tbs.map(tbRow))}` : ""}`;
  };

  function varaForm(D, id) {
    const v = id ? findV(id) : null; D = v ? vDeild(v) : D;
    const T0 = DL[D].tegs, x = v ? { ...v, tegund: v.tegund === "baedi" ? "leiga" : v.tegund } : { tegund: VF[D] && T0.includes(VF[D]) ? VF[D] : T0[0], flokkur: VK[D] || FLOKKAR(D)[0], eining: "stk.", innihald: [] };
    let inn = (x.innihald || []).map(i => ({ ...i }));
    const opts = (arr, cur) => arr.map(([k, l]) => `<option value="${esc(k)}"${k === cur ? " selected" : ""}>${esc(l)}</option>`).join("");
    const draw = () => {
      const teg = val("vr-teg") || x.tegund, pk = teg === "pakki", items = VRd("leiga").filter(y => y.tegund !== "pakki" && y.tegund !== "vinna" && y.id !== id);
      document.getElementById("vr-pk").innerHTML = pk ? `<div class="kind" style="margin-top:6px">Innihald pakka</div>${inn.map((i, k) => `<div class="two" style="grid-template-columns:1fr 90px 40px;align-items:end"><label>Búnaður<select data-pk="v:${k}">${items.map(y => `<option value="${esc(y.id)}"${y.id === i.v ? " selected" : ""}>${esc(y.heiti)}</option>`).join("")}</select></label><label>Magn<input data-pk="m:${k}" inputmode="decimal" value="${esc(fx(i.m || 1))}"></label><button type="button" class="btn" data-pkdel="${k}" aria-label="Fjarlægja" style="min-height:44px">×</button></div>`).join("")}
        <button type="button" class="btn" id="vr-pkadd" style="margin-top:6px"${items.length ? "" : " disabled"}>+ Bæta búnaði í pakka</button>` : "";
      const show = (k, on) => { const el = document.getElementById(k)?.closest("label"); if (el) el.style.display = on ? "" : "none"; };
      show("vr-lv", D === "leiga" && teg !== "vinna"); show("vr-sv", D === "sala" || teg === "vinna"); show("vr-fj", teg !== "vinna");
      const sl = document.getElementById("vr-sv")?.closest("label"); if (sl) sl.firstChild.textContent = teg === "vinna" ? "Verð á einingu (kr.)" : "Söluverð (kr.)";
      const fl = document.getElementById("vr-fj")?.closest("label"); if (fl) fl.firstChild.textContent = D === "sala" ? "Á lager" : "Fjöldi til";
      const ad = document.getElementById("vr-pkadd"); if (ad) ad.onclick = () => { readPk(); inn.push({ v: items[0]?.id, m: 1 }); draw(); };
      sheet.querySelectorAll("[data-pkdel]").forEach(b => b.onclick = () => { readPk(); inn.splice(+b.dataset.pkdel, 1); draw(); });
    };
    const readPk = () => { inn = inn.map((i, k) => ({ v: sheet.querySelector(`[data-pk="v:${k}"]`)?.value || i.v, m: n0(sheet.querySelector(`[data-pk="m:${k}"]`)?.value) || 1 })); };
    sheet.innerHTML = `<h3 id="sheet-h">${v ? "Breyta" : "Nýtt í " + (D === "leiga" ? "búnaðarlista leigu" : "vörulista sölu")}</h3><form id="vrf" novalidate>
      <label>Heiti<input id="vr-heiti" value="${esc(x.heiti || "")}" placeholder="${D === "leiga" ? "T.d. Hátalari" : "T.d. Vegghátalari"}"></label>
      <div class="two"><label>Tegund<select id="vr-teg">${opts(T0.map(k => [k, TEG[k]]), x.tegund)}</select></label><label>Flokkur<select id="vr-fl">${opts(FLOKKAR(D).map(f => [f, f]), x.flokkur)}<option value="__nyr__">+ Nýr flokkur…</option></select></label></div>
      <label id="vr-flnl" style="display:none">Heiti nýs flokks<input id="vr-fln" placeholder="T.d. Rigging"></label>
      <div class="two"><label>Vörunúmer<input id="vr-nr" value="${esc(x.nr || "")}" placeholder="Valfrjálst"></label><label>Eining<select id="vr-ein">${opts(["stk.", "klst.", "dagur", "ferð", "km", "sett", "m", "m²"].map(e => [e, e]), x.eining || "stk.")}</select></label></div>
      <div class="two"><label>Leiguverð á dag (kr.)<input id="vr-lv" inputmode="numeric" value="${+x.leiguverd ? esc(String(x.leiguverd)) : ""}"></label><label>Söluverð (kr.)<input id="vr-sv" inputmode="numeric" value="${+x.soluverd ? esc(String(x.soluverd)) : ""}"></label></div>
      <div class="two"><label>Fjöldi til<input id="vr-fj" inputmode="numeric" value="${+x.fjoldi ? esc(String(x.fjoldi)) : ""}"></label>${ADM() ? `<label>Innkaupsverð (kr.)<input id="vr-iv" inputmode="numeric" value="${+x.innkaupsverd ? esc(String(x.innkaupsverd)) : ""}"></label>` : "<span></span>"}</div>
      <div id="vr-pk"></div>
      <label>Lýsing<textarea id="vr-lys" placeholder="Tæknilýsing, fylgihlutir o.fl.">${esc(x.lysing || "")}</textarea></label>
      <div id="f-msg"></div><div class="actions"><button type="button" class="btn" id="vr-cancel">Hætta við</button><button class="btn primary" id="vr-save">Vista</button></div></form>`;
    sheetwrap.hidden = false; draw();
    document.getElementById("vr-teg").onchange = () => { readPk(); draw(); };
    document.getElementById("vr-fl").onchange = e => { document.getElementById("vr-flnl").style.display = e.target.value === "__nyr__" ? "" : "none"; };
    document.getElementById("vr-cancel").onclick = closeSheet;
    document.getElementById("vrf").onsubmit = async e => { e.preventDefault(); readPk();
      const heiti = val("vr-heiti"), teg = val("vr-teg"); let fl = val("vr-fl"); if (fl === "__nyr__") fl = val("vr-fln");
      if (!heiti) return msg("Skrifaðu heiti.", "err"); if (!fl) return msg("Veldu flokk.", "err");
      const o = { deild: D, heiti, tegund: teg, flokkur: fl, nr: val("vr-nr") || null, eining: val("vr-ein") || "stk.", leiguverd: D === "leiga" && teg !== "vinna" ? parseKr(val("vr-lv")) || 0 : 0, soluverd: D === "sala" || teg === "vinna" ? parseKr(val("vr-sv")) || 0 : 0, fjoldi: teg === "vinna" ? 0 : n0(val("vr-fj")) || 0, lysing: val("vr-lys") || null, innihald: teg === "pakki" ? inn.filter(i => i.v) : [] };
      if (document.getElementById("vr-iv")) o.innkaupsverd = parseKr(val("vr-iv")) || 0;
      if (D === "leiga" && teg !== "vinna" && !o.leiguverd) return msg("Skráðu leiguverð á dag.", "err");
      if ((D === "sala" || teg === "vinna") && !o.soluverd) return msg("Skráðu verð.", "err");
      const nid = id || gid(), fk = D === "sala" ? "flokkarS" : "flokkarL";
      try { await saveSnapshot(s => { s.vorur = s.vorur || []; const q = s.vorur.find(y => y.id === id); if (q) Object.assign(q, o); else s.vorur.push({ id: nid, ...o });
          if (fl && !(CF()[fk] || []).includes(fl)) { s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), [fk]: [...(CF()[fk] || []), fl] }; } });
        toast(heiti + " vistað"); closeSheet(); if (!id) openDetail("vara:" + nid); } catch (err) { msg(esc(errText(err)), "err"); } };
  }

  /* ---------- Tilboð: listi (hvor deild sín) ---------- */
  const TS = { leiga: "", sala: "" };
  function tbRow(T) { const t = totals(T);
    return lrow("tb:" + T.id, { title: `<span class="nr">${esc(T.nr || "")}</span>&nbsp; ` + esc(T.vidskiptavinur || "Án viðskiptavinar") + " · " + esc(T.heiti || "") + (T.prufa ? ' <span class="tag">prufa</span>' : ""),
      sub: esc([T.stada, dRange(T), +T.utgafa > 1 ? "útgáfa " + T.utgafa : ""].filter(Boolean).join(" · ")), right: `<span class="lc">${esc(krs(t.net))}</span>` }); }
  window.tbRowHTML = tbRow;
  const TL = { f: "" }; // línusía í sameinuðum tilboðalista: "" | leiga | sala | vinna
  const hasTeg = (T, k) => (T.linur || []).some(l => (k === "leiga" ? ["leiga"] : k === "sala" ? ["sala"] : ["vinna"]).includes(l.teg));
  function vTilbod(D) {
    if (PV() && D === "leiga") { const base = TB().filter(T => !window.inDeild || inDeild(T)), all = base.filter(T => !TL.f || hasTeg(T, TL.f));
      const xs = all.filter(T => !TS.leiga || T.stada === TS.leiga).slice().sort((a, b) => String(b.dags || "").localeCompare(String(a.dags || "")) || String(b.nr).localeCompare(String(a.nr)));
      const opin = all.filter(T => ["Drög", "Sent"].includes(T.stada)), sam = all.filter(T => T.stada === "Samþykkt"), sum = a => a.reduce((s, T) => s + totals(T).net, 0);
      let h = `<div class="fsels" style="margin:16px 0 12px">${ON("leiga") || ON("sala") ? fsel([["", "Allar línur"], ...(ON("leiga") ? [["leiga", "Leiga"]] : []), ...(ON("sala") ? [["sala", "Sala"]] : []), ["vinna", "Þjónusta"]].map(([k, l]) => [`tbf:${k}`, l, TL.f === k]), "Línur") : ""}${fsel([[`tbs:leiga:`, "Allar stöður", !TS.leiga], ...STADA.map(s => [`tbs:leiga:${s}`, s, TS.leiga === s])], "Staða")}</div>`;
      if (all.length) h += `<div class="kpis"><div class="card"><b>${opin.length}</b><span>Opin tilboð · ${esc(krs(sum(opin)))}</span></div><div class="card"><b>${sam.length}</b><span>Samþykkt · ${esc(krs(sum(sam)))}</span></div></div>`;
      if (!base.length) h += `<div class="empty">Engin tilboð ennþá.${MCP ? " Búðu til tilboð með +." : ""}</div>`;
      else if (!xs.length) h += `<div class="empty">Engin tilboð passa við síuna.</div>`;
      else h += `<div class="viewtitle">Tilboð · ${xs.length}</div>` + llist(xs.map(tbRow));
      return h; }
    const all = TBd(D), xs = all.filter(T => !TS[D] || T.stada === TS[D]).slice().sort((a, b) => String(b.dags || "").localeCompare(String(a.dags || "")) || String(b.nr).localeCompare(String(a.nr)));
    const opin = all.filter(T => ["Drög", "Sent"].includes(T.stada)), sam = all.filter(T => T.stada === "Samþykkt");
    const sum = a => a.reduce((s, T) => s + totals(T).net, 0);
    let h = `<div class="chips" style="margin:16px 0 12px">${chip(`tbs:${D}:`, "Öll", !TS[D])}${STADA.map(s => chip(`tbs:${D}:${s}`, s, TS[D] === s)).join("")}</div>`;
    if (all.length) h += `<div class="kpis"><div class="card"><b>${opin.length}</b><span>Opin tilboð · ${esc(krs(sum(opin)))}</span></div><div class="card"><b>${sam.length}</b><span>Samþykkt · ${esc(krs(sum(sam)))}</span></div></div>`;
    if (!all.length) h += `<div class="empty">Engin ${D === "leiga" ? "leigutilboð" : "sölutilboð"} ennþá.${MCP ? " Búðu til tilboð með +." : ""}${!VRd(D).length && MCP && ADM() ? ` Byrjaðu á ${D === "leiga" ? "Búnaði" : "Vörum"} – þar má líka hlaða inn prufugögnum.` : ""}</div>`;
    else if (!xs.length) h += `<div class="empty">Engin tilboð passa við síuna.</div>`;
    else h += `<div class="viewtitle">${D === "leiga" ? "Leigutilboð" : "Sölutilboð"} · ${xs.length}</div>` + llist(xs.map(tbRow));
    return h;
  }

  /* ---------- Tilboð: nýtt ---------- */
  function tbForm(D, pre) { // pre (2.12.0): { verkefniId } – nýtt tilboð úr Tilboð-flipa verkefnis
    const PP = pre?.verkefniId ? findProj(pre.verkefniId) : null;
    // 2.62.0: verkefni má velja í forminu (líka úr Tilboð-valmynd); tímabil tilboðs er sjálfgefið sömu dagar og verkefnið
    const pD = p => { if (!p) return {}; const o = x => x ? String(x).slice(0, 10) : ""; const f = o(p.timabilFra) || o(p.vidburdur) || o(p.skiladagur), t = o(p.timabilTil) || o(p.skiladagur) || f; return { fra: f || "", til: t && f && t < f ? f : t || "" }; };
    const PD = pD(PP);
    const c = CF(), d0 = isoDay(new Date()), g0 = (() => { const x = new Date(); x.setDate(x.getDate() + (+c.gildisdagar || 14)); return isoDay(x); })(), M = D === "blandad", L = D !== "sala" && (!M || ON("leiga")), SV = M && !L; // SV (2.22.0): þjónustutilboð – Leiga ekki virk
    sheet.innerHTML = `<h3 id="sheet-h">Nýtt ${M ? "tilboð" : L ? "leigutilboð" : "sölutilboð"}</h3>${byrjaHTML()}<form id="tbf" novalidate>
      <label>${L ? "Heiti viðburðar" : "Heiti verks"}<input id="tb-heiti" value="${esc(PP?.stutt || "")}" placeholder="${L ? "T.d. Árshátíð" : SV ? "T.d. Ljósahönnun – anddyri" : "T.d. Hljóðkerfi fyrir veitingastað"}"></label>
      ${verkefni().length ? `<label>Verkefni<select id="tb-verk"><option value="">Ekkert verkefni</option>${verkefni().filter(p => !isDone(p) || (PP && p.id === PP.id)).sort((a, b) => String(b.nr).localeCompare(String(a.nr), "is", { numeric: true })).map(p => `<option value="${esc(p.id)}"${PP && p.id === PP.id ? " selected" : ""}>${esc(p.nafn || p.nr)}</option>`).join("")}</select></label>` : ""}
      ${vskSelect("tb", "client", "Viðskiptavinur", "Viðskiptavinur", PP?.vskId || PP?.vkId || null)}
      <div class="two"><label>Tengiliður<input id="tb-teng" placeholder="Nafn"></label><label>Netfang tengiliðs<input id="tb-net" type="email" placeholder="nafn@fyrirtaeki.is"></label></div>
      <label>${L || SV ? "Staðsetning" : "Uppsetningarstaður"}<input id="tb-stad" placeholder="${L ? "T.d. Salur A" : "T.d. Gata 10"}"></label>
      ${L ? `<div class="two"><label>Frá${M ? "" : " (afhending)"}<input id="tb-fra" type="date" value="${pre?.fra || PD.fra || (M ? "" : d0)}"></label><label>Til${M ? "" : " (skil)"}<input id="tb-til" type="date" value="${pre?.til || pre?.fra || PD.til || (M ? "" : d0)}"></label></div>${M ? `<p class="hint" id="tb-tbh" style="margin:-4px 0 8px">Tímabil verksins${PP ? " – sömu dagar og verkefnið" : ""}. Leigulínur reiknast á þessa daga.</p>` : ""}` : `<label>Áætluð afhending<input id="tb-fra" type="date"></label>`}
      <label>Tilboð gildir til<input id="tb-gildir" type="date" value="${g0}"></label>
      <div id="f-msg"></div><div class="actions"><button type="button" class="btn" id="tb-cancel">Hætta við</button><button class="btn primary" id="tb-save">Búa til og bæta við línum</button></div></form>`;
    sheetwrap.hidden = false; wireVskSelects(sheet);
    if (L) document.getElementById("tb-fra").onchange = e => { const t = document.getElementById("tb-til"); if (!t.value || t.value < e.target.value) t.value = e.target.value; };
    document.getElementById("tb-client").addEventListener("change", e => { const v = findVsk(e.target.value); if (v) { if (!val("tb-teng") && v.tengilidur) document.getElementById("tb-teng").value = v.tengilidur; if (!val("tb-net") && v.netfang) document.getElementById("tb-net").value = v.netfang; } });
    // Val á verkefni fyllir í heiti, viðskiptavin og tímabil (ef reitirnir eru tómir eða enn með gildi fyrra verkefnis)
    let lastPD = PD, lastH = PP?.stutt || "";
    document.getElementById("tb-verk")?.addEventListener("change", e => { const p = findProj(e.target.value), d = pD(p), set = (id, v, old) => { const el = document.getElementById(id); if (el && (!el.value || el.value === old)) el.value = v || ""; };
      if (p) { set("tb-heiti", p.stutt || "", lastH); const cs = document.getElementById("tb-client"); if (cs && (p.vskId || p.vkId) && !cs.value) { cs.value = p.vskId || p.vkId; cs.dispatchEvent(new Event("change")); } }
      if (L) { set("tb-fra", d.fra, lastPD.fra); set("tb-til", d.til, lastPD.til); }
      const h = document.getElementById("tb-tbh"); if (h) h.textContent = `Tímabil verksins${p ? " – sömu dagar og verkefnið" : ""}. Leigulínur reiknast á þessa daga.`;
      lastPD = d; lastH = p?.stutt || ""; });
    document.getElementById("tb-cancel").onclick = closeSheet;
    const setIf = (id, v) => { const el = document.getElementById(id); if (el && v && !el.value) el.value = v; };
    const getB = wireByrja("tilbod", pre?.base, B => { setIf("tb-heiti", B.heiti); setIf("tb-stad", B.stadsetning); setIf("tb-teng", B.tengilidur); setIf("tb-net", B.netfang);
      const cs = document.getElementById("tb-client"); if (cs && B.vskId && !cs.value && [...cs.options].some(o => o.value === String(B.vskId))) { cs.value = B.vskId; cs.dispatchEvent(new Event("change")); } });
    document.getElementById("tbf").onsubmit = async e => { e.preventDefault();
      try {
        const heiti = val("tb-heiti"); if (!heiti) return msg("Skrifaðu heiti.", "err");
        const fra = val("tb-fra") || null, til = L ? (val("tb-til") || fra) : null; if (fra && til && til < fra) return msg("„Til“ getur ekki verið á undan „Frá“.", "err");
        const cl = await pickVsk("tb", "client", "Viðskiptavinur"), id = gid(), n = +c[nK(D)] || 1001, nr = DL[D].pre + n;
        const T = { id, nr, heiti, deild: D, vskId: cl?.id || null, vidskiptavinur: cl?.name || null,
          tengilidur: val("tb-teng") || null, netfang: val("tb-net") || null, stadsetning: val("tb-stad") || null, fra, til, gildir: val("tb-gildir") || null, dags: d0,
          stada: "Drög", utgafa: 1, eldri: [], afsl: 0, athugasemd: null, linur: [], verkefniId: (document.getElementById("tb-verk") ? val("tb-verk") : PP?.id) || null };
        if (pre?.vara) { const v = findV(pre.vara); if (v) T.linur = [{ ...lineFrom(v, T), magn: +pre.magn || 1 }]; } // „+ Á tilboð“ af vöruspjaldi (2.30.0)
        applyBase(T, getB());
        await saveSnapshot(s => { (s.tilbod = s.tilbod || []).push(T); s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), [nK(D)]: n + 1 }; });
        toast("Tilboð " + nr + " stofnað"); closeSheet(); EDT = structuredClone(T); openDetail("tb:" + id);
      } catch (err) { msg(esc(err?.code === "form" ? err.message : errText(err)), "err"); } };
  }

  /* ---------- Pantanir (2.20.0) ---------- */
  function pnForm(pre) {
    const PP = pre?.verkefniId ? findProj(pre.verkefniId) : null, d0 = isoDay(new Date());
    sheet.innerHTML = `<h3 id="sheet-h">Ný pöntun</h3>${byrjaHTML()}<form id="pnf" novalidate>
      ${vskSelect("pn", "client", "Viðskiptavinur", "Viðskiptavinur", PP?.vskId || null)}
      <div class="two"><label>Sá sem pantar<input id="pn-teng" placeholder="Nafn"></label><label>Sími<input id="pn-simi" type="tel" inputmode="tel"></label></div>
      <div class="two"><label>Netfang<input id="pn-net" type="email" placeholder="nafn@dæmi.is"></label><label>Uppruni<select id="pn-upp">${UPPRUNI.filter(x => x[0] !== "tilbod").map(([k, l]) => `<option value="${k}"${k === "simi" ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
      <label>Lýsing<input id="pn-heiti" value="${esc(PP?.stutt || "")}" placeholder="T.d. Hljóðnemi fyrir afmæli"></label>
      <div class="two"><label>Afhending<input id="pn-fra" type="date" value="${pre?.fra || d0}"></label><label>Skil<input id="pn-til" type="date" value="${pre?.til || pre?.fra || d0}"></label></div>
      <p class="hint" style="margin:-4px 0 8px">Leigubúnaður er frátekinn frá afhendingu til skila.</p>
      <div id="f-msg"></div><div class="actions"><button type="button" class="btn" id="pn-cancel">Hætta við</button><button class="btn primary" id="pn-save">Búa til og bæta við línum</button></div></form>`;
    sheetwrap.hidden = false; wireVskSelects(sheet);
    document.getElementById("pn-fra").onchange = e => { const t = document.getElementById("pn-til"); if (!t.value || t.value < e.target.value) t.value = e.target.value; };
    document.getElementById("pn-client").addEventListener("change", e => { const v = findVsk(e.target.value); if (!v) return; [["pn-teng", v.tengilidur], ["pn-simi", v.simi], ["pn-net", v.netfang]].forEach(([k, x]) => { const el = document.getElementById(k); if (el && !el.value && x) el.value = x; }); });
    document.getElementById("pn-cancel").onclick = closeSheet;
    const setIf = (id, v) => { const el = document.getElementById(id); if (el && v && !el.value) el.value = v; };
    const getB = wireByrja("pontun", pre?.base, B => { setIf("pn-heiti", B.heiti); setIf("pn-teng", B.tengilidur); setIf("pn-simi", B.simi); setIf("pn-net", B.netfang);
      const cs = document.getElementById("pn-client"); if (cs && B.vskId && !cs.value && [...cs.options].some(o => o.value === String(B.vskId))) { cs.value = B.vskId; cs.dispatchEvent(new Event("change")); } });
    document.getElementById("pnf").onsubmit = async e => { e.preventDefault();
      try {
        const fra = val("pn-fra") || null, til = val("pn-til") || fra; if (fra && til && til < fra) return msg("Skil geta ekki verið á undan afhendingu.", "err");
        const cl = await pickVsk("pn", "client", "Viðskiptavinur"), teng = val("pn-teng") || null; if (!cl && !teng) return msg("Veldu viðskiptavin eða skráðu nafn þess sem pantar.", "err");
        const id = gid(), n = +CF().nastaNrP || 1001, nr = "P-" + n;
        const P = { id, pontun: true, nr, deild: "blandad", heiti: val("pn-heiti") || "Pöntun", vskId: cl?.id || null, vidskiptavinur: cl?.name || null, tengilidur: teng, simi: val("pn-simi") || null, netfang: val("pn-net") || null,
          uppruni: val("pn-upp") || "simi", ytriNr: null, stadsetning: null, fra, til, dags: isoDay(new Date()), stada: "Ný", svid: (() => { try { return ({ pnl: ["Leiga"], pns: ["Sala"], pnt: ["Þjónusta"] })[tab] || null; } catch (e) { return null; } })(), afsl: 0, athugasemd: null, linur: [], verkefniId: PP?.id || null, tilbodId: null };
        if (pre?.vara) { const v = findV(pre.vara); if (v) P.linur = [{ ...lineFrom(v, P), magn: +pre.magn || 1 }]; } // „Taka frá“ af vöruspjaldi (2.30.0)
        { const B = getB(); applyBase(P, B); if (B) { if (B.afhending) P.afhending = B.afhending; if (B.afhStadur) P.afhStadur = B.afhStadur; if (B.svid) P.svid = B.svid; } }
        await saveSnapshot(s => { (s.pantanir = s.pantanir || []).push(P); s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), nastaNrP: n + 1 }; });
        toast("Pöntun " + nr + " stofnuð"); closeSheet(); window.pnOpenNew(P);
      } catch (err) { msg(esc(err?.code === "form" ? err.message : errText(err)), "err"); } };
  }
  const PF = { s: "opnar", u: "" };
  function pnRow(P, flokkad) { const t = totals(P), ar = blokkar(P) && arekstrar(P).length;
    return lrow("tb:" + P.id, { title: `<span class="nr">${esc(P.nr)}</span>&nbsp; ` + esc(P.vidskiptavinur || P.tengilidur || "Án viðskiptavinar") + (P.heiti && P.heiti !== "Pöntun" ? " · " + esc(P.heiti) : "") + (P.prufa ? ' <span class="tag">prufa</span>' : ""),
      sub: esc([dRange(P), UPL(P.uppruni), P.ytriNr ? "#" + P.ytriNr : ""].filter(Boolean).join(" · ")) + (ar ? ' · <span class="arek-t">⚠ búnaður ekki laus</span>' : ""), right: `${flokkad ? "" : `<span class="pill ${STCOL(P)}">${esc(P.stada)}</span>`}<span class="lc">${esc(krs(t.net))}</span>` }); }
  function vPantanir() {
    const all = PN(), idag = isoDay(new Date());
    const xs = all.filter(P => (PF.s === "opnar" ? !["Skilað", "Lokið"].includes(P.stada) : !PF.s || P.stada === PF.s) && (!PF.u || P.uppruni === PF.u))
      .sort((a, b) => String(a.fra || "9").localeCompare(String(b.fra || "9")) || String(a.nr).localeCompare(String(b.nr)));
    const afh = all.filter(P => P.fra === idag && ["Ný", "Staðfest"].includes(P.stada)), skil = all.filter(P => P.stada === "Afhent" && tilOf(P) <= idag), uti = all.filter(P => P.stada === "Afhent");
    let h = `<div class="fsels" style="margin:16px 0 12px">${fsel([["pnf:s:opnar", "Opnar pantanir", PF.s === "opnar"], ["pnf:s:", "Allar pantanir", !PF.s], ...PSTADA.map(x => ["pnf:s:" + x, x, PF.s === x])], "Staða")}${fsel([["pnf:u:", "Allur uppruni", !PF.u], ...UPPRUNI.map(([k, l]) => ["pnf:u:" + k, l, PF.u === k])], "Uppruni")}</div>`;
    if (all.length) h += `<div class="kpis"><div class="card"><b>${afh.length}</b><span>afhendingar í dag</span></div><div class="card"><b>${skil.length}</b><span>skil í dag eða seint</span></div><div class="card"><b>${uti.length}</b><span>úti núna</span></div></div>`;
    if (!all.length) return h + `<div class="empty">Engar pantanir ennþá.${MCP ? " Skráðu pöntun með + – t.d. þegar viðskiptavinur hringir og vantar einn hljóðnema." : ""}</div>`;
    if (!xs.length) return h + `<div class="empty">Engar pantanir passa við síuna.</div>`;
    return h + PSTADA.map(st => { const ys = xs.filter(P => P.stada === st); return ys.length ? `<div class="viewtitle">${esc(st)} · ${ys.length}</div>${llist(ys.map(P => pnRow(P, true)))}` : ""; }).join("");
  }
  window.pnFor = pred => { if (!PNON()) return ""; const xs = PN().filter(pred).sort((a, b) => String(b.fra || "").localeCompare(String(a.fra || ""))); return xs.length ? `<div class="viewtitle">Pantanir · ${xs.length}</div>${llist(xs.map(pnRow))}` : ""; };

  /* ---------- Útleiguyfirlit (2.20.0): leigubúnaður × dagar ---------- */
  const UT = { fra: null, fl: "", allt: false };
  const manud = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  function vUtleiga() {
    const st = dOf(UT.fra) || manud(new Date()); UT.fra = isoDay(st);
    const ds = dagar(UT.fra, isoDay(new Date(st.getFullYear(), st.getMonth(), st.getDate() + 13))), lok = ds[ds.length - 1], idag = isoDay(new Date()), WD = ["Su", "Má", "Þr", "Mi", "Fi", "Fö", "La"];
    const bk = bokanir().filter(b => b.fra <= lok && b.til >= UT.fra), base = VRd("leiga").filter(v => v.tegund !== "vinna" && v.tegund !== "pakki"), FL = FLOKKAR("leiga");
    const items = base.filter(v => (!UT.fl || v.flokkur === UT.fl) && (UT.allt || bk.some(b => b.v === v.id)))
      .sort((a, b) => FL.indexOf(a.flokkur) - FL.indexOf(b.flokkur) || String(a.nr || "").localeCompare(String(b.nr || ""), "is", { numeric: true }) || String(a.heiti).localeCompare(String(b.heiti), "is"));
    const fl = FL.filter(f => base.some(v => v.flokkur === f));
    let h = `<div class="fsels" style="margin:16px 0 12px"><div class="utl-nav"><button type="button" class="btn" data-act="pnutl:-14" aria-label="Fyrri tvær vikur">‹</button><button type="button" class="btn" data-act="pnutl:0">Í dag</button><button type="button" class="btn" data-act="pnutl:14" aria-label="Næstu tvær vikur">›</button>
      <b class="utl-per">${esc(dIS(UT.fra))} – ${esc(dIS(lok))}</b></div>${fl.length > 1 ? fsel([["pnutf:", "Allir flokkar", !UT.fl], ...fl.map(f => ["pnutf:" + f, f, UT.fl === f])], "Flokkur") : ""}${fsel([["pnuta:0", "Búnaður í útleigu", !UT.allt], ["pnuta:1", "Allur leigubúnaður", UT.allt]], "Sýna")}</div>`;
    if (!base.length) return h + `<div class="empty">Enginn leigubúnaður skráður.</div>`;
    if (!items.length) h += `<div class="empty">Ekkert frátekið á þessu tímabili${UT.fl ? " í flokknum " + esc(UT.fl) : ""}.</div>`;
    else h += `<div class="utl-wrap"><table class="utl"><thead><tr><th class="utl-h">Búnaður</th>${ds.map(d => { const x = dOf(d); return `<th class="${d === idag ? "idag" : ""}${[0, 6].includes(x.getDay()) ? " helg" : ""}"><small>${WD[x.getDay()]}</small>${x.getDate()}</th>`; }).join("")}</tr></thead>
      <tbody>${items.map(v => { const fj = +v.fjoldi || 0, mine = bk.filter(b => b.v === v.id);
        return `<tr><th class="utl-h"><a class="plink" data-open="vara:${esc(v.id)}">${esc(v.heiti)}</a><small>${esc(fx(fj))} ${esc(v.eining || "stk.")} til</small></th>${ds.map(d => { const on = mine.filter(b => b.fra <= d && b.til >= d), n = on.reduce((a, b) => a + b.m, 0);
          const c = !n ? "" : n > fj ? "yfir" : n >= fj ? "full" : "hluti", x = dOf(d);
          return `<td class="${c}${d === idag ? " idag" : ""}${[0, 6].includes(x.getDay()) ? " helg" : ""}"${n ? ` title="${esc(dIS(d) + ": " + fx(n) + " af " + fx(fj) + " – " + on.map(b => b.T.nr + " " + (b.T.heiti || "")).join(", "))}"${on.length === 1 ? ` data-open="tb:${esc(on[0].T.id)}"` : ""}` : ""}>${n ? esc(fx(n)) : ""}</td>`; }).join("")}</tr>`; }).join("")}</tbody></table></div>
      <p class="hint utl-hint"><span class="utl-k hluti"></span>hluti frátekinn <span class="utl-k full"></span>allt frátekið <span class="utl-k yfir"></span>meira en til er · Samþykkt tilboð og opnar pantanir taka frá búnað.</p>`;
    const docs = [...new Map(bk.map(b => [b.T.id, b.T])).values()], ev = [];
    docs.forEach(T => { if (T.fra >= UT.fra && T.fra <= lok) ev.push([T.fra, "Afhending", T]); const t = tilOf(T); if (t >= UT.fra && t <= lok) ev.push([t, "Skil", T]); });
    ev.sort((a, b) => a[0].localeCompare(b[0]) || (a[1] === "Skil" ? -1 : 1));
    if (ev.length) h += `<div class="viewtitle">Afhendingar og skil · ${ev.length}</div>` + llist(ev.map(([d, k, T]) => { const x = dOf(d);
      return lrow("tb:" + T.id, { lead: `<b>${x.getDate()}.</b><small>${WD[x.getDay()]}</small>`, title: `${esc(k)} · <span class="nr">${esc(T.nr)}</span>&nbsp; ${esc(T.heiti || T.vidskiptavinur || "")}`, sub: esc([T.vidskiptavinur, dRange(T), T.stadsetning].filter(Boolean).join(" · ")), right: `<span class="pill ${STCOL(T)}">${esc(T.stada)}</span>` }); }));
    return h;
  }

  /* ---------- Tilboð: síða og ritill ---------- */
  let EDT = null; // drög í vinnslu (afrit af tilboðinu meðan verið er að breyta)
  // Þéttur ritill (2.37.0, útlit I á tölvu): ein lína á hverja línu (heiti, magn, dagar, verð, afsl., upphæð); hluti og tegund undir ⋯
  const U1C = () => window.ORG?.utlit === "I" && window.innerWidth >= 900;
  const tbTableHTML = (T, ed) => {
    const gs = groups(T), D = tDeild(T); if (!gs.length) return `<div class="empty">${ed ? `Engar línur ennþá. Bættu við úr ${D === "leiga" ? "búnaðarlista" : "vörulista"} eða sérlínu.` : "Engar línur."}</div>`;
    return gs.map(([hl, ls]) => { const sub = ls.reduce((a, l) => a + lSum(l, T), 0);
      return `<div class="tbgrp${ed && U1C() ? " tbcg" : ""}"><div class="tbgh">${ed ? `<input class="tbhl" data-hl="${esc(hl)}" value="${esc(hl)}" aria-label="Heiti hluta">` : `<b>${esc(hl)}</b>`}<span>${esc(krs(sub))}</span></div>${ed && U1C() ? `<div class="tbcr tbch"><span>Lýsing</span><span>Magn</span><span>Dagar</span><span>Verð</span><span>Afsl. %</span><span>Upphæð</span><span></span></div>` : ""}
        ${ls.map(l => { const v = l.v ? findV(l.v) : null, pk = v?.tegund === "pakki" ? pakkiTxt(v) : "";
          if (!ed) return `<div class="tbl"><div class="tbln"><div>${esc(l.heiti)}${pk ? `<div class="ls">${esc(pk)}</div>` : ""}</div><div class="ls">${esc([fx(l.magn) + " " + (l.ein || ""), "× " + krs(l.verd), l.teg === "leiga" ? lDagar(l, T) + " " + (lDagar(l, T) === 1 ? "dagur" : "dagar") + (studull(lDagar(l, T)) !== lDagar(l, T) ? " (stuðull " + fx(studull(lDagar(l, T))) + ")" : "") : LTEG[l.teg], +l.afsl ? "−" + fx(l.afsl) + "%" : ""].filter(Boolean).join(" · "))}</div></div><b>${esc(krs(lSum(l, T)))}</b></div>`;
          if (U1C()) { const lg = l.teg === "leiga", hls = [...new Set(groups(T).map(g => g[0]).concat(FLOKKAR(D), ["Vinna og þjónusta"]))];
            return `<div class="tbc" data-lid="${esc(l.id)}"><div class="tbcr"><span class="tbcn"><input data-l="heiti:${esc(l.id)}" value="${esc(l.heiti)}" aria-label="Lýsing">${pk ? `<small>${esc(pk)}</small>` : ""}</span>
              <input data-l="magn:${esc(l.id)}" inputmode="decimal" value="${esc(fx(l.magn))}" aria-label="Magn">
              ${lg ? `<input data-l="dagar:${esc(l.id)}" inputmode="numeric" value="${l.dagar ? esc(String(l.dagar)) : ""}" placeholder="${tbDagar(T)}" aria-label="Dagar">` : `<span class="tbcx">–</span>`}
              <input data-l="verd:${esc(l.id)}" inputmode="numeric" value="${esc(String(l.verd || 0))}" aria-label="Verð${lg ? " á dag" : ""}">
              <input data-l="afsl:${esc(l.id)}" inputmode="decimal" value="${+l.afsl ? esc(fx(l.afsl)) : ""}" placeholder="0" aria-label="Afsláttur %">
              <b data-ls="${esc(l.id)}">${esc(krs(lSum(l, T)))}</b>
              <span class="tbcb"><button type="button" class="tbcm" onclick="this.closest('.tbc').classList.toggle('open')" aria-label="Meira" title="Hluti og tegund">⋯</button><button type="button" class="tbcm" data-act="tbl:del:${esc(l.id)}" aria-label="Eyða línu" title="Eyða línu">×</button></span></div>
              <div class="tbcmore">${!l.v ? `<label>Tegund<select data-l="teg:${esc(l.id)}">${(isMix(T) ? ["vinna", ...(ON("leiga") ? ["leiga"] : []), ...(ON("sala") ? ["sala"] : [])] : D === "leiga" ? ["leiga", "vinna", "sala"] : ["sala", "vinna"]).map(k => `<option value="${k}"${l.teg === k ? " selected" : ""}>${lteg(k)}</option>`).join("")}</select></label>` : ""}<label>Hluti<select data-l="hl:${esc(l.id)}">${hls.map(g => `<option${g === l.hl ? " selected" : ""}>${esc(g)}</option>`).join("")}</select></label></div></div>`; }
          return `<div class="tbl ed" data-lid="${esc(l.id)}"><div class="tbln"><input data-l="heiti:${esc(l.id)}" value="${esc(l.heiti)}" aria-label="Lýsing">${pk ? `<div class="ls">${esc(pk)}</div>` : ""}
            <div class="tbf"><label>Magn<input data-l="magn:${esc(l.id)}" inputmode="decimal" value="${esc(fx(l.magn))}"></label>
            ${l.teg === "leiga" ? `<label>Dagar<input data-l="dagar:${esc(l.id)}" inputmode="numeric" value="${l.dagar ? esc(String(l.dagar)) : ""}" placeholder="${tbDagar(T)}"></label>` : ""}
            <label>Verð${l.teg === "leiga" ? "/dag" : ""}<input data-l="verd:${esc(l.id)}" inputmode="numeric" value="${esc(String(l.verd || 0))}"></label>
            <label>Afsl. %<input data-l="afsl:${esc(l.id)}" inputmode="decimal" value="${+l.afsl ? esc(fx(l.afsl)) : ""}" placeholder="0"></label>
            ${!l.v ? `<label>Tegund<select data-l="teg:${esc(l.id)}">${(isMix(T) ? ["vinna", ...(ON("leiga") ? ["leiga"] : []), ...(ON("sala") ? ["sala"] : [])] : D === "leiga" ? ["leiga", "vinna", "sala"] : ["sala", "vinna"]).map(k => `<option value="${k}"${l.teg === k ? " selected" : ""}>${lteg(k)}</option>`).join("")}</select></label>` : ""}
            <label>Hluti<select data-l="hl:${esc(l.id)}">${[...new Set(groups(T).map(g => g[0]).concat(FLOKKAR(D), ["Vinna og þjónusta"]))].map(g => `<option${g === l.hl ? " selected" : ""}>${esc(g)}</option>`).join("")}</select></label></div></div>
            <div class="tblr"><b data-ls="${esc(l.id)}">${esc(krs(lSum(l, T)))}</b><button type="button" class="btn" data-act="tbl:del:${esc(l.id)}" aria-label="Eyða línu">×</button></div></div>`; }).join("")}</div>`; }).join("");
  };
  const tbTotHTML = T => { const t = totals(T), r = (k, x, b) => `<div class="sub-i"${b ? ' style="font-size:16px"' : ""}><span>${esc(k)}</span><b>${esc(krs(x))}</b></div>`;
    return `${t.leiga ? r("Leiga", t.leiga) : ""}${t.sala ? r(tDeild(T) === "sala" ? "Vörur" : "Sala", t.sala) : ""}${t.vinna ? r("Vinna og þjónusta", t.vinna) : ""}
      ${t.afsl ? r("Afsláttur " + fx(T.afsl) + "%", -t.afsl) : ""}${r("Samtals án VSK", t.net)}${r("VSK " + fx(vskP()) + "%", t.vsk)}${r("Samtals með VSK", t.tot, 1)}`; };
  const dagTxt = T => `${tbDagar(T)} ${tbDagar(T) === 1 ? "leigudagur" : "leigudagar"} · dagstuðull ${fx(studull(tbDagar(T)))}`;

  window.dTilbod = function (T0) {
    const ed = EDT && EDT.id === T0.id, T = ed ? EDT : T0, D = tDeild(T), L = D === "leiga" && (!isMix(T) || ON("leiga")), SV = isMix(T) && !ON("leiga") && !ON("sala"), pr = T.verkefniId ? findProj(T.verkefniId) : null;
    const ms = window.MS && MS.on && MS.on();
    const P = isP(T), kick = `<span class="kind">${P ? "Pöntun " + esc(T.nr) : isMix(T) ? "Tilboð " + esc(T.nr) : esc(DL[D].l) + " · tilboð " + esc(T.nr)}${+T.utgafa > 1 ? " · útgáfa " + esc(String(T.utgafa)) : ""}</span><span class="pill ${STCOL(T)}">${esc(T.stada)}</span>${P && T.uppruni ? `<span class="pill">${esc(UPL(T.uppruni))}${T.ytriNr ? " #" + esc(T.ytriNr) : ""}</span>` : ""}${T.prufa ? '<span class="tag">prufa</span>' : ""}`;
    // 2.71.0: breytingasýn í skýrum hlutum – Upplýsingar · Dagsetningar · Línur · Afsláttur · Samtals; vista/hætta neðst (fast)
    if (ed) return backBar() + `<div class="kicker">${kick}<span class="tag">breytingahamur</span></div>
      <div id="tbed" class="tbed2">
      <section class="tbsec"><div class="tbsh"><h3>Upplýsingar</h3></div>
      <div class="two"><label>${P ? "Lýsing" : L ? "Heiti viðburðar" : "Heiti verks"}<input data-h="heiti" value="${esc(T.heiti || "")}"></label>
      <label>Viðskiptavinur<select data-h="vskId"><option value="">Enginn</option>${vskList().map(c => `<option value="${esc(c.id)}"${sameId(c.id, T.vskId) ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label></div>
      <details class="tbmore"${(window._tbOpen || {}).a ? " open" : ""} ontoggle="(window._tbOpen=window._tbOpen||{}).a=this.open"><summary><span>Tengiliður og nánar</span><small>${esc([T.tengilidur, T.netfang, T.simi, P ? UPL(T.uppruni) : "", T.stadsetning].filter(Boolean).join(" · ") || "Tengiliður, netfang" + (P ? ", sími, uppruni" : "") + " og staðsetning")}</small></summary>
      <div class="two"><label>${P ? "Sá sem pantar" : "Tengiliður"}<input data-h="tengilidur" value="${esc(T.tengilidur || "")}"></label><label>Netfang<input data-h="netfang" type="email" value="${esc(T.netfang || "")}"></label></div>
      ${P ? `<div class="two"><label>Sími<input data-h="simi" type="tel" value="${esc(T.simi || "")}"></label><label>Uppruni<select data-h="uppruni">${UPPRUNI.map(([k, l]) => `<option value="${k}"${T.uppruni === k ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>` : ""}
      <label>${L || SV ? "Staðsetning" : "Uppsetningarstaður"}<input data-h="stadsetning" value="${esc(T.stadsetning || "")}"></label>
      </details></section>
      <section class="tbsec"><div class="tbsh"><h3>${L ? (P ? "Afhending og skil" : "Tímabil") : "Dagsetning"}</h3>${L ? `<span class="tbshm" id="tb-dg">${dagTxt(T)}</span>` : ""}</div>
      ${L ? `<div class="two"><label>${P ? "Afhending" : "Frá"}<input data-h="fra" type="date" value="${esc(T.fra || "")}"></label><label>${P ? "Skil" : "Til"}<input data-h="til" type="date" value="${esc(T.til || "")}"></label></div>` : `<label>${SV ? "Áætluð verklok" : "Áætluð afhending"}<input data-h="fra" type="date" value="${esc(T.fra || "")}"></label>`}
      <div class="tbafhslot"></div></section>
      <section class="tbsec"><div class="tbsh"><h3>Línur</h3><div class="links">${isMix(T) ? `<button type="button" class="btn" data-act="tbl:thj">+ ${PV() ? "Þjónusta" : "Vinna og þjónusta"}</button>${pickDs(T).map(d => `<button type="button" class="btn" data-act="tbl:pick:${d}">+ ${d === "leiga" ? "Búnaður" : "Vara"}</button>`).join("")}` : `<button type="button" class="btn" data-act="tbl:pick">+ Úr ${L ? "búnaðarlista" : "vörulista"}</button>`}<button type="button" class="btn" data-act="tbl:custom">+ Sérlína</button></div></div>
      <div id="tb-arek">${arekHTML(T)}</div>
      <div id="tb-tab">${tbTableHTML(T, true)}</div></section>
      <section class="tbsec"><details class="tbmore"${(window._tbOpen || {}).b ?? (+T.afsl || T.athugasemd) ? " open" : ""} ontoggle="(window._tbOpen=window._tbOpen||{}).b=this.open"><summary><span>Afsláttur og athugasemd</span><small>${esc([+T.afsl ? "Afsl. " + fx(T.afsl) + "%" : "", P ? (T.ytriNr ? "Nr. " + T.ytriNr : "") : (T.gildir ? "Gildir til " + dIS(T.gildir) : ""), T.athugasemd ? "athugasemd" : ""].filter(Boolean).join(" · ") || (P ? "Afsláttur, pöntunarnúmer og athugasemd" : "Afsláttur, gildistími og athugasemd"))}</small></summary>
      <div class="two"><label>Afsláttur${P ? "" : " á tilboð"} (%)<input data-h="afsl" inputmode="decimal" value="${+T.afsl ? esc(fx(T.afsl)) : ""}" placeholder="0"></label>${P ? `<label>Pöntunarnúmer (t.d. Shopify)<input data-h="ytriNr" value="${esc(T.ytriNr || "")}" placeholder="Valfrjálst"></label>` : `<label>Gildir til<input data-h="gildir" type="date" value="${esc(T.gildir || "")}"></label>`}</div>
      <label>Athugasemd${P ? "" : " á tilboði"}<textarea data-h="athugasemd" placeholder="${P ? "T.d. sótt af viðskiptavini, greitt við afhendingu" : "Birtist á tilboðinu"}">${esc(T.athugasemd || "")}</textarea></label></details></section>
      <section class="tbsec tbsum"><div class="card rksum" id="tb-tot">${tbTotHTML(T)}</div></section>
      <div class="tbbar"><button type="button" class="btn primary" data-act="tbed:save">Vista ${P ? "pöntun" : "tilboð"}</button><button type="button" class="btn" data-act="tbed:cancel">Hætta við</button></div></div>`;
    const t = totals(T);
    return backBar() + `<div class="kicker">${kick}</div>
      <h2 class="big" style="margin-top:6px">${esc(T.heiti || "")}</h2>
      <p class="sub">${[T.vskId && findVsk(T.vskId) ? `<a class="plink" data-open="vsk:${esc(T.vskId)}">${esc(T.vidskiptavinur || findVsk(T.vskId).name)}</a>` : esc(T.vidskiptavinur || ""), P && T.tengilidur ? esc(T.tengilidur) : "", P && T.simi ? `<a class="plink" href="tel:${esc(T.simi)}">${esc(T.simi)}</a>` : "", esc(dRange(T)), L && T.fra ? esc(tbDagar(T) + (tbDagar(T) === 1 ? " dagur" : " dagar")) : "", esc(T.stadsetning || "")].filter(Boolean).join(" · ")}</p>
      ${pr ? `<p class="sub">Verkefni: <a class="plink" data-open="verk:${esc(pr.id)}">${esc(pr.nafn)}</a></p>` : ""}
      ${tbMennHTML(T)}
      <div class="links">${MCP && !laest(T) && !(T.bidur && !P) ? `<button type="button" class="btn primary" data-act="tbed:start:${esc(T.id)}">✎ Breyta</button>` : ""}${P ? "" : `<button type="button" class="btn" data-act="tbpdf:pv:${esc(T.id)}">Forskoða PDF</button><button type="button" class="btn" data-act="tbpdf:dl:${esc(T.id)}">Sækja PDF</button>
        ${MCP && !P ? `<button type="button" class="btn" data-act="tbsend:${esc(T.id)}">✉ Senda í pósti</button>` : ""}`}</div>
      ${MCP ? `<div class="kind" style="margin-top:14px">Staða</div>${PV() ? `<div class="fsels">${fsel(STOD(T).map(s => [`tbst:${T.id}:${s}`, s, T.stada === s]), P ? "Staða pöntunar" : "Staða tilboðs")}</div>` : `<div class="chips">${STADA.map(s => `<button type="button" class="chipbtn" data-act="tbst:${esc(T.id)}:${s}" aria-pressed="${T.stada === s}">${s}</button>`).join("")}</div>`}
        <div class="links" style="margin-top:10px">${P ? `${!T.verkefniId ? `<button type="button" class="btn" data-act="tbverk:${esc(T.id)}">Gera að verkefni</button>` : ""}` : `${T.stada === "Samþykkt" && !T.verkefniId ? `<button type="button" class="btn primary" data-act="tbverk:${esc(T.id)}">Stofna verkefni úr tilboði</button>` : ""}${T.stada === "Samþykkt" && PNON() && !PN().some(x => x.tilbodId === T.id) ? `<button type="button" class="btn" data-act="pntb:${esc(T.id)}">Stofna pöntun úr tilboði</button>` : ""}<button type="button" class="btn" data-act="tbutg:${esc(T.id)}">Ný útgáfa</button><button type="button" class="btn" data-act="tbcopy:${esc(T.id)}">Afrita sem nýtt tilboð</button>`}${DEL() ? `<button type="button" class="btn danger" data-act="tbdel:${esc(T.id)}">Eyða</button>` : ""}</div>` : ""}
      ${!P && T.vidskHafnad && T.stada !== "Hafnað" ? `<div class="card smbid smhaf"><b>✕ ${esc(T.vidskHafnad.nafn || "Viðskiptavinur")} hafnaði tilboðinu ${esc(dIS(String(T.vidskHafnad.dags || "").slice(0, 10)))}</b>${T.vidskHafnad.astaeda ? `<span>„${esc(T.vidskHafnad.astaeda)}“</span>` : ""}${MCP ? `<button type="button" class="btn" data-act="tbst:${esc(T.id)}:Hafnað">Merkja hafnað</button>` : ""}</div>` : ""}
      ${!P && (T.vidskSvor || []).length ? `<div class="card smsvor"><b>Spurningar frá viðskiptavini</b>${T.vidskSvor.map(m => { const a = (T.vidskSvorSvar || {})[String(m.dags || "")]; return `<div class="smsv"><small>${esc(m.nafn || "")} · ${esc(dIS(String(m.dags || "").slice(0, 10)))} kl. ${esc(String(m.dags || "").slice(11, 16))}</small><div>${esc(m.texti || "")}</div>${a ? `<div class="smsvar"><small>Svarað í pósti${a.af ? " · " + esc(a.af) : ""} · ${esc(dIS(String(a.dags).slice(0, 10)))} kl. ${esc(String(a.dags).slice(11, 16))}</small>${a.texti ? `<div>${esc(a.texti)}</div>` : ""}</div>` : `<small class="smsvbid">Ósvarað</small>`}</div>`; }).join("")}${(T.netfang || findVsk(T.vskId)?.netfang) ? `<button type="button" class="btn" data-act="tbsvara:${esc(T.id)}">Svara í pósti</button>` : ""}</div>` : ""}
      ${!P && T.bidur && T.stada !== "Samþykkt" ? `<div class="card smbid"><b>✓ ${esc(T.bidur.nafn || "Viðskiptavinur")} samþykkti tilboðið ${esc(dIS(String(T.bidur.dags || "").slice(0, 10)))}</b><span>Bíður staðfestingar starfsmanns.</span>${MCP ? `<button type="button" class="btn primary" data-act="tbst:${esc(T.id)}:Samþykkt">Staðfesta…</button>` : ""}</div>` : ""}
      ${!P && !T.bidur ? (() => { const til = T.sentTil || T.netfang; // 2.73.0: staðan sem litaður borði
        const m = T.stada === "Sent" ? ["sent", `✉ Sent${T.sent ? " " + esc(dIS(T.sent)) : ""}${til ? " á " + esc(til) : ""} – bíður samþykkis viðskiptavinar.${T.opinber ? " Viðskiptavinurinn getur samþykkt í gegnum tengilinn í póstinum." : ""}`]
          : T.stada === "Drög" ? ["drog", "Drög – ekki enn sent viðskiptavini."]
          : T.stada === "Samþykkt" ? ["samth", `✓ Samþykkt${T.samthykkt?.dags ? " " + esc(dIS(String(T.samthykkt.dags).slice(0, 10))) : ""}${T.samthykkt?.nafn ? " af " + esc(T.samthykkt.nafn) : ""}.`]
          : T.stada === "Hafnað" ? ["hafn", "✕ Hafnað."] : null;
        return m ? `<p class="smst st-${m[0]}">${m[1]}</p>` : ""; })() : ""}
      ${!P && MCP && window.atrPub && ["Drög", "Sent"].includes(T.stada) && !T.bidur ? `<div class="links smpub">${T.opinber ? `<button type="button" class="btn" data-act="tbpub:${esc(T.id)}">Afrita samþykktartengil</button><button type="button" class="btn" data-act="tbpubx:${esc(T.id)}">Loka tengli</button>` : `<button type="button" class="btn" data-act="tbpub:${esc(T.id)}" title="Viðskiptavinurinn skoðar tilboðið og samþykkir með nafni og undirskrift">Búa til samþykktartengil</button>`}</div>` : ""}
      ${laest(T) ? `<p class="hint smlock">🔒 Samþykkt${T.samthykkt?.dags ? " " + esc(dIS(T.samthykkt.dags.slice(0, 10))) : ""}${T.samthykkt?.vidsk ? " af viðskiptavini (" + esc(T.samthykkt.vidsk.nafn || "") + ")" : ""} – tilboðið er læst. ${pontunAf(T) ? "Breytingar fara í pöntun " + esc(pontunAf(T).nr) + "." : "Gerðu nýja útgáfu til að breyta því."}</p>` : ""}
      ${arekHTML(T)}${!P && PNON() ? (PN().filter(x => x.tilbodId === T.id).map(x => `<p class="sub">Pöntun: <a class="plink" data-open="tb:${esc(x.id)}">${esc(x.nr)}</a> · ${esc(x.stada)}</p>`).join("")) : ""}${P && T.tilbodId && findT(T.tilbodId) ? `<p class="sub">Úr tilboði <a class="plink" data-open="tb:${esc(T.tilbodId)}">${esc(findT(T.tilbodId).nr)}</a></p>` : ""}${P ? hverHTML(T) : ""}
      <div class="viewtitle">Línur</div><div class="tbtab">${tbTableHTML(T, false)}</div>
      <div class="card rksum" style="margin-top:10px">${tbTotHTML(T)}</div>
      ${T.athugasemd ? `<div class="viewtitle">Athugasemd</div><p style="white-space:pre-wrap;margin:0">${esc(T.athugasemd)}</p>` : ""}
      ${(T.eldri || []).length ? `<div class="viewtitle">Fyrri útgáfur</div>${llist(T.eldri.slice().reverse().map(e => `<div class="lrow"><div class="lm"><div class="lt">Útgáfa ${esc(String(e.utgafa))}</div><div class="ls">${esc(dIS(e.dags))}</div></div><div class="lr"><span class="lc">${esc(krs(e.net))}</span></div></div>`))}` : ""}
      <p class="hint" style="margin-top:10px">${P ? "Uppruni: " + esc(UPL(T.uppruni) || "–") : "Gildir til " + esc(T.gildir ? dIS(T.gildir) : "–")} · stofnað ${esc(dIS(T.dags))} · ${esc(krs(t.tot))} með VSK</p>`;
  };
  // Breytingar í ritlinum: haus (data-h) og línur (data-l) uppfæra drögin; aðeins samtölur teiknaðar aftur (fókus helst)
  const refreshTot = () => { if (!EDT) return; const tt = document.getElementById("tb-tot"); if (tt) tt.innerHTML = tbTotHTML(EDT);
    (EDT.linur || []).forEach(l => { const b = document.querySelector(`[data-ls="${CSS.escape(l.id)}"]`); if (b) b.textContent = krs(lSum(l, EDT)); });
    document.querySelectorAll(".tbgh span").forEach((s, i) => { const g = groups(EDT)[i]; if (g) s.textContent = krs(g[1].reduce((a, l) => a + lSum(l, EDT), 0)); });
    const dg = document.getElementById("tb-dg"); if (dg) dg.textContent = dagTxt(EDT);
    const ar = document.getElementById("tb-arek"); if (ar) { const hh = arekHTML(EDT); if (ar.innerHTML !== hh) ar.innerHTML = hh; } };
  const reTab = () => { const tb = document.getElementById("tb-tab"); if (tb) tb.innerHTML = tbTableHTML(EDT, true); };
  const onEd = e => { if (!EDT || !e.target.closest?.("#tbed")) return; const h = e.target.dataset.h, Lk = e.target.dataset.l, hl = e.target.dataset.hl, v = e.target.value;
    if (h) { if (h === "afsl") EDT.afsl = n0(v); else if (h === "vskId") { EDT.vskId = v || null; EDT.vidskiptavinur = v ? findVsk(v)?.name || null : null; } else EDT[h] = v || null;
      if (h === "fra" && EDT.til && EDT.til < v) { EDT.til = v; const ti = document.querySelector('[data-h="til"]'); if (ti) ti.value = v; }
      if ((h === "fra" || h === "til") && e.type === "change") reTab(); }
    if (Lk) { const i = Lk.indexOf(":"), f = Lk.slice(0, i), id = Lk.slice(i + 1), l = (EDT.linur || []).find(x => x.id === id); if (!l) return;
      if (["magn", "verd", "afsl"].includes(f)) l[f] = f === "verd" ? parseKr(v) || 0 : n0(v); else if (f === "dagar") l.dagar = Math.round(n0(v)) || null; else l[f] = v;
      if ((f === "teg" || f === "hl") && e.type === "change") reTab(); }
    if (hl != null && e.type === "change") { const nv = v.trim() || hl; (EDT.linur || []).forEach(l => { if ((l.hl || "Annað") === hl) l.hl = nv; }); reTab(); }
    refreshTot(); };
  document.addEventListener("input", onEd); document.addEventListener("change", onEd);

  // Velja úr vörulista deildarinnar: sheet með leit og flokkum; hver smellur bætir línu við drögin
  // Hvaða hnappar á blönduðu tilboði (2.19.3): eftir þjónustu verkefnis (leiga → Búnaður, sala → Vara), annars báðir
  function pickDs(T) { const on = ["leiga", "sala"].filter(d => ON(d)), /* 2.56.2: „+ Vara“ og „+ Búnaður“ alltaf í boði þegar sviðið er virkt, líka meðan listinn er tómur */ p = T?.verkefniId && (S?.verkefni || []).find(x => x.id === T.verkefniId);
    const pd = p && (p.deild === "leiga" || p.deild === "sala") ? p.deild : null, has = d => (T?.linur || []).some(l => l.teg === d || (d === "leiga" && l.teg === "pakki"));
    const ds = pd ? on.filter(d => d === pd || has(d)) : on; return ds.length ? ds : on; }
  function picker(M) {
    const D = M || tDeild(EDT), src = () => isMix(EDT) ? (M ? VRd(M) : VR()).filter(v => v.tegund !== "vinna") : VRd(D);
    let pf = "", pq = ""; const draw = () => {
      const xs = src().filter(v => (!pf || (pf === "_vinna" ? v.tegund === "vinna" : v.flokkur === pf && v.tegund !== "vinna")) && (!pq || (v.heiti + " " + (v.nr || "")).toLowerCase().includes(pq))).sort((a, b) => FLOKKAR(D).indexOf(a.flokkur) - FLOKKAR(D).indexOf(b.flokkur) || a.heiti.localeCompare(b.heiti, "is"));
      document.getElementById("pk-list").innerHTML = xs.length ? xs.map(v => { const n = (EDT.linur || []).filter(l => l.v === v.id).reduce((a, l) => a + (+l.magn || 0), 0);
        const ls = lausFyrir(v, EDT);
        return `<button type="button" class="lrow tap pkrow${ls != null && ls <= 0 ? " uppb" : ""}" data-pick="${esc(v.id)}" style="width:100%;text-align:left;border:0;background:none;font:inherit;color:inherit"><div class="lm"><div class="lt">${esc(v.heiti)}</div><div class="ls">${esc([v.flokkur, v.tegund === "pakki" ? "Pakki · " + pakkiTxt(v) : v.tegund === "vinna" ? "Vinna og þjónusta" : (D === "sala" && +v.fjoldi ? num(v.fjoldi) + " á lager" : "")].filter(Boolean).join(" · "))}</div></div><div class="lr">${ls != null ? `<span class="pill ${ls > 0 ? "pc-teal" : "pc-red"}">${ls > 0 ? esc(fx(ls)) + " laus" : "Ekki laust"}</span>` : ""}<span class="lc">${esc(krs(vPrice(v)))}</span>${n ? `<span class="pill">${esc(fx(n))} ${isP(EDT) ? "í pöntun" : "á tilboði"}</span>` : ""}</div></button>`; }).join("") : src().length ? `<div class="empty">Ekkert fannst.</div>` : `<div class="empty">${D === "leiga" || M === "leiga" ? "Enginn búnaður" : "Engar vörur"} í ${(M || D) === "leiga" ? "búnaðarlista" : "vörulista"} ennþá.<br><span class="ls">Skráðu ${(M || D) === "leiga" ? "búnað" : "vörur"} í Vörulisti › ${(M || D) === "leiga" ? "Leiga" : "Sala"}, eða notaðu „+ Sérlína“ fyrir staka línu.</span></div>`; };
    const fl = FLOKKAR(D).filter(f => src().some(v => v.flokkur === f && v.tegund !== "vinna"));
    sheet.innerHTML = `<h3 id="sheet-h">${M ? (M === "leiga" ? "Bæta við búnaði" : "Bæta við vöru") : "Bæta við úr " + (D === "leiga" ? "búnaðarlista" : "vörulista")}</h3><input type="search" id="pk-q" placeholder="Leita…" autocomplete="off" style="margin-bottom:8px">
      ${PV() ? `<select class="fsel" id="pk-fs" aria-label="Flokkur" style="margin-bottom:8px"><option value="">Allir flokkar</option>${fl.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join("")}</select>` : ""}<div class="chips" id="pk-f" style="margin-bottom:8px${PV() ? ";display:none" : ""}"><button type="button" class="chipbtn" data-pf="" aria-pressed="true">Allt</button>${fl.map(f => `<button type="button" class="chipbtn" data-pf="${esc(f)}" aria-pressed="false">${esc(f)}</button>`).join("")}${src().some(v => v.tegund === "vinna") ? `<button type="button" class="chipbtn" data-pf="_vinna" aria-pressed="false">Vinna og þjónusta</button>` : ""}</div>
      <div class="llist" id="pk-list"></div><p class="hint" style="margin-top:8px">Smelltu til að bæta við (aftur til að auka magn).${EDT?.fra && D === "leiga" ? " „Laus“ miðast við " + esc(dRange(EDT)) + "." : ""} Magn${D === "leiga" ? ", daga" : ""} og verð má laga á tilboðinu.</p>
      <div class="actions"><button type="button" class="btn primary" id="pk-done">Lokið</button></div>`;
    sheetwrap.hidden = false; draw();
    document.getElementById("pk-q").oninput = e => { pq = e.target.value.trim().toLowerCase(); draw(); };
    const fs = document.getElementById("pk-fs"); if (fs) fs.onchange = () => { pf = fs.value; draw(); };
    document.getElementById("pk-f").onclick = e => { const b = e.target.closest("[data-pf]"); if (!b) return; pf = b.dataset.pf; sheet.querySelectorAll("[data-pf]").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); };
    document.getElementById("pk-list").onclick = e => { const b = e.target.closest("[data-pick]"); if (!b) return; const v = findV(b.dataset.pick); if (!v) return;
      const ex = (EDT.linur || []).find(l => l.v === v.id && !l.dagar && !+l.afsl); if (ex) ex.magn = (+ex.magn || 0) + 1; else (EDT.linur = EDT.linur || []).push(lineFrom(v, EDT));
      toast(v.heiti + (ex ? " – magn " + fx(ex.magn) : " bætt við")); draw(); };
    document.getElementById("pk-done").onclick = () => { sheetwrap.hidden = true; render(); };
  }

  // Þjónusta á tilboð (2.17.0): liðir verðskrár (ef virk) eða þjónusta fyrirtækisins á tímagjaldi
  function thjPicker() {
    // Einn listi (2.18.4): „Vinna og þjónusta“ (vörur af tegund vinna) – ef hann er tómur: verðskrá eða þjónusta á tímagjaldi
    const vv = VR().filter(v => v.tegund === "vinna").sort((a, b) => String(a.heiti).localeCompare(String(b.heiti), "is"));
    const vl = window.ON && ON("verdskra") && window.VERD ? (VERD().lidir || []) : [], tg = +(CFG().reikn?.timagjald) || 0;
    // 2.22.0: einn þjónustulisti – liðir verðskrár (tímagjald) og vinna/þjónusta með verði saman; varaleið: þjónusta á tímagjaldi
    const a1 = vl.map(x => ({ heiti: x.heiti, verd: +x.verd || 0, ein: "klst.", g: "Tímagjald" })), a2 = vv.filter(v => !vl.some(x => x.heiti === v.heiti)).map(v => ({ v: v.id, heiti: v.heiti, verd: +v.soluverd || 0, ein: v.eining || "klst.", g: v.flokkur || "Vinna og þjónusta" }));
    const items = a1.length || a2.length ? a1.concat(a2) : THJ().map(t => ({ heiti: t, verd: tg, ein: "klst." }));
    sheet.innerHTML = `<h3 id="sheet-h">Bæta við þjónustu</h3><div class="llist" id="tj-list">${items.map((x, i) => `<button type="button" class="lrow tap" data-tj="${i}" style="width:100%;text-align:left;border:0;background:none;font:inherit;color:inherit"><div class="lm"><div class="lt">${esc(x.heiti)}</div><div class="ls">${[x.g, x.verd ? krs(x.verd) + "/" + String(x.ein || "klst.").replace(/\.$/, "") : "Verð skráð á tilboðinu"].filter(Boolean).map(esc).join(" · ")}</div></div></button>`).join("")}</div>
      <p class="hint" style="margin-top:8px">Línan fær 1 einingu – breyttu magni og verði á tilboðinu. Föst upphæð: notaðu „Sérlína“.${a1.length || a2.length ? "" : " Skráðu þjónustur með verði undir " + (PV() ? "Tilboð › Þjónustur" : "Búnaður › Vinna og þjónusta") + ", þá birtast þær hér."}</p><div class="actions"><button type="button" class="btn primary" id="tj-done">Lokið</button></div>`;
    sheetwrap.hidden = false;
    document.getElementById("tj-list").onclick = e => { const b = e.target.closest("[data-tj]"); if (!b) return; const x = items[+b.dataset.tj];
      (EDT.linur = EDT.linur || []).push({ id: gid(), v: x.v || null, heiti: x.heiti, teg: "vinna", hl: PV() ? "Þjónusta" : "Vinna og þjónusta", magn: 1, ein: x.ein || "klst.", verd: x.verd, dagar: null, afsl: 0 }); toast(x.heiti + " bætt við"); };
    document.getElementById("tj-done").onclick = () => { sheetwrap.hidden = true; render(); };
  }

  /* ---------- PDF ---------- */
  async function tbPdf(T) {
    const D = tDeild(T), L = D === "leiga" && (!isMix(T) || (T.linur || []).some(l => l.teg === "leiga" || l.teg === "pakki"));
    const P = await DOK.pdf(), { C, M, X1 } = P, co = DOK.co(), t = totals(T), label = "Tilboð " + T.nr + (+T.utgafa > 1 ? " (útgáfa " + T.utgafa + ")" : "");
    let y = P.head("Tilboð", [["Tilboð nr.", T.nr + (+T.utgafa > 1 ? " · útg. " + T.utgafa : "")], ["Dagsetning", dIS(T.dags)], ["Gildir til", T.gildir ? dIS(T.gildir) : ""]]);
    const need = h => { if (y + h > P.H - 60) { P.doc.addPage(); y = P.contHead(label); return true; } return false; };
    const b = T.vskId ? findVsk(T.vskId) : null, col2 = M + (X1 - M) / 2 + 10;
    const sl = [co.nafn, co.kt && "kt. " + co.kt, co.heimilisfang, [co.netfang, co.simi].filter(Boolean).join(" · ")].filter(Boolean);
    const bl = [T.vidskiptavinur || b?.name, b?.kennitala && "kt. " + b.kennitala, T.tengilidur && "Tengiliður: " + T.tengilidur, T.netfang].filter(Boolean);
    P.text("FRÁ", M, y, { size: 7.5, color: C.stal, space: 1.2 }); P.text("TIL", col2, y, { size: 7.5, color: C.stal, space: 1.2 }); y += 15;
    const rows = Math.max(sl.length, bl.length);
    for (let i = 0; i < rows; i++) { if (sl[i]) P.text(sl[i], M, y + i * 13, { w: i ? "regular" : "medium", size: i ? 9 : 10 }); if (bl[i]) P.text(bl[i], col2, y + i * 13, { w: i ? "regular" : "medium", size: i ? 9 : 10 }); }
    y += rows * 13 + 14;
    P.text(T.heiti || "", M, y, { w: "light", size: 15, color: C.grafit }); y += 16;
    const meta = [T.stadsetning, T.fra ? (L ? dRange(T) + " · " + tbDagar(T) + (tbDagar(T) === 1 ? " leigudagur" : " leigudagar") : "Áætluð afhending " + dIS(T.fra)) : ""].filter(Boolean).join("  ·  ");
    if (meta) { P.text(meta, M, y, { size: 9, color: C.grafit }); y += 14; }
    y += 8;
    const X = L ? { d: M + 8, m: 318, a: 362, v: 448, p: 482, u: X1 - 8 } : { d: M + 8, m: 362, a: 0, v: 448, p: 482, u: X1 - 8 };
    const head = () => { P.rect(M, y, X1 - M, 20, C.grafit); [["Lýsing", X.d], ["Magn", X.m, "right"], ...(L ? [["Dagar", X.a, "right"]] : []), ["Verð", X.v, "right"], ["Afsl.", X.p, "right"], ["Upphæð", X.u, "right"]].forEach(([s, x, a]) => P.text(s, x, y + 13.5, { w: "medium", size: 8, color: C.hvitt, align: a || "left" })); y += 20; };
    head();
    groups(T).forEach(([hl, ls]) => {
      if (need(40)) head();
      y += 6; P.text(hl.toUpperCase(), X.d, y + 10, { w: "medium", size: 8, color: C.grafit, space: 1 }); y += 16; P.line(M, y, X1, y);
      ls.forEach((l, i) => { const v = l.v ? findV(l.v) : null, pk = v?.tegund === "pakki" ? pakkiTxt(v) : "", w = (L ? X.m : X.m) - 44 - X.d;
        const ds = P.wrap(l.heiti, w, 9), ps = pk ? P.wrap(pk, w, 7.5) : [], h = 9 + ds.length * 12 + ps.length * 10; if (need(h)) head();
        if (i % 2) P.rect(M, y, X1 - M, h, C.pappir);
        ds.forEach((s, j) => P.text(s, X.d, y + 13 + j * 12, { size: 9 })); ps.forEach((s, j) => P.text(s, X.d, y + 13 + ds.length * 12 + j * 10 - 2, { size: 7.5, color: C.stal }));
        P.text(fx(l.magn) + " " + (l.ein || ""), X.m, y + 13, { size: 9, align: "right" });
        if (L && l.teg === "leiga") P.text(String(lDagar(l, T)), X.a, y + 13, { size: 9, align: "right" });
        P.text(num(Math.round(+l.verd || 0)), X.v, y + 13, { size: 9, align: "right" }); if (+l.afsl) P.text(fx(l.afsl) + "%", X.p, y + 13, { size: 9, align: "right" });
        P.text(num(lSum(l, T)), X.u, y + 13, { size: 9, w: "medium", align: "right" }); y += h; P.line(M, y, X1, y); });
      need(18); P.text("Samtals – " + hl, X.v + 34, y + 12, { size: 8.5, color: C.grafit, align: "right" }); P.text(num(ls.reduce((a, l) => a + lSum(l, T), 0)) + " kr.", X.u, y + 12, { size: 8.5, w: "medium", align: "right" }); y += 18;
    });
    need(130); y += 14; const tx = 330, row = (k, v) => { P.text(k, tx, y, { size: 9.5, color: C.grafit }); P.text(v, X1 - 8, y, { size: 9.5, align: "right" }); y += 15; };
    if (t.leiga) row("Leiga", krs(t.leiga)); if (t.sala) row(L ? "Sala" : "Vörur", krs(t.sala)); if (t.vinna) row("Vinna og þjónusta", krs(t.vinna));
    if (t.afsl) row("Afsláttur " + fx(T.afsl) + "%", "−" + krs(t.afsl));
    row("Samtals án VSK", krs(t.net)); row("VSK " + fx(vskP()) + "%", krs(t.vsk)); y -= 5;
    P.rect(tx - 8, y, X1 - tx + 8, 30, C.nott); P.text("Samtals með VSK", tx, y + 19.5, { w: "medium", size: 10.5, color: C.hvitt }); P.text(krs(t.tot), X1 - 8, y + 19.5, { w: "medium", size: 11.5, color: C.hvitt, align: "right" }); y += 48;
    const txt = (title, s) => { if (!s) return; need(40); P.text(title, M, y, { size: 7.5, color: C.stal, space: 1.2 }); y += 14; P.wrap(s, X1 - M, 9).forEach(z => { need(13); P.text(z, M, y, { size: 9 }); y += 12.5; }); y += 10; };
    txt("ATHUGASEMD", T.athugasemd); txt("SKILMÁLAR", (L ? CF().skilmalarL : CF().skilmalarS) + (T.gildir ? " Tilboðið gildir til " + dIS(T.gildir) + "." : ""));
    return P.finish(label);
  }
  const fileBase = T => `Tilboð ${T.nr}${+T.utgafa > 1 ? " v" + T.utgafa : ""} ${T.vidskiptavinur || ""} ${T.heiti || ""}`.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  window.tbPdfBytes = tbPdf;

  /* ---------- Prufugögn (leiga og sala) ---------- */
  function prufa(cls) {
    const V = [], add = (deild, heiti, flokkur, tegund, o = {}) => { const v = { id: gid(), deild, heiti, flokkur, tegund, eining: "stk.", leiguverd: 0, soluverd: 0, innkaupsverd: 0, fjoldi: 0, lysing: null, innihald: [], prufa: true, ...o }; V.push(v); return v; };
    let n = 100; const nr = p => p + "-" + (++n);
    // Leiga – búnaðarlisti
    const l = (...a) => add("leiga", ...a);
    const e8 = l("Hátalari", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 6500, fjoldi: 16, lysing: "Tvíátta hátalari. Með festingum." });
    const b6 = l("Bassabox", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 9500, fjoldi: 8, lysing: "18\" bassabox." });
    const d20 = l("Magnari", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 12000, fjoldi: 6 });
    const dlive = l("Hljóðborð, stórt", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 35000, fjoldi: 2, lysing: "Stafrænt hljóðborð með stagebox." });
    const sq5 = l("Hljóðborð, lítið", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 18000, fjoldi: 3 });
    const sm58 = l("Hljóðnemi", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 1500, fjoldi: 24 });
    const ulxd = l("Þráðlaus hljóðnemi", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 6000, fjoldi: 12 });
    const k12 = l("Hátalari með magnara", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 4500, fjoldi: 10 });
    const mac = l("Hreyfiljós", "Ljós", "leiga", { nr: nr("LJ"), leiguverd: 8500, fjoldi: 24 });
    const parL = l("LED PAR RGBW", "Ljós", "leiga", { nr: nr("LJ"), leiguverd: 2000, fjoldi: 48 });
    const ma3 = l("Ljósaborð", "Ljós", "leiga", { nr: nr("LJ"), leiguverd: 45000, fjoldi: 1 });
    const haze = l("Reykvél", "Ljós", "leiga", { nr: nr("LJ"), leiguverd: 9000, fjoldi: 2 });
    const truss = l("Truss, 3 m", "Ljós", "leiga", { nr: nr("LJ"), leiguverd: 2500, fjoldi: 30 });
    const led = l("LED-skjáveggur (á m²)", "LED", "leiga", { nr: nr("LED"), eining: "m²", leiguverd: 18000, fjoldi: 40, lysing: "Innanhúss LED, 50 × 50 cm einingar." });
    const nova = l("Stýring fyrir LED-vegg", "LED", "leiga", { nr: nr("LED"), leiguverd: 15000, fjoldi: 3 });
    const tv75 = l("Skjár 75\" á standi", "Skjáir", "leiga", { nr: nr("SK"), leiguverd: 15000, fjoldi: 8 });
    l("Skjár 55\" á standi", "Skjáir", "leiga", { nr: nr("SK"), leiguverd: 9000, fjoldi: 12 });
    const proj = l("Skjávarpi 10.000 lm með tjaldi", "Skjáir", "leiga", { nr: nr("SK"), leiguverd: 28000, fjoldi: 3 });
    l("Rafmagnsdreifing 63A", "Annað", "leiga", { nr: nr("AN"), leiguverd: 7500, fjoldi: 4 });
    const tech = l("Hljóðmaður", "Tæknifólk", "vinna", { nr: nr("VN"), eining: "klst.", soluverd: 9500 });
    const ljm = l("Ljósamaður", "Tæknifólk", "vinna", { nr: nr("VN"), eining: "klst.", soluverd: 9500 });
    const upps = l("Uppsetning og niðurtaka", "Uppsetning", "vinna", { nr: nr("VN"), eining: "klst.", soluverd: 7500 });
    const akst = l("Akstur, sendibíll", "Akstur", "vinna", { nr: nr("VN"), eining: "ferð", soluverd: 15000 });
    l("Hljóðkerfi lítið (allt að 150 manns)", "Hljóð", "pakki", { nr: nr("PK"), leiguverd: 32000, fjoldi: 2, innihald: [{ v: k12.id, m: 2 }, { v: sq5.id, m: 1 }, { v: sm58.id, m: 2 }, { v: ulxd.id, m: 1 }] });
    const pkL = l("Ræðupúltpakki", "Hljóð", "pakki", { nr: nr("PK"), leiguverd: 12000, fjoldi: 3, innihald: [{ v: sm58.id, m: 1 }, { v: k12.id, m: 1 }] });
    // Sala – vörulisti (heildsala og install)
    const s = (...a) => add("sala", ...a); n = 500;
    const g4030 = s("Vegghátalari", "Hátalarar", "sala", { nr: nr("SV"), soluverd: 98000, innkaupsverd: 66000, fjoldi: 20, lysing: "Fyrir veitingastaði og hótel, hvítur eða svartur." });
    s("Stúdíóhátalari", "Hátalarar", "sala", { nr: nr("SV"), soluverd: 189000, innkaupsverd: 130000, fjoldi: 6 });
    const loft = s("Loftahátalari 6,5\" (hvítur)", "Hátalarar", "sala", { nr: nr("SV"), soluverd: 24900, innkaupsverd: 14500, fjoldi: 60 });
    s("Hátalari, fagleg gerð", "Hátalarar", "sala", { nr: nr("SV"), soluverd: 489000, innkaupsverd: 352000, fjoldi: 4 });
    s("Magnari, lítill", "Magnarar og stýring", "sala", { nr: nr("SV"), soluverd: 129000, innkaupsverd: 92000, fjoldi: 6 });
    const spa = s("Magnari, 4 rása", "Magnarar og stýring", "sala", { nr: nr("SV"), soluverd: 149000, innkaupsverd: 101000, fjoldi: 5 });
    const dsp = s("Hljóðstýring (DSP) með veggstýringu", "Magnarar og stýring", "sala", { nr: nr("SV"), soluverd: 219000, innkaupsverd: 150000, fjoldi: 3 });
    const mxa = s("Borðhljóðnemi", "Hljóðnemar", "sala", { nr: nr("SV"), soluverd: 289000, innkaupsverd: 205000, fjoldi: 2 });
    const s75 = s("Fagskjár 75\"", "Skjáir", "sala", { nr: nr("SV"), soluverd: 329000, innkaupsverd: 241000, fjoldi: 8 });
    const vegg = s("Veggfesting fyrir skjá", "Uppsetningarefni", "sala", { nr: nr("SV"), soluverd: 24900, innkaupsverd: 12000, fjoldi: 15 });
    const kap = s("Hátalarakapall 2×2,5 mm²", "Uppsetningarefni", "sala", { nr: nr("SV"), eining: "m", soluverd: 690, innkaupsverd: 310, fjoldi: 500 });
    const uppS = s("Uppsetning (install)", "Uppsetning", "vinna", { nr: nr("VS"), eining: "klst.", soluverd: 11500 });
    const forr = s("Forritun og stilling", "Tæknifólk", "vinna", { nr: nr("VS"), eining: "klst.", soluverd: 14500 });
    const akS = PV() ? akst : s("Akstur", "Akstur", "vinna", { nr: nr("VS"), eining: "ferð", soluverd: 15000 }); // pakkaval: ein vinnuskrá, enginn tvítekinn akstur
    const CL = cls || S?.vidskiptavinir || [], cl = CL[0] || null, cl2 = CL[1] || cl;
    const day = off => { const x = new Date(); x.setDate(x.getDate() + off); return isoDay(x); };
    const tb = (deild, nr, o, items) => { const T = { id: gid(), nr, deild, vskId: null, vidskiptavinur: null, tengilidur: null, netfang: null, stadsetning: null, fra: null, til: null, gildir: day(14), dags: day(-2), stada: "Drög", utgafa: 1, eldri: [], afsl: 0, athugasemd: null, verkefniId: null, prufa: true, ...o };
      T.linur = items.map(([v, m]) => ({ ...lineFrom(v, T), magn: m })); return T; };
    const T = [
      tb("leiga", "L-0901", { heiti: "Árshátíð", vskId: cl?.id || null, vidskiptavinur: cl?.name || "Viðskiptavinur A", tengilidur: "Tengiliður A", stadsetning: "Salur A", fra: day(12), til: day(13), stada: "Sent", dags: day(-3) },
        [[e8, 8], [b6, 4], [d20, 3], [dlive, 1], [ulxd, 4], [mac, 12], [parL, 24], [ma3, 1], [haze, 1], [truss, 10], [led, 24], [nova, 1], [tech, 18], [ljm, 18], [upps, 24], [akst, 4]]),
      tb("leiga", "L-0902", { heiti: "Ráðstefna – fundarsalur", vidskiptavinur: cl2?.name || "Viðskiptavinur B", vskId: cl2?.id || null, stadsetning: "Ráðstefnusalur", fra: day(5), til: day(5), stada: "Samþykkt", dags: day(-6), afsl: 5 },
        [[pkL, 2], [proj, 1], [tv75, 2], [tech, 9], [akst, 2]]),
      tb("leiga", "L-0903", { heiti: "Útitónleikar", vidskiptavinur: "Viðskiptavinur C", stadsetning: "Útisvæði", fra: day(40), til: day(42), dags: day(-10), stada: "Hafnað" },
        [[e8, 16], [b6, 8], [d20, 6], [dlive, 1], [mac, 24], [truss, 20], [tech, 30]]),
      tb("sala", "S-0901", { heiti: "Hljóðkerfi fyrir veitingastað", vidskiptavinur: "Viðskiptavinur D", stadsetning: "Gata 10", fra: day(20), dags: day(-1) },
        [[loft, 12], [spa, 1], [dsp, 1], [kap, 150], [uppS, 16], [forr, 4], [akS, 2]]),
      tb("sala", "S-0902", { heiti: "Fundarsalur – hljóð og mynd", vidskiptavinur: cl?.name || "Viðskiptavinur A", vskId: cl?.id || null, stadsetning: "Fundarsalur 2. hæð", fra: day(30), dags: day(-4), stada: "Sent" },
        [[s75, 2], [vegg, 2], [mxa, 1], [dsp, 1], [g4030, 4], [kap, 60], [uppS, 20], [forr, 6], [akS, 2]])
    ];
    // Pantanir (2.20.0) – aðeins þar sem einingin er virk (annars leyfa reglurnar ekki safnið)
    const pn = (nr, o, items) => { const P = { id: gid(), pontun: true, nr, deild: "blandad", heiti: "Pöntun", vskId: null, vidskiptavinur: null, tengilidur: null, simi: null, netfang: null, uppruni: "simi", ytriNr: null, stadsetning: null,
        fra: day(0), til: day(0), dags: day(-1), stada: "Ný", afsl: 0, athugasemd: null, verkefniId: null, tilbodId: null, prufa: true, ...o }; P.linur = items.map(([v, m]) => ({ ...lineFrom(v, P), magn: m })); return P; };
    const Pn = PNON() ? [
      pn("P-0901", { heiti: "Hljóðnemi fyrir afmæli", tengilidur: "Sigga Jóns", simi: "555 1234", fra: day(1), til: day(2), stada: "Staðfest" }, [[ulxd, 1], [k12, 1]]),
      pn("P-0902", { heiti: "Skjár á kynningu", vidskiptavinur: cl2?.name || "Viðskiptavinur B", vskId: cl2?.id || null, uppruni: "postur", fra: day(-1), til: day(0), stada: "Afhent" }, [[tv75, 1], [akst, 2]]),
      pn("P-0903", { heiti: "Skjávarpar fyrir námskeið", tengilidur: "Jón Jónsson", uppruni: "postur", fra: day(5), til: day(5), stada: "Staðfest" }, [[proj, 3]]),
      pn("P-0904", { heiti: "Partýpakki", tengilidur: "Anna Gunnarsdóttir", netfang: "anna@daemi.is", uppruni: "shopify", ytriNr: "1047", fra: day(8), til: day(9) }, [[k12, 2], [parL, 8], [haze, 1]])
    ] : [];
    if (window.ORG?.utlit === "I") rikari(V, T, Pn, { cl, cl2, CL, tb, pn, day, e8, b6, d20, dlive, sq5, sm58, ulxd, k12, mac, parL, ma3, haze, truss, led, nova, tv75, proj, tech, ljm, upps, akst, g4030, loft, spa, dsp, mxa, s75, vegg, kap, uppS, forr, akS });
    return { vorur: V, tilbod: T, pantanir: Pn };
  }
  /* Ítarleg prufugögn fyrir útlit I (2.26.0): eintök, skemmdir, lagerhreyfingar, innkaup og birgjar á vörum,
     auk eldri samþykktra tilboða og pantana á öllum sviðum svo yfirlit, gröf og dagatöl fyllist. Allt merkt prufa. */
  function rikari(V, T, Pn, o) {
    const iso = (off, h = 10) => { const x = new Date(); x.setHours(h, 0, 0, 0); x.setDate(x.getDate() + off); return x.toISOString(); };
    const nm = n => (o.CL.find(c => c.name === n) || null);
    const who = n => { const c = nm(n); return { vskId: c?.id || null, vidskiptavinur: n }; };
    // Eintök á leigubúnaði (allt að 24 stk.) – nokkur í skoðun eða viðgerð
    V.filter(v => v.deild === "leiga" && v.tegund === "leiga" && +v.fjoldi && +v.fjoldi <= 24).forEach((v, k) => {
      v.eintok = [...Array(+v.fjoldi)].map((_, i) => ({ nr: v.nr + "-" + String(i + 1).padStart(2, "0"), stada: "ok", hilla: ["A", "B", "C", "D"][k % 4] + (1 + (i >> 3)) }));
    });
    const dmg = (v, i, lys, ref, off, stada) => { if (!v.eintok?.[i]) return; const e = v.eintok[i]; (v.skemmdir = v.skemmdir || []).push({ id: gid(), eintak: e.nr, lysing: lys, ref, dags: iso(off), af: "GG", stada }); e.stada = stada === "opin" ? "skodun" : stada === "vidgerd" ? "vidgerd" : "ok"; };
    dmg(o.e8, 3, "Suð í diskanti eftir flutning", "L-0884 Jólatónleikar", -2, "opin");
    dmg(o.mac, 7, "Mótor í pönnu festist", "L-0871 Árshátíð", -9, "vidgerd");
    dmg(o.ulxd, 1, "Rafhlöðulok brotið", "P-0890", -1, "opin");
    dmg(o.tv75, 5, "Rispa á skjá – nothæfur", "L-0862", -30, "lokid");
    o.e8.eintok && (o.e8.eintok[15].stada = "tynt");
    // Söluvörur: birgjar, lágmark, hreyfingar síðustu 12 mánuði og innkaup
    const birg = { "Hátalarar": "Hljóðheimar ehf.", "Magnarar og stýring": "Tækjasalan ehf.", "Hljóðnemar": "Hljóðheimar ehf.", "Skjáir": "Skjálausnir ehf.", "Uppsetningarefni": "Rafbúðin ehf." };
    let s = 7;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    V.filter(v => v.deild === "sala" && v.tegund === "sala").forEach(v => {
      v.birgir = birg[v.flokkur] || "Heildsalan ehf.";
      v.lagmark = Math.max(2, Math.round((+v.fjoldi || 0) * 0.3));
      const H = []; let q = (+v.fjoldi || 0);
      for (let m = 0; m < 12; m++) { const n = Math.max(0, Math.round(rnd() * Math.max(2, (+v.fjoldi || 0) / 3))); if (!n) continue; const off = -m * 30 - Math.round(rnd() * 25);
        H.push({ dags: iso(off).slice(0, 10), teg: "Selt", ref: "S-08" + (40 + m), magn: -n }); }
      for (let m = 0; m < 4; m++) H.push({ dags: iso(-m * 90 - 12).slice(0, 10), teg: "Móttekið", ref: "IP-00" + (4 - m) + " " + v.birgir, magn: Math.round((+v.fjoldi || 4) * 0.8) });
      H.sort((a, b) => a.dags.localeCompare(b.dags)).forEach(h => { q += 0; h.stada = null; });
      // staða eftir hverja hreyfingu, reiknuð afturábak frá núverandi lager
      let cur = +v.fjoldi || 0; H.slice().reverse().forEach(h => { h.stada = cur; cur -= h.magn; });
      v.hreyfingar = H;
      v.innkaup = [{ id: gid(), nr: "IP-001", birgir: v.birgir, magn: Math.round((+v.fjoldi || 4) * 0.8), vaent: iso(-100).slice(0, 10), dags: iso(-110), stada: "Móttekið", mott: iso(-102) }];
    });
    // Hillur, innkaupsverð leigubúnaðar og taxtar þjónustu (sýnigögn)
    V.filter(v => v.deild === "sala" && v.tegund === "sala").forEach((v, i) => { v.hilla = "D" + (1 + (i % 4)); });
    V.filter(v => v.deild === "leiga" && v.tegund === "leiga").forEach(v => { v.innkaupsverd = Math.round((+v.leiguverd || 0) * 14 / 1000) * 1000; });
    V.filter(v => v.tegund === "vinna" && /klst/.test(v.eining || "")).forEach(v => { v.alag = 40; v.lagmarkMagn = 4; v.innkaupsverd = Math.round((+v.soluverd || 0) * 0.65 / 100) * 100; });
    o.loft.fjoldi = 14; o.loft.lagmark = 20; // undir lágmarki
    o.mxa.fjoldi = 1;
    o.loft.innkaup.push({ id: gid(), nr: "IP-014", birgir: o.loft.birgir, magn: 48, vaent: iso(6).slice(0, 10), dags: iso(-3), stada: "Pantað" });
    o.s75.innkaup.push({ id: gid(), nr: "IP-015", birgir: o.s75.birgir, magn: 4, vaent: iso(12).slice(0, 10), dags: iso(-1), stada: "Pantað" });
    // Tengja núverandi tilboð við viðskiptavini úr prufugögnunum
    const fx = (nr, n) => { const t = T.find(x => x.nr === nr); if (t && nm(n)) Object.assign(t, who(n)); };
    fx("L-0901", "Fyrirtæki X"); fx("L-0902", "Hótel Lind"); fx("S-0902", "Álfaborg ehf.");
    // Eldri samþykkt tilboð síðustu 6 mánuði – Leiga, Sala og Þjónusta – svo tekjugröfin sýni sögu
    const old = [
      ["L-0810", "leiga", "Fyrirtæki X", "Þorrablót", -265, [[o.e8, 6], [o.b6, 2], [o.sq5, 1], [o.parL, 16], [o.tech, 8], [o.akst, 2]]],
      ["S-0812", "sala", "Hótel Lind", "Hátalarar í matsal", -235, [[o.loft, 10], [o.spa, 1], [o.kap, 120], [o.uppS, 12]]],
      ["L-0821", "leiga", "Viðskiptavinur B", "Vorráðstefna", -205, [[o.proj, 2], [o.ulxd, 4], [o.tv75, 2], [o.tech, 8]]],
      ["T-0803", "blandad", "Bláfell ehf.", "Úttekt hljóðkerfa", -180, [[o.forr, 10], [o.akS, 1]]],
      ["L-0840", "leiga", "Álfaborg ehf.", "Opnunarhátíð", -170, [[o.e8, 4], [o.mac, 8], [o.parL, 12], [o.truss, 6], [o.tech, 8], [o.ljm, 8]]],
      ["L-0862", "leiga", "Hótel Lind", "Haustfundur", -150, [[o.tv75, 6], [o.k12, 4], [o.ulxd, 4], [o.tech, 8]]],
      ["L-0871", "leiga", "Fyrirtæki X", "Árshátíð í fyrra", -120, [[o.e8, 8], [o.b6, 4], [o.mac, 12], [o.parL, 24], [o.led, 18], [o.tech, 16], [o.ljm, 16], [o.upps, 20]]],
      ["S-0855", "sala", "Viðskiptavinur D", "Hljóðkerfi í móttöku", -110, [[o.loft, 8], [o.spa, 1], [o.kap, 80], [o.uppS, 10]]],
      ["L-0877", "leiga", "Bláfell ehf.", "Sumarhátíð starfsfólks", -95, [[o.e8, 4], [o.b6, 2], [o.sq5, 1], [o.parL, 16], [o.tech, 10], [o.akst, 2]]],
      ["S-0861", "sala", "Álfaborg ehf.", "Skjáir í verslun", -80, [[o.s75, 3], [o.vegg, 3], [o.uppS, 8], [o.forr, 2]]],
      ["L-0880", "leiga", "Viðskiptavinur A", "Ráðstefna", -62, [[o.proj, 2], [o.tv75, 2], [o.ulxd, 6], [o.tech, 9]]],
      ["T-0812", "blandad", "Bláfell ehf.", "Þjónustuskoðun hljóðkerfis", -50, [[o.forr, 6], [o.uppS, 4], [o.akS, 1]]],
      ["L-0884", "leiga", "Fyrirtæki X", "Jólatónleikar", -35, [[o.e8, 12], [o.b6, 6], [o.d20, 4], [o.dlive, 1], [o.mac, 16], [o.truss, 12], [o.tech, 24], [o.ljm, 20]]],
      ["S-0870", "sala", "Hótel Lind", "Fundarherbergi – hljóð og mynd", -24, [[o.s75, 2], [o.mxa, 1], [o.dsp, 1], [o.vegg, 2], [o.uppS, 12], [o.forr, 4]]],
      ["T-0815", "blandad", "Viðskiptavinur C", "Tækniþjónusta á viðburði", -14, [[o.tech, 12], [o.ljm, 8], [o.akst, 2]]],
      ["L-0889", "leiga", "Viðskiptavinur B", "Kynning", -8, [[o.tv75, 2], [o.k12, 2], [o.tech, 4]]]
    ];
    old.forEach(([nr, d, n, heiti, off, items]) => { const fra = o.day(off), t = o.tb(d === "blandad" ? "leiga" : d, nr, { ...who(n), heiti, fra, til: o.day(off + (d === "leiga" ? 1 : 0)), dags: o.day(off - 12), stada: "Samþykkt" }, items); if (d === "blandad") t.deild = "blandad"; T.push(t); });
    T.push(o.tb("leiga", "L-0904", { ...who("Bláfell ehf."), heiti: "Starfsmannagleði", fra: o.day(19), til: o.day(19), dags: o.day(-1), stada: "Drög" }, [[o.sq5, 1], [o.k12, 4], [o.parL, 16], [o.haze, 1], [o.tech, 6]]));
    T.push(o.tb("leiga", "L-0905", { ...who("Fyrirtæki X"), heiti: "Vörukynning", fra: o.day(26), til: o.day(27), dags: o.day(-9), stada: "Sent" }, [[o.led, 16], [o.nova, 1], [o.tv75, 4], [o.tech, 10], [o.upps, 8]]));
    // Fleiri pantanir á öllum sviðum (aðeins þar sem pantanir eru virkar)
    if (Pn.length) {
      Pn.push(o.pn("P-0905", { ...who("Hótel Lind"), heiti: "Hljóðmaður á fund", uppruni: "postur", fra: o.day(3), til: o.day(3), stada: "Staðfest" }, [[o.tech, 5], [o.akst, 1]]));
      Pn.push(o.pn("P-0906", { ...who("Álfaborg ehf."), heiti: "Loftahátalarar", uppruni: "vefur", fra: o.day(2), til: o.day(2), stada: "Ný" }, [[o.loft, 6], [o.kap, 40]]));
      Pn.push(o.pn("P-0907", { ...who("Viðskiptavinur A"), heiti: "Fagskjár og festing", uppruni: "simi", fra: o.day(-4), til: o.day(-4), stada: "Lokið" }, [[o.s75, 1], [o.vegg, 1], [o.uppS, 2]]));
      Pn.push(o.pn("P-0890", { tengilidur: "Guðrún Ólafsdóttir", heiti: "Brúðkaup", uppruni: "shopify", ytriNr: "1031", fra: o.day(-3), til: o.day(-2), stada: "Skilað" }, [[o.ulxd, 2], [o.k12, 2], [o.parL, 12]]));
      Pn.push(o.pn("P-0908", { ...who("Bláfell ehf."), heiti: "Forritun hljóðstýringar", uppruni: "postur", fra: o.day(7), til: o.day(7), stada: "Staðfest" }, [[o.forr, 3]]));
      Pn.push(o.pn("P-0880", { ...who("Fyrirtæki X"), heiti: "Aukabúnaður á jólatónleika", uppruni: "simi", fra: o.day(-36), til: o.day(-35), stada: "Lokið" }, [[o.sm58, 6], [o.haze, 1]]));
      // 2.41.0: eldri samþykkt tilboð með búnaði/vörum fengu pöntun (Lokið) – eins og reglan er nú; framtíðartilboð án pöntunar sýna „vantar pöntun“
      const ti = o.day(0); let n = 700;
      T.filter(t => t.stada === "Samþykkt" && (t.linur || []).some(l => l.teg !== "vinna") && String(t.til || t.fra || t.dags) < ti && !Pn.some(P => P.tilbodId === t.id)).forEach(t => {
        Pn.push({ ...structuredClone(t), id: "pn-" + t.id, pontun: true, nr: "P-0" + (n++), deild: "blandad", uppruni: "tilbod", stada: "Lokið", tilbodId: t.id, utgafa: 1, eldri: [], lager: null }); });
    }
  }
  // Staðlaður búnaðarlisti (bunadarlisti.js, 2.19.0): admin hleður inn í Búnað; línur merktar „listi“ svo eyða má þeim í einu lagi
  function listi() {
    const L = window.BUNADARLISTI; if (!L) return { vorur: [], flokkar: [] };
    const til = new Set(VR().map(v => v.nr).filter(Boolean)), V = [], byNr = {};
    const ein = h => /á m²/.test(h) ? "m²" : /\(á m\)/.test(h) ? "m" : "stk.";
    const add = o => { if (til.has(o.nr)) return null; const v = { id: gid(), deild: "leiga", eining: "stk.", leiguverd: 0, soluverd: 0, innkaupsverd: 0, fjoldi: 0, lysing: null, innihald: [], listi: true, ...o }; V.push(v); byNr[o.nr] = v; return v; };
    L.bunadur.forEach(([nr, heiti, flokkur, verd, fjoldi, lysing]) => add({ nr, heiti, flokkur, tegund: "leiga", eining: ein(heiti), leiguverd: verd, fjoldi, lysing }));
    L.vinna.forEach(([nr, heiti, eining, verd, lysing, flokkur]) => add({ nr, heiti, flokkur: flokkur || "Tæknifólk", tegund: "vinna", eining, soluverd: verd, lysing }));
    L.pakkar.forEach(([nr, heiti, verd, lysing, inn]) => add({ nr, heiti, flokkur: "Pakkar", tegund: "pakki", leiguverd: verd, fjoldi: 2, lysing,
      innihald: inn.map(([n, m]) => ({ v: (byNr[n] || VR().find(x => x.nr === n) || {}).id, m })).filter(x => x.v) }));
    return { vorur: V, flokkar: ["Pakkar", ...L.flokkar] };
  }
  window.salaPrufa = prufa;

  /* ---------- Stillingar ---------- */
  window.tbStillingar = function () {
    const c = CF(), lo = !window.ON || ON("leiga"), so = !window.ON || ON("sala");
    return `<p class="hint" style="margin:14px 0 10px">Gildir fyrir Leigu og Sölu hjá ${esc(ORG.nafn)}.</p>
      <div class="two"><label>VSK %<input id="ts-vsk" inputmode="decimal" value="${esc(fx(c.vsk))}"></label><label>Tilboð gildir (dagar)<input id="ts-gd" inputmode="numeric" value="${esc(String(c.gildisdagar))}"></label></div>
      ${lo ? `<div class="viewtitle">Leiga</div>
      <label>Flokkar í búnaðarlista (einn í línu)<textarea id="ts-flL" rows="5">${esc((c.flokkarL || []).join("\n"))}</textarea></label>
      <label>Dagstuðlar – dagur 1, 2, 3 … (aðskilið með ;)<input id="ts-st" value="${esc((c.studlar || []).map(fx).join("; "))}"></label>
      <p class="hint" style="margin:-4px 0 10px">Leiguverð á dag × stuðull. Dæmi: 1; 1,5; 2 = 2 dagar kosta 1,5 dagsverð og 3 dagar 2 dagsverð. Eftir síðasta stuðul bætast 0,25 við á dag.</p>
      <label>Næsta númer leigutilboðs (L-…)<input id="ts-nrL" inputmode="numeric" value="${esc(String(c.nastaNrL))}"></label>
      <label>Skilmálar á leigutilboðum<textarea id="ts-skL" rows="4">${esc(c.skilmalarL || "")}</textarea></label>` : ""}
      ${so ? `<div class="viewtitle">Sala</div>
      <label>Flokkar í vörulista (einn í línu)<textarea id="ts-flS" rows="5">${esc((c.flokkarS || []).join("\n"))}</textarea></label>
      <label>Næsta númer sölutilboðs (S-…)<input id="ts-nrS" inputmode="numeric" value="${esc(String(c.nastaNrS))}"></label>
      <label>Skilmálar á sölutilboðum<textarea id="ts-skS" rows="4">${esc(c.skilmalarS || "")}</textarea></label>` : ""}
      <button type="button" class="btn primary" data-act="tbcfg" style="margin-top:8px">Vista stillingar</button>`;
  };

  /* ---------- Aðgerðir ---------- */
  // Lager (2.39.2): söluvörur á pöntun dragast frá lager þegar pöntun er afhent (Afhent/Skilað/Lokið) og bætast aftur við ef hún fer til baka.
  // Það sem var dregið frá er geymt á pöntuninni (P.lager.linur) svo breytingar á línum eftir afhendingu leiðrétta lagerinn rétt.
  const LDELIV = ["Afhent", "Skilað", "Lokið"];
  const lagerWant = (q, s) => { const want = {}; if (LDELIV.includes(q.stada)) (q.linur || []).forEach(l => { if (!l.v || l.teg !== "sala") return; const v = (s.vorur || []).find(x => String(x.id) === String(l.v)); if (!v || vDeild(v) !== "sala" || ["vinna", "pakki"].includes(v.tegund)) return; want[l.v] = (want[l.v] || 0) + (+l.magn || 0); }); return want; };
  const lagerSync = (q, s) => { if (!isP(q)) return;
    const want = lagerWant(q, s);
    const had = {}; (q.lager?.linur || []).forEach(x => { had[x.v] = (had[x.v] || 0) + (+x.m || 0); });
    const ids = new Set([...Object.keys(want), ...Object.keys(had)]); let ch = false; const dags = new Date().toISOString().slice(0, 10);
    ids.forEach(id => { const df = (want[id] || 0) - (had[id] || 0); if (!df) return; const v = (s.vorur || []).find(x => String(x.id) === String(id)); if (!v) return; ch = true;
      v.fjoldi = (+v.fjoldi || 0) - df; (v.hreyfingar = v.hreyfingar || []).push({ dags, teg: df > 0 ? "Selt" : "Bakfært", ref: q.nr, pontun: q.id, magn: -df }); });
    if (ch || Object.keys(want).length !== Object.keys(had).length) q.lager = Object.keys(want).length ? { dags, linur: Object.entries(want).map(([v, m]) => ({ v, m })) } : null; };
  const saveT = (id, fn) => saveSnapshot(s => { const q = (s.tilbod || []).find(x => x.id === id) || (s.pantanir || []).find(x => x.id === id); if (q) fn(q, s); });
  // Verkefni úr tilboði (2.42.0): áætlaðir tímar = klst.-línur, verkflokkar = flokkar vinnulína (úr vörulista), tímavinna ef tilboðið er eingöngu vinna
  const klstOf = T => { const h = (T.linur || []).filter(l => l.teg === "vinna" && /klst/i.test(l.ein || "")).reduce((a, l) => a + (+l.magn || 0), 0); return h || null; };
  const vflOf = T => { const vf = typeof THJ === "function" ? THJ().map(x => typeof x === "string" ? x : x?.n || x?.nafn || "") : []; return [...new Set((T.linur || []).filter(l => l.teg === "vinna" && l.v).map(l => findV(l.v)?.flokkur).filter(f => f && (!vf.length || vf.includes(f))))]; };
  // Tilboð → pöntun / verkefni (2.61.0): ein smíði fyrir samþykktargluggann og hnappana „Stofna pöntun/verkefni úr tilboði“
  /* ---------- Starfsfólk á tilboði/pöntun (2.85.0) – ræður hverjir fá tilkynningar um svör viðskiptavinar ----------
     Skráðir: T.starfsmenn (sk), sá sem stofnaði (stofnad_af) og starfsfólk tengds verkefnis. Enginn skráður → stjórnendur. */
  const lcE = x => String(x || "").trim().toLowerCase();
  const NU = () => { try { return window.nuUsers ? nuUsers().filter(u => u.virkur !== false) : []; } catch (e) { return []; } };
  const skE = sk => lcE(NU().find(u => String(u.sk || "") === String(sk))?.email);
  window.tbMenn = function (T) {
    const out = new Set(), add = e => { e = lcE(e); if (e && NU().some(u => lcE(u.email) === e)) out.add(e); };
    (T?.starfsmenn || []).forEach(sk => add(skE(sk)));
    add(T?.stofnad_af);
    const p = T?.verkefniId && typeof findProj === "function" ? findProj(T.verkefniId) : null; (p?.starfsmenn || []).forEach(sk => add(skE(sk)));
    return out;
  };
  window.tbMine = function (T) {
    const me = lcE(window.VIEWAS?.email || window.USER?.email || ""); if (!me) return true;
    const m = window.tbMenn(T); if (m.size) return m.has(me);
    return window.USER?.hlutverk === "admin" || !window.USER; // enginn skráður: stjórnendur
  };
  function tbMennHTML(T) {
    if (!NU().length) return "";
    const nm = e => NU().find(u => lcE(u.email) === e)?.nafn || e, own = new Set((T.starfsmenn || []).map(skE).filter(Boolean)), all = window.tbMenn(T);
    const p = T.verkefniId ? findProj(T.verkefniId) : null, pv = new Set((p?.starfsmenn || []).map(skE));
    const chips = [...all].map(e => `<span class="tbm${own.has(e) ? "" : " fx"}" title="${esc(own.has(e) ? "Skráð á " + (isP(T) ? "pöntunina" : "tilboðið") : lcE(T.stofnad_af) === e ? "Stofnaði " + (isP(T) ? "pöntunina" : "tilboðið") : "Á verkefninu")}">${esc(nm(e))}${!own.has(e) ? `<small>${lcE(T.stofnad_af) === e ? "stofnaði" : pv.has(e) ? "verkefni" : ""}</small>` : ""}${MCP && own.has(e) ? `<button type="button" data-act="tbmenn:rm:${esc(T.id)}:${esc(NU().find(u => lcE(u.email) === e)?.sk || "")}" aria-label="Fjarlægja ${esc(nm(e))}">×</button>` : ""}</span>`).join("");
    const opts = MCP ? NU().filter(u => u.sk && !all.has(lcE(u.email))) : [];
    return `<div class="tbmenn"><span class="kind">Starfsfólk</span>${chips || `<span class="hint">Enginn skráður – stjórnendur fá tilkynningar</span>`}${opts.length ? `<select aria-label="Bæta við starfsmanni" onchange="if(this.value){doAct('tbmenn:add:${esc(T.id)}:'+this.value)}"><option value="">+ Bæta við</option>${opts.map(u => `<option value="${esc(u.sk)}">${esc(u.nafn || u.email)}</option>`).join("")}</select>` : ""}</div>`;
  }
  const mkPontun = (T, id, nr) => ({ starfsmenn: (T.starfsmenn || []).slice(), id, pontun: true, nr, deild: "blandad", heiti: T.heiti || "Pöntun", vskId: T.vskId || null, vidskiptavinur: T.vidskiptavinur || null, tengilidur: T.tengilidur || null, simi: null, netfang: T.netfang || null,
    uppruni: "tilbod", ytriNr: null, stadsetning: T.stadsetning || null, fra: T.fra || null, til: T.til || T.fra || null, dags: isoDay(new Date()), stada: "Staðfest", afsl: +T.afsl || 0, athugasemd: null,
    linur: (T.linur || []).map(l => ({ ...l, id: gid() })), verkefniId: T.verkefniId || null, tilbodId: T.id });
  const mkVerk = (T, id, nr) => { const st = (STODUR().find(x => x.n === "Í vinnslu") || STODUR().find(x => !x.lokid) || STODUR()[0]).n;
    return { id, nr, stutt: T.heiti, nafn: nr + " " + T.heiti, stada: st, vidskiptavinur: T.vidskiptavinur || null, verkkaupi: null, vskId: T.vskId || null, vkId: null,
      thjonusta: vflOf(T), timar: 0, yfirlit: null, mappa: null, undirverk: [], starfsmenn: [ME()], aklst: klstOf(T), ...(vinnaEin(T) ? { innheimta: "timar" } : {}), tilbod: isP(T) ? null : totals(T).net, tilbodId: isP(T) ? null : T.id, ...(isP(T) ? { pontunId: T.id } : {}), deild: isMix(T) ? null : tDeild(T), timabilFra: T.fra || null, timabilTil: T.til || T.fra || null,
      lysing: [isMix(T) ? null : DL[tDeild(T)].l, T.stadsetning, T.fra ? dRange(T) : ""].filter(Boolean).join(" · ") || null }; };
  const hefurVorur = T => (T.linur || []).some(l => l.teg !== "vinna"), hefurVinnu = T => (T.linur || []).some(l => l.teg === "vinna");
  // Samþykkt tilboð er læst (2.61.0): breytingar fara í pöntunina eða nýja útgáfu
  const laest = T => !isP(T) && T?.stada === "Samþykkt";
  // Staða tilboðs eins og hún er sögð (2.61.0): sent tilboð bíður svars; samþykki viðskiptavinar bíður staðfestingar starfsmanns
  const stTxt = T => isP(T) ? T.stada : T.bidur && T.stada !== "Samþykkt" && T.stada !== "Hafnað" ? "Bíður staðfestingar" : T.stada === "Sent" ? "Sent · bíður svars" : T.stada;
  const pontunAf = T => PN().find(x => x.tilbodId === T.id) || null;
  // Hver afhenti og hver tók á móti (2.61.0): innskráður starfsmaður og tími þegar pöntun fer í Afhent / Skilað (hnappur, skönnun eða kvittun)
  const stNafn = sk => { try { return (STARFS().find(x => x.sk === sk) || {}).nafn || ""; } catch (e) { return ""; } };
  function hverSkrar(q, st) {
    const sk = ME(), w = { af: sk, nafn: window.USER?.nafn || stNafn(sk) || sk || "", dags: new Date().toISOString() };
    if (st === "Afhent" && !q.afhent) q.afhent = w;
    if (st === "Skilað" && !q.mottekid) q.mottekid = w;
    if (st === "Ný" || st === "Staðfest") { delete q.afhent; delete q.mottekid; }
    if (st === "Afhent") delete q.mottekid;
  }
  const hverTxt = (x, k) => { const a = x || (k ? { af: k.af, nafn: stNafn(k.af), dags: k.dags } : null); if (!a) return ""; const d = String(a.dags || ""); return `${esc(a.nafn || stNafn(a.af) || a.af || "–")}${d ? ` · ${esc(dIS(d.slice(0, 10)))} kl. ${esc(d.slice(11, 16))}` : ""}`; };
  const hverHTML = P => { const u = hverTxt(P.afhent, P.kvittun?.ut), i = hverTxt(P.mottekid, P.kvittun?.inn); if (!u && !i) return "";
    return `<div class="pnhver">${u ? `<span><small>Afhenti</small>${u}</span>` : ""}${i ? `<span><small>Tók á móti</small>${i}</span>` : ""}</div>`; };

  /* ---------- Samþykktargluggi (2.61.0) ----------
     Kemur í stað confirm() þegar tilboð er sett á Samþykkt – og þegar starfsmaður staðfestir samþykki viðskiptavinar (opts.vidsk).
     Sýnir yfirlit og framboð; hakað við pöntun (búnaður/vörur) og/eða verkefni (vinna) eftir innihaldi – blandað tilboð fær bæði. */
  function samthForm(id, opts) {
    const T = findT(id); if (!T || isP(T)) return;
    const n = (T.linur || []).length, tt = totals(T), ar = arekstrar(T), PO = pontunAf(T), PR = T.verkefniId ? findProj(T.verkefniId) : null;
    const canP = PNON() && hefurVorur(T) && !PO, canV = !PR, dfV = hefurVinnu(T) || !PNON() || !hefurVorur(T);
    const kl = klstOf(T), nV = (T.linur || []).filter(l => l.teg !== "vinna").length;
    const opt = (k, on, t, sub) => `<label class="chk smopt"><input type="checkbox" id="sm-${k}"${on ? " checked" : ""}><span><b>${t}</b><small>${sub}</small></span></label>`;
    const V = opts?.vidsk;
    sheet.innerHTML = `<h3 id="sheet-h">${V ? "Staðfesta samþykki" : "Samþykkja tilboð"} ${esc(T.nr || "")}</h3><form id="smf" novalidate>
      <div class="card smsum"><b>${esc(T.heiti || "")}</b><span>${esc([T.vidskiptavinur || T.tengilidur, dRange(T), n + (n === 1 ? " lína" : " línur")].filter(Boolean).join(" · "))}</span><span class="smkr">${esc(krs(tt.net))} án VSK</span></div>
      ${V ? `<p class="hint smv">✓ ${esc(V.nafn || "Viðskiptavinur")} samþykkti tilboðið ${esc(dIS(String(V.dags || "").slice(0, 10)))}${V.utgafa && +V.utgafa !== (+T.utgafa || 1) ? ` – <b>útgáfu ${esc(String(V.utgafa))}, en núverandi útgáfa er ${esc(String(+T.utgafa || 1))}</b>` : ""}${V.athugasemd ? `<br>„${esc(V.athugasemd)}“` : ""}</p>` : ""}
      ${ar.length ? `<div class="msg err smar"><b>⚠ Búnaður ekki laus ${esc(dRange(T))}</b>${ar.map(x => `<div>${esc(x.v.heiti)}: ${esc(fx(x.need))} þarf, ${esc(fx(x.laus))} laus af ${esc(fx(x.fj))}</div>`).join("")}<small>Ef þú samþykkir verður búnaðurinn tvíbókaður.</small></div>` : ""}
      ${canP || canV ? `<div class="kind" style="margin:12px 0 6px">Hvað gerist næst?</div><div class="smopts">
        ${canP ? opt("p", true, "Stofna pöntun", `Afhending, lager, skönnun og rukkun – ${nV} ${nV === 1 ? "lína" : "línur"} af búnaði og vörum`) : ""}
        ${canV ? opt("v", dfV, "Stofna verkefni", vinnaEin(T) ? `Vinnan rukkuð eftir unnum tímum${kl ? " – áætlun " + esc(fx(kl)) + " klst." : ""}` : hefurVinnu(T) ? `Heldur utan um vinnuna${kl ? " (" + esc(fx(kl)) + " klst.)" : ""}, tíma og skjöl` : "Heldur utan um vinnu, tíma og skjöl") : ""}</div>` : ""}
      ${PO ? `<p class="hint">Pöntun ${esc(PO.nr)} er þegar til úr þessu tilboði.</p>` : ""}${PR ? `<p class="hint">Tilboðið er þegar tengt verkefni ${esc(PR.nr)}.</p>` : ""}
      <p class="hint">Eftir samþykki er tilboðið læst. Breytingar eru gerðar í pöntuninni eða í nýrri útgáfu tilboðsins.</p>
      <div id="f-msg"></div><div class="actions"><button type="button" class="btn" id="sm-cancel">Hætta við</button><button class="btn primary" id="sm-ok">${ar.length ? "Samþykkja samt" : V ? "Staðfesta" : "Samþykkja"}</button></div></form>`;
    sheetwrap.hidden = false;
    document.getElementById("sm-cancel").onclick = closeSheet;
    document.getElementById("smf").onsubmit = async e => { e.preventDefault(); const ok = document.getElementById("sm-ok"); ok.disabled = true;
      const wP = canP && document.getElementById("sm-p")?.checked, wV = canV && document.getElementById("sm-v")?.checked;
      const c = CF(), nP = +c.nastaNrP || 1001, pid = wP ? gid() : null, vid = wV ? gid() : null, vnr = wV ? nextProjNr() : null;
      try {
        await saveSnapshot(s => { const q = (s.tilbod || []).find(x => x.id === id); if (!q) return;
          q.stada = "Samþykkt"; q.samthykkt = { dags: new Date().toISOString(), af: ME(), ...(V ? { vidsk: { nafn: V.nafn || null, dags: V.dags || null, utgafa: V.utgafa || null, athugasemd: V.athugasemd || null } } : {}) };
          if (V) delete q.bidur;
          lagerSync(q, s);
          if (wV) { (s.verkefni = s.verkefni || []).push(mkVerk(q, vid, vnr)); q.verkefniId = vid; }
          if (wP) { (s.pantanir = s.pantanir || []).push(mkPontun(q, pid, "P-" + nP)); s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), nastaNrP: nP + 1 }; } });
        closeSheet();
        toast(["Tilboð " + T.nr + " samþykkt", wP ? "pöntun P-" + nP : "", wV ? "verkefni " + vnr : ""].filter(Boolean).join(" · "));
        // 2.73.0: undirritað tilboð → pöntunin er staðfest af viðskiptavini; valið færist yfir á pöntunina í Pöntunum
        if (wP) { const V0 = findT(id)?.samthykkt?.vidsk || T.bidur; if (window.pnFraTilbodi) window.pnFraTilbodi(pid, V0 ? { nafn: V0.nafn || "", dags: V0.dags || new Date().toISOString(), athugasemd: V0.athugasemd || null, ur: "Tilboð " + T.nr } : null);
          try { tab = "pantanir"; } catch (e) {} openDetail("tb:" + pid); } else if (wV) openDetail("verk:" + vid); else render();
      } catch (err) { ok.disabled = false; msg(esc(errText(err)), "err"); } };
  }
  window.samthForm = samthForm;

  /* ---------- Samþykki viðskiptavinar með tengli (2.61.0) ----------
     Sama opinbera síða og pantanir (pontun/?o=<uppsetning>&t=<t>, skjalið opinber/{t}, sömu Firestore-reglur): teg "tilbod".
     Viðskiptavinurinn samþykkir einu sinni með nafni og undirskrift → tilboðið fær `bidur` (bíður staðfestingar starfsmanns);
     starfsmaður staðfestir í samþykktarglugganum og velur þar pöntun og/eða verkefni. Ný útgáfa lokar gamla tenglinum. */
  const trq = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  function tbSnap(T) {
    const tt = totals(T), co = trq(() => DOK.co(), {}) || {}, C = CF(), em = T.netfang || trq(() => findVsk(T.vskId)?.netfang, "");
    return { teg: "tilbod", o: window.atrPub.inst(), nr: T.nr || "", heiti: T.heiti || "", stada: T.stada || "", utgafa: +T.utgafa || 1, gildir: T.gildir || null, fra: T.fra || null, til: T.til || T.fra || null,
      tengilidur: T.tengilidur || null, vidskiptavinur: T.vidskiptavinur || null, stadsetning: T.stadsetning || null, athugasemd: T.athugasemd || null,
      netfangM: em && em.includes("@") ? em[0] + "•••" + em.slice(Math.max(1, em.indexOf("@") - 1)) : null,
      linur: (T.linur || []).map(l => ({ heiti: l.heiti || "", magn: +l.magn || 0, ein: l.ein || "", teg: l.teg || "", dagar: l.teg === "leiga" ? (+l.dagar || tbDagar(T) || null) : null, upph: Math.round(lSum(l, T) || 0) })),
      samtals: { net: tt.net, vsk: tt.vsk, tot: tt.tot, afsl: tt.afsl || 0 }, skilmalar: (hefurVorur(T) ? (C.skilmalarL || C.skilmalarS) : null) || null,
      fyrirtaeki: { nafn: co.nafn || trq(() => ORG.nafn, ""), simi: co.simi || "", netfang: co.netfang || "", vefur: co.vefur || "", merki: trq(() => ORG.docLogo, "") || "icons/doc-logo.png" } };
  }
  const PUBT = {};
  // Skrifa afrit án þess að þurrka út samþykki sem viðskiptavinurinn kann að hafa gefið í millitíðinni (færsla)
  async function pubPut(t, data) {
    const P = window.atrPub, keep = c => c?.stadfest ? c : { ...data, stadfest: null, postur: null, uppfaert: new Date().toISOString() };
    if (P.demo()) { const k = P.lsKey(t), c = JSON.parse(P.ls().getItem(k) || "null"); P.ls().setItem(k, JSON.stringify(keep(c))); return; }
    if (!window.__DB) throw new Error("Ekki tengt gagnagrunni"); await window.__DB.tx("opinber/" + t, c => keep(c && Object.keys(c).length ? c : null));
  }
  async function tbLink(T) {
    const P = window.atrPub; if (!P || isP(T) || laest(T)) return null;
    try { const t = T.opinber || P.tok(); await pubPut(t, tbSnap(T)); PUBT[t] = JSON.stringify(tbSnap(T)); if (!T.opinber) await saveT(T.id, q => { q.opinber = t; }); return P.url(t); }
    catch (e) { console.warn("tilboðstengill", e); return null; }
  }
  async function tbUnlink(T) {
    const t = T.opinber; if (!t) return;
    try { if (window.atrPub?.demo()) window.atrPub.ls().removeItem(window.atrPub.lsKey(t)); else await window.__DB?.commit?.([{ path: "opinber/" + t, del: true }]); } catch (e) {}
    await saveT(T.id, q => { delete q.opinber; });
  }
  // Fylgjast með opnum tenglum: samþykki viðskiptavinar → T.bidur; breytt tilboð (Drög/Sent) → afrit uppfært
  const TW = new Set();
  function tbWatch() {
    if (!window.atrPub || !MCP) return;
    TB().forEach(T => { const t = T.opinber; if (!t || laest(T) || T.stada === "Hafnað") return;
      if (!T.bidur) { const j = JSON.stringify(tbSnap(T)); if (PUBT[t] && PUBT[t] !== j) { PUBT[t] = j; pubPut(t, JSON.parse(j)).catch(() => {}); } }
      if (TW.has(t) || T.bidur) return; TW.add(t);
      const got = d => { if (!d) return; if (!PUBT[t]) { const T0 = TB().find(x => x.opinber === t); if (T0) PUBT[t] = JSON.stringify(tbSnap(T0)); }
        // 2.72.0: höfnun eða spurningar af tilboðssíðunni → á tilboðið (vidskHafnad, vidskSvor)
        { const T2 = TB().find(x => x.opinber === t); if (T2 && !laest(T2)) { const sv = d.svor || [], hf = d.hafnad || null;
          if (sv.length !== (T2.vidskSvor || []).length || (hf && !T2.vidskHafnad)) saveT(T2.id, q => { q.vidskSvor = sv; if (hf) q.vidskHafnad = hf; })
            .then(() => { toast(hf && !T2.vidskHafnad ? `${hf.nafn || "Viðskiptavinur"} hafnaði ${T2.nr}` : `Ný spurning frá viðskiptavini um ${T2.nr}`); render(); }).catch(() => {}); } }
        const s = d.stadfest, T1 = TB().find(x => x.opinber === t); if (!s || !T1 || T1.bidur || laest(T1)) return;
        saveT(T1.id, q => { if (q.bidur || q.stada === "Samþykkt") return; q.bidur = { nafn: s.nafn || "", dags: s.dags || new Date().toISOString(), athugasemd: s.athugasemd || null, utgafa: d.utgafa || null }; })
          .then(() => { toast(`${T1.nr} samþykkt af ${s.nafn || "viðskiptavini"} – bíður staðfestingar`); render(); }).catch(() => {}); };
      if (window.atrPub.demo()) { const rd = () => { try { got(JSON.parse(window.atrPub.ls().getItem(window.atrPub.lsKey(t)) || "null")); } catch (e) {} }; rd(); window.addEventListener("storage", e => { if (e.key === window.atrPub.lsKey(t)) rd(); }); setInterval(rd, 4000); return; }
      window.__DB?.watch?.("opinber/" + t, x => got(x.exists ? x.data() : null), () => {}); });
  }
  window.tbWatch = tbWatch;

  window.salaAct = function (k, r) {
    const a = r.join(":");
    if (k === "vrf") { VF[r[0]] = r.slice(1).join(":"); VK[r[0]] = ""; render(); return; }
    if (k === "vrk") { VK[r[0]] = r.slice(1).join(":"); render(); return; }
    if (k === "vrnew") { varaForm(r[0] === "sala" ? "sala" : "leiga", r[1] || null); return; }
    if (k === "vrdel") { const v = findV(a); if (!v) return; const n = TB().filter(t => (t.linur || []).some(l => l.v === a)).length;
      if (!confirm(`Eyða „${v.heiti}“?${n ? `\n\nHún er á ${n} tilboðum – línurnar þar haldast óbreyttar.` : ""}`)) return;
      saveSnapshot(s => { s.vorur = (s.vorur || []).filter(x => x.id !== a); }).then(() => { toast("Eytt"); goBack(); }).catch(e => toast(errText(e))); return; }
    if (k === "vrlisti") { if (!ADM()) return toast("Aðeins admin.");
      if (a === "inn") { const p = listi(); if (!p.vorur.length) return toast("Búnaðarlistinn er þegar inni");
        saveSnapshot(s => { s.vorur = [...(s.vorur || []), ...p.vorur]; s.stillingar = s.stillingar || {}; const t = { ...CF(), ...(s.stillingar.tilbod || {}) }; t.flokkarL = [...new Set([...p.flokkar, ...(t.flokkarL || [])])]; s.stillingar.tilbod = t; })
          .then(() => toast(`${p.vorur.length} línum bætt í búnaðarlistann`)).catch(e => toast(errText(e))); return; }
      const n = VR().filter(v => v.listi).length;
      if (!confirm(`Eyða ${n} línum úr staðlaða búnaðarlistanum?\n\nLínur sem þú bættir við sjálf(ur) haldast. Tilboð sem nota línurnar halda sínum upphæðum.`)) return;
      saveSnapshot(s => { s.vorur = (s.vorur || []).filter(v => !v.listi); }).then(() => toast("Búnaðarlista eytt")).catch(e => toast(errText(e))); return; }
    if (k === "vrprufa") { if (!ADM()) return toast("Aðeins admin.");
      if (a === "inn") { const p = prufa(); saveSnapshot(s => { s.vorur = [...(s.vorur || []), ...p.vorur]; s.tilbod = [...(s.tilbod || []), ...p.tilbod]; if (p.pantanir.length) s.pantanir = [...(s.pantanir || []), ...p.pantanir]; }).then(() => toast(`${p.vorur.length} prufuvörum og ${p.tilbod.length} prufutilboðum bætt við (leiga og sala)`)).catch(e => toast(errText(e))); return; }
      const nv = VR().filter(v => v.prufa).length, nt = TB().filter(t => t.prufa).length;
      if (!confirm(`Eyða öllum prufugögnum í leigu og sölu: ${nv} vörum og ${nt} tilboðum merktum „prufa“?\n\nAnnað helst óbreytt.`)) return;
      saveSnapshot(s => { s.vorur = (s.vorur || []).filter(v => !v.prufa); s.tilbod = (s.tilbod || []).filter(t => !t.prufa); if ((s.pantanir || []).some(t => t.prufa)) s.pantanir = s.pantanir.filter(t => !t.prufa); }).then(() => toast("Prufugögnum eytt")).catch(e => toast(errText(e))); return; }
    // Pantanir og útleiga (2.20.0)
    if (k === "pnnew") { pnForm(r[0] ? { verkefniId: a } : null); return; }
    if (k === "pnf") { PF[r[0] === "u" ? "u" : "s"] = r.slice(1).join(":"); render(); return; }
    if (k === "pnutl") { const n = +r[0] || 0; UT.fra = n ? isoDay(new Date(dOf(UT.fra || isoDay(manud(new Date()))).getTime() + n * 864e5 + 36e5)) : isoDay(manud(new Date())); render(); return; }
    if (k === "pnutf") { UT.fl = a; render(); return; }
    if (k === "pnuta") { UT.allt = r[0] === "1"; render(); return; }
    if (k === "pnutv") { UT.fl = a; UT.fra = null; UT.allt = false; doAct("tab:vutl"); return; }
    // Eldri samþykkt tilboð án pöntunar (2.41.0): skráð sem pantanir með stöðuna Lokið – svo salan teljist með – án þess að breyta lager (talning hefur þegar tekið það með)
    if (k === "pntbAll") { const ti = isoDay(new Date()), xs = TB().filter(T => vantarPontun(T) && String(T.til || T.fra || T.dags || "").slice(0, 10) < ti); if (!xs.length) return;
      if (!confirm(`Skrá ${xs.length} eldri samþykkt ${xs.length === 1 ? "tilboð" : "tilboð"} sem pantanir?\n\nÞær fá stöðuna „Lokið“ og teljast þá með í sölutölum. Lager breytist ekki, því salan er liðin.`)) return;
      let n0 = +CF().nastaNrP || 1001; const Ps = xs.map((T, i) => ({ id: gid(), pontun: true, nr: "P-" + (n0 + i), deild: "blandad", heiti: T.heiti || "Pöntun", vskId: T.vskId || null, vidskiptavinur: T.vidskiptavinur || null, tengilidur: T.tengilidur || null, simi: null, netfang: T.netfang || null,
        uppruni: "tilbod", ytriNr: null, stadsetning: T.stadsetning || null, fra: T.fra || null, til: T.til || T.fra || null, dags: isoDay(new Date()), stada: "Lokið", afsl: +T.afsl || 0, athugasemd: "Skráð eftir á úr samþykktu tilboði " + (T.nr || ""), linur: (T.linur || []).map(l => ({ ...l, id: gid() })), verkefniId: T.verkefniId || null, tilbodId: T.id }));
      saveSnapshot(s => { Ps.forEach(P => { const w = lagerWant(P, s); P.lager = Object.keys(w).length ? { dags: isoDay(new Date()), linur: Object.entries(w).map(([v, m]) => ({ v, m })), eftirA: true } : null; (s.pantanir = s.pantanir || []).push(P); });
        s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), nastaNrP: n0 + Ps.length }; })
        .then(() => { toast(Ps.length + " pantanir skráðar (" + Ps[0].nr + (Ps.length > 1 ? "–" + Ps[Ps.length - 1].nr : "") + ")"); render(); }).catch(e => toast(errText(e))); return; }
    if (k === "pntb") { const T = findT(a); if (!T || isP(T) || pontunAf(T)) return; const n = +CF().nastaNrP || 1001, nr = "P-" + n, id = gid();
      const P = mkPontun(T, id, nr);
      saveSnapshot(s => { (s.pantanir = s.pantanir || []).push(P); s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), nastaNrP: n + 1 }; })
        .then(() => { toast("Pöntun " + nr + " stofnuð úr tilboði " + T.nr); const V0 = T.samthykkt?.vidsk || T.bidur; if (window.pnFraTilbodi) window.pnFraTilbodi(id, V0 ? { nafn: V0.nafn || "", dags: V0.dags || new Date().toISOString(), athugasemd: V0.athugasemd || null, ur: "Tilboð " + T.nr } : null);
          try { tab = "pantanir"; } catch (e) {} openDetail("tb:" + id); }).catch(e => toast(errText(e))); return; }
    if (k === "tbs") { TS[r[0]] = r.slice(1).join(":"); render(); return; }
    if (k === "tbf") { TL.f = r[0] || ""; render(); return; }
    if (k === "tbnew") { const D = r[0] === "sala" ? "sala" : r[0] === "blandad" ? "blandad" : "leiga"; if (D === "blandad") { tbForm(D, r[1] ? { verkefniId: r.slice(1).join(":") } : null); return; } if (!VRd(D).length && !confirm(`${D === "leiga" ? "Búnaðarlistinn" : "Vörulistinn"} er tómur – línur má samt skrá sem sérlínur. Halda áfram?`)) return; tbForm(D, r[1] ? { verkefniId: r.slice(1).join(":") } : null); return; }
    if (k === "tbed") { const [op, id] = r;
      if (op === "start") { const T = findT(id); if (laest(T) || (T?.bidur && !isP(T))) { toast("Samþykkt tilboð er læst – breyttu " + (pontunAf(T) ? "pöntun " + pontunAf(T).nr : "því með nýrri útgáfu") + "."); return; } if (T) { EDT = structuredClone(T); window._tbOpen = {}; render(); window.scrollTo({ top: 0 }); } return; }
      if (op === "cancel") { if (!confirm("Hætta við breytingar á tilboðinu?")) return; EDT = null; render(); return; }
      if (op === "save") { const D = EDT; if (!D) return; if (D.fra && D.til && D.til < D.fra) return toast("„Til“ getur ekki verið á undan „Frá“.");
        const ar = blokkar(D) ? arekstrar(D).length : 0;
        saveT(D.id, (q, s) => { const L0 = q.lager; Object.keys(D).forEach(x => { q[x] = D[x]; }); q.lager = L0 || null; lagerSync(q, s); }).then(() => { EDT = null; toast((isP(D) ? "Pöntun" : "Tilboð") + " vistað" + (ar ? ` – ath. ${ar} ${ar === 1 ? "vara er" : "vörur eru"} ekki laus` : "")); render(); }).catch(e => toast(errText(e))); return; } }
    if (k === "tbl") { if (!EDT) return; const [op, id] = r, D = tDeild(EDT);
      if (op === "thj") { thjPicker(); return; }
      if (op === "pick") { const M = isMix(EDT) && (id === "leiga" || id === "sala") ? id : null, DD = M || D; if (!(isMix(EDT) && !M ? VR() : VRd(DD)).length) return toast(`${DD === "leiga" ? "Búnaðarlistinn" : "Vörulistinn"} er tómur – bættu við eða notaðu sérlínu.`); picker(M); return; }
      if (op === "custom") { (EDT.linur = EDT.linur || []).push({ id: gid(), v: null, heiti: "Ný lína", teg: isMix(EDT) ? "vinna" : D, hl: groups(EDT).slice(-1)[0]?.[0] || "Annað", magn: 1, ein: "stk.", verd: 0, dagar: null, afsl: 0 }); render(); return; }
      if (op === "del") { EDT.linur = (EDT.linur || []).filter(l => l.id !== id); render(); return; } }
    if (k === "tbst") { const [id, st] = r, T0 = findT(id); if (!T0) return;
      if (isP(T0) && st === "Afhent" && T0.stada !== "Afhent" && window.pnGreidsla && !window.pnGreidsla.ok(T0)) { render(); window.pnGreidsla.ask(id, "Viðskiptavinurinn er í staðgreiðslu og pöntunin er ógreidd. Skráðu greiðslu áður en búnaður fer út.").then(ok => { if (ok) doAct("tbst:" + id + ":" + st); }); return; }
      // 2.61.0: samþykki fer í gegnum samþykktargluggann (pöntun og/eða verkefni); samþykkt tilboð með pöntun skiptir ekki um stöðu nema með nýrri útgáfu
      if (!isP(T0) && st === "Samþykkt" && T0.stada !== "Samþykkt") { samthForm(id, T0.bidur ? { vidsk: T0.bidur } : null); render(); return; }
      if (laest(T0) && st !== "Samþykkt" && pontunAf(T0)) { toast(`Tilboðið er orðið að pöntun ${pontunAf(T0).nr} – breyttu pöntuninni eða gerðu nýja útgáfu.`); render(); return; }
      if (T0.stada !== st && !blokkar(T0) && blokkar({ ...T0, stada: st }) && arekstrar(T0).length && !confirm(`Búnaður er ekki laus ${dRange(T0)}:\n\n${arekTxt(T0)}\n\nSetja ${isP(T0) ? "pöntunina" : "tilboðið"} samt á „${st}“? Búnaðurinn verður þá tvíbókaður.`)) { render(); return; }
      saveT(id, (q, s) => { q.stada = st; if (st === "Sent" && !q.sent) q.sent = isoDay(new Date()); if (isP(q)) hverSkrar(q, st); lagerSync(q, s); }).then(() => { const L = findT(id)?.lager;
toast("Staða: " + st + (isP(T0) && LDELIV.includes(st) && L?.linur?.length ? " · dregið frá lager" : isP(T0) && T0.lager && !L ? " · bætt aftur á lager" : "")); }); return; }
    if (k === "tbutg") { const T = findT(a), PO = T && pontunAf(T); if (!T || !confirm(`Búa til útgáfu ${(+T.utgafa || 1) + 1} af tilboði ${T.nr}?\n\nNúverandi útgáfa er skráð í „Fyrri útgáfur“ og staðan fer aftur í Drög.${PO ? `\n\nAth.: pöntun ${PO.nr} er þegar til úr tilboðinu og breytist ekki – uppfærðu hana sérstaklega ef þarf.` : ""}`)) return;
      saveT(a, q => { (q.eldri = q.eldri || []).push({ utgafa: +q.utgafa || 1, dags: q.dags, net: totals(q).net }); q.utgafa = (+q.utgafa || 1) + 1; q.dags = isoDay(new Date()); q.stada = "Drög"; delete q.samthykkt; delete q.bidur; })
        .then(() => { const T1 = findT(a); return T1?.opinber ? tbUnlink(T1) : null; })
        .then(() => { EDT = structuredClone(findT(a)); render(); toast("Ný útgáfa – breyttu og vistaðu"); }); return; }
    if (k === "tbcopy") { const T = findT(a); if (!T) return; const D = DK(T), c = CF(), id = gid(), n = +c[nK(D)] || 1001, nr = DL[D].pre + n;
      const N = { ...structuredClone(T), id, nr, deild: D, stada: "Drög", utgafa: 1, eldri: [], dags: isoDay(new Date()), verkefniId: null, sent: null, prufa: false, linur: (T.linur || []).map(l => ({ ...l, id: gid() })) };
      delete N.stofnad_af; delete N.stofnad_t; delete N.breytt_af; delete N.breytt_t; delete N._o;
      saveSnapshot(s => { (s.tilbod = s.tilbod || []).push(N); s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), [nK(D)]: n + 1 }; })
        .then(() => { toast("Afritað sem " + nr); EDT = structuredClone(N); openDetail("tb:" + id); }); return; }
    // 2.83.1: svar við spurningu af tilboðssíðunni – skrifað í appinu (Microsoft 365), annars póstforrit tölvunnar
    if (k === "tbmenn") { const [op, id, sk] = r; if (!id || !sk) return; saveT(id, q => { const L = (q.starfsmenn || []).filter(x => x !== sk); if (op === "add") L.push(sk); q.starfsmenn = L; }).then(() => render()).catch(e => toast(errText(e))); return; }
    if (k === "tbsvara") { const T = findT(a); if (!T) return; const to = T.netfang || findVsk(T.vskId)?.netfang || "", su = "RE: Tilboð " + T.nr + " – " + (T.heiti || "");
      const sp = (T.vidskSvor || []).filter(m => !(T.vidskSvorSvar || {})[String(m.dags || "")]).slice(-1)[0] || (T.vidskSvor || []).slice(-1)[0], body = `\n\n\n---\n${sp ? `${sp.nafn || "Viðskiptavinur"} spurði ${dIS(String(sp.dags || "").slice(0, 10))} kl. ${String(sp.dags || "").slice(11, 16)}:\n> ${String(sp.texti || "").replace(/\n/g, "\n> ")}` : ""}`;
      // 2.84.0: svarið fer í þráð tilboðspóstsins (ef tilboðið var sent úr Atrium) og skráist undir spurningunni
      const skra = inf => saveT(T.id, q => { const k = String(sp?.dags || ""); if (!k) return; q.vidskSvorSvar = { ...(q.vidskSvorSvar || {}), [k]: { texti: String(inf?.text || "").split("\n---\n")[0].trim(), dags: new Date().toISOString(), af: window.USER?.nafn || (window.MS && MS.user && MS.user()?.name) || "" } }; }).then(() => render()).catch(() => {});
      if (window.MS && MS.on && MS.on() && window.poCompose) {
        const nyr = () => poCompose({ to, subject: su, body, pid: T.verkefniId || "", onSent: skra });
        if (T.postConv && window.poReplyConv) { toast("Sæki tilboðspóstinn…"); poReplyConv({ conv: T.postConv, box: T.postBox, to, body, pid: T.verkefniId || "", onSent: skra, fallback: nyr }); } else nyr();
        return; }
      const x = document.createElement("a"); x.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`; x.target = "_blank"; x.rel = "noopener"; document.body.appendChild(x); x.click(); x.remove(); return; }
    if (k === "tbdel") { const T = findT(a); if (!T || !confirm(`Eyða ${isP(T) ? "pöntun" : "tilboði"} ${T.nr} (${T.heiti})?`)) return;
      saveSnapshot(s => { s.tilbod = (s.tilbod || []).filter(x => x.id !== a); if (s.pantanir) s.pantanir = s.pantanir.filter(x => x.id !== a); }).then(() => { toast((isP(T) ? "Pöntun" : "Tilboði") + " eytt"); goBack(); }).catch(e => toast(errText(e))); return; }
    if (k === "tbpdf") { const [op, id] = r, T = findT(id); if (!T) return; toast("Bý til PDF…");
      tbPdf(T).then(b => { const blob = new Blob([b], { type: "application/pdf" });
        if (op === "pv") return blobPreview(blob, fileBase(T) + ".pdf");
        if (op === "save" && window.saveDoc) return saveDoc({ data: blob, name: fileBase(T) + ".pdf", type: "application/pdf", kind: T.pontun ? "Pantanir" : "Tilboð", pid: T.verkefniId });
        const x = document.createElement("a"); x.href = URL.createObjectURL(blob); x.download = fileBase(T) + ".pdf"; document.body.appendChild(x); x.click(); x.remove(); setTimeout(() => URL.revokeObjectURL(x.href), 5000); toast("PDF sótt"); })
        .catch(e => toast("PDF tókst ekki: " + (e?.message || e))); return; }
    // 2.71.0: alltaf hægt að senda tilboð á verkkaupa – með Microsoft 365 beint úr appinu (PDF í viðhengi), annars í póstforriti tölvunnar með samþykktartengli
    if (k === "tbsend" && !(window.MS && MS.on && MS.on() && window.poCompose)) { const T = findT(a); if (!T) return;
      if (!confirm("Microsoft 365 er ekki tengt, svo appið getur ekki sent póstinn sjálft.\n\nOpna póstforritið þitt með tilbúnum pósti og tengli þar sem viðskiptavinurinn sér og samþykkir tilboðið?\n\n(Til að senda beint með PDF í viðhengi: Stillingar › Microsoft 365.)")) return;
      toast("Bý til tengil…");
      tbLink(T).then(url => { const to = T.netfang || findVsk(T.vskId)?.netfang || "", su = `Tilboð ${T.nr} – ${T.heiti || ""} frá ${DOK.co().nafn}`;
        const body = `Góðan dag${T.tengilidur ? " " + T.tengilidur.split(" ")[0] : ""},\n\nHér er tilboð ${T.nr} í ${T.heiti || "verkið"}${T.fra ? " (" + dRange(T) + ")" : ""}, samtals ${krs(totals(T).tot)} með VSK.\n\n${url ? "Tilboðið má skoða og samþykkja hér:\n" + url + "\n\n" : ""}Endilega hafðu samband ef spurningar vakna.`;
        { const x = document.createElement("a"); x.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`; x.target = "_blank"; x.rel = "noopener"; document.body.appendChild(x); x.click(); x.remove(); } // opnar póstforritið án þess að fara úr appinu
        // 2.73.0: tilboð sem fer í póst er merkt „Sent“ strax (hægt að afturkalla)
        const was = { stada: T.stada, sent: T.sent || null, sentTil: T.sentTil || null };
        saveT(a, q => { if (q.stada === "Drög") q.stada = "Sent"; q.sent = isoDay(new Date()); q.sentTil = to || null; }).then(() => { render();
          toast(`${T.nr} merkt „Sent“`, () => saveT(a, q => { q.stada = was.stada; q.sent = was.sent; q.sentTil = was.sentTil; }).then(() => render())); }); }); return; }
    if (k === "tbsend") { const T = findT(a); if (!T || !window.poCompose) return; toast("Bý til PDF…");
      tbLink(T).then(url => tbPdf(T).then(bytes => poCompose({ to: T.netfang || findVsk(T.vskId)?.netfang || "", subject: `Tilboð ${T.nr} – ${T.heiti || ""} frá ${DOK.co().nafn}`, pid: T.verkefniId || null,
        body: `Góðan dag${T.tengilidur ? " " + T.tengilidur.split(" ")[0] : ""},\n\nMeðfylgjandi er tilboð ${T.nr} í ${T.heiti || "verkið"}${T.fra ? " (" + dRange(T) + ")" : ""}, samtals ${krs(totals(T).tot)} með VSK.\n\nEf tilboðið hentar biðjum við þig að staðfesta það${T.gildir ? ` fyrir ${dIS(T.gildir)}, en þá rennur það út` : ""}${url ? ` – með því að samþykkja það hér:\n${url}\n\neða með því að svara þessum pósti.` : " með því að svara þessum pósti."}\n\nEndilega hafðu samband ef spurningar vakna.`,
        atts: [{ name: fileBase(T) + ".pdf", type: "application/pdf", size: bytes.length, data: bytes }],
        onSent: inf => saveT(a, q => { if (q.stada === "Drög") q.stada = "Sent"; q.sent = isoDay(new Date()); if (inf?.conv) { q.postConv = inf.conv; q.postBox = inf.box || null; } }).then(() => render()) }))).catch(e => toast("PDF tókst ekki: " + (e?.message || e))); return; }
    if (k === "tbpub") { const T = findT(a); if (!T) return; tbLink(T).then(url => { if (!url) return toast("Ekki tókst að búa til tengil."); navigator.clipboard?.writeText(url).then(() => toast("Samþykktartengill afritaður")).catch(() => prompt("Samþykktartengill:", url)); }); return; }
    if (k === "tbpubx") { const T = findT(a); if (!T?.opinber || !confirm("Loka samþykktartenglinum? Hann hættir að virka.")) return; tbUnlink(T).then(() => { toast("Tengli lokað"); render(); }); return; }
    if (k === "tbverk") { const T = findT(a); if (!T || T.verkefniId) return; if (!confirm(`Stofna verkefni úr ${isP(T) ? "pöntun" : "tilboði"} ${T.nr}?\n\n„${T.heiti}“ fyrir ${T.vidskiptavinur || T.tengilidur || "–"}, ${krs(totals(T).net)} án VSK.`)) return;
      const id = gid(), nr = nextProjNr();
      saveSnapshot(s => { (s.verkefni = s.verkefni || []).push(mkVerk(T, id, nr));
        const q = (s.tilbod || []).find(x => x.id === a) || (s.pantanir || []).find(x => x.id === a); if (q) q.verkefniId = id; })
        .then(() => { toast(`Verkefni ${nr} stofnað`); openDetail("verk:" + id); }).catch(e => toast(errText(e))); return; }
    if (k === "tbcfg") { const g = x => (document.getElementById(x)?.value ?? null), gt = x => (g(x) || "").trim(), c = CF(), o = { vsk: n0(gt("ts-vsk")), gildisdagar: Math.round(n0(gt("ts-gd"))) || 14 };
      const lines = x => gt(x).split(/\n/).map(z => z.trim()).filter(Boolean);
      if (g("ts-flL") != null) { const studlar = gt("ts-st").split(/[;\s]+/).map(n0).filter(x => x > 0); if (!studlar.length) return toast("Skráðu að minnsta kosti einn dagstuðul.");
        Object.assign(o, { flokkarL: lines("ts-flL").length ? lines("ts-flL") : DEF.flokkarL, studlar, nastaNrL: Math.round(n0(gt("ts-nrL"))) || c.nastaNrL, skilmalarL: gt("ts-skL") }); }
      if (g("ts-flS") != null) Object.assign(o, { flokkarS: lines("ts-flS").length ? lines("ts-flS") : DEF.flokkarS, nastaNrS: Math.round(n0(gt("ts-nrS"))) || c.nastaNrS, skilmalarS: gt("ts-skS") });
      saveSnapshot(s => { s.stillingar = s.stillingar || {}; const cur = { ...(s.stillingar.tilbod || {}) }; delete cur.flokkar; delete cur.nastaNr; delete cur.skilmalar; s.stillingar.tilbod = { ...CF(), ...cur, ...o }; delete s.stillingar.tilbod.flokkar; delete s.stillingar.tilbod.nastaNr; delete s.stillingar.tilbod.skilmalar; })
        .then(() => toast("Stillingar vistaðar")).catch(e => toast(errText(e))); return; }
  };
  // Tilboð-flipi á síðu verkefnis (2.12.0): tilboð tengd verkefninu + nýtt tilboð forfyllt (verkefni, viðskiptavinur)
  const tbOnD = T => (PV() ? ON("tilbod") : tDeild(T) === "sala" ? ON("sala") : ON("leiga"));
  window.tbCountFor = pid => TB().filter(T => T.verkefniId === pid && tbOnD(T)).length;
  window.tbProjTab = p => { if (!window.ON || !tbOK()) return "";
    const Ds = ["leiga", "sala"].filter(D => ON(D) && (!p.deild || p.deild === D));
    if (PV()) return (MCP ? `<div class="links"><button type="button" class="btn primary" data-act="tbnew:blandad:${esc(p.id)}">+ Tilboð</button></div>` : "") + (tbFor(T => T.verkefniId === p.id) || `<div class="empty" style="margin-top:16px">Engin tilboð tengd þessu verkefni.</div>`);
    const btns = MCP ? `<div class="links">${Ds.map(D => `<button type="button" class="btn primary" data-act="tbnew:${D}:${esc(p.id)}">+ ${D === "leiga" ? "Leigutilboð" : "Sölutilboð"}</button>`).join("")}</div>` : "";
    return btns + (tbFor(T => T.verkefniId === p.id) || `<div class="empty" style="margin-top:16px">Engin tilboð tengd þessu verkefni.</div>`); };
  // Tilboð viðskiptavinar (á síðu viðskiptavinar), báðar deildir
  window.tbFor = pred => { if (!window.ON || !tbOK()) return ""; const xs = TB().filter(T => tbOnD(T) && pred(T)).sort((a, b) => String(b.dags || "").localeCompare(String(a.dags || ""))); return xs.length ? `<div class="viewtitle">Tilboð · ${xs.length}</div>${llist(xs.map(tbRow))}` : ""; };
  // Skrá viðbætur í kjarnann (sjá app-sidur.js: VIEWS_EXT, DETAIL_EXT, ACT_EXT, FAB_EXT)
  Object.assign(window.VIEWS_EXT = window.VIEWS_EXT || {}, { ltilbod: () => vTilbod("leiga"), lvorur: () => vVorur("leiga"), stilbod: () => vTilbod("sala"), svorur: () => vVorur("sala"), vvinna: () => vVinna(), pantanir: () => vPantanir(), vutl: () => vUtleiga() });
  Object.assign(window.DETAIL_EXT = window.DETAIL_EXT || {}, { vara: id => { const v = findV(id); return v && dVara(v); }, tb: id => { const T = findT(id); return T && dTilbod(T); } });
  Object.assign(window.ACT_EXT = window.ACT_EXT || {}, { vr: salaAct, tb: salaAct, pn: salaAct });
  Object.assign(window.FAB_EXT = window.FAB_EXT || {}, { vvinna: () => vinnaForm(), lvorur: () => varaForm("leiga", null), svorur: () => varaForm("sala", null), ltilbod: () => salaAct("tbnew", [PV() ? "blandad" : "leiga"]), stilbod: () => salaAct("tbnew", ["sala"]), pantanir: () => pnForm(null), vutl: () => pnForm(null) });
  window.salaEditing = () => !!EDT;
  { const r0 = render; render = function () { const x = r0.apply(this, arguments); try { tbWatch(); } catch (e) { console.warn("tbWatch", e); } return x; }; }
})();
