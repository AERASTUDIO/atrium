// Firebase-tengistillingar fyrir AERA appið (verkefni aera-app-cfdb3).
// Þetta eru opinber auðkenni vefforrits, ekki leyndarmál; gögnin eru varin með Firestore-reglum og innskráningu.
export const firebaseConfig = {
  apiKey: "AIzaSyAUyV3MyuFrgpQ2pNMAsQIYnqYnp32hTFs",
  authDomain: "aera-app-cfdb3.firebaseapp.com",
  projectId: "aera-app-cfdb3",
  storageBucket: "aera-app-cfdb3.firebasestorage.app",
  messagingSenderId: "476747764052",
  appId: "1:476747764052:web:396030a039ee790aeb78c1"
};

// Microsoft (Entra) – AERA Studio ehf (aerastudio.is). Starfsmenn skrá sig inn með @aerastudio.is.
export const MS_TENANT = "ed06b359-9189-4e32-aeaa-7454e6be768f";
export const MS_DOMAIN = "aerastudio.is";

// Fyrsti admin – skráður sjálfkrafa í notendaskrána (app/notendur) ef hún er ekki til.
export const ADMIN = { email: "dagur@aerastudio.is", nafn: "Dagur Fannar Möller", sk: "DFM" };

// Varaleið á meðan skipt er yfir í Microsoft: gamli Google-aðgangurinn, jafngildir admin.
// Fjarlægja héðan og úr firestore.rules þegar Microsoft-innskráning hefur verið prófuð.
export const LEGACY_EMAILS = ["aerastudioice@gmail.com"];
