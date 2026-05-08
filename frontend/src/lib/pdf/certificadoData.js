/**
 * Utility to fetch and convert image URL to base64
 */
export async function getImgData(url) {
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

/**
 * Prepares and normalizes all data needed for the PDF report
 */
export async function prepareCertificadoData(params) {
  const { 
    orden, 
    estaciones = [], 
    config, 
    fotos = [], 
    firma_tecnico 
  } = params

  // 1. Normalize Photos & Evidences
  const evidences = [
    ...fotos.map(f => ({ url: f.url, label: f.descripcion, type: 'ambiente' })),
    ...estaciones.filter(e => e.foto_antes_url).map(e => ({ 
      url: e.foto_antes_url, 
      label: `Estado Inicial: ${e.tipo_estacion}`, 
      type: 'estacion' 
    })),
    ...estaciones.filter(e => e.foto_despues_url).map(e => ({ 
      url: e.foto_despues_url, 
      label: `Estado Final: ${e.tipo_estacion}`, 
      type: 'estacion' 
    }))
  ]

  // 2. Dynamic Texts based on pest type
  const tipoPlagaTitle = orden.tipo_plaga || 'Control de Plagas'
  const areasTrabajadas = orden.areas_intervenidas ? orden.areas_intervenidas.toLowerCase() : 'todas las áreas del establecimiento'
  
  let objetivo = 'controlar plagas en el área.'
  let productoPrincipal = 'productos de control'
  const typeStr = tipoPlagaTitle.toLowerCase()
  
  if (typeStr.includes('insect') || typeStr.includes('fumiga')) {
      objetivo = 'controlar insectos rastreros y voladores.'
      productoPrincipal = 'insecticida líquido'
  } else if (typeStr.includes('rat') || typeStr.includes('roedor')) {
      objetivo = 'controlar y erradicar roedores.'
      productoPrincipal = 'rodenticida'
  } else if (typeStr.includes('infec')) {
      objetivo = 'eliminar microorganismos y patógenos.'
      productoPrincipal = 'desinfectante'
  }

  const diagnosisText = `Se realizó aplicación de ${productoPrincipal} a zonas: ${areasTrabajadas}. Con el objetivo de ${objetivo}`

  // 3. Asset Loading
  const logoData = config?.logo_url ? await getImgData(config.logo_url) : null
  const firmaData = firma_tecnico ? await getImgData(firma_tecnico) : null

  return {
    ...params,
    normalized: {
      evidences,
      tipoPlagaTitle,
      diagnosisText,
      logoData,
      firmaData,
      fechaEjecucion: orden.fecha_completada || orden.fecha_programada || new Date().toLocaleDateString()
    }
  }
}
