import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import {
  ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Calendar,
  ClipboardList, Building2, Home, Map, Plus, X, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { confirmDelete, successAlert } from '../lib/alerts'
import { parseTipoPlaga } from '../utils/tipoPlaga'
import HelpButton from '../components/features/HelpButton'
import { HELP_CONTENT } from '../lib/helpContent'

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [cliente, setCliente] = useState(null)
  const [ordenes, setOrdenes] = useState([])
  const [sedes, setSedes] = useState([])
  const [loading, setLoading] = useState(true)

  // Estado para modal/formulario de nueva Sede
  const [showSedeForm, setShowSedeForm] = useState(false)
  const [nuevaSede, setNuevaSede] = useState({ nombre: '', direccion: '', municipio: '' })
  const [savingSede, setSavingSede] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function load() {
    try {
      const token = localStorage.getItem('token')
      const [clienteRes, ordenesRes, sedesRes] = await Promise.all([
        api.get(`/clientes/${id}`, { token }),
        api.get('/servicios', { token, params: { cliente_id: id } }),
        api.get(`/clientes/${id}/sedes`, { token })
      ])
      setCliente(clienteRes.data)
      setOrdenes(ordenesRes.data || [])
      setSedes(sedesRes.data || [])
    } catch {
      toast.error('Error cargando cliente')
      navigate('/clientes')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    const isConfirmed = await confirmDelete('¿Estás seguro de eliminar este cliente?', 'Perderás el acceso directo a su información.')
    if (!isConfirmed) return
    try {
      const token = localStorage.getItem('token')
      // Marcamos como inactivo en lugar de borrar físicamente
      await api.patch(`/clientes/${id}`, { activo: false }, { token })
      await successAlert('Cliente eliminado', 'El cliente ha sido desactivado correctamente.')
      navigate('/clientes')
    } catch { toast.error('Error al eliminar') }
  }

  async function handleAddSede(e) {
    e.preventDefault()
    if (!nuevaSede.nombre.trim()) return toast.error('El nombre de la sede es obligatorio')

    setSavingSede(true)
    try {
      const token = localStorage.getItem('token')
      const { data } = await api.post(`/clientes/${id}/sedes`, nuevaSede, { token })
      setSedes(prev => [...prev, data])
      setShowSedeForm(false)
      setNuevaSede({ nombre: '', direccion: '', municipio: '' })
      toast.success('Sede creada correctamente')
    } catch (err) {
      toast.error('Error al crear sede: ' + err.message)
    } finally {
      setSavingSede(false)
    }
  }

  async function handleDeleteSede(sedeId) {
    const isConfirmed = await confirmDelete('¿Eliminar esta sede?', 'Esto no eliminará las estaciones ni órdenes, pero quedarán huérfanas de sede.')
    if (!isConfirmed) return

    try {
      const token = localStorage.getItem('token')
      await api.delete(`/clientes/${id}/sedes/${sedeId}`, { token })
      setSedes(prev => prev.filter(s => s.id !== sedeId))
      toast.success('Sede eliminada')
    } catch (err) {
      toast.error('Error al eliminar sede: ' + err.message)
    }
  }

  const estadoBadge = { programada: 'badge-programada', en_progreso: 'badge-en-progreso', completada: 'badge-completada' }
  const estadoLabel = { programada: 'Programada', en_progreso: 'En Progreso', completada: 'Completada' }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  if (!cliente) return null

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/clientes" className="inline-flex items-center gap-2 text-sm text-dark-500 hover:text-dark-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      {/* Client Info */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cliente.tipo === 'industrial' ? 'bg-orange-100' :
              cliente.tipo === 'comercial' ? 'bg-blue-100' : 'bg-purple-100'
              }`}>
              {cliente.tipo === 'industrial' || cliente.tipo === 'comercial'
                ? <Building2 className="w-7 h-7 text-orange-600" />
                : <Home className="w-7 h-7 text-purple-600" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-900">{cliente.nombre}</h1>
              <div className="flex gap-2 items-center mt-1">
                <span className={
                  cliente.tipo === 'industrial' ? 'badge-industrial' :
                    cliente.tipo === 'comercial' ? 'badge-blue' : 'badge-residencial'
                }>
                  {cliente.tipo}
                </span>
                {cliente.identificacion && (
                  <span className="text-xs font-mono text-dark-400">ID: {cliente.identificacion}</span>
                )}
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/clientes', { state: { openModal: id } })}
                className="btn-secondary text-sm"
              >
                <Edit className="w-4 h-4" /> Editar
              </button>
              <button onClick={handleDelete} className="btn-danger text-sm">
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-3">Datos Generales</h3>
            <div className="space-y-3">
              {cliente.razon_social && (
                <div className="text-sm font-medium text-dark-800">
                  <span className="text-dark-400 font-normal">Razón Social:</span> {cliente.razon_social}
                </div>
              )}
              {cliente.direccion && (
                <div className="flex items-start gap-2 text-sm text-dark-600">
                  <MapPin className="w-4 h-4 text-dark-400 shrink-0 mt-0.5" /> {cliente.direccion}
                </div>
              )}
              {cliente.telefono && (
                <div className="flex items-center gap-2 text-sm text-dark-600">
                  <Phone className="w-4 h-4 text-dark-400 shrink-0" /> {cliente.telefono}
                </div>
              )}
              {cliente.email && (
                <div className="flex items-center gap-2 text-sm text-dark-600">
                  <Mail className="w-4 h-4 text-dark-400 shrink-0" /> {cliente.email}
                </div>
              )}
            </div>
          </div>

          <div className="bg-dark-50 p-4 rounded-xl border border-dark-100">
            <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-3">Contacto en Sitio</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-dark-100">
                  <Phone className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-dark-900">{cliente.nombre_contacto || 'No especificado'}</p>
                  <p className="text-xs text-dark-500">{cliente.telefono_contacto || 'Sin teléfono de contacto'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {cliente.notas && (
          <div className="mt-6 pt-6 border-t border-dark-100">
            <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">Notas</h3>
            <p className="text-sm text-dark-600 leading-relaxed">{cliente.notas}</p>
          </div>
        )}
      </div>

      {/* Sedes / Locaciones */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
              <Map className="w-5 h-5 text-primary-600" /> Sedes y Locaciones
            </h2>
            <HelpButton title="Sedes y Locaciones" content={HELP_CONTENT.sedes} />

          </div>



          {isAdmin && !showSedeForm && (
            <button onClick={() => setShowSedeForm(true)} className="btn-secondary text-sm">
              <Plus className="w-4 h-4" /> Agregar Sede
            </button>
          )}
        </div>

        {showSedeForm && (
          <form onSubmit={handleAddSede} className="bg-primary-50/50 p-4 rounded-xl border border-primary-100 mb-4 space-y-3">
            <h3 className="text-sm font-bold text-primary-800">Nueva Sede</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label-field">Nombre de la Sede</label>
                <input type="text" className="input-field bg-white" placeholder="Ej. Sede Norte" required value={nuevaSede.nombre} onChange={e => setNuevaSede({ ...nuevaSede, nombre: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Dirección</label>
                <input type="text" className="input-field bg-white" placeholder="Dirección física" value={nuevaSede.direccion} onChange={e => setNuevaSede({ ...nuevaSede, direccion: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Municipio/Ciudad</label>
                <input type="text" className="input-field bg-white" placeholder="Ej. Bogotá" value={nuevaSede.municipio} onChange={e => setNuevaSede({ ...nuevaSede, municipio: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={savingSede} className="btn-primary text-sm">
                {savingSede ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Sede'}
              </button>
              <button type="button" onClick={() => setShowSedeForm(false)} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </form>
        )}

        {sedes.length === 0 && !showSedeForm ? (
          <div className="text-center py-6 bg-dark-50 rounded-xl border border-dashed border-dark-200">
            <Map className="w-8 h-8 text-dark-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-dark-500">Este cliente no tiene sedes registradas</p>
            <p className="text-xs text-dark-400 mt-1">Si dejas el cliente sin sedes, todas las estaciones se manejarán de forma global.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sedes.map(sede => (
              <div key={sede.id} className="p-3 border rounded-xl bg-white hover:border-primary-200 hover:shadow-sm transition-all group flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-dark-900 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary-500" /> {sede.nombre}
                  </h4>
                  {(sede.direccion || sede.municipio) && (
                    <p className="text-xs text-dark-500 mt-1 ml-5.5">
                      {sede.direccion} {sede.direccion && sede.municipio ? '-' : ''} {sede.municipio}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <button onClick={() => handleDeleteSede(sede.id)} className="p-1.5 text-dark-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Eliminar sede">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service History */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-600" /> Historial de Servicios
          </h2>
          <Link to={`/ordenes/nueva?cliente=${id}`} className="btn-primary text-sm">Nueva Orden</Link>
        </div>
        {ordenes.length === 0 ? (
          <p className="text-dark-400 text-sm text-center py-8">Sin servicios registrados</p>
        ) : (
          <div className="space-y-3">
            {ordenes.map(o => (
              <Link key={o.id} to={`/ordenes/${o.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-dark-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dark-900">{o.fecha_programada}</p>
                    <p className="text-xs text-dark-400">{parseTipoPlaga(o.tipo_plaga).join(', ') || 'Sin especificar'} — {o.tecnico_nombre || 'Sin asignar'}</p>
                  </div>
                </div>
                <span className={estadoBadge[o.estado]}>{estadoLabel[o.estado]}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
