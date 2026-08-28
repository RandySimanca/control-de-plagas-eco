import { useState, useEffect } from 'react'
import { FileCheck, Download, Loader2, Save, Calendar, Building, List } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import { abrirCertificadoSanitario } from '../../../lib/generarCertificadoSanitario'

export default function OrdenCertificadoSanitario({ orden, cliente, isAdmin, isAssignedTecnico }) {
  const canEdit = isAdmin || isAssignedTecnico
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [certificado, setCertificado] = useState(null)
  
  const [form, setForm] = useState({
    resultado: 'CUMPLE',
    observaciones: '',
    normativa_referencia: '',
    tipo_establecimiento: cliente?.tipo || 'Establecimiento',
    tipo_servicio: orden?.tipo_plaga || 'Control Integral de Plagas',
    vigencia_meses: 3
  })

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orden.id])

  async function loadData() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Intentar cargar certificado existente
      const resCert = await api.get(`/ordenes/${orden.id}/certificado-sanitario`, { token })
      if (resCert.data) {
        setCertificado(resCert.data)
        setForm({
          resultado: resCert.data.resultado,
          observaciones: resCert.data.observaciones || '',
          normativa_referencia: resCert.data.normativa_referencia || '',
          tipo_establecimiento: resCert.data.tipo_establecimiento || '',
          tipo_servicio: resCert.data.tipo_servicio || '',
          vigencia_meses: 3
        })
        return
      }

      // Si no hay certificado, pre-cargar config
      const resConfig = await api.get('/configuracion', { token })
      const config = resConfig.data
      
      let vigencia_meses = config?.vigencia_certificado_meses ? Number(config.vigencia_certificado_meses) : 3

      // Normativa por defecto según tipo de establecimiento
      let normativaDefecto = 'Resolución 2674 de 2013, Decreto 1843 de 1991'
      const tipo = (cliente?.tipo || '').toLowerCase()
      if (tipo.includes('educativ') || tipo.includes('colegio') || tipo.includes('escuela')) {
        normativaDefecto = 'Resolución 2674 de 2013, Decreto 1843 de 1991, Ley 115 de 1994'
      } else if (tipo.includes('salud') || tipo.includes('hospital') || tipo.includes('clinica')) {
        normativaDefecto = 'Resolución 3100 de 2019, Decreto 1843 de 1991'
      }

      setForm(prev => ({
        ...prev,
        vigencia_meses,
        normativa_referencia: normativaDefecto
      }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      
      const payload = {
        orden_id: orden.id,
        folio: certificado?.folio || `CS-${new Date().getFullYear()}-${orden.id.split('-')[0]}`,
        tipo_establecimiento: form.tipo_establecimiento,
        tipo_servicio: form.tipo_servicio,
        resultado: form.resultado,
        observaciones: form.observaciones,
        fecha_servicio: orden.fecha_programada || orden.created_at,
        fecha_emision: new Date().toISOString(),
        fecha_vencimiento: new Date(new Date().setMonth(new Date().getMonth() + form.vigencia_meses)).toISOString(),
        normativa_referencia: form.normativa_referencia
      }

      const { data } = await api.post('/certificados-sanitarios', payload, { token })
      setCertificado(data)
      toast.success('Certificado sanitario guardado')
      
      if (!data.aprobado) {
        toast('El certificado está pendiente de aprobación por un administrador.', { icon: 'ℹ️' })
      }
    } catch (err) {
      toast.error('Error al guardar: ' + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerar() {
    setGenerando(true)
    try {
      const token = localStorage.getItem('token')
      const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '').replace(/\/$/, '')
      
      const configRes = await api.get('/configuracion', { token })
      
      await abrirCertificadoSanitario({
        certificado,
        orden,
        cliente,
        config: configRes.data,
        folio: certificado.folio,
        baseUrl: API_BASE
      })
    } catch (error) {
      console.error(error)
      toast.error('Error al generar el PDF del certificado')
    } finally {
      setGenerando(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-dark-100 shadow-sm mt-6">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2.5 rounded-xl">
            <FileCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-dark-900">Certificado Sanitario</h3>
            <p className="text-sm text-dark-500">Documento oficial para acreditar la inspección/control de plagas.</p>
          </div>
        </div>
        {certificado && (
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${certificado.aprobado ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
              {certificado.aprobado ? 'Aprobado' : 'Pendiente de Aprobación'}
            </span>
            <span className="text-xs text-dark-400 font-mono">Folio: {certificado.folio}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Tipo de Establecimiento</label>
            <div className="relative">
              <Building className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text" className="input-field pl-10"
                value={form.tipo_establecimiento}
                onChange={e => setForm(prev => ({ ...prev, tipo_establecimiento: e.target.value }))}
                placeholder="Ej: Restaurante, Institución Educativa..."
                required
                disabled={!canEdit}
              />
            </div>
          </div>
          <div>
            <label className="label-field">Tipo de Servicio (Mostrado en PDF)</label>
            <div className="relative">
              <List className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text" className="input-field pl-10"
                value={form.tipo_servicio}
                onChange={e => setForm(prev => ({ ...prev, tipo_servicio: e.target.value }))}
                required
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Resultado de Evaluación</label>
            <select
              className="input-field bg-white"
              value={form.resultado}
              onChange={e => setForm(prev => ({ ...prev, resultado: e.target.value }))}
              disabled={!canEdit}
            >
              <option value="CUMPLE">CUMPLE</option>
              <option value="CUMPLE CON OBSERVACIONES">CUMPLE CON OBSERVACIONES</option>
              <option value="NO CUMPLE">NO CUMPLE</option>
            </select>
          </div>
          <div>
            <label className="label-field">Vigencia a otorgar (Meses)</label>
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="number" min="1" max="60" className="input-field pl-10"
                value={form.vigencia_meses}
                onChange={e => setForm(prev => ({ ...prev, vigencia_meses: Number(e.target.value) }))}
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="label-field">Normativa de Referencia (Opcional pero recomendado)</label>
          <textarea
            className="input-field" rows={2}
            value={form.normativa_referencia}
            onChange={e => setForm(prev => ({ ...prev, normativa_referencia: e.target.value }))}
            placeholder="Resolución 2674 de 2013, Decreto 1843 de 1991, etc."
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="label-field">Observaciones del Servicio</label>
          <textarea
            className="input-field" rows={3}
            value={form.observaciones}
            onChange={e => setForm(prev => ({ ...prev, observaciones: e.target.value }))}
            placeholder="Ej: Durante la inspección no se evidenciaron signos activos de infestación..."
            disabled={!canEdit}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-dark-100">
          {canEdit && (
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <span className="flex items-center justify-center gap-2"><Save className="w-5 h-5" /> Guardar / Actualizar Datos</span>}
            </button>
          )}
          
          {certificado && (
            <button type="button" onClick={handleGenerar} disabled={generando} className={`btn-secondary flex-1 bg-white ${!canEdit ? 'w-full' : ''}`}>
              {generando ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary-600" /> : <span className="flex items-center justify-center gap-2 text-primary-700"><Download className="w-5 h-5" /> {canEdit ? 'Generar y Ver PDF' : 'Descargar Certificado Sanitario'}</span>}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
