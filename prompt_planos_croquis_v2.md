# Módulo de planos y croquis de estaciones (PlagControl)

## Contexto

Proyecto PlagControl (monorepo):

- `backend/`: Node.js + Express + PostgreSQL (`pg`), módulos en `backend/src/modules/*` con el patrón `routes` / `controller` / `service`. Migraciones SQL en `backend/src/db/migrations/` (la última es la 027).
- `frontend/`: React 19 + Vite + Tailwind v4 + lucide-react + Dexie (IndexedDB) + jsPDF. PWA con modo offline mediante `sync_queue`.

Ya existen:

- Tabla maestra `estaciones` (`cliente_id`, `sede_id`, `numero`, `tipo`, `ubicacion`, `estado`, `codigo_qr`).
- Tabla `estaciones_usadas` (registro por visita/orden).
- Tabla `clientes_sedes`.
- `OrdenEstaciones.jsx` (`frontend/src/components/features/orden/`).
- `ClienteDetalle.jsx` (gestiona sedes).
- `OfflineContext.jsx` (arma el snapshot `estaciones_maestras` para uso sin conexión).
- Generación de PDF en `frontend/src/lib/pdf/`.
- Sistema de ayuda contextual por módulo.

## Objetivo

Permitir trazar un croquis/plano del sitio donde se presta el servicio y ubicar sobre él las estaciones (trampas) instaladas. Algunos clientes tienen planos, otros no los tienen o no quieren entregarlos. Por eso el plano puede tener tres orígenes:

1. `plano`: imagen del plano que entrega el cliente.
2. `foto_croquis`: foto de un croquis hecho a mano por el técnico (opción principal para clientes sin plano).
3. `croquis_app`: dibujado dentro de la app (fuera del alcance de este prompt).

Cada estación guarda su posición en **coordenadas relativas (0 a 1)** sobre el plano, para que el pin quede bien en cualquier pantalla y en el PDF.

## Reglas de trabajo (importante)

- Trabaja **un paso a la vez**, en el orden indicado.
- Al terminar cada paso: resume en pocas líneas qué archivos creaste o modificaste, indica cómo verificarlo y **detente**. No avances al siguiente paso hasta que yo escriba `continuar`.
- Sigue el estilo de código existente (ESM, nombres en español, `catchAsync`, `AppError`, toasts con `react-hot-toast`).
- No modifiques archivos que el paso no mencione. No refactorices ni cambies dependencias salvo las indicadas.
- No inventes endpoints ni columnas: si algo no coincide con lo que encuentres en el código, dímelo antes de improvisar.
- Este proyecto ya pasó por auditorías de seguridad. Cada endpoint nuevo debe tener autenticación, verificación de propiedad (anti-IDOR) y validación de entrada.

---

## Paso 1: Migración de base de datos

Crea `backend/src/db/migrations/028_sede_planos.sql` (idempotente, con `IF NOT EXISTS` cuando aplique):

```sql
CREATE TABLE IF NOT EXISTS sede_planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  sede_id UUID REFERENCES clientes_sedes(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  origen TEXT NOT NULL DEFAULT 'plano'
    CHECK (origen IN ('plano','foto_croquis','croquis_app')),
  imagen_url TEXT NOT NULL,
  storage_path TEXT,
  ancho INT,
  alto INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE estaciones
  ADD COLUMN IF NOT EXISTS plano_id UUID REFERENCES sede_planos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pos_x NUMERIC,
  ADD COLUMN IF NOT EXISTS pos_y NUMERIC;
```

Añade también:

- El trigger `update_updated_at_column` a `sede_planos`, como en las otras tablas.
- Una restricción `CHECK` para que `pos_x` y `pos_y` estén entre 0 y 1 (o sean `NULL`).
- Una restricción `CHECK` para que `pos_x`, `pos_y` y `plano_id` sean coherentes: o los tres son `NULL`, o `plano_id` tiene valor (una estación no puede tener posición sin plano).

Verifica que el sistema de migraciones (`backend/src/db/migrate.js`) la tome automáticamente.

**Detente y espera `continuar`.**

---

## Paso 2: Backend (planos y posición de estaciones)

En `backend/src/modules/clientes/` (routes, controller, service), siguiendo el patrón de los endpoints de sedes y estaciones:

- `GET /:id/planos` (con filtro opcional `?sede_id=`).
- `POST /:id/planos` (solo `requireAdmin`): recibe `nombre`, `origen`, `imagen_url`, `storage_path`, `sede_id`, `ancho`, `alto`.
- `DELETE /:id/planos/:plano_id` (solo `requireAdmin`).

### Seguridad y validaciones

- Valida que el plano pertenezca al cliente del path (protección IDOR), igual que el resto de subrecursos.
- Valida que `sede_id`, si viene, pertenezca a ese cliente.
- Valida `origen` contra la lista permitida (`plano`, `foto_croquis`, `croquis_app`) y que `nombre` no esté vacío ni exceda una longitud razonable.
- **Valida `imagen_url` y `storage_path` en el POST:** `imagen_url` debe apuntar al bucket de almacenamiento del propio proyecto (no aceptar URLs externas arbitrarias) y debe corresponder con `storage_path`. Reutiliza cómo otros módulos validan o construyen estas URLs; si no existe un patrón, dime cuál propones antes de implementarlo.
- `ancho` y `alto`, si vienen, deben ser enteros positivos con un máximo razonable.

### Estaciones

- Extiende `updateEstacion` para aceptar `plano_id`, `pos_x`, `pos_y`:
  - `plano_id` debe pertenecer al mismo cliente que la estación.
  - Si el plano tiene `sede_id`, debe coincidir con el `sede_id` de la estación (no solo el mismo cliente).
  - `pos_x` y `pos_y` deben ser numéricos entre 0 y 1.
  - Si se envía `plano_id: null`, pon también `pos_x` y `pos_y` en `NULL`.
- Asegúrate de que `listEstaciones` devuelva `plano_id`, `pos_x` y `pos_y`.

### Borrado de un plano

- Al eliminar un plano, dentro de **la misma transacción**, primero pon `plano_id`, `pos_x` y `pos_y` en `NULL` en todas las estaciones que lo usaban y luego elimina el plano. (El `ON DELETE SET NULL` solo limpia `plano_id`, y no queremos posiciones huérfanas.)
- Si el proyecto ya elimina archivos del storage al borrar otros recursos, haz lo mismo con `storage_path`. Si no existe ese patrón, dímelo y no lo improvises.

### Subida de archivos

- En `backend/src/modules/upload/upload.routes.js` agrega `'planos'` a `ALLOWED_BUCKETS`.
- Verifica que la ruta de subida valide tipo MIME (solo imágenes: jpeg, png, webp) y tamaño máximo para ese bucket. Si la validación actual es genérica o insuficiente, repórtalo y propón el ajuste mínimo sin tocar otros buckets.

**Detente y espera `continuar`.**

---

## Paso 3: Componente visor/editor del plano

Instala `react-zoom-pan-pinch` en `frontend/`.

Crea `frontend/src/components/features/PlanoEstaciones.jsx`:

- Props: `plano`, `estaciones`, `modo` (`'ver'` | `'editar'`), `estacionSeleccionadaId`, `onMover(estacionId, x, y)`, `onSeleccionar(estacion)`.
- Muestra la imagen del plano con zoom y pan táctil (celular primero).
- Dibuja un pin por cada estación con `pos_x` y `pos_y`, posicionado en porcentaje (`x*100%`, `y*100%`) sobre la imagen. Muestra el número de la estación dentro del pin.
- Color del pin por tipo de estación (Cebadero, Impacto, Jaula atrapavivos y cualquier otro), con una leyenda pequeña.
- En modo `editar`: se puede arrastrar un pin para moverlo, y tocar el plano con una estación seleccionada sin posición para colocarla. Las coordenadas se calculan relativas al tamaño real de la imagen renderizada, considerando el zoom.
- Limita las coordenadas resultantes al rango 0 a 1 antes de llamar a `onMover`.
- Sin llamadas a la API dentro del componente; solo props y callbacks.

**Detente y espera `continuar`.**

---

## Paso 4: Gestión de planos en el cliente

En `frontend/src/pages/ClienteDetalle.jsx`, dentro de la sección "Sedes y Locaciones", agrega una gestión de planos (visible para admin):

- Listar los planos por sede.
- Subir un plano con un selector de **origen**: "Plano del cliente" o "Foto de croquis a mano". Comprime la imagen con `frontend/src/utils/imageCompressor.js` y súbela al bucket `planos` usando el mecanismo de subida que ya usa el proyecto. Guarda `ancho` y `alto` de la imagen.
- Eliminar un plano (con la confirmación existente `confirmDelete`).
- Un botón "Ubicar estaciones" que abre `PlanoEstaciones` en modo `editar` dentro del `Modal` existente: permite elegir una estación de la sede sin ubicar, colocarla o moverla, y guarda con `PUT /clientes/:id/estaciones/:estacion_id` (`plano_id`, `pos_x`, `pos_y`).

Agrega las funciones necesarias en `frontend/src/api/clientes.api.js` si ese es el patrón que se usa.

**Detente y espera `continuar`.**

---

## Paso 5: Vista del plano en la orden de servicio

En `frontend/src/components/features/orden/OrdenEstaciones.jsx`:

- Agrega un botón "Ver en plano" (solo si la sede de la orden tiene al menos un plano).
- Abre `PlanoEstaciones` en modo `ver` dentro de un `Modal`. Colorea o marca el estado de cada pin según la visita actual: sin revisar, revisada, nueva instalación (usa los datos de `estaciones` de la orden).
- Al tocar un pin, expande/enfoca esa estación en la lista para registrar observaciones y fotos.
- Si el técnico instala una **estación nueva** en campo, permite ubicarla en el plano en ese momento (modo `editar`, solo para la estación recién creada).

No cambies la lógica actual de guardado de `estaciones_usadas`.

**Detente y espera `continuar`.**

---

## Paso 6: Soporte offline

- En `frontend/src/lib/db.js`, agrega la versión 3 de Dexie con una tabla `planos_cache` (clave `id`, campos de metadatos y el `blob` de la imagen). Conserva las tablas de las versiones anteriores.
- En `frontend/src/contexts/OfflineContext.jsx`, donde se arma `estaciones_maestras` en el snapshot de la orden: incluye los planos de la sede y descarga y cachea la imagen de cada plano como blob.
- En `PlanoEstaciones`/`OrdenEstaciones`, cuando no haya conexión, usa la imagen cacheada (`URL.createObjectURL`) y libera la URL al desmontar.
- Los cambios de posición hechos sin conexión deben encolarse en `sync_queue` siguiendo el mismo patrón que ya usa el proyecto para otras operaciones, y aplicarse al sincronizar (`useSyncQueue.js`).
- Si un plano fue eliminado en el servidor mientras había cambios pendientes, la sincronización debe fallar de forma controlada (sin romper la cola) y avisar al usuario.

**Detente y espera `continuar`.**

---

## Paso 7: Plano en el informe PDF

En `frontend/src/lib/pdf/` (`informeActividadesData.js` y `informeActividadesRenderer.js`; revisa también si aplica al informe técnico):

- Incluye en los datos el plano de la sede con sus estaciones ubicadas.
- Genera con un `canvas` fuera de pantalla la imagen del plano con los pines numerados y coloreados por tipo, y agrégala al PDF con `addImage` en una página nueva titulada "Croquis de estaciones".
- Debajo, una leyenda en tabla: número, tipo, ubicación (texto) y estado en esa visita.
- Reutiliza `frontend/src/lib/pdf/utils/imageUtils.js` para precargar la imagen en base64.
- Si la sede no tiene plano, no agregues la página.

**Detente y espera `continuar`.**

---

## Paso 8: Vista de solo lectura en el portal del cliente

En `frontend/src/pages/portal/PortalOrdenDetalle.jsx` (o la vista del portal que corresponda):

- Muestra el plano con `PlanoEstaciones` en modo `ver` para las estaciones de la sede del cliente.
- Al tocar un pin, muestra el historial básico de esa estación (visitas y observaciones).
- Verifica que el endpoint que alimenta el portal valide que el plano y las estaciones pertenezcan al cliente autenticado. Prueba explícitamente que un cliente no pueda pedir el plano o las estaciones de otro cambiando un ID en la URL.

**Detente y espera `continuar`.**

---

## Paso 9: Ayuda contextual y revisión final

- Agrega la ayuda contextual del módulo de planos siguiendo el mismo patrón que los demás módulos: cómo subir un plano o una foto de croquis, cómo ubicar estaciones y cómo verlas en una orden.
- Haz una revisión de seguridad de todo lo agregado y repórtame el resultado:
  - Endpoints nuevos sin autenticación o sin verificación de propiedad.
  - Validación de archivos subidos y de `imagen_url`.
  - Posibilidad de acceder a planos o estaciones de otro cliente.
  - Cambios en rutas que afecten la configuración de CORS.

**Fin.** Al terminar, dame un resumen final con la lista de archivos creados/modificados y los pasos manuales que me queden (por ejemplo, correr la migración).
