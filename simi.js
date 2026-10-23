/* Símaútlit I (2.45.0 / 2.46.0, ORG.simi === "I" – fyrst í dev/). Aðeins á skjám mjórri en 1024 px; tölvan er óbreytt.
   Frá 2.46.0 er síminn einföldun af tölvuappinu (Útlit I): sama kóði og sama útlit (utlit-i.js keyrir líka í síma,
   simi-ui1.css afritar tölvureglurnar sjálfkrafa), en staflað: listi fyrst, spjaldið yfir allan skjáinn.
   - Neðri stika: Heim, Verkefni, Pantanir, Tímar, Meira. „Meira“ opnar dökku vinstri stikuna úr tölvunni sem skúffu.
   - Yfirlitsflipar hluta sleppast í síma – stikan opnar listann (Öll verkefni, Allar pantanir, Vikan …);
     undirflipar hlutans (Leiga · Sala · Þjónusta …) sem flögur efst í listanum.
   - Spjöld: aðgerðir hausins (Byrja klukku, Afhenda →, Senda …) í fastri stiku neðst, þar sem þumallinn nær til.
   Útlitið sjálft: simi-ui1.css (sjálfvirkt) og simi.css (uppröðun fyrir mjóan skjá), allt undir body.simi1. */
(function () {
  if (window.ORG?.simi !== "I") return;
  document.body.classList.add("simi1");
  const phone = () => !matchMedia("(min-width:1024px)").matches;
  const E = s => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  // Yfirlitsflipar hluta → listinn sem opnast í staðinn í síma
  const YF = { verkyf: "verk", pnyf: "pantanir", tbyf: "ltilbod", timyf: "timar", vskyf: "vsk", vyfir: "lvorur" };
  const ALLL = { verk: "Öll", pantanir: "Allar", ltilbod: "Öll", vsk: "Allir" };
  const secs = () => { try { return typeof SECTIONS_ALL !== "undefined" ? SECTIONS_ALL : window.SECTIONS || []; } catch (e) { return []; } };
  const cur = () => { try { return tab; } catch (e) { return ""; } };
  const det = () => { try { return DETAIL; } catch (e) { return null; } };
  const ok = t => !window.tabOn || tabOn(t);
  const mapTab = () => { try { if (phone() && YF[tab]) { const s = secs().find(x => x.tabs.some(t => t[0] === tab)); const to = YF[tab]; const q = s?.tabs.find(t => t[0] === to && ok(to)) || s?.tabs.find(t => !YF[t[0]] && ok(t[0])); if (q) tab = q[0]; } } catch (e) {} };

  // Undirflipar hlutans sem flögur efst í listanum (í tölvu eru þeir í vinstri stikunni)
  function secChips() {
    const v = document.getElementById("view"); if (!v || det()) return;
    const s = secs().find(x => x.tabs.some(t => t[0] === cur())); if (!s || s.k === "heim") return;
    const list = s.tabs.filter(t => !YF[t[0]] && ok(t[0]) && (!t[2] || ALLL[t[0]] || t[0] === cur()));
    if (list.length < 2) return;
    const host = v.querySelector(".splist .phead") || v.querySelector(".phead"); if (!host || host.querySelector(".simsub")) return;
    const lab = t => ALLL[t[0]] || (["Leiga", "Sala", "Þjónusta"].includes(t[1]) && window.svidHeiti ? svidHeiti(t[1]) : t[1]);
    host.insertAdjacentHTML("beforeend", `<div class="simsub" role="tablist" aria-label="${E(s.l)}">${list.map(t => `<button type="button" role="tab" data-act="tab:${E(t[0])}" aria-selected="${t[0] === cur()}">${E(lab(t))}</button>`).join("")}</div>`);
    host.querySelector('.simsub [aria-selected="true"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }
  // Spjald: aðgerðir hausins (nema Staða og ⋯) í fasta stiku neðst
  function actBar() {
    document.getElementById("simact")?.remove(); document.body.classList.remove("simhasact");
    if (!det()) return;
    const v = document.getElementById("view"), act = v?.querySelector(".spdet .udh2 .uact"); if (!act) return;
    const btns = [...act.querySelectorAll(":scope > button.btn, :scope > a.btn")];
    // næsta skref á pöntun/tilboði (neðst á spjaldinu í tölvu) fer líka í stikuna
    const nx = v.querySelector('.spdet .links [data-act^="tbst:"].primary, .spdet .links [data-act^="tbsend:"].primary');
    const all = [...(nx ? [nx] : []), ...btns].slice(0, 3); if (!all.length) return;
    const bar = document.createElement("div"); bar.id = "simact"; bar.className = "simact";
    all.forEach((b, i) => { const c = b.cloneNode(true); c.removeAttribute("id"); c.classList.toggle("primary", i === 0); bar.append(c); b.classList.add("simmoved"); });
    v.append(bar); document.body.classList.add("simhasact");  // inni í #view svo smellir fari í gegnum doAct eins og áður
  }
  // Skúffa: dökka vinstri stikan
  const scrim = () => { let s = document.getElementById("simscrim"); if (!s) { s = document.createElement("div"); s.id = "simscrim"; s.className = "simscrim"; s.onclick = drawer.bind(null, false); document.body.append(s); } return s; };
  function drawer(open) {
    document.body.classList.toggle("simdrw", !!open); scrim();
    const sd = document.querySelector(".side"); if (sd) { sd.setAttribute("aria-hidden", open ? "false" : "true"); if (open) setTimeout(() => sd.querySelector(".tab")?.focus(), 60); }
  }
  window.simiDrawer = drawer;
  document.addEventListener("click", e => {
    if (!phone()) return;
    const m = e.target.closest('#tbar [data-tab="meira"], #avbtn'); if (m) { e.preventDefault(); e.stopImmediatePropagation(); drawer(!document.body.classList.contains("simdrw")); return; }
    if (document.body.classList.contains("simdrw") && e.target.closest(".side .tab, .side .btn, .side .syncbtn, .side [data-act]")) setTimeout(() => drawer(false), 0);
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("simdrw")) drawer(false); });

  function decorate() {
    document.body.classList.toggle("simidet", !!det());
    if (!phone()) { document.getElementById("simact")?.remove(); document.body.classList.remove("simhasact"); return; }
    secChips(); actBar();
    // „Meira“ í neðri stiku: virkt þegar opinn hluti er ekki í stikunni
    const mb = document.querySelector('#tbar [data-tab="meira"] .tl'); if (mb) mb.textContent = "Meira";
  }
  const _render = window.render || render;
  function renderS() { mapTab(); _render.apply(this, arguments); try { decorate(); } catch (e) { console.warn("simi", e); } }
  window.render = renderS; try { render = renderS; } catch (e) {}
  matchMedia("(min-width:1024px)").addEventListener?.("change", () => { drawer(false); try { if (typeof S !== "undefined" && S) render(); } catch (e) {} });
})();
