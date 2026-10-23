/* Símaútlit I (2.45.0, ORG.simi === "I" – fyrst í dev/). Aðeins á skjám mjórri en 1024 px; tölvan er óbreytt.
   - Neðri stikan opnar listann sjálfan (Öll verkefni, Allar pantanir, Vikan …) í stað Yfirlits, sem í síma sýndi Heim aftur.
   - Undirflipar án „Yfirlits“ og án „‹ Yfirlit“-tengils; „Öll/Allar“ fremst.
   - Hreinni haus (engin dagsetning), Heim án tvítekninga, plús-hnappurinn hverfur á spjöldum og þar sem + er í hausnum.
   - Pöntun í síma: næsta skref (Staðfesta / Afhenda / Skila / Loka) sem aðalhnappur efst.
   Útlitið sjálft er í simi.css (allt undir body.simi1). */
(function () {
  if (window.ORG?.simi !== "I") return;
  document.body.classList.add("simi1");
  const phone = () => !matchMedia("(min-width:1024px)").matches;
  // Yfirlitsflipar hluta → listinn sem opnast í staðinn í síma
  const YF = { verkyf: "verk", pnyf: "pantanir", tbyf: "ltilbod", timyf: "timar", vskyf: "vsk", vyfir: "lvorur" };
  const SHOW = new Set(["verk", "pantanir", "ltilbod", "vsk"]);
  const ALLL = { verk: "Öll", pantanir: "Allar", ltilbod: "Öll", vsk: "Allir" };
  const secs = () => { try { return typeof SECTIONS_ALL !== "undefined" ? SECTIONS_ALL : window.SECTIONS || []; } catch (e) { return []; } };
  const ORIG = new Map();
  function mode() {
    const ph = phone();
    secs().forEach(sec => (sec.tabs || []).forEach(t => {
      if (!ORIG.has(t)) ORIG.set(t, [t[1], t[2]]);
      const [l0, h0] = ORIG.get(t);
      if (ph && YF[t[0]]) t[2] = 1;
      else if (ph && SHOW.has(t[0])) { t[2] = 0; t[1] = ALLL[t[0]] || l0; }
      else { t[2] = h0; t[1] = l0; }
    }));
  }
  const mapTab = () => { try { if (phone() && YF[tab]) { const s = secs().find(x => x.tabs.some(t => t[0] === tab)); const to = YF[tab]; const ok = s?.tabs.find(t => t[0] === to && (!window.tabOn || tabOn(to))) || s?.tabs.find(t => !t[2] && (!window.tabOn || tabOn(t[0]))); if (ok) tab = ok[0]; } } catch (e) {} };

  // Pöntun í síma: næsta skref sem aðalhnappur
  const NX = { "Ný": ["Staðfesta", "Staðfest"], "Staðfest": ["Afhenda →", "Afhent"], "Afhent": ["Skila →", "Skilað"], "Skilað": ["Loka pöntun", "Lokið"] };
  function decorate() {
    let D = null, m = null; try { D = DETAIL; m = MCP; } catch (e) {}
    document.body.classList.toggle("simidet", !!D);
    if (!phone() || !D || !String(D).startsWith("tb:") || !m) return;
    const v = document.getElementById("view"), id = String(D).slice(3);
    const P = (window.salaAPI?.PN?.() || []).find(x => String(x.id) === id); if (!P || v.querySelector(".simnx")) return;
    const nx = NX[P.stada]; if (!nx) return;
    const ed = v.querySelector('[data-act^="tbed:start"]');
    const h = `<div class="simnx"><button type="button" class="btn primary" data-act="tbst:${esc(P.id)}:${esc(nx[1])}">${esc(nx[0])}</button></div>`;
    (ed || v.querySelector("p.sub") || v.querySelector("h2"))?.insertAdjacentHTML(ed ? "beforebegin" : "afterend", h);
  }

  const _render = window.render || render;
  function renderS() { mode(); mapTab(); _render.apply(this, arguments); try { decorate(); } catch (e) { console.warn("simi", e); } }
  window.render = renderS; try { render = renderS; } catch (e) {}
  matchMedia("(min-width:1024px)").addEventListener?.("change", () => { try { if (typeof S !== "undefined" && S) render(); } catch (e) {} });
  mode();
})();
