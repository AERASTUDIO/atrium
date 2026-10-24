/* Verkefni+ (2.67.0): tvær einingar sem fyrst eru prófaðar í dev/.
   vgreind – Verkefnagreining:
     · Afkoma í rauntíma: tekjur á móti kostnaði (tímar × kostnaðarverð starfsmanns + útlagður kostnaður) og spá um lokaniðurstöðu.
       Kostnaðarverð: Stillingar › Verkefnagreining (S.stillingar.vgreind = { kv: kr/klst, starf: { <sk>: kr/klst } }). Aðeins fjármálaaðgangur sér krónur.
     · Lokauppgjör: „Loka verkefni“ opnar fyrst samantekt – áætlun á móti raun eftir undirverkum, afkoma og það sem gleymist
       (óreikningsfært, opin undirverk, búnaður úti, aukaverk sem bíða). Vistast sem p.uppgjor og nærir áætlunina.
     · Áætlun sem lærir: verkefni án áætlunar fær tillögu út frá lokuðum verkefnum í sama verkflokki (meðaltal, spönn, undirverk).
   aukaverk – Aukaverk með samþykki viðskiptavinar:
     · p.aukaverk = [{ id, lysing, klst, upphaed, aetlun, stada: Drög|Sent|Samþykkt|Hafnað, opinber, stofnad, af, samthykkt: { nafn, dags, hvernig } }],
       p.aukaverkT = [tenglar] (svo Cloud Functions finni verkefnið). Viðskiptavinurinn samþykkir á pöntunarsíðunni (opinber/{t}, teg "aukaverk").
     · Samþykkt: klst bætast við áætlun (p.aklst) og upphæðin verður reikningshæf lína (kostnadur/auk-<id>, aukaverk: id) – telst tekjur, ekki kostnaður.
   Tímatillögur úr Outlook, Teams og SharePoint (Cloud Functions → tillogur/{netfang}) eru lesnar hér og birtast í „Loka deginum“ (snjall.js). */
(function () {
  const tr = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const G = () => tr(() => ON("vgreind"), false), A = () => tr(() => ON("aukaverk"), false);
  const FIN = () => tr(() => !window.can || can("fjarmal"), false);
  const ED = () => tr(() => !!MCP, false);
  const KR = n => tr(() => kr(Math.round(n)), Math.round(n) + " kr.");
  const H1 = h => (Math.round((+h || 0) * 10) / 10).toString().replace(".", ",");
  const T0 = () => tr(() => isoDay(new Date()), "");
  const CV = () => tr(() => CFG().vgreind, null) || {};
  const kvOf = sk => +((CV().starf || {})[sk]) || +CV().kv || 0;
  const hrsOf = es => es.reduce((a, e) => a + (+e.timar || 0), 0);
  const entriesOf = p => tr(() => faerslur(), []).filter(e => e.verkefniId === p.id);
  const pidOf = () => String(DETAIL || "").startsWith("verk:") ? String(DETAIL).slice(5) : null;

  /* ---------- Modal (sama útlit og í Pöntunarferli) ---------- */
  function modal(label, html, wide) {
    const w = document.createElement("div"); w.className = "qrcard pfm" + (wide ? " wide" : ""); w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", label);
    w.innerHTML = `<div class="qrscrim" data-x="1"></div><div class="qrsheet pfs"><div class="grab" aria-hidden="true"></div><div class="pfh"><h2>${E(label)}</h2><button type="button" class="qrx" data-x="1" aria-label="Loka">✕</button></div>${html}</div>`;
    document.body.append(w); document.body.classList.add("qropen");
    const close = () => { w.remove(); document.body.classList.remove("qropen"); };
    w.addEventListener("click", e => { if (e.target.closest("[data-x]")) close(); });
    w.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    return { w, close };
  }
  const saveP = (id, fn) => saveSnapshot(s => { const p = (s.verkefni || []).find(v => v.id === id); if (p) fn(p, s); });

  /* ---------- Afkoma ---------- */
  function afkoma(p) {
    const es = entriesOf(p), h = hrsOf(es), ih = tr(() => innheimtaOf(p), "timar"), rate = tr(() => rateOf(p), 0);
    const ks = tr(() => kostn(), []).filter(k => k.verkefniId === p.id), utl = ks.filter(k => !k.aukaverk).reduce((a, k) => a + (+k.upphaed || 0), 0), auk = ks.filter(k => k.aukaverk).reduce((a, k) => a + (+k.upphaed || 0), 0);
    const vinna = es.reduce((a, e) => a + (+e.timar || 0) * kvOf(e.starfsmadur || tr(() => ME(), "")), 0), noKv = !CV().kv && !Object.keys(CV().starf || {}).length;
    const api = window.salaAPI, tbs = api ? api.TB().filter(T => T.verkefniId === p.id && T.stada === "Samþykkt" && !T.pontun) : [];
    const tb = tbs.reduce((a, T) => a + (tr(() => api.netOf(T), 0) || 0), 0) || +p.tilbod || 0;
    let tekjur, grunnur;
    // Tímavinna: reikningsfært á verkefnið (án VSK; reikningur á mörg verkefni skiptist jafnt) + óreikningsfært (tímar × gjald + kostnaður og aukaverk)
    if (ih === "timar") { const rk = (S?.reikningar || []).filter(R => R.stada !== "Ógilt" && (R.verkefniIds || [R.verkefniId]).includes(p.id)).reduce((a, R) => a + (+R.net || 0) / Math.max(1, (R.verkefniIds || [1]).length), 0);
      tekjur = rk + tr(() => rkUnbilledKr(p.id), 0); grunnur = "reikningsfært og óreikningsfært"; }
    else if (ih === "tilbod") { tekjur = tb + utl + auk; grunnur = tbs.length ? "samþykkt tilboð" : "tilboðsupphæð"; }
    else { tekjur = auk; grunnur = "ekki rukkað"; }
    const kostnadur = vinna + utl, fr = tekjur - kostnadur, pct = tekjur ? fr / tekjur : null;
    // Spá: fast verð með áætlun – áætlaðir heildartímar út frá framvindu undirverka (eða áætlun), kostnaður hækkar en tekjur ekki
    let spa = null; const a = +p.aklst || 0, subs = p.undirverk || [], dn = subs.filter(u => u.stada === "Done").length;
    if (ih !== "timar" && (a || subs.length) && h > 0) {
      const r = subs.length ? dn / subs.length : 0, projH = Math.max(h, r >= 0.2 ? h / r : a || h), avgKv = h ? vinna / h : 0, pc = projH * avgKv + utl, pf = tekjur - pc;
      spa = { h: projH, fr: pf, pct: tekjur ? pf / tekjur : null, by: r >= 0.2 ? `${dn} af ${subs.length} undirverkum lokið` : "áætlun" };
    } else if (ih === "timar" && pct != null && tekjur > 0) spa = { same: true, pct };
    return { h, tekjur, kostnadur, vinna, utl, auk, fr, pct, spa, ih, grunnur, noKv };
  }
  const tone = pc => pc == null ? "" : pc < 0 ? "t-red" : pc < 0.15 ? "t-amb" : "t-grn";
  const pctS = pc => pc == null ? "–" : Math.round(pc * 100) + " %";
  function afkHTML(p) {
    if (!G() || !FIN()) return "";
    const k = afkoma(p);
    const spa = k.spa ? (k.spa.same ? `Tímavinna: framlegð helst um ${pctS(k.spa.pct)} á meðan tímagjald og kostnaðarverð breytast ekki.` :
      `Spá við lok (${E(k.spa.by)}): ~${H1(k.spa.h)} klst. · framlegð <b class="${tone(k.spa.pct)}">${KR(k.spa.fr)} (${pctS(k.spa.pct)})</b>`) : "";
    return `<section class="vpafk"><div class="vph"><b>Afkoma</b><small>${E(k.grunnur)}${k.auk ? " · með aukaverkum" : ""}</small></div>
      <div class="vpk"><div><small>Tekjur</small><b>${KR(k.tekjur)}</b></div><div><small>Kostnaður</small><b>${KR(k.kostnadur)}</b><small>${H1(k.h)} klst.${k.utl ? " + útlagt " + KR(k.utl) : ""}</small></div>
      <div><small>Framlegð</small><b class="${tone(k.pct)}">${KR(k.fr)}</b><small class="${tone(k.pct)}">${pctS(k.pct)}</small></div></div>
      ${spa ? `<p class="vps">${spa}</p>` : ""}${k.noKv ? `<p class="vps t-amb">Kostnaðarverð starfsfólks vantar – skráðu það í Stillingar › Verkefnagreining.</p>` : ""}</section>`;
  }

  /* ---------- Áætlun sem lærir ---------- */
  function learn(p) {
    const fl = p.thjonusta || []; if (!fl.length) return null;
    const qs = tr(() => verkefni(), []).filter(q => q.id !== p.id && isDone(q) && (q.thjonusta || []).some(x => fl.includes(x)));
    const rows = qs.map(q => { const u = q.uppgjor; const hs = u ? +u.timar || 0 : (+q.timar || hrsOf(entriesOf(q)));
      const subs = u?.undir || (q.undirverk || []).map(s => ({ heiti: s.heiti, timar: hrsOf(tr(() => faerslur(), []).filter(e => e.undirverkId === s.id)) }));
      return { q, h: hs, subs }; }).filter(r => r.h > 0);
    if (rows.length < 2) return null;
    const hs = rows.map(r => r.h).sort((a, b) => a - b), avg = hs.reduce((a, b) => a + b, 0) / hs.length;
    const by = {}; rows.forEach(r => (r.subs || []).forEach(s => { const k = String(s.heiti || "").trim(); if (!k) return; (by[k] = by[k] || []).push(+s.timar || 0); }));
    const subs = Object.entries(by).filter(([, v]) => v.length >= Math.max(2, Math.ceil(rows.length / 2))).map(([heiti, v]) => ({ heiti, h: v.reduce((a, b) => a + b, 0) / v.length })).sort((a, b) => b.h - a.h).slice(0, 8);
    return { n: rows.length, avg, min: hs[0], max: hs[hs.length - 1], subs, fl: fl.join(", ") };
  }
  function learnHTML(p) {
    if (!G() || isDone(p) || p.aetlunFela) return "";
    const L = learn(p); if (!L) return "";
    if (+p.aklst > 0) { const d = (+p.aklst - L.avg) / L.avg; return Math.abs(d) > 0.25 ? `<p class="vps vplearn">Sambærileg verkefni (${E(L.fl)}, ${L.n}) tóku að meðaltali ${H1(L.avg)} klst. – áætlunin er ${d > 0 ? "hærri" : "lægri"} um ${Math.round(Math.abs(d) * 100)} %.</p>` : ""; }
    const have = new Set((p.undirverk || []).map(u => String(u.heiti || "").trim().toLowerCase())), add = L.subs.filter(s => !have.has(s.heiti.toLowerCase()));
    return `<section class="vpafk vplearn"><div class="vph"><b>Tillaga að áætlun</b><small>út frá ${L.n} lokuðum verkefnum · ${E(L.fl)}</small></div>
      <p class="vps"><b>${H1(L.avg)} klst.</b> að meðaltali (${H1(L.min)}–${H1(L.max)})${L.subs.length ? " · " + L.subs.map(s => `${E(s.heiti)} ${H1(s.h)}`).join(" · ") : ""}</p>
      ${ED() ? `<div class="vpb"><button type="button" class="btn primary sm" data-vp="aetl:${E(p.id)}:${Math.round(L.avg)}">Setja áætlun ${Math.round(L.avg)} klst.</button>${add.length && tr(() => ON("undirverk"), true) ? `<button type="button" class="btn sm" data-vp="subs:${E(p.id)}">Stofna ${add.length} undirverk</button>` : ""}<button type="button" class="btn sm" data-vp="fela:${E(p.id)}">Fela</button></div>` : ""}</section>`;
  }

  /* ---------- Lokauppgjör ---------- */
  function closeDlg(p, act, el) {
    const es = entriesOf(p), h = hrsOf(es), a = +p.aklst || 0, subs = p.undirverk || [];
    const sh = subs.map(u => ({ heiti: u.heiti || u.nr, timar: hrsOf(es.filter(e => e.undirverkId === u.id)), opin: u.stada !== "Done" }));
    const ub = tr(() => rkUnbilledKr(p.id), 0), opin = sh.filter(s => s.opin), uti = tr(() => window.salaAPI.PN(), []).filter(P => P.verkefniId === p.id && P.stada === "Afhent");
    const bid = (p.aukaverk || []).filter(x => x.stada === "Sent"), k = G() && FIN() ? afkoma(p) : null;
    const chk = [ub > 0 && [`Óreikningsfært: <b>${KR(ub)}</b>`, "t-red", `<button type="button" class="btn sm" data-x="1" data-act="tab:trk">Reikningar</button>`],
      opin.length && [`${opin.length} opin undirverk: ${opin.slice(0, 4).map(s => E(s.heiti)).join(", ")}`, "t-amb", ""],
      uti.length && [`Búnaður enn úti: ${uti.map(P => E(P.nr)).join(", ")}`, "t-red", ""],
      bid.length && [`${bid.length} aukaverk bíða samþykkis`, "t-amb", ""]].filter(Boolean);
    const { w, close } = modal("Lokauppgjör · " + (p.nr || ""), `
      <div class="vpk vpk3"><div><small>Áætlun</small><b>${a ? H1(a) + " klst." : "–"}</b></div><div><small>Raun</small><b>${H1(h)} klst.</b></div><div><small>Frávik</small><b class="${a ? (h > a * 1.1 ? "t-red" : h < a * 0.9 ? "t-grn" : "") : ""}">${a ? (h >= a ? "+" : "") + Math.round((h - a) / a * 100) + " %" : "–"}</b></div></div>
      ${sh.length ? `<div class="pfsh2">Eftir undirverkum</div><div class="pfml">${sh.map(s => `<div class="pfmlr"><span style="flex:1">${E(s.heiti)}${s.opin ? ' <small class="t-amb">opið</small>' : ""}</span><b style="margin-left:10px;white-space:nowrap">${H1(s.timar)} klst.</b><small style="margin-left:6px;min-width:34px;text-align:right">${h ? Math.round(s.timar / h * 100) + " %" : ""}</small></div>`).join("")}</div>` : ""}
      ${k ? `<div class="pfsh2">Afkoma</div><div class="vpk vpk3"><div><small>Tekjur</small><b>${KR(k.tekjur)}</b></div><div><small>Kostnaður</small><b>${KR(k.kostnadur)}</b></div><div><small>Framlegð</small><b class="${tone(k.pct)}">${KR(k.fr)} · ${pctS(k.pct)}</b></div></div>` : ""}
      <div class="pfsh2">Áður en lokað er</div>${chk.length ? `<div class="pfml">${chk.map(([t, c, b]) => `<div class="pfmlr"><span class="${c}" style="flex:1;margin-right:10px">⚠ ${t}</span>${b}</div>`).join("")}</div>` : `<p class="vps t-grn">✓ Ekkert óklárað – allt reikningsfært og skilað.</p>`}
      <label class="vpl">Lærdómur (valfrjálst)<textarea id="vpler" rows="2" placeholder="T.d. uppsetning tók lengri tíma vegna aðgengis"></textarea></label>
      <div class="pfact"><button type="button" class="btn" data-x="1">Hætta við</button><button type="button" class="btn primary" id="vpclose">✓ Loka verkefni</button></div>`, true);
    w.querySelector("#vpclose").onclick = async () => {
      const ler = w.querySelector("#vpler").value.trim();
      const upp = { dags: new Date().toISOString(), aklst: a || null, timar: Math.round(h * 100) / 100, undir: sh.map(s => ({ heiti: s.heiti, timar: Math.round(s.timar * 100) / 100 })), flokkur: p.thjonusta || [], laerdomur: ler || null,
        ...(k ? { tekjur: Math.round(k.tekjur), kostnadur: Math.round(k.kostnadur), framlegd: Math.round(k.fr) } : {}) };
      try { await saveP(p.id, q => { q.uppgjor = upp; }); } catch (e) {}
      close(); BYPASS = true; try { await doAct(act, el && el.isConnected ? el : document.createElement("button")); } catch (e) {} finally { BYPASS = false; } render();
    };
  }
  let BYPASS = false;
  const hookAct = () => { if (typeof doAct !== "function" || doAct.__vp) return typeof doAct === "function";
    const o = doAct; doAct = function (act, el) { // eslint-disable-line no-global-assign
      try { const [k, type, id, st] = String(act).split(":"); const L = tr(() => LOKA(), null);
        if (!BYPASS && G() && k === "status" && type === "verk" && L && st === L.n) { const p = findProj(id); if (p && !isDone(p)) { closeDlg(p, act, el); return; } } } catch (e) {}
      return o.apply(this, arguments); };
    doAct.__vp = 1; try { window.doAct = doAct; } catch (e) {} return true; };

  /* ---------- Aukaverk ---------- */
  const SL = { "Drög": "", Sent: "t-blu", "Samþykkt": "t-grn", "Hafnað": "t-red" };
  function aukHTML(p) {
    if (!A()) return ""; const xs = p.aukaverk || [];
    if (!xs.length && !ED()) return "";
    const sum = xs.filter(x => x.stada === "Samþykkt").reduce((a, x) => a + (+x.upphaed || 0), 0);
    const row = x => `<div class="vpar"><div class="vpat"><b>${E(x.lysing)}</b><small>${[x.klst ? H1(x.klst) + " klst." : "", +x.upphaed ? KR(x.upphaed) : "", x.samthykkt ? "samþykkt af " + E(x.samthykkt.nafn) + " " + E(String(x.samthykkt.dags || "").slice(0, 10).split("-").reverse().join(".")) : ""].filter(Boolean).join(" · ")}</small></div>
      <span class="vpst ${SL[x.stada] || ""}">${E(x.stada === "Sent" ? "Bíður samþykkis" : x.stada)}</span>
      ${ED() ? `<div class="vpab">${x.stada === "Drög" || x.stada === "Sent" ? `<button type="button" class="btn sm${x.stada === "Drög" ? " primary" : ""}" data-vp="asend:${E(p.id)}:${E(x.id)}">${x.stada === "Drög" ? "Senda til samþykkis" : "Senda aftur"}</button><button type="button" class="btn sm" data-vp="aok:${E(p.id)}:${E(x.id)}" title="Viðskiptavinur samþykkti munnlega eða í pósti">Merkja samþykkt</button>` : ""}${x.stada !== "Samþykkt" ? `<button type="button" class="btn sm" data-vp="${x.stada === "Drög" ? "adel" : "ano"}:${E(p.id)}:${E(x.id)}">${x.stada === "Drög" ? "Eyða" : "Hafnað"}</button>` : ""}</div>` : ""}</div>`;
    return `<section class="vpafk vpauk"><div class="vph"><b>Aukaverk${xs.length ? " · " + xs.length : ""}</b><small>${sum ? "samþykkt " + KR(sum) : "vinna utan tilboðs – viðskiptavinurinn samþykkir með tengli"}</small>${ED() ? `<button type="button" class="btn sm" data-vp="anew:${E(p.id)}">+ Aukaverk</button>` : ""}</div>${xs.map(row).join("")}</section>`;
  }
  function aukNew(p) {
    const rate = tr(() => rateOf(p), 0), ih = tr(() => innheimtaOf(p), "timar");
    const { w, close } = modal("Nýtt aukaverk · " + (p.nr || ""), `
      <label class="vpl">Lýsing<textarea id="vaL" rows="3" placeholder="T.d. 2 auka hátalarar og 3 klst. uppsetning á svölum"></textarea></label>
      <div class="vpk vpk2"><label class="vpl">Klukkustundir<input id="vaH" type="number" inputmode="decimal" min="0" step="0.5" placeholder="0"></label><label class="vpl">Upphæð án VSK<input id="vaK" type="number" inputmode="numeric" min="0" step="1000" placeholder="0"></label></div>
      <p class="vps">${ih === "timar" ? "Verkefnið er í tímavinnu: tímarnir eru rukkaðir sjálfkrafa. Settu aðeins upphæð fyrir efni eða fast verð." : rate ? `Tímagjald verkefnisins er ${KR(rate)} – upphæðin reiknast sjálf út frá klukkustundum.` : ""}</p>
      <label class="chk vpchk"><input type="checkbox" id="vaA" checked> Bæta klukkustundum við áætlun verkefnisins þegar aukaverkið er samþykkt</label>
      <div class="pfact"><button type="button" class="btn" data-x="1">Hætta við</button><button type="button" class="btn" id="vaS">Vista drög</button><button type="button" class="btn primary" id="vaG">Vista og senda</button></div>`, true);
    const h = w.querySelector("#vaH"), kk = w.querySelector("#vaK"); let touched = false;
    kk.oninput = () => { touched = true; }; h.oninput = () => { if (!touched && ih !== "timar" && rate) kk.value = Math.round((+h.value || 0) * rate) || ""; };
    const go = async send => { const L = w.querySelector("#vaL").value.trim(); if (L.length < 3) { w.querySelector("#vaL").focus(); return toast?.("Skráðu lýsingu"); }
      const x = { id: newId(), lysing: L, klst: +h.value || 0, upphaed: +kk.value || 0, aetlun: w.querySelector("#vaA").checked, stada: "Drög", stofnad: new Date().toISOString(), af: tr(() => ME(), "") };
      await saveP(p.id, q => { (q.aukaverk = q.aukaverk || []).push(x); }); close(); render(); if (send) aukSend(p.id, x.id); };
    w.querySelector("#vaS").onclick = () => go(false); w.querySelector("#vaG").onclick = () => go(true); setTimeout(() => w.querySelector("#vaL").focus(), 50);
  }
  const vskOf = p => tr(() => findVsk(p.vskId), null);
  function aukSnap(p, x) {
    const co = tr(() => DOK.co(), {}) || {}, c = vskOf(p) || {}, em = p.netfang || c.netfang || "";
    return { teg: "aukaverk", o: tr(() => window.atrPub.inst(), ""), nr: p.nr || "", heiti: x.lysing, verkefni: p.stutt || p.nafn || "", vidskiptavinur: p.vidskiptavinur || c.name || null, tengilidur: c.tengilidur || null,
      klst: +x.klst || 0, upphaed: +x.upphaed || 0, stada: x.stada, netfangM: em && em.includes("@") ? em[0] + "•••" + em.slice(Math.max(1, em.indexOf("@") - 1)) : null,
      fyrirtaeki: { nafn: co.nafn || tr(() => ORG.nafn, ""), simi: co.simi || "", netfang: co.netfang || "", vefur: co.vefur || "", merki: tr(() => ORG.docLogo, "") || "icons/doc-logo.png" } };
  }
  async function aukSend(pid, xid) {
    const P = window.atrPub; if (!P) return toast?.("Pöntunarsíðan er ekki virk í þessari uppsetningu (eining Pöntunarferli).");
    const p = findProj(pid), x = (p?.aukaverk || []).find(a => a.id === xid); if (!x) return;
    try {
      const t = x.opinber || P.tok(); await P.write(t, aukSnap(p, { ...x, stada: "Sent" }));
      await saveP(pid, q => { const a = (q.aukaverk || []).find(z => z.id === xid); if (a) { a.opinber = t; a.stada = "Sent"; a.sent = new Date().toISOString(); } q.aukaverkT = [...new Set([...(q.aukaverkT || []), t])]; });
      const url = P.url(t); try { await navigator.clipboard.writeText(url); } catch (e) {}
      const c = vskOf(p) || {}, to = p.netfang || c.netfang || "";
      const { w, close } = modal("Aukaverk sent til samþykkis", `<p class="vps">Tengillinn er afritaður. Viðskiptavinurinn opnar hann, skoðar aukaverkið og samþykkir með nafni og undirskrift – þú færð tilkynningu um leið.</p>
        <div class="pfurl"><input readonly value="${E(url)}" onclick="this.select()"></div>
        <div class="pfact"><button type="button" class="btn" data-x="1">Loka</button>${window.poCompose ? `<button type="button" class="btn primary" id="vaM">Senda í pósti</button>` : ""}</div>`);
      w.querySelector("#vaM")?.addEventListener("click", () => { close(); poCompose({ to, pid, subject: `Aukaverk á ${p.nr} ${p.stutt || ""} – vinsamlegast samþykktu`, body: `Sæl/l,\n\nVið viljum fá samþykki fyrir eftirfarandi aukaverki á ${p.stutt || p.nafn || p.nr}:\n\n${x.lysing}${x.klst ? "\n" + H1(x.klst) + " klst." : ""}${+x.upphaed ? "\nUpphæð án VSK: " + KR(x.upphaed) : ""}\n\nÞú getur skoðað og samþykkt hér:\n${url}\n\nKveðja` }); });
      render(); watchAll();
    } catch (e) { toast?.("Tókst ekki að búa til tengil: " + (e?.message || e)); }
  }
  // Samþykki (hvort sem viðskiptavinurinn samþykkti með tengli eða starfsmaður merkti handvirkt). Sama aðgerð og Cloud Function vidskStadfestir.
  async function aukApprove(pid, xid, s, hvernig) {
    let made = null;
    await saveSnapshot(st => { const q = (st.verkefni || []).find(v => v.id === pid), a = (q?.aukaverk || []).find(z => z.id === xid); if (!a || a.stada === "Samþykkt") return;
      a.stada = "Samþykkt"; a.samthykkt = { nafn: s?.nafn || "", dags: s?.dags || new Date().toISOString(), athugasemd: s?.athugasemd || null, hvernig };
      if (a.aetlun !== false && +a.klst > 0) q.aklst = Math.round(((+q.aklst || 0) + +a.klst) * 10) / 10;
      if (+a.upphaed > 0) { st.kostnadur = st.kostnadur || []; const kid = "auk-" + a.id; if (!st.kostnadur.some(k => k.id === kid)) { made = kid;
        st.kostnadur.push({ id: kid, date: isoDay(new Date()), verkefniId: pid, undirverkId: null, lysing: "Aukaverk: " + a.lysing, upphaed: +a.upphaed, starfsmadur: a.af || ME(), kvittun: null, kvittunId: null, stofnad: new Date().toISOString(), aukaverk: a.id }); } } });
    return made;
  }
  const W = new Set();
  function watchAll() {
    if (!A() || !window.atrPub || !ED()) return;
    tr(() => verkefni(), []).forEach(p => (p.aukaverk || []).forEach(x => { const t = x.opinber; if (!t || x.stada !== "Sent" || W.has(t)) return; W.add(t);
      const got = d => { const s = d && d.stadfest; if (!s) return; const q = findProj(p.id), a = (q?.aukaverk || []).find(z => z.id === x.id); if (!a || a.stada !== "Sent") return;
        aukApprove(p.id, x.id, s, "tengill").then(() => { toast?.(`Aukaverk á ${p.nr} samþykkt af ${s.nafn || "viðskiptavini"}`); render(); }).catch(() => {}); };
      if (window.atrPub.demo()) { const rd = () => { try { got(JSON.parse(window.atrPub.ls().getItem(window.atrPub.lsKey(t)) || "null")); } catch (e) {} }; rd(); setInterval(rd, 4000); return; }
      window.__DB?.watch?.("opinber/" + t, v => got(v.exists ? v.data() : null), () => {}); }));
  }

  /* ---------- Aðgerðir ---------- */
  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-vp]"); if (!b) return; e.preventDefault(); e.stopPropagation();
    const [k, pid, v] = b.dataset.vp.split(":"), p = findProj(pid); if (!p) return;
    if (k === "aetl") { await saveP(pid, q => { q.aklst = +v; }); toast?.(`Áætlun sett: ${v} klst.`); return render(); }
    if (k === "fela") { await saveP(pid, q => { q.aetlunFela = true; }); return render(); }
    if (k === "subs") { const L = learn(p); if (!L) return; const have = new Set((p.undirverk || []).map(u => String(u.heiti || "").trim().toLowerCase()));
      await saveP(pid, q => { const us = q.undirverk = q.undirverk || []; let n = us.length;
        L.subs.filter(s => !have.has(s.heiti.toLowerCase())).forEach(s => { n++; us.push({ id: newId(), nr: (q.nr || "") + "-" + String(n).padStart(2, "0"), heiti: s.heiti, stada: "Ekki hafið", skiladagur: null, timar: 0, aklst: Math.round(s.h), lysing: "Úr tillögu að áætlun" }); }); });
      toast?.("Undirverk stofnuð"); return render(); }
    if (k === "anew") return aukNew(p);
    if (k === "asend") return aukSend(pid, v);
    if (k === "aok") { if (!confirm("Merkja aukaverkið samþykkt? Notaðu þetta ef viðskiptavinurinn samþykkti munnlega eða í pósti.")) return; await aukApprove(pid, v, { nafn: tr(() => starfName(ME()), "") + " (skráð handvirkt)" }, "handvirkt"); toast?.("Aukaverk samþykkt"); return render(); }
    if (k === "ano") { await saveP(pid, q => { const a = (q.aukaverk || []).find(z => z.id === v); if (a) a.stada = "Hafnað"; }); return render(); }
    if (k === "adel") { if (!confirm("Eyða drögunum?")) return; await saveP(pid, q => { q.aukaverk = (q.aukaverk || []).filter(z => z.id !== v); }); return render(); }
  }, true);

  /* ---------- Stillingar › Verkefnagreining ---------- */
  window.vpSet = (sk, val) => saveSnapshot(s => { s.stillingar = s.stillingar || {}; const c = s.stillingar.vgreind = s.stillingar.vgreind || {}; const n = Math.max(0, Math.round(+val || 0));
    if (!sk) c.kv = n; else { c.starf = c.starf || {}; if (n) c.starf[sk] = n; else delete c.starf[sk]; } }).then(() => render());
  function setHTML() {
    const c = CV(), st = tr(() => STARFS(), []);
    const inp = (sk, v, ph) => `<input class="snjnum" type="number" inputmode="numeric" min="0" step="100" value="${v || ""}" placeholder="${E(ph || "")}" onchange="vpSet('${E(sk)}',this.value)" style="width:110px">`;
    return `<p class="hint">Kostnaðarverð á klukkustund er það sem klukkustund starfsmanns kostar fyrirtækið (laun, launatengd gjöld og hlutdeild í rekstri). Það er notað í Afkomu og Lokauppgjöri verkefna og sést aðeins þeim sem hafa fjármálaaðgang.</p>
      <div class="viewtitle">Sjálfgefið</div><div class="snjset"><div class="snjsr tlkr"><div class="snjst"><b>Kostnaðarverð á klst.</b><small>Gildir fyrir alla nema annað sé skráð hér að neðan</small></div><div class="snjso">${inp("", c.kv, "t.d. 6500")} kr.</div></div></div>
      <div class="viewtitle">Eftir starfsmanni</div><div class="snjset">${st.map(s => `<div class="snjsr tlkr"><div class="snjst"><b>${E(s.nafn || s.sk)}</b><small>${E(s.sk)}</small></div><div class="snjso">${inp(s.sk, (c.starf || {})[s.sk], c.kv ? String(c.kv) : "")} kr.</div></div>`).join("")}</div>`;
  }
  const addPage = () => { if (typeof STPAGES === "undefined") return false;
    STPAGES.vgreind = { l: "Verkefnagreining", d: "Kostnaðarverð starfsfólks fyrir afkomu og lokauppgjör verkefna", s: ["Kostnaðarverð", "Afkoma", "Framlegð"], adm: 1, fn: setHTML }; return true; };
  if (!addPage()) { const iv = setInterval(() => { if (addPage()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }

  /* ---------- Tímatillögur úr Microsoft 365 (Cloud Functions → tillogur/{netfang}) ---------- */
  window.__tillogur = window.__tillogur || {};
  let tW = false;
  const tWatch = () => { if (tW || !window.__DB || window.AERA_DEMO) return; const em = String(tr(() => DB.email, "") || "").toLowerCase(); if (!em) return; tW = true;
    window.__DB.watch("tillogur/" + em, v => { window.__tillogur = (v.exists && v.data().dagar) || {}; }, () => {}); };

  /* ---------- Teikna inn á verkefni ---------- */
  function decorate() {
    tr(hookAct); tr(tWatch); tr(watchAll);
    const pid = pidOf(); if (!pid || (DTAB && DTAB !== "yfirlit")) return;
    const root = document.getElementById("view"), p = findProj(pid); if (!root || !p || root.querySelector(".vpwrap")) return;
    const html = afkHTML(p) + learnHTML(p) + aukHTML(p); if (!html) return;
    const anchor = root.querySelector(".ukps") || root.querySelector(".dbody .kpis") || root.querySelector(".kpis");
    const box = `<div class="vpwrap">${html}</div>`;
    if (anchor) anchor.insertAdjacentHTML("afterend", box); else root.querySelector(".dbody, .spdetin")?.insertAdjacentHTML("afterbegin", box);
  }
  const wrap = () => { if (typeof render !== "function") return false; if (render.__vp) return true;
    const o = render; render = function () { const r = o.apply(this, arguments); tr(decorate); return r; }; render.__vp = 1; try { window.render = render; } catch (e) {} return true; };
  if (!wrap()) { const iv = setInterval(() => { if (wrap()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }

  // Stíll (sama útlit og pfsec/snjset)
  if (!document.getElementById("vp-css")) { const c = document.createElement("style"); c.id = "vp-css"; c.textContent = `
    .vpwrap{display:flex;flex-direction:column;gap:12px;margin:12px 0 16px}
    .vpafk{border:1px solid var(--line);border-radius:6px;background:var(--surface);padding:12px 14px}
    .vph{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:8px}.vph b{font-weight:500;font-size:14px}.vph small{color:var(--muted);font-size:12px;flex:1}.vph .btn{margin-left:auto}
    .vpk{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.vpk2{grid-template-columns:repeat(2,minmax(0,1fr))}
    .vpk>div{display:flex;flex-direction:column;gap:2px}.vpk small{font-size:11px;color:var(--muted)}.vpk b{font-size:17px;font-weight:500;font-variant-numeric:tabular-nums}
    .vps{margin:8px 0 0;font-size:12.5px;color:var(--muted)}.vps b{font-weight:500}
    .vpb{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .vpar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--line)}.vpat{flex:1;min-width:180px;display:flex;flex-direction:column}.vpat b{font-weight:500;font-size:13.5px}.vpat small{font-size:12px;color:var(--muted)}
    .vpst{font-size:12px;font-weight:500}.vpab{display:flex;gap:6px;flex-wrap:wrap}
    .vpl{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--muted);margin-top:10px}.vpl textarea,.vpl input{font:inherit;font-size:14px;color:var(--ink)}
    .vpchk{display:flex;gap:8px;align-items:center;font-size:13px;margin-top:10px}
    .vpk3{margin-top:4px}
    @media (max-width:560px){.vpk{grid-template-columns:repeat(2,minmax(0,1fr))}.vpk>div:last-child:nth-child(3){grid-column:1/-1}}`; document.head.appendChild(c); }
})();
