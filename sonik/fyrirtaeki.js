/* Uppsetning Sonik á Atrium (frá 2.3.0). Slóð: https://atrium.aerastudio.is/sonik/ (sýniútgáfa: ?demo)
   sonik/index.html er búin til sjálfvirkt úr ../index.html með tools/uppsetningar.py – ekki breyta henni beint.
   Slóðir á skrár hér eru miðaðar við rót appsins (index.html hefur <base href="../">).
   Engin leyndarmál hér – þetta eru opinber auðkenni. Ófyllt gildi (TODO) bíða upplýsinga frá Sonik. */
window.ORG = {
  nafn: "Sonik",
  // Til bráðabirgða: innskráning með Microsoft-aðgangi AERA (dagur@aerastudio.is) þar til aðgangur fæst að Microsoft 365 hjá Sonik.
  // Þá: len → lén Sonik, ms → Entra-forrit/tenant Sonik, admin → fyrsti admin hjá Sonik, og firestore-reglur Sonik uppfærðar.
  len: "aerastudio.is",
  vefur: "sonik.is",
  appUrl: "https://atrium.aerastudio.is/sonik/",
  lsForskeyti: "sonik:",               // eigið svæði í localStorage (sama lén og AERA)

  logo: { ljos: "sonik/merki-ljos.svg", dokk: "sonik/merki-dokk.svg" },
  merki: { ljos: "sonik/merki-ljos.svg", dokk: "sonik/merki-dokk.svg" },
  litir: { ljos: "#F2FCFF", dokk: "#0C2127" },   // litur stöðustiku í síma
  ms: { appNafn: "Atrium", clientId: "bc976045-0274-48bb-a5c3-3a39aa987fd0", tenant: "ed06b359-9189-4e32-aeaa-7454e6be768f", gestir: "aerastudio.onmicrosoft.com" },   // til bráðabirgða: Entra-forrit AERA

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
  // Nýja einingaskiptingin og útlitið (pakkaval, 2.21.0 – eins og Dev) og allar einingar opnar; admin síar í Stillingar › Einingar
  personuvernd: { netfang: "aera@aerastudio.is", svaedi: "Belgíu (Google europe-west1, innan EES)" },   // persónuvernd (2.44.1): hýsingarsvæði Firestore; netfang: valfrjálst, annars admin
  pakkaval: true,
  leid: "complete",                  // verðleið (2.97.0): Complete skv. tilboði 26.10.2026 (byrja á sölu; leiga kemur síðar)
  utlit: "I",                          // tölvuútlit I (frá 2.43.0, eins og Dev og party.is); síminn óbreyttur
  // Stöður verkefna með litum (eins og í Dev, 2.93.0) – gildir nema admin hafi vistað aðrar í Stillingum
  stodur: [{ n: "Fyrirspurn", c: "slate" }, { n: "Í vinnslu", c: "blue" }, { n: "Í bið", c: "amber" }, { n: "Afhent", c: "teal" }, { n: "Lokið", c: "green", lokid: true, falin: true }],
  // 2.96.2 (fundur 26.10.2026): Sonik byrjar á Mitt, Samskiptum og SÖLU – leiga og þjónusta bíða. Leiga og deildir eru því ekki
  // sjálfgefið virkar (admin kveikir í Stillingar › Einingar þegar leigan kemur inn) og sviðið Þjónusta er falið (Stillingar › Svið).
  einingar: { sala: true, pantanir: true, pferli: true, qr: true, innflutningur: true, snjall: true, vgreind: true, aukaverk: true },   // qr (2.105.0): skanni fyrir strikamerki söluvara
  svid: { "Þjónusta": { off: true } },
  // Hönnunarkerfi (2.49.0, kerfi.css): ein leturstærðaröð, hnappar og reitir í tölvu og síma.
  kerfi: true,
  // Símaútlit (2.45.0–2.49, simi.js og simi.css): Í dag · Leita · (Skanna) · Tímar · Meira.
  simi: "I",
  // Firebase-verkefni Sonik (atrium-sonik). Opinber auðkenni vefforrits, ekki leyndarmál.
  firebase: {
    apiKey: "AIzaSyCxuTQrngLVcptXtatN70I2Lf6S3zEk420",
    authDomain: "atrium-sonik.firebaseapp.com",
    projectId: "atrium-sonik",
    storageBucket: "atrium-sonik.firebasestorage.app",
    messagingSenderId: "656889180932",
    appId: "1:656889180932:web:682c3c921757b8a70e1651",
    // Web Push (ýtitilkynningar, 26.10.2026): opinber VAPID-lykill úr Firebase › Cloud Messaging. Einkalykillinn er aðeins hjá Google.
    vapidKey: "BAv1DiapQDlaQ0ZFPsNyf1EgmI1WzvhqBA6xpbOAIvphbORksMVE9kWkDe7kQafaUG1To-merVs34-v6KAtZ7Zc"
  }
};
