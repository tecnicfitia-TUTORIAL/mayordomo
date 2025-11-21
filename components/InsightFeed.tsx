import React from 'react';
import { Insight } from '../types';
import { Lightbulb, ArrowRight, X } from 'lucide-react';

interface Props {
  insights: Insight[];
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
}

export const InsightFeed: React.FC<Props> = ({ insights, onApply, onDismiss }) => {
  if (insights.length === 0) return null;

  return (
    <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="text-ai-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-200">Insights de Confort</h2>
            <span className="text-xs bg-ai-500/20 text-ai-300 px-2 py-0.5 rounded-full border border-ai-500/20">
                Cosas que te perdiste
            </span>
        </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight) => (
          <div 
            key={insight.id} 
            className="bg-gradient-to-b from-slate-800 to-slate-900 border border-ai-500/30 p-5 rounded-xl relative group hover:shadow-lg hover:shadow-ai-500/10 transition-all"
          >
            <button 
                onClick={() => onDismiss(insight.id)}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X size={16} />
            </button>
            
            <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider
                    ${insight.impact === 'HIGH' ? 'bg-red-500/20 text-red-400' : 
                      insight.impact === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 
                      'bg-blue-500/20 text-blue-400'}`
                }>
                    Impacto {insight.impact} 
                </span>
            </div>
            
            <h3 className="font-medium text-slate-200 mb-2">{insight.title}</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">{insight.description}</p>
            
            {insight.actionable && (
              <button 
                onClick={() => onApply(insight.id)}
                className="text-xs font-medium text-ai-400 flex items-center gap-1 hover:text-ai-300 transition-colors"
              >
                Deja que Confort se encargue <ArrowRight size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};