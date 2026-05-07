import { catchAsync } from '../../utils/catchAsync.js';
import * as documentosService from './documentos.service.js';
import path from 'path';
import fs from 'fs';

export const list = catchAsync(async (req, res) => {
  const docs = await documentosService.listDocumentos();
  res.json({ success: true, data: docs });
});

export const create = catchAsync(async (req, res) => {
  const { nombre, url, storage_path } = req.body;
  if (!nombre || !url || !storage_path) {
    return res.status(400).json({ success: false, message: 'Nombre, URL y ruta de almacenamiento son requeridos' });
  }
  const doc = await documentosService.createDocumento({ nombre, url, storage_path });
  res.status(201).json({ success: true, data: doc });
});

export const remove = catchAsync(async (req, res) => {
  const doc = await documentosService.deleteDocumento(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Documento no encontrado' });
  }

  // Delete file from storage
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const destPath = path.join(uploadsDir, doc.storage_path);
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
  } catch (err) {
    console.error('Error deleting file:', err);
  }

  res.status(204).send();
});
