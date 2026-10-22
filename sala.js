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
   Prufugögn (prufa: true) má hlaða inn og eyða í einu lagi (vörulisti, admin). */
(function () {
  const VR = () => S?.vorur || [], TB = () => S?.tilbod || [];
  const findV = id => VR().find(x => x.id === id), findT = id => TB().find(x => x.id === id);
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
  const LTEG = { leiga: "Leiga", sala: "Sala", vinna: "Vinna" }; const lteg = k => LTEG[k];
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
  // Hlutar tilboðs í þeirri röð sem þeir birtast fyrst
  const groups = T => { const m = new Map(); (T.linur || []).forEach(l => { const k = l.hl || "Annað"; if (!m.has(k)) m.set(k, []); m.get(k).push(l); }); return [...m.entries()]; };
  const vPrice = v => v.tegund === "sala" || v.tegund === "vinna" || vDeild(v) === "sala" ? v.soluverd : v.leiguverd;
  const lineFrom = (v, T) => { const D = T && !isMix(T) ? tDeild(T) : vDeild(v), teg = v.tegund === "vinna" ? "vinna" : D === "sala" ? "sala" : "leiga";
    return { id: gid(), v: v.id, heiti: v.heiti, teg, hl: v.tegund === "vinna" ? "Vinna og þjónusta" : (v.flokkur || "Annað"), magn: 1, ein: v.eining || (teg === "vinna" ? "klst." : "stk."), verd: +(teg === "leiga" ? v.leiguverd : v.soluverd) || 0, dagar: null, afsl: 0 }; };
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
    return `<p class="hint" style="margin:16px 0 10px">Vinna og þjónusta sem er seld á tilboðum, t.d. tæknimaður, uppsetning eða akstur – verð á einingu (klst., ferð, km).</p>`
      + (xs.length ? grpList(xs, VFL) : `<div class="empty">Engin vinna eða þjónusta skráð.${MCP ? " Bættu við með „+ Nýtt“." : ""}</div>`);
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
      let h = `<div class="fsels" style="margin:16px 0 12px">${fsel([["", "Allar línur"], ["leiga", "Leiga"], ["sala", "Sala"], ["vinna", "Vinna"]].map(([k, l]) => [`tbf:${k}`, l, TL.f === k]), "Línur")}${fsel([[`tbs:leiga:`, "Allar stöður", !TS.leiga], ...STADA.map(s => [`tbs:leiga:${s}`, s, TS.leiga === s])], "Staða")}</div>`;
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
    const c = CF(), d0 = isoDay(new Date()), g0 = (() => { const x = new Date(); x.setDate(x.getDate() + (+c.gildisdagar || 14)); return isoDay(x); })(), L = D !== "sala", M = D === "blandad";
    sheet.innerHTML = `<h3 id="sheet-h">Nýtt ${M ? "tilboð" : L ? "leigutilboð" : "sölutilboð"}</h3><form id="tbf" novalidate>
      <label>${L ? "Heiti viðburðar" : "Heiti verks"}<input id="tb-heiti" value="${esc(PP?.stutt || "")}" placeholder="${L ? "T.d. Árshátíð" : "T.d. Hljóðkerfi fyrir veitingastað"}"></label>
      ${PP ? `<p class="hint" style="margin:0 0 6px">Verkefni: <span class="nr">${esc(PP.nr)}</span> ${esc(PP.stutt || "")}</p>` : ""}
      ${vskSelect("tb", "client", "Viðskiptavinur", "Viðskiptavinur", PP?.vskId || PP?.vkId || null)}
      <div class="two"><label>Tengiliður<input id="tb-teng" placeholder="Nafn"></label><label>Netfang tengiliðs<input id="tb-net" type="email" placeholder="nafn@fyrirtaeki.is"></label></div>
      <label>${L ? "Staðsetning" : "Uppsetningarstaður"}<input id="tb-stad" placeholder="${L ? "T.d. Salur A" : "T.d. Gata 10"}"></label>
      ${L ? `<div class="two"><label>Frá${M ? "" : " (afhending)"}<input id="tb-fra" type="date" value="${M ? "" : d0}"></label><label>Til${M ? "" : " (skil)"}<input id="tb-til" type="date" value="${M ? "" : d0}"></label></div>${M ? `<p class="hint" style="margin:-4px 0 8px">Tímabil verksins – leigulínur reiknast á þessa daga.</p>` : ""}` : `<label>Áætluð afhending<input id="tb-fra" type="date"></label>`}
      <label>Tilboð gildir til<input id="tb-gildir" type="date" value="${g0}"></label>
      <div id="f-msg"></div><div class="actions"><button type="button" class="btn" id="tb-cancel">Hætta við</button><button class="btn primary" id="tb-save">Búa til og bæta við línum</button></div></form>`;
    sheetwrap.hidden = false; wireVskSelects(sheet);
    if (L) document.getElementById("tb-fra").onchange = e => { const t = document.getElementById("tb-til"); if (!t.value || t.value < e.target.value) t.value = e.target.value; };
    document.getElementById("tb-client").addEventListener("change", e => { const v = findVsk(e.target.value); if (v) { if (!val("tb-teng") && v.tengilidur) document.getElementById("tb-teng").value = v.tengilidur; if (!val("tb-net") && v.netfang) document.getElementById("tb-net").value = v.netfang; } });
    document.getElementById("tb-cancel").onclick = closeSheet;
    document.getElementById("tbf").onsubmit = async e => { e.preventDefault();
      try {
        const heiti = val("tb-heiti"); if (!heiti) return msg("Skrifaðu heiti.", "err");
        const fra = val("tb-fra") || null, til = L ? (val("tb-til") || fra) : null; if (fra && til && til < fra) return msg("„Til“ getur ekki verið á undan „Frá“.", "err");
        const cl = await pickVsk("tb", "client", "Viðskiptavinur"), id = gid(), n = +c[nK(D)] || 1001, nr = DL[D].pre + n;
        const T = { id, nr, heiti, deild: D, vskId: cl?.id || null, vidskiptavinur: cl?.name || null,
          tengilidur: val("tb-teng") || null, netfang: val("tb-net") || null, stadsetning: val("tb-stad") || null, fra, til, gildir: val("tb-gildir") || null, dags: d0,
          stada: "Drög", utgafa: 1, eldri: [], afsl: 0, athugasemd: null, linur: [], verkefniId: PP?.id || null };
        await saveSnapshot(s => { (s.tilbod = s.tilbod || []).push(T); s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), [nK(D)]: n + 1 }; });
        toast("Tilboð " + nr + " stofnað"); closeSheet(); EDT = structuredClone(T); openDetail("tb:" + id);
      } catch (err) { msg(esc(err?.code === "form" ? err.message : errText(err)), "err"); } };
  }

  /* ---------- Tilboð: síða og ritill ---------- */
  let EDT = null; // drög í vinnslu (afrit af tilboðinu meðan verið er að breyta)
  const tbTableHTML = (T, ed) => {
    const gs = groups(T), D = tDeild(T); if (!gs.length) return `<div class="empty">${ed ? `Engar línur ennþá. Bættu við úr ${D === "leiga" ? "búnaðarlista" : "vörulista"} eða sérlínu.` : "Engar línur."}</div>`;
    return gs.map(([hl, ls]) => { const sub = ls.reduce((a, l) => a + lSum(l, T), 0);
      return `<div class="tbgrp"><div class="tbgh">${ed ? `<input class="tbhl" data-hl="${esc(hl)}" value="${esc(hl)}" aria-label="Heiti hluta">` : `<b>${esc(hl)}</b>`}<span>${esc(krs(sub))}</span></div>
        ${ls.map(l => { const v = l.v ? findV(l.v) : null, pk = v?.tegund === "pakki" ? pakkiTxt(v) : "";
          if (!ed) return `<div class="tbl"><div class="tbln"><div>${esc(l.heiti)}${pk ? `<div class="ls">${esc(pk)}</div>` : ""}</div><div class="ls">${esc([fx(l.magn) + " " + (l.ein || ""), "× " + krs(l.verd), l.teg === "leiga" ? lDagar(l, T) + " " + (lDagar(l, T) === 1 ? "dagur" : "dagar") + (studull(lDagar(l, T)) !== lDagar(l, T) ? " (stuðull " + fx(studull(lDagar(l, T))) + ")" : "") : LTEG[l.teg], +l.afsl ? "−" + fx(l.afsl) + "%" : ""].filter(Boolean).join(" · "))}</div></div><b>${esc(krs(lSum(l, T)))}</b></div>`;
          return `<div class="tbl ed" data-lid="${esc(l.id)}"><div class="tbln"><input data-l="heiti:${esc(l.id)}" value="${esc(l.heiti)}" aria-label="Lýsing">${pk ? `<div class="ls">${esc(pk)}</div>` : ""}
            <div class="tbf"><label>Magn<input data-l="magn:${esc(l.id)}" inputmode="decimal" value="${esc(fx(l.magn))}"></label>
            ${l.teg === "leiga" ? `<label>Dagar<input data-l="dagar:${esc(l.id)}" inputmode="numeric" value="${l.dagar ? esc(String(l.dagar)) : ""}" placeholder="${tbDagar(T)}"></label>` : ""}
            <label>Verð${l.teg === "leiga" ? "/dag" : ""}<input data-l="verd:${esc(l.id)}" inputmode="numeric" value="${esc(String(l.verd || 0))}"></label>
            <label>Afsl. %<input data-l="afsl:${esc(l.id)}" inputmode="decimal" value="${+l.afsl ? esc(fx(l.afsl)) : ""}" placeholder="0"></label>
            ${!l.v ? `<label>Tegund<select data-l="teg:${esc(l.id)}">${(D === "leiga" ? ["leiga", "vinna", "sala"] : ["sala", "vinna"]).map(k => `<option value="${k}"${l.teg === k ? " selected" : ""}>${lteg(k)}</option>`).join("")}</select></label>` : ""}
            <label>Hluti<select data-l="hl:${esc(l.id)}">${[...new Set(groups(T).map(g => g[0]).concat(FLOKKAR(D), ["Vinna og þjónusta"]))].map(g => `<option${g === l.hl ? " selected" : ""}>${esc(g)}</option>`).join("")}</select></label></div></div>
            <div class="tblr"><b data-ls="${esc(l.id)}">${esc(krs(lSum(l, T)))}</b><button type="button" class="btn" data-act="tbl:del:${esc(l.id)}" aria-label="Eyða línu">×</button></div></div>`; }).join("")}</div>`; }).join("");
  };
  const tbTotHTML = T => { const t = totals(T), r = (k, x, b) => `<div class="sub-i"${b ? ' style="font-size:16px"' : ""}><span>${esc(k)}</span><b>${esc(krs(x))}</b></div>`;
    return `${t.leiga ? r("Leiga", t.leiga) : ""}${t.sala ? r(tDeild(T) === "sala" ? "Vörur" : "Sala", t.sala) : ""}${t.vinna ? r("Vinna og þjónusta", t.vinna) : ""}
      ${t.afsl ? r("Afsláttur " + fx(T.afsl) + "%", -t.afsl) : ""}${r("Samtals án VSK", t.net)}${r("VSK " + fx(vskP()) + "%", t.vsk)}${r("Samtals með VSK", t.tot, 1)}`; };
  const dagTxt = T => `${tbDagar(T)} ${tbDagar(T) === 1 ? "leigudagur" : "leigudagar"} · dagstuðull ${fx(studull(tbDagar(T)))}`;

  window.dTilbod = function (T0) {
    const ed = EDT && EDT.id === T0.id, T = ed ? EDT : T0, D = tDeild(T), L = D === "leiga", pr = T.verkefniId ? findProj(T.verkefniId) : null;
    const ms = window.MS && MS.on && MS.on();
    const kick = `<span class="kind">${isMix(T) ? "Tilboð " + esc(T.nr) : esc(DL[D].l) + " · tilboð " + esc(T.nr)}${+T.utgafa > 1 ? " · útgáfa " + esc(String(T.utgafa)) : ""}</span><span class="pill ${STC[T.stada] || ""}">${esc(T.stada)}</span>${T.prufa ? '<span class="tag">prufa</span>' : ""}`;
    if (ed) return backBar() + `<div class="kicker">${kick}<span class="tag">breytingahamur</span></div>
      <div id="tbed">
      <label>${L ? "Heiti viðburðar" : "Heiti verks"}<input data-h="heiti" value="${esc(T.heiti || "")}"></label>
      <label>Viðskiptavinur<select data-h="vskId"><option value="">Enginn</option>${vskList().map(c => `<option value="${esc(c.id)}"${sameId(c.id, T.vskId) ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
      <div class="two"><label>Tengiliður<input data-h="tengilidur" value="${esc(T.tengilidur || "")}"></label><label>Netfang<input data-h="netfang" type="email" value="${esc(T.netfang || "")}"></label></div>
      <label>${L ? "Staðsetning" : "Uppsetningarstaður"}<input data-h="stadsetning" value="${esc(T.stadsetning || "")}"></label>
      ${L ? `<div class="two"><label>Frá<input data-h="fra" type="date" value="${esc(T.fra || "")}"></label><label>Til<input data-h="til" type="date" value="${esc(T.til || "")}"></label></div>
      <p class="hint" id="tb-dg" style="margin:-4px 0 8px">${dagTxt(T)}</p>` : `<label>Áætluð afhending<input data-h="fra" type="date" value="${esc(T.fra || "")}"></label>`}
      <div class="viewtitle">Línur</div>
      <div class="links" style="margin:0 0 10px">${isMix(T) ? `<button type="button" class="btn primary" data-act="tbl:thj">+ Vinna og þjónusta</button>${pickDs(T).map(d => `<button type="button" class="btn primary" data-act="tbl:pick:${d}">+ ${d === "leiga" ? "Búnaður" : "Vara"}</button>`).join("")}` : `<button type="button" class="btn primary" data-act="tbl:pick">+ Úr ${L ? "búnaðarlista" : "vörulista"}</button>`}<button type="button" class="btn" data-act="tbl:custom">+ Sérlína</button></div>
      <div id="tb-tab">${tbTableHTML(T, true)}</div>
      <div class="two" style="margin-top:12px"><label>Afsláttur á tilboð (%)<input data-h="afsl" inputmode="decimal" value="${+T.afsl ? esc(fx(T.afsl)) : ""}" placeholder="0"></label><label>Gildir til<input data-h="gildir" type="date" value="${esc(T.gildir || "")}"></label></div>
      <label>Athugasemd á tilboði<textarea data-h="athugasemd" placeholder="Birtist á tilboðinu">${esc(T.athugasemd || "")}</textarea></label>
      <div class="card rksum" id="tb-tot" style="margin-top:10px">${tbTotHTML(T)}</div>
      <div class="links" style="margin-top:12px"><button type="button" class="btn primary" data-act="tbed:save">Vista tilboð</button><button type="button" class="btn" data-act="tbed:cancel">Hætta við</button></div></div>`;
    const t = totals(T);
    return backBar() + `<div class="kicker">${kick}</div>
      <h2 class="big" style="margin-top:6px">${esc(T.heiti || "")}</h2>
      <p class="sub">${[T.vskId && findVsk(T.vskId) ? `<a class="plink" data-open="vsk:${esc(T.vskId)}">${esc(T.vidskiptavinur || findVsk(T.vskId).name)}</a>` : esc(T.vidskiptavinur || ""), esc(dRange(T)), L && T.fra ? esc(tbDagar(T) + (tbDagar(T) === 1 ? " dagur" : " dagar")) : "", esc(T.stadsetning || "")].filter(Boolean).join(" · ")}</p>
      ${pr ? `<p class="sub">Verkefni: <a class="plink" data-open="verk:${esc(pr.id)}">${esc(pr.nafn)}</a></p>` : ""}
      <div class="links">${MCP ? `<button type="button" class="btn primary" data-act="tbed:start:${esc(T.id)}">✎ Breyta</button>` : ""}<button type="button" class="btn" data-act="tbpdf:pv:${esc(T.id)}">Forskoða PDF</button><button type="button" class="btn" data-act="tbpdf:dl:${esc(T.id)}">Sækja PDF</button>
        ${MCP && ms && window.poCompose ? `<button type="button" class="btn" data-act="tbsend:${esc(T.id)}">✉ Senda</button>` : ""}</div>
      ${MCP ? `<div class="kind" style="margin-top:14px">Staða</div>${PV() ? `<div class="fsels">${fsel(STADA.map(s => [`tbst:${T.id}:${s}`, s, T.stada === s]), "Staða tilboðs")}</div>` : `<div class="chips">${STADA.map(s => `<button type="button" class="chipbtn" data-act="tbst:${esc(T.id)}:${s}" aria-pressed="${T.stada === s}">${s}</button>`).join("")}</div>`}
        <div class="links" style="margin-top:10px">${T.stada === "Samþykkt" && !T.verkefniId ? `<button type="button" class="btn primary" data-act="tbverk:${esc(T.id)}">Stofna verkefni úr tilboði</button>` : ""}<button type="button" class="btn" data-act="tbutg:${esc(T.id)}">Ný útgáfa</button><button type="button" class="btn" data-act="tbcopy:${esc(T.id)}">Afrita sem nýtt tilboð</button>${DEL() ? `<button type="button" class="btn danger" data-act="tbdel:${esc(T.id)}">Eyða</button>` : ""}</div>` : ""}
      <div class="viewtitle">Línur</div><div class="tbtab">${tbTableHTML(T, false)}</div>
      <div class="card rksum" style="margin-top:10px">${tbTotHTML(T)}</div>
      ${T.athugasemd ? `<div class="viewtitle">Athugasemd</div><p style="white-space:pre-wrap;margin:0">${esc(T.athugasemd)}</p>` : ""}
      ${(T.eldri || []).length ? `<div class="viewtitle">Fyrri útgáfur</div>${llist(T.eldri.slice().reverse().map(e => `<div class="lrow"><div class="lm"><div class="lt">Útgáfa ${esc(String(e.utgafa))}</div><div class="ls">${esc(dIS(e.dags))}</div></div><div class="lr"><span class="lc">${esc(krs(e.net))}</span></div></div>`))}` : ""}
      <p class="hint" style="margin-top:10px">Gildir til ${esc(T.gildir ? dIS(T.gildir) : "–")} · stofnað ${esc(dIS(T.dags))} · ${esc(krs(t.tot))} með VSK</p>`;
  };
  // Breytingar í ritlinum: haus (data-h) og línur (data-l) uppfæra drögin; aðeins samtölur teiknaðar aftur (fókus helst)
  const refreshTot = () => { if (!EDT) return; const tt = document.getElementById("tb-tot"); if (tt) tt.innerHTML = tbTotHTML(EDT);
    (EDT.linur || []).forEach(l => { const b = document.querySelector(`[data-ls="${CSS.escape(l.id)}"]`); if (b) b.textContent = krs(lSum(l, EDT)); });
    document.querySelectorAll(".tbgh span").forEach((s, i) => { const g = groups(EDT)[i]; if (g) s.textContent = krs(g[1].reduce((a, l) => a + lSum(l, EDT), 0)); });
    const dg = document.getElementById("tb-dg"); if (dg) dg.textContent = dagTxt(EDT); };
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
  function pickDs(T) { const on = ["leiga", "sala"].filter(d => ON(d) && VRd(d).some(v => v.tegund !== "vinna")), p = T?.verkefniId && (S?.verkefni || []).find(x => x.id === T.verkefniId);
    const pd = p && (p.deild === "leiga" || p.deild === "sala") ? p.deild : null, has = d => (T?.linur || []).some(l => l.teg === d || (d === "leiga" && l.teg === "pakki"));
    const ds = pd ? on.filter(d => d === pd || has(d)) : on; return ds.length ? ds : on; }
  function picker(M) {
    const D = M || tDeild(EDT), src = () => isMix(EDT) ? (M ? VRd(M) : VR()).filter(v => v.tegund !== "vinna") : VRd(D);
    let pf = "", pq = ""; const draw = () => {
      const xs = src().filter(v => (!pf || (pf === "_vinna" ? v.tegund === "vinna" : v.flokkur === pf && v.tegund !== "vinna")) && (!pq || (v.heiti + " " + (v.nr || "")).toLowerCase().includes(pq))).sort((a, b) => FLOKKAR(D).indexOf(a.flokkur) - FLOKKAR(D).indexOf(b.flokkur) || a.heiti.localeCompare(b.heiti, "is"));
      document.getElementById("pk-list").innerHTML = xs.length ? xs.map(v => { const n = (EDT.linur || []).filter(l => l.v === v.id).reduce((a, l) => a + (+l.magn || 0), 0);
        return `<button type="button" class="lrow tap pkrow" data-pick="${esc(v.id)}" style="width:100%;text-align:left;border:0;background:none;font:inherit;color:inherit"><div class="lm"><div class="lt">${esc(v.heiti)}</div><div class="ls">${esc([v.flokkur, v.tegund === "pakki" ? "Pakki · " + pakkiTxt(v) : v.tegund === "vinna" ? "Vinna og þjónusta" : (D === "sala" && +v.fjoldi ? num(v.fjoldi) + " á lager" : "")].filter(Boolean).join(" · "))}</div></div><div class="lr"><span class="lc">${esc(krs(vPrice(v)))}</span>${n ? `<span class="pill">${esc(fx(n))} á tilboði</span>` : ""}</div></button>`; }).join("") : `<div class="empty">Ekkert fannst.</div>`; };
    const fl = FLOKKAR(D).filter(f => src().some(v => v.flokkur === f && v.tegund !== "vinna"));
    sheet.innerHTML = `<h3 id="sheet-h">${M ? (M === "leiga" ? "Bæta við búnaði" : "Bæta við vöru") : "Bæta við úr " + (D === "leiga" ? "búnaðarlista" : "vörulista")}</h3><input type="search" id="pk-q" placeholder="Leita…" autocomplete="off" style="margin-bottom:8px">
      ${PV() ? `<select class="fsel" id="pk-fs" aria-label="Flokkur" style="margin-bottom:8px"><option value="">Allir flokkar</option>${fl.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join("")}</select>` : ""}<div class="chips" id="pk-f" style="margin-bottom:8px${PV() ? ";display:none" : ""}"><button type="button" class="chipbtn" data-pf="" aria-pressed="true">Allt</button>${fl.map(f => `<button type="button" class="chipbtn" data-pf="${esc(f)}" aria-pressed="false">${esc(f)}</button>`).join("")}${src().some(v => v.tegund === "vinna") ? `<button type="button" class="chipbtn" data-pf="_vinna" aria-pressed="false">Vinna og þjónusta</button>` : ""}</div>
      <div class="llist" id="pk-list"></div><p class="hint" style="margin-top:8px">Smelltu til að bæta við (aftur til að auka magn). Magn${D === "leiga" ? ", daga" : ""} og verð má laga á tilboðinu.</p>
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
    const items = vv.length ? vv.map(v => ({ v: v.id, heiti: v.heiti, verd: +v.soluverd || 0, ein: v.eining || "klst." })) : vl.length ? vl.map(x => ({ heiti: x.heiti, verd: +x.verd || 0, ein: "klst." })) : THJ().map(t => ({ heiti: t, verd: tg, ein: "klst." }));
    sheet.innerHTML = `<h3 id="sheet-h">Bæta við þjónustu</h3><div class="llist" id="tj-list">${items.map((x, i) => `<button type="button" class="lrow tap" data-tj="${i}" style="width:100%;text-align:left;border:0;background:none;font:inherit;color:inherit"><div class="lm"><div class="lt">${esc(x.heiti)}</div><div class="ls">${x.verd ? esc(krs(x.verd)) + "/" + esc(String(x.ein || "klst.").replace(/\.$/, "")) : "Verð skráð á tilboðinu"}</div></div></button>`).join("")}</div>
      <p class="hint" style="margin-top:8px">Línan fær 1 ${vv.length ? "einingu" : "klst."} – breyttu magni og verði á tilboðinu.${vv.length ? "" : " Skráðu vinnu og þjónustu með verði undir " + (PV() ? "Vörulisti" : "Búnaður") + " › Vinna og þjónusta, þá birtist hún hér."}</p><div class="actions"><button type="button" class="btn primary" id="tj-done">Lokið</button></div>`;
    sheetwrap.hidden = false;
    document.getElementById("tj-list").onclick = e => { const b = e.target.closest("[data-tj]"); if (!b) return; const x = items[+b.dataset.tj];
      (EDT.linur = EDT.linur || []).push({ id: gid(), v: x.v || null, heiti: x.heiti, teg: "vinna", hl: "Vinna og þjónusta", magn: 1, ein: x.ein || "klst.", verd: x.verd, dagar: null, afsl: 0 }); toast(x.heiti + " bætt við"); };
    document.getElementById("tj-done").onclick = () => { sheetwrap.hidden = true; render(); };
  }

  /* ---------- PDF ---------- */
  async function tbPdf(T) {
    const D = tDeild(T), L = D === "leiga";
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
    return { vorur: V, tilbod: T };
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
  const saveT = (id, fn) => saveSnapshot(s => { const q = (s.tilbod || []).find(x => x.id === id); if (q) fn(q, s); });
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
      if (a === "inn") { const p = prufa(); saveSnapshot(s => { s.vorur = [...(s.vorur || []), ...p.vorur]; s.tilbod = [...(s.tilbod || []), ...p.tilbod]; }).then(() => toast(`${p.vorur.length} prufuvörum og ${p.tilbod.length} prufutilboðum bætt við (leiga og sala)`)).catch(e => toast(errText(e))); return; }
      const nv = VR().filter(v => v.prufa).length, nt = TB().filter(t => t.prufa).length;
      if (!confirm(`Eyða öllum prufugögnum í leigu og sölu: ${nv} vörum og ${nt} tilboðum merktum „prufa“?\n\nAnnað helst óbreytt.`)) return;
      saveSnapshot(s => { s.vorur = (s.vorur || []).filter(v => !v.prufa); s.tilbod = (s.tilbod || []).filter(t => !t.prufa); }).then(() => toast("Prufugögnum eytt")).catch(e => toast(errText(e))); return; }
    if (k === "tbs") { TS[r[0]] = r.slice(1).join(":"); render(); return; }
    if (k === "tbf") { TL.f = r[0] || ""; render(); return; }
    if (k === "tbnew") { const D = r[0] === "sala" ? "sala" : r[0] === "blandad" ? "blandad" : "leiga"; if (D === "blandad") { tbForm(D, r[1] ? { verkefniId: r.slice(1).join(":") } : null); return; } if (!VRd(D).length && !confirm(`${D === "leiga" ? "Búnaðarlistinn" : "Vörulistinn"} er tómur – línur má samt skrá sem sérlínur. Halda áfram?`)) return; tbForm(D, r[1] ? { verkefniId: r.slice(1).join(":") } : null); return; }
    if (k === "tbed") { const [op, id] = r;
      if (op === "start") { const T = findT(id); if (T) { EDT = structuredClone(T); render(); window.scrollTo({ top: 0 }); } return; }
      if (op === "cancel") { if (!confirm("Hætta við breytingar á tilboðinu?")) return; EDT = null; render(); return; }
      if (op === "save") { const D = EDT; if (!D) return; if (D.fra && D.til && D.til < D.fra) return toast("„Til“ getur ekki verið á undan „Frá“.");
        saveT(D.id, q => { Object.keys(D).forEach(x => { q[x] = D[x]; }); }).then(() => { EDT = null; toast("Tilboð vistað"); render(); }).catch(e => toast(errText(e))); return; } }
    if (k === "tbl") { if (!EDT) return; const [op, id] = r, D = tDeild(EDT);
      if (op === "thj") { thjPicker(); return; }
      if (op === "pick") { const M = isMix(EDT) && (id === "leiga" || id === "sala") ? id : null, DD = M || D; if (!(isMix(EDT) && !M ? VR() : VRd(DD)).length) return toast(`${DD === "leiga" ? "Búnaðarlistinn" : "Vörulistinn"} er tómur – bættu við eða notaðu sérlínu.`); picker(M); return; }
      if (op === "custom") { (EDT.linur = EDT.linur || []).push({ id: gid(), v: null, heiti: "Ný lína", teg: isMix(EDT) ? "vinna" : D, hl: groups(EDT).slice(-1)[0]?.[0] || "Annað", magn: 1, ein: "stk.", verd: 0, dagar: null, afsl: 0 }); render(); return; }
      if (op === "del") { EDT.linur = (EDT.linur || []).filter(l => l.id !== id); render(); return; } }
    if (k === "tbst") { const [id, st] = r; saveT(id, q => { q.stada = st; if (st === "Sent" && !q.sent) q.sent = isoDay(new Date()); }).then(() => toast("Staða: " + st)); return; }
    if (k === "tbutg") { const T = findT(a); if (!T || !confirm(`Búa til útgáfu ${(+T.utgafa || 1) + 1} af tilboði ${T.nr}?\n\nNúverandi útgáfa er skráð í „Fyrri útgáfur“ og staðan fer aftur í Drög.`)) return;
      saveT(a, q => { (q.eldri = q.eldri || []).push({ utgafa: +q.utgafa || 1, dags: q.dags, net: totals(q).net }); q.utgafa = (+q.utgafa || 1) + 1; q.dags = isoDay(new Date()); q.stada = "Drög"; })
        .then(() => { EDT = structuredClone(findT(a)); render(); toast("Ný útgáfa – breyttu og vistaðu"); }); return; }
    if (k === "tbcopy") { const T = findT(a); if (!T) return; const D = DK(T), c = CF(), id = gid(), n = +c[nK(D)] || 1001, nr = DL[D].pre + n;
      const N = { ...structuredClone(T), id, nr, deild: D, stada: "Drög", utgafa: 1, eldri: [], dags: isoDay(new Date()), verkefniId: null, sent: null, prufa: false, linur: (T.linur || []).map(l => ({ ...l, id: gid() })) };
      delete N.stofnad_af; delete N.stofnad_t; delete N.breytt_af; delete N.breytt_t; delete N._o;
      saveSnapshot(s => { (s.tilbod = s.tilbod || []).push(N); s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), [nK(D)]: n + 1 }; })
        .then(() => { toast("Afritað sem " + nr); EDT = structuredClone(N); openDetail("tb:" + id); }); return; }
    if (k === "tbdel") { const T = findT(a); if (!T || !confirm(`Eyða tilboði ${T.nr} (${T.heiti})?`)) return;
      saveSnapshot(s => { s.tilbod = (s.tilbod || []).filter(x => x.id !== a); }).then(() => { toast("Tilboði eytt"); goBack(); }).catch(e => toast(errText(e))); return; }
    if (k === "tbpdf") { const [op, id] = r, T = findT(id); if (!T) return; toast("Bý til PDF…");
      tbPdf(T).then(b => { const blob = new Blob([b], { type: "application/pdf" });
        if (op === "pv") return blobPreview(blob, fileBase(T) + ".pdf");
        const x = document.createElement("a"); x.href = URL.createObjectURL(blob); x.download = fileBase(T) + ".pdf"; document.body.appendChild(x); x.click(); x.remove(); setTimeout(() => URL.revokeObjectURL(x.href), 5000); toast("PDF sótt"); })
        .catch(e => toast("PDF tókst ekki: " + (e?.message || e))); return; }
    if (k === "tbsend") { const T = findT(a); if (!T || !window.poCompose) return; toast("Bý til PDF…");
      tbPdf(T).then(bytes => poCompose({ to: T.netfang || findVsk(T.vskId)?.netfang || "", subject: `Tilboð ${T.nr} – ${T.heiti || ""} frá ${DOK.co().nafn}`, pid: T.verkefniId || null,
        body: `Góðan dag${T.tengilidur ? " " + T.tengilidur.split(" ")[0] : ""},\n\nMeðfylgjandi er tilboð ${T.nr} í ${T.heiti || "verkið"}${T.fra ? " (" + dRange(T) + ")" : ""}, samtals ${krs(totals(T).net)} án VSK.${T.gildir ? `\nTilboðið gildir til ${dIS(T.gildir)}.` : ""}\n\nEndilega hafðu samband ef spurningar vakna.`,
        atts: [{ name: fileBase(T) + ".pdf", type: "application/pdf", size: bytes.length, data: bytes }],
        onSent: () => saveT(a, q => { if (q.stada === "Drög") q.stada = "Sent"; q.sent = isoDay(new Date()); }) })).catch(e => toast("PDF tókst ekki: " + (e?.message || e))); return; }
    if (k === "tbverk") { const T = findT(a); if (!T || T.verkefniId) return; if (!confirm(`Stofna verkefni úr tilboði ${T.nr}?\n\n„${T.heiti}“ fyrir ${T.vidskiptavinur || "–"}, tilboðsupphæð ${krs(totals(T).net)} án VSK.`)) return;
      const id = gid(), nr = nextProjNr(), st = (STODUR().find(x => x.n === "Í vinnslu") || STODUR().find(x => !x.lokid) || STODUR()[0]).n;
      saveSnapshot(s => { (s.verkefni = s.verkefni || []).push({ id, nr, stutt: T.heiti, nafn: nr + " " + T.heiti, stada: st, vidskiptavinur: T.vidskiptavinur || null, verkkaupi: null, vskId: T.vskId || null, vkId: null,
          thjonusta: [], timar: 0, yfirlit: null, mappa: null, undirverk: [], starfsmenn: [ME()], aklst: null, tilbod: totals(T).net, tilbodId: T.id, deild: isMix(T) ? null : tDeild(T), timabilFra: T.fra || null, timabilTil: T.til || T.fra || null,
          lysing: [isMix(T) ? null : DL[tDeild(T)].l, T.stadsetning, T.fra ? dRange(T) : ""].filter(Boolean).join(" · ") || null });
        const q = (s.tilbod || []).find(x => x.id === a); if (q) q.verkefniId = id; })
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
  const tbOnD = T => (tDeild(T) === "sala" ? ON("sala") : ON("leiga"));
  window.tbCountFor = pid => TB().filter(T => T.verkefniId === pid && tbOnD(T)).length;
  window.tbProjTab = p => { if (!window.ON || !(ON("leiga") || ON("sala"))) return "";
    const Ds = ["leiga", "sala"].filter(D => ON(D) && (!p.deild || p.deild === D));
    if (PV()) return (MCP ? `<div class="links"><button type="button" class="btn primary" data-act="tbnew:blandad:${esc(p.id)}">+ Tilboð</button></div>` : "") + (tbFor(T => T.verkefniId === p.id) || `<div class="empty" style="margin-top:16px">Engin tilboð tengd þessu verkefni.</div>`);
    const btns = MCP ? `<div class="links">${Ds.map(D => `<button type="button" class="btn primary" data-act="tbnew:${D}:${esc(p.id)}">+ ${D === "leiga" ? "Leigutilboð" : "Sölutilboð"}</button>`).join("")}</div>` : "";
    return btns + (tbFor(T => T.verkefniId === p.id) || `<div class="empty" style="margin-top:16px">Engin tilboð tengd þessu verkefni.</div>`); };
  // Tilboð viðskiptavinar (á síðu viðskiptavinar), báðar deildir
  window.tbFor = pred => { if (!window.ON || !(ON("leiga") || ON("sala"))) return ""; const xs = TB().filter(T => (tDeild(T) === "sala" ? ON("sala") : ON("leiga")) && pred(T)).sort((a, b) => String(b.dags || "").localeCompare(String(a.dags || ""))); return xs.length ? `<div class="viewtitle">Tilboð · ${xs.length}</div>${llist(xs.map(tbRow))}` : ""; };
  // Skrá viðbætur í kjarnann (sjá app-sidur.js: VIEWS_EXT, DETAIL_EXT, ACT_EXT, FAB_EXT)
  Object.assign(window.VIEWS_EXT = window.VIEWS_EXT || {}, { ltilbod: () => vTilbod("leiga"), lvorur: () => vVorur("leiga"), stilbod: () => vTilbod("sala"), svorur: () => vVorur("sala"), vvinna: () => vVinna() });
  Object.assign(window.DETAIL_EXT = window.DETAIL_EXT || {}, { vara: id => { const v = findV(id); return v && dVara(v); }, tb: id => { const T = findT(id); return T && dTilbod(T); } });
  Object.assign(window.ACT_EXT = window.ACT_EXT || {}, { vr: salaAct, tb: salaAct });
  Object.assign(window.FAB_EXT = window.FAB_EXT || {}, { vvinna: () => vinnaForm(), lvorur: () => varaForm("leiga", null), svorur: () => varaForm("sala", null), ltilbod: () => salaAct("tbnew", [PV() ? "blandad" : "leiga"]), stilbod: () => salaAct("tbnew", ["sala"]) });
  window.salaEditing = () => !!EDT;
})();
