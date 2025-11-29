
import React, { useState } from 'react';
import { X, MessageSquare, Send, Paperclip } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const SupportModal: React.FC<Props> = ({ onClose }) => {
  const [sent, setSent] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulation
    setTimeout(() => setSent(true), 1000);
  };

  if (sent) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
        <div className="bg-slate-900 border border-ai-500/30 p-8 rounded-2xl text-center max-w-md">
          <div className="w-16 h-16 bg-ai-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send size={32} className="text-ai-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">¡Mensaje Enviado!</h2>
          <p className="text-slate-400 text-sm mb-6">El equipo de soporte revisará tu caso. Te contactaremos en menos de 24h.</p>
          <button onClick={onClose} className="px-6 py-2 bg-white text-black rounded-lg font-bold hover:bg-slate-200 transition-colors">
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-ai-500" /> Soporte Técnico
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nombre</label>
                <input required type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-ai-500 outline-none" />
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <input required type="email" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-ai-500 outline-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Asunto</label>
            <select className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-ai-500 outline-none">
                <option>Reportar un error</option>
                <option>Problema de facturación</option>
                <option>Sugerencia de mejora</option>
                <option>Otros</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Descripción</label>
            <textarea required rows={4} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-ai-500 outline-none resize-none" placeholder="Describe tu problema con detalle..."></textarea>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors border border-dashed border-slate-700 p-3 rounded-lg justify-center">
            <Paperclip size={14} /> Adjuntar captura de pantalla (Opcional)
          </div>

          <button type="submit" className="w-full bg-ai-600 hover:bg-ai-500 text-white font-bold py-3 rounded-xl transition-colors mt-2">
            Enviar Solicitud
          </button>
        </form>
      </div>
    </div>
  );
};
