import { analytics } from './firebaseConfig';
import { logEvent } from "firebase/analytics";

// Tipos de eventos que rastreamos
export type UserActionType = 'CLICK' | 'VIEW' | 'ERROR' | 'FLOW_START' | 'FLOW_COMPLETE' | 'ABANDON';

export interface UserBehaviorEvent {
  timestamp: number;
  type: UserActionType;
  elementId?: string;
  screenName: string;
  metadata?: any;
}

// Memoria de corto plazo para la IA (últimos 50 eventos)
let sessionMemory: UserBehaviorEvent[] = [];

export const AnalyticsService = {
  
  /**
   * Registra una acción del usuario tanto en Firebase como en la memoria local de la IA
   */
  track: (type: UserActionType, name: string, metadata: any = {}) => {
    const event: UserBehaviorEvent = {
      timestamp: Date.now(),
      type,
      elementId: name,
      screenName: window.location.pathname,
      metadata
    };

    // 1. Guardar en memoria local para el Evolution Core
    sessionMemory.push(event);
    if (sessionMemory.length > 100) sessionMemory.shift(); // Mantener solo los últimos 100

    // 2. Enviar a Firebase Analytics (si está disponible)
    if (analytics) {
      try {
        logEvent(analytics, name, { ...metadata, event_type: type });
      } catch (e) {
        // Silencioso en dev si falla
      }
    }

    console.log(`[👁️ SENSE] ${type}: ${name}`, metadata);
  },

  /**
   * Rastrea el inicio de un flujo importante (ej: Onboarding)
   */
  startFlow: (flowName: string) => {
    AnalyticsService.track('FLOW_START', flowName, { startTime: Date.now() });
  },

  /**
   * Rastrea la finalización de un flujo y calcula duración
   */
  completeFlow: (flowName: string) => {
    // Buscar cuándo empezó
    const startEvent = [...sessionMemory].reverse().find(e => e.type === 'FLOW_START' && e.elementId === flowName);
    const duration = startEvent ? (Date.now() - startEvent.timestamp) / 1000 : 0;
    
    AnalyticsService.track('FLOW_COMPLETE', flowName, { duration_seconds: duration });
  },

  /**
   * API para que el Evolution Core "lea" el comportamiento reciente
   */
  getRecentBehavior: () => {
    return sessionMemory;
  },

  /**
   * Análisis heurístico simple para detectar frustración
   */
  detectFrustration: () => {
    const recentClicks = sessionMemory.filter(e => e.type === 'CLICK' && e.timestamp > Date.now() - 10000); // Últimos 10 seg
    
    // Rage Clicks: Muchos clicks en poco tiempo
    if (recentClicks.length > 5) return true;
    
    // Errores repetidos
    const recentErrors = sessionMemory.filter(e => e.type === 'ERROR' && e.timestamp > Date.now() - 30000);
    if (recentErrors.length >= 2) return true;

    return false;
  }
};
