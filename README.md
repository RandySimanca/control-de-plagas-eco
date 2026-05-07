# 🐜 PlagControl — SaaS de Gestión Profesional de Control de Plagas

**PlagControl** es una plataforma **SaaS Multi-Tenant** "mobile-first" diseñada para empresas de control de plagas. Automatiza la operación en campo, genera informes técnicos PDF de alta fidelidad, gestiona solicitudes y cotizaciones, y ofrece transparencia total a los clientes a través de un portal dedicado.

---

## 🚀 Características Principales

### 👑 Plataforma Multi-Tenant (SaaS)
- **Aislamiento de Datos por Empresa**: Cada empresa tiene su entorno propio (clientes, órdenes, configuración, branding) aislado mediante Row Level Security (RLS) en Supabase.
- **Portal Superadmin**: Tablero global para registrar y gestionar múltiples empresas (tenants), controlar el estado de licencias y crear administradores por empresa.
- **Bloqueo Inteligente por Licencia**: Empresas con licencia vencida o suspendida pierden acceso automáticamente. Los clientes vinculados mantienen acceso para crear nuevas solicitudes de servicio.

### 📱 Módulo del Técnico en Campo
- **Bitácora de Actividades en Tiempo Real**: Registro paso a paso del servicio con descripciones, fechas y horas automáticas. Las entradas pueden editarse o eliminarse durante la ejecución.
- **Evidencia Fotográfica Rápida**: Captura y subida de fotos directamente desde el móvil, integradas al flujo del certificado PDF.
- **Áreas Intervenidas**: Selección dinámica de áreas del establecimiento desde un listado predefinido de 18 categorías.
- **Métodos de Aplicación**: Checklist dinámico según el tipo de servicio (Desinsectación, Desratización, Desinfección).
- **Monitoreo de Estaciones**: Registro detallado de estaciones cebaderas (cebadero, impacto, jaula) con control de cantidad, observaciones y fotos comparativas antes/después.
- **Recomendaciones del Técnico**: Campo libre con soporte para adjuntar fotos de evidencia, que se incluye formalmente en el certificado PDF.

### 🏢 Módulo de Administración (Por Empresa)
- **Gestión de Órdenes de Servicio**: Creación, asignación a técnicos, seguimiento de estados y eliminación.
- **Workflow de Solicitudes y Cotizaciones**:
  - Recepción de solicitudes enviadas desde el portal de clientes.
  - Generación de cotizaciones con precio y descripción.
  - Conversión directa de solicitudes aceptadas en órdenes de trabajo con datos pre-completados.
- **Gestión de Clientes y Accesos**: Creación simultánea de clientes y cuentas de portal. Control de estado activo/inactivo.
- **Branding y Configuración del PDF**: Logo corporativo, textos de pie de página, versión e informe del modelo, y recomendaciones generales predefinidas.
- **Repositorio Legal Centralizado**: Subida y gestión de documentos legales (RUT, Cámara de Comercio, permisos de salud) visibles para clientes en el portal.
- **Gestión de Usuarios**: Alta de administradores, técnicos y clientes con control de roles, especialidad y firma digital del técnico.

### 🌐 Portal del Cliente
- **Login Seguro Independiente**: Portal separado del acceso del equipo técnico, con redirección automática según el rol.
- **Motor de Solicitudes**: Los clientes crean solicitudes de servicio (tipo, descripción, dirección, fecha preferida) y reciben cotizaciones directamente en el portal.
- **Respuesta a Cotizaciones**: El cliente acepta o rechaza la propuesta; la aceptación convierte la solicitud en orden de trabajo de forma inmediata.
- **Seguimiento en Tiempo Real**: Visualización de la bitácora del técnico y galería de fotos durante el servicio.
- **Historial y Certificados**: Descarga en PDF de certificados de servicios completados.
- **Documentos Legales**: Visualización de resoluciones y permisos de la empresa operadora.
- **Suspensión Inteligente**: Cuentas con licencia de empresa vencida muestran advertencia pero mantienen capacidad de solicitar servicios.

### 📄 Generación Documental (PDF)
- Informe técnico de alta fidelidad generado con jsPDF, incluyendo:
  - Portada corporativa con diseño diagonal y logo
  - Identificación del cliente y objetivos del servicio
  - Áreas intervenidas, actividades ejecutadas y métodos aplicados
  - Trazabilidad de productos químicos e insumos
  - Monitoreo de estaciones con fotos antes/después
  - Galería de evidencias fotográficas (6 por página con etiquetas de color)
  - Recomendaciones generales y del técnico
  - Firma digital del técnico
  - Cabeceras con metadatos de versión y paginación en todas las páginas internas

### 🖥️ Interfaz Moderna y Flujos en Modales
- **Arquitectura de Modales In-place**: Todos los flujos de creación y edición (Órdenes, Clientes, Usuarios, Empresas) se manejan sobre la misma vista actual usando modales con fondo difuminado (backdrop blur), evitando saltos de navegación y garantizando el foco en la tarea.
- **Diseño Dinámico**: Interfaces reactivas con retroalimentación inmediata (toasts y badges por color según estado) para fluidez de uso.

### 📲 PWA (Progressive Web App) y Sincronización Offline 📡
- Instalable en dispositivos móviles y de escritorio.
- **Service Worker**: Cache de dependencias vitales e imágenes garantizando un inicio offline ultrarápido.
- **Modo Offline Real (Dexie.js)**: Persistencia en IndexedDB cuando el técnico en campo pierde la señal, guardando colas de mutaciones de datos y fotos.
- **Background Sync**: Tan pronto regresa la conexión de datos o WiFi, el sistema vacía en background la cola offline sincronizando de nuevo con Supabase.
- Botón de instalación inteligente con notificaciones de conectividad en interfaz.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19 + Vite 8 |
| **Estilos** | Tailwind CSS 4 |
| **UI / Alertas** | SweetAlert2 + react-hot-toast + Lucide React |
| **Backend / DB** | Supabase (PostgreSQL + Storage + Auth) |
| **Generación PDF** | jsPDF 4 |
| **Routing** | React Router DOM v7 |
| **PWA** | vite-plugin-pwa + Workbox |
| **Despliegue** | Vercel |

---

## 📂 Estructura del Proyecto

```
src/
├── assets/                      # Logos e imágenes estáticas
├── components/
│   ├── Layout.jsx               # Navegación lateral adaptativa + badge de solicitudes
│   ├── ProtectedRoute.jsx       # Guardián de rutas con control de roles y licencias
│   ├── RoleModal.jsx            # Modal de redirección por rol incorrecto
│   └── SignaturePad.jsx         # Pad de firma digital con canvas
├── contexts/
│   └── AuthContext.jsx          # Estado global de autenticación, perfil y empresa
├── hooks/
│   └── useInstallPrompt.js      # Hook para instalación de PWA
├── lib/
│   ├── alerts.js                # Centralización de diálogos SweetAlert2
│   ├── supabase.js              # Cliente Supabase
│   └── generarCertificado.js    # Motor de generación de PDF (jsPDF)
├── pages/
│   ├── superadmin/
│   │   ├── DashboardSAAS.jsx    # Tablero global de empresas/tenants
│   │   └── EmpresaForm.jsx      # Creación y edición de empresas + admin inicial
│   ├── admin/
│   │   ├── Usuarios.jsx         # Listado de usuarios
│   │   ├── UsuarioForm.jsx      # Alta/edición de usuarios (admin, técnico, cliente)
│   │   ├── Tecnicos.jsx         # Vista de técnicos con conteo de órdenes
│   │   ├── Solicitudes.jsx      # Workflow de solicitudes y cotizaciones
│   │   ├── Configuracion.jsx    # Branding, PDF y datos de empresa
│   │   └── DocumentosLegales.jsx
│   ├── portal/
│   │   ├── PortalLogin.jsx
│   │   ├── PortalHistorial.jsx  # Tabs: historial, certificados, documentos, solicitudes
│   │   ├── PortalOrdenDetalle.jsx
│   │   └── PortalSolicitudForm.jsx
│   ├── Dashboard.jsx
│   ├── Clientes.jsx / ClienteForm.jsx / ClienteDetalle.jsx
│   ├── Ordenes.jsx / OrdenForm.jsx
│   ├── OrdenDetalle.jsx         # Centro de operaciones del técnico en campo
│   └── Certificados.jsx
└── index.css                    # Tokens de diseño y clases Tailwind personalizadas
```

---

## 👥 Matriz de Roles

| Rol | Acceso |
|---|---|
| **Superadmin** | Control absoluto. Gestiona empresas/tenants, licencias y administradores. |
| **Admin Empresa** | Gestión completa de su tenant: órdenes, clientes, usuarios, solicitudes, PDF y branding. |
| **Técnico** | Visualiza y opera sus órdenes asignadas: bitácora, fotos, áreas, métodos, estaciones y recomendaciones. |
| **Cliente** | Portal propio: solicitudes, cotizaciones, seguimiento en tiempo real, certificados PDF y documentos legales. |

---

## ⚙️ Configuración e Instalación

### Requisitos Previos
- Node.js v20 o superior
- Proyecto en [Supabase](https://supabase.com/) con el esquema de `supabase/schema.sql` aplicado

### Instalación Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/RandySimanca/control-de-plagas.git
cd plagcontrol

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase:
# VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
# VITE_SUPABASE_ANON_KEY=tu-clave-anon-aqui

# 4. Aplicar el esquema de base de datos
# Ejecuta supabase/schema.sql en el SQL Editor de tu proyecto Supabase

# 5. Correr la aplicación
npm run dev
```

### Despliegue en Vercel
El archivo `vercel.json` ya incluye la reescritura de rutas para que el routing del lado del cliente funcione correctamente con React Router.

---

## 🔐 Seguridad — Row Level Security (RLS)

Toda la seguridad multi-tenant descansa en RLS de PostgreSQL:

- Cada tabla incluye `empresa_id` como columna de aislamiento.
- Las políticas utilizan funciones `SECURITY DEFINER` (`es_admin()`, `es_tecnico()`, `es_superadmin()`, `get_my_empresa_id()`, `get_my_cliente_id()`) para evitar recursión y mantener eficiencia.
- El trigger `on_auth_user_created` auto-crea el perfil al registrar un usuario, asignando el `empresa_id` correcto desde los metadatos del registro.
- El bucket `fotos-servicio` es público para lectura; la escritura requiere autenticación con rol válido.
- El bucket `documentos` es público para lectura; la escritura y borrado están restringidos a admins.

---

## 🗃️ Base de Datos — Tablas Principales

| Tabla | Descripción |
|---|---|
| `empresas` | Tenants del SaaS con estado de licencia |
| `profiles` | Usuarios del sistema (extiende `auth.users`) |
| `clientes` | Clientes de cada empresa |
| `ordenes_servicio` | Órdenes de trabajo con estado y técnico asignado |
| `productos_usados` | Productos químicos aplicados por orden |
| `estaciones_usadas` | Monitoreo de estaciones cebaderas por orden |
| `actividades_servicio` | Bitácora de avances del técnico |
| `fotos_servicio` | Evidencias fotográficas por orden |
| `certificados` | Registro de certificados generados con folio único |
| `solicitudes_servicio` | Solicitudes del portal de clientes con workflow de cotización |
| `documentos_legales` | Archivos PDF legales de la empresa |
| `configuracion` | Branding y configuración del PDF por empresa |

---

> Desarrollado con ❤️ para transformar digitalmente la industria de bioseguridad y control de plagas.