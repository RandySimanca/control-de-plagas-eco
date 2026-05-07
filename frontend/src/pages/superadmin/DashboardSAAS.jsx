import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { Building2, Plus, Users, CalendarIcon, AlertTriangle, X, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { successAlert } from '../../lib/alerts'

const EMPTY_FORM = {
  nombre: '', nit: '', estado_licencia: 'activa', fecha_vencimiento: '',
  admin_nombre: '', admin_email: '', admin_password: ''
}

export default function DashboardSAAS() {
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)

  // -- Modal State --
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const isEdit = Boolean(editingId)
  
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    loadEmpresas()
  }, [])

  async function loadEmpresas() {
    try {
      const { data, error } = await supabase.from('empresas').select('*').order('created_at', { ascending: false })
      if (!error && data) setEmpresas(data)
    } finally {
      setLoading(false)
    }
  }

  async function openModal(id = null) {
    setEditingId(id)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)

    if (id) {
      setModalLoading(true)
      try {
        const { data, error } = await supabase.from('empresas').select('*').eq('id', id).single()
        if (error) throw error
        setForm({ ...data })
      } catch {
        toast.error('Error cargando empresa')
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
        const { error } = await supabase.from('empresas').update({
          nombre: form.nombre, nit: form.nit, estado_licencia: form.estado_licencia,
          fecha_vencimiento: form.fecha_vencimiento || null, updated_at: new Date().toISOString()
        }).eq('id', editingId)
        if (error) throw error
        await successAlert('¡Actualizada!', 'Empresa actualizada correctamente')
      } else {
        if (!form.admin_email || !form.admin_password || !form.admin_nombre) {
          toast.error('Los datos del administrador son requeridos para nuevas empresas')
          setSaving(false)
          return
        }

        const { data: nuevaEmpresa, error: empError } = await supabase.from('empresas').insert({
          nombre: form.nombre, nit: form.nit, estado_licencia: form.estado_licencia,
          fecha_vencimiento: form.fecha_vencimiento || null,
        }).select().single()
        if (empError) throw empError

        const tempSupabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false } }
        )

        const { error: authError } = await tempSupabase.auth.signUp({
          email: form.admin_email, password: form.admin_password,
          options: { data: { nombre_completo: form.admin_nombre, rol: 'admin', empresa_id: nuevaEmpresa.id } }
        })
        
        if (authError) toast.error('Empresa creada, pero falló la creación del admin: ' + authError.message)
        else await successAlert('¡Empresa Creada!', 'Empresa creada exitosamente con su administrador')
      }
      closeModal()
      loadEmpresas()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const activas = empresas.filter(e => e.estado_licencia === 'activa').length
  const vencidas = empresas.filter(e => e.estado_licencia === 'vencida').length

  const renderEstadoBadge = (estado) => {
    switch (estado) {
      case 'activa': return <span className="bg-green-100 text-green-700 font-medium text-xs px-2 py-1 rounded-full">Activa</span>
      case 'suspendida': return <span className="bg-orange-100 text-orange-700 font-medium text-xs px-2 py-1 rounded-full">Suspendida</span>
      case 'vencida': return <span className="bg-red-100 text-red-700 font-medium text-xs px-2 py-1 rounded-full">Vencida</span>
      default: return null
    }
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
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <Building2 className="w-6 h-6 text-primary-600" />
                </div>
                <h2 className="text-lg font-bold text-dark-900">{isEdit ? 'Editar Empresa (Inquilino)' : 'Registrar Nueva Empresa'}</h2>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-dark-100 rounded-xl transition-colors text-dark-400 hover:text-dark-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalLoading ? (
              <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
                <div className="space-y-5">
                  <h3 className="font-semibold text-dark-800 border-b border-dark-100 pb-2">Datos Comerciales</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="label-field">Nombre Comercial *</label>
                      <input className="input-field" value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Ej: PestControl Inc" />
                    </div>
                    <div>
                      <label className="label-field">NIT / Identificación Fiscal</label>
                      <input className="input-field" value={form.nit || ''} onChange={e => handleChange('nit', e.target.value)} placeholder="Número tributario" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="label-field">Estado de la Licencia *</label>
                      <select className="input-field" value={form.estado_licencia} onChange={e => handleChange('estado_licencia', e.target.value)}>
                        <option value="activa">Activa</option>
                        <option value="suspendida">Suspendida</option>
                        <option value="vencida">Vencida</option>
                      </select>
                      <p className="text-xs text-dark-400 mt-1">Suspendida o Vencida cortará el acceso al software para esta empresa.</p>
                    </div>
                    <div>
                      <label className="label-field">Fecha de Vencimiento</label>
                      <input type="date" className="input-field" value={form.fecha_vencimiento || ''} onChange={e => handleChange('fecha_vencimiento', e.target.value)} />
                    </div>
                  </div>
                </div>

                {!isEdit && (
                  <div className="space-y-5 mt-8">
                    <h3 className="font-semibold text-dark-800 border-b border-dark-100 pb-2">Administrador Principal</h3>
                    <p className="text-sm text-dark-500 mb-2">Esta será la cuenta administrativa central asignada a esta nueva empresa.</p>
                    
                    <div>
                      <label className="label-field">Nombre del Admin *</label>
                      <input className="input-field" value={form.admin_nombre} onChange={e => handleChange('admin_nombre', e.target.value)} placeholder="Dueño o gerente" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="label-field">Email de Acceso *</label>
                        <input type="email" className="input-field" value={form.admin_email} onChange={e => handleChange('admin_email', e.target.value)} placeholder="admin@empresa.com" />
                      </div>
                      <div>
                        <label className="label-field">Contraseña *</label>
                        <input type="password" className="input-field" value={form.admin_password} onChange={e => handleChange('admin_password', e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-6 border-t border-dark-100 mt-8">
                  <button type="submit" disabled={saving} className="btn-primary flex-1 min-w-[200px]">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><Save className="w-5 h-5" /> {isEdit ? 'Guardar Cambios' : 'Crear Empresa y Admin'}</>}
                  </button>
                  <button type="button" onClick={closeModal} className="btn-secondary text-center">Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* -- Page -- */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-900">Panel Administrativo</h1>
            <p className="text-dark-500 mt-1">Gestión multitenant de empresas cliente</p>
          </div>
          <button onClick={() => openModal()} className="btn-primary w-full sm:w-auto">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Empresa
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="card bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-indigo-100 font-medium">Total Empresas</p>
                <h3 className="text-3xl font-bold">{empresas.length}</h3>
              </div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-green-100 font-medium">Licencias Activas</p>
                <h3 className="text-3xl font-bold">{activas}</h3>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-red-100 font-medium">Licencias Vencidas</p>
                <h3 className="text-3xl font-bold">{vencidas}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="p-5 border-b border-dark-100">
            <h2 className="text-lg font-bold text-dark-900">Directorio de Empresas</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-dark-50 text-dark-500 border-b border-dark-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Nombe comercial</th>
                  <th className="px-6 py-4 font-medium">NIT</th>
                  <th className="px-6 py-4 font-medium">Licencia</th>
                  <th className="px-6 py-4 font-medium">Vencimiento</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-dark-400">Cardando...</td></tr>
                ) : empresas.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-dark-400">No hay empresas registradas</td></tr>
                ) : (
                  empresas.map(empresa => (
                    <tr key={empresa.id} onClick={() => openModal(empresa.id)} className="hover:bg-dark-50/50 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-dark-100 flex items-center justify-center shrink-0">
                            {empresa.logo_url ? (
                              <img src={empresa.logo_url} alt="Logo" className="w-10 h-10 rounded object-cover" />
                            ) : (
                              <Building2 className="w-5 h-5 text-dark-400" />
                            )}
                          </div>
                          <span className="font-semibold text-dark-900 group-hover:text-primary-600 transition-colors">{empresa.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-dark-600">{empresa.nit || '—'}</td>
                      <td className="px-6 py-4">{renderEstadoBadge(empresa.estado_licencia)}</td>
                      <td className="px-6 py-4 text-dark-600">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-dark-400" />
                          {empresa.fecha_vencimiento ? new Date(empresa.fecha_vencimiento).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openModal(empresa.id); }}
                          className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
