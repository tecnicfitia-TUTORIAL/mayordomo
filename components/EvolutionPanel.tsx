
import React, { useState, useEffect, useRef } from 'react';
import { LifeStageConfig, MacroContextEvent, PermissionProposal, UserProfile, PermissionItem } from '../types';
import { scanMacroContext, analyzeGapAndPropose } from '../services/evolutionService';
import { Globe, Database, Activity, Lock, Cpu, Wifi, X, Clock } from 'lucide-react';

interface Props {
  profile: UserProfile;
  lifeStageConfig: LifeStageConfig;
  onAddPermission: (moduleId: string, permission: PermissionItem) => void;
  onClose: () => void;
}

const DAILY_SCAN_KEY = 'lastEvolutionScan';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const EvolutionPanel: React.FC<Props> = ({ profile, lifeStageConfig, onAddPermission, onClose }) => {
  const [logs, setLogs] = useState<string[]>(["Iniciando Motor de Evolución...", "Verificando última sincronización..."]);
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

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 text-green-500 font-mono flex flex-col overflow-hidden animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-green-900/50 bg-black">
        <div className="flex items-center gap-3">
            <Activity className={`text-green-500 ${isScanning ? 'animate-pulse' : ''}`} />
            <div>
                <h1 className="text-lg font-bold tracking-widest uppercase">SYSTEM_ADMIN_CONSOLE // EVOLUTION_CORE</h1>
                <p className="text-[10px] text-green-700">Root Access: {profile.name} // {profile.subscriptionTier}</p>
            </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-green-900/20 rounded-full transition-colors">
            <X />
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-green-900/30 relative">
        
        {/* COL 1: MICRO-CONTEXT (USER DNA) */}
        <div className="p-6 flex flex-col bg-black/50 relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
             <h2 className="text-xs font-bold text-green-700 uppercase mb-4 flex items-center gap-2">
                <Lock size={14} /> Micro-Contexto (Yo Observado)
             </h2>
             
             <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                {lifeStageConfig.modules.map(mod => (
                    <div key={mod.id} className="border border-green-900/30 p-3 rounded bg-green-900/5">
                        <h3 className="text-xs font-bold text-green-400 mb-2">{mod.title}</h3>
                        <div className="space-y-1">
                            {mod.permissions.filter(p => p.defaultEnabled).map(p => (
                                <div key={p.id} className="flex items-center gap-2 text-[10px] text-green-600">
                                    <div className="w-1 h-1 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                                    {p.label}
                                </div>
                            ))}
                            {mod.permissions.filter(p => !p.defaultEnabled).length > 0 && (
                                <div className="text-[10px] text-green-800 italic mt-1">
                                    + {mod.permissions.filter(p => !p.defaultEnabled).length} inactivos
                                </div>
                            )}
                        </div>
                    </div>
                ))}
             </div>
             
             <div className="mt-4 pt-4 border-t border-green-900/30">
                <div className="flex justify-between text-xs">
                    <span className="text-green-700">Permisos Activos:</span>
                    <span className="font-bold">{lifeStageConfig.modules.flatMap(m => m.permissions).filter(p => p.defaultEnabled).length}</span>
                </div>
             </div>
        </div>

        {/* COL 2: LOGIC CORE (THE BRAIN) */}
        <div className="p-6 flex flex-col relative bg-black">
             <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50 ${isScanning ? 'animate-scanline' : ''}`}></div>
             
             {/* Central Visualization */}
             <div className="flex-1 flex items-center justify-center flex-col relative">
                
                {/* Connecting Lines */}
                <div className="absolute top-1/2 left-0 w-1/4 h-px bg-gradient-to-r from-green-900 to-green-500 opacity-30"></div>
                <div className="absolute top-1/2 right-0 w-1/4 h-px bg-gradient-to-l from-green-900 to-green-500 opacity-30"></div>

                {/* The Core Icon */}
                <div className={`w-32 h-32 rounded-full border border-green-500/30 flex items-center justify-center relative mb-8 transition-all duration-500 ${activeProposal ? 'shadow-[0_0_50px_rgba(34,197,94,0.3)] border-green-500' : ''}`}>
                    <div className={`absolute inset-0 rounded-full border border-green-500/20 animate-ping opacity-20 ${!isScanning && !activeProposal ? 'hidden' : ''}`}></div>
                    <Cpu size={48} className={`${activeProposal ? 'text-green-400' : isWaitingForNextDay ? 'text-green-900' : 'text-green-800'}`} />
                    {isWaitingForNextDay && <Clock size={24} className="absolute text-green-500/50" />}
                </div>

                {/* Active Proposal Card */}
                {activeProposal ? (
                    <div className="w-full bg-green-900/10 border border-green-500/50 p-5 rounded-lg animate-scaleIn backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-green-400 uppercase">Propuesta de Evolución</h3>
                            <span className="text-[10px] bg-green-500/20 px-2 py-1 rounded text-green-300 animate-pulse">PENDIENTE</span>
                        </div>
                        <div className="mb-4">
                            <h4 className="text-lg font-serif text-white mb-1">{activeProposal.title}</h4>
                            <p className="text-xs text-green-300/80 leading-relaxed">{activeProposal.reasoning}</p>
                        </div>
                        
                        <div className="bg-black p-3 rounded border border-green-500/30 mb-4 flex items-center justify-between">
                             <span className="text-xs text-green-500">{activeProposal.proposedPermission.label}</span>
                             <div className="w-8 h-4 bg-green-900/50 rounded-full border border-green-700 relative">
                                <div className="w-3 h-3 bg-green-500 rounded-full absolute top-0.5 right-0.5 shadow-[0_0_10px_rgba(34,197,94,1)]"></div>
                             </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={handleIgnore} className="flex-1 py-2 border border-green-800 text-green-700 text-xs hover:bg-green-900/20 transition-colors">
                                IGNORAR
                            </button>
                            <button onClick={handleAccept} className="flex-1 py-2 bg-green-600 text-black font-bold text-xs hover:bg-green-500 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                                ACTIVAR PERMISO
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-xs text-green-700 uppercase tracking-widest animate-pulse mb-4">
                            {isScanning ? "Analizando Brechas..." : isWaitingForNextDay ? "Vigilancia Activa. Próximo scan en 24h." : "Esperando Input..."}
                        </p>
                        {isWaitingForNextDay && (
                            <button 
                                onClick={handleForceScan}
                                className="text-[10px] text-green-500 border border-green-900 hover:bg-green-900/30 px-3 py-1 rounded transition-colors"
                            >
                                Forzar Escaneo Manual
                            </button>
                        )}
                    </div>
                )}
             </div>

             {/* Logs Console */}
             <div className="h-32 bg-black border border-green-900/50 p-3 font-mono text-[10px] overflow-y-auto custom-scrollbar opacity-70">
                {logs.map((log, i) => (
                    <div key={i} className="mb-1 text-green-500/80">{log}</div>
                ))}
                <div ref={logsEndRef} />
             </div>
        </div>

        {/* COL 3: MACRO-CONTEXT (INTERNET) */}
        <div className="p-6 flex flex-col bg-black/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/10 via-black to-black opacity-50 pointer-events-none"></div>
            <h2 className="text-xs font-bold text-green-700 uppercase mb-4 flex items-center gap-2">
                <Globe size={14} /> Macro-Contexto (Yo Referencial)
             </h2>

             <div className="flex-1 flex flex-col justify-center">
                {currentMacroEvent ? (
                    <div className="border border-green-500/30 p-4 rounded-lg bg-green-900/10 relative overflow-hidden animate-slideInRight">
                        <div className="absolute top-0 right-0 p-2">
                            <Wifi size={16} className="text-green-600 animate-pulse" />
                        </div>
                        <span className="text-[10px] font-bold bg-green-900/50 px-1.5 py-0.5 rounded text-green-400 mb-2 inline-block">
                            {currentMacroEvent.source}
                        </span>
                        <h3 className="text-sm font-bold text-green-100 mb-2">{currentMacroEvent.title}</h3>
                        <p className="text-xs text-green-500/70">{currentMacroEvent.description}</p>
                        
                        <div className="mt-3 flex items-center gap-2">
                             <div className={`h-1.5 flex-1 rounded-full bg-green-900/50 overflow-hidden`}>
                                <div className={`h-full ${currentMacroEvent.riskLevel === 'CRITICAL' ? 'bg-red-500 w-[95%]' : currentMacroEvent.riskLevel === 'HIGH' ? 'bg-orange-500 w-[75%]' : 'bg-green-500 w-[40%]'}`}></div>
                             </div>
                             <span className="text-[9px] uppercase font-bold text-green-600">Riesgo {currentMacroEvent.riskLevel}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-green-900">
                        <Database size={32} className="mb-2 opacity-20" />
                        <p className="text-[10px]">Escaneando Nodos Globales...</p>
                    </div>
                )}
             </div>
             
             <div className="mt-4 pt-4 border-t border-green-900/30 text-[10px] text-green-800 text-center">
                Conectado a Gemini 2.5 Flash • Latencia: 45ms
             </div>
        </div>

      </div>
    </div>
  );
};
