import { useState } from 'react'
import {
  Sparkles, Target, Shield, Droplets, PenLine, Plus,
  X, ChevronRight, Layers, Camera, CheckCircle2, FileText
} from 'lucide-react'

import { parseTipoPlaga } from '../../../utils/tipoPlaga'
import OrdenServicioModal from './OrdenServicioModal'
import OrdenCertificado from './OrdenCertificado'
import OrdenFotos from './OrdenFotos'
import ActividadWizardModal from './ActividadWizardModal'
import { generateUUID } from '../../../utils/uuid'

function getControlTheme(nombre) {
  const n = nombre.toLowerCase()
  if (n.includes('tanque')) {
    return {
      gradient: 'from-cyan-600 to-blue-700 border-cyan-400/30 shadow-cyan-500/10',
      badgeBg: 'bg-white/20 text-white border-white/20',
      Icon: Droplets,
      desc: 'Inspección, bitácora de fotos y limpieza de tanques.'
    }
  }
  if (n.includes('rat') || n.includes('roe')) {
    return {
      gradient: 'from-emerald-600 to-teal-700 border-emerald-500/30 shadow-emerald-500/10',
      badgeBg: 'bg-white/20 text-white border-white/20',
      Icon: Target,
      desc: 'Control de roedores, revisión de cebos y trampa QR.'
    }
  }
  if (n.includes('infec') || n.includes('sani')) {
    return {
      gradient: 'from-purple-600 to-violet-800 border-purple-400/30 shadow-purple-500/10',
      badgeBg: 'bg-white/20 text-white border-white/20',
      Icon: Shield,
      desc: 'Sanitización ambiental y desinfección de áreas.'
    }
  }
  if (n.includes('insect') || n.includes('fumig') || n.includes('cuca') || n.includes('chin')) {
    return {
      gradient: 'from-blue-600 to-indigo-700 border-blue-500/30 shadow-indigo-500/10',
      badgeBg: 'bg-white/20 text-white border-white/20',
      Icon: Sparkles,
      desc: 'Control de plagas rastreras, voladoras y gel.'
    }
  }
  return {
    gradient: 'from-amber-500 to-orange-600 border-amber-400/30 shadow-orange-500/10',
    badgeBg: 'bg-white/20 text-white border-white/20',
    Icon: Layers,
    desc: 'Tratamiento especializado y actividades de control.'
  }
}

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
  const [selectedServicio, setSelectedServicio] = useState(null)
  const [showCertificadoModal, setShowCertificadoModal] = useState(false)
  const [showFotosModal, setShowFotosModal] = useState(false)
  const [showWizardDirect, setShowWizardDirect] = useState(false)

  const canEdit = (isAssignedTecnico || isAdmin) && orden.estado === 'en_progreso'
  const clienteNombre = orden.clientes?.nombre || orden.cliente_nombre || 'Cliente sin nombre'

  // Obtener todos los tipos de control para la orden
  const tiposPlagaParsed = parseTipoPlaga(orden.tipo_plaga)
  const serviciosControl = tiposPlagaParsed.length > 0 ? tiposPlagaParsed : ['Control General']

  if (orden.lavado_tanques && !serviciosControl.includes('Lavado de Tanques')) {
    serviciosControl.push('Lavado de Tanques')
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner de la Orden */}
      <div className="relative overflow-hidden bg-gradient-to-br from-dark-900 via-dark-800 to-primary-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-dark-700/50">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary-400 bg-primary-950/80 border border-primary-500/30 px-3 py-1 rounded-full">
                Servicios Asignados ({serviciosControl.length})
              </span>
              {orden.estado === 'en_progreso' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> En Progreso
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight pt-1">
              {clienteNombre}
            </h1>
            <p className="text-xs sm:text-sm text-dark-300 flex items-center gap-2">
              <span>Folio: <strong className="text-white">#{orden.id?.substring(0, 8)}</strong></span>
              <span>•</span>
              <span>Toca un servicio para trabajar</span>
            </p>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowWizardDirect(true)}
              className="btn-primary py-2.5 px-4 rounded-2xl text-sm font-bold shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500"
            >
              <Plus className="w-5 h-5" />
              <span>Registrar Avance</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Grid por Tipo de Control / Servicio (2 Columnas Móvil) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-dark-700 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-600" /> Elige el Servicio a Realizar
          </h3>
          <span className="text-xs text-dark-400 font-medium">Toca para abrir actividades</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* TARJETAS POR CADA TIPO DE CONTROL / SERVICIO */}
          {serviciosControl.map((servicioNombre, idx) => {
            const theme = getControlTheme(servicioNombre)
            const Icon = theme.Icon

            return (
              <div
                key={idx}
                onClick={() => setSelectedServicio(servicioNombre)}
                className={`group cursor-pointer bg-gradient-to-br ${theme.gradient} rounded-3xl p-5 text-white shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] border`}
              >
                <div className="absolute right-3 top-3 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm border ${theme.badgeBg}`}>
                      Servicio #{idx + 1}
                    </span>
                  </div>
                  <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                    {servicioNombre}
                  </h4>
                  <p className="text-xs text-white/80 mt-1 line-clamp-2 leading-relaxed">
                    {theme.desc}
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-white/15 mt-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1 group-hover:underline">
                    Ingresar a {servicioNombre}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-white/20 group-hover:bg-white text-white group-hover:text-dark-900 flex items-center justify-center transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )
          })}

          {/* TARJETA 5: FIRMA Y CERTIFICADO FINAL */}
          <div
            onClick={() => setShowCertificadoModal(true)}
            className="group cursor-pointer bg-gradient-to-br from-rose-600 to-pink-700 rounded-3xl p-5 text-white shadow-lg hover:shadow-2xl hover:shadow-pink-500/10 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] border border-rose-400/30"
          >
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
              <h4 className="text-lg font-black tracking-tight">Firma & Cierre de Servicio</h4>
              <p className="text-xs text-rose-100/80 mt-1 line-clamp-2 leading-relaxed">
                Captura de firma del cliente y generación del certificado oficial.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/15 mt-3">
              <span className="text-xs font-bold text-white flex items-center gap-1 group-hover:underline">
                Firmar y Finalizar
              </span>
              <div className="w-7 h-7 rounded-full bg-white/20 group-hover:bg-white text-white group-hover:text-pink-900 flex items-center justify-center transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. MODALES DE CADA SERVICIO / TIPO DE CONTROL */}

      {/* Modal por Tipo de Control (Desinsectación, Desratización, Lavado de Tanques, etc.) */}
      <OrdenServicioModal
        isOpen={Boolean(selectedServicio)}
        onClose={() => setSelectedServicio(null)}
        servicioNombre={selectedServicio}
        orden={orden}
        setOrden={setOrden}
        productos={productos}
        setProductos={setProductos}
        estaciones={estaciones}
        setEstaciones={setEstaciones}
        actividades={actividades}
        setActividades={setActividades}
        fotos={fotos}
        setFotos={setFotos}
        isAssignedTecnico={isAssignedTecnico}
        isAdmin={isAdmin}
        queueOrExecute={queueOrExecute}
        queuePhoto={queuePhoto}
        isOnline={isOnline}
      />

      {/* Modal Certificado & Firma */}
      {showCertificadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto border border-dark-100 p-4 sm:p-6 relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-dark-100">
              <h3 className="text-lg font-bold text-dark-900 flex items-center gap-2">
                <PenLine className="w-5 h-5 text-rose-500" /> Firma del Cliente & Certificado
              </h3>
              <button
                type="button"
                onClick={() => setShowCertificadoModal(false)}
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
