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
  /* 2.151.0: Um Atrium – áskrift, gögnin ykkar (öll gögn í einni Excel-skrá), hvað gerist ef þið hættið, og hjálp */
  const SOFN = [["verkefni", "Verkefni"], ["vidskiptavinir", "Viðskiptavinir"], ["tilbod", "Tilboð og pantanir"], ["reikningar", "Reikningar"], ["timar", "Tímafærslur"], ["kostnadur", "Útlagður kostnaður"], ["fundir", "Fundir"], ["dagsverk", "Vikuplan – verk"], ["vorur", "Vörur og búnaður"]];
  const radir = k => { try { if (k === "timar") return typeof faerslur === "function" ? faerslur() : (S?.timar?.faerslur || []); const v = S?.[k]; return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const flat = v => v == null ? "" : typeof v === "object" ? JSON.stringify(v) : v;
  async function utflutningur() {
    if (!window.makeXlsx) { toast?.("Útflutningur ekki tiltækur"); return; }
    const rows = [[{ v: (window.ORG?.nafn || "Fyrirtækið") + " – öll gögn úr Atrium · " + new Date().toLocaleDateString("is-IS"), s: 1 }], []];
    SOFN.forEach(([k, l]) => { const xs = radir(k); if (!xs.length) return; const keys = [...new Set(xs.flatMap(x => Object.keys(x || {})))].filter(x => !x.startsWith("_"));
      rows.push([{ v: l + " (" + xs.length + ")", s: 1 }], keys.map(x => ({ v: x, s: 3 }))); xs.forEach(x => rows.push(keys.map(c => ({ v: flat(x[c]), s: 4 })))); rows.push([]); });
    const bytes = makeXlsx({ sheet: "Gögn", cols: [], rows }), b = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "Atrium-gogn-" + new Date().toISOString().slice(0, 10) + ".xlsx"; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast?.("Öll gögn sótt í Excel-skrá");
  }
  Object.assign(window.ACT_EXT = window.ACT_EXT || {}, { umx: () => utflutningur() });
  function umHtml() {
    const adm = typeof can === "function" && can("stillingar"), nf = E(window.ORG?.nafn || "fyrirtækisins"), leid = window.leidNu ? leidNu() : null;
    const sec = (t, b) => `<div class="card" style="margin-top:12px"><div class="viewtitle">${t}</div>${b}</div>`;
    return sec("Áskrift", `<p style="margin:0">${leid ? "Leið: <b>" + E(leid.heiti || leid.k || "") + "</b>" + (leid.d ? " – " + E(leid.d) : "") + ". " : ""}Verð fer eftir leið og fjölda virkra notenda í mánuðinum.</p>${adm && STPAGES.askrift && leid ? `<div class="links" style="margin-top:10px"><button type="button" class="btn" data-act="stsub:askrift">Sjá áskrift og mánaðargjald</button></div>` : ""}`)
      + sec("Gögnin ykkar", `<p style="margin:0">Öll gögn sem skráð eru í Atrium – verkefni, viðskiptavinir, tilboð, pantanir, reikningar, tímar, fundir og vikuplan – eru eign ${nf}. AERA Studio notar þau ekki í öðrum tilgangi.</p>${adm ? `<div class="links" style="margin-top:10px"><button type="button" class="btn primary" data-act="umx:xlsx">Sækja öll gögn (Excel)</button></div><p class="hint" style="margin:8px 0 0">Ein skrá með öllum söfnum, hvert á eftir öðru. Inniheldur persónuupplýsingar – geymið á öruggum stað.</p>` : `<p class="hint" style="margin:8px 0 0">Stjórnandi getur sótt öll gögnin í Excel.</p>`}`)
      + sec("Ef þið hættið", `<p style="margin:0">Þið fáið öll gögnin afhent í Excel og sem JSON-afrit. Skjöl sem appið hefur vistað eru þegar á ykkar SharePoint/OneDrive og verða þar áfram. Að því loknu er gögnunum eytt úr Atrium.</p>`)
      + sec("Hjálp", `<p style="margin:0">Við „?“ í Stillingum eru stuttar skýringar á hugtökum. Spurningar og óskir um nýja virkni: hafið samband við AERA Studio.</p><p class="hint" style="margin:8px 0 0">Útgáfa ${E(typeof APP_VERSION !== "undefined" ? APP_VERSION : "")}</p>`);
  }
  const add = () => { if (typeof STPAGES === "undefined") return false; STPAGES.askrift = { l: "Áskrift", d: "Leið, virkir notendur og áætlað mánaðargjald", s: ["Áskrift", "Notendur", "Verð"], adm: 1, fn: () => html() };
    STPAGES.um = { l: "Um Atrium", d: "Áskrift, gögnin ykkar, útflutningur og hjálp", s: ["Um Atrium", "Gögn", "Útflutningur", "Hjálp"], fn: () => umHtml() }; return true; };
  if (!add()) { const iv = setInterval(() => { if (add()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }
})();
