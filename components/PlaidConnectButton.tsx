import React, { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { BankService } from '../services/bankService';
import { Loader2, Landmark } from 'lucide-react';

interface Props {
  userId: string;
  onSuccess: () => void;
}

export const PlaidConnectButton: React.FC<Props> = ({ userId, onSuccess }) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const createToken = async () => {
      try {
        const t = await BankService.createLinkToken(userId);
        setToken(t);
      } catch (e) {
        console.error("Failed to create link token", e);
      } finally {
        setLoading(false);
      }
    };
    createToken();
  }, [userId]);

  const { open, ready } = usePlaidLink({
    token,
    onSuccess: async (public_token) => {
      setLoading(true);
      await BankService.exchangePublicToken(public_token, userId);
      setLoading(false);
      onSuccess();
    },
  });

  return (
    <button 
        onClick={() => open()} 
        disabled={!ready || loading}
        className="w-full bg-ai-600 hover:bg-ai-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-lg flex items-center justify-center gap-2 uppercase tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all active:scale-[0.98]"
    >
        {loading ? <Loader2 className="animate-spin" size={20} /> : <Landmark size={20} />}
        {loading ? 'Conectando...' : 'Conectar Banco'}
    </button>
  );
};
