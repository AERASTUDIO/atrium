/* Pöntunarferli (2.55.0, eining „pferli“, sjálfgefið óvirk – fyrst í dev/). Byggir á Pöntunum (sala.js) og QR (qr.js).
   1. Afhending: Sent eða Sótt (+ heimilisfang), afhending og móttaka með kvittun – undirskrift á skjá, mynd og afhendingarseðill (PDF).
   2. Skilauppgjör (Stillingar › Pantanir, kveikt/slökkt): seinkun, týnt og skemmt verður tillaga að aukagjaldi á pöntunina.
   3. Tínslulisti: hvað þarf að taka til; QR-skönnun merkir línu græna.
   4. Pöntun úr pósti: texti úr tölvupósti verður drög að pöntun (dagsetningar, tengiliður, vörur úr vörulista).
   5. Staðgengill við árekstur: sambærilegur laus búnaður eða að færa pöntunina um dag.
   6. Ferð dagsins (Stillingar › Pantanir): afhendingar og sóttar pantanir dagsins í röð, leið í Google Maps.
   7. Panta aftur og sniðmát.
   9. Shopify: tenging í boði í Stillingar › Pantanir (virkjuð síðar).
   Ný gögn á pantanir/{id}: opinber (auðkenni pöntunarsíðu), vidskStadfest, stadfPostur (staðfestingarpóstur sendur), afhending ("sent"|"sott"), afhStadur, afhKl, kvittun: { ut|inn: { nafn, undirskrift (PNG data-URL), mynd (JPEG data-URL),
   dags, af } }, tinsla: [eintaksnr], tinslaH: { vöruId: fjöldi }, aukagjold: [lína-id]. Stillingar: S.stillingar.pantanir = { skilagjold, ferd, snid, shopify }. */
(function () {
  if (window.__pferli) return; window.__pferli = 1;
  const on = () => { try { return typeof ON === "function" && ON("pferli"); } catch (e) { return false; } };
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const tr = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const A = () => window.salaAPI, Q = () => window.qrAPI;
  const PN = () => tr(() => A().PN(), []) || [], VR = () => tr(() => A().VR(), []) || [];
  const findP = id => PN().find(x => String(x.id) === String(id));
  const findV = id => VR().find(x => String(x.id) === String(id));
  const ed = () => tr(() => !!MCP, false);
  const me = () => window.USER?.sk || tr(() => ME(), "");
  const nowIso = () => new Date().toISOString();
  const T0 = () => tr(() => isoDay(new Date()), "");
  const kr = n => tr(() => window.kr ? window.kr(n) : null, null) || (Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " kr.");
  const fold = x => String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ð/g, "d").replace(/þ/g, "th").replace(/æ/g, "ae").replace(/ö/g, "o");
  const CFP = () => tr(() => CFG().pantanir, null) || {};
  const SG = () => ({ on: false, seint: 1, tynt: 100, skemmd: 30, ...(CFP().skilagjold || {}) });
  const FERD = () => !!(CFP().ferd || {}).on;
  const savePN = (id, fn) => saveSnapshot(s => { const P = (s.pantanir || []).find(x => String(x.id) === String(id)); if (P) fn(P, s); });
  const saveCfg = fn => saveSnapshot(s => { s.stillingar = s.stillingar || {}; s.stillingar.pantanir = s.stillingar.pantanir || {}; fn(s.stillingar.pantanir, s); });
  const dfmt = s => { const x = tr(() => d(String(s).slice(0, 10)), null); return x ? x.getDate() + "." + (x.getMonth() + 1) + "." : ""; };
  const ICO = { scan: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/></svg>' };

  /* ---------- Modal (sama útlit og eintaksspjaldið) ---------- */
  function modal(label, html, wide) {
    const w = document.createElement("div"); w.className = "qrcard pfm" + (wide ? " wide" : ""); w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", label);
    w.innerHTML = `<div class="qrscrim" data-x="1"></div><div class="qrsheet pfs"><div class="grab" aria-hidden="true"></div><div class="pfh"><h2>${E(label)}</h2><button type="button" class="qrx" data-x="1" aria-label="Loka">✕</button></div>${html}</div>`;
    document.body.append(w); document.body.classList.add("qropen");
    const close = () => { w.remove(); document.body.classList.remove("qropen"); };
    w.addEventListener("click", e => { if (e.target.closest("[data-x]")) close(); });
    w.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    return { w, close };
  }

  /* ---------- 3. Tínslulisti ---------- */
  function pickState(P) {
    const N = tr(() => Q().need(P), []), list = [...new Set([...(P.tinsla || []), ...((P.skann || {}).ut || [])])], H = { ...((P.skann || {}).utH || {}), ...(P.tinslaH || {}) };
    const rows = N.map(x => { const nrs = x.eint ? list.filter(nr => (x.v?.eintok || []).some(e => e.nr === nr)) : []; const got = x.eint ? nrs.length : (+H[x.id] || 0);
      const hillur = [...new Set((x.v?.eintok || []).map(e => e.hilla).filter(Boolean))]; return { ...x, nrs, got: Math.min(got, x.magn), hillur }; });
    const tot = rows.reduce((a, r) => a + r.magn, 0), done = rows.reduce((a, r) => a + r.got, 0);
    return { rows, tot, done };
  }
  function pickHTML(P) {
    if (!["Ný", "Staðfest"].includes(P.stada)) return "";
    const s = pickState(P); if (!s.rows.length) return "";
    const allDone = s.done >= s.tot;
    return `<section class="pfsec pfpick${allDone ? " done" : ""}"><div class="pfsh"><b>Tínslulisti</b><span class="${allDone ? "t-grn" : ""}">${s.done} af ${s.tot}${allDone ? " · allt komið" : ""}</span>
      ${ed() && !["Skilað", "Lokið"].includes(P.stada) ? `<button type="button" class="btn sm" data-pf="pick:${E(P.id)}">${ICO.scan}Tína með QR</button>` : ""}</div>
      ${s.rows.map(r => `<div class="pfpr${r.got >= r.magn ? " ok" : r.got ? " part" : ""}"><span class="pfck">${r.got >= r.magn ? "✓" : ""}</span><span class="pfpn"><b>${E(r.heiti)}</b><small>${E(r.nr)}${r.hillur.length ? " · hilla " + E(r.hillur.slice(0, 3).join(", ")) : ""}${r.nrs.length ? " · " + E(r.nrs.join(", ")) : ""}</small></span><span class="pfpq">${r.got} / ${r.magn}</span></div>`).join("")}</section>`;
  }
  function pickScan(pid) {
    const P0 = findP(pid); if (!P0 || !Q()) return;
    const panel = () => { const P = findP(pid) || P0, s = pickState(P);
      return `<div class="qrprog"><div><b>${s.done} af ${s.tot}</b> tínt</div><div class="qrbar"><i style="width:${s.tot ? Math.round(s.done / s.tot * 100) : 0}%"></i></div></div>
        <div class="qrlist">${s.rows.map(r => `<div class="qrli${r.got >= r.magn ? " full" : ""}"><span class="qrck" aria-hidden="true">${r.got >= r.magn ? "✓" : ""}</span><span class="qrnm"><b>${E(r.heiti)}</b><small>${E(r.nr)}${r.eint ? "" : " · engin eintök – talið"}</small></span>${r.eint ? `<span class="qrn">${r.got} / ${r.magn}</span>` : `<span class="qrcnt"><button type="button" data-q="h:${E(r.id)}:-1" aria-label="Fækka">−</button><span class="qrn">${r.got} / ${r.magn}</span><button type="button" data-q="h:${E(r.id)}:1" aria-label="Fjölga">+</button></span>`}</div>`).join("")}</div>
        <button type="button" class="btn primary qrdone" data-q="finish">${s.done >= s.tot ? "Allt tínt – loka" : "Loka"}</button>`; };
    Q().openScanner({ title: "Tína · " + (P0.nr || ""), sup: "Tínslulisti", panel,
      onCode: nr => { const P = findP(pid); if (!P) return { ok: false, msg: "Pöntunin fannst ekki" };
        const f = Q().findE(nr); if (!f) return { ok: false, msg: "Óþekkt eintak " + nr };
        const s = pickState(P), r = s.rows.find(x => x.id === String(f.v.id)); if (!r) return { ok: false, msg: f.v.heiti + " er ekki á pöntuninni" };
        if (r.nrs.includes(nr)) return { ok: false, msg: nr + " er þegar tínt" }; if (r.got >= r.magn) return { ok: false, msg: "Komin nóg af " + f.v.heiti };
        if (f.e.uti && String(f.e.uti.p) !== String(P.id)) return { ok: false, msg: nr + " er úti á " + (f.e.uti.nr || "annarri pöntun") };
        if (f.e.stada && f.e.stada !== "ok") return { ok: false, msg: nr + " er merkt í viðgerð/skemmt – veldu annað" };
        if (ed()) savePN(pid, Q0 => { (Q0.tinsla = Q0.tinsla || []).push(nr); }).then(() => Q().refreshPanel()).catch(() => {});
        return { ok: true, msg: nr + " · " + f.v.heiti }; },
      onPanel: async q => { if (q.startsWith("h:")) { const [, id, dd] = q.split(":"); const P = findP(pid), r = pickState(P).rows.find(x => x.id === id); if (!r) return;
          const n = Math.max(0, Math.min(r.magn, r.got + +dd)); await savePN(pid, Q0 => { Q0.tinslaH = { ...(Q0.tinslaH || {}), [id]: n }; }).catch(() => {}); Q().refreshPanel(); return; }
        if (q === "finish") { Q().closeScanner(); render(); } } });
  }

  /* ---------- 1. Afhending: Sent / Sótt og kvittun ---------- */
  const AFH = P => P.afhending || "";
  function afhHTML(P) {
    const k = P.kvittun || {}, ut = k.ut, inn = k.inn, a = AFH(P), canEd = ed() && !["Lokið"].includes(P.stada);
    const kv = (x, l) => x ? `<div class="pfkv"><img src="${x.undirskrift}" alt="Undirskrift ${E(x.nafn || "")}"><span><b class="t-grn">✓ ${l}</b><small>${E(x.nafn || "")} · ${E(dfmt(x.dags))} kl. ${E(String(x.dags).slice(11, 16))}${x.mynd ? " · með mynd" : ""}</small></span><button type="button" class="btn sm" data-pf="pdf:${E(P.id)}:${l === "Afhent" ? "ut" : "inn"}">Seðill (PDF)</button></div>` : "";
    const btnUt = canEd && !ut && ["Ný", "Staðfest", "Afhent"].includes(P.stada) ? `<button type="button" class="btn${P.stada !== "Afhent" ? " primary" : ""}" data-pf="kv:${E(P.id)}:ut">${a === "sott" ? "Afhenda (sótt) með kvittun" : "Afhenda með kvittun"}</button>` : "";
    const btnIn = canEd && ut && !inn && ["Afhent", "Skilað"].includes(P.stada) ? `<button type="button" class="btn primary" data-pf="kv:${E(P.id)}:inn">Taka á móti með kvittun</button>` : "";
    return `<section class="pfsec pfafh"><div class="pfsh"><b>Afhending</b>
      <div class="pfseg" role="group" aria-label="Afhendingarmáti">${[["sent", "Sent"], ["sott", "Sótt"]].map(([v, l]) => `<button type="button"${a === v ? ' aria-pressed="true"' : ""} ${canEd ? `data-pf="afh:${E(P.id)}:${v}"` : "disabled"}>${l}</button>`).join("")}</div></div>
      ${a === "sent" ? `<div class="pfrow"><label>Heimilisfang<input data-pfs="afhStadur:${E(P.id)}" value="${E(P.afhStadur || P.stadsetning || "")}" placeholder="Hvert á að senda" ${canEd ? "" : "disabled"}></label><label>Klukkan<input data-pfs="afhKl:${E(P.id)}" value="${E(P.afhKl || "")}" placeholder="hh:mm" inputmode="decimal" maxlength="5" ${canEd ? "" : "disabled"}></label></div>`
        : a === "sott" ? `<p class="pfhint">Viðskiptavinur sækir ${E(dfmt(P.fra))}${P.afhKl ? " kl. " + E(P.afhKl) : ""} og skilar ${E(dfmt(P.til))}</p>` : `<p class="pfhint">Veldu hvort pöntunin er send eða sótt.</p>`}
      ${kv(ut, "Afhent")}${kv(inn, "Móttekið")}${btnUt || btnIn ? `<div class="pfbb">${btnUt}${btnIn}</div>` : ""}</section>`;
  }
  // Undirskrift + mynd
  function kvittun(pid, dir) {
    const P = findP(pid); if (!P) return; const out = dir === "ut";
    const { w, close } = modal(out ? "Afhending · " + P.nr : "Móttaka · " + P.nr, `
      <p class="pfhint">${out ? "Viðtakandi staðfestir að hafa fengið búnaðinn í lagi." : "Staðfest að búnaðinum hafi verið skilað."} ${E(P.heiti || "")}</p>
      <label>Nafn ${out ? "viðtakanda" : "þess sem skilar"}<input id="pfnafn" value="${E(P.tengilidur || "")}" autocomplete="name"></label>
      <div class="pfsigw"><canvas id="pfsig" width="600" height="200" aria-label="Undirskrift – skrifaðu með fingri eða mús"></canvas><button type="button" class="pfclr" data-clr="1">Hreinsa</button><span class="pfsigl">Undirskrift</span></div>
      <label class="pfphoto"><input id="pfmynd" type="file" accept="image/*" capture="environment" hidden><span class="btn">📷 Taka mynd af búnaðinum</span><small id="pfmyndn">Valfrjálst</small></label>
      <div class="pfact"><button type="button" class="btn" data-x="1">Hætta við</button><button type="button" class="btn primary" id="pfsave">${out ? "Staðfesta afhendingu" : "Staðfesta móttöku"}</button></div>`);
    const c = w.querySelector("#pfsig"), g = c.getContext("2d"); let drawing = false, any = false, last = null;
    g.lineWidth = 2.4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#121416";
    const pt = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
    c.addEventListener("pointerdown", e => { drawing = true; last = pt(e); c.setPointerCapture(e.pointerId); e.preventDefault(); });
    c.addEventListener("pointermove", e => { if (!drawing) return; const p = pt(e); g.beginPath(); g.moveTo(...last); g.lineTo(...p); g.stroke(); last = p; any = true; });
    ["pointerup", "pointercancel"].forEach(t => c.addEventListener(t, () => { drawing = false; }));
    w.querySelector("[data-clr]").onclick = () => { g.clearRect(0, 0, c.width, c.height); any = false; };
    let photo = null;
    w.querySelector("#pfmynd").onchange = async e => { const f = e.target.files?.[0]; if (!f) return; photo = await shrink(f, 1000, .7); w.querySelector("#pfmyndn").textContent = "Mynd komin ✓"; w.querySelector("#pfmyndn").className = "t-grn"; };
    w.querySelector("#pfsave").onclick = async () => {
      const nafn = w.querySelector("#pfnafn").value.trim(); if (!nafn) return toast("Skráðu nafn"); if (!any) return toast("Undirskrift vantar");
      const b = w.querySelector("#pfsave"); b.disabled = true; b.textContent = "Vista…";
      const x = { nafn, undirskrift: c.toDataURL("image/png"), mynd: photo, dags: nowIso(), af: me() };
      try { await savePN(pid, Q0 => { Q0.kvittun = { ...(Q0.kvittun || {}), [dir]: x }; });
        close(); toast(out ? "Afhending staðfest" : "Móttaka staðfest");
        const P2 = findP(pid); if (P2) { const nx = out ? "Afhent" : "Skilað"; if (P2.stada !== nx && P2.stada !== "Lokið" && !(out && P2.stada === "Skilað")) { try { doAct("tbst:" + P2.id + ":" + nx); } catch (e) {} } }
        render();
      } catch (e2) { b.disabled = false; b.textContent = "Reyna aftur"; toast("Tókst ekki að vista: " + (e2?.message || e2)); }
    };
  }
  const shrink = (file, max, q) => new Promise(ok => { const img = new Image(); img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL("image/jpeg", q)); URL.revokeObjectURL(img.src); }; img.onerror = () => ok(null); img.src = URL.createObjectURL(file); });
  // Afhendingarseðill / móttökukvittun (PDF)
  async function sedill(pid, dir) {
    const P = findP(pid), x = P?.kvittun?.[dir]; if (!P || !x || !window.DOK) return; toast("Bý til PDF…");
    try {
      const D = await DOK.pdf(), { doc, M, X1, C } = D, out = dir === "ut", label = (out ? "Afhendingarseðill " : "Móttökukvittun ") + P.nr;
      let y = D.head(out ? "Afhendingarseðill" : "Móttökukvittun", [["Pöntun", P.nr], ["Dags.", dfmt(x.dags) + " kl. " + String(x.dags).slice(11, 16)], ["Viðskiptavinur", P.vidskiptavinur || P.tengilidur || ""], ["Afhending", AFH(P) === "sott" ? "Sótt" : AFH(P) === "sent" ? "Sent" : ""], ["Heimilisfang", AFH(P) === "sent" ? P.afhStadur || P.stadsetning || "" : ""], ["Tímabil", dfmt(P.fra) + " – " + dfmt(P.til)]]);
      D.text(P.heiti || "", M, y, { w: "medium", size: 12 }); y += 22;
      D.text("Búnaður", M, y, { w: "medium", size: 8.5, color: C.stal }); D.text("Magn", X1 - 160, y, { w: "medium", size: 8.5, color: C.stal, align: "right" }); D.text("Eintök", X1 - 150, y, { w: "medium", size: 8.5, color: C.stal }); y += 6; D.line(M, y, X1, y); y += 14;
      const scanned = [...new Set([...((P.skann || {})[dir] || []), ...(out ? P.tinsla || [] : [])])];
      tr(() => Q().need(P), []).forEach(r => { const nrs = scanned.filter(nr => (r.v?.eintok || []).some(e => e.nr === nr)); const lines = D.wrap(nrs.join(", ") || "–", 150, 8.5);
        D.text(r.heiti, M, y); D.text(String(r.magn), X1 - 160, y, { align: "right" }); lines.forEach((l, i) => D.text(l, X1 - 150, y + i * 11, { size: 8.5, color: C.grafit })); y += Math.max(16, lines.length * 11 + 5); if (y > 700) { doc.addPage(); y = D.contHead(label); } });
      y += 8; D.line(M, y, X1, y); y += 20;
      if (x.mynd) { try { const ip = doc.getImageProperties(x.mynd), h = Math.min(220, 240 * ip.height / ip.width), w0 = h * ip.width / ip.height; if (y + h > 700) { doc.addPage(); y = D.contHead(label); } doc.addImage(x.mynd, "JPEG", M, y, w0, h); y += h + 18; } catch (e) {} }
      if (y + 110 > 760) { doc.addPage(); y = D.contHead(label); }
      D.text(out ? "Móttekið í lagi" : "Skilað", M, y, { w: "medium", size: 8.5, color: C.stal }); y += 6;
      try { doc.addImage(x.undirskrift, "PNG", M, y, 180, 60); } catch (e) {} y += 64; D.line(M, y, M + 200, y, C.thoka); y += 12;
      D.text(x.nafn + " · " + dfmt(x.dags) + " kl. " + String(x.dags).slice(11, 16), M, y, { size: 8.5 });
      const bytes = D.finish(label), blob = new Blob([bytes], { type: "application/pdf" }), name = label.replace(/\s+/g, " ") + ".pdf";
      if (window.blobPreview) blobPreview(blob, name); else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }
    } catch (e) { toast("PDF tókst ekki: " + (e?.message || e)); }
  }

  /* ---------- 2. Skilauppgjör ---------- */
  function settle(P) {
    const sg = SG(); if (!sg.on) return null;
    const sk = P.skann || {}, outL = sk.ut || [], inL = sk.inn || [], til = String(P.til || P.fra || "").slice(0, 10);
    const innD = String((P.kvittun?.inn?.dags) || sk.innDags || "").slice(0, 10);
    if (!["Skilað", "Lokið", "Afhent"].includes(P.stada) || (!innD && P.stada === "Afhent")) return null;
    const items = [], done = new Set(P.aukagjold || []);
    // Seinkun
    if (innD && til && innD > til) { const days = Math.round((new Date(innD) - new Date(til)) / 864e5);
      const per = (P.linur || []).filter(l => l.teg === "leiga").reduce((a, l) => a + (+l.verd || 0) * (+l.magn || 0) * (1 - (+l.afsl || 0) / 100), 0) * (+sg.seint || 1);
      if (days > 0 && per > 0) items.push({ key: "seint", heiti: `Seinkun skila · ${days} ${days === 1 ? "dagur" : "dagar"} (skilað ${dfmt(innD)}, átti ${dfmt(til)})`, verd: Math.round(per * days) }); }
    // Týnt (skannað út, ekki inn) – aðeins eftir skil
    if (["Skilað", "Lokið"].includes(P.stada)) outL.filter(nr => !inL.includes(nr)).forEach(nr => { const f = tr(() => Q().findE(nr), null); if (!f) return; const iv = +f.v.innkaupsverd || 0;
      items.push({ key: "tynt:" + nr, heiti: `Ekki skilað: ${f.v.heiti} (${nr})`, verd: Math.round(iv * (+sg.tynt || 100) / 100), noPrice: !iv }); });
    // Skemmdir skráðar á eintök í pöntuninni frá afhendingu
    VR().forEach(v => (v.skemmdir || []).forEach(s => { if (!outL.includes(s.eintak) || s.lokid) return; const dd = String(s.dags || "").slice(0, 10); if (dd && P.fra && dd < String(P.fra).slice(0, 10)) return;
      const iv = +v.innkaupsverd || 0; items.push({ key: "skemmd:" + (s.id || s.eintak), heiti: `Skemmd: ${v.heiti} (${s.eintak}) – ${s.lysing || ""}`.trim(), verd: Math.round(iv * (+sg.skemmd || 30) / 100), noPrice: !iv }); }));
    return items.map(x => ({ ...x, added: done.has(x.key) }));
  }
  function settleHTML(P) {
    const it = settle(P); if (!it || !it.length) return "";
    const open = it.filter(x => !x.added);
    return `<section class="pfsec pfset"><div class="pfsh"><b>Skilauppgjör</b><span class="${open.length ? "t-amb" : "t-grn"}">${open.length ? open.length + " tillögur að aukagjaldi" : "Allt fært á pöntunina"}</span></div>
      ${it.map(x => `<div class="pfsr${x.added ? " ok" : ""}"><span class="${x.key === "seint" ? "t-amb" : "t-red"}">${E(x.heiti)}</span><b>${x.noPrice ? '<span class="m">verð vantar</span>' : kr(x.verd)}</b>${x.added ? '<span class="t-grn">✓ á pöntun</span>' : ed() ? `<button type="button" class="btn sm" data-pf="sett:${E(P.id)}:${E(x.key)}">Bæta á pöntun</button>` : ""}</div>`).join("")}
      ${open.length > 1 && ed() ? `<div class="pfbb"><button type="button" class="btn primary" data-pf="sett:${E(P.id)}:*">Bæta öllu á pöntunina</button></div>` : ""}</section>`;
  }
  async function settleAdd(pid, key) {
    const P = findP(pid); const it = (settle(P) || []).filter(x => !x.added && (key === "*" || x.key === key)); if (!it.length) return;
    await savePN(pid, Q0 => { Q0.linur = Q0.linur || []; Q0.aukagjold = Q0.aukagjold || [];
      it.forEach(x => { Q0.linur.push({ id: tr(() => gid(), String(Date.now() + Math.random())), v: null, heiti: x.heiti, teg: "sala", hl: "Aukagjöld", magn: 1, ein: "stk.", verd: x.verd || 0, dagar: 1, afsl: 0, aukagjald: true }); Q0.aukagjold.push(x.key); }); });
    toast(it.length === 1 ? "Aukagjald fært á pöntunina" : it.length + " aukagjöld færð á pöntunina"); render();
  }

  /* ---------- 5. Staðgengill við árekstur ---------- */
  function subs(P) {
    const ar = tr(() => A().arekstrar(P), []); if (!ar.length) return null;
    const til = P.til || P.fra, free = (v, fra, t) => (+v.fjoldi || (v.eintok || []).length || 0) - tr(() => A().upptekid(String(v.id), fra, t, P.id).max, 0);
    const out = ar.map(a => { const short = a.need - a.laus;
      const w0 = fold(a.v.heiti).split(/[ ,]+/)[0], p0 = +a.v.leiguverd || 0;
      const base = VR().filter(v => String(v.id) !== String(a.v.id) && (v.tegund || "leiga") === (a.v.tegund || "leiga") && v.tegund !== "pakki" && (A().vDeild ? A().vDeild(v) === A().vDeild(a.v) : true));
      const named = base.filter(v => { const f1 = fold(v.heiti); return f1.split(/[ ,]+/)[0] === w0 || f1.includes(w0); });
      const near = base.filter(v => (v.flokkur || "") === (a.v.flokkur || "") && p0 && +v.leiguverd && Math.abs(+v.leiguverd - p0) / p0 <= .3);
      const alts = (named.length ? named : near).map(v => ({ v, laus: free(v, P.fra, til) })).filter(x => x.laus >= short)
        .sort((x, y) => Math.abs((+x.v.leiguverd || 0) - p0) - Math.abs((+y.v.leiguverd || 0) - p0)).slice(0, 3);
      return { ...a, short, alts }; });
    // Færa pöntunina: −3…+3 dagar þar sem enginn árekstur er
    const shifts = []; [-1, 1, -2, 2, -3, 3].forEach(n => { if (shifts.length >= 2) return; const sh = x => { const t = tr(() => d(String(x).slice(0, 10)), null); if (!t) return null; t.setDate(t.getDate() + n); return isoDay(t); };
      const T2 = { ...P, fra: sh(P.fra), til: sh(til) }; if (!T2.fra || T2.fra < T0()) return; if (!tr(() => A().arekstrar(T2), [1]).length) shifts.push({ n, fra: T2.fra, til: T2.til }); });
    return { out, shifts };
  }
  function subsHTML(P) {
    if (!["Ný", "Staðfest"].includes(P.stada) || !ed()) return ""; const s = subs(P); if (!s) return "";
    return `<section class="pfsec pfsub"><div class="pfsh"><b>Lausnir á árekstri</b></div>
      ${s.out.map(a => `<div class="pfsubr"><span class="t-red">Vantar ${a.short} × ${E(a.v.heiti)}</span>${a.alts.length ? a.alts.map(x => `<button type="button" class="btn sm" data-pf="alt:${E(P.id)}:${E(a.v.id)}:${E(x.v.id)}:${a.short}">Nota ${E(x.v.heiti)} <small>${x.laus} laus</small></button>`).join("") : '<span class="m">Enginn sambærilegur búnaður laus</span>'}</div>`).join("")}
      ${s.shifts.length ? `<div class="pfsubr"><span>Eða færa pöntunina:</span>${s.shifts.map(x => `<button type="button" class="btn sm" data-pf="shift:${E(P.id)}:${x.fra}:${x.til}">${x.n > 0 ? "+" : "−"}${Math.abs(x.n)} ${Math.abs(x.n) === 1 ? "dag" : "daga"} (${dfmt(x.fra)}–${dfmt(x.til)})</button>`).join("")}</div>` : ""}</section>`;
  }
  async function useAlt(pid, fromV, toV, n) {
    const v = findV(toV); if (!v) return;
    await savePN(pid, (Q0) => { const L = Q0.linur || []; let left = +n;
      // minnka línuna (eða línur) með upprunalega búnaðinum
      L.filter(l => String(l.v) === String(fromV) && l.teg === "leiga").forEach(l => { if (left <= 0) return; const k = Math.min(left, +l.magn || 0); l.magn = (+l.magn || 0) - k; left -= k; });
      Q0.linur = L.filter(l => !(String(l.v) === String(fromV) && !(+l.magn > 0)));
      const ex = Q0.linur.find(l => String(l.v) === String(toV) && l.teg === "leiga"); if (ex) ex.magn = (+ex.magn || 0) + +n; else Q0.linur.push({ ...A().lineFrom(v, Q0), magn: +n }); });
    toast(`${n} × ${v.heiti} sett í staðinn`); render();
  }

  /* ---------- 7. Panta aftur og sniðmát ---------- */
  async function newOrder(base, fra, til, afh) {
    const n = +(A().CF().nastaNrP) || 1001, id = tr(() => gid(), String(Date.now())), nr = "P-" + n;
    const P = { id, pontun: true, nr, deild: "blandad", heiti: base.heiti || "Pöntun", vskId: base.vskId || null, vidskiptavinur: base.vidskiptavinur || null, tengilidur: base.tengilidur || null, simi: base.simi || null, netfang: base.netfang || null,
      uppruni: base.uppruni || "annad", ytriNr: null, stadsetning: base.stadsetning || null, fra, til: til || fra, dags: T0(), stada: "Ný", afsl: base.afsl || 0, athugasemd: base.athugasemd || null, linur: [], verkefniId: null, tilbodId: null, afhending: afh || base.afhending || null, afhStadur: base.afhStadur || null };
    P.linur = (base.linur || []).filter(l => !l.aukagjald).map(l => ({ ...l, id: tr(() => gid(), String(Math.random())) }));
    await saveSnapshot(s => { (s.pantanir = s.pantanir || []).push(P); s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), nastaNrP: n + 1 }; });
    toast("Pöntun " + nr + " stofnuð"); try { openDetail("tb:" + id); } catch (e) {} return P;
  }
  function againDlg(base, title) {
    const d0 = T0(), { w, close } = modal(title, `<div class="pfrow"><label>Afhending<input id="pff" type="date" value="${d0}"></label><label>Skil<input id="pft" type="date" value="${d0}"></label></div>
      <div class="pfseg pfseg2" role="group" aria-label="Afhendingarmáti">${[["sent", "Sent"], ["sott", "Sótt"]].map(([v, l]) => `<button type="button" data-v="${v}"${(base.afhending || "sott") === v ? ' aria-pressed="true"' : ""}>${l}</button>`).join("")}</div>
      <p class="pfhint">${(base.linur || []).filter(l => !l.aukagjald).length} línur · ${E(base.vidskiptavinur || base.tengilidur || "")}</p>
      <div class="pfact"><button type="button" class="btn" data-x="1">Hætta við</button><button type="button" class="btn primary" id="pfgo">Stofna pöntun</button></div>`);
    let afh = base.afhending || "sott";
    w.querySelectorAll(".pfseg2 button").forEach(b => b.onclick = () => { afh = b.dataset.v; w.querySelectorAll(".pfseg2 button").forEach(x => x.toggleAttribute("aria-pressed", x === b)); if (b.hasAttribute("aria-pressed")) b.setAttribute("aria-pressed", "true"); });
    w.querySelector("#pff").onchange = e => { const t = w.querySelector("#pft"); if (t.value < e.target.value) t.value = e.target.value; };
    w.querySelector("#pfgo").onclick = async () => { const f = w.querySelector("#pff").value, t = w.querySelector("#pft").value || f; if (!f) return toast("Veldu afhendingardag"); close(); await newOrder(base, f, t, afh); };
  }
  async function saveTemplate(pid) {
    const P = findP(pid); if (!P) return; const heiti = prompt("Heiti sniðmáts", (P.heiti || "Pöntun") + (P.vidskiptavinur ? " · " + P.vidskiptavinur : "")); if (!heiti) return;
    await saveCfg(c => { c.snid = c.snid || []; c.snid.push({ id: tr(() => gid(), String(Date.now())), heiti, vskId: P.vskId || null, vidskiptavinur: P.vidskiptavinur || null, tengilidur: P.tengilidur || null, simi: P.simi || null, netfang: P.netfang || null, heitiP: P.heiti || "", afhending: P.afhending || null, afhStadur: P.afhStadur || null, linur: (P.linur || []).filter(l => !l.aukagjald) }); });
    toast("Sniðmát „" + heiti + "“ vistað");
  }
  function moreHTML(P) {
    if (!ed()) return "";
    return `<div class="pfmore"><button type="button" class="btn sm" data-pf="again:${E(P.id)}">↻ Panta aftur</button><button type="button" class="btn sm" data-pf="tpl:${E(P.id)}">Vista sem sniðmát</button></div>`;
  }

  /* ---------- 4. Pöntun úr pósti (og sniðmát) ---------- */
  const MON = { jan: 0, feb: 1, mar: 2, apr: 3, mai: 4, jun: 5, jul: 6, agu: 7, sep: 8, okt: 9, nov: 10, des: 11 };
  function parseMail(txt) {
    const raw = String(txt || ""), f = " " + fold(raw) + " ", now = new Date(), Y = now.getFullYear(), r = { linur: [] };
    const em = raw.match(/[\w.+-]+@[\w-]+\.[\w.-]+/); if (em) r.netfang = em[0];
    const ph = raw.match(/(?:\+354[\s-]?)?\b([4-8]\d{2})[\s-]?(\d{4})\b/); if (ph) r.simi = ph[1] + "-" + ph[2];
    // Dagsetningar: „24.–25. okt“, „24. og 25. október“, „24.10–26.10“, „24/10“
    let m; const mk = (dd, mm, yy) => { const x = new Date(+(yy || Y), mm, +dd); if (!yy && x < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)) x.setFullYear(x.getFullYear() + 1); return tr(() => isoDay(x), null); };
    if ((m = f.match(/\b(\d{1,2})\.?\s*(?:-|–|til|og)\s*(\d{1,2})\.?\s*(jan|feb|mar|apr|mai|jun|jul|agu|sep|okt|nov|des)[a-z]*\b/))) { r.fra = mk(m[1], MON[m[3]]); r.til = mk(m[2], MON[m[3]]); }
    else if ((m = f.match(/\b(\d{1,2})[./](\d{1,2})\.?(?:[./](\d{2,4}))?\s*(?:-|–|til)\s*(\d{1,2})[./](\d{1,2})/))) { r.fra = mk(m[1], +m[2] - 1); r.til = mk(m[4], +m[5] - 1); }
    else if ((m = f.match(/\b(\d{1,2})\.?\s*(jan|feb|mar|apr|mai|jun|jul|agu|sep|okt|nov|des)[a-z]*\b/))) { r.fra = r.til = mk(m[1], MON[m[2]]); }
    else if ((m = f.match(/\b(\d{1,2})[./](\d{1,2})\b/))) { r.fra = r.til = mk(m[1], +m[2] - 1); }
    if (/\bsott\b|\bsaekj|\bsaekja\b|\bkem og/.test(f)) r.afhending = "sott"; else if (/\bsend|\bkeyr|\bheimsend|\bafhent a\b|\bkoma med\b/.test(f)) r.afhending = "sent";
    // Viðskiptavinur
    const vs = tr(() => vskList(), []) || []; let bc = null, bs = 0;
    vs.forEach(c => { const n = fold(c.name); if (n.length >= 4 && f.includes(" " + n.split(" ")[0])) { const sc = n.split(" ").filter(w => w.length > 2 && f.includes(w)).length; if (sc > bs) { bs = sc; bc = c; } } });
    if (bc) { r.vskId = bc.id; r.vidskiptavinur = bc.name; r.tengilidur = r.tengilidur || bc.tengilidur; r.simi = r.simi || bc.simi; r.netfang = r.netfang || bc.netfang; }
    // Nafn úr kveðju: „Kv. Sigga“, „Bestu kveðjur,\nJón Jónsson“
    const kv = raw.match(/(?:[Kk]v\.?|[Kk]ve[ðd]j[a-z]*|[Tt]akk[^\n]*)[,\s]*\n?\s*([A-ZÁÐÉÍÓÚÝÞÆÖ][a-záðéíóúýþæö]+(?:\s[A-ZÁÐÉÍÓÚÝÞÆÖ][a-záðéíóúýþæö]+)?)/); if (kv) r.tengilidur = kv[1];
    // Vörur: magn + heiti (eða heiti + x magn) parað við vörulista leigu og sölu
    const words = f.split(/\s+/);
    VR().filter(v => v.tegund !== "vinna").forEach(v => { const names = [v.heiti, v.nr].filter(Boolean).map(fold); let hit = null;
      names.forEach(nm => { const ws = nm.split(/[^a-z0-9-]+/).filter(w => w.length >= 3); if (!ws.length) return; const stem = ws[0].slice(0, Math.max(4, ws[0].length - 2));
        for (let i = 0; i < words.length; i++) { if (!words[i].startsWith(stem)) continue; if (ws.length > 1 && !ws.slice(1).every(w => words.slice(i + 1, i + 4).some(x => x.startsWith(w.slice(0, Math.max(3, w.length - 2)))))) continue;
          const prev = (words[i - 1] || "").replace(/[^0-9x×]/g, ""), next = (words[i + ws.length] || ""), q = /^\d+$/.test(prev) ? +prev : /^\d+x$|^\d+×$/.test(prev) ? parseInt(prev) : /^x?\d+$/.test(next.replace(/[×x]/, "")) && /[x×]/.test(next) ? parseInt(next.replace(/[^0-9]/g, "")) : 1;
          hit = { v, magn: q || 1 }; break; } });
      if (hit && !r.linur.some(l => String(l.v.id) === String(v.id))) r.linur.push(hit); });
    // Ef bæði „hátalari“ og „hátalari með magnara“ passa: halda lengra heitinu
    r.linur = r.linur.filter(l => !r.linur.some(o => o !== l && fold(o.v.heiti).startsWith(fold(l.v.heiti)) && fold(o.v.heiti).length > fold(l.v.heiti).length));
    const first = raw.split("\n").map(x => x.trim()).find(x => x.length > 8 && !/^(hæ|hi|sæl|góðan|halló)/i.test(x)); r.heiti = (first || (r.linur.length ? r.linur.map(l => (l.magn > 1 ? l.magn + " × " : "") + l.v.heiti).join(", ") : "Pöntun úr pósti")).slice(0, 60);
    return r;
  }
  function mailDlg() {
    const snid = (CFP().snid || []);
    const { w, close } = modal("Ný pöntun úr pósti eða sniðmáti", `
      ${snid.length ? `<div class="pfsh2">Sniðmát</div><div class="pftpl">${snid.map(s => `<button type="button" class="btn sm" data-tpl="${E(s.id)}">${E(s.heiti)} <small>${(s.linur || []).length} línur</small></button>`).join("")}</div><div class="pfsh2">Eða úr pósti</div>` : ""}
      <textarea id="pfmail" rows="7" placeholder="Límdu póstinn hér, t.d. „Sæl, getum við fengið 2 hátalara og mixer 24.–25. okt? Við sækjum. Kv. Sigga, s. 555 1234“"></textarea>
      <div id="pfmp" class="pfmp"></div>
      <div class="pfact"><button type="button" class="btn" data-x="1">Hætta við</button><button type="button" class="btn primary" id="pfmgo" disabled>Búa til drög að pöntun</button></div>`, true);
    let R = null;
    const draw = () => { const t = w.querySelector("#pfmail").value; R = t.trim() ? parseMail(t) : null; const go = w.querySelector("#pfmgo"); go.disabled = !R;
      w.querySelector("#pfmp").innerHTML = !R ? "" : `<div class="pfmg"><span>Viðskiptavinur</span><b class="${R.vidskiptavinur ? "" : "m"}">${E(R.vidskiptavinur || "– fannst ekki –")}</b>
        <span>Tengiliður</span><b>${E([R.tengilidur, R.simi, R.netfang].filter(Boolean).join(" · ") || "–")}</b>
        <span>Dagsetning</span><b class="${R.fra ? "" : "t-amb"}">${R.fra ? E(dfmt(R.fra) + (R.til && R.til !== R.fra ? " – " + dfmt(R.til) : "")) : "fannst ekki – veldu í næsta skrefi"}</b>
        <span>Afhending</span><b>${R.afhending === "sott" ? "Sótt" : R.afhending === "sent" ? "Sent" : "–"}</b></div>
        <div class="pfml">${R.linur.length ? R.linur.map((l, i) => `<label class="pfmlr"><input type="checkbox" checked data-i="${i}"><input type="number" min="1" value="${l.magn}" data-q="${i}" aria-label="Magn"><span>${E(l.v.heiti)} <small>${E(l.v.nr || "")}</small></span></label>`).join("") : '<span class="t-amb">Engar vörur úr vörulistanum fundust – þú bætir línum við á pöntuninni.</span>'}</div>`; };
    w.querySelector("#pfmail").addEventListener("input", draw);
    w.querySelectorAll("[data-tpl]").forEach(b => b.onclick = () => { const s = snid.find(x => x.id === b.dataset.tpl); close(); againDlg({ ...s, heiti: s.heitiP || s.heiti, uppruni: "annad" }, "Pöntun úr sniðmáti · " + s.heiti); });
    w.querySelector("#pfmgo").onclick = async () => { if (!R) return;
      const keep = [...w.querySelectorAll(".pfmlr")].map(x => { const i = +x.querySelector("[data-i]").dataset.i; return x.querySelector("[data-i]").checked ? { v: R.linur[i].v, magn: +x.querySelector("[data-q]").value || 1 } : null; }).filter(Boolean);
      close(); const base = { ...R, uppruni: "postur", linur: [] };
      const P = await newOrder(base, R.fra || T0(), R.til || R.fra || T0(), R.afhending);
      if (keep.length) await savePN(P.id, Q0 => { Q0.linur = keep.map(k => ({ ...A().lineFrom(k.v, Q0), magn: k.magn })); });
      render(); };
    setTimeout(() => w.querySelector("#pfmail").focus(), 50);
  }
  window.pfMailDlg = mailDlg; window.pfParseMail = parseMail;

  /* ---------- 6. Ferð dagsins ---------- */
  function ferdHTML() {
    if (!FERD()) return "";
    const t = T0(), xs = [];
    PN().forEach(P => { const fra = String(P.fra || "").slice(0, 10), til = String(P.til || P.fra || "").slice(0, 10);
      if (fra === t && ["Ný", "Staðfest"].includes(P.stada)) xs.push({ P, k: AFH(P) === "sott" ? "Sækir" : "Afhenda", kl: P.afhKl || "", adr: AFH(P) === "sent" ? (P.afhStadur || P.stadsetning || "") : "" });
      if (til === t && P.stada === "Afhent") xs.push({ P, k: AFH(P) === "sent" ? "Sækja" : "Skilar", kl: "", adr: AFH(P) === "sent" ? (P.afhStadur || P.stadsetning || "") : "" }); });
    xs.sort((a, b) => (a.kl || "99").localeCompare(b.kl || "99"));
    const stops = xs.filter(x => x.adr).map(x => x.adr);
    const maps = stops.length ? "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + encodeURIComponent(stops[stops.length - 1]) + (stops.length > 1 ? "&waypoints=" + encodeURIComponent(stops.slice(0, -1).join("|")) : "") : "";
    return `<section class="card ucard pfferd"><div class="uhch"><h3>Ferð dagsins <span class="m">${xs.length}</span></h3>${maps ? `<a href="${maps}" target="_blank" rel="noopener">Opna leið í Google Maps →</a>` : ""}</div>
      ${xs.length ? xs.map((x, i) => `<div class="pfr" data-open="tb:${E(x.P.id)}" role="button" tabindex="0"><span class="pfrn">${x.adr ? i + 1 : "–"}</span><span class="pfrx"><b>${E(x.P.nr)} ${E(x.P.heiti || "")}</b><small>${E([x.adr || "Á staðnum", x.P.tengilidur || x.P.vidskiptavinur, x.P.simi].filter(Boolean).join(" · "))}</small></span><span class="pfrk ${/Afhenda|Sækja/.test(x.k) ? "t-blu" : "t-amb"}">${E(x.k)}${x.kl ? " · " + E(x.kl) : ""}</span></div>`).join("") : `<div class="uempty">Engar afhendingar eða skil í dag.</div>`}</section>`;
  }

  /* ---------- Stillingar › Pantanir ---------- */
  function settingsHTML() {
    const sg = SG(), sh = CFP().shopify || {}, sn = CFP().snid || [];
    const sw = (on, js, lab) => `<label class="snjsw" title="${E(lab)}"><input type="checkbox"${on ? " checked" : ""} onchange="${js}" aria-label="${E(lab)}"><i></i></label>`;
    const num = (k, v, unit) => `<input class="snjnum" type="number" min="0" value="${E(v)}" onchange="pfSet('sg','${k}',this.value)"><span class="snju">${unit}</span>`;
    return `<div class="viewtitle">Skilauppgjör</div><div class="snjset">
      <div class="snjsr"><div class="snjsc">${sw(sg.on, "pfSet('sg','on',this.checked)", "Skilauppgjör")}</div><div class="snjst"><b>Tillögur að aukagjaldi við skil</b><small>Seinkun, týnd og skemmd eintök – birtist á pöntun eftir skil</small></div><div class="snjso"></div></div>
      ${sg.on ? `<div class="snjsr"><div class="snjsc"></div><div class="snjst"><b>Seinkun</b><small>Leiguverð á dag × dagar sem skil eru sein</small></div><div class="snjso snjlim">${num("seint", sg.seint, "× dagsverð")}</div></div>
      <div class="snjsr"><div class="snjsc"></div><div class="snjst"><b>Týnt eintak</b><small>Hlutfall af innkaupsverði</small></div><div class="snjso snjlim">${num("tynt", sg.tynt, "% af innkaupsverði")}</div></div>
      <div class="snjsr"><div class="snjsc"></div><div class="snjst"><b>Skemmt eintak</b><small>Hlutfall af innkaupsverði – breytanlegt á pöntun</small></div><div class="snjso snjlim">${num("skemmd", sg.skemmd, "% af innkaupsverði")}</div></div>` : ""}</div>
      <div class="viewtitle">Ferð dagsins</div><div class="snjset"><div class="snjsr"><div class="snjsc">${sw(FERD(), "pfSet('ferd','on',this.checked)", "Ferð dagsins")}</div><div class="snjst"><b>Ferð dagsins á Pantanir › Yfirlit</b><small>Afhendingar og sóttar pantanir dagsins í röð, með leið í Google Maps</small></div><div class="snjso"></div></div></div>
      <div class="viewtitle">Sniðmát</div><div class="snjset">${sn.length ? sn.map(s => `<div class="snjsr"><div class="snjsc"></div><div class="snjst"><b>${E(s.heiti)}</b><small>${(s.linur || []).length} línur${s.vidskiptavinur ? " · " + E(s.vidskiptavinur) : ""}</small></div><div class="snjso"><button type="button" class="btn sm" onclick="pfSet('snidDel','${E(s.id)}')">Eyða</button></div></div>`).join("") : `<div class="snjsr"><div class="snjsc"></div><div class="snjst"><small>Engin sniðmát. Opnaðu pöntun og veldu „Vista sem sniðmát“.</small></div><div class="snjso"></div></div>`}</div>
      <div class="viewtitle">Vefverslun</div><div class="snjset"><div class="snjsr"><div class="snjsc"><span class="pfshop">S</span></div><div class="snjst"><b>Shopify ${sh.virk ? '<span class="t-grn">· tengt</span>' : '<span class="m">· ekki tengt</span>'}</b><small>Pantanir úr vefversluninni detta sjálfkrafa inn í Pantanir (uppruni Shopify) og eru staðfestar ef búnaðurinn er laus.</small></div><div class="snjso"><button type="button" class="btn sm" onclick="pfShopify()">${sh.verslun ? "Stillingar" : "Tengja"}</button></div></div></div>`;
  }
  window.pfSet = (g, k, v) => { saveCfg(c => {
    if (g === "sg") { c.skilagjold = { ...(c.skilagjold || {}), [k]: k === "on" ? !!v : (parseFloat(String(v).replace(",", ".")) || 0) }; }
    if (g === "ferd") c.ferd = { ...(c.ferd || {}), on: !!v };
    if (g === "snidDel") c.snid = (c.snid || []).filter(x => x.id !== k);
  }).then(() => render()).catch(e => toast("Tókst ekki: " + (e?.message || e))); };
  window.pfShopify = () => { const sh = CFP().shopify || {};
    const { w, close } = modal("Tengja Shopify", `<p class="pfhint">Pantanir úr Shopify-versluninni verða sjálfkrafa að pöntunum hér, með Shopify-númerinu og uppruna „Shopify“. Til að virkja þarf litla þjónustu sem tekur við tilkynningum frá Shopify (webhook) – hún er sett upp þegar Firebase-verkefnið er komið á Blaze-áskrift.</p>
      <label>Slóð verslunar<input id="pfsv" value="${E(sh.verslun || "")}" placeholder="dæmi.myshopify.com"></label>
      <ol class="pfsteps"><li>Skráðu slóð verslunarinnar og vistaðu.</li><li>Þegar tengingin er virkjuð birtist hér slóð fyrir webhook sem þú límir í Shopify › Settings › Notifications › Webhooks (Order creation).</li><li>Prófunarpöntun í Shopify birtist þá í Pantanir.</li></ol>
      <div class="pfact"><button type="button" class="btn" data-x="1">Loka</button><button type="button" class="btn primary" id="pfsvs">Vista</button></div>`);
    w.querySelector("#pfsvs").onclick = () => { const v = w.querySelector("#pfsv").value.trim(); saveCfg(c => { c.shopify = { ...(c.shopify || {}), verslun: v, virk: false }; }).then(() => { close(); toast("Shopify-verslun skráð – tengingin verður virkjuð síðar"); render(); }); }; };
  const addPage = () => { if (typeof STPAGES === "undefined") return false; STPAGES.pferli = { l: "Pantanir", d: "Skilauppgjör, ferð dagsins, sniðmát og tenging við vefverslun", s: ["Skilauppgjör", "Ferð dagsins", "Sniðmát", "Shopify", "Vefverslun"], adm: 1, fn: () => settingsHTML() }; return true; };
  if (!addPage()) { const iv = setInterval(() => { if (addPage()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }


  /* ---------- 8. Pöntunarsíða viðskiptavinar (2.56.0) ----------
     opinber/{t}: afrit pöntunarinnar sem viðskiptavinurinn sér á /pontun/?o=<uppsetning>&t=<t> án innskráningar; hann getur staðfest
     með nafni og undirskrift einu sinni (Firestore-reglur leyfa aðeins það). Appið uppfærir afritið þegar pöntunin breytist og
     setur pöntunina í „Staðfest“ þegar viðskiptavinurinn hefur staðfest. Í sýniútgáfu er afritið líka í localStorage svo síðan virki. */
  const DEMO = () => !!window.AERA_DEMO;
  const instKey = () => { const seg = location.pathname.replace(/index\.html$/, "").split("/").filter(Boolean); return seg[seg.length - 1] || "aera"; };
  const pubUrl = t => { const seg = location.pathname.replace(/index\.html$/, "").split("/").filter(Boolean); seg.pop(); return location.origin + "/" + seg.map(x => x + "/").join("") + "pontun/?o=" + encodeURIComponent(instKey()) + "&t=" + encodeURIComponent(t) + (DEMO() ? "&demo" : ""); };
  const newTok = () => { const a = new Uint8Array(18); crypto.getRandomValues(a); return [...a].map(b => b.toString(36).padStart(2, "0")).join("").slice(0, 26); };
  const PUB = {}, WATCHED = new Set(), LAST = {};
  function snapOf(P) {
    const t = tr(() => A().totals ? null : null, null), tt = tr(() => window.tbTotals(P), null), co = tr(() => DOK.co(), {}) || {}, C = tr(() => CFG().tilbod, {}) || {};
    return { o: instKey(), nr: P.nr || "", heiti: P.heiti || "", stada: P.stada || "", fra: P.fra || null, til: P.til || P.fra || null, afhending: P.afhending || null, afhStadur: P.afhending === "sent" ? (P.afhStadur || P.stadsetning || null) : null, afhKl: P.afhKl || null,
      tengilidur: P.tengilidur || null, vidskiptavinur: P.vidskiptavinur || null,
      linur: (P.linur || []).map(l => ({ heiti: l.heiti || "", magn: +l.magn || 0, ein: l.ein || "", teg: l.teg || "", dagar: l.teg === "leiga" ? (+l.dagar || null) : null, upph: Math.round(tr(() => window.salaAPI.lSum(l, P), 0)) })),
      samtals: tt ? { net: tt.net, vsk: tt.vsk, tot: tt.tot, afsl: tt.afsl } : null, skilmalar: C.skilmalarL || null,
      fyrirtaeki: { nafn: co.nafn || tr(() => ORG.nafn, ""), simi: co.simi || "", netfang: co.netfang || "", vefur: co.vefur || "", merki: tr(() => ORG.docLogo, "") || "icons/doc-logo.png" } };
  }
  const lsKey = t => "atrium-opinber:" + t;
  // Raunverulega localStorage (sýniútgáfan skiptir því út fyrir sessionStorage á hverjum flipa) – svo síðan í öðrum flipa sjái afritið
  let LSF = null;
  const LS = () => { try { if (!LSF) { LSF = document.createElement("iframe"); LSF.hidden = true; LSF.setAttribute("aria-hidden", "true"); document.body.append(LSF); } return LSF.contentWindow.localStorage; } catch (e) { return window.localStorage; } };
  async function pubWrite(t, data) {
    const cur = PUB[t] || {}; const doc = { ...data, stadfest: cur.stadfest || null, postur: cur.postur || null, uppfaert: nowIso() };
    if (DEMO()) { try { const old = JSON.parse(LS().getItem(lsKey(t)) || "null"); if (old?.stadfest) doc.stadfest = old.stadfest; if (old?.postur) doc.postur = old.postur; LS().setItem(lsKey(t), JSON.stringify(doc)); } catch (e) {} PUB[t] = doc; return; }
    if (!window.__DB) throw new Error("Ekki tengt gagnagrunni"); await window.__DB.set("opinber/" + t, doc); PUB[t] = doc;
  }
  function pubWatch(t, pid) {
    if (WATCHED.has(t)) return; WATCHED.add(t);
    const got = d => { if (!d) return; PUB[t] = d; const P = findP(pid); if (!P) return;
      if (d.stadfest && !d.postur && ed()) mailConfirm(t, pid).catch(e => console.warn("staðfestingarpóstur", e));
      if (d.stadfest && !P.vidskStadfest && ed()) savePN(pid, Q0 => { Q0.vidskStadfest = d.stadfest; if (Q0.stada === "Ný") Q0.stada = "Staðfest"; }).then(() => { toast((P.nr || "Pöntun") + " staðfest af " + d.stadfest.nafn); render(); }).catch(() => {}); };
    if (DEMO()) { const rd = () => { try { got(JSON.parse(LS().getItem(lsKey(t)) || "null")); } catch (e) {} }; rd(); window.addEventListener("storage", e => { if (e.key === lsKey(t)) rd(); }); setInterval(rd, 4000); return; }
    window.__DB?.watch?.("opinber/" + t, s => got(s.exists ? s.data() : null), () => {});
  }
  /* Staðfestingarpóstur (2.57.0): sá sem fyrstur nemur staðfestingu viðskiptavinar (með Microsoft-tengingu) tekur sendinguna frá
     á opinber/{t}.postur í færslu (transaction) og sendir – aðrir sjá að hún er tekin og senda ekki. Þegar Blaze kemur sendir þjónusta í staðinn. */
  const msOn = () => tr(() => !!(window.MS && MS.on && MS.on()), false);
  const box = () => { const sh = String(tr(() => ORG.postholf, "") || "").trim().toLowerCase(); return sh ? "/users/" + encodeURIComponent(sh) : "/me"; };
  const b64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const SENDING = new Set();
  async function mailConfirm(t, pid, manual) {
    const P = findP(pid); if (!P || SENDING.has(t)) return; const to = P.netfang || tr(() => findVsk(P.vskId)?.netfang, ""); if (!to) return;
    if (!DEMO() && !msOn()) return;   // annar með Microsoft-tengingu sendir, eða „Senda núna“ seinna
    SENDING.add(t);
    try {
      const mark = { af: me(), dags: nowIso(), til: to };
      let won = false;
      if (DEMO()) { const cur = JSON.parse(LS().getItem(lsKey(t)) || "null"); if (cur && (!cur.postur || manual)) { cur.postur = mark; LS().setItem(lsKey(t), JSON.stringify(cur)); won = true; } }
      else { const out = await window.__DB.tx("opinber/" + t, cur => (cur.postur && !manual) ? cur : { ...cur, postur: mark }); won = out?.postur?.dags === mark.dags && out?.postur?.af === mark.af; }
      if (!won) return;
      PUB[t] = { ...(PUB[t] || {}), postur: mark };
      const st = P.vidskStadfest || PUB[t]?.stadfest || {}, co = tr(() => DOK.co(), {}) || {};
      const subj = `Staðfesting á pöntun ${P.nr} – ${P.heiti || ""}`.trim();
      const html = `<p>Sæl/l${st.nafn ? " " + E(String(st.nafn).split(" ")[0]) : ""},</p><p>Takk fyrir – pöntun <b>${E(P.nr)}</b> (${E(P.heiti || "")}) er staðfest.</p>
        <p>Afhending: ${E(dfmt(P.fra))}${P.afhKl ? " kl. " + E(P.afhKl) : ""} · Skil: ${E(dfmt(P.til || P.fra))} · ${P.afhending === "sent" ? "Sent" + (P.afhStadur ? " á " + E(P.afhStadur) : "") : P.afhending === "sott" ? "Sótt" : ""}</p>
        <p>Staðfest af ${E(st.nafn || "")} ${st.dags ? E(dfmt(st.dags)) + " kl. " + E(String(st.dags).slice(11, 16)) : ""}.${st.athugasemd ? "<br>Athugasemd: „" + E(st.athugasemd) + "“" : ""}</p>
        <p>Pöntunin er í viðhengi. Þú getur alltaf skoðað hana hér: <a href="${E(pubUrl(t))}">${E(pubUrl(t))}</a></p><p>Kveðja,<br>${E(co.nafn || "")}${co.simi ? "<br>" + E(co.simi) : ""}</p>`;
      if (DEMO()) { toast(`(Sýniútgáfa) Staðfestingarpóstur hefði farið til ${to}`); }
      else {
        const bytes = await window.tbPdfBytes(P);
        await MS.g(box() + "/sendMail", { method: "POST", body: { message: { subject: subj, body: { contentType: "HTML", content: html }, toRecipients: [{ emailAddress: { address: to } }],
          attachments: [{ "@odata.type": "#microsoft.graph.fileAttachment", name: `Pöntun ${P.nr}.pdf`, contentType: "application/pdf", contentBytes: b64(bytes) }] }, saveToSentItems: true } });
        toast("Staðfestingarpóstur sendur til " + to);
      }
      await savePN(pid, Q0 => { Q0.stadfPostur = mark; });
      render();
    } catch (e) {
      toast("Staðfestingarpóstur tókst ekki: " + (e?.message || e));
      try { if (!DEMO()) await window.__DB.tx("opinber/" + t, cur => ({ ...cur, postur: null })); } catch (x) {}   // losa svo annar geti reynt
    } finally { SENDING.delete(t); }
  }
  function pubSync(P) {
    if (!P.opinber || !ed()) return; pubWatch(P.opinber, P.id);
    const j = JSON.stringify(snapOf(P)); if (LAST[P.opinber] === j) return; LAST[P.opinber] = j;
    pubWrite(P.opinber, JSON.parse(j)).catch(e => console.warn("opinber", e));
  }
  async function pubCreate(pid) {
    const P = findP(pid); if (!P) return; const t = newTok();
    try { await pubWrite(t, snapOf(P)); await savePN(pid, Q0 => { Q0.opinber = t; }); LAST[t] = JSON.stringify(snapOf(findP(pid) || P)); toast("Pöntunarsíða búin til"); render(); }
    catch (e) { toast("Tókst ekki: " + (e?.message || e) + (String(e?.code || "").includes("permission") ? " – birta þarf nýjar Firestore-reglur" : "")); }
  }
  async function pubRevoke(pid) {
    const P = findP(pid); if (!P?.opinber || !confirm("Loka pöntunarsíðunni? Tengillinn hættir að virka.")) return; const t = P.opinber;
    try { if (DEMO()) LS().removeItem(lsKey(t)); else await window.__DB?.commit?.([{ path: "opinber/" + t, del: true }]); } catch (e) {}
    await savePN(pid, Q0 => { delete Q0.opinber; }); delete PUB[t]; toast("Pöntunarsíðu lokað"); render();
  }
  function pubSend(pid) {
    const P = findP(pid); if (!P?.opinber) return; const url = pubUrl(P.opinber), co = tr(() => DOK.co().nafn, "") || tr(() => ORG.nafn, "");
    const subj = `Pöntun ${P.nr} – ${P.heiti || ""}`.trim(), body = `Sæl/l${P.tengilidur ? " " + P.tengilidur.split(" ")[0] : ""},\n\nHér getur þú séð pöntunina og staðfest hana:\n${url}\n\nKveðja,\n${co}`;
    if (window.poCompose && tr(() => MS.on(), false)) { try { poCompose({ to: P.netfang || "", subject: subj, body }); return; } catch (e) {} }
    location.href = "mailto:" + encodeURIComponent(P.netfang || "") + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(body);
  }
  function pubHTML(P) {
    if (!ed() && !P.opinber) return "";
    const v = P.vidskStadfest || PUB[P.opinber]?.stadfest;
    if (!P.opinber) return `<section class="pfsec pfpub"><div class="pfsh"><b>Pöntunarsíða</b><span>Viðskiptavinurinn sér pöntunina og staðfestir með undirskrift</span><button type="button" class="btn sm" data-pf="pub:${E(P.id)}">Búa til tengil</button></div></section>`;
    const url = pubUrl(P.opinber);
    return `<section class="pfsec pfpub"><div class="pfsh"><b>Pöntunarsíða</b>${v ? `<span class="t-grn">✓ Staðfest af ${E(v.nafn)} · ${E(dfmt(v.dags))} kl. ${E(String(v.dags).slice(11, 16))}</span>` : `<span class="t-amb">Bíður staðfestingar viðskiptavinar</span>`}</div>
      <div class="pfurl"><input readonly value="${E(url)}" aria-label="Tengill á pöntunarsíðu" onclick="this.select()"><button type="button" class="btn sm" data-pf="pubcopy:${E(P.id)}">Afrita</button><a class="btn sm" href="${E(url)}" target="_blank" rel="noopener">Opna</a></div>
      ${v?.athugasemd ? `<p class="pfhint">Athugasemd viðskiptavinar: „${E(v.athugasemd)}“</p>` : ""}
      ${v ? (() => { const pm = P.stadfPostur || PUB[P.opinber]?.postur, to = P.netfang || tr(() => findVsk(P.vskId)?.netfang, "");
        return pm ? `<p class="pfhint"><span class="t-grn">✓ Staðfestingarpóstur sendur</span> til ${E(pm.til || to)} · ${E(dfmt(pm.dags))} kl. ${E(String(pm.dags).slice(11, 16))}</p>`
          : !to ? `<p class="pfhint"><span class="t-amb">Ekkert netfang á pöntuninni</span> – staðfestingarpóstur fór ekki.</p>`
          : `<p class="pfhint"><span class="t-amb">Staðfestingarpóstur ekki farinn</span> – ${msOn() || DEMO() ? "" : "sendist þegar einhver með Microsoft-tengingu opnar appið. "}${ed() && (msOn() || DEMO()) ? `<button type="button" class="pflink" data-pf="pubmail:${E(P.id)}">Senda núna</button>` : ""}</p>`; })() : ""}
      ${ed() ? `<div class="pfbb"><button type="button" class="btn${v ? "" : " primary"}" data-pf="pubsend:${E(P.id)}">Senda í tölvupósti${P.netfang ? " · " + E(P.netfang) : ""}</button><button type="button" class="btn" data-pf="pubrev:${E(P.id)}">Loka síðunni</button></div>` : ""}</section>`;
  }

  /* ---------- Tengt inn í appið ---------- */
  document.addEventListener("click", e => {
    if (!on()) return; const b = e.target.closest("[data-pf]"); if (!b) return; e.preventDefault(); e.stopPropagation();
    const [op, id, a, c, n] = b.dataset.pf.split(":");
    if (op === "pick") return pickScan(id);
    if (op === "kv") return kvittun(id, a);
    if (op === "pdf") return sedill(id, a);
    if (op === "afh") return savePN(id, P => { P.afhending = a; }).then(render);
    if (op === "sett") return settleAdd(id, b.dataset.pf.split(":").slice(2).join(":"));
    if (op === "alt") return useAlt(id, a, c, n);
    if (op === "shift") return savePN(id, P => { P.fra = a; P.til = c; }).then(() => { toast("Pöntunin færð " + dfmt(a) + "–" + dfmt(c)); render(); });
    if (op === "again") { const P = findP(id); if (P) againDlg(P, "Panta aftur · " + P.nr); return; }
    if (op === "tpl") return saveTemplate(id);
    if (op === "mail") return mailDlg();
    if (op === "pub") return pubCreate(id);
    if (op === "pubrev") return pubRevoke(id);
    if (op === "pubmail") { const P = findP(id); if (P?.opinber) return mailConfirm(P.opinber, id, true); return; }
    if (op === "pubsend") return pubSend(id);
    if (op === "pubcopy") { const P = findP(id); if (P?.opinber) navigator.clipboard?.writeText(pubUrl(P.opinber)).then(() => toast("Tengill afritaður")); return; }
  }, true);
  document.addEventListener("change", e => { if (!on()) return; const i = e.target.closest("[data-pfs]"); if (!i) return; const [k, id] = i.dataset.pfs.split(":"); let v = i.value.trim();
    if (k === "afhKl" && v) { const m = v.match(/^(\d{1,2})[:.]?(\d{2})?$/); if (m) v = String(m[1]).padStart(2, "0") + ":" + (m[2] || "00"); }
    savePN(id, P => { P[k] = v || null; }).then(() => toast("Vistað")).catch(() => {}); });

  function decorate() {
    if (!on()) return; let D = null, t = ""; try { D = DETAIL; t = tab; } catch (e) {}
    if (ed()) PN().forEach(P => { if (P.opinber && !P.vidskStadfest) pubWatch(P.opinber, P.id); });
    const root = document.getElementById("view"); if (!root) return;
    if (D && String(D).startsWith("tb:")) { const P = findP(String(D).slice(3)); if (!P || !P.pontun) return; const host = root.querySelector(".spdet") || root; if (host.querySelector(".pfwrap")) return;
      try { pubSync(P); } catch (e) {}
      const html = `<div class="pfwrap">${subsHTML(P)}${pubHTML(P)}${afhHTML(P)}${pickHTML(P)}${settleHTML(P)}${moreHTML(P)}</div>`;
      const anchor = host.querySelector(".qrbox") || host.querySelector(".utb") || [...host.querySelectorAll(".viewtitle")].find(x => /^Línur/.test(x.textContent.trim()));
      anchor ? anchor.insertAdjacentHTML("beforebegin", html) : host.insertAdjacentHTML("beforeend", html); return; }
    if (!D && /^(pnyf|pantanir|pnl|pns|pnt)$/.test(t)) {
      const ph = root.querySelector(".phead .phrow, .uhead"), nb = ph && (ph.querySelector('[data-act^="fabnew"]') || ph.querySelector(".btn.primary"));
      if (nb && ed() && !root.querySelector('[data-pf="mail"]')) nb.insertAdjacentHTML("beforebegin", `<button type="button" class="btn pfmailb" data-pf="mail:" title="Ný pöntun úr pósti eða sniðmáti">Úr pósti / sniðmáti</button>`);
      if (t === "pnyf" && FERD() && !root.querySelector(".pfferd")) { const at = root.querySelector(".uh3") || root.querySelector(".foot") ; const h = ferdHTML(); at ? at.insertAdjacentHTML("beforebegin", h) : root.insertAdjacentHTML("beforeend", h); }
    }
  }
  const r0 = render; render = function () { const x = r0.apply(this, arguments); try { decorate(); } catch (e) { console.warn("pferli", e); } return x; };
})();
