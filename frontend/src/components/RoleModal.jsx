import { AlertCircle, ArrowRight } from 'lucide-react'

export default function RoleModal({ isOpen, onClose, title, message, targetUrl, buttonText }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-950/60 backdrop-blur-sm transition-opacity" />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transition-all duration-300">
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-6">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          
          <h3 className="text-2xl font-bold text-dark-900 mb-3">{title}</h3>
          <p className="text-dark-600 leading-relaxed mb-8">
            {message}
          </p>
          
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary-600/30 active:scale-95"
          >
            {buttonText}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
