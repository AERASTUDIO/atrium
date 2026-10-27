/* Hausflipar (2.104.0, útlit I): hlutar með Yfirliti og lista (Verkefni, Pantanir, Viðskiptavinir, Tilboð, Reikningar, Vörulisti)
   eru einn liður í vinstri stikunni. Flipar hlutans (Yfirlit · listinn · svið) birtast efst á síðunni, við hlið titilsins.
   Hvaða flipar: app-grunnur.js › applyEin (sec.hdr). Í síma eru flipar hlutans áfram eins og áður (simi.js). */
(function () {
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const css = document.createElement("style");
  css.textContent = `
  .hdtabs { display: inline-flex; gap: 2px; padding: 3px; border-radius: 11px; background: color-mix(in srgb, var(--line) 50%, transparent); margin: 0 auto 0 28px; align-self: center; flex-wrap: wrap; }
  .hdtabs button { border: 0; background: transparent; font: inherit; font-size: 13.5px; color: var(--muted); padding: 0 14px; min-height: 34px; border-radius: 8px; cursor: pointer; white-space: nowrap; }
  .hdtabs button:hover { color: var(--ink); }
  .hdtabs button[aria-selected="true"] { background: var(--surface, #fff); color: var(--ink); font-weight: 500; box-shadow: 0 1px 2px rgba(15,37,48,.1); }
  .uhead.hashd, .phrow.hashd { align-items: center; }
  `;
  document.head.appendChild(css);
  const desk = () => matchMedia("(min-width:1024px)").matches;
  function inject() {
    if (!desk() || typeof DETAIL === "undefined" || DETAIL || typeof secOf !== "function") return;
    const sec = secOf(tab); if (!sec || !sec.hdr) return;
    const vis = sec.tabs.filter(t => !t[2]); if (vis.length < 2) return;
    const v = document.getElementById("view"); if (!v || v.querySelector(".hdtabs")) return;
    const html = `<div class="hdtabs" role="tablist" aria-label="${E(sec.l)}">${vis.map(([k, l]) => `<button type="button" role="tab" data-act="tab:${E(k)}" aria-selected="${k === tab}">${E(l)}</button>`).join("")}</div>`;
    const uh = v.querySelector(".uhead"), pr = v.querySelector(".phead .phrow");
    if (uh && uh.firstElementChild) { uh.firstElementChild.insertAdjacentHTML("afterend", html); uh.classList.add("hashd"); }
    else if (pr) { const t = pr.querySelector(".ptitle"); (t || pr.firstElementChild)?.insertAdjacentHTML("afterend", html); pr.classList.add("hashd"); }
  }
  const wrap = () => {
    if (typeof window.render !== "function" || window.render.__hd) return;
    const o = window.render;
    window.render = function () { const r = o.apply(this, arguments); try { inject(); } catch (e) { console.warn("hausflipar", e); } return r; };
    window.render.__hd = true;
  };
  wrap(); document.addEventListener("DOMContentLoaded", wrap); setTimeout(wrap, 0);
  // útlit I teiknar suma lista eftir á (t.d. leit) – fylgjast líka með breytingum
  new MutationObserver(() => { try { inject(); } catch (e) {} }).observe(document.documentElement, { childList: true, subtree: true });
})();
