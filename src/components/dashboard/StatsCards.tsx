import { motion } from 'framer-motion'
import { Users, Building2, Package, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useClients } from '@/hooks/useClients'
import { useCompanies } from '@/hooks/useCompanies'
import { useProducts } from '@/hooks/useProducts'
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
    const { data: companies, isLoading: companiesLoading, error: companiesError } = useCompanies()
    const { data: products, isLoading: productsLoading, error: productsError } = useProducts()

    const totalClients = clients && Array.isArray(clients) ? clients.length : 0
    const activeClients = clients && Array.isArray(clients) ? clients.filter(c => c.estado === 'activo').length : 0

    const activeCompanies = companies && Array.isArray(companies) ? companies.filter(c => c.f010_ind_estado === 1).length : 0
    const totalCompanies = companies && Array.isArray(companies) ? companies.length : 0

    const totalProducts = products && Array.isArray(products) ? products.length : 0
    const productsInStock = products && Array.isArray(products) ? products.filter(p => (p.stock ?? 0) > 0).length : 0

    const outOfStock = products && Array.isArray(products) ? products.filter(p => (p.stock ?? 0) === 0).length : 0

    const stats: StatCardProps[] = [
        {
            title: 'Total Clientes',
            value: formatters.number(totalClients),
            subtitle: `${activeClients} activos`,
            icon: Users,
            isLoading: clientsLoading,
            hasError: !!clientsError,
        },
        {
            title: 'Compañías',
            value: formatters.number(totalCompanies),
            subtitle: `${activeCompanies} activa${activeCompanies !== 1 ? 's' : ''}`,
            icon: Building2,
            isLoading: companiesLoading,
            hasError: !!companiesError,
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
    ]

    return (
        <ErrorBoundary>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
