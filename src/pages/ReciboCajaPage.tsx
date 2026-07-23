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
  ? 'bg-green-500/15 text-green-700 dark:text-green-400'
  : estado === 'Anulado' ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'

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
    <div className="min-w-[850px] bg-[#f5f5f5] p-3 text-[12px] text-[#161616] dark:bg-[#171717] dark:text-gray-100 sm:p-5">
      <div className="mx-auto max-w-[1420px] border border-[#b7c6d1] bg-white shadow-sm dark:border-gray-700 dark:bg-[#202020]">
        <div className="flex items-end border-b border-[#9caebc] bg-[#fafafa] px-2 pt-2 dark:border-gray-700 dark:bg-[#252525]">
          <button onClick={() => setTab('general')} className={cn('border border-b-0 px-5 py-2 text-[14px]', tab === 'general' ? 'border-[#9caebc] bg-[#064b82] text-white' : 'bg-[#eeeeee] text-[#084579] dark:bg-[#333]')}>General</button>
          <button onClick={() => setTab('detalle')} className={cn('border-b-0 px-2 py-2 text-[11px] font-semibold', tab === 'detalle' ? 'border border-b-0 bg-white text-[#064b82] dark:bg-[#202020]' : 'text-[#064b82]')}>Detalle</button>
          <div className="ml-2 flex items-center gap-1 border-l border-[#aaa] pl-2 pb-2 text-[13px] font-bold">Saldo Anterior <span className="ml-1 border border-[#c4c4c4] bg-white px-4 py-1 font-mono font-normal text-blue-700 dark:bg-[#292929]">{money(saldoAnterior)}</span></div>
          <div className="ml-4 hidden items-center gap-2 pb-2 font-bold md:flex">Cuadre de Caja No. <span className="border border-[#c9c9c9] bg-white px-4 py-1 font-mono text-red-500 dark:bg-[#292929]">00000641</span></div>
          <div className="ml-auto flex items-center gap-1 pb-2 pr-3 text-[11px] font-semibold"><span className="text-[17px]">▣</span> Anexo de Cuadre</div>
        </div>

        {tab === 'general' ? <>
          <div className="grid items-end gap-x-3 gap-y-2 px-3 py-3 md:grid-cols-[315px_300px_1fr]">
            <label className="flex items-center gap-2">Caja<select value={caja} onChange={e => setCaja(e.target.value)} className="h-7 min-w-0 flex-1 border border-[#b9b9b9] bg-white px-1 dark:bg-[#292929]"><option>CAJA SUCURSAL PORTAL DE SOLEDAD</option><option>CAJA PRINCIPAL</option></select></label>
            <label className="flex items-center gap-2">Fecha<div className="flex"><Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="h-7 rounded-none border-[#b9b9b9] px-1 text-[12px]" /><span className="flex h-7 items-center border border-l-0 border-[#b9b9b9] px-1">▦</span></div></label>
            <Button className="h-7 w-[120px] rounded-none border border-[#275e8b] bg-[#d8e7f1] px-2 text-[12px] font-normal text-[#111] hover:bg-[#c6dce9]">🔍 Consultar</Button>
          </div>
          <div className="grid gap-2 border-b border-[#aaa] px-3 pb-2 md:grid-cols-[1fr_420px]"><label className="flex items-center gap-3 font-bold uppercase">Fecha último cuadre caja <span className="w-full border border-[#c4c4c4] bg-white px-2 py-1 text-right font-normal normal-case dark:bg-[#292929]">domingo, 21 de junio de 2026</span></label><div className="flex items-center justify-center gap-3"><span>Centro <b className="border border-[#c4c4c4] bg-white px-4 py-1 font-normal dark:bg-[#292929]">002</b></span><span>Cuenta <b className="border border-[#c4c4c4] bg-white px-4 py-1 font-normal dark:bg-[#292929]">11050502</b></span><b className="border border-[#c4c4c4] bg-white px-4 py-1 font-normal dark:bg-[#292929]">9002</b></div></div>
          <div className="flex justify-end px-3 py-2"><span className="w-[165px] bg-red-600 py-1 text-center text-white">Periodo Cerrado</span></div>
          <div className="overflow-x-auto px-3 pb-2"><table className="w-full min-w-[760px] border-collapse border border-[#151515]"><thead><tr className="bg-[#064b82] text-white"><th className="w-[30%] border border-[#777] px-1 py-1 font-normal">Descripción o concepto</th>{['Efectivo', 'Tarjetas', 'Consignado', 'Total', 'Anticipo x Dev'].map(h => <th key={h} className="border border-[#777] px-1 py-1 font-normal">{h}</th>)}</tr></thead><tbody>{lines.map((line, rowIndex) => <tr key={line.label} className={cn(line.kind === 'income-total' || line.kind === 'expense-total' ? 'bg-[#c8def2] font-bold' : line.kind === 'flow' ? 'bg-[#dcebf7] font-bold' : rowIndex === 0 ? 'bg-[#d7e9f8] text-blue-800' : '')}><td className="border border-[#c4c4c4] px-1 py-[2px]">{line.label}</td>{line.values.map((value, colIndex) => <td key={`${line.label}-${colIndex}`} className="border border-[#c4c4c4] px-1 py-[2px] text-right font-mono">{rowIndex === 0 && colIndex === 0 ? <BoardInput value={value} onChange={setVentasEfectivo} /> : rowIndex === 0 && colIndex === 1 ? <BoardInput value={value} onChange={setVentasTarjetas} /> : rowIndex === 0 && colIndex === 2 ? <BoardInput value={value} onChange={setVentasConsignado} /> : rowIndex === 1 && colIndex === 2 ? <BoardInput value={value} onChange={setRecaudos} /> : money(value)}</td>)}<td className="border border-[#c4c4c4] px-1 py-[2px] text-right font-mono">{money(line.values.reduce((sum, n) => sum + n, 0))}</td><td className="border border-[#c4c4c4] px-1 py-[2px] text-right font-mono">0.00</td></tr>)}</tbody></table></div>
          <div className="grid gap-2 px-5 pb-3 pt-1 lg:grid-cols-2"><label className="flex items-center gap-2">Responsable Caja <span className="flex-1 border border-[#c4c4c4] bg-white px-2 py-1 text-blue-800 dark:bg-[#292929]">PEREZ POLANCO ANDRES ARTURO</span></label><label className="flex items-center gap-2">Cédula <span className="border border-[#c4c4c4] bg-white px-3 py-1 font-mono dark:bg-[#292929]">1140848342</span></label></div>
          <div className="grid items-end gap-3 border-t border-[#aaa] px-5 py-3 lg:grid-cols-[160px_160px_160px_1fr]">{[['Disponible En Caja Según Sistema', disponible], ['Efectivo según Arqueo de Caja', 0], ['Sobrante/Faltante En caja', 0]].map(([label, value], index) => <label key={label as string} className={cn('text-[10px] font-bold', index === 2 ? 'text-red-700' : '')}>{label as string}<span className="mt-1 block border border-[#aaa] bg-white px-2 py-2 text-right font-mono text-[14px] font-bold text-[#064b82] dark:bg-[#292929]">{money(value as number)}</span></label>)}<div className="flex justify-end gap-4 border border-[#aaa] p-3 text-lg"><span title="Imprimir">▣</span><span title="Imprimir">▣</span><span title="Exportar">▧</span><span title="Abrir">▱</span></div></div>
        </> : <History data={filas} total={total} page={page} totalPages={totalPages} loading={loading} error={error} tipodoc={tipodoc} setTipodoc={setTipodoc} estado={estado} setEstado={setEstado} numero={numero} setNumero={setNumero} razonSocial={razonSocial} setRazonSocial={setRazonSocial} fetchRecibos={fetchRecibos} />}
      </div>
    </div>
  )
}

const BoardInput = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => <input aria-label="Valor editable" value={money(value)} onChange={event => onChange(amount(event.target.value))} className="w-full min-w-[76px] bg-transparent text-right font-mono text-[11px] text-blue-800 underline decoration-dotted outline-none dark:text-blue-300" />

function History(props: { data: ReciboCaja[]; total: number; page: number; totalPages: number; loading: boolean; error: string | null; tipodoc: string; setTipodoc: (v: string) => void; estado: number; setEstado: (v: number) => void; numero: number; setNumero: (v: number) => void; razonSocial: string; setRazonSocial: (v: string) => void; fetchRecibos: (p?: number) => void }) {
  const { data, total, page, totalPages, loading, error, tipodoc, setTipodoc, estado, setEstado, numero, setNumero, razonSocial, setRazonSocial, fetchRecibos } = props
  return <div className="p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><FileText size={17} className="text-[#064b82]" /><strong>Recibos registrados ({total})</strong></div><div className="flex flex-wrap gap-2"><Input className="h-8 w-24 text-xs" value={tipodoc} onChange={e => setTipodoc(e.target.value)} placeholder="Tipo" /><select value={estado} onChange={e => setEstado(Number(e.target.value))} className="h-8 border border-input bg-background px-2 text-xs">{ESTADO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><Input className="h-8 w-24 text-xs" type="number" value={numero} onChange={e => setNumero(Number(e.target.value))} /><div className="relative"><Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="h-8 w-40 pl-7 text-xs" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="Tercero" /></div><Button size="sm" className="h-8 gap-1 rounded-none text-xs" onClick={() => fetchRecibos(1)} disabled={loading}><Search size={13} /> Consultar</Button></div></div>{error && <p className="mb-3 border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/25">{['Fecha', 'Tipo', 'Número', 'Razón social', 'Caja', 'Total', 'Estado'].map((h, i) => <th key={h} className={cn('px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground', i === 5 ? 'text-right' : i === 6 ? 'text-center' : 'text-left')}>{h}</th>)}</tr></thead><tbody>{data.length === 0 ? <tr><td colSpan={7} className="py-14 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Consulta para ver recibos registrados</td></tr> : data.map(r => <tr key={r.Rowid} className="border-b border-border/50 hover:bg-muted/20"><td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{r.Fecha?.slice(0, 10)}</td><td className="px-4 py-3 font-mono text-xs font-black">{r.Tipo_Docto}</td><td className="px-4 py-3 font-mono text-xs font-bold text-primary"><span className="flex items-center gap-1.5"><Hash size={11} />{r.Número}</span></td><td className="max-w-[220px] px-4 py-3"><p className="truncate text-xs font-medium">{r.Razón_Social}</p><p className="font-mono text-[10px] text-muted-foreground">{r.Id_tercero}</p></td><td className="px-4 py-3 text-xs text-muted-foreground">{r.Caja}</td><td className="px-4 py-3 text-right font-mono text-xs font-bold">{money(r.Créditos)}</td><td className="px-4 py-3 text-center"><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase', estadoBadge(r.Estado))}>{r.Estado}</span></td></tr>)}</tbody></table></div>{totalPages > 1 && <div className="flex items-center justify-between border-t border-border px-4 py-3"><p className="text-[11px] font-bold text-muted-foreground">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total}</p><div className="flex gap-1"><Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1 || loading} onClick={() => fetchRecibos(page - 1)}><ChevronLeft size={14} /></Button><Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages || loading} onClick={() => fetchRecibos(page + 1)}><ChevronRight size={14} /></Button></div></div>}</div>
}
