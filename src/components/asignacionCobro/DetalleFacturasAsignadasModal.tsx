import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { asignacionCobroApi, AsignacionCobro, EstadoFacturaAsignada, FacturaAsignada } from '@/api/asignacionCobro'
import { usePermiso } from '@/hooks/usePermiso'
import { formatters } from '@/utils/formatters'
import { formatearPeso } from './facturaPendiente'
import { CondicionPagoChip, esContraentrega } from './CondicionPagoChip'

export function formatearFactura(f: FacturaAsignada): string {
    if (f.prefijo_docto && f.numero_factura != null) return `${f.prefijo_docto}-${String(f.numero_factura).padStart(8, '0')}`
    if (f.numero_factura != null) return String(f.numero_factura)
    return `SA-${f.rowid_factura}`
}

const moneda = (n: number) =>
    n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const ETIQUETA_ESTADO: Record<EstadoFacturaAsignada, { texto: string; clase: string; orden: number }> = {
    PENDIENTE: { texto: 'Pendiente', clase: 'detail-badge detail-badge--warning', orden: 0 },
    COBRADA: { texto: 'Cobrada', clase: 'detail-badge detail-badge--success', orden: 1 },
    ENTREGADA: { texto: 'Entregada', clase: 'detail-badge detail-badge--info', orden: 2 },
    CANCELADA: { texto: 'Cancelada', clase: 'detail-badge', orden: 3 },
}

const ETIQUETA_ENTREGA: Record<string, { texto: string; clase: string }> = {
    NO_ENTREGADA: { texto: 'No entregada', clase: 'detail-badge detail-badge--danger' },
    ENTREGA_PARCIAL: { texto: 'Entrega parcial', clase: 'detail-badge detail-badge--warning' },
    ENTREGADA: { texto: 'Entregada', clase: 'detail-badge detail-badge--success' },
}

interface FacturaEnGrupo extends FacturaAsignada {
    id_co: string
    usuario_asigno: string
    observacion: string | null
    asignada_at: string
}

interface GrupoCliente {
    rowid_tercero: number
    cliente_nombre: string
    cliente_nit?: string
    centros: string[]
    observaciones: string[]
    facturas: FacturaEnGrupo[]
    pendientes_count: number
    cobradas_count: number
    entregadas_count: number
    valor_pendiente: number
    total_valor: number
    total_peso: number
}

type FiltroVista = 'todas' | 'pendientes' | 'cobradas' | 'entregadas' | 'contraentrega'

/**
 * Modal reutilizado por el tablero de Asignación de Cobro y por el resumen
 * de conductores de Recibo de Caja: detalle de facturas asignadas de un
 * conductor (pendientes, cobradas y entregadas), agrupadas por cliente.
 * Si el usuario tiene ASIGNAR_COBRO, puede quitar una factura pendiente mal asignada.
 */
export function DetalleFacturasAsignadasModal({
    conductorId,
    conductorNombre,
    desde,
    hasta,
    busquedaInicial,
    onClose,
}: {
    conductorId: number
    conductorNombre?: string
    desde?: string
    hasta?: string
    busquedaInicial?: string
    onClose: () => void
}) {
    const { puede, P } = usePermiso()
    const puedeQuitar = puede(P.ASIGNACION_COBRO)

    const [asignaciones, setAsignaciones] = useState<AsignacionCobro[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [quitandoId, setQuitandoId] = useState<number | null>(null)
    const [busqueda, setBusqueda] = useState(busquedaInicial ?? '')
    const [filtro, setFiltro] = useState<FiltroVista>('todas')

    const cargar = useCallback(() => {
        setLoading(true)
        setError(null)
        return asignacionCobroApi
            .porConductor(conductorId, undefined, { desde, hasta })
            .then(setAsignaciones)
            .catch((err) => setError(err?.response?.data?.message || 'No se pudo cargar el detalle'))
            .finally(() => setLoading(false))
    }, [conductorId, desde, hasta])

    useEffect(() => {
        cargar().catch(() => {})
    }, [cargar])

    const handleQuitar = async (facturaId: number) => {
        try {
            setQuitandoId(facturaId)
            await asignacionCobroApi.cancelarFactura(facturaId, true)
            await cargar()
        } catch (err: any) {
            setError(err?.response?.data?.message || 'No se pudo quitar la factura')
        } finally {
            setQuitandoId(null)
        }
    }

    // Agrupa por cliente real (rowid_tercero) incluyendo pendientes, cobradas y entregadas (excluye canceladas).
    const { grupos, resumen } = useMemo(() => {
        const mapa = new Map<number, GrupoCliente>()
        let totalFacturas = 0
        let pendientesCount = 0
        let cobradasCount = 0
        let entregadasCount = 0
        let valorPendiente = 0
        let valorCobrado = 0
        let pesoPendiente = 0
        let contraentregaPendienteCount = 0
        let contraentregaPendienteValor = 0
        let contraentregaTotalCount = 0
        const centrosSet = new Set<string>()

        for (const lote of asignaciones) {
            const activas = lote.facturas.filter((f) => f.estado !== 'CANCELADA')
            if (activas.length === 0) continue

            const co = lote.id_co?.trim()
            if (co) centrosSet.add(co)

            let grupo = mapa.get(lote.rowid_tercero)
            if (!grupo) {
                grupo = {
                    rowid_tercero: lote.rowid_tercero,
                    cliente_nombre: lote.cliente_nombre || `Cliente #${lote.rowid_tercero}`,
                    cliente_nit: lote.cliente_nit,
                    centros: [],
                    observaciones: [],
                    facturas: [],
                    pendientes_count: 0,
                    cobradas_count: 0,
                    entregadas_count: 0,
                    valor_pendiente: 0,
                    total_valor: 0,
                    total_peso: 0,
                }
                mapa.set(lote.rowid_tercero, grupo)
            }
            if (!grupo.cliente_nit && lote.cliente_nit) grupo.cliente_nit = lote.cliente_nit
            if (co && !grupo.centros.includes(co)) grupo.centros.push(co)
            const obs = lote.observacion?.trim()
            if (obs && !grupo.observaciones.includes(obs)) grupo.observaciones.push(obs)

            for (const f of activas) {
                const peso = f.peso_kg ?? 0
                const contra = esContraentrega(f.condicion_pago_id, f.condicion_pago)
                grupo.facturas.push({
                    ...f,
                    id_co: co || '—',
                    usuario_asigno: lote.usuario_asigno,
                    observacion: obs || null,
                    asignada_at: lote.created_at,
                })
                grupo.total_valor += f.valor
                grupo.total_peso += peso

                totalFacturas += 1
                if (contra) contraentregaTotalCount += 1

                if (f.estado === 'PENDIENTE') {
                    grupo.pendientes_count += 1
                    grupo.valor_pendiente += f.valor
                    pendientesCount += 1
                    valorPendiente += f.valor
                    pesoPendiente += peso
                    if (contra) {
                        contraentregaPendienteCount += 1
                        contraentregaPendienteValor += f.valor
                    }
                } else if (f.estado === 'COBRADA') {
                    grupo.cobradas_count += 1
                    cobradasCount += 1
                    valorCobrado += f.valor
                } else if (f.estado === 'ENTREGADA') {
                    grupo.entregadas_count += 1
                    entregadasCount += 1
                }
            }
        }

        const lista = [...mapa.values()]
            .map((g) => ({
                ...g,
                facturas: [...g.facturas].sort(
                    (a, b) => ETIQUETA_ESTADO[a.estado].orden - ETIQUETA_ESTADO[b.estado].orden
                ),
            }))
            .sort((a, b) => b.valor_pendiente - a.valor_pendiente || b.total_valor - a.total_valor)

        const baseAvance = cobradasCount + pendientesCount
        const cumplimiento = baseAvance > 0 ? Math.round((cobradasCount / baseAvance) * 100) : null

        return {
            grupos: lista,
            resumen: {
                totalFacturas,
                totalClientes: lista.length,
                pendientesCount,
                cobradasCount,
                entregadasCount,
                valorPendiente,
                valorCobrado,
                pesoPendiente,
                contraentregaPendienteCount,
                contraentregaPendienteValor,
                contraentregaTotalCount,
                creditoPendienteCount: pendientesCount - contraentregaPendienteCount,
                cumplimiento,
                centros: [...centrosSet].sort(),
            },
        }
    }, [asignaciones])

    const gruposFiltrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase()
        return grupos
            .map((g) => {
                const coincideCliente =
                    !q ||
                    g.cliente_nombre.toLowerCase().includes(q) ||
                    (g.cliente_nit ?? '').toLowerCase().includes(q)

                const facturas = g.facturas.filter((f) => {
                    if (filtro === 'pendientes' && f.estado !== 'PENDIENTE') return false
                    if (filtro === 'cobradas' && f.estado !== 'COBRADA') return false
                    if (filtro === 'entregadas' && f.estado !== 'ENTREGADA') return false
                    if (filtro === 'contraentrega' && !esContraentrega(f.condicion_pago_id, f.condicion_pago)) return false
                    if (!q || coincideCliente) return true
                    return (
                        formatearFactura(f).toLowerCase().includes(q) ||
                        (f.condicion_pago ?? '').toLowerCase().includes(q) ||
                        (f.usuario_asigno ?? '').toLowerCase().includes(q)
                    )
                })

                if (facturas.length === 0) return null
                return {
                    ...g,
                    facturas,
                    pendientes_count: facturas.filter((f) => f.estado === 'PENDIENTE').length,
                    cobradas_count: facturas.filter((f) => f.estado === 'COBRADA').length,
                    entregadas_count: facturas.filter((f) => f.estado === 'ENTREGADA').length,
                    valor_pendiente: facturas.filter((f) => f.estado === 'PENDIENTE').reduce((acc, f) => acc + f.valor, 0),
                    total_valor: facturas.reduce((acc, f) => acc + f.valor, 0),
                    total_peso: facturas.reduce((acc, f) => acc + (f.peso_kg ?? 0), 0),
                }
            })
            .filter((g): g is GrupoCliente => g !== null)
    }, [grupos, busqueda, filtro])

    const hayFiltroActivo = busqueda.trim().length > 0 || filtro !== 'todas'
    const visiblesFacturas = gruposFiltrados.reduce((acc, g) => acc + g.facturas.length, 0)
    const visiblesValor = gruposFiltrados.reduce((acc, g) => acc + g.total_valor, 0)
    const visiblesPeso = gruposFiltrados.reduce((acc, g) => acc + g.total_peso, 0)

    const subtitulo = !loading && resumen.totalFacturas > 0
        ? `${resumen.pendientesCount} pendiente${resumen.pendientesCount === 1 ? '' : 's'} · ${resumen.cobradasCount} cobrada${resumen.cobradasCount === 1 ? '' : 's'} en ${resumen.totalClientes} cliente${resumen.totalClientes === 1 ? '' : 's'}${resumen.centros.length ? ` · C.O. ${resumen.centros.join(', ')}` : ''}`
        : undefined

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Facturas asignadas — ${conductorNombre || 'Conductor'}`}
            subtitle={subtitulo}
            className="modal-lg"
        >
            <div className="modal-stack">
                {loading ? (
                    <div className="modal-state">
                        <span className="modal-state-row">
                            <Loader2 className="h-5 w-5 animate-spin" /> Cargando facturas asignadas...
                        </span>
                    </div>
                ) : error ? (
                    <div className="modal-alert-error">{error}</div>
                ) : grupos.length === 0 ? (
                    <div className="modal-state">Sin facturas asignadas en este período.</div>
                ) : (
                    <>
                        {/* Resumen ejecutivo */}
                        <div className="kpi-strip">
                            <div className="kpi-card kpi-card--accent">
                                <span className="kpi-label">Por cobrar</span>
                                <span className="kpi-value">{moneda(resumen.valorPendiente)}</span>
                                <span className="kpi-sub">
                                    {resumen.contraentregaPendienteCount > 0
                                        ? `Contraentrega: ${moneda(resumen.contraentregaPendienteValor)}`
                                        : 'Sin contraentrega pendiente'}
                                </span>
                            </div>
                            <div className="kpi-card kpi-card--success">
                                <span className="kpi-label">Cobrado</span>
                                <span className="kpi-value">{moneda(resumen.valorCobrado)}</span>
                                <span className="kpi-sub">
                                    {resumen.cobradasCount} cobrada{resumen.cobradasCount === 1 ? '' : 's'}
                                    {resumen.entregadasCount > 0 ? ` · ${resumen.entregadasCount} entregada${resumen.entregadasCount === 1 ? '' : 's'}` : ''}
                                </span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-label">Carga pendiente</span>
                                <span className="kpi-value">{formatearPeso(resumen.pesoPendiente)}</span>
                                <span className="kpi-sub">
                                    {resumen.pendientesCount} pend. · {resumen.totalClientes} cliente{resumen.totalClientes === 1 ? '' : 's'}
                                </span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-label">Avance</span>
                                <span className="kpi-value">
                                    {resumen.cumplimiento != null ? `${resumen.cumplimiento} %` : '—'}
                                </span>
                                <span className="kpi-sub">
                                    {resumen.contraentregaPendienteCount} contraentrega · {resumen.creditoPendienteCount} crédito
                                </span>
                            </div>
                        </div>

                        {/* Búsqueda y filtros */}
                        <div className="modal-toolbar">
                            <div className="modal-search">
                                <Search className="modal-search-icon" />
                                <input
                                    type="search"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar por cliente, NIT o número de factura..."
                                    className="modal-search-input"
                                />
                            </div>
                            <div className="filter-pills" role="tablist" aria-label="Filtrar facturas">
                                <button
                                    type="button"
                                    className={`filter-pill${filtro === 'todas' ? ' is-active' : ''}`}
                                    onClick={() => setFiltro('todas')}
                                >
                                    Todas ({resumen.totalFacturas})
                                </button>
                                <button
                                    type="button"
                                    className={`filter-pill${filtro === 'pendientes' ? ' is-active' : ''}`}
                                    onClick={() => setFiltro('pendientes')}
                                >
                                    Pendientes ({resumen.pendientesCount})
                                </button>
                                <button
                                    type="button"
                                    className={`filter-pill${filtro === 'cobradas' ? ' is-active' : ''}`}
                                    onClick={() => setFiltro('cobradas')}
                                >
                                    Cobradas ({resumen.cobradasCount})
                                </button>
                                {resumen.entregadasCount > 0 && (
                                    <button
                                        type="button"
                                        className={`filter-pill${filtro === 'entregadas' ? ' is-active' : ''}`}
                                        onClick={() => setFiltro('entregadas')}
                                    >
                                        Entregadas ({resumen.entregadasCount})
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={`filter-pill${filtro === 'contraentrega' ? ' is-active' : ''}`}
                                    onClick={() => setFiltro('contraentrega')}
                                >
                                    Contraentrega ({resumen.contraentregaTotalCount})
                                </button>
                            </div>
                        </div>

                        {/* Lista agrupada por cliente */}
                        {gruposFiltrados.length === 0 ? (
                            <div className="modal-state">
                                Ninguna factura coincide con el filtro actual.
                            </div>
                        ) : (
                            <div className="detail-groups">
                                {gruposFiltrados.map((grupo) => (
                                    <section key={grupo.rowid_tercero} className="detail-group">
                                        <header className="detail-group-header">
                                            <div className="detail-group-title-wrap">
                                                <div className="detail-group-title-row">
                                                    <span className="detail-group-title">{grupo.cliente_nombre}</span>
                                                    {grupo.cliente_nit && (
                                                        <span className="detail-badge detail-badge--mono">
                                                            NIT {grupo.cliente_nit}
                                                        </span>
                                                    )}
                                                    {grupo.centros.map((co) => (
                                                        <span key={co} className="detail-badge detail-badge--mono">
                                                            C.O. {co}
                                                        </span>
                                                    ))}
                                                </div>
                                                {grupo.observaciones.length > 0 && (
                                                    <div className="detail-group-meta">
                                                        <span className="detail-note">
                                                            Obs: {grupo.observaciones.join(' · ')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="detail-group-stats">
                                                {grupo.pendientes_count > 0 && (
                                                    <span className="detail-badge detail-badge--warning">
                                                        {grupo.pendientes_count} pend.
                                                    </span>
                                                )}
                                                {grupo.cobradas_count > 0 && (
                                                    <span className="detail-badge detail-badge--success">
                                                        {grupo.cobradas_count} cobr.
                                                    </span>
                                                )}
                                                {grupo.entregadas_count > 0 && (
                                                    <span className="detail-badge detail-badge--info">
                                                        {grupo.entregadas_count} entr.
                                                    </span>
                                                )}
                                                <span className="detail-group-stat">
                                                    {formatearPeso(grupo.total_peso)}
                                                </span>
                                                <span className="detail-group-stat--strong">
                                                    {moneda(grupo.total_valor)}
                                                </span>
                                            </div>
                                        </header>

                                        <div className="detail-table-wrap">
                                            <table className="detail-table">
                                                <thead>
                                                    <tr>
                                                        <th>Factura</th>
                                                        <th>Estado</th>
                                                        <th>Asignada</th>
                                                        <th className="is-num">Peso</th>
                                                        <th className="is-num">Valor</th>
                                                        {puedeQuitar && <th className="detail-cell-actions" />}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {grupo.facturas.map((f) => {
                                                        const badgeEstado = ETIQUETA_ESTADO[f.estado]
                                                        const esResuelta = f.estado === 'COBRADA' || f.estado === 'ENTREGADA'
                                                        const estadoEntrega =
                                                            f.estado === 'PENDIENTE' && f.entrega && f.entrega !== 'ASIGNADA'
                                                                ? ETIQUETA_ENTREGA[f.entrega]
                                                                : null
                                                        return (
                                                            <tr key={f.id} className={esResuelta ? 'detail-row--done' : undefined}>
                                                                <td>
                                                                    <div className="detail-cell-stack">
                                                                        <span className="detail-cell-mono">{formatearFactura(f)}</span>
                                                                        <CondicionPagoChip id={f.condicion_pago_id} descripcion={f.condicion_pago} />
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="detail-cell-stack">
                                                                        <span className={badgeEstado.clase}>
                                                                            {badgeEstado.texto}
                                                                        </span>
                                                                        {f.estado === 'COBRADA' && f.fecha_cobro && (
                                                                            <span className="detail-subtext">
                                                                                {formatters.dateTime(f.fecha_cobro)}
                                                                            </span>
                                                                        )}
                                                                        {f.estado === 'ENTREGADA' && f.entrega_at && (
                                                                            <span className="detail-subtext">
                                                                                {formatters.dateTime(f.entrega_at)}
                                                                            </span>
                                                                        )}
                                                                        {estadoEntrega && (
                                                                            <span
                                                                                className={estadoEntrega.clase}
                                                                                title={f.entrega_nota ?? undefined}
                                                                            >
                                                                                {estadoEntrega.texto}
                                                                                {f.entrega_nota ? ` · ${f.entrega_nota}` : ''}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="detail-cell-stack">
                                                                        <span className="detail-cell-muted">
                                                                            {formatters.dateTime(f.asignada_at)}
                                                                        </span>
                                                                        {f.usuario_asigno && (
                                                                            <span className="detail-subtext">
                                                                                Por {f.usuario_asigno}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="detail-cell-num detail-cell-muted">
                                                                    {formatearPeso(f.peso_kg ?? 0)}
                                                                </td>
                                                                <td className="detail-cell-num detail-cell-strong">
                                                                    {moneda(f.valor)}
                                                                </td>
                                                                {puedeQuitar && (
                                                                    <td className="detail-cell-actions">
                                                                        {f.estado === 'PENDIENTE' && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleQuitar(f.id)}
                                                                                disabled={quitandoId === f.id}
                                                                                title="Quitar esta factura de la asignación"
                                                                                className="detail-icon-btn detail-icon-btn--danger"
                                                                            >
                                                                                {quitandoId === f.id ? (
                                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                                ) : (
                                                                                    <X className="h-3.5 w-3.5" />
                                                                                )}
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )}

                        {hayFiltroActivo && visiblesFacturas > 0 && (
                            <div className="modal-summary-footer">
                                <span>
                                    Mostrando <strong>{visiblesFacturas}</strong> de {resumen.totalFacturas} facturas
                                </span>
                                <span>
                                    Subtotal filtrado: <strong>{formatearPeso(visiblesPeso)}</strong> ·{' '}
                                    <strong>{moneda(visiblesValor)}</strong>
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    )
}
