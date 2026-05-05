import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import db from '../lib/db'
import { useSyncQueue } from '../hooks/useSyncQueue'
import { useOffline } from '../contexts/OfflineContext'
import { useAuth } from '../contexts/AuthContext'
import { abrirCertificado } from '../lib/generarCertificado'
import {
  ArrowLeft, Edit, Calendar, User, MapPin, Package,
  FileText, Camera, CheckCircle2, Clock, Play, Loader2, PenLine,
  History, MessageSquare, Upload, X, Plus, Trash2, Save
} from 'lucide-react'
import toast from 'react-hot-toast'
import logoDerosh from '../assets/logo Derosh.png'
import { confirmDelete, successAlert } from '../lib/alerts'

const OPCIONES_AREAS = [
  "Áreas Administrativas y Oficinas",
  "Baños y Vestieres",
  "Bodegas y Almacenamiento",
  "Cocina y Preparación de Alimentos",
  "Cuartos de Archivo y Cómputo",
  "Cámaras de Frío y Neveras",
  "Ductos y Aire Acondicionado",
  "Fachada y Perímetro Exterior",
  "Garajes, Parqueaderos y Sótanos",
  "Habitaciones y Alcobas",
  "Jardines y Zonas Verdes",
  "Líneas de Producción",
  "Sala y Comedor",
  "Silos y Tolvas",
  "Techo y Cielo Raso",
  "Zona de Basuras y Shut",
  "Zonas de Carga y Despachos",
  "Zonas de Lavado y Lavandería"
]

const METODOS_DESINSECTACION = ["Pulverización líquida", "Nebulización en frío (ULV)", "Termonebulización", "Aplicación de gel", "Polvo insecticida", "Cebos", "Trampas de luz UV", "Trampas de feromonas"]
const METODOS_DESRATIZACION = ["Rodenticidas en cebo", "Trampas mecánicas", "Trampas de pegamento", "Fumigación con fosfuro de aluminio"]
const METODOS_DESINFECCION = ["Pulverización química", "Nebulización", "Ozono", "Luz UV-C", "Vapor"]

export default function OrdenDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin, profile } = useAuth()
  const { isOnline } = useOffline()
  const { queueOrExecute, queuePhoto } = useSyncQueue()
  const [orden, setOrden] = useState(null)
  const [productos, setProductos] = useState([])
  const [estaciones, setEstaciones] = useState([])
  const [fotos, setFotos] = useState([])
  const [certificado, setCertificado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [actividades, setActividades] = useState([])
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [newActivity, setNewActivity] = useState('')
  const [activityPhotos, setActivityPhotos] = useState([])
  const [savingActivity, setSavingActivity] = useState(false)

  // Recomendaciones & Evidences Quick Uploads
  const [showRecomendacionesModal, setShowRecomendacionesModal] = useState(false)
  const [recomendacionesText, setRecomendacionesText] = useState('')
  const [recommendationPhotos, setRecommendationPhotos] = useState([])
  const [savingRecomendaciones, setSavingRecomendaciones] = useState(false)
  const [uploadingFotos, setUploadingFotos] = useState(false)

  // States for Stations Maintenance
  const [estacionesEdit, setEstacionesEdit] = useState([])
  const [isEditingEstaciones, setIsEditingEstaciones] = useState(false)
  const [savingEstaciones, setSavingEstaciones] = useState(false)

  // Areas Edit State
  const [showAreasModal, setShowAreasModal] = useState(false)
  const [selectedAreas, setSelectedAreas] = useState([])
  const [savingAreas, setSavingAreas] = useState(false)

  // Metodos Edit State
  const [showMetodosModal, setShowMetodosModal] = useState(false)
  const [selectedMetodos, setSelectedMetodos] = useState([])
  const [savingMetodos, setSavingMetodos] = useState(false)

  // Edit Activity State
  const [editingActivity, setEditingActivity] = useState(null)
  const [showEditActivityModal, setShowEditActivityModal] = useState(false)
  const [savingEditActivity, setSavingEditActivity] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [id])

  async function load() {
    try {
      if (isOnline) {
        const [ordenRes, prodsRes, fotosRes, certRes, actividadesRes, estacRes] = await Promise.all([
          supabase.from('ordenes_servicio').select(`*, clientes(*), profiles(*)`).eq('id', id).single(),
          supabase.from('productos_usados').select('*').eq('orden_id', id),
          supabase.from('fotos_servicio').select('*').eq('orden_id', id),
          supabase.from('certificados').select('*').eq('orden_id', id).maybeSingle(),
          supabase.from('actividades_servicio').select('*').eq('orden_id', id).order('created_at', { ascending: true }),
          supabase.from('estaciones_usadas').select('*').eq('orden_id', id)
        ])
        if (ordenRes.error) throw ordenRes.error
        const snapshot = {
          id,
          orden: ordenRes.data,
          productos: prodsRes.data || [],
          fotos: fotosRes.data || [],
          certificado: certRes.data,
          actividades: actividadesRes.data || [],
          estaciones: estacRes.data || [],
          updated_at: Date.now()
        }
        await db.ordenes.put(snapshot)
        applySnapshot(snapshot)
      } else {
        const cached = await db.ordenes.get(id)
        if (cached) {
          applySnapshot(cached)
        } else {
          toast.error('No hay datos guardados offline para esta orden')
          navigate('/ordenes')
        }
      }
    } catch (err) {
      console.error('Error loading order details:', err)
      // Fallback to cached version if available
      const cached = await db.ordenes.get(id)
      if (cached) {
        applySnapshot(cached)
        toast('Mostrando datos guardados (sin conexión)', { icon: '⚡' })
      } else {
        toast.error('Error cargando orden')
        navigate('/ordenes')
      }
    } finally {
      setLoading(false)
    }
  }

  function applySnapshot(snapshot) {
    setOrden(snapshot.orden)
    setProductos(snapshot.productos)
    setEstaciones(snapshot.estaciones)
    setFotos(snapshot.fotos)
    setCertificado(snapshot.certificado)
    setActividades(snapshot.actividades)
    setRecomendacionesText(snapshot.orden?.recomendaciones || '')
    const defaultTypes = ['Cebadero', 'Impacto', 'Jaula atrapavivos']
    const currentEstaciones = snapshot.estaciones || []
    const initialEdit = defaultTypes.map(type => {
      const found = currentEstaciones.find(e => e.tipo_estacion === type)
      return {
        tipo_estacion: type,
        cantidad: found ? found.cantidad : 0,
        observaciones: found ? found.observaciones : '',
        foto_antes_url: found ? found.foto_antes_url : null,
        foto_despues_url: found ? found.foto_despues_url : null,
        id: found ? found.id : null,
        active: !!found
      }
    })
    setEstacionesEdit(initialEdit)
  }

  async function handleDeleteOrden() {
    const isConfirmed = await confirmDelete('¿Estás seguro de eliminar esta orden?', 'Se borrarán también todas las actividades, fotos y el certificado asociado.')
    if (!isConfirmed) return
    try {
      const { error } = await supabase.from('ordenes_servicio').delete().eq('id', id)
      if (error) throw error
      await successAlert('¡Eliminada!', 'Orden eliminada exitosamente')
      navigate('/ordenes')
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message)
    }
  }

  async function cambiarEstado(nuevoEstado) {
    try {
      const updates = { id, estado: nuevoEstado, updated_at: new Date().toISOString() }
      if (nuevoEstado === 'completada') {
        updates.fecha_completada = new Date().toISOString().split('T')[0]
        if (!certificado) {
          const folio = `PC-${Date.now().toString(36).toUpperCase()}`
          await queueOrExecute('certificados', 'insert', { orden_id: id, folio }, id)
          setCertificado({ folio })
        }
      }
      await queueOrExecute('ordenes_servicio', 'update', updates, id)
      setOrden(prev => ({ ...prev, ...updates }))
      toast.success(`Estado cambiado a ${nuevoEstado.replace('_', ' ')}`)
    } catch (err) { 
      console.error(err)
      toast.error('Error al cambiar estado') 
    }
  }


  async function handleGenerarCertificado() {
    setGenerando(true)
    try {
      const folio = `PC-${Date.now().toString(36).toUpperCase()}`
      const { data: config } = await supabase.from('configuracion').select('*').maybeSingle()
      
      // Save cert record
      if (!certificado) {
        await supabase.from('certificados').insert({ orden_id: id, folio })
      } else {
        // Just update folio if needed, but usually it exists
        await supabase.from('certificados').update({ folio }).eq('orden_id', id)
      }

      await abrirCertificado({
        folio,
        cliente: orden.clientes,
        orden,
        productos,
        estaciones,
        tecnico: orden.profiles?.nombre_completo || 'N/A',
        config: { ...config, logo_asset: logoDerosh },
        firma: certificado?.firma_url,
        firma_tecnico: orden.profiles?.firma_url,
        actividades,
        fotos
      })

      setCertificado(prev => ({ ...prev, folio }))
      toast.success('Certificado generado')
    } catch (err) {
      toast.error('Error generando certificado: ' + err.message)
    } finally {
      setGenerando(false)
    }
  }

  async function handleSaveEstaciones() {
    setSavingEstaciones(true)
    try {
      const toInsert = estacionesEdit.filter(e => e.active).map(e => ({
        id: e.id || crypto.randomUUID(),
        orden_id: id,
        tipo_estacion: e.tipo_estacion,
        cantidad: parseInt(e.cantidad) || 0,
        observaciones: e.observaciones || '',
        foto_antes_url: e.foto_antes_url,
        foto_despues_url: e.foto_despues_url
      }))

      await queueOrExecute('estaciones_usadas', 'delete', { id: `orden_${id}` }, id)
      // Note: since delete by orden_id requires special handling, fall through to supabase when online
      if (isOnline) {
        await supabase.from('estaciones_usadas').delete().eq('orden_id', id)
        if (toInsert.length > 0) {
          const { error } = await supabase.from('estaciones_usadas').insert(toInsert)
          if (error) throw error
        }
        const { data } = await supabase.from('estaciones_usadas').select('*').eq('orden_id', id)
        setEstaciones(data || [])
      } else {
        // Offline: queue individual deletes via a custom operation recorded as metadata
        await db.sync_queue.add({ table: 'estaciones_usadas', operation: 'delete_where', payload: { filter: 'orden_id', value: id }, ordenId: id, attempts: 0, createdAt: Date.now() })
        for (const row of toInsert) {
          await db.sync_queue.add({ table: 'estaciones_usadas', operation: 'insert', payload: row, ordenId: id, attempts: 0, createdAt: Date.now() + 1 })
        }
        setEstaciones(toInsert)
      }
      setIsEditingEstaciones(false)
      toast.success('Monitoreo de estaciones actualizado')
    } catch (err) {
      toast.error('Error al guardar estaciones: ' + err.message)
    } finally {
      setSavingEstaciones(false)
    }
  }

  async function handleUploadEstacionFoto(idx, context, file) {
    if (!file) return
    const type = estacionesEdit[idx].tipo_estacion
    const path = `estaciones/orden_${id}_${type}_${context}_${Date.now()}.jpg`
    try {
      const { publicUrl, error } = await queuePhoto('fotos-servicio', path, file, file.type || 'image/jpeg')
      if (error) throw error
      const field = context === 'antes' ? 'foto_antes_url' : 'foto_despues_url'
      setEstacionesEdit(prev => prev.map((item, i) => 
        i === idx ? { ...item, [field]: publicUrl } : item
      ))
      toast.success(`Foto ${context} guardada`)
    } catch (err) {
      toast.error('Error con foto: ' + err.message)
    }
  }

  async function descargarCertificado() {
    const { data: config } = await supabase.from('configuracion').select('*').maybeSingle()
      await abrirCertificado({
        folio: certificado.folio,
        cliente: orden.clientes,
        orden,
        productos,
        estaciones,
        tecnico: orden.profiles?.nombre_completo || 'N/A',
        config,
        firma: certificado?.firma_url,
        firma_tecnico: orden.profiles?.firma_url,
        actividades,
        fotos
      })
  }
  async function handleSaveActivity(e) {
    e.preventDefault()
    if (!newActivity.trim()) return
    setSavingActivity(true)
    try {
      const actPayload = { id: crypto.randomUUID(), orden_id: id, descripcion: newActivity, created_at: new Date().toISOString() }
      const { data: actRows, queued } = await queueOrExecute('actividades_servicio', 'insert', actPayload, id)
      const actData = actRows?.[0] || actPayload

      if (activityPhotos.length > 0) {
        for (const file of activityPhotos) {
          const path = `actividades/act_${id}_${Date.now()}_${file.name}`
          const dbPayload = { id: crypto.randomUUID(), orden_id: id, storage_path: path, descripcion: newActivity.substring(0, 50) }
          const { publicUrl } = await queuePhoto('fotos-servicio', path, file, file.type, 'fotos_servicio', dbPayload, id)
          if (!queued) {
            setFotos(prev => [...prev, { ...dbPayload, url: publicUrl }])
          }
        }
      }

      setActividades(prev => [actData, ...prev])
      setNewActivity('')
      setActivityPhotos([])
      setShowActivityModal(false)
      toast.success(queued ? 'Actividad guardada offline ⚡' : 'Actividad registrada')
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSavingActivity(false)
    }
  }

  async function handleUpdateActivity(e) {
    e.preventDefault()
    if (!editingActivity || !editingActivity.descripcion.trim()) return
    setSavingEditActivity(true)
    try {
      const { queued } = await queueOrExecute('actividades_servicio', 'update', { id: editingActivity.id, descripcion: editingActivity.descripcion }, id)
      setActividades(actividades.map(a => a.id === editingActivity.id ? editingActivity : a))
      setShowEditActivityModal(false)
      setEditingActivity(null)
      toast.success(queued ? 'Actualizado offline ⚡' : 'Actividad actualizada')
    } catch (err) {
      toast.error('Error al actualizar: ' + err.message)
    } finally {
      setSavingEditActivity(false)
    }
  }

  async function handleDeleteActivity(actId) {
    const isConfirmed = await confirmDelete('¿Estás seguro de eliminar esta nota?', 'Se borrará la entrada de la bitácora.')
    if (!isConfirmed) return
    try {
      const { queued } = await queueOrExecute('actividades_servicio', 'delete', { id: actId }, id)
      setActividades(actividades.filter(a => a.id !== actId))
      if (!queued) await successAlert('¡Eliminada!', 'Nota eliminada')
      else toast.success('Eliminación guardada offline ⚡')
    } catch (err) {
      toast.error('Error al eliminar nota: ' + err.message)
    }
  }

  async function handleDeletePhoto(foto) {
    const isConfirmed = await confirmDelete('¿Estás seguro de eliminar esta fotografía?', 'No se podrá recuperar la imagen.')
    if (!isConfirmed) return
    try {
      // 1. Delete from bucket
      if (foto.storage_path) {
        await supabase.storage.from('fotos-servicio').remove([foto.storage_path])
      }

      // 2. Delete from DB
      const { error } = await supabase.from('fotos_servicio').delete().eq('id', foto.id)
      if (error) throw error

      setFotos(fotos.filter(f => f.id !== foto.id))
      await successAlert('¡Eliminada!', 'Fotografía eliminada')
    } catch (err) {
      toast.error('Error al eliminar foto: ' + err.message)
    }
  }

  const handlePhotoChange = (e) => {
    if (e.target.files) {
      setActivityPhotos(Array.from(e.target.files))
    }
  }

  async function handleSaveRecomendaciones(e) {
    if (e) e.preventDefault()
    setSavingRecomendaciones(true)
    try {
      const { queued } = await queueOrExecute('ordenes_servicio', 'update', { id, recomendaciones: recomendacionesText }, id)

      if (recommendationPhotos.length > 0) {
        for (const file of recommendationPhotos) {
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const path = `recomendaciones/rec_${id}_${Date.now()}_${safeName}`
          const dbPayload = { id: crypto.randomUUID(), orden_id: id, storage_path: path, descripcion: 'Evidencia de recomendación técnica' }
          const { publicUrl } = await queuePhoto('fotos-servicio', path, file, file.type, 'fotos_servicio', dbPayload, id)
          if (!queued) setFotos(prev => [...prev, { ...dbPayload, url: publicUrl }])
        }
      }

      setOrden(prev => ({ ...prev, recomendaciones: recomendacionesText }))
      setShowRecomendacionesModal(false)
      setRecommendationPhotos([])
      toast.success(queued ? 'Guardado offline ⚡' : 'Recomendaciones guardadas exitosamente')
    } catch(err) {
      console.error(err)
      toast.error('Error guardando recomendaciones')
    } finally {
      setSavingRecomendaciones(false)
    }
  }

  async function handleSaveAreas() {
    setSavingAreas(true)
    try {
      const areaStr = selectedAreas.join(', ')
      const { queued } = await queueOrExecute('ordenes_servicio', 'update', { id, areas_intervenidas: areaStr }, id)
      setOrden(prev => ({ ...prev, areas_intervenidas: areaStr }))
      setShowAreasModal(false)
      toast.success(queued ? 'Áreas guardadas offline ⚡' : 'Áreas intervenidas actualizadas')
    } catch (err) {
       toast.error('Error al guardar áreas: ' + err.message)
    } finally {
       setSavingAreas(false)
    }
  }

  async function handleSaveMetodos() {
    setSavingMetodos(true)
    try {
      const metStr = selectedMetodos.join(', ')
      const { queued } = await queueOrExecute('ordenes_servicio', 'update', { id, metodos_aplicados: metStr }, id)
      setOrden(prev => ({ ...prev, metodos_aplicados: metStr }))
      setShowMetodosModal(false)
      toast.success(queued ? 'Métodos guardados offline ⚡' : 'Métodos de aplicación actualizados')
    } catch (err) {
       toast.error('Error al guardar métodos: ' + err.message)
    } finally {
       setSavingMetodos(false)
    }
  }
  async function handleUploadFotosQuick(e) {
    if (!e.target.files || e.target.files.length === 0) return
    const files = Array.from(e.target.files)
    setUploadingFotos(true)
    toast.loading('Procesando fotos...', { id: 'evt-upload' })
    try {
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const path = `evidencias/evt_${id}_${Date.now()}_${safeName}`
        const dbPayload = { id: crypto.randomUUID(), orden_id: id, storage_path: path, descripcion: 'Evidencia general subida por técnico' }
        const { publicUrl } = await queuePhoto('fotos-servicio', path, file, file.type, 'fotos_servicio', dbPayload, id)
        setFotos(prev => [...prev, { ...dbPayload, url: publicUrl }])
      }
      toast.success('Fotos guardadas')
    } catch (err) {
      toast.error('Error con fotos: ' + err.message)
    } finally {
      setUploadingFotos(false)
      toast.dismiss('evt-upload')
      if (e.target) e.target.value = null
    }
  }

  const estadoBadge = { programada: 'badge-programada', en_progreso: 'badge-en-progreso', completada: 'badge-completada' }
  const estadoLabel = { programada: 'Programada', en_progreso: 'En Progreso', completada: 'Completada' }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  if (!orden) return null

  const isAssignedTecnico = orden.tecnico_id === profile?.id
  const canManage = isAdmin

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/ordenes" className="inline-flex items-center gap-2 text-sm text-dark-500 hover:text-dark-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-dark-900">{orden.clientes?.nombre}</h1>
              <div className="flex items-center gap-2">
                <span className={estadoBadge[orden.estado]}>{estadoLabel[orden.estado]}</span>
                {canManage && (
                  <button 
                    onClick={handleDeleteOrden}
                    className="p-1.5 text-dark-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Eliminar Orden"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-dark-400">Orden creada el {new Date(orden.created_at).toLocaleDateString('es')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAssignedTecnico && orden.estado === 'programada' && (
              <button onClick={() => cambiarEstado('en_progreso')} className="btn-secondary text-sm">
                <Play className="w-4 h-4" /> Iniciar
              </button>
            )}
            {isAssignedTecnico && orden.estado === 'en_progreso' && (
              <button onClick={() => cambiarEstado('completada')} className="btn-primary text-sm">
                <CheckCircle2 className="w-4 h-4" /> Finalizar Servicio
              </button>
            )}
            {canManage && (
              <Link to={`/ordenes/${id}/editar`} className="btn-secondary text-sm">
                <Edit className="w-4 h-4" /> Editar
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-sm text-dark-600">
            <Calendar className="w-4 h-4 text-dark-400" /> <span className="font-medium">Fecha:</span> {orden.fecha_programada}
          </div>
          <div className="flex items-center gap-2 text-sm text-dark-600">
            <User className="w-4 h-4 text-dark-400" /> <span className="font-medium">Técnico:</span> {orden.profiles?.nombre_completo || 'Sin asignar'}
          </div>
          {orden.tipo_plaga && (
            <div className="flex items-center gap-2 text-sm text-dark-600">
              <span className="font-medium">Tipo de Control:</span> {orden.tipo_plaga}
            </div>
          )}
          {orden.clientes?.direccion && (
            <div className="flex items-center gap-2 text-sm text-dark-600">
              <MapPin className="w-4 h-4 text-dark-400" /> {orden.clientes.direccion}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products */}
        <div className="card">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-primary-600" /> Productos Utilizados
          </h2>
          {productos.length === 0 ? (
            <p className="text-sm text-dark-400">Sin productos registrados</p>
          ) : (
            <div className="space-y-3">
              {productos.map((p, i) => (
                <div key={i} className="bg-dark-50 p-3 rounded-xl border border-dark-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-0.5">{p.tipo_producto || 'Producto Utilizado'}</span>
                      <span className="text-sm font-bold text-dark-900">{p.nombre_comercial || p.nombre_producto || 'Sin nombre'}</span>
                    </div>
                    <span className="text-sm font-medium text-dark-800 bg-white px-2 py-1 rounded-lg border border-dark-200">{p.cantidad || 'N/A'}</span>
                  </div>
                  {p.ingrediente_activo && (
                    <div className="text-xs text-dark-500 mt-1">
                      <span className="font-medium text-dark-600">Ingrediente activo:</span> {p.ingrediente_activo}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estaciones (Interactive for Tech) */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-600" /> Monitoreo de Estaciones
            </h2>
            {isAssignedTecnico && orden.estado === 'en_progreso' && !isEditingEstaciones && (
              <button onClick={() => setIsEditingEstaciones(true)} className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 transition-colors">
                Registrar Mantenimiento
              </button>
            )}
          </div>

          <div className="space-y-4">
            {isEditingEstaciones ? (
              <>
                <div className="space-y-4">
                  {estacionesEdit.map((e, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border transition-all ${e.active ? 'bg-primary-50/30 border-primary-200' : 'bg-dark-50/50 border-dark-100 opacity-60'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={e.active} 
                            onChange={() => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? {...item, active: !item.active} : item))}
                            className="w-5 h-5 rounded border-dark-300 text-primary-600 focus:ring-primary-500" 
                          />
                          <span className="font-bold text-dark-900">{e.tipo_estacion}</span>
                        </label>
                        {e.active && (
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-dark-400 uppercase">Cantidad:</span>
                             <input 
                               type="number" 
                               value={e.cantidad} 
                               onChange={(ev) => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? {...item, cantidad: ev.target.value} : item))}
                               className="w-20 input-field py-1 text-center" 
                             />
                          </div>
                        )}
                      </div>
                        {e.active && (
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {e.tipo_estacion === 'Cebadero' ? (
                                <>
                                  {['Limpieza', 'Reposición Cebo', 'Cebo Dañado'].map(btn => (
                                    <button 
                                      key={btn} 
                                      type="button"
                                      onClick={() => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? {...item, observaciones: (item.observaciones ? item.observaciones + ', ' : '') + btn} : item))}
                                      className="text-[10px] font-bold uppercase py-1 px-2 rounded-md bg-white border border-primary-200 text-primary-700 hover:bg-primary-100 transition-colors"
                                    >
                                      + {btn}
                                    </button>
                                  ))}
                                </>
                              ) : (
                                <>
                                  {['Sin Captura', 'Captura', 'Mantenimiento'].map(btn => (
                                    <button 
                                      key={btn} 
                                      type="button"
                                      onClick={() => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? {...item, observaciones: (item.observaciones ? item.observaciones + ', ' : '') + btn} : item))}
                                      className="text-[10px] font-bold uppercase py-1 px-2 rounded-md bg-white border border-primary-200 text-primary-700 hover:bg-primary-100 transition-colors"
                                    >
                                      + {btn}
                                    </button>
                                  ))}
                                </>
                              )}
                            </div>
                            <textarea 
                              placeholder="Describa el mantenimiento realizado (ej: Limpieza, cambio de cebo...)"
                              value={e.observaciones || ''} 
                              onChange={(ev) => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? {...item, observaciones: ev.target.value} : item))}
                              className="input-field text-sm bg-white"
                              rows={2}
                            />

                            <div className="grid grid-cols-2 gap-3 mt-2">
                              {/* Foto Antes */}
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-dark-400 uppercase">Estado Inicial (Antes)</p>
                                <div className="relative aspect-video rounded-lg border-2 border-dashed border-dark-200 bg-white flex items-center justify-center overflow-hidden">
                                  {e.foto_antes_url ? (
                                    <>
                                      <img src={e.foto_antes_url} className="w-full h-full object-cover" />
                                      <button 
                                        onClick={() => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? {...item, foto_antes_url: null} : item))}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <label className="cursor-pointer flex flex-col items-center">
                                      <Camera className="w-5 h-5 text-dark-300" />
                                      <input type="file" accept="image/*" onChange={(ev) => handleUploadEstacionFoto(idx, 'antes', ev.target.files[0])} className="hidden" />
                                    </label>
                                  )}
                                </div>
                              </div>
                              {/* Foto Después */}
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-dark-400 uppercase">Estado Final (Después)</p>
                                <div className="relative aspect-video rounded-lg border-2 border-dashed border-dark-200 bg-white flex items-center justify-center overflow-hidden">
                                  {e.foto_despues_url ? (
                                    <>
                                      <img src={e.foto_despues_url} className="w-full h-full object-cover" />
                                      <button 
                                        onClick={() => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? {...item, foto_despues_url: null} : item))}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <label className="cursor-pointer flex flex-col items-center">
                                      <Camera className="w-5 h-5 text-dark-300" />
                                      <input type="file" accept="image/*" onChange={(ev) => handleUploadEstacionFoto(idx, 'despues', ev.target.files[0])} className="hidden" />
                                    </label>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4 pt-2">
                  <button onClick={handleSaveEstaciones} disabled={savingEstaciones} className="btn-primary flex-1 text-sm py-2">
                    {savingEstaciones ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Monitoreo'}
                  </button>
                  <button onClick={() => setIsEditingEstaciones(false)} className="btn-secondary text-sm py-2">Cancelar</button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {estaciones.length === 0 ? (
                  <div className="text-center py-6 bg-dark-50 rounded-xl border border-dashed border-dark-200">
                    <p className="text-xs text-dark-400">No se han registrado estaciones aún</p>
                  </div>
                ) : (
                  estaciones.map((e, i) => (
                    <div key={i} className="bg-dark-50 p-3 rounded-xl border border-dark-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-dark-900">{e.tipo_estacion}</span>
                        <span className="text-sm font-bold text-dark-800 bg-white px-3 py-0.5 rounded-lg border border-dark-200">Cant: {e.cantidad}</span>
                      </div>
                      {e.observaciones && (
                        <p className="text-xs text-dark-600 mt-2 bg-white/50 p-2 rounded-lg border border-dark-100 italic">
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
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Observations */}
        <div className="card lg:col-span-2 relative mt-4 lg:mt-0">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary-600" /> Observaciones Generales
          </h2>
          <p className="text-dark-700 whitespace-pre-wrap text-sm leading-relaxed">{orden.observaciones || 'Ninguna observación.'}</p>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <History className="w-5 h-5 text-primary-600" /> Bitácora de Actividad
          </h2>
          {isAssignedTecnico && orden.estado === 'en_progreso' && (
            <button onClick={() => setShowActivityModal(true)} className="btn-secondary text-sm py-1.5">
              <Plus className="w-4 h-4" /> Registrar Avance
            </button>
          )}
        </div>

        {actividades.length === 0 ? (
          <div className="text-center py-8 bg-dark-50 rounded-xl border border-dashed border-dark-200">
            <MessageSquare className="w-8 h-8 text-dark-300 mx-auto mb-2" />
            <p className="text-sm text-dark-400">No hay avances registrados aún</p>
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-dark-100">
            {actividades.map((act) => (
              <div key={act.id} className="relative pl-10">
                <div className="absolute left-0 top-1 w-9 h-9 rounded-full bg-white border-2 border-primary-500 flex items-center justify-center z-10">
                  <div className="w-2 h-2 rounded-full bg-primary-600" />
                </div>
                <div className="bg-dark-50 p-4 rounded-xl border border-dark-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">Avance de Servicio</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-dark-400">{new Date(act.created_at).toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit'})} - {new Date(act.created_at).toLocaleDateString('es')}</span>
                      {isAssignedTecnico && orden.estado === 'en_progreso' && (
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => { setEditingActivity({...act}); setShowEditActivityModal(true); }}
                            className="p-1 text-dark-400 hover:text-primary-600 transition-colors"
                            title="Editar Nota"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteActivity(act.id)}
                            className="p-1 text-dark-400 hover:text-red-500 transition-colors"
                            title="Eliminar Nota"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-dark-700 leading-relaxed">{act.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photos */}
      <div className="card mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary-600" /> Galería Evidencias ({fotos.length})
          </h2>
          {isAssignedTecnico && orden.estado === 'en_progreso' && (
            <div className="relative group overflow-hidden">
              <input type="file" multiple accept="image/*" onChange={handleUploadFotosQuick} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <button className="btn-primary text-sm py-1.5 px-4 w-full sm:w-auto relative group-hover:bg-primary-700">
                {uploadingFotos ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : <><Upload className="w-4 h-4 mr-2 inline" /> Subir Evidencia</>}
              </button>
            </div>
          )}
        </div>
        
        {fotos.length === 0 ? (
          <div className="text-center py-6 bg-dark-50 rounded-xl border border-dashed border-dark-200">
            <Camera className="w-8 h-8 text-dark-300 mx-auto mb-2" />
            <p className="text-sm text-dark-400">No hay fotografías adjuntas</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fotos.map(f => (
              <div key={f.id} className="relative group aspect-square rounded-xl overflow-hidden bg-dark-100 border border-dark-200">
                <a href={f.url} target="_blank" rel="noopener">
                  <img src={f.url} alt="Foto servicio" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </a>
                {isAssignedTecnico && orden.estado === 'en_progreso' && (
                  <button 
                    onClick={() => handleDeletePhoto(f)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600"
                    title="Eliminar Foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Areas Intervenidas Edit (Para Técnico) */}
      <div className="card mt-6 border-t-4 border-t-indigo-500">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" /> Áreas Intervenidas
          </h2>
          {isAssignedTecnico && orden.estado === 'en_progreso' && (
            <button key="btn-edit-areas" onClick={() => {
              setSelectedAreas(orden.areas_intervenidas ? orden.areas_intervenidas.split(', ') : [])
              setShowAreasModal(true)
            }} className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Especificar Áreas
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
           {orden.areas_intervenidas ? orden.areas_intervenidas.split(', ').map((a,idx) => <span key={idx} className="bg-dark-50 border border-dark-200 text-dark-800 px-3 py-1 rounded-full text-sm font-medium">{a}</span>) : <span className="text-sm text-dark-400">No se han especificado áreas</span>}
        </div>
      </div>

      {/* Métodos Aplicados Edit (Para Técnico) */}
      <div className="card mt-6 border-t-4 border-t-indigo-400 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" /> Métodos de Aplicación
          </h2>
          {isAssignedTecnico && orden.estado === 'en_progreso' && (
            <button key="btn-edit-metodos" onClick={() => {
              setSelectedMetodos(orden.metodos_aplicados ? orden.metodos_aplicados.split(', ') : [])
              setShowMetodosModal(true)
            }} className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Seleccionar Métodos
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
           {orden.metodos_aplicados ? orden.metodos_aplicados.split(', ').map((m,idx) => <span key={idx} className="bg-dark-50 border border-dark-200 text-dark-800 px-3 py-1 rounded-full text-sm font-medium">{m}</span>) : <span className="text-sm text-dark-400">No se han especificado métodos...</span>}
        </div>
      </div>

      {/* Recomendaciones del Tecnico */}
      <div className="card border-t-4 border-t-primary-500 mt-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" /> Recomendaciones del Técnico
          </h2>
          {isAssignedTecnico && orden.estado === 'en_progreso' && (
            <button onClick={() => setShowRecomendacionesModal(true)} className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-2">
              <PenLine className="w-4 h-4" /> {orden.recomendaciones ? 'Editar Recomendaciones' : 'Escribir Recomendaciones'}
            </button>
          )}
        </div>
        <p className="text-dark-700 whitespace-pre-wrap text-sm leading-relaxed bg-dark-50 p-4 rounded-xl border border-dark-100">
          {orden.recomendaciones || 'El técnico aún no ha reportado recomendaciones para este servicio.'}
        </p>
      </div>

      {/* Certificate */}
      <div className="card mt-6">
        <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary-600" /> Certificado
        </h2>
        {orden.estado !== 'completada' ? (
          <div className="flex items-center gap-2 text-sm text-dark-400">
            <Clock className="w-4 h-4" /> El certificado estará disponible cuando la orden se marque como completada
          </div>
        ) : certificado ? (
          <div className="flex items-center justify-between bg-green-50 p-4 rounded-xl">
            <div>
              <p className="font-semibold text-green-800">Certificado generado</p>
              <p className="text-sm text-green-600">Folio: {certificado.folio}</p>
            </div>
            <button onClick={descargarCertificado} className="btn-primary text-sm">Descargar PDF</button>
          </div>
        ) : (
          <button onClick={handleGenerarCertificado} disabled={generando} className="btn-primary">
            {generando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileText className="w-5 h-5" /> Generar Certificado</>}
          </button>
        )}
      </div>

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between">
              <h3 className="font-bold text-dark-900">Registrar Nuevo Avance</h3>
              <button onClick={() => setShowActivityModal(false)} className="p-2 hover:bg-dark-50 rounded-lg text-dark-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveActivity} className="p-6 space-y-4">
              <div>
                <label className="label-field">Descripción del trabajo realizado</label>
                <textarea 
                  className="input-field min-h-[120px] resize-none" 
                  value={newActivity} 
                  onChange={e => setNewActivity(e.target.value)}
                  placeholder="Ej: Se realizó inspección en cocina, se encontraron focos de humedad..."
                  required
                />
              </div>
              <div>
                <label className="label-field">Fotos del avance (4-6 recomendadas)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dark-200 border-dashed rounded-xl hover:border-primary-400 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-10 w-10 text-dark-400" />
                    <div className="flex text-sm text-dark-600">
                      <span className="font-medium text-primary-600">Sube archivos</span>
                      <p className="pl-1">o arrastra y suelta</p>
                    </div>
                    <p className="text-xs text-dark-400">JPG, PNG hasta 10MB</p>
                  </div>
                </div>
                {activityPhotos.length > 0 && (
                  <p className="text-xs text-primary-600 mt-2 font-medium">
                    {activityPhotos.length} fotos seleccionadas
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingActivity} className="btn-primary flex-1">
                  {savingActivity ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar Avance'}
                </button>
                <button type="button" onClick={() => setShowActivityModal(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Activity Modal */}
      {showEditActivityModal && editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between">
              <h3 className="font-bold text-dark-900">Editar Avance</h3>
              <button onClick={() => setShowEditActivityModal(false)} className="p-2 hover:bg-dark-50 rounded-lg text-dark-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateActivity} className="p-6 space-y-4">
              <div>
                <label className="label-field">Descripción corregida</label>
                <textarea 
                  className="input-field min-h-[120px] resize-none" 
                  value={editingActivity.descripcion} 
                  onChange={e => setEditingActivity({...editingActivity, descripcion: e.target.value})}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingEditActivity} className="btn-primary flex-1">
                  {savingEditActivity ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Actualizar Nota'}
                </button>
                <button type="button" onClick={() => setShowEditActivityModal(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recommendations Modal */}
      {showRecomendacionesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between bg-primary-50/50">
              <h3 className="font-bold text-dark-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" /> Recomendaciones Técnicas
              </h3>
              <button onClick={() => setShowRecomendacionesModal(false)} className="p-2 hover:bg-dark-100 rounded-lg text-dark-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRecomendaciones} className="p-6 space-y-5">
              <div>
                <label className="label-field">¿Qué recomendaciones dejas para el establecimiento?</label>
                <textarea 
                  className="input-field min-h-[180px] resize-none text-sm" 
                  value={recomendacionesText} 
                  onChange={e => setRecomendacionesText(e.target.value)}
                  placeholder="Ej: Sellar el ingreso de tuberías bajo el lavaplatos, mejorar la frecuencia de recolección de residuos..."
                  required
                />
                <p className="mt-1.5 text-xs text-dark-400 italic">Estas recomendaciones aparecerán formalmente en el certificado PDF del cliente.</p>
              </div>

              <div>
                <label className="label-field">Adjuntar Evidencias Fotográficas</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-primary-100 border-dashed rounded-xl hover:border-primary-400 hover:bg-primary-50/30 transition-all cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) setRecommendationPhotos(Array.from(e.target.files))
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2 text-center">
                    <Camera className="mx-auto h-10 w-10 text-primary-300" />
                    <div className="flex text-sm text-dark-600">
                      <span className="font-medium text-primary-600">Sube fotos de evidencia</span>
                    </div>
                    <p className="text-xs text-dark-400">Captura o selecciona imágenes</p>
                  </div>
                </div>
                {recommendationPhotos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recommendationPhotos.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full text-xs font-medium border border-primary-100">
                        <Camera className="w-3 h-3" /> {f.name.substring(0, 15)}...
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingRecomendaciones} className="btn-primary flex-1 shadow-lg shadow-primary-200">
                  {savingRecomendaciones ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                    <span className="flex items-center justify-center gap-2">
                      <Save className="w-5 h-5" /> Guardar y Reportar
                    </span>
                  )}
                </button>
                <button type="button" onClick={() => setShowRecomendacionesModal(false)} className="btn-secondary">
                  Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Areas Modal */}
      {showAreasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between">
              <h3 className="font-bold text-dark-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-indigo-600" /> Seleccionar Áreas Intervenidas</h3>
              <button onClick={() => setShowAreasModal(false)} className="p-2 hover:bg-dark-50 rounded-lg text-dark-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                 {OPCIONES_AREAS.map(area => (
                    <label key={area} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedAreas.includes(area) ? 'bg-indigo-50/50 border-indigo-300' : 'bg-dark-50 border-dark-100 hover:border-dark-300'}`}>
                      <input type="checkbox" checked={selectedAreas.includes(area)} onChange={(e) => {
                        if (e.target.checked) setSelectedAreas([...selectedAreas, area]);
                        else setSelectedAreas(selectedAreas.filter(a => a !== area));
                      }} className="w-4 h-4 rounded border-dark-300 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-dark-800 leading-tight">{area}</span>
                    </label>
                 ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-dark-100 flex justify-end gap-3 bg-dark-50/50">
              <button onClick={() => setShowAreasModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSaveAreas} disabled={savingAreas} className="btn-primary">
                {savingAreas ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar Áreas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Metodos */}
      {showMetodosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-dark-900">Métodos Aplicados</h3>
                <p className="text-xs text-dark-500 mt-0.5">Selecciona las técnicas específicas utilizadas en el servicio</p>
              </div>
              <button onClick={() => setShowMetodosModal(false)} className="p-2 hover:bg-dark-50 rounded-lg text-dark-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(() => {
                  let arr = METODOS_DESINSECTACION;
                  const t = (orden.tipo_plaga || '').toLowerCase();
                  if (t.includes('rat') || t.includes('roe')) arr = METODOS_DESRATIZACION;
                  if (t.includes('infec') || t.includes('sani') || t.includes('micro')) arr = METODOS_DESINFECCION;
                  
                  return [...arr, "Otro método"].map(met => (
                    <label key={met} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedMetodos.includes(met) ? 'bg-primary-50 border-primary-200' : 'bg-white border-dark-200 hover:border-primary-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedMetodos.includes(met)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMetodos([...selectedMetodos, met])
                          else setSelectedMetodos(selectedMetodos.filter(a => a !== met))
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-dark-700 leading-snug">{met}</span>
                    </label>
                  ))
                })()}
              </div>
            </div>
            <div className="p-6 border-t border-dark-100 flex justify-end gap-3 shrink-0 bg-dark-50">
              <button onClick={() => setShowMetodosModal(false)} className="btn-secondary">Cancelar</button>
              <button disabled={savingMetodos} onClick={handleSaveMetodos} className="btn-primary min-w-[120px]">
                {savingMetodos ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
