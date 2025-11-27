
import React from 'react';
import { UserProfile, SubscriptionTier, ThemePreference } from '../types';
import { SUBSCRIPTION_PLANS } from '../constants';
import { StripeService } from '../services/stripeService';
import { X, ExternalLink, CreditCard, CheckCircle2, Crown, Shield, Star, Zap, Monitor, Moon, Sun, Loader2 } from 'lucide-react';
import { LegalModal } from './LegalModal';

interface Props {
  profile: UserProfile;
  onUpdate?: (profile: UserProfile) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ profile, onClose, onUpdate }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [legalType, setLegalType] = React.useState<'PRIVACY' | 'TERMS' | null>(null);
  
  const handleManageSubscription = async () => {
    setIsLoading(true);
    // Delegamos la gestión al servicio de Stripe
    await StripeService.openCustomerPortal(profile.email);
    setIsLoading(false);
  };

  const handleThemeChange = (theme: ThemePreference) => {
    if (onUpdate) {
        onUpdate({ ...profile, themePreference: theme });
    }
  };

  const getTierIcon = (tierId: string) => {
      switch(tierId) {
          case SubscriptionTier.FREE: return <Shield size={24} />;
          case SubscriptionTier.BASIC: return <Zap size={24} />;
          case SubscriptionTier.PRO: return <Star size={24} />;
          case SubscriptionTier.VIP: return <Crown size={24} />;
          default: return <Shield size={24} />;
      }
  };

  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === profile.subscriptionTier) || SUBSCRIPTION_PLANS[0];
  const currentTheme = profile.themePreference || 'AUTO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-black">
          <div className="flex items-center gap-2">
            <CreditCard className="text-ai-500" size={20} />
            <h2 className="text-white font-serif font-bold">Mi Suscripción</h2>
          </div>
          <button onClick={onClose}><X className="text-stone-500 hover:text-white" /></button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center overflow-y-auto custom-scrollbar">
            
            {/* Current Plan Card */}
            <div className="w-full bg-gradient-to-br from-stone-900 to-black border border-ai-500/30 rounded-xl p-6 relative overflow-hidden mb-8 shadow-lg shadow-ai-900/10">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    {getTierIcon(currentPlan.id)}
                </div>
                
                <div className="text-[10px] font-bold text-ai-500 uppercase tracking-widest mb-2 border border-ai-500/20 px-2 py-0.5 rounded-full inline-block bg-ai-900/10">
                    Plan Activo
                </div>
                
                <h1 className="text-3xl font-serif font-bold text-white mb-1">{currentPlan.name}</h1>
                <p className="text-sm text-stone-400 font-serif italic">{currentPlan.description}</p>
                
                <div className="mt-6 flex items-end gap-1">
                    <span className="text-2xl font-bold text-white">{currentPlan.price}</span>
                    <span className="text-xs text-stone-500 mb-1">/ mes</span>
                </div>
            </div>

            {/* THEME SELECTOR */}
            <div className="w-full mb-8 border-b border-stone-800 pb-6">
                 <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Apariencia del Sistema</h3>
                 <div className="grid grid-cols-3 gap-3">
                     <button 
                        onClick={() => handleThemeChange('AUTO')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-sm border transition-all ${currentTheme === 'AUTO' ? 'bg-ai-900/20 border-ai-500/50 text-ai-500' : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-600'}`}
                     >
                         <Monitor size={18} />
                         <span className="text-[10px] font-bold">Auto</span>
                     </button>
                     <button 
                        onClick={() => handleThemeChange('LIGHT')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-sm border transition-all ${currentTheme === 'LIGHT' ? 'bg-stone-200 border-white text-black' : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-600'}`}
                     >
                         <Sun size={18} />
                         <span className="text-[10px] font-bold">Claro</span>
                     </button>
                     <button 
                        onClick={() => handleThemeChange('DARK')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-sm border transition-all ${currentTheme === 'DARK' ? 'bg-black border-stone-600 text-white' : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-600'}`}
                     >
                         <Moon size={18} />
                         <span className="text-[10px] font-bold">Oscuro</span>
                     </button>
                 </div>
            </div>

            {/* Benefits List */}
            <div className="w-full space-y-3 mb-8">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Capacidades Incluidas</h3>
                {currentPlan.capabilities.map((cap, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm text-stone-300">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        {cap}
                    </div>
                ))}
            </div>

            {/* Action Button */}
            <div className="w-full bg-stone-950 p-4 rounded-lg border border-stone-800 text-center">
                <p className="text-xs text-stone-400 mb-4 px-4 leading-relaxed">
                  Para cambios de plan, actualizaciones de método de pago o descargar facturas, acceda a nuestra pasarela segura.
                </p>
                <button 
                  onClick={handleManageSubscription}
                  disabled={isLoading}
                  className="w-full bg-white hover:bg-stone-200 text-black font-bold py-3 rounded-sm transition-colors flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={14} /> : <ExternalLink size={14} />}
                  {isLoading ? 'Conectando...' : 'Ir al Portal de Cliente'}
                </button>
            </div>
            
            {/* Legal Links Footer */}
            <div className="flex items-center gap-6 mt-6">
                <button 
                  onClick={() => setLegalType('PRIVACY')}
                  className="text-[10px] text-stone-500 hover:text-ai-500 transition-colors underline decoration-dotted underline-offset-4"
                >
                  Política de Privacidad
                </button>
                <button 
                  onClick={() => setLegalType('TERMS')}
                  className="text-[10px] text-stone-500 hover:text-ai-500 transition-colors underline decoration-dotted underline-offset-4"
                >
                  Términos de Servicio
                </button>
            </div>

            <p className="text-[9px] text-stone-600 mt-4">
                Gestionado por Stripe Payments. Conexión SSL segura.
            </p>
        </div>
      </div>
      
      {/* Legal Modal Overlay */}
      {legalType && <LegalModal type={legalType} onClose={() => setLegalType(null)} />}
    </div>
  );
};
