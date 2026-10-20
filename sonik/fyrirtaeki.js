/* Uppsetning Sonik á Atrium (frá 2.3.0). Slóð: https://aerastudio.github.io/atrium/sonik/ (sýniútgáfa: ?demo)
   sonik/index.html er búin til sjálfvirkt úr ../index.html með tools/uppsetningar.py – ekki breyta henni beint.
   Slóðir á skrár hér eru miðaðar við rót appsins (index.html hefur <base href="../">).
   Engin leyndarmál hér – þetta eru opinber auðkenni. Ófyllt gildi (TODO) bíða upplýsinga frá Sonik. */
window.ORG = {
  nafn: "Sonik",
  // Til bráðabirgða: innskráning með Microsoft-aðgangi AERA (dagur@aerastudio.is) þar til aðgangur fæst að Microsoft 365 hjá Sonik.
  // Þá: len → lén Sonik, ms → Entra-forrit/tenant Sonik, admin → fyrsti admin hjá Sonik, og firestore-reglur Sonik uppfærðar.
  len: "aerastudio.is",
  vefur: "sonik.is",
  appUrl: "https://aerastudio.github.io/atrium/sonik/",
  lsForskeyti: "sonik:",               // eigið svæði í localStorage (sama lén og AERA)

  logo: { ljos: "sonik/merki-ljos.svg", dokk: "sonik/merki-dokk.svg" },
  merki: { ljos: "sonik/merki-ljos.svg", dokk: "sonik/merki-dokk.svg" },
  litir: { ljos: "#F2FCFF", dokk: "#0C2127" },   // litur stöðustiku í síma
  ms: { appNafn: "Atrium", clientId: "bc976045-0274-48bb-a5c3-3a39aa987fd0", tenant: "ed06b359-9189-4e32-aeaa-7454e6be768f" },   // til bráðabirgða: Entra-forrit AERA

  admin: { email: "dagur@aerastudio.is", nafn: "Dagur Fannar Möller", sk: "DFM", titillIS: "Eigandi", titillEN: "Owner" },   // til bráðabirgða
  legacyEmails: [],

  od: { verkefni: "Sonik/Verkefni", stofa: "Sonik/Stofa", reikningar: "Sonik/Stofa/Reikningar", snidmat: "Sonik/Stofa/Sniðmát", oflokkad: "Óflokkað", mitt: "Atrium" },
  odLocal: "",
  sp: "aerastudio.sharepoint.com:/sites/Atrium-Sonik",   // til bráðabirgða hjá AERA (frá 2.5.1) – Documents › Sonik; flyst til Sonik með eigin M365
  spLocal: "%UserProfile%\\AERA Studio ehf\\Atrium - Sonik - Documents",
  postmappa: "Sonik",
  postholf: "",
  sigLogo: "sonik/sig-logo.png",
  docLogo: "sonik/doc-logo.png",
  // Einingar: true = kveikt á sjálfgefið óvirkri einingu; false = læst (admin getur ekki kveikt)
  einingar: { leiga: true, sala: true, verdskra: false },   // verdskra: false = Verðskrá læst (á aðeins við AERA)
  // Firebase-verkefni Sonik (atrium-sonik). Opinber auðkenni vefforrits, ekki leyndarmál.
  firebase: {
    apiKey: "AIzaSyCxuTQrngLVcptXtatN70I2Lf6S3zEk420",
    authDomain: "atrium-sonik.firebaseapp.com",
    projectId: "atrium-sonik",
    storageBucket: "atrium-sonik.firebasestorage.app",
    messagingSenderId: "656889180932",
    appId: "1:656889180932:web:682c3c921757b8a70e1651"
  }
};
