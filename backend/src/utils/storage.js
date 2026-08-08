/**
 * storage.js — Capa de abstracción de almacenamiento
 *
 * Permite cambiar el proveedor de archivos sin tocar el resto del código.
 * Configura el driver mediante la variable de entorno STORAGE_DRIVER:
 *
 *   STORAGE_DRIVER=local  → guarda/borra en el sistema de archivos local (Docker)
 *   STORAGE_DRIVER=s3     → guarda/borra en AWS S3 (u otro proveedor compatible S3)
 *
 * Interfaz pública:
 *   storage.upload(bucket, filePath, buffer)  → { publicUrl, storagePath }
 *   storage.delete(storagePath)               → void
 */

import path from 'path';
import fs from 'fs';

// ─────────────────────────────────────────────
// DRIVER LOCAL (sistema de archivos / Docker)
// ─────────────────────────────────────────────
const localDriver = {
  /**
   * Guarda un archivo en el sistema de archivos local dentro de /uploads.
   * @param {string} bucket  - Carpeta raíz (ej: 'documentos', 'fotos-servicio')
   * @param {string} filePath - Ruta relativa dentro del bucket (ej: 'legales/archivo.pdf')
   * @param {Buffer} buffer   - Contenido del archivo
   * @returns {{ publicUrl: string, storagePath: string }}
   */
  async upload(bucket, filePath, buffer) {
    const pathSegments = filePath.split('/').map(seg => path.basename(seg));
    const safeFilePath = pathSegments.join('/');

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const destDir = path.join(uploadsDir, bucket, ...pathSegments.slice(0, -1));
    const fileName = pathSegments[pathSegments.length - 1];

    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, fileName);
    fs.writeFileSync(destPath, buffer);

    return {
      publicUrl: `/uploads/${bucket}/${safeFilePath}`,
      storagePath: `${bucket}/${safeFilePath}`,
    };
  },

  /**
   * Elimina un archivo del sistema de archivos local.
   * @param {string} storagePath - Ruta relativa al directorio /uploads (ej: 'documentos/legales/archivo.pdf')
   */
  async delete(storagePath) {
    if (!storagePath) return;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const fullPath = path.join(uploadsDir, storagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  },
};

// ─────────────────────────────────────────────
// DRIVER S3 (AWS S3, Cloudflare R2, DigitalOcean Spaces, etc.)
// ─────────────────────────────────────────────
//
// TODO (producción): Cuando se confirme el proveedor de almacenamiento en la nube,
// descomentar este bloque y configurar las variables de entorno correspondientes.
//
// Pasos para activar S3:
//  1. Instalar el SDK: npm install @aws-sdk/client-s3
//  2. Agregar las variables de entorno al .env y docker-compose.yml:
//       STORAGE_DRIVER=s3
//       AWS_REGION=us-east-1          (o la región de tu proveedor)
//       AWS_ACCESS_KEY_ID=...
//       AWS_SECRET_ACCESS_KEY=...
//       AWS_BUCKET_NAME=nombre-del-bucket
//       AWS_ENDPOINT=...              (solo si usas Cloudflare R2 / DO Spaces / MinIO)
//       AWS_PUBLIC_URL=...            (URL pública base del bucket, ej: https://cdn.tudominio.com)
//
// Proveedores compatibles con el protocolo S3:
//   - AWS S3:            no necesita AWS_ENDPOINT
//   - Cloudflare R2:     AWS_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
//   - DigitalOcean Spaces: AWS_ENDPOINT=https://<region>.digitaloceanspaces.com
//   - MinIO (self-hosted): AWS_ENDPOINT=http://minio:9000
//
// ────────────────────────────────────────────────────────────────
// import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
//
// function createS3Client() {
//   return new S3Client({
//     region: process.env.AWS_REGION || 'us-east-1',
//     credentials: {
//       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     },
//     // Solo necesario para proveedores distintos a AWS (R2, DO Spaces, MinIO, etc.)
//     ...(process.env.AWS_ENDPOINT ? { endpoint: process.env.AWS_ENDPOINT } : {}),
//   });
// }
//
// const s3Driver = {
//   async upload(bucket, filePath, buffer) {
//     const client = createS3Client();
//     const key = `${bucket}/${filePath}`;
//     await client.send(new PutObjectCommand({
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: key,
//       Body: buffer,
//       // Para archivos públicos sin autenticación, descomenta:
//       // ACL: 'public-read',
//     }));
//     const publicUrl = process.env.AWS_PUBLIC_URL
//       ? `${process.env.AWS_PUBLIC_URL}/${key}`
//       : `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
//     return { publicUrl, storagePath: key };
//   },
//
//   async delete(storagePath) {
//     if (!storagePath) return;
//     const client = createS3Client();
//     await client.send(new DeleteObjectCommand({
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: storagePath,
//     }));
//   },
// };
// ────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────
// SELECCIÓN DEL DRIVER ACTIVO
// ─────────────────────────────────────────────
const DRIVER = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

let activeDriver;

if (DRIVER === 'local') {
  activeDriver = localDriver;
} else if (DRIVER === 's3') {
  // TODO (producción): descomentar cuando el driver S3 esté implementado arriba
  // activeDriver = s3Driver;
  throw new Error(
    'STORAGE_DRIVER=s3 está configurado pero el driver S3 aún no está implementado. ' +
    'Ver backend/src/utils/storage.js para instrucciones.'
  );
} else {
  throw new Error(`STORAGE_DRIVER desconocido: "${DRIVER}". Valores válidos: local, s3`);
}

export const storage = activeDriver;
