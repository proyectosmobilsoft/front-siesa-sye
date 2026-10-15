import { ChevronDown, Info, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode, RefObject } from 'react'
import { useAyuda, type Ayuda } from './ayuda'

export function TarjetaResumen({ titulo, abierta, alAlternar, ayuda, children }: { titulo: string; abierta: boolean; alAlternar: () => void; ayuda: Ayuda; children: ReactNode }) {
  const info = useAyuda(ayuda)
  return <div ref={info.referencia as RefObject<HTMLDivElement>} role="button" tabIndex={0} aria-expanded={abierta} aria-label={`${titulo}, ${abierta ? 'cerrar' : 'ver'} detalle`} onClick={alAlternar} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alAlternar() } }} onMouseEnter={info.mostrar} onMouseLeave={info.ocultar} className={`min-h-64 cursor-pointer rounded-3xl bg-card p-5 ring-1 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-primary sm:p-6 ${abierta ? 'ring-2 ring-primary' : 'ring-border/80'}`}>
    <div className="flex items-center justify-between"><h2 className="flex items-center gap-1.5 text-[16px] font-semibold text-foreground">{titulo}<span role="img" tabIndex={0} aria-label={`Ayuda sobre ${titulo}`} aria-describedby={info.id} onFocus={info.mostrar} onBlur={info.ocultar} onClick={e => e.stopPropagation()} className="cursor-help text-muted-foreground"><Info className="size-3.5" /></span></h2></div>
    <div className="mt-4">{children}</div><span className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-primary">Ver detalle <ChevronDown className={`size-4 transition-transform ${abierta ? 'rotate-180' : ''}`} /></span>{info.tooltip}
  </div>
}

export function PanelExpandible({ vista, titulo, alCerrar, children }: { vista: string | null; titulo: string; alCerrar: () => void; children: ReactNode }) {
  return <AnimatePresence mode="wait">{vista && <motion.div key={vista} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: .28 }} className="overflow-hidden"><div className="pt-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-foreground">{titulo}</h2><button type="button" onClick={alCerrar} className="inline-flex items-center gap-1 rounded-xl bg-muted px-3 py-2 text-sm text-foreground"><X className="size-4" /> Cerrar</button></div>{children}</div></motion.div>}</AnimatePresence>
}
