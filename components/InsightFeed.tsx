

import React from 'react';
import { Insight } from '../types';
import { Lightbulb, ArrowRight, X } from 'lucide-react';

interface Props {
  insights: Insight[];
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
  title?: string; // Optional dynamic title
  subtitle?: string; // Optional dynamic subtitle
}

export const InsightFeed: React.FC<Props> = ({ insights, onApply, onDismiss, title, subtitle }) => {
  if (insights.length === 0) return null;

  return (
    <div className="mb-8">
        <div className="flex items-center gap-3 mb-6 border-b border-stone-800 pb-2">
            <div className="p-2 bg-ai-900/20 rounded-sm border border-ai-500/20">
                 <Lightbulb className="text-ai-500" size={20} />
            </div>
            <div>
                <h2 className="text-xl font-serif font-bold text-stone-200">{title || 'Informe de Novedades'}</h2>
                <span className="text-xs font-serif italic text-stone-500">
                    {subtitle || 'Asuntos pendientes de revisión'}
                </span>
            </div>
        </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.map((insight) => (
          <div 
            key={insight.id} 
            className={`bg-dark-900 border p-6 rounded-sm relative group transition-all shadow-lg flex flex-col ${
                insight.impact === 'CRITICAL' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-stone-800 hover:border-ai-500/40'
            }`}
          >
            {/* Paper texture effect */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-5 pointer-events-none"></div>

            <button 
                onClick={() => onDismiss(insight.id)}
                className="absolute top-3 right-3 text-stone-600 hover:text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X size={16} />
            </button>
            
            <div className="flex items-center gap-2 mb-4 relative z-10">
                <span className={`text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest border
                    ${insight.impact === 'CRITICAL' ? 'bg-red-900/20 text-red-500 border-red-500/50 animate-pulse' : 
                      insight.impact === 'HIGH' ? 'bg-user-900/10 text-user-500 border-user-500/30' : 
                      insight.impact === 'MEDIUM' ? 'bg-ai-900/10 text-ai-500 border-ai-500/30' : 
                      'bg-stone-800 text-stone-400 border-stone-600'}`
                }>
                    Prioridad {insight.impact} 
                </span>
            </div>
            
            <h3 className="font-serif font-bold text-lg text-stone-200 mb-3 leading-tight">{insight.title}</h3>
            <p className="text-sm text-stone-400 mb-6 leading-relaxed font-serif italic flex-1 border-l-2 border-stone-800 pl-3">
                "{insight.description}"
            </p>
            
            {insight.actionable && (
              <button 
                onClick={() => onApply(insight.id)}
                className="w-full py-3 border border-ai-600 text-xs font-bold text-ai-500 hover:bg-ai-900/10 hover:text-ai-400 transition-colors uppercase tracking-widest flex items-center justify-center gap-2 relative z-10"
              >
                Autorizar Gestión <ArrowRight size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};