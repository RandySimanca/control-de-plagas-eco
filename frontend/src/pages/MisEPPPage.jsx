import { useState, useEffect } from 'react'
import { ShieldCheck, X, Loader2, AlertCircle, Package2, Tag, Ruler } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import HelpButton from '../components/features/HelpButton'

function EppVencimientoBadge({ fecha }) {
  if (!fecha) return null
  const hoy = new Date()
  const vence = new Date(fecha)
  const diffDias = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))

  if (diffDias < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Vencido
      </span>
    )
  }
  if (diffDias <= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Vence pronto
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Vigente
    </span>
  )
}

function formatFechaCorta(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'short', day: '2-digit'
  })
}

export default function MisEPPPage() {
  const { profile } = useAuth()
  const [epps, setEpps] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEpp, setSelectedEpp] = useState(null)

  useEffect(() => {
    if (profile?.id) {
      loadEpp()
    }
  }, [profile?.id])

  const loadEpp = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await api.get(`/productos-tecnicos/epp/${profile.id}`, { token })
      setEpps(res.data || [])
    } catch {
      setEpps([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-8">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-black text-dark-900 tracking-tight flex items-center gap-2">
            Mis EPP Asignados
            <HelpButton title="Mis EPP" content="Consulta los equipos de protección personal que tienes a tu cargo." />
          </h1>
          <p className="text-dark-500 mt-1 text-[15px] font-medium">
            Equipos de Protección Personal vigentes a tu nombre.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : epps.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-dark-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-12 text-center">
          <ShieldCheck className="w-16 h-16 text-dark-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-dark-900 mb-2">No tienes EPP asignados</h3>
          <p className="text-dark-500 max-w-md mx-auto">
            El administrador puede asignarte equipos de protección desde el panel principal del inventario.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {epps.map(epp => (
            <div 
              key={epp.id} 
              onClick={() => setSelectedEpp(epp)}
              className="bg-white rounded-[24px] border border-dark-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center border border-violet-100 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-dark-900 truncate">{epp.nombre_comercial}</h3>
                  <p className="text-sm text-dark-500 truncate">
                    {[epp.marca, epp.modelo].filter(Boolean).join(' - ') || 'Sin especificar'}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm font-medium border-t border-dark-50 pt-4">
                <span className="text-dark-500">Cantidad Asignada:</span>
                <span className="text-dark-900 font-bold">{parseFloat(epp.cantidad_sacada || 0)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detalles */}
      {selectedEpp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full sm:rounded-2xl max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-dark-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-dark-900 leading-tight">Detalle EPP</h2>
                  <p className="text-xs text-dark-500">Información del equipo</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEpp(null)}
                className="p-2 text-dark-400 hover:text-dark-600 bg-dark-50 hover:bg-dark-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-4 sm:p-6 overflow-y-auto">
              <div className="mb-6 flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-xl font-black text-dark-900 mb-1">{selectedEpp.nombre_comercial}</h3>
                  {(selectedEpp.marca || selectedEpp.modelo) && (
                    <p className="text-sm font-medium text-dark-500">
                      {[selectedEpp.marca, selectedEpp.modelo].filter(Boolean).join(' — ')}
                    </p>
                  )}
                </div>
                <EppVencimientoBadge fecha={selectedEpp.fecha_vencimiento} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-dark-50 p-4 rounded-xl border border-dark-100">
                  <p className="text-xs font-semibold text-dark-500 mb-1">Fecha de Vencimiento</p>
                  <p className="font-bold text-dark-900">
                    {selectedEpp.fecha_vencimiento ? formatFechaCorta(selectedEpp.fecha_vencimiento) : 'N/A'}
                  </p>
                </div>
                <div className="bg-dark-50 p-4 rounded-xl border border-dark-100">
                  <p className="text-xs font-semibold text-dark-500 mb-1">Asignado el</p>
                  <p className="font-bold text-dark-900">
                    {selectedEpp.created_at ? formatFechaCorta(selectedEpp.created_at) : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {selectedEpp.codigo_activo && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-dark-500">Código de Activo</p>
                      <p className="font-bold text-dark-900 text-sm">{selectedEpp.codigo_activo}</p>
                    </div>
                  </div>
                )}
                {selectedEpp.lote && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                      <Package2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-dark-500">Lote</p>
                      <p className="font-bold text-dark-900 text-sm">{selectedEpp.lote}</p>
                    </div>
                  </div>
                )}
                {selectedEpp.unidad_base && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                      <Ruler className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-dark-500">Unidad de Medida</p>
                      <p className="font-bold text-dark-900 text-sm capitalize">{selectedEpp.unidad_base}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Uso */}
              {(() => {
                const sacada = parseFloat(selectedEpp.cantidad_sacada || 0)
                const usada = parseFloat(selectedEpp.cantidad_usada || 0)
                const disponible = Math.max(0, sacada - usada)
                const porcentajeUso = sacada > 0 ? Math.min(100, Math.round((usada / sacada) * 100)) : 0

                return (
                  <div className="bg-white border border-dark-200 rounded-xl p-4 mb-4 shadow-sm">
                    <h4 className="text-sm font-bold text-dark-900 mb-3">Resumen de Cantidades</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-medium text-dark-600">
                        <span>Asignado: <span className="font-bold text-dark-900">{sacada}</span></span>
                        <span>Usado: <span className="font-bold text-dark-900">{usada}</span></span>
                        <span>Disp: <span className="font-bold text-violet-700">{disponible}</span></span>
                      </div>
                      <div className="w-full h-2 bg-dark-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${porcentajeUso >= 90 ? 'bg-red-500' : porcentajeUso >= 60 ? 'bg-amber-500' : 'bg-violet-500'}`}
                          style={{ width: `${porcentajeUso}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })()}

              {selectedEpp.notas && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 shadow-sm">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">Notas de Asignación</h4>
                  <p className="text-sm text-amber-800 whitespace-pre-wrap leading-relaxed">{selectedEpp.notas}</p>
                </div>
              )}

              {/* Ficha seguridad */}
              {selectedEpp.ficha_seguridad_url && (
                <a
                  href={selectedEpp.ficha_seguridad_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 mt-4 p-3 rounded-xl bg-violet-50 text-sm font-bold text-violet-700 hover:bg-violet-100 transition-colors"
                >
                  <AlertCircle className="w-4 h-4" /> Ver ficha de seguridad
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}