import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';
import * as configuracionController from './configuracion.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/configuracion - retrieve current configuration
router.get('/', configuracionController.getConfig);

// POST /api/configuracion - create new configuration (admin only)
router.post('/', requireAdmin, configuracionController.createConfig);

// PUT /api/configuracion/:id - update existing configuration (admin only)
router.put('/:id', requireAdmin, configuracionController.updateConfig);

export default router;
