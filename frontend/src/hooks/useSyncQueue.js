import { useCallback } from 'react'
import api from '../lib/api'
import db from '../lib/db'
import { useOffline } from '../contexts/OfflineContext'

/**
 * useSyncQueue
 *
 * Wraps write operations so they fall through to IndexedDB
 * when the device is offline, and execute immediately when online.
 *
 * Usage:
 *   const { queueOrExecute, queuePhoto } = useSyncQueue()
 *
 *   // Instead of: await supabase.from('actividades_servicio').insert(payload)
 *   await queueOrExecute('actividades_servicio', 'insert', payload, ordenId)
 */
export function useSyncQueue() {
  const { isOnline, refreshCount } = useOffline()

  /**
   * Execute a DB write online or queue it for later.
   * @param {string} table - Table name
   * @param {'insert'|'update'|'delete'|'upsert'} operation
   * @param {object} payload - Row data. For updates/deletes must include `id`.
   * @param {string} [ordenId] - UUID of the associated service order (for context).
   * @returns {{ data, error, queued }} queued=true means it was saved offline.
   */
  const queueOrExecute = useCallback(async (table, operation, payload, ordenId = null) => {
    if (isOnline) {
      // Execute directly via API
      const token = localStorage.getItem('token')
      const endpoint = `/${table.replace(/_/g, '-')}` // Convert table_name to table-name
      let result

      try {
        if (operation === 'insert') {
          const data = await api.post(endpoint, payload, { token })
          result = { data: [data], error: null }
        } else if (operation === 'update') {
          const { id, ...rest } = payload
          const data = await api.patch(`${endpoint}/${id}`, rest, { token })
          result = { data: [data], error: null }
        } else if (operation === 'delete') {
          await api.delete(`${endpoint}/${payload.id}`, { token })
          result = { data: null, error: null }
        } else if (operation === 'upsert') {
          const data = await api.put(endpoint, payload, { token })
          result = { data: [data], error: null }
        }
        return { ...result, queued: false }
      } catch (error) {
        return { data: null, error, queued: false }
      }
    }

    // Offline: enqueue
    const queued = { table, operation, payload, ordenId, attempts: 0, createdAt: Date.now() }
    const id = await db.sync_queue.add(queued)
    await refreshCount()

    // Return a "fake" successful response so the UI can optimistically update
    const fakeRow = { ...payload, _offline_id: id, _queued: true }
    return { data: [fakeRow], error: null, queued: true }
  }, [isOnline, refreshCount])

  /**
   * Upload a photo online or store a Blob locally for later upload.
   * @param {string} bucket - Storage bucket name
   * @param {string} path - Target path in bucket
   * @param {File|Blob} file - The file to upload
   * @param {string} contentType - MIME type
   * @param {string|null} dbTable - If provided, inserts a row in this table after successful upload
   * @param {object|null} dbPayload - Payload for DB insert (url field will be filled in automatically)
   * @param {string} [ordenId]
   * @returns {{ publicUrl, error, queued }}
   */
  const queuePhoto = useCallback(async (bucket, path, file, contentType, dbTable = null, dbPayload = null, ordenId = null) => {
    if (isOnline) {
      const token = localStorage.getItem('token')
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
      
      try {
        // Create FormData for file upload
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

    // Offline: store blob in IndexedDB
    const blobData = file instanceof Blob ? file : new Blob([file], { type: contentType })
    await db.fotos_pendientes.add({
      bucket, path, blobData, contentType,
      dbTable, dbPayload, ordenId,
      attempts: 0, createdAt: Date.now()
    })
    await refreshCount()

    // Return a fake blob URL so the image can be previewed offline
    const localUrl = URL.createObjectURL(blobData)
    return { publicUrl: localUrl, error: null, queued: true }
  }, [isOnline, refreshCount])

  return { queueOrExecute, queuePhoto }
}
