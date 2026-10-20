/* Uppsetning party.is (Bardús ehf.) á Atrium (frá 2.10.0). Slóð: https://aerastudio.github.io/atrium/party/ (sýniútgáfa: ?demo)
   party/index.html er búin til sjálfvirkt úr ../app.html með tools/uppsetningar.py – ekki breyta henni beint.
   Slóðir á skrár hér eru miðaðar við rót appsins (index.html hefur <base href="../">).
   Engin leyndarmál hér – þetta eru opinber auðkenni. Ófyllt gildi (TODO) bíða upplýsinga frá party.is. */
window.ORG = {
  nafn: "Party.is",
  // Til bráðabirgða: innskráning með Microsoft-aðgangi AERA (dagur@aerastudio.is) þar til party.is fær eigið Microsoft 365.
  // Þá: len → party.is, ms → Entra-forrit party.is, admin → fyrsti admin party.is, og party/firestore.rules uppfærðar.
  len: "aerastudio.is",
  vefur: "party.is",
  appUrl: "https://aerastudio.github.io/atrium/party/",
  lsForskeyti: "party:",               // eigið svæði í localStorage (sama lén og AERA)

  logo: { ljos: "party/merki.png", dokk: "party/merki.png" },
  merki: { ljos: "party/merki.png", dokk: "party/merki.png" },
  litir: { ljos: "#EEF3FE", dokk: "#24418F" },   // litur stöðustiku í síma
  ms: { appNafn: "Atrium", clientId: "bc976045-0274-48bb-a5c3-3a39aa987fd0", tenant: "ed06b359-9189-4e32-aeaa-7454e6be768f" },   // til bráðabirgða: Entra-forrit AERA

  admin: { email: "dagur@aerastudio.is", nafn: "Dagur Fannar Möller", sk: "DFM", titillIS: "Eigandi", titillEN: "Owner" },   // til bráðabirgða
  legacyEmails: [],

  od: { verkefni: "Party/Verkefni", stofa: "Party/Stofa", reikningar: "Party/Stofa/Reikningar", snidmat: "Party/Stofa/Sniðmát", oflokkad: "Óflokkað", mitt: "Atrium" },
  odLocal: "",
  sp: "aerastudio.sharepoint.com:/sites/Atrium-Party",   // til bráðabirgða hjá AERA (frá 2.10.4) – Documents › Party; flyst til party.is með eigin M365
  spLocal: "%UserProfile%\\AERA Studio ehf\\Atrium - Party - Documents",
  postmappa: "Party",
  postholf: "",
  sigLogo: "party/sig-logo.png",
  docLogo: "party/doc-logo.png",
  // Einingar: true = kveikt á sjálfgefið óvirkri einingu; false = læst (admin getur ekki kveikt)
  einingar: { leiga: true, verdskra: false },   // partýbúnaður til leigu; Verðskrá á aðeins við AERA
  // Firebase-verkefni party.is (atrium-party). Opinber auðkenni vefforrits, ekki leyndarmál.
  firebase: {
    apiKey: "AIzaSyBWuSkYZ7vLIKoEfvSTMbUXr18l0JZztDs",
    authDomain: "atrium-party.firebaseapp.com",
    projectId: "atrium-party",
    storageBucket: "atrium-party.firebasestorage.app",
    messagingSenderId: "922712024534",
    appId: "1:922712024534:web:9d78f780b4a67dfba1f077"
  }
};
