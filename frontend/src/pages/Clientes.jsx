import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Building2, Home, Phone, Mail, ChevronRight, X, Save, Loader2, UserPlus, Trash2 } from 'lucide-react'
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
      // Limpiar el estado para no reabrir si se recarga
      window.history.replaceState({}, document.title)
    }
  }, [location])

  async function loadClientes() {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .order('nombre')
      if (error) throw error
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
        const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single()
        if (error) throw error
        setForm(data)
        
        // Check if has user
        const { data: linkedUser } = await supabase.from('profiles').select('id').eq('cliente_id', id).maybeSingle()
        setTieneUsuario(!!linkedUser)
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

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      if (isEdit) {
        const { data: updatedCliente, error } = await supabase.from('clientes').update({
          nombre: form.nombre, razon_social: form.razon_social, identificacion: form.identificacion,
          direccion: form.direccion, telefono: form.telefono, email: form.email,
          nombre_contacto: form.nombre_contacto, telefono_contacto: form.telefono_contacto,
          tipo: form.tipo, notas: form.notas, updated_at: new Date().toISOString()
        }).eq('id', editingId).select().single()
        if (error) throw error
        setClientes(prev => prev.map(c => c.id === editingId ? updatedCliente : c))

        if (crearUsuario && !tieneUsuario && form.email && userPassword) {
          const tempSupabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
            { auth: { persistSession: false } }
          )
          const { data: authData, error: authError } = await tempSupabase.auth.signUp({
            email: form.email, password: userPassword,
            options: { data: { nombre_completo: form.nombre, rol: 'cliente' } }
          })
          if (authError) toast.error('Cliente actualizado, error al crear usuario: ' + authError.message)
          else if (authData.user) {
            await supabase.from('profiles').update({
              rol: 'cliente', cliente_id: editingId, activo: true
            }).eq('id', authData.user.id)
            await successAlert('¡Cliente Actualizado!', 'Se actualizó el cliente y se creó su cuenta de acceso.')
          }
        } else {
          await successAlert('¡Cliente Actualizado!', 'Los datos del cliente se actualizaron correctamente.')
        }
      } else {
        const { data: newCliente, error } = await supabase.from('clientes').insert([{
          nombre: form.nombre, razon_social: form.razon_social, identificacion: form.identificacion,
          direccion: form.direccion, telefono: form.telefono, email: form.email,
          nombre_contacto: form.nombre_contacto, telefono_contacto: form.telefono_contacto,
          tipo: form.tipo, notas: form.notas, 
          activo: true
        }]).select().single()
        if (error) throw error
        setClientes(prev => [newCliente, ...prev])

        if (crearUsuario && form.email && userPassword) {
          const tempSupabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
            { auth: { persistSession: false } }
          )
          const { data: authData, error: authError } = await tempSupabase.auth.signUp({
            email: form.email, password: userPassword,
            options: { data: { nombre_completo: form.nombre, rol: 'cliente' } }
          })
          if (authError) toast.error('Cliente creado, pero error al crear usuario: ' + authError.message)
          else if (authData.user) {
            await supabase.from('profiles').update({
              rol: 'cliente', cliente_id: newCliente.id, activo: true
            }).eq('id', authData.user.id)
            await successAlert('¡Cliente Creado!', 'Se creó el cliente y su cuenta de acceso exitosamente.')
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
      const { error } = await supabase.from('clientes').delete().eq('id', editingId)
      if (error) throw error
      await successAlert('Eliminado', 'Cliente eliminado.')
      closeModal()
      loadClientes()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
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
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  return (
    <>
      {/* -- Form Modal -- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-[fadeInUp_0.2s_ease-out]">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-dark-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-dark-900">{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-dark-100 rounded-xl transition-colors text-dark-400 hover:text-dark-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalLoading ? (
              <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Nombre / Empresa *</label>
                    <input className="input-field" value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Ej: Juan Pérez" />
                  </div>
                  <div>
                    <label className="label-field">Razón Social</label>
                    <input className="input-field" value={form.razon_social || ''} onChange={e => handleChange('razon_social', e.target.value)} placeholder="Hotel Central" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Identificación / NIT</label>
                    <input className="input-field" value={form.identificacion || ''} onChange={e => handleChange('identificacion', e.target.value)} placeholder="Cédula o NIT" />
                  </div>
                  <div>
                    <label className="label-field">Dirección</label>
                    <input className="input-field" value={form.direccion || ''} onChange={e => handleChange('direccion', e.target.value)} placeholder="Dirección completa" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Teléfono Principal</label>
                    <input className="input-field" value={form.telefono || ''} onChange={e => handleChange('telefono', e.target.value)} placeholder="Número de contacto" />
                  </div>
                  <div>
                    <label className="label-field">Correo Electrónico</label>
                    <input className="input-field" type="email" value={form.email || ''} onChange={e => handleChange('email', e.target.value)} placeholder="correo@ejemplo.com" />
                  </div>
                </div>

                <div className="bg-dark-50 p-4 rounded-xl border border-dark-100 mt-2">
                  <h3 className="text-xs font-bold text-dark-500 uppercase tracking-wider mb-4">Contacto en Sitio</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label-field !text-dark-600">Nombre de Contacto</label>
                      <input className="input-field bg-white" value={form.nombre_contacto || ''} onChange={e => handleChange('nombre_contacto', e.target.value)} placeholder="Persona que recibe el servicio" />
                    </div>
                    <div>
                      <label className="label-field !text-dark-600">Teléfono de Contacto</label>
                      <input className="input-field bg-white" value={form.telefono_contacto || ''} onChange={e => handleChange('telefono_contacto', e.target.value)} placeholder="Teléfono del contacto" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label-field">Tipo de cliente</label>
                  <div className="flex gap-2">
                    {['residencial', 'comercial', 'industrial'].map(tipo => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => handleChange('tipo', tipo)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          form.tipo === tipo
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-dark-100 text-dark-400 hover:border-dark-200'
                        }`}
                      >
                        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {(!isEdit || (isEdit && !tieneUsuario)) ? (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mt-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-bold text-blue-800">¿Crear cuenta de acceso al portal?</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={crearUsuario} onChange={e => setCrearUsuario(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-dark-300 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    {crearUsuario && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-blue-200">
                        <div>
                          <label className="label-field !text-blue-700">Email de acceso</label>
                          <input 
                            className="input-field bg-white" type="email" value={form.email || ''} 
                            onChange={e => handleChange('email', e.target.value)} placeholder="correo@ejemplo.com" required 
                          />
                          <p className="text-[10px] text-blue-500 mt-1">Se usa el mismo email del cliente</p>
                        </div>
                        <div>
                          <label className="label-field !text-blue-700">Contraseña</label>
                          <input 
                            className="input-field bg-white" type="password" value={userPassword} 
                            onChange={e => setUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : isEdit && tieneUsuario ? (
                  <div className="bg-green-50 p-4 rounded-xl border border-green-200 mt-2 flex items-center gap-3">
                    <UserPlus className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Este cliente ya tiene una cuenta de acceso al portal.</span>
                  </div>
                ) : null}

                <div>
                  <label className="label-field">Notas</label>
                  <textarea className="input-field" rows={3} value={form.notas || ''} onChange={e => handleChange('notas', e.target.value)} placeholder="Notas adicionales..." />
                </div>
                
                <div className="flex flex-wrap gap-3 pt-2">
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

      {/* -- Page -- */}
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
            {['todos', 'residencial', 'comercial', 'industrial'].map(tipo => (
              <button
                key={tipo} onClick={() => setFiltroTipo(tipo)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  filtroTipo === tipo ? 'bg-primary-600 text-white' : 'bg-white border border-dark-200 text-dark-600 hover:bg-dark-50'
                }`}
              >
                {tipo === 'todos' ? 'Todos' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Client Cards */}
        {filtered.length === 0 ? (
          <div className="card text-center py-12">
            <Building2 className="w-12 h-12 text-dark-300 mx-auto mb-3" />
            <p className="text-dark-500">No se encontraron clientes</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(cliente => (
              <div
                key={cliente.id}
                onClick={() => openModal(cliente.id)}
                className="card-hover group cursor-pointer border border-transparent hover:border-primary-200 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      cliente.tipo === 'industrial' ? 'bg-orange-100' : 'bg-purple-100'
                    }`}>
                      {cliente.tipo === 'industrial'
                        ? <Building2 className="w-5 h-5 text-orange-600" />
                        : <Home className="w-5 h-5 text-purple-600" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-dark-900 group-hover:text-primary-700 transition-colors truncate pr-2">
                        {cliente.nombre}
                      </h3>
                      <span className={cliente.tipo === 'industrial' ? 'badge-industrial' : 'badge-residencial'}>
                        {cliente.tipo}
                      </span>
                    </div>
                  </div>
                </div>
                {cliente.direccion && (
                  <p className="text-sm text-dark-500 mb-3 truncate">{cliente.direccion}</p>
                )}
                <div className="flex flex-col gap-1 text-xs text-dark-400 mt-auto">
                  {cliente.telefono && (
                    <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{cliente.telefono}</span></span>
                  )}
                  {cliente.email && (
                    <span className="flex items-center gap-2 mt-1"><Mail className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{cliente.email}</span></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
