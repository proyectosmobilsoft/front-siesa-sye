import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Eye, Loader2, RefreshCw, Search, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { apiClient } from '@/api/client'
import { UsuarioMaster } from '@/api/seguridad'
import { asignacionCobroApi } from '@/api/asignacionCobro'
import { useAuthStore } from '@/store/authStore'
import {
    FacturaPendiente,
    coincideBusquedaFactura,
    formatearFacturaPendiente,
    formatearFecha,
    normalizarFactura,
} from './facturaPendiente'

interface Props {
    conductores: UsuarioMaster[]
    onAsignado: () => void
}

interface GrupoCliente {
    idtercero: number
    nombre: string
    nit: string | null
    facturas: FacturaPendiente[]
    total: number
}

const moneda = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const tiempo = (f: string | null) => (f ? Date.parse(f.replace(' ', 'T')) || 0 : 0)

export const FacturasPendientesTab = ({ conductores, onAsignado }: Props) => {
    const centroOperacionActivo = useAuthStore((s) => s.centroOperacionActivo)

    const [facturas, setFacturas] = useState<FacturaPendiente[]>([])
    const [cargando, setCargando] = useState(false)
    const [busqueda, setBusqueda] = useState('')
    const [abiertos, setAbiertos] = useState<Set<number>>(new Set())
    const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set())
    const [facturaDetalle, setFacturaDetalle] = useState<FacturaPendiente | null>(null)

    const [conductorId, setConductorId] = useState('')
    const [observacion, setObservacion] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)

    const cargar = async () => {
        try {
            setCargando(true)
            setError(null)
            const [res, yaAsignadas] = await Promise.all([
                apiClient.get<{ success: boolean; data: Record<string, unknown>[] }>('/factura/facturas', { params: { todas: 1 } }),
                asignacionCobroApi.facturasYaAsignadas().catch(() => []),
            ])
            const asignados = new Set(yaAsignadas.map((f) => f.rowid_factura))
            setFacturas(
                (res.data.data || [])
                    .map(normalizarFactura)
                    .filter((f): f is FacturaPendiente => f !== null && !asignados.has(f.rowid_sa))
            )
            setSeleccionadas(new Set())
        } catch (err) {
            console.error('Error cargando facturas pendientes:', err)
            setError('No se pudieron cargar las facturas pendientes')
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => {
        cargar()
    }, [])

    // Agrupa por cliente: facturas más recientes primero, y clientes por su factura más reciente.
    const grupos = useMemo<GrupoCliente[]>(() => {
        const mapa = new Map<number, GrupoCliente>()
        for (const f of facturas) {
            if (f.idtercero == null || !coincideBusquedaFactura(f, busqueda)) continue
            let g = mapa.get(f.idtercero)
            if (!g) {
                g = { idtercero: f.idtercero, nombre: f.razon || `Tercero #${f.idtercero}`, nit: f.nit, facturas: [], total: 0 }
                mapa.set(f.idtercero, g)
            }
            g.facturas.push(f)
            g.total += f.valor || 0
        }
        const lista = [...mapa.values()]
        lista.forEach((g) => g.facturas.sort((a, b) => tiempo(b.fecha) - tiempo(a.fecha)))
        lista.sort((a, b) => tiempo(b.facturas[0].fecha) - tiempo(a.facturas[0].fecha))
        return lista
    }, [facturas, busqueda])

    const buscando = busqueda.trim().length > 0
    const estaAbierto = (id: number) => buscando || abiertos.has(id)

    const toggleAbierto = (id: number) =>
        setAbiertos((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })

    const toggleFactura = (rowid: number) =>
        setSeleccionadas((prev) => {
            const next = new Set(prev)
            if (next.has(rowid)) next.delete(rowid)
            else next.add(rowid)
            return next
        })

    const toggleGrupo = (g: GrupoCliente) =>
        setSeleccionadas((prev) => {
            const next = new Set(prev)
            const todas = g.facturas.every((f) => next.has(f.rowid_sa))
            g.facturas.forEach((f) => (todas ? next.delete(f.rowid_sa) : next.add(f.rowid_sa)))
            return next
        })

    const { totalSeleccionado, clientesSeleccionados } = useMemo(() => {
        const sel = facturas.filter((f) => seleccionadas.has(f.rowid_sa))
        return {
            totalSeleccionado: sel.reduce((acc, f) => acc + (f.valor || 0), 0),
            clientesSeleccionados: new Set(sel.map((f) => f.idtercero)).size,
        }
    }, [facturas, seleccionadas])

    const handleAsignar = async () => {
        if (!conductorId || seleccionadas.size === 0) return
        try {
            setEnviando(true)
            setError(null)
            setExito(null)
            // El backend asigna por cliente: una asignación por cada cliente seleccionado.
            const porCliente = new Map<number, FacturaPendiente[]>()
            facturas
                .filter((f) => seleccionadas.has(f.rowid_sa) && f.idtercero != null)
                .forEach((f) => porCliente.set(f.idtercero!, [...(porCliente.get(f.idtercero!) ?? []), f]))

            let asignadas = 0
            for (const [rowidTercero, lista] of porCliente) {
                await asignacionCobroApi.crear({
                    id_co: centroOperacionActivo || '001',
                    rowid_tercero: rowidTercero,
                    conductor_id: Number(conductorId),
                    observacion: observacion.trim() || undefined,
                    facturas: lista.map((f) => {
                        const n = f.numero != null ? Number(f.numero) : NaN
                        return {
                            rowid_factura: f.rowid_sa,
                            numero_factura: Number.isFinite(n) ? n : undefined,
                            prefijo_docto: f.prefijo ?? undefined,
                            valor: f.valor,
                        }
                    }),
                })
                asignadas += lista.length
            }
            setExito(`${asignadas} factura(s) de ${porCliente.size} cliente(s) asignada(s) correctamente`)
            setObservacion('')
            onAsignado()
            await cargar()
        } catch (err: any) {
            console.error('Error asignando facturas:', err)
            setError(err?.response?.data?.message || 'Error al asignar las facturas')
            // Algunas asignaciones pueden haberse creado antes del fallo: refrescar para no reofrecerlas.
            cargar()
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className="nu flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[260px] flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por número de factura (ej. BQE-31742), cliente o NIT..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="nu-control pl-10"
                        autoComplete="off"
                    />
                </div>
                <Button variant="ghost" size="icon" className="nu-btn nu-btn-soft" onClick={cargar} disabled={cargando} title="Recargar">
                    <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="nu-card lg:col-span-2">
                    <div className="border-b px-4 py-3 text-sm font-semibold">
                        Facturas pendientes por cobrar
                        {!cargando && (
                            <span className="ml-2 font-normal text-muted-foreground">
                                {grupos.length} cliente(s) · {grupos.reduce((a, g) => a + g.facturas.length, 0)} factura(s)
                            </span>
                        )}
                    </div>
                    {cargando ? (
                        <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" /> Cargando facturas...
                        </div>
                    ) : grupos.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">No hay facturas pendientes que coincidan.</div>
                    ) : (
                        <div className="max-h-[560px] overflow-auto">
                            {grupos.map((g) => {
                                const abierto = estaAbierto(g.idtercero)
                                const nSel = g.facturas.filter((f) => seleccionadas.has(f.rowid_sa)).length
                                return (
                                    <div key={g.idtercero} className="border-b last:border-b-0">
                                        <div className="flex items-center gap-3 bg-[var(--nu-fill)] px-4 py-2.5">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={nSel === g.facturas.length}
                                                ref={(el) => {
                                                    if (el) el.indeterminate = nSel > 0 && nSel < g.facturas.length
                                                }}
                                                onChange={() => toggleGrupo(g)}
                                                title="Seleccionar todas las facturas del cliente"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => toggleAbierto(g.idtercero)}
                                                className="flex flex-1 items-center gap-2 text-left"
                                            >
                                                {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                <span>
                                                    <span className="block text-sm font-semibold">{g.nombre}</span>
                                                    <span className="block font-mono text-xs text-muted-foreground">{g.nit}</span>
                                                </span>
                                            </button>
                                            <span className="text-xs text-muted-foreground">{g.facturas.length} fact.</span>
                                            <span className="w-28 text-right text-sm font-semibold">{moneda(g.total)}</span>
                                        </div>
                                        {abierto && (
                                            <table className="w-full text-sm">
                                                <tbody>
                                                    {g.facturas.map((f) => (
                                                        <tr key={f.rowid_sa} className="border-t hover:bg-muted/30">
                                                            <td className="w-10 px-3 py-2 pl-6">
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-4 w-4"
                                                                    checked={seleccionadas.has(f.rowid_sa)}
                                                                    onChange={() => toggleFactura(f.rowid_sa)}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 font-mono text-xs">{formatearFacturaPendiente(f)}</td>
                                                            <td className="px-3 py-2 font-mono text-xs">{f.idco ?? '—'}</td>
                                                            <td className="px-3 py-2 text-xs">{formatearFecha(f.fecha)}</td>
                                                            <td className="px-3 py-2 text-xs">{formatearFecha(f.vence)}</td>
                                                            <td className="px-3 py-2 text-right">{moneda(f.valor)}</td>
                                                            <td className="w-10 px-3 py-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="nu-btn nu-btn-soft h-8 w-8"
                                                                    title="Ver detalle"
                                                                    onClick={() => setFacturaDetalle(f)}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 self-start nu-card p-5">
                    <div className="rounded-xl bg-[var(--nu-fill)] px-3 py-2 text-sm">
                        <div className="font-semibold">{seleccionadas.size} factura(s) seleccionada(s)</div>
                        <div className="text-xs text-muted-foreground">
                            {clientesSeleccionados} cliente(s) · {moneda(totalSeleccionado)}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="nu-label">Conductor</label>
                        <Select className="nu-control" value={conductorId} onChange={(e) => setConductorId(e.target.value)}>
                            <option value="">Seleccionar conductor...</option>
                            {conductores.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre_completo || c.usuario}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="nu-label">Observación <span className="nu-opcional">opcional</span></label>
                        <Input className="nu-control" value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej: ruta zona norte" autoComplete="off" />
                    </div>

                    {error && <div className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
                    {exito && <div className="rounded-xl bg-green-500/10 px-3 py-2 text-sm text-green-700">{exito}</div>}

                    <Button className="nu-btn nu-btn-primary" onClick={handleAsignar} disabled={enviando || !conductorId || seleccionadas.size === 0}>
                        {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Asignar
                    </Button>
                </div>
            </div>

            <Modal
                isOpen={!!facturaDetalle}
                onClose={() => setFacturaDetalle(null)}
                title={facturaDetalle ? `Factura ${formatearFacturaPendiente(facturaDetalle)}` : ''}
                className="nu max-w-lg !rounded-3xl"
            >
                {facturaDetalle && (
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">Cliente</dt>
                        <dd>{facturaDetalle.razon}</dd>
                        <dt className="text-muted-foreground">NIT</dt>
                        <dd className="font-mono">{facturaDetalle.nit ?? '—'}</dd>
                        <dt className="text-muted-foreground">C.O.</dt>
                        <dd className="font-mono">{facturaDetalle.idco ?? '—'}</dd>
                        <dt className="text-muted-foreground">Fecha de emisión</dt>
                        <dd>{formatearFecha(facturaDetalle.fecha)}</dd>
                        <dt className="text-muted-foreground">Fecha de vencimiento</dt>
                        <dd>{formatearFecha(facturaDetalle.vence)}</dd>
                        <dt className="text-muted-foreground">Saldo</dt>
                        <dd className="font-semibold">{moneda(facturaDetalle.valor)}</dd>
                    </dl>
                )}
            </Modal>
        </div>
    )
}
