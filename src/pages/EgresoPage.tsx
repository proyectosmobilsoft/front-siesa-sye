import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo, Fragment } from 'react'
import { createPortal } from 'react-dom'
import {
    Search,
    Eye,
    Edit,
    RefreshCw,
    Loader2,
    ArrowUpDown,
    ChevronRight,
    Users,
    AlertCircle,
    Receipt,
    FileText,
    Send,
    Hash,
    X,
} from 'lucide-react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    SortingState,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { ErrorState } from '@/components/ui/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FechaInput } from '@/components/ui/fecha-input'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/lib/skeleton'
import { useAnticiposOperativos } from '@/hooks/useAnticiposOperativos'
import { anticiposOperativosApi } from '@/api/anticiposOperativos'
import { AnticipoOperativo, AnticipoOperativoUpdatePayload, DistribucionItem, Soporte } from '@/api/types'
import { formatters } from '@/utils/formatters'
import { useQueryClient } from '@tanstack/react-query'
import { usePermiso } from '@/hooks/usePermiso'
import { Cargando } from '@/components/ui/cargando'
import { BotonExcel } from '@/components/ui/boton-excel'
import { BotonCrear } from '@/components/ui/boton-crear'
import { CrearEgresoModal } from '@/components/egreso/CrearEgresoModal'
import { DesembolsoModal } from '@/components/egreso/DesembolsoModal'
import { aviso } from '@/store/avisosStore'
import { DispersionTab } from '@/components/egreso/DispersionTab'

// ─── Utilidades de UI ────────────────────────────────────────────────────────

const getPrioridadBadge = (prioridad: string) => {
    switch (prioridad?.toLowerCase()) {
        case 'alta':
        case 'urgente':
            return 'bg-destructive/10 text-destructive'
        case 'media':
            return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        case 'baja':
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        default:
            return 'bg-muted text-muted-foreground'
    }
}

const normalizarEstado = (estado: string) => estado?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() ?? ''

const filtrosEstado = [
    { estado: 'TODOS', etiqueta: 'Todos' },
    { estado: 'PENDIENTE', etiqueta: 'Por autorizar' },
    { estado: 'AUTORIZADA', etiqueta: 'Autorizadas' },
    { estado: 'ESPERA EFECTIVO', etiqueta: 'En espera de efectivo' },
    { estado: 'DESEMBOLSADO', etiqueta: 'Desembolsados' },
    { estado: 'RECHAZADA', etiqueta: 'Rechazados' },
] as const

type FiltroEstado = typeof filtrosEstado[number]['estado']

const getEstadoBadge = (estado: string) => {
    switch (normalizarEstado(estado)) {
        case 'AUTORIZADA':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        case 'ESPERA EFECTIVO':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        case 'DESEMBOLSADO':
            return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
        case 'APROBADO':
        case 'COMPLETADO':
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        case 'PENDIENTE':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        case 'RECHAZADA':
        case 'RECHAZADO':
        case 'CANCELADO':
        case 'ANULADO':
            return 'bg-destructive/10 text-destructive'
        case 'EN REVISION':
        case 'EN ELABORACION':
            return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        default:
            return 'bg-muted text-muted-foreground'
    }
}

// ─── Acordeón de distribución ────────────────────────────────────────────────

const getNombreDistribucion = (item: DistribucionItem): string => {
    return (
        item.nombre ??
        item.usuario_nombre ??
        item.conductor_nombre ??
        `ID ${item.usuario_id ?? item.conductor_id ?? item.id}`
    )
}

const getValorDistribucion = (item: DistribucionItem): number => {
    return item.valor_asignado ?? item.valor ?? 0
}

// ─── Sub-acordeón de soportes por conductor ──────────────────────────────────

interface SoportesSubAccordionProps {
    soportes: Soporte[]
    colSpan: number
}

const BASE_URL = 'https://softwareqa.dev'

const SoportesSubAccordion = ({ soportes, colSpan }: SoportesSubAccordionProps) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    // Tomamos los datos de resumen del primer ítem (son iguales para todos del mismo conductor)
    const resumen = soportes[0]

    return (
        <>
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
                    <div className="mx-4 my-2 rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-primary/10 bg-primary/10">
                            <Receipt className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Soportes de gastos
                            </span>
                        </div>

                        {soportes.length === 0 ? (
                            <p className="text-xs text-muted-foreground px-4 py-3 italic">
                                El conductor no ha registrado soportes aún.
                            </p>
                        ) : (
                            <>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-primary/10">
                                            <th className="h-8 px-4 text-left font-medium text-muted-foreground uppercase tracking-wide">
                                                Fecha
                                            </th>
                                            <th className="h-8 px-4 text-left font-medium text-muted-foreground uppercase tracking-wide">
                                                Soporte
                                            </th>
                                            <th className="h-8 px-4 text-left font-medium text-muted-foreground uppercase tracking-wide">
                                                Concepto
                                            </th>
                                            <th className="h-8 px-4 text-right font-medium text-muted-foreground uppercase tracking-wide">
                                                Valor
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {soportes.map((s, idx) => (
                                            <motion.tr
                                                key={s.id}
                                                className="border-b border-primary/10 last:border-0 hover:bg-primary/10 transition-colors"
                                                initial={{ opacity: 0, x: -4 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.18, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                                            >
                                                <td className="py-2 px-4 text-muted-foreground">
                                                    {formatters.dateTime(s.created_at)}
                                                </td>
                                                <td className="py-2 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                            <Receipt className="h-3 w-3 flex-shrink-0" />
                                                            <span className="text-xs">Soporte #{s.id}</span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setPreviewUrl(`${BASE_URL}/${s.ruta_foto}`) }}
                                                            className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                                            title="Ver soporte"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-2 px-4 text-muted-foreground">
                                                    {s.concepto || <span className="italic">—</span>}
                                                </td>
                                                <td className="py-2 px-4 text-right font-semibold text-primary">
                                                    {formatters.currency(s.valor)}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Resumen financiero del conductor */}
                                {resumen && (
                                    <div className="grid grid-cols-3 gap-px border-t border-primary/20 bg-primary/20">
                                        <div className="bg-primary/5 px-4 py-2 text-center">
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Valor asignado</p>
                                            <p className="text-xs font-bold text-foreground mt-0.5">{formatters.currency(resumen.valor_distribuido)}</p>
                                        </div>
                                        <div className="bg-primary/5 px-4 py-2 text-center">
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Total justificado</p>
                                            <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-0.5">{formatters.currency(resumen.total_justificado)}</p>
                                        </div>
                                        <div className="bg-primary/5 px-4 py-2 text-center">
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Saldo pendiente</p>
                                            <p className={`text-xs font-bold mt-0.5 ${resumen.saldo_pendiente > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                                                {formatters.currency(resumen.saldo_pendiente)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </td>
        </tr>

        {/* Modal preview de imagen — renderizado en el body via portal */}
        {createPortal(
            <AnimatePresence>
                {previewUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
                        onClick={() => setPreviewUrl(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.92 }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            className="relative max-w-3xl max-h-[85vh] rounded-xl overflow-hidden shadow-2xl bg-card"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="absolute top-2 right-2 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <img
                                src={previewUrl}
                                alt="Soporte"
                                className="max-w-full max-h-[85vh] object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>,
            document.body
        )}
        </>
    )
}

// ─── Fila de conductor con sub-acordeón ──────────────────────────────────────

interface ConductorRowProps {
    item: DistribucionItem
    idx: number
    soportes: Soporte[]
}

const ConductorRow = ({ item, idx, soportes }: ConductorRowProps) => {
    const [expanded, setExpanded] = useState(false)
    const soportesConductor = soportes.filter((s) => s.usuario_id === (item.usuario_id ?? item.conductor_id))

    return (
        <>
            <motion.tr
                key={item.id ?? idx}
                className={`border-b last:border-0 cursor-pointer transition-colors ${expanded ? 'bg-primary/5' : 'hover:bg-muted/20'}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: idx * 0.055, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setExpanded((prev) => !prev)}
            >
                <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                        <motion.div
                            animate={{ rotate: expanded ? 90 : 0 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 24 }}
                            className="flex-shrink-0"
                        >
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </motion.div>
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">
                                {getNombreDistribucion(item).charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium text-sm leading-tight">
                                {getNombreDistribucion(item)}
                            </span>
                            {soportesConductor.length > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                    {soportesConductor.length} soporte{soportesConductor.length > 1 ? 's' : ''} registrado{soportesConductor.length > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                </td>
                <td className="py-2.5 px-4 font-mono font-semibold">
                    {item.centro_operacion_codigo || <span className="font-sans text-xs italic text-muted-foreground">Sin asignar</span>}
                </td>
                <td className="py-2.5 px-4">
                    {item.estado ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getEstadoBadge(item.estado)}`}>
                            {item.estado}
                        </span>
                    ) : (
                        <span className="text-muted-foreground text-xs italic">—</span>
                    )}
                </td>
                <td className="py-2.5 px-4 text-right">
                    <span className="font-semibold text-sm text-primary">
                        {formatters.currency(getValorDistribucion(item))}
                    </span>
                </td>
                <td className="py-2.5 px-4 text-right">
                    <span className="font-semibold text-sm text-green-600 dark:text-green-400">
                        {formatters.currency(soportesConductor[0]?.total_justificado ?? 0)}
                    </span>
                </td>
                <td className="py-2.5 px-4 text-right">
                    {(() => {
                        const disponible = soportesConductor.length > 0
                            ? soportesConductor[0].saldo_pendiente
                            : getValorDistribucion(item)
                        return (
                            <span className={`font-semibold text-sm ${disponible > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                                {formatters.currency(disponible)}
                            </span>
                        )
                    })()}
                </td>
            </motion.tr>
            <AnimatePresence>
                {expanded && (
                    <SoportesSubAccordion soportes={soportesConductor} colSpan={6} />
                )}
            </AnimatePresence>
        </>
    )
}

// ─── Acordeón principal ───────────────────────────────────────────────────────

interface DistribucionAccordionProps {
    anticipo: AnticipoOperativo
    totalColumnas: number
}

const DistribucionAccordion = ({ anticipo, totalColumnas }: DistribucionAccordionProps) => {
    const anticipoId = anticipo.id
    const { data, isLoading, error } = useQuery<DistribucionItem[]>({
        queryKey: ['anticipo-distribucion', anticipoId],
        queryFn: () => anticiposOperativosApi.getDistribucion(anticipoId),
        staleTime: 2 * 60 * 1000,
    })

    const { data: soportes = [] } = useQuery<Soporte[]>({
        queryKey: ['anticipo-soportes', anticipoId],
        queryFn: () => anticiposOperativosApi.getSoportes(anticipoId),
        staleTime: 2 * 60 * 1000,
    })

    return (
        <motion.tr key={`accordion-${anticipoId}`}>
            <td colSpan={totalColumnas} className="p-0">
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                        height: { type: 'spring', stiffness: 280, damping: 28, mass: 0.8 },
                        opacity: { duration: 0.2, ease: 'easeOut' },
                    }}
                    className="overflow-hidden"
                >
                    <div className="px-6 py-4 bg-muted/30 border-t border-primary/10">
                        {/* Header del acordeón */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Users className="h-3 w-3 text-primary" />
                                </div>
                                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                                    Distribución de recursos
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 rounded-md bg-card border px-3 py-1.5">
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Valor solicitado</span>
                                    <span className="text-xs font-bold text-foreground">{formatters.currency(anticipo.valor_solicitado)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-3 py-1.5">
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Valor aprobado</span>
                                    <span className="text-xs font-bold text-primary">{formatters.currency(anticipo.valor_distribuido)}</span>
                                </div>
                            </div>
                        </div>

                        {anticipo.desembolso_docto && (
                            <p className="mb-3 text-sm font-medium">
                                PCE: {anticipo.desembolso_docto}
                                {anticipo.desembolso_caja && ` · Caja ${anticipo.desembolso_caja}`}
                            </p>
                        )}

                        {isLoading ? (
                            <Cargando compacto texto="Cargando distribución" />
                        ) : error ? (
                            <div className="flex items-center gap-2 py-3 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                No se pudo cargar la distribución
                            </div>
                        ) : !data || data.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2 italic">
                                No se encontró distribución para este egreso.
                            </p>
                        ) : (
                            <div className="rounded-lg border bg-card overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40">
                                            <th className="h-9 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                                Conductor
                                            </th>
                                            <th className="h-9 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                                C.O.
                                            </th>
                                            <th className="h-9 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                                Estado
                                            </th>
                                            <th className="h-9 px-4 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                                Valor asignado
                                            </th>
                                            <th className="h-9 px-4 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                                Valor gastado
                                            </th>
                                            <th className="h-9 px-4 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                                Valor disponible
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((item, idx) => (
                                            <ConductorRow key={item.id ?? idx} item={item} idx={idx} soportes={soportes} />
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t bg-muted/30">
                                            <td colSpan={3} className="py-2 px-4 text-xs font-medium text-muted-foreground text-right uppercase tracking-wide">
                                                Totales:
                                            </td>
                                            <td className="py-2 px-4 text-right">
                                                <span className="font-bold text-sm text-primary">
                                                    {formatters.currency(
                                                        data.reduce((sum, item) => sum + getValorDistribucion(item), 0)
                                                    )}
                                                </span>
                                            </td>
                                            <td className="py-2 px-4 text-right">
                                                <span className="font-bold text-sm text-green-600 dark:text-green-400">
                                                    {formatters.currency(
                                                        data.reduce((sum, item) => {
                                                            const uid = item.usuario_id ?? item.conductor_id
                                                            const s = soportes.find(s => s.usuario_id === uid)
                                                            return sum + (s?.total_justificado ?? 0)
                                                        }, 0)
                                                    )}
                                                </span>
                                            </td>
                                            <td className="py-2 px-4 text-right">
                                                <span className="font-bold text-sm text-destructive">
                                                    {formatters.currency(
                                                        data.reduce((sum, item) => {
                                                            const uid = item.usuario_id ?? item.conductor_id
                                                            const s = soportes.find(s => s.usuario_id === uid)
                                                            return sum + (s ? s.saldo_pendiente : getValorDistribucion(item))
                                                        }, 0)
                                                    )}
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </motion.div>
            </td>
        </motion.tr>
    )
}

// ─── Modal de Vista ───────────────────────────────────────────────────────────

interface ViewModalProps {
    anticipo: AnticipoOperativo
    onClose: () => void
}

const ViewModal = ({ anticipo, onClose }: ViewModalProps) => {
    const Campo = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
        <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-sm font-medium">{value ?? <span className="text-muted-foreground italic">Sin valor</span>}</p>
        </div>
    )

    return (
        <Modal isOpen onClose={onClose} title="" className="max-w-2xl">
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <div>
                        <h2 className="text-lg font-bold">Egreso #{anticipo.numero_anticipo}</h2>
                        <p className="text-sm text-muted-foreground">Detalle completo de la solicitud</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadge(anticipo.estado)}`}>
                        {anticipo.estado}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Campo label="Número de egreso" value={anticipo.numero_anticipo} />
                    <Campo label="Solicitante" value={anticipo.usuario_nombre} />
                    {anticipo.desembolso_docto && (
                        <div className="col-span-2 text-sm font-semibold">
                            PCE: {anticipo.desembolso_docto}
                            {anticipo.desembolso_caja && ` · Caja ${anticipo.desembolso_caja}`}
                        </div>
                    )}
                    <Campo label="Área / Departamento" value={anticipo.area_departamento} />
                    <Campo label="Responsable aprobación" value={anticipo.responsable_aprobacion} />
                    <Campo label="Forma de entrega" value={anticipo.forma_entrega} />
                    <Campo label="Prioridad" value={anticipo.prioridad} />
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor solicitado</p>
                        <p className="text-xl font-bold text-primary">{formatters.currency(anticipo.valor_solicitado)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor distribuido</p>
                        <p className="text-xl font-bold">{formatters.currency(anticipo.valor_distribuido)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Campo label="Fecha solicitud" value={formatters.dateTime(anticipo.fecha_solicitud)} />
                    <Campo label="Fecha requerida dinero" value={formatters.dateOnly(anticipo.fecha_requerida_dinero)} />
                    <Campo label="Creado" value={formatters.dateTime(anticipo.created_at)} />
                    <Campo label="Actualizado" value={formatters.dateTime(anticipo.updated_at)} />
                    {anticipo.desembolso_fecha && <Campo label="Desembolsado" value={formatters.dateTime(anticipo.desembolso_fecha)} />}
                </div>

                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motivo general</p>
                    <p className="text-sm">{anticipo.motivo_general ?? <span className="text-muted-foreground italic">Sin valor</span>}</p>
                </div>

                {anticipo.observaciones_financieras && (
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observaciones financieras</p>
                        <p className="text-sm">{anticipo.observaciones_financieras}</p>
                    </div>
                )}

                <div className="flex justify-end">
                    <Button onClick={onClose} variant="outline">Cerrar</Button>
                </div>
            </div>
        </Modal>
    )
}

// ─── Modal de Edición ─────────────────────────────────────────────────────────

interface EditModalProps {
    anticipo: AnticipoOperativo
    onClose: () => void
    onSaved: () => void
}

const ESTADOS = ['Pendiente', 'En revisión', 'Aprobado', 'Rechazado', 'Completado', 'Cancelado']

const EditModal = ({ anticipo, onClose, onSaved }: EditModalProps) => {
    const [form, setForm] = useState<AnticipoOperativoUpdatePayload>({
        estado: anticipo.estado ?? '',
        observaciones_financieras: anticipo.observaciones_financieras ?? '',
        responsable_aprobacion: anticipo.responsable_aprobacion ?? '',
        valor_distribuido: anticipo.valor_distribuido ?? 0,
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleChange = (field: keyof AnticipoOperativoUpdatePayload, value: string | number) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            setError(null)
            await anticiposOperativosApi.update(anticipo.id, form, true)
            onSaved()
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Error al guardar los cambios')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal isOpen onClose={onClose} title="" className="max-w-xl">
            <div className="space-y-5">
                <div className="border-b pb-4">
                    <h2 className="text-lg font-bold">Editar solicitud</h2>
                    <p className="text-sm text-muted-foreground">Egreso #{anticipo.numero_anticipo} — {anticipo.usuario_nombre}</p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Estado</label>
                    <select
                        value={form.estado}
                        onChange={(e) => handleChange('estado', e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        {ESTADOS.map((e) => (
                            <option key={e} value={e}>{e}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Responsable de aprobación</label>
                    <Input
                        value={form.responsable_aprobacion ?? ''}
                        onChange={(e) => handleChange('responsable_aprobacion', e.target.value)}
                        placeholder="Nombre del responsable"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Valor distribuido</label>
                    <Input
                        type="number"
                        value={form.valor_distribuido ?? 0}
                        onChange={(e) => handleChange('valor_distribuido', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Observaciones financieras</label>
                    <textarea
                        value={form.observaciones_financieras ?? ''}
                        onChange={(e) => handleChange('observaciones_financieras', e.target.value)}
                        placeholder="Observaciones..."
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    />
                </div>

                {error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        {saving ? (
                            <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
                        ) : (
                            'Guardar cambios'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export const EgresoPage = () => {
    const queryClient = useQueryClient()
    const { puede, P } = usePermiso()
    const { data: solicitudes, isLoading, error } = useAnticiposOperativos()
    const [globalFilter, setGlobalFilter] = useState('')
    const [sorting, setSorting] = useState<SortingState>([])
    const [expandedRowId, setExpandedRowId] = useState<number | null>(null)
    const [viewingAnticipo, setViewingAnticipo] = useState<AnticipoOperativo | null>(null)
    const [editingAnticipo, setEditingAnticipo] = useState<AnticipoOperativo | null>(null)
    const [crearAbierto, setCrearAbierto] = useState(false)
    const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>(() =>
        puede(P.AUTORIZAR_EGRESO) ? 'PENDIENTE' : puede(P.DESEMBOLSAR_EGRESO) ? 'AUTORIZADA' : 'TODOS'
    )
    const [vista, setVista] = useState<'egresos' | 'documentos' | 'dispersion'>('egresos')
    const [docBusqueda, setDocBusqueda] = useState('')
    const [docEstado, setDocEstado] = useState('')
    const [docCaja, setDocCaja] = useState('')
    const [docCo, setDocCo] = useState('')
    const [docDesde, setDocDesde] = useState('')
    const [docHasta, setDocHasta] = useState('')
    const [docSenalado, setDocSenalado] = useState<AnticipoOperativo | null>(null)
    const [autorizando, setAutorizando] = useState<AnticipoOperativo | null>(null)
    const [rechazando, setRechazando] = useState<AnticipoOperativo | null>(null)
    const [desembolsando, setDesembolsando] = useState<AnticipoOperativo | null>(null)
    const [motivoRechazo, setMotivoRechazo] = useState('')
    const [errorEstado, setErrorEstado] = useState<string | null>(null)
    const [guardandoEstado, setGuardandoEstado] = useState(false)

    const solicitudesFiltradas = useMemo(() =>
        (solicitudes || []).filter((item) =>
            filtroEstado === 'TODOS' || normalizarEstado(item.estado) === filtroEstado
        ),
        [solicitudes, filtroEstado]
    )

    const todosDocumentosPce = useMemo(
        () => (solicitudes || []).filter((item) => item.desembolso_docto),
        [solicitudes]
    )

    const estadoDocto = (item: AnticipoOperativo) => item.desembolso_docto_estado ?? item.estado

    const opcionesEstadoDoc = useMemo(
        () => [...new Set(todosDocumentosPce.map((d) => estadoDocto(d)?.trim()).filter((v): v is string => Boolean(v)))].sort(),
        [todosDocumentosPce]
    )

    const opcionesCajaDoc = useMemo(
        () => [...new Set(todosDocumentosPce.map((d) => d.desembolso_caja?.trim()).filter((v): v is string => Boolean(v)))].sort(),
        [todosDocumentosPce]
    )

    const opcionesCoDoc = useMemo(
        () => [...new Set(todosDocumentosPce.map((d) => (d.desembolso_co || d.centro_operacion_codigo)?.trim()).filter((v): v is string => Boolean(v)))].sort(),
        [todosDocumentosPce]
    )

    // Documentos PCE generados en SIESA al desembolsar (más recientes primero)
    const documentosPce = useMemo(() => {
        const q = docBusqueda.trim().toLowerCase()
        return todosDocumentosPce
            .filter((item) => !docEstado || normalizarEstado(estadoDocto(item)) === normalizarEstado(docEstado))
            .filter((item) => !docCaja || (item.desembolso_caja?.trim() ?? '') === docCaja)
            .filter((item) => !docCo || ((item.desembolso_co || item.centro_operacion_codigo)?.trim() ?? '') === docCo)
            .filter((item) => {
                if (!docDesde && !docHasta) return true
                const iso = String(item.desembolso_fecha ?? '').slice(0, 10)
                if (!iso) return false
                if (docDesde && iso < docDesde) return false
                if (docHasta && iso > docHasta) return false
                return true
            })
            .filter((item) => !q || [item.desembolso_docto, item.numero_anticipo, item.usuario_nombre, item.motivo_general, item.desembolso_caja, item.desembolso_usuario_nombre, estadoDocto(item)]
                .some((v) => String(v ?? '').toLowerCase().includes(q)))
            .sort((a, b) => String(b.desembolso_fecha ?? '').localeCompare(String(a.desembolso_fecha ?? '')))
    }, [todosDocumentosPce, docBusqueda, docEstado, docCaja, docCo, docDesde, docHasta])
    const totalDocumentosPce = todosDocumentosPce.length

    const cerrarEstado = () => {
        if (guardandoEstado) return
        setAutorizando(null)
        setRechazando(null)
        setMotivoRechazo('')
        setErrorEstado(null)
    }

    const guardarEstado = async (anticipo: AnticipoOperativo, estado: 'AUTORIZADA' | 'RECHAZADA', observacion?: string) => {
        if (guardandoEstado || (estado === 'RECHAZADA' && !observacion?.trim())) return
        setGuardandoEstado(true)
        setErrorEstado(null)
        try {
            await anticiposOperativosApi.cambiarEstado(anticipo.id, { estado, ...(observacion ? { observacion: observacion.trim() } : {}) })
            aviso.exito(estado === 'AUTORIZADA' ? `Egreso ${anticipo.numero_anticipo} autorizado` : `Egreso ${anticipo.numero_anticipo} rechazado`)
            setAutorizando(null)
            setRechazando(null)
            setMotivoRechazo('')
            void queryClient.invalidateQueries({ queryKey: ['anticipos-operativos'] })
        } catch (err: unknown) {
            const respuesta = (err as { response?: { data?: { message?: string } } }).response
            setErrorEstado(respuesta?.data?.message || 'No se pudo cambiar el estado del egreso')
        } finally {
            setGuardandoEstado(false)
        }
    }

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['anticipos-operativos', 'solicitudes'] })
    }

    const toggleRow = (id: number) => {
        setExpandedRowId((prev) => (prev === id ? null : id))
    }

    const columns: ColumnDef<AnticipoOperativo>[] = [
        {
            id: 'expand',
            header: () => null,
            cell: ({ row }) => {
                const isExpanded = expandedRowId === row.original.id
                return (
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleRow(row.original.id) }}
                        className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title={isExpanded ? 'Colapsar distribución' : 'Ver distribución'}
                    >
                        <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 24 }}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </motion.div>
                    </button>
                )
            },
            size: 40,
        },
        {
            accessorKey: 'numero_anticipo',
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
                    N° Egreso <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <span className="font-mono text-xs font-semibold text-primary">{row.getValue('numero_anticipo')}</span>
            ),
        },
        {
            accessorKey: 'usuario_nombre',
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
                    Solicitante <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <span className="text-sm">{row.getValue('usuario_nombre')}</span>,
        },
        {
            accessorKey: 'centro_operacion_codigo',
            header: 'C.O.',
            cell: ({ row }) => {
                const codigo = row.getValue('centro_operacion_codigo') as string | null
                return codigo
                    ? <span className="font-mono text-sm font-semibold">{codigo}</span>
                    : <span className="text-xs italic text-muted-foreground">Sin asignar</span>
            },
        },
        {
            accessorKey: 'area_departamento',
            header: 'Área',
            cell: ({ row }) => <span className="text-sm">{row.getValue('area_departamento')}</span>,
        },
        {
            accessorKey: 'motivo_general',
            header: 'Motivo',
            cell: ({ row }) => {
                const value = row.getValue('motivo_general') as string
                return <span className="text-sm text-muted-foreground">{value ? formatters.truncate(value, 35) : '—'}</span>
            },
        },
        {
            accessorKey: 'valor_solicitado',
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
                    Valor solicitado <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <span className="text-sm font-medium">{formatters.currency(row.getValue('valor_solicitado'))}</span>
            ),
        },
        {
            accessorKey: 'prioridad',
            header: 'Prioridad',
            cell: ({ row }) => {
                const prioridad = row.getValue('prioridad') as string
                return prioridad ? (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPrioridadBadge(prioridad)}`}>
                        {prioridad}
                    </span>
                ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                )
            },
        },
        {
            accessorKey: 'estado',
            header: 'Estado',
            cell: ({ row }) => {
                const estado = row.getValue('estado') as string
                return estado ? (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getEstadoBadge(estado)}`}>
                        {estado}
                    </span>
                ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                )
            },
        },
        {
            id: 'pce',
            header: 'PCE',
            cell: ({ row }) => row.original.desembolso_docto
                ? <span className="whitespace-nowrap font-mono text-xs font-semibold">{row.original.desembolso_docto}</span>
                : <span className="text-muted-foreground text-xs">—</span>,
        },
        {
            accessorKey: 'fecha_solicitud',
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
                    Fecha solicitud <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">{formatters.dateTime(row.getValue('fecha_solicitud'))}</span>
            ),
        },
        {
            id: 'acciones',
            header: () => <div className="text-right pr-2">Acciones</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setViewingAnticipo(row.original) }}
                        className="h-8 w-8 p-0 border border-primary/20 text-primary hover:bg-primary/10"
                        title="Ver detalle"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    {normalizarEstado(row.original.estado) === 'PENDIENTE' && puede(P.AUTORIZAR_EGRESO) && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => { setErrorEstado(null); setAutorizando(row.original) }}>Autorizar</Button>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setErrorEstado(null); setMotivoRechazo(''); setRechazando(row.original) }}>Rechazar</Button>
                        </>
                    )}
                    {['AUTORIZADA', 'ESPERA EFECTIVO'].includes(normalizarEstado(row.original.estado)) && puede(P.DESEMBOLSAR_EGRESO) && (
                        <Button variant="outline" size="sm" onClick={() => setDesembolsando(row.original)}>Desembolsar</Button>
                    )}
                    {['AUTORIZADA', 'ESPERA EFECTIVO'].includes(normalizarEstado(row.original.estado)) && puede(P.RECHAZAR_EGRESO) && (
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setErrorEstado(null); setMotivoRechazo(''); setRechazando(row.original) }}>Rechazar</Button>
                    )}
                    {puede(P.EDITAR_EGRESO) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setEditingAnticipo(row.original) }}
                            className="h-8 w-8 p-0 border border-muted-foreground/20 text-muted-foreground hover:bg-muted/50"
                            title="Editar"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ]

    const table = useReactTable({
        data: solicitudesFiltradas,
        columns,
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: { sorting, globalFilter },
        initialState: { pagination: { pageSize: 15 } },
    })

    return (
        <div className="nu mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8 2xl:max-w-[1600px] xl:[zoom:1.12] 2xl:[zoom:1.15]">
            {/* Contenedor principal idéntico a Recibo de Caja */}
            <div className="space-y-6 nu-card">
                {/* Barra de pestañas estilo píldora */}
                <div className="flex flex-wrap items-center gap-3 px-4 pt-4">
                    <div className="flex flex-wrap gap-1 nu-seg">
                        {([
                            ['egresos', 'Egresos', Receipt],
                            ['documentos', `Documentos (${totalDocumentosPce})`, FileText],
                            ...(puede(P.DISPERSAR_EGRESO) ? ([['dispersion', 'Dispersión', Send]] as const) : []),
                        ] as const).map(([id, etiqueta, Icono]) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setVista(id)}
                                className={cn(
                                    'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all',
                                    vista === id
                                        ? 'bg-card text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                                )}
                            >
                                <Icono className="h-3.5 w-3.5" /> {etiqueta}
                            </button>
                        ))}
                    </div>

                    <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
                        {solicitudes && (
                            <div className="flex items-center gap-2 nu-card px-3.5 py-2">
                                <span className="font-medium text-muted-foreground">Solicitudes:</span>
                                <span className="font-mono font-bold text-foreground">{solicitudes.length}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 nu-card px-3.5 py-2">
                            <span className="font-medium text-muted-foreground">Documentos PCE:</span>
                            <span className="font-mono font-bold text-primary">{totalDocumentosPce}</span>
                        </div>
                    </div>
                </div>

                {/* Contenido de la pestaña activa */}
                <div className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                    {isLoading ? (
                        <div className="flex flex-col gap-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-64 w-full" />
                        </div>
                    ) : error ? (
                        <ErrorState
                            title="Error al cargar las solicitudes"
                            message="Verifica la conexión e intenta de nuevo"
                            minHeight="h-48"
                            onRetry={handleRefresh}
                        />
                    ) : vista === 'dispersion' ? (
                        <DispersionTab />
                    ) : vista === 'documentos' ? (
                        <div className="space-y-4">
                            {/* Barra de filtros idéntica a Recibos registrados */}
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                <div className="flex shrink-0 items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <h2 className="text-sm font-bold text-foreground">Documentos de egreso ({documentosPce.length})</h2>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Select
                                        value={docEstado}
                                        onChange={(e) => setDocEstado(e.target.value)}
                                        className="nu-control nu-control-sm text-xs"
                                        aria-label="Filtrar por estado"
                                    >
                                        <option value="">Todos los estados</option>
                                        {opcionesEstadoDoc.map((est) => (
                                            <option key={est} value={est}>{est}</option>
                                        ))}
                                    </Select>

                                    <Select
                                        value={docCo}
                                        onChange={(e) => setDocCo(e.target.value)}
                                        className="nu-control nu-control-sm text-xs"
                                        aria-label="Filtrar por centro de operación"
                                    >
                                        <option value="">Todos los C.O.</option>
                                        {opcionesCoDoc.map((co) => (
                                            <option key={co} value={co}>C.O. {co}</option>
                                        ))}
                                    </Select>

                                    <Select
                                        value={docCaja}
                                        onChange={(e) => setDocCaja(e.target.value)}
                                        className="nu-control nu-control-sm text-xs"
                                        aria-label="Filtrar por caja"
                                    >
                                        <option value="">Todas las cajas</option>
                                        {opcionesCajaDoc.map((caja) => (
                                            <option key={caja} value={caja}>{caja}</option>
                                        ))}
                                    </Select>

                                    <div className="flex items-center gap-1.5">
                                        <div className="w-36 shrink-0">
                                            <FechaInput value={docDesde} onChange={setDocDesde} max={docHasta || undefined} className="text-xs" />
                                        </div>
                                        <span className="text-xs text-muted-foreground">a</span>
                                        <div className="w-36 shrink-0">
                                            <FechaInput value={docHasta} onChange={setDocHasta} min={docDesde || undefined} className="text-xs" />
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            className="nu-control nu-control-sm w-40 pl-10 text-xs"
                                            value={docBusqueda}
                                            onChange={(e) => setDocBusqueda(e.target.value)}
                                            placeholder="Solicitante"
                                            autoComplete="off"
                                        />
                                    </div>

                                    <Button size="sm" className="nu-btn nu-btn-primary gap-1 text-xs" onClick={handleRefresh} disabled={isLoading}>
                                        <Search className="h-3.5 w-3.5" /> Consultar
                                    </Button>
                                    <BotonExcel nombre="documentos_egreso" />
                                </div>
                            </div>

                            {/* Tabla + panel lateral de detalle */}
                            <div className="flex items-stretch gap-4">
                                <div className="min-w-0 flex-1 nu-card overflow-hidden">
                                    <div className="max-h-[calc(100vh-14rem)] overflow-auto">
                                        <table className="w-full text-xs">
                                            <thead className="sticky top-0 z-10">
                                                <tr className="border-b border-border">
                                                    {['Documento', 'Fecha', 'Solicitante', 'Desembolsó', 'C.O.', 'Estado', 'Valor'].map((h) => (
                                                        <th
                                                            key={h}
                                                            className={cn(
                                                                'whitespace-nowrap bg-muted px-4 py-3 text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]',
                                                                h === 'Valor' ? 'text-right' : h === 'Estado' ? 'text-center' : 'text-left'
                                                            )}
                                                        >
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {documentosPce.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="py-14 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                                            No hay documentos de egreso para los filtros seleccionados
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    documentosPce.map((d) => {
                                                        const co = d.desembolso_co || d.centro_operacion_codigo || '—'
                                                        const valor = d.valor_aprobado ?? d.valor_solicitado
                                                        return (
                                                            <tr
                                                                key={d.id}
                                                                onClick={() => setViewingAnticipo(d)}
                                                                onMouseEnter={() => setDocSenalado(d)}
                                                                className={cn(
                                                                    'cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30',
                                                                    docSenalado?.id === d.id && 'bg-primary/5'
                                                                )}
                                                                title="Ver detalle del documento"
                                                            >
                                                                <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-primary">
                                                                    <span className="flex items-center gap-1">
                                                                        <Hash className="h-3 w-3" />
                                                                        {d.desembolso_docto}
                                                                    </span>
                                                                    <p className="font-mono text-[10px] font-normal text-muted-foreground">{d.numero_anticipo}</p>
                                                                </td>
                                                                <td className="whitespace-nowrap px-4 py-3 font-mono text-muted-foreground">
                                                                    {formatters.dateOnly(d.desembolso_fecha)}
                                                                </td>
                                                                <td className="max-w-[260px] px-4 py-3">
                                                                    <p className="truncate font-medium text-foreground">{d.usuario_nombre}</p>
                                                                    <p className="truncate text-[10px] text-muted-foreground">{d.motivo_general || d.area_departamento}</p>
                                                                </td>
                                                                <td className="max-w-[200px] px-4 py-3">
                                                                    <p className="truncate font-medium text-foreground">{d.desembolso_usuario_nombre ?? '—'}</p>
                                                                    <p className="text-[10px] text-muted-foreground">Tesorería</p>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <p className="font-mono font-bold text-foreground">{co}</p>
                                                                    <p className="whitespace-nowrap text-[10px] text-muted-foreground">{d.desembolso_caja ?? '—'}</p>
                                                                </td>
                                                                <td className="whitespace-nowrap px-4 py-3 text-center">
                                                                    {estadoDocto(d) ? (
                                                                        <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase', getEstadoBadge(estadoDocto(d)))}>
                                                                            {estadoDocto(d)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">—</span>
                                                                    )}
                                                                </td>
                                                                <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground">
                                                                    {formatters.currency(valor)}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Panel lateral de detalle */}
                                <aside className="hidden w-80 shrink-0 nu-card lg:block">
                                    <div className="sticky top-4 p-5">
                                        <AnimatePresence mode="wait">
                                            {!docSenalado ? (
                                                <motion.p
                                                    key="vacio"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="py-16 text-center text-sm text-muted-foreground"
                                                >
                                                    Pasa el mouse sobre un documento para ver su detalle.
                                                </motion.p>
                                            ) : (
                                                <motion.div
                                                    key={docSenalado.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -8 }}
                                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                                    className="space-y-5"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="text-xs nu-th">Documento</p>
                                                            <p className="font-mono text-lg font-bold text-primary">
                                                                {docSenalado.desembolso_docto}
                                                            </p>
                                                        </div>
                                                        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', getEstadoBadge(estadoDocto(docSenalado)))}>
                                                            {estadoDocto(docSenalado)}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2.5 text-xs">
                                                        <div className="flex justify-between gap-2">
                                                            <span className="text-muted-foreground">Anticipo</span>
                                                            <span className="font-mono font-semibold text-foreground">{docSenalado.numero_anticipo}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-2">
                                                            <span className="text-muted-foreground">Fecha</span>
                                                            <span className="font-mono text-foreground">{formatters.dateTime(docSenalado.desembolso_fecha)}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-2">
                                                            <span className="text-muted-foreground">Solicitante</span>
                                                            <span className="truncate font-medium text-foreground">{docSenalado.usuario_nombre}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-2">
                                                            <span className="text-muted-foreground">Área</span>
                                                            <span className="truncate text-foreground">{docSenalado.area_departamento || '—'}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-2">
                                                            <span className="text-muted-foreground">Desembolsó</span>
                                                            <span className="truncate font-medium text-foreground">{docSenalado.desembolso_usuario_nombre ?? '—'}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-2">
                                                            <span className="text-muted-foreground">Caja / C.O.</span>
                                                            <span className="font-mono text-foreground">
                                                                {docSenalado.desembolso_caja ?? '—'} · {docSenalado.desembolso_co || docSenalado.centro_operacion_codigo || '—'}
                                                            </span>
                                                        </div>
                                                        {docSenalado.desembolso_docto_estado_codigo === 2 && (docSenalado.desembolso_docto_usuario_anulacion || docSenalado.desembolso_docto_fecha_anulacion) && (
                                                            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive">
                                                                <p className="font-semibold">Cancelado en SIESA</p>
                                                                {docSenalado.desembolso_docto_usuario_anulacion && (
                                                                    <p className="mt-0.5 text-[11px]">Por: {docSenalado.desembolso_docto_usuario_anulacion}</p>
                                                                )}
                                                                {docSenalado.desembolso_docto_fecha_anulacion && (
                                                                    <p className="font-mono text-[11px]">{formatters.dateTime(docSenalado.desembolso_docto_fecha_anulacion)}</p>
                                                                )}
                                                            </div>
                                                        )}
                                                        {docSenalado.motivo_general && (
                                                            <div className="border-t border-border/60 pt-2.5">
                                                                <p className="mb-1 text-muted-foreground">Motivo</p>
                                                                <p className="text-foreground">{docSenalado.motivo_general}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-t border-border pt-4 text-base font-bold">
                                                        <span>Total desembolsado</span>
                                                        <span className="font-mono tabular-nums text-primary">
                                                            {formatters.currency(docSenalado.valor_aprobado ?? docSenalado.valor_solicitado)}
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </aside>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Barra de filtros de Egresos */}
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                <div className="flex shrink-0 items-center gap-2">
                                    <Receipt className="h-5 w-5 text-primary" />
                                    <h2 className="text-sm font-bold text-foreground">Solicitudes de egreso ({solicitudesFiltradas.length})</h2>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar por número, solicitante, área..."
                                            value={globalFilter ?? ''}
                                            onChange={(e) => { setGlobalFilter(e.target.value); table.setPageIndex(0) }}
                                            className="nu-control nu-control-sm w-64 pl-10 text-xs"
                                            autoComplete="off"
                                        />
                                    </div>
                                    <BotonExcel nombre="egresos" />
                                    {puede(P.CREAR_EGRESO) && <BotonCrear titulo="Crear egreso" onClick={() => setCrearAbierto(true)} />}
                                    <Button variant="soft" size="icon" onClick={handleRefresh} disabled={isLoading} title="Actualizar">
                                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                            </div>

                            <div role="group" aria-label="Filtrar egresos por estado" className="flex flex-wrap gap-1.5">
                                {filtrosEstado.map(({ estado, etiqueta }) => {
                                    const cantidad = estado === 'TODOS' ? (solicitudes?.length ?? 0) : (solicitudes || []).filter((item) => normalizarEstado(item.estado) === estado).length
                                    return (
                                        <button
                                            key={estado}
                                            type="button"
                                            aria-pressed={filtroEstado === estado}
                                            onClick={() => { setFiltroEstado(estado); table.setPageIndex(0) }}
                                            className={cn(
                                                'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                                                filtroEstado === estado
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-[var(--nu-fill)] text-muted-foreground hover:bg-[var(--nu-fill-2)] hover:text-foreground'
                                            )}
                                        >
                                            {etiqueta} <span className="ml-1 font-mono tabular-nums">{cantidad}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="nu-card overflow-hidden">
                                <div className="max-h-[calc(100vh-16rem)] overflow-auto">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 z-10">
                                            {table.getHeaderGroups().map((headerGroup) => (
                                                <tr key={headerGroup.id} className="border-b border-border">
                                                    {headerGroup.headers.map((header) => (
                                                        <th key={header.id} className="whitespace-nowrap bg-muted px-3 py-3 text-left text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">
                                                            {header.isPlaceholder
                                                                ? null
                                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                                        </th>
                                                    ))}
                                                </tr>
                                            ))}
                                        </thead>
                                        <tbody>
                                            {table.getRowModel().rows.length ? (
                                                table.getRowModel().rows.map((row) => {
                                                    const isExpanded = expandedRowId === row.original.id
                                                    return (
                                                        <Fragment key={row.id}>
                                                            <motion.tr
                                                                className={cn('cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30', isExpanded && 'bg-primary/5')}
                                                                onClick={() => toggleRow(row.original.id)}
                                                                initial={{ opacity: 0, y: 6 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                                            >
                                                                {row.getVisibleCells().map((cell) => (
                                                                    <td key={cell.id} className="px-3 py-3 align-middle">
                                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                    </td>
                                                                ))}
                                                            </motion.tr>
                                                            <AnimatePresence>
                                                                {isExpanded && (
                                                                    <DistribucionAccordion
                                                                        anticipo={row.original}
                                                                        totalColumnas={columns.length}
                                                                    />
                                                                )}
                                                            </AnimatePresence>
                                                        </Fragment>
                                                    )
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={columns.length} className="py-14 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                                        No se encontraron solicitudes.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Paginación */}
                                <div className="flex items-center justify-between border-t border-border/60 bg-card px-4 py-3">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {table.getFilteredRowModel().rows.length} de {table.getCoreRowModel().rows.length} registros
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button variant="soft" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                                            Anterior
                                        </Button>
                                        <span className="text-xs text-muted-foreground">
                                            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
                                        </span>
                                        <Button variant="soft" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                                            Siguiente
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de creación */}
            {crearAbierto && (
                <CrearEgresoModal
                    onClose={() => setCrearAbierto(false)}
                    onCreated={() => {
                        setCrearAbierto(false)
                        void queryClient.invalidateQueries({ queryKey: ['anticipos-operativos'] })
                    }}
                />
            )}

            {/* Modal de vista */}
            {viewingAnticipo && (
                <ViewModal anticipo={viewingAnticipo} onClose={() => setViewingAnticipo(null)} />
            )}

            {/* Modal de edición */}
            {editingAnticipo && (
                <EditModal
                    anticipo={editingAnticipo}
                    onClose={() => setEditingAnticipo(null)}
                    onSaved={() => { setEditingAnticipo(null); handleRefresh() }}
                />
            )}

            {autorizando && (
                <Modal isOpen onClose={cerrarEstado} title="Autorizar egreso" className="max-w-md">
                    <div className="space-y-4">
                        <p>¿Autorizar el egreso {autorizando.numero_anticipo} por {formatters.currency(autorizando.valor_solicitado)}? Pasará a tesorería.</p>
                        {errorEstado && <p role="alert" className="text-sm text-destructive">{errorEstado}</p>}
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={cerrarEstado} disabled={guardandoEstado}>Cancelar</Button>
                            <Button onClick={() => void guardarEstado(autorizando, 'AUTORIZADA')} disabled={guardandoEstado}>
                                {guardandoEstado && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Autorizar
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {rechazando && (
                <Modal isOpen onClose={cerrarEstado} title="Rechazar egreso" className="max-w-md">
                    <form onSubmit={(event) => { event.preventDefault(); void guardarEstado(rechazando, 'RECHAZADA', motivoRechazo) }} className="space-y-4">
                        <p className="text-sm">Egreso {rechazando.numero_anticipo} · {formatters.currency(rechazando.valor_solicitado)}</p>
                        <div className="space-y-1.5">
                            <label htmlFor="motivo-rechazo" className="text-sm font-medium">Motivo del rechazo</label>
                            <textarea id="motivo-rechazo" required value={motivoRechazo} onChange={(event) => setMotivoRechazo(event.target.value)} rows={3}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        {errorEstado && <p role="alert" className="text-sm text-destructive">{errorEstado}</p>}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={cerrarEstado} disabled={guardandoEstado}>Cancelar</Button>
                            <Button type="submit" variant="destructive" disabled={guardandoEstado || !motivoRechazo.trim()}>
                                {guardandoEstado && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Rechazar
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {desembolsando && (
                <DesembolsoModal anticipo={desembolsando} onClose={() => setDesembolsando(null)}
                    onSaved={() => { setDesembolsando(null); void queryClient.invalidateQueries({ queryKey: ['anticipos-operativos'] }) }} />
            )}
        </div>
    )
}
