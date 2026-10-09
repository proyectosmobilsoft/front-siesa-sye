import { etiquetaEstado } from './filters'
import { useQuery } from '@tanstack/react-query'
import { rcAnomaliasApi, type RcAnomalo } from '@/api/rcAnomalias'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { formatters } from '@/utils/formatters'
import { ayudaAnomalias, etiqueta, moneda, severidadColor, valorLegible } from './presentation'

const columnasDescuento = ['factura', 'cond', 'dias', 'porcentaje', 'esperado', 'aplicado']
const aliasDescuento: Record<string, string[]> = {
  factura: ['factura', 'documento'], cond: ['cond', 'condicion', 'condicion_pago'],
  dias: ['dias', 'días'], porcentaje: ['porcentaje', 'pct', 'porcentaje_descuento', 'pct_descuento'],
  esperado: ['esperado', 'valor_esperado', 'descuento_esperado'],
  aplicado: ['aplicado', 'valor_aplicado', 'descuento_aplicado'],
}
function tablaDescuento(detalle: Record<string, unknown>) {
  const listas = Object.values(detalle).filter(Array.isArray) as unknown[][]
  const filas = listas.find(lista => lista.some(v => v && typeof v === 'object' && ('factura' in v || 'documento' in v)))
  if (!filas) return null
  return <div className="overflow-x-auto"><table className="min-w-full text-xs"><thead className="bg-muted/50"><tr>{['Factura', 'Cond.', 'Días', '%', 'Esperado', 'Aplicado'].map(t => <th key={t} className="px-2 py-1.5 text-left">{t}</th>)}</tr></thead><tbody>{filas.map((fila, i) => {
    const obj = fila as Record<string, unknown>
    return <tr key={i} className="border-t border-border">{columnasDescuento.map(col => {
      const key = aliasDescuento[col].find(alias => alias in obj)
      return <td key={col} className={`px-2 py-1.5 ${col === 'esperado' || col === 'aplicado' ? 'text-right tabular-nums' : ''}`}>{valorLegible(key ? obj[key] : null, col)}</td>
    })}</tr>
  })}</tbody></table></div>
}
function Datos({ data }: { data: Record<string, unknown> }) {
  return <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">{Object.entries(data).map(([key, value]) => <div key={key} className="flex min-w-0 justify-between gap-2 border-b border-border/60 py-1"><dt className="text-muted-foreground">{etiqueta(key)}</dt><dd className="max-w-[65%] break-words text-right tabular-nums">{valorLegible(value, key)}</dd></div>)}</dl>
}
export function RcAnomaloModal({ rc, onClose }: { rc: RcAnomalo; onClose: () => void }) {
  const lineas = useQuery({ queryKey: ['rc-anomalias', 'lineas', rc.rowid], queryFn: () => rcAnomaliasApi.lineas(rc.rowid), retry: 1 })
  const mostrarLibros = lineas.data?.lineas.some(l => Number(l.db2) !== Number(l.db) || Number(l.cr2) !== Number(l.cr) || Number(l.db3) !== Number(l.db) || Number(l.cr3) !== Number(l.cr)) ?? false
  return <Modal isOpen onClose={onClose} title={`RC ${rc.co}-${rc.tipo}-${rc.numero}`} className="max-w-6xl">
    <div className="space-y-4 text-sm">
      <div className="grid gap-2 rounded-lg bg-muted/40 p-3 text-xs sm:grid-cols-3">
        <div><span className="text-muted-foreground">Fecha</span><p className="font-medium">{formatters.dateOnly(rc.fecha)}</p></div>
        <div><span className="text-muted-foreground">Cliente</span><p className="font-medium">{rc.cliente || '—'} · NIT {rc.nit || '—'}</p></div>
        <div><span className="text-muted-foreground">Estado / origen</span><p className="font-medium">{etiquetaEstado(rc.estado)} · {rc.canal ?? rc.origen}</p></div>
      </div>
      <section className="space-y-2"><h3 className="font-semibold">Anomalías ({rc.anomalias.length})</h3>{rc.anomalias.map((a, i) => <div key={`${a.codigo}-${i}`} className={`rounded-lg border p-3 ${severidadColor[a.severidad]}`}><div className="flex flex-wrap items-center gap-2"><strong>{a.codigo.replace(/_/g, ' ')}</strong><span className="text-xs uppercase">{a.severidad}</span></div><p className="mt-1">{a.mensaje}</p><p className="mt-1 text-xs opacity-85">{ayudaAnomalias[a.codigo]}</p>{Object.keys(a.detalle ?? {}).length > 0 && <div className="mt-2 rounded-md bg-card p-2 text-foreground">{a.codigo === 'DESCUENTO_DISTINTO' && tablaDescuento(a.detalle)}<Datos data={a.detalle} /></div>}</div>)}</section>
      <section className="space-y-2"><h3 className="font-semibold">Líneas contables</h3>
        {lineas.isPending && <p className="text-muted-foreground">Cargando líneas…</p>}
        {lineas.isError && <p role="alert" className="text-destructive">No se pudieron cargar las líneas. <Button size="sm" variant="outline" onClick={() => void lineas.refetch()}>Reintentar</Button></p>}
        {lineas.data && <><Datos data={lineas.data.cabecera} /><div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[760px] text-xs"><thead className="bg-muted/50"><tr>{['Cuenta', 'Descripción', 'Tercero', 'Sucursal', 'SA', 'Débito', 'Crédito', ...(mostrarLibros ? ['Débito L2', 'Crédito L2', 'Débito L3', 'Crédito L3'] : [])].map((h, i) => <th key={h} className={`px-2 py-2 ${i >= 5 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead><tbody>{lineas.data.lineas.map((l, i) => <tr key={i} className="border-t border-border"><td className="px-2 py-1.5">{l.cuenta}</td><td className="px-2 py-1.5">{l.descripcion || '—'}</td><td className="px-2 py-1.5">{l.tercero || '—'}</td><td className="px-2 py-1.5">{l.sucursal || '—'}</td><td className="px-2 py-1.5">{l.sa ? `${l.sa.documento || l.sa.rowid}${l.sa.anticipo != null ? ` · ${moneda(l.sa.anticipo)}` : ''}` : l.ind_mov_sa || '—'}</td>{[l.db, l.cr, ...(mostrarLibros ? [l.db2, l.cr2, l.db3, l.cr3] : [])].map((v, j) => <td key={j} className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{moneda(v)}</td>)}</tr>)}</tbody><tfoot className="border-t border-border bg-muted/40 font-semibold"><tr><td colSpan={5} className="px-2 py-2">Totales de líneas</td>{(['db', 'cr', ...(mostrarLibros ? ['db2', 'cr2', 'db3', 'cr3'] : [])] as (keyof Pick<typeof lineas.data.lineas[number], 'db' | 'cr' | 'db2' | 'cr2' | 'db3' | 'cr3'>)[]).map(k => <td key={k} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{moneda(lineas.data!.lineas.reduce((sum, l) => sum + (Number(l[k]) || 0), 0))}</td>)}</tr></tfoot></table></div><p className="text-xs text-muted-foreground">{mostrarLibros ? 'Se muestran los libros 2 y 3 porque sus movimientos difieren del libro 1.' : 'Libros 2 y 3 sin diferencias frente al libro 1.'}</p>{Object.keys(lineas.data.totales).length > 0 && <div><h4 className="mb-1 text-xs font-semibold">Totales del servicio</h4><Datos data={lineas.data.totales} /></div>}</>}
      </section>
      {lineas.data && <section className="space-y-2"><h3 className="font-semibold">Medios de pago</h3>{lineas.data.medios.length ? <div className="space-y-1">{lineas.data.medios.map((medio, i) => <div key={i} className="rounded-md border border-border p-2"><Datos data={medio} /></div>)}</div> : <p className="text-xs text-muted-foreground">Sin medios de pago.</p>}</section>}
    </div>
  </Modal>
}
