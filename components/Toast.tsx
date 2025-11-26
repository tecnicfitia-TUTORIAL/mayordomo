
import React, { useEffect, useState } from 'react';
import { AlertTriangle, XCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'ERROR' | 'WARNING';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Entry animation
    const timerIn = setTimeout(() => setIsVisible(true), 10);
    
    // Auto close after 5 seconds
    const timerOut = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, 5000);

    return () => {
      clearTimeout(timerIn);
      clearTimeout(timerOut);
    };
  }, [onClose]);

  return (
    <div 
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-sm shadow-2xl border backdrop-blur-md transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      } ${
        type === 'ERROR' 
          ? 'bg-red-950/90 border-red-500/50 text-red-200' 
          : 'bg-amber-950/90 border-amber-500/50 text-amber-200'
      }`}
    >
      <div className={`p-1 rounded-full ${type === 'ERROR' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
        {type === 'ERROR' ? <XCircle size={18} /> : <AlertTriangle size={18} />}
      </div>
      
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest font-serif">
            {type === 'ERROR' ? 'Error de Sistema' : 'Alerta de Núcleo'}
        </h4>
        <p className="text-sm font-serif italic leading-tight mt-0.5">{message}</p>
      </div>
    </div>
  );
};
