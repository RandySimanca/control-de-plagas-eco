import { prepareCertificadoData } from './pdf/certificadoData'
import { renderCertificado } from './pdf/certificadoRenderer'

/**
 * Main entry point for certificate generation.
 * Separates data preparation from rendering logic.
 */
export async function generarCertificado(params) {
  try {
    // 1. Prepare and normalize all data
    const data = await prepareCertificadoData(params)
    
    // 2. Render the PDF
    const doc = await renderCertificado(data)
    
    return doc
  } catch (error) {
    console.error('Error generating certificate:', error)
    throw error
  }
}

/**
 * Generates and opens the certificate PDF in a new browser tab or download.
 */
export async function abrirCertificado(params) {
  try {
    const doc = await generarCertificado(params)
    const fileName = `Certificado_${params.orden?.folio || params.cliente?.nombre || 'PlagControl'}_${new Date().getTime()}.pdf`
    doc.save(fileName)
  } catch (error) {
    console.error('Error opening certificate:', error)
    alert('Hubo un error al generar el PDF. Por favor intenta de nuevo.')
  }
}
