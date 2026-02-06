# 🏛️ Mayordomo - Tu Asistente Digital de Vida

**Mayordomo** es una aplicación web progresiva (PWA) de asistencia digital integral que combina inteligencia artificial, integraciones bancarias, servicios gubernamentales y gestión de vida personal en una única plataforma.

## 🎯 Descripción

**Confort 65/35** (nombre interno del proyecto) es un sistema operativo digital para la vida moderna. La aplicación actúa como un mayordomo personal que gestiona diferentes aspectos de tu vida cotidiana, desde finanzas hasta trámites burocráticos, pasando por salud, viajes y relaciones personales.

## ✨ Características Principales

### 🤖 Inteligencia Artificial Dual
- **Chat Asistente**: Conversación natural con IA (Google Gemini)
- **Motor de Inferencia**: Análisis automático de obligaciones legales y recomendaciones personalizadas
- **Análisis Predictivo**: Detección de brechas y propuestas de mejora continua

### 💰 Gestión Financiera
- Integración con **Plaid** para conexión bancaria
- Seguimiento de gastos y transacciones
- Encriptación AES-256-GCM para datos sensibles

### 🏛️ Servicios Gubernamentales (España)
- **DEHU**: Notificaciones de Dirección Electrónica Habilitada Única
- **AEAT**: Estado fiscal y tributario
- **DGT**: Consulta de puntos del carnet de conducir
- Autenticación con certificados digitales (IdCAT, FNMT)

### 🔐 Seguridad Avanzada
- Autenticación biométrica (Face ID/Touch ID) con WebAuthn
- MFA con códigos TOTP
- Encriptación de datos sensibles en reposo
- Firestore Security Rules configuradas

### 📧 Integración de Email
- Conexión con Gmail
- Escaneo y análisis de correos
- Extracción de obligaciones y tareas

### 🎨 Personalización
- Sistema de temas visuales
- Presets de apariencia personalizables
- Dashboard adaptable según etapa de vida

## 🏗️ Arquitectura Técnica

### Frontend
- **React 18** con TypeScript
- **Vite** como bundler
- **TailwindCSS** para estilos
- **React Router** para navegación
- **Lucide React** para iconografía
- **Recharts** para visualización de datos

### Backend (Firebase)
- **Firebase Authentication**
- **Cloud Firestore** (base de datos)
- **Cloud Functions** (Node.js 20)
- **Firebase Hosting**

### APIs y Servicios
- Google Gemini AI
- Plaid (conexión bancaria)
- Stripe (pagos y suscripciones)
- Datadog (monitoreo)
- APIs gubernamentales españolas

## 📁 Estructura del Proyecto

```
mayordomo/
├── components/           # Componentes React
│   ├── ChatInterface.tsx
│   ├── EvolutionPanel.tsx
│   ├── Onboarding.tsx
│   └── ...
├── functions/           # Cloud Functions
│   ├── index.js        # Punto de entrada
│   ├── aiService.js    # IA y análisis
│   ├── bankService.js  # Integración Plaid
│   ├── governmentService.js  # Servicios gubernamentales
│   ├── certificateService.js # Gestión de certificados
│   ├── authService.js  # Autenticación biométrica
│   └── mfaService.js   # MFA
├── services/           # Servicios frontend
│   ├── firebaseConfig.ts
│   ├── evolutionService.ts
│   └── analyticsService.ts
├── App.tsx            # Componente principal
├── ClientApp.tsx      # Dashboard principal
├── constants.ts       # Definiciones globales
├── types.ts          # Tipos TypeScript
└── README.md         # Este archivo
```

## 🚀 Instalación y Desarrollo

### Requisitos Previos
- Node.js 20+
- Cuenta de Firebase
- Cuenta de Stripe (opcional, para pagos)
- Cuenta de Plaid (opcional, para conexión bancaria)
- API Key de Google Gemini

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/tecnicfitia-TUTORIAL/mayordomo.git
cd mayordomo

# Instalar dependencias del frontend
npm install

# Instalar dependencias de Cloud Functions
cd functions
npm install
cd ..
```

### Configuración

1. **Firebase**: Crear proyecto en [Firebase Console](https://console.firebase.google.com/)
2. **Secrets** (Cloud Functions):
```bash
firebase functions:secrets:set GOOGLE_GEN_AI_KEY
firebase functions:secrets:set PLAID_CLIENT_ID
firebase functions:secrets:set PLAID_SECRET
firebase functions:secrets:set PLAID_ENCRYPTION_KEY
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

3. **Certificados Digitales** (opcional):
   - Colocar certificado `.cer` en `functions/certs/idcat.cer`

### Desarrollo Local

```bash
# Frontend (dev server)
npm run dev

# Emuladores de Firebase
firebase emulators:start

# Build de producción
npm run build
```

## 📊 Sistema de Pilares

La aplicación organiza la vida del usuario en **8 pilares**:

1. **🏛️ BUROCRACIA**: Documentos, impuestos, trámites
2. **🆔 IDENTIDAD**: Certificados, autenticación
3. **💰 FINANZAS**: Cuentas, gastos, inversiones
4. **🏠 VIVIENDA**: Hogar, servicios, mantenimiento
5. **✈️ VIAJES**: Planificación, reservas
6. **❤️ VITAL**: Salud, bienestar
7. **👨‍👩‍👧 NÚCLEO**: Familia, relaciones
8. **🧘 OCIO**: Entretenimiento, tiempo libre

## 💎 Planes de Suscripción

| Tier | Nombre | Características |
|------|--------|-----------------|
| **FREE** | Básico | Chat básico, 2 pilares |
| **BASIC** | Asistente Digital | 4 pilares, análisis básico |
| **PRO** | Mayordomo Digital | 8 pilares, integraciones premium |
| **VIP** | Confort Total | Todo incluido + soporte prioritario |

## 🔒 Seguridad y Privacidad

- Encriptación AES-256-GCM para datos bancarios y certificados
- Autenticación multifactor (MFA)
- WebAuthn para biometría
- Firestore Security Rules estrictas
- Certificados digitales para servicios gubernamentales
- Cumplimiento GDPR

## 📱 Despliegue

### Web (Firebase Hosting)
```bash
npm run build
firebase deploy --only hosting
```

### Cloud Functions
```bash
firebase deploy --only functions
```

### PWA (Android/iOS)
- Configurado con **Capacitor**
- Manifest y Service Worker incluidos

## 🤝 Contribución

Este es un proyecto educativo/tutorial. Para contribuir:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Documentación Adicional

- [AI_BRAINS_ANALYSIS.md](./AI_BRAINS_ANALYSIS.md) - Análisis del sistema de IA
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Resumen de implementación
- [SECURITY_AUDIT_FINAL.md](./SECURITY_AUDIT_FINAL.md) - Auditoría de seguridad
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Lista de verificación para producción

## ⚠️ Estado del Proyecto

✅ **Completado:**
- Sistema de autenticación
- Integración con IA
- Servicios gubernamentales
- Sistema de permisos
- Dashboard completo

⏳ **En desarrollo:**
- Integración completa con Stripe
- Testing automatizado
- Optimizaciones de rendimiento

## 📞 Soporte

Para preguntas o problemas:
- Abrir un [Issue](https://github.com/tecnicfitia-TUTORIAL/mayordomo/issues)
- Consultar la documentación en el directorio del proyecto

## 📝 Licencia

Este proyecto es de código abierto con fines educativos.

---

**Desarrollado con ❤️ usando React, Firebase y Google Gemini AI