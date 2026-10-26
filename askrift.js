/* Áskrift (2.97.0) – Stillingar › Áskrift (admin): leið uppsetningarinnar og virkir notendur hvers mánaðar,
   skipt í skrifstofu og vettvang, með áætluðu mánaðargjaldi. Gögn: app/notkun = { "ÁÁÁÁ-MM": { "<netfang>": "s"|"v" } },
   sem hver notandi skráir sjálfur þegar appið opnast (firebase.js; firestore.rules leyfa aðeins eigið netfang og rétt hlutverk). */
(function () {
  const VERD = { core: [4900, 2400], pro: [7900, 3900], complete: [9900, 4900] }, VETT = 990, LAGM = 9900, AUKA = 4900;
  const MN = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
  const f = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  let NOTKUN = null, sott = 0;
  window.askriftVerd = (leid, s, v, auka) => { const [b, u] = VERD[leid] || VERD.complete, raw = b + u * s + VETT * v + AUKA * (auka || 0); return Math.max(LAGM, raw); };
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
      const [y, m] = mo.split("-"); return `<tr><td>${MN[+m - 1]} ${y}</td><td style="text-align:right">${s}</td><td style="text-align:right">${v}</td><td style="text-align:right">${f(window.askriftVerd(k, s, v, auka))} kr.</td></tr>`; }).join("");
    const [b, u] = VERD[k] || VERD.complete;
    return `<div class="card" style="margin-top:14px"><div style="font-size:13px;color:var(--muted)">Leið</div>
      <div style="font-size:22px;font-weight:500">${E(L?.heiti || "Complete")}${auka ? ` <span style="font-size:14px;color:var(--muted)">+ ${E((L.auka || []).map(p => window.PAKKAR?.[p]?.[0] || p).join(", "))}</span>` : ""}</div>
      <p class="hint" style="margin:6px 0 0">${f(b)} kr. grunngjald + ${f(u)} kr. á skrifstofunotanda + ${f(VETT)} kr. á vettvangsnotanda${auka ? ` + ${f(AUKA)} kr. á stakan pakka` : ""} á mánuði · lágmark ${f(LAGM)} kr. · án VSK</p></div>
      <div class="card" style="margin-top:12px;overflow-x:auto"><div class="viewtitle">Virkir notendur eftir mánuðum</div>
      ${rows ? `<table class="ptab" style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th style="text-align:left">Mánuður</th><th style="text-align:right">Skrifstofa</th><th style="text-align:right">Vettvangur</th><th style="text-align:right">Áætlað gjald</th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="hint">Engin notkun skráð enn.</p>`}
      <p class="hint" style="margin-top:10px">Notandi telst virkur í mánuði ef hann opnar Atrium a.m.k. einu sinni. Hlutverkið Vettvangur er valið í Stillingar › Fólk.</p></div>`;
  }
  const add = () => { if (typeof STPAGES === "undefined") return false; STPAGES.askrift = { l: "Áskrift", d: "Leið, virkir notendur og áætlað mánaðargjald", s: ["Áskrift", "Notendur", "Verð"], adm: 1, fn: () => html() }; return true; };
  if (!add()) { const iv = setInterval(() => { if (add()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }
})();
