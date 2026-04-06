import { motion, AnimatePresence } from 'framer-motion'
import { useState, Fragment } from 'react'
import { createPortal } from 'react-dom'
import {
    Search,
    Eye,
    Edit,
    RefreshCw,
    Loader2,
    Wallet,
    ArrowUpDown,
    ChevronRight,
    Users,
    AlertCircle,
    Receipt,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/lib/skeleton'
import { useAnticiposOperativos } from '@/hooks/useAnticiposOperativos'
import { anticiposOperativosApi } from '@/api/anticiposOperativos'
import { AnticipoOperativo, AnticipoOperativoUpdatePayload, DistribucionItem, Soporte } from '@/api/types'
import { formatters } from '@/utils/formatters'
import { useQueryClient } from '@tanstack/react-query'

// ─── Utilidades de UI ────────────────────────────────────────────────────────

const getPrioridadBadge = (prioridad: string) => {
    switch (prioridad?.toLowerCase()) {
        case 'alta':
        case 'urgente':
            return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        case 'media':
            return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        case 'baja':
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        default:
            return 'bg-muted text-muted-foreground'
    }
}

const getEstadoBadge = (estado: string) => {
    switch (estado?.toLowerCase()) {
        case 'aprobado':
        case 'completado':
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        case 'pendiente':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        case 'rechazado':
        case 'cancelado':
            return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        case 'en revisión':
        case 'en revision':
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
                                                    {formatters.date(s.created_at)}
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
                                            <p className={`text-xs font-bold mt-0.5 ${resumen.saldo_pendiente > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
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
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
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
                            <span className={`font-semibold text-sm ${disponible > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {formatters.currency(disponible)}
                            </span>
                        )
                    })()}
                </td>
            </motion.tr>
            <AnimatePresence>
                {expanded && (
                    <SoportesSubAccordion soportes={soportesConductor} colSpan={5} />
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

                        {isLoading ? (
                            <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cargando distribución...
                            </div>
                        ) : error ? (
                            <div className="flex items-center gap-2 py-3 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                No se pudo cargar la distribución
                            </div>
                        ) : !data || data.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2 italic">
                                No se encontró distribución para este anticipo.
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
                                            <td colSpan={2} className="py-2 px-4 text-xs font-medium text-muted-foreground text-right uppercase tracking-wide">
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
                                                <span className="font-bold text-sm text-red-600 dark:text-red-400">
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
                        <h2 className="text-lg font-bold">Anticipo #{anticipo.numero_anticipo}</h2>
                        <p className="text-sm text-muted-foreground">Detalle completo de la solicitud</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadge(anticipo.estado)}`}>
                        {anticipo.estado}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Campo label="Número de anticipo" value={anticipo.numero_anticipo} />
                    <Campo label="Solicitante" value={anticipo.usuario_nombre} />
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

                <div className="grid grid-cols-3 gap-4">
                    <Campo label="Fecha solicitud" value={formatters.date(anticipo.fecha_solicitud)} />
                    <Campo label="Fecha inicio operación" value={formatters.dateOnly(anticipo.fecha_inicio_operacion)} />
                    <Campo label="Fecha fin estimada" value={formatters.dateOnly(anticipo.fecha_fin_estimada)} />
                    <Campo label="Fecha requerida dinero" value={formatters.dateOnly(anticipo.fecha_requerida_dinero)} />
                    <Campo label="Creado" value={formatters.date(anticipo.created_at)} />
                    <Campo label="Actualizado" value={formatters.date(anticipo.updated_at)} />
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
            await anticiposOperativosApi.update(anticipo.id, form)
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
                    <p className="text-sm text-muted-foreground">Anticipo #{anticipo.numero_anticipo} — {anticipo.usuario_nombre}</p>
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
                    <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
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
    const { data: solicitudes, isLoading, error } = useAnticiposOperativos()
    const [globalFilter, setGlobalFilter] = useState('')
    const [sorting, setSorting] = useState<SortingState>([])
    const [expandedRowId, setExpandedRowId] = useState<number | null>(null)
    const [viewingAnticipo, setViewingAnticipo] = useState<AnticipoOperativo | null>(null)
    const [editingAnticipo, setEditingAnticipo] = useState<AnticipoOperativo | null>(null)

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
                    N° Anticipo <ArrowUpDown className="ml-2 h-4 w-4" />
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
            accessorKey: 'fecha_solicitud',
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
                    Fecha solicitud <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">{formatters.date(row.getValue('fecha_solicitud'))}</span>
            ),
        },
        {
            id: 'acciones',
            header: () => <div className="text-right pr-2">Acciones</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setViewingAnticipo(row.original) }}
                        className="h-8 w-8 p-0 border border-primary/20 text-primary hover:bg-primary/10"
                        title="Ver detalle"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setEditingAnticipo(row.original) }}
                        className="h-8 w-8 p-0 border border-muted-foreground/20 text-muted-foreground hover:bg-muted/50"
                        title="Editar"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ]

    const table = useReactTable({
        data: solicitudes || [],
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
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 space-y-6 p-6"
        >
            {/* Encabezado */}
            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Actualizar
                </Button>
            </div>

            {/* Tabla */}
            {isLoading ? (
                <Card>
                    <CardHeader><CardTitle>Anticipos Operativos</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            ) : error ? (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/10">
                    <CardContent className="flex items-center justify-center h-48">
                        <div className="text-center text-red-600">
                            <p className="text-lg font-medium">Error al cargar las solicitudes</p>
                            <p className="text-sm text-muted-foreground mt-1">Verifica la conexión e intenta de nuevo</p>
                            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4 gap-2">
                                <RefreshCw className="h-4 w-4" />Reintentar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-primary" />
                                Anticipos Operativos
                            </CardTitle>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por número, solicitante, área..."
                                    value={globalFilter ?? ''}
                                    onChange={(e) => setGlobalFilter(e.target.value)}
                                    className="pl-9"
                                    autoComplete="off"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border bg-card">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-sm">
                                        <thead>
                                            {table.getHeaderGroups().map((headerGroup) => (
                                                <tr key={headerGroup.id} className="border-b bg-muted/50">
                                                    {headerGroup.headers.map((header) => (
                                                        <th key={header.id} className="h-11 px-3 text-left align-middle font-medium text-muted-foreground">
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
                                                                className={`border-b cursor-pointer hover:bg-muted/30 ${isExpanded ? 'bg-primary/5' : ''}`}
                                                                style={{ transition: 'background-color 0.15s ease' }}
                                                                onClick={() => toggleRow(row.original.id)}
                                                                initial={{ opacity: 0, y: 6 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                                            >
                                                                {row.getVisibleCells().map((cell) => (
                                                                    <td key={cell.id} className="py-3 px-3 align-middle">
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
                                                    <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                                        No se encontraron solicitudes.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Paginación */}
                            <div className="flex items-center justify-between space-x-2 py-4">
                                <div className="flex-1 text-sm text-muted-foreground">
                                    {table.getFilteredRowModel().rows.length} de {table.getCoreRowModel().rows.length} registros
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                                        Anterior
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
                                    </span>
                                    <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                                        Siguiente
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
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
        </motion.div>
    )
}
