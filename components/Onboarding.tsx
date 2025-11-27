
import React, { useState, useRef } from 'react';
import { UserProfile, SubscriptionTier, UserArchetype, TechnicalPermission, PillarId } from '../types';
import { SUBSCRIPTION_PLANS, TECHNICAL_PERMISSIONS, determineArchetype, getTierLevel } from '../constants';
import { ArrowRight, Check, Shield, Lock, Zap, ToggleLeft, ToggleRight, Fingerprint, CreditCard, User, Mail, Loader2, ExternalLink, Eye, EyeOff, Crown, Star, Gem, Database, Smartphone, Globe, Brain } from 'lucide-react';
import { Logo } from './Logo';
import { SubscriptionService } from '../services/subscriptionService';

interface Props {
  onComplete: (profile: UserProfile) => void;
  onOpenAdmin?: () => void; // Prop para abrir el panel admin
}

export const Onboarding: React.FC<Props> = ({ onComplete, onOpenAdmin }) => {
  const [step, setStep] = useState(1); // 1: Auth, 2: Profile, 3: Plan, 4: Permissions
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  // Auth State
  const [isLoginMode, setIsLoginMode] = useState(false); // Toggle entre Login y Registro
  const [showPassword, setShowPassword] = useState(false); // Ver contraseña
  
  // 1. Auth Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Movido al Paso 1 para Registro
  
  // 2. Profile Data
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  
  // 3. Plan Data (Ya no seleccionamos plan manualmente en UI, se gestiona fuera)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  
  // 4. Permissions Data
  const [grantedPermissions, setGrantedPermissions] = useState<Set<string>>(new Set(['sys_notifications', 'sys_storage']));

  // Logic for manual double-click detection on Onboarding Logo
  const lastClickRef = useRef<number>(0);

  const handleLogoInteraction = (e: React.MouseEvent) => {
    // Prevent event bubbling issues
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const timeDiff = now - lastClickRef.current;
    
    // Detect double tap/click within 500ms (More forgiving)
    if (timeDiff > 0 && timeDiff < 500) {
      if (onOpenAdmin) {
        onOpenAdmin(); // El padre ya se encarga de abrirlo directamente
      }
    }
    
    lastClickRef.current = now;
  };

  const handleAuthAction = async () => {
    if (isLoginMode) {
      setIsAuthLoading(true);
      
      // 1. Simular Auth (Firebase en el futuro)
      await new Promise(r => setTimeout(r, 800));

      // 2. Obtener el Tier Real del Usuario desde el Servicio
      const realTier = await SubscriptionService.getCurrentUserTier(`user_mock_${Date.now()}`);

      // 3. Crear perfil de sesión
      const mockExistingProfile: UserProfile = {
        uid: `user_returned_${Date.now()}`,
        email,
        name: name || "Usuario Registrado", // Usar nombre si se proveyó, o genérico
        age: 30,
        gender: "NB",
        occupation: "Usuario Existente",
        archetype: UserArchetype.ESENCIALISTA,
        subscriptionTier: realTier, // USAR EL TIER REAL DEL SERVICIO
        grantedPermissions: ['sys_notifications'],
        setupCompleted: true
      };
      
      setIsAuthLoading(false);
      onComplete(mockExistingProfile);
    } else {
      // REGISTRO: Pasa al siguiente paso de perfilado
      setStep(prev => prev + 1);
    }
  };

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  // Acción A: Gestión Externa (Simula pago y upgrade)
  const handleManageSubscription = () => {
    setIsLoadingPayment(true);
    
    // 1. Abrir portal real
    window.open('https://billing.stripe.com/p/login/test_portal', '_blank');

    // 2. Simular espera y detección de upgrade para la DEMO
    setTimeout(() => {
        setIsLoadingPayment(false);
        setSelectedPlan(SubscriptionTier.VIP); // Asumimos que pagó el máximo para la demo
        handleNext(); // Avanzar a permisos
    }, 3000);
  };

  // Acción B: Continuar como Invitado
  const handleContinueAsGuest = () => {
      setSelectedPlan(SubscriptionTier.FREE);
      handleNext();
  };

  const togglePermission = (id: string, isLocked: boolean) => {
    if (isLocked) return;
    const newSet = new Set(grantedPermissions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setGrantedPermissions(newSet);
  };

  const handleFinish = () => {
    const archetype = determineArchetype(Number(age), occupation);
    
    const profile: UserProfile = {
      uid: `user_${Date.now()}`,
      email,
      name,
      age: Number(age),
      gender,
      occupation,
      archetype,
      subscriptionTier: selectedPlan,
      grantedPermissions: Array.from(grantedPermissions),
      setupCompleted: true
    };
    
    onComplete(profile);
  };

  const getTierIcon = (tierId: string) => {
      switch(tierId) {
          case SubscriptionTier.FREE: return <Shield size={16} />;
          case SubscriptionTier.BASIC: return <Zap size={16} />;
          case SubscriptionTier.PRO: return <Star size={16} />;
          case SubscriptionTier.VIP: return <Crown size={16} />;
          default: return <Shield size={16} />;
      }
  };

  // --- HELPERS FOR PERMISSIONS RENDER ---
  const systemicPermissions = TECHNICAL_PERMISSIONS.filter(p => p.category === 'SYSTEMIC');
  const functionalPermissions = TECHNICAL_PERMISSIONS.filter(p => p.category === 'FUNCTIONAL');
  
  const functionalGroups = {
      identity: functionalPermissions.filter(p => p.relatedPillar === PillarId.CENTINELA),
      wealth: functionalPermissions.filter(p => p.relatedPillar === PillarId.PATRIMONIO),
      context: functionalPermissions.filter(p => [PillarId.CONCIERGE, PillarId.VITAL, PillarId.NUCLEO].includes(p.relatedPillar))
  };

  const renderPermissionRow = (perm: TechnicalPermission) => {
      // Logic for locking based on Tier
      const userLevel = getTierLevel(selectedPlan);
      const reqLevel = getTierLevel(perm.minTier || SubscriptionTier.FREE);
      const isLocked = userLevel < reqLevel;
      
      return (
        <div key={perm.id} className={`flex items-center justify-between p-3 border-b border-stone-800 last:border-0 ${isLocked ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-full ${perm.category === 'SYSTEMIC' ? 'bg-stone-800 text-stone-400' : 'bg-ai-900/10 text-ai-500'}`}>
                    {perm.category === 'SYSTEMIC' ? <Database size={12} /> : <Zap size={12} />}
                </div>
                <div>
                    <div className="text-sm font-bold text-stone-200">{perm.label}</div>
                    <div className="text-[10px] text-stone-500">{perm.description}</div>
                </div>
            </div>
            
            <button 
                onClick={() => togglePermission(perm.id, isLocked)} 
                className={`transition-colors ${isLocked ? 'cursor-not-allowed text-stone-600' : 'text-stone-400 hover:text-white'}`}
            >
                {isLocked ? (
                    <div className="flex items-center gap-1 bg-stone-900 px-2 py-1 rounded text-[9px] font-bold text-stone-500 border border-stone-800">
                        <Lock size={10} /> {perm.minTier}
                    </div>
                ) : (
                    grantedPermissions.has(perm.id) ? <ToggleRight size={24} className="text-ai-500" /> : <ToggleLeft size={24} />
                )}
            </button>
        </div>
      );
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center p-4 font-sans text-stone-200">
      <div className="w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Panel: Context & Guidance */}
        <div className="w-full md:w-1/3 bg-black p-8 flex flex-col justify-between relative border-r border-stone-800">
           <div>
             <div 
                onClick={handleLogoInteraction} 
                className="cursor-pointer active:scale-95 transition-transform inline-block relative z-50 pointer-events-auto select-none p-2"
                title="Doble clic para acceso admin"
             >
                <Logo className="w-16 h-16 mb-6 pointer-events-none" />
             </div>
             <h2 className="text-2xl font-serif font-bold text-ai-400 mb-2">
               {step === 1 && (isLoginMode ? "Bienvenido de nuevo" : "Identificación")}
               {step === 2 && "Perfilado"}
               {step === 3 && "Nivel de Servicio"}
               {step === 4 && "Protocolos de Acceso"}
             </h2>
             <p className="text-ai-200 text-sm leading-relaxed">
               {step === 1 && (isLoginMode 
                  ? "Ingrese sus credenciales para reactivar su mayordomo digital." 
                  : "Cree su credencial segura para acceder al núcleo del sistema.")}
               {step === 2 && "El Mayordomo necesita conocer detalles adicionales para anticipar sus necesidades."}
               {step === 3 && "Defina el nivel de delegación. El sistema detectará automáticamente su suscripción."}
               {step === 4 && "Usted tiene el control absoluto. Active o deniegue el acceso técnico a sus datos."}
             </p>
           </div>
           
           <div className="flex gap-2 mt-8">
             {[1, 2, 3, 4].map(i => (
               <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-ai-500' : 'bg-stone-800'}`} />
             ))}
           </div>
        </div>

        {/* Right Panel: Forms */}
        <div className="w-full md:w-2/3 p-8 md:p-12 flex flex-col justify-center bg-stone-900/50 relative">
          
          {/* STEP 1: AUTH (LOGIN / SIGNUP) */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
               
               {/* Toggle Login/Signup */}
               <div className="flex justify-end mb-4">
                 <button 
                   onClick={() => setIsLoginMode(!isLoginMode)}
                   className="text-xs text-ai-500 hover:text-ai-400 font-bold uppercase tracking-widest underline decoration-dotted underline-offset-4"
                 >
                   {isLoginMode ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Iniciar Sesión"}
                 </button>
               </div>

               {/* Name is shown in Signup, and optionally in Login if user wants to update it */}
               <div>
                 <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Nombre Completo</label>
                 <div className="flex items-center gap-3 border-b border-stone-700 py-2">
                   <User size={18} className="text-ai-500" />
                   <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="bg-transparent w-full outline-none text-white placeholder-stone-600" 
                      placeholder="Ej. Ana García" 
                   />
                 </div>
               </div>

               <div>
                 <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Email</label>
                 <div className="flex items-center gap-3 border-b border-stone-700 py-2">
                   <Mail size={18} className="text-ai-500" />
                   <input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="bg-transparent w-full outline-none text-white placeholder-stone-600" 
                      placeholder="usuario@ejemplo.com" 
                   />
                 </div>
               </div>

               <div>
                 <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Contraseña</label>
                 <div className="flex items-center gap-3 border-b border-stone-700 py-2 relative">
                   <Lock size={18} className="text-ai-500" />
                   <input 
                      type={showPassword ? "text" : "password"} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="bg-transparent w-full outline-none text-white placeholder-stone-600 pr-8" 
                      placeholder="••••••••" 
                   />
                   <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 text-stone-500 hover:text-ai-500 transition-colors"
                   >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                   </button>
                 </div>
               </div>

               <button 
                  onClick={handleAuthAction} 
                  disabled={!email || !password || (!isLoginMode && !name) || isAuthLoading} 
                  className="w-full bg-ai-600 hover:bg-ai-500 text-black font-bold py-4 rounded-sm mt-8 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
               >
                 {isAuthLoading && <Loader2 className="animate-spin" size={20} />}
                 {isLoginMode ? "Acceder al Sistema" : "Crear Identidad Digital"}
               </button>
            </div>
          )}

          {/* STEP 2: PROFILE */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
               <div className="bg-stone-800/50 p-3 rounded-sm text-xs text-stone-400 mb-4 italic">
                  Hola, <span className="text-white font-bold">{name}</span>. Completemos tu perfil.
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Edad</label>
                   <input type="number" value={age} onChange={e => setAge(parseInt(e.target.value))} className="w-full bg-stone-950 border border-stone-700 p-3 rounded-sm text-white focus:border-ai-500 outline-none" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Género</label>
                   <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-stone-950 border border-stone-700 p-3 rounded-sm text-white focus:border-ai-500 outline-none">
                     <option value="">Seleccionar...</option>
                     <option value="M">Masculino</option>
                     <option value="F">Femenino</option>
                     <option value="NB">No Binario</option>
                   </select>
                 </div>
               </div>
               <div>
                   <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Ocupación</label>
                   <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Ej. Abogado, CEO, Artista" className="w-full bg-stone-950 border border-stone-700 p-3 rounded-sm text-white focus:border-ai-500 outline-none" />
               </div>
               
               <button onClick={handleNext} disabled={!age || !occupation || !gender} className="w-full bg-stone-100 hover:bg-white text-black font-bold py-4 rounded-sm mt-8 transition-colors">
                 Definir Perfil
               </button>
            </div>
          )}

          {/* STEP 3: SUBSCRIPTION (REDISEÑADO) */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn h-full flex flex-col relative justify-between">
               
               {/* Loading Overlay */}
               {isLoadingPayment && (
                   <div className="absolute inset-0 bg-stone-900/95 z-20 flex flex-col items-center justify-center text-center p-6 animate-fadeIn backdrop-blur-sm rounded-lg">
                       <Loader2 className="animate-spin text-ai-500 mb-4" size={48} />
                       <h3 className="text-xl font-serif text-white mb-2">Conectando con Pasarela Segura...</h3>
                       <p className="text-sm text-stone-400 max-w-xs">Por favor complete la gestión en la ventana emergente. Detectaremos su suscripción automáticamente.</p>
                   </div>
               )}
               
               <div>
                 <h3 className="text-lg font-serif font-bold text-stone-200 mb-4 border-b border-stone-800 pb-2">Jerarquía de Acceso</h3>
                 
                 {/* Hierarchy Table */}
                 <div className="space-y-0 bg-stone-950 border border-stone-800 rounded-sm">
                    {SUBSCRIPTION_PLANS.map((plan, index) => {
                        const isVip = plan.id === SubscriptionTier.VIP;
                        const isPro = plan.id === SubscriptionTier.PRO;
                        
                        return (
                            <div key={plan.id} className={`flex items-center justify-between p-4 ${index !== SUBSCRIPTION_PLANS.length - 1 ? 'border-b border-stone-800' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full bg-stone-900 border ${isVip ? 'border-ai-500 text-ai-500' : isPro ? 'border-ai-600/50 text-ai-600' : 'border-stone-700 text-stone-500'}`}>
                                        {getTierIcon(plan.id as string)}
                                    </div>
                                    <div>
                                        <div className={`font-bold text-sm ${isVip ? 'text-ai-400' : 'text-stone-300'}`}>
                                            {plan.name}
                                        </div>
                                        <div className="text-[10px] text-stone-500 uppercase tracking-wide">
                                            {plan.description}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs font-mono text-stone-400">
                                    {plan.price}
                                </div>
                            </div>
                        );
                    })}
                 </div>
               </div>
               
               {/* Actions Area */}
               <div className="space-y-3 pt-4">
                    {/* Botón A: Gestión Externa */}
                    <button 
                        onClick={handleManageSubscription}
                        className="w-full bg-ai-600 hover:bg-ai-500 text-black font-bold py-4 rounded-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-ai-900/20 group"
                    >
                        <CreditCard size={18} className="group-hover:scale-110 transition-transform" />
                        <span>Gestionar Nivel de Suscripción</span>
                        <ExternalLink size={14} className="opacity-50" />
                    </button>
                    <p className="text-[10px] text-center text-stone-600">
                        Se abrirá el portal seguro de gestión de pagos.
                    </p>

                    {/* Botón B: Invitado */}
                    <button 
                        onClick={handleContinueAsGuest}
                        className="w-full border border-stone-700 text-stone-400 hover:text-white hover:border-stone-500 py-3 rounded-sm text-xs uppercase tracking-widest font-bold transition-colors mt-2"
                    >
                        Continuar como Invitado
                    </button>
               </div>
            </div>
          )}

          {/* STEP 4: PERMISSIONS MATRIX (REFACTORED) */}
          {step === 4 && (
            <div className="space-y-6 animate-fadeIn flex flex-col h-full overflow-hidden">
               
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                 
                 {/* BLOCK 1: SYSTEM CORE */}
                 <section>
                    <h3 className="text-xs font-bold text-ai-500 uppercase tracking-widest mb-2 flex items-center gap-2 border-b border-stone-800 pb-1">
                        <Shield size={14} /> Protocolos Básicos
                    </h3>
                    <div className="bg-stone-950 border border-stone-800 rounded-sm">
                        {systemicPermissions.map(renderPermissionRow)}
                    </div>
                    <p className="text-[9px] text-stone-600 mt-1 italic">
                        Requeridos para el funcionamiento del núcleo y la encriptación local.
                    </p>
                 </section>

                 {/* BLOCK 2: EXPANSION MODULES */}
                 <section>
                    <h3 className="text-xs font-bold text-ai-500 uppercase tracking-widest mb-2 flex items-center gap-2 border-b border-stone-800 pb-1 mt-4">
                        <Brain size={14} /> Módulos de Inteligencia
                    </h3>
                    
                    <div className="space-y-3">
                        {/* Sub-group: Identity */}
                        <div>
                            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1 block pl-1">Identidad y Legal</span>
                            <div className="bg-stone-950 border border-stone-800 rounded-sm">
                                {functionalGroups.identity.map(renderPermissionRow)}
                            </div>
                        </div>

                        {/* Sub-group: Wealth */}
                        <div>
                            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1 block pl-1">Patrimonio y Activos</span>
                            <div className="bg-stone-950 border border-stone-800 rounded-sm">
                                {functionalGroups.wealth.map(renderPermissionRow)}
                            </div>
                        </div>

                        {/* Sub-group: Context */}
                        <div>
                            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1 block pl-1">Contexto y Entorno</span>
                            <div className="bg-stone-950 border border-stone-800 rounded-sm">
                                {functionalGroups.context.map(renderPermissionRow)}
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-[9px] text-stone-600 mt-2 italic border-t border-stone-800/50 pt-2">
                        Usted mantiene la soberanía de estos datos. Puede revocarlos en cualquier momento desde Ajustes.
                        Los módulos avanzados requieren niveles de suscripción superiores.
                    </p>
                 </section>

               </div>

               <button onClick={handleFinish} className="w-full bg-white text-black font-bold py-4 rounded-sm transition-colors flex items-center justify-center gap-2 hover:bg-stone-200">
                 <Fingerprint size={20} /> Inicializar Mayordomo
               </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
