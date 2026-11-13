/* verkyfir.js (2.145.0) – Verkefni › Yfirlit í útliti S3 („Ferill og næsta skref“ á útlitsstriganum).
   Byggt ofan á spjaldið sem app-sidur.js (dVerk) og utlit-i.js (fixDet) teikna: hlutarnir eru færðir á nýja staði, engin gögn breytast.
   - Stöðustika: allar stöður (STODUR) sem skref; smellur breytir stöðu (status:verk:…), sömu aðgerðir og áður.
   - Næsta skref (grafít): reiknað úr stöðu, tilboðum, tímum og óreikningsfærðu; p.naest gengur framar ef það er skráð.
     „Byrja án tilboðs“ (vs3start): staðan færist í „Í vinnslu“ (eða næstu stöðu), innheimta verður Tímavinna ef hún var ekki valin, og athugasemd skráist.
   - Spjöld: Starfsfólk og skil · Tímar (opnar Tímar-flipann með tímafærslum) · Undirverk · Afkoma/Óreikningsfært
   - Neðst: Tilboð og pantanir · Skrár (nýjustu skrár möppunnar, draga inn eða velja) · Athugasemdir og póstur.
   Annað af gamla yfirlitinu (undirverkaspjöld, búnaður, framundan, lýsing, afkoma, aukaverk) fer í „Á verkinu“. */
(function () {
  const E = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const tr = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const H1 = n => (Math.round((+n || 0) * 10) / 10).toString().replace(".", ",");
  const KR = n => tr(() => kr(Math.round(n)), Math.round(n).toLocaleString("de-DE") + " kr.");
  const ED = () => tr(() => !!MCP, false), FIN = () => tr(() => !window.can || can("fjarmal"), false);
  const IC = {
    clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></svg>',
    list: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h9"/></svg>',
    bars: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 17V7M10 17V4M15 17v-6M20 17V9"/></svg>',
    play: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    up: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15"/></svg>',
    folder: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8A1.5 1.5 0 0 1 20.5 9v8A1.5 1.5 0 0 1 19 18.5H5A1.5 1.5 0 0 1 3.5 17z"/></svg>',
  };
  const card = (cls, head, body) => `<section class="vs3c ${cls || ""}">${head ? `<div class="vs3h">${head}</div>` : ""}${body}</section>`;
  const hd = (t, extra) => `<span class="vs3dot" aria-hidden="true"></span><h3>${E(t)}</h3>${extra || ""}`;
  const stillOf = () => tr(() => STODUR().filter(x => x && x.n), []);
  const workIdx = sts => { const i = sts.findIndex(x => /vinnsl|í gangi|virk|unnið/i.test(x.n)); return i > 0 ? i : Math.min(1, sts.length - 1); };
  const tbStPill = T => { const s = T.stada || "Drög", c = s === "Samþykkt" ? "ok" : s === "Hafnað" ? "red" : /Sent|Bíður/.test(s) || T.bidur ? "wait" : ""; return `<span class="vs3p ${c}">${E(T.bidur && s !== "Samþykkt" ? "Samþykkt af viðskiptavini" : s)}</span>`; };
  const typeOf = n => (String(n || "").split(".").pop() || "").toUpperCase().slice(0, 4);
  const when = iso => { if (!iso) return ""; const d0 = new Date(iso), t = new Date(), diff = Math.round((new Date(t.toDateString()) - new Date(d0.toDateString())) / 864e5); return diff === 0 ? "í dag" : diff === 1 ? "í gær" : tr(() => fmtDate(iso), String(iso).slice(0, 10)); };

  /* ---------- Næsta skref ---------- */
  function next(p, ctx) {
    const { sts, idx, tbs, unb, hours, ih, tbAct } = ctx, kl = tr(() => klukka(), null), id = E(p.id), B = [];
    const klB = () => kl ? `<button type="button" class="vs3b w" data-act="kedit">Klukka í gangi</button>` : `<button type="button" class="vs3b w" data-act="kstart:${id}">${IC.play}Byrja klukku</button>`;
    const tB = `<button type="button" class="vs3b g" data-act="add:tima">Skrá tíma</button>`;
    const uB = tr(() => ON("undirverk"), true) ? `<button type="button" class="vs3b g" data-act="add:undir">+ Undirverk</button>` : "";
    let t, d = "", link = "";
    const sent = tbs.find(T => T.bidur && T.stada !== "Samþykkt") || null, wait = tbs.find(T => /Sent/.test(T.stada || "") && !T.bidur) || null;
    if (p.naest) { t = p.naest; d = p.athuga ? "Athuga: " + p.athuga : ""; B.push(klB(), tB); }
    else if (tr(() => isDone(p), false)) { t = "Verkefninu er lokið"; d = unb > 0 && FIN() ? `${KR(unb)} er enn óreikningsfært.` : "Allt frágengið."; if (unb > 0 && FIN()) B.push(`<button type="button" class="vs3b w" data-act="rknew:${id}">Búa til reikning</button>`); }
    else if (sent) { t = `Staðfestu tilboð ${sent.nr || ""} – viðskiptavinurinn samþykkti`; d = "Þegar þú staðfestir verður tilboðið að grunni verksins."; B.push(`<button type="button" class="vs3b w" data-open="tb:${E(sent.id)}">Skoða og staðfesta</button>`); }
    else if (idx <= 0 && !tbs.some(T => T.stada === "Samþykkt") && !hours) {
      const vsk = p.vidskiptavinur || "viðskiptavininum";
      t = tbAct ? `Senda ${vsk} tilboð` : "Hefja verkið"; d = tbAct ? `Verkefnið er ${String(p.stada || "").toLowerCase() || "nýtt"}. Þegar tilboð er samþykkt færist það í vinnslu – eða byrjaðu strax og rukkaðu eftir tímum.` : "Færðu verkefnið í vinnslu og byrjaðu að skrá tíma.";
      if (tbAct) B.push(`<button type="button" class="vs3b w" data-act="${E(tbAct)}">Búa til tilboð</button>`);
      if (ED() && sts.length > 1) B.push(`<button type="button" class="vs3b ${tbAct ? "g" : "w"}" data-act="vs3start:${id}">${tbAct ? "Byrja án tilboðs" : "Byrja verkið"}</button>`);
    }
    else if (wait) { t = `Bíður svars við tilboði ${wait.nr || ""}`; d = `Sent ${tr(() => fmtDate(wait.sent || wait.dags), "")}. Ýttu á eftir ef ekkert hefur heyrst.`; B.push(`<button type="button" class="vs3b w" data-open="tb:${E(wait.id)}">Opna tilboð</button>`, klB()); }
    else if (unb > 0 && FIN() && ih === "timar" && hours >= 1) { t = `${KR(unb)} óreikningsfært`; d = "Tímar og kostnaður sem eiga eftir að fara á reikning."; B.push(`<button type="button" class="vs3b w" data-act="rknew:${id}">Búa til reikning</button>`, klB(), tB); }
    else if (!hours) { t = "Skrá fyrsta tímann á verkið"; d = ih === "timar" ? `Tímar sem eru skráðir hér verða að reikningi${p.vidskiptavinur ? " til " + p.vidskiptavinur : ""}.` : "Tímarnir eru bornir saman við tilboðið."; B.push(klB(), tB, uB); }
    else if (p.skiladagur && tr(() => daysTo(p.skiladagur), 99) <= 7) { const n = tr(() => daysTo(p.skiladagur), 0); t = n < 0 ? "Komið fram yfir skiladag" : n === 0 ? "Skil í dag" : `Skil eftir ${n} ${n === 1 ? "dag" : "daga"}`; B.push(klB(), tB); }
    else { t = "Halda áfram með verkið"; d = `${H1(hours)} klst. skráðar.`; B.push(klB(), tB, uB); }
    if (!ED()) B.length = 0;
    if (tbAct && idx > 0 && !tbs.length && !p.naest && !tr(() => isDone(p), false)) link = `<a href="#" class="vs3lk" data-act="${E(tbAct)}">Búa samt til tilboð</a>`;
    const ihL = ih === "timar" ? "Tímavinna · reikningsfært eftir skráðum tímum" : ih === "tilbod" ? "Fast verð · skv. tilboði" : "Ekki rukkað";
    return `<section class="vs3c vs3nx"><div class="vs3k"><span>Næsta skref</span><em>${E(ihL)}</em></div><h3>${E(t)}</h3>${d ? `<p>${E(d)}</p>` : ""}${B.length || link ? `<div class="vs3bs">${B.join("")}${link}</div>` : ""}</section>`;
  }

  /* ---------- 2.145.5: næsta skref og virkni fyrir Í dag › Verkefni í gangi ---------- */
  window.vs3Info = function (p) {
    const api = window.salaAPI, sts = stillOf().filter(x => !x.falin || x.n === p.stada), idx = sts.findIndex(x => x.n === p.stada);
    const tbs = api ? tr(() => api.TB().filter(T => T.verkefniId === p.id && !T.pontun), []) : [];
    const live = tr(() => liveProjH(p.id), 0), hours = (+p.timar || 0) + live, ih = tr(() => innheimtaOf(p), "timar");
    const unb = FIN() && window.rkUnbilledKr ? tr(() => rkUnbilledKr(p.id), 0) : 0;
    const tbAct = (tr(() => tbProjTab(p), "").match(/data-act="(tbnew:[^"]+)"/) || [])[1] || "";
    const h = next(p, { sts, idx, tbs, unb, hours, ih, tbAct }), t = (h.match(/<h3>([\s\S]*?)<\/h3>/) || [])[1] || "";
    const es = tr(() => faerslur(), []).filter(e => e.verkefniId === p.id && !e.live), mon = (() => { const d0 = new Date(); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - ((d0.getDay() + 6) % 7)); return d0; })();
    const wk = es.filter(e => new Date(String(e.date).slice(0, 10) + "T12:00:00") >= mon).reduce((a, e) => a + (+e.timar || 0), 0) + live;
    const last = [p.stofnad_t, ...es.map(e => String(e.date).slice(0, 10) + "T" + (e.til || e.fra || "12:00") + ":00"), ...(p.athugasemdir || []).map(c => c.d), ...(p.saga || []).map(x => x.d)].filter(Boolean).sort().pop() || "";
    return { next: t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'), wk, live: !!live, last, idx, first: idx <= 0, sts };
  };

  /* ---------- Saga verkefnisins (2.145.2) ---------- */
  const who = sk => sk ? tr(() => starfName(sk), sk).split(" ")[0] : "";
  const dt = x => { if (!x) return ""; const s0 = String(x); return s0.length <= 10 ? s0 + "T12:00:00" : s0; };
  function events(p) {
    const ev = [], api = window.salaAPI;
    (p.athugasemdir || []).forEach(c => ev.push({ d: c.d, k: "cm", sk: c.sk, t: c.t, id: c.id }));
    (p.saga || []).forEach(x => ev.push({ d: x.d, k: x.k || "st", sk: x.sk, t: x.t }));
    if (p.stofnad_t) ev.push({ d: p.stofnad_t, k: "new", t: "Verkefnið stofnað" });
    tr(() => faerslur(), []).filter(e => e.verkefniId === p.id && !e.live).forEach(e => { const u = e.undirverkId ? (p.undirverk || []).find(x => x.id === e.undirverkId) : null;
      ev.push({ d: dt(e.date + (e.til ? "T" + e.til + ":00" : e.fra ? "T" + e.fra + ":00" : "")), k: "time", sk: e.starfsmadur, t: `skráði ${H1(e.timar)} klst.${e.lysing ? " – " + tr(() => cleanLys(e.lysing), e.lysing) : ""}${u ? " · " + tr(() => subName(u), u.heiti || "") : ""}` }); });
    tr(() => kostn(), []).filter(k => k.verkefniId === p.id).forEach(k => ev.push({ d: dt(k.date), k: "kostn", sk: k.starfsmadur, t: `skráði kostnað${k.lysing ? " – " + k.lysing : ""}${FIN() ? " · " + KR(+k.upphaed || 0) : ""}` }));
    if (api) [...tr(() => api.TB(), []), ...tr(() => api.PN(), [])].filter(T => T.verkefniId === p.id).forEach(T => { const nm = (T.pontun ? "Pöntun " : "Tilboð ") + (T.nr || "");
      if (T.dags) ev.push({ d: dt(T.dags), k: "tb", t: `${nm} búið til`, open: "tb:" + T.id });
      if (T.sent) ev.push({ d: dt(T.sent), k: "tb", t: `${nm} sent${T.sentTil ? " til " + T.sentTil : ""}`, open: "tb:" + T.id });
      if (T.bidur?.dags) ev.push({ d: dt(T.bidur.dags), k: "ok", t: `${T.bidur.nafn || "Viðskiptavinur"} samþykkti ${nm}`, open: "tb:" + T.id }); });
    (S?.reikningar || []).filter(R => R.stada !== "Ógilt" && (R.verkefniIds || [R.verkefniId]).includes(p.id)).forEach(R => { if (!FIN()) return;
      ev.push({ d: dt(R.dags), k: "rk", t: `Reikningur ${R.bokhald?.nr || R.nr || ""} gefinn út · ${KR(+R.net || 0)}`, open: "reikn:" + R.id });
      if (R.stada === "Greitt" && R.greitt) ev.push({ d: dt(R.greitt), k: "ok", t: `Reikningur ${R.bokhald?.nr || R.nr || ""} greiddur`, open: "reikn:" + R.id }); });
    (S?.fundir || []).filter(f => tr(() => fundProj(f)?.id, null) === p.id && !f.persona && String(f.date || "") <= new Date().toISOString()).forEach(f => ev.push({ d: f.date, k: "fund", t: `Fundur: ${tr(() => fundNafn(f), f.name || "")}`, open: "fund:" + f.id }));
    return ev.filter(x => x.d).sort((a, b) => String(b.d).localeCompare(String(a.d)));
  }
  const EIC = { time: "◷", st: "●", new: "+", tb: "▤", ok: "✓", rk: "kr", fund: "◎", kostn: "−" };
  function feedHTML(p) {
    const ev = events(p); if (!ev.length) return `<p class="vs3m">Ekkert enn. Appið skráir hér tíma, stöðubreytingar, tilboð, reikninga og fundi – og athugasemdir ykkar.</p>`;
    const when2 = d => { const x = new Date(d); return tr(() => fmtDate(d), String(d).slice(0, 10)) + (String(d).length > 10 && !/T12:00:00/.test(String(d)) ? " kl. " + String(x.getHours()).padStart(2, "0") + ":" + String(x.getMinutes()).padStart(2, "0") : ""); };
    const row = (x, i) => x.k === "cm"
      ? `<div class="vs3cmi${i >= 12 ? " more" : ""}"><div class="vs3cmh"><b>${E(tr(() => starfName(x.sk), x.sk || ""))}</b><span>${E(when2(x.d))}</span>${ED() ? `<button type="button" class="vs3x" data-act="cmdel:${E(p.id)}:${E(x.id)}" aria-label="Eyða athugasemd">✕</button>` : ""}</div><div class="vs3cmt">${E(x.t)}</div></div>`
      : `<div class="vs3ev k-${x.k}${i >= 12 ? " more" : ""}"${x.open ? ` data-open="${E(x.open)}" role="button" tabindex="0"` : ""}><span class="vs3evi" aria-hidden="true">${EIC[x.k] || "•"}</span><span class="vs3evt">${x.sk ? `<b>${E(who(x.sk))}</b> ` : ""}${E(x.t)}</span><span class="vs3evd">${E(when2(x.d))}</span></div>`;
    return `<div class="vs3feed">${ev.slice(0, 60).map(row).join("")}</div>${ev.length > 12 ? `<a href="#" class="vs3a vs3fmore">Sýna eldra (${Math.min(ev.length, 60) - 12})</a>` : ""}`;
  }

  /* ---------- Spjaldið sett saman ---------- */
  let afkOpen = false;   // sundurliðun afkomu opin/lokuð – helst þegar spjaldið teiknast aftur
  document.addEventListener("click", e => { const t = e.target.closest?.("[data-vs3afk]"); if (!t) return; e.preventDefault(); e.stopPropagation(); afkOpen = !afkOpen;
    t.setAttribute("aria-expanded", afkOpen); document.querySelectorAll(".vs3afkbox").forEach(b => b.classList.toggle("open", afkOpen)); }, true);
  window.u2VerkS3 = function (el, p) {
    const body = el.querySelector(".dbody"); if (!body || body.querySelector(".vs3")) return;
    const api = window.salaAPI, sts = stillOf().filter(x => !x.falin || x.n === p.stada), idx = sts.findIndex(x => x.n === p.stada);
    const tbs = api ? tr(() => api.TB().filter(T => T.verkefniId === p.id && !T.pontun), []) : [], pns = api ? tr(() => api.PN().filter(P => P.verkefniId === p.id), []) : [];
    const live = tr(() => liveProjH(p.id), 0), hours = (+p.timar || 0) + live, ih = tr(() => innheimtaOf(p), "timar");
    const unb = FIN() && window.rkUnbilledKr ? tr(() => rkUnbilledKr(p.id), 0) : 0;
    const tbAct = (tr(() => tbProjTab(p), "").match(/data-act="(tbnew:[^"]+)"/) || [])[1] || "";
    const ctx = { sts, idx, tbs, unb, hours, ih, tbAct };
    // Hlutar gamla yfirlitsins, flokkaðir eftir fyrirsögn (.viewtitle)
    const groups = {}, pre = []; let cur = null;
    [...body.children].forEach(n => { if (n.classList.contains("viewtitle")) { const k = n.textContent.replace(/\s+/g, " ").trim(); cur = /^Starfsfólk/.test(k) ? "staff" : /^Póstþræðir|^Eldri tengingar|^Póstar/.test(k) ? "post" : /^Athugasemdir/.test(k) ? "cm" : /^Framundan/.test(k) ? "soon" : /^Lýsing/.test(k) ? "lys" : /^Staðan/.test(k) ? "stada" : "other:" + k; }
      if (!cur) pre.push(n); else (groups[cur] = groups[cur] || []).push(n); });
    const klb = pre.filter(n => n.classList.contains("klukka")), uvy = pre.find(n => n.classList.contains("uvy")), vpw = [...body.querySelectorAll(".vpwrap")];
    uvy?.querySelector(":scope > .ukps")?.remove();
    if (uvy && !(p.undirverk || []).length) { const h2 = [...uvy.querySelectorAll(":scope > .ush2")].find(x => /^Undirverk/.test(x.textContent.trim())); if (h2) { const nx = h2.nextElementSibling; if (nx && !nx.classList.contains("uvcs")) nx.remove(); h2.remove(); } }   // tómt – Undirverk-spjaldið segir það
    const staffNodes = (groups.staff || []).filter(n => !n.classList.contains("viewtitle") && !n.classList.contains("budget"));
    const budget = (groups.staff || []).find(n => n.classList.contains("budget"));
    // Stöðustika
    const skip = (x, i) => i < idx && /tilbo|samþykk/i.test(x.n) && !tbs.length && !pns.length && !(+p.tilbod);   // skref sem var hlaupið yfir (byrjað án tilboðs)
    const steps = ED() && sts.length > 1 ? `<ol class="vs3st" aria-label="Staða verkefnis" style="--n:${sts.length}">${sts.map((x, i) => `<li><button type="button" data-act="status:verk:${E(p.id)}:${E(x.n)}"${i === idx ? ' aria-current="step"' : ""} class="${skip(x, i) ? "sk" : i < idx ? "dn" : i === idx ? "on" : ""}"${skip(x, i) ? ' title="Hlaupið yfir – ekkert tilboð"' : ""}>${skip(x, i) ? "" : i < idx ? IC.check : i === idx ? '<i aria-hidden="true"></i>' : ""}${E(x.n)}</button></li>`).join("")}</ol>` : "";
    // Starfsfólk og skil
    const skil = p.skiladagur ? `Skil ${E(tr(() => fmtDate(p.skiladagur), p.skiladagur))}` : `Engin skil skráð${ED() ? ` · <a href="#" data-act="edit:verk:${E(p.id)}">Setja skiladag</a>` : ""}`;
    const staffC = `<section class="vs3c vs3sf"><div class="vs3h">${hd("Starfsfólk", ED() ? `<a href="#" class="vs3a" data-act="pstaff:${E(p.id)}">+ Bæta við</a>` : "")}</div><div class="vs3sfb"></div><div class="vs3m">${skil}</div></section>`;
    // Lykilspjöld
    const aklst = +p.aklst || 0, pc = aklst ? Math.round(hours / aklst * 100) : 0, ou = (p.undirverk || []).filter(u => u.stada !== "Done");
    const af = FIN() && window.vpAfkoma ? tr(() => vpAfkoma(p), null) : null;
    const tile = (ic, lab, val, side, act, extra) => `<button type="button" class="vs3t" ${act}><span class="vs3ti">${ic}</span><span class="vs3tx"><small>${E(lab)}</small><b>${val}</b>${extra || ""}</span><span class="vs3ts">${side}</span></button>`;
    const tiles = `<div class="vs3tiles">`
      + tile(IC.clock, "Tímar", `${H1(hours)} klst.${live ? ' <span class="vs3live">● í gangi</span>' : ""}`, aklst ? `${pc} % af ${H1(aklst)} klst.` : ED() ? '<span class="vs3a">+ Setja áætlun</span>' : "Engin áætlun", 'data-act="dtab:timar" title="Sjá tímafærslur verkefnisins"', aklst ? `<span class="vs3bar${pc > 100 ? " over" : pc >= 80 ? " near" : ""}"><i style="width:${Math.min(100, pc)}%"></i></span>` : "")
      + (tr(() => ON("undirverk"), true) ? tile(IC.list, "Undirverk", `${ou.length}${(p.undirverk || []).length > ou.length ? ` <span class="vs3sm">af ${(p.undirverk || []).length}</span>` : ""}`, ED() ? '<span class="vs3a">+ Undirverk</span>' : "", 'data-act="dtab:undir"') : "")
      + (af ? tile(IC.bars, "Framlegð", E(KR(af.fr)), (af.pct == null ? "" : Math.round(af.pct * 100) + " % · ") + '<span class="vs3a vs3afkb">Sundurliðun</span>', `data-vs3afk="1" aria-expanded="${afkOpen}" title="Sýna eða fela sundurliðun afkomu"`)
        : FIN() && ih === "timar" ? tile(IC.bars, "Óreikningsfært", E(KR(unb)), unb ? '<span class="vs3a">Búa til reikning</span>' : "Ekkert óreikningsfært", unb ? `data-act="rknew:${E(p.id)}"` : 'data-act="tab:trk"') : "")
      + `</div>`;
    // Tilboð og pantanir
    const trow = (T, isP) => `<button type="button" class="vs3r" data-open="tb:${E(T.id)}"><span class="vs3rt"><b>${E((T.nr || "") + " " + (T.heiti || (isP ? "Pöntun" : "Tilboð")))}</b><small>${E(isP ? "Pöntun" + (T.fra ? " · " + tr(() => fmtDate(T.fra), "") : "") : (T.dags ? tr(() => fmtDate(T.dags), "") : ""))}</small></span>${FIN() ? `<span class="vs3rv">${E(KR(tr(() => api.netOf(T), 0) || 0))}</span>` : ""}${tbStPill(T)}</button>`;
    const tpList = [...tbs.slice(0, 4).map(T => trow(T, false)), ...pns.slice(0, 3).map(P => trow(P, true))].join("");
    const pnAct = tr(() => pnProjTab(p), "").match(/data-act="(vpnny:[^"]+)"/)?.[1];
    const tpBtns = ED() ? [tbAct && `<button type="button" class="vs3b g" data-act="${E(tbAct)}">+ Tilboð</button>`, pnAct && `<button type="button" class="vs3b g" data-act="${E(pnAct)}">+ Pöntun</button>`, FIN() && tr(() => ON("reikningar"), false) && `<button type="button" class="vs3b g" data-act="rknew:${E(p.id)}">+ Reikningur</button>`].filter(Boolean).join("") : "";
    const nRk = (S?.reikningar || []).filter(R => R.stada !== "Ógilt" && (R.verkefniIds || [R.verkefniId]).includes(p.id));
    const tpC = (tbAct || pnAct || tbs.length || pns.length || FIN()) ? card("vs3tp", hd(pnAct || pns.length ? "Tilboð og pantanir" : "Tilboð", tbs.length + pns.length ? `<a href="#" class="vs3a" data-act="dtab:${tbs.length || !pns.length ? "tilbod" : "pantanir"}">Sjá öll →</a>` : ""),
      (tpList ? `<div class="vs3rs">${tpList}</div>` : `<div class="vs3e"><b>${ih === "timar" ? "Ekkert tilboð" : "Ekkert tilboð enn"}</b><small>${ih === "timar" ? "Verkið er unnið í tímavinnu" : "Tilboð verður grunnur verksins"}</small></div>`)
      + (tpBtns ? `<div class="vs3bs sm">${tpBtns}</div>` : "")
      + (FIN() ? `<div class="vs3ft"><span>Reikningar</span><span>${nRk.length ? nRk.length + (nRk.length === 1 ? " reikningur" : " reikningar") + " · " + E(KR(nRk.reduce((a, R) => a + (+R.net || 0), 0))) : "Enginn enn"}${unb ? " · " + E(KR(unb)) + " óreikn." : ""}</span></div>` : "")) : "";
    // Skrár
    const fr = window.msRecent ? tr(() => msRecent(p), { st: "none" }) : { st: "none" };
    let fBody;
    const fold = (fr.folders || []).length ? `<div class="vs3fo">${fr.folders.map(d => `<a class="vs3fd${d.n ? "" : " tom"}" ${d.link}${fr.up ? ` data-updir="${E(d.name)}"` : ""} title="${E(d.name)}${d.n ? " · " + d.n + " atriði" : " · tóm mappa"}${fr.up ? " – dragðu skrár hingað" : ""}">${IC.folder}<span>${E(d.name)}</span>${d.n ? `<small>${d.n}</small>` : ""}</a>`).join("")}</div>` : "";
    if (fr.st === "ok") fBody = (fr.files.length ? `<div class="vs3fs">${fr.files.slice(0, 5).map(f => `<button type="button" class="vs3f" data-act="msprev:${E(f.id)}" data-pfid="${E(f.id)}" draggable="true"><span class="vs3ft2">${E(typeOf(f.name))}</span><span class="vs3fn">${E(f.name)}</span><small>${E(when(f.lastModifiedDateTime))}</small></button>`).join("")}</div>` : `<div class="vs3e"><b>Engar skrár enn</b><small>${(fr.folders || []).length ? `${fr.folders.length} möppur eru tilbúnar – dragðu skrár á möppu til að vista þær þar` : "Dragðu skrár hingað eða veldu úr tölvunni"}</small></div>`)
      + fold
      + (fr.up ? `<div class="vs3dz"><input type="file" id="up-file" multiple hidden><span>Dragðu skrár hingað (í möppu verkefnisins) eða á möppu hér fyrir ofan</span><label for="up-file" class="vs3b g sm">${IC.up}Velja skrár</label><div class="uplist" id="up-list"></div></div>` : "");
    else if (fr.st === "load") fBody = `<div class="vs3e"><small>Sæki skrár…</small></div>`;
    else fBody = `<div class="vs3e"><b>${fr.st === "err" ? "Gat ekki sótt skrárnar" : "Skrár verkefnisins"}</b><small>${fr.st === "err" ? E(fr.err || "") : "Opnaðu Skrár til að sjá möppu verkefnisins"}</small></div>`;
    const fC = tr(() => ON("skjol") || ON("onedrive"), false) ? card("vs3fl" + (fr.st === "ok" && fr.up ? '" data-upk="' + E(fr.k) : ""), hd("Skrár", `${fr.link ? `<a class="vs3a" ${fr.link}>Opna möppu ↗</a>` : ""}<a href="#" class="vs3a" data-act="dtab:skrar">Allar →</a>`), (fr.where ? `<div class="vs3m vs3wh">${E(fr.where)}</div>` : "") + fBody) : "";
    // Athugasemdir og póstur
    const cmC = `<section class="vs3c vs3cm"><div class="vs3h">${hd("Athugasemdir og saga")}</div><div class="vs3cmb"></div></section>`;
    // Á verkinu (annað af gamla yfirlitinu)
    const moreC = `<div class="vs3afkbox${afkOpen ? " open" : ""}"><div class="vs3afkin"><div class="ukps vs3anch" hidden></div></div></div><section class="vs3more"></section>`;
    const wrap = document.createElement("div"); wrap.className = "vs3";
    wrap.innerHTML = steps + `<div class="vs3r1">${next(p, ctx)}${staffC}</div>` + tiles + moreC + `<div class="vs3r3">${tpC}${fC}${cmC}</div>`;
    // Færa hluta inn
    const sfb = wrap.querySelector(".vs3sfb"); staffNodes.forEach(n => sfb.append(n));
    const more = wrap.querySelector(".vs3more");
    const addG = (k, title) => { const g = groups[k]; if (!g) return; const s = document.createElement("div"); s.className = "vs3g"; g.forEach(n => s.append(n)); const t = s.querySelector(".viewtitle"); if (t && title) t.textContent = title; more.append(s); };
    if (uvy) more.append(uvy);
    if (budget && aklst && pc >= 80) more.prepend(budget);
    { const ab = wrap.querySelector(".vs3afkin"); vpw.forEach(n => ab.append(n)); }   // Afkoma (verkplus.js setur hana á eftir .ukps – hér rétt undir spjöldunum)
    addG("soon"); if (p.yfirlit) addG("stada", "Staðan"); addG("lys");
    Object.keys(groups).filter(k => k.startsWith("other:")).forEach(k => addG(k));
    // 2.145.2: Athugasemdir og saga – athugasemdir notenda og það sem appið skráir sjálft (tímar, staða, tilboð, reikningar, fundir), nýjast efst
    const cmb = wrap.querySelector(".vs3cmb");
    const cmbox = (groups.cm || []).find(n => n.classList?.contains("cmbox"));
    if (cmbox) { const ta = cmbox.querySelector("#cm-new"); if (ta) { ta.rows = 1; ta.placeholder = "Skrifa athugasemd…"; } const b = cmbox.querySelector('[data-act^="cmadd:"]'); if (b) b.textContent = "Senda"; cmb.append(cmbox); }
    cmb.insertAdjacentHTML("beforeend", feedHTML(p));
    (groups.post || []).forEach(n => cmb.append(n));
    cmb.querySelector(".vs3fmore")?.addEventListener("click", e => { e.preventDefault(); cmb.querySelector(".vs3feed")?.classList.add("all"); e.currentTarget.remove(); });
    // Gömlu hnapparnir (+ Tími, + Undirverk, + Fundur) og fyrsti hluti (staða, klukka) víkja; klukkuborðinn helst efst
    pre.forEach(n => { if (n !== uvy && !n.classList.contains("klukka") && !n.classList.contains("vpwrap")) n.remove(); });
    Object.values(groups).flat().forEach(n => { if (n.isConnected && !wrap.contains(n)) n.remove(); });
    body.append(wrap); klb.forEach(n => body.prepend(n));
    if (!more.children.length || [...more.children].every(c => c.hidden)) more.classList.add("tom");
    if (steps) el.querySelector(".udh2 .ustsel")?.classList.add("vs3hide");
  };

  /* ---------- Aðrir flipar verkefnis: línur í spjaldi, tómt sem snyrtilegt spjald ---------- */
  window.u2VerkTab = function (el) {
    const body = el.querySelector(".dbody"); if (!body || body.classList.contains("vs3tab")) return; body.classList.add("vs3tab");
    let grp = null;
    [...body.children].forEach(n => {
      if (n.matches(".usrow, .utl, a.utl, .lrow")) { if (!grp) { grp = document.createElement("section"); grp.className = "vs3lc"; n.before(grp); } grp.append(n); }
      else grp = null;
    });
    body.querySelectorAll(":scope > .empty").forEach(e => e.classList.add("vs3emp"));
  };

  /* ---------- Byrja án tilboðs ---------- */
  Object.assign(window.ACT_EXT = window.ACT_EXT || {}, {
    vs3start: (k, r) => {
      const p = findProj(r[0]); if (!p) return; const sts = stillOf().filter(x => !x.falin), to = sts[workIdx(sts)]?.n; if (!to) return;
      const setIh = !p.innheimta;   // aðeins ef innheimta verkefnisins hefur ekki verið valin sérstaklega
      atrJa(`Hefja verkið án tilboðs?\nStaðan verður „${to}“${setIh ? " og verkið verður reikningsfært eftir skráðum tímum (Tímavinna)" : ""}. Þú getur búið til tilboð síðar.`, { ja: "Hefja verkið" }).then(ok => {
        if (!ok) return;
        saveSnapshot(s => { const q = (s.verkefni || []).find(v => v.id === p.id); if (!q) return; q.stada = to; if (setIh) q.innheimta = "timar";
          (q.saga = q.saga || []).push({ d: new Date().toISOString(), sk: tr(() => ME(), ""), k: "st", t: `hóf verkið án tilboðs – staðan varð „${to}“${setIh ? ", innheimta Tímavinna" : ""}` }); })
          .then(() => toast(`Verkið hafið án tilboðs${setIh ? " · tímavinna" : ""}`));
      });
    }
  });
})();

/* 2.147.1: Tilboðs- og pöntunarspjald í sama útliti og verkefnisyfirlitið – efnið raðast í spjöld:
   Upplýsingar (svið, verkefni, starfsfólk, undirflokkur) · Staða (staða + samþykktartengill) · Línur (línur + samtölur) · aðgerðir neðst. */
window.u2TbCard = function (el) {
  if (!el || el.dataset.u2tb) return; el.dataset.u2tb = "1"; el.classList.add("u2tbp");
  const wrap = (cls, title, nodes) => { nodes = nodes.filter(Boolean); if (!nodes.length) return null;
    const c = document.createElement("section"); c.className = "card u2tbc " + cls;
    if (title) c.insertAdjacentHTML("afterbegin", `<h3 class="u2tbh">${title}</h3>`);
    nodes[0].before(c); nodes.forEach(n => c.append(n)); return c; };
  const kps = el.querySelector(":scope > .ukps");
  // Upplýsingar: allt milli lykiltalna og stöðu sem er ekki spjald (svið, starfsfólk, undirflokkur)
  const info = []; let n = kps ? kps.nextElementSibling : null;
  while (n && !n.matches(".smst,.smpub,.utb,.utbt,.links,.card,.hint,.tbpost")) { info.push(n); n = n.nextElementSibling; }
  const head = el.querySelector(":scope > .udh2"), svid = head?.nextElementSibling && !head.nextElementSibling.matches(".ukps") ? head.nextElementSibling : null;
  if (svid && !info.includes(svid)) info.unshift(svid);
  wrap("u2tbinfo", "Upplýsingar", info);
  wrap("u2tbst", "Staða", [el.querySelector(":scope > .smst"), el.querySelector(":scope > .links.smpub")]);
  const lin = wrap("u2tblin", "Línur", [el.querySelector(":scope > .utb"), el.querySelector(":scope > .utbt")]);
  // Aðgerðir neðst og textinn um gildistíma undir þeim
  const acts = [...el.querySelectorAll(":scope > .links")].filter(x => !x.classList.contains("smpub"));
  acts.forEach(a => a.classList.add("u2tbacts"));
  if (kps && kps.nextElementSibling !== el.querySelector(".u2tbinfo") && el.querySelector(".u2tbinfo")) kps.after(el.querySelector(".u2tbinfo"));
};
