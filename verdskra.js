/* Verðskrá (frá 1.6.0): tímagjald eftir verkþáttum. Birtist efst í Skjöl og stýrir tímagjaldi á reikningum.
   Gögn: S.stillingar.verdskra = { lidir: [{ id, heiti, verd, sjalfgefid, verkefni: [verknúmer] }], vsk, vskSkra, athugasemd, uppfaert, af }
   Ef ekkert er vistað gildir DEF hér að neðan (verðskrá AERA Studio 18.10.2026).
   Tímagjald verkefnis: 1) eigið tímagjald verkefnis (p.timagjald), 2) verkþáttur valinn á verkefni (p.taxti),
   3) verkþáttur sem listar verknúmerið, 4) sjálfgefinn verkþáttur, 5) sjálfgefið tímagjald í Reikningsstillingum. */
(function () {
  const DEF = {
    lidir: [
      { id: "ljos", heiti: "Ljósahönnun", verd: 10000 },
      { id: "honnun", heiti: "Almenn hönnunarvinna", verd: 10000, sjalfgefid: true },
      { id: "grand", heiti: "Hönnunarvinna – Grand Hótel, stækkun", verd: 12000, verkefni: ["2026-04"] },
      { id: "annad", heiti: "Önnur vinna", verd: 10000 }
    ],
    vsk: 24, vskSkra: false,
    athugasemd: "VSK leggst aðeins á reikninga eftir að félagið er komið á VSK-skrá."
  };
  window.VERD = () => { const v = (typeof CFG === "function" && CFG().verdskra) || null; return v && Array.isArray(v.lidir) && v.lidir.length ? { ...DEF, ...v } : DEF; };
  const lid = id => VERD().lidir.find(l => l.id === id);
  window.taxtiOf = p => (p?.taxti && lid(p.taxti)) || VERD().lidir.find(l => (l.verkefni || []).includes(p?.nr)) || VERD().lidir.find(l => l.sjalfgefid) || null;
  window.rateOf = p => +(p?.timagjald || taxtiOf(p)?.verd || 0);
  const kr0 = n => num(Math.round(+n || 0));
  const fj = () => !!(window.can && can("stillingar"));
  let EDIT = false;

  window.vsCard = () => { const v = VERD(), lo = Math.min(...v.lidir.map(l => +l.verd || 0)), hi = Math.max(...v.lidir.map(l => +l.verd || 0));
    return `<div class="viewtitle">Fest</div>${llist([`<div class="lrow tap" ${tapAttr("verdskra", "aera")}><div class="ll">${(typeof EI !== "undefined" && EI.rk) || ""}</div><div class="lm"><div class="lt">Verðskrá ${esc(ORG.nafn)}</div><div class="ls">Tímagjald ${esc(kr0(lo))}${hi !== lo ? "–" + esc(kr0(hi)) : ""} kr./klst. án VSK · ${v.lidir.length} verkþættir</div></div>${CHEV}</div>`])}`; };

  window.dVerdskra = function () {
    const v = VERD(), vp = +v.vsk || 24, vs = !!v.vskSkra;
    const rows = v.lidir.map((l, i) => EDIT ? `<tr><td><input data-vs="heiti:${i}" value="${esc(l.heiti)}" aria-label="Verkþáttur"></td><td class="r"><input data-vs="verd:${i}" inputmode="numeric" value="${esc(String(l.verd || ""))}" aria-label="Verð" style="text-align:right;max-width:120px"></td>
        <td><label class="vsdef"><input type="radio" name="vsdef" value="${i}"${l.sjalfgefid ? " checked" : ""}> Sjálfgefið</label></td><td><input data-vs="verkefni:${i}" value="${esc((l.verkefni || []).join(", "))}" placeholder="Verknúmer, t.d. 2026-04" aria-label="Verkefni"></td><td><button type="button" class="mini" data-act="vs:del:${i}" aria-label="Eyða línu">✕</button></td></tr>`
      : `<tr><td>${esc(l.heiti)}${l.sjalfgefid ? ' <span class="tag">sjálfgefið</span>' : ""}${(l.verkefni || []).length ? `<div class="ls">Gildir fyrir ${esc(l.verkefni.join(", "))}</div>` : ""}</td><td class="r">${esc(kr0(l.verd))}</td><td class="r">${esc(kr0(l.verd * vp / 100))}</td><td class="r"><b>${esc(kr0(l.verd * (1 + vp / 100)))}</b></td></tr>`).join("");
    const head = EDIT ? `<tr><th>Verkþáttur</th><th class="r">Verð án VSK</th><th></th><th>Á verkefni</th><th></th></tr>` : `<tr><th>Verkþáttur</th><th class="r">Verð án VSK (kr./klst.)</th><th class="r">VSK ${vp}% (kr.)</th><th class="r">Verð með VSK (kr./klst.)</th></tr>`;
    const lo = Math.min(...v.lidir.map(l => +l.verd || 0)), hi = Math.max(...v.lidir.map(l => +l.verd || 0));
    const used = verkefni().filter(p => !isDone(p)).map(p => [p, taxtiOf(p)]);
    return backBar() + `<div class="kicker"><span class="kind">Skjal</span>${v.uppfaert ? `<span class="pill">Uppfært ${esc(fmtDate(v.uppfaert))}</span>` : `<span class="pill">18. okt. 2026</span>`}</div>
      <h2 class="big" style="margin-top:6px">Verðskrá ${esc(ORG.nafn)}</h2>
      <p class="sub">Tímagjald ${esc(ORG.nafn)} er ${esc(kr0(lo))}${hi !== lo ? "–" + esc(kr0(hi)) : ""} kr. á klukkustund án VSK, eftir tegund verks.</p>
      <div class="viewtitle">Tímagjald</div><div class="tw"><table class="vstab">${`<thead>${head}</thead>`}<tbody>${rows}</tbody></table></div>
      ${EDIT ? `<div class="links" style="margin-top:8px"><button type="button" class="btn" data-act="vs:add">+ Lína</button></div>
        <label class="chk" style="margin-top:12px"><input type="checkbox" id="vs-skra"${vs ? " checked" : ""}> Félagið er á VSK-skrá (VSK ${vp}% leggst á reikninga)</label>
        <label>Athugasemd<textarea id="vs-ath">${esc(v.athugasemd || "")}</textarea></label>
        <div class="links" style="margin-top:12px"><button type="button" class="btn primary" data-act="vs:save">Vista verðskrá</button><button type="button" class="btn" data-act="vs:cancel">Hætta við</button></div>`
        : `<p class="hint" style="margin-top:8px">${esc(v.athugasemd || "")} ${vs ? "Félagið er á VSK-skrá." : "<b>Félagið er ekki á VSK-skrá – reikningar eru án VSK.</b>"}</p>
        ${fj() ? `<div class="links"><button type="button" class="btn" data-act="vs:edit">✎ Breyta verðskrá</button><button type="button" class="btn" onclick="window.print()">Prenta / PDF</button></div>` : `<div class="links"><button type="button" class="btn" onclick="window.print()">Prenta / PDF</button></div>`}`}
      <div class="viewtitle">Tímagjald verkefna í gangi</div>${llist(used.map(([p, l]) => lrow("verk:" + p.id, { title: `<span class="nr">${esc(p.nr)}</span>&nbsp; ${esc(p.stutt || p.nafn)}`, sub: esc(p.timagjald ? "Eigið tímagjald verkefnis" : l ? l.heiti : "Ekkert tímagjald"), right: `<span class="lc">${esc(kr0(rateOf(p)))} kr./klst.</span>` })))}
      <p class="hint">Tímagjald verkefnis: eigið tímagjald (ef skráð) › verkþáttur valinn á verkefni › verkþáttur sem nefnir verknúmerið › sjálfgefinn verkþáttur. Breyta má fyrir hvert verkefni undir Breyta verkefni og við reikningsfærslu.</p>`;
  };

  function read() {
    const v = VERD(), lidir = v.lidir.map((l, i) => {
      const g = k => document.querySelector(`[data-vs="${k}:${i}"]`)?.value ?? "";
      return { id: l.id || ("l" + Date.now().toString(36) + i), heiti: g("heiti").trim(), verd: parseKr(g("verd")) || 0, sjalfgefid: document.querySelector(`input[name="vsdef"][value="${i}"]`)?.checked || false,
        verkefni: g("verkefni").split(/[,\s]+/).map(s => s.trim()).filter(Boolean) };
    }).filter(l => l.heiti);
    if (!lidir.some(l => l.sjalfgefid) && lidir.length) lidir[0].sjalfgefid = true;
    return { ...v, lidir, vskSkra: !!document.getElementById("vs-skra")?.checked, athugasemd: document.getElementById("vs-ath")?.value || "" };
  }
  window.vsAct = function (r) {
    const [op, a] = r;
    if (op === "edit") { EDIT = true; render(); return; }
    if (op === "cancel") { EDIT = false; render(); return; }
    if (op === "add" || op === "del") { const v = read(); if (op === "add") v.lidir.push({ id: "l" + Date.now().toString(36), heiti: "Nýr verkþáttur", verd: v.lidir.find(l => l.sjalfgefid)?.verd || 10000 }); else v.lidir.splice(+a, 1);
      TMP = v; render(); return; }
    if (op === "save") { const v = read(); if (!v.lidir.length) return toast("Verðskráin þarf að minnsta kosti eina línu.");
      if (v.lidir.some(l => !(l.verd > 0))) return toast("Skráðu verð á allar línur.");
      saveSnapshot(s => { s.stillingar = s.stillingar || {}; s.stillingar.verdskra = { ...v, uppfaert: new Date().toISOString(), af: window.USER?.email || "" }; })
        .then(() => { EDIT = false; TMP = null; toast("Verðskrá vistuð"); }).catch(e => toast(errText(e))); }
  };
  // Tímabundin útgáfa á meðan línum er bætt við/eytt í breytingaham (áður en vistað er)
  let TMP = null; const base = window.VERD; window.VERD = () => (EDIT && TMP) || base();
})();
