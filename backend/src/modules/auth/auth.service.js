import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '../../config/database.js'
import { config } from '../../config/index.js'
import { AppError } from '../../utils/AppError.js'

const SALT_ROUNDS = 12

function signToken (user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  )
}

export async function register ({ email, password, nombre, role }) {
  if (!['admin', 'tecnico', 'cliente'].includes(role)) {
    throw new AppError('Rol inválido. Use admin, tecnico o cliente.', 400)
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const { rows: [user] } = await pool.query(
    `INSERT INTO profiles (nombre_completo, email, rol, activo, password_hash)
     VALUES ($1, $2, $3, true, $4)
     RETURNING id, email, rol AS role, nombre_completo, created_at`,
    [nombre.trim(), email.toLowerCase().trim(), role, passwordHash]
  )
  const token = signToken(user)
  return { user: { id: user.id, email: user.email, role: user.role, nombre_completo: user.nombre_completo }, token }
}

export async function login ({ email, password }) {
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, rol AS role, nombre_completo
     FROM profiles WHERE email = $1 AND activo = true`,
    [email.toLowerCase().trim()]
  )
  const user = rows[0]
  if (!user) {
    throw new AppError('Credenciales incorrectas', 401)
  }

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) {
    throw new AppError('Credenciales incorrectas', 401)
  }

  const token = signToken(user)
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      nombre_completo: user.nombre_completo
    },
    token
  }
}

export async function getMe (userId) {
  const { rows } = await pool.query(
    `SELECT id, email, rol AS role, nombre_completo, created_at, cliente_id, activo
     FROM profiles WHERE id = $1`,
    [userId]
  )
  const user = rows[0]
  if (!user) {
    throw new AppError('Usuario no encontrado', 404)
  }
  return user
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const { rows } = await pool.query(
    `SELECT password_hash FROM profiles WHERE id = $1`,
    [userId]
  )
  const user = rows[0]
  if (!user) throw new AppError('Usuario no encontrado', 404)
  
  if (user.password_hash) {
    const ok = await bcrypt.compare(currentPassword, user.password_hash)
    if (!ok) throw new AppError('La contraseña actual es incorrecta', 401)
  }
  
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
  await pool.query(
    `UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [newHash, userId]
  )
  return { success: true }
}
