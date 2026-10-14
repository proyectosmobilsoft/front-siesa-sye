import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Inclinación "isométrica" momentánea cuando cambia `clave` (nueva propuesta,
 * reorden, ruta confirmada…). No remonta a los hijos: el mapa de Leaflet
 * conserva su zoom y posición. Respeta `prefers-reduced-motion`.
 */
export function Transicion3D({
  clave,
  retraso = 0,
  children,
}: {
  clave: string
  retraso?: number
  children: ReactNode
}) {
  const reducir = useReducedMotion()
  const controles = useAnimationControls()
  const primera = useRef(true)

  useEffect(() => {
    // Sin animación en el primer render: el efecto es solo para cambios.
    if (primera.current) {
      primera.current = false
      return
    }
    if (reducir) return
    void controles.start({
      rotateX: [0, 18, 0],
      rotateZ: [0, -3, 0],
      scale: [1, 0.97, 1],
      y: [0, -6, 0],
      boxShadow: [
        '0 0 0 rgba(0,0,0,0)',
        '8px 12px 0 rgba(0,0,0,0.08)',
        '0 0 0 rgba(0,0,0,0)',
      ],
      transition: { duration: 0.65, ease: 'easeOut', delay: retraso },
    })
  }, [clave, reducir, retraso, controles])

  return (
    <div style={{ perspective: 1200 }}>
      <motion.div animate={controles} style={{ transformOrigin: 'center' }}>
        {children}
      </motion.div>
    </div>
  )
}
