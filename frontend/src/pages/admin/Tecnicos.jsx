import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { UserCog, ClipboardList, ChevronRight, Search } from 'lucide-react'

export default function Tecnicos() {
  const [tecnicos, setTecnicos] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data: tecData } = await supabase
        .from('profiles')
        .select('*')
        .eq('rol', 'tecnico')
        .order('nombre_completo')

      // Get order counts per technician
      const tecWithCounts = await Promise.all((tecData || []).map(async (tec) => {
        const { count } = await supabase
          .from('ordenes_servicio')
          .select('id', { count: 'exact', head: true })
          .eq('tecnico_id', tec.id)
        return { ...tec, ordenes_count: count || 0 }
      }))

      setTecnicos(tecWithCounts)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = tecnicos.filter(t => {
    const nombre = t.nombre_completo?.toLowerCase() || ''
    const especialidad = t.especialidad?.toLowerCase() || ''
    const searchTerm = search.toLowerCase()
    return nombre.includes(searchTerm) || especialidad.includes(searchTerm)
  })

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Técnicos</h1>
          <p className="page-subtitle">{tecnicos.length} técnicos registrados</p>
        </div>
        <Link to="/admin/usuarios" state={{ openModal: true }} className="btn-primary text-sm">
          <UserCog className="w-4 h-4" /> Nuevo Técnico
        </Link>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="input-field pl-10" placeholder="Buscar por nombre o especialidad..."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(tec => (
          <Link key={tec.id} to={`/admin/usuarios/${tec.id}`} className="card-hover group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <UserCog className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-dark-900 group-hover:text-primary-700 transition-colors">
                    {tec.nombre_completo}
                  </h3>
                  {tec.especialidad && (
                    <p className="text-xs text-dark-500">{tec.especialidad}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-dark-300 group-hover:text-primary-600 transition-colors" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-dark-500">
                <ClipboardList className="w-4 h-4" /> {tec.ordenes_count} órdenes
              </div>
              <span className={`text-xs font-medium ${tec.activo ? 'text-green-600' : 'text-red-500'}`}>
                {tec.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full card text-center py-12">
            <UserCog className="w-12 h-12 text-dark-300 mx-auto mb-3" />
            <p className="text-dark-500">No se encontraron técnicos</p>
          </div>
        )}
      </div>
    </div>
  )
}
