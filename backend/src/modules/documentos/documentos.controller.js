import { catchAsync } from '../../utils/catchAsync.js';
import * as documentosService from './documentos.service.js';
import { storage } from '../../utils/storage.js';

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

  // Eliminar el archivo del proveedor de almacenamiento activo (local o S3)
  try {
    await storage.delete(doc.storage_path);
  } catch (err) {
    // No bloqueamos la respuesta si falla el borrado del archivo;
    // el registro ya fue eliminado de la BD.
    console.error('Error al eliminar archivo del almacenamiento:', err);
  }

  res.status(204).send();
});
