

import React, { useState } from 'react';
import { Mission, ProtocolItem } from '../types';
import { Plane, CloudRain, Clock, CheckCircle2, Circle, AlertTriangle, Briefcase, FileText, Shirt, Globe, ArrowRight, LogOut, LogIn, Stamp, Euro, X, Shield } from 'lucide-react';

interface Props {
  mission: Mission;
}

export const MissionBriefingCard: React.FC<Props> = ({ mission }) => {
  const [items, setItems] = useState<ProtocolItem[]>(mission.checklist as ProtocolItem[]);
  const [pendingApproval, setPendingApproval] = useState<ProtocolItem | null>(null);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => {
        if (item.id !== id) return item;
        
        // Logic for Financial Items (Golden Rule)
        // You cannot just "toggle" them off. You must Approve them.
        if (item.requiresApproval && !item.approved && item.isReady) {
            // User clicked the row, but not the button. Do nothing or expand details.
            return item; 
        }

        return { ...item, isReady: !item.isReady };
    }));
  };

  const handleApprovalClick = (item: ProtocolItem, e: React.MouseEvent) => {
      e.stopPropagation();
      setPendingApproval(item);
  };

  const confirmApproval = () => {
      if (!pendingApproval) return;
      
      setItems(prev => prev.map(item => 
          item.id === pendingApproval.id ? { ...item, approved: true } : item
      ));
      setPendingApproval(null);
  };

  const completedCount = items.filter(i => (i.requiresApproval ? i.approved : i.isReady)).length;
  const progress = (completedCount / items.length) * 100;

  const getIcon = (item: ProtocolItem) => {
    if (item.type === 'DOC' || item.type === 'LEGAL') return <FileText size={14} className="text-ai-500" />;
    if (item.type === 'ASSET') return <Shirt size={14} className="text-stone-400" />;
    return <Briefcase size={14} />;
  };

  const renderJurisdictionFlag = (code: string) => {
      // Simulación visual simple de banderas con texto
      const colors: Record<string, string> = {
          'ES': 'bg-red-900/40 text-red-200 border-red-500/30',
          'TH': 'bg-blue-900/40 text-blue-200 border-blue-500/30',
          'GLOBAL': 'bg-purple-900/40 text-purple-200 border-purple-500/30'
      };
      const style = colors[code] || 'bg-stone-800 text-stone-400';
      return (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold border ${style}`}>
              {code}
          </span>
      );
  };

  return (
    <div className="w-full bg-stone-900 border border-ai-500/30 rounded-lg overflow-hidden shadow-2xl relative animate-fadeIn mb-6 group">
      
      {/* CONFIRMATION MODAL OVERLAY */}
      {pendingApproval && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setPendingApproval(null)}>
           <div className="bg-stone-900 border border-ai-500 rounded-lg p-6 max-w-sm w-full shadow-[0_0_50px_rgba(212,175,55,0.2)] relative" onClick={e => e.stopPropagation()}>
               <button onClick={() => setPendingApproval(null)} className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors">
                   <X size={20} />
               </button>
               
               <div className="flex flex-col items-center text-center">
                   <div className="p-4 bg-ai-900/20 rounded-full border border-ai-500/50 text-ai-500 mb-4">
                       <Shield size={32} />
                   </div>
                   <h3 className="text-lg font-serif font-bold text-white mb-2">Confirmar Autorización</h3>
                   <p className="text-sm text-stone-400 mb-6 leading-relaxed">
                       Está a punto de autorizar un cargo de <span className="text-white font-bold">{pendingApproval.cost?.toLocaleString()} {pendingApproval.currency}</span> para <span className="text-ai-500 font-bold">"{pendingApproval.label}"</span>.
                       <br/><span className="text-[10px] text-stone-500 mt-2 block">Esta acción es vinculante y se ejecutará inmediatamente.</span>
                   </p>
                   
                   <div className="flex gap-3 w-full">
                       <button onClick={() => setPendingApproval(null)} className="flex-1 py-3 border border-stone-700 hover:bg-stone-800 text-stone-300 rounded font-bold text-xs uppercase transition-colors">
                           Cancelar
                       </button>
                       <button onClick={confirmApproval} className="flex-1 py-3 bg-ai-600 hover:bg-ai-500 text-black rounded font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-colors">
                           <Stamp size={14} /> Firmar
                       </button>
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-ai-500/5 blur-[80px] rounded-full pointer-events-none"></div>
      
      {/* HEADER: CONTEXT & DEPENDENCIES */}
      <div className="p-5 border-b border-stone-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/40">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-ai-900/20 rounded-full border border-ai-500/30 text-ai-500">
              <Globe size={24} />
           </div>
           <div>
              <div className="flex items-center gap-2">
                 <h2 className="text-lg font-serif font-bold text-white tracking-wide">{mission.title}</h2>
                 {mission.context.criticalAlert && (
                    <span className="bg-red-900/30 text-red-400 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border border-red-500/30 animate-pulse hidden md:inline-block">
                        {mission.context.criticalAlert}
                    </span>
                 )}
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500 font-mono mt-1">
                 <span>{mission.context.origin}</span>
                 <ArrowRight size={10} />
                 <span className="text-ai-500 font-bold">{mission.context.destination}</span>
              </div>
           </div>
        </div>

        {/* 3rd Leg: Context Data */}
        <div className="flex gap-4 text-xs font-mono text-stone-400">
           {mission.context.weatherCondition && (
             <div className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-sm border border-stone-800">
                <CloudRain size={14} className="text-blue-400" />
                <span>{mission.context.weatherCondition}</span>
             </div>
           )}
           <div className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-sm border border-stone-800">
              <Clock size={14} className="text-ai-500" />
              <span>Efectivo: <strong className="text-white">{new Date(mission.date).toLocaleDateString()}</strong></span>
           </div>
        </div>
      </div>

      {/* BODY: PROTOCOL CHECKLIST */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
         
         {/* Left: Strategy Summary */}
         <div className="flex flex-col justify-center md:col-span-1 border-b md:border-b-0 md:border-r border-stone-800 pb-4 md:pb-0 md:pr-6">
            <h3 className="text-sm font-bold text-ai-500 uppercase tracking-widest mb-2">Estrategia de Transición</h3>
            <p className="text-xs text-stone-400 font-serif italic mb-4 leading-relaxed">
               "Señor, he activado el protocolo de reubicación. He priorizado la baja fiscal en España para evitar la doble imposición y he preparado los pagos de visado para su firma."
            </p>
            
            <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-ai-500 transition-all duration-500 ease-out"
                 style={{ width: `${progress}%` }}
               />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-stone-500 font-mono">
               <span>Ejecución</span>
               <span>{Math.round(progress)}% Completado</span>
            </div>
         </div>

         {/* Right: The List (Split by Phases if needed, currently flat list with badges) */}
         <div className="grid grid-cols-1 gap-2 md:col-span-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {items.map(item => {
               // Determine visual state for Financial Items
               const isFinancial = item.requiresApproval && item.isReady;
               const needsSignature = isFinancial && !item.approved;
               
               return (
               <div 
                 key={item.id}
                 onClick={() => toggleItem(item.id)}
                 className={`flex items-center justify-between p-3 rounded-sm border transition-all relative overflow-hidden ${
                    needsSignature 
                        ? 'bg-ai-900/10 border-ai-500 shadow-[0_0_10px_rgba(212,175,55,0.1)]' 
                        : item.isReady || item.approved
                           ? 'bg-stone-800/20 border-stone-800/50 opacity-60' 
                           : 'bg-stone-800/30 border-stone-700 hover:bg-stone-800'
                 }`}
               >
                  {needsSignature && (
                      <div className="absolute top-0 right-0 w-16 h-1 bg-ai-500 animate-pulse"></div>
                  )}

                  <div className="flex items-center gap-3 w-full">
                     <div className={`transition-colors shrink-0 ${item.approved ? 'text-ai-600' : (item.isReady && !isFinancial ? 'text-ai-600' : 'text-stone-500')}`}>
                        {item.approved ? <CheckCircle2 size={18} /> : (item.isReady && !isFinancial ? <CheckCircle2 size={18} /> : <Circle size={18} />)}
                     </div>
                     
                     <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            {renderJurisdictionFlag(item.jurisdiction)}
                            {item.phase === 'EXIT' && <span className="text-[9px] text-stone-500 flex items-center gap-0.5"><LogOut size={10}/> SALIDA</span>}
                            {item.phase === 'ENTRY' && <span className="text-[9px] text-ai-500 flex items-center gap-0.5"><LogIn size={10}/> ENTRADA</span>}
                            {needsSignature && <span className="text-[9px] bg-ai-500 text-black px-1.5 rounded-sm font-bold uppercase animate-pulse">Pendiente Firma</span>}
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className={`text-xs font-bold ${item.approved || (item.isReady && !isFinancial) ? 'text-stone-500 line-through' : 'text-stone-200'}`}>
                               {item.label}
                            </span>
                            
                            {/* Financial Amount */}
                            {isFinancial && (
                                <span className={`font-mono text-xs font-bold ${item.approved ? 'text-stone-600' : 'text-white'} flex items-center gap-1`}>
                                    {item.cost?.toLocaleString()} {item.currency}
                                </span>
                            )}
                        </div>

                        {item.notes && !item.approved && !needsSignature && (
                           <div className="flex items-center gap-1 text-[9px] text-amber-500/80 mt-0.5">
                              <AlertTriangle size={8} /> {item.notes}
                           </div>
                        )}
                     </div>

                     {/* APPROVAL BUTTON (Golden Rule) */}
                     {needsSignature && (
                         <button 
                            onClick={(e) => handleApprovalClick(item, e)}
                            className="bg-ai-600 hover:bg-ai-500 text-black px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg shrink-0 transition-transform active:scale-95"
                         >
                             <Stamp size={12} />
                             Firmar
                         </button>
                     )}
                  </div>
               </div>
            )})}
         </div>

      </div>
    </div>
  );
};
