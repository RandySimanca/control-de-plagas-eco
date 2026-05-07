# Plan de Trabajo: Transformación a Modelo SaaS (Multi-empresa)

Este documento detalla la hoja de ruta estratégica para convertir PlagControl de una aplicación empresarial única a una plataforma SaaS (Software as a Service) monetizable para múltiples clientes.

## 1. Visión del Modelo de Negocio
Convertir el software en una herramienta donde el creador (Desarrollador) pueda:
1.  Vender suscripciones mensuales a diferentes empresas de control de plagas.
2.  Controlar la validez de las licencias (bloqueo automático por impago).
3.  Mantener una sola base de código centralizada para facilitar actualizaciones.

---

## 2. Fases de Implementación Técnica

### Fase 1: Arquitectura Multi-inquilino (Multi-tenant)
Para que varias empresas compartan la misma aplicación sin ver los datos de las otras:
- **Identificador de Empresa:** Añadir una columna `empresa_id` (UUID) a cada tabla (clientes, ordenes, fotos, actividades, productos).
- **Tabla de Empresas:** Crear una tabla maestra `empresas` con nombre, NIT, logo y estado de suscripción.
- **Seguridad RLS:** Actualizar todas las políticas de Supabase para filtrar datos estrictamente por `empresa_id`.

### Fase 2: Portal de Súper-Administrador
Desarrollar un panel exclusivo para el dueño de la aplicación:
- **Gestión de Cuentas:** Dashboard para crear, editar y suspender empresas clientes.
- **Control de Licencias:** Configurar fechas de vencimiento y tipos de planes.
- **Métricas Globales:** Ver cuántas órdenes se generan en total a través de todas las empresas.

### Fase 3: Personalización y Marca Blanca
- **Branding por Empresa:** Permitir que cada empresa configure sus colores y logos desde su propio panel de admin.
- **Subdominios:** (Opcional) Implementar acceso personalizado como `empresa_a.tuapp.com`.

### Fase 4: Suscripciones y Pagos
- **Integración de Pasarela:** Conectar con Stripe, PayPal o Wompi para cobros recurrentes.
- **Bloqueo de Acceso:** Lógica en el frontend y backend que impida el login si la licencia de la empresa está vencida.

---

## 3. Recomendación Post-Proyecto
Antes de invitar a la primera empresa "externa":
1.  **Refactorizar el Schema:** Es vital asegurar que el `tenant_id` sea obligatorio en cada insert.
2.  **Backup y Escalabilidad:** Asegurar que el plan de Supabase soporte el volumen de fotos de múltiples empresas.

---
*PlagControl - Propiedad Intelectual del Desarrollador*
