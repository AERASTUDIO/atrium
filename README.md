# Atrium

**Atrium by AERA Studio** – verkefni, undirverk, fundir, tímaskráning, reikningar, skjöl, póstur og spjall á einum stað. Sama lausnin er sett upp fyrir hvert fyrirtæki (uppsetning), sem velur sjálft hvaða einingar það notar. Atrium er í eigu AERA Studio ehf., sem notar lausnina líka sjálft.

- **Slóð (uppsetning AERA Studio):** https://aerastudio.github.io/atrium/ (hét áður …/aera-app/, sem vísar hingað)
- **Sýniútgáfa:** https://aerastudio.github.io/atrium/?demo – tilbúin gögn úr `demo.js`, engin tenging við Firestore eða Microsoft
- **Hýsing:** GitHub Pages (útgáfa birtist sjálfkrafa við hverja breytingu á `main`)
- **Gögn:** Firebase Firestore (uppsetning AERA: verkefnið `aera-app-cfdb3`), söfn eftir tegund (sjá `gogn.js`)
- **Innskráning:** Microsoft-aðgangur fyrirtækisins (Firebase Auth + Entra). Notendur og hlutverk í `app/notendur`.

## Uppbygging
| Skrá | Hlutverk |
|---|---|
| `index.html` | Rammi appsins: HTML, `APP_VERSION` og röð skriftanna |
| `kjarni.js` | Atrium-kjarninn: heiti lausnarinnar og einingar (`ON("…")`) |
| `fyrirtaeki.js` | **Uppsetningin:** nafn fyrirtækis, lén, Microsoft, möppur, pósthólf, einingar, merki fyrirtækis |
| `firebase-config.js` | Opinber auðkenni Firebase-verkefnis uppsetningarinnar |
| `app.css`, `brand.css` | Útlit (Poppins; Nótt/Grafít/Stál/Þoka/Pappír) |
| `app-*.js` | Meginvirkni: grunnur, listar, skýrslur, síður, stillingar, form, breytingar |
| `gogn.js`, `firebase.js`, `demo.js` | Gagnalag, Firestore/innskráning og sýniútgáfa |
| `ms.js`, `ms-app.js`, `postur.js`, `skjalasafn.js`, `skjol.js` | Microsoft 365: OneDrive/SharePoint, póstur, skjöl |
| `reikn.js`, `verdskra.js`, `skjalagerd.js`, `xlsx.js` | Reikningar, verðskrá, PDF/Word/Excel |
| `heim.js`, `spjall.js`, `notendur.js`, `adgangur.js` | Heim, spjall, notendur og aðgangsstýring |
| `sw.js` | Geymir appið á tækinu – hækka `VERSION` (`atrium-X.Y.Z`) eins og `APP_VERSION` |
| `firestore.rules` | Aðgangsreglur (afrit; virku reglurnar eru í Firebase Console) |
| `icons/` | Atrium-merki og app-tákn (`atrium-*`) og merki fyrirtækis uppsetningarinnar |

Gögn, afrit og lyklar eru **aldrei** í þessari geymslu – hún er opinber.
