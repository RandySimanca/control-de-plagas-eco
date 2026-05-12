import { Package } from 'lucide-react'

export default function OrdenProductos({ productos }) {
  return (
    <div className="card">
      <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-primary-600" /> Productos Utilizados
      </h2>
      {productos.length === 0 ? (
        <p className="text-sm text-dark-400">Sin productos registrados</p>
      ) : (
        <div className="space-y-3">
          {productos.map((p, i) => (
            <div key={i} className="bg-dark-50 p-3 rounded-xl border border-dark-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-0.5">
                    {p.tipo_producto || 'Producto Utilizado'}
                  </span>
                  <span className="text-sm font-bold text-dark-900">
                    {p.nombre_comercial || p.nombre_producto || 'Sin nombre'}
                  </span>
                </div>
                <span className="text-sm font-medium text-dark-800 bg-white px-2 py-1 rounded-lg border border-dark-200">
                  {p.cantidad || 'N/A'}
                </span>
              </div>
              {p.ingrediente_activo && (
                <div className="text-xs text-dark-500 mt-1">
                  <span className="font-medium text-dark-600">Ingrediente activo:</span> {p.ingrediente_activo}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
