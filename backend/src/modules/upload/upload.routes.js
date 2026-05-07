import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer to store file in memory
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { bucket, path: filePath } = req.body;
  if (!bucket || !filePath) {
    return res.status(400).json({ error: 'Bucket and path are required' });
  }

  // Sanitize bucket: allow only alphanumeric, dash, underscore
  const safeBucket = path.basename(bucket);

  // Sanitize each path segment to prevent directory traversal
  const pathSegments = filePath.split('/').map(seg => path.basename(seg));
  const safeFilePath = pathSegments.join('/');

  const uploadsDir = path.join(process.cwd(), 'uploads');
  const destDir = path.join(uploadsDir, safeBucket, ...pathSegments.slice(0, -1));
  const fileName = pathSegments[pathSegments.length - 1];

  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, fileName);
  fs.writeFileSync(destPath, req.file.buffer);

  const protocol = req.protocol;
  const host = req.get('host');
  const publicUrl = `${protocol}://${host}/uploads/${safeBucket}/${safeFilePath}`;

  res.json({ publicUrl });
});

export default router;
