
import { NotificationService } from './notificationService';

// Intervalo de 2 horas en milisegundos
const SCAN_INTERVAL_MS = 2 * 60 * 60 * 1000; 

let scanIntervalId: any = null;

export const BackgroundService = {
  
  /**
   * Inicializa el worker de fondo.
   * Debe llamarse al arrancar la App (App.tsx).
   */
  init: () => {
    if (scanIntervalId) return;
    
    console.log('[BackgroundService] Initialized. Scanning every 2 hours.');
    
    // 1. Programar intervalo
    scanIntervalId = setInterval(() => {
      BackgroundService.runFullScan('BACKGROUND_TIMER');
    }, SCAN_INTERVAL_MS);

    // 2. Solicitar permisos de notificación para poder avisar
    NotificationService.requestPermission();
  },

  /**
   * Ejecuta el escaneo completo de los 5 pilares.
   * Puede ser disparado por el Timer o Manualmente.
   */
  runFullScan: async (triggerSource: 'MANUAL' | 'BACKGROUND_TIMER') => {
    console.log(`[BackgroundService] Starting Full Scan (Source: ${triggerSource})...`);
    
    // Simulación de proceso de escaneo (Latencia de red)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // LÓGICA DE SIMULACIÓN DE HALLAZGOS
    // En producción, esto consultaría las APIs reales (DGT, Bancos, etc.)
    
    const randomScenario = Math.random();

    if (randomScenario > 0.8) {
      // 20% Probabilidad: ALERTA CRÍTICA (Multa o Seguridad)
      NotificationService.send(
        'Acción Requerida: Sanción DGT',
        'Se ha detectado una notificación de tráfico pendiente. Caduca en 48h.',
        'CRITICAL'
      );
    } else if (randomScenario > 0.5) {
      // 30% Probabilidad: NOTIFICACIÓN SILENCIOSA (Consejo)
      NotificationService.send(
        'Resumen Semanal Disponible',
        'Tu eficiencia energética ha mejorado un 5% esta semana.',
        'SILENT'
      );
    } else {
      // 50% Probabilidad: Todo en orden (Solo log si es manual)
      console.log('[BackgroundService] Scan Complete. No new anomalies.');
      if (triggerSource === 'MANUAL') {
         // Opcional: Feedback visual suave de "Todo OK"
      }
    }

    return true;
  },

  stop: () => {
    if (scanIntervalId) clearInterval(scanIntervalId);
  }
};
