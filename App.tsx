
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserProfile, PillarId, CapabilityStatus, SubscriptionTier, PillarStatus, LifeStageConfig, PermissionItem, UserArchetype, Mission, DashboardConfig } from './types';
import { PILLAR_DEFINITIONS, TECHNICAL_PERMISSIONS, getTierLevel, ADMIN_EMAILS, VISUAL_PRESETS } from './constants';
import { Onboarding } from './components/Onboarding';
import { ChatInterface } from './components/ChatInterface';
import { SettingsModal } from './components/SettingsModal';
import { AppearanceModal } from './components/AppearanceModal';
import { EvolutionPanel } from './components/EvolutionPanel';
import { PillarCard } from './components/PillarCard';
import { PillarDetailView } from './components/PillarDetailView';
import { MissionBriefingCard } from './components/MissionBriefingCard';
import { PermissionsTreeScreen } from './components/PermissionsTreeScreen';
import { SmartDashboard } from './components/SmartDashboard';
import { SupportDashboard } from './components/SupportDashboard';
import { SupportModal } from './components/SupportModal';
import { Toast } from './components/Toast'; // Import Toast
import { Logo } from './components/Logo';
import { SubscriptionService } from './services/subscriptionService';
import { PreparationService } from './services/preparationService';
import { InferenceEngine } from './services/inferenceService';
import { DashboardBuilder } from './services/dashboardBuilder';
import { BackgroundService } from './services/backgroundService'; // Import BackgroundService
import { NotificationService, AppNotification } from './services/notificationService'; // Import NotificationService
import { Settings, LogOut, MessageSquare, X, Eye, Shield, CreditCard, ChevronRight, Edit3, Check, MoveUp, MoveDown, EyeOff, CloudOff, LifeBuoy, Undo2, HelpCircle, Palette, RefreshCw } from 'lucide-react';

const PROFILE_KEY = 'mayordomo_profile';

const SYSTEM_ADMIN_PROFILE: UserProfile = {
  uid: 'system_root',
  email: 'root@system.local',
  name: 'System Root',
  age: 99,
  gender: 'AI',
  occupation: 'System Core',
  archetype: UserArchetype.CONSTRUCTOR,
  subscriptionTier: SubscriptionTier.VIP,
  grantedPermissions: TECHNICAL_PERMISSIONS.map(p => p.id),
  setupCompleted: true
};

// Default Dashboard Order
const DEFAULT_PILLAR_ORDER = Object.values(PillarId);

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [showPermissionsTree, setShowPermissionsTree] = useState(false);
  const [showSupportDashboard, setShowSupportDashboard] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showEvolution, setShowEvolution] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  // Alert State
  const [criticalAlert, setCriticalAlert] = useState<AppNotification | null>(null);
  
  // UX States
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // Manual Refresh State

  // Sidebar Menu State
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  const [selectedPillarId, setSelectedPillarId] = useState<PillarId | null>(null);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [originalAdminProfile, setOriginalAdminProfile] = useState<UserProfile | null>(null);

  const lastClickRef = useRef<number>(0);
  
  // Dashboard Items (Generative)
  const [dashboardItems, setDashboardItems] = useState<any[]>([]);

  // 0. OFFLINE DETECTION & THEME APPLICATION & BACKGROUND SERVICE
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize Background Service
    BackgroundService.init();

    // Subscribe to Critical Alerts
    const unsubscribe = NotificationService.onCriticalAlert((notification) => {
        setCriticalAlert(notification);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      BackgroundService.stop();
    };
  }, []);

  useEffect(() => {
    if (profile) {
        // Apply Theme (Light/Dark Mode)
        const pref = profile.themePreference || 'AUTO';
        const isDark = pref === 'DARK' || (pref === 'AUTO' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        if (isDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }
    }
  }, [profile?.themePreference]);

  // Close Settings Menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. LOAD PROFILE AND SYNC SUBSCRIPTION
  useEffect(() => {
    const initializeSession = async () => {
        const saved = localStorage.getItem(PROFILE_KEY);
        if (saved) {
            let user = JSON.parse(saved);
            
            // Validate dashboard config structure
            if (!user.dashboardConfig) {
                user.dashboardConfig = { pillarOrder: DEFAULT_PILLAR_ORDER, hiddenPillars: [] };
            }

            try {
                if (navigator.onLine) {
                    const currentTier = await SubscriptionService.getCurrentUserTier(user.uid);
                    if (currentTier !== user.subscriptionTier) {
                        console.log(`[App] Syncing Tier: ${user.subscriptionTier} -> ${currentTier}`);
                        user = { ...user, subscriptionTier: currentTier };
                    }
                }
            } catch (e) {
                console.error("Failed to sync subscription:", e);
            }
            
            setProfile(user);
            localStorage.setItem(PROFILE_KEY, JSON.stringify(user));
        }
    };
    initializeSession();
  }, []);

  // 2. RUN INFERENCE ENGINE (POPULATE OBLIGATIONS)
  useEffect(() => {
    const runInference = async () => {
       if (profile && profile.setupCompleted && !isOffline) {
           // Si el perfil no tiene obligaciones cacheadas o ha cambiado de jurisdicción (Simulado)
           if (!profile.lifeContext || !profile.lifeContext.obligations) {
               console.log("[App] Running Inference Engine for new profile...");
               const obligations = await InferenceEngine.inferObligations(profile);
               
               // Actualizar perfil con obligaciones inferidas
               const updatedProfile: UserProfile = { 
                   ...profile, 
                   lifeContext: {
                       ...profile.lifeContext!, 
                       obligations: obligations
                   }
               };
               setProfile(updatedProfile);
               localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
           }
       }
    };
    runInference();
  }, [profile?.uid, isOffline]); 

  // 3. CHECK FOR MISSIONS & BUILD DASHBOARD
  useEffect(() => {
    const build = async () => {
       if (profile) {
          // Prepare Mission
          const mission = await PreparationService.getNextMission(profile);
          setActiveMission(mission);

          // Build Smart Dashboard Items
          const items = await DashboardBuilder.buildDashboard(profile, mission);
          setDashboardItems(items);
       }
    };
    build();
  }, [profile]);

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    // Ensure default config is set
    const initializedProfile = {
        ...newProfile,
        dashboardConfig: { pillarOrder: DEFAULT_PILLAR_ORDER, hiddenPillars: [] },
        themePreference: 'AUTO',
        themeConfig: { type: 'PRESET', value: 'ONYX' }
    };
    setProfile(initializedProfile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(initializedProfile));
  };

  const handleLogout = () => {
    localStorage.removeItem(PROFILE_KEY);
    setProfile(null);
    setIsSimulating(false);
    setOriginalAdminProfile(null);
    setShowChat(false);
    setSelectedPillarId(null);
    setActiveMission(null);
    setShowPermissionsTree(false);
    setShowSupportDashboard(false);
  };

  const handleLogoInteraction = () => {
    const now = Date.now();
    const timeDiff = now - lastClickRef.current;
    if (timeDiff > 0 && timeDiff < 300) {
      setShowEvolution(true);
    }
    lastClickRef.current = now;
  };

  const handleForceOpenAdmin = () => {
    setShowEvolution(true);
  };

  // MANUAL REFRESH ACTION
  const handleManualRefresh = async () => {
      if (isRefreshing || isOffline) return;
      
      setIsRefreshing(true);
      await BackgroundService.runFullScan('MANUAL');
      
      // Force UI refresh logic if needed (e.g. reload missions)
      if (profile) {
          const items = await DashboardBuilder.buildDashboard(profile, activeMission);
          setDashboardItems(items);
      }
      
      setIsRefreshing(false);
  };

  const handleSimulationChange = (tier: SubscriptionTier) => {
      if (!isSimulating) {
          setOriginalAdminProfile(profile);
          setIsSimulating(true);
      }
      SubscriptionService.setSimulationOverride(tier);
      const targetProfile = profile || SYSTEM_ADMIN_PROFILE;
      const updatedProfile = { 
          ...targetProfile, 
          subscriptionTier: tier,
          name: `Simulación (${tier})` 
      };
      setProfile(updatedProfile);
      setShowEvolution(false);
  };

  const handleExitSimulation = () => {
      if (originalAdminProfile) {
          setProfile(originalAdminProfile);
      } else {
          setProfile(null); 
      }
      setIsSimulating(false);
      setOriginalAdminProfile(null);
      setShowEvolution(true);
  };

  const checkPillarStatus = (pillarId: PillarId): PillarStatus => {
    if (!profile) return { id: pillarId, name: '', description: '', isActive: false, isDegraded: false, statusMessage: '', alerts: 0 };

    const def = PILLAR_DEFINITIONS[pillarId];
    const userTierVal = getTierLevel(profile.subscriptionTier);
    const requiredTierVal = getTierLevel(def.minTier);

    if (userTierVal < requiredTierVal) {
      return {
        id: pillarId,
        name: def.name,
        description: def.description,
        isActive: false,
        isDegraded: false,
        statusMessage: `Requiere Nivel ${def.minTier}`,
        alerts: 0
      };
    }

    const relatedPerms = TECHNICAL_PERMISSIONS.filter(p => p.relatedPillar === pillarId && p.requiredForFullFeature);
    const missingPerms = relatedPerms.filter(p => !profile.grantedPermissions.includes(p.id));
    
    if (missingPerms.length > 0) {
      return {
        id: pillarId,
        name: def.name,
        description: def.description,
        isActive: true,
        isDegraded: true,
        statusMessage: 'Modo Manual (Permisos Faltantes)',
        alerts: missingPerms.length
      };
    }

    return {
      id: pillarId,
      name: def.name,
      description: def.description,
      isActive: true,
      isDegraded: false,
      statusMessage: 'Operativo',
      alerts: 0
    };
  };

  // --- DASHBOARD EDIT LOGIC (Reorder & Visibility) ---
  const handleMovePillar = (index: number, direction: 'UP' | 'DOWN') => {
      if (!profile?.dashboardConfig) return;
      
      const newOrder = [...profile.dashboardConfig.pillarOrder];
      if (direction === 'UP' && index > 0) {
          [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      } else if (direction === 'DOWN' && index < newOrder.length - 1) {
          [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
      }
      
      const updatedProfile = { 
          ...profile, 
          dashboardConfig: { ...profile.dashboardConfig, pillarOrder: newOrder }
      };
      setProfile(updatedProfile);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
  };

  const handleTogglePillarVisibility = (pillarId: PillarId) => {
      if (!profile?.dashboardConfig) return;

      const currentHidden = new Set(profile.dashboardConfig.hiddenPillars);
      if (currentHidden.has(pillarId)) {
          currentHidden.delete(pillarId);
      } else {
          currentHidden.add(pillarId);
      }

      const updatedProfile = { 
          ...profile, 
          dashboardConfig: { ...profile.dashboardConfig, hiddenPillars: Array.from(currentHidden) }
      };
      setProfile(updatedProfile);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
  };

  // Memoized Pillars List based on User Config
  const pillars = useMemo(() => {
    if (!profile) return [];
    
    // Get Order from Config or Default
    const order = profile.dashboardConfig?.pillarOrder || DEFAULT_PILLAR_ORDER;
    
    return order.map(id => checkPillarStatus(id));
  }, [profile]);

  const evolutionConfig: LifeStageConfig | null = useMemo(() => {
    const activeProfile = isSimulating && originalAdminProfile ? originalAdminProfile : (profile || SYSTEM_ADMIN_PROFILE);
    return {
        stageName: activeProfile.archetype,
        description: `Configuración activa para nivel ${activeProfile.subscriptionTier}`,
        modules: Object.values(PillarId).map(pillarId => ({
            id: pillarId,
            title: PILLAR_DEFINITIONS[pillarId].name,
            permissions: TECHNICAL_PERMISSIONS.filter(p => p.relatedPillar === pillarId).map(p => ({
                ...p,
                defaultEnabled: activeProfile.grantedPermissions.includes(p.id),
                minTier: SubscriptionTier.FREE
            }))
        }))
    };
  }, [profile, isSimulating, originalAdminProfile]);

  const handleAddPermission = (moduleId: string, permission: PermissionItem) => {
    if (!profile) return;
    const newSet = new Set(profile.grantedPermissions);
    newSet.add(permission.id);
    const updatedProfile = { ...profile, grantedPermissions: Array.from(newSet) };
    setProfile(updatedProfile);
    if (!isSimulating) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
    }
  };

  const activeProfileForModal = profile || SYSTEM_ADMIN_PROFILE;

  // --- NAVIGATION HANDLERS ---
  const handleOpenPermissions = () => {
    setIsSettingsMenuOpen(false);
    setShowPermissionsTree(true);
  };

  const handleOpenSubscription = () => {
    setIsSettingsMenuOpen(false);
    setShowSubscriptionModal(true);
  };

  const handleOpenAppearance = () => {
    setIsSettingsMenuOpen(false);
    setShowAppearanceModal(true);
  };
  
  const handleOpenSupport = () => {
      setIsSettingsMenuOpen(false);
      setShowSupportDashboard(true);
  }

  const handleOpenHelp = () => {
      setIsSettingsMenuOpen(false);
      setShowSupportModal(true);
  }

  // Draggable logic variables
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = () => {
      if (!profile?.dashboardConfig) return;
      if (dragItem.current === null || dragOverItem.current === null) return;
      
      const newOrder = [...profile.dashboardConfig.pillarOrder];
      const draggedItemContent = newOrder[dragItem.current];
      
      // Remove and insert
      newOrder.splice(dragItem.current, 1);
      newOrder.splice(dragOverItem.current, 0, draggedItemContent);
      
      dragItem.current = null;
      dragOverItem.current = null;
      
      const updatedProfile = { 
          ...profile, 
          dashboardConfig: { ...profile.dashboardConfig, pillarOrder: newOrder }
      };
      setProfile(updatedProfile);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
  };

  // --- BACKGROUND / ATMOSPHERE LOGIC ---
  const getAppBackgroundStyle = () => {
      if (!profile || !profile.themeConfig) return 'bg-[#0c0a09]'; // Fallback Onyx

      const { type, value } = profile.themeConfig;

      if (type === 'PRESET') {
          const preset = VISUAL_PRESETS.find(p => p.id === value);
          return preset ? preset.cssClass : 'bg-[#0c0a09]';
      }
      // If CUSTOM, handled via inline style
      return 'bg-black';
  };

  const customBackgroundStyle = profile?.themeConfig?.type === 'CUSTOM' 
      ? { backgroundImage: `url(${profile.themeConfig.value})`, backgroundSize: 'cover', backgroundPosition: 'center' } 
      : {};


  return (
    <div 
        className={`min-h-screen text-stone-200 font-sans flex flex-col md:flex-row overflow-hidden relative transition-all duration-500 ${getAppBackgroundStyle()}`}
        style={customBackgroundStyle}
    >
      
      {/* CRITICAL ALERT POPUP */}
      {criticalAlert && (
          <Toast 
             message={criticalAlert.body} 
             type="ERROR" 
             onClose={() => setCriticalAlert(null)} 
          />
      )}

      {/* CUSTOM THEME VEIL (Luxury Overlay for Readability) */}
      {profile?.themeConfig?.type === 'CUSTOM' && (
          <div className="absolute inset-0 bg-black/70 pointer-events-none z-0"></div>
      )}

      {/* OFFLINE BANNER */}
      {isOffline && (
          <div className="fixed top-0 left-0 w-full z-[100] bg-amber-600/90 text-white text-[10px] font-bold uppercase tracking-widest text-center py-1 backdrop-blur-md shadow-lg flex items-center justify-center gap-2">
              <CloudOff size={12} /> Modo Sin Conexión - Visualizando copia local
          </div>
      )}

      {/* FULL SCREEN PERMISSIONS TREE */}
      {showPermissionsTree && profile && (
          <PermissionsTreeScreen 
              profile={profile}
              onUpdate={(p) => { setProfile(p); localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }}
              onClose={() => setShowPermissionsTree(false)}
          />
      )}

      {/* SUPPORT DASHBOARD (ADMIN) */}
      {showSupportDashboard && (
          <SupportDashboard onClose={() => setShowSupportDashboard(false)} />
      )}

      {/* SUPPORT MODAL (USER CONTACT) */}
      {showSupportModal && (
          <SupportModal onClose={() => setShowSupportModal(false)} />
      )}

      {/* SUBSCRIPTION MODAL */}
      {showSubscriptionModal && profile && <SettingsModal 
        profile={profile} 
        onClose={() => setShowSubscriptionModal(false)}
      />}

      {/* APPEARANCE MODAL */}
      {showAppearanceModal && profile && <AppearanceModal 
        profile={profile} 
        onClose={() => setShowAppearanceModal(false)}
        onUpdate={(p) => { setProfile(p); localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }}
      />}

      {showEvolution && evolutionConfig && (
          <EvolutionPanel 
            profile={activeProfileForModal}
            lifeStageConfig={evolutionConfig}
            onAddPermission={handleAddPermission}
            onClose={() => setShowEvolution(false)}
            onSimulateTier={handleSimulationChange}
            onOpenSupport={handleOpenSupport}
          />
      )}

      {!profile ? (
        <Onboarding 
          onComplete={handleOnboardingComplete} 
          onOpenAdmin={handleForceOpenAdmin} 
        />
      ) : (
        <>
          {/* SIDEBAR DASHBOARD */}
          <aside className={`w-full md:w-80 bg-dark-900 border-r border-stone-800 flex flex-col z-20 relative transition-colors duration-500 ${isSimulating ? 'border-red-900/50' : ''}`}>
            
            {isSimulating && (
                <div className="bg-red-900/20 border-b border-red-500/30 p-2 text-center animate-fadeIn">
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">
                        [MODO SIMULACIÓN: {profile.subscriptionTier}]
                    </p>
                    <button 
                        onClick={handleExitSimulation}
                        className="text-[9px] bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-sm uppercase font-bold"
                    >
                        Volver a Admin (Root)
                    </button>
                </div>
            )}

            <div 
              className="p-6 border-b border-stone-800 flex items-center gap-3 select-none"
            >
              <div 
                onClick={handleLogoInteraction} 
                className="cursor-pointer active:scale-95 transition-transform"
                title="System Core"
              >
                <Logo className="w-10 h-10 hover:scale-105 transition-transform" />
              </div>
              
              <div>
                <h1 className="font-serif font-bold text-lg text-ai-500 leading-none">El Mayordomo</h1>
                <span className="text-[10px] text-stone-500 uppercase tracking-widest">Digital</span>
              </div>
            </div>

            <div className="p-4 border-b border-stone-800 bg-black/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-500 uppercase font-bold">{profile.archetype}</span>
                <button 
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`p-1.5 rounded-sm transition-colors ${isEditMode ? 'bg-ai-500 text-black' : 'text-stone-500 hover:bg-stone-800'}`}
                    title="Editar Dashboard"
                >
                    {isEditMode ? <Check size={14} /> : <Edit3 size={14} />}
                </button>
              </div>
              <h2 className="text-xl font-serif text-stone-200">{profile.name}</h2>
              {isEditMode && <p className="text-[9px] text-ai-500 mt-1 uppercase tracking-wide">Modo Edición Activado</p>}
            </div>

            {/* PILLAR LIST WITH SELECTION LOGIC */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {pillars.map((pillar, index) => {
                const isSelected = selectedPillarId === pillar.id;
                const isHidden = profile.dashboardConfig?.hiddenPillars.includes(pillar.id);

                if (!isEditMode && isHidden) return null; // Don't show hidden pillars in normal mode
                
                return (
                  <div 
                    key={pillar.id}
                    onClick={() => !isEditMode && setSelectedPillarId(pillar.id)}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={`
                        cursor-pointer transition-all duration-300 transform 
                        ${isSelected && !isEditMode ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
                        ${isEditMode ? 'cursor-grab active:cursor-grabbing border border-dashed border-stone-700 p-1' : ''}
                        ${isHidden && isEditMode ? 'opacity-50 grayscale' : ''}
                    `}
                  >
                    <div className={`relative rounded-sm ${isSelected && !isEditMode ? 'ring-1 ring-ai-500 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : ''}`}>
                         <PillarCard 
                           id={pillar.id}
                           name={pillar.name}
                           description={pillar.description}
                           isActive={pillar.isActive}
                           isDegraded={pillar.isDegraded}
                           statusMessage={pillar.statusMessage}
                           isLocked={!pillar.isActive}
                         />

                         {/* EDIT OVERLAY CONTROLS */}
                         {isEditMode && (
                             <div className="absolute top-2 right-2 flex flex-col gap-1 bg-dark-950/80 p-1 rounded-sm border border-stone-700 backdrop-blur-sm z-20">
                                 <button onClick={(e) => { e.stopPropagation(); handleMovePillar(index, 'UP'); }} disabled={index === 0} className="text-stone-400 hover:text-white disabled:index === 0 ? 'opacity-30' : ''">
                                     <MoveUp size={12} />
                                 </button>
                                 <button onClick={(e) => { e.stopPropagation(); handleTogglePillarVisibility(pillar.id); }} className="text-ai-500 hover:text-white">
                                     {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                                 </button>
                                 <button onClick={(e) => { e.stopPropagation(); handleMovePillar(index, 'DOWN'); }} disabled={index === pillars.length - 1} className="text-stone-400 hover:text-white disabled:index === pillars.length - 1 ? 'opacity-30' : ''">
                                     <MoveDown size={12} />
                                 </button>
                             </div>
                         )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SIDEBAR FOOTER WITH POPUP SETTINGS */}
            <div className="p-4 border-t border-stone-800 flex justify-between items-center bg-dark-950 relative">
              
              {/* Settings Dropdown Container */}
              <div className="relative" ref={settingsMenuRef}>
                  <button 
                    onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)} 
                    className={`p-2 rounded-full transition-colors ${isSettingsMenuOpen ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-white hover:bg-stone-800'}`}
                  >
                    <Settings size={20} />
                  </button>

                  {/* POPUP MENU */}
                  {isSettingsMenuOpen && (
                      <div className="absolute bottom-full left-0 mb-3 w-64 bg-stone-900 border border-stone-700 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden animate-fadeIn">
                          
                          {/* OPTION 1: PERMISSIONS */}
                          <button 
                             onClick={handleOpenPermissions}
                             className="flex items-center gap-3 p-3 hover:bg-stone-800 text-stone-300 hover:text-white text-left transition-colors border-b border-stone-800"
                          >
                             <Shield size={16} className="text-ai-500" />
                             <div>
                                <div className="text-xs font-bold">Protocolos y Permisos</div>
                                <div className="text-[9px] text-stone-500">Configuración Técnica</div>
                             </div>
                             <ChevronRight size={14} className="ml-auto opacity-50" />
                          </button>

                          {/* OPTION 2: APPEARANCE (NEW) */}
                          <button 
                             onClick={handleOpenAppearance}
                             className="flex items-center gap-3 p-3 hover:bg-stone-800 text-stone-300 hover:text-white text-left transition-colors border-b border-stone-800"
                          >
                             <Palette size={16} className="text-purple-500" />
                             <div>
                                <div className="text-xs font-bold">Apariencia y Temas</div>
                                <div className="text-[9px] text-stone-500">Personalización Visual</div>
                             </div>
                             <ChevronRight size={14} className="ml-auto opacity-50" />
                          </button>
                          
                          {/* OPTION 3: SUBSCRIPTION */}
                          <button 
                             onClick={handleOpenSubscription}
                             className="flex items-center gap-3 p-3 hover:bg-stone-800 text-stone-300 hover:text-white text-left transition-colors border-b border-stone-800"
                          >
                             <CreditCard size={16} className="text-emerald-500" />
                             <div>
                                <div className="text-xs font-bold">Mi Suscripción</div>
                                <div className="text-[9px] text-stone-500">Facturación y Planes</div>
                             </div>
                             <ChevronRight size={14} className="ml-auto opacity-50" />
                          </button>

                          {/* OPTION 4: USER HELP */}
                          <button 
                             onClick={handleOpenHelp}
                             className="flex items-center gap-3 p-3 hover:bg-stone-800 text-stone-300 hover:text-white text-left transition-colors border-b border-stone-800"
                          >
                             <HelpCircle size={16} className="text-blue-500" />
                             <div>
                                <div className="text-xs font-bold">Ayuda y Contacto</div>
                                <div className="text-[9px] text-stone-500">Enviar Consulta</div>
                             </div>
                             <ChevronRight size={14} className="ml-auto opacity-50" />
                          </button>

                          {/* OPTION 5: RETURN TO ADMIN (Only in Simulation) */}
                          {isSimulating && (
                              <button 
                                onClick={() => { setIsSettingsMenuOpen(false); handleExitSimulation(); }}
                                className="flex items-center gap-3 p-3 bg-red-900/20 hover:bg-red-900/40 text-red-300 text-left transition-colors"
                              >
                                  <Undo2 size={16} className="text-red-500" />
                                  <div>
                                      <div className="text-xs font-bold">Volver a Admin</div>
                                      <div className="text-[9px] text-red-400">Salir de Simulación</div>
                                  </div>
                              </button>
                          )}
                      </div>
                  )}
              </div>
              
              <button 
                onClick={() => !isOffline && setShowChat(!showChat)} 
                disabled={isOffline}
                className={`p-2 rounded-full transition-colors ${showChat ? 'text-ai-400 bg-ai-900/20' : 'text-ai-500 hover:bg-stone-800 hover:text-ai-400 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                title="Abrir Asistente"
              >
                <MessageSquare size={20} />
              </button>

              <button onClick={handleLogout} className="p-2 hover:bg-stone-800 rounded-full text-stone-500 hover:text-red-400 transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 flex flex-col relative overflow-hidden transition-colors duration-500 bg-transparent">
            
            {/* MANUAL REFRESH BUTTON (Top Right) */}
            <div className="absolute top-4 right-4 z-40">
                <button 
                    onClick={handleManualRefresh}
                    disabled={isRefreshing || isOffline}
                    className={`p-2 rounded-full bg-black/40 text-stone-400 hover:text-white border border-stone-700 hover:border-ai-500 backdrop-blur-sm transition-all shadow-lg ${isRefreshing ? 'opacity-70 cursor-wait' : ''}`}
                    title="Actualizar Sistema (Escaneo Manual)"
                >
                    <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-ai-500' : ''} />
                </button>
            </div>

            {/* Standard Noise Effect - Only if not Custom Image */}
            {profile.themeConfig?.type !== 'CUSTOM' && (
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
            )}
            
            {isSimulating && (
                <div className="absolute top-2 right-16 z-50 opacity-50 pointer-events-none">
                    <Eye className="text-red-500 animate-pulse" />
                </div>
            )}

            {/* FLOATING CHAT WINDOW */}
            {showChat && !isOffline && (
              <div className="absolute bottom-4 left-4 z-50 w-96 h-[600px] max-h-[85vh] bg-stone-900 border border-stone-700 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-slideInUp backdrop-blur-sm">
                <button 
                  onClick={() => setShowChat(false)} 
                  className="absolute top-2 right-2 z-50 p-1 bg-black/50 hover:bg-black/80 text-stone-400 hover:text-white rounded-full transition-colors"
                >
                  <X size={14} />
                </button>
                <ChatInterface 
                  userProfile={profile} 
                  pillarStatuses={pillars} 
                />
              </div>
            )}

            {/* DYNAMIC CONTENT SWITCHER */}
            {selectedPillarId ? (
                // VIEW 1: PILLAR DETAIL (BENTO GRID)
                <PillarDetailView 
                    pillarId={selectedPillarId}
                    userProfile={profile}
                    status={pillars.find(p => p.id === selectedPillarId)!}
                />
            ) : (
                // VIEW 2: DASHBOARD HOME (MISSION CONTROL)
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative z-10 pt-16 md:pt-8">
                   
                   {/* 1. MISSION BRIEFING (PREPARATION ENGINE) */}
                   {activeMission && (
                      <MissionBriefingCard mission={activeMission} />
                   )}

                   {/* 2. GENERATIVE DASHBOARD (BENTO GRID) */}
                   <SmartDashboard items={dashboardItems} />
                   
                   {!activeMission && dashboardItems.length === 0 && (
                     <div className="flex-1 flex items-center justify-center opacity-10 select-none pointer-events-none flex-col gap-4 mt-20">
                        <Logo className="w-64 h-64 grayscale" />
                        <p className="font-serif italic text-2xl tracking-widest text-stone-500/50">Sistemas en Espera</p>
                     </div>
                   )}
                </div>
            )}
          </main>
        </>
      )}
    </div>
  );
};

export default App;
