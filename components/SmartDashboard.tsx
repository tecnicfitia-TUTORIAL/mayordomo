import React from 'react';
import { DashboardItem } from '../types';
import { Lock, ArrowRight, Stamp, Coffee, Image as ImageIcon } from 'lucide-react';
import { SixthSenseWidget } from './SixthSenseWidget';

interface Props {
  items: DashboardItem[];
}

export const SmartDashboard: React.FC<Props> = ({ items }) => {
  
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn pb-20">
       {items.map(item => {
           
           // RENDER: SIXTH SENSE (NUEVO - WIDGET PRIORITARIO)
           if (item.type === 'SIXTH_SENSE' && item.opportunities) {
               return <SixthSenseWidget key={item.id} opportunities={item.opportunities} />;
           }

           // RENDER: ZEN CARD (Empty State for VIPs)
           if (item.type === 'ZEN') {
               return (
                   <div key={item.id} className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-50 border border-dashed border-stone-800 rounded-lg">
                       <Coffee size={48} className="text-ai-500 mb-4" />
                       <h3 className="text-2xl font-serif font-bold text-stone-300">{item.title}</h3>
                       <p className="text-sm font-serif italic text-stone-500 mt-2">{item.description}</p>
                   </div>
               );
           }

           // RENDER: NOSTALGIA CARD (Emotional Hook)
           if (item.type === 'NOSTALGIA') {
               return (
                   <div key={item.id} className="relative group overflow-hidden rounded-sm border border-stone-800 aspect-video md:aspect-auto md:h-64 shadow-lg">
                       <img 
                         src={item.metadata?.image || "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=800"} 
                         alt="Memory" 
                         className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity grayscale group-hover:grayscale-0 duration-700" 
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                       <div className="absolute bottom-0 left-0 p-5">
                           <div className="flex items-center gap-2 text-ai-500 mb-1 text-xs font-bold uppercase tracking-widest">
                               <ImageIcon size={12} /> {item.type}
                           </div>
                           <h3 className="text-lg font-serif font-bold text-white leading-tight">{item.title}</h3>
                           <p className="text-xs text-stone-300 italic mt-1">{item.description}</p>
                       </div>
                   </div>
               );
           }

           // RENDER: DECISION CARD (Actionable or Locked)
           return (
               <div key={item.id} className={`p-6 rounded-sm border relative overflow-hidden group transition-all duration-300 ${
                   item.isLocked 
                     ? 'bg-stone-950 border-stone-800 opacity-60 hover:opacity-100' 
                     : 'bg-gradient-to-br from-stone-900 to-stone-950 border-ai-500/30 hover:border-ai-500 hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]'
               }`}>
                   
                   {/* Locked Overlay */}
                   {item.isLocked && (
                       <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[1px]">
                           <div className="p-3 bg-stone-900 rounded-full border border-stone-700 mb-2">
                                <Lock className="text-stone-500" size={24} />
                           </div>
                           <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Función Premium</span>
                       </div>
                   )}

                   <div className="flex justify-between items-start mb-4">
                       <span className={`text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-widest border ${
                           item.isLocked 
                             ? 'border-stone-700 text-stone-500 bg-stone-900' 
                             : 'border-ai-500/30 text-ai-500 bg-ai-500/10'
                       }`}>
                           {item.isLocked ? 'Restringido' : 'Acción Requerida'}
                       </span>
                   </div>

                   <h3 className="text-xl font-serif font-bold text-stone-200 mb-2 leading-tight">{item.title}</h3>
                   <p className="text-sm text-stone-400 leading-relaxed mb-6 line-clamp-3">{item.description}</p>

                   {!item.isLocked && (
                       <button className="w-full bg-ai-600 hover:bg-ai-500 text-black font-bold py-3 rounded-sm flex items-center justify-center gap-2 transition-all uppercase text-xs tracking-widest active:scale-[0.98]">
                           {item.metadata?.actionLabel || 'Gestionar'} <ArrowRight size={14} />
                       </button>
                   )}
                   
                   {/* Background Decoration */}
                   {!item.isLocked && (
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-ai-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-ai-500/10 transition-colors"></div>
                   )}
               </div>
           );
       })}
    </div>
  );
};