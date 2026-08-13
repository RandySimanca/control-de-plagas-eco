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
