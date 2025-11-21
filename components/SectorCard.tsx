import React from 'react';
import { HouseSector, Owner } from '../types';
import { Activity, ShieldCheck, AlertCircle, User, Cpu } from 'lucide-react';

interface Props {
  sector: HouseSector;
  onOptimize: (sector: HouseSector) => void;
  loading: boolean;
}

export const SectorCard: React.FC<Props> = ({ sector, onOptimize, loading }) => {
  const isAI = sector.owner === Owner.AI;
  
  return (
    <div className={`relative p-5 rounded-2xl border transition-all duration-300 group overflow-hidden ${
      isAI 
        ? 'bg-slate-900/50 border-ai-500/30 hover:border-ai-500/60' 
        : 'bg-slate-900/50 border-user-500/30 hover:border-user-500/60'
    }`}>
      {/* Background Glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-20 ${isAI ? 'bg-ai-500' : 'bg-user-500'}`} />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isAI ? 'bg-ai-900/50 text-ai-400' : 'bg-user-900/50 text-user-400'}`}>
            {isAI ? <Cpu size={18} /> : <User size={18} />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-200 text-sm">{sector.name}</h3>
            <span className="text-xs text-slate-400">{sector.type}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-xs font-mono font-bold ${isAI ? 'text-ai-400' : 'text-user-400'}`}>
            {sector.efficiency}% EFIC
          </span>
          {sector.status === 'ATTENTION' && (
            <AlertCircle size={14} className="text-red-400 mt-1 animate-pulse" />
          )}
        </div>
      </div>

      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-4">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${isAI ? 'bg-ai-500' : 'bg-user-500'}`}
          style={{ width: `${sector.efficiency}%` }}
        />
      </div>

      <p className="text-xs text-slate-400 min-h-[40px] line-clamp-2 mb-4">
        {sector.description}
      </p>

      {isAI && (
        <button 
          onClick={() => onOptimize(sector)}
          disabled={loading || sector.efficiency >= 95}
          className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            ${isAI 
              ? 'bg-ai-500/10 hover:bg-ai-500/20 text-ai-300 border border-ai-500/20' 
              : 'bg-user-500/10 hover:bg-user-500/20 text-user-300 border border-user-500/20'}
          `}
        >
          {loading ? <Activity size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          {loading ? 'Optimizando...' : sector.efficiency >= 95 ? 'Totalmente Optimizado' : 'Ejecutar Auto-Optimización'}
        </button>
      )}
      
      {!isAI && (
         <div className="w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-default">
           Territorio del Usuario
         </div>
      )}
    </div>
  );
};