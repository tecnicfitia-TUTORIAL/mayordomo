
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, X, Loader2, Fingerprint } from 'lucide-react';

interface Props {
  permissionLabel: string;
  onVerified: () => void;
  onClose: () => void;
}

export const MfaModal: React.FC<Props> = ({ permissionLabel, onVerified, onClose }) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  // Auto-focus logic simulation or setup
  useEffect(() => {
      // Reset error on input change
      if (error) setError(false);
  }, [code]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate Network Verification
    setTimeout(() => {
        // Mock Validation: Code must be 6 digits (any 6 digits for demo, or specifically '123456')
        if (code.length === 6) {
            setIsLoading(false);
            onVerified();
        } else {
            setIsLoading(false);
            setError(true);
        }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-[#0c0a09] border border-ai-500/50 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.15)] relative">
        
        {/* Decorative Top Line */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-ai-500 to-transparent"></div>

        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors"
        >
            <X size={20} />
        </button>

        <div className="p-8 flex flex-col items-center text-center">
            
            <div className="mb-6 relative">
                <div className="absolute inset-0 bg-ai-500 blur-xl opacity-20 rounded-full"></div>
                <div className="relative bg-stone-900 p-4 rounded-full border border-ai-500/30 text-ai-500">
                    <ShieldCheck size={32} />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1 border border-stone-800">
                    <Lock size={12} className="text-white" />
                </div>
            </div>

            <h2 className="text-lg font-serif font-bold text-white mb-1">Verificación de Seguridad</h2>
            <p className="text-xs text-stone-400 mb-6 leading-relaxed">
                La activación de <span className="text-ai-500 font-bold">"{permissionLabel}"</span> requiere autorización de nivel superior.
            </p>

            <form onSubmit={handleVerify} className="w-full space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Código de Autenticación (2FA)</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="000 000"
                            className={`w-full bg-stone-900/50 border ${error ? 'border-red-500 text-red-500' : 'border-stone-700 focus:border-ai-500 text-white'} rounded-lg py-3 text-center text-xl font-mono tracking-[0.5em] outline-none transition-all placeholder-stone-700`}
                            autoFocus
                        />
                        {error && (
                            <p className="text-[10px] text-red-500 mt-2 font-bold animate-pulse">Código incorrecto. Intente de nuevo.</p>
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <button 
                        type="submit"
                        disabled={isLoading || code.length < 6}
                        className="w-full bg-ai-600 hover:bg-ai-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-ai-500/20 active:scale-[0.98]"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} />}
                        {isLoading ? 'Verificando...' : 'AUTORIZAR ACCESO'}
                    </button>
                </div>
            </form>
            
            <p className="mt-6 text-[9px] text-stone-600 font-mono">
                SESSION_ID: {Math.random().toString(36).substring(7).toUpperCase()} // SECURE_CHANNEL
            </p>
        </div>
      </div>
    </div>
  );
};
