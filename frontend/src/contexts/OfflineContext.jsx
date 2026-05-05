import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import db from '../lib/db'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const OfflineContext = createContext({})

// eslint-disable-next-line react-refresh/only-export-components
export const useOffline = () => useContext(OfflineContext)

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const syncLock = useRef(false)

  // Refresh pending count from IndexedDB
  const refreshCount = useCallback(async () => {
    const [queueCount, photoCount] = await Promise.all([
      db.sync_queue.count(),
      db.fotos_pendientes.count(),
    ])
    setPendingCount(queueCount + photoCount)
  }, [])

  // ----- Core sync logic -----
  const syncAll = useCallback(async () => {
    if (syncLock.current || !navigator.onLine) return
    syncLock.current = true
    setIsSyncing(true)

    try {
      // 1. Process write operations queue
      const ops = await db.sync_queue.orderBy('createdAt').toArray()
      for (const op of ops) {
        try {
          if (op.operation === 'insert') {
            const { error } = await supabase.from(op.table).insert(op.payload)
            if (error) throw error
          } else if (op.operation === 'update') {
            const { id, ...rest } = op.payload
            const { error } = await supabase.from(op.table).update(rest).eq('id', id)
            if (error) throw error
          } else if (op.operation === 'delete') {
            const { error } = await supabase.from(op.table).delete().eq('id', op.payload.id)
            if (error) throw error
          } else if (op.operation === 'upsert') {
            const { error } = await supabase.from(op.table).upsert(op.payload)
            if (error) throw error
          } else if (op.operation === 'delete_where') {
            const { filter, value } = op.payload
            const { error } = await supabase.from(op.table).delete().eq(filter, value)
            if (error) throw error
          }
          await db.sync_queue.delete(op.id)
        } catch (err) {
          console.error('Sync failed for op', op.id, err)
          // Increment attempts; drop after 5 failed tries
          const attempts = (op.attempts || 0) + 1
          if (attempts >= 5) {
            await db.sync_queue.delete(op.id)
            toast.error(`Operación descartada tras 5 intentos: ${op.table}`)
          } else {
            await db.sync_queue.update(op.id, { attempts })
          }
        }
      }

      // 2. Upload pending photos
      const pendingPhotos = await db.fotos_pendientes.orderBy('createdAt').toArray()
      for (const item of pendingPhotos) {
        try {
          const { error: uploadError } = await supabase.storage
            .from(item.bucket)
            .upload(item.path, item.blobData, { upsert: true, contentType: item.contentType })
          if (uploadError) throw uploadError

          // Insert the DB row if metadata is present
          if (item.dbTable && item.dbPayload) {
            const { data: urlData } = supabase.storage.from(item.bucket).getPublicUrl(item.path)
            const payload = { ...item.dbPayload, url: urlData.publicUrl }
            await supabase.from(item.dbTable).insert(payload)
          }
          await db.fotos_pendientes.delete(item.id)
        } catch (err) {
          console.error('Photo sync failed for item', item.id, err)
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

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setTimeout(() => syncAll(), 500) // Small delay to let the connection stabilize
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncAll])

  // Initial count on mount + sync if online with pending ops
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
