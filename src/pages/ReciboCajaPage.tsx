import { useState, useMemo } from 'react'
import { Search, FileText, Calendar, Hash, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { apiClient } from '@/api/client'

interface ReciboCaja {
  Rowid: number
  Fecha: string
  'C.O.': string
  Tipo_Docto: string
  Número: number
  Débitos: number
  Créditos: number
  Estado: string
  Id_tercero: string
  Razón_Social: string
  Caja: string
}

const LIMIT = 50

const ESTADO_OPTIONS = [
  { value: 0, label: 'Todos' },
  { value: 1, label: 'En proceso' },
  { value: 2, label: 'Anulado' },
  { value: 3, label: 'Aprobado' },
]

const formatFecha = (iso: string) => iso?.slice(0, 10) ?? '—'

const formatMoneda = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const estadoBadge = (estado: string) => {
  if (estado === 'Aprobado') return 'bg-green-500/15 text-green-700 dark:text-green-400'
  if (estado === 'Anulado')  return 'bg-red-500/15 text-red-600 dark:text-red-400'
  return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
}

export const ReciboCajaPage = () => {
  const [tipodoc, setTipodoc]     = useState('RC')
  const [estado, setEstado]       = useState(0)
  const [numero, setNumero]       = useState(0)
  const [razonSocial, setRazonSocial] = useState('')

  const [data, setData]       = useState<ReciboCaja[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [buscado, setBuscado] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchRecibos = async (p: number = 1) => {
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        p_cia: 1,
        p_idco: '001',
        p_origen: 13,
        p_numero: numero,
        p_rowid_tercero: '0',
        page: p,
        limit: LIMIT,
      }
      if (estado !== 0) body.p_estado = estado
      if (tipodoc.trim()) body.p_idtipodoc = tipodoc.trim().toUpperCase()

      const res = await apiClient.post<{ success: boolean; total: number; data: ReciboCaja[] }>(
        '/recibo-caja/listar', body
      )
      setData(res.data.data ?? [])
      setTotal(res.data.total ?? 0)
      setPage(p)
      setBuscado(true)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'Error al consultar recibos'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleConsultar = () => fetchRecibos(1)
  const handleKeyDown   = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleConsultar() }

  const filas = useMemo(() => {
    if (!razonSocial.trim()) return data
    const q = razonSocial.toLowerCase()
    return data.filter(r => r.Razón_Social?.toLowerCase().includes(q))
  }, [data, razonSocial])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
          <FileText className="text-primary" size={24} />
          Recibo de Caja
        </h1>
        <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">
          Tesorería · Consulta de recibos
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground font-black">
            Filtros de búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Tipo de documento
              </label>
              <Input
                placeholder="RC, RCC..."
                value={tipodoc}
                onChange={e => setTipodoc(e.target.value)}
                onKeyDown={handleKeyDown}
                className="font-mono uppercase text-sm h-9"
                maxLength={10}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Estado
              </label>
              <select
                value={estado}
                onChange={e => setEstado(Number(e.target.value))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ESTADO_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Número (0 = todos)
              </label>
              <Input
                type="number"
                min={0}
                value={numero}
                onChange={e => setNumero(Number(e.target.value))}
                onKeyDown={handleKeyDown}
                className="font-mono text-sm h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Razón Social <span className="normal-case font-normal text-muted-foreground/50">(opcional)</span>
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrar resultados..."
                  value={razonSocial}
                  onChange={e => setRazonSocial(e.target.value)}
                  className="pl-8 text-sm h-9"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button
                className="w-full gap-2 font-black uppercase tracking-wider text-xs h-9"
                onClick={handleConsultar}
                disabled={loading}
              >
                {loading
                  ? <><div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Consultando...</>
                  : <><Search size={14} /> Consultar</>
                }
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold">
          {error}
        </div>
      )}

      {/* Tabla */}
      {buscado && !error && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground font-black">
                  Resultados
                </CardTitle>
                <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {total} registros
                </span>
              </div>
              {/* Paginación header */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-bold">
                    Pág. {page} de {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline" size="sm"
                      className="h-7 w-7 p-0"
                      disabled={page <= 1 || loading}
                      onClick={() => fetchRecibos(page - 1)}
                    >
                      <ChevronLeft size={14} />
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="h-7 w-7 p-0"
                      disabled={page >= totalPages || loading}
                      onClick={() => fetchRecibos(page + 1)}
                    >
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/30">
                    <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fecha</th>
                    <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tipo</th>
                    <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Número</th>
                    <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Razón Social</th>
                    <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Caja</th>
                    <th className="text-right py-3 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total</th>
                    <th className="text-center py-3 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                        No se encontraron resultados
                      </td>
                    </tr>
                  ) : (
                    filas.map(r => (
                      <tr key={r.Rowid} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={11} className="shrink-0" />
                            {formatFecha(r.Fecha)}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-xs">{r.Tipo_Docto}</td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-primary">
                            <Hash size={11} className="shrink-0" />
                            {r.Número}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-[220px]">
                          <p className="font-medium text-xs truncate">{r.Razón_Social}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{r.Id_tercero}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{r.Caja}</td>
                        <td className="py-3 px-4 text-right font-mono text-xs font-bold">{formatMoneda(r.Créditos)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', estadoBadge(r.Estado))}>
                            {r.Estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-accent/10">
                <p className="text-[11px] text-muted-foreground font-bold">
                  {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total} registros
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline" size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page <= 1 || loading}
                    onClick={() => fetchRecibos(page - 1)}
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  {/* Números de página (máx 5 visibles) */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                    .reduce<(number | '...')[]>((acc, n, i, arr) => {
                      if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...')
                      acc.push(n)
                      return acc
                    }, [])
                    .map((n, i) =>
                      n === '...'
                        ? <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                        : <Button
                            key={n}
                            variant={n === page ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 w-7 p-0 text-xs"
                            onClick={() => fetchRecibos(n as number)}
                            disabled={loading}
                          >
                            {n}
                          </Button>
                    )
                  }
                  <Button
                    variant="outline" size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page >= totalPages || loading}
                    onClick={() => fetchRecibos(page + 1)}
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
