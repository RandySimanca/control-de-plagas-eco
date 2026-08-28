import { getAuthImageUrl } from '../../../utils/imageUtils'

/**
 * Utilidad compartida para obtener y convertir una URL de imagen a base64
 * Utilizada por múltiples generadores de PDF (informeActividades e informeTecnico)
 */
export async function getImgData(url) {
  if (!url) return null
  
  if (typeof url === 'string' && url.startsWith('data:')) {
    return url
  }

  const finalUrl = getAuthImageUrl(url)
  if (!finalUrl) return null

  try {
    const res = await fetch(finalUrl)
    if (!res.ok) throw new Error(`Error HTTP! status: ${res.status}`)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.error('Error al obtener la imagen:', url, '->', finalUrl, err)
    return null
  }
}