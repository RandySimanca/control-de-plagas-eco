import { Link } from 'react-router-dom'
import { ArrowLeft, Edit, Calendar, User, MapPin, Play, CheckCircle2, Trash2, MessageSquare, Droplets } from 'lucide-react'
import { parseTipoPlaga } from '../../../utils/tipoPlaga'
import { formatFechaLarga } from '../../../utils/dateUtils'

export default function OrdenHeader({ 
  orden, 
  isAdmin, 
  isAssignedTecnico, 
  onDeleteOrden, 
  onChangeEstado,
  onEditClick
}) {

  const formatFechaDisplay = (fecha) => formatFechaLarga(fecha)

 
  
  const estadoBadge = { 
    programada: 'badge-programada', 
    en_progreso: 'badge-en-progreso', 
    completada: 'badge-completada' 
  }
  
  const estadoLabel = { 
    programada: 'Programada', 
    en_progreso: 'En Pregreso', 
    completada: 'Completada' 
  }

  if (!orden) return null

  return (
    <>
      <Link to="/ordenes" className="inline-flex items-center gap-2 text-sm text-dark-500 hover:text-dark-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      <div className="card mb-6">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
    <div>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-xl font-bold text-dark-900">{orden.clientes?.nombre}</h1>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <select
              value={orden.estado}
              onChange={(e) => onChangeEstado(e.target.value)}
              className={`px-2 py-1 rounded text-xs font-semibold outline-none cursor-pointer border ${
                orden.estado === 'programada' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                orden.estado === 'en_progreso' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                'bg-green-100 text-green-800 border-green-200'
              }`}
            >
              <option value="programada">Programada</option>
              <option value="en_progreso">En Progreso</option>
              <option value="completada">Completada</option>
            </select>
          ) : (
            <span className={estadoBadge[orden.estado] || 'bg-dark-100 text-dark-600 px-2 py-0.5 rounded text-xs'}>
              {estadoLabel[orden.estado] || orden.estado}
            </span>
          )}
          {isAdmin && (
            <button 
              onClick={onDeleteOrden}
              className="p-1.5 text-dark-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Eliminar Orden"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-dark-400">Orden creada el {new Date(orden.created_at).toLocaleDateString('es')}</p>
    </div>
    <div className="flex flex-wrap gap-2">
      {isAssignedTecnico && orden.estado === 'programada' && (
        <button onClick={() => onChangeEstado('en_progreso')} className="btn-secondary text-sm">
          <Play className="w-4 h-4" /> Iniciar
        </button>
      )}
      {isAssignedTecnico && orden.estado === 'en_progreso' && (
        <button onClick={() => onChangeEstado('completada')} className="btn-primary text-sm">
          <CheckCircle2 className="w-4 h-4" /> Finalizar Servicio
        </button>
      )}
      {isAdmin && (
        <button onClick={onEditClick} className="btn-secondary text-sm">
          <Edit className="w-4 h-4" /> Editar
        </button>
      )}
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div className="flex flex-col gap-1 text-sm text-dark-600">
      <span className="flex items-center gap-2 font-medium text-dark-500">
        <Calendar className="w-4 h-4 text-dark-400" /> Fecha
      </span>
      <span>{formatFechaDisplay(orden.fecha_programada)}</span>
    </div>

    <div className="flex flex-col gap-1 text-sm text-dark-600">
      <span className="flex items-center gap-2 font-medium text-dark-500">
        <User className="w-4 h-4 text-dark-400" /> Técnico
      </span>
      <span>{orden.profiles?.nombre_completo || 'Sin asignar'}</span>
    </div>

    {orden.tipo_plaga && (
      <div className="flex flex-col gap-1 text-sm text-dark-600">
        <span className="font-medium text-dark-500">Tipo de Control</span>
        <div className="flex flex-wrap gap-1.5">
          {parseTipoPlaga(orden.tipo_plaga).length > 0 ? (
            parseTipoPlaga(orden.tipo_plaga).map(tipo => (
              <span key={tipo} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {tipo}
              </span>
            ))
          ) : (
            <span className="text-dark-400 italic">Sin especificar</span>
          )}
        </div>
      </div>
    )}

    {(orden.direccion_servicio || orden.clientes?.direccion) && (
      <div className="flex flex-col gap-1 text-sm text-dark-600">
        <span className="flex items-center gap-2 font-medium text-dark-500">
          <MapPin className="w-4 h-4 text-dark-400" /> Dirección
        </span>
        <span>{orden.direccion_servicio || orden.clientes?.direccion}</span>
      </div>
    )}
  </div>
</div>

      {/* Lavado de Tanques */}
      {orden.lavado_tanques && (
        <div className="card lg:col-span-2 relative mb-6 border-l-4 border-cyan-500 bg-cyan-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0">
              <Droplets className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-cyan-800">Lavado de Tanques</h2>
              <p className="text-sm text-cyan-700">
                Esta orden incluye el lavado de{' '}
                <span className="font-bold text-cyan-900 text-lg">{orden.lavado_tanques_cantidad}</span>{' '}
                tanque{orden.lavado_tanques_cantidad !== 1 ? 's' : ''}.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card lg:col-span-2 relative mb-6">
        <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-primary-600" /> Observaciones Generales
        </h2>
        <p className="text-dark-700 whitespace-pre-wrap text-sm leading-relaxed">{orden.observaciones || 'Ninguna observación.'}</p>
      </div>
    </>
  )
}