/* Þróunaruppsetning Atrium (frá 2.13.0). Slóð: https://aerastudio.github.io/atrium/dev/ (sýniútgáfa: ?demo)
   Hlutlaus „sjálfgefin“ uppsetning með eigin gögnum (Firebase atrium-499a2) þar sem einingar eru þróaðar og prófaðar
   áður en þær fara til fyrirtækjanna. Ekkert merki fyrirtækis – aðeins Atrium. Byggð á hlutlausu sýniútgáfunni (demo/).
   dev/index.html er búin til sjálfvirkt úr ../app.html með tools/uppsetningar.py – ekki breyta henni beint.
   Engin leyndarmál hér – þetta eru opinber auðkenni. */
window.ORG = {
  nafn: "Atrium",
  len: "aerastudio.is",                 // innskráning með Microsoft-aðgangi AERA
  vefur: "",
  appUrl: "https://aerastudio.github.io/atrium/dev/",
  lsForskeyti: "dev:",                  // eigið svæði í localStorage (sama lén og hinar uppsetningarnar)

  litir: { ljos: "#F6F7F8", dokk: "#121416" },
  ms: { appNafn: "Atrium", clientId: "bc976045-0274-48bb-a5c3-3a39aa987fd0", tenant: "ed06b359-9189-4e32-aeaa-7454e6be768f" },   // Entra-forritið „Atrium“ hjá AERA

  admin: { email: "dagur@aerastudio.is", nafn: "Dagur Fannar Möller", sk: "DFM", titillIS: "Eigandi", titillEN: "Owner" },
  legacyEmails: [],

  od: { verkefni: "Atrium/Verkefni", stofa: "Atrium/Stofa", reikningar: "Atrium/Stofa/Reikningar", snidmat: "Atrium/Stofa/Sniðmát", oflokkad: "Óflokkað", mitt: "Atrium" },
  odLocal: "",
  sp: "aerastudio.sharepoint.com:/sites/Atrium-Dev",   // Documents › Atrium
  spLocal: "%UserProfile%\\AERA Studio ehf\\Atrium - Dev - Documents",
  postmappa: "Atrium",
  postholf: "",
  sigLogo: "icons/atrium-doc-logo.png",
  docLogo: "icons/atrium-doc-logo.png",
  // Nýja einingaskiptingin (2.14.0): kjarni, pakkar og tengingar – flokkuð valmynd og ný Stillingar › Einingar. Prófað hér fyrst.
  pakkaval: true,
  // Stöður verkefna (2.15.4): fjórar stöður sem lýsa hvar verkið stendur; „Lokið“ er falin staða sem aðeins hnappurinn
  // „Loka verkefni“ setur (verkefnið fer þá úr verkefnum í gangi). Admin getur breytt í Stillingum.
  stodur: [{ n: "Fyrirspurn", c: "slate" }, { n: "Í vinnslu", c: "blue" }, { n: "Í bið", c: "amber" }, { n: "Afhent", c: "teal" }, { n: "Lokið", c: "green", lokid: true, falin: true }],
  // Einingar: engar læstar og kveikt á öllum, líka þeim sem eru sjálfgefið óvirkar (Leiga, Sala, Deildir) – til að þróa og prófa.
  einingar: { leiga: true, sala: true, deildir: true, pantanir: true },
  // Firebase-verkefnið atrium (atrium-499a2). Opinber auðkenni vefforrits, ekki leyndarmál.
  firebase: {
    apiKey: "AIzaSyAGCMEK5HdNqLEHH9UXe8B3zL9m9-bnzu0",
    authDomain: "atrium-499a2.firebaseapp.com",
    projectId: "atrium-499a2",
    storageBucket: "atrium-499a2.firebasestorage.app",
    messagingSenderId: "994735129710",
    appId: "1:994735129710:web:659e01ea77443ad794127f"
  }
};
