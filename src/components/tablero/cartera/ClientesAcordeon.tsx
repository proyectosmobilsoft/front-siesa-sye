import { Fragment, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { BotonExcel } from '@/components/ui/boton-excel'
import { decimal, dinero, entero, porcentaje } from '../formato'
import type { FacturaCartera } from '../ventas/tipos'

const fecha = (s: string | null) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—')
const pct = (v: number) => porcentaje(v, 0)
/** Saldo chico que queda por redondeos o descuentos mal aplicados: sigue abierto hasta que se le haga una NC. */
export const RESIDUO = 10000
const EtiquetaResiduo = () => <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200" title="Saldo menor a $10.000: hay que cerrarlo con una nota crédito (NC)">Residuo · hacer NC</span>

/**
 * Clientes en acordeón (mismo patrón que los conductores de Recibo de caja): cada fila es un cliente con sus totales;
 * al tocarla se despliegan debajo sus facturas pendientes. Agrupa las facturas que le pasen (ya sin ventas corporativas).
 */
export function ClientesAcordeon({ facturas }: { facturas: FacturaCartera[] }) {
  const [abierto, setAbierto] = useState<number | null>(null)
  const clientes = useMemo(() => {
    const m = new Map<number, { tercero: number; cliente: string; nit: string | null; facturas: FacturaCartera[]; saldo: number; mora: number; condiciones: Set<string> }>()
    for (const f of facturas) {
      const c = m.get(f.tercero) ?? { tercero: f.tercero, cliente: f.cliente ?? f.nit ?? String(f.tercero), nit: f.nit, facturas: [], saldo: 0, mora: 0, condiciones: new Set<string>() }
      c.facturas.push(f); c.saldo += f.saldo; c.mora = Math.max(c.mora, f.dias_vs_vencimiento ?? 0); c.condiciones.add(f.condicion)
      m.set(f.tercero, c)
    }
    const minimo = (l: (string | null)[]) => l.filter((v): v is string => !!v).sort()[0] ?? null
    const maximo = (l: (string | null)[]) => l.filter((v): v is string => !!v).sort().reverse()[0] ?? null
    return [...m.values()].map(c => ({
      ...c, desde: minimo(c.facturas.map(f => f.emision)), hasta: maximo(c.facturas.map(f => f.emision)), vence: minimo(c.facturas.map(f => f.vencimiento)),
    })).sort((a, b) => b.saldo - a.saldo)
  }, [facturas])
  const total = clientes.reduce((s, c) => s + c.saldo, 0)

  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-sm">
      <div className="flex justify-end px-3 pt-2"><BotonExcel nombre="clientes-cartera" className="h-7 px-2 text-[11px]" /></div>
      <table className="w-full text-[13.5px]">
        <thead>
          <tr className="border-b border-border text-left text-[12px] font-medium text-muted-foreground">
            <th className="px-4 py-2.5">Cliente</th>
            <th className="px-4 py-2.5">NIT</th>
            <th className="px-4 py-2.5">Emitidas</th>
            <th className="px-4 py-2.5">Venció</th>
            <th className="hidden px-4 py-2.5 lg:table-cell">Condición</th>
            <th className="px-4 py-2.5 text-right">Facturas</th>
            <th className="px-4 py-2.5 text-right">Saldo</th>
            <th className="hidden px-4 py-2.5 text-right sm:table-cell">%</th>
            <th className="px-4 py-2.5 text-right">Atraso máx.</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map(c => {
            const esta = abierto === c.tercero
            return (
              <Fragment key={c.tercero}>
                <tr onClick={() => setAbierto(esta ? null : c.tercero)} aria-expanded={esta}
                  className={`cursor-pointer border-b border-border/40 transition-colors ${esta ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <motion.div animate={{ rotate: esta ? 90 : 0 }} transition={{ type: 'spring', stiffness: 350, damping: 24 }} className="flex-shrink-0 text-muted-foreground/70">
                        <ChevronRight className="h-4 w-4" />
                      </motion.div>
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{c.cliente.charAt(0).toUpperCase()}</div>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold text-foreground">{c.cliente}</span>
                        <span className="text-[11px] text-muted-foreground">{entero(c.facturas.length)} factura{c.facturas.length !== 1 ? 's' : ''} pendiente{c.facturas.length !== 1 ? 's' : ''}{c.facturas.some(f => f.saldo < RESIDUO) && <EtiquetaResiduo />}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12.5px] text-foreground">{c.nit ?? '—'}</td>
                  <td className="px-4 py-3 text-[12.5px] whitespace-nowrap">{c.desde === c.hasta ? fecha(c.desde) : <>{fecha(c.desde)}<span className="block text-muted-foreground">a {fecha(c.hasta)}</span></>}</td>
                  <td className="px-4 py-3 text-[12.5px] whitespace-nowrap">{fecha(c.vence)}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">{[...c.condiciones].map(k => <span key={k} className="mr-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11.5px] font-semibold">{k}</span>)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{entero(c.facturas.length)}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary tabular-nums">{dinero(c.saldo)}</td>
                  <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{pct(total ? c.saldo / total : 0)}</td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${c.mora > 90 ? 'text-red-600' : c.mora > 30 ? 'text-amber-600' : 'text-foreground'}`}>{entero(c.mora)} d</td>
                </tr>
                <AnimatePresence initial={false}>
                  {esta && (
                    <tr>
                      <td colSpan={9} className="bg-muted/20 p-0">
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                          <div className="px-4 py-3 sm:pl-16">
                            <table className="w-full text-[13px]">
                              <thead>
                                <tr className="text-left text-[11.5px] text-muted-foreground">
                                  <th className="py-1.5 pr-3">Factura</th><th className="py-1.5 pr-3">Condición de pago</th><th className="py-1.5 pr-3">Emisión</th>
                                  <th className="py-1.5 pr-3">Venció</th><th className="py-1.5 pr-3 text-right">Atraso</th><th className="py-1.5 pr-3 text-right">Valor</th><th className="py-1.5 text-right">Saldo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.facturas.map(f => (
                                  <tr key={f.id} className="border-t border-border/40">
                                    <td className="py-2 pr-3 font-medium">{f.factura}</td>
                                    <td className="py-2 pr-3"><span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11.5px] font-semibold">{f.condicion}</span> <span className="text-[12px] text-muted-foreground">{f.condicion_nombre}</span></td>
                                    <td className="py-2 pr-3">{fecha(f.emision)}</td>
                                    <td className="py-2 pr-3">{fecha(f.vencimiento)}</td>
                                    <td className="py-2 pr-3 text-right tabular-nums">{decimal(f.dias_vs_vencimiento ?? 0, 0)} d</td>
                                    <td className="py-2 pr-3 text-right tabular-nums">{dinero(f.valor)}</td>
                                    <td className="py-2 text-right font-semibold tabular-nums">{dinero(f.saldo)}{f.saldo < RESIDUO && <EtiquetaResiduo />}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </Fragment>
            )
          })}
        </tbody>
        {clientes.length > 1 && (
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/60 font-bold">
              <td colSpan={5} className="px-4 py-3">Totales <span className="ml-2 text-[11px] font-semibold text-muted-foreground">{entero(clientes.length)} clientes · {entero(facturas.length)} facturas</span></td>
              <td className="px-4 py-3 text-right tabular-nums">{entero(facturas.length)}</td>
              <td className="px-4 py-3 text-right text-primary tabular-nums">{dinero(total)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
