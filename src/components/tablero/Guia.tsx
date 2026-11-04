import type { ReactNode } from 'react'
import { BookOpen, Lightbulb } from 'lucide-react'
import { clsx } from 'clsx'

/** Resumen en frases con los números ya dichos, para leer sin interpretar gráficas. */
export function Lectura({ titulo = 'En pocas palabras', frases }: { titulo?: string; frases: ReactNode[] }) {
  return (
    <div className="rounded-3xl bg-primary/[0.06] p-5 dark:bg-primary/10">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground"><Lightbulb className="size-4 text-primary" aria-hidden />{titulo}</p>
      <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-foreground/90">
        {frases.map((frase, i) => <li key={i} className="flex gap-2"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" /><span>{frase}</span></li>)}
      </ul>
    </div>
  )
}

/** Definiciones de los términos del tablero, plegadas para no estorbar. */
export function ComoLeer({ titulo = 'Cómo leer este tablero', items }: { titulo?: string; items: { termino: string; significado: ReactNode }[] }) {
  return (
    <details className="group rounded-3xl border border-border bg-card p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-foreground"><BookOpen className="size-4 text-muted-foreground" aria-hidden />{titulo}<span className="ml-auto text-[12px] font-normal text-muted-foreground group-open:hidden">Mostrar</span><span className="ml-auto hidden text-[12px] font-normal text-muted-foreground group-open:inline">Ocultar</span></summary>
      <dl className="mt-3 grid gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-2">
        {items.map(({ termino, significado }) => <div key={termino}><dt className="font-semibold text-foreground">{termino}</dt><dd className="text-muted-foreground">{significado}</dd></div>)}
      </dl>
    </details>
  )
}

export interface ParteBarra { clave: string; etiqueta: string; valor: number; clase: string; detalle?: string }

/** Barra apilada de proporciones con su leyenda y cantidades. */
export function BarraEstados({ partes, formato }: { partes: ParteBarra[]; formato: (v: number) => string }) {
  const total = partes.reduce((suma, p) => suma + p.valor, 0)
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={partes.map(p => `${p.etiqueta}: ${formato(p.valor)}`).join(', ')}>
        {total > 0 && partes.filter(p => p.valor > 0).map(p => <div key={p.clave} className={p.clase} style={{ width: `${(p.valor / total) * 100}%` }} title={`${p.etiqueta}: ${formato(p.valor)}`} />)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        {partes.map(p => <span key={p.clave} className="inline-flex items-center gap-1.5"><span aria-hidden className={clsx('size-2.5 rounded-full', p.clase)} />{p.etiqueta} <strong className="font-semibold text-foreground">{formato(p.valor)}</strong>{p.detalle && <span>· {p.detalle}</span>}</span>)}
      </div>
    </div>
  )
}
