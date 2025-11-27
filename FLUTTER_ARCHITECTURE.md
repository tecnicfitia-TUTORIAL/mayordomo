# Arquitectura Técnica: Confort 65/35 (Flutter)

Este documento define los cimientos estructurales para la versión móvil nativa de la aplicación.

## 1. Estructura de Directorios (Clean Architecture)

El proyecto sigue una organización basada en **Features** (Funcionalidades) para escalar horizontalmente sin acoplamiento.

```text
lib/
├── core/                           # Lógica compartida y utilidades base
│   ├── constants.dart              # Textos fijos, Enums (SubscriptionTier)
│   ├── theme/
│   │   └── app_theme.dart          # Paleta Dark/Gold y estilos de texto
│   ├── services/
│   │   ├── inference_engine.dart   # Lógica AI (Gemini)
│   │   ├── stripe_service.dart     # Gestión de Pagos
│   │   └── context_engine.dart     # Manejo de estado offline/online
│   └── widgets/                    # Widgets atómicos compartidos (Buttons, Cards)
│
├── data/                           # Capa de Datos
│   ├── models/
│   │   ├── user_profile.dart       # Modelo de Usuario
│   │   ├── life_obligation.dart    # Modelo Polimórfico de Obligación
│   │   └── asset.dart              # Modelo de Activo
│   └── repositories/
│       ├── auth_repository.dart    # Firebase Auth
│       └── firestore_repository.dart # CRUD de base de datos
│
├── features/                       # Módulos Funcionales
│   ├── auth/
│   │   ├── screens/
│   │   │   ├── login_screen.dart
│   │   │   └── admin_console_screen.dart # "Huevo de Pascua" Admin
│   │   └── widgets/
│   │       └── onboarding_steps.dart
│   │
│   ├── dashboard/
│   │   ├── screens/
│   │   │   └── dashboard_screen.dart # Scaffold principal
│   │   └── widgets/
│   │       ├── sidebar_drawer.dart   # Menú lateral
│   │       ├── mission_briefing_card.dart
│   │       └── chat_overlay.dart     # Ventana flotante
│   │
│   ├── pillars/                    # Bento Grids de los 5 Pilares
│   │   ├── widgets/
│   │   │   ├── pillar_card.dart      # Tarjeta resumen (Dashboard)
│   │   │   ├── centinela_grid.dart
│   │   │   ├── patrimonio_grid.dart
│   │   │   └── ... (otros pilares)
│   │
│   ├── details/
│   │   └── screens/
│   │       └── universal_detail_screen.dart # Pantalla detalle de tarjeta
│   │
│   ├── settings/
│   │   ├── screens/
│   │   │   └── permissions_tree_screen.dart # Árbol de Permisos
│   │   └── widgets/
│   │       └── subscription_modal.dart      # Modal de Stripe
│   │
│   └── support/
│       └── screens/
│           └── support_dashboard_screen.dart # Panel de Monitoreo
│
├── main.dart                       # Punto de entrada
└── routes.dart                     # Mapa de navegación
```

---

## 2. Sistema de Rutas (`lib/routes.dart`)

Implementación del sistema de navegación nominal.

```dart
import 'package:flutter/material.dart';

// Imports de pantallas (Referencias)
import 'features/auth/screens/login_screen.dart';
import 'features/auth/screens/admin_console_screen.dart';
import 'features/dashboard/screens/dashboard_screen.dart';
import 'features/details/screens/universal_detail_screen.dart';
import 'features/settings/screens/permissions_tree_screen.dart';
import 'features/support/screens/support_dashboard_screen.dart';

class AppRoutes {
  // Constantes de Ruta
  static const String login = '/login';
  static const String adminConsole = '/admin_console';
  static const String dashboard = '/dashboard';
  static const String detail = '/detail'; // Uso: /detail/:id
  static const String permissions = '/settings/permissions';
  static const String support = '/support';

  // Mapa de Rutas Estáticas
  static Map<String, WidgetBuilder> getRoutes() {
    return {
      login: (context) => const LoginScreen(),
      adminConsole: (context) => const AdminConsoleScreen(),
      dashboard: (context) => const DashboardScreen(),
      permissions: (context) => const PermissionsTreeScreen(),
      support: (context) => const SupportDashboardScreen(),
    };
  }

  // Generador de Rutas Dinámicas (para pasar argumentos)
  static Route<dynamic>? onGenerateRoute(RouteSettings settings) {
    
    // Manejo de ruta dinámica: /detail/:id
    if (settings.name != null && settings.name!.startsWith(detail)) {
      // Opción A: Pasar objeto completo en arguments
      final args = settings.arguments as Map<String, dynamic>?;
      
      return MaterialPageRoute(
        builder: (context) => UniversalDetailScreen(
          itemId: args?['id'] ?? '',
          itemType: args?['type'] ?? 'GENERIC',
        ),
        settings: settings,
      );
    }

    // Fallback (404)
    return MaterialPageRoute(
      builder: (context) => const Scaffold(
        body: Center(child: Text('Ruta no encontrada')),
      ),
    );
  }
}
```

## 3. Configuración de Dependencias Sugerida (`pubspec.yaml`)

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Core
  firebase_core: ^2.24.2
  firebase_auth: ^4.16.0
  cloud_firestore: ^4.14.0
  
  # State Management
  flutter_riverpod: ^2.4.9 # Recomendado para Clean Arch
  
  # UI/UX
  google_fonts: ^6.1.0 # Para Inter y Playfair Display
  flutter_animate: ^4.3.0 # Para efectos de entrada
  lucide_icons: ^0.1.0 # Iconografía consistente con React
  
  # Logic
  google_generative_ai: ^0.2.0 # Gemini
  shared_preferences: ^2.2.2 # Persistencia Offline simple
  url_launcher: ^6.2.1 # Para abrir Stripe Portal
```