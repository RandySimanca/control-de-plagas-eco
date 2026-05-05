import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Calendar,
  ClipboardList, Building2, Home
} from 'lucide-react'
import toast from 'react-hot-toast'
import { confirmDelete, successAlert } from '../lib/alerts'

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [cliente, setCliente] = useState(null)
  const [ordenes, setOrdenes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const [clienteRes, ordenesRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('id', id).single(),
        supabase.from('ordenes_servicio').select(`*, profiles(nombre_completo)`).eq('cliente_id', id).order('fecha_programada', { ascending: false })
      ])
      if (clienteRes.error) throw clienteRes.error
      setCliente(clienteRes.data)
      setOrdenes(ordenesRes.data || [])
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
      await supabase.from('clientes').update({ activo: false }).eq('id', id)
      await successAlert('Cliente eliminado', 'El cliente ha sido desactivado correctamente.')
      navigate('/clientes')
    } catch { toast.error('Error al eliminar') }
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
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              cliente.tipo === 'industrial' ? 'bg-orange-100' : 
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
              <Link to={`/clientes/${id}/editar`} className="btn-secondary text-sm">
                <Edit className="w-4 h-4" /> Editar
              </Link>
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
                    <p className="text-xs text-dark-400">{o.tipo_plaga || 'Sin especificar'} — {o.profiles?.nombre_completo || 'Sin asignar'}</p>
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
