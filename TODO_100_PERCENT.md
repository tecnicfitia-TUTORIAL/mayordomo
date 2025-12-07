# 🎯 TODO: LLEGAR AL 100% DE FUNCIONALIDAD

## 📋 LISTA CONCISA DE LO QUE FALTA

### 1. 🔴 PAGOS/SUSCRIPCIÓN (2 items)

#### A. Checkout Stripe Dinámico
**Archivo:** `services/stripeService.ts:54-64`
**Problema:** URLs hardcoded, no crea sesiones dinámicas
**Solución:**
- Crear Cloud Function `createCheckoutSession(tier, userId)`
- Usar Stripe API: `stripe.checkout.sessions.create()`
- Retornar URL de sesión dinámica
- Frontend: Llamar a función en lugar de usar `STRIPE_URLS`

#### B. Sincronización de Tier
**Archivo:** `services/subscriptionService.ts:29-42`
**Problema:** Siempre devuelve `FREE`, comentario `TODO: BACKEND INTEGRATION`
**Solución:**
- Leer `subscriptionTier` directamente de Firestore `users/{uid}`
- Ya se actualiza desde webhook, solo falta leerlo aquí

---

### 2. 🟡 EMAIL INGESTION (1 item)

#### Persistencia en Firestore
**Archivo:** `services/emailIngestionService.ts:57-65`
**Problema:** Comentario "Simulada: Aquí se llamaría a Gemini", no guarda en Firestore
**Solución:**
- Llamar a Cloud Function `processEmailWithAI(email)` que use Gemini
- Guardar resultado en Firestore: `users/{uid}/processed_emails/{emailId}`
- Retornar `IngestionResult` con datos reales

---

### 3. 🟡 DASHBOARD (2 items)

#### A. Datos Reales del Dashboard
**Archivo:** `services/dashboardBuilder.ts`
**Problema:** Genera estructura pero datos son mock
**Solución:**
- Leer datos reales de Firestore:
  - `users/{uid}/life_obligations` → Obligaciones
  - `users/{uid}/processed_emails` → Emails procesados
  - `users/{uid}/bankAccounts` → Datos bancarios
- Conectar `SixthSenseService` con datos reales

#### B. Mission Briefing
**Archivo:** `services/preparationService.ts`
**Problema:** Misiones simuladas
**Solución:**
- Generar misiones basadas en:
  - Obligaciones reales de Firestore
  - Fechas de vencimiento reales
  - Datos bancarios reales

---

### 4. 🔴 PILLAR DETAIL VIEW (3 items)

#### A. Buzón DEHú
**Archivo:** `components/PillarDetailView.tsx:26`
**Problema:** Muestra `'0 Pendientes'` hardcoded
**Solución:**
- Llamar a `GovernmentService.getDEHUNotifications()`
- Mostrar contador real
- Mostrar lista de notificaciones

#### B. Estado Fiscal (AEAT)
**Archivo:** `components/PillarDetailView.tsx:24`
**Problema:** Muestra `'Al Corriente'` hardcoded
**Solución:**
- Llamar a `GovernmentService.getAEATStatus()`
- Mostrar estado real

#### C. Puntos DGT
**Archivo:** `components/PillarDetailView.tsx:23`
**Problema:** Muestra `'12 / 15'` hardcoded
**Solución:**
- Llamar a `GovernmentService.getDGTPoints()`
- Mostrar puntos reales

---

### 5. 🔴 ADMIN DASHBOARD (2 items)

#### A. Support Dashboard - Listado de Usuarios
**Archivo:** `components/SupportDashboard.tsx:82`
**Problema:** Comentario `TODO: Call Backend API`, muestra datos mock
**Solución:**
- Crear Cloud Function `getAllUsersStats()` (solo admin)
- Leer de Firestore con paginación
- Retornar estadísticas reales

#### B. Evolution Panel - Datos Reales
**Archivo:** `services/evolutionService.ts:15-136`
**Problema:** `MOCK_MACRO_EVENTS` hardcoded (15 items)
**Solución:**
- Opción 1: Usar Google Search API o similar
- Opción 2: Conectar con feed de noticias/regulaciones real
- Opción 3: Usar Gemini para buscar eventos relevantes

---

## 📊 RESUMEN POR PRIORIDAD

### 🔴 CRÍTICO (Core Features)
1. ✅ **Sincronización de Tier** - Leer de Firestore (5 min)
2. ✅ **PillarDetailView Gobierno** - Conectar servicios reales (15 min)
3. ✅ **Dashboard Datos Reales** - Leer de Firestore (30 min)

### 🟡 IMPORTANTE (UX)
4. ✅ **Checkout Stripe Dinámico** - Cloud Function (30 min)
5. ✅ **Email Persistencia** - Guardar en Firestore (20 min)
6. ✅ **Mission Briefing Real** - Basado en datos reales (20 min)

### 🟢 OPCIONAL (Admin)
7. ✅ **Support Dashboard** - Listado real de usuarios (30 min)
8. ✅ **Evolution Panel** - Conectar con fuente real (1 hora)

---

## ⏱️ ESTIMACIÓN TOTAL

**Tiempo estimado:** ~3 horas de desarrollo

**Orden recomendado:**
1. Sincronización de Tier (rápido, impacto alto)
2. PillarDetailView Gobierno (rápido, visible)
3. Dashboard Datos Reales (medio, impacto alto)
4. Checkout Stripe (medio, necesario para pagos)
5. Email Persistencia (medio, mejora UX)
6. Mission Briefing (medio, mejora UX)
7. Support Dashboard (largo, solo admin)
8. Evolution Panel (largo, opcional)

---

## ✅ CHECKLIST FINAL

- [ ] `subscriptionService.ts` - Leer tier de Firestore
- [ ] `stripeService.ts` - Crear Cloud Function para checkout dinámico
- [ ] `emailIngestionService.ts` - Guardar emails procesados en Firestore
- [ ] `dashboardBuilder.ts` - Leer datos reales de Firestore
- [ ] `preparationService.ts` - Generar misiones basadas en datos reales
- [ ] `PillarDetailView.tsx` - Conectar DEHú/AEAT/DGT reales
- [ ] `SupportDashboard.tsx` - Listado real de usuarios
- [ ] `evolutionService.ts` - Conectar con fuente real de eventos

---

**Total:** 8 items para llegar al 100%

