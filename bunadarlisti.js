/* Staðlaður búnaðarlisti fyrir tækjaleigu (frá 2.19.0) – almennur upphafslisti sem admin getur hlaðið inn í Búnað
   (Búnaður › „Hlaða inn búnaðarlista“) og lagað að sínu: verð, fjöldi og lýsingar eru dæmigerð viðmið, án VSK, á dag.
   Engin fyrirtækjagögn. Línur: [nr, heiti, flokkur, verð á dag, fjöldi, lýsing]; vinna: [nr, heiti, eining, verð, lýsing];
   pakkar: [nr, heiti, verð á dag, lýsing, [[nr, magn], …]]. */
(function () {
  const F = ["Hljóðkerfi", "Hljóðnemar", "Hljóðblöndun", "Ljós", "Ljósastýring og effektar", "LED-skjáir", "Sjónvörp og skjávarpar", "Myndbúnaður og streymi", "Svið og truss", "Rafmagn og snúrur", "Fjarskipti", "Viðburðabúnaður"];
  const B = [
    // Hljóðkerfi
    ["H-101", "Hátalari 12\" virkur (1.300 W)", "Hljóðkerfi", 4500, 12, "Virkur 12\" hátalari með tveggja leiða kerfi. Hentar fundum, ræðum og minni viðburðum allt að 150 manns."],
    ["H-102", "Hátalari 15\" virkur (2.000 W)", "Hljóðkerfi", 5500, 8, "Öflugur 15\" hátalari fyrir tónlist og stærri sali."],
    ["H-103", "Bassabox 18\" virkt (2.000 W)", "Hljóðkerfi", 6500, 6, "Virkt 18\" bassabox – oft notað í pari með 12\"/15\" hátölurum."],
    ["H-104", "Línukerfi – eining (line array)", "Hljóðkerfi", 9500, 12, "Ein eining í línukerfi fyrir stóra sali og útitónleika. Hengt í ramma eða staflað."],
    ["H-105", "Línukerfi – bassi (dual 18\")", "Hljóðkerfi", 12000, 6, "Tvöfalt 18\" bassabox fyrir línukerfi."],
    ["H-106", "Mónitor (sviðshátalari) 12\"", "Hljóðkerfi", 3500, 10, "Fleyghátalari fyrir svið – listamenn heyra í sér."],
    ["H-107", "Hátalarastandur", "Hljóðkerfi", 600, 20, "Þrífótur fyrir hátalara, allt að 50 kg."],
    ["H-108", "Ferðahátalari með rafhlöðu", "Hljóðkerfi", 3000, 4, "Rafhlöðuknúinn hátalari með þráðlausum hljóðnema – útiviðburðir og leiðsögn."],
    // Hljóðnemar
    ["N-201", "Hljóðnemi með snúru (söngur)", "Hljóðnemar", 1200, 20, "Dýnamískur söng-/ræðuhljóðnemi, klassískur á sviði."],
    ["N-202", "Hljóðnemi fyrir hljóðfæri", "Hljóðnemar", 1200, 16, "Dýnamískur hljóðnemi fyrir trommur, magnara og hljóðfæri."],
    ["N-203", "Þráðlaus handhljóðnemi", "Hljóðnemar", 5500, 12, "Stafrænn þráðlaus hljóðnemi með móttakara, rafhlöður fylgja."],
    ["N-204", "Þráðlaus höfuðspangarhljóðnemi (headset)", "Hljóðnemar", 6000, 8, "Fyrir ræðumenn og kynna sem þurfa hendur lausar."],
    ["N-205", "Þráðlaus barmhljóðnemi (lavalier)", "Hljóðnemar", 5500, 8, "Lítill hljóðnemi á barm – viðtöl, upptökur og leiksýningar."],
    ["N-206", "Ræðupúltshljóðnemi (gooseneck)", "Hljóðnemar", 2500, 6, "Svanaháls-hljóðnemi á púlt eða borð."],
    ["N-207", "Hljóðnemastandur", "Hljóðnemar", 500, 30, "Standur með bómu."],
    ["N-208", "Borðstandur fyrir hljóðnema", "Hljóðnemar", 300, 10, "Stuttur standur á borð – pallborð og fundir."],
    // Hljóðblöndun
    ["M-301", "Stafrænt mixerborð 16 rása", "Hljóðblöndun", 12000, 3, "Lítið stafrænt mixerborð – fundir og minni tónleikar."],
    ["M-302", "Stafrænt mixerborð 32 rása", "Hljóðblöndun", 18000, 3, "Stafrænt mixerborð með sviðsboxi – tónleikar og stærri viðburðir."],
    ["M-303", "Stafrænt sviðsbox (stage box) 32/16", "Hljóðblöndun", 8000, 3, "Stafrænt sviðsbox, ein snúra frá sviði í mixer."],
    ["M-304", "DI-box", "Hljóðblöndun", 800, 16, "Tengir hljóðfæri og tölvur við mixer."],
    ["M-305", "Spilari / tónlistarspilun (tölva + hljóðkort)", "Hljóðblöndun", 4000, 2, "Fyrir bakgrunnstónlist og innkomulög."],
    ["M-306", "Heyrnartól fyrir hljóðmann", "Hljóðblöndun", 600, 4, "Lokuð heyrnartól."],
    // Ljós
    ["L-401", "LED-kastari (PAR)", "Ljós", 1500, 40, "RGBW LED-kastari – litaður bakgrunnur og salarljós."],
    ["L-402", "Rafhlöðuknúinn LED-kastari (uplight)", "Ljós", 1800, 30, "Þráðlaus LED-kastari með rafhlöðu – lýsir upp veggi og súlur án snúra."],
    ["L-403", "Hreyfiljós – spot", "Ljós", 6500, 12, "Hreyfiljós með gobo-mynstrum og litum."],
    ["L-404", "Hreyfiljós – wash", "Ljós", 6000, 12, "Hreyfiljós sem lýsir jafnt yfir svið."],
    ["L-405", "Hreyfiljós – beam", "Ljós", 6000, 8, "Mjór, öflugur ljósgeisli – tónleikar og partý."],
    ["L-406", "Prófílljós (ellipsoidal)", "Ljós", 3500, 8, "Skarpt ljós á ræðumann eða púlt."],
    ["L-407", "LED-ljósastika (bar)", "Ljós", 2500, 16, "Stika með mörgum LED-perum – baklýsing og effektar."],
    ["L-408", "Strobe-ljós", "Ljós", 3000, 4, "Blikkljós."],
    ["L-409", "Eltiljós (follow spot)", "Ljós", 9000, 2, "Handstýrt ljós sem eltir listamann."],
    ["L-410", "Ljósastandur (T-bar)", "Ljós", 1000, 12, "Standur fyrir 2–4 ljós."],
    // Ljósastýring og effektar
    ["E-501", "Ljósaborð (DMX-stjórnborð)", "Ljósastýring og effektar", 9000, 2, "Ljósastjórnborð fyrir hreyfiljós og kastara."],
    ["E-502", "Þráðlaust DMX-sett", "Ljósastýring og effektar", 3000, 4, "Sendir og móttakari – stýrir ljósum án snúra."],
    ["E-503", "Móðuvél (hazer)", "Ljósastýring og effektar", 5000, 3, "Jöfn móða sem lætur ljósgeisla sjást."],
    ["E-504", "Reykvél", "Ljósastýring og effektar", 3500, 3, "Þéttur reykur fyrir effekta."],
    ["E-505", "Lágreykur (low fog)", "Ljósastýring og effektar", 9000, 1, "Reykur sem liggur við gólf – fyrsti dans og innkomur."],
    ["E-506", "Speglakúla með mótor", "Ljósastýring og effektar", 3000, 2, "Klassísk diskókúla, 50 cm."],
    ["E-507", "Glimmer-/konfettíbyssa", "Ljósastýring og effektar", 6000, 2, "Konfettí-skot – hápunktur viðburðar (konfettí selt sér)."],
    // LED-skjáir
    ["S-601", "LED-skjáveggur innandyra (á m²)", "LED-skjáir", 18000, 40, "LED-einingar 50 × 50 cm, pixlabil 2,6 mm. Verð á fermetra á dag."],
    ["S-602", "LED-skjáveggur utandyra (á m²)", "LED-skjáir", 22000, 24, "Vatnsheldar LED-einingar með mikilli birtu fyrir dagsbirtu."],
    ["S-603", "Myndvinnsluvél fyrir LED (processor)", "LED-skjáir", 12000, 3, "Stýrir LED-vegg og skiptir milli mynduppspretta."],
    ["S-604", "Rammi og fætur fyrir LED-vegg", "LED-skjáir", 6000, 3, "Burðarvirki fyrir LED-vegg á gólfi, allt að 4 × 3 m."],
    // Sjónvörp og skjávarpar
    ["T-701", "Sjónvarp 55\" á fæti", "Sjónvörp og skjávarpar", 7000, 6, "4K sjónvarp á hjólastandi."],
    ["T-702", "Sjónvarp 65\" á fæti", "Sjónvörp og skjávarpar", 9000, 6, "4K sjónvarp á hjólastandi."],
    ["T-703", "Sjónvarp 75\" á fæti", "Sjónvörp og skjávarpar", 12000, 4, "4K sjónvarp á hjólastandi."],
    ["T-704", "Sjónvarp 86\" á fæti", "Sjónvörp og skjávarpar", 18000, 2, "4K sjónvarp á hjólastandi – stórir fundarsalir."],
    ["T-705", "Skjávarpi 6.000 lúmen", "Sjónvörp og skjávarpar", 15000, 3, "Fyrir sali með tjaldi allt að 4 m."],
    ["T-706", "Skjávarpi 12.000 lúmen", "Sjónvörp og skjávarpar", 30000, 1, "Öflugur varpi fyrir stóra sali og varpanir á byggingar."],
    ["T-707", "Sýningartjald 3 × 2 m (rammatjald)", "Sjónvörp og skjávarpar", 6000, 3, "Fram- eða bakvörpun."],
    ["T-708", "Sýningartjald 5 × 3 m (rammatjald)", "Sjónvörp og skjávarpar", 10000, 2, "Fram- eða bakvörpun."],
    ["T-709", "Kynningarfjarstýring (clicker)", "Sjónvörp og skjávarpar", 800, 6, "Þráðlaus fjarstýring fyrir glærur."],
    ["T-710", "Fartölva fyrir kynningar", "Sjónvörp og skjávarpar", 5000, 3, "Með PowerPoint og öllum helstu tengjum."],
    // Myndbúnaður og streymi
    ["V-801", "PTZ-myndavél", "Myndbúnaður og streymi", 12000, 4, "Fjarstýrð myndavél – streymi og upptökur."],
    ["V-802", "Myndblandari (vision mixer)", "Myndbúnaður og streymi", 10000, 2, "Skiptir milli myndavéla og glæra í beinni."],
    ["V-803", "Streymissett (encoder + stjórnun)", "Myndbúnaður og streymi", 15000, 2, "Streymir á YouTube, Teams, Zoom o.fl."],
    ["V-804", "HDMI-dreifari og breytar", "Myndbúnaður og streymi", 1500, 6, "Dreifir mynd á marga skjái."],
    ["V-805", "Þráðlaus HDMI-sending", "Myndbúnaður og streymi", 4000, 3, "Mynd frá tölvu í skjá án snúru, allt að 50 m."],
    // Svið og truss
    ["T-901", "Sviðspallur 2 × 1 m", "Svið og truss", 3500, 24, "Stillanleg hæð 20–100 cm. Teppi og pils fylgja."],
    ["T-902", "Tröppur fyrir svið", "Svið og truss", 2000, 4, "Með handriði."],
    ["T-903", "Truss 2 m (ferhyrnt 30 cm)", "Svið og truss", 2000, 20, "Ál-truss fyrir ljós og skjái."],
    ["T-904", "Truss 3 m (ferhyrnt 30 cm)", "Svið og truss", 2500, 16, "Ál-truss fyrir ljós og skjái."],
    ["T-905", "Truss-fótur (base plate)", "Svið og truss", 2500, 12, "Undirstaða fyrir lóðrétt truss."],
    ["T-906", "Lyftiturn (wind-up) fyrir ljós/hátalara", "Svið og truss", 5000, 6, "Lyftir allt að 120 kg í 5 m hæð."],
    ["T-907", "Ræðupúlt", "Svið og truss", 4000, 3, "Svart ræðupúlt – merki fyrirtækis má setja framan á."],
    ["T-908", "Svartur dúkur / sviðstjald (á m)", "Svið og truss", 800, 40, "Hylur bakgrunn og bakvið-svæði."],
    // Rafmagn og snúrur
    ["R-1001", "Rafmagnstafla 32 A (3 fasa)", "Rafmagn og snúrur", 4000, 4, "Dreifir rafmagni í 230 V tengla."],
    ["R-1002", "Rafmagnstafla 63 A (3 fasa)", "Rafmagn og snúrur", 6000, 2, "Fyrir stór ljósa- og hljóðkerfi."],
    ["R-1003", "Framlengingarsnúra 10 m", "Rafmagn og snúrur", 500, 30, "230 V, 3 tenglar."],
    ["R-1004", "Fjöltengi", "Rafmagn og snúrur", 300, 30, "6 tengla, með rofa."],
    ["R-1005", "XLR-snúra 10 m", "Rafmagn og snúrur", 300, 60, "Hljóð- eða DMX-snúra."],
    ["R-1006", "HDMI-snúra 10 m", "Rafmagn og snúrur", 500, 20, "4K."],
    ["R-1007", "Snúruhlíf (kapalbrú) 1 m", "Rafmagn og snúrur", 400, 20, "Ver snúrur á gönguleiðum."],
    ["R-1008", "Rafstöð 5 kW", "Rafmagn og snúrur", 15000, 2, "Fyrir útiviðburði án rafmagns. Eldsneyti selt sér."],
    // Fjarskipti
    ["F-1101", "Talstöð", "Fjarskipti", 1500, 16, "Með heyrnartóli – starfsfólk og öryggisgæsla."],
    ["F-1102", "Intercom-kerfi (4 stöðvar)", "Fjarskipti", 9000, 2, "Samskipti tæknifólks, sviðsstjóra og myndatöku."],
    ["F-1103", "Túlkabúnaður (sendir + 20 móttakarar)", "Fjarskipti", 25000, 1, "Þráðlaus túlkun á ráðstefnum."],
    // Viðburðabúnaður
    ["X-1201", "Myndakassi (photo booth)", "Viðburðabúnaður", 45000, 2, "Myndakassi með prentara, bakgrunni og leikmunum. Útprentanir fylgja."],
    ["X-1202", "Karaoke-kerfi", "Viðburðabúnaður", 15000, 2, "Skjár, tveir þráðlausir hljóðnemar og lagasafn."],
    ["X-1203", "Plötuspilarabúnaður fyrir plötusnúð (DJ-sett)", "Viðburðabúnaður", 12000, 2, "Tveir spilarar og DJ-mixer."],
    ["X-1204", "Dansgólf með LED-ljósum (á m²)", "Viðburðabúnaður", 6000, 36, "Upplýst dansgólf í einingum."],
    ["X-1205", "Upplýstir stafir (á staf)", "Viðburðabúnaður", 3000, 20, "1,2 m háir LED-stafir – t.d. LOVE eða nafn fyrirtækis."]
  ];
  const V = [
    ["W-01", "Hljóðmaður", "klst.", 9500, "Hljóðmaður sér um uppsetningu og hljóðblöndun á viðburði."],
    ["W-02", "Ljósamaður", "klst.", 9500, "Ljósamaður hannar og stýrir ljósum á viðburði."],
    ["W-03", "Myndtæknimaður / streymi", "klst.", 10500, "Myndavélar, myndblöndun og streymi."],
    ["W-04", "Tæknimaður (almennur)", "klst.", 8500, "Aðstoð á viðburði, umsjón búnaðar."],
    ["W-05", "Uppsetning og niðurtaka", "klst.", 7500, "Uppsetning búnaðar fyrir viðburð og frágangur á eftir."],
    ["W-06", "Verkstjórn tæknimála (production manager)", "klst.", 12000, "Skipulag og stjórn tæknihliðar viðburðar."],
    ["W-07", "Akstur – sendibíll", "ferð", 15000, "Flutningur búnaðar innan höfuðborgarsvæðis, hvor leið."],
    ["W-08", "Akstur – vörubíll", "ferð", 28000, "Flutningur stærri kerfa (svið, LED-veggur)."],
    ["W-09", "Akstur utan höfuðborgarsvæðis", "km", 250, "Hver ekinn km utan höfuðborgarsvæðis."],
    ["W-10", "Næturvinna / helgarálag", "klst.", 4000, "Álag ofan á tímagjald utan dagvinnu."]
  ];
  const P = [
    ["P-01", "Fundapakki – lítill", 12000, "Fyrir fundi og kynningar allt að 60 manns.", [["H-101", 2], ["H-107", 2], ["N-203", 2], ["M-301", 1], ["T-705", 1], ["T-707", 1], ["T-709", 1]]],
    ["P-02", "Hljóðkerfi – lítið (allt að 150 manns)", 18000, "Tveir hátalarar, bassi, mixer og tveir þráðlausir hljóðnemar.", [["H-101", 2], ["H-103", 1], ["H-107", 2], ["M-301", 1], ["N-203", 2]]],
    ["P-03", "Hljóðkerfi – miðlungs (allt að 400 manns)", 42000, "Fjórir 15\" hátalarar, tvö bassabox, 32 rása mixer og sviðsbox.", [["H-102", 4], ["H-103", 2], ["H-107", 4], ["M-302", 1], ["M-303", 1], ["N-203", 4], ["H-106", 2]]],
    ["P-04", "Árshátíðarljós", 35000, "Litaljós á veggi, hreyfiljós á dansgólf, móðuvél og ljósaborð.", [["L-402", 12], ["L-403", 4], ["L-404", 4], ["E-501", 1], ["E-503", 1], ["T-906", 2]]],
    ["P-05", "Streymispakki", 38000, "Tvær PTZ-myndavélar, myndblandari og streymissett.", [["V-801", 2], ["V-802", 1], ["V-803", 1], ["V-804", 1]]],
    ["P-06", "Partýpakki", 48000, "Hljóðkerfi, DJ-sett, ljós og speglakúla – tilbúið partý.", [["H-102", 2], ["H-103", 2], ["X-1203", 1], ["L-402", 8], ["L-405", 2], ["E-504", 1], ["E-506", 1]]]
  ];
  window.BUNADARLISTI = { flokkar: F, bunadur: B, vinna: V, pakkar: P };
})();
