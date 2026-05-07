import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import {
  Users, ClipboardList, CheckCircle2, UserCog, Plus, ArrowRight, Calendar,
  Settings, FilePlus
} from 'lucide-react'

export default function Dashboard() {
  const { profile, isAdmin } = useAuth()
  const [stats, setStats] = useState({ clientes: 0, pendientes: 0, completadas: 0, tecnicos: 0 })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDashboard() {
    try {
      const token = localStorage.getItem('token')
      const [clientesRes, serviciosRes, perfilesRes] = await Promise.all([
        api.get('/clientes', { token }),
        api.get('/servicios', { token }),
        api.get('/profiles', { token })
      ])

      const clientes = clientesRes.data || []
      const servicios = serviciosRes.data || []
      const perfiles = perfilesRes.data || []

      const clientesActivos = clientes.filter(c => c.activo).length
      const tecnicosActivos = perfiles.filter(p => p.rol === 'tecnico' && p.activo).length

      const ordenesFiltrados = (!isAdmin && profile?.id)
        ? servicios.filter(s => s.tecnico_id === profile.id)
        : servicios

      const pendientes = ordenesFiltrados.filter(o => ['programada', 'en_progreso'].includes(o.estado)).length
      const completadas = ordenesFiltrados.filter(o => o.estado === 'completada').length

      const recent = [...ordenesFiltrados]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
        .map(o => ({
          id: o.id,
          clientes: { nombre: o.cliente_nombre },
          profiles: { nombre_completo: o.tecnico_nombre },
          fecha_programada: o.fecha_programada,
          estado: o.estado,
          tipo_plaga: o.tipo_plaga
        }))

      setStats({ clientes: clientesActivos, pendientes, completadas, tecnicos: tecnicosActivos })
      setRecentOrders(recent)
    } catch (err) {
      console.error('Error cargando dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Clientes Activos', value: stats.clientes, Icon: Users, color: 'bg-blue-100 text-blue-600', adminOnly: true },
    { label: 'Órdenes Pendientes', value: stats.pendientes, Icon: ClipboardList, color: 'bg-amber-100 text-amber-600' },
    { label: 'Completadas', value: stats.completadas, Icon: CheckCircle2, color: 'bg-green-100 text-green-600' },
    { label: 'Técnicos Activos', value: stats.tecnicos, Icon: UserCog, color: 'bg-purple-100 text-purple-600', adminOnly: true },
  ].filter(card => isAdmin || !card.adminOnly)

  const estadoBadge = {
    programada: 'badge-programada',
    en_progreso: 'badge-en-progreso',
    completada: 'badge-completada',
  }

  const estadoLabel = {
    programada: 'Programada',
    en_progreso: 'En Progreso',
    completada: 'Completada',
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">¡Hola, {profile?.nombre?.split(' ')[0]}! </h1>
          <p className="page-subtitle">
            {isAdmin ? 'Resumen de tu sistema de control de plagas' : 'Tus tareas para hoy'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link to="/clientes" state={{ openModal: true }} className="btn-secondary text-sm">
              <Plus className="w-4 h-4" /> Nuevo Cliente
            </Link>
            <Link to="/ordenes" state={{ openModal: true }} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Nueva Orden
            </Link>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4 mb-8`}>
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className={`stat-icon ${card.color}`}>
              <card.Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-900">{card.value}</p>
              <p className="text-xs text-dark-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link to="/admin/configuracion" className="card hover:shadow-lg transition-all border border-dark-100 group">
            <Settings className="w-8 h-8 text-primary-600 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-dark-900">Configuración</h3>
            <p className="text-sm text-dark-500">Ajustes del sistema</p>
          </Link>
          <Link to="/admin/documentos" className="card hover:shadow-lg transition-all border border-dark-100 group">
            <FilePlus className="w-8 h-8 text-primary-600 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-dark-900">Documentos Legales</h3>
            <p className="text-sm text-dark-500">Permisos y resoluciones</p>
          </Link>
        </div>
      )}

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-900">Órdenes Recientes</h2>
          <Link to="/ordenes" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-dark-400 text-sm py-8 text-center">No hay órdenes registradas</p>
        ) : (
          <div className="space-y-3">
            {recentOrders.map(order => (
              <Link
                key={order.id}
                to={`/ordenes/${order.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-dark-50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-dark-900 truncate">
                      {order.clientes?.nombre}
                    </p>
                    <p className="text-xs text-dark-400">
                      {order.tipo_plaga || 'Sin especificar'} • {order.fecha_programada}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={estadoBadge[order.estado]}>{estadoLabel[order.estado]}</span>
                  <ArrowRight className="w-4 h-4 text-dark-300 group-hover:text-primary-600 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
