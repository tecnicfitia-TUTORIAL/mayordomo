
import React, { useState } from 'react';
import { Scale, FileText, Calendar, ExternalLink, Check, AlertCircle, Loader2 } from 'lucide-react';

interface RegulatoryAlert {
  id: string;
  title: string;
  impact: string;
  date: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'ARCHIVED';
}

const MOCK_ALERTS: RegulatoryAlert[] = [
  {
    id: 'reg_01',
    title: 'Refuerzo LOPD 2025: Responsabilidad Activa',
    impact: 'Obligatorio revalidar consentimientos cada 2 años para perfiles biométricos.',
    date: 'Q2 2026',
    severity: 'HIGH',
    status: 'ACTIVE'
  },
  {
    id: 'reg_02',
    title: 'Ley de Servicios Digitales (DSA)',
    impact: 'Necesario clarificar el uso de Gemini en la política de privacidad y términos.',
    date: 'En vigor (Nov 2025)',
    severity: 'MEDIUM',
    status: 'ACTIVE'
  },
  {
    id: 'reg_03',
    title: 'Nueva Orden TDF/149/2025',
    impact: 'Verificar si el módulo de notificaciones push cumple con el bloqueo de alias.',
    date: 'Enero 2026',
    severity: 'LOW',
    status: 'ACTIVE'
  }
];

export const RegulatoryIntelligenceFeed: React.FC = () => {
  const [alerts, setAlerts] = useState<RegulatoryAlert[]>(MOCK_ALERTS);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const archiveRegulatoryAlert = async (id: string) => {
    setArchivingId(id);
    console.log(`[RegulatoryFeed] Archiving alert ${id} to DB...`);
    
    // 1. Simular llamada a Backend (Firebase update status = 'ARCHIVED')
    await new Promise(resolve => setTimeout(resolve, 600));

    // 2. Actualizar UI (Eliminar de la vista activa)
    setAlerts(prev => prev.filter(a => a.id !== id));
    setArchivingId(null);
  };

  if (alerts.length === 0) return null;

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
                <button className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors">
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
