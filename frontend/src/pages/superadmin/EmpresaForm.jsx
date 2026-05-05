import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Save, Loader2, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { successAlert } from '../../lib/alerts'

export default function EmpresaForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    nit: '',
    estado_licencia: 'activa',
    fecha_vencimiento: '',
    // Campos para el administrador inicial (solo creación)
    admin_nombre: '',
    admin_email: '',
    admin_password: '',
  })

  useEffect(() => {
    if (isEdit) loadEmpresa()
  }, [id])

  async function loadEmpresa() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      setForm({ ...data })
    } catch {
      toast.error('Error cargando empresa')
      navigate('/superadmin')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    
    setSaving(true)
    try {
      if (isEdit) {
        const { error } = await supabase.from('empresas').update({
          nombre: form.nombre,
          nit: form.nit,
          estado_licencia: form.estado_licencia,
          fecha_vencimiento: form.fecha_vencimiento || null,
          updated_at: new Date().toISOString()
        }).eq('id', id)
        
        if (error) throw error
        await successAlert('¡Actualizada!', 'Empresa actualizada correctamente')
      } else {
        // Validaciones al crear
        if (!form.admin_email || !form.admin_password || !form.admin_nombre) {
          toast.error('Los datos del administrador son requeridos para nuevas empresas')
          setSaving(false)
          return
        }

        // 1. Insertar la empresa
        const { data: nuevaEmpresa, error: empError } = await supabase.from('empresas').insert({
          nombre: form.nombre,
          nit: form.nit,
          estado_licencia: form.estado_licencia,
          fecha_vencimiento: form.fecha_vencimiento || null,
        }).select().single()
        
        if (empError) throw empError

        // 2. Crear usuario Admin inicial usando cliente temporal (no desloguea al superadmin auth)
        const tempSupabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false } }
        )

        const { error: authError } = await tempSupabase.auth.signUp({
          email: form.admin_email,
          password: form.admin_password,
          options: {
            data: {
              nombre_completo: form.admin_nombre,
              rol: 'admin',
              empresa_id: nuevaEmpresa.id // Trigger handle_new_user lo recogerá
            }
          }
        })
        
        // Si falla el auth, debemos avisar, pero la empresa ya se creó
        if (authError) {
          toast.error('Empresa creada, pero falló la creación del admin: ' + authError.message)
        } else {
          await successAlert('¡Empresa Creada!', 'Empresa creada exitosamente con su administrador')
        }
      }
      navigate('/superadmin')
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <Link to="/superadmin" className="inline-flex items-center gap-2 text-sm text-dark-500 hover:text-dark-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver al Directorio
      </Link>
      
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Building2 className="w-6 h-6 text-primary-600" />
          </div>
          <h1 className="text-xl font-bold text-dark-900">
            {isEdit ? 'Editar Empresa (Inquilino)' : 'Registrar Nueva Empresa'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            <h3 className="font-semibold text-dark-800 border-b border-dark-100 pb-2">Datos Comerciales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label-field">Nombre Comercial *</label>
                <input 
                  className="input-field" 
                  value={form.nombre} 
                  onChange={e => handleChange('nombre', e.target.value)} 
                  placeholder="Ej: PestControl Inc" 
                />
              </div>
              <div>
                <label className="label-field">NIT / Identificación Fiscal</label>
                <input 
                  className="input-field" 
                  value={form.nit || ''} 
                  onChange={e => handleChange('nit', e.target.value)} 
                  placeholder="Número tributario" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label-field">Estado de la Licencia *</label>
                <select 
                  className="input-field" 
                  value={form.estado_licencia} 
                  onChange={e => handleChange('estado_licencia', e.target.value)}
                >
                  <option value="activa">Activa</option>
                  <option value="suspendida">Suspendida</option>
                  <option value="vencida">Vencida</option>
                </select>
                <p className="text-xs text-dark-400 mt-1">Suspendida o Vencida cortará el acceso al software para esta empresa.</p>
              </div>
              <div>
                <label className="label-field">Fecha de Vencimiento</label>
                <input 
                  type="date"
                  className="input-field" 
                  value={form.fecha_vencimiento || ''} 
                  onChange={e => handleChange('fecha_vencimiento', e.target.value)} 
                />
              </div>
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-5 mt-8">
              <h3 className="font-semibold text-dark-800 border-b border-dark-100 pb-2">Administrador Principal</h3>
              <p className="text-sm text-dark-500 mb-4">Esta será la cuenta administrativa central asignada a esta nueva empresa.</p>
              
              <div>
                <label className="label-field">Nombre del Admin *</label>
                <input 
                  className="input-field" 
                  value={form.admin_nombre} 
                  onChange={e => handleChange('admin_nombre', e.target.value)} 
                  placeholder="Dueño o gerente" 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="label-field">Email de Acceso *</label>
                  <input 
                    type="email"
                    className="input-field" 
                    value={form.admin_email} 
                    onChange={e => handleChange('admin_email', e.target.value)} 
                    placeholder="admin@empresa.com" 
                  />
                </div>
                <div>
                  <label className="label-field">Contraseña *</label>
                  <input 
                    type="password"
                    className="input-field" 
                    value={form.admin_password} 
                    onChange={e => handleChange('admin_password', e.target.value)} 
                    placeholder="Mínimo 6 caracteres" 
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-6 border-t border-dark-100 mt-8">
            <button type="submit" disabled={saving} className="btn-primary flex-1 min-w-[200px]">
              {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><Save className="w-5 h-5" /> {isEdit ? 'Guardar Cambios' : 'Crear Empresa y Admin'}</>}
            </button>
            <Link to="/superadmin" className="btn-secondary text-center">Cancelar</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
