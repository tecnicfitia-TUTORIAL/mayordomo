
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

// Fix: Cast import.meta to any to resolve TS error 'Property env does not exist on type ImportMeta'
// Safety check: ensure env object exists before accessing properties
const env = (import.meta as any).env || {};

// VALIDACIÓN DE ENTORNO (VERCEL / LOCAL)
const apiKey = env.VITE_FIREBASE_API_KEY;

let app;
let auth: any = null; // Use any to allow mock fallback
let db: any = null;
let functions: any = null;
let googleProvider = new GoogleAuthProvider();
let analytics: any = null;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

// Initialization Logic with Robust Error Handling
if (!apiKey || apiKey === 'undefined' || apiKey === '') {
  console.warn("⚠️ [SYSTEM ALERT] Claves de Firebase no detectadas. El backend funcionará en modo simulado/offline.");
  
  // Create mock objects to prevent imports from crashing
  auth = { _isMock: true }; 
  db = { _isMock: true };
  functions = { _isMock: true };

} else {
  try {
      // Prevent multiple initializations in dev HMR
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      
      auth = getAuth(app);
      db = getFirestore(app);
      functions = getFunctions(app, "us-central1");
      
      console.log("[System] Firebase Environment Variables detected and initialized.");

      // Solo inicializar analytics en el navegador (no en SSR/Node)
      if (typeof window !== 'undefined') {
        try {
          analytics = getAnalytics(app);
        } catch (e) {
          console.warn("Firebase Analytics warning:", e);
        }
      }
  } catch (error) {
      console.error("⚠️ [SYSTEM ALERT] Error inicializando Firebase:", error);
      console.warn("El sistema continuará en modo degradado.");
      
      // Fallback to mocks if initialization fails (e.g. invalid key format)
      auth = { _isMock: true };
      db = { _isMock: true };
      functions = { _isMock: true };
  }
}

export { auth, db, functions, googleProvider, analytics };
