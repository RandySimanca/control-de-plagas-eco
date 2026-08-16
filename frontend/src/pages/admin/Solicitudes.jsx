import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  ClipboardList, Calendar, Clock, 
  CheckCircle2, XCircle, Send, Plus, ArrowRight, User, Trash2,
  Search, ExternalLink, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { confirmDelete, successAlert } from '../../lib/alerts'
import HelpButton from '../../components/features/HelpButton'
import { HELP_CONTENT } from '../../lib/helpContent'
import { formatFecha } from '../../utils/dateUtils'
import { buildDescripcionCotizacionFromRelevamiento, ESTADO_SOLICITUD_LABELS, calcCotizacionConVisita, formatPrecioCol, tieneDesgloseVisita, buildCondicionesVisitaDefault } from '../../utils/solicitudUtils'

const EMPTY_COTIZACION = {
  precioBruto: '',
  descripcion: '',
  costoVisita: '',
  descontarVisita: true
}

export default function Solicitudes() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todas')
  const [selectedSol, setSelectedSol] = useState(null)
  const [relevamientoInfo, setRelevamientoInfo] = useState(null)
  const [loadingRelevamiento, setLoadingRelevamiento] = useState(false)
  
  const [cotizando, setCotizando] = useState(false)
  const [cotizacion, setCotizacion] = useState({ ...EMPTY_COTIZACION })

  const [enviandoCondiciones, setEnviandoCondiciones] = useState(false)
  const [condicionesForm, setCondicionesForm] = useState({ texto: '', costo: '' })

  useEffect(() => {
    if (profile) loadSolicitudes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, profile])

  useEffect(() => {
    async function loadRelevamiento() {
      if (!selectedSol?.orden_visita_id) {
        setRelevamientoInfo(null)
        return
      }
      setLoadingRelevamiento(true)
      try {
        const token = localStorage.getItem('token')
        const { data } = await api.get(`/ordenes/${selectedSol.orden_visita_id}/relevamiento`, { token })
        setRelevamientoInfo(data)
      } catch {
        setRelevamientoInfo(null)
      } finally {
        setLoadingRelevamiento(false)
      }
    }
    loadRelevamiento()
  }, [selectedSol?.id, selectedSol?.orden_visita_id])

  async function loadSolicitudes() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const { data } = await api.get('/solicitudes-servicio', { token, params: { filter } })
      setSolicitudes(data || [])
    } catch (err) {
      console.error('Error cargando solicitudes:', err)
      toast.error('No se pudieron cargar las solicitudes')
    } finally {
      setLoading(false)
    }
  }

  async function iniciarCotizacion(sol) {
    setCotizando(true)
    let descripcion = ''
    let costoVisita = sol.costo_visita_tecnica ? String(sol.costo_visita_tecnica) : ''

    try {
      const token = localStorage.getItem('token')
      if (sol.orden_visita_id) {
        const [relRes, ordenRes] = await Promise.all([
          api.get(`/ordenes/${sol.orden_visita_id}/relevamiento`, { token }),
          api.get(`/ordenes/${sol.orden_visita_id}`, { token })
        ])
        descripcion = buildDescripcionCotizacionFromRelevamiento(relRes.data)
        if (ordenRes.data?.costo_visita_tecnica) {
          costoVisita = String(ordenRes.data.costo_visita_tecnica)
        }
      }
    } catch {
      // usar valores por defecto
    }

    setCotizacion({
      precioBruto: '',
      descripcion,
      costoVisita,
      descontarVisita: Number(costoVisita) > 0
    })
  }

  async function enviarCotizacion(e) {
    e.preventDefault()
    if (!cotizacion.precioBruto || !cotizacion.descripcion) {
      return toast.error('Ingresa el precio y la descripción de la cotización')
    }

    const tieneCostoVisita = Number(cotizacion.costoVisita) > 0 && cotizacion.descontarVisita
    const desglose = calcCotizacionConVisita(cotizacion.precioBruto, cotizacion.costoVisita, cotizacion.descontarVisita)

    try {
      const token = localStorage.getItem('token')
      const payload = {
        estado: 'cotizada',
        descripcion_cotizacion: cotizacion.descripcion,
        precio_cotizacion: desglose.neto,
        precio_servicio_bruto: desglose.bruto
      }

      if (tieneCostoVisita) {
        payload.costo_visita_tecnica = desglose.costoVisita
        payload.descuento_visita_tecnica = desglose.descuento
      } else {
        payload.costo_visita_tecnica = null
        payload.descuento_visita_tecnica = null
      }

      await api.patch(`/solicitudes-servicio/${selectedSol.id}`, payload, { token })
      
      await successAlert('¡Enviada!', 'Cotización enviada al cliente')
      setCotizando(false)
      setSelectedSol(null)
      loadSolicitudes()
    } catch (err) {
      toast.error('Error al enviar cotización: ' + err.message)
    }
  }

  function iniciarCondiciones(sol) {
    setEnviandoCondiciones(true)
    setCondicionesForm({
      texto: buildCondicionesVisitaDefault(sol.tipo_servicio, 0),
      costo: ''
    })
  }

  function handleCostoChange(e) {
    const val = e.target.value.replace(/\D/g, '')
    setCondicionesForm(p => ({
      ...p,
      costo: val,
      texto: buildCondicionesVisitaDefault(selectedSol.tipo_servicio, val)
    }))
  }

  async function enviarCondiciones(e) {
    e.preventDefault()
    if (!condicionesForm.texto.trim()) {
      return toast.error('Ingresa las condiciones de la visita')
    }
    
    try {
      const token = localStorage.getItem('token')
      const payload = {
        estado: 'condiciones_enviadas',
        condiciones_visita: condicionesForm.texto,
        costo_visita_tecnica: condicionesForm.costo ? Number(condicionesForm.costo) : null
      }
      
      await api.patch(`/solicitudes-servicio/${selectedSol.id}`, payload, { token })
      
      await successAlert('¡Enviado!', 'Condiciones de visita enviadas al cliente')
      setEnviandoCondiciones(false)
      setSelectedSol(null)
      loadSolicitudes()
    } catch (err) {
      toast.error('Error al enviar condiciones: ' + err.message)
    }
  }

  async function handleDelete(id) {
    const isConfirmed = await confirmDelete('¿Estás seguro de eliminar esta solicitud?', 'Ya no aparecerá en el portal ni en este panel.')
    if (!isConfirmed) return
    
    try {
      const token = localStorage.getItem('token')
      await api.delete(`/solicitudes-servicio/${id}`, { token })
      
      await successAlert('¡Eliminada!', 'Solicitud eliminada')
      setSelectedSol(null)
      loadSolicitudes()
    } catch (err) {
      toast.error('Error al eliminar la solicitud: ' + err.message)
    }
  }

  function handleProgramarVisitaTecnica(sol) {
    navigate('/ordenes', {
      state: {
        openModal: true,
        prefill: {
          cliente_id: sol.cliente_id,
          tipo_plaga: sol.tipo_servicio,
          tipo_visita: 'tecnica',
          fecha_programada: sol.fecha_preferida || new Date().toISOString().split('T')[0],
          observaciones: '',
          solicitud_id: sol.id,
          solicitud_visita: true,
          direccion_servicio: sol.direccion || ''
        }
      }
    })
  }

  function handleConvertirAOrden(sol) {
    navigate('/ordenes', {
      state: {
        openModal: true,
        prefill: {
          cliente_id: sol.cliente_id,
          tipo_plaga: sol.tipo_servicio,
          tipo_visita: 'servicio',
          fecha_programada: sol.fecha_preferida || new Date().toISOString().split('T')[0],
          observaciones: '',
          solicitud_id: sol.id,
          solicitud_visita: false,
          orden_visita_origen_id: sol.orden_visita_id || null,
          direccion_servicio: sol.direccion || ''
        }
      }
    })
  }

  const badges = {
    pendiente: 'bg-amber-100 text-amber-700',
    condiciones_enviadas: 'bg-amber-100 text-amber-700',
    visita_aprobada: 'bg-emerald-100 text-emerald-800',
    en_evaluacion: 'bg-violet-100 text-violet-700',
    informe_disponible: 'bg-indigo-100 text-indigo-700',
    cotizacion_solicitada: 'bg-indigo-100 text-indigo-700',
    cotizada: 'bg-blue-100 text-blue-700',
    aceptada: 'bg-green-100 text-green-700',
    rechazada: 'bg-red-100 text-red-700',
    convertida: 'bg-emerald-100 text-emerald-800'
  }

  const filterLabels = {
    todas: 'Todas',
    pendiente: 'Pendientes',
    condiciones_enviadas: 'Condiciones Enviadas',
    visita_aprobada: 'Visita Aprobada',
    en_evaluacion: 'En evaluación',
    informe_disponible: 'Informe Disponible',
    cotizacion_solicitada: 'Cotización Solicitada',
    cotizada: 'Cotizadas',
    aceptada: 'Aceptadas',
    historial: 'Historial'
  }

  const relevamientoCompleto = relevamientoInfo?.estado === 'completo'
  const cotizacionDesglose = calcCotizacionConVisita(
    cotizacion.precioBruto,
    cotizacion.costoVisita,
    cotizacion.descontarVisita
  )
  const cotizacionTieneCostoVisita = Number(cotizacion.costoVisita) > 0 && cotizacion.descontarVisita

  function DesgloseCotizacion({ sol }) {
    if (!tieneDesgloseVisita(sol)) {
      return (
        <p className="text-2xl font-black text-blue-900 mb-1">${formatPrecioCol(sol.precio_cotizacion)}</p>
      )
    }
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-blue-700">Valor del servicio</span>
          <span className="font-bold text-blue-900">${formatPrecioCol(sol.precio_servicio_bruto)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-blue-700">Visita técnica realizada</span>
          <span className="font-bold text-blue-900">${formatPrecioCol(sol.costo_visita_tecnica)}</span>
        </div>
        <div className="flex justify-between gap-4 text-emerald-700">
          <span>Descuento por visita técnica</span>
          <span className="font-bold">-${formatPrecioCol(sol.descuento_visita_tecnica)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-2 border-t border-blue-200 text-base">
          <span className="font-bold text-blue-900">Total si acepta</span>
          <span className="text-2xl font-black text-blue-900">${formatPrecioCol(sol.precio_cotizacion)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Solicitudes de Servicio</h1>
            <HelpButton title="Solicitudes de Servicio" content={HELP_CONTENT.solicitudes} />
          </div>
          <p className="page-subtitle">Gestiona los requerimientos de tus clientes</p>
        </div>
      </div>

      <div className="flex gap-1 bg-white p-1 rounded-xl border border-dark-200 mb-6 w-fit h-fit overflow-x-auto max-w-full">
        {['todas', 'pendiente', 'condiciones_enviadas', 'visita_aprobada', 'en_evaluacion', 'informe_disponible', 'cotizacion_solicitada', 'cotizada', 'aceptada', 'historial'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === f ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' : 'text-dark-500 hover:bg-dark-50'
            }`}
          >
            {filterLabels[f] || f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card text-center py-20 animate-pulse">
          <ClipboardList className="w-16 h-16 text-primary-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-dark-400">Buscando solicitudes...</h3>
          <p className="text-dark-300">Conectando con el servidor</p>
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="card text-center py-20">
          <ClipboardList className="w-16 h-16 text-dark-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-dark-900">No hay solicitudes</h3>
          <p className="text-dark-500">No se encontraron solicitudes en este estado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {solicitudes.map((sol) => (
            <div 
              key={sol.id} 
              className={`card border-2 transition-all cursor-pointer group ${
                selectedSol?.id === sol.id ? 'border-primary-500 ring-4 ring-primary-50' : 'border-dark-100 hover:border-primary-200'
              }`}
              onClick={() => {
                setSelectedSol(sol)
                setCotizando(false)
                setEnviandoCondiciones(false)
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${badges[sol.estado] || badges.pendiente}`}>
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-dark-900 line-clamp-1">{sol.clientes?.nombre}</h3>
                    <p className="text-xs text-dark-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(sol.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badges[sol.estado] || badges.pendiente}`}>
                  {ESTADO_SOLICITUD_LABELS[sol.estado] || sol.estado}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wide mb-1">Servicio Solicitado</p>
                  <p className="text-sm font-semibold text-dark-800">{sol.tipo_servicio}</p>
                </div>
                
                <div>
                  <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wide mb-1">Problema Reportado</p>
                  <p className="text-sm text-dark-600 line-clamp-2">{sol.descripcion}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-dark-100">
                  <div className="flex flex-col">
                    <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wide">Fecha sugerida</p>
                    <p className="text-xs font-bold text-primary-600">
                      {formatFecha(sol.fecha_preferida, undefined, 'Por definir')}
                    </p>
                  </div>
                  <ArrowRight className={`w-5 h-5 text-dark-300 transition-transform ${selectedSol?.id === sol.id ? 'translate-x-1 text-primary-500' : ''}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-dark-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${badges[selectedSol.estado] || badges.pendiente}`}>
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-dark-900">Detalle de Solicitud</h2>
                  <p className="text-xs text-dark-500">ID: {selectedSol.id.split('-')[0]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDelete(selectedSol.id)}
                  className="p-2 hover:bg-red-50 rounded-xl transition-colors text-red-500 tooltip-trigger"
                  title="Eliminar Solicitud"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setSelectedSol(null)}
                  className="p-2 hover:bg-dark-50 rounded-xl transition-colors"
                >
                  <XCircle className="w-6 h-6 text-dark-300" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-dark-50 p-6 rounded-2xl">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-dark-400 uppercase tracking-widest flex items-center gap-1.5"><User className="w-3 h-3" /> Cliente</p>
                  <p className="font-bold text-dark-900">{selectedSol.clientes?.nombre}</p>
                  <p className="text-xs text-dark-500">{selectedSol.direccion || selectedSol.clientes?.direccion}</p>
                  <p className="text-xs text-dark-500">{selectedSol.clientes?.telefono}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-dark-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Estado y Fecha</p>
                  <p className="font-bold text-primary-600">{ESTADO_SOLICITUD_LABELS[selectedSol.estado] || selectedSol.estado}</p>
                  <p className="text-xs text-dark-500 italic">Creada: {new Date(selectedSol.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-black text-dark-900 mb-1">Servicio Solicitado</h4>
                  <div className="inline-block px-3 py-1 bg-primary-50 text-primary-700 rounded-lg text-sm font-bold">
                    {selectedSol.tipo_servicio}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-black text-dark-900 mb-1">Descripción del Problema</h4>
                  <p className="text-sm text-dark-700 bg-white border border-dark-100 p-4 rounded-xl leading-relaxed">
                    {selectedSol.descripcion}
                  </p>
                </div>
              </div>

              {/* Pendiente: cotizar directo o enviar condiciones */}
              {selectedSol.estado === 'pendiente' && !cotizando && !enviandoCondiciones && (
                <div className="space-y-3">
                  <button 
                    onClick={() => iniciarCotizacion(selectedSol)}
                    className="btn-primary w-full py-4 rounded-2xl gap-2 text-base"
                  >
                    <Send className="w-5 h-5" /> Cotizar directamente
                  </button>
                  <button 
                    onClick={() => iniciarCondiciones(selectedSol)}
                    className="w-full py-4 rounded-2xl gap-2 text-base font-bold flex items-center justify-center border-2 border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 transition-colors"
                  >
                    <Search className="w-5 h-5" /> Enviar condiciones de visita técnica
                  </button>
                  <p className="text-xs text-dark-500 text-center px-2">
                    Si no está claro el alcance del servicio, envía las condiciones para realizar una visita técnica antes de cotizar.
                  </p>
                </div>
              )}

              {enviandoCondiciones && (
                <form onSubmit={enviarCondiciones} className="p-6 border-2 border-violet-100 rounded-2xl space-y-4 bg-violet-50/30 animate-in slide-in-from-bottom-4">
                  <h4 className="text-base font-black text-violet-900 flex items-center gap-2">
                    <Search className="w-5 h-5" /> Condiciones de Visita Técnica
                  </h4>
                  <p className="text-xs text-violet-700 bg-white/60 p-3 rounded-xl border border-violet-100">
                    Define si la visita tendrá costo. Este valor se descontará automáticamente si el cliente contrata el servicio.
                  </p>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="label-field text-violet-700">Costo de visita ($) (Opcional)</label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        className="input-field border-violet-200 focus:border-violet-500 bg-white" 
                        placeholder="Ej: 80.000"
                        value={condicionesForm.costo ? Number(condicionesForm.costo).toLocaleString('es-CO') : ''}
                        onChange={handleCostoChange}
                      />
                    </div>
                    <div>
                      <label className="label-field text-violet-700">Texto de condiciones al cliente</label>
                      <textarea 
                        className="input-field min-h-[140px] border-violet-200 focus:border-violet-500 bg-white resize-none"
                        value={condicionesForm.texto}
                        onChange={e => setCondicionesForm({ ...condicionesForm, texto: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setEnviandoCondiciones(false)} className="btn-secondary flex-1 py-3">Cancelar</button>
                    <button type="submit" className="w-full flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-violet-600/20">
                      Enviar al Cliente
                    </button>
                  </div>
                </form>
              )}

              {selectedSol.estado === 'condiciones_enviadas' && (
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 space-y-3">
                  <p className="text-sm text-amber-800 font-bold">Condiciones de visita técnica enviadas</p>
                  <p className="text-xs text-amber-700 bg-white/60 p-3 rounded-xl border border-amber-100 whitespace-pre-wrap">
                    {selectedSol.condiciones_visita}
                  </p>
                  <p className="text-[10px] text-amber-500 uppercase font-bold tracking-widest mt-2">
                    Esperando respuesta del cliente...
                  </p>
                </div>
              )}

              {selectedSol.estado === 'visita_aprobada' && (
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 space-y-4">
                  <div className="flex items-center gap-3 text-emerald-800">
                    <CheckCircle2 className="w-6 h-6" />
                    <div>
                      <p className="font-bold">Condiciones Aceptadas</p>
                      <p className="text-sm opacity-90">El cliente aceptó las condiciones de la visita técnica.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleProgramarVisitaTecnica(selectedSol)}
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <Calendar className="w-6 h-6" /> Programar Visita Técnica
                  </button>
                </div>
              )}

              {/* En evaluación: estado de visita y relevamiento */}
              {selectedSol.estado === 'en_evaluacion' && (
                <div className="bg-violet-50 p-6 rounded-2xl border border-violet-200 space-y-4">
                  <div className="flex items-start gap-3">
                    <Search className="w-6 h-6 text-violet-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-violet-900">Visita técnica en curso</p>
                      <p className="text-sm text-violet-700 mt-1">
                        El técnico debe completar el relevamiento antes de enviar la cotización al cliente.
                      </p>
                    </div>
                  </div>

                  {selectedSol.orden_visita_id && (
                    <button
                      type="button"
                      onClick={() => navigate(`/ordenes/${selectedSol.orden_visita_id}`)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-violet-200 text-violet-800 font-bold text-sm hover:bg-violet-100/50 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Ver visita técnica
                    </button>
                  )}

                  {loadingRelevamiento ? (
                    <div className="flex items-center gap-2 text-sm text-violet-600">
                      <Loader2 className="w-4 h-4 animate-spin" /> Consultando relevamiento...
                    </div>
                  ) : relevamientoInfo ? (
                    <div className="bg-white p-4 rounded-xl border border-violet-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-violet-600 uppercase">Relevamiento</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          relevamientoCompleto ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {relevamientoCompleto ? 'Completado ✓' : 'Pendiente'}
                        </span>
                      </div>
                      {relevamientoInfo.especies?.length > 0 && (
                        <p className="text-sm text-dark-700">
                          <span className="font-semibold">Especies:</span> {relevamientoInfo.especies.join(', ')}
                        </p>
                      )}
                      {relevamientoInfo.diagnostico && (
                        <p className="text-sm text-dark-600 line-clamp-3">{relevamientoInfo.diagnostico}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-violet-600">Aún no hay datos de relevamiento.</p>
                  )}

                  {selectedSol.costo_visita_tecnica && Number(selectedSol.costo_visita_tecnica) > 0 && (
                    <p className="text-xs text-violet-700">
                      Costo de visita técnica registrado: <strong>${formatPrecioCol(selectedSol.costo_visita_tecnica)}</strong>
                      (se descontará si el cliente acepta el servicio).
                    </p>
                  )}

                  {!cotizando && relevamientoCompleto && (
                    <p className="text-sm font-bold text-violet-800 bg-white p-3 rounded-xl text-center border border-violet-100">
                      El relevamiento está completo. Aprueba el informe técnico en los detalles de la visita para poder cotizar.
                    </p>
                  )}

                  {!cotizando && !relevamientoCompleto && relevamientoInfo && (
                    <p className="text-xs text-violet-600 text-center">
                      Completa el relevamiento en la visita técnica para habilitar la cotización.
                    </p>
                  )}
                </div>
              )}

              {selectedSol.estado === 'informe_disponible' && (
                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-200 space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-indigo-900">Informe técnico publicado</p>
                      <p className="text-sm text-indigo-700 mt-1">
                        El informe técnico ya está disponible para el cliente. Estamos a la espera de que el cliente lo revise y acepte para solicitar formalmente la cotización desde su portal.
                      </p>
                    </div>
                  </div>
                  {selectedSol.orden_visita_id && (
                    <button
                      type="button"
                      onClick={() => navigate(`/ordenes/${selectedSol.orden_visita_id}`)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-indigo-200 text-indigo-800 font-bold text-sm hover:bg-indigo-100/50 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Ver visita técnica y relevamiento
                    </button>
                  )}
                </div>
              )}

              {selectedSol.estado === 'cotizacion_solicitada' && (
                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-200 space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-indigo-900">El cliente solicita cotización</p>
                      <p className="text-sm text-indigo-700 mt-1">
                        El cliente ha revisado y aceptado el informe técnico. Ahora puedes enviar la cotización final del servicio.
                      </p>
                    </div>
                  </div>
                  {selectedSol.orden_visita_id && (
                    <button
                      type="button"
                      onClick={() => navigate(`/ordenes/${selectedSol.orden_visita_id}`)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-indigo-200 text-indigo-800 font-bold text-sm hover:bg-indigo-100/50 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Ver visita técnica y relevamiento
                    </button>
                  )}
                  {!cotizando && (
                    <button
                      onClick={() => iniciarCotizacion(selectedSol)}
                      className="btn-primary w-full py-4 rounded-2xl gap-2 text-base"
                    >
                      <Send className="w-5 h-5" /> Enviar cotización al cliente
                    </button>
                  )}
                </div>
              )}

              {cotizando && (
                <form onSubmit={enviarCotizacion} className="p-6 border-2 border-primary-100 rounded-2xl space-y-4 bg-primary-50/30 animate-in slide-in-from-bottom-4">
                  <h4 className="text-base font-black text-primary-900 flex items-center gap-2">
                    <Send className="w-5 h-5" /> Preparar Cotización
                  </h4>
                  {selectedSol.orden_visita_id && relevamientoCompleto && (
                    <p className="text-xs text-primary-700 bg-white/60 p-3 rounded-xl border border-primary-100">
                      La descripción se prellenó desde el relevamiento técnico. Revisa el valor del servicio y los detalles antes de enviar.
                    </p>
                  )}
                  {cotizacionTieneCostoVisita && (
                    <p className="text-xs text-violet-700 bg-violet-50 p-3 rounded-xl border border-violet-100">
                      Visita técnica con costo de <strong>${formatPrecioCol(cotizacion.costoVisita)}</strong>.
                      Si el cliente acepta el servicio, ese valor se descontará automáticamente.
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="label-field text-primary-700">
                        {cotizacionTieneCostoVisita ? 'Valor del servicio ($)' : 'Precio ($)'}
                      </label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        className="input-field border-primary-200 focus:border-primary-500 bg-white" 
                        placeholder="Ej: 800.000"
                        value={cotizacion.precioBruto ? Number(cotizacion.precioBruto).toLocaleString('es-CO') : ''}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '')
                          setCotizacion({ ...cotizacion, precioBruto: val })
                        }}
                      />
                    </div>
                    {cotizacionTieneCostoVisita && cotizacionDesglose.bruto > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-primary-100 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-dark-600">Valor del servicio</span>
                          <span className="font-bold">${formatPrecioCol(cotizacionDesglose.bruto)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-600">Visita técnica</span>
                          <span className="font-bold">${formatPrecioCol(cotizacionDesglose.costoVisita)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700">
                          <span>Descuento visita técnica</span>
                          <span className="font-bold">-${formatPrecioCol(cotizacionDesglose.descuento)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-dark-100 font-bold text-primary-900">
                          <span>Total al aceptar</span>
                          <span className="text-lg">${formatPrecioCol(cotizacionDesglose.neto)}</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="label-field text-primary-700">Detalles de la oferta</label>
                      <textarea 
                        className="input-field min-h-[140px] border-primary-200 focus:border-primary-500 bg-white resize-none"
                        placeholder="Describe qué incluye el servicio y términos..."
                        value={cotizacion.descripcion}
                        onChange={e => setCotizacion({ ...cotizacion, descripcion: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setCotizando(false)} className="btn-secondary flex-1 py-3">Cancelar</button>
                    <button type="submit" className="btn-primary flex-1 py-3">Enviar al Cliente</button>
                  </div>
                </form>
              )}

              {selectedSol.estado === 'aceptada' && (
                <div className="bg-green-50 p-6 rounded-2xl border border-green-200 space-y-4">
                  <div className="flex items-center gap-3 text-green-800">
                    <CheckCircle2 className="w-6 h-6" />
                    <div>
                      <p className="font-bold">¡Cotización Aceptada!</p>
                      <p className="text-sm opacity-90">El cliente ha dado el visto bueno para proceder.</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-green-100 space-y-3">
                    <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Precio Acordado</p>
                    <DesgloseCotizacion sol={selectedSol} />
                  </div>
                  {selectedSol.orden_visita_id && (
                    <p className="text-xs text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Incluye evaluación técnica previa (visita registrada)
                    </p>
                  )}
                  <button 
                    onClick={() => handleConvertirAOrden(selectedSol)}
                    className="w-full bg-green-600 text-white hover:bg-green-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-all"
                  >
                    <Plus className="w-6 h-6" /> Crear Orden de Servicio
                  </button>
                </div>
              )}

              {selectedSol.estado === 'cotizada' && (
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 space-y-3">
                  <p className="text-sm text-blue-800 font-bold">Cotización en revisión por el cliente:</p>
                  <DesgloseCotizacion sol={selectedSol} />
                  <p className="text-xs text-blue-600 italic">{selectedSol.descripcion_cotizacion}</p>
                  {tieneDesgloseVisita(selectedSol) && (
                    <p className="text-xs text-violet-700 bg-violet-50/80 p-3 rounded-xl border border-violet-100">
                      Si el cliente no acepta el servicio, solo se factura la visita técnica (${formatPrecioCol(selectedSol.costo_visita_tecnica)}).
                    </p>
                  )}
                  <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest">
                    Esperando respuesta...
                  </p>
                </div>
              )}

              {selectedSol.estado === 'rechazada' && Number(selectedSol.costo_visita_tecnica) > 0 && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                  <p className="text-sm font-bold text-amber-900">Visita técnica pendiente de cobro</p>
                  <p className="text-xs text-amber-800 mt-1">
                    El cliente rechazó el servicio. Facturar visita técnica: <strong>${formatPrecioCol(selectedSol.costo_visita_tecnica)}</strong>
                  </p>
                </div>
              )}

              {selectedSol.estado === 'convertida' && (
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 space-y-3">
                  <div>
                    <p className="text-emerald-800 font-bold">Solicitud Convertida</p>
                    <p className="text-xs text-emerald-600">Esta solicitud ya tiene una orden de servicio operativa.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSol.orden_id && (
                      <button 
                        onClick={() => navigate(`/ordenes/${selectedSol.orden_id}`)}
                        className="btn-secondary text-xs bg-white"
                      >
                        Ver orden de servicio
                      </button>
                    )}
                    {selectedSol.orden_visita_id && (
                      <button 
                        onClick={() => navigate(`/ordenes/${selectedSol.orden_visita_id}`)}
                        className="btn-secondary text-xs bg-white"
                      >
                        Ver visita técnica
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
