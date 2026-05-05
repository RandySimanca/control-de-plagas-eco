import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Calendar, User, ChevronRight, Trash2, ClipboardList, X, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { confirmDelete, successAlert } from '../lib/alerts'

const EMPTY_FORM = {
  cliente_id: '', tecnico_id: '', fecha_programada: new Date().toISOString().split('T')[0],
  tipo_plaga: '', observaciones: '', estado: 'programada'
}

export default function Ordenes() {
  const { isAdmin, profile } = useAuth()
  const navigate = useNavigate()
  const [ordenes, setOrdenes] = useState([])
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [loading, setLoading] = useState(true)

  // --- Modal state ---
  const [showModal, setShowModal] = useState(false)
  const [clientes, setClientes] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  const location = useLocation()
  
  useEffect(() => { 
    if (profile || isAdmin) loadOrdenes() 
    
    if (location.state?.openModal) {
      openModal(null, location.state.prefill)
      window.history.replaceState({}, document.title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isAdmin, location])

  async function openModal(prefillData = null) {
    setForm({ 
      ...EMPTY_FORM, 
      tecnico_id: profile?.id || '',
      ...prefillData 
    })
    if (clientes.length === 0) {
      const [clientesRes, tecnicosRes] = await Promise.all([
        supabase.from('clientes').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('profiles').select('id, nombre_completo').eq('rol', 'tecnico').eq('activo', true)
      ])
      setClientes(clientesRes.data || [])
      setTecnicos(tecnicosRes.data || [])
    }
    setShowModal(true)
  }

  function closeModal() { setShowModal(false) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.cliente_id) { toast.error('Selecciona un cliente'); return }
    if (!form.fecha_programada) { toast.error('Selecciona una fecha'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase.from('ordenes_servicio').insert({
        cliente_id: form.cliente_id,
        tecnico_id: form.tecnico_id || profile?.id,
        fecha_programada: form.fecha_programada,
        tipo_plaga: form.tipo_plaga,
        observaciones: form.observaciones,
        estado: form.estado
      }).select('id').single()
      if (error) throw error

      // Si viene de una solicitud, actualizar el estado de la misma
      if (form.solicitud_id) {
        await supabase
          .from('solicitudes_servicio')
          .update({ 
            estado: 'convertida', 
            orden_id: data.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', form.solicitud_id)
      }

      closeModal()
      await successAlert('¡Orden creada!', 'La nueva orden se ha generado y asignado.')
      navigate(`/ordenes/${data.id}`)
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(e, id) {
    e.preventDefault()
    e.stopPropagation()
    const isConfirmed = await confirmDelete('¿Estás seguro de eliminar esta orden?', 'Se borrarán todos los datos asociados.')
    if (!isConfirmed) return
    try {
      const { error } = await supabase.from('ordenes_servicio').delete().eq('id', id)
      if (error) throw error
      setOrdenes(ordenes.filter(o => o.id !== id))
      await successAlert('Eliminada', 'La orden de servicio ha sido eliminada.')
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message)
    }
  }

  async function loadOrdenes() {
    try {
      let query = supabase
        .from('ordenes_servicio')
        .select(`*, clientes(nombre), profiles(nombre_completo)`)
        .order('fecha_programada', { ascending: false })
      if (!isAdmin && profile?.id) query = query.eq('tecnico_id', profile.id)
      const { data, error } = await query
      if (error) throw error
      setOrdenes(data || [])
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al cargar órdenes')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { key: 'todos', label: 'Todas', count: ordenes.length },
    { key: 'programada', label: 'Programadas', count: ordenes.filter(o => o.estado === 'programada').length },
    { key: 'en_progreso', label: 'En Progreso', count: ordenes.filter(o => o.estado === 'en_progreso').length },
    { key: 'completada', label: 'Completadas', count: ordenes.filter(o => o.estado === 'completada').length },
  ]

  const filtered = ordenes.filter(o => {
    const nombreCliente = o.clientes?.nombre?.toLowerCase() || ''
    const tipoPlaga = o.tipo_plaga?.toLowerCase() || ''
    const searchTerm = search.toLowerCase()
    return (nombreCliente.includes(searchTerm) || tipoPlaga.includes(searchTerm)) &&
      (filtroEstado === 'todos' || o.estado === filtroEstado)
  })

  const estadoBadge = { programada: 'badge-programada', en_progreso: 'badge-en-progreso', completada: 'badge-completada' }
  const estadoLabel = { programada: 'Programada', en_progreso: 'En Progreso', completada: 'Completada' }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  return (
    <>
      {/* ── Nueva Orden Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-dark-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-dark-900">Nueva Orden de Servicio</h2>
              <button onClick={closeModal} className="p-2 hover:bg-dark-100 rounded-xl transition-colors text-dark-400 hover:text-dark-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              <div>
                <label className="label-field">Cliente *</label>
                <select className="input-field" value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Técnico</label>
                  <select className="input-field" value={form.tecnico_id || ''} onChange={e => setForm(p => ({ ...p, tecnico_id: e.target.value }))}>
                    <option value="">Sin asignar</option>
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-field">Fecha programada *</label>
                  <input type="date" className="input-field" value={form.fecha_programada} onChange={e => setForm(p => ({ ...p, fecha_programada: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Tipo de Control</label>
                  <select className="input-field" value={form.tipo_plaga || ''} onChange={e => setForm(p => ({ ...p, tipo_plaga: e.target.value }))}>
                    <option value="">Seleccione un tipo...</option>
                    <option value="Desinsectación">Desinsectación</option>
                    <option value="Desratización">Desratización</option>
                    <option value="Desinfección">Desinfección</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Estado</label>
                  <select className="input-field" value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}>
                    <option value="programada">Programada</option>
                    <option value="en_progreso">En Progreso</option>
                    <option value="completada">Completada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label-field">Observaciones</label>
                <textarea className="input-field" rows={2} value={form.observaciones || ''} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Notas adicionales del servicio..." />
              </div>

              <div className="flex gap-3 pt-1 pb-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Crear Orden</>}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Page ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="page-title">Órdenes de Servicio</h1>
            <p className="page-subtitle">{ordenes.length} órdenes registradas</p>
          </div>
          {isAdmin && (
            <button onClick={openModal} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Nueva Orden
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-dark-100 p-1 rounded-xl mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFiltroEstado(tab.key)}
              className={`flex-1 min-w-fit px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                filtroEstado === tab.key ? 'bg-white text-dark-900 shadow-sm' : 'text-dark-500 hover:text-dark-700'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Buscar por cliente o tipo de control..."
          />
        </div>

        {/* Orders List */}
        {filtered.length === 0 ? (
          <div className="card text-center py-12">
            <ClipboardList className="w-12 h-12 text-dark-300 mx-auto mb-3" />
            <p className="text-dark-500">No se encontraron órdenes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(orden => (
              <Link key={orden.id} to={`/ordenes/${orden.id}`} className="card-hover flex items-center justify-between group">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    orden.estado === 'completada' ? 'bg-green-100' :
                    orden.estado === 'en_progreso' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    <Calendar className={`w-6 h-6 ${
                      orden.estado === 'completada' ? 'text-green-600' :
                      orden.estado === 'en_progreso' ? 'text-amber-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-dark-900 truncate">{orden.clientes?.nombre}</p>
                    <div className="flex items-center gap-3 text-xs text-dark-400 mt-0.5">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {orden.fecha_programada}</span>
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {orden.profiles?.nombre_completo || 'Sin asignar'}</span>
                    </div>
                    {orden.tipo_plaga && <p className="text-xs text-dark-500 mt-1">{orden.tipo_plaga}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={estadoBadge[orden.estado]}>{estadoLabel[orden.estado]}</span>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDelete(e, orden.id)}
                        className="p-2 text-dark-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-dark-300 group-hover:text-primary-600 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
