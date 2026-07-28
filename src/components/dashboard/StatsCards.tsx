import { motion } from 'framer-motion'
import { Users, Package, AlertTriangle, ShoppingBag, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useClients, useClientsActivos } from '@/hooks/useClients'
import { useProducts } from '@/hooks/useProducts'
import { usePedidos } from '@/hooks/usePedidos'
import { useTendenciaMensual } from '@/hooks/useTendenciaMensual'
import { formatters } from '@/utils/formatters'

interface StatCardProps {
    title: string
    value: string | number
    subtitle: string
    icon: React.ComponentType<{ className?: string }>
    accent?: string
    isLoading?: boolean
    hasError?: boolean
}

const StatCard = ({ title, value, subtitle, icon: Icon, accent = 'text-muted-foreground', isLoading, hasError }: StatCardProps) => {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-16 mb-1" />
                    <Skeleton className="h-3 w-32" />
                </CardContent>
            </Card>
        )
    }

    if (hasError) {
        return (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-800">{title}</CardTitle>
                    <Icon className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-500">—</div>
                    <p className="text-xs text-red-500 mt-1">No se pudo cargar</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${accent}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            </CardContent>
        </Card>
    )
}

export const StatsCards = () => {
    const { data: clients, isLoading: clientsLoading, error: clientsError } = useClients()
    const { data: clientsActivos, isLoading: clientsActivosLoading, error: clientsActivosError } = useClientsActivos()
    const { data: products, isLoading: productsLoading, error: productsError } = useProducts()

    const today = new Date().toISOString().split('T')[0]
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: pedidos, isLoading: pedidosLoading, error: pedidosError } = usePedidos({
        fechaInicial: lastWeek,
        fechaFinal: today
    })

    const { data: tendencia, isLoading: tendenciaLoading, error: tendenciaError } = useTendenciaMensual({
        periodoInicial: 202401,
        periodoFinal: 202412
    })

    const totalClients = clients && Array.isArray(clients) ? clients.length : 0
    const countClientsActivos = clientsActivos?.activos_anio ?? 0

    const totalProducts = products && Array.isArray(products) ? products.length : 0
    const productsInStock = products && Array.isArray(products) ? products.filter(p => (p.stock ?? 0) > 0).length : 0

    const outOfStock = products && Array.isArray(products) ? products.filter(p => (p.stock ?? 0) === 0).length : 0

    const totalPedidosSemana = pedidos && Array.isArray(pedidos) ? pedidos.length : 0

    const ultimoPeriodo = tendencia && tendencia.length > 0 ? tendencia[tendencia.length - 1] : null
    const utilidadUltimoPeriodo = ultimoPeriodo?.Utilidad ?? 0

    const stats: StatCardProps[] = [
        {
            title: 'Total Clientes',
            value: formatters.number(totalClients),
            subtitle: `${countClientsActivos} activos en el último año`,
            icon: Users,
            isLoading: clientsLoading || clientsActivosLoading,
            hasError: !!clientsError || !!clientsActivosError,
        },
        {
            title: 'Total Productos',
            value: formatters.number(totalProducts),
            subtitle: `${productsInStock} con stock disponible`,
            icon: Package,
            isLoading: productsLoading,
            hasError: !!productsError,
        },
        {
            title: 'Sin Stock',
            value: formatters.number(outOfStock),
            subtitle: outOfStock > 0 ? 'productos agotados' : 'todos con stock',
            icon: AlertTriangle,
            accent: outOfStock > 0 ? 'text-amber-500' : 'text-green-500',
            isLoading: productsLoading,
            hasError: !!productsError,
        },
        {
            title: 'Pedidos (7 días)',
            value: formatters.number(totalPedidosSemana),
            subtitle: 'últimos 7 días registrados',
            icon: ShoppingBag,
            isLoading: pedidosLoading,
            hasError: !!pedidosError,
        },
        {
            title: 'Utilidad del periodo',
            value: formatters.compactCurrency(utilidadUltimoPeriodo),
            subtitle: ultimoPeriodo ? `último mes con datos (${ultimoPeriodo.Periodo})` : 'sin datos',
            icon: TrendingUp,
            accent: utilidadUltimoPeriodo >= 0 ? 'text-emerald-500' : 'text-red-500',
            isLoading: tendenciaLoading,
            hasError: !!tendenciaError,
        },
    ]

    return (
        <ErrorBoundary>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <StatCard {...stat} />
                    </motion.div>
                ))}
            </div>
        </ErrorBoundary>
    )
}
