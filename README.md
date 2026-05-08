# PlagControl - Sistema de Gestión de Control de Plagas

Sistema integral para la gestión operativa de empresas de control de plagas. Diseñado con una arquitectura modular, robusta y optimizada para despliegues en ecosistemas de aplicaciones (Single-Tenant / Multi-instance).

## 🚀 Características Principales

- **Dashboard Administrativo**: Control total de clientes, técnicos y servicios.
- **Portal de Clientes**: Seguimiento en tiempo real de órdenes de servicio, historial y descarga de certificados.
- **Gestión Operativa**: Registro de aplicaciones, productos utilizados, estaciones de control y registro fotográfico.
- **Motor de Certificados**: Generación automática de reportes en PDF con firmas digitales y evidencias.
- **PWA (Progressive Web App)**: Instalable en dispositivos móviles con capacidades de funcionamiento offline.
- **Arquitectura Soberana**: Independencia total de servicios externos como Supabase; control absoluto sobre la base de datos PostgreSQL.

## 🛠️ Stack Tecnológico

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons.
- **Backend**: Node.js, Express, PostgreSQL (`pg` pool), JWT para autenticación.
- **Base de Datos**: PostgreSQL con sistema de migraciones automatizado.
- **Generación de Reportes**: jsPDF.

## 📦 Estructura del Proyecto

```text
plagcontrol/
├── backend/            # Lógica de servidor y API
│   ├── src/
│   │   ├── db/         # Migraciones SQL y configuración de BD
│   │   ├── modules/    # Módulos de negocio (Ordenes, Clientes, Profiles)
│   │   └── index.js    # Punto de entrada
├── frontend/           # Interfaz de usuario (React)
│   ├── src/
│   │   ├── api/        # Capa de servicios API
│   │   ├── components/ # Componentes UI y Features
│   │   └── pages/      # Páginas principales
```

## ⚙️ Configuración y Despliegue

### 1. Base de Datos (PostgreSQL)
El sistema cuenta con un motor de migraciones automáticas. Al conectar el backend a una base de datos vacía, este ejecutará los scripts necesarios en `backend/src/db/migrations/` automáticamente.

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

## 🏗️ Notas para el Superadmin (Despliegue SaaS)

Esta aplicación está diseñada bajo el modelo **Single-Tenant**. Para escalar a múltiples clientes dentro de un ecosistema:
- Se recomienda el despliegue de una instancia (BD + API + Web) por cada organización/cliente final.
- La base de datos es soberana y se autogestiona mediante el script `migrate.js` incluido en el arranque del backend.
- Las imágenes y firmas se gestionan de forma local en la carpeta `uploads/` (configurable para almacenamiento S3 o similar).

## 📄 Licencia
Software desarrollado para uso exclusivo en la plataforma PlagControl. Todos los derechos reservados.