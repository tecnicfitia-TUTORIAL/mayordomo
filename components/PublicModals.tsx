import React from 'react';
import { X, Check, Crown, Star, Zap, Shield, ArrowRight, BookOpen, Scale } from 'lucide-react';
import { SUBSCRIPTION_PLANS, PILLAR_DEFINITIONS } from '../constants';
import { SubscriptionTier, PillarId } from '../types';
import { LegalModal } from './LegalModal';

interface ModalProps {
  onClose: () => void;
}

const PublicModalWrapper: React.FC<{ children: React.ReactNode; title: string; onClose: () => void }> = ({ children, title, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
    <div className="w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative animate-scaleIn">
      <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-stone-950/50">
        <h2 className="text-2xl font-serif font-bold text-white">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-full text-stone-500 hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {children}
      </div>
    </div>
  </div>
);

export const PublicPricingModal: React.FC<ModalProps> = ({ onClose }) => {
  return (
    <PublicModalWrapper title="Niveles de Servicio" onClose={onClose}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const Icon = plan.id === SubscriptionTier.VIP ? Crown : plan.id === SubscriptionTier.PRO ? Star : plan.id === SubscriptionTier.BASIC ? Zap : Shield;
          const isVip = plan.id === SubscriptionTier.VIP;
          
          return (
            <div key={plan.id} className={`relative p-6 rounded-xl border flex flex-col h-full ${isVip ? 'bg-gradient-to-b from-stone-900 to-stone-950 border-ai-500/50 shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'bg-stone-950/30 border-stone-800'}`}>
              {isVip && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ai-500 text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  Recomendado
                </div>
              )}
              
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isVip ? 'bg-ai-500 text-black' : 'bg-stone-900 text-stone-400'}`}>
                <Icon size={24} />
              </div>
              
              <h3 className={`text-lg font-bold mb-1 ${isVip ? 'text-white' : 'text-stone-200'}`}>{plan.name}</h3>
              <div className="text-2xl font-serif font-bold text-white mb-4">{plan.price}<span className="text-xs font-sans font-normal text-stone-500 ml-1">/mes</span></div>
              
              <p className="text-xs text-stone-400 mb-6 min-h-[40px]">{plan.description}</p>
              
              <div className="space-y-3 flex-1">
                {plan.capabilities.map((cap, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-stone-300">
                    <Check size={14} className={isVip ? 'text-ai-500' : 'text-stone-600'} />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </PublicModalWrapper>
  );
};

export const PublicGuideModal: React.FC<ModalProps> = ({ onClose }) => {
  return (
    <PublicModalWrapper title="Guía de Navegación" onClose={onClose}>
      <div className="space-y-8 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-lg text-stone-300 leading-relaxed">
            El Mayordomo Digital organiza su vida a través de 5 pilares fundamentales, diseñados para cubrir cada aspecto de su existencia con precisión y discreción.
          </p>
        </div>

        <div className="grid gap-6">
          {Object.values(PillarId).map((id) => {
            const def = PILLAR_DEFINITIONS[id];
            return (
              <div key={id} className="flex gap-6 p-6 bg-stone-950/30 border border-stone-800 rounded-xl hover:border-stone-700 transition-colors">
                <div className="shrink-0 w-16 h-16 bg-stone-900 rounded-lg flex items-center justify-center text-ai-500 font-serif text-2xl font-bold border border-stone-800">
                  {def.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{def.name}</h3>
                  <p className="text-stone-400 text-sm mb-3">{def.description}</p>
                  <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-600 bg-stone-900 px-2 py-1 rounded">
                    Nivel Mínimo: {def.minTier}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PublicModalWrapper>
  );
};

export const PublicLegalModal: React.FC<ModalProps> = ({ onClose }) => {
  // Reutilizamos el LegalModal existente pero lo envolvemos para mantener consistencia si es necesario,
  // o simplemente lo renderizamos directamente. Dado que LegalModal ya tiene su propio estilo de modal,
  // lo usaremos directamente pero asegurándonos de que se comporte bien.
  // El requerimiento dice "Muestra los textos legales".
  // LegalModal toma un 'type'. Mostraremos 'PRIVACY' por defecto o permitiremos navegar.
  
  // Para simplificar y cumplir con el requerimiento de "Modal Grande", usaremos el LegalModal existente
  // que ya parece ser un modal completo.
  
  return <LegalModal type="PRIVACY" onClose={onClose} />;
};
