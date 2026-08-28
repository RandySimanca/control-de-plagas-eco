import { format } from 'date-fns'
import es from 'date-fns/locale/es'
import QRCode from 'qrcode'
import { getImgData } from './utils/imageUtils'

export async function prepareCertificadoSanitarioData(params) {
  const { certificado, orden, cliente, config, folio, baseUrl } = params

  const urlVerificacion = `${baseUrl}/verificar-certificado/${folio}`
  const qrDataUrl = await QRCode.toDataURL(urlVerificacion, { margin: 1 })

  return {
    certificado,
    orden,
    cliente,
    config,
    folio,
    qrDataUrl,
    urlVerificacion,
    normalized: {
      logoData: config?.logo_url ? await getImgData(config.logo_url) : null,
      firmaData: config?.representante_legal_firma_url ? await getImgData(config.representante_legal_firma_url) : null,
      representanteNombre: config?.representante_legal_nombre || '',
      representanteCargo: config?.representante_legal_cargo || '',
      fechaServicio: certificado.fecha_servicio ? format(new Date(certificado.fecha_servicio), "dd/MM/yyyy", { locale: es }) : format(new Date(orden.created_at), "dd/MM/yyyy", { locale: es }),
      fechaEmision: certificado.fecha_emision ? format(new Date(certificado.fecha_emision), "dd/MM/yyyy", { locale: es }) : format(new Date(), "dd/MM/yyyy", { locale: es }),
      fechaVencimiento: certificado.fecha_vencimiento ? format(new Date(certificado.fecha_vencimiento), "dd/MM/yyyy", { locale: es }) : 'N/A'
    }
  }
}
