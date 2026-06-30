import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import db from '../lib/db'
import api from '../lib/api'
import { useSyncQueue } from '../hooks/useSyncQueue'
import { useOffline } from '../contexts/OfflineContext'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { confirmDelete, successAlert } from '../lib/alerts'
import HelpButton from '../components/features/HelpButton'
import { HELP_CONTENT } from '../lib/helpContent'

import {
  OrdenHeader,
  OrdenProductos,
  OrdenEstaciones,
  OrdenActividades,
  OrdenFotos,
  OrdenCertificado,
  OrdenTecnicoDetalles
} from '../components/features/orden'

export default function OrdenDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin, profile } = useAuth()
  const { isOnline } = useOffline()
  const { queueOrExecute, queuePhoto } = useSyncQueue()

  // --- Estado Fuente de Verdad ---
  const [orden, setOrden] = useState(null)
  const [productos, setProductos] = useState([])
  const [estaciones, setEstaciones] = useState([])
  const [fotos, setFotos] = useState([])
  const [certificado, setCertificado] = useState(null)
  const [actividades, setActividades] = useState([])
  const [loading, setLoading] = useState(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [id])

  async function load() {
    try {
      if (isOnline) {
        const token = localStorage.getItem('token')
        const [ordenRes, prodsRes, fotosRes, certRes, actividadesRes, estacRes] = await Promise.all([
          api.get(`/ordenes/${id}`, { token }),
          api.get(`/ordenes/${id}/productos`, { token }),
          api.get(`/ordenes/${id}/fotos`, { token }),
          api.get(`/ordenes/${id}/certificado`, { token }),
          api.get(`/ordenes/${id}/actividades`, { token }),
          api.get(`/ordenes/${id}/estaciones`, { token })
        ])

        const snapshot = {
          id,
          orden: ordenRes.data,
          productos: prodsRes.data || [],
          fotos: fotosRes.data || [],
          certificado: certRes.data || null,
          actividades: actividadesRes.data || [],
          estaciones: estacRes.data || [],
          updated_at: Date.now()
        }

        await db.ordenes.put(snapshot)
        applySnapshot(snapshot)
      } else {
        const cached = await db.ordenes.get(id)
        if (cached) applySnapshot(cached)
        else {
          toast.error('No hay datos offline')
          navigate('/ordenes')
        }
      }
    } catch (err) {
      console.error(err)
      const cached = await db.ordenes.get(id)
      if (cached) {
        applySnapshot(cached)
        toast('Mostrando datos offline', { icon: '⚡' })
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
  }

  // --- Handlers de Alto Nivel ---

  async function handleDeleteOrden() {
    const isConfirmed = await confirmDelete('¿Estás seguro de eliminar esta orden?', 'Se borrarán también todas las actividades, fotos y el certificado asociado.')
    if (!isConfirmed) return
    try {
      await api.delete(`/ordenes/${id}`)
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!orden) return null

  const isAssignedTecnico = orden.tecnico_id === profile?.id

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-end mb-2">
        <HelpButton title="Detalle de Orden" content={HELP_CONTENT.ordenDetalle} />
      </div>
      {/* 1. Header e Información Base */}
      <OrdenHeader 
        orden={orden} 
        isAdmin={isAdmin} 
        isAssignedTecnico={isAssignedTecnico}
        onDeleteOrden={handleDeleteOrden}
        onChangeEstado={cambiarEstado}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Productos */}
        <OrdenProductos productos={productos} />

        {/* 3. Estaciones */}
        <OrdenEstaciones 
          ordenId={id}
          estaciones={estaciones}
          setEstaciones={setEstaciones}
          isAssignedTecnico={isAssignedTecnico}
          ordenEstado={orden.estado}
          isOnline={isOnline}
          queueOrExecute={queueOrExecute}
          queuePhoto={queuePhoto}
        />
      </div>

      {/* 4. Bitácora de Actividad */}
      <OrdenActividades 
        ordenId={id}
        actividades={actividades}
        setActividades={setActividades}
        setFotos={setFotos}
        isAssignedTecnico={isAssignedTecnico}
        ordenEstado={orden.estado}
        queueOrExecute={queueOrExecute}
        queuePhoto={queuePhoto}
      />

      {/* 5. Galería de Fotos */}
      <OrdenFotos 
        ordenId={id}
        fotos={fotos}
        setFotos={setFotos}
        isAssignedTecnico={isAssignedTecnico}
        ordenEstado={orden.estado}
        queuePhoto={queuePhoto}
      />

      {/* 6. Detalles Técnicos (Áreas, Métodos, Recomendaciones) */}
      <OrdenTecnicoDetalles 
        orden={orden}
        setOrden={setOrden}
        setFotos={setFotos}
        isAssignedTecnico={isAssignedTecnico}
        queueOrExecute={queueOrExecute}
        queuePhoto={queuePhoto}
      />

      {/* 7. Certificado Final */}
      <OrdenCertificado 
        orden={orden}
        productos={productos}
        estaciones={estaciones}
        actividades={actividades}
        fotos={fotos}
        certificado={certificado}
        setCertificado={setCertificado}
      />
    </div>
  )
}
