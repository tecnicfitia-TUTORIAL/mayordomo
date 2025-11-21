
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HouseSector, Insight, Owner, UserProfile, SubscriptionTier, LifeStageConfig, PermissionItem, NotificationConfig } from './types';
import { getInitialSectors, SUBSCRIPTION_PLANS, getPermissionsByProfile, ADMIN_EMAILS, DEFAULT_NOTIFICATIONS, SUPPORT_EMAILS, getTierLevel } from './constants';
import { SectorCard } from './components/SectorCard';
import { ChatInterface } from './components/ChatInterface';
import { InsightFeed } from './components/InsightFeed';
import { Onboarding } from './components/Onboarding';
import { EvolutionPanel } from './components/EvolutionPanel';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { InstallBanner } from './components/InstallBanner';
import { generateInsights, optimizeSector } from './services/geminiService';
import { Settings, Sparkles, User as UserIcon, Activity, Crown, Shield, Network, LogOut, HelpCircle, ShieldCheck } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Logo } from './components/Logo';

const PROFILE_STORAGE_KEY = 'confort_profile';
const INTEGRATIONS_STORAGE_KEY = 'confort_integrations';

const App: React.FC = () => {
  // State for User Profile (If null, show onboarding)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeIntegrations, setActiveIntegrations] = useState<string[]>([]);
  
  // Permissions State (Managed at App level now for Evolution)
  const [lifeStageConfig, setLifeStageConfig] = useState<LifeStageConfig | null>(null);

  // App Settings
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(DEFAULT_NOTIFICATIONS);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSecurityToast, setShowSecurityToast] = useState(false);

  const [sectors, setSectors] = useState<HouseSector[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [showEvolutionPanel, setShowEvolutionPanel] = useState(false);
  
  // Load Persistence on Mount
  useEffect(() => {
    const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    const storedIntegrations = localStorage.getItem(INTEGRATIONS_STORAGE_KEY);

    if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        // Only restore if setup was explicitly completed
        if (parsedProfile.setupCompleted) {
            setUserProfile(parsedProfile);
            const integrations = storedIntegrations ? JSON.parse(storedIntegrations) : [];
            setActiveIntegrations(integrations);
            // Re-hydrate Sectors & Config
            hydrateApp(parsedProfile, integrations);
        }
    }
  }, []);

  const hydrateApp = (profile: UserProfile, integrations: string[]) => {
      // Generate Config based on profile
      const initialConfig = getPermissionsByProfile(profile.age, profile.gender);
      // Sync the boolean state based on 'integrations' (which are just IDs)
      const configWithState = {
          ...initialConfig,
          modules: initialConfig.modules.map(m => ({
              ...m,
              permissions: m.permissions.map(p => ({
                  ...p,
                  defaultEnabled: integrations.includes(p.id)
              }))
          }))
      };
      setLifeStageConfig(configWithState);

      // Generate Dynamic Sectors
      const dynamicSectors = getInitialSectors(profile);
      setSectors(dynamicSectors);
  };

  // Derived stats
  const stats = useMemo(() => {
    if (sectors.length === 0) return { aiPercentage: 0, userPercentage: 0, aiEfficiency: 0 };
    
    const total = sectors.length;
    const aiCount = sectors.filter(s => s.owner === Owner.AI).length;
    const aiPercentage = Math.round((aiCount / total) * 100);
    const userPercentage = 100 - aiPercentage;
    
    const aiSectors = sectors.filter(s => s.owner === Owner.AI);
    const aiEfficiency = aiSectors.length > 0 
        ? Math.round(aiSectors.reduce((acc, c) => acc + c.efficiency, 0) / aiCount)
        : 0;
    
    return { aiPercentage, userPercentage, aiEfficiency };
  }, [sectors]);

  // Admin Check Logic
  const isAdmin = useMemo(() => {
    if (!userProfile?.email) return false;
    return ADMIN_EMAILS.includes(userProfile.email) || SUPPORT_EMAILS.includes(userProfile.email);
  }, [userProfile]);

  const chartData = [
    { name: 'Soporte IA', value: stats.aiPercentage || 1, color: '#14b8a6' }, // Teal
    { name: 'Tu Zona Vital', value: stats.userPercentage || 1, color: '#f97316' }, // Orange
  ];

  // Handlers
  const handleOnboardingComplete = (profile: UserProfile, integrations: string[]) => {
    // Save to Storage
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(integrations));

    setUserProfile({ ...profile, setupCompleted: true });
    setActiveIntegrations(integrations);
    hydrateApp(profile, integrations);
  };

  const handleLogout = () => {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem(INTEGRATIONS_STORAGE_KEY);
      setUserProfile(null);
      setSectors([]);
      setInsights([]);
      setActiveIntegrations([]);
  };

  // Handle Plan Change & Granular Scope Permissions
  const handleUpdateSubscription = (newTier: SubscriptionTier) => {
    if (!userProfile || !lifeStageConfig) return;

    // 1. Update Profile
    const updatedProfile = { ...userProfile, subscriptionTier: newTier };
    setUserProfile(updatedProfile);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));

    // 2. SCOPING LOGIC: Granular Permission Check
    // Iterate over all defined permissions globally to find restrictions
    const globalModules = getPermissionsByProfile(updatedProfile.age, updatedProfile.gender).modules;
    const newTierLevel = getTierLevel(newTier);
    
    // Find IDs that are FORBIDDEN in the new tier
    const forbiddenIds = new Set<string>();
    globalModules.forEach(mod => {
        mod.permissions.forEach(p => {
            if (getTierLevel(p.minTier) > newTierLevel) {
                forbiddenIds.add(p.id);
            }
        });
    });
    
    // Filter active integrations removing forbidden ones
    const needsScoping = activeIntegrations.some(id => forbiddenIds.has(id));
    
    let finalIntegrations = activeIntegrations;

    if (needsScoping) {
        finalIntegrations = activeIntegrations.filter(id => !forbiddenIds.has(id));
        setActiveIntegrations(finalIntegrations);
        localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(finalIntegrations));
        
        // Re-hydrate with new permissions and tier
        hydrateApp(updatedProfile, finalIntegrations);
        alert(`Plan actualizado a ${SUBSCRIPTION_PLANS.find(p => p.id === newTier)?.name}. Se han desactivado ${activeIntegrations.length - finalIntegrations.length} permisos avanzados que no incluye este plan.`);
    } else {
        // Just upgrading or changing to a parallel plan
        hydrateApp(updatedProfile, finalIntegrations);
        alert(`Plan actualizado a ${SUBSCRIPTION_PLANS.find(p => p.id === newTier)?.name}.`);
    }
  };

  // Handle Adding a NEW permission via Evolution Mechanism
  const handleAddPermission = (moduleId: string, newPermission: PermissionItem) => {
    if (!lifeStageConfig) return;

    setLifeStageConfig(prev => {
        if (!prev) return null;
        return {
            ...prev,
            modules: prev.modules.map(mod => {
                // Try to find exact module match, or default to first one if not found (fallback)
                if (mod.id === moduleId || (moduleId === 'unknown' && mod.id === prev.modules[0].id)) {
                    return {
                        ...mod,
                        permissions: [...mod.permissions, newPermission]
                    };
                }
                return mod;
            })
        };
    });
    
    // Also add to active integrations so logic knows about it
    const newIntegrations = [...activeIntegrations, newPermission.id];
    setActiveIntegrations(newIntegrations);
    localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(newIntegrations));
    
    alert(`NUEVO PERMISO EVOLUTIVO: "${newPermission.label}" ha sido añadido a tu ecosistema.`);
  };

  const triggerSecurityToast = () => {
    setShowSecurityToast(true);
    setTimeout(() => setShowSecurityToast(false), 3000);
  };

  const handleGenerateInsights = useCallback(async () => {
    if (sectors.length === 0) return;
    setGeneratingInsights(true);
    const newInsights = await generateInsights(sectors, userProfile || undefined);
    setInsights(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const filteredNew = newInsights.filter(i => !existingIds.has(i.id));
        return [...prev, ...filteredNew];
    }); 
    setGeneratingInsights(false);
  }, [sectors, userProfile]);

  // --- SIMULATION ENGINE: Mobile Behavior Simulation ---
  useEffect(() => {
    if (!userProfile) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // 1. ESCENARIO: Sincronización Email (El "Dardo" original)
    if (activeIntegrations.includes('gd_basic_1')) {
      timers.push(setTimeout(() => {
        setInsights(prev => {
             if (prev.find(i => i.id === 'dardo-email')) return prev;
             return [{
                id: 'dardo-email',
                sectorId: 'finance-1', 
                title: 'Correo: Póliza Detectada',
                description: `Detecté "Poliza_2024.pdf" en tu email. Vence pronto. He bloqueado la fecha en tu calendario.`,
                impact: 'HIGH',
                actionable: true
             }, ...prev];
        });
      }, 4000));
    }

    // 2. ESCENARIO: Escaneo de Galería (Imágenes)
    if (activeIntegrations.includes('gd_prem_3')) {
        timers.push(setTimeout(() => {
            setInsights(prev => {
                if (prev.find(i => i.id === 'dardo-img')) return prev;
                return [{
                    id: 'dardo-img',
                    sectorId: 'finance-1',
                    title: 'Galería: Oportunidad',
                    description: 'Analicé tu última captura (Zapatillas). Las encontré un 15% más baratas.',
                    impact: 'MEDIUM',
                    actionable: true
                }, ...prev];
            });
        }, 10000));
    }

    // 3. ESCENARIO: Historial de Navegación/Videos (Intereses)
    if (activeIntegrations.includes('gd_elite_2')) {
        timers.push(setTimeout(() => {
            setInsights(prev => {
                if (prev.find(i => i.id === 'dardo-web')) return prev;
                return [{
                    id: 'dardo-web',
                    sectorId: 'career-1',
                    title: 'Web: Interés Detectado',
                    description: 'Veo que has visitado 5 sitios de Fotografía. ¿Filtro los 3 mejores cursos?',
                    impact: 'LOW',
                    actionable: true
                }, ...prev];
            });
        }, 15000));
    }

    // 4. ESCENARIO: Finanzas App
    if (activeIntegrations.includes('fc_basic_2')) {
        timers.push(setTimeout(() => {
            setInsights(prev => {
                if (prev.find(i => i.id === 'dardo-app')) return prev;
                return [{
                    id: 'dardo-app',
                    sectorId: 'finance-1',
                    title: 'App Store: Gasto',
                    description: 'Has gastado 15€ en juegos. ¿Activo límite mensual?',
                    impact: 'MEDIUM',
                    actionable: true
                }, ...prev];
            });
        }, 20000));
    }

    // 5. ESCENARIO: Bio-Feedback
    if (activeIntegrations.includes('be_prem_1') || activeIntegrations.includes('be_elite_1')) {
        timers.push(setTimeout(() => {
            setInsights(prev => {
                if (prev.find(i => i.id === 'dardo-bio')) return prev;
                return [{
                    id: 'dardo-bio',
                    sectorId: 'health-1',
                    title: 'Salud: Energía Baja',
                    description: 'Tu wearable indica mal sueño. Recomiendo cancelar la primera reunión.',
                    impact: 'HIGH',
                    actionable: true
                }, ...prev];
            });
        }, 8000));
    }
    
    // Escaneo inicial general - INCREASED DELAY TO 5s to avoid collision with EvolutionPanel or initial layout
    if(activeIntegrations.length > 0) {
        timers.push(setTimeout(() => handleGenerateInsights(), 5000));
    }

    return () => timers.forEach(t => clearTimeout(t));
  }, [userProfile, activeIntegrations, handleGenerateInsights]);

  const handleOptimize = async (sector: HouseSector) => {
    setOptimizingId(sector.id);
    const result = await optimizeSector(sector, userProfile || undefined);
    
    setSectors(prev => prev.map(s => {
      if (s.id === sector.id) {
        return { ...s, efficiency: result.newEfficiency, status: 'OPTIMAL', description: result.message };
      }
      return s;
    }));
    setOptimizingId(null);
  };

  const handleDismissInsight = (id: string) => {
    setInsights(prev => prev.filter(i => i.id !== id));
  };

  const handleApplyInsight = (id: string) => {
    const insight = insights.find(i => i.id === id);
    if (insight) {
        if (id === 'dardo-email') {
          alert("ACCIÓN REALIZADA: Fecha agendada y recordatorio configurado.");
        } else if (id === 'dardo-img') {
          alert("ACCIÓN REALIZADA: Enlace guardado en lista de deseos.");
        } else if (id === 'dardo-web') {
          alert("ACCIÓN REALIZADA: Cursos enviados al email.");
        } else if (id === 'dardo-app') {
          alert("ACCIÓN REALIZADA: Límite configurado.");
        } else if (id === 'dardo-bio') {
          alert("MAYORDOMO: Reunión cancelada. Descansa.");
        } else {
          setSectors(prev => prev.map(s => {
            if(s.owner === Owner.AI && s.efficiency < 100) {
                return { ...s, efficiency: Math.min(s.efficiency + 15, 100) };
            }
            return s;
        }));
        }
    }
    handleDismissInsight(id);
  };

  // Get Plan Details
  const currentPlan = userProfile ? SUBSCRIPTION_PLANS.find(p => p.id === userProfile.subscriptionTier) : null;

  // Render Onboarding if no profile
  if (!userProfile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-ai-500/30 pb-20 md:pb-0 relative">
      
      <InstallBanner />

      {/* Security Toast */}
      {showSecurityToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-900/90 text-emerald-300 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xl border border-emerald-500/30 backdrop-blur-sm">
            <ShieldCheck size={14} /> Encriptación de Núcleo: ACTIVA
        </div>
      )}
      
      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal 
            config={notificationConfig}
            userProfile={userProfile}
            onSave={(newConfig) => {
                setNotificationConfig(newConfig);
                setShowSettingsModal(false);
            }}
            onUpdateSubscription={handleUpdateSubscription}
            onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Help Modal */}
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}

      {/* Evolution Overlay (Admin Only) */}
      {showEvolutionPanel && lifeStageConfig && isAdmin && (
        <EvolutionPanel 
            profile={userProfile}
            lifeStageConfig={lifeStageConfig}
            onAddPermission={handleAddPermission}
            onClose={() => setShowEvolutionPanel(false)}
        />
      )}

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#020617]/90 backdrop-blur-md border-b border-white/5 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10">
            <Logo className="w-full h-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold tracking-tight leading-none">Confort <span className="font-light text-slate-500">65/35</span></h1>
                {/* Security Badge */}
                <div 
                    onClick={triggerSecurityToast}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-900/20 border border-emerald-500/20 rounded text-[9px] font-bold text-emerald-500 cursor-pointer hover:bg-emerald-900/40 transition-colors"
                >
                    <ShieldCheck size={10} />
                    <span className="hidden sm:inline tracking-wider">VERIFICADO</span>
                </div>
            </div>
            <p className="hidden md:block text-[10px] text-ai-500 font-mono tracking-widest uppercase">Modo: {userProfile.archetype}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-4">
          {/* Subscription Badge - Hidden on small mobile */}
          {currentPlan && (
             <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border bg-opacity-10 
                ${userProfile.subscriptionTier === SubscriptionTier.ELITE ? 'border-amber-500/30 bg-amber-500 text-amber-400' : 
                  userProfile.subscriptionTier === SubscriptionTier.PREMIUM ? 'border-purple-500/30 bg-purple-500 text-purple-400' :
                  userProfile.subscriptionTier === SubscriptionTier.BASIC ? 'border-blue-500/30 bg-blue-500 text-blue-400' :
                  'border-slate-700 bg-slate-800 text-slate-400'
                }
             `}>
                {userProfile.subscriptionTier === SubscriptionTier.ELITE ? <Crown size={12} /> : <Shield size={12} />}
                <span className="text-[10px] font-bold uppercase tracking-wider">{currentPlan.name}</span>
             </div>
          )}

          {/* Evolution Button (Admin Access Only) */}
          {isAdmin && (
            <button 
                onClick={() => setShowEvolutionPanel(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-900/20 text-green-500 rounded-full border border-green-500/30 hover:bg-green-900/40 transition-all"
            >
                <Network size={14} />
                <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">Admin</span>
            </button>
          )}
          
          {/* User Name - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
            <UserIcon size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-300">{userProfile.name}</span>
          </div>

          {/* Help Button */}
          <button 
            onClick={() => setShowHelpModal(true)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            title="Ayuda"
          >
            <HelpCircle size={20} />
          </button>
          
          {/* Settings Button */}
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
          >
            <Settings size={20} className="text-slate-400" />
          </button>

           {/* Logout Button */}
           <button 
            onClick={handleLogout}
            className="p-2 hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-full transition-colors ml-1"
            title="Cerrar Sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="pt-20 md:pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto animate-fadeIn">
        
        {/* Top Stats Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-12">
          
          {/* The Split Viz */}
          <div className="lg:col-span-1 bg-slate-900/50 border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-20">
                <Activity size={48} className="text-ai-500" />
             </div>
             <h2 className="text-lg font-semibold text-slate-200 mb-4 z-10">Balance Vital</h2>
             
             <div className="flex-1 flex items-center justify-center -ml-4">
                <ResponsiveContainer width="100%" height={200}>
                    <RePieChart>
                        <Pie
                            data={chartData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ color: '#e2e8f0' }}
                        />
                    </RePieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-white">{stats.aiEfficiency}%</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest">Eficiencia</span>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4 mt-4 z-10">
                <div className="text-center p-2 rounded-xl bg-slate-800/50">
                    <div className="text-xs text-slate-400 mb-1">Carga IA</div>
                    <div className="text-xl font-bold text-ai-400">{stats.aiPercentage}%</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-slate-800/50">
                    <div className="text-xs text-slate-400 mb-1">Tu Foco</div>
                    <div className="text-xl font-bold text-user-400">{stats.userPercentage}%</div>
                </div>
             </div>
          </div>

          {/* Insight Feed (Dynamic) */}
          <div className="lg:col-span-2 flex flex-col">
             <InsightFeed 
                insights={insights} 
                onApply={handleApplyInsight}
                onDismiss={handleDismissInsight}
             />
             
             {/* Chat Interface takes remaining space or fixed height */}
             <div className="flex-1 min-h-[400px]">
                <ChatInterface sectors={sectors} userProfile={userProfile || undefined} />
             </div>
          </div>

        </section>

        {/* Sectors Grid */}
        <section>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white tracking-tight">Arquitectura del Sistema</h2>
                <div className="flex gap-2">
                    {generatingInsights && (
                        <span className="text-xs text-ai-400 flex items-center gap-1 animate-pulse">
                            <Sparkles size={12} /> Escaneando...
                        </span>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sectors.map((sector) => (
                    <SectorCard 
                        key={sector.id} 
                        sector={sector} 
                        onOptimize={handleOptimize}
                        loading={optimizingId === sector.id}
                    />
                ))}
            </div>
        </section>

      </main>
    </div>
  );
};

export default App;
