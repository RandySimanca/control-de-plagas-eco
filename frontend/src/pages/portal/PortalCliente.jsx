import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { generarCertificado as _generarCertificado, abrirCertificado } from '../../lib/generarCertificado'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import {
  Bug, LogOut, ClipboardList, FileCheck, Calendar, Download,
  CheckCircle2, Clock, Play, ChevronRight, FileText, PlusCircle, Bell, Trash2, Shield, Send, X, Loader2, Key
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { confirmDelete, successAlert } from '../../lib/alerts'
import ChangePasswordModal from '../../components/features/ChangePasswordModal'
import api from '../../lib/api'
import { getAuthImageUrl } from '../../utils/imageUtils'

export default function PortalCliente() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [ordenes, setOrdenes] = useState([])
  const [certificados, setCertificados] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [tab, setTab] = useState(() => {
    if (profile?.activo === false) return 'solicitudes'
    return location.state?.tab || 'historial'
  })
  const [loading, setLoading] = useState(true)

  // -- Modal State --
  const [showModal, setShowModal] = useState(false)
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    tipo_servicio: 'Desinsectación',
    descripcion: '',
    direccion: profile?.direccion || '',
    fecha_preferida: ''
  })

useEffect(() => {
    async function load() {
      if (!profile?.cliente_id) { setLoading(false); return }
      try {
        const token = localStorage.getItem('token')
        const [ordenesRes, certRes, docsRes, solRes] = await Promise.all([
          api.get('/ordenes-servicio', { token }),
          api.get('/certificados', { token }),
          api.get('/documentos-legales', { token }),
          api.get('/solicitudes-servicio', { token })
        ])

        setOrdenes(ordenesRes.data || [])
        setCertificados(certRes.data || [])
        setDocumentos(docsRes.data || [])
        setSolicitudes(solRes.data || [])
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profile])

  async function handleResponderCotizacion(sol, estado, motivo = null) {
    try {
      const token = localStorage.getItem('token')
      await api.patch(`/solicitudes-servicio/${sol.id}`, {
        estado: estado === 'aceptada' ? 'aceptada' : 'rechazada',
        respuesta_cliente: estado,
        respuesta_fecha: new Date().toISOString(),
        motivo_rechazo: motivo,
        cotizacion_leida_por_cliente: true
      }, { token })

      if (estado === 'aceptada' && profile?.activo === false) {
        await api.patch(`/clientes/${profile.cliente_id}`, { activo: true }, { token })
        await api.patch(`/profiles/${profile.id}`, { activo: true }, { token })
      }

      toast.success('Respuesta enviada')
      window.location.reload()
    } catch { toast.error('Error al actualizar') }
  }

  async function handleDeleteSolicitud(id) {
    const isConfirmed = await confirmDelete('¿Estás seguro?', 'Ya no aparecerá en tu historial.')
    if (!isConfirmed) return
    
    try {
      const token = localStorage.getItem('token')
      await api.delete(`/solicitudes-servicio/${id}`, { token })
      await successAlert('¡Eliminada!', 'Solicitud eliminada correctamente')
      setSolicitudes(solicitudes.filter(s => s.id !== id))
    } catch {
      toast.error('No se pudo eliminar la solicitud')
    }
  }

  async function marcarLeida(sol) {
    if (sol.cotizacion_leida_por_cliente) return
    const token = localStorage.getItem('token')
    await api.patch(`/solicitudes-servicio/${sol.id}`, { cotizacion_leida_por_cliente: true }, { token })
  }

  async function descargarCert(cert) {
    try {
      const orden = cert.ordenes_servicio
      // Cargar configuración para el PDF
      const token = localStorage.getItem('token')
      const { data: config } = await api.get('/configuracion', { token })
      
      // Cargar todos los datos necesarios para un informe completo
      const [actividadesRes, fotosRes, productosRes, estacionesRes] = await Promise.all([
        api.get('/actividades-servicio', { token, params: { orden_id: orden.id } }),
        api.get('/fotos-servicio', { token, params: { orden_id: orden.id } }),
        api.get('/productos-usados', { token, params: { orden_id: orden.id } }),
        api.get('/estaciones-usadas', { token, params: { orden_id: orden.id } })
      ])

      const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '').replace(/\/$/, '')
      await abrirCertificado({
        folio: cert.folio, 
        cliente: orden.clientes, 
        orden,
        productos: productosRes.data || [],
        estaciones: estacionesRes.data || [],
        tecnico: orden.profiles?.nombre_completo || 'N/A',
        config,
        firma_tecnico: cert.firma_url,
        actividades: actividadesRes.data || [],
        fotos: fotosRes.data || []
      })
    } catch {
      toast.error('Error al generar certificado')
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/portal/login')
    toast.success('Sesión cerrada')
  }

  // --- Submit Solicitud ---
  async function handleCreateSolicitud(e) {
    e.preventDefault()
    if (!form.descripcion.trim()) { return toast.error('Por favor describe lo que necesitas') }
    if (!profile?.cliente_id) {
      return toast.error('Error de sesión: recarga la página e inicia sesión de nuevo')
    }
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const data = await api.post('/solicitudes-servicio', {
        cliente_id: profile.cliente_id,
        tipo_servicio: form.tipo_servicio,
        descripcion: form.descripcion,
        direccion: form.direccion,
        fecha_preferida: form.fecha_preferida || null,
        estado: 'pendiente'
      }, { token })
      toast.success('Solicitud enviada correctamente')
      setShowModal(false)
      setSolicitudes([data, ...solicitudes]) // Add directly to UI
      setForm({ tipo_servicio: 'Desinsectación', descripcion: '', direccion: profile?.direccion || '', fecha_preferida: '' })
      setTab('solicitudes')
    } catch (err) {
      console.error('Error al enviar solicitud:', err)
      toast.error('No se pudo enviar la solicitud')
    } finally {
      setSaving(false)
    }
  }

  const estadoConfig = {
    programada: { badge: 'badge-programada', label: 'Programada', icon: Clock },
    en_progreso: { badge: 'badge-en-progreso', label: 'En Progreso', icon: Play },
    completada: { badge: 'badge-completada', label: 'Completada', icon: CheckCircle2 },
  }

  const hasUnreadQuotes = solicitudes.some(s => s.estado === 'cotizada' && !s.leida)

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-dark-50 animate-in fade-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-primary-200 rounded-full blur-xl animate-pulse opacity-50"></div>
          <Bug className="w-12 h-12 text-primary-600 relative z-10 animate-bounce" style={{ animationDuration: '2s' }} />
        </div>
        <h3 className="mt-6 text-lg font-semibold text-dark-900 tracking-tight">Cargando tu portal...</h3>
        <p className="text-sm text-dark-400 mt-1">Conectando de forma segura</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-50 relative overflow-hidden pb-12 font-sans selection:bg-primary-100 selection:text-primary-900">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-primary-50/80 via-white/40 to-transparent -z-10 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-primary-200/20 to-transparent blur-3xl -z-10" />

      {/* -- Nueva Solicitud Modal -- */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-dark-900/30 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)} />
          
          <div className="relative bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-white/40 ring-1 ring-dark-900/5">
            {/* Header Modal */}
            <div className="shrink-0 px-8 py-6 border-b border-dark-100/50 bg-white/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200/50 flex items-center justify-center shadow-sm">
                  <Send className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-dark-900 tracking-tight">Nueva Solicitud</h2>
                  <p className="text-xs font-medium text-dark-400 mt-0.5">¿Qué servicio necesitas hoy?</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-2.5 hover:bg-dark-100 rounded-full transition-colors text-dark-400 hover:text-dark-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSolicitud} className="flex-1 overflow-y-auto p-8 space-y-7 bg-white/40 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-dark-700">Tipo de Servicio</label>
                <select 
                  className="w-full bg-white border border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl px-4 py-3 text-sm transition-all shadow-sm" 
                  value={form.tipo_servicio} onChange={(e) => setForm({ ...form, tipo_servicio: e.target.value })}
                >
                  <option value="Desinsectación">Desinsectación (Cucarachas, Hormigas, etc.)</option>
                  <option value="Desratización">Desratización (Roedores)</option>
                  <option value="Desinfección">Desinfección (Virus, Bacterias)</option>
                  <option value="Control de Aves">Control de Aves</option>
                  <option value="Otro">Otro servicio</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-dark-700">Dirección del Servicio</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl px-4 py-3 text-sm transition-all shadow-sm placeholder:text-dark-300" 
                  placeholder="Lugar donde se requiere el servicio" required value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-dark-700 flex items-center justify-between">
                  Fecha Preferida <span className="text-xs text-dark-400 font-medium bg-dark-100 px-2 py-0.5 rounded-md">Opcional</span>
                </label>
                <input 
                  type="date" 
                  className="w-full bg-white border border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl px-4 py-3 text-sm transition-all shadow-sm" 
                  min={new Date().toISOString().split('T')[0]} value={form.fecha_preferida} onChange={(e) => setForm({ ...form, fecha_preferida: e.target.value })} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-dark-700">¿Qué problema tienes?</label>
                <textarea 
                  className="w-full bg-white border border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl px-4 py-3 text-sm transition-all shadow-sm placeholder:text-dark-300 min-h-[120px] custom-scrollbar" 
                  placeholder="Describe el problema que presentas para analizarlo y generar una cotización..." required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} 
                />
              </div>

              {/* Footer Modal */}
              <div className="sticky bottom-0 -mx-8 -mb-8 mt-8 px-8 py-5 bg-white/80 backdrop-blur-md border-t border-dark-100 flex flex-wrap-reverse sm:flex-nowrap items-center justify-end gap-3 z-10">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  disabled={saving} 
                  className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-dark-700 hover:text-dark-900 bg-white hover:bg-dark-50 border border-dark-200 rounded-xl shadow-sm transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="w-full sm:w-auto min-w-[180px] px-8 py-2.5 text-sm font-bold text-white bg-dark-900 hover:bg-dark-800 hover:shadow-lg hover:shadow-dark-900/20 border border-transparent rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Enviar Solicitud</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -- Page Content -- */}
      <div className="bg-dark-900">
        <header className="sticky top-0 z-40 bg-dark-900/90 backdrop-blur-xl border-b border-dark-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-md">
                <Bug className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white tracking-tight hidden sm:block">PlagControl Portal</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {canInstall && (
                <button 
                  onClick={promptInstall} 
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-dark-900 bg-white hover:bg-primary-50 rounded-lg transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Instalar App</span>
                </button>
              )}
              <button 
                onClick={() => setShowPwdModal(true)} 
                className="p-2.5 text-dark-300 hover:text-white hover:bg-dark-800 rounded-xl transition-colors"
                title="Cambiar Contraseña"
              >
                <Key className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-dark-700 mx-1"></div>
              <button 
                onClick={handleLogout} 
                className="p-2.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors flex items-center gap-2" 
                title="Cerrar Sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {profile?.activo === false && (
          <div className="bg-red-500 border-b border-red-600 px-4 py-3">
            <div className="max-w-5xl mx-auto flex items-start gap-3">
              <Shield className="w-5 h-5 text-white shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-white">Cuenta suspendida</p>
                <p className="text-xs text-red-100 mt-0.5">El acceso completo a la plataforma ha sido restringido. Para reactivar tu cuenta, es necesario aprobar una de tus cotizaciones pendientes o crear una nueva solicitud de servicio.</p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-10 pb-24 px-4 sm:px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 pointer-events-none" />
          
          <div className="max-w-5xl mx-auto relative z-10">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">¡Hola, {profile?.nombre_completo?.split(' ')[0]}!</h1>
            <p className="text-base text-dark-300">Bienvenido a tu panel de control. Aquí puedes gestionar todos tus servicios.</p>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 -mt-12 relative z-20">
        {/* Tabs Premium Contrast */}
        <div className="flex gap-2 p-1.5 bg-white shadow-xl shadow-dark-200/20 rounded-2xl mb-8 overflow-x-auto no-scrollbar border border-dark-100">
          {profile?.activo !== false && (
            <>
              <button 
                onClick={() => setTab('historial')} 
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap ${tab === 'historial' ? 'bg-dark-900 text-white shadow-md' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-50'}`}
              >
                <ClipboardList className="w-4 h-4" /> Historial
              </button>
              <button 
                onClick={() => setTab('certificados')} 
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap ${tab === 'certificados' ? 'bg-dark-900 text-white shadow-md' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-50'}`}
              >
                <FileCheck className="w-4 h-4" /> Certificados
              </button>
              <button 
                onClick={() => setTab('documentos')} 
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap ${tab === 'documentos' ? 'bg-dark-900 text-white shadow-md' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-50'}`}
              >
                <FileText className="w-4 h-4" /> Documentos
              </button>
            </>
          )}
          <button 
            onClick={() => setTab('solicitudes')} 
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap relative ${tab === 'solicitudes' ? 'bg-dark-900 text-white shadow-md' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-50'}`}
          >
            <PlusCircle className="w-4 h-4" /> Solicitudes {solicitudes.length > 0 && `(${solicitudes.length})`}
            {hasUnreadQuotes && <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full animate-pulse ring-2 ring-white" />}
          </button>
        </div>

        {!profile?.cliente_id ? (
          <div className="bg-white rounded-3xl border border-dark-100 shadow-xl shadow-dark-200/10 p-12 text-center">
            <div className="w-16 h-16 bg-dark-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-dark-100 shadow-sm">
              <Shield className="w-8 h-8 text-dark-300" />
            </div>
            <h3 className="text-lg font-bold text-dark-900 mb-1">Cuenta no vinculada</h3>
            <p className="text-sm text-dark-500 max-w-md mx-auto">Tu cuenta de usuario no está enlazada a un expediente de cliente. Contacta a soporte para solucionar esto.</p>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-dark-900 capitalize flex items-center gap-2">
                {tab === 'historial' && <ClipboardList className="w-5 h-5 text-primary-600" />}
                {tab === 'certificados' && <FileCheck className="w-5 h-5 text-primary-600" />}
                {tab === 'documentos' && <FileText className="w-5 h-5 text-primary-600" />}
                {tab === 'solicitudes' && <PlusCircle className="w-5 h-5 text-primary-600" />}
                Mis {tab}
              </h2>
              {tab === 'solicitudes' && (
                <button 
                  onClick={() => setShowModal(true)} 
                  className="group relative inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out bg-dark-900 border border-transparent rounded-full shadow-md hover:bg-dark-800 hover:shadow-lg hover:shadow-dark-900/20 hover:-translate-y-0.5"
                >
                  <PlusCircle className="w-4 h-4 transition-transform group-hover:rotate-90" /> Nueva Solicitud
                </button>
              )}
            </div>

            {/* TAB CONTENT: HISTORIAL */}
            {tab === 'historial' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ordenes.length === 0 ? (
                  <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-dark-100 shadow-sm">
                    <ClipboardList className="w-12 h-12 text-dark-200 mx-auto mb-3" />
                    <p className="text-dark-500 font-medium">Aún no tienes historial de servicios</p>
                  </div>
                ) : (
                  ordenes.map(o => {
                    const config = estadoConfig[o.estado] || { badge: 'bg-dark-50 text-dark-700 ring-dark-500/20', label: o.estado, icon: Calendar }
                    // Update badge to use premium rings instead of full background
                    let badgeStyles = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset '
                    if (o.estado === 'programada') badgeStyles += 'bg-blue-50 text-blue-700 ring-blue-600/20'
                    else if (o.estado === 'en_progreso') badgeStyles += 'bg-amber-50 text-amber-700 ring-amber-600/20'
                    else if (o.estado === 'completada') badgeStyles += 'bg-green-50 text-green-700 ring-green-600/20'
                    else badgeStyles += 'bg-dark-50 text-dark-700 ring-dark-500/20'

                    return (
                      <Link 
                        to={`/portal/ordenes/${o.id}`} 
                        key={o.id} 
                        className="group bg-white rounded-[1.5rem] p-5 sm:p-6 border border-dark-100/60 shadow-sm hover:shadow-2xl hover:shadow-primary-500/10 hover:border-primary-300 hover:-translate-y-1 transition-all duration-300 block relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-400/10 rounded-full blur-2xl -mr-10 -mt-10 transition-opacity opacity-0 group-hover:opacity-100"></div>
                        <div className="flex items-start justify-between mb-4 relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-dark-50 to-dark-100 border border-dark-200/50 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 group-hover:shadow-md group-hover:from-primary-50 group-hover:to-primary-100 group-hover:border-primary-200 transition-all duration-300">
                              <config.icon className="w-6 h-6 text-dark-600 group-hover:text-primary-600 transition-colors" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-1">Visita Programada</p>
                              <p className="text-base font-bold text-dark-900 group-hover:text-primary-700 transition-colors">{new Date(o.fecha_programada).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <span className={badgeStyles}>{config.label}</span>
                        </div>
                        <div className="bg-dark-50 rounded-xl p-3 flex items-center justify-between group-hover:bg-primary-50 transition-colors relative z-10 border border-transparent group-hover:border-primary-100">
                          <span className="text-sm font-bold text-dark-600 group-hover:text-primary-800">{o.tipo_plaga || 'Servicio General'}</span>
                          <ChevronRight className="w-4 h-4 text-dark-300 group-hover:text-primary-600 transition-colors" />
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
            )}

            {/* TAB CONTENT: CERTIFICADOS */}
            {tab === 'certificados' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {certificados.length === 0 ? (
                  <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-dark-100 shadow-sm">
                    <FileCheck className="w-12 h-12 text-dark-200 mx-auto mb-3" />
                    <p className="text-dark-500 font-medium">No hay certificados emitidos</p>
                  </div>
                ) : (
                  certificados.map(cert => (
                    <div key={cert.id} className="group bg-gradient-to-b from-white to-dark-50/30 rounded-[1.5rem] p-5 sm:p-6 border border-dark-100/80 shadow-sm hover:shadow-xl hover:shadow-green-500/10 hover:border-green-300 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-400/10 rounded-full blur-2xl -ml-10 -mb-10 transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none"></div>
                      <div className="flex-1 flex items-start gap-4 mb-5 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-dark-50 to-dark-100 border border-dark-200/50 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 group-hover:shadow-md group-hover:from-green-50 group-hover:to-green-100 group-hover:border-green-200 transition-all duration-300">
                          <FileCheck className="w-6 h-6 text-dark-600 group-hover:text-green-600 transition-colors" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-1">Certificado Oficial</p>
                          <p className="text-sm font-bold text-dark-900 break-all group-hover:text-green-800 transition-colors">Folio: {cert.folio}</p>
                          <p className="text-xs font-medium text-dark-500 mt-0.5">{new Date(cert.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => descargarCert(cert)} 
                        className="relative z-10 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-dark-700 bg-white border border-dark-200 hover:border-green-400 hover:bg-green-50 hover:text-green-700 rounded-xl transition-all shadow-sm hover:shadow"
                      >
                         <Download className="w-4 h-4" /> Descargar PDF
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: DOCUMENTOS */}
            {tab === 'documentos' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documentos.length === 0 ? (
                  <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-dark-100 shadow-sm">
                    <FileText className="w-12 h-12 text-dark-200 mx-auto mb-3" />
                    <p className="text-dark-500 font-medium">No hay documentos de interés general</p>
                  </div>
                ) : (
                  documentos.map(doc => (
                    <a 
                      key={doc.id} 
                      href={getAuthImageUrl(doc.url)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="group bg-white rounded-[1.5rem] p-4 border border-dark-100/80 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-blue-50/0 group-hover:from-blue-50/50 transition-colors pointer-events-none"></div>
                      <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-dark-50 to-dark-100 border border-dark-200/50 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 group-hover:shadow-md group-hover:from-blue-50 group-hover:to-blue-100 group-hover:border-blue-200 transition-all duration-300">
                        <FileText className="w-6 h-6 text-dark-600 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <div className="min-w-0 relative z-10">
                        <p className="text-sm font-bold text-dark-900 truncate group-hover:text-blue-800 transition-colors">{doc.nombre}</p>
                        <p className="text-xs font-medium text-dark-400 mt-0.5 group-hover:text-blue-600/70">Visor PDF</p>
                      </div>
                    </a>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: SOLICITUDES */}
            {tab === 'solicitudes' && (
              <div className="space-y-4">
                {solicitudes.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-dark-100 shadow-sm">
                    <Send className="w-12 h-12 text-dark-200 mx-auto mb-3" />
                    <p className="text-dark-500 font-medium mb-4">No tienes solicitudes activas</p>
                    <button 
                      onClick={() => setShowModal(true)} 
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white transition-all bg-dark-900 border border-transparent rounded-full shadow-md hover:bg-dark-800"
                    >
                      <PlusCircle className="w-4 h-4" /> Crear Solicitud
                    </button>
                  </div>
                ) : (
                  solicitudes.map(sol => {
                    // Modern state styling for requests
                    let stateColors = ''
                    let stateIcon = null
                    if (sol.estado === 'pendiente') { stateColors = 'bg-amber-100 text-amber-700 ring-amber-600/20'; stateIcon = <Clock className="w-4 h-4" /> }
                    else if (sol.estado === 'cotizada') { stateColors = 'bg-blue-100 text-blue-700 ring-blue-600/20'; stateIcon = <Bell className="w-4 h-4" /> }
                    else if (sol.estado === 'aceptada') { stateColors = 'bg-green-100 text-green-700 ring-green-600/20'; stateIcon = <CheckCircle2 className="w-4 h-4" /> }
                    else if (sol.estado === 'convertida') { stateColors = 'bg-emerald-100 text-emerald-800 ring-emerald-600/20'; stateIcon = <CheckCircle2 className="w-4 h-4" /> }
                    else { stateColors = 'bg-red-100 text-red-700 ring-red-600/20'; stateIcon = <X className="w-4 h-4" /> }

                    return (
                      <div 
                        key={sol.id} 
                        className={`group bg-white rounded-[1.5rem] border ${sol.estado === 'cotizada' && !sol.cotizacion_leida_por_cliente ? 'border-blue-400 shadow-blue-500/20 shadow-xl ring-2 ring-blue-50' : 'border-dark-100/80 shadow-sm hover:shadow-2xl hover:shadow-dark-900/5 hover:-translate-y-1'} transition-all duration-300 overflow-hidden relative`}
                        onMouseEnter={() => sol.estado === 'cotizada' && !sol.cotizacion_leida_por_cliente && marcarLeida(sol)}
                      >
                        {/* Soft full-card color gradient on hover using custom cyan #76EFF5 */}
                        <div className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br from-[#76EFF5]/10 to-[#76EFF5]/30"></div>

                        <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start justify-between relative z-10">
                          <div className="flex gap-4 sm:gap-5 items-start w-full">
                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                              sol.estado === 'cotizada' ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 text-blue-600' : 
                              sol.estado === 'aceptada' || sol.estado === 'convertida' ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600' :
                              sol.estado === 'rechazada' ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 text-red-600' :
                              'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 text-amber-600'
                            }`}>
                              <ClipboardList className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <h3 className="font-bold text-base sm:text-lg text-dark-900 tracking-tight">{sol.tipo_servicio}</h3>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${stateColors}`}>
                                  {stateIcon}
                                  {sol.estado}
                                </span>
                              </div>
                              <p className="text-sm text-dark-600 leading-relaxed max-w-3xl">{sol.descripcion}</p>
                              <p className="text-xs font-semibold text-dark-400 mt-3 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" /> Enviada el {new Date(sol.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 w-full sm:w-auto flex justify-end mt-2 sm:mt-0">
                            {sol.estado === 'convertida' && sol.orden_id ? (
                              <button 
                                onClick={() => navigate(`/portal/ordenes/${sol.orden_id}`)}
                                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-dark-900 bg-white border border-dark-200 hover:border-dark-300 hover:bg-dark-50 rounded-xl transition-all flex items-center justify-center gap-2"
                              >
                                Ver Orden <ChevronRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleDeleteSolicitud(sol.id)}
                                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-red-600 bg-white border border-dark-200 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all flex items-center justify-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" /> Eliminar
                              </button>
                            )}
                          </div>
                        </div>

                        {sol.estado === 'cotizada' && (
                          <div className="mx-5 sm:mx-6 mb-5 sm:mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/40 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                            
                            <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-3 text-blue-800">
                                <Bell className="w-5 h-5 animate-bounce" style={{ animationDuration: '2s' }} />
                                <h4 className="font-bold text-base tracking-tight">¡Hemos generado tu cotización!</h4>
                              </div>
                              <div className="mb-6 flex flex-col md:flex-row md:items-end gap-4 md:gap-8">
                                <div>
                                  <p className="text-xs font-bold text-blue-600/70 uppercase tracking-wider mb-1">Precio Acordado</p>
                                  <p className="text-3xl font-black text-blue-900 tracking-tight">${Number(sol.precio_cotizacion).toLocaleString()}</p>
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-blue-600/70 uppercase tracking-wider mb-1">Detalles</p>
                                  <p className="text-sm font-medium text-blue-800 leading-relaxed bg-white/50 p-3 rounded-xl border border-white/60">{sol.descripcion_cotizacion || 'Sin detalles adicionales especificados.'}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap sm:flex-nowrap gap-3">
                                <button 
                                  onClick={() => handleResponderCotizacion(sol, 'rechazada')} 
                                  className="w-full sm:w-1/3 px-5 py-3 text-sm font-bold text-dark-600 bg-white border border-dark-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 rounded-xl transition-all"
                                >
                                  Rechazar Oferta
                                </button>
                                <button 
                                  onClick={() => handleResponderCotizacion(sol, 'aceptada')} 
                                  className="w-full sm:w-2/3 px-5 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                >
                                  <CheckCircle2 className="w-5 h-5" /> Aceptar y Confirmar Servicio
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <ChangePasswordModal isOpen={showPwdModal} onClose={() => setShowPwdModal(false)} />
    </div>
  )
}
