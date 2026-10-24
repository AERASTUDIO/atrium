/* Tilkynningar (2.64.0, póstur 2.65.0): ýtitilkynningar í síma og tölvu í gegnum Firebase Cloud Messaging (Heim nr. 3).
   Virkar aðeins þar sem uppsetningin hefur ORG.firebase.vapidKey (opinber lykill – Firebase › Project settings › Cloud Messaging
   › Web Push certificates) og Cloud Functions eru uppsett (functions/index.js, krefst Blaze).
   Gögn: tilkynningar/{netfang} = { tokens: { <token>: { tegund, uppfaert } }, val: { pantanir, stadfest, spjall, morgun }, prufa }
   Stillingar › Ég › Tilkynningar: kveikja/slökkva í þessu tæki, velja tegundir, senda prufu. Talan á tákni appsins hreinsast þegar appið er opnað. */
(function () {
  const V = "12.6.0", GS = m => `https://www.gstatic.com/firebasejs/${V}/firebase-${m}.js`;
  const tr = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const vapid = () => tr(() => ORG.firebase.vapidKey, "") || "";
  const on = () => !!vapid() && !window.AERA_DEMO;
  const me = () => String(tr(() => DB.email, "") || "").toLowerCase();
  const path = () => "tilkynningar/" + me();
  const LS = "tilk-token:" + tr(() => ORG.lsForskeyti || "", "");
  const DEFOFF = new Set(["postur", "minnpostur"]);   // sjálfgefið slökkt – kveikt sérstaklega
  const KINDS = [["pantanir", "Nýjar pantanir", "Þegar pöntun er stofnuð, t.d. úr pósti eða vefverslun"], ["stadfest", "Staðfestingar viðskiptavina", "Þegar viðskiptavinur staðfestir pöntun eða samþykkir tilboð með tengli"],
    ["spjall", "Spjall", "Einkaskilaboð til þín og skilaboð á almennu rásinni"], ["postur", "Nýr póstur – sameiginlega pósthólfið", "Póstur sem berst í sameiginlega pósthólf fyrirtækisins, með verkefninu sem hann á við"], ["minnpostur", "Nýr póstur – mitt pósthólf", "Póstur sem berst í þitt eigið pósthólf"], ["morgun", "Morgunyfirlit", "Kl. 8 virka daga: afhendingar, skil og það sem bíður"]];
  const st = window.__tilk = window.__tilk || { doc: null, busy: false, msg: "" };
  const myToken = () => { try { return localStorage.getItem(LS) || ""; } catch (e) { return ""; } };
  const setMyToken = t => { try { t ? localStorage.setItem(LS, t) : localStorage.removeItem(LS); } catch (e) {} };
  const devName = () => { const u = navigator.userAgent; const os = /iPhone|iPad/.test(u) ? "iPhone/iPad" : /Android/.test(u) ? "Android" : /Mac/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : "Tæki";
    const br = /Edg\//.test(u) ? "Edge" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : /Firefox\//.test(u) ? "Firefox" : ""; return os + (br ? " · " + br : "") + (matchMedia("(display-mode: standalone)").matches ? " (app)" : ""); };
  const iosNeedsInstall = () => /iPhone|iPad/.test(navigator.userAgent) && !matchMedia("(display-mode: standalone)").matches;

  async function messaging() {
    const { getApp } = await import(GS("app")), M = await import(GS("messaging"));
    if (!(await M.isSupported())) throw new Error("Þessi vafri styður ekki ýtitilkynningar.");
    return { M, m: M.getMessaging(getApp()) };
  }
  const swReg = async () => (await navigator.serviceWorker.getRegistration(new URL("sw.js", document.baseURI).href)) || (await navigator.serviceWorker.ready);
  const save = fn => window.__DB.tx(path(), c => { const x = { tokens: {}, val: {}, ...(c || {}) }; x.tokens = { ...(x.tokens || {}) }; x.val = { ...(x.val || {}) }; fn(x); x.uppfaert = new Date().toISOString(); return x; });

  async function enable() {
    if (st.busy) return; st.busy = true; st.msg = ""; render();
    try {
      if (iosNeedsInstall()) throw new Error("Á iPhone þarf fyrst að setja appið á heimaskjáinn (Deila › Bæta á heimaskjá) og opna það þaðan.");
      const p = await Notification.requestPermission(); if (p !== "granted") throw new Error(p === "denied" ? "Tilkynningar eru bannaðar fyrir appið í stillingum vafrans eða tækisins." : "Ekki var veitt leyfi.");
      const { M, m } = await messaging(), t = await M.getToken(m, { vapidKey: vapid(), serviceWorkerRegistration: await swReg() });
      if (!t) throw new Error("Fékk ekki auðkenni tækis.");
      await save(x => { x.tokens[t] = { tegund: devName(), uppfaert: new Date().toISOString() }; }); setMyToken(t); st.msg = "Kveikt á tilkynningum í þessu tæki.";
    } catch (e) { st.msg = "⚠ " + (e?.message || e); }
    st.busy = false; await load(); render();
  }
  async function disable(tok) {
    const t = tok || myToken(); st.busy = true; render();
    try { if (!tok || tok === myToken()) { try { const { M, m } = await messaging(); await M.deleteToken(m); } catch (e) {} setMyToken(""); }
      if (t) await save(x => { delete x.tokens[t]; }); st.msg = tok && tok !== myToken() ? "Tækið fjarlægt." : "Slökkt á tilkynningum í þessu tæki."; } catch (e) { st.msg = "⚠ " + (e?.message || e); }
    st.busy = false; await load(); render();
  }
  async function load() { try { const s = await window.__DB.get(path()); st.doc = s.exists ? s.data() : {}; } catch (e) { st.doc = st.doc || {}; } }
  window.tilkAct = async (op, a) => {
    if (op === "on") return enable(); if (op === "off") return disable(); if (op === "rm") return disable(a);
    if (op === "val") { await save(x => { x.val[a] = DEFOFF.has(a) ? x.val[a] !== true : x.val[a] === false; }); await load(); return render(); }
    if (op === "prufa") { st.msg = "Prufa send – hún ætti að birtast eftir nokkrar sekúndur."; await save(x => { x.prufa = new Date().toISOString(); }); render(); }
  };

  function pageHTML() {
    if (!st.doc && !st.loading) { st.loading = true; load().then(() => { st.loading = false; render(); }); }
    const d = st.doc || {}, toks = d.tokens || {}, mine = myToken(), here = !!(mine && toks[mine]), perm = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
    const sw = (onv, js, lab) => `<label class="snjsw" title="${E(lab)}"><input type="checkbox"${onv ? " checked" : ""} onchange="${js}" aria-label="${E(lab)}"><i></i></label>`;
    const devs = Object.entries(toks).sort((a, b) => String(b[1].uppfaert).localeCompare(String(a[1].uppfaert)));
    return `<p class="hint">Fáðu tilkynningu í símann eða tölvuna þegar eitthvað gerist, líka þegar appið er lokað. Kveikja þarf sérstaklega í hverju tæki.</p>
      ${st.msg ? `<p class="hint" style="color:var(${st.msg.startsWith("⚠") ? "--t-red" : "--t-grn"})">${E(st.msg)}</p>` : ""}
      <div class="viewtitle">Þetta tæki</div>
      <div class="snjset"><div class="snjsr tlkr"><div class="snjst"><b>${here ? "Kveikt" : "Slökkt"} · ${E(devName())}</b><small>${perm === "denied" ? "Tilkynningar eru bannaðar í stillingum vafrans eða tækisins – leyfðu þær þar fyrst." : iosNeedsInstall() ? "Á iPhone virka tilkynningar aðeins þegar appið er opnað af heimaskjánum." : here ? "Þetta tæki fær tilkynningar." : "Þetta tæki fær ekki tilkynningar."}</small></div>
        <div class="snjso"><button type="button" class="btn${here ? "" : " primary"}" ${st.busy ? "disabled" : ""} onclick="tilkAct('${here ? "off" : "on"}')">${st.busy ? "Augnablik…" : here ? "Slökkva" : "Kveikja á tilkynningum"}</button></div></div></div>
      <div class="viewtitle">Hvað á að tilkynna</div>
      <div class="snjset">${KINDS.map(([k, l, s]) => `<div class="snjsr"><div class="snjsc">${sw(DEFOFF.has(k) ? (d.val || {})[k] === true : (d.val || {})[k] !== false, `tilkAct('val','${k}')`, l)}</div><div class="snjst"><b>${E(l)}</b><small>${E(s)}</small></div></div>`).join("")}</div>
      ${devs.length ? `<div class="viewtitle">Tæki með tilkynningar</div><div class="snjset">${devs.map(([t, x]) => `<div class="snjsr tlkr"><div class="snjst"><b>${E(x.tegund || "Tæki")}${t === mine ? ' <span class="m">· þetta tæki</span>' : ""}</b><small>Síðast uppfært ${E(String(x.uppfaert || "").slice(0, 10).split("-").reverse().join("."))}</small></div><div class="snjso"><button type="button" class="btn sm" onclick="tilkAct('rm','${E(t)}')">Fjarlægja</button></div></div>`).join("")}</div>
        <div class="links" style="margin-top:16px"><button type="button" class="btn" onclick="tilkAct('prufa')">Senda prufutilkynningu</button></div>` : ""}`;
  }

  // Raðir án rofa: texti vinstra megin, hnappur hægra megin
  if (!document.getElementById("tilk-css")) { const c = document.createElement("style"); c.id = "tilk-css";
    c.textContent = ".snjsr.tlkr{display:flex!important;align-items:center;justify-content:space-between;gap:12px}.snjsr.tlkr .snjst{flex:1;min-width:0}.snjsr.tlkr .snjso{flex:none}"; document.head.appendChild(c); }
  const addPage = () => { if (typeof STPAGES === "undefined") return false; if (!on()) return true;
    STPAGES.tilk = { l: "Tilkynningar", d: "Ýtitilkynningar í síma og tölvu", s: ["Tilkynningar", "Ýtitilkynningar", "Morgunyfirlit"], fn: pageHTML }; return true; };
  if (!addPage()) { const iv = setInterval(() => { if (addPage()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }

  // Talan á tákni appsins hreinsast þegar appið er opnað
  const clr = () => { if (document.visibilityState === "visible" && navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {}); };
  document.addEventListener("visibilitychange", clr); clr();
  // Endurnýja auðkenni tækisins öðru hverju (FCM getur skipt því út)
  setTimeout(async () => { if (!on() || !myToken() || tr(() => Notification.permission, "") !== "granted" || !window.__DB || !me()) return;
    try { const { M, m } = await messaging(), t = await M.getToken(m, { vapidKey: vapid(), serviceWorkerRegistration: await swReg() });
      if (t && t !== myToken()) { const old = myToken(); await save(x => { delete x.tokens[old]; x.tokens[t] = { tegund: devName(), uppfaert: new Date().toISOString() }; }); setMyToken(t); } } catch (e) {} }, 15000);
})();
