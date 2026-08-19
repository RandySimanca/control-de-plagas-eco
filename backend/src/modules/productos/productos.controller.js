import { catchAsync } from '../../utils/catchAsync.js';
import * as productosService from './productos.service.js';

export const listProductosCatalogo = catchAsync(async (req, res) => {
  const productos = await productosService.listProductosCatalogo(req.query);
  res.json({ success: true, data: productos });
});

export const createProductoCatalogo = catchAsync(async (req, res) => {
  const producto = await productosService.createProductoCatalogo(req.body);
  res.status(201).json({ success: true, data: producto });
});

export const updateProductoCatalogo = catchAsync(async (req, res) => {
  const producto = await productosService.updateProductoCatalogo(req.params.id, req.body);
  res.json({ success: true, data: producto });
});

export const deleteProductoCatalogo = catchAsync(async (req, res) => {
  await productosService.deleteProductoCatalogo(req.params.id);
  res.status(204).end();
});

// ─── STOCK ────────────────────────────────────────────────────────────────────

export const getMovimientosStock = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const movimientos = await productosService.getMovimientosStock(req.params.id, limit, offset);
  res.json({ success: true, data: movimientos });
});

export const reabastecerStock = catchAsync(async (req, res) => {
  const { cantidad_presentaciones, notas } = req.body;
  if (!cantidad_presentaciones || parseFloat(cantidad_presentaciones) <= 0) {
    return res.status(400).json({ success: false, message: 'cantidad_presentaciones debe ser mayor a 0' });
  }
  const result = await productosService.reabastecerStock(
    req.params.id,
    parseFloat(cantidad_presentaciones),
    notas,
    req.user.id
  );
  res.json({ success: true, data: result });
});

export const ajusteManualStock = catchAsync(async (req, res) => {
  const { nuevo_stock, notas } = req.body;
  if (nuevo_stock == null || parseFloat(nuevo_stock) < 0) {
    return res.status(400).json({ success: false, message: 'nuevo_stock debe ser >= 0' });
  }
  const producto = await productosService.ajusteManualStock(
    req.params.id,
    parseFloat(nuevo_stock),
    notas,
    req.user.id
  );
  res.json({ success: true, data: producto });
});

export const asignarTecnicoStock = catchAsync(async (req, res) => {
  const { tecnico_id, cantidad, notas } = req.body;
  if (!tecnico_id) {
    return res.status(400).json({ success: false, message: 'tecnico_id es requerido' });
  }
  if (!cantidad || parseFloat(cantidad) <= 0) {
    return res.status(400).json({ success: false, message: 'cantidad debe ser mayor a 0' });
  }
  const producto = await productosService.asignarTecnicoStock(
    req.params.id,
    tecnico_id,
    parseFloat(cantidad),
    notas,
    req.user.id
  );
  res.json({ success: true, data: producto });
});

// ─── AUDITORIA ────────────────────────────────────────────────────────────────

export const getAuditoria = catchAsync(async (req, res) => {
  const data = await productosService.getAuditoriaProductos(req.query);
  res.json({ success: true, data });
});

export const getAuditoriaResumen = catchAsync(async (req, res) => {
  const data = await productosService.getAuditoriaResumen(req.query);
  res.json({ success: true, data });
});

// ─── ACTIVOS FIJOS (EQUIPOS) ──────────────────────────────────────────────────

export const getActivos = catchAsync(async (req, res) => {
  const activos = await productosService.getActivosByProducto(req.params.id);
  res.json({ success: true, data: activos });
});

export const getActivosDisponibles = catchAsync(async (req, res) => {
  const activos = await productosService.getActivosDisponibles();
  res.json({ success: true, data: activos });
});

export const createActivo = catchAsync(async (req, res) => {
  if (!req.body.codigo_activo) {
    return res.status(400).json({ success: false, message: 'codigo_activo es requerido' });
  }
  const activo = await productosService.createActivo(req.params.id, req.body);
  res.status(201).json({ success: true, data: activo });
});

export const deleteActivo = catchAsync(async (req, res) => {
  await productosService.deleteActivo(req.params.id);
  res.status(204).end();
});

export const updateActivoEstado = catchAsync(async (req, res) => {
  if (!req.body.estado) {
    return res.status(400).json({ success: false, message: 'estado es requerido' });
  }
  const activo = await productosService.updateActivoEstado(req.params.id, req.body.estado, req.body.notas);
  res.json({ success: true, data: activo });
});

export const prestarActivos = catchAsync(async (req, res) => {
  const { tecnico_id, activos_ids, notas } = req.body;
  if (!tecnico_id || !activos_ids || activos_ids.length === 0) {
    return res.status(400).json({ success: false, message: 'tecnico_id y activos_ids son requeridos' });
  }
  await productosService.registrarPrestamoActivos(tecnico_id, activos_ids, notas, req.user.id);
  res.json({ success: true, message: 'Préstamo registrado exitosamente' });
});

export const devolverActivos = catchAsync(async (req, res) => {
  const { tecnico_id, activos_ids, notas } = req.body;
  if (!tecnico_id || !activos_ids || activos_ids.length === 0) {
    return res.status(400).json({ success: false, message: 'tecnico_id y activos_ids son requeridos' });
  }
  await productosService.registrarDevolucionActivos(tecnico_id, activos_ids, notas, req.user.id);
  res.json({ success: true, message: 'Devolución registrada exitosamente' });
});

export const getActivosPrestados = catchAsync(async (req, res) => {
  const activos = await productosService.getActivosPrestadosByTecnico(req.params.tecnico_id);
  res.json({ success: true, data: activos });
});
