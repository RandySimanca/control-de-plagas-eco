import { jsPDF } from 'jspdf'

export async function renderInformeTecnico(data) {
  const { cliente, relevamiento, config, normalized } = data
  const { logoData, firmaData, fotos, fechaVisita, tecnicoNombre } = normalized

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let y = margin

  const drawSectionHeader = (title, yPos) => {
    doc.setFillColor(31, 41, 55)
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F')
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(title.toUpperCase(), margin + 3, yPos + 5)
    doc.setTextColor(30, 41, 59)
    return yPos + 12
  }

  const checkPage = (needed = 20) => {
    if (y > pageHeight - needed) {
      doc.addPage()
      y = margin
    }
  }

  // Portada
  doc.setFillColor(31, 41, 55)
  doc.rect(0, 0, pageWidth, 55, 'F')
  if (logoData) doc.addImage(logoData, 'PNG', margin, 12, 40, 22)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont(undefined, 'bold')
  doc.text('Informe Técnico de Relevamiento', pageWidth - margin, 25, { align: 'right' })
  doc.setFontSize(12)
  doc.setFont(undefined, 'normal')
  doc.text(config?.nombre_empresa || 'PlagControl', pageWidth - margin, 35, { align: 'right' })
  y = 70

  // Datos del cliente
  y = drawSectionHeader('1. Datos del Cliente y Predio', y)
  doc.setFontSize(10)
  const col1 = margin + 3
  const col2 = margin + 55

  const rows = [
    ['Cliente:', cliente?.nombre || 'N/A'],
    ['Dirección del predio:', cliente?.direccion || 'N/A'],
    ['Municipio:', cliente?.municipio || 'N/A'],
    ['Fecha de visita:', fechaVisita],
    ['Técnico responsable:', tecnicoNombre]
  ]
  rows.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold')
    doc.text(label, col1, y)
    doc.setFont(undefined, 'normal')
    const lines = doc.splitTextToSize(String(value), pageWidth - col2 - margin)
    doc.text(lines, col2, y)
    y += Math.max(5, lines.length * 5)
  })
  y += 4

  // Especie y problema
  checkPage(40)
  y = drawSectionHeader('2. Especie y Descripción del Problema', y)
  const especies = (relevamiento?.especies || []).join(', ') || 'No especificado'
  doc.setFont(undefined, 'bold')
  doc.text('Especies causantes:', col1, y)
  y += 5
  doc.setFont(undefined, 'normal')
  doc.text(doc.splitTextToSize(especies, pageWidth - 2 * margin - 6), col1, y)
  y += 10

  const detalleRows = [
    ['Ubicación en el predio:', relevamiento?.ubicacion],
    ['Área afectada:', relevamiento?.area_afectada_valor ? `${relevamiento.area_afectada_valor} ${relevamiento.area_afectada_unidad || 'm²'}` : null],
    ['Altura / estructura:', relevamiento?.altura_estructura],
    ['Nivel de acumulación:', relevamiento?.nivel_acumulacion],
    ['Puntos de acceso:', (relevamiento?.puntos_acceso || []).filter(Boolean).join('; ')],
    ['Lugares de anidamiento:', (relevamiento?.lugares_anidamiento || []).filter(Boolean).join('; ')],
    ['Riesgos y dificultades:', relevamiento?.riesgos],
    ['Sistema de control recomendado:', relevamiento?.sistema_control_recomendado]
  ]
  detalleRows.forEach(([label, value]) => {
    if (!value) return
    checkPage(15)
    doc.setFont(undefined, 'bold')
    doc.text(label, col1, y)
    y += 5
    doc.setFont(undefined, 'normal')
    const lines = doc.splitTextToSize(String(value), pageWidth - 2 * margin - 6)
    doc.text(lines, col1, y)
    y += lines.length * 5 + 3
  })
  y += 4

  // Fotografías
  if (fotos.length > 0) {
    checkPage(50)
    y = drawSectionHeader('3. Evidencia Fotográfica', y)
    const imgW = (pageWidth - 2 * margin - 10) / 2
    const imgH = 45
    let col = 0
    fotos.forEach((foto) => {
      checkPage(imgH + 20)
      const x = margin + col * (imgW + 10)
      if (foto.data) {
        try {
          doc.addImage(foto.data, 'JPEG', x, y, imgW, imgH)
        } catch {
          doc.rect(x, y, imgW, imgH)
          doc.text('Imagen no disponible', x + 5, y + imgH / 2)
        }
      }
      if (foto.descripcion) {
        doc.setFontSize(8)
        doc.text(doc.splitTextToSize(foto.descripcion, imgW), x, y + imgH + 4)
      }
      col++
      if (col >= 2) {
        col = 0
        y += imgH + 14
      }
    })
    if (col > 0) y += imgH + 14
  }

  // Diagnóstico y solución
  checkPage(40)
  y = drawSectionHeader('4. Diagnóstico Técnico', y)
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  const diagLines = doc.splitTextToSize(relevamiento?.diagnostico || 'Sin diagnóstico registrado.', pageWidth - 2 * margin - 6)
  doc.text(diagLines, col1, y)
  y += diagLines.length * 5 + 8

  checkPage(40)
  y = drawSectionHeader('5. Solución Propuesta', y)
  const solLines = doc.splitTextToSize(relevamiento?.solucion_propuesta || 'Sin solución propuesta.', pageWidth - 2 * margin - 6)
  doc.text(solLines, col1, y)
  y += solLines.length * 5 + 8

  // Materiales estimados
  const materiales = (relevamiento?.materiales_estimados || []).filter(m => m.nombre?.trim())
  if (materiales.length > 0) {
    checkPage(30)
    y = drawSectionHeader('6. Materiales, Equipos y Mano de Obra Estimados', y)
    doc.setFontSize(9)
    materiales.forEach((m, i) => {
      checkPage(12)
      const texto = `${i + 1}. ${m.nombre}${m.cantidad ? ` — Cant: ${m.cantidad}` : ''}${m.observacion ? ` (${m.observacion})` : ''}`
      doc.text(doc.splitTextToSize(texto, pageWidth - 2 * margin - 6), col1, y)
      y += 6
    })
    y += 4
  }

  // Firma del técnico
  checkPage(50)
  y = drawSectionHeader('7. Firma del Técnico', y)
  if (firmaData) {
    try {
      doc.addImage(firmaData, 'PNG', col1, y, 50, 25)
      y += 30
    } catch {
      y += 5
    }
  } else {
    doc.setFontSize(9)
    doc.text('_________________________________', col1, y + 15)
    y += 20
  }
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.text(tecnicoNombre, col1, y)
  y += 5
  doc.setFont(undefined, 'normal')
  doc.setFontSize(8)
  doc.text('Técnico responsable del relevamiento', col1, y)

  // Footer
  const footer = config?.footer_pdf || `${config?.nombre_empresa || ''} — Informe técnico de relevamiento`
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text(footer, pageWidth / 2, pageHeight - 8, { align: 'center' })

  return doc
}
