import React, { useState, useEffect } from 'react';
import { X, Upload, Shield, CheckCircle, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { CertificateService, DigitalCertificate } from '../services/certificateService';

interface Props {
  onClose: () => void;
}

export const CertificateManager: React.FC<Props> = ({ onClose }) => {
  const [certificate, setCertificate] = useState<DigitalCertificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Cargar estado del certificado al montar
  useEffect(() => {
    loadCertificateStatus();
  }, []);

  const loadCertificateStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cert = await CertificateService.getStatus();
      setCertificate(cert);
    } catch (err: any) {
      console.error('Error loading certificate:', err);
      setError('Error al cargar el estado del certificado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const extension = file.name.toLowerCase().split('.').pop();
      if (extension !== 'p12' && extension !== 'pfx') {
        setError('Solo se permiten archivos .p12 o .pfx');
        return;
      }
      setSelectedFile(file);
      setShowPasswordInput(true);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !password) {
      setError('Por favor, seleccione un archivo e ingrese la contraseña');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const cert = await CertificateService.uploadCertificate(selectedFile, password);
      setCertificate(cert);
      setSuccess('Certificado subido y encriptado correctamente');
      setSelectedFile(null);
      
      // SEGURIDAD: Limpiar contraseña de memoria inmediatamente después de enviar
      setPassword('');
      // Forzar limpieza adicional del input
      const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
      if (passwordInput) passwordInput.value = '';
      
      setShowPasswordInput(false);
      
      // Limpiar input file
      const fileInput = document.getElementById('cert-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Limpiar contraseña del estado después de un delay para asegurar limpieza
      setTimeout(() => {
        setPassword('');
      }, 100);
    } catch (err: any) {
      console.error('Error uploading certificate:', err);
      setError(err.message || 'Error al subir el certificado');
      // Limpiar contraseña incluso en caso de error
      setPassword('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!certificate) return;
    
    if (!confirm('¿Está seguro de que desea eliminar su certificado digital? Esta acción no se puede deshacer.')) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await CertificateService.revokeCertificate(certificate.id);
      setCertificate(null);
      setSuccess('Certificado eliminado correctamente');
    } catch (err: any) {
      console.error('Error deleting certificate:', err);
      setError(err.message || 'Error al eliminar el certificado');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const isExpired = certificate?.isExpired || (certificate?.validUntil && new Date(certificate.validUntil) < new Date());

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-stone-950 border-b border-stone-800 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-900 rounded-lg">
              <Shield className="text-ai-500" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-white">Certificado Digital</h2>
              <p className="text-xs text-stone-500">Gestión de certificado para servicios gubernamentales</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-stone-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-950/50 border border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm text-red-400 font-medium">Error</p>
                <p className="text-xs text-red-500 mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-950/50 border border-green-800 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm text-green-400 font-medium">Éxito</p>
                <p className="text-xs text-green-500 mt-1">{success}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-ai-500" size={32} />
            </div>
          )}

          {/* Certificate Status */}
          {!isLoading && certificate && (
            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {isExpired ? (
                    <AlertCircle className="text-red-500" size={24} />
                  ) : (
                    <CheckCircle className="text-green-500" size={24} />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {isExpired ? 'Certificado Expirado' : 'Certificado Activo'}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">
                      {certificate.issuer}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDelete}
                  disabled={isUploading}
                  className="p-2 hover:bg-red-950/50 border border-red-900/50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="text-red-500" size={18} />
                </button>
              </div>

              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center py-2 border-b border-stone-800">
                  <span className="text-xs text-stone-500">Emisor</span>
                  <span className="text-sm text-white font-medium">{certificate.issuer}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-800">
                  <span className="text-xs text-stone-500">Sujeto</span>
                  <span className="text-sm text-white font-medium">{certificate.subject}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-800">
                  <span className="text-xs text-stone-500">Número de Serie</span>
                  <span className="text-sm text-white font-mono">{certificate.serialNumber}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-800">
                  <span className="text-xs text-stone-500">Válido Desde</span>
                  <span className="text-sm text-white">{formatDate(certificate.validFrom)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-stone-500">Válido Hasta</span>
                  <span className={`text-sm font-medium ${isExpired ? 'text-red-500' : 'text-white'}`}>
                    {formatDate(certificate.validUntil)}
                  </span>
                </div>
              </div>

              {isExpired && (
                <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
                  <p className="text-xs text-red-400">
                    ⚠️ Su certificado ha expirado. Por favor, suba un certificado renovado para continuar usando los servicios gubernamentales.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upload Section */}
          {!isLoading && (
            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                {certificate ? 'Reemplazar Certificado' : 'Importar Certificado Digital'}
              </h3>

              <div className="space-y-4">
                {/* File Input */}
                <div className="relative">
                  <input
                    id="cert-file-input"
                    type="file"
                    accept=".p12,.pfx"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <button
                    className={`w-full bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-bold py-3 rounded-lg border border-stone-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedFile ? 'border-ai-500 bg-ai-950/30' : ''
                    }`}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Encriptando y Guardando...</span>
                      </>
                    ) : selectedFile ? (
                      <>
                        <CheckCircle size={18} />
                        <span>{selectedFile.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        <span>Seleccionar Archivo .p12 / .pfx</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Password Input */}
                {showPasswordInput && (
                  <div>
                    <label className="block text-xs text-stone-500 mb-2">
                      Contraseña del Certificado
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingrese la contraseña del certificado"
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg p-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-ai-500"
                      disabled={isUploading}
                    />
                  </div>
                )}

                {/* Upload Button */}
                {selectedFile && password && (
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full bg-ai-500 hover:bg-ai-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Subiendo y Encriptando...</span>
                      </>
                    ) : (
                      <>
                        <Shield size={18} />
                        <span>Subir y Encriptar Certificado</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <p className="text-xs text-stone-500 mt-4">
                🔒 Su certificado será encriptado con AES-256-GCM antes de guardarse. 
                La contraseña también se encripta y nunca se almacena en texto plano.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

