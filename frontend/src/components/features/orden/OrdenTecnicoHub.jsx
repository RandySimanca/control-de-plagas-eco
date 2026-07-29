import { useState } from 'react'
import {
  History, Target, Package, Droplets, MapPin, PenLine, Plus,
  X, ArrowRight, CheckCircle2, ChevronRight, Shield, Layers, Camera
} from 'lucide-react'

import OrdenBitacoraModal from './OrdenBitacoraModal'
import OrdenProductos from './OrdenProductos'
import OrdenEstaciones from './OrdenEstaciones'
import OrdenLavadoTanques from './OrdenLavadoTanques'
import OrdenTecnicoDetalles from './OrdenTecnicoDetalles'
import OrdenCertificado from './OrdenCertificado'
import ActividadWizardModal from './ActividadWizardModal'

export default function OrdenTecnicoHub({
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
  certificado,
  setCertificado,
  isAssignedTecnico,
  isAdmin,
  queueOrExecute,
  queuePhoto,
  isOnline
}) {
  const [activeModal, setActiveModal] = useState(null) // 'bitacora' | 'estaciones' | 'productos' | 'tanques' | 'detalles' | 'certificado'
  const [showWizardDirect, setShowWizardDirect] = useState(false)
  const [showFullView, setShowFullView] = useState(false)

  const canEdit = (isAssignedTecnico || isAdmin) && orden.estado === 'en_progreso'
  const clienteNombre = orden.clientes?.nombre || orden.cliente_nombre || 'Cliente sin nombre'

  return (
    <div className="space-y-6">
      {/* 1. Header Banner del Entorno del Técnico */}
      <div className="relative overflow-hidden bg-gradient-to-br from-dark-900 via-dark-800 to-primary-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-dark-700/50">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary-400 bg-primary-950/80 border border-primary-500/30 px-3 py-1 rounded-full">
                Centro de Trabajo del Técnico
              </span>
              {orden.estado === 'en_progreso' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Servicio en Curso
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight pt-1">
              {clienteNombre}
            </h1>
            <p className="text-xs sm:text-sm text-dark-300 flex items-center gap-2">
              <span>Folio: <strong className="text-white">#{orden.id?.substring(0, 8)}</strong></span>
              <span>•</span>
              <span>{orden.tipo_plaga || 'Servicio de control'}</span>
            </p>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowWizardDirect(true)}
              className="btn-primary py-2.5 px-4 rounded-2xl text-sm font-bold shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500"
            >
              <Plus className="w-5 h-5" />
              <span>Registrar Avance Rápidamente</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Grid de Botones Móviles por Módulos (2 Columnas en Móvil, 3 en Desktop) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-dark-700 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-600" /> Actividades del Servicio
          </h3>
          <span className="text-xs text-dark-400 font-medium">Toca para abrir módulo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* BOTÓN 1: BITÁCORA DE AVANCES */}
          <div className="group bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-5 text-white shadow-lg hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[170px] border border-blue-500/30">
            <div className="absolute right-3 top-3 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
                  <History className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold bg-white/20 text-white px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/20">
                  {actividades.length} {actividades.length === 1 ? 'avance' : 'avances'}
                </span>
              </div>
              <h4 className="text-lg font-bold tracking-tight">Bitácora de Avances</h4>
              <p className="text-xs text-blue-100/80 mt-1 line-clamp-2">
                Ingresa notas de inspección, hallazgos y evidencias fotográficas.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/10 mt-2">
              <button
                type="button"
                onClick={() => setActiveModal('bitacora')}
                className="text-xs font-bold text-white flex items-center gap-1 hover:underline"
              >
                Ver Bitácora <ChevronRight className="w-4 h-4" />
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowWizardDirect(true)}
                  className="bg-white text-indigo-900 hover:bg-blue-50 text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-sm active:scale-95 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Registrar
                </button>
              )}
            </div>
          </div>

          {/* BOTÓN 2: CONTROL DE ESTACIONES */}
          <div className="group bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-lg hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[170px] border border-emerald-500/30">
            <div className="absolute right-3 top-3 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
                  <Target className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold bg-white/20 text-white px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/20">
                  {estaciones.length} trampas
                </span>
              </div>
              <h4 className="text-lg font-bold tracking-tight">Estaciones de Cebo</h4>
              <p className="text-xs text-emerald-100/80 mt-1 line-clamp-2">
                Monitoreo de cebos, trampas de luz UV y escaneo de códigos QR.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/10 mt-2">
              <button
                type="button"
                onClick={() => setActiveModal('estaciones')}
                className="w-full text-xs font-bold text-white flex items-center justify-between hover:underline"
              >
                <span>Gestionar Trampas</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* BOTÓN 3: PRODUCTOS QUÍMICOS */}
          <div className="group bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-5 text-white shadow-lg hover:shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[170px] border border-amber-400/30">
            <div className="absolute right-3 top-3 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
                  <Package className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold bg-white/20 text-white px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/20">
                  {productos.length} aplicados
                </span>
              </div>
              <h4 className="text-lg font-bold tracking-tight">Productos & Dosis</h4>
              <p className="text-xs text-amber-100/80 mt-1 line-clamp-2">
                Registro de plaguicidas, lotes, dosificación e ingrediente activo.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/10 mt-2">
              <button
                type="button"
                onClick={() => setActiveModal('productos')}
                className="w-full text-xs font-bold text-white flex items-center justify-between hover:underline"
              >
                <span>Agregar Químicos</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* BOTÓN 4: LAVADO DE TANQUES (Si aplica) */}
          {orden.lavado_tanques && (
            <div className="group bg-gradient-to-br from-cyan-600 to-blue-700 rounded-3xl p-5 text-white shadow-lg hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[170px] border border-cyan-400/30">
              <div className="absolute right-3 top-3 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
                    <Droplets className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold bg-cyan-900/60 text-cyan-200 px-2.5 py-1 rounded-full border border-cyan-400/40">
                    Lavado Tanques
                  </span>
                </div>
                <h4 className="text-lg font-bold tracking-tight">Limpieza de Tanques</h4>
                <p className="text-xs text-cyan-100/80 mt-1 line-clamp-2">
                  Registro de dimensiones, bitácora del proceso y fotos antes/después.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-white/10 mt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('tanques')}
                  className="w-full text-xs font-bold text-white flex items-center justify-between hover:underline"
                >
                  <span>Ver Bitácora de Tanques</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* BOTÓN 5: DETALLES & ÁREAS */}
          <div className="group bg-gradient-to-br from-purple-600 to-violet-800 rounded-3xl p-5 text-white shadow-lg hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[170px] border border-purple-400/30">
            <div className="absolute right-3 top-3 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold bg-white/20 text-white px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/20">
                  Técnico
                </span>
              </div>
              <h4 className="text-lg font-bold tracking-tight">Áreas & Recomendaciones</h4>
              <p className="text-xs text-purple-100/80 mt-1 line-clamp-2">
                Selección de áreas intervenidas, métodos de control y sugerencias.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/10 mt-2">
              <button
                type="button"
                onClick={() => setActiveModal('detalles')}
                className="w-full text-xs font-bold text-white flex items-center justify-between hover:underline"
              >
                <span>Editar Áreas & Métodos</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* BOTÓN 6: FIRMA & CERTIFICADO */}
          <div className="group bg-gradient-to-br from-rose-600 to-pink-700 rounded-3xl p-5 text-white shadow-lg hover:shadow-2xl hover:shadow-pink-500/20 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[170px] border border-rose-400/30">
            <div className="absolute right-3 top-3 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
                  <PenLine className="w-6 h-6" />
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm border ${
                  certificado ? 'bg-emerald-950/70 text-emerald-300 border-emerald-400/40' : 'bg-white/20 text-white border-white/20'
                }`}>
                  {certificado ? 'Generado ✓' : 'Pendiente'}
                </span>
              </div>
              <h4 className="text-lg font-bold tracking-tight">Firma & Cierre</h4>
              <p className="text-xs text-rose-100/80 mt-1 line-clamp-2">
                Captura de firma del cliente, vista previa y emisión del certificado.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/10 mt-2">
              <button
                type="button"
                onClick={() => setActiveModal('certificado')}
                className="w-full text-xs font-bold text-white flex items-center justify-between hover:underline"
              >
                <span>Firmar / Ver Certificado</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Opción para alternar vista tradicional expansiva */}
      <div className="pt-2 flex justify-center">
        <button
          type="button"
          onClick={() => setShowFullView(!showFullView)}
          className="text-xs font-semibold text-dark-500 hover:text-dark-800 bg-white px-4 py-2 rounded-xl border border-dark-200 shadow-xs transition-colors flex items-center gap-2"
        >
          {showFullView ? 'Ocultar vista desplegada' : 'Mostrar vista desplegada tradicional'}
        </button>
      </div>

      {/* 3. MODALES DE CADA MÓDULO AL HACER CLICK EN UNA TARJETA */}

      {/* Modal Bitácora */}
      <OrdenBitacoraModal
        isOpen={activeModal === 'bitacora'}
        onClose={() => setActiveModal(null)}
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
      />

      {/* Modal Productos */}
      {activeModal === 'productos' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto border border-dark-100 p-4 sm:p-6 relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-dark-100">
              <h3 className="text-lg font-bold text-dark-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" /> Productos Químicos Aplicados
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-9 h-9 rounded-full bg-dark-100 hover:bg-dark-200 flex items-center justify-center text-dark-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <OrdenProductos
              ordenId={orden.id}
              productos={productos}
              setProductos={setProductos}
              isAssignedTecnico={isAssignedTecnico}
              ordenEstado={orden.estado}
              queueOrExecute={queueOrExecute}
              ordenTipoPlaga={orden.tipo_plaga}
            />
          </div>
        </div>
      )}

      {/* Modal Estaciones */}
      {activeModal === 'estaciones' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto border border-dark-100 p-4 sm:p-6 relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-dark-100">
              <h3 className="text-lg font-bold text-dark-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" /> Control de Estaciones y Trampas
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-9 h-9 rounded-full bg-dark-100 hover:bg-dark-200 flex items-center justify-center text-dark-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <OrdenEstaciones
              ordenId={orden.id}
              estaciones={estaciones}
              setEstaciones={setEstaciones}
              isAssignedTecnico={isAssignedTecnico}
              ordenEstado={orden.estado}
              isOnline={isOnline}
              queueOrExecute={queueOrExecute}
              queuePhoto={queuePhoto}
            />
          </div>
        </div>
      )}

      {/* Modal Lavado de Tanques */}
      {activeModal === 'tanques' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto border border-dark-100 p-4 sm:p-6 relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-dark-100">
              <h3 className="text-lg font-bold text-dark-900 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-cyan-500" /> Servicio de Lavado de Tanques
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-9 h-9 rounded-full bg-dark-100 hover:bg-dark-200 flex items-center justify-center text-dark-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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
          </div>
        </div>
      )}

      {/* Modal Detalles Técnicos */}
      {activeModal === 'detalles' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto border border-dark-100 p-4 sm:p-6 relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-dark-100">
              <h3 className="text-lg font-bold text-dark-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-500" /> Áreas Intervenidas & Recomendaciones
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-9 h-9 rounded-full bg-dark-100 hover:bg-dark-200 flex items-center justify-center text-dark-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <OrdenTecnicoDetalles
              orden={orden}
              setOrden={setOrden}
              setFotos={setFotos}
              isAssignedTecnico={isAssignedTecnico}
              queueOrExecute={queueOrExecute}
              queuePhoto={queuePhoto}
            />
          </div>
        </div>
      )}

      {/* Modal Certificado & Firma */}
      {activeModal === 'certificado' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto border border-dark-100 p-4 sm:p-6 relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-dark-100">
              <h3 className="text-lg font-bold text-dark-900 flex items-center gap-2">
                <PenLine className="w-5 h-5 text-rose-500" /> Firma del Cliente & Certificado
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-9 h-9 rounded-full bg-dark-100 hover:bg-dark-200 flex items-center justify-center text-dark-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <OrdenCertificado
              orden={orden}
              productos={productos}
              estaciones={estaciones}
              actividades={actividades}
              fotos={fotos}
              certificado={certificado}
              setCertificado={setCertificado}
            />
          </div>
        </div>
      )}

      {/* Wizard Directo de Registro de Avance */}
      <ActividadWizardModal
        isOpen={showWizardDirect}
        onClose={() => setShowWizardDirect(false)}
        onSave={async ({ descripcion, photos }) => {
          try {
            const actId = generateUUID()
            const actPayload = {
              id: actId,
              orden_id: orden.id,
              descripcion,
              created_at: new Date().toISOString()
            }
            const { data: actRows, queued } = await queueOrExecute('actividades_servicio', 'insert', actPayload, orden.id)
            const actData = actRows?.[0] || actPayload

            if (photos.length > 0) {
              for (const file of photos) {
                const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'photo.jpg'
                const path = `actividades/${actId}/${Date.now()}_${safeName}`
                const dbPayload = { id: generateUUID(), orden_id: orden.id, storage_path: path, descripcion: descripcion.substring(0, 80) }
                const { publicUrl, queued: photoQueued } = await queuePhoto('fotos-servicio', path, file, file.type || 'image/jpeg', 'fotos_servicio', dbPayload, orden.id)
                if (publicUrl || photoQueued) setFotos(prev => [...prev, { ...dbPayload, url: publicUrl || dbPayload.storage_path }])
              }
            }
            setActividades(prev => [actData, ...prev])
            setShowWizardDirect(false)
          } catch (err) {
            console.error('Error registrando avance rápido:', err)
          }
        }}
        ordenTipoPlaga={orden.tipo_plaga}
      />
    </div>
  )
}
