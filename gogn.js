/* Gagnalag (frá 1.3.0): gögnum appsins er skipt í söfn í Firestore, eitt skjal á hverja færslu.
   Appið sjálft vinnur áfram með einn hlut S í minni (S.verkefni, S.timar.faerslur …). Hér er:
   - join(parts)  : raðar S saman úr söfnunum + app/state (afgangur) + klukku notandans
   - stamp(prev,cur): merkir nýjar/breyttar færslur (stofnad_af, breytt_af, eigandi, röð)
   - ops(prev,cur): skrif sem þarf (set/delete á einstök skjöl) eftir breytingu
   - rest(S)      : það sem fer í app/state (stillingar, samtölur, netfangaskrá …)
   - migrate(state, email): skrif sem flytja gamla app/state (allt í einu skjali) yfir í söfn
   Aðgangur (hver les/skrifar hvað) er ákveðinn í firestore.rules, ekki hér. */
(function () {
  // Söfn: lykill í Firestore, hvar fylkið býr í S, og hvort færslur eiga eiganda (aðeins eigandi + fjármál sjá þær).
  const COLS = [
    { k: "verkefni" }, { k: "vidskiptavinir" }, { k: "fundir" }, { k: "skjol" }, { k: "thraedir" },
    { k: "reikningar" }, { k: "vorur" }, { k: "tilbod" }, { k: "pantanir" },
    { k: "timar", get: s => s.timar?.faerslur, set: (s, v) => { s.timar = s.timar || {}; s.timar.faerslur = v; }, eigandi: true,
      sort: (a, b) => String(b.date + (b.fra || "")).localeCompare(String(a.date + (a.fra || ""))) },
    { k: "kostnadur", eigandi: true }
  ];
  const getA = (c, s) => (c.get ? c.get(s) : s[c.k]) || [];
  const setA = (c, s, v) => c.get ? c.set(s, v) : (s[c.k] = v);
  const J = x => JSON.stringify(x);
  const now = () => new Date().toISOString();

  function rest(s) {
    const r = { ...(s || {}) };
    for (const c of COLS) if (!c.get) delete r[c.k];
    if (r.timar) { r.timar = { ...r.timar }; delete r.timar.faerslur; delete r.timar.nyjast; }
    delete r.klukka; delete r._uppfaert;
    return r;
  }

  // parts = { state: {...}, cols: { verkefni: [docs] … }, klukka: {...}|null }
  function join(parts) {
    const s = structuredClone(parts.state || {});
    let last = s.uppfaert || "";
    for (const c of COLS) {
      const xs = (parts.cols?.[c.k] || []).map(d => structuredClone(d));
      xs.sort(c.sort || ((a, b) => (a._o ?? 0) - (b._o ?? 0)));
      xs.forEach(d => { if (d.breytt_t > last) last = d.breytt_t; });
      setA(c, s, xs);
    }
    if (parts.klukka && parts.klukka.start) s.klukka = structuredClone(parts.klukka); else s.klukka = null;
    s.uppfaert = last || s.uppfaert;
    return s;
  }

  // ownerOf(item) -> netfang eiganda (fyrir tíma og kostnað)
  function stamp(prev, cur, email, ownerOf) {
    const t = now();
    for (const c of COLS) {
      const old = new Map(getA(c, prev || {}).map(x => [x.id, x])), arr = getA(c, cur);
      const os = [...old.values()].map(x => x._o).filter(x => typeof x === "number");
      let lo = os.length ? Math.min(...os) : 0, hi = os.length ? Math.max(...os) : 0;
      arr.forEach((x, i) => {
        if (!x || typeof x !== "object") return;
        if (!x.id) x.id = genIdG();
        const o = old.get(x.id);
        if (!o) {
          if (x.stofnad_af == null) x.stofnad_af = email; if (x.stofnad_t == null) x.stofnad_t = t;
          x.breytt_af = email; x.breytt_t = t;
          if (typeof x._o !== "number") x._o = i === 0 && arr.length > 1 ? --lo : ++hi;
        } else if (J(o) !== J(x)) { x.breytt_af = email; x.breytt_t = t; if (typeof x._o !== "number") x._o = o._o ?? ++hi; }
        if (c.eigandi && !x.eigandi) x.eigandi = ownerOf(x) || email;
      });
    }
  }
  const genIdG = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(16) + Math.random().toString(16).slice(2)).replace(/-/g, "");

  function ops(prev, cur, email) {
    const out = [];
    for (const c of COLS) {
      const a = new Map(getA(c, prev || {}).map(x => [x.id, x])), b = new Map(getA(c, cur).map(x => [x.id, x]));
      for (const [id, x] of b) if (!a.has(id) || J(a.get(id)) !== J(x)) out.push({ path: c.k + "/" + id, data: x });
      for (const id of a.keys()) if (!b.has(id)) out.push({ path: c.k + "/" + id, del: true });
    }
    if (J(prev?.klukka || null) !== J(cur?.klukka || null)) out.push(cur?.klukka ? { path: "klukka/" + email, data: cur.klukka } : { path: "klukka/" + email, del: true });
    return out;
  }
  const restChanged = (prev, cur) => { const a = rest(prev), b = rest(cur); delete a.uppfaert; delete b.uppfaert; return J(a) !== J(b); };

  // Flutningur úr gamla sniðinu. Skilar lista af skrifum; app/state síðast (með skipting: 2).
  function migrate(state, email, ownerOf) {
    const s = structuredClone(state), w = [], t = now();
    if (s.timar) { const seen = new Map(); [...(s.timar.faerslur || []), ...(s.timar.nyjast || [])].forEach(e => { if (e && e.id && !seen.has(e.id)) seen.set(e.id, e); }); s.timar.faerslur = [...seen.values()]; }
    for (const c of COLS) getA(c, s).forEach((x, i) => {
      if (!x || typeof x !== "object") return; if (!x.id) x.id = genIdG();
      const d = { ...x, _o: i, breytt_t: x.breytt_t || state.uppfaert || t };
      if (c.eigandi && !d.eigandi) d.eigandi = ownerOf(d) || email;
      w.push({ path: c.k + "/" + x.id, data: d });
    });
    if (s.klukka && s.klukka.start) w.push({ path: "klukka/" + email, data: s.klukka }); // klukkan sem var í gangi fer á þann sem flytur
    const r = rest(s); r.skipting = 2; r.uppfaert = t;
    w.push({ path: "app/state", data: r });
    return w;
  }

  window.GOGN = { COLS, join, stamp, ops, rest, restChanged, migrate, isSplit: st => (st?.skipting || 0) >= 2 };
})();
