import React from 'react';
import { X, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  onClose: () => void;
}

export const DemoModal: React.FC<Props> = ({ onClose }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-stone-900 border border-[#D4AF37] rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.2)] relative">
        
        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors"
        >
            <X size={20} />
        </button>

        <div className="p-8 text-center">
            <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#D4AF37]/30">
                <Lock size={32} className="text-[#D4AF37]" />
            </div>

            <h2 className="text-2xl font-serif font-bold text-white mb-2">Modo Demostración</h2>
            <p className="text-stone-400 text-sm mb-8 leading-relaxed">
                Está explorando una simulación con datos ficticios. 
                Para guardar cambios, conectar sus bancos reales y activar el Mayordomo, necesita crear su Identidad Digital.
            </p>

            <div className="space-y-3">
                <button 
                    onClick={() => window.location.href = '/'}
                    className="w-full py-3 bg-[#D4AF37] hover:bg-[#b68e29] text-black font-bold text-sm uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20"
                >
                    Crear Identidad Digital <ArrowRight size={16} />
                </button>
                <button 
                    onClick={onClose}
                    className="w-full py-3 bg-transparent hover:bg-stone-800 text-stone-500 hover:text-stone-300 font-bold text-xs uppercase tracking-widest rounded-lg transition-colors"
                >
                    Seguir Explorando
                </button>
            </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-950 p-4 text-center border-t border-stone-800">
            <p className="text-[10px] text-stone-600 uppercase tracking-widest">
                Mayordomo Digital v1.0 • Acceso Limitado
            </p>
        </div>

      </div>
    </div>
  );
};
