import React, { useState } from 'react';
import { SubscriptionTier, FeatureMatrixItem } from '../types';
import { getTierLevel } from '../constants';
import { X, FileText, Download, Zap, CheckCircle2, Shield, AlertTriangle, ArrowRight, Stamp, Lock } from 'lucide-react';
import { PlaidConnectButton } from './PlaidConnectButton';
import { Toast } from './Toast';

interface Props {
  feature: FeatureMatrixItem;
  currentTier: SubscriptionTier;
  mockData: { value: string; label: string; source: string };
  userId: string;
  onClose: () => void;
  onSuccess?: () => void; // Callback para refrescar estado padre
}

export const UniversalDetailModal: React.FC<Props> = ({ feature, currentTier, mockData, userId, onClose, onSuccess }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'INFO' | 'WARNING' | 'ERROR'} | null>(null);

  // LOGIC: DETERMINE MODE
  // Level 1 & 2 (Free/Basic) -> READ_ONLY
  // Level 3 & 4 (Pro/VIP) -> EXECUTE
  const userLevel = getTierLevel(currentTier);
  const isExecutionMode = userLevel >= 3; // Pro or higher

  const handleExecute = () => {
    setIsExecuting(true);
    // Simulate API Call
    setTimeout(() => {
        setIsExecuting(false);
        setIsDone(true);
        setToast({ message: 'Operación Ejecutada Correctamente', type: 'INFO' });
        if (onSuccess) onSuccess();
    }, 2000);
  };

  const handleBankSuccess = () => {
      setIsDone(true);
      setToast({ message: 'Conexión Bancaria Establecida Correctamente', type: 'INFO' });
      
      // CRITICAL: Refresh Parent State
      if (onSuccess) {
          console.log("[UniversalModal] Triggering Parent Refresh...");
          onSuccess();
      }

      // Auto-close after delay
      setTimeout(() => {
          onClose();
      }, 2000);
  };

  const isBankFeature = feature.id === 'pat_expenses' || feature.id === 'func_open_banking';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn">
      
      {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
      )}

      <div className="w-full max-w-lg bg-[#0c0a09] border border-stone-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative">
        
        {/* Background Texture */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-10 pointer-events-none"></div>

        {/* Header */}
        <div className="p-6 border-b border-stone-800 flex justify-between items-start bg-stone-950 relative z-10">
          <div>
             <div className="flex items-center gap-2 mb-2">
                 <span className="text-[10px] font-bold bg-stone-900 text-stone-400 px-2 py-1 rounded border border-stone-800 uppercase tracking-wider">
                     {mockData.source}
                 </span>
                 <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wider ${isExecutionMode ? 'bg-ai-900/20 text-ai-500 border-ai-500/30' : 'bg-stone-800 text-stone-500 border-stone-700'}`}>
                     {isExecutionMode ? 'Modo Ejecutivo' : 'Modo Lectura'}
                 </span>
             </div>
             <h2 className="text-2xl font-serif font-bold text-white">{feature.name}</h2>
             <p className="text-sm text-stone-500">{feature.description}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-full text-stone-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar relative z-10">
            
            {/* Main Data Display */}
            <div className="flex flex-col items-center justify-center py-8 border border-stone-800 bg-stone-900/30 rounded-lg mb-8">
                <span className="text-xs text-stone-500 uppercase tracking-widest mb-2">{mockData.label}</span>
                <div className="text-4xl font-serif font-bold text-white tracking-tight">{mockData.value}</div>
                {isExecutionMode && !isDone && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-amber-500 bg-amber-900/10 px-3 py-1 rounded-full border border-amber-500/20">
                        <AlertTriangle size={12} /> Acción pendiente de firma
                    </div>
                )}
                {isDone && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-emerald-500 bg-emerald-900/10 px-3 py-1 rounded-full border border-emerald-500/20 animate-scaleIn">
                        <CheckCircle2 size={12} /> Procesado Correctamente
                    </div>
                )}
            </div>

            {/* Context Info */}
            <div className="space-y-4 text-sm text-stone-400 font-serif leading-relaxed">
                <p>
                    Informe generado automáticamente por El Mayordomo. 
                    {isExecutionMode 
                        ? " Tiene capacidad para ejecutar acciones vinculantes sobre este elemento gracias a sus permisos de nivel superior."
                        : " Su nivel actual permite la visualización y descarga de certificados, pero no la ejecución automática de trámites."
                    }
                </p>
                
                <div className="p-4 bg-stone-950 border border-stone-800 rounded text-xs font-mono text-stone-500">
                    ID_REF: {feature.id.toUpperCase()}_CX_{Date.now().toString().substring(8)}
                </div>
            </div>
        </div>

        {/* Footer Actions (CONDITIONAL LOGIC) */}
        <div className="p-6 border-t border-stone-800 bg-stone-950 relative z-10">
            {isBankFeature ? (
                <PlaidConnectButton userId={userId} onSuccess={handleBankSuccess} />
            ) : isExecutionMode ? (
                // CASE 3: EXECUTION (Level 3/4)
                <div className="flex flex-col gap-3">
                    {isDone ? (
                        <button onClick={onClose} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all">
                            <CheckCircle2 size={20} /> Finalizar
                        </button>
                    ) : (
                        <button 
                            onClick={handleExecute}
                            disabled={isExecuting}
                            className="w-full bg-ai-600 hover:bg-ai-500 text-black font-bold py-4 rounded-lg flex items-center justify-center gap-2 uppercase tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all active:scale-[0.98]"
                        >
                            {isExecuting ? <Zap className="animate-spin" size={20} /> : <Stamp size={20} />}
                            {isExecuting ? 'Procesando...' : 'Ejecutar Ahora'}
                        </button>
                    )}
                    {!isDone && (
                        <p className="text-[9px] text-center text-stone-600">
                            Al pulsar, autoriza al Mayordomo a interactuar con {mockData.source} en su nombre.
                        </p>
                    )}
                </div>
            ) : (
                // CASE 2: READ ONLY (Level 2)
                <div className="flex gap-3">
                    <button className="flex-1 bg-stone-800 hover:bg-stone-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition-colors">
                        <FileText size={16} /> Ver PDF
                    </button>
                    <button className="flex-1 border border-stone-700 hover:bg-stone-800 text-stone-400 hover:text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition-colors">
                        <Download size={16} /> Descargar
                    </button>
                </div>
            )}
            
            {!isExecutionMode && !isBankFeature && (
                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-stone-500">
                    <Lock size={10} />
                    <span>Modo Ejecución requiere Nivel Mayordomo</span>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

