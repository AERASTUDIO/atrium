/* Sala (frá 2.4.0): einingarnar Vörulisti (vorur) og Tilboð (tilbod). Sjálfgefið óvirkar – uppsetning eða admin kveikir á þeim.
   Gögn (Firestore-söfn, sjá gogn.js):
   - vorur/{id}: { nr, heiti, flokkur, tegund: leiga|sala|baedi|vinna|pakki, eining, leiguverd (á dag), soluverd, innkaupsverd,
                   fjoldi, lysing, innihald: [{ v: voruId, m: magn }] (pakki), prufa }
   - tilbod/{id}: { nr, heiti, deild: leiga|sala, vskId, vidskiptavinur, tengilidur, netfang, stadsetning, fra, til, gildir, dags,
                    stada: Drög|Sent|Samþykkt|Hafnað, utgafa, eldri: [{ utgafa, dags, net }], afsl (%), athugasemd,
                    linur: [{ id, v, heiti, teg: leiga|sala|vinna, hl (hluti), magn, ein, verd, dagar, afsl }], verkefniId, prufa }
   - S.stillingar.tilbod: { flokkar, studlar (dagstuðlar), vsk, gildisdagar, nastaNr, skilmalar }
   Leigulína = magn × verð × dagstuðull(dagar) × (1 − afsl.); sölu- og vinnulína = magn × verð × (1 − afsl.).
   Prufugögn (prufa: true) má hlaða inn og eyða í einu lagi (Vörulisti, admin). */
(function () {
  const VR = () => S?.vorur || [], TB = () => S?.tilbod || [];
  const findV = id => VR().find(x => x.id === id), findT = id => TB().find(x => x.id === id);
  const DEF = {
    flokkar: ["Hljóð", "Ljós", "LED", "Skjáir", "Annað"], studlar: [1, 1.5, 2, 2.5, 3, 3.25, 3.5], vsk: 24, gildisdagar: 14, nastaNr: 1001,
    skilmalar: "Öll verð eru án VSK. Leiguverð miðast við tímabilið sem tilgreint er. Flutningur, uppsetning og tæknimenn eru aðeins innifalin ef þau koma fram í tilboðinu. Leigutaki ber ábyrgð á búnaði frá afhendingu til skila."
  };
  const CF = () => ({ ...DEF, ...((typeof CFG === "function" && CFG().tilbod) || {}) });
  const FLOKKAR = () => { const f = CF().flokkar || DEF.flokkar; const extra = [...new Set(VR().map(v => v.flokkur).filter(Boolean))].filter(x => !f.includes(x)); return f.concat(extra); };
  const TEG = { leiga: "Leiga", sala: "Sala", baedi: "Leiga og sala", vinna: "Vinna og þjónusta", pakki: "Pakki" };
  const LTEG = { leiga: "Leiga", sala: "Sala", vinna: "Vinna" };
  const STADA = ["Drög", "Sent", "Samþykkt", "Hafnað"], STC = { "Drög": "pc-slate", "Sent": "pc-blue", "Samþykkt": "pc-teal", "Hafnað": "pc-red" };
  const DEILD = { leiga: "Leiga", sala: "Sala" };
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
  const vPrice = v => v.tegund === "sala" || v.tegund === "vinna" ? v.soluverd : v.leiguverd;
  const lineFrom = (v, T) => { const teg = v.tegund === "vinna" ? "vinna" : v.tegund === "sala" ? "sala" : v.tegund === "baedi" && T?.deild === "sala" ? "sala" : "leiga";
    return { id: gid(), v: v.id, heiti: v.heiti, teg, hl: v.tegund === "vinna" ? "Vinna og þjónusta" : (v.flokkur || "Annað"), magn: 1, ein: v.eining || (teg === "vinna" ? "klst." : "stk."), verd: +(teg === "sala" || teg === "vinna" ? v.soluverd : v.leiguverd) || 0, dagar: null, afsl: 0 }; };
  const pakkiTxt = v => (v?.innihald || []).map(i => { const x = findV(i.v); return x ? (+i.m || 1) + " × " + x.heiti : null; }).filter(Boolean).join(", ");
  const dRange = T => T.fra ? dIS(T.fra) + (T.til && T.til !== T.fra ? " – " + dIS(T.til) : "") : "";

  /* ---------- Vörulisti ---------- */
  let VF = "", VK = "", VQ = "";
  try { VF = localStorage.getItem("atrium-vf") || ""; } catch (e) {}
  const vMatch = v => (!VF || (VF === "leiga" ? ["leiga", "baedi", "pakki"].includes(v.tegund) : VF === "sala" ? ["sala", "baedi"].includes(v.tegund) : v.tegund === VF)) && (!VK || v.flokkur === VK);
  const vRight = v => { const p = []; if (["leiga", "baedi", "pakki"].includes(v.tegund) && +v.leiguverd) p.push(krs(v.leiguverd) + "/dag"); if (["sala", "baedi", "vinna"].includes(v.tegund) && +v.soluverd) p.push(krs(v.soluverd) + (v.tegund === "vinna" ? "/" + String(v.eining || "klst.").replace(/\.$/, "") : ""));
    return `<span class="lc">${esc(p.join(" · "))}</span>`; };
  const vRow = v => lrow("vara:" + v.id, { title: esc(v.heiti) + (v.prufa ? ' <span class="tag">prufa</span>' : ""), sub: esc([v.nr, v.flokkur, TEG[v.tegund], v.tegund === "pakki" ? pakkiTxt(v) : (+v.fjoldi ? num(v.fjoldi) + " " + (v.eining || "stk.") + " til" : "")].filter(Boolean).join(" · ")), right: vRight(v) })
    .replace('class="lrow tap"', `class="lrow tap" data-s="${esc((v.heiti + " " + (v.nr || "") + " " + (v.flokkur || "") + " " + (v.lysing || "")).toLowerCase())}"`);
  window.vVorur = function () {
    const all = VR(), xs = all.filter(vMatch).slice().sort((a, b) => FLOKKAR().indexOf(a.flokkur) - FLOKKAR().indexOf(b.flokkur) || String(a.heiti).localeCompare(String(b.heiti), "is"));
    const nPrufa = all.filter(v => v.prufa).length + TB().filter(t => t.prufa).length;
    const chip = (act, l, on) => `<button type="button" class="chipbtn" data-act="${act}" aria-pressed="${on}">${esc(l)}</button>`;
    const fl = FLOKKAR().filter(f => all.some(v => v.flokkur === f));
    let h = `<div class="chips" style="margin:16px 0 8px">${chip("vrf:", "Allt", !VF)}${chip("vrf:leiga", "Leiga", VF === "leiga")}${chip("vrf:sala", "Sala", VF === "sala")}${chip("vrf:vinna", "Vinna og þjónusta", VF === "vinna")}${chip("vrf:pakki", "Pakkar", VF === "pakki")}</div>`;
    if (fl.length > 1) h += `<div class="chips" style="margin:0 0 10px">${chip("vrk:", "Allir flokkar", !VK)}${fl.map(f => chip("vrk:" + f, f, VK === f)).join("")}</div>`;
    if (all.length) h += `<input type="search" id="vr-q" placeholder="Leita í vörulista…" value="${esc(VQ)}" style="margin:0 0 10px" autocomplete="off">`;
    if (!all.length) h += `<div class="empty">Vörulistinn er tómur.${MCP ? " Bættu við vöru með +." : ""}${MCP && ADM() ? `<div class="links" style="margin-top:12px;justify-content:center"><button type="button" class="btn" data-act="vrprufa:inn">Hlaða inn prufugögnum</button></div><p class="hint" style="margin-top:8px">Prufuvörur og prufutilboð fyrir tækjaleigu (hljóð, ljós, LED, skjáir, vinna) sem má eyða öllum í einu síðar.</p>` : ""}</div>`;
    else if (!xs.length) h += `<div class="empty">Engar vörur passa við síuna.</div>`;
    else h += `<p class="hint" style="margin:0 0 6px" id="vr-n">${xs.length} ${xs.length === 1 ? "vara" : "vörur"}</p>` + llist(xs.map(vRow));
    if (nPrufa && MCP && ADM()) h += `<div class="card" style="margin-top:16px"><div class="sub-i"><span>Prufugögn: ${all.filter(v => v.prufa).length} vörur og ${TB().filter(t => t.prufa).length} tilboð merkt „prufa“.</span><button type="button" class="btn danger" data-act="vrprufa:ut">Eyða prufugögnum</button></div></div>`;
    return h;
  };
  // Leit án þess að teikna síðuna upp á nýtt (heldur fókus í reitnum)
  document.addEventListener("input", e => { if (e.target?.id !== "vr-q") return; VQ = e.target.value; const q = VQ.trim().toLowerCase(); let n = 0;
    document.querySelectorAll("#view .lrow[data-s]").forEach(r => { const on = !q || q.split(/\s+/).every(w => r.dataset.s.includes(w)); r.style.display = on ? "" : "none"; if (on) n++; });
    const c = document.getElementById("vr-n"); if (c) c.textContent = n + " " + (n === 1 ? "vara" : "vörur"); });

  window.dVara = function (v) {
    const tbs = TB().filter(t => (t.linur || []).some(l => l.v === v.id)).sort((a, b) => String(b.dags || "").localeCompare(String(a.dags || "")));
    const row = (k, x) => x != null && x !== "" ? `<div class="sub-i"><span>${esc(k)}</span><b>${x}</b></div>` : "";
    return backBar() + `<div class="kicker"><span class="kind">${esc(TEG[v.tegund] || "Vara")}</span>${v.flokkur ? `<span class="pill">${esc(v.flokkur)}</span>` : ""}${v.prufa ? '<span class="tag">prufa</span>' : ""}</div>
      <h2 class="big" style="margin-top:6px">${esc(v.heiti)}</h2>${v.nr ? `<p class="sub">Vörunúmer ${esc(v.nr)}</p>` : ""}
      <div class="card" style="margin-top:12px">
        ${["leiga", "baedi", "pakki"].includes(v.tegund) ? row("Leiguverð á dag", esc(krs(v.leiguverd))) : ""}
        ${["sala", "baedi", "vinna"].includes(v.tegund) ? row(v.tegund === "vinna" ? "Verð á " + (v.eining || "klst.") : "Söluverð", esc(krs(v.soluverd))) : ""}
        ${ADM() && +v.innkaupsverd ? row("Innkaupsverð", esc(krs(v.innkaupsverd))) : ""}
        ${v.tegund !== "vinna" ? row("Fjöldi til", esc(num(+v.fjoldi || 0) + " " + (v.eining || "stk."))) : ""}
      </div>
      ${v.tegund === "pakki" ? `<div class="viewtitle">Innihald pakka</div>${llist((v.innihald || []).map(i => { const x = findV(i.v); return x ? lrow("vara:" + x.id, { lead: `<b>${esc(fx(i.m || 1))}</b><small>stk.</small>`, title: esc(x.heiti), sub: esc(x.flokkur || "") }) : ""; }))}` : ""}
      ${v.lysing ? `<div class="viewtitle">Lýsing</div><p style="white-space:pre-wrap;margin:0">${esc(v.lysing)}</p>` : ""}
      ${MCP ? `<div class="links" style="margin-top:14px"><button type="button" class="btn" data-act="vrnew:${esc(v.id)}">✎ Breyta</button>${DEL() ? `<button type="button" class="btn danger" data-act="vrdel:${esc(v.id)}">Eyða</button>` : ""}</div>` : ""}
      ${tbs.length ? `<div class="viewtitle">Á tilboðum · ${tbs.length}</div>${llist(tbs.map(tbRow))}` : ""}`;
  };

  function varaForm(id) {
    const v = id ? findV(id) : null, x = v || { tegund: VF && VF !== "pakki" ? VF : VF === "pakki" ? "pakki" : "leiga", flokkur: VK || FLOKKAR()[0], eining: "stk.", innihald: [] };
    let inn = (x.innihald || []).map(i => ({ ...i }));
    const opts = (arr, cur) => arr.map(([k, l]) => `<option value="${esc(k)}"${k === cur ? " selected" : ""}>${esc(l)}</option>`).join("");
    const draw = () => {
      const teg = val("vr-teg") || x.tegund, pk = teg === "pakki", items = VR().filter(y => y.tegund !== "pakki" && y.tegund !== "vinna" && y.id !== id);
      document.getElementById("vr-pk").innerHTML = pk ? `<div class="kind" style="margin-top:6px">Innihald pakka</div>${inn.map((i, k) => `<div class="two" style="grid-template-columns:1fr 90px 40px;align-items:end"><label>Vara<select data-pk="v:${k}">${items.map(y => `<option value="${esc(y.id)}"${y.id === i.v ? " selected" : ""}>${esc(y.heiti)}</option>`).join("")}</select></label><label>Magn<input data-pk="m:${k}" inputmode="decimal" value="${esc(fx(i.m || 1))}"></label><button type="button" class="btn" data-pkdel="${k}" aria-label="Fjarlægja" style="min-height:44px">×</button></div>`).join("")}
        <button type="button" class="btn" id="vr-pkadd" style="margin-top:6px"${items.length ? "" : " disabled"}>+ Bæta vöru í pakka</button>` : "";
      ["vr-lv", "vr-sv", "vr-fj"].forEach(k => { const el = document.getElementById(k)?.closest("label"); if (el) el.style.display = ""; });
      document.getElementById("vr-lv").closest("label").style.display = ["leiga", "baedi", "pakki"].includes(teg) ? "" : "none";
      document.getElementById("vr-sv").closest("label").style.display = ["sala", "baedi", "vinna"].includes(teg) ? "" : "none";
      document.getElementById("vr-sv").closest("label").firstChild.textContent = teg === "vinna" ? "Verð á einingu (kr.)" : "Söluverð (kr.)";
      document.getElementById("vr-fj").closest("label").style.display = teg === "vinna" ? "none" : "";
      const ad = document.getElementById("vr-pkadd"); if (ad) ad.onclick = () => { readPk(); inn.push({ v: items[0]?.id, m: 1 }); draw(); };
      sheet.querySelectorAll("[data-pkdel]").forEach(b => b.onclick = () => { readPk(); inn.splice(+b.dataset.pkdel, 1); draw(); });
    };
    const readPk = () => { inn = inn.map((i, k) => ({ v: sheet.querySelector(`[data-pk="v:${k}"]`)?.value || i.v, m: n0(sheet.querySelector(`[data-pk="m:${k}"]`)?.value) || 1 })); };
    sheet.innerHTML = `<h3 id="sheet-h">${v ? "Breyta vöru" : "Ný vara"}</h3><form id="vrf" novalidate>
      <label>Heiti<input id="vr-heiti" value="${esc(x.heiti || "")}" placeholder="T.d. d&b E8 hátalari"></label>
      <div class="two"><label>Tegund<select id="vr-teg">${opts(Object.entries(TEG), x.tegund)}</select></label><label>Flokkur<select id="vr-fl">${opts(FLOKKAR().map(f => [f, f]), x.flokkur)}<option value="__nyr__">+ Nýr flokkur…</option></select></label></div>
      <label id="vr-flnl" style="display:none">Heiti nýs flokks<input id="vr-fln" placeholder="T.d. Rigging"></label>
      <div class="two"><label>Vörunúmer<input id="vr-nr" value="${esc(x.nr || "")}" placeholder="Valfrjálst"></label><label>Eining<select id="vr-ein">${opts(["stk.", "klst.", "dagur", "km", "sett", "m"].map(e => [e, e]), x.eining || "stk.")}</select></label></div>
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
      if (!heiti) return msg("Skrifaðu heiti vörunnar.", "err"); if (!fl) return msg("Veldu flokk.", "err");
      const o = { heiti, tegund: teg, flokkur: fl, nr: val("vr-nr") || null, eining: val("vr-ein") || "stk.", leiguverd: parseKr(val("vr-lv")) || 0, soluverd: parseKr(val("vr-sv")) || 0, fjoldi: n0(val("vr-fj")) || 0, lysing: val("vr-lys") || null, innihald: teg === "pakki" ? inn.filter(i => i.v) : [] };
      if (document.getElementById("vr-iv")) o.innkaupsverd = parseKr(val("vr-iv")) || 0;
      if (["leiga", "pakki"].includes(teg) && !o.leiguverd) return msg("Skráðu leiguverð á dag.", "err");
      if (["sala", "vinna"].includes(teg) && !o.soluverd) return msg("Skráðu verð.", "err");
      const nid = id || gid();
      try { await saveSnapshot(s => { s.vorur = s.vorur || []; const q = s.vorur.find(y => y.id === id); if (q) Object.assign(q, o); else s.vorur.push({ id: nid, ...o });
          if (fl && !(CF().flokkar || []).includes(fl)) { s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), flokkar: [...(CF().flokkar || DEF.flokkar), fl] }; } });
        toast(heiti + " vistað"); closeSheet(); if (!id) openDetail("vara:" + nid); } catch (err) { msg(esc(errText(err)), "err"); } };
  }

  /* ---------- Tilboð: listi ---------- */
  let TF = "", TS = "";
  try { TF = localStorage.getItem("atrium-tf") || ""; } catch (e) {}
  function tbRow(T) { const t = totals(T);
    return lrow("tb:" + T.id, { title: `<span class="nr">${esc(T.nr || "")}</span>&nbsp; ` + esc(T.vidskiptavinur || "Án viðskiptavinar") + " · " + esc(T.heiti || "") + (T.prufa ? ' <span class="tag">prufa</span>' : ""),
      sub: esc([T.stada, DEILD[T.deild], dRange(T), +T.utgafa > 1 ? "útgáfa " + T.utgafa : ""].filter(Boolean).join(" · ")), right: `<span class="lc">${esc(krs(t.net))}</span>` }); }
  window.tbRowHTML = tbRow;
  window.vTilbod = function () {
    const all = TB(), xs = all.filter(T => (!TF || T.deild === TF) && (!TS || T.stada === TS)).slice().sort((a, b) => String(b.dags || "").localeCompare(String(a.dags || "")) || String(b.nr).localeCompare(String(a.nr)));
    const chip = (act, l, on) => `<button type="button" class="chipbtn" data-act="${act}" aria-pressed="${on}">${esc(l)}</button>`;
    const opin = all.filter(T => (!TF || T.deild === TF) && ["Drög", "Sent"].includes(T.stada)), sam = all.filter(T => (!TF || T.deild === TF) && T.stada === "Samþykkt");
    const sum = a => a.reduce((s, T) => s + totals(T).net, 0);
    let h = `<div class="chips" style="margin:16px 0 8px">${chip("tbf:", "Allar deildir", !TF)}${chip("tbf:leiga", "Leiga", TF === "leiga")}${chip("tbf:sala", "Sala", TF === "sala")}</div>
      <div class="chips" style="margin:0 0 12px">${chip("tbs:", "Öll", !TS)}${STADA.map(s => chip("tbs:" + s, s, TS === s)).join("")}</div>`;
    if (all.length) h += `<div class="kpis"><div class="card"><b>${opin.length}</b><span>Opin tilboð · ${esc(krs(sum(opin)))}</span></div><div class="card"><b>${sam.length}</b><span>Samþykkt · ${esc(krs(sum(sam)))}</span></div></div>`;
    if (!all.length) h += `<div class="empty">Engin tilboð ennþá.${MCP ? " Búðu til tilboð með +." : ""}${!VR().length && MCP && ADM() ? " Byrjaðu á vörulistanum – þar má líka hlaða inn prufugögnum." : ""}</div>`;
    else if (!xs.length) h += `<div class="empty">Engin tilboð passa við síuna.</div>`;
    else h += `<div class="viewtitle">Tilboð · ${xs.length}</div>` + llist(xs.map(tbRow));
    return h;
  };

  /* ---------- Tilboð: nýtt ---------- */
  function tbForm(copyOf) {
    const c = CF(), d0 = isoDay(new Date()), g0 = (() => { const x = new Date(); x.setDate(x.getDate() + (+c.gildisdagar || 14)); return isoDay(x); })();
    sheet.innerHTML = `<h3 id="sheet-h">Nýtt tilboð</h3><form id="tbf" novalidate>
      <div class="kind">Deild</div><div class="chips" style="margin-bottom:8px"><label><input type="radio" name="tb-deild" value="leiga"${TF !== "sala" ? " checked" : ""}> Leiga (viðburðir)</label><label><input type="radio" name="tb-deild" value="sala"${TF === "sala" ? " checked" : ""}> Sala og install</label></div>
      <label>Heiti viðburðar eða verks<input id="tb-heiti" placeholder="T.d. Árshátíð Arion í Hörpu"></label>
      ${vskSelect("tb", "client", "Viðskiptavinur", "Viðskiptavinur", null)}
      <div class="two"><label>Tengiliður<input id="tb-teng" placeholder="Nafn"></label><label>Netfang tengiliðs<input id="tb-net" type="email" placeholder="nafn@fyrirtaeki.is"></label></div>
      <label>Staðsetning<input id="tb-stad" placeholder="T.d. Harpa, Eldborg"></label>
      <div class="two"><label>Frá (afhending)<input id="tb-fra" type="date" value="${d0}"></label><label>Til (skil)<input id="tb-til" type="date" value="${d0}"></label></div>
      <label>Tilboð gildir til<input id="tb-gildir" type="date" value="${g0}"></label>
      <div id="f-msg"></div><div class="actions"><button type="button" class="btn" id="tb-cancel">Hætta við</button><button class="btn primary" id="tb-save">Búa til og bæta við línum</button></div></form>`;
    sheetwrap.hidden = false; wireVskSelects(sheet);
    document.getElementById("tb-fra").onchange = e => { const t = document.getElementById("tb-til"); if (!t.value || t.value < e.target.value) t.value = e.target.value; };
    document.getElementById("tb-client").addEventListener("change", e => { const v = findVsk(e.target.value); if (v) { if (!val("tb-teng") && v.tengilidur) document.getElementById("tb-teng").value = v.tengilidur; if (!val("tb-net") && v.netfang) document.getElementById("tb-net").value = v.netfang; } });
    document.getElementById("tb-cancel").onclick = closeSheet;
    document.getElementById("tbf").onsubmit = async e => { e.preventDefault();
      try {
        const heiti = val("tb-heiti"); if (!heiti) return msg("Skrifaðu heiti viðburðar eða verks.", "err");
        const fra = val("tb-fra") || null, til = val("tb-til") || fra; if (fra && til && til < fra) return msg("„Til“ getur ekki verið á undan „Frá“.", "err");
        const cl = await pickVsk("tb", "client", "Viðskiptavinur"), id = gid(), nr = "T-" + (+c.nastaNr || 1001);
        const T = { id, nr, heiti, deild: document.querySelector('input[name="tb-deild"]:checked')?.value || "leiga", vskId: cl?.id || null, vidskiptavinur: cl?.name || null,
          tengilidur: val("tb-teng") || null, netfang: val("tb-net") || null, stadsetning: val("tb-stad") || null, fra, til, gildir: val("tb-gildir") || null, dags: d0,
          stada: "Drög", utgafa: 1, eldri: [], afsl: 0, athugasemd: null, linur: [], verkefniId: null };
        await saveSnapshot(s => { (s.tilbod = s.tilbod || []).push(T); s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), nastaNr: (+c.nastaNr || 1001) + 1 }; });
        toast("Tilboð " + nr + " stofnað"); closeSheet(); EDT = structuredClone(T); openDetail("tb:" + id);
      } catch (err) { msg(esc(err?.code === "form" ? err.message : errText(err)), "err"); } };
  }

  /* ---------- Tilboð: síða og ritill ---------- */
  let EDT = null; // drög í vinnslu (afrit af tilboðinu meðan verið er að breyta)
  const tbTableHTML = (T, ed) => {
    const gs = groups(T); if (!gs.length) return `<div class="empty">${ed ? "Engar línur ennþá. Bættu við úr vörulistanum eða sérlínu." : "Engar línur."}</div>`;
    return gs.map(([hl, ls]) => { const sub = ls.reduce((a, l) => a + lSum(l, T), 0);
      return `<div class="tbgrp"><div class="tbgh">${ed ? `<input class="tbhl" data-hl="${esc(hl)}" value="${esc(hl)}" aria-label="Heiti hluta">` : `<b>${esc(hl)}</b>`}<span>${esc(krs(sub))}</span></div>
        ${ls.map(l => { const v = l.v ? findV(l.v) : null, pk = v?.tegund === "pakki" ? pakkiTxt(v) : "";
          if (!ed) return `<div class="tbl"><div class="tbln"><div>${esc(l.heiti)}${pk ? `<div class="ls">${esc(pk)}</div>` : ""}</div><div class="ls">${esc([fx(l.magn) + " " + (l.ein || ""), "× " + krs(l.verd), l.teg === "leiga" ? lDagar(l, T) + " " + (lDagar(l, T) === 1 ? "dagur" : "dagar") + (studull(lDagar(l, T)) !== lDagar(l, T) ? " (stuðull " + fx(studull(lDagar(l, T))) + ")" : "") : LTEG[l.teg], +l.afsl ? "−" + fx(l.afsl) + "%" : ""].filter(Boolean).join(" · "))}</div></div><b>${esc(krs(lSum(l, T)))}</b></div>`;
          const vb = v?.tegund === "baedi";
          return `<div class="tbl ed" data-lid="${esc(l.id)}"><div class="tbln"><input data-l="heiti:${esc(l.id)}" value="${esc(l.heiti)}" aria-label="Lýsing">${pk ? `<div class="ls">${esc(pk)}</div>` : ""}
            <div class="tbf"><label>Magn<input data-l="magn:${esc(l.id)}" inputmode="decimal" value="${esc(fx(l.magn))}"></label>
            ${l.teg === "leiga" ? `<label>Dagar<input data-l="dagar:${esc(l.id)}" inputmode="numeric" value="${l.dagar ? esc(String(l.dagar)) : ""}" placeholder="${tbDagar(T)}"></label>` : ""}
            <label>Verð${l.teg === "leiga" ? "/dag" : ""}<input data-l="verd:${esc(l.id)}" inputmode="numeric" value="${esc(String(l.verd || 0))}"></label>
            <label>Afsl. %<input data-l="afsl:${esc(l.id)}" inputmode="decimal" value="${+l.afsl ? esc(fx(l.afsl)) : ""}" placeholder="0"></label>
            ${vb || !l.v ? `<label>Tegund<select data-l="teg:${esc(l.id)}">${["leiga", "sala", "vinna"].map(k => `<option value="${k}"${l.teg === k ? " selected" : ""}>${LTEG[k]}</option>`).join("")}</select></label>` : ""}
            <label>Hluti<select data-l="hl:${esc(l.id)}">${[...new Set(groups(T).map(g => g[0]).concat(FLOKKAR(), ["Vinna og þjónusta"]))].map(g => `<option${g === l.hl ? " selected" : ""}>${esc(g)}</option>`).join("")}</select></label></div></div>
            <div class="tblr"><b data-ls="${esc(l.id)}">${esc(krs(lSum(l, T)))}</b><button type="button" class="btn" data-act="tbl:del:${esc(l.id)}" aria-label="Eyða línu">×</button></div></div>`; }).join("")}</div>`; }).join("");
  };
  const tbTotHTML = T => { const t = totals(T), r = (k, x, b) => `<div class="sub-i"${b ? ' style="font-size:16px"' : ""}><span>${esc(k)}</span><b>${esc(krs(x))}</b></div>`;
    return `${t.leiga ? r("Leiga", t.leiga) : ""}${t.sala ? r("Sala", t.sala) : ""}${t.vinna ? r("Vinna og þjónusta", t.vinna) : ""}
      ${t.afsl ? r("Afsláttur " + fx(T.afsl) + "%", -t.afsl) : ""}${r("Samtals án VSK", t.net)}${r("VSK " + fx(vskP()) + "%", t.vsk)}${r("Samtals með VSK", t.tot, 1)}`; };

  window.dTilbod = function (T0) {
    const ed = EDT && EDT.id === T0.id, T = ed ? EDT : T0, pr = T.verkefniId ? findProj(T.verkefniId) : null;
    const ms = window.MS && MS.on && MS.on();
    if (ed) return backBar() + `<div class="kicker"><span class="kind">Tilboð ${esc(T.nr)}</span><span class="pill ${STC[T.stada] || ""}">${esc(T.stada)}</span><span class="tag">breytingahamur</span></div>
      <div id="tbed">
      <label>Heiti viðburðar eða verks<input data-h="heiti" value="${esc(T.heiti || "")}"></label>
      <div class="two"><label>Deild<select data-h="deild">${Object.entries(DEILD).map(([k, l]) => `<option value="${k}"${T.deild === k ? " selected" : ""}>${l}</option>`).join("")}</select></label>
        <label>Viðskiptavinur<select data-h="vskId"><option value="">Enginn</option>${vskList().map(c => `<option value="${esc(c.id)}"${sameId(c.id, T.vskId) ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label></div>
      <div class="two"><label>Tengiliður<input data-h="tengilidur" value="${esc(T.tengilidur || "")}"></label><label>Netfang<input data-h="netfang" type="email" value="${esc(T.netfang || "")}"></label></div>
      <label>Staðsetning<input data-h="stadsetning" value="${esc(T.stadsetning || "")}"></label>
      <div class="two"><label>Frá<input data-h="fra" type="date" value="${esc(T.fra || "")}"></label><label>Til<input data-h="til" type="date" value="${esc(T.til || "")}"></label></div>
      <p class="hint" id="tb-dg" style="margin:-4px 0 8px">${tbDagar(T)} ${tbDagar(T) === 1 ? "leigudagur" : "leigudagar"} · dagstuðull ${fx(studull(tbDagar(T)))}</p>
      <div class="viewtitle">Línur</div>
      <div class="links" style="margin:0 0 10px"><button type="button" class="btn primary" data-act="tbl:pick">+ Úr vörulista</button><button type="button" class="btn" data-act="tbl:custom">+ Sérlína</button></div>
      <div id="tb-tab">${tbTableHTML(T, true)}</div>
      <div class="two" style="margin-top:12px"><label>Afsláttur á tilboð (%)<input data-h="afsl" inputmode="decimal" value="${+T.afsl ? esc(fx(T.afsl)) : ""}" placeholder="0"></label><label>Gildir til<input data-h="gildir" type="date" value="${esc(T.gildir || "")}"></label></div>
      <label>Athugasemd á tilboði<textarea data-h="athugasemd" placeholder="Birtist á tilboðinu">${esc(T.athugasemd || "")}</textarea></label>
      <div class="card rksum" id="tb-tot" style="margin-top:10px">${tbTotHTML(T)}</div>
      <div class="links" style="margin-top:12px"><button type="button" class="btn primary" data-act="tbed:save">Vista tilboð</button><button type="button" class="btn" data-act="tbed:cancel">Hætta við</button></div></div>`;
    const t = totals(T);
    return backBar() + `<div class="kicker"><span class="kind">Tilboð ${esc(T.nr)}${+T.utgafa > 1 ? " · útgáfa " + esc(String(T.utgafa)) : ""}</span><span class="pill ${STC[T.stada] || ""}">${esc(T.stada)}</span><span class="pill">${esc(DEILD[T.deild] || "")}</span>${T.prufa ? '<span class="tag">prufa</span>' : ""}</div>
      <h2 class="big" style="margin-top:6px">${esc(T.heiti || "")}</h2>
      <p class="sub">${[T.vskId && findVsk(T.vskId) ? `<a class="plink" data-open="vsk:${esc(T.vskId)}">${esc(T.vidskiptavinur || findVsk(T.vskId).name)}</a>` : esc(T.vidskiptavinur || ""), esc(dRange(T)), T.fra ? esc(tbDagar(T) + (tbDagar(T) === 1 ? " dagur" : " dagar")) : "", esc(T.stadsetning || "")].filter(Boolean).join(" · ")}</p>
      ${pr ? `<p class="sub">Verkefni: <a class="plink" data-open="verk:${esc(pr.id)}">${esc(pr.nafn)}</a></p>` : ""}
      <div class="links">${MCP ? `<button type="button" class="btn primary" data-act="tbed:start:${esc(T.id)}">✎ Breyta</button>` : ""}<button type="button" class="btn" data-act="tbpdf:pv:${esc(T.id)}">Forskoða PDF</button><button type="button" class="btn" data-act="tbpdf:dl:${esc(T.id)}">Sækja PDF</button>
        ${MCP && ms && window.poCompose ? `<button type="button" class="btn" data-act="tbsend:${esc(T.id)}">✉ Senda</button>` : ""}</div>
      ${MCP ? `<div class="kind" style="margin-top:14px">Staða</div><div class="chips">${STADA.map(s => `<button type="button" class="chipbtn" data-act="tbst:${esc(T.id)}:${s}" aria-pressed="${T.stada === s}">${s}</button>`).join("")}</div>
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
    const dg = document.getElementById("tb-dg"); if (dg) dg.textContent = `${tbDagar(EDT)} ${tbDagar(EDT) === 1 ? "leigudagur" : "leigudagar"} · dagstuðull ${fx(studull(tbDagar(EDT)))}`; };
  const onEd = e => { if (!EDT || !e.target.closest?.("#tbed")) return; const h = e.target.dataset.h, L = e.target.dataset.l, hl = e.target.dataset.hl, v = e.target.value;
    if (h) { if (h === "afsl") EDT.afsl = n0(v); else if (h === "vskId") { EDT.vskId = v || null; EDT.vidskiptavinur = v ? findVsk(v)?.name || null : null; } else EDT[h] = v || null;
      if (h === "fra" && EDT.til && EDT.til < v) { EDT.til = v; const ti = document.querySelector('[data-h="til"]'); if (ti) ti.value = v; } if (h === "deild" || h === "fra" || h === "til") { if (e.type === "change") { const tb = document.getElementById("tb-tab"); if (tb) tb.innerHTML = tbTableHTML(EDT, true); } } }
    if (L) { const i = L.indexOf(":"), f = L.slice(0, i), id = L.slice(i + 1), l = (EDT.linur || []).find(x => x.id === id); if (!l) return;
      if (["magn", "verd", "afsl"].includes(f)) l[f] = f === "verd" ? parseKr(v) || 0 : n0(v); else if (f === "dagar") l.dagar = Math.round(n0(v)) || null; else l[f] = v;
      if (f === "teg" && e.type === "change") { const vv = l.v && findV(l.v); if (vv) l.verd = +(v === "leiga" ? vv.leiguverd : vv.soluverd) || l.verd; document.getElementById("tb-tab").innerHTML = tbTableHTML(EDT, true); }
      if (f === "hl" && e.type === "change") document.getElementById("tb-tab").innerHTML = tbTableHTML(EDT, true); }
    if (hl != null && e.type === "change") { const nv = v.trim() || hl; (EDT.linur || []).forEach(l => { if ((l.hl || "Annað") === hl) l.hl = nv; }); document.getElementById("tb-tab").innerHTML = tbTableHTML(EDT, true); }
    refreshTot(); };
  document.addEventListener("input", onEd); document.addEventListener("change", onEd);

  // Velja úr vörulista: sheet með leit og flokkum; hver smellur bætir línu við drögin
  function picker() {
    let pf = "", pq = ""; const draw = () => {
      const xs = VR().filter(v => (!pf || v.flokkur === pf || (pf === "_vinna" && v.tegund === "vinna")) && (!pq || (v.heiti + " " + (v.nr || "")).toLowerCase().includes(pq))).sort((a, b) => FLOKKAR().indexOf(a.flokkur) - FLOKKAR().indexOf(b.flokkur) || a.heiti.localeCompare(b.heiti, "is"));
      document.getElementById("pk-list").innerHTML = xs.length ? xs.map(v => { const n = (EDT.linur || []).filter(l => l.v === v.id).reduce((a, l) => a + (+l.magn || 0), 0);
        return `<button type="button" class="lrow tap pkrow" data-pick="${esc(v.id)}" style="width:100%;text-align:left;border:0;background:none;font:inherit;color:inherit"><div class="lm"><div class="lt">${esc(v.heiti)}</div><div class="ls">${esc([v.flokkur, TEG[v.tegund], v.tegund === "pakki" ? pakkiTxt(v) : ""].filter(Boolean).join(" · "))}</div></div><div class="lr"><span class="lc">${esc(krs(vPrice(v)))}</span>${n ? `<span class="pill">${esc(fx(n))} á tilboði</span>` : ""}</div></button>`; }).join("") : `<div class="empty">Ekkert fannst.</div>`; };
    const fl = FLOKKAR().filter(f => VR().some(v => v.flokkur === f && v.tegund !== "vinna"));
    sheet.innerHTML = `<h3 id="sheet-h">Bæta við úr vörulista</h3><input type="search" id="pk-q" placeholder="Leita…" autocomplete="off" style="margin-bottom:8px">
      <div class="chips" id="pk-f" style="margin-bottom:8px"><button type="button" class="chipbtn" data-pf="" aria-pressed="true">Allt</button>${fl.map(f => `<button type="button" class="chipbtn" data-pf="${esc(f)}" aria-pressed="false">${esc(f)}</button>`).join("")}${VR().some(v => v.tegund === "vinna") ? `<button type="button" class="chipbtn" data-pf="_vinna" aria-pressed="false">Vinna og þjónusta</button>` : ""}</div>
      <div class="llist" id="pk-list"></div><p class="hint" style="margin-top:8px">Smelltu á vöru til að bæta henni við (aftur til að auka magn). Magn, daga og verð má laga á tilboðinu.</p>
      <div class="actions"><button type="button" class="btn primary" id="pk-done">Lokið</button></div>`;
    sheetwrap.hidden = false; draw();
    document.getElementById("pk-q").oninput = e => { pq = e.target.value.trim().toLowerCase(); draw(); };
    document.getElementById("pk-f").onclick = e => { const b = e.target.closest("[data-pf]"); if (!b) return; pf = b.dataset.pf; sheet.querySelectorAll("[data-pf]").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); };
    document.getElementById("pk-list").onclick = e => { const b = e.target.closest("[data-pick]"); if (!b) return; const v = findV(b.dataset.pick); if (!v) return;
      const ex = (EDT.linur || []).find(l => l.v === v.id && !l.dagar && !+l.afsl); if (ex) ex.magn = (+ex.magn || 0) + 1; else (EDT.linur = EDT.linur || []).push(lineFrom(v, EDT));
      toast(v.heiti + (ex ? " – magn " + fx(ex.magn) : " bætt við")); draw(); };
    document.getElementById("pk-done").onclick = () => { sheetwrap.hidden = true; render(); };
  }

  /* ---------- PDF ---------- */
  async function tbPdf(T) {
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
    const meta = [T.stadsetning, T.fra ? dRange(T) + " · " + tbDagar(T) + (tbDagar(T) === 1 ? " leigudagur" : " leigudagar") : ""].filter(Boolean).join("  ·  ");
    if (meta) { P.text(meta, M, y, { size: 9, color: C.grafit }); y += 14; }
    y += 8;
    const X = { d: M + 8, m: 318, a: 362, v: 448, p: 482, u: X1 - 8 };
    const head = () => { P.rect(M, y, X1 - M, 20, C.grafit); [["Lýsing", X.d], ["Magn", X.m, "right"], ["Dagar", X.a, "right"], ["Verð", X.v, "right"], ["Afsl.", X.p, "right"], ["Upphæð", X.u, "right"]].forEach(([s, x, a]) => P.text(s, x, y + 13.5, { w: "medium", size: 8, color: C.hvitt, align: a || "left" })); y += 20; };
    head();
    groups(T).forEach(([hl, ls]) => {
      if (need(40)) head();
      y += 6; P.text(hl.toUpperCase(), X.d, y + 10, { w: "medium", size: 8, color: C.grafit, space: 1 }); y += 16; P.line(M, y, X1, y);
      ls.forEach((l, i) => { const v = l.v ? findV(l.v) : null, pk = v?.tegund === "pakki" ? pakkiTxt(v) : "";
        const ds = P.wrap(l.heiti, X.m - 40 - X.d, 9), ps = pk ? P.wrap(pk, X.m - 40 - X.d, 7.5) : [], h = 9 + ds.length * 12 + ps.length * 10; if (need(h)) head();
        if (i % 2) P.rect(M, y, X1 - M, h, C.pappir);
        ds.forEach((s, j) => P.text(s, X.d, y + 13 + j * 12, { size: 9 })); ps.forEach((s, j) => P.text(s, X.d, y + 13 + ds.length * 12 + j * 10 - 2, { size: 7.5, color: C.stal }));
        P.text(fx(l.magn) + " " + (l.ein || ""), X.m, y + 13, { size: 9, align: "right" });
        if (l.teg === "leiga") P.text(String(lDagar(l, T)), X.a, y + 13, { size: 9, align: "right" });
        P.text(num(Math.round(+l.verd || 0)), X.v, y + 13, { size: 9, align: "right" }); if (+l.afsl) P.text(fx(l.afsl) + "%", X.p, y + 13, { size: 9, align: "right" });
        P.text(num(lSum(l, T)), X.u, y + 13, { size: 9, w: "medium", align: "right" }); y += h; P.line(M, y, X1, y); });
      need(18); P.text("Samtals – " + hl, X.v + 34, y + 12, { size: 8.5, color: C.grafit, align: "right" }); P.text(num(ls.reduce((a, l) => a + lSum(l, T), 0)) + " kr.", X.u, y + 12, { size: 8.5, w: "medium", align: "right" }); y += 18;
    });
    need(130); y += 14; const tx = 330, row = (k, v) => { P.text(k, tx, y, { size: 9.5, color: C.grafit }); P.text(v, X1 - 8, y, { size: 9.5, align: "right" }); y += 15; };
    if (t.leiga) row("Leiga", krs(t.leiga)); if (t.sala) row("Sala", krs(t.sala)); if (t.vinna) row("Vinna og þjónusta", krs(t.vinna));
    if (t.afsl) row("Afsláttur " + fx(T.afsl) + "%", "−" + krs(t.afsl));
    row("Samtals án VSK", krs(t.net)); row("VSK " + fx(vskP()) + "%", krs(t.vsk)); y -= 5;
    P.rect(tx - 8, y, X1 - tx + 8, 30, C.nott); P.text("Samtals með VSK", tx, y + 19.5, { w: "medium", size: 10.5, color: C.hvitt }); P.text(krs(t.tot), X1 - 8, y + 19.5, { w: "medium", size: 11.5, color: C.hvitt, align: "right" }); y += 48;
    const txt = (title, s) => { if (!s) return; need(40); P.text(title, M, y, { size: 7.5, color: C.stal, space: 1.2 }); y += 14; P.wrap(s, X1 - M, 9).forEach(z => { need(13); P.text(z, M, y, { size: 9 }); y += 12.5; }); y += 10; };
    txt("ATHUGASEMD", T.athugasemd); txt("SKILMÁLAR", CF().skilmalar + (T.gildir ? " Tilboðið gildir til " + dIS(T.gildir) + "." : ""));
    return P.finish(label);
  }
  const fileBase = T => `Tilboð ${T.nr}${+T.utgafa > 1 ? " v" + T.utgafa : ""} ${T.vidskiptavinur || ""} ${T.heiti || ""}`.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  window.tbPdfBytes = tbPdf;

  /* ---------- Prufugögn ---------- */
  function prufa(cls) {
    const V = [], add = (heiti, flokkur, tegund, o = {}) => { const v = { id: gid(), heiti, flokkur, tegund, eining: "stk.", leiguverd: 0, soluverd: 0, innkaupsverd: 0, fjoldi: 0, lysing: null, innihald: [], prufa: true, ...o }; V.push(v); return v; };
    let n = 100; const nr = p => p + "-" + (++n);
    const e8 = add("d&b E8 hátalari", "Hljóð", "baedi", { nr: nr("HL"), leiguverd: 6500, soluverd: 489000, innkaupsverd: 352000, fjoldi: 16, lysing: "2-way passive loudspeaker, 1 x 8\" / 1\" HF. Með festingum." });
    const b6 = add("d&b B6 bassabox", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 9500, fjoldi: 8, lysing: "1 x 18\" bassabox." });
    const d20 = add("d&b D20 magnari", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 12000, fjoldi: 6 });
    const dlive = add("Allen & Heath dLive C1500 mixer", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 35000, fjoldi: 2, lysing: "Stafrænn mixer með CDM32 stagebox." });
    const sq5 = add("Allen & Heath SQ-5 mixer", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 18000, fjoldi: 3 });
    const sm58 = add("Shure SM58 hljóðnemi", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 1500, fjoldi: 24 });
    const ulxd = add("Shure ULXD2/B58 þráðlaus hljóðnemi", "Hljóð", "leiga", { nr: nr("HL"), leiguverd: 6000, fjoldi: 12 });
    const k12 = add("QSC K12.2 hátalari", "Hljóð", "baedi", { nr: nr("HL"), leiguverd: 4500, soluverd: 189000, innkaupsverd: 128000, fjoldi: 10 });
    add("Genelec 4030C uppsetningarhátalari", "Hljóð", "sala", { nr: nr("HL"), soluverd: 98000, innkaupsverd: 66000, fjoldi: 20, lysing: "Fyrir veitingastaði og hótel, hvítur eða svartur." });
    add("Sonos Amp magnari", "Hljóð", "sala", { nr: nr("HL"), soluverd: 129000, innkaupsverd: 92000, fjoldi: 6 });
    const mac = add("Martin MAC Aura XB", "Ljós", "leiga", { nr: nr("LJ"), leiguverd: 8500, fjoldi: 24 });
    const parL = add("LED PAR RGBW", "Ljós", "leiga", { nr: nr("LJ"), leiguverd: 2000, fjoldi: 48 });
    const ma3 = add("grandMA3 compact XT ljósaborð", "Ljós", "leiga", { nr: nr("LJ"), leiguverd: 45000, fjoldi: 1 });
    const haze = add("Hazer MDG ATMe", "Ljós", "leiga", { nr: nr("LJ"), leiguverd: 9000, fjoldi: 2 });
    const truss = add("Truss F34, 3 m", "Ljós", "leiga", { nr: nr("LJ"), leiguverd: 2500, fjoldi: 30 });
    const led = add("LED skjáveggur P2.9 (á m²)", "LED", "leiga", { nr: nr("LED"), eining: "m²", leiguverd: 18000, fjoldi: 40, lysing: "Innanhúss LED, 500 × 500 mm einingar." });
    const nova = add("Novastar VX1000 stýring", "LED", "leiga", { nr: nr("LED"), leiguverd: 15000, fjoldi: 3 });
    const tv75 = add("Samsung 75\" skjár á standi", "Skjáir", "baedi", { nr: nr("SK"), leiguverd: 15000, soluverd: 329000, innkaupsverd: 241000, fjoldi: 8 });
    const tv55 = add("Samsung 55\" skjár á standi", "Skjáir", "leiga", { nr: nr("SK"), leiguverd: 9000, fjoldi: 12 });
    const proj = add("Skjávarpi 10.000 lm með tjaldi", "Skjáir", "leiga", { nr: nr("SK"), leiguverd: 28000, fjoldi: 3 });
    add("Rafmagnsdreifing 63A", "Annað", "leiga", { nr: nr("AN"), leiguverd: 7500, fjoldi: 4 });
    const tech = add("Hljóðmaður", "Annað", "vinna", { nr: nr("VN"), eining: "klst.", soluverd: 9500 });
    const ljm = add("Ljósamaður", "Annað", "vinna", { nr: nr("VN"), eining: "klst.", soluverd: 9500 });
    const upps = add("Uppsetning og niðurtaka", "Annað", "vinna", { nr: nr("VN"), eining: "klst.", soluverd: 7500 });
    const akst = add("Akstur, sendibíll", "Annað", "vinna", { nr: nr("VN"), eining: "ferð", soluverd: 15000 });
    const pkS = add("Hljóðkerfi lítið (allt að 150 manns)", "Hljóð", "pakki", { nr: nr("PK"), leiguverd: 32000, fjoldi: 2, innihald: [{ v: k12.id, m: 2 }, { v: sq5.id, m: 1 }, { v: sm58.id, m: 2 }, { v: ulxd.id, m: 1 }] });
    const pkL = add("Ræðupúltpakki", "Hljóð", "pakki", { nr: nr("PK"), leiguverd: 12000, fjoldi: 3, innihald: [{ v: sm58.id, m: 1 }, { v: k12.id, m: 1 }] });
    const L = (v, magn, o = {}) => ({ ...lineFrom(v, null), magn, ...o });
    const CL = cls || S?.vidskiptavinir || [], cl = CL[0] || null, cl2 = CL[1] || cl;
    const day = off => { const x = new Date(); x.setDate(x.getDate() + off); return isoDay(x); };
    const tb = (nr, o, linur) => ({ id: gid(), nr, deild: "leiga", vskId: null, vidskiptavinur: null, tengilidur: null, netfang: null, stadsetning: null, gildir: day(14), dags: day(-2), stada: "Drög", utgafa: 1, eldri: [], afsl: 0, athugasemd: null, verkefniId: null, prufa: true, ...o, linur });
    const T = [
      tb("T-0901", { heiti: "Árshátíð í Hörpu", vskId: cl?.id || null, vidskiptavinur: cl?.name || "Prufufyrirtæki ehf.", tengilidur: "Anna Prufudóttir", stadsetning: "Harpa, Silfurberg", fra: day(12), til: day(13), stada: "Sent", dags: day(-3) },
        [L(e8, 8), L(b6, 4), L(d20, 3), L(dlive, 1), L(ulxd, 4), L(mac, 12), L(parL, 24), L(ma3, 1), L(haze, 1), L(truss, 10), L(led, 24), L(nova, 1), L(tech, 18), L(ljm, 18), L(upps, 24), L(akst, 4)]),
      tb("T-0902", { heiti: "Ráðstefna – fundarsalur", vidskiptavinur: cl2?.name || "Prufustofnun", vskId: cl2?.id || null, stadsetning: "Hilton Nordica", fra: day(5), til: day(5), stada: "Samþykkt", dags: day(-6), afsl: 5 },
        [L(pkL, 2), L(proj, 1), L(tv75, 2), L(tech, 9), L(akst, 2)]),
      tb("T-0903", { heiti: "Hljóðkerfi fyrir veitingastað", deild: "sala", vidskiptavinur: "Prufuveitingar ehf.", stadsetning: "Laugavegur", fra: null, til: null, dags: day(-1) },
        [L(V.find(v => v.heiti.startsWith("Genelec")), 6, { teg: "sala" }), L(V.find(v => v.heiti.startsWith("Sonos")), 2, { teg: "sala" }), L(upps, 10), L(akst, 1)]),
      tb("T-0904", { heiti: "Útitónleikar – sumarhátíð", vidskiptavinur: "Prufuhátíð", stadsetning: "Klambratún", fra: day(40), til: day(42), dags: day(-10), stada: "Hafnað" },
        [L(e8, 16), L(b6, 8), L(d20, 6), L(dlive, 1), L(mac, 24), L(truss, 20), L(tech, 30)])
    ];
    T.forEach(t => t.linur.forEach(l => { l.id = gid(); if (l.teg !== "leiga") l.dagar = null; }));
    void pkS; void tv55;
    return { vorur: V, tilbod: T };
  }
  window.salaPrufa = prufa;

  /* ---------- Stillingar ---------- */
  window.tbStillingar = function () {
    const c = CF();
    return `<p class="hint" style="margin:14px 0 10px">Gildir fyrir Vörulista og Tilboð hjá ${esc(ORG.nafn)}.</p>
      <label>Flokkar í vörulista (einn í línu)<textarea id="ts-fl" rows="6">${esc((c.flokkar || []).join("\n"))}</textarea></label>
      <label>Dagstuðlar leigu – dagur 1, 2, 3 … (aðskilið með ;)<input id="ts-st" value="${esc((c.studlar || []).map(fx).join("; "))}"></label>
      <p class="hint" style="margin:-4px 0 10px">Leiguverð á dag × stuðull. Dæmi: 1; 1,5; 2 = 2 dagar kosta 1,5 dagsverð og 3 dagar 2 dagsverð. Eftir síðasta stuðul bætast 0,25 við á dag.</p>
      <div class="two"><label>VSK %<input id="ts-vsk" inputmode="decimal" value="${esc(fx(c.vsk))}"></label><label>Tilboð gildir (dagar)<input id="ts-gd" inputmode="numeric" value="${esc(String(c.gildisdagar))}"></label></div>
      <label>Næsta tilboðsnúmer<input id="ts-nr" inputmode="numeric" value="${esc(String(c.nastaNr))}"></label>
      <label>Skilmálar á tilboðum<textarea id="ts-sk" rows="5">${esc(c.skilmalar || "")}</textarea></label>
      <button type="button" class="btn primary" data-act="tbcfg" style="margin-top:8px">Vista stillingar</button>`;
  };

  /* ---------- Aðgerðir ---------- */
  const saveT = (id, fn) => saveSnapshot(s => { const q = (s.tilbod || []).find(x => x.id === id); if (q) fn(q, s); });
  window.salaAct = function (k, r) {
    const a = r.join(":");
    if (k === "vrf") { VF = a; VK = ""; try { localStorage.setItem("atrium-vf", VF); } catch (e) {} render(); return; }
    if (k === "vrk") { VK = a; render(); return; }
    if (k === "vrnew") { varaForm(a || null); return; }
    if (k === "vrdel") { const v = findV(a); if (!v) return; const n = TB().filter(t => (t.linur || []).some(l => l.v === a)).length;
      if (!confirm(`Eyða „${v.heiti}“ úr vörulista?${n ? `\n\nVaran er á ${n} tilboðum – línurnar þar haldast óbreyttar.` : ""}`)) return;
      saveSnapshot(s => { s.vorur = (s.vorur || []).filter(x => x.id !== a); }).then(() => { toast("Vöru eytt"); goBack(); }).catch(e => toast(errText(e))); return; }
    if (k === "vrprufa") { if (!ADM()) return toast("Aðeins admin.");
      if (a === "inn") { const p = prufa(); saveSnapshot(s => { s.vorur = [...(s.vorur || []), ...p.vorur]; s.tilbod = [...(s.tilbod || []), ...p.tilbod]; }).then(() => toast(`${p.vorur.length} prufuvörum og ${p.tilbod.length} prufutilboðum bætt við`)).catch(e => toast(errText(e))); return; }
      const nv = VR().filter(v => v.prufa).length, nt = TB().filter(t => t.prufa).length;
      if (!confirm(`Eyða öllum prufugögnum: ${nv} vörum og ${nt} tilboðum merktum „prufa“?\n\nAnnað í vörulista og tilboðum helst óbreytt.`)) return;
      saveSnapshot(s => { s.vorur = (s.vorur || []).filter(v => !v.prufa); s.tilbod = (s.tilbod || []).filter(t => !t.prufa); }).then(() => toast("Prufugögnum eytt")).catch(e => toast(errText(e))); return; }
    if (k === "tbf") { TF = a; try { localStorage.setItem("atrium-tf", TF); } catch (e) {} render(); return; }
    if (k === "tbs") { TS = a; render(); return; }
    if (k === "tbnew") { if (!VR().length && !confirm("Vörulistinn er tómur – línur má samt skrá sem sérlínur. Halda áfram?")) return; tbForm(); return; }
    if (k === "tbed") { const [op, id] = r;
      if (op === "start") { const T = findT(id); if (T) { EDT = structuredClone(T); render(); window.scrollTo({ top: 0 }); } return; }
      if (op === "cancel") { if (!confirm("Hætta við breytingar á tilboðinu?")) return; EDT = null; render(); return; }
      if (op === "save") { const D = EDT; if (!D) return; if (D.fra && D.til && D.til < D.fra) return toast("„Til“ getur ekki verið á undan „Frá“.");
        saveT(D.id, q => { Object.keys(D).forEach(x => { q[x] = D[x]; }); }).then(() => { EDT = null; toast("Tilboð vistað"); render(); }).catch(e => toast(errText(e))); return; } }
    if (k === "tbl") { if (!EDT) return; const [op, id] = r;
      if (op === "pick") { if (!VR().length) return toast("Vörulistinn er tómur – bættu við vörum eða notaðu sérlínu."); picker(); return; }
      if (op === "custom") { (EDT.linur = EDT.linur || []).push({ id: gid(), v: null, heiti: "Ný lína", teg: EDT.deild === "sala" ? "sala" : "leiga", hl: groups(EDT).slice(-1)[0]?.[0] || "Annað", magn: 1, ein: "stk.", verd: 0, dagar: null, afsl: 0 }); render(); return; }
      if (op === "del") { EDT.linur = (EDT.linur || []).filter(l => l.id !== id); render(); return; } }
    if (k === "tbst") { const [id, st] = r; saveT(id, q => { q.stada = st; if (st === "Sent" && !q.sent) q.sent = isoDay(new Date()); }).then(() => toast("Staða: " + st)); return; }
    if (k === "tbutg") { const T = findT(a); if (!T || !confirm(`Búa til útgáfu ${(+T.utgafa || 1) + 1} af tilboði ${T.nr}?\n\nNúverandi útgáfa er skráð í „Fyrri útgáfur“ og staðan fer aftur í Drög.`)) return;
      saveT(a, q => { (q.eldri = q.eldri || []).push({ utgafa: +q.utgafa || 1, dags: q.dags, net: totals(q).net }); q.utgafa = (+q.utgafa || 1) + 1; q.dags = isoDay(new Date()); q.stada = "Drög"; })
        .then(() => { EDT = structuredClone(findT(a)); render(); toast("Ný útgáfa – breyttu og vistaðu"); }); return; }
    if (k === "tbcopy") { const T = findT(a); if (!T) return; const c = CF(), id = gid(), nr = "T-" + (+c.nastaNr || 1001);
      const N = { ...structuredClone(T), id, nr, stada: "Drög", utgafa: 1, eldri: [], dags: isoDay(new Date()), verkefniId: null, sent: null, prufa: false, linur: (T.linur || []).map(l => ({ ...l, id: gid() })) };
      delete N.stofnad_af; delete N.stofnad_t; delete N.breytt_af; delete N.breytt_t; delete N._o;
      saveSnapshot(s => { (s.tilbod = s.tilbod || []).push(N); s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), nastaNr: (+c.nastaNr || 1001) + 1 }; })
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
          thjonusta: [], timar: 0, yfirlit: null, mappa: null, undirverk: [], starfsmenn: [ME()], aklst: null, tilbod: totals(T).net, tilbodId: T.id, timabilFra: T.fra || null, timabilTil: T.til || null,
          lysing: [T.stadsetning, T.fra ? dRange(T) : ""].filter(Boolean).join(" · ") || null });
        const q = (s.tilbod || []).find(x => x.id === a); if (q) q.verkefniId = id; })
        .then(() => { toast(`Verkefni ${nr} stofnað`); openDetail("verk:" + id); }).catch(e => toast(errText(e))); return; }
    if (k === "tbcfg") { const g = x => (document.getElementById(x)?.value || "").trim();
      const studlar = g("ts-st").split(/[;\s]+/).map(n0).filter(x => x > 0), flokkar = g("ts-fl").split(/\n/).map(x => x.trim()).filter(Boolean);
      if (!studlar.length) return toast("Skráðu að minnsta kosti einn dagstuðul.");
      saveSnapshot(s => { s.stillingar = s.stillingar || {}; s.stillingar.tilbod = { ...(s.stillingar.tilbod || {}), flokkar: flokkar.length ? flokkar : DEF.flokkar, studlar, vsk: n0(g("ts-vsk")), gildisdagar: Math.round(n0(g("ts-gd"))) || 14, nastaNr: Math.round(n0(g("ts-nr"))) || 1001, skilmalar: g("ts-sk") }; })
        .then(() => toast("Stillingar tilboða vistaðar")).catch(e => toast(errText(e))); return; }
  };
  // Tilboð viðskiptavinar (á síðu viðskiptavinar) og verkefnis
  window.tbFor = pred => { if (!window.ON || !ON("tilbod")) return ""; const xs = TB().filter(pred).sort((a, b) => String(b.dags || "").localeCompare(String(a.dags || ""))); return xs.length ? `<div class="viewtitle">Tilboð · ${xs.length}</div>${llist(xs.map(tbRow))}` : ""; };
  // Skrá viðbætur í kjarnann (sjá app-sidur.js: VIEWS_EXT, DETAIL_EXT, ACT_EXT, FAB_EXT)
  Object.assign(window.VIEWS_EXT = window.VIEWS_EXT || {}, { vorur: () => vVorur(), tilbod: () => vTilbod() });
  Object.assign(window.DETAIL_EXT = window.DETAIL_EXT || {}, { vara: id => { const v = findV(id); return v && dVara(v); }, tb: id => { const T = findT(id); return T && dTilbod(T); } });
  Object.assign(window.ACT_EXT = window.ACT_EXT || {}, { vr: salaAct, tb: salaAct });
  Object.assign(window.FAB_EXT = window.FAB_EXT || {}, { vorur: () => varaForm(null), tilbod: () => salaAct("tbnew", []) });
  window.salaEditing = () => !!EDT;
  window.salaDropEdit = () => { EDT = null; };
})();
