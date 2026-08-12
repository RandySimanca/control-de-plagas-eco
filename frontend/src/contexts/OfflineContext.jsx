import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import db from '../lib/db'
import api from '../lib/api'
import toast from 'react-hot-toast'

const OfflineContext = createContext({})

// eslint-disable-next-line react-refresh/only-export-components
export const useOffline = () => useContext(OfflineContext)

// Claves de caché de listas — deben coincidir con las usadas en Ordenes.jsx y Dashboard.jsx
const CACHE_KEYS_LISTAS = ['ordenes_lista', 'dashboard_data']

// Estados de orden que deben estar disponibles offline para trabajo en campo
const ESTADOS_ACTIVOS = ['programada', 'en_progreso']

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(new Date())
  const [syncError, setSyncError] = useState(false)
  // Contador que sube cada vez que hay una sincronización exitosa.
  // Los componentes pueden observarlo para refrescar datos.
  const [lastSyncSuccess, setLastSyncSuccess] = useState(0)
  // Estado del pre-cacheo silencioso
  const [isCachingOrders, setIsCachingOrders] = useState(false)
  const syncLock = useRef(false)
  const cacheLock = useRef(false)

  // Actualizar el contador de pendientes desde IndexedDB
  const refreshCount = useCallback(async () => {
    const [queueCount, photoCount] = await Promise.all([
      db.sync_queue.count(),
      db.fotos_pendientes.count(),
    ])
    const total = queueCount + photoCount
    setPendingCount(total)
    return total
  }, [])

  // Invalida las cachés de listas para forzar recarga fresca al volver online
  const invalidateCacheListas = useCallback(async () => {
    try {
      await db.cache_listas.bulkDelete(CACHE_KEYS_LISTAS)
    } catch {
      // La tabla puede no existir todavía; ignorar
    }
  }, [])

  /**
   * Pre-cachea silenciosamente en segundo plano todas las órdenes activas
   * del perfil dado, para que estén disponibles sin conexión en campo.
   * Solo se ejecuta si hay conexión y si no hay un pre-cacheo en curso.
   *
   * @param {object} profile - Perfil del usuario autenticado
   */
  const preCacheOrdenesActivas = useCallback(async (profile) => {
    if (!navigator.onLine || cacheLock.current || !profile?.id) return
    cacheLock.current = true
    setIsCachingOrders(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // 1. Obtener todas las órdenes activas del técnico (o todas si es admin)
      const { data: allOrdenes } = await api.get('/ordenes-servicio', { token })
      const ordenes = (allOrdenes || []).filter(o => {
        const estaActiva = ESTADOS_ACTIVOS.includes(o.estado)
        if (!estaActiva) return false
        // Para técnicos: solo sus órdenes asignadas
        if (profile.rol === 'tecnico') return o.tecnico_id === profile.id
        return true
      })

      if (ordenes.length === 0) return

      // Cachear el catálogo de productos para uso offline
      try {
        const { data: catRes } = await api.get('/productos-catalogo', { token })
        await db.cache_listas.put({ clave: 'productos_catalogo', data: catRes || [], updated_at: Date.now() })
      } catch (err) {
        console.warn('Error cacheando catálogo de productos:', err)
      }

      // 2. Descargar el snapshot completo de cada orden y guardarlo en IndexedDB
      let cachedCount = 0
      for (const orden of ordenes) {
        try {
          // Si ya existe un snapshot reciente (menos de 1 hora), no re-descargar
          const existing = await db.ordenes.get(orden.id)
          const unaHora = 60 * 60 * 1000
          if (existing && (Date.now() - existing.updated_at) < unaHora) continue

          const [prodsRes, fotosRes, certRes, actividadesRes, estacRes, estacMaestrasRes] = await Promise.all([
            api.get(`/ordenes/${orden.id}/productos`, { token }),
            api.get(`/ordenes/${orden.id}/fotos`, { token }),
            api.get(`/ordenes/${orden.id}/certificado`, { token }),
            api.get(`/ordenes/${orden.id}/actividades`, { token }),
            api.get(`/ordenes/${orden.id}/estaciones`, { token }),
            api.get(`/clientes/${orden.cliente_id}/estaciones`, { token })
          ])

          const snapshot = {
            id: orden.id,
            orden,
            productos: prodsRes.data || [],
            fotos: fotosRes.data || [],
            certificado: certRes.data || null,
            actividades: actividadesRes.data || [],
            estaciones: estacRes.data || [],
            estaciones_maestras: estacMaestrasRes.data?.data || [],
            updated_at: Date.now()
          }

          await db.ordenes.put(snapshot)
          cachedCount++
        } catch (err) {
          // Si falla una orden individual, continuar con las demás
          console.warn(`Pre-cacheo de orden ${orden.id} falló:`, err)
        }
      }

      if (cachedCount > 0) {
        console.info(`[Offline] ${cachedCount} orden(es) pre-cacheada(s) para trabajo sin conexión`)
      }
    } catch (err) {
      console.warn('[Offline] Error en pre-cacheo de órdenes:', err)
    } finally {
      cacheLock.current = false
      setIsCachingOrders(false)
    }
  }, [])

  // ----- Lógica central de sincronización -----
  const syncAll = useCallback(async () => {
    if (syncLock.current || !navigator.onLine) return
    syncLock.current = true
    setIsSyncing(true)
    setSyncError(false)

    let hadErrors = false

    try {
      // 1. Procesar la cola de operaciones de escritura
      const ops = await db.sync_queue.orderBy('createdAt').toArray()
      const token = localStorage.getItem('token')
      
      for (const op of ops) {
        try {
          const endpoint = `/${op.table.replace(/_/g, '-')}` // Convertir table_name a table-name
          
          if (op.operation === 'insert') {
            await api.post(endpoint, op.payload, { token })
          } else if (op.operation === 'update') {
            const { id, ...rest } = op.payload
            await api.patch(`${endpoint}/${id}`, rest, { token })
          } else if (op.operation === 'delete') {
            await api.delete(`${endpoint}/${op.payload.id}`, { token })
          } else if (op.operation === 'upsert') {
            await api.put(endpoint, op.payload, { token })
          } else if (op.operation === 'delete_where') {
            await api.delete(`${endpoint}?${op.filter}=${op.value}`, { token })
          }
          await db.sync_queue.delete(op.id)
        } catch (err) {
          console.error('Fallo de sincronización para la operación', op.id, err)
          hadErrors = true
          // Incrementar intentos; descartar después de 5 fallos
          const attempts = (op.attempts || 0) + 1
          if (attempts >= 5) {
            await db.sync_queue.delete(op.id)
            toast.error(`Operación descartada tras 5 intentos: ${op.table}`)
          } else {
            await db.sync_queue.update(op.id, { attempts })
          }
        }
      }

      // 2. Subir fotos pendientes
      const pendingPhotos = await db.fotos_pendientes.orderBy('createdAt').toArray()
      for (const item of pendingPhotos) {
        try {
          const formData = new FormData()
          // Se asegura de enviar el blob con un nombre de archivo por defecto si es necesario
          formData.append('file', item.blobData, 'offline_photo.jpg')
          formData.append('path', item.path)
          formData.append('bucket', item.bucket)
          
          if (item.dbPayload) {
            Object.keys(item.dbPayload).forEach(key => {
              formData.append(key, item.dbPayload[key])
            })
          }

          const token = localStorage.getItem('token')
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
          
          const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          })

          if (!response.ok) throw new Error('Error al subir la foto')

          const data = await response.json()
          const publicUrl = data.publicUrl

          // Guardar el registro en la base de datos para que la foto aparezca en la orden
          if (item.dbTable && item.dbPayload) {
            const dbEndpoint = `/${item.dbTable.replace(/_/g, '-')}`
            await api.post(dbEndpoint, { ...item.dbPayload, url: publicUrl }, { token })
          }

          await db.fotos_pendientes.delete(item.id)
        } catch (err) {
          console.error('Fallo de sincronización de foto para el elemento', item.id, err)
          hadErrors = true
          const attempts = (item.attempts || 0) + 1
          if (attempts >= 5) {
            await db.fotos_pendientes.delete(item.id)
          } else {
            await db.fotos_pendientes.update(item.id, { attempts })
          }
        }
      }
    } catch (err) {
      console.error('Error global de syncAll:', err)
      hadErrors = true
    } finally {
      syncLock.current = false
      setIsSyncing(false)
      const remaining = await refreshCount()
      if (hadErrors || remaining > 0) {
        setSyncError(true)
      } else {
        setSyncError(false)
        setLastSyncTime(new Date())
        // Sincronización exitosa: invalidar cachés de listas para que los
        // componentes recarguen datos frescos del servidor al próximo render
        await invalidateCacheListas()
        setLastSyncSuccess(prev => prev + 1)
      }
    }
  }, [refreshCount, invalidateCacheListas])

  // Escuchar eventos de conexión/desconexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setTimeout(() => syncAll(), 500)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncAll])

  // Carga inicial del contador al montar + sincronizar si hay operaciones pendientes
  useEffect(() => {
    refreshCount().then(async () => {
      if (navigator.onLine) {
        const count = await db.sync_queue.count()
        if (count > 0) syncAll()
      }
    })
  }, [refreshCount, syncAll])

  return (
    <OfflineContext.Provider value={{
      isOnline, isSyncing, pendingCount,
      syncAll, refreshCount,
      lastSyncTime, syncError, lastSyncSuccess,
      isCachingOrders, preCacheOrdenesActivas
    }}>
      {children}
    </OfflineContext.Provider>
  )
}
