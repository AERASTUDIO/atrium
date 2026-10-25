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
  // 2.74.0: staðfestingartengill sendur sjálfkrafa (netþjónn) ef starfsmaður hefur ekki sent hann innan klst fresti
  const TENG = () => { const t = CFP().tengill || {}; return { on: t.on !== false, klst: +t.klst > 0 ? +t.klst : 2, fyrir: +t.fyrir > 0 ? +t.fyrir : 12 }; };
  const SIGREQ = () => (CFP().undirskrift || {}).krafa !== false;   // sjálfgefið: undirskrift krafist við afhendingu
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
    return `<section class="pfsec pfpick${allDone ? " done" : ""}"><div class="pfsh"><b>Pökkunarlisti</b><span class="${allDone ? "t-grn" : ""}">${s.done} af ${s.tot}${allDone ? " · allt komið" : ""}</span>
      ${ed() && !["Skilað", "Lokið"].includes(P.stada) ? `<button type="button" class="btn sm" data-pf="pick:${E(P.id)}">${ICO.scan}Pakka með skanna</button>` : ""}</div>
      ${s.rows.map(r => `<div class="pfpr${r.got >= r.magn ? " ok" : r.got ? " part" : ""}"><span class="pfck">${r.got >= r.magn ? "✓" : ""}</span><span class="pfpn"><b>${E(r.heiti)}</b><small>${E(r.nr)}${r.hillur.length ? " · hilla " + E(r.hillur.slice(0, 3).join(", ")) : ""}${r.nrs.length ? " · " + E(r.nrs.join(", ")) : ""}</small></span><span class="pfpq">${r.got} / ${r.magn}</span></div>`).join("")}</section>`;
  }
  function pickScan(pid) {
    const P0 = findP(pid); if (!P0 || !Q()) return;
    const panel = () => { const P = findP(pid) || P0, s = pickState(P);
      return `<div class="qrprog"><div><b>${s.done} af ${s.tot}</b> pakkað</div><div class="qrbar"><i style="width:${s.tot ? Math.round(s.done / s.tot * 100) : 0}%"></i></div></div>
        <div class="qrlist">${s.rows.map(r => `<div class="qrli${r.got >= r.magn ? " full" : ""}"><span class="qrck" aria-hidden="true">${r.got >= r.magn ? "✓" : ""}</span><span class="qrnm"><b>${E(r.heiti)}</b><small>${E(r.nr)}${r.eint ? "" : " · engin eintök – talið"}</small></span>${r.eint ? `<span class="qrn">${r.got} / ${r.magn}</span>` : `<span class="qrcnt"><button type="button" data-q="h:${E(r.id)}:-1" aria-label="Fækka">−</button><span class="qrn">${r.got} / ${r.magn}</span><button type="button" data-q="h:${E(r.id)}:1" aria-label="Fjölga">+</button></span>`}</div>`).join("")}</div>
        <button type="button" class="btn primary qrdone" data-q="finish">${s.done >= s.tot ? "Allt pakkað – loka" : "Loka"}</button>`; };
    Q().openScanner({ title: "Pökkun · " + (P0.nr || ""), sup: "Pökkunarlisti", panel,
      onCode: nr => { const P = findP(pid); if (!P) return { ok: false, msg: "Pöntunin fannst ekki" };
        const f = Q().findE(nr); if (!f) return { ok: false, msg: "Óþekkt eintak " + nr };
        const s = pickState(P), r = s.rows.find(x => x.id === String(f.v.id)); if (!r) return { ok: false, msg: f.v.heiti + " er ekki á pöntuninni" };
        if (r.nrs.includes(nr)) return { ok: false, msg: nr + " er þegar pakkað" }; if (r.got >= r.magn) return { ok: false, msg: "Komin nóg af " + f.v.heiti };
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
    const kv = (x, l, w) => x ? `<div class="pfkv"><img src="${x.undirskrift}" alt="Undirskrift ${E(x.nafn || "")}"><span><b class="t-grn">✓ ${l}${w?.nafn ? ` <span class="pfhv">af ${E(w.nafn)}</span>` : ""}</b><small>${l === "Afhent" ? "Viðtakandi" : "Skilaði"}: ${E(x.nafn || "")} · ${E(dfmt(x.dags))} kl. ${E(String(x.dags).slice(11, 16))}${x.mynd ? " · með mynd" : ""}</small></span><button type="button" class="btn sm" data-pf="pdf:${E(P.id)}:${l === "Afhent" ? "ut" : "inn"}">Seðill (PDF)</button></div>` : "";
    // Engir sérhnappar lengur (2.58.0): „Afhenda“ / „Taka á móti“ neðst leiðir í gegnum skönnun og kvittun. Hér sést aðeins staðan.
    const warnUt = !ut && ["Afhent", "Skilað", "Lokið"].includes(P.stada) ? `<p class="pfhint"><span class="t-amb">Afhent án kvittunar</span>${canEd && P.stada === "Afhent" ? ` · <button type="button" class="pflink" data-pf="kv:${E(P.id)}:ut">Taka kvittun núna</button>` : ""}</p>` : "";
    const warnIn = ut && !inn && ["Skilað", "Lokið"].includes(P.stada) ? `<p class="pfhint"><span class="t-amb">Móttekið án kvittunar</span></p>` : "";
    const btnUt = "", btnIn = "";
    return `<section class="pfsec pfafh"><div class="pfsh"><b>Afhending</b>
      <div class="pfseg" role="group" aria-label="Afhendingarmáti">${[["sent", "Sent"], ["sott", "Sótt"]].map(([v, l]) => `<button type="button"${a === v ? ' aria-pressed="true"' : ""} ${canEd ? `data-pf="afh:${E(P.id)}:${v}"` : "disabled"}>${l}</button>`).join("")}</div></div>
      ${a === "sent" ? `<div class="pfrow"><label>Heimilisfang<input data-pfs="afhStadur:${E(P.id)}" value="${E(P.afhStadur || P.stadsetning || "")}" placeholder="Hvert á að senda" ${canEd ? "" : "disabled"}></label><label>Klukkan<input data-pfs="afhKl:${E(P.id)}" value="${E(P.afhKl || "")}" placeholder="hh:mm" inputmode="decimal" maxlength="5" ${canEd ? "" : "disabled"}></label></div>`
        : a === "sott" ? `<p class="pfhint">Viðskiptavinur sækir ${E(dfmt(P.fra))}${P.afhKl ? " kl. " + E(P.afhKl) : ""} ${!window.pnSkil || pnSkil(P) ? "og skilar " + E(dfmt(P.til)) : ""}</p>` : `<p class="pfhint">Veldu hvort pöntunin er send eða sótt.</p>`}
      ${kv(ut, "Afhent", P.afhent)}${warnUt}${kv(inn, "Móttekið", P.mottekid)}${warnIn}</section>`;
  }
  async function setStatus(pid, nx) { const P = findP(pid); if (!P || P.stada === nx || P.stada === "Lokið" || (nx === "Afhent" && P.stada === "Skilað")) return; try { __pfFlow = true; doAct("tbst:" + P.id + ":" + nx); } catch (e) {} finally { __pfFlow = false; } }
  let __pfFlow = false;
  /* Eitt afhendingarferli (2.58.0): „Afhenda“ / „Taka á móti“ → skanna (ef QR og leigubúnaður með eintökum) → kvittun → staða. */
  function flow(pid, dir) {
    const P = findP(pid); if (!P) return; const out = dir === "ut";
    const N = tr(() => Q().need(P), []), qr = tr(() => qrIsOn(), false) && N.some(r => r.eint);
    const sig = () => kvittun(pid, dir, { step: qr ? (out ? "Skref 2 af 2 · kvittun" : "Skref 2 af 2 · kvittun") : "" });
    if (qr) { const st = tr(() => Q().orderState(P, dir), null); if (st && st.done >= st.tot) return sig(); return window.qrScanOrder(pid, dir, () => setTimeout(sig, 150)); }
    sig();
  }
  // Undirskrift + mynd
  function kvittun(pid, dir, opt = {}) {
    const P = findP(pid); if (!P) return; const out = dir === "ut";
    const { w, close } = modal(out ? "Afhending · " + P.nr : "Móttaka · " + P.nr, `
      <p class="pfhint">${out ? "Viðtakandi staðfestir að hafa fengið búnaðinn í lagi." : "Staðfest að búnaðinum hafi verið skilað."} ${E(P.heiti || "")}</p>
      <label>Nafn ${out ? "viðtakanda" : "þess sem skilar"}<input id="pfnafn" value="${E(P.tengilidur || "")}" autocomplete="name"></label>
      <div class="pfsigw"><canvas id="pfsig" width="600" height="200" aria-label="Undirskrift – skrifaðu með fingri eða mús"></canvas><button type="button" class="pfclr" data-clr="1">Hreinsa</button><span class="pfsigl">Undirskrift</span></div>
      <label class="pfphoto"><input id="pfmynd" type="file" accept="image/*" capture="environment" hidden><span class="btn">📷 Taka mynd af búnaðinum</span><small id="pfmyndn">Valfrjálst</small></label>
      ${opt.step ? `<p class="pfstep">${E(opt.step)}</p>` : ""}
      <div class="pfact">${!SIGREQ() ? `<button type="button" class="btn pfskip" id="pfskip">Sleppa undirskrift</button>` : ""}<button type="button" class="btn" data-x="1">Hætta við</button><button type="button" class="btn primary" id="pfsave">${out ? "Staðfesta afhendingu" : "Staðfesta móttöku"}</button></div>`);
    w.querySelector("#pfskip")?.addEventListener("click", async () => { close(); await setStatus(pid, out ? "Afhent" : "Skilað"); toast(out ? "Afhent án undirskriftar" : "Móttekið án undirskriftar"); render(); });
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
        await setStatus(pid, out ? "Afhent" : "Skilað");
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
  /* ---------- Greiðsla (2.73.0) ----------
     Viðskiptavinur er „í reikning“ eða „staðgreitt“ (vidskiptavinir[].greidsla; án viðskiptavinar = staðgreitt).
     Staðgreiðslupöntun má ekki afhenda fyrr en greiðsla er skráð: P.greitt = { dags, af, nafn, leid, upphaed }. */
  const LEIDIR = [["kort", "Kort / posi"], ["millifaersla", "Millifærsla"], ["reidufe", "Reiðufé"], ["annad", "Annað"]];
  const LEID = k => (LEIDIR.find(x => x[0] === k) || [0, k || ""])[1];
  const totOf = P => Math.round(tr(() => window.salaAPI.totals(P).tot, 0) || 0);
  const krI = n => (Math.round(+n || 0)).toLocaleString("de-DE") + " kr.";
  const hattur = P => { const c = P.vskId ? tr(() => findVsk(P.vskId), null) : null; return P.greidsluhattur || (c ? (c.greidsla || "reikningur") : "stadgreitt"); };
  const payOk = P => !P || hattur(P) !== "stadgreitt" || !!P.greitt;
  function payHTML(P) {
    const h = hattur(P), g = P.greitt, canEd = ed() && P.stada !== "Lokið";
    if (h !== "stadgreitt") return `<section class="pfsec pfpay"><div class="pfsh"><b>Greiðsla</b><span>Í reikning${P.vskId ? "" : ""}</span>${canEd ? `<button type="button" class="pflink" data-pf="payh:${E(P.id)}:stadgreitt">Breyta í staðgreiðslu</button>` : ""}</div></section>`;
    return `<section class="pfsec pfpay ${g ? "ok" : "due"}"><div class="pfsh"><b>Greiðsla</b>${g ? `<span class="t-grn">✓ Greitt ${E(krI(g.upphaed))} · ${E(LEID(g.leid))} · ${E(dfmt(g.dags))} kl. ${E(String(g.dags).slice(11, 16))}${g.nafn ? " · " + E(g.nafn) : ""}</span>` : `<span class="t-amb">Staðgreitt – ógreitt · ${E(krI(totOf(P)))} með VSK</span>`}
      ${canEd ? (g ? `<button type="button" class="pflink" data-pf="payx:${E(P.id)}">Afturkalla</button>` : `<button type="button" class="btn sm primary" data-pf="pay:${E(P.id)}">Skrá greiðslu</button>`) : ""}</div>
      ${!g && ["Ný", "Staðfest"].includes(P.stada) ? `<p class="pfhint">Viðskiptavinurinn er ekki í reikning – skrá þarf greiðslu áður en pöntunin er afhent.${canEd && P.vskId ? ` <button type="button" class="pflink" data-pf="payh:${E(P.id)}:reikningur">Setja í reikning</button>` : ""}</p>` : ""}</section>`;
  }
  // Gluggi: skrá greiðslu. Skilar true ef greiðsla var skráð.
  function payAsk(pid, why) {
    const P = findP(pid); if (!P) return Promise.resolve(false);
    return new Promise(res => {
      const w = document.createElement("div"); w.className = "qmiss pfpaydlg"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true");
      w.innerHTML = `<div class="qmb"><div class="qmh"><b style="color:var(--ink)">${why ? "Ógreidd pöntun" : "Skrá greiðslu"}</b><span>${E(P.nr || "")} · ${E(P.vidskiptavinur || P.tengilidur || "")}</span></div>
        <div class="pfpb">${why ? `<p class="pfhint t-amb" style="margin:0 0 12px">${E(why)}</p>` : ""}
          <label>Upphæð (kr.)<input id="pfpu" inputmode="numeric" value="${totOf(P)}"></label>
          <div class="pfpl" role="radiogroup" aria-label="Greiðsluleið">${LEIDIR.map(([k, l], i) => `<button type="button" role="radio" data-l="${k}" aria-checked="${i === 0}">${l}</button>`).join("")}</div></div>
        <div class="qma"><button type="button" class="btn primary" data-v="1">${why ? "Skrá greiðslu og halda áfram" : "Skrá greiðslu"}</button><button type="button" class="btn" data-v="0">Hætta við</button></div></div>`;
      let leid = "kort"; const end = v => { w.remove(); res(v); };
      w.addEventListener("click", async e => { const l = e.target.closest("[data-l]"); if (l) { leid = l.dataset.l; w.querySelectorAll("[data-l]").forEach(x => x.setAttribute("aria-checked", x === l)); return; }
        const b = e.target.closest("[data-v]"); if (!b && e.target !== w) return; if (!b || b.dataset.v === "0") return end(false);
        const u = +String(w.querySelector("#pfpu").value).replace(/[^\d]/g, "") || 0; b.disabled = true;
        try { await savePN(pid, Q0 => { Q0.greitt = { dags: nowIso(), af: me(), nafn: window.USER?.nafn || me(), leid, upphaed: u }; }); toast("Greiðsla skráð"); render(); end(true); } catch (x) { b.disabled = false; toast("Tókst ekki: " + (x?.message || x)); } });
      document.body.append(w); w.querySelector("#pfpu").focus(); w.querySelector("#pfpu").select();
    });
  }
  window.pnGreidsla = { ok: P => payOk(P), ask: (pid, why) => payAsk(pid, why) };
  const PAYWHY = "Viðskiptavinurinn er í staðgreiðslu og pöntunin er ógreidd. Skráðu greiðslu áður en búnaður fer út.";
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
    toast("Pöntun " + nr + " stofnuð"); try { window.pnOpenNew ? window.pnOpenNew(P) : openDetail("tb:" + id); } catch (e) {} return P;
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
    if (window.snSave) return window.snSave(pid);   // 2.78.0: sameiginleg sniðmát (snidmat.js)
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
    const snid = window.snList ? window.snList("pontun") : (CFP().snid || []);
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
    w.querySelectorAll("[data-tpl]").forEach(b => b.onclick = () => { const s0 = snid.find(x => String(x.id) === b.dataset.tpl), s = window.snBase ? window.snBase(s0) : s0; close(); againDlg({ ...s, heiti: s.heitiS || s.heiti || s0.heitiP || s0.heiti, uppruni: "annad" }, "Pöntun úr sniðmáti · " + s0.heiti); });
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
      if (til === t && P.stada === "Afhent" && (!window.pnSkil || pnSkil(P))) xs.push({ P, k: AFH(P) === "sent" ? "Sækja" : "Skilar", kl: "", adr: AFH(P) === "sent" ? (P.afhStadur || P.stadsetning || "") : "" }); });
    xs.sort((a, b) => (a.kl || "99").localeCompare(b.kl || "99"));
    const stops = xs.filter(x => x.adr).map(x => x.adr);
    const maps = stops.length ? "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + encodeURIComponent(stops[stops.length - 1]) + (stops.length > 1 ? "&waypoints=" + encodeURIComponent(stops.slice(0, -1).join("|")) : "") : "";
    return `<section class="card ucard pfferd"><div class="uhch"><h3>Ferð dagsins <span class="m">${xs.length}</span></h3>${maps ? `<a href="${maps}" target="_blank" rel="noopener">Opna leið í Google Maps →</a>` : ""}</div>
      ${xs.length ? xs.map((x, i) => `<div class="pfr" data-open="tb:${E(x.P.id)}" role="button" tabindex="0"><span class="pfrn">${x.adr ? i + 1 : "–"}</span><span class="pfrx"><b>${E(x.P.nr)} ${E(x.P.heiti || "")}</b><small>${E([x.adr || "Á staðnum", x.P.tengilidur || x.P.vidskiptavinur, x.P.simi].filter(Boolean).join(" · "))}</small></span><span class="pfrk ${/Afhenda|Sækja/.test(x.k) ? "t-blu" : "t-amb"}">${E(x.k)}${x.kl ? " · " + E(x.kl) : ""}</span></div>`).join("") : `<div class="uempty">Engar afhendingar eða skil í dag.</div>`}</section>`;
  }


  /* ---------- Dagatal pantana (2.59.0): Pantanir › Dagatal – tímalína eftir pöntunum og eftir búnaði ---------- */
  const PD = window.__pdc = window.__pdc || { mode: "vk", span: "2v", start: null, f: "", st: "opnar" };
  const MODES = () => [["vk", "Verkefni"], ...(tr(() => ON("pantanir"), false) ? [["pn", "Pantanir"]] : []), ...(tr(() => ON("pantanir"), false) && tr(() => ON("leiga"), false) ? [["bun", "Búnaður"]] : [])];
  const addD = (iso, n) => { const x = d(iso); x.setDate(x.getDate() + n); return isoDay(x); };
  const range = () => { const t0 = PD.start || T0(), x = d(t0);
    if (PD.span === "man") { const a = new Date(x.getFullYear(), x.getMonth(), 1), b = new Date(x.getFullYear(), x.getMonth() + 1, 0); const out = []; for (let y = new Date(a); y <= b; y.setDate(y.getDate() + 1)) out.push(isoDay(y)); return out; }
    const m = tr(() => mondayOf(x), x), out = []; for (let i = 0; i < (PD.span === "2v" ? 14 : 7); i++) { const y = new Date(m); y.setDate(m.getDate() + i); out.push(isoDay(y)); } return out; };
  const DNs = ["sun", "mán", "þri", "mið", "fim", "fös", "lau"], MNs = ["jan", "feb", "mar", "apr", "maí", "jún", "júl", "ágú", "sep", "okt", "nóv", "des"];
  const SVL = { leiga: "Leiga", sala: "Sala", vinna: "Þjónusta" };
  const onSvid = (P, f) => !f || (P.linur || []).some(l => SVL[l.teg] === f || (f === "Leiga" && l.teg === "pakki")) || (P.svid || []).includes(f);
  const IC = { sent: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Sent"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/></svg>',
    sott: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Sótt"><path d="M4 10l1.5-5h13L20 10M4 10v9h16v-9M4 10h16M9 19v-5h6v5"/></svg>' };
  function calHead(days) {
    const t = T0(), lab = PD.span === "man" ? (() => { const x = d(days[0]); return ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"][x.getMonth()] + " " + x.getFullYear(); })()
      : (() => { const a = d(days[0]), b = d(days[days.length - 1]); return a.getDate() + ". " + (a.getMonth() !== b.getMonth() ? MNs[a.getMonth()] + " " : "") + "– " + b.getDate() + ". " + MNs[b.getMonth()]; })();
    const seg = (k, opts) => `<div class="pfseg pdseg" role="group">${opts.map(([v, l]) => `<button type="button" data-pdc="${k}:${v}"${PD[k] === v ? ' aria-pressed="true"' : ""}>${l}</button>`).join("")}</div>`;
    if (!MODES().some(m => m[0] === PD.mode)) PD.mode = "vk";
    const nb = PD.mode === "vk" ? `<button type="button" class="btn primary" data-act="fabnew:verk">+ Verkefni</button>` : `<button type="button" class="btn primary" data-act="fabnew:pantanir">+ Pöntun</button>`;
    return `<div class="uhead uhh pdhead"><div><div class="spsup">Verkdagatal</div><h2 class="ptitle">${E(lab)}</h2></div><div class="uhr">${document.body.classList.contains("solowin") ? "" : `<button type="button" class="btn pdwin" data-pdc="win:" title="Opna Verkdagatal í eigin glugga – t.d. á öðrum skjá"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="7.5" width="13" height="13" rx="2"/><path d="M8 7.5V5.5a2 2 0 0 1 2-2h8.5a2 2 0 0 1 2 2V14a2 2 0 0 1-2 2h-2"/></svg>Eigin gluggi</button>`}${ed() ? nb : ""}</div></div>
      <div class="pdbar">${MODES().length > 1 ? seg("mode", MODES()) : ""}${seg("span", [["vika", "Vika"], ["2v", "2 vikur"], ["man", "Mánuður"]])}
        <div class="pdnav"><button type="button" class="btn sm" data-pdc="nav:-1" aria-label="Fyrra tímabil">‹</button><button type="button" class="btn sm" data-pdc="nav:0">Í dag</button><button type="button" class="btn sm" data-pdc="nav:1" aria-label="Næsta tímabil">›</button></div>
        ${PD.mode !== "bun" ? `<div class="pdchips">${["", "Leiga", "Sala", "Þjónusta"].map(f => `<button type="button" class="uchip${PD.f === f ? " on" : ""}" data-pdc="f:${f}">${f || "Öll svið"}</button>`).join("")}${(PD.mode === "vk" ? [["opnar", "Í gangi"], ["allar", "Öll"]] : [["opnar", "Opnar"], ["allar", "Allar"]]).map(([v, l]) => `<button type="button" class="uchip${PD.st === v ? " on" : ""}" data-pdc="st:${v}">${l}</button>`).join("")}</div>` : ""}</div>`;
  }
  const dayHdr = days => { const t = T0(); return `<div class="pdl pdh"></div>${days.map(x => { const y = d(x), we = y.getDay() % 6 === 0; return `<div class="pdh${x === t ? " today" : ""}${we ? " we" : ""}"><span>${DNs[y.getDay()]}</span><b>${y.getDate()}</b></div>`; }).join("")}`; };
  // Verkefni (2.68.0): hvert verkefni sem stika frá upphafi til skila; litur eftir stöðu og áætlun; undirverk með skiladag sem punktar
  function calVK(days) {
    const a = days[0], b = days[days.length - 1], t = T0(), n = days.length, d10 = x => String(x || "").slice(0, 10);
    const svOf = p => tr(() => window.svidOf(p), []) || [];
    const xs = tr(() => verkefni(), []).filter(p => !p.prufa || true).filter(p => (PD.st === "allar" || !isDone(p)) && (!PD.f || svOf(p).includes(PD.f))).map(p => {
      const F = tr(() => faerslur(), []).filter(e => e.verkefniId === p.id).map(e => e.date).filter(Boolean).sort();
      const T = tr(() => A().TB().filter(x => x.verkefniId === p.id && x.fra).sort((x, y) => String(x.fra).localeCompare(String(y.fra))), []);
      const fra = d10(p.timabilFra) || d10(T[0]?.fra) || F[0] || d10(p.stofnad) || t;
      const til = d10(p.timabilTil) || d10(p.skiladagur) || d10(p.vidburdur) || d10(T[T.length - 1]?.til || T[T.length - 1]?.fra) || "";
      return { p, fra, til, open: !til };
    }).filter(r => r.fra <= b && (r.open ? true : r.til >= a)).sort((x, y) => (x.til || "9999").localeCompare(y.til || "9999") || String(x.p.nr).localeCompare(String(y.p.nr)));
    if (!xs.length) return `<div class="uempty">Engin verkefni á þessu tímabili.</div>`;
    const col = iso => Math.max(0, Math.min(n - 1, Math.round((d(iso) - d(a)) / 864e5)));
    const rows = xs.map((r, ri) => { const R = ri + 2, p = r.p, end = r.open ? (t > b ? b : t < a ? a : t) : r.til, late = !isDone(p) && r.til && r.til < t;
      const bud = +p.aklst > 0 ? (+p.timar || 0) / p.aklst : 0, done = isDone(p);
      // 2.73.0: litur eftir stöðu verkefnisins (litur stöðunnar í Stillingum); viðvörun sem rauð/gul umgjörð
      const sc = tr(() => (STODUR().find(x => x.n === p.stada) || {}).c, "") || (done ? "green" : "blue"), cls = "sc-" + sc + (late || bud > 1 ? " x-bad" : bud >= 0.9 ? " x-late" : "");
      const c1 = col(r.fra < a ? a : r.fra) + 2, c2 = col(end > b ? b : end) + 3;
      const tip = [p.nr, p.stutt || p.nafn, (r.fra ? dfmt(r.fra) : "") + "–" + (r.til ? dfmt(r.til) : "opið"), p.stada, +p.aklst ? Math.round((+p.timar || 0)) + " af " + p.aklst + " klst." : ""].filter(Boolean).join(" · ");
      const marks = (p.undirverk || []).filter(u => u.skiladagur && u.stada !== "Done" && d10(u.skiladagur) >= a && d10(u.skiladagur) <= b)
        .map(u => `<div class="pdm" style="grid-row:${R};grid-column:${col(d10(u.skiladagur)) + 2}" title="${E((u.nr || "") + " " + (u.heiti || "") + " · skil " + dfmt(u.skiladagur))}"></div>`).join("");
      return `<div class="pdl" style="grid-row:${R}" data-act="u1go:verk:verk:${E(p.id)}" role="button" tabindex="0"><b>${E(p.nr)}</b><span>${E(p.stutt || p.nafn || "")}</span><small>${E(p.vidskiptavinur || "")}</small></div>
        <div class="pdtrack" style="grid-row:${R};grid-column:2/${n + 2}"></div>
        <div class="pdb ${cls}${r.fra < a ? " cut-l" : ""}${r.open || r.til > b ? " cut-r" : ""}${r.open ? " open" : ""}" style="grid-row:${R};grid-column:${c1}/${c2}" data-act="u1go:verk:verk:${E(p.id)}" role="button" tabindex="0" title="${E(tip)}"><span>${E(p.nr)}<em> · ${E(p.stada || "")}${late ? " · skil liðin" : bud > 1 ? " · fram úr áætlun" : ""}</em></span></div>${marks}`; }).join("");
    return `<div class="pdgrid" style="--n:${n};--cw:${n > 14 ? 24 : 30}px">${dayHdr(days)}${rows}</div><p class="pdleg">${tr(() => STODUR().filter(x => !x.falin && xs.some(r => r.p.stada === x.n)).map(x => `<span class="pdlg sc-${E(x.c || "blue")}"></span> ${E(x.n)}`).join(" "), "")} <span class="pdlg x-late"></span> nálgast áætlun <span class="pdlg x-bad"></span> fram úr áætlun eða skil liðin <span class="pdm in"></span> skil undirverks</p>`;
  }
  function calPN(days) {
    const a = days[0], b = days[days.length - 1], t = T0(), n = days.length;
    const xs = PN().filter(P => P.fra && String(P.fra).slice(0, 10) <= b && String(P.til || P.fra).slice(0, 10) >= a && (PD.st === "allar" || ["Ný", "Staðfest", "Afhent"].includes(P.stada) || (P.stada === "Afhent")) && onSvid(P, PD.f))
      .sort((x, y) => String(x.fra).localeCompare(String(y.fra)) || String(x.nr).localeCompare(String(y.nr)));
    if (!xs.length) return `<div class="uempty">Engar pantanir á þessu tímabili.</div>`;
    const col = iso => Math.max(0, Math.min(n - 1, Math.round((d(iso) - d(a)) / 864e5)));
    const rows = xs.map((P, ri) => { const R = ri + 2; const f = String(P.fra).slice(0, 10), tl = String(P.til || P.fra).slice(0, 10), late = P.stada === "Afhent" && (!window.pnSkil || pnSkil(P)) && tl < t, ar = ["Ný", "Staðfest"].includes(P.stada) && tr(() => A().arekstrar(P).length, 0) > 0;
      const c1 = col(f < a ? a : f) + 2, c2 = col(tl > b ? b : tl) + 3, cls = ({ "Ný": "ps-ny", "Staðfest": "ps-stf", "Afhent": "ps-afh", "Skilað": "ps-lok", "Lokið": "ps-lok" }[P.stada] || "ps-stf") + (ar ? " x-bad" : late ? " x-late" : ""); // 2.73.0: litur eftir stöðu
      const lateBar = late && t >= a && tl <= b ? `<div class="pdb lateext" style="grid-row:${R};grid-column:${col(tl) + 3}/${col(t > b ? b : t) + 3}" title="Skil komin fram yfir"></div>` : "";
      const ico = AFH(P) === "sent" ? IC.sent : AFH(P) === "sott" ? IC.sott : "";
      return `<div class="pdl" style="grid-row:${R}" data-act="u1go:pantanir:tb:${E(P.id)}" role="button" tabindex="0"><b>${E(P.nr)}</b><span>${E(P.heiti && P.heiti !== "Pöntun" ? P.heiti : (P.vidskiptavinur || P.tengilidur || ""))}</span><small>${E(P.vidskiptavinur || P.tengilidur || "")}</small></div>
        <div class="pdtrack" style="grid-row:${R};grid-column:2/${n + 2}"></div>${lateBar}
        <div class="pdb ${cls}${f < a ? " cut-l" : ""}${tl > b ? " cut-r" : ""}" style="grid-row:${R};grid-column:${c1}/${c2}" data-act="u1go:pantanir:tb:${E(P.id)}" role="button" tabindex="0" title="${E(P.nr + " · " + (P.heiti || "") + " · " + dfmt(f) + "–" + dfmt(tl) + " · " + (P.stada || "") + (ar ? " · árekstur" : late ? " · skil sein" : ""))}">${ico ? `<i>${ico}</i>` : ""}<span>${E(P.nr)}<em> · ${E(P.stada)}${ar ? " · árekstur" : late ? " · seint" : ""}</em></span>${ico && f !== tl ? `<i class="r">${ico}</i>` : ""}</div>`; }).join("");
    return `<div class="pdgrid" style="--n:${n};--cw:${n > 14 ? 24 : 30}px">${dayHdr(days)}${rows}</div><p class="pdleg"><span class="pdlg ps-ny"></span> Ný <span class="pdlg ps-stf"></span> Staðfest <span class="pdlg ps-afh"></span> Afhent <span class="pdlg ps-lok"></span> Skilað / lokið <span class="pdlg x-bad"></span> árekstur <span class="pdlg x-late"></span> skil sein</p>`;
  }
  function calBUN(days) {
    const a = days[0], b = days[days.length - 1], n = days.length;
    const vs = VR().filter(v => (A().vDeild ? A().vDeild(v) === "leiga" : true) && v.tegund !== "pakki" && v.tegund !== "vinna" && (+v.fjoldi || (v.eintok || []).length));
    const data = vs.map(v => { const fj = +v.fjoldi || (v.eintok || []).length; const cells = days.map(x => { const u = tr(() => A().upptekid(String(v.id), x, x, null), { max: 0, bs: [] }); return { x, m: u.max, docs: [...new Set(u.bs.filter(z => z.fra <= x && z.til >= x).map(z => z.T.nr))] }; }); return { v, fj, cells, any: cells.some(c => c.m) }; })
      .filter(r => r.any || PD.allt);
    if (!data.length) return `<div class="uempty">Enginn búnaður bókaður á þessu tímabili.${!PD.allt ? ` <button type="button" class="pflink" data-pdc="allt:1">Sýna allan búnað</button>` : ""}</div>`;
    let last = null, out = "";
    data.sort((x, y) => String(x.v.flokkur || "").localeCompare(String(y.v.flokkur || ""), "is") || String(x.v.heiti).localeCompare(String(y.v.heiti), "is")).forEach(r => {
      if (r.v.flokkur !== last) { last = r.v.flokkur; out += `<div class="pdg" style="grid-column:1/${n + 2}">${E(last || "Án flokks")}</div>`; }
      out += `<div class="pdl" data-act="u1go:lvorur:vara:${E(r.v.id)}" role="button" tabindex="0"><b>${E(r.v.heiti)}</b><small>${E(r.v.nr || "")} · ${r.fj} til</small></div>` +
        r.cells.map(c => { const p = c.m / r.fj, cls = c.m > r.fj ? "over" : c.m === r.fj && c.m ? "full" : c.m ? "part" : "";
          return `<div class="pdc ${cls}" style="--p:${Math.min(1, p)}" title="${E(r.v.heiti)} ${dfmt(c.x)}: ${c.m} af ${r.fj} bókuð${c.docs.length ? " – " + c.docs.join(", ") : ""}"${c.docs.length ? ` data-pdc="day:${E(r.v.id)}:${c.x}" role="button" tabindex="0"` : ""}>${c.m ? `<span>${c.m > r.fj ? c.m + "/" + r.fj : c.m}</span>` : ""}</div>`; }).join("");
    });
    return `<div class="pdgrid bun" style="--n:${n};--cw:${n > 14 ? 24 : 30}px">${dayHdr(days)}${out}</div><p class="pdleg"><span class="pdc part"></span> bókað að hluta <span class="pdc full"></span> allt bókað <span class="pdc over"></span> tvíbókað ${!PD.allt ? `· <button type="button" class="pflink" data-pdc="allt:1">Sýna allan búnað</button>` : `· <button type="button" class="pflink" data-pdc="allt:0">Aðeins bókaður búnaður</button>`}</p>`;
  }
  function calHTML() { const days = range(); setTimeout(() => { const w = document.querySelector(".pdwrap"), t = w && w.querySelector(".pdh.today"), l = w && w.querySelector(".pdl"); if (t && w.scrollWidth > w.clientWidth) w.scrollLeft = Math.max(0, t.offsetLeft - (l ? l.offsetWidth : 0) - t.offsetWidth); }, 0); return calHead(days) + `<div class="pdwrap">${PD.mode === "bun" ? calBUN(days) : PD.mode === "pn" ? calPN(days) : calVK(days)}</div>`; }
  window.pfCalHTML = calHTML;
  const regCal = () => { const U = window.UI1V; if (!U) return false; if (!U.pndag) U.pndag = () => calHTML(); return true; };
  if (!regCal()) { const iv = setInterval(() => { if (regCal()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }
  function dayDlg(vid, x) { const v = findV(vid); if (!v) return; const u = tr(() => A().upptekid(String(v.id), x, x, null), { bs: [] }); const docs = [...new Map(u.bs.filter(z => z.fra <= x && z.til >= x).map(z => [z.T.id, z])).values()];
    const { w, close } = modal(v.heiti + " · " + dfmt(x), `<div class="pfml">${docs.map(z => `<a class="pfmlr pdlink" href="#" data-id="${E(z.T.id)}"><span><b>${E(z.T.nr)}</b> ${E(z.T.heiti || "")}<small>${E(z.T.vidskiptavinur || z.T.tengilidur || "")}</small></span><b>${z.m} stk.</b></a>`).join("")}</div>`);
    w.addEventListener("click", e => { const a = e.target.closest(".pdlink"); if (!a) return; e.preventDefault(); e.stopPropagation(); close(); tab = "pantanir"; DETAIL = "tb:" + a.dataset.id; window.STSUB = null; render(); }); }
  // „Næstu 7 dagar“ á Pantanir › Yfirlit
  function stripHTML() { const t = T0(), days = [...Array(7)].map((_, i) => addD(t, i));
    const P = PN().filter(x => !["Lokið"].includes(x.stada));
    return `<section class="card ucard pdstrip"><div class="uhch"><h3>Næstu 7 dagar</h3><a href="#" data-act="tab:pndag">Dagatal →</a></div><div class="pds">${days.map(x => { const y = d(x), af = P.filter(p => String(p.fra || "").slice(0, 10) === x && ["Ný", "Staðfest"].includes(p.stada)).length, sk = P.filter(p => String(p.til || p.fra || "").slice(0, 10) === x && ["Ný", "Staðfest", "Afhent"].includes(p.stada) && (!window.pnSkil || pnSkil(p))).length;
      return `<button type="button" class="pdsd${x === t ? " today" : ""}" data-pdc="goto:${x}"><span>${x === t ? "Í dag" : DNs[y.getDay()] + " " + y.getDate() + "."}</span><b class="${af ? "t-blu" : "m"}">${af} <small>út</small></b><b class="${sk ? "t-amb" : "m"}">${sk} <small>inn</small></b></button>`; }).join("")}</div></section>`; }
  document.addEventListener("click", e => { const b = e.target.closest("[data-pdc]"); if (!b) return; e.preventDefault(); e.stopPropagation();
    const [k, v, w] = b.dataset.pdc.split(":");
    // 2.77.0: Verkdagatal í eigin glugga (popup án vinstri stiku) – má draga á annan skjá
    if (k === "win") { const w = window.open(location.pathname + location.search + "#t=pndag&w=1", "atrium-verkdagatal", "popup=yes,width=" + Math.min(1600, screen.availWidth) + ",height=" + Math.min(1000, screen.availHeight)); if (!w) toast("Vafrinn lokaði á gluggann – leyfðu sprettiglugga fyrir appið"); return; }
    if (k === "nav") { const span = PD.span === "man" ? null : PD.span === "2v" ? 14 : 7; if (v === "0") PD.start = null; else if (span) PD.start = addD(PD.start || T0(), +v * span); else { const x = d(PD.start || T0()); x.setMonth(x.getMonth() + +v, 1); PD.start = isoDay(x); } }
    else if (k === "day") return dayDlg(v, w);
    else if (k === "goto") { PD.start = v; PD.span = "vika"; try { doAct("tab:pndag"); } catch (x) {} return; }
    else if (k === "allt") PD.allt = v === "1";
    else PD[k] = v;
    render(); }, true);

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
      <div class="viewtitle">Afhending</div><div class="snjset"><div class="snjsr"><div class="snjsc">${sw(SIGREQ(), "pfSet('sig','krafa',this.checked)", "Krefjast undirskriftar")}</div><div class="snjst"><b>Krefjast undirskriftar við afhendingu og skil</b><small>Ef slökkt má sá sem afhendir sleppa kvittunarskrefinu („Sleppa undirskrift“)</small></div><div class="snjso"></div></div></div>
      <div class="viewtitle">Staðfestingartengill</div><div class="snjset"><div class="snjsr"><div class="snjsc">${sw(TENG().on, "pfSet('teng','on',this.checked)", "Senda sjálfkrafa")}</div><div class="snjst"><b>Senda staðfestingartengil sjálfkrafa</b><small>Ný pöntun með netfangi fær pöntunarsíðu strax. Ef enginn hefur sent tengilinn innan frestsins sendir netþjónninn hann úr sameiginlega pósthólfinu.</small></div><div class="snjso snjlim">${TENG().on ? `<input class="snjnum" type="number" min="0.25" step="0.25" value="${E(TENG().klst)}" onchange="pfSet('teng','klst',this.value)"><span class="snju">klst. eftir stofnun</span>` : ""}</div></div>${TENG().on ? `<div class="snjsr"><div class="snjsc"></div><div class="snjst"><b>Í síðasta lagi fyrir afhendingu</b><small>Ef afhending er nær en þetta fer tengillinn fyrr – strax ef tíminn er þegar kominn</small></div><div class="snjso snjlim"><input class="snjnum" type="number" min="1" step="1" value="${E(TENG().fyrir)}" onchange="pfSet('teng','fyrir',this.value)"><span class="snju">klst. fyrir afhendingu</span></div></div>` : ""}</div>
      <div class="viewtitle">Ferð dagsins</div><div class="snjset"><div class="snjsr"><div class="snjsc">${sw(FERD(), "pfSet('ferd','on',this.checked)", "Ferð dagsins")}</div><div class="snjst"><b>Ferð dagsins á Pantanir › Yfirlit</b><small>Afhendingar og sóttar pantanir dagsins í röð, með leið í Google Maps</small></div><div class="snjso"></div></div></div>
      ${window.snList ? "" : `<div class="viewtitle">Sniðmát</div><div class="snjset">${sn.map(s => `<div class="snjsr"><div class="snjsc"></div><div class="snjst"><b>${E(s.heiti)}</b></div><div class="snjso"><button type="button" class="btn sm" onclick="pfSet('snidDel','${E(s.id)}')">Eyða</button></div></div>`).join("")}</div>`}
      <div class="viewtitle">Vefverslun</div><div class="snjset"><div class="snjsr"><div class="snjsc"><span class="pfshop">S</span></div><div class="snjst"><b>Shopify ${sh.virk ? '<span class="t-grn">· tengt</span>' : '<span class="m">· ekki tengt</span>'}</b><small>Pantanir úr vefversluninni detta sjálfkrafa inn í Pantanir (uppruni Shopify) og eru staðfestar ef búnaðurinn er laus.</small></div><div class="snjso"><button type="button" class="btn sm" onclick="pfShopify()">${sh.verslun ? "Stillingar" : "Tengja"}</button></div></div></div>`;
  }
  window.pfSet = (g, k, v) => { saveCfg(c => {
    if (g === "sg") { c.skilagjold = { ...(c.skilagjold || {}), [k]: k === "on" ? !!v : (parseFloat(String(v).replace(",", ".")) || 0) }; }
    if (g === "ferd") c.ferd = { ...(c.ferd || {}), on: !!v };
    if (g === "teng") c.tengill = { ...(c.tengill || {}), [k]: k === "on" ? !!v : Math.max(0.25, parseFloat(String(v).replace(",", ".")) || (k === "fyrir" ? 12 : 2)) };
    if (g === "sig") c.undirskrift = { ...(c.undirskrift || {}), krafa: !!v };
    if (g === "snidDel") c.snid = (c.snid || []).filter(x => x.id !== k);
  }).then(() => render()).catch(e => toast("Tókst ekki: " + (e?.message || e))); };
  window.pfShopify = () => { const sh = CFP().shopify || {};
    const { w, close } = modal("Tengja Shopify", `<p class="pfhint">Pantanir úr Shopify-versluninni verða sjálfkrafa að pöntunum hér, með Shopify-númerinu og uppruna „Shopify“. Til að virkja þarf litla þjónustu sem tekur við tilkynningum frá Shopify (webhook) – hún er sett upp þegar Firebase-verkefnið er komið á Blaze-áskrift.</p>
      <label>Slóð verslunar<input id="pfsv" value="${E(sh.verslun || "")}" placeholder="dæmi.myshopify.com"></label>
      <ol class="pfsteps"><li>Skráðu slóð verslunarinnar og vistaðu.</li><li>Þegar tengingin er virkjuð birtist hér slóð fyrir webhook sem þú límir í Shopify › Settings › Notifications › Webhooks (Order creation).</li><li>Prófunarpöntun í Shopify birtist þá í Pantanir.</li></ol>
      <div class="pfact"><button type="button" class="btn" data-x="1">Loka</button><button type="button" class="btn primary" id="pfsvs">Vista</button></div>`);
    w.querySelector("#pfsvs").onclick = () => { const v = w.querySelector("#pfsv").value.trim(); saveCfg(c => { c.shopify = { ...(c.shopify || {}), verslun: v, virk: false }; }).then(() => { close(); toast("Shopify-verslun skráð – tengingin verður virkjuð síðar"); render(); }); }; };
  const addPage = () => { if (typeof STPAGES === "undefined") return false; STPAGES.pferli = { l: "Pantanir", d: "Skilauppgjör, ferð dagsins og tenging við vefverslun", s: ["Skilauppgjör", "Staðfestingartengill", "Ferð dagsins", "Shopify", "Vefverslun"], adm: 1, fn: () => settingsHTML() }; return true; };
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
      netfangM: (e => e && e.includes("@") ? e[0] + "•••" + e.slice(e.indexOf("@") - 1 > 0 ? e.indexOf("@") - 1 : e.indexOf("@")) : null)(P.netfang || tr(() => findVsk(P.vskId)?.netfang, "")),
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
  // 2.61.0: tilboð nota sömu opinberu síðu (opinber/{t}, teg: "tilbod") – sala.js notar þessi föll
  window.atrPub = { url: t => pubUrl(t), tok: () => newTok(), inst: () => instKey(), write: (t, d) => pubWrite(t, d), demo: DEMO, ls: () => LS(), lsKey };
  // 2.73.0: pöntun úr tilboði sem viðskiptavinur undirritaði telst staðfest – engin önnur undirskrift. Pöntunarsíðan verður til
  // með staðfestingunni úr tilboðinu og staðfestingarpósturinn (með pöntuninni í PDF) fer sjálfkrafa eins og annars.
  window.pnFraTilbodi = async (pid, st) => { const P = findP(pid); if (!P || P.opinber) return; const t = newTok();
    try { await pubWrite(t, st ? { ...snapOf(P), stadfest: st } : snapOf(P)); await savePN(pid, Q0 => { Q0.opinber = t; if (st) Q0.vidskStadfest = st; if (Q0.stada === "Ný") Q0.stada = "Staðfest"; }); pubWatch(t, pid); }
    catch (e) { console.warn("pöntunarsíða úr tilboði", e); } };
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
  // 2.74.0: ný pöntun með netfangi fær pöntunarsíðu strax (hljóðlaust) svo netþjónninn geti sent tengilinn eftir frestinn
  const AUTOPUB = new Set();
  async function autoPub() {
    if (!ed() || !TENG().on || DEMO()) return; const lim = Date.now() - 48 * 36e5;
    for (const P of PN()) { if (AUTOPUB.has(P.id) || P.opinber || P.prufa || P.stada !== "Ný" || P.vidskStadfest) continue;
      if (!(P.netfang || tr(() => findVsk(P.vskId)?.netfang, ""))) continue; const t0 = Date.parse(P.stofnad_t || P.dags || ""); if (!(t0 > lim)) continue;
      AUTOPUB.add(P.id); const t = newTok();
      try { await pubWrite(t, snapOf(P)); await savePN(P.id, Q0 => { if (!Q0.opinber) Q0.opinber = t; }); LAST[t] = JSON.stringify(snapOf(findP(P.id) || P)); } catch (e) { console.warn("pöntunarsíða", e); } }
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
    const P = findP(pid); if (!P?.opinber) return;
    if (!P.tengillSendur) savePN(pid, Q0 => { Q0.tengillSendur = { dags: nowIso(), af: me(), til: P.netfang || tr(() => findVsk(P.vskId)?.netfang, "") || null }; }).catch(() => {}); const url = pubUrl(P.opinber), co = tr(() => DOK.co().nafn, "") || tr(() => ORG.nafn, "");
    const subj = `Pöntun ${P.nr} – ${P.heiti || ""}`.trim(), body = `Sæl/l${P.tengilidur ? " " + P.tengilidur.split(" ")[0] : ""},\n\nHér getur þú séð pöntunina og staðfest hana:\n${url}\n\nKveðja,\n${co}`;
    if (window.poCompose && tr(() => MS.on(), false)) { // 2.73.0: pöntunin sem PDF í viðhengi (forskoðanleg)
      const A = window.salaAPI; (A?.pdf ? A.pdf(P).then(b => [{ name: A.fileBase(P) + ".pdf", type: "application/pdf", size: b.length, data: b }]).catch(() => []) : Promise.resolve([]))
        .then(atts => { try { poCompose({ to: P.netfang || "", subject: subj, body, atts }); } catch (e) {} }); return; }
    location.href = "mailto:" + encodeURIComponent(P.netfang || "") + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(body);
  }
  // 2.76.0: ferill pöntunar efst – Ný → Staðfest → Afhent → Skilað/Lokið, með hver og hvenær
  function ferillHTML(P) {
    const sk = !window.pnSkil || pnSkil(P), ord = ["Ný", "Staðfest", "Afhent", sk ? "Skilað" : "Lokið"], cur = Math.max(0, P.stada === "Lokið" ? 3 : ord.indexOf(P.stada));
    const hm = x => x ? `${E(dfmt(x))} kl. ${E(String(x).slice(11, 16))}` : "";
    const v = P.vidskStadfest, tb = P.tilbodId ? tr(() => window.salaAPI.TB().find(T => T.id === P.tilbodId), null) : null;
    const info = [
      [E(tr(() => ({ simi: "Sími", postur: "Tölvupóstur", shopify: "Shopify", vefur: "Vefur", stadur: "Á staðnum", tilbod: "Úr tilboði", annad: "" })[P.uppruni], "") || ""), (P.stofnad_t ? hm(P.stofnad_t) : E(dfmt(P.dags || "")))],
      [v ? `af ${E(v.nafn)}` : tb ? `úr tilboði <a class="plink" data-open="tb:${E(tb.id)}">${E(tb.nr)}</a>` : "", v ? hm(v.dags) : ""],
      [P.afhent ? `af ${E(P.afhent.nafn || "")}` : "", P.afhent ? hm(P.afhent.dags) : `${E(dfmt(P.fra))}${P.afhKl ? " kl. " + E(P.afhKl) : ""}`],
      [P.mottekid ? `af ${E(P.mottekid.nafn || "")}` : "", P.mottekid ? hm(P.mottekid.dags) : sk ? E(dfmt(P.til || P.fra)) : ""]];
    return `<ol class="pfferill">${ord.map((l, i) => `<li class="${i < cur || (i === cur && i === 3) ? "done" : i === cur ? "cur" : ""}"><i></i><b>${E(l)}</b>${info[i][0] ? `<span>${info[i][0]}</span>` : ""}${info[i][1] ? `<small>${info[i][1]}</small>` : ""}</li>`).join("")}</ol>`;
  }
  // 2.76.0: eitt spjald „Viðskiptavinur“ – staðfesting, póstar og pöntunarsíða (tengill sem hnappar, ekki langur reitur)
  function pubHTML(P) {
    if (!ed() && !P.opinber) return "";
    const v = P.vidskStadfest || PUB[P.opinber]?.stadfest, to = P.netfang || tr(() => findVsk(P.vskId)?.netfang, ""), pm = P.stadfPostur || PUB[P.opinber]?.postur;
    const hm = x => `${E(dfmt(x))} kl. ${E(String(x).slice(11, 16))}`;
    const row = (cls, txt) => `<div class="pfln${cls ? " " + cls : ""}">${txt}</div>`;
    const lines = [
      v ? row("ok", `✓ Staðfest af ${E(v.nafn)}${v.ur ? ` <span class="m">· undirskrift á ${E(v.ur)}</span>` : ""}<small>${hm(v.dags)}</small>`) : P.stada === "Ný" ? row("wait", "Bíður staðfestingar viðskiptavinar") : row("ok", `✓ ${E(P.stada)}${P.tilbodId ? ' <span class="m">· úr samþykktu tilboði</span>' : ""}`),
      v?.athugasemd ? row("note", `„${E(v.athugasemd)}“`) : "",
      !v && P.tengillSendur ? row("", `✉ Tengill sendur${P.tengillSendur.af === "sjálfvirkt" ? " sjálfkrafa" : ""}<small>${hm(P.tengillSendur.dags)}${P.tengillSendur.til ? " · " + E(P.tengillSendur.til) : ""}</small>`) : "",
      !v && !P.tengillSendur && P.opinber && TENG().on && P.stada === "Ný" ? row("m", `Tengillinn fer sjálfkrafa ${E(String(TENG().klst).replace(".", ","))} klst. eftir stofnun, í síðasta lagi ${E(String(TENG().fyrir))} klst. fyrir afhendingu`) : "",
      P.stada !== "Ný" ? (pm ? row("ok", `✓ Staðfestingarpóstur sendur<small>${hm(pm.dags)} · ${E(pm.til || to)}</small>`) : !to ? row("wait", "Ekkert netfang – staðfestingarpóstur fer ekki") : row("wait", `Staðfestingarpóstur ekki farinn${ed() && (msOn() || DEMO()) && P.opinber ? ` · <button type="button" class="pflink" data-pf="pubmail:${E(P.id)}">Senda núna</button>` : " · fer sjálfkrafa frá netþjóni"}`)) : ""
    ].filter(Boolean).join("");
    const acts = !ed() ? "" : !P.opinber ? `<button type="button" class="btn sm" data-pf="pub:${E(P.id)}">Búa til pöntunarsíðu</button>`
      : `<button type="button" class="btn sm" data-pf="pubsend:${E(P.id)}">✉ Senda tengil</button><button type="button" class="btn sm" data-pf="pubcopy:${E(P.id)}">Afrita tengil</button><a class="btn sm" href="${E(pubUrl(P.opinber))}" target="_blank" rel="noopener">Opna síðu</a><button type="button" class="pflink pfx" data-pf="pubrev:${E(P.id)}">Loka síðu</button>`;
    return `<section class="pfsec pfpub pfcard"><div class="pfsh"><b>Viðskiptavinur</b><span class="m">${E(P.vidskiptavinur || P.tengilidur || "")}${to ? " · " + E(to) : ""}</span></div><div class="pfbd">${lines}</div>${acts ? `<div class="pfft">${acts}</div>` : ""}</section>`;
  }


  /* ---------- Tengt inn í appið ---------- */
  document.addEventListener("click", e => {
    if (!on() || __pfFlow) return; const t = e.target.closest('button[data-act^="tbst:"], a[data-act^="tbst:"]'); if (!t) return;
    const [, id, nx] = t.dataset.act.split(":"), P = findP(id); if (!P?.pontun || !["Afhent", "Skilað"].includes(nx)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (nx === "Afhent" && !payOk(P)) { payAsk(id, PAYWHY).then(ok => { if (ok) flow(id, "ut"); }); return; }
    flow(id, nx === "Afhent" ? "ut" : "inn");
  }, true);
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
    if (op === "pay") return payAsk(id);
    if (op === "payx") { if (!confirm("Afturkalla skráða greiðslu?")) return; return savePN(id, P => { delete P.greitt; }).then(() => { toast("Greiðsla afturkölluð"); render(); }); }
    if (op === "payh") return savePN(id, P => { P.greidsluhattur = a; }).then(() => render());
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
    try { autoPub(); } catch (e) {}
    const root = document.getElementById("view"); if (!root) return;
    if (D && String(D).startsWith("tb:")) { const P = findP(String(D).slice(3)); if (!P || !P.pontun) return; const host = root.querySelector(".spdet") || root; if (host.querySelector(".pfwrap")) return;
      { const slot = host.querySelector("#tbed .tbafhslot"); if (host.querySelector("#tbed")) { if (slot && !slot.firstChild) slot.innerHTML = afhHTML(P); return; } } // 2.71.0: í breytingasýn aðeins afhendingarmáti, í sínum hluta
      try { pubSync(P); } catch (e) {}
      const html = `<div class="pfwrap">${ferillHTML(P)}${subsHTML(P)}<div class="pfgrid">${pubHTML(P)}${payHTML(P)}${afhHTML(P)}</div>${pickHTML(P)}${settleHTML(P)}</div>`;
      const anchor = host.querySelector(".qrbox") || host.querySelector(".utb") || [...host.querySelectorAll(".viewtitle")].find(x => /^Línur/.test(x.textContent.trim()));
      anchor ? anchor.insertAdjacentHTML("beforebegin", html) : host.insertAdjacentHTML("beforeend", html);
      host.querySelectorAll(".qrbox .qrbb").forEach(x => x.remove());
      // 2.76.0: hver afhenti og „Úr tilboði“ eru í ferlinum; Panta aftur / Vista sem sniðmát í ⋯
      host.querySelectorAll(".pnhver").forEach(x => x.remove()); [...host.querySelectorAll("p.sub")].filter(x => /^Úr tilboði/.test(x.textContent.trim())).forEach(x => x.remove());
      { const mm = host.querySelector(".uact .umore > div"); if (mm && ed() && !mm.querySelector('[data-pf^="again:"]')) mm.insertAdjacentHTML("afterbegin", `<button type="button" data-pf="again:${E(P.id)}">↻ Panta aftur</button><button type="button" data-pf="tpl:${E(P.id)}">Vista sem sniðmát</button>`);
        else if (!mm) host.querySelector(".pfwrap")?.insertAdjacentHTML("beforeend", moreHTML(P)); }   // skönnun er hluti af „Afhenda“ / „Taka á móti“
      document.querySelectorAll('#view button[data-act^="tbst:' + P.id + ':Afhent"], #view button[data-act^="tbst:' + P.id + ':Skilað"]').forEach(b => { if (b.closest(".fsels")) return; b.textContent = b.dataset.act.endsWith("Afhent") ? (AFH(P) === "sott" ? "Afhenda (sótt)" : "Afhenda") : "Taka á móti"; });
      return; }
    if (!D && /^(pnyf|pantanir|pnl|pns|pnt)$/.test(t)) {
      const ph = root.querySelector(".phead .phrow, .uhead"), nb = ph && (ph.querySelector('[data-act^="fabnew"]') || ph.querySelector(".btn.primary"));
      if (nb && ed() && !root.querySelector('[data-pf="mail"]')) nb.insertAdjacentHTML("beforebegin", `<button type="button" class="btn pfmailb" data-pf="mail:" title="Ný pöntun úr pósti eða sniðmáti">Úr pósti / sniðmáti</button>`);
      if (t === "pnyf" && !root.querySelector(".pdstrip")) { const k = root.querySelector(".ukps"); if (k) k.insertAdjacentHTML("afterend", stripHTML()); else { const h = root.querySelector(".uhead"); h ? h.insertAdjacentHTML("afterend", stripHTML()) : root.insertAdjacentHTML("afterbegin", stripHTML()); } }
      if (t === "pnyf" && FERD() && !root.querySelector(".pfferd")) { const at = root.querySelector(".uh3") || root.querySelector(".foot") ; const h = ferdHTML(); at ? at.insertAdjacentHTML("beforebegin", h) : root.insertAdjacentHTML("beforeend", h); }
    }
  }
  const r0 = render; render = function () { const x = r0.apply(this, arguments); try { decorate(); } catch (e) { console.warn("pferli", e); } return x; };
})();
