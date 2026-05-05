import Dexie from 'dexie'

/**
 * PlagControlDB — Local IndexedDB managed by Dexie.
 *
 * Tables:
 *   ordenes        → snapshot of orden + related data for offline reading.
 *   sync_queue     → pending write operations to be sent to Supabase.
 *   fotos_pendientes → photo Blobs that couldn't be uploaded yet.
 */
const db = new Dexie('PlagControlDB')

db.version(1).stores({
  // Keyed by the Supabase orden UUID
  ordenes: 'id, empresa_id, updated_at',

  // Each queued operation: { id (auto), table, operation, payload, ordenId, attempts, createdAt }
  sync_queue: '++id, table, operation, ordenId, createdAt',

  // Pending photo uploads: { id (auto), bucket, path, ordenId, metadata, blobData }
  fotos_pendientes: '++id, bucket, ordenId, createdAt',
})

export default db
