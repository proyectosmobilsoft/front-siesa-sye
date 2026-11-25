import { useEffect, useMemo, useState } from 'react'
import { Camera, Hash, PackageCheck, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FechaInput } from '@/components/ui/fecha-input'
import { Modal } from '@/components/ui/modal'
import { Cargando } from '@/components/ui/cargando'
import { BotonExcel } from '@/components/ui/boton-excel'
import { cn } from '@/lib/utils'
import { asignacionCobroApi, EntregadaSinRc } from '@/api/asignacionCobro'

const moneda = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fechaHora = (iso: string) =>
    new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
const nombreFactura = (f: EntregadaSinRc) => `${f.prefijo_docto?.trim() ?? ''}-${f.numero_factura ?? f.rowid_factura}`

/**
 * Facturas a crédito que el conductor entregó sin hacer recibo de caja. Ya no están en el tablero de
 * asignación, pero cartera tiene que cobrarlas: aquí se ve quién recibió, cuándo, las fotos y el saldo vigente.
 */
export const EntregadasSinRcTab = () => {
    const [filas, setFilas] = useState<EntregadaSinRc[]>([])
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [desde, setDesde] = useState('')
    const [hasta, setHasta] = useState('')
    const [busqueda, setBusqueda] = useState('')
    const [soloPorCobrar, setSoloPorCobrar] = useState(true)
    const [fotosDe, setFotosDe] = useState<EntregadaSinRc | null>(null)
    const [urls, setUrls] = useState<string[]>([])
    const [cargandoFotos, setCargandoFotos] = useState(false)

    const cargar = () => {
        setCargando(true)
        setError(null)
        asignacionCobroApi
            .entregadasSinRc({ desde, hasta })
            .then(setFilas)
            .catch(() => setError('No se pudieron cargar las entregas.'))
            .finally(() => setCargando(false))
    }

    useEffect(() => {
        cargar()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [desde, hasta])

    const conteoPorCobrar = useMemo(() => filas.filter((f) => f.pagada !== true).length, [filas])
    const conteoPagadas = useMemo(() => filas.filter((f) => f.pagada === true).length, [filas])

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase()
        return filas.filter((f) => {
            if (soloPorCobrar && f.pagada === true) return false
            if (!q) return true
            return [nombreFactura(f), f.cliente_nombre, f.cliente_nit, f.conductor_nombre, f.receptor_nombre, f.nota]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
        })
    }, [filas, busqueda, soloPorCobrar])

    const totalValor = useMemo(() => visibles.reduce((s, f) => s + f.valor, 0), [visibles])
    const totalPorCobrar = useMemo(
        () => visibles.reduce((s, f) => s + (f.pagada === true ? 0 : (f.saldo ?? f.valor)), 0),
        [visibles]
    )

    const verFotos = async (fila: EntregadaSinRc) => {
        setFotosDe(fila)
        setUrls([])
        setCargandoFotos(true)
        try {
            setUrls(await Promise.all(fila.fotos.map((id) => asignacionCobroApi.fotoEntrega(id))))
        } finally {
            setCargandoFotos(false)
        }
    }

    const cerrarFotos = () => {
        urls.forEach((u) => URL.revokeObjectURL(u))
        setUrls([])
        setFotosDe(null)
    }

    return (
        <div className="space-y-4">
            {/* Cabecera y barra de filtros estilo Recibos / Egreso */}
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex shrink-0 items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">
                        Entregadas sin recibo de caja ({visibles.length})
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        <div className="w-36 shrink-0">
                            <FechaInput value={desde} onChange={setDesde} max={hasta || undefined} className="text-xs" />
                        </div>
                        <span className="text-xs text-muted-foreground">a</span>
                        <div className="w-36 shrink-0">
                            <FechaInput value={hasta} onChange={setHasta} min={desde || undefined} className="text-xs" />
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Factura, cliente, conductor..."
                            className="nu-control nu-control-sm w-52 pl-10 text-xs"
                            autoComplete="off"
                        />
                    </div>

                    <div className="filter-pills" role="tablist" aria-label="Filtrar por estado de cobro">
                        <button
                            type="button"
                            className={`filter-pill${soloPorCobrar ? ' is-active' : ''}`}
                            onClick={() => setSoloPorCobrar(true)}
                        >
                            Por cobrar ({conteoPorCobrar})
                        </button>
                        <button
                            type="button"
                            className={`filter-pill${!soloPorCobrar ? ' is-active' : ''}`}
                            onClick={() => setSoloPorCobrar(false)}
                        >
                            Todas ({filas.length})
                        </button>
                    </div>

                    <BotonExcel nombre="entregadas_sin_rc" />
                    <Button variant="soft" size="icon" title="Actualizar" onClick={cargar} disabled={cargando}>
                        <RefreshCw className={cn('h-4 w-4', cargando && 'animate-spin')} />
                    </Button>
                </div>
            </div>

            {/* Franja de totales */}
            {!cargando && !error && filas.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-[var(--nu-fill)] px-3 py-1 text-muted-foreground">
                        Facturas: <strong className="font-mono text-foreground">{visibles.length}</strong>
                    </span>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                        Por cobrar: <strong className="font-mono">{moneda(totalPorCobrar)}</strong>
                    </span>
                    <span className="rounded-full bg-[var(--nu-fill)] px-3 py-1 text-muted-foreground">
                        Valor facturado: <strong className="font-mono text-foreground">{moneda(totalValor)}</strong>
                    </span>
                    {conteoPagadas > 0 && (
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-400">
                            Pagadas: <strong className="font-mono">{conteoPagadas}</strong>
                        </span>
                    )}
                </div>
            )}

            <div className="nu-card overflow-hidden">
            {cargando ? (
                <Cargando texto="Cargando entregas" />
            ) : error ? (
                <div className="p-4">
                    <div className="modal-alert-error">{error}</div>
                </div>
            ) : visibles.length === 0 ? (
                <div className="py-14 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {filas.length
                        ? 'Ninguna entrega coincide con los filtros seleccionados'
                        : 'No hay facturas entregadas sin recibo en este periodo (últimos 30 días)'}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="whitespace-nowrap bg-muted px-4 py-3 text-left text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">Factura</th>
                                <th className="whitespace-nowrap bg-muted px-4 py-3 text-left text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">Cliente</th>
                                <th className="whitespace-nowrap bg-muted px-4 py-3 text-left text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">Conductor</th>
                                <th className="whitespace-nowrap bg-muted px-4 py-3 text-left text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">Recibió</th>
                                <th className="whitespace-nowrap bg-muted px-4 py-3 text-left text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">Entregada</th>
                                <th className="whitespace-nowrap bg-muted px-4 py-3 text-center text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">Estado</th>
                                <th className="whitespace-nowrap bg-muted px-4 py-3 text-right text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">Valor</th>
                                <th className="whitespace-nowrap bg-muted px-4 py-3 text-right text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">Saldo hoy</th>
                                <th className="whitespace-nowrap bg-muted px-4 py-3 text-right text-[10px] nu-th shadow-[inset_0_-1px_0_hsl(var(--border))]">Evidencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((f) => {
                                const pagada = f.pagada === true
                                return (
                                    <tr key={f.id} className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-primary">
                                            <span className="flex items-center gap-1">
                                                <Hash className="h-3 w-3" />
                                                {nombreFactura(f)}
                                            </span>
                                            {f.id_co && (
                                                <p className="font-mono text-[10px] font-normal text-muted-foreground">
                                                    C.O. {f.id_co.trim()}
                                                </p>
                                            )}
                                        </td>
                                        <td className="max-w-[240px] px-4 py-3">
                                            <p className="truncate font-semibold text-foreground">
                                                {f.cliente_nombre ?? `Cliente #${f.rowid_tercero}`}
                                            </p>
                                            {f.cliente_nit && (
                                                <p className="font-mono text-[10px] text-muted-foreground">{f.cliente_nit}</p>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                                            {f.conductor_nombre ?? '—'}
                                        </td>
                                        <td className="max-w-[200px] px-4 py-3">
                                            <p className="truncate font-medium text-foreground">{f.receptor_nombre ?? '—'}</p>
                                            {f.nota && (
                                                <p className="truncate text-[10px] italic text-muted-foreground" title={f.nota}>
                                                    {f.nota}
                                                </p>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-muted-foreground">
                                            {fechaHora(f.entrega_at)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            {pagada ? (
                                                <span className="detail-badge detail-badge--success">Pagada</span>
                                            ) : (
                                                <span className="detail-badge detail-badge--warning">Por cobrar</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                            {moneda(f.valor)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums">
                                            {pagada ? (
                                                <span className="text-muted-foreground">$ 0</span>
                                            ) : f.saldo != null ? (
                                                <span className="text-foreground">{moneda(f.saldo)}</span>
                                            ) : (
                                                <span className="font-sans text-[11px] font-normal text-muted-foreground">Sin dato</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            {f.fotos.length > 0 ? (
                                                <Button
                                                    variant="soft"
                                                    size="sm"
                                                    className="h-8 gap-1.5 px-2.5 text-xs"
                                                    title={`Ver ${f.fotos.length} foto(s) de evidencia`}
                                                    onClick={() => verFotos(f)}
                                                >
                                                    <Camera className="h-3.5 w-3.5 text-primary" />
                                                    <span className="font-mono">{f.fotos.length}</span>
                                                </Button>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            </div>

            <Modal
                isOpen={fotosDe !== null}
                onClose={cerrarFotos}
                title={fotosDe ? `Evidencia — ${nombreFactura(fotosDe)}` : ''}
                subtitle={
                    fotosDe
                        ? `${fotosDe.cliente_nombre ?? `Cliente #${fotosDe.rowid_tercero}`} · Recibió: ${fotosDe.receptor_nombre ?? '—'} · ${fechaHora(fotosDe.entrega_at)}`
                        : undefined
                }
                className="modal-lg"
            >
                <div className="modal-stack">
                    {fotosDe?.nota && (
                        <div className="modal-summary-footer">
                            <span>
                                Nota de entrega: <strong>{fotosDe.nota}</strong>
                            </span>
                        </div>
                    )}
                    {cargandoFotos ? (
                        <Cargando texto="Cargando fotos" compacto />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {urls.map((u, i) => (
                                <a
                                    key={u}
                                    href={u}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group overflow-hidden rounded-xl border border-border bg-[var(--nu-fill)] transition-colors hover:border-primary/40"
                                    title="Abrir imagen en tamaño completo"
                                >
                                    <img
                                        src={u}
                                        alt={`Foto ${i + 1} de la entrega`}
                                        className="max-h-[420px] w-full object-contain"
                                    />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}
