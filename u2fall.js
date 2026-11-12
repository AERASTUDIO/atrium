/* u2fall.js (2.142.0) – Síur og flipar sem komast ekki fyrir verða að fellivali.
   Á við alla ferla með pillum í #view: stöðusíur (.uchips), undirflokka (.rlbar), haus-flipa (.hdtabs, .seg) og undirflipa í síma (.simsub).
   Ef pillurnar rúmast ekki í plássinu sem ferillinn hefur er hann falinn og <select class="u2fold"> settur í staðinn með sömu valkostum;
   val í fellivalinu smellir á samsvarandi pillu (sama aðgerð og áður). Þegar plássið stækkar aftur birtast pillurnar á ný. */
(function () {
  const SEL = "#view :is(.uchips,.rlbar,.hdtabs,.seg,.simsub,.pofilt)";
  const ON = ".on,[aria-pressed='true'],[aria-selected='true'],[aria-current='page'],[aria-current='true'],.sel";
  const txt = b => (b.getAttribute("data-u2l") || b.textContent || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
  let busy = false, raf = 0;

  function fold(t) {
    const btns = [...t.querySelectorAll(":scope > button, :scope > a, :scope > label > button")].filter(b => !b.hidden);
    if (btns.length < 2) { unfold(t); return; }
    // Mæla í fullri stærð (ferillinn sýnilegur augnablik – engin teikning á milli)
    t.classList.remove("u2folded");
    const over = t.scrollWidth > t.clientWidth + 2;
    let s = t.nextElementSibling?.classList?.contains("u2fold") ? t.nextElementSibling : null;
    if (!over) { s?.remove(); return; }
    t.classList.add("u2folded");
    const sig = btns.map(b => txt(b) + (b.matches(ON) ? "*" : "")).join("|");
    if (s && s.dataset.sig === sig) return;
    if (!s) { s = document.createElement("select"); s.className = "u2fold"; t.after(s);
      s.addEventListener("change", () => { const b = s._btns?.[+s.value]; if (b && b.isConnected) b.click(); }); }
    s.dataset.sig = sig; s._btns = btns;
    s.setAttribute("aria-label", t.getAttribute("aria-label") || "Sía");
    let cur = btns.findIndex(b => b.matches(ON)); if (cur < 0) cur = 0;
    s.innerHTML = btns.map((b, i) => `<option value="${i}"${i === cur ? " selected" : ""}>${txt(b).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])}</option>`).join("");
  }
  function unfold(t) { t.classList.remove("u2folded"); const s = t.nextElementSibling; if (s?.classList?.contains("u2fold")) s.remove(); }

  function run() {
    raf = 0; if (busy) return; busy = true;
    try { document.querySelectorAll(SEL).forEach(fold); } catch (e) {}
    busy = false;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(run); };
  const start = () => {
    const v = document.getElementById("view"); if (!v) return setTimeout(start, 200);
    new MutationObserver(m => { if (busy) return; if (m.some(r => r.type === "attributes" ? !r.target.matches?.(".u2fold,.uchips,.rlbar,.hdtabs,.seg,.simsub,.pofilt") : [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && !n.classList?.contains("u2fold")))) kick(); })
      .observe(v, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "aria-pressed", "aria-selected"] });
    addEventListener("resize", kick); kick();
  };
  window.u2Fold = kick;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
