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
   - 2.72.0: skil, tinsla, tvibokun, vidsvar, klukka, uthlutun, aaetlun, eftirfylgni – sjá neðst í skránni
   - 2.85.0: tilkynningar um tilboð og pantanir (ný pöntun, staðfesting, svar, eftirfylgni) fara aðeins til þeirra sem eru skráðir á þau (mennOf)
*/
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { defineString, defineSecret } = require("firebase-functions/params");
const crypto = require("crypto");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions, logger } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 3, memory: "256MiB" });
const db = admin.firestore();
const lc = s => String(s || "").trim().toLowerCase();
// Tegundir sem notandi þarf sjálfur að kveikja á (sjálfgefið slökkt)
const DEFOFF = new Set(["postur", "minnpostur"]);
const TZ = "Atlantic/Reykjavik";
// Uppsetningarmappa hvers Firebase-verkefnis – sw.js opnar rétta uppsetningu þegar smellt er á tilkynningu
const INST = { "atrium-499a2": "dev", "aera-app-cfdb3": "aera", "atrium-sonik": "sonik", "atrium-party": "party" }[process.env.GCLOUD_PROJECT || ""] || "";

/* ---------- Viðtakendur ---------- */
async function activeUsers() {
  const s = await db.doc("app/notendur").get(); const N = (s.exists && s.data().notendur) || {};
  return Object.entries(N).filter(([, u]) => u && u.virkur !== false).map(([email, u]) => ({ email: lc(email), nafn: u.nafn || "", hlutverk: u.hlutverk || "", sk: u.sk || "" }));
}

/* ---------- Senda ---------- */
// to: listi netfanga; kind: pantanir|stadfest|spjall|morgun; msg: { title, body, link?, tag? }
async function send(to, kind, msg) {
  const emails = [...new Set(to.map(lc).filter(Boolean))]; if (!emails.length) return 0;
  const refs = emails.map(e => db.doc("tilkynningar/" + e)), snaps = await db.getAll(...refs);
  const jobs = [], owner = {};
  snaps.forEach((s, i) => {
    if (!s.exists) return; const d = s.data() || {}, val = d.val || {};
    if (DEFOFF.has(kind) ? val[kind] !== true : val[kind] === false) return;
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
  const af = lc(P.stofnad_af || P.stofnadAf || P.af || P.eigandi || ""); // 2.90.1: sá sem stofnar pöntunina fær ekki tilkynningu um hana (reiturinn heitir stofnad_af)
  const us = (await mennOf(P)).filter(e => e !== af);
  const upp = { postur: "úr pósti", shopify: "úr vefverslun", vefur: "af vefnum", tilbod: "úr tilboði" }[P.uppruni] || "";
  await send(us, "pantanir", { title: "Ný pöntun" + (upp ? " " + upp : ""), body: [nmP(P), who(P)].filter(Boolean).join(" · "), link: link("pantanir", "tb:" + (P.id || ev.params.id)), tag: "pn-" + ev.params.id });
});

/* ---------- Viðskiptavinur staðfestir pöntun eða samþykkir tilboð (pöntunarsíðan) ---------- */
exports.vidskStadfestir = onDocumentUpdated("opinber/{t}", async ev => {
  const a = ev.data.before.data() || {}, b = ev.data.after.data() || {};
  // 2.72.0: viðskiptavinur hafnar tilboði eða sendir spurningu/athugasemd af tilboðssíðunni
  const nSv = (b.svor || []).length, nSa = (a.svor || []).length, nyHafn = !a.hafnad && b.hafnad;
  if (nyHafn || nSv > nSa) {
    const nm = [b.nr, b.heiti].filter(Boolean).join(" "), sv = nyHafn ? b.hafnad : b.svor[nSv - 1], hver = sv.nafn || b.tengilidur || b.vidskiptavinur || "Viðskiptavinur";
    let id = "", d0 = null; try { const q = await db.collection(b.teg === "tilbod" ? "tilbod" : "pantanir").where("opinber", "==", ev.params.t).limit(1).get(); if (!q.empty) { d0 = q.docs[0].data(); id = d0.id || q.docs[0].id; } } catch (e) {}
    await send(await mennOf(d0), "vidsvar", { title: nyHafn ? `${hver} hafnaði tilboði` : `Spurning frá ${hver}`, body: nm + (sv.texti || sv.astaeda ? ` – „${String(sv.texti || sv.astaeda).slice(0, 120)}“` : ""), link: id ? link("tilbod", "tb:" + id) : "", tag: "sv-" + ev.params.t + "-" + nSv });
    return;
  }
  if (a.stadfest || !b.stadfest) return;
  const t = ev.params.t, tilbod = b.teg === "tilbod", col = tilbod ? "tilbod" : "pantanir";
  // 2.75.0: staðfesting af pöntunarsíðu fer strax á pöntunina (þótt enginn hafi appið opið) – þá sendist staðfestingarpósturinn
  if (b.teg !== "tilbod" && b.teg !== "aukaverk") { try { const q = await db.collection("pantanir").where("opinber", "==", t).limit(1).get();
    if (!q.empty) { const P0 = q.docs[0].data(); if (!P0.vidskStadfest) await q.docs[0].ref.update({ vidskStadfest: b.stadfest, ...(P0.stada === "Ný" ? { stada: "Staðfest" } : {}) }); } } catch (e) { logger.warn("staðfesting á pöntun", e); } }
  let id = "", doc = null;
  try { const q = await db.collection(col).where("opinber", "==", t).limit(1).get(); if (!q.empty) { doc = q.docs[0].data(); id = doc.id || q.docs[0].id; } } catch (e) { logger.warn("leit", e); }
  const nafn = (b.stadfest && b.stadfest.nafn) || b.tengilidur || b.vidskiptavinur || "Viðskiptavinur";
  const us = await mennOf(doc);
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
  // @nafn (2.72.0): sá sem minnst er á fær tilkynningu þótt hann sé ekki með spjalltilkynningar
  const tags = [...String(m.texti || "").matchAll(/@([\p{L}][\p{L}.-]*)/gu)].map(x => lc(x[1])); if (!tags.length) return;
  const nefnd = (await activeUsers()).filter(u => u.email !== af && tags.some(t => t === lc(u.sk) || t === lc(String(u.nafn).split(/\s+/)[0]) || t === lc(u.email.split("@")[0]))).map(u => u.email);
  await send(nefnd, "uthlutun", { title: (m.nafn || "Einhver") + " minntist á þig", body: String(m.texti || "").slice(0, 180), link: link("spjall"), tag: "sp-" + (m.ras === "almennt" ? "almennt" : af) });
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


/* ---------- Nýr póstur (2.65.0) ----------
   Tilkynning þegar póstur berst í sameiginlega pósthólfið (POSTHOLF, t.d. aera@aerastudio.is) eða í eigið pósthólf starfsmanns.
   Microsoft Graph sendir „change notification“ á posturWebhook þegar nýr póstur kemur í Inbox; hann fer í biðröð (postbox/{id})
   og posturVinnsla sækir sendanda og efni, finnur verkefnið (verknúmer í efni eða netfang viðskiptavinar) og sendir tilkynningu.
   Krefst: Entra-forritið „Atrium“ með forritaheimildinni Mail.Read (admin consent) og leyndarmálinu MS_CLIENT_SECRET í
   Google Secret Manager (firebase functions:secrets:set MS_CLIENT_SECRET). Áskriftir endast í 2 daga og eru endurnýjaðar á 12 klst. fresti.
   Val notanda: val.postur (sameiginlegt) og val.minnpostur (eigið) – sjálfgefið slökkt. Gögn: kerfi/postur (áskriftir), postbox (biðröð). */
const MS_TENANT = defineString("MS_TENANT", { default: "" });
const MS_CLIENT_ID = defineString("MS_CLIENT_ID", { default: "" });
const POSTHOLF = defineString("POSTHOLF", { default: "" });
const MS_SECRET = defineSecret("MS_CLIENT_SECRET");
const REGION = "europe-west1", PROJECT = process.env.GCLOUD_PROJECT || "";
const HOOK = `https://${REGION}-${PROJECT}.cloudfunctions.net/posturWebhook`;
let _tok = null;
async function msToken() {
  if (_tok && _tok.exp > Date.now() + 60e3) return _tok.t;
  const r = await fetch(`https://login.microsoftonline.com/${MS_TENANT.value()}/oauth2/v2.0/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: MS_CLIENT_ID.value(), client_secret: MS_SECRET.value(), scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }) });
  const j = await r.json(); if (!r.ok) throw new Error("Token: " + (j.error_description || j.error || r.status));
  _tok = { t: j.access_token, exp: Date.now() + (j.expires_in || 3000) * 1000 }; return _tok.t;
}
async function graph(path, opt = {}) {
  const r = await fetch("https://graph.microsoft.com/v1.0" + path, { ...opt, headers: { Authorization: "Bearer " + await msToken(), "Content-Type": "application/json", ...(opt.headers || {}) }, body: opt.body ? JSON.stringify(opt.body) : undefined });
  if (r.status === 204) return null; const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(`Graph ${r.status}: ${(j.error && j.error.message) || ""}`); e.status = r.status; throw e; } return j;
}
const KREF = () => db.doc("kerfi/postur");

// Hvaða pósthólf á að fylgjast með: sameiginlega + þeir sem kveiktu á „Mitt pósthólf“ (og eiga tæki)
async function wanted() {
  const out = {}, shared = lc(POSTHOLF.value());
  if (shared) out[shared] = { mailbox: shared, teg: "sameig" };
  const us = new Set((await activeUsers()).map(u => u.email));
  const s = await db.collection("tilkynningar").get();
  s.docs.forEach(d => { const x = d.data() || {}, e = lc(d.id); if (us.has(e) && (x.val || {}).minnpostur === true && Object.keys(x.tokens || {}).length && !out[e]) out[e] = { mailbox: e, teg: "eigin" }; });
  return out;
}
async function syncSubs() {
  if (!MS_TENANT.value() || !MS_CLIENT_ID.value()) { logger.warn("postur: MS_TENANT/MS_CLIENT_ID vantar"); await KREF().set({ villur: ["MS_TENANT/MS_CLIENT_ID vantar í functions/.env"] }, { merge: true }); return; }
  const ks = await KREF().get(), k = ks.exists ? ks.data() : {}, subs = { ...(k.subs || {}) };
  const cs = k.clientState || crypto.randomBytes(24).toString("hex");
  const want = await wanted(), exp = new Date(Date.now() + 2 * 864e5).toISOString();
  const villur = [];   // síðustu villur – sjást í Firestore (kerfi/postur.villur) svo ekki þurfi að lesa logga
  for (const [id, x] of Object.entries(subs)) {
    if (!want[x.mailbox]) { try { await graph("/subscriptions/" + id, { method: "DELETE" }); } catch (e) {} delete subs[id]; continue; }
    if (new Date(x.exp) - Date.now() < 30 * 3600e3) {
      try { await graph("/subscriptions/" + id, { method: "PATCH", body: { expirationDateTime: exp } }); subs[id].exp = exp; }
      catch (e) { logger.warn("endurnýjun", x.mailbox, e.message); villur.push(x.mailbox + " (endurnýjun): " + e.message); delete subs[id]; }
    }
  }
  const have = new Set(Object.values(subs).map(x => x.mailbox));
  for (const w of Object.values(want)) {
    if (have.has(w.mailbox)) continue;
    try {
      const r = await graph("/subscriptions", { method: "POST", body: { changeType: "created", notificationUrl: HOOK, lifecycleNotificationUrl: HOOK,
        resource: `users/${w.mailbox}/mailFolders('inbox')/messages`, expirationDateTime: exp, clientState: cs } });
      subs[r.id] = { mailbox: w.mailbox, teg: w.teg, exp: r.expirationDateTime || exp };
    } catch (e) { logger.error("áskrift " + w.mailbox + ": " + e.message); villur.push(w.mailbox + ": " + e.message); }
  }
  await KREF().set({ subs, clientState: cs, uppfaert: new Date().toISOString(), villur, vaktad: Object.keys(want) });
  logger.info("postur áskriftir", Object.values(subs).map(x => x.mailbox));
}

exports.posturWebhook = onRequest({ secrets: [MS_SECRET], cors: false }, async (req, res) => {
  if (req.query && req.query.validationToken) { res.set("Content-Type", "text/plain").status(200).send(String(req.query.validationToken)); return; }
  try {
    const ks = await KREF().get(), cs = ks.exists ? ks.data().clientState : null, items = (req.body && req.body.value) || [];
    const batch = db.batch(); let n = 0;
    for (const v of items) {
      if (!cs || v.clientState !== cs) continue;
      if (v.lifecycleEvent) { batch.set(db.collection("postbox").doc(), { teg: "lifecycle", atburdur: v.lifecycleEvent, t: Date.now() }); n++; continue; }
      const mid = v.resourceData && v.resourceData.id; if (!mid) continue;
      const id = crypto.createHash("sha1").update(v.subscriptionId + ":" + mid).digest("hex");
      batch.create(db.collection("postbox").doc(id), { teg: "postur", sub: v.subscriptionId, msg: mid, t: Date.now() }); n++;
    }
    if (n) await batch.commit().catch(e => { if (!/ALREADY_EXISTS|already exists/i.test(String(e.message))) throw e; });
    res.status(202).send("");
  } catch (e) { logger.error("webhook", e.message); res.status(202).send(""); }
});

exports.posturVinnsla = onDocumentCreated({ document: "postbox/{id}", secrets: [MS_SECRET] }, async ev => {
  const q = ev.data && ev.data.data(); if (!q) return;
  try {
    if (q.teg === "lifecycle") { await syncSubs(); return; }
    const ks = await KREF().get(), sub = ks.exists && (ks.data().subs || {})[q.sub]; if (!sub) return;
    const m = await graph(`/users/${encodeURIComponent(sub.mailbox)}/messages/${encodeURIComponent(q.msg)}?$select=subject,from,isDraft,receivedDateTime`);
    if (!m || m.isDraft) return;
    const fa = lc(m.from && m.from.emailAddress && m.from.emailAddress.address), fn = (m.from && m.from.emailAddress && m.from.emailAddress.name) || fa;
    if (!fa || fa === lc(sub.mailbox)) return;
    // Verkefni: verknúmer í efni (t.d. 2026-21) eða netfang viðskiptavinar
    // Smellt á tilkynningu opnar póstinn sjálfan í Pósti (b = pósthólfið sem hann er í)
    const lnk = link("postur", "post:" + q.msg) + (sub.teg === "sameig" ? "&b=" + encodeURIComponent(sub.mailbox) : ""); let um = "";
    const nr = (String(m.subject || "").match(/\b(20\d\d-\d{2,3})\b/) || [])[1];
    try {
      let p = null;
      if (nr) { const r = await db.collection("verkefni").where("nr", "==", nr).limit(1).get(); if (!r.empty) p = r.docs[0].data(); }
      if (!p && fa) { const v = await db.collection("vidskiptavinir").where("netfang", "==", fa).limit(1).get();
        if (!v.empty) { const c = v.docs[0].data(); um = c.name || c.nafn || "";
          const r = await db.collection("verkefni").where("vskId", "==", c.id || v.docs[0].id).get(); const op = r.docs.map(d => d.data()).filter(x => !x.lokid && x.stada !== "Lokið"); if (op.length === 1) p = op[0]; } }
      if (p) um = [p.nr, p.stutt || p.nafn].filter(Boolean).join(" ");
    } catch (e) { logger.warn("verkefnaleit", e.message); }
    const to = sub.teg === "sameig" ? (await activeUsers()).map(u => u.email) : [sub.mailbox];
    await send(to, sub.teg === "sameig" ? "postur" : "minnpostur", {
      title: (sub.teg === "sameig" ? "✉ " + sub.mailbox.split("@")[0] + " · " : "✉ ") + fn,
      body: String(m.subject || "(ekkert efni)").slice(0, 140) + (um ? " · " + um : ""), link: lnk, tag: "pm-" + q.msg.slice(-24) });
  } catch (e) { logger.error("posturVinnsla", e.message); }
  finally { await ev.data.ref.delete().catch(() => {}); }
});

// Endurnýja áskriftir á 12 klst. fresti, og strax þegar notandi kveikir/slekkur á „Mitt pósthólf“
exports.posturAskrift = onSchedule({ schedule: "every 12 hours", timeZone: TZ, secrets: [MS_SECRET] }, async () => { await syncSubs(); });
exports.posturVal = onDocumentWritten({ document: "tilkynningar/{email}", secrets: [MS_SECRET] }, async ev => {
  const a = (ev.data.before && ev.data.before.data()) || {}, b = (ev.data.after && ev.data.after.data()) || {};
  const f = x => [(x.val || {}).minnpostur === true, (x.val || {}).postur === true, Object.keys(x.tokens || {}).length > 0].join();
  if (f(a) === f(b)) return; await syncSubs();
});


/* ==========================================================================================================
   Fleiri tilkynningar (2.72.0). Hver notandi kveikir/slekkur í Stillingar › Ég › Tilkynningar.
   - skil        Kl. 09 mán–lau: leigubúnaður sem átti að skila (pöntun „Afhent“, skiladagur liðinn)
   - tinsla      Á 30 mín fresti 07–20: afhending á næstu 2 klst. (afhKl) en ekkert tínt og engin afhendingarkvittun
   - tvibokun    Þegar pöntun er stofnuð eða breytt: búnaður ekki laus á tímabilinu (sama regla og í appinu)
   - vidsvar     Viðskiptavinur hafnar tilboði eða sendir spurningu af tilboðssíðunni (sjá vidskStadfestir)
   - klukka      Kl. 19 og 22: stimpilklukka enn í gangi (aðeins til eiganda klukkunnar)
   - uthlutun    Settur á verkefni (starfsmenn) eða minnst á þig með @nafni í spjalli
   - aaetlun     Skráðir tímar á verkefni ná 90 % og 100 % af áætlun (aklst) – til starfsfólks verkefnisins
   - eftirfylgni Kl. 09 virka daga: tilboð sent fyrir 7+ dögum og ekkert svar – til þess sem stofnaði það
   Hver áminning er send einu sinni; skráð í kerfi/tilksent (lykill → tími).
   ========================================================================================================== */
const d10 = x => String(x || "").slice(0, 10);
const pnSkil = P => (P.linur || []).some(l => l.teg === "leiga") || (!(P.linur || []).length && (P.svid || []).includes("Leiga"));
const dIS = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m ? `${+m[3]}. ${["jan", "feb", "mar", "apr", "maí", "jún", "júl", "ágú", "sep", "okt", "nóv", "des"][+m[2] - 1]}` : ""; };
const nowTZ = () => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { iso: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + +p.minute }; };
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
async function once(key) {
  const ref = db.doc("kerfi/tilksent"), k = String(key).replace(/[^\w-]/g, "_");
  return db.runTransaction(async tx => { const s = await tx.get(ref), d = (s.exists && s.data()) || {}; if (d[k]) return false; tx.set(ref, { [k]: new Date().toISOString() }, { merge: true }); return true; });
}
const allEmails = async () => (await activeUsers()).map(u => u.email);
const skEmails = async sks => { const U = await activeUsers(), S = new Set((sks || []).map(lc)); return U.filter(u => u.sk && S.has(lc(u.sk))).map(u => u.email); };
// 2.85.0: þeir sem eru skráðir á tilboð/pöntun – starfsmenn (sk), sá sem stofnaði og starfsfólk tengds verkefnis. Enginn skráður → stjórnendur.
async function mennOf(doc) {
  const U = await activeUsers(), byE = new Set(U.map(u => u.email)), out = new Set(), add = e => { e = lc(e); if (e && byE.has(e)) out.add(e); };
  if (doc) {
    const sk = new Set((doc.starfsmenn || []).map(lc));
    if (doc.verkefniId) { try { const p = await db.doc("verkefni/" + doc.verkefniId).get(); if (p.exists) (p.data().starfsmenn || []).forEach(x => sk.add(lc(x))); } catch (e) {} }
    U.filter(u => u.sk && sk.has(lc(u.sk))).forEach(u => add(u.email));
    add(doc.stofnad_af);
  }
  if (!out.size) U.filter(u => u.hlutverk === "admin").forEach(u => add(u.email));
  return [...out];
}
const loadCol = async c => (await db.collection(c).get()).docs.map(d => ({ id: d.id, ...d.data() })).filter(x => !x.prufa);

/* ---------- 1. Skil komin fram yfir ---------- */
exports.skilSeint = onSchedule({ schedule: "0 9 * * 1-6", timeZone: TZ }, async () => {
  const t = nowTZ().iso, L = (await loadCol("pantanir")).filter(P => P.stada === "Afhent" && pnSkil(P) && d10(P.til || P.fra) && d10(P.til || P.fra) < t)
    .sort((a, b) => d10(a.til || a.fra).localeCompare(d10(b.til || b.fra)));
  if (!L.length) return; const P = L[0];
  await send(await allEmails(), "skil", { title: L.length === 1 ? "Skil komin fram yfir" : `${L.length} skil komin fram yfir`,
    body: `${nmP(P)} · ${who(P)} – átti að skila ${dIS(d10(P.til || P.fra))}` + (L.length > 1 ? ` · +${L.length - 1} í viðbót` : ""), link: L.length === 1 ? link("pantanir", "tb:" + (P.id)) : link("pnyf"), tag: "skil-" + t, badge: String(L.length) });
});

/* ---------- 2. Afhending á næstu 2 klst. en ekki tínt ---------- */
exports.otint = onSchedule({ schedule: "*/30 7-20 * * *", timeZone: TZ }, async () => {
  const n = nowTZ(), L = (await loadCol("pantanir")).filter(P => ["Ný", "Staðfest"].includes(P.stada) && d10(P.fra) === n.iso && /^\d{1,2}:\d{2}/.test(P.afhKl || ""));
  for (const P of L) {
    const [h, m] = String(P.afhKl).split(":").map(Number), til = h * 60 + m - n.min;
    const tint = Object.values(P.tinslaH || {}).some(x => +x > 0) || (P.kvittun && P.kvittun.ut);
    if (til < 0 || til > 120 || tint || !(await once("tinsla-" + P.id + "-" + n.iso))) continue;
    await send(await allEmails(), "tinsla", { title: `Afhending kl. ${P.afhKl} – ekki pakkað`, body: [nmP(P), who(P), P.afhending === "sent" ? "send" + (P.afhStadur ? " á " + P.afhStadur : "") : P.afhending === "sott" ? "sótt" : ""].filter(Boolean).join(" · "), link: link("pantanir", "tb:" + P.id), tag: "tinsla-" + P.id });
  }
});

/* ---------- 3. Tvíbókun búnaðar ---------- */
exports.tvibokun = onDocumentWritten("pantanir/{id}", async ev => {
  const b = ev.data.after.exists ? ev.data.after.data() : null, a = ev.data.before.exists ? ev.data.before.data() : null;
  if (!b || b.prufa || !b.fra || !["Ný", "Staðfest", "Afhent"].includes(b.stada)) return;
  const J = x => JSON.stringify(x || null); if (a && J(a.linur) === J(b.linur) && a.fra === b.fra && a.til === b.til && a.stada === b.stada) return;
  const [V, P, T] = await Promise.all([loadCol("vorur"), loadCol("pantanir"), loadCol("tilbod")]), VM = new Map(V.map(v => [String(v.id), v]));
  const tilOf = X => X.til && X.til >= X.fra ? d10(X.til) : d10(X.fra);
  const tharf = X => { const o = {}; (X.linur || []).forEach(l => { if (l.teg !== "leiga" || !l.v) return; const v = VM.get(String(l.v)); if (!v) return; const m = +l.magn || 0;
    if (v.tegund === "pakki") (v.innihald || []).forEach(i => { if (i.v) o[i.v] = (o[i.v] || 0) + m * (+i.m || 1); }); else if (v.tegund !== "vinna") o[v.id] = (o[v.id] || 0) + m; }); return o; };
  const blokk = [...P.filter(x => ["Ný", "Staðfest", "Afhent"].includes(x.stada)), ...T.filter(x => x.stada === "Samþykkt" && !P.some(p => p.tilbodId === x.id))].filter(x => x.fra && String(x.id) !== String(b.id || ev.params.id));
  const fra = d10(b.fra), til = tilOf(b), need = tharf(b), out = [];
  for (const [vId, m] of Object.entries(need)) {
    const v = VM.get(String(vId)), fj = +(v && v.fjoldi) || 0; if (!v || !fj) continue;
    const bs = blokk.filter(x => d10(x.fra) <= til && tilOf(x) >= fra).map(x => ({ x, m: tharf(x)[vId] || 0 })).filter(y => y.m > 0); if (!bs.length) continue;
    let max = 0; for (let d = fra; d <= til; d = addDays(d, 1)) { const s = bs.reduce((acc, y) => acc + (d10(y.x.fra) <= d && tilOf(y.x) >= d ? y.m : 0), 0); if (s > max) max = s; }
    if (m + max > fj) out.push({ v, m, laus: Math.max(0, fj - max), docs: bs.map(y => y.x.nr).filter(Boolean) });
  }
  if (!out.length) return;
  const key = "tvib-" + (b.id || ev.params.id) + "-" + fra + "-" + til + "-" + out.map(o => o.v.id + "x" + o.m).join(".");
  if (!(await once(key))) return;
  const o = out[0];
  await send(await allEmails(), "tvibokun", { title: `Tvíbókun: ${nmP(b)}`, body: `${o.v.heiti}: ${o.m} þarf, ${o.laus} laus ${dIS(fra)}${til !== fra ? "–" + dIS(til) : ""}` + (o.docs.length ? ` (frátekið í ${[...new Set(o.docs)].slice(0, 3).join(", ")})` : "") + (out.length > 1 ? ` · +${out.length - 1} vörur` : ""), link: link("pantanir", "tb:" + (b.id || ev.params.id)), tag: "tvib-" + (b.id || ev.params.id) });
});

/* ---------- 5. Stimpilklukka enn í gangi ---------- */
exports.klukkaIGangi = onSchedule({ schedule: "0 19,22 * * *", timeZone: TZ }, async () => {
  const s = await db.collection("klukka").get(), n = nowTZ();
  for (const d of s.docs) { const k = d.data() || {}; if (!k.start) continue; const st = new Date(k.start); const h = (Date.now() - st) / 36e5; if (h < 1) continue;
    if (!(await once("klukka-" + d.id + "-" + k.start + "-" + n.min))) continue;
    let pn = ""; if (k.pid) { try { const p = await db.doc("verkefni/" + k.pid).get(); if (p.exists) pn = [p.data().nr, p.data().stutt || p.data().nafn].filter(Boolean).join(" "); } catch (e) {} }
    const hm = new Intl.DateTimeFormat("is-IS", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(st);
    await send([d.id], "klukka", { title: "Klukkan er enn í gangi", body: `Byrjaðir kl. ${hm}${pn ? " á " + pn : ""} – ${Math.floor(h)} klst. ${Math.round((h % 1) * 60)} mín.`, link: link("timar"), tag: "klukka" });
  }
});

/* ---------- 6. Úthlutun á verkefni ---------- */
exports.uthlutun = onDocumentWritten("verkefni/{id}", async ev => {
  const b = ev.data.after.exists ? ev.data.after.data() : null, a = ev.data.before.exists ? ev.data.before.data() : null; if (!b || b.prufa) return;
  const was = new Set(((a && a.starfsmenn) || []).map(lc)), nyir = (b.starfsmenn || []).filter(x => !was.has(lc(x))); if (!nyir.length) return;
  const af = lc(b.breytt_af || b.stofnad_af || ""), to = (await skEmails(nyir)).filter(e => e !== af);
  await send(to, "uthlutun", { title: "Þú ert komin(n) á verkefni", body: [[b.nr, b.stutt || b.nafn].filter(Boolean).join(" "), b.vidskiptavinur].filter(Boolean).join(" · "), link: link("verk", "verk:" + (b.id || ev.params.id)), tag: "uth-" + ev.params.id });
});

/* ---------- 7. Tímar á verkefni ná 90 % / 100 % af áætlun ---------- */
exports.aaetlun = onDocumentWritten("timar/{id}", async ev => {
  const b = ev.data.after.exists ? ev.data.after.data() : null, a = ev.data.before.exists ? ev.data.before.data() : null;
  const pid = (b && b.verkefniId) || (a && a.verkefniId); if (!pid || (b && a && +b.timar === +a.timar && b.verkefniId === a.verkefniId)) return;
  const ps = await db.doc("verkefni/" + pid).get(); if (!ps.exists) return; const p = ps.data(), ak = +p.aklst || 0; if (!ak) return;
  const q = await db.collection("timar").where("verkefniId", "==", pid).get(), sum = q.docs.reduce((s, d) => s + (+d.data().timar || 0), 0);
  const prev = sum - (b && b.verkefniId === pid ? +b.timar || 0 : 0) + (a && a.verkefniId === pid ? +a.timar || 0 : 0);
  for (const [pct, txt] of [[1, "komið yfir áætlun"], [0.9, "komið í 90 % af áætlun"]]) {
    if (!(prev < pct * ak && sum >= pct * ak)) continue; if (!(await once("aaetl-" + pid + "-" + pct))) break;
    let to = await skEmails(p.starfsmenn || []); if (!to.length) to = (await activeUsers()).filter(u => /admin/i.test(u.hlutverk)).map(u => u.email);
    const nm = [p.nr, p.stutt || p.nafn].filter(Boolean).join(" ");
    await send(to, "aaetlun", { title: `${nm} ${txt}`, body: `${String(Math.round(sum * 10) / 10).replace(".", ",")} af ${String(ak).replace(".", ",")} klst. (${Math.round(sum / ak * 100)} %)` + (pct < 1 ? " – skráðu aukaverk ef verkið stækkar" : ""), link: link("verk", "verk:" + pid), tag: "aaetl-" + pid });
    break;
  }
});

/* ---------- 8. Tilboð ósvarað í 7 daga ---------- */
exports.eftirfylgni = onSchedule({ schedule: "0 9 * * 1-5", timeZone: TZ }, async () => {
  const t = nowTZ().iso, L = (await loadCol("tilbod")).filter(T => T.stada === "Sent" && d10(T.sent || T.dags) && d10(T.sent || T.dags) <= addDays(t, -7) && !T.bidur);
  const all = await allEmails();
  for (const T of L) { if (!(await once("eftirf-" + T.id))) continue;
    const to = await mennOf(T);
    await send(to, "eftirfylgni", { title: "Tilboð ósvarað í viku", body: [[T.nr, T.heiti].filter(Boolean).join(" "), T.vidskiptavinur || T.tengilidur].filter(Boolean).join(" · ") + ` – sent ${dIS(d10(T.sent || T.dags))}`, link: link("tilbod", "tb:" + T.id), tag: "ef-" + T.id }); }
});

/* ---------- 9. Staðfestingartengill sendur sjálfkrafa (2.74.0) ----------
   Ný pöntun með netfangi fær pöntunarsíðu (opinber/{t}) strax í appinu. Ef enginn starfsmaður hefur sent tengilinn
   (pantanir.tengillSendur) innan frestsins (Stillingar › Pantanir › Staðfestingartengill, sjálfgefið 2 klst., en í síðasta lagi 12 klst. fyrir afhendingu) sendir þetta
   fall hann úr sameiginlega pósthólfinu (POSTHOLF) og skráir tengillSendur = { dags, af: "sjálfvirkt", til }.
   Krefst forritaheimildarinnar Mail.Send (Application, admin consent) í Entra-forritinu „Atrium“. Aðeins pantanir 0–72 klst. gamlar. */
const PUBBASE = "https://atrium.aerastudio.is/pontun/";
// Afhendingartími pöntunar í ms (dagsetning + afhKl, annars kl. 08:00 að íslenskum tíma = UTC)
const afhMs = P => { const d = d10(P.fra); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return 0; const k = /^(\d{1,2}):(\d{2})/.exec(P.afhKl || "") || [0, "08", "00"]; return Date.parse(`${d}T${String(k[1]).padStart(2, "0")}:${k[2]}:00Z`); };
const escH = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
exports.tengillSjalfvirkt = onSchedule({ schedule: "*/15 * * * *", timeZone: TZ, secrets: [MS_SECRET] }, async () => {
  const st = await db.doc("app/state").get(), cfg = (((st.exists && st.data().stillingar) || {}).pantanir || {}).tengill || {};
  if (cfg.on === false || !POSTHOLF.value()) return; const klst = +cfg.klst > 0 ? +cfg.klst : 2, now = Date.now();
  const L = (await loadCol("pantanir")).filter(P => P.stada === "Ný" && P.opinber && !P.tengillSendur && !P.vidskStadfest);
  if (!L.length) return; const V = new Map((await loadCol("vidskiptavinir")).map(c => [String(c.id), c]));
  for (const P of L) {
    // Sendist þegar fresturinn frá stofnun er liðinn – en í síðasta lagi `fyrir` klst. (sjálfgefið 12) fyrir afhendingu
    const t0 = Date.parse(P.stofnad_t || P.dags || ""); if (!(t0 > 0)) continue;
    const afh = afhMs(P), fyrir = +cfg.fyrir > 0 ? +cfg.fyrir : 12, when = Math.min(t0 + klst * 36e5, afh ? afh - fyrir * 36e5 : Infinity);
    if (now < when || (afh && now > afh) || (!afh && now - t0 > 72 * 36e5)) continue;
    const to = P.netfang || (V.get(String(P.vskId)) || {}).netfang; if (!to || !/@/.test(to)) continue;
    if (!(await once("tengill-" + P.id))) continue;
    const o = (await db.doc("opinber/" + P.opinber).get()).data() || {}, co = o.fyrirtaeki || {}, url = PUBBASE + "?o=" + encodeURIComponent(INST) + "&t=" + encodeURIComponent(P.opinber);
    const nafn = String(P.tengilidur || "").split(" ")[0], nm = [P.nr, P.heiti && P.heiti !== "Pöntun" ? P.heiti : ""].filter(Boolean).join(" – ");
    const html = `<p>Sæl/l${nafn ? " " + escH(nafn) : ""},</p><p>Takk fyrir pöntunina. Hér getur þú séð pöntun <b>${escH(nm)}</b> og staðfest hana:</p>
      <p><a href="${escH(url)}" style="display:inline-block;padding:12px 20px;background:#24578A;color:#fff;border-radius:9px;text-decoration:none">Skoða og staðfesta pöntun</a></p>
      <p style="color:#6B7684;font-size:13px">${escH(url)}</p><p>Kveðja,<br>${escH(co.nafn || "")}${co.simi ? "<br>" + escH(co.simi) : ""}</p>`;
    try {
      await graph(`/users/${encodeURIComponent(POSTHOLF.value())}/sendMail`, { method: "POST", body: { message: { subject: `Pöntun ${nm} – vinsamlegast staðfestu`, body: { contentType: "HTML", content: html }, toRecipients: [{ emailAddress: { address: to } }] }, saveToSentItems: true } });
      await db.doc("pantanir/" + P.id).update({ tengillSendur: { dags: new Date().toISOString(), af: "sjálfvirkt", til: to } });
      logger.info("tengill sendur", { p: P.nr, to });
    } catch (e) { logger.warn("tengill tókst ekki", { p: P.nr, e: String(e.message || e) }); await db.doc("kerfi/tilksent").update({ ["tengill-" + P.id]: admin.firestore.FieldValue.delete() }).catch(() => {}); }
  }
});


/* ---------- 10. Staðfestingarpóstur pöntunar af netþjóni (2.75.0) ----------
   Þegar pöntun verður „Staðfest“ (viðskiptavinur staðfesti á pöntunarsíðu, pöntun stofnuð úr samþykktu tilboði eða
   starfsmaður staðfesti) og staðfestingarpóstur hefur ekki farið (pantanir.stadfPostur / opinber.postur), sendir netþjónninn
   hann úr sameiginlega pósthólfinu: dagsetningar, afhending, línur, samtals með VSK og tengill á pöntunarsíðuna.
   Appið sendir sama póst (með PDF) ef einhver með Microsoft-tengingu er við – sá sem fyrstur nær opinber.postur sendir. */
const kr = n => Math.round(+n || 0).toLocaleString("de-DE") + " kr.";
// 2.87.0: staðgreiðsla – greiða fyrir afhendingu (posi eða millifærsla með kvittun sem svar við póstinum; ekki reiðufé)
async function greidsluHTML(P, sam) {
  try {
    let h = P.greidsluhattur; if (!h) { if (!P.vskId) h = "stadgreitt"; else { const c = (await db.doc("vidskiptavinir/" + P.vskId).get()).data() || {}; h = c.greidsla || "reikningur"; } }
    if (h !== "stadgreitt" || P.greitt) return "";
    const st = await db.doc("app/state").get(), R = (((st.exists && st.data().stillingar) || {}).reikn) || {}, t = sam && sam.tot;
    return `<div style="margin:14px 0;padding:12px 14px;border:1px solid #E3E7EB;border-left:3px solid #24578A;border-radius:8px;background:#F5F8FB">
      <p style="margin:0 0 6px"><b>Greiða þarf pöntunina fyrir afhendingu${t ? " – samtals " + kr(t) + " með VSK" : ""}.</b></p><p style="margin:0 0 4px">Hægt er að greiða:</p>
      <ul style="margin:0 0 6px;padding-left:18px"><li>með korti í posa við afhendingu, eða</li><li>með millifærslu${R.banki ? " á reikning <b>" + escH(R.banki) + "</b>" + (R.kt ? ", kt. " + escH(R.kt) : "") : ""} – svaraðu þá þessum pósti með kvittun fyrir greiðslunni.</li></ul>
      <p style="margin:0;color:#6B7684">Ekki er tekið við reiðufé.</p></div>`;
  } catch (e) { return ""; }
}
exports.pontunStadfestPostur = onDocumentWritten({ document: "pantanir/{id}", secrets: [MS_SECRET] }, async ev => {
  const b = ev.data.after.exists ? ev.data.after.data() : null, a = ev.data.before.exists ? ev.data.before.data() : null;
  if (!b || b.prufa || b.stada !== "Staðfest" || (a && a.stada === "Staðfest") || b.stadfPostur || !POSTHOLF.value()) return;
  await new Promise(r => setTimeout(r, 20000));   // gefa appinu tíma til að búa til pöntunarsíðuna og senda sjálft (með PDF)
  const ref = db.doc("pantanir/" + ev.params.id), P = (await ref.get()).data(); if (!P || P.stadfPostur || P.stada !== "Staðfest") return;
  let to = P.netfang; if (!to && P.vskId) { try { to = ((await db.doc("vidskiptavinir/" + P.vskId).get()).data() || {}).netfang; } catch (e) {} } if (!to || !/@/.test(to)) return;
  const mark = { af: "sjálfvirkt", dags: new Date().toISOString(), til: to };
  let o = {};
  if (P.opinber) { const won = await db.runTransaction(async tx => { const r = db.doc("opinber/" + P.opinber), s = await tx.get(r); if (!s.exists) return true; o = s.data() || {}; if (o.postur) return false; tx.update(r, { postur: mark }); return true; }); if (!won) return; }
  if (!(await once("stadfp-" + ev.params.id))) return;
  const co = o.fyrirtaeki || {}, url = P.opinber ? PUBBASE + "?o=" + encodeURIComponent(INST) + "&t=" + encodeURIComponent(P.opinber) : "", st = P.vidskStadfest || o.stadfest || null;
  const nm = [P.nr, P.heiti && P.heiti !== "Pöntun" ? P.heiti : ""].filter(Boolean).join(" – "), nafn = String((st && st.nafn) || P.tengilidur || "").split(" ")[0];
  const afh = P.afhending === "sent" ? "Sent" + (P.afhStadur ? " á " + escH(P.afhStadur) : "") : P.afhending === "sott" ? "Sótt" : "";
  const L = o.linur || P.linur || [], sam = o.samtals || null;
  const rows = L.map(l => `<tr><td style="padding:6px 0;border-bottom:1px solid #E3E7EB">${escH(l.heiti || "")}</td><td style="padding:6px 0;border-bottom:1px solid #E3E7EB;text-align:right">${escH(l.magn ?? "")}${l.ein && l.ein !== "stk." ? " " + escH(l.ein) : ""}</td></tr>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0F1720;max-width:560px">
    <p>Sæl/l${nafn ? " " + escH(nafn) : ""},</p><p>Takk fyrir – pöntun <b>${escH(nm)}</b> er staðfest.</p>
    <p>Afhending: <b>${escH(dIS(d10(P.fra)))}${P.afhKl ? " kl. " + escH(P.afhKl) : ""}</b>${P.til && d10(P.til) !== d10(P.fra) ? ` · Skil: <b>${escH(dIS(d10(P.til)))}</b>` : ""}${afh ? " · " + afh : ""}</p>
    ${rows ? `<table style="width:100%;border-collapse:collapse;margin:8px 0 4px">${rows}</table>` : ""}${sam && sam.tot ? `<p style="text-align:right"><b>Samtals með VSK ${kr(sam.tot)}</b></p>` : ""}
    ${st && st.ur ? `<p style="color:#6B7684">Samþykkt af ${escH(st.nafn || "")} með ${escH(st.ur)}.</p>` : ""}
    ${url ? `<p><a href="${escH(url)}" style="display:inline-block;padding:12px 20px;background:#24578A;color:#fff;border-radius:9px;text-decoration:none">Skoða pöntunina</a></p>` : ""}
    ${await greidsluHTML(P, sam)}
    <p>Kveðja,<br>${escH(co.nafn || "")}${co.simi ? "<br>" + escH(co.simi) : ""}</p></div>`;
  try {
    await graph(`/users/${encodeURIComponent(POSTHOLF.value())}/sendMail`, { method: "POST", body: { message: { subject: `Staðfesting á pöntun ${nm}`, body: { contentType: "HTML", content: html }, toRecipients: [{ emailAddress: { address: to } }] }, saveToSentItems: true } });
    await ref.update({ stadfPostur: mark }); logger.info("staðfestingarpóstur", { p: P.nr, to });
    // 2.87.0: þráður staðfestingarpóstsins á pöntunina – svar viðskiptavinar (t.d. kvittun fyrir millifærslu) sést á pöntuninni
    if (!P.postConv) { try { await new Promise(r => setTimeout(r, 3000)); const j = await graph(`/users/${encodeURIComponent(POSTHOLF.value())}/mailFolders/sentitems/messages?$top=10&$orderby=sentDateTime%20desc&$select=subject,conversationId`);
      const c = ((j && j.value) || []).find(x => x.subject === `Staðfesting á pöntun ${nm}`); if (c && c.conversationId) await ref.update({ postConv: c.conversationId, postBox: "/users/" + encodeURIComponent(POSTHOLF.value()) }); } catch (e) { logger.warn("þráður staðfestingarpósts", String(e.message || e)); } }
  } catch (e) {
    logger.warn("staðfestingarpóstur tókst ekki", { p: P.nr, e: String(e.message || e) });
    if (P.opinber) await db.doc("opinber/" + P.opinber).update({ postur: null }).catch(() => {});
    await db.doc("kerfi/tilksent").update({ ["stadfp-" + ev.params.id]: admin.firestore.FieldValue.delete() }).catch(() => {});
  }
});

/* ---------- Bókhald: DK (dkPlus) – 2.92.0 ----------
   Virkt aðeins í uppsetningu með BOKHALD=dk í .env.<verkefni> (t.d. Sonik). Aðgangslykill úr dkPlus í Secret Manager:
     firebase functions:secrets:set DK_TOKEN --project sonik
   Flæði: appið setur reikningar/{id}.bokhald = { kerfi:"dk", stada:"bidur" } („Senda í DK“) →
     1) viðskiptavinur fundinn í DK eftir kennitölu (GET /Customer/{kt}), annars stofnaður (POST /Customer/)
     2) athugað hvort reikningurinn sé þegar til (GET /Sales/Invoice/reference/ATR-<nr>) – endurtekning býr ekki til tvo
     3) sölureikningur stofnaður (POST /Sales/Invoice/) – línur með ItemCode = vörunúmer flokksins (stillingar.reikn.flokkar), verð án VSK
     4) valfrjálst: DK sendir reikninginn á netfang greiðanda (POST /Sales/Invoice/{nr}/email)
     5) bokhald = { stada:"sent", nr, dags } og bokhaldNr – eða { stada:"villa", villa }
   Snið dkPlus API (api.dkplus.is/api/v1, „Authorization: bearer <lykill>“) eftir opnum tengli fyrir DK (aldavigdis/connector-for-dk).
   ATH: staðfesta þarf reitaheiti og hegðun gegn dkPlus (Swagger) með prufuaðgangi Sonik áður en þetta er notað á raunveruleg gögn. */
if (process.env.BOKHALD === "dk") {
  const DK_TOKEN = defineSecret("DK_TOKEN");
  const DK_URL = "https://api.dkplus.is/api/v1";
  const dk = async (method, path, body) => {
    const r = await fetch(DK_URL + path, { method, headers: { Authorization: "bearer " + DK_TOKEN.value(), Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
    return { ok: r.ok, status: r.status, data: j, text: t };
  };
  const kt10 = k => String(k || "").replace(/\D/g, "");
  const txt = (s, n) => String(s || "").slice(0, n);
  exports.bokhaldDk = onDocumentWritten({ document: "reikningar/{id}", secrets: [DK_TOKEN], timeoutSeconds: 120 }, async ev => {
    const a = ev.data?.after?.exists ? ev.data.after.data() : null, b = ev.data?.before?.exists ? ev.data.before.data() : null;
    if (!a || a.bokhald?.stada !== "bidur" || (b?.bokhald?.stada === "bidur" && b.bokhald.beidni === a.bokhald.beidni)) return;
    const ref = ev.data.after.ref, R = a, done = x => ref.update(x);
    try {
      const st = (await db.doc("app/state").get()).data() || {}, rk = st.stillingar?.reikn || {}, D = rk.dk || {}, FL = rk.flokkar || {};
      const kaup = R.kaupandi || {}, kt = kt10(kaup.kennitala), stadg = !!R.stadgreitt;
      let custNr = kt.length === 10 ? kt : (stadg ? String(D.stadgKt || "") : "");
      if (!custNr) throw new Error("Kennitölu greiðanda vantar (og enginn staðgreiðsluviðskiptavinur er stilltur).");
      // 1) Viðskiptavinur
      if (custNr === kt) {
        const g = await dk("GET", "/Customer/" + encodeURIComponent(custNr));
        if (!g.ok) {
          if (g.status !== 404) throw new Error("DK svaraði " + g.status + " við leit að viðskiptavini: " + txt(g.text, 200));
          const c = { Number: custNr, Name: txt(kaup.name, 80), Address1: txt(kaup.heimilisfang, 60), City: txt(kaup.stadur, 40), ZipCode: txt(kaup.postnumer, 10), Email: txt(kaup.netfang, 80),
            ...(D.solumadur ? { SalesPerson: String(D.solumadur) } : {}), ...(D.mati ? { PaymentMode: String(D.mati) } : {}), ...(D.skilmali ? { PaymentTerm: String(D.skilmali) } : {}), ...(D.lykill ? { LedgerCode: String(D.lykill) } : {}) };
          const p = await dk("POST", "/Customer/", c); if (!p.ok) throw new Error("Tókst ekki að stofna viðskiptavin í DK (" + p.status + "): " + txt(p.data?.Message || p.text, 200));
        }
      }
      // 2) Þegar til? (endurtekin sending)
      const reference = "ATR-" + R.nr, ex = await dk("GET", "/Sales/Invoice/reference/" + encodeURIComponent(reference));
      let nr = ex.ok && ex.data ? (ex.data.Number || (Array.isArray(ex.data) && ex.data[0]?.Number)) : null;
      // 3) Sölureikningur
      if (!nr) {
        const lines = (R.linur || []).filter(l => !l.haus && Math.round((+l.magn || 0) * (+l.verd || 0)) !== 0).map(l => {
          const code = l.lykill || FL[l.flokkur]?.lykill; if (!code) throw new Error("Vörunúmer í DK vantar fyrir línu: " + l.lysing);
          return { ItemCode: String(code), Text: txt(l.lysing, 80), ...(String(l.lysing || "").length > 80 ? { Text2: txt(String(l.lysing).slice(80), 80) } : {}), Quantity: +l.magn || 0, Price: +l.verd || 0, IncludingVAT: false };
        });
        if (!lines.length) throw new Error("Engar línur til að senda.");
        const tilv = [...(R.pontunIds || []).length ? ["Pöntun"] : [], ...(R.verkefniIds || []).length ? ["Verkefni"] : []].join("/");
        const body = { Reference: reference, Customer: { Number: custNr }, Lines: lines, Text2: txt(`Atrium drög ${R.nr}${tilv ? " · " + tilv : ""}`, 80),
          ...(D.solumadur ? { SalesPerson: String(D.solumadur) } : {}),
          ...(stadg ? { ...(D.stadgMati ? { Mode: String(D.stadgMati) } : {}), ...(D.grId ? { Payments: [{ ID: String(D.grId), Name: String(D.grNafn || ""), Amount: +R.tot || 0 }] } : {}) }
                    : { ...(D.mati ? { Mode: String(D.mati) } : {}), ...(D.skilmali ? { Term: String(D.skilmali) } : {}) }) };
        const p = await dk("POST", "/Sales/Invoice/", body);
        if (!p.ok) throw new Error("DK hafnaði reikningnum (" + p.status + "): " + txt(p.data?.Message || p.text, 300));
        nr = p.data?.Number; if (!nr) throw new Error("DK skilaði ekki reikningsnúmeri.");
      }
      // 4) Tölvupóstur úr DK
      let post = false;
      if (D.post && kaup.netfang) { const m = await dk("POST", "/Sales/Invoice/" + encodeURIComponent(nr) + "/email", { To: kaup.netfang, Subject: `Reikningur ${nr}` }); post = m.ok; if (!m.ok) logger.warn("dk email", m.status, txt(m.text, 200)); }
      await done({ bokhald: { ...a.bokhald, kerfi: "dk", stada: "sent", nr: String(nr), dags: new Date().toISOString(), post }, bokhaldNr: String(nr), bokhaldDags: new Date().toISOString().slice(0, 10) });
      logger.info("bokhaldDk sent", { id: ev.params.id, nr });
    } catch (e) {
      logger.error("bokhaldDk", e);
      await done({ bokhald: { ...a.bokhald, kerfi: "dk", stada: "villa", villa: String(e.message || e).slice(0, 400), dags: new Date().toISOString() } });
    }
  });
}
