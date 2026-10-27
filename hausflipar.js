/* Hausflipar (2.104.0, útlit I): hlutar með Yfirliti og lista (Verkefni, Pantanir, Viðskiptavinir, Tilboð, Reikningar, Vörulisti)
   eru einn liður í vinstri stikunni. Flipar hlutans (Yfirlit · listinn · svið) birtast efst á síðunni, við hlið titilsins.
   Hvaða flipar: app-grunnur.js › applyEin (sec.hdr). Í síma eru flipar hlutans áfram eins og áður (simi.js). */
(function () {
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const css = document.createElement("style");
  css.textContent = `
  /* 2.104.1: sama breidd á spjaldinu í öllum skjám, flipar skipta henni jafnt; titillinn fær fasta lágmarksbreidd svo fliparnir byrji alltaf á sama stað */
  .hdtabs { display: flex; flex: none; width: clamp(380px, calc(100vw - 860px), 560px); gap: 3px; padding: 4px; border-radius: 12px; background: color-mix(in srgb, var(--line) 50%, transparent); margin: 0 auto 0 24px; align-self: center; box-sizing: border-box; }
  .hdtabs button { flex: 1 1 0; min-width: 0; border: 0; background: transparent; font: inherit; font-size: 14.5px; color: var(--muted); padding: 0 12px; min-height: 42px; border-radius: 9px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #view .hdtt { min-width: 230px; flex: 0 0 auto; }
  #view .hdhead { margin-top: 0; padding-top: 18px; }
  #view .hdhead .spsup ~ .spsup { display: none; } #view .hdhead .spsup { padding: 0 0 2px; line-height: 17px; margin: 0; } #view .phead.hdhead { gap: 0; }
  @media (max-width: 1300px) { .hdtabs button { padding: 0 4px; font-size: 13.5px; } #view .hdtt { min-width: 180px; } }
  @media (max-width: 1100px) { #view .hdtt { min-width: 150px; } .hdtabs { margin-left: 16px; } }
  #view .hdhead .btn { white-space: nowrap; flex: none; }
  #view .hdhead .ptitle { line-height: 1.2 !important; margin: 0 !important; }
  #view .hdhead .phrow.hashd { display: flex; align-items: center; min-height: 50px; }
  #view .uhead.hdhead { align-items: flex-end; } #view .uhead.hdhead > :first-child { flex: 1 1 auto; min-width: 0; } #view .uhead.hdhead .uhr { align-self: center; margin-top: auto; }
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
    // Titill síðunnar = heiti flipans (t.d. „Pantanir“, „Allar“, „Sala“, „Yfirlit“) og yfirfyrirsögn = heiti hlutans – alls staðar eins
    const cur = sec.tabs.find(t => t[0] === tab), tt = v.querySelector(".uhead .ptitle, .phead .ptitle"), sp = v.querySelector(".uhead .spsup, .phead .spsup");
     if (cur && tt && !cur[2]) tt.textContent = cur[1];
    if (sp) sp.textContent = sec.l; else if (tt && cur) (tt.closest(".phrow") || tt).insertAdjacentHTML("beforebegin", `<div class="spsup">${E(sec.l)}</div>`);
    const html = `<div class="hdtabs" role="tablist" aria-label="${E(sec.l)}">${vis.map(([k, l]) => `<button type="button" role="tab" data-act="tab:${E(k)}" aria-selected="${k === tab}">${E(l)}</button>`).join("")}</div>`;
    const uh = v.querySelector(".uhead"), pr = v.querySelector(".phead .phrow");
    // Sama staðsetning í öllum skjám: haus með sama bili að ofan, aðeins ein yfirfyrirsögn
    const hd = uh || v.querySelector(".phead"); if (hd) hd.classList.add("hdhead");
    // Yfirlitsskjáir (.uhead) fá sömu röð og listarnir (.phrow): titill og flipar í einni línu
    let row = pr;
    if (!row && uh && tt) { row = document.createElement("div"); row.className = "phrow hdrow"; tt.before(row); row.appendChild(tt); }
    if (row) { const t = row.querySelector(".ptitle") || row.firstElementChild; t?.classList.add("hdtt"); t?.insertAdjacentHTML("afterend", html); row.classList.add("hashd"); }
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
