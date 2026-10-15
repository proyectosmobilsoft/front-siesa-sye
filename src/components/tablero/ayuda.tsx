import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, useState } from 'react'

export type Ayuda = { fuente: string; formula: string; nota?: string }

/** Ayuda contextual anclada al título o a la tarjeta KPI. */
export function useAyuda(ayuda?: Ayuda) {
  const id = useId()
  const referencia = useRef<HTMLElement | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [visible, setVisible] = useState(false)
  const [posicion, setPosicion] = useState({ top: 0, left: 0 })
  const ocultar = () => { if (temporizador.current) clearTimeout(temporizador.current); setVisible(false) }
  const mostrar = () => {
    if (!ayuda) return
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => {
      const r = referencia.current?.getBoundingClientRect()
      if (!r) return
      const ancho = Math.min(320, window.innerWidth - 24)
      const alto = ayuda.nota ? 190 : 160
      setPosicion({ left: Math.max(12, Math.min(r.left, window.innerWidth - ancho - 12)), top: r.bottom + alto + 12 > window.innerHeight ? Math.max(12, r.top - alto - 8) : r.bottom + 8 })
      setVisible(true)
    }, 250)
  }
  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current) }, [])
  const tooltip = ayuda && typeof document !== 'undefined' && createPortal(
    <AnimatePresence>{visible && <motion.div id={id} role="tooltip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }} style={{ position: 'fixed', top: posicion.top, left: posicion.left, width: Math.min(320, window.innerWidth - 24), zIndex: 1000, pointerEvents: 'none' }} className="max-w-xs rounded-2xl bg-popover p-3.5 text-[12.5px] text-popover-foreground shadow-lg ring-1 ring-border">
      <p className="font-semibold">De dónde sale</p><p className="mt-1 leading-relaxed">{ayuda.fuente}</p>
      <p className="mt-2 font-semibold">Fórmula</p><p className="mt-1 rounded-lg bg-muted px-2 py-1.5 font-mono leading-relaxed">{ayuda.formula}</p>
      {ayuda.nota && <p className="mt-2 text-muted-foreground">{ayuda.nota}</p>}
    </motion.div>}</AnimatePresence>, document.body)
  return { id, referencia, mostrar, ocultar, tooltip }
}

