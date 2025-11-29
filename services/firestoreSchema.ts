
import { collection, doc, FirestoreDataConverter } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { UserProfile, LifeContext, LifeObligation, AuditLog, LegalMandate } from "../types";

/**
 * FIRESTORE SCHEMA DEFINITION
 * ===========================
 * Define las rutas de las colecciones y los conversores de tipos.
 * Actúa como la capa de abstracción de datos (Model Layer).
 */

// 1. COLLECTION NAMES
export const COLLECTIONS = {
  USERS: "users",
  USER_CONTEXT: "user_context",
  LIFE_OBLIGATIONS: "life_obligations",
  ASSETS: "assets",
  AUDIT_LOGS: "audit_logs",
  LEGAL_MANDATES: "legal_mandates"
};

// 2. CONVERTERS (Data Serialization)
// Aseguran que los datos que suben/bajan de Firestore respeten las interfaces de TypeScript.

const userConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore: (user) => {
    return {
      uid: user.uid,
      email: user.email,
      name: user.name,
      subscriptionTier: user.subscriptionTier,
      // subscriptionStatus: 'active', // To be added to UserProfile type if needed
      permissions: Object.fromEntries(user.grantedPermissions.map(p => [p, true])), // Map for optimized querying
      // Flattened basic profile info
      age: user.age,
      occupation: user.occupation
    };
  },
  fromFirestore: (snapshot, options) => {
    const data = snapshot.data(options);
    return data as UserProfile;
  }
};

const obligationConverter: FirestoreDataConverter<LifeObligation> = {
  toFirestore: (obl) => obl,
  fromFirestore: (snapshot, options) => snapshot.data(options) as LifeObligation
};

const auditConverter: FirestoreDataConverter<AuditLog> = {
  toFirestore: (log) => log,
  fromFirestore: (snapshot, options) => {
    const data = snapshot.data(options);
    // Convert Firestore Timestamp to JS Date if necessary
    return {
        ...data,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
    } as AuditLog;
  }
};

// 3. REPOSITORY HELPERS

export const FirestoreRefs = {
  
  /**
   * Referencia al Documento Principal del Usuario
   * Path: /users/{uid}
   */
  user: (uid: string) => doc(db, COLLECTIONS.USERS, uid).withConverter(userConverter),

  /**
   * Referencia a la Sub-colección de Contexto
   * Path: /users/{uid}/user_context/main
   * Nota: Usamos un documento 'main' singleton por simplicidad, o ID auto-generados.
   */
  userContext: (uid: string) => collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.USER_CONTEXT),

  /**
   * Referencia a la Sub-colección de Obligaciones (Polimórficas)
   * Path: /users/{uid}/life_obligations/{oblId}
   */
  obligations: (uid: string) => collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.LIFE_OBLIGATIONS).withConverter(obligationConverter),

  /**
   * Referencia a la Sub-colección de Auditoría (Append-Only)
   * Path: /users/{uid}/audit_logs/{logId}
   */
  auditLogs: (uid: string) => collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.AUDIT_LOGS).withConverter(auditConverter),

  /**
   * Referencia a Mandatos Legales
   * Path: /users/{uid}/legal_mandates/{mandateId}
   */
  legalMandates: (uid: string) => collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.LEGAL_MANDATES)
};
