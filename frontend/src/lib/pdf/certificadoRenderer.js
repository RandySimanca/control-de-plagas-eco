import { jsPDF } from 'jspdf'

export async function renderCertificado(data) {
  const { cliente, orden, productos, config, normalized } = data
  const { logoData, firmaData, evidences, tipoPlagaTitle, diagnosisText, fechaEjecucion } = normalized

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let y = margin

  // --- 1. PORTADA ---
  doc.setFillColor(31, 41, 55)
  doc.triangle(0, 0, pageWidth * 0.8, 0, 0, pageHeight * 0.3, 'F')
  doc.setFillColor(250, 175, 0)
  doc.triangle(0, pageHeight * 0.25, pageWidth, pageHeight * 0.7, 0, pageHeight * 0.7, 'F')

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(32); doc.setFont(undefined, 'bold')
  doc.text('Informe Técnico', pageWidth - margin, pageHeight * 0.22, { align: 'right' })
  doc.setFontSize(28)
  doc.text(cliente?.nombre || 'Cliente', pageWidth - margin, pageHeight * 0.32, { align: 'right' })

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(14)
  doc.text('MANEJO INTEGRADO DE PLAGAS', pageWidth - margin, pageHeight - 50, { align: 'right' })
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(10); doc.setFont(undefined, 'normal')
  const introText = "Métodos biológicos, culturales, físicos y químicos para controlar plagas con el menor riesgo ambiental y humano posible.\n\nPriorizando la prevención y el monitoreo constante."
  const introLines = doc.splitTextToSize(introText, 80)
  doc.text(introLines, pageWidth - margin, pageHeight - 40, { align: 'right' })

  if (logoData) doc.addImage(logoData, 'PNG', margin, pageHeight - 65, 45, 25)

  // --- PÁGINAS INTERNAS ---
  doc.addPage()

  const drawHeader = (pageNumber, totalPages) => {
    const headerY = 10
    const headerHeight = 22
    doc.setDrawColor(31, 41, 55); doc.setLineWidth(0.3)

    doc.rect(margin, headerY, 50, headerHeight)
    if (logoData) doc.addImage(logoData, 'PNG', margin + 2, headerY + 2, 45, 18)

    const companyName = config?.nombre_empresa || 'Nombre de la empresa'
    const nitText = config?.nit ? `NIT: ${config.nit}` : ''
    const contactText = [config?.telefono_contacto, config?.email_contacto].filter(Boolean).join(' | ')
    const addressText = config?.direccion_fiscal || ''

    doc.rect(margin + 50, headerY, pageWidth - 2 * margin - 100, headerHeight)
    
    doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 41, 59)
    doc.text('INFORME TÉCNICO DEL SERVICIO', margin + (pageWidth - 2 * margin) / 2, headerY + 5, { align: 'center' })
    
    doc.setFontSize(8); doc.setFont(undefined, 'bold')
    doc.text(`${companyName}${nitText ? ` - ${nitText}` : ''}`, margin + (pageWidth - 2 * margin) / 2, headerY + 10, { align: 'center' })
    
    doc.setFontSize(7); doc.setFont(undefined, 'normal')
    if (contactText) doc.text(contactText, margin + (pageWidth - 2 * margin) / 2, headerY + 14, { align: 'center' })
    if (addressText) doc.text(addressText, margin + (pageWidth - 2 * margin) / 2, headerY + 18, { align: 'center' })

    const metaX = pageWidth - margin - 50
    doc.rect(metaX, headerY, 50, headerHeight)
    doc.setFontSize(7); doc.setFont(undefined, 'bold')
    doc.text('INFORME', metaX + 25, headerY + 4, { align: 'center' })
    doc.line(metaX, headerY + 5, pageWidth - margin, headerY + 5)
    doc.setFont(undefined, 'normal')
    doc.text(config?.version_informe ? `VERSIÓN ${config.version_informe}` : 'VERSIÓN 1', metaX + 25, headerY + 9, { align: 'center' })
    doc.line(metaX, headerY + 10, pageWidth - margin, headerY + 10)
    doc.text(config?.fecha_modelo_informe || new Date().toLocaleDateString(), metaX + 25, headerY + 14, { align: 'center' })
    doc.line(metaX, headerY + 15, pageWidth - margin, headerY + 15)
    doc.text(`Hoja ${pageNumber + 1} De ${totalPages + 1}`, metaX + 25, headerY + 19, { align: 'center' })

    doc.line(margin + 50, headerY, margin + 50, headerY + headerHeight)
    doc.line(metaX, headerY, metaX, headerY + headerHeight)
  }

  const drawSectionHeader = (title, yPos) => {
    doc.setFillColor(210, 210, 210)
    doc.rect(margin, yPos, pageWidth - 2 * margin, 6, 'F')
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(0, 0, 0)
    doc.text(title.toUpperCase(), margin + 3, yPos + 4.5)
    return yPos + 12
  }

  y = 42
  // Sección 1: Identificación
  y = drawSectionHeader('1. Identificación del Cliente', y)
  doc.setFontSize(8.5); doc.setTextColor(50, 50, 50)
  const col1 = margin + 3; const col2 = margin + 60

  doc.setFont(undefined, 'bold'); doc.text('FECHA DE EJECUCIÓN:', col1, y); doc.setFont(undefined, 'normal'); doc.text(fechaEjecucion, col2, y); y += 5
  doc.setFont(undefined, 'bold'); doc.text('NOMBRE O RAZÓN SOCIAL:', col1, y); doc.setFont(undefined, 'normal'); doc.text(cliente?.nombre || 'N/A', col2, y); y += 5
  doc.setFont(undefined, 'bold'); doc.text('DIRECCIÓN:', col1, y); doc.setFont(undefined, 'normal'); doc.text(cliente?.direccion || 'N/A', col2, y); y += 5
  doc.setFont(undefined, 'bold'); doc.text('PROCESO EJECUTADO:', col1, y); doc.setFont(undefined, 'normal'); doc.text('', col2, y);
  doc.text(`${tipoPlagaTitle}, diagnóstico técnico integral.`, col2, y); y += 5

  // Sección 2: Objetivos
  y = drawSectionHeader('2. Objetivos', y)
  doc.setFontSize(8.5); doc.setFont(undefined, 'bold')
  doc.text('Objetivo General:', margin + 3, y); y += 4
  doc.setFont(undefined, 'normal')
  doc.text(doc.splitTextToSize("Realizar un diagnóstico técnico que permita validar las condiciones locativas, madrigueras o condiciones que propicien la proliferación de plagas.", pageWidth - 2 * margin - 5), margin + 3, y); y += 8

  doc.setFont(undefined, 'bold'); doc.text('Objetivos Específicos:', margin + 3, y); y += 5
  doc.setFont(undefined, 'normal')
  const specs = ["Identificar deterioros locativos.", "Verificar disposición de residuos.", "Identificar rastros de vectores.", "Realizar control homogéneo."]
  specs.forEach(s => { doc.circle(margin + 5, y - 1, 0.5, 'F'); doc.text(s, margin + 8, y); y += 4 })
  y += 6

  // Sección 3: Áreas
  if (y > pageHeight - 60) { doc.addPage(); y = 42 }
  y = drawSectionHeader('3. Áreas Intervenidas', y)
  doc.setFontSize(8.5); doc.setFont(undefined, 'normal')
  const areasList = orden.areas_intervenidas ? orden.areas_intervenidas.split(', ') : ['General']
  areasList.forEach(l => {
    if (y > pageHeight - 20) { doc.addPage(); y = 42 }
    doc.circle(margin + 5, y - 1, 0.5, 'F'); doc.text(l, margin + 8, y); y += 4
  })
  y += 6

  // Sección 4: Actividades
  if (y > pageHeight - 60) { doc.addPage(); y = 42 }
  y = drawSectionHeader('4. Actividades Ejecutadas / Diagnosis', y)
  doc.setFontSize(8.5); doc.setFont(undefined, 'bold'); doc.text(`4.1. ${tipoPlagaTitle}`, margin + 3, y); y += 5
  doc.setFont(undefined, 'normal')
  const txLines = doc.splitTextToSize(diagnosisText, pageWidth - 2 * margin - 5)
  doc.text(txLines, margin + 3, y); y += (txLines.length * 4) + 4

  if (productos.length > 0) {
    doc.setFont(undefined, 'bold'); doc.text('Trazabilidad de Productos:', margin + 3, y); y += 4
    doc.setFont(undefined, 'normal')
    productos.forEach(p => {
      doc.circle(margin + 5, y - 1, 0.4, 'F')
      doc.text(`${p.nombre_comercial || p.tipo_producto} - Dosis: ${p.cantidad || 'N/A'}`, margin + 7, y); y += 4
    })
    y += 4
  }

  // Sección 6: Fotos
  if (evidences.length > 0) {
    doc.addPage(); y = 42; y = drawSectionHeader('6. Resultados y Registro Fotográfico', y)
    const imgW = 65; const imgH = 45
    for (let i = 0; i < evidences.length; i++) {
      const ev = evidences[i]
      const imgData = ev.data
      if (!imgData) continue

      const col = i % 2; const row = Math.floor((i % 6) / 2)
      if (i > 0 && i % 6 === 0) { doc.addPage(); y = 42; drawSectionHeader('6. Registro Fotográfico (Cont.)', y) }

      const posX = margin + 25 + col * (imgW + 30); const posY = y + row * (imgH + 15)
      doc.addImage(imgData, posX, posY, imgW, imgH)
      doc.setFillColor(31, 41, 55); doc.rect(posX - 15, posY + 10, 25, 18, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(7)
      const lbl = doc.splitTextToSize(ev.label || 'Evidencia', 21)
      doc.text(lbl, posX - 15 + 12.5, posY + 10 + 9, { align: 'center' })
    }
    // Actualizar y a la posición por debajo de la última fila de imágenes
    const lastRow = Math.floor(((evidences.length - 1) % 6) / 2)
    y = y + (lastRow + 1) * (imgH + 15)
  }

  // --- FINAL: FIRMA Y CIERRE ---
  if (y > pageHeight - 40) { doc.addPage(); y = 42 }
  y += 10
  doc.setTextColor(30, 41, 59); doc.setFontSize(8.5); doc.setFont(undefined, 'normal')
  doc.text('Cordialmente,', margin + 3, y); y += 8

  if (firmaData) {
    try {
      doc.addImage(firmaData, 'JPEG', margin + 3, y, 35, 15)
    } catch (e) {
      console.error('Error al añadir la firma al PDF:', e)
      // Reintentar con detección automática si falla JPEG
      try { doc.addImage(firmaData, margin + 3, y, 35, 15) } catch (e2) { console.error('Fallo definitivo al insertar la firma:', e2) }
    }
    y += 18
  } else {
    y += 10
  }

  doc.setFont(undefined, 'bold')
  doc.text(orden.tecnico_nombre?.toUpperCase() || 'TÉCNICO OPERATIVO', margin + 3, y); y += 4
  doc.setFont(undefined, 'normal')
  doc.text('Técnico Especialista', margin + 3, y); y += 4
  doc.text(config?.nombre_empresa || 'DEROSH S.A.S', margin + 3, y)

  // Toques finales
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    if (i >= 2) drawHeader(i - 1, totalPages - 1)
    // Footer de texto configurable
    if (i >= 2 && config?.footer_pdf) {
      doc.setFontSize(7)
      doc.setFont(undefined, 'italic')
      doc.setTextColor(120, 120, 120)
      doc.text(config.footer_pdf, pageWidth / 2, pageHeight - 8, { align: 'center' })
    }
    doc.setLineWidth(8); doc.setDrawColor(250, 175, 0)
    doc.line(pageWidth - 45, pageHeight + 5, pageWidth + 5, pageHeight - 35)
  }

  return doc
}
