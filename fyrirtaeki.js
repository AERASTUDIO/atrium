/* Fyrirtækjastillingar – það eina sem þarf að breyta þegar appið er sett upp fyrir annað fyrirtæki (frá 1.3.0).
   Auk þessarar skrár eru fyrirtækjasértæk: firebase-config.js (Firebase-verkefnið), firestore.rules (lén í msUser),
   merki í icons/ og litir/letur í brand.css. Sjá Kerfisskjölun, kafla „Uppsetning fyrir annað fyrirtæki“.
   Engin leyndarmál hér – þetta eru opinber auðkenni. */
window.ORG = {
  nafn: "AERA Studio",                 // birtist á reikningum, skýrslum, undirskrift o.fl.
  len: "aerastudio.is",                // Microsoft-lén starfsmanna (innskráning)
  vefur: "aerastudio.is",
  appUrl: "https://aerastudio.github.io/aera-app/",

  // Microsoft Entra: forritið „AERA app“ hjá fyrirtækinu
  ms: { clientId: "bc976045-0274-48bb-a5c3-3a39aa987fd0", tenant: "ed06b359-9189-4e32-aeaa-7454e6be768f" },

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
    mitt: "AERA app"          // „Mín skjöl“ – mappa í OneDrive hvers notanda (tímaskýrslur o.fl.)
  },
  // Samstillt OneDrive-mappa á Windows-tölvum starfsmanna (Explorer skilur %UserProfile%)
  odLocal: "%UserProfile%\\OneDrive - AERA Studio ehf",
  // SharePoint-síða fyrirtækisins (frá 1.9.0). Tómt = möppur fyrirtækisins eru í OneDrive þess sem er innskráður (eins og áður).
  // Þegar síðan er tilbúin: sp = "<lén>.sharepoint.com:/sites/<síða>" og AERA-mappan færð í „Documents“ síðunnar (sama uppbygging).
  // Krefst heimildarinnar Files.ReadWrite.All (Delegated, admin consent) í Entra-forritinu.
  sp: "",
  spLocal: "",                         // samstillt mappa síðunnar á Windows, t.d. "%UserProfile%\\AERA Studio ehf\\AERA - Documents"
  // Outlook-mappa sem appið flokkar póst úr
  postmappa: "AERA",
  // Undirskrift í tölvupósti
  sigLogo: "icons/sig-logo.png"
};
