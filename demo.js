// Sýniútgáfa appsins (opnast með ?demo í slóðinni, t.d. https://aerastudio.github.io/atrium/demo/?demo).
// Engin innskráning, engin tenging við Firestore eða Microsoft: appið keyrir á tilbúnum sýnigögnum
// sem búa aðeins í minni vafrans. Breytingar gleymast þegar síðan er endurhlaðin.
// Öll nöfn, fyrirtæki og tölur hér eru uppspuni.

const pad = n => String(n).padStart(2, "0");
const base = new Date(); base.setHours(0, 0, 0, 0);
const day = (off, hm) => { const x = new Date(base); x.setDate(x.getDate() + off); const s = x.getFullYear() + "-" + pad(x.getMonth() + 1) + "-" + pad(x.getDate()); return hm ? s + "T" + hm + ":00" : s; };
const iso = off => new Date(base.getTime() + off * 864e5 + 10 * 36e5).toISOString();
const timabilOf = s => { const x = new Date(s + "T00:00:00"); let y = x.getFullYear(), m = x.getMonth(); if (x.getDate() <= 20) { m--; if (m < 0) { m = 11; y--; } } const e = new Date(y, m + 1, 20); return `21.${pad(m + 1)}${y !== e.getFullYear() ? "." + y : ""} – 20.${pad(e.getMonth() + 1)}.${e.getFullYear()}`; };
const yr = base.getFullYear();

function sampleState() {
  const vsk = [
    { id: "d0000000000000000000000000000c01", name: "Viðskiptavinur A", hlutverk: ["Viðskiptavinur"], kennitala: "000000-0001", vsknr: "", heimilisfang: "Gata 1", postnumer: "600", stadur: "Bær", simi: "555 0101", netfang: "a@vidskiptavinur.example", vefsida: "", tengilidur: "Tengiliður A", simiT: "555 0102", netfangT: "tengilidur@vidskiptavinur.example", athugasemdir: "Sýnigögn." },
    { id: "d0000000000000000000000000000c02", name: "Viðskiptavinur B", hlutverk: ["Verkkaupi"], kennitala: "000000-0002", vsknr: "", heimilisfang: "Gata 2", postnumer: "220", stadur: "Bær", simi: "555 0201", netfang: "b@vidskiptavinur.example", vefsida: "", tengilidur: "Tengiliður B", simiT: "", netfangT: "tengilidur.b@vidskiptavinur.example", athugasemdir: "" },
    { id: "d0000000000000000000000000000c03", name: "Viðskiptavinur C", hlutverk: ["Viðskiptavinur"], kennitala: "000000-0003", vsknr: "", heimilisfang: "Gata 3", postnumer: "101", stadur: "Bær", simi: "555 0301", netfang: "c@vidskiptavinur.example", vefsida: "", tengilidur: "Tengiliður C", simiT: "", netfangT: "", athugasemdir: "" },
    { id: "d0000000000000000000000000000c04", name: "Viðskiptavinur D", hlutverk: ["Viðskiptavinur", "Verkkaupi"], kennitala: "000000-0004", vsknr: "", heimilisfang: "Gata 4", postnumer: "800", stadur: "Bær", simi: "555 0401", netfang: "d@vidskiptavinur.example", vefsida: "", tengilidur: "Tengiliður D", simiT: "", netfangT: "", athugasemdir: "" }
  ];
  const sub = (pnr, k, name, stada, skil, timar) => ({ id: `sub-${pnr}-${k}`, nr: `${pnr}-${pad(k)}`, heiti: `${pnr}-${pad(k)} ${name}`, stada, skiladagur: skil == null ? null : day(skil), timar, serMappa: null, mappa: null, lysing: null });
  const P = (o) => ({ yfirlit: null, mappa: null, starfsmenn: ["JJ"], aklst: null, tilbod: null, athugasemdir: [], ...o, nafn: o.nr + " " + o.stutt });
  const verkefni = [
    P({ id: "p1", nr: `${yr}-21`, stutt: "Hönnunarverkefni", stada: "Í vinnslu", vskId: "d0000000000000000000000000000c01", vidskiptavinur: "Viðskiptavinur A", vkId: "d0000000000000000000000000000c02", verkkaupi: "Viðskiptavinur B", thjonusta: ["Hönnun"], timar: 31.5, aklst: 40, tilbod: 650000, skiladagur: day(9), vidburdur: null,
      lysing: "Dæmi um verkefni í vinnslu með undirverkum, áætlun og tilboði.", naest: "Klára teikningar og senda til yfirferðar.", athuga: "Bíða eftir gögnum frá viðskiptavini.",
      athugasemdir: [{ id: "a1", t: "Viðskiptavinur vill skoða tvær útfærslur á kynningarfundi.", d: iso(-2), sk: "JJ" }],
      undirverk: [sub(`${yr}-21`, 1, "Forsendur", "Done", -12, 6), sub(`${yr}-21`, 2, "Teikningar", "In progress", 3, 18.5), sub(`${yr}-21`, 3, "Módel", "Up next", 7, 7), sub(`${yr}-21`, 4, "Útgáfa", "Not started", 9, 0)] }),
    P({ id: "p2", nr: `${yr}-22`, stutt: "Teiknivinna", stada: "Í yfirferð", vskId: "d0000000000000000000000000000c03", vidskiptavinur: "Viðskiptavinur C", thjonusta: ["Framkvæmd"], timar: 22, aklst: 24, tilbod: 380000, skiladagur: day(2), vidburdur: null,
      lysing: "Dæmi um verkefni í yfirferð.", naest: "Lagfæra athugasemdir eftir yfirferð.",
      undirverk: [sub(`${yr}-22`, 1, "Gögn móttekin og yfirfarin", "Done", -20, 2), sub(`${yr}-22`, 2, "Módel", "Done", -10, 9), sub(`${yr}-22`, 3, "Teikningar", "Done", -3, 9), sub(`${yr}-22`, 4, "Yfirferð", "In progress", 2, 2)] }),
    P({ id: "p3", nr: `${yr}-23`, stutt: "Viðburður", stada: "Tilboð", vskId: "d0000000000000000000000000000c04", vidskiptavinur: "Viðskiptavinur D", vkId: "d0000000000000000000000000000c04", verkkaupi: "Viðskiptavinur D", thjonusta: ["Hönnun", "Ráðgjöf"], timar: 3, tilbod: 1200000, skiladagur: day(30), vidburdur: day(45, "17:00"), timabilFra: day(14, "09:00"), timabilTil: day(30, "17:00"),
      lysing: "Dæmi um verkefni á tilboðsstigi með viðburði.", undirverk: [sub(`${yr}-23`, 1, "Hugmyndavinna", "In progress", 6, 3), sub(`${yr}-23`, 2, "3D render", "Not started", 20, 0)] }),
    P({ id: "p4", nr: `${yr}-24`, stutt: "Ráðgjöf", stada: "Beiðni", vskId: "d0000000000000000000000000000c01", vidskiptavinur: "Viðskiptavinur A", thjonusta: ["Ráðgjöf"], timar: 0, skiladagur: null, undirverk: [] }),
    P({ id: "p5", nr: `${yr}-17`, stutt: "Afhent verkefni", stada: "Afhent", vskId: "d0000000000000000000000000000c02", vidskiptavinur: "Viðskiptavinur B", thjonusta: ["Framkvæmd"], timar: 42, skiladagur: day(-25), undirverk: [sub(`${yr}-17`, 1, "Teikningar", "Done", -30, 36), sub(`${yr}-17`, 2, "Útgáfa", "Done", -25, 6)] }),
    P({ id: "p6", nr: `${yr}-12`, stutt: "Reikningsfært verkefni", stada: "Reikningsfært", vskId: "d0000000000000000000000000000c03", vidskiptavinur: "Viðskiptavinur C", thjonusta: ["Hönnun"], timar: 16, skiladagur: day(-60), undirverk: [] })
  ];
  const T = (id, off, pid, sid, lys, fra, til, t) => ({ id, date: day(off), lysing: lys, nr: verkefni.find(p => p.id === pid)?.nr, verkefniId: pid, undirverkId: sid, fra, til, timar: t, starfsmadur: "JJ", timabil: timabilOf(day(off)) });
  const faerslur = [
    T("t1", 0, "p1", `sub-${yr}-21-2`, "Teiknivinna", "08:30", "11:30", 3),
    T("t2", -1, "p1", `sub-${yr}-21-2`, "Teiknivinna", "09:00", "15:30", 6.5),
    T("t3", -1, "p2", `sub-${yr}-22-4`, "Yfirferð með viðskiptavini", "16:00", "17:00", 1),
    T("t4", -2, "p2", `sub-${yr}-22-3`, "Lagfæringar", "09:00", "13:00", 4),
    T("t5", -3, "p3", `sub-${yr}-23-1`, "Hugmyndavinna", "10:00", "13:00", 3),
    T("t6", -4, "p1", `sub-${yr}-21-3`, "Módelvinna", "08:00", "15:00", 7),
    T("t7", -7, "p1", `sub-${yr}-21-2`, "Teiknivinna", "09:00", "14:00", 5),
    T("t8", -8, "p2", `sub-${yr}-22-3`, "Teikningar", "09:00", "14:00", 5),
    T("t9", -9, "p1", `sub-${yr}-21-1`, "Forsendur", null, null, 6)
  ];
  const fundir = [
    { id: "f1", name: "Kynningarfundur", date: day(0, "14:00"), stadsetning: "Viðskiptavinur A", fundarhlekkur: null, fundargerd: null, projectId: "p1", verknr: verkefni[0].nafn, mappa: null, attendees: [], seria: null },
    { id: "f2", name: "Yfirferð teikninga", date: day(2, "10:00"), stadsetning: null, fundarhlekkur: "https://meet.example.com/demo", fundargerd: null, projectId: "p2", verknr: verkefni[1].nafn, mappa: null, attendees: [], seria: null },
    { id: "f3", name: "Upphafsfundur", date: day(6, "13:00"), stadsetning: "Viðskiptavinur D", fundarhlekkur: null, fundargerd: null, projectId: "p3", verknr: verkefni[2].nafn, mappa: null, attendees: [], seria: null },
    { id: "f4", name: "Vikufundur", date: day(-5, "09:00"), stadsetning: "Skrifstofa", fundarhlekkur: null, fundargerd: null, projectId: null, verknr: null, mappa: null, attendees: [], seria: null }
  ];
  const kostnadur = [
    { id: "k1", date: day(-4), verkefniId: "p1", undirverkId: null, lysing: "Efniskaup", upphaed: 18900, starfsmadur: "JJ", kvittun: null, kvittunId: null, stofnad: iso(-4) }
  ];
  const reikningar = [
    { id: "r1", nr: 1001, dags: day(-40), gjalddagi: day(-26), verkefniIds: ["p6"], verkefniId: "p6", vskId: "d0000000000000000000000000000c03",
      kaupandi: { name: "Viðskiptavinur C", kennitala: "000000-0003", heimilisfang: "Gata 3", postnumer: "101", stadur: "Bær", netfang: "c@vidskiptavinur.example" },
      seljandi: { nafn: (window.ORG?.nafn || "Fyrirtækið") + " (sýnishorn)", kt: "000000-0000", heimilisfang: "Sýnigata 1", vsknr: "", banki: "", netfang: "demo@" + (window.ORG?.len || "aera.example"), simi: "", vsk: 24, frestur: 14 },
      linur: [{ lysing: "Reikningsfært verkefni", magn: 16, eining: "klst.", verd: 14900 }], vskP: 24, net: 238400, vsk: 57216, tot: 295616,
      timaIds: [], kostnIds: [], stada: "Greitt", greitt: day(-28), stofnad: iso(-40) },
    { id: "r2", nr: 1002, dags: day(-10), gjalddagi: day(4), verkefniIds: ["p5"], verkefniId: "p5", vskId: "d0000000000000000000000000000c02",
      kaupandi: { name: "Viðskiptavinur B", kennitala: "000000-0002", heimilisfang: "Gata 2", postnumer: "220", stadur: "Bær", netfang: "b@vidskiptavinur.example" },
      seljandi: { nafn: (window.ORG?.nafn || "Fyrirtækið") + " (sýnishorn)", kt: "000000-0000", heimilisfang: "Sýnigata 1", vsknr: "", banki: "", netfang: "demo@" + (window.ORG?.len || "aera.example"), simi: "", vsk: 24, frestur: 14 },
      linur: [{ lysing: "Afhent verkefni – teiknivinna", magn: 42, eining: "klst.", verd: 14900 }], vskP: 24, net: 625800, vsk: 150192, tot: 775992,
      timaIds: [], kostnIds: [], stada: "Ógreitt", greitt: null, stofnad: iso(-10) }
  ];
  const skjol = [
    { id: "s1", name: "Tilboð – viðburður", snid: "tengill", url: "https://example.com/", stadur: "verk", projectId: "p3", mappa: "01 Móttekið", stofnad: iso(-6), breytt: iso(-3) },
    { id: "s2", name: "Verklýsing", snid: "tengill", url: "https://example.com/", stadur: "verk", projectId: "p1", mappa: "02 Vinnuskjöl", stofnad: iso(-11), breytt: iso(-1) }
  ];
  // Póstþræðir: aðeins tilvísun í conversationId; póstarnir sjálfir eru sóttir úr pósthólfinu.
  const thraedir = [
    { id: "t1", conv: "demo-conv-1", verkefniId: "p1", efni: `${yr}-21 Gögn frá viðskiptavini`, tengt: iso(-1), af: "sjálfvirkt" }
  ];
  // Eldri afrit úr gamla pósthólfinu sem fundust ekki
  const postar = [
    { id: "m1", efni: "Efnisval", fra: "Tengiliður B", dags: iso(-40), url: null, verkefniId: "p1", ekkiFannst: true }
  ];
  window.MS_OFL = [{ id: "demo-m2", conversationId: "demo-conv-2", subject: "Fyrirspurn um nýtt verkefni", from: { emailAddress: { name: "Tengiliður A", address: "tengilidur@example.is" } }, receivedDateTime: iso(0), bodyPreview: "Gætuð þið gert tilboð í nýtt verkefni…" }];
  if (window.ORG?.utlit === "I") rikari({ vsk, verkefni, faerslur, fundir, kostnadur, reikningar, skjol, thraedir, sub, P, T });
  return {
    uppfaert: new Date().toISOString(),
    verkefni, fundir, vidskiptavinir: vsk, skjol, kostnadur, reikningar, postar, thraedir,
    timar: { faerslur },
    netfangaskra: [],
    stillingar: {
      starfsmenn: [{ sk: "JJ", nafn: "Jóna Jónsdóttir", eg: true }, { sk: "GG", nafn: "Gunnar Gunnarsson", eg: false }, { sk: "HS", nafn: "Helga Sigurðardóttir" }, { sk: "SB", nafn: "Sigrún Bókari" }, ...(window.ORG?.utlit === "I" ? [{ sk: "OK", nafn: "Ólafur Kristinsson" }] : [])],
      vikumark: 40,
      thjonusta: ["Hönnun", "Ráðgjöf", "Framkvæmd", "Almennt"],
      reikn: { nafn: (window.ORG?.nafn || "Fyrirtækið") + " (sýnishorn)", kt: "000000-0000", heimilisfang: "Sýnigata 1", vsknr: "", netfang: "demo@" + (window.ORG?.len || "aera.example"), simi: "", banki: "", timagjald: 10000, frestur: 14, nastaNr: 1003 },
      undirskrift: { nafn: "Jóna Jónsdóttir", netfang: "demo@demo.example" }
    }
  };
}

/* Ítarleg sýnigögn fyrir útlit I (2.26.0): fleiri viðskiptavinir, verkefni á öllum sviðum (Leiga, Sala, Þjónusta),
   tímar fimm starfsmanna síðustu fjórar vikur, fundir, kostnaður og reikningar. Allt uppspuni. */
function rikari(g) {
  const ST = (window.ORG?.stodur || []).map(x => x.n), st = (i, d) => ST[i] || d;   // Fyrirspurn · Í vinnslu · Í bið · Afhent · Lokið
  const c = (k, name, o) => ({ id: "d0000000000000000000000000000c" + k, name, hlutverk: ["Viðskiptavinur"], kennitala: "000000-00" + k, vsknr: "", heimilisfang: "", postnumer: "", stadur: "", simi: "", netfang: "", vefsida: "", tengilidur: "", simiT: "", netfangT: "", athugasemdir: "", ...o });
  g.vsk.push(
    c("05", "Álfaborg ehf.", { heimilisfang: "Skeifan 6", postnumer: "108", stadur: "Reykjavík", simi: "555 0501", netfang: "alfaborg@daemi.example", tengilidur: "Katrín Ragnarsdóttir", netfangT: "katrin@daemi.example" }),
    c("06", "Bláfell ehf.", { hlutverk: ["Viðskiptavinur", "Verkkaupi"], heimilisfang: "Hafnarbraut 12", postnumer: "200", stadur: "Kópavogur", simi: "555 0601", netfang: "blafell@daemi.example", tengilidur: "Einar Þórsson", netfangT: "einar@daemi.example" }),
    c("07", "Fyrirtæki X", { heimilisfang: "Borgartún 21", postnumer: "105", stadur: "Reykjavík", simi: "555 0701", netfang: "x@daemi.example", tengilidur: "Hildur Pálsdóttir", netfangT: "hildur@daemi.example" }),
    c("08", "Hótel Lind", { heimilisfang: "Rauðarárstígur 18", postnumer: "105", stadur: "Reykjavík", simi: "555 0801", netfang: "hotel@daemi.example", tengilidur: "Magnús Óskarsson", netfangT: "magnus@daemi.example" }));
  const V = n => g.vsk.find(x => x.name === n);
  const [p1, p2, p3, p4, p5, p6] = g.verkefni;
  // Eldri sex verkefnin fá stöður uppsetningarinnar og fleiri starfsmenn
  Object.assign(p1, { stada: st(1, p1.stada), starfsmenn: ["JJ", "HS"], aklst: 120 }); Object.assign(p2, { stada: st(2, p2.stada), starfsmenn: ["JJ", "GG"] });
  Object.assign(p3, { stutt: "Árshátíð Fyrirtækis X", nafn: p3.nr + " Árshátíð Fyrirtækis X", deild: "leiga", stada: st(1, p3.stada), vskId: V("Fyrirtæki X").id, vidskiptavinur: "Fyrirtæki X", vkId: null, verkkaupi: null, starfsmenn: ["JJ", "GG", "OK"],
    lysing: "Hljóð, ljós og LED-veggur fyrir árshátíð, 600 gestir. Uppsetning daginn áður.", naest: "Staðfesta sviðsteikningu og keyrsluplan.", athuga: "Aðgengi að hleðslubrú frá kl. 8.", vidburdur: day(12, "18:00"), skiladagur: day(13), timabilFra: null, timabilTil: null,
    thjonusta: [], aklst: 90, undirverk: [g.sub(p3.nr, 1, "Vettvangsskoðun", "Done", -8, 3), g.sub(p3.nr, 2, "Teikning og keyrsluplan", "In progress", 4, 6), g.sub(p3.nr, 3, "Uppsetning", "Not started", 11, 0), g.sub(p3.nr, 4, "Viðburður og niðurtaka", "Not started", 13, 0)] });
  Object.assign(p4, { stada: st(0, p4.stada) }); Object.assign(p5, { stada: st(3, p5.stada) }); Object.assign(p6, { stada: st(4, p6.stada) });
  const N = (id, k, stutt, o) => g.P({ id, nr: `${yr}-${k}`, stutt, timar: 0, undirverk: [], ...o });
  const p7 = N("p7", 25, "Hljóðkerfi veitingastaðar", { deild: "sala", stada: st(1, "Í vinnslu"), vskId: "d0000000000000000000000000000c04", vidskiptavinur: "Viðskiptavinur D", starfsmenn: ["GG", "OK"], aklst: 30, tilbod: 1950000, skiladagur: day(20),
    lysing: "Loftahátalarar, magnari og veggstýring (install).", naest: "Yfirfara teikningu með eiganda.",
    undirverk: [g.sub(`${yr}-25`, 1, "Mælingar", "Done", -6, 4), g.sub(`${yr}-25`, 2, "Teikning", "Done", -2, 5), g.sub(`${yr}-25`, 3, "Uppsetning", "Up next", 18, 0), g.sub(`${yr}-25`, 4, "Forritun og afhending", "Not started", 20, 0)] });
  const p8 = N("p8", 26, "Ráðstefna Hótel Lind", { deild: "leiga", stada: st(1, "Í vinnslu"), vskId: V("Hótel Lind").id, vidskiptavinur: "Hótel Lind", starfsmenn: ["GG"], tilbod: 640000, skiladagur: day(5), vidburdur: day(5, "09:00"),
    lysing: "Hljóðkerfi, skjávarpi og tveir skjáir fyrir eins dags ráðstefnu.", undirverk: [g.sub(`${yr}-26`, 1, "Undirbúningur", "In progress", 3, 2), g.sub(`${yr}-26`, 2, "Ráðstefnudagur", "Not started", 5, 0)] });
  const p9 = N("p9", 27, "Þjónustusamningur Bláfells", { stada: st(1, "Í vinnslu"), vskId: V("Bláfell ehf.").id, vidskiptavinur: "Bláfell ehf.", starfsmenn: ["OK", "JJ"], aklst: 80, skiladagur: day(68),
    lysing: "Mánaðarleg þjónusta og eftirlit með hljóð- og myndkerfum í höfuðstöðvum.", naest: "Mánaðarskoðun í næstu viku.",
    undirverk: [g.sub(`${yr}-27`, 1, "Úttekt kerfa", "Done", -40, 12), g.sub(`${yr}-27`, 2, "Skoðun október", "In progress", 6, 4), g.sub(`${yr}-27`, 3, "Skoðun nóvember", "Not started", 36, 0)] });
  const p10 = N("p10", 28, "Fundarsalur Álfaborgar", { deild: "sala", stada: st(0, "Fyrirspurn"), vskId: V("Álfaborg ehf.").id, vidskiptavinur: "Álfaborg ehf.", starfsmenn: ["JJ"], tilbod: 1450000, skiladagur: day(30),
    lysing: "Skjáir, borðhljóðnemi og hljóðstýring í nýjan fundarsal á 2. hæð." });
  const p11 = N("p11", 19, "Jólatónleikar", { deild: "leiga", stada: st(3, "Afhent"), vskId: V("Fyrirtæki X").id, vidskiptavinur: "Fyrirtæki X", starfsmenn: ["GG", "OK", "HS"], skiladagur: day(-35),
    undirverk: [g.sub(`${yr}-19`, 1, "Uppsetning", "Done", -36, 10), g.sub(`${yr}-19`, 2, "Tónleikar", "Done", -35, 8)] });
  const p12 = N("p12", 29, "Tækniþjónusta á viðburði", { stada: st(2, "Í bið"), vskId: "d0000000000000000000000000000c03", vidskiptavinur: "Viðskiptavinur C", starfsmenn: ["HS"], skiladagur: day(16), lysing: "Hljóð- og ljósamaður á kvöldviðburði. Bíður staðfestingar á tímasetningu." });
  g.verkefni.push(p7, p8, p9, p10, p11, p12);
  // Tímar fimm starfsmanna síðustu 4 vikur (virkir dagar), á verkefni, undirverk og Innra
  const plan = { JJ: [p1, p2, p3, p10, p9], GG: [p3, p7, p8, p2, p11], HS: [p1, p12, p11], OK: [p9, p7, p3, p11], SB: [] };
  const lys = { p1: ["Teiknivinna", "Módelvinna", "Fundur með viðskiptavini"], p2: ["Lagfæringar", "Yfirferð"], p3: ["Keyrsluplan og ljósateikning", "Sviðsteikning", "Samskipti við viðburðastjóra"], p7: ["Teikning loftahátalara", "Lagnaleiðir", "Mælingar á staðnum"],
    p8: ["Undirbúningur búnaðar", "Prófun skjávarpa"], p9: ["Mánaðarskoðun", "Uppfærsla hugbúnaðar", "Bilanagreining"], p10: ["Tilboðsgerð", "Vettvangsskoðun"], p11: ["Uppsetning", "Keyrsla", "Niðurtaka"], p12: ["Undirbúningur"] };
  const INN = ["Innra – skrifstofa", "Innra – lagerumsjón", "Innra – námskeið", "Innra – vikufundur"];
  let sd = 3; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  const keep = g.faerslur.filter(e => e.date >= day(0)).length ? [] : [];
  g.faerslur.length = 0; keep.forEach(e => g.faerslur.push(e));
  let n = 0;
  Object.entries(plan).forEach(([sk, ps]) => {
    for (let off = -27; off <= 0; off++) {
      const x = new Date(base); x.setDate(x.getDate() + off); const wd = x.getDay(); if (wd === 0 || wd === 6) continue;
      if (sk === "SB" && rnd() < 0.5) continue;
      let h = 8, t = 8.5; const parts = [];
      if (off === 0) h = sk === "JJ" ? 3 : 2.5;
      while (h > 0.4) { const b = Math.min(h, [1, 1.5, 2, 2.5, 3, 4][Math.floor(rnd() * 6)]); parts.push(b); h -= b; }
      parts.forEach(b => {
        const inn = !ps.length || rnd() < 0.18, p = inn ? null : ps[Math.floor(rnd() * ps.length)];
        if (p && p.stada === st(3, "Afhent") && off > -30) { /* afhent: aðeins eldri tímar */ }
        const L = p ? lys[p.id] || ["Vinna"] : INN, su = p && p.undirverk.length ? p.undirverk[Math.floor(rnd() * p.undirverk.length)] : null;
        const fra = `${String(Math.floor(t)).padStart(2, "0")}:${t % 1 ? "30" : "00"}`; t += b; const til = `${String(Math.floor(t)).padStart(2, "0")}:${t % 1 ? "30" : "00"}`;
        g.faerslur.push({ id: "t" + (++n), date: day(off), lysing: L[Math.floor(rnd() * L.length)], nr: p?.nr || null, verkefniId: p?.id || null, undirverkId: su?.id || null, fra, til, timar: b, starfsmadur: sk, timabil: timabilOf(day(off)) });
      });
    }
  });
  // Akstur og eldri tímar á afhentum verkefnum
  g.faerslur.push({ id: "t" + (++n), date: day(-36), lysing: "Uppsetning", nr: p11.nr, verkefniId: "p11", undirverkId: p11.undirverk[0].id, fra: "08:00", til: "18:00", timar: 10, starfsmadur: "GG", timabil: timabilOf(day(-36)) });
  g.faerslur.push({ id: "t" + (++n), date: day(-35), lysing: "Tónleikar – keyrsla", nr: p11.nr, verkefniId: "p11", undirverkId: p11.undirverk[1].id, fra: "16:00", til: "24:00", timar: 8, starfsmadur: "OK", timabil: timabilOf(day(-35)) });
  // Samtölur á verkefnum og undirverkum
  g.verkefni.forEach(p => { p.timar = 0; (p.undirverk || []).forEach(u => { u.timar = 0; }); });
  g.faerslur.forEach(e => { const p = g.verkefni.find(x => x.id === e.verkefniId); if (!p) return; p.timar = Math.round((p.timar + e.timar) * 10) / 10; const u = p.undirverk.find(x => x.id === e.undirverkId); if (u) u.timar = Math.round((u.timar + e.timar) * 10) / 10; });
  // Fundir
  const F = (id, name, off, hm, p, o) => g.fundir.push({ id, name, date: day(off, hm), stadsetning: null, fundarhlekkur: null, fundargerd: null, projectId: p?.id || null, verknr: p?.nafn || null, mappa: null, attendees: [], seria: null, ...o });
  F("f5", "Rennsli og keyrsluplan", 1, "13:00", p3, { stadsetning: "Fyrirtæki X, Borgartún 21" });
  F("f6", "Skoðun á staðnum", 3, "09:30", p7, { stadsetning: "Viðskiptavinur D" });
  F("f7", "Undirbúningsfundur ráðstefnu", 2, "15:00", p8, { fundarhlekkur: "https://meet.example.com/lind" });
  F("f8", "Mánaðarskoðun", 6, "10:00", p9, { stadsetning: "Bláfell ehf." });
  F("f9", "Kynning á lausn", 8, "11:00", p10, { stadsetning: "Álfaborg ehf." });
  F("f10", "Vikufundur", 2, "09:00", null, { stadsetning: "Skrifstofa" });
  F("f11", "Uppgjör jólatónleika", -30, "14:00", p11, { fundargerd: "Allt gekk vel. Eitt hreyfiljós bilaði – sent í viðgerð." });
  // Kostnaður
  g.kostnadur.push(
    { id: "k2", date: day(-2), verkefniId: "p3", undirverkId: null, lysing: "Gaffer-teip og kapalbindi", upphaed: 12400, starfsmadur: "GG", kvittun: null, kvittunId: null, stofnad: iso(-2) },
    { id: "k3", date: day(-6), verkefniId: "p7", undirverkId: null, lysing: "Festingar og skrúfur", upphaed: 8650, starfsmadur: "OK", kvittun: null, kvittunId: null, stofnad: iso(-6) },
    { id: "k4", date: day(-11), verkefniId: null, undirverkId: null, lysing: "Kaffi og veitingar á vikufund", upphaed: 6200, starfsmadur: "JJ", kvittun: null, kvittunId: null, stofnad: iso(-11) },
    { id: "k5", date: day(-36), verkefniId: "p11", undirverkId: null, lysing: "Leiga á lyftu", upphaed: 48000, starfsmadur: "GG", kvittun: null, kvittunId: null, stofnad: iso(-36) });
  // Reikningar
  const sel = g.reikningar[0].seljandi, RK = (id, nr, off, p, cl, lys, magn, verd, stada) => { const net = magn * verd, vs = Math.round(net * 0.24); g.reikningar.push({ id, nr, dags: day(off), gjalddagi: day(off + 14), verkefniIds: [p.id], verkefniId: p.id, vskId: cl.id,
    kaupandi: { name: cl.name, kennitala: cl.kennitala, heimilisfang: cl.heimilisfang, postnumer: cl.postnumer, stadur: cl.stadur, netfang: cl.netfang }, seljandi: sel, linur: [{ lysing: lys, magn, eining: "klst.", verd }], vskP: 24, net, vsk: vs, tot: net + vs, timaIds: [], kostnIds: [], stada, greitt: stada === "Greitt" ? day(off + 9) : null, stofnad: iso(off) }); };
  RK("r3", 1003, -32, p11, V("Fyrirtæki X"), "Jólatónleikar – tæknivinna", 64, 9500, "Greitt");
  RK("r4", 1004, -20, p9, V("Bláfell ehf."), "Þjónustusamningur – september", 18, 12500, "Ógreitt");
  RK("r5", 1005, -3, p9, V("Bláfell ehf."), "Þjónustusamningur – október", 16, 12500, "Ógreitt");
  g.reikningar.forEach(r => { if (r.nr >= 1003) r.timaIds = []; });
  // Skjöl og póstþræðir
  g.skjol.push({ id: "s3", name: "Sviðsteikning v2", snid: "tengill", url: "https://example.com/", stadur: "verk", projectId: "p3", mappa: "02 Vinnuskjöl", stofnad: iso(-3), breytt: iso(-1) },
    { id: "s4", name: "Lagnateikning", snid: "tengill", url: "https://example.com/", stadur: "verk", projectId: "p7", mappa: "02 Vinnuskjöl", stofnad: iso(-2), breytt: iso(-2) });
  g.thraedir.push({ id: "t2", conv: "demo-conv-3", verkefniId: "p3", efni: "Árshátíð – breytingar á dagskrá", tengt: iso(0), af: "sjálfvirkt" },
    { id: "t3", conv: "demo-conv-4", verkefniId: "p8", efni: "Ráðstefna – fjöldi gesta", tengt: iso(-2), af: "Jóna" });
}

// Notendur sýniútgáfu. ?demo = admin (Jóna), ?demo=starfsmadur = starfsmaður (Gunnar), ?demo=bokari = bókari (Sigrún).
const now = new Date().toISOString();
const notendur = { notendur: {
  "jona@demo.example": { nafn: "Jóna Jónsdóttir", sk: "JJ", hlutverk: "admin", virkur: true, stofnad: iso(-30), breytt: iso(-30), sidast: now },
  "gunnar@demo.example": { nafn: "Gunnar Gunnarsson", sk: "GG", hlutverk: "starfsmadur", virkur: true, stofnad: iso(-20), breytt: iso(-20), sidast: iso(-1) },
  "helga@demo.example": { nafn: "Helga Sigurðardóttir", sk: "HS", hlutverk: "starfsmadur", virkur: false, stofnad: iso(-60), breytt: iso(-5), sidast: iso(-9) },
  "sigrun@demo.example": { nafn: "Sigrún Bókari", sk: "SB", hlutverk: "bokari", virkur: true, stofnad: iso(-10), breytt: iso(-10), sidast: iso(-2) }
} };
const demoRole = new URLSearchParams(location.search).get("demo");
const email = demoRole === "starfsmadur" ? "gunnar@demo.example" : demoRole === "bokari" ? "sigrun@demo.example" : "jona@demo.example";
const user = { email, ...notendur.notendur[email] };

// Gagnagrunnur í minni: sama viðmót og firebase.js lætur appið fá (get / set / tx / watch / commit / watchCol).
// Sýnigögnin byrja í gamla sniðinu (allt í app/state) svo flutningurinn yfir í söfn keyrir líka í sýniútgáfunni (hjá admin).
// Sýniútgáfan líkir eftir aðgangsreglum: starfsmaður sér aðeins sína tíma og sinn kostnað.
const store = { "app/state": sampleState(), "app/notendur": notendur };
// Vörulisti og tilboð (sala.js): sýnigögn þegar einingarnar eru virkar í uppsetningunni (t.d. Sonik)
if (window.salaPrufa && window.ON && (ON("leiga") || ON("sala"))) { const st = store["app/state"], p = salaPrufa(st.vidskiptavinir); st.vorur = p.vorur; st.tilbod = p.tilbod; if (p.pantanir?.length) st.pantanir = p.pantanir;
  if (window.ORG?.utlit === "I") { [...st.vorur, ...st.tilbod, ...(st.pantanir || [])].forEach(x => { delete x.prufa; }); const L = { "L-0901": "p3", "L-0902": "p8", "S-0901": "p7", "S-0902": "p10", "L-0884": "p11", "T-0815": "p12" }; st.tilbod.forEach(t => { if (L[t.nr]) t.verkefniId = L[t.nr]; }); } }
// Spjall í sýniútgáfu
[["s1", "almennt", [], "gunnar@demo.example", "Gunnar Gunnarsson", "Er einhver með gögnin frá síðasta fundi?", -1],
 ["s2", "almennt", [], "jona@demo.example", "Jóna Jónsdóttir", "Þau eru í möppu verkefnisins 👍", -1],
 ["s3", "dm:gunnar@demo.example|jona@demo.example", ["gunnar@demo.example", "jona@demo.example"], "gunnar@demo.example", "Gunnar Gunnarsson", "Geturðu kíkt á teikningarnar áður en þær fara til viðskiptavinar?", 0]
].forEach(([id, ras, adilar, af, nafn, texti, off]) => { store["spjall/" + id] = { id, ras, adilar, af, nafn, texti, t: new Date(Date.now() + off * 864e5 - 36e5).toISOString() }; });
const watchers = {}, colw = {};
const snap = path => ({ exists: store[path] != null, data: () => structuredClone(store[path]), pending: false, fromCache: false });
const notify = path => { (watchers[path] || []).forEach(cb => cb(snap(path))); const seg = path.split("/"); if (seg.length === 2 && seg[0] !== "app") (colw[seg[0]] || []).forEach(f => f()); };
const db = {
  email,
  async get(path) { return snap(path); },
  user,
  async set(path, data) { store[path] = structuredClone(data); notify(path); },
  async tx(path, fn) { const out = fn(structuredClone(store[path] || {})); await this.set(path, out); return out; },
  async commit(list) { list.forEach(o => { if (o.del) delete store[o.path]; else store[o.path] = structuredClone(o.data); }); [...new Set(list.map(o => o.path))].forEach(notify); },
  watch(path, cb) { (watchers[path] = watchers[path] || []).push(cb); setTimeout(() => cb(snap(path)), 0); return () => {}; },
  watchCol(name, filter, cb, onErr) {
    const fj = ["admin", "bokari"].includes(user.hlutverk), own = name === "timar" || name === "kostnadur";
    const f = () => { if (own && !fj && !(filter && filter[0] === "eigandi" && filter[1] === email)) return onErr && onErr({ code: "permission-denied" });
      cb({ docs: Object.keys(store).filter(p => p.startsWith(name + "/") && p.split("/").length === 2).map(p => structuredClone(store[p])).filter(d => !filter || (filter[2] === "array-contains" ? (d[filter[0]] || []).includes(filter[1]) : d[filter[0]] === filter[1])), pending: false, fromCache: false }); };
    (colw[name] = colw[name] || []).push(f); setTimeout(f, 0); return () => {};
  }
};
// Starfsmaður/bókari í sýniútgáfu: gögnin eru þegar flutt (admin flytur í raun einu sinni).
if (user.hlutverk !== "admin") {
  const sk2em = Object.fromEntries(Object.entries(notendur.notendur).map(([e, u]) => [u.sk, e]));
  const ow = x => sk2em[x.starfsmadur || x.sk] || "jona@demo.example";
  const go = () => { if (!window.GOGN) return setTimeout(go, 20); for (const o of GOGN.migrate(store["app/state"], "jona@demo.example", ow)) store[o.path] = structuredClone(o.data); window.aeraStart(db); };
  go();
}

window.aeraSignOut = () => location.reload(); // „Skrá út“ í sýniútgáfu: innskráningarskjárinn birtist aftur og sýnigögnin byrja upp á nýtt
document.querySelectorAll('[onclick="aeraSignOut()"]').forEach(b => { b.textContent = "Skrá út"; });
const v = document.getElementById("appver"); if (v) v.textContent = "Sýniútgáfa";
document.title = (window.ORG?.nafn || "Atrium") + " · sýniútgáfa";
if (user.hlutverk === "admin") window.aeraStart(db);
setTimeout(() => window.toast && toast("Sýniútgáfa með tilbúnum gögnum – breytingar vistast ekki"), 600);

// Innskráningarskjárinn birtist alltaf þegar sýniútgáfan er opnuð eða endurhlaðin, með hreyfimerki Atrium.
// Hnappurinn opnar sýniútgáfuna – engin raunveruleg innskráning.
try {
  // sleppt í sjálfvirkum prófunum/skjámyndum (navigator.webdriver), nema slóðin hafi &inn
  const q = new URLSearchParams(location.search);
  if (!navigator.webdriver || q.has("inn")) {
    const l = document.getElementById("login"), b = document.getElementById("login-ms"), t = l.querySelector(".login-in p");
    if (t) t.innerHTML = `Sýniútgáfa ${ORG.nafn ? "– " + ORG.nafn.replace(/[<>&]/g, "") : ""}. Skoðaðu og prófaðu appið með tilbúnum gögnum.`;
    b.textContent = "Opna sýniútgáfu";
    b.addEventListener("click", () => { l.hidden = true; });
    l.hidden = false;
  }
} catch (e) {}
