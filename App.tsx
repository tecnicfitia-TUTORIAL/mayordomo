
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ClientApp from './ClientApp';
import { LandingPage } from './components/LandingPage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/*" element={<ClientApp />} />
      {/* Redirect legacy or unknown routes to Landing Page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
