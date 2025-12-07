
import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Shield, Zap, Brain, Layout } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const HelpModal: React.FC<Props> = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const tutorials = [
    {
      title: "Filosofía 65/35",
      icon: <Brain className="text-ai-400" size={48} />,
      content: (
        <div className="space-y-4">
          <p>Bienvenido a un nuevo paradigma de gestión vital.</p>
          <p>
            <strong className="text-white">El 65% Operativo:</strong> Tareas repetitivas, logística, burocracia, recordatorios y mantenimiento. <span className="text-ai-400">Delega esto a la IA.</span>
          </p>
          <p>
            <strong className="text-white">El 35% Vital:</strong> Tu creatividad, descanso, relaciones profundas y decisiones estratégicas. <span className="text-user-400">Esto es tuyo.</span>
          </p>
        </div>
      )
    },
    {
      title: "Configuración Inicial",
      icon: <Layout className="text-blue-400" size={48} />,
      content: (
        <div className="space-y-4 text-sm">
          <p><strong className="text-white">Para que la aplicación funcione al 100%:</strong></p>
          <ol className="list-decimal pl-5 space-y-2 text-stone-300">
            <li><strong className="text-white">Conecta tu Banco:</strong> Ve a "Hogar y Finanzas" → Conecta con Plaid para ver tus saldos y transacciones.</li>
            <li><strong className="text-white">Conecta Gmail:</strong> Ve a "Hogar y Finanzas" → Conecta Gmail para escanear facturas automáticamente.</li>
            <li><strong className="text-white">Sube Certificado Digital:</strong> Ve a "El Centinela" → Configuración → Certificado Digital. Necesario para consultar DEHú, AEAT y DGT.</li>
            <li><strong className="text-white">Activa Permisos:</strong> Ve a Configuración → Permisos y activa los que necesites (Banca, Email, Certificado).</li>
          </ol>
          <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/20 mt-4">
            <p className="text-xs text-blue-300">
              💡 <strong>Tip:</strong> Los permisos críticos (Banca, Certificado) requieren verificación MFA para activarlos.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Niveles de Autonomía",
      icon: <Shield className="text-purple-400" size={48} />,
      content: (
        <div className="space-y-3 text-sm">
          <p>Tu suscripción define cuánto control cedes:</p>
          <ul className="space-y-2 border-l-2 border-slate-700 pl-4">
            <li><strong className="text-slate-400">Reactivo (Gratis):</strong> La IA solo avisa. Tú decides todo.</li>
            <li><strong className="text-white">Supervisor:</strong> La IA sugiere acciones, tú apruebas con un click.</li>
            <li><strong className="text-purple-400">Estratega/Delegado:</strong> La IA ejecuta acciones complejas (agendar, redactar, comprar) automáticamente bajo tus reglas.</li>
          </ul>
        </div>
      )
    },
    {
      title: "Permisos y Seguridad",
      icon: <Shield className="text-green-400" size={48} />,
      content: (
        <div className="space-y-4">
          <p>
            El sistema funciona mediante <strong>Módulos de Permisos</strong>.
          </p>
          <p>
            Puedes encender o apagar el acceso a tu banco, correo, certificado digital o ubicación en cualquier momento desde Configuración → Permisos.
          </p>
          <div className="space-y-2 text-sm">
            <p><strong className="text-white">Permisos Críticos (requieren MFA):</strong></p>
            <ul className="list-disc pl-5 text-stone-300 space-y-1">
              <li>Certificado Digital</li>
              <li>Conexión DEHú</li>
              <li>Banca (PSD2)</li>
              <li>Datos de Salud</li>
            </ul>
          </div>
          <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/20">
            <p className="text-xs text-red-300">
              ⚠️ Nota: Si bajas de nivel de suscripción, los permisos avanzados se desactivarán automáticamente por seguridad.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Panel de Control",
      icon: <Zap className="text-amber-400" size={48} />,
      content: (
        <div className="space-y-4">
          <p>
            Usa el chat para hablar con tu asistente. No necesitas comandos robóticos, háblale natural.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-400">
            <li>"Optimiza mi agenda de mañana"</li>
            <li>"¿Tengo algún pago pendiente?"</li>
            <li>"Analiza este PDF adjunto"</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[400px]">
        
        {/* Sidebar / Visual */}
        <div className="w-full md:w-1/3 bg-slate-950 p-8 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-800 relative overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
           <div className="relative z-10 mb-6 p-4 bg-slate-900 rounded-full border border-slate-800 shadow-xl">
              {tutorials[step].icon}
           </div>
           <h2 className="relative z-10 text-xl font-bold text-white">{tutorials[step].title}</h2>
           <div className="flex gap-1 mt-8">
              {tutorials.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-ai-500' : 'w-2 bg-slate-800'}`} />
              ))}
           </div>
        </div>

        {/* Content */}
        <div className="w-full md:w-2/3 p-8 flex flex-col justify-between">
          <div className="text-slate-300 leading-relaxed">
            {tutorials[step].content}
          </div>

          <div className="flex justify-between items-center mt-8 pt-8 border-t border-slate-800">
             <button 
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="text-slate-500 hover:text-white disabled:opacity-0 transition-colors flex items-center gap-2"
             >
                <ArrowLeft size={18} /> Anterior
             </button>

             {step < tutorials.length - 1 ? (
               <button 
                  onClick={() => setStep(step + 1)}
                  className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
               >
                  Siguiente <ArrowRight size={18} />
               </button>
             ) : (
               <button 
                  onClick={onClose}
                  className="bg-ai-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-ai-500 transition-colors flex items-center gap-2 shadow-lg shadow-ai-500/20"
               >
                  Entendido <Zap size={18} />
               </button>
             )}
          </div>
        </div>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
            <X size={24} />
        </button>
      </div>
    </div>
  );
};
