
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { ArrowRight, Shield, Zap, Globe, Check, Star, Lock } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../constants';

// Backgrounds (Same as Onboarding)
const DAILY_BACKGROUNDS = [
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1534224039826-c7a0eda0e6b3?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1480694313141-fce5e697ee25?auto=format&fit=crop&q=80&w=2000"
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const dailyImage = useMemo(() => {
      const now = new Date();
      const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
      const index = seed % DAILY_BACKGROUNDS.length;
      return DAILY_BACKGROUNDS[index];
  }, []);

  return (
    <div className="min-h-screen font-sans bg-[#0c0a09] text-stone-200 relative overflow-x-hidden">
      
      {/* --- HERO BACKGROUND --- */}
      <div className="fixed inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
            style={{ backgroundImage: `url(${dailyImage})` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-[#0c0a09]/90 to-[#0c0a09]"></div>
      </div>

      {/* --- NAVBAR --- */}
      <nav className="relative z-50 px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
              <Logo className="w-10 h-10" />
              <div>
                  <h1 className="font-serif font-bold text-xl text-white leading-none">El Mayordomo</h1>
                  <span className="text-[10px] text-ai-500 uppercase tracking-widest">Digital</span>
              </div>
          </div>
          <button 
            onClick={() => navigate('/app')}
            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-2"
          >
            Acceso Clientes <ArrowRight size={14} />
          </button>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative z-10 pt-20 pb-32 px-6 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ai-900/30 border border-ai-500/30 text-ai-400 text-[10px] font-bold uppercase tracking-widest mb-8 animate-fadeIn">
              <Star size={12} /> Sistema Operativo de Vida v1.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-8 leading-tight animate-slideInUp">
              Recupere su activo <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-ai-300 via-ai-500 to-ai-700">más valioso: El Tiempo.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-stone-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-slideInUp delay-100">
              Una inteligencia artificial diseñada para gestionar su patrimonio, burocracia y logística vital. 
              Desde trámites legales hasta la gestión de su hogar, todo en un solo lugar.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-slideInUp delay-200">
              <button 
                onClick={() => navigate('/app')}
                className="px-8 py-4 bg-white text-black rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-stone-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-2"
              >
                Comenzar Ahora <ArrowRight size={18} />
              </button>
              <button className="px-8 py-4 bg-transparent border border-stone-700 text-stone-300 rounded-lg font-bold text-sm uppercase tracking-widest hover:border-white hover:text-white transition-colors">
                Ver Demo
              </button>
          </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section className="relative z-10 py-24 bg-stone-950/50 border-y border-stone-900">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                  <div className="w-12 h-12 bg-stone-900 rounded-xl flex items-center justify-center text-ai-500 mb-4">
                      <Shield size={24} />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-white">Centinela Legal</h3>
                  <p className="text-stone-400 text-sm leading-relaxed">
                      Monitorización constante de sus obligaciones fiscales y legales. Alertas preventivas y gestión documental automatizada.
                  </p>
              </div>
              <div className="space-y-4">
                  <div className="w-12 h-12 bg-stone-900 rounded-xl flex items-center justify-center text-ai-500 mb-4">
                      <Zap size={24} />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-white">Gestión Patrimonial</h3>
                  <p className="text-stone-400 text-sm leading-relaxed">
                      Control unificado de activos, inmuebles y suministros. Optimización de costes y mantenimiento predictivo del hogar.
                  </p>
              </div>
              <div className="space-y-4">
                  <div className="w-12 h-12 bg-stone-900 rounded-xl flex items-center justify-center text-ai-500 mb-4">
                      <Globe size={24} />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-white">Concierge Global</h3>
                  <p className="text-stone-400 text-sm leading-relaxed">
                      Logística de viajes, reservas exclusivas y acceso a experiencias curadas. Su asistente personal disponible 24/7.
                  </p>
              </div>
          </div>
      </section>

      {/* --- PRICING SECTION --- */}
      <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
              <h2 className="text-3xl font-serif font-bold text-white mb-4">Niveles de Autonomía</h2>
              <p className="text-stone-400">Seleccione el grado de delegación que necesita.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {SUBSCRIPTION_PLANS.map((plan) => (
                  <div key={plan.id} className="bg-stone-900/40 border border-stone-800 rounded-2xl p-6 hover:border-ai-500/30 transition-colors flex flex-col">
                      <div className="mb-4">
                          <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                          <div className="text-2xl font-serif text-ai-500 mt-2">{plan.price}</div>
                      </div>
                      <ul className="space-y-3 mb-8 flex-1">
                          {plan.capabilities && plan.capabilities.slice(0, 4).map((feature, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-stone-400">
                                  <Check size={14} className="text-ai-500 shrink-0 mt-0.5" />
                                  <span>{feature}</span>
                              </li>
                          ))}
                      </ul>
                      <button 
                        onClick={() => navigate('/app')}
                        className="w-full py-3 border border-stone-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
                      >
                        Seleccionar
                      </button>
                  </div>
              ))}
          </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="relative z-10 py-12 border-t border-stone-900 bg-black text-center">
          <Logo className="w-8 h-8 mx-auto mb-6 opacity-50" />
          <p className="text-[10px] text-stone-600 uppercase tracking-widest mb-4">
              © 2025 Confort OS. Todos los derechos reservados.
          </p>
          <div className="flex justify-center gap-6 text-[10px] text-stone-500 font-bold uppercase tracking-widest">
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Términos</a>
              <a href="#" className="hover:text-white transition-colors">Contacto</a>
          </div>
      </footer>

    </div>
  );
};
