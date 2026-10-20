// Tenging appsins við Firebase: innskráning (eingöngu Microsoft-aðgangar fyrirtækisins, frá 1.6.1) og gagnagrunnur (Firestore).
// Appið sjálft (index.html) veit ekkert um Firebase; það fær hlut `db` með get/set/tx/watch og `db.user` (innskráður notandi).
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, OAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence }
  from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, getDocFromServer, setDoc, onSnapshot, runTransaction, collection, query, where, writeBatch }
  from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { firebaseConfig, MS_TENANT, MS_DOMAIN, ADMIN, LEGACY_EMAILS } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Innskráning helst þótt appinu sé lokað (frá 1.7.0) – notandinn skráir sig út með „Skrá út“ eða er gerður óvirkur af admin.
const persistReady = setPersistence(auth, browserLocalPersistence).catch(e => console.warn("setPersistence", e));
// Staðbundið afrit í símanum/tölvunni: appið virkar án nets og samstillir þegar netið kemur aftur.
const fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }), ignoreUndefinedProperties: true });

const ref = path => doc(fs, ...path.split("/"));
const login = document.getElementById("login");
const loginMsg = document.getElementById("login-msg");
const showLogin = (msg = "") => { login.hidden = false; loginMsg.textContent = msg; };
const lc = s => String(s || "").trim().toLowerCase();

async function signIn(provider) {
  loginMsg.textContent = "";
  await persistReady;
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    // Sumir símar leyfa ekki sprettiglugga – þá er farið á innskráningarsíðuna í staðinn.
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(e.code)) {
      try { await signInWithRedirect(auth, provider); } catch (e2) { showLogin("Innskráning tókst ekki: " + (e2.code || e2.message)); }
    } else if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
      showLogin("Innskráning tókst ekki: " + (e.code || e.message));
    }
  }
}
document.getElementById("login-ms").addEventListener("click", () => {
  const p = new OAuthProvider("microsoft.com");
  // select_account: Microsoft spyr um aðgang en notar innskráningu sem er þegar til staðar í vafranum (MFA samkvæmt reglum Entra).
  p.setCustomParameters({ tenant: MS_TENANT, prompt: "select_account", domain_hint: MS_DOMAIN });
  signIn(p);
});
getRedirectResult(auth).catch(e => showLogin("Innskráning tókst ekki: " + (e.code || e.message)));

window.aeraSignOut = () => signOut(auth).then(() => location.reload());

// Les notendaskrána (app/notendur). Skilar null ef aðgangur fæst ekki.
async function readUsers() {
  try { const s = await getDocFromServer(ref("app/notendur")); return { ok: true, exists: s.exists(), data: s.exists() ? s.data() : null }; }
  catch (e) {
    if (e.code === "permission-denied") return { ok: false, denied: true };
    try { const s = await getDoc(ref("app/notendur")); return { ok: true, exists: s.exists(), data: s.exists() ? s.data() : null, cached: true }; }
    catch (e2) { return { ok: false, error: e2 }; }
  }
}

let started = false;
onAuthStateChanged(auth, async user => {
  if (!user) { showLogin(); return; }
  const prov = user.providerData?.[0]?.providerId || "";
  const email = lc(user.email || user.providerData?.[0]?.email);
  const legacy = false; // Google-varaleiðin var lögð niður í 1.6.1
  const ms = prov === "microsoft.com" && email.endsWith("@" + MS_DOMAIN);
  const deny = async m => { await signOut(auth); showLogin(m); };
  if (!legacy && !ms) return deny(`${email || "Þessi aðgangur"} hefur ekki aðgang að appinu. Skráðu þig inn með Microsoft-aðgangi @${MS_DOMAIN}.`);

  let r = await readUsers();
  // Fyrsta skipti (ný uppsetning): notendaskráin er ekki til – fyrsti admin (fyrirtaeki.js) stofnar hana við fyrstu innskráningu.
  // Reglurnar leyfa það aðeins því netfangi og aðeins ef skráin er ekki til.
  if (ms && email === lc(ADMIN.email) && ((r.ok && !r.exists) || r.denied)) {
    const now = new Date().toISOString();
    const data = { notendur: { [lc(ADMIN.email)]: { nafn: ADMIN.nafn, sk: ADMIN.sk, hlutverk: "admin", virkur: true, stofnad: now, breytt: now } }, uppfaert: now };
    try { await setDoc(ref("app/notendur"), data); r = { ok: true, exists: true, data }; } catch (e) { console.warn("Gat ekki stofnað notendaskrá", e); }
  }
  if (!r.ok && !legacy) {
    return deny(r.denied ? `${email} hefur ekki aðgang að appinu. Biddu admin um að bæta þér við í Stillingum › Notendur.` : "Gat ekki athugað aðgang (ekkert net?). Reyndu aftur.");
  }
  const users = r.data?.notendur || {};
  let me = users[email];
  if (ms && !(me && me.virkur)) return deny(me ? `Aðgangur ${email} hefur verið gerður óvirkur.` : `${email} hefur ekki aðgang að appinu. Biddu admin um að bæta þér við í Stillingum › Notendur.`);
  if (legacy) me = { ...(users[lc(ADMIN.email)] || { nafn: ADMIN.nafn, sk: ADMIN.sk }), hlutverk: "admin", virkur: true, varaleid: true };

  login.hidden = true;
  if (started) return; started = true;
  const U = { email, nafn: me.nafn || user.displayName || email, sk: me.sk || "", hlutverk: me.hlutverk || "starfsmadur", varaleid: !!me.varaleid, provider: prov };

  // Skrá síðustu innskráningu (hljóðlaust; mistekst ef reglur leyfa ekki).
  if (ms) runTransaction(fs, async t => {
    const s = await t.get(ref("app/notendur")); if (!s.exists()) return;
    const d = s.data(); if (!d.notendur?.[email]) return;
    d.notendur[email].sidast = new Date().toISOString(); t.set(ref("app/notendur"), d);
  }).catch(() => {});

  window.aeraStart({
    email, user: U,
    async get(path) { const s = await getDoc(ref(path)); return { exists: s.exists(), data: () => s.data() }; },
    // Ekki beðið eftir svari netþjóns: skrifin geymast staðbundið strax og fara upp þegar netið er til staðar.
    set(path, data) { return setDoc(ref(path), data); },
    // Breyting á nýjustu útgáfu skjalsins á netþjóni – svo breytingar tveggja notenda á sama tíma skrifi ekki yfir hvor aðra.
    tx(path, fn) {
      return runTransaction(fs, async t => {
        const s = await t.get(ref(path)); const out = fn(s.exists() ? s.data() : {});
        t.set(ref(path), out); return out;
      });
    },
    // Mörg skrif í einu (hópur): set eða delete á einstök skjöl. Skipt í búta (Firestore leyfir 500 í hóp); síðasta skrifið fer síðast.
    async commit(list) {
      for (let i = 0; i < list.length; i += 400) {
        const b = writeBatch(fs);
        for (const o of list.slice(i, i + 400)) o.del ? b.delete(ref(o.path)) : b.set(ref(o.path), o.data);
        await b.commit();
      }
    },
    // Fylgist með heilu safni (t.d. "verkefni"), mögulega síuðu: filter = [reitur, gildi, aðgerð?] (t.d. ["eigandi", netfang] eða ["adilar", netfang, "array-contains"]).
    watchCol(name, filter, cb, onErr) {
      const q = filter ? query(collection(fs, name), where(filter[0], filter[2] || "==", filter[1])) : collection(fs, name);
      return onSnapshot(q, { includeMetadataChanges: true },
        s => cb({ docs: s.docs.map(d => d.data()), pending: s.metadata.hasPendingWrites, fromCache: s.metadata.fromCache }), onErr);
    },
    watch(path, cb, onErr) {
      return onSnapshot(ref(path), { includeMetadataChanges: true },
        s => cb({ exists: s.exists(), data: () => s.data(), pending: s.metadata.hasPendingWrites, fromCache: s.metadata.fromCache }), onErr);
    }
  });
});

// Sjálfvirk uppfærsla: þegar appið er opnað aftur er athugað hvort ný útgáfa sé komin,
// og ef svo er endurhleðst appið sjálft (gerist þegar VERSION í sw.js er hækkað).
if ("serviceWorker" in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return; reloading = true; location.reload();
  });
  navigator.serviceWorker.register(new URL("sw.js", document.baseURI).href, { updateViaCache: "none" }).then(reg => {
    const check = () => reg.update().catch(() => {});
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    setInterval(check, 30 * 60 * 1000);
  }).catch(() => {});
}
