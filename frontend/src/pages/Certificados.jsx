import { useState, useEffect } from 'react'
import api from '../lib/api'

import { abrirCertificado } from '../lib/generarCertificado'
import { FileCheck, Download, Search, Calendar, ShieldCheck, ShieldX, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import HelpButton from '../components/features/HelpButton'
import { HELP_CONTENT } from '../lib/helpContent'

export default function Certificados() {
  const { isAdmin, profile } = useAuth()
  const [certificados, setCertificados] = useState([])
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
      const res = await api.get('/certificados', { token })
      setCertificados(res.data || [])
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al cargar certificados')
    } finally {
      setLoading(false)
    }
  }

  async function handleAprobar(cert) {
    setAprobando(cert.id)
    try {
      const token = localStorage.getItem('token')
      await api.patch(`/certificados/${cert.id}/aprobar`, {}, { token })
      toast.success(`Certificado ${cert.folio} aprobado y visible para el cliente`)
      setCertificados(prev => prev.map(c => c.id === cert.id ? { ...c, aprobado: true } : c))
    } catch (err) {
      toast.error('Error al aprobar certificado')
    } finally {
      setAprobando(null)
    }
  }

  async function handleRechazar(cert) {
    setAprobando(cert.id)
    try {
      const token = localStorage.getItem('token')
      await api.patch(`/certificados/${cert.id}/rechazar`, {}, { token })
      toast.success(`Certificado ${cert.folio} ocultado del portal del cliente`)
      setCertificados(prev => prev.map(c => c.id === cert.id ? { ...c, aprobado: false } : c))
    } catch (err) {
      toast.error('Error al actualizar certificado')
    } finally {
      setAprobando(null)
    }
  }

  async function descargar(cert) {
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

  const filtered = certificados.filter(c => {
    const folio = c.folio?.toLowerCase() || ''
    const nombreCliente = c.ordenes_servicio?.clientes?.nombre?.toLowerCase() || ''
    const searchTerm = search.toLowerCase()
    return folio.includes(searchTerm) || nombreCliente.includes(searchTerm)
  })

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  const pendientes = filtered.filter(c => !c.aprobado).length

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="page-title">Certificados</h1>
          <HelpButton title="Certificados" content={HELP_CONTENT.certificados} />
        </div>
        <div className="flex items-center gap-3 mt-1">
          <p className="page-subtitle">{certificados.length} certificados generados</p>
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
            <p className="text-sm font-semibold text-amber-800">Certificados pendientes de revisión</p>
            <p className="text-xs text-amber-600 mt-0.5">Revise y apruebe los certificados antes de que sean visibles para los clientes. Puede editar la orden antes de aprobar.</p>
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
          <p className="text-dark-500">No hay certificados generados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(cert => (
            <div key={cert.id} className={`card flex items-center justify-between gap-3 ${!cert.aprobado && isAdmin ? 'border-l-4 border-l-amber-400' : ''}`}>
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${cert.aprobado ? 'bg-green-100' : 'bg-amber-100'}`}>
                  {cert.aprobado
                    ? <ShieldCheck className="w-6 h-6 text-green-600" />
                    : <Clock className="w-6 h-6 text-amber-600" />
                  }
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-dark-900">{cert.ordenes_servicio?.clientes?.nombre}</p>
                    {cert.aprobado ? (
                      <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Aprobado</span>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Pendiente aprobación</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-dark-400 mt-0.5">
                    <span>Folio: {cert.folio}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(cert.created_at).toLocaleDateString('es')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => descargar(cert)} className="btn-secondary text-sm">
                  <Download className="w-4 h-4" /> PDF
                </button>
                {isAdmin && !cert.aprobado && (
                  <button
                    onClick={() => handleAprobar(cert)}
                    disabled={aprobando === cert.id}
                    className="btn-primary text-sm bg-green-600 hover:bg-green-700 border-green-600"
                  >
                    {aprobando === cert.id ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    Aprobar
                  </button>
                )}
                {isAdmin && cert.aprobado && (
                  <button
                    onClick={() => handleRechazar(cert)}
                    disabled={aprobando === cert.id}
                    className="btn-secondary text-sm text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    {aprobando === cert.id ? (
                      <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                    ) : (
                      <ShieldX className="w-4 h-4" />
                    )}
                    Revocar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
