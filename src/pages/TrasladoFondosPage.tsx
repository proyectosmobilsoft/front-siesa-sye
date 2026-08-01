import { motion } from 'framer-motion'
import { useState } from 'react'
import { ArrowRightLeft, AlertCircle, CheckCircle2, Loader2, Landmark, History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useTrasladosFondos, useCrearTrasladoFondos } from '@/hooks/useTrasladoFondos'
import { formatters } from '@/utils/formatters'
import { badgeClass, Tono } from '@/utils/badges'
import { TrasladoFondosEstado } from '@/api/types'

// Catálogo de cajas: por ahora es la misma lista fija que usa ReciboCajaPage,
// no existe un endpoint de catálogo de cajas en backend todavía.
// Ver docs/traslado-fondos.md — idealmente esto debería venir de un
// GET /cajas real en vez de estar hardcodeado en dos lugares del front.
const CAJAS = [
    { id: 'CAJA_SUCURSAL_PORTAL_SOLEDAD', nombre: 'CAJA SUCURSAL PORTAL DE SOLEDAD' },
    { id: 'CAJA_PRINCIPAL', nombre: 'CAJA PRINCIPAL' },
]

const ESTADO_TONO: Record<TrasladoFondosEstado, Tono> = {
    PENDIENTE: 'amber',
    CONFIRMADO: 'green',
    RECHAZADO: 'red',
}

const ESTADO_LABEL: Record<TrasladoFondosEstado, string> = {
    PENDIENTE: 'Pendiente',
    CONFIRMADO: 'Confirmado',
    RECHAZADO: 'Rechazado',
}

export const TrasladoFondosPage = () => {
    const [cajaOrigen, setCajaOrigen] = useState('')
    const [cajaDestino, setCajaDestino] = useState('')
    const [valor, setValor] = useState('')
    const [referencia, setReferencia] = useState('')
    const [exito, setExito] = useState(false)

    const { data: historial, isLoading: cargandoHistorial, error: errorHistorial } = useTrasladosFondos()
    const crearTraslado = useCrearTrasladoFondos()

    const valorNumerico = Number(valor)
    const mismasCajas = cajaOrigen !== '' && cajaOrigen === cajaDestino
    const formularioValido = !!cajaOrigen && !!cajaDestino && !mismasCajas && valorNumerico > 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formularioValido) return
        setExito(false)
        try {
            await crearTraslado.mutateAsync({
                caja_origen_id: cajaOrigen,
                caja_destino_id: cajaDestino,
                valor: valorNumerico,
                referencia: referencia.trim() || undefined,
            })
            setExito(true)
            setCajaOrigen('')
            setCajaDestino('')
            setValor('')
            setReferencia('')
        } catch {
            // El estado de error lo expone crearTraslado.error, se muestra abajo.
        }
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3"
            >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary">
                    <ArrowRightLeft className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Traslado de Fondos</h1>
                    <p className="text-sm text-muted-foreground">Mueve efectivo de una caja a otra (solo Administrador)</p>
                </div>
            </motion.div>

            <Card className="border-l-4 border-l-primary">
                <CardHeader>
                    <CardTitle className="text-base">Nuevo traslado</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Caja origen
                                </label>
                                <Select value={cajaOrigen} onChange={(e) => setCajaOrigen(e.target.value)}>
                                    <option value="">Selecciona la caja origen</option>
                                    {CAJAS.map((c) => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Caja destino
                                </label>
                                <Select value={cajaDestino} onChange={(e) => setCajaDestino(e.target.value)}>
                                    <option value="">Selecciona la caja destino</option>
                                    {CAJAS.map((c) => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        {mismasCajas && (
                            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                La caja origen y destino no pueden ser la misma.
                            </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Valor a trasladar
                                </label>
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    placeholder="0"
                                    value={valor}
                                    onChange={(e) => setValor(e.target.value)}
                                    className="text-lg font-semibold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Referencia (opcional)
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Motivo o nota del traslado"
                                    value={referencia}
                                    onChange={(e) => setReferencia(e.target.value)}
                                />
                            </div>
                        </div>

                        {crearTraslado.isError && (
                            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                No se pudo registrar el traslado. Intenta de nuevo.
                            </div>
                        )}

                        {exito && !crearTraslado.isError && (
                            <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-3 text-sm font-medium text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">
                                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                Traslado registrado correctamente.
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button type="submit" disabled={!formularioValido || crearTraslado.isPending} className="gap-2">
                                {crearTraslado.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                                Realizar traslado
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <History className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base">Historial de traslados</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
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
                            <AlertCircle className="h-6 w-6 text-destructive" />
                            <p className="text-sm font-semibold text-destructive">No se pudo cargar el historial de traslados.</p>
                            <p className="max-w-sm text-xs text-muted-foreground">
                                Este módulo aún no tiene el endpoint de backend conectado. Ver docs/traslado-fondos.md.
                            </p>
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
                            {historial.map((t) => (
                                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <ArrowRightLeft className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {t.caja_origen_nombre} <span className="text-muted-foreground">→</span> {t.caja_destino_nombre}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatters.dateTime(t.fecha)} · {t.usuario_registro_nombre || 'Administrador'}
                                            {t.referencia ? ` · ${t.referencia}` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold tabular-nums">{formatters.currency(t.valor)}</p>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badgeClass(ESTADO_TONO[t.estado])}`}>
                                            {ESTADO_LABEL[t.estado]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
