import { User, Package, ShoppingBag, DollarSign } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { StatCard } from '@/components/dashboard/StatCard'
import { useClientsCount } from '@/hooks/useClients'
import { useProductsCount } from '@/hooks/useProducts'
import { useDailyOrders, useSalesSummary } from '@/hooks/useReports'
import { formatters } from '@/utils/formatters'

const StatsCardsContent = () => {
    const { data: clientsCount, isLoading: loadingClients, error: errorClients } = useClientsCount()
    const { data: productsCount, isLoading: loadingProducts, error: errorProducts } = useProductsCount()
    const { data: orders, isLoading: loadingOrders, error: errorOrders } = useDailyOrders()
    const { data: sales, isLoading: loadingSales, error: errorSales } = useSalesSummary()

    const totalVentas = Array.isArray(sales)
        ? sales.reduce((acc, s) => acc + (s['Vlr. Neto documento'] || 0), 0)
        : 0

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
                label="Pedidos Hoy"
                value={formatters.number(Array.isArray(orders) ? orders.length : 0)}
                icon={ShoppingBag}
                isLoading={loadingOrders}
                hasError={!!errorOrders}
                delay={0}
            />
            <StatCard
                label="Ventas Totales"
                value={formatters.compactCurrency(totalVentas)}
                icon={DollarSign}
                isLoading={loadingSales}
                hasError={!!errorSales}
                delay={0.05}
            />
            <StatCard
                label="Clientes"
                value={formatters.number(clientsCount ?? 0)}
                icon={User}
                isLoading={loadingClients}
                hasError={!!errorClients}
                delay={0.1}
            />
            <StatCard
                label="Productos"
                value={formatters.number(productsCount ?? 0)}
                icon={Package}
                isLoading={loadingProducts}
                hasError={!!errorProducts}
                delay={0.15}
            />
        </div>
    )
}

export const StatsCards = () => {
    return (
        <ErrorBoundary>
            <StatsCardsContent />
        </ErrorBoundary>
    )
}
