/* Atrium – kjarni lausnarinnar (frá 2.0.0). Sami kóði fyrir öll fyrirtæki; hvert fyrirtæki er „uppsetning“
   (fyrirtaeki.js, firebase-config.js, merki og litir) og velur hvaða einingar eru í notkun.
   Einingar lausnarinnar.
   Allt er í boði í kóðanum; hver uppsetning (fyrirtaeki.js › einingar) og admin (Stillingar › Einingar, vistað í
   S.stillingar.einingar) velja hvað er virkt. Það sem ekki er tilgreint er virkt – nema einingar merktar „sjálfgefið óvirkt“ (4. gildi), sem þarf að kveikja á. Sjá Kerfisskjölun, kafla um einingar.
   Ný eining: bæta línu í EININGAR og athuga ON("lykill") þar sem hún birtist. */
(function () {
  window.VARA = { nafn: "Atrium", fra: "AERA Studio" };
  // Hvar möppur fyrirtækisins búa (2.7.1): SharePoint-síða uppsetningarinnar (ORG.sp) eða OneDrive þess sem er innskráður
  window.ODN = () => (window.ORG && ORG.sp ? "SharePoint" : "OneDrive");
  // lykill: [heiti, lýsing, háð einingu]
  const EININGAR = {
    verkefni:       ["Verkefni", "Verkefnalisti, síða verkefnis, staða og athugasemdir – grunnurinn (alltaf virkt)"],
    undirverk:      ["Undirverk", "Verkþættir innan verkefna með skiladögum", "verkefni"],
    vidskiptavinir: ["Viðskiptavinir", "Fyrirtækjaskrá, tengiliðir og tilboð á viðskiptavin"],
    dagatal:        ["Dagatal", "Mánaðar-, viku- og dagsýn með fundum og skilum"],
    fundir:         ["Fundir", "Fundir, endurteknir fundir og fundargerðir"],
    timar:          ["Tímaskráning", "Vikan, færslur, skýrslur og skeiðklukka"],
    kostnadur:      ["Útlagður kostnaður", "Kostnaður á verkefni með kvittunum", "timar"],
    reikningar:     ["Reikningar", "Reikningsfærsla tíma og kostnaðar, PDF og Excel, óinnheimt"],
    verdskra:       ["Verðskrá", "Þjónustuliðir og tímagjald á verkefni og færslu"],
    skjol:          ["Skjöl", "Skjalalisti fyrirtækisins (Word, Excel, Canva, tenglar)"],
    onedrive:       ["OneDrive og SharePoint", "Möppur verkefna, Mín skjöl, Nýlegt og forskoðun skráa"],
    postur:         ["Póstur", "Outlook-pósthólf, verkefnapóstur og póstþræðir á verkefnum"],
    spjall:         ["Spjall", "Spjallrásir og bein skilaboð milli starfsfólks"],
    // Frá 2.4.0 (aðskildar deildir frá 2.5.0) – sjálfgefið óvirkar (4. gildi = 1): kveikt á í uppsetningu
    // (fyrirtaeki.js › einingar: { leiga: true, sala: true }) eða af admin. Kóðinn er í sala.js.
    leiga:          ["Leiga", "Búnaðarlisti og leigutilboð með leigudögum og dagstuðlum, pakkar og tæknimenn", null, 1],
    sala:           ["Sala", "Vörulisti með lagerstöðu og sölutilboð (heildsala og install)", null, 1],
    // Frá 2.8.0 – deildarval efst og verkefni, Heim og dagatal síuð eftir deild (deildir.js). Deildirnar = Leiga/Sala sem eru virkar.
    deildir:        ["Deildir", "Leiga og Sala sem deildir: deildarval efst, verkefni merkt deild og Heim, verkefni og dagatal síuð", null, 1]
  };
  // Pakkar og tengingar (frá 2.14.0, einingatillagan 21.10.2026): einingarnar flokkaðar í kjarna, fimm pakka og tengingar.
  // Pakki er lag OFAN Á einingarnar: slökkt pakki slekkur á öllum einingum hans; kveikt pakki lætur einingarnar ráða sjálfar.
  // Ekkert breytist hjá uppsetningu sem hefur hvorki ORG.pakkar né S.stillingar.pakkar. Nýja stillingasíðan og flokkuð
  // valmynd birtast aðeins þar sem ORG.pakkaval = true (fyrst í dev/).
  // lykill: [heiti, lýsing, einingar pakkans]
  const PAKKAR = {
    verkstjorn: ["Verkstjórn", "Verkþættir með skiladögum, dagatal og fundir", ["undirverk", "dagatal", "fundir"]],
    timar:      ["Tímar", "Tímaskráning, skeiðklukka, útlagður kostnaður og tímaskýrslur", ["timar", "kostnadur"]],
    tilbod:     ["Tilboð og verðlisti", "Þjónustuliðir og tímagjald (verðlisti fyrir tilboð og reikninga)", ["verdskra"]],
    bunadur:    ["Búnaður og lager", "Leiga og sala: búnaður og vörur, lagerstaða, leigu- og sölutilboð", ["leiga", "sala"]],
    fjarmal:    ["Fjármál", "Reikningsdrög úr tímum og kostnaði, PDF og Excel, óinnheimt", ["reikningar"]]
  };
  const TENGINGAR = {
    m365skrar:  ["Microsoft 365 – skrár", "Möppur verkefna á SharePoint/OneDrive, Mín skjöl, Nýlegt og skjalalisti", ["skjol", "onedrive"]],
    m365postur: ["Microsoft 365 – póstur", "Pósthólf, verkefnapóstur og póstþræðir á verkefnum", ["postur"]],
    spjall:     ["Spjall", "Spjallrásir og bein skilaboð milli starfsfólks", ["spjall"]],
    claude:     ["Claude-aðstoð", "Spurningar og skráningar í mæltu máli", [], "Væntanlegt"]
  };
  const PAKKI_AF = {}; [PAKKAR, TENGINGAR].forEach(G => Object.entries(G).forEach(([p, v]) => v[2].forEach(k => { PAKKI_AF[k] = p; })));
  const KJARNI = ["verkefni", "vidskiptavinir"];
  const ALLTAF = window.ORG?.pakkaval ? KJARNI.slice() : ["verkefni"];
  // S er skilgreint með let í app-grunnur.js (ekki á window) – lesið við keyrslu
  const st = () => { try { return typeof S !== "undefined" ? S : null; } catch (e) { return null; } };
  const raw = () => ({ ...(window.ORG?.einingar || {}), ...(st()?.stillingar?.einingar || {}) });
  // Er eining virk? (og sú sem hún er háð)
  // Er pakki/tenging virk? false í fyrirtaeki.js = ekki í boði (læst); admin slekkur í S.stillingar.pakkar
  const pakkiLast = p => (window.ORG?.pakkar || {})[p] === false;
  const pakkiOn = p => { if (!p) return true; if (pakkiLast(p)) return false; const v = (st()?.stillingar?.pakkar || {})[p]; return v !== false; };
  const ON = k => { if (ALLTAF.includes(k)) return true; if (!pakkiOn(PAKKI_AF[k])) return false; if ((window.ORG?.einingar || {})[k] === false) return false; const r = raw(); if (r[k] === false || r[k] === 0) return false; if (EININGAR[k]?.[3] && r[k] !== true) return false; const dep = EININGAR[k]?.[2]; return dep ? ON(dep) : true; };
  // Læst í uppsetningu (fyrirtaeki.js) – admin getur þá ekki kveikt á henni í appinu
  const LAST = k => (window.ORG?.einingar || {})[k] === false || pakkiLast(PAKKI_AF[k]);
  window.PAKKAR = PAKKAR; window.TENGINGAR = TENGINGAR; window.PAKKI_AF = PAKKI_AF; window.KJARNI = KJARNI;
  window.pakkiOn = pakkiOn; window.pakkiLast = pakkiLast;
  window.EININGAR = EININGAR; window.ON = ON; window.einLast = LAST; window.EIN_ALLTAF = ALLTAF;
  window.einSig = () => Object.keys(EININGAR).map(k => ON(k) ? 1 : 0).join("");

  // Hvaða eining hver flipi tilheyrir (flipar án línu eru alltaf sýndir)
  window.TAB_EIN = { undir: "undirverk", vsk: "vidskiptavinir", dagatal: "dagatal", fundir: "fundir", timar: "timar", tfaer: "timar", tskyr: "timar",
    trk: "reikningar", skjolmin: "onedrive", skjol: "skjol", skjolnyl: "onedrive", postur: "postur", spjall: "spjall", lverk: "deildir", sverk: "deildir", lvsk: ["deildir", "vidskiptavinir"], svsk: ["deildir", "vidskiptavinir"], ltilbod: "leiga", lvorur: "leiga", stilbod: "sala", svorur: "sala" };
  window.tabOn = t => !window.TAB_EIN[t] || [].concat(window.TAB_EIN[t]).every(k => ON(k)); // gildi má vera fylki (allar einingar þurfa að vera virkar)
  // Tegundir í „+ Nýtt“
  window.KIND_EIN = { tima: "timar", kostn: "kostnadur", fund: "fundir", undir: "undirverk", verk: "verkefni", vsk: "vidskiptavinir", skjal: "skjol" };
  window.kindOn = k => !window.KIND_EIN[k] || ON(window.KIND_EIN[k]);
})();
