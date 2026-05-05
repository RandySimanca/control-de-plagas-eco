import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, Search, Shield, UserCog, Users as UsersIcon, UserCheck, UserX, X, Save, Loader2, Upload, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { confirmDelete, successAlert } from '../../lib/alerts'

const EMPTY_FORM = {
  nombre_completo: '', email: '', password: '', telefono: '',
  rol: 'tecnico', especialidad: '', activo: true, cliente_id: '',
  firma_url: ''
}

export default function Usuarios() {
  const { profile, isSuperadmin } = useAuth()
  const location = useLocation()
  const [usuarios, setUsuarios] = useState([])
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
  const [clientes, setClientes] = useState([])
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => { 
    load() 
    if (location.state?.openModal) {
      openModal()
      window.history.replaceState({}, document.title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  async function load() {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('nombre_completo')
      if (error) throw error
      setUsuarios(data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadClientes() {
    if (clientes.length === 0) {
      const { data } = await supabase.from('clientes').select('id, nombre').eq('activo', true).order('nombre')
      setClientes(data || [])
    }
  }

  async function openModal(id = null) {
    setEditingId(id)
    setForm({ ...EMPTY_FORM, rol: isSuperadmin ? 'superadmin' : 'tecnico' })
    setSignatureFile(null)
    loadClientes()
    setShowModal(true)

    if (id) {
      setModalLoading(true)
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
        if (error) throw error
        
        if (!isSuperadmin && data.rol?.toLowerCase() === 'superadmin') {
          throw new Error('No tienes permisos para ver o editar este usuario')
        }
        
        setForm({ ...data, password: '' })
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

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre_completo.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)

    try {
      let firmaUrl = form.firma_url
      
      if (isEdit) {
        if (signatureFile) {
          const path = `perfiles/firma_${editingId}_${Date.now()}`
          const { error: upErr } = await supabase.storage.from('documentos').upload(path, signatureFile)
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path)
            firmaUrl = urlData.publicUrl
          }
        }

        const { data: updatedUser, error } = await supabase.from('profiles').update({
          nombre_completo: form.nombre_completo, 
          email: form.email,
          telefono: form.telefono,
          rol: form.rol, 
          especialidad: form.especialidad, 
          firma_url: firmaUrl,
          activo: form.activo,
          cliente_id: form.rol === 'cliente' ? form.cliente_id || null : null,
          updated_at: new Date().toISOString()
        }).eq('id', editingId).select().single()
        if (error) throw error
        setUsuarios(prev => prev.map(u => u.id === editingId ? updatedUser : u))
        await successAlert('¡Usuario Actualizado!', 'Los datos se guardaron correctamente.')
      } else {
        const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { nombre_completo: form.nombre_completo, rol: form.rol }
          }
        })
        if (authError) throw authError

        if (authData.user) {
          // Si es técnico y hay firma, subirla ahora
          if (signatureFile) {
            const path = `perfiles/firma_${authData.user.id}_${Date.now()}`
            const { error: upErr } = await supabase.storage.from('documentos').upload(path, signatureFile)
            if (!upErr) {
              const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path)
              firmaUrl = urlData.publicUrl
            }
          }

          const { data: newUser, error: profileError } = await supabase.from('profiles').update({
            telefono: form.telefono,
            especialidad: form.especialidad,
            activo: form.activo,
            firma_url: firmaUrl,
            cliente_id: form.rol === 'cliente' ? form.cliente_id || null : null,
          }).eq('id', authData.user.id).select().single()
          if (profileError) throw profileError
          if (newUser) setUsuarios(prev => [newUser, ...prev])
        }
        await successAlert('¡Usuario Creado!', 'El usuario ha sido registrado en el sistema.')
      }
      setSignatureFile(null)
      closeModal()
      load() // recargar lista
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const isConfirmed = await confirmDelete(
      '¿Eliminar usuario?', 
      'Esta acción solo borrará su perfil, no su cuenta de acceso de Supabase.'
    )
    if (!isConfirmed) return

    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', editingId)
      if (error) throw error
      await successAlert('Eliminado', 'El usuario ha sido eliminado correctamente.')
      closeModal()
      load()
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const baseUsuarios = usuarios.filter(u => {
    // Hide superadmin from non-superadmins
    if (!isSuperadmin && u.rol?.toLowerCase() === 'superadmin') return false
    // Hide non-superadmins from superadmins
    if (isSuperadmin && u.rol?.toLowerCase() !== 'superadmin') return false
    return true
  })

  const filtered = baseUsuarios.filter(u => {
    const nombre = u.nombre_completo?.toLowerCase() || ''
    const email = u.email?.toLowerCase() || ''
    const searchTerm = search.toLowerCase()
    return (nombre.includes(searchTerm) || email.includes(searchTerm)) &&
           (filtroRol === 'todos' || u.rol === filtroRol)
  })

  const rolIcons = {
    superadmin: <Shield className="w-4 h-4 text-emerald-500" />,
    admin: <Shield className="w-4 h-4 text-red-500" />,
    tecnico: <UserCog className="w-4 h-4 text-blue-500" />,
    cliente: <UsersIcon className="w-4 h-4 text-purple-500" />,
  }

  const rolColors = {
    superadmin: 'bg-emerald-100 text-emerald-800',
    admin: 'bg-red-100 text-red-800',
    tecnico: 'bg-blue-100 text-blue-800',
    cliente: 'bg-purple-100 text-purple-800',
  }

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
              <h2 className="text-lg font-bold text-dark-900">{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-dark-100 rounded-xl transition-colors text-dark-400 hover:text-dark-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalLoading ? (
              <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
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
                    />
                    {isEdit && (
                      <p className="text-[10px] text-dark-400 mt-1">Nota: Cambiar el correo aquí no afecta las credenciales de acceso de Supabase.</p>
                    )}
                  </div>
                  {!isEdit && (
                    <div>
                      <label className="label-field">Contraseña *</label>
                      <input className="input-field" type="password" value={form.password} onChange={e => handleChange('password', e.target.value)} placeholder="Mínimo 6 caracteres" />
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
                      {isSuperadmin ? (
                        <option value="superadmin">Super Administrador</option>
                      ) : (
                        <>
                          <option value="admin">Administrador</option>
                          <option value="tecnico">Técnico</option>
                          <option value="cliente">Cliente</option>
                        </>
                      )}
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
                          <img src={form.firma_url} alt="Firma" className="w-12 h-12 rounded border bg-white object-contain" />
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
          </div>
        </div>
      )}

      {/* -- Page -- */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="page-title">Gestión de Usuarios</h1>
            <p className="page-subtitle">{baseUsuarios.length} usuarios registrados</p>
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
            {(isSuperadmin ? ['todos', 'superadmin'] : ['todos', 'admin', 'tecnico', 'cliente']).map(rol => (
              <button
                key={rol} onClick={() => setFiltroRol(rol)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  filtroRol === rol ? 'bg-primary-600 text-white' : 'bg-white border border-dark-200 text-dark-600 hover:bg-dark-50'
                }`}
              >
                {rol === 'todos' ? 'Todos' : rol === 'superadmin' ? 'Superadmin' : rol.charAt(0).toUpperCase() + rol.slice(1) + 's'}
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
                      <span className={`badge ${rolColors[u.rol]} flex items-center gap-1 w-fit`}>
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
    </>
  )
}
