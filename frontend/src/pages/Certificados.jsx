import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { abrirCertificado } from '../lib/generarCertificado'
import { FileCheck, Download, Search, Calendar } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Certificados() {
  const { isAdmin, profile } = useAuth()
  const [certificados, setCertificados] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    if (profile || isAdmin) load() 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isAdmin])

  async function load() {
    try {
      let query = supabase
        .from('certificados')
        .select(`
          *,
          ordenes_servicio!inner(
            *, clientes(nombre, direccion, telefono, email, tipo),
            profiles!tecnico_id(nombre_completo),
            productos_usados:productos_usados(*)
          )
        `)
        .order('created_at', { ascending: false })

      if (!isAdmin && profile?.id) {
        // Filtro real: solo certificados donde el técnico de la orden soy yo
        query = query.eq('ordenes_servicio.tecnico_id', profile.id)
      }

      const { data, error } = await query
      if (error) throw error
      // Filtro defensivo extra en cliente por si RLS no está habilitado aún
      const result = (!isAdmin && profile?.id)
        ? (data || []).filter(c => c.ordenes_servicio?.tecnico_id === profile.id)
        : (data || [])
      setCertificados(result)
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al cargar certificados')
    } finally {
      setLoading(false)
    }
  }

  async function descargar(cert) {
    try {
      const orden = cert.ordenes_servicio
      const { data: config } = await supabase.from('configuracion').select('*').maybeSingle()
      
      // Load all data needed for a complete certificate (same as client/tech)
      const [actividadesRes, fotosRes] = await Promise.all([
        supabase.from('actividades_servicio').select('*').eq('orden_id', orden.id).order('created_at', { ascending: false }),
        supabase.from('fotos_servicio').select('*').eq('orden_id', orden.id)
      ])
      
      await abrirCertificado({
        folio: cert.folio,
        cliente: orden.clientes,
        orden,
        productos: orden.productos_usados || [],
        tecnico: orden.profiles?.nombre_completo || 'N/A',
        config,
        firma: cert.firma_url,
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Certificados</h1>
        <p className="page-subtitle">{certificados.length} certificados generados</p>
      </div>

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
            <div key={cert.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <FileCheck className="w-6 h-6 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-dark-900">{cert.ordenes_servicio?.clientes?.nombre}</p>
                  <div className="flex items-center gap-3 text-xs text-dark-400 mt-0.5">
                    <span>Folio: {cert.folio}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(cert.created_at).toLocaleDateString('es')}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => descargar(cert)} className="btn-primary text-sm shrink-0">
                <Download className="w-4 h-4" /> PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
