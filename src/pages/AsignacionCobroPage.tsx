import { motion } from 'framer-motion'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, Loader2, Send, RefreshCw, Users, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/api/client'
import { Client, ClientsResponse } from '@/api/types'
import { seguridadApi, UsuarioMaster } from '@/api/seguridad'
import { asignacionCobroApi, TableroConductorRow } from '@/api/asignacionCobro'
import { useAuthStore } from '@/store/authStore'
import { usePermiso } from '@/hooks/usePermiso'
import { DetalleFacturasAsignadasModal } from '@/components/asignacionCobro/DetalleFacturasAsignadasModal'

// Campos confirmados contra el SP real (sp_cons_est_cta_saldo_doct), viendo el
// mapeo que ya hace flutter-siesa (FacturaModel.fromJson): rowidsa, saldo
// (a veces string con coma decimal), doccruce ("BQE-00026024-000" → número
// de factura en la parte del medio).
interface FacturaPendiente {
    rowid_sa: number
    numero: string | null
    prefijo: string | null
    valor: number
    raw: Record<string, unknown>
}

/** "BQE-00026024", o solo el número si no hay prefijo, o SA-<rowid> si no hay nada. */
function formatearFacturaPendiente(f: FacturaPendiente): string {
    if (f.prefijo && f.numero) return `${f.prefijo}-${f.numero}`
    if (f.numero) return f.numero
    return `SA-${f.rowid_sa}`
}

function primerValor<T = unknown>(row: Record<string, unknown>, claves: string[]): T | undefined {
    for (const k of claves) {
        if (row[k] !== undefined && row[k] !== null) return row[k] as T
    }
    return undefined
}

/** Soporta tanto número plano como string con coma decimal ("10000,00"). */
function parseValor(valor: unknown): number {
    if (valor == null) return 0
    if (typeof valor === 'number') return valor
    const limpio = String(valor).trim().replace(',', '.')
    const n = Number(limpio)
    return Number.isFinite(n) ? n : 0
}

function normalizarFactura(row: Record<string, unknown>): FacturaPendiente | null {
    const rowidSa = primerValor<number>(row, ['rowidsa', 'rowid_sa', 'RowIdSa', 'RowidSA'])
    if (rowidSa == null) return null

    const doccruce = primerValor<string>(row, ['doccruce'])
    let numero: string | null = null
    let prefijo: string | null = null
    if (doccruce) {
        const partes = doccruce.split('-')
        if (partes.length >= 2) {
            prefijo = partes[0]
            numero = partes[1]
        } else {
            numero = doccruce
        }
    }
    if (!numero) {
        const fallback = primerValor<number | string>(row, ['numero', 'consecutivo', 'nro_docto', 'numero_docto', 'Numero'])
        numero = fallback != null ? String(fallback) : null
    }
    if (!prefijo) {
        const fallbackPrefijo = primerValor<string>(row, ['tipo', 'idTipoDocto', 'prefijo', 'Tipo'])
        prefijo = fallbackPrefijo ?? null
    }

    const valorRaw = primerValor(row, ['saldo', 'valor', 'vlr_saldo', 'valor_saldo', 'Valor', 'Saldo'])
    return { rowid_sa: Number(rowidSa), numero, prefijo, valor: parseValor(valorRaw), raw: row }
}

export const AsignacionCobroPage = () => {
    const { puede, P } = usePermiso()
    const puedeAsignar = puede(P.ASIGNACION_COBRO)
    const puedeVerTablero = puede(P.TABLERO_COBROS)
    const centroOperacionActivo = useAuthStore((s) => s.centroOperacionActivo)

    // Tablero: conductores programados (asignados) y su avance
    const [tablero, setTablero] = useState<TableroConductorRow[]>([])
    const [detalleConductor, setDetalleConductor] = useState<{ id: number; nombre: string } | null>(null)
    const [reconciliando, setReconciliando] = useState(false)
    const [mensajeReconciliar, setMensajeReconciliar] = useState<string | null>(null)

    const handleReconciliar = async () => {
        try {
            setReconciliando(true)
            setMensajeReconciliar(null)
            const { verificadas, canceladas } = await asignacionCobroApi.reconciliar()
            setMensajeReconciliar(
                canceladas > 0
                    ? `${canceladas} de ${verificadas} facturas se cancelaron (ya no figuran abiertas en SIESA)`
                    : `Verificadas ${verificadas} facturas, todas siguen vigentes`
            )
            cargarTablero()
        } catch (err: any) {
            setMensajeReconciliar(err?.response?.data?.message || 'No se pudo verificar contra SIESA (¿VPN caída?)')
        } finally {
            setReconciliando(false)
        }
    }
    const [cargandoTablero, setCargandoTablero] = useState(false)

    const cargarTablero = () => {
        if (!puedeVerTablero) return
        setCargandoTablero(true)
        asignacionCobroApi
            .tablero()
            .then(setTablero)
            .catch((err) => console.error('Error cargando tablero de cobros:', err))
            .finally(() => setCargandoTablero(false))
    }

    useEffect(() => {
        cargarTablero()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Búsqueda de cliente
    const [busquedaCliente, setBusquedaCliente] = useState('')
    const [clientes, setClientes] = useState<Client[]>([])
    const [buscandoClientes, setBuscandoClientes] = useState(false)
    const [clienteSeleccionado, setClienteSeleccionado] = useState<Client | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Facturas pendientes del cliente
    const [facturas, setFacturas] = useState<FacturaPendiente[]>([])
    const [cargandoFacturas, setCargandoFacturas] = useState(false)
    const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set())

    // Conductores
    const [conductores, setConductores] = useState<UsuarioMaster[]>([])
    const [conductorId, setConductorId] = useState<string>('')
    const [observacion, setObservacion] = useState('')

    const [enviando, setEnviando] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)

    useEffect(() => {
        seguridadApi.listarConductores().then((r) => setConductores(r.data)).catch(() => setConductores([]))
    }, [])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (!busquedaCliente.trim()) {
            setClientes([])
            return
        }
        debounceRef.current = setTimeout(async () => {
            try {
                setBuscandoClientes(true)
                const res = await apiClient.get<ClientsResponse>('/clients', { params: { search: busquedaCliente, pageSize: 20 } })
                setClientes(res.data.data || [])
            } catch (err) {
                console.error('Error buscando clientes:', err)
                setClientes([])
            } finally {
                setBuscandoClientes(false)
            }
        }, 400)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [busquedaCliente])

    const cargarFacturas = async (cliente: Client) => {
        try {
            setCargandoFacturas(true)
            setFacturas([])
            setSeleccionadas(new Set())
            const [res, yaAsignadas] = await Promise.all([
                apiClient.get<{ success: boolean; data: Record<string, unknown>[] }>('/factura/facturas', {
                    params: { id_tercero: cliente.f9740_id },
                }),
                asignacionCobroApi.facturasYaAsignadas().catch(() => []),
            ])
            const rowidsAsignados = new Set(yaAsignadas.map((f) => f.rowid_factura))
            const normalizadas = (res.data.data || [])
                .map(normalizarFactura)
                .filter((f): f is FacturaPendiente => f !== null)
                .filter((f) => !rowidsAsignados.has(f.rowid_sa))
            setFacturas(normalizadas)
        } catch (err) {
            console.error('Error cargando facturas del cliente:', err)
            setError('No se pudieron cargar las facturas del cliente')
        } finally {
            setCargandoFacturas(false)
        }
    }

    const handleSeleccionarCliente = (cliente: Client) => {
        setClienteSeleccionado(cliente)
        setBusquedaCliente(cliente.f9740_razon_social)
        setClientes([])
        setExito(null)
        setError(null)
        cargarFacturas(cliente)
    }

    const toggleFactura = (rowidSa: number) => {
        setSeleccionadas((prev) => {
            const next = new Set(prev)
            if (next.has(rowidSa)) next.delete(rowidSa)
            else next.add(rowidSa)
            return next
        })
    }

    const totalSeleccionado = useMemo(
        () => facturas.filter((f) => seleccionadas.has(f.rowid_sa)).reduce((acc, f) => acc + (f.valor || 0), 0),
        [facturas, seleccionadas]
    )

    const handleAsignar = async () => {
        if (!clienteSeleccionado || !conductorId || seleccionadas.size === 0) return
        try {
            setEnviando(true)
            setError(null)
            const facturasPayload = facturas
                .filter((f) => seleccionadas.has(f.rowid_sa))
                .map((f) => {
                    const numeroFactura = f.numero != null ? Number(f.numero) : NaN
                    return {
                        rowid_factura: f.rowid_sa,
                        numero_factura: Number.isFinite(numeroFactura) ? numeroFactura : undefined,
                        prefijo_docto: f.prefijo ?? undefined,
                        valor: f.valor,
                    }
                })

            await asignacionCobroApi.crear({
                id_co: centroOperacionActivo || '001',
                rowid_tercero: clienteSeleccionado.f9740_id,
                conductor_id: Number(conductorId),
                observacion: observacion.trim() || undefined,
                facturas: facturasPayload,
            })

            setExito(`${facturasPayload.length} factura(s) asignada(s) correctamente`)
            cargarTablero()
            setObservacion('')
            cargarFacturas(clienteSeleccionado)
        } catch (err: any) {
            console.error('Error asignando facturas:', err)
            setError(err?.response?.data?.message || 'Error al asignar las facturas')
        } finally {
            setEnviando(false)
        }
    }

    if (!puedeAsignar) {
        return (
            <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
                No tiene permiso para asignar cobros.
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-6"
        >
            <div className="shrink-0 border-b pb-4">
                <h1 className="text-xl font-bold">Asignar Facturas</h1>
                <p className="text-sm text-muted-foreground">
                    Busca un cliente, selecciona las facturas pendientes que debe llevar el conductor y asígnalas.
                </p>
            </div>

            <div className="grid min-h-[420px] shrink-0 grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Columna búsqueda cliente */}
                <div className="flex flex-col gap-3 rounded-md border p-4 lg:col-span-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por razón social o NIT..."
                            value={busquedaCliente}
                            onChange={(e) => {
                                setBusquedaCliente(e.target.value)
                                setClienteSeleccionado(null)
                            }}
                            className="pl-9"
                            autoComplete="off"
                        />
                        {buscandoClientes && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>

                    {clientes.length > 0 && !clienteSeleccionado && (
                        <div className="max-h-64 overflow-auto rounded-md border">
                            {clientes.map((c) => (
                                <button
                                    key={c.f9740_id}
                                    onClick={() => handleSeleccionarCliente(c)}
                                    className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50"
                                >
                                    <div className="font-medium">{c.f9740_razon_social}</div>
                                    <div className="text-xs text-muted-foreground font-mono">{c.f9740_nit}</div>
                                </button>
                            ))}
                        </div>
                    )}

                    {clienteSeleccionado && (
                        <div className="rounded-md border bg-muted/40 px-3 py-2">
                            <div className="text-sm font-semibold">{clienteSeleccionado.f9740_razon_social}</div>
                            <div className="text-xs text-muted-foreground font-mono">{clienteSeleccionado.f9740_nit}</div>
                        </div>
                    )}

                    <div className="mt-2 flex flex-col gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conductor</label>
                        <Select value={conductorId} onChange={(e) => setConductorId(e.target.value)}>
                            <option value="">Seleccionar conductor...</option>
                            {conductores.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre_completo || c.usuario}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observación (opcional)</label>
                        <Input value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej: ruta zona norte" autoComplete="off" />
                    </div>

                    {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
                    {exito && <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{exito}</div>}

                    <Button
                        onClick={handleAsignar}
                        disabled={!clienteSeleccionado || !conductorId || seleccionadas.size === 0 || enviando}
                        className="mt-2 gap-2"
                    >
                        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Asignar {seleccionadas.size > 0 ? `(${seleccionadas.size})` : ''}
                    </Button>
                </div>

                {/* Columna facturas pendientes */}
                <div className="flex min-h-0 flex-col rounded-md border lg:col-span-2">
                    <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
                        <span className="text-sm font-semibold">Facturas pendientes del cliente</span>
                        <div className="flex items-center gap-2">
                            {seleccionadas.size > 0 && (
                                <Badge variant="secondary">
                                    Total seleccionado: {totalSeleccionado.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                                </Badge>
                            )}
                            {clienteSeleccionado && (
                                <Button variant="outline" size="icon" onClick={() => cargarFacturas(clienteSeleccionado)} disabled={cargandoFacturas} title="Recargar">
                                    <RefreshCw className={`h-4 w-4 ${cargandoFacturas ? 'animate-spin' : ''}`} />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto">
                        {!clienteSeleccionado ? (
                            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                                Busca y selecciona un cliente para ver sus facturas pendientes.
                            </div>
                        ) : cargandoFacturas ? (
                            <div className="flex h-full items-center justify-center gap-2 p-8 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" /> Cargando facturas...
                            </div>
                        ) : facturas.length === 0 ? (
                            <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
                                Este cliente no tiene facturas pendientes.
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-card">
                                    <tr className="border-b bg-muted/50">
                                        <th className="h-10 w-10 px-3"></th>
                                        <th className="h-10 px-3 text-left text-xs font-semibold uppercase text-muted-foreground">Factura</th>
                                        <th className="h-10 px-3 text-right text-xs font-semibold uppercase text-muted-foreground">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {facturas.map((f) => (
                                        <tr key={f.rowid_sa} className="border-b hover:bg-muted/30">
                                            <td className="px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={seleccionadas.has(f.rowid_sa)}
                                                    onChange={() => toggleFactura(f.rowid_sa)}
                                                    className="h-4 w-4"
                                                />
                                            </td>
                                            <td className="px-3 py-2 font-mono text-xs">{formatearFacturaPendiente(f)}</td>
                                            <td className="px-3 py-2 text-right">
                                                {f.valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Tablero: conductores programados y su avance */}
            {puedeVerTablero && (
                <div className="shrink-0 rounded-md border">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">Conductores programados (últimos 30 días)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReconciliar}
                                disabled={reconciliando}
                                title="Verificar contra SIESA cuáles ya no están abiertas (anuladas o cobradas por otra vía) y cancelarlas"
                                className="gap-1.5"
                            >
                                {reconciliando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                                Verificar contra SIESA
                            </Button>
                            <Button variant="outline" size="icon" onClick={cargarTablero} disabled={cargandoTablero} title="Actualizar tablero">
                                <RefreshCw className={`h-4 w-4 ${cargandoTablero ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>
                    {mensajeReconciliar && (
                        <div className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">{mensajeReconciliar}</div>
                    )}
                    {cargandoTablero && tablero.length === 0 ? (
                        <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" /> Cargando tablero...
                        </div>
                    ) : tablero.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            Ningún conductor tiene facturas asignadas todavía.
                        </div>
                    ) : (
                        <div className="overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="border-b">
                                        <th className="h-10 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Conductor</th>
                                        <th className="h-10 px-3 text-right text-xs font-semibold uppercase text-muted-foreground">Pendientes</th>
                                        <th className="h-10 px-3 text-right text-xs font-semibold uppercase text-muted-foreground">Cobradas</th>
                                        <th className="h-10 px-3 text-right text-xs font-semibold uppercase text-muted-foreground">Valor pendiente</th>
                                        <th className="h-10 px-3 text-right text-xs font-semibold uppercase text-muted-foreground">Valor cobrado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tablero.map((row) => (
                                        <tr
                                            key={row.conductor_id}
                                            className={`border-b hover:bg-muted/30 ${row.pendientes > 0 ? 'cursor-pointer' : ''}`}
                                            onClick={() => {
                                                if (row.pendientes > 0) {
                                                    setDetalleConductor({ id: row.conductor_id, nombre: row.conductor_nombre || `Conductor #${row.conductor_id}` })
                                                }
                                            }}
                                        >
                                            <td className="px-4 py-2.5 font-medium">{row.conductor_nombre || `Conductor #${row.conductor_id}`}</td>
                                            <td className="px-3 py-2.5 text-right">
                                                <Badge variant={row.pendientes > 0 ? 'default' : 'secondary'}>{row.pendientes}</Badge>
                                            </td>
                                            <td className="px-3 py-2.5 text-right text-muted-foreground">{row.cobradas}</td>
                                            <td className="px-3 py-2.5 text-right">
                                                {row.valor_pendiente.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                                            </td>
                                            <td className="px-3 py-2.5 text-right text-muted-foreground">
                                                {row.valor_cobrado.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {detalleConductor && (
                <DetalleFacturasAsignadasModal
                    conductorId={detalleConductor.id}
                    conductorNombre={detalleConductor.nombre}
                    onClose={() => setDetalleConductor(null)}
                />
            )}
        </motion.div>
    )
}
