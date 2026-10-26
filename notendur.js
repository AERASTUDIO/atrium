// Notendur og réttindi (app/notendur).
// Hver notandi skráir sig inn með Microsoft-aðgangi fyrirtækisins (@lén) – eða sem gestur með eigið netfang (2.99.1, t.d. verktakar). Admin bætir notendum við, velur hlutverk og gerir óvirka.
// Hlutverk eru listi heimilda (ROLES) – nýrri hömlu er bætt við með einni línu hér og athugun `can("…")` þar sem við á.
// Athugið: það sem appið felur á skjánum er ekki vörn. Raunveruleg vörn er í firestore.rules.
(function () {
  window.ROLES = {
    // fjarmal: býr til og breytir reikningum, sér tíma og kostnað allra (firestore.rules framfylgir því sama)
    // eyda: eyðir verkefnum, viðskiptavinum og reikningum (frá 1.9.0; firestore.rules: delete aðeins admin)
    admin:       { heiti: "Admin",       notendur: true,  stillingar: true,  fjarmal: true,  eyda: true  },
    bokari:      { heiti: "Bókari",      notendur: false, stillingar: false, fjarmal: true,  eyda: false },
    starfsmadur: { heiti: "Starfsmaður", notendur: false, stillingar: false, fjarmal: false, eyda: false },
    // vettvangur (2.97.0): lager og vettvangur – Í dag, klukka, skanni, afhending, myndir; aðeins eigin verk (vettvangur.js, firestore.rules)
    vettvangur:  { heiti: "Vettvangur",  notendur: false, stillingar: false, fjarmal: false, eyda: false, vettvangur: true }
  };
  let NU = null; // app/notendur
  window.USER = null; // innskráður notandi {email, nafn, sk, hlutverk, varaleid}
  window.can = perm => !!(ROLES[window.VIEWAS?.hlutverk || USER?.hlutverk || "starfsmadur"] || {})[perm]; // VIEWAS = „Skoða sem“ (adgangur.js)
  window.nuUsers = () => Object.entries(NU?.notendur || {}).map(([email, u]) => ({ email, ...u }))
    .sort((a, b) => (b.virkur - a.virkur) || (a.hlutverk === "admin" ? -1 : b.hlutverk === "admin" ? 1 : 0) || String(a.nafn).localeCompare(b.nafn, "is"));
  window.nuSet = d => { NU = d; };

  const lc = s => String(s || "").trim().toLowerCase();
  const DOMAIN = ORG.len;
  // Gestir (2.99.2): Microsoft auðkennir gest sem „nafn_gmail.com#ext#@<umhverfi>.onmicrosoft.com“, ekki með netfanginu sjálfu.
  // Admin skrifar venjulegt netfang; það er geymt undir auðkenninu (lykill notendaskrárinnar) og netfangið sjálft í reitnum netfang.
  const gestKey = e => (!e || e.endsWith("@" + DOMAIN) || e.includes("#ext#") || !ORG.ms?.gestir) ? e : e.replace("@", "_") + "#ext#@" + ORG.ms.gestir;
  const synt = u => u.netfang || u.email;
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
        <div class="ls" style="font-size:12.5px;color:var(--muted)">${esc(synt(u))}${u.gestur ? " · gestur" : ""} · síðast inni ${esc(when(u.sidast))}</div></div>
      <div class="ctl">
        <select data-nurole="${esc(u.email)}" aria-label="Hlutverk ${esc(u.nafn)}">${Object.keys(ROLES).map(r => `<option value="${r}"${r === u.hlutverk ? " selected" : ""}>${esc(roleName(r))}</option>`).join("")}</select>
        <button type="button" class="mini" data-act="nuren:${esc(u.email)}" aria-label="Breyta nafni og skammstöfun">✎</button>
        ${lc(u.email) === lc(USER?.email) ? "" : `<button type="button" class="mini" data-act="nuvirk:${esc(u.email)}" title="${u.virkur ? "Gera óvirkan – kemst ekki inn" : "Virkja aftur"}" style="width:auto;padding:0 10px">${u.virkur ? "Óvirkja" : "Virkja"}</button>`}
        ${u.virkur ? "" : `<button type="button" class="mini" data-act="nudel:${esc(u.email)}" aria-label="Eyða notanda">✕</button>`}
      </div></div>`;
    return `<div class="viewtitle">Notendur</div>
    <p class="hint" style="margin:0 0 8px">Starfsmenn skrá sig inn með Microsoft-aðgangi @${DOMAIN}. Bættu notanda við hér <b>og</b> í Entra (Enterprise apps › ${esc(ORG.ms.appNafn || "Atrium")} › Users and groups). Verktakar og aðrir utan fyrirtækisins nota eigið netfang: bjóddu þeim fyrst sem gesti í Entra (Users › Invite external user).</p>
    ${list.length ? list.map(row).join("") : '<div class="empty">Engir notendur skráðir.</div>'}
    <div class="two" style="margin-top:12px"><label>Netfang<input id="nu-email" type="email" placeholder="nafn@${DOMAIN}" autocomplete="off"></label><label>Nafn<input id="nu-nafn" type="text" placeholder="Fullt nafn"></label></div>
    <div class="two"><label>Skammstöfun<input id="nu-sk" type="text" placeholder="T.d. JJ" maxlength="4"></label>
      <label>Hlutverk<select id="nu-role">${Object.keys(ROLES).map(r => `<option value="${r}"${r === "starfsmadur" ? " selected" : ""}>${esc(roleName(r))}</option>`).join("")}</select></label></div>
    <button type="button" class="btn primary" style="margin-top:10px" data-act="nuadd">+ Bæta við notanda</button>
    <p class="hint" style="margin-top:6px"><b>Admin</b> stýrir notendum og stillingum fyrirtækisins. <b>Starfsmaður</b> sér og vinnur í öllum verkefnum, tímum og gögnum. Óvirkur notandi kemst ekki inn en tímarnir hans haldast.</p>`;
  };

  /* ---------- Fólk (2.88.6): einn listi í stað „Notendur“ + „Starfsmenn“ ----------
     Gögnin eru áfram tvö: app/notendur (innskráning: netfang, hlutverk, virkur) og stillingar.starfsmenn (sk, nafn – það sem tímaskráning
     og verkefni vísa í). Hér birtist hver manneskja einu sinni, tengt á skammstöfun. Manneskja án netfangs er „án innskráningar“
     (t.d. verktaki sem admin skráir tíma fyrir). */
  const faersluFj = sk => tr(() => faerslur().filter(e => (e.starfsmadur || ME()) === sk).length, 0);
  function tr(f, d) { try { return f(); } catch (e) { return d; } }
  const people = () => {
    const us = nuUsers(), st = tr(() => STARFS(), []), out = [];
    us.forEach(u => out.push({ u, sk: u.sk, nafn: u.nafn || u.email, si: st.findIndex(x => x.sk === u.sk) }));
    st.forEach((x, i) => { if (!us.some(u => u.sk && u.sk === x.sk)) out.push({ u: null, sk: x.sk, nafn: x.nafn, si: i }); });
    return out.sort((a, b) => ((b.u ? (b.u.virkur ? 2 : 0) : 1) - (a.u ? (a.u.virkur ? 2 : 0) : 1)) || (a.u?.hlutverk === "admin" ? -1 : b.u?.hlutverk === "admin" ? 1 : 0) || String(a.nafn).localeCompare(b.nafn, "is"));
  };
  const ini = n => String(n || "?").split(/\s+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase();
  window.nuFolkHTML = () => {
    if (!can("notendur")) return `<div class="empty">Aðeins admin sér og breytir fólki.</div>`;
    const P = people(), me = x => (x.u && lc(x.u.email) === lc(USER?.email)) || (!x.u && x.sk === tr(() => ME(), ""));
    const row = x => { const u = x.u, n = faersluFj(x.sk), off = u && !u.virkur, id = u ? "u:" + u.email : "s:" + x.si;
      const sub = u ? `${esc(synt(u))}${u.gestur ? " · gestur" : ""} · síðast inni ${esc(when(u.sidast))}` : `Án innskráningar – skráð í tímaskráningu og á verkefnum`;
      return `<div class="fkrow${off ? " off" : ""}"><span class="fkav${u ? "" : " no"}" aria-hidden="true">${esc(x.sk || ini(x.nafn))}</span>
        <div class="fkm"><div class="fkn"><b>${esc(x.nafn)}</b>${me(x) ? '<span class="tag">Ég</span>' : ""}${off ? '<span class="tag">Óvirkur</span>' : ""}</div><div class="fks">${sub}</div><div class="fks">${n} ${n === 1 ? "tímaskráning" : "tímaskráningar"}</div></div>
        <div class="fkr">${u ? `<select data-nurole="${esc(u.email)}" aria-label="Hlutverk ${esc(x.nafn)}"${off ? " disabled" : ""}>${Object.keys(ROLES).map(r => `<option value="${r}"${r === u.hlutverk ? " selected" : ""}>${esc(roleName(r))}</option>`).join("")}</select>`
          : `<button type="button" class="btn sm" data-act="fkgive:${esc(id)}">Gefa aðgang</button>`}
          <details class="fkmore"><summary class="btn sm" aria-label="Fleiri aðgerðir">⋯</summary><div>
            <button type="button" data-act="fkedit:${esc(id)}">Breyta nafni og skammstöfun</button>
            ${u && !me(x) ? `<button type="button" data-act="nuvirk:${esc(u.email)}">${u.virkur ? "Óvirkja – kemst ekki inn" : "Virkja aftur"}</button>` : ""}
            ${u ? (u.virkur ? "" : `<button type="button" class="danger" data-act="nudel:${esc(u.email)}">Eyða aðgangi</button>`) : (me(x) ? "" : `<button type="button" class="danger" data-act="cfg:sfdel:${x.si}">Eyða</button>`)}
          </div></details></div></div>`; };
    const nA = P.filter(x => x.u?.virkur).length, nS = P.filter(x => !x.u).length;
    return `<div class="fkhead"><div class="fkcount">${P.length} manns · ${nA} með aðgang${nS ? ` · ${nS} án innskráningar` : ""}</div><button type="button" class="btn primary" data-act="fkadd:">+ Bæta við</button></div>
      <div class="fklist">${P.map(row).join("")}</div>
      <div class="fkhelp"><p><b>Hlutverk:</b> <b>Admin</b> stýrir fólki og stillingum. <b>Bókari</b> sér fjármál (reikninga, tíma og kostnað allra). <b>Starfsmaður</b> vinnur í verkefnum, tímum og gögnum.</p>
        <p><b>Án innskráningar:</b> manneskja sem ekki skráir sig inn sjálf (t.d. verktaki) en tímar eru skráðir á. „Gefa aðgang“ bætir við netfangi svo hún geti skráð sig inn.</p>
        <p>Innskráning er með Microsoft-aðgangi @${esc(DOMAIN)} – eða eigin netfangi fyrir gesti sem boðnir hafa verið í Entra (Users › Invite external user). Nýr notandi þarf líka að vera í Entra (Enterprise apps › ${esc(ORG.ms?.appNafn || "Atrium")} › Users and groups). Óvirkur notandi kemst ekki inn en tímarnir hans haldast.</p></div>`;
  };
  // Gluggi: bæta við / breyta / gefa aðgang
  function dlg(title, x, mode) {
    const w = document.createElement("div"); w.className = "qrcard pfm fkdlg"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true");
    const u = x?.u, email0 = u?.email || "";
    w.innerHTML = `<div class="qrscrim" data-x="1"></div><div class="qrsheet pfs"><div class="grab" aria-hidden="true"></div><div class="pfh"><h2>${esc(title)}</h2><button type="button" class="qrx" data-x="1" aria-label="Loka">✕</button></div>
      <div class="fkf"><label>Nafn<input id="fk-n" value="${esc(x?.nafn || "")}" placeholder="Fullt nafn" autocomplete="off"></label>
      <label>Skammstöfun<input id="fk-s" value="${esc(x?.sk || "")}" placeholder="T.d. JJ" maxlength="4" autocomplete="off"><small>Birtist í tímaskráningum og á verkefnum</small></label>
      ${mode === "edit" ? "" : `<label class="fkchk"><input type="checkbox" id="fk-a"${mode === "give" || mode === "add" ? " checked" : ""}${mode === "give" ? " disabled" : ""}> Getur skráð sig inn í appið</label>
      <div id="fk-acc"><label>Netfang<input id="fk-e" type="email" value="${esc(email0)}" placeholder="nafn@${esc(DOMAIN)}" autocomplete="off"></label>
      <label>Hlutverk<select id="fk-r">${Object.keys(ROLES).map(r => `<option value="${r}"${r === "starfsmadur" ? " selected" : ""}>${esc(roleName(r))}</option>`).join("")}</select></label></div>`}</div>
      <p class="pferr" hidden></p>
      <div class="pfact"><button type="button" class="btn" data-x="1">Hætta við</button><button type="button" class="btn primary" id="fk-ok">${mode === "edit" ? "Vista" : mode === "give" ? "Gefa aðgang" : "Bæta við"}</button></div></div>`;
    document.body.append(w); document.body.classList.add("qropen");
    const close = () => { w.remove(); document.body.classList.remove("qropen"); };
    w.addEventListener("click", e => { if (e.target.closest("[data-x]")) close(); });
    w.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    const ac = w.querySelector("#fk-a"), acc = w.querySelector("#fk-acc"), sync = () => { if (acc) acc.hidden = !ac.checked; }; ac?.addEventListener("change", sync); sync();
    const n = w.querySelector("#fk-n"), sk = w.querySelector("#fk-s");
    n.addEventListener("input", () => { if (!sk.dataset.t && mode === "add") sk.value = ini(n.value).slice(0, 3); }); sk.addEventListener("input", () => { sk.dataset.t = 1; });
    setTimeout(() => (mode === "give" ? w.querySelector("#fk-e") : n).focus(), 30);
    const err = m => { const p = w.querySelector(".pferr"); p.hidden = false; p.textContent = m; };
    w.querySelector("#fk-ok").onclick = async () => {
      const nafn = n.value.trim(), s2 = sk.value.trim().toUpperCase(), hasAcc = ac ? ac.checked : !!u, e = lc(w.querySelector("#fk-e")?.value), hl = w.querySelector("#fk-r")?.value || "starfsmadur";
      if (!nafn) return err("Skráðu nafn."); if (!s2) return err("Skráðu skammstöfun.");
      const taken = nuUsers().some(y => y.sk === s2 && (!u || lc(y.email) !== lc(u.email))) || (tr(() => STARFS(), [])).some(y => y.sk === s2 && y.sk !== x?.sk);
      if (taken) return err(`Skammstöfunin ${s2} er þegar í notkun.`);
      if (hasAcc && mode !== "edit") { if (!/^[^@\s]+@[^@\s]+$/.test(e)) return err("Skráðu gilt netfang."); if (nuUsers().some(y => lc(y.email) === gestKey(e))) return err("Þetta netfang er þegar skráð."); }
      const now = new Date().toISOString(), oldSk = x?.sk;
      try {
        if (mode === "edit" && u) { await nuSave(N => { Object.assign(N[lc(u.email)], { nafn, sk: s2, breytt: now }); }); }
        if (hasAcc && mode !== "edit") await nuSave(N => { const g = gestKey(e); N[g] = { nafn, sk: s2, hlutverk: hl, virkur: true, stofnad: now, breytt: now, ...(g !== e ? { netfang: e, gestur: true } : {}) }; });
        await cfgSave(c => { const i = c.starfsmenn.findIndex(y => y.sk === (oldSk || s2)); if (i >= 0) Object.assign(c.starfsmenn[i], { sk: s2, nafn }); else if (!c.starfsmenn.some(y => y.sk === s2)) c.starfsmenn.push({ sk: s2, nafn }); });
        if (oldSk && oldSk !== s2) toast("Athugið: eldri tímaskráningar eru áfram merktar " + oldSk);
        close(); toast(mode === "edit" ? "Vistað" : mode === "give" ? `${nafn} fékk aðgang` : `${nafn} bætt við`); render();
      } catch (e2) { err("Tókst ekki: " + (e2?.message || e2)); }
    };
  }
  const pick = id => { const P = people(); return id.startsWith("u:") ? P.find(x => x.u && lc(x.u.email) === lc(id.slice(2))) : P.find(x => !x.u && String(x.si) === id.slice(2)); };
  window.fkAct = (k, r) => { if (!can("notendur")) return; const id = r.join(":"), x = id ? pick(id) : null;
    if (k === "fkadd") return dlg("Bæta við", null, "add");
    if (k === "fkedit" && x) return dlg("Breyta · " + x.nafn, x, "edit");
    if (k === "fkgive" && x) return dlg("Gefa aðgang · " + x.nafn, x, "give"); };
  document.addEventListener("click", e => { document.querySelectorAll("details.fkmore[open]").forEach(d => { if (!d.contains(e.target) || e.target.closest("button:not(summary)")) d.removeAttribute("open"); }); }, true);
  { const reg = () => { if (typeof STPAGES === "undefined" || !STPAGES.folk) return false; STPAGES.folk.fn = () => window.nuFolkHTML(); STPAGES.folk.d = "Hverjir hafa aðgang, hlutverk og hverjir skrá tíma"; return true; }; if (!reg()) { const iv = setInterval(() => { if (reg()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); } }

  window.nuAct = (k, r) => {
    if (!can("notendur")) return toast("Aðeins admin getur breytt notendum.");
    const email = lc(r.join(":"));
    const u = nuUsers().find(x => lc(x.email) === email);
    if (k === "nuadd") {
      const e = lc(document.getElementById("nu-email").value), nafn = document.getElementById("nu-nafn").value.trim();
      const sk = document.getElementById("nu-sk").value.trim().toUpperCase(), hl = document.getElementById("nu-role").value;
      if (!/^[^@\s]+@[^@\s]+$/.test(e)) return toast("Skráðu gilt netfang.");
      if (!nafn) return toast("Skráðu nafn.");
      if (!sk) return toast("Skráðu skammstöfun.");
      if (nuUsers().some(x => lc(x.email) === gestKey(e))) return toast("Þessi notandi er þegar skráður.");
      if (nuUsers().some(x => x.sk === sk && lc(x.email) !== e) || (CFG().starfsmenn || []).some(x => x.sk === sk && x.nafn !== nafn)) return toast(`Skammstöfunin ${sk} er þegar í notkun.`);
      const now = new Date().toISOString();
      nuSave(n => { const g = gestKey(e); n[g] = { nafn, sk, hlutverk: hl, virkur: true, stofnad: now, breytt: now, ...(g !== e ? { netfang: e, gestur: true } : {}) }; })
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
Object.assign(window.ACT_EXT = window.ACT_EXT || {}, { fk: (k, r) => window.fkAct(k, r) });
