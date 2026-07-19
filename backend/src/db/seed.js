import bcrypt from 'bcrypt'
import { pool } from '../config/database.js'

const SALT_ROUNDS = 12

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
async function seedAdmin () {
  const email    = process.env.ADMIN_EMAIL    || 'admin@plagcontrol.com'
  const password = process.env.ADMIN_PASSWORD || 'Admin123'
  const nombre   = process.env.ADMIN_NOMBRE   || 'Administrador'

  const { rows } = await pool.query(
    'SELECT id FROM profiles WHERE email = $1',
    [email.toLowerCase().trim()]
  )

  if (rows.length > 0) {
    console.log(`  ⏭️  Admin ya existe (${email}), se omite.`)
    return
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  await pool.query(
    `INSERT INTO profiles (nombre_completo, email, rol, activo, password_hash)
     VALUES ($1, $2, 'admin', true, $3)`,
    [nombre, email.toLowerCase().trim(), passwordHash]
  )
  console.log(`  👤 Admin creado: ${email}`)
}

async function seedConfiguracion () {
  const { rows } = await pool.query('SELECT id FROM configuracion LIMIT 1')
  if (rows.length > 0) {
    console.log('  ⏭️  Configuración ya existe, se omite.')
    return
  }
  await pool.query(`
    INSERT INTO configuracion
      (nombre_empresa, nit, email_contacto, telefono_contacto, direccion_fiscal, footer_pdf, recomendaciones_generales, version_informe)
    VALUES
      ('PlagControl ECO', '900.123.456-7', 'info@plagcontrol.com', '+57 310 000 0000',
       'Calle 10 # 20-30, Bogotá, Colombia',
       'Este certificado es válido por 30 días a partir de la fecha de servicio.',
       'Mantener los alimentos en recipientes sellados. Evitar acumulación de agua estancada. Revisar periódicamente grietas y fisuras en paredes.',
       '1.0')
  `)
  console.log('  ⚙️  Configuración inicial creada.')
}

async function seedDemoData () {
  // ── Verificar si ya hay datos de demo ──────────────────────────────────────
  const { rows: existing } = await pool.query(
    "SELECT id FROM clientes WHERE nombre = 'Empresa Demo S.A.S' LIMIT 1"
  )
  if (existing.length > 0) {
    console.log('  ⏭️  Datos de demo ya existen, se omiten.')
    return
  }

  // ── 1. Clientes ────────────────────────────────────────────────────────────
  const { rows: clientes } = await pool.query(`
    INSERT INTO clientes (nombre, razon_social, identificacion, email, telefono, direccion, nombre_contacto, telefono_contacto, tipo, notas)
    VALUES
      ('Empresa Demo S.A.S',   'Empresa Demo S.A.S',       '900.111.222-3', 'contacto@empresademo.com',  '+57 301 111 2222', 'Cra 15 # 45-67, Bogotá',          'Juan Pérez',    '+57 301 111 2223', 'comercial',   'Cliente prioritario. Contrato anual.'),
      ('Restaurante El Fogón', 'Restaurante El Fogón S.A.', '800.333.444-5', 'gerencia@elfogon.com',      '+57 302 333 4444', 'Av. 19 # 100-20, Bogotá',         'María Torres',  '+57 302 333 4445', 'comercial',   'Requiere visita mensual obligatoria.'),
      ('Bodega Norte Ltda.',   'Bodega Norte Ltda.',        '700.555.666-7', 'admin@bodegadelnorte.com',  '+57 303 555 6666', 'Zona Industrial Calle 80, Bogotá', 'Carlos Ruiz',   '+57 303 555 6667', 'industrial',  'Área de almacenamiento grande. Foco en roedores.'),
      ('Clínica Santa Rosa',   'Clínica Santa Rosa S.A.S', '600.777.888-9', 'operaciones@santarosa.com', '+57 304 777 8888', 'Calle 50 # 30-10, Medellín',      'Ana Gómez',     '+57 304 777 8889', 'comercial',   'Protocolo estricto. Usar EPP completo.')
    RETURNING id, nombre
  `)
  console.log(`  🏢 ${clientes.length} clientes de demo creados.`)
  void clientes

  // ── 2. Técnicos ───────────────────────────────────────────────────────────
  const techPassword = await bcrypt.hash('Tecnico123', SALT_ROUNDS)
  const { rows: tecnicos } = await pool.query(`
    INSERT INTO profiles (nombre_completo, email, rol, activo, password_hash, especialidad)
    VALUES
      ('Carlos Mendoza',  'carlos.mendoza@plagcontrol.com',  'tecnico', true, $1, 'Control de roedores y fumigación'),
      ('Laura Jiménez',   'laura.jimenez@plagcontrol.com',   'tecnico', true, $1, 'Control de insectos rastreros y voladores')
    RETURNING id, nombre_completo
  `, [techPassword])
  console.log(`  👷 ${tecnicos.length} técnicos de demo creados.`)
}


// ─────────────────────────────────────────────
//  Punto de entrada principal
// ─────────────────────────────────────────────
export async function runSeed () {
  console.log('🌱 Iniciando seed de base de datos...')
  try {
    await seedAdmin()
    await seedConfiguracion()
    await seedDemoData()
    console.log('✅ Seed completado con éxito.')
  } catch (error) {
    console.error('❌ Error durante el seed:', error)
    throw error
  }
}
