import { useState } from 'react'
import { FileText, Clock, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import { abrirCertificado } from '../../../lib/generarCertificado'
import logoDerosh from '../../../assets/logo Derosh.png'
import { useConfig } from '../../../contexts/ConfigContext'
import { generateFolio } from '../../../utils/empresaUtils'

import { getAuthImageUrl } from '../../../utils/imageUtils'

export default function OrdenCertificado({
  orden,
  productos,
  estaciones,
  actividades,
  fotos,
  certificado,
  setCertificado
}) {
  const [generando, setGenerando] = useState(false)
  const { nombreEmpresa } = useConfig()

  async function prepareDataForReport(folioValue) {
    const token = localStorage.getItem('token')
    const configRes = await api.get('/configuracion', { token })
    const config = configRes.data

    // Mapear fotos generales
    const fotosMapeadas = fotos.map(f => {
      let url = f.url || f.storage_path
      return { ...f, url: getAuthImageUrl(url) }
    })

    // Mapear fotos de estaciones
    const estacionesMapeadas = estaciones.map(e => ({
      ...e,
      foto_antes_url: e.foto_antes_url ? getAuthImageUrl(e.foto_antes_url) : null,
      foto_despues_url: e.foto_despues_url ? getAuthImageUrl(e.foto_despues_url) : null
    }))

    return {
      folio: folioValue,
      cliente: orden.clientes,
      orden,
      productos,
      estaciones: estacionesMapeadas,
      tecnico: orden.profiles?.nombre_completo || 'N/A',
      config: { ...config, logo_asset: logoDerosh },
      firma: certificado?.firma_url,
      firma_tecnico: orden.profiles?.firma_url,
      actividades,
      fotos: fotosMapeadas
    }
  }

  async function handleGenerarCertificado() {
    setGenerando(true)
    try {
      const folio = generateFolio(nombreEmpresa)
      
      // Guardar registro del certificado
      if (!certificado) {
        await api.post('/certificados', { orden_id: orden.id, folio })
      } else {
        await api.put(`/certificados/${orden.id}`, { folio })
      }

      const reportData = await prepareDataForReport(folio)
      await abrirCertificado(reportData)

      setCertificado(prev => ({ ...prev, folio }))
      toast.success('Certificado generado')
    } catch (err) {
      toast.error('Error generando certificado: ' + err.message)
    } finally {
      setGenerando(false)
    }
  }

  async function descargarCertificado() {
    try {
      const reportData = await prepareDataForReport(certificado?.folio || 'ORD-' + orden.id.substring(0, 5))
      await abrirCertificado(reportData)
    } catch (err) {
      toast.error('Error al descargar: ' + err.message)
    }
  }

  return (
    <div className="card mt-6">
      <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-primary-600" /> Certificado
      </h2>
      {orden.estado !== 'completada' ? (
        <div className="flex items-center gap-2 text-sm text-dark-400">
          <Clock className="w-4 h-4" /> El certificado estará disponible cuando la orden se marque como completada
        </div>
      ) : certificado ? (
        <div className="flex items-center justify-between bg-green-50 p-4 rounded-xl">
          <div>
            <p className="font-semibold text-green-800">Certificado generado</p>
            <p className="text-sm text-green-600">Folio: {certificado.folio}</p>
          </div>
          <button onClick={descargarCertificado} className="btn-primary text-sm">
            Descargar PDF
          </button>
        </div>
      ) : (
        <button 
          onClick={handleGenerarCertificado} 
          disabled={generando} 
          className="btn-primary"
        >
          {generando ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <><FileText className="w-5 h-5" /> Generar Certificado</>
          )}
        </button>
      )}
    </div>
  )
}
