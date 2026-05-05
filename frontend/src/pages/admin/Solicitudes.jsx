import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { 
  ClipboardList, Search, Filter, Calendar, Clock, 
  CheckCircle2, XCircle, Send, Plus, ArrowRight, User, Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { confirmDelete, successAlert } from '../../lib/alerts'

export default function Solicitudes() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todas')
  const [selectedSol, setSelectedSol] = useState(null)
  
  // Estado para el formulario de cotización
  const [cotizando, setCotizando] = useState(false)
  const [cotizacion, setCotizacion] = useState({
    precio: '',
    descripcion: ''
  })

  useEffect(() => {
    if (profile?.empresa_id) loadSolicitudes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, profile])

  async function loadSolicitudes() {
    try {
      setLoading(true)
      let query = supabase
        .from('solicitudes_servicio')
        .select('*, clientes(nombre, direccion, telefono)')
        .order('created_at', { ascending: false })

      if (filter !== 'todas') {
        if (filter === 'historial') {
          query = query.in('estado', ['rechazada', 'convertida'])
        } else {
          query = query.eq('estado', filter)
        }
      }

      const { data, error } = await query
      if (error) {
        console.error('Error detallado:', JSON.stringify(error))
        throw error
      }
      setSolicitudes(data || [])
    } catch (err) {
      console.error('Error cargando solicitudes:', err)
      toast.error('No se pudieron cargar las solicitudes')
    } finally {
      setLoading(false)
    }
  }

  async function enviarCotizacion(e) {
    e.preventDefault()
    if (!cotizacion.precio || !cotizacion.descripcion) {
      return toast.error('Ingresa el precio y la descripción de la cotización')
    }

    try {
      const { error } = await supabase
        .from('solicitudes_servicio')
        .update({
          estado: 'cotizada',
          cotizacion_precio: Number(cotizacion.precio),
          cotizacion_descripcion: cotizacion.descripcion,
          cotizacion_fecha: new Date().toISOString(),
          cotizacion_leida_por_cliente: false
        })
        .eq('id', selectedSol.id)

      if (error) throw error
      await successAlert('¡Enviada!', 'Cotización enviada al cliente')
      setCotizando(false)
      setSelectedSol(null)
      loadSolicitudes()
    } catch {
      toast.error('Error al enviar cotización')
    }
  }

  async function handleDelete(id) {
    const isConfirmed = await confirmDelete('¿Estás seguro de eliminar esta solicitud?', 'Ya no aparecerá en el portal ni en este panel.')
    if (!isConfirmed) return
    
    try {
      const { error } = await supabase.from('solicitudes_servicio').delete().eq('id', id)
      if (error) throw error
      await successAlert('¡Eliminada!', 'Solicitud eliminada')
      setSelectedSol(null)
      loadSolicitudes()
    } catch {
      toast.error('Error al eliminar la solicitud')
    }
  }

  function handleConvertirAOrden(sol) {
    // Navigar a la página de órdenes con estado para abrir el modal
    navigate('/ordenes', {
      state: {
        openModal: true,
        prefill: {
          cliente_id: sol.cliente_id,
          tipo_plaga: sol.tipo_servicio,
          fecha_programada: sol.fecha_preferida || new Date().toISOString().split('T')[0],
          observaciones: `Solicitud originada por el cliente: ${sol.descripcion}. \nCotización aceptada: $${sol.cotizacion_precio}.`,
          solicitud_id: sol.id
        }
      }
    })
  }

  const badges = {
    pendiente: 'bg-amber-100 text-amber-700',
    cotizada: 'bg-blue-100 text-blue-700',
    aceptada: 'bg-green-100 text-green-700',
    rechazada: 'bg-red-100 text-red-700',
    convertida: 'bg-emerald-100 text-emerald-800'
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Solicitudes de Servicio</h1>
          <p className="page-subtitle">Gestiona los requerimientos de tus clientes</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 bg-white p-1 rounded-xl border border-dark-200 mb-6 w-fit h-fit overflow-x-auto max-w-full">
        {['todas', 'pendiente', 'cotizada', 'aceptada', 'historial'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize whitespace-nowrap ${
              filter === f ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' : 'text-dark-500 hover:bg-dark-50'
            }`}
          >
            {f === 'historial' ? 'Historial' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
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
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${badges[sol.estado]}`}>
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-dark-900 line-clamp-1">{sol.clientes?.nombre}</h3>
                    <p className="text-xs text-dark-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(sol.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badges[sol.estado]}`}>
                  {sol.estado}
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
                      {sol.fecha_preferida ? new Date(sol.fecha_preferida).toLocaleDateString() : 'Por definir'}
                    </p>
                  </div>
                  <ArrowRight className={`w-5 h-5 text-dark-300 transition-transform ${selectedSol?.id === sol.id ? 'translate-x-1 text-primary-500' : ''}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Panel de Detalle */}
      {selectedSol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-dark-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${badges[selectedSol.estado]}`}>
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
              {/* Información del Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-dark-50 p-6 rounded-2xl">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-dark-400 uppercase tracking-widest flex items-center gap-1.5"><User className="w-3 h-3" /> Cliente</p>
                  <p className="font-bold text-dark-900">{selectedSol.clientes?.nombre}</p>
                  <p className="text-xs text-dark-500">{selectedSol.direccion || selectedSol.clientes?.direccion}</p>
                  <p className="text-xs text-dark-500">{selectedSol.clientes?.telefono}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-dark-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Estado y Fecha</p>
                  <p className="font-bold capitalize text-primary-600">{selectedSol.estado}</p>
                  <p className="text-xs text-dark-500 italic">Creada: {new Date(selectedSol.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Contenido de la solicitud */}
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

              {/* Sección de Cotización */}
              {selectedSol.estado === 'pendiente' && !cotizando && (
                <button 
                  onClick={() => setCotizando(true)}
                  className="btn-primary w-full py-4 rounded-2xl gap-2 text-base"
                >
                  <Send className="w-5 h-5" /> Iniciar Cotización
                </button>
              )}

              {cotizando && (
                <form onSubmit={enviarCotizacion} className="p-6 border-2 border-primary-100 rounded-2xl space-y-4 bg-primary-50/30 animate-in slide-in-from-bottom-4">
                  <h4 className="text-base font-black text-primary-900 flex items-center gap-2">
                    <Send className="w-5 h-5" /> Preparar Cotización
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="label-field text-primary-700">Precio Sugerido ($)</label>
                      <input 
                        type="number" 
                        className="input-field border-primary-200 focus:border-primary-500 bg-white" 
                        placeholder="Ej: 150000"
                        value={cotizacion.precio}
                        onChange={e => setCotizacion({...cotizacion, precio: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="label-field text-primary-700">Detalles de la oferta</label>
                      <textarea 
                        className="input-field min-h-[100px] border-primary-200 focus:border-primary-500 bg-white resize-none"
                        placeholder="Describe qué incluye el servicio y términos..."
                        value={cotizacion.descripcion}
                        onChange={e => setCotizacion({...cotizacion, descripcion: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setCotizando(false)} className="btn-secondary flex-1 py-3">Cancelar</button>
                    <button type="submit" className="btn-primary flex-1 py-3">Enviar al Cliente</button>
                  </div>
                </form>
              )}

              {/* Botón para convertir en Orden si ya está aceptada */}
              {selectedSol.estado === 'aceptada' && (
                <div className="bg-green-50 p-6 rounded-2xl border border-green-200 space-y-4">
                  <div className="flex items-center gap-3 text-green-800">
                    <CheckCircle2 className="w-6 h-6" />
                    <div>
                      <p className="font-bold">¡Cotización Aceptada!</p>
                      <p className="text-sm opacity-90">El cliente ha dado el visto bueno para proceder.</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-green-100">
                    <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Precio Acordado</p>
                    <p className="text-2xl font-black text-green-900">${Number(selectedSol.cotizacion_precio).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => handleConvertirAOrden(selectedSol)}
                    className="w-full bg-green-600 text-white hover:bg-green-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-all"
                  >
                    <Plus className="w-6 h-6" /> Crear Orden de Servicio
                  </button>
                </div>
              )}

              {selectedSol.estado === 'cotizada' && (
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
                  <p className="text-sm text-blue-800 font-bold mb-2">Cotización en revisión por el cliente:</p>
                  <p className="text-2xl font-black text-blue-900 mb-1">${Number(selectedSol.cotizacion_precio).toLocaleString()}</p>
                  <p className="text-xs text-blue-600 italic">{selectedSol.cotizacion_descripcion}</p>
                  <p className="text-[10px] text-blue-400 mt-4 uppercase font-bold tracking-widest">
                    Esperando respuesta...
                  </p>
                </div>
              )}

              {selectedSol.estado === 'convertida' && (
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <p className="text-emerald-800 font-bold">Solicitud Convertida</p>
                    <p className="text-xs text-emerald-600">Esta solicitud ya es una orden de servicio activa.</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/ordenes/${selectedSol.orden_id}`)}
                    className="btn-secondary text-xs bg-white"
                  >
                    Ver Orden
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
