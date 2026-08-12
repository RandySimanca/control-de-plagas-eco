import { useState } from 'react'
import {
  X, History, Package, Target, MapPin, Droplets, Plus,
  Sparkles, ArrowLeft, ChevronRight, CheckCircle2
} from 'lucide-react'
import OrdenActividades from './OrdenActividades'
import OrdenProductos from './OrdenProductos'
import OrdenEstaciones from './OrdenEstaciones'
import OrdenTecnicoDetalles from './OrdenTecnicoDetalles'
import OrdenLavadoTanques from './OrdenLavadoTanques'
import ActividadWizardModal from './ActividadWizardModal'
import { generateUUID } from '../../../utils/uuid'

export default function OrdenServicioModal({
  isOpen,
  onClose,
  servicioNombre,
  orden,
  setOrden,
  productos,
  setProductos,
  estaciones,
  setEstaciones,
  actividades,
  setActividades,
  fotos,
  setFotos,
  isAssignedTecnico,
  isAdmin,
  queueOrExecute,
  queuePhoto,
  isOnline
}) {
  const [subView, setSubView] = useState('menu') // 'menu' | 'bitacora' | 'productos' | 'estaciones' | 'detalles'
  const [showWizard, setShowWizard] = useState(false)

  if (!isOpen || !servicioNombre) return null

  const isTanques = servicioNombre.toLowerCase().includes('tanque')
  const canEdit = (isAssignedTecnico || isAdmin) && orden.estado === 'en_progreso'

  const actividadesServicio = actividades.filter(act => {
    if (isTanques) return true
    return true
  })

  const productosServicio = servicioNombre
    ? productos.filter(p => p.tipo_producto?.toLowerCase() === servicioNombre?.toLowerCase())
    : productos

  const subBotones = [
    {
      id: 'bitacora',
      titulo: 'Bitácora & Avances',
      desc: 'Registrar notas, inspección y fotos de evidencia.',
      icon: History,
      count: `${actividadesServicio.length} avances`,
      gradient: 'from-blue-600 to-indigo-700 border-blue-400/30'
    },
    {
      id: 'productos',
      titulo: 'Productos & Dosis',
      desc: `Agregar plaguicidas, geles y dosificación para ${servicioNombre}.`,
      icon: Package,
      count: `${productosServicio.length} aplicados`,
      gradient: 'from-amber-500 to-orange-600 border-amber-400/30'
    },
    {
      id: 'estaciones',
      titulo: 'Estaciones & Trampas',
      desc: 'Escanear QR y revisar cebos o trampas de luz.',
      icon: Target,
      count: `${estaciones.length} trampas`,
      gradient: 'from-emerald-600 to-teal-700 border-emerald-400/30'
    },
    {
      id: 'detalles',
      titulo: 'Áreas & Métodos',
      desc: 'Marcar áreas intervenidas y recomendaciones.',
      icon: MapPin,
      gradient: 'from-purple-600 to-violet-800 border-purple-400/30'
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-4xl h-[94vh] sm:h-[88vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-dark-100">
        
        {/* Header del Modal */}
        <div className={`px-5 py-4 text-white flex items-center justify-between shadow-md shrink-0 ${
          isTanques 
            ? 'bg-gradient-to-r from-cyan-600 to-blue-700' 
            : 'bg-gradient-to-r from-indigo-700 via-purple-700 to-primary-700'
        }`}>
          <div className="flex items-center gap-3">
            {subView !== 'menu' && !isTanques && (
              <button
                type="button"
                onClick={() => setSubView('menu')}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                title="Volver a opciones del servicio"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
              {isTanques ? <Droplets className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full border border-white/20">
                  {subView === 'menu' || isTanques ? 'Servicio Activo' : `Actividad: ${subBotones.find(b => b.id === subView)?.titulo}`}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black leading-tight tracking-tight">
                {servicioNombre}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { setSubView('menu'); onClose(); }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo Principal del Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-dark-50/50">

          {/* CASO 1: LAVADO DE TANQUES */}
          {isTanques ? (
            <OrdenLavadoTanques
              ordenId={orden.id}
              isAssignedTecnico={isAssignedTecnico}
              isAdmin={isAdmin}
              ordenEstado={orden.estado}
              queuePhoto={queuePhoto}
              queueOrExecute={queueOrExecute}
              actividades={actividades}
              setActividades={setActividades}
            />
          ) : (
            /* CASO 2: MENÚ DE BOTONES DE ACTIVIDADES DENTRO DEL SERVICIO */
            subView === 'menu' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h3 className="text-base font-bold text-dark-900">
                      ¿Qué actividad vas a realizar en {servicioNombre}?
                    </h3>
                    <p className="text-xs text-dark-500">
                      Selecciona una opción a continuación para iniciar el registro.
                    </p>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setShowWizard(true)}
                      className="btn-primary text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Registrar Avance
                    </button>
                  )}
                </div>

                {/* Sub-grid de 4 Botones de Acción */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {subBotones.map((btn) => {
                    const Icon = btn.icon
                    return (
                      <div
                        key={btn.id}
                        onClick={() => setSubView(btn.id)}
                        className={`group cursor-pointer bg-gradient-to-br ${btn.gradient} rounded-3xl p-5 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px] border`}
                      >
                        <div className="absolute right-3 top-3 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
                              <Icon className="w-6 h-6" />
                            </div>
                            {btn.count && (
                              <span className="text-xs font-bold bg-white/20 text-white px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/20">
                                {btn.count}
                              </span>
                            )}
                          </div>
                          <h4 className="text-lg font-extrabold tracking-tight">
                            {btn.titulo}
                          </h4>
                          <p className="text-xs text-white/80 mt-1 line-clamp-2 leading-relaxed">
                            {btn.desc}
                          </p>
                        </div>

                        <div className="pt-3 flex items-center justify-between border-t border-white/15 mt-3">
                          <span className="text-xs font-bold text-white flex items-center gap-1 group-hover:underline">
                            Ingresar a {btn.titulo}
                          </span>
                          <div className="w-7 h-7 rounded-full bg-white/20 group-hover:bg-white text-white group-hover:text-dark-900 flex items-center justify-center transition-all">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* VISTA DE ACTIVIDAD SELECCIONADA CON BOTÓN PARA VOLVER */
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-dark-100 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setSubView('menu')}
                    className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver a actividades de {servicioNombre}
                  </button>

                  <span className="text-xs font-semibold text-dark-500">
                    Modo: {subBotones.find(b => b.id === subView)?.titulo}
                  </span>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-3xl border border-dark-100 shadow-xs">
                  {subView === 'bitacora' && (
                    <OrdenActividades
                      ordenId={orden.id}
                      actividades={actividades}
                      setActividades={setActividades}
                      fotos={fotos}
                      setFotos={setFotos}
                      isAssignedTecnico={isAssignedTecnico}
                      isAdmin={isAdmin}
                      ordenEstado={orden.estado}
                      ordenTipoPlaga={orden.tipo_plaga}
                      queueOrExecute={queueOrExecute}
                      queuePhoto={queuePhoto}
                      servicioFiltro={servicioNombre}
                    />
                  )}

                  {subView === 'productos' && (
                    <OrdenProductos
                      ordenId={orden.id}
                      productos={productos}
                      setProductos={setProductos}
                      isAssignedTecnico={isAssignedTecnico}
                      ordenEstado={orden.estado}
                      queueOrExecute={queueOrExecute}
                      ordenTipoPlaga={orden.tipo_plaga}
                      servicioFiltro={servicioNombre}
                      isOnline={isOnline}
                    />
                  )}

                  {subView === 'estaciones' && (
                    <OrdenEstaciones
                      ordenId={orden.id}
                      clienteId={orden.cliente_id}
                      sedeId={orden.sede_id}
                      estaciones={estaciones}
                      setEstaciones={setEstaciones}
                      isAssignedTecnico={isAssignedTecnico}
                      ordenEstado={orden.estado}
                      isOnline={isOnline}
                      queueOrExecute={queueOrExecute}
                      queuePhoto={queuePhoto}
                    />
                  )}

                  {subView === 'detalles' && (
                    <OrdenTecnicoDetalles
                      orden={orden}
                      setOrden={setOrden}
                      setFotos={setFotos}
                      isAssignedTecnico={isAssignedTecnico}
                      queueOrExecute={queueOrExecute}
                      queuePhoto={queuePhoto}
                    />
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-4 bg-dark-50 border-t border-dark-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-dark-400 font-medium hidden sm:inline">
            Servicio: {servicioNombre} • Orden #{orden.id?.substring(0, 8)}
          </span>
          <button
            type="button"
            onClick={() => { setSubView('menu'); onClose(); }}
            className="btn-secondary py-2 px-5 text-sm font-semibold rounded-xl ml-auto"
          >
            Cerrar Servicio
          </button>
        </div>
      </div>

      {/* Wizard para Registrar Avance Directo */}
      <ActividadWizardModal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSave={async ({ descripcion, photos }) => {
          try {
            const actId = generateUUID()
            const actPayload = {
              id: actId,
              orden_id: orden.id,
              descripcion: `[${servicioNombre}] ${descripcion}`,
              created_at: new Date().toISOString()
            }
            const { data: actRows, queued } = await queueOrExecute('actividades_servicio', 'insert', actPayload, orden.id)
            const actData = actRows?.[0] || actPayload

            if (photos.length > 0) {
              for (const file of photos) {
                const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'photo.jpg'
                const path = `actividades/${actId}/${Date.now()}_${safeName}`
                const dbPayload = { id: generateUUID(), orden_id: orden.id, storage_path: path, descripcion: descripcion.substring(0, 80) }
                const { publicUrl } = await queuePhoto('fotos-servicio', path, file, file.type || 'image/jpeg', 'fotos_servicio', dbPayload, orden.id)
                if (publicUrl) setFotos(prev => [...prev, { ...dbPayload, url: publicUrl }])
              }
            }
            setActividades(prev => [actData, ...prev])
            setShowWizard(false)
          } catch (err) {
            console.error('Error registrando avance en servicio:', err)
          }
        }}
        ordenTipoPlaga={orden.tipo_plaga}
        defaultTipoControl={servicioNombre}
      />
    </div>
  )
}
