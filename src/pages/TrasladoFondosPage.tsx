import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import {
    ArrowRightLeft,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Landmark,
    History,
    ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useCajasTraspaso, useTrasladosFondos, useCrearTrasladoFondos } from '@/hooks/useTrasladoFondos'
import { formatters } from '@/utils/formatters'
import { CajaTraspaso } from '@/api/types'

const CajaSelector = ({
    label,
    value,
    onChange,
    disabledValue,
    cajas,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    disabledValue?: string
    cajas: CajaTraspaso[]
}) => (
    <div className="flex-1 space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
        </label>
        <div className="relative">
            <Landmark className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Select value={value} onChange={(e) => onChange(e.target.value)} className="pl-9">
                <option value="">Selecciona una caja</option>
                {cajas.map((c) => (
                    <option key={c.id_caja} value={c.id_caja} disabled={c.id_caja === disabledValue}>
                        {c.nombre ?? c.id_caja}
                    </option>
                ))}
            </Select>
        </div>
    </div>
)

const SectionHeader = ({ icon: Icon, title, extra }: { icon: typeof ArrowRightLeft; title: string; extra?: React.ReactNode }) => (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold">{title}</h2>
        </div>
        {extra}
    </div>
)

export const TrasladoFondosPage = () => {
    const [cajaOrigen, setCajaOrigen] = useState('')
    const [cajaDestino, setCajaDestino] = useState('')
    const [valor, setValor] = useState('')
    const [notas, setNotas] = useState('')
    const [exito, setExito] = useState(false)
    const [fechaInicial, setFechaInicial] = useState('')
    const [fechaFinal, setFechaFinal] = useState('')

    const rangoInvalido = !!fechaInicial && !!fechaFinal && fechaInicial > fechaFinal

    const { data: cajas, isLoading: cargandoCajas, error: errorCajas } = useCajasTraspaso()
    const { data: historial, isLoading: cargandoHistorial, error: errorHistorial } = useTrasladosFondos(
        rangoInvalido ? undefined : { fechaInicial: fechaInicial || undefined, fechaFinal: fechaFinal || undefined }
    )
    const crearTraslado = useCrearTrasladoFondos()

    const nombreCaja = (id: string) => cajas?.find((c) => c.id_caja === id)?.nombre ?? id

    const limpiarFiltroFechas = () => {
        setFechaInicial('')
        setFechaFinal('')
    }

    const valorNumerico = Number(valor)
    const mismasCajas = cajaOrigen !== '' && cajaOrigen === cajaDestino
    const formularioValido = !!cajaOrigen && !!cajaDestino && !mismasCajas && valorNumerico > 0 && !cargandoCajas

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formularioValido) return
        setExito(false)
        try {
            await crearTraslado.mutateAsync({
                id_caja_origen: cajaOrigen,
                id_caja_destino: cajaDestino,
                valor: valorNumerico,
                notas: notas.trim() || undefined,
            })
            setExito(true)
            setCajaOrigen('')
            setCajaDestino('')
            setValor('')
            setNotas('')
        } catch {
            // El estado de error lo expone crearTraslado.error, se muestra abajo.
        }
    }

    return (
        <div className="grid h-full min-h-0 grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2 lg:divide-x lg:gap-0">
            {/* Formulario */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="flex min-h-0 flex-col gap-4 lg:pr-6"
            >
                <SectionHeader icon={ArrowRightLeft} title="Nuevo traslado" />

                {errorCajas && (
                    <div className="flex shrink-0 items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        No se pudo cargar el catálogo de cajas.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto">
                    {/* Flujo origen -> destino */}
                    <div className="flex flex-col items-center gap-3 sm:flex-row">
                        <CajaSelector label="Caja origen" value={cajaOrigen} onChange={setCajaOrigen} disabledValue={cajaDestino} cajas={cajas ?? []} />

                        <motion.div
                            animate={{ rotate: [0, 8, -8, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                            className="mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm sm:mt-6"
                        >
                            <ArrowRight className="h-4 w-4 hidden sm:block" />
                            <ArrowRightLeft className="h-4 w-4 sm:hidden" />
                        </motion.div>

                        <CajaSelector label="Caja destino" value={cajaDestino} onChange={setCajaDestino} disabledValue={cajaOrigen} cajas={cajas ?? []} />
                    </div>

                    {mismasCajas && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            La caja origen y destino no pueden ser la misma.
                        </div>
                    )}

                    {/* Monto */}
                    <div className="space-y-1.5 border-t pt-5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Valor a trasladar
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-primary/50">$</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                placeholder="0"
                                value={valor}
                                onChange={(e) => setValor(e.target.value)}
                                className="w-full bg-transparent pl-6 text-3xl font-extrabold tabular-nums text-primary outline-none placeholder:text-primary/30"
                            />
                        </div>
                    </div>

                    {/* Notas */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Notas (opcional)
                        </label>
                        <Input
                            type="text"
                            placeholder="Motivo o nota del traslado"
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                        />
                    </div>

                    {/* Preview del movimiento */}
                    <AnimatePresence>
                        {formularioValido && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-sm">
                                    <span className="font-medium">{nombreCaja(cajaOrigen)}</span>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-medium">{nombreCaja(cajaDestino)}</span>
                                    <span className="ml-auto font-bold tabular-nums text-primary">
                                        {formatters.currency(valorNumerico)}
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {crearTraslado.isError && (
                        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            No se pudo registrar el traslado. Intenta de nuevo.
                        </div>
                    )}

                    {exito && !crearTraslado.isError && (
                        <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                            Traslado registrado. Queda pendiente de aprobar en SIESA escritorio.
                        </div>
                    )}

                    <div className="mt-auto flex justify-end border-t pt-4">
                        <Button type="submit" size="lg" disabled={!formularioValido || crearTraslado.isPending} className="gap-2">
                            {crearTraslado.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                            Realizar traslado
                        </Button>
                    </div>
                </form>
            </motion.div>

            {/* Historial */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="flex min-h-0 flex-col gap-4 lg:pl-6"
            >
                <SectionHeader
                    icon={History}
                    title="Historial de traslados"
                    extra={
                        historial?.length ? (
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                                {historial.length} registro{historial.length !== 1 ? 's' : ''}
                            </span>
                        ) : undefined
                    }
                />

                <div className="flex shrink-0 flex-wrap items-end gap-3">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Desde
                        </label>
                        <Input
                            type="date"
                            value={fechaInicial}
                            onChange={(e) => setFechaInicial(e.target.value)}
                            className="h-9 w-40"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Hasta
                        </label>
                        <Input
                            type="date"
                            value={fechaFinal}
                            onChange={(e) => setFechaFinal(e.target.value)}
                            className="h-9 w-40"
                        />
                    </div>
                    {(fechaInicial || fechaFinal) && (
                        <Button type="button" variant="ghost" size="sm" onClick={limpiarFiltroFechas} className="h-9">
                            Limpiar
                        </Button>
                    )}
                    {rangoInvalido && (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" />
                            La fecha inicial no puede ser posterior a la final.
                        </span>
                    )}
                </div>

                <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                    {cargandoHistorial ? (
                        <div className="space-y-px p-4">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="flex animate-pulse items-center gap-3 py-3">
                                    <div className="h-9 w-9 rounded-full bg-muted" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-40 rounded bg-muted" />
                                        <div className="h-2 w-24 rounded bg-muted" />
                                    </div>
                                    <div className="h-4 w-20 rounded bg-muted" />
                                </div>
                            ))}
                        </div>
                    ) : errorHistorial ? (
                        <div className="flex flex-col items-center gap-2 py-14 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                                <AlertCircle className="h-5 w-5 text-destructive" />
                            </div>
                            <p className="text-sm font-semibold text-destructive">No se pudo cargar el historial de traslados.</p>
                        </div>
                    ) : !historial || historial.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Landmark className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                No hay traslados registrados
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {historial.map((t, idx) => (
                                <motion.div
                                    key={t.id}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <ArrowRightLeft className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-1.5 truncate text-sm font-semibold">
                                            {nombreCaja(t.id_caja_origen)}
                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                            {nombreCaja(t.id_caja_destino)}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {formatters.dateTime(t.fecha)} · {t.usuario_nombre || 'Administrador'}
                                            {t.motivo ? ` · ${t.motivo}` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold tabular-nums">{formatters.currency(t.valor)}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
