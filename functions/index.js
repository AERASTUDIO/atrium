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
  const af = lc(P.stofnadAf || P.af || P.eigandi || "");
  const us = (await activeUsers()).filter(u => u.email !== af).map(u => u.email);
  const upp = { postur: "úr pósti", shopify: "úr vefverslun", vefur: "af vefnum", tilbod: "úr tilboði" }[P.uppruni] || "";
  await send(us, "pantanir", { title: "Ný pöntun" + (upp ? " " + upp : ""), body: [nmP(P), who(P)].filter(Boolean).join(" · "), link: link("pantanir", "tb:" + (P.id || ev.params.id)), tag: "pn-" + ev.params.id });
});

/* ---------- Viðskiptavinur staðfestir pöntun eða samþykkir tilboð (pöntunarsíðan) ---------- */
exports.vidskStadfestir = onDocumentUpdated("opinber/{t}", async ev => {
  const a = ev.data.before.data() || {}, b = ev.data.after.data() || {};
  if (a.stadfest || !b.stadfest) return;
  if (b.teg === "aukaverk") return aukaverkSamthykkt(ev.params.t, b);
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

/* ---------- Aukaverk samþykkt af viðskiptavini (2.67.0) ----------
   Sama og aukApprove í verkplus.js: stada → Samþykkt, klst í áætlun, reikningshæf lína kostnadur/auk-<id>. Óháð því hvort appið er opið. */
async function aukaverkSamthykkt(t, b) {
  const q = await db.collection("verkefni").where("aukaverkT", "array-contains", t).limit(1).get(); if (q.empty) { logger.warn("aukaverk: verkefni fannst ekki", t); return; }
  const ref = q.docs[0].ref, s = b.stadfest || {}; let info = null;
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref), p = snap.data() || {}, list = (p.aukaverk || []).map(x => ({ ...x })), a = list.find(x => x.opinber === t);
    if (!a || a.stada === "Samþykkt") return;
    a.stada = "Samþykkt"; a.samthykkt = { nafn: s.nafn || "", dags: s.dags || new Date().toISOString(), athugasemd: s.athugasemd || null, hvernig: "tengill" };
    const upd = { aukaverk: list }; if (a.aetlun !== false && +a.klst > 0) upd.aklst = Math.round(((+p.aklst || 0) + +a.klst) * 10) / 10;
    tx.update(ref, upd);
    if (+a.upphaed > 0) { const kid = "auk-" + a.id, kref = db.doc("kostnadur/" + kid);
      tx.set(kref, { id: kid, date: new Date().toISOString().slice(0, 10), verkefniId: p.id || snap.id, undirverkId: null, lysing: "Aukaverk: " + a.lysing, upphaed: +a.upphaed, starfsmadur: a.af || "", kvittun: null, kvittunId: null, stofnad: new Date().toISOString(), aukaverk: a.id }, { merge: true }); }
    info = { p, a };
  });
  if (!info) return;
  const us = (await activeUsers()).map(u => u.email);
  await send(us, "stadfest", { title: "Aukaverk samþykkt", body: `${s.nafn || "Viðskiptavinur"} samþykkti aukaverk á ${[info.p.nr, info.p.stutt].filter(Boolean).join(" ")}: ${String(info.a.lysing).slice(0, 90)}` + (+info.a.upphaed ? ` · ${Math.round(info.a.upphaed).toLocaleString("de-DE")} kr.` : ""),
    link: link("verk", "verk:" + (info.p.id || q.docs[0].id)), tag: "auk-" + info.a.id });
}

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
    const m = await graph(`/users/${encodeURIComponent(sub.mailbox)}/messages/${encodeURIComponent(q.msg)}?$select=subject,from,isDraft,receivedDateTime,conversationId`);
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
      if (p) { um = [p.nr, p.stutt || p.nafn].filter(Boolean).join(" ");
        // Pósturinn ratar á verkefnið (2.67.0): þráðurinn tengist verkefninu sjálfkrafa ef hann er ekki þegar tengdur (thraedir)
        if (m.conversationId) { const ex = await db.collection("thraedir").where("conv", "==", m.conversationId).limit(1).get();
          if (ex.empty) { const id = crypto.randomBytes(8).toString("hex"), efni = String(m.subject || "").replace(/^\s*((re|fw|fwd|sv|aw|vs|tr|antw)\s*(\[\d+\])?\s*:\s*)+/i, "").trim() || "(ekkert efni)";
            await db.doc("thraedir/" + id).set({ id, conv: m.conversationId, verkefniId: p.id, efni, tengt: new Date().toISOString(), af: "Atrium (sjálfvirkt)", sjalfvirkt: true, postholf: sub.mailbox }); um += " · tengt"; } } }
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


/* ---------- Tímatillögur úr Microsoft 365 (2.67.0) ----------
   Á tveggja tíma fresti 08–20: fundir dagsins og gærdagsins í Outlook/Teams (calendarView) og vinna í skjölum í verkefnamöppum
   á SharePoint (drive delta frá síðustu keyrslu) → tillogur/{netfang}.dagar[ÁÁÁÁ-MM-DD] = [{ key, src, pid, fra, til, desc }].
   „Loka deginum“ (snjall.js) sýnir þær sem drög. Krefst forritaheimildanna Calendars.Read og Sites.Read.All (admin consent).
   Stillingar: SP_SITE (t.d. aerastudio.sharepoint.com:/sites/Atrium-Dev) og SP_VERKEFNI (t.d. Atrium/Verkefni) í functions/.env.<projectId>. */
const SP_SITE = defineString("SP_SITE", { default: "" });
const SP_VERKEFNI = defineString("SP_VERKEFNI", { default: "" });
const hhmm = iso => String(iso || "").slice(11, 16);
const dayOf = iso => String(iso || "").slice(0, 10);
const toMinS = s => { const [h, m] = String(s).split(":").map(Number); return h * 60 + m; };
const fromMinS = n => String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
async function projIndex() {
  const ps = (await db.collection("verkefni").get()).docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.prufa && p.stada !== "Lokið");
  const vs = (await db.collection("vidskiptavinir").get()).docs.map(d => ({ id: d.id, ...d.data() }));
  const byMail = {}; vs.forEach(c => { const e = lc(c.netfang); if (e) byMail[e] = c.id || c.id; });
  const find = (text, mails) => {
    const nr = (String(text || "").match(/\b(20\d\d-\d{2,3})\b/) || [])[1]; if (nr) { const p = ps.find(x => x.nr === nr); if (p) return p; }
    for (const m of mails || []) { const cid = byMail[lc(m)]; if (!cid) continue; const op = ps.filter(x => x.vskId === cid); if (op.length === 1) return op[0]; }
    const t = lc(text); const hit = ps.filter(x => { const n = lc(x.stutt || x.nafn); return n.length >= 4 && t.includes(n); }); return hit.length === 1 ? hit[0] : null;
  };
  return { ps, find };
}
async function calSuggestions(email, days, PI, dom) {
  const out = {};
  for (const d of days) {
    const r = await graph(`/users/${encodeURIComponent(email)}/calendarView?startDateTime=${d}T00:00:00Z&endDateTime=${d}T23:59:59Z&$select=id,subject,start,end,isAllDay,isCancelled,showAs,isOnlineMeeting,attendees&$top=60`, { headers: { Prefer: 'outlook.timezone="UTC"' } });
    (r.value || []).forEach(ev => {
      if (ev.isAllDay || ev.isCancelled || ev.showAs === "free") return;
      const a = hhmm(ev.start.dateTime), b = hhmm(ev.end.dateTime); if (!a || !b || dayOf(ev.start.dateTime) !== d || toMinS(b) <= toMinS(a) || toMinS(b) - toMinS(a) > 600) return;
      const mails = (ev.attendees || []).map(x => lc(x.emailAddress && x.emailAddress.address)).filter(x => x && !(dom && x.endsWith("@" + dom)));
      const p = PI.find(ev.subject, mails);
      (out[d] = out[d] || []).push({ key: "cal:" + crypto.createHash("sha1").update(ev.id).digest("hex").slice(0, 16), src: ev.isOnlineMeeting ? "Teams-fundur" : "Fundur í Outlook", pid: p ? p.id : "", fra: a, til: b, desc: ev.subject || "Fundur" });
    });
  }
  return out;
}
async function spChanges(PI, users) {
  // Breytingar á skjölum í verkefnamöppum síðan síðast (delta á rót safnsins; fyrsta keyrsla byrjar „núna“)
  const site = SP_SITE.value(), base = String(SP_VERKEFNI.value() || "").replace(/^\/|\/$/g, ""); if (!site || !base) return {};
  const kref = db.doc("kerfi/tillogur"), k = (await kref.get()).data() || {};
  let url = k.delta;
  if (!url) { const s = await graph(`/sites/${site}`), dr = await graph(`/sites/${s.id}/drive?$select=id`); url = `/drives/${dr.id}/root/delta?token=latest`; }
  const items = []; let guard = 0, last = null;
  while (url && guard++ < 50) { const r = await graph(url.replace("https://graph.microsoft.com/v1.0", "")); (r.value || []).forEach(x => items.push(x));
    if (r["@odata.nextLink"]) url = r["@odata.nextLink"]; else { last = r["@odata.deltaLink"] || null; url = null; } }
  if (last) await kref.set({ delta: last, uppfaert: new Date().toISOString() }, { merge: true });
  const res = {}; // email → day → pid → { min, max, files }
  const mark = "/root:/" + base + "/";
  items.forEach(x => {
    if (x.folder || x.deleted || !x.file || !x.parentReference) return;
    const path = decodeURIComponent(String(x.parentReference.path || "")), i = path.indexOf(mark); if (i < 0) return;
    const folder = path.slice(i + mark.length).split("/")[0]; if (!folder) return;
    const who = lc(x.lastModifiedBy && x.lastModifiedBy.user && x.lastModifiedBy.user.email); if (!who || !users.has(who)) return;
    const p = PI.ps.find(q => q.nr && (folder === q.nr || folder.startsWith(q.nr + " "))) || PI.ps.find(q => q.nafn === folder); if (!p) return;
    const t = x.lastModifiedDateTime, d = dayOf(t), m = toMinS(hhmm(t));
    const g = (((res[who] = res[who] || {})[d] = res[who][d] || {})[p.id] = res[who][d][p.id] || { min: m, max: m, files: new Set(), p });
    g.min = Math.min(g.min, m); g.max = Math.max(g.max, m); g.files.add(x.name);
  });
  return res;
}
async function makeSuggestions() {
  if (!MS_TENANT.value() || !MS_CLIENT_ID.value()) return;
  const villur = [], us = await activeUsers(), users = new Set(us.map(u => u.email)), PI = await projIndex();
  const now = new Date(), today = now.toISOString().slice(0, 10), y = new Date(now.getTime() - 864e5).toISOString().slice(0, 10), dom = lc((us[0] && us[0].email || "").split("@")[1]);
  let sp = {}; try { sp = await spChanges(PI, users); } catch (e) { villur.push("SharePoint: " + e.message); }
  for (const u of us) {
    let cal = {}; try { cal = await calSuggestions(u.email, [y, today], PI, dom); } catch (e) { villur.push(u.email + " dagatal: " + e.message); continue; }
    const ref = db.doc("tillogur/" + u.email), cur = ((await ref.get()).data() || {}).dagar || {}, dagar = {};
    [y, today].forEach(d => {
      const keep = (cur[d] || []).filter(x => String(x.key || "").startsWith("sp:"));   // dagatal endurreiknað í hvert sinn, skjalavinna safnast upp
      const spd = (sp[u.email] || {})[d] || {};
      Object.entries(spd).forEach(([pid, g]) => { const key = "sp:" + pid, old = keep.find(x => x.key === key);
        const a = Math.min(g.min - 15, old ? toMinS(old.fra) : 1e9), b = Math.max(g.max, old ? toMinS(old.til) : 0, a + 30), files = [...new Set([...(old ? old.files || [] : []), ...g.files])].slice(0, 8);
        const it = { key, src: "SharePoint", pid, fra: fromMinS(Math.max(0, a)), til: fromMinS(Math.min(1439, b)), files, desc: `Vinna í skjölum: ${files.slice(0, 3).join(", ")}${files.length > 3 ? " o.fl." : ""}` };
        if (old) Object.assign(old, it); else keep.push(it); });
      dagar[d] = [...(cal[d] || []), ...keep].sort((a, b) => a.fra.localeCompare(b.fra));
    });
    await ref.set({ dagar, uppfaert: new Date().toISOString() });
  }
  await db.doc("kerfi/tillogur").set({ villur, keyrt: new Date().toISOString() }, { merge: true });
  logger.info("tímatillögur", { notendur: us.length, villur: villur.length });
}
exports.timatillogur = onSchedule({ schedule: "0 8-20/2 * * *", timeZone: TZ, secrets: [MS_SECRET], timeoutSeconds: 300 }, async () => { await makeSuggestions(); });
