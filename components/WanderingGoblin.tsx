import React from 'react';
import { Ghost } from 'lucide-react';

export const WanderingGoblin: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[5] overflow-hidden" aria-hidden="true">
      <div className="absolute animate-wander opacity-20 text-stone-400">
        {/* Representación abstracta del "Duende" usando un icono fantasma sutil */}
        <Ghost size={24} /> 
      </div>
      <style>{`
        @keyframes wander {
          0% { transform: translate(10vw, 10vh) rotate(0deg); }
          15% { transform: translate(80vw, 15vh) rotate(10deg); }
          30% { transform: translate(15vw, 80vh) rotate(-10deg); }
          45% { transform: translate(70vw, 60vh) rotate(5deg); }
          60% { transform: translate(30vw, 40vh) rotate(-5deg); }
          75% { transform: translate(85vw, 85vh) rotate(10deg); }
          90% { transform: translate(50vw, 10vh) rotate(-5deg); }
          100% { transform: translate(10vw, 10vh) rotate(0deg); }
        }
        .animate-wander {
          animation: wander 60s infinite linear;
          will-change: transform;
        }
      `}</style>
    </div>
  );
};
