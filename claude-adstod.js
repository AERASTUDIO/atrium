/* claude-adstod.js (2.164.0) – Claude-aðstoð: spurningar og skráningar í mæltu máli.
   - Hnappur við hlið bjöllunnar (tölva) og í haus símans; samtalið opnast í spjaldi frá hægri (atrDrawer), á heilum skjá í síma.
   - Appið sendir samtalið á Cloud Function „claude“ (functions/claude.js) sem ræður líkani, fyrirmælum og verkfærum og skráir notkun.
   - Verkfærin keyra HÉR á gögnum sem notandinn hefur þegar (S – Firestore-reglurnar ráða), svo Claude sér aldrei meira en notandinn.
   - skra_tima vistar ekkert: tillaga birtist sem spjald með „Staðfesta“ (vistar eins og Skrá tíma) og „Breyta“ (opnar formið útfyllt).
   - Samtalið er aðeins í minni (ekki í Firestore). Eining: claude (kjarni.js), sjálfgefið óvirk; aðeins þar sem ORG.claude = true. */
(function () {
  const E = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const on = () => { try { return !!window.ORG?.claude && typeof ON === "function" && ON("claude") && !!window.USER; } catch (e) { return false; } };
  const st = () => { try { return typeof S !== "undefined" ? S : null; } catch (e) { return null; } };
  const p2 = n => String(n).padStart(2, "0"), iso = x => x.getFullYear() + "-" + p2(x.getMonth() + 1) + "-" + p2(x.getDate());
  const DN = ["sunnudagur", "mánudagur", "þriðjudagur", "miðvikudagur", "fimmtudagur", "föstudagur", "laugardagur"];
  const N1 = n => String(Math.round((+n || 0) * 100) / 100).replace(".", ",");
  const KRf = n => Math.round(+n || 0).toLocaleString("de-DE") + " kr.";
  const IC = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z"/><path d="M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"/></svg>';
  const C = window.__CL = window.__CL || { msgs: [], ui: [], busy: false, props: {} };

  /* ---------- Verkfæri (keyra í appinu) ---------- */
  const tr = (f, d) => { try { return f(); } catch (e) { return d; } };
  const VK = () => tr(() => verkefni(), []), F = () => tr(() => faerslur(), []);
  const pName = p => [p.nr, p.stutt || p.nafn].filter(Boolean).join(" ");
  const findP = q => { q = String(q || "").trim(); const L = VK(); return L.find(p => p.id === q) || L.find(p => String(p.nr) === q) || L.find(p => (pName(p) + " " + (p.nafn || "")).toLowerCase().includes(q.toLowerCase())); };
  const done = p => /lokið|done|klárað|afhent|lokað/i.test(p.stada || "");
  const range = (a, b) => { const f = String(a || "0000"), t = String(b || "9999"); return x => { const d = String(x || "").slice(0, 10); return d >= f && d <= t; }; };
  const TOOLS = {
    leita_verkefni({ leit, stada }) {
      const q = String(leit || "").toLowerCase(), s = String(stada || "").toLowerCase();
      const L = VK().filter(p => !q || [p.nr, p.stutt, p.nafn, p.vidskiptavinur, p.verkkaupi].join(" ").toLowerCase().includes(q))
        .filter(p => !s || (s === "virk" ? !done(p) : s.startsWith("lok") ? done(p) : String(p.stada || "").toLowerCase().includes(s)));
      return { fjoldi: L.length, verkefni: L.slice(0, 40).map(p => ({ id: p.id, nr: p.nr, heiti: p.stutt || p.nafn, stada: p.stada, vidskiptavinur: p.vidskiptavinur || null, skiladagur: p.skiladagur || null, timar_skradir: +p.timar || 0, aaetlun_klst: +p.aklst || null })) };
    },
    verkefni({ id }) {
      const p = findP(id); if (!p) return { villa: "Fann ekki verkefnið " + id };
      const T = F().filter(e => e.verkefniId === p.id), per = {}, ob = T.filter(e => !e.reikningur && !e.live);
      T.forEach(e => { const k = tr(() => starfName(e.starfsmadur), e.starfsmadur) || "?"; per[k] = (per[k] || 0) + (+e.timar || 0); });
      const K = (st()?.kostnadur || []).filter(k => k.verkefniId === p.id && !k.reikningur);
      return { id: p.id, nr: p.nr, heiti: p.stutt || p.nafn, fullt_heiti: p.nafn, stada: p.stada, vidskiptavinur: p.vidskiptavinur, verkkaupi: p.verkkaupi, skiladagur: p.skiladagur, tilbod_kr: p.tilbod || null,
        aaetlun_klst: +p.aklst || null, timar_skradir: Math.round(T.reduce((a, e) => a + (+e.timar || 0), 0) * 100) / 100, timar_eftir_starfsmanni: per,
        oreikningsfaert: { klst: Math.round(ob.reduce((a, e) => a + (+e.timar || 0), 0) * 100) / 100, faerslur: ob.length, kostnadur_kr: K.reduce((a, k) => a + (+k.upphaed || +k.kr || 0), 0) },
        lysing: p.lysing || null, naesta_skref: p.naest || null, athuga: p.athuga || null,
        undirverk: (p.undirverk || []).map(u => ({ id: u.id, nr: u.nr, heiti: u.heiti || u.nafn, stada: u.stada, timar: +u.timar || 0, skil: u.skil || u.dags || null })),
        athugasemdir: (p.athugasemdir || []).slice(-5).map(a => ({ texti: a.t, dags: a.d, af: a.sk })) };
    },
    timar({ fra, til, verkefni: v, starfsmadur, oreikningsfaert }) {
      const p = v ? findP(v) : null; if (v && !p) return { villa: "Fann ekki verkefnið " + v };
      const inR = range(fra, til), L = F().filter(e => !e.live && inR(e.date) && (!p || e.verkefniId === p.id) && (!starfsmadur || String(e.starfsmadur).toLowerCase() === String(starfsmadur).toLowerCase()) && (!oreikningsfaert || !e.reikningur));
      const byP = {}, byS = {}; L.forEach(e => { const pp = VK().find(x => x.id === e.verkefniId), k = pp ? pName(pp) : "Án verkefnis"; byP[k] = (byP[k] || 0) + (+e.timar || 0); const s = tr(() => starfName(e.starfsmadur), e.starfsmadur); byS[s] = (byS[s] || 0) + (+e.timar || 0); });
      return { samtals_klst: Math.round(L.reduce((a, e) => a + (+e.timar || 0), 0) * 100) / 100, fjoldi: L.length, eftir_verkefni: byP, eftir_starfsmanni: byS,
        faerslur: L.slice(0, 60).map(e => ({ dags: e.date, fra: e.fra, til: e.til, klst: +e.timar || 0, verkefni: e.nr || null, lysing: String(e.lysing || "").replace(/^\d\d\.\d\d – /, "").replace(/ \([\d,.]+ klst\.\)$/, ""), starfsmadur: e.starfsmadur, reikningsfaert: !!e.reikningur })) };
    },
    reikningar({ stada, fra, til }) {
      if (!tr(() => can("fjarmal"), false)) return { villa: "Aðeins fjármál (admin og bókari) sjá reikninga." };
      const inR = range(fra, til), s = String(stada || "").toLowerCase();
      const L = (st()?.reikningar || []).filter(r => inR(r.dags) && (!s || String(r.stada || "").toLowerCase().includes(s)));
      const sum = k => L.reduce((a, r) => a + (+r[k] || 0), 0);
      return { fjoldi: L.length, samtals_an_vsk: sum("net"), samtals_vsk: sum("vsk"), samtals_med_vsk: sum("tot"),
        reikningar: L.slice(0, 60).map(r => ({ id: r.id, nr: r.bokhaldNr || r.nr, vidskiptavinur: r.vidskiptavinur || r.kaupandi?.name, dags: r.dags, gjalddagi: r.gjalddagi || null, stada: r.stada, an_vsk: +r.net || 0, vsk: +r.vsk || 0, med_vsk: +r.tot || 0, greitt: typeof r.greitt === "string" ? r.greitt : r.greitt?.dags || null, verkefni: r.verkefniNr || r.nr_verk || null })) };
    },
    tilbod({ stada, leit }) {
      const q = String(leit || "").toLowerCase(), s = String(stada || "").toLowerCase();
      const L = (st()?.tilbod || []).filter(t => (!q || [t.nr, t.heiti, t.vidskiptavinur].join(" ").toLowerCase().includes(q)) && (!s || String(t.stada || "").toLowerCase().includes(s)));
      return { fjoldi: L.length, tilbod: L.slice(0, 40).map(t => ({ id: t.id, nr: t.nr, heiti: t.heiti, vidskiptavinur: t.vidskiptavinur, stada: t.stada, upphaed_med_vsk: +t.tot || +t.samtals || null, dags: t.dags || t.stofnad || null, gildir_til: t.gildir || t.gildirTil || null })) };
    },
    dagskra({ fra, til }) {
      const a = new Date(fra), b = new Date(til); if (isNaN(a) || isNaN(b)) return { villa: "Ógild dagsetning" };
      const out = [], m = tr(() => calItems(), new Map()), P = tr(() => window.salaAPI?.PN?.() || [], []);
      for (let d = new Date(a), i = 0; d <= b && i < 62; d.setDate(d.getDate() + 1), i++) {
        const k = iso(d), it = (m.get(k) || []).filter(x => !x.span).map(x => ({ tegund: x.kind || "", heiti: x.title || "", verkefni: x.nr || "", kl: (String(x.when || "").match(/(\d\d:\d\d)/) || [])[1] || null }));
        P.forEach(p => { if (String(p.fra || "").slice(0, 10) === k) it.push({ tegund: "Afhending pöntunar", heiti: [p.nr, p.heiti].filter(Boolean).join(" "), kl: (String(p.fra).match(/T(\d\d:\d\d)/) || [])[1] || null }); if (String(p.til || "").slice(0, 10) === k) it.push({ tegund: "Skil pöntunar", heiti: [p.nr, p.heiti].filter(Boolean).join(" ") }); });
        if (it.length) out.push({ dags: k, vikudagur: DN[d.getDay()], atridi: it });
      }
      return { dagar: out };
    },
    vidskiptavinir({ leit }) {
      const q = String(leit || "").toLowerCase();
      const L = (st()?.vidskiptavinir || []).filter(v => !q || [v.name, v.kennitala, v.netfang, v.simi].join(" ").toLowerCase().includes(q));
      return { fjoldi: L.length, vidskiptavinir: L.slice(0, 30).map(v => ({ id: v.id, nafn: v.name, kennitala: v.kennitala || null, netfang: v.netfang || null, simi: v.simi || null, verkefni: VK().filter(p => p.vskId === v.id || p.vidskiptavinur === v.name).map(pName).slice(0, 10) })) };
    },
    skra_tima(a) {
      const p = findP(a.verkefni); if (!p) return { villa: "Fann ekki verkefnið " + a.verkefni + " – notaðu leita_verkefni fyrst." };
      if (!/^\d{4}-\d\d-\d\d$/.test(a.dags || "") || !/^\d\d?:\d\d$/.test(a.fra || "") || !/^\d\d?:\d\d$/.test(a.til || "")) return { villa: "Vantar dags (ÁÁÁÁ-MM-DD) og fra/til (hh:mm)." };
      const u = (p.undirverk || []).find(x => x.id === a.undirverk || String(x.nr) === String(a.undirverk));
      const id = "pr" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fr = a.fra.padStart(5, "0"), to = a.til.padStart(5, "0");
      C.props[id] = { id, pid: p.id, sid: u?.id || null, pnafn: pName(p), unafn: u ? (u.heiti || u.nafn) : "", dags: a.dags, fra: fr, til: to, lysing: String(a.lysing || "").trim(), klst: tr(() => hoursBetween(fr, to), 0), stada: "bidur" };
      C.ui.push({ prop: id });
      return { tillaga: "Birt notandanum til staðfestingar – ekkert vistað enn.", verkefni: pName(p), dags: a.dags, fra: fr, til: to, klst: C.props[id].klst };
    },
    opna({ tegund, id }) {
      const k = { verkefni: "verk:", tilbod: "tb:", reikningur: "reikn:", vidskiptavinur: "vsk:" }[tegund]; let x = id;
      if (tegund === "verkefni") { const p = findP(id); if (!p) return { villa: "Fann ekki verkefnið" }; x = p.id; }
      if (!k) return { villa: "Óþekkt tegund" };
      setTimeout(() => { tr(() => { if (innerWidth < 1024) atrDrawerClose(); openDetail(k + x); }); }, 50);
      return { opnad: true };
    }
  };

  /* ---------- Samskipti við fallið ---------- */
  const URL_ = () => `https://europe-west1-${window.ORG?.firebase?.projectId}.cloudfunctions.net/claude`;
  const skjar = () => tr(() => {
    const d = String(DETAIL || ""); if (d.startsWith("verk:")) { const p = VK().find(x => x.id === d.slice(5)); return p ? `verkefnið ${pName(p)} (id ${p.id})` : ""; }
    if (d) return d; return "flipinn " + (typeof tab !== "undefined" ? tab : "");
  }, "");
  async function post(messages) {
    if (window.AERA_DEMO) return demoSvar(messages);
    const tok = await window.__DB?.idToken?.(); if (!tok) throw new Error("Ekki innskráð(ur)");
    const n = new Date(), r = await fetch(URL_(), { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
      body: JSON.stringify({ messages, samhengi: { dags: iso(n), vikudagur: DN[n.getDay()], skjar: skjar(), org: window.ORG?.nafn || "" } }) });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(j?.villa || (r.status === 404 ? "Claude-aðstoð er ekki uppsett í þessari uppsetningu." : "Villa " + r.status));
    return j;
  }
  // Sýniútgáfan er ekki tengd Claude – stutt skýring í stað svars
  function demoSvar(messages) {
    const last = messages[messages.length - 1]; const txt = typeof last.content === "string" ? last.content : "";
    if (/tím|skrá/i.test(txt) && messages.length === 1) { const p = VK()[0]; return Promise.resolve({ content: [{ type: "text", text: "Í sýniútgáfunni er Claude ekki tengdur, en svona lítur tillaga að skráningu út:" }, { type: "tool_use", id: "demo1", name: "skra_tima", input: { verkefni: p?.id, dags: iso(new Date()), fra: "09:00", til: "11:30", lysing: "Teiknivinna" } }], stop_reason: "tool_use" }); }
    if (messages.length > 1) return Promise.resolve({ content: [{ type: "text", text: "Ég lagði til **2,5 klst.** á " + (VK()[0] ? pName(VK()[0]) : "verkefnið") + " í dag. Staðfestu hér fyrir ofan eða breyttu." }], stop_reason: "end_turn" });
    return Promise.resolve({ content: [{ type: "text", text: "Í sýniútgáfunni er Claude-aðstoð ekki tengd. Í raunverulegu appi svarar Claude spurningum um verkefni, tíma, reikninga, tilboð og dagskrá – og leggur til tímaskráningar sem þú staðfestir." }], stop_reason: "end_turn" });
  }

  async function run() {
    C.busy = true; draw(); const n0 = C.msgs.length;
    try {
      for (let i = 0; i < 8; i++) {
        const j = await post(C.msgs);
        C.msgs.push({ role: "assistant", content: j.content });
        j.content.filter(b => b.type === "text" && b.text.trim()).forEach(b => C.ui.push({ a: b.text }));
        if (j.notkun) C.notkun = j.notkun;
        if (j.stop_reason !== "tool_use") break;
        const res = j.content.filter(b => b.type === "tool_use").map(b => {
          let out; try { out = TOOLS[b.name] ? TOOLS[b.name](b.input || {}) : { villa: "Óþekkt verkfæri" }; } catch (e) { out = { villa: String(e.message || e) }; }
          let s = JSON.stringify(out); if (s.length > 50000) s = s.slice(0, 50000) + "…(stytt)";
          return { type: "tool_result", tool_use_id: b.id, content: s };
        });
        C.msgs.push({ role: "user", content: res }); draw();
      }
    } catch (e) { C.ui.push({ err: String(e.message || e) }); C.msgs.length = n0; /* spurningin stendur eftir svo hægt sé að reyna aftur */ }
    C.busy = false; draw();
  }
  function spyrja(t) {
    t = String(t || "").trim(); if (!t || C.busy) return;
    // samtal verður að enda á svari Claude áður en ný spurning bætist við
    while (C.msgs.length && C.msgs[C.msgs.length - 1].role === "user") C.msgs.pop();
    C.msgs.push({ role: "user", content: t }); C.ui.push({ u: t }); run();
  }

  /* ---------- Staðfesta / breyta tillögu ---------- */
  async function stadfesta(id) {
    const P = C.props[id]; if (!P || P.stada !== "bidur") return;
    try {
      const sk = ME(), ov = tr(() => overlaps(P.dags, P.fra, P.til, sk, null), null);
      if (ov) { P.villa = `Skarast við „${tr(() => cleanLys(ov.lysing), ov.lysing)}“ kl. ${ov.fra}–${ov.til}. Breyttu tímanum.`; draw(); return; }
      const t = hoursBetween(P.fra, P.til), lys = `${P.dags.slice(8, 10)}.${P.dags.slice(5, 7)} – ${P.lysing} (${N1(t)} klst.)`, nid = newId();
      P.stada = "vistar"; draw();
      await saveSnapshot(s => { const p = sFindP(s, P.pid), u = P.sid ? sFindU(s, P.sid)[1] : null; if (p) p.timar = (p.timar || 0) + t; if (u) u.timar = (u.timar || 0) + t;
        s.timar = s.timar || {}; s.timar.samtals = (s.timar.samtals || 0) + t; if (!s.timar.timabil || timabilOf(P.dags) === s.timar.timabil) s.timar.timabilSamtals = (s.timar.timabilSamtals || 0) + t;
        const L = sTimes(s); L.unshift({ id: nid, date: P.dags, lysing: lys, nr: u?.nr || p?.nr, verkefniId: P.pid, undirverkId: P.sid || null, fra: P.fra, til: P.til, timar: t, starfsmadur: sk, timabil: timabilOf(P.dags), taxti: null, claude: true });
        L.sort((a, b) => String(b.date + (b.fra || "")).localeCompare(String(a.date + (a.fra || "")))); s.timar.nyjast = L.slice(0, 10); });
      P.stada = "vistad"; P.villa = ""; toast(`Skráð: ${N1(t)} klst.`);
    } catch (e) { P.stada = "bidur"; P.villa = tr(() => errText(e), String(e.message || e)); }
    draw();
  }
  function breyta(id) {
    const P = C.props[id]; if (!P) return;
    tr(() => atrDrawerClose(true)); PREFILL = { pid: P.pid, sid: P.sid, desc: P.lysing, date: P.dags, fra: P.fra, til: P.til, timer: false }; kind = "tima"; openSheet();
    P.stada = "breytt"; }

  /* ---------- Teikning ---------- */
  function md(t) {
    const lines = E(t).split("\n"), out = []; let ul = false, tb = [];
    const inl = s => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>");
    const flushT = () => { if (!tb.length) return; const rows = tb.filter(r => !/^\s*\|?\s*:?-{2,}/.test(r)).map(r => r.replace(/^\s*\||\|\s*$/g, "").split("|").map(c => inl(c.trim())));
      out.push(`<div class="cltw"><table class="clt"><thead><tr>${rows[0].map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`); tb = []; };
    lines.forEach(l => {
      if (/^\s*\|.*\|\s*$/.test(l)) { if (ul) { out.push("</ul>"); ul = false; } tb.push(l); return; } flushT();
      const m = l.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
      if (m) { if (!ul) { out.push("<ul>"); ul = true; } out.push(`<li>${inl(m[1])}</li>`); return; }
      if (ul) { out.push("</ul>"); ul = false; }
      const h = l.match(/^#{1,4}\s+(.*)/); if (h) { out.push(`<p><b>${inl(h[1])}</b></p>`); return; }
      if (l.trim()) out.push(`<p>${inl(l)}</p>`);
    });
    flushT(); if (ul) out.push("</ul>"); return out.join("");
  }
  const propHTML = P => {
    const head = P.stada === "vistad" ? "Skráð" : P.stada === "breytt" ? "Opnað í formi" : "Tillaga að tímaskráningu";
    return `<div class="clp ${P.stada}" data-pid="${E(P.id)}"><small>${E(head)}</small><b>${E(P.pnafn)}${P.unafn ? ` <span>· ${E(P.unafn)}</span>` : ""}</b>
      <div class="clpr"><span>${E(P.dags.slice(8, 10) + "." + P.dags.slice(5, 7) + "." + P.dags.slice(0, 4))} · ${E(P.fra)}–${E(P.til)}</span><b>${E(N1(P.klst))} klst.</b></div><p>${E(P.lysing)}</p>
      ${P.villa ? `<div class="clperr">${E(P.villa)}</div>` : ""}
      ${P.stada === "bidur" || P.stada === "vistar" ? `<div class="clpb"><button type="button" class="btn" data-clb="${E(P.id)}">Breyta</button><button type="button" class="btn primary" data-cls="${E(P.id)}"${P.stada === "vistar" ? " disabled" : ""}>${P.stada === "vistar" ? "Vista…" : "Staðfesta"}</button></div>` : ""}</div>`;
  };
  const TIL = ["Hvað á ég eftir að reikningsfæra?", "Hvernig er vikan mín?", "Skráðu 2 tíma í dag á …", "Hvaða verkefni eru með skil í þessari viku?"];
  function bodyHTML() {
    const L = C.ui.map(x => x.u ? `<div class="clm u">${E(x.u)}</div>` : x.a ? `<div class="clm a">${md(x.a)}</div>` : x.err ? `<div class="clm e">${E(x.err)}<button type="button" class="smlnk" data-clretry>Reyna aftur</button></div>` : x.prop && C.props[x.prop] ? propHTML(C.props[x.prop]) : "").join("");
    const empty = `<div class="cle"><div class="clei">${IC}</div><b>Hvað get ég gert fyrir þig?</b><span>Spurðu um verkefni, tíma, reikninga, tilboð eða dagskrá – eða biddu mig að skrá tíma.</span><div class="clsug">${TIL.map(t => `<button type="button" data-clq="${E(t)}">${E(t)}</button>`).join("")}</div></div>`;
    return (L || empty) + (C.busy ? `<div class="clm a cldots"><i></i><i></i><i></i></div>` : "");
  }
  function draw() {
    const d = document.querySelector(".adrw.cldrw"); if (!d) return;
    const b = d.querySelector(".clbody"); if (b) { b.innerHTML = bodyHTML(); b.scrollTop = b.scrollHeight; }
    const s = d.querySelector(".clsend"); if (s) s.disabled = C.busy;
    const n = d.querySelector(".clnk"); if (n) n.textContent = C.notkun && tr(() => can("stillingar"), false) ? `${KRf(C.notkun.kr)} af ${KRf(C.notkun.thak)} í mánuðinum` : "";
  }
  window.claudeOpna = function (q) {
    if (!on()) return;
    const html = `<div class="adh"><h2><span class="clhi">${IC}</span>Claude-aðstoð</h2><span><button type="button" class="smlnk" data-clnew>Nýtt samtal</button><button type="button" class="adx" aria-label="Loka" data-adclose>✕</button></span></div>
      <div class="clbody" aria-live="polite"></div>
      <form class="clin"><textarea rows="1" placeholder="Spurðu Claude…" aria-label="Spurning til Claude"></textarea><button type="submit" class="clsend" aria-label="Senda"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg></button></form>
      <div class="clft"><span>Claude getur gert mistök – athugaðu tölur áður en þú notar þær.</span><span class="clnk"></span></div>`;
    const d = atrDrawer(html, "Claude-aðstoð"); d.classList.add("cldrw");
    const ta = d.querySelector("textarea"), fit = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; };
    ta.addEventListener("input", fit);
    ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); d.querySelector(".clin").requestSubmit(); } });
    d.querySelector(".clin").onsubmit = e => { e.preventDefault(); const t = ta.value; ta.value = ""; fit(); spyrja(t); };
    d.querySelector("[data-clnew]").onclick = () => { if (C.busy) return; C.msgs = []; C.ui = []; C.props = {}; draw(); ta.focus(); };
    d.addEventListener("click", e => {
      const q0 = e.target.closest("[data-clq]"); if (q0) { const t = q0.dataset.clq; if (t.endsWith("…")) { ta.value = t.slice(0, -1); ta.focus(); fit(); } else spyrja(t); return; }
      const s = e.target.closest("[data-cls]"); if (s) { stadfesta(s.dataset.cls); return; }
      const b = e.target.closest("[data-clb]"); if (b) { breyta(b.dataset.clb); return; }
      if (e.target.closest("[data-clretry]") && !C.busy) { C.ui = C.ui.filter(x => !x.err); if (C.msgs.length && C.msgs[C.msgs.length - 1].role === "user") run(); }
    });
    draw(); setTimeout(() => ta.focus(), 60);
    if (q) spyrja(q);
  };

  /* ---------- Stillingar › Claude-aðstoð (admin): þak, líkan og notkun ---------- */
  let NK = null, NKerr = "", NKt = 0;
  async function saekjaNotkun() {
    if (window.AERA_DEMO) { NK = { manudur: iso(new Date()).slice(0, 7), notkun: [{ manudur: iso(new Date()).slice(0, 7), kr: 412, n: 38, notendur: { "jona@demo·example": { nafn: "Jóna", kr: 412, n: 38 } } }] }; return; }
    try { const tok = await window.__DB?.idToken?.(); const r = await fetch(URL_(), { headers: { Authorization: "Bearer " + tok } }); const j = await r.json().catch(() => null); if (!r.ok) throw new Error(j?.villa || (r.status === 404 ? "Fallið claude er ekki uppsett enn (deploy)." : "Villa " + r.status)); NK = j; NKerr = ""; }
    catch (e) { NKerr = String(e.message || e); }
  }
  function stillHTML() {
    if (Date.now() - NKt > 60000) { NKt = Date.now(); saekjaNotkun().then(() => tr(() => render())); }
    const Cs = st()?.stillingar?.claude || {}, thak = +Cs.thak || 3000, tn = +Cs.thakNotandi || 0, lk = Cs.likan || "sonnet", cur = NK?.notkun?.find(x => x.manudur === NK.manudur);
    const sec = (t, b) => `<div class="card" style="margin-top:12px"><div class="viewtitle">${t}</div>${b}</div>`;
    const users = cur ? Object.values(cur.notendur || {}).sort((a, b) => b.kr - a.kr) : [];
    const pct = cur ? Math.min(100, Math.round((cur.kr || 0) / thak * 100)) : 0;
    return sec("Notkun í mánuðinum", NKerr ? `<div class="msg err">${E(NKerr)}</div>` : !NK ? `<div class="empty">Sæki notkun…</div>` :
      `<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span style="font-size:30px;font-weight:500;font-variant-numeric:tabular-nums">${E(KRf(cur?.kr))}</span><span style="color:var(--muted)">af ${E(KRf(thak))} þaki · ${cur?.n || 0} köll</span></div>
       <div class="clbar"><i style="width:${pct}%"></i></div>
       ${users.length ? `<div class="llist" style="margin-top:10px">${users.map(u => `<div class="lrow"><div class="lm"><div class="lt">${E(u.nafn)}</div></div><div class="lr">${E(KRf(u.kr))} · ${u.n} köll</div></div>`).join("")}</div>` : ""}
       ${(NK.notkun || []).filter(x => x.manudur !== NK.manudur).length ? `<div class="hint" style="margin-top:10px">Fyrri mánuðir: ${(NK.notkun || []).filter(x => x.manudur !== NK.manudur).map(x => E(x.manudur + ": " + KRf(x.kr))).join(" · ")}</div>` : ""}
       <p class="hint" style="margin:10px 0 0">Krónur eru reiknaðar gróft úr dollaraverði Anthropic (gengi ${E(NK.gengi || 140)}). Reikningurinn sjálfur kemur frá Anthropic til AERA Studio.</p>`)
      + sec("Þak og líkan", `<form id="clst" class="form" style="display:grid;gap:12px;max-width:520px">
        <label>Mánaðarþak fyrir fyrirtækið (kr.)<input id="cl-thak" type="number" min="100" step="100" value="${E(thak)}"></label>
        <label>Þak á hvern notanda á mánuði (kr., tómt = ekkert)<input id="cl-tn" type="number" min="0" step="100" value="${tn ? E(tn) : ""}"></label>
        <label>Líkan<select id="cl-lk"><option value="sonnet"${lk === "sonnet" ? " selected" : ""}>Claude Sonnet – bestu svörin (sjálfgefið)</option><option value="haiku"${lk === "haiku" ? " selected" : ""}>Claude Haiku – hraðara og um 20× ódýrara</option></select></label>
        <div class="actions" style="justify-content:flex-start"><button type="submit" class="btn primary">Vista</button></div></form>
        <p class="hint" style="margin:10px 0 0">Þegar þaki er náð svarar Claude ekki fyrr en í næsta mánuði. Samantekt mánaðarins berst admin sem tilkynning 1. hvers mánaðar.</p>`)
      + sec("Um gögnin", `<p style="margin:0">Spurningar og þau gögn sem Claude sækir til að svara (verkefni, tímar o.fl. sem notandinn sér í appinu) fara til Anthropic til vinnslu. Anthropic notar ekki gögn sem send eru um API-ið til að þjálfa líkön. Samtöl eru ekki vistuð í Atrium.</p>`);
  }
  document.addEventListener("submit", e => { if (e.target?.id !== "clst") return; e.preventDefault();
    const thak = Math.max(100, +document.getElementById("cl-thak").value || 3000), tn = Math.max(0, +document.getElementById("cl-tn").value || 0), lk = document.getElementById("cl-lk").value;
    saveSnapshot(s => { s.stillingar = s.stillingar || {}; s.stillingar.claude = { ...(s.stillingar.claude || {}), thak, thakNotandi: tn || null, likan: lk }; }).then(() => toast("Vistað")).catch(err => toast(tr(() => errText(err), String(err))));
  });
  const addSt = () => { if (typeof STPAGES === "undefined") return false; STPAGES.claude = { l: "Claude-aðstoð", d: "Notkun, mánaðarþak og líkan", s: ["Claude-aðstoð", "Notkun", "Þak"], adm: 1, fn: () => stillHTML() }; return true; };
  if (!addSt()) { const iv = setInterval(() => { if (addSt()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }

  /* ---------- Hnappar: við bjölluna (tölva) og í haus símans ---------- */
  function hnappur() {
    let b = document.getElementById("u2claude");
    if (!on()) { b?.remove(); return; }
    if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "u2claude"; b.className = "u2claude"; b.setAttribute("aria-label", "Claude-aðstoð"); b.title = "Claude-aðstoð"; b.innerHTML = IC; b.onclick = () => claudeOpna(); document.body.append(b); }
  }
  const wrapBell = () => { if (window.u1Bell && !window.u1Bell.__cl) { const o = window.u1Bell; window.u1Bell = function () { const r = o.apply(this, arguments); hnappur(); return r; }; window.u1Bell.__cl = 1; } };
  const wrapSM = () => { if (window.SM?.bell && !SM.bell.__cl) { const o = SM.bell; SM.bell = function () { return (on() ? `<button type="button" class="smib smclaude" onclick="claudeOpna()" aria-label="Claude-aðstoð">${IC}</button>` : "") + o.apply(this, arguments); }; SM.bell.__cl = 1; } };
  wrapBell(); wrapSM();
  document.addEventListener("DOMContentLoaded", () => { wrapBell(); wrapSM(); });
  setInterval(() => { wrapBell(); wrapSM(); hnappur(); }, 1500);
})();
