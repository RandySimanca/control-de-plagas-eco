import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import {
  Users, ClipboardList, CheckCircle2, UserCog, Plus, ArrowRight, Calendar,
  Settings, FilePlus
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import HelpButton from '../components/features/HelpButton'
import { HELP_CONTENT } from '../lib/helpContent'
import { useConfig } from '../contexts/ConfigContext'

export default function Dashboard() {
  const { profile, isAdmin } = useAuth()
  const { nombreEmpresa } = useConfig()
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
      const [clientesRes, ordenesRes, perfilesRes] = await Promise.all([
        api.get('/clientes', { token }),
        api.get('/servicios', { token }), // Keeping URL for compatibility
        api.get('/profiles', { token })
      ])

      const clientes = clientesRes.data || []
      const ordenes = ordenesRes.data || []
      const perfiles = perfilesRes.data || []

      const clientesActivos = clientes.filter(c => c.activo).length
      const tecnicosActivos = perfiles.filter(p => p.rol === 'tecnico' && p.activo).length

      const ordenesFiltrados = (!isAdmin && profile?.id)
        ? ordenes.filter(s => s.tecnico_id === profile.id)
        : ordenes

      const pendientes = ordenesFiltrados.filter(o => ['pendiente', 'programada', 'en_proceso', 'en_progreso'].includes(o.estado)).length
      const completadas = ordenesFiltrados.filter(o => ['terminado', 'completada'].includes(o.estado)).length

      const recent = [...ordenesFiltrados]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)

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

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completada':
      case 'terminado': return 'success'
      case 'en_progreso':
      case 'en_proceso': return 'primary'
      default: return 'warning'
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      programada: 'Programada',
      pendiente: 'Pendiente',
      en_progreso: 'En Progreso',
      en_proceso: 'En Proceso',
      completada: 'Completada',
      terminado: 'Terminado'
    }
    return labels[status] || status
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  const primerNombre = profile?.nombre_completo?.split(' ')[0] || 'Usuario'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title font-bold text-3xl text-dark-900">¡Hola, {primerNombre}! </h1>
            <HelpButton title="Dashboard" content={HELP_CONTENT.dashboard} />
          </div>
          <p className="page-subtitle text-dark-500 mt-1">
            {isAdmin ? `Resumen general de ${nombreEmpresa}` : 'Tus tareas asignadas para hoy'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
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
          <div key={card.label} className="stat-card bg-white p-5 rounded-2xl border border-dark-100 shadow-sm flex items-center gap-4">
            <div className={`stat-icon w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
              <card.Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-900">{card.value}</p>
              <p className="text-xs text-dark-500 font-medium uppercase tracking-wider">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link to="/admin/configuracion" className="card p-6 bg-white rounded-2xl border border-dark-100 hover:shadow-lg transition-all group">
            <Settings className="w-8 h-8 text-primary-600 mb-3 group-hover:rotate-45 transition-transform" />
            <h3 className="font-bold text-dark-900">Configuración</h3>
            <p className="text-sm text-dark-500">Personaliza tu empresa y reportes</p>
          </Link>
          <Link to="/admin/documentos" className="card p-6 bg-white rounded-2xl border border-dark-100 hover:shadow-lg transition-all group">
            <FilePlus className="w-8 h-8 text-primary-600 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-dark-900">Documentos Legales</h3>
            <p className="text-sm text-dark-500">Resoluciones y permisos sanitarios</p>
          </Link>
        </div>
      )}

      {/* Recent Orders */}
      <div className="card bg-white p-6 rounded-2xl border border-dark-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-600" /> Órdenes Recientes
          </h2>
          <Link to="/ordenes" className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 transition-colors">
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {recentOrders.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-dark-200 mx-auto mb-3" />
            <p className="text-dark-400 text-sm">No hay órdenes registradas recientemente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map(order => (
              <Link
                key={order.id}
                to={`/ordenes/${order.id}`}
                className="flex items-center justify-between p-4 rounded-2xl hover:bg-dark-50 transition-all border border-transparent hover:border-dark-100 group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition-colors">
                    <Calendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-dark-900 truncate">
                      {order.cliente_nombre}
                    </p>
                    <p className="text-xs text-dark-400 font-medium">
                      {order.tipo_plaga || 'Servicio general'} • {order.fecha_programada ? new Date(order.fecha_programada).toLocaleDateString() : 'Sin fecha'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={getStatusVariant(order.estado)}>
                    {getStatusLabel(order.estado)}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-dark-300 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
