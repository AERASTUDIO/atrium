# AERA Studio – app

Símaapp og tölvuapp AERA Studio fyrir verkefni, undirverk, fundi, tímaskráningu, skjöl og viðskiptavini.

- **Slóð:** https://aerastudio.github.io/aera-app
- **Hýsing:** GitHub Pages (útgáfa birtist sjálfkrafa við hverja breytingu á `main`)
- **Gögn:** Firebase Firestore, verkefnið `aera-app-cfdb3`, skjalið `app/state`
- **Innskráning:** Microsoft-aðgangur @aerastudio.is (Firebase Auth). Notendur og hlutverk í `app/notendur`, stýrt af admin í Stillingum › Notendur. Google (aerastudioice@gmail.com) er tímabundin varaleið. Sjá `firebase-config.js` og `firestore.rules`.
- **Sýniútgáfa:** https://aerastudio.github.io/aera-app/?demo – opin öllum, tilbúin gögn úr `demo.js`, engin tenging við Firestore eða Microsoft

## Skrár
| Skrá | Hlutverk |
|---|---|
| `index.html` | Appið sjálft: útlit, skjámyndir og öll virkni |
| `firebase.js` | Innskráning (Microsoft / Google-varaleið), athugun á notendaskrá og tenging við Firestore |
| `notendur.js` | Notendur, hlutverk og réttindi (Stillingar › Notendur) |
| `firebase-config.js` | Opinber auðkenni Firebase-verkefnisins, Microsoft-tenant og fyrsti admin |
| `firestore.rules` | Aðgangsreglur gagnagrunnsins (afrit; virku reglurnar eru í Firebase Console) |
| `demo.js` | Sýniútgáfa (`?demo`): uppspunnin sýnigögn í minni vafrans, breytingar vistast ekki |
| `sw.js` | Geymir appið á tækinu svo það virki án nets – hækka `VERSION` við breytingar |
| `manifest.webmanifest`, `icons/` | Nafn og tákn þegar appið er sett á heimaskjá |

Gögnin sjálf eru **aldrei** í þessari geymslu. Afrit fæst með „Sækja afrit af gögnum“ neðst í appinu.
