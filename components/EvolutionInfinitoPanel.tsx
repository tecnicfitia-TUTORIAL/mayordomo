
import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Zap, Check, X, Terminal, Clock, Sparkles, Server, Globe, ShieldAlert, ArrowRight } from 'lucide-react';
import { EvolutionService, SystemImprovementProposal, scanMacroContext, analyzeGapAndPropose } from '../services/evolutionService';
import { UserProfile, LifeStageConfig, MacroContextEvent, PermissionProposal } from '../types';

interface Props {
  onClose: () => void;
  profile: UserProfile;
  evolutionConfig: LifeStageConfig | null;
}

export const EvolutionInfinitoPanel: React.FC<Props> = ({ onClose, profile, evolutionConfig }) => {
  const [status, setStatus] = useState<'IDLE' | 'ANALYZING' | 'COMPLETE'>('IDLE');
  const [proposals, setProposals] = useState<SystemImprovementProposal[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [tflops, setTflops] = useState(0);

  // Permission Evolution State
  const [macroEvent, setMacroEvent] = useState<MacroContextEvent | null>(null);
  const [permissionProposal, setPermissionProposal] = useState<PermissionProposal | null>(null);
  const [isScanningMacro, setIsScanningMacro] = useState(false);

  // Simulate TFLOPS fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setTflops(prev => +(Math.random() * (15.5 - 14.8) + 14.8).toFixed(2));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const runAnalysis = async () => {
    setStatus('ANALYZING');
    setLogs(prev => [...prev, "> Iniciando conexión con Gemini Pro Vision..."]);
    
    setTimeout(() => setLogs(prev => [...prev, "> Analizando 14,502 líneas de log (24h)..."]), 800);
    setTimeout(() => setLogs(prev => [...prev, "> Detectando patrones de fricción UX..."]), 1600);
    setTimeout(() => setLogs(prev => [...prev, "> Generando propuestas de mejora..."]), 2200);

    try {
      const results = await EvolutionService.analyzeSystemLogs();
      setProposals(results);
      setStatus('COMPLETE');
      setLogs(prev => [...prev, `> Análisis completado. ${results.length} mejoras propuestas.`]);
    } catch (error) {
      setLogs(prev => [...prev, "> Error en el análisis."]);
      setStatus('IDLE');
    }
  };

  const runPermissionScan = async () => {
    setIsScanningMacro(true);
    setMacroEvent(null);
    setPermissionProposal(null);
    setLogs(prev => [...prev, "> Escaneando contexto macro-global (Internet)..."]);
    
    const event = await scanMacroContext();
    setMacroEvent(event);
    setLogs(prev => [...prev, `> Evento detectado: [${event.source}] ${event.title}`]);
    
    if (evolutionConfig) {
        setLogs(prev => [...prev, "> Analizando brecha de seguridad (Micro vs Macro)..."]);
        // Simulate small delay for effect
        await new Promise(r => setTimeout(r, 1000));
        
        const proposal = await analyzeGapAndPropose(event, profile, evolutionConfig.modules);
        setPermissionProposal(proposal);
        if (proposal) {
            setLogs(prev => [...prev, `> Propuesta de Permiso: ${proposal.title}`]);
        } else {
            setLogs(prev => [...prev, "> El perfil actual ya está protegido."]);
        }
    } else {
        setLogs(prev => [...prev, "> Error: Configuración de evolución no disponible."]);
    }
    
    setIsScanningMacro(false);
  };

  const handleApply = (id: string) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'APPLIED' } : p));
  };

  const handleDismiss = (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0a09] text-stone-200 animate-fadeIn">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-6 border-b border-stone-800 bg-stone-950/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
            <Sparkles className="text-purple-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">EVOLUTION CORE INFINITO</h1>
            <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
              <span className={`w-2 h-2 rounded-full ${status === 'ANALYZING' ? 'bg-purple-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              {status === 'ANALYZING' ? 'ANALIZANDO SISTEMA...' : 'ESPERANDO CICLO'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="text-right hidden md:block">
              <div className="text-[10px] text-stone-500 uppercase tracking-widest">Capacidad de Proceso</div>
              <div className="text-xl font-mono font-bold text-purple-400">{tflops} TFLOPS</div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-full transition-colors">
             <X size={20} />
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* LEFT: CONSOLE & ACTIONS */}
        <div className="w-full md:w-1/3 border-r border-stone-800 flex flex-col bg-black/40">
           
           <div className="p-6 border-b border-stone-800">
              <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800 mb-6">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-stone-400 uppercase">Próximo Análisis Automático</span>
                    <Clock size={14} className="text-stone-500" />
                 </div>
                 <div className="text-2xl font-mono text-white">02:00 AM</div>
              </div>

              <button 
                onClick={runAnalysis}
                disabled={status === 'ANALYZING'}
                className="w-full py-4 bg-purple-900/20 hover:bg-purple-900/30 border border-purple-500/50 text-purple-300 font-bold rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {status === 'ANALYZING' ? (
                    <Activity className="animate-spin" />
                ) : (
                    <Zap className="group-hover:scale-110 transition-transform" />
                )}
                {status === 'ANALYZING' ? 'PROCESANDO...' : 'EJECUTAR ANÁLISIS MANUAL'}
              </button>

              <button 
                onClick={runPermissionScan}
                disabled={isScanningMacro}
                className="w-full mt-3 py-4 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-500/50 text-blue-300 font-bold rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isScanningMacro ? (
                    <Globe className="animate-spin" />
                ) : (
                    <ShieldAlert className="group-hover:scale-110 transition-transform" />
                )}
                {isScanningMacro ? 'ESCANEANDO...' : 'ESCANEAR ENTORNO (MACRO)'}
              </button>
           </div>

           {/* TERMINAL OUTPUT */}
           <div className="flex-1 p-6 font-mono text-xs overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 text-stone-500 mb-4">
                 <Terminal size={14} />
                 <span>SYSTEM LOGS</span>
              </div>
              <div className="space-y-2 text-stone-400">
                 <div className="opacity-50">&gt; System initialized.</div>
                 <div className="opacity-50">&gt; Monitoring active.</div>
                 {logs.map((log, i) => (
                    <div key={i} className="text-purple-300 animate-slideInLeft">{log}</div>
                 ))}
                 {status === 'ANALYZING' && (
                    <div className="animate-pulse">_</div>
                 )}
              </div>
           </div>
        </div>

        {/* RIGHT: PROPOSALS */}
        <div className="flex-1 bg-stone-950 p-8 overflow-y-auto custom-scrollbar">
           
           {/* PERMISSION PROPOSAL CARD */}
           {permissionProposal && (
             <div className="mb-8 bg-blue-950/20 border border-blue-500/30 rounded-xl p-6 animate-slideInUp">
                <div className="flex items-center gap-3 mb-4">
                    <Globe className="text-blue-400" size={24} />
                    <div>
                        <h3 className="text-lg font-bold text-white">Alerta de Contexto: {macroEvent?.source}</h3>
                        <p className="text-xs text-blue-300">Detectado: {macroEvent?.title}</p>
                    </div>
                </div>
                
                <div className="bg-black/40 p-4 rounded-lg border border-blue-500/20 mb-4">
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                        <ShieldAlert size={16} className="text-amber-500" />
                        Propuesta de Evolución
                    </h4>
                    <p className="text-stone-300 text-sm mb-3">{permissionProposal.reasoning}</p>
                    <div className="flex items-center justify-between bg-stone-900 p-3 rounded border border-stone-800">
                        <span className="text-xs font-mono text-stone-500">Permiso Sugerido:</span>
                        <span className="text-sm font-bold text-white">{permissionProposal.proposedPermission.label}</span>
                    </div>
                </div>

                <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors">
                    APROBAR Y ACTIVAR PERMISO
                </button>
             </div>
           )}

           <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Server size={20} className="text-stone-500" />
              Propuestas de Mejora
              <span className="text-xs font-normal text-stone-500 ml-2 bg-stone-900 px-2 py-1 rounded-full">{proposals.length}</span>
           </h2>

           {proposals.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-stone-600 border-2 border-dashed border-stone-800 rounded-2xl">
                 <Activity size={48} className="mb-4 opacity-20" />
                 <p>No hay propuestas pendientes.</p>
                 <p className="text-sm">Ejecute un análisis para detectar mejoras.</p>
              </div>
           ) : (
              <div className="grid gap-4">
                 {proposals.map((prop) => (
                    <div key={prop.id} className={`bg-stone-900 border border-stone-800 rounded-xl p-6 transition-all ${prop.status === 'APPLIED' ? 'opacity-50 grayscale' : 'hover:border-purple-500/30'}`}>
                       <div className="flex justify-between items-start mb-4">
                          <div>
                             <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    prop.impact === 'HIGH' ? 'bg-red-900/30 text-red-400 border border-red-500/20' :
                                    prop.impact === 'MEDIUM' ? 'bg-amber-900/30 text-amber-400 border border-amber-500/20' :
                                    'bg-blue-900/30 text-blue-400 border border-blue-500/20'
                                }`}>
                                    Impacto {prop.impact}
                                </span>
                                <span className="text-[10px] font-mono text-stone-500 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                                    {prop.type}
                                </span>
                             </div>
                             <h3 className="text-lg font-bold text-white">{prop.title}</h3>
                          </div>
                          {prop.status === 'APPLIED' && (
                             <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                                <Check size={14} /> APLICADO
                             </div>
                          )}
                       </div>
                       
                       <p className="text-stone-400 text-sm mb-6 leading-relaxed">
                          {prop.description}
                       </p>

                       {prop.status === 'PENDING' && (
                           <div className="flex gap-3">
                              <button 
                                onClick={() => handleApply(prop.id)}
                                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                              >
                                <Check size={14} /> APLICAR MEJORA
                              </button>
                              <button 
                                onClick={() => handleDismiss(prop.id)}
                                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded-lg text-xs font-bold transition-colors"
                              >
                                DESCARTAR
                              </button>
                           </div>
                       )}
                    </div>
                 ))}
              </div>
           )}
        </div>

      </div>
    </div>
  );
};
