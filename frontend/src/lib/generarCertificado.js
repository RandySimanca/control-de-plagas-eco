import { jsPDF } from 'jspdf'

async function getImgData(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.error('Error fetching image:', err)
    return null
  }
}

export async function generarCertificado({ cliente, orden, productos = [], estaciones = [], tecnico, config, actividades = [], fotos = [], firma_tecnico }) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let y = margin

  const logoData = config?.logo_url ? await getImgData(config.logo_url) : (config?.logo_asset ? await getImgData(config.logo_asset) : await getImgData('/src/assets/logo Derosh.png'))

  // --- 1. PORTADA ---
  // Diseño diagonal corporativo (DEROSH Style)
  doc.setFillColor(31, 41, 55) // Dark grey/black
  doc.triangle(0, 0, pageWidth * 0.8, 0, 0, pageHeight * 0.3, 'F')
  doc.setFillColor(250, 175, 0) // Gold accent
  doc.triangle(0, pageHeight * 0.25, pageWidth, pageHeight * 0.7, 0, pageHeight * 0.7, 'F')
  
  // Texto Portada
  doc.setTextColor(15, 23, 42) // Slate/Black
  doc.setFontSize(32)
  doc.setFont(undefined, 'bold')
  doc.text('Informe Técnico', pageWidth - margin, pageHeight * 0.22, { align: 'right' })
  doc.setFontSize(28)
  doc.text(cliente?.nombre || 'Terminal de Tunja', pageWidth - margin, pageHeight * 0.32, { align: 'right' })
  
  doc.setTextColor(15, 23, 42) // Slate/Black
  doc.setFontSize(14)
  doc.text('MANEJO INTEGRADO DE PLAGAS', pageWidth - margin, pageHeight - 50, { align: 'right' })
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(10); doc.setFont(undefined, 'normal')
  const introText = "Métodos biológicos, culturales, físicos y químicos para controlar plagas con el menor riesgo ambiental y humano posible.\n\nPriorizando la prevención y el monitoreo constante."
  const introLines = doc.splitTextToSize(introText, 80)
  doc.text(introLines, pageWidth - margin, pageHeight - 40, { align: 'right' })

  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, pageHeight - 65, 45, 25)
  }

  // --- PÁGINAS INTERNAS ---
  doc.addPage()
  
  function drawHeader(pageNumber, totalPages) {
    const headerY = 10
    const headerHeight = 22
    doc.setDrawColor(31, 41, 55)
    doc.setLineWidth(0.3)
    
    // Logo (1/3)
    doc.rect(margin, headerY, 50, headerHeight)
    if (logoData) doc.addImage(logoData, 'PNG', margin + 2, headerY + 2, 45, 18)
    
    const companyName = config?.nombre_empresa || 'DEROSH S.A.S'
    // Título Central (1/3)
    doc.rect(margin + 50, headerY, pageWidth - 2 * margin - 100, headerHeight)
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 41, 59)
    doc.text(companyName, margin + (pageWidth - 2 * margin) / 2, headerY + 8, { align: 'center' })
    doc.text('INFORME TÉCNICO DEL SERVICIO', margin + (pageWidth - 2 * margin) / 2, headerY + 14, { align: 'center' })
    
    // Metadatos Lateral (1/3)
    const metaX = pageWidth - margin - 50
    doc.rect(metaX, headerY, 50, headerHeight)
    doc.setFontSize(7); doc.setFont(undefined, 'bold')
    
    // Grid interna de la derecha
    doc.text('INFORME', metaX + 25, headerY + 4, { align: 'center' })
    doc.line(metaX, headerY + 5, pageWidth - margin, headerY + 5)
    doc.setFont(undefined, 'normal')
    const vInfo = config?.version_informe ? `VERSIÓN ${config.version_informe}` : 'VERSIÓN 1'
    doc.text(vInfo, metaX + 25, headerY + 9, { align: 'center' })
    doc.line(metaX, headerY + 10, pageWidth - margin, headerY + 10)
    const dInfo = config?.fecha_modelo_informe ? config.fecha_modelo_informe : `${new Date().toLocaleDateString()}`
    doc.text(dInfo, metaX + 25, headerY + 14, { align: 'center' })
    doc.line(metaX, headerY + 15, pageWidth - margin, headerY + 15)
    doc.text(`Hoja ${pageNumber + 1} De ${totalPages + 1}`, metaX + 25, headerY + 19, { align: 'center' })

    // Centered vertical lines for metadata
    doc.line(margin + 50, headerY, margin + 50, headerY + headerHeight)
    doc.line(metaX, headerY, metaX, headerY + headerHeight)
  }

  function drawSectionHeader(title, yPos) {
    doc.setFillColor(210, 210, 210) // Light grey
    doc.rect(margin, yPos, pageWidth - 2 * margin, 6, 'F')
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(0, 0, 0)
    doc.text(title.toUpperCase(), margin + 3, yPos + 4.5)
    return yPos + 12
  }

  y = 42
  // Sección 1: Identificación
  y = drawSectionHeader('1. Identificación del Cliente', y)
  doc.setFontSize(8.5); doc.setTextColor(50, 50, 50)
  
  const col1 = margin + 3
  const col2 = margin + 60
  
  doc.setFont(undefined, 'bold'); doc.text('FECHA DE EJECUCIÓN:', col1, y); doc.setFont(undefined, 'normal'); doc.text(orden.fecha_completada || orden.fecha_programada, col2, y); y += 5
  doc.setFont(undefined, 'bold'); doc.text('NOMBRE O RAZÓN SOCIAL:', col1, y); doc.setFont(undefined, 'normal'); doc.text(cliente?.nombre || 'N/A', col2, y); y += 5
  doc.setFont(undefined, 'bold'); doc.text('DIRECCIÓN:', col1, y); doc.setFont(undefined, 'normal'); doc.text(cliente?.direccion || 'N/A', col2, y); y += 5
  let textoProceso = 'control de plagas en la locación.';
  const tp = orden.tipo_plaga?.toLowerCase() || '';
  if (tp.includes('insect')) textoProceso = 'control de insectos en la locación.';
  else if (tp.includes('rat')) textoProceso = 'control de roedores en la locación.';
  else if (tp.includes('infec')) textoProceso = 'desinfección de la locación.';

  doc.setFont(undefined, 'bold'); doc.text('PROCESO EJECUTADO:', col1, y); doc.setFont(undefined, 'normal'); doc.text('Diagnóstico Técnico de la locación.', col2, y); y += 5
  doc.text(`${orden.tipo_plaga || 'Servicio Integral'}, ${textoProceso}`, col2, y); y += 10

  // Sección 2: Objetivos
  y = drawSectionHeader('2. Objetivos', y)
  doc.setFontSize(8.5); doc.setFont(undefined, 'bold')
  doc.text('Objetivo General:', margin + 3, y); y += 4
  doc.setFont(undefined, 'normal')
  const objGen = "Realizar un diagnóstico técnico que permita validar las condiciones locativas, madrigueras o condiciones que propicien la proliferación de plagas."
  doc.text(doc.splitTextToSize(objGen, pageWidth - 2 * margin - 5), margin + 3, y); y += 8
  
  doc.setFont(undefined, 'bold')
  doc.text('Objetivos Específicos:', margin + 3, y); y += 5
  doc.setFont(undefined, 'normal')
  const specs = [
    "Identificar deterioros o diseños inadecuados de la Infraestructura.",
    "Verificar las condiciones de disposición de residuos, que puedan generar condiciones propicias para plagas.",
    "Verificar u observar la presencia o rastro de Vectores (Insectos o Roedores) dentro de las diferentes estructuras.",
    "Realizar control de insectos de manera homogénea en la locación."
  ]
  specs.forEach(s => {
    doc.circle(margin + 5, y - 1, 0.5, 'F')
    doc.text(s, margin + 8, y); y += 4
  })
  y += 6

  // Sección 3: Áreas
  if (y > pageHeight - 60) { doc.addPage(); y = 42 }
  y = drawSectionHeader('3. Áreas Intervenidas', y)
  doc.setFontSize(8.5); doc.setFont(undefined, 'normal')
  doc.text('Se intervinieron las áreas a continuación:', margin + 3, y); y += 5
  
  const areasList = orden.areas_intervenidas ? orden.areas_intervenidas.split(', ') : ['General / Todo el establecimiento.']
  
  areasList.forEach(l => {
    if (y > pageHeight - 20) { doc.addPage(); y = 42 }
    doc.circle(margin + 5, y - 1, 0.5, 'F')
    doc.text(l, margin + 8, y); y += 4
  })
  y += 6

  // Sección 4: Actividades
  if (y > pageHeight - 60) { doc.addPage(); y = 42 }
  y = drawSectionHeader('4. Actividades Ejecutadas / Diagnosis', y)
  
  const tipoPlagaTitle = orden.tipo_plaga || 'Control de Plagas'
  const areasTrabajadas = orden.areas_intervenidas ? orden.areas_intervenidas.toLowerCase() : 'todas las áreas del establecimiento'
  
  let objetivo = 'controlar plagas en el área.';
  let producto = 'productos de control';
  const typeStr = tipoPlagaTitle.toLowerCase();
  
  if (typeStr.includes('insect') || typeStr.includes('fumiga')) {
      objetivo = 'controlar insectos rastreros y voladores.';
      producto = 'insecticida líquido';
  } else if (typeStr.includes('rat') || typeStr.includes('roedor')) {
      objetivo = 'controlar y erradicar roedores.';
      producto = 'rodenticida';
  } else if (typeStr.includes('infec')) {
      objetivo = 'eliminar microorganismos y patógenos.';
      producto = 'desinfectante';
  }

  doc.setFontSize(8.5); doc.setFont(undefined, 'bold')
  doc.text(`4.1. ${tipoPlagaTitle}`, margin + 3, y); y += 5
  doc.setFont(undefined, 'normal')
  const textoDinamico = `Se realizó aplicación de ${producto} a zonas: ${areasTrabajadas}. Con el objetivo de ${objetivo}`
  const txLines = doc.splitTextToSize(textoDinamico, pageWidth - 2 * margin - 5)
  doc.text(txLines, margin + 3, y); y += (txLines.length * 4) + 4

  if (orden.metodos_aplicados) {
      doc.setFont(undefined, 'bold')
      doc.text('Técnicas y Métodos de Aplicación:', margin + 3, y); y += 4
      doc.setFont(undefined, 'normal')
      doc.setTextColor(50, 50, 50)
      orden.metodos_aplicados.split(', ').forEach(m => {
          doc.circle(margin + 5, y - 1, 0.4, 'F')
          doc.text(m, margin + 7, y); y += 4
      })
      y += 2
  }

  if (productos && productos.length > 0) {
      doc.setFont(undefined, 'bold'); doc.setTextColor(0, 0, 0)
      doc.text('Trazabilidad de Productos Químicos e Insumos:', margin + 3, y); y += 4
      doc.setFont(undefined, 'normal'); doc.setTextColor(50, 50, 50)
      productos.forEach(p => {
          doc.circle(margin + 5, y - 1, 0.4, 'F')
          const prodText = `${p.nombre_comercial || p.tipo_producto} (I.A: ${p.ingrediente_activo || 'N/A'}) - Dosis/Cant: ${p.cantidad || 'N/A'}`
          doc.text(prodText, margin + 7, y); y += 4
      })
      y += 2
  }
  y += 2
  doc.setTextColor(0, 0, 0)

  doc.setFont(undefined, 'bold')
  doc.text('4.2. Diagnóstico técnico de la Locación', margin + 3, y); y += 5
  doc.setFont(undefined, 'normal')
  doc.text('El control integrado de plagas es un proceso mediante el cual se busca reducir la población de uno o más vectores y controlar su incidencia en una locación.', margin + 3, y, { maxWidth: pageWidth - 2 * margin - 5 }); y += 10
  
  doc.text('Los insectos y roedores necesitan ambientes que les provean:', margin + 3, y); y += 5
  const factors = ["Aire", "Humedad", "Alimento", "Refugio"]
  factors.forEach(f => {
    doc.circle(margin + 5, y - 1, 0.5, 'F')
    doc.text(f, margin + 8, y); y += 4
  })
  y += 6

  if (actividades.length > 0) {
    doc.setFontSize(8.5); doc.setFont(undefined, 'bold'); doc.text('Bitácora de Actividades:', margin + 3, y); y += 5
    doc.setFontSize(8); doc.setFont(undefined, 'normal')
    actividades.slice().reverse().forEach((act) => {
      const time = new Date(act.created_at).toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit'})
      const text = `${time} - ${act.descripcion}`
      const lines = doc.splitTextToSize(text, pageWidth - 2 * margin - 10)
      if (y + (lines.length * 4) > pageHeight - 20) { doc.addPage(); y = 42 }
      doc.circle(margin + 5, y - 1, 0.5, 'F')
      doc.text(lines, margin + 8, y)
      y += lines.length * 4 + 2
    })
    y += 8
  }

  // Sección 5: Monitoreo de Estaciones de Control
  if (estaciones.length > 0) {
    if (y > pageHeight - 60) { doc.addPage(); y = 42 }
    y = drawSectionHeader('5. Monitoreo de Estaciones de Control', y)
    
    doc.setFontSize(8.5); doc.setFont(undefined, 'normal')
    doc.text('Durante el servicio técnico se revisaron e instalaron las siguientes estaciones:', margin + 3, y, { maxWidth: pageWidth - 2 * margin - 5 }); y += 7
    
    estaciones.forEach(e => {
        doc.circle(margin + 5, y - 1, 0.5, 'F')
        doc.text(`${e.tipo_estacion}: ${e.cantidad} unidades evaluadas.`, margin + 8, y); y += 4
    })
    y += 6
  }

  // Section 6: Fotos
  if (fotos.length > 0 || estaciones.some(e => e.foto_antes_url)) {
    doc.addPage()
    y = 42
    y = drawSectionHeader('6. Resultados Obtenidos y Registro Fotográfico', y)
    
    const allEvidences = [
        ...fotos.map(f => ({ url: f.url, label: f.descripcion, type: 'ambiente' })),
        ...estaciones.filter(e => e.foto_antes_url).map(e => ({ url: e.foto_antes_url, label: `Estado Inicial: ${e.tipo_estacion}`, type: 'estacion' })),
        ...estaciones.filter(e => e.foto_despues_url).map(e => ({ url: e.foto_despues_url, label: `Estado Final: ${e.tipo_estacion}`, type: 'estacion' }))
    ]

    const imgW = 65; const imgH = 45
    for (let i = 0; i < allEvidences.length; i++) {
        const ev = allEvidences[i]
        const imgData = await getImgData(ev.url)
        if (!imgData) continue

        const col = i % 2
        const row = Math.floor((i % 6) / 2)
        if (i > 0 && i % 6 === 0) { doc.addPage(); y = 42; y = drawSectionHeader('6. Resultados Obtenidos y Registro Fotográfico (Cont.)', y) }

        const posX = margin + 25 + col * (imgW + 30) // x1 = 40, x2 = 130
        const posY = y + row * (imgH + 15)

        // Foto
        doc.addImage(imgData, 'JPEG', posX, posY, imgW, imgH)
        
        // Etiqueta de color superpuesta a la izq
        const colors = ['#3b82f6', '#14b8a6', '#22c55e', '#84cc16', '#eab308']
        doc.setFillColor(colors[i % colors.length])
        const boxW = 25
        const boxH = 18
        doc.rect(posX - 15, posY + 10, boxW, boxH, 'F')
        doc.setTextColor(255, 255, 255); doc.setFontSize(7)
        const labelLines = doc.splitTextToSize(ev.label || 'Evidencia', boxW - 4)
        doc.text(labelLines, posX - 15 + boxW / 2, posY + 10 + (boxH - (labelLines.length * 2.5)) / 2 + 2.5, { align: 'center' })
    }
  }

  // Section 7: Recomendaciones Generales
  doc.addPage()
  y = 42
  y = drawSectionHeader('7. Recomendaciones Generales', y)
  doc.setFontSize(8.5); doc.setTextColor(30, 41, 59); doc.setFont(undefined, 'normal')
  doc.text('Es importante implementar las recomendaciones proporcionadas para realizar un adecuado proceso de control de plagas.', margin + 3, y); y += 8
  
  const recsGenText = config?.recomendaciones_generales || 
`No eliminar residuos en los patios.
Asegurar la eliminación de residuos en lugares disponible para estos residuos.
Mantener condiciones de limpieza en todas las áreas de la locación.
Sellar orificios de la locación que permita el ingreso de plagas.
Podar el pasto en los alrededores de la locación ya que esto permite el refugio y proliferación de plagas.`

  const recsGen = recsGenText.split('\n').map(l => l.trim()).filter(Boolean)
  recsGen.forEach(r => {
    doc.circle(margin + 5, y - 1, 0.5, 'F')
    doc.text(r, margin + 8, y); y += 4
  })
  y += 15

  // Section 8: Recomendaciones del Técnico
  if (orden.recomendaciones) {
    if (y > pageHeight - 60) { doc.addPage(); y = 42 }
    y = drawSectionHeader('8. Recomendaciones del Técnico', y)
    doc.setFontSize(8.5); doc.setTextColor(30, 41, 59); doc.setFont(undefined, 'normal')
    
    const recLines = doc.splitTextToSize(orden.recomendaciones, pageWidth - 2 * margin - 5)
    doc.text(recLines, margin + 3, y)
    y += (recLines.length * 4) + 15
  }

  doc.text('Cordialmente,', margin + 3, y); y += 10
  
  const firmaTecnicoData = firma_tecnico ? await getImgData(firma_tecnico) : null
  if (firmaTecnicoData) {
    doc.addImage(firmaTecnicoData, 'PNG', margin + 3, y, 35, 15)
    y += 18
  } else {
    y += 10
  }

  doc.setFont(undefined, 'bold')
  doc.text(tecnico?.toUpperCase() || 'TÉCNICO', margin + 3, y); y += 4
  doc.setFont(undefined, 'normal')
  doc.text('Técnico Operativo', margin + 3, y); y += 4
  const companyNameFinal = config?.nombre_empresa || 'DEROSH S.A.S'
  doc.text(companyNameFinal, margin + 3, y)
  
  // Dibujar decoraciones bottom-right y cabeceras en todas las páginas internas
  const totalPagesCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPagesCount; i++) {
    doc.setPage(i)
    if (i >= 2) {
      drawHeader(i - 1, totalPagesCount - 1)
    }
    // Decoraciones inferiores inclinadas
    doc.setLineCap(1) // round
    doc.setLineWidth(5)
    doc.setDrawColor(200, 200, 200) // grey
    doc.line(pageWidth - 25, pageHeight + 5, pageWidth - 5, pageHeight - 15)
    doc.setLineWidth(8)
    doc.setDrawColor(250, 175, 0) // yellow
    doc.line(pageWidth - 45, pageHeight + 5, pageWidth + 5, pageHeight - 35)
    doc.setLineCap(0) // reset
  }

  return doc
}

/**
 * Generates and opens the certificate PDF in a new browser tab.
 */
export async function abrirCertificado(params) {
  const doc = await generarCertificado(params)
  // Forzamos la descarga del archivo para evitar bloqueadores de popups en el navegador
  doc.save(`Informe_Tecnico_${params.folio || 'Derosh'}.pdf`)
}
