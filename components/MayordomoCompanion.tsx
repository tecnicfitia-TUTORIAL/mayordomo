import React from 'react';

export const MayordomoCompanion: React.FC = () => {
  return (
    <div 
      className="fixed bottom-4 right-4 z-50 w-[100px] h-[100px] bg-stone-800 flex items-center justify-center text-center p-2 rounded-lg shadow-lg border border-stone-700"
      title="Mayordomo Companion"
    >
      <span className="text-xs text-stone-400 font-bold">Aquí irá el Gnomo</span>
      {/* TODO: Load Lottie or Rive animation here */}
    </div>
  );
};
