import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, X, Smartphone, Star } from 'lucide-react';

export const InstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if standalone (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // Check UA for iOS
    const ua = window.navigator.userAgent;
    const isIosDevice = /iphone|ipad|ipod/.test(ua.toLowerCase());
    setIsIOS(isIosDevice);

    // Force show banner after delay on mobile web to mimic "System Alert"
    // Only show if we haven't dismissed it this session
    if (!sessionStorage.getItem('install_dismissed')) {
        const timer = setTimeout(() => setIsVisible(true), 3000);
        return () => clearTimeout(timer);
    }

    // Capture Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
      setIsVisible(false);
      sessionStorage.setItem('install_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[80] animate-slideInUp">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-ai-500/30 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 relative overflow-hidden ring-1 ring-white/10">
         {/* Background Glow */}
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ai-500 via-emerald-500 to-ai-500 opacity-50"></div>
         
         <button 
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 p-2"
         >
            <X size={16} />
         </button>

         <div className="flex items-start gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shrink-0">
                <ShieldCheck className="text-emerald-500" size={24} />
            </div>
            <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-1">
                    Confort OS
                    <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-500/20">Oficial</span>
                </h3>
                
                {/* Social Proof Line - Mimics Play Store */}
                <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 mb-1">
                    <div className="flex items-center gap-0.5 text-amber-400">
                        <span className="font-bold text-slate-200">4.9</span> <Star size={8} fill="currentColor" />
                    </div>
                    <span className="w-0.5 h-3 bg-slate-700"></span>
                    <span>1M+ Descargas</span>
                    <span className="w-0.5 h-3 bg-slate-700"></span>
                    <span>Productividad</span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                    Instala la versión certificada para habilitar la encriptación de núcleo y el modo offline.
                </p>
            </div>
         </div>

         {isIOS ? (
             <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-300 border border-slate-700 flex items-start gap-2">
                <Smartphone size={16} className="shrink-0 mt-0.5" />
                <span>Para instalar: Pulsa <span className="font-bold text-white">Compartir</span> y selecciona <span className="font-bold text-white">"Añadir a Inicio"</span>.</span>
             </div>
         ) : (
             <button 
                onClick={handleInstall}
                className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/5 active:scale-95 transform duration-100"
             >
                <Download size={18} /> Instalar Certificado
             </button>
         )}
      </div>
    </div>
  );
};