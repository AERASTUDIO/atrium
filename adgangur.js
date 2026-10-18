/* Aðgangsstýring – yfirsýn fyrir admin (frá 1.5.0): Stillingar › Aðgangsstýring.
   - Réttindatafla: hvað hvert hlutverk má (sama og firestore.rules framfylgir)
   - Notendur: hlutverk, staða, síðasta innskráning, umsvif
   - „Skoða sem“: admin sér appið eins og annar notandi sér það (aðeins á skjánum; vistun er óvirk á meðan)
   - Nýlegar breytingar: hver breytti hverju (reitirnir breytt_af / breytt_t)
   Athugið: þetta er yfirsýn. Raunveruleg vörn er í firestore.rules. */
(function () {
  // Réttindatafla – ein lína á hvert gagnasafn. Gildi: "rw" les og skrifar, "r" les, "own" eigin færslur, "—" ekkert.
  const PERMS = [
    ["Verkefni og undirverk", "verkefni", { admin: "rw", bokari: "rw", starfsmadur: "rw" }],
    ["Viðskiptavinir", "vidskiptavinir", { admin: "rw", bokari: "rw", starfsmadur: "rw" }],
    ["Fundir", "fundir", { admin: "rw", bokari: "rw", starfsmadur: "rw" }],
    ["Skjöl", "skjol", { admin: "rw", bokari: "rw", starfsmadur: "rw" }],
    ["Póstþræðir á verkefnum", "thraedir", { admin: "rw", bokari: "rw", starfsmadur: "rw" }],
    ["Spjall – Almennt", "spjall", { admin: "rw", bokari: "rw", starfsmadur: "rw" }],
    ["Spjall – bein skilaboð", "spjall", { admin: "own", bokari: "own", starfsmadur: "own" }],
    ["Reikningar", "reikningar", { admin: "rw", bokari: "rw", starfsmadur: "r" }],
    ["Tímaskráning", "timar", { admin: "rw", bokari: "rw", starfsmadur: "own" }],
    ["Útlagður kostnaður", "kostnadur", { admin: "rw", bokari: "rw", starfsmadur: "own" }],
    ["Skeiðklukka", "klukka", { admin: "own", bokari: "own", starfsmadur: "own" }],
    ["Stillingar fyrirtækis", "app/state", { admin: "rw", bokari: "—", starfsmadur: "—" }],
    ["Notendur og hlutverk", "app/notendur", { admin: "rw", bokari: "r", starfsmadur: "r" }]
  ];
  const TXT = { rw: "Les og skrifar", r: "Les", own: "Aðeins eigið", "—": "Enginn aðgangur" };
  const CLS = { rw: "pa", r: "pr", own: "po", "—": "pn" };
  const lc = s => String(s || "").trim().toLowerCase();
  const roleName = r => ROLES[r]?.heiti || r;

  window.VIEWAS = null;
  const banner = () => VIEWAS ? `<div class="viewas" role="status"><span>Þú skoðar appið sem <b>${esc(VIEWAS.nafn)}</b> (${esc(roleName(VIEWAS.hlutverk))}). Vistun er óvirk á meðan.</span><button type="button" class="btn" data-act="viewas:">Hætta</button></div>` : "";
  window.viewAsBanner = banner;

  function changes() {
    const out = [], add = (arr, kind, title, open) => (arr || []).forEach(x => { if (x && x.breytt_t && x.breytt_af) out.push({ t: x.breytt_t, af: x.breytt_af, ny: x.stofnad_t === x.breytt_t, kind, title: title(x), open: open(x) }); });
    add(S?.verkefni, "Verkefni", x => x.nafn || x.stutt, x => "verk:" + x.id);
    add(S?.vidskiptavinir, "Viðskiptavinur", x => x.name, x => "vsk:" + x.id);
    add(S?.fundir, "Fundur", x => x.name, x => "fund:" + x.id);
    add(S?.skjol, "Skjal", x => x.name, x => "skjal:" + x.id);
    add(S?.timar?.faerslur, "Tími", x => cleanLys(x.lysing) + " · " + hrs(x.timar), x => "time:" + x.id);
    add(S?.kostnadur, "Kostnaður", x => x.lysing + " · " + kr(x.upphaed), x => "kostn:" + x.id);
    add(S?.reikningar, "Reikningur", x => "Nr. " + x.nr + " · " + (x.kaupandi?.name || ""), x => "reikn:" + x.id);
    return out.sort((a, b) => String(b.t).localeCompare(String(a.t)));
  }

  window.vAdgangur = function () {
    if (!can("notendur")) return `<div class="empty">Aðeins admin sér aðgangsstýringu.</div>`;
    const us = nuUsers(), act = us.filter(u => u.virkur), roles = Object.keys(ROLES);
    const ch = changes(), per = curPeriod();
    const stat = (n, l, warn) => `<div class="card${warn ? " warn" : ""}"><b>${n}</b><span>${l}</span></div>`;
    const never = act.filter(u => !u.sidast).length, legacy = (window.ORG?.legacyEmails || []).length;
    const mine = (u, arr) => (arr || []).filter(x => lc(x.eigandi) === lc(u.email) || (!x.eigandi && u.sk && x.starfsmadur === u.sk));
    const edits = u => ch.filter(c => lc(c.af) === lc(u.email)).length;

    const matrix = `<div class="pmx" role="table" aria-label="Réttindi hlutverka">
      <div class="pmr pmh" role="row"><span role="columnheader">Gögn</span>${roles.map(r => `<span role="columnheader">${esc(roleName(r))}</span>`).join("")}</div>
      ${PERMS.map(([l, k, p]) => `<div class="pmr" role="row"><span role="cell"><b>${esc(l)}</b><small>${esc(k)}</small></span>${roles.map(r => `<span role="cell"><i class="pp ${CLS[p[r] || "—"]}">${esc(TXT[p[r] || "—"])}</i></span>`).join("")}</div>`).join("")}</div>`;

    const urow = u => {
      const self = lc(u.email) === lc(USER?.email), t = mine(u, S?.timar?.faerslur), k = mine(u, S?.kostnadur), tp = t.filter(e => (e.timabil || timabilOf(e.date)) === per);
      return `<div class="aurow${u.virkur ? "" : " off"}">
        <div class="aun"><span class="mav sm">${esc(u.sk || "?")}</span><div><b>${esc(u.nafn || u.email)}${self ? " (þú)" : ""}</b><small>${esc(u.email)}</small></div></div>
        <div class="aur"><select data-nurole="${esc(u.email)}" aria-label="Hlutverk ${esc(u.nafn)}"${self ? " disabled title=\"Þú getur ekki breytt eigin hlutverki hér\"" : ""}>${roles.map(r => `<option value="${r}"${r === u.hlutverk ? " selected" : ""}>${esc(roleName(r))}</option>`).join("")}</select></div>
        <div class="aus"><span class="pill ${u.virkur ? "" : "late"}">${u.virkur ? "Virkur" : "Óvirkur"}</span><small>${u.sidast ? "Síðast inni " + esc(fmtDate(u.sidast)) : "Hefur aldrei skráð sig inn"}</small></div>
        <div class="aua"><small>${t.length} tímafærslur · ${esc(num(Math.round(tp.reduce((a, e) => a + (+e.timar || 0), 0) * 10) / 10))} klst. á tímabili</small><small>${k.length} kostnaðarliðir · ${edits(u)} breytingar</small></div>
        <div class="auc">${self ? "" : `<button type="button" class="btn" data-act="viewas:${esc(u.email)}"${u.virkur ? "" : " disabled"}>Skoða sem</button><button type="button" class="btn" data-act="nuvirk:${esc(u.email)}">${u.virkur ? "Óvirkja" : "Virkja"}</button>`}</div>
      </div>`;
    };

    const chk = [
      [legacy === 0, legacy ? `Google-varaleiðin er enn opin (${esc(ORG.legacyEmails.join(", "))}). Lokaðu henni þegar Microsoft hefur verið prófað.` : "Google-varaleiðin er lokuð."],
      [never === 0, never ? `${never} virkir notendur hafa aldrei skráð sig inn – athugaðu að þeir séu líka skráðir í Entra (Enterprise apps › ${esc(ORG.nafn)} app › Users and groups).` : "Allir virkir notendur hafa skráð sig inn."],
      [us.filter(u => u.virkur && u.hlutverk === "admin").length >= 1, `${us.filter(u => u.virkur && u.hlutverk === "admin").length} virkur admin.`],
      [true, "Aðgangsreglur eru í firestore.rules og birtast sjálfkrafa þegar þeim er breytt í GitHub."]
    ];

    return `<div class="kpis">${stat(act.length, "virkir notendur")}${roles.map(r => stat(act.filter(u => u.hlutverk === r).length, roleName(r).toLowerCase())).join("")}${stat(us.length - act.length, "óvirkir")}</div>
      <div class="viewtitle">Gátlisti</div><div class="card">${chk.map(([ok, t]) => `<div class="achk ${ok ? "ok" : "no"}"><i aria-hidden="true">${ok ? "✓" : "!"}</i><span>${t}</span></div>`).join("")}</div>
      <div class="viewtitle">Réttindi hlutverka</div>${matrix}
      <p class="hint" style="margin-top:6px">„Aðeins eigið“ = notandinn sér og breytir eingöngu eigin færslum. Taflan lýsir reglunum í Firestore, sem framfylgja aðgangi óháð appinu.</p>
      <div class="viewtitle" style="display:flex;align-items:center;gap:8px">Notendur · ${us.length}<a class="plink" data-act="stsub:folk" style="margin-left:auto">+ Bæta við notanda</a></div>
      <div class="aulist">${us.map(urow).join("")}</div>
      <p class="hint">„Skoða sem“ sýnir appið eins og viðkomandi sér það (valmynd, réttindi og eigin tímar), án þess að skrá þig út. Ekkert er vistað á meðan.</p>
      <div class="viewtitle">Nýlegar breytingar</div>${ch.length ? llist(ch.slice(0, 25).map(c => lrow(c.open, { title: esc(c.title || c.kind), sub: esc([c.kind + (c.ny ? " stofnað" : " breytt"), c.af ? (nuUsers().find(u => lc(u.email) === lc(c.af))?.nafn || c.af) : "", fmtDate(c.t) + " kl. " + new Date(c.t).toTimeString().slice(0, 5)].filter(Boolean).join(" · ")) }))) : `<div class="empty">Engar skráðar breytingar ennþá.</div>`}`;
  };

  window.viewAsAct = function (r) {
    const email = lc(r.join(":"));
    if (!email) { VIEWAS = null; toast("Skoðunarham lokið"); }
    else { if (!can("notendur")) return; const u = nuUsers().find(x => lc(x.email) === email); if (!u) return; VIEWAS = { email: u.email, nafn: u.nafn, sk: u.sk, hlutverk: u.hlutverk }; toast("Þú skoðar nú appið sem " + u.nafn); }
    if (typeof drawMenu === "function") drawMenu();
    doAct("tab:yfirlit");
  };
})();
