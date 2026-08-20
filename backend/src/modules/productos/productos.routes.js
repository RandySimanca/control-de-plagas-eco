import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';
import * as productosController from './productos.controller.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/productos-catalogo - Listar catálogo de productos (todos los usuarios)
router.get('/', productosController.listProductosCatalogo);

// GET /api/productos-catalogo/auditoria/resumen - Resumen de auditoría (solo admin)
router.get('/auditoria/resumen', requireAdmin, productosController.getAuditoriaResumen);

// GET /api/productos-catalogo/auditoria - Auditoría de productos usados (solo admin)
router.get('/auditoria', requireAdmin, productosController.getAuditoria);

// POST /api/productos-catalogo - Crear producto (solo admin)
router.post('/', requireAdmin, productosController.createProductoCatalogo);

// PUT /api/productos-catalogo/:id - Actualizar producto (solo admin)
router.put('/:id', requireAdmin, productosController.updateProductoCatalogo);

// DELETE /api/productos-catalogo/:id - Eliminar producto (solo admin)
router.delete('/:id', requireAdmin, productosController.deleteProductoCatalogo);

// ─── STOCK ────────────────────────────────────────────────────────────────────

// GET /api/productos-catalogo/:id/movimientos - Historial de movimientos de stock
router.get('/:id/movimientos', requireAdmin, productosController.getMovimientosStock);

// POST /api/productos-catalogo/:id/reabastecer - Agregar stock por compra de presentaciones
router.post('/:id/reabastecer', requireAdmin, productosController.reabastecerStock);

// POST /api/productos-catalogo/:id/ajuste - Ajuste manual de stock (corrección física)
router.post('/:id/ajuste', requireAdmin, productosController.ajusteManualStock);

// POST /api/productos-catalogo/:id/asignar - Asignar dotación a un técnico
router.post('/:id/asignar', requireAdmin, productosController.asignarTecnicoStock);

// ─── ACTIVOS FIJOS (EQUIPOS) ──────────────────────────────────────────────────

// GET /api/productos-catalogo/activos/disponibles - Listar activos disponibles (técnicos y admin)
router.get('/activos/disponibles', productosController.getActivosDisponibles);

// GET /api/productos-catalogo/activos/prestados/:tecnico_id - Listar prestados a un técnico
router.get('/activos/prestados/:tecnico_id', productosController.getActivosPrestados);

// POST /api/productos-catalogo/activos/prestar - Registrar préstamo
// NOTA: Los técnicos también deben poder prestar y devolver sus propios equipos (dependiendo de la política).
// Si lo hacen ellos mismos desde el Dashboard, no debe tener requireAdmin. Lo quitamos para que funcione.
router.post('/activos/prestar', productosController.prestarActivos);

// POST /api/productos-catalogo/activos/devolver - Registrar devolución
router.post('/activos/devolver', productosController.devolverActivos);

export default router;
