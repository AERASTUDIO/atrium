/* Rekstrarlínur (2.95.0) – eining „rlinur“, sjálfgefið óvirk.
   Hvert fyrirtæki skilgreinir sínar eigin rekstrarlínur (t.d. „Drykkjaþjónusta“ hjá party.is, „Hljóðkerfi“ hjá Sonik) sem ganga
   þvert á sviðin Leiga · Sala · Þjónusta. Lína getur átt vöruflokka: tilboð og pantanir með vörum úr þeim flokkum fá línuna sjálfkrafa.
   Gögn: S.stillingar.rlinur = [{ id, heiti, litur, flokkar: [vöruflokkur …] }]
         tilbod/pantanir/verkefni: rlina = id (handvirkt val; annars reiknað út frá línum / tilboðum verkefnisins)
   Val á línu (sía) er munað á tækinu og gildir í listum og yfirlitum Tilboða, Pantana og Verkefna. */
(function () {
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const LSK = "atr-rlina";
  const LITIR = ["#2A7289", "#B2597D", "#B87800", "#1C8C5E", "#5B5FC7", "#8A5A2B", "#4D7584"];
  const on = () => !!(window.ON && ON("rlinur"));
  const CF = () => (typeof S !== "undefined" && S?.stillingar?.rlinur) || [];
  window.RL = () => (on() ? CF() : []);
  const byId = id => CF().find(x => x.id === id);
  const VR = () => (typeof S !== "undefined" && S?.vorur) || [];

  // Lína sem á við: handvirkt val, annars út frá vöruflokkum línanna (algengasta), og fyrir verkefni út frá tilboðum/pöntunum þess
  function ofLines(linur) {
    const L = CF(); if (!L.length || !(linur || []).length) return "";
    const VM = new Map(VR().map(v => [String(v.id), v])), c = {};
    linur.forEach(l => { const v = l.v != null ? VM.get(String(l.v)) : null, fl = v?.flokkur || l.hl || ""; const r = L.find(x => (x.flokkar || []).includes(fl)); if (r) c[r.id] = (c[r.id] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  }
  window.rlOf = function (x) {
    if (!x || !on()) return "";
    if (x.rlina && byId(x.rlina)) return x.rlina;
    if (x.linur) return ofLines(x.linur);
    if (x.nr && !x.linur) { // verkefni
      const T = [...((typeof S !== "undefined" && S?.tilbod) || []), ...((typeof S !== "undefined" && S?.pantanir) || [])].filter(t => t.verkefniId === x.id || (x.tilbodId && t.id === x.tilbodId));
      for (const t of T) { const r = window.rlOf(t); if (r) return r; }
    }
    return "";
  };
  window.rlAuto = x => !!(x && !x.rlina && window.rlOf(x));
  // Valin lína (sía) – "" = allar
  window.RLSEL = () => { if (!on()) return ""; let v = ""; try { v = localStorage.getItem(LSK) || ""; } catch (e) {} return byId(v) ? v : ""; };
  window.rlMatch = x => { const s = window.RLSEL(); return !s || window.rlOf(x) === s; };
  const dot = id => { const r = byId(id); return r ? `<i class="rldot" style="background:${E(r.litur || LITIR[0])}"></i>` : ""; };
  window.rlDot = x => (on() ? dot(window.rlOf(x)) : "");
  window.rlName = x => byId(window.rlOf(x))?.heiti || "";

  // Síustika efst í listum og yfirlitum
  window.rlBar = function () {
    const L = window.RL(); if (!L.length) return "";
    const s = window.RLSEL();
    return `<div class="rlbar" role="tablist" aria-label="Rekstrarlína"><button type="button" class="rlb${!s ? " on" : ""}" data-act="rlsel:">Allar línur</button>${L.map(r => `<button type="button" class="rlb${s === r.id ? " on" : ""}" data-act="rlsel:${E(r.id)}"><i class="rldot" style="background:${E(r.litur || LITIR[0])}"></i>${E(r.heiti)}</button>`).join("")}</div>`;
  };

  // Lína á tilboði/pöntun/verkefni: val (sjálfvirkt merkt „sjálfkrafa“)
  window.rlRowHTML = function (kind, x) {
    const L = window.RL(); if (!L.length || !x) return "";
    const cur = window.rlOf(x), auto = window.rlAuto(x), ed = typeof MCP === "undefined" || MCP;
    const sel = ed ? `<select class="rlsel" aria-label="Rekstrarlína" onchange="doAct('rlset:${kind}:${E(x.id)}:'+this.value)"><option value=""${!x.rlina ? " selected" : ""}>${auto ? "Sjálfkrafa · " + E(byId(cur)?.heiti || "") : "Engin lína"}</option>${L.map(r => `<option value="${E(r.id)}"${x.rlina === r.id ? " selected" : ""}>${E(r.heiti)}</option>`).join("")}</select>` : E(byId(cur)?.heiti || "–");
    return `<div class="rlrow"><span class="kind">Rekstrarlína</span>${dot(cur)}${sel}</div>`;
  };

  // Stillingar › Rekstrarlínur
  function cfgHTML() {
    const L = CF(), fl = [...new Set(VR().map(v => v.flokkur).filter(Boolean))].sort((a, b) => a.localeCompare(b, "is"));
    return `<p class="hint">Rekstrarlínur skipta rekstrinum í hluta sem ganga þvert á leigu, sölu og þjónustu – t.d. „Drykkjaþjónusta“ sem selur drykki, leggur til starfsfólk og leigir bar.
      Tilboð, pantanir og verkefni fá línu (handvirkt eða sjálfkrafa út frá vöruflokkum), og hægt er að sía lista og yfirlit eftir línu.</p>
      ${L.map((r, i) => `<div class="card rlcfg"><div class="two" style="grid-template-columns:1fr auto"><label>Heiti<input data-rl="heiti:${i}" value="${E(r.heiti)}"></label>
        <label>Litur<span class="rllit">${LITIR.map(c => `<button type="button" class="rlc${(r.litur || LITIR[0]) === c ? " on" : ""}" style="background:${c}" data-rlc="${i}:${c}" aria-label="Litur ${c}"></button>`).join("")}</span></label></div>
        <div class="kind" style="margin:8px 0 4px">Vöruflokkar sem tilheyra línunni</div>
        <div class="chks">${fl.length ? fl.map(f => `<label class="chk" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" data-rlf="${i}" value="${E(f)}"${(r.flokkar || []).includes(f) ? " checked" : ""} style="width:auto">${E(f)}</label>`).join("") : `<span class="hint">Engir vöruflokkar í vörulistanum.</span>`}</div>
        <div class="links" style="margin-top:8px"><button type="button" class="btn danger" data-act="rlcfg:del:${i}">Eyða línu</button></div></div>`).join("")}
      <div class="links"><button type="button" class="btn" data-act="rlcfg:add">+ Ný rekstrarlína</button><button type="button" class="btn primary" data-act="rlcfg:save">Vista</button></div>`;
  }
  const readCfg = () => CF().map((r, i) => ({ ...r, heiti: (document.querySelector(`[data-rl="heiti:${i}"]`)?.value || r.heiti || "").trim() || "Lína",
    litur: document.querySelector(`[data-rlc^="${i}:"].on`)?.dataset.rlc.split(":")[1] || r.litur || LITIR[i % LITIR.length],
    flokkar: [...document.querySelectorAll(`[data-rlf="${i}"]:checked`)].map(x => x.value) }));
  const saveCfg = L => saveSnapshot(s => { s.stillingar = s.stillingar || {}; s.stillingar.rlinur = L; });
  document.addEventListener("click", e => { const b = e.target.closest("[data-rlc]"); if (!b) return; e.preventDefault(); const i = b.dataset.rlc.split(":")[0]; document.querySelectorAll(`[data-rlc^="${i}:"]`).forEach(x => x.classList.toggle("on", x === b)); });

  Object.assign(window.ACT_EXT = window.ACT_EXT || {}, {
    rlsel: (k, r) => { try { localStorage.setItem(LSK, r[0] || ""); } catch (e) {} render(); },
    rlset: (k, r) => { const [kind, id, v] = [r[0], r.slice(1, -1).join(":"), r[r.length - 1]];
      saveSnapshot(s => { const L = kind === "verk" ? s.verkefni || [] : [...(s.tilbod || []), ...(s.pantanir || [])], q = L.find(x => String(x.id) === String(id)); if (q) q.rlina = v || null; })
        .then(() => { toast(v ? "Rekstrarlína: " + (byId(v)?.heiti || "") : "Rekstrarlína sjálfkrafa"); render(); }).catch(e => toast(e?.message || String(e))); },
    rlcfg: (k, r) => { const op = r[0];
      if (op === "add") { const L = readCfg(); L.push({ id: "rl" + Date.now().toString(36), heiti: "Ný lína", litur: LITIR[L.length % LITIR.length], flokkar: [] }); saveCfg(L).then(() => render()); return; }
      if (op === "del") { const i = +r[1], L = readCfg(); if (!confirm(`Eyða línunni „${L[i]?.heiti}“? Merkingar á tilboðum og verkefnum hverfa.`)) return; L.splice(i, 1); saveCfg(L).then(() => render()); return; }
      if (op === "save") saveCfg(readCfg()).then(() => { toast("Rekstrarlínur vistaðar"); render(); }); }
  });
  const addPage = () => { if (typeof STPAGES === "undefined") return false; STPAGES.rlinur = { l: "Rekstrarlínur", d: "Eigin rekstrarlínur þvert á leigu, sölu og þjónustu", s: ["Rekstrarlínur", "Drykkjaþjónusta", "Vöruflokkar"], adm: 1, fn: () => cfgHTML() }; return true; };
  if (!addPage()) { const iv = setInterval(() => { if (addPage()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }
})();
