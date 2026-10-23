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
  const pill = (t, dark) => `<span class="upill${dark ? " dark" : ""}">${E(t)}</span>`;
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
    const skil = (S?.timar?.skil?.[me] || []).includes(isoD(a));
    const right = btn("‹", "u1wk:-1") + btn("Í dag", "u1wk:0") + btn("›", "u1wk:1") + (skil ? pill("Skilað") : btn("Skila viku", "u1skil:" + isoD(a), "primary"));
    return head("Tímar · " + days[0].getDate() + ". " + MNs[days[0].getMonth()] + " – " + days[6].getDate() + ". " + MNs[days[6].getMonth()] + (skil ? " · skilað" : ""), "Vika " + wkNo, right)
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
    const rows = allF().filter(r => !st.ff || r.teg === st.ff).slice(0, 300);
    const selR = rows.filter(r => st.sel.has(r.k + ":" + r.id)), selH = selR.reduce((s, r) => s + r.h, 0);
    const nb = `<button type="button" class="btn primary" onclick="kind='tima';openSheet()">+ Skrá</button>`;
    const bar = selR.length ? `<div class="ubulk"><span>${selR.length} valdar${selH ? " · " + H(selH) + " klst." : ""}</span><select aria-label="Færa á verkefni" onchange="if(this.value)doAct('u1mv:'+this.value)"><option value="">Færa á verkefni ▾</option>${verkefni().filter(p => !isDone(p)).map(p => `<option value="${E(p.id)}">${E(p.nr + " " + (p.stutt || p.nafn || ""))}</option>`).join("")}</select><button type="button" data-act="u1sel:">Hætta við</button></div>` : "";
    const hd = `<div class="ucols uf"><span></span><span>Dags.</span><span>Lýsing · Verkefni</span><span>Magn</span><span class="r">Tegund</span></div>`;
    const body = rows.map(r => { const key = r.k + ":" + r.id, on = st.sel.has(key), x = d(r.date);
      return `<div class="urow uf${on ? " sel" : ""}" ${tapAttr(r.k, r.id)}><button type="button" class="ubox${on ? " on" : ""}" data-act="u1sel:${E(key)}" aria-label="Velja">${on ? "✓" : ""}</button><span class="m">${x ? x.getDate() + ". " + MNs[x.getMonth()] : ""}</span><span class="t">${E(r.lys)}<span class="m"> · ${E(r.p?.nr || "Innra")}</span></span><span class="m">${E(r.mag)}</span><span class="r">${pill(r.teg)}</span></div>`; }).join("") || `<div class="uempty">Engar færslur.</div>`;
    return lhead("Tímar", "Færslur", nb) + `<div class="ulbar">${chips([["", "Allt"], ["Tími", "Tímar"], ["Kostnaður", "Kostnaður"], ["Akstur", "Akstur"], ["Innra", "Innra"]], st.ff, "u1ff")}</div>` + bar + hd + body;
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
      const g = {}; es.forEach(e => { const p = findProj(e.verkefniId), key = st.grp === "verk" ? (p ? p.nr + " " + (p.stutt || p.nafn || "") : "Innra") : svidOf(p)[0]; g[key] = (g[key] || 0) + (+e.timar || 0); });
      const C = { "Þjónusta": "#1F5A96", "Leiga": "#5E86B3", "Sala": "#5E86B3", "Innra": "#9DB7D3" };
      return `<div class="uct"><h3>Hvert fer tíminn · ${E(lab)}</h3></div>${chips([["svid", "Eftir sviði"], ["verk", "Eftir verkefni"]], st.grp, "u1grp")}` + (Object.entries(g).sort((a, b) => b[1] - a[1]).map(([n, h]) => hbar(E(n), h, h / tot * 100, C[n])).join("") || `<div class="uempty">Engir tímar á tímabilinu.</div>`);
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
    if (st.rep === "vidsk") return head("Tímar", "Skýrslur", right) + tiles + `<div class="card ucard">${vTimar("skyr")}</div>`;
    const side = st.rep === "skylda" ? "aaetl" : "skylda";
    return head("Tímar", "Skýrslur", right) + tiles + `<div class="u2"><section class="card ucard">${repBody(st.rep, es, lab)}</section><section class="card ucard">${repBody(side, es, lab)}</section></div>`;
  };

  /* ---------- Listar með dálkum (Verkefni, Viðskiptavinir, Tilboð, Pantanir, Vörulisti) ---------- */
  const relD = iso => { const x = d(iso); if (!x) return ""; const n = Math.round((x - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 864e5);
    return n === 0 ? "í dag" : n === 1 ? "á morgun" : n > 1 && n <= 30 ? "eftir " + n + " daga" : x.getDate() + ". " + MNs[x.getMonth()]; };
  const row = (key, a, b, c, dd, s, dark, extra = "") => `<div class="urow" ${key}><span class="m">${a}</span><span class="t">${b}${c ? `<span class="m"> · ${c}</span>` : ""}</span><span class="m">${dd}</span><span class="r">${s ? pill(s, dark) : ""}</span>${extra}</div>`;
  const cols = (a, b, c, dd) => `<div class="ucols"><span>${a}</span><span>${b}</span><span>${c}</span><span class="r">${dd}</span></div>`;
  const grpH = l => `<div class="ugrp">${E(l)}</div>`;
  const nbtn = l => `<button type="button" class="btn primary" data-act="fabnew">+ ${E(l)}</button>`;
  st.vf = { verk: "gangi", lverk: "gangi", sverk: "gangi" };
  const mineP = p => (p.starfsfolk || p.starfsmenn || []).some(x => (x.sk || x) === ME()) || (window.projStaff && projStaff(p).some(x => (x.sk || x) === ME()));
  function vlist(key, title, pf) {
    const all = verkefni().filter(pf), f = st.vf[key] || "gangi";
    const xs = all.filter(p => f === "lokid" ? isDone(p) : !isDone(p) && (f !== "min" || mineP(p))).sort((a, b) => String(b.nr).localeCompare(String(a.nr), "is", { numeric: true }));
    const n = all.filter(p => !isDone(p)).length, nm = all.filter(p => !isDone(p) && mineP(p)).length;
    return lhead("Verkefni", title, nbtn("Verkefni")) + `<div class="ulbar">${chips([["gangi", "Í gangi · " + n], ["min", "Mín · " + nm], ["lokid", "Lokið"]], f, "u1vf:" + key)}</div>`
      + cols("Nr.", "Heiti · Viðskiptavinur", "Skil", "Staða")
      + (xs.map(p => row(tapAttr("verk", p.id), E(p.nr), E(p.stutt || p.nafn || ""), E(p.vidskiptavinur || ""), E(relD(p.skiladagur)), p.stada, false)).join("") || `<div class="uempty">Engin verkefni.</div>`);
  }
  U.verk = () => vlist("verk", "Öll verkefni", () => true);
  U.lverk = () => vlist("lverk", "Leiga", p => svidOf(p).includes("Leiga"));
  U.sverk = () => vlist("sverk", "Sala", p => svidOf(p).includes("Sala"));
  U.tverk = () => vlist("tverk", "Þjónusta", p => svidOf(p).includes("Þjónusta"));
  U.vsk = function () {
    const L = (S?.vidskiptavinir || []).filter(v => !window.inDeild || true).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "is"));
    const cnt = v => verkefni().filter(p => p.vskId === v.id && !isDone(p)).length;
    const f = st.vf.vsk || "", xs = L.filter(v => f === "opin" ? cnt(v) : f === "an" ? !cnt(v) : true);
    let h = "", last = "";
    xs.forEach(v => { const l = String(v.name || "?").charAt(0).toLocaleUpperCase("is"); if (l !== last) { h += grpH(l); last = l; } const n = cnt(v);
      h += `<div class="urow uv" ${tapAttr("vsk", v.id)}><span class="t">${E(v.name || "")}${v.tengilidur ? `<span class="m"> · ${E(v.tengilidur)}</span>` : ""}</span><span class="m">${n ? n + " verkefni" : ""}</span><span class="r">${pill(n ? "Í gangi" : "Óvirkur")}</span></div>`; });
    return lhead("", "Viðskiptavinir", nbtn("Viðskiptavinur")) + `<div class="ulbar">${chips([["", "Allir · " + L.length], ["opin", "Með opin verkefni"], ["an", "Án verkefna"]], f, "u1vf:vsk")}</div>`
      + `<div class="ucols uv"><span>Heiti · Tengiliður</span><span>Verkefni</span><span class="r">Staða</span></div>` + (h || `<div class="uempty">Engir viðskiptavinir.</div>`);
  };
  // Tilboð eftir sviði
  function tlist(key, title, teg) {
    const api = window.salaAPI; if (!api) return "";
    const all = api.TB().filter(T => !teg || (T.linur || []).some(l => l.teg === teg)), f = st.vf[key] || "opin";
    const xs = all.filter(T => f === "opin" ? ["Drög", "Sent"].includes(T.stada) : f === "samth" ? T.stada === "Samþykkt" : true).sort((a, b) => String(b.nr).localeCompare(String(a.nr), "is", { numeric: true }));
    const no = all.filter(T => ["Drög", "Sent"].includes(T.stada)).length, ns = all.filter(T => T.stada === "Samþykkt").length;
    return lhead("Tilboð", title, nbtn("Tilboð")) + `<div class="ulbar">${chips([["opin", "Opin · " + no], ["samth", "Samþykkt · " + ns], ["allt", "Allar stöður"]], f, "u1vf:" + key)}</div>`
      + cols("Nr.", "Heiti · Viðskiptavinur", "Dags.", "Staða")
      + (xs.map(T => row(tapAttr("tb", T.id), E(T.nr || ""), E(T.heiti || ""), E(T.vidskiptavinur || ""), E(T.fra ? relD(T.fra) : (T.dags || "").slice(5).split("-").reverse().join(".")), T.stada, T.stada === "Drög")).join("") || `<div class="uempty">Engin tilboð.</div>`);
  }
  U.ltilbod = () => tlist("ltilbod", "Öll tilboð", "");
  U.tbl = () => tlist("tbl", "Leiga", "leiga");
  U.tbs = () => tlist("tbs", "Sala", "sala");
  U.tbt = () => tlist("tbt", "Þjónusta", "vinna");
  const pnList = (title, teg) => function () {
    const api = window.salaAPI; if (!api) return "";
    const all = api.PN().filter(P => !teg || (P.linur || []).some(l => l.teg === teg)), f = st.vf.pn || "opnar", OP = ["Ný", "Staðfest"];
    const xs = all.filter(P => f === "opnar" ? OP.includes(P.stada) : f === "afh" ? P.stada === "Afhent" : ["Skilað", "Lokið"].includes(P.stada)).sort((a, b) => String(a.fra || "").localeCompare(String(b.fra || "")));
    return lhead("Pantanir", title, nbtn("Pöntun")) + `<div class="ulbar">${chips([["opnar", "Opnar · " + all.filter(P => OP.includes(P.stada)).length], ["afh", "Afhentar · " + all.filter(P => P.stada === "Afhent").length], ["lokid", "Lokið"]], f, "u1vf:pn")}</div>`
      + cols("Nr.", "Heiti · Viðskiptavinur", "Afhending", "Staða")
      + (xs.map(P => row(tapAttr("tb", P.id), E(P.nr || ""), E(P.heiti && P.heiti !== "Pöntun" ? P.heiti : ""), E(P.vidskiptavinur || P.tengilidur || ""), E(relD(P.fra)), P.stada, P.stada === "Ný")).join("") || `<div class="uempty">Engar pantanir.</div>`);
  };  U.pantanir = pnList("Allar", ""); U.pnl = pnList("Leiga", "leiga"); U.pns = pnList("Sala", "sala"); U.pnt = pnList("Þjónusta", "vinna");

  // Vörulisti: Leiga (eftir forskeyti vörunúmers) og Sala (eftir flokki)
  const freeCol = (f, tot) => { const r = tot ? f / tot : 0, t = Math.pow(1 - r, 1.6), c = [0x6B, 0x76, 0x82].map((g, i) => Math.round(g + ([0xC6, 0x28, 0x28][i] - g) * t)); return `<span class="ufree" style="color:rgb(${c.join(",")});font-weight:${r <= .25 ? 600 : 500}">${f}</span>`; };
  U.lvorur = function () {
    const api = window.salaAPI; if (!api) return "";
    const iso = isoD(today), xs = api.VR().filter(v => api.vDeild(v) === "leiga" && v.tegund !== "vinna").sort((a, b) => String(a.nr || "").localeCompare(String(b.nr || ""), "is", { numeric: true }));
    let h = "", last = "";
    xs.forEach(v => { const g = v.tegund === "pakki" ? "Pakkar" : (String(v.nr || "").split("-")[0] || "–") + (v.flokkur ? " · " + v.flokkur : ""); if (g !== last) { h += grpH(g); last = g; }
      const tot = +v.fjoldi || 0, free = v.tegund === "pakki" ? "" : Math.max(0, tot - u1Ovirk(v) - (api.upptekid(v.id, iso, iso).max || 0));
      h += `<div class="urow ul" ${tapAttr("vara", v.id)}><span class="m">${E(v.nr || "")}</span><span class="t">${E(v.heiti || "")}${u1OpinSkemmd(v) ? ' <i class="udot" title="Þarf skoðun"></i>' : ""}</span><span class="m">${v.tegund === "pakki" ? "" : tot}</span>${free === "" ? "<span></span>" : freeCol(free, tot)}<span class="r">${pill(kr(v.leiguverd))}</span></div>`; });
    return lhead("Vörulisti", "Leiga", nbtn("Búnaður")) + `<div class="ucols ul"><span>Vnr.</span><span>Heiti</span><span>Magn</span><span>Laust</span><span class="r">Verð/dag</span></div>` + (h || `<div class="uempty">Enginn leigubúnaður.</div>`);
  };
  U.svorur = function () {
    const api = window.salaAPI; if (!api) return "";
    const fr = {}; api.TB().filter(T => ["Drög", "Sent"].includes(T.stada)).forEach(T => (T.linur || []).forEach(l => { if (l.teg === "sala" && l.v) fr[l.v] = (fr[l.v] || 0) + (+l.magn || 0); }));
    const xs = api.VR().filter(v => api.vDeild(v) === "sala" && v.tegund !== "vinna").sort((a, b) => String(a.flokkur || "").localeCompare(String(b.flokkur || ""), "is") || String(a.nr || "").localeCompare(String(b.nr || ""), "is", { numeric: true }));
    let h = "", last = "";
    xs.forEach(v => { const g = v.flokkur || "Annað"; if (g !== last) { h += grpH(g); last = g; } const tot = +v.fjoldi || 0, free = Math.max(0, tot - (fr[v.id] || 0)), low = tot <= (+v.lagmark || 2);
      h += `<div class="urow ul" ${tapAttr("vara", v.id)}><span class="m">${E(v.nr || "")}</span><span class="t">${E(v.heiti || "")}${low ? ' <i class="udot" title="Lítið á lager"></i>' : ""}</span><span class="m">${tot}</span>${low ? `<span class="ufree red" style="font-weight:600">${free}</span>` : freeCol(free, tot)}<span class="r">${pill(kr(v.soluverd))}</span></div>`; });
    return lhead("Vörulisti", "Sala", nbtn("Vara")) + `<div class="ucols ul"><span>Vnr.</span><span>Heiti</span><span>Lager</span><span>Laust</span><span class="r">Verð</span></div>` + (h || `<div class="uempty">Engar söluvörur.</div>`);
  };

  /* ---------- Vörulisti › Þjónusta (vinna og tæknifólk): enginn lager, ekkert dagatal ---------- */
  U.vvinna = function () {
    const api = window.salaAPI; if (!api) return "";
    const all = api.VR().filter(v => v.tegund === "vinna"), fl = [...new Set(all.map(v => v.flokkur || "Annað"))], f = st.vf.vvinna || "";
    const xs = all.filter(v => !f || (v.flokkur || "Annað") === f).sort((a, b) => String(a.flokkur || "").localeCompare(String(b.flokkur || ""), "is") || String(a.nr || "").localeCompare(String(b.nr || ""), "is", { numeric: true }));
    let h = "", last = "";
    xs.forEach(v => { const g = v.flokkur || "Annað"; if (g !== last) { h += grpH(g); last = g; }
      h += `<div class="urow uv3" ${tapAttr("vara", v.id)}><span class="m">${E(v.nr || "")}</span><span class="t">${E(v.heiti || "")}</span><span class="m">${E(v.eining || "")}</span><span class="r">${pill(kr(v.soluverd || v.leiguverd))}</span></div>`; });
    return lhead("Vörulisti", "Þjónusta", nbtn("Þjónusta")) + `<div class="ulbar">${chips([["", "Allar · " + all.length], ...fl.map(x => [x, x])], f, "u1vf:vvinna")}</div>`
      + `<div class="ucols uv3"><span>Vnr.</span><span>Heiti</span><span>Eining</span><span class="r">Verð</span></div>` + (h || `<div class="uempty">Engin þjónusta skráð.</div>`);
  };
  window.u1VinnaYfir = function (v) {
    const api = window.salaAPI, mine = T => (T.linur || []).filter(l => String(l.v) === String(v.id)), q = T => mine(T).reduce((a, l) => a + (+l.magn || 0), 0);
    const docs = [...api.TB().filter(T => T.stada === "Samþykkt"), ...api.PN().filter(P => P.stada !== "Ný")].filter(T => mine(T).length);
    const ti = isoD(today), y0 = today.getFullYear() + "-01-01", m12 = isoD(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
    const when = T => String(T.fra || T.dags || "").slice(0, 10), past = docs.filter(T => when(T) <= ti), fut = docs.filter(T => when(T) > ti).sort((a, b) => when(a).localeCompare(when(b)));
    const sold12 = past.filter(T => when(T) >= m12).reduce((a, T) => a + q(T), 0), rev = past.filter(T => when(T) >= y0).reduce((a, T) => a + mine(T).reduce((b, l) => b + (api.lSum(l, T) || 0), 0), 0);
    const open = api.TB().filter(T => ["Drög", "Sent"].includes(T.stada) && mine(T).length), ein = v.eining || "klst.";
    const fm = +v.soluverd && +v.innkaupsverd ? Math.round((1 - v.innkaupsverd / v.soluverd) * 100) + " %" : "–";
    const rng = T => { const a = d(T.fra), b = d(T.til); return a ? a.getDate() + "." + (b && +b !== +a ? "–" + b.getDate() + "." : "") + " " + MNs[(b || a).getMonth()] : ""; };
    const ln = (T, extra) => `<a class="uln" ${tapAttr("tb", T.id)}><span>${E(T.nr || "")} ${E(T.heiti || T.vidskiptavinur || "")}<small>${rng(T) ? " · " + rng(T) : ""}${extra ? " · " + extra : ""}</small></span>${pill(H(q(T)) + " " + ein)}</a>`;
    const now = new Date(), vals = [...Array(12)].map((_, i) => { const dd = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1), k = dd.getFullYear() + "-" + String(dd.getMonth() + 1).padStart(2, "0"); return [MNs[dd.getMonth()], past.filter(T => when(T).startsWith(k)).reduce((a, T) => a + q(T), 0)]; });
    const mx = Math.max(1, ...vals.map(x => x[1]));
    return `<div class="ukpis">${kpiB(ein === "klst." ? "Tímaverð" : "Verð", kr(v.soluverd || v.leiguverd))}${kpiB("Selt 12 mán.", H(sold12) + " " + ein)}${kpiB("Tekjur í ár", kr(rev))}${kpiB("Á tilboðum", open.length)}</div>`
      + `<div class="uminis">${mini("Eining", E(ein))}${mini("Flokkur", E(v.flokkur || "–"))}${mini("Kostnaðarverð", v.innkaupsverd ? kr(v.innkaupsverd) : "–")}${mini("Framlegð", fm)}</div>`
      + `<div class="u2c"><div><div class="ush2"><span>Bókað framundan</span></div>${fut.map(T => ln(T)).join("") || `<div class="usub" style="padding:6px 0">Ekkert bókað framundan.</div>`}</div>`
      + `<div><div class="ush2"><span>Á tilboðum</span></div>${open.map(T => ln(T, T.stada.toLowerCase())).join("") || `<div class="usub" style="padding:6px 0">Ekki á opnum tilboðum.</div>`}</div></div>`
      + `<div class="card ucard"><div class="ush">Selt á mánuði · ${H(sold12)} ${E(ein)} síðustu 12 mán.</div><div class="vybars">${vals.map(([l, n], i) => `<div class="vyb" style="height:120px"><span class="vyv${i === 11 ? " on" : ""}">${n ? H(n) : ""}</span><div class="vys"><i style="height:${Math.round(n / mx * 80)}px;background:${i === 11 ? "#1F5A96" : "#BFD0E3"}"></i></div><span class="vyl">${l}</span></div>`).join("")}</div></div>`;
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
  // QR-merki: prentsíða með merki á hvert eintak (qrcodejs af cdnjs), slóð appsins + ?e=<eintak>
  function printQR(v) {
    const base = (ORG.appUrl || location.origin + location.pathname).split("?")[0], es = v.eintok || [];
    const w = window.open("", "_blank"); if (!w) { toast?.("Leyfðu sprettiglugga til að prenta merki"); return; }
    w.document.write(`<!doctype html><meta charset="utf-8"><title>QR-merki ${E(v.nr || "")}</title><style>body{font-family:Poppins,Arial,sans-serif;margin:12mm}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}.l{border:1px solid #ccc;border-radius:3mm;padding:3mm;display:flex;gap:3mm;align-items:center;break-inside:avoid}.l b{display:block;font-size:12pt}.l small{font-size:9pt;color:#555}@media print{button{display:none}}</style><button onclick="print()">Prenta</button><div class="g">${es.map((e, i) => `<div class="l"><div id="q${i}"></div><div><b>${E(e.nr)}</b><small>${E(v.heiti || "")}<br>${E(ORG.nafn || "")}</small></div></div>`).join("")}</div><script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script><script>${JSON.stringify(es.map(e => base + "?e=" + encodeURIComponent(e.nr)))}.forEach((u,i)=>new QRCode(document.getElementById("q"+i),{text:u,width:84,height:84}));<\/script>`);
    w.document.close();
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
  if (typeof STPAGES !== "undefined") STPAGES.svid = { l: "Svið", d: "Leiga, Sala og Þjónusta – flokkun verkefna og tilboða", s: [], adm: 1, fn: () => {
    const row = (k, desc, on, ein) => `<div class="uvs sv"><b>${E(k)}</b><span class="m">${E(desc)}</span><input type="text" value="${E(CFG().svid?.[k]?.heiti || "")}" placeholder="${E(k)}" aria-label="Heiti sviðsins ${E(k)}" onchange="doAct('u1svh:${k}:'+this.value)"><span>${ein ? `<a href="#" data-act="stsub:einingar">${on ? "Virkt" : "Óvirkt"} ›</a>` : "Alltaf virkt"}</span></div>`;
    return `<div class="card ucard"><div class="unote" style="margin-top:0">Verkefni og tilboð flokkast sjálfkrafa á svið eftir línum tilboða og deild verkefnis. Hvert fyrirtæki getur endurnefnt sviðin, t.d. Þjónusta → Tækniþjónusta.</div><div class="uvs sv h"><span>Svið</span><span>Til hvers</span><span>Heiti hjá fyrirtækinu</span><span>Virkt</span></div>`
      + row("Leiga", "Útleiga á búnaði", ON("leiga"), 1) + row("Sala", "Sala á vörum af lager", ON("sala"), 1) + row("Þjónusta", "Vinna, tæknifólk, uppsetning", true, 0) + `</div>`; } };

  /* ---------- Verkefni › Yfirlit: lykiltölur, opin undirverk og hlutar eftir sviði (Leiga: búnaður og tæknifólk; Sala: vörur) ---------- */
  window.u1VerkYfir = function (id, unb) {
    const p = findProj(id); if (!p) return "";
    const api = window.salaAPI, sv = svidOf(p), tbs = api ? api.TB().filter(T => T.verkefniId === p.id && !T.pontun) : [];
    const sam = tbs.filter(T => T.stada === "Samþykkt"), sumT = xs => xs.reduce((a, T) => a + (T.linur || []).reduce((b, l) => b + (api.lSum(l, T) || 0), 0), 0);
    const samV = sam.length ? sumT(sam) : (+p.tilbod || 0), src = sam.length ? sam : tbs.filter(T => T.stada !== "Hafnað");
    const lines = teg => src.flatMap(T => (T.linur || []).filter(l => l.teg === teg).map(l => ({ l, T })));
    const kp = (l, v) => `<div class="ukp"><small>${E(l)}</small><b>${v}</b></div>`;
    const rng = T => { const a = d(T.fra), b = d(T.til); if (!a) return ""; return a.getDate() + "." + (b && +b !== +a ? "–" + b.getDate() + "." : "") + " " + MNs[(b || a).getMonth()]; };
    const row = (t, r) => `<div class="uln"><span>${t}</span>${r}</div>`;
    const lg = sv.includes("Leiga") ? lines("leiga") : [], vn = lines("vinna"), sl = sv.includes("Sala") ? lines("sala") : [];
    const vnH = vn.filter(x => /klst/.test(x.l.ein || "")).reduce((a, x) => a + (+x.l.magn || 0), 0);
    const tbK = () => sam.length || !src.length ? kp("Samþykkt tilboð", samV ? kr(samV) : "–") : kp("Tilboð · " + src[0].stada.toLowerCase(), kr(sumT(src)));
    const more = (xs, f) => xs.slice(0, 6).map(f).join("") + (xs.length > 6 ? `<a class="uln" href="#" data-act="dtab:tilbod"><span class="m">+ ${xs.length - 6} fleiri línur á tilboði</span><span class="m">→</span></a>` : "");
    let k;
    if (sv.includes("Leiga")) k = [tbK(), kp("Búnaður", lg.length ? lg.reduce((a, x) => a + (+x.l.magn || 0), 0) + " tæki " + (sam.length ? "frátekin" : "á tilboði") : "–"), kp("Tæknifólk", vn.length ? vn.length + " · " + H(vnH) + " klst." : "–")];
    else if (sv.includes("Sala")) k = [tbK(), kp("Vörur", sl.length ? sl.reduce((a, x) => a + (+x.l.magn || 0), 0) + " stk." : "–"), kp("Tímar", H(p.timar || 0) + (p.aklst ? " af " + H(p.aklst) : "") + " klst.")];
    else k = [kp("Tímar", H(p.timar || 0) + (p.aklst ? " af " + H(p.aklst) : "") + " klst."), kp("Óreikningsfært", unb || "–"), tbK()];
    let h = `<div class="ukps">${k.join("")}</div>`;
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
    const xs = (f === "fram" ? fram.sort((a, b) => String(a.date).localeCompare(String(b.date))) : f === "lidnir" ? lidnir.sort((a, b) => String(b.date).localeCompare(String(a.date))) : endur);
    return lhead("Dagatal", "Fundir", nbtn("Fundur")) + `<div class="ulbar">${chips([["fram", "Framundan · " + fram.length], ["lidnir", "Liðnir · " + lidnir.length], ["endur", "Endurteknir" + (endur.length ? " · " + endur.length : "")]], f, "u1vf:fundir")}</div>`
      + `<div class="ucols uf5"><span>Dags.</span><span>Fundur</span><span>Verkefni</span><span>Kl.</span><span class="r"></span></div>`
      + (xs.map(m => { const p = m.projectId ? findProj(m.projectId) : null, n = daysTo(m.date);
        return `<div class="urow uf5" ${tapAttr("fund", m.id)}><span class="m">${E(fmtD(m.date))}</span><span class="t">${E(m.name || "Fundur")}</span><span class="m">${E(p?.nr || m.stadsetning || "")}</span><span class="m">${E(hhmm(m.date) || "")}</span><span class="r">${pill(n === 0 ? "Í dag" : n > 0 ? "Framundan" : "Liðinn", n === 0)}</span></div>`; }).join("") || `<div class="uempty">Engir fundir.</div>`);
  };
  /* ---------- Reikningar (dálkalisti: óreikningsfært + reikningar) ---------- */
  U.trk = function () {
    const f = st.vf.trk || "allt", R = (S?.reikningar || []).filter(r => r.stada !== "Ógilt");
    const ub = window.rkUnbilledKr ? verkefni().map(p => { const u = rkUnbilled(p.id); return { p, h: sumT(u.es), kr: rkUnbilledKr(p.id) }; }).filter(x => x.h >= 0.5 || x.kr > 0).sort((a, b) => b.kr - a.kr) : [];
    const og = R.filter(r => r.stada !== "Greitt"), gr = R.filter(r => r.stada === "Greitt");
    const tot = ub.reduce((a, x) => a + x.kr, 0) + og.reduce((a, r) => a + (+r.tot || 0), 0), mkr = n => (Math.round(n / 1e5) / 10).toLocaleString("de-DE") + " m.kr.";
    const showU = f === "allt" || f === "oreikn", rs = f === "ogr" ? og : f === "gr" ? gr : f === "allt" ? og : [];
    const rowU = x => `<div class="urow uf5" ${tapAttr("verk", x.p.id)}><span class="m">Óreikn.</span><span class="t">${E(x.p.nr)} ${E(x.p.stutt || "")}</span><span class="m">${H(x.h)} klst.</span><span class="m"></span><span class="r">${E(kr(x.kr))}</span></div>`;
    const rowR = r => { const p = findProj(r.verkefniId), late = r.stada !== "Greitt" && daysTo(r.gjalddagi) < 0;
      return `<div class="urow uf5" ${tapAttr("reikn", r.id)}><span class="m">${E(String(r.nr).padStart(3, "0"))}</span><span class="t">${E(r.kaupandi?.name || "")}${late ? ' <i class="udot" title="Fram yfir gjalddaga"></i>' : ""}</span><span class="m">${E(p?.nr || "")}</span><span class="m">${E(String(r.dags || "").slice(5).split("-").reverse().join("."))}</span><span class="r">${E(kr(r.tot))}</span></div>`; };
    return lhead("", "Reikningar", nbtn("Reikningur").replace('data-act="fabnew"', 'data-act="rknew:"')) + `<div class="ulbar">${chips([["allt", "Óinnheimt · " + mkr(tot)], ["oreikn", "Óreikningsfært · " + ub.length], ["ogr", "Ógreitt · " + og.length], ["gr", "Greitt · " + gr.length]], f, "u1vf:trk")}</div>`
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
    const keys = [["verk", "Verkefni " + vs.length], ...(api ? [["tb", "Tilboð " + tb.length]] : []), ...(api && pn.length ? [["pn", "Pantanir " + pn.length]] : []), ...(ON("reikningar") ? [["rk", "Reikningar " + rk.length]] : []), ["upp", "Upplýsingar"]];
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
  const kp4 = arr => `<div class="ukps k4">${arr.map(([l, v]) => `<div class="ukp"><small>${E(l)}</small><b>${v}</b></div>`).join("")}</div>`;
  const dcard = (title, rows, more, empty) => `<section class="card ucard uhc"><div class="uhch"><h3>${E(title)}</h3>${more ? `<a href="#" data-act="tab:${more}">Sjá allt →</a>` : ""}</div>${rows.length ? rows.slice(0, 6).join("") : `<div class="usub" style="padding:10px 0">${E(empty || "Ekkert hér.")}</div>`}</section>`;
  const drow = (attr, a, b, pl, dark) => `<a class="uhrow" ${attr}><span><b>${a}</b><small>${b || ""}</small></span>${pl ? pill(pl, dark) : ""}</a>`;
  const svCards = (items, tabs, lab) => `<div class="usvc">${SV.filter(x => x !== "Leiga" || ON("leiga")).filter(x => x !== "Sala" || ON("sala")).map(x => { const it = items(x); return `<section class="card ucard" data-act="tab:${tabs[x]}" role="button" tabindex="0"><small class="m">${E(svH(x))}</small><b class="n">${it.n}</b><span class="usub">${E(it.t)}</span></section>`; }).join("")}</div>`;
  const tbSum = T => (T.linur || []).reduce((a, l) => a + (window.salaAPI.lSum(l, T) || 0), 0);
  const hasTeg = (T, x) => (T.linur || []).some(l => l.teg === SVT[x]);
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
    const cnt = c => verkefni().filter(p => p.vskId === c.id && !isDone(p)).length, f = st.vf[key] || "", xs = all.filter(c => f === "opin" ? cnt(c) : true);
    let h = "", last = "";
    xs.forEach(c => { const l = String(c.name || "?").charAt(0).toLocaleUpperCase("is"); if (l !== last) { h += grpH(l); last = l; } const n = cnt(c);
      h += `<div class="urow uv" ${tapAttr("vsk", c.id)}><span class="t">${E(c.name || "")}${c.tengilidur ? `<span class="m"> · ${E(c.tengilidur)}</span>` : ""}</span><span class="m">${n ? n + " verkefni" : ""}</span><span class="r">${pill(n ? "Í gangi" : "Óvirkur")}</span></div>`; });
    return lhead("Viðskiptavinir", svH(x), nbtn("Viðskiptavinur")) + `<div class="ulbar">${chips([["", "Allir · " + all.length], ["opin", "Með opin verkefni"]], f, "u1vf:" + key)}</div>`
      + `<div class="ucols uv"><span>Heiti · Tengiliður</span><span>Verkefni</span><span class="r">Staða</span></div>` + (h || `<div class="uempty">Engir viðskiptavinir á þessu sviði.</div>`);
  };
  U.vskl = vskList("vskl", "Leiga"); U.vsks = vskList("vsks", "Sala"); U.vskt = vskList("vskt", "Þjónusta");
  U.vskyf = function () {
    const api = window.salaAPI, L = S?.vidskiptavinir || [], m12 = isoD(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
    const rev = c => api ? api.TB().filter(T => T.stada === "Samþykkt" && String(T.fra || T.dags) >= m12 && (String(T.vskId || "") === String(c.id) || T.vidskiptavinur === c.name)).reduce((a, T) => a + tbSum(T), 0) : 0;
    const act = L.filter(c => verkefni().some(p => p.vskId === c.id && !isDone(p))), none = L.filter(c => !vskSvid(c).size);
    const top = L.map(c => ({ c, r: rev(c) })).filter(x => x.r).sort((a, b) => b.r - a.r), tot = top.reduce((a, x) => a + x.r, 0);
    const nyj = L.slice().sort((a, b) => String(b.stofnad || b.id).localeCompare(String(a.stofnad || a.id))).slice(0, 6);
    return head("Viðskiptavinir", "Yfirlit", nbtn("Viðskiptavinur")) + kp4([["Viðskiptavinir", L.length], ["Með opin verkefni", act.length], ["Tekjur 12 mán.", api ? mkr(tot) : "–"], ["Án viðskipta", none.length]])
      + svCards(x => { const n = L.filter(c => vskSvid(c).has(x)).length; return { n, t: "viðskiptavinir" }; }, { Leiga: "vskl", Sala: "vsks", "Þjónusta": "vskt" })
      + `<div class="udash">${dcard("Stærstu viðskiptavinir · 12 mán.", top.map(({ c, r }) => drow(go("vskt", "vsk:" + c.id), E(c.name), E(kr(r)), Math.round(r / Math.max(1, tot) * 100) + " %")), "", "Engin samþykkt tilboð síðustu 12 mánuði.")}`
      + dcard("Með opin verkefni", act.map(c => { const n = verkefni().filter(p => p.vskId === c.id && !isDone(p)).length; return drow(go("vskt", "vsk:" + c.id), E(c.name), E(c.tengilidur || ""), n + " verkefni"); }), "", "Enginn með opin verkefni.")
      + dcard("Án viðskipta", none.map(c => drow(go("vsk", "vsk:" + c.id), E(c.name), E(c.tengilidur || ""), "Nýr")), "vsk", "Allir viðskiptavinir eru með verkefni eða tilboð.") + `</div>`;
  };

  U.pnyf = function () {
    const api = window.salaAPI; if (!api) return head("Pantanir", "Yfirlit");
    const all = api.PN(), ti = isoD(today), ny = all.filter(P => P.stada === "Ný"), stf = all.filter(P => P.stada === "Staðfest"), af = all.filter(P => P.stada === "Afhent");
    const late = af.filter(P => (P.til || P.fra) < ti), wk = all.filter(P => ["Ný", "Staðfest"].includes(P.stada) && daysTo(P.fra) >= 0 && daysTo(P.fra) <= 7).sort((a, b) => String(a.fra).localeCompare(String(b.fra)));
    const skil = af.slice().sort((a, b) => String(a.til || a.fra).localeCompare(String(b.til || b.fra)));
    const nm = P => E((P.nr || "") + " " + (P.heiti && P.heiti !== "Pöntun" ? P.heiti : "")), who = P => E(P.vidskiptavinur || P.tengilidur || "");
    return head("Pantanir", "Yfirlit", nbtn("Pöntun")) + kp4([["Nýjar", ny.length], ["Staðfestar", stf.length], ["Úti / bíða skila", af.length], ["Skil komin fram yfir", late.length]])
      + svCards(x => { const xs = all.filter(P => !["Skilað", "Lokið"].includes(P.stada) && hasTeg(P, x)); return { n: xs.length, t: "opnar pantanir" }; }, { Leiga: "pnl", Sala: "pns", "Þjónusta": "pnt" })
      + `<div class="udash">${dcard("Nýjar – þarf að staðfesta", ny.map(P => drow(go("pantanir", "tb:" + P.id), nm(P), who(P) + " · " + E(fmtD(P.fra)), "Ný", true)), "pantanir", "Engar nýjar pantanir.")}`
      + dcard("Afhendingar næstu 7 daga", wk.map(P => drow(go("pantanir", "tb:" + P.id), nm(P), who(P) + " · " + E(fmtD(P.fra)), P.stada)), "pantanir", "Engar afhendingar næstu 7 daga.")
      + dcard("Bíða skila", skil.map(P => drow(go("pantanir", "tb:" + P.id), nm(P), who(P) + " · skil " + E(fmtD(P.til || P.fra)), (P.til || P.fra) < ti ? "Seint" : "Úti", (P.til || P.fra) < ti)), "pantanir", "Ekkert úti.") + `</div>`;
  };

  U.tbyf = function () {
    const api = window.salaAPI; if (!api) return head("Tilboð", "Yfirlit");
    const all = api.TB(), open = all.filter(T => ["Drög", "Sent"].includes(T.stada)), d90 = all.filter(T => daysTo(T.dags) >= -90);
    const won = d90.filter(T => T.stada === "Samþykkt"), lost = d90.filter(T => T.stada === "Hafnað"), rate = won.length + lost.length ? Math.round(won.length / (won.length + lost.length) * 100) + " %" : "–";
    const wait = all.filter(T => T.stada === "Sent").sort((a, b) => String(a.sent || a.dags).localeCompare(String(b.sent || b.dags))), drog = all.filter(T => T.stada === "Drög");
    return head("Tilboð", "Yfirlit", nbtn("Tilboð")) + kp4([["Opin tilboð", open.length + " · " + mkr(open.reduce((a, T) => a + tbSum(T), 0))], ["Samþykkt 90 daga", won.length + " · " + mkr(won.reduce((a, T) => a + tbSum(T), 0))], ["Hlutfall samþykkt", rate], ["Bíða svars > 7 daga", wait.filter(T => daysTo(T.sent || T.dags) <= -7).length]])
      + svCards(x => { const xs = open.filter(T => hasTeg(T, x)); return { n: xs.length, t: "opin tilboð · " + mkr(xs.reduce((a, T) => a + tbSum(T), 0)) }; }, { Leiga: "tbl", Sala: "tbs", "Þjónusta": "tbt" })
      + `<div class="udash">${dcard("Bíða svars", wait.map(T => drow(go("ltilbod", "tb:" + T.id), E((T.nr || "") + " " + (T.heiti || "")), E((T.vidskiptavinur || "") + " · sent " + fmtD(T.sent || T.dags)), kr(tbSum(T)), daysTo(T.sent || T.dags) <= -7)), "ltilbod", "Ekkert bíður svars.")}`
      + dcard("Drög", drog.map(T => drow(go("ltilbod", "tb:" + T.id), E((T.nr || "") + " " + (T.heiti || "")), E(T.vidskiptavinur || ""), kr(tbSum(T)))), "ltilbod", "Engin drög.")
      + dcard("Nýlega samþykkt", won.sort((a, b) => String(b.dags).localeCompare(String(a.dags))).map(T => drow(go("ltilbod", "tb:" + T.id), E((T.nr || "") + " " + (T.heiti || "")), E(T.vidskiptavinur || ""), kr(tbSum(T)), true)), "ltilbod", "Ekkert samþykkt síðustu 90 daga.") + `</div>`;
  };

  U.timyf = function () {
    const a = mondayOf(today), fs = faerslur(), wk = fs.filter(e => d(e.date) >= a), g = goal();
    const staff = STARFS().filter(x => fs.some(e => e.starfsmadur === x.sk));
    const me = wk.filter(e => (e.starfsmadur || ME()) === ME()).reduce((s, e) => s + (+e.timar || 0), 0), team = wk.reduce((s, e) => s + (+e.timar || 0), 0);
    const m0 = new Date(today.getFullYear(), today.getMonth(), 1), mo = fs.filter(e => d(e.date) >= m0);
    const by = {}; mo.forEach(e => { const p = findProj(e.verkefniId), k = p ? svidOf(p)[0] : "Innra"; by[k] = (by[k] || 0) + (+e.timar || 0); });
    const moT = Object.values(by).reduce((s, x) => s + x, 0), unb = window.rkUnbilled ? verkefni().reduce((s, p) => s + sumT(rkUnbilled(p.id).es), 0) : 0;
    const skil = S?.timar?.skil || {}, ws = isoD(a), notS = staff.filter(x => !(skil[x.sk] || []).includes(isoD(new Date(a.getTime() - 7 * 864e5))));
    return head("Tímar", "Yfirlit", btn("Opna vikuna", "tab:timar", "primary")) + kp4([["Þín vika", H(me) + " af " + H(g) + " klst."], ["Teymið í viku", H(team) + " klst."], ["Þessi mánuður", H(moT) + " klst."], ["Óreikningsfært", H(unb) + " klst."]])
      + `<div class="udash">${dcard("Vikan hjá teyminu", staff.map(x => { const h = wk.filter(e => e.starfsmadur === x.sk).reduce((s, e) => s + (+e.timar || 0), 0); return `<div class="ubr"><span>${E(x.nafn || x.sk)}</span><div class="ubar"><i style="width:${Math.min(100, h / g * 100)}%"></i></div><span>${H(h)} klst.</span></div>`; }), "tskyr", "Engir tímar skráðir.")}`
      + dcard("Hvert fer tíminn · " + MNs[today.getMonth()], [...SV, "Innra"].filter(k => by[k]).map(k => `<div class="ubr"><span>${E(k === "Innra" ? k : svH(k))}</span><div class="ubar"><i style="width:${moT ? by[k] / moT * 100 : 0}%"></i></div><span>${Math.round(moT ? by[k] / moT * 100 : 0)} %</span></div>`), "tskyr", "Engir tímar í mánuðinum.")
      + dcard("Síðasta vika – óskilað", notS.map(x => drow(go("tskyr", ""), E(x.nafn || x.sk), "hefur ekki skilað síðustu viku", "Óskilað")), "tskyr", "Allir hafa skilað síðustu viku.") + `</div>`;
  };

  /* ---------- Heim: Yfirlit, Óklárað, Framundan, Tilkynningar ---------- */
  const fmtD = w => { const x = d(w); if (!x) return ""; const n = daysTo(w); return n === 0 ? "í dag" : n === 1 ? "á morgun" : n === -1 ? "í gær" : x.getDate() + ". " + MNs[x.getMonth()]; };
  const att = it => it.open ? tapAttr(it.open.split(":")[0], it.open.slice(it.open.indexOf(":") + 1)) : `data-act="${it.act}" role="button" tabindex="0"`;
  const tbOn = () => (window.tbOK ? tbOK() : (ON("leiga") || ON("sala")));
  function oklItems() {
    const R = [], api = window.salaAPI;
    upcoming().filter(i => daysTo(i.when) < 0).forEach(i => R.push({ grp: "Komið fram yfir", k: "Verkefni", title: i.title, sub: [i.kind, i.nr].filter(Boolean).join(" · "), date: i.when, pill: "Seint", dark: 1, open: i.open }));
    if (window.pnOpnar) { const ti = isoD(today); pnOpnar().forEach(P => { if (P.stada === "Ný") R.push({ grp: "Pantanir", k: "Pöntun", title: (P.nr || "") + " " + (P.heiti && P.heiti !== "Pöntun" ? P.heiti : ""), sub: P.vidskiptavinur || P.tengilidur || "", date: P.fra, pill: "Ný", dark: 1, open: "tb:" + P.id });
      else if (P.stada === "Afhent" && (P.til || P.fra) < ti) R.push({ grp: "Pantanir", k: "Pöntun", title: (P.nr || "") + " skil", sub: P.vidskiptavinur || "", date: P.til || P.fra, pill: "Seint", dark: 1, open: "tb:" + P.id }); }); }
    if (tbOn() && api) api.TB().filter(T => T.stada === "Sent" && daysTo(T.sent || T.dags) <= -7).forEach(T => R.push({ grp: "Svör", k: "Tilboð", title: (T.nr || "") + " " + (T.heiti || ""), sub: "bíður svars í " + -daysTo(T.sent || T.dags) + " daga", date: T.sent || T.dags, pill: "Svar", open: "tb:" + T.id }));
    verkD().filter(p => p.stada === STODUR()[0]?.n && !isDone(p)).forEach(p => R.push({ grp: "Svör", k: "Verkefni", title: p.nr + " " + (p.stutt || ""), sub: p.vidskiptavinur || "", date: p.stofnad_t, pill: STODUR()[0].n, open: "verk:" + p.id }));
    if (ON("reikningar") && window.can && can("fjarmal")) {
      if (window.rkUnbilled) verkefni().forEach(p => { const x = rkUnbilled(p.id), h = sumT(x.es); if (h >= 1 || sumK(x.ks)) R.push({ grp: "Fjármál", k: "Fjármál", title: "Óreikningsfært · " + p.nr + " " + (p.stutt || ""), sub: H(h) + " klst." + (sumK(x.ks) ? " + " + kr(sumK(x.ks)) : ""), date: "", pill: "Búa til", act: "tab:trk" }); });
      (S?.reikningar || []).filter(r => r.stada !== "Greitt" && r.stada !== "Ógilt").forEach(r => R.push({ grp: "Fjármál", k: "Fjármál", title: "Ógreiddur reikningur " + (r.nr || ""), sub: (r.kaupandi?.name || "") + " · " + kr(r.tot), date: r.gjalddagi, pill: daysTo(r.gjalddagi) < 0 ? "Seint" : "Opna", dark: daysTo(r.gjalddagi) < 0, open: "reikn:" + r.id }));
    }
    if (api) api.VR().forEach(v => { const n = window.u1OpinSkemmd ? u1OpinSkemmd(v) : 0; if (n) R.push({ grp: "Lager", k: "Lager", title: (v.nr || "") + " " + (v.heiti || ""), sub: n + " " + (n === 1 ? "skemmd bíður" : "skemmdir bíða") + " skoðunar", date: "", pill: "Ástand", open: "vara:" + v.id });
      if (api.vDeild(v) === "sala" && +v.lagmark && (+v.fjoldi || 0) < +v.lagmark) R.push({ grp: "Lager", k: "Lager", title: (v.nr || "") + " " + (v.heiti || ""), sub: (+v.fjoldi || 0) + " á lager · lágmark " + v.lagmark, date: "", pill: "Panta inn", open: "vara:" + v.id }); });
    const ofl = (window.MS_OFL || []).length; if (ON("postur") && ofl) R.push({ grp: "Póstur", k: "Póstur", title: ofl + " " + (ofl === 1 ? "póstur" : "póstar") + " til að tengja verkefni", sub: "Microsoft 365", date: "", pill: "Tengja", act: "tab:postur" });
    return R;
  }
  function framItems(days = 14) {
    const ti = isoD(today), ud = window.utlDocs && ON("leiga") ? utlDocs() : [], ux = [];
    ud.forEach(u => { if (u.fra >= ti) ux.push({ when: u.fra, title: u.nr + " " + u.heiti, kind: "Afhending", open: "tb:" + u.T.id, nr: u.vsk }); if (u.til >= ti && u.til !== u.fra) ux.push({ when: u.til, title: u.nr + " " + u.heiti, kind: "Skil", open: "tb:" + u.T.id, nr: u.vsk }); });
    return [...upcoming(), ...ux].filter(i => { const n = daysTo(i.when); return n !== null && n >= 0 && n <= days; }).sort((a, b) => String(a.when).localeCompare(String(b.when)))
      .map(i => ({ k: i.kind === "Fundur" ? "Fundur" : /Skil/.test(i.kind) ? "Skil" : i.kind, title: i.title, sub: [i.kind, i.nr].filter(Boolean).join(" · "), date: i.when, time: hhmm(i.when), pill: i.kind === "Fundur" ? "Fundur" : /Afhending/.test(i.kind) ? "Afhending" : /Skil/.test(i.kind) ? "Skil" : i.kind, open: i.open }));
  }
  function tilkItems() {
    const R = [], api = window.salaAPI;
    const pu = window.poUnread ? poUnread() : 0; if (ON("postur") && pu) R.push({ k: "Póstur", title: pu + " " + (pu === 1 ? "ólesinn póstur" : "ólesnir póstar"), sub: "Pósthólf", date: "", pill: "Nýtt", dark: 1, act: "tab:postur" });
    const su = window.spUnread ? spUnread() : 0; if (ON("spjall") && su) R.push({ k: "Spjall", title: su + " " + (su === 1 ? "ný skilaboð" : "ný skilaboð") + " í spjalli", sub: "Spjall", date: "", pill: "Nýtt", dark: 1, act: "tab:spjall" });
    if (api) {
      api.PN().filter(P => P.stada === "Ný").forEach(P => R.push({ k: "Pantanir", title: "Ný pöntun " + (P.nr || ""), sub: [P.vidskiptavinur || P.tengilidur, P.uppruni ? ({ simi: "sími", postur: "tölvupóstur", shopify: "Shopify", vefur: "vefur", stadur: "á staðnum", tilbod: "úr tilboði" })[P.uppruni] || P.uppruni : ""].filter(Boolean).join(" · "), date: P.stofnad_t || P.dags, pill: "Pöntun", open: "tb:" + P.id }));
      api.TB().filter(T => T.stada === "Samþykkt" && daysTo(T.breytt_t || T.dags) >= -7 && daysTo(T.dags) >= -30).forEach(T => R.push({ k: "Tilboð", title: "Tilboð " + (T.nr || "") + " samþykkt", sub: [T.vidskiptavinur, T.heiti].filter(Boolean).join(" · "), date: T.breytt_t || T.dags, pill: "Samþykkt", open: "tb:" + T.id }));
      api.VR().forEach(v => (v.skemmdir || []).filter(x => x.stada === "opin" && daysTo(x.dags) >= -7).forEach(x => R.push({ k: "Lager", title: "Skemmd skráð · " + (x.eintak || v.nr || ""), sub: x.lysing || "", date: x.dags, pill: "Ástand", open: "vara:" + v.id })));
    }
    (S?.thraedir || []).filter(t => daysTo(t.tengt) >= -3).forEach(t => R.push({ k: "Póstur", title: "Póstur tengdur verkefni", sub: t.efni || "", date: t.tengt, pill: "Póstur", open: t.verkefniId ? "verk:" + t.verkefniId : null, act: "tab:postur" }));
    return R.sort((a, b) => String(b.date || "9").localeCompare(String(a.date || "9")));
  }
  const hcard = (title, n, sub, items, more) => `<section class="card ucard uhc"><div class="uhch"><h3>${E(title)}${n ? ` <span class="m">${n}</span>` : ""}</h3><a href="#" data-act="tab:${more}">Sjá allt →</a></div>`
    + (items.length ? items.slice(0, 5).map(it => `<a class="uhrow" ${att(it)}><span><b>${E(it.title)}</b><small>${E([it.date ? fmtD(it.date) : "", it.time || "", it.sub].filter(Boolean).join(" · "))}</small></span>${pill(it.pill, it.dark)}</a>`).join("") : `<div class="usub" style="padding:10px 0">${E(sub)}</div>`) + `</section>`;
  U.yfirlit = function () {
    const hr = new Date().getHours(), first = (STARFS().find(x => x.sk === ME())?.nafn || window.USER?.nafn || "").split(" ")[0];
    const greet = hr < 5 ? "Góða nótt" : hr < 11 ? "Góðan daginn" : hr < 18 ? "Góðan dag" : "Gott kvöld";
    const g = goal(), k = klukka(), wk = (weekSum(0, STARFS().length > 1 ? ME() : null, true) || 0) + (k && window.liveWeekH ? liveWeekH(k.start) : 0);
    const vik = ON("timar") ? `<section class="card ucard"><div class="uhch"><h3>Vikan þín</h3><a href="#" data-act="tab:timar">Opna vikuna →</a></div><div class="uwk"><b>${H(wk)}</b><span class="m">af ${H(g)} klst.</span></div><div class="ubar" style="height:10px"><i style="width:${Math.min(100, wk / g * 100)}%"></i></div><div class="usl"><span>${H(Math.max(0, g - wk))} klst. eftir</span><span>${Math.round(Math.min(1, wk / g) * 100)} % af markmiði</span></div></section>` : "";
    const kl = ON("timar") ? (k ? (() => { const q = findProj(k.pid); return `<section class="card ucard uklk on"><div><small>Klukka í gangi · ${E([q?.nr, q?.stutt].filter(Boolean).join(" "))}</small><b class="kt" data-start="${E(k.start)}">${elapsed(k)}</b></div><button type="button" class="btn" onclick="stopKlukka()">Stoppa og skrá</button></section>`; })()
      : `<section class="card ucard uklk"><div><small>Stimpilklukka</small><b>0:00:00</b></div><button type="button" class="btn primary" onclick="kind='tima';PREFILL={timer:true};openSheet()">▶ Byrja klukku</button></section>`) : "";
    const ok = oklItems(), fr = framItems(7), tk = tilkItems();
    const l = ORG.merki || ORG.logo || {}, src = l.ljos || l.dokk || "";
    return `<div class="uhello"><small>${E(dayTitle(today))}</small><h2>${greet}${first ? ", " + E(first) : ""}</h2></div>`
      + `<div class="uhtop">${vik}${kl}</div>`
      + `<div class="uh3">${hcard("Óklárað", ok.length, "Ekkert óklárað – vel gert.", ok, "hfrag")}${hcard("Framundan", fr.length, "Ekkert næstu 7 daga.", fr, "hfram")}${hcard("Tilkynningar", tk.length, "Engar nýjar tilkynningar.", tk, "hnyl")}</div>`
      + (src ? `<div class="h2logo"><img src="${E(src)}" alt="${E(ORG.nafn || "")}"></div>` : "");
  };
  const hlist = (title, items, chipsArr, key) => {
    const f = st.vf[key] || "", xs = items.filter(it => !f || it.k === f);
    return lhead("Heim", title, "") + (chipsArr.length > 1 ? `<div class="ulbar">${chips([["", "Allt · " + items.length], ...chipsArr.map(c => [c, c])], f, "u1vf:" + key)}</div>` : "")
      + `<div class="ucols uh"><span>Tegund</span><span>Atriði</span><span>Dags.</span><span class="r"></span></div>`
      + (xs.map(it => `<div class="urow uh" ${att(it)}><span class="m">${E(it.k)}</span><span class="t">${E(it.title)}${it.sub ? `<span class="m"> · ${E(it.sub)}</span>` : ""}</span><span class="m">${E(it.date ? fmtD(it.date) + (it.time ? " " + it.time : "") : "")}</span><span class="r">${pill(it.pill, it.dark)}</span></div>`).join("") || `<div class="uempty">Ekkert hér.</div>`);
  };
  U.hfrag = () => { const xs = oklItems(); return hlist("Óklárað", xs, [...new Set(xs.map(x => x.k))], "hfrag"); };
  U.hfram = () => { const xs = framItems(14); return hlist("Framundan", xs, [...new Set(xs.map(x => x.k))], "hfram"); };
  U.hnyl = () => { const xs = tilkItems(); return hlist("Tilkynningar", xs, [...new Set(xs.map(x => x.k))], "hnyl"); };

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
      if (k === "u1svh") { const [key, ...rest] = r, val = rest.join(":").trim(); await cfgSave(c => { c.svid = c.svid || {}; c.svid[key] = { ...(c.svid[key] || {}), heiti: val }; }); toast?.("Vistað"); render(); return; }
      if (k === "u1day") { st.day = v && v !== st.day ? v : null; render(); return; }
      if (k === "u1vf") { const [key, val] = [r[0], r.slice(1).join(":")]; st.vf[key] = val; render(); return; }
      if (k === "u1mv") { const p = findProj(v), ids = new Set([...st.sel].filter(x => x.startsWith("time:")).map(x => x.slice(5))), kids = new Set([...st.sel].filter(x => x.startsWith("kostn:")).map(x => x.slice(6)));
        if (!p || (!ids.size && !kids.size)) return;
        await saveSnapshot(s => { (s.timar?.faerslur || []).forEach(e => { if (ids.has(String(e.id))) { e.verkefniId = p.id; e.nr = p.nr; } }); (s.kostnadur || []).forEach(x => { if (kids.has(String(x.id))) x.verkefniId = p.id; }); });
        toast?.(`${ids.size + kids.size} færslur færðar á ${p.nr}`); st.sel.clear(); render(); return; }
      if (k === "u1ct") { st.ct = r[0]; render(); return; }
      if (k === "u1go") { const t = r[0], key = r.slice(1).join(":"); tab = t; DETAIL = key || null; window.STSUB = null; render(); return; }
      if (k === "u1tm") { st.tm = r.join(":"); render(); return; }
      if (k === "u1skil") { const me = meSk(); await saveSnapshot(s => { s.timar = s.timar || {}; const o = s.timar.skil = s.timar.skil || {}; o[me] = [...new Set([...(o[me] || []), v])]; }); toast?.("Vikunni skilað"); render(); return; }
    }
  });
})();
