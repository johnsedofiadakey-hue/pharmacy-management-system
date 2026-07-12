import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";

// Reconstructed after the original was lost to a too-broad `lib/` gitignore
// rule (fixed in the root .gitignore alongside this commit).
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

const firebaseConfig = USE_EMULATORS
  ? {
      // The Auth/Functions/Firestore emulators accept any well-formed config
      // for a "demo-" project id — no real Firebase project involved.
      apiKey: "demo-api-key",
      authDomain: "demo-pharmacy-os.firebaseapp.com",
      projectId: "demo-pharmacy-os",
      storageBucket: "demo-pharmacy-os.appspot.com",
      messagingSenderId: "0",
      appId: "demo-app-id",
    }
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

const FUNCTIONS_REGION = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION ?? "us-central1";

/** False when NEXT_PUBLIC_FIREBASE_* env vars are absent (e.g. a fresh checkout). */
export const isFirebaseConfigured = USE_EMULATORS || Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export function getFirebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

let authEmulatorConnected = false;
let functionsEmulatorConnected = false;
let firestoreEmulatorConnected = false;

export function getFirebaseAuth(): Auth {
  const auth = getAuth(getFirebaseApp());
  if (USE_EMULATORS && !authEmulatorConnected) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    authEmulatorConnected = true;
  }
  return auth;
}

export function getFirebaseFunctions(): Functions {
  const fns = getFunctions(getFirebaseApp(), FUNCTIONS_REGION);
  if (USE_EMULATORS && !functionsEmulatorConnected) {
    connectFunctionsEmulator(fns, "127.0.0.1", 5001);
    functionsEmulatorConnected = true;
  }
  return fns;
}

export function getFirebaseDb(): Firestore {
  const db = getFirestore(getFirebaseApp());
  if (USE_EMULATORS && !firestoreEmulatorConnected) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    firestoreEmulatorConnected = true;
  }
  return db;
}
