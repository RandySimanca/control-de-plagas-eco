import { useState, useEffect } from 'react'
import { FileText, ClipboardList, Loader2, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import RelevamientoModal from './RelevamientoModal'
import { descargarInformeTecnico } from '../../../lib/generarInformeTecnico'
import { puedeGenerarInforme, ESPECIES_DEFAULT } from '../../../utils/tipoVisitaConfig'

export default function OrdenInformeTecnico({
  orden,
  relevamiento,
  setRelevamiento,
  isAdmin,
  queuePhoto,
  queueOrExecute
}) {
  const [showModal, setShowModal] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [especiesOpciones, setEspeciesOpciones] = useState(ESPECIES_DEFAULT)

  const canEdit = isAdmin && orden.estado === 'en_progreso'

  useEffect(() => {
    async function loadEspecies() {
      try {
        const token = localStorage.getItem('token')
        const { data } = await api.get('/configuracion', { token })
        if (data?.especies_causantes?.length) {
          setEspeciesOpciones(data.especies_causantes)
        }
      } catch {
        // usar defaults
      }
    }
    loadEspecies()
  }, [])

  async function handleDownload() {
    if (!puedeGenerarInforme(relevamiento)) {
      toast.error('El relevamiento debe tener especie, ubicación y diagnóstico completos')
      return
    }
    setDownloading(true)
    try {
      const token = localStorage.getItem('token')
      const { data: config } = await api.get('/configuracion', { token })
      const cliente = orden.clientes || { nombre: orden.cliente_nombre }
      const tecnico = orden.profiles || {}

      await descargarInformeTecnico({ orden, cliente, relevamiento, config, tecnico })
      toast.success('Informe técnico descargado')
    } catch (err) {
      toast.error('Error al generar informe: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  const estado = relevamiento?.estado || 'sin_datos'
  const especies = (relevamiento?.especies || []).join(', ') || '—'

  return (
    <>
      <div className="card mt-6">
        <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-indigo-600" /> Informe Técnico de Relevamiento
        </h2>

        {!relevamiento ? (
          <div className="text-sm text-dark-500 bg-dark-50 rounded-xl p-4 border border-dashed border-dark-200">
            Aún no hay datos de relevamiento cargados para esta visita técnica.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-dark-50 rounded-xl p-3">
                <p className="text-xs text-dark-400 font-medium uppercase tracking-wide mb-1">Estado</p>
                <p className={`font-semibold ${estado === 'completo' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {estado === 'completo' ? 'Completo' : estado === 'borrador' ? 'Borrador' : 'Sin datos'}
                </p>
              </div>
              <div className="bg-dark-50 rounded-xl p-3">
                <p className="text-xs text-dark-400 font-medium uppercase tracking-wide mb-1">Especies</p>
                <p className="font-medium text-dark-800">{especies}</p>
              </div>
              <div className="bg-dark-50 rounded-xl p-3 sm:col-span-2">
                <p className="text-xs text-dark-400 font-medium uppercase tracking-wide mb-1">Ubicación</p>
                <p className="font-medium text-dark-800">{relevamiento.ubicacion || '—'}</p>
              </div>
              {relevamiento.diagnostico && (
                <div className="bg-dark-50 rounded-xl p-3 sm:col-span-2">
                  <p className="text-xs text-dark-400 font-medium uppercase tracking-wide mb-1">Diagnóstico</p>
                  <p className="text-dark-700 line-clamp-3">{relevamiento.diagnostico}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="btn-secondary text-sm flex-1"
              >
                <Eye className="w-4 h-4 inline mr-1" />
                {canEdit ? 'Ver / Editar relevamiento' : 'Ver relevamiento'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || !puedeGenerarInforme(relevamiento)}
                className="btn-primary text-sm flex-1 disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <><FileText className="w-4 h-4 inline mr-1" /> Descargar Informe PDF</>
                )}
              </button>
            </div>

            {!puedeGenerarInforme(relevamiento) && (
              <p className="text-xs text-amber-600">
                Para descargar el informe, el relevamiento debe incluir al menos especie, ubicación y diagnóstico.
              </p>
            )}
          </div>
        )}

        {!relevamiento && isAdmin && orden.estado === 'en_progreso' && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn-primary mt-4 text-sm"
          >
            <ClipboardList className="w-4 h-4 inline mr-1" /> Cargar relevamiento
          </button>
        )}
      </div>

      <RelevamientoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        ordenId={orden.id}
        relevamiento={relevamiento}
        setRelevamiento={setRelevamiento}
        especiesOpciones={especiesOpciones}
        canEdit={canEdit}
        queuePhoto={queuePhoto}
        queueOrExecute={queueOrExecute}
      />
    </>
  )
}
