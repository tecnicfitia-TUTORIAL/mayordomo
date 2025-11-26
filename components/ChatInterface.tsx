
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, HouseSector, UserProfile, Attachment } from '../types';
import { Send, Sparkles, Mic, Paperclip, X, FileText, Film, ArrowLeft, Feather, Camera } from 'lucide-react';
import { generateChatResponse } from '../services/geminiService';

interface Props {
  sectors: HouseSector[];
  userProfile?: UserProfile;
  onBack?: () => void; // Optional prop for mobile navigation
}

export const ChatInterface: React.FC<Props> = ({ sectors, userProfile, onBack }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Initial message effect to handle profile changes
  useEffect(() => {
    const initialMsg: ChatMessage = {
      id: 'intro',
      role: 'model',
      text: userProfile 
        ? `Sistema iniciado. Arquetipo: ${userProfile.archetype}. He organizado los registros. ¿Qué desea gestionar hoy?`
        : "Bienvenido a Confort. Gestiono el 65% de la carga operativa. ¿Desea revisar algún registro?",
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

  // Voice Logic
  const handleMicClick = () => {
    if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
        return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Tu navegador no soporta reconocimiento de voz nativo.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false; // Keep false for simple click-speak-send flow
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
        setInput(transcript);
    };

    recognition.onerror = (event: any) => {
        console.error("Error voz:", event.error);
        setIsListening(false);
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // File Handling Logic
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix (e.g., "data:image/jpeg;base64,") to get raw base64
          const base64Content = reader.result.split(',')[1];
          resolve(base64Content);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: Attachment[] = [];
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        try {
            const base64 = await fileToBase64(file);
            const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
            
            newAttachments.push({
              type,
              mimeType: file.type,
              data: base64, // Store raw base64 for API
              name: file.name
            });
        } catch (err) {
            console.error("Error processing file", file.name, err);
        }
      }
      
      setAttachments(prev => [...prev, ...newAttachments]);
      
      // Clear input value to allow selecting the same file again if needed
      e.target.value = '';
    }
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
      attachments: [...attachments] // Copy current attachments to the message
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]); // Clear attachments staging area
    setIsTyping(true);

    // Generate history safely. 
    // Gemini API throws 400 if text is empty string in history parts.
    // We replace empty text with a placeholder if there was an attachment but no text.
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
    <div className="flex flex-col h-full bg-dark-900 border-double border-4 border-stone-800 rounded-sm overflow-hidden shadow-2xl relative">
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        className="hidden"
      />

      <input 
        type="file" 
        ref={cameraInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        capture="environment" // Opens camera directly on mobile
        className="hidden"
      />
      
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] pointer-events-none"></div>

      {/* Header */}
      <div className="p-4 border-b border-stone-800 bg-dark-950/80 flex items-center gap-3 relative z-10">
        {/* Mobile Back Button */}
        {onBack && (
            <button 
                onClick={onBack} 
                className="md:hidden p-2 mr-1 -ml-2 rounded-full hover:bg-stone-800 text-stone-500 hover:text-white transition-colors"
            >
                <ArrowLeft size={20} />
            </button>
        )}

        <div className="w-10 h-10 rounded-sm border border-ai-500/30 bg-ai-900/20 flex items-center justify-center shadow-lg">
          <Sparkles size={18} className="text-ai-500" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-stone-200 text-lg">Asistente Confort</h3>
          <p className="text-[10px] text-ai-600 flex items-center gap-1 font-serif tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-ai-600 animate-pulse"/> 
            En Línea • {userProfile?.archetype || 'Estándar'}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide relative z-10">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Role Label */}
            <span className={`text-[9px] font-serif uppercase tracking-widest mb-1 ${msg.role === 'user' ? 'text-user-500 mr-1' : 'text-ai-600 ml-1'}`}>
                {msg.role === 'user' ? 'Yo' : 'Confort'}
            </span>

            {/* Message Attachments (Sent) */}
            {msg.attachments && msg.attachments.length > 0 && (
              <div className={`mb-2 flex flex-wrap gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.attachments.map((att, idx) => (
                  <div key={idx} className="relative group overflow-hidden rounded-sm border border-stone-700 w-24 h-24 flex items-center justify-center bg-dark-950 shadow-md">
                    {att.type === 'image' ? (
                      <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-full h-full object-cover opacity-90" />
                    ) : att.type === 'video' ? (
                      <div className="flex flex-col items-center text-stone-500">
                        <Film size={24} />
                        <span className="text-[8px] mt-1 px-1 truncate max-w-full font-serif text-center w-20">{att.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-stone-500">
                        <FileText size={24} />
                        <span className="text-[8px] mt-1 px-1 truncate max-w-full font-serif text-center w-20">{att.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div
              className={`max-w-[85%] p-5 text-sm font-serif leading-relaxed relative shadow-md ${
                msg.role === 'user'
                  ? 'bg-user-900/20 text-stone-200 border-l-2 border-user-500'
                  : 'bg-dark-950 text-stone-300 border-l-2 border-ai-600'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-dark-950 border-l-2 border-stone-700 px-4 py-3 text-xs text-stone-500 flex items-center gap-2 font-serif italic">
              <Feather size={12} /> Escribiendo...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview Area (Active Input / Staging) */}
      {attachments.length > 0 && (
        <div className="px-4 py-3 bg-dark-950 border-t border-stone-800 flex gap-3 overflow-x-auto relative z-10 shadow-inner">
          {attachments.map((att, index) => (
            <div key={index} className="relative flex-shrink-0 w-16 h-16 bg-stone-900 rounded-sm border border-stone-700 flex items-center justify-center group">
              <button 
                onClick={() => removeAttachment(index)}
                className="absolute -top-2 -right-2 bg-user-700 text-white rounded-full p-1 z-10 shadow-md hover:bg-user-600 transition-transform transform hover:scale-110"
                title="Eliminar"
              >
                <X size={10} />
              </button>
              {att.type === 'image' ? (
                 <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="w-full h-full object-cover opacity-80" />
              ) : (
                 <FileText size={20} className="text-stone-500" />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[8px] text-white truncate px-1 text-center">
                  {att.name.length > 10 ? att.name.substring(0, 8) + '...' : att.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-5 bg-dark-950 border-t border-stone-800 relative z-10">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "Escuchando..." : "Escriba una nota para el núcleo..."}
            className={`w-full bg-dark-900 border-b border-stone-700 rounded-none pl-2 pr-28 py-3 text-sm text-stone-200 font-serif focus:outline-none focus:border-ai-500 transition-all placeholder:text-stone-600 placeholder:italic ${isListening ? 'border-user-500 text-user-200' : ''}`}
          />
          <div className="absolute right-0 flex items-center gap-2">
            
            {/* Camera Button */}
            <button 
              onClick={() => cameraInputRef.current?.click()}
              className="p-2 text-stone-500 hover:text-ai-400 hover:bg-ai-900/10 rounded-full transition-colors" 
              title="Tomar Foto"
            >
               <Camera size={18} />
            </button>

            {/* File Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-stone-500 hover:text-ai-400 hover:bg-ai-900/10 rounded-full transition-colors" 
              title="Adjuntar Archivo"
            >
               <Paperclip size={18} />
            </button>
            
            {/* Mic Button */}
            <div className="relative">
                {isListening && (
                    <div className="absolute inset-0 bg-user-700 rounded-full animate-ping opacity-50"></div>
                )}
                <button 
                  onClick={handleMicClick}
                  className={`relative z-10 p-2 rounded-full transition-all ${
                    isListening 
                      ? 'bg-user-700 text-white' 
                      : 'text-stone-500 hover:text-ai-400 hover:bg-ai-900/10'
                  }`} 
                  title={isListening ? "Detener" : "Dictar"}
                >
                   <Mic size={18} className={isListening ? 'animate-bounce' : ''} />
                </button>
            </div>

            {/* Send Button */}
            <button 
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || isTyping}
              className="p-2 bg-ai-700 hover:bg-ai-600 text-stone-100 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md border border-ai-600"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
