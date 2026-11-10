import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { CalendarRange } from 'lucide-react'
import { apiClient } from '@/api/client'
import { Modal } from '@/components/ui/modal'
import { BarrasApiladas } from './graficas'
import { PALETA, dinero, porcentaje } from './formato'

/** Tipos de periodo: cuántos meses dura cada uno. */
const TIPOS = [
  { id: 'mes', nombre: 'Mes', meses: 1 },
  { id: 'bimestre', nombre: 'Bimestre', meses: 2 },
  { id: 'trimestre', nombre: 'Trimestre', meses: 3 },
  { id: 'semestre', nombre: 'Semestre', meses: 6 },
  { id: 'anio', nombre: 'Año', meses: 12 },
] as const
type Tipo = (typeof TIPOS)[number]['id']
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const dos = (n: number) => String(n).padStart(2, '0')
/** Primer año con datos de cartera y ventas en SIESA (la primera factura es del 14/01/2019). */
const PRIMER_ANIO = 2019
const aniosDisponibles = (actual: number) => Array.from({ length: actual - PRIMER_ANIO + 1 }, (_, i) => actual - i)
const hoyIso = () => { const d = new Date(); return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}` }

const mesesDe = (tipo: Tipo) => TIPOS.find(t => t.id === tipo)!.meses
/** Opciones del tipo (T1…T4, Ene…Dic, etc.). `n` empieza en 0. */
function opciones(tipo: Tipo) {
  const m = mesesDe(tipo)
  return Array.from({ length: 12 / m }, (_, n) => {
    const ini = n * m
    const corto = tipo === 'mes' ? MESES[ini] : tipo === 'anio' ? 'Año completo' : `${tipo === 'bimestre' ? 'B' : tipo === 'trimestre' ? 'T' : 'S'}${n + 1}`
    const detalle = m === 1 ? MESES_LARGO[ini] : `${MESES[ini]}–${MESES[ini + m - 1]}`
    return { n, corto, detalle }
  })
}
/** Rango de fechas del periodo; si termina en el futuro, se corta en hoy. */
function rangoPeriodo(tipo: Tipo, n: number, anio: number) {
  const m = mesesDe(tipo)
  const ini = n * m
  const ultimo = new Date(anio, ini + m, 0).getDate()
  const desde = `${anio}-${dos(ini + 1)}-01`
  const hastaCompleto = `${anio}-${dos(ini + m)}-${dos(ultimo)}`
  const hoy = hoyIso()
  return { desde, hasta: hastaCompleto > hoy ? hoy : hastaCompleto, enCurso: hastaCompleto > hoy && desde <= hoy, futuro: desde > hoy }
}
const nombrePeriodo = (tipo: Tipo, n: number, anio: number) => {
  const o = opciones(tipo)[n]
  return tipo === 'anio' ? String(anio) : `${tipo === 'mes' ? o.detalle : o.corto} ${anio}`
}

type Metricas = { ventas?: number; credito?: number; cobrado?: number; inicial?: number; final?: number }
const METRICAS: { clave: keyof Metricas; nombre: string; ayuda: string; subirEsBueno: boolean }[] = [
  { clave: 'ventas', nombre: 'Ventas (sin IVA)', ayuda: 'Venta total del periodo, regla de Ventas vs presupuesto', subirEsBueno: true },
  { clave: 'credito', nombre: 'Vendido a crédito', ayuda: 'Crédito neto de notas y devoluciones, sin ventas corporativas (con IVA)', subirEsBueno: true },
  { clave: 'cobrado', nombre: 'Cobrado (recaudo)', ayuda: 'Recibos de caja que cruzan facturas en el periodo', subirEsBueno: true },
  { clave: 'inicial', nombre: 'Saldo inicial de cartera', ayuda: 'Lo que se debía al empezar el periodo', subirEsBueno: false },
  { clave: 'final', nombre: 'Saldo final de cartera', ayuda: 'Lo que se debía al terminar el periodo', subirEsBueno: false },
]

const obtener = async <T,>(ruta: string, params: { desde: string; hasta: string }) =>
  (await apiClient.get<{ success: boolean; data: T }>(ruta, { params })).data.data

/** Compara el mismo periodo en varios años (ej. enero 2024, 2025 y 2026) con los números de los tableros existentes. */
function Comparar({ anioActual }: { anioActual: number }) {
  const [tipo, setTipo] = useState<Tipo>('mes')
  const [n, setN] = useState(new Date().getMonth() === 0 ? 0 : new Date().getMonth() - 1)
  const anios = [...aniosDisponibles(anioActual)].reverse()
  const [elegidos, setElegidos] = useState<number[]>([anioActual - 2, anioActual - 1, anioActual])
  const periodos = useMemo(() => [...elegidos].sort().map(a => ({ anio: a, ...rangoPeriodo(tipo, Math.min(n, 12 / mesesDe(tipo) - 1), a) })).filter(p => !p.futuro), [elegidos, tipo, n])
  const nn = Math.min(n, 12 / mesesDe(tipo) - 1)

  // Cuatro consultas por año, en paralelo; usan las mismas rutas (y caché) de los tableros.
  const consultas = useQueries({
    queries: periodos.flatMap(p => [
      { queryKey: ['dashboard-ventas', p.desde, p.hasta], queryFn: () => obtener<{ kpis: { venta: number } }>('/dashboard/ventas', p), staleTime: 5 * 60 * 1000 },
      { queryKey: ['dashboard-cartera', p.desde, p.hasta], queryFn: () => obtener<{ kpis: { venta_credito: number } }>('/dashboard/cartera', p), staleTime: 5 * 60 * 1000 },
      { queryKey: ['comparar-rc', p.desde, p.hasta], queryFn: () => obtener<{ kpis: { recaudo_cartera: number } }>('/dashboard/recibo-caja', p), staleTime: 5 * 60 * 1000 },
      { queryKey: ['dashboard-cartera-saldos', p.desde, p.hasta], queryFn: () => obtener<{ saldo_anterior: number; saldo_final: number }>('/dashboard/cartera/saldos', p), staleTime: 5 * 60 * 1000 },
    ]),
  })
  const filas = periodos.map((p, i) => {
    const [v, c, r, s] = consultas.slice(i * 4, i * 4 + 4)
    const m: Metricas = {
      ventas: (v?.data as { kpis: { venta: number } } | undefined)?.kpis.venta,
      credito: (c?.data as { kpis: { venta_credito: number } } | undefined)?.kpis.venta_credito,
      cobrado: (r?.data as { kpis: { recaudo_cartera: number } } | undefined)?.kpis.recaudo_cartera,
      inicial: (s?.data as { saldo_anterior: number } | undefined)?.saldo_anterior,
      final: (s?.data as { saldo_final: number } | undefined)?.saldo_final,
    }
    return { ...p, nombre: nombrePeriodo(tipo, nn, p.anio), m, cargando: [v, c, r, s].some(q => q?.isLoading) }
  })
  const cargando = filas.some(f => f.cargando)
  const grafica = METRICAS.filter(x => x.clave !== 'inicial').map(x => Object.fromEntries([['nombre', x.nombre], ...filas.map(f => [String(f.anio), f.m[x.clave] ?? 0])]))

  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-end gap-3">
      <TipoSelector tipo={tipo} alCambiar={t => { setTipo(t); setN(0) }} />
      <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">¿Cuál?
        <select value={nn} onChange={e => setN(Number(e.target.value))} className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground">
          {opciones(tipo).map(o => <option key={o.n} value={o.n}>{tipo === 'mes' ? o.detalle : `${o.corto} · ${o.detalle}`}</option>)}
        </select>
      </label>
      <div className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">Años a comparar
        <div className="flex flex-wrap gap-1.5">
          {anios.map(a => {
            const on = elegidos.includes(a)
            return <button key={a} type="button" aria-pressed={on} onClick={() => setElegidos(on ? elegidos.filter(x => x !== a) : [...elegidos, a].slice(-5))}
              className={`h-9 rounded-lg border px-3 text-sm ${on ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-input bg-background text-foreground hover:bg-muted'}`}>{on ? '✓ ' : ''}{a}</button>
          })}
        </div>
      </div>
    </div>

    {filas.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Elige al menos un año con datos.</p> : <>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-sm">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-border text-left text-[12px] font-medium text-muted-foreground">
              <th className="px-4 py-2.5">Métrica</th>
              {filas.map(f => <th key={f.anio} className="px-4 py-2.5 text-right">{f.nombre}{f.enCurso && <span className="block text-[10.5px] font-normal">(en curso, hasta hoy)</span>}</th>)}
            </tr>
          </thead>
          <tbody>
            {METRICAS.map(x => (
              <tr key={x.clave} className="border-b border-border/40">
                <td className="px-4 py-3"><span className="font-semibold">{x.nombre}</span><span className="block text-[11px] text-muted-foreground">{x.ayuda}</span></td>
                {filas.map((f, i) => {
                  const val = f.m[x.clave]
                  const prev = i > 0 ? filas[i - 1].m[x.clave] : undefined
                  const cambio = val != null && prev ? (val - prev) / prev : null
                  const bueno = cambio != null && (cambio >= 0) === x.subirEsBueno
                  return <td key={f.anio} className="px-4 py-3 text-right tabular-nums">
                    {val == null ? <span className="text-muted-foreground">{f.cargando ? 'Calculando…' : '—'}</span> : <span className="font-bold">{dinero(val)}</span>}
                    {cambio != null && <span className={`block text-[11.5px] font-semibold ${bueno ? 'text-emerald-600' : 'text-red-600'}`}>{cambio >= 0 ? '▲' : '▼'} {porcentaje(Math.abs(cambio), 0)} vs. {filas[i - 1].anio}</span>}
                  </td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <p className="text-[14px] font-black tracking-tight">Lado a lado</p>
        <p className="mb-2 text-[12px] text-muted-foreground">Un color por año{cargando ? ' · calculando…' : ''}</p>
        <BarrasApiladas agrupadas datos={grafica} ejeX="nombre" series={filas.map((f, i) => ({ clave: String(f.anio), nombre: f.nombre, color: PALETA[i % PALETA.length] }))} formato={dinero} altura={300} />
      </div>
      <p className="text-[11.5px] text-muted-foreground">Cada año puede tardar unos segundos la primera vez (se calcula con SIESA); después queda en caché. El recaudo respeta el C.O. elegido arriba; ventas y cartera son de toda la empresa. Los datos de SIESA empiezan el 14/01/2019, por eso el saldo inicial de enero de 2019 es $0.</p>
    </>}
  </div>
}

function TipoSelector({ tipo, alCambiar }: { tipo: Tipo; alCambiar: (t: Tipo) => void }) {
  return <div className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">Tipo
    <div className="flex rounded-xl bg-muted p-1">
      {TIPOS.map(t => <button key={t.id} type="button" onClick={() => alCambiar(t.id)} aria-pressed={tipo === t.id}
        className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${tipo === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{t.nombre}</button>)}
    </div>
  </div>
}

/** Botón "Periodo": elegir mes, bimestre, trimestre, semestre o año de un clic, o comparar el mismo periodo entre años. */
export function BotonPeriodo({ alAplicar }: { alAplicar: (rango: { desde: string; hasta: string }) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [pestana, setPestana] = useState<'elegir' | 'comparar'>('elegir')
  const anioActual = new Date().getFullYear()
  const [tipo, setTipo] = useState<Tipo>('trimestre')
  const [anio, setAnio] = useState(anioActual)
  const [n, setN] = useState<number | null>(null)
  const lista = opciones(tipo)
  const elegido = n == null ? null : rangoPeriodo(tipo, n, anio)

  return <>
    <button type="button" onClick={() => setAbierto(true)} className="flex h-10 items-center gap-2 rounded-xl border border-input bg-card px-3.5 text-[13px] font-semibold text-foreground shadow-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
      <CalendarRange className="h-4 w-4 text-primary" aria-hidden="true" /> Periodo y comparar
    </button>
    {abierto && <Modal isOpen onClose={() => setAbierto(false)} title="Periodo" className="max-w-5xl">
      <div className="mb-4 inline-flex rounded-xl bg-muted p-1" role="tablist">
        {([['elegir', 'Elegir periodo'], ['comparar', 'Comparar años']] as const).map(([v, t]) => (
          <button key={v} type="button" role="tab" aria-selected={pestana === v} onClick={() => setPestana(v)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${pestana === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
        ))}
      </div>

      {pestana === 'elegir' ? <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <TipoSelector tipo={tipo} alCambiar={t => { setTipo(t); setN(t === 'anio' ? 0 : null) }} />
          <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">Año
            <select value={anio} onChange={e => setAnio(Number(e.target.value))} className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground">
              {aniosDisponibles(anioActual).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>
        <div className={`grid gap-2 ${lista.length >= 6 ? 'grid-cols-3 sm:grid-cols-6' : lista.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
          {lista.map(o => {
            const r = rangoPeriodo(tipo, o.n, anio)
            return <button key={o.n} type="button" disabled={r.futuro} onClick={() => setN(o.n)} aria-pressed={n === o.n}
              className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${n === o.n ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/60 hover:bg-muted/40'}`}>
              <span className="block text-base font-black">{o.corto}</span>
              <span className="block text-[12px] text-muted-foreground">{o.detalle}{r.enCurso ? ' · en curso' : ''}</span>
            </button>
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-[13px] text-muted-foreground">{elegido ? <>Del <strong className="text-foreground">{elegido.desde.split('-').reverse().join('/')}</strong> al <strong className="text-foreground">{elegido.hasta.split('-').reverse().join('/')}</strong>{elegido.enCurso && ' (hasta hoy)'}</> : 'Elige un periodo'}</p>
          <button type="button" disabled={!elegido} onClick={() => { if (elegido) { alAplicar({ desde: elegido.desde, hasta: elegido.hasta }); setAbierto(false) } }}
            className="h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40">Aplicar al tablero</button>
        </div>
      </div> : <Comparar anioActual={anioActual} />}
    </Modal>}
  </>
}
