import { Router } from 'express'
import * as controller from './verificacion.controller.js'

const router = Router()

router.get('/certificado-sanitario/:folio', controller.verificarCertificadoSanitario)

// Alias para compatibilidad con frontend
router.get('/certificado-sanitario/:folio', controller.verificarCertificadoSanitario)

export default router
