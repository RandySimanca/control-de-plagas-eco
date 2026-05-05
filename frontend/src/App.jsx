import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { OfflineProvider } from './contexts/OfflineContext'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import ClienteDetalle from './pages/ClienteDetalle'
import Ordenes from './pages/Ordenes'
import OrdenDetalle from './pages/OrdenDetalle'
import Certificados from './pages/Certificados'
import Usuarios from './pages/admin/Usuarios'
import Tecnicos from './pages/admin/Tecnicos'
import PortalLogin from './pages/portal/PortalLogin'
import PortalHistorial from './pages/portal/PortalHistorial'
import PortalOrdenDetalle from './pages/portal/PortalOrdenDetalle'
import Configuracion from './pages/admin/Configuracion'
import DocumentosLegales from './pages/admin/DocumentosLegales'
import DashboardSAAS from './pages/superadmin/DashboardSAAS'
import EmpresaForm from './pages/superadmin/EmpresaForm'
import PortalSolicitudForm from './pages/portal/PortalSolicitudForm'
import Solicitudes from './pages/admin/Solicitudes'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

function AppRoutes() {
  const { user, profile } = useAuth()

  // Quitamos el return null global para que las páginas de login no se desmonten durante la carga del perfil
  // El estado de carga lo manejará cada ruta o componente que lo necesite

  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={user && profile && profile.rol !== 'cliente' ? <Navigate to="/" /> : <Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Portal de Clientes */}
      <Route path="/portal/login" element={user && profile && profile.rol === 'cliente' ? <Navigate to="/portal" /> : <PortalLogin />} />
      <Route path="/portal" element={
        <ProtectedRoute allowedRoles={['cliente']}>
          <PortalHistorial />
        </ProtectedRoute>
      } />
      <Route path="/portal/ordenes/:id" element={
        <ProtectedRoute allowedRoles={['cliente']}>
          <PortalOrdenDetalle />
        </ProtectedRoute>
      } />
      <Route path="/portal/solicitudes/nueva" element={
        <ProtectedRoute allowedRoles={['cliente']}>
          <PortalSolicitudForm />
        </ProtectedRoute>
      } />

      {/* Portal de Superadmin SaaS */}
      <Route element={
        <ProtectedRoute allowedRoles={['superadmin']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/superadmin" element={<DashboardSAAS />} />
        <Route path="/superadmin/empresas/nueva" element={<EmpresaForm />} />
        <Route path="/superadmin/empresas/:id/editar" element={<EmpresaForm />} />
      </Route>

      {/* App Principal */}
      <Route element={
        <ProtectedRoute allowedRoles={['admin', 'tecnico', 'superadmin']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={
          <ProtectedRoute allowedRoles={['admin', 'tecnico']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        {/* Rutas de Clientes - Solo Admin */}
        <Route path="clientes" element={<ProtectedRoute allowedRoles={['admin']}><Clientes /></ProtectedRoute>} />
        <Route path="clientes/:id" element={<ProtectedRoute allowedRoles={['admin']}><ClienteDetalle /></ProtectedRoute>} />
        <Route path="ordenes" element={<Ordenes />} />
        <Route path="ordenes/:id" element={<OrdenDetalle />} />
        <Route path="certificados" element={<Certificados />} />

        {/* Admin */}
        <Route path="admin/usuarios" element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}><Usuarios /></ProtectedRoute>
        } />
        <Route path="admin/tecnicos" element={
          <ProtectedRoute allowedRoles={['admin']}><Tecnicos /></ProtectedRoute>
        } />
        <Route path="admin/configuracion" element={
          <ProtectedRoute allowedRoles={['admin']}><Configuracion /></ProtectedRoute>
        } />
        <Route path="admin/documentos" element={
          <ProtectedRoute allowedRoles={['admin']}><DocumentosLegales /></ProtectedRoute>
        } />
        <Route path="admin/solicitudes" element={
          <ProtectedRoute allowedRoles={['admin']}><Solicitudes /></ProtectedRoute>
        } />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OfflineProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: '12px', background: '#1e293b', color: '#fff', fontSize: '14px' }
            }}
          />
          <AppRoutes />
        </OfflineProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
