
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Fix: Cast import.meta to any to resolve TS error 'Property env does not exist on type ImportMeta'
// Safety check: ensure env object exists before accessing properties
const env = (import.meta as any).env || {};

// VALIDACIÓN DE ENTORNO (VERCEL / LOCAL)
const apiKey = env.VITE_FIREBASE_API_KEY;

if (!apiKey) {
  console.warn("⚠️ [SYSTEM ALERT] No se han detectado las claves de Firebase (VITE_FIREBASE_API_KEY).");
  console.warn("   - Si estás en Local: Revisa tu archivo .env");
  console.warn("   - Si estás en Vercel: Configura las Environment Variables en el Dashboard.");
} else {
  console.log("[System] Firebase Environment Variables detected.");
}

// ECHO [FIREBASE]: Reemplaza estos valores con los de tu consola de Firebase
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Solo inicializar analytics en el navegador (no en SSR/Node)
let analytics: any;
if (typeof window !== 'undefined') {
  try {
    if (apiKey) {
      analytics = getAnalytics(app);
    }
  } catch (e) {
    console.warn("Firebase Analytics no pudo iniciarse (posiblemente bloqueador de anuncios o falta de config)");
  }
}

export { auth, db, googleProvider, analytics };
