import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/db'
import { useOffline } from '../contexts/OfflineContext'

/**
 * useSyncQueue
 *
 * Wraps Supabase write operations so they fall through to IndexedDB
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
   * @param {string} table - Supabase table name
   * @param {'insert'|'update'|'delete'|'upsert'} operation
   * @param {object} payload - Row data. For updates/deletes must include `id`.
   * @param {string} [ordenId] - UUID of the associated service order (for context).
   * @returns {{ data, error, queued }} queued=true means it was saved offline.
   */
  const queueOrExecute = useCallback(async (table, operation, payload, ordenId = null) => {
    if (isOnline) {
      // Execute directly
      let result
      if (operation === 'insert') result = await supabase.from(table).insert(payload).select()
      else if (operation === 'update') {
        const { id, ...rest } = payload
        result = await supabase.from(table).update(rest).eq('id', id).select()
      }
      else if (operation === 'delete') result = await supabase.from(table).delete().eq('id', payload.id)
      else if (operation === 'upsert') result = await supabase.from(table).upsert(payload).select()
      return { ...result, queued: false }
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
   * Upload a photo online or store the Blob locally for later upload.
   * @param {string} bucket - Supabase Storage bucket name
   * @param {string} path - Target path in the bucket
   * @param {File|Blob} file - The file to upload
   * @param {string} contentType - MIME type
   * @param {string|null} dbTable - If provided, inserts a row in this table after successful upload
   * @param {object|null} dbPayload - Payload for the DB insert (url field will be filled in automatically)
   * @param {string} [ordenId]
   * @returns {{ publicUrl, error, queued }}
   */
  const queuePhoto = useCallback(async (bucket, path, file, contentType, dbTable = null, dbPayload = null, ordenId = null) => {
    if (isOnline) {
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { contentType, upsert: true })
      if (uploadError) return { publicUrl: null, error: uploadError, queued: false }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      if (dbTable && dbPayload) {
        await supabase.from(dbTable).insert({ ...dbPayload, url: publicUrl })
      }
      return { publicUrl, error: null, queued: false }
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
