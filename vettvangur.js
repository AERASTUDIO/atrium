/* Hlutverkið Vettvangur (2.97.0) – fyrir lager og vettvang: Í dag, klukka, skanni, afhending, myndir og athugasemdir.
   - Valmynd: aðeins Mitt (Heim, Dagatal, Tímaskráning), Pantanir, Verkdagatal, Verkefni og Spjall.
   - Listar Pantana og Verkefna sýna aðeins það sem viðkomandi er skráður á (Starfsfólk á pöntun/tilboði, starfsmenn á verkefni).
   - „+ Nýtt“: aðeins tími, kostnaður og fundur.
   Vörnin á netþjóni er í firestore.rules (vett()): má ekki stofna verkefni, tilboð, pantanir eða viðskiptavini, ekki breyta
   tilboðum eða viðskiptavinum og aldrei sjá reikninga. Ath.: lestur annarra pantana er ekki enn takmarkaður á netþjóni. */
(function () {
  window.VETT_FELA = ["vidsk", "tilbod", "fjarmal", "postur", "skjol", "bunadur"];
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
      const o = window.kindOn; window.kindOn = k => o(k) && (!window.isVett() || ["tima", "kostn", "fund"].includes(k)); window.kindOn.__vett = true;
    }
  };
  wrap(); document.addEventListener("DOMContentLoaded", wrap); setTimeout(wrap, 0);
})();
