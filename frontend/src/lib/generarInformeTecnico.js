import { prepareInformeTecnicoData } from './pdf/informeTecnicoData'
import { renderInformeTecnico } from './pdf/informeTecnicoRenderer'

export async function generarInformeTecnico(params) {
  const data = await prepareInformeTecnicoData(params)
  return renderInformeTecnico(data)
}

export async function descargarInformeTecnico(params) {
  const doc = await generarInformeTecnico(params)
  const clienteNombre = params.cliente?.nombre || 'Cliente'
  const fileName = `Informe_Tecnico_${clienteNombre.replace(/\s+/g, '_')}_${Date.now()}.pdf`
  doc.save(fileName)
}

export async function abrirInformeTecnico(params) {
  const doc = await generarInformeTecnico(params)
  const clienteNombre = params.cliente?.nombre || 'Cliente'
  const folio = params.relevamiento?.folio || params.folio
  const suffix = folio ? folio.replace(/\s+/g, '_') : Date.now()
  const fileName = `Informe_Tecnico_${clienteNombre.replace(/\s+/g, '_')}_${suffix}.pdf`
  doc.save(fileName)
}
