import { useCallback } from 'react'
import api from '../lib/api'
import db from '../lib/db'
import { useOffline } from '../contexts/OfflineContext'

/**
 * useSyncQueue
 *
 * Envuelve las operaciones de escritura para que caigan a IndexedDB
 * cuando el dispositivo está sin conexión, y se ejecuten de inmediato cuando hay conexión.
 *
 * Uso:
 *   const { queueOrExecute, queuePhoto } = useSyncQueue()
 *
 *   // En lugar de: await supabase.from('actividades_servicio').insert(payload)
 *   await queueOrExecute('actividades_servicio', 'insert', payload, ordenId)
 */
export function useSyncQueue() {
  const { isOnline, refreshCount } = useOffline()

  /**
   * Ejecuta una escritura en BD si hay conexión, o la encola para más tarde.
   * @param {string} table - Nombre de la tabla
   * @param {'insert'|'update'|'delete'|'upsert'} operation
   * @param {object} payload - Datos de la fila. Para actualizaciones/eliminaciones debe incluir `id`.
   * @param {string} [ordenId] - UUID de la orden de servicio asociada (para contexto).
   * @returns {{ data, error, queued }} queued=true significa que fue guardado sin conexión.
   */
  const queueOrExecute = useCallback(async (table, operation, payload, ordenId = null) => {
    if (isOnline) {
      // Ejecutar directamente vía API
      const token = localStorage.getItem('token')
      const endpoint = `/${table.replace(/_/g, '-')}` // Convertir table_name a table-name
      let result

        if (operation === 'insert') {
          const res = await api.post(endpoint, payload, { token })
          result = { data: [res.data || res], error: null }
        } else if (operation === 'update') {
          const { id, ...rest } = payload
          const res = await api.patch(`${endpoint}/${id}`, rest, { token })
          result = { data: [res.data || res], error: null }
        } else if (operation === 'delete') {
          await api.delete(`${endpoint}/${payload.id}`, { token })
          result = { data: null, error: null }
        } else if (operation === 'upsert') {
          const res = await api.put(endpoint, payload, { token })
          result = { data: [res.data || res], error: null }
        }
        return { ...result, queued: false }
    }

    // Sin conexión: encolar la operación
    const queued = { table, operation, payload, ordenId, attempts: 0, createdAt: Date.now() }
    const id = await db.sync_queue.add(queued)
    await refreshCount()

    // Devolver una respuesta "falsa" exitosa para que la UI pueda actualizarse optimistamente
    const fakeRow = { ...payload, _offline_id: id, _queued: true }
    return { data: [fakeRow], error: null, queued: true }
  }, [isOnline, refreshCount])

  /**
   * Sube una foto si hay conexión, o almacena un Blob localmente para subirlo después.
   * @param {string} bucket - Nombre del bucket de almacenamiento
   * @param {string} path - Ruta destino en el bucket
   * @param {File|Blob} file - El archivo a subir
   * @param {string} contentType - Tipo MIME
   * @param {string|null} dbTable - Si se provee, inserta una fila en esta tabla tras la subida exitosa
   * @param {object|null} dbPayload - Payload para el insert en BD (el campo url se rellena automáticamente)
   * @param {string} [ordenId]
   * @returns {{ publicUrl, error, queued }}
   */
  const queuePhoto = useCallback(async (bucket, path, file, contentType, dbTable = null, dbPayload = null, ordenId = null) => {
    if (isOnline) {
      const token = localStorage.getItem('token')
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
      
      try {
        // Crear FormData para la subida del archivo
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', path)
        formData.append('bucket', bucket)
        
        if (dbPayload) {
          Object.keys(dbPayload).forEach(key => {
            formData.append(key, dbPayload[key])
          })
        }

        const response = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Upload failed' }))
          return { publicUrl: null, error: new Error(error.message || 'Upload failed'), queued: false }
        }

        const data = await response.json()
        const publicUrl = data.publicUrl

        if (dbTable && dbPayload) {
          const dbEndpoint = `/${dbTable.replace(/_/g, '-')}`
          await api.post(dbEndpoint, { ...dbPayload, url: publicUrl }, { token })
        }

        return { publicUrl, error: null, queued: false }
      } catch (error) {
        return { publicUrl: null, error, queued: false }
      }
    }

    // Sin conexión: almacenar el blob en IndexedDB
    const blobData = file instanceof Blob ? file : new Blob([file], { type: contentType })
    await db.fotos_pendientes.add({
      bucket, path, blobData, contentType,
      dbTable, dbPayload, ordenId,
      attempts: 0, createdAt: Date.now()
    })
    await refreshCount()

    // Devolver una URL local falsa para poder previsualizar la imagen sin conexión
    const localUrl = URL.createObjectURL(blobData)
    return { publicUrl: localUrl, error: null, queued: true }
  }, [isOnline, refreshCount])

  return { queueOrExecute, queuePhoto }
}
