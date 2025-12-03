
import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserProfile, SubscriptionTier, UserArchetype, TechnicalPermission } from '../types';
import { SUBSCRIPTION_PLANS, TECHNICAL_PERMISSIONS, determineArchetype, getTierLevel } from '../constants';
import { ArrowRight, Check, Shield, Lock, Zap, ToggleLeft, ToggleRight, Fingerprint, CreditCard, User, Mail, Loader2, ExternalLink, Eye, EyeOff, Crown, Star, Database, AlertCircle, Send, X, MailCheck } from 'lucide-react';
import { Logo } from './Logo';
import { Toast } from './Toast';
import { StripeService } from '../services/stripeService';
import { LegalModal } from './LegalModal';
import { PublicPricingModal, PublicGuideModal, PublicLegalModal } from './PublicModals';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

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
  const location = useLocation();
  const navigate = useNavigate();
  // Start at Step 2 (Profile) directly. Step 1 (Auth) is handled by LoginScreen.
  const [step, setStep] = useState(2); 
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile Data
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  
  // Plan Data
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  
  // Permissions Data
  const [grantedPermissions, setGrantedPermissions] = useState<Set<string>>(new Set(['sys_notifications', 'sys_storage']));

  // --- DAILY SEED LOGIC FOR BACKGROUND SELECTION ---
  const dailyImage = useMemo(() => {
      const now = new Date();
      const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
      const index = seed % DAILY_BACKGROUNDS.length;
      return DAILY_BACKGROUNDS[index];
  }, []);

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => Math.max(2, prev - 1)); // Min step 2

  const handleManageSubscription = () => {
    setIsLoadingPayment(true);
    StripeService.openCheckout(selectedPlan);
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

  const handleFinish = async () => {
    setIsSaving(true);

    const archetype = determineArchetype(Number(age), occupation);
    const finalTier = selectedPlan || SubscriptionTier.FREE;

    try {
        if (!auth.currentUser) throw new Error("No hay sesión activa.");
        const uid = auth.currentUser.uid;

        // Update existing profile in Firestore
        const userRef = doc(db, 'users', uid);
        
        // We only update the fields collected here
        const updates = {
            age: Number(age),
            gender,
            occupation,
            archetype, 
            subscriptionTier: finalTier,
            grantedPermissions: Array.from(grantedPermissions),
            setupCompleted: true,
            updatedAt: serverTimestamp()
        };

        await setDoc(userRef, updates, { merge: true });

        // Get full updated profile to pass back
        const docSnap = await getDoc(userRef);
        const fullProfile = docSnap.data() as UserProfile;

        setIsSaving(false);
        onComplete(fullProfile);

    } catch (error: any) {
        console.error("Onboarding Save Error:", error);
        setIsSaving(false);
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
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
            style={{ backgroundImage: `url(${dailyImage})` }}
          ></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.05] pointer-events-none scale-150 mix-blend-overlay">
              <Logo className="w-[600px] h-[600px]" />
          </div>
      </div>

      {/* --- CENTRAL CARD --- */}
      <div className="relative z-10 w-full max-w-[450px] bg-stone-900/60 backdrop-blur-xl border border-stone-800/60 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden animate-scaleIn ring-1 ring-white/5">
        
        {/* Progress Bar (Top) - Adjusted for 3 steps (2, 3, 4) */}
        <div className="h-1 w-full bg-stone-800/50">
            <div 
                className="h-full bg-ai-500 transition-all duration-500 shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
            ></div>
        </div>

        <div className="p-8 flex-1 flex flex-col">
            
            {/* Header / Navigation */}
            <div className="flex justify-between items-start mb-8">
                <div className="select-none">
                    <Logo className="w-12 h-12" />
                </div>
                {step > 2 && (
                    <button onClick={handleBack} className="text-stone-500 hover:text-white transition-colors p-2">
                        <ArrowRight size={20} className="rotate-180" />
                    </button>
                )}
            </div>

            {/* STEP 2: PROFILE */}
            {step === 2 && (
                <div className="space-y-6 animate-fadeIn">
                    <div>
                        <h1 className="text-2xl font-serif font-bold text-white mb-2">Calibración</h1>
                        <p className="text-sm text-stone-400">Configure su perfil para personalizar la IA.</p>
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

            {/* STEP 4: PERMISSIONS & CREATE */}
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
                                <Database size={12} /> Inteligencia
                            </h3>
                            <div className="bg-stone-950/50 border border-stone-800 rounded-lg overflow-hidden">
                                {functionalPermissions.map(renderPermissionRow)}
                            </div>
                        </section>
                    </div>

                    <button 
                        onClick={handleFinish}
                        disabled={isSaving}
                        className="w-full bg-white hover:bg-stone-200 text-black font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Fingerprint size={20} />}
                        {isSaving ? 'Finalizando...' : 'Iniciar Sistema'}
                    </button>
                </div>
            )}

        </div>
      </div>
      
      {/* Footer Text */}
      <div className="absolute bottom-4 text-center w-full z-10 opacity-30 pointer-events-none">
          <p className="text-[10px] font-mono text-stone-500 uppercase tracking-[0.2em]">Confort OS v1.0 // Secure Core</p>
      </div>

    </div>
  );
};
