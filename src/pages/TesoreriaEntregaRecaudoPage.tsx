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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useEntregasPorEstado } from '@/hooks/useConductorEfectivo'
import { conductorEfectivoApi } from '@/api/conductorEfectivo'
import { reciboCajaApi } from '@/api/reciboCaja'
import { MovimientoEfectivo, ReciboCajaUsuario } from '@/api/types'
import { formatters } from '@/utils/formatters'
import { estadoRCBadge, estadoRCLabel } from '@/utils/badges'
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
                        ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
                        : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30'
                )}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {conductor.diferencia === 0 ? 'Diferencias por resolver' : esFaltante ? 'Faltante por resolver' : 'Sobrante por resolver'}
                    </p>
                    <p className={cn('mt-1 text-3xl font-extrabold tabular-nums', esFaltante ? 'text-red-600' : 'text-blue-600')}>
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
                    <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
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

const TableroConciliacion = ({ movimientos, onResuelto }: { movimientos: MovimientoEfectivo[] | undefined; onResuelto: () => void }) => {
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
                                descuadrados.length ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' : 'bg-emerald-100 text-emerald-700'
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
                                                            alDia ? 'bg-emerald-500' : 'bg-red-500'
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
                                                            : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                                    )}>
                                                        {alDia ? <ShieldCheck className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
                                                        {alDia ? 'Al día' : 'Tiene un descuadre'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-left">
                                                    <p className={cn('font-bold tabular-nums', alDia ? 'text-emerald-600' : conductor.diferencia < 0 ? 'text-red-600' : 'text-blue-600')}>
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
                                                        disabled={alDia}
                                                        className="gap-1.5 text-xs"
                                                        onClick={() => setSeleccionado(conductor)}
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
                                        <tr className="border-t border-border bg-red-50/60 dark:bg-red-950/10">
                                            <td colSpan={3} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">Total de diferencias por conciliar</td>
                                            <td className="px-5 py-3 text-left font-extrabold tabular-nums text-red-600">{formatters.currency(totalPorConciliar)}</td>
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
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleConfirmar} disabled={loading} className="gap-2">
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
                                    <td className="px-4 py-2 text-left text-muted-foreground">{mov.referencia || <span className="italic">—</span>}</td>
                                    <td className="px-4 py-2 text-left font-semibold text-primary">{formatters.currency(mov.valor)}</td>
                                    {confirmadas ? (
                                        <>
                                            <td className="px-4 py-2 text-left font-semibold">
                                                {mov.diferencia ? (
                                                    <span className={mov.diferencia > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}>
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
                {expanded && <EntregasSubAccordion entregas={grupo.entregas} colSpan={3} onValidar={onValidar} />}
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

const RecibosConductorModal = ({ grupo, onClose, rango }: { grupo: GrupoConductor | null; onClose: () => void; rango: { fechaInicial?: string; fechaFinal?: string } | undefined }) => {
    const siesaNombre = grupo?.conductorSiesaNombre
    const fechaInicial = rango?.fechaInicial
    const fechaFinal = rango?.fechaFinal ?? rango?.fechaInicial
    const { data, isLoading, error } = useQuery({
        queryKey: ['recibo-caja', 'por-usuario', siesaNombre, fechaInicial, fechaFinal],
        queryFn: () => reciboCajaApi.getPorUsuario(siesaNombre as string, { fechaInicial, fechaFinal, tipo: 'RC' }),
        enabled: !!siesaNombre,
    })

    if (!grupo) return null

    // Solo lo que realmente respalda la entrega del periodo: RC del rango, no anulados.
    const recibos = (data ?? []).filter((r) => r.Estado !== 2)
    const totalEfectivo = recibos.reduce((sum, r) => sum + (r.efectivo ?? 0), 0)
    const totalConsignacion = recibos.reduce((sum, r) => sum + (r.consignacion ?? 0), 0)
    const totalGeneral = totalEfectivo + totalConsignacion
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
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Error al cargar los recibos.</p>
            ) : recibos.length === 0 ? (
                <p className="py-10 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Este conductor no tiene recibos de caja en el periodo
                </p>
            ) : (
                <div className="space-y-3">
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => exportarRecibosCSV(recibos, grupo.conductorNombre)}
                        >
                            <Download className="h-3.5 w-3.5" /> Exportar CSV
                        </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
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
                                        <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                                            {formatters.currency((r.efectivo ?? 0) + (r.consignacion ?? 0))}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase', estadoRCBadge(r.Estado))}>
                                                {estadoRCLabel(r.Estado)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="sticky bottom-0 bg-card">
                                <tr className="border-t-2 border-border bg-muted/60">
                                    <td colSpan={3} className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        Totales
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs font-extrabold text-emerald-600">
                                        {formatters.currency(totalEfectivo)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs font-extrabold text-blue-600">
                                        {formatters.currency(totalConsignacion)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs font-extrabold text-primary">
                                        {formatters.currency(totalGeneral)}
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
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

const ResumenPeriodo = ({ pendientes, confirmadas }: { pendientes: MovimientoEfectivo[] | undefined; confirmadas: MovimientoEfectivo[] | undefined }) => {
    const totalPendiente = useMemo(() => (pendientes ?? []).reduce((sum, m) => sum + m.valor, 0), [pendientes])
    const totalConfirmado = useMemo(() => (confirmadas ?? []).reduce((sum, m) => sum + m.valor, 0), [confirmadas])
    const totalGeneral = totalPendiente + totalConfirmado
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
        { label: 'Total del periodo', value: formatters.currency(totalGeneral), icon: Wallet, tono: 'text-primary bg-primary/10', borde: 'border-l-primary' },
        { label: 'Pendiente por validar', value: formatters.currency(totalPendiente), icon: Hourglass, tono: 'text-amber-600 bg-amber-500/10', borde: 'border-l-amber-500' },
        { label: '% conciliado', value: `${pctConciliado}%`, icon: ShieldCheck, tono: 'text-emerald-600 bg-emerald-500/10', borde: 'border-l-emerald-500' },
        { label: 'Conductores activos', value: String(conductoresActivos), icon: Users, tono: 'text-blue-600 bg-blue-500/10', borde: 'border-l-blue-500' },
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
            <ResumenPeriodo pendientes={pendientesQuery.data} confirmadas={confirmadasQuery.data} />

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
                />
                <EntregasPanel
                    esPendiente={false}
                    data={confirmadasQuery.data}
                    isLoading={confirmadasQuery.isLoading}
                    error={confirmadasQuery.error}
                    onVerRC={setGrupoViendoRC}
                />
            </div>

            <TableroConciliacion
                movimientos={confirmadasQuery.data}
                onResuelto={() => queryClient.invalidateQueries({ queryKey: ['conductor-efectivo'] })}
            />

            <ValidarEntregaModal entrega={movValidando} onClose={() => setMovValidando(null)} onConfirmado={handleConfirmado} />
            <RecibosConductorModal grupo={grupoViendoRC} onClose={() => setGrupoViendoRC(null)} rango={rango} />
        </div>
    )
}
