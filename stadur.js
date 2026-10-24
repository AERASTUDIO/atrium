/* Staðsetning úr korti (2.73.0)
   Reitir fyrir staðsetningu og heimilisfang (tilboð, pöntun, afhending, viðskiptavinur) fá tillögur úr OpenStreetMap
   (Photon – án lykils, takmarkað við Ísland) meðan slegið er inn, og hnapp sem opnar staðinn í korti.
   Engin gögn send nema leitarorðið; ekkert vistað nema textinn sem valinn er (og hnit í data-latlon á reitnum). */
(() => {
  const SEL = 'input[data-h="stadsetning"], input[data-pfs^="afhStadur:"], input#f-addr, input[id$="-addr"], input[data-stadur]';
  const API = q => `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&bbox=-24.6,63.2,-13.4,66.6`;
  const PIN = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2A6.5 6.5 0 0 1 18.5 9.8C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>';
  const E = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let box = null, cur = null, items = [], hi = -1, tm = 0, ctl = null;
  const fmt = p => { const a = p.properties || {}, gata = [a.street || (a.type === "house" ? "" : ""), a.housenumber].filter(Boolean).join(" ");
    const nm = a.name && a.name !== a.street ? a.name : "", stadur = [a.postcode, a.city || a.town || a.village || a.county].filter(Boolean).join(" ");
    const main = nm || gata || stadur, sub = [nm && gata, stadur !== main ? stadur : ""].filter(Boolean).join(", ");
    return { main, sub, full: [nm, gata, stadur].filter(Boolean).filter((x, i, A) => A.indexOf(x) === i).join(", "), ll: (p.geometry?.coordinates || []).slice().reverse().join(",") }; };
  const mapUrl = (v, ll) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(ll || v);
  function close() { box?.remove(); box = null; items = []; hi = -1; }
  function place() { if (!box || !cur) return; const r = cur.getBoundingClientRect(); box.style.left = r.left + "px"; box.style.top = (r.bottom + 4) + "px"; box.style.width = Math.max(280, r.width) + "px"; }
  function draw() {
    if (!items.length) { close(); return; }
    if (!box) { box = document.createElement("div"); box.className = "stbox"; box.setAttribute("role", "listbox"); document.body.append(box); }
    box.innerHTML = items.map((x, i) => `<button type="button" role="option" class="stit${i === hi ? " on" : ""}" data-i="${i}">${PIN}<span><b>${E(x.main)}</b>${x.sub ? `<small>${E(x.sub)}</small>` : ""}</span></button>`).join("") + `<div class="stsrc">Kort: © OpenStreetMap</div>`;
    place();
  }
  async function search(inp) {
    const q = inp.value.trim(); if (q.length < 3) { close(); return; }
    ctl?.abort(); ctl = new AbortController();
    try { const r = await fetch(API(q), { signal: ctl.signal }); const j = await r.json(); if (inp !== cur) return;
      const seen = new Set(); items = (j.features || []).map(fmt).filter(x => x.full && !seen.has(x.full) && seen.add(x.full)).slice(0, 6); hi = -1; draw(); } catch (e) { if (e.name !== "AbortError") close(); }
  }
  function pick(i) { const x = items[i], inp = cur; if (!x || !inp) return; inp.value = x.full; inp.dataset.latlon = x.ll; close();
    inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true })); sync(inp); }
  function sync(inp) { const a = inp._stmap; if (a) { const v = inp.value.trim(); a.hidden = !v; a.href = mapUrl(v, inp.dataset.latlon); } }
  function wrap(inp) {
    if (inp.dataset.stw) return; inp.dataset.stw = "1"; inp.setAttribute("autocomplete", "off");
    const a = document.createElement("a"); a.className = "stmap"; a.target = "_blank"; a.rel = "noopener"; a.title = "Opna í korti"; a.setAttribute("aria-label", "Opna í korti"); a.innerHTML = PIN;
    inp.after(a); inp._stmap = a; inp.parentElement?.classList.add("sthas"); sync(inp);
    inp.addEventListener("input", e => { if (!e.isTrusted) return; cur = inp; delete inp.dataset.latlon; sync(inp); clearTimeout(tm); tm = setTimeout(() => search(inp), 280); });
    inp.addEventListener("keydown", e => { if (!box || cur !== inp) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); hi = (hi + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; draw(); }
      else if (e.key === "Enter" && hi >= 0) { e.preventDefault(); e.stopPropagation(); pick(hi); }
      else if (e.key === "Escape") { e.stopPropagation(); close(); } });
    inp.addEventListener("blur", () => setTimeout(() => { if (cur === inp && !box?.matches(":hover")) close(); }, 150));
  }
  document.addEventListener("mousedown", e => { const b = e.target.closest(".stbox .stit"); if (b) { e.preventDefault(); pick(+b.dataset.i); } else if (box && !e.target.closest(".stbox")) close(); }, true);
  addEventListener("resize", place); document.addEventListener("scroll", place, true);
  const scan = () => document.querySelectorAll(SEL).forEach(wrap);
  let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; try { scan(); } catch (e) {} }); }).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
