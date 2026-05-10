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
  const { isAdmin } = useAuth()
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
      <div className="flex flex-col items-center justify-center min-h-[400px] animate-in fade-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-primary-200 rounded-full blur-xl animate-pulse opacity-50"></div>
          <Building2 className="w-12 h-12 text-primary-600 relative z-10 animate-bounce" style={{ animationDuration: '2s' }} />
        </div>
        <h3 className="mt-6 text-lg font-semibold text-dark-900 tracking-tight">Cargando directorio...</h3>
        <p className="text-sm text-dark-400 mt-1">Conectando de forma segura</p>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary-50/50 to-transparent -z-10 pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 mt-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl shadow-lg shadow-primary-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/10">
              {clientes.length} Registrados
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-dark-900">Directorio de Clientes</h1>
          <p className="text-sm text-dark-500">Administra la base de datos de empresas y residencias.</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => openModal()} 
            className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 ease-in-out bg-dark-900 border border-transparent rounded-full shadow-md hover:bg-dark-800 hover:shadow-xl hover:shadow-dark-900/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dark-900"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" /> 
            Nuevo Cliente
          </button>
        )}
      </div>

      {/* Filters & Search - Glassmorphism */}
      <div className="mb-8 p-1.5 bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm rounded-2xl flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/50 hover:bg-white focus:bg-white border-transparent focus:border-primary-300 focus:ring-2 focus:ring-primary-100 rounded-xl pl-11 pr-4 py-3 text-sm transition-all shadow-sm placeholder:text-dark-300 text-dark-900" 
            placeholder="Buscar por nombre, empresa o dirección..."
          />
        </div>
        <div className="flex gap-1 p-1 bg-dark-50/50 rounded-xl overflow-x-auto no-scrollbar">
          {['todos', 'residencial', 'industrial', 'comercial'].map(tipo => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize whitespace-nowrap transition-all duration-200 ${
                filtroTipo === tipo 
                  ? 'bg-white text-primary-700 shadow-sm ring-1 ring-black/5' 
                  : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100/50'
              }`}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-dark-100 shadow-xl shadow-dark-200/20 overflow-hidden transition-all duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark-50/50 border-b border-dark-100">
                <th className="px-6 py-4 text-[11px] font-bold tracking-wider uppercase text-dark-400">Identificación & Cliente</th>
                <th className="px-6 py-4 text-[11px] font-bold tracking-wider uppercase text-dark-400 hidden md:table-cell">Contacto</th>
                <th className="px-6 py-4 text-[11px] font-bold tracking-wider uppercase text-dark-400 hidden lg:table-cell">Dirección</th>
                <th className="px-6 py-4 text-[11px] font-bold tracking-wider uppercase text-dark-400 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100/60">
              {filtered.map(c => (
                <tr 
                  key={c.id} 
                  className={`group transition-colors duration-200 ${isAdmin ? 'cursor-pointer hover:bg-primary-50/30' : ''}`}
                  onClick={() => isAdmin && openModal(c.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-dark-50 to-dark-100 border border-dark-200/50 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all duration-300">
                          {c.tipo === 'residencial' ? <Home className="w-5 h-5 text-dark-600" /> : <Building2 className="w-5 h-5 text-dark-600" />}
                        </div>
                        {c.activo && <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-dark-900 group-hover:text-primary-700 transition-colors">{c.nombre}</p>
                        <p className="text-xs font-medium text-dark-400 mt-0.5">{c.identificacion || c.tipo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-dark-600">
                        <Phone className="w-3.5 h-3.5 text-dark-400" />
                        <span>{c.telefono || c.telefono_contacto || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-dark-600">
                        <Mail className="w-3.5 h-3.5 text-dark-400" />
                        <span className="truncate max-w-[180px]">{c.email || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <span className="text-sm text-dark-600 max-w-xs truncate block">{c.direccion || '—'}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {c.activo ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                        <UserCheck className="w-3.5 h-3.5" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-dark-50 text-dark-600 ring-1 ring-inset ring-dark-500/20">
                        <UserX className="w-3.5 h-3.5" /> Inactivo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filtered.length === 0 && (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-dark-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-dark-100 shadow-sm">
              <Search className="w-8 h-8 text-dark-300" />
            </div>
            <h3 className="text-base font-bold text-dark-900 mb-1">Ningún cliente encontrado</h3>
            <p className="text-sm text-dark-500">Prueba ajustando los filtros de búsqueda o cambia la categoría.</p>
          </div>
        )}
      </div>

      {/* Modal Premium */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-dark-900/30 backdrop-blur-sm transition-opacity" onClick={closeModal} />
          
          <div className="relative bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-white/40 ring-1 ring-dark-900/5">
            {/* Header Modal */}
            <div className="shrink-0 px-8 py-6 border-b border-dark-100/50 bg-white/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200/50 flex items-center justify-center shadow-sm">
                  <Building2 className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-dark-900 tracking-tight">{isEdit ? 'Editar Perfil del Cliente' : 'Registrar Nuevo Cliente'}</h2>
                  <p className="text-xs font-medium text-dark-400 mt-0.5">Completa los datos de la cuenta empresarial o residencial.</p>
                </div>
              </div>
              <button 
                onClick={closeModal} 
                className="p-2.5 hover:bg-dark-100 rounded-full transition-colors text-dark-400 hover:text-dark-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalLoading ? (
              <div className="flex flex-col justify-center items-center py-24 bg-white/50">
                <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
                <p className="text-sm text-dark-500 font-medium animate-pulse">Cargando expediente...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 bg-white/40 custom-scrollbar">
                
                {/* Section 1: Info Principal */}
                <div className="space-y-5">
                  <h3 className="text-xs font-bold text-dark-400 uppercase tracking-widest border-b border-dark-100 pb-2">Información Principal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-dark-700">Nombre del Cliente *</label>
                      <input 
                        className="w-full bg-white border border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm placeholder:text-dark-300" 
                        value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Ej: Industrias Acme" required 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-dark-700">Razón Social</label>
                      <input 
                        className="w-full bg-white border border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm placeholder:text-dark-300" 
                        value={form.razon_social} onChange={e => handleChange('razon_social', e.target.value)} placeholder="Razón legal si aplica" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-dark-700">Identificación (NIT/RUC)</label>
                      <input 
                        className="w-full bg-white border border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm placeholder:text-dark-300" 
                        value={form.identificacion} onChange={e => handleChange('identificacion', e.target.value)} placeholder="Número de documento" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-dark-700">Tipo de Cliente</label>
                      <select 
                        className="w-full bg-white border border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm" 
                        value={form.tipo} onChange={e => handleChange('tipo', e.target.value)}
                      >
                        <option value="residencial">Residencial</option>
                        <option value="industrial">Industrial</option>
                        <option value="comercial">Comercial</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Contacto */}
                <div className="space-y-5">
                  <h3 className="text-xs font-bold text-dark-400 uppercase tracking-widest border-b border-dark-100 pb-2">Información de Contacto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-dark-700">Correo Electrónico</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                        <input 
                          type="email" 
                          className="w-full bg-white border border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl pl-10 pr-4 py-2.5 text-sm transition-all shadow-sm placeholder:text-dark-300" 
                          value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="correo@ejemplo.com" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-dark-700">Teléfono Principal</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                        <input 
                          className="w-full bg-white border border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl pl-10 pr-4 py-2.5 text-sm transition-all shadow-sm placeholder:text-dark-300" 
                          value={form.telefono} onChange={e => handleChange('telefono', e.target.value)} placeholder="+57 300 123 4567" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-700">Dirección Física</label>
                    <input 
                      className="w-full bg-white border border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm placeholder:text-dark-300" 
                      value={form.direccion} onChange={e => handleChange('direccion', e.target.value)} placeholder="Calle Principal #123, Ciudad" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-dark-50/50 p-5 rounded-2xl border border-dark-100">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-dark-700">Nombre del Contacto</label>
                      <input 
                        className="w-full bg-white border border-dark-200 focus:border-dark-400 focus:ring-2 focus:ring-dark-100 rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm placeholder:text-dark-300" 
                        value={form.nombre_contacto} onChange={e => handleChange('nombre_contacto', e.target.value)} placeholder="Ej: María Pérez" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-dark-700">Teléfono del Contacto</label>
                      <input 
                        className="w-full bg-white border border-dark-200 focus:border-dark-400 focus:ring-2 focus:ring-dark-100 rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm placeholder:text-dark-300" 
                        value={form.telefono_contacto} onChange={e => handleChange('telefono_contacto', e.target.value)} placeholder="Número directo" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-dark-700">Notas Adicionales</label>
                  <textarea 
                    className="w-full bg-white border border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl px-4 py-3 text-sm transition-all shadow-sm placeholder:text-dark-300 custom-scrollbar" 
                    rows={3} value={form.notas} onChange={e => handleChange('notas', e.target.value)} placeholder="Observaciones, horarios preferidos, requerimientos de acceso..." 
                  />
                </div>

                {/* Acceso de Usuario */}
                {isAdmin && (
                  <div className="pt-4 border-t border-dark-100">
                    {tieneUsuario ? (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100/50 flex items-start sm:items-center gap-4">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full shrink-0">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-dark-900">Acceso al portal activo</p>
                          <p className="text-xs font-medium text-dark-500 mt-0.5">Este cliente ya posee credenciales vinculadas a su correo electrónico.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-dark-50/50 p-5 rounded-2xl border border-dark-100">
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setCrearUsuario(!crearUsuario)}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl transition-colors ${crearUsuario ? 'bg-primary-100 text-primary-600' : 'bg-dark-100 text-dark-400'}`}>
                              <UserPlus className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-dark-900">Crear cuenta de acceso</p>
                              <p className="text-xs font-medium text-dark-500">Permitir al cliente ingresar al portal de servicios.</p>
                            </div>
                          </div>
                          <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${crearUsuario ? 'bg-primary-600' : 'bg-dark-300'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${crearUsuario ? 'translate-x-6' : 'translate-x-1'}`} />
                          </div>
                        </div>

                        {crearUsuario && (
                          <div className="mt-5 pt-5 border-t border-dark-200/50 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-dark-700">Contraseña Temporal</label>
                              <input 
                                type="password" 
                                className="w-full bg-white border border-dark-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm" 
                                value={userPassword} onChange={e => setUserPassword(e.target.value)} placeholder="Ingresa al menos 6 caracteres" required={crearUsuario} 
                              />
                              <p className="text-[11px] text-dark-400 mt-1 font-medium flex items-center gap-1">
                                <Mail className="w-3 h-3" /> El email <span className="font-bold text-dark-700">{form.email || '(sin especificar)'}</span> será su usuario.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Modal */}
                <div className="sticky bottom-0 -mx-8 -mb-8 mt-8 px-8 py-5 bg-white/80 backdrop-blur-md border-t border-dark-100 flex flex-wrap-reverse sm:flex-nowrap items-center justify-end gap-3 z-10">
                  {isEdit && (
                    <button 
                      type="button" 
                      onClick={handleDelete} 
                      disabled={saving} 
                      className="w-full sm:w-auto mr-auto px-5 py-2.5 text-sm font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-transparent rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={closeModal} 
                    className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-dark-700 hover:text-dark-900 bg-white hover:bg-dark-50 border border-dark-200 rounded-xl shadow-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="w-full sm:w-auto min-w-[160px] px-8 py-2.5 text-sm font-bold text-white bg-dark-900 hover:bg-dark-800 hover:shadow-lg hover:shadow-dark-900/20 border border-transparent rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                    ) : (
                      <><Save className="w-4 h-4" /> {isEdit ? 'Guardar Cambios' : 'Registrar Cliente'}</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
