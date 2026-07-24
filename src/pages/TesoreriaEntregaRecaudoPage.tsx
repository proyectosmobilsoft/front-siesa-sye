import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
    ChevronRight,
    Loader2,
    RefreshCw,
    AlertCircle,
    Banknote,
    CheckCircle2,
    Receipt,
    Landmark,
    Inbox,
    Hourglass,
    CalendarRange,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useEntregasPorEstado } from '@/hooks/useConductorEfectivo'
import { conductorEfectivoApi } from '@/api/conductorEfectivo'
import { reciboCajaApi } from '@/api/reciboCaja'
import { MovimientoEfectivo } from '@/api/types'
import { formatters } from '@/utils/formatters'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

// ─── Agrupación por conductor ────────────────────────────────────────────────

interface GrupoConductor {
    conductorId: number
    conductorNombre: string
    conductorSiesaNombre?: string
    entregas: MovimientoEfectivo[]
    total: number
}

const agruparPorConductor = (movimientos: MovimientoEfectivo[]): GrupoConductor[] => {
    const mapa = new Map<number, GrupoConductor>()
    for (const mov of movimientos) {
        const existente = mapa.get(mov.conductor_id)
        if (existente) {
            existente.entregas.push(mov)
            existente.total += mov.valor
        } else {
            mapa.set(mov.conductor_id, {
                conductorId: mov.conductor_id,
                conductorNombre: mov.conductor_nombre || `Conductor ${mov.conductor_id}`,
                conductorSiesaNombre: mov.conductor_siesa_nombre,
                entregas: [mov],
                total: mov.valor,
            })
        }
    }
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total)
}

// ─── Modal de validación física ──────────────────────────────────────────────

interface ValidarEntregaModalProps {
    entrega: MovimientoEfectivo | null
    onClose: () => void
    onConfirmado: () => void
}

const ValidarEntregaModal = ({ entrega, onClose, onConfirmado }: ValidarEntregaModalProps) => {
    const [valorContado, setValorContado] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!entrega) return null

    const contado = valorContado.trim() === '' ? entrega.valor : Number(valorContado)
    const diferencia = contado - entrega.valor
    const cuadra = diferencia === 0

    const handleConfirmar = async () => {
        setLoading(true)
        setError(null)
        try {
            await conductorEfectivoApi.confirmar(entrega.id, contado)
            onConfirmado()
        } catch (err: unknown) {
            const apiError = err as { response?: { data?: { message?: string } } }
            setError(apiError.response?.data?.message ?? 'Error al confirmar la entrega')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal isOpen onClose={onClose} title="Validar entrega de efectivo" className="max-w-md">
            <div className="space-y-4">
                <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 text-center">
                    <Banknote className="absolute -right-2 -top-2 h-16 w-16 text-primary/10" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Declarado por el conductor
                    </p>
                    <p className="mt-1 text-3xl font-extrabold tabular-nums text-primary">{formatters.currency(entrega.valor)}</p>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Valor contado físicamente
                    </label>
                    <Input
                        type="number"
                        inputMode="numeric"
                        placeholder={String(entrega.valor)}
                        value={valorContado}
                        onChange={(e) => setValorContado(e.target.value)}
                        className="text-lg font-semibold"
                        autoFocus
                    />
                </div>

                {!cuadra && valorContado.trim() !== '' && (
                    <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-semibold ${diferencia > 0
                        ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        Diferencia de {formatters.currency(Math.abs(diferencia))} ({diferencia > 0 ? 'sobrante' : 'faltante'})
                    </div>
                )}

                {error && (
                    <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" className="rounded-full" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleConfirmar} disabled={loading} className="gap-2 rounded-full">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Confirmar recepción
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

// ─── Sub-tabla de entregas de un conductor ───────────────────────────────────

const EntregasSubAccordion = ({ entregas, colSpan, onValidar }: { entregas: MovimientoEfectivo[]; colSpan: number; onValidar?: (mov: MovimientoEfectivo) => void }) => {
    const confirmadas = !onValidar
    return (
    <tr>
        <td colSpan={colSpan} className="p-0">
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                    height: { type: 'spring', stiffness: 320, damping: 30, mass: 0.7 },
                    opacity: { duration: 0.18, ease: 'easeOut' },
                }}
                className="overflow-hidden"
            >
                <div className="mx-4 my-2 overflow-hidden rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 border-b border-primary/10 bg-primary/10 px-4 py-2">
                        <Banknote className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                            {confirmadas ? 'Entregas confirmadas' : 'Entregas pendientes de validar'}
                        </span>
                    </div>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-primary/10">
                                <th className="h-8 px-4 text-left font-medium uppercase tracking-wide text-muted-foreground">Fecha</th>
                                <th className="h-8 px-4 text-left font-medium uppercase tracking-wide text-muted-foreground">Referencia</th>
                                <th className="h-8 px-4 text-right font-medium uppercase tracking-wide text-muted-foreground">Valor</th>
                                {confirmadas ? (
                                    <>
                                        <th className="h-8 px-4 text-right font-medium uppercase tracking-wide text-muted-foreground">Diferencia</th>
                                        <th className="h-8 px-4 text-left font-medium uppercase tracking-wide text-muted-foreground">Aprobado por</th>
                                    </>
                                ) : (
                                    <th className="h-8 px-4 text-right font-medium uppercase tracking-wide text-muted-foreground">Acción</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {entregas.map((mov, idx) => (
                                <motion.tr
                                    key={mov.id}
                                    className="border-b border-primary/10 transition-colors last:border-0 hover:bg-primary/10"
                                    initial={{ opacity: 0, x: -4 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.18, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    <td className="px-4 py-2 text-muted-foreground">{formatters.dateTime(mov.fecha)}</td>
                                    <td className="px-4 py-2 text-muted-foreground">{mov.referencia || <span className="italic">—</span>}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-primary">{formatters.currency(mov.valor)}</td>
                                    {confirmadas ? (
                                        <>
                                            <td className="px-4 py-2 text-right font-semibold">
                                                {mov.diferencia ? (
                                                    <span className={mov.diferencia > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}>
                                                        {mov.diferencia > 0 ? '+' : ''}{formatters.currency(mov.diferencia)}
                                                    </span>
                                                ) : (
                                                    <span className="text-green-600 dark:text-green-400">Cuadrado</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-muted-foreground">{mov.usuario_confirma_nombre || '—'}</td>
                                        </>
                                    ) : (
                                        <td className="px-4 py-2 text-right">
                                            <Button size="sm" className="h-7 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); onValidar!(mov) }}>
                                                <CheckCircle2 className="h-3 w-3" /> Validar
                                            </Button>
                                        </td>
                                    )}
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </td>
    </tr>
    )
}

// ─── Fila de conductor ────────────────────────────────────────────────────────

const ConductorGrupoRow = ({ grupo, idx, onValidar, onVerRC, etiqueta }: { grupo: GrupoConductor; idx: number; onValidar?: (mov: MovimientoEfectivo) => void; onVerRC: (grupo: GrupoConductor) => void; etiqueta: string }) => {
    const [expanded, setExpanded] = useState(false)
    const confirmadas = !onValidar

    return (
        <>
            <motion.tr
                className={cn(
                    'cursor-pointer border-b last:border-0 transition-colors',
                    expanded ? 'bg-primary/5' : 'hover:bg-muted/30'
                )}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setExpanded((prev) => !prev)}
            >
                <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={{ rotate: expanded ? 90 : 0 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 24 }}
                            className="flex-shrink-0 text-muted-foreground/70"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </motion.div>
                        <div
                            className={cn(
                                'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm',
                                confirmadas
                                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                                    : 'bg-gradient-to-br from-amber-400 to-amber-600'
                            )}
                        >
                            {grupo.conductorNombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold leading-tight">{grupo.conductorNombre}</span>
                            <span className="text-[11px] text-muted-foreground">
                                {grupo.entregas.length} entrega{grupo.entregas.length > 1 ? 's' : ''} {etiqueta}{grupo.entregas.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </td>
                <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold tabular-nums text-foreground">{formatters.currency(grupo.total)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 rounded-full text-xs"
                        onClick={(e) => { e.stopPropagation(); onVerRC(grupo) }}
                    >
                        <Receipt className="h-3 w-3" /> Ver recibos
                    </Button>
                </td>
            </motion.tr>
            <AnimatePresence>
                {expanded && <EntregasSubAccordion entregas={grupo.entregas} colSpan={3} onValidar={onValidar} />}
            </AnimatePresence>
        </>
    )
}

// ─── Modal: recibos de caja del conductor ────────────────────────────────────

const estadoRCBadge = (estado: number) => estado === 3
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : estado === 2
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'

const estadoRCLabel = (estado: number) => estado === 3 ? 'Aprobado' : estado === 2 ? 'Anulado' : 'En proceso'

const RecibosConductorModal = ({ grupo, onClose }: { grupo: GrupoConductor | null; onClose: () => void }) => {
    const siesaNombre = grupo?.conductorSiesaNombre
    const hoy = new Date().toISOString().slice(0, 10)
    const { data, isLoading, error } = useQuery({
        queryKey: ['recibo-caja', 'por-usuario', siesaNombre, hoy],
        queryFn: () => reciboCajaApi.getPorUsuario(siesaNombre as string, { fechaInicial: hoy, fechaFinal: hoy, tipo: 'RC' }),
        enabled: !!siesaNombre,
    })

    if (!grupo) return null

    // Solo lo que realmente respalda la entrega de hoy: RC de hoy, no anulados.
    const recibos = (data ?? []).filter((r) => r.Estado !== 2)
    const totalEfectivo = recibos.reduce((sum, r) => sum + (r.efectivo ?? 0), 0)
    const totalConsignacion = recibos.reduce((sum, r) => sum + (r.consignacion ?? 0), 0)

    return (
        <Modal isOpen onClose={onClose} title={`Recibos de caja de hoy — ${grupo.conductorNombre}`} className="max-w-3xl">
            {!siesaNombre ? (
                <p className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm font-semibold text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                    Este conductor no tiene usuario SIESA vinculado (siesa_nombre), no se puede consultar sus recibos.
                </p>
            ) : isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando recibos...
                </div>
            ) : error ? (
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Error al cargar los recibos.</p>
            ) : recibos.length === 0 ? (
                <p className="py-10 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Este conductor no tiene recibos de caja hoy
                </p>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                                <Banknote className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total efectivo</p>
                                <p className="text-base font-bold tabular-nums text-foreground">{formatters.currency(totalEfectivo)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                                <Landmark className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total transferencia</p>
                                <p className="text-base font-bold tabular-nums text-foreground">{formatters.currency(totalConsignacion)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-card">
                                <tr className="border-b border-border">
                                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-muted-foreground">Fecha</th>
                                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-muted-foreground">N°</th>
                                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-muted-foreground">Tercero</th>
                                    <th className="px-3 py-2 text-right font-medium uppercase tracking-wide text-muted-foreground">Efectivo</th>
                                    <th className="px-3 py-2 text-right font-medium uppercase tracking-wide text-muted-foreground">Transferencia</th>
                                    <th className="px-3 py-2 text-center font-medium uppercase tracking-wide text-muted-foreground">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recibos.map((r) => (
                                    <tr key={r.Rowid} className="border-b border-border/50 hover:bg-muted/20">
                                        <td className="whitespace-nowrap px-3 py-2 font-mono text-muted-foreground">{r.Fecha?.slice(0, 10)}</td>
                                        <td className="px-3 py-2 font-mono font-bold text-primary">{r.Numero}</td>
                                        <td className="max-w-[160px] truncate px-3 py-2">{r.Tercero_Nombre || r.Id_tercero}</td>
                                        <td className="px-3 py-2 text-right font-mono font-semibold">
                                            {r.efectivo ? formatters.currency(r.efectivo) : <span className="text-muted-foreground">—</span>}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-semibold">
                                            {r.consignacion ? (
                                                <span title={r.consignacion_cuenta_nombre || undefined}>{formatters.currency(r.consignacion)}</span>
                                            ) : <span className="text-muted-foreground">—</span>}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase', estadoRCBadge(r.Estado))}>
                                                {estadoRCLabel(r.Estado)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Modal>
    )
}

// ─── Panel (pendientes o confirmadas) ────────────────────────────────────────

interface EntregasPanelProps {
    esPendiente: boolean
    data: MovimientoEfectivo[] | undefined
    isLoading: boolean
    error: unknown
    onValidar?: (mov: MovimientoEfectivo) => void
    onVerRC: (grupo: GrupoConductor) => void
}

const EntregasPanel = ({ esPendiente, data, isLoading, error, onValidar, onVerRC }: EntregasPanelProps) => {
    const grupos = useMemo(() => agruparPorConductor(data ?? []), [data])
    const total = useMemo(() => grupos.reduce((sum, g) => sum + g.total, 0), [grupos])

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Card className={cn('overflow-hidden border-l-4', esPendiente ? 'border-l-amber-500' : 'border-l-emerald-500')}>
                <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                    <div className="flex items-center gap-3">
                        <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', esPendiente ? 'bg-amber-500/10' : 'bg-emerald-500/10')}>
                            {esPendiente ? <Hourglass className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        </div>
                        <CardTitle className="text-sm font-bold">
                            {esPendiente ? 'Pendientes por validar' : 'Ya validadas'}
                        </CardTitle>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                        {grupos.length} conductor{grupos.length !== 1 ? 'es' : ''}
                    </span>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold tabular-nums text-foreground">{formatters.currency(total)}</p>
                </CardContent>
            </Card>

            <Card className="flex-1 overflow-hidden">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="space-y-px p-4">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="flex animate-pulse items-center gap-3 py-3">
                                    <div className="h-9 w-9 rounded-full bg-muted" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-32 rounded bg-muted" />
                                        <div className="h-2 w-20 rounded bg-muted" />
                                    </div>
                                    <div className="h-4 w-20 rounded bg-muted" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center gap-2 py-14">
                            <AlertCircle className="h-6 w-6 text-red-500" />
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Error al cargar las entregas.</p>
                        </div>
                    ) : grupos.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Inbox className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                {esPendiente ? 'No hay entregas pendientes' : 'No hay entregas validadas'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40">
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Conductor</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-muted-foreground">Recibos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grupos.map((grupo, idx) => (
                                    <ConductorGrupoRow
                                        key={grupo.conductorId}
                                        grupo={grupo}
                                        idx={idx}
                                        onValidar={onValidar}
                                        onVerRC={onVerRC}
                                        etiqueta={esPendiente ? 'pendiente' : 'confirmada'}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

// ─── Página ───────────────────────────────────────────────────────────────────

const hoyISO = () => new Date().toISOString().slice(0, 10)

export const TesoreriaEntregaRecaudoPage = () => {
    const [fechaDesde, setFechaDesde] = useState(hoyISO())
    const [fechaHasta, setFechaHasta] = useState('')
    const rango = fechaDesde ? { fechaInicial: fechaDesde, fechaFinal: fechaHasta || undefined } : undefined
    const filtroActivo = fechaDesde !== hoyISO() || fechaHasta !== ''

    const pendientesQuery = useEntregasPorEstado('PENDIENTE', rango)
    const confirmadasQuery = useEntregasPorEstado('CONFIRMADO', rango)

    const [movValidando, setMovValidando] = useState<MovimientoEfectivo | null>(null)
    const [grupoViendoRC, setGrupoViendoRC] = useState<GrupoConductor | null>(null)
    const queryClient = useQueryClient()

    const refrescarTodo = () => {
        pendientesQuery.refetch()
        confirmadasQuery.refetch()
    }
    const refrescando = pendientesQuery.isRefetching || confirmadasQuery.isRefetching

    const handleConfirmado = () => {
        setMovValidando(null)
        queryClient.invalidateQueries({ queryKey: ['conductor-efectivo'] })
    }

    return (
        <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-sm">
                        <Landmark className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Entrega de Recaudo</h1>
                        <p className="text-sm text-muted-foreground">Valida el efectivo entregado físicamente por los conductores</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={refrescarTodo} disabled={refrescando}>
                    <RefreshCw className={cn('h-3.5 w-3.5', refrescando && 'animate-spin')} /> Actualizar
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <CalendarRange className="h-4 w-4" /> Rango de fechas
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    Desde
                    <Input
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => setFechaDesde(e.target.value)}
                        className="h-8 w-auto text-xs"
                    />
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    Hasta
                    <Input
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => setFechaHasta(e.target.value)}
                        min={fechaDesde}
                        className="h-8 w-auto text-xs"
                        placeholder="Hoy"
                    />
                </label>
                {filtroActivo && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground"
                        onClick={() => { setFechaDesde(hoyISO()); setFechaHasta('') }}
                    >
                        Volver a hoy
                    </Button>
                )}
            </div>

            <div className="grid items-start gap-5 lg:grid-cols-2">
                <EntregasPanel
                    esPendiente
                    data={pendientesQuery.data}
                    isLoading={pendientesQuery.isLoading}
                    error={pendientesQuery.error}
                    onValidar={setMovValidando}
                    onVerRC={setGrupoViendoRC}
                />
                <EntregasPanel
                    esPendiente={false}
                    data={confirmadasQuery.data}
                    isLoading={confirmadasQuery.isLoading}
                    error={confirmadasQuery.error}
                    onVerRC={setGrupoViendoRC}
                />
            </div>

            <ValidarEntregaModal entrega={movValidando} onClose={() => setMovValidando(null)} onConfirmado={handleConfirmado} />
            <RecibosConductorModal grupo={grupoViendoRC} onClose={() => setGrupoViendoRC(null)} />
        </div>
    )
}
