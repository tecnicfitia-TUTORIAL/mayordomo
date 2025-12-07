
import React, { useState } from 'react';
import { UserProfile, SubscriptionTier } from '../types';
import { SUBSCRIPTION_PLANS, STRIPE_URLS, getTierLevel } from '../constants';
import { X, ExternalLink, Check, Shield, Zap, Star, Crown, ChevronRight, User, Briefcase, MapPin, Save, Loader2, Fingerprint, Lock, Smartphone, Upload, Bell, Heart, Mail } from 'lucide-react';
import { LegalModal } from './LegalModal';
import { MfaModal } from './MfaModal';
import { startRegistration } from '@simplewebauthn/browser';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../services/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

import { CertificateService, DigitalCertificate } from '../services/certificateService';
import { CertificateManager } from './CertificateManager';

interface Props {
  profile: UserProfile;
  onUpdate?: (profile: UserProfile) => void;
  onClose: () => void;
  isDemoMode?: boolean;
  initialTab?: SettingsTab;
}

type SettingsTab = 'PLANS' | 'PROFILE' | 'SECURITY';

export const SettingsModal: React.FC<Props> = ({ profile, onUpdate, onClose, isDemoMode = false, initialTab = 'PLANS' }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [legalType, setLegalType] = useState<'PRIVACY' | 'TERMS' | 'NOTICE' | null>(null);
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [showCertManager, setShowCertManager] = useState(false);
  
  // Check Biometrics Status
  React.useEffect(() => {
    const checkBiometrics = async () => {
      if (!profile.uid) return;
      try {
        const authCol = collection(db, 'users', profile.uid, 'authenticators');
        const snapshot = await getDocs(authCol);
        setHasBiometrics(!snapshot.empty);
      } catch (err) {
        console.error("Error checking biometrics:", err);
      }
    };
    checkBiometrics();
  }, [profile.uid]);
  
  // Certificate State
  const [certificate, setCertificate] = useState<DigitalCertificate | null>(null);
  const [isUploadingCert, setIsUploadingCert] = useState(false);
  const [certPassword, setCertPassword] = useState('');
  const [showCertInput, setShowCertInput] = useState(false);

  // Load initial certificate status (mock)
  // useEffect(() => {
  //   CertificateService.getStatus().then(setCertificate);
  // }, []);

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    // In real flow, we need the password first. For this demo, we assume password is provided or we prompt.
    if (!certPassword && !showCertInput) {
        setShowCertInput(true);
        // We would normally store the file in a temp state and wait for password submit
        return;
    }

    setIsUploadingCert(true);
    try {
        const cert = await CertificateService.uploadCertificate(file, certPassword);
        setCertificate(cert);
        setShowCertInput(false);
        setCertPassword('');
    } catch (error) {
        alert("Error al procesar el certificado. Verifique la contraseña.");
    } finally {
        setIsUploadingCert(false);
    }
  };


  
  // PROFILE FORM STATE
  const [formData, setFormData] = useState<Partial<UserProfile>>({
      name: profile.name,
      birthDate: profile.birthDate || '',
      occupation: profile.occupation,
      sector: profile.sector || '',
      workModality: profile.workModality || 'ONSITE',
      maritalStatus: profile.maritalStatus || 'SINGLE',
      zipCode: profile.zipCode || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleRegisterBiometrics = async () => {
    setIsSaving(true);
    try {
      // 1. Get Options
      const generateRegOptions = httpsCallable(functions, 'generateRegistrationOptions');
      const optsResponse = await generateRegOptions({ rpID: window.location.hostname });
      const opts = optsResponse.data as any;

      // 2. Create Credential
      // SimpleWebAuthn v13+ expects { optionsJSON: ... }
      const attResp = await startRegistration({ optionsJSON: opts as any });

      // 3. Verify
      const verifyReg = httpsCallable(functions, 'verifyRegistration');
      const verificationResp = await verifyReg({
        response: attResp,
        rpID: window.location.hostname,
        origin: window.location.origin
      });

      const verification = verificationResp.data as any;
      if (verification.verified) {
        console.log("[Biometrics] Registration Successful. Credential ID:", attResp.id);
        alert(`Biometría activada correctamente.\n\nPara iniciar sesión, use su email:\n${profile.email}\n\nO use el botón de huella directamente (QR).`);
        setHasBiometrics(true);
      } else {
        alert("Error al activar biometría. Inténtelo de nuevo.");
      }
    } catch (error: any) {
      console.error(error);
      alert("Error: " + (error.message || "No se pudo activar la biometría."));
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleOpenCheckout = (tier: SubscriptionTier) => {
    if (isDemoMode && onUpdate) {
        onUpdate(profile); // Trigger Demo Modal via parent
        return;
    }
    const url = STRIPE_URLS[tier];
    if (url) {
      window.open(url, '_blank');
    } else {
        alert("Configuración de pagos no disponible en este entorno.");
    }
  };

  const handleOpenPortal = () => {
    if (isDemoMode && onUpdate) {
        onUpdate(profile); // Trigger Demo Modal via parent
        return;
    }
    window.open(STRIPE_URLS.PORTAL, '_blank');
  };

  const handleSaveProfile = async () => {
      if (!onUpdate) return;
      setIsSaving(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedProfile = { ...profile, ...formData };
      onUpdate(updatedProfile);
      setIsSaving(false);
      alert("Perfil actualizado correctamente");
  };

  const getTierIcon = (tierId: string) => {
      switch(tierId) {
          case SubscriptionTier.FREE: return <Shield size={20} />;
          case SubscriptionTier.BASIC: return <Zap size={20} />;
          case SubscriptionTier.PRO: return <Star size={20} />;
          case SubscriptionTier.VIP: return <Crown size={20} />;
          default: return <Shield size={20} />;
      }
  };

  const currentLevel = getTierLevel(profile.subscriptionTier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-6xl bg-[#0c0a09] border border-stone-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-stone-950">
          <div>
            <h2 className="text-2xl font-serif font-bold text-white mb-1">Configuración</h2>
            <p className="text-xs text-stone-500 uppercase tracking-widest">Gestión de cuenta y suscripción</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-full transition-colors group">
              <X className="text-stone-500 group-hover:text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-900/50 px-6">
            <button 
                onClick={() => setActiveTab('PLANS')}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'PLANS' ? 'border-ai-500 text-white' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
            >
                Niveles de Autonomía
            </button>
            <button 
                onClick={() => setActiveTab('PROFILE')}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'PROFILE' ? 'border-ai-500 text-white' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
            >
                Mi Perfil
            </button>
            <button 
                onClick={() => setActiveTab('SECURITY')}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'SECURITY' ? 'border-ai-500 text-white' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
            >
                Seguridad
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-stone-950/30">
            
            {/* TAB: SECURITY */}
            {activeTab === 'SECURITY' && (
              <div className="max-w-2xl mx-auto space-y-8">
                
                {/* MFA SECTION */}
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6 relative overflow-hidden">
                  {profile.mfaEnabled && (
                    <div className="absolute top-0 right-0 p-4">
                      <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/30">
                        <Check size={12} /> ACTIVO
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-stone-800 rounded-lg">
                      <Smartphone className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">Autenticación de Doble Factor (MFA)</h3>
                      <p className="text-stone-400 text-sm mb-6">
                        Proteja acciones críticas (Banco, Certificado Digital, DEHú) usando Google Authenticator. Requerido para niveles PRO y VIP.
                      </p>
                      
                      {!profile.mfaEnabled ? (
                        <button
                          onClick={() => setIsMfaModalOpen(true)}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                        >
                          <Lock className="w-4 h-4" />
                          Activar Seguridad Alta
                        </button>
                      ) : (
                        <p className="text-xs text-stone-500 italic">
                          Su cuenta está protegida con estándares de grado militar.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* DIGITAL IDENTITY VAULT */}
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-stone-800 rounded-lg">
                      <Briefcase className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">Bóveda de Identidad Digital</h3>
                      <p className="text-stone-400 text-sm mb-6">
                        Centralice su Certificado Digital para automatizar trámites con la Administración (DEHú, AEAT, Salud).
                        Su certificado se encripta con estándares bancarios.
                      </p>

                      {/* CERTIFICATE STATUS */}
                      <div className="bg-black/40 rounded-lg p-4 border border-stone-800 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${certificate ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} />
                                <span className="text-sm font-bold text-stone-200">Certificado Digital (FNMT/DNIe)</span>
                            </div>
                            {certificate ? (
                                <span className="text-xs text-emerald-500 font-mono">ACTIVO</span>
                            ) : (
                                <span className="text-xs text-stone-600 font-mono">NO CONFIGURADO</span>
                            )}
                        </div>
                        
                        <button
                          onClick={() => setShowCertManager(true)}
                          className="w-full bg-ai-500 hover:bg-ai-600 text-black font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <Shield size={16} />
                          {certificate ? 'Gestionar Certificado' : 'Configurar Certificado Digital'}
                        </button>
                      </div>

                      {/* Cl@ve Option */}
                      <div className="mb-6 p-3 bg-stone-950/30 rounded border border-stone-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-stone-800 rounded text-stone-400">
                                    <Smartphone size={14} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-stone-300">Cl@ve Móvil / PIN</div>
                                    <div className="text-[10px] text-stone-500">Usar app oficial para autorizaciones puntuales</div>
                                </div>
                            </div>
                            <button className="text-[10px] bg-stone-800 hover:bg-stone-700 text-stone-300 px-2 py-1 rounded border border-stone-700 transition-colors">
                                Vincular App
                            </button>
                      </div>

                      {/* CONNECTED SERVICES */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Servicios Vinculados</h4>
                        
                        {/* DEHú */}
                        <div className="flex items-center justify-between p-3 bg-stone-950/50 rounded border border-stone-800">
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded ${certificate ? 'bg-blue-900/20 text-blue-400' : 'bg-stone-900 text-stone-600'}`}>
                                    <Bell size={14} />
                                </div>
                                <div>
                                    <div className={`text-sm font-bold ${certificate ? 'text-stone-200' : 'text-stone-600'}`}>DEHú (Notificaciones)</div>
                                    <div className="text-[10px] text-stone-500">Requiere Certificado Digital</div>
                                </div>
                            </div>
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${certificate ? 'bg-blue-900/50 cursor-pointer' : 'bg-stone-900 cursor-not-allowed'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${certificate ? 'left-4 bg-blue-400' : 'left-0.5 bg-stone-500'}`} />
                            </div>
                        </div>

                        {/* SALUD */}
                        <div className="flex items-center justify-between p-3 bg-stone-950/50 rounded border border-stone-800">
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded ${certificate ? 'bg-red-900/20 text-red-400' : 'bg-stone-900 text-stone-600'}`}>
                                    <Heart size={14} />
                                </div>
                                <div>
                                    <div className={`text-sm font-bold ${certificate ? 'text-stone-200' : 'text-stone-600'}`}>Carpeta de Salud</div>
                                    <div className="text-[10px] text-stone-500">Historial clínico y citas</div>
                                </div>
                            </div>
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${certificate ? 'bg-red-900/50 cursor-pointer' : 'bg-stone-900 cursor-not-allowed'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${certificate ? 'left-4 bg-red-400' : 'left-0.5 bg-stone-500'}`} />
                            </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* EMAIL SECTION */}
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-stone-800 rounded-lg">
                      <Mail className="w-6 h-6 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">Email & Comunicaciones</h3>
                      <p className="text-stone-400 text-sm mb-4">
                        Conecte su cuenta de correo para que el Mayordomo pueda detectar facturas, citas y eventos importantes.
                      </p>
                      
                      <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-stone-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" alt="Gmail" className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Google Gmail</div>
                                <div className="text-xs text-stone-500">Lectura de facturas y calendario</div>
                            </div>
                        </div>
                        <button className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded border border-stone-700 transition-colors">
                            Conectar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BIOMETRICS SECTION */}
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6 relative overflow-hidden">
                  {hasBiometrics && (
                    <div className="absolute top-0 right-0 p-4">
                      <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/30">
                        <Check size={12} /> ACTIVO
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-stone-800 rounded-lg">
                      <Fingerprint className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">Autenticación Biométrica</h3>
                      <p className="text-stone-400 text-sm mb-6">
                        Active el acceso mediante huella dactilar, reconocimiento facial o llave de seguridad (Passkeys) para iniciar sesión de forma rápida y segura sin contraseña.
                      </p>
                      
                      {!hasBiometrics ? (
                        <button
                          onClick={handleRegisterBiometrics}
                          disabled={isSaving}
                          className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#b68e29] text-black font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Fingerprint className="w-4 h-4" />}
                          Configurar Biometría
                        </button>
                      ) : (
                        <div className="flex gap-3">
                            <button
                              onClick={handleRegisterBiometrics}
                              disabled={isSaving}
                              className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold px-4 py-2 rounded-lg transition-colors text-xs border border-stone-700"
                            >
                              {isSaving ? <Loader2 className="animate-spin w-3 h-3" /> : <Fingerprint className="w-3 h-3" />}
                              Añadir otro dispositivo
                            </button>
                            <p className="text-xs text-stone-500 italic self-center">
                                Su dispositivo actual o llave de seguridad está configurado.
                            </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-stone-800 rounded-lg">
                      <Shield className="w-6 h-6 text-stone-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">Contraseña</h3>
                      <p className="text-stone-400 text-sm mb-4">
                        Si necesita cambiar su contraseña, le enviaremos un enlace a su correo electrónico.
                      </p>
                      <button className="text-[#D4AF37] hover:text-[#b68e29] text-sm font-bold transition-colors">
                        Solicitar cambio de contraseña
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PLANS */}
            {activeTab === 'PLANS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {SUBSCRIPTION_PLANS.map((plan) => {
                    const planLevel = getTierLevel(plan.id as SubscriptionTier);
                    const isCurrent = profile.subscriptionTier === plan.id;
                    const isUpgrade = planLevel > currentLevel;
                    // const isDowngrade = planLevel < currentLevel;

                    return (
                        <div 
                            key={plan.id}
                            className={`relative flex flex-col rounded-lg border transition-all duration-300 ${
                                isCurrent 
                                    ? 'bg-stone-900 border-ai-500 shadow-[0_0_30px_rgba(212,175,55,0.1)] ring-1 ring-ai-500 transform scale-[1.02] z-10' 
                                    : 'bg-stone-950/50 border-stone-800 hover:border-stone-700 hover:bg-stone-900'
                            }`}
                        >
                            {/* Header Card */}
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-full ${
                                        isCurrent ? 'bg-ai-500 text-black' : 
                                        isUpgrade ? 'bg-stone-800 text-stone-400' : 'bg-stone-900 text-stone-600'
                                    }`}>
                                        {getTierIcon(plan.id)}
                                    </div>
                                    {isCurrent && (
                                        <span className="text-[9px] font-bold bg-ai-900/40 text-ai-500 border border-ai-500/30 px-2 py-1 rounded uppercase tracking-widest">
                                            Plan Actual
                                        </span>
                                    )}
                                </div>

                                <h3 className={`text-xl font-serif font-bold mb-1 ${isCurrent ? 'text-white' : 'text-stone-200'}`}>
                                    {plan.name}
                                </h3>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-2xl font-bold text-white">{plan.price}</span>
                                    {plan.id !== SubscriptionTier.FREE && <span className="text-xs text-stone-500">/ mes</span>}
                                </div>

                                <p className="text-xs text-stone-500 mb-6 min-h-[40px] leading-relaxed">
                                    {plan.description}
                                </p>

                                {/* Features */}
                                <div className="space-y-3 mb-8 flex-1">
                                    {plan.capabilities.map((cap, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <Check size={14} className={`mt-0.5 shrink-0 ${isCurrent || isUpgrade ? 'text-ai-600' : 'text-stone-700'}`} />
                                            <span className={`text-xs ${isCurrent || isUpgrade ? 'text-stone-300' : 'text-stone-600'}`}>
                                                {cap}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA Button */}
                                <div className="mt-auto pt-4">
                                    {isCurrent ? (
                                        <button disabled className="w-full py-3 bg-stone-800 text-stone-500 font-bold text-xs uppercase tracking-widest rounded cursor-default border border-stone-700">
                                            Activo
                                        </button>
                                    ) : isUpgrade ? (
                                        <button 
                                            onClick={() => handleOpenCheckout(plan.id as SubscriptionTier)}
                                            className="w-full py-3 bg-white hover:bg-stone-200 text-black font-bold text-xs uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-2 shadow-lg group"
                                        >
                                            Contratar <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    ) : (
                                        <button disabled className="w-full py-3 bg-transparent text-stone-600 font-bold text-xs uppercase tracking-widest rounded border border-stone-800 cursor-default">
                                            Incluido
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'PROFILE' && (
                <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
                    
                    {/* Section 1: Personal */}
                    <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-6 border-b border-stone-800 pb-4">
                            <div className="p-2 bg-stone-800 rounded-lg text-stone-400">
                                <User size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-serif font-bold text-white">Datos Personales</h3>
                                <p className="text-xs text-stone-500">Información básica para su identificación</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-stone-200 focus:border-ai-500 focus:ring-1 focus:ring-ai-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Fecha de Nacimiento</label>
                                <input 
                                    type="date" 
                                    value={formData.birthDate}
                                    onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-stone-200 focus:border-ai-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Professional */}
                    <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-6 border-b border-stone-800 pb-4">
                            <div className="p-2 bg-stone-800 rounded-lg text-stone-400">
                                <Briefcase size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-serif font-bold text-white">Perfil Profesional</h3>
                                <p className="text-xs text-stone-500">Contexto laboral para optimizar su agenda</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Ocupación / Cargo</label>
                                <input 
                                    type="text" 
                                    value={formData.occupation}
                                    onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-stone-200 focus:border-ai-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Sector</label>
                                <input 
                                    type="text" 
                                    value={formData.sector}
                                    onChange={(e) => setFormData({...formData, sector: e.target.value})}
                                    placeholder="Ej: Tecnología, Finanzas..."
                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-stone-200 focus:border-ai-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Modalidad de Trabajo</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['REMOTE', 'HYBRID', 'ONSITE'].map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => setFormData({...formData, workModality: mode as any})}
                                            className={`p-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
                                                formData.workModality === mode 
                                                    ? 'bg-ai-900/20 border-ai-500 text-ai-500' 
                                                    : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-700'
                                            }`}
                                        >
                                            {mode === 'REMOTE' ? 'Remoto' : mode === 'HYBRID' ? 'Híbrido' : 'Presencial'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Context */}
                    <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-6 border-b border-stone-800 pb-4">
                            <div className="p-2 bg-stone-800 rounded-lg text-stone-400">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-serif font-bold text-white">Contexto Vital</h3>
                                <p className="text-xs text-stone-500">Ubicación y estado para trámites locales</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Estado Civil</label>
                                <select 
                                    value={formData.maritalStatus}
                                    onChange={(e) => setFormData({...formData, maritalStatus: e.target.value as any})}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-stone-200 focus:border-ai-500 outline-none"
                                >
                                    <option value="SINGLE">Soltero/a</option>
                                    <option value="PARTNER">Pareja de Hecho</option>
                                    <option value="MARRIED">Casado/a</option>
                                    <option value="DIVORCED">Divorciado/a</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Código Postal</label>
                                <input 
                                    type="text" 
                                    value={formData.zipCode}
                                    onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-stone-200 focus:border-ai-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                        <button 
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="bg-ai-600 hover:bg-ai-500 text-black font-bold py-3 px-8 rounded-lg flex items-center gap-2 uppercase tracking-widest shadow-lg shadow-ai-500/20 transition-all active:scale-[0.98]"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>

                </div>
            )}

        </div>

        {/* Footer Bar (Billing Portal) */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
             <div className="flex gap-4">
                <button onClick={() => setLegalType('PRIVACY')} className="text-stone-500 hover:text-white transition-colors">Privacidad</button>
                <button onClick={() => setLegalType('TERMS')} className="text-stone-500 hover:text-white transition-colors">Términos</button>
             </div>

             <div className="flex items-center gap-4">
                <span className="text-stone-600 hidden md:inline">¿Ya tiene una suscripción activa?</span>
                <button 
                    onClick={handleOpenPortal}
                    className="flex items-center gap-2 text-stone-400 hover:text-ai-500 transition-colors font-bold uppercase tracking-wide px-4 py-2 rounded-lg border border-stone-800 hover:border-ai-500/30 hover:bg-ai-900/10"
                >
                    <ExternalLink size={14} /> Ir al Portal de Cliente
                </button>
             </div>
        </div>

      </div>
      
      {/* Legal Modal Overlay */}
      {legalType && <LegalModal type={legalType} onClose={() => setLegalType(null)} />}

      {/* MFA Modal Overlay */}
      <MfaModal 
        isOpen={isMfaModalOpen}
        onClose={() => setIsMfaModalOpen(false)}
        onSuccess={() => {
            if (onUpdate) onUpdate({ ...profile, mfaEnabled: true });
        }}
        mode="SETUP"
      />

      {/* Certificate Manager Modal */}
      {showCertManager && (
        <CertificateManager 
          onClose={() => {
            setShowCertManager(false);
            // Recargar estado del certificado
            CertificateService.getStatus().then(setCertificate).catch(() => setCertificate(null));
          }} 
        />
      )}
    </div>
  );
};
