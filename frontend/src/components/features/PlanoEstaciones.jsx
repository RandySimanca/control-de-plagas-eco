import { useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { TransformComponent, TransformWrapper, useControls } from 'react-zoom-pan-pinch'
import { getAuthImageUrl } from '../../utils/imageUtils'

const COLORES_TIPO = {
  Cebadero: '#d97706',
  Impacto: '#2563eb',
  'Jaula atrapavivos': '#7c3aed'
}

const COLORES_OTROS = ['#dc2626', '#0891b2', '#65a30d', '#db2777', '#ea580c']

function colorPorTipo (tipo, extras) {
  if (COLORES_TIPO[tipo]) return COLORES_TIPO[tipo]
  const idx = extras.indexOf(tipo)
  return COLORES_OTROS[idx >= 0 ? idx % COLORES_OTROS.length : 0]
}

function tienePosicion (estacion) {
  // Number(null) === 0, así que hay que descartar null/''/undefined antes de convertir
  const rx = estacion?.pos_x
  const ry = estacion?.pos_y
  if (rx === null || rx === undefined || rx === '') return false
  if (ry === null || ry === undefined || ry === '') return false
  return Number.isFinite(Number(rx)) && Number.isFinite(Number(ry))
}

function clamp01 (n) {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function clienteXY (e) {
  if (e.touches?.[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
  if (e.changedTouches?.[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
  return { x: e.clientX, y: e.clientY }
}

function coordsEnImagen (e, imgEl) {
  if (!imgEl) return null
  const { x, y } = clienteXY(e)
  const rect = imgEl.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  return {
    x: clamp01((x - rect.left) / rect.width),
    y: clamp01((y - rect.top) / rect.height)
  }
}

function ControlesZoom () {
  const { zoomIn, zoomOut, resetTransform } = useControls()
  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
      <button type="button" className="w-10 h-10 rounded-xl bg-white/95 shadow border border-dark-200 text-dark-700 flex items-center justify-center" onClick={() => zoomIn()} aria-label="Acercar">
        <Plus className="w-5 h-5" />
      </button>
      <button type="button" className="w-10 h-10 rounded-xl bg-white/95 shadow border border-dark-200 text-dark-700 flex items-center justify-center" onClick={() => zoomOut()} aria-label="Alejar">
        <Minus className="w-5 h-5" />
      </button>
      <button type="button" className="w-10 h-10 rounded-xl bg-white/95 shadow border border-dark-200 text-dark-700 flex items-center justify-center" onClick={() => resetTransform()} aria-label="Restablecer zoom">
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function PlanoEstaciones ({
  plano,
  estaciones = [],
  modo = 'ver',
  estacionSeleccionadaId,
  onMover,
  onSeleccionar,
  onAbrir
}) {
  const imgRef = useRef(null)
  const cajaRef = useRef(null)
  const [, setTick] = useState(0)
  const arrastreRef = useRef(null)
  const tapRef = useRef(null)
  const [arrastre, setArrastre] = useState(null)

  const extras = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const e of estaciones) {
      const tipo = e.tipo || e.tipo_estacion
      if (!tipo || COLORES_TIPO[tipo] || seen.has(tipo)) continue
      seen.add(tipo)
      list.push(tipo)
    }
    return list
  }, [estaciones])

  const tiposLeyenda = useMemo(() => {
    const tipos = new Set(['Cebadero', 'Impacto', 'Jaula atrapavivos'])
    estaciones.forEach(e => {
      const tipo = e.tipo || e.tipo_estacion
      if (tipo) tipos.add(tipo)
    })
    return [...tipos]
  }, [estaciones])

  const seleccionada = estaciones.find(e => e.id === estacionSeleccionadaId)
  const puedeColocar = modo === 'editar' && seleccionada && !tienePosicion(seleccionada)

  // Estaciones sin posición: se muestran alrededor del CENTRO DE LO QUE SE VE en pantalla
  // (zona visible del plano), para no tener que desplazar el plano para encontrarlas.
  const estacionesSinPosicion = estaciones.filter(e => !tienePosicion(e))
  function centroVisible () {
    const img = imgRef.current
    const caja = cajaRef.current
    if (!img || !caja) return null
    const r = img.getBoundingClientRect()
    const b = caja.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return null
    const left = Math.max(r.left, b.left)
    const right = Math.min(r.right, b.right)
    const top = Math.max(r.top, b.top)
    const bottom = Math.min(r.bottom, b.bottom)
    if (right <= left || bottom <= top) return null
    return {
      cx: ((left + right) / 2 - r.left) / r.width,
      cy: ((top + bottom) / 2 - r.top) / r.height,
      // radio en píxeles de pantalla, proporcional a la zona visible
      radioPx: Math.min(right - left, bottom - top) * 0.12,
      w: r.width,
      h: r.height
    }
  }
  function posicionOffset (estacion) {
    const idx = estacionesSinPosicion.findIndex(e => e.id === estacion.id)
    if (idx === -1) return { x: 0.5, y: 0.5 }
    const c = centroVisible()
    if (!c) return { x: 0.5, y: 0.5 }
    const n = estacionesSinPosicion.length
    if (n === 1) return { x: clamp01(c.cx), y: clamp01(c.cy) }
    const angle = (idx / n) * Math.PI * 2
    return {
      x: clamp01(c.cx + (Math.cos(angle) * c.radioPx) / c.w),
      y: clamp01(c.cy + (Math.sin(angle) * c.radioPx) / c.h)
    }
  }

  const src = plano?.imagen_url ? getAuthImageUrl(plano.imagen_url) : null

  const posDe = (estacion) => {
    if (arrastre?.id === estacion.id) return { x: arrastre.x, y: arrastre.y }
    if (!tienePosicion(estacion)) {
      // En modo edición, mostrar estaciones sin posición alrededor del centro
      if (modo === 'editar') {
        // posicionOffset ya devuelve coordenadas absolutas (0..1) alrededor del centro
        return posicionOffset(estacion)
      }
      return null
    }
    return { x: Number(estacion.pos_x), y: Number(estacion.pos_y) }
  }

  useEffect(() => {
    if (modo !== 'editar') return undefined

    function onMove (e) {
      const drag = arrastreRef.current
      if (!drag) return
      e.preventDefault()
      const coords = coordsEnImagen(e, imgRef.current)
      if (!coords) return
      drag.moved = true
      arrastreRef.current = { ...drag, ...coords }
      setArrastre({ id: drag.id, x: coords.x, y: coords.y })
    }

    function onUp (e) {
      const drag = arrastreRef.current
      arrastreRef.current = null
      setArrastre(null)
      if (!drag) return
      // Un simple toque sobre un pin ya ubicado no debe moverlo
      if (!drag.moved && !drag.sinPosicion) return
      const coords = coordsEnImagen(e, imgRef.current) || { x: drag.x, y: drag.y }
      onMover?.(drag.id, clamp01(coords.x), clamp01(coords.y))
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [modo, onMover])

  function iniciarArrastre (e, estacion) {
    if (modo !== 'editar') return
    e.stopPropagation()
    e.preventDefault()
    const coords = coordsEnImagen(e, imgRef.current) || {
      x: Number(estacion.pos_x) || 0,
      y: Number(estacion.pos_y) || 0
    }
    arrastreRef.current = { id: estacion.id, moved: false, sinPosicion: !tienePosicion(estacion), ...coords }
    setArrastre({ id: estacion.id, x: coords.x, y: coords.y })
    onSeleccionar?.(estacion)
  }

  function onPointerDownMapa (e) {
    if (!puedeColocar) return
    const { x, y } = clienteXY(e)
    tapRef.current = { x, y }
  }

  function onPointerUpMapa (e) {
    if (!puedeColocar || arrastreRef.current) return
    const start = tapRef.current
    tapRef.current = null
    if (!start) return
    const { x, y } = clienteXY(e)
    if (Math.hypot(x - start.x, y - start.y) > 8) return
    const coords = coordsEnImagen(e, imgRef.current)
    if (!coords) return
    onMover?.(seleccionada.id, coords.x, coords.y)
  }

  if (!plano || !src) {
    return (
      <div className="rounded-xl border border-dashed border-dark-200 bg-dark-50 p-6 text-center text-sm text-dark-500">
        No hay plano para mostrar
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {modo === 'editar' && (
        <div className="text-xs text-primary-800 bg-primary-50 rounded-lg px-3 py-2">
          {puedeColocar ? (
            <span>📍 Toca el plano para colocar la estación <strong>{seleccionada.numero}</strong></span>
          ) : seleccionada && tienePosicion(seleccionada) ? (
            <span>✋ Arrastra el pin de la estación <strong>{seleccionada.numero}</strong> para moverla</span>
          ) : (
            <span>👆 Selecciona una estación del dropdown para colocarla en el plano</span>
          )}
        </div>
      )}

      <div ref={cajaRef} className="relative overflow-hidden rounded-xl border border-dark-200 bg-dark-100 touch-none" style={{ height: '60vh', minHeight: '300px' }}>
        <TransformWrapper
          minScale={1}
          maxScale={8}
          centerOnInit
          limitToBounds
          panning={{
            disabled: !!arrastre,
            excluded: ['estacion-pin']
          }}
          doubleClick={{ disabled: modo === 'editar' }}
          onTransform={() => setTick(t => t + 1)}
        >
          <ControlesZoom />
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div
              className="relative"
              style={{ maxWidth: '100%' }}
              onPointerDown={onPointerDownMapa}
              onPointerUp={onPointerUpMapa}
            >
              <img
                ref={imgRef}
                src={src}
                alt={plano.nombre || 'Plano de estaciones'}
                className="block select-none"
                style={{ maxWidth: '100%', maxHeight: 'calc(60vh - 4px)', width: 'auto', height: 'auto' }}
                onLoad={() => setTick(t => t + 1)}
                draggable={false}
              />
              {estaciones.map(estacion => {
                const pos = posDe(estacion)
                if (!pos) return null
                const tipo = estacion.tipo || estacion.tipo_estacion
                const color = colorPorTipo(tipo, extras)
                const activa = estacion.id === estacionSeleccionadaId
                const estadoVisita = estacion._estado_visita
                let borderColor = 'white'
                let borderWidth = '2px'
                if (estadoVisita === 'revisada') {
                  borderColor = '#10b981'
                  borderWidth = '3px'
                } else if (estadoVisita === 'sin_revisar') {
                  borderColor = '#94a3b8'
                  borderWidth = '2px'
                }
                return (
                  <button
                    key={estacion.id}
                    type="button"
                    className="estacion-pin absolute z-[1] -translate-x-1/2 -translate-y-full touch-none"
                    style={{
                      left: `${pos.x * 100}%`,
                      top: `${pos.y * 100}%`,
                      // Aumentar área táctil en móviles
                      padding: '20px',
                      margin: '-20px'
                    }}
                    onPointerDown={(e) => iniciarArrastre(e, estacion)}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (modo === 'editar') onSeleccionar?.(estacion)
                      else (onAbrir || onSeleccionar)?.(estacion)
                    }}
                    aria-label={`Estación ${estacion.numero}`}
                  >
                    <span
                      className={`flex flex-col items-center drop-shadow ${activa ? 'scale-110' : ''}`}
                    >
                      <span
                        className="min-w-7 h-7 px-1 rounded-full text-white text-xs font-bold flex items-center justify-center"
                        style={{ backgroundColor: color, border: `${borderWidth} solid ${borderColor}` }}
                      >
                        {estacion.numero}
                      </span>
                      <span className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent" style={{ borderTopColor: color }} />
                    </span>
                  </button>
                )
              })}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-dark-600">
        {tiposLeyenda.map(tipo => (
          <li key={tipo} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorPorTipo(tipo, extras) }} />
            {tipo}
          </li>
        ))}
      </ul>
    </div>
  )
}
