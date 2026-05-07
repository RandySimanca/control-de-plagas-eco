import { catchAsync } from '../../utils/catchAsync.js';
import * as configuracionService from './configuracion.service.js';

export const getConfig = catchAsync(async (req, res) => {
  const config = await configuracionService.getConfig();
  res.json({ success: true, data: config || {} });
});

export const createConfig = catchAsync(async (req, res) => {
  const data = await configuracionService.createConfig(req.body);
  res.status(201).json({ success: true, data });
});

export const updateConfig = catchAsync(async (req, res) => {
  const data = await configuracionService.updateConfig(req.params.id, req.body);
  res.json({ success: true, data });
});
