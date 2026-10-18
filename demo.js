// Sýniútgáfa appsins (opnast með ?demo í slóðinni, t.d. https://aerastudio.github.io/aera-app/?demo).
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
    { id: "d0000000000000000000000000000c01", name: "Norðurljós hótel", hlutverk: ["Viðskiptavinur"], kennitala: "000000-0001", vsknr: "", heimilisfang: "Strandgata 1", postnumer: "600", stadur: "Akureyri", simi: "555 0101", netfang: "hotel@nordurljos.example", vefsida: "", tengilidur: "Katrín Jónsdóttir", simiT: "555 0102", netfangT: "katrin@nordurljos.example", athugasemdir: "Sýnigögn." },
    { id: "d0000000000000000000000000000c02", name: "Fjarðarbyggð arkitektar", hlutverk: ["Verkkaupi"], kennitala: "000000-0002", vsknr: "", heimilisfang: "Hafnarbraut 12", postnumer: "220", stadur: "Hafnarfjörður", simi: "555 0201", netfang: "info@fjardar.example", vefsida: "", tengilidur: "Ólafur Árnason", simiT: "", netfangT: "olafur@fjardar.example", athugasemdir: "" },
    { id: "d0000000000000000000000000000c03", name: "Kaffihúsið Bolli", hlutverk: ["Viðskiptavinur"], kennitala: "000000-0003", vsknr: "", heimilisfang: "Laugavegur 99", postnumer: "101", stadur: "Reykjavík", simi: "555 0301", netfang: "bolli@bolli.example", vefsida: "", tengilidur: "Sara Björk", simiT: "", netfangT: "", athugasemdir: "" },
    { id: "d0000000000000000000000000000c04", name: "Listasafn Suðurlands", hlutverk: ["Viðskiptavinur", "Verkkaupi"], kennitala: "000000-0004", vsknr: "", heimilisfang: "Austurvegur 4", postnumer: "800", stadur: "Selfoss", simi: "555 0401", netfang: "safn@listasafn.example", vefsida: "", tengilidur: "Helgi Þór", simiT: "", netfangT: "", athugasemdir: "" }
  ];
  const sub = (pnr, k, name, stada, skil, timar) => ({ id: `sub-${pnr}-${k}`, nr: `${pnr}-${pad(k)}`, heiti: `${pnr}-${pad(k)} ${name}`, stada, skiladagur: skil == null ? null : day(skil), timar, serMappa: null, mappa: null, lysing: null });
  const P = (o) => ({ yfirlit: null, mappa: null, starfsmenn: ["JJ"], aklst: null, tilbod: null, athugasemdir: [], ...o, nafn: o.nr + " " + o.stutt });
  const verkefni = [
    P({ id: "p1", nr: `${yr}-21`, stutt: "Lýsing hótelanddyris", stada: "Í vinnslu", vskId: "d0000000000000000000000000000c01", vidskiptavinur: "Norðurljós hótel", vkId: "d0000000000000000000000000000c02", verkkaupi: "Fjarðarbyggð arkitektar", thjonusta: ["Lýsing"], timar: 31.5, aklst: 40, tilbod: 650000, skiladagur: day(9), vidburdur: null,
      lysing: "Ný lýsing í anddyri og móttöku hótelsins. Áhersla á hlýja birtu og stýringu eftir tíma dags.", naest: "Klára ljósateikningu og senda til yfirferðar.", athuga: "Bíða eftir loftaplani frá arkitekt.",
      athugasemdir: [{ id: "a1", t: "Viðskiptavinur vill skoða tvær litahitastillingar á kynningarfundi.", d: iso(-2), sk: "JJ" }],
      undirverk: [sub(`${yr}-21`, 1, "Forsendur", "Done", -12, 6), sub(`${yr}-21`, 2, "Ljósateikning", "In progress", 3, 18.5), sub(`${yr}-21`, 3, "Capture-módel", "Up next", 7, 7), sub(`${yr}-21`, 4, "Útgáfa", "Not started", 9, 0)] }),
    P({ id: "p2", nr: `${yr}-22`, stutt: "Teikningar kaffihúss", stada: "Í yfirferð", vskId: "d0000000000000000000000000000c03", vidskiptavinur: "Kaffihúsið Bolli", thjonusta: ["Teiknivinna"], timar: 22, aklst: 24, tilbod: 380000, skiladagur: day(2), vidburdur: null,
      lysing: "Grunnmyndir og útlit fyrir endurbætur á kaffihúsi.", naest: "Lagfæra athugasemdir eftir yfirferð.",
      undirverk: [sub(`${yr}-22`, 1, "Gögn móttekin og yfirfarin", "Done", -20, 2), sub(`${yr}-22`, 2, "Módel", "Done", -10, 9), sub(`${yr}-22`, 3, "Teikningar", "Done", -3, 9), sub(`${yr}-22`, 4, "Yfirferð", "In progress", 2, 2)] }),
    P({ id: "p3", nr: `${yr}-23`, stutt: "Sýningarlýsing safns", stada: "Tilboð", vskId: "d0000000000000000000000000000c04", vidskiptavinur: "Listasafn Suðurlands", vkId: "d0000000000000000000000000000c04", verkkaupi: "Listasafn Suðurlands", thjonusta: ["Lýsing", "Hönnun & ráðgjöf"], timar: 3, tilbod: 1200000, skiladagur: day(30), vidburdur: day(45, "17:00"), timabilFra: day(14, "09:00"), timabilTil: day(30, "17:00"),
      lysing: "Lýsing fyrir nýja sumarsýningu.", undirverk: [sub(`${yr}-23`, 1, "Hugmyndavinna", "In progress", 6, 3), sub(`${yr}-23`, 2, "3D render", "Not started", 20, 0)] }),
    P({ id: "p4", nr: `${yr}-24`, stutt: "Ráðgjöf um útilýsingu", stada: "Beiðni", vskId: "d0000000000000000000000000000c01", vidskiptavinur: "Norðurljós hótel", thjonusta: ["Hönnun & ráðgjöf"], timar: 0, skiladagur: null, undirverk: [] }),
    P({ id: "p5", nr: `${yr}-17`, stutt: "Innréttingar móttöku", stada: "Afhent", vskId: "d0000000000000000000000000000c02", vidskiptavinur: "Fjarðarbyggð arkitektar", thjonusta: ["Teiknivinna"], timar: 42, skiladagur: day(-25), undirverk: [sub(`${yr}-17`, 1, "Teikningar", "Done", -30, 36), sub(`${yr}-17`, 2, "Útgáfa", "Done", -25, 6)] }),
    P({ id: "p6", nr: `${yr}-12`, stutt: "Ljósastýring veitingasalar", stada: "Reikningsfært", vskId: "d0000000000000000000000000000c03", vidskiptavinur: "Kaffihúsið Bolli", thjonusta: ["Lýsing"], timar: 16, skiladagur: day(-60), undirverk: [] })
  ];
  const T = (id, off, pid, sid, lys, fra, til, t) => ({ id, date: day(off), lysing: lys, nr: verkefni.find(p => p.id === pid)?.nr, verkefniId: pid, undirverkId: sid, fra, til, timar: t, starfsmadur: "JJ", timabil: timabilOf(day(off)) });
  const faerslur = [
    T("t1", 0, "p1", `sub-${yr}-21-2`, "Ljósateikning anddyri", "08:30", "11:30", 3),
    T("t2", -1, "p1", `sub-${yr}-21-2`, "Ljósateikning móttaka", "09:00", "15:30", 6.5),
    T("t3", -1, "p2", `sub-${yr}-22-4`, "Yfirferð með viðskiptavini", "16:00", "17:00", 1),
    T("t4", -2, "p2", `sub-${yr}-22-3`, "Lagfæringar á útliti", "09:00", "13:00", 4),
    T("t5", -3, "p3", `sub-${yr}-23-1`, "Hugmyndavinna og skissur", "10:00", "13:00", 3),
    T("t6", -4, "p1", `sub-${yr}-21-3`, "Capture-módel uppsetning", "08:00", "15:00", 7),
    T("t7", -7, "p1", `sub-${yr}-21-2`, "Ljósateikning", "09:00", "14:00", 5),
    T("t8", -8, "p2", `sub-${yr}-22-3`, "Teikningar", "09:00", "14:00", 5),
    T("t9", -9, "p1", `sub-${yr}-21-1`, "Forsendur og mælingar", null, null, 6)
  ];
  const fundir = [
    { id: "f1", name: "Kynning á ljósateikningu", date: day(0, "14:00"), stadsetning: "Norðurljós hótel", fundarhlekkur: null, fundargerd: null, projectId: "p1", verknr: verkefni[0].nafn, mappa: null, attendees: [], seria: null },
    { id: "f2", name: "Yfirferð teikninga", date: day(2, "10:00"), stadsetning: null, fundarhlekkur: "https://meet.example.com/demo", fundargerd: null, projectId: "p2", verknr: verkefni[1].nafn, mappa: null, attendees: [], seria: null },
    { id: "f3", name: "Upphafsfundur sýningar", date: day(6, "13:00"), stadsetning: "Listasafn Suðurlands", fundarhlekkur: null, fundargerd: null, projectId: "p3", verknr: verkefni[2].nafn, mappa: null, attendees: [], seria: null },
    { id: "f4", name: "Vikufundur", date: day(-5, "09:00"), stadsetning: "Skrifstofa", fundarhlekkur: null, fundargerd: null, projectId: null, verknr: null, mappa: null, attendees: [], seria: null }
  ];
  const kostnadur = [
    { id: "k1", date: day(-4), verkefniId: "p1", undirverkId: null, lysing: "Sýnishorn af ljósgjöfum", upphaed: 18900, starfsmadur: "JJ", kvittun: null, kvittunId: null, stofnad: iso(-4) }
  ];
  const reikningar = [
    { id: "r1", nr: 1001, dags: day(-40), gjalddagi: day(-26), verkefniIds: ["p6"], verkefniId: "p6", vskId: "d0000000000000000000000000000c03",
      kaupandi: { name: "Kaffihúsið Bolli", kennitala: "000000-0003", heimilisfang: "Laugavegur 99", postnumer: "101", stadur: "Reykjavík", netfang: "bolli@bolli.example" },
      seljandi: { nafn: "AERA Studio (sýnishorn)", kt: "000000-0000", heimilisfang: "Sýnigata 1", vsknr: "", banki: "", netfang: "demo@aera.example", simi: "", vsk: 24, frestur: 14 },
      linur: [{ lysing: "Ljósastýring veitingasalar", magn: 16, eining: "klst.", verd: 14900 }], vskP: 24, net: 238400, vsk: 57216, tot: 295616,
      timaIds: [], kostnIds: [], stada: "Greitt", greitt: day(-28), stofnad: iso(-40) },
    { id: "r2", nr: 1002, dags: day(-10), gjalddagi: day(4), verkefniIds: ["p5"], verkefniId: "p5", vskId: "d0000000000000000000000000000c02",
      kaupandi: { name: "Fjarðarbyggð arkitektar", kennitala: "000000-0002", heimilisfang: "Hafnarbraut 12", postnumer: "220", stadur: "Hafnarfjörður", netfang: "info@fjardar.example" },
      seljandi: { nafn: "AERA Studio (sýnishorn)", kt: "000000-0000", heimilisfang: "Sýnigata 1", vsknr: "", banki: "", netfang: "demo@aera.example", simi: "", vsk: 24, frestur: 14 },
      linur: [{ lysing: "Innréttingar móttöku – teiknivinna", magn: 42, eining: "klst.", verd: 14900 }], vskP: 24, net: 625800, vsk: 150192, tot: 775992,
      timaIds: [], kostnIds: [], stada: "Ógreitt", greitt: null, stofnad: iso(-10) }
  ];
  const skjol = [
    { id: "s1", name: "Tilboð – sýningarlýsing", snid: "tengill", url: "https://example.com/", stadur: "verk", projectId: "p3", mappa: "01 Móttekið", stofnad: iso(-6), breytt: iso(-3) },
    { id: "s2", name: "Verklýsing anddyri", snid: "tengill", url: "https://example.com/", stadur: "verk", projectId: "p1", mappa: "02 Vinnuskjöl", stofnad: iso(-11), breytt: iso(-1) }
  ];
  // Póstþræðir: aðeins tilvísun í conversationId; póstarnir sjálfir eru sóttir úr pósthólfinu.
  const thraedir = [
    { id: "t1", conv: "demo-conv-1", verkefniId: "p1", efni: `${yr}-21 Loftaplan anddyris`, tengt: iso(-1), af: "sjálfvirkt" }
  ];
  // Eldri afrit úr gamla pósthólfinu sem fundust ekki
  const postar = [
    { id: "m1", efni: "Ljósaval í móttöku", fra: "Ólafur Árnason", dags: iso(-40), url: null, verkefniId: "p1", ekkiFannst: true }
  ];
  window.MS_OFL = [{ id: "demo-m2", conversationId: "demo-conv-2", subject: "Fyrirspurn um útilýsingu", from: { emailAddress: { name: "Katrín Jónsdóttir", address: "katrin@example.is" } }, receivedDateTime: iso(0), bodyPreview: "Gætuð þið skoðað lýsingu á bílastæði…" }];
  return {
    uppfaert: new Date().toISOString(),
    verkefni, fundir, vidskiptavinir: vsk, skjol, kostnadur, reikningar, postar, thraedir,
    timar: { faerslur },
    netfangaskra: [],
    stillingar: {
      starfsmenn: [{ sk: "JJ", nafn: "Jóna Jónsdóttir", eg: true }, { sk: "GG", nafn: "Gunnar Gunnarsson", eg: false }, { sk: "HS", nafn: "Helga Sigurðardóttir" }, { sk: "SB", nafn: "Sigrún Bókari" }],
      vikumark: 40,
      reikn: { nafn: "AERA Studio (sýnishorn)", kt: "000000-0000", heimilisfang: "Sýnigata 1", vsknr: "", netfang: "demo@aera.example", simi: "", banki: "", timagjald: 10000, frestur: 14, nastaNr: 1003 },
      undirskrift: { nafn: "Jóna Jónsdóttir", netfang: "demo@aera.example" }
    }
  };
}

// Notendur sýniútgáfu. ?demo = admin (Jóna), ?demo=starfsmadur = starfsmaður (Gunnar), ?demo=bokari = bókari (Sigrún).
const now = new Date().toISOString();
const notendur = { notendur: {
  "jona@aera.example": { nafn: "Jóna Jónsdóttir", sk: "JJ", hlutverk: "admin", virkur: true, stofnad: iso(-30), breytt: iso(-30), sidast: now },
  "gunnar@aera.example": { nafn: "Gunnar Gunnarsson", sk: "GG", hlutverk: "starfsmadur", virkur: true, stofnad: iso(-20), breytt: iso(-20), sidast: iso(-1) },
  "helga@aera.example": { nafn: "Helga Sigurðardóttir", sk: "HS", hlutverk: "starfsmadur", virkur: false, stofnad: iso(-60), breytt: iso(-5), sidast: iso(-9) },
  "sigrun@aera.example": { nafn: "Sigrún Bókari", sk: "SB", hlutverk: "bokari", virkur: true, stofnad: iso(-10), breytt: iso(-10), sidast: iso(-2) }
} };
const demoRole = new URLSearchParams(location.search).get("demo");
const email = demoRole === "starfsmadur" ? "gunnar@aera.example" : demoRole === "bokari" ? "sigrun@aera.example" : "jona@aera.example";
const user = { email, ...notendur.notendur[email] };

// Gagnagrunnur í minni: sama viðmót og firebase.js lætur appið fá (get / set / tx / watch / commit / watchCol).
// Sýnigögnin byrja í gamla sniðinu (allt í app/state) svo flutningurinn yfir í söfn keyrir líka í sýniútgáfunni (hjá admin).
// Sýniútgáfan líkir eftir aðgangsreglum: starfsmaður sér aðeins sína tíma og sinn kostnað.
const store = { "app/state": sampleState(), "app/notendur": notendur };
// Spjall í sýniútgáfu
[["s1", "almennt", [], "gunnar@aera.example", "Gunnar Gunnarsson", "Er einhver með lykilinn að sýnishornaskápnum?", -1],
 ["s2", "almennt", [], "jona@aera.example", "Jóna Jónsdóttir", "Hann er á skrifborðinu mínu 👍", -1],
 ["s3", "dm:gunnar@aera.example|jona@aera.example", ["gunnar@aera.example", "jona@aera.example"], "gunnar@aera.example", "Gunnar Gunnarsson", "Geturðu kíkt á loftaplanið fyrir 21 áður en það fer til hótelsins?", 0]
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
  const ow = x => sk2em[x.starfsmadur || x.sk] || "jona@aera.example";
  const go = () => { if (!window.GOGN) return setTimeout(go, 20); for (const o of GOGN.migrate(store["app/state"], "jona@aera.example", ow)) store[o.path] = structuredClone(o.data); window.aeraStart(db); };
  go();
}

window.aeraSignOut = () => location.reload(); // „Endurstilla“ í sýniútgáfu
document.querySelectorAll('[onclick="aeraSignOut()"]').forEach(b => { b.textContent = "Endurstilla sýniútgáfu"; });
const v = document.getElementById("appver"); if (v) v.textContent = "Sýniútgáfa";
document.title = "AERA Studio · sýniútgáfa";
if (user.hlutverk === "admin") window.aeraStart(db);
setTimeout(() => window.toast && toast("Sýniútgáfa með tilbúnum gögnum – breytingar vistast ekki"), 600);
