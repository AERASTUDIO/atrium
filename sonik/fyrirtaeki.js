/* Uppsetning Sonik á Atrium (frá 2.3.0). Slóð: https://aerastudio.github.io/atrium/sonik/ (sýniútgáfa: ?demo)
   sonik/index.html er búin til sjálfvirkt úr ../index.html með tools/uppsetningar.py – ekki breyta henni beint.
   Slóðir á skrár hér eru miðaðar við rót appsins (index.html hefur <base href="../">).
   Engin leyndarmál hér – þetta eru opinber auðkenni. Ófyllt gildi (TODO) bíða upplýsinga frá Sonik. */
window.ORG = {
  nafn: "Sonik",
  len: "sonik.is",                     // TODO staðfesta Microsoft-lén starfsmanna Sonik
  vefur: "sonik.is",
  appUrl: "https://aerastudio.github.io/atrium/sonik/",
  lsForskeyti: "sonik:",               // eigið svæði í localStorage (sama lén og AERA)

  logo: { ljos: "sonik/merki-ljos.svg", dokk: "sonik/merki-dokk.svg" },
  merki: { ljos: "sonik/merki-ljos.svg", dokk: "sonik/merki-dokk.svg" },
  litir: { ljos: "#F2FCFF", dokk: "#0C2127" },   // litur stöðustiku í síma
  ms: { appNafn: "Atrium", clientId: "", tenant: "" },   // TODO Entra-forrit fyrir Sonik

  admin: { email: "", nafn: "", sk: "", titillIS: "", titillEN: "" },   // TODO fyrsti admin hjá Sonik
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
