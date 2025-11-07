import { motion } from 'framer-motion'
import { Users, Building2, Package, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useClients } from '@/hooks/useClients'
import { useCompanies } from '@/hooks/useCompanies'
import { useProducts } from '@/hooks/useProducts'
import { formatters } from '@/utils/formatters'

interface StatCardProps {
    title: string
    value: number
    icon: React.ComponentType<{ className?: string }>
    change?: number
    isLoading?: boolean
    hasError?: boolean
}

const StatCard = ({ title, value, icon: Icon, change, isLoading, hasError }: StatCardProps) => {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        <Skeleton className="h-4 w-24" />
                    </CardTitle>
                    <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-20" />
                </CardContent>
            </Card>
        )
    }

    if (hasError) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-800">{title}</CardTitle>
                    <Icon className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">Error</div>
                    <p className="text-xs text-red-600">No se pudo cargar</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatters.number(value)}</div>
                    {change !== undefined && (
                        <p className="text-xs text-muted-foreground flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {change > 0 ? '+' : ''}{change}% desde el mes pasado
                        </p>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}

export const StatsCards = () => {
    const { data: clients, isLoading: clientsLoading, error: clientsError } = useClients()
    const { data: companies, isLoading: companiesLoading, error: companiesError } = useCompanies()
    const { data: products, isLoading: productsLoading, error: productsError } = useProducts()

    const stats = [
        {
            title: 'Total Clientes',
            value: clients && Array.isArray(clients) ? clients.length : 0,
            icon: Users,
            change: 12,
            isLoading: clientsLoading,
            hasError: !!clientsError,
        },
        {
            title: 'Compañías Activas',
            value: companies && Array.isArray(companies) ? companies.filter(c => c.f010_ind_estado === 1).length : 0,
            icon: Building2,
            change: 8,
            isLoading: companiesLoading,
            hasError: !!companiesError,
        },
        {
            title: 'Total Productos',
            value: products && Array.isArray(products) ? products.length : 0,
            icon: Package,
            change: -2,
            isLoading: productsLoading,
            hasError: !!productsError,
        },
    ]

    return (
        <ErrorBoundary>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                        <StatCard {...stat} />
                    </motion.div>
                ))}
            </div>
        </ErrorBoundary>
    )
}
