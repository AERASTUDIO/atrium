/* Hlutlaus sýniútgáfa Atrium (frá 2.11.0). Slóð: https://aerastudio.github.io/atrium/demo/?demo
   Ekkert fyrirtæki, ekkert merki og enginn gagnagrunnur – aðeins sýnigögn (demo.js). Vefsíðan (/atrium/) vísar hingað.
   demo/index.html er búin til sjálfvirkt úr ../app.html með tools/uppsetningar.py – ekki breyta henni beint. */
window.ORG = {
  nafn: "Fyrirtækið",
  verdskra: [ // almenn sýnigögn (2.22.0)
    { id: "honnun", heiti: "Hönnun", verd: 12000, sjalfgefid: true },
    { id: "radgjof", heiti: "Ráðgjöf", verd: 15000 },
    { id: "almenn", heiti: "Almenn vinna", verd: 9000, almennt: true }
  ],
  len: "demo.example",
  vefur: "",
  appUrl: "https://aerastudio.github.io/atrium/demo/",
  lsForskeyti: "demo:",
  litir: { ljos: "#F6F7F8", dokk: "#121416" },
  ms: { appNafn: "Atrium", clientId: "", tenant: "" },
  admin: { email: "jona@demo.example", nafn: "Jóna Jónsdóttir", sk: "JJ", titillIS: "Stjórnandi", titillEN: "Manager" },
  legacyEmails: [],
  od: { verkefni: "Fyrirtækið/Verkefni", stofa: "Fyrirtækið/Stofa", reikningar: "Fyrirtækið/Stofa/Reikningar", snidmat: "Fyrirtækið/Stofa/Sniðmát", oflokkad: "Óflokkað", mitt: "Atrium" },
  odLocal: "", sp: "", spLocal: "",
  postmappa: "Atrium", postholf: "",
  sigLogo: "icons/atrium-doc-logo.png",
  docLogo: "icons/atrium-doc-logo.png",
  // Allar einingar sýndar; Verðskrá læst (verðlisti AERA)
  einingar: { leiga: true, sala: true, verdskra: false },
  // Hönnunarkerfi (2.49.0, kerfi.css): ein leturstærðaröð, hnappar og reitir í tölvu og síma.
  kerfi: true,
  firebase: null
};
