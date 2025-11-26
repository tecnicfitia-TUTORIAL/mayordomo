
import React, { useState, useEffect } from 'react';
import { UserProfile, UserArchetype, LifeStageConfig, SubscriptionTier, PermissionItem } from '../types';
import { determineArchetype, getPermissionsByProfile, SUBSCRIPTION_PLANS, getTierLevel } from '../constants';
import { ArrowRight, ArrowLeft, ChevronRight, Crown, Check, Shield, Lock, Zap, Award, Sparkles, ToggleLeft, ToggleRight, Globe, Loader2 } from 'lucide-react';
import { Logo } from './Logo';

interface Props {
  onComplete: (profile: UserProfile, integrations: string[]) => void;
}

export const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0); 
  // Steps: 0=Auth, 1=Context, 2=Plan, 3=Permissions
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Auth State
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState(''); // New: Detailed status for simulation
  const [isSignUp, setIsSignUp] = useState(true);
  
  // Auth Form Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '',
    age: 0,
    gender: '',
    occupation: '',
  });
  
  const [calculatedArchetype, setCalculatedArchetype] = useState<UserArchetype | null>(null);
  
  // New State for Dynamic Permissions
  const [lifeStageConfig, setLifeStageConfig] = useState<LifeStageConfig | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  
  // New State for Plan
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>(SubscriptionTier.BASIC);

  // Email validation regex
  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  // Effect to calculate archetype when data is sufficient
  useEffect(() => {
    if (profile.age && profile.occupation) {
        const arch = determineArchetype(profile.age, profile.occupation);
        setCalculatedArchetype(arch);
    }
  }, [profile.age, profile.occupation]);

  // Effect to load permissions when entering step 3
  useEffect(() => {
    const hasValidAge = typeof profile.age === 'number' && !isNaN(profile.age);
    
    if (step === 3 && hasValidAge) {
        const config = getPermissionsByProfile(profile.age as number);
        setLifeStageConfig(config);
        
        const userTierLevel = getTierLevel(selectedPlan);
        const initialSelection = new Set<string>();
        
        config.modules.forEach(mod => {
            mod.permissions.forEach(perm => {
                const permTierLevel = getTierLevel(perm.minTier);
                if (perm.defaultEnabled && userTierLevel >= permTierLevel) {
                    initialSelection.add(perm.id);
                }
            });
        });
        setSelectedPermissions(initialSelection);
    }
  }, [step, profile.age, selectedPlan]);

  const handleLogin = () => {
    if (!validateEmail(email)) {
        alert("Por favor, introduce un email válido.");
        return;
    }

    setIsAuthenticating(true);
    setAuthStatus('Validando credenciales manuales...');
    
    // ECHO [FIREBASE]: firebase.auth().signInWithEmailAndPassword(email, password)
    
    // Simulate Network Delay
    setTimeout(() => {
        const demoEmail = email || "admin@confort.app"; 
        setProfile(prev => ({
            ...prev,
            name: prev.name || "Usuario Demo",
            email: demoEmail
        }));
        setEmail(demoEmail);
        setAuthStatus('Desencriptando perfil de usuario...');
    }, 1000);

    setTimeout(() => {
        setIsAuthenticating(false);
        setStep(1);
    }, 2000);
  };
  
  const handleSocialLogin = (provider: string) => {
      setIsAuthenticating(true);
      setAuthStatus(`Contactando proveedor de identidad (${provider})...`);
      
      // ECHO [FIREBASE]: const provider = new firebase.auth.GoogleAuthProvider();
      // ECHO [FIREBASE]: firebase.auth().signInWithPopup(provider);
      
      // Simulate OAuth Popup and Network Delay with realistic steps
      setTimeout(() => {
          setAuthStatus('Verificando token de seguridad...');
      }, 1200);

      setTimeout(() => {
          setAuthStatus('Sincronizando datos del dispositivo...');
      }, 2400);

      setTimeout(() => {
          const demoEmail = `admin+${provider.toLowerCase()}@confort.app`;
          setProfile(prev => ({
            ...prev,
            name: `Usuario ${provider}`,
            email: demoEmail
          }));
          setEmail(demoEmail);
          setTermsAccepted(true);
          setIsAuthenticating(false);
          setStep(1);
      }, 3500);
  };

  const handleContextSubmit = () => {
    setIsCalculating(true);
    setTimeout(() => {
        setIsCalculating(false);
        setStep(2);
    }, 1500);
  };
  
  const goBack = () => {
      if (step > 0) setStep(step - 1);
  };

  const togglePermission = (id: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedPermissions(newSet);
  };

  const toggleModulePermissions = (modulePermissions: PermissionItem[]) => {
    const newSet = new Set(selectedPermissions);
    const userTierLevel = getTierLevel(selectedPlan);
    
    const unlockedPermissions = modulePermissions.filter(p => userTierLevel >= getTierLevel(p.minTier));
    const ids = unlockedPermissions.map(p => p.id);
    
    const allUnlockedSelected = ids.length > 0 && ids.every((id: string) => newSet.has(id));

    ids.forEach((id: string) => {
        if (!allUnlockedSelected) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
    });
    setSelectedPermissions(newSet);
  };

  const handlePlanSelection = (planId: SubscriptionTier) => {
      // ECHO [STRIPE]: Aquí inicia el flujo de pago real
      // const { sessionId } = await api.post('/create-checkout-session', { priceId: planId });
      // stripe.redirectToCheckout({ sessionId });
      setSelectedPlan(planId);
  };

  const handleComplete = () => {
    if (profile.name && profile.age && profile.gender && profile.occupation && calculatedArchetype && profile.email) {
        const fullProfile: UserProfile = {
            name: profile.name,
            email: profile.email,
            age: profile.age,
            gender: profile.gender,
            occupation: profile.occupation,
            archetype: calculatedArchetype,
            subscriptionTier: selectedPlan,
            setupCompleted: true
        };
        onComplete(fullProfile, Array.from(selectedPermissions));
    }
  };

  const getPermissionIcon = (tier: SubscriptionTier) => {
      switch(tier) {
          case SubscriptionTier.FREE: return <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />;
          case SubscriptionTier.BASIC: return <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />;
          case SubscriptionTier.PREMIUM: return <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_5px_rgba(192,132,252,0.5)]" />;
          case SubscriptionTier.ELITE: return <Crown size={10} className="text-amber-400" />;
          default: return <div />;
      }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Panel: Narrative */}
        <div className="w-full md:w-1/3 bg-slate-950 p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-ai-500/10 rounded-full blur-[80px]"></div>
            
            <div className="relative z-10">
                <Logo className="w-16 h-16 mb-6" />
                <h2 className="text-2xl font-bold text-white mb-2">
                    {step === 0 ? "Bienvenido a Confort" : 
                     step === 1 ? "Define tu Contexto" :
                     step === 2 ? "Nivel de Autonomía" : "Panel de Permisos"}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                    {step === 0 ? "El sistema operativo que recupera tu 35% de vida creativa gestionando el 65% de tu carga operativa." :
                     step === 1 ? "Para construir tu Zona de Confort, necesito entender quién eres y qué etapa vital atraviesas." :
                     step === 2 ? "Elige cuánta carga cognitiva quieres delegar al sistema. Tu plan desbloquea capacidades avanzadas." :
                     "Todos los módulos están visibles, pero solo puedes activar las herramientas que tu Nivel de Autonomía permite."}
                </p>
            </div>

            <div className="relative z-10 mt-8">
                <div className="flex gap-2 mb-2">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-ai-500' : 'bg-slate-800'}`} />
                    ))}
                </div>
                <span className="text-xs text-slate-500 uppercase tracking-widest">Paso {step + 1} de 4</span>
            </div>
        </div>

        {/* Right Panel: Interactive Form */}
        <div className="w-full md:w-2/3 p-8 md:p-12 flex flex-col justify-between bg-slate-900/30 relative">
            
            <div className="flex-1 flex flex-col justify-center">
                {/* Back Button */}
                {step > 0 && (
                    <button 
                        onClick={goBack}
                        className="absolute top-6 left-6 text-slate-500 hover:text-white flex items-center gap-2 text-xs font-medium transition-colors"
                    >
                        <ArrowLeft size={14} /> Volver
                    </button>
                )}
                
                {/* STEP 0: AUTH */}
                {step === 0 && (
                    <div className="space-y-6 animate-fadeIn relative">
                        {isAuthenticating && (
                             <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center rounded-xl text-center animate-fadeIn">
                                 <Loader2 className="text-ai-500 animate-spin mb-3" size={32} />
                                 <h3 className="text-white font-bold text-sm">Conectando al Núcleo...</h3>
                                 <p className="text-xs text-slate-400 mt-1">{authStatus}</p>
                             </div>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                            <button onClick={() => handleSocialLogin('Google')} className="h-12 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center justify-center group" title="Continuar con Google">
                                <svg className="w-5 h-5 text-slate-300 group-hover:text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            </button>
                            <button onClick={() => handleSocialLogin('Apple')} className="h-12 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center justify-center group" title="Continuar con Apple">
                                <svg className="w-5 h-5 text-slate-300 group-hover:text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-.9 4.35-.68c1.53.18 2.69.94 3.39 1.93-2.96 1.8-2.46 5.82.54 7.05-.53 1.54-1.27 2.72-2.2 3.93-.36.47-.75.92-1.16 1.36zM12.35 4.22c-.3-1.77 1.03-3.13 2.45-3.22.41 2.03-1.77 3.65-2.45 3.22z"/></svg>
                            </button>
                            <button onClick={() => handleSocialLogin('Facebook')} className="h-12 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center justify-center group" title="Continuar con Facebook">
                                <svg className="w-5 h-5 text-slate-300 group-hover:text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            </button>
                        </div>

                        <div className="relative flex items-center">
                            <div className="flex-grow border-t border-slate-800"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-600 text-xs">o usa tu email</span>
                            <div className="flex-grow border-t border-slate-800"></div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-ai-500 focus:ring-1 focus:ring-ai-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Contraseña</label>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-ai-500 focus:ring-1 focus:ring-ai-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="terms" 
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-ai-500 focus:ring-ai-500" 
                            />
                            <label htmlFor="terms" className="text-xs text-slate-400">
                                He leído y acepto las <span className="text-slate-300 font-bold cursor-pointer hover:text-white hover:underline">Condiciones de Uso</span> y la Política de Privacidad.
                            </label>
                        </div>

                        <button 
                            onClick={handleLogin}
                            disabled={!termsAccepted || isAuthenticating}
                            className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSignUp ? 'Iniciar Sesión' : 'Crear Cuenta'} <ArrowRight size={18} />
                        </button>
                        
                        <p className="text-center text-xs text-slate-500 cursor-pointer hover:text-slate-300" onClick={() => setIsSignUp(!isSignUp)}>
                            {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
                        </p>
                    </div>
                )}

                {/* STEP 1: CONTEXT */}
                {step === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                        {isCalculating ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-ai-500/30 border-t-ai-500 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Sparkles size={20} className="text-ai-400 animate-pulse" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-medium text-white">Analizando Patrones...</h3>
                                <p className="text-sm text-slate-400">Calculando tu arquetipo de confort.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Nombre</label>
                                        <input 
                                            type="text" 
                                            value={profile.name}
                                            onChange={(e) => setProfile({...profile, name: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-ai-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Edad</label>
                                        <input 
                                            type="number" 
                                            value={profile.age || ''}
                                            onChange={(e) => setProfile({...profile, age: parseInt(e.target.value)})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-ai-500 outline-none"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Identidad de Género</label>
                                    <select 
                                        value={profile.gender}
                                        onChange={(e) => setProfile({...profile, gender: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-ai-500 outline-none"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Hombre">Hombre</option>
                                        <option value="Mujer">Mujer</option>
                                        <option value="No Binario">No Binario</option>
                                        <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Ocupación Principal</label>
                                    <input 
                                        type="text" 
                                        value={profile.occupation}
                                        onChange={(e) => setProfile({...profile, occupation: e.target.value})}
                                        placeholder="Ej. Arquitecto, Estudiante, CEO..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-ai-500 outline-none"
                                    />
                                </div>

                                <button 
                                    onClick={handleContextSubmit}
                                    disabled={!profile.name || !profile.age || !profile.gender || !profile.occupation}
                                    className="w-full bg-ai-600 hover:bg-ai-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                                >
                                    Analizar Arquetipo <Sparkles size={18} />
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* STEP 2: PLAN SELECTION */}
                {step === 2 && (
                    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-2 p-3 bg-ai-900/20 border border-ai-500/20 rounded-xl">
                            <Award className="text-ai-400" size={24} />
                            <div>
                                <h3 className="text-sm font-bold text-white">Arquetipo Detectado: {calculatedArchetype}</h3>
                                <p className="text-xs text-slate-400">Hemos pre-configurado los planes para tu estilo.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                            {SUBSCRIPTION_PLANS.map((plan) => (
                                <div 
                                    key={plan.id}
                                    onClick={() => handlePlanSelection(plan.id)}
                                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        selectedPlan === plan.id 
                                        ? 'border-ai-500 bg-ai-900/10' 
                                        : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                                    }`}
                                >
                                    {selectedPlan === plan.id && (
                                        <div className="absolute top-2 right-2 text-ai-500"><Check size={18} /></div>
                                    )}
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-bold text-white">{plan.name}</h4>
                                        <span className="text-sm font-mono text-slate-300">{plan.price}</span>
                                    </div>
                                    <p className="text-xs text-ai-400 font-bold uppercase tracking-wider mb-2">{plan.aiBehavior}</p>
                                    <p className="text-xs text-slate-400 mb-3">{plan.description}</p>
                                    <ul className="space-y-1">
                                        {plan.features.map((feat, i) => (
                                            <li key={i} className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <div className="w-1 h-1 bg-slate-600 rounded-full" /> {feat}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => setStep(3)}
                            className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 mt-auto"
                        >
                            Continuar a Permisos <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                {/* STEP 3: PERMISSIONS */}
                {step === 3 && lifeStageConfig && (
                    <div className="space-y-6 animate-fadeIn flex flex-col h-full">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                                Panel de Control: {lifeStageConfig.stageName}
                            </h3>
                            <div className="flex items-center gap-2">
                                <Shield size={14} className="text-ai-400" />
                                <span className="text-xs text-slate-500">
                                    {selectedPermissions.size} Activos
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 max-h-[400px]">
                            {lifeStageConfig.modules.map((module) => {
                                const userTierLevel = getTierLevel(selectedPlan);
                                
                                // Find which perms are unlocked in this module
                                const unlockedPerms = module.permissions.filter(p => userTierLevel >= getTierLevel(p.minTier));
                                const allUnlockedSelected = unlockedPerms.length > 0 && unlockedPerms.every(p => selectedPermissions.has(p.id));
                                
                                return (
                                    <div key={module.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <h4 className="font-semibold text-sm text-white">{module.title}</h4>
                                                <p className="text-xs text-slate-500">{module.roleDescription}</p>
                                            </div>
                                            {unlockedPerms.length > 0 && (
                                                <button 
                                                    onClick={() => toggleModulePermissions(module.permissions)}
                                                    className="flex items-center gap-1 text-[10px] text-ai-400 hover:text-ai-300 border border-ai-500/30 px-2 py-1 rounded hover:bg-ai-500/10 transition-colors"
                                                >
                                                    {allUnlockedSelected ? 'Desactivar Disponibles' : 'Activar Disponibles'}
                                                    {allUnlockedSelected ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-1">
                                            {module.permissions.map((perm) => {
                                                const permTierLevel = getTierLevel(perm.minTier);
                                                const isLocked = userTierLevel < permTierLevel;
                                                const isSelected = selectedPermissions.has(perm.id);
                                                
                                                return (
                                                    <div 
                                                        key={perm.id} 
                                                        onClick={() => !isLocked && togglePermission(perm.id)}
                                                        className={`flex items-center justify-between p-3 rounded-lg border transition-all group ${
                                                            isLocked 
                                                                ? 'border-transparent opacity-60 cursor-not-allowed bg-black/20' 
                                                                : isSelected
                                                                    ? 'bg-ai-500/10 border-ai-500/30 cursor-pointer' 
                                                                    : 'bg-slate-950 border-transparent hover:border-slate-700 cursor-pointer'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {/* Status Icon */}
                                                            <div className="w-5 flex justify-center">
                                                                {isLocked ? <Lock size={12} className="text-slate-600" /> : getPermissionIcon(perm.minTier)}
                                                            </div>

                                                            <div className="flex flex-col">
                                                                <span className={`text-xs font-medium ${isLocked ? 'text-slate-500' : isSelected ? 'text-white' : 'text-slate-400'}`}>
                                                                    {perm.label}
                                                                </span>
                                                                {isLocked && (
                                                                    <span className="text-[9px] text-amber-600/70 font-mono flex items-center gap-1">
                                                                        Requiere Nivel {perm.minTier}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {!isLocked && (
                                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${isSelected ? 'bg-ai-500' : 'bg-slate-700'}`}>
                                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isSelected ? 'right-0.5' : 'left-0.5'}`} />
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

                        <button 
                            onClick={handleComplete}
                            className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 mt-4 shadow-lg shadow-white/10"
                        >
                            <Zap size={18} className="fill-black" /> Inicializar Confort OS
                        </button>
                    </div>
                )}
            </div>

            {/* TRUST FOOTER */}
            <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-500">
                <div className="flex items-center gap-2">
                     <Globe size={12} /> © 2025 Confort Technologies Inc.
                </div>
                <div className="flex gap-4">
                    <span className="hover:text-slate-300 cursor-pointer">Política de Privacidad</span>
                    <span className="hover:text-slate-300 cursor-pointer">Términos de Servicio</span>
                    <span className="hover:text-slate-300 cursor-pointer">Soporte</span>
                </div>
                <div className="font-mono text-slate-600">v2.8.0 (Deploy Fix)</div>
            </div>

        </div>
      </div>
    </div>
  );
};
