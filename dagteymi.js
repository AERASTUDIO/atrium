/* Dagatal › Teymi (2.130.0): hver er bókaður hvar – allt starfsfólk í röðum, dagar vikunnar í dálkum.
   Ekkert nýtt í gagnagrunni: les fundi í Atrium (stofnandi/boðaðir), Outlook-dagatöl samstarfsfólks (fundabod.js, ef deilt),
   verkefni (timabilFra–timabilTil, starfsmenn) og pantanir (afhending/skil, starfsmenn).
   „+“ í auðum reit opnar nýjan fund (bókun) með viðkomandi boðaðan – árekstrar eru athugaðir við vistun (fbConflicts). */
(function () {
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const lc = s => String(s || "").trim().toLowerCase();
  const pad = n => String(n).padStart(2, "0");
  const iso = x => x.getFullYear() + "-" + pad(x.getMonth() + 1) + "-" + pad(x.getDate());
  const DN = ["Sun", "Mán", "Þri", "Mið", "Fim", "Fös", "Lau"], MN = ["jan", "feb", "mar", "apr", "maí", "jún", "júl", "ágú", "sep", "okt", "nóv", "des"];
  let OFF = 0; // vikur frá þessari
  const monday = () => { const t = new Date(); t.setHours(12, 0, 0, 0); t.setDate(t.getDate() - ((t.getDay() + 6) % 7) + OFF * 7); return t; };
  const tr = (f, d) => { try { return f(); } catch (e) { return d; } };

  function folk() {
    const us = tr(() => (window.nuUsers ? nuUsers() : []).filter(u => u.virkur !== false && u.email), []);
    const st = tr(() => STARFS(), []);
    const out = []; st.forEach(s => { const u = us.find(x => x.sk === s.sk); out.push({ sk: s.sk, nafn: s.nafn || u?.nafn || s.sk, email: lc(u?.email || tr(() => skEmail(s.sk), "")) }); });
    us.filter(u => !out.some(o => o.email === lc(u.email))).forEach(u => out.push({ sk: u.sk || "", nafn: u.nafn || u.email, email: lc(u.email) }));
    return out;
  }
  const hm = x => String(x || "").slice(11, 16);
  function atridi(p, days, nakv) {
    const R = new Map(days.map(d => [d, []])), put = (d, it) => { if (R.has(d)) R.get(d).push(it); };
    const a = days[0], b = days[days.length - 1];
    // Fundir í Atrium – aðeins þeir sem viðkomandi stofnaði eða er boðaður á (eldri fundir án skráningar sleppa)
    (S?.fundir || []).forEach(f => { if (!f.date) return; const d = String(f.date).slice(0, 10); if (d < a || d > b) return;
      const att = tr(() => fbAtt(f), []);
      if (!f.stofnandi && !att.length) { const v = f.projectId && tr(() => findProj(f.projectId), null); if (!v || !p.sk || !(v.starfsmenn || []).includes(p.sk)) return; } // eldri fundir: starfsfólk verkefnisins
      else if (!p.email || !tr(() => fundFor(f, p.email), false)) return;
      const mine = f.persona && tr(() => fundMinn(f), false);
      put(d, { k: f.persona ? "e" : "f", t: f.heilldagur ? "" : hm(f.date), e: f.heilldagur ? "" : hm(f.dateEnd), txt: tr(() => fundNafn(f), f.name) || "Fundur", open: f.persona ? "" : "fund:" + f.id, act: mine ? "dvid:" + f.id : "", lock: f.persona && f.einka }); });
    // Outlook (deilt dagatal samstarfsfólks; eigin dagatal fyrir notandann sjálfan)
    tr(() => (window.fbTeamEv ? fbTeamEv(p.email) : []), []).forEach(e => { const d = e.s.slice(0, 10); if (d < a || d > b) return;
      if ((R.get(d) || []).some(x => x.k === "f" && x.t === hm(e.s) && lc(x.txt) === lc(e.t))) return;
      put(d, { k: "o", t: e.allDay ? "" : hm(e.s), e: e.allDay ? "" : hm(e.e), txt: e.t || "Upptekin" }); });
    // Verkefni sem viðkomandi er á og standa yfir
    tr(() => verkD(), []).forEach(v => { if (!p.sk || !(v.starfsmenn || []).includes(p.sk) || !v.timabilFra) return; const f0 = String(v.timabilFra).slice(0, 10), t0 = String(v.timabilTil || v.timabilFra).slice(0, 10);
      days.forEach(d => { if (d >= f0 && d <= t0) put(d, { k: "v", t: "", txt: (v.nr ? v.nr + " " : "") + (v.stutt || ""), open: "verk:" + v.id }); }); });
    // Skil verkefna og undirverka sem viðkomandi er á
    tr(() => verkD(), []).forEach(v => { if (!p.sk) return; const aV = (v.starfsmenn || []).includes(p.sk);
      if (aV && v.skiladagur && !tr(() => isDone(v), false)) put(String(v.skiladagur).slice(0, 10), { k: "s", t: "", txt: "Skil " + (v.nr || "") + " " + (v.stutt || ""), open: "verk:" + v.id });
      (v.undirverk || []).forEach(u => { if (u.skiladagur && u.stada !== "Done" && (u.abyrgd === p.sk || (u.starfsmenn || []).includes(p.sk) || (aV && !u.abyrgd && !(u.starfsmenn || []).length))) put(String(u.skiladagur).slice(0, 10), { k: "s", t: "", txt: "Skil " + (u.nr || "") + " " + tr(() => subName(u), u.heiti || u.nafn || ""), open: "sub:" + u.id }); }); });
    // Skráðir tímar (liðnir dagar og í dag): hvar viðkomandi vann, klst. á verkefni
    { const ti = iso(new Date()), sum = new Map();
      tr(() => S.timar.faerslur, []).forEach(e => { const d = String(e.date || "").slice(0, 10); if (d < a || d > b || d > ti || (e.starfsmadur || e.sk) !== p.sk) return;
        if (nakv && e.fra && e.til) { const v = e.verkefniId && tr(() => findProj(e.verkefniId), null); put(d, { k: "t", t: e.fra, e: e.til, txt: "Skráð · " + (v ? (v.nr || "") + " " + (v.stutt || "") : (e.lysing || "án verkefnis")), open: v ? "verk:" + v.id : "" }); return; }
        const k = d + "|" + (e.verkefniId || ""); sum.set(k, (sum.get(k) || 0) + (+e.timar || 0)); });
      sum.forEach((h, k) => { const [d, pid] = k.split("|"), v = pid && tr(() => findProj(pid), null); put(d, { k: "t", t: "", txt: (Math.round(h * 10) / 10).toString().replace(".", ",") + " klst. · " + (v ? (v.nr || "") + " " + (v.stutt || "") : "án verkefnis"), open: v ? "verk:" + v.id : "" }); }); }
    // Pantanir: afhending og skil
    tr(() => window.salaAPI.PN(), []).forEach(P => { if (!p.sk || !(P.starfsmenn || []).includes(p.sk) || ["Skilað", "Lokið"].includes(P.stada)) return;
      const f0 = String(P.fra || "").slice(0, 10), t0 = String(P.til || "").slice(0, 10);
      if (f0) put(f0, { k: "p", t: hm(P.fra), txt: "Afhending " + (P.nr || ""), open: "tb:" + P.id });
      if (t0 && t0 !== f0) put(t0, { k: "p", t: hm(P.til), txt: "Skil " + (P.nr || ""), open: "tb:" + P.id }); });
    const RO = { f: 0, e: 0, o: 0, p: 0, v: 1, s: 1, t: 2 };
    R.forEach(xs => xs.sort((x, y) => RO[x.k] - RO[y.k] || String(x.t).localeCompare(String(y.t))));
    return R;
  }

  /* ---------- Dagatal › Fólk (2.132.0): sía Ég · Allir · nafn. Einn → vikan með klukkutímum; Allir → hver er hvar ---------- */
  let WHO = "me";
  const H0 = 7, H1 = 19, PXH = 46;
  const toMin = t => { const [h, m] = String(t || "").split(":").map(Number); return isNaN(h) ? null : h * 60 + (m || 0); };
  function itemHTML(x) { const at = x.act ? `data-act="${E(x.act)}"` : x.open ? `href="#" data-open="${E(x.open)}"` : "";
    const tag = x.act || x.open ? "a" : "span";
    return `<${tag} ${at} class="dti dti-${x.k}" title="${E((x.t ? x.t + (x.e ? "–" + x.e : "") + " " : "") + x.txt)}">${x.lock ? "🔒 " : ""}${x.t ? `<b>${E(x.t)}</b> ` : ""}${E(x.txt)}</${tag}>`; }
  function weekOne(p, days, ti) { const wem = p.email && p.email !== lc(tr(() => fbMe(), "")) ? p.email : "";
    const R = atridi(p, days, true), hours = [...Array(H1 - H0 + 1)].map((_, i) => H0 + i);
    const lbl = d => { const x = new Date(d + "T12:00:00"); return DN[x.getDay()] + " " + x.getDate() + "."; };
    const top = days.map(d => { const xs = (R.get(d) || []).filter(x => !x.t || toMin(x.t) === null); return `<div class="dwa${d === ti ? " dtt" : ""}">${xs.map(itemHTML).join("")}</div>`; }).join("");
    const cols = days.map(d => { const xs = (R.get(d) || []).filter(x => x.t && toMin(x.t) !== null);
      // 2.135.0: atriði sem skarast standa hlið við hlið (brautir innan hvers klasa)
      const sp = xs.map(x => { const a = Math.max(H0 * 60, toMin(x.t)), e0 = toMin(x.e); return { x, a, b: Math.min(H1 * 60, e0 && e0 > a ? e0 : a + 60) }; }).sort((p1, p2) => p1.a - p2.a || p2.b - p1.b);
      let cl = [], clEnd = -1; const flush = () => { const n = Math.max(...cl.map(c => c.lane)) + 1; cl.forEach(c => c.n = n); cl = []; };
      sp.forEach(c => { if (c.a >= clEnd && cl.length) flush(); const ends = []; cl.forEach(o2 => { if (o2.b > c.a) ends[o2.lane] = true; }); let l = 0; while (ends[l]) l++; c.lane = l; cl.push(c); clEnd = Math.max(clEnd, c.b); }); if (cl.length) flush();
      const ev = sp.map(({ x, a, b, lane, n }) => {
        const st = `top:${(a - H0 * 60) / 60 * PXH}px;height:${Math.max(20, (b - a) / 60 * PXH - 3)}px;left:calc(${lane / n * 100}% + 4px);width:calc(${100 / n}% - 8px);right:auto`;
        const at = x.act ? `data-act="${E(x.act)}" role="button" tabindex="0"` : x.open ? `data-open="${E(x.open)}" role="button" tabindex="0"` : "";
        return `<div class="dwe dwe-${x.k}" style="${st}" ${at}><b>${x.lock ? "🔒 " : ""}${E(x.txt)}</b><small>${E(x.t)}${x.e ? "–" + E(x.e) : ""}</small></div>`; }).join("");
      const now = d === ti ? (() => { const n = new Date(), m = n.getHours() * 60 + n.getMinutes(); return m >= H0 * 60 && m <= H1 * 60 ? `<i class="dwnow" style="top:${(m - H0 * 60) / 60 * PXH}px"></i>` : ""; })() : "";
      return `<div class="dwc${d === ti ? " dtt" : ""}" data-dag="${E(d)}">${hours.slice(0, -1).map((h, i) => `<button type="button" class="dwslot" style="top:${i * PXH}px;height:${PXH}px" data-act="dvny:${E(d)}:${pad(h)}:00${wem ? ":" + E(wem) : ""}" aria-label="${wem ? "Bóka" : "Nýr viðburður"} ${E(lbl(d))} kl. ${pad(h)}"></button>`).join("")}${ev}${now}</div>`; }).join("");
    return `<div class="card dwk"><div class="dwrow dwh"><div></div>${days.map(d => `<div class="${d === ti ? "dtt" : ""}">${E(lbl(d))}</div>`).join("")}</div>
      <div class="dwrow dwall"><div class="dwlab">Allan daginn</div>${top}</div>
      <div class="dwrow dwbody" style="height:${(H1 - H0) * PXH}px"><div class="dwhrs">${hours.slice(0, -1).map((h, i) => `<span style="top:${i * PXH}px">${pad(h)}:00</span>`).join("")}</div>${cols}</div></div>`;
  }
  function view() {
    try { window.fbTeamLoad && fbTeamLoad(); } catch (e) {}
    const m = monday(), days = [...Array(5)].map((_, i) => { const x = new Date(m); x.setDate(m.getDate() + i); return iso(x); });
    const ti = iso(new Date()), P = folk(), me = lc(tr(() => fbMe(), ""));
    const f = new Date(days[0] + "T12:00:00"), l = new Date(days[4] + "T12:00:00");
    const rng = f.getDate() + "." + (f.getMonth() !== l.getMonth() ? " " + MN[f.getMonth()] : "") + "–" + l.getDate() + ". " + MN[l.getMonth()] + " " + l.getFullYear();
    const who = WHO === "me" ? (P.find(p => p.email && p.email === me) || { sk: tr(() => ME(), ""), nafn: "Ég", email: me }) : WHO === "*" ? null : P.find(p => (p.email || p.sk) === WHO) || null;
    const sel = `<label class="dtwho"><span class="sr">Hvers dagatal</span><select onchange="doAct('dtwho:'+this.value)"><option value="me"${WHO === "me" ? " selected" : ""}>Ég</option><option value="*"${WHO === "*" ? " selected" : ""}>Allir</option>${P.filter(p => p.email !== me).map(p => `<option value="${E(p.email || p.sk)}"${WHO === (p.email || p.sk) ? " selected" : ""}>${E(p.nafn)}</option>`).join("")}</select></label>`;
    const hdr = `<div class="uhead"><div><div class="spsup">Dagatal</div><h2 class="ptitle">Fólk</h2></div><div class="uhr dtnav">${sel}<button type="button" class="btn" data-act="dteymi:-1" aria-label="Fyrri vika">‹</button><button type="button" class="btn" data-act="dteymi:0">Þessi vika</button><button type="button" class="btn" data-act="dteymi:1" aria-label="Næsta vika">›</button><span class="dtrng">${E(rng)}</span><button type="button" class="btn${who ? "" : " primary"}" data-act="dtbok:${E(days.includes(ti) ? ti : days[0])}:${who ? E(who.email || "") : ""}">${who ? "Verk á dagatal" : "+ Setja á dagatal"}</button><button type="button" class="btn${who ? " primary" : ""}" data-act="dvny:${E(days.includes(ti) ? ti : days[0])}:09:00${who && who.email && who.email !== me ? ":" + E(who.email) : ""}"${who ? "" : ' hidden'}>${who && who.email && who.email !== me ? "+ Bóka " + E(String(who.nafn).split(" ")[0]) : "+ Viðburður"}</button>${!who ? "" : ""}</div></div>`;
    const msTxt = tr(() => window.fbCalOk && fbCalOk(), false) ? "" : `<p class="hint dthint">Fundir, viðburðir og verk úr Atrium. Tengdu Microsoft 365 til að sjá líka Outlook-dagatöl.</p>`;
    const leg = `<div class="dtleg"><span><i class="dti-f"></i>Fundur</span><span><i class="dti-e"></i>Viðburður</span><span><i class="dti-o"></i>Outlook</span><span><i class="dti-v"></i>Verkefni</span><span><i class="dti-p"></i>Afhending / skil</span><span><i class="dti-s"></i>Skiladagur</span>${who ? `<span><i class="dwe-t" style="width:14px;height:10px;border-radius:3px;display:inline-block"></i>Skráðir tímar</span>` : ""}<span class="dtlh">${who ? "Smelltu á lausan tíma til að bæta við viðburði · 🔒 = aðrir sjá „Upptekinn“" : "„+“ bókar viðkomandi – Atrium varar við ef hann er upptekinn"}</span><a href="#" class="dtfl" data-act="tab:fundir">Fundalisti →</a></div>`;
    if (who) return hdr + msTxt + leg + weekOne(who, days, ti);
    const head = `<div class="dtrow dth"><div class="dtp">Starfsfólk · ${P.length}</div>${days.map(d => { const x = new Date(d + "T12:00:00"); return `<div class="dtd${d === ti ? " dtt" : ""}">${E(DN[x.getDay()] + " " + x.getDate() + ".")}</div>`; }).join("")}</div>`;
    const rows = P.map(p => { const R = atridi(p, days), ini = (p.sk || p.nafn.split(/\s+/).map(w => w[0] || "").join("")).slice(0, 2).toUpperCase();
      return `<div class="dtrow"><div class="dtp"><span class="dtav">${E(ini)}</span><a href="#" class="dtn" data-act="dtwho:${E(p.email && p.email === me ? "me" : (p.email || p.sk))}">${E(p.nafn)}${p.email && p.email === me ? " <small>(þú)</small>" : ""}</a></div>${days.map(d => { const xs = R.get(d) || [];
        return `<div class="dtc${d === ti ? " dtt" : ""}">${xs.slice(0, 4).map(itemHTML).join("")}${xs.length > 4 ? `<span class="dtmore">+${xs.length - 4}</span>` : ""}${tr(() => MCP, true) ? `<button type="button" class="dtadd" data-act="dtbok:${E(d)}:${E(p.email || "")}" aria-label="Bóka ${E(p.nafn)}">+</button>` : ""}</div>`; }).join("")}</div>`; }).join("");
    return hdr + msTxt + leg + `<div class="card dtgrid">${head}${rows || `<div class="empty">Ekkert starfsfólk skráð.</div>`}</div>`;
  }

  /* ---------- Eigin viðburður (2.132.0): ekki tengdur verkefni; sýnileiki Allir / Upptekinn ---------- */
  function vidbForm(d, t, id) {
    const f = id ? (S?.fundir || []).find(x => x.id === id) : null, ek = f ? (window.EINKA?.[f.id] || {}) : {};
    const heiti = f ? (f.einka ? ek.heiti || "" : f.name || "") : "", dd = f ? String(f.date).slice(0, 10) : d, fr = f ? (f.heilldagur ? "" : hm(f.date)) : t, tl = f ? (f.heilldagur ? "" : hm(f.dateEnd)) : (t ? pad(Math.min(23, +t.slice(0, 2) + 1)) + ":" + t.slice(3, 5) : "");
    const einka = f ? !!f.einka : true, hd = f ? !!f.heilldagur : false;
    sheet.innerHTML = `<h3 id="sheet-h">${f ? "Breyta viðburði" : "Nýr viðburður"}</h3><form id="vbf" novalidate>
      <label>Heiti<input id="vb-h" required placeholder="T.d. Tannlæknir, frí, námskeið" value="${E(heiti)}"></label>
      <div class="three"><label>Dagur<input id="vb-d" type="date" value="${E(dd)}" required></label><label>Frá<input id="vb-f" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" data-t24 value="${E(fr)}"${hd ? " disabled" : ""}></label><label>Til<input id="vb-t" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" data-t24 value="${E(tl)}"${hd ? " disabled" : ""}></label></div>
      <label class="chk"><input type="checkbox" id="vb-hd"${hd ? " checked" : ""}><span>Allan daginn</span></label>
      <div class="kind" style="margin:12px 0 6px">Hvað sjá aðrir?</div>
      <div class="smopts"><label class="chk smopt"><input type="radio" name="vb-s" value="einka"${einka ? " checked" : ""}><span><b>Bara „Upptekinn“</b><small>Heitið sést aðeins þér – það er geymt á þínu svæði sem enginn annar getur lesið</small></span></label>
        <label class="chk smopt"><input type="radio" name="vb-s" value="allir"${einka ? "" : " checked"}><span><b>Allir sjá heitið</b><small>T.d. frí eða námskeið sem samstarfsfólk má vita af</small></span></label></div>
      <p class="hint">Tíminn telst upptekinn þegar einhver bókar þig – Atrium varar þá við árekstri.</p>
      <div id="f-msg"></div><div class="actions">${f ? `<button type="button" class="btn" id="vb-del" style="margin-right:auto">Eyða</button>` : ""}<button type="button" class="btn" id="vb-x">Hætta við</button><button class="btn primary" id="vb-ok">Vista</button></div></form>`;
    sheetwrap.hidden = false; setTimeout(() => document.getElementById("vb-h")?.focus(), 50);
    const hdc = document.getElementById("vb-hd"); hdc.onchange = () => { ["vb-f", "vb-t"].forEach(i => document.getElementById(i).disabled = hdc.checked); };
    document.getElementById("vb-x").onclick = closeSheet;
    if (f) document.getElementById("vb-del").onclick = async () => { if (!await atrJa(`Eyða viðburðinum „${heiti || "Upptekinn"}“?`, { ja: "Eyða", haetta: true })) return;
      await saveSnapshot(s => { s.fundir = (s.fundir || []).filter(x => x.id !== f.id); }); if (window.EINKA?.[f.id]) { delete window.EINKA[f.id]; window.heimSaveDoc?.(); } closeSheet(); toast("Viðburði eytt"); };
    document.getElementById("vbf").onsubmit = async e => { e.preventDefault(); const msgEl = document.getElementById("f-msg"), say = t2 => { msgEl.innerHTML = `<div class="msg err">${E(t2)}</div>`; };
      const h = document.getElementById("vb-h").value.trim(), d2 = document.getElementById("vb-d").value, allDay = hdc.checked;
      const nt = v => { v = String(v || "").trim().replace(/[.,]/, ":"); if (/^\d{1,2}$/.test(v)) v += ":00"; const m2 = v.match(/^(\d{1,2}):(\d{2})$/); return m2 && +m2[1] < 24 && +m2[2] < 60 ? pad(+m2[1]) + ":" + m2[2] : ""; };
      const f1 = nt(document.getElementById("vb-f").value), t1 = nt(document.getElementById("vb-t").value), ek2 = document.querySelector('input[name="vb-s"]:checked')?.value === "einka";
      if (!h) return say("Skrifaðu heiti."); if (!d2) return say("Veldu dag."); if (!allDay && (!f1 || !t1 || t1 <= f1)) return say("Skrifaðu tíma frá og til (t.d. 14:00–15:00), eða hakaðu við Allan daginn.");
      const nid = f ? f.id : (typeof newId === "function" ? newId() : "v" + Date.now().toString(36)), meE = lc(tr(() => fbMe(), ""));
      const rec = { name: ek2 ? "Upptekinn" : h, date: d2 + "T" + (allDay ? "00:00" : f1), dateEnd: d2 + "T" + (allDay ? "23:59" : t1), heilldagur: allDay || null, persona: true, einka: ek2, stofnandi: meE, attendees: [], projectId: null, stadsetning: null };
      document.getElementById("vb-ok").disabled = true;
      try {
        if (ek2) { window.EINKA = { ...(window.EINKA || {}), [nid]: { heiti: h } }; } else if (window.EINKA?.[nid]) { delete window.EINKA[nid]; }
        await saveSnapshot(s => { s.fundir = s.fundir || []; const q = s.fundir.find(x => x.id === nid); if (q) Object.assign(q, rec); else s.fundir.push({ id: nid, ...rec }); });
        try { await window.heimSaveDoc?.(); } catch (x) {}
        closeSheet(); toast(ek2 ? "Viðburður vistaður – aðrir sjá „Upptekinn“" : "Viðburður vistaður");
      } catch (err) { document.getElementById("vb-ok").disabled = false; say(err?.message || String(err)); } };
  }
  window.vidbForm = vidbForm;

  /* ---------- Starfsmannstákn (2.136.0): upphafsstafir; músarbendill sýnir fullt nafn, hlutverk og stöðu núna ---------- */
  const ROLEH = { admin: "Admin", bokari: "Bókari", starfsmadur: "Starfsmaður", vettvangur: "Vettvangur" };
  window.atrStada = sk => { const P = folk().find(x => x.sk === sk) || { sk, nafn: sk, email: lc(tr(() => skEmail(sk), "")) }, n = new Date(), d = iso(n), nm = pad(n.getHours()) + ":" + pad(n.getMinutes());
    const R = atridi(P, [d]).get(d) || [], nu = R.filter(x => x.t && x.e && x.t <= nm && nm < x.e).sort((a, b) => String(b.e).localeCompare(String(a.e)))[0];
    const naest = R.filter(x => x.t && x.t > nm && x.k !== "t").sort((a, b) => String(a.t).localeCompare(String(b.t)))[0];
    const u = tr(() => (window.nuUsers ? nuUsers() : []).find(x => x.sk === sk), null), hl = ROLEH[u?.hlutverk] || "";
    const st = nu ? `Upptekin(n) til ${nu.e} – ${nu.txt}` : R.some(x => x.k === "e" && !x.t) ? "Fjarverandi í dag" : naest ? `Laus núna · næst kl. ${naest.t}: ${naest.txt}` : "Laus núna";
    return { nafn: P.nafn || sk, hl, st, upptekin: !!nu }; };
  window.atrAv = (sk, tag) => { const s = tr(() => atrStada(sk), { nafn: sk, hl: "", st: "" }), ini = String(sk || "").slice(0, 2).toUpperCase();
    return `<span class="atav${s.upptekin ? " busy" : ""}" title="${E([s.nafn, s.hl, tag, s.st].filter(Boolean).join(" · "))}" aria-label="${E(s.nafn)}">${E(ini)}</span>`; };

  /* ---------- Bóka starfsmann (2.134.2): fundur/bókun þar sem starfsmaðurinn er boðaður – hann fær boðið í Bíður mín og skilaboð í spjalli ---------- */
  // Það sem er til og má setja á dagatal: verkefni, opin undirverk og opnar pantanir
  function tengjanleg() { const L = [];
    tr(() => verkefni(), []).filter(p => !tr(() => isDone(p), false)).sort((a, b) => String(b.nr).localeCompare(String(a.nr), "is", { numeric: true })).forEach(p => {
      L.push({ l: "Verkefni · " + (p.nr || "") + " " + (p.stutt || p.nafn || ""), h: p.stutt || p.nafn || "", pid: p.id });
      (p.undirverk || []).filter(u => u.stada !== "Done").forEach(u => L.push({ l: "Undirverk · " + (u.nr || "") + " " + tr(() => subName(u), u.heiti || ""), h: tr(() => subName(u), u.heiti || "") + " (" + (p.nr || "") + ")", pid: p.id, uid: u.id, dag: u.skiladagur ? String(u.skiladagur).slice(0, 10) : "" })); });
    tr(() => window.salaAPI.PN(), []).filter(P => !["Skilað", "Lokið"].includes(P.stada)).forEach(P => L.push({ l: "Pöntun · " + (P.nr || "") + " " + (P.heiti && P.heiti !== "Pöntun" ? P.heiti : P.vidskiptavinur || ""), h: (P.stada === "Afhent" ? "Skil " : "Afhending ") + (P.nr || "") + (P.heiti && P.heiti !== "Pöntun" ? " " + P.heiti : ""), pid: P.verkefniId || "", pnid: P.id, dag: String((P.stada === "Afhent" ? P.til : P.fra) || "").slice(0, 10), kl: hm(P.stada === "Afhent" ? P.til : P.fra) }));
    return L; }
  function bokForm(d, t, em) {
    const meE = lc(tr(() => fbMe(), "")), PP = folk(), TL = tengjanleg();
    const tl = t ? pad(Math.min(23, +t.slice(0, 2) + 1)) + ":" + t.slice(3, 5) : "";
    sheet.innerHTML = `<h3 id="sheet-h">Setja á dagatal</h3><form id="bkf" novalidate>
      <label>Hver<select id="bk-w">${em ? "" : `<option value="">Veldu starfsmann…</option>`}${PP.map(p => `<option value="${E(p.email)}"${p.email === (em || "") ? " selected" : ""}>${E(p.nafn)}${p.email === meE ? " (ég)" : ""}</option>`).join("")}</select></label>
      <label>Tengist (valfrjálst)<input id="bk-l" list="bk-ll" placeholder="Leita að verkefni, undirverki eða pöntun sem er til…" autocomplete="off"><datalist id="bk-ll">${TL.map(x => `<option value="${E(x.l)}"></option>`).join("")}</datalist></label>
      <label>Hvað<input id="bk-h" required placeholder="T.d. Uppsetning í sal, yfirferð teikninga"></label>
      <div class="three"><label>Dagur<input id="bk-d" type="date" value="${E(d)}" required></label><label>Frá<input id="bk-f" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" data-t24 value="${E(t)}"></label><label>Til<input id="bk-t" type="text" inputmode="decimal" maxlength="5" placeholder="hh:mm" data-t24 value="${E(tl)}"></label></div>
      <label class="chk" id="bk-spl"><input type="checkbox" id="bk-sp" checked><span id="bk-spt">Senda skilaboð í spjalli</span></label>
      <label class="chk" id="bk-oll"><input type="checkbox" id="bk-ol"${tr(() => window.fbCalOk && fbCalOk(), false) ? " checked" : " disabled"}><span>Senda líka Outlook-boð${tr(() => window.fbCalOk && fbCalOk(), false) ? "" : " (tengdu Microsoft 365)"}</span></label>
      <p class="hint" id="bk-hint"></p>
      <div id="f-msg"></div><div class="actions"><button type="button" class="btn" id="bk-x">Hætta við</button><button class="btn primary" id="bk-ok">Setja á dagatal</button></div></form>`;
    sheetwrap.hidden = false;
    const W = document.getElementById("bk-w"), Lk = document.getElementById("bk-l"), Hh = document.getElementById("bk-h");
    const upd = () => { const w = W.value, P = PP.find(p => p.email === w), f = P ? String(P.nafn).split(" ")[0] : "", min = !w || w === meE;
      document.getElementById("bk-spl").hidden = min; document.getElementById("bk-oll").hidden = min; document.getElementById("bk-spt").textContent = "Senda " + f + " skilaboð í spjalli";
      document.getElementById("bk-hint").textContent = min ? "Fer í þitt dagatal." : `${f} sér þetta í dagatalinu sínu og fær það í „Bíður mín“ til að samþykkja eða hafna. Atrium varar við ef ${f} er upptekin(n) á þessum tíma.`; };
    W.onchange = upd; upd();
    let sel = null;
    Lk.oninput = () => { sel = TL.find(x => x.l === Lk.value) || null; if (sel) { if (!Hh.value || Hh.dataset.auto) { Hh.value = sel.h; Hh.dataset.auto = "1"; } if (sel.dag) document.getElementById("bk-d").value = sel.dag; if (sel.kl) { document.getElementById("bk-f").value = sel.kl; } } };
    Hh.oninput = () => { delete Hh.dataset.auto; };
    setTimeout(() => (em ? Lk : W).focus(), 50);
    document.getElementById("bk-x").onclick = closeSheet;
    let samt = false;
    document.getElementById("bkf").onsubmit = async e => { e.preventDefault(); const msgEl = document.getElementById("f-msg"), say = (t2, w) => { msgEl.innerHTML = `<div class="msg ${w ? "warn" : "err"}">${E(t2)}</div>`; };
      const nt = v => { v = String(v || "").trim().replace(/[.,]/, ":"); if (/^\d{1,2}$/.test(v)) v += ":00"; const m2 = v.match(/^(\d{1,2}):(\d{2})$/); return m2 && +m2[1] < 24 && +m2[2] < 60 ? pad(+m2[1]) + ":" + m2[2] : ""; };
      const w = W.value, P = PP.find(p => p.email === w), h = Hh.value.trim(), d2 = document.getElementById("bk-d").value, f1 = nt(document.getElementById("bk-f").value), t1 = nt(document.getElementById("bk-t").value), min = w === meE;
      if (!w) return say("Veldu starfsmann."); if (!h) return say("Skrifaðu hvað þetta er – eða veldu verkefni, undirverk eða pöntun."); if (!d2 || !f1 || !t1 || t1 <= f1) return say("Veldu dag og tíma frá og til (t.d. 13:00–16:00).");
      const att = min ? [] : [{ nafn: P?.nafn || w, netfang: w, innri: true }], ok = document.getElementById("bk-ok");
      if (!samt) { ok.disabled = true; let c = []; try { c = await (window.fbConflicts ? fbConflicts({ slots: [{ s: d2 + "T" + f1, e: d2 + "T" + t1 }], att }) : []); } catch (x) {} ok.disabled = false;
        const nm = P?.nafn || "", hans = c.filter(x => !nm || x.startsWith(nm)); if (hans.length) { samt = true; ok.textContent = "Setja samt"; return say(hans.slice(0, 3).join(" · ") + ". Smelltu aftur til að setja samt.", true); } }
      const s0 = TL.find(x => x.l === Lk.value) || null, pr = s0?.pid ? tr(() => findProj(s0.pid), null) : null, nid = typeof newId === "function" ? newId() : "b" + Date.now().toString(36);
      const rec = { id: nid, name: h, date: d2 + "T" + f1, dateEnd: d2 + "T" + t1, stofnandi: meE, attendees: att, projectId: pr?.id || null, undirverkId: s0?.uid || null, pontunId: s0?.pnid || null, verknr: pr ? (pr.nr || "") + " " + (pr.stutt || "") : null, stadsetning: null, fundarhlekkur: null, fundargerd: null, mappa: null, seria: null, bokun: !min || null };
      ok.disabled = true;
      try { await saveSnapshot(s => { (s.fundir = s.fundir || []).push(rec);
          // starfsmaðurinn skráist líka á pöntunina / verkefnið (sést þá í „Verk“ og fær aðgang að pöntuninni)
          const sk = P?.sk; if (sk && s0?.pnid) { const Q = (s.pantanir || []).find(x => x.id === s0.pnid); if (Q && !(Q.starfsmenn || []).includes(sk)) Q.starfsmenn = [...(Q.starfsmenn || []), sk]; }
          if (sk && pr) { const V = (s.verkefni || []).find(x => x.id === pr.id); if (V && !(V.starfsmenn || []).includes(sk)) V.starfsmenn = [...(V.starfsmenn || []), sk]; } });
        if (!min && document.getElementById("bk-sp")?.checked && window.spSendRef) { try { await spSendRef(w, `Ég setti þig á: ${h} – ${d2.slice(8, 10)}.${d2.slice(5, 7)}. kl. ${f1}–${t1}`, s0?.uid ? "sub:" + s0.uid : s0?.pnid ? "tb:" + s0.pnid : pr ? "verk:" + pr.id : "fund:" + nid); } catch (x) {} }
        if (!min && document.getElementById("bk-ol")?.checked && window.fbSend) { try { await fbSend(nid); } catch (x) { toast("Outlook-boð fór ekki: " + (x?.message || x)); } }
        closeSheet(); toast(min ? "Sett á dagatalið þitt" : (P?.nafn || w) + " bókaður – fær boðið í Bíður mín"); }
      catch (err) { ok.disabled = false; say(err?.message || String(err)); } };
  }
  window.bokForm = bokForm;

  /* ---------- Dagatal › Verk (2.131.2): vikan í dálkum – allt með dagsetningu úr pöntunum, verkefnum, tilboðum og reikningum ---------- */
  let VOFF = 0, VF = "", VMODE = "vika";
  const VT = { ut: ["Leiga út", "#2F7D57", "#E3F1EA"], inn: ["Leiga inn", "#2F7D57", "#E3F1EA"], afh: ["Afhending", "#B7791F", "#FFF6E5"], skilp: ["Skil pöntunar", "#B7791F", "#FFF6E5"],
    skil: ["Skil", "#24578A", "#EAF0F6"], hefst: ["Hefst", "#24578A", "#EAF0F6"], vidb: ["Viðburður", "#24578A", "#EAF0F6"], frestur: ["Frestur", "#5E6976", "#F1F3F5"], gjd: ["Gjalddagi", "#5E6976", "#F1F3F5"] };
  const VGRP = { ut: "afh", inn: "afh", afh: "afh", skilp: "afh", skil: "skil", hefst: "skil", vidb: "skil", frestur: "frestur", gjd: "frestur" };
  function verkItems(days) {
    const R = new Map(days.map(d => [d, []])), put = (d, it) => { d = String(d || "").slice(0, 10); if (R.has(d)) R.get(d).push(it); };
    tr(() => window.salaAPI.PN(), []).forEach(P => { if (["Skilað", "Lokið"].includes(P.stada)) return; const L = P.deild === "leiga", who = P.vidskiptavinur || P.tengilidur || "", nm = [P.nr, P.heiti && P.heiti !== "Pöntun" ? P.heiti : ""].filter(Boolean).join(" ");
      if (P.fra && P.stada !== "Afhent") put(P.fra, { k: L ? "ut" : "afh", t: hm(P.fra), txt: nm, sub: who, menn: P.starfsmenn || [], need: 1, go: "u1go:pantanir:tb:" + P.id });
      if (P.til && (P.til !== P.fra || P.stada === "Afhent") && (P.deild === "leiga" || P.deild === "blandad")) put(P.til, { k: L ? "inn" : "skilp", t: hm(P.til), txt: nm, sub: who, menn: P.starfsmenn || [], need: 1, go: "u1go:pantanir:tb:" + P.id }); });
    tr(() => verkD(), []).forEach(v => { if (tr(() => isDone(v), false)) return; const nm = (v.nr ? v.nr + " " : "") + (v.stutt || ""), who = v.vidskiptavinur || "";
      if (v.skiladagur) put(v.skiladagur, { k: "skil", t: hm(v.skiladagur), txt: nm, sub: who, menn: v.starfsmenn || [], go: "u1go:verk:verk:" + v.id });
      if (v.timabilFra) put(v.timabilFra, { k: "hefst", t: "", txt: nm, sub: who, menn: v.starfsmenn || [], go: "u1go:verk:verk:" + v.id });
      if (v.vidburdur) put(v.vidburdur, { k: "vidb", t: hm(v.vidburdur), txt: nm, sub: who, menn: v.starfsmenn || [], go: "u1go:verk:verk:" + v.id });
      (v.undirverk || []).forEach(u => { if (u.skiladagur && u.stada !== "Done") put(u.skiladagur, { k: "skil", t: "", txt: (u.nr || "") + " " + tr(() => subName(u), u.heiti || u.nafn || ""), sub: nm, menn: (M => M.length ? M : (v.starfsmenn || []))([...new Set([u.abyrgd, ...(u.starfsmenn || [])].filter(Boolean))]), go: "u1go:verk:sub:" + u.id }); }); });
    tr(() => window.salaAPI.TB(), []).forEach(T => { if (T.stada === "Sent" && T.gildir) put(T.gildir, { k: "frestur", t: "", txt: "Tilboð " + (T.nr || "") + " rennur út", sub: T.vidskiptavinur || "", menn: [], go: "u1go:ltilbod:tb:" + T.id }); });
    if (tr(() => can("fjarmal"), false)) (S?.reikningar || []).forEach(r => { if (r.gjalddagi && !["Greitt", "Ógilt"].includes(r.stada) && r.nr) put(r.gjalddagi, { k: "gjd", t: "", txt: "Reikningur " + r.nr, sub: r.kaupandi?.name || "", menn: [], go: "u1go:trk:reikn:" + r.id }); });
    R.forEach(xs => xs.sort((a, b) => String(a.t || "99").localeCompare(String(b.t || "99"))));
    return R;
  }
  window.dtVerkItems = verkItems; window.dtVT = VT; // 2.139.0: Í dag › Vikan framundan
  function verkView() {
    const top = `<div class="uhead"><div><div class="spsup">Dagatal</div><h2 class="ptitle">Verk</h2></div><div class="uhr dtnav">${VMODE === "vika" ? `<button type="button" class="btn" data-act="dverk:-1" aria-label="Fyrri vika">‹</button><button type="button" class="btn" data-act="dverk:0">Þessi vika</button><button type="button" class="btn" data-act="dverk:1" aria-label="Næsta vika">›</button>` : ""}<span class="dtrng">${VMODE === "vika" ? "{RNG}" : ""}</span><span class="seg dvm"><button type="button" data-act="dverkm:vika" aria-pressed="${VMODE === "vika"}">Vika</button><button type="button" data-act="dverkm:tl" aria-pressed="${VMODE !== "vika"}">Tímalína</button></span></div></div>`;
    if (VMODE !== "vika") return top.replace("{RNG}", "") + tr(() => window.pfCalHTML(), "");
    const t = new Date(); t.setHours(12, 0, 0, 0); t.setDate(t.getDate() - ((t.getDay() + 6) % 7) + VOFF * 7);
    const days = [...Array(5)].map((_, i) => { const x = new Date(t); x.setDate(t.getDate() + i); return iso(x); }), ti = iso(new Date());
    const f = new Date(days[0] + "T12:00:00"), l = new Date(days[4] + "T12:00:00"), rng = f.getDate() + "." + (f.getMonth() !== l.getMonth() ? " " + MN[f.getMonth()] : "") + "–" + l.getDate() + ". " + MN[l.getMonth()] + " " + l.getFullYear();
    const R = verkItems(days), SK = new Map(tr(() => STARFS(), []).map(x => [x.sk, x.nafn]));
    const chips = [["", "Allt"], ["afh", "Afhendingar og leiga"], ["skil", "Skil og verk"], ["frestur", "Frestir"]].map(([k, l2]) => `<button type="button" class="uchip${VF === k ? " on" : ""}" data-act="dverkf:${k}">${E(l2)}</button>`).join("");
    const card = it => { const [lab, c, bg] = VT[it.k], av = it.menn.map(sk => window.atrAv(sk)).join("");
      return `<div class="dvc" data-act="${E(it.go)}" role="button" tabindex="0" style="border-left-color:${c}"><span class="dvt" style="color:${c}">${E(lab)}${it.t ? " · " + E(it.t) : ""}</span><b>${E(it.txt)}</b>${it.sub ? `<small>${E(it.sub)}</small>` : ""}${av ? `<div class="dvavs">${av}</div>` : it.need ? `<span class="dvwarn">Enginn skráður · opna til að bóka</span>` : ""}</div>`; };
    const cols = days.map(d => { const x = new Date(d + "T12:00:00"), xs = (R.get(d) || []).filter(it => !VF || VGRP[it.k] === VF);
      return `<section class="dvcol${d === ti ? " dvtd" : ""}"><div class="dvh">${DN[x.getDay()]} ${x.getDate()}. ${MN[x.getMonth()]}</div>${xs.map(card).join("") || `<div class="dvempty">–</div>`}</section>`; }).join("");
    return top.replace("{RNG}", E(rng)) + `<div class="ulbar dvbar">${chips}<span class="m dvhint">Allt með dagsetningu í pöntunum, verkefnum, tilboðum og reikningum</span></div><div class="dvgrid">${cols}</div>`;
  }

  function act(k, r) {
    if (k === "dtwho") { WHO = r.join(":") || "me"; render(); return; }
    if (k === "dvny") { if (r[3]) bokForm(r[0], (r[1] || "09") + ":" + (r[2] || "00"), r.slice(3).join(":")); else vidbForm(r[0], (r[1] || "09") + ":" + (r[2] || "00")); return; }
    if (k === "dvid") { vidbForm(null, null, r[0]); return; }
    if (k === "dverk") { const n = +r[0]; VOFF = n === 0 ? 0 : VOFF + n; render(); return; }
    if (k === "dverkf") { VF = r[0] || ""; render(); return; }
    if (k === "dverkm") { VMODE = r[0] === "tl" ? "tl" : "vika"; render(); return; }
    if (k === "dteymi") { const n = +r[0]; OFF = n === 0 ? 0 : OFF + n; render(); return; }
    if (k === "dtbok") { const [d, em] = r; bokForm(d, "09:00", em || ""); return; }
  }
  Object.assign(window.ACT_EXT = window.ACT_EXT || {}, { dteymi: act, dtbok: act, dverkf: act, dverkm: act, dverk: act, dtwho: act, dvny: act, dvid: act });
  Object.assign(window.VIEWS_EXT = window.VIEWS_EXT || {}, { dteymi: view });
  const reg = () => { if (window.UI1V && !UI1V.dteymi) { UI1V.dteymi = view; UI1V.pndag = verkView; } };
  reg(); document.addEventListener("DOMContentLoaded", reg); setTimeout(reg, 0);

  const css = document.createElement("style");
  css.textContent = `
  .dtnav{display:flex;align-items:center;gap:6px}.dtnav .btn{min-height:36px;padding:0 12px}.dtrng{margin-left:8px;font-size:15px;white-space:nowrap}
  .dthint{margin:4px 0 10px}
  .dtleg{display:flex;flex-wrap:wrap;gap:14px;align-items:center;font-size:12.5px;color:var(--muted);margin:2px 0 12px}.dtleg span{display:inline-flex;align-items:center;gap:6px}.dtleg i{width:14px;height:10px;border-radius:3px;display:inline-block}.dtleg .dtlh{margin-left:auto}
  .dtgrid{padding:0;overflow:auto}
  .dtrow{display:grid;grid-template-columns:200px repeat(5,minmax(120px,1fr));border-top:1px solid var(--line);min-height:64px}
  .dtrow.dth{border-top:0;min-height:0;font-size:13px;color:var(--muted)}.dth>div{padding:10px 10px}
  .dtp{display:flex;align-items:center;gap:10px;padding:8px 12px;min-width:0}.dtn{font-size:13.5px;line-height:1.3;min-width:0}.dtn small{color:var(--muted)}
  .dtav{width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:var(--ui1side,#2B3138);color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center}
  .dtd,.dtc{border-left:1px solid var(--line)}.dtt{background:color-mix(in srgb,var(--hi,#24578A) 5%,transparent)}.dtd.dtt{color:var(--ink);font-weight:500}
  .dtc{position:relative;padding:6px 6px 22px;display:flex;flex-direction:column;gap:3px;min-width:0}
  .dti{display:block;font-size:11.5px;line-height:1.35;padding:2px 6px;border-radius:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink);text-decoration:none}
  .dti b{font-weight:600}
  .dti-f{background:color-mix(in srgb,var(--hi,#24578A) 14%,transparent)}.dti-o{background:color-mix(in srgb,var(--muted) 16%,transparent)}
  .dti-v{background:var(--ui1side,#2B3138);color:#fff}.dti-p{background:#FFF1D6;color:#7A4E00}.dti-s{background:#FCE8E6;color:#8C2B21}.dti-t{background:transparent;color:var(--muted);padding-left:0}
  .dtleg .dti-f,.dtleg .dti-o,.dtleg .dti-v,.dtleg .dti-p,.dtleg .dti-s{padding:0}
  .dtmore{font-size:11px;color:var(--muted);padding:0 6px}
  .dtadd{position:absolute;right:4px;bottom:3px;width:22px;height:18px;border:1px dashed var(--line);border-radius:5px;background:transparent;color:var(--muted);font:500 13px/1 inherit;cursor:pointer;opacity:0}
  .dtc:hover .dtadd,.dtadd:focus{opacity:1}.dtadd:hover{border-style:solid;color:var(--ink)}
  @media (hover:none){.dtadd{opacity:.7}}
  #vbf .smopt input[type=radio]{appearance:auto;-webkit-appearance:radio;width:18px;height:18px;min-height:0;flex:0 0 18px;margin:2px 0 0;padding:0;border:0;box-shadow:none;background:none}
  #vbf .smopt{display:flex;flex-direction:row;align-items:flex-start;gap:10px}#vbf .smopt span{display:flex;flex-direction:column;gap:2px;text-align:left}
  #vbf .smopt:has(input:checked){border-color:var(--kacc,#24578A);background:color-mix(in srgb,var(--kacc,#24578A) 6%,transparent)}
  .dtwho select{min-height:36px;border:1px solid var(--line2,var(--line));border-radius:8px;padding:0 10px;background:var(--surface);color:var(--ink);font:inherit;font-size:13.5px}
  .sr{position:absolute;left:-9999px}
  .dti-e{background:color-mix(in srgb,#7A5AB8 14%,transparent)}
  .dtfl{margin-left:12px;font-size:12.5px}
  .dwk{padding:0;overflow:hidden}
  .dwrow{display:grid;grid-template-columns:56px repeat(5,minmax(0,1fr))}
  .dwh>div{padding:10px 8px;font-size:13px;color:var(--muted);border-left:1px solid var(--line)}.dwh>div:first-child{border-left:0}.dwh .dtt{color:var(--ink);font-weight:500}
  .dwall{border-top:1px solid var(--line);min-height:30px}.dwlab{font-size:10.5px;color:var(--muted);padding:6px 4px;line-height:1.2}
  .dwa{border-left:1px solid var(--line);padding:4px;display:flex;flex-direction:column;gap:3px;min-width:0}
  .dwbody{position:relative;border-top:1px solid var(--line);overflow:hidden}
  .dwhrs{position:relative}.dwhrs span{position:absolute;right:8px;font-size:11px;color:var(--muted);transform:translateY(-6px)}
  .dwc{position:relative;border-left:1px solid var(--line);background:repeating-linear-gradient(180deg,transparent 0,transparent ${PXH - 1}px,var(--line) ${PXH - 1}px,var(--line) ${PXH}px)}
  .dwslot{position:absolute;left:0;right:0;border:0;background:transparent;cursor:pointer;padding:0}.dwslot:hover{background:color-mix(in srgb,var(--kacc,#24578A) 6%,transparent)}
  .dwe{position:absolute;left:4px;right:4px;border-radius:7px;padding:4px 8px;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;gap:1px;cursor:default;z-index:1}
  .dwe[role=button]{cursor:pointer}.dwe b{font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dwe small{font-size:11px;opacity:.8}
  .dwe-f{background:color-mix(in srgb,var(--kacc,#24578A) 14%,var(--surface));border-left:3px solid var(--kacc,#24578A)}
  .dwe-e{background:color-mix(in srgb,#7A5AB8 13%,var(--surface));border-left:3px solid #7A5AB8}
  .dwe-o{background:color-mix(in srgb,var(--muted) 16%,var(--surface));border-left:3px solid var(--muted)}
  .dwe-t{background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--muted) 10%,var(--surface)) 0 6px,color-mix(in srgb,var(--muted) 16%,var(--surface)) 6px 12px);color:var(--muted);z-index:0}
  .dtn,.dtfl{color:inherit;text-decoration:none}.dtn:hover,.dtfl:hover{text-decoration:underline}.dtfl{color:var(--kacc,#24578A)}
  .dtnav{flex-wrap:wrap;justify-content:flex-end}.dtwho select{max-width:180px}
  .dwe-p{background:#FFF1D6;color:#7A4E00;border-left:3px solid #B7791F}
  .dwnow{position:absolute;left:0;right:0;border-top:2px solid #C2410C;z-index:2;pointer-events:none}
  .dvm{display:inline-flex;margin-left:12px}.dvm button{border:0;background:transparent;padding:0 12px;min-height:34px;border-radius:8px;font:inherit;font-size:13.5px;color:var(--muted);cursor:pointer}.dvm button[aria-pressed="true"]{background:var(--surface,#fff);color:var(--ink);font-weight:500;box-shadow:0 1px 2px rgba(15,37,48,.1)}
  .dvbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px}.dvhint{margin-left:auto;font-size:12.5px;color:var(--muted)}
  .dvgrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;align-items:start}
  .dvcol{background:color-mix(in srgb,var(--line) 55%,transparent);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px;min-width:0;min-height:120px}
  .dvcol.dvtd{background:color-mix(in srgb,var(--hi,#24578A) 10%,transparent)}.dvcol.dvtd .dvh{color:var(--hi,#24578A);font-weight:600}
  .dvh{font-size:13.5px;padding:2px 4px 4px}.dvempty{color:var(--muted);font-size:12px;padding:4px}
  .dvc{background:var(--surface,#fff);border:1px solid var(--line);border-left:3px solid;border-radius:9px;padding:9px 11px;display:flex;flex-direction:column;gap:3px;cursor:pointer;min-width:0}
  .dvc:hover{box-shadow:0 2px 8px rgba(15,37,48,.08)}
  .dvt{font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
  .dvc b{font-weight:500;font-size:13.5px;line-height:1.3;overflow:hidden;text-overflow:ellipsis}.dvc small{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .atav{width:22px;height:22px;border-radius:50%;background:var(--ui1side,#2B3138);color:#fff;font-size:9px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;margin-left:-4px;border:2px solid var(--surface,#fff);cursor:default;position:relative}
  .atav.busy::after{content:"";position:absolute;right:-2px;bottom:-2px;width:7px;height:7px;border-radius:50%;background:#B7791F;border:1.5px solid var(--surface,#fff)}
  .atavs{display:inline-flex;padding-left:4px;vertical-align:middle}
  .dvavs{display:flex;padding-left:4px;margin-top:4px}.dvav{width:22px;height:22px;border-radius:50%;background:var(--ui1side,#2B3138);color:#fff;font-size:9px;display:inline-flex;align-items:center;justify-content:center;margin-left:-4px;border:2px solid var(--surface,#fff)}
  .dvwarn{margin-top:4px;align-self:flex-start;font-size:11px;color:#8A5A00;background:#FFF6E5;border:1px solid #F0D9A8;border-radius:5px;padding:1px 6px}
  @media (max-width:1023px){.dvgrid{grid-template-columns:minmax(0,1fr)}.dvhint{margin-left:0}}
  @media (max-width:1023px){.dtrow{grid-template-columns:120px repeat(5,minmax(96px,1fr))}.dtleg .dtlh{margin-left:0}}
  `;
  document.head.appendChild(css);
})();
