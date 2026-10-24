/* Atrium – Cloud Functions (2.64.0). Sami kóði fyrir allar uppsetningar; hvert Firebase-verkefni fær sitt eintak:
     firebase deploy --only functions --project dev   (eða aera / sonik / party, sjá .firebaserc)
   Svæði: europe-west1 (sama og Firestore). Engin leyndarmál hér – kóðinn er opinber.

   Tilkynningar (ýtitilkynningar í síma og tölvu, Heim nr. 3):
   - Hver notandi kveikir á þeim í Stillingar › Ég › Tilkynningar. Tæki og val eru í tilkynningar/{netfang}:
       { tokens: { <fcm-token>: { tegund, uppfaert } }, val: { pantanir, stadfest, spjall, morgun: true|false } }
   - Viðtakendur eru virkir notendur í app/notendur. Sá sem gerði hlutinn fær ekki tilkynningu um eigin verk.
   - Skilaboðin eru „data“-skilaboð; sw.js birtir þau og setur tölu á tákn appsins.

   Atburðir:
   - pantanir/{id} búin til            → „Ný pöntun P-0912 · Hótel Lind“                 (val: pantanir)
   - opinber/{t}: viðskiptavinur staðfestir pöntun eða samþykkir tilboð
                                         → „Sigga Jóns staðfesti P-0901“                     (val: stadfest)
   - spjall/{id} búið til               → einkaskilaboð til viðtakanda, almennt til allra  (val: spjall)
   - Kl. 08:00 alla virka daga          → „Í dag: 2 afhendingar · 1 skil · 1 seint“        (val: morgun)
*/
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions, logger } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 3, memory: "256MiB" });
const db = admin.firestore();
const lc = s => String(s || "").trim().toLowerCase();
const TZ = "Atlantic/Reykjavik";
// Uppsetningarmappa hvers Firebase-verkefnis – sw.js opnar rétta uppsetningu þegar smellt er á tilkynningu
const INST = { "atrium-499a2": "dev", "aera-app-cfdb3": "aera", "atrium-sonik": "sonik", "atrium-party": "party" }[process.env.GCLOUD_PROJECT || ""] || "";

/* ---------- Viðtakendur ---------- */
async function activeUsers() {
  const s = await db.doc("app/notendur").get(); const N = (s.exists && s.data().notendur) || {};
  return Object.entries(N).filter(([, u]) => u && u.virkur !== false).map(([email, u]) => ({ email: lc(email), nafn: u.nafn || "", hlutverk: u.hlutverk || "" }));
}

/* ---------- Senda ---------- */
// to: listi netfanga; kind: pantanir|stadfest|spjall|morgun; msg: { title, body, link?, tag? }
async function send(to, kind, msg) {
  const emails = [...new Set(to.map(lc).filter(Boolean))]; if (!emails.length) return 0;
  const refs = emails.map(e => db.doc("tilkynningar/" + e)), snaps = await db.getAll(...refs);
  const jobs = [], owner = {};
  snaps.forEach((s, i) => {
    if (!s.exists) return; const d = s.data() || {}, val = d.val || {};
    if (val[kind] === false) return;
    Object.keys(d.tokens || {}).forEach(t => { jobs.push(t); owner[t] = emails[i]; });
  });
  if (!jobs.length) return 0;
  const data = { title: String(msg.title || "Atrium"), body: String(msg.body || ""), link: String(msg.link || ""), tag: String(msg.tag || kind), kind, badge: String(msg.badge ?? ""), o: INST };
  const res = await admin.messaging().sendEachForMulticast({ tokens: jobs, data, webpush: { headers: { TTL: "86400", Urgency: "high" } } });
  // Fjarlægja tæki sem eru ekki lengur til (forrit fjarlægt, leyfi afturkallað)
  const dead = [];
  res.responses.forEach((r, i) => { const c = r.error && r.error.code; if (c && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(c)) dead.push(jobs[i]); });
  await Promise.all(dead.map(t => db.doc("tilkynningar/" + owner[t]).update({ ["tokens." + t]: admin.firestore.FieldValue.delete() }).catch(() => {})));
  logger.info("send", { kind, to: emails.length, tokens: jobs.length, ok: res.successCount, dead: dead.length });
  return res.successCount;
}

const nmP = P => [P.nr, P.heiti && P.heiti !== "Pöntun" ? P.heiti : ""].filter(Boolean).join(" ");
const who = P => P.vidskiptavinur || P.tengilidur || "";
const link = (t, o) => "#t=" + encodeURIComponent(t) + (o ? "&o=" + encodeURIComponent(o) : "");

/* ---------- Ný pöntun ---------- */
exports.nyPontun = onDocumentCreated("pantanir/{id}", async ev => {
  const P = ev.data && ev.data.data(); if (!P || P.prufa) return;
  const af = lc(P.stofnadAf || P.af || P.eigandi || "");
  const us = (await activeUsers()).filter(u => u.email !== af).map(u => u.email);
  const upp = { postur: "úr pósti", shopify: "úr vefverslun", vefur: "af vefnum", tilbod: "úr tilboði" }[P.uppruni] || "";
  await send(us, "pantanir", { title: "Ný pöntun" + (upp ? " " + upp : ""), body: [nmP(P), who(P)].filter(Boolean).join(" · "), link: link("pantanir", "tb:" + (P.id || ev.params.id)), tag: "pn-" + ev.params.id });
});

/* ---------- Viðskiptavinur staðfestir pöntun eða samþykkir tilboð (pöntunarsíðan) ---------- */
exports.vidskStadfestir = onDocumentUpdated("opinber/{t}", async ev => {
  const a = ev.data.before.data() || {}, b = ev.data.after.data() || {};
  if (a.stadfest || !b.stadfest) return;
  const t = ev.params.t, tilbod = b.teg === "tilbod", col = tilbod ? "tilbod" : "pantanir";
  let id = "", doc = null;
  try { const q = await db.collection(col).where("opinber", "==", t).limit(1).get(); if (!q.empty) { doc = q.docs[0].data(); id = doc.id || q.docs[0].id; } } catch (e) { logger.warn("leit", e); }
  const nafn = (b.stadfest && b.stadfest.nafn) || b.tengilidur || b.vidskiptavinur || "Viðskiptavinur";
  const us = (await activeUsers()).map(u => u.email);
  await send(us, "stadfest", {
    title: tilbod ? "Tilboð samþykkt" : "Pöntun staðfest",
    body: `${nafn} ${tilbod ? "samþykkti tilboð" : "staðfesti"} ${[b.nr, b.heiti && b.heiti !== "Pöntun" ? b.heiti : ""].filter(Boolean).join(" ")}` + (b.stadfest.athugasemd ? ` – „${String(b.stadfest.athugasemd).slice(0, 80)}“` : ""),
    link: id ? link(tilbod ? "tilbod" : "pantanir", "tb:" + id) : "", tag: "st-" + t
  });
});

/* ---------- Spjall ---------- */
exports.spjall = onDocumentCreated("spjall/{id}", async ev => {
  const m = ev.data && ev.data.data(); if (!m) return; const af = lc(m.af);
  let to;
  if (m.ras === "almennt") to = (await activeUsers()).map(u => u.email).filter(e => e !== af);
  else to = (m.adilar || []).map(lc).filter(e => e !== af);
  await send(to, "spjall", { title: (m.nafn || "Skilaboð") + (m.ras === "almennt" ? " · Almennt" : ""), body: String(m.texti || "").slice(0, 180), link: link("spjall"), tag: "sp-" + (m.ras === "almennt" ? "almennt" : af) });
});

/* ---------- Morgunyfirlit kl. 08:00 virka daga ---------- */
const isoTZ = d => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
exports.morgunyfirlit = onSchedule({ schedule: "0 8 * * 1-5", timeZone: TZ }, async () => {
  const t = isoTZ(new Date()), s = await db.collection("pantanir").get(), P = s.docs.map(d => d.data()).filter(x => !x.prufa);
  const d10 = x => String(x || "").slice(0, 10);
  const ut = P.filter(x => d10(x.fra) === t && ["Ný", "Staðfest"].includes(x.stada)).length;
  const inn = P.filter(x => d10(x.til || x.fra) === t && x.stada === "Afhent").length;
  const seint = P.filter(x => x.stada === "Afhent" && d10(x.til || x.fra) < t).length;
  const ny = P.filter(x => x.stada === "Ný").length;
  const parts = [ut && `${ut} ${ut === 1 ? "afhending" : "afhendingar"}`, inn && `${inn} skil`, seint && `${seint} ${seint === 1 ? "skil komin" : "skil komin"} fram yfir`, ny && `${ny} ${ny === 1 ? "ný pöntun bíður" : "nýjar pantanir bíða"} staðfestingar`].filter(Boolean);
  if (!parts.length) return;
  const us = (await activeUsers()).map(u => u.email);
  await send(us, "morgun", { title: "Í dag", body: parts.join(" · "), link: link("pnyf"), tag: "morgun", badge: String(seint + ny) });
});

/* ---------- Prufutilkynning (Stillingar › Ég › Tilkynningar › Senda prufutilkynningu) ---------- */
exports.prufa = onDocumentUpdated("tilkynningar/{email}", async ev => {
  const a = ev.data.before.data() || {}, b = ev.data.after.data() || {};
  if (!b.prufa || a.prufa === b.prufa) return;
  await send([ev.params.email], "prufa", { title: "Prufa frá Atrium", body: "Tilkynningar virka í þessu tæki 🎉", link: "", tag: "prufa" });
});
