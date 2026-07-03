/**
 * Utilidad para obtener y convertir una URL de imagen a base64
 */
export async function getImgData(url) {
  if (!url) return null
  
  // Asegurar URL absoluta
  let finalUrl = url
  if (!url.startsWith('http') && !url.startsWith('data:')) {
    const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '').replace(/\/$/, '')
    finalUrl = `${API_BASE}/uploads/${url.replace(/^\//, '')}`
  }

  // Agregar token para evitar autenticación en el backend
  if (finalUrl.includes('/uploads/')) {
    const token = localStorage.getItem('token');
    if (token && !finalUrl.includes('token=')) {
      const separator = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${separator}token=${token}`;
    }
  }

  try {
    const res = await fetch(finalUrl)
    if (!res.ok) throw new Error(`Error HTTP! status: ${res.status}`)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.error('Error al obtener la imagen:', finalUrl, err)
    return null
  }
}

/**
 * Prepara y normaliza todos los datos necesarios para el informe PDF
 */
export async function prepareCertificadoData(params) {
  const { 
    orden, 
    estaciones = [], 
    config, 
    fotos = [], 
    firma_tecnico 
  } = params

  // 1. Normalizar Fotos y Evidencias (convirtiendo a Base64 para incluir el token y evitar problemas async en el renderer)
  const rawEvidences = [
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

  const evidences = await Promise.all(rawEvidences.map(async (ev) => {
    const data = await getImgData(ev.url)
    return { ...ev, data }
  }))

  // 2. Textos dinámicos según el tipo de plaga
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

  const diagnosisText = `Se realizó aplicación de ${productoPrincipal} a las siguientes zonas: ${areasTrabajadas}. Con el objetivo de ${objetivo}`

  // 3. Carga de recursos (imágenes)
  const logoData = config?.logo_url ? await getImgData(config.logo_url) : null
  
  // Intentar la firma del certificado primero, luego usar la firma del perfil del técnico como respaldo
  const signatureUrl = firma_tecnico || orden.profiles?.firma_url
  const firmaData = signatureUrl ? await getImgData(signatureUrl) : null

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
