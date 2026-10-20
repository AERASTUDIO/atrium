# Atrium

**Atrium by AERA Studio** – verkefni, undirverk, fundir, tímaskráning, reikningar, skjöl, póstur og spjall á einum stað. Sama lausnin er sett upp fyrir hvert fyrirtæki (uppsetning), sem velur sjálft hvaða einingar það notar. Atrium er í eigu AERA Studio ehf., sem notar lausnina líka sjálft.

- **Uppsetningar (frá 2.6.0 hver í sinni undirmöppu):** AERA Studio https://aerastudio.github.io/atrium/aera/ · Sonik https://aerastudio.github.io/atrium/sonik/ – rótin `/atrium/` vísar á aera/
- **Sýniútgáfa:** bættu `?demo` við slóð uppsetningar, t.d. https://aerastudio.github.io/atrium/aera/?demo – tilbúin gögn úr `demo.js`, engin tenging við Firestore eða Microsoft
- **Hýsing:** GitHub Pages (útgáfa birtist sjálfkrafa við hverja breytingu á `main`)
- **Gögn:** Firebase Firestore (uppsetning AERA: verkefnið `aera-app-cfdb3`), söfn eftir tegund (sjá `gogn.js`)
- **Innskráning:** Microsoft-aðgangur fyrirtækisins (Firebase Auth + Entra). Notendur og hlutverk í `app/notendur`.

## Uppbygging
| Skrá | Hlutverk |
|---|---|
| `app.html` | **Sniðmát** appsins: HTML, `APP_VERSION` og röð skriftanna. `python3 tools/uppsetningar.py` býr til `<uppsetning>/index.html` úr því |
| `index.html` + `vefur/` | Rótin `/atrium/`: kynningarsíða Atrium (frá 20.10.2026) með skjámyndum úr sýniútgáfum – ekkert manifest, svo öppin skarast ekki. engir tenglar í öppin |
| `aera/`, `sonik/` | **Uppsetningar:** `fyrirtaeki.js`, `manifest.webmanifest`, `firestore.rules`, merki/litir og sjálfvirk `index.html` |
| `kjarni.js` | Atrium-kjarninn: heiti lausnarinnar og einingar (`ON("…")`) |
| `firebase-config.js` | Opinber auðkenni Firebase-verkefnis uppsetningarinnar |
| `app.css`, `brand.css` | Útlit (Poppins; Nótt/Grafít/Stál/Þoka/Pappír) |
| `app-*.js` | Meginvirkni: grunnur, listar, skýrslur, síður, stillingar, form, breytingar |
| `gogn.js`, `firebase.js`, `demo.js` | Gagnalag, Firestore/innskráning og sýniútgáfa |
| `ms.js`, `ms-app.js`, `postur.js`, `skjalasafn.js`, `skjol.js` | Microsoft 365: OneDrive/SharePoint, póstur, skjöl |
| `reikn.js`, `verdskra.js`, `skjalagerd.js`, `xlsx.js` | Reikningar, verðskrá, PDF/Word/Excel |
| `heim.js`, `spjall.js`, `notendur.js`, `adgangur.js` | Heim, spjall, notendur og aðgangsstýring |
| `sw.js` | Geymir appið á tækinu – hækka `VERSION` (`atrium-X.Y.Z`) eins og `APP_VERSION` |
| `<uppsetning>/firestore.rules` | Aðgangsreglur hverrar uppsetningar (afrit; virku reglurnar eru í Firebase Console) |
| `icons/` | Atrium-merki og app-tákn (`atrium-*`) og merki fyrirtækis uppsetningarinnar |

Gögn, afrit og lyklar eru **aldrei** í þessari geymslu – hún er opinber.
