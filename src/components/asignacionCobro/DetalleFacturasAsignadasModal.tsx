import { useCallback, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { asignacionCobroApi, AsignacionCobro, FacturaAsignada } from '@/api/asignacionCobro'
import { usePermiso } from '@/hooks/usePermiso'

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
                    lotesConPendientes.map((lote) => (
                        <div key={lote.id} className="nu-card">
                            <div className="border-b bg-muted/40 px-3 py-2 text-sm font-semibold">
                                {lote.cliente_nombre || `Cliente #${lote.rowid_tercero}`}
                            </div>
                            <table className="w-full text-sm">
                                <tbody>
                                    {lote.facturas.map((f) => (
                                        <tr key={f.id} className="border-b last:border-b-0">
                                            <td className="px-3 py-2 font-mono text-xs">{formatearFactura(f)}</td>
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
                            </table>
                        </div>
                    ))
                )}
            </div>
        </Modal>
    )
}
