
import React from 'react';
import { X, FileText, Shield, Building2 } from 'lucide-react';

interface Props {
  type: 'PRIVACY' | 'TERMS' | 'NOTICE';
  onClose: () => void;
}

export const LegalModal: React.FC<Props> = ({ type, onClose }) => {
  const getHeader = () => {
      switch(type) {
          case 'PRIVACY': return { title: 'Política de Privacidad', icon: <Shield size={20} className="text-ai-500" /> };
          case 'TERMS': return { title: 'Términos de Servicio', icon: <FileText size={20} className="text-ai-500" /> };
          case 'NOTICE': return { title: 'Aviso Legal', icon: <Building2 size={20} className="text-ai-500" /> };
      }
  };

  const header = getHeader();

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {header.icon}
            {header.title}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar text-slate-300 text-sm leading-relaxed space-y-4">
          {type === 'PRIVACY' && (
            <>
              <p><strong>1. Introducción:</strong> Confort OS valora su privacidad. Esta política describe cómo manejamos sus datos en el contexto de la asistencia por IA.</p>
              <p><strong>2. Datos Recopilados:</strong> Recopilamos datos proporcionados voluntariamente (imágenes, texto, voz) para el funcionamiento del Asistente Confort.</p>
              <p><strong>3. Uso de IA:</strong> Sus datos son procesados por modelos de IA (Google Gemini) para generar insights. Los datos se transmiten de forma encriptada.</p>
              <p><strong>4. Derechos del Usuario:</strong> Puede solicitar el borrado completo de sus datos desde la sección "Zona de Peligro" en Ajustes.</p>
            </>
          )}
          
          {type === 'TERMS' && (
            <>
              <p><strong>1. Aceptación:</strong> Al usar Confort OS, acepta estos términos. El servicio se proporciona "tal cual".</p>
              <p><strong>2. Uso Permitido:</strong> Usted es responsable de la seguridad de su cuenta. No debe usar el servicio para actividades ilegales.</p>
              <p><strong>3. Limitación de Responsabilidad:</strong> Confort Technologies Inc. no se hace responsable de decisiones financieras o vitales tomadas basándose únicamente en sugerencias de la IA.</p>
              <p><strong>4. Suscripciones:</strong> Los planes se renuevan automáticamente a menos que se cancelen 24h antes.</p>
            </>
          )}

          {type === 'NOTICE' && (
            <>
              <p><strong>1. Identificación del Titular:</strong></p>
              <ul className="list-none pl-4 space-y-1 text-slate-400 border-l-2 border-slate-700">
                  <li><strong>Razón Social:</strong> Confort Technologies Inc.</li>
                  <li><strong>Domicilio Social:</strong> Calle Innovación 123, 28001 Madrid, España.</li>
                  <li><strong>NIF/VAT:</strong> ES-B12345678</li>
                  <li><strong>Email:</strong> legal@confort.app</li>
              </ul>
              <p><strong>2. Propiedad Intelectual:</strong> Todo el código, diseño y algoritmos de "Confort 65/35" son propiedad exclusiva de Confort Technologies Inc.</p>
              <p><strong>3. Legislación Aplicable:</strong> Este Aviso Legal se rige por la ley española.</p>
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium">
            Cerrar Documento
          </button>
        </div>
      </div>
    </div>
  );
};
