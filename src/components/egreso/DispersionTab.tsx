import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, Edit2, Hash, Loader2, Plus, Send, Trash2, Truck, Users, X } from 'lucide-react'
import { anticiposOperativosApi } from '@/api/anticiposOperativos'
import type { DispersionItemPayload } from '@/api/types'
import { Button } from '@/components/ui/button'
import { FechaInput } from '@/components/ui/fecha-input'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { aviso } from '@/store/avisosStore'
import { formatters } from '@/utils/formatters'

// Dispersión de un egreso desembolsado: quien recibió el dinero lo reparte entre conductores de una sola vez
// (formulario adaptado del anticipo de Vehiman). Cada conductor legaliza después su parte desde la app.

interface Fila {
    clave: number
    conductorId: string
    vehiculoId: string
    tramoId: string
    tipoTramoId: string
    salida: string
    llegada: string
    toneladas: string
    valor: string
}

const hoyIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const horaAhora = () => new Date().toTimeString().slice(0, 5)
let contador = 0
const filaVacia = (): Fila => ({
    clave: ++contador,
    conductorId: '',
    vehiculoId: '',
    tramoId: '',
    tipoTramoId: '',
    salida: hoyIso(),
    llegada: '',
    toneladas: '',
    valor: '',
})
const soloDigitos = (v: string) => v.replace(/\D/g, '')

const Campo = ({ etiqueta, opcional, children }: { etiqueta: string; opcional?: boolean; children: React.ReactNode }) => (
    <label className="flex min-w-0 flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground">
            {etiqueta} {opcional && <span className="font-normal text-muted-foreground">opcional</span>}
        </span>
        {children}
    </label>
)

export const DispersionTab = () => {
    const queryClient = useQueryClient()
    const egresos = useQuery({
        queryKey: ['anticipos-operativos', 'dispersion', 'egresos'],
        queryFn: anticiposOperativosApi.egresosDispersables,
        staleTime: 30 * 1000,
    })
    const catalogos = useQuery({
        queryKey: ['anticipos-operativos', 'dispersion', 'catalogos'],
        queryFn: anticiposOperativosApi.dispersionCatalogos,
        staleTime: 5 * 60 * 1000,
    })

    const [egresoId, setEgresoId] = useState('')
    const [fecha, setFecha] = useState(hoyIso)
    const [hora, setHora] = useState(horaAhora)
    const [borrador, setBorrador] = useState<Fila>(filaVacia)
    const [editandoClave, setEditandoClave] = useState<number | null>(null)
    const [filas, setFilas] = useState<Fila[]>([])
    const [errorForm, setErrorForm] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [enviando, setEnviando] = useState(false)

    const egreso = egresos.data?.find((e) => String(e.id) === egresoId)
    const hechas = useQuery({
        queryKey: ['anticipos-operativos', 'dispersion', 'hechas', egresoId],
        queryFn: () => anticiposOperativosApi.dispersionesDelEgreso(Number(egresoId)),
        enabled: Boolean(egresoId),
        staleTime: 15 * 1000,
    })
    const total = useMemo(() => filas.reduce((s, f) => s + (Number(f.valor) || 0), 0), [filas])
    const restante = (egreso?.disponible ?? 0) - total

    const cambiarBorrador = (cambio: Partial<Fila>) => {
        setErrorForm(null)
        setBorrador((prev) => ({ ...prev, ...cambio }))
    }

    const elegirConductor = (conductorId: string) => {
        const c = catalogos.data?.conductores.find((x) => String(x.id) === conductorId)
        // El vehículo asignado al conductor se propone solo; se puede cambiar.
        cambiarBorrador({ conductorId, ...(c?.maquinaria_cod ? { vehiculoId: String(c.maquinaria_cod) } : {}) })
    }

    const elegirTramo = (tramoId: string) => {
        const t = catalogos.data?.tramos.find((x) => String(x.id) === tramoId)
        cambiarBorrador({ tramoId, tipoTramoId: t?.tipo_id ? String(t.tipo_id) : '' })
    }

    const agregarOActualizar = () => {
        setErrorForm(null)
        setError(null)
        const cat = catalogos.data
        const veh = cat?.vehiculos.find((v) => String(v.id) === borrador.vehiculoId)
        if (!borrador.conductorId) return setErrorForm('Elija el conductor')
        if (!veh) return setErrorForm('Elija el vehículo')
        if (!borrador.tramoId) return setErrorForm('Elija el tramo')
        if (!borrador.salida) return setErrorForm('Indique la fecha de salida')
        if (!(Number(borrador.valor) > 0)) return setErrorForm('Indique el valor a dispersar')

        if (editandoClave != null) {
            setFilas((prev) => prev.map((f) => (f.clave === editandoClave ? { ...borrador, clave: editandoClave } : f)))
            setEditandoClave(null)
        } else {
            if (filas.length >= 50) return setErrorForm('Máximo 50 conductores por dispersión')
            setFilas((prev) => [...prev, { ...borrador, clave: ++contador }])
        }
        setBorrador(filaVacia())
    }

    const iniciarEdicion = (fila: Fila) => {
        setErrorForm(null)
        setEditandoClave(fila.clave)
        setBorrador({ ...fila })
    }

    const cancelarEdicion = () => {
        setErrorForm(null)
        setEditandoClave(null)
        setBorrador(filaVacia())
    }

    const quitarFila = (clave: number) => {
        setFilas((prev) => prev.filter((x) => x.clave !== clave))
        if (editandoClave === clave) cancelarEdicion()
    }

    const dispersar = async () => {
        setError(null)
        if (!egreso) return setError('Elija el egreso que va a dispersar')
        if (filas.length === 0) return setError('Agregue al menos un conductor al listado')
        if (restante < 0) return setError('El total supera lo disponible del egreso')

        const items: DispersionItemPayload[] = []
        for (const [i, f] of filas.entries()) {
            const veh = catalogos.data?.vehiculos.find((v) => String(v.id) === f.vehiculoId)
            if (!veh) return setError(`Conductor ${i + 1}: vehículo inválido`)
            items.push({
                usuario_id: Number(f.conductorId),
                maquinaria_cod: veh.id,
                placa: veh.placa,
                tramo_id: Number(f.tramoId),
                tipo_tramo_id: f.tipoTramoId ? Number(f.tipoTramoId) : null,
                fecha_salida: f.salida,
                fecha_llegada: f.llegada || null,
                toneladas: f.toneladas ? Number(f.toneladas.replace(',', '.')) : null,
                valor: Number(f.valor),
            })
        }

        setEnviando(true)
        try {
            const r = await anticiposOperativosApi.dispersar(egreso.id, { tipo: 'TRANSPORTE', fecha, hora, items })
            aviso.exito(`Dispersados ${formatters.currency(r.total)} entre ${items.length} ${items.length === 1 ? 'conductor' : 'conductores'}`)
            setFilas([])
            cancelarEdicion()
            void queryClient.invalidateQueries({ queryKey: ['anticipos-operativos'] })
        } catch (err: unknown) {
            const respuesta = (err as { response?: { data?: { message?: string } } }).response
            setError(respuesta?.data?.message || 'No se pudo dispersar')
        } finally {
            setEnviando(false)
        }
    }

    if (egresos.isLoading || catalogos.isLoading) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Cargando dispersión…
            </div>
        )
    }
    if (egresos.error || catalogos.error) {
        return (
            <div className="modal-alert-error flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> No se pudo cargar el formulario de dispersión (¿tiene el permiso DISPERSAR_EGRESO?).
            </div>
        )
    }

    const cat = catalogos.data!
    const sinTerceroBorrador = cat.conductores.find((c) => String(c.id) === borrador.conductorId)?.tiene_tercero_siesa === false

    return (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
            {/* ── Columna izquierda: Formulario ── */}
            <div className="space-y-4 lg:col-span-5">
                <section className="nu-card space-y-4 p-5">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-bold text-foreground">Anticipo</h2>
                        <div className="flex gap-1 nu-seg !h-9 !p-1">
                            <button type="button" className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-xs">
                                Transporte
                            </button>
                            <button
                                type="button"
                                disabled
                                title="Aún no disponible"
                                className="cursor-not-allowed rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground opacity-60"
                            >
                                Mantenimiento
                            </button>
                        </div>
                    </div>

                    <Campo etiqueta="Egreso a dispersar">
                        <Select value={egresoId} onChange={(e) => { setEgresoId(e.target.value); setError(null) }}>
                            <option value="">Selecciona…</option>
                            {egresos.data?.map((e) => (
                                <option key={e.id} value={e.id} disabled={e.disponible <= 0}>
                                    {e.desembolso_docto} · {e.numero_anticipo} · {e.solicitante} · disp. {formatters.currency(e.disponible)}
                                </option>
                            ))}
                        </Select>
                    </Campo>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Campo etiqueta="Fecha">
                            <FechaInput value={fecha} onChange={setFecha} />
                        </Campo>
                        <Campo etiqueta="Hora">
                            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
                        </Campo>
                    </div>
                </section>

                <section className="nu-card space-y-4 p-5">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-primary" />
                            <div>
                                <h2 className="text-sm font-bold text-foreground">
                                    {editandoClave != null ? 'Editar conductor' : 'Agregar conductor'}
                                </h2>
                                <p className="text-xs text-muted-foreground">Vehículo, conductor y tramo del viaje</p>
                            </div>
                        </div>
                        {editandoClave != null && (
                            <Button type="button" variant="soft" size="sm" onClick={cancelarEdicion} className="gap-1">
                                <X className="h-3.5 w-3.5" /> Cancelar
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Campo etiqueta="Conductor">
                            <Select value={borrador.conductorId} onChange={(e) => elegirConductor(e.target.value)}>
                                <option value="">Selecciona…</option>
                                {cat.conductores.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </Select>
                            {sinTerceroBorrador && (
                                <span className="text-[11px] text-amber-600 dark:text-amber-400">
                                    Sin tercero SIESA: no podrá enviar su PLC a contabilidad.
                                </span>
                            )}
                        </Campo>
                        <Campo etiqueta="Vehículo">
                            <Select value={borrador.vehiculoId} onChange={(e) => cambiarBorrador({ vehiculoId: e.target.value })}>
                                <option value="">Selecciona…</option>
                                {cat.vehiculos.map((v) => (
                                    <option key={v.id} value={v.id}>{v.placa}</option>
                                ))}
                            </Select>
                        </Campo>
                        <Campo etiqueta="Tramo">
                            <Select value={borrador.tramoId} onChange={(e) => elegirTramo(e.target.value)}>
                                <option value="">Selecciona…</option>
                                {cat.tramos.map((t) => (
                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                ))}
                            </Select>
                        </Campo>
                        <Campo etiqueta="Tipo de tramo" opcional>
                            <Select value={borrador.tipoTramoId} onChange={(e) => cambiarBorrador({ tipoTramoId: e.target.value })}>
                                <option value="">{borrador.tramoId ? 'Tipo del tramo' : 'Selecciona el tramo'}</option>
                                {cat.tipos.map((t) => (
                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                ))}
                            </Select>
                        </Campo>
                        <Campo etiqueta="Salida">
                            <FechaInput value={borrador.salida} onChange={(v) => cambiarBorrador({ salida: v })} />
                        </Campo>
                        <Campo etiqueta="Llegada" opcional>
                            <FechaInput value={borrador.llegada} min={borrador.salida || undefined} onChange={(v) => cambiarBorrador({ llegada: v })} />
                        </Campo>
                        <Campo etiqueta="Toneladas" opcional>
                            <Input
                                inputMode="decimal"
                                value={borrador.toneladas}
                                onChange={(e) => cambiarBorrador({ toneladas: e.target.value })}
                                placeholder="0"
                            />
                        </Campo>
                        <Campo etiqueta="Valor a dispersar">
                            <Input
                                inputMode="numeric"
                                className="font-mono tabular-nums"
                                value={borrador.valor ? Number(borrador.valor).toLocaleString('es-CO') : ''}
                                onChange={(e) => cambiarBorrador({ valor: soloDigitos(e.target.value) })}
                                placeholder="$ 0"
                            />
                        </Campo>
                    </div>

                    {errorForm && (
                        <p role="alert" className="modal-alert-error flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0" /> {errorForm}
                        </p>
                    )}

                    <div className="flex justify-end pt-1">
                        <Button type="button" variant={editandoClave != null ? 'default' : 'soft'} className="w-full gap-2 sm:w-auto" onClick={agregarOActualizar}>
                            {editandoClave != null ? (
                                <><Check className="h-4 w-4" /> Guardar cambios</>
                            ) : (
                                <><Plus className="h-4 w-4" /> Agregar al listado</>
                            )}
                        </Button>
                    </div>
                </section>
            </div>

            {/* ── Columna derecha: Listado a dispersar ── */}
            <div className="nu-card flex flex-col overflow-hidden lg:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3.5">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-bold text-foreground">
                            Listado a dispersar ({filas.length})
                        </h2>
                    </div>
                    {egreso && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary">
                            <Hash className="h-3 w-3" />
                            {egreso.desembolso_docto}
                        </span>
                    )}
                </div>

                {/* Franja de saldo del egreso */}
                {egreso && (
                    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5 text-xs">
                        <span className="rounded-full bg-[var(--nu-fill)] px-3 py-1 text-muted-foreground">
                            Disponible: <strong className="font-mono text-foreground">{formatters.currency(egreso.disponible)}</strong>
                        </span>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                            A dispersar: <strong className="font-mono">{formatters.currency(total)}</strong>
                        </span>
                        <span
                            className={cn(
                                'rounded-full px-3 py-1',
                                restante < 0
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            )}
                        >
                            Queda: <strong className="font-mono">{formatters.currency(restante)}</strong>
                        </span>
                    </div>
                )}

                <div className="overflow-x-auto">
                    {filas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nu-fill)] text-muted-foreground">
                                <Truck className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">Sin conductores en el listado</p>
                            <p className="max-w-xs text-xs text-muted-foreground">
                                Completa los datos del conductor en el formulario de la izquierda y haz clic en <strong>Agregar al listado</strong>.
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="whitespace-nowrap bg-muted px-4 py-3 text-left text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">Conductor</th>
                                    <th className="whitespace-nowrap bg-muted px-4 py-3 text-left text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">Tramo</th>
                                    <th className="whitespace-nowrap bg-muted px-4 py-3 text-left text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">Fechas</th>
                                    <th className="whitespace-nowrap bg-muted px-4 py-3 text-right text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">Valor</th>
                                    <th className="w-20 bg-muted px-3 py-3 shadow-[inset_0_-1px_0_hsl(var(--border))]" />
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map((f) => {
                                    const cond = cat.conductores.find((c) => String(c.id) === f.conductorId)
                                    const veh = cat.vehiculos.find((v) => String(v.id) === f.vehiculoId)
                                    const tramo = cat.tramos.find((t) => String(t.id) === f.tramoId)
                                    const tipo = cat.tipos.find((t) => String(t.id) === f.tipoTramoId)
                                    const editando = editandoClave === f.clave
                                    return (
                                        <tr
                                            key={f.clave}
                                            className={cn(
                                                'border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30',
                                                editando && 'bg-primary/5'
                                            )}
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-foreground">{cond?.nombre ?? '—'}</p>
                                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                                    {veh && <span className="detail-badge detail-badge--mono">{veh.placa}</span>}
                                                    {cond?.tiene_tercero_siesa === false && (
                                                        <span className="detail-badge detail-badge--warning">Sin tercero SIESA</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-foreground">{tramo?.nombre ?? '—'}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {[tipo?.nombre, f.toneladas ? `${f.toneladas} t` : null].filter(Boolean).join(' · ') || '—'}
                                                </p>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 font-mono text-muted-foreground">
                                                <p>{f.salida}</p>
                                                {f.llegada && <p className="text-[10px]">→ {f.llegada}</p>}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold tabular-nums text-foreground">
                                                {formatters.currency(Number(f.valor) || 0)}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-3 text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        className="detail-icon-btn"
                                                        title="Editar"
                                                        onClick={() => iniciarEdicion(f)}
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="detail-icon-btn detail-icon-btn--danger"
                                                        title="Quitar del listado"
                                                        onClick={() => quitarFila(f.clave)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pie con error y botón Dispersar */}
                <div className="space-y-3 border-t bg-card px-4 py-3.5">
                    {error && (
                        <p role="alert" className="modal-alert-error flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                            Total a dispersar:{' '}
                            <strong className={cn('font-mono text-sm', restante < 0 ? 'text-destructive' : 'text-primary')}>
                                {formatters.currency(total)}
                            </strong>
                        </div>
                        <Button
                            type="button"
                            className="nu-btn nu-btn-primary gap-2"
                            onClick={() => void dispersar()}
                            disabled={enviando || !egreso || filas.length === 0 || restante < 0}
                        >
                            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Dispersar {filas.length > 0 ? `(${filas.length})` : ''}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
