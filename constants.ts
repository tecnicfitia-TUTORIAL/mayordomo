
import { HouseSector, Owner, SectorType, UserProfile, UserArchetype, PermissionModule, LifeStageConfig, SubscriptionPlan, SubscriptionTier, NotificationConfig } from "./types";

// --- ADMIN & SUPPORT CONFIGURATION ---
// Added the specific email to the allowlist so the App recognizes the backdoor login as an Admin
export const ADMIN_EMAILS = [
    'admin@confort.app', 
    'support@confort.app',
    'tecnicfitia@tecnicalfitnesartificialintelligence.app' 
]; 
export const SUPPORT_EMAILS = ['support@confort.app'];

export const DEFAULT_NOTIFICATIONS: NotificationConfig = {
  morningSummary: true,
  urgentAlerts: true,
  savingsTips: false,
  healthReminders: true,
  systemUpdates: true
};

// --- HELPER: Tier Levels for Comparison ---
export const getTierLevel = (tier: SubscriptionTier): number => {
  switch (tier) {
    case SubscriptionTier.FREE: return 0;
    case SubscriptionTier.BASIC: return 1;
    case SubscriptionTier.PREMIUM: return 2;
    case SubscriptionTier.ELITE: return 3;
    default: return 0;
  }
};

// --- SUBSCRIPTION PLANS ---

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: SubscriptionTier.FREE,
    name: 'Usuario Reactivo',
    price: '0€',
    description: 'Gestión Básica',
    aiBehavior: 'Filtro de Ruido',
    autonomyLevel: 0,
    features: [
      'Acceso Visual a todos los módulos',
      'Permisos de Nivel 0 (Lectura)',
      'Notificaciones esenciales'
    ]
  },
  {
    id: SubscriptionTier.BASIC,
    name: 'Usuario Supervisor',
    price: '4.99€/mes',
    description: 'Productividad',
    aiBehavior: 'Supervisor Funcional',
    autonomyLevel: 1,
    features: [
      'Permisos de Nivel 1 (Sincronización)',
      'Sugerencias de optimización',
      'Automatización simple'
    ]
  },
  {
    id: SubscriptionTier.PREMIUM,
    name: 'Usuario Estratega',
    price: '19.99€/mes',
    description: 'Seguridad y Familia',
    aiBehavior: 'Gerente Comparativo',
    autonomyLevel: 2,
    features: [
      'Permisos de Nivel 2 (Gestión)',
      'Control Parental / Bienestar',
      'Comparativas de mercado'
    ]
  },
  {
    id: SubscriptionTier.ELITE,
    name: 'Usuario Delegado',
    price: '39.99€/mes',
    description: 'Patrimonio (Full Access)',
    aiBehavior: 'Agente de Confianza',
    autonomyLevel: 3,
    features: [
      'Permisos de Nivel 3 (Ejecución)',
      'Gestión de activos legal',
      'Agente 100% Proactivo'
    ]
  }
];

// --- NEW LOGIC: Permission Modules Definition (Granular Tiers ~12 per module) ---

const MODULE_GESTION_DIARIA: PermissionModule = {
  id: 'gestion_diaria',
  title: 'GESTIÓN DIARIA',
  roleDescription: 'Logística, Agenda y Comunicaciones',
  permissions: [
    // TIER 0: FREE (Lectura / Input Manual)
    { id: 'gd_free_1', label: 'Uso del Micrófono (Comandos)', defaultEnabled: true, minTier: SubscriptionTier.FREE },
    { id: 'gd_free_2', label: 'Lectura del Calendario', defaultEnabled: true, minTier: SubscriptionTier.FREE },
    { id: 'gd_free_3', label: 'Monitoreo de Batería', defaultEnabled: true, minTier: SubscriptionTier.FREE },
    
    // TIER 1: BASIC (Sincronización)
    { id: 'gd_basic_1', label: 'Sincronización de Email', defaultEnabled: true, minTier: SubscriptionTier.BASIC },
    { id: 'gd_basic_2', label: 'Ubicación General (Ciudad)', defaultEnabled: true, minTier: SubscriptionTier.BASIC },
    { id: 'gd_basic_3', label: 'Almacenamiento Local (Archivos)', defaultEnabled: true, minTier: SubscriptionTier.BASIC },
    
    // TIER 2: PREMIUM (Gestión Activa)
    { id: 'gd_prem_1', label: 'Gestión de Contactos', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    { id: 'gd_prem_2', label: 'Interceptar Notificaciones Apps', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    { id: 'gd_prem_3', label: 'Escaneo Inteligente de Galería', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    
    // TIER 3: ELITE (Autonomía / Ejecución)
    { id: 'gd_elite_1', label: 'Análisis de Patrones de Uso', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
    { id: 'gd_elite_2', label: 'Historial de Búsquedas Cruzado', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
    { id: 'gd_elite_3', label: 'Responder Mensajes Automáticamente', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
  ]
};

const MODULE_SEGURIDAD_TUTELA: PermissionModule = {
  id: 'seguridad_tutela',
  title: 'SEGURIDAD Y TUTELA',
  roleDescription: 'Protección Familiar y Personal',
  permissions: [
    // TIER 0: FREE
    { id: 'st_free_1', label: 'Alertar Contactos Emergencia', defaultEnabled: true, minTier: SubscriptionTier.FREE },
    { id: 'st_free_2', label: 'Notificaciones de Riesgo Crítico', defaultEnabled: true, minTier: SubscriptionTier.FREE },
    { id: 'st_free_3', label: 'Botón de Pánico Digital', defaultEnabled: true, minTier: SubscriptionTier.FREE },
    
    // TIER 1: BASIC
    { id: 'st_basic_1', label: 'Lectura Calendario Escolar', defaultEnabled: true, minTier: SubscriptionTier.BASIC },
    { id: 'st_basic_2', label: 'Aviso Instalación Apps Nuevas', defaultEnabled: true, minTier: SubscriptionTier.BASIC },
    { id: 'st_basic_3', label: 'Ubicación por Batería Baja', defaultEnabled: false, minTier: SubscriptionTier.BASIC },
    
    // TIER 2: PREMIUM
    { id: 'st_prem_1', label: 'Monitoreo de Apps (Modo Tutor)', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    { id: 'st_prem_2', label: 'Geocerca y Ubicación Real', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    { id: 'st_prem_3', label: 'Limitar Tiempo de Pantalla', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    
    // TIER 3: ELITE
    { id: 'st_elite_1', label: 'Auditoría Historial Búsqueda', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
    { id: 'st_elite_2', label: 'Bloqueo Biométrico Remoto', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
    { id: 'st_elite_3', label: 'Análisis de Tono (Anti-Acoso)', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
  ]
};

const MODULE_FINANZAS_CRECIMIENTO: PermissionModule = {
  id: 'finanzas_crecimiento',
  title: 'FINANZAS Y PATRIMONIO',
  roleDescription: 'Economía, Activos y Compras',
  permissions: [
    // TIER 0: FREE
    { id: 'fc_free_1', label: 'Lectura Metadatos Facturas', defaultEnabled: true, minTier: SubscriptionTier.FREE },
    { id: 'fc_free_2', label: 'Avisos de Ofertas Generales', defaultEnabled: false, minTier: SubscriptionTier.FREE },
    { id: 'fc_free_3', label: 'Registro Manual de Gastos', defaultEnabled: true, minTier: SubscriptionTier.FREE },
    
    // TIER 1: BASIC
    { id: 'fc_basic_1', label: 'Monitoreo Puntos Lealtad', defaultEnabled: false, minTier: SubscriptionTier.BASIC },
    { id: 'fc_basic_2', label: 'Alertas de Gastos Impulsivos', defaultEnabled: false, minTier: SubscriptionTier.BASIC },
    { id: 'fc_basic_3', label: 'Rastreo de Suscripciones', defaultEnabled: true, minTier: SubscriptionTier.BASIC },
    
    // TIER 2: PREMIUM
    { id: 'fc_prem_1', label: 'Sincronización Bancaria (Lectura)', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    { id: 'fc_prem_2', label: 'Análisis de Deuda y Crédito', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    { id: 'fc_prem_3', label: 'Negociación Automática Servicios', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    
    // TIER 3: ELITE
    { id: 'fc_elite_1', label: 'Gestión Cuentas Inversión', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
    { id: 'fc_elite_2', label: 'Preparación Impuestos Fiscales', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
    { id: 'fc_elite_3', label: 'Ejecutar Transferencias', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
  ]
};

const MODULE_METAS_PROFESIONALES: PermissionModule = {
  id: 'metas_profesionales',
  title: 'METAS PROFESIONALES',
  roleDescription: 'Carrera, Estudios y Foco',
  permissions: [
     // TIER 0: FREE
    { id: 'mp_free_1', label: 'Lectura Calendario Reuniones', defaultEnabled: true, minTier: SubscriptionTier.FREE },
    { id: 'mp_free_2', label: 'Resumen Notas de Voz', defaultEnabled: true, minTier: SubscriptionTier.FREE },
    { id: 'mp_free_3', label: 'Checklist de Objetivos Diarios', defaultEnabled: true, minTier: SubscriptionTier.FREE },
    
    // TIER 1: BASIC
    { id: 'mp_basic_1', label: 'Sincronización Apps Estudio', defaultEnabled: false, minTier: SubscriptionTier.BASIC },
    { id: 'mp_basic_2', label: 'Modo Foco (Bloqueo Distracciones)', defaultEnabled: true, minTier: SubscriptionTier.BASIC },
    { id: 'mp_basic_3', label: 'Temporizador Pomodoro Inteligente', defaultEnabled: true, minTier: SubscriptionTier.BASIC },
    
    // TIER 2: PREMIUM
    { id: 'mp_prem_1', label: 'Análisis Perfil LinkedIn/RRSS', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    { id: 'mp_prem_2', label: 'Rastreo Oportunidades Laborales', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    { id: 'mp_prem_3', label: 'Digitalización Documentos OCR', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    
    // TIER 3: ELITE
    { id: 'mp_elite_1', label: 'Aplicación Automática a Ofertas', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
    { id: 'mp_elite_2', label: 'Redacción Emails a Contactos', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
    { id: 'mp_elite_3', label: 'Análisis Sentimiento Comunicaciones', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
  ]
};

// --- NUEVO MÓDULO: BIENESTAR Y ENTORNO (El "Mayordomo Físico") ---
const MODULE_BIENESTAR_ENTORNO: PermissionModule = {
  id: 'bienestar_entorno',
  title: 'BIENESTAR Y ENTORNO (IoT)',
  roleDescription: 'Salud, Energía Vital y Hogar Inteligente',
  permissions: [
     // TIER 0: FREE
    { id: 'be_free_1', label: 'Sincronizar Clima Local', defaultEnabled: true, minTier: SubscriptionTier.FREE },
    { id: 'be_free_2', label: 'Recordatorios de Agua/Descanso', defaultEnabled: true, minTier: SubscriptionTier.FREE },
    
    // TIER 1: BASIC
    { id: 'be_basic_1', label: 'Gestión de Vínculos (Cumpleaños)', defaultEnabled: true, minTier: SubscriptionTier.BASIC },
    { id: 'be_basic_2', label: 'Sugerencias de Playlist (Spotify)', defaultEnabled: false, minTier: SubscriptionTier.BASIC },
    
    // TIER 2: PREMIUM (Bio-Feedback)
    { id: 'be_prem_1', label: 'Sincronización Wearables (Sueño/Pulso)', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    { id: 'be_prem_2', label: 'Control Domótico (Luces/Termostato)', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },
    { id: 'be_prem_3', label: 'Inventario de Nevera Inteligente', defaultEnabled: false, minTier: SubscriptionTier.PREMIUM },

    // TIER 3: ELITE (Mayordomo Real)
    { id: 'be_elite_1', label: 'Reagendar Agenda por Nivel de Energía', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
    { id: 'be_elite_2', label: 'Pedido Automático de Suministros', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
    { id: 'be_elite_3', label: 'Reserva Restaurantes Automática', defaultEnabled: false, minTier: SubscriptionTier.ELITE },
  ]
};

// --- LOGIC: Archetype Determination ---
export const determineArchetype = (age: number, occupation: string): UserArchetype => {
  const occ = occupation.toLowerCase();
  if (occ.includes('arquitect') || occ.includes('ingenier') || occ.includes('program') || occ.includes('diseñ')) {
    return 'CONSTRUCTOR';
  }
  if (age < 25 || occ.includes('estudiant') || occ.includes('becari') || occ.includes('viajer')) {
    return 'EXPLORADOR';
  }
  return 'ESENCIALISTA'; 
};

// --- LOGIC: Get Permissions by Profile ---
// Returns ALL modules for EVERYONE. Granularity allows the "Total Experience" feel.
// Removed 'gender' argument as it was unused, causing strict build failure.
export const getPermissionsByProfile = (age: number): LifeStageConfig => {
  let modules = [
    MODULE_GESTION_DIARIA,
    MODULE_FINANZAS_CRECIMIENTO,
    MODULE_METAS_PROFESIONALES,
    MODULE_SEGURIDAD_TUTELA,
    MODULE_BIENESTAR_ENTORNO
  ];
  
  let stageName = "ESTÁNDAR";

  if (age < 18) {
    stageName = "TUTELA DIGITAL";
  } else if (age >= 18 && age < 30) {
    stageName = "CRECIMIENTO Y EXPANSIÓN";
  } else if (age >= 30 && age < 55) {
    stageName = "CONSOLIDACIÓN Y FAMILIA";
  } else {
    stageName = "LEGADO Y BIENESTAR";
  }

  return { stageName, modules };
};

// --- LOGIC: Generate Initial Sectors ---
export const getInitialSectors = (profile: UserProfile): HouseSector[] => {
  const sectors: HouseSector[] = [];
  const tierLevel = getTierLevel(profile.subscriptionTier);

  // Common Sector: Finance
  const financeEfficiencyCap = tierLevel === 3 ? 98 : tierLevel === 2 ? 85 : tierLevel === 1 ? 70 : 50;
  
  sectors.push({
    id: 'finance-1',
    name: 'Finanzas Operativas',
    type: SectorType.FINANCE,
    owner: Owner.AI,
    status: tierLevel > 0 ? 'OPTIMAL' : 'ATTENTION',
    description: tierLevel === 0 ? 'Solo registro manual habilitado.' : 'Gestión inteligente de activos activada.',
    efficiency: financeEfficiencyCap
  });

  // NEW: Trastero Latente (Storage) - Available for everyone, efficiency depends on permissions (data fed in)
  sectors.push({
    id: 'storage-1',
    name: 'Trastero Latente',
    type: SectorType.STORAGE,
    owner: Owner.AI,
    status: 'IDLE',
    description: 'Donde guardo lo que olvidas: ideas, regalos potenciales, recomendaciones de amigos y viejos hallazgos.',
    efficiency: 100 // Always 100 because it's just a passive container (Garage would vary)
  });

  // Archetype Specific Logic
  if (profile.archetype === 'CONSTRUCTOR') {
    sectors.push({
      id: 'career-1',
      name: 'Flujo de Trabajo Profundo',
      type: SectorType.CAREER,
      owner: Owner.USER,
      status: 'IDLE',
      description: 'Espacio protegido para creación y estrategia.',
      efficiency: 100
    });
    sectors.push({
      id: 'logistics-1',
      name: 'Agenda & Reuniones',
      type: SectorType.LOGISTICS,
      owner: Owner.AI,
      status: 'ATTENTION',
      description: 'Optimización de slots de tiempo y recordatorios.',
      efficiency: tierLevel > 1 ? 90 : 60
    });
  } else if (profile.archetype === 'EXPLORADOR') {
     sectors.push({
      id: 'social-1',
      name: 'Red de Contactos',
      type: SectorType.SOCIAL,
      owner: Owner.USER,
      status: 'IDLE',
      description: 'Interacciones sociales y eventos.',
      efficiency: 100
    });
    sectors.push({
      id: 'travel-1',
      name: 'Logística de Movilidad',
      type: SectorType.LOGISTICS,
      owner: Owner.AI,
      status: 'OPTIMAL',
      description: 'Rutas, reservas y tickets.',
      efficiency: tierLevel > 0 ? 85 : 50
    });
  } else {
    sectors.push({
      id: 'home-1',
      name: 'Entorno Doméstico',
      type: SectorType.HOME,
      owner: Owner.AI,
      status: 'ATTENTION',
      description: 'Mantenimiento, compras y orden.',
      efficiency: tierLevel > 1 ? 88 : 65
    });
    sectors.push({
      id: 'health-1',
      name: 'Bienestar Personal',
      type: SectorType.HEALTH,
      owner: Owner.USER,
      status: 'IDLE',
      description: 'Descanso, nutrición y desconexión.',
      efficiency: 100
    });
  }

  return sectors;
};
