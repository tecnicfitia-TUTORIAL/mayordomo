import { getAuth } from 'firebase/auth';

// CLOUD RUN URL CONFIGURATION (Firebase Functions Gen 2)
const PROJECT_HASH = 'qky5eul2mq'; // Hash from deployment logs
const REGION = 'us-central1';
const getFunctionUrl = (name: string) => `https://${name.toLowerCase()}-${PROJECT_HASH}-uc.a.run.app`;

export interface GovernmentNotification {
  id: string;
  title: string;
  body: string;
  date: string;
  source: 'DEHÚ' | 'AEAT' | 'DGT';
  status?: 'UNREAD' | 'READ';
}

export interface GovernmentServiceResponse {
  success: boolean;
  notifications?: GovernmentNotification[];
  count?: number;
  error?: string;
  message?: string;
  details?: {
    code?: string;
    sslError?: string;
  };
}

export const GovernmentService = {
  /**
   * Obtiene notificaciones de DEHú
   */
  getDEHUNotifications: async (): Promise<GovernmentServiceResponse> => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const token = await user.getIdToken();
      const url = getFunctionUrl('getDEHUNotifications');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Manejar errores específicos
        if (errorData.error === 'CERTIFICATE_EXPIRED' || errorData.details?.sslError === 'CERTIFICATE_EXPIRED') {
          return {
            success: false,
            error: 'CERTIFICATE_EXPIRED',
            message: errorData.message || 'Su certificado digital ha expirado'
          };
        }
        
        if (errorData.error === 'CERTIFICATE_ERROR' || errorData.message?.includes('No certificate found')) {
          return {
            success: false,
            error: 'CERT_MISSING',
            message: 'No se encontró certificado digital. Por favor, configure uno.'
          };
        }
        
        return {
          success: false,
          error: errorData.error || 'UNKNOWN_ERROR',
          message: errorData.message || 'Error al obtener notificaciones',
          details: errorData.details
        };
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('[GovernmentService] Error:', error);
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: error.message || 'Error de conexión'
      };
    }
  },

  /**
   * Obtiene estado fiscal de AEAT
   */
  getAEATStatus: async (): Promise<GovernmentServiceResponse> => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const token = await user.getIdToken();
      const url = getFunctionUrl('getAEATStatus');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'UNKNOWN_ERROR',
          message: errorData.message || 'Error al obtener estado fiscal'
        };
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: error.message || 'Error de conexión'
      };
    }
  },

  /**
   * Obtiene puntos de DGT
   */
  getDGTPoints: async (): Promise<GovernmentServiceResponse> => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const token = await user.getIdToken();
      const url = getFunctionUrl('getDGTPoints');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'UNKNOWN_ERROR',
          message: errorData.message || 'Error al obtener puntos DGT'
        };
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: error.message || 'Error de conexión'
      };
    }
  }
};

