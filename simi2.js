/* simi2.js (2.154.0) – Nýtt símaviðmót, smíðað frá grunni fyrir síma (skissan „Nýtt símaviðmót – frá grunni“ á striganum „Atrium – símaapp“).
   Í stað þess að þjappa tölvuskjánum í mjóan dálk teiknar síminn sína eigin skjái fyrir það sem er mest notað:
   1. Listar (Verkefni, Tilboð, Pantanir): stór titill með leit og + í hausnum, síur sem pillur með fjölda, línur í einu spjaldi.
   2. Opið verkefni: ýttur skjár (‹ til baka, engin neðri stika), staða og ferill í einni línu, lykiltölur 2×2, næsta skref,
      hlutar sem línur (opna tölvuflipann með „‹ <verkefni>“) og ein aðgerðastika neðst (Byrja klukku · Mynd · Athugasemd).
   3. Opið tilboð/pöntun: upphæð heil og stór, staðreyndir sem línur, fyrstu línur, aðgerð eftir stöðu neðst; ⋯ = allt.
   4. Dagatal: vikurönd með punktum og dagskrá valins dags (fundir, skil, afhendingar, verk á vikuplani). Ég / Allir.
   5. Skrá tíma: einn skjár – verkefni sem pillur, tími með − / + og flýtitölum, dagur, lýsing, Vista.
   Gögn, vistun og reglur eru þær sömu og í tölvunni; aðeins framsetningin er önnur. Annað (Póstur, Stillingar …) er óbreytt.
   Merkjahausinn er falinn í síma (body.s2); bjallan er á Heim. Útlit: simi2.css. */
(function () {
  if (window.ORG?.simi !== "I") return;
  const phone = () => !matchMedia("(min-width:1024px)").matches;
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const tr = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const fold = x => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const MNS = ["jan", "feb", "mar", "apr", "maí", "jún", "júl", "ágú", "sep", "okt", "nóv", "des"], DNS = ["sun", "mán", "þri", "mið", "fim", "fös", "lau"];
  const DNL = ["Sunnudagur", "Mánudagur", "Þriðjudagur", "Miðvikudagur", "Fimmtudagur", "Föstudagur", "Laugardagur"], MNL = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
  const pad = n => String(n).padStart(2, "0"), iso = x => x.getFullYear() + "-" + pad(x.getMonth() + 1) + "-" + pad(x.getDate());
  const dOf = s => { const m = String(s || "").match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const sd = s => { const x = dOf(s); return x ? x.getDate() + ". " + MNS[x.getMonth()] : ""; };
  const dTo = s => tr(() => daysTo(s), null);
  const N = n => tr(() => num(n), String(n));
  const me = () => tr(() => ME(), "");
  const mcp = () => tr(() => !!MCP, false);
  const ON_ = k => tr(() => ON(k), false);
  const I = (p, s = 20, w = 1.75) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const IC = { back: '<path d="M15 18l-6-6 6-6"/>', chev: '<path d="M9 6l6 6-6 6"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    play: '<path d="M8 5.5l10 6.5-10 6.5z" fill="currentColor"/>', cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', note: '<path d="M5 4h14v12l-4 4H5z"/><path d="M9 9h6M9 13h4"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>', down: '<path d="M6 9l6 6 6-6"/>' };
  const st = { q: "", qOpen: false, f: {}, day: null, who: "me", cl: false, clFor: null };
  window.S2 = st;

  /* ---------- 1. Listar ---------- */
  const isVerkDone = p => tr(() => isDone(p), false);
  const mySk = () => { const U = window.VIEWAS || window.USER || {}; return String(U.sk || me() || "").toUpperCase(); };
  const mineP = p => (p.starfsmenn || []).map(x => String(x).toUpperCase()).includes(mySk());
  const LISTS = {
    verk: {
      title: "Verkefni", items: () => tr(() => verkefni(), []),
      filters: [["gangi", "Í gangi", p => !isVerkDone(p)], ["seint", "Seint", p => !isVerkDone(p) && p.skiladagur && dTo(p.skiladagur) < 0, "bad"], ["min", "Mín", p => !isVerkDone(p) && mineP(p)], ["bid", "Í bið", p => p.stada === "Í bið"], ["lokid", "Lokið", p => isVerkDone(p), "", 1]],
      text: p => [p.nr, p.stutt, p.nafn, p.vidskiptavinur],
      sort: (a, b) => String(a.skiladagur || "9").localeCompare(String(b.skiladagur || "9")),
      row: p => { const late = !isVerkDone(p) && p.skiladagur && dTo(p.skiladagur) < 0, c = late ? "bad" : p.stada === "Í bið" ? "warn" : isVerkDone(p) ? "mut" : "";
        return { open: "verk:" + p.id, stripe: c || "acc", t: p.stutt || p.nafn || "", s: [p.nr, p.vidskiptavinur].filter(Boolean).join(" · "), r1: late ? -dTo(p.skiladagur) + " d. seint" : sd(p.skiladagur), r1c: late ? "bad" : "", r2: p.stada || "", r2c: c === "warn" ? "warn" : "" }; }
    },
    ltilbod: {
      title: "Tilboð", items: () => tr(() => salaAPI.TB(), []),
      filters: [["opin", "Opin", T => ["Drög", "Sent"].includes(T.stada)], ["sent", "Bíða svars", T => T.stada === "Sent", "warn"], ["drog", "Drög", T => T.stada === "Drög"], ["samth", "Samþykkt", T => T.stada === "Samþykkt", "", 1], ["hafn", "Hafnað", T => T.stada === "Hafnað", "", 1]],
      text: T => [T.nr, T.heiti, T.vidskiptavinur, T.tengilidur],
      sort: (a, b) => String(b.dags || "").localeCompare(String(a.dags || "")),
      row: T => { const old = T.stada === "Sent" ? -dTo(T.sent || T.dags) : 0;
        return { open: "tb:" + T.id, stripe: T.stada === "Samþykkt" ? "ok" : T.stada === "Hafnað" ? "mut" : old >= 7 ? "warn" : "acc", t: T.heiti || "Tilboð", s: [T.nr, T.vidskiptavinur].filter(Boolean).join(" · "), r1: tr(() => N(salaAPI.netOf(T)), "") + " kr.", r2: T.bidur && T.stada !== "Samþykkt" ? "Samþykkt – staðfesta" : T.stada === "Sent" && old > 0 ? "Sent · " + old + " d." : T.stada || "", r2c: T.bidur ? "ok" : old >= 7 ? "warn" : "" }; }
    },
    pantanir: {
      title: "Pantanir", items: () => tr(() => salaAPI.PN().filter(P => !window.tbMine || !window.isVett?.() || tbMine(P)), []),
      filters: [["opnar", "Opnar", P => !["Skilað", "Lokið"].includes(P.stada)], ["idag", "Í dag", P => [P.fra, P.til].some(x => String(x || "").slice(0, 10) === iso(new Date()))], ["uti", "Úti", P => P.stada === "Afhent"], ["seint", "Skil sein", P => P.stada === "Afhent" && String(P.til || P.fra || "").slice(0, 10) < iso(new Date()), "bad"], ["lokid", "Lokið", P => ["Skilað", "Lokið"].includes(P.stada), "", 1]],
      text: P => [P.nr, P.heiti, P.vidskiptavinur, P.tengilidur],
      sort: (a, b) => String(a.fra || "9").localeCompare(String(b.fra || "9")),
      row: P => { const late = P.stada === "Afhent" && String(P.til || P.fra || "").slice(0, 10) < iso(new Date());
        return { open: "tb:" + P.id, stripe: late ? "bad" : P.stada === "Afhent" ? "warn" : ["Skilað", "Lokið"].includes(P.stada) ? "mut" : "acc", t: P.heiti || "Pöntun", s: [P.nr, P.vidskiptavinur].filter(Boolean).join(" · "), r1: sd(P.fra) + (P.til && String(P.til).slice(0, 10) !== String(P.fra || "").slice(0, 10) ? "–" + sd(P.til) : ""), r2: late ? "Skil sein" : P.stada || "", r2c: late ? "bad" : "" }; }
    }
  };
  const back = (label, act) => `<button type="button" class="s2back" data-s2="${E(act)}">${I(IC.back)}<span>${E(label)}</span></button>`;
  function listView(t) {
    const L = LISTS[t], all = L.items(), fk = st.f[t] || L.filters[0][0], F = L.filters.find(x => x[0] === fk) || L.filters[0];
    const q = fold(st.q.trim());
    let xs = all.filter(F[2]); if (q) xs = all.filter(x => L.text(x).some(v => fold(v).includes(q)));
    xs = xs.slice().sort(L.sort);
    const chips = L.filters.map(([k, l, fn, c, noN]) => { const n = noN ? "" : all.filter(fn).length; return `<button type="button" class="s2chip${k === F[0] && !q ? " on" : ""}${c && n ? " " + c : ""}" data-s2="f:${t}:${k}" aria-pressed="${k === F[0] && !q}">${E(l)}${n !== "" ? ` · ${n}` : ""}</button>`; }).join("");
    const rows = xs.slice(0, 200).map(x => { const r = L.row(x); return `<a class="s2row" data-s2open="${E(r.open)}" role="button" tabindex="0"><i class="s2st ${r.stripe}"></i><span class="s2rt"><b>${E(r.t)}</b><small>${E(r.s)}</small></span><span class="s2rr"><b class="${r.r1c || ""}">${E(r.r1 || "")}</b><small class="${r.r2c || ""}">${E(r.r2 || "")}</small></span></a>`; }).join("");
    return `<div class="s2 s2list"><div class="s2top"><h1>${E(L.title)}</h1><button type="button" class="s2ib" data-s2="q" aria-label="Leita í ${E(L.title.toLowerCase())}">${I(IC.search)}</button>${mcp() && !tr(() => isVett(), false) ? `<button type="button" class="s2ib dk" data-act="fabnew" aria-label="Nýtt">${I(IC.plus, 20, 2)}</button>` : ""}</div>`
      + (st.qOpen || st.q ? `<label class="s2q">${I(IC.search, 18)}<input type="search" id="s2q" value="${E(st.q)}" placeholder="Leita í ${E(L.title.toLowerCase())}" autocomplete="off" enterkeyhint="search" aria-label="Leita"></label>` : "")
      + `<div class="s2chips" role="toolbar" aria-label="Sía">${chips}</div>`
      + (rows ? `<section class="s2card s2rows">${rows}</section>${xs.length > 200 ? `<p class="s2foot">Fyrstu 200 af ${xs.length} – leitaðu til að þrengja.</p>` : ""}` : `<p class="s2empty">${q ? `Ekkert fannst fyrir „${E(st.q)}“.` : "Ekkert hér."}</p>`) + `</div>`;
  }

  /* ---------- 2. Opið verkefni ---------- */
  const SECT = [["undir", "Undirverk", "undirverk"], ["fundir", "Fundir", "fundir"], ["skrar", "Skjöl og myndir", ""], ["timar", "Tímar", "timar"], ["tilbod", "Tilboð", ""], ["pantanir", "Pantanir", "pantanir"], ["stillingar", "Upplýsingar og stillingar", ""]];
  function verkView(p) {
    const stod = tr(() => STODUR().filter(s => !s.falin), []), si = stod.findIndex(s => s.n === p.stada), done = isVerkDone(p);
    const late = !done && p.skiladagur && dTo(p.skiladagur) < 0, dl = p.skiladagur ? dTo(p.skiladagur) : null;
    const hrs = tr(() => faerslur().filter(e => e.verkefniId === p.id).reduce((a, e) => a + (+e.timar || 0), 0), 0), ak = +p.aklst || 0;
    const subs = p.undirverk || [], open = subs.filter(u => u.stada !== "Done");
    const fin = tr(() => can("fjarmal"), false), unb = fin ? tr(() => rkUnbilledKr(p.id), 0) : 0;
    const nx = open.slice().sort((a, b) => String(a.skiladagur || "9").localeCompare(String(b.skiladagur || "9")))[0];
    const who = sk => tr(() => starfName(sk), sk || "");
    const kp = (l, v, u, extra = "") => `<div class="s2kp"><small>${E(l)}</small><b>${v}${u ? `<u>${E(u)}</u>` : ""}</b>${extra}</div>`;
    const tbN = tr(() => window.tbCountFor ? tbCountFor(p.id) : 0, 0), pnN = tr(() => window.pnCountFor ? pnCountFor(p.id) : 0, 0);
    const files = tr(() => { const f = projFolder(p); return f ? (f.atridi || []).filter(x => x.s > 0).length : 0; }, 0);
    const meta = { undir: open.length ? open.length + " opin" : subs.length ? "öll lokin" : "", fundir: "", skrar: files ? String(files) : "", timar: hrs ? N(Math.round(hrs * 10) / 10) + " klst." : "", tilbod: tbN ? String(tbN) : "", pantanir: pnN ? String(pnN) : "", stillingar: "" };
    const okS = ([k, , mod]) => k === "tilbod" ? !!window.tbProjTab && tr(() => tbOK(), false) : k === "pantanir" ? !!window.pnProjTab && ON_("pantanir") : k === "skrar" ? ON_("skjol") || ON_("onedrive") : !mod || ON_(mod);
    return `<div class="s2 s2det"><div class="s2nav">${back("Verkefni", "back")}<span class="s2sp"></span><button type="button" class="s2ib" data-s2="cl:yfirlit" aria-label="Allt um verkefnið">${I(IC.more)}</button></div>`
      + `<div class="s2hd"><small>${E([p.nr, p.vidskiptavinur].filter(Boolean).join(" · "))}</small><h1>${E(p.stutt || p.nafn || "")}</h1></div>`
      + `<button type="button" class="s2card s2stage" data-s2="cl:yfirlit"><i class="s2dot ${late ? "bad" : done ? "ok" : "acc"}"></i><span class="s2stg"><b>${E(p.stada || "")}${si >= 0 ? ` <em>· skref ${si + 1} af ${stod.length}</em>` : ""}</b>${stod.length ? `<span class="s2steps">${stod.map((s, i) => `<i class="${i < si ? "d" : i === si ? "c" : ""}"></i>`).join("")}</span>` : ""}</span>${p.skiladagur ? `<span class="s2due${late ? " bad" : ""}">${late ? -dl + " d. seint" : "Skil " + E(sd(p.skiladagur))}</span>` : ""}</button>`
      + `<div class="s2kps">${ON_("timar") ? kp("Tímar", N(Math.round(hrs * 10) / 10), ak ? "/ " + N(ak) + " klst." : "klst.", ak ? `<span class="s2bar"><i class="${hrs / ak >= 1 ? "bad" : hrs / ak >= 0.8 ? "warn" : ""}" style="width:${Math.min(100, hrs / ak * 100)}%"></i></span>` : "") : ""}`
      + (fin ? kp("Óreikningsfært", N(unb), "kr.", unb > 0 ? `<a class="s2lnk" data-act="rknew:${E(p.id)}">Búa til reikning</a>` : "") : "")
      + (ON_("undirverk") ? kp("Undirverk", String(open.length), "af " + subs.length + " opin") : "")
      + kp("Skil", p.skiladagur ? (late ? String(-dl) : String(Math.max(0, dl))) : "–", p.skiladagur ? (late ? "d. seint" : dl === 0 ? "í dag" : "dagar eftir") : "", "") + `</div>`
      + (nx ? `<section class="s2next" data-s2="cl:undir" role="button" tabindex="0"><small>Næsta skref</small><b>${E(nx.heiti || nx.nr || "")}</b><span>${E([nx.nr, nx.starfsmadur ? who(nx.starfsmadur) : "", nx.skiladagur ? "skil " + sd(nx.skiladagur) : ""].filter(Boolean).join(" · "))}</span></section>` : "")
      + `<section class="s2card s2sec">${SECT.filter(okS).map(s => `<button type="button" class="s2srow" data-s2="cl:${s[0]}"><b>${E(s[1])}</b><span>${E(meta[s[0]] || "")}</span>${I(IC.chev, 16)}</button>`).join("")}</section>`
      + (mcp() ? `<div class="s2act">${ON_("timar") && !tr(() => klukka(), null) ? `<button type="button" class="s2btn dk" data-act="kstart:${E(p.id)}">${I(IC.play, 16)}Byrja klukku</button>` : ON_("timar") ? `<button type="button" class="s2btn dk" data-s2="skra:${E(p.id)}">${I(IC.plus, 18, 2)}Skrá tíma</button>` : ""}<button type="button" class="s2ib lg" data-s2="mynd:${E(p.id)}" aria-label="Mynd">${I(IC.cam, 22)}</button><button type="button" class="s2ib lg" data-s2="ath:${E(p.id)}" aria-label="Athugasemd">${I(IC.note, 22)}</button></div>` : "") + `</div>`;
  }

  /* ---------- 3. Opið tilboð / pöntun ---------- */
  const TFLOW = ["Drög", "Sent", "Samþykkt"], PFLOW = ["Ný", "Staðfest", "Afhent", "Skilað"];
  function tbView(T) {
    const P = !!tr(() => salaAPI.PN().some(x => x.id === T.id), false), tot = tr(() => salaAPI.totals(T), { net: 0, vsk: 0, tot: 0 });
    const old = T.stada === "Sent" ? -dTo(T.sent || T.dags) : 0;
    const pill = T.bidur && T.stada !== "Samþykkt" ? ["ok", (T.bidur.nafn || "Viðskiptavinur") + " samþykkti – staðfesta"] : T.stada === "Sent" ? [old >= 7 ? "warn" : "", "Sent · bíður svars" + (old > 0 ? " í " + old + " daga" : "")] : [T.stada === "Samþykkt" || T.stada === "Skilað" ? "ok" : T.stada === "Hafnað" ? "bad" : T.stada === "Afhent" ? "warn" : "", T.stada || ""];
    const deild = tr(() => salaAPI.vDeild ? "" : "", ""); void deild;
    const days = T.fra ? (() => { const a = dOf(T.fra), b = dOf(T.til || T.fra); return a && b ? Math.round((b - a) / 864e5) + 1 : 0; })() : 0;
    const V = T.verkefniId ? tr(() => findProj(T.verkefniId), null) : null;
    const facts = [["Tímabil", T.fra ? sd(T.fra) + (T.til && String(T.til).slice(0, 10) !== String(T.fra).slice(0, 10) ? "–" + sd(T.til) : "") + (days > 1 ? " · " + days + " dagar" : "") : ""], ["Staður", T.stadsetning || ""], [P ? "Tengiliður" : "Gildir til", P ? [T.tengilidur, T.simi].filter(Boolean).join(" · ") : T.gildir ? sd(T.gildir) : ""]].filter(f => f[1]);
    const L = (T.linur || []).filter(l => !l.haus), lsum = l => tr(() => salaAPI.lSum(l, T), (+l.magn || 0) * (+l.verd || 0));
    const flow = P ? PFLOW : TFLOW, i = flow.indexOf(T.stada), nxt = T.bidur && T.stada !== "Samþykkt" ? "Samþykkt" : i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
    const nxtL = { "Sent": "Merkja sent", "Samþykkt": T.bidur ? "Staðfesta samþykki" : "Merkja samþykkt", "Staðfest": "Staðfesta pöntun", "Afhent": "Afhenda", "Skilað": "Taka á móti" }[nxt] || nxt;
    const backL = P ? "Pantanir" : "Tilboð";
    return `<div class="s2 s2det"><div class="s2nav">${back(backL, "back")}<span class="s2sp"></span>${!P ? `<button type="button" class="s2pill" data-act="tbpdf:pv:${E(T.id)}">PDF</button>` : ""}<button type="button" class="s2ib" data-s2="cl:" aria-label="Allt um ${P ? "pöntunina" : "tilboðið"}">${I(IC.more)}</button></div>`
      + `<div class="s2hd"><small>${E([T.nr, T.vidskiptavinur].filter(Boolean).join(" · "))}</small><h1>${E(T.heiti || (P ? "Pöntun" : "Tilboð"))}</h1>${pill[1] ? `<span class="s2tag ${pill[0]}">${E(pill[1])}</span>` : ""}</div>`
      + `<section class="s2card s2amt"><small>Samtals án VSK</small><b>${E(N(tot.net))}<u>kr.</u></b><span>${E(N(tot.tot))} kr. með VSK${tot.afsl ? " · afsláttur " + N(tot.afsl) + " kr." : ""}</span></section>`
      + (facts.length || V ? `<section class="s2card s2facts">${facts.map(f => `<div class="s2fact"><small>${E(f[0])}</small><b>${E(f[1])}</b></div>`).join("")}${V ? `<button type="button" class="s2fact" data-s2open="verk:${E(V.id)}"><small>Verkefni</small><b>${E((V.nr || "") + " " + (V.stutt || V.nafn || ""))}</b>${I(IC.chev, 16)}</button>` : ""}</section>` : "")
      + `<section class="s2card s2lines"><div class="s2lh"><b>Línur</b><span>${L.length}</span></div>${L.slice(0, 4).map(l => `<div class="s2line"><span><b>${E(l.heiti || "")}</b><small>${E([N(+l.magn || 0) + " " + (l.eining || "stk"), l.teg === "leiga" && (l.dagar || days) ? (l.dagar || days) + " dagar" : ""].filter(Boolean).join(" · "))}</small></span><b>${E(N(lsum(l)))}</b></div>`).join("")}${L.length > 4 ? `<button type="button" class="s2more" data-s2="cl:">Allar línur (${L.length})${I(IC.chev, 16)}</button>` : ""}</section>`
      + (mcp() ? `<div class="s2act">${!P && T.stada === "Drög" ? `<button type="button" class="s2btn dk" data-act="tbsend:${E(T.id)}">Senda viðskiptavini</button><button type="button" class="s2btn" data-act="tbst:${E(T.id)}:Sent">Merkja sent</button>` : ""}${nxt && !(!P && T.stada === "Drög") ? `<button type="button" class="s2btn dk" data-act="tbst:${E(T.id)}:${E(nxt)}">${E(nxtL)}</button>` : ""}${!P && T.stada === "Sent" ? `<button type="button" class="s2btn" data-act="tbsend:${E(T.id)}">Senda aftur</button>` : ""}${!nxt && (P || T.stada === "Samþykkt" || T.stada === "Hafnað") ? `<button type="button" class="s2btn" data-s2="cl:">Allar aðgerðir</button>` : ""}</div>` : "") + `</div>`;
  }

  /* ---------- 4. Dagatal ---------- */
  function dayItems(k) {
    const R = [], who = st.who === "all" ? "*" : undefined;
    tr(() => (calItems(who).get(k) || []).filter(i => !i.span).forEach(i => R.push({ tm: String(i.when || "").match(/T(\d\d:\d\d)/)?.[1] || "", t: i.title || "", s: [i.kind, i.nr].filter(Boolean).join(" · "), open: i.open, c: /Skil/.test(i.kind || "") ? "bad" : /Fund|Viðburð/.test(i.kind || "") ? "acc" : "mut", done: i.done })), 0);
    tr(() => salaAPI.PN().filter(P => st.who === "all" || !window.tbMine || tbMine(P)).forEach(P => {
      if (String(P.fra || "").slice(0, 10) === k && !["Skilað", "Lokið"].includes(P.stada)) R.push({ tm: String(P.fra).match(/T(\d\d:\d\d)/)?.[1] || "", t: (P.nr || "") + " " + (P.heiti || ""), s: "Afhending · " + (P.vidskiptavinur || ""), open: "tb:" + P.id, c: "warm" });
      if (String(P.til || "").slice(0, 10) === k && P.stada === "Afhent") R.push({ tm: String(P.til).match(/T(\d\d:\d\d)/)?.[1] || "", t: (P.nr || "") + " " + (P.heiti || ""), s: "Skil · " + (P.vidskiptavinur || ""), open: "tb:" + P.id, c: "warm" });
    }), 0);
    tr(() => (S.dagsverk || []).filter(D => !D.lokid && D.dagur <= k && (D.til || D.dagur) >= k && (st.who === "all" || (D.menn || []).map(x => String(x).toUpperCase()).includes(mySk()))).forEach(D => {
      R.push({ tm: D.kl || "", t: D.heiti || "Verk", s: [D.verkefniId ? tr(() => findProj(D.verkefniId)?.nr, "") : "Innra verk", (D.menn || []).map(x => tr(() => starfName(x), x).split(" ")[0]).join(", ")].filter(Boolean).join(" · "), act: "dvopn:" + D.id, c: "mut" });
    }), 0);
    return R.sort((a, b) => (a.tm || "99").localeCompare(b.tm || "99"));
  }
  function calView(t) {
    const today = iso(new Date()), k = st.day || today, x = dOf(k), mon = new Date(x); mon.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    const days = [...Array(7)].map((_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
    const wk = tr(() => { const d = new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())); const dn = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dn); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil(((d - y0) / 864e5 + 1) / 7); }, "");
    const items = dayItems(k), hrs = tr(() => faerslur().filter(e => String(e.date).slice(0, 10) === k && (e.starfsmadur || me()) === me()).reduce((a, e) => a + (+e.timar || 0), 0), 0);
    const strip = days.map(d => { const di = iso(d), n = dayItems(di).length, we = d.getDay() === 0 || d.getDay() === 6; return `<button type="button" class="s2day${di === k ? " on" : ""}${di === today ? " td" : ""}${we ? " we" : ""}" data-s2="day:${di}" aria-pressed="${di === k}" aria-label="${E(DNL[d.getDay()] + " " + d.getDate() + ". " + MNL[d.getMonth()])}"><small>${DNS[d.getDay()].toUpperCase()}</small><b>${d.getDate()}</b><i class="${n ? "y" : ""}"></i></button>`; }).join("");
    const pv = new Date(mon); pv.setDate(mon.getDate() - 7); const nx = new Date(mon); nx.setDate(mon.getDate() + 7);
    const list = items.length ? items.map(a => `<a class="s2ev" ${a.open ? `data-s2open="${E(a.open)}"` : `data-act="${E(a.act)}"`} role="button" tabindex="0"><span class="s2evt"><b>${E(a.tm || "Allan")}</b><small>${a.tm ? "" : "daginn"}</small></span><i class="s2st ${a.c}"></i><span class="s2rt"><b${a.done ? ' class="done"' : ""}>${E(a.t)}</b><small>${E(a.s)}</small></span></a>`).join("") : `<p class="s2empty">Ekkert á dagskrá${st.who === "all" ? "" : " hjá þér"} þennan dag.</p>`;
    const canAll = tr(() => STARFS().length > 1, false);
    return `<div class="s2 s2cal"><div class="s2top"><div class="s2tt"><small>${E(MNL[x.getMonth()].replace(/^./, c => c.toUpperCase()) + " " + x.getFullYear())}${wk ? " · vika " + wk : ""}</small><h1>Dagatal</h1></div>${canAll ? `<button type="button" class="s2pill" data-s2="who">${st.who === "all" ? "Allir" : "Ég"}${I(IC.down, 14, 2)}</button>` : ""}${mcp() ? `<button type="button" class="s2ib dk" data-s2="calnew:${k}" aria-label="Nýtt á dagatal">${I(IC.plus, 20, 2)}</button>` : ""}</div>`
      + `<div class="s2card s2strip"><button type="button" class="s2wk" data-s2="day:${iso(pv)}" aria-label="Fyrri vika">${I(IC.back, 18)}</button><div class="s2days">${strip}</div><button type="button" class="s2wk" data-s2="day:${iso(nx)}" aria-label="Næsta vika">${I(IC.chev, 18)}</button></div>`
      + `<div class="s2dh"><b>${E(DNL[x.getDay()] + " " + x.getDate() + ". " + MNS[x.getMonth()])}</b><span>${items.length} ${items.length === 1 ? "atriði" : "atriði"}${hrs ? " · " + N(Math.round(hrs * 10) / 10) + " klst. skráðar" : ""}</span>${k !== today ? `<button type="button" class="s2lnk" data-s2="day:${today}">Í dag</button>` : ""}</div>`
      + `<div class="s2evs">${list}</div>`
      + `<button type="button" class="s2full" data-s2="calfull">Vikuplan og dagatal teymis${I(IC.chev, 16)}</button></div>`;
  }

  /* ---------- 5. Skrá tíma ---------- */
  function recentPs() {
    const out = [], seen = new Set();
    tr(() => faerslur().filter(e => (e.starfsmadur || me()) === me() && e.verkefniId).sort((a, b) => String(b.date + (b.fra || "")).localeCompare(String(a.date + (a.fra || "")))).forEach(e => { if (!seen.has(e.verkefniId)) { const p = findProj(e.verkefniId); if (p && !isVerkDone(p)) { seen.add(p.id); out.push(p); } } }), 0);
    if (out.length < 3) tr(() => verkefni().filter(p => !seen.has(p.id) && !isVerkDone(p) && mineP(p)).forEach(p => { seen.add(p.id); out.push(p); }), 0);
    return out.slice(0, 3);
  }
  const hm = m => pad(Math.floor(m / 60) % 24) + ":" + pad(m % 60), toM = s => { const [h, m] = String(s).split(":").map(Number); return h * 60 + (m || 0); };
  function slot(day, h) {
    const len = Math.round(h * 60), mine = tr(() => faerslur().filter(e => !e.live && String(e.date).slice(0, 10) === day && (e.starfsmadur || me()) === me() && e.fra && e.til), []);
    const free = (a, b) => a >= 0 && b <= 1440 && !mine.some(e => { const c = toM(e.fra), d = toM(e.til) <= c ? toM(e.til) + 1440 : toM(e.til); return a < d && c < b; });
    if (day === iso(new Date())) { const n = new Date(), end = Math.floor((n.getHours() * 60 + n.getMinutes()) / 15) * 15; if (free(end - len, end)) return [hm(end - len), hm(end)]; }
    const last = mine.reduce((a, e) => Math.max(a, toM(e.til)), 0), s0 = Math.max(9 * 60, last);
    if (free(s0, s0 + len)) return [hm(s0), hm(s0 + len)];
    for (let s = 6 * 60; s + len <= 1440; s += 15) if (free(s, s + len)) return [hm(s), hm(s + len)];
    return null;
  }
  const SK = { pid: null, h: 1, day: null, fra: "", til: "", edit: false, desc: "" };
  function skraHTML() {
    const ps = recentPs(), sel = SK.pid, extra = sel && !ps.some(p => p.id === sel) ? tr(() => findProj(sel), null) : null, list = extra ? [extra, ...ps] : ps;
    const today = iso(new Date()), y = new Date(); y.setDate(y.getDate() - 1); const yest = iso(y), day = SK.day || today;
    const sl = SK.edit ? [SK.fra, SK.til] : slot(day, SK.h) || ["", ""];
    const all = tr(() => verkefni().filter(p => !isVerkDone(p)).sort((a, b) => String(b.nr).localeCompare(String(a.nr))), []);
    const chip = (v, l, on, extraCls = "") => `<button type="button" class="s2chip${on ? " on" : ""}${extraCls}" ${v} aria-pressed="${!!on}">${E(l)}</button>`;
    return `<div class="s2sh-top"><h2>Skrá tíma</h2><button type="button" class="s2ib" data-sk="x" aria-label="Loka">${I(IC.x, 18)}</button></div>
      <div class="s2sh-body">
        <div class="s2f"><small>Á hvað?</small><div class="s2wrap">${list.map(p => chip(`data-sk="p:${E(p.id)}"`, (p.nr || "") + " " + (p.stutt || p.nafn || ""), sel === p.id)).join("")}${chip('data-sk="p:"', "Án verkefnis", sel === "")}<label class="s2chip s2sel${extra || (sel && !list.some(p => p.id === sel)) ? " on" : ""}"><span>Annað…</span><select id="s2k-p" aria-label="Velja verkefni"><option value="">Velja verkefni</option>${all.map(p => `<option value="${E(p.id)}"${p.id === sel ? " selected" : ""}>${E((p.nr || "") + " " + (p.stutt || p.nafn || ""))}</option>`).join("")}</select></label></div></div>
        <div class="s2f"><small>Hve lengi?</small><div class="s2step"><button type="button" data-sk="h:-0.5" aria-label="Minnka um hálftíma">−</button><b>${E(N(SK.h))}<u>klst.</u></b><button type="button" data-sk="h:0.5" aria-label="Auka um hálftíma">+</button></div>
          <div class="s2quick">${[0.5, 1, 2, 4, 8].map(v => chip(`data-sk="hs:${v}"`, N(v), SK.h === v)).join("")}</div>
          <div class="s2slot">${sl[0] ? `kl. <b>${E(sl[0])}–${E(sl[1])}</b>` : `<b class="bad">Enginn laus tími þennan dag</b>`} · <button type="button" class="s2lnk" data-sk="edit">${SK.edit ? "Sjálfvirkt" : "Breyta tíma"}</button>${ON_("timar") && !tr(() => klukka(), null) ? ` · <button type="button" class="s2lnk" data-sk="klukka">Byrja klukku</button>` : ""}</div>
          ${SK.edit ? `<div class="s2times"><label>Frá<input type="time" id="s2k-fra" value="${E(SK.fra)}" step="300"></label><label>Til<input type="time" id="s2k-til" value="${E(SK.til)}" step="300"></label></div>` : ""}</div>
        <div class="s2f"><small>Hvenær?</small><div class="s2wrap">${chip(`data-sk="d:${today}"`, "Í dag", day === today)}${chip(`data-sk="d:${yest}"`, "Í gær", day === yest)}<label class="s2chip s2sel${day !== today && day !== yest ? " on" : ""}"><span>${day !== today && day !== yest ? E(sd(day)) : "Velja dag"}</span><input type="date" id="s2k-d" value="${E(day)}" aria-label="Velja dag"></label></div></div>
        <label class="s2f" for="s2k-desc"><small>Hvað var gert?</small><textarea id="s2k-desc" rows="3" placeholder="T.d. teikningar af sal, fundur með viðskiptavini">${E(SK.desc)}</textarea></label>
        <button type="button" class="s2srow s2moreb" data-sk="meira"><b>Meira</b><span>Undirverk · tegund · starfsmaður · kostnaður</span>${I(IC.chev, 16)}</button>
        <p class="s2msg" id="s2k-msg" role="alert"></p>
      </div>
      <div class="s2sh-foot"><button type="button" class="s2btn dk s2save" data-sk="save">Vista ${E(N(SK.h))} klst.</button></div>`;
  }
  function skra(pid) {
    if (!mcp()) return;
    document.getElementById("s2sk")?.remove();
    Object.assign(SK, { pid: pid ?? (tr(() => JSON.parse(localStorage.getItem("aera-last") || "null")?.pid, null) || recentPs()[0]?.id || ""), h: 1, day: null, fra: "", til: "", edit: false, desc: "" });
    const w = document.createElement("div"); w.id = "s2sk"; w.className = "s2sheet"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", "Skrá tíma");
    const draw = () => { const a = document.activeElement?.id; w.innerHTML = skraHTML(); if (a) document.getElementById(a)?.focus(); };
    draw(); document.body.append(w); document.body.classList.add("s2lock");
    const close = () => { w.remove(); document.body.classList.remove("s2lock"); };
    w.addEventListener("input", e => { if (e.target.id === "s2k-desc") SK.desc = e.target.value; if (e.target.id === "s2k-fra") SK.fra = e.target.value; if (e.target.id === "s2k-til") SK.til = e.target.value; });
    w.addEventListener("change", e => {
      if (e.target.id === "s2k-p" && e.target.value) { SK.pid = e.target.value; draw(); }
      if (e.target.id === "s2k-d" && e.target.value) { SK.day = e.target.value; draw(); }
      if ((e.target.id === "s2k-fra" || e.target.id === "s2k-til") && SK.fra && SK.til) { const h = tr(() => hoursBetween(SK.fra, SK.til), 0); if (h > 0) { SK.h = h; draw(); } }
    });
    w.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    w.addEventListener("click", async e => {
      const b = e.target.closest("[data-sk]"); if (!b) return; const [k, v] = b.dataset.sk.split(/:(.*)/s);
      if (k === "x") return close();
      if (k === "p") { SK.pid = v; return draw(); }
      if (k === "h") { SK.h = Math.max(0.25, Math.min(24, Math.round((SK.h + +v) * 4) / 4)); SK.edit = false; return draw(); }
      if (k === "hs") { SK.h = +v; SK.edit = false; return draw(); }
      if (k === "d") { SK.day = v; return draw(); }
      if (k === "edit") { if (!SK.edit) { const s = slot(SK.day || iso(new Date()), SK.h) || ["09:00", hm(9 * 60 + Math.round(SK.h * 60))]; SK.fra = s[0]; SK.til = s[1]; } SK.edit = !SK.edit; return draw(); }
      if (k === "klukka") { close(); try { kind = "tima"; PREFILL = { timer: true }; openSheet(); } catch (x) {} return; }
      if (k === "meira") { close(); try { kind = "tima"; PREFILL = null; openSheet(); setTimeout(() => { const f = (id, val) => { const el = document.getElementById(id); if (el && val != null && val !== "") { el.value = val; el.dispatchEvent(new Event("change", { bubbles: true })); } }; f("f-proj", SK.pid); f("f-desc", SK.desc); f("f-date", SK.day || iso(new Date())); }, 60); } catch (x) {} return; }
      if (k === "save") await saveSkra(b, close);
    });
    setTimeout(() => w.querySelector("#s2k-desc")?.focus({ preventScroll: true }), 80);
  }
  async function saveSkra(btn, close) {
    const msg = t => { const m = document.getElementById("s2k-msg"); if (m) m.textContent = t || ""; };
    const day = SK.day || iso(new Date()), desc = SK.desc.trim(), pid = SK.pid || "";
    if (!desc) return msg("Skrifaðu stutta lýsingu á því sem var gert."), document.getElementById("s2k-desc")?.focus();
    const sl = SK.edit ? [SK.fra, SK.til] : slot(day, SK.h);
    if (!sl || !sl[0] || !sl[1]) return msg("Enginn laus tími þennan dag fyrir " + N(SK.h) + " klst. – veldu „Breyta tíma“.");
    const [fr, to] = sl, sk = me(), t = tr(() => hoursBetween(fr, to), SK.h);
    const ov = tr(() => overlaps(day, fr, to, sk, null), null); if (ov) return msg(`Skarast við „${tr(() => cleanLys(ov.lysing), ov.lysing)}“ kl. ${ov.fra}–${ov.til}.`);
    btn.disabled = true; btn.textContent = "Vista…";
    try {
      try { localStorage.setItem("aera-last", JSON.stringify({ pid, sid: null, sk })); } catch (e) {}
      const id = newId(), lys = lysFmt(day, desc, t);
      await saveSnapshot(s => { const p = pid ? sFindP(s, pid) : null; if (p) p.timar = (p.timar || 0) + t;
        s.timar = s.timar || {}; s.timar.samtals = (s.timar.samtals || 0) + t; if (!s.timar.timabil || timabilOf(day) === s.timar.timabil) s.timar.timabilSamtals = (s.timar.timabilSamtals || 0) + t;
        const L = sTimes(s); L.unshift({ id, date: day, lysing: lys, nr: p?.nr, verkefniId: pid, undirverkId: null, fra: fr, til: to, timar: t, starfsmadur: sk, timabil: timabilOf(day), taxti: null });
        L.sort((a, b) => String(b.date + (b.fra || "")).localeCompare(String(a.date + (a.fra || "")))); s.timar.nyjast = L.slice(0, 10); });
      close(); tr(() => toast("Skráð: " + N(t) + " klst."), 0);
    } catch (e) { btn.disabled = false; btn.textContent = "Vista " + N(SK.h) + " klst."; msg(e?.message || "Vistun mistókst – reyndu aftur."); }
  }
  window.s2Skra = skra;
  window.S2API = { dayItems, calTabs: () => calTabs() };

  /* ---------- Tengt við appið ---------- */
  const calTabs = () => { const s = tr(() => SECTIONS, []).find(x => x.k === "dagatal"); return s ? s.tabs.map(t => t[0]) : []; };
  const secLabel = k => tr(() => SECTIONS.find(x => x.tabs.some(t => t[0] === k))?.l, "");
  function nat() {
    const v = document.getElementById("view"); if (!v) return;
    document.body.classList.add("s2"); document.body.classList.remove("s2detb", "s2cl");
    const D = tr(() => DETAIL, null), t = tr(() => tab, "");
    if (D !== st.clFor) { st.cl = false; st.clFor = D; }
    let h = null;
    // 2.156.0: símaskelin (simi/*.js) teiknar lista og opin verkefni/tilboð í U2d – simi2 sér aðeins um dagatalið og Skrá tíma
    const SMK = !!window.SM;
    if (SMK) return;   // 2.157.0: dagatalið líka (simi/dagatal.js notar dayItems hér að neðan)
    if (D && !st.cl) {
      if (/^verk:/.test(D)) { const p = tr(() => findProj(D.slice(5)), null); if (p) h = verkView(p); }
      else if (/^tb:/.test(D)) { const id = D.slice(3), T = tr(() => [...salaAPI.TB(), ...salaAPI.PN()].find(x => x.id === id), null); if (T) h = tbView(T); }
      if (h) document.body.classList.add("s2detb");
    } else if (D && st.cl) {
      // tölvuskjárinn (allt um atriðið) með „‹ <heiti>“ efst
      const nm = /^verk:/.test(D) ? tr(() => { const p = findProj(D.slice(5)); return p?.stutt || p?.nafn || p?.nr; }, "Til baka") : "Til baka";
      document.body.classList.add("s2cl");
      if (!v.querySelector(".s2clb")) v.insertAdjacentHTML("afterbegin", `<div class="s2nav s2clb">${back(nm, "uncl")}</div>`);
      return;
    } else if (!D) {
      if (LISTS[t]) h = listView(t);
      else if (calTabs().includes(t) && !st.calClassic) h = calView(t);
    }
    if (h) {
      v.innerHTML = h; document.body.classList.remove("simhasact"); document.body.classList.add("simdag");
      if (st.qOpen) { const q = document.getElementById("s2q"); if (q && document.activeElement !== q) { q.focus(); const n = q.value.length; q.setSelectionRange(n, n); } }
    }
  }
  document.addEventListener("input", e => { if (e.target.id !== "s2q") return; st.q = e.target.value; const v = document.getElementById("view"), t = tr(() => tab, ""); if (v && LISTS[t]) { const s = v.querySelector(".s2rows, .s2empty"); const tmp = document.createElement("div"); tmp.innerHTML = listView(t); const n = tmp.querySelector(".s2rows, .s2empty"), c = tmp.querySelector(".s2chips"); if (s && n) s.replaceWith(n); else if (n) v.querySelector(".s2list")?.append(n); const oc = v.querySelector(".s2chips"); if (oc && c) oc.replaceWith(c); } });
  document.addEventListener("click", e => {
    if (!phone()) return;
    const o = e.target.closest("[data-s2open]");
    if (o && !e.target.closest("[data-act]:not([data-s2open])")) { e.preventDefault(); e.stopPropagation(); tr(() => openDetail(o.dataset.s2open), 0); return; }
    const b = e.target.closest("[data-s2]"); if (!b) return; e.preventDefault(); e.stopPropagation();
    const [k, ...r] = b.dataset.s2.split(":"), a = r.join(":");
    if (k === "back") return tr(() => goBack(), 0);
    if (k === "f") { st.f[r[0]] = r[1]; st.q = ""; st.qOpen = false; return render(); }
    if (k === "q") { st.qOpen = !st.qOpen; if (!st.qOpen) st.q = ""; return render(); }
    if (k === "cl") { st.cl = true; st.clFor = tr(() => DETAIL, null); if (a) tr(() => { DTAB = a; }, 0); render(); window.scrollTo({ top: 0 }); return; }
    if (k === "uncl") { st.cl = false; tr(() => { DTAB = "yfirlit"; }, 0); render(); window.scrollTo({ top: 0 }); return; }
    if (k === "day") { st.day = a; return render(); }
    if (k === "who") { st.who = st.who === "all" ? "me" : "all"; return render(); }
    if (k === "calnew") { tr(() => { kind = "fund"; PREFILL = { date: a }; openSheet(); }, 0); return; }
    if (k === "calfull") { st.calClassic = true; render(); return; }
    if (k === "skra") return skra(a || undefined);
    if (k === "mynd") return window.simiPhoto?.(a);
    if (k === "ath") return window.simiNote?.(a);
  }, true);
  // Dagatal í tölvuútliti („Vikuplan og dagatal teymis“) – aftur í dagskrána þegar farið er af flipanum
  document.addEventListener("click", e => { if (e.target.closest('#tbar [data-tab], [data-act^="tab:"]')) { st.calClassic = false; st.q = ""; st.qOpen = false; } }, true);
  const _r = window.render;
  function renderS2() { _r.apply(this, arguments); if (!phone()) { document.body.classList.remove("s2", "s2detb"); return; } try { nat(); } catch (e) { console.warn("simi2", e); } }
  window.render = renderS2; try { render = renderS2; } catch (e) {}
})();
