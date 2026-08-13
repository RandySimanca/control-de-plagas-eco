import { getImgData } from './certificadoData'

export async function prepareInformeTecnicoData(params) {
  const { orden, cliente, relevamiento, config, tecnico } = params

  const logoData = await getImgData(config?.logo_url)
  const firmaData = await getImgData(tecnico?.firma_url)

  const fotos = await Promise.all((relevamiento?.fotos || []).map(async (f) => ({
    ...f,
    data: await getImgData(f.url)
  })))

  const direccion = orden?.direccion_servicio || cliente?.direccion || 'N/A'
  const fechaVisita = orden?.fecha_programada
    ? new Date(orden.fecha_programada).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('es-CO')

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
