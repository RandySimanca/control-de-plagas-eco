import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import db from '../lib/db'
import api from '../lib/api'
import toast from 'react-hot-toast'

const OfflineContext = createContext({})

// eslint-disable-next-line react-refresh/only-export-components
export const useOffline = () => useContext(OfflineContext)

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const syncLock = useRef(false)

  // Actualizar el contador de pendientes desde IndexedDB
  const refreshCount = useCallback(async () => {
    const [queueCount, photoCount] = await Promise.all([
      db.sync_queue.count(),
      db.fotos_pendientes.count(),
    ])
    setPendingCount(queueCount + photoCount)
  }, [])

  // ----- Lógica central de sincronización -----
  const syncAll = useCallback(async () => {
    if (syncLock.current || !navigator.onLine) return
    syncLock.current = true
    setIsSyncing(true)

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
          // Crear FormData para la subida del archivo
          const formData = new FormData()
          formData.append('file', item.blobData)
          formData.append('path', item.path)
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

          await db.fotos_pendientes.delete(item.id)
        } catch (err) {
          console.error('Fallo de sincronización de foto para el elemento', item.id, err)
          const attempts = (item.attempts || 0) + 1
          if (attempts >= 5) {
            await db.fotos_pendientes.delete(item.id)
          } else {
            await db.fotos_pendientes.update(item.id, { attempts })
          }
        }
      }
    } finally {
      syncLock.current = false
      setIsSyncing(false)
      await refreshCount()
    }
  }, [refreshCount])

  // Escuchar eventos de conexión/desconexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setTimeout(() => syncAll(), 500) // Pequeña espera para que la conexión se estabilice
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
    <OfflineContext.Provider value={{ isOnline, isSyncing, pendingCount, syncAll, refreshCount }}>
      {children}
    </OfflineContext.Provider>
  )
}
