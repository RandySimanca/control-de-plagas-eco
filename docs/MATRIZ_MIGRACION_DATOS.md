# Matriz de Migración de Datos

Documento operativo para migrar desde Supabase (modelo SaaS/multi-tenant) a PostgreSQL self-hosted con auth propia y almacenamiento local.

## Objetivo

- Quitar dependencia de Supabase.
- Pasar a modelo single-tenant.
- Mantener continuidad funcional del sistema actual.

## Supuestos acordados

- Base destino: PostgreSQL autogestionado.
- Autenticación: propia (JWT + refresh tokens).
- Archivos: sistema de archivos local del servidor.

## Reglas generales de transformación

1. Se elimina `empresa_id` en tablas de negocio.
2. Se elimina tabla `empresas`.
3. Se elimina rol `superadmin`; roles válidos: `admin`, `tecnico`, `cliente`.
4. Se eliminan políticas RLS y lógica de licencia SaaS.
5. Archivos de Supabase Storage se copian a rutas locales y se actualiza `url`/`storage_path`.

## Matriz tabla por tabla

| Origen (Supabase) | Destino (PostgreSQL) | Transformación |
|---|---|---|
| `profiles` | `profiles` | Quitar `empresa_id`; mapear rol `superadmin` a `admin`; conservar `id`, `nombre_completo`, `email`, `telefono`, `especialidad`, `firma_url`, `activo`, `cliente_id`. |
| `clientes` | `clientes` | Copia directa de datos de negocio; quitar `empresa_id`. |
| `ordenes_servicio` | `ordenes_servicio` | Quitar `empresa_id`; conservar campos operativos (`estado`, `tipo_plaga`, `observaciones`, `areas_intervenidas`, `metodos_aplicados`, `recomendaciones`). |
| `productos_usados` | `productos_usados` | Quitar `empresa_id`; conservar referencias por `orden_id`. |
| `estaciones_usadas` | `estaciones_usadas` | Copia directa por `orden_id`. |
| `fotos_servicio` | `fotos_servicio` | Quitar `empresa_id`; copiar archivo físico y reescribir `url`/`storage_path` al nuevo filesystem. |
| `certificados` | `certificados` | Quitar `empresa_id`; mantener `folio` y `orden_id`. |
| `actividades_servicio` | `actividades_servicio` | Quitar `empresa_id`; copia directa por `orden_id`. |
| `documentos_legales` | `documentos_legales` | Quitar `empresa_id`; copiar archivo físico y ajustar `url`/`storage_path`. |
| `configuracion` | `configuracion` | Consolidar a una sola fila global. |
| `solicitudes_servicio` | `solicitudes_servicio` | Quitar `empresa_id`; mantener estado y cotización. |
| `auth.users` (Supabase) | `usuarios_auth` | No migrar hashes directamente; crear usuarios con proceso de reset de contraseña o migración controlada por backend. |

## Estrategia de migración de usuarios

Por seguridad y compatibilidad:

1. Migrar `email` e `id` a `usuarios_auth`.
2. Marcar cuentas como `email_verificado=true` según política interna.
3. No migrar `password_hash` desde Supabase.
4. Forzar flujo de "restablecer contraseña" en primer acceso.

## Estrategia de migración de archivos (filesystem local)

Rutas sugeridas:

- `uploads/fotos-servicio/...`
- `uploads/documentos/...`
- `uploads/firmas/...`
- `uploads/certificados/...`

Pasos:

1. Exportar lista de objetos desde Supabase Storage.
2. Descargar archivos por lote.
3. Subir/copiar al servidor local conservando estructura lógica por módulo.
4. Actualizar en DB los campos `storage_path` y `url`.

## Validaciones post-migración (obligatorias)

1. **Conteos**
   - Conteo por tabla origen vs destino (tolerancia 0 en tablas críticas).
2. **Integridad**
   - Sin FKs huérfanas (`ordenes -> clientes`, `fotos -> ordenes`, etc.).
3. **Roles**
   - Ningún registro con rol `superadmin`.
4. **Solicitudes y órdenes**
   - Solicitudes `convertida` con `orden_id` válido.
5. **Archivos**
   - Todas las URLs/paths resolviendo en servidor local.

## Checklist de ejecución

- [ ] Backup completo de Supabase (DB + Storage).
- [ ] Crear DB destino y aplicar `database/schema_auth.sql`.
- [ ] Aplicar `database/schema_single_tenant.sql`.
- [ ] Ejecutar script de migración de datos estructurados.
- [ ] Ejecutar migración de archivos a filesystem.
- [ ] Ejecutar validaciones automáticas.
- [ ] Ejecutar pruebas funcionales (login, clientes, órdenes, certificados, portal).
- [ ] Aprobación final de negocio.

## Riesgos y mitigaciones

- **Riesgo:** usuarios no pueden iniciar sesión tras migración.
  - **Mitigación:** campaña de reset de contraseña y soporte durante ventana de cutover.
- **Riesgo:** rutas de archivos rotas.
  - **Mitigación:** validador masivo de URLs y script de reparación por lotes.
- **Riesgo:** datos de cotización inconsistentes.
  - **Mitigación:** pruebas de regresión sobre `solicitudes_servicio` y conversión a `ordenes_servicio`.
