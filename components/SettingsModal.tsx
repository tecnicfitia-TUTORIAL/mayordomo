
import React from 'react';
import { UserProfile, SubscriptionTier } from '../types';
import { SUBSCRIPTION_PLANS, STRIPE_URLS, getTierLevel } from '../constants';
import { X, ExternalLink, Check, Shield, Zap, Star, Crown, ChevronRight } from 'lucide-react';
import { LegalModal } from './LegalModal';

interface Props {
  profile: UserProfile;
  onUpdate?: (profile: UserProfile) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ profile, onClose }) => {
  const [legalType, setLegalType] = React.useState<'PRIVACY' | 'TERMS' | 'NOTICE' | null>(null);
  
  const handleOpenCheckout = (tier: SubscriptionTier) => {
    const url = STRIPE_URLS[tier];
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleOpenPortal = () => {
    window.open(STRIPE_URLS.PORTAL, '_blank');
  };

  const getTierIcon = (tierId: string) => {
      switch(tierId) {
          case SubscriptionTier.FREE: return <Shield size={20} />;
          case SubscriptionTier.BASIC: return <Zap size={20} />;
          case SubscriptionTier.PRO: return <Star size={20} />;
          case SubscriptionTier.VIP: return <Crown size={20} />;
          default: return <Shield size={20} />;
      }
  };

  const currentLevel = getTierLevel(profile.subscriptionTier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-6xl bg-[#0c0a09] border border-stone-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-stone-950">
          <div>
            <h2 className="text-2xl font-serif font-bold text-white mb-1">Niveles de Autonomía</h2>
            <p className="text-xs text-stone-500 uppercase tracking-widest">Escala tu sistema de gestión 65/35</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-full transition-colors group">
              <X className="text-stone-500 group-hover:text-white" />
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {SUBSCRIPTION_PLANS.map((plan) => {
                    const planLevel = getTierLevel(plan.id as SubscriptionTier);
                    const isCurrent = profile.subscriptionTier === plan.id;
                    const isUpgrade = planLevel > currentLevel;
                    const isDowngrade = planLevel < currentLevel;

                    return (
                        <div 
                            key={plan.id}
                            className={`relative flex flex-col rounded-lg border transition-all duration-300 ${
                                isCurrent 
                                    ? 'bg-stone-900 border-ai-500 shadow-[0_0_30px_rgba(212,175,55,0.1)] ring-1 ring-ai-500 transform scale-[1.02] z-10' 
                                    : 'bg-stone-950/50 border-stone-800 hover:border-stone-700 hover:bg-stone-900'
                            }`}
                        >
                            {/* Header Card */}
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-full ${
                                        isCurrent ? 'bg-ai-500 text-black' : 
                                        isUpgrade ? 'bg-stone-800 text-stone-400' : 'bg-stone-900 text-stone-600'
                                    }`}>
                                        {getTierIcon(plan.id)}
                                    </div>
                                    {isCurrent && (
                                        <span className="text-[9px] font-bold bg-ai-900/40 text-ai-500 border border-ai-500/30 px-2 py-1 rounded uppercase tracking-widest">
                                            Plan Actual
                                        </span>
                                    )}
                                </div>

                                <h3 className={`text-xl font-serif font-bold mb-1 ${isCurrent ? 'text-white' : 'text-stone-200'}`}>
                                    {plan.name}
                                </h3>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-2xl font-bold text-white">{plan.price}</span>
                                    {plan.id !== SubscriptionTier.FREE && <span className="text-xs text-stone-500">/ mes</span>}
                                </div>

                                <p className="text-xs text-stone-500 mb-6 min-h-[40px] leading-relaxed">
                                    {plan.description}
                                </p>

                                {/* Features */}
                                <div className="space-y-3 mb-8 flex-1">
                                    {plan.capabilities.map((cap, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <Check size={14} className={`mt-0.5 shrink-0 ${isCurrent || isUpgrade ? 'text-ai-600' : 'text-stone-700'}`} />
                                            <span className={`text-xs ${isCurrent || isUpgrade ? 'text-stone-300' : 'text-stone-600'}`}>
                                                {cap}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA Button */}
                                <div className="mt-auto pt-4">
                                    {isCurrent ? (
                                        <button disabled className="w-full py-3 bg-stone-800 text-stone-500 font-bold text-xs uppercase tracking-widest rounded cursor-default border border-stone-700">
                                            Activo
                                        </button>
                                    ) : isUpgrade ? (
                                        <button 
                                            onClick={() => handleOpenCheckout(plan.id as SubscriptionTier)}
                                            className="w-full py-3 bg-white hover:bg-stone-200 text-black font-bold text-xs uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-2 shadow-lg group"
                                        >
                                            Contratar <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    ) : (
                                        <button disabled className="w-full py-3 bg-transparent text-stone-600 font-bold text-xs uppercase tracking-widest rounded border border-stone-800 cursor-default">
                                            Incluido
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Footer Bar (Billing Portal) */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
             <div className="flex gap-4">
                <button onClick={() => setLegalType('PRIVACY')} className="text-stone-500 hover:text-white transition-colors">Privacidad</button>
                <button onClick={() => setLegalType('TERMS')} className="text-stone-500 hover:text-white transition-colors">Términos</button>
             </div>

             <div className="flex items-center gap-4">
                <span className="text-stone-600 hidden md:inline">¿Ya tiene una suscripción activa?</span>
                <button 
                    onClick={handleOpenPortal}
                    className="flex items-center gap-2 text-stone-400 hover:text-ai-500 transition-colors font-bold uppercase tracking-wide px-4 py-2 rounded-lg border border-stone-800 hover:border-ai-500/30 hover:bg-ai-900/10"
                >
                    <ExternalLink size={14} /> Ir al Portal de Cliente
                </button>
             </div>
        </div>

      </div>
      
      {/* Legal Modal Overlay */}
      {legalType && <LegalModal type={legalType} onClose={() => setLegalType(null)} />}
    </div>
  );
};
