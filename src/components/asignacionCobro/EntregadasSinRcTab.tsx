import { useEffect, useMemo, useState } from 'react'
import { Camera, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Cargando } from '@/components/ui/cargando'
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

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase()
        return filas.filter((f) => {
            if (soloPorCobrar && f.pagada === true) return false
            if (!q) return true
            return [nombreFactura(f), f.cliente_nombre, f.cliente_nit, f.conductor_nombre, f.receptor_nombre]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
        })
    }, [filas, busqueda, soloPorCobrar])

    const totalPorCobrar = useMemo(() => visibles.reduce((s, f) => s + (f.saldo ?? f.valor), 0), [visibles])

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
        <div className="nu-card">
            <div className="flex flex-wrap items-end gap-3 border-b px-4 py-3">
                <div className="mr-auto">
                    <h2 className="text-base font-semibold">Entregadas sin recibo de caja</h2>
                    <p className="text-xs text-muted-foreground">
                        Facturas a crédito que el conductor ya entregó. Cartera las cobra después.
                    </p>
                </div>
                <label className="flex flex-col text-xs text-muted-foreground">
                    Desde
                    <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-9" />
                </label>
                <label className="flex flex-col text-xs text-muted-foreground">
                    Hasta
                    <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-9" />
                </label>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Factura, cliente, conductor…"
                        className="h-9 w-64 pl-8"
                    />
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4" checked={soloPorCobrar} onChange={(e) => setSoloPorCobrar(e.target.checked)} />
                    Solo por cobrar
                </label>
                <Button variant="ghost" size="icon" className="nu-btn nu-btn-soft h-9 w-9" title="Actualizar" onClick={cargar}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            {cargando ? (
                <Cargando texto="Cargando entregas" />
            ) : error ? (
                <p className="p-6 text-sm text-destructive">{error}</p>
            ) : visibles.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                    {filas.length ? 'Ninguna entrega con esos filtros.' : 'No hay facturas entregadas sin recibo en este periodo (por defecto, últimos 30 días).'}
                </p>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="px-3 py-2 text-left nu-th">Factura</th>
                                    <th className="px-3 py-2 text-left nu-th">Cliente</th>
                                    <th className="px-3 py-2 text-left nu-th">Conductor</th>
                                    <th className="px-3 py-2 text-left nu-th">Recibió</th>
                                    <th className="px-3 py-2 text-left nu-th">Entregada</th>
                                    <th className="px-3 py-2 text-right nu-th">Valor</th>
                                    <th className="px-3 py-2 text-right nu-th">Saldo hoy</th>
                                    <th className="w-12 px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibles.map((f) => (
                                    <tr key={f.id} className="border-b hover:bg-muted/30">
                                        <td className="px-3 py-2 font-mono text-xs">{nombreFactura(f)}</td>
                                        <td className="px-3 py-2">
                                            <div>{f.cliente_nombre ?? `Cliente #${f.rowid_tercero}`}</div>
                                            {f.cliente_nit && <div className="text-xs text-muted-foreground">{f.cliente_nit}</div>}
                                        </td>
                                        <td className="px-3 py-2">{f.conductor_nombre ?? '—'}</td>
                                        <td className="px-3 py-2">
                                            <div>{f.receptor_nombre ?? '—'}</div>
                                            {f.nota && <div className="max-w-56 truncate text-xs text-muted-foreground" title={f.nota}>{f.nota}</div>}
                                        </td>
                                        <td className="px-3 py-2 text-xs">{fechaHora(f.entrega_at)}</td>
                                        <td className="px-3 py-2 text-right">{moneda(f.valor)}</td>
                                        <td className="px-3 py-2 text-right">
                                            {f.pagada === true ? (
                                                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Pagada</span>
                                            ) : f.saldo != null ? (
                                                moneda(f.saldo)
                                            ) : (
                                                <span className="text-xs text-muted-foreground">sin dato</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {f.fotos.length > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="nu-btn nu-btn-soft h-8 w-8"
                                                    title={`Ver ${f.fotos.length} foto(s)`}
                                                    onClick={() => verFotos(f)}
                                                >
                                                    <Camera className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between border-t px-4 py-3 text-sm">
                        <span className="text-muted-foreground">{visibles.length} factura(s)</span>
                        <span className="font-semibold">Por cobrar: {moneda(totalPorCobrar)}</span>
                    </div>
                </>
            )}

            <Modal
                isOpen={fotosDe !== null}
                onClose={cerrarFotos}
                title={fotosDe ? `Entrega de ${nombreFactura(fotosDe)} · recibió ${fotosDe.receptor_nombre ?? '—'}` : ''}
            >
                <div className="max-h-[80vh] overflow-auto p-4">
                    {cargandoFotos ? (
                        <Cargando texto="Cargando fotos" compacto />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {urls.map((u, i) => (
                                <a key={u} href={u} target="_blank" rel="noreferrer">
                                    <img src={u} alt={`Foto ${i + 1} de la entrega`} className="w-full rounded border object-contain" />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}
