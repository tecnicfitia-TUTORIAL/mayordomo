# Documento de mejoras y roadmap (Mayordomo Digital)

**Fecha:** 2025-12-29  
**Contexto:** Proyecto React (Vite) + Firebase (Auth/Firestore/Functions) + Stripe + integraciones (Plaid, Gmail, DEHú/AEAT/DGT) + UI Admin.

---

## Resumen ejecutivo

El producto tiene una base sólida en **Auth (incl. WebAuthn), cifrado en bóveda (certificados), reglas estrictas de Firestore (ownership + deny-all) y servicios core**.  
El mayor riesgo hoy no está en la UI sino en el **perímetro de las Cloud Functions HTTP**: hay endpoints críticos que aceptan `userId` desde el cliente y **no verifican Firebase ID Token**, lo que permite abuso/impersonación si son públicos.

En paralelo, hay deuda que frena escalabilidad: **URLs hardcodeadas de Cloud Run (hash)** en servicios del frontend, panel admin que intenta listar usuarios desde el cliente (choca con reglas), y **Stripe en frontend aún “MVP links”** pese a existir un endpoint de checkout dinámico en backend.

---

## Estado actual (alto nivel)

- **Seguridad Firestore**: `firestore.rules` está en modo estricto (cada usuario solo su doc + subcolecciones explícitas; deny-all global). Esto es bueno para producción.
- **Cifrado**: Plaid tokens y certificados se cifran en backend (AES-256-GCM con secret).
- **IA**: Chat e inferencia están implementados y funcionales (via Functions).
- **Admin/Soporte**: UI existe, pero algunas operaciones (listar usuarios, force logout) requieren backend privilegiado; hoy la UI intenta hacerlo directo con Firestore.
- **Integraciones**:
  - Gobierno/certificados: usan token Bearer (bien) y leen de bóveda.
  - Plaid: backend cifra tokens, pero hay endpoints sin auth.
  - Gmail/MFA: el frontend llama Functions pasando `userId` (potencialmente inseguro si el backend no valida token).

---

## Hallazgos críticos (P0 — acción inmediata)

### 1) Endpoints HTTP sin verificación de identidad (impersonación)

**Riesgo:** Alto. Si una Function HTTP es accesible públicamente y acepta `userId` en el body, un atacante puede:
- leer/operar sobre recursos de otro usuario;
- forzar escrituras en Firestore usando Admin SDK del backend;
- extraer datos (p.ej. saldos, notificaciones, facturas) aunque Firestore rules sean estrictas (porque Admin SDK las bypass).

**Evidencia (ejemplos observados):**
- `functions/bankService.js`: `createLinkToken`, `exchangePublicToken`, `getBankData`, `disconnectBank` **aceptan `userId`** y **no verifican** `Authorization: Bearer <FirebaseIdToken>`.
- Servicios frontend que llaman Functions con `userId` sin token: `services/emailService.ts`, `services/mfaService.ts`, `services/geminiService.ts` (depende de backend), además de `services/bankService.ts` (ni siquiera envía auth).

**Recomendación:**
- En **todas** las Functions sensibles: **verificar ID token**, derivar `userId = decoded.uid` y **eliminar `userId` del body**.
- Aplicar **App Check** (Firebase) y/o allowlist de origins + rate limiting.

### 2) CORS demasiado permisivo

**Riesgo:** Medio/alto (depende de otros controles). Hay funciones con:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

**Recomendación:**
- Restringir `Origin` a dominios esperados (Vercel + local), o usar una lista controlada por env.

---

## Prioridades recomendadas (tabla)

| Prioridad | Tema | Qué cambiar | Impacto | Esfuerzo |
|---|---|---|---|---|
| P0 | Auth en Functions | Verificar Firebase ID Token en endpoints HTTP (Plaid, Gmail, MFA, etc.) y eliminar `userId` del body | Muy alto (seguridad) | M |
| P0 | Admin real | Mover “listar usuarios / acciones admin” a backend con verificación de rol (custom claims) | Alto (bloquea features) | M |
| P1 | Config de URLs | Eliminar `PROJECT_HASH` hardcodeado y unificar `FUNCTIONS_BASE_URL`/`httpsCallable` | Alto (mantenibilidad) | S-M |
| P1 | Stripe moderno | Usar `createCheckoutSession` existente desde frontend; portal dinámico | Alto (monetización) | M |
| P1 | Observabilidad | Logging estructurado, trazas y alertas (errores 4xx/5xx, latencias, abusos) | Medio-alto | S-M |
| P2 | DX/Calidad | ESLint/Prettier, typecheck, tests mínimos (unit + smoke) | Medio | M |
| P2 | Performance | `vite build` con `minify` y `sourcemap` controlado por entorno | Medio | S |
| P3 | Producto | Persistencia real de “archivar” notificaciones; métricas reales en Admin | Medio | M-L |

*(S/M/L: pequeño/medio/grande)*

---

## Mejoras por área

### Seguridad (P0–P1)

- **Auth obligatoria en Functions**:
  - Patrón recomendado:
    - Rechazar si falta `Authorization: Bearer …`
    - `admin.auth().verifyIdToken(...)`
    - Usar `decoded.uid` siempre como fuente de verdad
- **Eliminar “userId from client”**:
  - El cliente no debe elegir el usuario objetivo en endpoints que operan sobre Firestore/Plaid/Gmail.
- **Rate limiting**:
  - Por IP + por UID (tokens), especialmente en endpoints de IA y Plaid.
- **App Check**:
  - Reduce abuso desde clientes no legítimos.
- **CORS restrictivo**:
  - Allowlist de orígenes.
- **Revisar data leakage**:
  - Respuestas de errores no deben devolver datos internos o dumps (p.ej. errores completos de Plaid).

### Arquitectura / Configuración (P1)

- **Unificar base URL de Functions**:
  - Hoy hay mezcla de:
    - `cloudfunctions.net` (emulador/local vs prod)
    - Cloud Run URL con **hash hardcodeado** (`qky5eul2mq`) en `BankService`, `GovernmentService`, `CertificateService`.
  - Esto rompe despliegues y rotación de revisiones/servicios.
  - Propuesta:
    - Un único `VITE_FUNCTIONS_BASE_URL` (o `VITE_FIREBASE_FUNCTIONS_URL`) usado por todos.
    - O migrar a `httpsCallable(getFunctions(...), 'functionName')` cuando sea viable.

- **Panel Admin compatible con reglas**:
  - Con `allow list: false` en `/users`, el frontend **no puede listar usuarios** (correcto por privacidad).
  - Solución:
    - `functions/adminService.js`: endpoints admin que listan con Admin SDK tras verificar rol (`custom claims` o allowlist de emails + doble verificación).
    - El frontend consume esos endpoints y no consulta `/users` directamente.

### Monetización (Stripe) (P1)

- Existe `createCheckoutSession` en backend, pero el frontend todavía usa Payment Links (`STRIPE_URLS`) y `openCustomerPortal()` con URL fija.
- Mejoras:
  - Frontend llama `createCheckoutSession` con token Bearer; redirige a `session.url`.
  - Crear endpoint para **Customer Portal Session** (Stripe Billing Portal) por usuario.
  - Definir mapping de `PRICE_ID`s por entorno (dev/prod) en variables/Secrets, no hardcode.

### Producto/UX (P2–P3)

- **Regulatory feed**:
  - “Archivar” hoy es local/mock; persistir como “READ” en Firestore (subcolección `processed_emails` ya existe; para notificaciones igual).
  - Añadir paginación y estados “unread/read”.
- **Email ingestion**:
  - Ya se persiste `processed_emails`, pero el “loop” en `ClientApp.tsx` es demo (email mock). Convertir a cron/cola (Cloud Scheduler + Pub/Sub) a medio plazo si el objetivo es ingestión real.
- **Dashboard**:
  - Priorizar que los widgets se basen en datos reales (Firestore + integraciones), minimizando fallbacks mock.

### Calidad / DX (P2)

- Añadir scripts:
  - `typecheck` (tsc)
  - `lint` (eslint + typescript-eslint)
  - `format` (prettier)
  - tests mínimos (vitest + react-testing-library)
- Activar `strict` en TS **de forma gradual** (por ejemplo, `strict: true` + arreglar por módulos).

### Rendimiento/Build (P2)

- `vite.config.ts` hoy tiene `minify: false` (impacta payload y tiempo de carga).
- Propuesta:
  - `minify: true` en producción, y `sourcemap: true` solo en entornos controlados (o `hidden`).

---

## Plan por fases (recomendado)

### Fase 0 (P0) — 1 a 3 días
- Asegurar **auth obligatoria** en Functions HTTP sensibles (Plaid, Gmail, MFA, etc.).
- Eliminar `userId` del body en backend; derivar de token verificado.
- Ajustar CORS (allowlist).

### Fase 1 (P1) — 3 a 7 días
- Unificar config de URLs de Functions (adiós `PROJECT_HASH` hardcodeado).
- Implementar endpoints admin para listar usuarios/acciones (y retirar acceso directo desde cliente).
- Integrar Stripe dinámico desde frontend con el endpoint existente.

### Fase 2 (P2) — 1 a 2 semanas
- Estándares de calidad: lint + typecheck + tests smoke.
- Optimización build (minify/sourcemaps por entorno).
- Observabilidad (logs estructurados, métricas básicas).

### Fase 3 (P3) — iterativo
- “Regulatory feed” persistente y trazable (read/archive + timeline).
- Datos reales para panel admin (health/risk/IA usage) con pipeline de eventos.

---

## Checklist accionable (para abrir issues)

- [ ] P0: Añadir verificación de Firebase ID Token en `functions/bankService.js` y eliminar `userId` del body
- [ ] P0: Revisar `functions/emailService.js` y `functions/mfaService.js` para asegurar auth real
- [ ] P0: Implementar rate limiting (por UID/IP) en endpoints de IA + Plaid
- [ ] P1: Sustituir `PROJECT_HASH` hardcodeado en `services/*Service.ts` por `VITE_FUNCTIONS_BASE_URL`
- [ ] P1: Crear `functions/adminService.js` (listar usuarios, force logout, overrides) con control de rol
- [ ] P1: Cambiar Stripe frontend a `createCheckoutSession` (y portal session dinámico)
- [ ] P2: Añadir `eslint` + `prettier` + `tsc --noEmit` como CI local
- [ ] P2: Activar minify en build de Vite en producción
- [ ] P3: Persistir “archivar” notificaciones (DEHú/otros) en Firestore

---

## Notas importantes

- Las reglas estrictas de Firestore son correctas; el panel admin debe funcionar **vía backend** (Admin SDK) y no vía lecturas del cliente.
- Evitar “security by obscurity”: los hashes/URLs de Cloud Run no deben ser parte del código del cliente.

