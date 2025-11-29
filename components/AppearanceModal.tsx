import React, { useRef } from 'react';
import { UserProfile, ThemePreference } from '../types';
import { VISUAL_PRESETS } from '../constants';
import { X, Monitor, Moon, Sun, Image as ImageIcon, Plus, Palette } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
  onClose: () => void;
}

export const AppearanceModal: React.FC<Props> = ({ profile, onClose, onUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleThemeChange = (theme: ThemePreference) => {
    onUpdate({ ...profile, themePreference: theme });
  };

  const handleVisualPresetChange = (presetId: string) => {
      onUpdate({
          ...profile,
          themeConfig: { type: 'PRESET', value: presetId }
      });
  };

  const handleCustomImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              onUpdate({
                  ...profile,
                  themeConfig: { type: 'CUSTOM', value: base64String }
              });
          };
          reader.readAsDataURL(file);
      }
  };

  // DEFAULT FALLBACK: DARK
  const currentTheme = profile.themePreference || 'DARK';
  const currentVisualTheme = profile.themeConfig || { type: 'PRESET', value: 'ONYX' };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-black">
          <div className="flex items-center gap-2">
            <Palette className="text-ai-500" size={20} />
            <h2 className="text-white font-serif font-bold">Apariencia y Temas</h2>
          </div>
          <button onClick={onClose}><X className="text-stone-500 hover:text-white" /></button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col overflow-y-auto custom-scrollbar">
            
            {/* ATMOSFERA VISUAL */}
            <div className="w-full mb-8 border-b border-stone-800 pb-6">
                 <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <ImageIcon size={14} /> Atmósfera Visual (Fondo)
                 </h3>
                 
                 <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                     {/* PRESETS */}
                     {VISUAL_PRESETS.map((preset) => {
                         const isSelected = currentVisualTheme.type === 'PRESET' && currentVisualTheme.value === preset.id;
                         return (
                             <button
                                key={preset.id}
                                onClick={() => handleVisualPresetChange(preset.id)}
                                className={`flex flex-col items-center gap-2 shrink-0 transition-all ${isSelected ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
                             >
                                 <div 
                                    className={`w-14 h-14 rounded-full border-2 shadow-lg ${isSelected ? 'border-ai-500 ring-2 ring-ai-500/20' : 'border-stone-700'}`}
                                    style={{ background: preset.previewColor }}
                                 />
                                 <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-ai-500' : 'text-stone-500'}`}>
                                     {preset.label}
                                 </span>
                             </button>
                         )
                     })}

                     {/* CUSTOM UPLOAD */}
                     <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex flex-col items-center gap-2 shrink-0 transition-all ${currentVisualTheme.type === 'CUSTOM' ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
                     >
                         <div className={`w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center bg-stone-950 ${currentVisualTheme.type === 'CUSTOM' ? 'border-ai-500 text-ai-500' : 'border-stone-700 text-stone-500'}`}>
                             {currentVisualTheme.type === 'CUSTOM' ? (
                                 <img src={currentVisualTheme.value} alt="Custom" className="w-full h-full rounded-full object-cover opacity-70" />
                             ) : (
                                 <Plus size={20} />
                             )}
                         </div>
                         <span className={`text-[9px] font-bold uppercase ${currentVisualTheme.type === 'CUSTOM' ? 'text-ai-500' : 'text-stone-500'}`}>
                             Propia
                         </span>
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleCustomImageUpload}
                         />
                     </button>
                 </div>
            </div>

            {/* THEME SELECTOR (Light/Dark) */}
            <div className="w-full">
                 <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Modo de Interfaz</h3>
                 <div className="grid grid-cols-3 gap-3">
                     <button 
                        onClick={() => handleThemeChange('AUTO')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-sm border transition-all ${currentTheme === 'AUTO' ? 'bg-ai-900/20 border-ai-500/50 text-ai-500' : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-600'}`}
                     >
                         <Monitor size={20} />
                         <span className="text-[10px] font-bold">Sistema</span>
                     </button>
                     <button 
                        onClick={() => handleThemeChange('LIGHT')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-sm border transition-all ${currentTheme === 'LIGHT' ? 'bg-stone-200 border-white text-black' : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-600'}`}
                     >
                         <Sun size={20} />
                         <span className="text-[10px] font-bold">Claro</span>
                     </button>
                     <button 
                        onClick={() => handleThemeChange('DARK')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-sm border transition-all ${currentTheme === 'DARK' ? 'bg-black border-stone-600 text-white' : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-600'}`}
                     >
                         <Moon size={20} />
                         <span className="text-[10px] font-bold">Oscuro</span>
                     </button>
                 </div>
            </div>

        </div>
        
        <div className="p-4 bg-stone-950 border-t border-stone-800 text-center">
            <button onClick={onClose} className="text-xs font-bold text-stone-400 hover:text-white transition-colors uppercase tracking-widest">
                Guardar Preferencias
            </button>
        </div>
      </div>
    </div>
  );
};