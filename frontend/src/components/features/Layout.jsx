import { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Users, ClipboardList, FileCheck, UserCog,
  Menu, X, LogOut, Shield, Bug, Download, ClipboardCheck,
  WifiOff, RefreshCw, Key, Search, Bell, ChevronDown
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
  const { isOnline, isSyncing, pendingCount, syncAll } = useOffline()
  const { nombreEmpresa, logoUrl } = useConfig()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { canInstall, isReady, promptInstall } = useInstallPrompt()
  const [requestCount, setRequestCount] = useState(0)
  const [showPwdModal, setShowPwdModal] = useState(false)

  // Actualizar última vez visto cuando entra a la página
  useEffect(() => {
    if (location.pathname === '/admin/solicitudes') {
      localStorage.setItem('admin_last_viewed_solicitudes', new Date().toISOString())
      setTimeout(() => setRequestCount(0), 0)
    }
  }, [location.pathname])

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Panel' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/ordenes', icon: ClipboardList, label: 'Órdenes' },
    { to: '/certificados', icon: FileCheck, label: 'Certificados' },
  ].filter(item => {
    if (item.to === '/clientes' && profile?.rol === 'tecnico') return false
    return true
  })

  if (isAdmin) {
    navItems.push({ to: '/admin/usuarios', icon: UserCog, label: 'Usuarios' })
    navItems.push({ to: '/admin/configuracion', icon: Shield, label: 'Configuración' })
    navItems.push({ to: '/admin/solicitudes', icon: ClipboardCheck, label: 'Solicitudes', badge: requestCount })
  }

  const loadRequestCount = useCallback(async () => {
    // Si estamos en la página, no mostramos el badge
    if (location.pathname === '/admin/solicitudes') {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const lastViewed = localStorage.getItem('admin_last_viewed_solicitudes')
      const params = new URLSearchParams({
        estado: ['pendiente', 'aceptada'].join(','),
        ...(lastViewed && { updated_after: lastViewed })
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

  const linkClasses = ({ isActive }) =>
    `flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold ${isActive
      ? 'bg-primary-50 text-primary-700'
      : 'text-dark-500 hover:bg-dark-50 hover:text-dark-900'
    }`

  return (
    <div className="h-screen flex flex-col md:flex-row bg-dark-100">

      {/* Banner sin conexión / sincronizando */}
      {(!isOnline || isSyncing) && (
        <div className={`fixed top-0 left-0 right-0 z-9999 flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-white transition-all ${isSyncing ? 'bg-amber-500' : 'bg-red-500'
          }`}>
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
        <div className="hidden md:flex items-center gap-3 px-6 py-6 shrink-0">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm shadow-primary-600/20">
            {logoUrl ? (
              <img src={getAuthImageUrl(logoUrl)} alt="Logo Empresa" className="w-full h-full object-contain bg-white" />
            ) : (
              <Bug className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="min-w-0 flex flex-col">
            <h1 className={`font-bold ${nombreEmpresa.length > 15 ? 'text-base' : 'text-lg'} text-dark-900 leading-tight truncate`} title={nombreEmpresa}>
              {nombreEmpresa}
            </h1>
            <p className="text-xs font-medium text-dark-400 truncate">Control de Plagas</p>
          </div>
        </div>
      

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto mt-14 md:mt-0 min-h-0">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={linkClasses}
              onClick={() => setSidebarOpen(false)}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
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
                className={`flex items-center gap-2 w-full justify-start text-sm px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all duration-200 mb-2 ${isReady
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-600/20'
                  : 'bg-dark-200 text-dark-500 cursor-not-allowed opacity-80'
                  }`}
              >
                <Download className="w-5 h-5 shrink-0" />
                <span>{isReady ? 'Instalar App' : 'Preparando Instalación...'}</span>
              </button>
            </div>
          )}
          {/* Indicador PWA */}
          {window.location.hostname !== 'localhost' && (
            <div className="flex items-center gap-1.5 px-4 py-1.5">
              <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
              <p className="text-[9px] text-dark-400 font-medium">
                PWA: {isReady ? 'Listo para instalar' : 'Esperando navegador...'}
              </p>
            </div>
          )}

          {/* Usuario */}
          <div className="p-4 border-t border-dark-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark-900 truncate">{profile?.nombre_completo}</p>
                <p className="text-xs text-red-500 capitalize">{profile?.rol}</p>
              </div>
            </div>
            <div className="space-y-1">
              <button onClick={() => setShowPwdModal(true)} className="btn-ghost w-full justify-start text-sm text-dark-600 hover:bg-dark-50">
                <Key className="w-4 h-4" /> Cambiar contraseña
              </button>
              <button onClick={handleLogout} className="btn-ghost w-full justify-start text-sm text-red-600 hover:bg-red-50">
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          </div>
          <div className="px-4 py-2 border-t border-dark-100 flex items-center gap-1.5">
            <Bug className="w-3.5 h-3.5 text-dark-300" />
            <p className="text-[10px] text-dark-400">Con tecnología de PlagControl</p>
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
            <div className="relative group">
              <Search className="w-4 h-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-primary-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar cliente, orden, técnico..." 
                className="pl-9 pr-4 py-2 w-[280px] bg-white border border-dark-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all shadow-sm"
              />
            </div>
            <button className="relative p-2 text-dark-400 hover:text-dark-900 transition-colors">
              <Bell className="w-5 h-5" />
              {requestCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>
            <div className="flex items-center gap-2 cursor-pointer hover:bg-dark-50 py-1 px-2 rounded-xl transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center border border-primary-200">
                <Shield className="w-4 h-4 text-primary-700" />
              </div>
              <ChevronDown className="w-4 h-4 text-dark-400" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Cabecera móvil en color verde para técnico/admin */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 bg-primary-700 text-white border-b border-primary-800 shadow-sm shrink-0">
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
              <span className="font-bold text-base text-white truncate max-w-[180px]">{nombreEmpresa}</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 rounded-xl text-white hover:bg-white/10 active:bg-white/20 transition-colors"
              aria-label="Abrir menú"
            >
              {sidebarOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
          </header>

          <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
            <Outlet />
          </div>
        </div>
      </main>

      <ChangePasswordModal isOpen={showPwdModal} onClose={() => setShowPwdModal(false)} />
    </div>
  )
}
