import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useOffline } from '../contexts/OfflineContext'
import api from '../lib/api'
import db from '../lib/db'
import {
  Users, ClipboardList, CheckCircle2, UserCog, Plus, ArrowRight,
  Settings, FileText, TrendingUp, TrendingDown, Shield, WifiOff
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import { useConfig } from '../contexts/ConfigContext'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import HelpButton from '../components/features/HelpButton'
import { HELP_CONTENT } from '../lib/helpContent'
import { formatFecha } from '../utils/dateUtils'

const CACHE_KEY_DASHBOARD = 'dashboard_data'

export default function Dashboard() {
  const { profile, isAdmin } = useAuth()
  const { isOnline, lastSyncSuccess } = useOffline()
  const { nombreEmpresa } = useConfig()
  const [stats, setStats] = useState({
    clientes: 0, pendientes: 0, completadas: 0, tecnicos: 0,
    clientesGrowth: 0, ordenesCreadas: 0, ordenesCreadasGrowth: 0,
    completadasGrowth: 0, pendientesGrowth: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [isOfflineData, setIsOfflineData] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, lastSyncSuccess])

  async function loadDashboard() {
    try {
      let clientes = [], ordenes = [], perfiles = []

      if (isOnline) {
        const token = localStorage.getItem('token')
        const [clientesRes, ordenesRes, perfilesRes] = await Promise.all([
          api.get('/clientes', { token }),
          api.get('/servicios', { token }),
          api.get('/profiles', { token })
        ])
        clientes = clientesRes.data || []
        ordenes = ordenesRes.data || []
        perfiles = perfilesRes.data || []
        // Guardar en caché
        await db.cache_listas.put({
          clave: CACHE_KEY_DASHBOARD,
          data: { clientes, ordenes, perfiles },
          updated_at: Date.now()
        })
        setIsOfflineData(false)
      } else {
        // Sin conexión: leer desde caché
        const cached = await db.cache_listas.get(CACHE_KEY_DASHBOARD)
        if (cached?.data) {
          clientes = cached.data.clientes || []
          ordenes = cached.data.ordenes || []
          perfiles = cached.data.perfiles || []
          setIsOfflineData(true)
        } else {
          setIsOfflineData(true)
          return
        }
      }

      const clientesActivos = clientes.filter(c => c.activo).length
      const tecnicosActivos = perfiles.filter(p => p.rol === 'tecnico' && p.activo).length

      //para saber si es un tecnico o un admin quien esta logueado
      const ordenesFiltrados = (!isAdmin && profile?.id)
        ? ordenes.filter(s => s.tecnico_id === profile.id)
        : ordenes

      const pendientes = ordenesFiltrados.filter(o => ['programada', 'en_progreso'].includes(o.estado)).length
      const completadas = ordenesFiltrados.filter(o => o.estado === 'completada').length

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

      const isSameMonth = (dateStr, month, year) => {
        if (!dateStr) return false
        const d = new Date(dateStr)
        return d.getMonth() === month && d.getFullYear() === year
      }

      const calculateGrowth = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100)
      }

      const clientesActivosThisMonth = clientes.filter(c => c.activo && isSameMonth(c.created_at, currentMonth, currentYear)).length
      const clientesActivosLastMonth = clientes.filter(c => c.activo && isSameMonth(c.created_at, previousMonth, previousMonthYear)).length
      const clientesGrowth = calculateGrowth(clientesActivosThisMonth, clientesActivosLastMonth)

      const ordenesCreadasThisMonth = ordenesFiltrados.filter(o => isSameMonth(o.created_at, currentMonth, currentYear)).length
      const ordenesCreadasLastMonth = ordenesFiltrados.filter(o => isSameMonth(o.created_at, previousMonth, previousMonthYear)).length
      const ordenesCreadasGrowth = calculateGrowth(ordenesCreadasThisMonth, ordenesCreadasLastMonth)

      const pendientesFilter = o => ['programada', 'en_progreso'].includes(o.estado)
      const completadasFilter = o => o.estado === 'completada'

      const pendientesThisMonth = ordenesFiltrados.filter(o => pendientesFilter(o) && isSameMonth(o.created_at, currentMonth, currentYear)).length
      const pendientesLastMonth = ordenesFiltrados.filter(o => pendientesFilter(o) && isSameMonth(o.created_at, previousMonth, previousMonthYear)).length
      const pendientesGrowth = calculateGrowth(pendientesThisMonth, pendientesLastMonth)

      const completadasThisMonth = ordenesFiltrados.filter(o => completadasFilter(o) && isSameMonth(o.created_at, currentMonth, currentYear)).length
      const completadasLastMonth = ordenesFiltrados.filter(o => completadasFilter(o) && isSameMonth(o.created_at, previousMonth, previousMonthYear)).length
      const completadasGrowth = calculateGrowth(completadasThisMonth, completadasLastMonth)

      const recent = [...ordenesFiltrados]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)

      // Chart Data: Agrupar por fecha_programada o created_at (usamos fecha_programada si existe)
      const last30Days = [...ordenesFiltrados].filter(o => {
        const d = new Date(o.fecha_programada || o.created_at);
        return (new Date() - d) < 30 * 24 * 60 * 60 * 1000;
      });
      
      const chartMap = {};
      last30Days.forEach(o => {
        const dateStr = o.fecha_programada 
          ? formatFecha(o.fecha_programada, { month: 'short', day: '2-digit' })
          : formatFecha(o.created_at, { month: 'short', day: '2-digit' });
        chartMap[dateStr] = (chartMap[dateStr] || 0) + 1;
      });
      
      const realChartData = Object.keys(chartMap).map(date => ({
        name: date,
        ordenes: chartMap[date]
      })).sort((a, b) => new Date(a.name) - new Date(b.name));

      setStats({
        clientes: clientesActivos,
        pendientes,
        completadas,
        tecnicos: tecnicosActivos,
        clientesGrowth,
        ordenesCreadas: ordenesFiltrados.length,
        ordenesCreadasGrowth,
        completadasGrowth,
        pendientesGrowth
      })
      setRecentOrders(recent)
      setChartData(realChartData.length > 0 ? realChartData : [{name: 'Sin datos', ordenes: 0}])
    } catch (err) {
      console.error('Error cargando dashboard:', err)
      // Fallback a caché si el fetch falló
      try {
        const cached = await db.cache_listas.get(CACHE_KEY_DASHBOARD)
        if (cached?.data) {
          setIsOfflineData(true)
          // re-invocar con los datos en caché sin hacer fetch
          const { clientes = [], ordenes = [], perfiles = [] } = cached.data
          const ordenesFiltrados = (!isAdmin && profile?.id)
            ? ordenes.filter(o => o.tecnico_id === profile.id) : ordenes
          const recent = [...ordenesFiltrados]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
          setRecentOrders(recent)
          setStats(s => ({
            ...s,
            clientes: clientes.filter(c => c.activo).length,
            pendientes: ordenesFiltrados.filter(o => ['programada', 'en_progreso'].includes(o.estado)).length,
            completadas: ordenesFiltrados.filter(o => o.estado === 'completada').length,
            tecnicos: perfiles.filter(p => p.rol === 'tecnico' && p.activo).length,
          }))
        }
      } catch { /* ignorar */ }
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: 'Clientes activos',
      value: stats.clientes,
      Icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      indicator: {
        text: `${Math.abs(stats.clientesGrowth)}% desde el mes pasado`,
        type: stats.clientesGrowth >= 0 ? 'up' : 'down',
        color: stats.clientesGrowth >= 0 ? 'text-green-600' : 'text-red-600',
        value: `${Math.abs(stats.clientesGrowth)}%`
      },
      adminOnly: true
    },
    {
      label: 'Órdenes pendientes',
      value: stats.pendientes,
      Icon: ClipboardList,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      indicator: {
        text: `${Math.abs(stats.pendientesGrowth)}% desde el mes pasado`,
        type: stats.pendientesGrowth >= 0 ? 'up' : 'down',
        color: stats.pendientesGrowth >= 0 ? 'text-green-600' : 'text-red-600',
        value: `${Math.abs(stats.pendientesGrowth)}%`
      },
    },
    {
      label: 'Órdenes completadas',
      value: stats.completadas,
      Icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
      indicator: {
        text: `${Math.abs(stats.completadasGrowth)}% desde el mes pasado`,
        type: stats.completadasGrowth >= 0 ? 'up' : 'down',
        color: stats.completadasGrowth >= 0 ? 'text-green-600' : 'text-red-600',
        value: `${Math.abs(stats.completadasGrowth)}%`
      },
    },
    {
      label: 'Técnicos activos',
      value: stats.tecnicos,
      Icon: UserCog,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      indicator: { text: 'Todos disponibles', type: 'dot', color: 'bg-green-500' },
      adminOnly: true
    },
  ].filter(card => isAdmin || !card.adminOnly)

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completada': return 'success'
      case 'en_progreso': return 'primary'
      default: return 'warning'
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      programada: 'Programada',
      en_progreso: 'En Progreso',
      completada: 'Completada',
    }
    return labels[status] || status
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  const primerNombre = profile?.nombre_completo || 'Usuario'

  return (
    <div className="pb-8">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-black text-dark-900 tracking-tight flex items-center gap-2">
            Hola, {isAdmin ? 'Administrador' : primerNombre} <span className="text-2xl"></span>
            <HelpButton title="Dashboard" content={HELP_CONTENT.dashboard} />
          </h1>
          <p className="text-dark-500 mt-1 text-[15px] font-medium">
            Bienvenido a <span className="text-primary-700 font-bold">{nombreEmpresa}</span>
          </p>
          <p className="text-dark-400 text-sm mt-1">{isAdmin ? 'Resumen general del sistema' : 'Tus tareas asignadas para hoy'}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <Link to="/clientes" state={{ openModal: true }} className="px-5 py-2.5 bg-white border border-dark-200 hover:border-dark-300 text-dark-800 font-bold rounded-xl text-sm transition-all shadow-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nuevo Cliente
            </Link>
            <Link to="/ordenes" state={{ openModal: true }} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-primary-600/20 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nueva Orden
            </Link>
          </div>
        )}
      </div>

      {/* Aviso de datos en caché offline */}
      {isOfflineData && (
        <div className="flex items-center gap-2 mb-6 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-800">
          <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>Mostrando datos guardados localmente. Conéctate para ver información actualizada.</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-6 mb-8`}>
        {statCards.map((card) => (
          <div key={card.label} className="bg-white p-6 rounded-[24px] border border-dark-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${card.bg} ${card.color}`}>
                <card.Icon className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-[13px] font-bold text-dark-500">{card.label}</p>
                <p className="text-[32px] leading-none font-black text-dark-900 mt-1">{card.value}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              {card.indicator.type === 'up' && <span className={`text-xs font-bold ${card.indicator.color}`}>↑ {card.indicator.value}</span>}
              {card.indicator.type === 'down' && <span className={`text-xs font-bold ${card.indicator.color}`}>↓ {card.indicator.value}</span>}
              {card.indicator.type === 'dot' && <div className={`w-2 h-2 rounded-full ${card.indicator.color}`} />}
              <span className="text-xs font-medium text-dark-400">{card.indicator.text}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Banners Administrativos */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-[24px] border border-dark-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-8 flex flex-col md:flex-row items-center justify-between group overflow-hidden relative hover:shadow-md transition-shadow">
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="relative z-10 flex-1 pr-6">
              <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mb-4 border border-primary-100">
                <Settings className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-dark-900 mb-2">Configuración</h3>
              <p className="text-sm font-medium text-dark-500 mb-6 max-w-[250px]">Personaliza tu empresa, productos, servicios y genera reportes.</p>
              <Link to="/admin/configuracion" className="inline-flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors">
                Ir a configuración <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="hidden md:block relative z-10 opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 bg-primary-100/50 rounded-2xl rotate-6"></div>
                <div className="absolute inset-0 bg-primary-50 rounded-2xl border-2 border-primary-200 shadow-sm flex flex-col items-center justify-center gap-3 p-4">
                  <div className="w-full h-2 bg-primary-200/60 rounded-full"></div>
                  <div className="w-3/4 h-2 bg-primary-200/60 rounded-full"></div>
                  <div className="w-full h-2 bg-primary-200/60 rounded-full"></div>
                </div>
                <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                  <Settings className="w-5 h-5 text-white animate-spin-slow" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-dark-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-8 flex flex-col md:flex-row items-center justify-between group overflow-hidden relative hover:shadow-md transition-shadow">
            <div className="absolute right-0 top-0 w-64 h-64 bg-green-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="relative z-10 flex-1 pr-6">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4 border border-green-100">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-dark-900 mb-2">Documentos Legales</h3>
              <p className="text-sm font-medium text-dark-500 mb-6 max-w-[250px]">Gestiona resoluciones, permisos y documentos sanitarios.</p>
              <Link to="/admin/documentos" className="inline-flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 transition-colors">
                Ver documentos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="hidden md:block relative z-10 opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all">
              <div className="relative w-32 h-32">
                <div className="absolute inset-2 bg-green-100/50 rounded-xl -rotate-6"></div>
                <div className="absolute inset-0 rounded-xl border-2 border-green-200 shadow-sm flex flex-col gap-2 p-3 pt-4 bg-white">
                  <div className="w-1/2 h-2 bg-green-200/60 rounded-full"></div>
                  <div className="w-full h-2 bg-green-200/60 rounded-full"></div>
                  <div className="w-3/4 h-2 bg-green-200/60 rounded-full"></div>
                </div>
                <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actividad y Tabla */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico */}
        <div className="bg-white rounded-[24px] border border-dark-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" /> Resumen de actividad
            </h2>
            <select className="bg-dark-50 border border-dark-200 text-sm font-semibold text-dark-700 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-500/20">
              <option>Este mes</option>
              <option>Mes pasado</option>
            </select>
          </div>
          <div className="h-[250px] w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrdenes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  itemStyle={{ color: '#059669', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="ordenes" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorOrdenes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-auto">
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-dark-500">Órdenes creadas</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-dark-900">{stats.ordenesCreadas}</span>
                <span className={`text-[10px] font-bold ${stats.ordenesCreadasGrowth >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'} px-1.5 py-0.5 rounded mb-1`}>
                  {stats.ordenesCreadasGrowth >= 0 ? '↑' : '↓'} {Math.abs(stats.ordenesCreadasGrowth)}%
                </span>
              </div>
            </div>
            <div className="bg-green-50/50 rounded-2xl p-4 border border-green-100/50 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-dark-500">Completadas</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-dark-900">{stats.completadas}</span>
                <span className={`text-[10px] font-bold ${stats.completadasGrowth >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'} px-1.5 py-0.5 rounded mb-1`}>
                  {stats.completadasGrowth >= 0 ? '↑' : '↓'} {Math.abs(stats.completadasGrowth)}%
                </span>
              </div>
            </div>
            <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100/50 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <ClipboardList className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-dark-500">Pendientes</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-dark-900">{stats.pendientes}</span>
                <span className={`text-[10px] font-bold ${stats.pendientesGrowth >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'} px-1.5 py-0.5 rounded mb-1`}>
                  {stats.pendientesGrowth >= 0 ? '↑' : '↓'} {Math.abs(stats.pendientesGrowth)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Órdenes recientes */}
        <div className="bg-white rounded-[24px] border border-dark-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-dark-50">
            <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary-600" /> Órdenes recientes
            </h2>
            <Link to="/ordenes" className="text-sm text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1 transition-colors">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-dark-400 uppercase bg-dark-50/50 border-b border-dark-100">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Orden</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Cliente</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Estado</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Técnico</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-dark-400">
                      No hay órdenes recientes.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-dark-50 hover:bg-dark-50/50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-primary-600">
                        <Link to={`/ordenes/${order.id}`}>#ORD-{order.id.split('-')[0].substring(0, 4).toUpperCase()}</Link>
                      </td>
                      <td className="px-6 py-4 font-bold text-dark-900 truncate max-w-[150px]">
                        {order.cliente_nombre}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getStatusVariant(order.estado)}>
                          {getStatusLabel(order.estado)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-dark-100 flex items-center justify-center shrink-0 border border-dark-200">
                            <Shield className="w-3 h-3 text-dark-400" />
                          </div>
                          <span className="font-semibold text-dark-700 truncate max-w-[100px]">{order.profiles?.nombre_completo || 'Sin técnico'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-dark-500 font-medium whitespace-nowrap">
                        {order.fecha_programada ? formatFecha(order.fecha_programada, { month: 'short', day: '2-digit' }, 'Hoy') : 'Hoy'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
