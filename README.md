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
├── .env.example        # Plantilla de variables de entorno para Docker
├── .env                # Tu configuración real (NO se sube al repo)
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── .env.example    # Plantilla para desarrollo local sin Docker
│   └── src/
│       ├── db/         # Migraciones SQL consolidadas y configuración
│       ├── middleware/ # Validaciones de seguridad y protección IDOR
│       ├── modules/    # Módulos de negocio (Ordenes, Clientes, Auth)
│       └── uploads/    # Directorio persistente de evidencias y firmas
└── frontend/
    ├── Dockerfile
    ├── nginx.conf      # Reverse proxy /api/ y /uploads/ → backend
    └── src/
        ├── components/
        │   ├── features/ # Componentes de negocio (orden, certificado)
        │   └── ui/       # Componentes de interfaz reutilizables
        ├── hooks/        # Lógica de sincronización offline y estado
        └── pages/        # Vistas principales de la aplicación
```

## ⚙️ Despliegue con Docker (recomendado)

### 1. Configurar las variables de entorno

```bash
# Copia la plantilla de la raíz del proyecto
cp .env.example .env
```

Edita `.env` con tus valores reales. **Nunca subas este archivo al repositorio.**

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=una_contraseña_segura
POSTGRES_DB=plagcontrol

JWT_SECRET=un_secreto_largo_y_aleatorio_minimo_32_caracteres
JWT_EXPIRES_IN=1d

# En Docker con reverse-proxy, el frontend usa ruta relativa
VITE_API_URL=/api
```

### 2. Preparar el directorio de uploads

El usuario `node` (uid 1000) dentro del contenedor del backend necesita
permisos de escritura sobre `backend/uploads/`:

```bash
# Linux / macOS
mkdir -p backend/uploads
chmod 777 backend/uploads

# Windows (PowerShell) — los permisos de NTFS permiten escritura por defecto
mkdir -p backend\uploads
```

### 3. Levantar el stack completo

```bash
docker compose up --build
```

Esto construirá las imágenes, iniciará PostgreSQL, esperará a que la base de
datos esté lista (`pg_isready`), ejecutará las migraciones SQL automáticas y
levantará el frontend en **http://localhost**.

> **Nota:** El frontend (Nginx) actúa como reverse proxy:
> - `http://localhost/api/…` → `backend:3001/api/…`
> - `http://localhost/uploads/…` → `backend:3001/uploads/…`
>
> El navegador habla con un único origen (puerto 80), por lo que no hay
> problemas de CORS ni de cookies cross-origin.

### 4. Detener el stack

```bash
docker compose down          # detiene y elimina contenedores
docker compose down -v       # también elimina el volumen de la BD
```

---

## 💻 Desarrollo local sin Docker

Si prefieres correr los servicios directamente en tu máquina:

### Requisitos previos
- Node.js 20+
- PostgreSQL 15 corriendo localmente

### Configurar el backend

```bash
cd backend
cp .env.example .env
# Edita .env con tu conexión local a PostgreSQL y tu JWT_SECRET
npm install
npm start
```

Las migraciones SQL se ejecutan automáticamente al arrancar.

### Configurar el frontend

```bash
cd frontend
cp .env.example .env
# .env.example ya incluye VITE_API_URL=http://localhost:3001/api
npm install
npm run dev
```

El frontend estará disponible en **http://localhost:5173**.

---

## 🏗️ Notas de Arquitectura

- **Arquitectura Soberana**: El sistema no depende de servicios BaaS (como Supabase), permitiendo el control total sobre los datos y el despliegue.
- **Modularidad**: El frontend utiliza una arquitectura de componentes "Features" para evitar archivos monolíticos (ej. `OrdenDetalle` refactorizado).
- **Gestión de Archivos**: Las imágenes se sirven con protección de token, asegurando que solo los dueños de la información puedan visualizarlas.
- **Seguridad de contenedores**: El proceso Node del backend corre con el usuario `node` (sin privilegios root). Las migraciones no se inician hasta que PostgreSQL reporta estado `healthy` vía `pg_isready`.

## 📄 Licencia
Software desarrollado para la plataforma PlagControl. Todos los derechos reservados.