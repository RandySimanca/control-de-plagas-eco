import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

import { 
  ArrowLeft, Calendar, User, MapPin, Package, 
  FileText, Camera, Clock, History, MessageSquare, Download, CheckCircle2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { abrirCertificado } from '../../lib/generarCertificado'

export default function PortalOrdenDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [orden, setOrden] = useState(null)
  const [productos, setProductos] = useState([])
  const [estaciones, setEstaciones] = useState([])
  const [fotos, setFotos] = useState([])
  const [actividades, setActividades] = useState([])
  const [certificado, setCertificado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [descargando, setDescargando] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const [ordenRes, prodsRes, fotosRes, certRes, actividadesRes, estacRes] = await Promise.all([
        supabase.from('ordenes_servicio').select(`*, clientes(*), profiles!tecnico_id(nombre_completo)`).eq('id', id).single(),
        supabase.from('productos_usados').select('*').eq('orden_id', id),
        supabase.from('fotos_servicio').select('*').eq('orden_id', id),
        supabase.from('certificados').select('*').eq('orden_id', id).order('created_at', { ascending: false }),
        supabase.from('actividades_servicio').select('*').eq('orden_id', id).order('created_at', { ascending: false }),
        supabase.from('estaciones_usadas').select('*').eq('orden_id', id)
      ])
      
      if (ordenRes.error) throw ordenRes.error
      setOrden(ordenRes.data)
      setProductos(prodsRes.data || [])
      setEstaciones(estacRes.data || [])
      setFotos(fotosRes.data || [])
      
      // Tomar el primer certificado (el más reciente)
      const certData = certRes.data && certRes.data.length > 0 ? certRes.data[0] : null
      setCertificado(certData)
      
      setActividades(actividadesRes.data || [])
    } catch (err) {
      console.error(err)
      toast.error('No se pudo cargar el detalle de la orden')
      navigate('/portal')
    } finally {
      setLoading(false)
    }
  }

  async function descargarCertificado() {
    setDescargando(true)
    try {
      const { data: config } = await supabase.from('configuracion').select('*').maybeSingle()
      await abrirCertificado({
        folio: certificado.folio,
        cliente: orden.clientes,
        orden,
        productos,
        estaciones,
        tecnico: orden.profiles?.nombre_completo || 'N/A',
        config,
        firma: certificado.firma_url,
        actividades,
        fotos
      })
    } catch (err) {
      toast.error('Error al descargar: ' + err.message)
    } finally {
      setDescargando(false)
    }
  }

  const estadoBadge = { programada: 'badge-programada', en_progreso: 'badge-en-progreso', completada: 'badge-completada' }
  const estadoLabel = { programada: 'Programada', en_progreso: 'Tratamiento en Curso', completada: 'Servicio Finalizado' }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!orden) return null

  return (
    <div className="min-h-screen bg-dark-50 pb-12">
      {/* Header Portal */}
      <div className="bg-white border-b border-dark-100 mb-6">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/portal" className="flex items-center gap-2 text-dark-600 hover:text-primary-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Mi Historial</span>
          </Link>
          <div className={estadoBadge[orden.estado]}>
            {estadoLabel[orden.estado]}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Resumen Principal */}
        <div className="card shadow-sm">
          <h1 className="text-2xl font-bold text-dark-900 mb-4">Detalle del Servicio</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-dark-600">
                <Calendar className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-dark-400">Fecha del Servicio</p>
                  <p className="font-medium text-dark-800">{new Date(orden.fecha_programada).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-dark-600">
                <User className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-dark-400">Técnico Asignado</p>
                  <p className="font-medium text-dark-800">{orden.profiles?.nombre_completo || 'Técnico Especialista'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-dark-600">
                <MapPin className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-dark-400">Sede</p>
                  <p className="font-medium text-dark-800">{orden.clientes?.nombre}</p>
                </div>
              </div>
                <div className="flex items-center gap-3 text-dark-600">
                  <Package className="w-5 h-5 text-primary-600" />
                  <div>
                    <p className="text-xs uppercase tracking-wider font-bold text-dark-400">Tipo de Control</p>
                    <p className="font-medium text-dark-800">{orden.tipo_plaga || 'Servicio Integral'}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* New Areas Intervenidas Block for Portal */}
            <div className="mt-4 pt-4 border-t border-dark-100 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary-600 mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-dark-400">Áreas Intervenidas</p>
                <p className="text-sm text-dark-700">{orden.areas_intervenidas || 'General / Todo el establecimiento'}</p>
              </div>
            </div>
          </div>

        {/* Bitácora en Tiempo Real */}
        <div className="card shadow-sm border-l-4 border-l-primary-500">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-primary-600" /> Seguimiento en Tiempo Real
          </h2>

          {actividades.length === 0 ? (
            <div className="bg-dark-50 rounded-xl p-8 text-center">
              <Clock className="w-10 h-10 text-dark-300 mx-auto mb-3" />
              <p className="text-dark-500">El técnico aún no ha iniciado el registro de actividades.</p>
            </div>
          ) : (
            <div className="relative space-y-8 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-primary-100">
              {actividades.map((act) => (
                <div key={act.id} className="relative pl-12">
                  <div className="absolute left-0 top-1 w-9 h-9 rounded-full bg-white border-4 border-primary-500 flex items-center justify-center z-10 shadow-sm" />
                  <div className="bg-white border border-dark-100 p-4 rounded-xl shadow-sm">
                    <span className="text-xs font-bold text-primary-600 mb-1 block">
                      {new Date(act.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <p className="text-dark-700 leading-relaxed">{act.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Galería de Evidencias */}
        {fotos.length > 0 && (
          <div className="card shadow-sm">
            <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2 mb-4">
              <Camera className="w-5 h-5 text-primary-600" /> Galería de Evidencias
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {fotos.map(f => (
                <a key={f.id} href={f.url} target="_blank" rel="noopener" className="aspect-video rounded-xl overflow-hidden bg-dark-100 border border-dark-200">
                  <img src={f.url} alt="Evidencia" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Productos y Químicos */}
        {productos.length > 0 && (
          <div className="card shadow-sm">
            <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary-600" /> Tratamiento Aplicado
            </h2>
            <div className="space-y-3 mt-4">
              {productos.map((p, i) => (
                <div key={i} className="bg-dark-50 p-3 rounded-xl border border-dark-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-0.5">{p.tipo_producto || 'Producto Aplicado'}</span>
                      <span className="text-sm font-bold text-dark-900">{p.nombre_comercial || p.nombre_producto || 'Sin especificar'}</span>
                    </div>
                    <span className="text-sm font-bold text-dark-800 bg-white px-2 py-1 rounded-lg border border-dark-200 shadow-sm">{p.cantidad || 'N/A'}</span>
                  </div>
                  {p.ingrediente_activo && (
                    <div className="text-xs text-dark-500 border-t border-dark-100 pt-2 mt-2">
                      <span className="font-semibold text-dark-700">Ingrediente activo:</span> {p.ingrediente_activo}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estaciones */}
        {estaciones.length > 0 && (
          <div className="card shadow-sm">
            <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-primary-600" /> Estaciones / Dispositivos
            </h2>
            <div className="space-y-3 mt-4">
              {estaciones.map((e, i) => (
                <div key={i} className="bg-dark-50 p-3 rounded-xl border border-dark-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-dark-900">{e.tipo_estacion}</span>
                    <span className="text-sm font-bold text-dark-800 bg-white px-3 py-1 rounded-lg border border-dark-200 shadow-sm">{e.cantidad}</span>
                  </div>
                  {e.observaciones && (
                    <p className="text-xs text-dark-600 bg-white/50 p-2 rounded-lg border border-dark-100 italic">
                      {e.observaciones}
                    </p>
                  )}
                  {(e.foto_antes_url || e.foto_despues_url) && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {e.foto_antes_url && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-dark-400 uppercase">Antes</p>
                          <img src={e.foto_antes_url} className="rounded-lg w-full aspect-video object-cover border border-dark-100" />
                        </div>
                      )}
                      {e.foto_despues_url && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-dark-400 uppercase">Después</p>
                          <img src={e.foto_despues_url} className="rounded-lg w-full aspect-video object-cover border border-dark-100" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recomendaciones */}
        {(orden.recomendaciones || orden.observaciones) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orden.recomendaciones && (
              <div className="card shadow-sm border-l-4 border-l-primary-500">
                <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-primary-600" /> Recomendaciones del Técnico
                </h2>
                <p className="text-dark-700 whitespace-pre-wrap bg-dark-50 p-4 rounded-xl text-sm leading-relaxed">{orden.recomendaciones}</p>
              </div>
            )}
            {orden.observaciones && (
              <div className="card shadow-sm">
                <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary-600" /> Observaciones del Servicio
                </h2>
                <p className="text-dark-700 whitespace-pre-wrap bg-dark-50 p-4 rounded-xl text-sm leading-relaxed">{orden.observaciones}</p>
              </div>
            )}
          </div>
        )}

        {/* Reporte Final y Certificado */}
        {orden.estado === 'completada' && (
          <div className="bg-primary-600 p-6 rounded-2xl shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-primary-700">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-8 h-8" />
                <h3 className="text-xl font-bold">Servicio Finalizado Exitosamente</h3>
              </div>
              <p className="text-primary-100">Ya puede descargar su certificado de control de plagas y el informe detallado.</p>
            </div>
            {certificado ? (
              <button 
                onClick={descargarCertificado} 
                disabled={descargando}
                className="bg-white text-primary-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"
              >
                {descargando ? <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent animate-spin rounded-full" /> : <Download className="w-5 h-5" />}
                Descargar Certificado PDF
              </button>
            ) : (
              <p className="bg-primary-500/50 px-4 py-2 rounded-lg text-sm">El certificado se está procesando...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
