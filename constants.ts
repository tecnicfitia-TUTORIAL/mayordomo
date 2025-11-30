
import { PillarId, SubscriptionTier, TechnicalPermission, UserArchetype, FeatureMatrixItem } from "./types";

// --- STRIPE CONFIGURATION ---
export const STRIPE_URLS = {
  [SubscriptionTier.BASIC]: 'https://buy.stripe.com/bJe6oJcyifwI0bnaVxc7u05', // Asistente
  [SubscriptionTier.PRO]: 'https://buy.stripe.com/fZu3cxgOy2JW9LX7Jlc7u06',   // Mayordomo
  [SubscriptionTier.VIP]: 'https://buy.stripe.com/bJecN755QdoA9LXd3Fc7u07',   // Gobernante
  PORTAL: 'https://billing.stripe.com/p/login/28E28t7dYesE2jv0gTc7u01'        // Customer Portal
};

// --- UNIVERSAL CATEGORIES (New Contextual Engine) ---
export const UNIVERSAL_CATEGORIES = {
  [PillarId.CENTINELA]: [
    { id: 'global_id', label: 'Identidad Global', keywords: ['Passport', 'Visa', 'Residency', 'DNI', 'Green Card'] },
    { id: 'geo_tax', label: 'Fiscalidad Territorial', keywords: ['IRPF', 'Tax Return', 'Hacienda', 'IRS', 'Revenue'] },
    { id: 'legal_mobility', label: 'Movilidad Legal', keywords: ['Driving License', 'Carnet Conducir', 'ITV', 'MOT'] },
    { id: 'civics', label: 'Civismo', keywords: ['Census', 'Padrón', 'Voting', 'Electoral'] }
  ],
  [PillarId.PATRIMONIO]: [
    { id: 'critical_utils', label: 'Suministros Críticos', keywords: ['Water', 'Electricity', 'Gas', 'Internet', 'Broadband'] },
    { id: 'real_estate', label: 'Activos Inmobiliarios', keywords: ['Lease', 'Deed', 'Hipoteca', 'Alquiler', 'Escritura'] },
    { id: 'movable_assets', label: 'Patrimonio Mueble', keywords: ['Vehicle', 'Jewelry', 'Crypto', 'Stocks'] }
  ]
};

// --- VISUAL ATMOSPHERE PRESETS ---
export const VISUAL_PRESETS = [
  { 
    id: 'ONYX', 
    label: 'Onyx', 
    cssClass: 'bg-[#0c0a09]', 
    previewColor: '#0c0a09' 
  },
  { 
    id: 'ROYAL', 
    label: 'Royal', 
    cssClass: 'bg-gradient-to-br from-stone-950 via-black to-ai-900/20', 
    previewColor: 'linear-gradient(135deg, #0c0a09, #332a15)' 
  },
  { 
    id: 'MIDNIGHT', 
    label: 'Midnight', 
    cssClass: 'bg-gradient-to-b from-[#020617] to-black', 
    previewColor: '#020617' 
  },
  { 
    id: 'EXECUTIVE', 
    label: 'Executive', 
    cssClass: 'bg-stone-900', 
    previewColor: '#1c1917' 
  }
];

// --- A. LOS 5 PILARES (MÓDULOS) ---

export const PILLAR_DEFINITIONS = {
  [PillarId.CENTINELA]: {
    name: "El Centinela",
    description: "Gestión Legal, Administrativa y Burocrática.",
    minTier: SubscriptionTier.FREE,
  },
  [PillarId.PATRIMONIO]: {
    name: "Hogar y Finanzas",
    description: "Activos, Consumos, Garantías y Banca.",
    minTier: SubscriptionTier.BASIC,
  },
  [PillarId.CONCIERGE]: {
    name: "Concierge",
    description: "Ocio, Viajes y Experiencias.",
    minTier: SubscriptionTier.BASIC,
  },
  [PillarId.VITAL]: {
    name: "Coach Vital",
    description: "Salud, Biometría y Desarrollo Personal.",
    minTier: SubscriptionTier.PRO,
  },
  [PillarId.NUCLEO]: {
    name: "Núcleo Familiar",
    description: "Logística de terceros, Empleados y Dependientes.",
    minTier: SubscriptionTier.VIP,
  }
};

// --- B. LISTA MAESTRA DE PERMISOS TÉCNICOS ---

export const TECHNICAL_PERMISSIONS: TechnicalPermission[] = [
  // SISTÉMICOS (Base)
  {
    id: 'sys_notifications',
    label: 'Notificaciones Push',
    description: 'Para avisos urgentes del Centinela.',
    category: 'SYSTEMIC',
    relatedPillar: PillarId.CENTINELA,
    requiredForFullFeature: true,
    minTier: SubscriptionTier.FREE
  },
  {
    id: 'sys_storage',
    label: 'Almacenamiento Local',
    description: 'Para guardar facturas y documentos encriptados.',
    category: 'SYSTEMIC',
    relatedPillar: PillarId.CENTINELA,
    requiredForFullFeature: true,
    minTier: SubscriptionTier.FREE
  },
  {
    id: 'sys_biometrics',
    label: 'Biometría',
    description: 'Acceso seguro mediante FaceID/TouchID.',
    category: 'SYSTEMIC',
    relatedPillar: PillarId.CENTINELA,
    requiredForFullFeature: true,
    minTier: SubscriptionTier.FREE
  },

  // FUNCIONALES (Por Pilar)
  { 
    id: 'func_digital_cert', 
    label: 'Certificado Digital', 
    description: 'Consultar multas y puntos DGT.', 
    category: 'FUNCTIONAL', 
    relatedPillar: PillarId.CENTINELA, 
    requiredForFullFeature: true,
    minTier: SubscriptionTier.PRO 
  },
  { 
    id: 'func_dehu_sync', 
    label: 'Conexión DEHú', 
    description: 'Lectura de notificaciones oficiales.', 
    category: 'FUNCTIONAL', 
    relatedPillar: PillarId.CENTINELA, 
    requiredForFullFeature: true,
    minTier: SubscriptionTier.PRO 
  },
  { 
    id: 'func_camera_ocr', 
    label: 'Cámara OCR', 
    description: 'Escanear tickets y garantías.', 
    category: 'FUNCTIONAL', 
    relatedPillar: PillarId.PATRIMONIO, 
    requiredForFullFeature: false,
    minTier: SubscriptionTier.BASIC
  },
  { 
    id: 'func_open_banking', 
    label: 'Banca (PSD2)', 
    description: 'Lectura de saldos y movimientos.', 
    category: 'FUNCTIONAL', 
    relatedPillar: PillarId.PATRIMONIO, 
    requiredForFullFeature: true,
    minTier: SubscriptionTier.PRO 
  },
  { 
    id: 'func_email_parsing', 
    label: 'Lectura Email', 
    description: 'Detecta facturas en inbox.', 
    category: 'FUNCTIONAL', 
    relatedPillar: PillarId.PATRIMONIO, 
    requiredForFullFeature: true,
    minTier: SubscriptionTier.BASIC
  },
  { 
    id: 'func_location', 
    label: 'Ubicación', 
    description: 'Logística y clima.', 
    category: 'FUNCTIONAL', 
    relatedPillar: PillarId.CONCIERGE, 
    requiredForFullFeature: false,
    minTier: SubscriptionTier.FREE 
  },
  { 
    id: 'func_calendar_write', 
    label: 'Escritura Calendario', 
    description: 'Agendar reservas.', 
    category: 'FUNCTIONAL', 
    relatedPillar: PillarId.CONCIERGE, 
    requiredForFullFeature: true,
    minTier: SubscriptionTier.BASIC
  },
  { 
    id: 'func_health_kit', 
    label: 'Salud (HealthKit)', 
    description: 'Sueño, pasos, estrés.', 
    category: 'FUNCTIONAL', 
    relatedPillar: PillarId.VITAL, 
    requiredForFullFeature: true,
    minTier: SubscriptionTier.PRO 
  },
  { 
    id: 'func_linkedin_sync', 
    label: 'Perfil Profesional', 
    description: 'Análisis de carrera.', 
    category: 'FUNCTIONAL', 
    relatedPillar: PillarId.VITAL, 
    requiredForFullFeature: false,
    minTier: SubscriptionTier.PRO
  },
  { 
    id: 'func_contacts', 
    label: 'Contactos', 
    description: 'Coordinar familia.', 
    category: 'FUNCTIONAL', 
    relatedPillar: PillarId.NUCLEO, 
    requiredForFullFeature: true,
    minTier: SubscriptionTier.VIP
  },
  { 
    id: 'func_calendar_read_shared', 
    label: 'Calendarios Terceros', 
    description: 'Conflictos familiares.', 
    category: 'FUNCTIONAL', 
    relatedPillar: PillarId.NUCLEO, 
    requiredForFullFeature: true,
    minTier: SubscriptionTier.VIP
  }
];

// --- C. MATRIZ DE PERMISOS MAESTRA (25 FEATURES x 4 TIERS) ---

export const PERMISSIONS_MATRIX: FeatureMatrixItem[] = [
  // === 1. CENTINELA (5 Features) ===
  {
    id: 'cent_expiry_alert', pillarId: PillarId.CENTINELA, name: 'Alertas Documentos', description: 'Caducidad DNI/Pasaporte.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: null, automation_level: 'manual', behavior: "Aviso calculado manualmente." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'semi', behavior: "Lectura OCR y aviso en calendario." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'full', behavior: "Solicitud de cita previa automática." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Gestión completa de renovación." }
    }
  },
  {
    id: 'cent_traffic_fine', pillarId: PillarId.CENTINELA, name: 'Detección Multas', description: 'Rastreo BOE/DGT.',
    requiredPermissionId: 'func_digital_cert',
    tiers: {
      [SubscriptionTier.FREE]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.BASIC]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'semi', behavior: "Alerta de publicación en BOE." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Preparación de recurso o pago para validación." }
    }
  },
  {
    id: 'cent_taxes', pillarId: PillarId.CENTINELA, name: 'Calendario Fiscal', description: 'Avisos Hacienda.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: null, automation_level: 'manual', behavior: "Calendario genérico nacional." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'semi', behavior: "Personalizado por CCAA." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'full', behavior: "Estimación de IRPF tiempo real." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Preparación de borradores para revisión." }
    }
  },
  {
    id: 'cent_digital_id', pillarId: PillarId.CENTINELA, name: 'Identidad Digital', description: 'Gestión de claves.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: 3, automation_level: 'manual', behavior: "Bóveda manual (3 items)." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'manual', behavior: "Bóveda ilimitada encriptada." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'semi', behavior: "Aviso de filtración de claves (Dark Web)." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Rotación automática de passwords." }
    }
  },
  {
    id: 'cent_official_notif', pillarId: PillarId.CENTINELA, name: 'Buzón 060 / DEHú', description: 'Notificaciones Estado.',
    requiredPermissionId: 'func_dehu_sync',
    tiers: {
      [SubscriptionTier.FREE]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.BASIC]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'semi', behavior: "Lectura y resumen de notificación." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Acuse de recibo y archivo legal." }
    }
  },

  // === 2. PATRIMONIO (5 Features) ===
  {
    id: 'pat_expenses', pillarId: PillarId.PATRIMONIO, name: 'Registro de Gastos', description: 'Control de flujo de caja.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: null, automation_level: 'manual', behavior: "Input manual de datos." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'semi', behavior: "Escaneo de tickets (OCR)." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'full', behavior: "Sincronización bancaria (Lectura)." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Categorización y auditoría fiscal." }
    }
  },
  {
    id: 'pat_subscriptions', pillarId: PillarId.PATRIMONIO, name: 'Gestor Suscripciones', description: 'Control de recurrentes.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: 5, automation_level: 'manual', behavior: "Lista manual (Max 5)." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'semi', behavior: "Detección vía Email." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'full', behavior: "Detección vía Banco." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Preparación cancelación en 1-Click." }
    }
  },
  {
    id: 'pat_warranties', pillarId: PillarId.PATRIMONIO, name: 'Garantías y Activos', description: 'Archivo de compras.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: 3, automation_level: 'manual', behavior: "Foto simple." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'semi', behavior: "Extracción fecha fin garantía." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'full', behavior: "Aviso pre-fin garantía." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Reclamación automática al vendedor." }
    }
  },
  {
    id: 'pat_energy', pillarId: PillarId.PATRIMONIO, name: 'Optimización Energía', description: 'Luz y Gas.',
    tiers: {
      [SubscriptionTier.FREE]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'manual', behavior: "Gráficas de consumo." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'semi', behavior: "Comparador de tarifas auto." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Preparación de cambio de compañía." }
    }
  },
  {
    id: 'pat_wealth', pillarId: PillarId.PATRIMONIO, name: 'Patrimonio Neto', description: 'Valoración total.',
    tiers: {
      [SubscriptionTier.FREE]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.BASIC]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'semi', behavior: "Cálculo Activos vs Pasivos." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Proyección a 5 años e inversión." }
    }
  },

  // === 3. CONCIERGE (5 Features) ===
  {
    id: 'con_agenda', pillarId: PillarId.CONCIERGE, name: 'Agenda Diaria', description: 'Optimización tiempo.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: null, automation_level: 'manual', behavior: "Visualización calendario." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'semi', behavior: "Sugerencia de huecos libres." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'full', behavior: "Reagendamiento inteligente." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Defensa de tiempo (Rechazo auto)." }
    }
  },
  {
    id: 'con_travel', pillarId: PillarId.CONCIERGE, name: 'Gestión Viajes', description: 'Logística movimientos.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: null, automation_level: 'manual', behavior: "Lista de empaque genérica." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'semi', behavior: "Agrupación de billetes (Wallet)." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'full', behavior: "Check-in automático." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Gestión incidencias y reembolsos." }
    }
  },
  {
    id: 'con_leisure', pillarId: PillarId.CONCIERGE, name: 'Planes y Ocio', description: 'Recomendaciones.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: 3, automation_level: 'manual', behavior: "Sugerencias genéricas locales." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'semi', behavior: "Filtrado por gustos." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'full', behavior: "Reserva de mesas/entradas." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Acceso a eventos exclusivos/sold-out." }
    }
  },
  {
    id: 'con_shopping', pillarId: PillarId.CONCIERGE, name: 'Compras Personales', description: 'Regalos y necesidades.',
    tiers: {
      [SubscriptionTier.FREE]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'manual', behavior: "Recordatorio fechas importantes." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'semi', behavior: "Generador ideas regalos." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Preparación de pedido para autorización." }
    }
  },
  {
    id: 'con_comms', pillarId: PillarId.CONCIERGE, name: 'Secretario Digital', description: 'Gestión llamadas/email.',
    tiers: {
      [SubscriptionTier.FREE]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.BASIC]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'semi', behavior: "Borradores de respuesta email." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Respuesta autónoma (IA)." }
    }
  },

  // === 4. VITAL (5 Features) ===
  {
    id: 'vit_habits', pillarId: PillarId.VITAL, name: 'Tracker Hábitos', description: 'Disciplina diaria.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: 3, automation_level: 'manual', behavior: "Checklist manual." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'manual', behavior: "Estadísticas mensuales." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'semi', behavior: "Correlación con agenda." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Sincronización wearables." }
    }
  },
  {
    id: 'vit_medical', pillarId: PillarId.VITAL, name: 'Salud Médica', description: 'Citas y documentos.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: null, automation_level: 'manual', behavior: "Archivo PDF manual." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'manual', behavior: "Recordatorio tomas/citas." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'semi', behavior: "Búsqueda especialista por seguro." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Reserva de cita médica." }
    }
  },
  {
    id: 'vit_stress', pillarId: PillarId.VITAL, name: 'Gestión Estrés', description: 'Análisis biométrico.',
    requiredPermissionId: 'func_health_kit',
    tiers: {
      [SubscriptionTier.FREE]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.BASIC]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'semi', behavior: "Alerta HRV bajo (Burnout)." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Bloqueo agenda por salud." }
    }
  },
  {
    id: 'vit_career', pillarId: PillarId.VITAL, name: 'Carrera Profesional', description: 'Desarrollo laboral.',
    tiers: {
      [SubscriptionTier.FREE]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'manual', behavior: "Repositorio CV." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'semi', behavior: "Escaneo mercado laboral." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Aplicación auto a ofertas." }
    }
  },
  {
    id: 'vit_nutrition', pillarId: PillarId.VITAL, name: 'Nutrición', description: 'Alimentación.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: null, automation_level: 'manual', behavior: "Lista compra manual." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'semi', behavior: "Sugerencia menú semanal." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'full', behavior: "Generación lista x menú." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Preparación pedido supermercado." }
    }
  },

  // === 5. NUCLEO (5 Features) ===
  {
    id: 'nuc_calendar', pillarId: PillarId.NUCLEO, name: 'Calendario Familiar', description: 'Coordinación.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: 1, automation_level: 'manual', behavior: "Lectura 1 calendario extra." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'semi', behavior: "Visualización unificada." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'full', behavior: "Detección conflictos logísticos." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Negociación horarios terceros." }
    }
  },
  {
    id: 'nuc_dependents', pillarId: PillarId.NUCLEO, name: 'Dependientes/Hijos', description: 'Cuidado.',
    tiers: {
      [SubscriptionTier.FREE]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.BASIC]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'manual', behavior: "Calendario escolar/vacunas." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Logística transporte/extraescolar." }
    }
  },
  {
    id: 'nuc_staff', pillarId: PillarId.NUCLEO, name: 'Personal Doméstico', description: 'Empleados hogar.',
    tiers: {
      [SubscriptionTier.FREE]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.BASIC]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.PRO]: { access: false, limit: 0, automation_level: 'manual', behavior: "Plantilla contrato/nómina." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Cálculo y preparación de transferencia nómina." }
    }
  },
  {
    id: 'nuc_elderly', pillarId: PillarId.NUCLEO, name: 'Cuidado Mayores', description: 'Asistencia.',
    tiers: {
      [SubscriptionTier.FREE]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.BASIC]: { access: false, limit: 0, automation_level: 'manual', behavior: "Sin acceso." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'semi', behavior: "Avisos medicación." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Coordinación cuidadores." }
    }
  },
  {
    id: 'nuc_home_maint', pillarId: PillarId.NUCLEO, name: 'Mantenimiento Hogar', description: 'Reparaciones.',
    tiers: {
      [SubscriptionTier.FREE]: { access: true, limit: null, automation_level: 'manual', behavior: "Lista tareas." },
      [SubscriptionTier.BASIC]: { access: true, limit: null, automation_level: 'manual', behavior: "Recordatorio anuales (Caldera)." },
      [SubscriptionTier.PRO]: { access: true, limit: null, automation_level: 'semi', behavior: "Búsqueda técnicos." },
      [SubscriptionTier.VIP]: { access: true, limit: null, automation_level: 'full', behavior: "Gestión cita reparación." }
    }
  }
];

// --- D. PLANES DE SUSCRIPCIÓN (Updated) ---

export const SUBSCRIPTION_PLANS = [
  {
    id: SubscriptionTier.FREE,
    name: 'Invitado',
    price: '0€',
    description: 'Información y Alertas Manuales.',
    capabilities: ['Cálculo Caducidad DNI', 'Archivo Garantías (3 items)', 'Tracker Manual']
  },
  {
    id: SubscriptionTier.BASIC,
    name: 'Asistente',
    price: '9.99€',
    description: 'Gestión Semi-Automática.',
    capabilities: ['OCR Tickets Ilimitado', 'Sugerencias de Energía', 'Conflictos Agenda']
  },
  {
    id: SubscriptionTier.PRO,
    name: 'Mayordomo',
    price: '29.99€',
    description: 'Ejecución y Trámites.',
    capabilities: ['Radar Multas', 'Bio-Análisis Estrés', 'Reservas VIP (Limitado)']
  },
  {
    id: SubscriptionTier.VIP,
    name: 'Gobernante',
    price: '99.99€',
    description: 'Autonomía Total.',
    capabilities: ['Preparación Pago Multas', 'Gestión Empleados', 'Viajes Full Service']
  }
];

// --- HELPERS (ROBUST IMPLEMENTATION) ---

// 1. Defined Numeric Levels for reliable comparison
export const TIER_LEVELS: Record<string, number> = {
  // Enum Keys
  'INVITADO': 1,
  'ASISTENTE': 2,
  'MAYORDOMO': 3,
  'GOBERNANTE': 4,

  // Explicit Legacy Keys (Fix for Critical Bug from Firebase)
  // Ensures compatibility with older DB records storing "TIER_X_NAME"
  'TIER_1_INVITADO': 1,
  'TIER_2_ASISTENTE': 2,
  'TIER_3_MAYORDOMO': 3,
  'TIER_4_GOBERNANTE': 4,

  // English Keys
  'FREE': 1,
  'BASIC': 2,
  'PRO': 3,
  'VIP': 4
};

// 2. Robust Tier Getter
export const getTierLevel = (tier: string | SubscriptionTier): number => {
  if (!tier) return 0;
  
  // Try direct lookup
  if (TIER_LEVELS[tier]) return TIER_LEVELS[tier];

  // Try uppercase lookup (insensible to case) and trim
  const normalizedKey = String(tier).trim().toUpperCase();
  if (TIER_LEVELS[normalizedKey]) return TIER_LEVELS[normalizedKey];

  // Default to lowest if unknown
  console.warn(`[getTierLevel] Unknown tier: ${tier}. Defaulting to 0.`);
  return 0;
};

// 3. Normalize Tier Key for Matrix Lookup
export const getNormalizedTierKey = (tier: string | SubscriptionTier): SubscriptionTier => {
    const level = getTierLevel(tier);
    if (level >= 4) return SubscriptionTier.VIP;
    if (level === 3) return SubscriptionTier.PRO;
    if (level === 2) return SubscriptionTier.BASIC;
    return SubscriptionTier.FREE;
};

export const determineArchetype = (age: number, occupation: string): UserArchetype => {
  const occ = occupation.toLowerCase();
  if (occ.includes('arquitect') || occ.includes('ingenier') || occ.includes('dev') || occ.includes('diseñ')) {
    return UserArchetype.CONSTRUCTOR;
  }
  if (age < 25 || occ.includes('estudiant') || occ.includes('art')) {
    return UserArchetype.EXPLORADOR;
  }
  return UserArchetype.ESENCIALISTA; 
};

export const ADMIN_EMAILS = ['admin@mayordomo.app'];
