import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useProducts } from '@/hooks/useProducts'
import { useClients } from '@/hooks/useClients'
import { ResponsivePie } from '@nivo/pie'

export const ChartsSection = () => {
    const { data: products, isLoading: productsLoading } = useProducts()
    const { data: clients, isLoading: clientsLoading } = useClients()

    // Productos por indicadores
    const productIndicatorsData = products && Array.isArray(products) ? [
        {
            id: 'Compra',
            label: 'Compra',
            value: products.filter(p => (p as any).f120_ind_compra === 1 || p.ind_compra).length,
            color: '#3b82f6'
        },
        {
            id: 'Venta',
            label: 'Venta',
            value: products.filter(p => (p as any).f120_ind_venta === 1 || p.ind_venta).length,
            color: '#10b981'
        },
        {
            id: 'Manufactura',
            label: 'Manufactura',
            value: products.filter(p => (p as any).f120_ind_manufactura === 1 || p.ind_manufactura).length,
            color: '#f59e0b'
        }
    ].filter(d => d.value > 0) : []

    // Clientes por estado
    const clientsByEstadoData = clients && Array.isArray(clients) ? [
        {
            id: 'Activos',
            label: 'Activos',
            value: clients.filter(c => c.estado === 'activo').length,
            color: '#10b981'
        },
        {
            id: 'Inactivos',
            label: 'Inactivos',
            value: clients.filter(c => c.estado === 'inactivo').length,
            color: '#f59e0b'
        },
        {
            id: 'Suspendidos',
            label: 'Suspendidos',
            value: clients.filter(c => c.estado === 'suspendido').length,
            color: '#ef4444'
        }
    ].filter(d => d.value > 0) : []

    if (productsLoading || clientsLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2">
                {['Productos por Indicadores', 'Clientes por Estado'].map(title => (
                    <Card key={title}>
                        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
                        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    const pieTheme = {
        tooltip: {
            container: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                fontSize: 13,
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }
        },
        labels: { text: { fontSize: 13, fontWeight: 600 } },
        legends: { text: { fontSize: 12, fill: 'hsl(var(--foreground))' } },
    }

    return (
        <ErrorBoundary>
            <motion.div
                className="grid gap-6 md:grid-cols-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
                {/* Productos por indicadores */}
                <Card>
                    <CardHeader>
                        <CardTitle>Productos por Indicadores</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Distribución según tipo de uso
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="h-72">
                            {productIndicatorsData.length > 0 ? (
                                <ResponsivePie
                                    data={productIndicatorsData}
                                    margin={{ top: 24, right: 80, bottom: 80, left: 80 }}
                                    innerRadius={0.55}
                                    padAngle={0.5}
                                    cornerRadius={4}
                                    activeOuterRadiusOffset={6}
                                    borderWidth={1}
                                    borderColor={{ from: 'color', modifiers: [['darker', 0.15]] }}
                                    arcLinkLabelsSkipAngle={10}
                                    arcLinkLabelsTextColor="hsl(var(--foreground))"
                                    arcLinkLabelsThickness={2}
                                    arcLinkLabelsColor={{ from: 'color' }}
                                    arcLabelsSkipAngle={10}
                                    arcLabelsTextColor="#ffffff"
                                    colors={{ datum: 'data.color' }}
                                    theme={pieTheme}
                                    legends={[
                                        {
                                            anchor: 'bottom',
                                            direction: 'row',
                                            translateX: 0,
                                            translateY: 64,
                                            itemsSpacing: 12,
                                            itemWidth: 90,
                                            itemHeight: 18,
                                            itemDirection: 'left-to-right',
                                            itemOpacity: 1,
                                            symbolSize: 12,
                                            symbolShape: 'circle',
                                        }
                                    ]}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                    Sin datos disponibles
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Clientes por estado */}
                <Card>
                    <CardHeader>
                        <CardTitle>Clientes por Estado</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {clients ? `${clients.length} clientes en total` : 'Cargando...'}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="h-72">
                            {clientsByEstadoData.length > 0 ? (
                                <ResponsivePie
                                    data={clientsByEstadoData}
                                    margin={{ top: 24, right: 80, bottom: 80, left: 80 }}
                                    innerRadius={0.55}
                                    padAngle={0.5}
                                    cornerRadius={4}
                                    activeOuterRadiusOffset={6}
                                    borderWidth={1}
                                    borderColor={{ from: 'color', modifiers: [['darker', 0.15]] }}
                                    arcLinkLabelsSkipAngle={10}
                                    arcLinkLabelsTextColor="hsl(var(--foreground))"
                                    arcLinkLabelsThickness={2}
                                    arcLinkLabelsColor={{ from: 'color' }}
                                    arcLabelsSkipAngle={10}
                                    arcLabelsTextColor="#ffffff"
                                    colors={{ datum: 'data.color' }}
                                    theme={pieTheme}
                                    legends={[
                                        {
                                            anchor: 'bottom',
                                            direction: 'row',
                                            translateX: 0,
                                            translateY: 64,
                                            itemsSpacing: 12,
                                            itemWidth: 100,
                                            itemHeight: 18,
                                            itemDirection: 'left-to-right',
                                            itemOpacity: 1,
                                            symbolSize: 12,
                                            symbolShape: 'circle',
                                        }
                                    ]}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                    Sin datos disponibles
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </ErrorBoundary>
    )
}
