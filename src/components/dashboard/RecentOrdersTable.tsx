import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ShoppingBag } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { useDailyOrders } from '@/hooks/useReports'
import { DailyOrder } from '@/api/types'

const RecentOrdersTableContent = () => {
    const { data: orders, isLoading, error } = useDailyOrders()

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Pedidos Recientes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Pedidos Recientes</CardTitle>
                </CardHeader>
                <CardContent className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                    No se pudieron cargar los datos
                </CardContent>
            </Card>
        )
    }

    const recent: DailyOrder[] = Array.isArray(orders)
        ? [...orders]
            .sort((a, b) => (b['Hora creacion dt'] || '').localeCompare(a['Hora creacion dt'] || ''))
            .slice(0, 8)
        : []

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Pedidos Recientes</CardTitle>
                <Link
                    to="/reportes"
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                    Ver todos
                    <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
            </CardHeader>
            <CardContent>
                {recent.length === 0 ? (
                    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                        Sin pedidos disponibles
                    </div>
                ) : (
                    <div className="divide-y">
                        {recent.map((order) => (
                            <div
                                key={order.rowid}
                                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <ShoppingBag className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {order['Desc. CO'] || 'Sin descripción'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        C.O. {order['ID. CO'] || 'N/A'} · {order['Fecha docto']} · {order['Hora creacion']}
                                    </p>
                                </div>
                                <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                    {order.Estado || 'Sin Estado'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export const RecentOrdersTable = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
        >
            <ErrorBoundary>
                <RecentOrdersTableContent />
            </ErrorBoundary>
        </motion.div>
    )
}
