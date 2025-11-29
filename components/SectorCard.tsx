
import React, { memo } from 'react';
import { HouseSector, Owner } from '../types';
import { Activity, ShieldCheck, AlertCircle, User, Cpu } from 'lucide-react';

interface Props {
  sector: HouseSector;
  onOptimize: (sector: HouseSector) => void;
  loading: boolean;
}

const SectorCardComponent: React.FC<Props> = ({ sector, onOptimize, loading }) => {
  const isAI = sector.owner === Owner.AI;
  
  return (
    <div className={`relative p-6 rounded-sm border-double border-4 transition-all duration-300 group overflow-hidden bg-dark-900 shadow-lg ${
      isAI 
        ? 'border-ai-500/20 hover:border-ai-500/40' 
        : 'border-user-500/20 hover:border-user-500/40'
    }`}>
      {/* Subtle Paper Texture Overlay */}
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] pointer-events-none"></div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full border ${isAI ? 'bg-ai-900/10 border-ai-500/30 text-ai-500' : 'bg-user-900/10 border-user-500/30 text-user-500'}`}>
            {isAI ? <Cpu size={20} /> : <User size={20} />}
          </div>
          <div>
            <h3 className="font-serif font-bold text-stone-200 text-lg leading-none">{sector.name}</h3>
            <span className="text-[10px] font-sans tracking-widest uppercase text-stone-500">{sector.type}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-sm font-serif font-bold ${isAI ? 'text-ai-500' : 'text-user-500'}`}>
            {sector.efficiency}%
          </span>
          {sector.status === 'ATTENTION' && (
            <div className="flex items-center gap-1 text-user-400 text-[10px] uppercase tracking-wide font-bold animate-pulse mt-1">
                <AlertCircle size={10} /> Atención
            </div>
          )}
        </div>
      </div>

      {/* Classic Progress Bar */}
      <div className="h-px w-full bg-stone-800 mb-4 relative">
        <div 
          className={`h-[3px] absolute -top-[1px] transition-all duration-1000 ${isAI ? 'bg-ai-500' : 'bg-user-500'}`}
          style={{ width: `${sector.efficiency}%` }}
        />
      </div>

      <p className="text-sm text-stone-400 min-h-[40px] line-clamp-2 mb-5 font-serif italic leading-relaxed">
        "{sector.description}"
      </p>

      {isAI && (
        <button 
          onClick={() => onOptimize(sector)}
          disabled={loading || sector.efficiency >= 95}
          className={`w-full py-2.5 px-4 rounded-sm text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all border
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            ${isAI 
              ? 'bg-ai-900/10 hover:bg-ai-900/20 text-ai-500 border-ai-500/30 hover:border-ai-500/60' 
              : 'bg-user-900/10 hover:bg-user-900/20 text-user-500 border-user-500/30 hover:border-user-500/60'}
          `}
        >
          {loading ? <Activity size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          {loading ? 'Optimizando...' : sector.efficiency >= 95 ? 'Estado Óptimo' : 'Ejecutar Protocolo'}
        </button>
      )}
      
      {!isAI && (
         <div className="w-full py-2.5 px-4 rounded-sm text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 bg-stone-800/30 text-stone-500 border border-stone-800 cursor-default font-serif italic">
           Territorio del Usuario
         </div>
      )}
    </div>
  );
};

// Optimization: Use memo with custom comparison to prevent re-renders unless essential data changes
// We ignore 'onOptimize' function reference changes to allow parent to pass inline functions if needed without cost
export const SectorCard = memo(SectorCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.sector.id === nextProps.sector.id &&
    prevProps.sector.efficiency === nextProps.sector.efficiency &&
    prevProps.sector.status === nextProps.sector.status &&
    prevProps.sector.description === nextProps.sector.description &&
    prevProps.sector.name === nextProps.sector.name &&
    prevProps.sector.owner === nextProps.sector.owner
  );
});
