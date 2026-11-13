/* samraemi.js (2.148.0) – Dálkar í breiðum listum (.uwl) aðlagast plássinu.
   Listarnir skilgreina dálka í --g (t.d. „80px minmax(0,1.4fr) … 170px 100px“). Þegar listinn er mjórri en föstu dálkarnir
   leyfa fengu sveigjanlegu dálkarnir (Heiti, Viðskiptavinur) of lítið pláss og heitin styttust í „Fundarsalu…“.
   Hér eru síst mikilvægu dálkarnir faldir (eftir fyrirsögn) þar til Heiti fær a.m.k. 180 px; þeir birtast aftur þegar plássið stækkar. */
(function () {
  // Röð: fyrst falið (aftast í listanum = mikilvægast að halda)
  const ORDER = ["Stofnandi", "Línur", "Starfsfólk", "Fundargerð", "Kl.", "Tengiliður", "Sími", "Lágmark", "Í tilboðum", "Í viðgerð", "Eining", "Tegund", "Verkefni", "Tímabil", "Afhending", "Skil", "Starfsmaður", "Netfang", "Flokkur", "Svið", "Verkflokkur", "Næst í útleigu", "Viðskipti 12 mán."];
  const MIN_FLEX = 180, GAP = 16;
  const px = t => /^\d+(\.\d+)?px$/.test(t) ? parseFloat(t) : null;
  const toks = g => { const out = []; let d = 0, cur = ""; for (const ch of g.trim()) { if (ch === "(") d++; if (ch === ")") d--; if (ch === " " && !d) { if (cur) out.push(cur); cur = ""; } else cur += ch; } if (cur) out.push(cur); return out; };
  function fit(w) {
    const g0 = w.dataset.g0 || w.style.getPropertyValue("--g"); if (!g0) return;
    w.dataset.g0 = g0;
    const cols = toks(g0), head = w.querySelector(":scope > .ucols"); if (!head) return;
    const labels = [...head.children].map(s => s.textContent.trim());
    if (labels.length !== cols.length) return;
    const width = w.clientWidth - 48; if (width <= 0) return;   // innra bil raða
    const hide = new Set();
    const flexCount = () => cols.filter((c, i) => !hide.has(i) && px(c) == null).length || 1;
    const fixed = () => cols.reduce((a, c, i) => a + (hide.has(i) ? 0 : (px(c) || 0)), 0) + GAP * (cols.length - hide.size - 1);
    for (const name of ORDER) {
      if ((width - fixed()) / flexCount() >= MIN_FLEX) break;
      const i = labels.indexOf(name); if (i <= 0 || hide.has(i)) continue;
      if (px(cols[i]) == null && flexCount() <= 1) continue;
      hide.add(i);
    }
    const key = [...hide].sort().join(",");
    if (w.dataset.hid !== key) { w.dataset.hid = key; w.style.setProperty("--g", cols.filter((c, i) => !hide.has(i)).join(" ")); }
    // líka línur sem bætast við síðar („Sýna fleiri“)
    w.querySelectorAll(":scope > .ucols, :scope > .urow, :scope > a.urow").forEach(r => { if (r.dataset.hk === key) return; r.dataset.hk = key; [...r.children].forEach((c, i) => { if (hide.has(i)) c.setAttribute("data-u2hid", ""); else c.removeAttribute("data-u2hid"); }); });
  }
  // Vikudagatal teymis: hve margar línur heitis rúmast í reitnum (hæð reits − tími)
  function dwe(e) { const b = e.querySelector(":scope > b"); if (!b) return; const sm = e.querySelector(":scope > small"); const h = e.clientHeight - 8 - (sm ? sm.offsetHeight + 1 : 0); const n = Math.max(1, Math.min(4, Math.floor(h / 15.6))); if (e.style.getPropertyValue("--lc") != n) e.style.setProperty("--lc", n); }
  let raf = 0;
  const run = () => { raf = 0; document.querySelectorAll("#view .uwl").forEach(fit); document.querySelectorAll("#view .dwe").forEach(dwe); };
  const kick = () => { if (!raf) raf = requestAnimationFrame(run); };
  addEventListener("resize", () => { document.querySelectorAll("#view .uwl").forEach(w => delete w.dataset.hid); kick(); });
  const start = () => { const v = document.getElementById("view"); if (!v) return setTimeout(start, 300); new MutationObserver(m => { if (m.some(r => [...r.addedNodes].some(n => n.nodeType === 1))) kick(); }).observe(v, { childList: true, subtree: true }); kick(); };
  start();
})();
