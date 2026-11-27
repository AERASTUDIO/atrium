/* Fjölval með leit (2.100.2): gátreitalistar starfsfólks (.chks með input[name="fstf"]) verða að leitarreit með fellilista.
   Valdir birtast sem merki fyrir ofan reitinn (× fjarlægir). Upprunalegu gátreitirnir haldast faldir í forminu, svo vistun
   les þá óbreytt (input[name="fstf"]:checked). */
(function () {
  const E = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ð/g, "d").replace(/þ/g, "th").replace(/æ/g, "ae");
  const css = document.createElement("style");
  css.textContent = `
  .vlj { position: relative; margin-top: 4px; }
  .vlj .vljm { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .vlj .vljm:empty { display: none; }
  .vlj .vljc { display: inline-flex; align-items: center; gap: 4px; padding: 4px 4px 4px 12px; border-radius: 999px; background: var(--accent-soft, #e3f0f4); color: var(--ink, #0f2530); font-size: 14px; }
  .vlj .vljc button { border: 0; background: transparent; color: inherit; font: inherit; font-size: 16px; width: 28px; height: 28px; border-radius: 999px; cursor: pointer; line-height: 1; }
  .vlj .vljc button:hover { background: rgba(0,0,0,.08); }
  .vlj input.vljq { width: 100%; }
  .vlj .vljl { position: absolute; left: 0; right: 0; top: 100%; z-index: 60; margin-top: 4px; max-height: 240px; overflow: auto; background: var(--card, #fff); border: 1px solid var(--line, #dce5e9); border-radius: 12px; box-shadow: 0 8px 24px rgba(15,37,48,.14); padding: 4px; }
  .vlj .vljl[hidden] { display: none; }
  .vlj .vljo { display: block; width: 100%; text-align: left; border: 0; background: transparent; font: inherit; font-size: 14.5px; color: var(--ink, #0f2530); padding: 10px 12px; border-radius: 8px; cursor: pointer; min-height: 40px; }
  .vlj .vljo:hover, .vlj .vljo.on { background: var(--accent-soft, #e3f0f4); }
  .vlj .vlje { padding: 10px 12px; font-size: 14px; color: var(--muted); }
  `;
  document.head.appendChild(css);

  function enhance(box) {
    if (box.dataset.vlj) return; box.dataset.vlj = 1;
    const opts = [...box.querySelectorAll('input[type="checkbox"]')].map(i => ({ i, nafn: (i.closest("label")?.textContent || i.value).trim() }));
    if (!opts.length) return;
    box.style.display = "none";
    const w = document.createElement("div"); w.className = "vlj";
    w.innerHTML = `<div class="vljm" aria-live="polite"></div><input type="search" class="vljq" placeholder="Leita og bæta við…" autocomplete="off" aria-label="Leita að starfsmanni" role="combobox" aria-expanded="false"><div class="vljl" role="listbox" hidden></div>`;
    box.after(w);
    const m = w.querySelector(".vljm"), q = w.querySelector(".vljq"), l = w.querySelector(".vljl");
    let act = 0;
    const merki = () => { m.innerHTML = opts.filter(o => o.i.checked).map(o => `<span class="vljc">${E(o.nafn)}<button type="button" data-v="${E(o.i.value)}" aria-label="Fjarlægja ${E(o.nafn)}">×</button></span>`).join(""); };
    const hits = () => { const s = norm(q.value.trim()); return opts.filter(o => !o.i.checked && (!s || norm(o.nafn).includes(s))); };
    const listi = () => { const h = hits(); act = Math.min(act, Math.max(0, h.length - 1));
      l.innerHTML = h.length ? h.map((o, n) => `<button type="button" class="vljo${n === act ? " on" : ""}" role="option" data-v="${E(o.i.value)}">${E(o.nafn)}</button>`).join("") : `<div class="vlje">${opts.some(o => !o.i.checked) ? "Ekkert fannst" : "Allir hafa verið valdir"}</div>`; };
    const opna = () => { listi(); l.hidden = false; q.setAttribute("aria-expanded", "true"); };
    const loka = () => { l.hidden = true; q.setAttribute("aria-expanded", "false"); };
    const velja = v => { const o = opts.find(x => x.i.value === v); if (!o) return; o.i.checked = true; o.i.dispatchEvent(new Event("change", { bubbles: true })); q.value = ""; act = 0; merki(); listi(); q.focus(); };
    q.addEventListener("focus", opna); q.addEventListener("input", () => { act = 0; opna(); });
    q.addEventListener("keydown", e => {
      const h = hits();
      if (e.key === "ArrowDown") { e.preventDefault(); act = Math.min(act + 1, h.length - 1); opna(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); act = Math.max(act - 1, 0); opna(); }
      else if (e.key === "Enter") { e.preventDefault(); if (h[act]) velja(h[act].i.value); }
      else if (e.key === "Escape") { loka(); }
      else if (e.key === "Backspace" && !q.value) { const s = opts.filter(o => o.i.checked).pop(); if (s) { s.i.checked = false; merki(); } }
    });
    l.addEventListener("mousedown", e => e.preventDefault());
    l.addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b) velja(b.dataset.v); });
    m.addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (!b) return; const o = opts.find(x => x.i.value === b.dataset.v); if (o) { o.i.checked = false; o.i.dispatchEvent(new Event("change", { bubbles: true })); merki(); } });
    q.addEventListener("blur", () => setTimeout(loka, 120));
    merki();
  }
  const scan = () => document.querySelectorAll(".chks").forEach(b => { if (b.querySelector('input[name="fstf"]')) enhance(b); });
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", scan);
})();
