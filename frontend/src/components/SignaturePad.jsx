import { useRef, useEffect, useState } from 'react'
import { Eraser, Check, X } from 'lucide-react'

export default function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2

    // Set canvas resolution for crisp lines
    const ratio = window.devicePixelRatio || 1
    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = width * ratio
    canvas.height = height * ratio
    ctx.scale(ratio, ratio)
  }, [])

  const startDrawing = (e) => {
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Support both mouse and touch
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX || (e.touches && e.touches[0].clientX)
    const clientY = e.clientY || (e.touches && e.touches[0].clientY)
    
    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
    setHasContent(true)
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasContent(false)
  }

  const save = () => {
    if (!hasContent) return
    canvasRef.current.toBlob((blob) => {
      onSave(blob)
    }, 'image/png')
  }

  return (
    <div className="bg-white rounded-2xl border border-dark-200 overflow-hidden shadow-xl max-w-lg w-full">
      <div className="p-4 border-b border-dark-100 flex items-center justify-between bg-dark-50">
        <h3 className="font-bold text-dark-900">Firma del Técnico</h3>
        <button onClick={onCancel} className="p-1 hover:bg-dark-200 rounded-lg transition-colors">
          <X className="w-5 h-5 text-dark-500" />
        </button>
      </div>
      
      <div className="p-4">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-64 bg-slate-50 border border-dark-100 rounded-xl cursor-crosshair touch-none"
        />
        <p className="text-center text-xs text-dark-400 mt-3">Firma dentro del recuadro</p>
      </div>

      <div className="p-4 bg-dark-50 border-t border-dark-100 flex gap-3">
        <button onClick={clear} className="btn-secondary flex-1 py-2">
          <Eraser className="w-4 h-4" /> Limpiar
        </button>
        <button onClick={save} disabled={!hasContent} className="btn-primary flex-1 py-2">
          <Check className="w-4 h-4" /> Guardar Firma
        </button>
      </div>
    </div>
  )
}
