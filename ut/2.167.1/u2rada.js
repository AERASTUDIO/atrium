/* u2rada.js (2.145.1) – Smellt á dálkaheiti í listum (.ucols) raðar eftir þeim dálki.
   Fyrsti smellur: hækkandi, annar: lækkandi, þriðji: upprunaleg röð. Röðunin helst þegar listinn teiknast aftur (á meðan flipinn er opinn).
   Raðað er innan hverrar samfelldrar runu af línum (.urow), svo hópfyrirsagnir haldast á sínum stað.
   Gildi eru lesin úr textanum: dagsetningar („13. nóv“, „13.11.2026“, ISO), krónur og klst. („1.302.992 kr.“, „24,5 klst.“), annars stafrófsröð (íslensk, tölur í réttri röð). */
(function () {
  const MAN = { jan: 1, feb: 2, mar: 3, apr: 4, maí: 5, mai: 5, jún: 6, jun: 6, júl: 7, jul: 7, ágú: 8, ágú: 8, agu: 8, sep: 9, okt: 10, nóv: 11, nov: 11, des: 12 };
  const SORT = {};   // lykill (flipi + númer lista) → { i, dir }
  let busy = false;
  const keyOf = hd => { const all = [...document.querySelectorAll("#view .ucols")]; return (window.tab || "") + ":" + (window.DTAB || "") + ":" + all.indexOf(hd); };
  function val(t) {
    t = String(t || "").replace(/\s+/g, " ").trim(); if (!t || t === "–" || t === "-") return null;
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return { n: +new Date(+m[1], m[2] - 1, +m[3]) };
    m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/); if (m) return { n: +new Date(+m[3], m[2] - 1, +m[1]) };
    m = t.match(/^(\d{1,2})\.\s*([a-záéíóúýþæöð]{3})[a-záéíóúýþæöð]*\.?(?:\s+(\d{4}))?/i);
    if (m && MAN[m[2].toLowerCase()]) { const now = new Date(), y = m[3] ? +m[3] : now.getFullYear(); return { n: +new Date(y, MAN[m[2].toLowerCase()] - 1, +m[1]) }; }
    m = t.match(/^-?[\d.]+(,\d+)?\s*(kr\.?|klst\.?|stk\.?|%|m\.kr\.?|tæki|dagar?)?\b/i);
    if (m && /\d/.test(m[0]) && !/^\d{4}-\d/.test(t)) { const n = parseFloat(m[0].replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); if (!isNaN(n)) return { n: m[0].trim().startsWith("-") ? -Math.abs(n) : n }; }
    return { s: t };
  }
  const cmp = (a, b) => { if (a == null && b == null) return 0; if (a == null) return 1; if (b == null) return -1;
    if (a.n != null && b.n != null) return a.n - b.n; if (a.n != null) return -1; if (b.n != null) return 1;
    return a.s.localeCompare(b.s, "is", { numeric: true, sensitivity: "base" }); };
  function runs(hd) {
    const R = []; let cur = null;
    for (let n = hd.nextElementSibling; n && !n.classList.contains("ucols"); n = n.nextElementSibling) {
      if (n.classList.contains("urow")) { if (!cur) R.push(cur = []); cur.push(n); } else cur = null;
    }
    return R;
  }
  function apply(hd, st) {
    const cells = [...hd.children];
    cells.forEach((c, i) => { c.classList.toggle("u2s-asc", !!st && st.i === i && st.dir === 1); c.classList.toggle("u2s-desc", !!st && st.i === i && st.dir === -1);
      c.setAttribute("aria-sort", st && st.i === i ? (st.dir === 1 ? "ascending" : "descending") : "none"); });
    // Dálkur í línu = sá hluti línunnar sem stendur næst dálkaheitinu lárétt (línur geta haft auka hluta, t.d. gátreit eða litarönd)
    const colOf = (row, i) => { const h = cells[i]?.getBoundingClientRect(); if (!h || !h.width) return row.children[i]; let best = null, bd = 1e9;
      [...row.children].forEach(c => { const r = c.getBoundingClientRect(); if (!r.width) return; const d = Math.abs(r.left - h.left) + (r.right < h.left || r.left > h.right ? 1000 : 0); if (d < bd) { bd = d; best = c; } }); return best; };
    runs(hd).forEach(rows => {
      rows.forEach((r, k) => { if (r.dataset.oi == null) r.dataset.oi = k; });
      const par = rows[0].parentNode, after = rows[rows.length - 1].nextSibling;
      const V = new Map(); if (st) rows.forEach(r => V.set(r, val(colOf(r, st.i)?.textContent)));
      const sorted = rows.slice().sort((a, b) => !st ? a.dataset.oi - b.dataset.oi : (cmp(V.get(a), V.get(b)) * (V.get(a) == null || V.get(b) == null ? 1 : st.dir)) || a.dataset.oi - b.dataset.oi);
      if (sorted.every((r, k) => r === rows[k])) return;
      const frag = document.createDocumentFragment(); sorted.forEach(r => frag.append(r)); par.insertBefore(frag, after);
    });
  }
  function prep() {
    document.querySelectorAll("#view .ucols").forEach(hd => {
      if (!runs(hd).some(r => r.length > 1)) return;
      [...hd.children].forEach(c => { if (!c.textContent.trim() || c.dataset.u2s) return; c.dataset.u2s = "1"; c.setAttribute("role", "button"); c.tabIndex = 0; c.title = "Raða eftir " + c.textContent.trim().toLowerCase(); });
      const st = SORT[keyOf(hd)]; if (st) apply(hd, st);
    });
  }
  function click(c) {
    const hd = c.parentElement, i = [...hd.children].indexOf(c), k = keyOf(hd), st = SORT[k];
    const nx = !st || st.i !== i ? { i, dir: 1 } : st.dir === 1 ? { i, dir: -1 } : null;
    if (nx) SORT[k] = nx; else delete SORT[k];
    busy = true; try { apply(hd, nx); } finally { busy = false; }
  }
  document.addEventListener("click", e => { const c = e.target.closest?.("#view .ucols > [data-u2s]"); if (!c) return; e.preventDefault(); e.stopPropagation(); click(c); }, true);
  document.addEventListener("keydown", e => { const c = e.target.closest?.("#view .ucols > [data-u2s]"); if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); click(c); } });
  let raf = 0;
  const start = () => { const v = document.getElementById("view"); if (!v) return setTimeout(start, 200);
    new MutationObserver(() => { if (busy || raf) return; raf = requestAnimationFrame(() => { raf = 0; busy = true; try { prep(); } catch (e) {} busy = false; }); }).observe(v, { childList: true, subtree: true });
    prep(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
