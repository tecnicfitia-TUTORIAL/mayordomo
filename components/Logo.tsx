
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 512 512" 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F5E6CA" />
        <stop offset="40%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#AA8038" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="black" floodOpacity="0.3"/>
      </filter>
    </defs>
    
    {/* Background Circle */}
    <circle cx="256" cy="256" r="256" fill="#3E1C25" />
    
    {/* Stylized M (Tuxedo style) */}
    <g filter="url(#shadow)">
        <path 
        d="M130 380 V150 L256 270 L382 150 V380 H325 V230 L256 295 L187 230 V380 H130Z" 
        fill="url(#gold-grad)" 
        />
        
        {/* Bowtie */}
        <path 
        d="M256 320 C270 320 295 305 295 305 V340 C295 340 270 325 256 325 C242 325 217 340 217 340 V305 C217 305 242 320 256 320 Z" 
        fill="url(#gold-grad)" 
        />
        <circle cx="256" cy="322" r="8" fill="#3E1C25" />
        
        {/* Buttons */}
        <circle cx="256" cy="360" r="6" fill="url(#gold-grad)" />
        <circle cx="256" cy="385" r="6" fill="url(#gold-grad)" />
    </g>
  </svg>
);
