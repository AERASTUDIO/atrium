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
  const ALLTAF = ["verkefni"];
  // S er skilgreint með let í app-grunnur.js (ekki á window) – lesið við keyrslu
  const st = () => { try { return typeof S !== "undefined" ? S : null; } catch (e) { return null; } };
  const raw = () => ({ ...(window.ORG?.einingar || {}), ...(st()?.stillingar?.einingar || {}) });
  // Er eining virk? (og sú sem hún er háð)
  const ON = k => { if (ALLTAF.includes(k)) return true; if ((window.ORG?.einingar || {})[k] === false) return false; const r = raw(); if (r[k] === false || r[k] === 0) return false; if (EININGAR[k]?.[3] && r[k] !== true) return false; const dep = EININGAR[k]?.[2]; return dep ? ON(dep) : true; };
  // Læst í uppsetningu (fyrirtaeki.js) – admin getur þá ekki kveikt á henni í appinu
  const LAST = k => (window.ORG?.einingar || {})[k] === false;
  window.EININGAR = EININGAR; window.ON = ON; window.einLast = LAST; window.EIN_ALLTAF = ALLTAF;
  window.einSig = () => Object.keys(EININGAR).map(k => ON(k) ? 1 : 0).join("");

  // Hvaða eining hver flipi tilheyrir (flipar án línu eru alltaf sýndir)
  window.TAB_EIN = { undir: "undirverk", vsk: "vidskiptavinir", dagatal: "dagatal", fundir: "fundir", timar: "timar", tfaer: "timar", tskyr: "timar",
    trk: "reikningar", skjolmin: "onedrive", skjol: "skjol", skjolnyl: "onedrive", postur: "postur", spjall: "spjall", ltilbod: "leiga", lvorur: "leiga", stilbod: "sala", svorur: "sala" };
  window.tabOn = t => !window.TAB_EIN[t] || ON(window.TAB_EIN[t]);
  // Tegundir í „+ Nýtt“
  window.KIND_EIN = { tima: "timar", kostn: "kostnadur", fund: "fundir", undir: "undirverk", verk: "verkefni", vsk: "vidskiptavinir", skjal: "skjol" };
  window.kindOn = k => !window.KIND_EIN[k] || ON(window.KIND_EIN[k]);
})();
