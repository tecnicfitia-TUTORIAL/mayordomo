

import React, { useState, useEffect, useRef } from 'react';
import { LifeStageConfig, MacroContextEvent, PermissionProposal, UserProfile, PermissionItem, SubscriptionTier } from '../types';
import { scanMacroContext, analyzeGapAndPropose } from '../services/evolutionService';
import { Globe, Database, Activity, Wifi, X, Shield, Zap, Star, Crown, Play, ChevronDown, Cpu, Fingerprint, ScanEye, Server, Radar, LifeBuoy } from 'lucide-react';
import { TECHNICAL_PERMISSIONS } from '../constants';

interface Props {
  profile: UserProfile;
  lifeStageConfig: LifeStageConfig;
  onAddPermission: (moduleId: string, permission: PermissionItem) => void;
  onClose: () => void;
  onSimulateTier: (tier: SubscriptionTier) => void;
  onOpenSupport?: () => void;
  isEmbedded?: boolean;
}

const DAILY_SCAN_KEY = 'lastEvolutionScan';

export const EvolutionPanel: React.FC<Props> = ({ profile, lifeStageConfig, onAddPermission, onClose, onSimulateTier, onOpenSupport, isEmbedded }) => {
  const [logs, setLogs] = useState<string[]>(["Inicializando núcleo...", "Cargando protocolos de vigilancia..."]);
  const [currentMacroEvent, setCurrentMacroEvent] = useState<MacroContextEvent | null>(null);
  const [activeProposal, setActiveProposal] = useState<PermissionProposal | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [showSimMenu, setShowSimMenu] = useState(false);
  
  // Simulación de métricas vivas
  const [memoryUsage, setMemoryUsage] = useState(24.5);
  const [cpuLoad, setCpuLoad] = useState(12);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Detectar si estamos en modo FULL ADMIN (tengo todos los permisos técnicos)
  // Defensive check for permissions array
  const isFullAdmin = (profile.grantedPermissions || []).length === TECHNICAL_PERMISSIONS.length;

  const addLog = (text: string) => {
    setLogs(prev => [...prev.slice(-10), `> ${text}`]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Efecto para simular "Vida" en los números mientras escanea
  useEffect(() => {
      if (!isScanning) return;
      
      const interval = setInterval(() => {
          // Fluctuación aleatoria más agresiva para simular cálculo en tiempo real
          setMemoryUsage(prev => {
              const noise = (Math.random() - 0.5) * 8; // +/- 4 MB fluctuation
              return Math.max(12, Math.min(64, prev + noise));
          });
          
          setCpuLoad(prev => {
              const noise = Math.floor((Math.random() - 0.5) * 20); // +/- 10% load fluctuation
              // Tendencia a subir si es bajo
              const trend = prev < 30 ? 2 : prev > 90 ? -2 : 0;
              return Math.max(5, Math.min(99, prev + noise + trend));
          });
      }, 150); // Actualización rápida (150ms)

      return () => clearInterval(interval);
  }, [isScanning]);

  // Robust Loop Handling with Daily Limit
  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const runEvolutionCycle = async () => {
      if (!isMounted || activeProposal || !isScanning) return;

      // Forzar escaneo visual al menos unos segundos para la demo
      addLog("Conectando con red neuronal global...");
      await new Promise(r => setTimeout(r, 1500));
      if (!isMounted) return;

      addLog("Escaneando Macro-Contexto (Internet)...");
      setCpuLoad(85); // Spike CPU during scan
      
      const event = await scanMacroContext();
      if (!isMounted) return;
      
      setCurrentMacroEvent(event);
      addLog(`EVENTO DETECTADO: [${event.source}]`);
      
      await new Promise(r => setTimeout(r, 2000));
      if (!isMounted) return;
      
      addLog("Analizando impacto en Pilares...");
      setMemoryUsage(58); // Spike RAM during analysis
      
      const proposal = await analyzeGapAndPropose(event, profile, lifeStageConfig.modules);
      if (!isMounted) return;

      if (proposal) {
        addLog("⚠️ OPORTUNIDAD DE MEJORA DETECTADA.");
        setActiveProposal(proposal);
        setIsScanning(false); 
      } else {
        addLog("Análisis: Cobertura Óptima. Sistema seguro.");
        setIsScanning(false);
      }
    };

    if (isScanning) {
        timeoutId = setTimeout(runEvolutionCycle, 1000);
    }

    return () => {
        isMounted = false;
        clearTimeout(timeoutId);
    };
  }, [isScanning, activeProposal, profile, lifeStageConfig]);

  const containerClasses = isEmbedded
    ? "relative w-full h-full bg-dark-950 rounded-sm border-double border-4 border-stone-800 shadow-inner flex flex-col overflow-hidden animate-fadeIn"
    : "fixed inset-0 z-[100] bg-black/95 flex flex-col overflow-hidden animate-fadeIn";

  const handleSimulateSelect = (tier: SubscriptionTier) => {
    onSimulateTier(tier);
    setShowSimMenu(false);
  };

  return (
    <div className={`${containerClasses} text-ai-500 font-serif`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-dark-900 shrink-0">
        <div className="flex items-center gap-3">
            <Activity className={`text-ai-500 ${isScanning ? 'animate-pulse' : ''}`} />
            <div>
                <h1 className="text-lg font-bold tracking-widest uppercase font-serif">ADMIN_CONSOLE // EVOLUTION_CORE</h1>
                <p className="text-[10px] text-ai-700 font-sans flex items-center gap-1">
                    Status: 
                    <span className="text-white font-bold">
                       {isFullAdmin ? 'ROOT ACCESS' : 'RESTRICTED'}
                    </span>
                </p>
            </div>
        </div>
        
        <div className="flex items-center gap-4 relative">
            
            {/* SUPPORT BUTTON - Navigate Forward */}
            {onOpenSupport && (
                <button 
                    onClick={onOpenSupport}
                    className="flex items-center gap-2 px-4 py-2 rounded-sm border bg-stone-900 border-stone-700 hover:border-blue-500 hover:bg-blue-900/10 text-stone-300 transition-colors group"
                    title="Abrir Dashboard de Soporte"
                >
                    <LifeBuoy size={16} className="group-hover:text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Soporte</span>
                </button>
            )}

            {/* SIMULATION DROPDOWN */}
            <div className="relative">
                <button 
                  onClick={() => setShowSimMenu(!showSimMenu)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-sm border transition-all ${showSimMenu ? 'bg-ai-500 text-black border-ai-500' : 'bg-stone-900 border-stone-700 hover:border-ai-500 text-stone-300'}`}
                >
                    <Play size={16} fill="currentColor" />
                    <span className="text-xs font-bold uppercase tracking-wider">Simulador</span>
                    <ChevronDown size={14} className={`transition-transform ${showSimMenu ? 'rotate-180' : ''}`} />
                </button>

                {showSimMenu && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-stone-900 border border-stone-700 rounded-sm shadow-2xl z-50 flex flex-col overflow-hidden animate-fadeIn">
                        <div className="bg-stone-950 p-2 text-[9px] font-bold text-stone-500 uppercase tracking-widest border-b border-stone-800">
                            Seleccione Entorno
                        </div>
                        {[
                            { id: SubscriptionTier.FREE, label: "Invitado (Free)", icon: Shield },
                            { id: SubscriptionTier.BASIC, label: "Asistente (Basic)", icon: Zap },
                            { id: SubscriptionTier.PRO, label: "Mayordomo (Pro)", icon: Star },
                            { id: SubscriptionTier.VIP, label: "Gobernante (VIP)", icon: Crown },
                        ].map(tier => (
                            <button
                                key={tier.id}
                                onClick={() => handleSimulateSelect(tier.id)}
                                className="flex items-center gap-3 p-3 hover:bg-ai-900/20 text-stone-300 hover:text-ai-500 transition-colors text-left border-b border-stone-800 last:border-0"
                            >
                                <tier.icon size={16} />
                                <span className="text-xs font-bold">{tier.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* CLOSE BUTTON - Navigate Backward */}
            {!isEmbedded && (
                <button 
                    onClick={onClose} 
                    className="p-2 hover:bg-red-900/20 hover:text-red-500 rounded-full transition-colors text-stone-500"
                    title="Cerrar Consola"
                >
                    <X size={20} />
                </button>
            )}
        </div>
      </div>

      {/* Main Grid - 2 Columns */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stone-800 relative overflow-hidden">
        
        {/* COL 1: VIGILANCIA ACTIVA (MICRO-CONTEXT) */}
        <div className="p-8 flex flex-col relative bg-dark-950 min-h-[400px] lg:min-h-auto overflow-hidden">
             
             {/* Background Tech Lines */}
             <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, #333 25%, #333 26%, transparent 27%, transparent 74%, #333 75%, #333 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #333 25%, #333 26%, transparent 27%, transparent 74%, #333 75%, #333 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}></div>

             <h2 className="text-xs font-bold text-ai-700 uppercase mb-6 tracking-[0.2em] font-sans flex items-center gap-2 relative z-10">
                 <ScanEye size={14} className={isScanning ? 'animate-spin-slow' : ''} /> Vigilancia Activa (Micro-Contexto)
             </h2>

             {/* Central Brain Visualization */}
             <div className="flex-1 flex flex-col items-center justify-center relative z-10 gap-8">
                 
                 <div className="relative group cursor-pointer">
                    {/* Scanner Rings */}
                    {isScanning && (
                        <>
                            <div className="absolute -inset-12 border border-ai-500/10 rounded-full animate-[spin_4s_linear_infinite]"></div>
                            <div className="absolute -inset-8 border-t border-r border-ai-500/30 rounded-full animate-[spin_2s_linear_infinite]"></div>
                            <div className="absolute -inset-4 bg-ai-500/10 rounded-full blur-xl animate-pulse"></div>
                        </>
                    )}
                    
                    <div className={`relative bg-stone-900 border p-6 rounded-full shadow-[0_0_30px_rgba(212,175,55,0.15)] transition-all duration-300 ${isScanning ? 'border-ai-500/50 scale-105 shadow-[0_0_50px_rgba(212,175,55,0.3)]' : 'border-stone-700'}`}>
                        <Cpu size={48} className={`transition-colors duration-300 ${isScanning ? 'text-ai-400' : 'text-stone-500'}`} />
                    </div>

                    {/* Satellites */}
                    <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-stone-900 border border-stone-700 p-2 rounded-full">
                        <Fingerprint size={16} className={`${isScanning ? 'text-ai-500 animate-pulse' : 'text-stone-400'}`} />
                    </div>
                    <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 bg-stone-900 border border-stone-700 p-2 rounded-full">
                        <Database size={16} className={`${isScanning ? 'text-ai-500 animate-pulse' : 'text-stone-400'}`} />
                    </div>
                 </div>

                 {/* Stats Grid */}
                 <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    <div className="bg-stone-900/50 border border-stone-800 p-3 rounded-sm">
                        <div className="text-[9px] text-stone-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Server size={10} /> Memoria de Contexto
                        </div>
                        <div className="text-lg font-mono text-ai-400">{memoryUsage.toFixed(1)} MB</div>
                        <div className="w-full bg-stone-800 h-1 mt-2 rounded-full overflow-hidden">
                            <div 
                                className="bg-ai-500 h-full transition-all duration-150"
                                style={{ width: `${(memoryUsage/64)*100}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="bg-stone-900/50 border border-stone-800 p-3 rounded-sm">
                         <div className="text-[9px] text-stone-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Activity size={10} /> Carga Cognitiva
                        </div>
                        <div className={`text-lg font-mono transition-colors duration-150 ${cpuLoad > 80 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {cpuLoad > 80 ? 'ALTA' : 'OPTIMAL'} ({cpuLoad}%)
                        </div>
                         <div className="w-full bg-stone-800 h-1 mt-2 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-150 ${cpuLoad > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${cpuLoad}%` }}
                            ></div>
                        </div>
                    </div>
                 </div>
             </div>

             {/* Footer Status */}
             <div className="mt-8 pt-4 border-t border-stone-800/50 flex justify-between items-center relative z-10">
                 <div className="flex flex-col">
                     <span className="text-[9px] text-stone-600 uppercase">Estado del Sistema</span>
                     <span className={`text-xs font-bold flex items-center gap-2 ${isScanning ? 'text-amber-500' : 'text-emerald-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></span>
                        {isScanning ? 'ESCANEANDO...' : 'PROTEGIDO'}
                     </span>
                 </div>
                 <div className="flex flex-col items-end">
                     <span className="text-[9px] text-stone-600 uppercase">Arquetipo</span>
                     <span className="text-xs font-bold text-ai-500">{profile.archetype}</span>
                 </div>
             </div>
        </div>

        {/* COL 2: MACRO-CONTEXT (INTERNET) */}
        <div className="p-6 flex flex-col bg-dark-900 relative overflow-hidden min-h-[300px] lg:min-h-auto">
            <h2 className="text-xs font-bold text-ai-700 uppercase mb-4 flex items-center gap-2 font-sans tracking-widest">
                <Globe size={14} /> Macro-Contexto (Global)
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
                        {isScanning ? (
                            <Radar size={48} className="mb-4 opacity-50 text-ai-500 animate-spin-slow" />
                        ) : (
                            <Activity size={48} className="mb-4 opacity-20" />
                        )}
                        <p className="text-[10px] font-sans uppercase tracking-widest animate-pulse">
                            {isScanning ? 'Interceptando Señales...' : 'Esperando ciclo...'}
                        </p>
                    </div>
                )}
             </div>
             
             {/* Logs Console */}
             <div className="mt-6 h-32 bg-black border border-stone-800 p-4 font-mono text-[10px] overflow-y-auto custom-scrollbar opacity-70 rounded-sm">
                {logs.map((log, i) => (
                    <div key={i} className="mb-1 text-stone-500 border-l-2 border-stone-800 pl-2">{log}</div>
                ))}
                <div ref={logsEndRef} />
             </div>
        </div>

      </div>
    </div>
  );
};
