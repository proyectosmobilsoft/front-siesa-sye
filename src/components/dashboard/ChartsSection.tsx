import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useProducts } from '@/hooks/useProducts'
import { useCompanies } from '@/hooks/useCompanies'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveLine } from '@nivo/line'

export const ChartsSection = () => {
    const { data: products, isLoading: productsLoading, error: productsError } = useProducts()
    const { data: companies, isLoading: companiesLoading, error: companiesError } = useCompanies()

    // Datos para el gráfico de productos por indicadores
    const productIndicatorsData = products && Array.isArray(products) ? [
        {
            id: 'Compra',
            label: 'Indicador Compra',
            value: products.filter(p => p.f120_ind_compra === 1).length,
            color: '#3b82f6'
        },
        {
            id: 'Venta',
            label: 'Indicador Venta',
            value: products.filter(p => p.f120_ind_venta === 1).length,
            color: '#10b981'
        },
        {
            id: 'Manufactura',
            label: 'Indicador Manufactura',
            value: products.filter(p => p.f120_ind_manufactura === 1).length,
            color: '#f59e0b'
        }
    ] : []

    // Datos para el gráfico de compañías por año
    const companiesByYearData = companies && Array.isArray(companies) ?
        companies.reduce((acc, company) => {
            const year = company.f010_ult_ano_cerrado
            if (year && year > 0) {
                const existing = acc.find(item => item.x === year)
                if (existing) {
                    existing.y += 1
                } else {
                    acc.push({ x: year, y: 1 })
                }
            }
            return acc
        }, [] as { x: number; y: number }[])
            .sort((a, b) => a.x - b.x)
        : []

    const lineData = [
        {
            id: 'Compañías por Año',
            data: companiesByYearData
        }
    ]

    if (productsLoading || companiesLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Productos por Indicadores</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Compañías por Año</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (productsError || companiesError) {
        return (
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="text-red-800">Productos por Indicadores</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-64">
                        <div className="text-center text-red-600">
                            <p className="text-lg font-medium">Error al cargar datos</p>
                            <p className="text-sm">No se pudieron obtener los productos</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="text-red-800">Compañías por Año</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-64">
                        <div className="text-center text-red-600">
                            <p className="text-lg font-medium">Error al cargar datos</p>
                            <p className="text-sm">No se pudieron obtener las compañías</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <ErrorBoundary>
            <motion.div
                className="grid gap-6 md:grid-cols-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
            >
                {/* Gráfico de productos por indicadores */}
                <Card>
                    <CardHeader>
                        <CardTitle>Productos por Indicadores</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[500px]">
                            <ResponsivePie
                                data={productIndicatorsData}
                                margin={{ top: 40, right: 80, bottom: 100, left: 80 }}
                                innerRadius={0.5}
                                padAngle={0.7}
                                cornerRadius={3}
                                activeOuterRadiusOffset={8}
                                borderWidth={1}
                                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                                arcLinkLabelsSkipAngle={10}
                                arcLinkLabelsTextColor="#ffffff"
                                arcLinkLabelsThickness={2}
                                arcLinkLabelsColor={{ from: 'color' }}
                                arcLabelsSkipAngle={10}
                                arcLabelsTextColor="#ffffff"
                                defs={[
                                    {
                                        id: 'dots',
                                        type: 'patternDots',
                                        background: 'inherit',
                                        color: 'rgba(255, 255, 255, 0.3)',
                                        size: 4,
                                        padding: 1,
                                        stagger: true
                                    },
                                    {
                                        id: 'lines',
                                        type: 'patternLines',
                                        background: 'inherit',
                                        color: 'rgba(255, 255, 255, 0.3)',
                                        rotation: -45,
                                        lineWidth: 6,
                                        spacing: 10
                                    }
                                ]}
                                fill={[
                                    { match: { id: 'Compra' }, id: 'dots' },
                                    { match: { id: 'Venta' }, id: 'lines' },
                                    { match: { id: 'Manufactura' }, id: 'dots' }
                                ]}
                                legends={[
                                    {
                                        anchor: 'bottom',
                                        direction: 'row',
                                        justify: false,
                                        translateX: 0,
                                        translateY: 70,
                                        itemsSpacing: 0,
                                        itemWidth: 100,
                                        itemHeight: 18,
                                        itemTextColor: '#ffffff',
                                        itemDirection: 'left-to-right',
                                        itemOpacity: 1,
                                        symbolSize: 18,
                                        symbolShape: 'circle'
                                    }
                                ]}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Gráfico de compañías por año */}
                <Card>
                    <CardHeader>
                        <CardTitle>Compañías por Año Cerrado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[500px]">
                            <ResponsiveLine
                                data={lineData}
                                margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
                                xScale={{ type: 'point' }}
                                yScale={{
                                    type: 'linear',
                                    min: 'auto',
                                    max: 'auto',
                                    stacked: true,
                                    reverse: false
                                }}
                                yFormat=" >-.2f"
                                axisTop={null}
                                axisRight={null}
                                axisBottom={{
                                    tickSize: 5,
                                    tickPadding: 5,
                                    tickRotation: 0,
                                    legend: 'Año',
                                    legendOffset: 36,
                                    legendPosition: 'middle',
                                    tickColor: '#ffffff',
                                    legendColor: '#ffffff'
                                }}
                                axisLeft={{
                                    tickSize: 5,
                                    tickPadding: 5,
                                    tickRotation: 0,
                                    legend: 'Cantidad',
                                    legendOffset: -40,
                                    legendPosition: 'middle',
                                    tickColor: '#ffffff',
                                    legendColor: '#ffffff'
                                }}
                                theme={{
                                    axis: {
                                        ticks: {
                                            text: { fill: '#ffffff' }
                                        },
                                        legend: {
                                            text: { fill: '#ffffff' }
                                        },
                                        grid: {
                                            line: {
                                                stroke: 'rgba(255, 255, 255, 0.2)'
                                            }
                                        }
                                    }
                                }}
                                pointSize={10}
                                pointColor={{ theme: 'background' }}
                                pointBorderWidth={2}
                                pointBorderColor={{ from: 'serieColor' }}
                                pointLabelYOffset={-12}
                                useMesh={true}
                                colors={{ scheme: 'category10' }}
                                lineWidth={3}
                                layers={['grid', 'markers', 'axes', 'areas', 'crosshair', 'lines', 'points', 'slices', 'mesh', 'legends']}
                                curve="linear"
                                enableGridX={true}
                                enableGridY={true}
                                enablePoints={true}
                                enablePointLabel={false}
                                pointLabel={(point) => `${point.data.yFormatted}`}
                                enableArea={false}
                                areaOpacity={0.1}
                                areaBlendMode="normal"
                                areaBaselineValue={0}
                                legends={[]}
                                isInteractive={true}
                                debugMesh={false}
                                tooltip={({ point }) => (
                                    <div style={{
                                        padding: 12,
                                        color: 'hsl(var(--foreground))',
                                        background: 'hsl(var(--background))',
                                        borderRadius: 4,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    }}>
                                        <strong>Año:</strong> {point.data.xFormatted}
                                        <br />
                                        <strong>Compañías:</strong> {point.data.yFormatted}
                                    </div>
                                )}
                                enableSlices={false}
                                debugSlices={false}
                                sliceTooltip={({ slice }) => (
                                    <div style={{
                                        padding: 12,
                                        color: 'hsl(var(--foreground))',
                                        background: 'hsl(var(--background))',
                                        borderRadius: 4,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    }}>
                                        <strong>{slice.id}:</strong> {slice.value}
                                    </div>
                                )}
                                enableCrosshair={true}
                                crosshairType="x"
                                role="application"
                                defs={[]}
                                fill={[]}
                                animate={true}
                                motionConfig="gentle"
                            />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </ErrorBoundary>
    )
}
