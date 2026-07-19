import { useState } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle, X } from 'lucide-react'
import { useConfig } from '../../contexts/ConfigContext'

/**
 * HelpButton — Ícono de ayuda contextual por módulo.
 *
 * Uso:
 *   <HelpButton title="Clientes" content={HELP_CONTENT.clientes} />
 *
 * `content` puede ser un string simple o un array de bullets (ver helpContent.js).
 */
export default function HelpButton({ title, content }) {
  const [open, setOpen] = useState(false)
  const { nombreEmpresa } = useConfig()

  const parseContent = (text) => text.replace(/\{\{empresa\}\}/g, nombreEmpresa)

  return (
    <>
      <div className="relative group inline-flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Ayuda sobre ${title}`}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full text-dark-400 hover:text-primary-700 hover:bg-primary-50 transition-colors"
        >
          <HelpCircle className="w-6 h-6" />
        </button>

        {/* Tooltip */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-dark-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
          Haz clic para ver la ayuda
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-dark-900" />
        </div>
      </div>

      {open && createPortal(
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-dark-900/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary-50 rounded-xl">
                  <HelpCircle className="w-5 h-5 text-primary-700" />
                </div>
                <h2 className="text-lg font-bold text-dark-900">{title}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-dark-400 hover:text-dark-700"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-dark-600 leading-relaxed space-y-2">
              {Array.isArray(content) ? (
                <ul className="list-disc pl-5 space-y-1.5">
                  {content.map((item, i) => (
                    <li key={i}>{parseContent(item)}</li>
                  ))}
                </ul>
              ) : (
                <p>{parseContent(content)}</p>
              )}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full py-2.5 rounded-full bg-dark-900 text-white text-sm font-semibold hover:bg-dark-800 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
