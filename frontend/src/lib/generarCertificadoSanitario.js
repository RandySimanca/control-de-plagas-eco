import { prepareCertificadoSanitarioData } from './pdf/certificadoSanitarioData'
import { renderCertificadoSanitario } from './pdf/certificadoSanitarioRenderer'

/**
 * Genera el documento PDF del Certificado Sanitario
 * @param {Object} params - Datos para generar el certificado
 * @returns {jsPDF} Instancia del documento PDF
 */
export async function generarCertificadoSanitario(params) {
  try {
    const data = await prepareCertificadoSanitarioData(params)
    const doc = await renderCertificadoSanitario(data)
    
    // Configurar propiedades del documento
    doc.setProperties({
      title: `Certificado Sanitario ${params.folio}`,
      subject: 'Certificado de Control de Plagas',
      author: 'PlagControl',
      creator: 'PlagControl App'
    })

    return doc
  } catch (error) {
    console.error('Error al generar certificado sanitario:', error)
    throw error
  }
}

/**
 * Genera y abre el certificado en una nueva pestaña (para navegadores de escritorio) o inicia la descarga
 */
export async function abrirCertificadoSanitario(params) {
  try {
    const doc = await generarCertificadoSanitario(params)
    const pdfBlob = doc.output('blob')
    const url = URL.createObjectURL(pdfBlob)
    
    const w = window.open()
    if (w) {
      w.document.write(
        `<iframe width='100%' height='100%' style='border:none;margin:0;padding:0' src='${url}#toolbar=1'></iframe>`
      )
      w.document.title = `Certificado_Sanitario_${params.folio}.pdf`
      w.document.body.style.margin = '0'
    } else {
      doc.save(`Certificado_Sanitario_${params.folio}.pdf`)
    }
  } catch (error) {
    console.error('Error al abrir certificado:', error)
    throw error
  }
}
