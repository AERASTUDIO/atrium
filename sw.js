// Þjónustuskrifta (service worker): geymir appið á tækinu svo það opnist hratt og virki án nets.
// Hækkaðu VERSION þegar eitthvað breytist, þá sækja tækin nýju útgáfuna.
const VERSION = "atrium-2.102.1"; // sama og APP_VERSION í app.html
const SHELL = ["./", "index.html", "app.css", "app-grunnur.js", "app-listar.js", "app-skyrslur.js", "app-sidur.js", "app-stillingar.js", "app-form.js", "app-breyta.js", "firebase.js", "firebase-config.js", "xlsx.js", "skjalagerd.js", "icons/doc-logo.png", "ms.js", "ms-app.js", "fundabod.js", "rlinur.js", "vettvangur.js", "vett-ui.js", "velja.js", "folk.js", "askrift.js", "verdskra.js", "reikn.js", "sala.js", "bunadarlisti.js", "prufugogn.js", "deildir.js", "heim2.js", "skjol.js", "postur.js", "spjall.js", "heim.js", "skjalasafn.js", "adgangur.js", "notendur.js", "vista.js", "personuvernd.js", "utlit-i.js", "ui1-skjair.js", "gogn.js", "kjarni.js", "demo.js", "qr.js", "qr.css", "simi.js", "snjall.js", "pantanir2.js", "lif.js", "tilkynningar.js", "verkplus.js", "simi.css", "simi-ui1.css", "kerfi.css", "fagun.css", "fagun.js", "dagval.js", "fjolval.js", "snidmat.js", "stadur.js", "lib/jsqr.js",
  "aera/index.html", "aera/fyrirtaeki.js", "aera/manifest.webmanifest", "sonik/index.html", "sonik/fyrirtaeki.js", "sonik/manifest.webmanifest", "sonik/utlit.css", "sonik/merki-ljos.svg", "sonik/merki-dokk.svg", "aera/icon-192.png?v=2", "aera/apple-touch-icon.png?v=2", "sonik/icon-192.png?v=2", "sonik/apple-touch-icon.png?v=2", "party/index.html", "demo/index.html", "demo/fyrirtaeki.js", "demo/manifest.webmanifest", "dev/index.html", "dev/fyrirtaeki.js", "dev/manifest.webmanifest", "party/fyrirtaeki.js", "party/manifest.webmanifest", "party/utlit.css", "party/merki.png", "party/icon-192.png?v=2", "party/apple-touch-icon.png?v=2",
  "icons/atrium-icon-192.png", "icons/atrium-icon-512.png", "icons/atrium-icon-maskable-512.png", "icons/atrium-apple-touch-icon.png", "icons/atrium-favicon.svg", "icons/atrium-haus-ljos.svg", "icons/atrium-haus-dokk.svg", "icons/atrium-ordmerki-dokk.svg", "icons/sig-logo.png", "icons/atrium-merki-ljos.svg", "icons/atrium-merki-dokk.svg",
  "brand.css", "fonts/web/Poppins-Light.woff", "fonts/web/Poppins-Regular.woff", "fonts/web/Poppins-Medium.woff", "fonts/web/Poppins-SemiBold.woff", "lib/qrcode.js", "icons/logo-ljos.svg", "icons/logo-dokk.svg", "icons/ordmerki-dokk.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  const own = url.origin === location.origin;
  const lib = url.hostname === "www.gstatic.com"; // Firebase-söfnin (letrið er hýst í appinu frá 2.44.0)
  if (!own && !lib) return; // Firebase-gögn og innskráning fara alltaf beint á netið
  if (own) {
    // Netið fyrst (nýjasta útgáfan), annars geymda útgáfan
    e.respondWith(fetch(req, { cache: "no-cache" }).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === "navigate" && caches.match(new URL("index.html", req.url).href)) || caches.match("index.html"))));
  } else {
    // Söfn og letur breytast ekki: geymda útgáfan fyrst
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { if (n.ok) { const c = n.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return n; })));
  }
});

// Ýtitilkynningar (2.64.0): „data“-skilaboð frá Cloud Functions (functions/index.js) í gegnum Firebase Cloud Messaging.
// Allar uppsetningar deila þessari skriftu; reiturinn o segir hvaða uppsetningu (aera, sonik, dev …) tilkynningin á við.
self.addEventListener("push", e => {
  let m = {}; try { const j = e.data ? e.data.json() : {}; m = j.data || j; } catch (x) { m = { title: "Atrium", body: e.data ? e.data.text() : "" }; }
  const o = String(m.o || "").replace(/[^a-z0-9_-]/gi, ""), base = new URL(o ? o + "/" : "./", self.registration.scope).href;
  const opts = { body: m.body || "", tag: (o || "a") + ":" + (m.tag || m.kind || "atrium"), renotify: true, icon: new URL("icons/atrium-icon-192.png", self.registration.scope).href,
    badge: new URL("icons/atrium-icon-192.png", self.registration.scope).href, data: { url: base + (m.link || "") } };
  const n = +m.badge;
  e.waitUntil(Promise.all([
    self.registration.showNotification(m.title || "Atrium", opts),
    (n > 0 && self.navigator.setAppBadge) ? self.navigator.setAppBadge(n).catch(() => {}) : Promise.resolve()
  ]));
});
self.addEventListener("notificationclick", e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    const path = new URL(url).pathname, c = cs.find(x => new URL(x.url).pathname === path);
    if (c) { return c.focus().then(w => (w && w.navigate ? w.navigate(url).catch(() => w) : w)); }
    return self.clients.openWindow(url);
  }));
});
