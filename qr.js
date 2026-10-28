/* QR-merki og skanni (2.45.0, eining „qr“ – sjálfgefið óvirk, fyrst í dev/).
   - Skanni sem virkar í öllum tækjum: BarcodeDetector þar sem hann er til (Chrome/Edge/Android), annars jsQR (lib/jsqr.js,
     Apache 2.0, sótt aðeins þegar þarf) – líka í Safari á iPhone og í heimaskjáappi. Ekkert sent til þriðja aðila.
   - Eintaksspjald eftir skönnun: vara, ástand, hilla, hvar eintakið er (úti á pöntun eða á lager), breyta ástandi, skrá skemmd,
     prenta eitt merki, opna búnaðinn.
   - Skönnun út og inn á pöntun: gátlisti úr leigulínum pöntunarinnar (pakkar leystir upp í innihald); hvert eintak skannað einu
     sinni, röng vara gefur viðvörun. Vara án eintaka er talin handvirkt (+/−). Í lokin má merkja pöntunina Afhenta / Skilaða.
   - Hnappur í haus (sími) og vinstri stiku (tölva), eintök smellanleg á vöruspjaldi, ?e=<eintak> í slóð opnar spjaldið.
   Gögn (engin ný söfn – reitir á skjölum sem til eru, vistað með saveSnapshot):
     vorur[].eintok[].uti  = { p: <pöntunar-id>, nr: "P-0901", dags } meðan eintakið er úti; fjarlægt þegar það er skannað inn
     pantanir[].skann      = { ut: [eintaksnr], inn: [eintaksnr], utH: {vöruId: fjöldi}, innH: {…}, utDags, innDags, af }
   QR-innihald: slóð appsins + ?e=<eintak> (venjuleg myndavél opnar appið), skanninn les líka bert númer.
   Söluvörur (2.105.0): skanninn les líka strikamerki (EAN-13/8, UPC, Code 128/39) – BarcodeDetector þar sem hann er til, annars
     ZXing (lib/zxing.js, Apache 2.0, sótt aðeins þegar þarf, t.d. á iPhone). Vara finnst eftir vorur[].strikamerki (eitt eða fleiri,
     aðskilin með bili/kommu), vörunúmeri eða QR-merki vörunnar (?v=<vörunr>). Söluvörur eru taldar (magn), ekki eintök:
     skönnun á pöntun hækkar talningu línunnar um 1 (skann.utH / tinslaH). Lagerskönnun: Talning og Vörumóttaka úr skannanum. */
(function () {
  const on = () => typeof ON === "function" && ON("qr");
  const st = () => { try { return typeof S !== "undefined" ? S : null; } catch (e) { return null; } };
  const api = () => window.salaAPI;
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const can = () => { try { return !!MCP; } catch (e) { return false; } };
  const ST_E = { ok: "Í lagi", skodun: "Þarf að skoða", vidgerd: "Í viðgerð", tynt: "Týnt" };
  const ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8 8h3v3H8zM13 13h3v3h-3zM13 8h3M8 16h3M16 11v0"/></svg>';
  const dIS = s => s ? String(s).slice(0, 10).split("-").reverse().join(".") : "";
  const nowIso = () => new Date().toISOString();
  const me = () => window.USER?.sk || (typeof ME === "function" ? ME() : "");

  /* ---------- Gögn ---------- */
  const VR = () => api()?.VR() || st()?.vorur || [];
  const PN = () => api()?.PN?.() || st()?.pantanir || [];
  const findE = nr => { for (const v of VR()) { const i = (v.eintok || []).findIndex(e => e.nr === nr); if (i >= 0) return { v, e: v.eintok[i], i }; } return null; };
  const parse = txt => { const t = String(txt || "").trim(); const m = t.match(/[?&][ev]=([^&#]+)/); if (m) return decodeURIComponent(m[1]); const a = t.match(/^ATR:[EV]:(.+)$/i); return a ? a[1] : t; };
  // Söluvara eftir strikamerki, vörunúmeri eða QR-merki vörunnar (2.105.0). EAN-13 með 0 fremst = UPC-A.
  const normC = x => String(x || "").trim().toUpperCase().replace(/\s+/g, "");
  const codesOf = v => [v.nr, ...String(v.strikamerki || "").split(/[\s,;]+/)].map(normC).filter(Boolean);
  const varC = c => /^\d{12}$/.test(c) ? [c, "0" + c] : /^0\d{12}$/.test(c) ? [c, c.slice(1)] : [c];
  const findV = code => { const cs = varC(normC(code)); if (!cs[0]) return null; return VR().find(v => !["pakki", "vinna"].includes(v.tegund) && codesOf(v).some(x => cs.includes(x))) || null; };
  const salaOn = () => { try { return typeof ON === "function" && ON("sala"); } catch (e) { return false; } };
  const isSalaV = v => { try { return (api()?.vDeild ? api().vDeild(v) : v.deild) === "sala"; } catch (e) { return v.deild === "sala"; } };
  const saveV = (id, fn) => saveSnapshot(s => { const q = (s.vorur || []).find(x => String(x.id) === String(id)); if (q) fn(q, s); });
  const appBase = () => (window.ORG?.appUrl && location.href.startsWith(ORG.appUrl) ? ORG.appUrl : location.origin + location.pathname).split("?")[0];
  // Leigulínur pöntunar → [{ v, heiti, magn }] með pökkum leystum upp. Út (dir ≠ "inn"): líka sölulínur (2.105.0) – þær koma ekki til baka.
  function need(P, dir) {
    const m = new Map(), add = (id, n) => { const v = VR().find(x => String(x.id) === String(id)); if (!v || v.tegund === "vinna") return; if (v.tegund === "pakki") { (v.innihald || []).forEach(i => add(i.v, n * (+i.m || 1))); return; } m.set(String(v.id), (m.get(String(v.id)) || 0) + n); };
    (P.linur || []).filter(l => l.v != null && (l.teg === "leiga" || (dir !== "inn" && l.teg === "sala"))).forEach(l => add(l.v, +l.magn || 0));
    return [...m].map(([id, n]) => { const v = VR().find(x => String(x.id) === id); return { v, id, heiti: v?.heiti || "", nr: v?.nr || "", magn: n, eint: (v?.eintok || []).length > 0, sala: !!v && isSalaV(v), kodi: !!v?.strikamerki }; }).filter(x => x.magn > 0);
  }
  const hasLeiga = P => !!P?.pontun && need(P, "inn").length > 0;

  /* ---------- Afkóðun ---------- */
  let jsqrP = null;
  const loadJsQR = () => jsqrP || (jsqrP = window.jsQR ? Promise.resolve() : new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = "lib/jsqr.js"; sc.onload = ok; sc.onerror = () => { jsqrP = null; no(); }; document.head.append(sc); }));
  let zxP = null;
  const loadZX = () => zxP || (zxP = window.ZXing ? Promise.resolve() : new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = "lib/zxing.js"; sc.onload = ok; sc.onerror = () => { zxP = null; no(); }; document.head.append(sc); }));
  const BC1D = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"];
  // 2.105.0: strikamerki söluvara líka (þegar Sala er virk). BarcodeDetector ef hann les þau, annars jsQR (QR) + ZXing (strikamerki).
  async function detector() {
    const bars = salaOn();
    try { if ("BarcodeDetector" in window) { const sup = await BarcodeDetector.getSupportedFormats(), f1 = BC1D.filter(f => sup.includes(f));
        if (sup.includes("qr_code") && (!bars || f1.length)) { const d = new BarcodeDetector({ formats: ["qr_code", ...(bars ? f1 : [])] }); return async vid => (await d.detect(vid))[0]?.rawValue || null; } } } catch (e) {}
    await loadJsQR();
    let zx = null;
    if (bars) { try { await loadZX(); const Z = window.ZXing, B = Z.BarcodeFormat, hints = new Map(); hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [B.EAN_13, B.EAN_8, B.UPC_A, B.UPC_E, B.CODE_128, B.CODE_39]); hints.set(Z.DecodeHintType.TRY_HARDER, true);
        const rd = new Z.MultiFormatOneDReader(hints); zx = c => { try { return rd.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(c))), hints).getText(); } catch (e) { return null; } }; } catch (e) {} }
    const cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true });
    return async vid => { const w = vid.videoWidth, h = vid.videoHeight; if (!w || !h) return null; const k = Math.min(1, (zx ? 960 : 640) / Math.max(w, h)); cv.width = Math.round(w * k); cv.height = Math.round(h * k); cx.drawImage(vid, 0, 0, cv.width, cv.height); const im = cx.getImageData(0, 0, cv.width, cv.height);
      return window.jsQR(im.data, im.width, im.height, { inversionAttempts: "dontInvert" })?.data || (zx ? zx(cv) : null) || null; };
  }

  /* ---------- Skanni (fullur skjár) ---------- */
  // opts: { title, sub, onCode(nr) → { ok, msg, keep } , panel() → html, onPanel(e), done }
  let SC = null;
  async function openScanner(opts) {
    closeScanner();
    const w = document.createElement("div"); w.className = "qrsc"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", opts.title || "Skanni");
    w.innerHTML = `<div class="qrtop"><div><div class="qrsup">${E(opts.sup || "QR-skanni")}</div><b>${E(opts.title || "Skanna")}</b></div><button type="button" class="qrx" data-q="close" aria-label="Loka skanna"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="qrcam"><video playsinline muted autoplay></video><div class="qrframe" aria-hidden="true"><i></i><i></i><i></i><i></i><span></span></div><div class="qrmsg" role="status" aria-live="polite"></div>
        <button type="button" class="qrtorch" data-q="torch" hidden aria-label="Kveikja á ljósi"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8l-1 6H9zM9 9h6v4l-1.5 8h-3L9 13z"/></svg></button>
        <div class="qrnocam" hidden>Myndavélin opnaðist ekki. Leyfðu aðgang að myndavél í stillingum vafrans, eða sláðu inn númerið hér fyrir neðan.</div></div>
      <div class="qrpanel">${opts.panel ? opts.panel() : ""}<form class="qrman" data-q="man"><label class="sr" for="qrin">Númer eintaks</label><input id="qrin" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" placeholder="${E(opts.ph || (salaOn() ? "…eða sláðu inn númer eða strikamerki" : "…eða sláðu inn númer, t.d. HL-101-07"))}"><button type="submit" class="btn">${opts.panel ? "Skrá" : "Opna"}</button></form></div>`;
    document.body.append(w); document.body.classList.add("qropen");
    const vid = w.querySelector("video"), msg = w.querySelector(".qrmsg");
    SC = { w, opts, on: true, stream: null, last: opts.last || "", lastT: opts.last ? Date.now() + 1500 : 0, paused: false };   // opts.last: kóði sem er þegar talinn (ekki telja aftur meðan hann er í mynd)
    const sc = SC;
    w.addEventListener("click", e => { const b = e.target.closest("[data-q]"); if (!b) return; const q = b.dataset.q;
      if (q === "close") return closeScanner();
      if (q === "torch") return torch(sc, b);
      if (opts.onPanel) opts.onPanel(q, b); });
    w.querySelector(".qrman").addEventListener("submit", e => { e.preventDefault(); const i = w.querySelector("#qrin"); if (i.value.trim()) { hit(sc, i.value); i.value = ""; } });
    w.addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); closeScanner(); } });
    setTimeout(() => w.querySelector(".qrx")?.focus(), 30);
    try {
      sc.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (!sc.on) { sc.stream.getTracks().forEach(t => t.stop()); return; }
      vid.srcObject = sc.stream; await vid.play().catch(() => {});
      const tr = sc.stream.getVideoTracks()[0]; try { if (tr.getCapabilities?.().torch) w.querySelector(".qrtorch").hidden = false; } catch (e) {}
      const det = await detector();
      const loop = async () => { if (!sc.on) return; if (!sc.paused && vid.readyState >= 2) { try { const r = await det(vid); if (r) hit(sc, r); } catch (e) {} } setTimeout(() => requestAnimationFrame(loop), 140); };
      loop();
    } catch (e) { w.querySelector(".qrcam").classList.add("off"); w.querySelector(".qrnocam").hidden = false; vid.remove(); }
    function hit(sc, raw) {
      const nr = parse(raw), t = Date.now(); if (!nr) return;
      // Sami kóði meðan hann er enn í mynd telst ekki aftur (2.105.0: tíminn endurnýjast við hverja greiningu – skipta þarf um vöru eða líta frá)
      if (nr === sc.last && t - sc.lastT < 1500) { sc.lastT = t; return; } sc.last = nr; sc.lastT = t;
      const r = opts.onCode(nr) || {};
      flash(sc, r.ok !== false, r.msg || nr);
    }
  }
  function flash(sc, ok, txt) {
    const m = sc.w.querySelector(".qrmsg"), f = sc.w.querySelector(".qrframe");
    m.textContent = txt; m.className = "qrmsg show " + (ok ? "ok" : "bad"); f.classList.remove("ok", "bad"); void f.offsetWidth; f.classList.add(ok ? "ok" : "bad");
    try { navigator.vibrate?.(ok ? 35 : [60, 60, 60]); } catch (e) {}
    clearTimeout(sc._m); sc._m = setTimeout(() => { m.className = "qrmsg"; f.classList.remove("ok", "bad"); }, 1800);
  }
  async function torch(sc, b) { const tr = sc.stream?.getVideoTracks()[0]; if (!tr) return; sc.t = !sc.t; try { await tr.applyConstraints({ advanced: [{ torch: sc.t }] }); b.classList.toggle("on", sc.t); b.setAttribute("aria-label", sc.t ? "Slökkva á ljósi" : "Kveikja á ljósi"); } catch (e) { sc.t = !sc.t; } }
  function closeScanner() {
    if (!SC) return; const sc = SC; SC = null; sc.on = false; sc.stream?.getTracks().forEach(t => t.stop()); sc.w.remove(); document.body.classList.remove("qropen");
    sc.opts.onClose?.();
  }
  const refreshPanel = () => { if (!SC?.opts.panel) return; const p = SC.w.querySelector(".qrpanel"), man = p.querySelector(".qrman"); p.innerHTML = SC.opts.panel(); p.append(man); };

  /* ---------- Frjáls skönnun → eintaksspjald ---------- */
  const lagerOn = () => salaOn() && can() && VR().some(v => isSalaV(v) && !["pakki", "vinna"].includes(v.tegund));
  // 2.106.0: óþekkt strikamerki → „Stofna vöru“ (vöruformið opnast með strikamerkið útfyllt; heiti, flokkur og verð slegin inn)
  const canNew = () => salaOn() && can() && !!api()?.varaForm;
  const isBar = c => /^\d{8,14}$/.test(String(c || ""));
  const unkHTML = c => c ? `<div class="qrunk"><span><small>Óþekkt strikamerki</small><b>${E(c)}</b></span><button type="button" class="btn primary" data-q="new">Stofna vöru</button></div>` : "";
  const newVara = (code, onSaved, onCancel) => api().varaForm("sala", null, { strikamerki: code, onSaved, onCancel });
  function scanFree() {
    const sl = salaOn(); let unk = "";
    openScanner({ title: sl ? "Skanna" : "Skanna eintak", sup: sl ? "QR og strikamerki" : "QR-skanni",
      panel: lagerOn() || canNew() ? () => unkHTML(unk) + (lagerOn() ? `<div class="qrmodes"><button type="button" class="btn" data-q="m:tal">Talning á lager</button><button type="button" class="btn" data-q="m:mot">Vörumóttaka</button></div>` : "") : null,
      onPanel: q => { if (q === "m:tal" || q === "m:mot") { closeScanner(); setTimeout(() => scanLager(q.slice(2)), 60); }
        if (q === "new" && unk) { const c = unk; closeScanner(); newVara(c, id => { const v = VR().find(x => String(x.id) === String(id)); if (v) openVara(v); }, () => scanFree()); } },
      onCode: nr => { const f = findE(nr); if (f) { closeScanner(); openCard(nr); return { ok: true }; }
        const v = findV(nr); if (v) { closeScanner(); openVara(v); return { ok: true, msg: v.heiti }; }
        if (canNew() && isBar(nr)) { unk = nr; refreshPanel(); return { ok: false, msg: "Óþekkt strikamerki " + nr }; }
        return { ok: false, msg: (sl ? "Óþekkt númer " : "Fann ekki eintakið ") + nr }; } });
  }
  window.qrScan = scanFree;
  function openVara(v) { try { tab = isSalaV(v) ? "svorur" : "lvorur"; DETAIL = null; } catch (x) {} render(); openDetail("vara:" + v.id); }
  // Skanni sem skilar einum kóða (t.d. til að fylla strikamerki á vöruformi)
  window.qrScanCode = (cb, title) => openScanner({ title: title || "Skanna strikamerki", sup: "Strikamerki", ph: "…eða sláðu inn strikamerkið", onCode: c => { closeScanner(); cb(String(c).trim()); return { ok: true }; } });

  /* ---------- Talning og vörumóttaka með skanna (söluvörur, 2.105.0) ---------- */
  // Hver skönnun hækkar talið magn vörunnar um 1; magnið má leiðrétta. „Vista“ skráir lagerhreyfingu á hverja vöru (Talning / Móttekið).
  function scanLager(mode, keep) {
    const tal = mode === "tal", C = keep?.C || new Map(), order = keep?.order || []; let unk = "";
    const set = (id, n) => { if (!C.has(id)) order.unshift(id); C.set(id, Math.max(0, n)); };
    const panel = () => { const rows = order.map(id => ({ v: VR().find(x => String(x.id) === id), n: C.get(id) })).filter(r => r.v);
      return unkHTML(unk) + `<div class="qrprog"><div><b>${rows.length} ${rows.length === 1 ? "vara" : "vörur"}</b> · ${rows.reduce((a, r) => a + r.n, 0)} ${tal ? "talið" : "móttekið"}</div></div>
        <div class="qrlist">${rows.length ? rows.map(({ v, n }) => { const ink = (v.innkaup || []).find(x => x.stada === "Pantað");
          return `<div class="qrli full"><span class="qrnm"><b>${E(v.heiti)}</b><small>${E(v.nr || "")} · ${tal ? "skráð á lager " + (+v.fjoldi || 0) + (n !== (+v.fjoldi || 0) ? ` · <span class="${n < (+v.fjoldi || 0) ? "t-amb" : ""}">${n - (+v.fjoldi || 0) > 0 ? "+" : "−"}${Math.abs(n - (+v.fjoldi || 0))}</span>` : " · passar") : "á lager " + (+v.fjoldi || 0) + " → " + ((+v.fjoldi || 0) + n) + (ink ? " · " + E(ink.nr) + ": " + ink.magn + " pantað" : "")}</small></span>
            <span class="qrcnt"><button type="button" data-q="h:${E(v.id)}:-1" aria-label="Færri ${E(v.heiti)}">−</button><span class="qrn">${n}</span><button type="button" data-q="h:${E(v.id)}:1" aria-label="Fleiri ${E(v.heiti)}">+</button></span></div>`; }).join("")
          : `<div class="qrli"><span class="qrnm"><small>${tal ? "Skannaðu hverja vöru eins oft og stykkin eru, eða skannaðu einu sinni og stilltu fjöldann með + og −. Aðeins vörur sem eru skannaðar breytast." : "Skannaðu vörurnar sem komu. Lagerinn hækkar og opin innkaupapöntun vörunnar merkist móttekin þegar allt er komið."}</small></span></div>`}</div>
        ${rows.length ? `<button type="button" class="btn primary qrdone" data-q="save">${tal ? "Vista talningu" : "Skrá móttöku"} (${rows.length} ${rows.length === 1 ? "vara" : "vörur"})</button>` : ""}`; };
    openScanner({ title: tal ? "Talning á lager" : "Vörumóttaka", sup: "Söluvörur", last: keep?.last, ph: "…eða sláðu inn vörunúmer eða strikamerki", panel,
      onCode: c => { const v = findV(c); if (!v) { if (canNew() && isBar(c)) { unk = c; refreshPanel(); return { ok: false, msg: "Óþekkt strikamerki " + c }; } return { ok: false, msg: "Óþekkt " + c }; }
        if (unk) unk = "";
        if (!isSalaV(v)) return { ok: false, msg: v.heiti + " er leigubúnaður" };
        set(String(v.id), (C.get(String(v.id)) || 0) + 1); refreshPanel(); return { ok: true, msg: v.heiti + " · " + C.get(String(v.id)) }; },
      onPanel: async q => {
        if (q.startsWith("h:")) { const [, id, d] = q.split(":"); set(id, (C.get(id) || 0) + +d); refreshPanel(); return; }
        // Ný vara: talningin/móttakan heldur áfram eftir að varan er vistuð – nýja varan komin á listann með 1 stk.
        if (q === "new" && unk) { const c = unk; closeScanner(); newVara(c, id => { set(String(id), (C.get(String(id)) || 0) + 1); scanLager(mode, { C, order, last: c }); }, () => scanLager(mode, { C, order })); return; }
        if (q !== "save" || !C.size) return;
        const dags = nowIso(), who = me(), done = [];
        await saveSnapshot(s => { (s.vorur || []).forEach(x => { const id = String(x.id); if (!C.has(id)) return; const n = C.get(id), f0 = +x.fjoldi || 0; x.hreyfingar = x.hreyfingar || [];
          if (tal) { x.fjoldi = n; x.hreyfingar.push({ dags, teg: "Talning", magn: n - f0, stada: n, af: who, ref: "Skönnun" }); done.push(x.heiti); return; }
          if (!n) return; x.fjoldi = f0 + n; const ink = (x.innkaup || []).filter(y => y.stada === "Pantað").sort((a, b) => String(a.dags).localeCompare(String(b.dags)))[0];
          if (ink && n >= (+ink.magn || 0)) { ink.stada = "Móttekið"; ink.mott = dags; }
          x.hreyfingar.push({ dags, teg: "Móttekið", ref: ink ? ink.nr + (ink.birgir ? " " + ink.birgir : "") : "Skönnun", magn: n, stada: x.fjoldi, af: who }); done.push(x.heiti); }); }).catch(e => { toast?.("Vistaðist ekki: " + (e?.message || e)); throw e; });
        closeScanner(); toast?.((tal ? "Talning vistuð: " : "Móttekið á lager: ") + done.length + (done.length === 1 ? " vara" : " vörur")); render(); } });
  }
  window.qrScanLager = scanLager;

  /* ---------- Eintaksspjald ---------- */
  let CARD = null;
  function cardHTML(nr) {
    const f = findE(nr); if (!f) return `<div class="qrcd"><p>Eintakið ${E(nr)} fannst ekki.</p></div>`;
    const { v, e } = f, sk = e.stada || "ok", u = e.uti, P = u ? PN().find(x => String(x.id) === String(u.p)) : null;
    const opn = (v.skemmdir || []).filter(x => x.eintak === e.nr && x.stada !== "lokid");
    const where = u ? `<div class="qrwhere out"><small>Staðsetning</small><b>Úti · ${E(u.nr || P?.nr || "pöntun")}</b><span>${E(P?.tengilidur || P?.vidskiptavinur || "")}${P?.til ? " · skil " + E(dIS(P.til)) : ""}</span>${P ? `<button type="button" class="ulink" data-c="pn:${E(P.id)}">Opna pöntun →</button>` : ""}</div>`
      : `<div class="qrwhere"><small>Staðsetning</small><b>Á lager${e.hilla || v.hilla ? " · hilla " + E(e.hilla || v.hilla) : ""}</b></div>`;
    const ed = can();
    // Næsta skref eftir samhengi (2.48.0): skila inn á pöntunina sem það er úti á, afhenda á næstu pöntun sem vantar svona hlut, eða merkja í lagi
    const nx = !ed ? null : u && P && ["Afhent", "Skilað"].includes(P.stada) ? { c: "ctx:inn:" + P.id, l: "Skila inn á " + (P.nr || "pöntun"), s: (P.tengilidur || P.vidskiptavinur || "") }
      : !u && sk === "ok" ? (() => { const Q = nextOrderFor(v); return Q ? { c: "ctx:ut:" + Q.id, l: "Afhenda á " + (Q.nr || "pöntun"), s: [Q.tengilidur || Q.vidskiptavinur, Q.fra ? dIS(Q.fra) : ""].filter(Boolean).join(" · ") } : null; })()
      : sk !== "ok" ? { c: "st:ok", l: "Merkja í lagi", s: ST_E[sk] + " núna" } : null;
    return `<div class="qrcd"><div class="qrch"><div><div class="qrsup">${E(v.nr || "")} · ${E(v.flokkur || v.tegund || "Búnaður")}</div><h2>${E(e.nr)}</h2><div class="qrsub">${E(v.heiti || "")}</div></div><span class="pill ${sk === "ok" ? "pc-teal" : "pc-amber"}">${E(ST_E[sk] || sk)}</span></div>
      ${where}
      ${nx ? `<button type="button" class="btn primary qrnx" data-c="${E(nx.c)}"><span>${E(nx.l)}</span>${nx.s ? `<small>${E(nx.s)}</small>` : ""}</button>` : ""}
      ${opn.length ? `<div class="qrdm"><small>Opnar skemmdir</small>${opn.map(x => `<div>${E(x.lysing || "")} <span>${E(dIS(x.dags))}${x.ref ? " · " + E(x.ref) : ""}</span>${x.mynd?.url ? ` <a href="${E(x.mynd.url)}" target="_blank" rel="noopener">Mynd ↗</a>` : ""}</div>`).join("")}</div>` : ""}
      ${ed ? `<div class="qrsec"><small>Ástand</small><div class="qrseg" role="group" aria-label="Ástand eintaks">${Object.entries(ST_E).map(([k, l]) => `<button type="button" data-c="st:${k}" aria-pressed="${k === sk}">${E(l)}</button>`).join("")}</div></div>
      <form class="qrsec qrdmf" data-c="dmgform"><label for="qrdl"><small>Skrá skemmd</small></label><div><input id="qrdl" type="text" placeholder="t.d. rifið grill að framan"><label class="btn qrcamb" title="Taka mynd" aria-label="Taka mynd af skemmdinni"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><input type="file" id="qrdf" accept="image/*" capture="environment" hidden></label><button type="submit" class="btn">Skrá</button></div><div class="qrdfn" id="qrdfn" aria-live="polite"></div></form>` : ""}
      <div class="qract"><button type="button" class="btn${nx ? "" : " primary"}" data-c="next">${ICON}Skanna næsta</button><button type="button" class="ulink qrlink" data-c="vara">Opna búnaðinn</button>${matchMedia("(min-width:1024px)").matches ? `<button type="button" class="btn" data-c="print">Prenta merki</button>` : ""}</div></div>`;
  }
  function openCard(nr) {
    closeCard();
    const w = document.createElement("div"); w.className = "qrcard"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", "Eintak " + nr);
    w.innerHTML = `<div class="qrscrim" data-c="close"></div><div class="qrsheet"><div class="grab" aria-hidden="true"></div><button type="button" class="qrx" data-c="close" aria-label="Loka"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="qrbody">${cardHTML(nr)}</div></div>`;
    document.body.append(w); CARD = { w, nr };
    const redraw = () => { if (CARD?.w === w) w.querySelector(".qrbody").innerHTML = cardHTML(nr); };
    w.addEventListener("change", e => { if (e.target.id !== "qrdf") return; const f0 = e.target.files?.[0]; const n = w.querySelector("#qrdfn"); if (n) n.textContent = f0 ? "Mynd tilbúin: " + f0.name : ""; });
    w.addEventListener("submit", async e => { e.preventDefault(); const i = w.querySelector("#qrdl"), file = w.querySelector("#qrdf")?.files?.[0]; let l = i?.value.trim(); if (!l && !file) return; if (!l) l = "Skemmd (sjá mynd)"; const f = findE(nr); if (!f) return;
      // Mynd (2.48.0): vistuð í Skemmdir-möppu fyrirtækisins á SharePoint/OneDrive – aðeins tengill í gögnunum
      let mynd = null;
      if (file) { const btn = w.querySelector(".qrdmf [type=submit]"); if (btn) { btn.disabled = true; btn.textContent = "Vista…"; }
        try { if (!(window.MS && MS.on && MS.on()) || !window.msSaveFile) throw new Error("ekki tengt");
          const ext = ((file.name || "").split(".").pop() || "jpg").toLowerCase(), dir = (ORG.od?.stofa || ORG.od?.mitt || "Atrium") + "/Skemmdir/" + new Date().getFullYear();
          const it = await msSaveFile(dir, nr + " " + nowIso().slice(0, 16).replace("T", " ").replace(":", "") + "." + ext, file, file.type || "image/jpeg", false);
          mynd = { url: it?.webUrl || "", nafn: it?.name || file.name };
        } catch (x) { toast?.("Myndin vistaðist ekki (tengstu Microsoft) – skemmdin er skráð án myndar"); } }
      await saveV(f.v.id, x => { const q = (x.eintok || []).find(y => y.nr === nr); (x.skemmdir = x.skemmdir || []).push({ id: (crypto.randomUUID?.() || String(Date.now())).replace(/-/g, ""), eintak: nr, lysing: l, ref: q?.uti?.nr || "", dags: nowIso().slice(0, 10), af: me(), stada: "opin", ...(mynd ? { mynd } : {}) }); if (q && (!q.stada || q.stada === "ok")) q.stada = "skodun"; });
      toast?.("Skemmd skráð á " + nr + (mynd ? " með mynd" : "")); redraw(); });
    w.addEventListener("click", async e => { const b = e.target.closest("[data-c]"); if (!b || b.tagName === "FORM") return; const [k, a] = b.dataset.c.split(/:(.*)/s);
      if (k === "close") return closeCard();
      if (k === "next") { closeCard(); return scanFree(); }
      if (k === "ctx") { const [dir, pid] = a.split(":"); const r = await applyScan(pid, dir, nr); toast?.(r.msg); return redraw(); }
      if (k === "st") { const f = findE(nr); if (!f) return; await saveV(f.v.id, x => { const q = (x.eintok || []).find(y => y.nr === nr); if (q) q.stada = a; }); toast?.(nr + ": " + ST_E[a]); return redraw(); }
      if (k === "vara") { const f = findE(nr); closeCard(); if (f) { try { tab = "lvorur"; DETAIL = null; } catch (x) {} render(); openDetail("vara:" + f.v.id); } return; }
      if (k === "pn") { closeCard(); try { tab = "pantanir"; DETAIL = null; } catch (x) {} render(); openDetail("tb:" + a); return; }
      if (k === "print") { const f = findE(nr); if (f) printLabels(f.v, [f.e]); } });
    w.addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); closeCard(); } });
    setTimeout(() => w.querySelector(".qrx")?.focus(), 30);
  }
  function closeCard() { if (CARD) { CARD.w.remove(); CARD = null; } }
  window.qrOpenEintak = nr => { if (!findE(nr)) return false; openCard(nr); return true; };

  /* ---------- Prentun merkja ---------- */
  const qrLib = () => window.qrcode ? Promise.resolve() : new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = "lib/qrcode.js"; sc.onload = ok; sc.onerror = no; document.head.append(sc); });
  function printLabels(v, es) {
    const w = window.open("", "_blank"); if (!w) { toast?.("Leyfðu sprettiglugga til að prenta merki"); return; }
    qrLib().then(() => { const svg = u => { const q = qrcode(0, "M"); q.addData(u); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); }, base = appBase();
      w.document.write(`<!doctype html><meta charset="utf-8"><title>QR-merki ${E(v.nr || "")}</title><style>body{font-family:Poppins,Arial,sans-serif;margin:12mm}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}.l{border:1px solid #ccc;border-radius:3mm;padding:3mm;display:flex;gap:3mm;align-items:center;break-inside:avoid}.l b{display:block;font-size:12pt}.l small{font-size:9pt;color:#555}.q{width:22mm;height:22mm;flex:none}.q svg{width:100%;height:100%;display:block}@media print{button{display:none}}</style><button onclick="print()">Prenta</button><div class="g">${es.map(e => `<div class="l"><div class="q">${svg(base + "?e=" + encodeURIComponent(e.nr))}</div><div><b>${E(e.nr)}</b><small>${E(v.heiti || "")}<br>${E(ORG.nafn || "")}</small></div></div>`).join("")}</div>`);
      w.document.close(); }).catch(() => { w.close(); toast?.("Gat ekki búið til QR-merki"); });
  }

  /* ---------- Skönnun út og inn á pöntun ---------- */
  // Næsta pöntun sem þarf svona hlut (Ný/Staðfest, afhending frá í gær til eftir 3 daga, ekki fullskannað út)
  function nextOrderFor(v) {
    const t0 = new Date(); t0.setDate(t0.getDate() - 1); const t1 = new Date(); t1.setDate(t1.getDate() + 3);
    const a = t0.toISOString().slice(0, 10), b = t1.toISOString().slice(0, 10);
    return PN().filter(P => ["Ný", "Staðfest"].includes(P.stada) && P.fra && String(P.fra).slice(0, 10) >= a && String(P.fra).slice(0, 10) <= b)
      .filter(P => { const r = orderState(P, "ut").rows.find(x => x.id === String(v.id)); return r && r.eint && r.got < r.magn; })
      .sort((x, y) => String(x.fra).localeCompare(String(y.fra)))[0] || null;
  }
  // Eitt eintak skannað út eða inn á pöntun (notað af skannanum og samhengishnappnum á eintaksspjaldinu)
  async function applyScan(pid, dir, nr) {
    const out = dir === "ut", P = PN().find(x => String(x.id) === String(pid)); if (!P) return { ok: false, msg: "Pöntunin fannst ekki" };
    const f = findE(nr); if (!f) return { ok: false, msg: "Óþekkt eintak " + nr };
    const row = need(P, dir).find(x => x.id === String(f.v.id)); if (!row) return { ok: false, msg: f.v.heiti + " er ekki á pöntuninni" };
    const s0 = orderState(P, dir); if (s0.list.includes(nr)) return { ok: false, msg: nr + " er þegar skannað" };
    const r0 = s0.rows.find(x => x.id === row.id); if (r0 && r0.got >= r0.magn) return { ok: false, msg: "Komin nóg af " + f.v.heiti + " (" + r0.magn + ")" };
    if (out && f.e.uti && String(f.e.uti.p) !== String(P.id)) return { ok: false, msg: nr + " er úti á " + (f.e.uti.nr || "annarri pöntun") };
    if (out && f.e.stada && f.e.stada !== "ok") return { ok: false, msg: nr + ": " + ST_E[f.e.stada] + " – ekki afhenda" };
    if (!can()) return { ok: true, msg: nr };
    await saveSnapshot(S0 => { const Q = (S0.pantanir || []).find(x => String(x.id) === String(P.id)); if (!Q) return; Q.skann = Q.skann || {}; (Q.skann[dir] = Q.skann[dir] || []).push(nr); Q.skann[dir + "Dags"] = nowIso(); Q.skann.af = me();
      const V = (S0.vorur || []).find(x => String(x.id) === String(f.v.id)), e = V?.eintok?.find(y => y.nr === nr); if (e) { if (out) e.uti = { p: P.id, nr: P.nr || "", dags: nowIso().slice(0, 10) }; else delete e.uti; } }).catch(() => {});
    // allt komið: pöntunin færist í Afhent / Skilað
    const P2 = PN().find(x => String(x.id) === String(pid)), s2 = P2 ? orderState(P2, dir) : null, nxS = out ? "Afhent" : "Skilað";
    if (s2 && s2.done >= s2.tot && P2.stada !== nxS && P2.stada !== "Lokið") { try { doAct("tbst:" + P2.id + ":" + nxS); } catch (e) {} return { ok: true, msg: nr + " · " + (P2.nr || "") + " " + (out ? "afhent" : "skilað") + " – allt komið" }; }
    return { ok: true, msg: nr + (out ? " afhent á " : " skilað inn á ") + (P.nr || "pöntun") + (s2 ? " · " + s2.done + " af " + s2.tot : "") };
  }
  function orderState(P, dir) {
    const N = need(P, dir), sk = P.skann || {}, list = sk[dir] || [], H = sk[dir + "H"] || {}, T = dir === "ut" ? P.tinslaH || {} : {};   // 2.105.0: það sem var pakkað telst skannað út
    const rows = N.map(x => { const got = x.eint ? list.filter(nr => (x.v?.eintok || []).some(e => e.nr === nr)).length : Math.max(+H[x.id] || 0, +T[x.id] || 0); return { ...x, got: Math.min(got, x.magn), over: Math.max(0, got - x.magn) }; });
    const tot = rows.reduce((a, r) => a + r.magn, 0), done = rows.reduce((a, r) => a + r.got, 0);
    return { rows, tot, done, list };
  }
  // Söluvara (eða vara án eintaka) skönnuð á pöntun: talning línunnar hækkar um 1 (2.105.0). fld: "utH" | "innH" | "tinslaH"
  function scanQty(P, v, rows, fld, save) {
    const r = rows.find(x => x.id === String(v.id));
    if (!r) return { ok: false, msg: v.heiti + " er ekki á pöntuninni" };
    if (r.eint) return { ok: false, msg: v.heiti + ": skannaðu merki eintaksins" };
    if (r.got >= r.magn) return { ok: false, msg: "Komin nóg af " + v.heiti + " (" + r.magn + ")" };
    const n = r.got + 1;
    if (can()) save(Q => { if (fld === "tinslaH") Q.tinslaH = { ...(Q.tinslaH || {}), [r.id]: n }; else { Q.skann = Q.skann || {}; Q.skann[fld] = { ...(Q.skann[fld] || {}), [r.id]: n }; Q.skann[fld.slice(0, -1) + "Dags"] = nowIso(); Q.skann.af = me(); } });
    return { ok: true, msg: v.heiti + " · " + n + " af " + r.magn };
  }
  function scanOrder(pid, dir, onDone) {  // onDone (2.58.0): afhendingarferli – kallað í stað þess að breyta stöðu
    const P0 = PN().find(x => String(x.id) === String(pid)); if (!P0) return;
    const out = dir === "ut", ed = can();
    const panel = () => { const P = PN().find(x => String(x.id) === String(pid)) || P0, s = orderState(P, dir);
      return `<div class="qrprog"><div><b>${s.done} af ${s.tot}</b> ${out ? "skannað út" : "skannað inn"}</div><div class="qrbar"><i style="width:${s.tot ? Math.round(s.done / s.tot * 100) : 0}%"></i></div></div>
        <div class="qrlist">${s.rows.map(r => `<div class="qrli${r.got >= r.magn ? " full" : ""}"><span class="qrck" aria-hidden="true">${r.got >= r.magn ? "✓" : ""}</span><span class="qrnm"><b>${E(r.heiti)}</b><small>${E(r.nr)}${r.eint ? " · skannað" : r.sala ? " · söluvara – skannaðu eða teldu" : " · engin eintök – talið"}</small></span>${r.eint ? `<span class="qrn">${r.got} / ${r.magn}</span>` : `<span class="qrcnt"><button type="button" data-q="h:${E(r.id)}:-1" aria-label="Færri ${E(r.heiti)}"${ed ? "" : " disabled"}>−</button><span class="qrn">${r.got} / ${r.magn}</span><button type="button" data-q="h:${E(r.id)}:1" aria-label="Fleiri ${E(r.heiti)}"${ed ? "" : " disabled"}>+</button></span>`}</div>`).join("")}</div>
        ${ed ? `<button type="button" class="btn primary qrdone" data-q="finish">${onDone ? (s.done >= s.tot ? (out ? "Afhenda – áfram í kvittun" : "Taka á móti – áfram í kvittun") : (out ? "Afhenda samt" : "Taka á móti samt") + ` (${s.tot - s.done} vantar)`) : s.done >= s.tot ? (out ? "Ljúka og merkja afhent" : "Ljúka og merkja skilað") : "Ljúka"}</button>` : ""}`; }; // 2.88.1: skýrara að hægt er að afhenda þótt ekki sé allt skannað
    openScanner({ title: (out ? "Skanna út · " : "Skanna inn · ") + (P0.nr || ""), sup: P0.tengilidur || P0.vidskiptavinur || "Pöntun", panel,
      onCode: nr => {
        const P = PN().find(x => String(x.id) === String(pid)); if (!P) return { ok: false, msg: "Pöntunin fannst ekki" };
        const f = findE(nr); if (!f) { const v = findV(nr); if (v) return scanQty(P, v, orderState(P, dir).rows, dir + "H", fn => saveSnapshot(S0 => { const Q = (S0.pantanir || []).find(x => String(x.id) === String(P.id)); if (Q) fn(Q); }).then(refreshPanel).catch(() => {})); return { ok: false, msg: "Óþekkt " + nr }; }
        const N = need(P, dir), row = N.find(x => x.id === String(f.v.id));
        if (!row) return { ok: false, msg: f.v.heiti + " er ekki á pöntuninni" };
        const s = orderState(P, dir); if (s.list.includes(nr)) return { ok: false, msg: nr + " er þegar skannað" };
        const r = s.rows.find(x => x.id === row.id); if (r && r.got >= r.magn) return { ok: false, msg: "Komin nóg af " + f.v.heiti + " (" + r.magn + ")" };
        if (out && f.e.uti && String(f.e.uti.p) !== String(P.id)) return { ok: false, msg: nr + " er úti á " + (f.e.uti.nr || "annarri pöntun") };
        if (out && f.e.stada && f.e.stada !== "ok") return { ok: false, msg: nr + ": " + ST_E[f.e.stada] + " – ekki afhenda" };
        if (!ed) return { ok: true, msg: nr };
        saveSnapshot(S0 => { const Q = (S0.pantanir || []).find(x => String(x.id) === String(P.id)); if (!Q) return; Q.skann = Q.skann || {}; (Q.skann[dir] = Q.skann[dir] || []).push(nr); Q.skann[dir + "Dags"] = nowIso(); Q.skann.af = me();
          const V = (S0.vorur || []).find(x => String(x.id) === String(f.v.id)), e = V?.eintok?.find(y => y.nr === nr); if (e) { if (out) e.uti = { p: P.id, nr: P.nr || "", dags: nowIso().slice(0, 10) }; else delete e.uti; } }).then(refreshPanel).catch(() => {});
        return { ok: true, msg: nr + " · " + f.v.heiti };
      },
      onPanel: async (q, b) => {
        const P = PN().find(x => String(x.id) === String(pid)); if (!P) return;
        if (q.startsWith("h:")) { const [, id, d] = q.split(":"); const s = orderState(P, dir), r = s.rows.find(x => x.id === id); if (!r) return; const n = Math.max(0, Math.min(r.magn, r.got + +d));
          await saveSnapshot(S0 => { const Q = (S0.pantanir || []).find(x => String(x.id) === String(P.id)); if (!Q) return; Q.skann = Q.skann || {}; Q.skann[dir + "H"] = { ...(Q.skann[dir + "H"] || {}), [id]: n }; Q.skann[dir + "Dags"] = nowIso(); }).catch(() => {}); refreshPanel(); return; }
        if (q === "finish") { const s = orderState(P, dir);
          if (onDone) { if (s.done < s.tot && !(await askMiss(out, s, "Halda áfram án þeirra"))) return; closeScanner(); onDone(s.done >= s.tot); return; }
          if (s.done >= s.tot) { const nx = out ? "Afhent" : "Skilað"; closeScanner(); if (P.stada !== nx && P.stada !== "Lokið") { try { doAct("tbst:" + P.id + ":" + nx); } catch (e) {} } toast?.((P.nr || "Pöntun") + ": " + (out ? "allt skannað út" : "allt komið inn")); return; }
          if (await askMiss(out, s, "Ljúka samt", "Pöntunin helst í núverandi stöðu.")) closeScanner(); }
      } });
  }
  window.qrScanOrder = scanOrder;
  // 2.73.0: listi yfir það sem vantar þegar ekki allt er skannað – eigið spjald (læsilegt í síma) í stað confirm()
  function askMiss(out, s, okL, note) {
    return new Promise(res => {
      const rows = s.rows.filter(r => r.got < r.magn), n = rows.reduce((a, r) => a + (r.magn - r.got), 0);
      const w = document.createElement("div"); w.className = "qmiss"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true");
      w.innerHTML = `<div class="qmb"><div class="qmh"><b>${out ? "Ekki allt skannað út" : "Vantar enn inn"}</b><span>${n} ${n === 1 ? "eining" : "einingar"} í ${rows.length} ${rows.length === 1 ? "línu" : "línum"} · ${s.done} af ${s.tot} komið</span></div>
        <div class="qml">${rows.map(r => `<div class="qmr"><span class="qmn">${r.magn - r.got}</span><span class="qmt"><b>${E(r.heiti)}</b><small>${E(r.nr || "")}${r.got ? ` · ${r.got} af ${r.magn} skannað` : ""}</small></span></div>`).join("")}</div>
        ${note ? `<p class="qmnote">${E(note)}</p>` : ""}<div class="qma"><button type="button" class="btn primary" data-v="0">Halda áfram að skanna</button><button type="button" class="btn" data-v="1">${E(okL)}</button></div></div>`;
      const end = v => { w.remove(); res(v); };
      w.addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b) end(b.dataset.v === "1"); else if (e.target === w) end(false); });
      document.body.append(w); w.querySelector("[data-v='0']").focus();
    });
  }
  // Notað af pantanir2.js (2.55.0): tínslulisti og kvittanir
  window.qrAPI = { need, openScanner, closeScanner, findE, findV, scanQty, refreshPanel: () => refreshPanel(), orderState };

  // Kassi á pöntunarspjaldi: staða skönnunar + hnappar (sími og tölva)
  function orderBox(P) {
    const sO = orderState(P, "ut"), sI = orderState(P, "inn"), ed = can();
    const uti = ["Afhent"].includes(P.stada) || (sO.done && !["Skilað", "Lokið"].includes(P.stada));
    const btnO = ed && ["Ný", "Staðfest", "Afhent"].includes(P.stada) ? `<button type="button" class="btn${!uti ? " primary" : ""}" data-qrp="ut:${E(P.id)}">${ICON}Skanna út</button>` : "";
    const btnI = ed && ["Afhent", "Skilað"].includes(P.stada) ? `<button type="button" class="btn${uti ? " primary" : ""}" data-qrp="inn:${E(P.id)}">${ICON}Skanna inn</button>` : "";
    const missIn = sO.list.filter(nr => !sI.list.includes(nr));
    return `<div class="qrbox"><div class="qrbh"><b>Búnaður út og inn</b><span>${sO.done} / ${sO.tot} út · ${sI.done} / ${sI.tot} inn</span></div>`
      + `<div class="qrbars"><div class="qrbar"><i style="width:${sO.tot ? Math.round(sO.done / sO.tot * 100) : 0}%"></i></div><div class="qrbar in"><i style="width:${sI.tot ? Math.round(sI.done / sI.tot * 100) : 0}%"></i></div></div>`
      + (["Skilað", "Lokið"].includes(P.stada) && missIn.length ? `<div class="qrwarn">Ekki skannað inn: ${missIn.map(E).join(", ")}</div>` : "")
      + (btnO || btnI ? `<div class="qrbb">${btnO}${btnI}</div>` : "") + `</div>`;
  }

  /* ---------- Tengt inn í appið eftir hverja teikningu ---------- */
  const desk = () => matchMedia("(min-width:1024px)").matches;
  function headerBtn() {
    const hr = document.querySelector("header .hright"); let b = document.getElementById("qrhbtn");
    if (!on()) { b?.remove(); document.getElementById("qrsbtn")?.remove(); return; }
    if (hr && !b) { b = document.createElement("button"); b.type = "button"; b.id = "qrhbtn"; b.className = "iconbtn qrhbtn"; b.setAttribute("aria-label", "Skanna QR-merki"); b.title = "Skanna QR-merki"; b.innerHTML = ICON; b.onclick = scanFree; const sb = hr.querySelector("#searchbtn"); sb ? sb.before(b) : hr.prepend(b); }
    document.getElementById("qrsbtn")?.remove(); // 2.50.9: enginn Skanna-hnappur í hliðarstiku í tölvu – „Nýtt“ er þar efst
  }
  function decorate() {
    headerBtn(); if (!on()) return;
    let D = null; try { D = DETAIL; } catch (e) {}
    const root = document.getElementById("view"); if (!root) return;
    // Pöntun með leigubúnaði: kassi með stöðu skönnunar
    if (D && String(D).startsWith("tb:")) {
      const id = String(D).slice(3), P = PN().find(x => String(x.id) === id);
      const host = root.querySelector(".spdet") || root;
      if (P && hasLeiga(P) && !host.querySelector(".qrbox")) {
        const anchor = host.querySelector(".utb") || [...host.querySelectorAll(".viewtitle")].find(x => /^Línur/.test(x.textContent.trim())) || host.querySelector(".ukps");
        const html = orderBox(P);
        if (anchor) anchor.insertAdjacentHTML("beforebegin", html); else host.insertAdjacentHTML("beforeend", html);
      }
    }
    // Vara á síma: eintakalisti (í tölvu er hann í flipanum Eintök)
    if (D && String(D).startsWith("vara:") && !desk() && !document.body.classList.contains("simi1") && !root.querySelector(".qreint")) {  // símaútlit I: flipinn Eintök úr tölvunni

      const v = VR().find(x => String(x.id) === String(D).slice(5));
      if (v && (v.tegund === "leiga" || (v.eintok || []).length) && v.tegund !== "pakki" && window.u1VaraEintok) {
        const at = [...root.querySelectorAll(".viewtitle")].find(x => /^(Útleiga|Lýsing)/.test(x.textContent.trim()));
        const h = `<section class="qreint"><div class="viewtitle">Eintök og QR</div>${u1VaraEintok(v)}</section>`;
        at ? at.insertAdjacentHTML("beforebegin", h) : root.insertAdjacentHTML("beforeend", h);
      }
    }
    // Eintök smellanleg (opnar eintaksspjaldið)
    root.querySelectorAll(".uer2:not([data-qe])").forEach(r => { const nr = [...r.children].map(c => c.textContent.trim()).find(t => t && findE(t)); if (nr) { r.dataset.qe = nr; r.classList.add("qrtap"); r.title = "Opna eintak " + nr;
      const u = findE(nr)?.e.uti; if (u && !r.querySelector(".qruti")) { const c = [...r.children].find(c => c.textContent.trim() === nr); c?.insertAdjacentHTML("beforeend", ` <span class="qruti">úti · ${E(u.nr || "")}</span>`); } } });
  }
  document.addEventListener("click", e => {
    if (!on()) return;
    const p = e.target.closest("[data-qrp]"); if (p) { e.preventDefault(); const [d, id] = p.dataset.qrp.split(":"); scanOrder(id, d); return; }
    const sc = e.target.closest('[data-act="u1scan:"]'); if (sc) { e.preventDefault(); e.stopImmediatePropagation(); scanFree(); return; }
    const r = e.target.closest("[data-qe]"); if (r && !e.target.closest("select,button,a,input")) { openCard(r.dataset.qe); }
  }, true);
  const _render = window.render || render;
  function renderQ() { _render.apply(this, arguments); try { decorate(); } catch (e) { console.warn("qr", e); } }
  window.render = renderQ; try { render = renderQ; } catch (e) {}

  // ?e=<eintak> í slóð (skannað með myndavél símans): spjaldið opnast þegar gögnin eru komin; slóðin hreinsuð
  (function () { const m = location.search.match(/[?&]e=([^&#]+)/); if (!m) return; const nr = decodeURIComponent(m[1]); let n = 0;
    const t = setInterval(() => { const s = st(); if (s && s.vorur) { clearInterval(t); if (!on()) return; if (window.qrOpenEintak(nr)) { try { const u = new URL(location.href); u.searchParams.delete("e"); history.replaceState(history.state, "", u.pathname + u.search + u.hash); } catch (e) {} } else toast?.("Fann ekki eintakið " + nr); } else if (++n > 80) clearInterval(t); }, 400); })();
  // ?v=<vörunr> (QR-merki söluvöru, 2.105.0): vöruspjaldið opnast
  (function () { const m = location.search.match(/[?&]v=([^&#]+)/); if (!m) return; const nr = decodeURIComponent(m[1]); let n = 0;
    const t = setInterval(() => { const s = st(); if (s && s.vorur) { clearInterval(t); if (!on()) return; const v = findV(nr); if (v) { openVara(v); try { const u = new URL(location.href); u.searchParams.delete("v"); history.replaceState(history.state, "", u.pathname + u.search + u.hash); } catch (e) {} } else toast?.("Fann ekki vöruna " + nr); } else if (++n > 80) clearInterval(t); }, 400); })();
  // QR-merki á söluvöru (fyrir vörur án strikamerkis): slóð appsins + ?v=<vörunúmer>
  window.qrPrintVara = (v, n) => { const w = window.open("", "_blank"); if (!w) { toast?.("Leyfðu sprettiglugga til að prenta merki"); return; }
    qrLib().then(() => { const q = qrcode(0, "M"); q.addData(appBase() + "?v=" + encodeURIComponent(v.nr || v.id)); q.make(); const svg = q.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
      const one = `<div class="l"><div class="q">${svg}</div><div><b>${E(v.nr || "")}</b><small>${E(v.heiti || "")}<br>${E(ORG.nafn || "")}</small></div></div>`;
      w.document.write(`<!doctype html><meta charset="utf-8"><title>QR-merki ${E(v.nr || "")}</title><style>body{font-family:Poppins,Arial,sans-serif;margin:12mm}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}.l{border:1px solid #ccc;border-radius:3mm;padding:3mm;display:flex;gap:3mm;align-items:center;break-inside:avoid}.l b{display:block;font-size:12pt}.l small{font-size:9pt;color:#555}.q{width:22mm;height:22mm;flex:none}.q svg{width:100%;height:100%;display:block}.bar{display:flex;gap:10px;align-items:center;margin-bottom:8mm}@media print{.bar{display:none}}</style><div class="bar"><label>Fjöldi merkja <input id="n" type="number" min="1" max="300" value="${Math.max(1, Math.min(300, +n || 3))}" style="width:70px"></label><button onclick="print()">Prenta</button></div><div class="g" id="g"></div><script>const T=${JSON.stringify(one)};const d=()=>{document.getElementById("g").innerHTML=T.repeat(Math.max(1,Math.min(300,+document.getElementById("n").value||1)))};document.getElementById("n").oninput=d;d();<\/script>`);
      w.document.close(); }).catch(() => { w.close(); toast?.("Gat ekki búið til QR-merki"); }); };
  window.qrIsOn = on;
})();
