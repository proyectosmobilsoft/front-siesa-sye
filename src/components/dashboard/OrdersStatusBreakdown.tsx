import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalculandoGraficas } from '@/components/tablero/CalculandoGraficas'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useDailyOrdersStatusBreakdown } from '@/hooks/useReports'
import { formatters } from '@/utils/formatters'
import { useDetalle } from '@/components/tablero/detalle/contexto'
import { DETALLE_PEDIDOS } from '@/components/tablero/detalle/especificaciones'

const OrdersStatusBreakdownContent = () => {
    // Agregado en DB (GROUP BY estado) — ver
    // [[API - Endpoint - GET reports-daily-orders]].
    const { data: statusBreakdown, isLoading, error } = useDailyOrdersStatusBreakdown()
    const detalles = useDetalle()

    const breakdown = Array.isArray(statusBreakdown)
        ? [...statusBreakdown]
            .map(({ estado, count }) => ({ estado: estado || 'Sin Estado', cantidad: count }))
            .sort((a, b) => b.cantidad - a.cantidad)
        : []

    const total = breakdown.reduce((acc, b) => acc + b.cantidad, 0)

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Estado de Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                    <CalculandoGraficas altura="h-48" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Estado de Pedidos</CardTitle>
                </CardHeader>
                <CardContent className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No se pudieron cargar los datos
                </CardContent>
            </Card>
        )
    }

    if (breakdown.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Estado de Pedidos</CardTitle>
                </CardHeader>
                <CardContent className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    Sin datos disponibles
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Estado de Pedidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {breakdown.map(({ estado, cantidad }) => {
                    const pct = total > 0 ? Math.round((cantidad / total) * 100) : 0
                    return (
                        <div
                            key={estado}
                            className="-mx-2 space-y-1.5 rounded-lg px-2 py-1 cursor-pointer transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-primary"
                            role="button"
                            tabIndex={0}
                            aria-label={`Pedidos ${estado}: ver los registros`}
                            onClick={() => detalles?.abrir({ ...DETALLE_PEDIDOS.estado(estado), valor: String(cantidad) })}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); detalles?.abrir({ ...DETALLE_PEDIDOS.estado(estado), valor: String(cantidad) }) } }}
                        >
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{estado}</span>
                                <span className="text-muted-foreground">
                                    {formatters.number(cantidad)} <span className="text-xs">({pct}%)</span>
                                </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}

export const OrdersStatusBreakdown = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 }}
        >
            <ErrorBoundary>
                <OrdersStatusBreakdownContent />
            </ErrorBoundary>
        </motion.div>
    )
}
