# Plan de Trabajo - Mejoras de PlagControl

Este documento detalla las mejoras estructurales y de calidad para profesionalizar el proyecto, siguiendo las recomendaciones de la revisión general.

## Cambios Propuestos

### 1. Organización del Código (Refactorización de Carpetas)
Reestructurar la carpeta `src/lib` para seguir el patrón de `services` y `utils`.

- **Mover**: `src/lib/supabase.js`, `src/lib/db.js`, `src/lib/generarCertificado.js` a `src/services/`.
- **Mover**: `src/lib/alerts.js` a `src/utils/`.
- **Actualizar**: Todas las importaciones en el proyecto para reflejar estos cambios.

### 2. Consolidación de Notificaciones
Eliminar la redundancia entre `sweetalert2` y `react-hot-toast`.

- **Decisión**: Usar `react-hot-toast` para todas las notificaciones informativas (éxito, error, carga).
- **Decisión**: Mantener `sweetalert2` únicamente para confirmaciones críticas (ej: eliminar registros).
- **Acción**: Refactorizar `src/utils/alerts.js` para que use `toast` para éxitos y dejar `Swal` solo para `confirmDelete`.

### 3. Manejo de Variables de Entorno
Asegurar que las credenciales no se expongan y facilitar la configuración.

- **Nuevo**: Crear `.env.example` con las llaves necesarias:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### 4. Mejora del Manejo Offline (Dexie)
Refinar la sincronización en `OfflineContext.jsx`.

- **Acción**: Mejorar el manejo de reintentos y la retroalimentación al usuario durante la sincronización automática.
- **Acción**: Asegurar que los conflictos básicos de datos (ej: registros borrados en el servidor) no bloqueen la cola de sincronización.

### 5. Calidad del Código y Documentación
- **Lógica**: Extraer lógica compleja de los componentes `pages/` a hooks personalizados si es necesario.
- **README**: Actualizar el `README.md` con una sección de "Estructura de Carpetas" actualizada y mejores guías de despliegue.

## Plan de Verificación

1. **Funcionalidad de Notificaciones**:
   - Verificar que `SweetAlert2` solo aparezca en confirmaciones de borrado.
   - Verificar que los éxitos usen `react-hot-toast`.
2. **Sincronización Offline**:
   - Probar creación de datos sin conexión y verificar sincronización al recuperar señal.
3. **Persistencia de Rutas**:
   - Asegurar que la navegación sigue funcionando tras mover archivos de `lib/`.
