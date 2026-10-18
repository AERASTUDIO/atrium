// Notendur og réttindi (app/notendur).
// Hver notandi skráir sig inn með Microsoft-aðgangi @aerastudio.is. Admin bætir notendum við, velur hlutverk og gerir óvirka.
// Hlutverk eru listi heimilda (ROLES) – nýrri hömlu er bætt við með einni línu hér og athugun `can("…")` þar sem við á.
// Athugið: það sem appið felur á skjánum er ekki vörn. Raunveruleg vörn er í firestore.rules.
(function () {
  window.ROLES = {
    admin:       { heiti: "Admin",      notendur: true,  stillingar: true  },
    starfsmadur: { heiti: "Starfsmaður", notendur: false, stillingar: false }
  };
  let NU = null; // app/notendur
  window.USER = null; // innskráður notandi {email, nafn, sk, hlutverk, varaleid}
  window.can = perm => !!(ROLES[USER?.hlutverk || "starfsmadur"] || {})[perm];
  window.nuUsers = () => Object.entries(NU?.notendur || {}).map(([email, u]) => ({ email, ...u }))
    .sort((a, b) => (b.virkur - a.virkur) || (a.hlutverk === "admin" ? -1 : b.hlutverk === "admin" ? 1 : 0) || String(a.nafn).localeCompare(b.nafn, "is"));
  window.nuSet = d => { NU = d; };

  const lc = s => String(s || "").trim().toLowerCase();
  const DOMAIN = "aerastudio.is";
  const roleName = r => ROLES[r]?.heiti || r;
  const MN = ["jan.", "feb.", "mar.", "apr.", "maí", "jún.", "júl.", "ágú.", "sep.", "okt.", "nóv.", "des."], p2 = n => String(n).padStart(2, "0");
  const when = t => { if (!t) return "aldrei"; const x = new Date(t); return `${x.getDate()}. ${MN[x.getMonth()]} ${x.getFullYear()} kl. ${p2(x.getHours())}:${p2(x.getMinutes())}`; };

  // Vistar app/notendur á nýjustu útgáfu netþjóns.
  function nuSave(mut) {
    if (!DB) return Promise.reject({ message: "Ekki tengt gagnagrunni." });
    const apply = d => { d = structuredClone(d || {}); d.notendur = d.notendur || {}; mut(d.notendur); d.uppfaert = new Date().toISOString(); return d; };
    const local = apply(NU); NU = local; render();
    const p = DB.tx ? DB.tx("app/notendur", apply) : DB.set("app/notendur", local);
    return p.catch(e => { toast("Vistun mistókst: " + (e?.code || e?.message || "villa")); throw e; });
  }
  // Starfsmaður í stillingum appsins (tímaskráning, verkefni) fylgir notandanum.
  function ensureStarf(sk, nafn) {
    if (!sk) return;
    const has = (CFG().starfsmenn || []).some(x => x.sk === sk);
    if (!has) cfgSave(c => { if (!c.starfsmenn.some(x => x.sk === sk)) c.starfsmenn.push({ sk, nafn }); });
  }
  const admins = () => nuUsers().filter(u => u.virkur && u.hlutverk === "admin");

  window.nuAccountHTML = () => {
    if (!USER) return "";
    return `<div class="viewtitle">Aðgangur</div>
    <div class="cfgrow"><div class="grow">${esc(USER.nafn)} ${USER.sk ? `<span class="nr">${esc(USER.sk)}</span>` : ""} <span class="tag">${esc(roleName(USER.hlutverk))}</span>
      <div class="ls" style="font-size:12.5px;color:var(--muted)">${esc(USER.email)}${USER.varaleid ? " · varaleið (Google)" : ""}</div></div>
      <div class="ctl"><button type="button" class="btn" onclick="aeraSignOut()">Skrá út</button></div></div>
    ${USER.varaleid ? `<p class="hint">Þú ert skráð(ur) inn með gamla Google-aðganginum, sem er varaleið á meðan skipt er yfir í Microsoft. Skráðu þig út og inn með <b>Skrá inn með Microsoft</b> til að nota ${esc(DOMAIN)}-aðganginn.</p>` : ""}`;
  };

  window.nuStillingarHTML = () => {
    if (!can("notendur")) return "";
    const list = nuUsers();
    const row = u => `<div class="cfgrow"${u.virkur ? "" : ' style="opacity:.6"'}><div class="grow">${esc(u.nafn || u.email)} ${u.sk ? `<span class="nr">${esc(u.sk)}</span>` : ""} <span class="tag">${esc(roleName(u.hlutverk))}</span>${u.virkur ? "" : ' <span class="tag">Óvirkur</span>'}${lc(u.email) === lc(USER?.email) ? ' <span class="tag">Ég</span>' : ""}
        <div class="ls" style="font-size:12.5px;color:var(--muted)">${esc(u.email)} · síðast inni ${esc(when(u.sidast))}</div></div>
      <div class="ctl">
        <select data-nurole="${esc(u.email)}" aria-label="Hlutverk ${esc(u.nafn)}">${Object.keys(ROLES).map(r => `<option value="${r}"${r === u.hlutverk ? " selected" : ""}>${esc(roleName(r))}</option>`).join("")}</select>
        <button type="button" class="mini" data-act="nuren:${esc(u.email)}" aria-label="Breyta nafni og skammstöfun">✎</button>
        ${lc(u.email) === lc(USER?.email) ? "" : `<button type="button" class="mini" data-act="nuvirk:${esc(u.email)}" title="${u.virkur ? "Gera óvirkan – kemst ekki inn" : "Virkja aftur"}" style="width:auto;padding:0 10px">${u.virkur ? "Óvirkja" : "Virkja"}</button>`}
        ${u.virkur ? "" : `<button type="button" class="mini" data-act="nudel:${esc(u.email)}" aria-label="Eyða notanda">✕</button>`}
      </div></div>`;
    return `<div class="viewtitle">Notendur</div>
    <p class="hint" style="margin:0 0 8px">Starfsmenn skrá sig inn með Microsoft-aðgangi @${DOMAIN}. Bættu notanda við hér <b>og</b> í Entra (Enterprise apps › AERA app › Users and groups).</p>
    ${list.length ? list.map(row).join("") : '<div class="empty">Engir notendur skráðir.</div>'}
    <div class="two" style="margin-top:12px"><label>Netfang<input id="nu-email" type="email" placeholder="nafn@${DOMAIN}" autocomplete="off"></label><label>Nafn<input id="nu-nafn" type="text" placeholder="Fullt nafn"></label></div>
    <div class="two"><label>Skammstöfun<input id="nu-sk" type="text" placeholder="T.d. JJ" maxlength="4"></label>
      <label>Hlutverk<select id="nu-role">${Object.keys(ROLES).map(r => `<option value="${r}"${r === "starfsmadur" ? " selected" : ""}>${esc(roleName(r))}</option>`).join("")}</select></label></div>
    <button type="button" class="btn primary" style="margin-top:10px" data-act="nuadd">+ Bæta við notanda</button>
    <p class="hint" style="margin-top:6px"><b>Admin</b> stýrir notendum og stillingum fyrirtækisins. <b>Starfsmaður</b> sér og vinnur í öllum verkefnum, tímum og gögnum. Óvirkur notandi kemst ekki inn en tímarnir hans haldast.</p>`;
  };

  window.nuAct = (k, r) => {
    if (!can("notendur")) return toast("Aðeins admin getur breytt notendum.");
    const email = lc(r.join(":"));
    const u = nuUsers().find(x => lc(x.email) === email);
    if (k === "nuadd") {
      const e = lc(document.getElementById("nu-email").value), nafn = document.getElementById("nu-nafn").value.trim();
      const sk = document.getElementById("nu-sk").value.trim().toUpperCase(), hl = document.getElementById("nu-role").value;
      if (!/^[^@\s]+@[^@\s]+$/.test(e)) return toast("Skráðu gilt netfang.");
      if (!window.AERA_DEMO && !e.endsWith("@" + DOMAIN)) return toast(`Netfangið þarf að enda á @${DOMAIN}.`);
      if (!nafn) return toast("Skráðu nafn.");
      if (!sk) return toast("Skráðu skammstöfun.");
      if (nuUsers().some(x => lc(x.email) === e)) return toast("Þessi notandi er þegar skráður.");
      if (nuUsers().some(x => x.sk === sk && lc(x.email) !== e) || (CFG().starfsmenn || []).some(x => x.sk === sk && x.nafn !== nafn)) return toast(`Skammstöfunin ${sk} er þegar í notkun.`);
      const now = new Date().toISOString();
      nuSave(n => { n[e] = { nafn, sk, hlutverk: hl, virkur: true, stofnad: now, breytt: now }; })
        .then(() => { ensureStarf(sk, nafn); toast(`${nafn} bætt við`); });
      return;
    }
    if (!u) return;
    const self = lc(u.email) === lc(USER?.email);
    const lastAdmin = u.hlutverk === "admin" && admins().length <= 1;
    if (k === "nuvirk") {
      if (self) return alert("Þú getur ekki gert sjálfa(n) þig óvirka(n).");
      if (u.virkur && lastAdmin) return alert("Það verður alltaf að vera að minnsta kosti einn virkur admin.");
      if (u.virkur && !confirm(`Gera ${u.nafn} óvirkan? Hann/hún kemst þá ekki inn í appið. Tímaskráningar haldast.`)) return;
      nuSave(n => { n[email].virkur = !u.virkur; n[email].breytt = new Date().toISOString(); });
    }
    if (k === "nuren") {
      const nafn = prompt("Nafn:", u.nafn || ""); if (nafn == null) return;
      const sk = (prompt("Skammstöfun:", u.sk || "") || "").trim().toUpperCase(); if (!sk) return;
      if (sk !== u.sk && nuUsers().some(x => x.sk === sk)) return alert(`Skammstöfunin ${sk} er þegar í notkun.`);
      nuSave(n => { Object.assign(n[email], { nafn: nafn.trim(), sk, breytt: new Date().toISOString() }); })
        .then(() => { if (sk === u.sk) cfgSave(c => { const s = c.starfsmenn.find(x => x.sk === sk); if (s) s.nafn = nafn.trim(); }); else ensureStarf(sk, nafn.trim()); });
    }
    if (k === "nudel") {
      if (u.virkur) return;
      if (confirm(`Eyða ${u.nafn} úr notendaskránni? Tímaskráningar haldast.`)) nuSave(n => { delete n[email]; });
    }
  };
  document.addEventListener("change", e => {
    const email = e.target.dataset?.nurole; if (email == null) return;
    if (!can("notendur")) return;
    const u = nuUsers().find(x => lc(x.email) === lc(email)), v = e.target.value;
    if (!u || v === u.hlutverk) return;
    if (u.hlutverk === "admin" && admins().length <= 1 && u.virkur) { alert("Það verður alltaf að vera að minnsta kosti einn virkur admin."); e.target.value = u.hlutverk; return; }
    if (lc(u.email) === lc(USER?.email) && !confirm("Þú ert að taka af þér admin-réttindi. Halda áfram?")) { e.target.value = u.hlutverk; return; }
    nuSave(n => { n[lc(email)].hlutverk = v; n[lc(email)].breytt = new Date().toISOString(); });
  });
})();
