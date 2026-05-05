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
  if (!['admin', 'tecnico'].includes(role)) {
    throw new AppError('Rol inválido. Use admin o tecnico.', 400)
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [user] } = await client.query(
      `INSERT INTO users (email, password_hash, role, nombre)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, nombre, created_at`,
      [email.toLowerCase().trim(), passwordHash, role, nombre.trim()]
    )

    if (role === 'tecnico') {
      await client.query(
        `INSERT INTO tecnicos (user_id, nombre, email, activo)
         VALUES ($1, $2, $3, TRUE)`,
        [user.id, nombre.trim(), email.toLowerCase().trim()]
      )
    }

    await client.query('COMMIT')
    const token = signToken(user)
    return { user: { id: user.id, email: user.email, role: user.role, nombre: user.nombre }, token }
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function login ({ email, password }) {
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, role, nombre FROM users WHERE email = $1`,
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
      nombre: user.nombre
    },
    token
  }
}

export async function getMe (userId) {
  const { rows } = await pool.query(
    `SELECT id, email, role, nombre, created_at FROM users WHERE id = $1`,
    [userId]
  )
  const user = rows[0]
  if (!user) {
    throw new AppError('Usuario no encontrado', 404)
  }
  return user
}
