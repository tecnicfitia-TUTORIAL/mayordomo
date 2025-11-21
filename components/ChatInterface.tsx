
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, HouseSector, UserProfile, Attachment } from '../types';
import { Send, Sparkles, Mic, Paperclip, X, FileText, Film } from 'lucide-react';
import { generateChatResponse } from '../services/geminiService';

interface Props {
  sectors: HouseSector[];
  userProfile?: UserProfile;
}

export const ChatInterface: React.FC<Props> = ({ sectors, userProfile }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initial message effect to handle profile changes
  useEffect(() => {
    const initialMsg: ChatMessage = {
      id: 'intro',
      role: 'model',
      text: userProfile 
        ? `Sistema iniciado. Modo: ${userProfile.archetype}. He estructurado tu zona de confort para priorizar lo que te importa. ¿Qué gestionamos hoy?`
        : "Bienvenido a tu Confort. Actualmente estoy gestionando el 65% de la carga operativa. ¿Quieres que revisemos algo?",
      timestamp: new Date()
    };
    setMessages([initialMsg]);
  }, [userProfile]);

  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // File Handling
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: Attachment[] = [];
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const base64 = await fileToBase64(file);
        const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
        
        newAttachments.push({
          type,
          mimeType: file.type,
          data: base64,
          name: file.name
        });
      }
      
      setAttachments(prev => [...prev, ...newAttachments]);
      
      // Clear input value to allow selecting the same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Content = reader.result.split(',')[1];
          resolve(base64Content);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
      attachments: [...attachments] // Copy current attachments
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]); // Clear attachments after sending
    setIsTyping(true);

    // Generate history safely. 
    // Gemini API throws 400 if text is empty string in history parts.
    // We replace empty text with a placeholder if there was an attachment.
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ 
        text: m.text && m.text.trim() !== "" 
          ? m.text 
          : "[Archivo adjunto analizado]" 
      }] 
    }));

    const responseText = await generateChatResponse(history, userMsg.text, sectors, userProfile, userMsg.attachments);

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
    <div className="flex flex-col h-full bg-slate-900/50 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden shadow-2xl">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        className="hidden"
      />

      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-slate-900/80 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ai-400 to-ai-600 flex items-center justify-center shadow-lg shadow-ai-500/20">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-200">Asistente Confort</h3>
          <p className="text-xs text-ai-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-ai-400 animate-pulse"/> 
            Activo • {userProfile?.archetype || 'Estándar'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Attachments Display */}
            {msg.attachments && msg.attachments.length > 0 && (
              <div className={`mb-2 flex flex-wrap gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.attachments.map((att, idx) => (
                  <div key={idx} className="relative group overflow-hidden rounded-lg border border-white/10 w-24 h-24 flex items-center justify-center bg-slate-800">
                    {att.type === 'image' ? (
                      <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-full h-full object-cover" />
                    ) : att.type === 'video' ? (
                      <div className="flex flex-col items-center text-slate-400">
                        <Film size={24} />
                        <span className="text-[8px] mt-1 px-1 truncate max-w-full">{att.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <FileText size={24} />
                        <span className="text-[8px] mt-1 px-1 truncate max-w-full">{att.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div
              className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-user-600 text-white rounded-tr-sm'
                  : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-white/5'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-slate-800 px-4 py-2 rounded-2xl rounded-tl-sm text-xs text-slate-400 flex items-center gap-1">
              <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
              <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
              <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview Area (Active Input) */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-slate-900/90 border-t border-white/5 flex gap-3 overflow-x-auto">
          {attachments.map((att, index) => (
            <div key={index} className="relative flex-shrink-0 w-16 h-16 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center group">
              <button 
                onClick={() => removeAttachment(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 z-10 shadow-md hover:bg-red-600"
              >
                <X size={12} />
              </button>
              {att.type === 'image' ? (
                 <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="w-full h-full object-cover rounded-lg" />
              ) : att.type === 'video' ? (
                 <Film size={20} className="text-slate-400" />
              ) : (
                 <FileText size={20} className="text-slate-400" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-slate-900/80 border-t border-white/5">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Hablar con el núcleo..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-24 py-3 text-sm text-slate-200 focus:outline-none focus:border-ai-500/50 focus:ring-1 focus:ring-ai-500/50 transition-all placeholder:text-slate-600"
          />
          <div className="absolute right-2 flex items-center gap-1">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors" 
              title="Adjuntar imagen, video o archivo"
            >
               <Paperclip size={18} />
            </button>
            <button className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors" title="Usar voz">
               <Mic size={18} />
            </button>
            <button 
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || isTyping}
              className="p-2 bg-ai-600 hover:bg-ai-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-ai-500/20"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
