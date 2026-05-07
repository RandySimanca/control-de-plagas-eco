import Dexie from 'dexie'

/**
 * PlagControlDB — Local IndexedDB managed by Dexie.
 *
 * Tables:
 *   ordenes        → snapshot of orden + related data for offline reading.
 *   sync_queue     → pending write operations to be sent to backend.
 */
const db = new Dexie('PlagControlDB')

db.version(1).stores({
  ordenes: 'id, updated_at',
  sync_queue: '++id, table, operation, ordenId, createdAt',
  fotos_pendientes: '++id, bucket, ordenId, createdAt',
})

export default db
