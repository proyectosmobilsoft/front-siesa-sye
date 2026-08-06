import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Hash, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { apiClient } from '@/api/client'

interface ReciboCaja {
  Rowid: number; Fecha: string; 'C.O.': string; Tipo_Docto: string; Número: number
  Débitos: number; Créditos: number; Estado: string; Id_tercero: string; Razón_Social: string; Caja: string
}

type BoardLine = { label: string; kind?: 'income-total' | 'expense-total' | 'flow'; values: [number, number, number] }
const LIMIT = 50
const MONEY = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money = (n: number) => MONEY.format(n)
const amount = (v: string) => Number(v.replace(/\D/g, '')) || 0

const ESTADO_OPTIONS = [
  { value: 0, label: 'Todos' }, { value: 1, label: 'En proceso' },
  { value: 2, label: 'Anulado' }, { value: 3, label: 'Aprobado' },
]

const estadoBadge = (estado: string) => estado === 'Aprobado'
  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
  : estado === 'Anulado' ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'

export const ReciboCajaPage = () => {
  const [tab, setTab] = useState<'general' | 'detalle'>('general')
  const [caja, setCaja] = useState('CAJA SUCURSAL PORTAL DE SOLEDAD')
  const [fecha, setFecha] = useState('2026-05-05')
  const [ventasEfectivo, setVentasEfectivo] = useState(16126)
  const [ventasTarjetas, setVentasTarjetas] = useState(131148)
  const [ventasConsignado, setVentasConsignado] = useState(1176198)
  const [recaudos, setRecaudos] = useState(130005)
  const saldoAnterior = -44444992.58

  const [tipodoc, setTipodoc] = useState('RC')
  const [estado, setEstado] = useState(0)
  const [numero, setNumero] = useState(0)
  const [razonSocial, setRazonSocial] = useState('')
  const [data, setData] = useState<ReciboCaja[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const ingresos: [number, number, number] = [ventasEfectivo, ventasTarjetas, ventasConsignado]
  const totalIngresos = ingresos.reduce((sum, value) => sum + value, 0) + recaudos
  const flujo = totalIngresos
  const disponible = saldoAnterior + flujo

  const lines: BoardLine[] = [
    { label: 'Ventas del Día', values: ingresos },
    { label: 'Recaudos Cartera', values: [0, 0, recaudos] },
    { label: 'FLUJO DEL DÍA  ===>', kind: 'flow', values: [ventasEfectivo, ventasTarjetas, ventasConsignado + recaudos] },
  ]

  const fetchRecibos = async (p = 1) => {
    setLoading(true); setError(null)
    try {
      const body: Record<string, unknown> = { p_cia: 1, p_idco: '001', p_origen: 13, p_numero: numero, p_rowid_tercero: '0', page: p, limit: LIMIT }
      if (estado !== 0) body.p_estado = estado
      if (tipodoc.trim()) body.p_idtipodoc = tipodoc.trim().toUpperCase()
      const res = await apiClient.post<{ success: boolean; total: number; data: ReciboCaja[] }>('/recibo-caja/listar', body)
      setData(res.data.data ?? []); setTotal(res.data.total ?? 0); setPage(p)
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string; error?: string } } }
      setError(apiError.response?.data?.message ?? apiError.response?.data?.error ?? 'Error al consultar recibos')
    } finally { setLoading(false) }
  }

  const filas = useMemo(() => !razonSocial.trim() ? data : data.filter(r => r.Razón_Social?.toLowerCase().includes(razonSocial.toLowerCase())), [data, razonSocial])

  return (
    <div className="min-w-[850px] bg-muted/40 p-4 text-[12px] text-foreground sm:p-8">
      <div className="mx-auto max-w-[1420px] overflow-hidden rounded-lg border border-border bg-card shadow-2xl shadow-black/10 ring-1 ring-black/[0.03] dark:shadow-black/50 dark:ring-white/5">
        {/* Header: tabs + identificación del cuadre */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-muted/50 px-4 pt-3">
          <div className="flex items-end gap-1">
            <button onClick={() => setTab('general')} className={cn('rounded-t-md border border-b-0 px-5 py-2.5 text-[14px] font-medium transition-colors', tab === 'general' ? 'border-border bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-primary hover:bg-muted/70')}>General</button>
            <button onClick={() => setTab('detalle')} className={cn('rounded-t-md border-b-0 px-4 py-2.5 text-[11px] font-semibold transition-colors', tab === 'detalle' ? 'border border-b-0 bg-card text-primary shadow-sm' : 'text-primary hover:text-primary/70')}>Detalle</button>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 pb-2.5">
            <FieldChip label="Saldo anterior" value={money(saldoAnterior)} tone="primary" />
            <FieldChip label="Cuadre de caja N.°" value="00000641" tone="destructive" className="hidden md:flex" />
            <button className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-muted/60 hover:text-foreground">
              <span className="text-[15px] leading-none">▣</span> Anexo de Cuadre
            </button>
          </div>
        </div>

        {tab === 'general' ? <div className="flex flex-col gap-5 p-5">
          {/* Toolbar de consulta + estado del período */}
          <section className="flex flex-wrap items-end justify-between gap-4 rounded-md border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Caja</span>
                <select value={caja} onChange={e => setCaja(e.target.value)} className="h-8 w-[280px] rounded-sm border border-input bg-card px-1.5 shadow-inner shadow-black/5 transition-colors focus:border-primary focus:outline-none"><option>CAJA SUCURSAL PORTAL DE SOLEDAD</option><option>CAJA PRINCIPAL</option></select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Fecha</span>
                <div className="flex"><Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="h-8 w-[150px] rounded-sm rounded-r-none border-input px-1.5 text-[12px] shadow-inner shadow-black/5 transition-colors focus-visible:border-primary focus-visible:ring-0" /><span className="flex h-8 items-center rounded-sm rounded-l-none border border-l-0 border-input px-1.5">▦</span></div>
              </label>
              <Button className="h-8 w-[120px] rounded-sm border border-primary/40 bg-primary/10 px-2 text-[12px] font-normal text-foreground shadow-sm transition-colors hover:bg-primary/20 hover:shadow active:bg-primary/30">🔍 Consultar</Button>
            </div>
            <span className="rounded-sm bg-destructive px-4 py-1.5 text-center text-[11px] font-semibold text-destructive-foreground shadow-sm">Periodo Cerrado</span>
          </section>

          {/* Datos del último cuadre */}
          <section className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/20 p-4">
            <FieldChip label="Fecha último cuadre caja" value="domingo, 21 de junio de 2026" className="mr-auto" />
            <FieldChip label="Centro" value="002" />
            <FieldChip label="Cuenta" value="11050502" />
            <FieldChip label="Auxiliar" value="9002" />
          </section>

          {/* Tablero de ventas / flujo del día */}
          <section className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse overflow-hidden rounded-md border border-border shadow-sm"><thead><tr className="bg-primary text-primary-foreground"><th className="w-[30%] border border-primary-foreground/20 px-2 py-2 font-medium tracking-wide">Descripción o concepto</th>{['Efectivo', 'Tarjetas', 'Consignado', 'Total', 'Anticipo x Dev'].map(h => <th key={h} className="border border-primary-foreground/20 px-2 py-2 font-medium tracking-wide">{h}</th>)}</tr></thead><tbody>{lines.map((line, rowIndex) => <tr key={line.label} className={cn('transition-colors', line.kind === 'income-total' || line.kind === 'expense-total' ? 'bg-primary/15 font-bold' : line.kind === 'flow' ? 'bg-primary/10 font-bold' : rowIndex === 0 ? 'bg-primary/[0.08] text-primary hover:bg-primary/[0.12]' : 'hover:bg-muted/40')}><td className="border border-border px-2 py-1.5">{line.label}</td>{line.values.map((value, colIndex) => <td key={`${line.label}-${colIndex}`} className="border border-border px-2 py-1.5 text-right font-mono">{rowIndex === 0 && colIndex === 0 ? <BoardInput value={value} onChange={setVentasEfectivo} /> : rowIndex === 0 && colIndex === 1 ? <BoardInput value={value} onChange={setVentasTarjetas} /> : rowIndex === 0 && colIndex === 2 ? <BoardInput value={value} onChange={setVentasConsignado} /> : rowIndex === 1 && colIndex === 2 ? <BoardInput value={value} onChange={setRecaudos} /> : money(value)}</td>)}<td className="border border-border px-2 py-1.5 text-right font-mono">{money(line.values.reduce((sum, n) => sum + n, 0))}</td><td className="border border-border px-2 py-1.5 text-right font-mono">0.00</td></tr>)}</tbody></table></section>

          {/* Responsable de caja */}
          <section className="grid gap-3 rounded-md border border-border bg-muted/20 p-4 sm:grid-cols-2">
            <FieldChip label="Responsable Caja" value="PEREZ POLANCO ANDRES ARTURO" className="w-full [&>span]:w-full [&>span]:text-primary" />
            <FieldChip label="Cédula" value="1140848342" />
          </section>

          {/* Totales y acciones */}
          <section className="flex flex-wrap items-end justify-between gap-4 rounded-md border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap gap-4">
              {[['Disponible En Caja Según Sistema', disponible], ['Efectivo según Arqueo de Caja', 0], ['Sobrante/Faltante En caja', 0]].map(([label, value], index) => (
                <label key={label as string} className={cn('flex flex-col gap-1.5 text-[10px] font-bold tracking-wide', index === 2 ? 'text-destructive' : 'text-muted-foreground')}>
                  {label as string}
                  <span className="rounded-sm border border-border bg-card px-3 py-2.5 text-right font-mono text-[14px] font-bold text-primary shadow-sm">{money(value as number)}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-4 rounded-md border border-border bg-card p-3 text-lg shadow-sm">{['Imprimir', 'Imprimir', 'Exportar', 'Abrir'].map((title, i) => <span key={i} title={title} className="cursor-pointer text-muted-foreground transition-transform hover:scale-110 hover:text-primary">{['▣', '▣', '▧', '▱'][i]}</span>)}</div>
          </section>
        </div> : <History data={filas} total={total} page={page} totalPages={totalPages} loading={loading} error={error} tipodoc={tipodoc} setTipodoc={setTipodoc} estado={estado} setEstado={setEstado} numero={numero} setNumero={setNumero} razonSocial={razonSocial} setRazonSocial={setRazonSocial} fetchRecibos={fetchRecibos} />}
      </div>
    </div>
  )
}

const FieldChip = ({ label, value, tone, className }: { label: string; value: string; tone?: 'primary' | 'destructive'; className?: string }) => (
  <div className={cn('flex items-center gap-2 text-[11px] font-semibold', className)}>
    <span className="text-muted-foreground">{label}</span>
    <span className={cn('rounded-sm border border-border bg-card px-3 py-1.5 font-mono font-normal shadow-inner shadow-black/5', tone === 'primary' ? 'text-primary' : tone === 'destructive' ? 'text-destructive' : 'text-foreground')}>{value}</span>
  </div>
)

const BoardInput = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => <input aria-label="Valor editable" value={money(value)} onChange={event => onChange(amount(event.target.value))} className="w-full min-w-[76px] bg-transparent text-right font-mono text-[11px] text-primary underline decoration-dotted outline-none transition-colors focus:decoration-solid focus:decoration-2" />

function History(props: { data: ReciboCaja[]; total: number; page: number; totalPages: number; loading: boolean; error: string | null; tipodoc: string; setTipodoc: (v: string) => void; estado: number; setEstado: (v: number) => void; numero: number; setNumero: (v: number) => void; razonSocial: string; setRazonSocial: (v: string) => void; fetchRecibos: (p?: number) => void }) {
  const { data, total, page, totalPages, loading, error, tipodoc, setTipodoc, estado, setEstado, numero, setNumero, razonSocial, setRazonSocial, fetchRecibos } = props
  return <div className="p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><FileText size={17} className="text-primary" /><strong>Recibos registrados ({total})</strong></div><div className="flex flex-wrap gap-2"><Input className="h-8 w-24 text-xs shadow-sm" value={tipodoc} onChange={e => setTipodoc(e.target.value)} placeholder="Tipo" /><select value={estado} onChange={e => setEstado(Number(e.target.value))} className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm">{ESTADO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><Input className="h-8 w-24 text-xs shadow-sm" type="number" value={numero} onChange={e => setNumero(Number(e.target.value))} /><div className="relative"><Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="h-8 w-40 pl-7 text-xs shadow-sm" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="Tercero" /></div><Button size="sm" className="h-8 gap-1 rounded-md text-xs shadow-sm" onClick={() => fetchRecibos(1)} disabled={loading}><Search size={13} /> Consultar</Button></div></div>{error && <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-bold text-destructive shadow-sm">{error}</p>}<div className="overflow-hidden rounded-md border border-border shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/40">{['Fecha', 'Tipo', 'Número', 'Razón social', 'Caja', 'Total', 'Estado'].map((h, i) => <th key={h} className={cn('px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground', i === 5 ? 'text-right' : i === 6 ? 'text-center' : 'text-left')}>{h}</th>)}</tr></thead><tbody>{data.length === 0 ? <tr><td colSpan={7} className="py-14 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Consulta para ver recibos registrados</td></tr> : data.map((r, i) => <tr key={r.Rowid} className={cn('border-b border-border/50 transition-colors hover:bg-muted/30', i % 2 === 1 && 'bg-muted/10')}><td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{r.Fecha?.slice(0, 10)}</td><td className="px-4 py-3 font-mono text-xs font-black">{r.Tipo_Docto}</td><td className="px-4 py-3 font-mono text-xs font-bold text-primary"><span className="flex items-center gap-1.5"><Hash size={11} />{r.Número}</span></td><td className="max-w-[220px] px-4 py-3"><p className="truncate text-xs font-medium">{r.Razón_Social}</p><p className="font-mono text-[10px] text-muted-foreground">{r.Id_tercero}</p></td><td className="px-4 py-3 text-xs text-muted-foreground">{r.Caja}</td><td className="px-4 py-3 text-right font-mono text-xs font-bold">{money(r.Créditos)}</td><td className="px-4 py-3 text-center"><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase', estadoBadge(r.Estado))}>{r.Estado}</span></td></tr>)}</tbody></table></div></div>{totalPages > 1 && <div className="flex items-center justify-between border-t border-border px-4 py-3"><p className="text-[11px] font-bold text-muted-foreground">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total}</p><div className="flex gap-1"><Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1 || loading} onClick={() => fetchRecibos(page - 1)}><ChevronLeft size={14} /></Button><Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages || loading} onClick={() => fetchRecibos(page + 1)}><ChevronRight size={14} /></Button></div></div>}</div>
}
