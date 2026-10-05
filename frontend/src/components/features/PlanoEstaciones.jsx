import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const x = Number(estacion?.pos_x)
  const y = Number(estacion?.pos_y)
  return Number.isFinite(x) && Number.isFinite(y)
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
  onSeleccionar
}) {
  const imgRef = useRef(null)
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

  const src = plano?.imagen_url ? getAuthImageUrl(plano.imagen_url) : null

  const posDe = useCallback((estacion) => {
    if (arrastre?.id === estacion.id) return { x: arrastre.x, y: arrastre.y }
    if (!tienePosicion(estacion)) return null
    return { x: Number(estacion.pos_x), y: Number(estacion.pos_y) }
  }, [arrastre])

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
    arrastreRef.current = { id: estacion.id, moved: false, ...coords }
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

      <div className="relative overflow-hidden rounded-xl border border-dark-200 bg-dark-100 touch-none">
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
        >
          <ControlesZoom />
          <TransformComponent
            wrapperStyle={{ width: '100%', maxHeight: '70vh' }}
            contentStyle={{ width: '100%' }}
          >
            <div
              className="relative w-full"
              onPointerDown={onPointerDownMapa}
              onPointerUp={onPointerUpMapa}
            >
              <img
                ref={imgRef}
                src={src}
                alt={plano.nombre || 'Plano de estaciones'}
                className="block w-full h-auto select-none"
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
                    style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
                    onPointerDown={(e) => iniciarArrastre(e, estacion)}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSeleccionar?.(estacion)
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
