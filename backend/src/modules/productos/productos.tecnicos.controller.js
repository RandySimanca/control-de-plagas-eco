import { catchAsync } from '../../utils/catchAsync.js'
import * as productosTecnicosService from './productos.tecnicos.service.js'

export const getInventarioTecnico = catchAsync(async (req, res) => {
  // Si no envían ID, tomar el del usuario logueado (si es técnico)
  const tecnicoId = req.params.tecnico_id || req.user.id // Asumiendo que user.id es el tecnico_id, o deberíamos buscarlo en perfiles
  
  const data = await productosTecnicosService.getInventarioTecnico(tecnicoId)
  res.json({ success: true, data })
})

export const checkOutProductos = catchAsync(async (req, res) => {
  const tecnicoId = req.body.tecnico_id || req.user.id
  await productosTecnicosService.checkOutProductos(tecnicoId, req.body.items, req.user.id)
  res.json({ success: true, message: 'Productos asignados al técnico correctamente' })
})

export const checkInProductos = catchAsync(async (req, res) => {
  const tecnicoId = req.body.tecnico_id || req.user.id
  await productosTecnicosService.checkInProductos(tecnicoId, req.body.items, req.user.id)
  res.json({ success: true, message: 'Sobrantes devueltos correctamente' })
})
