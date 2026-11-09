import type { LucideIcon } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { porcentaje } from '../formato'

type Tono = 'cyan' | 'emerald' | 'rose' | 'amber'
const tonos: Record<Tono, { icono: string; grafica: string; cambioBueno: string; cambioMalo: string }> = {
  cyan: { icono: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400', grafica: '#0891b2', cambioBueno: 'text-emerald-600 dark:text-emerald-400', cambioMalo: 'text-rose-600 dark:text-rose-400' },
  emerald: { icono: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', grafica: '#059669', cambioBueno: 'text-emerald-600 dark:text-emerald-400', cambioMalo: 'text-rose-600 dark:text-rose-400' },
  rose: { icono: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', grafica: '#e11d48', cambioBueno: 'text-emerald-600 dark:text-emerald-400', cambioMalo: 'text-rose-600 dark:text-rose-400' },
  amber: { icono: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', grafica: '#d97706', cambioBueno: 'text-emerald-600 dark:text-emerald-400', cambioMalo: 'text-rose-600 dark:text-rose-400' },
}

export function KpiCartera({ titulo, valor, nota, icono: Icono, tono, serie, actual, anterior, subirEsBueno = true, alAbrir, sinComparacion = 'Sin comparación mensual', etiquetaAnterior = 'mes anterior' }: {
  titulo: string; valor: string; nota: string; icono: LucideIcon; tono: Tono; serie?: number[];
  actual?: number; anterior?: number; subirEsBueno?: boolean; alAbrir?: () => void
  /** Texto cuando no hay comparación (ej. rango de varios meses). */ sinComparacion?: string
  /** Con qué se compara (ej. "agosto"). */ etiquetaAnterior?: string
}) {
  const estilo = tonos[tono]
  const cambio = actual != null && anterior != null && anterior > 0 ? (actual - anterior) / anterior : null
  const contenido = <>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[0.625rem] font-black uppercase tracking-widest text-muted-foreground">{titulo}</p>
        <p className="mt-1 break-words text-3xl font-black tracking-tight tabular-nums text-foreground">{valor}</p>
        <p className="mt-1 text-xs text-muted-foreground">{nota}</p>
      </div>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${estilo.icono}`}><Icono className="h-6 w-6" aria-hidden="true" /></div>
    </div>
    <div className="mt-3 flex min-h-9 items-end justify-between gap-2">
      <span className={`text-xs font-bold ${cambio == null ? 'text-muted-foreground' : ((cambio >= 0) === subirEsBueno ? estilo.cambioBueno : estilo.cambioMalo)}`}>
        {cambio == null ? sinComparacion : `${cambio >= 0 ? '▲' : '▼'} ${porcentaje(Math.abs(cambio), 0)} vs. ${etiquetaAnterior}`}
      </span>
      {serie && serie.length > 1 && <div className="h-9 w-24 shrink-0" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><LineChart data={serie.map(valorSerie => ({ valorSerie }))}><Line dataKey="valorSerie" type="monotone" stroke={estilo.grafica} strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>}
    </div>
  </>
  const clase = 'min-w-0 rounded-2xl bg-card p-5 text-left shadow-sm transition-shadow hover:shadow-md'
  return alAbrir ? <button type="button" onClick={alAbrir} className={`${clase} w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`} aria-label={`${titulo}: ${valor}. ${nota}. Ver detalle`}>{contenido}</button> : <div className={clase}>{contenido}</div>
}
