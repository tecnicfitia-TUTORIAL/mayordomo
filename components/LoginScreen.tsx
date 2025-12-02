import React, { useState, useEffect } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider, fetchSignInMethodsForEmail } from 'firebase/auth';
import { Fingerprint, Loader2, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      if (onLoginSuccess) onLoginSuccess();
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
      await signInWithPopup(auth, provider);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.error("Apple Login Error:", err);
      setError("No se pudo iniciar sesión con Apple. Inténtelo de nuevo.");
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

  return (
    <div className="min-h-screen w-full bg-[#121212] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Noise/Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }}>
      </div>

      {/* Gold Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D4AF37] rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

      <div className="w-full max-w-md z-10 flex flex-col items-center space-y-8 animate-fadeIn">
        
        {/* Logo / Header */}
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

        {/* Error Message */}
        {error && (
          <div className="w-full bg-red-900/20 border border-red-800/50 text-red-200 px-4 py-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* Login Options */}
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

        {/* Footer */}
        <p className="text-[#57534e] text-xs text-center max-w-xs leading-relaxed">
          Al continuar, acepta nuestros <span className="text-[#78716c] hover:text-[#D4AF37] cursor-pointer transition-colors">Términos de Servicio</span> y <span className="text-[#78716c] hover:text-[#D4AF37] cursor-pointer transition-colors">Política de Privacidad</span>.
        </p>

      </div>
    </div>
  );
};
