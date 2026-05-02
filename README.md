# Fidelity App (Zuma)

App de fidelización de clientes para negocios locales. Los clientes acumulan puntos y canjean recompensas; los negocios gestionan sus programas de lealtad.

---

## Tabla de Contenidos

- [Características](#características)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
- [Ejecutar el Proyecto](#ejecutar-el-proyecto)
- [Scripts Disponibles](#scripts-disponibles)
- [Funcionalidades por Rol](#funcionalidades-por-rol)
- [Datos de Prueba](#datos-de-prueba)
- [Base de Datos (Supabase)](#base-de-datos-supabase)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

---

## Características

### Para Clientes
- Inicio de sesión y registro con email/contraseña
- Ver tarjetas de lealtad de múltiples negocios
- Acumular puntos por compras
- Canjear recompensas disponibles
- Ver historial de transacciones
- Progressión de nivel (Bronze → Silver → Gold)
- Explorar negocios disponibles
- Editar perfil de usuario

### Para Negocios
- Dashboard con métricas clave (KPIs)
- Lista de clientes y sus tarjetas de lealtad
- Gestión de productos y precios
- Crear y gestionar promociones
- Configurar recompensas canjeables
- Publicar noticias/avisos
- Configuración del negocio (nombre, horarios, etc.)

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-------------|
| Frontend | React 18 + TypeScript |
| Build Tool | Vite |
| Estilos | Tailwind CSS |
| Routing | React Router v7 |
| Backend | Supabase (Auth + Database) |
| Gráficos | Recharts |
| Iconos | Lucide React |
| Estado | React Context API |

---

## Estructura del Proyecto

```
Fidelity App/
├── src/
│   ├── main.tsx                    # Punto de entrada
│   ├── App.tsx                    # Router principal y layouts
│   ├── index.css                  # Estilos globales + Tailwind
│   │
│   ├── components/                # Componentes reutilizables
│   │   ├── BottomNav.tsx          # Navegación inferior (cliente)
│   │   ├── BusinessSidebar.tsx    # Sidebar lateral (negocio)
│   │   ├── BusinessBottomNav.tsx   # Navegación inferior (negocio)
│   │   ├── LoyaltyCard.tsx        # Tarjeta de fidelización
│   │   ├── LevelProgressBar.tsx   # Progress bar de nivel
│   │   ├── RoleSwitcher.tsx        # Cambio de rol (debug)
│   │   ├── Toast.tsx              # Notificaciones toast
│   │   ├── Modal.tsx              # Componente modal
│   │   ├── SkeletonLoader.tsx      # Loading skeleton
│   │   └── EmptyState.tsx         # Estado vacío
│   │
│   ├── context/                   # Proveedores de estado
│   │   ├── AuthContext.tsx        # Autenticación (Supabase)
│   │   ├── AppContext.tsx         # Estado global (role, toasts)
│   │   └── BusinessDataContext.tsx # Datos del negocio
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   └── AuthPage.tsx       # Login / Registro
│   │   ├── customer/              # Vistas de cliente
│   │   │   ├── HomePage.tsx       # Inicio
│   │   │   ├── CardsPage.tsx      # Lista de tarjetas
│   │   │   ├── CardDetailPage.tsx # Detalle de tarjeta
│   │   │   ├── ProfilePage.tsx     # Perfil de usuario
│   │   │   ├── ExplorePage.tsx    # Explorar negocios
│   │   │   └── ExploreBusinessPage.tsx # Detalle de negocio
│   │   └── business/              # Vistas de negocio
│   │       ├── OverviewPage.tsx  # Dashboard KPIs
│   │       ├── CustomersPage.tsx  # Lista de clientes
│   │       ├── ProductsPage.tsx   # Gestión de productos
│   │       ├── PromotionsPage.tsx # Gestión de promociones
│   │       ├── RewardsPage.tsx    # Gestión de recompensas
│   │       ├── NewsPage.tsx       # Publicación de noticias
│   │       └── SettingsPage.tsx   # Configuración del negocio
│   │
│   ├── lib/
│   │   └── supabase.ts            # Cliente de Supabase
│   │
│   ├── hooks/
│   │   └── useSupabaseQuery.ts    # Hook para queries
│   │
│   └── data/
│       └── mockData.ts            # Datos de prueba (no usado en prod)
│
├── public/
│   ├── manifest.json              # Manifiesto PWA
│   └── icons/                     # Iconos PWA (pendiente)
│
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── .env.example
└── .env                           # Variables locales (no versionar)
```

---

## Requisitos Previos

- Node.js 18+ 
- npm 9+
- Cuenta de Supabase (gratis)

---

## Instalación

```bash
# 1. Clonar o navegar al directorio del proyecto
cd "Fidelity App"

# 2. Instalar dependencias
npm install
```

---

## Configuración de Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

Obtener estos valores desde el dashboard de Supabase:
1. Ir a **Settings** → **API**
2. Copiar **Project URL** y **anon public key**

El archivo `.env.example` contiene las variables requeridas como referencia.

---

## Ejecutar el Proyecto

```bash
# Modo desarrollo (con hot reload)
npm run dev

# Producción (build)
npm run build

# Preview del build
npm run preview
```

El proyecto corre en `http://localhost:5173` por defecto.

---

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Iniciar servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build |
| `npm run lint` | Verificar código con ESLint |
| `npm run typecheck` | Verificar tipos con TypeScript |

---

## Funcionalidades por Rol

### Cliente (`/home`, `/cards`, `/profile`)
- Ver todas sus tarjetas de lealtad
- Detalle por negocio con nivel y puntos
- Historial de transacciones
- Explorar negocios disponibles
- Editar perfil

### Negocio (`/business/*`)
- **Overview**: KPIs, gráfico de puntos, distribución de niveles
- **Customers**: Lista de clientes con tarjetas
- **Products**: CRUD de productos/servicios
- **Promotions**: Crear/editar promociones
- **Rewards**: Configurar recompensas canjeables
- **News**: Publicar avisos/noticias
- **Settings**: Datos del negocio, horarios, información

---

## Datos de Prueba

El archivo `src/data/mockData.ts` contiene datos de ejemplo:
- 4 negocios (Moka Café, Épico, Fortuna Café, Inboga Barbería)
- 1 cliente de prueba (Sofía Martínez)
- Transacciones, niveles, recompensas, promociones

> **Nota**: Estos datos mock NO se utilizan en producción. La app se conecta a Supabase real.

---

## Base de Datos (Supabase)

### Visión General del Sistema

**Zuma** es un sistema de tarjetas de lealtad digital que permite:

- **Negocios**: Crear programas de lealtad, gestionar productos, registrar compras y otorgar puntos a clientes
- **Clientes**: Acumular puntos, canjear recompensas y ver su historial

### Roles de Usuario

| Rol | Descripción |
|-----|-------------|
| `customer` | Cliente que acumula puntos y canjea recompensas |
| `business` | Dueño de negocio que administra su negocio y registra compras |

### Tablas de la Base de Datos

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfiles de usuario (extendidos de auth.users) |
| `businesses` | Información de los negocios |
| `business_hours` | Horarios de atención por día |
| `products` | Productos/servicios del negocio con precio y puntos |
| `loyalty_levels` | Niveles de lealtad (Bronze, Silver, Gold) |
| `loyalty_programs` | Configuración del programa de puntos |
| `loyalty_cards` | Tarjetas de lealtad (relación cliente-negocio) |
| `point_transactions` | Historial de movimientos de puntos |
| `purchases` | Registro de compras realizadas |
| `purchase_items` | Detalle de productos en cada compra |
| `rewards` | Recompensas canjeables |
| `reward_redemptions` | Registro de canjes de recompensas |
| `promotions` | Promociones especiales |
| `promotion_usages` | Uso de promociones por cliente |
| `notifications` | Notificaciones a usuarios |

### Esquema de Relaciones

```
auth.users (1) ──< profiles
      │
      ├─< businesses (owner_id)
      └─< loyalty_cards (user_id)

businesses (1) ──< business_hours
      ├─< products
      ├─< loyalty_levels
      ├─< loyalty_programs
      ├─< loyalty_cards
      ├─< rewards
      ├─< promotions
      ├─< purchases
      └─< notifications

loyalty_cards (1) ──< point_transactions
      ├─< purchases
      ├─< reward_redemptions
      └─< promotion_usages

purchases (1) ──< purchase_items
      └─< promotion_usages
```

### Archivos de Documentación SQL

En la raíz del proyecto existen scripts SQL con la configuración completa:

| Archivo | Contenido |
|---------|-----------|
| `database-documentation.sql` | Schema completo, RLS, triggers, funciones |
| `create-rewards-tables.sql` | Tablas de recompensas y políticas |
| `add-hours-column.sql` | Agregar columna hours a businesses |

### Funciones y Triggers

| Función/Trigger | Propósito |
|-----------------|-----------|
| `handle_new_user()` | Crea perfil automáticamente al registrar usuario |
| `update_updated_at_column()` | Actualiza timestamp en cada tabla |
| `generate_card_number()` | Genera número de tarjeta único (FID-xxxxx) |
| `check_level_upgrade()` | Verifica y aplica upgrade de nivel automáticamente |

### Seguridad (RLS)

Todas las tablas tienen Row Level Security habilitado:

- **Clientes**: Solo ven sus propias tarjetas, transacciones y recompensas
- **Negocios**: Solo ven y gestionan datos de SUS clientes
- **Público**: Negocios activos, productos disponibles, recompensas activas

### Scripts de Setup

Para configurar la base de datos, ejecutar en el **SQL Editor de Supabase** en este orden:

```sql
-- 1. Schema principal (database-documentation.sql)
-- 2. Tablas de recompensas (create-rewards-tables.sql)
-- 3. Columna hours (add-hours-column.sql)
```

### Consultas Útiles

```sql
-- Ver tablas creadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Ver políticas RLS
SELECT tablename, policyname FROM pg_policies;

-- Ver estructura de una tabla
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'loyalty_cards';
```

---

## Contribuir

1. Crear una rama (`git checkout -b feature/nueva-funcionalidad`)
2. Hacer commit (`git commit -m 'Agregar...'`)
3. Push a la rama (`git push origin feature/nueva-funcionalidad`)
4. Abrir un Pull Request

### Convenciones
- Usar TypeScript
- Componentes funcionales con hooks
- Tailwind CSS para estilos
- Nombrado: PascalCase para componentes, camelCase para funciones
- Ejecutar `npm run lint` y `npm run typecheck` antes de commit

---

## Licencia

MIT