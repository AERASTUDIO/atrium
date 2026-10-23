// Þjónustuskrifta (service worker): geymir appið á tækinu svo það opnist hratt og virki án nets.
// Hækkaðu VERSION þegar eitthvað breytist, þá sækja tækin nýju útgáfuna.
const VERSION = "atrium-2.27.2"; // sama og APP_VERSION í app.html
const SHELL = ["./", "index.html", "app.css", "app-grunnur.js", "app-listar.js", "app-skyrslur.js", "app-sidur.js", "app-stillingar.js", "app-form.js", "app-breyta.js", "firebase.js", "firebase-config.js", "xlsx.js", "skjalagerd.js", "icons/doc-logo.png", "ms.js", "ms-app.js", "verdskra.js", "reikn.js", "sala.js", "bunadarlisti.js", "prufugogn.js", "deildir.js", "heim2.js", "skjol.js", "postur.js", "spjall.js", "heim.js", "skjalasafn.js", "adgangur.js", "notendur.js", "utlit-i.js", "ui1-skjair.js", "gogn.js", "kjarni.js", "demo.js",
  "aera/index.html", "aera/fyrirtaeki.js", "aera/manifest.webmanifest", "sonik/index.html", "sonik/fyrirtaeki.js", "sonik/manifest.webmanifest", "sonik/utlit.css", "sonik/merki-ljos.svg", "sonik/merki-dokk.svg", "aera/icon-192.png", "aera/apple-touch-icon.png", "sonik/icon-192.png", "sonik/apple-touch-icon.png", "party/index.html", "demo/index.html", "demo/fyrirtaeki.js", "demo/manifest.webmanifest", "dev/index.html", "dev/fyrirtaeki.js", "dev/manifest.webmanifest", "party/fyrirtaeki.js", "party/manifest.webmanifest", "party/utlit.css", "party/merki.png", "party/icon-192.png", "party/apple-touch-icon.png",
  "icons/atrium-icon-192.png", "icons/atrium-icon-512.png", "icons/atrium-icon-maskable-512.png", "icons/atrium-apple-touch-icon.png", "icons/atrium-favicon.svg", "icons/atrium-haus-ljos.svg", "icons/atrium-haus-dokk.svg", "icons/atrium-ordmerki-dokk.svg", "icons/sig-logo.png", "icons/atrium-merki-ljos.svg", "icons/atrium-merki-dokk.svg",
  "brand.css", "icons/logo-ljos.svg", "icons/logo-dokk.svg", "icons/ordmerki-dokk.svg"];

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
  const lib = url.hostname === "www.gstatic.com" || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
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
