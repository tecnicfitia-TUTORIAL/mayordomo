

export enum SectorType {
  FINANCE = 'FINANZAS',
  HEALTH = 'SALUD',
  HOME = 'ENTORNO', // Changed from HOGAR to ENTORNO (Environment)
  SOCIAL = 'VÍNCULOS', // Changed from SOCIAL to VÍNCULOS
  CAREER = 'DESARROLLO', // Changed from CARRERA to DESARROLLO (covers career and studies)
  CREATIVITY = 'EXPANSIÓN', // Changed from CREATIVIDAD to EXPANSIÓN
  LOGISTICS = 'SOPORTE', // Changed from LOGISTICA to SOPORTE
  EDUCATION = 'APRENDIZAJE'
}

export enum Owner {
  AI = 'IA (SOPORTE)',     // The 65%
  USER = 'TU (FOCO)'  // The 35%
}

export interface HouseSector {
  id: string;
  name: string;
  type: SectorType;
  owner: Owner;
  status: 'OPTIMAL' | 'ATTENTION' | 'IDLE';
  description: string;
  efficiency: number; // 0-100
}

export interface Insight {
  id: string;
  sectorId: string;
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actionable: boolean;
}

export interface Attachment {
  type: 'image' | 'video' | 'file';
  mimeType: string;
  data: string; // Base64 string
  name: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  attachments?: Attachment[];
}

// New Interfaces for Onboarding
export type UserArchetype = 'EXPLORADOR' | 'CONSTRUCTOR' | 'ESENCIALISTA';

// --- SUBSCRIPTION SYSTEM ---
export enum SubscriptionTier {
  FREE = 'REACTIVO',       // No Paga
  BASIC = 'SUPERVISOR',    // Paga Algo
  PREMIUM = 'ESTRATEGA',   // Paga Bastante
  ELITE = 'DELEGADO'       // Paga Mucho
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: string;
  description: string;
  aiBehavior: string; // Description for UI
  features: string[];
  autonomyLevel: number; // 0 to 3
}

export interface UserProfile {
  name: string;
  email: string; // Added email for Role logic
  age: number;
  gender: string;
  occupation: string;
  archetype: UserArchetype; // The calculated personality type
  subscriptionTier: SubscriptionTier; // NEW
  setupCompleted: boolean;
}

// --- NOTIFICATIONS CONFIG ---
export interface NotificationConfig {
  morningSummary: boolean; // Resumen matutino
  urgentAlerts: boolean;   // Riesgos críticos (siempre ON recomendado)
  savingsTips: boolean;    // Oportunidades financieras
  healthReminders: boolean; // Salud y bienestar
  systemUpdates: boolean;  // Evolución del sistema
}

// --- NEW PERMISSION SYSTEM TYPES ---

export interface PermissionItem {
  id: string;
  label: string;
  defaultEnabled: boolean; // SI/NO or ON/OFF from the tree
  minTier: SubscriptionTier; // NEW: The minimum tier required to unlock this specific permission
}

export interface PermissionModule {
  id: string;
  title: string; // e.g., "GESTIÓN_DIARIA", "FINANZAS_Y_CRECIMIENTO"
  roleDescription: string; // e.g., "Módulo Base", "Módulo de Riesgo"
  permissions: PermissionItem[];
}

export interface LifeStageConfig {
  stageName: string; // e.g., "TUTOR ATENTO", "ENTRENADOR DE CRECIMIENTO"
  modules: PermissionModule[];
}

// --- EVOLUTION MECHANISM TYPES ---

export interface MacroContextEvent {
  id: string;
  source: 'INTERNET_GLOBAL' | 'MARKET_DATA' | 'LEGAL_UPDATE' | 'TECH_TREND';
  title: string;
  description: string;
  timestamp: Date;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
}

export interface PermissionProposal {
  id: string;
  relatedMacroEventId: string;
  title: string; // The "Definition"
  targetModuleId: string; // The "Module"
  reasoning: string; // The "Justification" (Risk Mitigated / Opportunity Created)
  proposedPermission: PermissionItem;
}
