# Resumen del Proyecto: Confort 65/35

## Visión
Un sistema operativo personal ("Mayordomo Digital") que gestiona el 65% de la carga operativa del usuario (finanzas, logística, salud) para liberar el 35% de su tiempo para actividades vitales/creativas.

## Arquitectura Técnica

### Frontend (Actual)
*   **Core:** React 18 + TypeScript + Vite.
*   **Estilo:** Tailwind CSS (Tema: Lujo Clásico / Oro & Carbón).
*   **Estado:** LocalStorage (Persistencia local actual) -> Migrando a Firebase/Supabase.
*   **IA:** Google Gemini 2.5 Flash (vía SDK `@google/genai`).

### Backend (Objetivo)
*   **Plataforma:** Firebase (Google Cloud) o Supabase.
*   **Base de Datos:** Firestore (NoSQL) o PostgreSQL.
*   **Auth:** Firebase Auth (Google, Apple, Email).
*   **Pagos:** Stripe (Suscripciones: Basic, Premium, Elite).
*   **Hosting:** Google Cloud Run / Firebase Hosting.

### Móvil (Objetivo)
*   **Tecnología:** Capacitor (Convierte la web React en APK Android / IPA iOS).
*   **Configuración:** `capacitor.config.ts` ya implementado.

## Estructura de Datos Clave

### 1. UserProfile
Perfil del usuario que determina la lógica de la IA.
*   `archetype`: Explorador, Constructor, Esencialista.
*   `subscriptionTier`: Free, Basic, Premium, Elite.

### 2. Sectors (La "Casa")
Áreas de gestión (Finanzas, Salud, Entorno...).
*   `efficiency`: 0-100% (Estado de optimización).
*   `owner`: AI (Automático) vs USER (Manual).

### 3. Permissions (El "Cerebro")
Sistema granular de permisos (~60 items) organizados en módulos.
*   Nivel de acceso depende del `subscriptionTier`.
*   Ejemplo: "Sincronización Bancaria" requiere nivel PREMIUM.

## Estado Actual
*   ✅ Interfaz completa y responsiva (Móvil/Desktop).
*   ✅ Integración con Gemini funcionando (Chat + Insights).
*   ✅ Sistema de Simulación (Demo Mode) para pruebas.
*   ✅ Configuración de despliegue para Cloud Run lista (`server.js`, `Dockerfile` implícito).
*   ✅ Preparado para Capacitor (`android` build).
*   ⏳ Pendiente: Conectar credenciales reales de Firebase/Stripe en `.env`.

## Archivos Clave
*   `App.tsx`: Lógica central y navegación.
*   `services/geminiService.ts`: Comunicación con la IA.
*   `constants.ts`: Definición de planes, permisos y arquetipos.
*   `server.js`: Servidor Node para producción en Cloud Run.
