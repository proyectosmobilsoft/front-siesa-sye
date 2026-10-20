import { useEffect, useState } from 'react'
import clsx from 'clsx'

const ESTILOS = `
@keyframes calc-barra { 0%,100% { transform: scaleY(.25) } 50% { transform: scaleY(1) } }
@keyframes calc-trazo { 0% { stroke-dashoffset: 300 } 60%,100% { stroke-dashoffset: 0 } }
@keyframes calc-giro { to { transform: rotate(360deg) } }
@keyframes calc-entra { from { opacity: 0; transform: scale(.92) } to { opacity: 1; transform: scale(1) } }
@keyframes calc-punto { 0%,80%,100% { opacity: .2 } 40% { opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .calc-anim, .calc-anim * { animation: none !important } }
`

function Barras() {
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={10 + i * 21} y={8} width={14} height={64} rx={3} fill="currentColor" opacity={0.35 + i * 0.13}
          style={{ transformOrigin: '50% 72px', transformBox: 'fill-box', animation: `calc-barra 1.4s ease-in-out ${i * 0.15}s infinite` }} />
      ))}
    </svg>
  )
}

function Linea() {
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden fill="none">
      <path d="M8 72H112M8 8V72" stroke="currentColor" opacity={0.2} strokeWidth={1.5} />
      <path d="M10 60 L32 38 L52 48 L76 20 L110 30" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={300} style={{ animation: 'calc-trazo 1.8s ease-out infinite' }} />
    </svg>
  )
}

function Dona() {
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden fill="none">
      <circle cx={60} cy={40} r={26} stroke="currentColor" opacity={0.15} strokeWidth={10} />
      <circle cx={60} cy={40} r={26} stroke="currentColor" strokeWidth={10} strokeLinecap="round" strokeDasharray="60 104"
        style={{ transformOrigin: '60px 40px', animation: 'calc-giro 1.6s linear infinite' }} />
    </svg>
  )
}

function Area() {
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden>
      <path d="M8 72 L8 52 Q30 20 52 44 T96 28 L112 36 L112 72 Z" fill="currentColor" opacity={0.25}
        style={{ transformOrigin: '60px 72px', animation: 'calc-barra 1.8s ease-in-out infinite' }} />
      <path d="M8 52 Q30 20 52 44 T96 28 L112 36" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  )
}

const GRAFICAS = [Barras, Linea, Dona, Area]

/** Animación de carga: alterna entre tipos de gráfica con la leyenda "Calculando…". */
export function CalculandoGraficas({ altura = 'h-64', className }: { altura?: string; className?: string }) {
  const [indice, setIndice] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIndice((i) => (i + 1) % GRAFICAS.length), 2200)
    return () => clearInterval(id)
  }, [])
  const Grafica = GRAFICAS[indice]

  return (
    <div role="status" aria-label="Calculando" className={clsx('calc-anim flex flex-col items-center justify-center gap-3 rounded-2xl bg-muted/50', altura, className)}>
      <style>{ESTILOS}</style>
      <div key={indice} className="h-20 w-32 text-primary" style={{ animation: 'calc-entra .4s ease-out' }}>
        <Grafica />
      </div>
      <p className="text-[13px] font-medium text-muted-foreground">
        Calculando
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ animation: `calc-punto 1.2s ease-in-out ${i * 0.2}s infinite` }}>.</span>
        ))}
      </p>
    </div>
  )
}
