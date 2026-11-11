/* Staðfestingargluggi í útliti Atrium (2.119.1) – kemur í stað innbyggða confirm() vafrans þar sem það skiptir máli.
   atrSpurn({ titill, texti, atridi: [ "…" | { t, tak } ], ath, ja, nei, haetta }) → Promise<boolean>
   tak: "ok" | "info" | "hætta"; haetta: true = rauður staðfestingarhnappur */
(function () {
  const E = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const IC = {
    ok: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    info: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="2.2" fill="currentColor"/></svg>',
    "hætta": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5.5v5.5M10 14.2v.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };
  window.atrSpurn = function (o = {}) {
    return new Promise(res => {
      const prev = document.activeElement, w = document.createElement("div");
      w.className = "spurn-w"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true");
      const at = (o.atridi || []).map(a => typeof a === "string" ? { t: a, tak: "ok" } : a);
      w.innerHTML = `<div class="spurn" tabindex="-1">
        ${o.yfir ? `<div class="spurn-yfir">${E(o.yfir)}</div>` : ""}
        <h3 class="spurn-t">${E(o.titill || "Ertu viss?")}</h3>
        ${o.texti ? `<p class="spurn-x">${o.textiHTML ? o.texti : E(o.texti)}</p>` : ""}
        ${o.upphaed ? `<div class="spurn-u"><span>${E(o.upphaedL || "Upphæð")}</span><b>${E(o.upphaed)}</b></div>` : ""}
        ${at.length ? `<ul class="spurn-l">${at.map(a => `<li class="${E(a.tak || "ok")}"><i>${IC[a.tak || "ok"] || IC.ok}</i><span>${E(a.t)}</span></li>`).join("")}</ul>` : ""}
        ${o.ath ? `<p class="spurn-ath">${E(o.ath)}</p>` : ""}
        <div class="spurn-b"><button type="button" class="btn" data-s="0">${E(o.nei || "Hætta við")}</button><button type="button" class="btn primary${o.haetta ? " spurn-d" : ""}" data-s="1">${E(o.ja || "Staðfesta")}</button></div></div>`;
      const done = v => { document.removeEventListener("keydown", key, true); w.classList.add("ut"); setTimeout(() => w.remove(), 160); try { prev && prev.focus && prev.focus(); } catch (e) {} res(v); };
      const key = e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(false); } else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); done(true); } };
      w.addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (b) done(b.dataset.s === "1"); else if (e.target === w) done(false); });
      document.addEventListener("keydown", key, true); document.body.appendChild(w);
      requestAnimationFrame(() => { w.classList.add("inn"); w.querySelector('[data-s="1"]').focus(); });
    });
  };
})();
