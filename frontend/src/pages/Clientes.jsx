import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { Plus, Search, Building2, Home, Phone, Mail, ChevronRight, X, Save, Loader2, UserPlus, Trash2, UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import { confirmDelete, successAlert } from '../lib/alerts'

const EMPTY_FORM = {
  nombre: '', razon_social: '', identificacion: '',
  direccion: '', telefono: '', email: '',
  nombre_contacto: '', telefono_contacto: '',
  tipo: 'residencial', notas: ''
}

export default function Clientes() {
  const { isAdmin, profile: currentProfile } = useAuth()
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [loading, setLoading] = useState(true)

  // -- Modal State --
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const isEdit = Boolean(editingId)
  
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [crearUsuario, setCrearUsuario] = useState(false)
  const [userPassword, setUserPassword] = useState('')
  const [tieneUsuario, setTieneUsuario] = useState(false)

  const location = useLocation()
  
  useEffect(() => {
    loadClientes()
    if (location.state?.openModal) {
      openModal()
      window.history.replaceState({}, document.title)
    }
  }, [location])

  async function loadClientes() {
    try {
      const token = localStorage.getItem('token')
      const { data } = await api.get('/clientes', { token })
      setClientes(data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function openModal(id = null) {
    setEditingId(id)
    setForm({ ...EMPTY_FORM })
    setCrearUsuario(false)
    setUserPassword('')
    setTieneUsuario(false)
    setShowModal(true)

    if (id) {
      setModalLoading(true)
      try {
        const token = localStorage.getItem('token')
        const { data } = await api.get(`/clientes/${id}`, { token })
        setForm(data)

        // Check if has linked profile
        const { data: profiles } = await api.get('/profiles', { token, params: { cliente_id: id } })
        setTieneUsuario(profiles && profiles.length > 0)
      } catch {
        toast.error('Error cargando cliente')
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
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      const token = localStorage.getItem('token')

      if (isEdit) {
        const { data: updatedCliente } = await api.put(`/clientes/${editingId}`, {
          nombre: form.nombre, razon_social: form.razon_social, identificacion: form.identificacion,
          direccion: form.direccion, telefono: form.telefono, email: form.email,
          nombre_contacto: form.nombre_contacto, telefono_contacto: form.telefono_contacto,
          tipo: form.tipo, notas: form.notas
        }, { token })
        setClientes(prev => prev.map(c => c.id === editingId ? updatedCliente : c))

        if (crearUsuario && !tieneUsuario && form.email && userPassword) {
          // Register new user as cliente
          const { data: authData } = await api.post('/auth/register', {
            email: form.email,
            password: userPassword,
            nombre: form.nombre,
            role: 'cliente'
          }, { token })
          // Link profile to cliente
          if (authData && authData.user) {
            await api.patch(`/profiles/${authData.user.id}`, {
              rol: 'cliente',
              cliente_id: updatedCliente.id,
              activo: true
            }, { token })
            await successAlert('¡Cliente Actualizado!', 'Se actualizó el cliente y se creó su cuenta de acceso.')
          } else {
            await successAlert('¡Cliente Actualizado!', 'Los datos del cliente se actualizaron correctamente.')
          }
        } else {
          await successAlert('¡Cliente Actualizado!', 'Los datos del cliente se actualizaron correctamente.')
        }
      } else {
        const { data: newCliente } = await api.post('/clientes', {
          nombre: form.nombre, razon_social: form.razon_social, identificacion: form.identificacion,
          direccion: form.direccion, telefono: form.telefono, email: form.email,
          nombre_contacto: form.nombre_contacto, telefono_contacto: form.telefono_contacto,
          tipo: form.tipo, notas: form.notas
        }, { token })
        setClientes(prev => [newCliente, ...prev])

        if (crearUsuario && form.email && userPassword) {
          const { data: authData } = await api.post('/auth/register', {
            email: form.email,
            password: userPassword,
            nombre: form.nombre,
            role: 'cliente'
          }, { token })
          if (authData && authData.user) {
            await api.patch(`/profiles/${authData.user.id}`, {
              rol: 'cliente',
              cliente_id: newCliente.id,
              activo: true
            }, { token })
            await successAlert('¡Cliente Creado!', 'Se creó el cliente y su cuenta de acceso exitosamente.')
          } else {
            await successAlert('¡Cliente Creado!', 'El nuevo cliente se ha registrado con éxito.')
          }
        } else {
          await successAlert('¡Cliente Creado!', 'El nuevo cliente se ha registrado con éxito.')
        }
      }
      closeModal()
      loadClientes()
    } catch (err) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const isConfirmed = await confirmDelete(
       '¿Eliminar cliente?', 'Esta acción no se puede deshacer.'
    )
    if (!isConfirmed) return

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      await api.delete(`/clientes/${editingId}`, { token })
      await successAlert('Eliminado', 'Cliente eliminado.')
      closeModal()
      loadClientes()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = clientes.filter(c => {
    const nombre = c.nombre?.toLowerCase() || ''
    const direccion = c.direccion?.toLowerCase() || ''
    const searchTerm = search.toLowerCase()
    const matchSearch = nombre.includes(searchTerm) || direccion.includes(searchTerm)
    const matchTipo = filtroTipo === 'todos' || c.tipo === filtroTipo
    return matchSearch && matchTipo
  })

  if (loading) {
    return (
      <div className="card text-center py-20 animate-pulse">
        <Building2 className="w-16 h-16 text-primary-200 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-dark-400">Cargando clientes...</h3>
        <p className="text-dark-300">Obteniendo base de datos de clientes</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clientes.length} clientes registrados</p>
        </div>
        {isAdmin && (
          <button onClick={() => openModal()} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-10" placeholder="Buscar por nombre o dirección..."
          />
        </div>
        <div className="flex gap-2">
          {['todos', 'residencial', 'industrial', 'comercial'].map(tipo => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                filtroTipo === tipo ? 'bg-primary-600 text-white' : 'bg-white border border-dark-200 text-dark-600 hover:bg-dark-50'
              }`}
            >
              {tipo === 'todos' ? 'Todos' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Contacto</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Dirección</th>
                <th className="text-center px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {filtered.map(c => (
                <tr key={c.id} className={isAdmin ? 'hover:bg-dark-50 cursor-pointer' : ''}
                  onClick={() => isAdmin && openModal(c.id)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-dark-900">{c.nombre}</p>
                        <p className="text-xs text-dark-500">{c.tipo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-500 hidden md:table-cell">
                    {c.telefono || c.email || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-500 hidden lg:table-cell">
                    {c.direccion || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.activo ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md"><UserCheck className="w-3.5 h-3.5" /> Activo</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-md"><UserX className="w-3.5 h-3.5" /> Inactivo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-dark-400 py-8 text-sm">No se encontraron clientes</p>}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-dark-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-dark-900">{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-dark-100 rounded-xl transition-colors text-dark-400 hover:text-dark-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalLoading ? (
              <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="label-field">Nombre del Cliente *</label>
                    <input className="input-field" value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Nombre" required />
                  </div>
                  <div>
                    <label className="label-field">Razón Social</label>
                    <input className="input-field" value={form.razon_social} onChange={e => handleChange('razon_social', e.target.value)} placeholder="Razón social" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="label-field">Identificación</label>
                    <input className="input-field" value={form.identificacion} onChange={e => handleChange('identificacion', e.target.value)} placeholder="NIT / RUC" />
                  </div>
                  <div>
                    <label className="label-field">Tipo</label>
                    <select className="input-field" value={form.tipo} onChange={e => handleChange('tipo', e.target.value)}>
                      <option value="residencial">Residencial</option>
                      <option value="industrial">Industrial</option>
                      <option value="comercial">Comercial</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="label-field">Email</label>
                    <input type="email" className="input-field" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="correo@ejemplo.com" />
                  </div>
                  <div>
                    <label className="label-field">Teléfono</label>
                    <input className="input-field" value={form.telefono} onChange={e => handleChange('telefono', e.target.value)} placeholder="+57 300 123 4567" />
                  </div>
                </div>

                <div>
                  <label className="label-field">Dirección</label>
                  <input className="input-field" value={form.direccion} onChange={e => handleChange('direccion', e.target.value)} placeholder="Dirección física" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="label-field">Nombre Contacto</label>
                    <input className="input-field" value={form.nombre_contacto} onChange={e => handleChange('nombre_contacto', e.target.value)} placeholder="Persona de contacto" />
                  </div>
                  <div>
                    <label className="label-field">Teléfono Contacto</label>
                    <input className="input-field" value={form.telefono_contacto} onChange={e => handleChange('telefono_contacto', e.target.value)} placeholder="Teléfono de contacto" />
                  </div>
                </div>

                <div>
                  <label className="label-field">Notas</label>
                  <textarea className="input-field" rows={3} value={form.notas} onChange={e => handleChange('notas', e.target.value)} placeholder="Observaciones adicionales" />
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={crearUsuario} onChange={e => setCrearUsuario(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-dark-300 peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                    <span className="text-sm font-medium text-dark-700">Crear usuario para el cliente</span>
                  </div>
                )}

                {crearUsuario && (
                  <div>
                    <label className="label-field">Contraseña para el usuario</label>
                    <input type="password" className="input-field" value={userPassword} onChange={e => setUserPassword(e.target.value)} placeholder="Contraseña (mín. 6 caracteres)" required />
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-4 border-t border-dark-100">
                  <button type="submit" disabled={saving} className="btn-primary flex-1 min-w-[150px]">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><Save className="w-5 h-5" /> {isEdit ? 'Guardar Cambios' : 'Crear Cliente'}</>}
                  </button>
                  {isEdit && (
                    <button type="button" onClick={handleDelete} disabled={saving} className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200">
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                  )}
                  <button type="button" onClick={closeModal} className="btn-secondary text-center">Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
