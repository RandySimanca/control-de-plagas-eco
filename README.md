# 🐜 PlagControl — Gestión Profesional de Control de Plagas

**PlagControl** es una plataforma integral "mobile-first" diseñada para la gestión operativa de empresas de control de plagas. Permite automatizar la operación en campo, generar informes técnicos PDF de alta fidelidad, gestionar solicitudes y ofrecer transparencia total a los clientes a través de un portal dedicado.

Esta versión está optimizada para ser **Self-Hosted**, utilizando un backend propio en Node.js y almacenamiento local de evidencias.

---

## 🚀 Características Principales

### 📱 Módulo del Técnico en Campo
- **Operación Offline Real**: Gracias a **Dexie.js**, el técnico puede registrar actividades, estaciones y fotos incluso sin internet. Los datos se sincronizan automáticamente al recuperar la señal.
- **Bitácora en Tiempo Real**: Registro detallado del servicio con estados y edición inmediata.
- **Monitoreo de Estaciones**: Control de cebaderos, trampas de impacto y jaulas con fotos comparativas "antes/después".
- **Recomendaciones con Evidencia**: El técnico puede adjuntar fotos a sus recomendaciones, las cuales se integran directamente en el informe final.

### 🏢 Panel de Administración
- **Control Total de Órdenes**: Creación, asignación a técnicos y seguimiento de estados.
- **Gestión de Cotizaciones**: Recibe solicitudes de clientes, genera cotizaciones y las convierte en órdenes de servicio con un clic.
- **Configuración de Branding**: Sube tu logo y personaliza los textos, versiones y recomendaciones que aparecen en los certificados PDF.
- **Repositorio Legal**: Gestiona documentos como RUT, Cámara de Comercio y resoluciones de salud para que tus clientes puedan consultarlos.

### 🌐 Portal del Cliente
- **Portal Independiente**: Acceso seguro para clientes donde pueden ver su historial de servicios.
- **Solicitudes de Servicio**: Motor para que el cliente solicite visitas y reciba cotizaciones en tiempo real.
- **Descarga de Certificados**: Acceso inmediato a los informes técnicos en PDF una vez finalizado el servicio.

### 📄 Motor de Informes (PDF)
- Generación de documentos profesionales con **jsPDF**, incluyendo:
  - Diseño corporativo y branding personalizado.
  - Trazabilidad de productos químicos aplicados.
  - Galería de evidencias fotográficas (6 por página con etiquetas).
  - Firmas digitales de técnicos.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19 + Vite 8 |
| **Backend** | Node.js + Express |
| **Base de Datos** | PostgreSQL 16 |
| **Almacenamiento** | Local (Carpeta `/uploads`) |
| **Offline** | Dexie.js (IndexedDB) + PWA |
| **Estilos** | Tailwind CSS 4 |

---

## 📂 Estructura del Proyecto (Monorepo)

```
plagcontrol/
├── backend/                # Servidor Node.js
│   ├── src/
│   │   ├── modules/        # Lógica por dominio (auth, operaciones, etc.)
│   │   ├── config/         # Conexión DB y variables
│   │   └── uploads/        # Almacenamiento local de fotos
│   └── database/           # Scripts SQL de esquema
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/     # UI Reutilizable
│   │   ├── pages/          # Vistas (Admin, Técnico, Portal)
│   │   ├── contexts/       # Estado global (Auth, Offline)
│   │   └── lib/            # Utilidades (API, PDF, Alertas)
└── uploads/                # Enlace simbólico o carpeta real de archivos
```

---

## ⚙️ Configuración e Instalación

### Requisitos
- Node.js v20+
- PostgreSQL v15+

### 1. Clonar e Instalar
```bash
git clone https://github.com/RandySimanca/control-de-plagas-eco.git
cd plagcontrol-eco
npm install
```

### 2. Configurar Base de Datos
1. Crea una base de datos en PostgreSQL llamada `plagcontrol`.
2. Ejecuta el script inicial ubicado en `backend/database/schema.sql`.

### 3. Variables de Entorno
Crea archivos `.env` en las carpetas respectivas:

**En `backend/.env`:**
```env
PORT=3001
DATABASE_URL=postgres://usuario:password@localhost:5432/plagcontrol
JWT_SECRET=tu_secreto_super_seguro
FRONTEND_URL=http://localhost:3000
```

**En `frontend/.env`:**
```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Ejecutar en Desarrollo
Desde la raíz del proyecto:
```bash
npm run dev
```

---

## 🔐 Seguridad y Almacenamiento
- **Auth**: Autenticación basada en JWT (JSON Web Tokens).
- **Passwords**: Encriptación con `bcrypt`.
- **Archivos**: Las fotos se gestionan mediante `multer` y se sirven con permisos de CORS para permitir la generación de informes PDF desde el frontend.

---

> Desarrollado para transformar la industria del control de plagas.