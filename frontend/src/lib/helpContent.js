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

  usuarios: [
    'Aquí se administran las cuentas de los usuarios del sistema: administradores, técnicos y clientes con acceso al portal.',
    'Puedes crear nuevas cuentas, asignar el rol correspondiente y, en el caso de clientes, vincular la cuenta al registro del cliente para que vea sus servicios en el portal.',
    'Cuando alguien deja de trabajar en la empresa o un cliente ya no debe tener acceso, desactiva su cuenta en lugar de eliminarla, para conservar el historial asociado.',
  ],

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

  sedes: [
    'Las sedes representan las distintas ubicaciones físicas de este cliente (sucursales, plantas, bodegas, etc.).',
    'Puedes agregar una sede indicando su nombre, dirección y municipio.',
    'Si el cliente no tiene sedes registradas, las estaciones y órdenes se manejan de forma global, sin asociarlas a una ubicación específica.',
  ],

  productos: [
    'Catálogo de productos usados en los servicios: nombre, tipo, unidad de medida y stock disponible.',
    'Aquí se registran nuevos productos, se edita su información y se actualiza el inventario a medida que se consume o se reabastece.',
    'Los productos con stock bajo quedan señalados para que sepas cuáles reabastecer pronto.',
  ],

  auditoria: [
    'Aquí se rastrea el consumo de productos por técnico y por cliente a lo largo del tiempo.',
    'Filtra por técnico, producto o rango de fechas para revisar qué se aplicó y en qué órdenes.',
    'Puedes exportar el resultado a CSV para llevar el control o compartirlo con quien lo necesite.',
  ],
}
