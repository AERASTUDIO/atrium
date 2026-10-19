/* Fyrirtækjastillingar – það eina sem þarf að breyta þegar appið er sett upp fyrir annað fyrirtæki (frá 1.3.0).
   Auk þessarar skrár eru fyrirtækjasértæk: firebase-config.js (Firebase-verkefnið), firestore.rules (lén í msUser),
   merki í icons/ og litir/letur í brand.css. Sjá Kerfisskjölun, kafla „Uppsetning fyrir annað fyrirtæki“.
   Engin leyndarmál hér – þetta eru opinber auðkenni. */
window.ORG = {
  nafn: "AERA Studio",                 // birtist á reikningum, skýrslum, undirskrift o.fl.
  len: "aerastudio.is",                // Microsoft-lén starfsmanna (innskráning)
  vefur: "aerastudio.is",
  appUrl: "https://aerastudio.github.io/atrium/",

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
  sp: "",
  spLocal: "",                         // samstillt mappa síðunnar á Windows, t.d. "%UserProfile%\\AERA Studio ehf\\AERA - Documents"
  // Outlook-mappa sem appið flokkar póst úr (ef ekkert sameiginlegt pósthólf)
  postmappa: "AERA",
  // Sameiginlegt pósthólf fyrir verkefnapóst (frá 1.9.5): allir með Full Access í Exchange sjá tengda þræði í heild og
  // geta sent frá því (Send as). Krefst Mail.Read.Shared og Mail.Send.Shared í Entra. Tómt = aðeins eigið pósthólf.
  postholf: "aera@aerastudio.is",
  // Undirskrift í tölvupósti
  sigLogo: "icons/sig-logo.png"
};
