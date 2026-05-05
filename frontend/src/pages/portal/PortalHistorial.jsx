import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { generarCertificado as _generarCertificado, abrirCertificado } from '../../lib/generarCertificado'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import {
  Bug, LogOut, ClipboardList, FileCheck, Calendar, Download,
  CheckCircle2, Clock, Play, ChevronRight, FileText, PlusCircle, Bell, Trash2, Shield, Send, X, Loader2, Key
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { confirmDelete, successAlert } from '../../lib/alerts'
import ChangePasswordModal from '../../components/ChangePasswordModal'

export default function PortalHistorial() {
  const { profile, logout, licenseWarning } = useAuth()
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
        const [ordenesRes, certRes, docsRes, solRes] = await Promise.all([
          supabase.from('ordenes_servicio').select('*, profiles(nombre_completo)').eq('cliente_id', profile.cliente_id).order('created_at', { ascending: false }),
          supabase.from('certificados').select(`*, ordenes_servicio!inner(*)`).eq('ordenes_servicio.cliente_id', profile.cliente_id).order('created_at', { ascending: false }),
          supabase.from('documentos_legales').select('*').order('created_at', { ascending: false }),
          supabase.from('solicitudes_servicio').select('*').eq('cliente_id', profile.cliente_id).order('created_at', { ascending: false })
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
      const { error } = await supabase.from('solicitudes_servicio').update({
        estado: estado === 'aceptada' ? 'aceptada' : 'rechazada',
        respuesta_cliente: estado,
        respuesta_fecha: new Date().toISOString(),
        motivo_rechazo: motivo,
        cotizacion_leida_por_cliente: true
      }).eq('id', sol.id)
      if (error) throw error

      if (estado === 'aceptada' && profile?.activo === false) {
        await supabase.from('clientes').update({ activo: true }).eq('id', profile.cliente_id)
        await supabase.from('profiles').update({ activo: true }).eq('id', profile.id)
      }

      toast.success('Respuesta enviada')
      window.location.reload()
    } catch { toast.error('Error al actualizar') }
  }

  async function handleDeleteSolicitud(id) {
    const isConfirmed = await confirmDelete('¿Estás seguro?', 'Ya no aparecerá en tu historial.')
    if (!isConfirmed) return
    
    try {
      const { error } = await supabase.from('solicitudes_servicio').delete().eq('id', id)
      if (error) throw error
      await successAlert('¡Eliminada!', 'Solicitud eliminada correctamente')
      setSolicitudes(solicitudes.filter(s => s.id !== id))
    } catch {
      toast.error('No se pudo eliminar la solicitud')
    }
  }

  async function marcarLeida(sol) {
    if (sol.cotizacion_leida_por_cliente) return
    await supabase.from('solicitudes_servicio').update({ cotizacion_leida_por_cliente: true }).eq('id', sol.id)
  }

  async function descargarCert(cert) {
    try {
      const orden = cert.ordenes_servicio
      // Cargar configuración para el PDF
      const { data: config } = await supabase.from('configuracion').select('*').single()
      
      // Actividades y fotos si las hay
      const [actividadesRes, fotosRes] = await Promise.all([
        supabase.from('actividades_servicio').select('*').eq('orden_id', orden.id).order('created_at', { ascending: false }),
        supabase.from('fotos_servicio').select('*').eq('orden_id', orden.id)
      ])

      await abrirCertificado({
        folio: cert.folio, 
        cliente: orden.clientes, 
        orden,
        productos: [], // En esta versión simplificada
        tecnico: orden.profiles?.nombre_completo || 'N/A',
        config,
        firma: cert.firma_url,
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
    if (!profile?.cliente_id || !profile?.empresa_id) {
      return toast.error('Error de sesión: recarga la página e inicia sesión de nuevo')
    }
    setSaving(true)
    try {
      const { data, error } = await supabase.from('solicitudes_servicio').insert({
        cliente_id: profile.cliente_id, empresa_id: profile.empresa_id,
        tipo_servicio: form.tipo_servicio, descripcion: form.descripcion,
        direccion: form.direccion, fecha_preferida: form.fecha_preferida || null,
        estado: 'pendiente'
      }).select().single()
      if (error) throw error
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
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  return (
    <>
      {/* -- Nueva Solicitud Modal -- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-[fadeInUp_0.2s_ease-out]">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-dark-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-dark-900">Nueva Solicitud</h2>
                  <p className="text-xs text-dark-500">¿Qué necesitas de nosotros?</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-dark-100 rounded-xl transition-colors text-dark-400 hover:text-dark-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSolicitud} className="px-6 py-5 space-y-5">
              <div>
                <label className="label-field">Tipo de Servicio</label>
                <select className="input-field" value={form.tipo_servicio} onChange={(e) => setForm({ ...form, tipo_servicio: e.target.value })}>
                  <option value="Desinsectación">Desinsectación (Cucarachas, Hormigas, etc.)</option>
                  <option value="Desratización">Desratización (Roedores)</option>
                  <option value="Desinfección">Desinfección (Virus, Bacterias)</option>
                  <option value="Control de Aves">Control de Aves</option>
                  <option value="Otro">Otro servicio</option>
                </select>
              </div>

              <div>
                <label className="label-field">Dirección del Servicio</label>
                <input type="text" className="input-field" placeholder="Lugar donde se requiere el servicio" required value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
              </div>

              <div>
                <label className="label-field">Fecha Preferida (Opcional)</label>
                <input type="date" className="input-field" min={new Date().toISOString().split('T')[0]} value={form.fecha_preferida} onChange={(e) => setForm({ ...form, fecha_preferida: e.target.value })} />
              </div>

              <div>
                <label className="label-field">¿Qué problema tienes?</label>
                <textarea className="input-field min-h-[100px]" placeholder="Describe el problema que presentas para analizarlo y generar una cotización..." required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 min-w-[150px]">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><Send className="w-4 h-4" /> Enviar Solicitud</>}
                </button>
                <button type="button" onClick={() => setShowModal(false)} disabled={saving} className="btn-secondary text-center">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -- Page Content -- */}
      <div className="min-h-screen bg-dark-50">
        <header className="bg-white border-b border-dark-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="w-6 h-6 text-primary-600" />
              <span className="font-bold text-dark-900">Portal de Clientes</span>
            </div>
            <div className="flex items-center gap-3">
              {canInstall && (
                <button onClick={promptInstall} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors border border-primary-200">
                  <Download className="w-3.5 h-3.5" /> Instalar App
                </button>
              )}
              <button 
                onClick={() => setShowPwdModal(true)} 
                className="p-2 text-dark-500 hover:text-dark-900 hover:bg-dark-100 rounded-lg transition-colors"
                title="Cambiar Contraseña"
              >
                <Key className="w-5 h-5" />
              </button>
              <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cerrar Sesión">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Aviso licencia vencida */}
        {licenseWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">Licencia de tu empresa vencida</p>
                <p className="text-xs text-amber-700 mt-0.5">Puedes solicitar servicios, pero el procesamiento está pausado hasta que la licencia sea renovada. Comunícate con tu proveedor para más información.</p>
              </div>
            </div>
          </div>
        )}

        {profile?.activo === false && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-start gap-3">
              <Shield className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">Cuenta suspendida</p>
                <p className="text-xs text-red-700 mt-0.5">El acceso completo a la plataforma ha sido restingido. Para reactivar tu cuenta, es necesario aprobar una de tus cotizaciones pendientes o crear una nueva solicitud de servicio.</p>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="page-title mb-1">¡Hola, {profile?.nombre_completo?.split(' ')[0]}!</h1>
          <p className="page-subtitle mb-6">Consulta tu historial de servicios y certificados</p>

          <div className="flex gap-1 bg-dark-100 p-1 rounded-xl mb-6 overflow-x-auto">
            {profile?.activo !== false && (
              <>
                <button onClick={() => setTab('historial')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'historial' ? 'bg-white text-dark-900 shadow-sm' : 'text-dark-500'}`}>
                  <ClipboardList className="w-4 h-4" /> Historial
                </button>
                <button onClick={() => setTab('certificados')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'certificados' ? 'bg-white text-dark-900 shadow-sm' : 'text-dark-500'}`}>
                  <FileCheck className="w-4 h-4" /> Certificados
                </button>
                <button onClick={() => setTab('documentos')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'documentos' ? 'bg-white text-dark-900 shadow-sm' : 'text-dark-500'}`}>
                  <FileText className="w-4 h-4" /> Documentos
                </button>
              </>
            )}
            <button onClick={() => setTab('solicitudes')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative ${tab === 'solicitudes' ? 'bg-white text-dark-900 shadow-sm' : 'text-dark-500'}`}>
              <PlusCircle className="w-4 h-4" /> Solicitudes {solicitudes.length > 0 && `(${solicitudes.length})`}
              {hasUnreadQuotes && <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full animate-ping" />}
            </button>
          </div>

          {!profile?.cliente_id ? (
            <div className="card text-center py-12">
              <p className="text-dark-500">Tu cuenta no está vinculada a un registro de clientes.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-dark-900 capitalize">Mis {tab}</h2>
                {tab === 'solicitudes' && (
                  <button onClick={() => setShowModal(true)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4" /> Nueva Solicitud
                  </button>
                )}
              </div>

              {tab === 'historial' && (
                <div className="space-y-3">
                  {ordenes.map(o => {
                    const config = estadoConfig[o.estado] || { badge: 'badge-default', label: o.estado, icon: Calendar }
                    return (
                      <Link to={`/portal/ordenes/${o.id}`} key={o.id} className="card block hover:shadow-md transition-all border border-dark-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center"><config.icon className="w-5 h-5 text-primary-600" /></div>
                            <div>
                              <p className="font-semibold text-dark-900">{new Date(o.fecha_programada).toLocaleDateString()}</p>
                              <p className="text-xs text-dark-400">{o.tipo_plaga || 'Servicio'}</p>
                            </div>
                          </div>
                          <span className={config.badge}>{config.label}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              {tab === 'certificados' && (
                <div className="space-y-3">
                  {certificados.map(cert => (
                    <div key={cert.id} className="card flex items-center justify-between">
                      <div>
                        <p className="font-medium text-dark-900">Folio: {cert.folio}</p>
                        <p className="text-xs text-dark-400">{new Date(cert.created_at).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => descargarCert(cert)} className="btn-primary text-sm flex items-center gap-2">
                         <Download className="w-4 h-4" /> PDF
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'documentos' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {documentos.map(doc => (
                    <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl border border-dark-100 hover:bg-primary-50 transition-all">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600"><FileText className="w-6 h-6" /></div>
                      <div>
                        <p className="font-bold text-dark-900">{doc.nombre}</p>
                        <p className="text-xs text-dark-400">Documento PDF</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {tab === 'solicitudes' && (
                <div className="space-y-4">
                  {solicitudes.map(sol => (
                    <div key={sol.id} className="card border-dark-100/50 bg-white shadow-sm" onMouseEnter={() => sol.estado === 'cotizada' && !sol.cotizacion_leida_por_cliente && marcarLeida(sol)}>
                      <div className="p-4 flex flex-col sm:flex-row gap-4 items-start justify-between">
                        <div className="flex gap-4 items-start">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            sol.estado === 'cotizada' ? 'bg-blue-100 text-blue-600' : 
                            sol.estado === 'aceptada' ? 'bg-green-100 text-green-600' :
                            sol.estado === 'convertida' ? 'bg-emerald-100 text-emerald-800' :
                            sol.estado === 'rechazada' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-600'
                          }`}>
                            <ClipboardList className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-dark-900">{sol.tipo_servicio}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                sol.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                                sol.estado === 'cotizada' ? 'bg-blue-100 text-blue-700' :
                                sol.estado === 'aceptada' ? 'bg-green-100 text-green-700' :
                                sol.estado === 'convertida' ? 'bg-emerald-100 text-emerald-800' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {sol.estado}
                              </span>
                            </div>
                            <p className="text-sm text-dark-600">{sol.descripcion}</p>
                            <p className="text-[10px] text-dark-400 mt-2">Solicitado: {new Date(sol.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {sol.estado === 'convertida' && sol.orden_id ? (
                          <button 
                            onClick={() => navigate(`/portal/ordenes/${sol.orden_id}`)}
                            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 shrink-0 mt-2 sm:mt-0"
                          >
                            Ver Orden <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleDeleteSolicitud(sol.id)}
                            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 shrink-0 mt-2 sm:mt-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        )}
                      </div>

                      {sol.estado === 'cotizada' && (
                        <div className="m-4 mt-0 p-5 bg-blue-50/50 border border-blue-100 rounded-2xl animate-[fadeIn_0.5s_ease-out]">
                          <div className="flex items-center gap-2 mb-3 text-blue-800">
                            <Bell className="w-4 h-4" />
                            <h4 className="font-bold text-sm">¡Cotización disponible!</h4>
                          </div>
                          <div className="mb-4">
                            <p className="text-2xl font-black text-blue-900 mb-1">${Number(sol.cotizacion_precio).toLocaleString()}</p>
                            <p className="text-sm text-blue-800 italic leading-relaxed">{sol.cotizacion_descripcion || 'Sin descripción adicional.'}</p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button onClick={() => handleResponderCotizacion(sol, 'rechazada')} className="bg-white text-dark-500 border border-dark-200 text-sm font-bold flex-1 py-2.5 rounded-xl transition-all hover:bg-red-50 hover:text-red-600">Rechazar</button>
                            <button onClick={() => handleResponderCotizacion(sol, 'aceptada')} className="bg-primary-600 text-white text-sm font-bold flex-1 py-2.5 rounded-xl transition-all hover:bg-primary-700 shadow-md shadow-primary-600/20">Aceptar Cotización</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ChangePasswordModal isOpen={showPwdModal} onClose={() => setShowPwdModal(false)} />
    </>
  )
}
