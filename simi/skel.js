/* simi/skel.js (2.155.0) – Símaskel Atrium, lota 1 af 6 („Símaapp Atrium – prompt“, striginn „Atrium – símaapp“ › U2d · Sími).
   Síminn er sama app og tölvan (U2d): sömu litir, letur, spjöld, pillur og stöðulitir – aðeins einn dálkur.
   Þessi skrá: íhlutir (window.SM), neðri valmynd (glerstika eins og vinstri stika tölvunnar – virkur liður er grafít pilla),
   Heim (kveðja + bjalla, Vikan þín/klukka, Í dag-einingar tölvunnar, Svæði), Leita (ein leit yfir allt + Nýlega opnað) og Meira.
   Aðrir skjáir koma í lotum 2–6. Útlit: simi/simi.css. Virkt aðeins undir 1024 px; tölvan breytist ekki. */
(function () {
  if (window.ORG?.simi !== "I") return;
  const phone = () => !matchMedia("(min-width:1024px)").matches;
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]));
  const tr = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const fold = x => String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const N = n => tr(() => num(n), String(n));

  /* ---------- Íhlutir ---------- */
  const P = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>', fold: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    bag: '<path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 0 1 6 0"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    chev: '<path d="M9 6l6 6-6 6"/>', back: '<path d="M15 18l-6-6 6-6"/>', down: '<path d="M6 9l6 6 6-6"/>', play: '<path d="M8 5.5l10 6.5-10 6.5z"/>', cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', note: '<path d="M5 4h14v12l-4 4H5z"/><path d="M9 9h6M9 13h4"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>',
    doc: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M14 3.5v5h5"/>', card: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M3.5 10h17M7 15h4"/>',
    users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 7M21 20a6 6 0 0 0-4-5.6"/>', mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M3.5 7.5l8.5 6 8.5-6"/>',
    chat: '<path d="M20.5 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 20.5 12z"/>', box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', reload: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>', list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'
  };
  const ic = (k, s = 20, w = 1.75) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || P.list}</svg>`;
  const bellN = () => tr(() => window.u1TilkN ? u1TilkN() : 0, 0);
  const SM = window.SM = {
    ic,
    // Haus: smámerki + fyrirsögn vinstra megin, hringhnappar hægra megin
    head: (sup, title, right = "", h1cls = "") => `<header class="smh"><div class="smht">${sup ? `<span class="smsup">${sup}</span>` : ""}<h1 class="smh1${h1cls ? " " + h1cls : ""}">${title}</h1></div>${right}</header>`,
    ib: (icon, label, attr, cls = "") => `<button type="button" class="smib${cls ? " " + cls : ""}" aria-label="${E(label)}" ${attr}>${ic(icon)}</button>`,
    bell: () => { const n = bellN(); return window.u1Tilk ? `<button type="button" class="smib gr smbell" onclick="u1Tilk()" aria-label="Tilkynningar${n ? ", " + n + " ólesnar" : ""}">${ic("bell")}${n ? `<span class="smbdg">${n > 99 ? "99+" : n}</span>` : ""}</button>` : ""; },
    card: (title, body, more = "", cls = "") => `<section class="smc${cls ? " " + cls : ""}">${title ? `<div class="smct"><i></i><h2>${title}</h2>${more}</div>` : ""}${body}</section>`,
    row: (attr, t, s, right = "") => `<a class="smr" ${attr}><span class="smrt"><b>${E(t)}</b>${s ? `<small>${E(s)}</small>` : ""}</span>${right}</a>`,
    pill: (t, tone = "") => `<span class="smp${tone ? " " + tone : ""}">${E(t)}</span>`,
    empty: t => `<p class="smempty">${E(t)}</p>`,
    screens: [], after: [], adapt: [], E, tr, fold, N, phone
  };

  /* ---------- Nýlega opnað (Leita) ---------- */
  const NYK = () => "atr-nyl:" + (window.ORG?.lsForskeyti || "");
  const nyl = () => tr(() => JSON.parse(localStorage.getItem(NYK()) || "[]"), []);
  const _od = window.openDetail;
  if (typeof _od === "function") {
    const od = function (key) { try { if (key && /^(verk|tb|reikn|vsk|vara|fund|sub):/.test(key)) localStorage.setItem(NYK(), JSON.stringify([key, ...nyl().filter(x => x !== key)].slice(0, 12))); } catch (e) {} return _od.apply(this, arguments); };
    window.openDetail = od; try { openDetail = od; } catch (e) {}
  }

  /* ---------- Gagnaleit (Leita og Nýlega opnað) ---------- */
  const TB = () => tr(() => salaAPI.TB(), []), PN = () => tr(() => salaAPI.PN(), []);
  function info(key) {
    const [k, ...r] = String(key).split(":"), id = r.join(":");
    if (k === "verk") { const p = tr(() => findProj(id), null); return p && { k: "Verkefni", t: p.stutt || p.nafn || "", s: [p.nr, p.vidskiptavinur].filter(Boolean).join(" · "), st: p.stada }; }
    if (k === "tb") { const T = [...TB(), ...PN()].find(x => x.id === id); const pn = PN().some(x => x.id === id); return T && { k: pn ? "Pöntun" : "Tilboð", t: T.heiti || (pn ? "Pöntun" : "Tilboð"), s: [T.nr, T.vidskiptavinur].filter(Boolean).join(" · "), st: T.stada }; }
    if (k === "reikn") { const R = tr(() => (S.reikningar || []).find(x => String(x.id) === id), null); return R && { k: "Reikningur", t: (R.nr ? R.nr + " · " : "") + (R.kaupandi?.name || ""), s: N(R.tot || 0) + " kr.", st: R.stada }; }
    if (k === "vsk") { const c = tr(() => vskList().find(x => String(x.id) === id), null); return c && { k: "Viðskiptavinur", t: c.name || c.nafn || "", s: c.kennitala || c.email || "", st: "" }; }
    return null;
  }
  const TONE = s => /seint|hafnað|fram yfir/i.test(s || "") ? "r" : /bið|bíður|sent|beiðni|fyrirspurn|drög|ný$/i.test(s || "") ? "a" : /samþykkt|greitt|lokið|skilað|afhent/i.test(s || "") ? "g" : s ? "b" : "";
  function search(q) {
    const f = fold(q), hit = (...xs) => xs.some(x => fold(x).includes(f)), G = [];
    const add = (title, xs) => { if (xs.length) G.push([title, xs]); };
    add("Verkefni", tr(() => verkefni(), []).filter(p => hit(p.nr, p.stutt, p.nafn, p.vidskiptavinur)).slice(0, 6).map(p => "verk:" + p.id));
    add("Tilboð", TB().filter(T => hit(T.nr, T.heiti, T.vidskiptavinur, T.tengilidur)).slice(0, 6).map(T => "tb:" + T.id));
    add("Pantanir", PN().filter(T => hit(T.nr, T.heiti, T.vidskiptavinur, T.tengilidur)).slice(0, 6).map(T => "tb:" + T.id));
    add("Reikningar", tr(() => (S.reikningar || []).filter(R => hit(R.nr, R.kaupandi?.name)), []).slice(0, 6).map(R => "reikn:" + R.id));
    add("Viðskiptavinir", tr(() => vskList().filter(c => hit(c.name, c.nafn, c.kennitala, c.email)), []).slice(0, 6).map(c => "vsk:" + c.id));
    return G;
  }
  const rowFor = key => { const i = info(key); return i ? SM.row(`role="button" tabindex="0" data-open="${E(key)}"`, i.t, (i.k ? i.k + " · " : "") + i.s, i.st ? SM.pill(i.st, TONE(i.st)) : "") : ""; };

  /* ---------- Skjáir lotu 1 ---------- */
  const st = window.SM_ST = { q: "" };
  function heimHTML() {
    const d = new Date(), U = window.VIEWAS || window.USER || {}, nm = String(U.nafn || "").split(" ")[0], h = d.getHours();
    const kv = (h < 5 ? "Góða nótt" : h < 12 ? "Góðan dag" : h < 18 ? "Góðan dag" : "Gott kvöld") + (nm ? `, <b>${E(nm)}</b>` : "");
    const DN = ["Sunnudagur", "Mánudagur", "Þriðjudagur", "Miðvikudagur", "Fimmtudagur", "Föstudagur", "Laugardagur"], MN = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
    const right = `<div class="smhr">${SM.ib("search", "Leita", 'data-tab="leit"')}${SM.bell()}</div>`;
    // Í dag-einingar tölvunnar (sömu og á tölvu, sama röð og Sérsníða) – Vikan þín er í grafítspjaldinu efst
    let mods = tr(() => window.UI1V?.yfirlit ? UI1V.yfirlit() : "", "");
    const tmp = document.createElement("div"); tmp.innerHTML = mods; tmp.querySelector(".uhead")?.remove(); tmp.querySelectorAll(".u2vik").forEach(x => x.closest(".u2m")?.remove());
    mods = tmp.innerHTML;
    const key = tr(() => simiApi.keyCard(), ""), tiles = tr(() => simiApi.tiles(), "");
    return `<div class="smscr smheim">${SM.head(`${DN[d.getDay()]} ${d.getDate()}. ${MN[d.getMonth()]} · <button type="button" class="smlnk" onclick="idagSersnida()">Sérsníða</button>`, kv, right, "kv")}`
      + `<div class="smbody">${key}<div class="smmods">${mods}</div>`
      + (tiles ? SM.card("Svæði", `<div class="sht">${tiles}</div>`, `<button type="button" class="smlnk" data-simk="flis">Breyta</button>`, "smsv") : "") + `</div></div>`;
  }
  function leitHTML() {
    const q = st.q.trim(), G = q ? search(q) : [], N0 = nyl().map(rowFor).filter(Boolean);
    const res = q ? (G.length ? G.map(([t, ks]) => SM.card(t, `<div class="smrows">${ks.map(rowFor).join("")}</div>`)).join("") : SM.empty(`Ekkert fannst fyrir „${q}“.`))
      : (N0.length ? SM.card("Nýlega opnað", `<div class="smrows">${N0.slice(0, 8).join("")}</div>`) : SM.empty("Leitaðu að verkefni, tilboði, pöntun, reikningi eða viðskiptavini."));
    return `<div class="smscr smleit">${SM.head("Leita", "Allt í Atrium", `<div class="smhr">${SM.bell()}</div>`)}<div class="smbody"><label class="smsearch">${ic("search", 18)}<input type="search" id="smq" value="${E(st.q)}" placeholder="Heiti, verknúmer, viðskiptavinur …" autocomplete="off" enterkeyhint="search" aria-label="Leita"></label><div id="smres">${res}</div></div></div>`;
  }
  const SIC = { idag: "home", tilbod: "doc", pantanir: "bag", verkefni: "fold", timar: "clock", fjarmal: "card", dagatal: "cal", verkdag: "cal", postur: "mail", spjall: "chat", vidsk: "users", vorur: "box", bunadur: "box", teymi: "users", skjol: "fold", stillingar: "gear" };
  function meiraHTML() {
    const secs = tr(() => SECTIONS, []).filter(x => !x.nobar && x.tabs.some(t => tr(() => !window.tabOn || tabOn(t[0]), true)) && x.k !== "stillingar");
    const cnt = tr(() => window.u2Counts ? u2Counts() : {}, {});
    const first = x => (x.tabs.find(t => tr(() => !window.tabOn || tabOn(t[0]), true)) || x.tabs[0])[0];
    const grp = (title, xs) => xs.length ? SM.card(title, `<div class="smrows">${xs.map(x => `<a class="smr smrl" role="button" tabindex="0" data-tab="${E(first(x))}"><span class="smri">${ic(SIC[x.k] || "list", 18)}</span><span class="smrt"><b>${E(x.l)}</b></span>${cnt[x.k] ? `<span class="smn">${cnt[x.k]}</span>` : ""}${ic("chev", 16)}</a>`).join("")}</div>`) : "";
    const VINNA = ["idag", "tilbod", "pantanir", "verkefni", "timar", "fjarmal", "dagatal", "verkdag"], SAM = ["postur", "spjall"];
    const U = window.VIEWAS || window.USER || {}, sk = String(U.sk || tr(() => ME(), "") || "?").slice(0, 2).toUpperCase();
    const role = tr(() => ({ admin: "Admin", bokari: "Bókari", starfsmadur: "Starfsmaður", vettvangur: "Vettvangur" })[window.ROLE || U.hlutverk] || U.hlutverk || "", "");
    const stOk = tr(() => !window.tabOn || tabOn("stillingar"), true);
    return `<div class="smscr smmeira">${SM.head("Meira", "Öll svæði", `<div class="smhr">${SM.ib("search", "Leita", 'data-tab="leit"')}${SM.bell()}</div>`)}<div class="smbody">`
      + grp("Vinna", secs.filter(x => VINNA.includes(x.k))) + grp("Samskipti", secs.filter(x => SAM.includes(x.k))) + grp("Skrár", secs.filter(x => !VINNA.includes(x.k) && !SAM.includes(x.k)))
      + SM.card("Þú", `<div class="smme"><span class="smav">${E(sk)}</span><span class="smrt"><b>${E(U.nafn || "")}</b><small>${E([role, U.email].filter(Boolean).join(" · "))}</small></span></div><div class="smrows">`
        + (stOk ? `<a class="smr smrl" role="button" tabindex="0" data-tab="stillingar"><span class="smri">${ic("gear", 18)}</span><span class="smrt"><b>Stillingar</b></span>${ic("chev", 16)}</a>` : "")
        + `<a class="smr smrl" role="button" tabindex="0" onclick="window.u2Utlit?u2Utlit():doAct('tab:stillingar')"><span class="smri">${ic("sun", 18)}</span><span class="smrt"><b>Útlit</b><small>Ljóst, dökkt eða sjálfvirkt</small></span>${ic("chev", 16)}</a>`
        + `<a class="smr smrl" role="button" tabindex="0" onclick="location.reload()"><span class="smri">${ic("reload", 18)}</span><span class="smrt"><b>Endurhlaða</b><small>Útgáfa ${E(window.APP_VERSION || "")}</small></span></a>`
        + (window.signOut || window.logout ? `<a class="smr smrl" role="button" tabindex="0" onclick="(window.signOut||window.logout)()"><span class="smri">${ic("out", 18)}</span><span class="smrt"><b>Skrá út</b></span></a>` : "")
        + `</div>`) + `</div></div>`;
  }

  /* ---------- Neðri valmynd: glerstika eins og vinstri stika tölvunnar ---------- */
  function bar() {
    const tb = document.getElementById("tbar"); if (!tb) return;
    const t = tr(() => tab, ""), D = tr(() => DETAIL, null), secs = tr(() => SECTIONS, []), secOf = k => secs.find(x => x.tabs.some(q => q[0] === k));
    const okT = k => tr(() => !window.tabOn || tabOn(k), true), first = x => x && (x.tabs.find(q => okT(q[0])) || x.tabs[0])[0];
    const rent = tr(() => ON("pantanir") && (ON("leiga") || ON("sala")), false);
    const F = secs.find(x => x.k === (rent ? "pantanir" : "verkefni")), C = secs.find(x => x.k === "dagatal") || secs.find(x => x.k === "verkdag");
    const sk = secOf(t)?.k, n = tr(() => window.bmCount ? bmCount() : 0, 0);
    const curK = t === "yfirlit" ? "heim" : (D ? (/^verk:|^sub:/.test(D) ? "verkefni" : /^tb:/.test(D) ? (rent ? "pantanir" : "verkefni") : "meira") : sk === F?.k ? "fl" : sk === C?.k ? "cal" : "meira");
    const it = (k, tabk, icon, label, cnt = 0) => { const on = curK === k || (k === "fl" && (curK === "verkefni" || curK === "pantanir") && F); return `<button type="button" class="tab smbt${on ? " on" : ""}" data-tab="${E(tabk)}" aria-label="${E(label)}"${on ? ' aria-current="page"' : ""}>${ic(icon, on ? 19 : 22)}<span>${E(label)}</span>${on && cnt ? `<em>${cnt}</em>` : ""}</button>`; };
    tb.classList.add("smbar");
    tb.innerHTML = it("heim", "yfirlit", "home", "Í dag", n) + (F ? it("fl", first(F), rent ? "bag" : "fold", F.l) : "") + (C ? it("cal", first(C), "cal", "Dagatal") : "") + it("meira", "meira", "more", "Meira")
      + `<button type="button" class="smbplus" data-simk="plus" aria-label="Skrá tíma og fleira">${ic("plus", 22, 2)}</button>`;
  }

  SM.bar = () => { if (phone()) tr(() => bar(), 0); };
  /* ---------- Tenging ---------- */
  function nat() {
    const v = document.getElementById("view"); if (!v) return;
    document.body.classList.add("sm");
    const t = tr(() => tab, ""), D = tr(() => DETAIL, null);
    document.body.classList.remove("smdet", "smfr", "smfrd");
    let h = null;
    if (!D) { if (t === "yfirlit" && !tr(() => window.isVett?.(), false)) h = heimHTML(); else if (t === "leit") h = leitHTML(); else if (t === "meira") h = meiraHTML(); }
    // Skjáir lotna 2–6 (simi/*.js) skrá sig í SM.screens: (tab, DETAIL) → HTML eða null
    if (h == null) for (const f of SM.screens) { const r = tr(() => f(t, D), null); if (r != null) { h = r; break; } }
    if (h != null) {
      document.body.classList.remove("s2detb", "s2cl");
      if (/^<div class="smscr[^"]*\bsmd\b/.test(h)) document.body.classList.add("smdet");
      // Fyrstu skref (fyrstuskref.js) fer undir kveðjuna, ekki ofan við hana
      const fsk = v.querySelector(".fsk"); v.innerHTML = h; const sb = v.querySelector(".smheim .smbody"); if (fsk && sb) (sb.firstElementChild ? sb.firstElementChild.after(fsk) : sb.prepend(fsk));
      document.body.classList.add("simdag"); document.body.classList.remove("simhasact");
      if (t === "leit") { const q = document.getElementById("smq"); if (q && st.focus) { q.focus(); const n = q.value.length; q.setSelectionRange(n, n); } }
      SM.after.forEach(f => tr(() => f(v, t, D), 0));
    } else SM.adapt.forEach(f => tr(() => f(v, t, D), 0));   // tölvuskjár → símarammi (simi/rammi.js)
    if (document.body.classList.contains("s2detb")) document.body.classList.add("smdet");
    bar();
  }
  document.addEventListener("input", e => { if (e.target.id !== "smq") return; st.q = e.target.value; const r = document.getElementById("smres"); if (!r) return; const tmp = document.createElement("div"); tmp.innerHTML = leitHTML(); const n = tmp.querySelector("#smres"); if (n) r.innerHTML = n.innerHTML; });
  document.addEventListener("focusin", e => { if (e.target.id === "smq") st.focus = true; });
  document.addEventListener("click", e => { if (!phone()) return; const b = e.target.closest('#tbar [data-tab="leit"], #view [data-tab="leit"]'); if (b) st.focus = true; }, true);
  // Hlekkir á svæði inni í skjánum (Meira, Leita-hnappar í haus)
  document.addEventListener("click", e => { if (!phone()) return; const b = e.target.closest("#view [data-tab]"); if (!b || b.closest("[data-act]") && b.closest("[data-act]") !== b) return; e.preventDefault(); e.stopPropagation(); try { tab = b.dataset.tab; DETAIL = null; window.STSUB = null; localStorage.setItem("aera-tab", tab); } catch (x) {} render(); window.scrollTo({ top: 0 }); }, true);
  const _r = window.render;
  function renderSM() { _r.apply(this, arguments); if (!phone()) { document.body.classList.remove("sm"); document.getElementById("tbar")?.classList.remove("smbar"); return; } try { nat(); } catch (e) { console.warn("simi/skel", e); } }
  window.render = renderSM; try { render = renderSM; } catch (e) {}
})();
