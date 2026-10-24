/* Snjall-Heim (2.53.0, eining „snjall“, sjálfgefið óvirk – fyrst í dev/).
   Fimm hlutar á Heim (tölva: Heim › Yfirlit, sími: Í dag):
   1. Loka deginum – drög að tímaskráningu dagsins úr því sem gerðist (fundir, athugasemdir á verkefnum, QR-skannanir); staðfest í einu.
   2. Viðvaranir – verkefni sem stefna yfir áætlun, tvíbókaður búnaður, óstaðfestar afhendingar, skil án tíma.
   5. Hver er hvar – staða teymisins í dag (klukka, fundur, afhending, síðasta skráning).
   6. Skipanalína – „2 tímar á Hótel Lind í gær – teikningar“ verður skráning sem þú staðfestir.
   7. Rekstrarpúls (fjármál) – óinnheimt, reikningshæft, nýting teymis og búnaðar, „Vikan í tölum“ til að afrita.
   Les eingöngu gögn sem eru þegar í appinu; engin ný söfn. */
(function () {
  if (window.__snjall) return; window.__snjall = 1;
  const on = () => { try { return typeof ON === "function" && ON("snjall"); } catch (e) { return false; } };
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const tr = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const phone = () => !matchMedia("(min-width:1024px)").matches;
  const pad2 = n => String(n).padStart(2, "0");
  const iso = x => tr(() => isoDay(x), "");
  const T = () => iso(new Date());
  const isN = x => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const H = n => { const v = Math.round((+n || 0) * 10) / 10, [a, b] = String(Math.abs(v)).split("."); return (v < 0 ? "−" : "") + isN(a) + (b ? "," + b : ""); };
  const mkr = n => (n >= 1e6 ? H(Math.round(n / 1e5) / 10) + " m.kr." : isN(Math.round(n / 1000)) + " þ.kr.");
  const hm = w => { const m = String(w || "").match(/T(\d\d:\d\d)/) || String(w || "").match(/^(\d\d:\d\d)$/); return m ? m[1] : ""; };
  const toMin = s => { const [h, m] = String(s).split(":").map(Number); return h * 60 + (m || 0); };
  const fromMin = n => pad2(Math.floor(((n % 1440) + 1440) % 1440 / 60)) + ":" + pad2(((n % 60) + 60) % 60);
  const fold = x => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ð/g, "d").replace(/þ/g, "th").replace(/æ/g, "ae").replace(/ö/g, "o");
  const me = () => tr(() => ME(), "");
  const PN = () => tr(() => window.salaAPI.PN(), []) || [];
  const VR = () => tr(() => window.salaAPI.VR(), []) || [];
  const active = () => tr(() => verkefni().filter(p => !isDone(p)), []);
  const staffName = sk => tr(() => (STARFS().find(x => x.sk === sk) || {}).nafn, "") || sk;
  const DN = ["sun", "mán", "þri", "mið", "fim", "fös", "lau"];
  /* ---------- Stillingar (2.54.0): sjálfgefið < fyrirtækið (S.stillingar.heim) < notandinn (notandi/{netfang}.snjall) ---------- */
  const DEF = { hlutar: ["cmd", "loka", "vidv", "hver", "pulse"], fela: [], vidv: { yfir: 105, tvib: 14, ostad: 2, skil: 3, af: [] }, loka: { af: [] } };
  const HL = { cmd: ["Skipanalína", "Skráðu í mæltu máli, t.d. „2 tímar á Hótel Lind í gær – teikningar“"], loka: ["Loka deginum", "Drög að tímaskráningu dagsins úr fundum, skönnunum og athugasemdum"],
    vidv: ["Viðvaranir", "Yfir áætlun, tvíbókaður búnaður, óstaðfestar afhendingar og skil án tíma"], hver: ["Hver er hvar", "Staða teymisins í dag – aðeins í tölvu"], pulse: ["Rekstrarpúls", "Óinnheimt, reikningshæft, nýting – aðeins með fjármálaaðgang, í tölvu"] };
  const VT = { yfir: "Verkefni yfir eða stefnir yfir áætlun", tvib: "Tvíbókaður búnaður", ostad: "Óstaðfest afhending", skil: "Skil nálgast og enginn tími skráður" };
  const LT = { fund: "Fundir dagsins", qr: "QR-skannanir (afhending og móttaka)", ath: "Athugasemdir á verkefnum", m365: "Outlook, Teams og SharePoint (krefst Blaze)" };
  const LSK = "snj-pref:" + tr(() => ORG.lsForskeyti, "");
  let UP = tr(() => JSON.parse(localStorage.getItem(LSK) || "null"), null);
  const mrg = (a, b) => { const o = { ...a }; Object.entries(b || {}).forEach(([k, v]) => { o[k] = v && typeof v === "object" && !Array.isArray(v) ? mrg(a[k] || {}, v) : v; }); return o; };
  const coPref = () => tr(() => CFG().heim, null) || {};
  const PR = () => mrg(mrg(DEF, coPref()), UP || {});
  const showPart = k => { const p = PR(); return !p.fela.includes(k); };
  const order = () => { const p = PR(), o = p.hlutar.filter(k => HL[k]); Object.keys(HL).forEach(k => { if (!o.includes(k)) o.push(k); }); return o; };
  const vOn = k => !PR().vidv.af.includes(k), lOn = k => !PR().loka.af.includes(k);
  // Samstilling við aðganginn: sama skjal og „Sérsníða Heim“ (notandi/{netfang}) – engin ný regla
  window.__snjPref = () => UP;
  window.snjFromDoc = d => { const v = d && d.snjall; if (v && JSON.stringify(v) !== JSON.stringify(UP)) { UP = v; try { localStorage.setItem(LSK, JSON.stringify(v)); } catch (e) {} if (typeof render === "function") render(); } };
  let sv = null;
  function saveUP(v) { UP = v; try { localStorage.setItem(LSK, JSON.stringify(v)); } catch (e) {} clearTimeout(sv); sv = setTimeout(() => { try { window.heimSaveDoc?.(); } catch (e) {} }, 400); render(); }
  function saveCo(v) { tr(() => saveSnapshot(s => { s.stillingar = s.stillingar || {}; s.stillingar.heim = v; }).then(() => toast?.("Sjálfgefið fyrir fyrirtækið vistað")), null); }

  const relD = s => { const x = new Date(String(s).slice(0, 10) + "T00:00:00"), n = Math.round((x - new Date(T() + "T00:00:00")) / 864e5); return n === 0 ? "í dag" : n === 1 ? "á morgun" : n === -1 ? "í gær" : DN[x.getDay()] + " " + x.getDate() + "."; };

  /* ---------- 2. Viðvaranir ---------- */
  function warnings() {
    const out = [], t = T(), now = new Date(), F = tr(() => faerslur(), []);
    // Tilboð sem viðskiptavinur hefur samþykkt með tengli og bíða staðfestingar starfsmanns (2.61.0)
    tr(() => window.salaAPI.TB(), []).filter(q => q.bidur && !["Samþykkt", "Hafnað"].includes(q.stada)).forEach(q => out.push({ lvl: 1, title: `${q.bidur.nafn || "Viðskiptavinur"} samþykkti tilboð ${q.nr} – staðfesta`, sub: `${q.heiti || ""}${q.vidskiptavinur ? " · " + q.vidskiptavinur : ""}`, open: "tb:" + q.id }));
    // Verkefni sem stefna yfir áætlun (hraði síðustu 14 daga)
    const d14 = iso(new Date(now.getTime() - 14 * 864e5));
    const V = PR().vidv, lim = (+V.yfir || 105) / 100;
    if (vOn("yfir")) active().filter(p => +p.aklst > 0).forEach(p => {
      const a = +p.aklst, r = +p.timar || 0;
      if (r > a) { out.push({ lvl: 2, title: `${p.nr} ${p.stutt || p.nafn || ""} er komið yfir áætlun`, sub: `${H(r)} af ${H(a)} klst. · ${Math.round(r / a * 100)} %`, open: "verk:" + p.id }); return; }
      const rate = F.filter(e => e.verkefniId === p.id && e.date >= d14 && e.date <= t).reduce((s, e) => s + (+e.timar || 0), 0) / 14;
      if (rate <= 0) return;
      const sk = p.skiladagur ? String(p.skiladagur).slice(0, 10) : "";
      if (sk && sk >= t) {
        const days = Math.max(0, Math.round((new Date(sk + "T00:00:00") - new Date(t + "T00:00:00")) / 864e5)), proj = r + rate * days;
        if (proj > a * lim) out.push({ lvl: 1, title: `${p.nr} ${p.stutt || p.nafn || ""} stefnir í ${Math.round(proj / a * 100)} % af áætlun`, sub: `Miðað við hraðann síðustu 2 vikur · ${H(r)} af ${H(a)} klst. · skil ${relD(sk)}`, open: "verk:" + p.id });
      } else {
        const left = (a - r) / rate;
        if (left < 10) out.push({ lvl: 1, title: `${p.nr} ${p.stutt || p.nafn || ""} fer yfir áætlun eftir ~${Math.max(1, Math.round(left))} daga`, sub: `${H(r)} af ${H(a)} klst. · ${H(rate * 7)} klst. á viku`, open: "verk:" + p.id });
      }
    });
    // Tvíbókaður búnaður (næstu 14 dagar)
    const P = PN().filter(x => ["Ný", "Staðfest", "Afhent"].includes(x.stada) && x.fra);
    if (vOn("tvib")) VR().forEach(v => {
      const N = (v.eintok || []).length || +v.fjoldi || 0; if (!N) return;
      for (let k = 0; k < (+V.tvib || 14); k++) {
        const day = iso(new Date(now.getTime() + k * 864e5));
        const used = P.reduce((s, x) => { const a = String(x.fra).slice(0, 10), b = String(x.til || x.fra).slice(0, 10); if (day < a || day > b) return s; return s + (x.linur || []).filter(l => String(l.v) === String(v.id)).reduce((q, l) => q + (+l.magn || 0), 0); }, 0);
        if (used > N) { const ps = P.filter(x => day >= String(x.fra).slice(0, 10) && day <= String(x.til || x.fra).slice(0, 10) && (x.linur || []).some(l => String(l.v) === String(v.id))).map(x => x.nr);
          out.push({ lvl: 2, title: `${v.nr || ""} ${v.heiti || ""} er tvíbókaður ${relD(day)}`, sub: `${used} bókuð af ${N} til · ${ps.join(", ")}`, open: "vara:" + v.id }); break; }
      }
    });
    // Afhending á næstu 2 dögum sem er ekki staðfest
    if (vOn("ostad")) P.filter(x => x.stada === "Ný").forEach(x => { const a = String(x.fra).slice(0, 10), n = (new Date(a + "T00:00:00") - new Date(t + "T00:00:00")) / 864e5;
      if (n >= 0 && n <= (+V.ostad || 2)) out.push({ lvl: 1, title: `${x.nr} ${x.heiti || ""} – afhending ${relD(a)} en pöntunin er ekki staðfest`, sub: x.tengilidur || x.vidskiptavinur || "", open: "tb:" + x.id }); });
    // Skil innan 3 daga og enginn tími skráður
    if (vOn("skil")) active().forEach(p => { const sk = p.skiladagur ? String(p.skiladagur).slice(0, 10) : ""; if (!sk || sk < t) return;
      const n = (new Date(sk + "T00:00:00") - new Date(t + "T00:00:00")) / 864e5;
      if (n <= (+V.skil || 3) && !(+p.timar > 0) && !F.some(e => e.verkefniId === p.id)) out.push({ lvl: 1, title: `${p.nr} ${p.stutt || p.nafn || ""} – skil ${relD(sk)} en enginn tími skráður`, sub: p.vidskiptavinur || "", open: "verk:" + p.id }); });
    return out.sort((a, b) => b.lvl - a.lvl);
  }

  /* ---------- 5. Hver er hvar ---------- */
  function team() {
    const t = T(), now = new Date(), nm = now.getHours() * 60 + now.getMinutes(), F = tr(() => faerslur(), []), mine = me();
    const funds = tr(() => (S?.fundir || []).filter(f => String(f.date || "").slice(0, 10) === t), []);
    return tr(() => STARFS(), []).map(s => {
      const st = [];
      if (s.sk === mine) { const k = tr(() => klukka(), null); if (k) { const p = tr(() => findProj(k.pid), null); st.push({ k: "on", t: `Klukka í gangi · ${p ? p.nr + " " + (p.stutt || "") : "almennt"}`, open: p ? "verk:" + p.id : "" }); } }
      funds.forEach(f => { const a = toMin(hm(f.date) || "00:00"), b = f.end ? toMin(hm(f.end)) : a + 60; const p = f.projectId ? tr(() => findProj(f.projectId), null) : null;
        const staff = p ? tr(() => projStaff(p), []) : null; if (staff && !staff.includes(s.sk)) return;
        if (nm >= a - 10 && nm <= b) st.push({ k: "fund", t: `Á fundi til ${fromMin(b)} · ${f.name || ""}`, open: "fund:" + f.id }); });
      PN().forEach(P => { const sc = P.skann || {}; if (sc.af !== s.sk) return;
        if (String(sc.utDags || "").slice(0, 10) === t) st.push({ k: "ut", t: `Afhenti ${P.nr} kl. ${hm(sc.utDags)} · ${P.heiti || ""}`, open: "tb:" + P.id });
        if (String(sc.innDags || "").slice(0, 10) === t) st.push({ k: "inn", t: `Tók á móti ${P.nr} kl. ${hm(sc.innDags)}`, open: "tb:" + P.id }); });
      const es = F.filter(e => (e.starfsmadur || mine) === s.sk && e.date === t && !e.live).sort((a, b) => String(b.til || b.fra || "").localeCompare(String(a.til || a.fra || "")));
      const h = es.reduce((a, e) => a + (+e.timar || 0), 0);
      if (es[0]) { const p = tr(() => findProj(es[0].verkefniId), null); st.push({ k: "last", t: `Síðast ${es[0].fra && es[0].til ? es[0].fra + "–" + es[0].til : ""} · ${p ? p.nr + " " + (p.stutt || "") : "almennt"}`, open: p ? "verk:" + p.id : "" }); }
      return { sk: s.sk, nafn: s.nafn || s.sk, h, st, eg: s.sk === mine };
    });
  }

  /* ---------- 7. Rekstrarpúls ---------- */
  function pulse() {
    if (!tr(() => can("fjarmal"), false)) return null;
    const o = tr(() => rkOinnheimt(), null), F = tr(() => faerslur(), []), now = new Date(), t = T();
    const mon = tr(() => mondayOf(now), now), m0 = iso(mon), lm = new Date(mon); lm.setDate(lm.getDate() - 7);
    const dow = Math.min(5, ((now.getDay() + 6) % 7) + 1), sameLast = new Date(lm); sameLast.setDate(lm.getDate() + dow - 1);
    const staff = Math.max(1, tr(() => STARFS().length, 1)), goal = +tr(() => CFG().vikumark, 40) || 40;
    const hW = F.filter(e => e.date >= m0 && e.date <= t).reduce((a, e) => a + (+e.timar || 0), 0);
    const hL = F.filter(e => e.date >= iso(lm) && e.date <= iso(sameLast)).reduce((a, e) => a + (+e.timar || 0), 0);
    const cap = goal * staff * dow / 5, nyt = cap ? hW / cap : 0, nytL = cap ? hL / cap : 0;
    const eint = VR().flatMap(v => v.eintok || []), uti = eint.filter(e => e.uti).length;
    const nyjar = PN().filter(x => x.stada === "Ný").length, afh = PN().filter(x => x.stada === "Afhent").length;
    return { oin: o?.tot || 0, ub: o?.ub || 0, ubH: o?.h || 0, og: o?.ogKr || 0, late: o?.lateKr || 0, hW, hL, nyt, nytL, eint: eint.length, uti, nyjar, afh, staff };
  }
  function pulseText(p) {
    const d = new Date();
    return [`Vikan í tölum – ${tr(() => ORG.nafn, "")} (${d.getDate()}.${d.getMonth() + 1}.)`,
      `• Tímar skráðir: ${H(p.hW)} klst. (${Math.round(p.nyt * 100)} % nýting, ${p.staff} starfsmenn)`,
      `• Reikningshæft núna: ${mkr(p.ub)} (${H(p.ubH)} klst.)`,
      `• Óinnheimt alls: ${mkr(p.oin)}${p.late ? ` – þar af ${mkr(p.late)} komið fram yfir gjalddaga` : ""}`,
      p.eint ? `• Búnaður úti: ${p.uti} af ${p.eint} eintökum (${Math.round(p.uti / p.eint * 100)} %)` : "",
      `• Pantanir: ${p.nyjar} nýjar · ${p.afh} úti`].filter(Boolean).join("\n");
  }

  /* ---------- 1. Loka deginum ---------- */
  function drafts(day) {
    day = day || T(); const mine = me(), F = tr(() => faerslur(), []).filter(e => (e.starfsmadur || mine) === mine && e.date === day && !e.live);
    const taken = F.filter(e => e.fra && e.til).map(e => [toMin(e.fra), toMin(e.til)]);
    const free = (a, b) => !taken.some(([x, y]) => a < y && b > x);
    const out = [];
    // Fundir dagsins á verkefnum sem ég er á (eða án verkefnis)
    if (lOn("fund")) tr(() => (S?.fundir || []), []).filter(f => String(f.date || "").slice(0, 10) === day && hm(f.date)).forEach(f => {
      const p = f.projectId ? tr(() => findProj(f.projectId), null) : null; if (p && !tr(() => projStaff(p), []).includes(mine)) return;
      const a = toMin(hm(f.date)), b = f.end && hm(f.end) ? toMin(hm(f.end)) : a + 60;
      if (free(a, b)) out.push({ src: "Fundur", pid: p?.id || "", fra: fromMin(a), til: fromMin(b), desc: f.name || "Fundur" });
    });
    // Afhendingar og móttaka með QR
    if (lOn("qr")) PN().forEach(P => { const sc = P.skann || {}; if (sc.af !== mine) return;
      [["ut", "Afhending"], ["inn", "Móttaka"]].forEach(([k, l]) => { const w = sc[k + "Dags"]; if (String(w || "").slice(0, 10) !== day) return;
        const b = toMin(hm(w)), a = b - 30; if (free(a, b)) out.push({ src: "QR-skönnun", pid: P.verkefniId || "", fra: fromMin(a), til: fromMin(b), desc: `${l} ${P.nr} ${P.heiti || ""}`.trim() }); }); });
    // Athugasemdir mínar á verkefnum í dag → vinna við verkefnið (frá fyrstu að síðustu, minnst 30 mín.)
    if (lOn("ath")) active().forEach(p => { const cs = (p.athugasemdir || []).filter(c => c.sk === mine && String(c.d || "").slice(0, 10) === day && hm(c.d)); if (!cs.length) return;
      const ts = cs.map(c => toMin(hm(c.d))).sort((x, y) => x - y), a = ts[0] - 30, b = Math.max(ts[ts.length - 1], a + 30);
      if (free(a, b)) out.push({ src: cs.length > 1 ? cs.length + " athugasemdir" : "Athugasemd", pid: p.id, fra: fromMin(a), til: fromMin(b), desc: String(cs[cs.length - 1].t || "Vinna við verkefnið").slice(0, 80) }); });
    // Tillögur úr Microsoft 365 (2.67.0): fundir í Outlook/Teams og vinna í skjölum á SharePoint – reiknað af Cloud Functions (tillogur/{netfang})
    if (lOn("m365")) (tr(() => window.__tillogur[day], []) || []).forEach(x => { if (!x.fra || !x.til) return; const a = toMin(x.fra), b = toMin(x.til);
      if (b > a && free(a, b) && !out.some(o => o.fra === x.fra)) out.push({ src: x.src || "Microsoft 365", pid: x.pid || "", fra: x.fra, til: x.til, desc: x.desc || "" }); });
    return out.sort((x, y) => x.fra.localeCompare(y.fra));
  }
  async function saveDrafts(list, day) {
    const mine = me();
    await saveSnapshot(s => { list.forEach(x => { const t = hoursBetween(x.fra, x.til), p = x.pid ? sFindP(s, x.pid) : null; if (p) p.timar = (p.timar || 0) + t;
      s.timar = s.timar || {}; s.timar.samtals = (s.timar.samtals || 0) + t; if (!s.timar.timabil || timabilOf(day) === s.timar.timabil) s.timar.timabilSamtals = (s.timar.timabilSamtals || 0) + t;
      sTimes(s).unshift({ id: newId(), date: day, lysing: lysFmt(day, x.desc, t), nr: p?.nr, verkefniId: x.pid || "", undirverkId: null, fra: x.fra, til: x.til, timar: t, starfsmadur: mine, timabil: timabilOf(day), taxti: null }); });
      const L = sTimes(s); L.sort((a, b) => String(b.date + (b.fra || "")).localeCompare(String(a.date + (a.fra || "")))); s.timar.nyjast = L.slice(0, 10); });
  }
  function closeDaySheet() {
    const day = T(), ds = drafts(day), ps = active();
    const opts = sel => `<option value="">Ekkert verkefni (almennt)</option>` + ps.map(p => `<option value="${E(p.id)}"${p.id === sel ? " selected" : ""}>${E(p.nr + " " + (p.stutt || p.nafn || ""))}</option>`).join("");
    const w = document.createElement("div"); w.className = "qrcard snjsheet"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", "Loka deginum");
    const done = tr(() => faerslur(), []).filter(e => (e.starfsmadur || me()) === me() && e.date === day && !e.live).reduce((a, e) => a + (+e.timar || 0), 0);
    w.innerHTML = `<div class="qrscrim" data-x="1"></div><form class="qrsheet snjform"><div class="grab" aria-hidden="true"></div>
      <div class="snjhd"><div><div class="qrsup">Loka deginum · ${H(done)} klst. skráðar í dag</div><h2>Tillögur að skráningu</h2></div><button type="button" class="qrx" data-x="1" aria-label="Loka">✕</button></div>
      ${ds.length ? `<p class="snjhint">Búið til úr fundum, QR-skönnunum og athugasemdum dagsins. Breyttu því sem þarf og hakaðu af því sem á ekki við.</p>
      <div class="snjds">${ds.map((x, i) => `<div class="snjd" data-i="${i}"><label class="snjck"><input type="checkbox" checked aria-label="Skrá"></label>
        <div class="snjdm"><div class="snjdr"><input class="snjt" data-k="fra" value="${E(x.fra)}" inputmode="decimal" maxlength="5" aria-label="Frá"><span>–</span><input class="snjt" data-k="til" value="${E(x.til)}" inputmode="decimal" maxlength="5" aria-label="Til"><small>${E(x.src)}</small></div>
        <input class="snjdesc" data-k="desc" value="${E(x.desc)}" aria-label="Lýsing"><select data-k="pid" aria-label="Verkefni">${opts(x.pid)}</select></div></div>`).join("")}</div>
      <div class="snjact"><button type="button" class="btn" data-x="1">Hætta við</button><button type="submit" class="btn primary">Skrá valið</button></div>`
      : `<p class="snjhint">Engar tillögur – ekkert ófært fannst í dag (fundir, QR-skannanir eða athugasemdir sem eru ekki þegar skráð).</p><div class="snjact"><button type="button" class="btn" data-x="1">Loka</button><button type="button" class="btn primary" data-snjnew="1">+ Skrá tíma</button></div>`}
    </form>`;
    document.body.append(w); document.body.classList.add("qropen");
    const close = () => { w.remove(); document.body.classList.remove("qropen"); };
    w.addEventListener("click", e => { if (e.target.closest("[data-x]")) close(); if (e.target.closest("[data-snjnew]")) { close(); kind = "tima"; PREFILL = { date: day }; openSheet(); } });
    w.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    w.querySelector("form").addEventListener("submit", async e => {
      e.preventDefault();
      const pick = [...w.querySelectorAll(".snjd")].filter(r => r.querySelector("input[type=checkbox]").checked).map(r => { const g = k => r.querySelector(`[data-k="${k}"]`).value.trim(); return { fra: g("fra"), til: g("til"), desc: g("desc") || "Vinna", pid: g("pid") }; })
        .filter(x => /^\d\d:\d\d$/.test(x.fra) && /^\d\d:\d\d$/.test(x.til));
      if (!pick.length) { close(); return; }
      const b = w.querySelector("button[type=submit]"); b.disabled = true; b.textContent = "Skrái…";
      try { await saveDrafts(pick, day); close(); toast?.(`Skráð: ${pick.length} ${pick.length === 1 ? "færsla" : "færslur"} · ${H(pick.reduce((a, x) => a + hoursBetween(x.fra, x.til), 0))} klst.`); render(); }
      catch (x) { b.disabled = false; b.textContent = "Skrá valið"; toast?.("Tókst ekki að vista: " + (x?.message || x)); }
    });
    setTimeout(() => w.querySelector("button[type=submit],.btn.primary")?.focus(), 50);
  }
  window.snjLokaDeginum = closeDaySheet;

  /* ---------- 6. Skipanalína ---------- */
  const MON = { jan: 0, feb: 1, mar: 2, apr: 3, mai: 4, jun: 5, jul: 6, agu: 7, sep: 8, okt: 9, nov: 10, des: 11 };
  const WD = [["sunnud", 0], ["manud", 1], ["thridjud", 2], ["midvikud", 3], ["fimmtud", 4], ["fostud", 5], ["laugard", 6]];
  const STOP = new Set(["a", "i", "vid", "fyrir", "med", "og", "um", "til", "fra", "kl", "klst", "klukkan", "timar", "tima", "timi", "tim", "klukkutimar", "klukkutima", "klukkustundir", "dag", "gaer", "fyrradag", "morgun", "nyr", "ny", "nytt", "nyja", "skra", "skradu"]);
  function parse(txt) {
    const raw = String(txt || "").trim(); if (!raw) return null;
    let f = " " + fold(raw) + " ", r = { kind: "tima", raw };
    const cut = re => { const m = f.match(re); if (m) f = f.replace(m[0], " "); return m; };
    if (/\bfund(ur|i|ar)?\b/.test(f)) r.kind = "fund"; else if (/\bpontun\b/.test(f)) r.kind = "pontun"; else if (/\bnytt verkefni\b|\bnytt verk\b/.test(f)) r.kind = "verk";
    const now = new Date(), base = new Date(now.getFullYear(), now.getMonth(), now.getDate()); let dt = null, m;
    if (cut(/\bi fyrradag\b/)) { dt = new Date(base); dt.setDate(dt.getDate() - 2); }
    else if (cut(/\bi gaer\b/)) { dt = new Date(base); dt.setDate(dt.getDate() - 1); }
    else if (cut(/\ba morgun\b/)) { dt = new Date(base); dt.setDate(dt.getDate() + 1); }
    else if (cut(/\bi dag\b/)) dt = new Date(base);
    else if ((m = cut(/\b(\d{1,2})\.\s*(\d{1,2})\.?(?:\s*(\d{4}))?(?=\s)/))) dt = new Date(+(m[3] || now.getFullYear()), +m[2] - 1, +m[1]);
    else if ((m = cut(/\b(\d{1,2})\.?\s*(jan|feb|mar|apr|mai|jun|jul|agu|sep|okt|nov|des)[a-z]*\b/))) dt = new Date(now.getFullYear(), MON[m[2]], +m[1]);
    else { for (const [w, n] of WD) { const mm = f.match(new RegExp("\\b(?:a |sidasta |sidasti )?" + w + "(?:ag|agur|egi|ur)?\\w*\\b")); if (mm) { f = f.replace(mm[0], " "); dt = new Date(base); let diff = (n - dt.getDay() + 7) % 7; if (r.kind === "tima") { diff = diff ? diff - 7 : 0; } dt.setDate(dt.getDate() + diff); break; } } }
    if ((m = cut(/\b(?:kl\.?\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*[-–]\s*(\d{1,2})(?:[:.](\d{2}))?\b/))) { if (+m[1] <= 24 && +m[3] <= 24) { r.fra = pad2(m[1]) + ":" + (m[2] || "00"); r.til = pad2(m[3]) + ":" + (m[4] || "00"); } }
    if ((m = cut(/\b(\d+(?:[.,]\d+)?)\s*(?:klst|klukkut\w*|klukkust\w*|tim\w*|t|h)\b/))) r.h = parseFloat(m[1].replace(",", "."));
    if (!r.fra && (m = cut(/\bkl\.?\s*(\d{1,2})(?:[:.](\d{2}))?\b/))) r.kl = pad2(m[1]) + ":" + (m[2] || "00");
    r.date = dt ? iso(dt) : T();
    // Verkefni: besta samsvörun á nr, heiti og viðskiptavin
    const words = f.split(/[^a-z0-9-]+/).filter(w => w.length >= 3 && !STOP.has(w));
    let best = null, bs = 0;
    active().forEach(p => { const hay = fold([p.nr, p.stutt, p.nafn, p.vidskiptavinur].join(" ")).split(/[^a-z0-9-]+/).filter(Boolean); let sc = 0; const used = [];
      words.forEach(w => { if (hay.some(h => h === w || (w.length >= 4 && h.length >= 4 && (h.startsWith(w.slice(0, Math.max(4, w.length - 2))) || w.startsWith(h.slice(0, Math.max(4, h.length - 2))))))) { sc += /\d/.test(w) ? 3 : 1; used.push(w); } });
      if (sc > bs) { bs = sc; best = { p, used }; } });
    if (best && bs >= 1) { r.p = best.p; best.used.forEach(w => { f = f.replace(new RegExp("\\b" + w + "\\b"), " "); }); }
    // Lýsing: það sem stendur eftir aðskilnaðarmerki, annars afgangurinn
    const sepI = raw.search(/\s[–—-]\s|:\s|,\s/);
    let desc = sepI >= 0 ? raw.slice(sepI).replace(/^\s*[–—\-:,]\s*/, "") : f.split(/\s+/).filter(w => w && !STOP.has(w) && !/^(fundur|fund|pontun|verkefni)$/.test(w)).join(" ");
    r.desc = desc.trim();
    if (r.kind === "tima" && !r.desc && r.p) r.desc = r.p.stutt || r.p.nafn || "";
    if (r.kind === "fund" && !r.desc) r.desc = r.p ? "Fundur · " + (r.p.stutt || r.p.nafn || "") : "";
    // Tímabil úr klst.: frá lokum síðustu færslu dagsins eða 09:00
    if (r.kind === "tima" && !r.fra && r.h) { const ends = tr(() => faerslur(), []).filter(e => (e.starfsmadur || me()) === me() && e.date === r.date && e.til && !e.live).map(e => toMin(e.til)); const a = ends.length ? Math.max(...ends) : 9 * 60; r.fra = fromMin(a); r.til = fromMin(a + Math.round(r.h * 60)); }
    if (r.fra && r.til && !r.h) r.h = tr(() => hoursBetween(r.fra, r.til), 0);
    return r;
  }
  function preview(r) {
    if (!r) return "";
    const K = { tima: "Tímaskráning", fund: "Nýr fundur", pontun: "Ný pöntun", verk: "Nýtt verkefni" }[r.kind];
    const bits = [`<b>${K}</b>`, r.p ? E(r.p.nr + " " + (r.p.stutt || r.p.nafn || "")) : (r.kind === "tima" ? "<i>ekkert verkefni fannst</i>" : ""), relD(r.date) + (r.fra ? ` ${r.fra}–${r.til}` : r.kl ? " kl. " + r.kl : ""), r.h ? H(r.h) + " klst." : "", r.desc ? "„" + E(r.desc) + "“" : ""].filter(Boolean);
    return bits.join(" · ") + ` <span class="snjenter">↵ Enter</span>`;
  }
  function run(r) {
    if (!r) return;
    if (r.kind === "pontun") { if (window.FAB_EXT?.pantanir) FAB_EXT.pantanir(); return; }
    kind = r.kind === "fund" ? "fund" : r.kind === "verk" ? "verk" : "tima";
    PREFILL = { date: r.date, pid: r.p?.id, desc: r.desc, fra: r.fra, til: r.til };
    openSheet();
    setTimeout(() => { const set = (id, v) => { const el = document.getElementById(id); if (el && v && !el.value) { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); } };
      if (kind === "fund") { set("f-name", r.desc); set("f-time", r.kl || r.fra); const pj = document.getElementById("f-proj"); if (pj && r.p) pj.value = r.p.id; }
      if (kind === "verk") set("f-name", r.desc);
      if (kind === "tima") { const el = document.getElementById("f-proj"); if (el && r.p && [...el.options].some(o => o.value === r.p.id)) { el.value = r.p.id; el.dispatchEvent(new Event("change", { bubbles: true })); } set("f-desc", r.desc); }
    }, 60);
  }
  const cmdHTML = () => `<div class="snjcmd"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 17l6-6-6-6M12 19h8"/></svg><input id="snjq" type="text" autocomplete="off" spellcheck="false" placeholder="${phone() ? "T.d. „2 tímar á Lind í gær – teikningar“" : "Skrifaðu t.d. „2 tímar á Hótel Lind í gær – teikningar“ eða „fundur á morgun kl. 10 Álfaborg“"}" aria-label="Skipanalína"><div class="snjpv" id="snjpv" aria-live="polite"></div></div>`;
  document.addEventListener("input", e => { if (e.target.id !== "snjq") return; const pv = document.getElementById("snjpv"); if (pv) pv.innerHTML = preview(parse(e.target.value)); });
  document.addEventListener("keydown", e => { if (e.target.id !== "snjq") return; if (e.key === "Enter") { e.preventDefault(); const r = parse(e.target.value); if (r) { e.target.value = ""; const pv = document.getElementById("snjpv"); if (pv) pv.innerHTML = ""; run(r); } } if (e.key === "Escape") { e.target.value = ""; e.target.blur(); } });
  window.snjParse = parse;

  /* ---------- Útlit ---------- */
  const rowH = (o, a, b, c, cls = "") => `<div class="snjr${cls}" ${o ? `data-open="${E(o)}" role="button" tabindex="0"` : ""}><span class="snjrt">${a}</span><span class="snjrx"><b>${E(b)}</b>${c ? `<small>${E(c)}</small>` : ""}</span></div>`;
  function bannerHTML() {
    const ds = drafts(); if (!ds.length) return "";
    const h = ds.reduce((a, x) => a + tr(() => hoursBetween(x.fra, x.til), 0), 0);
    return `<button type="button" class="snjban" onclick="snjLokaDeginum()"><span class="snjbi">✓</span><span class="snjbx"><b>Loka deginum</b><small>${ds.length} ${ds.length === 1 ? "tillaga" : "tillögur"} að skráningu · ${H(h)} klst.${phone() ? "" : " úr fundum, skönnunum og athugasemdum"}</small></span><span class="snjbg">Fara yfir →</span></button>`;
  }
  function warnHTML(max = 6) {
    const ws = warnings(); if (!ws.length) return `<section class="card ucard snjc"><div class="uhch"><h3>Viðvaranir</h3></div><div class="snjempty">Ekkert sem þarf að vara við – allt á áætlun.</div></section>`;
    return `<section class="card ucard snjc"><div class="uhch"><h3>Viðvaranir <span class="m">${ws.length}</span></h3></div>${ws.slice(0, max).map(w => rowH(w.open, `<i class="snjdot l${w.lvl}"></i>`, w.title, w.sub, " l" + w.lvl)).join("")}${ws.length > max ? `<div class="snjmore">+ ${ws.length - max} í viðbót</div>` : ""}</section>`;
  }
  function teamHTML() {
    const tm = team(); if (tm.length < 1) return "";
    return `<section class="card ucard snjc"><div class="uhch"><h3>Hver er hvar</h3><span class="m">í dag</span></div>${tm.map(p => { const s = p.st[0];
      return `<div class="snjr snjp" ${s?.open ? `data-open="${E(s.open)}" role="button" tabindex="0"` : ""}><span class="snjav${s && s.k !== "last" ? " on" : ""}">${E(String(p.sk || "").slice(0, 3))}</span><span class="snjrx"><b>${E(p.nafn)}${p.eg ? ' <span class="m">· þú</span>' : ""}</b><small class="${s ? "k-" + s.k : ""}">${E(s ? s.t : "Ekkert skráð í dag")}</small></span><span class="snjh">${p.h ? H(p.h) + " klst." : ""}</span></div>`; }).join("")}</section>`;
  }
  function pulseHTML() {
    const p = pulse(); if (!p) return "";
    const d = p.nyt - p.nytL, tile = (l, v, s, cls = "") => `<div class="snjk${cls}"><small>${l}</small><b>${v}</b>${s ? `<span>${s}</span>` : ""}</div>`;
    window.__snjPulse = pulseText(p);
    return `<section class="card ucard snjc"><div class="uhch"><h3>Rekstrarpúls</h3><button type="button" class="snjcopy" onclick="navigator.clipboard?.writeText(window.__snjPulse||'').then(()=>toast('Vikan í tölum afrituð – límdu í Teams eða póst'))">Afrita „Vikan í tölum“</button></div>
      <div class="snjks">${tile("Óinnheimt", mkr(p.oin), p.late ? mkr(p.late) + " fram yfir gjalddaga" : "ekkert fram yfir", p.late ? " warn" : "")}${tile("Reikningshæft núna", mkr(p.ub), H(p.ubH) + " klst. óreikningsfærðar")}
      ${tile("Nýting teymis", Math.round(p.nyt * 100) + " %", `${H(p.hW)} klst. · <em class="${d >= 0 ? "t-grn" : "t-red"}">${d >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(d * 100))} %</em> frá sama tíma síðustu viku`, d < -0.1 ? " warn" : "")}${p.eint ? tile("Búnaður úti", Math.round(p.uti / p.eint * 100) + " %", `${p.uti} af ${p.eint} eintökum`) : tile("Pantanir", p.nyjar + " nýjar", p.afh + " úti")}</div></section>`;
  }

  /* Tölva: Heim › Yfirlit */
  const hook = () => {
    const U = window.UI1V; if (!U || !U.yfirlit || U.yfirlit.__snj) return !!(U && U.yfirlit && U.yfirlit.__snj);
    const o = U.yfirlit; U.yfirlit = function () { let h = o.apply(this, arguments); if (!on()) return h;
      const O = order().filter(showPart), F = { cmd: cmdHTML, loka: bannerHTML, vidv: () => warnHTML(), hver: teamHTML, pulse: pulseHTML };
      const top = O.filter(k => k === "cmd" || k === "loka").map(k => F[k]()).join(""), gi = O.filter(k => !["cmd", "loka"].includes(k)).map(k => F[k]()).join("");
      const grid = gi ? `<div class="snjgrid">${gi}</div>` : "";
      h = h.replace('<div class="uhtop">', top + '<div class="uhtop">'); h = h.replace('<div class="uh3">', grid + '<div class="uh3">'); return h; };
    U.yfirlit.__snj = 1; return true;
  };
  if (!hook()) { const iv = setInterval(() => { if (hook()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }

  /* Sími: Í dag */
  if (typeof render === "function") {
    // Skipanalínan heldur texta, fókus og bendli þótt Heim endurteiknist (t.d. þegar gögn samstillast)
    const r0 = render; render = function () {
      const q = document.getElementById("snjq"), keep = q && (q.value || document.activeElement === q) ? { v: q.value, f: document.activeElement === q, s: q.selectionStart, e: q.selectionEnd } : null;
      const x = r0.apply(this, arguments); try { phoneDecorate(); } catch (e) {}
      if (keep) { const n = document.getElementById("snjq"); if (n && n !== q) { n.value = keep.v; if (keep.f) { n.focus(); try { n.setSelectionRange(keep.s, keep.e); } catch (e) {} } const pv = document.getElementById("snjpv"); if (pv) pv.innerHTML = preview(parse(keep.v)); } }
      return x; };
  }
  function phoneDecorate() {
    if (!on() || !phone() || DETAIL || tab !== "yfirlit") return; const sd = document.querySelector("#view .sd"); if (!sd || sd.querySelector(".snjcmd,.snjban,.snjw")) return;
    if (showPart("cmd")) sd.querySelector(".sdh")?.insertAdjacentHTML("afterend", cmdHTML());
    const k = sd.querySelector(".sdk"); if (k && showPart("loka")) k.insertAdjacentHTML("afterend", bannerHTML());
    const ws = showPart("vidv") ? warnings() : [];
    if (ws.length) { const first = sd.querySelector(".sdsec"); first?.insertAdjacentHTML("beforebegin", `<div class="sdsec snjw">Viðvaranir · ${ws.length}</div><section class="sdlist">${ws.slice(0, 4).map(w => `<div class="sdrow snjpw l${w.lvl}"><a class="sdmain" data-open="${E(w.open)}" role="button" tabindex="0"><span class="sdtm"><i class="snjdot l${w.lvl}"></i></span><span class="sdtx"><b>${E(w.title)}</b><small>${E(w.sub)}</small></span></a></div>`).join("")}</section>`); }
  }

  /* ---------- Stillingasíður: Stillingar › Ég › Heim og Stillingar › Fyrirtækið › Heim ---------- */
  const cur = sc => sc === "co" ? mrg(DEF, coPref()) : PR();
  window.snjEdit = (sc, op, a, b) => {
    const v = structuredClone(cur(sc)); v.fela = v.fela || []; v.vidv.af = v.vidv.af || []; v.loka.af = v.loka.af || [];
    const tog = (arr, k) => { const i = arr.indexOf(k); i < 0 ? arr.push(k) : arr.splice(i, 1); };
    if (op === "part") tog(v.fela, a);
    if (op === "move") { const o = order(); v.hlutar = sc === "co" ? (v.hlutar.filter(k => HL[k]).concat(Object.keys(HL).filter(k => !v.hlutar.includes(k)))) : o; const i = v.hlutar.indexOf(a), j = i + b; if (i >= 0 && j >= 0 && j < v.hlutar.length) { [v.hlutar[i], v.hlutar[j]] = [v.hlutar[j], v.hlutar[i]]; } }
    if (op === "vt") tog(v.vidv.af, a);
    if (op === "vn") { const n = parseFloat(String(b).replace(",", ".")); if (n > 0) v.vidv[a] = n; }
    if (op === "lt") tog(v.loka.af, a);
    if (op === "reset") { if (sc === "co") saveCo({}); else { UP = null; try { localStorage.removeItem(LSK); } catch (e) {} try { window.heimSaveDoc?.(); } catch (e) {} render(); toast?.("Sjálfgefið fyrirtækisins í notkun"); } return; }
    sc === "co" ? saveCo(v) : saveUP(v);
  };
  const sw = (on, js, lab) => `<label class="snjsw" title="${E(lab)}"><input type="checkbox"${on ? " checked" : ""} onchange="${js}" aria-label="${E(lab)}"><i></i></label>`;
  function pageHTML(sc) {
    const v = cur(sc), O = (sc === "co" ? v.hlutar.filter(k => HL[k]).concat(Object.keys(HL).filter(k => !v.hlutar.includes(k))) : order()), q = `'${sc}'`;
    const parts = O.map((k, i) => `<div class="snjsr"><div class="snjsc">${sw(!v.fela.includes(k), `snjEdit(${q},'part','${k}')`, HL[k][0])}</div><div class="snjst"><b>${E(HL[k][0])}</b><small>${E(HL[k][1])}</small></div>
      <div class="snjso"><button type="button" class="snjmv" ${i ? "" : "disabled"} onclick="snjEdit(${q},'move','${k}',-1)" aria-label="Færa ${E(HL[k][0])} upp">↑</button><button type="button" class="snjmv" ${i < O.length - 1 ? "" : "disabled"} onclick="snjEdit(${q},'move','${k}',1)" aria-label="Færa ${E(HL[k][0])} niður">↓</button></div></div>`).join("");
    const num = (k, unit, min, max) => `<input class="snjnum" type="number" inputmode="decimal" min="${min}" max="${max}" value="${E(v.vidv[k])}" onchange="snjEdit(${q},'vn','${k}',this.value)" aria-label="${E(VT[k])} – ${unit}"><span class="snju">${unit}</span>`;
    const lim = { yfir: num("yfir", "% af áætlun", 100, 300), tvib: num("tvib", "daga fram í tímann", 1, 60), ostad: num("ostad", "daga fyrir afhendingu", 0, 14), skil: num("skil", "daga fyrir skil", 0, 30) };
    const vrows = Object.keys(VT).map(k => `<div class="snjsr"><div class="snjsc">${sw(!v.vidv.af.includes(k), `snjEdit(${q},'vt','${k}')`, VT[k])}</div><div class="snjst"><b>${E(VT[k])}</b></div><div class="snjso snjlim">${lim[k]}</div></div>`).join("");
    const lrows = Object.keys(LT).map(k => `<div class="snjsr"><div class="snjsc">${sw(!v.loka.af.includes(k), `snjEdit(${q},'lt','${k}')`, LT[k])}</div><div class="snjst"><b>${E(LT[k])}</b></div><div class="snjso"></div></div>`).join("");
    const own = sc !== "co" && UP;
    return `${sc === "co" ? `<p class="hint">Þetta er sjálfgefið fyrir alla starfsmenn. Hver og einn getur breytt sínu í Stillingar › Ég › Heim.</p>` : `<p class="hint">${own ? "Þú hefur sérsniðið Heim. Stillingarnar fylgja aðganginum þínum í síma og tölvu." : "Þú notar sjálfgefið fyrirtækisins. Breyttu því sem þú vilt – það fylgir aðganginum þínum."}</p>`}
      <div class="viewtitle">Hlutar á Heim</div><div class="snjset">${parts}</div>
      <div class="viewtitle">Viðvaranir</div><div class="snjset">${vrows}</div>
      <div class="viewtitle">Loka deginum – byggt á</div><div class="snjset">${lrows}</div>
      ${sc === "co" ? `<div class="links" style="margin-top:16px"><button type="button" class="btn" onclick="snjEdit('co','reset')">Endurstilla í upphafsgildi</button></div>` : own ? `<div class="links" style="margin-top:16px"><button type="button" class="btn" onclick="snjEdit('me','reset')">Nota sjálfgefið fyrirtækisins</button></div>` : ""}`;
  }
  const addPages = () => { if (typeof STPAGES === "undefined") return false;
    STPAGES.snjheim = { l: "Heim", d: "Hvaða hlutar birtast á Heim, í hvaða röð, viðvaranir og Loka deginum", s: ["Hlutar á Heim", "Viðvaranir", "Loka deginum", "Skipanalína", "Hver er hvar", "Rekstrarpúls"], fn: () => pageHTML("me") };
    STPAGES.snjfyr = { l: "Heim – sjálfgefið", d: "Sjálfgefnir hlutar og mörk viðvarana fyrir alla starfsmenn", s: ["Heim", "Viðvaranir", "Loka deginum"], adm: 1, fn: () => pageHTML("co") };
    return true; };
  if (!addPages()) { const iv = setInterval(() => { if (addPages()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }
})();
