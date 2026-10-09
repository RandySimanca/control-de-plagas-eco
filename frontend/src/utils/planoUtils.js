// Estaciones que se pueden mostrar/ubicar en un plano:
// las de su sede (o del cliente si el plano es global) que aún no estén en otro plano.
// Una estación ya ubicada en un plano queda ligada a él; para otro plano se instalan estaciones nuevas.
export function estacionesDelPlano (estaciones, plano, clienteId) {
  if (!plano) return []
  return (estaciones || []).filter(e => {
    const delAmbito = plano.sede_id ? e.sede_id === plano.sede_id : e.cliente_id === clienteId
    return delAmbito && (!e.plano_id || e.plano_id === plano.id)
  })
}
