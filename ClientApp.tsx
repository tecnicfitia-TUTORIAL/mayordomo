
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, PillarId, CapabilityStatus, SubscriptionTier, PillarStatus, LifeStageConfig, PermissionItem, UserArchetype, Mission, DashboardConfig } from './types';
import { PILLAR_DEFINITIONS, TECHNICAL_PERMISSIONS, getTierLevel, ADMIN_EMAILS, VISUAL_PRESETS } from './constants';
import { Onboarding } from './components/Onboarding';
import { ChatInterface } from './components/ChatInterface';
import { SettingsModal } from './components/SettingsModal';
import { AppearanceModal } from './components/AppearanceModal';
import { EvolutionPanel } from './components/EvolutionPanel';
import { EvolutionInfinitoPanel } from './components/EvolutionInfinitoPanel';
import { 
  Activity, LayoutDashboard, ShieldCheck, Home, Plane, Heart, Users, 
  Settings, LogOut, MessageSquare, RefreshCw, CloudOff, Check, Edit3, 
  Shield, CreditCard, Palette, HelpCircle, LifeBuoy, ChevronRight, 
  FileText, Undo2, Eye, X, Lock
} from 'lucide-react';
import { PillarCard } from './components/PillarCard';
import { PillarDetailView } from './components/PillarDetailView';
import { MissionBriefingCard } from './components/MissionBriefingCard';
import { PermissionsTreeScreen } from './components/PermissionsTreeScreen';
import { SmartDashboard } from './components/SmartDashboard';
import { SupportDashboard } from './components/SupportDashboard';
import { SupportModal } from './components/SupportModal';
import { LegalModal } from './components/LegalModal';
import { DemoModal } from './components/DemoModal';
import { Toast } from './components/Toast'; 
import { Logo } from './components/Logo';
import { MayordomoCompanion } from './components/MayordomoCompanion';
import { SubscriptionService } from './services/subscriptionService';
import { PreparationService } from './services/preparationService';
import { InferenceEngine } from './services/inferenceService';
import { DashboardBuilder } from './services/dashboardBuilder';
import { BackgroundService } from './services/backgroundService';
import { NotificationService, AppNotification } from './services/notificationService';
import { EmailIngestionService, IncomingEmail } from './services/emailIngestionService';
import { StripeService } from './services/stripeService';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminDashboard } from './components/AdminDashboard';
import { auth, db } from './services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const PROFILE_KEY = 'mayordomo_profile';

// SECURITY: Sanitize sensitive data before storing in localStorage
// This prevents CodeQL alert about storing sensitive information
// Removes passwords, tokens, hashes, keys, and any other credentials
const sanitizeProfileForStorage = (profile: UserProfile): UserProfile => {
  // Create a shallow copy first
  const sanitized = { ...profile };
  
  // Explicitly delete any sensitive fields that should NEVER be stored in localStorage
  // This protects against current and future sensitive data from being persisted
  const sensitiveFields = [
    'password',
    'passwordHash',
    'hash',
    'privateKey',
    'secretKey',
    'secret',
    'accessToken',
    'refreshToken',
    'sessionToken',
    'token',
    'credential',
    'credentials',
    'apiKey',
    'encryptedData',
    'sensitiveInfo'
  ] as const;
  
  // Remove sensitive fields from the profile
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      delete (sanitized as any)[field];
    }
  });
  
  // Return the sanitized copy safe for localStorage
  return sanitized;
};


const SYSTEM_ADMIN_PROFILE: UserProfile = {
  uid: 'system_root',
  email: 'root@system.local',
  name: 'System Root',
  role: 'ADMIN',
  age: 99,
  gender: 'AI',
  occupation: 'System Core',
  archetype: UserArchetype.CONSTRUCTOR,
  subscriptionTier: SubscriptionTier.VIP,
  grantedPermissions: TECHNICAL_PERMISSIONS.map(p => p.id),
  setupCompleted: true
};

const DEFAULT_PILLAR_ORDER = Object.values(PillarId);

const TABS = [
  { id: 'RESUMEN', label: 'Resumen', icon: LayoutDashboard },
  { id: PillarId.CENTINELA, label: 'Centinela', icon: ShieldCheck },
  { id: PillarId.PATRIMONIO, label: 'Hogar', icon: Home },
  { id: PillarId.CONCIERGE, label: 'Concierge', icon: Plane },
  { id: PillarId.VITAL, label: 'Coach', icon: Heart },
  { id: PillarId.NUCLEO, label: 'Familia', icon: Users }
];

interface Props {
  isDemoMode?: boolean;
}

const ClientApp: React.FC<Props> = ({ isDemoMode = false }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'PLANS' | 'PROFILE' | 'SECURITY'>('PLANS');
  const [showDemoModal, setShowDemoModal] = useState(false); // For Demo Restrictions

  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [showPermissionsTree, setShowPermissionsTree] = useState(false);
  const [showSupportDashboard, setShowSupportDashboard] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [legalType, setLegalType] = useState<'PRIVACY' | 'TERMS' | 'NOTICE' | null>(null);
  const [showEvolution, setShowEvolution] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  const [criticalAlert, setCriticalAlert] = useState<AppNotification | null>(null);
  const [ingestionToast, setIngestionToast] = useState<{msg: string, type: 'INFO' | 'WARNING'} | null>(null);
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [settingsMenuPosition, setSettingsMenuPosition] = useState<'top' | 'bottom'>('top');
  const [adminView, setAdminView] = useState<'MENU' | 'SIMULATION' | 'SUPPORT' | 'EVOLUTION'>('MENU');
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const [activeTab, setActiveTab] = useState<string>('RESUMEN');
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [originalAdminProfile, setOriginalAdminProfile] = useState<UserProfile | null>(null);

  const [dashboardItems, setDashboardItems] = useState<any[]>([]);
  const [highlightPermissionId, setHighlightPermissionId] = useState<string | undefined>(undefined);

  // 0. OFFLINE DETECTION & THEME APPLICATION & BACKGROUND SERVICE & CONFIG
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize Services
    BackgroundService.init();
    
    // Initialize Stripe with Vercel Env Var (Safe Access)
    const env = (import.meta as any).env || {};
    const stripeKey = env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (stripeKey) {
        StripeService.initStripe(stripeKey);
    } else {
        console.log("[System] Stripe Key missing in environment.");
    }

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

  // 0.B EMAIL INGESTION SIMULATION LOOP
  useEffect(() => {
      if (!profile || isOffline) return;

      const runEmailCheck = async () => {
          // Mock Incoming Email
          const mockEmail: IncomingEmail = {
              id: `email_${Date.now()}`,
              sender: 'facturas@iberdrola.es',
              subject: 'Factura Electrónica: Periodo Octubre',
              snippet: 'Adjunto encontrará el recibo de su consumo...',
              hasAttachments: true,
              timestamp: new Date()
          };

          const result = await EmailIngestionService.processIncomingEmail(mockEmail, profile);

          if (result.status === 'BLOCKED_TIER') {
              // Optional: Show subtle toast for demo purposes
          } else if (result.status === 'PROCESSED') {
              NotificationService.send('Nuevo Documento', 'Factura archivada automáticamente en Patrimonio.', 'SILENT');
              setIngestionToast({ msg: 'Factura procesada automáticamente', type: 'INFO' });
          }
      };

      // Run once 10 seconds after load to demo
      const timer = setTimeout(runEmailCheck, 10000);
      return () => clearTimeout(timer);
  }, [profile?.subscriptionTier, isOffline]);


  useEffect(() => {
    if (profile) {
        // DEFAULT THEME: DARK
        const pref = profile.themePreference || 'DARK';
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
        if (isDemoMode) {
            const demoProfile: UserProfile = {
                uid: 'demo_user',
                email: 'demo@mayordomo.app',
                name: 'Usuario Demo',
                role: 'USER',
                age: 35,
                gender: 'MALE',
                occupation: 'CEO',
                archetype: UserArchetype.CONSTRUCTOR,
                subscriptionTier: SubscriptionTier.VIP,
                grantedPermissions: TECHNICAL_PERMISSIONS.map(p => p.id),
                setupCompleted: true,
                mfaEnabled: true,
                dashboardConfig: { pillarOrder: DEFAULT_PILLAR_ORDER, hiddenPillars: [] }
            };
            setProfile(demoProfile);
            return;
        }

        const saved = localStorage.getItem(PROFILE_KEY);
        
        if (saved) {
            let user = JSON.parse(saved);
            
            // DEFENSIVE CODING: ENSURE CRITICAL ARRAYS EXIST
            if (!user.grantedPermissions) user.grantedPermissions = [];
            if (!user.dashboardConfig) {
                user.dashboardConfig = { pillarOrder: DEFAULT_PILLAR_ORDER, hiddenPillars: [] };
            }

            try {
                if (navigator.onLine) {
                    const currentTier = await SubscriptionService.getCurrentUserTier(user.uid);
                    if (currentTier !== user.subscriptionTier) {
                        user = { ...user, subscriptionTier: currentTier };
                    }
                }
            } catch (e) {
                console.error("Failed to sync subscription:", e);
            }
            setProfile(user);
            localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfileForStorage(user)));
        } else {
            // FALLBACK: Try to recover profile from Firestore if Auth is active
            // This prevents showing Onboarding unnecessarily if localStorage was cleared
            const currentUser = auth.currentUser;
            if (currentUser) {
                try {
                    console.log("[Session] Recovering profile from Firestore...");
                    const docRef = doc(db, 'users', currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        const userData = docSnap.data() as UserProfile;
                        // Ensure local fields are present
                        const recoveredProfile: UserProfile = {
                            ...userData,
                            uid: currentUser.uid, // Ensure UID matches
                            grantedPermissions: userData.grantedPermissions || [],
                            dashboardConfig: userData.dashboardConfig || { pillarOrder: DEFAULT_PILLAR_ORDER, hiddenPillars: [] }
                        };
                        
                        setProfile(recoveredProfile);
                        localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfileForStorage(recoveredProfile)));
                        console.log("[Session] Profile recovered successfully.");
                    }
                } catch (error) {
                    console.error("[Session] Failed to recover profile:", error);
                }
            }
        }
    };
    
    // Listen for Auth State Changes to trigger recovery if needed
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
        if (user && !localStorage.getItem(PROFILE_KEY)) {
             initializeSession();
        }
    });

    initializeSession();
    
    return () => unsubscribeAuth();
  }, []);

  // 2. RUN INFERENCE ENGINE
  useEffect(() => {
    const runInference = async () => {
       if (profile && profile.setupCompleted && !isOffline) {
           if (!profile.lifeContext || !profile.lifeContext.obligations) {
               const obligations = await InferenceEngine.inferObligations(profile);
               const updatedProfile: UserProfile = { 
                   ...profile, 
                   lifeContext: {
                       ...profile.lifeContext!, 
                       obligations: obligations
                   }
               };
               setProfile(updatedProfile);
               localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfileForStorage(updatedProfile)));
           }
       }
    };
    runInference();
  }, [profile?.uid, isOffline]); 

  // 3. CHECK FOR MISSIONS & BUILD DASHBOARD
  useEffect(() => {
    const build = async () => {
       if (profile) {
          const mission = await PreparationService.getNextMission(profile);
          setActiveMission(mission);
          const items = await DashboardBuilder.buildDashboard(profile, mission);
          setDashboardItems(items);
       }
    };
    build();
  }, [profile]);

  // 4. ROUTE GUARD (PROTECCIÓN DE RUTA)
  useEffect(() => {
    // Si el usuario intenta ver el dashboard de soporte pero NO es admin, lo echamos.
    if (showSupportDashboard && profile && (!profile.role || profile.role.toUpperCase() !== 'ADMIN')) {
        console.warn("[Security] Unauthorized access to Support Dashboard blocked.");
        setShowSupportDashboard(false);
        setCriticalAlert({
            id: 'auth_guard',
            title: 'Acceso Denegado',
            body: 'No tiene privilegios de administrador para ver esta pantalla.',
            priority: 'CRITICAL',
            timestamp: new Date()
        });
    }
  }, [showSupportDashboard, profile]);

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    const initializedProfile: UserProfile = {
        ...newProfile,
        grantedPermissions: newProfile.grantedPermissions || [], // Ensure array
        dashboardConfig: { pillarOrder: DEFAULT_PILLAR_ORDER, hiddenPillars: [] },
        themePreference: 'DARK', // Initialize with DARK mode
        themeConfig: { type: 'PRESET', value: 'ONYX' }
    };
    setProfile(initializedProfile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfileForStorage(initializedProfile)));

    // --- ENRUTAMIENTO INTELIGENTE (SMART LOGIN FLOW) ---
    // Si el rol es ADMIN (case-insensitive), redirigimos directamente al Panel de Soporte.
    if (newProfile.role && newProfile.role.toUpperCase() === 'ADMIN') {
        console.log("[Auth] Admin Login Detected. Redirecting to Support Console...");
        setShowSupportDashboard(true); 
        setIngestionToast({ msg: 'Bienvenido, Administrador. Sesión Iniciada.', type: 'INFO' });
    } else {
        // Usuario normal va al dashboard estándar
        setShowSupportDashboard(false);
        setIngestionToast({ msg: 'Sistemas sincronizados correctamente.', type: 'INFO' });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
    localStorage.removeItem(PROFILE_KEY);
    setProfile(null);
    setIsSimulating(false);
    setOriginalAdminProfile(null);
    setShowChat(false);
    setActiveTab('RESUMEN');
    setActiveMission(null);
    setShowPermissionsTree(false);
    setShowSupportDashboard(false);
    navigate('/'); // Redirect to Landing Page
  };

  const handleManualRefresh = async () => {
      if (isRefreshing || isOffline) return;
      setIsRefreshing(true);
      await BackgroundService.runFullScan('MANUAL');
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
    
    // CRITICAL: use robust tier check (Numeric comparison fixes string bugs)
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
    
    // SAFETY FIX: Handle undefined permissions using Optional Chaining and Default value
    const userPermissions = profile?.grantedPermissions || [];
    const missingPerms = relatedPerms.filter(p => !userPermissions.includes(p.id));
    
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
      localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfileForStorage(updatedProfile)));
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
      localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfileForStorage(updatedProfile)));
  };

  const pillars = useMemo(() => {
    if (!profile) return [];
    const order = profile.dashboardConfig?.pillarOrder || DEFAULT_PILLAR_ORDER;
    return order.map(id => checkPillarStatus(id));
  }, [profile]);

  const evolutionConfig: LifeStageConfig | null = useMemo(() => {
    const activeProfile = isSimulating && originalAdminProfile ? originalAdminProfile : (profile || SYSTEM_ADMIN_PROFILE);
    // DEFENSIVE CODING: Check permissions exist
    const safePermissions = activeProfile?.grantedPermissions || [];
    
    return {
        stageName: activeProfile.archetype,
        description: `Configuración activa para nivel ${activeProfile.subscriptionTier}`,
        modules: Object.values(PillarId).map(pillarId => ({
            id: pillarId,
            title: PILLAR_DEFINITIONS[pillarId].name,
            permissions: TECHNICAL_PERMISSIONS.filter(p => p.relatedPillar === pillarId).map(p => ({
                ...p,
                defaultEnabled: safePermissions.includes(p.id),
                minTier: SubscriptionTier.FREE
            }))
        }))
    };
  }, [profile, isSimulating, originalAdminProfile]);

  const handleAddPermission = (moduleId: string, permission: PermissionItem) => {
    if (!profile) return;
    // DEFENSIVE CODING: Initialize Set with empty array fallback
    const newSet = new Set(profile.grantedPermissions || []);
    newSet.add(permission.id);
    const updatedProfile = { ...profile, grantedPermissions: Array.from(newSet) };
    setProfile(updatedProfile);
    if (!isSimulating) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfileForStorage(updatedProfile)));
    }
  };

  const activeProfileForModal = profile || SYSTEM_ADMIN_PROFILE;

  const handleOpenPermissions = (permissionId?: string | any) => { 
      setIsSettingsMenuOpen(false); 
      if (typeof permissionId === 'string') {
          setHighlightPermissionId(permissionId);
      } else {
          setHighlightPermissionId(undefined);
      }
      setShowPermissionsTree(true); 
  };
  const handleOpenSubscription = () => { setIsSettingsMenuOpen(false); setSettingsInitialTab('PLANS'); setShowSubscriptionModal(true); };
  const handleOpenProfile = () => { setIsSettingsMenuOpen(false); setSettingsInitialTab('PROFILE'); setShowSubscriptionModal(true); };
  const handleOpenSecurity = () => { setIsSettingsMenuOpen(false); setSettingsInitialTab('SECURITY'); setShowSubscriptionModal(true); };
  const handleOpenAppearance = () => { setIsSettingsMenuOpen(false); setShowAppearanceModal(true); };
  const handleOpenSupport = () => { setIsSettingsMenuOpen(false); setShowSupportDashboard(true); }
  const handleOpenHelp = () => { setIsSettingsMenuOpen(false); setShowSupportModal(true); }
  
  // FIXED: Open Legal Modal correctly instead of Subscription Modal
  const handleOpenLegal = () => { 
    setIsSettingsMenuOpen(false); 
    setLegalType('NOTICE'); // Default to Legal Notice
  }

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => { dragItem.current = position; };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => { dragOverItem.current = position; };

  const handleDragEnd = () => {
      if (!profile?.dashboardConfig) return;
      if (dragItem.current === null || dragOverItem.current === null) return;
      const newOrder = [...profile.dashboardConfig.pillarOrder];
      const draggedItemContent = newOrder[dragItem.current];
      newOrder.splice(dragItem.current, 1);
      newOrder.splice(dragOverItem.current, 0, draggedItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      const updatedProfile = { 
          ...profile, 
          dashboardConfig: { ...profile.dashboardConfig, pillarOrder: newOrder }
      };
      setProfile(updatedProfile);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfileForStorage(updatedProfile)));
  };

  const getAppBackgroundStyle = () => {
      if (!profile || !profile.themeConfig) return 'bg-[#0c0a09]';
      const { type, value } = profile.themeConfig;
      if (type === 'PRESET') {
          const preset = VISUAL_PRESETS.find(p => p.id === value);
          return preset ? preset.cssClass : 'bg-[#0c0a09]';
      }
      return 'bg-black';
  };

  const customBackgroundStyle = profile?.themeConfig?.type === 'CUSTOM' 
      ? { backgroundImage: `url(${profile.themeConfig.value})`, backgroundSize: 'cover', backgroundPosition: 'center' } 
      : {};

  return (
    <div 
        className={`h-screen text-stone-200 font-sans flex flex-col md:flex-row overflow-hidden relative transition-all duration-500 ${getAppBackgroundStyle()}`}
        style={customBackgroundStyle}
    >
      
      {/* DEMO MODE INDICATOR */}
      {isDemoMode && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#D4AF37] z-[100] shadow-[0_0_20px_#D4AF37]" />
      )}

      {criticalAlert && (
          <Toast message={criticalAlert.body} type="ERROR" onClose={() => setCriticalAlert(null)} />
      )}

      {ingestionToast && (
          <Toast message={ingestionToast.msg} type={ingestionToast.type === 'WARNING' ? 'WARNING' : 'INFO'} onClose={() => setIngestionToast(null)} />
      )}

      {profile?.themeConfig?.type === 'CUSTOM' && (
          <div className="absolute inset-0 bg-black/70 pointer-events-none z-0"></div>
      )}

      {isOffline && (
          <div className="fixed top-0 left-0 w-full z-[100] bg-amber-600/90 text-white text-[10px] font-bold uppercase tracking-widest text-center py-1 backdrop-blur-md shadow-lg flex items-center justify-center gap-2">
              <CloudOff size={12} /> Modo Sin Conexión - Visualizando copia local
          </div>
      )}

      {showPermissionsTree && profile && (
          <PermissionsTreeScreen 
              profile={profile}
              onUpdate={(p) => { setProfile(p); localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfileForStorage(p))); }}
              onClose={() => setShowPermissionsTree(false)}
              highlightPermissionId={highlightPermissionId}
          />
      )}

      {showSupportDashboard && (
          <SupportDashboard onClose={() => {
            // When admin closes support dashboard, logout to return to landing page
            setShowSupportDashboard(false);
            handleLogout();
          }} />
      )}

      {showSupportModal && (
          <SupportModal onClose={() => setShowSupportModal(false)} />
      )}

      {showSubscriptionModal && profile && <SettingsModal 
        profile={profile} 
        isDemoMode={isDemoMode}
        initialTab={settingsInitialTab}
        onClose={() => setShowSubscriptionModal(false)}
        onUpdate={(updatedProfile) => {
            if (isDemoMode) {
                setShowDemoModal(true);
                return;
            }
            setProfile(updatedProfile);
            localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfileForStorage(updatedProfile)));
        }}
      />}

      {showDemoModal && (
          <DemoModal onClose={() => setShowDemoModal(false)} />
      )}

      {showAppearanceModal && profile && <AppearanceModal  
        profile={profile} 
        onClose={() => setShowAppearanceModal(false)}
        onUpdate={(p) => { setProfile(p); localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfileForStorage(p))); }}
      />}

      {legalType && (
          <LegalModal type={legalType} onClose={() => setLegalType(null)} />
      )}

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
        />
      ) : (
        <>
          {/* --- ADMIN SIDEBAR (ONLY FOR ADMINS) --- */}
          {(profile.role === 'ADMIN' || originalAdminProfile) && (
             <AdminSidebar 
                onOpenMenu={() => setAdminView('MENU')}
                onOpenSettings={() => setIsSettingsMenuOpen(true)}
                onOpenChat={() => setShowChat(true)}
                onLogout={handleLogout}
                activeView={adminView}
             />
          )}

          {/* --- USER SIDEBAR (ONLY FOR NON-ADMINS) --- */}
          {!(profile.role === 'ADMIN' || originalAdminProfile) && (
            <aside className={`w-full md:w-80 bg-dark-900 border-r border-stone-800 flex flex-col z-20 relative transition-colors duration-500`}>
              <div className="p-6 border-b border-stone-800 flex items-center gap-3 select-none">
                <div className="select-none" title="System Core">
                  <Logo className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="font-serif font-bold text-lg text-ai-500 leading-none">El Mayordomo</h1>
                  <span className="text-[10px] text-stone-500 uppercase tracking-widest">Digital</span>
                </div>
              </div>

              <div className="p-4 border-b border-stone-800 bg-black/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-stone-500 uppercase font-bold">{profile.archetype}</span>
                  <button onClick={() => setIsEditMode(!isEditMode)} className={`p-1.5 rounded-sm transition-colors ${isEditMode ? 'bg-ai-500 text-black' : 'text-stone-500 hover:bg-stone-800'}`} title="Editar Dashboard">
                      {isEditMode ? <Check size={14} /> : <Edit3 size={14} />}
                  </button>
                </div>
                <h2 className="text-xl font-serif text-stone-200">{profile.name}</h2>
                <p className="text-xs text-stone-500 font-mono mt-1 truncate" title={profile.email}>{profile.email}</p>
                {isEditMode && <p className="text-[9px] text-ai-500 mt-1 uppercase tracking-wide">Modo Edición Activado</p>}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                <div className="text-xs text-stone-500 p-2 text-center opacity-50">
                    Navegación Principal Superior
                </div>
              </div>

              <div className="p-4 border-t border-stone-800 bg-dark-950 relative">
                <div className="flex justify-between items-center relative" ref={settingsMenuRef}>
                  <button 
                    ref={settingsButtonRef}
                    onClick={() => {
                        if (isDemoMode) {
                            setShowDemoModal(true);
                            return;
                        }
                        
                        // Dynamic Positioning Logic
                        if (!isSettingsMenuOpen && settingsButtonRef.current) {
                            const rect = settingsButtonRef.current.getBoundingClientRect();
                            const spaceBelow = window.innerHeight - rect.bottom;
                            // If less than 350px below, show upwards (top), else downwards (bottom)
                            if (spaceBelow < 350) {
                                setSettingsMenuPosition('top');
                            } else {
                                setSettingsMenuPosition('bottom');
                            }
                        }
                        
                        setIsSettingsMenuOpen(prev => !prev);
                    }} 
                    className={`p-2 transition-colors ${isDemoMode ? 'text-stone-600 cursor-not-allowed' : 'text-stone-500 hover:text-white'}`}
                  >
                    <Settings size={20} />
                  </button>
                  
                  {isSettingsMenuOpen && (
                    <div className={`absolute ${settingsMenuPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-48 bg-stone-900 border border-stone-800 rounded-lg shadow-xl overflow-hidden animate-fadeIn z-50`}>
                      <button onClick={handleOpenPermissions} className="w-full text-left px-4 py-3 text-xs text-stone-300 hover:bg-stone-800 hover:text-white border-b border-stone-800 flex items-center gap-2">
                        <Shield size={14} /> Permisos
                      </button>
                      <button onClick={handleOpenProfile} className="w-full text-left px-4 py-3 text-xs text-stone-300 hover:bg-stone-800 hover:text-white border-b border-stone-800 flex items-center gap-2">
                        <Users size={14} /> Perfil
                      </button>
                      <button onClick={handleOpenSecurity} className="w-full text-left px-4 py-3 text-xs text-stone-300 hover:bg-stone-800 hover:text-white border-b border-stone-800 flex items-center gap-2">
                        <Lock size={14} /> Seguridad
                      </button>
                      <button onClick={handleOpenSubscription} className="w-full text-left px-4 py-3 text-xs text-stone-300 hover:bg-stone-800 hover:text-white border-b border-stone-800 flex items-center gap-2">
                        <CreditCard size={14} /> Suscripción
                      </button>
                      <button onClick={handleOpenAppearance} className="w-full text-left px-4 py-3 text-xs text-stone-300 hover:bg-stone-800 hover:text-white border-b border-stone-800 flex items-center gap-2">
                        <Palette size={14} /> Apariencia
                      </button>
                      <button onClick={handleOpenHelp} className="w-full text-left px-4 py-3 text-xs text-stone-300 hover:bg-stone-800 hover:text-white border-b border-stone-800 flex items-center gap-2">
                        <HelpCircle size={14} /> Ayuda
                      </button>
                      <button onClick={handleOpenSupport} className="w-full text-left px-4 py-3 text-xs text-stone-300 hover:bg-stone-800 hover:text-white border-b border-stone-800 flex items-center gap-2">
                        <LifeBuoy size={14} /> Soporte
                      </button>
                      <div className="border-t border-stone-800 my-1"></div>
                      <button onClick={() => setLegalType('PRIVACY')} className="w-full text-left px-4 py-2 text-[10px] text-stone-500 hover:text-stone-300">Privacidad</button>
                      <button onClick={() => setLegalType('TERMS')} className="w-full text-left px-4 py-2 text-[10px] text-stone-500 hover:text-stone-300">Términos</button>
                    </div>
                  )}

                  <button onClick={() => setShowChat(!showChat)} className={`p-2 transition-colors ${showChat ? 'text-ai-500' : 'text-stone-500 hover:text-white'}`}>
                    <MessageSquare size={20} />
                  </button>
                  <button 
                    onClick={() => {
                        if (isDemoMode) {
                            // Force full reload to clear state and return to Landing Page
                            window.location.replace('/');
                            return;
                        }
                        handleLogout();
                    }} 
                    className="p-2 text-stone-500 hover:text-red-500 transition-colors"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            </aside>
          )}

          <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-stone-950">
            
            {/* --- ADMIN DASHBOARD LOGIC --- */}
            {(profile.role === 'ADMIN' || originalAdminProfile) && adminView === 'MENU' && (
                <AdminDashboard 
                    onSimulate={(tier) => {
                        handleSimulationChange(tier);
                        setAdminView('SIMULATION');
                    }}
                    onOpenSupport={() => setAdminView('SUPPORT')}
                    onOpenEvolution={() => setAdminView('EVOLUTION')}
                    onForceScan={handleManualRefresh}
                />
            )}

            {(profile.role === 'ADMIN' || originalAdminProfile) && adminView === 'SUPPORT' && (
                <SupportDashboard onClose={() => setAdminView('MENU')} />
            )}

            {(profile.role === 'ADMIN' || originalAdminProfile) && adminView === 'EVOLUTION' && (
                <EvolutionInfinitoPanel 
                    onClose={() => setAdminView('MENU')}
                    profile={activeProfileForModal}
                    evolutionConfig={evolutionConfig}
                />
            )}

            {/* --- STANDARD USER VIEW (Used for Normal Users OR Admin Simulation) --- */}
            {(!(profile.role === 'ADMIN' || originalAdminProfile) || adminView === 'SIMULATION') && (
            <>
            {/* --- HEADER --- */}
            <div className="h-16 border-b border-stone-800 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md z-20 shrink-0">
              <div className="flex items-center gap-4">
                {isSimulating && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-900/20 border border-red-500/30 rounded-full">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Simulando: {profile.subscriptionTier}</span>
                        <button onClick={() => setAdminView('MENU')} className="ml-2 text-[10px] text-stone-400 hover:text-white underline">Salir</button>
                    </div>
                )}
                {!isSimulating && <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest">Panel de Control</h2>}
              </div>
              
              {/* --- HEADER ACTIONS --- */}
              <div className="flex items-center gap-4">
                {isRefreshing && (
                    <div className="flex items-center gap-2 text-ai-500 text-xs animate-pulse">
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Sincronizando...</span>
                    </div>
                )}
                
                <div className="h-4 w-px bg-stone-800"></div>

                {(profile.role === 'ADMIN' || originalAdminProfile) && (
                  <button 
                    onClick={() => setShowEvolution(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ai-900/10 border border-ai-500/20 text-ai-500 hover:bg-ai-900/20 transition-all group"
                  >
                    <Activity size={14} className="group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold">Evolución</span>
                  </button>
                )}

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900 border border-stone-800">
                   <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                   <span className="text-xs font-mono text-stone-500">{isOffline ? 'OFFLINE' : 'ONLINE'}</span>
                </div>
              </div>
            </div>

            {/* --- CHAT OVERLAY --- */}
            {showChat && (
              <div className="absolute top-16 right-0 w-96 bottom-0 z-40 border-l border-stone-800 bg-stone-950 shadow-2xl animate-slideInRight">
                <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-900/50">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <MessageSquare size={16} className="text-ai-500" /> Asistente
                    </h3>
                    <button onClick={() => setShowChat(false)} className="text-stone-500 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
                <ChatInterface userProfile={profile} pillarStatuses={pillars} />
              </div>
            )}

            {/* --- TAB BAR NAVIGATION --- */}
            <div className="relative z-30 px-8 pt-6 pb-2 border-b border-stone-800/50 bg-black/20 backdrop-blur-sm">
                <div className="flex items-center gap-6 overflow-x-auto custom-scrollbar pb-2">
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 pb-2 border-b-2 transition-all whitespace-nowrap ${
                                    isActive 
                                        ? 'border-ai-500 text-ai-500' 
                                        : 'border-transparent text-stone-500 hover:text-stone-300 hover:border-stone-700'
                                }`}
                            >
                                <Icon size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative z-10 h-full">
                
                {/* TAB: RESUMEN */}
                {activeTab === 'RESUMEN' && (
                    <div className="space-y-8 animate-fadeIn">
                        {activeMission && <MissionBriefingCard mission={activeMission} />}
                        
                        {/* Filtered Smart Dashboard for Summary: High Priority Only */}
                        <SmartDashboard 
                            items={dashboardItems.filter(item => 
                                item.type === 'SIXTH_SENSE' || 
                                item.priority >= 80 || 
                                item.type === 'ZEN'
                            )} 
                            onOpenPermissions={(id) => {
                                if (isDemoMode) {
                                    setShowDemoModal(true);
                                    return;
                                }
                                handleOpenPermissions(id);
                            }}
                        />

                        {/* Empty State for Summary */}
                        {!activeMission && dashboardItems.filter(i => i.priority >= 80).length === 0 && (
                             <div className="flex flex-col items-center justify-center opacity-20 select-none pointer-events-none gap-4 py-12">
                                <Logo className="w-32 h-32 grayscale" />
                                <p className="font-serif italic text-xl tracking-widest text-stone-500">Todo en Orden</p>
                             </div>
                        )}
                    </div>
                )}

                {/* TABS: PILLARS */}
                {activeTab !== 'RESUMEN' && (
                    <div className="animate-fadeIn">
                        {(() => {
                            const pillarStatus = pillars.find(p => p.id === activeTab);
                            if (!pillarStatus) return null;

                            // Check if we should show Detail View or just filtered items
                            // For now, let's use PillarDetailView as it provides the "Deep Dive" experience
                            return (
                                <PillarDetailView 
                                    pillarId={activeTab as PillarId} 
                                    userProfile={profile} 
                                    status={pillarStatus} 
                                    onOpenPermissions={handleOpenPermissions}
                                    isDemoMode={isDemoMode}
                                    onDemoAction={() => setShowDemoModal(true)}
                                />
                            );
                        })()}
                    </div>
                )}

            </div>
            </>
            )}
          </main>
        </>
      )}
      
      {/* Interactive Companion */}
      {/* <MayordomoCompanion />  -- Removed from here to avoid duplication in App.tsx */}
    </div>
  );
};

export default ClientApp;
