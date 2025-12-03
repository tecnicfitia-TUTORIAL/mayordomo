
import React, { useState, useEffect } from 'react';
import { UserProfile, PillarId, SubscriptionTier } from '../types';
import { TECHNICAL_PERMISSIONS, PILLAR_DEFINITIONS, getTierLevel } from '../constants';
import { Shield, Zap, Lock, ChevronRight, CheckCircle2, ArrowLeft, Database, Brain, Crown } from 'lucide-react';
import { MfaModal } from './MfaModal';

interface Props {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
  onClose: () => void;
  highlightPermissionId?: string;
}

// DEFINICIÓN DE PERMISOS CRÍTICOS (MFA GATE)
const CRITICAL_PERMISSIONS_IDS = [
    'func_digital_cert',  // Certificado Digital
    'func_dehu_sync',     // Conexión DEHú
    'func_open_banking',  // Banca PSD2
    'func_health_kit'     // Datos de Salud
];

export const PermissionsTreeScreen: React.FC<Props> = ({ profile, onUpdate, onClose, highlightPermissionId }) => {
  const [expandedPillars, setExpandedPillars] = useState<Set<PillarId>>(new Set([PillarId.CENTINELA]));
  
  // MFA STATE
  const [verifyingPermission, setVerifyingPermission] = useState<{id: string, label: string} | null>(null);

  // EFFECT: Handle Highlight Request
  useEffect(() => {
    if (highlightPermissionId) {
        const perm = TECHNICAL_PERMISSIONS.find(p => p.id === highlightPermissionId);
        if (perm && perm.relatedPillar) {
            // 1. Expand the pillar
            setExpandedPillars(prev => {
                const newSet = new Set(prev);
                newSet.add(perm.relatedPillar as PillarId);
                return newSet;
            });

            // 2. Scroll to element (after render)
            setTimeout(() => {
                const el = document.getElementById(`perm-${highlightPermissionId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    }
  }, [highlightPermissionId]);

  const togglePillar = (id: PillarId) => {
    const newSet = new Set(expandedPillars);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedPillars(newSet);
  };

  const handlePermissionClick = (perm: { id: string, label: string, minTier?: SubscriptionTier }) => {
      // 1. FILTRO DE SUSCRIPCIÓN (Tier Check)
      const userLevel = getTierLevel(profile.subscriptionTier);
      const reqLevel = getTierLevel(perm.minTier || SubscriptionTier.FREE);
      
      if (userLevel < reqLevel) {
          // Bloqueo por Nivel
          alert(`🔒 ACCESO RESTRINGIDO\n\nEsta es una función ejecutiva. Mejora tu plan a ${perm.minTier || 'Superior'} para desbloquearla.`);
          return;
      }

      // DEFENSIVE CODING: Handle undefined permissions
      const safePermissions = profile?.grantedPermissions || [];
      const isCurrentlyGranted = safePermissions.includes(perm.id);

      // CASO A: Si ya está activo y queremos desactivar -> No requiere MFA (Degradar seguridad es fácil)
      if (isCurrentlyGranted) {
          executeToggle(perm.id);
          return;
      }

      // CASO B: Si está inactivo y queremos activar -> Verificar si es CRÍTICO (MFA Gate)
      if (CRITICAL_PERMISSIONS_IDS.includes(perm.id)) {
          // Open MFA Modal
          setVerifyingPermission(perm);
      } else {
          // Standard Toggle
          executeToggle(perm.id);
      }
  };

  const executeToggle = (id: string) => {
    // DEFENSIVE CODING: Handle undefined permissions
    const safePermissions = profile?.grantedPermissions || [];
    const newSet = new Set(safePermissions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onUpdate({ ...profile, grantedPermissions: Array.from(newSet) });
  };

  const handleMfaSuccess = () => {
      if (verifyingPermission) {
          executeToggle(verifyingPermission.id);
          setVerifyingPermission(null);
      }
  };

  const systemicPermissions = TECHNICAL_PERMISSIONS.filter(p => p.category === 'SYSTEMIC');
  const functionalPermissions = TECHNICAL_PERMISSIONS.filter(p => p.category === 'FUNCTIONAL');

  // Group functional permissions by Pillar
  const permissionsByPillar = functionalPermissions.reduce((acc, perm) => {
    if (!acc[perm.relatedPillar]) {
      acc[perm.relatedPillar] = [];
    }
    acc[perm.relatedPillar].push(perm);
    return acc;
  }, {} as Record<PillarId, typeof functionalPermissions>);

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0a09] flex flex-col animate-fadeIn">
      
      {/* MFA MODAL LAYER */}
      {verifyingPermission && (
          <MfaModal 
            permissionLabel={verifyingPermission.label}
            onVerified={handleMfaSuccess}
            onClose={() => setVerifyingPermission(null)}
          />
      )}

      {/* Header */}
      <div className="p-6 border-b border-stone-800 flex items-center justify-between bg-dark-900">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-serif font-bold text-ai-500 flex items-center gap-2">
              <Shield size={20} /> Protocolos y Permisos
            </h1>
            <p className="text-xs text-stone-500 uppercase tracking-widest">Centro de Mando Técnico</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* BLOCK 1: ROOT / SYSTEMIC */}
          <section className="bg-stone-950 border border-stone-800 rounded-lg p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Database size={64} className="text-stone-500" />
             </div>
             
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-stone-900 rounded-full text-stone-400 border border-stone-700">
                   <Lock size={18} />
                </div>
                <div>
                   <h2 className="text-sm font-bold text-white uppercase tracking-widest">Permisos Generales (Núcleo)</h2>
                   <p className="text-xs text-stone-500 mt-1">Protocolos base aceptados en el registro. Inmutables para garantizar la seguridad.</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemicPermissions.map(perm => (
                   <div key={perm.id} className="flex items-center gap-3 p-3 bg-stone-900/50 rounded-sm border border-stone-800 opacity-70">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <div>
                         <div className="text-xs font-bold text-stone-300">{perm.label}</div>
                         <div className="text-[9px] text-stone-500">{perm.description}</div>
                      </div>
                   </div>
                ))}
             </div>
          </section>

          {/* LINE CONNECTOR */}
          <div className="flex justify-center">
             <div className="h-8 w-px bg-gradient-to-b from-stone-800 to-ai-900/50"></div>
          </div>

          {/* BLOCK 2: OPERATIONAL BRANCHES */}
          <section>
             <div className="flex items-center gap-3 mb-6 justify-center">
                <div className="p-2 bg-ai-900/10 rounded-full text-ai-500 border border-ai-500/30">
                   <Brain size={18} />
                </div>
                <h2 className="text-sm font-bold text-ai-500 uppercase tracking-widest">Permisos Operativos del Mayordomo</h2>
             </div>

             <div className="space-y-4">
                {Object.keys(PILLAR_DEFINITIONS).map((pillarIdStr) => {
                   const pillarId = pillarIdStr as PillarId;
                   const def = PILLAR_DEFINITIONS[pillarId];
                   const perms = permissionsByPillar[pillarId] || [];
                   const isExpanded = expandedPillars.has(pillarId);
                   // DEFENSIVE CODING: Handle undefined permissions
                   const safePermissions = profile?.grantedPermissions || [];
                   const activeCount = perms.filter(p => safePermissions.includes(p.id)).length;

                   return (
                      <div key={pillarId} className={`border rounded-lg transition-all duration-300 ${isExpanded ? 'bg-stone-900 border-ai-500/30' : 'bg-stone-950 border-stone-800 hover:border-stone-700'}`}>
                         
                         {/* Header Accordion */}
                         <button 
                            onClick={() => togglePillar(pillarId)}
                            className="w-full flex items-center justify-between p-4"
                         >
                            <div className="flex items-center gap-4">
                               <div className={`text-stone-400 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-ai-500' : ''}`}>
                                  <ChevronRight size={18} />
                               </div>
                               <div className="text-left">
                                  <div className="text-sm font-bold text-stone-200">{def.name}</div>
                                  <div className="text-[10px] text-stone-500">{def.description}</div>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="text-[10px] font-mono text-stone-500">
                                  {activeCount} / {perms.length} Activos
                               </div>
                               <div className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-stone-700'}`}></div>
                            </div>
                         </button>

                         {/* Body */}
                         {isExpanded && (
                            <div className="p-4 pt-0 pl-12 space-y-3 animate-fadeIn border-t border-stone-800/50 mt-2">
                               {perms.map(perm => {
                                  // DEFENSIVE CODING: Handle undefined permissions
                                  const isGranted = safePermissions.includes(perm.id);
                                  const isCritical = CRITICAL_PERMISSIONS_IDS.includes(perm.id);
                                  
                                  // LOGIC: Check Tier Lock
                                  const userLevel = getTierLevel(profile.subscriptionTier);
                                  const reqLevel = getTierLevel(perm.minTier || SubscriptionTier.FREE);
                                  const isLockedByTier = userLevel < reqLevel;
                                  
                                  // HIGHLIGHT LOGIC
                                  const isHighlighted = perm.id === highlightPermissionId;

                                  return (
                                     <div 
                                        key={perm.id} 
                                        id={`perm-${perm.id}`}
                                        className={`flex items-center justify-between p-3 rounded-sm transition-all duration-500 group 
                                            ${isLockedByTier ? 'opacity-50' : 'hover:bg-black/20'}
                                            ${isHighlighted ? 'bg-ai-900/20 border border-ai-500 shadow-[0_0_15px_rgba(217,70,239,0.15)]' : 'border border-transparent'}
                                        `}
                                     >
                                        <div className="flex items-center gap-3">
                                           <div className={`p-1.5 rounded-full ${isGranted ? 'bg-ai-900/20 text-ai-500' : 'bg-stone-800 text-stone-600'}`}>
                                              {isLockedByTier ? <Lock size={12} /> : <Zap size={12} />}
                                           </div>
                                           <div>
                                              <div className={`text-xs font-bold transition-colors flex items-center gap-2 ${isGranted ? 'text-stone-200' : 'text-stone-500 group-hover:text-stone-400'}`}>
                                                 {perm.label}
                                                 {isCritical && !isLockedByTier && (
                                                   <span title="Alta Seguridad (MFA)" className="flex items-center">
                                                     <Shield size={10} className="text-ai-500" />
                                                   </span>
                                                 )}
                                              </div>
                                              <div className="text-[10px] text-stone-600 italic">
                                                 {isLockedByTier ? `Requiere ${perm.minTier}` : perm.description}
                                              </div>
                                           </div>
                                        </div>
                                        
                                        {/* Toggle Switch */}
                                        <button 
                                           onClick={() => handlePermissionClick(perm)}
                                           className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isLockedByTier ? 'bg-stone-900 cursor-not-allowed' : (isGranted ? 'bg-ai-600' : 'bg-stone-800')}`}
                                        >
                                           <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${isGranted ? 'translate-x-5' : 'translate-x-0'} ${isLockedByTier ? 'opacity-20' : ''}`}></div>
                                        </button>
                                     </div>
                                  );
                               })}
                            </div>
                         )}
                      </div>
                   );
                })}
             </div>
          </section>

        </div>
      </div>
    </div>
  );
};
