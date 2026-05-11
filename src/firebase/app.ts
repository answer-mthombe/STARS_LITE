import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

function hasMinimumConfig(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

let app: FirebaseApp | undefined;

/** Returns `undefined` when env is not configured (mock-only runs). */
export function tryGetFirebaseApp(): FirebaseApp | undefined {
  if (!hasMinimumConfig()) return undefined;
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0]!;
  }
  return app;
}

export function requireFirebaseApp(): FirebaseApp {
  const a = tryGetFirebaseApp();
  if (!a) {
    throw new Error(
      "Firebase is not configured. Copy .env.example to .env and set EXPO_PUBLIC_FIREBASE_* variables."
    );
  }
  return a;
}

export function getFirebaseDb(): Firestore {
  return getFirestore(requireFirebaseApp());
}

export function getFirebaseAuth(): Auth {
  return getAuth(requireFirebaseApp());
}
