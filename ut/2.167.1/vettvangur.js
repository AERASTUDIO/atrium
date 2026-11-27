/* Hlutverkið Vettvangur (2.97.0) – fyrir lager og vettvang: Í dag, klukka, skanni, afhending, myndir og athugasemdir.
   - Valmynd: aðeins Mitt (Heim, Dagatal, Tímaskráning), Pantanir, Verkdagatal, Verkefni og Spjall.
   - Listar Pantana og Verkefna sýna aðeins það sem viðkomandi er skráður á (Starfsfólk á pöntun/tilboði, starfsmenn á verkefni).
   - „+ Nýtt“: aðeins tími, kostnaður og fundur.
   Vörnin á netþjóni er í firestore.rules (vett()): má ekki stofna verkefni, tilboð, pantanir eða viðskiptavini, ekki breyta
   tilboðum eða viðskiptavinum og aldrei sjá reikninga. Frá 2.98.0 les vettvangur aðeins pantanir sem hann er skráður á:
   hver pöntun ber reitinn menn (netföng úr tbMenn – Starfsfólk, stofnandi og starfsmenn verkefnisins). Hann er settur við
   vistun (gogn.js › stamp) og aðrir notendur en vettvangur fylla í hann þar sem hann vantar eða er úreltur (pnMennSync). */
(function () {
  window.VETT_FELA = ["folk", "vidsk", "tilbod", "fjarmal", "postur", "skjol", "bunadur"];
  window.isVett = () => (window.VIEWAS?.hlutverk || window.USER?.hlutverk) === "vettvangur";
  const lc = s => String(s || "").trim().toLowerCase();
  // Er ég skráð(ur) á þetta? Tilboð/pantanir: Starfsfólk (tbMenn). Verkefni: starfsmenn (skammstafanir).
  window.vettMine = function (x) {
    if (!x) return false;
    if (x.linur || x.pontun !== undefined || x.nr && /^[A-Z]-/.test(String(x.nr))) return window.tbMine ? window.tbMine(x) : true;
    const me = window.VIEWAS || window.USER || {}, sk = String(me.sk || "").toUpperCase();
    const sm = (x.starfsmenn || []).map(v => String(v).toUpperCase());
    return !!sk && sm.includes(sk) || sm.includes(lc(me.email).toUpperCase());
  };
  const wrap = () => {
    if (window.rlMatch && !window.rlMatch.__vett) {
      const o = window.rlMatch; window.rlMatch = x => o(x) && (!window.isVett() || window.vettMine(x)); window.rlMatch.__vett = true;
    }
    if (window.kindOn && !window.kindOn.__vett) {
      const o = window.kindOn; window.kindOn = k => o(k) && (!window.isVett() || ["tima"].includes(k)); window.kindOn.__vett = true;
    }
  };
  wrap(); document.addEventListener("DOMContentLoaded", wrap); setTimeout(wrap, 0);

  // Netföng starfsfólks á pöntun, raðað. null ef notendaskráin er ekki komin (þá er ekki snert við reitnum).
  window.pnMenn = function (T) {
    try { if (!window.tbMenn || !window.nuUsers || !nuUsers().length) return null; return [...window.tbMenn(T)].sort(); } catch (e) { return null; }
  };
  // Samstilling: ef reiturinn menn vantar eða er úreltur á einhverri pöntun (t.d. eldri pantanir, pantanir af pöntunarsíðu
  // eða breytt starfsfólk á verkefni) vistar notandi sem er ekki á vettvangi tóma breytingu – stamp() leiðréttir reitinn.
  let last = 0;
  window.pnMennSync = function () {
    if (window.AERA_DEMO || !window.SPLIT || typeof S === "undefined" || !S || !window.USER || window.USER.hlutverk === "vettvangur") return 0;
    if (typeof saveSplit !== "function" || Date.now() - last < 60000) return 0;
    const ps = S.pantanir || [], bad = ps.filter(P => { const m = window.pnMenn(P); return m && JSON.stringify(m) !== JSON.stringify(P.menn || null); });
    if (!bad.length) return 0;
    last = Date.now(); try { saveSplit(() => {}); } catch (e) { console.warn("pnMennSync", e); }
    return bad.length;
  };
  setInterval(() => { try { window.pnMennSync(); } catch (e) {} }, 20000);
})();
