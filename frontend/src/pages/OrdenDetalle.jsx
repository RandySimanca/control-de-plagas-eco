import { useState, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
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
import { useConfig } from '../contexts/ConfigContext'
import { generateFolio } from '../utils/empresaUtils'

import {
  OrdenHeader,
  OrdenProductos,
  OrdenEstaciones,
  OrdenActividades,
  OrdenFotos,
  OrdenInformeActividades,
  OrdenTecnicoDetalles,
  OrdenEditarModal,
  OrdenTecnicoHub,
  OrdenInformeTecnico
} from '../components/features/orden'
import OrdenCertificadoSanitario from '../components/features/orden/OrdenCertificadoSanitario'
import OrdenLavadoTanques from '../components/features/orden/OrdenLavadoTanques'
import { isVisitaTecnica, puedeGenerarInforme } from '../utils/tipoVisitaConfig'

export default function OrdenDetalle() {
  const { id } = useParams()
  const { nombreEmpresa } = useConfig()
  const navigate = useNavigate()
  const { isAdmin, profile } = useAuth()
  const { isOnline } = useOffline()
  const { queueOrExecute, queuePhoto } = useSyncQueue()
  const actividadesRef = useRef(null)

  // --- Estado Fuente de Verdad ---
  const [orden, setOrden] = useState(null)
  const [productos, setProductos] = useState([])
  const [estaciones, setEstaciones] = useState([])
  const [fotos, setFotos] = useState([])
  const [certificado, setCertificado] = useState(null)
  const [actividades, setActividades] = useState([])
  const [relevamiento, setRelevamiento] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [id])

  async function load() {
    try {
      if (isOnline) {
        const token = localStorage.getItem('token')
        const requests = [
          api.get(`/ordenes/${id}`, { token }),
          api.get(`/ordenes/${id}/productos`, { token }),
          api.get(`/ordenes/${id}/fotos`, { token }),
          api.get(`/ordenes/${id}/certificado`, { token }),
          api.get(`/ordenes/${id}/actividades`, { token }),
          api.get(`/ordenes/${id}/estaciones`, { token })
        ]
        const [ordenRes, prodsRes, fotosRes, certRes, actividadesRes, estacRes] = await Promise.all(requests)

        let relevamientoData = null
        if (ordenRes.data?.tipo_visita === 'tecnica') {
          try {
            const relRes = await api.get(`/ordenes/${id}/relevamiento`, { token })
            relevamientoData = relRes.data || null
          } catch {
            relevamientoData = null
          }
        }

        const snapshot = {
          id,
          orden: ordenRes.data,
          productos: prodsRes.data || [],
          fotos: fotosRes.data || [],
          certificado: certRes.data || null,
          actividades: actividadesRes.data || [],
          estaciones: estacRes.data || [],
          relevamiento: relevamientoData,
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
    setRelevamiento(snapshot.relevamiento || null)
  }

  // --- Handlers de Alto Nivel ---

  async function handleDeleteOrden() {
    const isConfirmed = await confirmDelete('¿Estás seguro de eliminar esta orden?', 'Se borrarán también todas las actividades, fotos y el informe asociado.')
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
      if (nuevoEstado === 'en_progreso' && !orden.fecha_inicio) {
        updates.fecha_inicio = new Date().toISOString().split('T')[0]
      }
      if (nuevoEstado === 'completada') {
        updates.fecha_completada = new Date().toISOString().split('T')[0]
        if (!certificado && orden.tipo_visita !== 'tecnica') {
          const folio = generateFolio(nombreEmpresa)
          await queueOrExecute('certificados', 'insert', { orden_id: id, folio }, id)
          setCertificado({ folio })
        }
        // Generar automáticamente certificado sanitario para órdenes regulares
        if (orden.tipo_visita !== 'tecnica') {
          try {
            const token = localStorage.getItem('token')
            
            // Verificar si ya existe certificado sanitario
            const existingCert = await api.get(`/ordenes/${id}/certificado-sanitario`, { token })
            if (existingCert.data) {
              console.log('Certificado sanitario ya existe, no se genera nuevo')
            } else {
              const configRes = await api.get('/configuracion', { token })
              const config = configRes.data
              
              const folioCertSanitario = `CS-${new Date().getFullYear()}-${id.split('-')[0]}`
              const payload = {
                orden_id: id,
                folio: folioCertSanitario,
                tipo_establecimiento: orden.clientes?.tipo || 'Establecimiento',
                tipo_servicio: orden.tipo_plaga || 'Control Integral de Plagas',
                resultado: 'CUMPLE',
                observaciones: '',
                fecha_servicio: orden.fecha_programada || orden.created_at,
                fecha_emision: new Date().toISOString(),
                fecha_vencimiento: new Date(new Date().setMonth(new Date().getMonth() + (config?.vigencia_certificado_meses || 3))).toISOString(),
                normativa_referencia: 'Resolución 2674 de 2013, Decreto 1843 de 1991'
              }
              
              await api.post('/certificados-sanitarios', payload, { token })
              toast.success('Certificado Sanitario generado automáticamente')
            }
          } catch (err) {
            console.error('Error al generar certificado sanitario automático:', err)
            // No mostrar error al usuario para no interrumpir el flujo
          }
        }
        if (orden.tipo_visita === 'tecnica' && relevamiento && puedeGenerarInforme(relevamiento) && !relevamiento.informe_generado_at) {
          try {
            const token = localStorage.getItem('token')
            const folio = generateFolio(nombreEmpresa)
            const { data } = await api.post('/informes-tecnicos', { orden_id: id, folio }, { token })
            setRelevamiento(data)
          } catch (err) {
            console.error('Error al registrar informe técnico:', err)
          }
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

  const isAssignedTecnico = orden.tecnico_id === profile?.id || profile?.rol === 'tecnico'
  const esVisitaTecnica = isVisitaTecnica(orden)

  return (
    <div className={`max-w-4xl mx-auto ${isAssignedTecnico && orden.estado === 'en_progreso' ? 'pb-24 sm:pb-0' : ''}`}>
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
        onEditClick={() => setShowEditModal(true)}
      />

      {/* Hub de Botones de Trabajo del Técnico (Móvil / Escritorio) */}
      <div className="mt-6">
        <OrdenTecnicoHub
          orden={orden}
          setOrden={setOrden}
          productos={productos}
          setProductos={setProductos}
          estaciones={estaciones}
          setEstaciones={setEstaciones}
          actividades={actividades}
          setActividades={setActividades}
          fotos={fotos}
          setFotos={setFotos}
          certificado={certificado}
          setCertificado={setCertificado}
          relevamiento={relevamiento}
          setRelevamiento={setRelevamiento}
          isAssignedTecnico={isAssignedTecnico}
          isAdmin={isAdmin}
          queueOrExecute={queueOrExecute}
          queuePhoto={queuePhoto}
          isOnline={isOnline}
        />
      </div>

      {/* Vista admin: informe técnico para visitas de relevamiento */}
      {isAdmin && esVisitaTecnica && (
        <OrdenInformeTecnico
          orden={orden}
          relevamiento={relevamiento}
          setRelevamiento={setRelevamiento}
          isAdmin={isAdmin}
          queuePhoto={queuePhoto}
          queueOrExecute={queueOrExecute}
        />
      )}

      {/* Vista tradicional: solo visible para admin en visitas de servicio */}
      {!isAssignedTecnico && !esVisitaTecnica && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* 2. Productos */}
            <OrdenProductos 
              ordenId={id}
              productos={productos} 
              setProductos={setProductos}
              isAssignedTecnico={isAssignedTecnico}
              ordenEstado={orden.estado}
              queueOrExecute={queueOrExecute}
              ordenTipoPlaga={orden.tipo_plaga}
              isOnline={isOnline}
              ordenTecnicoId={orden.tecnico_id}
            />

            {/* 3. Estaciones */}
            <OrdenEstaciones 
              ordenId={id}
              clienteId={orden.cliente_id}
              sedeId={orden.sede_id}
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
            ref={actividadesRef}
            ordenId={id}
            actividades={actividades}
            setActividades={setActividades}
            fotos={fotos}
            setFotos={setFotos}
            isAssignedTecnico={isAssignedTecnico}
            isAdmin={isAdmin}
            ordenEstado={orden.estado}
            ordenTipoPlaga={orden.tipo_plaga}
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
            isAdmin={isAdmin}
            queuePhoto={queuePhoto}
          />

          {/* 5.5 Lavado de Tanques (Si aplica) */}
          {orden.lavado_tanques && (
            <OrdenLavadoTanques 
              ordenId={id}
              isAssignedTecnico={isAssignedTecnico}
              isAdmin={isAdmin}
              ordenEstado={orden.estado}
              queuePhoto={queuePhoto}
              queueOrExecute={queueOrExecute}
              actividades={actividades}
              setActividades={setActividades}
            />
          )}

          {/* 6. Detalles Técnicos (Áreas, Métodos, Recomendaciones) */}
          <OrdenTecnicoDetalles 
            orden={orden}
            setOrden={setOrden}
            setFotos={setFotos}
            isAssignedTecnico={isAssignedTecnico}
            queueOrExecute={queueOrExecute}
            queuePhoto={queuePhoto}
          />

          {/* 7. Informe General de Actividades */}
          <OrdenInformeActividades 
            orden={orden}
            productos={productos}
            estaciones={estaciones}
            actividades={actividades}
            fotos={fotos}
            certificado={certificado}
            setCertificado={setCertificado}
          />

          {/* 8. Certificado Sanitario */}
          <OrdenCertificadoSanitario 
            orden={orden}
            cliente={orden.clientes}
            isAdmin={isAdmin}
            isAssignedTecnico={isAssignedTecnico}
          />
        </>
      )}

      {/* FAB móvil: registrar avance rápido (técnico en campo) */}
      {isAssignedTecnico && orden.estado === 'en_progreso' && !esVisitaTecnica && (
        <button
          type="button"
          onClick={() => actividadesRef.current?.openWizard()}
          className="fixed bottom-6 right-6 z-40 sm:hidden w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/40 flex items-center justify-center hover:bg-primary-700 active:scale-95 transition-all"
          title="Registrar avance"
          aria-label="Registrar avance"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Modal de Edición de Orden (solo admin) */}
      {showEditModal && isAdmin && (
        <OrdenEditarModal 
          orden={orden} 
          onClose={() => setShowEditModal(false)}
          onSave={(updatedOrden) => {
            setOrden(updatedOrden)
            setShowEditModal(false)
          }}
          queueOrExecute={queueOrExecute}
        />
      )}
    </div>
  )
}
