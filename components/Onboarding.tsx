
import React, { useState, useRef, useMemo } from 'react';
import { UserProfile, SubscriptionTier, UserArchetype, TechnicalPermission, PillarId } from '../types';
import { SUBSCRIPTION_PLANS, TECHNICAL_PERMISSIONS, determineArchetype, getTierLevel } from '../constants';
import { ArrowRight, Check, Shield, Lock, Zap, ToggleLeft, ToggleRight, Fingerprint, CreditCard, User, Mail, Loader2, ExternalLink, Eye, EyeOff, Crown, Star, Gem, Database, Smartphone, Globe, Brain, ChevronLeft, X, Send } from 'lucide-react';
import { Logo } from './Logo';
import { SubscriptionService } from '../services/subscriptionService';
import { StripeService } from '../services/stripeService';
import { LegalModal } from './LegalModal';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

interface Props {
  onComplete: (profile: UserProfile) => void;
  onOpenAdmin?: () => void;
}

// SIMULATED ASSETS (High Quality Abstract Tech Backgrounds)
const DAILY_BACKGROUNDS = [
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=2000", // Dark Hex
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000", // Global Network
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000", // Cyberpunk City
    "https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=2000", // Abstract Mesh
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=2000", // Circuitry
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=2000", // AI Neurons
    "https://images.unsplash.com/photo-1534224039826-c7a0eda0e6b3?auto=format&fit=crop&q=80&w=2000", // Particles
    "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=2000", // Gold Abstract
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=2000", // Matrix Code
    "https://images.unsplash.com/photo-1480694313141-fce5e697ee25?auto=format&fit=crop&q=80&w=2000"  // Dark Iceberg
];

export const Onboarding: React.FC<Props> = ({ onComplete, onOpenAdmin }) => {
  const [step, setStep] = useState(1); // 1: Auth, 2: Profile, 3: Plan, 4: Permissions
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  // Auth State
  const [isLoginMode, setIsLoginMode] = useState(true); // Default to Login for cleaner look
  const [showPassword, setShowPassword] = useState(false);
  
  // Password Recovery State
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{text: string, type: 'SUCCESS' | 'ERROR'} | null>(null);

  // Legal State
  const [legalType, setLegalType] = useState<'PRIVACY' | 'TERMS' | 'NOTICE' | null>(null);
  
  // 1. Auth Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // 2. Profile Data
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  
  // 3. Plan Data
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  
  // 4. Permissions Data
  const [grantedPermissions, setGrantedPermissions] = useState<Set<string>>(new Set(['sys_notifications', 'sys_storage']));

  // Double Click Logic for Admin
  const lastClickRef = useRef<number>(0);

  // --- DAILY SEED LOGIC FOR BACKGROUND SELECTION ---
  const dailyImage = useMemo(() => {
      const now = new Date();
      // Generate a unique seed for the day: YYYYMMDD
      const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
      
      // Select image index based on date seed
      const index = seed % DAILY_BACKGROUNDS.length;
      return DAILY_BACKGROUNDS[index];
  }, []);

  const handleLogoInteraction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    const timeDiff = now - lastClickRef.current;
    if (timeDiff > 0 && timeDiff < 500) {
      if (onOpenAdmin) onOpenAdmin();
    }
    lastClickRef.current = now;
  };

  const handleAuthAction = async () => {
    if (isLoginMode) {
      setIsAuthLoading(true);
      await new Promise(r => setTimeout(r, 1500)); // Simular carga "biométrica"
      const realTier = await SubscriptionService.getCurrentUserTier(`user_mock_${Date.now()}`);
      
      const mockExistingProfile: UserProfile = {
        uid: `user_returned_${Date.now()}`,
        email,
        name: name || "Usuario Registrado",
        age: 30,
        gender: "NB",
        occupation: "Usuario Existente",
        archetype: UserArchetype.ESENCIALISTA,
        subscriptionTier: realTier,
        grantedPermissions: ['sys_notifications'],
        setupCompleted: true
      };
      
      setIsAuthLoading(false);
      onComplete(mockExistingProfile);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => Math.max(1, prev - 1));

  const handleManageSubscription = () => {
    setIsLoadingPayment(true);
    
    // Redirect to specific checkout based on selected plan
    StripeService.openCheckout(selectedPlan);

    // Mock flow: We assume the user navigates away and comes back.
    // The payment is processed by Stripe and Webhook updates DB.
    // Local app must WAIT for that update or start as FREE.
    setTimeout(() => {
        setIsLoadingPayment(false);
        handleNext();
    }, 5000);
  };

  const handleContinueAsGuest = () => {
      setSelectedPlan(SubscriptionTier.FREE);
      handleNext();
  };

  const togglePermission = (id: string, isLocked: boolean) => {
    if (isLocked) return;
    const newSet = new Set(grantedPermissions);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setGrantedPermissions(newSet);
  };

  const handleFinish = () => {
    const archetype = determineArchetype(Number(age), occupation);
    
    // SECURITY RULE: ZERO TRUST
    // Regardless of 'selectedPlan' (user intent), we initialize as FREE.
    // The upgrade to PREMIUM/VIP only happens if the Backend (via Webhook) confirms the payment.
    const initialTier = SubscriptionTier.FREE;

    const profile: UserProfile = {
      uid: `user_${Date.now()}`,
      email,
      name,
      age: Number(age),
      gender,
      occupation,
      archetype,
      subscriptionTier: initialTier, // FORCE FREE STATE
      grantedPermissions: Array.from(grantedPermissions),
      setupCompleted: true
    };

    // Mensaje de Transparencia
    if (selectedPlan !== SubscriptionTier.FREE) {
        alert("SOLICITUD DE SUSCRIPCIÓN RECIBIDA\n\nSu cuenta ha sido creada con nivel INVITADO. La activación de su plan se realizará automáticamente en cuanto la entidad bancaria confirme el pago.");
    }

    onComplete(profile);
  };

  // Password Recovery Logic
  const handleOpenForgotPassword = () => {
      setResetEmail(email); // Pre-fill
      setShowForgotPasswordModal(true);
      setResetMessage(null);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetEmail) return;
      
      setIsResetting(true);
      setResetMessage(null);

      // SAFETY CHECK: Ensure Auth is active and not a Mock
      // 'auth.app' is a standard property of the real Firebase Auth instance.
      // If it's missing (or if auth is flagged as mock), we fallback to simulation.
      if (!auth || (auth as any)._isMock) {
          console.warn("[Onboarding] Firebase Auth is offline or mocking. Simulating reset email.");
          await new Promise(r => setTimeout(r, 1500)); // Simulate delay
          setResetMessage({ text: '[Modo Demo] Email de recuperación simulado enviado.', type: 'SUCCESS' });
          setIsResetting(false);
          return;
      }

      try {
          await sendPasswordResetEmail(auth, resetEmail);
          setResetMessage({ text: 'Email de recuperación enviado. Revise su bandeja de entrada.', type: 'SUCCESS' });
      } catch (error: any) {
          console.error("Reset Password Error:", error);
          let msg = 'Error al enviar el email.';
          if (error.code === 'auth/invalid-email') msg = 'El email no es válido.';
          if (error.code === 'auth/user-not-found') msg = 'No existe cuenta con este email.';
          if (error.code === 'auth/invalid-api-key') msg = 'Error de configuración del sistema (API Key).';
          setResetMessage({ text: msg, type: 'ERROR' });
      } finally {
          setIsResetting(false);
      }
  };

  // --- RENDERS ---

  const renderPermissionRow = (perm: TechnicalPermission) => {
      const userLevel = getTierLevel(selectedPlan);
      const reqLevel = getTierLevel(perm.minTier || SubscriptionTier.FREE);
      const isLocked = userLevel < reqLevel;
      
      return (
        <div key={perm.id} className={`flex items-center justify-between p-3 border-b border-stone-800 last:border-0 ${isLocked ? 'opacity-40' : ''}`}>
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-full ${perm.category === 'SYSTEMIC' ? 'bg-stone-800 text-stone-400' : 'bg-ai-900/10 text-ai-500'}`}>
                    {perm.category === 'SYSTEMIC' ? <Database size={12} /> : <Zap size={12} />}
                </div>
                <div>
                    <div className="text-xs font-bold text-stone-200">{perm.label}</div>
                    <div className="text-[9px] text-stone-500">{perm.description}</div>
                </div>
            </div>
            <button 
                onClick={() => togglePermission(perm.id, isLocked)} 
                className={`transition-colors ${isLocked ? 'cursor-not-allowed text-stone-600' : 'text-stone-400 hover:text-white'}`}
            >
                {isLocked ? (
                    <Lock size={12} />
                ) : (
                    grantedPermissions.has(perm.id) ? <ToggleRight size={24} className="text-ai-500" /> : <ToggleLeft size={24} />
                )}
            </button>
        </div>
      );
  };

  const systemicPermissions = TECHNICAL_PERMISSIONS.filter(p => p.category === 'SYSTEMIC');
  const functionalPermissions = TECHNICAL_PERMISSIONS.filter(p => p.category === 'FUNCTIONAL');

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center p-4 font-sans bg-[#0c0a09]">
      
      {/* --- BACKGROUND LAYER (FIXED) --- */}
      <div className="fixed inset-0 z-0 w-full h-full">
          {/* Daily Abstract Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
            style={{ backgroundImage: `url(${dailyImage})` }}
          ></div>
          
          {/* LUXURY VEIL (Overlay) - Ensures text readability */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"></div>

          {/* Watermark Logo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.05] pointer-events-none scale-150 mix-blend-overlay">
              <Logo className="w-[600px] h-[600px]" />
          </div>
      </div>

      {/* --- CENTRAL CARD --- */}
      <div className="relative z-10 w-full max-w-[450px] bg-stone-900/60 backdrop-blur-xl border border-stone-800/60 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden animate-scaleIn ring-1 ring-white/5">
        
        {/* Progress Bar (Top) */}
        <div className="h-1 w-full bg-stone-800/50">
            <div 
                className="h-full bg-ai-500 transition-all duration-500 shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                style={{ width: `${(step / 4) * 100}%` }}
            ></div>
        </div>

        <div className="p-8 flex-1 flex flex-col">
            
            {/* Header / Navigation */}
            <div className="flex justify-between items-start mb-8">
                <div 
                    onClick={handleLogoInteraction}
                    className="cursor-pointer active:scale-95 transition-transform"
                >
                    <Logo className="w-12 h-12" />
                </div>
                {step > 1 && (
                    <button onClick={handleBack} className="text-stone-500 hover:text-white transition-colors p-2">
                        <ChevronLeft size={20} />
                    </button>
                )}
            </div>

            {/* STEP 1: AUTH */}
            {step === 1 && (
                <div className="space-y-6 animate-fadeIn">
                    <div>
                        <h1 className="text-2xl font-serif font-bold text-white mb-2">
                            {isLoginMode ? "Identificación" : "Nueva Credencial"}
                        </h1>
                        <p className="text-sm text-stone-400">
                            {isLoginMode ? "Acceda al núcleo del sistema." : "Comience la configuración de su asistente."}
                        </p>
                    </div>

                    <div className="space-y-4">
                        {!isLoginMode && (
                            <div className="group">
                                <div className="flex items-center gap-3 bg-stone-950/50 border border-stone-800 rounded-lg px-4 py-3 focus-within:border-ai-500/50 transition-colors">
                                    <User size={18} className="text-stone-500 group-focus-within:text-ai-500" />
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Nombre Completo"
                                        className="bg-transparent w-full outline-none text-white text-sm placeholder-stone-600"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="group">
                            <div className="flex items-center gap-3 bg-stone-950/50 border border-stone-800 rounded-lg px-4 py-3 focus-within:border-ai-500/50 transition-colors">
                                <Mail size={18} className="text-stone-500 group-focus-within:text-ai-500" />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="correo@ejemplo.com"
                                    className="bg-transparent w-full outline-none text-white text-sm placeholder-stone-600"
                                />
                            </div>
                        </div>

                        <div className="group relative">
                            <div className="flex items-center gap-3 bg-stone-950/50 border border-stone-800 rounded-lg px-4 py-3 focus-within:border-ai-500/50 transition-colors">
                                <Lock size={18} className="text-stone-500 group-focus-within:text-ai-500" />
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Contraseña de Acceso"
                                    className="bg-transparent w-full outline-none text-white text-sm placeholder-stone-600 pr-8"
                                />
                            </div>
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3.5 text-stone-600 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {isLoginMode && (
                        <div className="text-right -mt-2">
                            <button 
                                onClick={handleOpenForgotPassword}
                                className="text-[10px] text-stone-500 hover:text-ai-500 transition-colors font-medium tracking-wide"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    )}

                    <button 
                        onClick={handleAuthAction}
                        disabled={isAuthLoading || !email || !password}
                        className="w-full bg-white hover:bg-stone-200 text-black font-bold py-4 rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isAuthLoading ? <Loader2 className="animate-spin" size={20} /> : <Fingerprint size={20} />}
                        {isLoginMode ? "Autenticar" : "Crear Cuenta"}
                    </button>

                    {!isLoginMode && (
                        <p className="text-[10px] text-stone-500 text-center leading-relaxed px-4">
                            Al crear su cuenta, acepta nuestra <button onClick={() => setLegalType('PRIVACY')} className="text-stone-400 hover:text-ai-500 underline decoration-dotted transition-colors">Política de Privacidad</button> y nuestros <button onClick={() => setLegalType('TERMS')} className="text-stone-400 hover:text-ai-500 underline decoration-dotted transition-colors">Términos y Condiciones</button>.
                        </p>
                    )}

                    <div className="text-center">
                        <button 
                            onClick={() => setIsLoginMode(!isLoginMode)}
                            className="text-[10px] uppercase tracking-widest font-bold text-stone-500 hover:text-ai-500 transition-colors"
                        >
                            {isLoginMode ? "Solicitar Acceso (Registro)" : "Ya tengo Credenciales"}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: PROFILE */}
            {step === 2 && (
                <div className="space-y-6 animate-fadeIn">
                    <div>
                        <h1 className="text-2xl font-serif font-bold text-white mb-2">Perfilado</h1>
                        <p className="text-sm text-stone-400">Datos para la calibración del modelo de IA.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest pl-1">Edad</label>
                            <input 
                                type="number" 
                                value={age} 
                                onChange={e => setAge(parseInt(e.target.value))} 
                                className="w-full bg-stone-950/50 border border-stone-800 rounded-lg p-3 text-white focus:border-ai-500/50 outline-none" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest pl-1">Género</label>
                            <select 
                                value={gender} 
                                onChange={e => setGender(e.target.value)} 
                                className="w-full bg-stone-950/50 border border-stone-800 rounded-lg p-3 text-white focus:border-ai-500/50 outline-none appearance-none"
                            >
                                <option value="">...</option>
                                <option value="M">Masculino</option>
                                <option value="F">Femenino</option>
                                <option value="NB">Otro</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest pl-1">Ocupación Principal</label>
                        <input 
                            type="text" 
                            value={occupation} 
                            onChange={e => setOccupation(e.target.value)} 
                            placeholder="Ej: Arquitecto, Estudiante, CEO" 
                            className="w-full bg-stone-950/50 border border-stone-800 rounded-lg p-3 text-white focus:border-ai-500/50 outline-none" 
                        />
                    </div>

                    <button 
                        onClick={handleNext}
                        disabled={!age || !occupation || !gender}
                        className="w-full bg-white hover:bg-stone-200 text-black font-bold py-4 rounded-lg mt-4 transition-colors flex items-center justify-center gap-2"
                    >
                        Siguiente <ArrowRight size={18} />
                    </button>
                </div>
            )}

            {/* STEP 3: PLAN */}
            {step === 3 && (
                <div className="space-y-6 animate-fadeIn h-full flex flex-col">
                    <div>
                        <h1 className="text-2xl font-serif font-bold text-white mb-2">Nivel de Acceso</h1>
                        <p className="text-sm text-stone-400">Seleccione su grado de autonomía.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar -mr-4 pr-4 space-y-2 max-h-[300px]">
                        {SUBSCRIPTION_PLANS.map((plan) => {
                            const Icon = plan.id === SubscriptionTier.VIP ? Crown : plan.id === SubscriptionTier.PRO ? Star : plan.id === SubscriptionTier.BASIC ? Zap : Shield;
                            const isSelected = selectedPlan === plan.id;
                            
                            return (
                                <div 
                                    key={plan.id} 
                                    onClick={() => setSelectedPlan(plan.id as SubscriptionTier)}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                                        isSelected 
                                            ? 'bg-ai-900/20 border-ai-500 shadow-lg shadow-ai-900/10' 
                                            : 'border-stone-800 bg-stone-950/30 hover:border-stone-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${isSelected ? 'bg-ai-500 text-black' : 'bg-stone-900 text-stone-400'}`}>
                                            <Icon size={16} />
                                        </div>
                                        <div>
                                            <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-stone-200'}`}>{plan.name}</div>
                                            <div className="text-[10px] text-stone-500 uppercase">{plan.price}</div>
                                        </div>
                                    </div>
                                    {isSelected && <Check size={16} className="text-ai-500" />}
                                </div>
                            );
                        })}
                    </div>

                    <div className="space-y-3 pt-2">
                        {selectedPlan !== SubscriptionTier.FREE && (
                            <button 
                                onClick={handleManageSubscription}
                                className="w-full bg-ai-600 hover:bg-ai-500 text-black font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-colors group"
                            >
                                {isLoadingPayment ? <Loader2 className="animate-spin" /> : <CreditCard size={18} />}
                                <span>Contratar {SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.name}</span>
                                <ExternalLink size={14} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}
                        
                        <button 
                            onClick={handleContinueAsGuest}
                            className={`w-full py-3 text-xs font-bold uppercase tracking-widest transition-colors border rounded-lg ${selectedPlan === SubscriptionTier.FREE ? 'bg-white text-black hover:bg-stone-200' : 'text-stone-500 hover:text-white border-transparent hover:border-stone-800'}`}
                        >
                            {selectedPlan === SubscriptionTier.FREE ? "Entrar como Invitado" : "O continuar Gratis"}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 4: PERMISSIONS */}
            {step === 4 && (
                <div className="space-y-6 animate-fadeIn flex flex-col h-full">
                    <div>
                        <h1 className="text-2xl font-serif font-bold text-white mb-2">Protocolos</h1>
                        <p className="text-sm text-stone-400">Active los permisos operativos.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar -mr-4 pr-4 space-y-6 max-h-[350px]">
                        <section>
                            <h3 className="text-xs font-bold text-ai-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Shield size={12} /> Núcleo
                            </h3>
                            <div className="bg-stone-950/50 border border-stone-800 rounded-lg overflow-hidden">
                                {systemicPermissions.map(renderPermissionRow)}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-bold text-ai-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Brain size={12} /> Inteligencia
                            </h3>
                            <div className="bg-stone-950/50 border border-stone-800 rounded-lg overflow-hidden">
                                {functionalPermissions.map(renderPermissionRow)}
                            </div>
                        </section>
                    </div>

                    <button 
                        onClick={handleFinish}
                        className="w-full bg-white hover:bg-stone-200 text-black font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                    >
                        <Fingerprint size={20} /> Iniciar Sistema
                    </button>
                </div>
            )}

        </div>
      </div>
      
      {/* Footer Text */}
      <div className="absolute bottom-4 text-center w-full z-10 opacity-30">
          <p className="text-[10px] font-mono text-stone-500 uppercase tracking-[0.2em]">Confort OS v1.0 // Secure Core</p>
      </div>

      {/* Legal Modal Overlay */}
      {legalType && <LegalModal type={legalType} onClose={() => setLegalType(null)} />}

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn">
            <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-xl p-6 relative shadow-2xl">
                <button 
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="absolute top-4 right-4 text-stone-500 hover:text-white"
                >
                    <X size={20} />
                </button>

                <h2 className="text-lg font-serif font-bold text-white mb-2">Recuperar Acceso</h2>
                <p className="text-sm text-stone-400 mb-6">
                    Ingrese su email para recibir un enlace de restablecimiento.
                </p>

                <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="group">
                        <div className="flex items-center gap-3 bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 focus-within:border-ai-500/50 transition-colors">
                            <Mail size={18} className="text-stone-500 group-focus-within:text-ai-500" />
                            <input 
                                type="email" 
                                value={resetEmail}
                                onChange={e => setResetEmail(e.target.value)}
                                placeholder="correo@ejemplo.com"
                                className="bg-transparent w-full outline-none text-white text-sm placeholder-stone-600"
                                required
                            />
                        </div>
                    </div>

                    {resetMessage && (
                        <div className={`text-xs p-3 rounded border ${resetMessage.type === 'SUCCESS' ? 'bg-emerald-900/20 text-emerald-500 border-emerald-500/30' : 'bg-red-900/20 text-red-500 border-red-500/30'}`}>
                            {resetMessage.text}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isResetting || !resetEmail}
                        className="w-full bg-ai-600 hover:bg-ai-500 disabled:opacity-50 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isResetting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                        Enviar Enlace
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};
