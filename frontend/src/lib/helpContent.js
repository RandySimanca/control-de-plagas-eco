/**
 * helpContent.js — Texto de ayuda contextual por módulo.
 *
 * Centralizar el contenido aquí evita tener strings de ayuda
 * dispersos en cada página y facilita que un no-developer
 * (ej. el admin del negocio) pueda editar los textos a futuro.
 */
export const HELP_CONTENT = {
  dashboard: 'Panel principal con un resumen general: órdenes activas, certificados próximos a vencer y alertas operativas del día.',

  clientes: [
    'Aquí se administra el directorio de clientes (residenciales y empresariales).',
    'Puedes registrar nuevos clientes, editar su información de contacto y, si tienen portal habilitado, crear su usuario de acceso.',
    'Desde el detalle de cada cliente se ven sus órdenes y certificados asociados.',
  ],

  ordenes: [
    'Las órdenes de servicio representan cada visita o trabajo de control de plagas programado.',
    'Aquí se crean, asignan a un técnico y se hace seguimiento al estado: pendiente, en proceso o finalizada.',
  ],

  certificados: 'Certificados de control de plagas generados automáticamente al finalizar una orden. Sirven como soporte legal para el cliente y se pueden descargar en PDF.',

  usuarios: 'Gestión de los usuarios internos del sistema (administradores y técnicos). Aquí se crean cuentas, se asignan roles y se desactivan accesos cuando un empleado deja de trabajar en la empresa.',

  configuracion: 'Ajustes generales de la cuenta: datos de la empresa, parámetros que se usan en los certificados y otras configuraciones del sistema.',

  solicitudes: [
    'Aquí llegan las solicitudes de servicio que los clientes envían desde su portal.',
    'Por cada solicitud puedes enviar una cotización (precio + descripción), que el cliente verá y deberá aceptar.',
    'Cuando se acepta, la solicitud puede convertirse en una orden de servicio formal y asignarse a un técnico.',
    'Filtra por estado (todas, pendientes, cotizadas, etc.) para priorizar las que requieren respuesta.',
  ],

  ordenDetalle: [
    'Vista completa de una orden de servicio: datos del cliente y técnico asignado, productos aplicados, estaciones de control revisadas, actividades realizadas, fotos de evidencia y el certificado generado.',
    'El técnico registra aquí todo el trabajo realizado durante la visita.',
    'Funciona también sin conexión a internet: si el técnico está en campo sin señal, los cambios se guardan localmente y se sincronizan automáticamente cuando vuelve la conexión.',
    'Desde esta pantalla se genera el certificado final una vez la orden queda completa.',
  ],

  portalCliente: [
    'Este es tu portal personal como cliente de {{empresa}}.',
    'En "Historial" puedes ver todos los servicios realizados en tu propiedad.',
    'En "Certificados" puedes descargar los certificados de cada servicio finalizado.',
    'En "Documentos" puedes visualizar y descargar los documentos que validan y acreditan a {{empresa}}.',
    'En "Solicitudes" puedes pedir un nuevo servicio y hacer seguimiento a su estado (pendiente, cotizada, programada).',
  ],

  portalSolicitudForm: 'Formulario para solicitar un nuevo servicio. Indica el tipo de servicio, una descripción de lo que necesitas, la dirección y la fecha que prefieres. La empresa revisará tu solicitud y te enviará una cotización.',
}
