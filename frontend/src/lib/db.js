import Dexie from 'dexie'

/**
 * PlagControlDB — Base de datos local IndexedDB gestionada por Dexie.
 *
 * Tablas:
 *   ordenes        → snapshot de la orden + datos relacionados para lectura sin conexión.
 *   sync_queue     → operaciones de escritura pendientes de ser enviadas al backend.
 */
const db = new Dexie('PlagControlDB')

db.version(1).stores({
  ordenes: 'id, updated_at',
  sync_queue: '++id, table, operation, ordenId, createdAt',
  fotos_pendientes: '++id, bucket, ordenId, createdAt',
})

export default db
