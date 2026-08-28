import { catchAsync } from '../../utils/catchAsync.js'
import { pool } from '../../config/database.js'
import { AppError } from '../../utils/AppError.js'

export const verificarCertificadoSanitario = catchAsync(async (req, res) => {
  const { folio } = req.params

  const sql = `
    SELECT 
      c.folio,
      c.tipo_establecimiento,
      c.tipo_servicio,
      c.resultado,
      c.fecha_servicio,
      c.fecha_emision,
      c.fecha_vencimiento,
      c.aprobado,
      cli.nombre as cliente_nombre
    FROM certificados_sanitarios c
    JOIN ordenes_servicio o ON o.id = c.orden_id
    JOIN clientes cli ON cli.id = o.cliente_id
    WHERE c.folio = $1
  `
  
  const { rows } = await pool.query(sql, [folio])
  const cert = rows[0]

  if (!cert) {
    return res.json({ success: true, data: { estado: 'NO_ENCONTRADO' } })
  }

  if (!cert.aprobado) {
    return res.json({ success: true, data: { estado: 'PENDIENTE_O_REVOCADO' } })
  }

  const now = new Date()
  const vencimiento = new Date(cert.fecha_vencimiento)
  
  let estado = 'VIGENTE'
  if (vencimiento < now) {
    estado = 'VENCIDO'
  }

  res.json({
    success: true,
    data: {
      estado,
      folio: cert.folio,
      establecimiento: cert.cliente_nombre,
      tipo_establecimiento: cert.tipo_establecimiento,
      tipo_servicio: cert.tipo_servicio,
      resultado: cert.resultado,
      fecha_servicio: cert.fecha_servicio,
      fecha_vencimiento: cert.fecha_vencimiento
    }
  })
})
