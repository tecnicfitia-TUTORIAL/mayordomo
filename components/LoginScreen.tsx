import React, { useState, useEffect } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, User, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Fingerprint, Loader2, ShieldCheck, Mail, Lock, User as UserIcon, ArrowLeft, MailCheck } from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { UserProfile, UserArchetype, SubscriptionTier, PillarId } from '../types';

const PROFILE_KEY = 'mayordomo_profile';
const DEFAULT_PILLAR_ORDER = Object.values(PillarId);

// SECURITY: Sanitize sensitive data before storing in localStorage
// This prevents CodeQL alert about storing sensitive information
const sanitizeProfileForStorage = (profile: UserProfile): UserProfile => {
  const sanitized = { ...profile };
  
  // Explicitly delete any sensitive fields that should NEVER be stored in localStorage
  const sensitiveFields = [
    'password',
    'passwordHash',
    'hash',
    'privateKey',
    'secretKey',
    'secret',
    'accessToken',
    'refreshToken',
    'sessionToken',
    'token',
    'credential',
    'credentials',
    'apiKey',
    'encryptedData',
    'sensitiveInfo'
  ] as const;
  
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      delete (sanitized as any)[field];
    }
  });
  
  return sanitized;
};

interface LoginScreenProps {
  onLoginSuccess?: () => void;
  isEmbedded?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, isEmbedded = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  
  // Auth State
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const auth = getAuth();

  useEffect(() => {
    // Check if WebAuthn is available
    if (window.PublicKeyCredential && 
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setIsBiometricAvailable(available))
        .catch(err => console.error("Biometric check failed", err));
    }
  }, []);

  const handleAuthSuccess = async (user: User) => {
    try {
      // 1. Check if user profile exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let profile: UserProfile;

      if (userSnap.exists()) {
        // 2a. Load existing profile
        profile = userSnap.data() as UserProfile;
        console.log("[Auth] Existing profile loaded:", profile.uid);
      } else {
        // 2b. Create new default profile
        console.log("[Auth] Creating new profile for:", user.uid);
        
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || name || 'Usuario',
          role: 'USER',
          age: 30, // Default
          gender: 'Not Specified',
          occupation: 'Digital Citizen',
          archetype: UserArchetype.ESENCIALISTA,
          subscriptionTier: SubscriptionTier.FREE,
          grantedPermissions: [],
          setupCompleted: false,
          dashboardConfig: {
            pillarOrder: DEFAULT_PILLAR_ORDER,
            hiddenPillars: []
          },
          themePreference: 'DARK'
        };

        await setDoc(userRef, newProfile);
        profile = newProfile;
      }

      // 3. Save to LocalStorage for ClientApp (sanitized)
      localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfileForStorage(profile)));

      // 4. Redirect
      if (onLoginSuccess) onLoginSuccess();

    } catch (err) {
      console.error("[Auth] Profile Sync Error:", err);
      setError("Error sincronizando perfil. Contacte con soporte.");
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handleAuthSuccess(result.user);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError("No se pudo iniciar sesión con Google. Inténtelo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const result = await signInWithPopup(auth, provider);
      await handleAuthSuccess(result.user);
    } catch (err: any) {
      console.error("Apple Login Error:", err);
      setError("No se pudo iniciar sesión con Apple. Inténtelo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setError("Por favor, introduzca email y contraseña.");
      return;
    }

    if (isRegistering && !name) {
      setError("Por favor, introduzca su nombre completo.");
      return;
    }

    setIsLoading(true);
    try {
      if (isRegistering) {
        // Registration Flow
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        
        // --- EMAIL VERIFICATION FLOW ---
        await sendEmailVerification(result.user);
        await signOut(auth); // Force logout so they can't access app
        setShowVerificationModal(true);
        // Do NOT call handleAuthSuccess here
        
      } else {
        // Login Flow
        const result = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if verified (Double check in case Cloud Function is slow or bypassed)
        if (!result.user.emailVerified) {
            // Optional: Allow login if created < 2 mins ago (handled by Cloud Function usually)
            // But for UX, we can show a warning or block if we want strict frontend enforcement too.
            // For now, we rely on the Cloud Function to throw error if blocked.
            // If we are here, Cloud Function allowed it.
        }
        
        await handleAuthSuccess(result.user);
      }
    } catch (err: any) {
      console.error("Email Auth Error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Este correo ya está registrado. Por favor, inicie sesión.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError("Credenciales incorrectas.");
      } else if (err.code === 'auth/weak-password') {
        setError("La contraseña es demasiado débil (mínimo 6 caracteres).");
      } else if (err.message && err.message.includes('permission-denied')) {
        setError("Acceso denegado. Por favor, verifique su correo electrónico.");
      } else {
        setError("Error de autenticación. Inténtelo de nuevo.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Por favor, introduzca su email para recuperar la contraseña.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Se ha enviado un enlace de recuperación a su correo.");
      setTimeout(() => {
        setShowForgotPassword(false);
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error("Reset Password Error:", err);
      setError("No se pudo enviar el correo. Verifique que la dirección sea correcta.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Implement Full Firebase WebAuthn / Passkey Logic here.
      // Currently this is a stub to demonstrate the UI and browser API call.
      
      // 1. Challenge from server (needed for real implementation)
      const challenge = new Uint8Array(32); 
      window.crypto.getRandomValues(challenge);

      // 2. Browser Native API Call
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: "required",
        }
      });

      if (credential) {
        console.log("Biometric credential received:", credential);
        // 3. Verify with Firebase Functions (Backend) -> Create Custom Token -> signInWithCustomToken
        // For demo, we just simulate success if we had a user
        // await handleAuthSuccess(mockUser);
      }
    } catch (err) {
      console.error("Biometric Login Error:", err);
      setError("No se pudo verificar la identidad biométrica.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- VERIFICATION MODAL ---
  if (showVerificationModal) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                  <div className="w-16 h-16 bg-ai-900/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                      <MailCheck size={32} className="text-ai-500" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-white mb-4">Verifique su Correo</h2>
                  <p className="text-stone-400 mb-6 leading-relaxed">
                      Hemos enviado un enlace de confirmación a <span className="text-white font-bold">{email}</span>.
                  </p>
                  <p className="text-sm text-stone-500 mb-8">
                      Por seguridad, no podrá acceder a la plataforma hasta que verifique su dirección. Revise su bandeja de entrada (y spam).
                  </p>
                  <button 
                      onClick={() => {
                          setShowVerificationModal(false);
                          setIsRegistering(false); // Switch to login mode
                      }}
                      className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-lg font-bold transition-colors"
                  >
                      Entendido, ir a Iniciar Sesión
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-[#0c0a09] text-stone-200 p-4 relative overflow-hidden ${isEmbedded ? 'h-full min-h-0 bg-transparent' : ''}`}>
      
      {!isEmbedded && (
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]"></div>
        </div>
      )}

      <div className="w-full max-w-md z-10 animate-fadeIn">
        
        {!isEmbedded && (
            <div className="text-center mb-8">
            <div className="inline-block p-4 rounded-full bg-stone-900/50 border border-stone-800 mb-4 shadow-xl">
                <Fingerprint size={40} className="text-stone-400" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-white mb-2">Bienvenido</h1>
            <p className="text-stone-500">Identifíquese para acceder al sistema.</p>
            </div>
        )}

        <div className={`bg-stone-900/50 backdrop-blur-md border border-stone-800 rounded-2xl p-8 shadow-2xl ${isEmbedded ? 'bg-transparent border-0 shadow-none p-0' : ''}`}>
          
          {/* TABS */}
          <div className="flex mb-8 bg-stone-950/50 p-1 rounded-lg border border-stone-800">
            <button 
              onClick={() => setIsRegistering(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${!isRegistering ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-500 hover:text-stone-300'}`}
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={() => setIsRegistering(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${isRegistering ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-500 hover:text-stone-300'}`}
            >
              Crear Cuenta
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start gap-3">
              <ShieldCheck className="text-red-500 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-red-200">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg flex items-start gap-3">
              <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-emerald-200">{successMessage}</p>
            </div>
          )}

          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4 animate-fadeIn">
               <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">Recuperar Contraseña</h3>
                  <p className="text-xs text-stone-500">Le enviaremos un enlace a su correo.</p>
               </div>
               <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-stone-600 transition-colors"
                    placeholder="nombre@ejemplo.com"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-stone-200 hover:bg-white text-black font-bold py-3 rounded-lg transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Enviar Enlace'}
              </button>
              <button 
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-xs text-stone-500 hover:text-white py-2"
              >
                Volver a Iniciar Sesión
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4 animate-fadeIn">
              
              {isRegistering && (
                <div className="space-y-2 animate-slideInUp">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Nombre Completo</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-stone-600 transition-colors"
                      placeholder="Su Nombre"
                      required={isRegistering}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-stone-600 transition-colors"
                    placeholder="nombre@ejemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-stone-600 transition-colors"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {!isRegistering && (
                <div className="flex justify-end">
                  <button 
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    ¿Olvidó su contraseña?
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-stone-200 hover:bg-white text-black font-bold py-3 rounded-lg transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : (isRegistering ? 'Crear Cuenta' : 'Acceder')}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#141210] px-2 text-stone-600">O continuar con</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 py-2.5 border border-stone-800 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-xs font-bold">Google</span>
                </button>
                <button 
                  type="button"
                  onClick={handleAppleLogin}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 py-2.5 border border-stone-800 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.62 4.37-1.62 1.03.06 2.04.5 2.87 1.22-2.56 1.55-2.15 5.75.38 6.98-.63 1.9-1.48 3.65-2.7 4.65zM12.03 5.68c.55-2.45 2.18-3.78 4.14-3.98-.09 2.52-2.1 4.39-4.14 3.98z" />
                  </svg>
                  <span className="text-xs font-bold">Apple</span>
                </button>
              </div>

              {isBiometricAvailable && (
                <div className="mt-4">
                  <button 
                    type="button"
                    onClick={handleBiometricLogin}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-stone-800 rounded-lg hover:bg-stone-800 transition-colors text-stone-400 hover:text-white"
                  >
                    <Fingerprint size={18} />
                    <span className="text-xs font-bold">Acceso Biométrico</span>
                  </button>
                </div>
              )}

            </form>
          )}
        </div>
      </div>
    </div>
  );
};


// SECURITY: Sanitize sensitive data before storing in localStorage
// This prevents CodeQL alert about storing sensitive information
const sanitizeProfileForStorage = (profile: UserProfile): UserProfile => {
  const sanitized = { ...profile };
  
  // Explicitly delete any sensitive fields that should NEVER be stored in localStorage
  const sensitiveFields = [
    'password',
    'passwordHash',
    'hash',
    'privateKey',
    'secretKey',
    'secret',
    'accessToken',
    'refreshToken',
    'sessionToken',
    'token',
    'credential',
    'credentials',
    'apiKey',
    'encryptedData',
    'sensitiveInfo'
  ] as const;
  
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      delete (sanitized as any)[field];
    }
  });
  
  return sanitized;
};

interface LoginScreenProps {
  onLoginSuccess?: () => void;
  isEmbedded?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, isEmbedded = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  
  // Auth State
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const auth = getAuth();

  useEffect(() => {
    // Check if WebAuthn is available
    if (window.PublicKeyCredential && 
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setIsBiometricAvailable(available))
        .catch(err => console.error("Biometric check failed", err));
    }
  }, []);

  const handleAuthSuccess = async (user: User) => {
    try {
      // 1. Check if user profile exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let profile: UserProfile;

      if (userSnap.exists()) {
        // 2a. Load existing profile
        profile = userSnap.data() as UserProfile;
        console.log("[Auth] Existing profile loaded:", profile.uid);
      } else {
        // 2b. Create new default profile
        console.log("[Auth] Creating new profile for:", user.uid);
        
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || name || 'Usuario',
          role: 'USER',
          age: 30, // Default
          gender: 'Not Specified',
          occupation: 'Digital Citizen',
          archetype: UserArchetype.ESENCIALISTA,
          subscriptionTier: SubscriptionTier.FREE,
          grantedPermissions: [],
          setupCompleted: false,
          dashboardConfig: {
            pillarOrder: DEFAULT_PILLAR_ORDER,
            hiddenPillars: []
          },
          themePreference: 'DARK'
        };

        await setDoc(userRef, newProfile);
        profile = newProfile;
      }

      // 3. Save to LocalStorage for ClientApp (sanitized)
      localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfileForStorage(profile)));

      // 4. Redirect
      if (onLoginSuccess) onLoginSuccess();

    } catch (err) {
      console.error("[Auth] Profile Sync Error:", err);
      setError("Error sincronizando perfil. Contacte con soporte.");
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handleAuthSuccess(result.user);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError("No se pudo iniciar sesión con Google. Inténtelo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const result = await signInWithPopup(auth, provider);
      await handleAuthSuccess(result.user);
    } catch (err: any) {
      console.error("Apple Login Error:", err);
      setError("No se pudo iniciar sesión con Apple. Inténtelo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setError("Por favor, introduzca email y contraseña.");
      return;
    }

    if (isRegistering && !name) {
      setError("Por favor, introduzca su nombre completo.");
      return;
    }

    setIsLoading(true);
    try {
      if (isRegistering) {
        // Registration Flow
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await handleAuthSuccess(result.user);
      } else {
        // Login Flow
        const result = await signInWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(result.user);
      }
    } catch (err: any) {
      console.error("Email Auth Error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Este correo ya está registrado. Por favor, inicie sesión.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError("Credenciales incorrectas.");
      } else if (err.code === 'auth/weak-password') {
        setError("La contraseña es demasiado débil (mínimo 6 caracteres).");
      } else {
        setError("Error de autenticación. Inténtelo de nuevo.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Por favor, introduzca su email para recuperar la contraseña.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Se ha enviado un enlace de recuperación a su correo.");
      setTimeout(() => {
        setShowForgotPassword(false);
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error("Reset Password Error:", err);
      setError("No se pudo enviar el correo. Verifique que la dirección sea correcta.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Implement Full Firebase WebAuthn / Passkey Logic here.
      // Currently this is a stub to demonstrate the UI and browser API call.
      
      // 1. Challenge from server (needed for real implementation)
      const challenge = new Uint8Array(32); 
      window.crypto.getRandomValues(challenge);

      // 2. Browser Native API Call
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: "required",
        }
      });

      if (credential) {
        console.log("Biometric credential received:", credential);
        // 3. Verify with Firebase Functions (Backend) -> Create Custom Token -> signInWithCustomToken
        // This part requires backend implementation.
        alert("Autenticación biométrica detectada. (Lógica de backend pendiente)");
      }

    } catch (err: any) {
      console.error("Biometric Error:", err);
      setError("No se detectó ninguna llave de acceso válida.");
    } finally {
      setIsLoading(false);
    }
  };

  const containerClasses = isEmbedded 
    ? "w-full max-w-md z-10 flex flex-col items-center space-y-6 bg-black/40 backdrop-blur-md p-8 rounded-2xl border border-stone-800 shadow-2xl"
    : "min-h-screen w-full bg-[#121212] flex flex-col items-center justify-center p-6 relative overflow-hidden";

  return (
    <div className={containerClasses}>
      
      {!isEmbedded && (
        <>
          {/* Background Noise/Texture */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }}>
          </div>

          {/* Gold Glow Effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D4AF37] rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
        </>
      )}

      <div className={`w-full ${!isEmbedded ? 'max-w-md z-10 flex flex-col items-center space-y-8 animate-fadeIn' : ''}`}>
        
        {/* Logo / Header - Only show if NOT embedded or simplified */}
        {!isEmbedded && (
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#D4AF37] to-[#8a7020] rounded-2xl flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 mb-6">
              <ShieldCheck className="w-8 h-8 text-[#121212]" />
            </div>
            <h1 className="text-3xl font-serif text-[#f5f5f4] tracking-wide">
              Mayordomo
            </h1>
            <p className="text-[#a8a29e] text-sm font-light tracking-widest uppercase">
              Acceso Seguro
            </p>
          </div>
        )}

        {isEmbedded && (
           <div className="text-center mb-4">
              <h2 className="text-xl font-serif text-white">
                {showForgotPassword ? 'Recuperar Cuenta' : (isRegistering ? 'Crear Cuenta' : 'Bienvenido de nuevo')}
              </h2>
              <p className="text-xs text-stone-400 uppercase tracking-widest mt-1">
                {showForgotPassword ? 'Restablezca su contraseña' : (isRegistering ? 'Únase a Mayordomo' : 'Acceda a su panel de control')}
              </p>
           </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="w-full bg-red-900/20 border border-red-800/50 text-red-200 px-4 py-3 rounded-lg text-sm text-center mb-4">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="w-full bg-green-900/20 border border-green-800/50 text-green-200 px-4 py-3 rounded-lg text-sm text-center mb-4">
            {successMessage}
          </div>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {showForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="w-full space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-[#57534e]" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electrónico"
                className="w-full bg-[#1c1917] border border-[#292524] text-[#e7e5e4] pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all placeholder-[#57534e]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#D4AF37] hover:bg-[#b68e29] text-[#121212] font-bold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#D4AF37]/20"
            >
              {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="w-full flex items-center justify-center gap-2 text-[#a8a29e] hover:text-[#D4AF37] text-sm transition-colors mt-4"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
            </button>
          </form>
        ) : (
          /* LOGIN / REGISTER VIEW */
          <div className="w-full space-y-4">
            
            {/* Google Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full group relative flex items-center justify-center gap-3 bg-[#1c1917] hover:bg-[#292524] border border-[#292524] hover:border-[#D4AF37]/50 text-[#e7e5e4] px-6 py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-medium">Continuar con Google</span>
            </button>

            {/* Apple Button */}
            <button
              onClick={handleAppleLogin}
              disabled={isLoading}
              className="w-full group relative flex items-center justify-center gap-3 bg-[#1c1917] hover:bg-[#292524] border border-[#292524] hover:border-[#D4AF37]/50 text-[#e7e5e4] px-6 py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.62 4.37-1.54 1.85.07 3.19.74 4.21 1.92-3.72 2.05-3.08 7.59.62 9.16-.62 1.54-1.44 3.08-2.79 4.41-.44.44-1.06.95-1.49.28zM12.03 7.25c-.15-2.2 1.62-4.12 3.68-4.25.29 2.42-2.2 4.41-3.68 4.25z" />
              </svg>
              <span className="font-medium">Continuar con Apple</span>
            </button>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#292524]"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#121212] px-4 text-xs text-[#57534e] uppercase tracking-widest">
                  o continúa con email
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              
              {/* Name Field - Only for Registration */}
              {isRegistering && (
                <div className="relative animate-fadeIn">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-[#57534e]" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full bg-[#1c1917] border border-[#292524] text-[#e7e5e4] pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all placeholder-[#57534e]"
                    required={isRegistering}
                  />
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#57534e]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  className="w-full bg-[#1c1917] border border-[#292524] text-[#e7e5e4] pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all placeholder-[#57534e]"
                  required
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#57534e]" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full bg-[#1c1917] border border-[#292524] text-[#e7e5e4] pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all placeholder-[#57534e]"
                  required
                />
              </div>

              {/* Forgot Password Link - Only for Login */}
              {!isRegistering && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-[#a8a29e] hover:text-[#D4AF37] transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#D4AF37] hover:bg-[#b68e29] text-[#121212] font-bold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#D4AF37]/20"
              >
                {isLoading ? 'Procesando...' : (isRegistering ? 'Registrarme' : 'Entrar')}
              </button>
            </form>

            {/* Toggle Login/Register */}
            <div className="text-center mt-4">
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-sm text-[#a8a29e] hover:text-[#D4AF37] transition-colors"
              >
                {isRegistering 
                  ? "¿Ya tienes cuenta? Inicia sesión" 
                  : "¿No tienes cuenta? Regístrate"}
              </button>
            </div>

            {/* Divider for Biometrics */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#292524]"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#121212] px-4 text-xs text-[#57534e] uppercase tracking-widest">
                  O usa biometría
                </span>
              </div>
            </div>

            {/* Biometric Button */}
            <button
              onClick={handleBiometricLogin}
              disabled={isLoading || !isBiometricAvailable}
              className={`w-full group relative flex items-center justify-center gap-3 px-6 py-4 rounded-xl transition-all duration-300 border
                ${isBiometricAvailable 
                  ? 'bg-gradient-to-r from-[#D4AF37]/10 to-[#8a7020]/10 border-[#D4AF37]/30 hover:border-[#D4AF37] text-[#D4AF37]' 
                  : 'bg-[#1c1917] border-[#292524] text-[#57534e] cursor-not-allowed'
                }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Fingerprint className="w-5 h-5" />
              )}
              <span className="font-medium">
                {isLoading ? 'Conectando...' : 'Acceso Biométrico'}
              </span>
              
              {/* Glow Effect on Hover */}
              {isBiometricAvailable && !isLoading && (
                <div className="absolute inset-0 rounded-xl bg-[#D4AF37] opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              )}
            </button>

          </div>
        )}

        {/* Footer */}
        <p className="text-[#57534e] text-xs text-center max-w-xs leading-relaxed">
          Al continuar, acepta nuestros <span className="text-[#78716c] hover:text-[#D4AF37] cursor-pointer transition-colors">Términos de Servicio</span> y <span className="text-[#78716c] hover:text-[#D4AF37] cursor-pointer transition-colors">Política de Privacidad</span>.
        </p>

      </div>
    </div>
  );
};
