
import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Zap, Check, X, Terminal, Clock, Sparkles, Server, Globe, ShieldAlert, ArrowRight } from 'lucide-react';
import { EvolutionService, SystemImprovementProposal, scanMacroContext, analyzeGapAndPropose } from '../services/evolutionService';
import { AnalyticsService } from '../services/analyticsService';
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

  // Track View on Mount
  useEffect(() => {
    AnalyticsService.track('VIEW', 'Evolution_Panel_Opened');
  }, []);

  // Simulate TFLOPS fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setTflops(prev => +(Math.random() * (15.5 - 14.8) + 14.8).toFixed(2));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const runAnalysis = async () => {
    AnalyticsService.track('CLICK', 'Run_System_Analysis_Button');
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
    AnalyticsService.track('CLICK', 'Run_Macro_Scan_Button');
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
        
        {/* LEFT: SYSTEM CORE (MICRO) */}
        <div className="w-full md:w-1/2 border-r border-stone-800 flex flex-col bg-black/40">
           
           <div className="p-6 border-b border-stone-800">
              <div className="flex items-center gap-2 mb-4">
                 <Activity className="text-purple-500" size={20} />
                 <h2 className="text-lg font-bold text-white">System Core (Micro)</h2>
              </div>

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
           </div>

           {/* SYSTEM PROPOSALS LIST */}
           <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-stone-950/30">
               <h3 className="text-xs font-bold text-stone-500 uppercase mb-4 flex items-center gap-2">
                  <Server size={12} /> Mejoras de Sistema
               </h3>
               
               {proposals.length === 0 ? (
                  <div className="text-center py-8 text-stone-600 text-sm border border-dashed border-stone-800 rounded-lg">
                     Sin propuestas pendientes.
                  </div>
               ) : (
                  <div className="space-y-3">
                     {proposals.map((prop) => (
                        <div key={prop.id} className={`bg-stone-900 border border-stone-800 rounded-lg p-4 transition-all ${prop.status === 'APPLIED' ? 'opacity-50 grayscale' : 'hover:border-purple-500/30'}`}>
                           <div className="flex justify-between items-start mb-2">
                              <h4 className="text-sm font-bold text-white">{prop.title}</h4>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    prop.impact === 'HIGH' ? 'bg-red-900/30 text-red-400' :
                                    prop.impact === 'MEDIUM' ? 'bg-amber-900/30 text-amber-400' :
                                    'bg-blue-900/30 text-blue-400'
                                }`}>{prop.impact}</span>
                           </div>
                           <p className="text-xs text-stone-400 mb-3">{prop.description}</p>
                           {prop.status === 'PENDING' && (
                               <div className="flex gap-2">
                                  <button onClick={() => handleApply(prop.id)} className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold">APLICAR</button>
                                  <button onClick={() => handleDismiss(prop.id)} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded text-[10px] font-bold">X</button>
                               </div>
                           )}
                        </div>
                     ))}
                  </div>
               )}
           </div>
        </div>

        {/* RIGHT: EVOLUTION CORE (MACRO) */}
        <div className="w-full md:w-1/2 flex flex-col bg-stone-950">
           
           <div className="p-6 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2 mb-4">
                 <Globe className="text-blue-500" size={20} />
                 <h2 className="text-lg font-bold text-white">Evolution Core (Macro)</h2>
              </div>

              <div className="bg-blue-950/10 rounded-xl p-4 border border-blue-900/30 mb-6">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-400 uppercase">Estado de Vigilancia</span>
                    <ShieldAlert size={14} className="text-blue-500" />
                 </div>
                 <div className="text-sm text-stone-300">Monitoreando 15 fuentes globales...</div>
              </div>

              <button 
                onClick={runPermissionScan}
                disabled={isScanningMacro}
                className="w-full py-4 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-500/50 text-blue-300 font-bold rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isScanningMacro ? (
                    <Globe className="animate-spin" />
                ) : (
                    <ShieldAlert className="group-hover:scale-110 transition-transform" />
                )}
                {isScanningMacro ? 'ESCANEANDO...' : 'ESCANEAR ENTORNO (MACRO)'}
              </button>
           </div>

           {/* MACRO RESULTS & LOGS */}
           <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
               
               {/* PERMISSION PROPOSAL CARD */}
               {permissionProposal && (
                 <div className="mb-6 bg-blue-950/20 border border-blue-500/30 rounded-xl p-6 animate-slideInUp">
                    <div className="flex items-center gap-3 mb-4">
                        <Globe className="text-blue-400" size={24} />
                        <div>
                            <h3 className="text-sm font-bold text-white">Alerta: {macroEvent?.source}</h3>
                            <p className="text-[10px] text-blue-300">{macroEvent?.title}</p>
                        </div>
                    </div>
                    
                    <div className="bg-black/40 p-4 rounded-lg border border-blue-500/20 mb-4">
                        <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                            <ShieldAlert size={14} className="text-amber-500" />
                            Propuesta de Evolución
                        </h4>
                        <p className="text-stone-300 text-xs mb-3 leading-relaxed">{permissionProposal.reasoning}</p>
                        <div className="flex items-center justify-between bg-stone-900 p-2 rounded border border-stone-800">
                            <span className="text-[10px] font-mono text-stone-500">Permiso Sugerido:</span>
                            <span className="text-xs font-bold text-white">{permissionProposal?.proposedPermission?.label || 'N/A'}</span>
                        </div>
                    </div>

                    <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors">
                        APROBAR Y ACTIVAR PERMISO
                    </button>
                 </div>
               )}

               {/* SHARED TERMINAL LOGS */}
               <div className="font-mono text-xs">
                  <div className="flex items-center gap-2 text-stone-500 mb-4">
                     <Terminal size={14} />
                     <span>LIVE LOGS</span>
                  </div>
                  <div className="space-y-2 text-stone-400">
                     <div className="opacity-50">&gt; System initialized.</div>
                     {logs.map((log, i) => (
                        <div key={i} className="text-stone-300 animate-slideInLeft break-words">{log}</div>
                     ))}
                     {(status === 'ANALYZING' || isScanningMacro) && (
                        <div className="animate-pulse">_</div>
                     )}
                  </div>
               </div>

           </div>
        </div>

      </div>
    </div>
  );
};
