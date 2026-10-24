/* Líf (2.60.0): meira líf í útlitið án þess að breyta skipulagi.
   1 stórar tölur með merkingarlit og breytingu frá síðustu viku · 2 framvindustikur · 3 lifandi staða á Heim og stór klukka
   4 fjármálayfirlit (tekjur/útgjöld/hagnaður) á Heim og Reikningum · 5 smáhreyfing (tölur telja upp, spjöld birtast í röð)
   6 tómir skjáir með teikningu og hnapp · 7 tákn í síum · 8 mjúkur blár bjarmi á Heim og innskráningu · 9 litaðir grafafletir.
   Allt er skraut ofan á núverandi skjái (DOM eftir render) – engin ný gögn. Virðir „prefers-reduced-motion“. */
(function () {
  const tr = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = () => !matchMedia("(min-width:1024px)").matches;
  const fin = () => tr(() => ON("reikningar") && (!window.can || can("fjarmal")), false);
  const Hh = h => { const v = Math.round((+h || 0) * 10) / 10; return String(v).replace(".", ","); };
  const mkr = n => { const a = Math.abs(n); return a >= 1e6 ? (Math.round(n / 1e5) / 10).toLocaleString("de-DE") + " m.kr." : Math.round(n).toLocaleString("de-DE") + " kr."; };
  const iso = x => tr(() => isoDay(x), "");
  const svg = (p, w = 14) => `<svg class="lifi" viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

  /* ---------- 7. Tákn í síum ---------- */
  const I = {
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    tag: '<path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
    wrench: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.4 2.4-2.6-.6-.6-2.6z"/>',
    open: '<circle cx="12" cy="12" r="8"/>',
    check: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12.5l2.3 2.3 4.7-5"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    truck: '<path d="M3 7h11v8H3zM14 10h4l3 3v2h-7"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    coin: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5"/>',
    users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c.8-3.5 3.3-5 6-5s5.2 1.5 6 5M15 14.5c2.6 0 4.5 1.3 5.3 4"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    pause: '<circle cx="12" cy="12" r="8"/><path d="M10 9v6M14 9v6"/>',
    x: '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>'
  };
  const CHIP = [
    [/^(öll svið|allt|allir|allar|öll)\b/i, "grid"], [/^leiga|^búnaður/i, "box"], [/^sala|^vörur/i, "tag"], [/^þjónusta|^vinna/i, "wrench"],
    [/^(opnar|opin|opið|í gangi|virk)/i, "open"], [/^(greitt|lokið|lokin|lokuð|skilað|samþykkt|staðfest)/i, "check"], [/^(nýjar|ný|nýtt)\b/i, "spark"],
    [/^(afhentar|afhent|úti|sent)/i, "truck"], [/^(vika|2 vikur|mánuður|ár|dagur|í dag)$/i, "cal"], [/^eftir pöntunum/i, "list"], [/^eftir búnaði/i, "box"],
    [/^(óreikn|tímar|klst)/i, "clock"], [/^(óinnheimt|ógreitt|ógreidd|tekjur)/i, "coin"], [/^(seint|fram yfir|árekst|vantar)/i, "alert"],
    [/^(mín|mitt|ég)\b/i, "user"], [/^(teymi|starfsfólk|samstarfs)/i, "users"], [/^(drög|tilboð)/i, "doc"], [/^(í bið|bið)/i, "pause"], [/^(hafnað|ógilt)/i, "x"]
  ];
  function chipIcons(root) {
    root.querySelectorAll(".uchip:not([data-lif]), .pdseg button:not([data-lif]), .pfseg button:not([data-lif]), .ulbar .seg button:not([data-lif])").forEach(b => {
      b.dataset.lif = "1"; if (b.querySelector("svg")) return; const t = b.textContent.trim().split(" · ")[0];
      const m = CHIP.find(([re]) => re.test(t)); if (m) b.insertAdjacentHTML("afterbegin", svg(I[m[1]], 13));
    });
  }

  /* ---------- 1. Stórar tölur með merkingarlit ---------- */
  const TONE = [
    [/fram yfir|seint|seinar|árekst|vantar|tvíbók|tapað|týnt|skemmd|fram úr/i, "red"],
    [/nýjar|nýtt|bíð|óreikn|óinnheimt|drög|ógreidd|ógreitt|þarf að|reikningshæft|í bið/i, "amb"],
    [/greitt|lokið|skilað|tekjur|hagnað|samþykkt|nýting|tilbúið/i, "grn"]
  ];
  const isZero = v => /^(0|0,0|–|-|0 kr\.?|0 %|0 klst\.?|0 m\.kr\.)$/i.test(v.trim()) || /^0\s/.test(v.trim()) && !/\d/.test(v.trim().slice(1));
  function tones(root) {
    root.querySelectorAll(".ukp:not([data-lt]), .snjk:not([data-lt]), .kp:not([data-lt])").forEach(k => {
      const l = (k.querySelector("small")?.textContent || "").trim(), b = k.querySelector("b"); if (!b) return;
      const v = b.textContent.trim(); let t = (TONE.find(([re]) => re.test(l)) || [, "blu"])[1];
      if (k.classList.contains("warn")) t = "red";
      k.dataset.lt = isZero(v) ? "zero" : t; k.classList.add("lifk"); if (!/\d/.test(v)) k.classList.add("liftx");
    });
  }

  /* ---------- 5. Tölur telja upp ---------- */
  const parseNum = s => { const m = String(s).match(/^(\D*?)(\d{1,3}(?:\.\d{3})+|\d+)(,\d+)?(.*)$/s); if (!m) return null;
    const dec = m[3] ? m[3].length - 1 : 0, n = parseFloat(m[2].replace(/\./g, "") + (m[3] ? "." + m[3].slice(1) : "")); return { pre: m[1], n, dec, grp: m[2].includes("."), post: m[4] }; };
  const fmtNum = (x, p) => { let s = x.toFixed(p.dec); let [a, b] = s.split("."); if (p.grp || x >= 1e4 && p.grp) a = a.replace(/\B(?=(\d{3})+(?!\d))/g, "."); return p.pre + a + (b ? "," + b : "") + p.post; };
  function countUp(root) {
    if (RM()) return;
    root.querySelectorAll(".lifk b, .liffin .liftot b, .uwk > b").forEach(b => {
      if (b.dataset.lc || b.children.length) return; b.dataset.lc = "1"; const p = parseNum(b.textContent.trim()); if (!p || !p.n || p.n > 1e12) return;
      const t0 = performance.now(), D = 650, end = b.textContent;
      const step = now => { if (!b.isConnected) return; const q = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - q, 3); b.textContent = q < 1 ? fmtNum(p.n * e, p) : end; if (q < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  /* ---------- 5. Spjöld birtast í mjúkri röð ---------- */
  function stagger(root) {
    if (RM()) return;
    const els = root.querySelectorAll(":scope > * :is(.card,.ucard,.ukp,.snjk,.pdsd,.lifstrip):not([data-li])");
    let i = 0; els.forEach(el => { el.dataset.li = "1"; if (i > 14) return; el.style.setProperty("--li", i++); el.classList.add("lifin"); setTimeout(() => el.classList.remove("lifin"), 700 + i * 40); });
  }

  /* ---------- 6. Tómir skjáir ---------- */
  const EMPTY_ART = `<svg class="lifart" viewBox="0 0 120 80" width="120" height="80" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 46l40-20 40 20-40 20z" opacity=".35"/><path d="M20 46v10l40 20 40-20V46" opacity=".55"/><path d="M60 66v10"/>
    <path d="M44 34l16-8 16 8-16 8z" class="a"/><path d="M44 34v8l16 8 16-8v-8" class="a"/><path d="M60 42v8" class="a"/>
    <path d="M86 14v8M82 18h8M30 20v6M27 23h6" opacity=".5"/></svg>`;
  const ADD = { pantanir: ["pantanir", "+ Ný pöntun"], pnl: ["pantanir", "+ Ný pöntun"], pns: ["pantanir", "+ Ný pöntun"], pnt: ["pantanir", "+ Ný pöntun"], pndag: ["pantanir", "+ Ný pöntun"], pnyf: ["pantanir", "+ Ný pöntun"],
    verk: ["verk", "+ Nýtt verkefni"], verkefni: ["verk", "+ Nýtt verkefni"], ltilbod: ["ltilbod", "+ Nýtt tilboð"], stilbod: ["stilbod", "+ Nýtt tilboð"], tilbod: ["tilbod", "+ Nýtt tilboð"] };
  function empties(root) {
    root.querySelectorAll(".uempty:not([data-le]), .spempty:not([data-le])").forEach(el => {
      el.dataset.le = "1"; const inCard = !!el.closest(".card,.ucard,.udags,.snjc,.hcard") && !el.closest(".pdwrap");
      if (inCard) { el.classList.add("lifes"); el.insertAdjacentHTML("afterbegin", svg(I.check, 16)); return; }
      el.classList.add("life"); el.insertAdjacentHTML("afterbegin", EMPTY_ART);
      const a = ADD[tab]; if (a && tr(() => !!MCP, false) && el.classList.contains("uempty") && !el.querySelector("button")) el.insertAdjacentHTML("beforeend", `<div class="lifea"><button type="button" class="btn primary sm" data-act="fabnew:${a[0]}">${a[1]}</button></div>`);
    });
  }

  /* ---------- 2. Framvindustikur ---------- */
  const bar = (pc, label, tone = "") => `<div class="lifbar${tone ? " " + tone : ""}" role="progressbar" aria-valuenow="${Math.round(pc)}" aria-valuemin="0" aria-valuemax="100"><i style="--w:${Math.max(0, Math.min(100, pc))}%"><b>${Math.round(pc)}%</b></i>${label ? `<span>${label}</span>` : ""}</div>`;
  window.lifBar = bar;
  function bars(root) {
    // Tínslulisti: „X af Y“
    root.querySelectorAll(".pfpick .pfsh:not([data-lb])").forEach(h => { h.dataset.lb = "1"; const m = (h.querySelector("span")?.textContent || "").match(/(\d+) af (\d+)/); if (!m || !+m[2]) return;
      h.insertAdjacentHTML("afterend", bar(+m[1] / +m[2] * 100, "", +m[1] >= +m[2] ? "grn" : "")); });
    // Vikan þín: núverandi stika fær prósentu inni í sér
    root.querySelectorAll(".uwk + .ubar:not([data-lb])").forEach(u => { u.dataset.lb = "1"; const w = parseFloat(u.querySelector("i")?.style.width || "0"); u.outerHTML = bar(w, ""); });
  }
  // Verkefni: tímar á móti áætlun undir lykiltölum
  const hookVerk = () => { const o = window.u1VerkYfir; if (!o || o.__lif) return !!(o && o.__lif);
    window.u1VerkYfir = function (id) { let h = o.apply(this, arguments); const p = tr(() => findProj(id), null); if (!p || !(+p.aklst > 0)) return h;
      const t = +p.timar || 0, pc = t / p.aklst * 100, tone = pc > 100 ? "red" : pc >= 90 ? "amb" : "";
      const b = `<div class="lifprog">${bar(pc, `${Hh(t)} af ${Hh(p.aklst)} klst. · ${pc > 100 ? "komið fram úr áætlun" : Hh(Math.max(0, p.aklst - t)) + " klst. eftir"}`, tone)}</div>`;
      const i = h.indexOf('<div class="ukps">'); if (i < 0) return b + h; const j = h.indexOf("</div></div>", i); return j < 0 ? h + b : h.slice(0, j + 12) + b + h.slice(j + 12); };
    window.u1VerkYfir.__lif = 1; return true; };

  /* ---------- 3. Lifandi staða ---------- */
  function liveItems() {
    const t = iso(new Date()), now = new Date(), nm = now.getHours() * 60 + now.getMinutes(), out = [];
    const k = tr(() => klukka(), null);
    if (k) { const p = tr(() => findProj(k.pid), null); out.push({ c: "on", h: `Klukka í gangi <b class="kt" data-start="${E(k.start)}">${tr(() => elapsed(k), "")}</b>${p ? ` · ${E(p.nr)}` : ""}` }); }
    const hm = w => { const m = String(w || "").match(/T(\d\d):(\d\d)/); return m ? +m[1] * 60 + +m[2] : null; };
    const fu = tr(() => (S?.fundir || []).filter(f => String(f.date || "").slice(0, 10) === t), []);
    const nowF = fu.filter(f => { const a = hm(f.date), b = f.end ? hm(f.end) : a + 60; return a != null && nm >= a - 5 && nm <= b; });
    if (nowF.length) out.push({ c: "on", h: `${nowF.length === 1 ? "Fundur" : nowF.length + " fundir"} í gangi${nowF.length === 1 ? " · " + E(nowF[0].name || "") : ""}` });
    else { const nx = fu.map(f => ({ f, a: hm(f.date) })).filter(x => x.a != null && x.a > nm).sort((a, b) => a.a - b.a)[0];
      if (nx) out.push({ c: "", h: `Næsti fundur kl. ${String(Math.floor(nx.a / 60)).padStart(2, "0")}:${String(nx.a % 60).padStart(2, "0")} · ${E(nx.f.name || "")}` }); }
    const PN = tr(() => window.salaAPI.PN(), []);
    if (PN.length) {
      const ut = PN.filter(P => String(P.fra || "").slice(0, 10) === t && ["Ný", "Staðfest"].includes(P.stada)).length;
      const inn = PN.filter(P => String(P.til || P.fra || "").slice(0, 10) === t && P.stada === "Afhent").length;
      const late = PN.filter(P => P.stada === "Afhent" && String(P.til || P.fra || "").slice(0, 10) < t).length;
      if (ut) out.push({ c: "blu", h: `<b>${ut}</b> ${ut === 1 ? "pöntun fer" : "pantanir fara"} út í dag`, a: "tab:pndag" });
      if (inn) out.push({ c: "amb", h: `<b>${inn}</b> ${inn === 1 ? "skil" : "skil"} í dag`, a: "tab:pndag" });
      if (late) out.push({ c: "red", h: `<b>${late}</b> ${late === 1 ? "pöntun komin" : "pantanir komnar"} fram yfir skil`, a: "tab:pndag" });
    }
    const F = tr(() => faerslur(), []), who = new Set(F.filter(e => e.date === t && (+e.timar || 0) > 0).map(e => e.starfsmadur || "")); if (k) who.add(tr(() => ME(), "")); who.delete("");
    if (who.size > 1) out.push({ c: "", h: `<b>${who.size}</b> hafa skráð tíma í dag` });
    return out;
  }
  function liveHTML() {
    const it = liveItems();
    if (!it.length) return `<div class="lifstrip calm"><span class="lifs"><i class="lifdot calm"></i>Rólegur dagur – ekkert í gangi í augnablikinu</span></div>`;
    return `<div class="lifstrip">${it.map(x => `<span class="lifs ${x.c}"${x.a ? ` data-act="${x.a}" role="button" tabindex="0"` : ""}><i class="lifdot ${x.c}"></i>${x.h}</span>`).join("")}</div>`;
  }
  function live(root) {
    if (tab !== "yfirlit" || DETAIL || root.querySelector(".lifstrip")) return;
    const h = root.querySelector(".uhead"), sd = root.querySelector(".sd");
    if (h && !phone()) h.insertAdjacentHTML("afterend", liveHTML()); else if (sd) sd.insertAdjacentHTML("afterbegin", liveHTML()); else if (h) h.insertAdjacentHTML("afterend", liveHTML());
  }
  // Vikan þín: breyting frá sama tíma í síðustu viku
  function trend(root) {
    const w = root.querySelector(".uwk:not([data-lw])"); if (!w) return; w.dataset.lw = "1";
    const me = tr(() => ME(), ""), F = tr(() => faerslur(), []), now = new Date(), mon = tr(() => mondayOf(now), now), dow = (now.getDay() + 6) % 7;
    const a = iso(mon), t = iso(now), lm = new Date(mon); lm.setDate(lm.getDate() - 7); const le = new Date(lm); le.setDate(lm.getDate() + dow);
    const mine = e => (e.starfsmadur || me) === me, hW = F.filter(e => mine(e) && e.date >= a && e.date <= t).reduce((s, e) => s + (+e.timar || 0), 0), hL = F.filter(e => mine(e) && e.date >= iso(lm) && e.date <= iso(le)).reduce((s, e) => s + (+e.timar || 0), 0);
    if (!hL && !hW) return; const pc = hL ? Math.round((hW - hL) / hL * 100) : 100, up = pc >= 0;
    w.insertAdjacentHTML("beforeend", pc === 0 ? `<span class="liftr"><small>Sama og á sama tíma í síðustu viku</small></span>` : `<span class="liftr ${up ? "t-grn" : "t-red"}">${up ? "▲" : "▼"} ${Math.abs(pc)}% <small>frá sama tíma í síðustu viku</small></span>`);
  }

  /* ---------- 4 + 9. Fjármálayfirlit ---------- */
  const FP = window.__lifFin = window.__lifFin || { p: "man" };
  function finData(per, off = 0) {
    const now = new Date(); let a, b;
    if (per === "vika") { a = tr(() => mondayOf(now), now); a = new Date(a); a.setDate(a.getDate() + 7 * off); b = new Date(a); b.setDate(a.getDate() + 6); }
    else if (per === "ar") { a = new Date(now.getFullYear() + off, 0, 1); b = new Date(now.getFullYear() + off, 11, 31); }
    else { a = new Date(now.getFullYear(), now.getMonth() + off, 1); b = new Date(now.getFullYear(), now.getMonth() + off + 1, 0); }
    const A = iso(a), B = iso(b), inR = x => { const s = String(x || "").slice(0, 10); return s >= A && s <= B; };
    const tek = (S?.reikningar || []).filter(r => r.stada !== "Ógilt" && inR(r.dags)).reduce((s, r) => s + (+r.net || 0), 0);
    const utg = (S?.kostnadur || []).filter(k => inR(k.date)).reduce((s, k) => s + (+k.upphaed || 0), 0);
    return { tek, utg, hag: tek - utg };
  }
  function finHTML() {
    const p = FP.p, c = finData(p), l = finData(p, -1), mx = Math.max(1, c.tek, c.utg, Math.abs(c.hag));
    const PL = { vika: "Vikan", man: "Mánuðurinn", ar: "Árið" }, PREV = { vika: "síðustu viku", man: "síðasta mánuði", ar: "síðasta ári" };
    const dl = l.tek ? Math.round((c.tek - l.tek) / l.tek * 100) : null;
    const col = (k, lab, v) => `<div class="liftot ${k}"><small><i></i>${lab}</small><b>${mkr(v)}</b></div>`;
    const bcol = (k, v) => `<div class="lifcol ${k}"><i style="--h:${Math.max(v > 0 ? 3 : 0, Math.abs(v) / mx * 100)}%"></i></div>`;
    return `<section class="card ucard liffin"><div class="uhch"><h3>Fjármálayfirlit</h3><div class="pfseg lifseg" role="group">${[["vika", "Vika"], ["man", "Mánuður"], ["ar", "Ár"]].map(([k, t]) => `<button type="button" data-lif-fin="${k}"${p === k ? ' aria-pressed="true"' : ""}>${t}</button>`).join("")}</div></div>
      <div class="liftots">${col("grn", "Tekjur", c.tek)}${col("red", "Útgjöld", c.utg)}${col("blu", "Hagnaður", c.hag)}</div>
      <div class="lifcols">${bcol("grn", c.tek)}${bcol("red", c.utg)}${bcol("blu" + (c.hag < 0 ? " neg" : ""), c.hag)}</div>
      <div class="lifcap">${PL[p]} til þessa · tekjur = reikningar án VSK, útgjöld = skráður kostnaður${dl != null ? ` · <span class="${dl >= 0 ? "t-grn" : "t-red"}">${dl >= 0 ? "▲" : "▼"} ${Math.abs(dl)}%</span> tekjur frá ${PREV[p]}` : ""}</div></section>`;
  }
  function finance(root) {
    if (!fin() || DETAIL || root.querySelector(".liffin")) return;
    if (tab === "yfirlit" && !phone()) { const t = root.querySelector(".uhtop"); if (t) t.insertAdjacentHTML("afterend", finHTML()); }
    if (tab === "trk" && !phone()) { const b = root.querySelector(".ulbar"); if (b) b.insertAdjacentHTML("afterend", `<div class="liffw">${finHTML()}</div>`); }
  }
  document.addEventListener("click", e => { const b = e.target.closest("[data-lif-fin]"); if (!b) return; e.preventDefault(); FP.p = b.dataset.lifFin;
    const s = b.closest(".liffin"); if (s) { s.outerHTML = finHTML(); const n = document.querySelector(".liffin"); n && countUp(n); } });

  /* ---------- 8. Bjarmi ---------- */
  function glow() { document.body.classList.toggle("lifglow", tab === "yfirlit" && !DETAIL); }

  /* ---------- Keyrsla eftir hverja teikningu ---------- */
  let lastKey = "";
  function decorate() {
    const v = document.getElementById("view"); if (!v) return;
    glow();
    [live, finance, tones, chipIcons, empties, bars, trend].forEach(f => tr(() => f(v)));
    const key = tab + "|" + (DETAIL || ""); if (key !== lastKey) { lastKey = key; tr(() => stagger(v)); tr(() => countUp(v)); }
  }
  window.lifDecorate = decorate;
  const wrap = () => { if (typeof render !== "function") return false; if (render.__lif) return true;
    const o = render; render = function () { const r = o.apply(this, arguments); tr(decorate); return r; }; render.__lif = 1; try { window.render = render; } catch (e) {} return true; };
  if (!wrap()) { const iv = setInterval(() => { if (wrap()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }
  // Lifandi staða: klukkan tifar
  setInterval(() => { const k = tr(() => klukka(), null); if (!k) return; document.querySelectorAll(".lifstrip .kt").forEach(b => { b.textContent = tr(() => elapsed(k), b.textContent); }); }, 1000);
  // Hlutar sem teiknast utan render (t.d. skanni, spjöld): fylgjumst með #view
  const mo = new MutationObserver(() => { clearTimeout(mo.t); mo.t = setTimeout(() => { const v = document.getElementById("view"); if (v) [tones, chipIcons, empties, bars].forEach(f => tr(() => f(v))); }, 60); });
  const startMO = () => { const v = document.getElementById("view"); if (!v) return false; mo.observe(v, { childList: true, subtree: true }); return true; };
  if (!startMO()) document.addEventListener("DOMContentLoaded", startMO);
})();
