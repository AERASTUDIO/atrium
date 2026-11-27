// Firebase-tengistillingar uppsetningarinnar (sjá ORG.firebase í fyrirtaeki.js).
// Þetta eru opinber auðkenni vefforrits, ekki leyndarmál; gögnin eru varin með Firestore-reglum og innskráningu.
// Frá 2.3.0 eru tengistillingarnar í fyrirtaeki.js (ORG.firebase) svo hver uppsetning hafi sitt Firebase-verkefni.
// Tómt = uppsetningin er ekki tengd gagnagrunni enn (aðeins sýniútgáfa).
export const firebaseConfig = window.ORG.firebase || null;

// Fyrirtækjagildin (lén, Entra, fyrsti admin, varaleið) eru í fyrirtaeki.js (window.ORG).
const O = window.ORG;
export const MS_TENANT = O.ms.tenant;
export const MS_DOMAIN = O.len;
export const ADMIN = O.admin;
// Varaleið (Google) – fjarlægja úr fyrirtaeki.js og firestore.rules þegar Microsoft-innskráning hefur verið prófuð.
export const LEGACY_EMAILS = O.legacyEmails || [];
