import { prepareInformeActividadesData } from './pdf/informeActividadesData'
import { renderInformeActividades } from './pdf/informeActividadesRenderer'

/**
 * Punto de entrada principal para la generación del Informe General de Actividades.
 * Separa la preparación de datos de la lógica de renderizado.
 * Anteriormente conocido como generarCertificado
 */
export async function generarInformeActividades(params) {
  try {
    // 1. Preparar y normalizar todos los datos
    const data = await prepareInformeActividadesData(params)
    
    // 2. Renderizar el PDF
    const doc = await renderInformeActividades(data)
    
    return doc
  } catch (error) {
    console.error('Error al generar el informe de actividades:', error)
    throw error
  }
}

/**
 * Genera y abre el PDF del Informe General de Actividades en una nueva pestaña del navegador o lo descarga.
 * Anteriormente conocido como abrirCertificado
 */
export async function abrirInformeActividades(params) {
  try {
    const doc = await generarInformeActividades(params)
    const fileName = `Informe_Actividades_${params.orden?.folio || params.cliente?.nombre || 'PlagControl'}_${new Date().getTime()}.pdf`
    doc.save(fileName)
  } catch (error) {
    console.error('Error al abrir el informe de actividades:', error)
    alert('Hubo un error al generar el PDF. Por favor intenta de nuevo.')
  }
}