import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

export const MayordomoCompanion = () => {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    // Cargamos la animación desde la URL proporcionada
    fetch('https://lottie.host/5903b446-2433-4ee1-b75d-338272551469/3w0jKz5J5B.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error("Error loading Lottie animation:", error));
  }, []);

  if (!animationData) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-32 h-32 cursor-pointer hover:scale-110 transition-transform">
      <Lottie
        animationData={animationData}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};
