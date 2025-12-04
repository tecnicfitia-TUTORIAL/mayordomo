
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, X, Check, Smartphone, Loader2 } from 'lucide-react';
import { MfaService } from '../services/mfaService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'SETUP' | 'VERIFY';
  actionLabel?: string; // e.g. "Acceder al Banco"
}

export const MfaModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, mode, actionLabel }) => {
  const [step, setStep] = useState<'INIT' | 'QR' | 'VERIFYING' | 'SUCCESS'>('INIT');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && mode === 'SETUP') {
      loadSetup();
    } else if (isOpen && mode === 'VERIFY') {
      setStep('INIT');
    }
    setToken('');
    setError(null);
  }, [isOpen, mode]);

  const loadSetup = async () => {
    setIsLoading(true);
    try {
      const { qrCodeUrl } = await MfaService.generateSetup();
      setQrUrl(qrCodeUrl);
      setStep('QR');
    } catch (e) {
      setError("Error generando código QR. Intente de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      let isValid = false;
      if (mode === 'SETUP') {
        isValid = await MfaService.verifySetup(token);
      } else {
        isValid = await MfaService.validateAction(token);
      }

      if (isValid) {
        setStep('SUCCESS');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setError("Código incorrecto. Intente de nuevo.");
      }
    } catch (e) {
      setError("Error de conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fadeIn">
        
        {/* HEADER */}
        <div className="bg-stone-950 p-6 border-b border-stone-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/20 rounded-lg border border-emerald-500/30">
              <ShieldCheck className="text-emerald-500" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {mode === 'SETUP' ? 'Configurar Seguridad' : 'Verificación Requerida'}
              </h2>
              <p className="text-xs text-stone-400">
                {mode === 'SETUP' ? 'Google Authenticator' : 'Acceso de Alto Nivel'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6">
          
          {step === 'SUCCESS' ? (
            <div className="text-center py-8 animate-pulse">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 mb-4">
                <Check size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¡Verificado!</h3>
              <p className="text-stone-400">Acceso concedido.</p>
            </div>
          ) : (
            <>
              {mode === 'SETUP' && step === 'QR' && (
                <div className="text-center mb-6">
                  <p className="text-sm text-stone-300 mb-4">
                    Escanee este código con su aplicación <strong>Google Authenticator</strong>:
                  </p>
                  {qrUrl ? (
                    <div className="bg-white p-4 rounded-xl inline-block mb-4">
                      <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>
                  )}
                </div>
              )}

              {mode === 'VERIFY' && (
                <div className="mb-6 text-center">
                  <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-lg mb-6">
                    <Lock className="mx-auto text-amber-500 mb-2" size={24} />
                    <p className="text-sm text-amber-200 font-bold">{actionLabel || 'Esta acción requiere autorización'}</p>
                  </div>
                  <p className="text-sm text-stone-400">
                    Introduzca el código de 6 dígitos de su aplicación.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Código de Seguridad</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 text-stone-600" size={18} />
                    <input 
                      type="text" 
                      value={token}
                      onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000 000"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl py-3 pl-10 pr-4 text-white font-mono text-xl tracking-widest focus:outline-none focus:border-emerald-500 transition-colors text-center"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-red-400 text-xs text-center bg-red-900/20 p-2 rounded border border-red-900/50">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={token.length !== 6 || isLoading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'SETUP' ? 'ACTIVAR' : 'VERIFICAR')}
                </button>
              </form>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
