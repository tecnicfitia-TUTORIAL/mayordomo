
import React, { useState, useEffect } from 'react';
import { Scale, FileText, ExternalLink, Check, AlertCircle, Loader2, Shield } from 'lucide-react';
import { GovernmentService, GovernmentNotification } from '../services/governmentService';
import { CertificateManager } from './CertificateManager';

interface RegulatoryAlert {
  id: string;
  title: string;
  impact: string;
  date: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'ARCHIVED';
  documentUrl?: string;
}

export const RegulatoryIntelligenceFeed: React.FC = () => {
  const [alerts, setAlerts] = useState<RegulatoryAlert[]>([]);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCertManager, setShowCertManager] = useState(false);

  // Cargar notificaciones al montar
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GovernmentService.getDEHUNotifications();
      
      if (!response.success) {
        // Manejar errores específicos
        if (response.error === 'CERT_MISSING' || response.error === 'CERTIFICATE_EXPIRED') {
          setError(response.error);
        } else {
          setError(response.message || 'Error al cargar notificaciones');
        }
        setAlerts([]);
        return;
      }

      // Convertir notificaciones del backend a formato de alertas
      if (response.notifications && response.notifications.length > 0) {
        const convertedAlerts: RegulatoryAlert[] = response.notifications.map((notif, index) => ({
          id: notif.id || `dehu_${index}`,
          title: notif.title || 'Notificación DEHú',
          impact: notif.body || 'Nueva notificación disponible',
          date: new Date(notif.date).toLocaleDateString('es-ES'),
          severity: 'HIGH' as const,
          status: (notif.status === 'READ' ? 'ARCHIVED' : 'ACTIVE') as 'ACTIVE' | 'ARCHIVED',
          documentUrl: undefined
        }));
        setAlerts(convertedAlerts);
      } else {
        setAlerts([]);
      }
    } catch (err: any) {
      console.error('Error loading notifications:', err);
      setError(err.message || 'Error al cargar notificaciones');
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Funcionalidad 1: Abrir Documento Externo
  const handleOpenDoc = (url?: string) => {
    const targetUrl = url || 'https://google.com/search?q=regulacion+legal';
    // Abre en nueva pestaña de forma segura
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // Funcionalidad 2: Archivar / Marcar como Completado
  const archiveRegulatoryAlert = async (id: string) => {
    setArchivingId(id);
    
    // Simulación de llamada a API (Backend)
    await new Promise(resolve => setTimeout(resolve, 600));

    // Actualización Optimista: Eliminar la alerta de la lista visible
    setAlerts(prev => prev.filter(a => a.id !== id));
    setArchivingId(null);
  };

  // Renderizar estados de error
  if (error === 'CERT_MISSING' || error === 'CERTIFICATE_EXPIRED') {
    return (
      <>
        <div className="mb-8 animate-fadeIn">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-ai-900/20 rounded-full border border-ai-500/30 text-ai-500">
              <Scale size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-200 uppercase tracking-widest">Inteligencia Regulatoria & Legal</h2>
              <p className="text-[10px] text-stone-500">Monitorización de normativas activas</p>
            </div>
          </div>

          <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-6 flex flex-col items-center gap-4">
            <div className="p-3 bg-amber-900/20 rounded-full">
              <Shield className="text-amber-500" size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-amber-400 mb-2">
                {error === 'CERTIFICATE_EXPIRED' ? 'Certificado Expirado' : 'Certificado No Configurado'}
              </h3>
              <p className="text-xs text-amber-500/80 mb-4">
                {error === 'CERTIFICATE_EXPIRED' 
                  ? 'Su certificado digital ha expirado. Renueve su certificado para continuar recibiendo notificaciones gubernamentales.'
                  : 'Configure su certificado digital para acceder a las notificaciones de DEHú y otros servicios gubernamentales.'}
              </p>
              <button
                onClick={() => setShowCertManager(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Shield size={16} />
                ⚠️ Configurar Certificado Digital
              </button>
            </div>
          </div>
        </div>
        {showCertManager && <CertificateManager onClose={() => { setShowCertManager(false); loadNotifications(); }} />}
      </>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="mb-8 animate-fadeIn">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-ai-900/20 rounded-full border border-ai-500/30 text-ai-500">
            <Scale size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-200 uppercase tracking-widest">Inteligencia Regulatoria & Legal</h2>
            <p className="text-[10px] text-stone-500">Monitorización de normativas activas</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12 bg-stone-900/50 border border-stone-800 rounded-lg">
          <Loader2 className="animate-spin text-ai-500" size={32} />
        </div>
      </div>
    );
  }

  // Empty state
  if (alerts.length === 0 && !error) {
    return (
      <div className="mb-8 animate-fadeIn">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-ai-900/20 rounded-full border border-ai-500/30 text-ai-500">
            <Scale size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-200 uppercase tracking-widest">Inteligencia Regulatoria & Legal</h2>
            <p className="text-[10px] text-stone-500">Monitorización de normativas activas</p>
          </div>
        </div>
        <div className="bg-stone-900/50 border border-stone-800 rounded-lg p-6 text-center">
          <p className="text-sm text-stone-400">No hay notificaciones nuevas en la DEHú</p>
        </div>
      </div>
    );
  }

  // Error state (genérico)
  if (error && error !== 'CERT_MISSING' && error !== 'CERTIFICATE_EXPIRED') {
    return (
      <div className="mb-8 animate-fadeIn">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-ai-900/20 rounded-full border border-ai-500/30 text-ai-500">
            <Scale size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-200 uppercase tracking-widest">Inteligencia Regulatoria & Legal</h2>
            <p className="text-[10px] text-stone-500">Monitorización de normativas activas</p>
          </div>
        </div>
        <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500" size={20} />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 animate-fadeIn">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-ai-900/20 rounded-full border border-ai-500/30 text-ai-500">
          <Scale size={20} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-stone-200 uppercase tracking-widest">Inteligencia Regulatoria & Legal</h2>
          <p className="text-[10px] text-stone-500">Monitorización de normativas activas</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {alerts.map(alert => (
          <div 
            key={alert.id}
            className="min-w-[300px] max-w-[300px] bg-stone-900 border border-stone-800 p-5 rounded-lg relative group hover:border-ai-500/30 transition-colors shadow-lg flex flex-col"
          >
            <div className="flex justify-between items-start mb-3">
               <div className="p-1.5 bg-stone-800 rounded text-stone-400">
                  <FileText size={16} />
               </div>
               <span className={`text-[9px] font-bold px-2 py-1 rounded border ${
                   alert.severity === 'HIGH' ? 'bg-red-900/20 text-red-400 border-red-500/30' :
                   alert.severity === 'MEDIUM' ? 'bg-amber-900/20 text-amber-400 border-amber-500/30' :
                   'bg-blue-900/20 text-blue-400 border-blue-500/30'
               }`}>
                   {alert.date}
               </span>
            </div>

            <h3 className="text-sm font-serif font-bold text-stone-200 mb-2 leading-tight min-h-[40px]">
                {alert.title}
            </h3>

            <div className="bg-black/40 p-3 rounded border border-stone-800/50 mb-4 flex-1">
                <div className="flex items-start gap-2">
                    <AlertCircle size={12} className="text-ai-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-stone-400 leading-relaxed italic">
                        "{alert.impact}"
                    </p>
                </div>
            </div>

            <div className="flex gap-2 mt-auto">
                <button 
                    onClick={() => handleOpenDoc(alert.documentUrl)}
                    className="flex-1 bg-stone-800 hover:bg-stone-700 hover:text-white text-stone-300 text-[10px] font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
                >
                    <ExternalLink size={12} /> Abrir Doc
                </button>
                <button 
                    onClick={() => archiveRegulatoryAlert(alert.id)}
                    disabled={archivingId === alert.id}
                    className="p-2 bg-stone-800 hover:bg-emerald-900/30 hover:text-emerald-400 text-stone-500 rounded transition-colors disabled:opacity-50"
                    title="Marcar como Atendido / Archivar"
                >
                    {archivingId === alert.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
