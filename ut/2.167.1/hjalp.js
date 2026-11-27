/* Skýringar við stillingar (2.124.0) – lítill „?“ við hlið hugtaka í Stillingum; stutt skýring birtist þegar músin er yfir
   (eða við smell/fókus í síma og með lyklaborði). Textarnir eru hér á einum stað; lykill = heiti reitsins eða kaflans eins og það birtist. */
(function () {
  const H = {
    // Reikningar og fyrirtæki
    "Reikningar": "Hvernig reikningar verða til og hvert þeir fara. Með bókhaldskerfi gefur það út reikninginn; annars eru reikningar í Atrium drög sem færð eru í bókhald.",
    "Bókhaldskerfi": "Payday eða DK gefa út reikninginn með kröfu og tölvupósti. „Ekkert tengt“ = drögin eru færð handvirkt í bókhaldið (CSV).",
    "Nafn seljanda": "Nafn fyrirtækisins eins og það birtist á reikningum og tilboðum.",
    "Kennitala": "Kennitala fyrirtækisins – skylda á reikningum.",
    "VSK-númer": "VSK-númer fyrirtækisins, ef það er á VSK-skrá.",
    "Bankareikningur": "Birtist á reikningum svo greiðandi viti hvert á að greiða.",
    "Sjálfgefið tímagjald (kr./klst.)": "Verð á klukkustund þegar verkefni hefur hvorki eigið tímagjald né línu í verðskrá.",
    "VSK %": "Virðisaukaskattur sem leggst á ný reikningsdrög og tilboð. 0 ef fyrirtækið er ekki á VSK-skrá.",
    "Hvernig verkefni eru rukkuð": "Tímavinna: tímar × tímagjald fara á reikning. Fast verð: tilboðið er rukkað og tímar eru til yfirsýnar. Hvert verkefni má víkja frá.",
    "Greiðslufrestur (dagar)": "Dagar frá reikningsdegi að gjalddaga á reikningsdrögum.",
    "Næsta númer draga": "Númerið sem næstu reikningsdrög fá. Appið sleppir númerum sem eru þegar í notkun.",
    "Næsta reikningsnúmer": "Númerið sem næsti reikningur fær. Appið sleppir númerum sem eru þegar í notkun.",
    "Reikningsdrög myndast sjálfkrafa úr pöntunum": "Þegar pöntun er staðfest eða skilað verða reikningsdrög til sjálfkrafa – þú yfirferð og gefur út.",
    "Bókhaldsflokkar": "Hver lína á reikningi fær flokk (vinna, leiga, sala …) með VSK og tekjulykli í bókhaldinu.",
    "Vinnuvika": "Markmið, dagvinna og tímabil – notað í Tímum, á Heim og í tímaskýrslum.",
    "Markmið klst. á viku": "Hve marga tíma hver á að skrá á viku. Heim og Tímar sýna hvað vantar upp á.",
    "Dagvinna frá": "Upphaf dagvinnu. Tímar utan dagvinnu á virkum dögum teljast yfirvinna í tímaskýrslum.",
    "Dagvinna til": "Lok dagvinnu. Tímar eftir þetta teljast yfirvinna.",
    "Tímabil hefst (dagur mánaðar)": "Hvenær uppgjörstímabil hefst. 1 = almanaksmánuður (1.–síðasti dagur).",
    // Verkefni
    "Staða verkefna": "Stöðurnar sem verkefni fara í gegnum. „Lokið“-merktar stöður telja verkefnið lokið.",
    "Verkflokkar": "Tegundir verkefna (t.d. Hönnun, Framkvæmd) – til flokkunar og síunar.",
    "Sniðmát undirverka": "Undirverk sem ný verkefni fá sjálfkrafa eftir verkflokki.",
    // Leiga og sala
    "Tilboð gildir (dagar)": "Hve lengi tilboð gildir frá dagsetningu þess – birtist á tilboðinu.",
    "Flokkar í vörulista (einn í línu)": "Flokkarnir sem vörur og búnaður raðast í.",
    "Skilmálar á sölutilboðum": "Texti sem birtist neðst á sölutilboðum og á samþykktarsíðu viðskiptavinar.",
    // Pantanir
    "Skilauppgjör": "Hvernig skilum er háttað: talning, skemmdir og aukagjöld þegar búnaði er skilað.",
    "Afhending": "Sent eða sótt, undirskrift og mynd við afhendingu.",
    "Staðfestingartengill": "Tengill sem viðskiptavinur fær til að staðfesta pöntun. Sendist sjálfkrafa ef enginn hefur sent hann innan frestsins.",
    "Ferð dagsins": "Listi yfir afhendingar og skil dagsins í akstursröð.",
    // Innflutningur
    "Álagning (%)": "Álagning ofan á kostnaðarverð þegar söluverð er reiknað úr verði birgja.",
    "Óvissuálag (% af tollverði)": "Varúðarálag ofan á tollverð þar til reynsla er komin af birgi.",
    // Aðgangur og fólk
    "Réttindi hlutverka": "Hvað hvert hlutverk má: admin allt, bókari fjármál, starfsmaður sín verk, vettvangur aðeins eigin verk í síma.",
    "Gátlisti": "Atriði sem þarf að fara yfir svo aðgangur og öryggi séu rétt stillt.",
    "Nýlegar breytingar": "Hver breytti hverju nýlega – til að rekja breytingar.",
    // Einingar
    "Kjarni": "Grunnurinn sem fylgir öllum leiðum – verkefni, tímar, tilboð og reikningar.",
    "Viðbætur": "Pakkar sem leið fyrirtækisins opnar. Innan þeirra kveikir admin og slekkur á einingum.",
    "Tengingar": "Microsoft 365, spjall og önnur kerfi sem appið tengist.",
    // Snjall-Heim og greining
    "Hlutar á Heim": "Hvaða spjöld birtast á Heim.",
    "Viðvaranir": "Hvenær appið varar við – t.d. áætlun að klárast eða tvíbókaður búnaður.",
    "Loka deginum – byggt á": "Hvaðan drög að tímaskráningu dagsins koma (dagatal, pöntunum, verkefnum).",
    "Undirflokkar": "Skiptu sviði í hluta (t.d. Leiga › Drykkjaþjónusta). Verk fá flokk sjálfkrafa út frá vöruflokkum; listar síast eftir flokki og Reikningar sýna veltu eftir flokki.",
    "Undirskrift í pósti": "Neðst í tölvupósti sem sendur er úr appinu."
  };
  const norm = s => String(s || "").replace(/\s+/g, " ").trim();
  let tip = null;
  const show = (b) => { if (!tip) { tip = document.createElement("div"); tip.className = "hj-tip"; tip.setAttribute("role", "tooltip"); tip.id = "hj-tip"; document.body.appendChild(tip); }
    tip.textContent = b.dataset.hj; tip.hidden = false; const r = b.getBoundingClientRect(), w = Math.min(300, innerWidth - 24);
    tip.style.maxWidth = w + "px"; tip.style.left = "0px"; tip.style.top = "0px"; const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = Math.min(Math.max(12, r.left + r.width / 2 - tw / 2), innerWidth - tw - 12), y = r.top - th - 8; if (y < 8) y = r.bottom + 8;
    tip.style.left = x + "px"; tip.style.top = y + "px"; b.setAttribute("aria-describedby", "hj-tip"); };
  const hide = () => { if (tip) tip.hidden = true; };
  function decorate() {
    if (typeof tab === "undefined" || tab !== "stillingar") return;
    const v = document.getElementById("view"); if (!v) return;
    v.querySelectorAll("label, .viewtitle, h3").forEach(el => {
      if (el.querySelector(":scope > .hjl, :scope > .hj")) return;
      const tn = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (!tn) return;
      const k = norm(tn.textContent), t = H[k]; if (!t) return;
      const b = document.createElement("button"); b.type = "button"; b.className = "hj"; b.textContent = "?"; b.dataset.hj = t; b.setAttribute("aria-label", "Skýring: " + k);
      const w = document.createElement("span"); w.className = "hjl"; tn.replaceWith(w); w.append(tn, b); /* texti og „?“ saman í línu, líka í dálkum (label) */
    });
  }
  document.addEventListener("mouseover", e => { const b = e.target.closest?.(".hj"); if (b) show(b); });
  document.addEventListener("mouseout", e => { if (e.target.closest?.(".hj")) hide(); });
  document.addEventListener("focusin", e => { const b = e.target.closest?.(".hj"); if (b) show(b); });
  document.addEventListener("focusout", e => { if (e.target.closest?.(".hj")) hide(); });
  // Smellur (sími): sýna/fela – og ekki virkja reitinn sem „?“ situr í (label)
  document.addEventListener("click", e => { const b = e.target.closest?.(".hj"); if (!b) { hide(); return; } e.preventDefault(); e.stopPropagation(); (tip && !tip.hidden) ? hide() : show(b); }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") hide(); });
  window.addEventListener("scroll", hide, true);
  const hook = () => { if (typeof window.render !== "function" || window.render.__hj) return false;
    const o = window.render; window.render = function () { const r = o.apply(this, arguments); hide(); try { decorate(); } catch (e) { console.warn("hjalp", e); } return r; };
    window.render.__hj = 1; try { render = window.render; } catch (e) {} return true; };
  let n = 0; const iv = setInterval(() => { if (window.render && !window.render.__hj) hook(); if (++n > 40) clearInterval(iv); }, 250);
  window.HJALP = H;
})();
