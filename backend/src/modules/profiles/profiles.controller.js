import { catchAsync } from '../../utils/catchAsync.js';
import * as profilesService from './profiles.service.js';
import { pool } from '../../config/database.js';
import bcrypt from 'bcrypt';



// GET /api/profiles - listar todos los perfiles (con filtros opcionales)
export const list = catchAsync(async (req, res) => {
  const filters = {};
  if (req.query.cliente_id) filters.cliente_id = req.query.cliente_id;
  if (req.query.rol) filters.rol = req.query.rol;
  if (req.query.activo !== undefined) filters.activo = req.query.activo === 'true';
  const profiles = await profilesService.listProfiles(filters);
  res.json({ success: true, data: profiles });
});

// GET /api/profiles/:id - obtener un perfil por id
export const getById = catchAsync(async (req, res) => {
  const profile = await profilesService.getProfileById(req.params.id);
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }
  res.json({ success: true, data: profile });
});

// PATCH /api/profiles/:id - actualizar perfil
export const update = catchAsync(async (req, res) => {
  const allowedFields = ['nombre_completo', 'email', 'telefono', 'rol', 'especialidad', 'firma_url', 'activo', 'cliente_id'];
  const updateData = {};
  
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      updateData[key] = req.body[key];
    }
  }

  // Validar el rol si viene en la actualizacion
  if (updateData.rol && !['admin', 'tecnico', 'cliente'].includes(updateData.rol)) {
    return res.status(400).json({ success: false, message: 'Rol inválido' });
  }

  const updated = await profilesService.updateProfile(req.params.id, updateData);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }
  res.json({ success: true, data: updated });
});

// DELETE /api/profiles/:id - eliminar perfil
export const remove = catchAsync(async (req, res) => {
  await profilesService.deleteProfile(req.params.id);
  res.status(204).send();
});

// POST /api/profiles - crear un nuevo usuario con perfil (solo admin)
export const create = catchAsync(async (req, res) => {
  const { email, password, nombre_completo, rol, telefono, especialidad, cliente_id } = req.body;
  
  if (!email || !password || !nombre_completo || !rol) {
    return res.status(400).json({ success: false, message: 'Email, contraseña, nombre y rol son requeridos' });
  }

  if (!['admin', 'tecnico', 'cliente'].includes(rol)) {
    return res.status(400).json({ success: false, message: 'Rol inválido. Use admin, tecnico, o cliente.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const { rows: [newProfile] } = await pool.query(
      `INSERT INTO profiles (nombre_completo, email, telefono, rol, especialidad, cliente_id, activo, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       RETURNING *`,
      [nombre_completo.trim(), email.toLowerCase().trim(), telefono || null, rol, especialidad || null, cliente_id || null, passwordHash]
    );

    const { rows: [fullProfile] } = await pool.query(`
      SELECT p.*, c.nombre as cliente_nombre
      FROM profiles p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = $1
    `, [newProfile.id]);
    
    res.status(201).json({ success: true, data: fullProfile });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ success: false, message: 'El email ya está registrado' });
    }
    throw e;
  }
});
