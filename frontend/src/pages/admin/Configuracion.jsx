import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Save, Loader2, Upload, Building2, Mail, Phone, MapPin, Type } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Configuracion() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logo, setLogo] = useState(null)
  const [form, setForm] = useState({
    nombre_empresa: '',
    nit: '',
    email_contacto: '',
    telefono_contacto: '',
    direccion_fiscal: '',
    footer_pdf: '',
    logo_url: '',
    recomendaciones_generales: '',
    version_informe: '',
    fecha_modelo_informe: ''
  })

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const { data, error } = await supabase.from('configuracion').select('*').single()
      if (error && error.code !== 'PGRST116') throw error
      if (data) setForm(data)
    } catch (err) {
      console.error('Error cargando configuración:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      let logoUrl = form.logo_url

      if (logo) {
        const path = `branding/logo_${Date.now()}`
        const { error: uploadErr } = await supabase.storage.from('fotos-servicio').upload(path, logo)
        if (uploadErr) throw uploadErr
        const { data: qData } = supabase.storage.from('fotos-servicio').getPublicUrl(path)
        logoUrl = qData.publicUrl
      }

      const payload = {
        ...form,
        logo_url: logoUrl,
        updated_at: new Date().toISOString()
      }
      
      let dbError;
      if (form.id) {
        const { error } = await supabase.from('configuracion').update(payload).eq('id', form.id)
        dbError = error;
      } else {
        const { error } = await supabase.from('configuracion').insert(payload)
        dbError = error;
      }

      if (dbError) throw dbError
      setForm(prev => ({ ...prev, logo_url: logoUrl }))
      setLogo(null) // Limpiar la vista previa local para mostrar la URL final
      toast.success('Configuración guardada')
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title text-2xl font-bold text-dark-900">Configuración del Sistema</h1>
        <p className="page-subtitle text-dark-500">Personaliza la identidad de tu empresa y los datos de contacto.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-bold text-dark-900 mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-600" /> Información de la Empresa
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="label-field">Nombre de la Empresa</label>
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="text" className="input-field pl-10"
                      value={form.nombre_empresa || ''}
                      onChange={e => setForm(prev => ({ ...prev, nombre_empresa: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="label-field">NIT de la Empresa</label>
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="text" className="input-field pl-10"
                      value={form.nit || ''}
                      onChange={e => setForm(prev => ({ ...prev, nit: e.target.value }))}
                      placeholder="Ej: 900.123.456-7"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="label-field">Email de Contacto</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="email" className="input-field pl-10"
                      value={form.email_contacto || ''}
                      onChange={e => setForm(prev => ({ ...prev, email_contacto: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="label-field">Teléfono de Contacto</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="text" className="input-field pl-10"
                      value={form.telefono_contacto || ''}
                      onChange={e => setForm(prev => ({ ...prev, telefono_contacto: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="label-field">Dirección Fiscal / Oficina</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="text" className="input-field pl-10"
                    value={form.direccion_fiscal || ''}
                    onChange={e => setForm(prev => ({ ...prev, direccion_fiscal: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="label-field">Versión del Modelo (PDF)</label>
                  <input
                    type="text" className="input-field"
                    value={form.version_informe || ''}
                    onChange={e => setForm(prev => ({ ...prev, version_informe: e.target.value }))}
                    placeholder="Ej: 2, 3, 1.4"
                  />
                </div>
                <div>
                  <label className="label-field">Fecha del Modelo (PDF)</label>
                  <input
                    type="text" className="input-field"
                    value={form.fecha_modelo_informe || ''}
                    onChange={e => setForm(prev => ({ ...prev, fecha_modelo_informe: e.target.value }))}
                    placeholder="Ej: 14/04/2026"
                  />
                </div>
              </div>

              <div>
                <label className="label-field font-medium text-dark-700">Texto para el Footer del PDF</label>
                <textarea
                  className="input-field mt-1" rows={3}
                  value={form.footer_pdf || ''}
                  onChange={e => setForm(prev => ({ ...prev, footer_pdf: e.target.value }))}
                  placeholder="Ej: Gracias por confiar en PlagControl. Este certificado es válido por 6 meses."
                />
              </div>

              <div>
                <label className="label-field font-medium text-dark-700">Recomendaciones Generales para el PDF</label>
                <textarea
                  className="input-field mt-1 text-sm leading-relaxed" rows={5}
                  value={form.recomendaciones_generales || ''}
                  onChange={e => setForm(prev => ({ ...prev, recomendaciones_generales: e.target.value }))}
                  placeholder="Introduce una recomendación por línea..."
                />
                <p className="text-xs text-dark-400 mt-1">Cada salto de línea se listará como un punto separado (formato viñeta) en la sección 7 del certificado.</p>
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full mt-4">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Guardar Cambios</>}
              </button>
            </form>
          </div>
        </div>

        <div>
          <div className="card">
            <h2 className="text-lg font-bold text-dark-900 mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary-600" /> Logo de Empresa
            </h2>
            <div className="space-y-4">
              <div className="aspect-square w-full bg-dark-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-dark-200 overflow-hidden relative group">
                {logo ? (
                  <img src={URL.createObjectURL(logo)} alt="Vista previa" className="w-full h-full object-contain" />
                ) : form.logo_url ? (
                  <img src={form.logo_url} alt="Logo actual" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-4">
                    <Building2 className="w-12 h-12 text-dark-200 mx-auto mb-2" />
                    <p className="text-xs text-dark-400">No hay logo cargado</p>
                  </div>
                )}
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <div className="flex flex-col items-center text-white">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-xs font-medium">Cambiar Logo</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setLogo(e.target.files[0])} />
                </label>
              </div>
              <p className="text-xs text-dark-400 text-center">Se recomienda usar archivos PNG o JPG con fondo transparente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
