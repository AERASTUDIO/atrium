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
  return {
    uppfaert: new Date().toISOString(),
    verkefni, fundir, vidskiptavinir: vsk, skjol, kostnadur, reikningar, postar, thraedir,
    timar: { faerslur },
    netfangaskra: [],
    stillingar: {
      starfsmenn: [{ sk: "JJ", nafn: "Jóna Jónsdóttir", eg: true }, { sk: "GG", nafn: "Gunnar Gunnarsson", eg: false }, { sk: "HS", nafn: "Helga Sigurðardóttir" }, { sk: "SB", nafn: "Sigrún Bókari" }],
      vikumark: 40,
      thjonusta: ["Hönnun", "Ráðgjöf", "Framkvæmd", "Almennt"],
      reikn: { nafn: (window.ORG?.nafn || "Fyrirtækið") + " (sýnishorn)", kt: "000000-0000", heimilisfang: "Sýnigata 1", vsknr: "", netfang: "demo@" + (window.ORG?.len || "aera.example"), simi: "", banki: "", timagjald: 10000, frestur: 14, nastaNr: 1003 },
      undirskrift: { nafn: "Jóna Jónsdóttir", netfang: "demo@demo.example" }
    }
  };
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
if (window.salaPrufa && window.ON && (ON("leiga") || ON("sala"))) { const st = store["app/state"], p = salaPrufa(st.vidskiptavinir); st.vorur = p.vorur; st.tilbod = p.tilbod; if (p.pantanir?.length) st.pantanir = p.pantanir; }
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
