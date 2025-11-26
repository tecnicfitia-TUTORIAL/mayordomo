import React, { useState, useEffect } from 'react';
import { NotificationConfig, UserProfile, SubscriptionTier, LifeStageConfig, PermissionItem } from '../types';
import { SUBSCRIPTION_PLANS, getTierLevel } from '../constants';
import { X, ShieldAlert, Clock, Wallet, Heart, Zap, CreditCard, Check, Trash2, Settings as SettingsIcon, Sliders, Lock, ToggleLeft, ToggleRight, BellRing } from 'lucide-react';

interface Props {
  config: NotificationConfig;
  userProfile: UserProfile;
  lifeStageConfig: LifeStageConfig | null;
  activeIntegrations: string[];
  onSave: (config: NotificationConfig) => void;
  onUpdateSubscription: (tier: SubscriptionTier) => void;
  onTogglePermission: (id: string) => void;
  onBulkToggle: (ids: string[], action: 'ENABLE' | 'DISABLE') => void;
  onHardReset?: () => void;
  onClose: () => void;
}

interface SettingRowProps {
  label: string;
  desc: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

export const SettingsModal: React.FC<Props> = ({ 
    config, 
    userProfile, 
    lifeStageConfig,
    activeIntegrations,
    onSave, 
    onUpdateSubscription, 
    onTogglePermission,
    onBulkToggle,
    onHardReset, 
    onClose 
}) => {
    const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'SUBSCRIPTION' | 'PERMISSIONS'>('SUBSCRIPTION');
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

    useEffect(() => {
        if ("Notification" in window) {
            setPermissionStatus(Notification.permission);
        }
    }, []);

    const requestPermission = () => {
        if (!("Notification" in window)) {
            alert("Tu navegador no soporta notificaciones.");
            return;
        }
        Notification.requestPermission().then(permission => {
            setPermissionStatus(permission);
            if (permission === 'granted') {
                // Optionally send a test notification
                new Notification("Confort OS", { body: "Notificaciones activadas correctamente." });
            }
        });
    };

    const toggle = (key: keyof NotificationConfig) => {
        onSave({ ...config, [key]: !config[key] });
    };

    // Helper to handle bulk toggle for a module
    const handleModuleToggle = (permissions: PermissionItem[]) => {
        const userTierLevel = getTierLevel(userProfile.subscriptionTier);
        // Filter only unlocked permissions for this tier
        const unlockedPermissions = permissions.filter(p => userTierLevel >= getTierLevel(p.minTier));
        const ids = unlockedPermissions.map(p => p.id);
        
        // Check if all unlocked are currently active
        const allActive = ids.every(id => activeIntegrations.includes(id));
        
        // If all are active, disable them. Otherwise, enable them.
        onBulkToggle(ids, allActive ? 'DISABLE' : 'ENABLE');
    };

    const SettingRow: React.FC<SettingRowProps> = ({ label, desc, icon, active, onClick }) => (
        <div onClick={onClick} className="flex items-center justify-between cursor-pointer group p-3 rounded-xl hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors text-slate-300 shadow-inner">{icon}</div>
                <div>
                    <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{label}</div>
                    <div className="text-xs text-slate-500">{desc}</div>
                </div>
            </div>
            <div className={`w-11 h-6 rounded-full relative transition-colors duration-300 ease-in-out ${active ? 'bg-ai-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${active ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        Configuración
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-full"><X size={20}/></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-950/50 overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('SUBSCRIPTION')}
                        className={`flex-1 min-w-[100px] py-3 text-sm font-medium transition-colors relative ${activeTab === 'SUBSCRIPTION' ? 'text-ai-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Suscripción
                        {activeTab === 'SUBSCRIPTION' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-ai-400" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('PERMISSIONS')}
                        className={`flex-1 min-w-[100px] py-3 text-sm font-medium transition-colors relative ${activeTab === 'PERMISSIONS' ? 'text-ai-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Permisos
                        {activeTab === 'PERMISSIONS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-ai-400" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('NOTIFICATIONS')}
                        className={`flex-1 min-w-[100px] py-3 text-sm font-medium transition-colors relative ${activeTab === 'NOTIFICATIONS' ? 'text-ai-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Alertas
                        {activeTab === 'NOTIFICATIONS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-ai-400" />}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-2 overflow-y-auto custom-scrollbar flex-1">
                    
                    {activeTab === 'NOTIFICATIONS' && (
                        <>
                            {permissionStatus !== 'granted' && (
                                <div className="mb-4 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg flex items-center justify-between">
                                    <div className="text-xs text-amber-200">
                                        Las notificaciones están desactivadas en el navegador.
                                    </div>
                                    <button 
                                        onClick={requestPermission}
                                        className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <BellRing size={12} /> Activar
                                    </button>
                                </div>
                            )}

                            <p className="text-sm text-slate-400 mb-4 px-1">
                                Define qué tipo de interrupciones permites a tu Mayordomo Digital.
                            </p>
                            <div className="space-y-1">
                                <SettingRow 
                                    label="Resumen Matutino" 
                                    desc="Briefing diario de agenda y objetivos."
                                    icon={<Clock size={18} className="text-blue-400"/>}
                                    active={config.morningSummary}
                                    onClick={() => toggle('morningSummary')}
                                />
                                <SettingRow 
                                    label="Alertas Críticas" 
                                    desc="Riesgos de seguridad o plazos fatales."
                                    icon={<ShieldAlert size={18} className="text-red-400"/>}
                                    active={config.urgentAlerts}
                                    onClick={() => toggle('urgentAlerts')}
                                />
                                <SettingRow 
                                    label="Consejos Financieros" 
                                    desc="Oportunidades de ahorro y mercado."
                                    icon={<Wallet size={18} className="text-amber-400"/>}
                                    active={config.savingsTips}
                                    onClick={() => toggle('savingsTips')}
                                />
                                <SettingRow 
                                    label="Bienestar y Salud" 
                                    desc="Recordatorios de descanso y ergonomía."
                                    icon={<Heart size={18} className="text-pink-400"/>}
                                    active={config.healthReminders}
                                    onClick={() => toggle('healthReminders')}
                                />
                                <SettingRow 
                                    label="Evolución del Sistema" 
                                    desc="Avisos sobre nuevos permisos o mejoras."
                                    icon={<Zap size={18} className="text-green-400"/>}
                                    active={config.systemUpdates}
                                    onClick={() => toggle('systemUpdates')}
                                />
                            </div>
                        </>
                    )}

                    {activeTab === 'SUBSCRIPTION' && (
                        <>
                           <div className="mb-4 p-4 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase">Plan Actual</p>
                                    <h3 className="text-lg font-bold text-white">{SUBSCRIPTION_PLANS.find(p => p.id === userProfile.subscriptionTier)?.name}</h3>
                                    <p className="text-xs text-ai-400">{SUBSCRIPTION_PLANS.find(p => p.id === userProfile.subscriptionTier)?.price}</p>
                                </div>
                                <div className="p-3 bg-slate-700 rounded-full text-ai-400">
                                    <CreditCard size={24} />
                                </div>
                           </div>

                           <p className="text-xs text-slate-500 mb-3">Selecciona un nuevo plan para cambiar tu nivel de autonomía.</p>

                           <div className="space-y-3">
                                {SUBSCRIPTION_PLANS.map(plan => (
                                    <div 
                                        key={plan.id}
                                        onClick={() => onUpdateSubscription(plan.id)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${userProfile.subscriptionTier === plan.id ? 'border-ai-500 bg-ai-900/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
                                    >
                                        <div>
                                            <div className="font-bold text-white text-sm">{plan.name}</div>
                                            <div className="text-xs text-slate-500">{plan.price} • {plan.aiBehavior}</div>
                                        </div>
                                        {userProfile.subscriptionTier === plan.id && (
                                            <div className="text-ai-500 bg-ai-500/10 p-1 rounded-full">
                                                <Check size={16} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                           </div>
                           
                           <div className="mt-4 p-3 bg-amber-900/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-400">
                                <strong>Aviso de Seguridad:</strong> Al cambiar a un plan inferior, los módulos avanzados que ya no estén cubiertos por tu suscripción se desactivarán inmediatamente y perderás el acceso a esas funciones de gestión.
                           </div>
                        </>
                    )}

                    {activeTab === 'PERMISSIONS' && lifeStageConfig && (
                        <div className="space-y-6">
                            <div className="bg-slate-800/50 p-3 rounded-lg text-xs text-slate-400 border border-slate-700/50">
                                Gestiona el acceso del sistema a cada módulo. Los permisos bloqueados requieren un plan superior para activarse.
                            </div>
                            {lifeStageConfig.modules.map((module) => {
                                const userTierLevel = getTierLevel(userProfile.subscriptionTier);
                                const unlockedPermissions = module.permissions.filter(p => userTierLevel >= getTierLevel(p.minTier));
                                const unlockedIds = unlockedPermissions.map(p => p.id);
                                const allActive = unlockedIds.length > 0 && unlockedIds.every(id => activeIntegrations.includes(id));
                                
                                return (
                                    <div key={module.id} className="space-y-2">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                                            <h4 className="text-xs font-bold text-ai-500 uppercase tracking-widest">
                                                {module.title}
                                            </h4>
                                            {unlockedPermissions.length > 0 && (
                                                <button 
                                                    onClick={() => handleModuleToggle(module.permissions)}
                                                    className="text-[10px] text-slate-500 hover:text-ai-400 flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-slate-800"
                                                    title={allActive ? "Desactivar Todo el Módulo" : "Activar Todo el Módulo"}
                                                >
                                                    {allActive ? "Desactivar Todo" : "Activar Todo"}
                                                    {allActive ? <ToggleRight size={14} className="text-ai-500" /> : <ToggleLeft size={14} />}
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            {module.permissions.map((perm) => {
                                                const isActive = activeIntegrations.includes(perm.id);
                                                const requiredTierLevel = getTierLevel(perm.minTier);
                                                const isLocked = userTierLevel < requiredTierLevel;

                                                return (
                                                    <div 
                                                        key={perm.id}
                                                        onClick={() => !isLocked && onTogglePermission(perm.id)}
                                                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                                            isLocked 
                                                                ? 'border-transparent opacity-50 bg-slate-900' 
                                                                : 'bg-slate-800 border-slate-700 cursor-pointer hover:border-slate-600'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-1.5 rounded-md ${isLocked ? 'bg-slate-800 text-slate-600' : isActive ? 'bg-ai-500/20 text-ai-500' : 'bg-slate-700 text-slate-400'}`}>
                                                                {isLocked ? <Lock size={14} /> : <Sliders size={14} />}
                                                            </div>
                                                            <div>
                                                                <div className={`text-xs font-medium ${isLocked ? 'text-slate-500' : isActive ? 'text-white' : 'text-slate-400'}`}>
                                                                    {perm.label}
                                                                </div>
                                                                {isLocked && (
                                                                    <div className="text-[9px] text-amber-700 font-mono">Requiere Plan {perm.minTier}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {!isLocked && (
                                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${isActive ? 'bg-ai-500' : 'bg-slate-600'}`}>
                                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isActive ? 'right-0.5' : 'left-0.5'}`} />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                </div>
                <div className="p-5 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
                     {onHardReset && (
                         <button 
                            onClick={onHardReset}
                            className="text-red-500 hover:text-red-400 text-xs font-bold flex items-center gap-1 px-2 py-1 hover:bg-red-900/20 rounded transition-colors"
                            title="Borrar todos los datos y reiniciar"
                         >
                             <Trash2 size={14} /> Reiniciar Demo
                         </button>
                     )}
                     <button onClick={onClose} className="bg-ai-600 hover:bg-ai-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-ai-500/20">
                        {activeTab === 'SUBSCRIPTION' || activeTab === 'PERMISSIONS' ? 'Cerrar' : 'Guardar Preferencias'}
                     </button>
                </div>
            </div>
        </div>
    );
};