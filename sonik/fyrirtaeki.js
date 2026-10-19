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
  sp: "",
  spLocal: "",
  postmappa: "Sonik",
  postholf: "",
  sigLogo: "sonik/sig-logo.png",
  docLogo: "sonik/doc-logo.png",
  // einingar sem Sonik notar ekki: { lykill: false }
  einingar: {},
  // Firebase-verkefni Sonik – TODO þegar verkefnið hefur verið stofnað. Tómt = aðeins sýniútgáfa virkar.
  firebase: null
};
