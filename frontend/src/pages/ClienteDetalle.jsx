import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import {
  createPlano, deletePlano, listEstacionesCliente, listPlanos, updateEstacionCliente
} from '../api/clientes.api'
import {
  ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Calendar,
  ClipboardList, Building2, Home, Map, Plus, X, Loader2, ImagePlus, MapPinned
} from 'lucide-react'
import toast from 'react-hot-toast'
import { confirmDelete, successAlert } from '../lib/alerts'
import { parseTipoPlaga } from '../utils/tipoPlaga'
import HelpButton from '../components/features/HelpButton'
import { HELP_CONTENT } from '../lib/helpContent'
import Modal from '../components/ui/Modal'
import PlanoEstaciones from '../components/features/PlanoEstaciones'
import { compressImage } from '../utils/imageCompressor'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const ORIGEN_LABEL = { plano: 'Plano del cliente', foto_croquis: 'Foto de croquis a mano' }

async function dimensionesDeImagen (file) {
  try {
    const bitmap = await createImageBitmap(file)
    const dim = { ancho: bitmap.width, alto: bitmap.height }
    bitmap.close()
    return dim
  } catch {
    return { ancho: null, alto: null }
  }
}

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin, isTecnico } = useAuth()
  const [cliente, setCliente] = useState(null)
  const [ordenes, setOrdenes] = useState([])
  const [sedes, setSedes] = useState([])
  const [planos, setPlanos] = useState([])
  const [estaciones, setEstaciones] = useState([])
  const [loading, setLoading] = useState(true)

  // Estado para modal/formulario de nueva Sede
  const [showSedeForm, setShowSedeForm] = useState(false)
  const [nuevaSede, setNuevaSede] = useState({ nombre: '', direccion: '', municipio: '' })
  const [savingSede, setSavingSede] = useState(false)
  const [uploadSedeId, setUploadSedeId] = useState(null)
  const [uploadForm, setUploadForm] = useState({ nombre: '', origen: 'plano', file: null })
  const [uploading, setUploading] = useState(false)
  const [locate, setLocate] = useState(null)
  const [estacionSeleccionadaId, setEstacionSeleccionadaId] = useState(null)
  const [showLocateModal, setShowLocateModal] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function load() {
    try {
      const token = localStorage.getItem('token')
      const [clienteRes, ordenesRes, sedesRes] = await Promise.all([
        api.get(`/clientes/${id}`, { token }),
        api.get('/servicios', { token, params: { cliente_id: id } }),
        api.get(`/clientes/${id}/sedes`, { token })
      ])
      setCliente(clienteRes.data)
      setOrdenes(ordenesRes.data || [])
      setSedes(sedesRes.data || [])
      try {
        const [planosRes, estacionesRes] = await Promise.all([
          listPlanos(id, token),
          listEstacionesCliente(id, token)
        ])
        setPlanos(planosRes.data || [])
        setEstaciones(estacionesRes.data || [])
      } catch (err) {
        console.error('Error cargando planos/estaciones:', err)
        toast.error('Error al cargar planos: ' + (err.message || 'No autorizado'))
        setPlanos([])
        setEstaciones([])
      }
    } catch {
      toast.error('Error cargando cliente')
      navigate('/clientes')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    const isConfirmed = await confirmDelete('¿Estás seguro de eliminar este cliente?', 'Perderás el acceso directo a su información.')
    if (!isConfirmed) return
    try {
      const token = localStorage.getItem('token')
      // Marcamos como inactivo en lugar de borrar físicamente
      await api.patch(`/clientes/${id}`, { activo: false }, { token })
      await successAlert('Cliente eliminado', 'El cliente ha sido desactivado correctamente.')
      navigate('/clientes')
    } catch { toast.error('Error al eliminar') }
  }

  async function handleAddSede(e) {
    e.preventDefault()
    if (!nuevaSede.nombre.trim()) return toast.error('El nombre de la sede es obligatorio')

    setSavingSede(true)
    try {
      const token = localStorage.getItem('token')
      const { data } = await api.post(`/clientes/${id}/sedes`, nuevaSede, { token })
      setSedes(prev => [...prev, data])
      setShowSedeForm(false)
      setNuevaSede({ nombre: '', direccion: '', municipio: '' })
      toast.success('Sede creada correctamente')
    } catch (err) {
      toast.error('Error al crear sede: ' + err.message)
    } finally {
      setSavingSede(false)
    }
  }

  async function handleDeleteSede(sedeId) {
    const isConfirmed = await confirmDelete('¿Eliminar esta sede?', 'Esto no eliminará las estaciones ni órdenes, pero quedarán huérfanas de sede.')
    if (!isConfirmed) return

    try {
      const token = localStorage.getItem('token')
      await api.delete(`/clientes/${id}/sedes/${sedeId}`, { token })
      setSedes(prev => prev.filter(s => s.id !== sedeId))
      toast.success('Sede eliminada')
    } catch (err) {
      toast.error('Error al eliminar sede: ' + err.message)
    }
  }

  function abrirSubida (sedeId) {
    setUploadSedeId(sedeId)
    setUploadForm({ nombre: '', origen: 'plano', file: null })
  }

  async function handleSubirPlano (e, sedeId) {
    e.preventDefault()
    if (!uploadForm.file) return toast.error('Selecciona una imagen')
    const nombre = uploadForm.nombre.trim() || (uploadForm.origen === 'foto_croquis' ? 'Croquis a mano' : 'Plano del cliente')
    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      const comprimida = await compressImage(uploadForm.file)
      const { ancho, alto } = await dimensionesDeImagen(comprimida)
      const ext = (comprimida.name.split('.').pop() || 'jpg').toLowerCase()
      const filePath = `${id}/${sedeId}/${Date.now()}.${ext}`

      const formData = new FormData()
      formData.append('file', comprimida)
      formData.append('path', filePath)
      formData.append('bucket', 'planos')

      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}))
        throw new Error(errData.message || errData.error || 'Error subiendo la imagen')
      }
      const { publicUrl } = await uploadRes.json()

      const { data } = await createPlano(id, {
        nombre,
        origen: uploadForm.origen,
        imagen_url: publicUrl,
        storage_path: `planos/${filePath}`,
        sede_id: sedeId,
        ancho,
        alto
      }, token)

      setPlanos(prev => [data, ...prev])
      setUploadSedeId(null)
      setUploadForm({ nombre: '', origen: 'plano', file: null })
      toast.success('Plano guardado')
    } catch (err) {
      toast.error('Error al subir plano: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDeletePlano (planoId) {
    const isConfirmed = await confirmDelete('¿Eliminar este plano?', 'Las estaciones dejarán de tener posición en este croquis.')
    if (!isConfirmed) return
    try {
      const token = localStorage.getItem('token')
      await deletePlano(id, planoId, token)
      setPlanos(prev => prev.filter(p => p.id !== planoId))
      setEstaciones(prev => prev.map(e => e.plano_id === planoId ? { ...e, plano_id: null, pos_x: null, pos_y: null } : e))
      toast.success('Plano eliminado')
    } catch (err) {
      toast.error('Error al eliminar plano: ' + err.message)
    }
  }

  function abrirUbicar (sede, plano) {
    // Si el plano tiene sede, filtrar por esa sede. Si no, mostrar todas las estaciones del cliente
    const estacionesFiltradas = plano.sede_id
      ? estaciones.filter(e => e.sede_id === plano.sede_id)
      : estaciones.filter(e => e.cliente_id === id)
    const sinUbicar = estacionesFiltradas.find(e => e.pos_x == null || e.pos_y == null)
    setEstacionSeleccionadaId(sinUbicar?.id || estacionesFiltradas[0]?.id || null)
    setLocate({ sede, plano })
    setShowLocateModal(true)
  }

  function handleSeleccionarEstacion (estacion) {
    setEstacionSeleccionadaId(estacion.id)
  }

  async function handleMoverEstacion (estacionId, x, y) {
    if (!locate?.plano) return
    try {
      const token = localStorage.getItem('token')
      const { data } = await updateEstacionCliente(id, estacionId, {
        plano_id: locate.plano.id,
        pos_x: x,
        pos_y: y
      }, token)
      setEstaciones(prev => prev.map(e => e.id === estacionId ? { ...e, ...data } : e))
    } catch (err) {
      toast.error('No se pudo guardar la posición: ' + err.message)
    }
  }

  const estadoBadge = { programada: 'badge-programada', en_progreso: 'badge-en-progreso', completada: 'badge-completada' }
  const estadoLabel = { programada: 'Programada', en_progreso: 'En Progreso', completada: 'Completada' }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  if (!cliente) return null

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/clientes" className="inline-flex items-center gap-2 text-sm text-dark-500 hover:text-dark-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      {/* Client Info */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cliente.tipo === 'industrial' ? 'bg-orange-100' :
              cliente.tipo === 'comercial' ? 'bg-blue-100' : 'bg-purple-100'
              }`}>
              {cliente.tipo === 'industrial' || cliente.tipo === 'comercial'
                ? <Building2 className="w-7 h-7 text-orange-600" />
                : <Home className="w-7 h-7 text-purple-600" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-900">{cliente.nombre}</h1>
              <div className="flex gap-2 items-center mt-1">
                <span className={
                  cliente.tipo === 'industrial' ? 'badge-industrial' :
                    cliente.tipo === 'comercial' ? 'badge-blue' : 'badge-residencial'
                }>
                  {cliente.tipo}
                </span>
                {cliente.identificacion && (
                  <span className="text-xs font-mono text-dark-400">ID: {cliente.identificacion}</span>
                )}
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/clientes', { state: { openModal: id } })}
                className="btn-secondary text-sm"
              >
                <Edit className="w-4 h-4" /> Editar
              </button>
              <button onClick={handleDelete} className="btn-danger text-sm">
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-3">Datos Generales</h3>
            <div className="space-y-3">
              {cliente.razon_social && (
                <div className="text-sm font-medium text-dark-800">
                  <span className="text-dark-400 font-normal">Razón Social:</span> {cliente.razon_social}
                </div>
              )}
              {cliente.direccion && (
                <div className="flex items-start gap-2 text-sm text-dark-600">
                  <MapPin className="w-4 h-4 text-dark-400 shrink-0 mt-0.5" /> {cliente.direccion}
                </div>
              )}
              {cliente.telefono && (
                <div className="flex items-center gap-2 text-sm text-dark-600">
                  <Phone className="w-4 h-4 text-dark-400 shrink-0" /> {cliente.telefono}
                </div>
              )}
              {cliente.email && (
                <div className="flex items-center gap-2 text-sm text-dark-600">
                  <Mail className="w-4 h-4 text-dark-400 shrink-0" /> {cliente.email}
                </div>
              )}
            </div>
          </div>

          <div className="bg-dark-50 p-4 rounded-xl border border-dark-100">
            <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-3">Contacto en Sitio</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-dark-100">
                  <Phone className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-dark-900">{cliente.nombre_contacto || 'No especificado'}</p>
                  <p className="text-xs text-dark-500">{cliente.telefono_contacto || 'Sin teléfono de contacto'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {cliente.notas && (
          <div className="mt-6 pt-6 border-t border-dark-100">
            <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">Notas</h3>
            <p className="text-sm text-dark-600 leading-relaxed">{cliente.notas}</p>
          </div>
        )}
      </div>

      {/* Sedes / Locaciones */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
              <Map className="w-5 h-5 text-primary-600" /> Sedes y Locaciones
            </h2>
            <HelpButton title="Sedes y Locaciones" content={HELP_CONTENT.sedes} />

          </div>



          {isAdmin && !showSedeForm && (
            <button onClick={() => setShowSedeForm(true)} className="btn-secondary text-sm">
              <Plus className="w-4 h-4" /> Agregar Sede
            </button>
          )}
        </div>

        {showSedeForm && (
          <form onSubmit={handleAddSede} className="bg-primary-50/50 p-4 rounded-xl border border-primary-100 mb-4 space-y-3">
            <h3 className="text-sm font-bold text-primary-800">Nueva Sede</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label-field">Nombre de la Sede</label>
                <input type="text" className="input-field bg-white" placeholder="Ej. Sede Norte" required value={nuevaSede.nombre} onChange={e => setNuevaSede({ ...nuevaSede, nombre: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Dirección</label>
                <input type="text" className="input-field bg-white" placeholder="Dirección física" value={nuevaSede.direccion} onChange={e => setNuevaSede({ ...nuevaSede, direccion: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Municipio/Ciudad</label>
                <input type="text" className="input-field bg-white" placeholder="Ej. Bogotá" value={nuevaSede.municipio} onChange={e => setNuevaSede({ ...nuevaSede, municipio: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={savingSede} className="btn-primary text-sm">
                {savingSede ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Sede'}
              </button>
              <button type="button" onClick={() => setShowSedeForm(false)} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </form>
        )}

        {/* Planos globales (sin sede) */}
        {(isAdmin || isTecnico) && (
          <div className="border rounded-xl bg-white overflow-hidden mb-4">
            <div className="p-3 flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-dark-900 flex items-center gap-2">
                  <Map className="w-3.5 h-3.5 text-primary-500" /> Planos Globales (sin sede)
                </h4>
                <p className="text-xs text-dark-500 mt-1 ml-5.5">Planos aplicables a todo el cliente</p>
              </div>
              <button
                onClick={() => abrirSubida(null)}
                className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700"
              >
                <ImagePlus className="w-3.5 h-3.5" /> Subir plano
              </button>
            </div>

            {uploadSedeId === null && (isAdmin || isTecnico) && (
              <form onSubmit={(e) => handleSubirPlano(e, null)} className="bg-primary-50/50 p-3 rounded-lg border border-primary-100 mb-2 space-y-2">
                <input
                  type="text"
                  className="input-field text-sm"
                  placeholder="Nombre del plano"
                  value={uploadForm.nombre}
                  onChange={e => setUploadForm({...uploadForm, nombre: e.target.value})}
                />
                <select
                  className="input-field text-sm"
                  value={uploadForm.origen}
                  onChange={e => setUploadForm({...uploadForm, origen: e.target.value})}
                >
                  <option value="plano">Plano del cliente</option>
                  <option value="foto_croquis">Foto de croquis a mano</option>
                  <option value="croquis_app">Croquis desde app móvil</option>
                </select>
                <input
                  type="file"
                  accept="image/*"
                  className="input-field text-sm"
                  onChange={e => setUploadForm({...uploadForm, file: e.target.files[0]})}
                />
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={uploading} className="btn-primary text-xs">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
                  </button>
                  <button type="button" onClick={() => setUploadSedeId(null)} className="btn-secondary text-xs">Cancelar</button>
                </div>
              </form>
            )}

            {(() => {
              const planosGlobales = planos.filter(p => !p.sede_id)
              if (planosGlobales.length === 0 && uploadSedeId !== null) {
                return <p className="text-xs text-dark-400 italic px-3 pb-3">No hay planos globales</p>
              }
              if (planosGlobales.length > 0) {
                return (
                  <div className="px-3 pb-3 space-y-2">
                    {planosGlobales.map(plano => (
                      <div key={plano.id} className="flex items-center justify-between p-2 bg-dark-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <MapPinned className="w-4 h-4 text-primary-500" />
                          <div>
                            <p className="text-xs font-medium text-dark-800">{plano.nombre}</p>
                            <p className="text-[10px] text-dark-400">{ORIGEN_LABEL[plano.origen] || plano.origen}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => abrirLocateModal(plano)}
                            className="p-1 text-dark-400 hover:text-primary-600 rounded"
                            title="Ubicar estaciones"
                          >
                            <MapPinned className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePlano(plano.id)}
                            className="p-1 text-dark-400 hover:text-red-600 rounded"
                            title="Eliminar plano"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
              return null
            })()}
          </div>
        )}

        {sedes.length === 0 && !showSedeForm ? (
          <div className="text-center py-6 bg-dark-50 rounded-xl border border-dashed border-dark-200">
            <Map className="w-8 h-8 text-dark-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-dark-500">Este cliente no tiene sedes registradas</p>
            <p className="text-xs text-dark-400 mt-1">Si dejas el cliente sin sedes, todas las estaciones se manejarán de forma global.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sedes.map(sede => {
              const planosSede = planos.filter(p => p.sede_id === sede.id)
              return (
                <div key={sede.id} className="border rounded-xl bg-white overflow-hidden">
                  <div className="p-3 flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-dark-900 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary-500" /> {sede.nombre}
                      </h4>
                      {(sede.direccion || sede.municipio) && (
                        <p className="text-xs text-dark-500 mt-1 ml-5.5">
                          {sede.direccion} {sede.direccion && sede.municipio ? '-' : ''} {sede.municipio}
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDeleteSede(sede.id)} className="p-1.5 text-dark-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar sede">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="px-3 pb-3 border-t border-dark-100 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-dark-500 uppercase">Planos ({planosSede.length})</span>
                        <button
                          onClick={() => abrirSubida(sede.id)}
                          className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700"
                        >
                          <ImagePlus className="w-3.5 h-3.5" /> Subir plano
                        </button>
                      </div>

                      {uploadSedeId === sede.id && (
                        <form onSubmit={(e) => handleSubirPlano(e, sede.id)} className="bg-primary-50/50 p-3 rounded-lg border border-primary-100 mb-2 space-y-2">
                          <div>
                            <label className="label-field text-xs">Nombre del plano</label>
                            <input
                              type="text"
                              className="input-field bg-white text-sm"
                              placeholder="Ej. Plano edificio principal"
                              value={uploadForm.nombre}
                              onChange={e => setUploadForm({ ...uploadForm, nombre: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="label-field text-xs">Origen</label>
                            <select
                              className="input-field bg-white text-sm"
                              value={uploadForm.origen}
                              onChange={e => setUploadForm({ ...uploadForm, origen: e.target.value })}
                            >
                              <option value="plano">Plano del cliente</option>
                              <option value="foto_croquis">Foto de croquis a mano</option>
                            </select>
                          </div>
                          <div>
                            <label className="label-field text-xs">Imagen</label>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="input-field bg-white text-sm"
                              onChange={e => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button type="submit" disabled={uploading} className="btn-primary text-xs">
                              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
                            </button>
                            <button type="button" onClick={() => setUploadSedeId(null)} className="btn-secondary text-xs">Cancelar</button>
                          </div>
                        </form>
                      )}

                      {planosSede.length === 0 && uploadSedeId !== sede.id && (
                        <p className="text-xs text-dark-400 italic">No hay planos para esta sede</p>
                      )}

                      {planosSede.length > 0 && (
                        <div className="space-y-2">
                          {planosSede.map(plano => (
                            <div key={plano.id} className="flex items-center justify-between p-2 bg-dark-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <MapPinned className="w-4 h-4 text-primary-500" />
                                <div>
                                  <p className="text-xs font-medium text-dark-800">{plano.nombre}</p>
                                  <p className="text-[10px] text-dark-400">{ORIGEN_LABEL[plano.origen] || plano.origen}</p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => abrirUbicar(sede, plano)}
                                  className="text-xs flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                                >
                                  Ubicar estaciones
                                </button>
                                <button
                                  onClick={() => handleDeletePlano(plano.id)}
                                  className="p-1 text-dark-400 hover:text-red-600 rounded"
                                  title="Eliminar plano"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Service History */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-600" /> Historial de Servicios
          </h2>
          <Link to={`/ordenes/nueva?cliente=${id}`} className="btn-primary text-sm">Nueva Orden</Link>
        </div>
        {ordenes.length === 0 ? (
          <p className="text-dark-400 text-sm text-center py-8">Sin servicios registrados</p>
        ) : (
          <div className="space-y-3">
            {ordenes.map(o => (
              <Link key={o.id} to={`/ordenes/${o.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-dark-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dark-900">{o.fecha_programada}</p>
                    <p className="text-xs text-dark-400">{parseTipoPlaga(o.tipo_plaga).join(', ') || 'Sin especificar'} — {o.tecnico_nombre || 'Sin asignar'}</p>
                  </div>
                </div>
                <span className={estadoBadge[o.estado]}>{estadoLabel[o.estado]}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modal para ubicar estaciones en el plano */}
      {showLocateModal && locate && (
        <Modal
          isOpen={showLocateModal}
          onClose={() => setShowLocateModal(false)}
          title={`Ubicar estaciones - ${locate.sede.nombre}`}
          maxWidth="max-w-4xl"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-600">
                Estación seleccionada: <strong>{estaciones.find(e => e.id === estacionSeleccionadaId)?.numero || '-'}</strong>
              </span>
              <select
                className="input-field text-sm w-40"
                value={estacionSeleccionadaId || ''}
                onChange={e => setEstacionSeleccionadaId(e.target.value || null)}
              >
                <option value="">Seleccionar estación</option>
                {estaciones
                  .filter(e => locate.plano.sede_id ? e.sede_id === locate.plano.sede_id : e.cliente_id === id)
                  .map(e => (
                    <option key={e.id} value={e.id}>
                      {e.numero} - {e.tipo || e.tipo_estacion || 'Sin tipo'}
                    </option>
                  ))}
              </select>
            </div>
            <PlanoEstaciones
              plano={locate.plano}
              estaciones={estaciones.filter(e => locate.plano.sede_id ? e.sede_id === locate.plano.sede_id : e.cliente_id === id)}
              modo="editar"
              estacionSeleccionadaId={estacionSeleccionadaId}
              onMover={handleMoverEstacion}
              onSeleccionar={handleSeleccionarEstacion}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
