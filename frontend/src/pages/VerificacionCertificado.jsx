import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Clock, ShieldCheck, AlertTriangle, Home, Search } from 'lucide-react'

export default function VerificacionCertificado() {
  const { folio } = useParams()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (folio) {
      verificarCertificado()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folio])

  async function verificarCertificado() {
    try {
      setLoading(true)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
      const response = await fetch(`${API_URL}/verificacion/certificado-sanitario/${folio}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError('Error al verificar el certificado')
      }
    } catch (err) {
      console.error(err)
      setError('Error de conexión al verificar el certificado')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-600">Verificando certificado...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-dark-50 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-dark-900 mb-2">Certificado No Encontrado</h1>
          <p className="text-dark-600 mb-6">No se encontró un certificado con el folio proporcionado o el folio es inválido.</p>
          <Link to="/" className="btn-primary inline-flex items-center gap-2">
            <Home className="w-4 h-4" />
            Ir al Inicio
          </Link>
        </div>
      </div>
    )
  }

  const { estado, folio: certFolio, establecimiento, tipo_establecimiento, tipo_servicio, resultado, fecha_servicio, fecha_vencimiento } = data

  const estadoConfig = {
    VIGENTE: {
      icon: <CheckCircle2 className="w-12 h-12" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      textColor: 'text-green-800',
      title: 'Certificado Válido',
      description: 'Este certificado se encuentra vigente y ha sido aprobado por la empresa.'
    },
    VENCIDO: {
      icon: <XCircle className="w-12 h-12" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-800',
      title: 'Certificado Vencido',
      description: 'Este certificado ha superado su fecha de vigencia.'
    },
    PENDIENTE_O_REVOCADO: {
      icon: <Clock className="w-12 h-12" />,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-600',
      textColor: 'text-amber-800',
      title: 'Certificado Pendiente o Revocado',
      description: 'Este certificado aún no ha sido aprobado o ha sido revocado por la empresa.'
    },
    NO_ENCONTRADO: {
      icon: <AlertTriangle className="w-12 h-12" />,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      iconColor: 'text-gray-600',
      textColor: 'text-gray-800',
      title: 'Certificado No Encontrado',
      description: 'No existe un certificado con el folio proporcionado.'
    }
  }

  const config = estadoConfig[estado] || estadoConfig.NO_ENCONTRADO

  const resultadoColor = {
    'CUMPLE': 'text-green-600 bg-green-50',
    'CUMPLE CON OBSERVACIONES': 'text-amber-600 bg-amber-50',
    'NO CUMPLE': 'text-red-600 bg-red-50'
  }

  return (
    <div className="min-h-screen bg-dark-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-dark-600 hover:text-primary-600 transition-colors mb-4">
            <Home className="w-4 h-4" />
            <span className="text-sm">Volver al inicio</span>
          </Link>
          <h1 className="text-3xl font-bold text-dark-900 mb-2">Verificación de Certificado</h1>
          <p className="text-dark-600">Verifique la autenticidad y vigencia del certificado sanitario</p>
        </div>

        {/* Estado Card */}
        <div className={`card ${config.bgColor} ${config.borderColor} border-2 mb-6`}>
          <div className="flex items-center gap-4">
            <div className={config.iconColor}>
              {config.icon}
            </div>
            <div>
              <h2 className={`text-xl font-bold ${config.textColor}`}>{config.title}</h2>
              <p className="text-dark-600 text-sm">{config.description}</p>
            </div>
          </div>
        </div>

        {/* Detalles del Certificado */}
        {(estado === 'VIGENTE' || estado === 'VENCIDO') && (
          <div className="card space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b border-dark-100">
              <ShieldCheck className="w-5 h-5 text-primary-600" />
              <h3 className="font-bold text-dark-900">Información del Certificado</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-dark-400 mb-1">Folio</p>
                <p className="font-mono font-bold text-dark-900">{certFolio}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-dark-400 mb-1">Resultado</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${resultadoColor[resultado] || 'text-dark-600 bg-dark-50'}`}>
                  {resultado}
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-dark-400 mb-1">Establecimiento</p>
                <p className="font-medium text-dark-800">{establecimiento}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-dark-400 mb-1">Tipo de Establecimiento</p>
                <p className="font-medium text-dark-800">{tipo_establecimiento}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-dark-400 mb-1">Tipo de Servicio</p>
                <p className="font-medium text-dark-800">{tipo_servicio}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-dark-400 mb-1">Fecha del Servicio</p>
                <p className="font-medium text-dark-800">
                  {fecha_servicio ? new Date(fecha_servicio).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-wider font-bold text-dark-400 mb-1">Fecha de Vencimiento</p>
                <p className={`font-medium ${estado === 'VENCIDO' ? 'text-red-600' : 'text-dark-800'}`}>
                  {fecha_vencimiento ? new Date(fecha_vencimiento).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-dark-500">
          <p>Este servicio de verificación es proporcionado por PlagControl Eco.</p>
          <p className="mt-1">Para más información, contacte al soporte técnico.</p>
        </div>
      </div>
    </div>
  )
}