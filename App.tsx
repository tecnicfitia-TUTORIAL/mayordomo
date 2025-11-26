import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HouseSector, Insight, Owner, UserProfile, SubscriptionTier, LifeStageConfig, PermissionItem, NotificationConfig } from './types';
import { getInitialSectors, SUBSCRIPTION_PLANS, getPermissionsByProfile, DEFAULT_NOTIFICATIONS, getTierLevel } from './constants';
import { SectorCard } from './components/SectorCard';
import { ChatInterface } from './components/ChatInterface';
import { InsightFeed } from './components/InsightFeed';
import { Onboarding } from './components/Onboarding';
import { EvolutionPanel } from './components/EvolutionPanel';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { InstallBanner } from './components/InstallBanner';
import { Toast } from './components/Toast';
import { generateInsights, optimizeSector, subscribeToErrors } from './services/geminiService';
import { Settings, Activity, Crown, Network, LogOut, HelpCircle, ShieldCheck, TestTube, Cpu, MessageCircle, LayoutDashboard, Bell, PieChart, CheckCircle2, Sun, Moon, Scan } from 'lucide-react';
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

type TabView = 'UPDATES' | 'BALANCE' | 'AREAS' | 'ADMIN';

const App: React.FC = () => {
  // State for User Profile (If null, show onboarding)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeIntegrations, setActiveIntegrations] = useState<string[]>([]);
  
  // Language State
  const [lang, setLang] = useState<'es' | 'en'>('es');
  
  // UI Navigation State
  const [mobileView, setMobileView] = useState<'DASHBOARD' | 'CHAT'>('DASHBOARD');
  const [activeTab, setActiveTab] = useState<TabView>('AREAS'); // Default to Areas as it's the main view

  // Permissions State (Managed at App level now for Evolution)
  const [lifeStageConfig, setLifeStageConfig] = useState<LifeStageConfig | null>(null);

  // App Settings
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(DEFAULT_NOTIFICATIONS);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSecurityToast, setShowSecurityToast] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true); // Default to true for first impression
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Error Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'ERROR' | 'WARNING' } | null>(null);

  const [sectors, setSectors] = useState<HouseSector[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  // Global Error Subscription
  useEffect(() => {
    const unsubscribe = subscribeToErrors((msg, type) => {
        setToastMessage({ text: msg, type });
    });
    return unsubscribe;
  }, []);

  // Language Detection
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (browserLang !== 'es') {
        setLang('en');
    }
  }, []);

  // Helper for text
  const t = UI_TEXTS[lang];
  
  // Load Persistence on Mount
  useEffect(() => {
    const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    const storedIntegrations = localStorage.getItem(INTEGRATIONS_STORAGE_KEY);
    const storedDemoMode = localStorage.getItem(DEMO_MODE_KEY);
    const storedTheme = localStorage.getItem(THEME_KEY);

    if (storedDemoMode !== null) {
        setIsDemoMode(storedDemoMode === 'true');
    }

    // Theme Logic
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = storedTheme ? storedTheme === 'dark' : prefersDark;
    setIsDarkMode(shouldBeDark);
    if (!shouldBeDark) {
        document.documentElement.classList.add('light-mode');
    } else {
        document.documentElement.classList.remove('light-mode');
    }

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

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem(THEME_KEY, newMode ? 'dark' : 'light');
    
    if (!newMode) {
        document.documentElement.classList.add('light-mode');
    } else {
        document.documentElement.classList.remove('light-mode');
    }
  };

  const hydrateApp = (profile: UserProfile, integrations: string[]) => {
      // Generate Config based on profile
      const initialConfig = getPermissionsByProfile(profile.age);
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

  // Push Notification Logic
  const sendPushNotification = (title: string, body: string) => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
      try {
        new Notification(title, { 
            body, 
            icon: 'https://cdn-icons-png.flaticon.com/512/2586/2586703.png' 
        });
      } catch (e) {
        console.error("Notification failed:", e);
      }
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          try {
            new Notification(title, { body });
          } catch (e) {
            console.error("Notification failed:", e);
          }
        }
      });
    }
  };

  // Handlers
  const handleOnboardingComplete = (profile: UserProfile, integrations: string[]) => {
    // Save to Storage
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(integrations));

    setUserProfile({ ...profile, setupCompleted: true });
    setActiveIntegrations(integrations);
    hydrateApp(profile, integrations);
    
    // Request notification permission early
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
  };

  const handleLogout = () => {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem(INTEGRATIONS_STORAGE_KEY);
      localStorage.removeItem('confort_chat_history'); // Clear chat history on logout
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
          setInsights([]); // Clear fake insights
          alert("Modo Simulación Desactivado. El sistema ahora solo reaccionará a tus inputs reales (Chat y Archivos).");
      } else {
          alert("Modo Simulación Activado. Se generarán eventos ficticios para probar el sistema.");
      }
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
    const globalModules = getPermissionsByProfile(updatedProfile.age).modules;
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

  const handleToggleIntegration = (id: string) => {
      const isEnabled = activeIntegrations.includes(id);
      const newIntegrations = isEnabled 
          ? activeIntegrations.filter(i => i !== id) 
          : [...activeIntegrations, id];
      
      setActiveIntegrations(newIntegrations);
      localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(newIntegrations));
      
      // Update lifeStageConfig state to stay consistent (mostly for visual defaults)
      if (lifeStageConfig) {
          setLifeStageConfig(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  modules: prev.modules.map(m => ({
                      ...m,
                      permissions: m.permissions.map(p => ({
                          ...p,
                          defaultEnabled: newIntegrations.includes(p.id)
                      }))
                  }))
              };
          });
      }
  };

  const handleBulkToggleIntegration = (ids: string[], action: 'ENABLE' | 'DISABLE') => {
      let newIntegrations = [...activeIntegrations];
      
      if (action === 'ENABLE') {
          // Add all IDs that are not already present
          const uniqueIds = new Set([...newIntegrations, ...ids]);
          newIntegrations = Array.from(uniqueIds);
      } else {
          // Remove all IDs present in the target list
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
                      permissions: m.permissions.map(p => ({
                          ...p,
                          defaultEnabled: newIntegrations.includes(p.id)
                      }))
                  }))
              };
          });
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
        
        // Notify for CRITICAL/HIGH insights if permission granted and setting enabled
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
    // Auto switch to Updates tab when new insights arrive
    if (newInsights.length > 0) {
        setActiveTab('UPDATES');
    }
  }, [sectors, userProfile, notificationConfig]);

  // --- SIMULATION ENGINE: Mobile Behavior Simulation ---
  useEffect(() => {
    if (!userProfile || !isDemoMode) return; // STOP simulation if disabled

    let activeTimers: ReturnType<typeof setTimeout>[] = [];

    const runSimulationCycle = () => {
        // Clear any pending timers from previous cycle
        activeTimers.forEach(t => clearTimeout(t));
        activeTimers = [];

        // 1. ESCENARIO: Sincronización Email (El "Dardo" original)
        if (activeIntegrations.includes('gd_basic_1')) {
            const t = setTimeout(() => {
                setInsights(prev => {
                    if (prev.find(i => i.id === 'dardo-email')) return prev;
                    if (notificationConfig.urgentAlerts) {
                        sendPushNotification("Confort OS: Acción Requerida", "Detectada póliza vencida en correo. Revisión sugerida.");
                    }
                    return [{
                        id: 'dardo-email',
                        sectorId: 'finance-1', 
                        title: 'Correo (SIMULADO)',
                        description: `(DEMO) Detecté "Poliza_2024.pdf" en tu email. He bloqueado la fecha en tu calendario.`,
                        impact: 'HIGH',
                        actionable: true
                    }, ...prev];
                });
            }, 4000);
            activeTimers.push(t);
        }

        // 2. ESCENARIO: Escaneo de Galería (Imágenes)
        if (activeIntegrations.includes('gd_prem_3')) {
            const t = setTimeout(() => {
                setInsights(prev => {
                    if (prev.find(i => i.id === 'dardo-img')) return prev;
                    return [{
                        id: 'dardo-img',
                        sectorId: 'finance-1',
                        title: 'Galería (SIMULADO)',
                        description: '(DEMO) Analicé tu captura de pantalla. Encontré el producto un 15% más barato.',
                        impact: 'MEDIUM',
                        actionable: true
                    }, ...prev];
                });
            }, 10000);
            activeTimers.push(t);
        }

        // 3. ESCENARIO: Historial de Navegación/Videos (Intereses)
        if (activeIntegrations.includes('gd_elite_2')) {
            const t = setTimeout(() => {
                setInsights(prev => {
                    if (prev.find(i => i.id === 'dardo-web')) return prev;
                    return [{
                        id: 'dardo-web',
                        sectorId: 'career-1',
                        title: 'Web (SIMULADO)',
                        description: '(DEMO) Veo que has visitado 5 sitios de Fotografía. ¿Filtro los 3 mejores cursos?',
                        impact: 'LOW',
                        actionable: true
                    }, ...prev];
                });
            }, 15000);
            activeTimers.push(t);
        }

        // 4. ESCENARIO: Finanzas App
        if (activeIntegrations.includes('fc_basic_2')) {
            const t = setTimeout(() => {
                setInsights(prev => {
                    if (prev.find(i => i.id === 'dardo-app')) return prev;
                    return [{
                        id: 'dardo-app',
                        sectorId: 'finance-1',
                        title: 'App Store (SIMULADO)',
                        description: '(DEMO) Has gastado 15€ en juegos hoy. ¿Activo límite mensual?',
                        impact: 'MEDIUM',
                        actionable: true
                    }, ...prev];
                });
            }, 20000);
            activeTimers.push(t);
        }

        // 5. ESCENARIO: Bio-Feedback (CRITICAL/HIGH)
        if (activeIntegrations.includes('be_prem_1') || activeIntegrations.includes('be_elite_1')) {
            const t = setTimeout(() => {
                setInsights(prev => {
                    if (prev.find(i => i.id === 'dardo-bio')) return prev;
                    if (notificationConfig.healthReminders) {
                        sendPushNotification("Confort Salud", "Ritmo biológico alterado detectado. Se recomienda descanso.");
                    }
                    return [{
                        id: 'dardo-bio',
                        sectorId: 'health-1',
                        title: 'Salud (SIMULADO)',
                        description: '(DEMO) Tu wearable indica mal sueño. Recomiendo cancelar la primera reunión.',
                        impact: 'CRITICAL',
                        actionable: true
                    }, ...prev];
                });
            }, 8000);
            activeTimers.push(t);
        }

        // 6. ESCENARIO: Trastero Latente (Memoria Recuperada)
        // Siempre activo si hay al menos 1 integración de datos
        if (activeIntegrations.length > 0) {
           const t = setTimeout(() => {
                setInsights(prev => {
                    if (prev.find(i => i.id === 'dardo-trastero')) return prev;
                    return [{
                        id: 'dardo-trastero',
                        sectorId: 'storage-1',
                        title: 'Trastero Latente (SIMULADO)',
                        description: '(DEMO) Recuperé una nota de hace 6 meses: "Regalo mamá - Cafetera Vintage". Está en oferta hoy.',
                        impact: 'MEDIUM',
                        actionable: true
                    }, ...prev];
                });
           }, 12000);
           activeTimers.push(t);
        }
        
        // Escaneo inicial general - INCREASED DELAY TO 5s
        if(activeIntegrations.length > 0) {
            const t = setTimeout(() => handleGenerateInsights(), 5000);
            activeTimers.push(t);
        }
        
        // 7. RESUMEN DIARIO (Simulado)
        if (notificationConfig.morningSummary) {
             const t = setTimeout(() => {
                 sendPushNotification("Resumen Matutino", "Tu sistema está al 85% de eficiencia. Tienes 2 tareas críticas pendientes.");
             }, 30000); // Send summary after 30s in demo mode
             activeTimers.push(t);
        }
    };

    // Run once immediately
    runSimulationCycle();

    // Set interval for every 2 hours (7200000 ms)
    const intervalId = setInterval(runSimulationCycle, 7200000);

    return () => {
        activeTimers.forEach(t => clearTimeout(t));
        clearInterval(intervalId);
    };
  }, [userProfile, activeIntegrations, handleGenerateInsights, isDemoMode, notificationConfig]);

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
        if (id.startsWith('dardo-')) {
          alert("SIMULACIÓN: Acción ejecutada en entorno de pruebas.");
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
    <div className="min-h-screen bg-dark-950 text-stone-200 font-sans selection:bg-ai-500/30 md:pb-0 relative overflow-hidden transition-colors duration-500">
      
      <InstallBanner />

      {/* Global Toast Notification */}
      {toastMessage && (
        <Toast 
            message={toastMessage.text} 
            type={toastMessage.type} 
            onClose={() => setToastMessage(null)} 
        />
      )}

      {/* Security Toast */}
      {showSecurityToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-dark-900/90 text-ai-400 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xl border border-ai-500/30 backdrop-blur-sm font-serif">
            <ShieldCheck size={14} /> Encriptación de Núcleo: ACTIVA
        </div>
      )}
      
      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal 
            config={notificationConfig}
            userProfile={userProfile}
            lifeStageConfig={lifeStageConfig}
            activeIntegrations={activeIntegrations}
            onSave={(newConfig) => {
                setNotificationConfig(newConfig);
                setShowSettingsModal(false);
            }}
            onUpdateSubscription={handleUpdateSubscription}
            onTogglePermission={handleToggleIntegration}
            onBulkToggle={handleBulkToggleIntegration}
            onHardReset={handleHardReset}
            onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Help Modal */}
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}

      {/* FIXED HEADER (2 Rows) */}
      <header className="fixed top-0 w-full z-50 bg-dark-950/95 backdrop-blur-md border-b border-ai-500/20 shadow-lg transition-colors duration-500">
          {/* ROW 1: Brand, Status & Settings */}
          <div className="px-4 md:px-6 py-3 flex justify-between items-center">
            <div 
              className="flex items-center gap-2 md:gap-3 cursor-pointer group"
              onClick={() => setMobileView('DASHBOARD')}
              title="Ir al Panel de Control"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-105 transition-transform">
                <Logo className="w-full h-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-lg md:text-xl font-serif font-bold tracking-tight leading-none text-ai-500 group-hover:text-ai-400 transition-colors">Confort <span className="font-light text-stone-500 group-hover:text-stone-400 font-sans">65/35</span></h1>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                     <p className="hidden md:block text-[10px] text-stone-500 font-serif tracking-widest uppercase border-b border-transparent group-hover:border-stone-500 transition-all">{t.role_mode}: {userProfile.archetype}</p>
                     <button 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent navigation when clicking demo toggle
                          toggleDemoMode();
                        }}
                        className={`flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-serif font-bold cursor-pointer transition-colors ${isDemoMode ? 'bg-ai-900/20 border-ai-500/30 text-ai-500 hover:bg-ai-900/40' : 'bg-stone-900/20 border-stone-500/30 text-stone-500 hover:bg-stone-900/40'}`} 
                        title={isDemoMode ? "Modo Simulación Activo" : "Modo Real"}
                    >
                        {isDemoMode ? <TestTube size={10} /> : <Activity size={10} />}
                        <span className="hidden sm:inline tracking-wider">{isDemoMode ? t.demo_active : t.demo_real}</span>
                    </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-4">
              {/* Subscription Badge */}
              {currentPlan && (
                 <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-sm border border-double 
                    ${userProfile.subscriptionTier === SubscriptionTier.ELITE ? 'border-ai-500/50 bg-ai-500/5 text-ai-400' : 
                      userProfile.subscriptionTier === SubscriptionTier.PREMIUM ? 'border-stone-500/50 bg-stone-500/5 text-stone-400' : 
                      'border-stone-700/50 bg-stone-700/5 text-stone-500'}`}>
                    {userProfile.subscriptionTier === SubscriptionTier.ELITE && <Crown size={12} />}
                    <span className="text-[10px] font-serif font-bold tracking-wider uppercase">{currentPlan.name}</span>
                 </div>
              )}
              
              {/* Theme Toggle */}
              <button onClick={toggleTheme} className="p-2 hover:bg-stone-800/50 rounded-full transition-colors text-stone-500 hover:text-ai-400 flex items-center gap-2 group">
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                  <span className="hidden lg:inline text-[10px] font-serif font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                      {isDarkMode ? 'DÍA' : 'NOCHE'}
                  </span>
              </button>

              <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-stone-800/50 rounded-full transition-colors text-stone-500 hover:text-ai-400">
                <Settings size={20} />
              </button>
              <button onClick={() => setShowHelpModal(true)} className="p-2 hover:bg-stone-800/50 rounded-full transition-colors text-stone-500 hover:text-ai-400">
                <HelpCircle size={20} />
              </button>
              <button onClick={handleLogout} className="p-2 hover:bg-user-900/20 text-stone-600 hover:text-user-500 rounded-full transition-colors" title="Cerrar Sesión">
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {/* ROW 2: Navigation Tabs (Filtered Functional Screens) */}
          <div className="px-4 md:px-6 pb-0 flex gap-4 md:gap-8 text-sm font-medium overflow-x-auto scrollbar-hide border-t border-ai-500/10 pt-0 justify-center md:justify-start">
              <button 
                onClick={() => setActiveTab('UPDATES')}
                className={`flex items-center gap-2 px-4 py-3 transition-all border-t-2 text-xs font-serif uppercase tracking-widest ${activeTab === 'UPDATES' ? 'text-ai-400 border-ai-400 bg-ai-500/5' : 'text-stone-500 hover:text-stone-300 border-transparent hover:border-stone-800'}`}
              >
                <Bell size={14} /> {t.nav_updates}
                {insights.length > 0 && (
                    <span className={`ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'UPDATES' ? 'bg-ai-500 text-black' : 'bg-stone-700 text-stone-300'}`}>{insights.length}</span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('BALANCE')}
                className={`flex items-center gap-2 px-4 py-3 transition-all border-t-2 text-xs font-serif uppercase tracking-widest ${activeTab === 'BALANCE' ? 'text-user-400 border-user-400 bg-user-500/5' : 'text-stone-500 hover:text-stone-300 border-transparent hover:border-stone-800'}`}
              >
                <PieChart size={14} /> {t.nav_balance}
              </button>
              <button 
                onClick={() => setActiveTab('AREAS')}
                className={`flex items-center gap-2 px-4 py-3 transition-all border-t-2 text-xs font-serif uppercase tracking-widest ${activeTab === 'AREAS' ? 'text-stone-200 border-stone-200 bg-stone-500/5' : 'text-stone-500 hover:text-stone-300 border-transparent hover:border-stone-800'}`}
              >
                <LayoutDashboard size={14} /> {t.nav_areas}
              </button>
              {/* Admin / Evolution Tab */}
              <button 
                onClick={() => setActiveTab('ADMIN')}
                className={`flex items-center gap-2 px-4 py-3 transition-all border-t-2 text-xs font-serif uppercase tracking-widest ${activeTab === 'ADMIN' ? 'text-stone-400 border-stone-400 bg-stone-800/30' : 'text-stone-500 hover:text-stone-300 border-transparent hover:border-stone-800'}`}
              >
                <Cpu size={14} /> {t.nav_admin}
              </button>
          </div>
      </header>

      {/* Main Content */}
      <main className="pt-36 md:pt-40 px-4 md:px-6 max-w-[1600px] mx-auto h-[calc(100vh-0px)] flex flex-col md:flex-row gap-6 pb-6 md:pb-6">
        
        {/* Left Column: Dashboard - Filtered Views */}
        <div className={`w-full md:w-7/12 lg:w-2/3 flex-col ${activeTab === 'ADMIN' ? 'h-full overflow-hidden' : 'gap-6 overflow-y-auto custom-scrollbar'} pb-20 md:pb-0 ${mobileView === 'DASHBOARD' ? 'flex' : 'hidden md:flex'}`}>
            
            {/* --- VIEW: UPDATES --- */}
            {activeTab === 'UPDATES' && (
                <div className="animate-fadeIn h-full">
                    {insights.length > 0 ? (
                        <InsightFeed 
                            title={t.section_updates_title}
                            subtitle={t.section_updates_subtitle}
                            insights={insights} 
                            onApply={handleApplyInsight} 
                            onDismiss={handleDismissInsight} 
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 border border-double border-stone-800 rounded-lg bg-dark-900/30 h-full">
                            <div className="p-4 bg-ai-900/10 rounded-full mb-4 border border-ai-500/20">
                                <CheckCircle2 size={32} className="text-ai-500" />
                            </div>
                            <h3 className="text-xl font-serif text-stone-300">{t.empty_updates}</h3>
                            <p className="text-sm text-stone-500 max-w-xs text-center mt-2 font-serif italic">{t.empty_updates_desc}</p>
                            
                            <button 
                                onClick={handleGenerateInsights} 
                                disabled={generatingInsights}
                                className="mt-6 flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded border border-stone-700 text-xs font-medium transition-colors uppercase tracking-wide"
                            >
                                <Activity size={14} className={generatingInsights ? 'animate-spin' : ''} />
                                {generatingInsights ? 'Revisando registros...' : 'Auditoría Manual'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* --- VIEW: BALANCE --- */}
            {activeTab === 'BALANCE' && (
                <div className="animate-fadeIn">
                    <h2 className="text-2xl font-serif text-stone-200 mb-6 flex items-center gap-3 border-b border-stone-800 pb-2">
                        <PieChart size={24} className="text-ai-500" /> 
                        {t.section_balance_title}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-dark-900 p-6 rounded-sm border border-ai-500/20 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-2 opacity-10"><Activity size={60} /></div>
                            <span className="text-xs text-ai-500 uppercase font-serif font-bold tracking-widest border-b border-ai-500/20 pb-1 inline-block w-max">Carga Delegada (IA)</span>
                            <div className="mt-4">
                                <div className="text-5xl font-serif text-ai-400">{stats.aiPercentage}%</div>
                                <div className="text-sm text-stone-500 mt-1 font-serif italic">Automatización operativa</div>
                            </div>
                            <div className="w-full bg-stone-800 h-1 mt-4 overflow-hidden">
                                <div className="bg-ai-500 h-full transition-all duration-1000" style={{ width: `${stats.aiPercentage}%` }} />
                            </div>
                        </div>
                        
                        <div className="bg-dark-900 p-6 rounded-sm border border-user-500/20 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10"><Crown size={60} /></div>
                            <span className="text-xs text-user-500 uppercase font-serif font-bold tracking-widest border-b border-user-500/20 pb-1 inline-block w-max">Tu Foco Vital</span>
                            <div className="mt-4">
                                <div className="text-5xl font-serif text-user-400">{stats.userPercentage}%</div>
                                <div className="text-sm text-stone-500 mt-1 font-serif italic">Creatividad y Decisiones</div>
                            </div>
                            <div className="w-full bg-stone-800 h-1 mt-4 overflow-hidden">
                                <div className="bg-user-500 h-full transition-all duration-1000" style={{ width: `${stats.userPercentage}%` }} />
                            </div>
                        </div>
                        
                        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-dark-900 to-dark-800 p-8 rounded-sm border border-double border-stone-700 flex flex-col justify-between relative overflow-hidden">
                             <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <span className="text-xs text-stone-400 uppercase font-serif font-bold tracking-widest">Eficiencia Global del Sistema</span>
                                    <div className="text-6xl font-serif text-stone-200 mt-4 flex items-baseline gap-4">
                                        {stats.aiEfficiency}% 
                                        <span className="text-sm font-sans font-medium text-ai-400 bg-ai-500/10 px-2 py-1 rounded border border-ai-500/20">+4.2% esta semana</span>
                                    </div>
                                    <p className="text-sm text-stone-500 mt-4 max-w-md font-serif leading-relaxed">
                                        El núcleo está optimizando activamente {sectors.filter(s => s.owner === Owner.AI).length} sectores operativos para garantizar su tranquilidad.
                                    </p>
                                </div>
                                <button onClick={() => setActiveTab('ADMIN')} className="px-4 py-2 bg-stone-800 text-stone-400 border border-stone-600 hover:bg-stone-700 transition-colors rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Scan size={14} /> Auditoría
                                </button>
                             </div>
                             <div className="absolute -bottom-10 -right-10 text-stone-800 opacity-30">
                                <Activity size={200} />
                             </div>
                        </div>
                    </div>
                </div>
            )}

             {/* --- VIEW: AREAS --- */}
             {activeTab === 'AREAS' && (
                <div className="grid grid-cols-1 gap-6 animate-fadeIn pb-20">
                    {sectors.map(sector => (
                        <SectorCard 
                            key={sector.id}
                            sector={sector}
                            onOptimize={handleOptimize}
                            loading={optimizingId === sector.id}
                        />
                    ))}
                    <div className="py-8 text-center">
                        <p className="text-xs text-stone-600 font-serif italic">
                            Mostrando {sectors.length} dimensiones activas en tu ecosistema.
                        </p>
                    </div>
                </div>
            )}

            {/* --- VIEW: ADMIN / EVOLUTION --- */}
            {activeTab === 'ADMIN' && (
                <div className="h-full animate-fadeIn">
                    {lifeStageConfig && userProfile && (
                        <EvolutionPanel 
                            profile={userProfile}
                            lifeStageConfig={lifeStageConfig}
                            onAddPermission={handleAddPermission}
                            onClose={() => {}}
                            isEmbedded={true}
                        />
                    )}
                </div>
            )}

        </div>

        {/* Right Column: Chat / Assistant (Always visible on desktop, toggled on mobile) */}
        <div className={`w-full md:w-5/12 lg:w-1/3 h-[calc(100vh-180px)] md:h-auto pb-20 md:pb-0 ${mobileView === 'CHAT' ? 'flex' : 'hidden md:flex'}`}>
           <ChatInterface 
             sectors={sectors}
             userProfile={userProfile}
             onBack={() => setMobileView('DASHBOARD')}
           />
        </div>

      </main>
      
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-dark-950/95 backdrop-blur-md border-t border-stone-800 md:hidden z-40 pb-safe">
         <div className="flex justify-around items-center h-16">
             <button 
               onClick={() => setMobileView('DASHBOARD')}
               className={`flex flex-col items-center gap-1 transition-colors ${mobileView === 'DASHBOARD' ? 'text-ai-500' : 'text-stone-500'}`}
             >
                 <LayoutDashboard size={20} />
                 <span className="text-[10px] font-serif font-bold tracking-widest">PANEL</span>
             </button>
             
             <div className="relative -top-5">
                 <button 
                   onClick={() => setMobileView('CHAT')}
                   className="w-14 h-14 rounded-full bg-ai-600 flex items-center justify-center text-white shadow-lg border-4 border-dark-950 active:scale-95 transition-transform"
                 >
                     <MessageCircle size={24} />
                 </button>
             </div>

             <button 
                onClick={() => setShowSettingsModal(true)}
                className="flex flex-col items-center gap-1 text-stone-500 hover:text-ai-400 transition-colors"
             >
                 <Settings size={20} />
                 <span className="text-[10px] font-serif font-bold tracking-widest">AJUSTES</span>
             </button>
         </div>
      </nav>

    </div>
  );
};

export default App;