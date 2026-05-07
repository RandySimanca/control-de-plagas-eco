import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';
import * as documentosController from './documentos.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/documentos-legales - list all legal documents
router.get('/', documentosController.list);

// POST /api/documentos-legales - upload new legal document (admin only)
router.post('/', requireAdmin, documentosController.create);

// DELETE /api/documentos-legales/:id - delete a legal document (admin only)
router.delete('/:id', requireAdmin, documentosController.remove);

export default router;
