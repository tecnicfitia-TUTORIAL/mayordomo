
import React, { useState } from 'react';
import { SixthSenseOpportunity } from '../types';
import { Sparkles, X, ArrowRight, TrendingUp, Users, Car, Image as ImageIcon } from 'lucide-react';

interface Props {
  opportunities: SixthSenseOpportunity[];
}

export const SixthSenseWidget: React.FC<Props> = ({ opportunities }) => {
  const [visibleOpps, setVisibleOpps] = useState(opportunities);

  const handleDismiss = (id: string) => {
    setVisibleOpps(prev => prev.filter(o => o.id !== id));
  };

  if (visibleOpps.length === 0) return null;

  const getIcon = (type: string) => {
      switch(type) {
          case 'SAVING': return <TrendingUp size={18} />;
          case 'NETWORKING': return <Users size={18} />;
          case 'LOGISTICS': return <Car size={18} />;
          case 'NOSTALGIA': return <ImageIcon size={18} />;
          default: return <Sparkles size={18} />;
      }
  };

  return (
    <div className="col-span-full mb-4 animate-scaleIn">
      <div className="bg-gradient-to-r from-indigo-950/40 to-stone-900 border border-indigo-500/30 rounded-lg overflow-hidden relative shadow-[0_0_25px_rgba(99,102,241,0.15)]">
        
        {/* Header */}
        <div className="px-5 py-3 border-b border-indigo-500/20 bg-indigo-900/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Sparkles className="text-indigo-400 animate-pulse" size={16} />
                <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Sexto Sentido</h3>
            </div>
            <span className="text-[10px] text-indigo-400/70 font-mono">{visibleOpps.length} Oportunidades Latentes</span>
        </div>

        {/* Content List */}
        <div className="divide-y divide-indigo-500/10">
            {visibleOpps.map(opp => (
                <div key={opp.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group relative">
                    
                    <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                        {getIcon(opp.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-sm font-bold text-stone-200 truncate">{opp.title}</h4>
                            <span className="text-[9px] px-1.5 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-mono whitespace-nowrap">
                                {opp.impactLabel}
                            </span>
                        </div>
                        <p className="text-xs text-stone-400 truncate pr-8">{opp.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="text-xs font-bold text-indigo-400 hover:text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                            {opp.actionLabel} <ArrowRight size={12} />
                        </button>
                        <button 
                            onClick={() => handleDismiss(opp.id)}
                            className="p-1.5 hover:bg-stone-800 rounded text-stone-500 hover:text-stone-300 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
};
