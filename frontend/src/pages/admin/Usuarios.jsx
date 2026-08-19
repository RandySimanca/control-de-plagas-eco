import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, Search, Shield, UserCog, Users as UsersIcon, UserCheck, UserX, Save, Loader2, Upload, Trash2, Package, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { confirmDelete, successAlert } from '../../lib/alerts'
import Modal from '../../components/ui/Modal'
import { getAuthImageUrl } from '../../utils/imageUtils'
import HelpButton from '../../components/features/HelpButton'
import { HELP_CONTENT } from '../../lib/helpContent'
const EMPTY_FORM = {
  nombre_completo: '', email: '', password: '', telefono: '',
  rol: 'tecnico', especialidad: '', activo: true, cliente_id: '',
  firma_url: ''
}

export default function Usuarios() {
  const { profile } = useAuth()
  const location = useLocation()
  const [usuarios, setUsuarios] = useState([])
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [loading, setLoading] = useState(true)

  // -- Modal State --
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const isEdit = Boolean(editingId)
  
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [signatureFile, setSignatureFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

  // -- Modal Dotación --
  const [showDotacionModal, setShowDotacionModal] = useState(false)
  const [dotacionHistorial, setDotacionHistorial] = useState([])
  const [dotacionLoading, setDotacionLoading] = useState(false)

  useEffect(() => { 
    load() 
    if (location.state?.openModal) {
      openModal()
      window.history.replaceState({}, document.title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await api.get('/profiles', { token })
      setUsuarios(response.data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadClientes() {
    if (clientes.length === 0) {
      try {
        const token = localStorage.getItem('token')
        const response = await api.get('/clientes', { token })
        setClientes(response.data || [])
      } catch (err) {
        console.error('Error loading clientes:', err)
      }
    }
  }

  async function openModal(id = null) {
    setEditingId(id)
    setForm({ ...EMPTY_FORM, rol: 'tecnico' })
    setSignatureFile(null)
    await loadClientes()
    setShowModal(true)

    if (id) {
      setModalLoading(true)
      try {
        const token = localStorage.getItem('token')
        const response = await api.get(`/profiles/${id}`, { token })
        setForm({ ...response.data, password: '' })
      } catch (err) {
        toast.error(err.message || 'Error cargando usuario')
        setShowModal(false)
      } finally {
        setModalLoading(false)
      }
    }
  }

  function closeModal() {
    setShowModal(false)
    setEditingId(null)
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre_completo.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)

    try {
      let firmaUrl = form.firma_url
      const token = localStorage.getItem('token')
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

      // Upload signature if provided
      if (signatureFile) {
        const ext = signatureFile.name.split('.').pop()
        const fileName = `perfiles/firma_${Date.now()}.${ext}`
        const formData = new FormData()
        formData.append('file', signatureFile)
        formData.append('path', fileName)
        formData.append('bucket', 'documentos')
        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        })
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}))
          throw new Error(errData.message || 'Error subiendo firma')
        }
        const uploadData = await uploadRes.json()
        firmaUrl = uploadData.publicUrl
      }

      const payload = {
        nombre_completo: form.nombre_completo,
        email: form.email,
        telefono: form.telefono,
        rol: form.rol,
        especialidad: form.especialidad,
        activo: form.activo,
        cliente_id: form.rol === 'cliente' ? form.cliente_id || null : null,
        firma_url: firmaUrl
      }

      if (isEdit) {
        const response = await api.patch(`/profiles/${editingId}`, payload, { token })
        const updated = response.data
        setUsuarios(prev => prev.map(u => u.id === editingId ? updated : u))
        await successAlert('¡Usuario Actualizado!', 'Los datos se guardaron correctamente.')
      } else {
        // Create user + profile
        const response = await api.post('/profiles', {
          ...payload,
          password: form.password
        }, { token })
        const created = response.data
        setUsuarios(prev => [created, ...prev])
        await successAlert('¡Usuario Creado!', 'El usuario ha sido registrado en el sistema.')
      }

      setSignatureFile(null)
      closeModal()
      load()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const isConfirmed = await confirmDelete(
      '¿Eliminar usuario?', 
      'Esta acción solo borrará su perfil, no su cuenta de acceso.'
    )
    if (!isConfirmed) return

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      await api.delete(`/profiles/${editingId}`, { token })
      await successAlert('Eliminado', 'El usuario ha sido eliminado correctamente.')
      closeModal()
      load()
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function fetchDotacion(id) {
    setDotacionLoading(true)
    setShowDotacionModal(true)
    try {
      const token = localStorage.getItem('token')
      const res = await api.get(`/profiles/${id}/dotacion`, { token })
      setDotacionHistorial(res.data || [])
    } catch (err) {
      toast.error('Error al cargar dotación')
      setShowDotacionModal(false)
    } finally {
      setDotacionLoading(false)
    }
  }

  const filtered = usuarios.filter(u => {
    const nombre = u.nombre_completo?.toLowerCase() || ''
    const email = u.email?.toLowerCase() || ''
    const searchTerm = search.toLowerCase()
    return (nombre.includes(searchTerm) || email.includes(searchTerm)) &&
           (filtroRol === 'todos' || u.rol === filtroRol)
  })

  const rolIcons = {
    admin: <Shield className="w-4 h-4 text-red-500" />,
    tecnico: <UserCog className="w-4 h-4 text-blue-500" />,
    cliente: <UsersIcon className="w-4 h-4 text-purple-500" />,
  }

  const rolColors = {
    admin: 'bg-red-100 text-red-800',
    tecnico: 'bg-blue-100 text-blue-800',
    cliente: 'bg-purple-100 text-purple-800',
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  return (
    <>
      <Modal 
        isOpen={showModal} 
        onClose={closeModal} 
        title={isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
        maxWidth="max-w-2xl"
      >
        {modalLoading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-field">Nombre completo *</label>
              <input className="input-field" value={form.nombre_completo} onChange={e => handleChange('nombre_completo', e.target.value)} placeholder="Nombre del usuario" />
            </div>

            <div className={`grid grid-cols-1 ${!isEdit ? 'sm:grid-cols-2' : ''} gap-5`}>
              <div>
                <label className="label-field">Email *</label>
                <input 
                  className="input-field" 
                  type="email" 
                  value={form.email} 
                  onChange={e => handleChange('email', e.target.value)} 
                  placeholder="correo@ejemplo.com"
                  required
                />
                {isEdit && (
                  <p className="text-[10px] text-dark-400 mt-1">Nota: Cambiar el correo aquí no afecta las credenciales de acceso.</p>
                )}
              </div>
              {!isEdit && (
                <div>
                  <label className="label-field">Contraseña *</label>
                  <input className="input-field" type="password" value={form.password} onChange={e => handleChange('password', e.target.value)} placeholder="Mínimo 6 caracteres" required />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label-field">Teléfono</label>
                <input className="input-field" value={form.telefono || ''} onChange={e => handleChange('telefono', e.target.value)} placeholder="Número de teléfono" />
              </div>
              <div>
                <label className="label-field">Rol *</label>
                <select className="input-field" value={form.rol} onChange={e => handleChange('rol', e.target.value)} disabled={isEdit && profile?.id === editingId}>
                  <option value="admin">Administrador</option>
                  <option value="tecnico">Técnico</option>
                  <option value="cliente">Cliente</option>
                </select>
              </div>
            </div>

            {form.rol === 'tecnico' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="label-field">Especialidad</label>
                  <input className="input-field" value={form.especialidad || ''} onChange={e => handleChange('especialidad', e.target.value)} placeholder="Ej: Fumigación..." />
                </div>
                <div>
                  <label className="label-field">Firma Digital (Técnico)</label>
                  <div className="flex items-center gap-3">
                    {form.firma_url && !signatureFile && (
                      <img src={getAuthImageUrl(form.firma_url)} alt="Firma" className="w-12 h-12 rounded border bg-white object-contain" />
                    )}
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-dark-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all">
                      <Upload className="w-4 h-4 text-dark-400" />
                      <span className="text-xs text-dark-500 overflow-hidden text-ellipsis whitespace-nowrap">
                        {signatureFile ? signatureFile.name : 'Subir firma JPG/PNG'}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => setSignatureFile(e.target.files[0])} />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {form.rol === 'cliente' && (
              <div>
                <label className="label-field">Vincular a cliente</label>
                <select className="input-field" value={form.cliente_id || ''} onChange={e => handleChange('cliente_id', e.target.value)}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <p className="text-xs text-dark-400 mt-1">Vincula este usuario con un registro de cliente para que vea sus servicios en el portal</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.activo} onChange={e => handleChange('activo', e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-dark-300 peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
              <span className="text-sm font-medium text-dark-700">Usuario activo</span>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-dark-100">
              <button type="submit" disabled={saving} className="btn-primary flex-1 min-w-[150px]">
                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><Save className="w-5 h-5" /> {isEdit ? 'Guardar Cambios' : 'Crear Usuario'}</>}
              </button>

              {isEdit && form.rol === 'tecnico' && (
                <button 
                  type="button" 
                  onClick={() => fetchDotacion(editingId)}
                  className="btn-secondary text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200"
                >
                  <Shield className="w-4 h-4" /> Historial Dotación
                </button>
              )}

              {isEdit && (
                <button 
                  type="button" 
                  onClick={handleDelete}
                  disabled={saving}
                  className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              )}

              <button type="button" onClick={closeModal} className="btn-secondary text-center">Cancelar</button>
            </div>
          </form>
        )}
      </Modal>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">Gestión de Usuarios</h1>
              <HelpButton title="Gestión de Usuarios" content={HELP_CONTENT.usuarios} />
            </div>
            <p className="page-subtitle">{usuarios.length} usuarios registrados</p>
          </div>
          <button onClick={() => openModal()} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-10" placeholder="Buscar por nombre..."
            />
          </div>
          <div className="flex gap-2">
            {['todos', 'admin', 'tecnico', 'cliente'].map(rol => (
              <button
                key={rol} onClick={() => setFiltroRol(rol)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  filtroRol === rol ? 'bg-primary-600 text-white' : 'bg-white border border-dark-200 text-dark-600 hover:bg-dark-50'
                }`}
              >
                {rol === 'todos' ? 'Todos' : rol.charAt(0).toUpperCase() + rol.slice(1) + 's'}
              </button>
            ))}
          </div>
        </div>

        {/* Users List */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-4 py-3">Usuario</th>
                  <th className="text-left px-4 py-3">Rol</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Especialidad</th>
                  <th className="text-center px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {filtered.map(u => (
                  <tr key={u.id} onClick={() => openModal(u.id)} className="hover:bg-dark-50 transition-colors cursor-pointer group">
                    <td className="px-4 py-3">
                      <span className="font-medium text-dark-900 group-hover:text-primary-600 transition-colors">
                        {u.nombre_completo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${rolColors[u.rol]} flex items-center gap-1 w-fit px-2 py-1 rounded-lg text-xs`}>
                        {rolIcons[u.rol]} {u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-500 hidden sm:table-cell">{u.telefono || '—'}</td>
                    <td className="px-4 py-3 text-sm text-dark-500 hidden md:table-cell">{u.especialidad || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {u.activo ? (
                        <span className="inline-flex items-center justify-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md"><UserCheck className="w-3.5 h-3.5" /> Activo</span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-md"><UserX className="w-3.5 h-3.5" /> Inactivo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="text-center text-dark-400 py-8 text-sm">No se encontraron usuarios</p>}
        </div>
      </div>

      {/* ── Modal: Historial de Dotación ── */}
      {showDotacionModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full sm:rounded-2xl max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-dark-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-dark-900">Historial de Dotación</h2>
                  <p className="text-xs text-dark-500">Técnico: {form.nombre_completo}</p>
                </div>
              </div>
              <button onClick={() => setShowDotacionModal(false)} className="p-2 text-dark-400 hover:text-dark-600 bg-dark-50 hover:bg-dark-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-dark-50/30">
              {dotacionLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : dotacionHistorial.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-dark-200">
                  <Package className="w-12 h-12 text-dark-200 mx-auto mb-3" />
                  <p className="text-dark-500 font-medium">Sin registros</p>
                  <p className="text-sm text-dark-400 mt-1">Este técnico no tiene historial de dotación.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dotacionHistorial.map(d => (
                    <div key={d.id} className="bg-white p-4 rounded-xl shadow-sm border border-dark-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-dark-900 text-sm flex items-center gap-2">
                            {d.nombre_comercial}
                            <span className="text-[10px] font-bold bg-dark-100 text-dark-600 px-2 py-0.5 rounded-full uppercase">
                              {d.categoria}
                            </span>
                          </h4>
                          <p className="text-xs text-dark-500 mt-1">
                            {new Date(d.created_at).toLocaleDateString('es-ES', { 
                              year: 'numeric', month: 'short', day: 'numeric', 
                              hour: '2-digit', minute: '2-digit' 
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-sm border border-emerald-100">
                            {parseFloat(d.cantidad).toLocaleString()} {d.unidad_base}
                          </span>
                        </div>
                      </div>
                      
                      {(d.notas || d.asignado_por) && (
                        <div className="mt-3 pt-3 border-t border-dark-50 flex flex-col gap-1">
                          {d.notas && (
                            <p className="text-xs text-dark-600">
                              <span className="font-semibold text-dark-800">Notas:</span> {d.notas}
                            </p>
                          )}
                          {d.asignado_por && (
                            <p className="text-[11px] text-dark-400 mt-1">
                              Asignado por: {d.asignado_por}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
