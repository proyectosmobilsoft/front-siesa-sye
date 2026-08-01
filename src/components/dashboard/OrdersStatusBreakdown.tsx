import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useDailyOrders } from '@/hooks/useReports'
import { formatters } from '@/utils/formatters'

const OrdersStatusBreakdownContent = () => {
    const { data: orders, isLoading, error } = useDailyOrders()

    const breakdown = Array.isArray(orders)
        ? Object.entries(
            orders.reduce((acc, order) => {
                const estado = order.Estado || 'Sin Estado'
                acc[estado] = (acc[estado] || 0) + 1
                return acc
            }, {} as Record<string, number>)
        )
            .map(([estado, cantidad]) => ({ estado, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad)
        : []

    const total = breakdown.reduce((acc, b) => acc + b.cantidad, 0)

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Estado de Pedidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
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
                        <div key={estado} className="space-y-1.5">
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
