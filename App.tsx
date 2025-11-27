
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HouseSector, Insight, Owner, UserProfile, SubscriptionTier, LifeStageConfig, PermissionItem, NotificationConfig } from './types';
import { getInitialSectors, SUBSCRIPTION_PLANS, getPermissionsByProfile, DEFAULT_NOTIFICATIONS, getTierLevel, ADMIN_EMAILS } from './constants';
import { SectorCard } from './components/SectorCard';
import { ChatInterface } from './components/ChatInterface';
import { InsightFeed } from './components/InsightFeed';
import { Onboarding } from './components/Onboarding';
import { EvolutionPanel } from './components/EvolutionPanel';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { InstallBanner } from './components/InstallBanner';
import { Toast } from './components/Toast';
import { ExpensesPanel } from './components/ExpensesPanel';
import { generateInsights, optimizeSector, subscribeToErrors } from './services/geminiService';
import { Settings, Activity, Crown, Network, LogOut, HelpCircle, ShieldCheck, TestTube, Cpu, MessageCircle, LayoutDashboard, Bell, PieChart, CheckCircle2, Sun, Moon, Scan, CreditCard } from 'lucide-react';
import { Logo } from './components/Logo';

const PROFILE_STORAGE_KEY = 'confort_profile';
const INTEGRATIONS_STORAGE_KEY = 'confort_integrations';
const DEMO_MODE_KEY = 'confort_demo_mode';
const THEME_KEY = 'confort_theme_mode';

// --- TRANSLATION & TERMINOLOGY CONFIG ---
const UI_TEXTS = {
  es: {
    nav_updates: 'Novedades',
    nav_balance: 'Balance',
    nav_areas: 'Mis Áreas',
    nav_admin: 'Admin / Evolución',
    nav_expenses: 'Gastos',
    section_updates_title: 'Novedades y Avisos',
    section_updates_subtitle: 'Cosas pendientes',
    section_balance_title: 'Balance del Sistema',
    section_areas_title: 'Mis Áreas',
    role_mode: 'Modo',
    demo_active: 'SIMULACIÓN',
    demo_real: 'MODO REAL',
    empty_updates: 'Todo está tranquilo',
    empty_updates_desc: 'No hay fricción detectada en tu ecosistema. Disfruta tu 35%.'
  },
  en: {
    nav_updates: 'Updates',
    nav_balance: 'Balance',
    nav_areas: 'My Areas',
    nav_admin: 'Admin / Evolution',
    nav_expenses: 'Expenses',
    section_updates_title: 'Updates & Alerts',
    section_updates_subtitle: 'Things you missed',
    section_balance_title: 'System Balance',
    section_areas_title: 'My Areas',
    role_mode: 'Mode',
    demo_active: 'SIMULATION',
    demo_real: 'REAL MODE',
    empty_updates: 'Everything is quiet',
    empty_updates_desc: 'No friction detected in your ecosystem. Enjoy your 35%.'
  }
};

type TabView = 'UPDATES' | 'BALANCE' | 'AREAS' | 'ADMIN' | 'EXPENSES';

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeIntegrations, setActiveIntegrations] = useState<string[]>([]);
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [mobileView, setMobileView] = useState<'DASHBOARD' | 'CHAT'>('DASHBOARD');
  const [activeTab, setActiveTab] = useState<TabView>('AREAS'); 
  const [lifeStageConfig, setLifeStageConfig] = useState<LifeStageConfig | null>(null);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(DEFAULT_NOTIFICATIONS);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSecurityToast, setShowSecurityToast] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'ERROR' | 'WARNING' } | null>(null);
  const [sectors, setSectors] = useState<HouseSector[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  // Admin Check
  const isAdmin = userProfile ? ADMIN_EMAILS.includes(userProfile.email) : false;

  // Global Error Subscription
  useEffect(() => {
    const unsubscribe = subscribeToErrors((msg, type) => {
        setToastMessage({ text: msg, type });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (browserLang !== 'es') setLang('en');
  }, []);

  const t = UI_TEXTS[lang];
  
  useEffect(() => {
    // ECHO [DATADOG]: datadogRum.init({ ... });
    
    const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    const storedIntegrations = localStorage.getItem(INTEGRATIONS_STORAGE_KEY);
    const storedDemoMode = localStorage.getItem(DEMO_MODE_KEY);
    const storedTheme = localStorage.getItem(THEME_KEY);

    if (storedDemoMode !== null) setIsDemoMode(storedDemoMode === 'true');

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = storedTheme ? storedTheme === 'dark' : prefersDark;
    setIsDarkMode(shouldBeDark);
    if (!shouldBeDark) document.documentElement.classList.add('light-mode');
    else document.documentElement.classList.remove('light-mode');

    if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        if (parsedProfile.setupCompleted) {
            setUserProfile(parsedProfile);
            const integrations = storedIntegrations ? JSON.parse(storedIntegrations) : [];
            setActiveIntegrations(integrations);
            hydrateApp(parsedProfile, integrations);
            // ECHO [DATADOG]: datadogRum.setUser({ ... });
        }
    }
    // ECHO [FIREBASE]: Listener de Auth
  }, []);

  // --- ANALYTICS & MONITORING (DATADOG RUM) ---
  useEffect(() => {
    if (userProfile) {
        // ECHO [DATADOG]: datadogRum.setUser({ id: userProfile.email, ... });
        console.log(`[Monitoring] Sesión identificada: ${userProfile.email}`);
        
        // Force redirect to Admin panel if user is admin
        if (ADMIN_EMAILS.includes(userProfile.email)) {
            setActiveTab('ADMIN');
        }
    }
  }, [userProfile]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem(THEME_KEY, newMode ? 'dark' : 'light');
    if (!newMode) document.documentElement.classList.add('light-mode');
    else document.documentElement.classList.remove('light-mode');
  };

  const hydrateApp = (profile: UserProfile, integrations: string[]) => {
      const initialConfig = getPermissionsByProfile(profile.age);
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
      const dynamicSectors = getInitialSectors(profile);
      setSectors(dynamicSectors);
  };

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

  const sendPushNotification = (title: string, body: string) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try { new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/2586/2586703.png' }); } catch (e) { console.error(e); }
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          try { new Notification(title, { body }); } catch (e) { console.error(e); }
        }
      });
    }
  };

  const handleOnboardingComplete = (profile: UserProfile, integrations: string[]) => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(integrations));
    setUserProfile({ ...profile, setupCompleted: true });
    setActiveIntegrations(integrations);
    hydrateApp(profile, integrations);
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
  };

  const handleLogout = () => {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem(INTEGRATIONS_STORAGE_KEY);
      localStorage.removeItem('confort_chat_history');
      setUserProfile(null);
      setSectors([]);
      setInsights([]);
      setActiveIntegrations([]);
      window.location.reload();
  };

  const handleHardReset = () => {
      if (window.confirm("¿Estás seguro? Esto borrará tu perfil, historial de chat y reiniciará la Demo.")) {
          handleLogout();
      }
  };
  
  const toggleDemoMode = () => {
      const newState = !isDemoMode;
      setIsDemoMode(newState);
      localStorage.setItem(DEMO_MODE_KEY, String(newState));
      if (!newState) {
          setInsights([]);
          alert("Modo Simulación Desactivado.");
      } else {
          alert("Modo Simulación Activado.");
      }
  };

  const handleUpdateSubscription = (newTier: SubscriptionTier) => {
    if (!userProfile || !lifeStageConfig) return;
    const updatedProfile = { ...userProfile, subscriptionTier: newTier };
    setUserProfile(updatedProfile);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
    
    const globalModules = getPermissionsByProfile(updatedProfile.age).modules;
    const newTierLevel = getTierLevel(newTier);
    const forbiddenIds = new Set<string>();
    globalModules.forEach(mod => {
        mod.permissions.forEach(p => {
            if (getTierLevel(p.minTier) > newTierLevel) forbiddenIds.add(p.id);
        });
    });
    
    const needsScoping = activeIntegrations.some(id => forbiddenIds.has(id));
    let finalIntegrations = activeIntegrations;

    if (needsScoping) {
        finalIntegrations = activeIntegrations.filter(id => !forbiddenIds.has(id));
        setActiveIntegrations(finalIntegrations);
        localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(finalIntegrations));
        hydrateApp(updatedProfile, finalIntegrations);
        alert(`Plan actualizado a ${SUBSCRIPTION_PLANS.find(p => p.id === newTier)?.name}. Permisos reajustados.`);
    } else {
        hydrateApp(updatedProfile, finalIntegrations);
        alert(`Plan actualizado a ${SUBSCRIPTION_PLANS.find(p => p.id === newTier)?.name}.`);
    }
  };

  const handleToggleIntegration = (id: string) => {
      const isEnabled = activeIntegrations.includes(id);
      const newIntegrations = isEnabled ? activeIntegrations.filter(i => i !== id) : [...activeIntegrations, id];
      setActiveIntegrations(newIntegrations);
      localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(newIntegrations));
      if (lifeStageConfig) {
          setLifeStageConfig(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  modules: prev.modules.map(m => ({
                      ...m,
                      permissions: m.permissions.map(p => ({ ...p, defaultEnabled: newIntegrations.includes(p.id) }))
                  }))
              };
          });
      }
  };

  const handleBulkToggleIntegration = (ids: string[], action: 'ENABLE' | 'DISABLE') => {
      let newIntegrations = [...activeIntegrations];
      if (action === 'ENABLE') {
          const uniqueIds = new Set([...newIntegrations, ...ids]);
          newIntegrations = Array.from(uniqueIds);
      } else {
          newIntegrations = newIntegrations.filter(id => !ids.includes(id));
      }
      setActiveIntegrations(newIntegrations);
      localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(newIntegrations));
      if (lifeStageConfig) {
          setLifeStageConfig(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  modules: prev.modules.map(m => ({
                      ...m,
                      permissions: m.permissions.map(p => ({ ...p, defaultEnabled: newIntegrations.includes(p.id) }))
                  }))
              };
          });
      }
  };

  const handleAddPermission = (moduleId: string, newPermission: PermissionItem) => {
    if (!lifeStageConfig) return;
    setLifeStageConfig(prev => {
        if (!prev) return null;
        return {
            ...prev,
            modules: prev.modules.map(mod => {
                if (mod.id === moduleId || (moduleId === 'unknown' && mod.id === prev.modules[0].id)) {
                    return { ...mod, permissions: [...mod.permissions, newPermission] };
                }
                return mod;
            })
        };
    });
    const newIntegrations = [...activeIntegrations, newPermission.id];
    setActiveIntegrations(newIntegrations);
    localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(newIntegrations));
    alert(`NUEVO PERMISO EVOLUTIVO: "${newPermission.label}" instalado.`);
  };

  const handleGenerateInsights = useCallback(async () => {
    if (sectors.length === 0) return;
    setGeneratingInsights(true);
    const newInsights = await generateInsights(sectors, userProfile || undefined);
    setInsights(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const filteredNew = newInsights.filter(i => !existingIds.has(i.id));
        if (notificationConfig.urgentAlerts && Notification.permission === "granted") {
            filteredNew.forEach(insight => {
                if (insight.impact === 'CRITICAL' || insight.impact === 'HIGH') {
                    sendPushNotification(`Alerta: ${insight.title}`, insight.description);
                }
            });
        }
        return [...prev, ...filteredNew];
    }); 
    setGeneratingInsights(false);
    if (newInsights.length > 0) setActiveTab('UPDATES');
  }, [sectors, userProfile, notificationConfig]);

  useEffect(() => {
    if (!userProfile || !isDemoMode) return;
    let activeTimers: ReturnType<typeof setTimeout>[] = [];
    const runSimulationCycle = () => {
        activeTimers.forEach(t => clearTimeout(t));
        activeTimers = [];
        // 1. Sincronización Email
        if (activeIntegrations.includes('gd_basic_1')) {
            const t = setTimeout(() => {
                setInsights(prev => {
                    if (prev.find(i => i.id === 'dardo-email')) return prev;
                    if (notificationConfig.urgentAlerts) sendPushNotification("Confort OS: Acción Requerida", "Póliza vencida detectada.");
                    return [{ id: 'dardo-email', sectorId: 'finance-1', title: 'Correo (SIMULADO)', description: `(DEMO) Póliza detectada.`, impact: 'HIGH', actionable: true }, ...prev];
                });
            }, 4000);
            activeTimers.push(t);
        }
        // ... Other simulation scenarios ...
        if(activeIntegrations.length > 0) {
            const t = setTimeout(() => handleGenerateInsights(), 5000);
            activeTimers.push(t);
        }
    };
    runSimulationCycle();
    const intervalId = setInterval(runSimulationCycle, 7200000);
    return () => {
        activeTimers.forEach(t => clearTimeout(t));
        clearInterval(intervalId);
    };
  }, [userProfile, activeIntegrations, handleGenerateInsights, isDemoMode, notificationConfig]);

  const handleOptimize = async (sector: HouseSector) => {
    setOptimizingId(sector.id);
    const result = await optimizeSector(sector, userProfile || undefined);
    setSectors(prev => prev.map(s => s.id === sector.id ? { ...s, efficiency: result.newEfficiency, status: 'OPTIMAL', description: result.message } : s));
    setOptimizingId(null);
  };

  const handleDismissInsight = (id: string) => setInsights(prev => prev.filter(i => i.id !== id));
  const handleApplyInsight = (id: string) => {
    if (id.startsWith('dardo-')) alert("SIMULACIÓN: Acción ejecutada.");
    else setSectors(prev => prev.map(s => s.owner === Owner.AI && s.efficiency < 100 ? { ...s, efficiency: Math.min(s.efficiency + 15, 100) } : s));
    handleDismissInsight(id);
  };

  const currentPlan = userProfile ? SUBSCRIPTION_PLANS.find(p => p.id === userProfile.subscriptionTier) : null;

  if (!userProfile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  console.log("Sistema Iniciado v3.0");

  return (
    <div className="min-h-screen bg-dark-950 text-stone-200 font-sans selection:bg-ai-500/30 md:pb-0 relative overflow-hidden transition-colors duration-500">
      <InstallBanner />
      {toastMessage && <Toast message={toastMessage.text} type={toastMessage.type} onClose={() => setToastMessage(null)} />}
      {showSettingsModal && <SettingsModal config={notificationConfig} userProfile={userProfile} lifeStageConfig={lifeStageConfig} activeIntegrations={activeIntegrations} onSave={(newConfig) => { setNotificationConfig(newConfig); setShowSettingsModal(false); }} onUpdateSubscription={handleUpdateSubscription} onTogglePermission={handleToggleIntegration} onBulkToggle={handleBulkToggleIntegration} onHardReset={handleHardReset} onClose={() => setShowSettingsModal(false)} />}
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}

      <header className="fixed top-0 w-full z-50 bg-dark-950/95 backdrop-blur-md border-b border-ai-500/20 shadow-lg transition-colors duration-500">
          <div className="px-4 md:px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2 md:gap-3 cursor-pointer group" onClick={() => setMobileView('DASHBOARD')}>
              <div className="w-8 h-8 md:w-10 md:h-10"><Logo className="w-full h-full" /></div>
              <div>
                <div className="flex items-center gap-2"><h1 className="text-lg md:text-xl font-serif font-bold tracking-tight leading-none text-ai-500">Confort <span className="font-light text-stone-500 font-sans">65/35</span></h1></div>
                <div className="flex items-center gap-2 mt-0.5">
                     <p className="hidden md:block text-[10px] text-stone-500 font-serif tracking-widest uppercase">{t.role_mode}: {userProfile.archetype}</p>
                     <button onClick={(e) => { e.stopPropagation(); toggleDemoMode(); }} className={`flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-serif font-bold ${isDemoMode ? 'bg-ai-900/20 border-ai-500/30 text-ai-500' : 'bg-stone-900/20 border-stone-500/30 text-stone-500'}`}>
                        {isDemoMode ? <TestTube size={10} /> : <Activity size={10} />}
                        <span className="hidden sm:inline tracking-wider">{isDemoMode ? t.demo_active : t.demo_real}</span>
                    </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-4">
              {currentPlan && (
                 <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-sm border border-double ${userProfile.subscriptionTier === SubscriptionTier.ELITE ? 'border-ai-500/50 bg-ai-500/5 text-ai-400' : 'border-stone-700/50 bg-stone-700/5 text-stone-500'}`}>
                    {userProfile.subscriptionTier === SubscriptionTier.ELITE && <Crown size={12} />}
                    <span className="text-[10px] font-serif font-bold tracking-wider uppercase">{currentPlan.name}</span>
                 </div>
              )}
              <button onClick={toggleTheme} className="p-2 hover:bg-stone-800/50 rounded-full transition-colors text-stone-500 hover:text-ai-400 flex items-center gap-2 group">
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-stone-800/50 rounded-full text-stone-500 hover:text-ai-400"><Settings size={20} /></button>
              <button onClick={() => setShowHelpModal(true)} className="p-2 hover:bg-stone-800/50 rounded-full text-stone-500 hover:text-ai-400"><HelpCircle size={20} /></button>
              <button onClick={handleLogout} className="p-2 hover:bg-user-900/20 text-stone-600 hover:text-user-500 rounded-full" title="Cerrar"><LogOut size={20} /></button>
            </div>
          </div>

          <div className="px-4 md:px-6 pb-0 flex gap-4 md:gap-8 text-sm font-medium overflow-x-auto scrollbar-hide border-t border-ai-500/10 pt-0 justify-center md:justify-start">
              <button onClick={() => setActiveTab('UPDATES')} className={`flex items-center gap-2 px-4 py-3 transition-all border-t-2 text-xs font-serif uppercase tracking-widest ${activeTab === 'UPDATES' ? 'text-ai-400 border-ai-400 bg-ai-500/5' : 'text-stone-500 border-transparent hover:border-stone-800'}`}>
                <Bell size={14} /> {t.nav_updates}
                {insights.length > 0 && <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-ai-500 text-black">{insights.length}</span>}
              </button>
              <button onClick={() => setActiveTab('BALANCE')} className={`flex items-center gap-2 px-4 py-3 transition-all border-t-2 text-xs font-serif uppercase tracking-widest ${activeTab === 'BALANCE' ? 'text-user-400 border-user-400 bg-user-500/5' : 'text-stone-500 border-transparent hover:border-stone-800'}`}>
                <PieChart size={14} /> {t.nav_balance}
              </button>
              <button onClick={() => setActiveTab('AREAS')} className={`flex items-center gap-2 px-4 py-3 transition-all border-t-2 text-xs font-serif uppercase tracking-widest ${activeTab === 'AREAS' ? 'text-stone-200 border-stone-200 bg-stone-500/5' : 'text-stone-500 border-transparent hover:border-stone-800'}`}>
                <LayoutDashboard size={14} /> {t.nav_areas}
              </button>
              <button onClick={() => setActiveTab('EXPENSES')} className={`flex items-center gap-2 px-4 py-3 transition-all border-t-2 text-xs font-serif uppercase tracking-widest ${activeTab === 'EXPENSES' ? 'text-emerald-400 border-emerald-400 bg-emerald-500/5' : 'text-stone-500 border-transparent hover:border-stone-800'}`}>
                <CreditCard size={14} /> {t.nav_expenses}
              </button>
              {isAdmin && (
                  <button onClick={() => setActiveTab('ADMIN')} className={`flex items-center gap-2 px-4 py-3 transition-all border-t-2 text-xs font-serif uppercase tracking-widest ${activeTab === 'ADMIN' ? 'text-amber-400 border-amber-400 bg-amber-500/5' : 'text-stone-500 border-transparent hover:border-stone-800'}`}>
                    <Cpu size={14} /> {t.nav_admin}
                  </button>
              )}
          </div>
      </header>

      <main className="pt-36 md:pt-40 px-4 md:px-6 max-w-[1600px] mx-auto h-[calc(100vh-0px)] flex flex-col md:flex-row gap-6 pb-6 md:pb-6">
        <div className={`w-full md:w-7/12 lg:w-2/3 flex-col ${activeTab === 'ADMIN' ? 'h-full overflow-hidden' : 'gap-6 overflow-y-auto custom-scrollbar'} pb-20 md:pb-0 ${mobileView === 'DASHBOARD' ? 'flex' : 'hidden md:flex'}`}>
            {activeTab === 'UPDATES' && (
                <div className="animate-fadeIn h-full">
                    {insights.length > 0 ? (
                        <InsightFeed title={t.section_updates_title} subtitle={t.section_updates_subtitle} insights={insights} onApply={handleApplyInsight} onDismiss={handleDismissInsight} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 border border-double border-stone-800 rounded-lg bg-dark-900/30 h-full">
                            <div className="p-4 bg-ai-900/10 rounded-full mb-4 border border-ai-500/20"><CheckCircle2 size={32} className="text-ai-500" /></div>
                            <h3 className="text-xl font-serif text-stone-300">{t.empty_updates}</h3>
                            <p className="text-sm text-stone-500 max-w-xs text-center mt-2 font-serif italic">{t.empty_updates_desc}</p>
                            <button onClick={handleGenerateInsights} disabled={generatingInsights} className="mt-6 flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded border border-stone-700 text-xs font-medium transition-colors uppercase tracking-wide">
                                <Activity size={14} className={generatingInsights ? 'animate-spin' : ''} /> {generatingInsights ? 'Revisando...' : 'Auditoría Manual'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'BALANCE' && (
                <div className="animate-fadeIn">
                    <h2 className="text-2xl font-serif text-stone-200 mb-6 flex items-center gap-3 border-b border-stone-800 pb-2"><PieChart size={24} className="text-ai-500" /> {t.section_balance_title}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-dark-900 p-6 rounded-sm border border-ai-500/20 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10"><Activity size={60} /></div>
                            <span className="text-xs text-ai-500 uppercase font-serif font-bold tracking-widest border-b border-ai-500/20 pb-1 inline-block w-max">Carga Delegada (IA)</span>
                            <div className="mt-4"><div className="text-5xl font-serif text-ai-400">{stats.aiPercentage}%</div></div>
                            <div className="w-full bg-stone-800 h-1 mt-4 overflow-hidden"><div className="bg-ai-500 h-full transition-all duration-1000" style={{ width: `${stats.aiPercentage}%` }} /></div>
                        </div>
                        <div className="bg-dark-900 p-6 rounded-sm border border-user-500/20 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10"><Crown size={60} /></div>
                            <span className="text-xs text-user-500 uppercase font-serif font-bold tracking-widest border-b border-user-500/20 pb-1 inline-block w-max">Tu Foco Vital</span>
                            <div className="mt-4"><div className="text-5xl font-serif text-user-400">{stats.userPercentage}%</div></div>
                            <div className="w-full bg-stone-800 h-1 mt-4 overflow-hidden"><div className="bg-user-500 h-full transition-all duration-1000" style={{ width: `${stats.userPercentage}%` }} /></div>
                        </div>
                    </div>
                </div>
            )}

             {activeTab === 'AREAS' && (
                <div className="grid grid-cols-1 gap-6 animate-fadeIn pb-20">
                    {sectors.map(sector => <SectorCard key={sector.id} sector={sector} onOptimize={handleOptimize} loading={optimizingId === sector.id} />)}
                </div>
            )}

            {activeTab === 'EXPENSES' && (
                <div className="animate-fadeIn h-full">
                    <ExpensesPanel />
                </div>
            )}

            {activeTab === 'ADMIN' && isAdmin && (
                <div className="h-full animate-fadeIn">
                    {lifeStageConfig && userProfile && (
                        <EvolutionPanel profile={userProfile} lifeStageConfig={lifeStageConfig} onAddPermission={handleAddPermission} onClose={() => {}} isEmbedded={true} />
                    )}
                </div>
            )}
        </div>

        <div className={`w-full md:w-5/12 lg:w-1/3 h-[calc(100vh-180px)] md:h-auto pb-20 md:pb-0 ${mobileView === 'CHAT' ? 'flex' : 'hidden md:flex'}`}>
           <ChatInterface sectors={sectors} userProfile={userProfile} onBack={() => setMobileView('DASHBOARD')} />
        </div>
      </main>
      
      <nav className="fixed bottom-0 w-full bg-dark-950/95 backdrop-blur-md border-t border-stone-800 md:hidden z-40 pb-safe">
         <div className="flex justify-around items-center h-16">
             <button onClick={() => setMobileView('DASHBOARD')} className={`flex flex-col items-center gap-1 transition-colors ${mobileView === 'DASHBOARD' ? 'text-ai-500' : 'text-stone-500'}`}><LayoutDashboard size={20} /><span className="text-[10px] font-serif font-bold tracking-widest">PANEL</span></button>
             <div className="relative -top-5"><button onClick={() => setMobileView('CHAT')} className="w-14 h-14 rounded-full bg-ai-600 flex items-center justify-center text-white shadow-lg border-4 border-dark-950 active:scale-95 transition-transform"><MessageCircle size={24} /></button></div>
             <button onClick={() => setShowSettingsModal(true)} className="flex flex-col items-center gap-1 text-stone-500 hover:text-ai-400 transition-colors"><Settings size={20} /><span className="text-[10px] font-serif font-bold tracking-widest">AJUSTES</span></button>
         </div>
      </nav>
    </div>
  );
};

export default App;
