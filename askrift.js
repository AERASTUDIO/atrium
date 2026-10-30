/* Áskrift (2.97.0; verðlíkan 30.10.2026 frá 2.116.0) – Stillingar › Áskrift (admin): leið uppsetningarinnar og virkir notendur
   hvers mánaðar, skipt í notendur og vettvangsnotendur, með áætluðu mánaðargjaldi.
   Verð: grunngjald + notendur í þrepum (1–10, 11–25, 26+; afsláttur aðeins umfram hvert þrep) + vettvangsnotendur umfram þá
   sem fylgja leiðinni (Core 3, Pro 5, Complete 10, Enterprise ótakmarkað) á 990 kr. + 4.900 kr. á hverja viðbót
   (ORG.aukapakkar, t.d. "yfirsyn" eða "bokhald" í Core). Lágmark 9.900 kr. Enterprise: samkvæmt samningi. Gögn: app/notkun = { "ÁÁÁÁ-MM": { "<netfang>": "s"|"v" } },
   sem hver notandi skráir sjálfur þegar appið opnast (firebase.js; firestore.rules leyfa aðeins eigið netfang og rétt hlutverk). */
(function () {
  const GRUNN = { core: 4900, pro: 7900, complete: 9900 }, THREP = { core: [2400, 1900, 1400], pro: [3900, 3100, 2300], complete: [4900, 3900, 2900] };
  const INNI = { core: 3, pro: 5, complete: 10, enterprise: Infinity }, VETT = 990, LAGM = 9900, AUKA = 4900;
  const VNAFN = { bokhald: "Bókhald", vefverslun: "Vefverslun" };
  const notK = (k, o) => { const [a, b, c] = THREP[k]; return a * Math.min(o, 10) + b * Math.max(0, Math.min(o, 25) - 10) + c * Math.max(0, o - 25); };
  const MN = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
  const f = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  let NOTKUN = null, sott = 0;
  // Enterprise skilar null (samkvæmt samningi)
  window.askriftVerd = (leid, s, v, auka) => { if (leid === "enterprise") return null; const k = GRUNN[leid] ? leid : "complete";
    const raw = GRUNN[k] + notK(k, s) + VETT * Math.max(0, v - INNI[k]) + AUKA * (auka || 0); return Math.max(LAGM, raw); };
  async function saekja() {
    if (Date.now() - sott < 60000) return; sott = Date.now();
    try {
      if (window.AERA_DEMO || !DB?.get) throw 0;
      const r = await DB.get("app/notkun"); NOTKUN = r.exists ? r.data() : {};
    } catch (e) { // sýniútgáfa: virkir notendur í notendaskrá teljast í þessum mánuði
      const mo = new Date().toISOString().slice(0, 7), o = {};
      (window.nuUsers ? nuUsers() : []).filter(u => u.virkur).forEach(u => { o[u.email] = u.hlutverk === "vettvangur" ? "v" : "s"; });
      NOTKUN = { [mo]: o };
    }
    if (typeof render === "function") render();
  }
  function html() {
    const L = window.leidNu?.(); saekja();
    const k = L?.k || "complete", auka = (L?.auka || []).length, M = NOTKUN || {};
    const man = Object.keys(M).filter(x => /^\d{4}-\d{2}$/.test(x)).sort().reverse().slice(0, 12);
    const rows = man.map(mo => { const vals = Object.values(M[mo] || {}), s = vals.filter(x => x === "s").length, v = vals.filter(x => x === "v").length;
      const [y, m] = mo.split("-"); return `<tr><td>${MN[+m - 1]} ${y}</td><td style="text-align:right">${s}</td><td style="text-align:right">${v}</td><td style="text-align:right">${(x => x == null ? "Samkvæmt samningi" : f(x) + " kr.")(window.askriftVerd(k, s, v, auka))}</td></tr>`; }).join("");
    const ent = k === "enterprise", kk = GRUNN[k] ? k : "complete", T = THREP[kk];
    const vb = (L?.auka || []).map(p => window.PAKKAR?.[p]?.[0] || VNAFN[p] || p);
    return `<div class="card" style="margin-top:14px"><div style="font-size:13px;color:var(--muted)">Leið</div>
      <div style="font-size:22px;font-weight:500">${E(L?.heiti || "Complete")}${vb.length ? ` <span style="font-size:14px;color:var(--muted)">+ ${E(vb.join(", "))}</span>` : ""}</div>
      <p class="hint" style="margin:6px 0 0">${ent ? "Verð samkvæmt samningi. Ótakmarkaðir vettvangsnotendur." : `${f(GRUNN[kk])} kr. grunngjald + notendur: ${f(T[0])} kr. (1–10), ${f(T[1])} kr. (11–25), ${f(T[2])} kr. (26+) · ${INNI[kk]} vettvangsnotendur fylgja, svo ${f(VETT)} kr. á mann${vb.length ? ` · ${f(AUKA)} kr. á viðbót` : ""} · á mánuði, lágmark ${f(LAGM)} kr., án VSK`}</p></div>
      <div class="card" style="margin-top:12px;overflow-x:auto"><div class="viewtitle">Virkir notendur eftir mánuðum</div>
      ${rows ? `<table class="ptab" style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th style="text-align:left">Mánuður</th><th style="text-align:right">Notendur</th><th style="text-align:right">Vettvangsnotendur</th><th style="text-align:right">Áætlað gjald</th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="hint">Engin notkun skráð enn.</p>`}
      <p class="hint" style="margin-top:10px">Notandi telst virkur í mánuði ef hann opnar Atrium a.m.k. einu sinni. Hlutverkið Vettvangur er valið í Stillingar › Fólk.</p></div>`;
  }
  const add = () => { if (typeof STPAGES === "undefined") return false; STPAGES.askrift = { l: "Áskrift", d: "Leið, virkir notendur og áætlað mánaðargjald", s: ["Áskrift", "Notendur", "Verð"], adm: 1, fn: () => html() }; return true; };
  if (!add()) { const iv = setInterval(() => { if (add()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }
})();
