import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useSalesSummary } from '@/hooks/useReports'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveLine } from '@nivo/line'
import { ResponsiveScatterPlot } from '@nivo/scatterplot'
import { SalesSummary } from '@/api/types'
import { formatters } from '@/utils/formatters'
import { CountUp } from '@/components/ui/count-up'
import { DataTable } from '@/components/dashboard/DataTable'
import { 
    DollarSign, 
    Package, 
    FileText, 
    Trophy, 
    TrendingUp,
    Users,
    BarChart3,
    PieChart,
    Layers,
    LineChart,
    Activity
} from 'lucide-react'

// Colores Tailwind para las gráficas
const colors = {
    indigo: '#6366f1',
    emerald: '#10b981',
    rose: '#f43f5e',
    amber: '#f59e0b',
    violet: '#8b5cf6',
    cyan: '#06b6d4',
    orange: '#fb923c',
    pink: '#ec4899',
}

const colorPalette = [colors.indigo, colors.emerald, colors.rose, colors.amber, colors.violet, colors.cyan, colors.orange, colors.pink]

export const SalesSummaryPage = () => {
    const { data: sales, isLoading, error } = useSalesSummary()

    // Función helper para obtener hora de la fecha
    const getHour = (dateString: string): string => {
        if (!dateString) return ''
        try {
            const date = new Date(dateString)
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
        } catch {
            return ''
        }
    }

    // Función helper para obtener solo la hora (HH:00)
    const getHourOnly = (dateString: string): string => {
        if (!dateString) return ''
        try {
            const date = new Date(dateString)
            return `${date.getHours().toString().padStart(2, '0')}:00`
        } catch {
            return ''
        }
    }

    // 1. Gráfico de barras comparativo: Vendedor vs Valor total vendido
    const salesByVendorData = sales && Array.isArray(sales)
        ? Object.entries(
            sales.reduce((acc, sale) => {
                const vendor = sale['Vendedor'] || 'Sin Vendedor'
                const value = sale['Vlr. Neto documento'] || 0
                acc[vendor] = (acc[vendor] || 0) + value
                return acc
            }, {} as Record<string, number>)
        )
            .map(([vendor, total], index) => ({
                vendedor: vendor.length > 25 ? vendor.substring(0, 25) + '...' : vendor,
                ventas: total,
                color: colorPalette[index % colorPalette.length]
            }))
            .sort((a, b) => b.ventas - a.ventas)
        : []

    // 2. Gráfico de pastel/donut: Distribución del total de ventas por vendedor
    const pieData = salesByVendorData.map((item, index) => ({
        id: item.vendedor,
        label: item.vendedor,
        value: item.ventas,
        color: item.color
    }))

    const totalSales = pieData.reduce((acc, item) => acc + item.value, 0)

    // 3. Gráfico de columnas apiladas: Vendedor vs Unidades agrupadas por tipo de documento
    const stackedBarData = sales && Array.isArray(sales)
        ? (() => {
            const vendors = Array.from(new Set(sales.map(s => s['Vendedor']).filter(Boolean)))
                .slice(0, 8) // Top 8 vendedores
            const docTypes = Array.from(new Set(sales.map(s => s['Desc. grupo clase docto.']).filter(Boolean)))
            
            return vendors.map(vendor => {
                const vendorSales = sales.filter(s => s['Vendedor'] === vendor)
                const result: Record<string, number | string> = {
                    vendedor: vendor.length > 20 ? vendor.substring(0, 20) + '...' : vendor
                }
                
                docTypes.forEach(type => {
                    const typeSales = vendorSales.filter(s => s['Desc. grupo clase docto.'] === type)
                    result[type] = typeSales.reduce((acc, s) => acc + (s['Numero de unidades docto'] || 0), 0)
                })

                return result
            })
        })()
        : []

    const docTypesKeys = sales && Array.isArray(sales)
        ? Array.from(new Set(sales.map(s => s['Desc. grupo clase docto.']).filter(Boolean)))
        : []

    // 4. Gráfico de líneas/área: Evolución del valor neto por hora
    const evolutionByHourData = sales && Array.isArray(sales)
        ? (() => {
            const hourSales: Record<string, number> = {}
            
            sales.forEach((sale) => {
                const hour = getHourOnly(sale['Fecha documento'])
                if (hour) {
                    hourSales[hour] = (hourSales[hour] || 0) + (sale['Vlr. Neto documento'] || 0)
                }
            })

            const sortedHours = Object.keys(hourSales).sort()

            return [{
                id: 'Ventas por Hora',
                data: sortedHours.map(hour => ({
                    x: hour,
                    y: hourSales[hour]
                }))
            }]
        })()
        : []

    // 5. Gráfico de dispersión: Relación entre unidades y valor neto, coloreado por vendedor
    const scatterData = sales && Array.isArray(sales)
        ? (() => {
            const vendors = Array.from(new Set(sales.map(s => s['Vendedor']).filter(Boolean)))
                .slice(0, 5) // Top 5 vendedores para mejor visualización
            
            return vendors.map((vendor, index) => ({
                id: vendor,
                data: sales
                    .filter(s => s['Vendedor'] === vendor)
                    .map(sale => ({
                        x: sale['Numero de unidades docto'] || 0,
                        y: sale['Vlr. Neto documento'] || 0,
                        product: sale['Item resumen'] || 'Sin Producto'
                    }))
                    .filter(point => point.x > 0 && point.y > 0),
                color: colorPalette[index % colorPalette.length]
            }))
        })()
        : []

    // Calcular estadísticas para las cards
    const totalSalesAmount = sales && Array.isArray(sales)
        ? sales.reduce((acc, sale) => acc + (sale['Vlr. Neto documento'] || 0), 0)
        : 0
    
    const totalUnitsSold = sales && Array.isArray(sales)
        ? sales.reduce((acc, sale) => acc + (sale['Numero de unidades docto'] || 0), 0)
        : 0
    
    const uniqueDocuments = sales && Array.isArray(sales)
        ? new Set(sales.map(s => s['Guid documento'])).size
        : 0
    
    const topVendor = salesByVendorData.length > 0 ? salesByVendorData[0] : null
    
    const topProduct = sales && Array.isArray(sales)
        ? Object.entries(
            sales.reduce((acc, sale) => {
                const product = sale['Item resumen'] || 'Sin Producto'
                const units = sale['Numero de unidades docto'] || 0
                acc[product] = (acc[product] || 0) + units
                return acc
            }, {} as Record<string, number>)
        )
            .sort((a, b) => b[1] - a[1])[0]
        : null

    if (isLoading) {
        return (
            <div className="flex-1 space-y-6 p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Resumen de Ventas</h1>
                        <p className="text-muted-foreground">
                            Análisis detallado de ventas, productos y vendedores
                        </p>
                    </div>
                </motion.div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-32" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-[500px] w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-6 p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Resumen de Ventas</h1>
                        <p className="text-muted-foreground">
                            Análisis detallado de ventas
                        </p>
                    </div>
                </motion.div>
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                    <CardHeader>
                        <CardTitle className="text-red-800 dark:text-red-400">Error al cargar resumen de ventas</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-64">
                        <div className="text-center text-red-600 dark:text-red-400">
                            <p className="text-lg font-medium">No se pudieron obtener los datos</p>
                            <p className="text-sm mt-2">Error: {error.message}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <ErrorBoundary>
            <div className="flex-1 space-y-6 p-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Resumen de Ventas</h1>
                        <p className="text-muted-foreground">
                            Análisis detallado de ventas, productos y vendedores con visualizaciones interactivas
                        </p>
                    </div>
                </motion.div>

                {/* Cards de Estadísticas */}
                <motion.div
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    {/* Total general vendido */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                    Total Vendido
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                                    <CountUp end={totalSalesAmount} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatters.currency(totalSalesAmount)}
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Total unidades vendidas */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                    Unidades Vendidas
                                </CardTitle>
                                <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                                    <CountUp end={totalUnitsSold} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatters.number(totalUnitsSold)} unidades
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Total documentos únicos */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        <Card className="border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-rose-700 dark:text-rose-300">
                                    Documentos Únicos
                                </CardTitle>
                                <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-rose-900 dark:text-rose-100">
                                    <CountUp end={uniqueDocuments} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatters.number(uniqueDocuments)} documentos
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Vendedor con mayor venta */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                    >
                        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                    Top Vendedor
                                </CardTitle>
                                <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold text-amber-900 dark:text-amber-100 truncate">
                                    {topVendor ? topVendor.vendedor : 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {topVendor ? formatters.currency(topVendor.ventas) : 'Sin datos'}
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Producto más vendido */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                    >
                        <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-violet-700 dark:text-violet-300">
                                    Producto Top
                                </CardTitle>
                                <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold text-violet-900 dark:text-violet-100 truncate">
                                    {topProduct ? (topProduct[0].length > 20 ? topProduct[0].substring(0, 20) + '...' : topProduct[0]) : 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {topProduct ? `${formatters.number(topProduct[1])} unidades` : 'Sin datos'}
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Gráficos */}
                <motion.div
                    className="grid gap-6 grid-cols-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    {/* 1. Gráfico de barras comparativo */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        <Card className="hover:shadow-lg transition-shadow rounded-xl border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                                    Ventas por Vendedor
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="h-[400px]">
                                        <ResponsiveBar
                                            data={salesByVendorData.slice(0, 10)}
                                            keys={['ventas']}
                                            indexBy="vendedor"
                                            margin={{ top: 50, right: 50, bottom: 100, left: 80 }}
                                            padding={0.3}
                                            valueScale={{ type: 'linear' }}
                                            indexScale={{ type: 'band', round: true }}
                                            colors={(d) => d.data.color}
                                            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                                            axisTop={null}
                                            axisRight={null}
                                            axisBottom={{
                                                tickSize: 5,
                                                tickPadding: 5,
                                                tickRotation: -45,
                                                legend: 'Vendedor',
                                                legendPosition: 'middle',
                                                legendOffset: 80,
                                                tickColor: 'hsl(var(--muted-foreground))',
                                                legendColor: 'hsl(var(--foreground))',
                                            }}
                                            axisLeft={{
                                                tickSize: 5,
                                                tickPadding: 5,
                                                tickRotation: 0,
                                                legend: 'Valor Total Vendido',
                                                legendPosition: 'middle',
                                                legendOffset: -60,
                                                format: (value) => formatters.currency(value),
                                                tickColor: 'hsl(var(--muted-foreground))',
                                                legendColor: 'hsl(var(--foreground))',
                                            }}
                                            theme={{
                                                axis: {
                                                    ticks: {
                                                        text: { fill: 'hsl(var(--muted-foreground))' }
                                                    },
                                                    legend: {
                                                        text: { fill: 'hsl(var(--foreground))' }
                                                    },
                                                    grid: {
                                                        line: {
                                                            stroke: 'hsl(var(--border))',
                                                            strokeWidth: 1,
                                                        }
                                                    }
                                                },
                                                tooltip: {
                                                    container: {
                                                        background: 'hsl(var(--card))',
                                                        color: 'hsl(var(--foreground))',
                                                        border: '1px solid hsl(var(--border))',
                                                        borderRadius: 8,
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                    }
                                                }
                                            }}
                                            labelSkipWidth={12}
                                            labelSkipHeight={12}
                                            labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                                            label={(d) => formatters.currency(d.value)}
                                            animate={true}
                                            motionConfig="gentle"
                                            tooltip={(tooltip) => (
                                                <div
                                                    style={{
                                                        padding: 12,
                                                        background: 'hsl(var(--card))',
                                                        border: '1px solid hsl(var(--border))',
                                                        borderRadius: 8,
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                        color: 'hsl(var(--foreground))',
                                                    }}
                                                >
                                                    <div className="font-semibold">{tooltip.indexValue}</div>
                                                    <div className="text-sm mt-1">
                                                        {formatters.currency(tooltip.value as number)}
                                                    </div>
                                                </div>
                                            )}
                                        />
                                    </div>
                                    {/* Tabla de datos: Ventas por Vendedor */}
                                    <div className="h-[400px] flex flex-col">
                                        <DataTable
                                            title="Datos base: Ventas por Vendedor"
                                            columns={[
                                                { header: 'Vendedor', accessor: 'vendedor', align: 'left' },
                                                { header: 'Valor Neto Total', accessor: 'ventas', align: 'right', format: (v) => formatters.currency(v) },
                                            ]}
                                            data={salesByVendorData.slice(0, 10)}
                                            showTotalRow={true}
                                            totalLabel="Total Ventas"
                                            totalAccessor="ventas"
                                            exportFilename="ventas_por_vendedor"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* 2. Gráfico de pastel/donut */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                    >
                        <Card className="hover:shadow-lg transition-shadow rounded-xl border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="h-5 w-5 text-emerald-600" />
                                    Distribución de Ventas por Vendedor
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[400px]">
                                    <ResponsivePie
                                        data={pieData.slice(0, 8)}
                                        margin={{ top: 40, right: 80, bottom: 120, left: 80 }}
                                        innerRadius={0.6}
                                        padAngle={2}
                                        cornerRadius={4}
                                        activeOuterRadiusOffset={8}
                                        borderWidth={1}
                                        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                                        arcLinkLabelsSkipAngle={10}
                                        arcLinkLabelsTextColor="hsl(var(--foreground))"
                                        arcLinkLabelsThickness={2}
                                        arcLinkLabelsColor={{ from: 'color' }}
                                        arcLabelsSkipAngle={10}
                                        arcLabelsTextColor="hsl(var(--background))"
                                        valueFormat={(value) => formatters.currency(value)}
                                        colors={(d) => d.data.color}
                                        legends={[
                                            {
                                                anchor: 'bottom',
                                                direction: 'row',
                                                justify: false,
                                                translateX: 0,
                                                translateY: 70,
                                                itemsSpacing: 12,
                                                itemWidth: 80,
                                                itemHeight: 20,
                                                itemTextColor: 'hsl(var(--foreground))',
                                                itemDirection: 'left-to-right',
                                                itemOpacity: 1,
                                                symbolSize: 14,
                                                symbolShape: 'circle',
                                                effects: [
                                                    {
                                                        on: 'hover',
                                                        style: {
                                                            itemTextColor: 'hsl(var(--foreground))',
                                                            itemOpacity: 1,
                                                        },
                                                    },
                                                ],
                                            },
                                        ]}
                                        theme={{
                                            labels: {
                                                text: {
                                                    fontSize: 11,
                                                }
                                            },
                                            legends: {
                                                text: {
                                                    fontSize: 11,
                                                }
                                            }
                                        }}
                                        tooltip={(tooltip) => {
                                            const percentage = ((tooltip.value as number) / totalSales * 100).toFixed(2)
                                            return (
                                                <div
                                                    style={{
                                                        padding: 12,
                                                        background: 'hsl(var(--card))',
                                                        border: '1px solid hsl(var(--border))',
                                                        borderRadius: 8,
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                        color: 'hsl(var(--foreground))',
                                                    }}
                                                >
                                                    <div className="font-semibold">{tooltip.label}</div>
                                                    <div className="text-sm mt-1">
                                                        {formatters.currency(tooltip.value as number)}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {percentage}% del total
                                                    </div>
                                                </div>
                                            )
                                        }}
                                        animate={true}
                                        motionConfig="gentle"
                                    />
                                </div>
                                {/* Tabla de datos: Distribución de Ventas por Vendedor */}
                                <div className="mt-6">
                                    <DataTable
                                        title="Datos base: Distribución de Ventas por Vendedor"
                                        columns={[
                                            { header: 'Vendedor', accessor: 'label', align: 'left' },
                                            { header: 'Valor Neto', accessor: 'value', align: 'right', format: (v) => formatters.currency(v) },
                                            { header: 'Porcentaje', accessor: (row) => {
                                                const percent = ((row.value / totalSales) * 100).toFixed(2)
                                                return `${percent}%`
                                            }, align: 'right' },
                                        ]}
                                        data={pieData}
                                        showTotalRow={true}
                                        totalLabel="Total Ventas"
                                        totalAccessor="value"
                                        exportFilename="distribucion_ventas_vendedor"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* 3. Gráfico de columnas apiladas */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                    >
                        <Card className="hover:shadow-lg transition-shadow rounded-xl border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-rose-600" />
                                    Unidades por Vendedor y Tipo de Documento
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[400px]">
                                    <ResponsiveBar
                                        data={stackedBarData}
                                        keys={docTypesKeys}
                                        indexBy="vendedor"
                                        margin={{ top: 50, right: 130, bottom: 100, left: 60 }}
                                        padding={0.3}
                                        valueScale={{ type: 'linear' }}
                                        indexScale={{ type: 'band', round: true }}
                                        colors={colorPalette}
                                        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                                        axisTop={null}
                                        axisRight={null}
                                        axisBottom={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: -45,
                                            legend: 'Vendedor',
                                            legendPosition: 'middle',
                                            legendOffset: 80,
                                            tickColor: 'hsl(var(--muted-foreground))',
                                            legendColor: 'hsl(var(--foreground))',
                                        }}
                                        axisLeft={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: 0,
                                            legend: 'Total de Unidades',
                                            legendPosition: 'middle',
                                            legendOffset: -50,
                                            tickColor: 'hsl(var(--muted-foreground))',
                                            legendColor: 'hsl(var(--foreground))',
                                        }}
                                        theme={{
                                            axis: {
                                                ticks: {
                                                    text: { fill: 'hsl(var(--muted-foreground))' }
                                                },
                                                legend: {
                                                    text: { fill: 'hsl(var(--foreground))' }
                                                },
                                                grid: {
                                                    line: {
                                                        stroke: 'hsl(var(--border))',
                                                        strokeWidth: 1,
                                                    }
                                                }
                                            },
                                            tooltip: {
                                                container: {
                                                    background: 'hsl(var(--card))',
                                                    color: 'hsl(var(--foreground))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: 8,
                                                }
                                            }
                                        }}
                                        labelSkipWidth={12}
                                        labelSkipHeight={12}
                                        animate={true}
                                        motionConfig="gentle"
                                        tooltip={(tooltip) => (
                                            <div
                                                style={{
                                                    padding: 12,
                                                    background: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: 8,
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                    color: 'hsl(var(--foreground))',
                                                }}
                                            >
                                                <div className="font-semibold">{tooltip.id}</div>
                                                <div className="text-sm mt-1">
                                                    {formatters.number(tooltip.value as number)} unidades
                                                </div>
                                            </div>
                                        )}
                                        legends={[
                                            {
                                                dataFrom: 'keys',
                                                anchor: 'bottom-right',
                                                direction: 'column',
                                                justify: false,
                                                translateX: 120,
                                                translateY: 0,
                                                itemsSpacing: 2,
                                                itemWidth: 100,
                                                itemHeight: 20,
                                                itemDirection: 'left-to-right',
                                                itemOpacity: 0.85,
                                                symbolSize: 14,
                                                itemTextColor: 'hsl(var(--foreground))',
                                            }
                                        ]}
                                    />
                                </div>
                                {/* Tabla de datos: Unidades por Vendedor y Tipo de Documento */}
                                <div className="mt-6">
                                    <DataTable
                                        title="Datos base: Unidades por Vendedor y Tipo de Documento"
                                        columns={[
                                            { header: 'Vendedor', accessor: 'vendedor', align: 'left' },
                                            ...docTypesKeys.map(type => ({
                                                header: type,
                                                accessor: type,
                                                align: 'right' as const,
                                                format: (v: number) => formatters.number(v)
                                            }))
                                        ]}
                                        data={stackedBarData}
                                        exportFilename="unidades_por_vendedor_tipo_doc"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* 4. Gráfico de líneas/área */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.7 }}
                    >
                        <Card className="hover:shadow-lg transition-shadow rounded-xl border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <LineChart className="h-5 w-5 text-amber-600" />
                                    Evolución de Ventas por Hora
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[400px]">
                                    <ResponsiveLine
                                        data={evolutionByHourData}
                                        margin={{ top: 50, right: 110, bottom: 50, left: 80 }}
                                        xScale={{ type: 'point' }}
                                        yScale={{
                                            type: 'linear',
                                            min: 'auto',
                                            max: 'auto',
                                            stacked: false,
                                            reverse: false,
                                        }}
                                        yFormat={(value) => formatters.currency(Number(value))}
                                        axisTop={null}
                                        axisRight={null}
                                        axisBottom={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: -45,
                                            legend: 'Hora del Día',
                                            legendOffset: 36,
                                            legendPosition: 'middle',
                                            tickColor: 'hsl(var(--muted-foreground))',
                                            legendColor: 'hsl(var(--foreground))',
                                        }}
                                        axisLeft={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: 0,
                                            legend: 'Valor Neto',
                                            legendOffset: -60,
                                            legendPosition: 'middle',
                                            format: (value) => formatters.currency(Number(value)),
                                            tickColor: 'hsl(var(--muted-foreground))',
                                            legendColor: 'hsl(var(--foreground))',
                                        }}
                                        theme={{
                                            axis: {
                                                ticks: {
                                                    text: { fill: 'hsl(var(--muted-foreground))' }
                                                },
                                                legend: {
                                                    text: { fill: 'hsl(var(--foreground))' }
                                                },
                                                grid: {
                                                    line: {
                                                        stroke: 'hsl(var(--border))',
                                                        strokeWidth: 1,
                                                    }
                                                }
                                            },
                                            tooltip: {
                                                container: {
                                                    background: 'hsl(var(--card))',
                                                    color: 'hsl(var(--foreground))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: 8,
                                                }
                                            }
                                        }}
                                        pointSize={10}
                                        pointColor={colors.indigo}
                                        pointBorderWidth={2}
                                        pointBorderColor={{ from: 'serieColor' }}
                                        pointLabelYOffset={-12}
                                        useMesh={true}
                                        colors={[colors.indigo]}
                                        lineWidth={3}
                                        curve="monotoneX"
                                        enableGridX={true}
                                        enableGridY={true}
                                        enablePoints={true}
                                        enablePointLabel={false}
                                        enableArea={true}
                                        areaOpacity={0.3}
                                        areaBlendMode="normal"
                                        areaBaselineValue={0}
                                        animate={true}
                                        motionConfig="gentle"
                                        tooltip={({ point }) => (
                                            <div
                                                style={{
                                                    padding: 12,
                                                    background: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: 8,
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                    color: 'hsl(var(--foreground))',
                                                }}
                                            >
                                                <div className="font-semibold">Hora: {point.data.xFormatted}</div>
                                                <div className="text-sm mt-1">
                                                    {formatters.currency(Number(point.data.yFormatted))}
                                                </div>
                                            </div>
                                        )}
                                    />
                                </div>
                                {/* Tabla de datos: Evolución de Ventas por Hora */}
                                <div className="mt-6">
                                    <DataTable
                                        title="Datos base: Evolución de Ventas por Hora"
                                        columns={[
                                            { header: 'Hora', accessor: (row) => row.x, align: 'left' },
                                            { header: 'Valor Neto', accessor: (row) => row.y, align: 'right', format: (v) => formatters.currency(v) },
                                        ]}
                                        data={evolutionByHourData[0]?.data || []}
                                        showTotalRow={true}
                                        totalLabel="Total Ventas"
                                        totalAccessor={(row) => row.y}
                                        exportFilename="evolucion_ventas_hora"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* 5. Gráfico de dispersión */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                    >
                        <Card className="hover:shadow-lg transition-shadow rounded-xl border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-violet-600" />
                                    Relación: Unidades vs Valor Neto (por Vendedor)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[400px]">
                                    <ResponsiveScatterPlot
                                        data={scatterData}
                                        margin={{ top: 60, right: 140, bottom: 70, left: 90 }}
                                        xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                                        xFormat={(value) => `${value} unidades`}
                                        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                                        yFormat={(value) => formatters.currency(Number(value))}
                                        colors={(d) => d.color}
                                        blendMode="normal"
                                        nodeSize={14}
                                        nodeOpacity={0.9}
                                        nodeBorderWidth={2}
                                        nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
                                        axisTop={null}
                                        axisRight={null}
                                        axisBottom={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: 0,
                                            legend: 'Número de Unidades',
                                            legendPosition: 'middle',
                                            legendOffset: 46,
                                            format: (value) => formatters.number(value),
                                            tickColor: 'hsl(var(--muted-foreground))',
                                            legendColor: 'hsl(var(--foreground))',
                                        }}
                                        axisLeft={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: 0,
                                            legend: 'Valor Neto del Documento',
                                            legendPosition: 'middle',
                                            legendOffset: -70,
                                            format: (value) => formatters.currency(value),
                                            tickColor: 'hsl(var(--muted-foreground))',
                                            legendColor: 'hsl(var(--foreground))',
                                        }}
                                        legends={[
                                            {
                                                anchor: 'bottom-right',
                                                direction: 'column',
                                                justify: false,
                                                translateX: 130,
                                                translateY: 0,
                                                itemWidth: 100,
                                                itemHeight: 14,
                                                itemsSpacing: 6,
                                                itemDirection: 'left-to-right',
                                                symbolSize: 14,
                                                symbolShape: 'circle',
                                                itemTextColor: 'hsl(var(--foreground))',
                                            }
                                        ]}
                                        theme={{
                                            axis: {
                                                ticks: {
                                                    text: { fill: 'hsl(var(--muted-foreground))' }
                                                },
                                                legend: {
                                                    text: { fill: 'hsl(var(--foreground))' }
                                                },
                                                grid: {
                                                    line: {
                                                        stroke: 'hsl(var(--border))',
                                                        strokeWidth: 1,
                                                    }
                                                }
                                            },
                                            tooltip: {
                                                container: {
                                                    background: 'hsl(var(--card))',
                                                    color: 'hsl(var(--foreground))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: 8,
                                                }
                                            },
                                            legends: {
                                                text: {
                                                    fontSize: 10,
                                                    fontFamily: 'inherit',
                                                }
                                            }
                                        }}
                                        animate={true}
                                        motionConfig="gentle"
                                        tooltip={({ node }) => (
                                            <div
                                                style={{
                                                    padding: 12,
                                                    background: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: 8,
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                    color: 'hsl(var(--foreground))',
                                                }}
                                            >
                                                <div className="font-semibold">{node.serieId}</div>
                                                <div className="text-sm mt-1">
                                                    <div>Unidades: {formatters.number(node.data.x)}</div>
                                                    <div>Valor: {formatters.currency(node.data.y)}</div>
                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                        Producto: {(node.data as any).product?.length > 30 
                                                            ? (node.data as any).product.substring(0, 30) + '...'
                                                            : (node.data as any).product || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    />
                                </div>
                                {/* Tabla de datos: Relación Unidades vs Valor Neto */}
                                <div className="mt-6">
                                    <DataTable
                                        title="Datos base: Relación Unidades vs Valor Neto (por Vendedor)"
                                        columns={[
                                            { header: 'Vendedor', accessor: 'id', align: 'left' },
                                            { header: 'Unidades', accessor: (row) => row.data.reduce((sum: number, d: any) => sum + d.x, 0), align: 'right', format: (v) => formatters.number(v) },
                                            { header: 'Valor Neto Total', accessor: (row) => row.data.reduce((sum: number, d: any) => sum + d.y, 0), align: 'right', format: (v) => formatters.currency(v) },
                                            { header: 'Promedio por Unidad', accessor: (row) => {
                                                const units = row.data.reduce((sum: number, d: any) => sum + d.x, 0)
                                                const total = row.data.reduce((sum: number, d: any) => sum + d.y, 0)
                                                return units > 0 ? total / units : 0
                                            }, align: 'right', format: (v) => formatters.currency(v) },
                                        ]}
                                        data={scatterData}
                                        exportFilename="relacion_unidades_valor_neto"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </ErrorBoundary>
    )
}
