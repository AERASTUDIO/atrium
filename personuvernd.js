/* Persónuvernd (2.44.0): yfirlýsing í appinu um hvaða persónuupplýsingar Atrium geymir, og verkfæri fyrir admin til að
   sinna réttindum einstaklinga (GDPR / lög nr. 90/2018): finna allt um einstakling, flytja það út (aðgangur og flutningur, 15. og 20. gr.)
   og nafnhreinsa (eyðing, 17. gr.). Reikningar yngri en 7 ára haldast vegna bókhaldsskyldu (lög nr. 145/1994, 20. gr.).
   Stillingar uppsetningar (valfrjálst): ORG.personuvernd = { netfang, svaedi } – netfang vegna persónuverndar og hýsingarsvæði Firebase. */
(function () {
  if (typeof STPAGES === "undefined") return;
  const E = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PV = () => window.ORG?.personuvernd || {};
  const NAFNHR = "Nafnhreinsað";
  const SOFN = { verkefni: "Verkefni", vidskiptavinir: "Viðskiptavinir", tilbod: "Tilboð", pantanir: "Pantanir", reikningar: "Reikningar", fundir: "Fundir", skjol: "Skjöl",
    thraedir: "Póstþræðir", postar: "Póstar", kostnadur: "Kostnaður", vorur: "Vörulisti", timar: "Tímaskráning", stillingar: "Stillingar" };
  const lab = o => o?.nr ? [o.nr, o.heiti || o.stutt || o.name || o.kaupandi?.name || ""].filter(Boolean).join(" ") : (o?.name || o?.nafn || o?.heiti || o?.lysing || o?.efni || o?.date || o?.id || "");
  const fold = s => String(s || "").toLocaleLowerCase("is").normalize("NFC");
  const digits = s => String(s || "").replace(/\D/g, "");

  // Leit: strengir sem innihalda leitarorðið (eða sömu tölustafi, t.d. kennitala/sími með eða án bandstriks)
  const match = (v, q) => { if (typeof v !== "string" && typeof v !== "number") return false; const s = String(v), d = digits(q);
    return fold(s).includes(fold(q)) || (d.length >= 6 && digits(s).includes(d)); };
  const hasHit = (o, q) => { let hit = false; const walk = x => { if (hit || x == null) return; if (Array.isArray(x)) return x.forEach(walk); if (typeof x === "object") return Object.values(x).forEach(walk); if (match(x, q)) hit = true; }; walk(o); return hit; };
  function finna(q) {
    const R = {}; if (!q || q.trim().length < 3 || typeof S === "undefined" || !S) return R;
    Object.entries(S).forEach(([k, v]) => {
      if (k === "timar") { const fs = [...new Map([...(v?.faerslur || []), ...(v?.nyjast || [])].map(e => [e.id, e])).values()].filter(e => hasHit(e, q) || (e.starfsmadur && hasHit(window.starfName ? { n: starfName(e.starfsmadur) } : {}, q))); if (fs.length) R.timar = fs; return; }
      if (k === "stillingar") { const st = (v?.starfsmenn || []).filter(x => hasHit(x, q)); if (st.length) R.stillingar = st.map(x => ({ starfsmadur: x })); return; }
      if (Array.isArray(v)) { const xs = v.filter(o => hasHit(o, q)); if (xs.length) R[k] = xs; }
    });
    const nu = (window.nuUsers ? nuUsers() : []).filter(u => hasHit(u, q)); if (nu.length) R.notendur = nu;
    return R;
  }
  const fjoldi = R => Object.values(R).reduce((a, x) => a + x.length, 0);
  const sjo = () => { const x = new Date(); x.setFullYear(x.getFullYear() - 7); return x.toISOString().slice(0, 10); };
  const geymist = (k, o) => k === "reikningar" && String(o?.dags || "") >= sjo(); // bókhaldsskylda

  function utflutningur(q) {
    const R = finna(q); const out = { leit: q, utflutt: new Date().toISOString(), abyrgdaradili: window.ORG?.nafn || "", gogn: R };
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: "application/json" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "personuupplysingar-" + q.trim().replace(/[^\wÀ-ÿ]+/g, "-").slice(0, 40) + "-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast?.("Útflutningur vistaður á tækinu");
  }
  // Nafnhreinsun: hver strengur sem inniheldur leitarorðið er settur „Nafnhreinsað“ – nema í reikningum sem bókhaldslög krefjast að séu geymdir
  async function nafnhreinsa(q) {
    const R = finna(q), n = fjoldi(R) - (R.notendur || []).length; if (!n) return toast?.("Ekkert fannst til að nafnhreinsa");
    const held = (R.reikningar || []).filter(o => geymist("reikningar", o)).length;
    if (!confirm(`Nafnhreinsa „${q}“ í ${n - held} færslum?\n\nAllur texti sem inniheldur leitarorðið verður „${NAFNHR}“. Þetta er ekki hægt að afturkalla.` + (held ? `\n\n${held} reikningar yngri en 7 ára haldast óbreyttir vegna bókhaldsskyldu.` : "") + ((R.notendur || []).length ? `\n\nNotendaaðgangar breytast ekki – gerðu notandann óvirkan í Stillingar › Fólk.` : ""))) return;
    const scrub = x => { if (Array.isArray(x)) return x.map(scrub); if (x && typeof x === "object") { Object.keys(x).forEach(k => { x[k] = scrub(x[k]); }); return x; } return match(x, q) ? NAFNHR : x; };
    await saveSnapshot(s => {
      Object.entries(s).forEach(([k, v]) => {
        if (k === "timar") { ["faerslur", "nyjast"].forEach(f => (v?.[f] || []).forEach(e => { if (hasHit(e, q)) scrub(e); })); return; }
        if (k === "stillingar") { (v?.starfsmenn || []).forEach(x => { if (hasHit(x, q)) { x.nafn = NAFNHR; } }); return; }
        if (Array.isArray(v)) v.forEach(o => { if (hasHit(o, q) && !geymist(k, o)) { const id = o.id; scrub(o); if (id) o.id = id; } });
      });
      (s.persvernd = s.persvernd || []).push({ dags: new Date().toISOString(), adgerd: "nafnhreinsun", af: window.USER?.email || "", fjoldi: n - held });
    });
    toast?.("Nafnhreinsað í " + (n - held) + " færslum"); window._pvq = ""; render();
  }

  function yfirlysing() {
    const O = window.ORG || {}, pv = PV(), co = E(O.nafn || "fyrirtækið"), net = E(pv.netfang || O.admin?.email || "");
    const sec = (t, b) => `<div class="ush2"><span>${t}</span></div><div class="pvtxt">${b}</div>`;
    return `<div class="card ucard pvy">`
      + sec("Ábyrgðaraðili", `<p><b>${co}</b> ber ábyrgð á persónuupplýsingum í þessu appi.${net ? ` Fyrirspurnir og beiðnir: <a href="mailto:${net}">${net}</a>.` : ""} Atrium er þróað og rekið af AERA Studio ehf., sem er vinnsluaðili fyrir hönd ${co}.</p>`)
      + sec("Hvaða upplýsingar eru geymdar", `<ul>
        <li><b>Notendur:</b> nafn, netfang, hlutverk og hvenær síðast var skráð inn.</li>
        <li><b>Tímaskráning starfsfólks:</b> dagsetning, tími, verkefni og lýsing.</li>
        <li><b>Viðskiptavinir og tengiliðir:</b> nafn, kennitala, heimilisfang, netfang og sími – það sem þarf vegna tilboða, pantana og reikninga.</li>
        <li><b>Verkefnagögn:</b> fundir og þátttakendur, tenglar á skjöl og póstþræði sem tengdir eru verkefnum, spjall milli starfsfólks.</li></ul>`)
      + sec("Tilgangur og heimild", `<p>Til að halda utan um verkefni, tíma, tilboð, pantanir og reikninga. Heimildin er samningur við viðskiptavini og starfsfólk, lagaskylda (bókhald) og lögmætir hagsmunir af skipulagi vinnunnar (6. gr. reglugerðar (ESB) 2016/679 og 9. gr. laga nr. 90/2018).</p>`)
      + sec("Hvar gögnin eru", `<ul>
        <li><b>Google Firebase</b> (Firestore og innskráning) – gagnagrunnur ${co}${pv.svaedi ? ", hýstur í " + E(pv.svaedi) : ""}.</li>
        <li><b>Microsoft 365</b> – innskráning, skjöl á SharePoint/OneDrive og póstur. Appið les þau með heimild notandans; þau eru ekki afrituð í gagnagrunninn.</li>
        <li><b>GitHub Pages</b> – hýsir sjálft appið (kóðann). Engin gögn ${co} eru þar.</li></ul>
        <p>Appið notar engar rakningar, auglýsingar eða greiningartól. Letur og forritasöfn eru hýst í appinu sjálfu. Á tækinu geymist afrit af gögnunum svo appið virki án nets; það er hreinsað við útskráningu.${window.ON && ON("qr") ? " Myndavélin er aðeins notuð til að lesa QR-merki, á tækinu sjálfu – engar myndir eru vistaðar eða sendar." : ""}</p>`)
      + sec("Varðveisla", `<p>Reikningar og bókhaldsgögn eru geymd í 7 ár vegna bókhaldslaga. Önnur gögn eru geymd meðan þeirra er þörf vegna verkefna og viðskipta og er eytt eða þau nafnhreinsuð þegar þess er óskað og ekkert mælir gegn því.</p>`)
      + sec("Réttindi þín", `<p>Þú átt rétt á að fá að vita hvaða upplýsingar eru geymdar um þig og fá afrit af þeim, láta leiðrétta þær, láta eyða þeim eða takmarka vinnslu, og andmæla vinnslu. Hafðu samband við ${co}${net ? ` (<a href="mailto:${net}">${net}</a>)` : ""}. Þú getur einnig kvartað til <a href="https://www.personuvernd.is" target="_blank" rel="noopener">Persónuverndar</a>.</p>`)
      + `</div>`;
  }
  function verkfaeri() {
    const q = window._pvq || "", R = q.trim().length >= 3 ? finna(q) : null, n = R ? fjoldi(R) : 0;
    const res = !R ? `<div class="usub" style="padding:8px 0">Sláðu inn að minnsta kosti 3 stafi: nafn, netfang, síma eða kennitölu.</div>`
      : !n ? `<div class="usub" style="padding:8px 0">Ekkert fannst um „${E(q)}“.</div>`
      : Object.entries(R).map(([k, xs]) => `<div class="ush2"><span>${E(SOFN[k] || (k === "notendur" ? "Notendur" : k))} · ${xs.length}</span></div>` + xs.slice(0, 8).map(o => `<div class="uln"><span>${E(lab(o.starfsmadur || o) || "–")}${geymist(k, o) ? '<small> · geymist (bókhaldsskylda)</small>' : ""}</span></div>`).join("") + (xs.length > 8 ? `<div class="usub">+ ${xs.length - 8} í viðbót</div>` : "")).join("")
        + `<div class="links" style="margin-top:14px"><button type="button" class="btn primary" data-act="pvx:ut">Flytja út (JSON)</button><button type="button" class="btn danger" data-act="pvx:hreinsa">Nafnhreinsa…</button></div>`;
    const log = (S?.persvernd || []).slice(-5).reverse().map(x => `<div class="uln"><span>${E(String(x.dags).slice(0, 10))} · ${E(x.adgerd)}<small> · ${E(x.fjoldi)} færslur · ${E(x.af)}</small></span></div>`).join("");
    return `<div class="card ucard"><div class="ush2" style="margin-top:0"><span>Beiðni einstaklings (admin)</span></div>
      <p class="usub" style="margin:0 0 10px;font-size:13.5px">Þegar einstaklingur óskar eftir afriti af upplýsingum um sig eða að þeim sé eytt: finndu allt sem appið geymir um hann, fluttu það út eða nafnhreinsaðu. Skjöl á SharePoint og póstar í Outlook eru utan appsins og þarf að fara yfir þar.</p>
      <label class="spfilt" style="margin:0 0 6px!important"><input type="search" id="pvq" placeholder="Nafn, netfang, sími eða kennitala…" value="${E(q)}" aria-label="Leita að einstaklingi"></label>${res}
      ${log ? `<div class="ush2"><span>Síðustu aðgerðir</span></div>${log}` : ""}</div>`;
  }
  STPAGES.personuvernd = { l: "Persónuvernd", d: "Hvaða upplýsingar appið geymir, réttindi og beiðnir einstaklinga", s: [], fn: () => yfirlysing() + (window.can && can("stillingar") ? verkfaeri() : "") };

  document.addEventListener("input", e => { if (e.target.id !== "pvq") return; const pos = e.target.selectionStart; window._pvq = e.target.value; clearTimeout(window._pvt);
    window._pvt = setTimeout(() => { render(); const i = document.getElementById("pvq"); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) {} } }, 250); });
  window.ACT_EXT = window.ACT_EXT || {};
  window.ACT_EXT.pvx = (k, r) => { if (k !== "pvx") return; if (!can("stillingar")) { toast?.("Aðeins admin"); return true; } const q = window._pvq || "";
    if (r[0] === "ut") utflutningur(q); if (r[0] === "hreinsa") nafnhreinsa(q).catch(e => toast?.(errText ? errText(e) : String(e))); return true; };
})();
