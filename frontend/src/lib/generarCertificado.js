import { prepareCertificadoData } from './pdf/certificadoData'
import { renderCertificado } from './pdf/certificadoRenderer'

/**
 * Punto de entrada principal para la generación de certificados.
 * Separa la preparación de datos de la lógica de renderizado.
 */
export async function generarCertificado(params) {
  try {
    // 1. Preparar y normalizar todos los datos
    const data = await prepareCertificadoData(params)
    
    // 2. Renderizar el PDF
    const doc = await renderCertificado(data)
    
    return doc
  } catch (error) {
    console.error('Error al generar el certificado:', error)
    throw error
  }
}

/**
 * Genera y abre el PDF del certificado en una nueva pestaña del navegador o lo descarga.
 */
export async function abrirCertificado(params) {
  try {
    const doc = await generarCertificado(params)
    const fileName = `Certificado_${params.orden?.folio || params.cliente?.nombre || 'PlagControl'}_${new Date().getTime()}.pdf`
    doc.save(fileName)
  } catch (error) {
    console.error('Error al abrir el certificado:', error)
    alert('Hubo un error al generar el PDF. Por favor intenta de nuevo.')
  }
}
