/* Uppsetning AERA Studio á Atrium. Slóð: https://aerastudio.github.io/atrium/aera/ (sýniútgáfa: ?demo) – í undirmöppu frá 2.6.0.
   Fyrirtækjastillingar – það eina sem þarf að breyta þegar appið er sett upp fyrir annað fyrirtæki (frá 1.3.0).
   Auk þessarar skrár eru fyrirtækjasértæk: firebase-config.js (Firebase-verkefnið), firestore.rules (lén í msUser),
   merki í icons/ og litir/letur í brand.css. Sjá Kerfisskjölun, kafla „Uppsetning fyrir annað fyrirtæki“.
   Engin leyndarmál hér – þetta eru opinber auðkenni. */
window.ORG = {
  nafn: "AERA Studio",
  // Sjálfgefin verðskrá AERA (gildir þar til verðskrá er vistuð í appinu; kr./klst. án VSK) – var áður í verdskra.js fyrir allar uppsetningar
  verdskra: [
    { id: "ljos", heiti: "Ljósahönnun", verd: 10000 },
    { id: "honnun", heiti: "Almenn hönnunarvinna", verd: 10000, sjalfgefid: true },
    { id: "grand", heiti: "Hönnunarvinna – Grand Hótel, stækkun", verd: 12350, verkefni: ["2026-04"] },
    { id: "sonik", heiti: "Sonik hugbúnaðarþróun", verd: 6000, verkefni: ["2026-12"] },
    { id: "annad", heiti: "Önnur vinna", verd: 10000 },
    { id: "almenn", heiti: "Almenn vinna", verd: 8000, almennt: true }
  ],                 // birtist á reikningum, skýrslum, undirskrift o.fl.
  len: "aerastudio.is",                // Microsoft-lén starfsmanna (innskráning)
  vefur: "aerastudio.is",
  appUrl: "https://aerastudio.github.io/atrium/aera/",

  // Microsoft Entra: forritið hjá fyrirtækinu (hét „AERA app“; endurnefnt í „Atrium“)
  // merki fyrirtækisins (neðst í Meira); appið sjálft ber merki Atrium
  logo: { ljos: "icons/logo-ljos.svg", dokk: "icons/logo-dokk.svg" },
  // táknið eitt (án texta) við hlið Atrium í haus, hliðarstiku og innskráningu; annars er logo notað
  merki: { ljos: "icons/merki-ljos.svg", dokk: "icons/merki-dokk.svg" },
  ms: { appNafn: "Atrium", clientId: "bc976045-0274-48bb-a5c3-3a39aa987fd0", tenant: "ed06b359-9189-4e32-aeaa-7454e6be768f" },

  // Fyrsti admin – skráður sjálfkrafa í notendaskrána ef hún er ekki til
  admin: { email: "dagur@aerastudio.is", nafn: "Dagur Fannar Möller", sk: "DFM", titillIS: "Eigandi", titillEN: "Owner" },
  // Google-varaleið var lögð niður 18.10.2026 (1.6.1). Tómt = engin varaleið.
  legacyEmails: [],

  // Möppur í OneDrive/SharePoint (slóð frá rót drifsins)
  od: {
    verkefni: "AERA/Verkefni",
    stofa: "AERA/Stofa",
    reikningar: "AERA/Stofa/Reikningar",
    snidmat: "AERA/Stofa/Sniðmát",
    oflokkad: "Óflokkað",
    mitt: "Atrium",           // „Mín skjöl“ – mappa í OneDrive hvers notanda (tímaskýrslur o.fl.)
    mittAdur: "AERA app"      // eldra heiti möppunnar – endurnefnd sjálfkrafa í „mitt“ (2.1.0)
  },
  // Samstillt OneDrive-mappa á Windows-tölvum starfsmanna (Explorer skilur %UserProfile%)
  odLocal: "%UserProfile%\\OneDrive - AERA Studio ehf",
  // SharePoint-síða fyrirtækisins (frá 1.9.0). Tómt = möppur fyrirtækisins eru í OneDrive þess sem er innskráður (eins og áður).
  // Þegar síðan er tilbúin: sp = "<lén>.sharepoint.com:/sites/<síða>" og AERA-mappan færð í „Documents“ síðunnar (sama uppbygging).
  // Krefst heimildarinnar Files.ReadWrite.All (Delegated, admin consent) í Entra-forritinu.
  sp: "aerastudio.sharepoint.com:/sites/AERA",   // síðan AERA (frá 2.5.1) – AERA-mappan er í Documents › AERA
  spLocal: "%UserProfile%\\AERA Studio ehf\\AERA - Documents",   // samstillt mappa síðunnar á Windows (Sync)
  // Outlook-mappa sem appið flokkar póst úr (ef ekkert sameiginlegt pósthólf)
  postmappa: "AERA",
  // Sameiginlegt pósthólf fyrir verkefnapóst (frá 1.9.5): allir með Full Access í Exchange sjá tengda þræði í heild og
  // geta sent frá því (Send as). Krefst Mail.Read.Shared og Mail.Send.Shared í Entra. Tómt = aðeins eigið pósthólf.
  postholf: "aera@aerastudio.is",
  // Undirskrift í tölvupósti
  sigLogo: "icons/sig-logo.png",
  // Merki á reikningum, tímaskýrslum og fundargerðum (PNG)
  docLogo: "icons/doc-logo.png",
  // Nýja einingaskiptingin og útlitið (pakkaval, 2.21.0 – eins og Dev) og allar einingar opnar; admin síar í Stillingar › Einingar
  personuvernd: { netfang: "aera@aerastudio.is", svaedi: "Belgíu (Google europe-west1, innan EES)" },   // persónuvernd (2.44.1): hýsingarsvæði Firestore; netfang: valfrjálst, annars admin
  pakkaval: true,
  utlit: "I",                          // tölvuútlit I (frá 2.43.0, eins og Dev og party.is); síminn óbreyttur
  einingar: { leiga: true, sala: true, deildir: true, pantanir: true },
  // Hönnunarkerfi (2.49.0, kerfi.css): ein leturstærðaröð, hnappar og reitir í tölvu og síma.
  kerfi: true,
  // Símaútlit (2.45.0–2.49, simi.js og simi.css): Í dag · Leita · (Skanna) · Tímar · Meira.
  simi: "I",
  // Firebase-verkefni uppsetningarinnar (aera-app-cfdb3). Opinber auðkenni vefforrits, ekki leyndarmál.
  firebase: {
    apiKey: "AIzaSyAUyV3MyuFrgpQ2pNMAsQIYnqYnp32hTFs",
    authDomain: "aera-app-cfdb3.firebaseapp.com",
    projectId: "aera-app-cfdb3",
    storageBucket: "aera-app-cfdb3.firebasestorage.app",
    messagingSenderId: "476747764052",
    appId: "1:476747764052:web:396030a039ee790aeb78c1"
  },
  // Þjónusta og sniðmát undirverka AERA (fært úr kjarnanum 2.16.0 – áður sjálfgefið fyrir allar uppsetningar)
  thjonusta: ["Teiknivinna", "Lýsing", "Almennt", "Hönnun & ráðgjöf", "Sala"],
  snidmat: { "Teiknivinna": ["Gögn móttekin og yfirfarin", "Módel", "Teikningar", "Yfirferð", "Útgáfa"], "Lýsing": ["Forsendur", "Ljósateikning", "Capture-módel", "Útgáfa"], "Hönnun & ráðgjöf": ["Hugmyndavinna", "3D render", "Kynning"], "Almennt": [], "Sala": ["Tilboð", "Eftirfylgni"] },
  anMoppu: ["Almennt"],
  undirmoppur: ["01 Móttekið", "02 Vinnuskjöl", "03 Módel", "04 Teikningar", "05 Lýsing", "06 3D Render", "07 Útgefin Gögn", "08 Samskipti og fundir"],   // undirmöppur nýs verkefnis   // verkefni sem eru aðeins „Almennt“ fá ekki eigin möppu
};
