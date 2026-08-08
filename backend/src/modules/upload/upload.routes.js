import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import multer from 'multer';
import path from 'path';
import { storage } from '../../utils/storage.js';

const router = Router();

// Tipos MIME permitidos (incluyendo formatos comunes de cámaras móviles como HEIC/HEIF)
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/x-png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/octet-stream'
]);

// Configure multer to store file in memory with 25MB limit for high-res mobile photos
const multerStorage = multer.memoryStorage();
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter (_req, file, cb) {
    const isImageOrPdf = ALLOWED_MIME_TYPES.has(file.mimetype) || 
      file.mimetype.startsWith('image/') || 
      /\.(jpg|jpeg|png|webp|heic|heif|pdf)$/i.test(file.originalname);
    if (isImageOrPdf) {
      cb(null, true)
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}.`))
    }
  }
});

const ALLOWED_BUCKETS = new Set(['fotos-servicio', 'documentos', 'branding', 'certificados', 'firmas', 'default', 'avatars']);

router.post('/', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { bucket, path: filePath } = req.body;
  if (!bucket || !filePath) {
    return res.status(400).json({ error: 'Bucket and path are required' });
  }

  // Sanitize bucket: allow only alphanumeric, dash, underscore
  const safeBucket = path.basename(bucket);

  if (!ALLOWED_BUCKETS.has(safeBucket)) {
    return res.status(400).json({ success: false, message: 'Bucket no permitido' });
  }

  // Sanitize each path segment to prevent directory traversal
  const pathSegments = filePath.split('/').map(seg => path.basename(seg));
  const safeFilePath = pathSegments.join('/');

  try {
    const { publicUrl } = await storage.upload(safeBucket, safeFilePath, req.file.buffer);
    res.json({ publicUrl });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ success: false, message: 'Error al guardar el archivo' });
  }
});

export default router;
