import { useState, useEffect } from 'react'
import api from '../lib/api'

import { abrirInformeActividades } from '../lib/generarInformeActividades'
import { abrirInformeTecnico } from '../lib/generarInformeTecnico'
import { abrirCertificadoSanitario } from '../lib/generarCertificadoSanitario'
import { FileCheck, Download, Search, Calendar, ShieldCheck, ShieldX, Clock, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import HelpButton from '../components/features/HelpButton'
import { HELP_CONTENT } from '../lib/helpContent'

export default function Certificados() {
  const { isAdmin, profile } = useAuth()
  const [certificados, setCertificados] = useState([])
  const [informesTecnicos, setInformesTecnicos] = useState([])
  const [certificadosSanitarios, setCertificadosSanitarios] = useState([])
  const [activeTab, setActiveTab] = useState('todos')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [aprobando, setAprobando] = useState(null)

  useEffect(() => { 
    if (profile || isAdmin) load() 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isAdmin])

  async function load() {
    try {
      const token = localStorage.getItem('token')
      const [certRes, informesRes, certSanRes] = await Promise.all([
        api.get('/certificados', { token }),
        api.get('/informes-tecnicos', { token }),
        api.get('/certificados-sanitarios', { token })
      ])
      setCertificados(certRes.data || [])
      setInformesTecnicos(informesRes.data || [])
      setCertificadosSanitarios(certSanRes.data || [])
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al cargar informes y documentos')
    } finally {
      setLoading(false)
    }
  }

  async function handleAprobarCert(cert) {
    setAprobando(`cert-${cert.id}`)
    try {
      const token = localStorage.getItem('token')
      await api.patch(`/certificados/${cert.id}/aprobar`, {}, { token })
      toast.success(`Informe General de Actividades ${cert.folio} aprobado y visible para el cliente`)
      setCertificados(prev => prev.map(c => c.id === cert.id ? { ...c, aprobado: true } : c))
    } catch {
      toast.error('Error al aprobar informe')
    } finally {
      setAprobando(null)
    }
  }

  async function handleRechazarCert(cert) {
    setAprobando(`cert-${cert.id}`)
    try {
      const token = localStorage.getItem('token')
      await api.patch(`/certificados/${cert.id}/rechazar`, {}, { token })
      toast.success(`Informe General de Actividades ${cert.folio} ocultado del portal del cliente`)
      setCertificados(prev => prev.map(c => c.id === cert.id ? { ...c, aprobado: false } : c))
    } catch {
      toast.error('Error al actualizar informe')
    } finally {
      setAprobando(null)
    }
  }

  async function handleAprobarInforme(informe) {
    setAprobando(`informe-${informe.id}`)
    try {
      const token = localStorage.getItem('token')
      await api.patch(`/informes-tecnicos/${informe.id}/aprobar`, {}, { token })
      toast.success(`Informe ${informe.folio} aprobado y visible para el cliente`)
      setInformesTecnicos(prev => prev.map(i => i.id === informe.id ? { ...i, aprobado: true } : i))
    } catch {
      toast.error('Error al aprobar informe técnico')
    } finally {
      setAprobando(null)
    }
  }

  async function handleRechazarInforme(informe) {
    setAprobando(`informe-${informe.id}`)
    try {
      const token = localStorage.getItem('token')
      await api.patch(`/informes-tecnicos/${informe.id}/rechazar`, {}, { token })
      toast.success(`Informe ${informe.folio} ocultado del portal del cliente`)
      setInformesTecnicos(prev => prev.map(i => i.id === informe.id ? { ...i, aprobado: false } : i))
    } catch {
      toast.error('Error al actualizar informe técnico')
    } finally {
      setAprobando(null)
    }
  }

  async function handleAprobarCertificadoSanitario(cert) {
    setAprobando(`certsan-${cert.id}`)
    try {
      const token = localStorage.getItem('token')
      await api.patch(`/certificados-sanitarios/${cert.id}/aprobar`, {}, { token })
      toast.success(`Certificado Sanitario ${cert.folio} aprobado y visible para el cliente`)
      setCertificadosSanitarios(prev => prev.map(c => c.id === cert.id ? { ...c, aprobado: true } : c))
    } catch {
      toast.error('Error al aprobar certificado sanitario')
    } finally {
      setAprobando(null)
    }
  }

  async function handleRechazarCertificadoSanitario(cert) {
    setAprobando(`certsan-${cert.id}`)
    try {
      const token = localStorage.getItem('token')
      await api.patch(`/certificados-sanitarios/${cert.id}/rechazar`, {}, { token })
      toast.success(`Certificado Sanitario ${cert.folio} ocultado del portal del cliente`)
      setCertificadosSanitarios(prev => prev.map(c => c.id === cert.id ? { ...c, aprobado: false } : c))
    } catch {
      toast.error('Error al actualizar certificado sanitario')
    } finally {
      setAprobando(null)
    }
  }

  async function descargarCertificado(cert) {
    try {
      const orden = cert.ordenes_servicio
      const token = localStorage.getItem('token')
      const configRes = await api.get('/configuracion', { token })
      const config = configRes.data
      
      const [actividadesRes, fotosRes, productosRes, estacionesRes] = await Promise.all([
        api.get('/actividades-servicio', { token, params: { orden_id: orden.id } }),
        api.get('/fotos-servicio', { token, params: { orden_id: orden.id } }),
        api.get('/productos-usados', { token, params: { orden_id: orden.id } }),
        api.get('/estaciones-usadas', { token, params: { orden_id: orden.id } })
      ])
      
      await abrirInformeActividades({
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
    } catch (err) {
      console.error('Error generando certificado:', err)
      toast.error('Error al generar el PDF: ' + err.message)
    }
  }

  async function descargarInforme(informe) {
    try {
      const orden = informe.ordenes_servicio
      const token = localStorage.getItem('token')
      const configRes = await api.get('/configuracion', { token })
      const config = configRes.data

      await abrirInformeTecnico({
        orden,
        cliente: orden.clientes,
        relevamiento: informe,
        config,
        tecnico: orden.profiles || {},
        folio: informe.folio
      })
    } catch (err) {
      console.error('Error generando informe:', err)
      toast.error('Error al generar el PDF: ' + err.message)
    }
  }

  async function descargarCertificadoSanitario(cert) {
    try {
      const orden = cert.ordenes_servicio
      const token = localStorage.getItem('token')
      const configRes = await api.get('/configuracion', { token })
      const config = configRes.data
      const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '').replace(/\/$/, '')
      
      await abrirCertificadoSanitario({
        certificado: cert,
        orden,
        cliente: orden.clientes,
        config,
        folio: cert.folio,
        baseUrl: API_BASE
      })
    } catch (err) {
      console.error('Error generando certificado sanitario:', err)
      toast.error('Error al generar el PDF: ' + err.message)
    }
  }

  // Agrupar documentos por orden
  const documentosPorOrden = {}
  
  const agregarDocumento = (doc, tipo) => {
    const ordenId = doc.ordenes_servicio?.id
    if (!ordenId) return
    
    if (!documentosPorOrden[ordenId]) {
      documentosPorOrden[ordenId] = {
        ordenId,
        orden: doc.ordenes_servicio,
        cliente: doc.ordenes_servicio?.clientes,
        fechaCreacion: doc.created_at || doc.informe_generado_at,
        documentos: []
      }
    }
    
    documentosPorOrden[ordenId].documentos.push({
      tipo,
      id: doc.id,
      folio: doc.folio,
      aprobado: doc.aprobado,
      created_at: doc.created_at || doc.informe_generado_at,
      raw: doc
    })
  }
  
  certificados.forEach(c => agregarDocumento(c, 'certificado'))
  informesTecnicos.forEach(i => agregarDocumento(i, 'informe_tecnico'))
  certificadosSanitarios.forEach(cs => agregarDocumento(cs, 'certificado_sanitario'))
  
  const ordenesAgrupadas = Object.values(documentosPorOrden).sort((a, b) => 
    new Date(b.fechaCreacion) - new Date(a.fechaCreacion)
  )

  const filteredGroups = ordenesAgrupadas.filter(grupo => {
    const nombreCliente = grupo.cliente?.nombre?.toLowerCase() || ''
    const searchTerm = search.toLowerCase()
    
    const tieneDocumentoMatch = grupo.documentos.some(doc => 
      (doc.folio?.toLowerCase() || '').includes(searchTerm)
    )
    
    if (activeTab === 'certificados' && !grupo.documentos.some(d => d.tipo === 'certificado')) return false
    if (activeTab === 'informes' && !grupo.documentos.some(d => d.tipo === 'informe_tecnico')) return false
    if (activeTab === 'sanitarios' && !grupo.documentos.some(d => d.tipo === 'certificado_sanitario')) return false
    
    return tieneDocumentoMatch || nombreCliente.includes(searchTerm)
  })

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  const todosLosDocumentos = [
    ...certificados,
    ...informesTecnicos,
    ...certificadosSanitarios
  ]

  const pendientes = todosLosDocumentos.filter(d => !d.aprobado).length
  const totalDocumentos = todosLosDocumentos.length

  const tabCounts = {
    todos: todosLosDocumentos.length,
    certificados: certificados.length,
    informes: informesTecnicos.length,
    sanitarios: certificadosSanitarios.length
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="page-title">Informes de Actividades</h1>
          <HelpButton title="Informes de Actividades" content={HELP_CONTENT.certificados} />
        </div>
        <div className="flex items-center gap-3 mt-1">
          <p className="page-subtitle">{totalDocumentos} documentos generados ({certificados.length} informes, {informesTecnicos.length} informes técnicos, {certificadosSanitarios.length} certificados sanitarios)</p>
          {isAdmin && pendientes > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
              {pendientes} pendiente{pendientes > 1 ? 's' : ''} de aprobación
            </span>
          )}
        </div>
      </div>

      {isAdmin && pendientes > 0 && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Documentos pendientes de revisión</p>
            <p className="text-xs text-amber-600 mt-0.5">Revise y apruebe informes de actividades e informes técnicos antes de que sean visibles para los clientes. Puede editar la orden antes de aprobar.</p>
          </div>
        </div>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" placeholder="Buscar por folio o cliente..." />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('todos')}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
            activeTab === 'todos' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-dark-600 hover:bg-dark-50 border border-dark-200'
          }`}
        >
          Todos ({tabCounts.todos})
        </button>
        <button
          onClick={() => setActiveTab('certificados')}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
            activeTab === 'certificados' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-dark-600 hover:bg-dark-50 border border-dark-200'
          }`}
        >
          Informes ({tabCounts.certificados})
        </button>
        <button
          onClick={() => setActiveTab('informes')}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
            activeTab === 'informes' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-dark-600 hover:bg-dark-50 border border-dark-200'
          }`}
        >
          Informes Técnicos ({tabCounts.informes})
        </button>
        <button
          onClick={() => setActiveTab('sanitarios')}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
            activeTab === 'sanitarios' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-white text-dark-600 hover:bg-dark-50 border border-dark-200'
          }`}
        >
          Certificados Sanitarios ({tabCounts.sanitarios})
        </button>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="card text-center py-12">
          <FileCheck className="w-12 h-12 text-dark-300 mx-auto mb-3" />
          <p className="text-dark-500">No hay informes ni documentos generados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(grupo => {
            const hasPendientes = grupo.documentos.some(d => !d.aprobado)
            
            return (
              <div key={`grupo-${grupo.ordenId}`} className={`card flex flex-col gap-3 ${hasPendientes && isAdmin ? 'border-l-4 border-l-amber-400' : ''}`}>
                <div className="flex items-center justify-between border-b border-dark-100 pb-3 mb-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-dark-50 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-dark-500" />
                    </div>
                    <div>
                      <p className="font-bold text-dark-900">{grupo.cliente?.nombre}</p>
                      <p className="text-xs text-dark-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" /> Orden del {new Date(grupo.orden?.fecha_programada || grupo.fechaCreacion).toLocaleDateString('es')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 pl-2">
                  {grupo.documentos.map(doc => {
                    const isInforme = doc.tipo === 'informe_tecnico'
                    const isCertSanitario = doc.tipo === 'certificado_sanitario'
                    const aprobandoId = isInforme ? `informe-${doc.id}` : isCertSanitario ? `certsan-${doc.id}` : `cert-${doc.id}`

                    return (
                      <div key={`${doc.tipo}-${doc.id}`} className="flex flex-wrap sm:flex-nowrap items-center justify-between bg-dark-50/50 p-2.5 rounded-lg border border-dark-100 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${doc.aprobado ? 'bg-green-100' : 'bg-amber-100'}`}>
                            {doc.aprobado ? <ShieldCheck className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                isInforme ? 'bg-indigo-100 text-indigo-700' : 
                                isCertSanitario ? 'bg-emerald-100 text-emerald-700' : 
                                'bg-primary-100 text-primary-700'
                              }`}>
                                {isInforme ? 'Informe Técnico' : isCertSanitario ? 'Certificado Sanitario' : 'Informe de Actividades'}
                              </span>
                              {doc.aprobado ? (
                                <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded">Aprobado</span>
                              ) : (
                                <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded">Pendiente</span>
                              )}
                            </div>
                            <div className="text-xs text-dark-500 mt-1 truncate">Folio: {doc.folio || '—'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              if (isInforme) descargarInforme(doc.raw)
                              else if (isCertSanitario) descargarCertificadoSanitario(doc.raw)
                              else descargarCertificado(doc.raw)
                            }}
                            className="btn-secondary py-1 px-2.5 text-xs"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                          {isAdmin && !doc.aprobado && (
                            <button
                              onClick={() => {
                                if (isInforme) handleAprobarInforme(doc.raw)
                                else if (isCertSanitario) handleAprobarCertificadoSanitario(doc.raw)
                                else handleAprobarCert(doc.raw)
                              }}
                              disabled={aprobando === aprobandoId}
                              className="btn-primary py-1 px-2.5 text-xs bg-green-600 hover:bg-green-700 border-green-600"
                            >
                              {aprobando === aprobandoId ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                              Aprobar
                            </button>
                          )}
                          {isAdmin && doc.aprobado && (
                            <button
                              onClick={() => {
                                if (isInforme) handleRechazarInforme(doc.raw)
                                else if (isCertSanitario) handleRechazarCertificadoSanitario(doc.raw)
                                else handleRechazarCert(doc.raw)
                              }}
                              disabled={aprobando === aprobandoId}
                              className="btn-secondary py-1 px-2.5 text-xs text-red-600 hover:text-red-700"
                            >
                              {aprobando === aprobandoId ? <div className="w-3 h-3 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" /> : <ShieldX className="w-3.5 h-3.5" />}
                              Revocar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
