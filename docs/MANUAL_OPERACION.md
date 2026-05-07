# 📘 Manual de Operación — PlagControl

**Versión**: 1.0  
**Fecha**: Abril 2026  
**Plataforma**: Aplicación Web (compatible con móviles y escritorio)

---

## Índice

1. [Acceso al Sistema](#1-acceso-al-sistema)
2. [Panel del Administrador](#2-panel-del-administrador)
   - 2.1 Dashboard
   - 2.2 Gestión de Clientes
   - 2.3 Gestión de Órdenes de Servicio
   - 2.4 Gestión de Usuarios
   - 2.5 Configuración de Empresa
   - 2.6 Documentos Legales
3. [Panel del Técnico](#3-panel-del-técnico)
   - 3.1 Iniciar un Servicio
   - 3.2 Registrar Actividades
   - 3.3 Subir Evidencia Fotográfica
   - 3.4 Seleccionar Áreas Intervenidas
   - 3.5 Seleccionar Métodos de Aplicación
   - 3.6 Monitoreo de Estaciones
   - 3.7 Escribir Recomendaciones
   - 3.8 Finalizar Servicio
4. [Generación del Informe Técnico PDF](#4-generación-del-informe-técnico-pdf)
5. [Portal del Cliente](#5-portal-del-cliente)
6. [Preguntas Frecuentes (FAQ)](#6-preguntas-frecuentes)

---

## 1. Acceso al Sistema

### 1.1 Inicio de Sesión (Administrador / Técnico)

1. Abrir la aplicación en el navegador (URL proporcionada por su empresa).
2. Ingresar el **correo electrónico** y la **contraseña** asignados.
3. Presionar **"Iniciar Sesión"**.
4. El sistema redirigirá automáticamente al **Dashboard** (admin) o al listado de **Órdenes** (técnico), según el rol.

> **Nota**: Si olvidó su contraseña, contacte al administrador del sistema para que le asigne una nueva.

### 1.2 Inicio de Sesión (Cliente)

1. Acceder a la ruta `/portal` de la aplicación.
2. Ingresar las credenciales proporcionadas por la empresa.
3. El cliente verá su historial de servicios y podrá descargar sus certificados.

---

## 2. Panel del Administrador

### 2.1 Dashboard

Al ingresar, el administrador ve un resumen general con:
- Total de servicios realizados.
- Cantidad de clientes activos.
- Técnicos disponibles.
- Estadísticas de órdenes por estado (Programada, En Progreso, Completada).

---

### 2.2 Gestión de Clientes

**Ruta**: Menú lateral → **Clientes**

#### Crear un Cliente Nuevo

1. Ir a **Clientes** → clic en **"Nuevo Cliente"**.
2. Completar los campos del formulario:
   - **Nombre / Empresa** (obligatorio).
   - Razón Social, Identificación/NIT, Dirección.
   - Teléfono Principal, Correo Electrónico.
   - Contacto en Sitio (persona que recibirá al técnico).
   - Tipo de cliente: Residencial, Comercial o Industrial.
   - Notas adicionales.
3. **Opcional — Crear Cuenta de Acceso al Portal**:
   - Activar el toggle azul **"¿Crear cuenta de acceso al portal?"**.
   - Al activarlo, aparecerán los campos de **Email de acceso** (se pre-llena con el correo del cliente) y **Contraseña** (mínimo 6 caracteres).
   - Al guardar, se creará el cliente y su cuenta de usuario automáticamente.
4. Clic en **"Crear Cliente"**.

#### Editar un Cliente

1. Desde el listado de clientes, clic sobre el nombre del cliente.
2. Clic en **"Editar"**.
3. Modificar los campos necesarios.
4. Si el cliente **no tiene cuenta de acceso**, aparecerá el mismo toggle para crearla.
5. Si el cliente **ya tiene cuenta**, se mostrará un mensaje verde informativo.
6. Clic en **"Guardar Cambios"**.

---

### 2.3 Gestión de Órdenes de Servicio

**Ruta**: Menú lateral → **Órdenes**

#### Crear una Orden

1. Ir a **Órdenes** → clic en **"Nueva Orden"**.
2. Completar:
   - **Cliente**: Seleccionar de la lista desplegable.
   - **Técnico Asignado**: Seleccionar el técnico responsable.
   - **Fecha Programada**: Día del servicio.
   - **Tipo de Control/Plaga**: Ej. "Desinsectación", "Desratización", "Desinfección".
   - **Observaciones**: Instrucciones especiales para el técnico.
3. Clic en **"Crear Orden"**.

> La orden se crea en estado **"Programada"** y será visible para el técnico asignado.

#### Seguimiento de Órdenes

En el listado de órdenes, se pueden filtrar por estado:
- 🟡 **Programada**: Pendiente de ejecución.
- 🔵 **En Progreso**: El técnico ya inició el servicio.
- 🟢 **Completada**: Servicio finalizado, certificado disponible.

---

### 2.4 Gestión de Usuarios

**Ruta**: Menú lateral → **Admin** → **Usuarios**

#### Crear un Usuario

1. Clic en **"Nuevo Usuario"**.
2. Completar:
   - Nombre completo.
   - Email y Contraseña.
   - Teléfono.
   - **Rol**: Administrador, Técnico o Cliente.
3. Si el rol es **Técnico**: Aparecen campos adicionales de Especialidad y Firma Digital (subir imagen PNG/JPG de la rúbrica).
4. Si el rol es **Cliente**: Aparece la opción de vincular a un cliente existente.
5. Clic en **"Crear Usuario"**.

#### Editar un Usuario

- Modificar nombre, teléfono, rol, especialidad.
- Subir o actualizar la **Firma Digital** del técnico.
- Activar o desactivar el usuario con el toggle.
- **El email no se puede cambiar** después de creado.

---

### 2.5 Configuración de Empresa

**Ruta**: Menú lateral → **Admin** → **Configuración**

Desde esta pantalla se administra toda la identidad de la empresa que se refleja en el informe PDF:

| Campo | Descripción |
|---|---|
| **Nombre de la Empresa** | Aparece en los encabezados de cada página del PDF y en la firma final. |
| **NIT** | Identificación tributaria visible en la información general del informe. |
| **Dirección Fiscal** | Dirección de la oficina principal. |
| **Versión del Modelo (PDF)** | Versión del formato del informe (Ej: "2", "3.1"). Se muestra en la esquina superior derecha del encabezado. |
| **Fecha del Modelo (PDF)** | Fecha del formato vigente (Ej: "14/04/2026"). |
| **Logo de la Empresa** | Imagen que aparecerá en la portada del PDF y en los encabezados de cada página interna. |
| **Texto de Footer PDF** | Texto predeterminado al pie de página. |
| **Recomendaciones Generales** | Texto editable que se imprime en la **Sección 7** del informe ("Recomendaciones Generales"). Cada línea se convierte en un ítem con viñeta. |

> **Importante**: Después de modificar cualquier campo, presionar **"Guardar Configuración"**.

---

### 2.6 Documentos Legales

**Ruta**: Menú lateral → **Admin** → **Documentos Legales**

Permite cargar y gestionar los documentos de soporte de la empresa:
- Resolución Sanitaria.
- RUT.
- Cámara de Comercio.
- Otros documentos necesarios.

Los clientes podrán descargar estos documentos desde el portal.

---

## 3. Panel del Técnico

El técnico accede a la plataforma con sus credenciales y ve únicamente las **órdenes de servicio que le fueron asignadas**.

### 3.1 Iniciar un Servicio

1. Desde el listado de **Órdenes**, localizar la orden asignada.
2. Clic sobre la orden para ver el detalle.
3. Presionar **"Iniciar Servicio"**. El estado cambiará de "Programada" a **"En Progreso"**.

> A partir de este momento, todas las herramientas operativas se habilitan.

---

### 3.2 Registrar Actividades (Bitácora)

1. En el detalle de la orden, localizar la sección **"Bitácora de Actividad"**.
2. Clic en **"Registrar Avance"**.
3. En el modal que aparece:
   - Escribir la **descripción del trabajo realizado** (Ej: "Se realizó inspección en cocina, se encontraron focos de humedad...").
   - Opcionalmente, adjuntar **fotos del avance** (4-6 recomendadas).
4. Clic en **"Guardar Avance"**.

Cada entrada queda registrada con **hora exacta** y aparecerá cronológicamente en el informe PDF.

**Editar o eliminar un avance**: Clic en los botones de edición/eliminación junto a cada entrada de la bitácora.

---

### 3.3 Subir Evidencia Fotográfica

1. Localizar la sección **"Evidencia Fotográfica"** en el detalle de la orden.
2. Clic en la zona de **"Subir Fotos"** o arrastrar archivos.
3. Las fotos se suben automáticamente y quedan asociadas a la orden.
4. Para eliminar una foto, presionar el botón de **papelera** sobre la imagen.

> Las fotos se organizarán automáticamente en el PDF (6 por página, con etiquetas de color).

---

### 3.4 Seleccionar Áreas Intervenidas

1. Localizar la sección **"Áreas Intervenidas"** (borde superior índigo).
2. Clic en **"Especificar Áreas"**.
3. En el modal, marcar con checkboxes las áreas donde se realizó el servicio:
   - Cocinas y Restaurantes
   - Bodegas de Almacenamiento
   - Oficinas Administrativas
   - Baños y Servicios Sanitarios
   - Zonas Perimetrales y Exteriores
   - Cuartos de Basura y Residuos
   - Áreas de Producción
   - Y 11 opciones más...
4. Clic en **"Guardar"**.

> Estas áreas se imprimirán en la **Sección 3** del informe y se utilizarán para redactar automáticamente la **Sección 4.1**.

---

### 3.5 Seleccionar Métodos de Aplicación

1. Localizar la sección **"Métodos de Aplicación"** (borde superior índigo claro).
2. Clic en **"Seleccionar Métodos"**.
3. El sistema mostrará automáticamente las opciones según el **tipo de control** de la orden:

   **Si es Desinsectación:**
   - Pulverización líquida
   - Nebulización en frío (ULV)
   - Termonebulización
   - Aplicación de gel
   - Polvo insecticida
   - Cebos
   - Trampas de luz UV
   - Trampas de feromonas

   **Si es Desratización:**
   - Rodenticidas en cebo
   - Trampas mecánicas
   - Trampas de pegamento
   - Fumigación con fosfuro de aluminio

   **Si es Desinfección:**
   - Pulverización química
   - Nebulización
   - Ozono
   - Luz UV-C
   - Vapor

4. Marcar únicamente los métodos que se **utilizaron durante el servicio**.
5. Clic en **"Guardar"**.

> Los métodos seleccionados se imprimirán en la **Sección 4.1** del informe bajo "Técnicas y Métodos de Aplicación".

---

### 3.6 Monitoreo de Estaciones

1. Localizar la sección **"Monitoreo de Estaciones"**.
2. Clic en **"Registrar Mantenimiento"**.
3. Para cada tipo de estación (cebaderas, trampas, etc.):
   - Activar el checkbox.
   - Indicar la **cantidad** de unidades revisadas.
   - Escribir **observaciones** (estado encontrado, acciones tomadas).
   - Subir foto **antes** y foto **después** del mantenimiento.
4. Clic en **"Guardar Mantenimiento"**.

---

### 3.7 Escribir Recomendaciones del Técnico

1. Localizar la sección **"Recomendaciones del Técnico"** (borde superior dorado).
2. Clic en **"Escribir Recomendaciones"** (o "Editar" si ya hay texto).
3. Redactar las recomendaciones profesionales para el establecimiento.
4. Opcionalmente, adjuntar evidencias fotográficas de soporte.
5. Clic en **"Guardar"**.

> Las recomendaciones se imprimirán en la **Sección 8** del informe PDF.

---

### 3.8 Finalizar Servicio

1. Una vez completados todos los registros, presionar **"Finalizar Servicio"**.
2. El estado de la orden cambiará a **"Completada"**.
3. Se habilitará el botón para **generar el certificado PDF**.

---

## 4. Generación del Informe Técnico PDF

Una vez que la orden está en estado **"Completada"**, cualquier usuario con acceso puede generar el informe.

### Pasos

1. Ir al detalle de la orden completada.
2. En la sección **"Certificado"**, clic en **"Generar Certificado"**.
3. El sistema compilará automáticamente toda la información y abrirá el PDF en una nueva pestaña.
4. El PDF puede descargarse o imprimirse desde el navegador.

### Contenido del Informe PDF

El informe se genera con la siguiente estructura:

| Sección | Contenido | Fuente de Datos |
|---|---|---|
| **Portada** | Logo, nombre del cliente, título "Informe Técnico" | Configuración + Orden |
| **1. Información General** | Datos del cliente, técnico, fecha, tipo de control | Orden de servicio |
| **2. Proceso Ejecutado** | Descripción técnica del tipo de control | Tipo de plaga (orden) |
| **3. Áreas Intervenidas** | Lista de áreas donde se trabajó | Checklist del técnico |
| **4.1 Actividades** | Tipo de control, áreas, métodos aplicados y productos químicos con trazabilidad | Checklist + Productos |
| **4.2 Diagnóstico** | Marco teórico del control integrado de plagas | Texto estándar |
| **4.3 Bitácora** | Registro cronológico de actividades del técnico | Bitácora |
| **5. Estaciones** | Monitoreo de estaciones con cantidades | Registro de estaciones |
| **6. Fotografías** | Galería de evidencias (6 por página) | Fotos subidas |
| **7. Recomendaciones Generales** | Recomendaciones estándar de la empresa | Configuración (admin) |
| **8. Recomendaciones del Técnico** | Observaciones específicas del servicio | Campo del técnico |
| **Firma** | Firma digital, nombre y cargo del técnico | Perfil del técnico |

> **Cada página interna** tiene encabezado con: logo, nombre de empresa, versión del modelo, fecha y número de página.

---

## 5. Portal del Cliente

### Acceso

1. Navegar a la ruta `/portal` de la aplicación.
2. Ingresar con el email y contraseña proporcionados por la empresa (se crean junto al registro del cliente o desde usuarios).

### Funcionalidades

- **Historial de Servicios**: Ver todas las visitas realizadas al establecimiento, organizadas cronológicamente con estados visuales (colores).
- **Detalle del Servicio**: Clic en cualquier servicio para ver:
  - Datos del técnico asignado.
  - Progreso de las actividades en tiempo real.
  - Fotos de evidencia.
  - Estado del servicio.
- **Descarga de Certificado PDF**: Una vez completado el servicio, el botón de descarga estará disponible directamente.

---

## 6. Preguntas Frecuentes

### ¿Puedo usar la app desde el celular?
Sí. PlagControl está diseñada como "mobile-first" y funciona como una PWA (Progressive Web App). Puede instalarse en Android e iOS desde el navegador.

### ¿Qué pasa si el técnico no tiene internet en campo?
Actualmente la app necesita conexión a internet para funcionar. Se recomienda que el técnico tenga datos móviles disponibles durante el servicio.

### ¿Se puede cambiar el logo o nombre de empresa del informe sin tocar código?
Sí. Todo se gestiona desde **Admin → Configuración**. Allí se sube el logo, se edita el nombre de empresa, la versión del modelo, la fecha y las recomendaciones generales.

### ¿Cómo actualizo la versión del formato del informe?
En **Admin → Configuración**, modificar los campos "Versión del Modelo (PDF)" y "Fecha del Modelo (PDF)". Los cambios se reflejan inmediatamente en todos los informes futuros.

### ¿Puedo generar el PDF de un servicio ya completado?
Sí. Solo necesita ir al detalle de la orden completada y presionar "Generar Certificado" o "Descargar PDF".

### ¿Quién puede ver las órdenes de servicio?
- **Administradores**: Ven todas las órdenes.
- **Técnicos**: Solo ven las órdenes que les fueron asignadas.
- **Clientes**: Solo ven los servicios de su establecimiento, desde el portal.

### ¿Se puede crear una cuenta de acceso para el cliente después?
Sí. Al editar un cliente que no tiene cuenta, aparecerá el toggle para crearla en ese momento.

---

> **Soporte**: Para asistencia técnica o reportar errores, contactar al administrador del sistema.

---

*Manual generado para PlagControl — DEROSH S.A.S © 2026*
