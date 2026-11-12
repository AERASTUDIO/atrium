/* Fyrstu skref (2.121.0) – leiðsögn fyrir admin í nýrri uppsetningu.
   Spjald efst á Heim (og á upphafsskjánum í tölvu) þar til öll skrefin eru búin eða admin velur „Fela“.
   Skrefin eru metin út frá stillingunum sjálfum – ekkert er vistað nema þegar spjaldið er falið (stillingar.fyrstuSkref.falid). */
(function () {
  const E = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cfg = () => (typeof CFG === "function" ? CFG() : {}) || {};
  const adm = () => typeof can === "function" && can("stillingar") && !window.VIEWAS;
  const pg = k => typeof STPAGES !== "undefined" && STPAGES[k];
  const SKREF = () => {
    const rk = cfg().reikn || {}, users = window.nuUsers ? nuUsers() : [];
    return [
      { k: "fyrir", t: "Upplýsingar um fyrirtækið", d: "Nafn, kennitala, heimilisfang og banki – birtist á reikningum og tilboðum", ok: !!rk.kt || ["dk", "payday"].includes(rk.bokhald) },
      { k: "einingar", t: "Veldu einingar", d: "Hvaða hlutar appsins eru í notkun hjá ykkur", ok: !!(cfg().einingar || cfg().pakkar) },
      { k: "fyrir", t: "Bókhaldskerfi", d: "Payday, DK eða ekkert (reikningsdrög færð handvirkt)", ok: Object.prototype.hasOwnProperty.call(rk, "bokhald") },
      { k: "ms", t: "Tengja Microsoft 365", d: "Póstur, dagatal og skjöl á SharePoint", ok: !!(window.MS && ((MS.on && MS.on()) || (MS.hadLogin && MS.hadLogin()))) },
      { k: "folk", t: "Bjóða samstarfsfólki", d: "Notendur, hlutverk og hverjir skrá tíma", ok: users.filter(u => u.virkur !== false).length > 1 }
    ].filter(s => pg(s.k));
  };
  const synilegt = () => adm() && !cfg().fyrstuSkref?.falid && SKREF().some(s => !s.ok);
  function html() {
    const L = SKREF(), n = L.filter(s => s.ok).length;
    return `<section class="fsk" aria-label="Fyrstu skref">
      <div class="fsk-h"><div><div class="fsk-y">Fyrstu skref · ${n} af ${L.length}</div><h3 class="fsk-t">Komdu ${E(window.ORG?.nafn || "fyrirtækinu")} af stað í Atrium</h3></div>
        <button type="button" class="btn sm fsk-x" data-act="fsk:fela" title="Fela – má alltaf finna í Stillingum">Fela</button></div>
      <div class="fsk-bar" aria-hidden="true"><i style="width:${Math.round(n / Math.max(1, L.length) * 100)}%"></i></div>
      <ol class="fsk-l">${L.map(s => `<li class="${s.ok ? "ok" : ""}"><button type="button" data-act="fsk:opna:${E(s.k)}"${s.ok ? ' aria-label="' + E(s.t) + ' – lokið"' : ""}>
        <span class="fsk-c" aria-hidden="true">${s.ok ? '<svg viewBox="0 0 20 20"><path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ""}</span>
        <span class="fsk-m"><b>${E(s.t)}</b><small>${E(s.d)}</small></span><span class="fsk-a" aria-hidden="true">›</span></button></li>`).join("")}</ol></section>`;
  }
  function inject() {
    if (typeof tab === "undefined" || typeof DETAIL === "undefined" || DETAIL) return;
    if (tab !== "yfirlit" && tab !== "upphaf") return;
    const v = document.getElementById("view"); if (!v || v.querySelector(".fsk") || !synilegt()) return;
    const st = v.querySelector(".ustart .ustcol");
    if (st) { st.insertAdjacentHTML("beforeend", html()); if (st.closest(".ustdark")) st.querySelector(".fsk").classList.add("fsk-dokk"); return; }
    const ph = v.querySelector(".phead, .uhead, h1, h2");
    if (ph && ph.parentElement === v) ph.insertAdjacentHTML("afterend", html()); else v.insertAdjacentHTML("afterbegin", html());
  }
  window.fskAct = function (k, r) {
    const op = r[0];
    if (op === "opna") { tab = "stillingar"; DETAIL = null; window.STSUB = r[1] || null; try { localStorage.setItem("aera-tab", tab); } catch (e) {} render(); window.scrollTo({ top: 0 }); return; }
    if (op === "fela") { if (!adm()) return; saveSnapshot(s => { s.stillingar = s.stillingar || {}; s.stillingar.fyrstuSkref = { falid: new Date().toISOString() }; }).then(() => toast("Fyrstu skref falin – Stillingar › Einingar sýnir þau aftur")).catch(e => toast(window.errText ? errText(e) : String(e))); return; }
    if (op === "syna") { saveSnapshot(s => { s.stillingar = s.stillingar || {}; delete s.stillingar.fyrstuSkref; }).then(() => { tab = "yfirlit"; DETAIL = null; window.STSUB = null; render(); }); return; }
  };
  Object.assign(window.ACT_EXT = window.ACT_EXT || {}, { fsk: window.fskAct });
  window.fskSynaHTML = () => adm() && cfg().fyrstuSkref?.falid ? `<p class="hint" style="margin:10px 0 0"><button type="button" class="btn sm" data-act="fsk:syna">Sýna fyrstu skref á Heim</button></p>` : "";
  const hook = () => { if (typeof window.render !== "function" || window.render.__fsk) return false;
    const o = window.render; window.render = function () { const r = o.apply(this, arguments); try { inject(); } catch (e) { console.warn("fyrstuskref", e); } return r; };
    window.render.__fsk = 1; try { render = window.render; } catch (e) {} return true; };
  // Bíða þar til Útlit I og aðrar einingar hafa sett sínar umbúðir (render er endurskilgreint nokkrum sinnum við ræsingu)
  let n = 0; const iv = setInterval(() => { if (window.render && !window.render.__fsk) hook(); if (++n > 40) clearInterval(iv); }, 250);
})();
