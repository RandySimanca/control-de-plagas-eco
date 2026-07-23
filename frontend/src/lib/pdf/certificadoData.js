import { getAuthImageUrl } from '../../utils/imageUtils'
import { parseTipoPlaga } from '../../utils/tipoPlaga'

/**
 * Utilidad para obtener y convertir una URL de imagen a base64
 */
export async function getImgData(url) {
  if (!url) return null
  
  if (typeof url === 'string' && url.startsWith('data:')) {
    return url
  }

  const finalUrl = getAuthImageUrl(url)
  if (!finalUrl) return null

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
    console.error('Error al obtener la imagen:', url, '->', finalUrl, err)
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
    ...fotos.map(f => ({ url: f.url, label: f.descripcion, type: 'ambiente', created_at: f.created_at })),
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
  const parsedTipos = parseTipoPlaga(orden.tipo_plaga);
  const tipoPlagaTitle = parsedTipos.length > 0 ? parsedTipos.join(', ') : 'Control de Plagas'
  
  let areasTrabajadas = 'todas las áreas del establecimiento';
  if (orden.areas_intervenidas) {
    try {
      const parsedAreas = JSON.parse(orden.areas_intervenidas);
      if (Array.isArray(parsedAreas)) {
        const uniqueAreas = [...new Set(parsedAreas.map(a => a.area))];
        areasTrabajadas = uniqueAreas.join(', ').toLowerCase();
      }
    } catch {
      areasTrabajadas = orden.areas_intervenidas.toLowerCase();
    }
  }
  
  let diagnosisText = '';
  
  if (params.productos && params.productos.length > 0) {
    const productosPorTipo = params.productos.reduce((acc, p) => {
      const tipo = p.tipo_producto ? p.tipo_producto.toLowerCase() : 'control general';
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(p);
      return acc;
    }, {});
    
    const parrafos = [];
    let isFirst = true;

    for (const [tipo, prods] of Object.entries(productosPorTipo)) {
      const descripcionesProductos = prods.map(p => {
        const nombre = p.nombre_comercial || p.nombre_producto || 'producto';
        const ia = p.ingrediente_activo ? ` (ingrediente activo: ${p.ingrediente_activo})` : '';
        const dosis = p.dosis ? `, con una dosis de ${p.dosis}` : '';
        const cantidad = p.cantidad ? ` y una cantidad aplicada de ${p.cantidad}` : '';
        return `${nombre}${ia}${dosis}${cantidad}`;
      }).join(' y ');

      const conector = isFirst ? 'Se realizaron las actividades de' : 'Asimismo, se ejecutaron las actividades de';
      const areasStr = isFirst ? `en las siguientes zonas: ${areasTrabajadas}` : 'en las mismas áreas';
      
      parrafos.push(`${conector} ${tipo} ${areasStr}, utilizando ${descripcionesProductos}, conforme a la trazabilidad de productos registrada.`);
      isFirst = false;
    }
    
    parrafos.push("Las aplicaciones se realizaron siguiendo las recomendaciones técnicas del fabricante, empleando los equipos adecuados y garantizando la cobertura de los puntos críticos identificados durante la inspección.");
    
    diagnosisText = parrafos.join('\n\n');
  } else {
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

    diagnosisText = `Se realizó aplicación de ${productoPrincipal} a las siguientes zonas: ${areasTrabajadas}. Con el objetivo de ${objetivo}`
  }

  // 3. Carga de recursos (imágenes)
  const logoData = config?.logo_url ? await getImgData(config.logo_url) : null
  
  // Intentar la firma del certificado primero, luego usar la firma del perfil del técnico como respaldo
  const signatureUrl = firma_tecnico || orden.profiles?.firma_url
  const firmaData = signatureUrl ? await getImgData(signatureUrl) : null

  const formatFecha = (f) => f ? new Date(f + (f.includes('T') ? '' : 'T12:00:00Z')).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  
  const fInicioRaw = orden.fecha_inicio;
  const fFinRaw = orden.fecha_completada;
  
  const fInicio = formatFecha(fInicioRaw);
  const fFin = formatFecha(fFinRaw);
  
  let fechaEjecucion = '';
  if (fInicioRaw && fFinRaw && fInicio !== fFin) {
    fechaEjecucion = `Inicio: ${fInicio} - Fin: ${fFin}`;
  } else if (fFinRaw) {
    fechaEjecucion = fFin;
  } else if (fInicioRaw) {
    fechaEjecucion = `Inicio: ${fInicio}`;
  } else {
    fechaEjecucion = formatFecha(orden.fecha_programada) || new Date().toLocaleDateString();
  }

  // Procesar imágenes de tanques si existen
  let normalizedTanques = []
  if (params.tanques && params.tanques.length > 0) {
    normalizedTanques = await Promise.all(params.tanques.map(async (t) => {
      const fotoData = t.foto_url ? await getImgData(t.foto_url) : null
      
      const normalizedBitacora = await Promise.all((t.bitacora || []).map(async (b) => {
        const normalizedFotos = await Promise.all((b.fotos || []).map(async (f) => {
          const imgData = await getImgData(f.url)
          return { ...f, data: imgData }
        }))
        return { ...b, fotos: normalizedFotos }
      }))

      return {
        ...t,
        fotoData,
        bitacora: normalizedBitacora
      }
    }))
  }

  return {
    ...params,
    normalized: {
      evidences,
      tipoPlagaTitle,
      diagnosisText,
      logoData,
      firmaData,
      fechaEjecucion,
      tanques: normalizedTanques
    }
  }
}
