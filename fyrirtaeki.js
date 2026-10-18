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
  // Tímabundin varaleið (Google). Tómt = engin varaleið.
  legacyEmails: ["aerastudioice@gmail.com"],

  // Möppur í OneDrive/SharePoint (slóð frá rót drifsins)
  od: {
    verkefni: "AERA/Verkefni",
    stofa: "AERA/Stofa",
    reikningar: "AERA/Stofa/Reikningar",
    snidmat: "AERA/Stofa/Sniðmát",
    oflokkad: "Óflokkað"
  },
  // Outlook-mappa sem appið flokkar póst úr
  postmappa: "AERA",
  // Undirskrift í tölvupósti
  sigLogo: "icons/sig-logo.png"
};
