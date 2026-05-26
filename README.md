# PlagControl - Sistema de Gestión de Control de Plagas

Sistema integral para la gestión operativa de empresas de control de plagas. Diseñado con una arquitectura modular, robusta y optimizada para despliegues en ecosistemas de aplicaciones profesionales.

## 🚀 Características Principales

- **Dashboard Administrativo**: Control total de clientes, técnicos y servicios con visualización de métricas.
- **Portal de Clientes**: Seguimiento en tiempo real de órdenes de servicio, historial detallado y descarga de certificados.
- **Gestión Operativa Modular**: Registro de aplicaciones, productos químicos, estaciones de control y registro fotográfico por secciones.
- **Sincronización Offline**: Capacidad de registrar actividades y evidencias sin conexión a internet mediante una cola de sincronización (Sync Queue) basada en IndexedDB.
- **Motor de Certificados**: Generación automática de reportes técnicos en PDF con firmas digitales, evidencias fotográficas.
- **PWA (Progressive Web App)**: Instalable en dispositivos móviles con rendimiento nativo y persistencia local.

## 🛡️ Seguridad y Robustez

- **Protección IDOR**: Validación de propiedad en todos los sub-recursos (`fotos`, `actividades`, `estaciones`) mediante middleware de acceso jerárquico.
- **Control de Cargas**: Sistema de *whitelist* para la gestión de archivos, previniendo ataques de Directory Traversal.
- **Consistencia de Datos**: Esquema de base de datos consolidado en `001_initial_schema.sql` para facilitar despliegues desde cero.
- **Autenticación JWT**: Manejo seguro de sesiones y roles (Admin, Técnico, Cliente).

## 🛠️ Stack Tecnológico

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Dexie.js (IndexedDB).
- **Backend**: Node.js, Express, PostgreSQL (`pg` pool), JWT.
- **Base de Datos**: PostgreSQL con sistema de migraciones automatizado.
- **Generación de Reportes**: jsPDF con precarga de imágenes en Base64 para integridad de datos.

## 📦 Estructura del Proyecto

```text
plagcontrol/
├── backend/            # Lógica de servidor y API
│   ├── src/
│   │   ├── db/         # Migraciones SQL consolidadas y configuración
│   │   ├── middleware/ # Validaciones de seguridad y protección IDOR
│   │   ├── modules/    # Módulos de negocio (Ordenes, Clientes, Auth)
│   │   └── uploads/    # Directorio persistente de evidencias y firmas
├── frontend/           # Interfaz de usuario (React)
│   ├── src/
│   │   ├── components/ 
│   │   │   ├── features/ # Componentes de negocio (orden, certificado)
│   │   │   └── ui/       # Componentes de interfaz reutilizables
│   │   ├── hooks/      # Lógica de sincronización offline y estado
│   │   └── pages/      # Vistas principales de la aplicación
```

## ⚙️ Configuración y Despliegue

### 1. Base de Datos (PostgreSQL)
El sistema cuenta con un motor de migraciones automáticas. Al conectar el backend a una base de datos vacía, este ejecutará el esquema maestro en `backend/src/db/migrations/001_initial_schema.sql` automáticamente.

### 2. Variables de Entorno
Crea un archivo `.env` en las carpetas correspondientes:

**Backend (`backend/.env`):**
```env
PORT=3001
PGHOST=localhost
PGUSER=tu_usuario
PGPASSWORD=tu_password
PGDATABASE=plagcontrol
PGPORT=5432
JWT_SECRET=una_clave_secreta_y_larga
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:3001/api
```

### 3. Instalación y Ejecución

**Levantar el Backend:**
```bash
cd backend
npm install
npm start
```

**Levantar el Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🏗️ Notas de Arquitectura

- **Arquitectura Soberana**: El sistema no depende de servicios BaaS (como Supabase), permitiendo el control total sobre los datos y el despliegue.
- **Modularidad**: El frontend utiliza una arquitectura de componentes "Features" para evitar archivos monolíticos (ej. `OrdenDetalle` refactorizado).
- **Gestión de Archivos**: Las imágenes se sirven con protección de token, asegurando que solo los dueños de la información puedan visualizarlas.

## 📄 Licencia
Software desarrollado para la plataforma PlagControl. Todos los derechos reservados.