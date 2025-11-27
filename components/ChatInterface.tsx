
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, PillarStatus, ChatMessage } from '../types';
import { generateChatResponse } from '../services/geminiService';
import { Send, Sparkles } from 'lucide-react';

interface Props {
  userProfile: UserProfile;
  pillarStatuses: PillarStatus[];
}

export const ChatInterface: React.FC<Props> = ({ userProfile, pillarStatuses }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mensaje inicial basado en el estado de los pilares
    const degradedCount = pillarStatuses.filter(p => p.isActive && p.isDegraded).length;
    let intro = `Bienvenido, ${userProfile.name}. Soy su Mayordomo Digital.`;
    
    if (degradedCount > 0) {
      intro += ` Detecto ${degradedCount} pilares operativos pero con acceso manual limitado. ¿En qué puedo asistirle?`;
    } else {
      intro += ` Todos sus sistemas operativos están sincronizados. A su servicio.`;
    }

    setMessages([{
      id: 'init', role: 'model', text: intro, timestamp: new Date()
    }]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const responseText = await generateChatResponse(history, userMsg.text, pillarStatuses, userProfile);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-full relative z-10">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-sm text-sm font-serif leading-relaxed shadow-lg ${
              msg.role === 'user' ? 'bg-stone-800 text-stone-200 border-r-2 border-stone-600' : 'bg-black/80 text-ai-100 border-l-2 border-ai-600'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start animate-pulse">
             <div className="bg-black/50 p-3 rounded text-xs text-ai-500 font-serif italic border-l-2 border-ai-800">
               Procesando solicitud...
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-stone-950 border-t border-stone-800">
        <div className="flex items-center gap-2 relative">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Escriba su orden..."
            className="w-full bg-stone-900 border border-stone-700 p-3 pl-4 pr-12 text-sm text-white focus:border-ai-500 outline-none rounded-sm font-serif placeholder-stone-600"
          />
          <button onClick={handleSend} disabled={!input || isTyping} className="absolute right-2 p-2 text-ai-500 hover:text-ai-400 transition-colors disabled:opacity-50">
             <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
