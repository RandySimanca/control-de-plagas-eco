import { jsPDF } from 'jspdf'

export async function renderCertificado(data) {
  const { cliente, orden, productos, actividades = [], config, normalized } = data
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
  doc.setFontSize(11); doc.setTextColor(50, 50, 50)
  const col1 = margin + 3; const col2 = margin + 60

  doc.setFont(undefined, 'bold'); doc.text('FECHA DE EJECUCIÓN:', col1, y); doc.setFont(undefined, 'normal'); doc.text(fechaEjecucion, col2, y); y += 5
  doc.setFont(undefined, 'bold'); doc.text('NOMBRE O RAZÓN SOCIAL:', col1, y); doc.setFont(undefined, 'normal'); doc.text(cliente?.nombre || 'N/A', col2, y); y += 5
  doc.setFont(undefined, 'bold'); doc.text('DIRECCIÓN:', col1, y); doc.setFont(undefined, 'normal'); doc.text(cliente?.direccion || 'N/A', col2, y); y += 5
  doc.setFont(undefined, 'bold'); doc.text('MUNICIPIO:', col1, y); doc.setFont(undefined, 'normal'); doc.text(cliente?.municipio || 'N/A', col2, y); y += 5
  doc.setFont(undefined, 'bold'); doc.text('PROCESO EJECUTADO:', col1, y); doc.setFont(undefined, 'normal');
  const procesoText = `${tipoPlagaTitle}, diagnóstico técnico integral.`;
  const procesoLines = doc.splitTextToSize(procesoText, pageWidth - col2 - margin);
  doc.text(procesoLines, col2, y); 
  y += (procesoLines.length * 5);

  // Sección 2: Objetivos
  y = drawSectionHeader('2. Objetivos', y)
  doc.setFontSize(11); doc.setFont(undefined, 'bold')
  doc.text('Objetivo General:', margin + 3, y); y += 4
  doc.setFont(undefined, 'normal')
  doc.text(doc.splitTextToSize("Realizar un diagnóstico técnico que permita validar las condiciones locativas, madrigueras o condiciones que propicien la proliferación de plagas.", pageWidth - 2 * margin - 5), margin + 3, y); y += 8

  doc.setFont(undefined, 'bold'); doc.text('Objetivos Específicos:', margin + 3, y); y += 5
  doc.setFont(undefined, 'normal')
  const specs = ["Identificar deterioros locativos.", "Verificar disposición de residuos.", "Identificar rastros de vectores.", "Realizar control homogéneo."]
  specs.forEach(s => { doc.circle(margin + 5, y - 1, 0.5, 'F'); doc.text(s, margin + 8, y); y += 4 })
  y += 6

  // Sección 3: Áreas
  const areasParsed = (() => {
    if (!orden.areas_intervenidas) return []
    try {
      const parsed = JSON.parse(orden.areas_intervenidas)
      if (Array.isArray(parsed)) return parsed
    } catch {}
    // legacy string
    return orden.areas_intervenidas.split(', ').filter(Boolean).map(a => ({ tipo: 'General', area: a }))
  })()

  if (y > pageHeight - 60) { doc.addPage(); y = 42 }
  y = drawSectionHeader('3. Áreas Intervenidas', y)
  
  if (areasParsed.length === 0) {
    doc.setFontSize(11); doc.setFont(undefined, 'normal');
    doc.text('No se han especificado áreas.', margin + 3, y); y += 6;
  } else {
    const areasPorTipo = areasParsed.reduce((acc, a) => {
      if (!acc[a.tipo]) acc[a.tipo] = []
      acc[a.tipo].push(a.area)
      return acc
    }, {})

    for (const [tipo, areas] of Object.entries(areasPorTipo)) {
      if (y > pageHeight - 20) { doc.addPage(); y = 42 }
      doc.setFont(undefined, 'bold'); doc.setFontSize(10); doc.setTextColor(60, 80, 160)
      doc.text(tipo.toUpperCase(), margin + 3, y); y += 4
      doc.setFont(undefined, 'normal'); doc.setTextColor(50, 50, 50)
      areas.forEach(a => {
        if (y > pageHeight - 15) { doc.addPage(); y = 42 }
        doc.circle(margin + 5, y - 1, 0.4, 'F')
        doc.text(a, margin + 8, y); y += 4
      })
      y += 2
    }
    y += 2
  }

  // Sección 4: Actividades
  if (y > pageHeight - 60) { doc.addPage(); y = 42 }
  y = drawSectionHeader('4. Actividades Ejecutadas / Diagnosis', y)
  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text(`4.1. ${tipoPlagaTitle}`, margin + 3, y); y += 5
  doc.setFont(undefined, 'normal')
  const txLines = doc.splitTextToSize(diagnosisText, pageWidth - 2 * margin - 5)
  doc.text(txLines, margin + 3, y); y += (txLines.length * 4) + 4

  if (productos.length > 0) {
    if (y > pageHeight - 30) { doc.addPage(); y = 42; }
    doc.setFont(undefined, 'bold'); doc.text('Trazabilidad de Productos:', margin + 3, y); y += 4
    
    productos.forEach(p => {
      if (y > pageHeight - 20) { doc.addPage(); y = 42; }
      
      const controlName = p.tipo_producto ? `[${p.tipo_producto}] ` : ''
      const productName = p.nombre_comercial || p.nombre_producto || 'Producto sin nombre'
      const activeIng = p.ingrediente_activo ? ` (I.A: ${p.ingrediente_activo})` : ''
      
      doc.circle(margin + 5, y - 1, 0.4, 'F')
      doc.setFont(undefined, 'bold')
      doc.text(`${controlName}${productName}${activeIng}`, margin + 7, y)
      y += 4
      
      const details = []
      if (p.dosis) details.push(`Dosis: ${p.dosis}`)
      if (p.cantidad) details.push(`Cantidad usada: ${p.cantidad}`)
      
      if (details.length > 0) {
        doc.setFont(undefined, 'normal')
        doc.text(details.join(' | '), margin + 7, y)
        y += 4
      } else {
        y += 1
      }
    })
    y += 2
  }

  // Sección 5: Bitácora de Actividades
  const actividadesOrdenadas = [...actividades].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  )

  if (actividadesOrdenadas.length > 0) {
    if (y > pageHeight - 50) { doc.addPage(); y = 42 }
    y = drawSectionHeader('5. Bitácora de Actividades del Servicio', y)

    actividadesOrdenadas.forEach(act => {
      if (y > pageHeight - 20) { doc.addPage(); y = 42 }

      const fecha = new Date(act.created_at)
      const hora = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
      const dia = fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const timestamp = `[${dia} ${hora}]`

      doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(60, 80, 160)
      doc.text(timestamp, margin + 3, y)

      const descLines = doc.splitTextToSize(act.descripcion || '', pageWidth - 2 * margin - 30)
      doc.setFont(undefined, 'normal'); doc.setTextColor(50, 50, 50)
      doc.text(descLines, margin + 35, y)
      y += Math.max(descLines.length * 4.5, 5) + 3
    })
    y += 4
  }

  // Sección 6: Métodos de Aplicación
  const metodosParsed = (() => {
    if (!orden.metodos_aplicacion) return []
    try {
      const parsed = JSON.parse(orden.metodos_aplicacion)
      if (Array.isArray(parsed)) return parsed
    } catch {}
    // legacy string
    return orden.metodos_aplicacion.split(', ').filter(Boolean).map(m => ({ tipo: 'General', metodo: m }))
  })()

  if (metodosParsed.length > 0) {
    if (y > pageHeight - 40) { doc.addPage(); y = 42 }
    y = drawSectionHeader('6. Métodos de Aplicación', y)
    
    const metodosPorTipo = metodosParsed.reduce((acc, m) => {
      if (!acc[m.tipo]) acc[m.tipo] = []
      acc[m.tipo].push(m.metodo)
      return acc
    }, {})

    for (const [tipo, metodos] of Object.entries(metodosPorTipo)) {
      if (y > pageHeight - 20) { doc.addPage(); y = 42 }
      doc.setFont(undefined, 'bold'); doc.setFontSize(10); doc.setTextColor(60, 80, 160)
      doc.text(tipo.toUpperCase(), margin + 3, y); y += 4
      doc.setFont(undefined, 'normal'); doc.setTextColor(50, 50, 50)
      metodos.forEach(met => {
        if (y > pageHeight - 15) { doc.addPage(); y = 42 }
        doc.circle(margin + 5, y - 1, 0.4, 'F')
        doc.text(met, margin + 8, y); y += 4
      })
      y += 2
    }
    y += 2
  }

  // Sección 7: Fotos
  if (evidences.length > 0) {
    doc.addPage(); y = 42; y = drawSectionHeader('7. Resultados y Registro Fotográfico', y)

    // Ordenar fotos de ambiente cronológicamente (más antigua primero)
    const evidencesSorted = [...evidences].sort((a, b) => {
      if (!a.created_at && !b.created_at) return 0
      if (!a.created_at) return 1
      if (!b.created_at) return -1
      return new Date(a.created_at) - new Date(b.created_at)
    })
    
    const groupedEvidences = evidencesSorted.reduce((acc, ev) => {
      const label = ev.label || 'Evidencia General';
      if (!acc[label]) acc[label] = [];
      acc[label].push(ev);
      return acc;
    }, {});

    const imgW = 75; const imgH = 55;
    const spacingX = 15; const spacingY = 15;

    for (const [label, photos] of Object.entries(groupedEvidences)) {
      if (y > pageHeight - 40) {
        doc.addPage(); y = 42; 
        y = drawSectionHeader('7. Registro Fotográfico (Cont.)', y) 
      }
      
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 41, 59);
      doc.text(label.toUpperCase(), margin + 3, y + 4);
      y += 10;
      
      let col = 0;
      for (let i = 0; i < photos.length; i++) {
        const imgData = photos[i].data;
        if (!imgData) continue;
        
        if (y + imgH > pageHeight - 20) {
          doc.addPage(); y = 42; 
          y = drawSectionHeader('7. Registro Fotográfico (Cont.) - ' + label, y);
          col = 0;
        }
        
        const posX = margin + 10 + col * (imgW + spacingX);
        const posY = y;
        
        doc.addImage(imgData, posX, posY, imgW, imgH);
        
        col++;
        if (col >= 2) {
          col = 0;
          y += imgH + spacingY;
        }
      }
      
      if (col > 0) {
        y += imgH + spacingY;
      }
    }
  }

  // Sección: Lavado de Tanques
  const tanques = normalized.tanques || []
  if (tanques.length > 0) {
    const sectionNum = evidences.length > 0 ? '8' : '7'
    doc.addPage(); y = 42
    y = drawSectionHeader(`${sectionNum}. Actividades de Lavado y Desinfección de Tanques`, y)

    const formatTimestamp = (isoStr) => {
      if (!isoStr) return ''
      const d = new Date(isoStr)
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
    }

    const EVENTO_COLORS = {
      INICIO: [41, 128, 185],
      HALLAZGO: [211, 84, 0],
      DURANTE: [39, 174, 96],
      DESINFECCION: [142, 68, 173],
      ENJUAGUE: [22, 160, 133],
      FINAL: [31, 41, 55]
    }

    for (let tIdx = 0; tIdx < tanques.length; tIdx++) {
      const tanque = tanques[tIdx]

      // Nueva página para cada tanque excepto el primero
      if (tIdx > 0) { doc.addPage(); y = 42 }
      
      // === FICHA TÉCNICA DEL TANQUE ===
      doc.setFillColor(31, 41, 55)
      doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F')
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(255, 255, 255)
      doc.text(`TANQUE: ${tanque.numero || ''}  —  ${tanque.nombre || ''}`, margin + 3, y + 5)
      y += 12

      // Foto + datos en dos columnas
      const fichaStartY = y
      const fichaFotoW = 50
      const fichaFotoH = 38
      const fichaDataX = margin + fichaFotoW + 8
      const fichaDataW = pageWidth - 2 * margin - fichaFotoW - 8

      // Foto general del tanque (columna izquierda)
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3)
      if (tanque.fotoData) {
        try {
          doc.addImage(tanque.fotoData, margin, fichaStartY, fichaFotoW, fichaFotoH)
          doc.rect(margin, fichaStartY, fichaFotoW, fichaFotoH)
        } catch(e) {}
      } else {
        doc.rect(margin, fichaStartY, fichaFotoW, fichaFotoH)
        doc.setFontSize(7); doc.setFont(undefined, 'italic'); doc.setTextColor(160, 160, 160)
        doc.text('Sin foto', margin + fichaFotoW / 2, fichaStartY + fichaFotoH / 2, { align: 'center' })
      }
      doc.setFontSize(7); doc.setFont(undefined, 'italic'); doc.setTextColor(120, 120, 120)
      doc.text(`Figura ${tIdx + 1}. Fotografía General del Tanque`, margin + fichaFotoW / 2, fichaStartY + fichaFotoH + 4, { align: 'center' })

      // Datos técnicos (columna derecha)
      let dy = fichaStartY
      doc.setTextColor(50, 50, 50)
      const drawRow = (label, value) => {
        doc.setFontSize(8); doc.setFont(undefined, 'bold')
        doc.text(`${label}:`, fichaDataX, dy)
        doc.setFont(undefined, 'normal')
        const lines = doc.splitTextToSize(value || 'N/A', fichaDataW - 32)
        doc.text(lines, fichaDataX + 32, dy)
        dy += Math.max(lines.length * 3.5, 4)
      }

      drawRow('Código', tanque.numero)
      drawRow('Tipo', tanque.tipo_tanque)
      drawRow('Material', tanque.material)
      drawRow('Capacidad', tanque.capacidad_valor ? `${tanque.capacidad_valor} ${tanque.capacidad_unidad || ''}` : null)
      drawRow('Ubicación', tanque.ubicacion)
      drawRow('Técnico', data.tecnico)
      drawRow('Fecha', fechaEjecucion)

      y = Math.max(fichaStartY + fichaFotoH + 8, dy + 4)

      // === LÍNEA DE TIEMPO DE EVENTOS ===
      const bitacora = tanque.bitacora || []
      if (bitacora.length > 0) {
        doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3)
        doc.line(margin, y, pageWidth - margin, y)
        y += 6

        doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(31, 41, 55)
        doc.text('BITÁCORA DE ACTIVIDADES:', margin + 3, y); y += 8

        for (const evento of bitacora) {
          // Cabecera del evento con línea separadora
          const [r, g, b] = EVENTO_COLORS[evento.tipo_evento] || [100, 100, 100]
          
          // Chequeamos espacio mínimo para la cabecera
          if (y > pageHeight - 40) { doc.addPage(); y = 42 }

          // Línea divisora con color del evento
          doc.setFillColor(r, g, b)
          doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F')
          doc.setFontSize(8); doc.setFont(undefined, 'bold'); doc.setTextColor(255, 255, 255)
          const horaEvento = formatTimestamp(evento.created_at)
          doc.text(`${horaEvento}  ·  ${evento.tipo_evento}`, margin + 3, y + 4.5)
          y += 9

          // Descripción del evento
          if (y > pageHeight - 30) { doc.addPage(); y = 42 }
          doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(50, 50, 50)
          const descLines = doc.splitTextToSize(evento.descripcion || '', pageWidth - 2 * margin - 5)
          doc.text(descLines, margin + 3, y)
          y += descLines.length * 4.5 + 5

          // === CUADRÍCULA DINÁMICA DE FOTOS DEL EVENTO ===
          const eventFotos = (evento.fotos || []).filter(f => f.data)
          if (eventFotos.length > 0) {
            const contentW = pageWidth - 2 * margin
            let imgH = 55

            // Calcular anchos dinámicos según cantidad
            let colDefs = []
            if (eventFotos.length === 1) {
              colDefs = [{ w: contentW, x: margin }]
              imgH = 75
            } else if (eventFotos.length === 2) {
              const w = (contentW - 3) / 2
              colDefs = [
                { w, x: margin },
                { w, x: margin + w + 3 }
              ]
            } else if (eventFotos.length === 3) {
              const wHalf = (contentW - 3) / 2
              colDefs = [
                { w: wHalf, x: margin },
                { w: wHalf, x: margin + wHalf + 3 },
                'newrow',
                { w: contentW, x: margin }
              ]
            } else {
              // 4 o más: cuadrícula 2x2 agrupando de a 2 en 2
              const w = (contentW - 3) / 2
              colDefs = []
              for (let i = 0; i < eventFotos.length; i++) {
                colDefs.push({ w, x: margin + (i % 2) * (w + 3) })
                if (i % 2 === 1 && i + 1 < eventFotos.length) colDefs.push('newrow')
              }
            }

            // Checar espacio para al menos una fila de fotos
            if (y + imgH + 5 > pageHeight - 15) { doc.addPage(); y = 42 }

            let rowY = y
            let colIdx = 0
            for (const def of colDefs) {
              if (def === 'newrow') {
                rowY += imgH + 3
                colIdx = 0
                if (rowY + imgH > pageHeight - 15) { doc.addPage(); rowY = 42 }
                continue
              }
              if (colIdx >= eventFotos.length) break
              
              const foto = eventFotos[colIdx]
              if (!foto.data) { colIdx++; continue }

              try {
                doc.addImage(foto.data, def.x, rowY, def.w, imgH)
                doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2)
                doc.rect(def.x, rowY, def.w, imgH)
              } catch (e) {}
              colIdx++
            }
            y = rowY + imgH + 3

            // Pie de foto del evento
            const figNum = `Figura ${tIdx + 1}.${bitacora.indexOf(evento) + 1}`
            doc.setFontSize(7); doc.setFont(undefined, 'italic'); doc.setTextColor(120, 120, 120)
            doc.text(`${figNum}. Evidencias fotográficas — ${evento.tipo_evento} — ${horaEvento}`, margin + 3, y)
            y += 6
          }

          y += 4 // Separación entre eventos
        }
      }
    }
  }


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
