import { useState, useEffect } from 'react'
import { ClipboardList, ChevronRight, FileDown, Loader2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import RelevamientoModal from './RelevamientoModal'
import { puedeGenerarInforme, ESPECIES_DEFAULT } from '../../../utils/tipoVisitaConfig'
import { abrirInformeTecnico } from '../../../lib/generarInformeTecnico'
import { useConfig } from '../../../contexts/ConfigContext'
import { generateFolio } from '../../../utils/empresaUtils'

export default function OrdenRelevamientoHub({
  orden,
  relevamiento,
  setRelevamiento,
  canEdit,
  queuePhoto,
  queueOrExecute,
  isOnline
}) {
  const [showModal, setShowModal] = useState(false)
  const [especiesOpciones, setEspeciesOpciones] = useState(ESPECIES_DEFAULT)
  const [downloading, setDownloading] = useState(false)
  const { nombreEmpresa } = useConfig()

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

  const estadoLabel = relevamiento?.estado === 'completo' ? 'Completo ✓' : 'Borrador'
  const estadoClass = relevamiento?.estado === 'completo'
    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-400/40'
    : 'bg-white/20 text-white border-white/20'

  const informeGenerado = Boolean(relevamiento?.informe_generado_at)
  const informeAprobado = Boolean(relevamiento?.aprobado)

  async function handleGenerarInforme() {
    if (!puedeGenerarInforme(relevamiento)) {
      toast.error('Completa especie, ubicación y diagnóstico para generar el informe')
      return
    }
    setDownloading(true)
    try {
      const token = localStorage.getItem('token')
      const folio = relevamiento.folio || generateFolio(nombreEmpresa)
      const [{ data: config }, { data: informeActualizado }] = await Promise.all([
        api.get('/configuracion', { token }),
        api.post('/informes-tecnicos', { orden_id: orden.id, folio }, { token })
      ])

      setRelevamiento(informeActualizado)

      const cliente = orden.clientes || { nombre: orden.cliente_nombre }
      const tecnico = orden.profiles || {}

      await abrirInformeTecnico({
        orden,
        cliente,
        relevamiento: informeActualizado,
        config,
        tecnico,
        folio: informeActualizado.folio
      })

      toast.success(informeGenerado
        ? 'Informe regenerado. Pendiente de aprobación del administrador.'
        : 'Informe generado. Pendiente de aprobación del administrador.')
    } catch (err) {
      toast.error('Error al generar informe: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tarjeta Relevamiento */}
        <div
          onClick={() => setShowModal(true)}
          className="group cursor-pointer bg-gradient-to-br from-indigo-600 to-violet-800 rounded-3xl p-5 text-white shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] border border-indigo-400/30"
        >
          <div className="absolute right-3 top-3 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                <ClipboardList className="w-6 h-6" />
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm border ${estadoClass}`}>
                {estadoLabel}
              </span>
            </div>
            <h4 className="text-lg font-black tracking-tight">Relevamiento</h4>
            <p className="text-xs text-white/80 mt-1 line-clamp-2">
              Cargar diagnóstico, evidencia fotográfica y solución propuesta.
            </p>
          </div>
          <div className="pt-4 flex items-center justify-between border-t border-white/15 mt-3">
            <span className="text-xs font-bold group-hover:underline">Abrir relevamiento</span>
            <div className="w-7 h-7 rounded-full bg-white/20 group-hover:bg-white text-white group-hover:text-indigo-900 flex items-center justify-center transition-all">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Tarjeta Informe Técnico */}
        <div
          onClick={handleGenerarInforme}
          className={`group cursor-pointer bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl p-5 text-white shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] border border-slate-500/30 ${!puedeGenerarInforme(relevamiento) ? 'opacity-70' : ''}`}
        >
          <div className="absolute right-3 top-3 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                {downloading ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileDown className="w-6 h-6" />}
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm border ${
                informeAprobado
                  ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
                  : informeGenerado
                    ? 'bg-amber-500/30 text-amber-200 border-amber-400/40'
                    : 'bg-white/20 text-white border-white/20'
              }`}>
                {informeAprobado ? 'Aprobado' : informeGenerado ? 'En revisión' : 'PDF'}
              </span>
            </div>
            <h4 className="text-lg font-black tracking-tight">Informe Técnico</h4>
            <p className="text-xs text-white/80 mt-1 line-clamp-2">
              {informeGenerado && !informeAprobado
                ? 'Enviado al administrador para revisión antes de publicarlo al cliente.'
                : 'Generar informe presentable al cliente con firma del técnico.'}
            </p>
          </div>
          <div className="pt-4 flex items-center justify-between border-t border-white/15 mt-3">
            <span className="text-xs font-bold group-hover:underline">
              {!puedeGenerarInforme(relevamiento)
                ? 'Datos incompletos'
                : informeGenerado
                  ? 'Regenerar informe'
                  : 'Generar informe'}
            </span>
            <div className="w-7 h-7 rounded-full bg-white/20 group-hover:bg-white text-white group-hover:text-slate-900 flex items-center justify-center transition-all">
              {informeGenerado && !informeAprobado
                ? <Clock className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />}
            </div>
          </div>
        </div>
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
