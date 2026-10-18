/* Sérsniðinn Heim-skjár (frá 1.5.0).
   Heim er samsettur úr einingum (widgets). Hver notandi velur hvaða einingar birtast, í hvaða röð og hversu stórar,
   og hvaða flýtileiðir eru í einingunni Flýtileiðir. Stillingin er geymd á notandann í Firestore (notandi/{netfang})
   svo hún fylgi honum milli tækja; afrit er geymt á tækinu ef skrif mistekst. */
(function () {
  // Allar einingar: heiti, lýsing, sjálfgefin stærð (s = þriðjungur, m = helmingur, l = full breidd), og hvort aðeins fjármál sjá
  const W = {
    kvedja:    { l: "Kveðja", d: "Góðan dag og staðan í stuttu máli", s: "l" },
    vika:      { l: "Vikumarkmið", d: "Hringur með klst. vikunnar", s: "s" },
    idag:      { l: "Í dag", d: "Fundir, skil og klukka dagsins", s: "s" },
    naest:     { l: "Næst á eftir", d: "Næsta atriði á dagskrá", s: "s" },
    spjold:    { l: "Lykiltölur", d: "Spjöld með tölum sem skipta máli – veldu þau undir Lykiltölur", s: "l" },
    flyti:     { l: "Flýtileiðir", d: "Hnappar sem þú velur sjálf(ur)", s: "l" },
    ch_vikur:  { l: "Myndrit: tímar 8 vikur", d: "Súlurit yfir vikurnar", s: "m" },
    ch_verk:   { l: "Myndrit: tímar á verkefni", d: "Yfirstandandi tímabil", s: "m" },
    ch_stada:  { l: "Myndrit: staða verkefna", d: "Verkefni í gangi eftir stöðu", s: "m" },
    ch_reikn:  { l: "Myndrit: reikningsfært", d: "Reikningar, ógreitt, óreikningsfært", s: "m", fj: 1 },
    oinnheimt: { l: "Óinnheimt", d: "Óreikningsfært og ógreitt í krónum", s: "m", fj: 1 },
    verkefni:  { l: "Verkefni í gangi", d: "Spjöld verkefna með framvindu", s: "l" },
    framundan: { l: "Framundan 7 dagar", d: "Fundir, skil og gjalddagar", s: "m" },
    frag:      { l: "Til að ganga frá", d: "Fram yfir, óreikningsfært, ógreitt", s: "m" },
    nylegt:    { l: "Nýlegt", d: "Síðustu tímar, athugasemdir og þræðir", s: "m" },
    postur:    { l: "Óflokkaður póstur", d: "Þræðir í AERA-möppunni", s: "m" },
    spjall:    { l: "Spjall", d: "Nýjustu skilaboðin", s: "m" }
  };
  const DEF = ["kvedja", "vika", "idag", "naest", "flyti", "spjold", "oinnheimt", "ch_vikur", "ch_verk", "ch_stada", "ch_reikn"];
  // Flýtileiðir: [heiti, aðgerð, tákn-lykill]
  const SC = {
    tima:    ["Skrá tíma", "add:tima", "time"],
    klukka:  ["Byrja klukku", "kstart:", "time"],
    kostn:   ["Útlagður kostnaður", "add:kostn", "card"],
    verk:    ["Nýtt verkefni", "add:verk", "doc"],
    fund:    ["Nýr fundur", "add:fund", "chat"],
    dagatal: ["Dagatal", "tab:dagatal", "time"],
    vikan:   ["Tímar – vikan", "tab:timar", "time"],
    skyrsla: ["Tímaskýrsla", "tab:tskyr", "rk"],
    reikn:   ["Reikningar", "tab:trk", "rk"],
    vsk:     ["Viðskiptavinir", "tab:vsk", "doc"],
    postur:  ["Póstur", "tab:postur", "mail"],
    spjall:  ["Spjall", "tab:spjall", "chat"],
    skjol:   ["Skjöl", "tab:skjol", "doc"]
  };
  const SC_DEF = ["tima", "klukka", "verk", "spjall"];
  // Lykiltölur (spjöld): [heiti, lýsing, aðeins fjármál]
  const TL = {
    timar_dag: ["Klst. í dag", "Það sem þú hefur skráð í dag, með klukku í gangi"],
    fram7: ["Framundan 7 daga", "Fundir, skil og gjalddagar næstu viku"],
    verk: ["Verkefni í gangi", "Fjöldi verkefna og hve mörg eru fram yfir skiladag"],
    oinn: ["Óinnheimt", "Óreikningsfært og ógreitt í krónum", 1],
    olesid: ["Ólesið", "Ólesin skilaboð í spjalli og óflokkaður póstur"],
    seint: ["Komið fram yfir", "Skil og fundir sem eru komin fram yfir"],
    frag: ["Til að ganga frá", "Fram yfir, óreikningsfært, ógreitt o.fl."],
    nyl: ["Óflokkaður póstur", "Þræðir í AERA-möppunni sem á eftir að tengja"]
  };
  const TL_DEF = () => fj() ? ["timar_dag", "fram7", "verk", "oinn"] : ["timar_dag", "fram7", "verk", "olesid"];
  const PIC = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>`; // mappa = verkefni
  let PREF = null, DBREF = null, saving = null;
  const LSK = "aera-heim";
  const me = () => window.USER?.email || "";
  const fj = () => !!(window.can && can("fjarmal"));
  const avail = id => W[id] && (!W[id].fj || fj());
  const load = () => { try { return JSON.parse(localStorage.getItem(LSK) || "null"); } catch (e) { return null; } };
  const cur = () => {
    const p = PREF || load() || {};
    const w = (p.w || DEF.map(id => ({ id }))).filter(x => avail(x.id));
    return { w, sc: p.sc || SC_DEF.slice(), pin: p.pin || [], tl: (p.tl || TL_DEF()).filter(k => TL[k] && (!TL[k][2] || fj())) };
  };
  function save(p) {
    PREF = p; try { localStorage.setItem(LSK, JSON.stringify(p)); } catch (e) {}
    clearTimeout(saving); saving = setTimeout(() => { if (DBREF && me()) DBREF.set("notandi/" + me(), { heim: p, breytt: new Date().toISOString() }).catch(e => console.warn("Heim-stilling", e)); }, 400);
    render(); if (editorOpen()) openEditor(true);
  }
  window.heimStart = db => { DBREF = db; if (!me() || !db?.watch) return;
    db.watch("notandi/" + me(), s => { const h = s.exists ? s.data()?.heim : null; if (h && JSON.stringify(h) !== JSON.stringify(PREF)) { PREF = h; try { localStorage.setItem(LSK, JSON.stringify(h)); } catch (e) {} if (typeof tab !== "undefined" && tab === "yfirlit") render(); } }, () => {}); };

  function flyti() {
    const c = cur(), ic = k => (typeof EI !== "undefined" && EI[k]) || "";
    const acts = c.sc.filter(k => SC[k]).map(k => `<button type="button" class="hsc" data-act="${esc(SC[k][1])}">${ic(SC[k][2])}<span>${esc(SC[k][0])}</span></button>`);
    // Fest verkefni í eigin röð með breiðari reitum: heiti efst, verknúmer undir
    const pins = c.pin.map(id => findProj(id)).filter(Boolean).map(p => `<button type="button" class="hsc hsp" data-open="verk:${esc(p.id)}">${PIC}<span class="hscm"><b>${esc(p.stutt || p.nafn)}</b><small>${esc(p.nr)}</small></span></button>`);
    if (!acts.length && !pins.length) return `<div class="empty">Engar flýtileiðir valdar. Ýttu á Sérsníða Heim.</div>`;
    return (acts.length ? `<div class="hscs">${acts.join("")}</div>` : "") + (pins.length ? `<div class="hscs hsps"${acts.length ? ' style="margin-top:10px"' : ""}>${pins.join("")}</div>` : "");
  }
  function spjall() {
    const xs = window.spRecent ? spRecent(4) : [];
    return `<div class="viewtitle" style="display:flex;align-items:center;gap:8px">Spjall<a class="plink" data-act="tab:spjall" style="margin-left:auto">Opna</a></div>` +
      (xs.length ? llist(xs.map(m => `<a class="lrow tap" data-act="spopen:${esc(m.ras)}"><div class="ll">${(typeof EI !== "undefined" && EI.chat) || ""}</div><div class="lm"><div class="lt">${esc(m.nafn || m.af)}${m.ras === "almennt" ? "" : " · bein skilaboð"}</div><div class="ls">${esc(m.texti.slice(0, 90))}</div></div><div class="lr"><span class="lc">${esc(fmtDate(m.t))}</span></div></a>`)) : `<div class="empty">Engin skilaboð ennþá.</div>`);
  }

  window.heimGrid = function (pieces) {
    const c = cur();
    pieces = { ...pieces, flyti: flyti(), spjall: spjall() };
    if (pieces._tiles) pieces.spjold = c.tl.length ? `<div class="htiles">${c.tl.map(k => pieces._tiles[k] || "").join("")}</div>` : "";
    const cells = c.w.map(x => { const html = pieces[x.id] || "", size = x.s || W[x.id].s; return html ? `<section class="hw hw-${size}" data-w="${esc(x.id)}">${html}</section>` : ""; }).join("");
    return `<div class="hgrid">${cells}</div><div class="hcust"><button type="button" class="btn" data-act="hw:edit">${IC_EDIT} Sérsníða Heim</button></div>`;
  };
  const IC_EDIT = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>`;

  /* ---------- Gluggi: Sérsníða Heim ----------
     Einn listi með öllum einingum: rofi kveikir/slekkur, dregið (eða ↑ ↓) til að raða, stærð valin með hnöppum.
     Breytingar sjást strax á Heim fyrir aftan gluggann. */
  let TAB = "einingar", DRAG = null;
  const SZL = { s: "Lítil", m: "Hálf", l: "Breið" };
  function editorHTML() {
    const c = cur(), on = c.w, off = Object.keys(W).filter(id => avail(id) && !on.some(x => x.id === id));
    const row = (id, i, active) => { const x = active ? on[i] : { id }, size = x.s || W[id].s;
      return `<li class="hed${active ? "" : " off"}" ${active ? `draggable="true" data-i="${i}"` : ""}>
        <span class="hgrip" aria-hidden="true">${active ? "⋮⋮" : ""}</span>
        <span class="hedt"><b>${esc(W[id].l)}</b><small>${esc(W[id].d)}</small></span>
        ${active ? `<span class="hsz" role="group" aria-label="Stærð">${["s", "m", "l"].map(k => `<button type="button" data-act="hw:sz:${i}:${k}" aria-pressed="${size === k}">${SZL[k]}</button>`).join("")}</span>
        <span class="hmv"><button type="button" data-act="hw:up:${i}" aria-label="Færa upp" ${i ? "" : "disabled"}>↑</button><button type="button" data-act="hw:down:${i}" aria-label="Færa niður" ${i < on.length - 1 ? "" : "disabled"}>↓</button></span>` : ""}
        <label class="hsw"><input type="checkbox" data-hw="${esc(id)}" ${active ? "checked" : ""} aria-label="Sýna ${esc(W[id].l)}"><i></i></label></li>`; };
    const tabs = [["einingar", "Einingar"], ["tl", "Lykiltölur"], ["flyti", "Flýtileiðir"]];
    const body = TAB === "tl"
      ? `<p class="hint" style="margin:0 0 10px">Veldu tölurnar sem birtast í einingunni Lykiltölur (best er að velja fjórar). Röðin fylgir valinu.</p>
        <div class="hscp">${Object.keys(TL).filter(k => !TL[k][2] || fj()).map(k => { const n = c.tl.indexOf(k); return `<button type="button" class="hscpk" data-act="hw:tl:${k}" aria-pressed="${n >= 0}"><span class="hscm"><b>${esc(TL[k][0])}</b><small>${esc(TL[k][1])}</small></span><i aria-hidden="true">${n >= 0 ? n + 1 : "+"}</i></button>`; }).join("")}</div>
        ${!c.w.some(x => x.id === "spjold") ? `<p class="hint" style="margin-top:10px">Einingin Lykiltölur er falin – kveiktu á henni undir Einingar.</p>` : ""}`
      : TAB === "einingar"
      ? `<p class="hint" style="margin:0 0 10px">Kveiktu á því sem þú vilt sjá. Dragðu línurnar (eða notaðu ↑ ↓) til að raða og veldu stærð. Breytingarnar sjást strax á Heim.</p>
        <ul class="hedl" id="hedl">${on.map((x, i) => row(x.id, i, true)).join("")}</ul>
        ${off.length ? `<div class="kind" style="margin:16px 0 8px">Fleiri einingar</div><ul class="hedl">${off.map(id => row(id, -1, false)).join("")}</ul>` : ""}`
      : `<p class="hint" style="margin:0 0 10px">Veldu hnappana sem birtast í einingunni Flýtileiðir.</p>
        <div class="hscp">${Object.keys(SC).map(k => `<button type="button" class="hscpk" data-act="hw:sc:${k}" aria-pressed="${c.sc.includes(k)}">${(typeof EI !== "undefined" && EI[SC[k][2]]) || ""}<span>${esc(SC[k][0])}</span><i aria-hidden="true">${c.sc.includes(k) ? "✓" : "+"}</i></button>`).join("")}</div>
        <div class="kind" style="margin:16px 0 8px">Festa verkefni</div>
        <div class="hscp hscpp">${active().map(p => `<button type="button" class="hscpk" data-act="hw:pin:${esc(p.id)}" aria-pressed="${c.pin.includes(p.id)}">${PIC}<span class="hscm"><b>${esc(p.stutt || p.nafn)}</b><small>${esc(p.nr)}</small></span><i aria-hidden="true">${c.pin.includes(p.id) ? "✓" : "+"}</i></button>`).join("") || '<span class="hint">Engin verkefni í gangi.</span>'}</div>
        ${c.sc.length + c.pin.length && !c.w.some(x => x.id === "flyti") ? `<p class="hint" style="margin-top:10px">Einingin Flýtileiðir er falin – kveiktu á henni undir Einingar.</p>` : ""}`;
    return `<div class="hedh"><h3 id="sheet-h">Sérsníða Heim</h3></div>
      <nav class="seg hedtabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${TAB === k}" data-act="hw:tab:${k}">${l}</button>`).join("")}</nav>
      <div class="hedb">${body}</div>
      <div class="actions"><button type="button" class="btn" data-act="hw:reset">Sjálfgefið útlit</button><button type="button" class="btn primary" data-act="hw:done">Lokið</button></div>`;
  }
  function openEditor(keepScroll) {
    const box = document.getElementById("sheet"), wrap = document.getElementById("sheetwrap"); if (!box || !wrap) return;
    const sc = keepScroll ? box.querySelector(".hedb")?.scrollTop || 0 : 0;
    box.innerHTML = editorHTML(); box.closest(".sheet").classList.add("wide", "hedsheet"); wrap.hidden = false;
    const b = box.querySelector(".hedb"); if (b) b.scrollTop = sc;
    wireDrag(box);
  }
  const editorOpen = () => !document.getElementById("sheetwrap")?.hidden && !!document.querySelector("#sheet .hedtabs");
  function wireDrag(box) {
    const list = box.querySelector("#hedl"); if (!list) return;
    list.querySelectorAll("li[draggable]").forEach(li => {
      li.addEventListener("dragstart", e => { DRAG = +li.dataset.i; li.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", li.dataset.i); } catch (x) {} });
      li.addEventListener("dragend", () => { li.classList.remove("drag"); DRAG = null; list.querySelectorAll(".over").forEach(x => x.classList.remove("over")); });
      li.addEventListener("dragover", e => { if (DRAG == null) return; e.preventDefault(); list.querySelectorAll(".over").forEach(x => x.classList.remove("over")); li.classList.add("over"); });
      li.addEventListener("drop", e => { e.preventDefault(); const to = +li.dataset.i; if (DRAG == null || DRAG === to) return; const c = cur(), w = c.w.map(x => ({ ...x })), [m] = w.splice(DRAG, 1); w.splice(to, 0, m); DRAG = null; save({ ...c, w }); });
    });
  }
  // Smellir í glugganum (glugginn er utan #view, svo hann fær ekki almennu smellumeðhöndlunina)
  document.addEventListener("click", e => { const b = e.target.closest?.("#sheet [data-act^='hw:']"); if (!b || b.disabled) return; e.preventDefault(); heimAct(b.dataset.act.split(":").slice(1)); });
  document.addEventListener("change", e => { const id = e.target?.dataset?.hw; if (!id) return; const c = cur(); let w = c.w.map(x => ({ ...x }));
    w = e.target.checked ? (w.some(x => x.id === id) ? w : w.concat({ id })) : w.filter(x => x.id !== id); save({ ...c, w }); });

  window.heimAct = function (r) {
    const [op, a] = r, c = cur(), w = c.w.map(x => ({ ...x })), i = +a;
    if (op === "edit") { TAB = "einingar"; openEditor(); return; }
    if (op === "done") { const sh = document.getElementById("sheet"); sh?.closest(".sheet")?.classList.remove("hedsheet"); if (typeof closeSheet === "function") closeSheet(); return; }
    if (op === "tab") { TAB = a; openEditor(); return; }
    if (op === "reset") { if (confirm("Setja Heim aftur í sjálfgefið útlit?")) save({ w: DEF.map(id => ({ id })), sc: SC_DEF.slice(), pin: [], tl: TL_DEF() }); return; }
    if (op === "sz") { const [, , k] = r; w[i].s = k; }
    if (op === "up" && i > 0) [w[i - 1], w[i]] = [w[i], w[i - 1]];
    if (op === "down" && i < w.length - 1) [w[i + 1], w[i]] = [w[i], w[i + 1]];
    if (op === "size") { const s = w[i].s || W[w[i].id].s; w[i].s = { s: "m", m: "l", l: "s" }[s]; }
    if (op === "del") w.splice(i, 1);
    if (op === "add" && W[a]) w.push({ id: a });
    let sc = c.sc.slice(), pin = c.pin.slice(), tl = c.tl.slice();
    if (op === "tl") tl = tl.includes(a) ? tl.filter(x => x !== a) : tl.concat(a);
    if (op === "sc") sc = sc.includes(a) ? sc.filter(x => x !== a) : sc.concat(a);
    if (op === "pin") pin = pin.includes(a) ? pin.filter(x => x !== a) : pin.concat(a);
    save({ w, sc, pin, tl });
  };
})();
