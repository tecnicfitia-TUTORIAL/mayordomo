import { getAuth } from 'firebase/auth';

// CLOUD RUN URL CONFIGURATION (Firebase Functions Gen 2)
const PROJECT_HASH = 'qky5eul2mq'; // Hash from deployment logs
const REGION = 'us-central1';
const getFunctionUrl = (name: string) => `https://${name.toLowerCase()}-${PROJECT_HASH}-uc.a.run.app`;

export interface DigitalCertificate {
  id: string;
  fileName: string;
  issuer: string; // e.g., "FNMT-RCM"
  subject: string;
  validFrom: string; // ISO Date
  validUntil: string; // ISO Date
  serialNumber: string;
  hasPrivateKey: boolean;
  status?: 'ACTIVE' | 'EXPIRED';
  isExpired?: boolean;
}

export const CertificateService = {
  /**
   * Uploads a .p12/.pfx file to the secure vault.
   * Encripta el certificado y lo guarda en Firestore.
   */
  uploadCertificate: async (file: File, password: string): Promise<DigitalCertificate> => {
    console.log(`[CertificateService] Uploading ${file.name} (${file.size} bytes)...`);
    
    // Validar tipo de archivo
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (fileExtension !== 'p12' && fileExtension !== 'pfx') {
      throw new Error('Solo se permiten archivos .p12 o .pfx');
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('El archivo es demasiado grande. Tamaño máximo: 5MB');
    }

    // Convertir archivo a base64
    const fileBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remover el prefijo "data:application/x-pkcs12;base64," o similar
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Obtener token de autenticación
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const token = await user.getIdToken();

    // Llamar a Cloud Function con fetch
    const url = getFunctionUrl('uploadUserCertificate');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileBase64,
          fileName: file.name,
          password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Manejar errores específicos
        if (errorData.error === 'CERTIFICATE_EXPIRED') {
          throw new Error('El certificado ha expirado. Por favor, renueve su certificado digital.');
        }
        if (errorData.error === 'INVALID_PASSWORD') {
          throw new Error('Contraseña incorrecta. Verifique la contraseña del certificado.');
        }
        
        throw new Error(errorData.message || errorData.error || 'Error al subir certificado');
      }

      const data = await response.json();
      if (data.success && data.certificate) {
        return data.certificate as DigitalCertificate;
      } else {
        throw new Error(data.error || 'Error al subir certificado');
      }
    } catch (error: any) {
      if (error.message) {
        throw error;
      }
      throw new Error('Error al subir certificado: ' + error.message);
    }
  },

  /**
   * Checks the status of the certificate in the vault.
   */
  getStatus: async (): Promise<DigitalCertificate | null> => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      return null;
    }

    try {
      const token = await user.getIdToken();
      const url = getFunctionUrl('getUserCertificateStatus');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('[CertificateService] Error getting status:', response.status);
        return null;
      }

      const data = await response.json();
      if (data.success) {
        return data.certificate as DigitalCertificate | null;
      }
      return null;
    } catch (error) {
      console.error('[CertificateService] Error getting status:', error);
      return null;
    }
  },

  /**
   * Revokes the certificate, deleting it from the vault.
   */
  revokeCertificate: async (certId: string): Promise<void> => {
    console.log(`[CertificateService] Revoking ${certId}...`);
    
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const token = await user.getIdToken();
      const url = getFunctionUrl('deleteUserCertificate');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Error al eliminar certificado');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Error al eliminar certificado');
      }
    } catch (error: any) {
      console.error('[CertificateService] Error revoking certificate:', error);
      throw error;
    }
  }
};
