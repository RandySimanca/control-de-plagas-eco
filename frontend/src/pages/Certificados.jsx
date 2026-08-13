import { useState, useEffect } from 'react'
import api from '../lib/api'

import { abrirCertificado } from '../lib/generarCertificado'
import { abrirInformeTecnico } from '../lib/generarInformeTecnico'
import { FileCheck, Download, Search, Calendar, ShieldCheck, ShieldX, Clock, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import HelpButton from '../components/features/HelpButton'
import { HELP_CONTENT } from '../lib/helpContent'

export default function Certificados() {
  const { isAdmin, profile } = useAuth()
  const [certificados, setCertificados] = useState([])
  const [informesTecnicos, setInformesTecnicos] = useState([])
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
      const [certRes, informesRes] = await Promise.all([
        api.get('/certificados', { token }),
        api.get('/informes-tecnicos', { token })
      ])
      setCertificados(certRes.data || [])
      setInformesTecnicos(informesRes.data || [])
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al cargar certificados e informes')
    } finally {
      setLoading(false)
    }
  }

  async function handleAprobarCert(cert) {
    setAprobando(`cert-${cert.id}`)
    try {
      const token = localStorage.getItem('token')
      await api.patch(`/certificados/${cert.id}/aprobar`, {}, { token })
      toast.success(`Certificado ${cert.folio} aprobado y visible para el cliente`)
      setCertificados(prev => prev.map(c => c.id === cert.id ? { ...c, aprobado: true } : c))
    } catch {
      toast.error('Error al aprobar certificado')
    } finally {
      setAprobando(null)
    }
  }

  async function handleRechazarCert(cert) {
    setAprobando(`cert-${cert.id}`)
    try {
      const token = localStorage.getItem('token')
      await api.patch(`/certificados/${cert.id}/rechazar`, {}, { token })
      toast.success(`Certificado ${cert.folio} ocultado del portal del cliente`)
      setCertificados(prev => prev.map(c => c.id === cert.id ? { ...c, aprobado: false } : c))
    } catch {
      toast.error('Error al actualizar certificado')
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

  const documentos = [
    ...certificados.map(c => ({
      tipo: 'certificado',
      id: c.id,
      folio: c.folio,
      aprobado: c.aprobado,
      created_at: c.created_at,
      ordenes_servicio: c.ordenes_servicio,
      raw: c
    })),
    ...informesTecnicos.map(i => ({
      tipo: 'informe_tecnico',
      id: i.id,
      folio: i.folio,
      aprobado: i.aprobado,
      created_at: i.informe_generado_at || i.created_at,
      ordenes_servicio: i.ordenes_servicio,
      raw: i
    }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const filtered = documentos.filter(doc => {
    const folio = doc.folio?.toLowerCase() || ''
    const nombreCliente = doc.ordenes_servicio?.clientes?.nombre?.toLowerCase() || ''
    const searchTerm = search.toLowerCase()
    return folio.includes(searchTerm) || nombreCliente.includes(searchTerm)
  })

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  const pendientes = filtered.filter(d => !d.aprobado).length
  const totalDocumentos = documentos.length

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="page-title">Certificados</h1>
          <HelpButton title="Certificados" content={HELP_CONTENT.certificados} />
        </div>
        <div className="flex items-center gap-3 mt-1">
          <p className="page-subtitle">{totalDocumentos} documentos generados ({certificados.length} certificados, {informesTecnicos.length} informes técnicos)</p>
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
            <p className="text-xs text-amber-600 mt-0.5">Revise y apruebe certificados e informes técnicos antes de que sean visibles para los clientes. Puede editar la orden antes de aprobar.</p>
          </div>
        </div>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" placeholder="Buscar por folio o cliente..." />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <FileCheck className="w-12 h-12 text-dark-300 mx-auto mb-3" />
          <p className="text-dark-500">No hay certificados ni informes generados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => {
            const isInforme = doc.tipo === 'informe_tecnico'
            const aprobandoId = isInforme ? `informe-${doc.id}` : `cert-${doc.id}`

            return (
              <div key={`${doc.tipo}-${doc.id}`} className={`card flex items-center justify-between gap-3 ${!doc.aprobado && isAdmin ? 'border-l-4 border-l-amber-400' : ''}`}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${doc.aprobado ? 'bg-green-100' : 'bg-amber-100'}`}>
                    {doc.aprobado
                      ? <ShieldCheck className="w-6 h-6 text-green-600" />
                      : <Clock className="w-6 h-6 text-amber-600" />
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-dark-900">{doc.ordenes_servicio?.clientes?.nombre}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isInforme ? 'bg-indigo-100 text-indigo-700' : 'bg-primary-100 text-primary-700'}`}>
                        {isInforme ? 'Informe Técnico' : 'Certificado'}
                      </span>
                      {doc.aprobado ? (
                        <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Aprobado</span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Pendiente aprobación</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-dark-400 mt-0.5">
                      <span>Folio: {doc.folio || '—'}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(doc.created_at).toLocaleDateString('es')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => isInforme ? descargarInforme(doc.raw) : descargarCertificado(doc.raw)}
                    className="btn-secondary text-sm"
                  >
                    {isInforme ? <FileText className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    PDF
                  </button>
                  {isAdmin && !doc.aprobado && (
                    <button
                      onClick={() => isInforme ? handleAprobarInforme(doc.raw) : handleAprobarCert(doc.raw)}
                      disabled={aprobando === aprobandoId}
                      className="btn-primary text-sm bg-green-600 hover:bg-green-700 border-green-600"
                    >
                      {aprobando === aprobandoId ? (
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      Aprobar
                    </button>
                  )}
                  {isAdmin && doc.aprobado && (
                    <button
                      onClick={() => isInforme ? handleRechazarInforme(doc.raw) : handleRechazarCert(doc.raw)}
                      disabled={aprobando === aprobandoId}
                      className="btn-secondary text-sm text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      {aprobando === aprobandoId ? (
                        <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                      ) : (
                        <ShieldX className="w-4 h-4" />
                      )}
                      Revocar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
