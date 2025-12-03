
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebaseConfig';
import ClientApp from './ClientApp';
import { LandingPage } from './components/LandingPage';
import { MayordomoCompanion } from './components/MayordomoCompanion';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Manejo de modo Mock / Offline (si no hay API Keys)
    if ((auth as any)._isMock) {
        const localProfile = localStorage.getItem('mayordomo_profile');
        setIsAuthenticated(!!localProfile);
        setIsLoading(false);
        return;
    }

    // Suscripción a Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      // TAREA: Asegurarse de que isLoading siempre termine en false
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Efecto para redirección explícita post-carga
  useEffect(() => {
      if (isLoading) return;

      if (isAuthenticated && location.pathname === '/') {
          navigate('/app', { replace: true });
      }
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex flex-col items-center justify-center text-stone-500 font-mono">
        <div className="w-8 h-8 border-2 border-stone-700 border-t-ai-500 rounded-full animate-spin mb-4"></div>
        <div className="text-xs tracking-widest animate-pulse">INICIALIZANDO SISTEMA...</div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route 
            path="/" 
            element={
                isAuthenticated ? <Navigate to="/app" replace /> : <LandingPage />
            } 
        />
        <Route 
            path="/app/*" 
            element={
                isAuthenticated ? <ClientApp /> : <Navigate to="/" replace />
            } 
        />
        {/* Redirect legacy or unknown routes to Login (or App if auth) */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/app" : "/"} replace />} />
      </Routes>
      
      {/* Companion visible on top of everything, including Login */}
      <MayordomoCompanion />
    </>
  );
};

export default App;
