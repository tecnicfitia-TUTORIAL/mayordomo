
import React, { useState, useEffect, useRef } from 'react';
import { SupportUserStatus, SubscriptionTier } from '../types';
import { ArrowLeft, LifeBuoy, AlertTriangle, CheckCircle2, XCircle, MoreVertical, RefreshCw, PauseCircle, ShieldAlert, History, Lock, PenTool } from 'lucide-react';
import { RegulatoryIntelligenceFeed } from './RegulatoryIntelligenceFeed';
import { AuditLogModal, ForceLogoutModal, OverrideSubscriptionModal } from './AdminModals';

interface Props {
  onClose: () => void;
}

// MOCK DATA GENERATOR FOR UI DEV
const MOCK_USERS: SupportUserStatus[] = [
    { uid: 'u_101', email: 'ana.garcia@example.com', tier: SubscriptionTier.VIP, systemHealth: 'OPTIMAL', fraudRisk: 'LOW', aiTokensUsed: 45, lastActive: new Date() },
    { uid: 'u_102', email: 'carlos.m@tech.co', tier: SubscriptionTier.PRO, systemHealth: 'DEGRADED', fraudRisk: 'LOW', aiTokensUsed: 88, lastActive: new Date(Date.now() - 3600000) },
    { uid: 'u_103', email: 'guest_user_99@temp.net', tier: SubscriptionTier.FREE, systemHealth: 'OPTIMAL', fraudRisk: 'HIGH', aiTokensUsed: 10, lastActive: new Date(Date.now() - 86400000) },
    { uid: 'u_104', email: 'admin.support@confort.app', tier: SubscriptionTier.VIP, systemHealth: 'OPTIMAL', fraudRisk: 'LOW', aiTokensUsed: 12, lastActive: new Date() },
    { uid: 'u_105', email: 'lucia.perez@design.io', tier: SubscriptionTier.BASIC, systemHealth: 'CRITICAL', fraudRisk: 'MEDIUM', aiTokensUsed: 95, lastActive: new Date(Date.now() - 7200000) },
];

export const SupportDashboard: React.FC<Props> = ({ onClose }) => {
  const [users, setUsers] = useState<SupportUserStatus[]>(MOCK_USERS);
  const [filter, setFilter] = useState('');
  
  // State for Dropdown Menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // State for Modals
  const [modalState, setModalState] = useState<{
      type: 'AUDIT' | 'LOGOUT' | 'OVERRIDE';
      user: SupportUserStatus;
  } | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setOpenMenuId(null);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getHealthIcon = (status: string) => {
      switch(status) {
          case 'OPTIMAL': return <CheckCircle2 size={16} className="text-emerald-500" />;
          case 'DEGRADED': return <AlertTriangle size={16} className="text-amber-500" />;
          case 'CRITICAL': return <XCircle size={16} className="text-red-500" />;
          default: return <div className="w-4 h-4 bg-stone-700 rounded-full" />;
      }
  };

  const getRiskLabel = (risk: string) => {
      const colors = {
          'LOW': 'bg-emerald-900/20 text-emerald-500 border-emerald-500/30',
          'MEDIUM': 'bg-amber-900/20 text-amber-500 border-amber-500/30',
          'HIGH': 'bg-red-900/20 text-red-500 border-red-500/30 animate-pulse'
      };
      return (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm border ${colors[risk as keyof typeof colors]}`}>
              {risk}
          </span>
      );
  };

  // Action Handlers
  const handleAction = (action: 'AUDIT' | 'LOGOUT' | 'OVERRIDE', user: SupportUserStatus) => {
      setOpenMenuId(null);
      setModalState({ type: action, user });
  };

  const confirmLogout = (reason: string) => {
      console.log(`[ADMIN] Force Logout for ${modalState?.user.email}. Reason: ${reason}`);
      // TODO: Call Backend API
      setModalState(null);
  };

  const confirmOverride = (data: { tier: SubscriptionTier, justification: string }) => {
      console.log(`[ADMIN] Override Tier for ${modalState?.user.email} to ${data.tier}. Reason: ${data.justification}`);
      // TODO: Call Backend API
      // Optimistic Update
      setUsers(prev => prev.map(u => u.uid === modalState?.user.uid ? { ...u, tier: data.tier } : u));
      setModalState(null);
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(filter.toLowerCase()) || u.uid.includes(filter));

  return (
    <div className="fixed inset-0 z-[120] bg-[#0c0a09] flex flex-col animate-fadeIn font-sans">
        
        {/* MODALS LAYER */}
        {modalState?.type === 'AUDIT' && (
            <AuditLogModal user={modalState.user} onClose={() => setModalState(null)} onConfirm={() => {}} />
        )}
        {modalState?.type === 'LOGOUT' && (
            <ForceLogoutModal user={modalState.user} onClose={() => setModalState(null)} onConfirm={confirmLogout} />
        )}
        {modalState?.type === 'OVERRIDE' && (
            <OverrideSubscriptionModal user={modalState.user} onClose={() => setModalState(null)} onConfirm={confirmOverride} />
        )}

        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 bg-dark-900 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-xl font-serif font-bold text-stone-200 flex items-center gap-2">
                        <LifeBuoy className="text-ai-500" size={24} /> Soporte y Monitorización
                    </h1>
                    <p className="text-xs text-stone-500 uppercase tracking-widest">
                        Panel de Control Técnico de Usuarios
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="bg-red-900/20 border border-red-500/30 px-3 py-1.5 rounded-sm flex items-center gap-2">
                     <ShieldAlert size={14} className="text-red-500" />
                     <span className="text-[10px] text-red-400 font-bold uppercase">Datos Privados Ocultos</span>
                </div>
                <div className="w-64 bg-stone-900 border border-stone-700 rounded-sm px-3 py-2 flex items-center gap-2">
                     <span className="text-stone-500 text-xs">🔍</span>
                     <input 
                        type="text" 
                        placeholder="Buscar por Email o ID..." 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs text-white w-full placeholder-stone-600"
                     />
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar" onClick={() => setOpenMenuId(null)}>
            
            {/* REGULATORY INTELLIGENCE FEED */}
            <RegulatoryIntelligenceFeed />

            {/* Data Grid */}
            <div className="bg-stone-900 border border-stone-800 rounded-lg overflow-visible shadow-2xl min-h-[400px]">
                
                {/* Table Header */}
                <div className="grid grid-cols-12 bg-black border-b border-stone-800 p-3 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    <div className="col-span-3">Usuario / ID</div>
                    <div className="col-span-2">Nivel</div>
                    <div className="col-span-2 text-center">Salud Sistema</div>
                    <div className="col-span-2 text-center">Riesgo Fraude</div>
                    <div className="col-span-2">Consumo IA</div>
                    <div className="col-span-1 text-right">Acciones</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-stone-800">
                    {filteredUsers.map(user => (
                        <div key={user.uid} className="grid grid-cols-12 items-center p-4 hover:bg-stone-800/30 transition-colors group relative">
                            
                            {/* User Info */}
                            <div className="col-span-3 pr-2">
                                <div className="text-sm font-bold text-stone-200 truncate">{user.email}</div>
                                <div className="text-[10px] text-stone-500 font-mono">ID: {user.uid}</div>
                            </div>

                            {/* Tier */}
                            <div className="col-span-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    user.tier === SubscriptionTier.VIP ? 'bg-ai-900/20 text-ai-500 border-ai-500/30' : 
                                    user.tier === SubscriptionTier.FREE ? 'bg-stone-800 text-stone-400 border-stone-700' :
                                    'bg-stone-800 text-white border-stone-600'
                                }`}>
                                    {user.tier}
                                </span>
                            </div>

                            {/* Health */}
                            <div className="col-span-2 flex justify-center">
                                <div className="flex items-center gap-2 tooltip" title={user.systemHealth}>
                                    {getHealthIcon(user.systemHealth)}
                                    <span className={`text-[10px] font-bold ${
                                        user.systemHealth === 'OPTIMAL' ? 'text-emerald-500' : 
                                        user.systemHealth === 'CRITICAL' ? 'text-red-500' : 'text-amber-500'
                                    }`}>
                                        {user.systemHealth}
                                    </span>
                                </div>
                            </div>

                            {/* Risk */}
                            <div className="col-span-2 flex justify-center">
                                {getRiskLabel(user.fraudRisk)}
                            </div>

                            {/* AI Usage */}
                            <div className="col-span-2 pr-4">
                                <div className="flex justify-between text-[9px] text-stone-500 mb-1">
                                    <span>Tokens</span>
                                    <span>{user.aiTokensUsed}%</span>
                                </div>
                                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${user.aiTokensUsed > 90 ? 'bg-red-500' : 'bg-ai-500'}`} 
                                        style={{ width: `${user.aiTokensUsed}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Actions (Menu Kebab) */}
                            <div className="col-span-1 flex justify-end relative">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(openMenuId === user.uid ? null : user.uid);
                                    }}
                                    className={`p-1.5 rounded transition-colors ${openMenuId === user.uid ? 'bg-ai-500 text-black' : 'text-stone-400 hover:text-white hover:bg-stone-700'}`}
                                >
                                    <MoreVertical size={16} />
                                </button>

                                {/* DROPDOWN MENU */}
                                {openMenuId === user.uid && (
                                    <div 
                                        ref={menuRef}
                                        className="absolute right-0 top-full mt-2 w-48 bg-stone-900 border border-stone-700 rounded shadow-xl z-20 flex flex-col overflow-hidden animate-fadeIn origin-top-right"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button 
                                            onClick={() => handleAction('AUDIT', user)}
                                            className="flex items-center gap-3 p-3 hover:bg-stone-800 text-stone-300 hover:text-white text-left text-xs border-b border-stone-800"
                                        >
                                            <History size={14} className="text-stone-500" /> Ver Log Auditoría
                                        </button>
                                        <button 
                                            onClick={() => handleAction('LOGOUT', user)}
                                            className="flex items-center gap-3 p-3 hover:bg-red-900/20 text-stone-300 hover:text-red-400 text-left text-xs border-b border-stone-800"
                                        >
                                            <Lock size={14} className="text-red-500" /> Forzar Cierre Sesión
                                        </button>
                                        <button 
                                            onClick={() => handleAction('OVERRIDE', user)}
                                            className="flex items-center gap-3 p-3 hover:bg-ai-900/20 text-stone-300 hover:text-ai-500 text-left text-xs"
                                        >
                                            <PenTool size={14} className="text-ai-500" /> Cambiar Nivel (Override)
                                        </button>
                                    </div>
                                )}
                            </div>

                        </div>
                    ))}
                </div>

                {filteredUsers.length === 0 && (
                    <div className="p-12 text-center text-stone-500 italic">
                        No se encontraron usuarios con ese criterio.
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
