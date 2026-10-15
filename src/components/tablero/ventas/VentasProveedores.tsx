import { Bloque, Malla, Tabla, Tarjeta } from '../comun'
import { BarrasH, Dona } from '../graficas'
import { PALETA, dinero, entero, etiquetaMes, porcentaje } from '../formato'
import type { DashboardVentas } from './tipos'
import { AYUDAS } from './ayudas'

const variacion = (a: number, b: number) => b ? (a - b) / b : null

export function VentasProveedores({ d }: { d: DashboardVentas }) {
  const proveedores = d.proveedores.filter(p => p.proveedor !== 'OTROS PROVEEDORES')
  const top = proveedores.slice(0, 5)
  const meses = [...new Set(d.mensual.map(m => m.mes))]
  const otros = d.proveedores.find(p => p.proveedor === 'OTROS PROVEEDORES')
  const filas = [...proveedores.slice(0, 30), ...(otros ? [otros] : [])]
  const total = d.kpis.venta
  const maximo = Math.max(1, ...filas.flatMap(p => p.mensual.map(m => m.venta)))
  const foco = d.cobertura.lineas_foco
  const colorFoco = new Map(foco.map((l, i) => [l.id, PALETA[i % PALETA.length]]))
  return <div className="flex flex-col gap-4">
    <Malla columnas={5}>
      <Tarjeta etiqueta="Venta total" valor={dinero(total)} ayuda={AYUDAS.venta} />
      <Tarjeta etiqueta="Proveedores con venta" valor={`${entero(proveedores.filter(p => p.venta > 0).length)}${otros && otros.venta > 0 ? '+' : ''}`} nota={otros && otros.venta > 0 ? 'El resto está agrupado' : undefined} ayuda={{ fuente: AYUDAS.proveedor.fuente, formula: 'Conteo de proveedores del top 30 con venta > 0; + indica otros agrupados' }} />
      <Tarjeta etiqueta="Participación del proveedor #1" valor={top[0] ? porcentaje(top[0].participacion) : '—'} nota={top[0]?.proveedor} ayuda={AYUDAS.proveedor} />
      <Tarjeta etiqueta="Concentración top 5" valor={porcentaje(top.reduce((s, p) => s + p.participacion, 0))} ayuda={{ fuente: AYUDAS.proveedor.fuente, formula: 'Σ participación de los 5 proveedores con más venta' }} />
      <Tarjeta etiqueta="Variación vs periodo anterior" valor={variacion(total, d.kpis.venta_previa) == null ? '—' : porcentaje(variacion(total, d.kpis.venta_previa) ?? 0)} ayuda={{ fuente: AYUDAS.venta.fuente, formula: '(venta actual − venta anterior) ÷ venta anterior' }} />
    </Malla>
    <Malla columnas={2}>
      <Bloque titulo="Top 15 proveedores" ayuda={{ fuente: AYUDAS.proveedor.fuente, formula: 'Σ venta sin IVA por proveedor; orden descendente.' }}><BarrasH datos={proveedores.slice(0, 15).map(p => ({ nombre: p.proveedor, valor: p.venta }))} formato={dinero} anchoEtiqueta={160} /></Bloque>
      <Bloque titulo="Participación" ayuda={AYUDAS.proveedor}><Dona datos={[...top.map((p, i) => ({ nombre: p.proveedor, valor: p.venta, color: PALETA[i] })), { nombre: 'Otros', valor: Math.max(0, total - top.reduce((s, p) => s + p.venta, 0)), color: PALETA[5] }]} formato={dinero} /></Bloque>
    </Malla>
    <Bloque titulo="Venta mensual por proveedor" ayuda={{ fuente: AYUDAS.proveedor.fuente, formula: 'Σ venta de cada proveedor por mes; variación = (último mes − anterior) ÷ anterior.' }}><div className="overflow-x-auto"><table className="min-w-full text-[13px]"><thead className="sticky top-0 z-20 bg-card"><tr><th className="sticky left-0 z-30 bg-card p-2 text-left">Proveedor</th>{meses.map(m => <th key={m} className="whitespace-nowrap p-2 text-right">{etiquetaMes(m)}</th>)}<th className="p-2 text-right">Total</th><th className="whitespace-nowrap p-2 text-right">Var. último mes</th></tr></thead><tbody>{[...filas, { proveedor: 'Total', venta: total, mensual: meses.map(m => ({ mes: m, venta: d.mensual.find(x => x.mes === m)?.venta ?? 0 })) }].map(p => { const valores = meses.map(m => p.mensual.find(x => x.mes === m)?.venta ?? 0); const v = valores.length > 1 ? variacion(valores[valores.length - 1], valores[valores.length - 2]) : null; return <tr key={p.proveedor} className={`border-t border-border ${p.proveedor === 'Total' ? 'font-semibold' : ''}`}><th className="sticky left-0 z-10 min-w-36 bg-card p-2 text-left">{p.proveedor}</th>{valores.map((n, i) => <td key={meses[i]} className="whitespace-nowrap p-2 text-right tabular-nums" style={{ backgroundImage: `linear-gradient(to right, hsl(var(--primary) / .09) ${Math.max(0, n / maximo * 100)}%, transparent 0)` }}>{dinero(n)}</td>)}<td className="whitespace-nowrap p-2 text-right">{dinero(p.venta)}</td><td className={`p-2 text-right ${v == null ? '' : v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{v == null ? '—' : porcentaje(v)}</td></tr> })}</tbody></table></div></Bloque>
    <Bloque titulo="Cobertura de líneas foco por asesor" ayuda={AYUDAS.cobertura}><Tabla filas={d.cobertura.asesores} clave={a => a.asesor} columnas={[
      { titulo: 'Asesor', celda: a => <span className="font-medium text-foreground">{a.asesor}</span> }, { titulo: 'Clientes', alinear: 'der', celda: a => entero(a.clientes) },
      { titulo: 'Compran 1', alinear: 'der', celda: a => entero(a.con_1) }, { titulo: 'Compran 2', alinear: 'der', celda: a => entero(a.con_2) }, { titulo: 'Compran 3', alinear: 'der', celda: a => entero(a.con_3) }, { titulo: 'Compran 4', alinear: 'der', celda: a => entero(a.con_4) },
      { titulo: '% compra ≥2', alinear: 'der', celda: a => a.clientes ? porcentaje((a.con_2 + a.con_3 + a.con_4) / a.clientes) : '—' },
    ]} /></Bloque>
    <Bloque titulo="Clientes con más venta en líneas foco" ayuda={{ fuente: AYUDAS.cobertura.fuente, formula: 'Σ venta de las cuatro líneas foco por cliente; líneas sin compra = oportunidad de venta cruzada.' }}><Tabla filas={d.cobertura.clientes} clave={c => `${c.nit}-${c.cliente}`} columnas={[
      { titulo: 'Cliente', celda: c => <span><span className="block font-medium text-foreground">{c.cliente}</span><span className="font-mono text-[11px] text-muted-foreground">{c.nit}</span></span> },
      { titulo: 'Asesor', celda: c => c.asesor }, { titulo: 'Venta foco', alinear: 'der', celda: c => dinero(c.venta_foco) },
      { titulo: 'Líneas foco', celda: c => <span className="flex flex-wrap gap-1">{foco.map(l => { const compra = c.lineas_foco.includes(l.id) || c.lineas_foco.includes(l.nombre); return <span key={l.id} className={`rounded-full px-2 py-0.5 text-[11px] ${compra ? 'bg-primary/10' : 'bg-muted text-muted-foreground line-through'}`} style={compra ? { color: colorFoco.get(l.id) } : undefined}>{l.nombre}</span> })}</span> },
    ]} /></Bloque>
  </div>
}
