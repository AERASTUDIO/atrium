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
        ${o.inntak ? `<label class="spurn-i"><span>${E(o.inntak.label || "")}</span><input type="${E(o.inntak.type || "text")}" value="${E(o.inntak.value || "")}" placeholder="${E(o.inntak.ph || "")}"></label>` : ""}
        ${o.ath ? `<p class="spurn-ath">${E(o.ath)}</p>` : ""}
        <div class="spurn-b">${o.ein ? "" : `<button type="button" class="btn" data-s="0">${E(o.nei || "Hætta við")}</button>`}<button type="button" class="btn primary${o.haetta ? " spurn-d" : ""}" data-s="1">${E(o.ja || "Staðfesta")}</button></div></div>`;
      const done0 = v => { if (v && o.inntak) { const x = w.querySelector(".spurn-i input").value.trim(); if (o.inntak.krafist && !x) { w.querySelector(".spurn-i input").focus(); return; } v = x || true; } done(v); };
      const done = v => { document.removeEventListener("keydown", key, true); w.classList.add("ut"); setTimeout(() => w.remove(), 160); try { prev && prev.focus && prev.focus(); } catch (e) {} res(v); };
      const key = e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(false); } else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); const f = document.activeElement?.closest?.("[data-s]"); /* 2.120.1: Enter virkjar hnappinn sem hefur fókus; eyðing aldrei óvart með Enter */ if (f && w.contains(f)) done0(f.dataset.s === "1"); else if (!o.haetta || o.inntak) done0(true); } };
      w.addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (b) done0(b.dataset.s === "1"); else if (e.target === w) done(false); });
      document.addEventListener("keydown", key, true); document.body.appendChild(w);
      requestAnimationFrame(() => { w.classList.add("inn"); (w.querySelector(".spurn-i input") || (o.haetta && w.querySelector('[data-s="0"]')) || w.querySelector('[data-s="1"]')).focus(); });
    });
  };
  /* 2.120.1: í stað confirm() og alert() vafrans – sami gluggi alls staðar.
     atrJa("Spurning?\n\nNánari skýring", { ja, haetta }) → Promise<boolean>. Fyrri hlutinn verður fyrirsögn, sá seinni texti.
     atrSegja("Skilaboð", "Fyrirsögn") → Promise (einn hnappur, „Í lagi“). */
  const skipta = t => { t = String(t ?? ""); let i = t.indexOf("\n\n");
    if (i < 0 && t.length > 80) { const q = t.search(/[?.:] /); if (q > 0 && q < 110) i = q + 1; }
    return i > 0 ? [t.slice(0, i).trim(), t.slice(i).trim()] : [t, ""]; };
  const ORD = [[/^Eyða/, "Eyða", 1], [/^Fjarlægja/, "Fjarlægja", 1], [/^Nafnhreinsa/, "Nafnhreinsa", 1], [/^Gleyma/, "Gleyma", 1], [/^Aftengja/, "Aftengja"], [/^Loka/, "Loka"], [/^Afturkalla/, "Afturkalla"], [/^Hætta við/, "Já, hætta við", 1], [/^Færa/, "Færa"], [/^Merkja/, "Merkja"], [/^Stofna/, "Stofna"], [/^Staðfesta/, "Staðfesta"], [/^Skrá/, "Skrá"], [/^Afrita/, "Afrita"], [/^Setja/, "Setja"], [/^Gera/, "Já"], [/^Búa til/, "Búa til"], [/^Gefa/, "Gefa"]];
  window.atrJa = function (texti, o = {}) {
    const [titill, rest] = skipta(texti), m = ORD.find(([r]) => r.test(titill)) || [];
    return atrSpurn({ titill, texti: rest, ja: o.ja || m[1] || "Halda áfram", nei: o.nei, haetta: o.haetta ?? !!m[2], ath: o.ath });
  };
  window.atrSegja = function (texti, titill) {
    const [t, rest] = titill ? [titill, String(texti ?? "")] : skipta(texti);
    return atrSpurn({ titill: t, texti: rest, ja: "Í lagi", ein: true });
  };
})();
/* 2.120.2: Tvísmellur á aðalhnapp (vista, senda, stofna, staðfesta) keyrir aðgerðina aðeins einu sinni. Seinni smellur á sama hnapp
   innan 0,7 sek. er hunsaður – líka þótt skjárinn hafi teiknast upp á nýtt á milli (hnappurinn þekktur á aðgerð, id eða texta). */
(function () {
  let last = { k: "", t: 0 };
  document.addEventListener("click", e => {
    const b = e.target.closest?.("button.primary, .btn.primary, [data-einu]"); if (!b || b.disabled) return;
    const k = (b.dataset.act || b.dataset.pf || b.dataset.s || b.id || "") + "|" + (b.textContent || "").trim().slice(0, 40), t = performance.now();
    if (k === last.k && t - last.t < 700) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    last = { k, t };
  }, true);
})();
/* 2.120.4: í stað prompt() – atrSpyrja("Fyrirsögn", "sjálfgefið", { label, texti, ph, ja, type }) → Promise<string|null> (null = hætt við) */
window.atrSpyrja = async function (titill, gildi, o = {}) {
  const v = await atrSpurn({ titill, texti: o.texti, ja: o.ja || "Vista", haetta: o.haetta, inntak: { label: o.label || "", value: gildi ?? "", ph: o.ph || "", type: o.type || "text", krafist: !!o.krafist } });
  return v === false ? null : v === true ? "" : String(v);
};
