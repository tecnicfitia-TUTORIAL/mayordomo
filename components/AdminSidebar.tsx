import React from 'react';
import { Logo } from './Logo';
import { Settings, MessageSquare, LogOut, LayoutGrid } from 'lucide-react';

interface Props {
  onOpenMenu: () => void;
  onOpenSettings: () => void;
  onOpenChat: () => void;
  onLogout: () => void;
  activeView: 'MENU' | 'SIMULATION' | 'SUPPORT' | 'EVOLUTION';
}

export const AdminSidebar: React.FC<Props> = ({ onOpenMenu, onOpenSettings, onOpenChat, onLogout, activeView }) => {
  return (
    <aside className="w-20 bg-stone-950 border-r border-stone-800 flex flex-col items-center py-8 z-50">
      <div className="mb-12">
        <Logo className="w-10 h-10 text-ai-500" />
      </div>

      <nav className="flex-1 flex flex-col gap-8 w-full px-4">
        <button 
          onClick={onOpenMenu}
          className={`p-3 rounded-xl transition-all group relative flex justify-center ${activeView === 'MENU' ? 'bg-ai-900/20 text-ai-500' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900'}`}
          title="Panel Principal"
        >
          <LayoutGrid size={24} />
          {activeView === 'MENU' && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-ai-500 rounded-l-full"></div>}
        </button>

        <button 
          onClick={(e) => e.preventDefault()}
          className="p-3 rounded-xl text-stone-800 cursor-not-allowed flex justify-center"
          title="Ajustes (No disponible)"
        >
          <Settings size={24} />
        </button>

        <button 
          onClick={onOpenChat}
          className="p-3 rounded-xl text-stone-500 hover:text-stone-300 hover:bg-stone-900 transition-all flex justify-center"
          title="Chat"
        >
          <MessageSquare size={24} />
        </button>
      </nav>

      <div className="mt-auto px-4 w-full">
        <button 
          onClick={onLogout}
          className="w-full p-3 rounded-xl text-stone-500 hover:text-red-400 hover:bg-red-900/10 transition-all flex justify-center"
          title="Cerrar Sesión"
        >
          <LogOut size={24} />
        </button>
      </div>
    </aside>
  );
};
