
import React from 'react';
import { PillarId, PillarStatus, UserProfile } from '../types';
import { PERMISSIONS_MATRIX, PILLAR_DEFINITIONS } from '../constants';
import { Shield, Home, Coffee, Activity, Users, Lock, CheckCircle2, AlertTriangle, Database, Zap } from 'lucide-react';

interface Props {
  pillarId: PillarId;
  status: PillarStatus;
  userProfile: UserProfile;
}

// Datos simulados para la demo visual
const MOCK_DATA_VALUES: Record<string, { value: string; label: string; source: string }> = {
  // CENTINELA
  'cent_expiry_alert': { value: 'Vence 12/2028', label: 'DNI / Pasaporte', source: 'OCR REGISTRY' },
  'cent_traffic_fine': { value: '12 / 15', label: 'Puntos DGT', source: 'DGT CONNECT' },
  'cent_taxes': { value: 'Al Corriente', label: 'Estado Fiscal', source: 'AEAT' },
  'cent_digital_id': { value: 'Protegida', label: 'Bóveda Digital', source: 'ENCRYPTED' },
  'cent_official_notif': { value: '0 Pendientes', label: 'Buzón DEHú', source: 'GOB.ES' },

  // PATRIMONIO
  'pat_expenses': { value: '1.240,50 €', label: 'Gastos Mensuales', source: 'PSD2 BANK' },
  'pat_subscriptions': { value: '4 Activas', label: 'Recurrentes', source: 'EMAIL SCAN' },
  'pat_warranties': { value: '2 Vencen pronto', label: 'Garantías Activas', source: 'TICKET OCR' },
  'pat_energy': { value: 'Eficiencia B', label: 'Consumo Energético', source: 'DATADIS' },
  'pat_wealth': { value: '+12.5%', label: 'Patrimonio Neto', source: 'GLOBAL VIEW' },

  // CONCIERGE
  'con_agenda': { value: '3 Huecos', label: 'Disponibilidad Hoy', source: 'GCAL' },
  'con_travel': { value: 'Sin Viajes', label: 'Próximo Desplazamiento', source: 'WALLET' },
  'con_leisure': { value: 'Jazz & Sushi', label: 'Preferencia Activa', source: 'TAGS' },
  'con_shopping': { value: 'Aniversario', label: 'Próx. Evento Regalo', source: 'CONTACTS' },
  'con_comms': { value: 'Auto-Reply', label: 'Secretario Digital', source: 'GMAIL' },

  // VITAL
  'vit_habits': { value: '85%', label: 'Adherencia Rutina', source: 'TRACKER' },
  'vit_medical': { value: 'Revisiones OK', label: 'Estado Clínico', source: 'HEALTH FOLDER' },
  'vit_stress': { value: 'Nivel Bajo', label: 'HRV / Estrés', source: 'HEALTHKIT' },
  'vit_career': { value: 'CV Optimizado', label: 'Perfil Profesional', source: 'LINKEDIN' },
  'vit_nutrition': { value: 'Plan Keto', label: 'Dieta Actual', source: 'USER INPUT' },

  // NUCLEO
  'nuc_calendar': { value: 'Sincronizado', label: 'Calendario Familiar', source: 'FAMILY LINK' },
  'nuc_dependents': { value: 'Escuela / Fútbol', label: 'Logística Menores', source: 'CALENDAR' },
  'nuc_staff': { value: 'Nómina OK', label: 'Empleados Hogar', source: 'BANK' },
  'nuc_elderly': { value: 'Medicación 20:00', label: 'Cuidado Mayores', source: 'REMINDERS' },
  'nuc_home_maint': { value: 'Caldera Rev.', label: 'Mantenimiento', source: 'LOGS' },
};

export const PillarDetailView: React.FC<Props> = ({ pillarId, status, userProfile }) => {
  const def = PILLAR_DEFINITIONS[pillarId];
  const features = PERMISSIONS_MATRIX.filter(f => f.pillarId === pillarId);
  
  const getPillarIcon = () => {
    switch(pillarId) {
      case PillarId.CENTINELA: return <Shield size={32} className="text-ai-500" />;
      case PillarId.PATRIMONIO: return <Home size={32} className="text-ai-500" />;
      case PillarId.CONCIERGE: return <Coffee size={32} className="text-ai-500" />;
      case PillarId.VITAL: return <Activity size={32} className="text-ai-500" />;
      case PillarId.NUCLEO: return <Users size={32} className="text-ai-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0c0a09] overflow-y-auto custom-scrollbar relative">
      
      {/* 1. HERO HEADER */}
      <div className="bg-dark-900 border-b border-stone-800 p-8 flex items-center justify-between shrink-0 relative overflow-hidden">
        {/* Background Noise/Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] pointer-events-none"></div>
        
        <div className="flex items-center gap-6 z-10">
            <div className={`p-4 rounded-full border border-double border-4 ${status.isActive ? 'bg-ai-900/10 border-ai-500/30' : 'bg-stone-900 border-stone-700 grayscale'}`}>
                {getPillarIcon()}
            </div>
            <div>
                <h2 className="text-3xl font-serif font-bold text-stone-200">{def.name}</h2>
                <p className="text-sm text-stone-500 mt-1 max-w-md">{def.description}</p>
            </div>
        </div>

        <div className="flex flex-col items-end z-10">
             <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                 status.isActive 
                    ? status.isDegraded 
                        ? 'bg-amber-900/20 border-amber-500/50 text-amber-500' 
                        : 'bg-emerald-900/20 border-emerald-500/50 text-emerald-500'
                    : 'bg-red-900/10 border-red-800 text-red-700'
             }`}>
                 {status.isActive 
                    ? status.isDegraded ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />
                    : <Lock size={16} />
                 }
                 <span className="text-xs font-bold uppercase tracking-widest">
                     {status.isActive 
                        ? status.isDegraded ? "Acción Requerida" : "Sistema Seguro"
                        : "Acceso Restringido"
                     }
                 </span>
             </div>
             {status.isActive && status.isDegraded && (
                 <span className="text-[10px] text-amber-500/80 mt-2 font-mono">
                     Faltan permisos técnicos
                 </span>
             )}
        </div>
      </div>

      {/* 2. BENTO GRID */}
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 auto-rows-[140px]">
         {features.map((feature) => {
             // Lógica de Permisos Granular
             const tierConfig = feature.tiers[userProfile.subscriptionTier];
             const hasAccess = tierConfig.access && status.isActive;
             const mockData = MOCK_DATA_VALUES[feature.id] || { value: '---', label: feature.name, source: 'SYSTEM' };
             const requiredTierName = Object.entries(feature.tiers).find(([_, cfg]) => cfg.access)?.[0] || 'SUPERIOR';

             return (
                 <div 
                    key={feature.id} 
                    className={`relative rounded-sm border transition-all duration-300 group overflow-hidden ${
                        hasAccess 
                            ? 'bg-stone-900/40 border-ai-500/20 hover:border-ai-500/50 hover:bg-stone-900/60' 
                            : 'bg-stone-950 border-stone-800'
                    }`}
                 >
                    {/* LOCKED STATE OVERLAY */}
                    {!hasAccess && (
                        <div className="absolute inset-0 z-20 backdrop-blur-sm bg-black/40 flex flex-col items-center justify-center text-center p-4 transition-opacity duration-300">
                            <Lock className="text-ai-600 mb-2" size={24} />
                            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                                Disponible en plan
                            </span>
                            <span className="text-xs font-serif font-bold text-ai-500 mt-1">
                                {requiredTierName}
                            </span>
                        </div>
                    )}

                    {/* CONTENT */}
                    <div className={`p-5 h-full flex flex-col justify-between ${!hasAccess ? 'opacity-20 blur-[2px]' : ''}`}>
                        
                        <div className="flex justify-between items-start">
                             <div className="p-1.5 rounded-sm bg-stone-800/50 text-stone-400">
                                 <Zap size={14} />
                             </div>
                             <div className="flex items-center gap-1 text-[9px] font-mono text-stone-600 border border-stone-800 px-1.5 py-0.5 rounded-sm uppercase">
                                 <Database size={8} />
                                 {mockData.source}
                             </div>
                        </div>

                        <div>
                            <div className="text-2xl font-serif font-bold text-stone-200 group-hover:text-white transition-colors truncate">
                                {mockData.value}
                            </div>
                            <div className="text-xs text-stone-500 font-bold uppercase tracking-wider mt-1 truncate">
                                {mockData.label}
                            </div>
                        </div>
                    </div>
                 </div>
             );
         })}
      </div>

    </div>
  );
};
