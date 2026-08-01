import { motion } from 'framer-motion'
import { ResponsiveBar } from '@nivo/bar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useVendors } from '@/hooks/useReports'
import { formatters } from '@/utils/formatters'

const VendorsChartContent = () => {
    const { data: vendors, isLoading, error } = useVendors()

    const chartData = vendors && Array.isArray(vendors)
        ? Object.entries(
            vendors.reduce((acc, vendor) => {
                const nombre = vendor['Nombre vendedor'] || 'Sin Vendedor'
                acc[nombre] = (acc[nombre] || 0) + (vendor['Valor neto'] || 0)
                return acc
            }, {} as Record<string, number>)
        )
            .map(([vendedor, valor]) => ({
                vendedor: vendedor.length > 18 ? `${vendedor.substring(0, 18)}...` : vendedor,
                valor,
            }))
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 5)
        : []

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Top Vendedores</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[280px] w-full" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Top Vendedores</CardTitle>
                </CardHeader>
                <CardContent className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                    No se pudieron cargar los datos
                </CardContent>
            </Card>
        )
    }

    if (chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Top Vendedores</CardTitle>
                </CardHeader>
                <CardContent className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                    Sin datos disponibles
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top 5 Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[280px]">
                    <ResponsiveBar
                        data={chartData}
                        keys={['valor']}
                        indexBy="vendedor"
                        margin={{ top: 20, right: 20, bottom: 60, left: 70 }}
                        padding={0.35}
                        valueScale={{ type: 'linear' }}
                        indexScale={{ type: 'band', round: true }}
                        colors={['hsl(0 79% 32%)', 'hsl(0 79% 41%)', 'hsl(0 75% 52%)', 'hsl(0 70% 63%)', 'hsl(0 65% 75%)']}
                        colorBy="indexValue"
                        borderRadius={4}
                        axisTop={null}
                        axisRight={null}
                        axisBottom={{
                            tickSize: 5,
                            tickPadding: 5,
                            tickRotation: -30,
                        }}
                        axisLeft={{
                            tickSize: 5,
                            tickPadding: 5,
                            format: (value) => formatters.compactCurrency(value),
                        }}
                        theme={{
                            axis: {
                                ticks: {
                                    text: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
                                },
                            },
                            grid: {
                                line: {
                                    stroke: 'hsl(var(--border))',
                                    strokeWidth: 1,
                                }
                            },
                        }}
                        enableLabel={false}
                        animate={true}
                        motionConfig="gentle"
                        tooltip={({ data }) => (
                            <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
                                <div className="font-semibold">{data.vendedor}</div>
                                <div className="text-muted-foreground">{formatters.currency(data.valor)}</div>
                            </div>
                        )}
                    />
                </div>
            </CardContent>
        </Card>
    )
}

export const VendorsChart = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
        >
            <ErrorBoundary>
                <VendorsChartContent />
            </ErrorBoundary>
        </motion.div>
    )
}
