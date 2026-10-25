/* Útlit I – skjáir (2.24.0): síður sem eru teiknaðar upp á nýtt eftir útlitsborðinu „Atrium – tillaga I“.
   Aðeins þegar ORG.utlit === "I" og á tölvu (utlit-i.js kallar á window.UI1V[tab]). Notar sömu gögn og appið. */
(function () {
  if (window.ORG?.utlit !== "I") return;
  const E = esc, U = window.UI1V = window.UI1V || {};
  const st = { wk: 0, ff: "", sel: new Set(), rep: "hvert", rp: "m0", grp: "svid" };

  /* ---------- sameiginlegt ---------- */
  const head = (sup, title, right = "") => `<div class="uhead"><div><div class="spsup">${E(sup)}</div><h2 class="ptitle">${E(title)}</h2></div><div class="uhr">${right}</div></div>`;
  const lhead = (sup, title, nb = "") => `<div class="phead">${sup ? `<div class="spsup">${E(sup)}</div>` : ""}<div class="phrow"><h2 class="ptitle">${E(title)}</h2>${nb}</div></div>`;
  const btn = (l, act, cls = "") => `<button type="button" class="btn ${cls}" data-act="${act}">${l}</button>`;
  const chips = (arr, cur, pre) => `<div class="uchips">${arr.map(([k, l]) => `<button type="button" class="uchip${k === cur ? " on" : ""}" data-act="${pre}:${k}">${E(l)}</button>`).join("")}</div>`;
  const pill = (t, dark) => `<span class="upill${dark ? " dark" : ""} ${window.toneOf ? toneOf(t) : ""}">${E(t)}</span>`;
  const kr = n => Math.round(n || 0).toLocaleString("de-DE") + " kr.";
  const H = n => num(Math.round((+n || 0) * 10) / 10);
  const DN = ["Mán", "Þri", "Mið", "Fim", "Fös", "Lau", "Sun"];
  const MNs = ["jan", "feb", "mar", "apr", "maí", "jún", "júl", "ágú", "sep", "okt", "nóv", "des"];
  const isoD = x => isoDay(x);
  const workdays = (a, b) => { let n = 0; for (let x = new Date(a); x <= b; x.setDate(x.getDate() + 1)) if (x.getDay() % 6) n++; return n; };
  const goal = () => +CFG().vikumark || 40;
  const meSk = () => ME();
  const mine = sk => faerslur().filter(e => (e.starfsmadur || ME()) === sk);

  // Svið verkefnis (Leiga · Sala · Þjónusta) leitt af deild verkefnisins og línum tengdra tilboða; Innra = án verkefnis
  window.svidOf = function (p) {
    if (!p) return ["Innra"];
    const out = new Set(), api = window.salaAPI;
    if (p.deild === "leiga") out.add("Leiga"); if (p.deild === "sala") out.add("Sala");
    if (api) api.TB().filter(T => T.verkefniId === p.id).forEach(T => (T.linur || []).forEach(l => out.add(l.teg === "leiga" ? "Leiga" : l.teg === "sala" ? "Sala" : "Þjónusta")));
    if (!out.size) out.add("Þjónusta");
    return [...out];
  };

  /* ---------- Tímar › Vikan ---------- */
  U.timar = function () {
    const me = meSk(), a = mondayOf(today); a.setDate(a.getDate() + 7 * st.wk);
    const days = [...Array(7)].map((_, i) => { const x = new Date(a); x.setDate(x.getDate() + i); return x; });
    const wkNo = (() => { const t = new Date(Date.UTC(a.getFullYear(), a.getMonth(), a.getDate() + 3)); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 4)); return 1 + Math.round(((t - y) / 864e5 - 3 + ((y.getUTCDay() + 6) % 7)) / 7); })();
    const ents = mine(me), cal = window.calItems ? calItems() : new Map();
    let wTot = 0;
    const cols = days.map((x, i) => {
      const iso = isoD(x), es = ents.filter(e => e.date === iso), tot = es.reduce((s, e) => s + (+e.timar || 0), 0); wTot += tot;
      const isT = iso === isoD(today), wk = i > 4;
      const cards = es.map(e => { const p = findProj(e.verkefniId); return `<a class="uent" ${tapAttr("time", e.id)}><span class="uer"><small>${E(p?.nr || "Innra")}</small><b>${H(e.timar)}${e.live ? " ⏱" : ""}</b></span><span class="uen">${E(e.lysing || p?.stutt || p?.nafn || "")}</span></a>`; }).join("");
      const sug = (cal.get(iso) || []).filter(it => it.t === "fund").filter(it => !es.some(e => String(e.lysing || "").toLowerCase().includes(String(it.title || "").toLowerCase().slice(0, 8))))
        .map(it => { const pid = it.o?.projectId || ""; const h = it.o?.end && it.o?.date ? Math.max(0.5, Math.round((new Date(it.o.end) - new Date(it.o.date)) / 18e5) / 2) : 1;
          return `<div class="usug"><small>Úr dagatali</small><span>${E(it.title || "Fundur")}</span><button type="button" onclick="kind='tima';PREFILL={date:'${iso}'${pid ? `,pid:'${E(pid)}'` : ""}};openSheet()">+ Skrá ${H(h)} klst.</button></div>`; }).join("");
      return `<div class="uday${wk ? " wk" : ""}"><div class="udh${isT ? " on" : ""}"><span>${DN[i]} <small>${x.getDate()}. ${MNs[x.getMonth()]}</small></span><span class="${tot ? "b" : "m"}">${tot ? H(tot) + " klst." : "–"}</span></div>${cards}${sug}<button type="button" class="uadd" onclick="kind='tima';PREFILL={date:'${iso}'};openSheet()" aria-label="Skrá tíma ${DN[i]}">+</button></div>`;
    }).join("");
    // Vinnuskylda mánaðarins (tímabanki)
    const m0 = new Date(today.getFullYear(), today.getMonth(), 1), done = ents.filter(e => d(e.date) >= m0 && d(e.date) <= today).reduce((s, e) => s + (+e.timar || 0), 0);
    const skylda = goal() / 5 * workdays(m0, today), bank = done - skylda;
    const left = Math.max(0, goal() - wTot), wdl = st.wk === 0 ? days.filter((x, i) => i < 5 && x > today).length : st.wk > 0 ? 5 : 0;
    const k = klukka(), forgot = k && (Date.now() - new Date(k.start)) > 12 * 36e5;
    const right = btn("‹", "u1wk:-1") + btn("Í dag", "u1wk:0") + btn("›", "u1wk:1") + (MCP ? `<button type="button" class="ulink" data-act="u1cpw:${isoD(a)}">Afrita síðustu viku</button>` : "");  // „Skila viku“ tekið út (2.46.1)
    return head("Tímar · " + days[0].getDate() + ". " + MNs[days[0].getMonth()] + " – " + days[6].getDate() + ". " + MNs[days[6].getMonth()], "Vika " + wkNo, right)
      + (forgot ? `<div class="uwarn"><i></i><span><b>Klukkan hefur gengið í ${H((Date.now() - new Date(k.start)) / 36e5)} klst.</b> Hvenær hættirðu?</span><button type="button" class="btn primary" data-act="kedit">Leiðrétta</button></div>` : "")
      + `<div class="usum"><div><small>Þessi vika</small><b>${H(wTot)} <small>af ${H(goal())} klst.</small></b></div><div class="usb"><div class="ubar"><i style="width:${Math.min(100, wTot / goal() * 100)}%"></i></div><div class="usl"><span>${H(left)} klst. eftir${st.wk === 0 ? ` · ${wdl} ${wdl === 1 ? "vinnudagur" : "vinnudagar"} eftir` : ""}</span><span>Tímabanki ${MNs[today.getMonth()]}: <b>${bank >= 0 ? "+" : "−"}${H(Math.abs(bank))} klst.</b></span></div></div></div>`
      + `<div class="uweek">${cols}</div>`;
  };

  /* ---------- Tímar › Færslur ---------- */
  const allF = () => {
    const t = faerslur().map(e => ({ k: "time", id: e.id, date: e.date, lys: e.lysing || "", p: findProj(e.verkefniId), mag: H(e.timar) + " klst.", h: +e.timar || 0, teg: e.verkefniId ? "Tími" : "Innra", e }));
    const c = (window.kostn ? kostn() : []).map(x => ({ k: "kostn", id: x.id, date: x.date, lys: x.lysing || "Kostnaður", p: findProj(x.verkefniId), mag: x.km ? x.km + " km" : kr(x.upphaed), h: 0, teg: x.km || /akstur/i.test(x.lysing || "") ? "Akstur" : "Kostnaður", e: x }));
    return [...t, ...c].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  };
  U.tfaer = function () {
    const rows = allF().filter(r => SQ() || !st.ff || r.teg === st.ff).slice(0, SQ() ? 2000 : 300);
    const selR = rows.filter(r => st.sel.has(r.k + ":" + r.id)), selH = selR.reduce((s, r) => s + r.h, 0);
    const nb = `<button type="button" class="btn primary" onclick="kind='tima';openSheet()">+ Skrá</button>`;
    const bar = selR.length ? `<div class="ubulk"><span>${selR.length} valdar${selH ? " · " + H(selH) + " klst." : ""}</span><select aria-label="Færa á verkefni" onchange="if(this.value)doAct('u1mv:'+this.value)"><option value="">Færa á verkefni ▾</option>${verkefni().filter(p => !isDone(p)).map(p => `<option value="${E(p.id)}">${E(p.nr + " " + (p.stutt || p.nafn || ""))}</option>`).join("")}</select><button type="button" data-act="u1sel:">Hætta við</button></div>` : "";
    const hd = `<div class="ucols uf"><span></span><span>Dags.</span><span>Lýsing · Verkefni</span><span>Magn</span><span class="r">Tegund</span></div>`;
    const body = rows.map(r => { const key = r.k + ":" + r.id, on = st.sel.has(key), x = d(r.date);
      return `<div class="urow uf${on ? " sel" : ""}" ${tapAttr(r.k, r.id)}><button type="button" class="ubox${on ? " on" : ""}" data-act="u1sel:${E(key)}" aria-label="Velja">${on ? "✓" : ""}</button><span class="m">${x ? x.getDate() + ". " + MNs[x.getMonth()] : ""}</span><span class="t">${E(r.lys)}<span class="m"> · ${E(r.p?.nr || "Innra")}</span></span><span class="m">${E(r.mag)}</span><span class="r">${pill(r.teg)}</span></div>`; }).join("") || `<div class="uempty">Engar færslur.</div>`;
    const top = lhead("Tímaskráning", "Færslur", nb) + `<div class="ulbar">${chips([["", "Allt"], ["Tími", "Tímar"], ["Kostnaður", "Kostnaður"], ["Akstur", "Akstur"], ["Innra", "Innra"]], st.ff, "u1ff")}</div>` + bar;
    if (WIDE()) return top + wl("18px 96px minmax(0,1.6fr) minmax(0,1.2fr) minmax(0,1fr) 96px 100px", wcols(["", "Dags.", "Lýsing", "Verkefni", "Starfsmaður", "Magn", "Tegund"])
      + (rows.map(r => { const key = r.k + ":" + r.id, on = st.sel.has(key), x = d(r.date);
        return `<div class="urow${on ? " sel" : ""}" ${tapAttr(r.k, r.id)}><button type="button" class="ubox${on ? " on" : ""}" data-act="u1sel:${E(key)}" aria-label="Velja">${on ? "✓" : ""}</button>${wc(x ? dateIS(x) : "")}${wc(E(r.lys), "t")}${wc(E(r.p ? r.p.nr + " " + (r.p.stutt || "") : "Innra"))}${wc(E(r.e?.starfsmadur ? starfName(r.e.starfsmadur) : ""))}${wc(E(r.mag))}${wc(pill(r.teg), "r")}</div>`; }).join("") || `<div class="uempty">Engar færslur.</div>`));
    return top + hd + body;
  };

  /* ---------- Tímar › Skýrslur ---------- */
  const range = () => { const y = today.getFullYear(), m = today.getMonth();
    if (st.rp === "m1") return [new Date(y, m - 1, 1), new Date(y, m, 0), MNs[(m + 11) % 12]];
    if (st.rp === "y") return [new Date(y, m - 11, 1), today, "síðustu 12 mán."];
    return [new Date(y, m, 1), today, MNs[m]]; };
  const hbar = (l, h, pct, c, extra = "") => `<div class="uhb"><span>${l}</span><span class="ubar"><i style="width:${Math.min(100, pct)}%;${c ? "background:" + c : ""}"></i></span><span class="m">${H(h)} klst.</span><span class="b">${extra || Math.round(pct) + " %"}</span></div>`;
  const REP = [["hvert", "Hvert fer tíminn", "Eftir sviði og verkefni"], ["skylda", "Vinnuskylda", "Unnið á móti skyldu, tímabanki"], ["starf", "Eftir starfsmanni", "Hver vann hvað"], ["verk", "Eftir verkefnum", "Klst. á hvert verkefni"], ["aaetl", "Áætlun og raun", "Tímar á móti áætlun"], ["vidsk", "Tímaskýrsla til viðskiptavinar", "PDF, ef rukkað er eftir tímum"]];
  function repBody(k, es, lab) {
    const tot = es.reduce((s, e) => s + (+e.timar || 0), 0) || 1;
    if (k === "hvert") {
      const g = {}; es.forEach(e => { const p = findProj(e.verkefniId), key = st.grp === "verk" ? (p ? p.nr + " " + (p.stutt || p.nafn || "") : "Innra") : st.grp === "vfl" ? (!p ? "Innra" : svidOf(p).includes("Þjónusta") ? ((p.thjonusta || [])[0] || "Þjónusta – án verkflokks") : svidOf(p)[0]) : svidOf(p)[0]; g[key] = (g[key] || 0) + (+e.timar || 0); });
      const C = { "Þjónusta": "#1F5A96", "Leiga": "#5E86B3", "Sala": "#5E86B3", "Innra": "#9DB7D3" };
      st.hvRows = Object.entries(g).sort((a, b) => b[1] - a[1]).map(([n, h]) => [n, h, Math.round(h / tot * 100)]); st.hvLab = lab;
      return `<div class="uct"><h3>Hvert fer tíminn · ${E(lab)} · allir</h3><span style="display:flex;gap:6px"><button type="button" class="btn sm" data-act="u1xl:">Excel</button><button type="button" class="btn sm primary" onclick="window.print()">PDF</button></span></div>${chips([["svid", "Eftir sviði"], ["vfl", "Eftir verkflokki"], ["verk", "Eftir verkefni"]], st.grp, "u1grp")}` + (Object.entries(g).sort((a, b) => b[1] - a[1]).map(([n, h]) => hbar(E(n), h, h / tot * 100, C[n])).join("") || `<div class="uempty">Engir tímar á tímabilinu.</div>`);
    }
    if (k === "skylda") {
      const [a, b] = range(), wd = workdays(a, b);
      const rows = STARFS().map(s => { const u = es.filter(e => (e.starfsmadur || ME()) === s.sk).reduce((x, e) => x + (+e.timar || 0), 0), sk = goal() / 5 * wd, df = u - sk;
        return `<div class="uvs"><span>${E(s.nafn || s.sk)}</span><span class="m">${H(u)}</span><span class="m">${H(sk)}</span><span class="b${df < 0 ? " red" : ""}">${df >= 0 ? "+" : "−"}${H(Math.abs(df))}</span></div>`; }).join("");
      return `<div class="uct"><h3>Vinnuskylda · ${E(lab)}</h3></div><div class="uvs h"><span>Starfsmaður</span><span>Unnið</span><span>Skylda</span><span>Tímabanki</span></div>${rows}<div class="unote">Skylda miðast við ${H(goal())} klst. á viku (Stillingar › Tímar) og virka daga á tímabilinu.</div>`;
    }
    if (k === "starf") {
      const g = {}; es.forEach(e => { const s = e.starfsmadur || ME(); g[s] = (g[s] || 0) + (+e.timar || 0); });
      return `<div class="uct"><h3>Eftir starfsmanni · ${E(lab)}</h3></div>` + Object.entries(g).sort((a, b) => b[1] - a[1]).map(([s, h]) => hbar(E(starfName ? starfName(s) : s), h, h / tot * 100)).join("");
    }
    if (k === "verk") {
      const g = {}; es.forEach(e => { const p = findProj(e.verkefniId), key = p ? p.nr + " " + (p.stutt || p.nafn || "") : "Innra"; g[key] = (g[key] || 0) + (+e.timar || 0); });
      return `<div class="uct"><h3>Eftir verkefnum · ${E(lab)}</h3></div>` + Object.entries(g).sort((a, b) => b[1] - a[1]).map(([n, h]) => hbar(E(n), h, h / tot * 100)).join("");
    }
    if (k === "aaetl") {
      const ps = verkefni().filter(p => !isDone(p) && +p.aklst > 0);
      return `<div class="uct"><h3>Áætlun og raun · verkefni í gangi</h3></div>` + (ps.map(p => { const r = +p.timar || 0, a = +p.aklst, over = r > a; return hbar(`<span class="m">${E(p.nr)}</span> ${E(p.stutt || p.nafn || "")}`, r, r / a * 100, over ? "#C62828" : "", `<span class="${over ? "red" : ""}">${H(r)} / ${H(a)}</span>`); }).join("") || `<div class="uempty">Engin verkefni með áætlun.</div>`);
    }
    return "";
  }
  U.tskyr = function () {
    const [a, b, lab] = range(), es = faerslur().filter(e => { const x = d(e.date); return x && x >= a && x <= b && !e.live; });
    const right = `<select aria-label="Tímabil" onchange="doAct('u1rp:'+this.value)">${[["m0", "Þessi mánuður"], ["m1", "Síðasti mánuður"], ["y", "Síðustu 12 mánuðir"]].map(([k, l]) => `<option value="${k}"${k === st.rp ? " selected" : ""}>${l}</option>`).join("")}</select>`;
    const tiles = `<div class="utiles">${REP.map(([k, t, dsc]) => `<button type="button" class="utile${k === st.rep ? " on" : ""}" data-act="u1rep:${k}"><b>${E(t)}</b><small>${E(dsc)}</small></button>`).join("")}</div>`;
    if (st.rep === "vidsk") return head("Tímaskráning", "Skýrslur", right) + tiles + `<div class="card ucard">${vTimar("skyr")}</div>`;
    const side = st.rep === "skylda" ? "aaetl" : "skylda";
    return head("Tímaskráning", "Skýrslur", right) + tiles + `<div class="u2"><section class="card ucard">${repBody(st.rep, es, lab)}</section><section class="card ucard">${repBody(side, es, lab)}</section></div>`;
  };

  /* ---------- Listar með dálkum (Verkefni, Viðskiptavinir, Tilboð, Pantanir, Vörulisti) ---------- */
  // Leit í gangi (2.35.0): þá leitar listinn í öllum stöðum og flokkum, óháð síuflipum
  const SQ = () => !!String(window.u1Q || "").trim();
  const relD = iso => { const x = d(iso); if (!x) return ""; const n = Math.round((x - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 864e5);
    return dateIS(x); };
  const row = (key, a, b, c, dd, s, dark, extra = "") => `<div class="urow" ${key}><span class="m">${a}</span><span class="t">${b}${c ? `<span class="m"> · ${c}</span>` : ""}</span><span class="m">${dd}</span><span class="r">${s ? pill(s, dark) : ""}</span>${extra}</div>`;
  const cols = (a, b, c, dd) => `<div class="ucols"><span>${a}</span><span>${b}</span><span>${c}</span><span class="r">${dd}</span></div>`;
  const grpH = l => `<div class="ugrp">${E(l)}</div>`;
  // Breiður listi (2.36.0): þegar ekkert er valið nær listinn yfir allan skjáinn og sýnir fleiri dálka
  const WIDE = () => !!window.u1Wide;
  const wl = (g, inner) => `<div class="uwl" style="--g:${g}">${inner}</div>`;
  const wcols = hs => `<div class="ucols">${hs.map((h, i) => `<span${i === hs.length - 1 ? ' class="r"' : ""}>${h}</span>`).join("")}</div>`;
  const wc = (x, cl = "m") => `<span class="${cl}">${x == null ? "" : x}</span>`;
  const wrow = (key, cells) => `<div class="urow" ${key}>${cells.join("")}</div>`;
  const rng2 = T => { const a = T.fra ? dateIS(d(T.fra)) : "", b = T.til && T.til !== T.fra ? dateIS(d(T.til)) : ""; return a + (b ? " – " + b : ""); };
  const fjL = T => (T.linur || []).length;
  const totK = T => { try { return window.tbTotals ? kr(tbTotals(T).tot) : ""; } catch (e) { return ""; } };
  const pnr = id => { const p = id ? findProj(id) : null; return p ? p.nr : ""; };
  // „+ Pöntun“, „+ Verkefni“ … opna beint rétta tegund, óháð því á hvaða undirsíðu (yfirliti, sviði) maður er (2.50.9)
  const NBT = { "Verkefni": "verk", "Viðskiptavinur": "vsk", "Tilboð": "ltilbod", "Pöntun": "pantanir", "Búnaður": "lvorur", "Vara": "svorur", "Þjónusta": "vvinna", "Fundur": "fundir" };
  const nbtn = l => `<button type="button" class="btn primary" data-act="fabnew${NBT[l] ? ":" + NBT[l] : ""}">+ ${E(l)}</button>`;
  st.vf = { verk: "gangi", lverk: "gangi", sverk: "gangi" };
  const mineP = p => (p.starfsfolk || p.starfsmenn || []).some(x => (x.sk || x) === ME()) || (window.projStaff && projStaff(p).some(x => (x.sk || x) === ME()));
  function vlist(key, title, pf, vfl) {
    const all = verkefni().filter(pf), f = st.vf[key] || "gangi", fv = vfl ? st.vf[key + "V"] || "" : "";
    const fls = vfl ? THJ().filter(t => all.some(p => (p.thjonusta || []).includes(t))) : [];
    const xs = all.filter(p => SQ() || (!fv || (p.thjonusta || []).includes(fv)) && (f === "lokid" ? isDone(p) : !isDone(p) && (f !== "min" || mineP(p)))).sort((a, b) => String(b.nr).localeCompare(String(a.nr), "is", { numeric: true }));
    const n = all.filter(p => !isDone(p)).length, nm = all.filter(p => !isDone(p) && mineP(p)).length;
    const flSel = fls.length ? `<label class="uflsel"><select onchange="doAct('u1vf:${key}V:'+this.value)" aria-label="Verkflokkur"><option value="">Allir verkflokkar</option>${fls.map(x => `<option${x === fv ? " selected" : ""}>${E(x)}</option>`).join("")}</select></label>` : "";
    const top = lhead("Verkefni", title, nbtn("Verkefni")) + `<div class="ulbar">${chips([["gangi", "Í gangi · " + n], ["min", "Mín · " + nm], ["lokid", "Lokið"]], f, "u1vf:" + key)}${flSel}</div>`;
    if (WIDE()) return top + wl("80px minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr) 120px 130px 90px 110px", wcols(["Nr.", "Heiti", "Viðskiptavinur", vfl ? "Verkflokkur" : "Svið", "Starfsfólk", "Tímar", "Skil", "Staða"])
      + (xs.map(p => wrow(tapAttr("verk", p.id), [wc(E(p.nr)), wc(E(p.stutt || p.nafn || ""), "t"), wc(E(p.vidskiptavinur || "")), wc(E(vfl ? (p.thjonusta || []).join(", ") : svidOf(p).join(", "))), wc(E((p.starfsmenn || []).map(x => x.sk || x).join(", "))), wc(E(H(+p.timar || 0) + (+p.aklst ? " / " + H(+p.aklst) : "") + " klst.")), wc(E(relD(p.skiladagur))), wc(pill(p.stada), "r")])).join("") || `<div class="uempty">Engin verkefni.</div>`));
    return top
      + cols("Nr.", vfl ? "Heiti · Verkflokkur" : "Heiti · Viðskiptavinur", "Skil", "Staða")
      + (xs.map(p => row(tapAttr("verk", p.id), E(p.nr), E(p.stutt || p.nafn || ""), E(vfl ? ((p.thjonusta || []).join(", ") || p.vidskiptavinur || "") : (p.vidskiptavinur || "")), E(relD(p.skiladagur)), p.stada, false)).join("") || `<div class="uempty">Engin verkefni.</div>`);
  }
  U.verk = () => vlist("verk", "Öll verkefni", () => true);
  U.lverk = () => vlist("lverk", "Leiga", p => svidOf(p).includes("Leiga"));
  U.sverk = () => vlist("sverk", "Sala", p => svidOf(p).includes("Sala"));
  U.tverk = () => vlist("tverk", "Þjónusta", p => svidOf(p).includes("Þjónusta"), true);
  // 2.70.0: Viðskiptavinir eru ein síða – lykiltölur efst (smellanlegar síur), síur (staða + svið) og listinn með viðskiptum síðustu 12 mánaða.
  const vskMain = (key, x) => function () {
    const api = window.salaAPI, L0 = (S?.vidskiptavinir || []), L = (x ? L0.filter(c => vskSvid(c).has(x)) : L0).slice();
    const cnt = v => verkefni().filter(p => p.vskId === v.id && !isDone(p)).length;
    const m12 = isoD(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())), seld = api ? api.seld().filter(T => String(T.fra || T.dags) >= m12 && String(T.fra || T.dags).slice(0, 10) <= isoD(today)) : [];
    const rev = c => seld.filter(T => T.vskId ? String(T.vskId) === String(c.id) : T.vidskiptavinur === c.name).reduce((a, T) => a + tbSum(T), 0);
    const R = new Map(L.map(c => [c.id, rev(c)])), tot = [...R.values()].reduce((a, v) => a + v, 0);
    const f = st.vf.vsk || "", so = st.vf.vsksort || "nafn";
    const FV = { "": () => true, opin: v => cnt(v), an: v => !cnt(v), anv: v => !vskSvid(v).size };
    const xs = L.filter(v => SQ() || (FV[f] || FV[""])(v)).sort(so === "vid" ? (a, b) => (R.get(b.id) || 0) - (R.get(a.id) || 0) : (a, b) => String(a.name || "").localeCompare(String(b.name || ""), "is"));
    const kp = (typeof DETAIL !== "undefined" && DETAIL) ? "" : kp4([["Viðskiptavinir", L.length, key + ":"], ["Með opin verkefni", L.filter(FV.opin).length, key + ":opin"], ["Selt 12 mán. án vsk", api ? mkr(tot) : "–", api ? key + ":vid" : ""], ["Án viðskipta", L0.filter(FV.anv).length, "vsk:anv"]]);
    const top = lhead("", x ? svH(x) : "Viðskiptavinir", nbtn("Viðskiptavinur")) + kp + `<div class="ulbar">${chips([["", "Allir · " + L.length], ["opin", "Með opin verkefni"], ["an", "Án verkefna"], ["anv", "Án viðskipta"]], f, "u1vf:vsk")}<label class="usort"><span>Raða</span><select onchange="doAct('u1vf:vsksort:'+this.value)" aria-label="Raða eftir"><option value="nafn"${so === "nafn" ? " selected" : ""}>Nafni</option><option value="vid"${so === "vid" ? " selected" : ""}>Viðskiptum</option></select></label></div>`;
    const rk = v => R.get(v.id) ? kr(R.get(v.id)) : "";
    let h = "", last = "";
    xs.forEach(v => { if (so === "nafn") { const l = String(v.name || "?").charAt(0).toLocaleUpperCase("is"); if (l !== last) { h += grpH(l); last = l; } } const n = cnt(v);
      h += `<div class="urow uv" ${tapAttr("vsk", v.id)}><span class="t">${E(v.name || "")}${v.tengilidur ? `<span class="m"> · ${E(v.tengilidur)}</span>` : ""}</span><span class="m">${n ? n + " verkefni" : E(rk(v))}</span><span class="r">${pill(n ? "Í gangi" : "Óvirkur")}</span></div>`; });
    if (WIDE()) { let w = ""; last = "";
      xs.forEach(v => { if (so === "nafn") { const l = String(v.name || "?").charAt(0).toLocaleUpperCase("is"); if (l !== last) { w += grpH(l); last = l; } } const n = cnt(v);
        w += wrow(tapAttr("vsk", v.id), [wc(E(v.name || ""), "t"), wc(E(v.tengilidur || "")), wc(E(v.simiT || v.simi || "")), wc(E(v.netfangT || v.netfang || "")), wc(n ? n + " verkefni" : ""), wc(E(rk(v))), wc(pill(n ? "Í gangi" : "Óvirkur"), "r")]); });
      return top + wl("minmax(0,1.4fr) minmax(0,1fr) 110px minmax(0,1.3fr) 96px 130px 96px", wcols(["Heiti", "Tengiliður", "Sími", "Netfang", "Verkefni", "Viðskipti 12 mán.", "Staða"]) + (w || `<div class="uempty">Engir viðskiptavinir.</div>`)); }
    return top + `<div class="ucols uv"><span>Heiti · Tengiliður</span><span>Verkefni</span><span class="r">Staða</span></div>` + (h || `<div class="uempty">Engir viðskiptavinir.</div>`);
  };
  U.vsk = vskMain("vsk", "");

  // Tilboð eftir sviði
  function tlist(key, title, teg) {
    const api = window.salaAPI; if (!api) return "";
    // 2.70.0: Tilboð eru ein síða – lykiltölur efst (smellanlegar síur), síðan síur og listinn. Svið eru flögur (utlit-i.js).
    const all = api.TB().filter(T => !teg || (T.linur || []).some(l => l.teg === teg)), f = st.vf.ltilbod || "opin";
    const FT = { opin: T => ["Drög", "Sent"].includes(T.stada), drog: T => T.stada === "Drög", sent: T => T.stada === "Sent", samth: T => T.stada === "Samþykkt", allt: () => true };
    const xs = all.filter(T => SQ() || (FT[f] || FT.opin)(T)).sort((a, b) => String(b.nr).localeCompare(String(a.nr), "is", { numeric: true }));
    const cn = k => all.filter(FT[k]).length, open = all.filter(FT.opin), d90 = all.filter(T => daysTo(T.dags) >= -90);
    const won = d90.filter(T => T.stada === "Samþykkt"), lost = d90.filter(T => T.stada === "Hafnað"), rate = won.length + lost.length ? Math.round(won.length / (won.length + lost.length) * 100) + " %" : "–";
    const w7 = all.filter(T => T.stada === "Sent" && daysTo(T.sent || T.dags) <= -7).length;
    const kp = (typeof DETAIL !== "undefined" && DETAIL) ? "" : kp4([["Opin tilboð", open.length + " · " + mkr(open.reduce((a, T) => a + tbSum(T), 0)), key + ":opin"], ["Samþykkt 90 daga", won.length + " · " + mkr(won.reduce((a, T) => a + tbSum(T), 0)), key + ":samth"], ["Hlutfall samþykkt", rate], ["Bíða svars > 7 daga", w7, key + ":sent"]]);
    const top = lhead("", teg ? title : "Tilboð", nbtn("Tilboð")) + kp + `<div class="ulbar">${chips([["opin", "Opin · " + cn("opin")], ["drog", "Drög · " + cn("drog")], ["sent", "Bíða svars · " + cn("sent")], ["samth", "Samþykkt · " + cn("samth")], ["allt", "Allar stöður"]], f, "u1vf:ltilbod")}</div>`;
    const SF = T => window.tbStofnandi ? tbStofnandi(T) : ""; // 2.88.0: stofnandi
    if (WIDE()) return top + wl("80px minmax(0,1.4fr) minmax(0,1fr) 84px 170px 100px 56px 120px 150px", wcols(["Nr.", "Heiti", "Viðskiptavinur", "Verkefni", "Tímabil", "Stofnandi", "Línur", "Upphæð m. vsk", "Staða"])
      + (xs.map(T => wrow(tapAttr("tb", T.id), [wc(E(T.nr || "")), wc(E(T.heiti || ""), "t"), wc(E(T.vidskiptavinur || "")), wc(E(pnr(T.verkefniId))), wc(E(rng2(T) || (T.dags ? dateIS(d(T.dags)) : ""))), wc(E(SF(T))), wc(fjL(T)), wc(E(totK(T))), wc(pill(api.stTxt ? api.stTxt(T) : T.stada, T.stada === "Drög"), "r")])).join("") || `<div class="uempty">Engin tilboð.</div>`));
    return top
      + cols("Nr.", "Heiti · Viðskiptavinur", "Dags.", "Staða")
      + (xs.map(T => row(tapAttr("tb", T.id), E(T.nr || ""), E(T.heiti || ""), E([T.vidskiptavinur, SF(T) ? "stofnaði: " + SF(T) : ""].filter(Boolean).join(" · ")), E(T.fra ? relD(T.fra) : (T.dags || "").slice(5).split("-").reverse().join(".")), api.stTxt ? api.stTxt(T) : T.stada, T.stada === "Drög")).join("") || `<div class="uempty">Engin tilboð.</div>`);
  }
  U.ltilbod = () => tlist("ltilbod", "Tilboð", "");
  U.tbl = () => tlist("tbl", "Leiga", "leiga");
  U.tbs = () => tlist("tbs", "Sala", "sala");
  U.tbt = () => tlist("tbt", "Þjónusta", "vinna");
  const pnList = (title, teg) => function () {
    const api = window.salaAPI; if (!api) return "";
    const SVL = { leiga: "Leiga", sala: "Sala", vinna: "Þjónusta" }, all = api.PN().filter(P => !teg || (P.linur || []).some(l => l.teg === teg) || (P.svid || []).includes(SVL[teg])), f = st.vf.pn || "opnar", OP = ["Ný", "Staðfest"];
    // Síur (2.63.1): Opnar · Nýjar · Staðfestar · Afhentar · Seint · Lokið – lykiltölurnar á Pantanir › Yfirliti opna listann með réttri síu
    const ti = isoD(today), seint = P => P.stada === "Afhent" && (!window.pnSkil || pnSkil(P)) && String(P.til || P.fra || "").slice(0, 10) < ti;
    const sk = P => !window.pnSkil || pnSkil(P), FL = { opnar: P => OP.includes(P.stada) || (P.stada === "Afhent" && !sk(P)), ny: P => P.stada === "Ný", stf: P => P.stada === "Staðfest", afh: P => P.stada === "Afhent" && sk(P), seint, lokid: P => ["Skilað", "Lokið"].includes(P.stada) };
    const fn = FL[f] || FL.opnar, nL = seint ? all.filter(seint).length : 0;
    const xs = all.filter(P => SQ() || fn(P)).sort((a, b) => String(a.fra || "").localeCompare(String(b.fra || "")));
    const top = lhead("Pantanir", title, nbtn("Pöntun")) + `<div class="ulbar">${chips([["opnar", "Opnar · " + all.filter(FL.opnar).length], ["ny", "Nýjar · " + all.filter(FL.ny).length], ["stf", "Staðfestar · " + all.filter(FL.stf).length], ["afh", "Afhentar · " + all.filter(FL.afh).length], ...(nL || f === "seint" ? [["seint", "Seint · " + nL]] : []), ["lokid", "Lokið"]], f, "u1vf:pn")}</div>`;
    const SF = T => window.tbStofnandi ? tbStofnandi(T) : ""; // 2.88.0: stofnandi
    if (WIDE()) return top + wl("80px minmax(0,1.3fr) minmax(0,1fr) 84px 100px 100px 100px 56px 120px 100px", wcols(["Nr.", "Heiti", "Viðskiptavinur", "Verkefni", "Afhending", "Skil", "Stofnandi", "Línur", "Upphæð m. vsk", "Staða"])
      + (xs.map(P => wrow(tapAttr("tb", P.id), [wc(E(P.nr || "")), wc(E(P.heiti && P.heiti !== "Pöntun" ? P.heiti : "Pöntun"), "t"), wc(E(P.vidskiptavinur || P.tengilidur || "")), wc(E(pnr(P.verkefniId))), wc(E(P.fra ? dateIS(d(P.fra)) : "")), wc(E(P.til ? dateIS(d(P.til)) : "")), wc(E(SF(P))), wc(fjL(P)), wc(E(totK(P))), wc(pill(P.stada, P.stada === "Ný"), "r")])).join("") || `<div class="uempty">Engar pantanir.</div>`));
    return top
      + cols("Nr.", "Heiti · Viðskiptavinur", "Afhending", "Staða")
      + (xs.map(P => row(tapAttr("tb", P.id), E(P.nr || ""), E(P.heiti && P.heiti !== "Pöntun" ? P.heiti : ""), E([P.vidskiptavinur || P.tengilidur, SF(P) ? "stofnaði: " + SF(P) : ""].filter(Boolean).join(" · ")), E(relD(P.fra)), P.stada, P.stada === "Ný")).join("") || `<div class="uempty">Engar pantanir.</div>`);
  };  U.pantanir = pnList("Allar", ""); U.pnl = pnList("Leiga", "leiga"); U.pns = pnList("Sala", "sala"); U.pnt = pnList("Þjónusta", "vinna");

  // Vörulisti: Leiga (eftir forskeyti vörunúmers) og Sala (eftir flokki)
  const freeCol = (f, tot) => { const r = tot ? f / tot : 0, t = Math.pow(1 - r, 1.6), c = [0x6B, 0x76, 0x82].map((g, i) => Math.round(g + ([0xC6, 0x28, 0x28][i] - g) * t)); return `<span class="ufree" style="color:rgb(${c.join(",")});font-weight:${r <= .25 ? 600 : 500}">${f}</span>`; };
  U.lvorur = function () {
    const api = window.salaAPI; if (!api) return "";
    const iso = isoD(today), allL = api.VR().filter(v => api.vDeild(v) === "leiga" && v.tegund !== "vinna"), f = st.vf.lvorur || "", fk = st.vf.lvorurF || "", fls = [...new Set(allL.map(v => v.flokkur).filter(Boolean))].sort((a, b) => a.localeCompare(b, "is"));
    const xs = allL.filter(v => SQ() || (!f || (f === "pakki" ? v.tegund === "pakki" : v.tegund !== "pakki")) && (!fk || v.flokkur === fk)).sort((a, b) => String(a.nr || "").localeCompare(String(b.nr || ""), "is", { numeric: true }));
    let h = "", last = "";
    xs.forEach(v => { const g = v.tegund === "pakki" ? "Pakkar" : (String(v.nr || "").split("-")[0] || "–") + (v.flokkur ? " · " + v.flokkur : ""); if (g !== last) { h += grpH(g); last = g; }
      const tot = +v.fjoldi || 0, free = v.tegund === "pakki" ? "" : Math.max(0, tot - u1Ovirk(v) - (api.upptekid(v.id, iso, iso).max || 0));
      if (WIDE()) { const ov = v.tegund === "pakki" ? "" : u1Ovirk(v), nx = api.TB().filter(T => T.fra && T.fra >= iso && !["Hafnað", "Skilað", "Lokið"].includes(T.stada) && (T.linur || []).some(l => String(l.v) === String(v.id))).sort((a, b) => String(a.fra).localeCompare(String(b.fra)))[0];
        h += wrow(tapAttr("vara", v.id), [wc(E(v.nr || "")), wc(E(v.heiti || "") + (u1OpinSkemmd(v) ? ' <i class="udot" title="Þarf skoðun"></i>' : ""), "t"), wc(E(v.tegund === "pakki" ? "Pakki" : v.flokkur || "")), wc(v.tegund === "pakki" ? "" : tot), free === "" ? "<span></span>" : freeCol(free, tot), wc(ov ? `<span class="red">${ov}</span>` : ov === 0 ? "0" : ""), wc(E(nx ? dateIS(d(nx.fra)) + " · " + (nx.nr || "") : "")), wc(pill(kr(v.leiguverd)), "r")]); return; }
      h += `<div class="urow ul" ${tapAttr("vara", v.id)}><span class="m">${E(v.nr || "")}</span><span class="t">${E(v.heiti || "")}${u1OpinSkemmd(v) ? ' <i class="udot" title="Þarf skoðun"></i>' : ""}${v.flokkur ? `<span class="m"> · ${E(v.flokkur)}</span>` : ""}</span><span class="m">${v.tegund === "pakki" ? "" : tot}</span>${free === "" ? "<span></span>" : freeCol(free, tot)}<span class="r">${pill(kr(v.leiguverd))}</span></div>`; });
    const flSel = (key, cur, list) => `<label class="uflsel"><select onchange="doAct('u1vf:${key}:'+this.value)" aria-label="Flokkur"><option value="">Allir flokkar</option>${list.map(x => `<option${x === cur ? " selected" : ""}>${E(x)}</option>`).join("")}</select></label>`;
    const top = lhead("Vörulisti", "Leiga", nbtn("Búnaður")) + `<div class="ulbar">${chips([["", "Allt · " + allL.length], ["bunadur", "Búnaður"], ["pakki", "Pakkar"]], f, "u1vf:lvorur")}${flSel("lvorurF", fk, fls)}</div>`;
    if (WIDE()) return top + wl("84px minmax(0,1.5fr) minmax(0,1fr) 64px 64px 84px 150px 110px", wcols(["Vnr.", "Heiti", "Flokkur", "Magn", "Laust", "Í viðgerð", "Næst í útleigu", "Verð/dag"]) + (h || `<div class="uempty">Enginn leigubúnaður.</div>`));
    return top + `<div class="ucols ul"><span>Vnr.</span><span>Heiti · Flokkur</span><span>Magn</span><span>Laust</span><span class="r">Verð/dag</span></div>` + (h || `<div class="uempty">Enginn leigubúnaður.</div>`);
  };
  U.svorur = function () {
    const api = window.salaAPI; if (!api) return "";
    const fr = {}; api.TB().filter(T => ["Drög", "Sent"].includes(T.stada)).forEach(T => (T.linur || []).forEach(l => { if (l.teg === "sala" && l.v) fr[l.v] = (fr[l.v] || 0) + (+l.magn || 0); }));
    const allS = api.VR().filter(v => api.vDeild(v) === "sala" && v.tegund !== "vinna"), sf = st.vf.svorur || "", sk = st.vf.svorurF || "", low0 = v => (+v.fjoldi || 0) <= (+v.lagmark || 2);
    const xs = allS.filter(v => SQ() || (!sf || low0(v)) && (!sk || v.flokkur === sk)).sort((a, b) => String(a.flokkur || "").localeCompare(String(b.flokkur || ""), "is") || String(a.nr || "").localeCompare(String(b.nr || ""), "is", { numeric: true }));
    let h = "", last = "";
    xs.forEach(v => { const g = v.flokkur || "Annað"; if (g !== last) { h += grpH(g); last = g; } const tot = +v.fjoldi || 0, free = Math.max(0, tot - (fr[v.id] || 0)), low = tot <= (+v.lagmark || 2);
      if (WIDE()) { h += wrow(tapAttr("vara", v.id), [wc(E(v.nr || "")), wc(E(v.heiti || "") + (low ? ' <i class="udot" title="Lítið á lager"></i>' : ""), "t"), wc(E(v.flokkur || "")), wc(tot), low ? `<span class="ufree red" style="font-weight:600">${free}</span>` : freeCol(free, tot), wc(fr[v.id] || ""), wc(+v.lagmark || 2), wc(E(v.innkaupsverd ? kr(v.innkaupsverd) : "")), wc(pill(kr(v.soluverd)), "r")]); return; }
      h += `<div class="urow ul" ${tapAttr("vara", v.id)}><span class="m">${E(v.nr || "")}</span><span class="t">${E(v.heiti || "")}${low ? ' <i class="udot" title="Lítið á lager"></i>' : ""}</span><span class="m">${tot}</span>${low ? `<span class="ufree red" style="font-weight:600">${free}</span>` : freeCol(free, tot)}<span class="r">${pill(kr(v.soluverd))}</span></div>`; });
    const fls = [...new Set(allS.map(v => v.flokkur).filter(Boolean))].sort((a, b) => a.localeCompare(b, "is"));
    const top = lhead("Vörulisti", "Sala", nbtn("Vara")) + `<div class="ulbar">${chips([["", "Allar · " + allS.length], ["low", "Undir lágmarki · " + allS.filter(low0).length]], sf, "u1vf:svorur")}<label class="uflsel"><select onchange="doAct('u1vf:svorurF:'+this.value)" aria-label="Flokkur"><option value="">Allir flokkar</option>${fls.map(x => `<option${x === sk ? " selected" : ""}>${E(x)}</option>`).join("")}</select></label></div>`;
    if (WIDE()) return top + wl("84px minmax(0,1.5fr) minmax(0,1fr) 64px 64px 84px 76px 120px 110px", wcols(["Vnr.", "Heiti", "Flokkur", "Lager", "Laust", "Í tilboðum", "Lágmark", "Innkaupsverð", "Verð"]) + (h || `<div class="uempty">Engar söluvörur.</div>`));
    return top + `<div class="ucols ul"><span>Vnr.</span><span>Heiti</span><span>Lager</span><span>Laust</span><span class="r">Verð</span></div>` + (h || `<div class="uempty">Engar söluvörur.</div>`);
  };

  /* ---------- Vörulisti › Þjónusta (vinna og tæknifólk): enginn lager, ekkert dagatal ---------- */
  U.vvinna = function () {
    const api = window.salaAPI; if (!api) return "";
    const all = api.VR().filter(v => v.tegund === "vinna"), fl = [...new Set(all.map(v => v.flokkur || "Annað"))], f = st.vf.vvinna || "";
    const xs = all.filter(v => SQ() || !f || (v.flokkur || "Annað") === f).sort((a, b) => String(a.flokkur || "").localeCompare(String(b.flokkur || ""), "is") || String(a.nr || "").localeCompare(String(b.nr || ""), "is", { numeric: true }));
    let h = "", last = "";
    xs.forEach(v => { const g = v.flokkur || "Annað"; if (g !== last) { h += grpH(g); last = g; }
      if (WIDE()) { h += wrow(tapAttr("vara", v.id), [wc(E(v.nr || "")), wc(E(v.heiti || ""), "t"), wc(E(v.flokkur || "")), wc(E(v.lysing || "")), wc(E(v.eining || "")), wc(pill(kr(v.soluverd || v.leiguverd)), "r")]); return; }
      h += `<div class="urow uv3" ${tapAttr("vara", v.id)}><span class="m">${E(v.nr || "")}</span><span class="t">${E(v.heiti || "")}${v.flokkur ? `<span class="m"> · ${E(v.flokkur)}</span>` : ""}</span><span class="m">${E(v.eining || "")}</span><span class="r">${pill(kr(v.soluverd || v.leiguverd))}</span></div>`; });
    const top = lhead("Vörulisti", "Þjónusta", nbtn("Þjónusta")) + `<div class="ulbar">${chips([["", "Allar · " + all.length], ...fl.map(x => [x, x])], f, "u1vf:vvinna")}</div>`;
    if (WIDE()) return top + wl("84px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.5fr) 90px 110px", wcols(["Vnr.", "Heiti", "Flokkur", "Lýsing", "Eining", "Verð"]) + (h || `<div class="uempty">Engin þjónusta skráð.</div>`));
    return top
      + `<div class="ucols uv3"><span>Vnr.</span><span>Heiti · Flokkur</span><span>Eining</span><span class="r">Verð</span></div>` + (h || `<div class="uempty">Engin þjónusta skráð.</div>`);
  };
  window.u1VinnaYfir = function (v) {
    const api = window.salaAPI, mine = T => (T.linur || []).filter(l => String(l.v) === String(v.id)), q = T => mine(T).reduce((a, l) => a + (+l.magn || 0), 0);
    const docs = api.seld().filter(T => mine(T).length);
    const ti = isoD(today), y0 = today.getFullYear() + "-01-01", m12 = isoD(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
    const when = T => String(T.fra || T.dags || "").slice(0, 10), past = docs.filter(T => when(T) <= ti), fut = docs.filter(T => when(T) > ti).sort((a, b) => when(a).localeCompare(when(b)));
    const sold12 = past.filter(T => when(T) >= m12).reduce((a, T) => a + q(T), 0), rev = past.filter(T => when(T) >= y0).reduce((a, T) => a + mine(T).reduce((b, l) => b + (api.netLine(l, T) || 0), 0), 0);
    const open = api.TB().filter(T => ["Drög", "Sent"].includes(T.stada) && mine(T).length), ein = v.eining || "klst.";
    const fm = +v.soluverd && +v.innkaupsverd ? Math.round((1 - v.innkaupsverd / v.soluverd) * 100) + " %" : "–";
    const rng = T => { const a = d(T.fra), b = d(T.til); return a ? a.getDate() + "." + (b && +b !== +a ? "–" + b.getDate() + "." : "") + " " + MNs[(b || a).getMonth()] : ""; };
    const ln = (T, extra) => `<a class="uln" ${tapAttr("tb", T.id)}><span>${E(T.nr || "")} ${E(T.heiti || T.vidskiptavinur || "")}<small>${rng(T) ? " · " + rng(T) : ""}${extra ? " · " + extra : ""}</small></span>${pill(H(q(T)) + " " + ein)}</a>`;
    const now = new Date(), vals = [...Array(12)].map((_, i) => { const dd = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1), k = dd.getFullYear() + "-" + String(dd.getMonth() + 1).padStart(2, "0"); return [MNs[dd.getMonth()], past.filter(T => when(T).startsWith(k)).reduce((a, T) => a + q(T), 0)]; });
    const mx = Math.max(1, ...vals.map(x => x[1]));
    return kpR([[ein === "klst." ? "Tímaverð" : "Verð", kr(v.soluverd || v.leiguverd)], ["Selt 12 mán.", H(sold12) + " " + ein], ["Selt í ár án vsk", kr(rev)], ["Á tilboðum", open.length]], 1)
      + `<div class="uminis m5">${mini(ein === "klst." ? "Dagvinna" : "Verð", kr(v.soluverd || v.leiguverd) + "/" + E(ein))}${mini("Kvöld og helgar", v.alag ? "+" + E(String(v.alag)) + " %" : "–")}${mini("Lágmark", v.lagmarkMagn ? E(String(v.lagmarkMagn)) + " " + E(ein) : "–")}${mini("Kostnaðarverð", v.innkaupsverd ? kr(v.innkaupsverd) + "/" + E(ein) : "–")}${mini("Framlegð", fm)}</div>`
      + `<div class="u2c"><div><div class="ush2"><span>Bókað framundan</span></div>${fut.map(T => ln(T)).join("") || `<div class="usub" style="padding:6px 0">Ekkert bókað framundan.</div>`}</div>`
      + `<div><div class="ush2"><span>Á tilboðum</span></div>${open.map(T => ln(T, T.stada.toLowerCase())).join("") || `<div class="usub" style="padding:6px 0">Ekki á opnum tilboðum.</div>`}</div></div>`
      + `<div class="card ucard uchart"><div class="ush2" style="margin:0 0 6px"><span>${ein === "klst." ? "Seldir tímar á mánuði" : "Selt á mánuði"}</span><span class="m" style="font-weight:400">${H(sold12)} ${E(ein)} síðustu 12 mán.</span></div><div class="vybars">${vals.map(([l, n], i) => `<div class="vyb" style="height:150px"><span class="vyv${i === 11 ? " on" : ""}">${n ? H(n) : ""}</span><div class="vys"><i style="height:${Math.round(n / mx * 100)}px;background:${i === 11 ? "#1F5A96" : "#BFD0E3"}"></i></div><span class="vyl">${l}</span></div>`).join("")}</div></div>`;
  };

  /* ---------- Vöruspjald (Leiga: dagatal yfir framboð; Sala: lager) ---------- */
  st.day = null;
  const kpiB = (l, v) => `<div class="vyk"><small>${l}</small><b>${v}</b></div>`;
  const mini = (l, v) => `<div class="umini"><small>${l}</small><span>${v}</span></div>`;
  const u1VaraYfir = function (id) {
    const api = window.salaAPI; if (!api) return "";
    const v = api.VR().find(x => String(x.id) === String(id)); if (!v) return "";
    const iso = isoD(today), tot = +v.fjoldi || 0;
    const onTb = api.TB().filter(T => (T.linur || []).some(l => String(l.v) === String(v.id)));
    if (api.vDeild(v) !== "leiga") {
      const fr = api.TB().filter(T => ["Drög", "Sent"].includes(T.stada)).reduce((a, T) => a + (T.linur || []).filter(l => String(l.v) === String(v.id)).reduce((b, l) => b + (+l.magn || 0), 0), 0);
      const fm = +v.soluverd ? Math.round((1 - (+v.innkaupsverd || 0) / +v.soluverd) * 100) : 0;
      return `<div class="ukpis">${kpiB("Á lager", tot)}${kpiB("Frátekið á tilboðum", fr)}${kpiB("Laust", Math.max(0, tot - fr))}${kpiB("Á tilboðum", onTb.length)}</div>`
        + `<div class="uminis">${mini("Söluverð", kr(v.soluverd))}${mini("Innkaupsverð", v.innkaupsverd ? kr(v.innkaupsverd) : "–")}${mini("Framlegð", v.innkaupsverd ? fm + " %" : "–")}${mini("Viðvörun undir", `<input class="ulm" type="number" min="0" value="${+v.lagmark || 0}" onchange="doAct('u1lm:${E(v.id)}:'+this.value)"> stk.`)}</div>`
        + (()=>{ const hs = (v.hreyfingar || []).filter(h => h.teg === "Selt"); if (!hs.length) return ""; const now = new Date(), vals = [...Array(12)].map((_, i) => { const dd = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1), k = dd.getFullYear() + "-" + String(dd.getMonth() + 1).padStart(2, "0"); return [MNs[dd.getMonth()], hs.filter(h => String(h.dags).startsWith(k)).reduce((a, h) => a + Math.abs(h.magn), 0)]; }); const mx = Math.max(1, ...vals.map(x => x[1])); return `<div class="card ucard"><div class="ush">Selt á mánuði</div><div class="vybars">${vals.map(([l, n], i) => `<div class="vyb" style="height:120px"><span class="vyv${i === 11 ? " on" : ""}">${n || ""}</span><div class="vys"><i style="height:${Math.round(n / mx * 80)}px;background:${i === 11 ? "#1F5A96" : "#BFD0E3"}"></i></div><span class="vyl">${l}</span></div>`).join("")}</div></div>`; })();
    }
    const bk = api.bokanir().filter(b => String(b.v) === String(v.id) && (b.til || b.fra) >= iso).sort((a, b) => String(a.fra).localeCompare(String(b.fra)));
    const tent = []; api.TB().filter(T => T.stada === "Sent" && T.fra).forEach(T => (T.linur || []).forEach(l => { if (String(l.v) === String(v.id)) tent.push({ fra: T.fra, til: T.til || T.fra, m: +l.magn || 0, T }); }));
    const freeToday = Math.max(0, tot - u1Ovirk(v) - (api.upptekid(v.id, iso, iso).max || 0));
    // dagatal: 4 vikur frá mánudegi þessarar viku
    const a = mondayOf(today), cells = [];
    for (let i = 0; i < 28; i++) { const x = new Date(a); x.setDate(x.getDate() + i); const di = isoD(x), past = x < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const b = bk.filter(q => q.fra <= di && q.til >= di).reduce((s, q) => s + q.m, 0), tq = tent.filter(q => q.fra <= di && q.til >= di).reduce((s, q) => s + q.m, 0), free = tot - u1Ovirk(v) - b;
      const cls = past ? "past" : free <= 0 ? "full" : b ? "part" : x.getDay() % 6 ? "" : "wkend";
      cells.push(`<button type="button" class="ucd ${cls}${tq && !past ? " tent" : ""}${di === iso ? " today" : ""}${st.day === di ? " sel" : ""}" data-act="u1day:${di}"><span class="cdn">${x.getDate() === 1 ? "1. " + MNs[x.getMonth()] : x.getDate()}</span>${tq && !past ? `<span class="cdt">?${tq}</span>` : ""}${past ? "" : `<b>${free}</b>`}</button>`); }
    let pop = "";
    if (st.day) { const di = st.day, xs = bk.filter(q => q.fra <= di && q.til >= di), ts = tent.filter(q => q.fra <= di && q.til >= di), x = d(di);
      pop = `<div class="ucpop"><div class="ucph"><b>${x ? DN[(x.getDay() + 6) % 7] + " " + x.getDate() + ". " + MNs[x.getMonth()] : ""}</b><button type="button" data-act="u1day:" aria-label="Loka">×</button></div><div class="usub">${tot - xs.reduce((s, q) => s + q.m, 0)} laus af ${tot}</div>`
        + ([...xs.map(q => [q, "Bókað"]), ...ts.map(q => [q, "Tilboð sent"])].map(([q, lab]) => `<a class="ucpr" ${tapAttr("tb", q.T.id)}><span><b>${E(q.T.nr || "")} ${E(q.T.heiti || "")}</b><small>${E(q.T.vidskiptavinur || "")} · ${E(lab)}</small></span>${pill(q.m + " stk.", lab === "Bókað")}</a>`).join("") || `<div class="usub">Ekkert bókað þennan dag.</div>`) + `</div>`; }
    const cal = `<div class="ucal"><div class="ucalh">${DN.map(x => `<span>${x.slice(0, 2).toLowerCase()}</span>`).join("")}</div><div class="ucalg">${cells.join("")}</div><div class="ucall"><span>Tala = laus af ${tot}</span><span><i style="background:#E8EFF7"></i>að hluta</span><span><i style="background:#1F5A96"></i>uppbókað</span><span><i class="tent"></i>tilboð sent</span></div>${pop}</div>`;
    const up = bk.slice(0, 5).map(q => `<a class="ucpr" ${tapAttr("tb", q.T.id)}><span><b>${E(q.T.nr || "")} ${E(q.T.heiti || "")}</b><small>${E(relD(q.fra))}${q.til && q.til !== q.fra ? " – " + E(relD(q.til)) : ""}</small></span>${pill(q.m + " stk.")}</a>`).join("") || `<div class="usub">Ekkert frátekið framundan.</div>`;
    const pk = api.VR().filter(x => x.tegund === "pakki" && (x.innihald || []).some(i => String(i.v) === String(v.id))).map(x => [E(x.heiti), ((x.innihald || []).find(i => String(i.v) === String(v.id))?.m || 1) + " stk."]);
    return `<div class="ukpis">${kpiB("Laus í dag", freeToday + " af " + tot)}${kpiB("Bókanir framundan", bk.length)}${kpiB("Á tilboðum", onTb.length)}</div>`
      + `<div class="uminis">${mini("Dagverð", kr(v.leiguverd))}${mini("Fjöldi", tot + " stk.")}${mini("Flokkur", E(v.flokkur || "–"))}${mini("Viðvörun undir", `<input class="ulm" type="number" min="0" value="${+v.lagmark || 0}" onchange="doAct('u1lm:${E(v.id)}:'+this.value)"> laus`)}</div>`
      + `<div class="ucalrow"><div><div class="ush">Framboð</div>${cal}</div><div><div class="ush">Útleiga framundan</div>${up}${pk.length ? `<div class="ush" style="margin-top:14px">Í pökkum</div>${pk.map(([a, b]) => `<div class="vyr"><span>${a}</span><span>${b}</span></div>`).join("")}` : ""}</div></div>`;
  };


  window.u1VaraTop = function (id) {
    const api = window.salaAPI, v = VRget(id); if (!api || !v) return "";
    if (v.tegund === "vinna") return u1VinnaYfir(v);
    const leiga = api.vDeild(v) === "leiga", nO = u1OpinSkemmd(v), ink = (v.innkaup || []).filter(x => x.stada === "Pantað");
    const keys = leiga ? [["yfir", "Yfirlit"], ["eintok", "Eintök " + ((v.eintok || []).length || "")], ["astand", "Ástand" + (nO ? " " + nO : "")]] : [["yfir", "Yfirlit"], ["hreyf", "Hreyfingar"], ["innk", "Innkaup" + (ink.length ? " " + ink.length : "")]];
    if (!keys.some(x => x[0] === st.vt)) st.vt = "yfir";
    const ban = leiga && nO ? `<a class="uwarn" href="#" data-act="u1vt:astand"><i></i><span><b>${nO} ${nO === 1 ? "skemmd þarf" : "skemmdir þurfa"} skoðun</b> · ${E((v.skemmdir || []).find(x => x.stada === "opin")?.lysing || "")}</span><span class="m">Skoða ástand →</span></a>`
      : !leiga && ink.length ? `<a class="uwarn info" href="#" data-act="u1vt:innk"><i></i><span><b>Á leiðinni: ${ink.reduce((a, x) => a + (+x.magn || 0), 0)} stk.</b> · ${E(ink[0].nr)}${ink[0].birgir ? " frá " + E(ink[0].birgir) : ""}${ink[0].vaent ? ", væntanlegt " + E(ink[0].vaent.split("-").reverse().join(".")) : ""}</span><span class="m">Opna →</span></a>` : "";
    const body = st.vt === "eintok" ? u1VaraEintok(v) : st.vt === "astand" ? u1VaraAstand(v) : st.vt === "hreyf" ? u1VaraLager(v) : st.vt === "innk" ? u1VaraInnkaup(v) : u1VaraYfir(id);
    return tabsV(keys, st.vt) + ban + body;
  };
  /* ---------- Eintök, ástand og skemmdir (leigubúnaður) – reitir á vöruskjalinu: eintok[], skemmdir[] ---------- */
  st.vt = "yfir"; st.dmg = null; st.ink = null; st.tal = null;
  const ST_E = { ok: "Í lagi", skodun: "Þarf að skoða", vidgerd: "Í viðgerð", tynt: "Týnt" };
  window.u1Ovirk = v => (v?.eintok || []).filter(e => e.stada && e.stada !== "ok").length;
  window.u1OpinSkemmd = v => (v?.skemmdir || []).filter(x => x.stada === "opin").length;
  const VRget = id => window.salaAPI?.VR().find(x => String(x.id) === String(id));
  const saveV = (id, fn) => saveSnapshot(s => { const q = (s.vorur || []).find(x => String(x.id) === String(id)); if (q) fn(q, s); });
  const tabsV = (keys, cur) => `<div class="uvt">${keys.map(([k, l]) => `<button type="button" class="${k === cur ? "on" : ""}" data-act="u1vt:${k}">${E(l)}</button>`).join("")}</div>`;
  window.u1VaraEintok = function (v) {
    const es = v.eintok || [];
    if (!es.length) return `<div class="uempty">Engin eintök skráð. Stofnaðu eintök til að rekja hvert stykki, prenta QR-merki og skrá ástand.</div><button type="button" class="btn primary" data-act="u1mkE:${E(v.id)}">Stofna ${+v.fjoldi || 0} eintök</button>`;
    return `<div class="ush" style="display:flex;justify-content:space-between;align-items:center">Eintök · ${es.length}<span style="display:flex;gap:8px"><button type="button" class="btn" data-act="u1qr:${E(v.id)}">Prenta QR-merki</button><button type="button" class="btn" data-act="u1scan:">Skanna</button></span></div>`
      + `<div class="ueh"><span>Nr.</span><span>Ástand</span><span>Hilla</span><span></span></div>`
      + es.map((e, i) => `<div class="uer2"><span class="m">${E(e.nr)}</span><span class="${e.stada && e.stada !== "ok" ? "red" : ""}">${E(ST_E[e.stada || "ok"])}</span><span class="m">${E(e.hilla || v.hilla || "")}</span><select aria-label="Ástand ${E(e.nr)}" onchange="doAct('u1es:${E(v.id)}:${i}:'+this.value)">${Object.entries(ST_E).map(([k, l]) => `<option value="${k}"${(e.stada || "ok") === k ? " selected" : ""}>${l}</option>`).join("")}</select></div>`).join("");
  };
  window.u1VaraAstand = function (v) {
    const xs = (v.skemmdir || []).slice().sort((a, b) => (a.stada === "opin" ? 0 : 1) - (b.stada === "opin" ? 0 : 1) || String(b.dags).localeCompare(String(a.dags)));
    const es = v.eintok || [];
    const form = st.dmg === v.id ? `<div class="card udmgf"><label>Eintak<select id="u1dE">${es.length ? es.map(e => `<option>${E(e.nr)}</option>`).join("") : `<option value="">(ekkert eintak skráð)</option>`}</select></label><label>Lýsing<input id="u1dL" type="text" placeholder="t.d. rifið grill að framan"></label><label>Tengist (pöntun eða tilboð)<input id="u1dR" type="text" placeholder="t.d. P-0899"></label><div style="display:flex;gap:8px"><button type="button" class="btn primary" data-act="u1dmgS:${E(v.id)}">Vista</button><button type="button" class="btn" data-act="u1dmg:">Hætta við</button></div></div>` : "";
    return `<div class="ush" style="display:flex;justify-content:space-between;align-items:center">Ástand<button type="button" class="btn" data-act="u1dmg:${E(v.id)}">+ Skrá skemmd</button></div>${form}`
      + (xs.map(x => `<div class="card udmg${x.stada === "opin" ? " open" : ""}"><div class="udmgh"><div><small>${E(x.eintak || "")}</small><b>${E(x.lysing || "")}</b></div>${pill(x.stada === "opin" ? "Þarf að skoða" : x.stada === "vidgerd" ? "Í viðgerð" : "Lokið", x.stada === "opin")}</div><div class="usub">Skráð ${E((x.dags || "").slice(0, 10).split("-").reverse().join("."))}${x.ref ? " · " + E(x.ref) : ""}${x.af ? " · " + E(x.af) : ""}</div>`
        + (x.stada !== "lokid" ? `<div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="btn" data-act="u1dmgX:${E(v.id)}:${E(x.id)}:lokid">Merkja í lagi</button>${x.stada === "opin" ? `<button type="button" class="btn" data-act="u1dmgX:${E(v.id)}:${E(x.id)}:vidgerd">Senda í viðgerð</button>` : ""}</div>` : "") + `</div>`).join("") || `<div class="uempty">Engar skemmdir skráðar.</div>`);
  };
  // QR-merki: prentsíða með merki á hvert eintak, slóð appsins + ?e=<eintak>. QR búið til á tækinu (lib/qrcode.js, 2.44.0) – ekkert sótt frá þriðja aðila
  const qrLib = () => window.qrcode ? Promise.resolve() : new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = "lib/qrcode.js"; sc.onload = ok; sc.onerror = no; document.head.append(sc); });
  function printQR(v) {
    const base = (ORG.appUrl || location.origin + location.pathname).split("?")[0], es = v.eintok || [];
    const w = window.open("", "_blank"); if (!w) { toast?.("Leyfðu sprettiglugga til að prenta merki"); return; }
    qrLib().then(() => { const svg = u => { const q = qrcode(0, "M"); q.addData(u); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); };
    w.document.write(`<!doctype html><meta charset="utf-8"><title>QR-merki ${E(v.nr || "")}</title><style>body{font-family:Poppins,Arial,sans-serif;margin:12mm}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}.l{border:1px solid #ccc;border-radius:3mm;padding:3mm;display:flex;gap:3mm;align-items:center;break-inside:avoid}.l b{display:block;font-size:12pt}.l small{font-size:9pt;color:#555}.q{width:22mm;height:22mm;flex:none}.q svg{width:100%;height:100%;display:block}@media print{button{display:none}}</style><button onclick="print()">Prenta</button><div class="g">${es.map((e, i) => `<div class="l"><div class="q">${svg(base + "?e=" + encodeURIComponent(e.nr))}</div><div><b>${E(e.nr)}</b><small>${E(v.heiti || "")}<br>${E(ORG.nafn || "")}</small></div></div>`).join("")}</div>`);
    w.document.close(); }).catch(() => { w.close(); toast?.("Gat ekki búið til QR-merki"); });
  }
  // Skanna: myndavél + BarcodeDetector (Chrome/Edge/Android); annars má slá inn númer eintaks
  async function scanQR() {
    const wrap = document.createElement("div"); wrap.className = "uscan";
    wrap.innerHTML = `<div class="uscanb"><video playsinline muted></video><div class="usub">Beindu myndavélinni að QR-merki eintaks</div><input type="text" placeholder="…eða sláðu inn númer, t.d. HL-101-07"><div style="display:flex;gap:8px"><button type="button" class="btn primary">Opna</button><button type="button" class="btn">Loka</button></div></div>`;
    document.body.append(wrap); const vid = wrap.querySelector("video"), inp = wrap.querySelector("input"), [ok, cl] = wrap.querySelectorAll("button"); let stream = null, on = true;
    const close = () => { on = false; stream?.getTracks().forEach(t => t.stop()); wrap.remove(); };
    const go = txt => { const m = String(txt).match(/[?&]e=([^&]+)/), nr = decodeURIComponent(m ? m[1] : String(txt).trim()); if (openEintak(nr)) close(); else toast?.("Fann ekki eintakið " + nr); };
    cl.onclick = close; ok.onclick = () => go(inp.value); inp.onkeydown = e => { if (e.key === "Enter") go(inp.value); };
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); vid.srcObject = stream; await vid.play();
      if ("BarcodeDetector" in window) { const det = new BarcodeDetector({ formats: ["qr_code"] }); const tick = async () => { if (!on) return; try { const r = await det.detect(vid); if (r[0]) return go(r[0].rawValue); } catch (e) {} setTimeout(tick, 300); }; tick(); }
    } catch (e) { vid.remove(); }
  }
  function openEintak(nr) {
    const v = (window.salaAPI?.VR() || []).find(x => (x.eintok || []).some(e => e.nr === nr)); if (!v) return false;
    tab = "lvorur"; st.vt = "eintok"; DETAIL = null; render(); openDetail("vara:" + v.id); return true;
  }
  // ?e=<eintak> í slóð (skannað með venjulegri myndavél)
  (function () { const m = location.search.match(/[?&]e=([^&]+)/); if (!m) return; const nr = decodeURIComponent(m[1]); let n = 0; const t = setInterval(() => { if (window.S && S.vorur) { clearInterval(t); openEintak(nr); } else if (++n > 60) clearInterval(t); }, 500); })();

  /* ---------- Vöruspjald eftir útlitsborðinu (2.30.0): haus, flipar og innihald fyrir Leigu, Sölu og Þjónustu ---------- */
  st.cal = 0; st.rng = null; st.af = "opin";
  const sameV = (l, v) => String(l.v) === String(v.id);
  const docsWith = v => window.salaAPI.seld().filter(T => (T.linur || []).some(l => sameV(l, v)));
  const qOf = (T, v) => (T.linur || []).filter(l => sameV(l, v)).reduce((a, l) => a + (+l.magn || 0), 0);
  const revOf = (T, v) => (T.linur || []).filter(l => sameV(l, v)).reduce((a, l) => a + (window.salaAPI.netLine(l, T) || 0), 0);
  const dIS = s => { const x = d(s); return x ? dateIS(x) : ""; };
  const rngIS = (a, b) => { const x = d(a), y = d(b || a); if (!x) return ""; return +x === +y ? x.getDate() + ". " + MNs[x.getMonth()] : x.getMonth() === y.getMonth() ? x.getDate() + ".–" + y.getDate() + ". " + MNs[y.getMonth()] : dIS(a) + " – " + dIS(b); };
  window.u1D = { dIS: x => dIS(x), rngIS: (a, b) => rngIS(a, b) };
  const hillaOf = v => v.hilla || (() => { const c = {}; (v.eintok || []).forEach(e => { if (e.hilla) c[e.hilla] = (c[e.hilla] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || ""; })();
  const kpR = (arr, k4) => `<div class="ukps${k4 ? " k4" : ""}">${arr.map(([l, v]) => `<div class="ukp"><small>${E(l)}</small><b>${v}</b></div>`).join("")}</div>`;
  const minR = arr => `<div class="uminis m5">${arr.map(([l, v]) => mini(E(l), v)).join("")}</div>`;
  const monthChart = (title, right, vals, fmtN) => { const mx = Math.max(1, ...vals.map(x => x[1]));
    return `<div class="card ucard uchart"><div class="ush2" style="margin:0 0 6px"><span>${E(title)}</span><span class="m" style="font-weight:400">${E(right)}</span></div><div class="vybars">${vals.map(([l, n], i) => `<div class="vyb" style="height:150px"><span class="vyv${i === 11 ? " on" : ""}">${n ? fmtN(n) : ""}</span><div class="vys"><i style="height:${Math.round(n / mx * 100)}px;background:${i === 11 ? "#1F5A96" : "#BFD0E3"}"></i></div><span class="vyl">${l}</span></div>`).join("")}</div></div>`; };
  const last12 = f => { const now = new Date(); return [...Array(12)].map((_, i) => { const dd = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1), k = dd.getFullYear() + "-" + String(dd.getMonth() + 1).padStart(2, "0"); return [MNs[dd.getMonth()], f(k)]; }); };
  const lnR = (attr, a, b, pl, dark, right) => `<a class="uln" ${attr}><span>${a}${b ? `<small> · ${b}</small>` : ""}</span><span class="uln-r">${pl ? pill(pl, dark) : ""}${right ? `<small>${right}</small>` : ""}</span></a>`;

  function vHead(v, sup, sub, acts) {
    const api = window.salaAPI, D = api.vDeild(v);
    const more = MCP ? `<details class="umore"><summary aria-label="Fleiri aðgerðir">⋯</summary><div><button type="button" data-act="vrnew:${E(D)}:${E(v.id)}">✎ Breyta</button>${window.can && can("eyda") ? `<button type="button" class="danger" data-act="vrdel:${E(v.id)}">Eyða</button>` : ""}</div></details>` : "";
    return `<div class="udh2 uvh"><div class="udl"><div class="spsup">${E(sup)}</div><h2 class="ptitle">${E(v.heiti || "")}</h2><div class="usub">${E(sub)}</div></div><div class="uact">${MCP ? acts : ""}${more}</div></div>`;
  }
  // Dagatal yfir framboð: weeks vikur frá mánudegi (+ st.cal vikur), valinn dagur eða tímabil
  function vCal(v, weeks, opts = {}) {
    const api = window.salaAPI, iso = isoD(today), tot = (+v.fjoldi || 0) - u1Ovirk(v);
    const bk = api.bokanir().filter(b => String(b.v) === String(v.id));
    const tent = []; api.TB().filter(T => T.stada === "Sent" && T.fra).forEach(T => (T.linur || []).forEach(l => { if (sameV(l, v)) tent.push({ fra: T.fra, til: T.til || T.fra, m: +l.magn || 0, T }); }));
    const a = mondayOf(today); a.setDate(a.getDate() + 7 * st.cal);
    const days = [...Array(weeks * 7)].map((_, i) => { const x = new Date(a); x.setDate(x.getDate() + i); return x; });
    const R = st.rng && st.rng.v === v.id ? st.rng : null, inR = di => R && R.b && di >= R.a && di <= R.b;
    const cells = days.map(x => { const di = isoD(x), past = di < iso;
      const b = bk.filter(q => q.fra <= di && q.til >= di).reduce((s, q) => s + q.m, 0), tq = tent.filter(q => q.fra <= di && q.til >= di).reduce((s, q) => s + q.m, 0), free = tot - b;
      const cls = past ? "past" : free <= 0 ? "full" : b ? "part" : "";
      return `<button type="button" class="ucd ${cls}${tq && !past ? " tent" : ""}${di === iso ? " today" : ""}${R && (R.a === di && !R.b || inR(di)) ? " sel" : ""}" data-act="u1d2:${E(v.id)}:${di}"><span class="cdn">${x.getDate() === 1 ? "1. " + MNs[x.getMonth()] : x.getDate()}</span>${tq && !past ? `<span class="cdt">?${tq}</span>` : ""}${past ? "" : `<b>${Math.max(0, free)}</b>`}</button>`; }).join("");
    const m1 = days[0], m2 = days[days.length - 1], MN = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
    const ttl = m1.getMonth() === m2.getMonth() ? MN[m1.getMonth()][0].toUpperCase() + MN[m1.getMonth()].slice(1) + " " + m2.getFullYear() : MN[m1.getMonth()][0].toUpperCase() + MN[m1.getMonth()].slice(1) + " – " + MN[m2.getMonth()] + " " + m2.getFullYear();
    let pop = "";
    if (R && !R.b) { const di = R.a, xs = bk.filter(q => q.fra <= di && q.til >= di), ts = tent.filter(q => q.fra <= di && q.til >= di), x = d(di), used = xs.reduce((s, q) => s + q.m, 0);
      pop = `<div class="ucpop"><div class="ucph"><b>${["Sunnudagur", "Mánudagur", "Þriðjudagur", "Miðvikudagur", "Fimmtudagur", "Föstudagur", "Laugardagur"][x.getDay()]} ${x.getDate()}. ${MNs[x.getMonth()]}</b><button type="button" data-act="u1d2:${E(v.id)}:" aria-label="Loka">×</button></div><div class="usub">${Math.max(0, tot - used)} laus af ${tot} · ${used} bókuð · veldu annan dag til að velja tímabil</div>`
        + ([...xs.map(q => [q, true]), ...ts.map(q => [q, false])].map(([q, ok]) => `<a class="ucpr" ${tapAttr("tb", q.T.id)}><span><b>${E(q.T.nr || "")} ${E(q.T.heiti || "")} →</b><small>${E(q.T.vidskiptavinur || q.T.tengilidur || "")} · ${q.T.pontun ? "afhent " : ""}${E(rngIS(q.fra, q.til))}${q.T.verkefniId && findProj(q.T.verkefniId) ? "<br>Verkefni " + E(findProj(q.T.verkefniId).nr) : ""} · ${ok ? (q.T.pontun ? "pöntun " + E(q.T.stada.toLowerCase()) : "tilboð samþykkt") : "tilboð sent"}</small></span>${pill(q.m + " stk.", ok)}</a>`).join("") || `<div class="usub" style="padding:6px 0">Ekkert bókað þennan dag.</div>`)
        + (MCP ? `<div style="margin-top:10px"><button type="button" class="btn" data-act="u1tf:${E(v.id)}">Taka frá þennan dag</button></div>` : "") + `</div>`; }
    let bar = "";
    if (R && R.b) { const ds = days.map(isoD).filter(di => di >= R.a && di <= R.b), n = Math.round((d(R.b) - d(R.a)) / 864e5) + 1;
      const minFree = Math.min(...ds.map(di => tot - bk.filter(q => q.fra <= di && q.til >= di).reduce((s, q) => s + q.m, 0)));
      const tq = Math.max(0, ...ds.map(di => tent.filter(q => q.fra <= di && q.til >= di).reduce((s, q) => s + q.m, 0))), tT = tent.find(q => q.fra <= R.b && q.til >= R.a);
      bar = `<div class="urng"><div><b>${n} ${n === 1 ? "dagur valinn" : "dagar valdir"} · ${E(rngIS(R.a, R.b))}</b><small>${Math.max(0, minFree)} laus allt tímabilið${tq && tT ? ` · ${Math.max(0, minFree - tq)} ef tilboð ${E(tT.T.nr)} verður samþykkt` : ""}</small></div>${MCP ? `<span><button type="button" class="btn" data-act="u1tf:${E(v.id)}">Taka frá</button><button type="button" class="btn primary" data-act="u1tb:${E(v.id)}">+ Á tilboð</button></span>` : ""}</div>`; }
    return `<div class="ucal${opts.big ? " big" : ""}"><div class="ucalt"><b>${E(ttl)}</b><span><button type="button" class="btn sm" data-act="u1cal:-1" aria-label="Fyrri vikur">‹</button><button type="button" class="btn sm" data-act="u1cal:0">Í dag</button><button type="button" class="btn sm" data-act="u1cal:1" aria-label="Næstu vikur">›</button></span></div>`
      + `<div class="ucalh">${["má", "þr", "mi", "fi", "fö", "la", "su"].map(x => `<span>${x}</span>`).join("")}</div><div class="ucalg">${cells}</div>${bar}<div class="ucall"><span>Tala = laus af ${tot}</span><span><i style="background:#E8EFF7"></i>að hluta</span><span><i style="background:#1F5A96"></i>uppbókað</span><span><i class="tent"></i>tilboð sent</span></div>${pop}</div>`;
  }
  function leigaPanel(v) {
    const api = window.salaAPI, iso = isoD(today), y0 = today.getFullYear() + "-", tot = +v.fjoldi || 0, ovirk = u1Ovirk(v), nO = u1OpinSkemmd(v);
    const free = Math.max(0, tot - ovirk - (api.upptekid(v.id, iso, iso).max || 0)), docs = docsWith(v);
    const past = docs.filter(T => String(T.fra || T.dags) < iso).sort((a, b) => String(b.fra).localeCompare(String(a.fra)));
    const y1 = isoD(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())); let used = 0;
    api.bokanir().filter(b => String(b.v) === String(v.id)).forEach(b => { const a = b.fra > y1 ? b.fra : y1, z = b.til < iso ? b.til : iso; if (z >= a) used += b.m * (Math.round((d(z) - d(a)) / 864e5) + 1); });
    const nyt = tot ? Math.round(used / (tot * 365) * 100) : 0, tekjur = docs.filter(T => String(T.fra || T.dags).startsWith(y0) && String(T.fra || T.dags).slice(0, 10) <= iso).reduce((s, T) => s + revOf(T, v), 0);
    const keys = [["yfir", "Yfirlit"], ["frambod", "Framboð"], ["eintok", "Eintök " + ((v.eintok || []).length || "")], ["astand", "Ástand" + (nO ? " " + nO : "")], ["saga", "Saga " + (past.length || "")], ["skrar", "Skrár"]];
    if (!keys.some(x => x[0] === st.vt)) st.vt = "yfir";
    const acts = `<button type="button" class="btn" data-act="u1vg:${E(v.id)}">Merkja í viðgerð</button><button type="button" class="btn" data-act="u1tf:${E(v.id)}">Taka frá</button><button type="button" class="btn primary" data-act="u1tb:${E(v.id)}">+ Á tilboð</button>`;
    const h = vHead(v, "Leigubúnaður · " + (v.flokkur || "Annað"), [v.nr, tot + " stk.", hillaOf(v) ? "Hilla " + hillaOf(v) : ""].filter(Boolean).join(" · "), acts);
    const ban = nO ? (() => { const x = (v.skemmdir || []).find(q => q.stada === "opin"); return `<a class="uwarn" href="#" data-act="u1vt:astand"><i></i><span><b>${nO} stk. þarf skoðun</b> · ${E(x?.lysing || "")}${x?.eintak ? " á " + E(x.eintak) : ""}${x?.ref ? ", skráð við skil " + E(x.ref) : ""}${x?.dags ? " · " + E(dIS(x.dags.slice(0, 10))) : ""}</span><span class="m">Skoða ástand →</span></a>`; })() : "";
    const up = api.bokanir().filter(b => String(b.v) === String(v.id) && b.til >= iso).sort((a, b) => String(a.fra).localeCompare(String(b.fra)));
    const tentUp = api.TB().filter(T => T.stada === "Sent" && T.fra && (T.til || T.fra) >= iso && (T.linur || []).some(l => sameV(l, v)));
    const pk = api.VR().filter(x => x.tegund === "pakki" && (x.innihald || []).some(i => String(i.v) === String(v.id)));
    let body = "";
    if (st.vt === "yfir") {
      const st2 = api.studull ? api.studull : n => n;
      body = ban + kpR([["Laus í dag", free + " af " + tot], ["Nýting 12 mán.", nyt + " %"], ["Leigt út í ár án vsk", kr(tekjur)]])
        + minR([["Dagverð", kr(v.leiguverd)], ["Helgi (fö–má)", kr(Math.round((+v.leiguverd || 0) * st2(2)))], ["Vika", kr(Math.round((+v.leiguverd || 0) * st2(7)))], ["Innkaupsverð", v.innkaupsverd ? kr(v.innkaupsverd) : "–"], ["Viðvörun undir", `<input class="ulm" type="number" min="0" value="${+v.lagmark || 0}" onchange="doAct('u1lm:${E(v.id)}:'+this.value)"> laus`]])
        + `<div class="ucalrow"><div><div class="ush2"><span>Framboð</span><a href="#" data-act="u1vt:frambod">Nánar →</a></div>${vCal(v, 4)}</div><div>`
        + `<div class="ush2"><span>Útleiga framundan</span></div>${[...up.map(b => lnR(tapAttr("tb", b.T.id), E((b.T.nr || "") + " " + (b.T.heiti || "")) + " · " + E(rngIS(b.fra, b.til)), "", b.m + " stk.")), ...tentUp.map(T => lnR(tapAttr("tb", T.id), E((T.nr || "") + " " + (T.heiti || "")) + " · " + E(rngIS(T.fra, T.til)) + " · tilboð sent", "", qOf(T, v) + " stk."))].slice(0, 6).join("") || `<div class="usub" style="padding:6px 0">Ekkert frátekið framundan.</div>`}`
        + (pk.length ? `<div class="ush2"><span>Í pökkum</span></div>${pk.map(x => lnR(tapAttr("vara", x.id), E(x.heiti), "", ((x.innihald || []).find(i => String(i.v) === String(v.id))?.m || 1) + " stk.")).join("")}` : "") + `</div></div>`;
    } else if (st.vt === "frambod") {
      const a = mondayOf(today); a.setDate(a.getDate() + 7 * st.cal); const ds = [...Array(42)].map((_, i) => { const x = new Date(a); x.setDate(x.getDate() + i); return isoD(x); });
      const bk = api.bokanir().filter(b => String(b.v) === String(v.id)), cap = tot - ovirk;
      const full = ds.filter(di => di >= iso && cap - bk.filter(q => q.fra <= di && q.til >= di).reduce((s, q) => s + q.m, 0) <= 0).length;
      const m0 = isoD(new Date(today.getFullYear(), today.getMonth(), 1)), m1 = isoD(new Date(today.getFullYear(), today.getMonth() + 1, 0)); let um = 0;
      bk.forEach(b => { const x = b.fra > m0 ? b.fra : m0, z = b.til < m1 ? b.til : m1; if (z >= x) um += b.m * (Math.round((d(z) - d(x)) / 864e5) + 1); });
      const dim = +m1.slice(8), sent = tentUp.reduce((s, T) => s + qOf(T, v), 0);
      const rows = [...up.map(b => ({ T: b.T, m: b.m, fra: b.fra, til: b.til, ok: true })), ...tentUp.map(T => ({ T, m: qOf(T, v), fra: T.fra, til: T.til, ok: false }))].sort((x, y) => String(x.fra).localeCompare(String(y.fra)));
      body = `<div class="ufrb"><div>${vCal(v, 6, { big: 1 })}</div><div>${kpR([["Nýting í " + MNs[today.getMonth()], (cap ? Math.round(um / (cap * dim) * 100) : 0) + " %"], ["Uppbókað", full + (full === 1 ? " dagur" : " dagar")]])}${kpR([["Í tilboðum", "+" + sent + " stk."], ["Óvirk eintök", ovirk + " stk."]])}`
        + `<div class="ush2"><span>Bókanir og tilboð</span></div>${rows.map(x => `<a class="uln" ${tapAttr("tb", x.T.id)}><span><b class="t">${E((x.T.nr || "") + " " + (x.T.heiti || ""))}</b><small>${E(x.T.vidskiptavinur || x.T.tengilidur || "")} · ${E(rngIS(x.fra, x.til))}</small></span><span class="uln-r">${pill(x.m + " stk.", x.ok)}<small>${x.T.pontun ? "Pöntun · " + E(x.T.stada.toLowerCase()) : x.ok ? "Tilboð samþykkt" : "Tilboð sent"}</small></span></a>`).join("")}`
        + (v.eintok || []).filter(e => e.stada && e.stada !== "ok").map(e => `<a class="uln" href="#" data-act="u1vt:astand"><span><b class="t">${E(e.nr)} ${E(ST_E[e.stada].toLowerCase())}</b></span><span class="uln-r">${pill("1 stk.")}<small>Ekki leigjanlegt</small></span></a>`).join("")
        + (rows.length || ovirk ? "" : `<div class="usub" style="padding:6px 0">Engar bókanir framundan.</div>`) + `</div></div>`;
    } else if (st.vt === "eintok") body = u1VaraEintok(v);
    else if (st.vt === "astand") body = u1Astand2(v);
    else if (st.vt === "saga") body = `<div class="ueh s4"><span>Dags.</span><span>Skjal · viðskiptavinur</span><span>Magn</span><span>Upphæð</span></div>` + (past.map(T => `<a class="uer2 s4" ${tapAttr("tb", T.id)}><span class="m">${E(rngIS(T.fra, T.til))}</span><span>${E((T.nr || "") + " " + (T.heiti || ""))}<span class="m"> · ${E(T.vidskiptavinur || T.tengilidur || "")}</span></span><span>${qOf(T, v)} stk.</span><span>${kr(revOf(T, v))}</span></a>`).join("") || `<div class="uempty">Engin útleiga skráð enn.</div>`);
    else body = `<div class="uempty">Engar skrár tengdar ennþá. Handbækur, myndir og vottorð birtast hér.</div>`;
    return h + tabsV(keys, st.vt) + `<div class="uvb">${body}</div>`;
  }
  // Ástand: síur Opið/Lokið, skemmdir og eintakalisti með QR
  window.u1Astand2 = function (v) {
    const all = v.skemmdir || [], op = all.filter(x => x.stada !== "lokid"), lo = all.filter(x => x.stada === "lokid"), xs = (st.af === "lokid" ? lo : op).slice().sort((a, b) => String(b.dags).localeCompare(String(a.dags)));
    const es = v.eintok || [];
    const form = st.dmg === v.id ? `<div class="card udmgf"><label>Eintak<select id="u1dE">${es.length ? es.map(e => `<option>${E(e.nr)}</option>`).join("") : `<option value="">(ekkert eintak skráð)</option>`}</select></label><label>Lýsing<input id="u1dL" type="text" placeholder="t.d. rifið grill að framan"></label><label>Tengist (pöntun eða tilboð)<input id="u1dR" type="text" placeholder="t.d. P-0899"></label><div style="display:flex;gap:8px"><button type="button" class="btn primary" data-act="u1dmgS:${E(v.id)}">Vista</button><button type="button" class="btn" data-act="u1dmg:">Hætta við</button></div></div>` : "";
    const lastRef = (() => { const T = docsWith(v).filter(T => String(T.fra || "") <= isoD(today)).sort((a, b) => String(b.fra).localeCompare(String(a.fra)))[0]; return T ? E(T.nr || "") + " · " + E(dIS(T.til || T.fra)) : ""; })();
    return `<div class="ush2" style="margin-top:0"><span>${chips([["opin", "Opið · " + op.length], ["lokid", "Lokið · " + lo.length]], st.af, "u1af")}</span>${MCP ? `<button type="button" class="btn" data-act="u1dmg:${E(v.id)}">+ Skrá skemmd</button>` : ""}</div>${form}`
      + (xs.map(x => `<div class="card udmg${x.stada === "opin" ? " open" : ""}"><div class="udmgh"><div><small>${E(x.eintak || "")}</small><b>${E(x.lysing || "")}</b></div>${pill(x.stada === "opin" ? "Þarf að skoða" : x.stada === "vidgerd" ? "Í viðgerð" : "Viðgert", x.stada === "opin")}</div><div class="usub">Skráð${x.ref ? " við skil " + E(x.ref) : ""} · ${E(dIS((x.dags || "").slice(0, 10)))}${x.af ? " · " + E(x.af) : ""}${x.lokid ? " · viðgert " + E(dIS(x.lokid.slice(0, 10))) : ""}</div>`
        + (x.stada !== "lokid" && MCP ? `<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button type="button" class="btn" data-act="u1dmgX:${E(v.id)}:${E(x.id)}:lokid">Merkja í lagi</button>${x.stada === "opin" ? `<button type="button" class="btn" data-act="u1dmgX:${E(v.id)}:${E(x.id)}:vidgerd">Senda í viðgerð</button>` : ""}${x.rukkad ? `<span class="upill">Rukkað ${E(kr(x.rukkad.upphaed))} · ${E(x.rukkad.pontun)}</span>` : `<button type="button" class="btn" data-act="u1rk:${E(v.id)}:${E(x.id)}">Rukka viðskiptavin</button>`}</div>` : "") + `</div>`).join("") || `<div class="uempty">${st.af === "lokid" ? "Engar lokaðar skemmdir." : "Engar opnar skemmdir – allt í lagi."}</div>`)
      + `<div class="ush2"><span>Eintök</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="u1qr:${E(v.id)}">Prenta QR-merki</button><button type="button" class="btn" data-act="u1scan:">Skanna</button></span></div>`
      + (es.length ? es.map(e => { const dm = all.find(x => x.eintak === e.nr && x.stada !== "lokid"), lk = all.find(x => x.eintak === e.nr && x.stada === "lokid"); return `<div class="uer2 e5"><span class="uqr" aria-hidden="true">▦</span><span>${E(e.nr)}</span><span class="${e.stada && e.stada !== "ok" ? "red" : ""}">${E(ST_E[e.stada || "ok"])}${lk && (!e.stada || e.stada === "ok") ? " · viðgert " + E(dIS((lk.lokid || lk.dags || "").slice(0, 10))) : ""}</span><span class="m">${dm?.ref ? E(dm.ref) + " · " + E(dIS(dm.dags.slice(0, 10))) : lastRef}</span><span class="m">${E(e.stada === "skodun" ? "Skoðun" : e.hilla || v.hilla || "")}</span></div>`; }).join("") : `<div class="uempty">Engin eintök skráð.</div><button type="button" class="btn primary" data-act="u1mkE:${E(v.id)}">Stofna ${+v.fjoldi || 0} eintök</button>`);
  };
  function salaPanel(v) {
    const api = window.salaAPI, iso = isoD(today), y0 = today.getFullYear() + "-", tot = +v.fjoldi || 0, ink = (v.innkaup || []).filter(x => x.stada === "Pantað");
    const frT = api.TB().filter(T => ["Drög", "Sent", "Samþykkt"].includes(T.stada) && !(T.stada === "Samþykkt" && String(T.fra || "") < iso) && (T.linur || []).some(l => sameV(l, v)));
    const fr = frT.filter(T => T.stada !== "Drög").reduce((s, T) => s + qOf(T, v), 0);
    const hs = (v.hreyfingar || []).slice().sort((a, b) => String(b.dags).localeCompare(String(a.dags)));
    // Selt magn og upphæð úr seldum tilboðum og pöntunum (sama grunnur og „Selt í ár“) – ekki úr lagerhreyfingum
    const y1 = isoD(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())), sd = docsWith(v), dOfT = T => String(T.fra || T.dags || "").slice(0, 10), sold = sd.filter(T => dOfT(T) >= y1 && dOfT(T) <= iso).reduce((s, T) => s + qOf(T, v), 0);
    // Selt í ár: raunverð úr seldum tilboðum og pöntunum (ekki magn × núverandi listaverð)
    const rev = docsWith(v).filter(T => String(T.fra || T.dags).startsWith(y0) && String(T.fra || T.dags).slice(0, 10) <= iso).reduce((s, T) => s + revOf(T, v), 0);
    const keys = [["yfir", "Yfirlit"], ["hreyf", "Hreyfingar"], ["innk", "Innkaup" + (ink.length ? " " + ink.length : "")], ["skrar", "Skrár"]];
    if (!keys.some(x => x[0] === st.vt)) st.vt = "yfir";
    const h = vHead(v, "Söluvara · " + (v.flokkur || "Annað"), [v.nr, tot + " á lager", hillaOf(v) ? "Hilla " + hillaOf(v) : ""].filter(Boolean).join(" · "), `<button type="button" class="btn" data-act="u1pi:${E(v.id)}">Panta inn</button><button type="button" class="btn primary" data-act="u1tb:${E(v.id)}">+ Á tilboð</button>`);
    let body = "";
    if (st.vt === "yfir") {
      const ban = ink.length ? `<a class="uwarn info" href="#" data-act="u1vt:innk"><i></i><span><b>Á leiðinni: ${ink.reduce((a, x) => a + (+x.magn || 0), 0)} stk.</b> · innkaupapöntun ${E(ink[0].nr)}${ink[0].birgir ? " frá " + E(ink[0].birgir) : ""}${ink[0].vaent ? ", væntanleg " + E(dIS(ink[0].vaent)) : ""}</span><span class="m">Opna →</span></a>` : "";
      const fm = +v.soluverd && +v.innkaupsverd ? Math.round((1 - v.innkaupsverd / v.soluverd) * 100) + " %" : "–";
      const rows = [...ink.map(x => `<div class="uer2 h4"><span class="m">${E(dIS(x.vaent))}</span><span>Væntanlegt<span class="m"> · ${E(x.nr)} ${E(x.birgir || "")}</span></span><span class="m">(+${x.magn})</span><span class="m">(${tot + (+x.magn || 0)})</span></div>`),
        ...hs.slice(0, 5 - ink.length).map(x => `<div class="uer2 h4"><span class="m">${E(dIS(String(x.dags).slice(0, 10)))}</span><span>${E(x.teg)}${x.ref ? `<span class="m"> · ${E(x.ref)}</span>` : ""}</span><span class="${x.magn > 0 ? "blue" : ""}">${x.magn > 0 ? "+" : "−"}${Math.abs(x.magn)}</span><span>${x.stada ?? ""}</span></div>`)];
      body = ban + kpR([["Á lager", tot], ["Laust (ekki frátekið)", Math.max(0, tot - fr)], ["Selt 12 mán.", sold + " stk."], ["Selt í ár án vsk", kr(rev)]], 1)
        + minR([["Söluverð", kr(v.soluverd)], ["Innkaupsverð", v.innkaupsverd ? kr(v.innkaupsverd) : "–"], ["Framlegð", fm], ["Birgir", E(v.birgir || "–")], ["Viðvörun undir", `<input class="ulm" type="number" min="0" value="${+v.lagmark || 0}" onchange="doAct('u1lm:${E(v.id)}:'+this.value)"> stk.`]])
        + `<div class="u2c w"><div><div class="ush2"><span>Lagerhreyfingar</span><a href="#" data-act="u1vt:hreyf">Sjá allar →</a></div><div class="ueh h4"><span>Dags.</span><span>Hreyfing</span><span>Magn</span><span>Staða</span></div>${rows.join("") || `<div class="usub" style="padding:6px 0">Engar hreyfingar.</div>`}</div>`
        + `<div><div class="ush2"><span>Frátekið</span></div>${frT.map(T => lnR(tapAttr("tb", T.id), E((T.nr || "") + " " + (T.heiti || "")), T.stada === "Samþykkt" ? (T.fra ? E(dIS(T.fra)) : "") : "tilboð " + E(T.stada.toLowerCase()), qOf(T, v) + " stk.")).join("") || `<div class="usub" style="padding:6px 0">Ekkert frátekið.</div>`}</div></div>`
        + monthChart("Selt á mánuði", sold + " stk. síðustu 12 mán.", last12(k => sd.filter(T => dOfT(T).startsWith(k)).reduce((s, T) => s + qOf(T, v), 0)), n => n);
    } else if (st.vt === "hreyf") body = u1VaraLager(v);
    else if (st.vt === "innk") body = u1VaraInnkaup(v);
    else body = `<div class="uempty">Engar skrár tengdar ennþá. Vörublöð og myndir birtast hér.</div>`;
    return h + tabsV(keys, st.vt) + `<div class="uvb">${body}</div>`;
  }
  function vinnaPanel(v) {
    const api = window.salaAPI, ein = v.eining || "klst.", docs = docsWith(v), iso = isoD(today);
    const past = docs.filter(T => String(T.fra || T.dags) <= iso).sort((a, b) => String(b.fra || b.dags).localeCompare(String(a.fra || a.dags)));
    const keys = [["yfir", "Yfirlit"], ["saga", "Saga " + (past.length || "")], ["skrar", "Skrár"]];
    if (!keys.some(x => x[0] === st.vt)) st.vt = "yfir";
    const h = vHead(v, "Þjónusta · " + (v.flokkur || "Annað"), [v.nr, "verð á " + ein.replace(/\.$/, "") + (ein === "klst." ? "." : "")].filter(Boolean).join(" · "), `<button type="button" class="btn primary" data-act="u1tb:${E(v.id)}">+ Á tilboð</button>`);
    let body = "";
    if (st.vt === "yfir") body = u1VinnaYfir(v);
    else if (st.vt === "saga") body = `<div class="ueh s4"><span>Dags.</span><span>Skjal · viðskiptavinur</span><span>Magn</span><span>Upphæð</span></div>` + (past.map(T => `<a class="uer2 s4" ${tapAttr("tb", T.id)}><span class="m">${E(rngIS(T.fra || T.dags, T.til))}</span><span>${E((T.nr || "") + " " + (T.heiti || ""))}<span class="m"> · ${E(T.vidskiptavinur || T.tengilidur || "")}</span></span><span>${H(qOf(T, v))} ${E(ein)}</span><span>${kr(revOf(T, v))}</span></a>`).join("") || `<div class="uempty">Engin sala skráð enn.</div>`);
    else body = `<div class="uempty">Engar skrár tengdar ennþá.</div>`;
    return h + tabsV(keys, st.vt) + `<div class="uvb">${body}</div>`;
  }
  window.u1VaraPanel = function (id) {
    const api = window.salaAPI, v = VRget(id); if (!api || !v) return null;
    if (v.tegund === "vinna") return vinnaPanel(v);
    if (v.tegund === "pakki") return null; // pakkar: upprunalega spjaldið (innihald pakkans)
    return api.vDeild(v) === "leiga" ? leigaPanel(v) : salaPanel(v);
  };
  // „+ Á tilboð“: velja opið tilboð til að bæta línunni á, eða nýtt tilboð
  function addToTb(id) {
    const api = window.salaAPI, v = VRget(id); if (!v) return;
    const R = st.rng && st.rng.v === id ? st.rng : null, open = api.TB().filter(T => ["Drög", "Sent"].includes(T.stada)).sort((a, b) => String(b.dags).localeCompare(String(a.dags)));
    sheet.innerHTML = `<h3 id="sheet-h">Setja á tilboð</h3><p class="hint" style="margin:0 0 10px">${E(v.nr || "")} ${E(v.heiti || "")}${R ? " · " + E(rngIS(R.a, R.b || R.a)) : ""}</p><label>Magn<input id="u1tbM" type="number" min="1" value="1"></label>`
      + `<div class="viewtitle">Opin tilboð</div><div class="llist">${open.map(T => `<button type="button" class="lrow tap" data-act="u1tbA:${E(id)}:${E(T.id)}" style="width:100%;text-align:left;border:0;background:none;font:inherit"><div class="lm"><div class="lt">${E(T.nr || "")} ${E(T.heiti || "")}</div><div class="ls">${E(T.vidskiptavinur || "")} · ${E(T.stada)}${T.fra ? " · " + E(rngIS(T.fra, T.til)) : ""}</div></div></button>`).join("") || `<div class="hint">Engin opin tilboð.</div>`}</div>`
      + `<div class="actions"><button type="button" class="btn" onclick="closeSheet()">Hætta við</button><button type="button" class="btn primary" data-act="u1tbN:${E(id)}">Nýtt tilboð</button></div>`;
    sheetwrap.hidden = false;
  }
  /* ---------- Spjöld eftir útlitsborðinu (2.31.0): fundur, tímafærsla, reikningur; Undirverk og Samskipti verkefnis ---------- */
  const more2 = items => MCP && items.length ? `<details class="umore"><summary aria-label="Fleiri aðgerðir">⋯</summary><div>${items.map(([l, a, cls]) => `<button type="button"${cls ? ` class="${cls}"` : ""} data-act="${E(a)}">${l}</button>`).join("")}</div></details>` : "";
  const dHead = (sup, title, sub, acts) => `<div class="udh2"><div class="udl"><div class="spsup">${E(sup)}</div><h2 class="ptitle">${E(title)}</h2><div class="usub">${sub}</div></div><div class="uact">${acts}</div></div>`;
  const kp3 = arr => `<div class="ukps">${arr.map(([l, v]) => `<div class="ukp"><small>${E(l)}</small><b>${v}</b></div>`).join("")}</div>`;
  const DAYL = ["sun", "mán", "þri", "mið", "fim", "fös", "lau"];
  window.UI1D = {
    oreikn() {
      const gs = window.rkUnbilled ? verkefni().map(p => { const x = rkUnbilled(p.id); return { p, h: sumT(x.es), k: sumK(x.ks), kr: window.rkUnbilledKr ? rkUnbilledKr(p.id) : 0 }; }).filter(g => g.h >= 0.5 || g.k).sort((a, b) => b.kr - a.kr) : [];
      const th = gs.reduce((s, g) => s + g.h, 0), tk = gs.reduce((s, g) => s + g.k, 0);
      return dHead("Fjármál", "Óreikningsfært", E(H(th) + " klst." + (tk ? " og " + kr(tk) + " í útlögðum kostnaði" : "")), "") + `<div class="uvb"><div class="utb"><div class="utbr r4 h"><span>Verkefni</span><span>Klst.</span><span>Kostn.</span><span>Upphæð</span></div>`
        + gs.map(g => `<a class="utbr r4" ${tapAttr("verk", g.p.id)}><span>${E(g.p.nr + " " + (g.p.stutt || ""))}</span><span>${H(g.h)}</span><span>${g.k ? kr(g.k) : ""}</span><span>${kr(g.kr)}</span></a>`).join("") + `</div>`
        + (MCP && gs.length ? `<div class="ubot"><button type="button" class="btn primary" data-act="rknew:${E(gs[0].p.id)}">Búa til reikningsdrög</button><button type="button" class="btn" data-act="u1go:trk:">Opna Reikninga</button></div>` : "") + `</div>`;
    },
    fund(id) {
      const f = (S?.fundir || []).find(x => String(x.id) === String(id)); if (!f) return null;
      const p = f.projectId ? findProj(f.projectId) : null, x = d(f.date), n = daysTo(f.date);
      const wh = x ? (DAYL[x.getDay()] + " " + dateIS(x)) + (hhmm(f.date) ? " kl. " + hhmm(f.date) : "") : "";
      const t2 = hhmm(f.dateEnd) || (hhmm(f.date) ? (() => { const y = new Date(d(f.date)); y.setHours(y.getHours() + 1); return String(y.getHours()).padStart(2, "0") + ":" + String(y.getMinutes()).padStart(2, "0"); })() : "");
      const sub = [p ? E(p.nr + " " + (p.stutt || "")) : E(f.verknr || ""), E(p?.vidskiptavinur || "")].filter(Boolean).join(" · ");
      const acts = MCP ? `<button type="button" class="btn" data-act="edit:fund:${E(f.id)}">Breyta</button>` + more2([["Setja í dagatalið mitt", "ics:" + f.id], ["Skrá tíma fyrir fundinn", "fundtime:" + f.id], ["Eyða", "del:fund:" + f.id, "danger"]]) : "";
      const hvar = f.fundarhlekkur ? (/teams/i.test(f.fundarhlekkur) ? "Teams" : "Fjarfundur") : f.stadsetning || "–", hvarH = !f.fundarhlekkur && f.stadsetning && window.mapLink ? mapLink(f.stadsetning) : E(hvar);
      const fg = f.fundargerd ? `<a class="uln" href="${E(f.fundargerd)}" target="_blank" rel="noopener"><span>${E(f.fundargerd.split("/").pop() || "Fundargerð")}</span><span class="m">Opna →</span></a>` : `<p class="usub" style="margin:4px 0 0">Engin fundargerð enn.</p>`;
      return dHead("Fundur · " + wh, f.name || "Fundur", sub, acts) + `<div class="uvb">${kp3([["Hvenær", (hhmm(f.date) || "–") + (t2 ? "–" + t2 : "")], ["Hvar", hvarH], ["Þátttakendur", (f.attendees || []).length || "–"]])}`
        + (window.fbRespHTML ? fbRespHTML(f) : "") + (window.fbAttHTML ? fbAttHTML(f) : "")
        + (f.lysing ? `<div class="ush2"><span>Dagskrá</span></div><p style="margin:4px 0 0;white-space:pre-wrap;font-size:14px">${E(f.lysing)}</p>` : "")
        + `<div class="ush2"><span>Fundargerð</span></div>${fg}`
        + (f.fundarhlekkur ? `<div class="ush2"><span>Fundarhlekkur</span></div><a class="uln" href="${E(f.fundarhlekkur)}" target="_blank" rel="noopener"><span>Tengjast fundi</span><span class="m">→</span></a>` : "")
        + (MCP ? `<div class="ubot">${!f.fundargerd && window.MS && MS.on() ? `<button type="button" class="btn primary" data-act="msfg:${E(f.id)}">Skrifa fundargerð</button>` : ""}<button type="button" class="btn" data-act="ics:${E(f.id)}">Senda boð</button><button type="button" class="btn" data-act="fundtime:${E(f.id)}">Skrá tíma</button></div>` : "") + `</div>`;
    },
    time(id) {
      const e = faerslur().find(x => String(x.id) === String(id)); if (!e) return null;
      const p = findProj(e.verkefniId), nm = STARFS().find(x => x.sk === e.starfsmadur)?.nafn || e.starfsmadur || "";
      const a = mondayOf(d(e.date) || today), z = new Date(a); z.setDate(z.getDate() + 7);
      const wk = faerslur().filter(x => (x.starfsmadur || "") === (e.starfsmadur || "") && d(x.date) >= a && d(x.date) < z).reduce((s, x) => s + (+x.timar || 0), 0);
      const wkNo = (() => { const t = new Date(Date.UTC(a.getFullYear(), a.getMonth(), a.getDate() + 3)); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 4)); return 1 + Math.round(((t - y) / 864e5 - 3 + ((y.getUTCDay() + 6) % 7)) / 7); })();
      const acts = MCP ? `<button type="button" class="btn" data-act="u1tcp:${E(e.id)}">Afrita</button><button type="button" class="btn" data-act="del:time:${E(e.id)}">Eyða</button>` + more2([["✎ Breyta", "edit:time:" + e.id]]) : "";
      const sv = p ? svidOf(p) : ["Innra"], subs = p?.undirverk || [];
      const sel = MCP && p ? `<select class="usel" onchange="doAct('u1tsub:${E(e.id)}:'+this.value)" aria-label="Undirverk"><option value="">Ekkert undirverk</option>${subs.map(u => `<option value="${E(u.id)}"${u.id === e.undirverkId ? " selected" : ""}>${E(u.heiti || u.nr)}</option>`).join("")}</select>` : E(subs.find(u => u.id === e.undirverkId)?.heiti || "–");
      const rkOn = window.timiRukka ? timiRukka(e) : !e.ekkiRk, fast = p && window.innheimtaOf && innheimtaOf(p) !== "timar";
      const rk = e.reikningur ? `<span class="m">á reikningi</span>` : MCP && p ? `<label class="usw" title="${fast ? "Verkefnið er á föstu verði – kveiktu til að rukka þetta sem aukavinnu" : "Slökktu ef þessi tími á ekki að fara á reikning"}"><input type="checkbox"${rkOn ? " checked" : ""} onchange="doAct('u1trk:${E(e.id)}:'+(this.checked?1:0))"><i></i></label>${fast ? ` <small class="m">${rkOn ? "aukavinna" : "fast verð – ekki rukkað sérstaklega"}</small>` : ""}` : (rkOn ? "Já" : "Nei");
      return dHead("Tímafærsla · " + u1D.dIS(e.date), (e.lysing || "Tími").replace(/^Innra – /, ""), [p ? E(p.nr + " " + (p.stutt || "")) : "Innra", E(nm)].join(" · "), acts)
        + `<div class="uvb">${kp3([["Tími", e.fra ? E(e.fra + (e.til ? "–" + e.til : "")) : "–"], ["Klst.", H(e.timar)], ["Vika " + wkNo, H(wk) + " af " + H(goal())]])}`
        + `<div class="ukv"><span>Svið <small>· af verkefninu</small></span><span>${E(sv.map(x => x === "Innra" ? x : (window.svidHeiti ? svidHeiti(x) : x)).join(", "))}</span></div>`
        + (p ? `<div class="ukv"><span>Undirverk</span><span>${sel}</span></div><div class="ukv"><span>Reikningsfært <small>· ef verkefnið er á tímagjaldi</small></span><span>${rk}</span></div>` : "")
        + `<div class="ush2"><span>Lýsing</span></div><p style="margin:4px 0 0;font-size:14px">${E(e.lysing || "")}</p></div>`;
    },
    reikn(id) {
      const R = (S?.reikningar || []).find(x => String(x.id) === String(id)); if (!R) return null;
      const p = findProj(R.verkefniId), drog = !R.bokhaldNr, n = daysTo(R.gjalddagi), og = R.stada === "Ógilt";
      const sup = (drog ? "Reikningsdrög " : "Reikningur ") + String(R.nr) + (og ? " · ógilt" : "");
      const sub = [p ? E(p.nr) : "", R.dags ? "dags. " + E(String(R.dags).split("-").reverse().join(".")) : "", R.gjalddagi ? "gjalddagi " + E(String(R.gjalddagi).split("-").reverse().join(".")) : ""].filter(Boolean).join(" · ");
      const stSel = MCP && !og && window.can && can("fjarmal") ? `<label class="ustsel">Staða<select onchange="this.value!=='${R.stada === "Greitt" ? "Greitt" : "Ógreitt"}'&&doAct('rkpaid:${E(R.id)}')"><option${R.stada !== "Greitt" ? " selected" : ""}>Ógreitt</option><option${R.stada === "Greitt" ? " selected" : ""}>Greitt</option></select></label>` : "";
      const acts = `<button type="button" class="btn" data-act="rkpdf:${E(R.id)}">PDF</button>${stSel}` + more2([["Vista PDF…", "u1rksv:" + R.id], ["Forskoða PDF", "rkpv:" + R.id], ["Prenta", "rkprint:" + R.id], ["Excel", "rkxlsx:" + R.id]]);
      const rows = (R.linur || []).map(l => `<div class="utbr r4"><span>${E(l.lysing || "")}</span><span>${E(String(l.magn ?? ""))}${l.eining && l.eining !== "stk." ? " " + E(l.eining) : ""}</span><span>${(+l.verd || 0).toLocaleString("de-DE")} kr.</span><span>${Math.round((+l.magn || 0) * (+l.verd || 0)).toLocaleString("de-DE")} kr.</span></div>`).join("");
      return dHead(sup, R.kaupandi?.name || "", sub, acts) + `<div class="uvb">${kp3([["Samtals með VSK", kr(R.tot)], ["Gjalddagi", R.stada === "Greitt" ? "greitt " + E(u1D.dIS(R.greitt)) : R.gjalddagi ? E(dateIS(d(R.gjalddagi))) + (n < 0 ? " · seint" : "") : "–"], ["Staða", E(R.stada || "")]])}`
        + `<div class="utb"><div class="utbr r4 h"><span>Lína</span><span>Magn</span><span>Verð</span><span>Upphæð</span></div>${rows}</div><div class="utbt"><span>Samtals án VSK</span><b>${kr(R.net)}</b></div><div class="utbt"><span>VSK ${R.vskP || 24}%</span><b>${kr(R.vsk)}</b></div>`
        + (MCP && !og ? `<div class="ubot">${drog && window.can && can("fjarmal") ? `<button type="button" class="btn primary" data-act="rkbok:${E(R.id)}">Skrá í bókhald</button>` : ""}${window.MS && MS.on() ? `<button type="button" class="btn" data-act="rksend:${E(R.id)}">✉ Senda</button>` : ""}${window.can && can("fjarmal") ? `<button type="button" class="btn" data-act="rkogilda:${E(R.id)}">Ógilda</button>` : ""}</div>` : "") + `</div>`;
    }
  };
  // Verkefni › Undirverk (tafla með gátreitum) og Samskipti (tímalína funda og pósta)
  st.uf = "opin"; st.usel = null; st.cf = "";
  window.u1VerkTab = function (p, dt) {
    if (dt === "undir") {
      const subs = p.undirverk || [], op = subs.filter(u => u.stada !== "Done"), lo = subs.filter(u => u.stada === "Done"), xs = st.uf === "lokid" ? lo : op;
      const who = u => { const c = {}; faerslur().filter(e => e.undirverkId === u.id).forEach(e => { c[e.starfsmadur] = (c[e.starfsmadur] || 0) + (+e.timar || 0); }); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || ""; };
      const sel = xs.find(u => u.id === st.usel);
      return `<div class="ush2" style="margin-top:14px"><span>${chips([["opin", "Opin · " + op.length], ["lokid", "Lokið · " + lo.length]], st.uf, "u1uf")}</span>${MCP ? `<button type="button" class="btn" data-act="add:undir">+ Undirverk</button>` : ""}</div>`
        + (xs.map(u => `<div class="usrow${u.stada === "Done" ? " done" : ""}${sel === u ? " on" : ""}"><label class="ucb" onclick="event.stopPropagation()"><input type="checkbox"${u.stada === "Done" ? " checked" : ""}${MCP ? "" : " disabled"} onchange="doAct('status:sub:${E(u.id)}:'+(this.checked?'Done':'In progress'),this)"><i></i></label>`
          + `<span class="t" data-act="u1us:${E(u.id)}" role="button" tabindex="0">${E((u.heiti || u.nr || "").replace(/^\S+-\d+-\d+\s+/, ""))}</span><span class="m">${E(who(u))}</span><span class="m">${u.skiladagur ? E(u1D.dIS(u.skiladagur)) : ""}</span><span class="m">${u.timar ? H(u.timar) + " klst." : ""}</span>${pill(STL[u.stada] || u.stada, u.stada === "In progress")}</div>`).join("") || `<div class="usub" style="padding:10px 0">${st.uf === "lokid" ? "Engin lokin undirverk." : "Engin opin undirverk."}</div>`)
        + (sel ? (() => { const tl = faerslur().filter(e => e.undirverkId === sel.id).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6);
            return `<div class="card ucard usdet"><div class="uhch"><h3>${E((sel.heiti || "").replace(/^\S+-\d+-\d+\s+/, ""))}</h3>${MCP && !klukka() ? `<button type="button" class="btn primary" data-act="kstart:${E(p.id)}">▶ Byrja klukku</button>` : ""}</div>${sel.lysing ? `<p class="usub" style="margin:0 0 6px">${E(sel.lysing)}</p>` : ""}${tl.map(e => `<a class="uln" ${tapAttr("time", e.id)}><span>${E(u1D.dIS(e.date))} · ${H(e.timar)} klst.<small>${e.lysing ? " · " + E(e.lysing) : ""}</small></span><span class="m">${E(e.starfsmadur || "")}</span></a>`).join("") || `<div class="usub">Engir tímar skráðir á undirverkið.</div>`}<div style="margin-top:8px"><a class="plink" ${tapAttr("sub", sel.id)}>Opna undirverk →</a></div></div>`; })() : "");
    }
    if (dt === "fundir") {
      const fs = (S?.fundir || []).filter(f => f.projectId === p.id), th = (S?.thraedir || []).filter(t => t.verkefniId === p.id), po = (S?.postar || []).filter(t => t.verkefniId === p.id), ti = isoD(today);
      const items = [...fs.map(f => ({ k: "f", w: String(f.date), o: f })), ...th.map(t => ({ k: "p", w: String(t.tengt || ""), o: t })), ...po.map(t => ({ k: "e", w: String(t.dags || ""), o: t }))].filter(x => !st.cf || (st.cf === "f" ? x.k === "f" : x.k !== "f"));
      const fut = items.filter(x => x.k === "f" && x.w.slice(0, 10) >= ti).sort((a, b) => a.w.localeCompare(b.w)), past = items.filter(x => !(x.k === "f" && x.w.slice(0, 10) >= ti)).sort((a, b) => b.w.localeCompare(a.w));
      const row = x => { const f = x.o, wd = x.w.slice(0, 10);
        if (x.k === "f") return `<a class="utl" ${tapAttr("fund", f.id)}><i class="ic">◷</i><span><b>${E(f.name || "Fundur")}</b><small>${E([f.stadsetning || (f.fundarhlekkur ? "Fjarfundur" : ""), (f.attendees || []).length ? f.attendees.length + " þátttakendur" : "", f.fundargerd ? "fundargerð" : ""].filter(Boolean).join(" · "))}</small></span><span class="utlr"><small>${E(u1D.dIS(wd))}${hhmm(f.date) ? " · " + hhmm(f.date) : ""}</small>${pill("Fundur")}</span></a>`;
        if (x.k === "p") return `<a class="utl" href="#" data-act="tab:postur"><i class="ic">✉</i><span><b>${E(f.efni || "Póstþráður")}</b><small>tengt ${E(f.af || "")}</small></span><span class="utlr"><small>${E(u1D.dIS(wd))}</small>${pill("Póstur")}</span></a>`;
        return `<div class="utl"><i class="ic">✉</i><span><b>${E(f.efni || "")}</b><small>${E(f.fra || "")} · eldri póstur</small></span><span class="utlr"><small>${E(u1D.dIS(wd))}</small>${pill("Póstur")}</span></div>`; };
      const nF = fs.length, nP = th.length + po.length;
      return `<div class="ush2" style="margin-top:14px"><span>${chips([["", "Allt · " + (nF + nP)], ["f", "Fundir · " + nF], ["p", "Póstar · " + nP]], st.cf, "u1cf")}</span>${MCP ? `<span style="display:flex;gap:8px"><button type="button" class="btn" data-act="add:fund">+ Fundur</button>${ON("postur") ? `<button type="button" class="btn" data-act="pofind:${E(p.id)}">Tengja póst</button>` : ""}</span>` : ""}</div>`
        + (fut.length ? `<div class="ush2"><span>Framundan</span></div>${fut.map(row).join("")}` : "") + (past.length ? `<div class="ush2"><span>Liðið</span></div>${past.map(row).join("")}` : "")
        + (!fut.length && !past.length ? `<div class="usub" style="padding:10px 0">Engir fundir eða póstar tengdir verkefninu.</div>` : "");
    }
    return null;
  };
  /* ---------- Rukka viðskiptavin fyrir skemmd (2.35.0): tillaga að upphæð sem má breyta; stofnar pöntun á viðskiptavininn ---------- */
  function rukka(id, did) {
    const api = window.salaAPI, v = VRget(id), x = (v?.skemmdir || []).find(y => String(y.id) === String(did)); if (!v || !x) return;
    const refNr = String(x.ref || "").split(/\s/)[0], doc = refNr ? [...api.TB(), ...api.PN()].find(T => T.nr === refNr) : null;
    const base = +v.innkaupsverd || Math.round((+v.leiguverd || +v.soluverd || 0) * 10), pc = base ? 20 : 0, sug = base ? Math.round(base * pc / 100 / 500) * 500 : 0;
    const cls = S?.vidskiptavinir || [], cur = doc?.vskId || "";
    sheet.innerHTML = `<h3 id="sheet-h">Rukka viðskiptavin</h3><form id="rkf" novalidate>
      <p class="hint" style="margin:0 0 8px"><b>${E(x.eintak || v.nr || "")}</b> · ${E(x.lysing || "")}${x.ref ? " · skráð við skil " + E(x.ref) : ""}</p>
      <label>Viðskiptavinur<select id="rk-vsk"><option value="">${E(doc?.tengilidur || doc?.vidskiptavinur || "Velja…")}</option>${cls.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), "is")).map(c => `<option value="${E(c.id)}"${c.id === cur ? " selected" : ""}>${E(c.name)}</option>`).join("")}</select></label>
      <label>Skýring á reikningi<input id="rk-heiti" value="${E("Skemmdagjald – " + (x.eintak || v.nr || "") + " " + (v.heiti || "") + (x.lysing ? ": " + x.lysing : ""))}"></label>
      <div class="two"><label>Grunnur (innkaupsverð)<input id="rk-base" type="number" min="0" value="${base || ""}" inputmode="numeric"></label><label>Upphæð án VSK<input id="rk-upp" type="number" min="0" step="100" value="${sug || ""}" inputmode="numeric"></label></div>
      <div class="chips" style="margin:-2px 0 8px">${[10, 20, 30, 50, 100].map(n => `<button type="button" class="chipbtn" onclick="const b=+document.getElementById('rk-base').value||0;document.getElementById('rk-upp').value=Math.round(b*${n}/100/100)*100">${n} %</button>`).join("")}</div>
      <p class="hint" style="margin:0 0 8px">Tillaga: ${pc} % af ${v.innkaupsverd ? "innkaupsverði" : "áætluðu verðmæti"}. Breyttu upphæðinni eftir viðgerðarkostnaði eða samkomulagi.</p>
      <div id="f-msg"></div><div class="actions"><button type="button" class="btn" onclick="closeSheet()">Hætta við</button><button class="btn primary">Stofna pöntun til innheimtu</button></div></form>`;
    sheetwrap.hidden = false;
    document.getElementById("rkf").onsubmit = async e => { e.preventDefault();
      const upp = +document.getElementById("rk-upp").value || 0; if (!(upp > 0)) { document.getElementById("f-msg").innerHTML = `<div class="msg err">Skráðu upphæð.</div>`; return; }
      const cid = document.getElementById("rk-vsk").value, c = cls.find(y => y.id === cid), heiti = document.getElementById("rk-heiti").value.trim() || "Skemmdagjald";
      const pid = (crypto.randomUUID?.() || String(Date.now())).replace(/-/g, ""), n = +(S?.stillingar?.tilbod?.nastaNrP) || 1001, nr = "P-" + n, iso = isoD(today);
      const P = { id: pid, pontun: true, nr, deild: "blandad", heiti: "Skemmdagjald " + (x.eintak || v.nr || ""), vskId: c?.id || doc?.vskId || null, vidskiptavinur: c?.name || doc?.vidskiptavinur || null, tengilidur: doc?.tengilidur || null, simi: doc?.simi || null, netfang: c?.netfang || doc?.netfang || null,
        uppruni: "stadur", ytriNr: null, stadsetning: null, fra: iso, til: iso, dags: iso, stada: "Staðfest", afsl: 0, athugasemd: x.ref ? "Vegna skemmdar við skil " + x.ref : null, verkefniId: doc?.verkefniId || null, tilbodId: null,
        linur: [{ id: pid + "1", v: null, heiti, teg: "vinna", magn: 1, ein: "stk.", verd: upp }] };
      await saveSnapshot(s0 => { (s0.pantanir = s0.pantanir || []).push(P); s0.stillingar = s0.stillingar || {}; s0.stillingar.tilbod = { ...(s0.stillingar.tilbod || {}), nastaNrP: n + 1 };
        const q = (s0.vorur || []).find(y => String(y.id) === String(id)), d0 = (q?.skemmdir || []).find(y => String(y.id) === String(did)); if (d0) d0.rukkad = { upphaed: upp, pontun: nr, dags: iso }; });
      closeSheet(); toast?.("Pöntun " + nr + " stofnuð til innheimtu"); tab = "pantanir"; DETAIL = "tb:" + pid; render(); };
  }

  /* ---------- Lager og innkaup (söluvörur) – reitir á vöruskjalinu: hreyfingar[], innkaup[], lagmark ---------- */
  window.u1VaraLager = function (v) {
    const hs = (v.hreyfingar || []).slice().sort((a, b) => String(b.dags).localeCompare(String(a.dags)));
    const tal = st.tal === v.id ? `<div class="card udmgf"><label>Talið á lager<input id="u1tN" type="number" min="0" value="${+v.fjoldi || 0}"></label><div style="display:flex;gap:8px"><button type="button" class="btn primary" data-act="u1talS:${E(v.id)}">Vista talningu</button><button type="button" class="btn" data-act="u1tal:">Hætta við</button></div></div>` : "";
    return `<div class="ush" style="display:flex;justify-content:space-between;align-items:center">Lagerhreyfingar<button type="button" class="btn" data-act="u1tal:${E(v.id)}">Talning</button></div>${tal}<div class="ueh h4"><span>Dags.</span><span>Hreyfing</span><span>Magn</span><span>Staða</span></div>`
      + (hs.map(h => `<div class="uer2 h4"><span class="m">${E((h.dags || "").slice(0, 10).split("-").reverse().join("."))}</span><span>${E(h.teg)}${h.ref ? `<span class="m"> · ${E(h.ref)}</span>` : ""}</span><span class="${h.magn > 0 ? "blue" : ""}">${h.magn > 0 ? "+" : "−"}${Math.abs(h.magn)}</span><span class="m">${h.stada ?? ""}</span></div>`).join("") || `<div class="uempty">Engar hreyfingar skráðar enn. Móttaka innkaupa og talning skrást hér.</div>`);
  };
  window.u1VaraInnkaup = function (v) {
    const xs = (v.innkaup || []).slice().sort((a, b) => (a.stada === "Pantað" ? 0 : 1) - (b.stada === "Pantað" ? 0 : 1) || String(b.dags).localeCompare(String(a.dags)));
    const form = st.ink === v.id ? `<div class="card udmgf"><label>Birgir<input id="u1iB" type="text" value="${E(v.birgir || "")}"></label><label>Magn<input id="u1iM" type="number" min="1" value="${Math.max(1, (+v.lagmark || 4) * 2 - (+v.fjoldi || 0))}"></label><label>Væntanlegt<input id="u1iV" type="date"></label><div style="display:flex;gap:8px"><button type="button" class="btn primary" data-act="u1inkS:${E(v.id)}">Panta</button><button type="button" class="btn" data-act="u1ink:">Hætta við</button></div></div>` : "";
    return `<div class="ush" style="display:flex;justify-content:space-between;align-items:center">Innkaup<button type="button" class="btn primary" data-act="u1ink:${E(v.id)}">Panta inn</button></div>${form}`
      + (xs.map(x => `<div class="uer2 i4"><span class="m">${E(x.nr || "")}</span><span>${E(x.birgir || "")} · ${x.magn} stk.<span class="m"> · ${x.stada === "Pantað" ? "væntanlegt " + E((x.vaent || "").split("-").reverse().join(".")) : "móttekið " + E((x.mott || "").slice(0, 10).split("-").reverse().join("."))}</span></span>${pill(x.stada, x.stada === "Pantað")}${x.stada === "Pantað" ? `<button type="button" class="btn" data-act="u1inkM:${E(v.id)}:${E(x.id)}">Móttaka</button>` : "<span></span>"}</div>`).join("") || `<div class="uempty">Engin innkaup skráð.</div>`);
  };

  /* ---------- Svið (Stillingar › Svið): heiti sviðanna; Leiga og Sala fylgja einingunum ---------- */
  window.svidHeiti = k => CFG().svid?.[k]?.heiti || k;
  // Svið sem fyrirtækið notar (2.35.0): Leiga/Sala aðeins ef einingin er virk; hvert svið má slökkva á í Stillingar › Svið
  window.svidOn = k => CFG().svid?.[k]?.off !== true && (k === "Leiga" ? ON("leiga") : k === "Sala" ? ON("sala") : true);
  { const SVTAB = { lverk: "Leiga", sverk: "Sala", tverk: "Þjónusta", tbl: "Leiga", tbs: "Sala", tbt: "Þjónusta", pnl: "Leiga", pns: "Sala", pnt: "Þjónusta", vskl: "Leiga", vsks: "Sala", vskt: "Þjónusta", lvorur: "Leiga", svorur: "Sala", vvinna: "Þjónusta" };
    const t0 = window.tabOn; const hasS = () => { try { return typeof S !== "undefined" && !!S; } catch (e) { return false; } };
    window.tabOn = t => (!t0 || t0(t)) && (!SVTAB[t] || !hasS() || svidOn(SVTAB[t]));
    const e0 = window.einSig; window.einSig = () => (e0 ? e0() : "") + "|" + (hasS() ? ["Leiga", "Sala", "Þjónusta"].map(k => svidOn(k) ? 1 : 0).join("") : "");
    try { _einSig = null; applyEin(); } catch (e) {} }
  if (typeof STPAGES !== "undefined") STPAGES.svid = { l: "Svið", d: "Leiga, Sala og Þjónusta – flokkun verkefna og tilboða", s: [], adm: 1, fn: () => {
    const row = (k, desc, on, ein) => `<div class="uvs sv"><b><label class="usw" title="${svidOn(k) ? "Slökkva á sviðinu" : "Kveikja á sviðinu"}" style="vertical-align:middle;margin-right:8px"><input type="checkbox"${svidOn(k) ? " checked" : ""}${on ? "" : " disabled"} onchange="doAct('u1svo:${k}:'+(this.checked?1:0))"><i></i></label>${E(k)}</b><span class="m">${E(desc)}</span><input type="text" value="${E(CFG().svid?.[k]?.heiti || "")}" placeholder="${E(k)}" aria-label="Heiti sviðsins ${E(k)}" onchange="doAct('u1svh:${k}:'+this.value)"><span>${ein ? `<a href="#" data-act="stsub:einingar">${!on ? "Eining óvirk" : svidOn(k) ? "Virkt" : "Falið"} ›</a>` : svidOn(k) ? "Virkt" : "Falið"}</span></div>`;
    return `<div class="card ucard"><div class="unote" style="margin-top:0">Verkefni og tilboð flokkast sjálfkrafa á svið eftir línum tilboða og deild verkefnis. Hvert fyrirtæki getur endurnefnt sviðin, t.d. Þjónusta → Tækniþjónusta, og slökkt á sviðum sem það notar ekki – þá hverfa flipar sviðsins úr Verkefnum, Viðskiptavinum, Pöntunum, Tilboðum og Vörulista. Gögnin haldast.</div><div class="uvs sv h"><span>Svið</span><span>Til hvers</span><span>Heiti hjá fyrirtækinu</span><span>Virkt</span></div>`
      + row("Leiga", "Útleiga á búnaði", ON("leiga"), 1) + row("Sala", "Sala á vörum af lager", ON("sala"), 1) + row("Þjónusta", "Vinna, tæknifólk, uppsetning", true, 0) + `</div>`; } };

  /* ---------- Verkefni › Yfirlit: lykiltölur, opin undirverk og hlutar eftir sviði (Leiga: búnaður og tæknifólk; Sala: vörur) ---------- */
  window.u1VerkYfir = function (id, unb) {
    const p = findProj(id); if (!p) return "";
    const api = window.salaAPI, sv = svidOf(p), tbs = api ? api.TB().filter(T => T.verkefniId === p.id && !T.pontun) : [];
    const sam = tbs.filter(T => T.stada === "Samþykkt"), sumT = xs => xs.reduce((a, T) => a + (api.netOf(T) || 0), 0);
    const samV = sam.length ? sumT(sam) : (+p.tilbod || 0), src = sam.length ? sam : tbs.filter(T => T.stada !== "Hafnað");
    const lines = teg => src.flatMap(T => (T.linur || []).filter(l => l.teg === teg).map(l => ({ l, T })));
    const kp = (l, v) => `<div class="ukp"><small>${E(l)}</small><b>${v}</b></div>`;
    const rng = T => { const a = d(T.fra), b = d(T.til); if (!a) return ""; return a.getDate() + "." + (b && +b !== +a ? "–" + b.getDate() + "." : "") + " " + MNs[(b || a).getMonth()]; };
    const row = (t, r) => `<div class="uln"><span>${t}</span>${r}</div>`;
    const lg = sv.includes("Leiga") ? lines("leiga") : [], vn = lines("vinna"), sl = sv.includes("Sala") ? lines("sala") : [];
    const vnH = vn.filter(x => /klst/.test(x.l.ein || "")).reduce((a, x) => a + (+x.l.magn || 0), 0);
    const ih = window.innheimtaOf ? innheimtaOf(p) : "timar", aetl = ih === "timar" && (sam.length || +p.tilbod);
    const tbK = () => aetl ? kp("Áætlun skv. tilboði án vsk", kr(sam.length ? samV : +p.tilbod)) : sam.length ? kp("Samþykkt tilboð án vsk", kr(samV)) : src.length ? kp("Tilboð · " + src[0].stada.toLowerCase() + " · án vsk", kr(sumT(src))) : +p.tilbod ? kp("Tilboðsupphæð (skráð á verkefni)", kr(+p.tilbod)) : kp("Samþykkt tilboð", "–");
    const more = (xs, f) => xs.slice(0, 6).map(f).join("") + (xs.length > 6 ? `<a class="uln" href="#" data-act="dtab:tilbod"><span class="m">+ ${xs.length - 6} fleiri línur á tilboði</span><span class="m">→</span></a>` : "");
    let k;
    if (sv.includes("Leiga")) k = [tbK(), kp("Búnaður", lg.length ? lg.reduce((a, x) => a + (+x.l.magn || 0), 0) + " tæki " + (sam.length ? "frátekin" : "á tilboði") : "–"), kp("Tæknifólk", vn.length ? vn.length + " · " + H(vnH) + " klst." : "–")];
    else if (sv.includes("Sala")) k = [tbK(), kp("Vörur", sl.length ? sl.reduce((a, x) => a + (+x.l.magn || 0), 0) + " stk." : "–"), kp("Tímar", H(p.timar || 0) + (p.aklst ? " af " + H(p.aklst) : "") + " klst.")];
    else k = [kp("Tímar", H(p.timar || 0) + (p.aklst ? " af " + H(p.aklst) : "") + " klst."), ih === "timar" ? kp("Óreikningsfært", unb || "–") : kp("Innheimta", ih === "tilbod" ? "Fast verð" : "Ekki rukkað"), tbK()];
    let h = `<div class="ukps">${k.join("")}</div>`;
    // Tímavinna á móti áætlun (2.42.0): viðvörun þegar unnir tímar nálgast eða fara fram úr áætluðum tímum
    if (ih === "timar" && +p.aklst > 0 && (+p.timar || 0) >= 0.9 * p.aklst) { const pc = Math.round((+p.timar || 0) / p.aklst * 100), yfir = pc > 100;
      h = `<div class="uwarn${yfir ? "" : " info"}"><i></i><span><b>${yfir ? "Komið fram úr áætlun" : "Nálgast áætlun"}:</b> ${H(+p.timar || 0)} af ${H(p.aklst)} klst. (${pc} %)${yfir ? " – ræddu við viðskiptavininn áður en meira er unnið" : ""}</span></div>` + h; }
    if (lg.length) h += `<div class="ush2"><span>Búnaður á verkinu</span><a href="#" data-act="tab:lvorur">Framboð →</a></div>` + more(lg, ({ l, T }) => {
      const v = api.VR().find(x => String(x.id) === String(l.v)); let pl = pill("–");
      if (v && v.tegund !== "pakki") { const cap = (+v.fjoldi || 0) - (window.u1Ovirk ? u1Ovirk(v) : 0), oth = api.upptekid(v.id, T.fra, T.til || T.fra, T.id).max || 0, short = (+l.magn || 0) - (cap - oth); pl = short > 0 ? pill(short + " vantar", true) : pill("laust"); }
      return row(`${E(l.heiti || v?.heiti || "")} × ${E(String(l.magn))}${l.ein && l.ein !== "stk." ? " " + E(l.ein) : ""}`, pl); });
    if (sl.length) h += `<div class="ush2"><span>Vörur á verkinu</span><a href="#" data-act="tab:svorur">Lager →</a></div>` + more(sl, ({ l }) => { const v = api.VR().find(x => String(x.id) === String(l.v)), lag = +v?.fjoldi || 0;
      return row(`${E(l.heiti || v?.heiti || "")} × ${E(String(l.magn))}${l.ein && l.ein !== "stk." ? " " + E(l.ein) : ""}`, lag >= (+l.magn || 0) ? pill("á lager") : pill(((+l.magn || 0) - lag) + " vantar", true)); });
    if (vn.length && (sv.includes("Leiga") || sv.includes("Sala"))) h += `<div class="ush2"><span>${sv.includes("Leiga") ? "Tæknifólk" : "Vinna"}</span></div>` + more(vn, ({ l, T }) => row(`${E(l.heiti || "")}${rng(T) ? " · " + rng(T) : ""} · ${H(+l.magn || 0)} ${E(l.ein || "")}`, pill(T.stada === "Samþykkt" ? "staðfest" : T.stada.toLowerCase(), T.stada === "Samþykkt")));
    const ou = (p.undirverk || []).filter(u => u.stada !== "Done");
    h += `<div class="ush2"><span>Opin undirverk${ou.length ? " · " + ou.length : ""}</span><a href="#" data-act="dtab:undir">Öll undirverk →</a></div>` + (ou.map(u => `<a class="uln" ${tapAttr("sub", u.id)}><span>${E(u.heiti || u.nr || "")}<small>${u.skiladagur ? " · skil " + E(fmtD(u.skiladagur)) : ""}${u.timar ? " · " + H(u.timar) + " klst." : ""}</small></span>${pill(STL[u.stada] || u.stada, u.stada === "In progress")}</a>`).join("") || `<div class="usub" style="padding:6px 0">Engin opin undirverk.</div>`);
    return `<div class="uvy">${h}</div>`;
  };

  /* ---------- Dagatal › Fundir (dálkalisti) ---------- */
  U.fundir = function () {
    const all = (S?.fundir || []).slice(), now = isoD(today), f = st.vf.fundir || "fram";
    const fram = all.filter(m => String(m.date).slice(0, 10) >= now), lidnir = all.filter(m => String(m.date).slice(0, 10) < now), endur = all.filter(m => m.seria);
    const xs = SQ() ? all.sort((a, b) => String(b.date).localeCompare(String(a.date))) : (f === "fram" ? fram.sort((a, b) => String(a.date).localeCompare(String(b.date))) : f === "lidnir" ? lidnir.sort((a, b) => String(b.date).localeCompare(String(a.date))) : endur);
    const top = lhead("Dagatal", "Fundir", nbtn("Fundur")) + `<div class="ulbar">${chips([["fram", "Framundan · " + fram.length], ["lidnir", "Liðnir · " + lidnir.length], ["endur", "Endurteknir" + (endur.length ? " · " + endur.length : "")]], f, "u1vf:fundir")}</div>`;
    if (WIDE()) return top + wl("110px 64px minmax(0,1.4fr) minmax(0,1.2fr) minmax(0,1fr) 84px 104px", wcols(["Dags.", "Kl.", "Fundur", "Verkefni", "Staðsetning", "Fundargerð", "Staða"])
      + (xs.map(m => { const p = m.projectId ? findProj(m.projectId) : null, n = daysTo(m.date);
        return wrow(tapAttr("fund", m.id), [wc(E(fmtD(m.date))), wc(E(hhmm(m.date) || "")), wc(E(m.name || "Fundur"), "t"), wc(E(p ? p.nr + " " + (p.stutt || "") : "")), wc(E(m.stadsetning || (m.fundarhlekkur ? "Fjarfundur" : ""))), wc(m.fundargerd ? "Já" : ""), wc(pill(n === 0 ? "Í dag" : n > 0 ? "Framundan" : "Liðinn", n === 0), "r")]); }).join("") || `<div class="uempty">Engir fundir.</div>`));
    return top
      + `<div class="ucols uf5"><span>Dags.</span><span>Fundur</span><span>Verkefni</span><span>Kl.</span><span class="r"></span></div>`
      + (xs.map(m => { const p = m.projectId ? findProj(m.projectId) : null, n = daysTo(m.date);
        return `<div class="urow uf5" ${tapAttr("fund", m.id)}><span class="m">${E(fmtD(m.date))}</span><span class="t">${E(m.name || "Fundur")}</span><span class="m">${E(p?.nr || m.stadsetning || "")}</span><span class="m">${E(hhmm(m.date) || "")}</span><span class="r">${pill(n === 0 ? "Í dag" : n > 0 ? "Framundan" : "Liðinn", n === 0)}</span></div>`; }).join("") || `<div class="uempty">Engir fundir.</div>`);
  };
  /* ---------- Reikningar (dálkalisti: óreikningsfært + reikningar) ---------- */
  U.trk = function () {
    const f = st.vf.trk || "allt", R = (S?.reikningar || []).filter(r => r.stada !== "Ógilt"), RO = (S?.reikningar || []).filter(r => r.stada === "Ógilt"); // ógiltir (2.66.1): eigin sía, svo sjáist hvaðan tímarnir komu
    const ub = window.rkUnbilledKr ? verkefni().map(p => { const u = rkUnbilled(p.id); return { p, h: sumT(u.es), kr: rkUnbilledKr(p.id) }; }).filter(x => x.h >= 0.5 || x.kr > 0).sort((a, b) => b.kr - a.kr) : [];
    // 2.66.2: tímar og kostnaður án verkefnis (t.d. af ógiltum reikningi) – annars sáust þeir hvergi
    if (window.rkUnbilledKr) { const u0 = rkUnbilled(null), x0 = { p: null, h: sumT(u0.es), kr: rkUnbilledKr(null) }; if (x0.h >= 0.5 || x0.kr > 0) ub.push(x0); }
    const tapU = x => x.p ? tapAttr("verk", x.p.id) : 'data-act="rknew:_" role="button" tabindex="0" title="Gera reikning úr tímum án verkefnis"';
    const og = R.filter(r => r.stada !== "Greitt"), gr = R.filter(r => r.stada === "Greitt");
    const tot = ub.reduce((a, x) => a + x.kr, 0) + og.reduce((a, r) => a + (+r.tot || 0), 0), mkr = n => (Math.round(n / 1e5) / 10).toLocaleString("de-DE") + " m.kr.";
    const showU = SQ() || f === "allt" || f === "oreikn", rs = SQ() ? R.concat(RO) : f === "ogr" ? og : f === "gr" ? gr : f === "ogilt" ? RO.slice() : f === "allt" ? og : [];
    const rowU = x => `<div class="urow uf5" ${tapU(x)}><span class="m">Óreikn.</span><span class="t">${x.p ? `${E(x.p.nr)} ${E(x.p.stutt || "")}` : "Án verkefnis"}</span><span class="m">${H(x.h)} klst.</span><span class="m"></span><span class="r">${E(kr(x.kr))}</span></div>`;
    const rowR = r => { const p = findProj(r.verkefniId || (r.verkefniIds || [])[0]), late = !["Greitt", "Ógilt"].includes(r.stada) && daysTo(r.gjalddagi) < 0;
      return `<div class="urow uf5" ${tapAttr("reikn", r.id)}><span class="m">${E(String(r.nr).padStart(3, "0"))}</span><span class="t">${E(r.kaupandi?.name || "")}${late ? ' <i class="udot" title="Fram yfir gjalddaga"></i>' : ""}</span><span class="m">${E(p?.nr || "")}</span><span class="m">${E(String(r.dags || "").slice(5).split("-").reverse().join("."))}</span><span class="r">${E(kr(r.tot))}</span></div>`; };
    const top = lhead("", "Reikningar", nbtn("Reikningur").replace(/data-act="fabnew[^"]*"/, 'data-act="rknew:"')) + `<div class="ulbar">${chips([["allt", "Óinnheimt · " + mkr(tot)], ["oreikn", "Óreikningsfært · " + ub.length], ["ogr", "Ógreitt · " + og.length], ["gr", "Greitt · " + gr.length], ...(RO.length ? [["ogilt", "Ógilt · " + RO.length]] : [])], f, "u1vf:trk")}</div>`;
    if (WIDE()) { const dI = x => x ? dateIS(d(x)) : "";
      const wU = x => wrow(tapU(x), [wc("Óreikn."), wc(E(x.p?.vidskiptavinur || ""), "t"), wc(x.p ? E(x.p.nr + " " + (x.p.stutt || "")) : "Án verkefnis"), wc(E(H(x.h) + " klst.")), wc(""), wc(pill("Óreikningsfært")), wc(E(kr(x.kr)), "r")]);
      const wR = r => { const p = findProj(r.verkefniId || (r.verkefniIds || [])[0]), late = !["Greitt", "Ógilt"].includes(r.stada) && daysTo(r.gjalddagi) < 0;
        return wrow(tapAttr("reikn", r.id), [wc(E(String(r.nr).padStart(3, "0"))), wc(E(r.kaupandi?.name || "") + (late ? ' <i class="udot" title="Fram yfir gjalddaga"></i>' : ""), "t"), wc(E(p ? p.nr + " " + (p.stutt || "") : "")), wc(E(dI(r.dags))), wc(`<span class="${late ? "red" : ""}">${E(dI(r.gjalddagi))}</span>`), wc(pill(late && r.stada !== "Ógilt" ? "Fram yfir" : r.stada || "", late && r.stada !== "Ógilt")), wc(E(kr(r.tot)), "r")]); };
      return top + wl("80px minmax(0,1.3fr) minmax(0,1.3fr) 110px 110px 120px 120px", wcols(["Nr.", "Kaupandi", "Verkefni", "Dags.", "Gjalddagi", "Staða", "Upphæð"])
        + (showU && ub.length ? (f === "allt" ? grpH("Óreikningsfært") : "") + ub.map(wU).join("") : "")
        + (rs.length ? (f === "allt" ? grpH("Ógreiddir reikningar") : "") + rs.sort((a, b) => b.nr - a.nr).map(wR).join("") : "")
        + (!(showU && ub.length) && !rs.length ? `<div class="uempty">Ekkert hér.</div>` : "")); }
    return top
      + `<div class="ucols uf5"><span>Nr.</span><span>Heiti</span><span>Verk / klst.</span><span>Dags.</span><span class="r">Upphæð</span></div>`
      + (showU && ub.length ? (f === "allt" ? grpH("Óreikningsfært") : "") + ub.map(rowU).join("") : "")
      + (rs.length ? (f === "allt" ? grpH("Ógreiddir reikningar") : "") + rs.sort((a, b) => b.nr - a.nr).map(rowR).join("") : "")
      + (!(showU && ub.length) && !rs.length ? `<div class="uempty">Ekkert hér.</div>` : "");
  };
  /* ---------- Spjall › Samstarfsfólk (listi og spjald hlið við hlið) ---------- */
  const ini = n => String(n || "").split(/\s+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase();
  U.teymi = function () {
    const us = (window.nuUsers ? nuUsers() : []).filter(u => u.virkur !== false), f = st.vf.teymi || "allir";
    const xs = us.filter(u => f === "allir" || u.virkur);
    const sel = xs.find(u => u.email === st.tm) || xs.find(u => u.email !== DB?.email) || xs[0];
    const RL = { admin: "Admin", starfsmadur: "Starfsmaður", bokari: "Bókari" };
    const wk = sk => { const a = mondayOf(today); return faerslur().filter(e => (e.starfsmadur || "") === sk && d(e.date) >= a).reduce((s, e) => s + (+e.timar || 0), 0); };
    const projs = u => verkefni().filter(p => !isDone(p) && (p.starfsmenn || []).some(x => (x.sk || x) === u.sk));
    const list = lhead("Spjall", "Samstarfsfólk") + `<div class="ulbar">${chips([["allir", "Allir · " + us.length], ["virkir", "Virkir"]], f, "u1vf:teymi")}</div>`
      + `<div class="ucols ut4"><span></span><span>Nafn</span><span>Hlutverk</span><span class="r">Síðast inni</span></div>`
      + xs.map(u => `<div class="urow ut4${u === sel ? " on" : ""}" data-act="u1tm:${E(u.email)}" role="button" tabindex="0"><span><span class="mav sm">${E(ini(u.nafn || ""))}</span></span><span class="t">${E(u.nafn || u.email)}${u.email === DB?.email ? '<span class="m"> · þú</span>' : ""}</span><span class="m">${E(RL[u.hlutverk] || u.hlutverk || "")}</span><span class="r m">${E(u.sidast ? fmtD(String(u.sidast).slice(0, 10)) : "")}</span></div>`).join("");
    let det = `<div class="spempty">Veldu manneskju úr listanum</div>`;
    if (sel) { const ps = projs(sel), me = sel.email === DB?.email;
      det = `<div class="udh2"><div class="udl"><div class="spsup">Samstarfsfólk · ${E(RL[sel.hlutverk] || "")}</div><h2 class="ptitle">${E(sel.nafn || "")}</h2><div class="usub">${E(sel.email)}${sel.sidast ? " · síðast inni " + E(fmtD(String(sel.sidast).slice(0, 10))) : ""}</div></div><div class="uact">${me ? "" : `<button type="button" class="btn primary" data-act="spto:${E(sel.email)}">Skilaboð</button><a class="btn" href="https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(sel.email)}" target="_blank" rel="noopener">Teams</a>`}</div></div>`
        + `<div class="uvy"><div class="ukps"><div class="ukp"><small>Verkefni í gangi</small><b>${ps.length}</b></div><div class="ukp"><small>Klst. í þessari viku</small><b>${H(wk(sel.sk))}</b></div><div class="ukp"><small>Hlutverk</small><b>${E(RL[sel.hlutverk] || "")}</b></div></div>`
        + `<div class="ush2"><span>Verkefni</span></div>` + (ps.map(p => `<a class="uln" ${tapAttr("verk", p.id)} data-tab="verk"><span>${E(p.nr)} ${E(p.stutt || "")}<small> · ${E(p.vidskiptavinur || "")}</small></span>${pill(p.stada)}</a>`).join("") || `<div class="usub" style="padding:6px 0">Ekki skráð á verkefni.</div>`) + `</div>`; }
    return `<div class="split ui1own"><div class="splist">${list}</div><div class="spdet"><div class="spdetin">${det}</div></div></div>`;
  };

  /* ---------- Viðskiptavinaspjald: flipar Verkefni · Tilboð · Pantanir · Reikningar · Upplýsingar ---------- */
  st.ct = "verk";
  window.u1VskTabs = function (id) {
    const c = (S?.vidskiptavinir || []).find(x => String(x.id) === String(id)); if (!c) return null;
    const api = window.salaAPI, mine = o => String(o.vskId || "") === String(c.id) || (!o.vskId && (o.vidskiptavinur || o.kaupandi?.name) === c.name);
    const vs = verkefni().filter(p => String(p.vskId || "") === String(c.id) || String(p.vkId || "") === String(c.id) || p.vidskiptavinur === c.name).sort((a, b) => (isDone(a) - isDone(b)) || String(b.nr).localeCompare(String(a.nr), "is", { numeric: true }));
    const tb = api ? api.TB().filter(mine).sort((a, b) => String(b.dags).localeCompare(String(a.dags))) : [], pn = api ? api.PN().filter(mine) : [], rk = (S?.reikningar || []).filter(r => String(r.vskId || "") === String(c.id) || r.kaupandi?.name === c.name);
    const keys = [["verk", "Verkefni " + vs.length], ...(api ? [["tb", "Tilboð " + tb.length]] : []), ...(api && pn.length ? [["pn", "Pantanir " + pn.length]] : []), ...(ON("reikningar") ? [["rk", "Reikningar " + rk.length]] : []), ["upp", "Tengiliðir"]];
    if (!keys.some(k => k[0] === st.ct)) st.ct = "verk";
    const ln = (attr, a, b, pl, dark) => `<a class="uln" ${attr}><span>${a}<small>${b ? " · " + b : ""}</small></span>${pl ? pill(pl, dark) : ""}</a>`;
    const body = st.ct === "verk" ? vs.map(p => ln(tapAttr("verk", p.id), E(p.nr + " " + (p.stutt || "")), E(svidOf(p).join(", ")), p.stada, !isDone(p) && p.stada === STODUR()[1]?.n)).join("")
      : st.ct === "tb" ? tb.map(T => ln(tapAttr("tb", T.id), E((T.nr || "") + " " + (T.heiti || "")), E((T.fra || T.dags || "").slice(0, 10).split("-").reverse().join(".")), T.stada, T.stada === "Samþykkt")).join("")
      : st.ct === "pn" ? pn.map(P => ln(tapAttr("tb", P.id), E((P.nr || "") + " " + (P.heiti || "")), E((P.fra || "").split("-").reverse().join(".")), P.stada, P.stada === "Ný")).join("")
      : st.ct === "rk" ? rk.map(r => ln(tapAttr("reikn", r.id), "Reikningur " + E(String(r.nr)), E(kr(r.tot)), r.stada, r.stada !== "Greitt" && daysTo(r.gjalddagi) < 0)).join("") : null;
    return { tabs: tabsV(keys.map(([k, l]) => [k, l]), st.ct).replace(/u1vt:/g, "u1ct:"), body: body === null ? null : (body || `<div class="usub" style="padding:8px 0">Ekkert hér enn.</div>`) };
  };

  /* ---------- Yfirlit hluta (Verkefni, Viðskiptavinir, Pantanir, Tilboð, Tímar) og viðskiptavinir eftir sviðum ---------- */
  const SV = ["Leiga", "Sala", "Þjónusta"], SVT = { Leiga: "leiga", Sala: "sala", "Þjónusta": "vinna" }, svH = x => window.svidHeiti ? svidHeiti(x) : x;
  const go = (t, k) => `data-act="u1go:${t}:${E(k || "")}" role="button" tabindex="0"`;
  // 2.69.1: þriðja stak = aðgerð (t.d. "ltilbod:opin") – reiturinn opnar listann síaðan, eins og í Pöntunum
  const kp4 = arr => `<div class="ukps k4">${arr.map(([l, v, a]) => a ? `<div class="ukp tap" data-act="u1kpf:${a}" role="button" tabindex="0" title="Sýna lista"><small>${E(l)}</small><b>${v}</b></div>` : `<div class="ukp"><small>${E(l)}</small><b>${v}</b></div>`).join("")}</div>`;
  const dcard = (title, rows, more, empty) => `<section class="card ucard uhc"><div class="uhch"><h3>${E(title)}</h3>${more ? `<a href="#" data-act="tab:${more}">Sjá allt →</a>` : ""}</div>${rows.length ? rows.slice(0, 6).join("") : `<div class="usub" style="padding:10px 0">${E(empty || "Ekkert hér.")}</div>`}</section>`;
  const drow = (attr, a, b, pl, dark) => `<a class="uhrow" ${attr}><span><b>${a}</b><small>${b || ""}</small></span>${pl ? pill(pl, dark) : ""}</a>`;
  const svCards = (items, tabs, lab) => `<div class="usvc">${SV.filter(x => svidOn(x)).map(x => { const it = items(x); return `<section class="card ucard" data-act="tab:${tabs[x]}" role="button" tabindex="0"><small class="m">${E(svH(x))}</small><b class="n">${it.n}</b><span class="usub">${E(it.t)}</span></section>`; }).join("")}</div>`;
  const tbSum = T => window.salaAPI.netOf(T); // án VSK, eftir afslátt á línum og skjali
  // Svið: tegund línanna + svið sem bætt hefur verið við pöntun (P.svid, 2.56.2)
  const hasTeg = (T, x) => (T.linur || []).some(l => l.teg === SVT[x]) || (!!T.pontun && (T.svid || []).includes(x));
  const mkr = n => (Math.round(n / 1e5) / 10).toLocaleString("de-DE") + " m.kr.";

  U.verkyf = function () {
    const ps = verkefni().filter(p => !isDone(p)), ti = isoD(today);
    const late = ps.filter(p => p.skiladagur && p.skiladagur < ti), soon = ps.filter(p => p.skiladagur && daysTo(p.skiladagur) >= 0 && daysTo(p.skiladagur) <= 7).sort((a, b) => a.skiladagur.localeCompare(b.skiladagur));
    const unb = window.rkUnbilledKr ? ps.reduce((a, p) => a + rkUnbilledKr(p.id), 0) : 0;
    const subs = ps.flatMap(p => (p.undirverk || []).filter(u => u.stada !== "Done" && u.skiladagur).map(u => ({ p, u }))).sort((a, b) => a.u.skiladagur.localeCompare(b.u.skiladagur));
    const st0 = STODUR().filter(x => !x.falin);
    return head("Verkefni", "Yfirlit", nbtn("Verkefni")) + kp4([["Í gangi", ps.length], ["Skil næstu 7 daga", soon.length], ["Komið fram yfir", late.length], ["Óreikningsfært", kr(unb)]])
      + svCards(x => { const xs = ps.filter(p => svidOf(p).includes(x)); return { n: xs.length, t: xs.length === 1 ? "verkefni í gangi" : "verkefni í gangi" }; }, { Leiga: "lverk", Sala: "sverk", "Þjónusta": "tverk" })
      + `<div class="udash">${dcard("Skil framundan", [...late, ...soon].map(p => drow(go("verk", "verk:" + p.id), E(p.nr + " " + (p.stutt || "")), E((p.vidskiptavinur || "") + " · " + fmtD(p.skiladagur)), daysTo(p.skiladagur) < 0 ? "Seint" : p.stada, daysTo(p.skiladagur) < 0)), "verk", "Engin skil næstu 7 daga.")}`
      + dcard("Undirverk framundan", subs.map(({ p, u }) => drow(go("verk", "verk:" + p.id), E(u.heiti || u.nr), E(p.nr + " · skil " + fmtD(u.skiladagur)), STL[u.stada] || u.stada, u.stada === "In progress")), "", "Engin opin undirverk.")
      + dcard("Eftir stöðu", st0.map(x => { const n = ps.filter(p => p.stada === x.n).length; return `<div class="ubr"><span>${E(x.n)}</span><div class="ubar"><i style="width:${ps.length ? n / ps.length * 100 : 0}%"></i></div><span>${n}</span></div>`; }), "verk") + `</div>`;
  };

  const vskSvid = c => { const api = window.salaAPI, out = new Set(), mine = o => String(o.vskId || "") === String(c.id) || (!o.vskId && o.vidskiptavinur === c.name);
    verkefni().filter(p => String(p.vskId || "") === String(c.id) || p.vidskiptavinur === c.name).forEach(p => svidOf(p).forEach(x => out.add(x)));
    if (api) [...api.TB(), ...api.PN()].filter(mine).forEach(T => SV.forEach(x => { if (hasTeg(T, x)) out.add(x); }));
    return out; };
  const vskList = (key, x) => function () {
    const all = (S?.vidskiptavinir || []).filter(c => vskSvid(c).has(x)).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "is"));
    const cnt = c => verkefni().filter(p => p.vskId === c.id && !isDone(p)).length, f = st.vf[key] || "", xs = all.filter(c => SQ() || (f === "opin" ? cnt(c) : true));
    let h = "", last = "";
    xs.forEach(c => { const l = String(c.name || "?").charAt(0).toLocaleUpperCase("is"); if (l !== last) { h += grpH(l); last = l; } const n = cnt(c);
      h += `<div class="urow uv" ${tapAttr("vsk", c.id)}><span class="t">${E(c.name || "")}${c.tengilidur ? `<span class="m"> · ${E(c.tengilidur)}</span>` : ""}</span><span class="m">${n ? n + " verkefni" : ""}</span><span class="r">${pill(n ? "Í gangi" : "Óvirkur")}</span></div>`; });
    return lhead("Viðskiptavinir", svH(x), nbtn("Viðskiptavinur")) + `<div class="ulbar">${chips([["", "Allir · " + all.length], ["opin", "Með opin verkefni"]], f, "u1vf:" + key)}</div>`
      + `<div class="ucols uv"><span>Heiti · Tengiliður</span><span>Verkefni</span><span class="r">Staða</span></div>` + (h || `<div class="uempty">Engir viðskiptavinir á þessu sviði.</div>`);
  };
  U.vskl = vskMain("vskl", "Leiga"); U.vsks = vskMain("vsks", "Sala"); U.vskt = vskMain("vskt", "Þjónusta");
  U.vskyf_gamalt = function () {
    const api = window.salaAPI, L = S?.vidskiptavinir || [], m12 = isoD(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
    const rev = c => api ? api.seld().filter(T => String(T.fra || T.dags) >= m12 && String(T.fra || T.dags).slice(0, 10) <= isoD(today) && (T.vskId ? String(T.vskId) === String(c.id) : T.vidskiptavinur === c.name)).reduce((a, T) => a + tbSum(T), 0) : 0;
    const act = L.filter(c => verkefni().some(p => p.vskId === c.id && !isDone(p))), none = L.filter(c => !vskSvid(c).size);
    const top = L.map(c => ({ c, r: rev(c) })).filter(x => x.r).sort((a, b) => b.r - a.r), tot = top.reduce((a, x) => a + x.r, 0);
    const nyj = L.slice().sort((a, b) => String(b.stofnad || b.id).localeCompare(String(a.stofnad || a.id))).slice(0, 6);
    return head("Viðskiptavinir", "Yfirlit", nbtn("Viðskiptavinur")) + kp4([["Viðskiptavinir", L.length, "vsk:"], ["Með opin verkefni", act.length, "vsk:opin"], ["Selt 12 mán. án vsk", api ? mkr(tot) : "–"], ["Án viðskipta", none.length]])
      + svCards(x => { const n = L.filter(c => vskSvid(c).has(x)).length; return { n, t: "viðskiptavinir" }; }, { Leiga: "vskl", Sala: "vsks", "Þjónusta": "vskt" })
      + `<div class="udash">${dcard("Stærstu viðskiptavinir · 12 mán.", top.map(({ c, r }) => drow(go("vskt", "vsk:" + c.id), E(c.name), E(kr(r)), Math.round(r / Math.max(1, tot) * 100) + " %")), "", "Engin samþykkt tilboð síðustu 12 mánuði.")}`
      + dcard("Með opin verkefni", act.map(c => { const n = verkefni().filter(p => p.vskId === c.id && !isDone(p)).length; return drow(go("vskt", "vsk:" + c.id), E(c.name), E(c.tengilidur || ""), n + " verkefni"); }), "", "Enginn með opin verkefni.")
      + dcard("Án viðskipta", none.map(c => drow(go("vsk", "vsk:" + c.id), E(c.name), E(c.tengilidur || ""), "Nýr")), "vsk", "Allir viðskiptavinir eru með verkefni eða tilboð.") + `</div>`;
  };

  U.pnyf = function () {
    const api = window.salaAPI; if (!api) return head("Pantanir", "Yfirlit");
    const all = api.PN(), ti = isoD(today), ny = all.filter(P => P.stada === "Ný"), stf = all.filter(P => P.stada === "Staðfest"), af = all.filter(P => P.stada === "Afhent" && (!window.pnSkil || pnSkil(P)));
    const late = af.filter(P => (P.til || P.fra) < ti), wk = all.filter(P => ["Ný", "Staðfest"].includes(P.stada) && daysTo(P.fra) >= 0 && daysTo(P.fra) <= 7).sort((a, b) => String(a.fra).localeCompare(String(b.fra)));
    const skil = af.slice().sort((a, b) => String(a.til || a.fra).localeCompare(String(b.til || b.fra)));
    const nm = P => E((P.nr || "") + " " + (P.heiti && P.heiti !== "Pöntun" ? P.heiti : "")), who = P => E(P.vidskiptavinur || P.tengilidur || "");
    return head("Pantanir", "Yfirlit", nbtn("Pöntun")) + `<div class="ukps k4">${[["Nýjar", ny.length, "ny"], ["Staðfestar", stf.length, "stf"], ["Úti / bíða skila", af.length, "afh"], ["Skil komin fram yfir", late.length, "seint"]].map(([l, v, f]) => `<div class="ukp tap" data-act="u1pnf:${f}" role="button" tabindex="0" title="Sýna lista"><small>${E(l)}</small><b>${v}</b></div>`).join("")}</div>`
      + svCards(x => { const xs = all.filter(P => !["Skilað", "Lokið"].includes(P.stada) && hasTeg(P, x)); return { n: xs.length, t: "opnar pantanir" }; }, { Leiga: "pnl", Sala: "pns", "Þjónusta": "pnt" })
      + `<div class="udash">${dcard("Nýjar – þarf að staðfesta", ny.map(P => drow(go("pantanir", "tb:" + P.id), nm(P), who(P) + " · " + E(fmtD(P.fra)), "Ný", true)), "pantanir", "Engar nýjar pantanir.")}`
      + dcard("Afhendingar næstu 7 daga", wk.map(P => drow(go("pantanir", "tb:" + P.id), nm(P), who(P) + " · " + E(fmtD(P.fra)), P.stada)), "pantanir", "Engar afhendingar næstu 7 daga.")
      + dcard("Bíða skila", skil.map(P => drow(go("pantanir", "tb:" + P.id), nm(P), who(P) + " · skil " + E(fmtD(P.til || P.fra)), (P.til || P.fra) < ti ? "Seint" : "Úti", (P.til || P.fra) < ti)), "pantanir", "Ekkert úti.") + `</div>`;
  };

  U.tbyf_gamalt = function () {
    const api = window.salaAPI; if (!api) return head("Tilboð", "Yfirlit");
    const all = api.TB(), open = all.filter(T => ["Drög", "Sent"].includes(T.stada)), d90 = all.filter(T => daysTo(T.dags) >= -90);
    const won = d90.filter(T => T.stada === "Samþykkt"), lost = d90.filter(T => T.stada === "Hafnað"), rate = won.length + lost.length ? Math.round(won.length / (won.length + lost.length) * 100) + " %" : "–";
    const wait = all.filter(T => T.stada === "Sent").sort((a, b) => String(a.sent || a.dags).localeCompare(String(b.sent || b.dags))), drog = all.filter(T => T.stada === "Drög");
    return head("Tilboð", "Yfirlit", nbtn("Tilboð")) + kp4([["Opin tilboð", open.length + " · " + mkr(open.reduce((a, T) => a + tbSum(T), 0)), "ltilbod:opin"], ["Samþykkt 90 daga", won.length + " · " + mkr(won.reduce((a, T) => a + tbSum(T), 0)), "ltilbod:samth"], ["Hlutfall samþykkt", rate], ["Bíða svars > 7 daga", wait.filter(T => daysTo(T.sent || T.dags) <= -7).length, "ltilbod:opin"]])
      + svCards(x => { const xs = open.filter(T => hasTeg(T, x)); return { n: xs.length, t: "opin tilboð · " + mkr(xs.reduce((a, T) => a + tbSum(T), 0)) }; }, { Leiga: "tbl", Sala: "tbs", "Þjónusta": "tbt" })
      + `<div class="udash">${dcard("Bíða svars", wait.map(T => drow(go("ltilbod", "tb:" + T.id), E((T.nr || "") + " " + (T.heiti || "")), E((T.vidskiptavinur || "") + " · sent " + fmtD(T.sent || T.dags)), kr(tbSum(T)), daysTo(T.sent || T.dags) <= -7)), "ltilbod", "Ekkert bíður svars.")}`
      + dcard("Drög", drog.map(T => drow(go("ltilbod", "tb:" + T.id), E((T.nr || "") + " " + (T.heiti || "")), E(T.vidskiptavinur || ""), kr(tbSum(T)))), "ltilbod", "Engin drög.")
      + dcard("Nýlega samþykkt", won.sort((a, b) => String(b.dags).localeCompare(String(a.dags))).map(T => drow(go("ltilbod", "tb:" + T.id), E((T.nr || "") + " " + (T.heiti || "")), E(T.vidskiptavinur || ""), kr(tbSum(T)), true)), "ltilbod", "Ekkert samþykkt síðustu 90 daga.") + `</div>`;
  };

  U.vskyf = () => U.vsk(); U.tbyf = () => U.ltilbod(); // 2.70.0: yfirlitið er efst í listanum
  U.timyf = function () {
    const a = mondayOf(today), fs = faerslur(), wk = fs.filter(e => d(e.date) >= a), g = goal();
    const staff = STARFS().filter(x => fs.some(e => e.starfsmadur === x.sk));
    const me = wk.filter(e => (e.starfsmadur || ME()) === ME()).reduce((s, e) => s + (+e.timar || 0), 0), team = wk.reduce((s, e) => s + (+e.timar || 0), 0);
    const m0 = new Date(today.getFullYear(), today.getMonth(), 1), mo = fs.filter(e => d(e.date) >= m0);
    const by = {}; mo.forEach(e => { const p = findProj(e.verkefniId), k = p ? svidOf(p)[0] : "Innra"; by[k] = (by[k] || 0) + (+e.timar || 0); });
    const moT = Object.values(by).reduce((s, x) => s + x, 0), unb = window.rkUnbilled ? verkefni().reduce((s, p) => s + sumT(rkUnbilled(p.id).es), 0) : 0;
    return head("Tímaskráning", "Yfirlit", btn("Opna vikuna", "tab:timar", "primary")) + kp4([["Þín vika", H(me) + " af " + H(g) + " klst."], ["Teymið í viku", H(team) + " klst."], ["Þessi mánuður", H(moT) + " klst."], ["Óreikningsfært", H(unb) + " klst."]])
      + `<div class="udash">${dcard("Vikan hjá teyminu", staff.map(x => { const h = wk.filter(e => e.starfsmadur === x.sk).reduce((s, e) => s + (+e.timar || 0), 0); return `<div class="ubr"><span>${E(x.nafn || x.sk)}</span><div class="ubar"><i style="width:${Math.min(100, h / g * 100)}%"></i></div><span>${H(h)} klst.</span></div>`; }), "tskyr", "Engir tímar skráðir.")}`
      + dcard("Hvert fer tíminn · " + MNs[today.getMonth()], [...SV, "Innra"].filter(k => by[k]).map(k => `<div class="ubr"><span>${E(k === "Innra" ? k : svH(k))}</span><div class="ubar"><i style="width:${moT ? by[k] / moT * 100 : 0}%"></i></div><span>${Math.round(moT ? by[k] / moT * 100 : 0)} %</span></div>`), "tskyr", "Engir tímar í mánuðinum.") + `</div>`;
  };

  /* ---------- Heim: Yfirlit, Óklárað, Framundan, Tilkynningar ---------- */
  const fmtD = w => { const x = d(w); if (!x) return ""; return dateIS(x); };
  const att = it => it.open ? tapAttr(it.open.split(":")[0], it.open.slice(it.open.indexOf(":") + 1)) : `data-act="${it.act}" role="button" tabindex="0"`;
  const tbOn = () => (window.tbOK ? tbOK() : (ON("leiga") || ON("sala")));
  function oklItems() {
    const R = [], api = window.salaAPI;
    upcoming().filter(i => daysTo(i.when) < 0).forEach(i => R.push({ grp: "Komið fram yfir", k: "Verkefni", title: i.title, sub: [i.kind, i.nr].filter(Boolean).join(" · "), date: i.when, pill: "Seint", dark: 1, open: i.open }));
    if (window.pnOpnar) { const ti = isoD(today); pnOpnar().forEach(P => { if (P.stada === "Ný") R.push({ grp: "Pantanir", k: "Pöntun", title: (P.nr || "") + " " + (P.heiti && P.heiti !== "Pöntun" ? P.heiti : ""), sub: P.vidskiptavinur || P.tengilidur || "", date: P.fra, pill: "Ný", dark: 1, open: "tb:" + P.id });
      else if (P.stada === "Afhent" && (!window.pnSkil || pnSkil(P)) && (P.til || P.fra) < ti) R.push({ grp: "Pantanir", k: "Pöntun", title: (P.nr || "") + " skil", sub: P.vidskiptavinur || "", date: P.til || P.fra, pill: "Seint", dark: 1, open: "tb:" + P.id }); }); }
    if (api?.vantarPontun) { const ti = isoD(today), vp = api.TB().filter(api.vantarPontun), old = vp.filter(T => String(T.til || T.fra || T.dags || "").slice(0, 10) < ti);
      vp.filter(T => !old.includes(T)).forEach(T => R.push({ grp: "Pantanir", k: "Tilboð", title: (T.nr || "") + " " + (T.heiti || ""), sub: "Samþykkt – vantar pöntun" + (T.vidskiptavinur ? " · " + T.vidskiptavinur : ""), date: T.fra || T.dags, pill: "Stofna pöntun", open: "tb:" + T.id }));
      if (old.length) R.push({ grp: "Pantanir", k: "Tilboð", title: old.length + " eldri samþykkt tilboð án pöntunar", sub: "Teljast ekki með í sölutölum fyrr en þau eru skráð sem pantanir", date: "", pill: "Skrá sem pantanir", act: "pntbAll:" }); }
    if (tbOn() && api) api.TB().filter(T => T.stada === "Sent" && daysTo(T.sent || T.dags) <= -7).forEach(T => R.push({ grp: "Svör", k: "Tilboð", title: (T.nr || "") + " " + (T.heiti || ""), sub: "sent " + dateIS(d(T.sent || T.dags)), date: T.sent || T.dags, pill: "Svar", open: "tb:" + T.id }));
    verkD().filter(p => p.stada === STODUR()[0]?.n && !isDone(p)).forEach(p => R.push({ grp: "Svör", k: "Verkefni", title: p.nr + " " + (p.stutt || ""), sub: p.vidskiptavinur || "", date: p.stofnad_t, pill: STODUR()[0].n, open: "verk:" + p.id }));
    if (ON("reikningar") && window.can && can("fjarmal")) {
      if (window.rkUnbilled) { let h = 0, k = 0; verkefni().forEach(p => { const x = rkUnbilled(p.id); h += sumT(x.es); k += sumK(x.ks); }); if (h >= 1 || k) R.push({ grp: "Fjármál", k: "Fjármál", title: "Óreikningsfært · " + H(h) + " klst.", sub: k ? kr(k) + " í kostnaði" : "", date: "", pill: "Búa til", open: "oreikn:all" }); }
      const og = (S?.reikningar || []).filter(r => r.stada !== "Greitt" && r.stada !== "Ógilt"), late = og.some(r => daysTo(r.gjalddagi) < 0);
      if (og.length === 1) R.push({ grp: "Fjármál", k: "Fjármál", title: "1 ógreiddur reikningur · " + kr(og[0].tot), sub: og[0].kaupandi?.name || "", date: og[0].gjalddagi, pill: late ? "Seint" : "Opna", dark: late, open: "reikn:" + og[0].id });
      else if (og.length) R.push({ grp: "Fjármál", k: "Fjármál", title: og.length + " ógreiddir reikningar · " + kr(og.reduce((a, r) => a + (+r.tot || 0), 0)), sub: late ? "einn eða fleiri komnir fram yfir gjalddaga" : "", date: og.map(r => r.gjalddagi).sort()[0], pill: late ? "Seint" : "Opna", dark: late, act: "u1go:trk:" });
    }
    if (api) api.VR().forEach(v => { const n = window.u1OpinSkemmd ? u1OpinSkemmd(v) : 0; if (n) R.push({ grp: "Lager", k: "Lager", title: (v.nr || "") + " " + (v.heiti || ""), sub: n + " " + (n === 1 ? "skemmd bíður" : "skemmdir bíða") + " skoðunar", date: "", pill: "Ástand", open: "vara:" + v.id });
      if (api.vDeild(v) === "sala" && +v.lagmark && (+v.fjoldi || 0) < +v.lagmark) R.push({ grp: "Lager", k: "Lager", title: (v.nr || "") + " " + (v.heiti || ""), sub: (+v.fjoldi || 0) + " á lager · lágmark " + v.lagmark, date: "", pill: "Panta inn", open: "vara:" + v.id }); });
    const ofl = (window.MS_OFL || []).length; if (ON("postur") && ofl) R.push({ grp: "Póstur", k: "Póstur", title: ofl + " " + (ofl === 1 ? "póstur" : "póstar") + " til að tengja verkefni", sub: "Microsoft 365", date: "", pill: "Tengja", act: "tab:postur" });
    return R;
  }
  function framItems(days = 14) {
    const ti = isoD(today), ud = (window.utlDocs && ON("leiga") ? utlDocs() : []).filter(u => !u.T || !window.tbMine || tbMine(u.T)), ux = [];
    ud.forEach(u => { if (u.fra >= ti) ux.push({ when: u.fra, title: u.nr + " " + u.heiti, kind: "Afhending", open: "tb:" + u.T.id, nr: u.vsk }); if (u.til >= ti && u.til !== u.fra) ux.push({ when: u.til, title: u.nr + " " + u.heiti, kind: "Skil", open: "tb:" + u.T.id, nr: u.vsk }); });
    return [...upcoming(), ...ux].filter(i => { const n = daysTo(i.when); return n !== null && n >= 0 && n <= days; }).sort((a, b) => String(a.when).localeCompare(String(b.when)))
      .map(i => ({ k: i.kind === "Fundur" ? "Fundur" : /Skil/.test(i.kind) ? "Skil" : i.kind, title: i.title, sub: [i.kind, i.nr].filter(Boolean).join(" · "), date: i.when, time: hhmm(i.when), pill: i.kind === "Fundur" ? "Fundur" : /Afhending/.test(i.kind) ? "Afhending" : /Skil/.test(i.kind) ? "Skil" : i.kind, open: i.open }));
  }
  function tilkItems() {
    const R = [], api = window.salaAPI;
    const pu = window.poUnread ? poUnread() : 0; if (ON("postur") && pu) R.push({ k: "Póstur", title: pu + " " + (pu === 1 ? "ólesinn póstur" : "ólesnir póstar"), sub: "Pósthólf", date: "", pill: "Nýtt", dark: 1, act: "tab:postur" });
    const su = window.spUnread ? spUnread() : 0; if (ON("spjall") && su) R.push({ k: "Spjall", title: su + " " + (su === 1 ? "ný skilaboð" : "ný skilaboð") + " í spjalli", sub: "Spjall", date: "", pill: "Nýtt", dark: 1, act: "tab:spjall" });
    if (api) {
      api.PN().filter(P => P.stada === "Ný" && (!window.tbMine || tbMine(P))).forEach(P => R.push({ k: "Pantanir", title: "Ný pöntun " + (P.nr || ""), sub: [P.vidskiptavinur || P.tengilidur, P.uppruni ? ({ simi: "sími", postur: "tölvupóstur", shopify: "Shopify", vefur: "vefur", stadur: "á staðnum", tilbod: "úr tilboði" })[P.uppruni] || P.uppruni : ""].filter(Boolean).join(" · "), date: P.stofnad_t || P.dags, pill: "Pöntun", open: "tb:" + P.id }));
      // 2.85.0: viðbrögð viðskiptavina – aðeins það sem notandinn er skráður á (tbMine)
      const mine = T => !window.tbMine || tbMine(T), dd = x => String(x || "");
      api.TB().filter(mine).forEach(T => {
        (T.vidskSvor || []).filter(m => !(T.vidskSvorSvar || {})[dd(m.dags)] && daysTo(m.dags) >= -14).forEach(m => R.push({ k: "Tilboð", title: `Spurning frá ${m.nafn || "viðskiptavini"} · ${T.nr || ""}`, sub: String(m.texti || "").slice(0, 90), date: m.dags, pill: "Spurning", open: "tb:" + T.id }));
        if (T.bidur && !["Samþykkt", "Hafnað"].includes(T.stada)) R.push({ k: "Tilboð", title: `${T.bidur.nafn || "Viðskiptavinur"} samþykkti ${T.nr || ""} – staðfestu`, sub: [T.vidskiptavinur, T.heiti].filter(Boolean).join(" · "), date: T.bidur.dags, pill: "Samþykkt", dark: 1, open: "tb:" + T.id });
        if (T.vidskHafnad && daysTo(T.vidskHafnad.dags) >= -14) R.push({ k: "Tilboð", title: `${T.vidskHafnad.nafn || "Viðskiptavinur"} hafnaði ${T.nr || ""}`, sub: String(T.vidskHafnad.astaeda || T.heiti || "").slice(0, 90), date: T.vidskHafnad.dags, pill: "Hafnað", open: "tb:" + T.id });
      });
      // 2.86.0: viðskiptavinur svaraði tilboðs-/pöntunarpóstinum (nýjasti póstur í þræðinum er frá honum)
      if (window.poConvLast) [...api.TB(), ...api.PN()].filter(mine).filter(T => T.postConv && !["Hafnað", "Lokið", "Skilað"].includes(T.stada)).forEach(T => { const m = poConvLast(T.postConv);
        if (m && !poIsOurs(m) && daysTo(m.receivedDateTime) >= -14) R.push({ k: T.pontun ? "Pantanir" : "Tilboð", title: `Svar frá ${m.from?.emailAddress?.name || m.from?.emailAddress?.address || "viðskiptavini"} · ${T.nr || ""}`, sub: String(m.bodyPreview || "").slice(0, 90), date: m.receivedDateTime, pill: "Póstur", dark: m.isRead === false ? 1 : 0, open: "post:" + m.id }); });
      api.PN().filter(mine).filter(P => P.vidskStadfest && daysTo(P.vidskStadfest.dags) >= -7).forEach(P => R.push({ k: "Pantanir", title: `${P.vidskStadfest.nafn || "Viðskiptavinur"} staðfesti ${P.nr || ""}`, sub: [P.vidskiptavinur || P.tengilidur, P.heiti && P.heiti !== "Pöntun" ? P.heiti : ""].filter(Boolean).join(" · "), date: P.vidskStadfest.dags, pill: "Staðfest", open: "tb:" + P.id }));
      api.TB().filter(mine).filter(T => T.stada === "Samþykkt" && daysTo(T.breytt_t || T.dags) >= -7 && daysTo(T.dags) >= -30).forEach(T => R.push({ k: "Tilboð", title: "Tilboð " + (T.nr || "") + " samþykkt", sub: [T.vidskiptavinur, T.heiti].filter(Boolean).join(" · "), date: T.breytt_t || T.dags, pill: "Samþykkt", open: "tb:" + T.id }));
      api.VR().forEach(v => (v.skemmdir || []).filter(x => x.stada === "opin" && daysTo(x.dags) >= -7).forEach(x => R.push({ k: "Lager", title: "Skemmd skráð · " + (x.eintak || v.nr || ""), sub: x.lysing || "", date: x.dags, pill: "Ástand", open: "vara:" + v.id })));
    }
    (S?.thraedir || []).filter(t => daysTo(t.tengt) >= -3).forEach(t => R.push({ k: "Póstur", title: "Póstur tengdur verkefni", sub: t.efni || "", date: t.tengt, pill: "Póstur", open: t.verkefniId ? "verk:" + t.verkefniId : null, act: "tab:postur" }));
    return R.sort((a, b) => String(b.date || "9").localeCompare(String(a.date || "9")));
  }
  const relW = w => fmtD(w);
  const hcard = (title, n, sub, items, more, rowTxt) => `<section class="card ucard uhc"><div class="uhch"><h3>${E(title)}${n ? ` <span class="ucnt">${n}</span>` : ""}</h3><a href="#" data-act="tab:${more}">${E(title)} →</a></div>`
    + (items.length ? items.slice(0, 5).map(it => `<a class="uhrow s1" ${att(it)}><span>${E(rowTxt(it))}</span>${pill(it.k)}</a>`).join("") : `<div class="usub" style="padding:10px 0">${E(sub)}</div>`) + `</section>`;
  U.yfirlit = function () {
    const hr = new Date().getHours(), first = (STARFS().find(x => x.sk === ME())?.nafn || window.USER?.nafn || "").split(" ")[0];
    const greet = hr < 5 ? "Góða nótt" : hr < 11 ? "Góðan daginn" : hr < 18 ? "Góðan dag" : "Gott kvöld";
    const g = goal(), k = klukka(), me = ME(), a = mondayOf(today);
    const days = [...Array(7)].map((_, i) => { const x = new Date(a); x.setDate(x.getDate() + i); const di = isoD(x); return [["má", "þr", "mi", "fi", "fö", "la", "su"][i], faerslur().filter(e => (e.starfsmadur || me) === me && e.date === di).reduce((s, e) => s + (+e.timar || 0), 0), di === isoD(today)]; });
    const wk = days.reduce((s, x) => s + x[1], 0) + (k && window.liveWeekH ? liveWeekH(k.start) : 0), mx = Math.max(8, ...days.map(x => x[1]));
    const vik = ON("timar") ? `<section class="card ucard"><div class="uhch"><h3>Vikan þín</h3><a href="#" data-act="tab:timar">Tímar →</a></div><div class="uwk"><b>${H(wk)}</b><span class="m">/ ${H(g)} klst.</span></div><div class="ubar" style="height:8px"><i style="width:${Math.min(100, wk / g * 100)}%;background:#2B3138"></i></div><div class="usl"><span>${Math.round(Math.min(1, wk / g) * 100)} % af markmiði vikunnar</span></div>`
      + `<div class="uwkb">${days.map(([l, h, t]) => `<div><i style="height:${Math.max(h ? 6 : 0, Math.round(h / mx * 46))}px;background:${t ? "#2B3138" : "#C9D0D6"}"></i><span>${l}</span></div>`).join("")}</div></section>` : "";
    const today2 = faerslur().filter(e => (e.starfsmadur || me) === me && e.date === isoD(today)), last = today2.slice().sort((x, y) => String(y.til || y.fra || "").localeCompare(String(x.til || x.fra || "")))[0];
    const tinfo = `Í dag: ${H(today2.reduce((s, e) => s + (+e.timar || 0), 0))} klst. skráðar${last ? " · síðast " + E((last.fra || "") + (last.til ? "–" + last.til : "")) + " " + E(last.lysing || "") : ""}`;
    const ps = verkefni().filter(p => !isDone(p)).sort((x, y) => String(y.nr).localeCompare(String(x.nr), "is", { numeric: true }));
    const kl = ON("timar") ? (k ? (() => { const q = findProj(k.pid); return `<section class="card ucard uklk on"><small>Klukka í gangi · ${E([q?.nr, q?.stutt].filter(Boolean).join(" "))}</small><div class="uklr"><b class="kt" data-start="${E(k.start)}">${elapsed(k)}</b><button type="button" class="btn" onclick="stopKlukka()">■ Stoppa og skrá</button></div><small class="m2">${tinfo}</small></section>`; })()
      : `<section class="card ucard uklk"><small>Stimpilklukka · engin klukka í gangi</small><div class="uklr"><b>0:00:00</b><button type="button" class="btn" onclick="const v=document.getElementById('u1klp')?.value;v?doAct('kstart:'+v):(kind='tima',PREFILL={timer:true},openSheet())">▶ Byrja klukku</button></div><label class="uklp"><small>Verkefni</small><select id="u1klp"><option value="">Velja verkefni…</option>${ps.map(p => `<option value="${E(p.id)}">${E(p.nr + " " + (p.stutt || ""))}</option>`).join("")}</select></label><small class="m2">${tinfo}</small></section>`) : "";
    const ok = oklItems(), fr = framItems(7), tk = tilkItems().filter(x => !u1Seen(x));
    const l = ORG.merki || ORG.logo || {}, src = l.ljos || l.dokk || "";
    return `<div class="uhead uhh"><div><div class="spsup">${E(dayTitle(today))}</div><h2 class="ptitle">${greet}${first ? ", " + E(first) : ""}</h2></div><div class="uhr"><button type="button" class="btn primary" onclick="openFab()">+ Nýtt</button></div></div>`
      + `<div class="uhtop">${vik}${kl}</div>`
      + `<div class="uh3">${hcard("Óklárað", ok.length, "Ekkert óklárað – vel gert.", ok, "hfrag", it => it.title + (it.sub ? " · " + it.sub : ""))}${hcard("Framundan", fr.length, "Ekkert næstu 7 daga.", fr, "hfram", it => relW(it.date) + (it.time ? " " + it.time : "") + " · " + it.title)}${hcard("Tilkynningar", tk.length, "Engar nýjar tilkynningar.", tk, "hnyl", it => it.title + (it.sub ? " · " + it.sub : ""))}</div>`
      + dagskraHTML()
      + (src ? `<div class="h2logo"><img src="${E(src)}" alt="${E(ORG.nafn || "")}"></div>` : `<div class="h2logo txt">${E(ORG.nafn || "")}</div>`);
  };
  // Dagskrá dagsins neðst á Heim › Yfirlit (2.52.1): fundir, skil og viðburðir dagsins + afhendingar og skil pantana, í tímaröð
  function dagskraHTML() {
    const t = isoD(today), hm = w => { const m = String(w || "").match(/T(\d\d:\d\d)/) || String(w || "").match(/^(\d\d:\d\d)/); return m ? m[1] : ""; }, ag = [];
    let cal = new Map(); try { cal = calItems(); } catch (e) {}
    (cal.get(t) || []).filter(i => !i.span && !i.done).forEach(i => ag.push({ time: hm(i.when), title: i.title || "", sub: i.nr || "", kind: i.kind || "", open: i.open }));
    (window.salaAPI?.PN?.() || []).filter(P => !window.tbMine || tbMine(P)).forEach(P => { // 2.86.1: aðeins pantanir sem notandinn er skráður á
      const fra = String(P.fra || "").slice(0, 10), til = String(P.til || P.fra || "").slice(0, 10), who = P.tengilidur || P.vidskiptavinur || "";
      if (fra === t && ["Ný", "Staðfest"].includes(P.stada)) ag.push({ time: hm(P.fra), title: [P.nr, P.heiti].filter(Boolean).join(" "), sub: who, kind: "Afhending", open: "tb:" + P.id });
      if (P.stada === "Afhent" && (!window.pnSkil || pnSkil(P)) && til && til <= t) ag.push({ time: hm(P.til), title: [P.nr, P.heiti].filter(Boolean).join(" "), sub: who, kind: til < t ? "Skil – seint" : "Skil pöntunar", open: "tb:" + P.id, late: til < t });
    });
    ag.sort((x, y) => (x.time || "99").localeCompare(y.time || "99"));
    const rows = ag.map(a => `<div class="udsr${a.late ? " late" : ""}" ${a.open ? `data-open="${E(a.open)}" role="button" tabindex="0"` : ""}><span class="udst">${E(a.time || "–")}</span><span class="udsx"><b>${E(a.title)}</b>${a.sub ? `<small>${E(a.sub)}</small>` : ""}</span><span class="r">${pill(a.kind, a.late ? "late" : "")}</span></div>`).join("");
    return `<section class="card ucard udags"><div class="uhch"><h3>Dagskrá dagsins${ag.length ? ` <span class="m">${ag.length}</span>` : ""}</h3><a href="#" data-act="tab:dagatal">Dagatal →</a></div>${rows || `<div class="uempty">Ekkert á dagskrá í dag.</div>`}</section>`;
  }
  // Lesnar tilkynningar (á þessu tæki)
  const SEENK = "u1seen:" + (window.ORG?.lsForskeyti || "");
  const seenSet = () => { try { return new Set(JSON.parse(localStorage.getItem(SEENK) || "[]")); } catch (e) { return new Set(); } };
  const tkId = x => [x.k, x.title, x.date || ""].join("|");
  const u1Seen = x => seenSet().has(tkId(x));
  window.u1MarkSeen = () => { const s0 = seenSet(); tilkItems().forEach(x => s0.add(tkId(x))); try { localStorage.setItem(SEENK, JSON.stringify([...s0].slice(-500))); } catch (e) {} render(); };
  const hlist = (title, items, chipsArr, key, opt = {}) => {
    const f = st.vf[key] ?? (opt.def || ""), xs = items.filter(it => SQ() || !f || (opt.flt ? opt.flt(it, f) : it.k === f));
    const cols = opt.cols || ["Tegund", "Atriði", "Dags.", ""];
    return lhead("Heim", title, opt.btn || "") + `<div class="ulbar">${chips(opt.chips || [["", "Allt · " + items.length], ...chipsArr.map(c => [c, c])], f, "u1vf:" + key)}</div>`
      + `<div class="ucols uh"><span>${cols[0]}</span><span>${cols[1]}</span><span>${cols[2]}</span><span class="r">${cols[3]}</span></div>`
      + (xs.map(it => opt.row ? opt.row(it) : `<div class="urow uh" ${att(it)}><span class="m">${E(it.k)}</span><span class="t">${E(it.title)}${it.sub ? `<span class="m"> · ${E(it.sub)}</span>` : ""}</span><span class="m">${E(it.date ? fmtD(it.date) + (it.time ? " " + it.time : "") : "")}</span><span class="r">${pill(it.pill, it.dark)}</span></div>`).join("") || `<div class="uempty">Ekkert hér.</div>`);
  };
  U.hfrag = () => { const xs = oklItems(); return hlist("Óklárað", xs, [...new Set(xs.map(x => x.k))], "hfrag"); };
  U.hfram = () => { const xs = framItems(14), w7 = xs.filter(x => daysTo(x.date) <= 7);
    return hlist("Framundan", xs, [], "hfram", { def: "7", btn: nbtn("Fundur").replace(/data-act="fabnew[^"]*"/, 'data-act="add:fund"'), cols: ["Dags.", "Atriði · Verkefni", "Kl.", "Tegund"],
      chips: [["7", "7 dagar · " + w7.length], ["Fundur", "Fundir"], ["Skil", "Skil"], ["Afhending", "Afhendingar"], ["", "14 dagar · " + xs.length]],
      flt: (it, f) => f === "7" ? daysTo(it.date) <= 7 : it.pill === f || it.k === f,
      row: it => `<div class="urow uh" ${att(it)}><span class="m">${E(fmtD(it.date))}</span><span class="t">${E(it.title)}${it.sub ? `<span class="m"> · ${E(it.sub.replace(/^(Fundur|Skil[^·]*|Afhending) · ?/, ""))}</span>` : ""}</span><span class="m">${E(it.time || "")}</span><span class="r">${pill(it.pill)}</span></div>` }); };
  U.hnyl = () => { const xs = tilkItems(), un = xs.filter(x => !u1Seen(x));
    return hlist("Tilkynningar", xs, [], "hnyl", { def: "unread", btn: `<button type="button" class="btn primary" onclick="u1MarkSeen()">Merkja lesið</button>`, cols: ["Uppruni", "Frá · Efni", "Tími", ""],
      chips: [["unread", "Ólesið · " + un.length], ...[...new Set(xs.map(x => x.k))].map(c => [c, c]), ["", "Allt · " + xs.length]],
      flt: (it, f) => f === "unread" ? !u1Seen(it) : it.k === f,
      row: it => `<div class="urow uh" ${att(it)}><span class="m">${E(it.k)}</span><span class="t">${E(it.title)}${it.sub ? `<span class="m"> · ${E(it.sub)}</span>` : ""}</span><span class="m">${E(it.date ? fmtD(it.date) : "")}</span><span class="r">${pill(u1Seen(it) ? "Lesið" : "Nýtt", !u1Seen(it))}</span></div>` }); };

  /* ---------- aðgerðir ---------- */
  Object.assign(window.ACT_EXT = window.ACT_EXT || {}, {
    u1: async function (k, r) {
      const v = r.join(":");
      if (k === "u1wk") { st.wk = v === "0" ? 0 : st.wk + (+v); render(); return; }
      if (k === "u1ff") { st.ff = v; st.sel.clear(); render(); return; }
      if (k === "u1sel") { if (!v) st.sel.clear(); else st.sel.has(v) ? st.sel.delete(v) : st.sel.add(v); render(); return; }
      if (k === "u1rep") { st.rep = v; render(); return; }
      if (k === "u1rp") { st.rp = v; render(); return; }
      if (k === "u1grp") { st.grp = v; render(); return; }
      if (k === "u1vt") { st.vt = v; render(); return; }
      if (k === "u1mkE") { const q = VRget(v); if (!q) return; const n = +q.fjoldi || 0, pre = q.nr || "X"; await saveV(v, x => { x.eintok = [...Array(n)].map((_, i) => ({ nr: pre + "-" + String(i + 1).padStart(2, "0"), stada: "ok" })); }); st.vt = "eintok"; render(); return; }
      if (k === "u1es") { const [id, i, val] = [r[0], +r[1], r[2]]; await saveV(id, x => { if (x.eintok?.[i]) x.eintok[i].stada = val; }); render(); return; }
      if (k === "u1qr") { const q = VRget(v); if (q) printQR(q); return; }
      if (k === "u1scan") { scanQR(); return; }
      if (k === "u1dmg") { st.dmg = v || null; render(); return; }
      if (k === "u1dmgS") { const e = document.getElementById("u1dE")?.value || "", l = document.getElementById("u1dL")?.value || "", rf = document.getElementById("u1dR")?.value || ""; if (!l.trim()) { toast?.("Skrifaðu lýsingu"); return; }
        await saveV(v, x => { (x.skemmdir = x.skemmdir || []).push({ id: (crypto.randomUUID?.() || String(Date.now())).replace(/-/g, ""), eintak: e, lysing: l.trim(), ref: rf.trim(), dags: new Date().toISOString(), af: ME(), stada: "opin" }); const u = (x.eintok || []).find(y => y.nr === e); if (u) u.stada = "skodun"; });
        st.dmg = null; render(); return; }
      if (k === "u1dmgX") { const [id, did, val] = r; await saveV(id, x => { const q = (x.skemmdir || []).find(y => String(y.id) === did); if (q) { q.stada = val; q[val === "lokid" ? "lokid" : "sent"] = new Date().toISOString(); const u = (x.eintok || []).find(y => y.nr === q.eintak); if (u) u.stada = val === "lokid" ? "ok" : "vidgerd"; } }); render(); return; }
      if (k === "u1tal") { st.tal = v || null; render(); return; }
      if (k === "u1talS") { const n = +document.getElementById("u1tN")?.value; if (!(n >= 0)) return; await saveV(v, x => { const df = n - (+x.fjoldi || 0); x.fjoldi = n; (x.hreyfingar = x.hreyfingar || []).push({ dags: new Date().toISOString(), teg: "Talning", magn: df, stada: n, af: ME() }); }); st.tal = null; render(); return; }
      if (k === "u1ink") { st.ink = v || null; render(); return; }
      if (k === "u1inkS") { const b = document.getElementById("u1iB")?.value || "", m = +document.getElementById("u1iM")?.value || 0, ve = document.getElementById("u1iV")?.value || ""; if (!m) return;
        await saveV(v, x => { const n = (x.innkaup || []).length + 1; (x.innkaup = x.innkaup || []).push({ id: String(Date.now()), nr: "IP-" + String(n).padStart(3, "0"), birgir: b, magn: m, vaent: ve, dags: new Date().toISOString(), stada: "Pantað" }); if (b) x.birgir = b; }); st.ink = null; toast?.("Innkaup skráð"); render(); return; }
      if (k === "u1inkM") { const [id, iid] = r; await saveV(id, x => { const q = (x.innkaup || []).find(y => String(y.id) === iid); if (!q) return; q.stada = "Móttekið"; q.mott = new Date().toISOString(); x.fjoldi = (+x.fjoldi || 0) + (+q.magn || 0); (x.hreyfingar = x.hreyfingar || []).push({ dags: q.mott, teg: "Móttekið", ref: q.nr + (q.birgir ? " " + q.birgir : ""), magn: +q.magn || 0, stada: x.fjoldi }); }); toast?.("Móttekið á lager"); render(); return; }
      if (k === "u1lm") { const [id, val] = r; await saveV(id, x => { x.lagmark = +val || 0; }); render(); return; }
      if (k === "u1svo") { const [key, on] = r; await cfgSave(c => { c.svid = c.svid || {}; c.svid[key] = { ...(c.svid[key] || {}), off: on !== "1" }; }); try { _einSig = null; applyEin(); } catch (e) {} drawMenu(); toast?.(svidHeiti(key) + (on === "1" ? " virkt" : " falið")); render(); return; }
      if (k === "u1svh") { const [key, ...rest] = r, val = rest.join(":").trim(); await cfgSave(c => { c.svid = c.svid || {}; c.svid[key] = { ...(c.svid[key] || {}), heiti: val }; }); toast?.("Vistað"); render(); return; }
      if (k === "u1cal") { st.cal = v === "0" ? 0 : st.cal + (+v || 0); render(); return; }
      if (k === "u1d2") { const [id, di] = r; if (!di) { st.rng = null; render(); return; } const R = st.rng && st.rng.v === id ? st.rng : null;
        st.rng = R && !R.b && di > R.a ? { v: id, a: R.a, b: di } : R && !R.b && di === R.a ? null : { v: id, a: di }; render(); return; }
      if (k === "u1tf") { const R = st.rng && st.rng.v === v ? st.rng : null; window.salaAPI.pnForm({ vara: v, magn: 1, fra: R?.a, til: R?.b || R?.a }); return; }
      if (k === "u1tb") { addToTb(v); return; }
      if (k === "u1tbN") { const R = st.rng && st.rng.v === v ? st.rng : null, q = VRget(v), m = +document.getElementById("u1tbM")?.value || 1; closeSheet(); window.salaAPI.tbForm(window.ORG?.pakkaval ? "blandad" : window.salaAPI.vDeild(q), { vara: v, magn: m, fra: R?.a, til: R?.b || R?.a }); return; }
      if (k === "u1tbA") { const [id, tid] = r, q = VRget(id), m = +document.getElementById("u1tbM")?.value || 1, api = window.salaAPI, T = api.TB().find(x => x.id === tid); if (!q || !T) return;
        await api.saveT(tid, t => { (t.linur = t.linur || []).push({ ...api.lineFrom(q, t), magn: m }); }); closeSheet(); toast?.((q.heiti || "Lína") + " sett á " + (T.nr || "tilboð")); render(); return; }
      if (k === "u1vg") { st.vt = "astand"; st.af = "opin"; st.dmg = v; render(); return; }
      if (k === "u1pi") { st.vt = "innk"; st.ink = v; render(); return; }
      if (k === "u1af") { st.af = v || "opin"; render(); return; }
      if (k === "u1rk") { const [id, did] = r; rukka(id, did); return; }
      if (k === "u1rkp") { const [pc] = r, b = +document.getElementById("rk-base")?.value || 0, el = document.getElementById("rk-upp"); if (el) el.value = Math.round(b * (+pc) / 100 / 100) * 100; return; }
      if (k === "u1day") { st.day = v && v !== st.day ? v : null; render(); return; }
      if (k === "u1kpf") { const [t2, f2] = String(v || "").split(":"); const vk = /^vsk/.test(t2) ? "vsk" : /^(ltilbod|tb[lst])$/.test(t2) ? "ltilbod" : t2; if (f2 === "vid") { st.vf.vsksort = "vid"; st.vf.vsk = ""; } else st.vf[vk] = f2 || ""; tab = t2; DETAIL = null; window.STSUB = null; render(); return; }
      if (k === "u1pnf") { st.vf.pn = v || "opnar"; tab = "pantanir"; DETAIL = null; window.STSUB = null; render(); return; }
      if (k === "u1vf") { const [key, val] = [r[0], r.slice(1).join(":")]; st.vf[key] = val; render(); return; }
      if (k === "u1mv") { const p = findProj(v), ids = new Set([...st.sel].filter(x => x.startsWith("time:")).map(x => x.slice(5))), kids = new Set([...st.sel].filter(x => x.startsWith("kostn:")).map(x => x.slice(6)));
        if (!p || (!ids.size && !kids.size)) return;
        await saveSnapshot(s => { (s.timar?.faerslur || []).forEach(e => { if (ids.has(String(e.id))) { e.verkefniId = p.id; e.nr = p.nr; } }); (s.kostnadur || []).forEach(x => { if (kids.has(String(x.id))) x.verkefniId = p.id; }); });
        toast?.(`${ids.size + kids.size} færslur færðar á ${p.nr}`); st.sel.clear(); render(); return; }
      if (k === "u1ct") { st.ct = r[0]; render(); return; }
      if (k === "u1go") { const t = r[0], key = r.slice(1).join(":"); tab = t; DETAIL = key || null; window.STSUB = null; render(); return; }
      if (k === "u1pnconf") { const P = window.salaAPI.PN().find(x => x.id === v); if (!P) return; const t = window.salaAPI.totals(P) || {};
        const A = window.salaAPI; (A.pdf ? A.pdf(P).then(b => [{ name: A.fileBase(P) + ".pdf", type: "application/pdf", size: b.length, data: b }]).catch(() => []) : Promise.resolve([])).then(atts => poCompose({ to: P.netfang, subject: "Staðfesting pöntunar " + (P.nr || "") + (P.heiti && P.heiti !== "Pöntun" ? " – " + P.heiti : ""), body: `Sæl/l,\n\nPöntun ${P.nr || ""} er staðfest.${P.fra ? "\nAfhending: " + u1D.dIS(P.fra) : ""}${P.til ? "\nSkil: " + u1D.dIS(P.til) : ""}\nSamtals með VSK: ${Math.round(t.tot || 0).toLocaleString("de-DE")} kr.\n\nKveðja,\n${window.USER?.nafn || ""}`, atts })); return; }
      if (k === "u1uf") { st.uf = v || "opin"; st.usel = null; render(); return; }
      if (k === "u1us") { st.usel = st.usel === v ? null : v; render(); return; }
      if (k === "u1cf") { st.cf = v || ""; render(); return; }
      if (k === "u1tsub") { const [id, sid] = r; await saveSnapshot(s => { const e = (s.timar?.faerslur || []).find(x => String(x.id) === id); if (e) e.undirverkId = sid || null; }); render(); return; }
      if (k === "u1trk") { const [id, on] = r; const e0 = faerslur().find(x => String(x.id) === id), fast = e0 && window.innheimtaOf && innheimtaOf(findProj(e0.verkefniId)) !== "timar";
        await saveSnapshot(s => { const e = (s.timar?.faerslur || []).find(x => String(x.id) === id); if (!e) return; if (fast) { if (on === "1") e.rukka = true; else delete e.rukka; } else { if (on === "1") delete e.ekkiRk; else e.ekkiRk = true; } }); render(); return; }
      if (k === "u1tcp") { const e = faerslur().find(x => String(x.id) === v); if (!e) return; kind = "tima"; PREFILL = { date: isoD(today), pid: e.verkefniId || "", lysing: e.lysing || "", timar: e.timar }; openSheet(); return; }
      if (k === "u1cpw") { const a = d(v), p0 = new Date(a); p0.setDate(p0.getDate() - 7); const me = ME();
        const prev = faerslur().filter(e => (e.starfsmadur || me) === me && d(e.date) >= p0 && d(e.date) < a); if (!prev.length) return toast?.("Engir tímar í síðustu viku");
        if (!confirm(`Afrita ${prev.length} færslur (${H(prev.reduce((x, e) => x + (+e.timar || 0), 0))} klst.) úr síðustu viku yfir á þessa viku?`)) return;
        await saveSnapshot(s0 => { s0.timar = s0.timar || {}; s0.timar.faerslur = s0.timar.faerslur || []; prev.forEach(e => { const x = d(e.date); x.setDate(x.getDate() + 7); const di = isoD(x); s0.timar.faerslur.push({ ...e, id: newId(), date: di, timabil: timabilOf(di), reikningur: null, live: undefined }); }); });
        toast?.(prev.length + " færslur afritaðar"); render(); return; }
      if (k === "u1xl") { const rows = [[{ v: "Hvert fer tíminn · " + (st.hvLab || ""), s: 1 }], [], ["Flokkur", "Klst.", "%"], ...(st.hvRows || []).map(([n, h, pc]) => [n, +h, pc])];
        const b = makeXlsx({ sheet: "Hvert fer tíminn", cols: [36, 10, 8], rows }); saveDoc({ data: b, name: "Hvert fer tíminn " + (st.hvLab || "") + ".xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kind: "Skýrslur" }); return; }
      if (k === "u1rksv") { window.rkSaveDoc?.(v); return; }
      if (k === "u1tm") { st.tm = r.join(":"); render(); return; }
      // „Skila viku“ (u1skil) tekið út 2.46.1 – eldri skil í timar.skil eru látin ósnert
    }
  });
})();
