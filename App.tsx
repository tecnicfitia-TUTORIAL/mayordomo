
import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ClientApp from './ClientApp';
import { LoginScreen } from './components/LoginScreen';
import { MayordomoCompanion } from './components/MayordomoCompanion';

const App: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Routes>
        <Route path="/" element={<LoginScreen onLoginSuccess={() => navigate('/app')} />} />
        <Route path="/app/*" element={<ClientApp />} />
        {/* Redirect legacy or unknown routes to Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Companion visible on top of everything, including Login */}
      <MayordomoCompanion />
    </>
  );
};

export default App;
