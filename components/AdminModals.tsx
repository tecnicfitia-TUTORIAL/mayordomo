
import React, { useState } from 'react';
import { SupportUserStatus, SubscriptionTier } from '../types';
import { X, FileText, AlertTriangle, Shield, Check, Lock, History, PenTool } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../constants';

interface BaseModalProps {
  user: SupportUserStatus;
  onClose: () => void;
  onConfirm: (data?: any) => void;
}

// --- 1. AUDIT LOG MODAL (Read Only) ---
export const AuditLogModal: React.FC<BaseModalProps> = ({ user, onClose }) => {
  // Mock Logs
  const logs = [
    { time: 'Hace 2 min', action: 'Consulta API DGT', status: 'SUCCESS', ip: '192.168.1.10' },
    { time: 'Hace 15 min', action: 'Intento Login Fallido', status: 'WARN', ip: '45.22.11.90' },
    { time: 'Hace 4 horas', action: 'Sincronización Bancaria', status: 'SUCCESS', ip: '192.168.1.10' },
    { time: 'Ayer 22:00', action: 'Cambio de Preferencias', status: 'SUCCESS', ip: '192.168.1.10' },
    { time: '2023-10-25', action: 'Creación de Cuenta', status: 'INFO', ip: '192.168.1.10' },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-stone-900 border border-stone-700 rounded-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950">
          <div className="flex items-center gap-2">
            <History className="text-ai-500" size={20} />
            <h2 className="text-white font-serif font-bold">Log de Auditoría: {user.uid}</h2>
          </div>
          <button onClick={onClose}><X className="text-stone-500 hover:text-white" /></button>
        </div>
        
        <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-black">
            <table className="w-full text-left text-[10px] font-mono">
                <thead className="bg-stone-900 text-stone-500 uppercase tracking-wider sticky top-0">
                    <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Acción</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3">IP Origen</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-stone-800 text-stone-300">
                    {logs.map((log, i) => (
                        <tr key={i} className="hover:bg-stone-900/50 transition-colors">
                            <td className="p-3 text-stone-500">{log.time}</td>
                            <td className="p-3 font-bold">{log.action}</td>
                            <td className="p-3">
                                <span className={`px-1.5 py-0.5 rounded border ${
                                    log.status === 'SUCCESS' ? 'border-emerald-900 text-emerald-500 bg-emerald-900/10' : 
                                    log.status === 'WARN' ? 'border-amber-900 text-amber-500 bg-amber-900/10' : 
                                    'border-stone-800 text-stone-500'
                                }`}>{log.status}</span>
                            </td>
                            <td className="p-3 text-stone-600">{log.ip}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="p-3 border-t border-stone-800 bg-stone-900 text-right">
            <button onClick={onClose} className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded text-xs font-bold">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

// --- 2. FORCE LOGOUT MODAL (High Risk) ---
export const ForceLogoutModal: React.FC<BaseModalProps> = ({ user, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-red-950/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-stone-900 border-2 border-red-600 rounded-lg overflow-hidden shadow-red-900/50 shadow-2xl">
        <div className="p-6 text-center">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50">
                <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">⚠️ Confirmar Cierre de Sesión</h2>
            <p className="text-stone-400 text-sm mb-6">
                Esta acción desconectará inmediatamente al usuario <span className="text-white font-mono">{user.email}</span> de todos sus dispositivos.
            </p>

            <div className="text-left mb-6">
                <label className="block text-xs font-bold text-red-400 uppercase mb-1">Razón Administrativa (Requerido)</label>
                <input 
                    type="text" 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: Detectado acceso sospechoso..."
                    className="w-full bg-black border border-stone-700 rounded p-3 text-white text-sm focus:border-red-500 outline-none"
                />
            </div>

            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded font-bold text-xs uppercase">Cancelar</button>
                <button 
                    onClick={() => onConfirm(reason)}
                    disabled={!reason.trim()}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-bold text-xs uppercase flex items-center justify-center gap-2"
                >
                    <Lock size={14} /> Desconectar
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- 3. OVERRIDE SUBSCRIPTION MODAL (Control) ---
export const OverrideSubscriptionModal: React.FC<BaseModalProps> = ({ user, onClose, onConfirm }) => {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(user.tier);
  const [justification, setJustification] = useState('');

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-stone-900 border border-ai-500/50 rounded-lg overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-black">
          <div className="flex items-center gap-2">
            <PenTool className="text-ai-500" size={20} />
            <h2 className="text-white font-serif font-bold">Cambio Manual de Nivel</h2>
          </div>
          <button onClick={onClose}><X className="text-stone-500 hover:text-white" /></button>
        </div>

        <div className="p-6 space-y-6">
            
            <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nuevo Nivel Asignado</label>
                <div className="grid grid-cols-1 gap-2">
                    {SUBSCRIPTION_PLANS.map(plan => (
                        <button
                            key={plan.id}
                            onClick={() => setSelectedTier(plan.id as SubscriptionTier)}
                            className={`flex items-center justify-between p-3 rounded border transition-all ${
                                selectedTier === plan.id 
                                    ? 'bg-ai-900/20 border-ai-500 text-white' 
                                    : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-600'
                            }`}
                        >
                            <span className="text-sm font-bold">{plan.name}</span>
                            {selectedTier === plan.id && <Check size={16} className="text-ai-500" />}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Justificación del Override (Requerido)</label>
                <textarea 
                    rows={3}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Ej: Compensación por incidencia técnica #1234"
                    className="w-full bg-black border border-stone-700 rounded p-3 text-white text-sm focus:border-ai-500 outline-none resize-none"
                />
            </div>

            <button 
                onClick={() => onConfirm({ tier: selectedTier, justification })}
                disabled={!justification.trim() || selectedTier === user.tier}
                className="w-full py-4 bg-ai-600 hover:bg-ai-500 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
            >
                <Shield size={16} /> Aplicar Cambio
            </button>
        </div>
      </div>
    </div>
  );
};
