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
    spjold:    { l: "Spjöld", d: "Til að ganga frá, framundan, verkefni, póstur", s: "l" },
    flyti:     { l: "Flýtileiðir", d: "Hnappar sem þú velur sjálf(ur)", s: "l" },
    ch_vikur:  { l: "Myndrit: tímar 8 vikur", d: "Súlurit yfir vikurnar", s: "m" },
    ch_verk:   { l: "Myndrit: tímar á verkefni", d: "Yfirstandandi tímabil", s: "m" },
    ch_stada:  { l: "Myndrit: staða verkefna", d: "Verkefni í gangi eftir stöðu", s: "m" },
    ch_reikn:  { l: "Myndrit: reikningsfært", d: "Reikningar, ógreitt, óreikningsfært", s: "m", fj: 1 },
    verkefni:  { l: "Verkefni í gangi", d: "Spjöld verkefna með framvindu", s: "l" },
    framundan: { l: "Framundan 7 dagar", d: "Fundir, skil og gjalddagar", s: "m" },
    frag:      { l: "Til að ganga frá", d: "Fram yfir, óreikningsfært, ógreitt", s: "m" },
    nylegt:    { l: "Nýlegt", d: "Síðustu tímar, athugasemdir og þræðir", s: "m" },
    postur:    { l: "Óflokkaður póstur", d: "Þræðir í AERA-möppunni", s: "m" },
    spjall:    { l: "Spjall", d: "Nýjustu skilaboðin", s: "m" }
  };
  const DEF = ["kvedja", "vika", "idag", "naest", "flyti", "spjold", "ch_vikur", "ch_verk", "ch_stada", "ch_reikn"];
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
  let PREF = null, EDIT = false, DBREF = null, saving = null;
  const LSK = "aera-heim";
  const me = () => window.USER?.email || "";
  const fj = () => !!(window.can && can("fjarmal"));
  const avail = id => W[id] && (!W[id].fj || fj());
  const load = () => { try { return JSON.parse(localStorage.getItem(LSK) || "null"); } catch (e) { return null; } };
  const cur = () => {
    const p = PREF || load() || {};
    const w = (p.w || DEF.map(id => ({ id }))).filter(x => avail(x.id));
    return { w, sc: p.sc || SC_DEF.slice(), pin: p.pin || [] };
  };
  function save(p) {
    PREF = p; try { localStorage.setItem(LSK, JSON.stringify(p)); } catch (e) {}
    clearTimeout(saving); saving = setTimeout(() => { if (DBREF && me()) DBREF.set("notandi/" + me(), { heim: p, breytt: new Date().toISOString() }).catch(e => console.warn("Heim-stilling", e)); }, 400);
    render();
  }
  window.heimStart = db => { DBREF = db; if (!me() || !db?.watch) return;
    db.watch("notandi/" + me(), s => { const h = s.exists ? s.data()?.heim : null; if (h && JSON.stringify(h) !== JSON.stringify(PREF)) { PREF = h; try { localStorage.setItem(LSK, JSON.stringify(h)); } catch (e) {} if (typeof tab !== "undefined" && tab === "yfirlit") render(); } }, () => {}); };

  function flyti() {
    const c = cur(), ic = k => (typeof EI !== "undefined" && EI[k]) || "";
    const btns = c.sc.filter(k => SC[k]).map(k => `<button type="button" class="hsc" data-act="${esc(SC[k][1])}">${ic(SC[k][2])}<span>${esc(SC[k][0])}</span></button>`)
      .concat(c.pin.map(id => findProj(id)).filter(Boolean).map(p => `<button type="button" class="hsc" data-open="verk:${esc(p.id)}"><span class="nr">${esc(p.nr)}</span><span>${esc(p.stutt || p.nafn)}</span></button>`));
    return btns.length ? `<div class="hscs">${btns.join("")}</div>` : `<div class="empty">Engar flýtileiðir valdar. Ýttu á Sérsníða Heim.</div>`;
  }
  function spjall() {
    const xs = window.spRecent ? spRecent(4) : [];
    return `<div class="viewtitle" style="display:flex;align-items:center;gap:8px">Spjall<a class="plink" data-act="tab:spjall" style="margin-left:auto">Opna</a></div>` +
      (xs.length ? llist(xs.map(m => `<a class="lrow tap" data-act="spopen:${esc(m.ras)}"><div class="ll">${(typeof EI !== "undefined" && EI.chat) || ""}</div><div class="lm"><div class="lt">${esc(m.nafn || m.af)}${m.ras === "almennt" ? "" : " · bein skilaboð"}</div><div class="ls">${esc(m.texti.slice(0, 90))}</div></div><div class="lr"><span class="lc">${esc(fmtDate(m.t))}</span></div></a>`)) : `<div class="empty">Engin skilaboð ennþá.</div>`);
  }

  window.heimGrid = function (pieces) {
    pieces = { ...pieces, flyti: flyti(), spjall: spjall() };
    const c = cur(), SZ = { s: "S", m: "M", l: "L" };
    const cells = c.w.map((x, i) => {
      const html = pieces[x.id] || "", size = x.s || W[x.id].s;
      if (!html && !EDIT) return "";
      const tools = EDIT ? `<div class="hwt"><b>${esc(W[x.id].l)}</b><span>
          <button type="button" data-act="hw:up:${i}" aria-label="Færa framar" ${i ? "" : "disabled"}>←</button>
          <button type="button" data-act="hw:down:${i}" aria-label="Færa aftar" ${i < c.w.length - 1 ? "" : "disabled"}>→</button>
          <button type="button" data-act="hw:size:${i}" aria-label="Breyta stærð" title="Stærð: lítil, miðlungs, full breidd">${SZ[size]}</button>
          <button type="button" data-act="hw:del:${i}" aria-label="Fjarlægja ${esc(W[x.id].l)}">✕</button></span></div>` : "";
      return `<section class="hw hw-${size}${EDIT ? " edit" : ""}" data-w="${esc(x.id)}">${tools}${html || `<div class="empty">${esc(W[x.id].l)} – ekkert til að sýna núna.</div>`}</section>`;
    }).join("");
    const hidden = Object.keys(W).filter(id => avail(id) && !c.w.some(x => x.id === id));
    const editor = EDIT ? `<div class="hedit">
        <div class="viewtitle">Bæta við einingu</div>${hidden.length ? `<div class="hadd">${hidden.map(id => `<button type="button" class="chipbtn" data-act="hw:add:${id}" title="${esc(W[id].d)}">+ ${esc(W[id].l)}</button>`).join("")}</div>` : `<p class="hint">Allar einingar eru á Heim.</p>`}
        <div class="viewtitle">Flýtileiðir</div><div class="hadd">${Object.keys(SC).map(k => `<button type="button" class="chipbtn" data-act="hw:sc:${k}" aria-pressed="${c.sc.includes(k)}">${esc(SC[k][0])}</button>`).join("")}</div>
        <div class="viewtitle">Festa verkefni sem flýtileið</div><div class="hadd">${active().map(p => `<button type="button" class="chipbtn" data-act="hw:pin:${esc(p.id)}" aria-pressed="${c.pin.includes(p.id)}"><span class="nr">${esc(p.nr)}</span> ${esc(p.stutt || "")}</button>`).join("") || '<span class="hint">Engin verkefni í gangi.</span>'}</div>
        <div class="links" style="margin-top:16px"><button type="button" class="btn primary" data-act="hw:done">Lokið</button><button type="button" class="btn" data-act="hw:reset">Sjálfgefið útlit</button></div></div>` : "";
    return `<div class="hgrid">${cells}</div>${editor}${EDIT ? "" : `<div class="hcust"><button type="button" class="klink" data-act="hw:edit">Sérsníða Heim</button></div>`}`;
  };

  window.heimAct = function (r) {
    const [op, a] = r, c = cur(), w = c.w.map(x => ({ ...x })), i = +a;
    if (op === "edit") { EDIT = true; render(); return; }
    if (op === "done") { EDIT = false; render(); return; }
    if (op === "reset") { if (confirm("Setja Heim aftur í sjálfgefið útlit?")) save({ w: DEF.map(id => ({ id })), sc: SC_DEF.slice(), pin: [] }); return; }
    if (op === "up" && i > 0) [w[i - 1], w[i]] = [w[i], w[i - 1]];
    if (op === "down" && i < w.length - 1) [w[i + 1], w[i]] = [w[i], w[i + 1]];
    if (op === "size") { const s = w[i].s || W[w[i].id].s; w[i].s = { s: "m", m: "l", l: "s" }[s]; }
    if (op === "del") w.splice(i, 1);
    if (op === "add" && W[a]) w.push({ id: a });
    let sc = c.sc.slice(), pin = c.pin.slice();
    if (op === "sc") sc = sc.includes(a) ? sc.filter(x => x !== a) : sc.concat(a);
    if (op === "pin") pin = pin.includes(a) ? pin.filter(x => x !== a) : pin.concat(a);
    save({ w, sc, pin });
  };
})();
