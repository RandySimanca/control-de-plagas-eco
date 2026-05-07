import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';
import * as profilesController from './profiles.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', profilesController.list);
router.get('/:id', profilesController.getById);
router.post('/', requireAdmin, profilesController.create);
router.patch('/:id', requireAdmin, profilesController.update);
router.delete('/:id', requireAdmin, profilesController.remove);

export default router;
