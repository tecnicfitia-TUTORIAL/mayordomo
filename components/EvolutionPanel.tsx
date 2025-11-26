
import React, { useState, useEffect, useRef } from 'react';
import { LifeStageConfig, MacroContextEvent, PermissionProposal, UserProfile, PermissionItem } from '../types';
import { scanMacroContext, analyzeGapAndPropose } from '../services/evolutionService';
import { Globe, Database, Activity, Lock, Cpu, Wifi, X, Clock } from 'lucide-react';

interface Props {
  profile: UserProfile;
  lifeStageConfig: LifeStageConfig;
  onAddPermission: (moduleId: string, permission: PermissionItem) => void;
  onClose: () => void;
  isEmbedded?: boolean;
}

const DAILY_SCAN_KEY = 'lastEvolutionScan';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const EvolutionPanel: React.FC<Props> = ({ profile, lifeStageConfig, onAddPermission, onClose, isEmbedded }) => {
  const [logs, setLogs] = useState<string[]>(["Iniciando Protocolo de Evolución...", "Verificando última sincronización..."]);
  const [currentMacroEvent, setCurrentMacroEvent] = useState<MacroContextEvent | null>(null);
  const [activeProposal, setActiveProposal] = useState<PermissionProposal | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isWaitingForNextDay, setIsWaitingForNextDay] = useState(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (text: string) => {
    setLogs(prev => [...prev.slice(-10), `> ${text}`]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Robust Loop Handling with Daily Limit
  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const runEvolutionCycle = async () => {
      if (!isMounted || activeProposal || !isScanning) return;

      // Check last run time
      const lastRunStr = localStorage.getItem(DAILY_SCAN_KEY);
      const lastRun = lastRunStr ? parseInt(lastRunStr, 10) : 0;
      const now = Date.now();

      if (now - lastRun < ONE_DAY_MS) {
          const timeLeft = Math.ceil(((lastRun + ONE_DAY_MS) - now) / (1000 * 60 * 60));
          addLog(`Escaneo diario ya completado.`);
          addLog(`Sistema en modo pasivo. Próximo escaneo en: ~${timeLeft}h.`);
          setIsScanning(false);
          setIsWaitingForNextDay(true);
          return;
      }

      addLog("Escaneando Macro-Contexto (Internet)...");
      
      // 1. Scan
      const event = await scanMacroContext();
      if (!isMounted) return;
      
      setCurrentMacroEvent(event);
      addLog(`EVENTO: ${event.source} detectado.`);
      
      // 2. Analyze (Visual delay)
      await new Promise(r => setTimeout(r, 2000));
      if (!isMounted) return;
      
      addLog("Comparando con Micro-Contexto (User DNA)...");
      
      // 3. Gemini Logic
      const proposal = await analyzeGapAndPropose(event, profile, lifeStageConfig.modules);
      if (!isMounted) return;

      // Save execution time
      localStorage.setItem(DAILY_SCAN_KEY, Date.now().toString());

      if (proposal) {
        addLog("⚠️ BRECHA DE SEGURIDAD/OPORTUNIDAD DETECTADA.");
        addLog("Generando Protocolo de Evolución...");
        setActiveProposal(proposal);
        setIsScanning(false); 
      } else {
        addLog("Análisis: Cobertura Óptima. Sistema seguro.");
        addLog("Cerrando ciclo diario...");
        await new Promise(r => setTimeout(r, 3000));
        if (!isMounted) return;
        
        setCurrentMacroEvent(null);
        setIsScanning(false);
        setIsWaitingForNextDay(true);
      }
    };

    if (isScanning) {
        // Initial delay to prevent conflict with Dashboard loading
        timeoutId = setTimeout(runEvolutionCycle, 3000);
    }

    return () => {
        isMounted = false;
        clearTimeout(timeoutId);
    };
  }, [isScanning, activeProposal, profile, lifeStageConfig]);

  const handleAccept = () => {
    if (activeProposal) {
      onAddPermission(activeProposal.targetModuleId, { ...activeProposal.proposedPermission, defaultEnabled: true });
      addLog(`Permiso [${activeProposal.proposedPermission.id}] instalado exitosamente.`);
      addLog("Sistema actualizado. Ciclo finalizado.");
      setActiveProposal(null);
      setCurrentMacroEvent(null);
      setIsScanning(false);
      setIsWaitingForNextDay(true);
    }
  };

  const handleIgnore = () => {
    addLog("Propuesta rechazada por usuario.");
    addLog("Ciclo finalizado.");
    setActiveProposal(null);
    setCurrentMacroEvent(null);
    setIsScanning(false);
    setIsWaitingForNextDay(true);
  };

  const handleForceScan = () => {
      localStorage.removeItem(DAILY_SCAN_KEY);
      setIsWaitingForNextDay(false);
      setIsScanning(true);
      addLog("Forzando nuevo ciclo de escaneo manual...");
  };

  const containerClasses = isEmbedded
    ? "relative w-full h-full bg-dark-950 rounded-sm border-double border-4 border-stone-800 shadow-inner flex flex-col overflow-hidden animate-fadeIn"
    : "fixed inset-0 z-[100] bg-black/95 flex flex-col overflow-hidden animate-fadeIn";

  return (
    <div className={`${containerClasses} text-ai-500 font-serif`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-dark-900 shrink-0">
        <div className="flex items-center gap-3">
            <Activity className={`text-ai-500 ${isScanning ? 'animate-pulse' : ''}`} />
            <div>
                <h1 className="text-lg font-bold tracking-widest uppercase font-serif">ADMIN_CONSOLE // EVOLUTION_CORE</h1>
                <p className="text-[10px] text-ai-700 font-sans">Root Access: {profile.name} // {profile.subscriptionTier}</p>
            </div>
        </div>
        {!isEmbedded && (
            <button onClick={onClose} className="p-2 hover:bg-ai-900/20 rounded-full transition-colors">
                <X />
            </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-stone-800 relative overflow-hidden">
        
        {/* COL 1: MICRO-CONTEXT (USER DNA) */}
        <div className="p-6 flex flex-col bg-dark-900 relative overflow-hidden min-h-[300px] lg:min-h-auto">
             <h2 className="text-xs font-bold text-ai-700 uppercase mb-4 flex items-center gap-2 font-sans tracking-widest">
                <Lock size={14} /> Micro-Contexto (Interno)
             </h2>
             
             <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                {lifeStageConfig.modules.map(mod => (
                    <div key={mod.id} className="border border-stone-800 p-4 rounded-sm bg-stone-900/30">
                        <h3 className="text-xs font-bold text-stone-400 mb-3 uppercase tracking-wide">{mod.title}</h3>
                        <div className="space-y-2">
                            {mod.permissions.filter(p => p.defaultEnabled).map(p => (
                                <div key={p.id} className="flex items-center gap-2 text-[11px] text-ai-600 font-sans">
                                    <div className="w-1.5 h-1.5 bg-ai-600 rounded-full" />
                                    {p.label}
                                </div>
                            ))}
                            {mod.permissions.filter(p => !p.defaultEnabled).length > 0 && (
                                <div className="text-[10px] text-stone-700 italic mt-2 pl-3 border-l border-stone-800">
                                    + {mod.permissions.filter(p => !p.defaultEnabled).length} inactivos
                                </div>
                            )}
                        </div>
                    </div>
                ))}
             </div>
             
             <div className="mt-4 pt-4 border-t border-stone-800">
                <div className="flex justify-between text-xs font-sans">
                    <span className="text-stone-600">Permisos Activos:</span>
                    <span className="font-bold text-ai-500">{lifeStageConfig.modules.flatMap(m => m.permissions).filter(p => p.defaultEnabled).length}</span>
                </div>
             </div>
        </div>

        {/* COL 2: LOGIC CORE (THE BRAIN) */}
        <div className="p-6 flex flex-col relative bg-dark-950 min-h-[400px] lg:min-h-auto">
             
             {/* Central Visualization */}
             <div className="flex-1 flex items-center justify-center flex-col relative">
                
                {/* The Core Icon */}
                <div className={`w-32 h-32 rounded-full border border-double border-4 flex items-center justify-center relative mb-8 transition-all duration-500 ${activeProposal ? 'border-ai-500 shadow-2xl shadow-ai-900/20' : 'border-stone-800'}`}>
                    <Cpu size={48} className={`${activeProposal ? 'text-ai-400' : isWaitingForNextDay ? 'text-stone-800' : 'text-stone-700'}`} />
                    {isWaitingForNextDay && <Clock size={24} className="absolute text-stone-600" />}
                </div>

                {/* Active Proposal Card */}
                {activeProposal ? (
                    <div className="w-full bg-stone-900 border border-ai-500/50 p-6 rounded-sm animate-scaleIn shadow-xl">
                        <div className="flex items-center justify-between mb-4 border-b border-ai-900/30 pb-2">
                            <h3 className="text-sm font-bold text-ai-400 uppercase tracking-widest">Propuesta de Evolución</h3>
                            <span className="text-[9px] border border-ai-500 text-ai-500 px-2 py-1 rounded-sm font-sans font-bold">PENDIENTE</span>
                        </div>
                        <div className="mb-6">
                            <h4 className="text-xl font-serif text-stone-200 mb-2">{activeProposal.title}</h4>
                            <p className="text-xs text-stone-400 leading-relaxed italic font-serif">"{activeProposal.reasoning}"</p>
                        </div>
                        
                        <div className="bg-black p-4 rounded-sm border border-stone-700 mb-6 flex items-center justify-between">
                             <span className="text-xs text-ai-500 font-bold uppercase">{activeProposal.proposedPermission.label}</span>
                             <div className="w-8 h-4 bg-stone-800 rounded-full border border-stone-600 relative">
                                <div className="w-3 h-3 bg-ai-500 rounded-full absolute top-0.5 right-0.5"></div>
                             </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={handleIgnore} className="flex-1 py-3 border border-stone-700 text-stone-500 text-xs hover:bg-stone-800 transition-colors uppercase tracking-widest font-bold">
                                Ignorar
                            </button>
                            <button onClick={handleAccept} className="flex-1 py-3 bg-ai-700 text-stone-100 font-bold text-xs hover:bg-ai-600 transition-colors uppercase tracking-widest border border-ai-600">
                                Autorizar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-xs text-stone-600 uppercase tracking-widest animate-pulse mb-4 font-sans">
                            {isScanning ? "Analizando Brechas..." : isWaitingForNextDay ? "Vigilancia Activa. Próximo scan en 24h." : "Esperando Input..."}
                        </p>
                        {isWaitingForNextDay && (
                            <button 
                                onClick={handleForceScan}
                                className="text-[10px] text-ai-600 border border-stone-800 hover:bg-stone-900 px-4 py-2 rounded-sm transition-colors uppercase tracking-widest"
                            >
                                Forzar Escaneo Manual
                            </button>
                        )}
                    </div>
                )}
             </div>

             {/* Logs Console */}
             <div className="h-32 bg-black border border-stone-800 p-4 font-mono text-[10px] overflow-y-auto custom-scrollbar opacity-70 rounded-sm">
                {logs.map((log, i) => (
                    <div key={i} className="mb-1 text-stone-500 border-l-2 border-stone-800 pl-2">{log}</div>
                ))}
                <div ref={logsEndRef} />
             </div>
        </div>

        {/* COL 3: MACRO-CONTEXT (INTERNET) */}
        <div className="p-6 flex flex-col bg-dark-900 relative overflow-hidden min-h-[300px] lg:min-h-auto">
            <h2 className="text-xs font-bold text-ai-700 uppercase mb-4 flex items-center gap-2 font-sans tracking-widest">
                <Globe size={14} /> Macro-Contexto (Externo)
             </h2>

             <div className="flex-1 flex flex-col justify-center">
                {currentMacroEvent ? (
                    <div className="border border-stone-700 p-5 rounded-sm bg-stone-900 relative overflow-hidden animate-slideInRight shadow-lg">
                        <div className="absolute top-0 right-0 p-3 opacity-20">
                            <Wifi size={24} className="text-stone-400" />
                        </div>
                        <span className="text-[9px] font-bold bg-stone-800 px-2 py-1 rounded-sm text-stone-400 mb-3 inline-block uppercase tracking-wide">
                            {currentMacroEvent.source}
                        </span>
                        <h3 className="text-sm font-bold text-stone-200 mb-2 font-serif">{currentMacroEvent.title}</h3>
                        <p className="text-xs text-stone-500 italic font-serif">"{currentMacroEvent.description}"</p>
                        
                        <div className="mt-4 flex items-center gap-3">
                             <div className={`h-1 flex-1 bg-stone-800 overflow-hidden`}>
                                <div className={`h-full ${currentMacroEvent.riskLevel === 'CRITICAL' ? 'bg-user-600 w-[95%]' : currentMacroEvent.riskLevel === 'HIGH' ? 'bg-user-400 w-[75%]' : 'bg-ai-600 w-[40%]'}`}></div>
                             </div>
                             <span className="text-[9px] uppercase font-bold text-stone-500">Riesgo {currentMacroEvent.riskLevel}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-stone-800">
                        <Database size={48} className="mb-4 opacity-20" />
                        <p className="text-[10px] font-sans uppercase tracking-widest">Escaneando Nodos Globales...</p>
                    </div>
                )}
             </div>
             
             <div className="mt-4 pt-4 border-t border-stone-800 text-[9px] text-stone-600 text-center uppercase tracking-widest font-sans">
                Conectado a Gemini 2.5 Flash • Latencia: 45ms
             </div>
        </div>

      </div>
    </div>
  );
};
