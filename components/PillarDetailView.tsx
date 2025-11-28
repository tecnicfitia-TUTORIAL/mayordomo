
import React, { useState } from 'react';
import { PillarId, PillarStatus, UserProfile, SubscriptionTier, FeatureMatrixItem } from '../types';
import { PERMISSIONS_MATRIX, PILLAR_DEFINITIONS, getTierLevel } from '../constants';
import { Shield, Home, Coffee, Activity, Users, Lock, CheckCircle2, AlertTriangle, Database, Zap, EyeOff, Settings, Crown, ExternalLink, X } from 'lucide-react';
import { UniversalDetailModal } from './UniversalDetailModal';

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
  
  // States for Modals
  const [showUpsell, setShowUpsell] = useState<{featureName: string, requiredTier: string} | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureMatrixItem | null>(null);

  const getPillarIcon = () => {
    switch(pillarId) {
      case PillarId.CENTINELA: return <Shield size={32} className="text-ai-500" />;
      case PillarId.PATRIMONIO: return <Home size={32} className="text-ai-500" />;
      case PillarId.CONCIERGE: return <Coffee size={32} className="text-ai-500" />;
      case PillarId.VITAL: return <Activity size={32} className="text-ai-500" />;
      case PillarId.NUCLEO: return <Users size={32} className="text-ai-500" />;
    }
  };

  const handleCardClick = (feature: FeatureMatrixItem, hasAccess: boolean, hasPermission: boolean, requiredTierName: string) => {
      // CASE 1: BLOCKED (The Paywall)
      if (!hasAccess) {
          setShowUpsell({ featureName: feature.name, requiredTier: requiredTierName });
          return;
      }

      // CASE 1.B: MISSING PERMISSION
      if (hasAccess && !hasPermission) {
          // Just flash a toast or alert (Handled visually by the card, but action here for safety)
          alert("Por favor, active el permiso técnico correspondiente en Ajustes para ver este dato.");
          return;
      }

      // CASE 2 & 3: ACTIVE (Read or Execute)
      // Open Universal Modal (The modal internal logic handles the difference)
      setSelectedFeature(feature);
  };

  return (
    <div className="h-full flex flex-col bg-[#0c0a09] overflow-y-auto custom-scrollbar relative animate-fadeIn">
      
      {/* --- UPSELL MODAL --- */}
      {showUpsell && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-scaleIn">
              <div className="bg-stone-900 border border-ai-500/50 rounded-xl p-8 max-w-sm text-center shadow-[0_0_50px_rgba(212,175,55,0.2)]">
                  <div className="mb-6 relative inline-block">
                      <div className="absolute inset-0 bg-ai-500 blur-xl opacity-30 rounded-full"></div>
                      <div className="relative bg-stone-950 p-4 rounded-full border border-ai-500/50 text-ai-500">
                          <Crown size={32} />
                      </div>
                  </div>
                  <h3 className="text-xl font-serif font-bold text-white mb-2">Acceso Restringido</h3>
                  <p className="text-sm text-stone-400 mb-6 leading-relaxed">
                      La función <span className="text-ai-500 font-bold">"{showUpsell.featureName}"</span> está reservada para miembros del plan <span className="text-white font-bold">{showUpsell.requiredTier}</span>.
                  </p>
                  <button 
                    onClick={() => setShowUpsell(null)}
                    className="w-full bg-ai-600 hover:bg-ai-500 text-black font-bold py-3 rounded-lg uppercase tracking-widest text-xs mb-3 shadow-lg"
                  >
                      Mejorar Plan
                  </button>
                  <button 
                    onClick={() => setShowUpsell(null)}
                    className="text-stone-500 hover:text-white text-xs uppercase tracking-widest font-bold"
                  >
                      Cerrar
                  </button>
              </div>
          </div>
      )}

      {/* --- UNIVERSAL DETAIL MODAL --- */}
      {selectedFeature && (
          <UniversalDetailModal 
            feature={selectedFeature}
            currentTier={userProfile.subscriptionTier}
            mockData={MOCK_DATA_VALUES[selectedFeature.id] || { value: '---', label: selectedFeature.name, source: 'SYSTEM' }}
            onClose={() => setSelectedFeature(null)}
          />
      )}

      {/* 1. HERO HEADER */}
      <div className="bg-dark-900 border-b border-stone-800 p-8 flex items-center justify-between shrink-0 relative overflow-hidden">
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
             // Logic
             const tierConfig = feature.tiers[userProfile.subscriptionTier];
             const hasTierAccess = tierConfig.access && status.isActive;
             const requiredTierName = Object.entries(feature.tiers).find(([_, cfg]) => cfg.access)?.[0] || 'SUPERIOR';
             const requiredPermissionId = feature.requiredPermissionId;
             const hasTechnicalPermission = !requiredPermissionId || userProfile.grantedPermissions.includes(requiredPermissionId);
             
             // Visual state logic
             const isVisible = hasTierAccess && hasTechnicalPermission;
             const mockData = MOCK_DATA_VALUES[feature.id] || { value: '---', label: feature.name, source: 'SYSTEM' };

             return (
                 <div 
                    key={feature.id} 
                    onClick={() => handleCardClick(feature, hasTierAccess, hasTechnicalPermission, requiredTierName)}
                    className={`relative rounded-sm border transition-all duration-300 group overflow-hidden cursor-pointer ${
                        isVisible
                            ? 'bg-stone-900/40 border-ai-500/20 hover:border-ai-500/50 hover:bg-stone-900/60 active:scale-[0.98]' 
                            : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                    }`}
                 >
                    {/* STATE 1: LOCKED BY TIER */}
                    {!hasTierAccess && (
                        <div className="absolute inset-0 z-20 backdrop-blur-sm bg-black/40 flex flex-col items-center justify-center text-center p-4 transition-opacity duration-300 group-hover:bg-black/50">
                            <Lock className="text-stone-600 mb-2 group-hover:text-stone-400 transition-colors" size={24} />
                            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                                Disponible en plan
                            </span>
                            <span className="text-xs font-serif font-bold text-stone-400 mt-1">
                                {requiredTierName}
                            </span>
                        </div>
                    )}

                    {/* STATE 2: BLOCKED BY PERMISSION */}
                    {hasTierAccess && !hasTechnicalPermission && (
                        <div className="absolute inset-0 z-20 backdrop-blur-md bg-amber-950/10 flex flex-col items-center justify-center text-center p-4 group-hover:bg-amber-950/20 transition-colors">
                            <div className="p-3 bg-amber-900/20 rounded-full mb-2 border border-amber-500/20">
                                <EyeOff className="text-amber-500" size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">
                                Datos Ocultos
                            </span>
                            <div className="flex items-center gap-1 text-[9px] text-stone-400">
                                <Settings size={10} />
                                <span>Active el permiso en Ajustes</span>
                            </div>
                        </div>
                    )}

                    {/* CONTENT */}
                    <div className={`p-5 h-full flex flex-col justify-between ${!isVisible ? 'opacity-10 blur-[3px]' : ''}`}>
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
                        {isVisible && (
                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ExternalLink size={12} className="text-ai-500" />
                            </div>
                        )}
                    </div>
                 </div>
             );
         })}
      </div>
    </div>
  );
};
