
import React from 'react';
import { PillarId } from '../types';
import { Lock, Shield, Home, Coffee, Activity, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  isDegraded: boolean;
  statusMessage: string;
  isLocked: boolean;
}

export const PillarCard: React.FC<Props> = ({ id, name, description, isActive, isDegraded, statusMessage, isLocked }) => {
  
  const getIcon = () => {
      switch(id) {
          case PillarId.CENTINELA: return <Shield size={18} />;
          case PillarId.PATRIMONIO: return <Home size={18} />;
          case PillarId.CONCIERGE: return <Coffee size={18} />;
          case PillarId.VITAL: return <Activity size={18} />;
          case PillarId.NUCLEO: return <Users size={18} />;
          default: return <Activity size={18} />;
      }
  };

  if (isLocked) {
      return (
          <div className="p-4 bg-stone-950/50 border border-stone-800 rounded-sm opacity-60 flex items-center justify-between group-hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-900 rounded-full text-stone-600">
                      {getIcon()}
                  </div>
                  <div>
                      <h3 className="text-sm font-serif font-bold text-stone-500">{name}</h3>
                      <div className="flex items-center gap-1 text-[10px] text-stone-600 mt-0.5">
                          <Lock size={10} /> {statusMessage}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className={`p-4 bg-dark-900 border rounded-sm transition-all duration-300 ${
        isDegraded ? 'border-amber-500/20' : 'border-stone-800 hover:border-ai-500/30'
    }`}>
      <div className="flex justify-between items-start mb-2">
         <div className="flex items-center gap-3">
             <div className={`p-2 rounded-full border ${
                 isDegraded 
                    ? 'bg-amber-900/10 border-amber-500/30 text-amber-500' 
                    : 'bg-ai-900/10 border-ai-500/30 text-ai-500'
             }`}>
                 {getIcon()}
             </div>
             <div>
                 <h3 className="text-sm font-serif font-bold text-stone-200">{name}</h3>
                 <p className="text-[10px] text-stone-500 line-clamp-1">{description}</p>
             </div>
         </div>
      </div>

      <div className="flex items-center justify-between mt-3 pl-1">
          <div className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider ${
              isDegraded ? 'text-amber-500' : 'text-emerald-500'
          }`}>
              {isDegraded ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
              {statusMessage}
          </div>
          <div className="text-[10px] text-stone-600 font-mono">
              ID: {id.substring(0,3).toUpperCase()}
          </div>
      </div>
    </div>
  );
};
