import { getAuthImageUrl } from '../../utils/imageUtils'
import { parseTipoPlaga } from '../../utils/tipoPlaga'
import { parseDescripcion, buildDescripcion } from '../../utils/actividadTemplates'
import { getImgData } from './utils/imageUtils'

/**
 * Prepara y normaliza todos los datos necesarios para el Informe General de Actividades PDF
 * Anteriormente conocido como prepareCertificadoData
 */
export async function prepareInformeActividadesData(params) {
  const { 
    orden, 
    estaciones = [], 
    config, 
    fotos = [], 
    firma_tecnico 
  } = params

  // 1. Normalizar Fotos y Evidencias (convirtiendo a Base64 para incluir el token y evitar problemas async en el renderer)
  const rawEvidences = [
    ...fotos.map(f => {
      const parsed = parseDescripcion(f.descripcion)
      // Generamos solo el prefijo (sin el detalle)
      let shortLabel = f.descripcion
      if (parsed.tipo) {
        shortLabel = buildDescripcion(parsed.tipoControl, parsed.tipo, parsed.area, '')
      }
      return { 
        url: f.url, 
        label: shortLabel, 
        type: 'ambiente', 
        created_at: f.created_at,
        full_descripcion: f.descripcion 
      }
    })
  ]

  // Mapear fotos múltiples de estaciones
  estaciones.forEach(e => {
    if (e.fotos && e.fotos.length > 0) {
      e.fotos.forEach((f, idx) => {
        rawEvidences.push({
          url: f.url,
          label: `${e.tipo_estacion}${e.es_nueva_instalacion ? ' (Nueva Instalación)' : ''} - Foto ${idx + 1}`,
          type: 'estacion'
        })
      })
    }
  })

  const evidences = await Promise.all(rawEvidences.map(async (ev) => {
    const data = await getImgData(ev.url)
    return { ...ev, data }
  }))

  // 2. Textos dinámicos según el tipo de plaga
  const parsedTipos = parseTipoPlaga(orden.tipo_plaga);
  const tipoPlagaTitle = parsedTipos.length > 0 ? parsedTipos.join(', ') : 'Control de Plagas'
  
  // --- Derivar áreas desde la bitácora de actividades ---
  // Estructura: { 'Desinsectación': Set(['Cocina', 'Baños']), 'Lavado de Tanques': Set(['Tanque Elevado']) }
  const areasPorTipoMap = {};

  // 2a. Áreas desde bitácora general (actividades)
  const actividades = params.actividades || [];
  actividades.forEach(act => {
    const parsed = parseDescripcion(act.descripcion);
    if (parsed.tipoControl && parsed.area) {
      const tc = parsed.tipoControl;
      if (!areasPorTipoMap[tc]) areasPorTipoMap[tc] = new Set();
      areasPorTipoMap[tc].add(parsed.area);
    }
  });

  // 2b. Áreas desde tanques (Lavado de Tanques)
  const tanquesParam = params.tanques || [];
  tanquesParam.forEach(t => {
    const tipoTanque = t.tipo_tanque || 'Tanque';
    const key = 'Lavado de Tanques';
    if (!areasPorTipoMap[key]) areasPorTipoMap[key] = new Set();
    areasPorTipoMap[key].add(tipoTanque);
  });

  // Convertir Sets a arrays
  const areasPorTipo = Object.fromEntries(
    Object.entries(areasPorTipoMap).map(([k, v]) => [k, [...v]])
  );

  // Fallback legacy para la sección 4 (diagnosis)
  let areasTrabajadas = 'todas las áreas del establecimiento';

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

      // Buscar las áreas específicas para este tipo de control desde la bitácora
      let areasForTipo = areasTrabajadas; // fallback
      const tipoKey = Object.keys(areasPorTipo).find(
        k => k.toLowerCase() === tipo.toLowerCase()
      );
      if (tipoKey && areasPorTipo[tipoKey].length > 0) {
        areasForTipo = areasPorTipo[tipoKey].join(', ').toLowerCase();
      }

      const conector = isFirst ? 'Se realizaron las actividades de' : 'Asimismo, se ejecutaron las actividades de';
      const areasStr = `en las siguientes zonas: ${areasForTipo}`;
      
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
  
  // Intentar la firma del informe primero, luego usar la firma del perfil del técnico como respaldo
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

  const tecnicoNombre = orden.profiles?.nombre_completo || orden.tecnico_nombre || 'TÉCNICO OPERATIVO';

  return {
    ...params,
    normalized: {
      evidences,
      tipoPlagaTitle,
      diagnosisText,
      logoData,
      firmaData,
      fechaEjecucion,
      tanques: normalizedTanques,
      areasPorTipo,
      tecnicoNombre
    }
  }
}