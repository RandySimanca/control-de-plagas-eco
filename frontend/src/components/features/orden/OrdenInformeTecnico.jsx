import { useState, useEffect } from 'react'
import { FileText, ClipboardList, Loader2, Eye, ShieldCheck, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import RelevamientoModal from './RelevamientoModal'
import { abrirInformeTecnico } from '../../../lib/generarInformeTecnico'
import { puedeGenerarInforme, ESPECIES_DEFAULT, NIVELES_ACUMULACION } from '../../../utils/tipoVisitaConfig'
import { useConfig } from '../../../contexts/ConfigContext'
import { generateFolio } from '../../../utils/empresaUtils'

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
  const { nombreEmpresa } = useConfig()

  const canEdit = isAdmin && orden.estado === 'en_progreso'
  const informeGenerado = Boolean(relevamiento?.informe_generado_at)
  const informeAprobado = Boolean(relevamiento?.aprobado)

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

  async function handleGenerarInforme() {
    if (!puedeGenerarInforme(relevamiento)) {
      toast.error('El relevamiento debe tener especie, ubicación y diagnóstico completos')
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
            {informeGenerado && (
              <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                informeAprobado
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {informeAprobado
                  ? <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                  : <Clock className="w-5 h-5 shrink-0 mt-0.5" />}
                <div>
                  <p className="font-semibold">
                    {informeAprobado ? 'Informe aprobado y visible para el cliente' : 'Informe pendiente de aprobación'}
                  </p>
                  <p className="text-xs mt-0.5 opacity-80">
                    {informeAprobado
                      ? `Folio: ${relevamiento.folio || '—'} — Aprobado el ${relevamiento.fecha_aprobacion ? new Date(relevamiento.fecha_aprobacion).toLocaleDateString('es') : '—'}`
                      : 'Revise el PDF en el menú Certificados y apruebe para que el cliente pueda descargarlo.'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-dark-50 rounded-xl p-3">
                <p className="text-xs text-dark-400 font-medium uppercase tracking-wide mb-1">Estado relevamiento</p>
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
              {(relevamiento.area_afectada_valor || relevamiento.altura_estructura) && (
                <>
                  <div className="bg-dark-50 rounded-xl p-3">
                    <p className="text-xs text-dark-400 font-medium uppercase tracking-wide mb-1">Área Afectada</p>
                    <p className="font-medium text-dark-800">
                      {relevamiento.area_afectada_valor ? `${relevamiento.area_afectada_valor} ${relevamiento.area_afectada_unidad || 'm²'}` : '—'}
                    </p>
                  </div>
                  <div className="bg-dark-50 rounded-xl p-3">
                    <p className="text-xs text-dark-400 font-medium uppercase tracking-wide mb-1">Altura / Estructura</p>
                    <p className="font-medium text-dark-800">{relevamiento.altura_estructura || '—'}</p>
                  </div>
                </>
              )}
              {(relevamiento.nivel_acumulacion || relevamiento.riesgos) && (
                <>
                  <div className="bg-dark-50 rounded-xl p-3">
                    <p className="text-xs text-dark-400 font-medium uppercase tracking-wide mb-1">Nivel Acumulación</p>
                    <p className="font-medium text-dark-800">
                      {NIVELES_ACUMULACION.find(n => n.id === relevamiento.nivel_acumulacion)?.label || relevamiento.nivel_acumulacion || '—'}
                    </p>
                  </div>
                  <div className="bg-dark-50 rounded-xl p-3">
                    <p className="text-xs text-dark-400 font-medium uppercase tracking-wide mb-1">Riesgos y Dificultades</p>
                    <p className="font-medium text-dark-800">{relevamiento.riesgos || '—'}</p>
                  </div>
                </>
              )}
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
                onClick={handleGenerarInforme}
                disabled={downloading || !puedeGenerarInforme(relevamiento)}
                className="btn-primary text-sm flex-1 disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <><FileText className="w-4 h-4 inline mr-1" /> {informeGenerado ? 'Regenerar Informe PDF' : 'Generar Informe PDF'}</>
                )}
              </button>
            </div>

            {!puedeGenerarInforme(relevamiento) && (
              <p className="text-xs text-amber-600">
                Para generar el informe, el relevamiento debe incluir al menos especie, ubicación y diagnóstico.
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
