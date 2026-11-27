/* u2fleiri.js (2.145.16) – Langir listar: fyrstu 100 línurnar sýndar og hnappurinn „Sýna fleiri“ undir.
   Á við samfelldar runur af línum (.urow, .lrow) með fleiri en 120 línum, t.d. Tímar › Færslur.
   Hópaðir listar (t.d. verkefni eftir stöðu) eru ekki styttir – þar reiknar vafrinn aðeins út línur sem sjást (content-visibility í u2d.css).
   Röðun (u2rada.js) og leit virka áfram: eftir hverja breytingu eru fyrstu 100 í núverandi röð sýndar. */
(function () {
  const ROW = ".urow,.lrow", LIM = 100, MIN = 120, STEP = 200;
  const OPEN = {};            // lykill (flipi + númer runu) → fjöldi sýndra lína
  let busy = false, raf = 0, lastTab = null;
  const isRow = n => n.nodeType === 1 && n.matches(ROW) && !n.classList.contains("u2more");
  function runs(v) {
    const out = [], seen = new Set();
    v.querySelectorAll(ROW).forEach(r => {
      const par = r.parentElement; if (!par || seen.has(par) || r.closest(".spdet")) return; seen.add(par);
      let cur = [];
      for (const n of par.children) { if (isRow(n)) cur.push(n); else if (n.classList?.contains("u2more")) continue; else { if (cur.length) out.push(cur); cur = []; } }
      if (cur.length) out.push(cur);
    });
    return out;
  }
  function apply() {
    raf = 0; const v = document.getElementById("view"); if (!v || busy) return; busy = true;
    try {
      const tk = (typeof tab !== "undefined" ? tab : "") + "|" + (typeof DTAB !== "undefined" ? DTAB : "") + "|" + (typeof DETAIL !== "undefined" ? "" : ""); if (tk !== lastTab) { lastTab = tk; for (const k in OPEN) delete OPEN[k]; }
      v.querySelectorAll(".u2more").forEach(b => { if (!b.previousElementSibling || !isRow(b.previousElementSibling)) b.remove(); });
      runs(v).forEach((rows, i) => {
        const key = tk + ":" + i, last = rows[rows.length - 1], btn = last.nextElementSibling?.classList?.contains("u2more") ? last.nextElementSibling : null;
        if (rows.length <= MIN) { rows.forEach(r => r.classList.remove("u2hid")); btn?.remove(); return; }
        const n = Math.min(rows.length, OPEN[key] || LIM);
        rows.forEach((r, k) => r.classList.toggle("u2hid", k >= n));
        const rest = rows.length - n;
        if (!rest) { btn?.remove(); return; }
        const b = btn || document.createElement("button");
        if (!btn) { b.type = "button"; b.className = "u2more"; last.after(b); }
        b.dataset.key = key; b.dataset.n = String(n);
        b.textContent = `Sýna fleiri (${rest} eftir)`;
      });
    } catch (e) { console.warn("u2fleiri", e); }
    busy = false;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(apply); };
  document.addEventListener("click", e => {
    const b = e.target.closest?.("#view .u2more"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    OPEN[b.dataset.key] = (+b.dataset.n || LIM) + STEP; apply();
  }, true);
  const start = () => {
    const v = document.getElementById("view"); if (!v) return setTimeout(start, 200);
    new MutationObserver(() => { if (!busy) kick(); }).observe(v, { childList: true, subtree: true });
    kick();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
