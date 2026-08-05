import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Hash,
  Search,
  RefreshCw,
  Receipt,
  Landmark,
  Calendar,
  User,
  Wallet,
  Printer,
  FileSpreadsheet,
  FolderOpen,
  Lock,
  Building2,
  Layers,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { apiClient } from '@/api/client'
import { maestroCajasApi, Caja } from '@/api/maestroCajas'
import { reciboCajaApi } from '@/api/reciboCaja'
import { ResumenConductoresDia, ReciboCajaUsuario } from '@/api/types'
import { formatters } from '@/utils/formatters'
import { useAuthStore } from '@/store/authStore'

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

type BoardLine = {
  label: string
  kind?: 'income-total' | 'expense-total' | 'flow'
  values: [number, number, number]
}

const LIMIT = 50
const MONEY = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money = (n: number) => MONEY.format(n)
const amount = (v: string) => Number(v.replace(/\D/g, '')) || 0
const hoyISO = () => new Date().toISOString().slice(0, 10)

const ESTADO_OPTIONS = [
  { value: 0, label: 'Todos los estados' },
  { value: 1, label: 'En proceso' },
  { value: 2, label: 'Anulado' },
  { value: 3, label: 'Aprobado' },
]

const estadoBadge = (estado: string) =>
  estado === 'Aprobado'
    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
    : estado === 'Anulado'
      ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'
      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20'

export const ReciboCajaPage = () => {
  const { sesion } = useAuthStore()
  const responsableNombre = sesion?.nombre_completo || sesion?.usuario || 'Usuario Autenticado'
  const responsableCedula = sesion?.id ? String(sesion.id) : '—'

  const [tab, setTab] = useState<'general' | 'conductores' | 'recibos'>('general')
  const [cajas, setCajas] = useState<Caja[]>([])
  const [caja, setCaja] = useState('')
  
  // Filtros de fecha General
  const [fechaDesde, setFechaDesde] = useState(hoyISO())
  const [fechaHasta, setFechaHasta] = useState('')
  const [consultado, setConsultado] = useState(false)
  const [cargandoGeneral, setCargandoGeneral] = useState(false)

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

  const [resumenConductores, setResumenConductores] = useState<ResumenConductoresDia | null>(null)
  const [loadingResumen, setLoadingResumen] = useState(false)

  const fetchResumenConductores = async () => {
    setLoadingResumen(true)
    try {
      const res = await reciboCajaApi.getResumenConductoresDia()
      setResumenConductores(res)
    } catch (err) {
      console.error('Error cargando resumen de RC por conductor:', err)
    } finally {
      setLoadingResumen(false)
    }
  }

  // Tablero en tiempo real: refresca cada 30s mientras el tab Conductores esté abierto.
  useEffect(() => {
    if (tab !== 'conductores') return
    fetchResumenConductores()
    const interval = setInterval(fetchResumenConductores, 30000)
    return () => clearInterval(interval)
  }, [tab])

  const handleConsultarGeneral = async () => {
    setCargandoGeneral(true)
    try {
      const fInicial = fechaDesde || hoyISO()
      const fFinal = fechaHasta || fInicial
      // Consultar resumen / RCs del periodo seleccionado (si no hay fechaHasta, se toma fInicial)
      const res = await reciboCajaApi.getResumenConductoresDia({
        fechaInicial: fInicial,
        fechaFinal: fFinal,
      })
      if (res && res.conductores) {
        const ef = res.conductores.reduce((acc, c) => acc + c.total_efectivo, 0)
        const cg = res.conductores.reduce((acc, c) => acc + c.total_consignacion, 0)
        if (ef > 0) setVentasEfectivo(ef)
        if (cg > 0) setVentasConsignado(cg)
      }
      setConsultado(true)
    } catch (err) {
      console.error('Error al consultar arqueo general:', err)
      setConsultado(true)
    } finally {
      setCargandoGeneral(false)
    }
  }

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
      const res = await apiClient.post<{ success: boolean; total: number; data: ReciboCaja[] }>('/recibo-caja/listar', body)
      setData(res.data.data ?? [])
      setTotal(res.data.total ?? 0)
      setPage(p)
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string; error?: string } } }
      setError(apiError.response?.data?.message ?? apiError.response?.data?.error ?? 'Error al consultar recibos')
    } finally {
      setLoading(false)
    }
  }

  const filas = useMemo(
    () => (!razonSocial.trim() ? data : data.filter((r) => r.Razón_Social?.toLowerCase().includes(razonSocial.toLowerCase()))),
    [data, razonSocial]
  )

  useEffect(() => {
    maestroCajasApi
      .listarCajas(true)
      .then((res) => {
        const lista = res.data ?? []
        setCajas(lista)
        if (lista.length > 0) setCaja(lista[0].nombre)
      })
      .catch((err) => console.error('Error cargando cajas del maestro:', err))
  }, [])

  const fechaFinalAplicada = fechaHasta || fechaDesde || hoyISO()

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ── Header de la vista ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Recibo de Caja & Arqueo</h1>
            <p className="text-xs text-muted-foreground">Consulta, arqueo diario y flujo de recaudos por caja y conductor</p>
          </div>
        </div>

        {/* Indicadores clave superiores */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3.5 py-2 shadow-xs">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Saldo Anterior:</span>
            <span className="font-mono font-bold text-primary">{money(saldoAnterior)}</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3.5 py-2 shadow-xs">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Cuadre N°:</span>
            <span className="font-mono font-bold text-red-600 dark:text-red-400">00000641</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 font-medium text-primary shadow-xs">
            <Layers className="h-3.5 w-3.5" />
            <span>Anexo de Cuadre</span>
          </div>
        </div>
      </div>

      {/* ── Contenedor principal con Navegación por pestañas ── */}
      <div className="space-y-6 rounded-2xl border border-border/60 bg-card shadow-sm">
        {/* Barra de Pestañas estilo píldora */}
        <div className="flex items-center border-b border-border/60 px-4 pt-3">
          <div className="flex space-x-1 rounded-xl bg-muted/60 p-1">
            <button
              onClick={() => setTab('general')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all',
                tab === 'general'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
              )}
            >
              <Landmark className="h-3.5 w-3.5" /> General
            </button>
            <button
              onClick={() => setTab('conductores')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all',
                tab === 'conductores'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
              )}
            >
              <User className="h-3.5 w-3.5" /> Conductores
            </button>
            <button
              onClick={() => setTab('recibos')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all',
                tab === 'recibos'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
              )}
            >
              <FileText className="h-3.5 w-3.5" /> Recibos
            </button>
          </div>
        </div>

        {/* ── PESTAÑA: GENERAL ── */}
        {tab === 'general' && (
          <div className="space-y-6 p-4 sm:p-6">
            {/* Filtros de la pestaña General */}
            <div className="grid items-end gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Caja</label>
                <div className="relative">
                  <Landmark className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Select value={caja} onChange={(e) => setCaja(e.target.value)} className="pl-9">
                    {cajas.length === 0 ? (
                      <option value="">Sin cajas configuradas</option>
                    ) : (
                      cajas.map((c) => (
                        <option key={c.id} value={c.nombre}>
                          {c.nombre}
                        </option>
                      ))
                    )}
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha Inicial</label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha Final (Opcional)</label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    placeholder="Hoy por defecto"
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <Button onClick={handleConsultarGeneral} disabled={cargandoGeneral} className="gap-2 self-end shadow-xs">
                <Search className={cn('h-3.5 w-3.5', cargandoGeneral && 'animate-spin')} />
                {cargandoGeneral ? 'Consultando...' : 'Consultar'}
              </Button>
            </div>

            {/* Fila de metadatos de último cuadre */}
            <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 text-xs lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 font-semibold text-muted-foreground">
                <span>Periodo consultado:</span>
                <span className="rounded-lg bg-muted/60 px-3 py-1 font-mono font-medium text-foreground">
                  {fechaDesde === fechaFinalAplicada ? fechaDesde : `${fechaDesde} — ${fechaFinalAplicada}`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-1">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Centro:</span>
                  <span className="font-mono font-bold text-foreground">002</span>
                </div>

                <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-1">
                  <span className="text-muted-foreground">Cuenta:</span>
                  <span className="font-mono font-bold text-foreground">11050502</span>
                </div>

                <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-1 font-mono font-bold text-foreground">
                  9002
                </div>

                <span className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 font-bold text-red-600 dark:text-red-400">
                  <Lock className="h-3 w-3" /> Periodo Cerrado
                </span>
              </div>
            </div>

            {/* Estado Inicial: Si NO ha consultado aún, mostrar tablero vacío con prompt */}
            {!consultado ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/10 py-16 text-center shadow-xs">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Search className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-foreground">El tablero de arqueo está listo</p>
                  <p className="max-w-md text-xs text-muted-foreground">
                    Seleccione la caja y el rango de fechas (si no especifica fecha final se tomará la fecha inicial/hoy por defecto) y presione <strong>Consultar</strong>.
                  </p>
                </div>
                <Button onClick={handleConsultarGeneral} disabled={cargandoGeneral} className="mt-2 gap-2 text-xs shadow-xs">
                  <Search className={cn('h-3.5 w-3.5', cargandoGeneral && 'animate-spin')} /> Consultar Arqueo
                </Button>
              </div>
            ) : (
              <>
                {/* Tabla Principal del Arqueo / Flujo General */}
                <div className="overflow-hidden rounded-xl border border-border/60 shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/60">
                          <th className="w-[35%] px-4 py-3 text-left font-semibold uppercase tracking-wide text-muted-foreground">
                            Descripción o concepto
                          </th>
                          {['Efectivo', 'Tarjetas', 'Consignado', 'Total', 'Anticipo x Dev'].map((h) => (
                            <th key={h} className="px-4 py-3 text-right font-semibold uppercase tracking-wide text-muted-foreground">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line, rowIndex) => (
                          <tr
                            key={line.label}
                            className={cn(
                              'border-b border-border/40 transition-colors',
                              line.kind === 'flow'
                                ? 'bg-primary/5 font-bold text-primary'
                                : 'hover:bg-muted/30'
                            )}
                          >
                            <td className="px-4 py-3 font-semibold">{line.label}</td>
                            {line.values.map((value, colIndex) => (
                              <td key={`${line.label}-${colIndex}`} className="px-4 py-3 text-right font-mono">
                                {rowIndex === 0 && colIndex === 0 ? (
                                  <BoardInput value={value} onChange={setVentasEfectivo} />
                                ) : rowIndex === 0 && colIndex === 1 ? (
                                  <BoardInput value={value} onChange={setVentasTarjetas} />
                                ) : rowIndex === 0 && colIndex === 2 ? (
                                  <BoardInput value={value} onChange={setVentasConsignado} />
                                ) : rowIndex === 1 && colIndex === 2 ? (
                                  <BoardInput value={value} onChange={setRecaudos} />
                                ) : (
                                  money(value)
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                              {money(line.values.reduce((sum, n) => sum + n, 0))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">0.00</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Fila de datos del Responsable (Persona autenticada en la sesión) */}
                <div className="grid gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-xs">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-muted-foreground">Responsable Caja (Usuario actual):</span>
                    <span className="font-bold text-foreground">{responsableNombre}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:justify-end">
                    <span className="font-semibold text-muted-foreground">ID Sesión / Cédula:</span>
                    <span className="font-mono font-bold text-foreground">{responsableCedula}</span>
                  </div>
                </div>

                {/* Tarjetas KPI de Totales de Arqueo y Botones de Acción */}
                <div className="grid gap-4 lg:grid-cols-4">
                  <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Disponible En Caja Según Sistema</p>
                    <p className="mt-1 font-mono text-lg font-extrabold text-primary">{money(disponible)}</p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Efectivo según Arqueo de Caja</p>
                    <p className="mt-1 font-mono text-lg font-extrabold text-foreground">{money(0)}</p>
                  </div>

                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 shadow-xs">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Sobrante/Faltante En caja</p>
                    <p className="mt-1 font-mono text-lg font-extrabold text-red-600 dark:text-red-400">{money(0)}</p>
                  </div>

                  {/* Botones de acción rápida */}
                  <div className="flex items-center justify-end gap-2 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                    <Button variant="outline" size="sm" title="Imprimir" className="h-9 w-9 p-0">
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" title="Imprimir Anexo" className="h-9 w-9 p-0">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" title="Exportar" className="h-9 w-9 p-0">
                      <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" title="Abrir" className="h-9 w-9 p-0">
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PESTAÑA: CONDUCTORES ── */}
        {tab === 'conductores' && (
          <div className="p-4 sm:p-6">
            <TableroConductoresRC resumen={resumenConductores} loading={loadingResumen} onRefresh={fetchResumenConductores} />
          </div>
        )}

        {/* ── PESTAÑA: RECIBOS ── */}
        {tab === 'recibos' && (
          <div className="p-4 sm:p-6">
            <History
              data={filas}
              total={total}
              page={page}
              totalPages={totalPages}
              loading={loading}
              error={error}
              tipodoc={tipodoc}
              setTipodoc={setTipodoc}
              estado={estado}
              setEstado={setEstado}
              numero={numero}
              setNumero={setNumero}
              razonSocial={razonSocial}
              setRazonSocial={setRazonSocial}
              fetchRecibos={fetchRecibos}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const BoardInput = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => (
  <input
    aria-label="Valor editable"
    value={money(value)}
    onChange={(event) => onChange(amount(event.target.value))}
    className="w-full min-w-[76px] rounded bg-muted/40 px-2 py-1 text-right font-mono text-xs font-semibold text-primary underline decoration-dotted underline-offset-4 outline-none transition-colors hover:bg-muted/80 focus:bg-background focus:ring-2 focus:ring-primary/20"
  />
)

function TableroConductoresRC({
  resumen,
  loading,
  onRefresh,
}: {
  resumen: ResumenConductoresDia | null
  loading: boolean
  onRefresh: () => void
}) {
  const conductores = resumen?.conductores ?? []
  const totales = conductores.reduce(
    (acc, c) => ({
      recibos: acc.recibos + c.recibos_count,
      efectivo: acc.efectivo + c.total_efectivo,
      consignacion: acc.consignacion + c.total_consignacion,
      total: acc.total + c.total,
    }),
    { recibos: 0, efectivo: 0, consignacion: 0, total: 0 }
  )

  const [expandido, setExpandido] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<Record<string, ReciboCajaUsuario[]>>({})
  const [cargando, setCargando] = useState<string | null>(null)

  const toggleConductor = async (usuario: string) => {
    if (expandido === usuario) {
      setExpandido(null)
      return
    }
    setExpandido(usuario)
    if (detalle[usuario]) return

    setCargando(usuario)
    try {
      const rc = await reciboCajaApi.getPorUsuario(usuario, {
        fechaInicial: resumen?.fecha_inicial,
        fechaFinal: resumen?.fecha_final,
        tipo: 'RC',
      })
      setDetalle((prev) => ({ ...prev, [usuario]: rc }))
    } catch (err) {
      console.error('Error cargando RC del conductor:', err)
      setDetalle((prev) => ({ ...prev, [usuario]: [] }))
    } finally {
      setCargando(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Resumen del tablero de conductores */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">
            RC de hoy por conductor ({conductores.length})
          </h2>
          {resumen && <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{resumen.fecha_inicial}</span>}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="text-muted-foreground">{totales.recibos} RC</span>
            <span className="text-emerald-600 dark:text-emerald-400">Efectivo {formatters.currency(totales.efectivo)}</span>
            <span className="text-blue-600 dark:text-blue-400">Transferencia {formatters.currency(totales.consignacion)}</span>
            <span className="font-bold text-foreground">Total {formatters.currency(totales.total)}</span>
          </div>

          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onRefresh} disabled={loading} title="Actualizar">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Tabla de conductores */}
      <div className="overflow-hidden rounded-xl border border-border/60 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-muted-foreground">Conductor</th>
                <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-muted-foreground">Efectivo</th>
                <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-muted-foreground">Transferencia</th>
                <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {conductores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-14 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {loading ? 'Cargando...' : 'Sin RC registrados hoy'}
                  </td>
                </tr>
              ) : (
                conductores.map((c, idx) => (
                  <>
                    <motion.tr
                      key={c.usuario_creacion}
                      className={cn(
                        'cursor-pointer border-b border-border/40 transition-colors last:border-0',
                        expandido === c.usuario_creacion ? 'bg-primary/5' : 'hover:bg-muted/30'
                      )}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => toggleConductor(c.usuario_creacion)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ rotate: expandido === c.usuario_creacion ? 90 : 0 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 24 }}
                            className="flex-shrink-0 text-muted-foreground/70"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </motion.div>
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary shadow-xs">
                            {c.conductor_nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{c.conductor_nombre}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {c.recibos_count} RC{c.recibos_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{formatters.currency(c.total_efectivo)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{formatters.currency(c.total_consignacion)}</td>
                      <td className="px-4 py-3 text-right font-mono font-extrabold text-primary">{formatters.currency(c.total)}</td>
                    </motion.tr>
                    {expandido === c.usuario_creacion && (
                      <tr>
                        <td colSpan={4} className="bg-muted/20 p-0">
                          <RcConductorDetalle rc={detalle[c.usuario_creacion]} loading={cargando === c.usuario_creacion} />
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RcConductorDetalle({ rc, loading }: { rc: ReciboCajaUsuario[] | undefined; loading: boolean }) {
  if (loading) {
    return <div className="px-8 py-6 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Cargando RC...</div>
  }
  if (!rc || rc.length === 0) {
    return <div className="px-8 py-6 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Sin RC para mostrar</div>
  }
  return (
    <div className="overflow-x-auto px-4 py-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/60">
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Documento</th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">C.O.</th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Tercero</th>
            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider text-muted-foreground">Efectivo</th>
            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider text-muted-foreground">Transferencia</th>
            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
            <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rc.map((r) => (
            <tr key={r.Rowid} className="border-b border-border/30 last:border-0 hover:bg-muted/30">
              <td className="px-3 py-2 font-mono font-bold text-primary">
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {(r.Tipo_Docto || 'RC').trim()}#{r.Numero}
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-muted-foreground">{r['C.O.']}</td>
              <td className="px-3 py-2 font-mono text-muted-foreground">{r.Fecha?.slice(0, 10)}</td>
              <td className="max-w-[200px] truncate px-3 py-2 font-medium">{r.Tercero_Nombre}</td>
              <td className="px-3 py-2 text-right font-mono">{formatters.currency(r.efectivo ?? 0)}</td>
              <td className="px-3 py-2 text-right font-mono">{formatters.currency(r.consignacion ?? 0)}</td>
              <td className="px-3 py-2 text-right font-mono font-bold">{formatters.currency(r.Creditos)}</td>
              <td className="px-3 py-2 text-center">
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', estadoBadgeNum(r.Estado))}>
                  {r.Estado === 1 ? 'Aprobado' : r.Estado === 2 ? 'Anulado' : 'En proceso'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const estadoBadgeNum = (estado: number) =>
  estado === 1
    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
    : estado === 2
      ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'
      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20'

function History(props: {
  data: ReciboCaja[]
  total: number
  page: number
  totalPages: number
  loading: boolean
  error: string | null
  tipodoc: string
  setTipodoc: (v: string) => void
  estado: number
  setEstado: (v: number) => void
  numero: number
  setNumero: (v: number) => void
  razonSocial: string
  setRazonSocial: (v: string) => void
  fetchRecibos: (p?: number) => void
}) {
  const {
    data,
    total,
    page,
    totalPages,
    loading,
    error,
    tipodoc,
    setTipodoc,
    estado,
    setEstado,
    numero,
    setNumero,
    razonSocial,
    setRazonSocial,
    fetchRecibos,
  } = props

  return (
    <div className="space-y-4">
      {/* Barra de filtros de búsqueda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Recibos registrados ({total})</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-8 w-24 text-xs"
            value={tipodoc}
            onChange={(e) => setTipodoc(e.target.value)}
            placeholder="Tipo"
          />

          <Select
            value={estado}
            onChange={(e) => setEstado(Number(e.target.value))}
            className="h-8 text-xs"
          >
            {ESTADO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <Input
            className="h-8 w-24 text-xs"
            type="number"
            value={numero}
            onChange={(e) => setNumero(Number(e.target.value))}
            placeholder="Número"
          />

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 w-40 pl-8 text-xs"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Tercero"
            />
          </div>

          <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => fetchRecibos(1)} disabled={loading}>
            <Search className="h-3.5 w-3.5" /> Consultar
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Tabla de Historial */}
      <div className="overflow-hidden rounded-xl border border-border/60 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                {['Fecha', 'Tipo', 'Número', 'Razón social', 'Caja', 'Total', 'Estado'].map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      'px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
                      i === 5 ? 'text-right' : i === 6 ? 'text-center' : 'text-left'
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Consulta para ver recibos registrados
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr key={r.Rowid} className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-muted-foreground">{r.Fecha?.slice(0, 10)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-foreground">{r.Tipo_Docto}</td>
                    <td className="px-4 py-3 font-mono font-bold text-primary">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {r.Número}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate font-medium text-foreground">{r.Razón_Social}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{r.Id_tercero}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.Caja}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{money(r.Créditos)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', estadoBadge(r.Estado))}>
                        {r.Estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/60 bg-card px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page <= 1 || loading}
                onClick={() => fetchRecibos(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page >= totalPages || loading}
                onClick={() => fetchRecibos(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
