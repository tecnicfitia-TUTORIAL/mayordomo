import React, { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { BankService } from '../services/bankService';
import { Loader2, Landmark, AlertCircle } from 'lucide-react';

interface Props {
  userId: string;
  onSuccess: () => void;
}

export const PlaidConnectButton: React.FC<Props> = ({ userId, onSuccess }) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createToken = async () => {
      try {
        setError(null);
        const t = await BankService.createLinkToken(userId);
        setToken(t);
      } catch (e: any) {
        console.error("Failed to create link token", e);
        setError(e.message || "Error de conexión");
      } finally {
        setLoading(false);
      }
    };
    if (userId) createToken();
  }, [userId]);

  const [isExchanging, setIsExchanging] = useState(false);

  const { open, ready } = usePlaidLink({
    token,
    onSuccess: async (public_token) => {
      setIsExchanging(true);
      setLoading(true);
      try {
        // Mostrar mensaje claro durante el intercambio
        await BankService.exchangePublicToken(public_token, userId);
        onSuccess();
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsExchanging(false);
        setLoading(false);
      }
    },
  });

  if (error) {
      return (
          <div className="w-full bg-red-900/20 border border-red-500/30 p-3 rounded-lg flex items-center gap-2 text-xs text-red-400">
              <AlertCircle size={16} />
              <span>{error}</span>
          </div>
      );
  }

  return (
    <div className="w-full">
      <button 
          onClick={() => open()} 
          disabled={!ready || loading}
          className="w-full bg-ai-600 hover:bg-ai-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-lg flex items-center justify-center gap-2 uppercase tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all active:scale-[0.98]"
      >
          {isExchanging ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Intercambiando tokens de forma segura...</span>
            </>
          ) : loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Conectando...</span>
            </>
          ) : (
            <>
              <Landmark size={20} />
              <span>Conectar Banco</span>
            </>
          )}
      </button>
      {isExchanging && (
        <p className="text-[9px] text-stone-500 text-center mt-2">
          🔒 Encriptando y guardando credenciales de forma segura...
        </p>
      )}
    </div>
  );
};
