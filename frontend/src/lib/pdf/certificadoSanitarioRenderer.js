import { jsPDF } from 'jspdf'

export async function renderCertificadoSanitario(data) {
  const { certificado, cliente, normalized, qrDataUrl } = data
  const { logoData, firmaData, representanteNombre, representanteCargo, fechaServicio, fechaEmision, fechaVencimiento } = normalized

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Fondo superior (Diseño corporativo)
  doc.setFillColor(31, 41, 55)
  doc.triangle(0, 0, pageWidth * 0.8, 0, 0, pageHeight * 0.3, 'F')
  doc.setFillColor(250, 175, 0)
  doc.triangle(0, pageHeight * 0.25, pageWidth, pageHeight * 0.7, 0, pageHeight * 0.7, 'F')
  
  // Limpiar zona central con un cuadro blanco suave para legibilidad si se desea, o dejar fondo limpio
  // Aquí usamos fondo limpio
  doc.setFillColor(255, 255, 255)
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40, 'F')

  // LOGO
  if (logoData) {
    doc.addImage(logoData, 'PNG', 25, 25, 45, 15, undefined, 'FAST')
  }

  // FOLIO
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(10); doc.setFont(undefined, 'normal')
  doc.text('No. CERTIFICADO', pageWidth - 25, 30, { align: 'right' })
  doc.setTextColor(31, 41, 55)
  doc.setFontSize(12); doc.setFont(undefined, 'bold')
  doc.text(certificado.folio || 'S/N', pageWidth - 25, 36, { align: 'right' })

  // TÍTULO CENTRAL
  let y = 60
  doc.setTextColor(31, 41, 55)
  doc.setFontSize(26); doc.setFont(undefined, 'bold')
  doc.text('CERTIFICADO', pageWidth / 2, y, { align: 'center' })
  
  y += 10
  doc.setFontSize(14); doc.setFont(undefined, 'normal')
  doc.text('DE INSPECCIÓN Y/O CONTROL DE PLAGAS', pageWidth / 2, y, { align: 'center' })

  y += 25
  
  // COLUMNA LATERAL IZQUIERDA (Info Fechas)
  const leftColX = 25
  const rightColX = 70

  doc.setFontSize(10); doc.setFont(undefined, 'bold')
  doc.text('FECHA EMISIÓN:', leftColX, y)
  doc.setFont(undefined, 'normal')
  doc.text(fechaEmision, leftColX, y + 5)

  doc.setFont(undefined, 'bold')
  doc.text('FECHA SERVICIO:', leftColX, y + 15)
  doc.setFont(undefined, 'normal')
  doc.text(fechaServicio, leftColX, y + 20)

  doc.setFont(undefined, 'bold')
  doc.text('VIGENCIA:', leftColX, y + 30)
  doc.setFont(undefined, 'normal')
  doc.text(fechaVencimiento, leftColX, y + 35)

  // CUERPO CENTRAL
  doc.setFontSize(11); doc.setFont(undefined, 'bold')
  doc.text('CERTIFICA QUE:', rightColX, y)
  
  y += 8
  doc.setFont(undefined, 'bold')
  const clientName = cliente?.razon_social || cliente?.nombre || 'CLIENTE NO DEFINIDO'
  doc.text(clientName.toUpperCase(), rightColX, y)
  
  y += 6
  doc.setFont(undefined, 'normal')
  doc.text(`Identificado con: ${cliente?.identificacion || 'N/A'}`, rightColX, y)
  
  y += 6
  doc.text(`Ubicado en: ${cliente?.direccion || 'N/A'}`, rightColX, y)
  
  y += 6
  const municipio = cliente?.municipio_nombre ? `${cliente.municipio_nombre} - ${cliente.departamento_nombre || ''}` : 'N/A'
  doc.text(`Municipio: ${municipio}`, rightColX, y)
  
  y += 6
  doc.text(`Tipo de Establecimiento: ${certificado.tipo_establecimiento || 'N/A'}`, rightColX, y)
  
  y += 6
  doc.text(`Tipo de Servicio: ${certificado.tipo_servicio || 'N/A'}`, rightColX, y)

  y += 15
  const parrafo = `fue objeto de INSPECCIÓN Y/O CONTROL INTEGRAL DE PLAGAS, realizado de acuerdo con los procedimientos técnicos establecidos por la empresa y considerando las disposiciones aplicables al tipo de establecimiento.`
  const textLines = doc.splitTextToSize(parrafo, pageWidth - rightColX - 25)
  doc.text(textLines, rightColX, y)
  y += (textLines.length * 5) + 10

  doc.text('De acuerdo con la evaluación realizada durante la visita, se obtuvo como resultado:', rightColX, y)
  y += 12

  // RESULTADO
  const isCumple = certificado.resultado === 'CUMPLE'
  const isCumpleObs = certificado.resultado === 'CUMPLE CON OBSERVACIONES'
  
  if (isCumple) doc.setTextColor(34, 197, 94) // Verde
  else if (isCumpleObs) doc.setTextColor(234, 179, 8) // Amarillo
  else doc.setTextColor(239, 68, 68) // Rojo

  doc.setFontSize(16); doc.setFont(undefined, 'bold')
  doc.text(`>> ${certificado.resultado} <<`, rightColX, y)
  doc.setTextColor(31, 41, 55)

  y += 15
  
  // OBSERVACIONES
  if (certificado.observaciones) {
    doc.setFontSize(10); doc.setFont(undefined, 'bold')
    doc.text('Observaciones:', rightColX, y)
    y += 5
    doc.setFont(undefined, 'normal')
    const obsLines = doc.splitTextToSize(certificado.observaciones, pageWidth - rightColX - 25)
    doc.text(obsLines, rightColX, y)
    y += (obsLines.length * 5) + 5
  }

  // NORMATIVIDAD
  if (certificado.normativa_referencia) {
    doc.setFontSize(10); doc.setFont(undefined, 'bold')
    doc.text('Normativa de Referencia Aplicable:', rightColX, y)
    y += 5
    doc.setFont(undefined, 'normal')
    const normLines = doc.splitTextToSize(certificado.normativa_referencia, pageWidth - rightColX - 25)
    doc.text(normLines, rightColX, y)
    y += (normLines.length * 5) + 10
  }

  // ACLARATORIA (pequeña)
  y = pageHeight - 65
  doc.setFontSize(7); doc.setTextColor(120, 120, 120)
  const aclaratoria = 'El presente certificado acredita exclusivamente la realización de la inspección y/o servicio de control de plagas y el resultado de la evaluación efectuada respecto de las condiciones relacionadas con el control de plagas observadas durante la visita.'
  const aclLines = doc.splitTextToSize(aclaratoria, pageWidth - 50)
  doc.text(aclLines, 25, y)

  // FIRMA Y QR
  y = pageHeight - 45
  if (firmaData) {
    doc.addImage(firmaData, 'PNG', 35, y - 15, 40, 20, undefined, 'FAST')
  }
  doc.setTextColor(31, 41, 55)
  doc.setFontSize(10); doc.setFont(undefined, 'bold')
  doc.text('Firma Representante Legal', 55, y + 10, { align: 'center' })
  doc.setFontSize(9); doc.setFont(undefined, 'normal')
  doc.text(representanteNombre || '', 55, y + 15, { align: 'center' })
  doc.text(representanteCargo || '', 55, y + 20, { align: 'center' })

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', pageWidth - 55, y - 15, 30, 30, undefined, 'FAST')
    doc.setFontSize(7)
    doc.text('Escanea para verificar', pageWidth - 40, y + 20, { align: 'center' })
  }

  return doc
}
