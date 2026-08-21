import { useState, useEffect, useCallback, useRef } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Users, ClipboardList, FileCheck, UserCog,
  Menu, X, LogOut, Shield, Bug, Download, ClipboardCheck, Package,
  WifiOff, RefreshCw, Key, Search, Bell, ChevronDown, CheckCircle2, Clock, AlertCircle, ArrowLeft, FileSearch, ShieldCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import api from '../../lib/api'
import { getAuthImageUrl } from '../../utils/imageUtils'
import { useOffline } from '../../contexts/OfflineContext'
import { useConfig } from '../../contexts/ConfigContext'
import ChangePasswordModal from './ChangePasswordModal'

export default function Layout() {
  const { profile, logout, isAdmin } = useAuth()
  const { isOnline, isSyncing, pendingCount, syncAll, lastSyncTime, syncError, isCachingOrders, preCacheOrdenesActivas } = useOffline()
  const { nombreEmpresa, logoUrl } = useConfig()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { canInstall, isReady, promptInstall } = useInstallPrompt()
  const [requestCount, setRequestCount] = useState(0)
  const [showPwdModal, setShowPwdModal] = useState(false)

  // Pre-cachear órdenes activas en segundo plano para trabajo offline en campo
  useEffect(() => {
    if (isOnline && profile?.id) {
      // Pequeño delay para no competir con la carga inicial de la página
      const timer = setTimeout(() => preCacheOrdenesActivas(profile), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, profile, preCacheOrdenesActivas])

  // Estados de Búsqueda, Notificaciones y Menú de Perfil
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchData, setSearchData] = useState({ ordenes: [], clientes: [], tecnicos: [] })
  const [mobileSearchActive, setMobileSearchActive] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [pendingOrders, setPendingOrders] = useState([])
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const searchRef = useRef(null)
  const notifRef = useRef(null)
  const profileRef = useRef(null)
  const profileMobileRef = useRef(null)

  // Cerrar desplegables al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
      const clickedInsideProfile =
        (profileRef.current && profileRef.current.contains(event.target)) ||
        (profileMobileRef.current && profileMobileRef.current.contains(event.target))
      if (!clickedInsideProfile) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cargar órdenes pendientes para la campanita de notificaciones
  const loadPendingNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await api.get('/servicios', { token })
      const ordenes = res.data || []

      const esTecnico = profile?.rol === 'tecnico'
      const pendientes = ordenes.filter(o => {
        const esPendiente = ['programada', 'en_progreso'].includes(o.estado)
        if (!esPendiente) return false
        if (esTecnico && profile?.id) {
          return o.tecnico_id === profile.id
        }
        return true
      })
      setPendingOrders(pendientes)
    } catch {
      console.error('Error cargando notificaciones de órdenes')
    }
  }, [profile])

  useEffect(() => {
    loadPendingNotifications()
    const interval = setInterval(loadPendingNotifications, 30000)
    return () => clearInterval(interval)
  }, [loadPendingNotifications])

  // Cargar datos para la búsqueda cuando se escribe
  const fetchSearchData = useCallback(async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    try {
      const token = localStorage.getItem('token')
      const requests = [
        api.get('/servicios', { token }),
        isAdmin ? api.get('/clientes', { token }) : Promise.resolve({ data: [] }),
        isAdmin ? api.get('/profiles', { token }) : Promise.resolve({ data: [] })
      ]

      const [ordenesRes, clientesRes, profilesRes] = await Promise.all(requests)
      const q = searchQuery.toLowerCase().trim()

      const allOrdenes = ordenesRes.data || []
      const filteredOrdenes = allOrdenes.filter(o => {
        const esTecnico = profile?.rol === 'tecnico'
        if (esTecnico && profile?.id && o.tecnico_id !== profile.id) return false
        const code = `#ORD-${(o.id || '').split('-')[0].toUpperCase()}`
        return code.toLowerCase().includes(q) ||
               (o.cliente_nombre || '').toLowerCase().includes(q) ||
               (o.tipo_servicio || '').toLowerCase().includes(q) ||
               (o.tipo_plaga || '').toLowerCase().includes(q)
      }).slice(0, 5)

      const allClientes = clientesRes.data || []
      const filteredClientes = allClientes.filter(c => 
        (c.nombre_comercial || '').toLowerCase().includes(q) ||
        (c.razon_social || '').toLowerCase().includes(q) ||
        (c.rut_nit || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      ).slice(0, 5)

      const allProfiles = profilesRes.data || []
      const filteredProfiles = allProfiles.filter(p =>
        (p.nombre_completo || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.rol || '').toLowerCase().includes(q)
      ).slice(0, 5)

      setSearchData({
        ordenes: filteredOrdenes,
        clientes: filteredClientes,
        tecnicos: filteredProfiles
      })
      setSearchOpen(true)
    } catch (err) {
      console.error('Error cargando búsqueda:', err)
    } finally {
      setSearchLoading(false)
    }
  }, [searchQuery, isAdmin, profile])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        fetchSearchData()
      } else {
        setSearchOpen(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchSearchData])

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Panel' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/ordenes', icon: ClipboardList, label: 'Órdenes' },
    { to: '/certificados', icon: FileCheck, label: 'Certificados' },
  ].filter(item => {
    if (item.to === '/clientes' && profile?.rol === 'tecnico') return false
    return true
  })

  if (profile?.rol === 'tecnico') {
    navItems.push({ to: '/mis-epp', icon: ShieldCheck, label: 'Mis EPP' })
  }

  if (isAdmin) {
    navItems.push({ to: '/admin/usuarios', icon: UserCog, label: 'Usuarios' })
    navItems.push({ to: '/admin/productos', icon: Package, label: 'Productos' })
    navItems.push({ to: '/admin/auditoria', icon: FileSearch, label: 'Auditoría' })
    navItems.push({ to: '/admin/configuracion', icon: Shield, label: 'Configuración' })
    navItems.push({ to: '/admin/solicitudes', icon: ClipboardCheck, label: 'Solicitudes', badge: requestCount })
  }

  const loadRequestCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        estado: ['pendiente', 'cotizacion_solicitada', 'aceptada'].join(',')
      })

      const response = await api.get(`/solicitudes-servicio/count?${params}`, { token })
      setRequestCount(response.data?.count || 0)
    } catch {
      console.error('Error cargando solicitudes')
    }
  }, [location.pathname])

  useEffect(() => {
    if (isAdmin) {
      setTimeout(() => loadRequestCount(), 0)
      const interval = setInterval(loadRequestCount, 30000)
      return () => clearInterval(interval)
    }
  }, [isAdmin, loadRequestCount])

  async function handleLogout() {
    try {
      await logout()
      navigate('/login')
      toast.success('Sesión cerrada')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  function getRelativeTime(date) {
    if (!date) return 'Todo actualizado'
    const diffSec = Math.floor((new Date() - date) / 1000)
    if (diffSec < 45) return 'Hace un momento'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `Hace ${diffMin} min`
    const diffHours = Math.floor(diffMin / 60)
    return `Hace ${diffHours} h`
  }

  const linkClasses = ({ isActive }) =>
    `flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold ${isActive
      ? 'bg-primary-50 text-primary-700'
      : 'text-dark-500 hover:bg-dark-50 hover:text-dark-900'
    }`

  const totalNotifCount = (pendingOrders?.length || 0) + (isAdmin ? (requestCount || 0) : 0)

  return (
    <div className="h-screen flex flex-col md:flex-row bg-dark-100">



      {/* Fondo oscuro (overlay) */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Barra lateral */}
      <aside className={`
         fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-dark-100
         transform transition-transform duration-300 ease-in-out
         ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
         flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]
       `}>
        {/* Logo */}
        <div className="hidden md:flex items-center gap-3 px-5 py-4 shrink-0 border-b border-dark-100/50">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm shadow-primary-600/20">
            {logoUrl ? (
              <img src={getAuthImageUrl(logoUrl)} alt="Logo Empresa" className="w-full h-full object-contain bg-white" />
            ) : (
              <Bug className="w-4.5 h-4.5 text-white" />
            )}
          </div>
          <div className="min-w-0 flex flex-col">
            <h1 className={`font-bold ${nombreEmpresa.length > 15 ? 'text-sm' : 'text-base'} text-dark-900 leading-tight truncate`} title={nombreEmpresa}>
              {nombreEmpresa}
            </h1>
            <p className="text-[11px] font-medium text-dark-400 truncate">Control de Plagas</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto mt-14 md:mt-0 min-h-0">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={linkClasses}
              onClick={() => setSidebarOpen(false)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Zona inferior fija */}
        <div className="shrink-0 flex flex-col">
          {canInstall && (
            <div className="px-3 pt-2">
              <button
                onClick={promptInstall}
                className={`flex items-center gap-2 w-full justify-start text-xs px-3.5 py-2 rounded-xl font-semibold shadow-xs transition-all duration-200 mb-1.5 ${isReady
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-600/20'
                  : 'bg-dark-200 text-dark-500 cursor-not-allowed opacity-80'
                  }`}
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>{isReady ? 'Instalar App' : 'Preparando App...'}</span>
              </button>
            </div>
          )}

          {/* Componente de Estado de Sincronización PWA */}
          <div className="p-3 border-t border-dark-100">
            {(() => {
              // Variante 1: Error de Sincronización
              if (syncError || (isOnline && !isSyncing && pendingCount > 0)) {
                return (
                  <div 
                    onClick={syncAll}
                    className="group flex items-center justify-between p-2.5 bg-red-50/80 border border-red-200/90 rounded-xl cursor-pointer hover:bg-red-100/80 transition-all shadow-2xs"
                    title="Toca para reintentar la sincronización"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-bold text-red-900 leading-tight truncate">Error al sincronizar</p>
                        <p className="text-[11px] font-semibold text-red-600 truncate underline">Toca para reintentar</p>
                      </div>
                    </div>
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 group-hover:rotate-12 transition-transform" />
                  </div>
                )
              }

              // Variante 2: Sin Conexión (Offline)
              if (!isOnline) {
                return (
                  <div 
                    className="flex items-center justify-between p-2.5 bg-amber-50/80 border border-amber-200/90 rounded-xl shadow-2xs"
                    title="Operando en modo sin conexión"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-bold text-amber-900 leading-tight truncate">Sin conexión</p>
                        <p className="text-[11px] font-medium text-amber-700 truncate">
                          {pendingCount > 0 
                            ? `${pendingCount} cambio${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}` 
                            : 'Modo offline activo'}
                        </p>
                      </div>
                    </div>
                    <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
                  </div>
                )
              }

              // Variante 3: Sincronizando
              if (isSyncing) {
                return (
                  <div className="flex items-center justify-between p-2.5 bg-primary-50/60 border border-primary-100/70 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse shrink-0" />
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-bold text-dark-900 leading-tight truncate">Sincronizando...</p>
                        <p className="text-[11px] font-medium text-dark-400 truncate">Subiendo cambios locales</p>
                      </div>
                    </div>
                    <RefreshCw className="w-4 h-4 text-primary-600 animate-spin shrink-0" />
                  </div>
                )
              }

              // Variante 4: Sincronizado
              return (
                <div 
                  onClick={syncAll}
                  className="group flex items-center justify-between p-2.5 bg-dark-50/80 border border-dark-100 rounded-xl cursor-pointer hover:bg-dark-100/60 transition-all shadow-2xs"
                  title="Clic para sincronizar manualmente"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-semibold text-dark-900 leading-tight truncate">Sincronizado</p>
                      <p className="text-[11px] font-medium text-dark-400 truncate">{getRelativeTime(lastSyncTime)}</p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                </div>
              )
            })()}

            {/* Indicador de pre-cacheo offline en curso */}
            {isCachingOrders && (
              <div className="flex items-center gap-2 mt-1.5 px-2.5 py-1.5 bg-blue-50/80 border border-blue-100 rounded-lg">
                <RefreshCw className="w-3 h-3 text-blue-500 animate-spin shrink-0" />
                <p className="text-[10px] font-medium text-blue-700 truncate">Preparando modo offline...</p>
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-dark-100 flex items-center gap-1.5 shrink-0">
            <Bug className="w-3.5 h-3.5 text-dark-300" />
            <p className="text-[10px] text-dark-400 font-medium">Con tecnología de PlagControl</p>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col overflow-hidden bg-dark-50/50">
        
        {/* Cabecera Desktop (Oculta en móvil porque ya hay una) */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white/60 backdrop-blur-xl border-b border-dark-100/50 sticky top-0 z-20">
          <div className="flex-1 flex items-center">
            {/* El título se renderizará dinámicamente en el Outlet o podemos dejarlo vacío aquí */}
          </div>
          <div className="flex items-center gap-6">

            {/* Búsqueda interactiva */}
            <div className="relative" ref={searchRef}>
              <div className="relative group">
                <Search className="w-4 h-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-primary-600 transition-colors" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim().length >= 2) setSearchOpen(true)
                  }}
                  placeholder="Buscar cliente, orden, técnico..." 
                  className="pl-9 pr-4 py-2 w-[280px] bg-white border border-dark-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all shadow-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Menú Flotante de Resultados de Búsqueda */}
              {searchOpen && (
                <div className="absolute right-0 mt-2 w-[340px] bg-white rounded-2xl border border-dark-100 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-3 bg-dark-50 border-b border-dark-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-dark-500 uppercase tracking-wider">Resultados de búsqueda</span>
                    {searchLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-600" />}
                  </div>

                  <div className="max-h-[380px] overflow-y-auto divide-y divide-dark-50 text-sm">
                    {/* Sección Órdenes */}
                    {searchData.ordenes.length > 0 && (
                      <div className="p-2">
                        <div className="px-2 py-1 text-[11px] font-bold text-dark-400 uppercase">Órdenes de Servicio</div>
                        {searchData.ordenes.map(ord => (
                          <Link 
                            key={ord.id}
                            to={`/ordenes/${ord.id}`}
                            onClick={(e) => { e.preventDefault(); navigate(`/ordenes/${ord.id}`); setSearchOpen(false); }}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-primary-50/60 transition-colors group"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-primary-600 text-xs group-hover:underline">
                                #ORD-{(ord.id || '').split('-')[0].toUpperCase()}
                              </p>
                              <p className="text-xs font-medium text-dark-800 truncate">{ord.cliente_nombre}</p>
                              <p className="text-[10px] text-dark-400 truncate">{ord.tipo_servicio}</p>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-dark-100 text-dark-600 capitalize">
                              {ord.estado}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Sección Clientes */}
                    {searchData.clientes.length > 0 && (
                      <div className="p-2">
                        <div className="px-2 py-1 text-[11px] font-bold text-dark-400 uppercase">Clientes</div>
                        {searchData.clientes.map(cli => (
                          <Link 
                            key={cli.id}
                            to={`/clientes/${cli.id}`}
                            onClick={(e) => { e.preventDefault(); navigate(`/clientes/${cli.id}`); setSearchOpen(false); }}
                            className="flex items-center gap-2 p-2 rounded-xl hover:bg-blue-50/60 transition-colors group"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                              <Users className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-dark-900 text-xs truncate group-hover:text-blue-600">
                                {cli.nombre_comercial || cli.razon_social}
                              </p>
                              <p className="text-[10px] text-dark-400 truncate">{cli.email || cli.rut_nit}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Sección Técnicos / Usuarios */}
                    {searchData.tecnicos.length > 0 && (
                      <div className="p-2">
                        <div className="px-2 py-1 text-[11px] font-bold text-dark-400 uppercase">Técnicos / Personal</div>
                        {searchData.tecnicos.map(tec => (
                          <Link 
                            key={tec.id}
                            to="/admin/usuarios"
                            onClick={(e) => { e.preventDefault(); navigate(`/admin/usuarios`); setSearchOpen(false); }}
                            className="flex items-center gap-2 p-2 rounded-xl hover:bg-purple-50/60 transition-colors group"
                          >
                            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                              <UserCog className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-dark-900 text-xs truncate group-hover:text-purple-600">
                                {tec.nombre_completo}
                              </p>
                              <p className="text-[10px] text-dark-400 truncate capitalize">{tec.rol} — {tec.email}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Sin resultados */}
                    {searchData.ordenes.length === 0 && searchData.clientes.length === 0 && searchData.tecnicos.length === 0 && !searchLoading && (
                      <div className="p-6 text-center text-dark-400 text-xs font-medium">
                        No se encontraron resultados para &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notificaciones (Campanita) */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-dark-400 hover:text-dark-900 hover:bg-dark-50 rounded-xl transition-colors"
                title="Notificaciones"
              >
                <Bell className="w-5 h-5" />
                {totalNotifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white">
                    {totalNotifCount}
                  </span>
                )}
              </button>

              {/* Popover de Notificaciones */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-dark-100 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-4 bg-dark-50 border-b border-dark-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary-600" />
                      <span className="font-bold text-dark-900 text-sm">Notificaciones</span>
                    </div>
                    {totalNotifCount > 0 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                        {totalNotifCount} nueva{totalNotifCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-dark-50">
                    {/* Alerta de solicitudes (Admin) */}
                    {isAdmin && requestCount > 0 && (
                      <Link 
                        to="/admin/solicitudes" 
                        onClick={() => setNotificationsOpen(false)}
                        className="flex items-center gap-3 p-3.5 bg-amber-50/60 hover:bg-amber-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <ClipboardCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-dark-900">Solicitudes requieren atención</p>
                          <p className="text-[11px] text-dark-500">Hay {requestCount} solicitud{requestCount !== 1 ? 'es' : ''} esperando acción</p>
                        </div>
                      </Link>
                    )}

                    {/* Lista de Órdenes Pendientes */}
                    {pendingOrders.length > 0 ? (
                      pendingOrders.map(ord => (
                        <Link 
                          key={ord.id} 
                          to={`/ordenes/${ord.id}`} 
                          onClick={() => setNotificationsOpen(false)}
                          className="flex items-start gap-3 p-3.5 hover:bg-dark-50 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-primary-600 group-hover:underline">
                                #ORD-{(ord.id || '').split('-')[0].toUpperCase()}
                              </span>
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded capitalize">
                                {ord.estado}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-dark-800 truncate">{ord.cliente_nombre}</p>
                            <p className="text-[10px] text-dark-400 truncate">{ord.tipo_servicio || 'Servicio programado'}</p>
                          </div>
                        </Link>
                      ))
                    ) : (
                      (!isAdmin || requestCount === 0) && (
                        <div className="p-6 text-center text-dark-400">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
                          <p className="text-xs font-semibold">¡Todo al día!</p>
                          <p className="text-[11px] text-dark-400 mt-0.5">No hay órdenes ni solicitudes pendientes</p>
                        </div>
                      )
                    )}
                  </div>

                  <div className="p-2 bg-dark-50 border-t border-dark-100 text-center">
                    <Link 
                      to="/ordenes" 
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 block py-1"
                    >
                      Ver todas las órdenes →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Pestaña de Perfil del Usuario al lado de la campanita */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-3 cursor-pointer hover:bg-dark-50 py-1.5 px-3 rounded-xl border border-dark-200/60 transition-all shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center border border-primary-200 text-primary-700 shrink-0 font-bold text-xs">
                  {profile?.nombre_completo ? profile.nombre_completo.charAt(0).toUpperCase() : <Shield className="w-4 h-4" />}
                </div>
                <div className="hidden lg:flex flex-col text-left min-w-0">
                  <span className="text-xs font-bold text-dark-900 truncate max-w-[130px]">
                    {profile?.nombre_completo || 'Usuario'}
                  </span>
                  <span className="text-[10px] font-semibold text-primary-600 capitalize leading-none">
                    {profile?.rol || 'Personal'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-dark-400 transition-transform duration-200 ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Menú Desplegable de Perfil */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-dark-100 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-3.5 bg-dark-50 border-b border-dark-100">
                    <p className="text-xs font-bold text-dark-900 truncate">{profile?.nombre_completo}</p>
                    <p className="text-[11px] text-dark-400 truncate">{profile?.email || 'Sin correo'}</p>
                    <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary-100 text-primary-700">
                      {profile?.rol}
                    </span>
                  </div>

                  <div className="p-1.5 space-y-0.5 text-xs">
                    <button 
                      onClick={() => { setProfileMenuOpen(false); setShowPwdModal(true); }} 
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-dark-700 hover:bg-dark-50 font-medium transition-colors"
                    >
                      <Key className="w-4 h-4 text-dark-400" />
                      <span>Cambiar contraseña</span>
                    </button>
                    <button 
                      onClick={() => { setProfileMenuOpen(false); handleLogout(); }} 
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-medium transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Banner sin conexión / sincronizando — fuera del área scrolleable */}
        {(!isOnline || isSyncing) && (
          <div className={`shrink-0 flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-white transition-all ${isSyncing ? 'bg-amber-500' : 'bg-red-500'}`}>
            {isSyncing ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sincronizando {pendingCount} cambio{pendingCount !== 1 ? 's' : ''}...</>
            ) : (
              <><WifiOff className="w-3.5 h-3.5" /> Sin conexión — los cambios se guardarán automáticamente
                {pendingCount > 0 && <span className="ml-1 bg-white/20 rounded px-1">{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>}
              </>
            )}
            {!isOnline && pendingCount > 0 && (
              <button onClick={syncAll} className="ml-2 underline text-white/80 hover:text-white">Reintentar</button>
            )}
          </div>
        )}

          {/* Cabecera móvil en color verde para técnico/admin */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 bg-primary-700 text-white border-b border-primary-800 shadow-sm shrink-0">
            {mobileSearchActive ? (
              <div className="flex w-full items-center gap-2 relative z-50">
                <button 
                  onClick={() => { setMobileSearchActive(false); setSearchQuery(''); setSearchOpen(false); }} 
                  className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchQuery.trim().length >= 2) setSearchOpen(true) }}
                  placeholder="Buscar orden, cliente, folio..."
                  className="flex-1 bg-white/20 text-white placeholder-white/60 border border-white/20 rounded-xl py-1.5 px-3 text-sm focus:outline-none focus:bg-white/30 transition-colors"
                />
                
                {searchOpen && (
                  <div className="absolute top-full left-0 right-0 mt-3 w-full bg-white rounded-2xl border border-dark-100 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-3 bg-dark-50 border-b border-dark-100 flex items-center justify-between text-dark-900">
                      <span className="text-xs font-bold text-dark-500 uppercase tracking-wider">Resultados</span>
                      {searchLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-600" />}
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto divide-y divide-dark-50 text-sm text-dark-900">
                      {searchData.ordenes.length > 0 && (
                        <div className="p-2">
                          <div className="px-2 py-1 text-[11px] font-bold text-dark-400 uppercase">Órdenes</div>
                          {searchData.ordenes.map(ord => (
                            <Link 
                              key={ord.id} to={`/ordenes/${ord.id}`} 
                              onClick={(e) => { e.preventDefault(); navigate(`/ordenes/${ord.id}`); setSearchOpen(false); setMobileSearchActive(false); }}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-primary-50 transition-colors"
                            >
                              <div>
                                <p className="font-bold text-primary-600 text-xs">#ORD-{(ord.id || '').split('-')[0].toUpperCase()}</p>
                                <p className="text-xs font-medium text-dark-800">{ord.cliente_nombre}</p>
                              </div>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-dark-100 text-dark-600 capitalize">{ord.estado}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchData.clientes.length > 0 && (
                        <div className="p-2">
                          <div className="px-2 py-1 text-[11px] font-bold text-dark-400 uppercase">Clientes</div>
                          {searchData.clientes.map(cli => (
                            <Link 
                              key={cli.id} to={`/clientes/${cli.id}`} 
                              onClick={(e) => { e.preventDefault(); navigate(`/clientes/${cli.id}`); setSearchOpen(false); setMobileSearchActive(false); }}
                              className="flex items-center gap-2 p-2 rounded-xl hover:bg-blue-50 transition-colors"
                            >
                              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs"><Users className="w-3.5 h-3.5" /></div>
                              <div>
                                <p className="font-bold text-dark-900 text-xs">{cli.nombre_comercial || cli.razon_social}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchData.ordenes.length === 0 && searchData.clientes.length === 0 && !searchLoading && (
                        <div className="p-6 text-center text-dark-400 text-xs font-medium">Sin resultados para &quot;{searchQuery}&quot;</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  {logoUrl ? (
                    <div className="w-8 h-8 rounded-lg bg-white p-0.5 shadow-xs overflow-hidden flex items-center justify-center shrink-0">
                      <img src={getAuthImageUrl(logoUrl)} alt="Logo Empresa" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Bug className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <span className="font-bold text-base text-white truncate max-w-[120px] sm:max-w-[140px]">{nombreEmpresa}</span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Búsqueda Móvil */}
                  <button 
                    onClick={() => setMobileSearchActive(true)}
                    className="p-1.5 rounded-xl text-white hover:bg-white/10 active:bg-white/20 transition-colors"
                    aria-label="Buscar"
                  >
                    <Search className="w-5 h-5" />
                  </button>

                  {/* Notificaciones Móvil */}
                  <div className="relative">
                    <button 
                      onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileMenuOpen(false); }}
                      className="relative p-1.5 rounded-xl text-white hover:bg-white/10 active:bg-white/20 transition-colors"
                      aria-label="Notificaciones"
                    >
                      <Bell className="w-5 h-5" />
                      {totalNotifCount > 0 && (
                        <span className="absolute top-0 right-0 min-w-[14px] h-3.5 px-1 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center ring-1 ring-white">
                          {totalNotifCount}
                        </span>
                      )}
                    </button>
                    {notificationsOpen && (
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-dark-100 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="p-3 bg-dark-50 border-b border-dark-100 flex items-center justify-between text-dark-900">
                          <span className="font-bold text-sm">Notificaciones</span>
                          {totalNotifCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{totalNotifCount}</span>}
                        </div>
                        <div className="max-h-72 overflow-y-auto divide-y divide-dark-50 text-dark-900">
                          {pendingOrders.length > 0 ? (
                            pendingOrders.map(ord => (
                              <Link key={ord.id} to={`/ordenes/${ord.id}`} onClick={() => setNotificationsOpen(false)} className="flex gap-3 p-3 hover:bg-dark-50 transition-colors">
                                <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 mt-0.5"><Clock className="w-3.5 h-3.5" /></div>
                                <div>
                                  <p className="text-xs font-bold text-primary-600">#ORD-{(ord.id || '').split('-')[0].toUpperCase()}</p>
                                  <p className="text-xs font-medium text-dark-800">{ord.cliente_nombre}</p>
                                </div>
                              </Link>
                            ))
                          ) : (
                            <div className="p-4 text-center text-dark-400 text-xs">Sin notificaciones</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Menú de perfil móvil */}
                  <div className="relative">
                    <button
                      onClick={() => { setProfileMenuOpen(!profileMenuOpen); setNotificationsOpen(false); }}
                      className="flex items-center gap-1 p-1.5 rounded-xl text-white hover:bg-white/10 active:bg-white/20 transition-colors"
                      aria-label="Menú de usuario"
                    >
                      <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs text-white shrink-0">
                        {profile?.nombre_completo ? profile.nombre_completo.charAt(0).toUpperCase() : <Shield className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                    {profileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-dark-100 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="p-3.5 bg-dark-50 border-b border-dark-100 text-dark-900">
                          <p className="text-xs font-bold truncate">{profile?.nombre_completo}</p>
                          <p className="text-[11px] text-dark-400 truncate">{profile?.email || 'Sin correo'}</p>
                        </div>
                        <div className="p-1.5 space-y-0.5 text-xs text-dark-900">
                          <button onClick={() => { setProfileMenuOpen(false); setShowPwdModal(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-dark-50 font-medium">
                            <Key className="w-4 h-4 text-dark-400" /><span>Cambiar contraseña</span>
                          </button>
                          <button onClick={() => { setProfileMenuOpen(false); handleLogout(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-medium">
                            <LogOut className="w-4 h-4" /><span>Cerrar sesión</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botón hamburguesa */}
                  <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)} 
                    className="p-1.5 rounded-xl text-white hover:bg-white/10 active:bg-white/20 transition-colors ml-0.5"
                    aria-label="Abrir menú"
                  >
                    {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                  </button>
                </div>
              </>
            )}
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
              <Outlet />
            </div>
          </div>
        </main>

      <ChangePasswordModal isOpen={showPwdModal} onClose={() => setShowPwdModal(false)} />
    </div>
  )
}
