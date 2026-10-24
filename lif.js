/* Líf (2.63.0): hreyfing (tölur telja upp, spjöld birtast í röð, súlur vaxa), tómir skjáir með teikningu og hnappi,
   tákn í síum og daufur blár bjarmi á Heim og innskráningu. Skraut ofan á núverandi skjái (DOM eftir render) – engin ný gögn.
   Virðir „prefers-reduced-motion“. */
(function () {
  const tr = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = () => !matchMedia("(min-width:1024px)").matches;
  const svg = (p, w = 14) => `<svg class="lifi" viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

  /* ---------- 7. Tákn í síum ---------- */
  const I = {
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    tag: '<path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
    wrench: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.4 2.4-2.6-.6-.6-2.6z"/>',
    open: '<circle cx="12" cy="12" r="8"/>',
    check: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12.5l2.3 2.3 4.7-5"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    truck: '<path d="M3 7h11v8H3zM14 10h4l3 3v2h-7"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    coin: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5"/>',
    users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c.8-3.5 3.3-5 6-5s5.2 1.5 6 5M15 14.5c2.6 0 4.5 1.3 5.3 4"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    pause: '<circle cx="12" cy="12" r="8"/><path d="M10 9v6M14 9v6"/>',
    x: '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>'
  };
  const CHIP = [
    [/^(öll svið|allt|allir|allar|öll)\b/i, "grid"], [/^leiga|^búnaður/i, "box"], [/^sala|^vörur/i, "tag"], [/^þjónusta|^vinna/i, "wrench"],
    [/^(opnar|opin|opið|í gangi|virk)/i, "open"], [/^(greitt|lokið|lokin|lokuð|skilað|samþykkt|staðfest)/i, "check"], [/^(nýjar|ný|nýtt)\b/i, "spark"],
    [/^(afhentar|afhent|úti|sent)/i, "truck"], [/^(vika|2 vikur|mánuður|ár|dagur|í dag)$/i, "cal"], [/^eftir pöntunum/i, "list"], [/^eftir búnaði/i, "box"],
    [/^(óreikn|tímar|klst)/i, "clock"], [/^(óinnheimt|ógreitt|ógreidd|tekjur)/i, "coin"], [/^(seint|fram yfir|árekst|vantar)/i, "alert"],
    [/^(mín|mitt|ég)\b/i, "user"], [/^(teymi|starfsfólk|samstarfs)/i, "users"], [/^(drög|tilboð)/i, "doc"], [/^(í bið|bið)/i, "pause"], [/^(hafnað|ógilt)/i, "x"]
  ];
  function chipIcons(root) {
    root.querySelectorAll(".uchip:not([data-lif]), .pdseg button:not([data-lif]), .pfseg button:not([data-lif]), .ulbar .seg button:not([data-lif])").forEach(b => {
      b.dataset.lif = "1"; if (b.querySelector("svg")) return; const t = b.textContent.trim().split(" · ")[0];
      const m = CHIP.find(([re]) => re.test(t)); if (m) b.insertAdjacentHTML("afterbegin", svg(I[m[1]], 13));
    });
  }

  /* ---------- Tölur telja upp ---------- */
  const parseNum = s => { const m = String(s).match(/^(\D*?)(\d{1,3}(?:\.\d{3})+|\d+)(,\d+)?(.*)$/s); if (!m) return null;
    const dec = m[3] ? m[3].length - 1 : 0, n = parseFloat(m[2].replace(/\./g, "") + (m[3] ? "." + m[3].slice(1) : "")); return { pre: m[1], n, dec, grp: m[2].includes("."), post: m[4] }; };
  const fmtNum = (x, p) => { let s = x.toFixed(p.dec); let [a, b] = s.split("."); if (p.grp || x >= 1e4 && p.grp) a = a.replace(/\B(?=(\d{3})+(?!\d))/g, "."); return p.pre + a + (b ? "," + b : "") + p.post; };
  function countUp(root) {
    if (RM()) return;
    root.querySelectorAll(":is(.ukp,.snjk,.kp) > b, .uwk > b").forEach(b => {
      if (b.dataset.lc || b.children.length) return; b.dataset.lc = "1"; const p = parseNum(b.textContent.trim()); if (!p || !p.n || p.n > 1e12) return;
      const t0 = performance.now(), D = 650, end = b.textContent;
      const step = now => { if (!b.isConnected) return; const q = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - q, 3); b.textContent = q < 1 ? fmtNum(p.n * e, p) : end; if (q < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  /* ---------- 5. Spjöld birtast í mjúkri röð ---------- */
  function stagger(root) {
    if (RM()) return;
    const els = root.querySelectorAll(":scope > * :is(.card,.ucard,.ukp,.snjk,.pdsd,.lifstrip):not([data-li])");
    let i = 0; els.forEach(el => { el.dataset.li = "1"; if (i > 14) return; el.style.setProperty("--li", i++); el.classList.add("lifin"); setTimeout(() => el.classList.remove("lifin"), 700 + i * 40); });
  }

  /* ---------- 6. Tómir skjáir ---------- */
  const EMPTY_ART = `<svg class="lifart" viewBox="0 0 120 80" width="120" height="80" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 46l40-20 40 20-40 20z" opacity=".35"/><path d="M20 46v10l40 20 40-20V46" opacity=".55"/><path d="M60 66v10"/>
    <path d="M44 34l16-8 16 8-16 8z" class="a"/><path d="M44 34v8l16 8 16-8v-8" class="a"/><path d="M60 42v8" class="a"/>
    <path d="M86 14v8M82 18h8M30 20v6M27 23h6" opacity=".5"/></svg>`;
  const ADD = { pantanir: ["pantanir", "+ Ný pöntun"], pnl: ["pantanir", "+ Ný pöntun"], pns: ["pantanir", "+ Ný pöntun"], pnt: ["pantanir", "+ Ný pöntun"], pndag: ["pantanir", "+ Ný pöntun"], pnyf: ["pantanir", "+ Ný pöntun"],
    verk: ["verk", "+ Nýtt verkefni"], verkefni: ["verk", "+ Nýtt verkefni"], ltilbod: ["ltilbod", "+ Nýtt tilboð"], stilbod: ["stilbod", "+ Nýtt tilboð"], tilbod: ["tilbod", "+ Nýtt tilboð"] };
  function empties(root) {
    root.querySelectorAll(".uempty:not([data-le]), .spempty:not([data-le])").forEach(el => {
      el.dataset.le = "1"; const inCard = !!el.closest(".card,.ucard,.udags,.snjc,.hcard") && !el.closest(".pdwrap");
      if (inCard) { el.classList.add("lifes"); el.insertAdjacentHTML("afterbegin", svg(I.check, 16)); return; }
      el.classList.add("life"); el.insertAdjacentHTML("afterbegin", EMPTY_ART);
      const a = ADD[tab]; if (a && tr(() => !!MCP, false) && el.classList.contains("uempty") && !el.querySelector("button")) el.insertAdjacentHTML("beforeend", `<div class="lifea"><button type="button" class="btn primary sm" data-act="fabnew:${a[0]}">${a[1]}</button></div>`);
    });
  }

  /* ---------- 8. Bjarmi ---------- */
  function glow() { document.body.classList.toggle("lifglow", tab === "yfirlit" && !DETAIL); }

  let lastKey = "";
  function decorate() {
    const v = document.getElementById("view"); if (!v) return;
    glow(); [chipIcons, empties].forEach(f => tr(() => f(v)));
    const key = tab + "|" + (DETAIL || ""); if (key !== lastKey) { lastKey = key; tr(() => stagger(v)); tr(() => countUp(v)); }
  }
  window.lifDecorate = decorate;
  const wrap = () => { if (typeof render !== "function") return false; if (render.__lif) return true;
    const o = render; render = function () { const r = o.apply(this, arguments); tr(decorate); return r; }; render.__lif = 1; try { window.render = render; } catch (e) {} return true; };
  if (!wrap()) { const iv = setInterval(() => { if (wrap()) clearInterval(iv); }, 200); setTimeout(() => clearInterval(iv), 10000); }
  // Lifandi staða: klukkan tifar
  const mo = new MutationObserver(() => { clearTimeout(mo.t); mo.t = setTimeout(() => { const v = document.getElementById("view"); if (v) [chipIcons, empties].forEach(f => tr(() => f(v))); }, 60); });
  const startMO = () => { const v = document.getElementById("view"); if (!v) return false; mo.observe(v, { childList: true, subtree: true }); return true; };
  if (!startMO()) document.addEventListener("DOMContentLoaded", startMO);
})();
