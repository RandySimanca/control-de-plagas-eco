import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, LogOut } from 'lucide-react'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading, licenseExpired, logout } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Si se requieren roles pero no hay perfil, redirigir al login
  if (allowedRoles && !profile) return <Navigate to="/login" replace />

  if (profile && profile.activo === false && profile.rol !== 'cliente') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center z-50 fixed inset-0">
        <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full border border-slate-700 shadow-2xl">
          <div className="bg-red-500/20 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Cuenta Inactiva</h2>
          <p className="text-slate-300 mb-6">
            Tu cuenta ha sido desactivada temporálmente. Por favor, contacta a tu administrador para solicitar acceso.
          </p>
          <button onClick={() => { logout(); window.location.href='/login' }} className="w-full flex justify-center items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium transition-colors">
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(profile.rol)) {
    if (profile.rol === 'superadmin') return <Navigate to="/superadmin" replace />
    if (profile.rol === 'cliente') return <Navigate to="/portal" replace />
    return <Navigate to="/" replace />
  }

  // Suspender acceso si la licencia del tenant expiró (Superadmin y clientes lo ignoran)
  if (licenseExpired && profile?.rol !== 'cliente') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center z-50 fixed inset-0">
        <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full border border-slate-700 shadow-2xl">
          <div className="bg-red-500/20 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Licencia Suspendida</h2>
          <p className="text-slate-300 mb-6">
            El acceso al sistema ha sido bloqueado. Por favor, contacta con el proveedor de tu sistema para regularizar el estado de tu licencia.
          </p>
        </div>
      </div>
    )
  }

  return children
}
