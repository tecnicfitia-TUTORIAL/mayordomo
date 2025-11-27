
import { Toast } from '../components/Toast';

export type NotificationPriority = 'CRITICAL' | 'SILENT';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  timestamp: Date;
}

// Event Bus simple para comunicar con la UI (Toast)
type NotificationListener = (notification: AppNotification) => void;
const listeners: NotificationListener[] = [];

export const NotificationService = {
  
  /**
   * Solicita permiso al SO/Navegador para mostrar notificaciones.
   */
  requestPermission: async () => {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones de escritorio.');
      return;
    }
    if (Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  },

  /**
   * Envía una notificación aplicando la Lógica Jerárquica.
   */
  send: (title: string, body: string, priority: NotificationPriority) => {
    const notification: AppNotification = {
      id: Date.now().toString(),
      title,
      body,
      priority,
      timestamp: new Date()
    };

    console.log(`[NotificationService] Sending ${priority}: ${title}`);

    // 1. LÓGICA CRÍTICA (Interrupción)
    if (priority === 'CRITICAL') {
      // A. Vibración (Solo Móvil)
      if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
      
      // B. Sonido (Simulado con Audio API o nativo en el futuro)
      // playAlertSound(); 

      // C. Notificación de Sistema (Alta Prioridad)
      if (Notification.permission === 'granted') {
        new Notification(`⚠️ ${title}`, {
          body: body,
          icon: '/vite.svg', // Reemplazar con icono de app
          tag: 'critical-alert',
          requireInteraction: true // Se queda pegada hasta que el usuario la cierra
        });
      }

      // D. Disparar Pop-up en App (Toast)
      notifyListeners(notification);
    } 
    
    // 2. LÓGICA SILENCIOSA (Información)
    else {
      // A. Notificación de Sistema (Silenciosa)
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: '/vite.svg',
          silent: true, // Sin sonido/vibración del sistema
          tag: 'info-update'
        });
      }
      
      // No disparamos el Pop-up invasivo en la UI, solo actualizamos contadores (futuro)
    }
  },

  /**
   * Suscribe a la UI para recibir alertas críticas (Pop-ups).
   */
  onCriticalAlert: (callback: NotificationListener) => {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  }
};

const notifyListeners = (n: AppNotification) => {
  listeners.forEach(l => l(n));
};
