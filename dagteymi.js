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
  function atridi(p, days) {
    const R = new Map(days.map(d => [d, []])), put = (d, it) => { if (R.has(d)) R.get(d).push(it); };
    const a = days[0], b = days[days.length - 1];
    // Fundir í Atrium – aðeins þeir sem viðkomandi stofnaði eða er boðaður á (eldri fundir án skráningar sleppa)
    (S?.fundir || []).forEach(f => { if (!f.date) return; const d = String(f.date).slice(0, 10); if (d < a || d > b) return;
      const att = tr(() => fbAtt(f), []);
      if (!f.stofnandi && !att.length) { const v = f.projectId && tr(() => findProj(f.projectId), null); if (!v || !p.sk || !(v.starfsmenn || []).includes(p.sk)) return; } // eldri fundir: starfsfólk verkefnisins
      else if (!p.email || !tr(() => fundFor(f, p.email), false)) return;
      put(d, { k: "f", t: hm(f.date), e: hm(f.dateEnd), txt: f.name || "Fundur", open: "fund:" + f.id }); });
    // Outlook (deilt dagatal samstarfsfólks; eigin dagatal fyrir notandann sjálfan)
    tr(() => (window.fbTeamEv ? fbTeamEv(p.email) : []), []).forEach(e => { const d = e.s.slice(0, 10); if (d < a || d > b) return;
      if ((R.get(d) || []).some(x => x.k === "f" && x.t === hm(e.s) && lc(x.txt) === lc(e.t))) return;
      put(d, { k: "o", t: e.allDay ? "" : hm(e.s), e: e.allDay ? "" : hm(e.e), txt: e.t || "Upptekin" }); });
    // Verkefni sem viðkomandi er á og standa yfir
    tr(() => verkD(), []).forEach(v => { if (!p.sk || !(v.starfsmenn || []).includes(p.sk) || !v.timabilFra) return; const f0 = String(v.timabilFra).slice(0, 10), t0 = String(v.timabilTil || v.timabilFra).slice(0, 10);
      days.forEach(d => { if (d >= f0 && d <= t0) put(d, { k: "v", t: "", txt: (v.nr ? v.nr + " " : "") + (v.stutt || ""), open: "verk:" + v.id }); }); });
    // Skil verkefna og undirverka sem viðkomandi er á
    tr(() => verkD(), []).forEach(v => { if (!p.sk || !(v.starfsmenn || []).includes(p.sk)) return;
      if (v.skiladagur && !tr(() => isDone(v), false)) put(String(v.skiladagur).slice(0, 10), { k: "s", t: "", txt: "Skil " + (v.nr || "") + " " + (v.stutt || ""), open: "verk:" + v.id });
      (v.undirverk || []).forEach(u => { if (u.skiladagur && u.stada !== "Done" && (!u.abyrgd || u.abyrgd === p.sk)) put(String(u.skiladagur).slice(0, 10), { k: "s", t: "", txt: "Skil " + (u.nr || "") + " " + (u.heiti || u.nafn || ""), open: "sub:" + u.id }); }); });
    // Skráðir tímar (liðnir dagar og í dag): hvar viðkomandi vann, klst. á verkefni
    { const ti = iso(new Date()), sum = new Map();
      tr(() => S.timar.faerslur, []).forEach(e => { const d = String(e.date || "").slice(0, 10); if (d < a || d > b || d > ti || (e.starfsmadur || e.sk) !== p.sk) return; const k = d + "|" + (e.verkefniId || ""); sum.set(k, (sum.get(k) || 0) + (+e.timar || 0)); });
      sum.forEach((h, k) => { const [d, pid] = k.split("|"), v = pid && tr(() => findProj(pid), null); put(d, { k: "t", t: "", txt: (Math.round(h * 10) / 10).toString().replace(".", ",") + " klst. · " + (v ? (v.nr || "") + " " + (v.stutt || "") : "án verkefnis"), open: v ? "verk:" + v.id : "" }); }); }
    // Pantanir: afhending og skil
    tr(() => window.salaAPI.PN(), []).forEach(P => { if (!p.sk || !(P.starfsmenn || []).includes(p.sk) || ["Skilað", "Lokið"].includes(P.stada)) return;
      const f0 = String(P.fra || "").slice(0, 10), t0 = String(P.til || "").slice(0, 10);
      if (f0) put(f0, { k: "p", t: hm(P.fra), txt: "Afhending " + (P.nr || ""), open: "tb:" + P.id });
      if (t0 && t0 !== f0) put(t0, { k: "p", t: hm(P.til), txt: "Skil " + (P.nr || ""), open: "tb:" + P.id }); });
    const RO = { f: 0, o: 0, p: 0, v: 1, s: 1, t: 2 };
    R.forEach(xs => xs.sort((x, y) => RO[x.k] - RO[y.k] || String(x.t).localeCompare(String(y.t))));
    return R;
  }

  function view() {
    try { window.fbTeamLoad && fbTeamLoad(); } catch (e) {}
    const m = monday(), days = [...Array(5)].map((_, i) => { const x = new Date(m); x.setDate(m.getDate() + i); return iso(x); });
    const ti = iso(new Date()), P = folk(), me = lc(tr(() => fbMe(), ""));
    const lbl = d => { const x = new Date(d + "T12:00:00"); return DN[x.getDay()] + " " + x.getDate() + "."; };
    const f = new Date(days[0] + "T12:00:00"), l = new Date(days[4] + "T12:00:00");
    const rng = f.getDate() + "." + (f.getMonth() !== l.getMonth() ? " " + MN[f.getMonth()] : "") + "–" + l.getDate() + ". " + MN[l.getMonth()] + " " + l.getFullYear();
    const hdr = `<div class="uhead"><div><div class="spsup">Dagatal</div><h2 class="ptitle">Teymi</h2></div><div class="uhr dtnav"><button type="button" class="btn" data-act="dteymi:-1" aria-label="Fyrri vika">‹</button><button type="button" class="btn" data-act="dteymi:0">Þessi vika</button><button type="button" class="btn" data-act="dteymi:1" aria-label="Næsta vika">›</button><span class="dtrng">${E(rng)}</span></div></div>`;
    const msTxt = tr(() => window.fbCalOk && fbCalOk(), false) ? "" : `<p class="hint dthint">Fundir og verk úr Atrium. Tengdu Microsoft 365 til að sjá líka Outlook-dagatöl samstarfsfólks.</p>`;
    const head = `<div class="dtrow dth"><div class="dtp">Starfsfólk · ${P.length}</div>${days.map(d => `<div class="dtd${d === ti ? " dtt" : ""}">${E(lbl(d))}</div>`).join("")}</div>`;
    const rows = P.map(p => { const R = atridi(p, days), ini = (p.sk || p.nafn.split(/\s+/).map(w => w[0] || "").join("")).slice(0, 2).toUpperCase();
      return `<div class="dtrow"><div class="dtp"><span class="dtav">${E(ini)}</span><span class="dtn">${E(p.nafn)}${p.email && p.email === me ? " <small>(þú)</small>" : ""}</span></div>${days.map(d => { const xs = R.get(d) || [];
        return `<div class="dtc${d === ti ? " dtt" : ""}">${xs.slice(0, 4).map(x => `<${x.open ? `a href="#" data-open="${E(x.open)}"` : "span"} class="dti dti-${x.k}" title="${E((x.t ? x.t + (x.e ? "–" + x.e : "") + " " : "") + x.txt)}">${x.t ? `<b>${E(x.t)}</b> ` : ""}${E(x.txt)}</${x.open ? "a" : "span"}>`).join("")}${xs.length > 4 ? `<span class="dtmore">+${xs.length - 4}</span>` : ""}${tr(() => MCP, true) ? `<button type="button" class="dtadd" data-act="dtbok:${E(d)}:${E(p.email || "")}" aria-label="Bóka ${E(p.nafn)} ${E(lbl(d))}">+</button>` : ""}</div>`; }).join("")}</div>`; }).join("");
    const leg = `<div class="dtleg"><span><i class="dti-f"></i>Fundur í Atrium</span><span><i class="dti-o"></i>Outlook</span><span><i class="dti-v"></i>Verkefni</span><span><i class="dti-p"></i>Afhending / skil pöntunar</span><span><i class="dti-s"></i>Skiladagur</span><span>· Skráðir tímar</span><span class="dtlh">„+“ bókar viðkomandi – Atrium varar við ef hann er upptekinn</span></div>`;
    return hdr + msTxt + leg + `<div class="card dtgrid">${head}${rows || `<div class="empty">Ekkert starfsfólk skráð.</div>`}</div>`;
  }

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
      (v.undirverk || []).forEach(u => { if (u.skiladagur && u.stada !== "Done") put(u.skiladagur, { k: "skil", t: "", txt: (u.nr || "") + " " + (u.heiti || u.nafn || ""), sub: nm, menn: u.abyrgd ? [u.abyrgd] : [], go: "u1go:verk:sub:" + u.id }); }); });
    tr(() => window.salaAPI.TB(), []).forEach(T => { if (T.stada === "Sent" && T.gildir) put(T.gildir, { k: "frestur", t: "", txt: "Tilboð " + (T.nr || "") + " rennur út", sub: T.vidskiptavinur || "", menn: [], go: "u1go:ltilbod:tb:" + T.id }); });
    if (tr(() => can("fjarmal"), false)) (S?.reikningar || []).forEach(r => { if (r.gjalddagi && !["Greitt", "Ógilt"].includes(r.stada) && r.nr) put(r.gjalddagi, { k: "gjd", t: "", txt: "Reikningur " + r.nr, sub: r.kaupandi?.name || "", menn: [], go: "u1go:trk:reikn:" + r.id }); });
    R.forEach(xs => xs.sort((a, b) => String(a.t || "99").localeCompare(String(b.t || "99"))));
    return R;
  }
  function verkView() {
    const top = `<div class="uhead"><div><div class="spsup">Dagatal</div><h2 class="ptitle">Verk</h2></div><div class="uhr dtnav">${VMODE === "vika" ? `<button type="button" class="btn" data-act="dverk:-1" aria-label="Fyrri vika">‹</button><button type="button" class="btn" data-act="dverk:0">Þessi vika</button><button type="button" class="btn" data-act="dverk:1" aria-label="Næsta vika">›</button>` : ""}<span class="dtrng">${VMODE === "vika" ? "{RNG}" : ""}</span><span class="seg dvm"><button type="button" data-act="dverkm:vika" aria-pressed="${VMODE === "vika"}">Vika</button><button type="button" data-act="dverkm:tl" aria-pressed="${VMODE !== "vika"}">Tímalína</button></span></div></div>`;
    if (VMODE !== "vika") return top.replace("{RNG}", "") + tr(() => window.pfCalHTML(), "");
    const t = new Date(); t.setHours(12, 0, 0, 0); t.setDate(t.getDate() - ((t.getDay() + 6) % 7) + VOFF * 7);
    const days = [...Array(5)].map((_, i) => { const x = new Date(t); x.setDate(t.getDate() + i); return iso(x); }), ti = iso(new Date());
    const f = new Date(days[0] + "T12:00:00"), l = new Date(days[4] + "T12:00:00"), rng = f.getDate() + "." + (f.getMonth() !== l.getMonth() ? " " + MN[f.getMonth()] : "") + "–" + l.getDate() + ". " + MN[l.getMonth()] + " " + l.getFullYear();
    const R = verkItems(days), SK = new Map(tr(() => STARFS(), []).map(x => [x.sk, x.nafn]));
    const chips = [["", "Allt"], ["afh", "Afhendingar og leiga"], ["skil", "Skil og verk"], ["frestur", "Frestir"]].map(([k, l2]) => `<button type="button" class="uchip${VF === k ? " on" : ""}" data-act="dverkf:${k}">${E(l2)}</button>`).join("");
    const card = it => { const [lab, c, bg] = VT[it.k], av = it.menn.map(sk => `<span class="dvav" title="${E(SK.get(sk) || sk)}">${E(String(sk).slice(0, 2))}</span>`).join("");
      return `<div class="dvc" data-act="${E(it.go)}" role="button" tabindex="0" style="border-left-color:${c}"><span class="dvt" style="color:${c}">${E(lab)}${it.t ? " · " + E(it.t) : ""}</span><b>${E(it.txt)}</b>${it.sub ? `<small>${E(it.sub)}</small>` : ""}${av ? `<div class="dvavs">${av}</div>` : it.need ? `<span class="dvwarn">Enginn skráður · opna til að bóka</span>` : ""}</div>`; };
    const cols = days.map(d => { const x = new Date(d + "T12:00:00"), xs = (R.get(d) || []).filter(it => !VF || VGRP[it.k] === VF);
      return `<section class="dvcol${d === ti ? " dvtd" : ""}"><div class="dvh">${DN[x.getDay()]} ${x.getDate()}. ${MN[x.getMonth()]}</div>${xs.map(card).join("") || `<div class="dvempty">–</div>`}</section>`; }).join("");
    return top.replace("{RNG}", E(rng)) + `<div class="ulbar dvbar">${chips}<span class="m dvhint">Allt með dagsetningu í pöntunum, verkefnum, tilboðum og reikningum</span></div><div class="dvgrid">${cols}</div>`;
  }

  function act(k, r) {
    if (k === "dverk") { const n = +r[0]; VOFF = n === 0 ? 0 : VOFF + n; render(); return; }
    if (k === "dverkf") { VF = r[0] || ""; render(); return; }
    if (k === "dverkm") { VMODE = r[0] === "tl" ? "tl" : "vika"; render(); return; }
    if (k === "dteymi") { const n = +r[0]; OFF = n === 0 ? 0 : OFF + n; render(); return; }
    if (k === "dtbok") { const [d, em] = r; window.kind = "fund"; try { kind = "fund"; } catch (e) {} window.PREFILL = { date: d }; try { PREFILL = { date: d }; } catch (e) {} openSheet();
      setTimeout(() => { const q = document.getElementById("f-attq"); if (q && em && em !== lc(tr(() => fbMe(), ""))) { q.value = em; q.dispatchEvent(new Event("input", { bubbles: true })); q.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); }
        const t = document.getElementById("f-time"); if (t && !t.value) t.focus(); }, 60); }
  }
  Object.assign(window.ACT_EXT = window.ACT_EXT || {}, { dteymi: act, dtbok: act, dverkf: act, dverkm: act, dverk: act });
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
  .dvavs{display:flex;padding-left:4px;margin-top:4px}.dvav{width:22px;height:22px;border-radius:50%;background:var(--ui1side,#2B3138);color:#fff;font-size:9px;display:inline-flex;align-items:center;justify-content:center;margin-left:-4px;border:2px solid var(--surface,#fff)}
  .dvwarn{margin-top:4px;align-self:flex-start;font-size:11px;color:#8A5A00;background:#FFF6E5;border:1px solid #F0D9A8;border-radius:5px;padding:1px 6px}
  @media (max-width:1023px){.dvgrid{grid-template-columns:minmax(0,1fr)}.dvhint{margin-left:0}}
  @media (max-width:1023px){.dtrow{grid-template-columns:120px repeat(5,minmax(96px,1fr))}.dtleg .dtlh{margin-left:0}}
  `;
  document.head.appendChild(css);
})();
