import { useCallback, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { asignacionCobroApi, AsignacionCobro, FacturaAsignada } from '@/api/asignacionCobro'
import { usePermiso } from '@/hooks/usePermiso'
import { formatters } from '@/utils/formatters'
import { formatearPeso } from './facturaPendiente'

export function formatearFactura(f: FacturaAsignada): string {
    if (f.prefijo_docto && f.numero_factura != null) return `${f.prefijo_docto}-${String(f.numero_factura).padStart(8, '0')}`
    if (f.numero_factura != null) return String(f.numero_factura)
    return `SA-${f.rowid_factura}`
}

/**
 * Modal reutilizado por el tablero de Asignación de Cobro y por el resumen
 * de conductores de Recibo de Caja: detalle de facturas pendientes de un
 * conductor, agrupadas por cliente, con prefijo + número. Si el usuario
 * tiene ASIGNAR_COBRO, puede quitar una factura mal asignada.
 */
export function DetalleFacturasAsignadasModal({
    conductorId,
    conductorNombre,
    onClose,
}: {
    conductorId: number
    conductorNombre?: string
    onClose: () => void
}) {
    const { puede, P } = usePermiso()
    const puedeQuitar = puede(P.ASIGNACION_COBRO)

    const [asignaciones, setAsignaciones] = useState<AsignacionCobro[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [quitandoId, setQuitandoId] = useState<number | null>(null)

    const cargar = useCallback(() => {
        setLoading(true)
        setError(null)
        return asignacionCobroApi
            .porConductor(conductorId, 'ASIGNADA')
            .then(setAsignaciones)
            .catch((err) => setError(err?.response?.data?.message || 'No se pudo cargar el detalle'))
            .finally(() => setLoading(false))
    }, [conductorId])

    useEffect(() => {
        cargar().catch(() => {})
    }, [cargar])

    const handleQuitar = async (facturaId: number) => {
        try {
            setQuitandoId(facturaId)
            await asignacionCobroApi.cancelarFactura(facturaId)
            await cargar()
        } catch (err: any) {
            setError(err?.response?.data?.message || 'No se pudo quitar la factura')
        } finally {
            setQuitandoId(null)
        }
    }

    const lotesConPendientes = asignaciones
        .map((a) => ({ ...a, facturas: a.facturas.filter((f) => f.estado === 'PENDIENTE') }))
        .filter((a) => a.facturas.length > 0)

    return (
        <Modal isOpen onClose={onClose} title={`Facturas pendientes — ${conductorNombre || 'conductor'}`} className="max-w-lg">
            <div className="mt-3 max-h-[60vh] space-y-4 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
                    </div>
                ) : error ? (
                    <p className="text-sm text-destructive">{error}</p>
                ) : lotesConPendientes.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Sin facturas pendientes.</p>
                ) : (
                    <>
                    <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Carga total pendiente</span>
                        <span className="font-bold tabular-nums">
                            {formatearPeso(lotesConPendientes.reduce((acc, l) => acc + l.facturas.reduce((s2, f) => s2 + (f.peso_kg ?? 0), 0), 0))}
                        </span>
                    </div>
                    {lotesConPendientes.map((lote) => (
                        <div key={lote.id} className="nu-card">
                            <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2 text-sm">
                                <span className="font-semibold">{lote.cliente_nombre || `Cliente #${lote.rowid_tercero}`}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                    Asignada: <span className="font-medium text-foreground">{formatters.dateTime(lote.created_at)}</span>
                                </span>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-xs text-muted-foreground">
                                        <th className="px-3 py-2 text-left font-medium">Factura</th>
                                        <th className="px-3 py-2 text-right font-medium">Peso</th>
                                        <th className="px-3 py-2 text-right font-medium">Valor</th>
                                        {puedeQuitar && <th className="w-8 px-2 py-2" />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {lote.facturas.map((f) => (
                                        <tr key={f.id} className="border-b last:border-b-0">
                                            <td className="px-3 py-2 font-mono text-xs">{formatearFactura(f)}</td>
                                            <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">{formatearPeso(f.peso_kg ?? 0)}</td>
                                            <td className="px-3 py-2 text-right">
                                                {f.valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                                            </td>
                                            {puedeQuitar && (
                                                <td className="w-8 px-2 py-2 text-right">
                                                    <button
                                                        onClick={() => handleQuitar(f.id)}
                                                        disabled={quitandoId === f.id}
                                                        title="Quitar esta asignación"
                                                        className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                                                    >
                                                        {quitandoId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                {lote.facturas.length > 1 && (
                                    <tfoot>
                                        <tr className="border-t bg-muted/30 text-xs font-semibold">
                                            <td className="px-3 py-2">Total</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatearPeso(lote.facturas.reduce((acc, f) => acc + (f.peso_kg ?? 0), 0))}</td>
                                            <td className="px-3 py-2 text-right">
                                                {lote.facturas.reduce((acc, f) => acc + f.valor, 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                                            </td>
                                            {puedeQuitar && <td />}
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    ))}
                    </>
                )}
            </div>
        </Modal>
    )
}
