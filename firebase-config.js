// Firebase-tengistillingar fyrir uppsetningu AERA Studio á Atrium (verkefni aera-app-cfdb3).
// Þetta eru opinber auðkenni vefforrits, ekki leyndarmál; gögnin eru varin með Firestore-reglum og innskráningu.
export const firebaseConfig = {
  apiKey: "AIzaSyAUyV3MyuFrgpQ2pNMAsQIYnqYnp32hTFs",
  authDomain: "aera-app-cfdb3.firebaseapp.com",
  projectId: "aera-app-cfdb3",
  storageBucket: "aera-app-cfdb3.firebasestorage.app",
  messagingSenderId: "476747764052",
  appId: "1:476747764052:web:396030a039ee790aeb78c1"
};

// Fyrirtækjagildin (lén, Entra, fyrsti admin, varaleið) eru í fyrirtaeki.js (window.ORG).
const O = window.ORG;
export const MS_TENANT = O.ms.tenant;
export const MS_DOMAIN = O.len;
export const ADMIN = O.admin;
// Varaleið (Google) – fjarlægja úr fyrirtaeki.js og firestore.rules þegar Microsoft-innskráning hefur verið prófuð.
export const LEGACY_EMAILS = O.legacyEmails || [];
