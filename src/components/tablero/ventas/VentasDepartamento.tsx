import { Fragment, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, MapPin } from 'lucide-react'
import { Bloque } from '../comun'
import { BarrasH3D, Dona3D } from '../graficas3d'
import { Lectura } from '../Guia'
import { PALETA, dinero, entero, porcentaje } from '../formato'
import type { DashboardVentas } from './tipos'

const pct = (v: number | null | undefined) => (v == null ? '—' : porcentaje(v, 1))
const fecha = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
const FUENTE = 'SIESA: misma regla de venta del tablero (sin IVA, notas restan, RMA sin facturar). Departamento y ciudad del contacto principal del cliente (t200 → t015).'

function Lista({ titulo, filas, total }: { titulo: string; filas: { nombre: string; venta: number }[]; total: number }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[11px] font-black tracking-widest text-muted-foreground uppercase">{titulo}</p>
      <ul className="flex flex-col gap-1.5">
        {filas.slice(0, 8).map(f => (
          <li key={f.nombre} className="text-[12.5px]">
            <div className="flex justify-between gap-2"><span className="truncate" title={f.nombre}>{f.nombre}</span><span className="shrink-0 font-semibold tabular-nums">{dinero(f.venta)}</span></div>
            <div className="mt-0.5 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary/70" style={{ width: `${total ? Math.max((f.venta / total) * 100, 1) : 0}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Ventas por departamento: ranking, participación y, al tocar uno, sus ciudades, vendedores, líneas y clientes. */
export function VentasDepartamento({ d, soloTabla = false, alVerMas }: { d: DashboardVentas; /** En el Resumen: solo la tabla en acordeón. */ soloTabla?: boolean; alVerMas?: () => void }) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const deps = d.por_departamento ?? []
  const total = deps.reduce((s, x) => s + x.venta, 0)
  const top = deps[0]
  const fuera = deps.filter(x => x.departamento !== top?.departamento && !x.departamento.startsWith('Venta de mostrador') && x.departamento !== 'SIN DEPARTAMENTO')
  const ventaFuera = fuera.reduce((s, x) => s + x.venta, 0)
  const rango = `del ${fecha(d.desde)} al ${fecha(d.hasta)}`
  return <div className="flex flex-col gap-4">
    {soloTabla && <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-[15px] font-black tracking-tight">Ventas por departamento <span className="text-[13px] font-normal text-muted-foreground">· {rango}, sin IVA</span></h2>
      {alVerMas && <button type="button" onClick={alVerMas} className="text-sm font-semibold text-primary hover:underline">Ver gráficas →</button>}
    </div>}
    {!soloTabla && top && <Lectura frases={[
      <><strong className="text-foreground">{top.departamento}</strong> concentra el <strong className="text-foreground">{pct(top.participacion)}</strong> de la venta ({dinero(top.venta)}, {entero(top.clientes)} clientes).</>,
      <>Fuera de {top.departamento} se vendió <strong className="text-foreground">{dinero(ventaFuera)}</strong> ({pct(total ? ventaFuera / total : null)}) en {entero(fuera.length)} departamentos; el mayor es <strong className="text-foreground">{fuera[0]?.departamento ?? '—'}</strong>.</>,
    ]} />}
    {!soloTabla && <div className="grid gap-4 xl:grid-cols-3">
      <Bloque className="xl:col-span-2" titulo="Venta por departamento" descripcion={`${rango}, sin IVA; toca un departamento en la tabla de abajo para ver su detalle`} ayuda={{ fuente: FUENTE, formula: 'Σ venta del periodo de los clientes de cada departamento' }}>
        <BarrasH3D datos={deps.map((x, i) => ({ nombre: x.departamento, valor: x.venta, color: PALETA[i % PALETA.length] }))} formato={dinero} nombreValor="Venta" anchoEtiqueta={170} />
      </Bloque>
      <Bloque titulo="Participación" descripcion="% de la venta total" ayuda={{ fuente: FUENTE, formula: 'Venta del departamento ÷ venta total' }}>
        <Dona3D datos={deps.slice(0, 6).concat(deps.length > 6 ? [{ ...deps[6], departamento: 'Otros', venta: deps.slice(6).reduce((s, x) => s + x.venta, 0) }] : []).map((x, i) => ({ nombre: x.departamento, valor: x.venta, color: PALETA[i % PALETA.length] }))}
          formato={dinero} altura={300} centro={top?.departamento ?? ''} porcentajeCentro={top?.participacion ?? null} />
      </Bloque>
    </div>}
    <div className="overflow-x-auto rounded-2xl bg-card shadow-sm">
      <table className="w-full text-[13.5px]">
        <thead>
          <tr className="border-b border-border text-left text-[12px] font-medium text-muted-foreground">
            <th className="px-4 py-2.5">Departamento</th><th className="px-4 py-2.5 text-right">Venta</th><th className="px-4 py-2.5 text-right">%</th>
            <th className="px-4 py-2.5 text-right">Clientes</th><th className="hidden px-4 py-2.5 md:table-cell">Ciudad principal</th><th className="hidden px-4 py-2.5 lg:table-cell">Vendedor principal</th>
          </tr>
        </thead>
        <tbody>
          {deps.map(x => {
            const esta = abierto === x.departamento
            return (
              <Fragment key={x.departamento}>
                <tr onClick={() => setAbierto(esta ? null : x.departamento)} aria-expanded={esta} className={`cursor-pointer border-b border-border/40 transition-colors ${esta ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <motion.div animate={{ rotate: esta ? 90 : 0 }} transition={{ type: 'spring', stiffness: 350, damping: 24 }} className="text-muted-foreground/70"><ChevronRight className="h-4 w-4" /></motion.div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><MapPin className="h-4 w-4" /></div>
                      <span className="font-semibold">{x.departamento}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-primary tabular-nums">{dinero(x.venta)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{pct(x.participacion)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{entero(x.clientes)}</td>
                  <td className="hidden px-4 py-3 md:table-cell">{x.ciudades[0]?.nombre ?? '—'}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">{x.vendedores[0]?.nombre ?? '—'}</td>
                </tr>
                <AnimatePresence initial={false}>
                  {esta && (
                    <tr><td colSpan={6} className="bg-muted/20 p-0">
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="grid gap-5 px-4 py-4 sm:pl-16 md:grid-cols-2 xl:grid-cols-4">
                          <Lista titulo="Ciudades" filas={x.ciudades} total={x.venta} />
                          <Lista titulo="Vendedores" filas={x.vendedores} total={x.venta} />
                          <Lista titulo="Líneas" filas={x.lineas} total={x.venta} />
                          <Lista titulo="Clientes" filas={x.top_clientes.map(c => ({ nombre: c.ciudad ? `${c.cliente} · ${c.ciudad}` : c.cliente, venta: c.venta }))} total={x.venta} />
                        </div>
                      </motion.div>
                    </td></tr>
                  )}
                </AnimatePresence>
              </Fragment>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/60 font-bold">
            <td className="px-4 py-3">Total <span className="ml-2 text-[11px] font-semibold text-muted-foreground">{entero(deps.length)} departamentos</span></td>
            <td className="px-4 py-3 text-right text-primary tabular-nums">{dinero(total)}</td><td className="px-4 py-3 text-right">100 %</td><td colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
}
