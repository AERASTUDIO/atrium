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
  U.vsk = function () {
    const L = (S?.vidskiptavinir || []).filter(v => !window.inDeild || true).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "is"));
    const cnt = v => verkefni().filter(p => p.vskId === v.id && !isDone(p)).length;
    const f = st.vf.vsk || "", xs = L.filter(v => f === "opin" ? cnt(v) : f === "an" ? !cnt(v) : true);
    let h = "", last = "";
    xs.forEach(v => { const l = String(v.name || "?").charAt(0).toLocaleUpperCase("is"); if (l !== last) { h += grpH(l); last = l; } const n = cnt(v);
      h += `<div class="urow uv" ${tapAttr("vsk", v.id)}><span class="t">${E(v.name || "")}${v.tengilidur ? `<span class="m"> · ${E(v.tengilidur)}</span>` : ""}</span><span class="m">${n ? n + " verkefni" : ""}</span><span class="r">${pill(n ? "Í gangi" : "Óvirkur")}</span></div>`; });
    return lhead("Verkefni", "Viðskiptavinir", nbtn("Viðskiptavinur")) + `<div class="ulbar">${chips([["", "Allir · " + L.length], ["opin", "Með opin verkefni"], ["an", "Án verkefna"]], f, "u1vf:vsk")}</div>`
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
  U.pantanir = function () {
    const api = window.salaAPI; if (!api) return "";
    const all = api.PN(), f = st.vf.pn || "opnar", OP = ["Ný", "Staðfest"];
    const xs = all.filter(P => f === "opnar" ? OP.includes(P.stada) : f === "afh" ? P.stada === "Afhent" : ["Skilað", "Lokið"].includes(P.stada)).sort((a, b) => String(a.fra || "").localeCompare(String(b.fra || "")));
    return lhead("", "Pantanir", nbtn("Pöntun")) + `<div class="ulbar">${chips([["opnar", "Opnar · " + all.filter(P => OP.includes(P.stada)).length], ["afh", "Afhentar · " + all.filter(P => P.stada === "Afhent").length], ["lokid", "Lokið"]], f, "u1vf:pn")}</div>`
      + cols("Nr.", "Heiti · Viðskiptavinur", "Afhending", "Staða")
      + (xs.map(P => row(tapAttr("tb", P.id), E(P.nr || ""), E(P.heiti && P.heiti !== "Pöntun" ? P.heiti : ""), E(P.vidskiptavinur || P.tengilidur || ""), E(relD(P.fra)), P.stada, P.stada === "Ný")).join("") || `<div class="uempty">Engar pantanir.</div>`);
  };
  // Vörulisti: Leiga (eftir forskeyti vörunúmers) og Sala (eftir flokki)
  const freeCol = (f, tot) => { const r = tot ? f / tot : 0, t = Math.pow(1 - r, 1.6), c = [0x6B, 0x76, 0x82].map((g, i) => Math.round(g + ([0xC6, 0x28, 0x28][i] - g) * t)); return `<span class="ufree" style="color:rgb(${c.join(",")});font-weight:${r <= .25 ? 600 : 500}">${f}</span>`; };
  U.lvorur = function () {
    const api = window.salaAPI; if (!api) return "";
    const iso = isoD(today), xs = api.VR().filter(v => api.vDeild(v) === "leiga" && v.tegund !== "vinna").sort((a, b) => String(a.nr || "").localeCompare(String(b.nr || ""), "is", { numeric: true }));
    let h = "", last = "";
    xs.forEach(v => { const g = v.tegund === "pakki" ? "Pakkar" : (String(v.nr || "").split("-")[0] || "–") + (v.flokkur ? " · " + v.flokkur : ""); if (g !== last) { h += grpH(g); last = g; }
      const tot = +v.fjoldi || 0, free = v.tegund === "pakki" ? "" : Math.max(0, tot - (api.upptekid(v.id, iso, iso).max || 0));
      h += `<div class="urow ul" ${tapAttr("vara", v.id)}><span class="m">${E(v.nr || "")}</span><span class="t">${E(v.heiti || "")}</span><span class="m">${v.tegund === "pakki" ? "" : tot}</span>${free === "" ? "<span></span>" : freeCol(free, tot)}<span class="r">${pill(kr(v.leiguverd))}</span></div>`; });
    return lhead("Vörulisti", "Leiga", nbtn("Búnaður")) + `<div class="ucols ul"><span>Vnr.</span><span>Heiti</span><span>Magn</span><span>Laust</span><span class="r">Verð/dag</span></div>` + (h || `<div class="uempty">Enginn leigubúnaður.</div>`);
  };
  U.svorur = function () {
    const api = window.salaAPI; if (!api) return "";
    const fr = {}; api.TB().filter(T => ["Drög", "Sent"].includes(T.stada)).forEach(T => (T.linur || []).forEach(l => { if (l.teg === "sala" && l.v) fr[l.v] = (fr[l.v] || 0) + (+l.magn || 0); }));
    const xs = api.VR().filter(v => api.vDeild(v) === "sala" && v.tegund !== "vinna").sort((a, b) => String(a.flokkur || "").localeCompare(String(b.flokkur || ""), "is") || String(a.nr || "").localeCompare(String(b.nr || ""), "is", { numeric: true }));
    let h = "", last = "";
    xs.forEach(v => { const g = v.flokkur || "Annað"; if (g !== last) { h += grpH(g); last = g; } const tot = +v.fjoldi || 0, free = Math.max(0, tot - (fr[v.id] || 0)), low = tot <= 2;
      h += `<div class="urow ul" ${tapAttr("vara", v.id)}><span class="m">${E(v.nr || "")}</span><span class="t">${E(v.heiti || "")}${low ? ' <i class="udot" title="Lítið á lager"></i>' : ""}</span><span class="m">${tot}</span>${low ? `<span class="ufree red" style="font-weight:600">${free}</span>` : freeCol(free, tot)}<span class="r">${pill(kr(v.soluverd))}</span></div>`; });
    return lhead("Vörulisti", "Sala", nbtn("Vara")) + `<div class="ucols ul"><span>Vnr.</span><span>Heiti</span><span>Lager</span><span>Laust</span><span class="r">Verð</span></div>` + (h || `<div class="uempty">Engar söluvörur.</div>`);
  };

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
      if (k === "u1vf") { const [key, val] = [r[0], r.slice(1).join(":")]; st.vf[key] = val; render(); return; }
      if (k === "u1mv") { const p = findProj(v), ids = new Set([...st.sel].filter(x => x.startsWith("time:")).map(x => x.slice(5))), kids = new Set([...st.sel].filter(x => x.startsWith("kostn:")).map(x => x.slice(6)));
        if (!p || (!ids.size && !kids.size)) return;
        await saveSnapshot(s => { (s.timar?.faerslur || []).forEach(e => { if (ids.has(String(e.id))) { e.verkefniId = p.id; e.nr = p.nr; } }); (s.kostnadur || []).forEach(x => { if (kids.has(String(x.id))) x.verkefniId = p.id; }); });
        toast?.(`${ids.size + kids.size} færslur færðar á ${p.nr}`); st.sel.clear(); render(); return; }
      if (k === "u1skil") { const me = meSk(); await saveSnapshot(s => { s.timar = s.timar || {}; const o = s.timar.skil = s.timar.skil || {}; o[me] = [...new Set([...(o[me] || []), v])]; }); toast?.("Vikunni skilað"); render(); return; }
    }
  });
})();
