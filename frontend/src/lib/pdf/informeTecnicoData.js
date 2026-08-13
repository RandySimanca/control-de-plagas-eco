import { getImgData } from './certificadoData'
import { formatFechaLarga } from '../../utils/dateUtils'

export async function prepareInformeTecnicoData(params) {
  const { orden, cliente, relevamiento, config, tecnico } = params

  const logoData = await getImgData(config?.logo_url)
  const firmaData = await getImgData(tecnico?.firma_url)

  const fotos = await Promise.all((relevamiento?.fotos || []).map(async (f) => ({
    ...f,
    data: await getImgData(f.url)
  })))

  const direccion = orden?.direccion_servicio || cliente?.direccion || 'N/A'
  const fechaVisita = formatFechaLarga(orden?.fecha_programada, false, new Date().toLocaleDateString('es-CO'))

  return {
    orden,
    cliente: { ...cliente, direccion },
    relevamiento,
    config,
    tecnico,
    normalized: {
      logoData,
      firmaData,
      fotos,
      fechaVisita,
      tecnicoNombre: tecnico?.nombre_completo || orden?.profiles?.nombre_completo || 'Técnico responsable'
    }
  }
}
