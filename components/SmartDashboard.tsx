
import React from 'react';
import { DashboardItem } from '../types';
import { Lock, ArrowRight, Coffee, Image as ImageIcon, Zap, Fingerprint } from 'lucide-react';
import { SixthSenseWidget } from './SixthSenseWidget';

interface Props {
  items: DashboardItem[];
  onOpenPermissions?: (permissionId: string) => void; // New prop for navigation
}

export const SmartDashboard: React.FC<Props> = ({ items, onOpenPermissions }) => {
  
  if (items.length === 0) return null;

  const handleCardClick = (item: DashboardItem) => {
      // If item requires a permission and we have the handler, trigger it
      if (item.requiredPermission && onOpenPermissions) {
          onOpenPermissions(item.requiredPermission);
      }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-[minmax(180px,auto)] gap-6 animate-fadeIn pb-20 grid-flow-dense">
       {items.map(item => {
           
           // --- WIDGET: SEXTO SENTIDO (Ancho Completo) ---
           if (item.type === 'SIXTH_SENSE' && item.opportunities) {
               return (
                   <div key={item.id} className="col-span-1 md:col-span-4">
                       <SixthSenseWidget opportunities={item.opportunities} />
                   </div>
               );
           }

           // --- CARD: ZEN (Ancho Completo - Estado Vacío VIP) ---
           if (item.type === 'ZEN') {
               return (
                   <div key={item.id} className="col-span-1 md:col-span-4 py-16 flex flex-col items-center justify-center text-center opacity-60 border border-dashed border-stone-800 rounded-lg bg-black/20">
                       <div className="p-4 bg-stone-900 rounded-full mb-4 animate-pulse">
                            <Coffee size={32} className="text-ai-500" />
                       </div>
                       <h3 className="text-2xl font-serif font-bold text-stone-300 tracking-wide">{item.title}</h3>
                       <p className="text-sm font-serif italic text-stone-500 mt-2 max-w-md">{item.description}</p>
                   </div>
               );
           }

           // --- CARD: NOSTALGIA (Grande - Visual) ---
           if (item.type === 'NOSTALGIA') {
               return (
                   <div 
                        key={item.id} 
                        onClick={() => handleCardClick(item)}
                        className={`col-span-1 md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-xl border border-stone-800 shadow-2xl transition-all hover:border-stone-600 ${item.requiredPermission ? 'cursor-pointer hover:ring-1 hover:ring-ai-500/50' : ''}`}
                   >
                       <img 
                         src={item.metadata?.image} 
                         alt="Memory" 
                         className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-80" 
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                       
                       <div className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white/70">
                           <ImageIcon size={16} />
                       </div>

                       <div className="absolute bottom-0 left-0 p-6 w-full">
                           <div className="text-ai-500 mb-2 text-[10px] font-bold uppercase tracking-[0.2em]">Recuerdo Vital</div>
                           <h3 className="text-2xl font-serif font-bold text-white leading-tight mb-2">{item.title}</h3>
                           <p className="text-sm text-stone-300 italic font-serif leading-relaxed border-l-2 border-ai-500 pl-3">
                               "{item.description}"
                           </p>
                           {item.requiredPermission && (
                               <div className="mt-3 flex items-center gap-2 text-[10px] text-ai-400 uppercase tracking-wider font-bold animate-pulse">
                                   <Lock size={10} /> Requiere Permiso: {item.requiredPermission}
                               </div>
                           )}
                       </div>
                   </div>
               );
           }

           // --- CARD: DECISION / ACTION (Standard Block) ---
           return (
               <div 
                    key={item.id} 
                    onClick={() => handleCardClick(item)}
                    className={`col-span-1 md:col-span-2 p-6 rounded-xl border relative overflow-hidden group transition-all duration-300 flex flex-col justify-between ${
                   item.isLocked 
                     ? 'bg-stone-950 border-stone-800 opacity-70 hover:opacity-100 cursor-pointer' 
                     : 'bg-stone-900/40 backdrop-blur-sm border-ai-500/20 hover:border-ai-500/50 hover:bg-stone-900/60 shadow-lg'
               } ${item.requiredPermission ? 'cursor-pointer' : ''}`}>
                   
                   {/* Locked Overlay */}
                   {item.isLocked && (
                       <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] transition-opacity group-hover:bg-black/50">
                           <div className="p-3 bg-stone-900/90 rounded-full border border-stone-700 mb-2 shadow-xl">
                                <Lock className="text-stone-500" size={20} />
                           </div>
                           <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                               {item.requiredPermission ? 'Permiso Requerido' : 'Función Premium'}
                           </span>
                       </div>
                   )}

                   <div>
                       <div className="flex justify-between items-start mb-4">
                           <span className={`text-[9px] font-bold px-2 py-1 rounded-sm uppercase tracking-widest border flex items-center gap-2 ${
                               item.isLocked 
                                 ? 'border-stone-700 text-stone-500 bg-stone-900' 
                                 : 'border-ai-500/30 text-ai-500 bg-ai-500/10 shadow-[0_0_10px_rgba(212,175,55,0.1)]'
                           }`}>
                               {item.isLocked ? <Lock size={10} /> : <Zap size={10} />}
                               {item.isLocked ? 'Restringido' : 'Acción Requerida'}
                           </span>
                       </div>

                       <h3 className="text-xl font-serif font-bold text-stone-200 mb-2 leading-tight group-hover:text-white transition-colors">{item.title}</h3>
                       <p className="text-sm text-stone-400 leading-relaxed mb-6 font-serif">{item.description}</p>
                       
                       {item.requiredPermission && !item.isLocked && (
                           <p className="text-[10px] text-ai-500/70 uppercase tracking-widest mb-2 flex items-center gap-1">
                               <Lock size={10} /> Permiso vinculado: {item.requiredPermission}
                           </p>
                       )}
                   </div>

                   {!item.isLocked && (
                       <button className="w-full bg-ai-600 hover:bg-ai-500 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all uppercase text-xs tracking-widest active:scale-[0.98] shadow-lg shadow-ai-500/10">
                           <Fingerprint size={16} />
                           {item.metadata?.actionLabel || 'Ejecutar'}
                           <ArrowRight size={14} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                       </button>
                   )}
                   
                   {/* Background Glow */}
                   {!item.isLocked && (
                        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-ai-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-ai-500/10 transition-colors"></div>
                   )}
               </div>
           );
       })}
    </div>
  );
};
