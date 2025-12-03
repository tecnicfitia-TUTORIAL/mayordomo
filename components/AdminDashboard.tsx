import React from 'react';
import { Users, LifeBuoy, Activity, Scan, ArrowRight, Shield, Crown, User } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface Props {
  onSimulate: (tier: SubscriptionTier) => void;
  onOpenSupport: () => void;
  onOpenEvolution: () => void;
  onForceScan: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ onSimulate, onOpenSupport, onOpenEvolution, onForceScan }) => {
  
  const SIMULATION_OPTIONS = [
    { tier: SubscriptionTier.FREE, label: 'Invitado (Free)', icon: User, color: 'text-stone-400', desc: 'Funcionalidad básica limitada.' },
    { tier: SubscriptionTier.BASIC, label: 'Asistente (Basic)', icon: Shield, color: 'text-emerald-400', desc: 'Acceso a Patrimonio y Concierge.' },
    { tier: SubscriptionTier.PRO, label: 'Mayordomo (Pro)', icon: Crown, color: 'text-amber-400', desc: 'Gestión Vital y Automatización.' },
    { tier: SubscriptionTier.VIP, label: 'Gobernante (VIP)', icon: Crown, color: 'text-purple-400', desc: 'Control total y Núcleo Familiar.' },
  ];

  return (
    <div className="flex-1 bg-[#0c0a09] p-8 md:p-12 overflow-y-auto custom-scrollbar animate-fadeIn">
      
      <header className="mb-12">
        <h1 className="text-3xl font-serif font-bold text-white mb-2">Centro de Mando</h1>
        <p className="text-stone-500">Seleccione una herramienta de gestión o simulación.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
        
        {/* SECTION 1: SIMULATION */}
        <section className="bg-stone-950 border border-stone-800 rounded-2xl p-8 relative overflow-hidden group hover:border-stone-700 transition-colors">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users size={120} />
           </div>
           
           <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <Users className="text-ai-500" /> Simulación de Usuarios
           </h2>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SIMULATION_OPTIONS.map(opt => (
                 <button
                    key={opt.tier}
                    onClick={() => onSimulate(opt.tier)}
                    className="flex flex-col p-4 rounded-xl bg-stone-900/50 border border-stone-800 hover:bg-stone-900 hover:border-ai-500/30 transition-all text-left group/btn"
                 >
                    <div className="flex items-center justify-between mb-2">
                       <opt.icon size={20} className={opt.color} />
                       <ArrowRight size={16} className="text-stone-600 group-hover/btn:text-ai-500 opacity-0 group-hover/btn:opacity-100 transition-all -translate-x-2 group-hover/btn:translate-x-0" />
                    </div>
                    <span className="font-bold text-stone-200 text-sm">{opt.label}</span>
                    <span className="text-xs text-stone-500 mt-1">{opt.desc}</span>
                 </button>
              ))}
           </div>
        </section>

        {/* SECTION 2: TOOLS */}
        <div className="space-y-8">
            
            {/* SUPPORT */}
            <button 
                onClick={onOpenSupport}
                className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-8 flex items-center justify-between group hover:border-stone-700 transition-all text-left relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
                        <LifeBuoy className="text-blue-500" /> Centro de Soporte
                    </h2>
                    <p className="text-stone-500 text-sm max-w-md">Gestión de incidencias, usuarios activos y estado del sistema.</p>
                </div>
                <div className="p-3 rounded-full bg-stone-900 text-stone-500 group-hover:text-white group-hover:bg-blue-900/20 transition-colors">
                    <ArrowRight size={24} />
                </div>
            </button>

            {/* EVOLUTION / CONSOLE */}
            <button 
                onClick={onOpenEvolution}
                className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-8 flex items-center justify-between group hover:border-stone-700 transition-all text-left relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
                        <Activity className="text-purple-500" /> Consola y Evolución
                    </h2>
                    <p className="text-stone-500 text-sm max-w-md">Logs del sistema, métricas de IA y propuestas de evolución.</p>
                </div>
                <div className="p-3 rounded-full bg-stone-900 text-stone-500 group-hover:text-white group-hover:bg-purple-900/20 transition-colors">
                    <ArrowRight size={24} />
                </div>
            </button>

            {/* FORCE SCAN */}
            <button 
                onClick={onForceScan}
                className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-8 flex items-center justify-between group hover:border-stone-700 transition-all text-left relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
                        <Scan className="text-emerald-500" /> Forzar Escaneo Global
                    </h2>
                    <p className="text-stone-500 text-sm max-w-md">Ejecutar análisis inmediato de todos los pilares y permisos.</p>
                </div>
                <div className="p-3 rounded-full bg-stone-900 text-stone-500 group-hover:text-white group-hover:bg-emerald-900/20 transition-colors">
                    <Activity size={24} />
                </div>
            </button>

        </div>

      </div>
    </div>
  );
};
