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
    // Frá 2.22.0 (pakkaval): tilboð óháð Leigu og Sölu – þjónusta og föst upphæð alltaf; leigu- og sölulínur ef Vörulisti og lager er virkur
    tilbod:         ["Tilboð", "Tilboð með þjónustu og föstu verði (leigu- og sölulínur ef Vörulisti og lager er virkur), útgáfur, PDF og sending"],
    skjol:          ["Skjöl", "Skjalalisti fyrirtækisins (Word, Excel, Canva, tenglar)"],
    onedrive:       ["OneDrive og SharePoint", "Möppur verkefna, Mín skjöl, Nýlegt og forskoðun skráa"],
    postur:         ["Póstur", "Outlook-pósthólf, verkefnapóstur og póstþræðir á verkefnum"],
    spjall:         ["Spjall", "Spjallrásir og bein skilaboð milli starfsfólks"],
    // Frá 2.4.0 (aðskildar deildir frá 2.5.0) – sjálfgefið óvirkar (4. gildi = 1): kveikt á í uppsetningu
    // (fyrirtaeki.js › einingar: { leiga: true, sala: true }) eða af admin. Kóðinn er í sala.js.
    leiga:          ["Leiga", "Búnaðarlisti og leigutilboð með leigudögum og dagstuðlum, pakkar og tæknimenn", null, 1],
    sala:           ["Sala", "Vörulisti með lagerstöðu og sölutilboð (heildsala og install)", null, 1],
    // Frá 2.8.0 – deildarval efst og verkefni, Heim og dagatal síuð eftir deild (deildir.js). Deildirnar = Leiga/Sala sem eru virkar.
    // Frá 2.20.0 (aðeins með pakkavali): pantanir og erindi án verkefnis – sami ritill og tilboð, frátekning leigubúnaðar
    ...(window.ORG?.pakkaval ? { pantanir: ["Pantanir", "Pantanir og erindi án verkefnis: viðskiptavinur, línur úr vörulista, afhending og skil, uppruni (sími, tölvupóstur, Shopify …)", null, 1] } : {}),
    // Frá 2.45.0 (fyrst í dev/): QR-merki á eintök leigubúnaðar, skanni í öllum tækjum (líka iPhone), skönnun út og inn á pöntunum (qr.js). Sjálfgefið óvirk.
    // 2.105.0: líka strikamerki söluvara (tiltekt, afhending, talning og vörumóttaka) – krefst ekki lengur Leigu, nóg að Leiga eða Sala sé virk.
    qr:             ["QR-merki og skanni", "Skanni í síma og tölvu: QR-merki á eintök leigubúnaðar og strikamerki (EAN) söluvara – pökkun, afhending og skil á pöntunum, talning á lager og vörumóttaka", null, 1],
    // Frá 2.55.0 (fyrst í dev/): Pöntunarferli – sent/sótt, afhending og móttaka með kvittun, tínslulisti, skilauppgjör, staðgengill, pöntun úr pósti, sniðmát, ferð dagsins (pantanir2.js). Sjálfgefið óvirk.
    pferli:         ["Pöntunarferli", "Sent eða sótt, afhending og móttaka með undirskrift og mynd, pökkunarlisti með skanna, skilauppgjör, staðgengill við árekstur, pöntun úr pósti, sniðmát og ferð dagsins", "pantanir", 1],
    // Frá 2.53.0 (fyrst í dev/): Snjall-Heim – Loka deginum, viðvaranir, hver er hvar, skipanalína og rekstrarpúls á Heim (snjall.js). Sjálfgefið óvirk.
    // Frá 2.67.0 (fyrst í dev/): Verkefnagreining og Aukaverk (verkplus.js). Sjálfgefið óvirkar.
    vgreind:        ["Verkefnagreining", "Afkoma verkefna í rauntíma (tekjur, kostnaður, framlegð og spá), lokauppgjör við lok verkefnis og tillaga að áætlun út frá fyrri verkefnum", null, 1],
    aukaverk:       ["Aukaverk", "Aukaverk á verkefnum sem viðskiptavinurinn samþykkir með tengli og undirskrift; samþykkt aukaverk fara í áætlun og á reikning", null, 1],
    snjall:         ["Snjall-Heim", "Á Heim: drög að tímaskráningu dagsins (Loka deginum), viðvaranir um áætlun og bókanir, hver er hvar, skipanalína í mæltu máli og rekstrarpúls", null, 1],
    // Frá 2.95.0: Rekstrarlínur (rlinur.js) – eigin línur fyrirtækisins þvert á svið, t.d. Drykkjaþjónusta. Sjálfgefið óvirk.
    rlinur:         ["Rekstrarlínur", "Eigin rekstrarlínur fyrirtækisins (t.d. Drykkjaþjónusta) þvert á leigu, sölu og þjónustu: tilboð, pantanir og verkefni merkt línu, sjálfkrafa út frá vöruflokkum, og sía í listum og yfirlitum", null, 1],
    deildir:        ["Deildir", "Leiga og Sala sem deildir: deildarval efst, verkefni merkt deild og Heim, verkefni og dagatal síuð", null, 1]
  };
  // Pakkar og tengingar (frá 2.14.0, einingatillagan 21.10.2026): einingarnar flokkaðar í kjarna, fimm pakka og tengingar.
  // Pakki er lag OFAN Á einingarnar: slökkt pakki slekkur á öllum einingum hans; kveikt pakki lætur einingarnar ráða sjálfar.
  // Ekkert breytist hjá uppsetningu sem hefur hvorki ORG.pakkar né S.stillingar.pakkar. Nýja stillingasíðan og flokkuð
  // valmynd birtast aðeins þar sem ORG.pakkaval = true (fyrst í dev/).
  // lykill: [heiti, lýsing, einingar pakkans]
  // Leiðir og pakkar (2.97.0, verðlíkan 26.10.2026): KJARNI (alltaf) + kjarnaeiningar sem admin velur, og þrír PAKKAR sem
  // LEIÐ uppsetningarinnar opnar (ORG.leid: core · pro · complete; ORG.aukapakkar bætir stökum pakka við). Innan þess sem er
  // opið kveikir admin og slekkur. Uppsetning án ORG.leid hefur alla pakka opna eins og áður.
  const PAKKAR = {
    leigasala: ["Leiga og sala", "Vörulisti, leiga, sala, lager, pantanir og QR-merki", ["leiga", "sala", "pantanir", "qr", "deildir"]],
    afhending: ["Afhending", "Pöntunarferli: staðfesting, greiðsla, pökkun, undirskrift og skil", ["pferli"]],
    yfirsyn:   ["Yfirsýn", "Verkefnagreining, aukaverk, Snjall-Heim og rekstrarlínur", ["vgreind", "aukaverk", "snjall", "rlinur"]]
  };
  const LEIDIR = {
    core:     { heiti: "Core",     d: "Kjarninn – verkefni, tímar, tilboð og reikningsdrög", pakkar: [] },
    pro:      { heiti: "Pro",      d: "Kjarninn + Leiga og sala og Afhending", pakkar: ["leigasala", "afhending"] },
    complete: { heiti: "Complete", d: "Allt – líka Yfirsýn og nýjar einingar", pakkar: ["leigasala", "afhending", "yfirsyn"] }
  };
  // Einingar kjarnans sem admin getur slökkt á (verkefni og viðskiptavinir eru alltaf virk)
  const KJARNI_EIN = ["undirverk", "dagatal", "fundir", "timar", "kostnadur", "tilbod", "verdskra", "reikningar"];
  // Eldri pakkar (2.14–2.96): ef admin slökkti á gömlum pakka teljast einingar hans óvirkar þar til kveikt er á þeim aftur
  const GAMLIR = { verkstjorn: ["undirverk", "dagatal", "fundir"], timar: ["timar", "kostnadur"], tilbod: ["tilbod", "verdskra"], bunadur: ["leiga", "sala", "qr"], fjarmal: ["reikningar"] };
  const TENGINGAR = {
    m365skrar:  ["Microsoft 365 – skrár", "Möppur verkefna á SharePoint/OneDrive, Mín skjöl, Nýlegt og skjalalisti", ["skjol", "onedrive"]],
    m365postur: ["Microsoft 365 – póstur", "Pósthólf, verkefnapóstur og póstþræðir á verkefnum", ["postur"]],
    spjall:     ["Spjall", "Spjallrásir og bein skilaboð milli starfsfólks", ["spjall"]],
    claude:     ["Claude-aðstoð", "Spurningar og skráningar í mæltu máli", [], "Væntanlegt"]
  };
  const PAKKI_AF = {}; [PAKKAR, TENGINGAR].forEach(G => Object.entries(G).forEach(([p, v]) => v[2].forEach(k => { PAKKI_AF[k] = p; })));
  // Útlit I (dev): Pantanir eru hluti af kjarnanum, alltaf virkar, ekki í pakkanum Vörulisti og lager
  const KJARNI = ["verkefni", "vidskiptavinir", ...(window.ORG?.pakkaval && window.ORG?.utlit === "I" && !window.ORG?.leid ? ["pantanir"] : [])];
  const ALLTAF = window.ORG?.pakkaval ? KJARNI.slice() : ["verkefni"];
  // S er skilgreint með let í app-grunnur.js (ekki á window) – lesið við keyrslu
  const st = () => { try { return typeof S !== "undefined" ? S : null; } catch (e) { return null; } };
  const gamalt = () => { const P = st()?.stillingar?.pakkar || {}, o = {}; Object.entries(GAMLIR).forEach(([p, ks]) => { if (P[p] === false) ks.forEach(k => { o[k] = false; }); }); return o; };
  const raw = () => ({ ...(window.ORG?.einingar || {}), ...gamalt(), ...(st()?.stillingar?.einingar || {}) });
  const leid = () => LEIDIR[window.ORG?.leid] || null;
  const leidPakkar = () => { const L = leid(); return L ? L.pakkar.concat(window.ORG?.aukapakkar || []) : null; };
  // Er eining virk? (og sú sem hún er háð)
  // Er pakki/tenging virk? false í fyrirtaeki.js = ekki í boði (læst); admin slekkur í S.stillingar.pakkar
  const pakkiLast = p => (window.ORG?.pakkar || {})[p] === false || (!!PAKKAR[p] && !!leidPakkar() && !leidPakkar().includes(p));
  const pakkiOn = p => { if (!p) return true; if (pakkiLast(p)) return false; const v = (st()?.stillingar?.pakkar || {})[p]; return v !== false; };
  const ON = k => { if (ALLTAF.includes(k)) return true; if (!pakkiOn(PAKKI_AF[k])) return false; if ((window.ORG?.einingar || {})[k] === false) return false; const r = raw(); if (r[k] === false || r[k] === 0) return false; if (EININGAR[k]?.[3] && r[k] !== true) return false; const dep = EININGAR[k]?.[2]; return dep ? ON(dep) : true; };
  // Læst í uppsetningu (fyrirtaeki.js) – admin getur þá ekki kveikt á henni í appinu
  const LAST = k => (window.ORG?.einingar || {})[k] === false || pakkiLast(PAKKI_AF[k]);
  window.PAKKAR = PAKKAR; window.TENGINGAR = TENGINGAR; window.PAKKI_AF = PAKKI_AF; window.KJARNI = KJARNI;
  window.LEIDIR = LEIDIR; window.KJARNI_EIN = KJARNI_EIN; window.leidNu = () => (leid() ? { k: window.ORG.leid, ...leid(), auka: window.ORG?.aukapakkar || [] } : null);
  window.pakkiOn = pakkiOn; window.pakkiLast = pakkiLast;
  // Eru tilboð virk? (2.22.0) Pakkaval: einingin Tilboð; annars Leiga eða Sala eins og áður
  window.tbOK = () => (window.ORG?.pakkaval ? ON("tilbod") : (ON("leiga") || ON("sala")));
  window.EININGAR = EININGAR; window.ON = ON; window.einLast = LAST; window.EIN_ALLTAF = ALLTAF;
  window.einSig = () => Object.keys(EININGAR).map(k => ON(k) ? 1 : 0).join("") + "|" + (window.VIEWAS?.hlutverk || window.USER?.hlutverk || "");

  // Hvaða eining hver flipi tilheyrir (flipar án línu eru alltaf sýndir)
  window.TAB_EIN = { undir: "undirverk", vsk: "vidskiptavinir", dagatal: "dagatal", fundir: "fundir", timar: "timar", tfaer: "timar", tskyr: "timar",
    trk: "reikningar", skjolmin: "onedrive", skjol: "skjol", skjolnyl: "onedrive", postur: "postur", spjall: "spjall", lverk: "deildir", sverk: "deildir", lvsk: ["deildir", "vidskiptavinir"], svsk: ["deildir", "vidskiptavinir"], ltilbod: "leiga", lvorur: "leiga", stilbod: "sala", svorur: "sala" };
  window.tabOn = t => !window.TAB_EIN[t] || [].concat(window.TAB_EIN[t]).every(k => ON(k)); // gildi má vera fylki (allar einingar þurfa að vera virkar)
  // Tegundir í „+ Nýtt“
  window.KIND_EIN = { tima: "timar", kostn: "kostnadur", fund: "fundir", undir: "undirverk", verk: "verkefni", vsk: "vidskiptavinir", skjal: "skjol" };
  window.kindOn = k => !window.KIND_EIN[k] || ON(window.KIND_EIN[k]);
})();
