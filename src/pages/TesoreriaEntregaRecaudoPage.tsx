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
    Scale,
    ShieldCheck,
    TriangleAlert,
    Users,
    Search,
    Download,
    Wallet,
    Hash,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useEntregasPorEstado } from '@/hooks/useConductorEfectivo'
import { conductorEfectivoApi } from '@/api/conductorEfectivo'
import { reciboCajaApi } from '@/api/reciboCaja'
import { DocumentacionRCAnulado, MovimientoEfectivo, ReciboCajaUsuario } from '@/api/types'
import { formatters } from '@/utils/formatters'
import { estadoRCBadge, estadoRCLabel } from '@/utils/badges'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { usePermiso } from '@/hooks/usePermiso'

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

// ─── Estado de conciliación por conductor ───────────────────────────────────

interface ConciliacionConductor extends GrupoConductor {
    diferencia: number
    montoPendiente: number
    movimientosConDiferencia: number
}

const ConciliarConductorModal = ({
    conductor,
    onClose,
    onConciliar,
    loading,
    error,
}: {
    conductor: ConciliacionConductor | null
    onClose: () => void
    onConciliar: (conductor: ConciliacionConductor) => void
    loading: boolean
    error: string | null
}) => {
    if (!conductor) return null

    const esFaltante = conductor.diferencia < 0

    return (
        <Modal isOpen onClose={onClose} title={`Conciliar a ${conductor.conductorNombre}`} className="max-w-md">
            <div className="space-y-4">
                <div className={cn(
                    'rounded-xl border p-4',
                    esFaltante
                        ? 'border-destructive/30 bg-destructive/10'
                        : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                )}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {conductor.diferencia === 0 ? 'Diferencias por resolver' : esFaltante ? 'Faltante por resolver' : 'Sobrante por resolver'}
                    </p>
                    <p className={cn('mt-1 text-3xl font-extrabold tabular-nums', esFaltante ? 'text-destructive' : 'text-emerald-600')}>
                        {formatters.currency(conductor.diferencia !== 0 ? Math.abs(conductor.diferencia) : conductor.montoPendiente)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Corresponde a {conductor.movimientosConDiferencia} entrega{conductor.movimientosConDiferencia !== 1 ? 's' : ''} con diferencia
                        {conductor.diferencia !== 0 && conductor.montoPendiente !== Math.abs(conductor.diferencia)
                            ? ` (neto; monto bruto ${formatters.currency(conductor.montoPendiente)})`
                            : '.'}
                    </p>
                </div>

                <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                    <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    Confirma esta acción únicamente cuando el conductor haya pagado el faltante o la diferencia haya sido resuelta. Esto actualiza el registro en el servidor y se reflejará en el comprobante de la app.
                </div>

                {error && (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-bold text-destructive">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button className="gap-2" onClick={() => onConciliar(conductor)} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        Confirmar conciliación
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

const SIN_ANULACIONES: Set<number> = new Set()

const TableroConciliacion = ({ movimientos, onResuelto }: { movimientos: MovimientoEfectivo[] | undefined; onResuelto: () => void }) => {
    // Resolver diferencias también se exige en la API
    // (requirePermiso RESOLVER_DIFERENCIA_RECAUDO).
    const { puede, P } = usePermiso()
    const puedeResolver = puede(P.RESOLVER_DIFERENCIA)

    const [seleccionado, setSeleccionado] = useState<ConciliacionConductor | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const conductores = useMemo<ConciliacionConductor[]>(() => {
        return agruparPorConductor(movimientos ?? []).map((grupo) => {
            const movimientosAbiertos = grupo.entregas.filter((mov) => !mov.diferencia_resuelta)

            return {
                ...grupo,
                diferencia: movimientosAbiertos.reduce((total, mov) => total + (mov.diferencia ?? 0), 0),
                montoPendiente: movimientosAbiertos.reduce((total, mov) => total + Math.abs(mov.diferencia ?? 0), 0),
                movimientosConDiferencia: movimientosAbiertos.filter((mov) => (mov.diferencia ?? 0) !== 0).length,
            }
        }).sort((a, b) => b.montoPendiente - a.montoPendiente)
    }, [movimientos])

    const descuadrados = conductores.filter((conductor) => conductor.movimientosConDiferencia > 0)
    const totalPorConciliar = descuadrados.reduce((total, conductor) => total + conductor.montoPendiente, 0)

    const handleConciliar = async (conductor: ConciliacionConductor) => {
        const ids = conductor.entregas
            .filter((mov) => !mov.diferencia_resuelta && (mov.diferencia ?? 0) !== 0)
            .map((mov) => mov.id)
        if (ids.length === 0) {
            setSeleccionado(null)
            return
        }
        setGuardando(true)
        setError(null)
        try {
            await conductorEfectivoApi.resolverDiferencia(ids)
            setSeleccionado(null)
            onResuelto()
        } catch (err: unknown) {
            const apiError = err as { response?: { data?: { message?: string } } }
            setError(apiError.response?.data?.message ?? 'Error al conciliar la diferencia')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <>
            <Card className="overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/20">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                <Scale className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Estado de cuenta de conductores</CardTitle>
                                <p className="mt-0.5 text-xs text-muted-foreground">Seguimiento de diferencias y conciliaciones del periodo seleccionado</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                                <Users className="mr-1 inline h-3.5 w-3.5" /> {conductores.length} conductores
                            </span>
                            <span className={cn(
                                'rounded-full px-3 py-1 text-xs font-bold',
                                descuadrados.length ? 'bg-destructive/10 text-destructive' : 'bg-emerald-100 text-emerald-700'
                            )}>
                                {descuadrados.length} por conciliar
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {conductores.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                            <Users className="h-6 w-6" />
                            <p className="text-xs font-bold uppercase tracking-widest">No hay conductores en este periodo</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Conductor</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Estado</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Diferencia</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {conductores.map((conductor) => {
                                        const alDia = conductor.movimientosConDiferencia === 0
                                        return (
                                            <tr key={conductor.conductorId} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                                                <td className="px-5 py-3 text-left">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white',
                                                            alDia ? 'bg-emerald-500' : 'bg-destructive'
                                                        )}>
                                                            {conductor.conductorNombre.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold">{conductor.conductorNombre}</p>
                                                            <p className="text-[11px] text-muted-foreground">{conductor.entregas.length} entregas revisadas</p>
                                                            {(() => {
                                                                const ultimaResuelta = conductor.entregas
                                                                    .filter((mov) => mov.diferencia_resuelta && mov.fecha_resolucion)
                                                                    .sort((a, b) => (b.fecha_resolucion ?? '').localeCompare(a.fecha_resolucion ?? ''))[0]
                                                                if (!ultimaResuelta) return null
                                                                return (
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        Última conciliación: {ultimaResuelta.usuario_resuelve_nombre ?? '—'} · {formatters.dateTime(ultimaResuelta.fecha_resolucion!)}
                                                                    </p>
                                                                )
                                                            })()}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-left">
                                                    <p className="font-bold tabular-nums text-foreground">{formatters.currency(conductor.total)}</p>
                                                </td>
                                                <td className="px-5 py-3 text-left">
                                                    <span className={cn(
                                                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
                                                        alDia
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                            : 'bg-destructive/10 text-destructive'
                                                    )}>
                                                        {alDia ? <ShieldCheck className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
                                                        {alDia ? 'Al día' : 'Tiene un descuadre'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <p className={cn('font-bold tabular-nums', alDia ? 'text-emerald-600' : conductor.diferencia < 0 ? 'text-destructive' : 'text-emerald-600')}>
                                                        {alDia ? formatters.currency(0) : formatters.currency(conductor.montoPendiente)}
                                                    </p>
                                                    {!alDia && (
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {conductor.diferencia === 0 ? 'Diferencias compensadas' : conductor.diferencia < 0 ? 'Faltante' : 'Sobrante'}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-left">
                                                    <Button
                                                        variant={alDia ? 'ghost' : 'default'}
                                                        size="sm"
                                                        disabled={alDia || !puedeResolver}
                                                        className="gap-1.5 text-xs"
                                                        onClick={() => setSeleccionado(conductor)}
                                                        title={!puedeResolver ? 'Requiere el permiso Resolver diferencia' : undefined}
                                                    >
                                                        {alDia ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Scale className="h-3.5 w-3.5" />}
                                                        {alDia ? 'Sin pendientes' : 'Conciliar'}
                                                    </Button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                {descuadrados.length > 0 && (
                                    <tfoot>
                                        <tr className="border-t border-border bg-destructive/10">
                                            <td colSpan={2} className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Total de diferencias por conciliar</td>
                                            <td className="px-5 py-3 text-right font-extrabold tabular-nums text-destructive">{formatters.currency(totalPorConciliar)}</td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
            <ConciliarConductorModal
                conductor={seleccionado}
                onClose={() => setSeleccionado(null)}
                onConciliar={handleConciliar}
                loading={guardando}
                error={error}
            />
        </>
    )
}

// ─── Modal de validación física ──────────────────────────────────────────────

interface ValidarEntregaModalProps {
    entrega: MovimientoEfectivo | null
    onClose: () => void
    onConfirmado: () => void
}

const ValidarEntregaModal = ({ entrega, onClose, onConfirmado }: ValidarEntregaModalProps) => {
    // Confirmar la recepción también se exige en la API
    // (requirePermiso CONFIRMAR_ENTREGA_RECAUDO).
    const { puede, P } = usePermiso()
    const puedeConfirmar = puede(P.CONFIRMAR_ENTREGA)

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
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'border-destructive/30 bg-destructive/10 text-destructive'
                        }`}>
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        Diferencia de {formatters.currency(Math.abs(diferencia))} ({diferencia > 0 ? 'sobrante' : 'faltante'})
                    </div>
                )}

                {error && (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-bold text-destructive">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    {puedeConfirmar && (
                        <Button onClick={handleConfirmar} disabled={loading} className="gap-2">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Confirmar recepción
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    )
}

// ─── Sub-tabla de entregas de un conductor ───────────────────────────────────

const EntregasSubAccordion = ({ entregas, colSpan, onValidar, entregasConHistorialAnulado }: { entregas: MovimientoEfectivo[]; colSpan: number; onValidar?: (mov: MovimientoEfectivo) => void; entregasConHistorialAnulado?: Set<number> }) => {
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
                                <th className="h-8 px-4 text-left font-medium uppercase tracking-wide text-muted-foreground">Valor</th>
                                {confirmadas ? (
                                    <>
                                        <th className="h-8 px-4 text-left font-medium uppercase tracking-wide text-muted-foreground">Diferencia</th>
                                        <th className="h-8 px-4 text-left font-medium uppercase tracking-wide text-muted-foreground">Aprobado por</th>
                                    </>
                                ) : (
                                    <th className="h-8 px-4 text-left font-medium uppercase tracking-wide text-muted-foreground">Acción</th>
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
                                    <td className="px-4 py-2 text-left text-muted-foreground">{formatters.dateTime(mov.fecha)}</td>
                                    <td className="px-4 py-2 text-left text-muted-foreground">
                                        {entregasConHistorialAnulado?.has(mov.id) ? (
                                            <span className="font-bold uppercase text-destructive">Anulado</span>
                                        ) : (
                                            mov.referencia || <span className="italic">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-left font-semibold text-primary">{formatters.currency(mov.valor)}</td>
                                    {confirmadas ? (
                                        <>
                                            <td className="px-4 py-2 text-left font-semibold">
                                                {mov.diferencia ? (
                                                    <span className={mov.diferencia > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>
                                                        {mov.diferencia > 0 ? '+' : ''}{formatters.currency(mov.diferencia)}
                                                    </span>
                                                ) : (
                                                    <span className="text-green-600 dark:text-green-400">Cuadrado</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-left text-muted-foreground">{mov.usuario_confirma_nombre || '—'}</td>
                                        </>
                                    ) : (
                                        <td className="px-4 py-2 text-left">
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

const ConductorGrupoRow = ({ grupo, idx, onValidar, onVerRC, etiqueta, tieneAnulacionPosterior, entregasConHistorialAnulado }: { grupo: GrupoConductor; idx: number; onValidar?: (mov: MovimientoEfectivo) => void; onVerRC: (grupo: GrupoConductor) => void; etiqueta: string; tieneAnulacionPosterior?: boolean; entregasConHistorialAnulado?: Set<number> }) => {
    const [expanded, setExpanded] = useState(false)
    const confirmadas = !onValidar

    return (
        <>
            <motion.tr
                className={cn(
                    'cursor-pointer border-b last:border-0 transition-colors',
                    expanded ? (tieneAnulacionPosterior ? 'bg-amber-500/10' : 'bg-primary/5') : (tieneAnulacionPosterior ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-muted/30')
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
                                    ? (tieneAnulacionPosterior ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-emerald-500 to-emerald-600')
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
                            {tieneAnulacionPosterior && (
                                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                    RC anulado después de entrega
                                </span>
                            )}
                        </div>
                    </div>
                </td>
                <td className="px-4 py-3 text-left">
                    <span className="text-sm font-bold tabular-nums text-foreground">{formatters.currency(grupo.total)}</span>
                </td>
                <td className="px-4 py-3 text-left">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={(e) => { e.stopPropagation(); onVerRC(grupo) }}
                    >
                        <Receipt className="h-3 w-3" /> Ver recibos
                    </Button>
                </td>
            </motion.tr>
            <AnimatePresence>
                {expanded && <EntregasSubAccordion entregas={grupo.entregas} colSpan={3} onValidar={onValidar} entregasConHistorialAnulado={entregasConHistorialAnulado} />}
            </AnimatePresence>
        </>
    )
}

// ─── Modal: recibos de caja del conductor ────────────────────────────────────

const exportarRecibosCSV = (recibos: ReciboCajaUsuario[], conductorNombre: string) => {
    const encabezados = ['Fecha', 'Numero', 'Tercero', 'Efectivo', 'Transferencia', 'Total', 'Estado']
    const filas = recibos.map((r) => [
        r.Fecha?.slice(0, 10) ?? '',
        r.Numero,
        r.Tercero_Nombre || r.Id_tercero,
        r.efectivo ?? 0,
        r.consignacion ?? 0,
        (r.efectivo ?? 0) + (r.consignacion ?? 0),
        estadoRCLabel(r.Estado),
    ])
    const csv = [encabezados, ...filas].map((fila) => fila.join(';')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recibos-${conductorNombre.replace(/\s+/g, '_').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

// El número de reemplazo no modifica el RC original: queda como una versión
// adicional de la auditoría para que una corrección posterior nunca borre el
// dato que Tesorería registró antes.
const DocumentarRCAnuladoModal = ({
    recibo,
    documentacion,
    onClose,
    onGuardado,
}: {
    recibo: ReciboCajaUsuario | null
    documentacion?: DocumentacionRCAnulado
    onClose: () => void
    onGuardado: () => void
}) => {
    const [numeroRc, setNumeroRc] = useState('')
    const [observacion, setObservacion] = useState('')
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!recibo) return null

    const handleGuardar = async () => {
        const numero = Number(numeroRc)
        if (!Number.isInteger(numero) || numero <= 0) {
            setError('Ingrese el número entero del RC de reemplazo elaborado en SIESA.')
            return
        }

        setGuardando(true)
        setError(null)
        try {
            await reciboCajaApi.registrarDocumentacionAnulacion({
                rcRowid: recibo.Rowid,
                numeroRcReemplazo: numero,
                observacion,
            })
            onGuardado()
        } catch (err: unknown) {
            const apiError = err as { response?: { data?: { message?: string } } }
            setError(apiError.response?.data?.message ?? 'No se pudo guardar la documentación del RC anulado.')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={documentacion ? `Corregir documentación del RC #${recibo.Numero}` : `Documentar reemplazo del RC #${recibo.Numero}`}
            className="max-w-md"
        >
            <div className="space-y-4">
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
                    <p className="font-bold text-destructive">
                        RC #${recibo.Numero} anulado{recibo.Usuario_Anulacion ? ` por ${recibo.Usuario_Anulacion}` : ''} en SIESA
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Este recibo no suma al recaudo ni al efectivo vigente del conductor. Registre el nuevo consecutivo que Tesorería elaboró directamente en SIESA.
                    </p>
                </div>

                {documentacion && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                        Último registro: RC #{documentacion.numero_rc_reemplazo} · versión {documentacion.version}
                        {documentacion.usuario_registro_nombre ? ` · ${documentacion.usuario_registro_nombre}` : ''}.
                        Guardar ahora crea una nueva versión; el historial anterior se conserva.
                    </div>
                )}

                <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Número del RC de reemplazo en SIESA
                    </label>
                    <Input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={numeroRc}
                        onChange={(event) => setNumeroRc(event.target.value)}
                        placeholder="Ej. 70834"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Observación (opcional)
                    </label>
                    <textarea
                        value={observacion}
                        onChange={(event) => setObservacion(event.target.value)}
                        maxLength={500}
                        rows={3}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Motivo o referencia para la reposición"
                    />
                </div>

                {error && (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-bold text-destructive">{error}</p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
                    <Button onClick={handleGuardar} disabled={guardando} className="gap-2">
                        {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                        {documentacion ? 'Guardar corrección' : 'Guardar RC de reemplazo'}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

const RecibosConductorModal = ({ grupo, onClose, rango }: { grupo: GrupoConductor | null; onClose: () => void; rango: { fechaInicial?: string; fechaFinal?: string } | undefined }) => {
    // Exportar a CSV es una acción con permiso propio del módulo.
    const { puede, P } = usePermiso()
    const puedeExportar = puede(P.EXPORTAR_ENTREGA)

    const [incluirAnulados, setIncluirAnulados] = useState(false)
    const [reciboDocumentando, setReciboDocumentando] = useState<ReciboCajaUsuario | null>(null)
    const queryClient = useQueryClient()
    const siesaNombre = grupo?.conductorSiesaNombre
    const fechaInicial = rango?.fechaInicial
    const fechaFinal = rango?.fechaFinal ?? rango?.fechaInicial
    const { data, isLoading, error } = useQuery({
        queryKey: ['recibo-caja', 'por-usuario', siesaNombre, fechaInicial, fechaFinal],
        queryFn: () => reciboCajaApi.getPorUsuario(siesaNombre as string, { fechaInicial, fechaFinal, tipo: 'RC' }),
        enabled: !!siesaNombre,
    })

    const rowidsAnulados = (data ?? []).filter((recibo) => recibo.Estado === 2).map((recibo) => recibo.Rowid)
    const documentacionQuery = useQuery({
        queryKey: ['recibo-caja', 'anulaciones', ...rowidsAnulados],
        queryFn: () => reciboCajaApi.getDocumentacionAnulaciones(rowidsAnulados),
        // La documentación es secundaria al tablero. Solo se consulta cuando
        // el usuario abre explícitamente los anulados, para que una migración
        // de BD2 pendiente no rompa la vista principal.
        enabled: rowidsAnulados.length > 0 && incluirAnulados,
        retry: false,
    })
    const documentacionPorRowid = useMemo(
        () => new Map((documentacionQuery.data ?? []).map((registro) => [registro.rc_rowid_siesa, registro])),
        [documentacionQuery.data]
    )

    if (!grupo) return null

    const todosRecibos = data ?? []
    const conteoAnulados = todosRecibos.filter((r) => r.Estado === 2).length
    const recibos = incluirAnulados ? todosRecibos : todosRecibos.filter((r) => r.Estado !== 2)
    // No hay forma confiable de saber qué RC puntual respalda cuál entrega
    // (SIESA permite consolidar varias entregas en 1 RC). Se compara el total
    // entregado y confirmado de este conductor contra el efectivo de sus RC
    // ACTIVOS (no anulados) — si un RC se anuló pero otro activo ya cubre el
    // total, no hay faltante real aunque haya anulados en la lista.
    const totalActivo = todosRecibos.filter((recibo) => recibo.Estado !== 2).reduce((sum, recibo) => sum + (recibo.efectivo ?? 0), 0)

    const valorEntrega = grupo.entregas.reduce(
        (sum, movimiento) => sum + (movimiento.estado === 'CONFIRMADO' ? (movimiento.valor_confirmado ?? movimiento.valor) : movimiento.valor),
        0
    )
    const faltante = Math.max(0, valorEntrega - totalActivo)
    const totalEfectivo = Math.min(valorEntrega, totalActivo)
    const totalConsignacion = 0
    const totalGeneral = totalEfectivo
    const etiquetaPeriodo = fechaInicial === fechaFinal ? `del ${fechaInicial}` : `${fechaInicial} — ${fechaFinal}`

    return (
        <Modal isOpen onClose={onClose} title={`Recibos de caja ${etiquetaPeriodo} — ${grupo.conductorNombre}`} className="max-w-5xl">
            {!siesaNombre ? (
                <p className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm font-semibold text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                    Este conductor no tiene usuario SIESA vinculado (siesa_nombre), no se puede consultar sus recibos.
                </p>
            ) : isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando recibos...
                </div>
            ) : error ? (
                <p className="text-sm font-semibold text-destructive">Error al cargar los recibos.</p>
            ) : todosRecibos.length === 0 ? (
                <p className="py-10 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Este conductor no tiene recibos de caja en el periodo
                </p>
            ) : recibos.length === 0 && conteoAnulados > 0 && !incluirAnulados ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">
                            No hay recibos de caja activos en este periodo.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Se encontraron <strong className="text-destructive">{conteoAnulados} recibo{conteoAnulados !== 1 ? 's' : ''} ANULADO{conteoAnulados !== 1 ? 'S' : ''}</strong> en SIESA para este conductor en la fecha seleccionada.
                        </p>
                        <p className="text-xs font-bold text-foreground">
                            Recaudo aplicable a esta entrega: {formatters.currency(totalEfectivo)}
                        </p>
                        {faltante > 0 && (
                            <p className="text-xs font-bold text-destructive">
                                Falta respaldo por {formatters.currency(faltante)} — ningún RC activo lo cubre
                            </p>
                        )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIncluirAnulados(true)}>
                        Ver recibos anulados ({conteoAnulados})
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        {conteoAnulados > 0 && (
                            <Button
                                variant={incluirAnulados ? "secondary" : "outline"}
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={() => setIncluirAnulados(!incluirAnulados)}
                            >
                                {incluirAnulados ? "Ocultar anulados" : `Mostrar recibos anulados (${conteoAnulados})`}
                            </Button>
                        )}
                        {puedeExportar && (
                            <div className="ml-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-xs"
                                    onClick={() => exportarRecibosCSV(recibos, grupo.conductorNombre)}
                                >
                                    <Download className="h-3.5 w-3.5" /> Exportar CSV
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                                <Banknote className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Recaudo aplicable a esta entrega</p>
                                <p className="text-base font-bold tabular-nums text-foreground">{formatters.currency(totalEfectivo)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                                <Landmark className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Transferencia aplicable</p>
                                <p className="text-base font-bold tabular-nums text-foreground">{formatters.currency(totalConsignacion)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <Receipt className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total recaudado</p>
                                <p className="text-base font-extrabold tabular-nums text-primary">{formatters.currency(totalGeneral)}</p>
                            </div>
                        </div>
                    </div>

                    {conteoAnulados > 0 && (
                        <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
                            <p>
                                Los RC anulados no cuentan en el recaudo vigente de <strong>{grupo.conductorNombre}</strong>; solo se toma el efectivo de sus RC activos.
                                {faltante > 0 && (
                                    <> Con eso, queda <strong className="text-destructive">{formatters.currency(faltante)} entregado sin respaldo</strong> en SIESA.</>
                                )}
                                {documentacionQuery.isLoading
                                    ? ' Consultando la documentación de reemplazo...'
                                    : ' Documente el RC que Tesorería hizo en SIESA para conservar el soporte de cada anulación.'}
                            </p>
                        </div>
                    )}

                    <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-card">
                                <tr className="border-b border-border">
                                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-muted-foreground">Fecha</th>
                                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-muted-foreground">N°</th>
                                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-muted-foreground">Tercero</th>
                                    <th className="px-3 py-2 text-right font-medium uppercase tracking-wide text-muted-foreground">Efectivo</th>
                                    <th className="px-3 py-2 text-right font-medium uppercase tracking-wide text-muted-foreground">Transferencia</th>
                                    <th className="px-3 py-2 text-right font-medium uppercase tracking-wide text-muted-foreground">Total</th>
                                    <th className="px-3 py-2 text-right font-medium uppercase tracking-wide text-muted-foreground">Desc. financiero</th>
                                    <th className="px-3 py-2 text-center font-medium uppercase tracking-wide text-muted-foreground">Estado</th>
                                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-muted-foreground">Soporte SIESA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recibos.map((r) => {
                                    const descuentoFinanciero = (r.Facturas ?? []).reduce((s, f) => s + (f.Descuento_Pp || 0), 0)
                                    return (
                                    <tr key={r.Rowid} className={cn("border-b border-border/50 hover:bg-muted/20", r.Estado === 2 && "opacity-60 bg-red-500/5")}>
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
                                        <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                                            {formatters.currency((r.efectivo ?? 0) + (r.consignacion ?? 0))}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                                            {descuentoFinanciero > 0 ? formatters.currency(descuentoFinanciero) : '—'}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase', estadoRCBadge(r.Estado))}>
                                                {estadoRCLabel(r.Estado)}
                                                {r.Estado === 2 && r.Usuario_Anulacion ? ` (${r.Usuario_Anulacion})` : ''}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-left">
                                            {r.Estado !== 2 ? (
                                                <span className="text-muted-foreground">—</span>
                                            ) : (() => {
                                                const documentacion = documentacionPorRowid.get(r.Rowid)
                                                return (
                                                    <Button
                                                        variant={documentacion ? 'secondary' : 'outline'}
                                                        size="sm"
                                                        className="h-7 gap-1 text-[11px]"
                                                        onClick={() => setReciboDocumentando(r)}
                                                    >
                                                        <Receipt className="h-3 w-3" />
                                                        {documentacion ? `RC #${documentacion.numero_rc_reemplazo} · v${documentacion.version}` : 'Registrar RC'}
                                                    </Button>
                                                )
                                            })()}
                                        </td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot className="sticky bottom-0 bg-card">
                                <tr className="border-t-2 border-border bg-muted/60">
                                    <td colSpan={3} className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        Totales
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs font-extrabold text-emerald-600">
                                        {formatters.currency(totalEfectivo)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs font-extrabold text-muted-foreground">
                                        {formatters.currency(totalConsignacion)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs font-extrabold text-primary">
                                        {formatters.currency(totalGeneral)}
                                    </td>
                                    <td />
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
            <DocumentarRCAnuladoModal
                key={reciboDocumentando?.Rowid ?? 'sin-recibo'}
                recibo={reciboDocumentando}
                documentacion={reciboDocumentando ? documentacionPorRowid.get(reciboDocumentando.Rowid) : undefined}
                onClose={() => setReciboDocumentando(null)}
                onGuardado={() => {
                    setReciboDocumentando(null)
                    queryClient.invalidateQueries({ queryKey: ['recibo-caja', 'anulaciones'] })
                }}
            />
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
    anulacionesPosteriores: Set<number>
    entregasConHistorialAnulado?: Set<number>
}

const EntregasPanel = ({ esPendiente, data, isLoading, error, onValidar, onVerRC, anulacionesPosteriores, entregasConHistorialAnulado }: EntregasPanelProps) => {
    const [busqueda, setBusqueda] = useState('')
    const grupos = useMemo(() => agruparPorConductor(data ?? []), [data])
    const total = useMemo(() => grupos.reduce((sum, g) => sum + g.total, 0), [grupos])
    const gruposFiltrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase()
        if (!q) return grupos
        return grupos.filter((g) => g.conductorNombre.toLowerCase().includes(q))
    }, [grupos, busqueda])

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Card className={cn('overflow-hidden border-l-4', esPendiente ? 'border-l-amber-500' : 'border-l-emerald-500')}>
                <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                    <div className="flex items-center gap-3">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', esPendiente ? 'bg-amber-500/10' : 'bg-emerald-500/10')}>
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
                    <p className={cn('text-2xl font-extrabold tabular-nums', esPendiente ? 'text-amber-600' : 'text-emerald-600')}>{formatters.currency(total)}</p>
                </CardContent>
            </Card>

            {grupos.length > 0 && (
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar conductor..."
                        className="h-8 pl-8 text-xs"
                    />
                </div>
            )}

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
                            <AlertCircle className="h-6 w-6 text-destructive" />
                            <p className="text-sm font-semibold text-destructive">Error al cargar las entregas.</p>
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
                    ) : gruposFiltrados.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Search className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Sin coincidencias para "{busqueda}"
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40">
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Conductor</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Recibos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gruposFiltrados.map((grupo, idx) => (
                                    <ConductorGrupoRow
                                        key={grupo.conductorId}
                                        grupo={grupo}
                                        idx={idx}
                                        onValidar={onValidar}
                                        onVerRC={onVerRC}
                                        etiqueta={esPendiente ? 'pendiente' : 'confirmada'}
                                        tieneAnulacionPosterior={anulacionesPosteriores.has(grupo.conductorId)}
                                        entregasConHistorialAnulado={entregasConHistorialAnulado}
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

// ─── Resumen KPI del periodo ─────────────────────────────────────────────────

const ResumenPeriodo = ({ pendientes, confirmadas, totalVigente }: { pendientes: MovimientoEfectivo[] | undefined; confirmadas: MovimientoEfectivo[] | undefined; totalVigente: number | null }) => {
    const totalPendiente = useMemo(() => (pendientes ?? []).reduce((sum, m) => sum + m.valor, 0), [pendientes])
    const totalConfirmado = useMemo(() => (confirmadas ?? []).reduce((sum, m) => sum + m.valor, 0), [confirmadas])
    // Mientras SIESA responde no mostramos el total físico anterior, porque
    // ese valor incluye entregas cuyo RC pudo haber sido anulado.
    const totalGeneral = totalVigente ?? 0
    // "Conciliado" = confirmado sin diferencia abierta (resuelta o nunca la tuvo).
    // No es lo mismo que "confirmado": una entrega puede estar validada y aun así
    // tener una diferencia pendiente de resolver (ver TableroConciliacion).
    const montoConciliado = useMemo(
        () => (confirmadas ?? []).reduce(
            (sum, m) => sum + (m.diferencia_resuelta || (m.diferencia ?? 0) === 0 ? m.valor : 0),
            0
        ),
        [confirmadas]
    )
    const pctConciliado = totalConfirmado > 0 ? Math.round((montoConciliado / totalConfirmado) * 100) : 0
    const conductoresActivos = useMemo(() => {
        const ids = new Set<number>()
        for (const m of [...(pendientes ?? []), ...(confirmadas ?? [])]) ids.add(m.conductor_id)
        return ids.size
    }, [pendientes, confirmadas])

    const items = [
        { label: 'Recaudo vigente de conductores', value: formatters.currency(totalGeneral), icon: Wallet, tono: 'text-primary bg-primary/10', borde: 'border-l-primary' },
        { label: 'Pendiente por validar', value: formatters.currency(totalPendiente), icon: Hourglass, tono: 'text-amber-600 bg-amber-500/10', borde: 'border-l-amber-500' },
        { label: '% conciliado', value: `${pctConciliado}%`, icon: ShieldCheck, tono: 'text-emerald-600 bg-emerald-500/10', borde: 'border-l-emerald-500' },
        { label: 'Conductores activos', value: String(conductoresActivos), icon: Users, tono: 'text-muted-foreground bg-muted', borde: 'border-l-muted-foreground/40' },
    ]

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map(({ label, value, icon: Icon, tono, borde }) => (
                <Card key={label} className={cn('overflow-hidden border-l-4 transition-shadow hover:shadow-md', borde)}>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl', tono)}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                            <p className="truncate text-xl font-extrabold tabular-nums text-foreground">{value}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
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

    const movimientosPeriodo = useMemo(
        () => [...(pendientesQuery.data ?? []), ...(confirmadasQuery.data ?? [])],
        [pendientesQuery.data, confirmadasQuery.data]
    )
    const conductoresSiesa = useMemo(() => {
        const mapa = new Map<number, string>()
        for (const movimiento of movimientosPeriodo) {
            if (movimiento.conductor_siesa_nombre) mapa.set(movimiento.conductor_id, movimiento.conductor_siesa_nombre)
        }
        return Array.from(mapa.entries())
    }, [movimientosPeriodo])
    const recibosPorConductorQueries = useQueries({
        queries: conductoresSiesa.map(([conductorId, siesaNombre]) => ({
            queryKey: ['recibo-caja', 'tablero-conductor', conductorId, siesaNombre, rango?.fechaInicial, rango?.fechaFinal],
            queryFn: () => reciboCajaApi.getPorUsuario(siesaNombre, { fechaInicial: rango?.fechaInicial, fechaFinal: rango?.fechaFinal, tipo: 'RC' }),
            enabled: !!siesaNombre,
            staleTime: 30 * 1000,
            retry: 1,
        })),
    })
    // No hay forma confiable de saber qué RC respalda qué entrega puntual
    // (SIESA permite consolidar N entregas en 1 solo RC, y no hay FK real) —
    // intentar emparejar entrega-por-entrega es una fuente permanente de
    // falsos positivos/negativos. La pregunta correcta no es "¿qué entrega
    // perdió su RC?" sino "¿al conductor le falta plata?": se compara el
    // total físicamente entregado y confirmado contra el total respaldado
    // por RC ACTIVOS (no anulados) en SIESA. Si el activo ya cubre lo
    // entregado, un RC anulado en el camino no es un incidente — el dinero
    // quedó bien contabilizado (ej. RC duplicado que se corrigió). Solo hay
    // incidente cuando queda un faltante real. Las entregas físicas NUNCA se
    // sacan de Pendientes/Confirmadas/Conciliación por esto — son un hecho
    // ya confirmado por tesorería, el incidente es de conciliación con SIESA.
    const resumenRC = useMemo(() => {
        const incidentesPorConductor = new Map<number, { conductorId: number; faltante: number; totalEntregado: number; totalRespaldado: number }>()
        // Entregas que coinciden en valor con un RC anulado del mismo
        // conductor — se muestran en Incidentes como auditoría/historial
        // aunque el dinero ya esté cubierto por otro RC activo (no afecta el
        // recaudo vigente, que se calcula arriba por balance real).
        const movimientosConHistorialAnulado = new Set<number>()
        const anuladosPorConductor = new Map<number, ReciboCajaUsuario[]>()
        let totalVigente = 0
        let consultasCompletas = conductoresSiesa.length === recibosPorConductorQueries.length

        conductoresSiesa.forEach(([conductorId], index) => {
            const consulta = recibosPorConductorQueries[index]
            if (!consulta?.isFetched) consultasCompletas = false
            const recibos = consulta?.data ?? []

            const entregasConfirmadas = movimientosPeriodo.filter((movimiento) => movimiento.conductor_id === conductorId && movimiento.estado === 'CONFIRMADO')
            const totalEntregado = entregasConfirmadas.reduce((total, movimiento) => total + (movimiento.valor_confirmado ?? movimiento.valor), 0)
            const totalRespaldado = recibos
                .filter((recibo) => recibo.Estado !== 2)
                .reduce((total, recibo) => total + (recibo.efectivo ?? 0), 0)

            const faltante = totalEntregado - totalRespaldado
            if (faltante > 1) {
                incidentesPorConductor.set(conductorId, { conductorId, faltante, totalEntregado, totalRespaldado })
            }
            totalVigente += Math.min(totalEntregado, totalRespaldado)

            const anulados = recibos.filter((recibo) => recibo.Estado === 2)
            if (anulados.length > 0) anuladosPorConductor.set(conductorId, anulados)
            for (const movimiento of entregasConfirmadas) {
                const valor = movimiento.valor_confirmado ?? movimiento.valor
                if (anulados.some((recibo) => Math.abs((recibo.efectivo ?? 0) - valor) < 1)) {
                    movimientosConHistorialAnulado.add(movimiento.id)
                }
            }
        })

        return {
            totalVigente: consultasCompletas ? totalVigente : null,
            incidentesPorConductor,
            movimientosConHistorialAnulado,
            anuladosPorConductor,
        }
    }, [conductoresSiesa, movimientosPeriodo, recibosPorConductorQueries])

    const gruposIncidentes = useMemo(
        () => agruparPorConductor(movimientosPeriodo.filter((m) => m.estado === 'CONFIRMADO' && (resumenRC.incidentesPorConductor.has(m.conductor_id) || resumenRC.movimientosConHistorialAnulado.has(m.id)))),
        [movimientosPeriodo, resumenRC.incidentesPorConductor, resumenRC.movimientosConHistorialAnulado]
    )

    const [movValidando, setMovValidando] = useState<MovimientoEfectivo | null>(null)
    const [grupoViendoRC, setGrupoViendoRC] = useState<GrupoConductor | null>(null)
    const [tabPrincipal, setTabPrincipal] = useState<'flujo' | 'incidentes'>('flujo')
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
            <ResumenPeriodo pendientes={pendientesQuery.data} confirmadas={confirmadasQuery.data} totalVigente={resumenRC.totalVigente} />

            <div className="flex items-center border-b border-border/60">
                <div className="flex space-x-1 rounded-xl bg-muted/60 p-1">
                    <button
                        onClick={() => setTabPrincipal('flujo')}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all',
                            tabPrincipal === 'flujo'
                                ? 'bg-card text-foreground shadow-xs'
                                : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                        )}
                    >
                        <Landmark className="h-3.5 w-3.5" /> Entregas
                    </button>
                    <button
                        onClick={() => setTabPrincipal('incidentes')}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all',
                            tabPrincipal === 'incidentes'
                                ? 'bg-card text-foreground shadow-xs'
                                : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                        )}
                    >
                        <AlertCircle className="h-3.5 w-3.5" /> Incidentes
                        {gruposIncidentes.length > 0 && (
                            <span className="rounded-full bg-destructive px-1.5 text-[10px] font-black text-destructive-foreground">{gruposIncidentes.length}</span>
                        )}
                    </button>
                </div>
            </div>

            {tabPrincipal === 'incidentes' ? (
                <Card className="overflow-hidden">
                    <CardHeader className="border-b border-border bg-muted/20">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                                <AlertCircle className="h-5 w-5 text-destructive" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Incidentes — falta respaldo en SIESA</CardTitle>
                                <p className="mt-0.5 text-xs text-muted-foreground">Conductores cuyo total entregado y confirmado supera el efectivo de sus RC activos (no anulados) en SIESA. Un RC anulado que ya fue reemplazado por otro que cubre el total no aparece aquí.</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {gruposIncidentes.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                                <ShieldCheck className="h-6 w-6" />
                                <p className="text-xs font-bold uppercase tracking-widest">Sin incidentes en este periodo</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/60">
                                {gruposIncidentes.map((grupo) => {
                                    const incidente = resumenRC.incidentesPorConductor.get(grupo.conductorId)
                                    const entregasHistorial = grupo.entregas.filter((mov) => resumenRC.movimientosConHistorialAnulado.has(mov.id))
                                    const anulados = resumenRC.anuladosPorConductor.get(grupo.conductorId) ?? []
                                    return (
                                        <div key={grupo.conductorId} className="flex flex-col gap-3 px-5 py-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white', incidente ? 'bg-destructive' : 'bg-amber-500')}>
                                                        {grupo.conductorNombre.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{grupo.conductorNombre}</p>
                                                        {incidente ? (
                                                            <p className="text-[11px] text-muted-foreground">
                                                                Entregado {formatters.currency(incidente.totalEntregado)} · Respaldado en SIESA {formatters.currency(incidente.totalRespaldado)}
                                                            </p>
                                                        ) : (
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {entregasHistorial.length} entrega{entregasHistorial.length !== 1 ? 's' : ''} por {formatters.currency(entregasHistorial.reduce((s, m) => s + (m.valor_confirmado ?? m.valor), 0))} coincide{entregasHistorial.length === 1 ? '' : 'n'} en valor con un RC anulado — ya cubierto por otro RC activo, solo auditoría
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {incidente ? (
                                                    <p className="text-sm font-bold text-destructive">{formatters.currency(incidente.faltante)} sin respaldo</p>
                                                ) : (
                                                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Cubierto</span>
                                                )}
                                            </div>
                                            {anulados.length > 0 && (
                                                <div className="ml-12 flex flex-wrap gap-2">
                                                    {anulados.map((r) => {
                                                        const descuentoFinanciero = (r.Facturas ?? []).reduce((s, f) => s + (f.Descuento_Pp || 0), 0)
                                                        return (
                                                        <span key={r.Rowid} className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                                                            <Hash className="h-3 w-3" />
                                                            {(r.Tipo_Docto || 'RC').trim()}#{r.Numero} anulado · {formatters.currency(r.Creditos)}
                                                            {descuentoFinanciero > 0 ? ` (incl. desc. financiero ${formatters.currency(descuentoFinanciero)})` : ''}
                                                            {r.Fecha_Anulacion ? ` · ${formatters.dateTime(r.Fecha_Anulacion)}` : ''}
                                                            {r.Usuario_Anulacion ? ` · ${r.Usuario_Anulacion}` : ''}
                                                        </span>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
            <>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <CalendarRange className="h-4 w-4 text-primary" />
                    </div>
                    Periodo
                </div>
                <div className="flex flex-wrap items-center gap-3">
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
                            className="h-8 gap-1.5 text-xs text-muted-foreground"
                            onClick={() => { setFechaDesde(hoyISO()); setFechaHasta('') }}
                        >
                            <RefreshCw className="h-3 w-3" /> Volver a hoy
                        </Button>
                    )}
                </div>
                <Button variant="outline" size="sm" className="ml-auto h-8 gap-2 text-xs" onClick={refrescarTodo} disabled={refrescando}>
                    <RefreshCw className={cn('h-3.5 w-3.5', refrescando && 'animate-spin')} /> Actualizar
                </Button>
            </div>

            <div className="grid items-start gap-5 lg:grid-cols-2">
                <EntregasPanel
                    esPendiente
                    data={pendientesQuery.data}
                    isLoading={pendientesQuery.isLoading}
                    error={pendientesQuery.error}
                    onValidar={setMovValidando}
                    onVerRC={setGrupoViendoRC}
                    anulacionesPosteriores={SIN_ANULACIONES}
                />
                <EntregasPanel
                    esPendiente={false}
                    data={confirmadasQuery.data}
                    isLoading={confirmadasQuery.isLoading}
                    error={confirmadasQuery.error}
                    onVerRC={setGrupoViendoRC}
                    anulacionesPosteriores={SIN_ANULACIONES}
                    entregasConHistorialAnulado={resumenRC.movimientosConHistorialAnulado}
                />
            </div>

            <TableroConciliacion
                movimientos={confirmadasQuery.data}
                onResuelto={() => queryClient.invalidateQueries({ queryKey: ['conductor-efectivo'] })}
            />
            </>
            )}

            <ValidarEntregaModal entrega={movValidando} onClose={() => setMovValidando(null)} onConfirmado={handleConfirmado} />
            <RecibosConductorModal grupo={grupoViendoRC} onClose={() => setGrupoViendoRC(null)} rango={rango} />
        </div>
    )
}
