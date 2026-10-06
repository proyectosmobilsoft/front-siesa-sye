import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Hash,
  Search,
  RefreshCw,
  Receipt,
  Landmark,
  User,
  Wallet,
  Printer,
  FileSpreadsheet,
  FolderOpen,
  Building2,
  Layers,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { FechaInput } from '@/components/ui/fecha-input'
import { useFechasLimite, hoyLocalIso } from '@/hooks/useFechasLimite'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { apiClient } from '@/api/client'
import { reciboCajaApi } from '@/api/reciboCaja'
import { trasladoFondosApi } from '@/api/trasladoFondos'
import type { CajaTraspaso, TrasladoFondosMov } from '@/api/types'
import { ResumenConductoresDia, ReciboCajaUsuario } from '@/api/types'
import { formatters } from '@/utils/formatters'
import { useAuthStore, coPuntual } from '@/store/authStore'
import { NuevoReciboTab } from '@/components/reciboCaja/NuevoReciboTab'

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
  Usuario_Creacion?: string | null
  /** APP = creado desde nuestra app (conductor); SIESA = tecleado en SIESA escritorio. */
  Origen?: 'APP' | 'SIESA'
  Creado_Por?: string | null
  efectivo?: number
  consignacion?: number
  tarjeta_credito?: number
  tarjeta_debito?: number
  /** Valor de las facturas cruzadas, antes de descuento PP. */
  valor_facturas?: number
  descuento_pp?: number
}

interface FilaResumenGeneral {
  id_co: string
  origen: 'APP' | 'SIESA'
  recibos: number
  efectivo: number
  consignacion: number
  tarjeta_credito: number
  tarjeta_debito: number
  cheque: number
  total: number
  valor_facturas: number
  descuento_pp: number
  anulados: number
  valor_anulados: number
}

interface ResumenGeneralRC {
  fecha_inicial: string
  fecha_final: string
  centros: string[]
  filas: FilaResumenGeneral[]
}

interface FacturaAsignadaPendiente {
  id: number
  factura: string
  conductor_id: number
  conductor: string
  cliente: string
  nit: string | null
  id_co: string
  co_factura: string | null
  valor_asignado: number
  saldo: number | null
  fecha_factura: string | null
  vence: string | null
  dias_vencida: number | null
  asignada: string
  dias_asignada: number | null
  asigno: string
  observacion: string | null
  peso_kg: number
}

interface PendientesDetalle {
  facturas: FacturaAsignadaPendiente[]
  conductores: {
    conductor_id: number
    conductor: string
    pendientes: number
    valor: number
    saldo: number
    kg: number
    vencidas: number
    mas_antigua_dias: number
    cobradas: number
    valor_cobrado: number
  }[]
}

interface FacturaDeRC {
  Rowid: number
  Tipo: string
  Numero: number
  Valor_Aplicado: number
  Descuento_Pp: number
}

const LIMIT = 50
const MONEY = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money = (n: number) => MONEY.format(n)
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
  const { data: limites } = useFechasLimite()
  const { sesion, centroOperacionActivo } = useAuthStore()
  const responsableNombre = sesion?.nombre_completo || sesion?.usuario || 'Usuario Autenticado'
  const responsableCedula = sesion?.id ? String(sesion.id) : '—'

  const [tab, setTab] = useState<'general' | 'conductores' | 'recibos' | 'nuevo'>('conductores')
  const [nuevoAbierto, setNuevoAbierto] = useState(false)

  // Filtros de fecha General
  const [fechaDesde, setFechaDesde] = useState(hoyISO())
  const [fechaHasta, setFechaHasta] = useState('')
  const [consultado, setConsultado] = useState(false)
  const [cargandoGeneral, setCargandoGeneral] = useState(false)

  const [resumenGeneral, setResumenGeneral] = useState<ResumenGeneralRC | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [trasladosGeneral, setTrasladosGeneral] = useState<TrasladoFondosMov[]>([])
  const [cajasTraslado, setCajasTraslado] = useState<CajaTraspaso[]>([])
  const [asignadas, setAsignadas] = useState<PendientesDetalle | null>(null)
  // Saldo anterior (saldo de caja en SIESA) no está conectado a un endpoint real todavía.
  const saldoAnterior = 0

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
  const [fechaConductores, setFechaConductores] = useState(hoyISO())

  const fetchResumenConductores = async () => {
    setLoadingResumen(true)
    try {
      const res = await reciboCajaApi.getResumenConductoresDia({
        fechaInicial: fechaConductores,
        fechaFinal: fechaConductores,
      })
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
  }, [tab, fechaConductores])

  const handleConsultarGeneral = async () => {
    setCargandoGeneral(true)
    setErrorGeneral(null)
    try {
      const fInicial = fechaDesde || hoyISO()
      const fFinal = fechaHasta || fInicial
      const res = await apiClient.get<{ success: boolean; data: ResumenGeneralRC }>('/recibo-caja/resumen-general', {
        params: { fecha_inicial: fInicial, fecha_final: fFinal },
      })
      setResumenGeneral(res.data.data)
      // Traslados del mismo periodo (si fallan, el arqueo sale igual sin ese bloque).
      const [traslados, cajas, pendientes] = await Promise.all([
        trasladoFondosApi.listar({ fechaInicial: fInicial, fechaFinal: fFinal }).catch(() => []),
        cajasTraslado.length ? Promise.resolve(cajasTraslado) : trasladoFondosApi.listarCajas(true).catch(() => []),
        apiClient
          .get<{ success: boolean; data: PendientesDetalle }>('/asignacion-cobro/pendientes-detalle', { params: { desde: fInicial, hasta: fFinal } })
          .then((r) => r.data.data)
          .catch(() => null),
      ])
      setAsignadas(pendientes)
      const co = coPuntual(centroOperacionActivo)
      setTrasladosGeneral(
        traslados.filter((t) => !co || String(t.id_co_origen).trim() === co || String(t.id_co_destino).trim() === co)
      )
      setCajasTraslado(cajas)
    } catch (err) {
      console.error('Error al consultar arqueo general:', err)
      setErrorGeneral('No se pudo consultar el recaudo del periodo')
    } finally {
      setConsultado(true)
      setCargandoGeneral(false)
    }
  }

  const fetchRecibos = async (p = 1) => {
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        p_cia: 1,
        p_idco: centroOperacionActivo ?? '001',
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

  const fechaFinalAplicada = fechaHasta || fechaDesde || hoyISO()

  return (
    <div className="nu mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8 xl:[zoom:1.12] 2xl:max-w-[1600px] 2xl:[zoom:1.15]">
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
          <div className="flex items-center gap-2 nu-card px-3.5 py-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Saldo Anterior:</span>
            <span className="font-mono font-bold text-primary">{money(saldoAnterior)}</span>
          </div>

          <div className="flex items-center gap-2 nu-card px-3.5 py-2">
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
      <div className="space-y-6 nu-card">
        {/* Barra de Pestañas estilo píldora */}
        <div className="flex items-center px-4 pt-4">
          <div className="flex flex-wrap gap-1 nu-seg">
            <button
              onClick={() => setTab('conductores')}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all',
                tab === 'conductores'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
              )}
            >
              <User className="h-3.5 w-3.5" /> Conductores
            </button>
            <button
              onClick={() => setTab('general')}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all',
                tab === 'general'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
              )}
            >
              <Landmark className="h-3.5 w-3.5" /> General
            </button>
            <button
              onClick={() => setTab('recibos')}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all',
                tab === 'recibos'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
              )}
            >
              <FileText className="h-3.5 w-3.5" /> Recibos
            </button>
            <button
              onClick={() => { setNuevoAbierto(true); setTab('nuevo') }}
              className={cn('flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all', tab === 'nuevo' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:bg-card/50 hover:text-foreground')}
            >
              <Receipt className="h-3.5 w-3.5" /> Nuevo recibo
            </button>
          </div>
        </div>

        {/* ── PESTAÑA: GENERAL ── */}
        {tab === 'general' && (
          <div className="space-y-6 p-4 sm:p-6">
            {/* Filtros de la pestaña General */}
            <div className="grid items-end gap-4 rounded-2xl bg-[var(--nu-fill)] p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha Inicial</label>
                <FechaInput value={fechaDesde} onChange={setFechaDesde} min={limites?.recibos ?? undefined} max={hoyLocalIso()} className="text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha Final (Opcional)</label>
                <FechaInput value={fechaHasta} onChange={setFechaHasta} min={fechaDesde || limites?.recibos || undefined} max={hoyLocalIso()} placeholder="Hoy por defecto" className="text-xs" />
              </div>

              <Button onClick={handleConsultarGeneral} disabled={cargandoGeneral} className="nu-btn nu-btn-primary gap-2 self-end shadow-xs">
                <Search className={cn('h-3.5 w-3.5', cargandoGeneral && 'animate-spin')} />
                {cargandoGeneral ? 'Consultando...' : 'Consultar'}
              </Button>
            </div>

            {/* Periodo y C.O. consultados */}
            <div className="flex flex-col gap-3 nu-card p-4 text-xs lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 font-semibold text-muted-foreground">
                <span>Periodo consultado:</span>
                <span className="rounded-lg bg-muted/60 px-3 py-1 font-mono font-medium text-foreground">
                  {fechaDesde === fechaFinalAplicada ? formatters.dateOnly(fechaDesde) : `${formatters.dateOnly(fechaDesde)} — ${formatters.dateOnly(fechaFinalAplicada)}`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-1">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Centro operativo:</span>
                  <span className="font-mono font-bold text-foreground">
                    {resumenGeneral?.centros.length ? resumenGeneral.centros.join(' y ') : coPuntual(centroOperacionActivo) ?? 'Ambos'}
                  </span>
                </div>
                <span className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 font-semibold text-muted-foreground">
                  Incluye RC hechos en SIESA y en la app
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
                    Seleccione el rango de fechas (si no especifica fecha final se tomará la fecha inicial/hoy por defecto) y presione <strong>Consultar</strong>. Suma TODOS los RC de todas las cajas en ese rango.
                  </p>
                </div>
                <Button onClick={handleConsultarGeneral} disabled={cargandoGeneral} className="nu-btn nu-btn-primary mt-2 gap-2 text-xs shadow-xs">
                  <Search className={cn('h-3.5 w-3.5', cargandoGeneral && 'animate-spin')} /> Consultar Arqueo
                </Button>
              </div>
            ) : (
              <>
                {errorGeneral && (
                  <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-600 dark:text-red-400">{errorGeneral}</p>
                )}
                {resumenGeneral && <TableroGeneral resumen={resumenGeneral} />}
                {resumenGeneral && <TrasladosPeriodo traslados={trasladosGeneral} cajas={cajasTraslado} />}
                {resumenGeneral && asignadas && <FacturasAsignadasConductores datos={asignadas} />}

                {/* Fila de datos del Responsable (Persona autenticada en la sesión) */}
                <div className="grid gap-4 rounded-2xl bg-[var(--nu-fill)] p-4 sm:grid-cols-2">
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

                {/* Botones de acción rápida */}
                <div className="flex justify-end">
                  <div className="flex items-center justify-end gap-2 nu-card p-4">
                    <Button variant="ghost" size="sm" title="Imprimir" className="nu-btn nu-btn-soft h-9 w-9 p-0">
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Imprimir Anexo" className="nu-btn nu-btn-soft h-9 w-9 p-0">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Exportar" className="nu-btn nu-btn-soft h-9 w-9 p-0">
                      <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Abrir" className="nu-btn nu-btn-soft h-9 w-9 p-0">
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
            <TableroConductoresRC
              resumen={resumenConductores}
              loading={loadingResumen}
              fecha={fechaConductores}
              onFechaChange={setFechaConductores}
              onRefresh={fetchResumenConductores}
            />
          </div>
        )}

        {/* ── PESTAÑA: RECIBOS ── */}
        {nuevoAbierto && <div className={tab === 'nuevo' ? '' : 'hidden'}><NuevoReciboTab onCreated={() => { void fetchResumenConductores(); if (consultado) void handleConsultarGeneral(); void fetchRecibos(1) }} /></div>}
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

function TableroConductoresRC({
  resumen,
  loading,
  fecha,
  onFechaChange,
  onRefresh,
}: {
  resumen: ResumenConductoresDia | null
  loading: boolean
  fecha: string
  onFechaChange: (fecha: string) => void
  onRefresh: () => void
}) {
  const { data: limites } = useFechasLimite()
  // Solo conductores que hicieron RC en la fecha; los que solo tienen facturas
  // asignadas pendientes (sin plata recaudada) se ven en Logística → Asignar facturas.
  const conductores = (resumen?.conductores ?? []).filter((c) => c.recibos_count > 0)
  const totales = conductores.reduce(
    (acc, c) => ({
      recibos: acc.recibos + c.recibos_count,
      efectivo: acc.efectivo + c.total_efectivo,
      consignacion: acc.consignacion + c.total_consignacion,
      tarjetaCredito: acc.tarjetaCredito + (c.total_tarjeta_credito ?? 0),
      tarjetaDebito: acc.tarjetaDebito + (c.total_tarjeta_debito ?? 0),
      facturas: acc.facturas + (c.total_facturas ?? 0),
      descuento: acc.descuento + (c.total_descuento_pp ?? 0),
      total: acc.total + c.total,
    }),
    { recibos: 0, efectivo: 0, consignacion: 0, tarjetaCredito: 0, tarjetaDebito: 0, facturas: 0, descuento: 0, total: 0 }
  )
  const tieneTarjetaCredito = totales.tarjetaCredito > 0
  const tieneTarjetaDebito = totales.tarjetaDebito > 0
  const columnas = 7 + (tieneTarjetaCredito ? 1 : 0) + (tieneTarjetaDebito ? 1 : 0)

  const [expandido, setExpandido] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<Record<string, ReciboCajaUsuario[]>>({})
  const [cargando, setCargando] = useState<string | null>(null)

  useEffect(() => {
    setExpandido(null)
    setDetalle({})
  }, [resumen?.fecha_inicial, resumen?.fecha_final])

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
          <h2 className="text-sm font-bold text-foreground">RC por conductor ({conductores.length})</h2>
          <label className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            <span className="sr-only">Fecha de los recibos</span>
            <FechaInput
              value={fecha}
              min={limites?.recibos_app ?? undefined}
              max={hoyLocalIso()}
              onChange={onFechaChange}
              simple
              className="w-[110px] gap-1.5 font-medium text-foreground"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="nu-btn nu-btn-soft h-9 w-9 p-0" onClick={onRefresh} disabled={loading} title="Actualizar">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Tabla de conductores */}
      <div className="nu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th className="px-4 py-3 text-left nu-th">Conductor</th>
                <th className="px-4 py-3 text-left nu-th">C.O.</th>
                <th className="px-4 py-3 text-right nu-th">Total a pagar</th>
                <th className="px-4 py-3 text-right nu-th">Desc. financiero</th>
                <th className="px-4 py-3 text-right nu-th">Efectivo</th>
                <th className="px-4 py-3 text-right nu-th">Transferencia</th>
                {tieneTarjetaCredito && <th className="px-4 py-3 text-right nu-th">T. Crédito</th>}
                {tieneTarjetaDebito && <th className="px-4 py-3 text-right nu-th">T. Débito</th>}
                <th className="px-4 py-3 text-right nu-th">Total pagado</th>
              </tr>
            </thead>
            <tbody>
              {conductores.length === 0 ? (
                <tr>
                  <td colSpan={columnas} className="py-14 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {loading ? 'Cargando...' : 'Sin RC registrados para la fecha seleccionada'}
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
                      <td className="px-4 py-3 text-left font-mono font-semibold text-foreground">
                        {c.centro_operacion_codigo || <span className="font-sans text-[11px] italic text-muted-foreground">Sin asignar</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground"><MontoAlineado value={c.total_facturas ?? 0} alinear="derecha" /></td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400"><MontoAlineado value={c.total_descuento_pp ?? 0} alinear="derecha" /></td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground"><MontoAlineado value={c.total_efectivo} alinear="derecha" /></td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground"><MontoAlineado value={c.total_consignacion} alinear="derecha" /></td>
                      {tieneTarjetaCredito && <td className="px-4 py-3 text-right font-semibold text-foreground"><MontoAlineado value={c.total_tarjeta_credito ?? 0} alinear="derecha" /></td>}
                      {tieneTarjetaDebito && <td className="px-4 py-3 text-right font-semibold text-foreground"><MontoAlineado value={c.total_tarjeta_debito ?? 0} alinear="derecha" /></td>}
                      <td className="px-4 py-3 text-right font-bold text-primary"><MontoAlineado value={c.total} alinear="derecha" /></td>
                    </motion.tr>
                    {expandido === c.usuario_creacion && (
                      <tr>
                        <td colSpan={columnas} className="bg-muted/20 p-0">
                          <RcConductorDetalle rc={detalle[c.usuario_creacion]} loading={cargando === c.usuario_creacion} conductorNombre={c.conductor_nombre} />
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
            {conductores.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/60 font-bold">
                  <td colSpan={2} className="px-4 py-3 text-foreground">
                    Totales
                    <span className="ml-2 text-[11px] font-semibold text-muted-foreground">
                      {conductores.length} conductor{conductores.length !== 1 ? 'es' : ''} · {totales.recibos} RC
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground"><MontoAlineado value={totales.facturas} alinear="derecha" /></td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400"><MontoAlineado value={totales.descuento} alinear="derecha" /></td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400"><MontoAlineado value={totales.efectivo} alinear="derecha" /></td>
                  <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400"><MontoAlineado value={totales.consignacion} alinear="derecha" /></td>
                  {tieneTarjetaCredito && <td className="px-4 py-3 text-right text-violet-600 dark:text-violet-400"><MontoAlineado value={totales.tarjetaCredito} alinear="derecha" /></td>}
                  {tieneTarjetaDebito && <td className="px-4 py-3 text-right text-sky-600 dark:text-sky-400"><MontoAlineado value={totales.tarjetaDebito} alinear="derecha" /></td>}
                  <td className="px-4 py-3 text-right text-primary"><MontoAlineado value={totales.total} alinear="derecha" /></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>


    </div>
  )
}

function RcConductorDetalle({ rc, loading, conductorNombre }: { rc: ReciboCajaUsuario[] | undefined; loading: boolean; conductorNombre: string }) {
  const [reciboFacturas, setReciboFacturas] = useState<ReciboCajaUsuario | null>(null)

  if (loading) {
    return <div className="px-8 py-6 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Cargando RC...</div>
  }
  if (!rc || rc.length === 0) {
    return <div className="px-8 py-6 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Sin RC para mostrar</div>
  }
  const tieneTarjetaCredito = rc.some((recibo) => (recibo.tarjeta_credito ?? 0) > 0)
  const tieneTarjetaDebito = rc.some((recibo) => (recibo.tarjeta_debito ?? 0) > 0)

  return (
    <div className="overflow-x-auto px-4 py-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/60">
            <th className="px-3 py-2 text-left nu-th">Documento</th>
            <th className="px-3 py-2 text-left nu-th">Factura</th>
            <th className="px-3 py-2 text-left nu-th">C.O.</th>
            <th className="px-3 py-2 text-left nu-th">Fecha</th>
            <th className="px-3 py-2 text-left nu-th">Tercero</th>
            <th className="px-3 py-2 text-right nu-th">Efectivo</th>
            <th className="px-3 py-2 text-right nu-th">Transferencia</th>
            {tieneTarjetaCredito && <th className="px-3 py-2 text-right nu-th">T. crédito</th>}
            {tieneTarjetaDebito && <th className="px-3 py-2 text-right nu-th">T. débito</th>}
            <th className="px-3 py-2 text-right nu-th">Desc. financiero</th>
            <th className="px-3 py-2 text-right nu-th">Total</th>
            <th className="px-3 py-2 text-left nu-th">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rc.map((r) => {
            const facturas = r.Facturas ?? []
            const factura = facturas.length > 0
              ? facturas
                .map((f) => `${(f.Tipo || '').trim().toUpperCase()} ${f.Numero}`)
                .join(', ')
              : '—'
            const descuentoFinanciero = facturas.reduce((total, factura) => total + (factura.Descuento_Pp || 0), 0)
            const totalRecaudado = (r.efectivo ?? 0) + (r.consignacion ?? 0) + (r.tarjeta_credito ?? 0) + (r.tarjeta_debito ?? 0)

            return (
              <tr key={r.Rowid} className="border-b border-border/30 last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 font-semibold text-primary">
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {(r.Tipo_Docto || 'RC').trim()}#{r.Numero}
                  </span>
                </td>
                <td className="max-w-[220px] px-3 py-2 text-muted-foreground">
                  {facturas.length > 1 ? (
                    <Button variant="ghost" size="sm" className="nu-btn nu-btn-soft h-7 px-2 text-[10px]" onClick={() => setReciboFacturas(r)}>
                      Ver {facturas.length} facturas
                    </Button>
                  ) : facturas.length === 0 && r.Notas ? (
                    <span className="block truncate italic" title={`Según notas del RC: ${r.Notas}`}>
                      {r.Notas.toUpperCase()}
                    </span>
                  ) : (
                    <span className="block truncate">{factura}</span>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{r['C.O.']}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatters.dateOnly(r.Fecha)}</td>
                <td className="max-w-[200px] truncate px-3 py-2 font-medium">{r.Tercero_Nombre}</td>
                <td className="px-3 py-2 text-right"><MontoAlineado value={r.efectivo ?? 0} alinear="derecha" /></td>
                <td className="px-3 py-2 text-right"><MontoAlineado value={r.consignacion ?? 0} alinear="derecha" /></td>
                {tieneTarjetaCredito && <td className="px-3 py-2 text-right text-violet-600 dark:text-violet-400"><MontoAlineado value={r.tarjeta_credito ?? 0} alinear="derecha" /></td>}
                {tieneTarjetaDebito && <td className="px-3 py-2 text-right text-sky-600 dark:text-sky-400"><MontoAlineado value={r.tarjeta_debito ?? 0} alinear="derecha" /></td>}
                <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">
                  <MontoAlineado value={descuentoFinanciero} alinear="derecha" />
                </td>
                <td className="px-3 py-2 text-right font-semibold">
                  <MontoAlineado value={totalRecaudado} alinear="derecha" />
                </td>
                <td className="px-3 py-2 text-left">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', estadoBadgeNum(r.Estado))}>
                    {r.Estado === 1 ? 'Aprobado' : r.Estado === 2 ? 'Anulado' : 'En proceso'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <Modal
        isOpen={!!reciboFacturas}
        onClose={() => setReciboFacturas(null)}
        title={
          <>
            <span className="block">Conductor: {conductorNombre}</span>
            <span className="block">
              Recaudo {(reciboFacturas?.Tipo_Docto || 'RC').trim()}#{reciboFacturas?.Numero ?? ''} · Fecha: {formatearFechaHoraRc(reciboFacturas)}
            </span>
          </>
        }
        className="max-w-2xl"
      >
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Factura</th>
                <th className="px-4 py-3 text-right">Valor factura</th>
                <th className="px-4 py-3 text-right">Desc. financiero</th>
                <th className="px-4 py-3 text-right">Recaudado</th>
              </tr>
            </thead>
            <tbody>
              {(reciboFacturas?.Facturas ?? []).map((factura) => (
                <tr key={factura.Rowid} className="border-t border-border/60">
                  <td className="px-4 py-3 tabular-nums">{(factura.Tipo || '').trim().toUpperCase()} {factura.Numero}</td>
                  <td className="px-4 py-3 text-right"><MontoAlineado value={factura.Valor_Aplicado} alinear="derecha" /></td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400"><MontoAlineado value={factura.Descuento_Pp ?? 0} alinear="derecha" /></td>
                  <td className="px-4 py-3 text-right font-semibold"><MontoAlineado value={factura.Valor_Aplicado - (factura.Descuento_Pp ?? 0)} alinear="derecha" /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right"><MontoAlineado value={(reciboFacturas?.Facturas ?? []).reduce((acc, f) => acc + (f.Valor_Aplicado ?? 0), 0)} alinear="derecha" /></td>
                <td className="px-4 py-3 text-right text-red-600 dark:text-red-400"><MontoAlineado value={(reciboFacturas?.Facturas ?? []).reduce((acc, f) => acc + (f.Descuento_Pp ?? 0), 0)} alinear="derecha" /></td>
                <td className="px-4 py-3 text-right font-bold text-primary"><MontoAlineado value={(reciboFacturas?.Facturas ?? []).reduce((acc, f) => acc + (f.Valor_Aplicado ?? 0) - (f.Descuento_Pp ?? 0), 0)} alinear="derecha" /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Modal>
    </div>
  )
}

const estadoBadgeNum = (estado: number) =>
  estado === 1
    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
    : estado === 2
      ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'
      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20'

/** "2026-10-01T11:13:42.287Z" → "01/10/2026 11:13". SIESA guarda hora local; se lee del texto para no correrla por zona horaria. */
function formatearFechaHoraRc(rc: ReciboCajaUsuario | null): string {
  const valor = rc?.Fecha_Creacion || rc?.Fecha
  const m = valor?.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (!m) return ''
  const fecha = `${m[3]}/${m[2]}/${m[1]}`
  return m[4] && rc?.Fecha_Creacion ? `${fecha} ${m[4]}:${m[5]}` : fecha
}

function MontoAlineado({ value, alinear = 'izquierda' }: { value: number; alinear?: 'izquierda' | 'derecha' }) {
  const numero = formatters.currency(value).replace(/^\$\s*/, '')

  return (
    <span className="inline-grid grid-cols-[0.75rem_10ch] justify-start gap-1 tabular-nums">
      <span>$</span>
      <span className={alinear === 'derecha' ? 'text-right' : 'text-left'}>{numero}</span>
    </span>
  )
}

const COLUMNAS_TEXTO = ['Documento', 'Fecha', 'Cliente', 'Creado por', 'C.O.']

/** Suma de medios de pago; si el listado no los trae (respuesta vieja), cae al total del SP. */
const totalPagadoRecibo = (r: ReciboCaja) => {
  const suma = (r.efectivo ?? 0) + (r.consignacion ?? 0) + (r.tarjeta_credito ?? 0) + (r.tarjeta_debito ?? 0)
  return suma > 0 || r.efectivo != null ? suma : r.Créditos
}

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
  const [reciboDetalle, setReciboDetalle] = useState<ReciboCaja | null>(null)
  // Medios de pago y estado no van en la tabla: salen en el panel derecho
  // al pasar el mouse por un recibo (queda el último señalado).
  const [reciboSeñalado, setReciboSeñalado] = useState<ReciboCaja | null>(null)
  const columnas = ['Documento', 'Fecha', 'Cliente', 'Creado por', 'C.O.', 'Total a pagar', 'Desc. financiero']

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
            className="nu-control nu-control-sm w-24 text-xs"
            value={tipodoc}
            onChange={(e) => setTipodoc(e.target.value)}
            placeholder="Tipo"
          />

          <Select
            value={estado}
            onChange={(e) => setEstado(Number(e.target.value))}
            className="nu-control nu-control-sm text-xs"
          >
            {ESTADO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <Input
            className="nu-control nu-control-sm w-24 text-xs"
            type="number"
            value={numero}
            onChange={(e) => setNumero(Number(e.target.value))}
            placeholder="Número"
          />

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="nu-control nu-control-sm w-40 pl-10 text-xs"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Cliente"
            />
          </div>

          <Button size="sm" className="nu-btn nu-btn-primary gap-1 text-xs" onClick={() => fetchRecibos(1)} disabled={loading}>
            <Search className="h-3.5 w-3.5" /> Consultar
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Tabla de Historial + panel de medios de pago */}
      <div className="flex items-stretch gap-4">
      <div className="min-w-0 flex-1 nu-card overflow-hidden">
        {/* Scroll propio para que la cabecera (Documento, Fecha…) quede fija al bajar. */}
        <div className="max-h-[calc(100vh-12rem)] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border">
                {columnas.map((h) => (
                  <th
                    key={h}
                    className={cn(
                      'whitespace-nowrap bg-muted px-4 py-3 text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]',
                      COLUMNAS_TEXTO.includes(h) ? 'text-left' : h === 'Estado' ? 'text-center' : 'text-right'
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
                  <td colSpan={columnas.length} className="py-14 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Consulta para ver recibos registrados
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr
                    key={r.Rowid}
                    onClick={() => setReciboDetalle(r)}
                    onMouseEnter={() => setReciboSeñalado(r)}
                    className={cn(
                      'cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30',
                      reciboSeñalado?.Rowid === r.Rowid && 'bg-primary/5'
                    )}
                    title="Ver detalle del recibo"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-primary">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {(r.Tipo_Docto || 'RC').trim()} {r.Número}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-muted-foreground">{formatters.dateOnly(r.Fecha)}</td>
                    <td className="max-w-[260px] px-4 py-3">
                      <p className="truncate font-medium text-foreground">{r.Razón_Social}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{r.Id_tercero}</p>
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      <p className="truncate font-medium text-foreground">{r.Creado_Por || r.Usuario_Creacion || '—'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.Origen === 'APP' ? 'Conductor · App' : `Usuario SIESA${r.Usuario_Creacion ? ` · ${r.Usuario_Creacion}` : ''}`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono font-bold text-foreground">{r['C.O.']}</p>
                      <p className="whitespace-nowrap text-[10px] text-muted-foreground">{r.Caja}</p>
                    </td>
                    <td className="px-4 py-3 text-right"><MontoAlineado value={r.valor_facturas ?? 0} alinear="derecha" /></td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400"><MontoAlineado value={r.descuento_pp ?? 0} alinear="derecha" /></td>
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
                variant="ghost"
                size="sm"
                className="nu-btn nu-btn-soft h-8 w-8 p-0"
                disabled={page <= 1 || loading}
                onClick={() => fetchRecibos(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="nu-btn nu-btn-soft h-8 w-8 p-0"
                disabled={page >= totalPages || loading}
                onClick={() => fetchRecibos(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <PanelMediosPago recibo={reciboSeñalado} />
      </div>

      <DetalleReciboModal recibo={reciboDetalle} onClose={() => setReciboDetalle(null)} />
    </div>
  )
}

function DetalleReciboModal({ recibo, onClose }: { recibo: ReciboCaja | null; onClose: () => void }) {
  const [facturas, setFacturas] = useState<FacturaDeRC[]>([])
  const [notas, setNotas] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!recibo) return
    let vigente = true
    setCargando(true)
    setError(null)
    setFacturas([])
    setNotas(null)
    apiClient
      .get<{ success: boolean; data: { facturas: FacturaDeRC[]; notas: string | null } }>(`/recibo-caja/${recibo.Rowid}/facturas`)
      .then((res) => {
        if (!vigente) return
        setFacturas(res.data.data.facturas)
        setNotas(res.data.data.notas)
      })
      .catch(() => vigente && setError('No se pudieron cargar las facturas del recibo'))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [recibo])

  const totalFacturas = facturas.reduce((acc, f) => acc + f.Valor_Aplicado, 0)
  const totalDescuento = facturas.reduce((acc, f) => acc + f.Descuento_Pp, 0)

  return (
    <Modal
      isOpen={!!recibo}
      onClose={onClose}
      title={
        <>
          <span className="block">Recibo {(recibo?.Tipo_Docto || 'RC').trim()} {recibo?.Número}</span>
          <span className="block">Fecha: {formatters.dateOnly(recibo?.Fecha)}</span>
        </>
      }
      className="max-w-2xl"
    >
      {recibo && (
        <div className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Cliente</dt>
            <dd className="font-medium">
              {recibo.Razón_Social} <span className="font-mono text-xs text-muted-foreground">{recibo.Id_tercero}</span>
            </dd>
            <dt className="text-muted-foreground">Creado por</dt>
            <dd className="font-medium">
              {recibo.Creado_Por || recibo.Usuario_Creacion || '—'}{' '}
              <span className="text-xs text-muted-foreground">({recibo.Origen === 'APP' ? 'Conductor · App' : 'Usuario SIESA'})</span>
            </dd>
            <dt className="text-muted-foreground">Caja</dt>
            <dd>{recibo.Caja}</dd>
            <dt className="text-muted-foreground">Estado</dt>
            <dd>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', estadoBadge(recibo.Estado))}>{recibo.Estado}</span>
            </dd>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-semibold">{money(recibo.Créditos)}</dd>
          </dl>

          {cargando ? (
            <p className="py-6 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Cargando facturas...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : facturas.length === 0 ? (
            <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              {notas ? (
                <>
                  Sin facturas registradas. Según las notas del recibo: <span className="font-medium text-foreground">{notas.toUpperCase()}</span>
                </>
              ) : (
                'Este recibo no tiene facturas registradas.'
              )}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Factura</th>
                    <th className="px-4 py-3 text-right">Valor factura</th>
                    <th className="px-4 py-3 text-right">Desc. financiero</th>
                    <th className="px-4 py-3 text-right">Recaudado</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((f) => (
                    <tr key={f.Rowid} className="border-t border-border/60">
                      <td className="px-4 py-3 tabular-nums">{(f.Tipo || '').trim().toUpperCase()} {f.Numero}</td>
                      <td className="px-4 py-3 text-right"><MontoAlineado value={f.Valor_Aplicado} alinear="derecha" /></td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400"><MontoAlineado value={f.Descuento_Pp} alinear="derecha" /></td>
                      <td className="px-4 py-3 text-right font-semibold"><MontoAlineado value={f.Valor_Aplicado - f.Descuento_Pp} alinear="derecha" /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right"><MontoAlineado value={totalFacturas} alinear="derecha" /></td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400"><MontoAlineado value={totalDescuento} alinear="derecha" /></td>
                    <td className="px-4 py-3 text-right font-bold text-primary"><MontoAlineado value={totalFacturas - totalDescuento} alinear="derecha" /></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

const CAMPOS_SUMA = ['recibos', 'efectivo', 'consignacion', 'tarjeta_credito', 'tarjeta_debito', 'cheque', 'total', 'valor_facturas', 'descuento_pp', 'anulados', 'valor_anulados'] as const

function sumarFilas(filas: FilaResumenGeneral[]) {
  const total = Object.fromEntries(CAMPOS_SUMA.map((k) => [k, 0])) as Record<(typeof CAMPOS_SUMA)[number], number>
  for (const f of filas) for (const k of CAMPOS_SUMA) total[k] += f[k]
  return total
}

/** Arqueo de la pestaña General: recaudo por C.O. y origen (app / SIESA), por medio de pago. */
function TableroGeneral({ resumen }: { resumen: ResumenGeneralRC }) {
  const { filas } = resumen
  const general = sumarFilas(filas)
  const centros = [...new Set(filas.map((f) => f.id_co))].sort()
  const tieneCheque = general.cheque > 0

  const columnas: { titulo: string; valor: (t: ReturnType<typeof sumarFilas>) => number; color?: string }[] = [
    { titulo: 'Efectivo', valor: (t) => t.efectivo },
    { titulo: 'Transferencia', valor: (t) => t.consignacion },
    { titulo: 'T. Crédito', valor: (t) => t.tarjeta_credito },
    { titulo: 'T. Débito', valor: (t) => t.tarjeta_debito },
    ...(tieneCheque ? [{ titulo: 'Cheque', valor: (t: ReturnType<typeof sumarFilas>) => t.cheque }] : []),
    { titulo: 'Total recaudado', valor: (t) => t.total, color: 'font-bold text-primary' },
    { titulo: 'Total a pagar', valor: (t) => t.valor_facturas },
    { titulo: 'Desc. financiero', valor: (t) => t.descuento_pp, color: 'text-red-600 dark:text-red-400' },
  ]

  const fila = (etiqueta: React.ReactNode, t: ReturnType<typeof sumarFilas>, clase?: string) => (
    <tr className={cn('border-b border-border/40', clase ?? 'hover:bg-muted/30')}>
      <td className="px-4 py-3 font-semibold">{etiqueta}</td>
      {columnas.map((c) => (
        <td key={c.titulo} className={cn('px-4 py-3 text-right', c.color)}>
          <MontoAlineado value={c.valor(t)} alinear="derecha" />
        </td>
      ))}
      <td className="px-4 py-3 text-right tabular-nums">{t.recibos}</td>
    </tr>
  )

  if (filas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 py-12 text-center text-sm text-muted-foreground">
        No hay recibos de caja en el periodo consultado.
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="nu-card p-4">
          <p className="text-[10px] nu-th">Total recaudado</p>
          <p className="mt-1 text-lg font-extrabold text-primary"><MontoAlineado value={general.total} /></p>
          <p className="text-[11px] text-muted-foreground">{general.recibos} recibos vigentes</p>
        </div>
        <div className="nu-card p-4">
          <p className="text-[10px] nu-th">Efectivo (debe estar en caja)</p>
          <p className="mt-1 text-lg font-extrabold text-emerald-600 dark:text-emerald-400"><MontoAlineado value={general.efectivo} /></p>
          <p className="text-[11px] text-muted-foreground">Transferencias y tarjetas van a bancos</p>
        </div>
        <div className="nu-card p-4">
          <p className="text-[10px] nu-th">Descuentos financieros</p>
          <p className="mt-1 text-lg font-extrabold text-red-600 dark:text-red-400"><MontoAlineado value={general.descuento_pp} /></p>
          <p className="text-[11px] text-muted-foreground">Sobre <MontoAlineado value={general.valor_facturas} /> en facturas</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Anulados (no suman)</p>
          <p className="mt-1 text-lg font-extrabold text-red-600 dark:text-red-400"><MontoAlineado value={general.valor_anulados} /></p>
          <p className="text-[11px] text-muted-foreground">{general.anulados} recibo{general.anulados !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="nu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th className="px-4 py-3 text-left nu-th">Descripción o concepto</th>
                {columnas.map((c) => (
                  <th key={c.titulo} className="whitespace-nowrap px-4 py-3 text-right nu-th">{c.titulo}</th>
                ))}
                <th className="px-4 py-3 text-right nu-th">Recibos</th>
              </tr>
            </thead>
            <tbody>
              {centros.map((co) => {
                const delCo = filas.filter((f) => f.id_co === co)
                const app = delCo.find((f) => f.origen === 'APP')
                const siesa = delCo.find((f) => f.origen === 'SIESA')
                return (
                  <Fragment key={co}>
                    {app && fila(<span className="pl-3 font-medium">Conductores (app) · C.O. {co}</span>, sumarFilas([app]))}
                    {siesa && fila(<span className="pl-3 font-medium">Caja SIESA · C.O. {co}</span>, sumarFilas([siesa]))}
                    {fila(`Total C.O. ${co}`, sumarFilas(delCo), 'border-b border-border bg-muted/30 font-bold')}
                  </Fragment>
                )
              })}
              {centros.length > 1 && fila('RECAUDO DEL DÍA (TODOS LOS C.O.)  ===>', general, 'bg-primary/5 font-bold text-primary')}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

/** Panel derecho de la pestaña Recibos: medios de pago y estado del recibo señalado con el mouse. */
function PanelMediosPago({ recibo }: { recibo: ReciboCaja | null }) {
  const medios: { etiqueta: string; valor: number; color: string }[] = recibo
    ? [
        { etiqueta: 'Efectivo', valor: recibo.efectivo ?? 0, color: 'bg-emerald-500' },
        { etiqueta: 'Transferencia', valor: recibo.consignacion ?? 0, color: 'bg-blue-500' },
        { etiqueta: 'T. Crédito', valor: recibo.tarjeta_credito ?? 0, color: 'bg-violet-500' },
        { etiqueta: 'T. Débito', valor: recibo.tarjeta_debito ?? 0, color: 'bg-sky-500' },
      ]
    : []
  const total = recibo ? totalPagadoRecibo(recibo) : 0

  // Ocupa todo el alto de la tabla; el contenido queda fijo arriba al hacer scroll.
  return (
    <aside className="hidden w-80 shrink-0 nu-card lg:block">
      <div className="sticky top-4 p-5">
        <AnimatePresence mode="wait">
          {!recibo ? (
            <motion.p
              key="vacio"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-16 text-center text-sm text-muted-foreground"
            >
              Pasa el mouse sobre un recibo para ver sus medios de pago.
            </motion.p>
          ) : (
            // Al cambiar de recibo: se "limpia" (sale) y se vuelve a llenar (entra).
            <motion.div
              key={recibo.Rowid}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs nu-th">Recibo</p>
                  <p className="font-mono text-lg font-bold text-primary">
                    {(recibo.Tipo_Docto || 'RC').trim()} {recibo.Número}
                  </p>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', estadoBadge(recibo.Estado))}>{recibo.Estado}</span>
              </div>

              <div>
                <p className="mb-3 text-xs nu-th">Medios de pago</p>
                <ul className="space-y-3 text-sm">
                  {medios.map((m, i) => (
                    <motion.li
                      key={m.etiqueta}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: m.valor === 0 ? 0.4 : 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.05, duration: 0.2 }}
                      className="grid grid-cols-[1fr_auto] items-center gap-2"
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', m.color)} />
                        {m.etiqueta}
                      </span>
                      <MontoAlineado value={m.valor} alinear="derecha" />
                    </motion.li>
                  ))}
                </ul>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
                  {total > 0 &&
                    medios
                      .filter((m) => m.valor > 0)
                      .map((m, i) => (
                        <motion.span
                          key={m.etiqueta}
                          className={m.color}
                          initial={{ width: 0 }}
                          animate={{ width: `${(m.valor / total) * 100}%` }}
                          transition={{ delay: 0.15 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
                        />
                      ))}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-t border-border pt-4 text-base font-bold">
                <span>Total pagado</span>
                <span className="text-primary"><MontoAlineado value={total} alinear="derecha" /></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}

const MEDIO_TRASLADO: Record<string, string> = { EFE: 'Efectivo', TD: 'T. Débito', TC: 'T. Crédito' }

/** Traslados de fondos entre cajas del periodo del arqueo: cuánto entró y salió de cada caja. */
function TrasladosPeriodo({ traslados, cajas }: { traslados: TrasladoFondosMov[]; cajas: CajaTraspaso[] }) {
  const nombreCaja = (id?: string | null) => {
    const limpio = String(id ?? '').trim()
    const caja = cajas.find((c) => String(c.id_caja).trim() === limpio)
    return caja?.nombre?.trim() || `Caja ${limpio}`
  }
  const total = traslados.reduce((acc, t) => acc + Number(t.valor), 0)
  const porMedio = traslados.reduce<Record<string, number>>((acc, t) => {
    const m = t.medio_pago || 'EFE'
    acc[m] = (acc[m] || 0) + Number(t.valor)
    return acc
  }, {})

  // Neto por caja: lo que entró menos lo que salió por traslados.
  const porCaja = new Map<string, { entra: number; sale: number }>()
  for (const t of traslados) {
    const origen = String(t.id_caja_origen).trim()
    const destino = String(t.id_caja_destino).trim()
    porCaja.set(origen, { entra: porCaja.get(origen)?.entra ?? 0, sale: (porCaja.get(origen)?.sale ?? 0) + Number(t.valor) })
    porCaja.set(destino, { entra: (porCaja.get(destino)?.entra ?? 0) + Number(t.valor), sale: porCaja.get(destino)?.sale ?? 0 })
  }
  const cajasOrdenadas = [...porCaja.entries()].sort((a, b) => b[1].entra - b[1].sale - (a[1].entra - a[1].sale))

  return (
    <div className="nu-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-bold text-foreground">Traslados de fondos del periodo</p>
          <p className="text-[11px] text-muted-foreground">Movimientos entre cajas (no son recaudo: cambian dónde está la plata, no cuánta entró)</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-3 py-1 font-semibold">
            {traslados.length} traslado{traslados.length !== 1 ? 's' : ''} · <MontoAlineado value={total} />
          </span>
          {Object.entries(porMedio).map(([m, v]) => (
            <span key={m} className="rounded-full border border-border px-3 py-1 text-muted-foreground">
              {MEDIO_TRASLADO[m] ?? m}: <span className="font-semibold text-foreground"><MontoAlineado value={v} /></span>
            </span>
          ))}
        </div>
      </div>

      {traslados.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">No hubo traslados entre cajas en el periodo.</p>
      ) : (
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="overflow-x-auto border-b border-border lg:border-b-0 lg:border-r">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2.5 text-left nu-th">Caja</th>
                  <th className="px-4 py-2.5 text-right nu-th">Entró</th>
                  <th className="px-4 py-2.5 text-right nu-th">Salió</th>
                  <th className="px-4 py-2.5 text-right nu-th">Neto</th>
                </tr>
              </thead>
              <tbody>
                {cajasOrdenadas.map(([id, v]) => (
                  <tr key={id} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-2.5 font-medium">{nombreCaja(id)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400"><MontoAlineado value={v.entra} alinear="derecha" /></td>
                    <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400"><MontoAlineado value={v.sale} alinear="derecha" /></td>
                    <td className="px-4 py-2.5 text-right font-bold"><MontoAlineado value={v.entra - v.sale} alinear="derecha" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0">
                <tr className="border-b border-border">
                  {['Traslado', 'Fecha', 'Origen → Destino', 'Medio', 'Valor', 'Registró'].map((h) => (
                    <th key={h} className={cn('bg-muted px-4 py-2.5 nu-th', h === 'Valor' ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {traslados.map((t) => (
                  <tr key={t.id} className="border-b border-border/40 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono font-bold text-primary">{t.numero_tc ? `TC-${t.numero_tc}` : `#${t.id}`}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{formatters.dateTime(t.fecha)}</td>
                    <td className="px-4 py-2.5">
                      {nombreCaja(t.id_caja_origen)} <span className="text-muted-foreground">→</span> {nombreCaja(t.id_caja_destino)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{MEDIO_TRASLADO[t.medio_pago || 'EFE'] ?? t.medio_pago}</td>
                    <td className="px-4 py-2.5 text-right font-semibold"><MontoAlineado value={Number(t.valor)} alinear="derecha" /></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.usuario_nombre || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const pesoKg = (kg: number) => `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(kg)} kg`

/** Facturas que los conductores tienen asignadas y aún no cobran (saldo en SIESA, vencimiento, peso). */
function FacturasAsignadasConductores({ datos }: { datos: PendientesDetalle }) {
  const { facturas, conductores } = datos
  const saldo = facturas.reduce((acc, f) => acc + (f.saldo ?? f.valor_asignado), 0)
  const kg = facturas.reduce((acc, f) => acc + f.peso_kg, 0)
  const vencidas = facturas.filter((f) => (f.dias_vencida ?? 0) > 0).length

  return (
    <div className="nu-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-bold text-foreground">Facturas en ruta (asignadas a conductores, sin cobrar)</p>
          <p className="text-[11px] text-muted-foreground">Estado actual; "cobradas" cuenta lo que cobraron en el periodo consultado</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-3 py-1 font-semibold">
            {facturas.length} factura{facturas.length !== 1 ? 's' : ''} · <MontoAlineado value={saldo} />
          </span>
          <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">
            Carga: <span className="font-semibold text-foreground">{pesoKg(kg)}</span>
          </span>
          {vencidas > 0 && (
            <span className="rounded-full bg-red-500/10 px-3 py-1 font-semibold text-red-600 dark:text-red-400">{vencidas} vencida{vencidas !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {conductores.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">Ningún conductor tiene facturas asignadas pendientes.</p>
      ) : (
        <>
          <div className="overflow-x-auto border-b border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  {['Conductor', 'Pendientes', 'Saldo por cobrar', 'Carga', 'Vencidas', 'Más antigua', 'Cobradas en el periodo'].map((h, i) => (
                    <th key={h} className={cn('whitespace-nowrap px-4 py-2.5 nu-th', i === 0 ? 'text-left' : 'text-right')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conductores.map((c) => (
                  <tr key={c.conductor_id} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-2.5 font-semibold">{c.conductor}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.pendientes}</td>
                    <td className="px-4 py-2.5 text-right font-semibold"><MontoAlineado value={c.saldo} alinear="derecha" /></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{pesoKg(c.kg)}</td>
                    <td className={cn('px-4 py-2.5 text-right tabular-nums', c.vencidas > 0 && 'font-semibold text-red-600 dark:text-red-400')}>{c.vencidas}</td>
                    <td className={cn('px-4 py-2.5 text-right tabular-nums', c.mas_antigua_dias > 3 && 'font-semibold text-amber-600 dark:text-amber-400')}>
                      {c.pendientes ? `${c.mas_antigua_dias} día${c.mas_antigua_dias !== 1 ? 's' : ''}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="tabular-nums">{c.cobradas}</span> · <MontoAlineado value={c.valor_cobrado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {facturas.length > 0 && (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr>
                    {['Factura', 'Cliente', 'Conductor', 'Asignada', 'Vence', 'Peso', 'Saldo'].map((h) => (
                      <th key={h} className={cn('whitespace-nowrap bg-muted px-4 py-2.5 nu-th', ['Peso', 'Saldo'].includes(h) ? 'text-right' : 'text-left')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((f) => (
                    <tr key={f.id} className="border-b border-border/40 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono font-bold text-primary">{f.factura}</td>
                      <td className="max-w-[240px] px-4 py-2.5">
                        <p className="truncate font-medium">{f.cliente}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{f.nit}</p>
                      </td>
                      <td className="px-4 py-2.5">{f.conductor}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {formatters.dateTime(f.asignada)}
                        <p className="text-[10px]">hace {f.dias_asignada ?? 0} día{f.dias_asignada !== 1 ? 's' : ''} · por {f.asigno}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {f.vence ? formatters.dateOnly(f.vence) : '—'}
                        {(f.dias_vencida ?? 0) > 0 && <p className="text-[10px] font-semibold text-red-600 dark:text-red-400">vencida hace {f.dias_vencida} días</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{pesoKg(f.peso_kg)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        <MontoAlineado value={f.saldo ?? f.valor_asignado} alinear="derecha" />
                        {f.saldo != null && f.saldo < f.valor_asignado && (
                          <p className="text-[10px] font-normal text-muted-foreground">de <MontoAlineado value={f.valor_asignado} /> asignado</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
