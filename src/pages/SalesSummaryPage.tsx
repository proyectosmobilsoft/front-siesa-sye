import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Modal } from '@/components/ui/modal'
import { useSalesSummary } from '@/hooks/useReports'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveLine } from '@nivo/line'
import { ResponsiveScatterPlot } from '@nivo/scatterplot'
import { formatters } from '@/utils/formatters'
import { CountUp } from '@/components/ui/count-up'
import { DataTable } from '@/components/dashboard/DataTable'
import {
    DollarSign,
    Package,
    FileText,
    Trophy,
    TrendingUp,
    BarChart3,
    PieChart,
    Layers,
    LineChart,
    Activity,
    ChevronRight,
    ArrowRight
} from 'lucide-react'

type ChartKey = 'vendor-bar' | 'vendor-pie' | 'stacked-units' | 'hour-evolution' | 'scatter'

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
    const { data: sales, isLoading, error, refetch } = useSalesSummary()

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
                vendedorFull: vendor,
                ventas: total,
                color: colorPalette[index % colorPalette.length]
            }))
            .sort((a, b) => b.ventas - a.ventas)
        : []

    // 2. Gráfico de pastel/donut: Distribución del total de ventas por vendedor
    const pieData = salesByVendorData.map((item) => ({
        id: item.vendedor,
        label: item.vendedor,
        value: item.ventas,
        color: item.color
    }))

    const totalSales = pieData.reduce((acc, item) => acc + item.value, 0)

    // 3. Gráfico de columnas apiladas: Vendedor vs Unidades agrupadas por tipo de documento
    // Nota: los "top" vendedores se toman por valor total vendido (salesByVendorData ya
    // viene ordenado desc), no por orden de aparición en el array de ventas.
    const stackedBarData = sales && Array.isArray(sales)
        ? (() => {
            const vendors = salesByVendorData
                .slice(0, 8) // Top 8 vendedores por valor vendido
                .map(v => v.vendedorFull)
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
            // Top 5 vendedores por valor vendido (no por orden de aparición en los datos)
            const vendors = salesByVendorData.slice(0, 5).map(v => v.vendedorFull)
            
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

    // Datos clave para las cards resumen (usadas en el grid clicable)
    const topDocType = sales && Array.isArray(sales)
        ? Object.entries(
            sales.reduce((acc, sale) => {
                const type = sale['Desc. grupo clase docto.'] || 'Sin Tipo'
                const units = sale['Numero de unidades docto'] || 0
                acc[type] = (acc[type] || 0) + units
                return acc
            }, {} as Record<string, number>)
        ).sort((a, b) => b[1] - a[1])[0]
        : null

    const peakHour = evolutionByHourData[0]?.data.length
        ? evolutionByHourData[0].data.reduce((max, point) =>
            (point.y as number) > (max.y as number) ? point : max
        )
        : null

    const topVendorAvgTicket = scatterData.length > 0
        ? (() => {
            const first = scatterData[0]
            const units = first.data.reduce((sum, d) => sum + d.x, 0)
            const total = first.data.reduce((sum, d) => sum + d.y, 0)
            return units > 0 ? total / units : 0
        })()
        : 0

    const [openChart, setOpenChart] = useState<ChartKey | null>(null)

    if (isLoading) {
        return (
            <div className="flex-1 space-y-6 p-6">
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
                <ErrorState
                    title="Error al cargar resumen de ventas"
                    message={`No se pudieron obtener los datos. Error: ${error.message}`}
                    onRetry={() => refetch()}
                />
            </div>
        )
    }

    return (
        <ErrorBoundary>
            <div className="flex-1 space-y-6 p-6">
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
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Total Vendido
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
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
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Unidades Vendidas
                                </CardTitle>
                                <Package className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
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
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Documentos Únicos
                                </CardTitle>
                                <FileText className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
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
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Top Vendedor
                                </CardTitle>
                                <Trophy className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold truncate">
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
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Producto Top
                                </CardTitle>
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold truncate">
                                    {topProduct ? (topProduct[0].length > 20 ? topProduct[0].substring(0, 20) + '...' : topProduct[0]) : 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {topProduct ? `${formatters.number(topProduct[1])} unidades` : 'Sin datos'}
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Cards resumen clicables: cada una abre el detalle completo del gráfico */}
                <motion.div
                    className="grid gap-4 grid-cols-1 md:grid-cols-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    {/* 1. Ventas por Vendedor */}
                    <button
                        type="button"
                        onClick={() => setOpenChart('vendor-bar')}
                        className="text-left"
                    >
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <BarChart3 className="h-5 w-5 text-primary" />
                                    Ventas por Vendedor
                                </CardTitle>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold truncate">
                                    {topVendor ? topVendor.vendedor : 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Top vendedor: {topVendor ? formatters.currency(topVendor.ventas) : 'Sin datos'}
                                </p>
                                <div className="h-24 mt-2">
                                    <ResponsiveBar
                                        data={salesByVendorData.slice(0, 10)}
                                        keys={['ventas']}
                                        indexBy="vendedor"
                                        margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                                        padding={0.3}
                                        colors={(d) => d.data.color}
                                        axisTop={null}
                                        axisRight={null}
                                        axisBottom={null}
                                        axisLeft={null}
                                        enableLabel={false}
                                        enableGridX={false}
                                        enableGridY={false}
                                        isInteractive={false}
                                        animate={false}
                                    />
                                </div>
                                <p className="text-xs font-medium text-primary mt-2 flex items-center gap-1">
                                    Abrir Detalle <ArrowRight className="h-3 w-3" />
                                </p>
                            </CardContent>
                        </Card>
                    </button>

                    {/* 2. Distribución de Ventas por Vendedor */}
                    <button
                        type="button"
                        onClick={() => setOpenChart('vendor-pie')}
                        className="text-left"
                    >
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <PieChart className="h-5 w-5 text-primary" />
                                    Distribución por Vendedor
                                </CardTitle>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold truncate">
                                    {topVendor ? topVendor.vendedor : 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {topVendor && totalSales > 0
                                        ? `${((topVendor.ventas / totalSales) * 100).toFixed(1)}% del total vendido`
                                        : 'Sin datos'}
                                </p>
                                <div className="h-24 mt-2">
                                    <ResponsivePie
                                        data={pieData.slice(0, 8)}
                                        margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                                        innerRadius={0.6}
                                        padAngle={2}
                                        cornerRadius={2}
                                        colors={(d) => d.data.color}
                                        enableArcLinkLabels={false}
                                        enableArcLabels={false}
                                        isInteractive={false}
                                        animate={false}
                                    />
                                </div>
                                <p className="text-xs font-medium text-primary mt-2 flex items-center gap-1">
                                    Abrir Detalle <ArrowRight className="h-3 w-3" />
                                </p>
                            </CardContent>
                        </Card>
                    </button>

                    {/* 3. Unidades por Vendedor y Tipo de Documento */}
                    <button
                        type="button"
                        onClick={() => setOpenChart('stacked-units')}
                        className="text-left"
                    >
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Layers className="h-5 w-5 text-primary" />
                                    Unidades por Tipo de Documento
                                </CardTitle>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold truncate">
                                    {topDocType ? topDocType[0] : 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {topDocType ? `${formatters.number(topDocType[1])} unidades (tipo top)` : 'Sin datos'}
                                </p>
                                <div className="h-24 mt-2">
                                    <ResponsiveBar
                                        data={stackedBarData}
                                        keys={docTypesKeys}
                                        indexBy="vendedor"
                                        margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                                        padding={0.3}
                                        colors={colorPalette}
                                        axisTop={null}
                                        axisRight={null}
                                        axisBottom={null}
                                        axisLeft={null}
                                        enableLabel={false}
                                        enableGridX={false}
                                        enableGridY={false}
                                        isInteractive={false}
                                        animate={false}
                                    />
                                </div>
                                <p className="text-xs font-medium text-primary mt-2 flex items-center gap-1">
                                    Abrir Detalle <ArrowRight className="h-3 w-3" />
                                </p>
                            </CardContent>
                        </Card>
                    </button>

                    {/* 4. Evolución de Ventas por Hora */}
                    <button
                        type="button"
                        onClick={() => setOpenChart('hour-evolution')}
                        className="text-left"
                    >
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <LineChart className="h-5 w-5 text-primary" />
                                    Evolución por Hora
                                </CardTitle>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold truncate">
                                    {peakHour ? `Pico: ${peakHour.x}` : 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {peakHour ? formatters.currency(peakHour.y as number) : 'Sin datos'}
                                </p>
                                <div className="h-24 mt-2">
                                    <ResponsiveLine
                                        data={evolutionByHourData}
                                        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                                        xScale={{ type: 'point' }}
                                        yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                                        axisTop={null}
                                        axisRight={null}
                                        axisBottom={null}
                                        axisLeft={null}
                                        colors={[colors.indigo]}
                                        lineWidth={2}
                                        curve="monotoneX"
                                        enableGridX={false}
                                        enableGridY={false}
                                        enablePoints={false}
                                        enableArea={true}
                                        areaOpacity={0.25}
                                        isInteractive={false}
                                        animate={false}
                                        useMesh={false}
                                    />
                                </div>
                                <p className="text-xs font-medium text-primary mt-2 flex items-center gap-1">
                                    Abrir Detalle <ArrowRight className="h-3 w-3" />
                                </p>
                            </CardContent>
                        </Card>
                    </button>

                    {/* 5. Relación Unidades vs Valor Neto */}
                    <button
                        type="button"
                        onClick={() => setOpenChart('scatter')}
                        className="text-left"
                    >
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Activity className="h-5 w-5 text-primary" />
                                    Unidades vs Valor Neto
                                </CardTitle>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold truncate">
                                    {scatterData[0]?.id ?? 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {scatterData.length > 0
                                        ? `Ticket promedio: ${formatters.currency(topVendorAvgTicket)}`
                                        : 'Sin datos'}
                                </p>
                                <div className="h-24 mt-2">
                                    <ResponsiveScatterPlot
                                        data={scatterData}
                                        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                                        xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                                        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                                        colors={(d) => scatterData.find((s) => s.id === d.serieId)?.color ?? colorPalette[0]}
                                        nodeSize={6}
                                        axisTop={null}
                                        axisRight={null}
                                        axisBottom={null}
                                        axisLeft={null}
                                        isInteractive={false}
                                        animate={false}
                                    />
                                </div>
                                <p className="text-xs font-medium text-primary mt-2 flex items-center gap-1">
                                    Abrir Detalle <ArrowRight className="h-3 w-3" />
                                </p>
                            </CardContent>
                        </Card>
                    </button>
                </motion.div>

                {/* Modal: Ventas por Vendedor */}
                <Modal
                    isOpen={openChart === 'vendor-bar'}
                    onClose={() => setOpenChart(null)}
                    title="Ventas por Vendedor"
                    className="max-w-6xl"
                >
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
                                            }}
                                            axisLeft={{
                                                tickSize: 5,
                                                tickPadding: 5,
                                                tickRotation: 0,
                                                legend: 'Valor Total Vendido',
                                                legendPosition: 'middle',
                                                legendOffset: -60,
                                                format: (value) => formatters.compactCurrency(value),
                                            }}
                                            theme={{
                                                axis: {
                                                    ticks: {
                                                        text: { fill: 'hsl(var(--muted-foreground))' }
                                                    },
                                                    legend: {
                                                        text: { fill: 'hsl(var(--foreground))' }
                                                    },
                                                },
                                                grid: {
                                                    line: {
                                                        stroke: 'hsl(var(--border))',
                                                        strokeWidth: 1,
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
                                            label={(d) => formatters.compactCurrency(d.value)}
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
                </Modal>

                {/* Modal: Distribución de Ventas por Vendedor */}
                <Modal
                    isOpen={openChart === 'vendor-pie'}
                    onClose={() => setOpenChart(null)}
                    title="Distribución de Ventas por Vendedor"
                    className="max-w-4xl"
                >
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
                                        valueFormat={(value) => formatters.compactCurrency(value)}
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
                                        tooltip={({ datum }) => {
                                            const percentage = (datum.value / totalSales * 100).toFixed(2)
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
                                                    <div className="font-semibold">{datum.label}</div>
                                                    <div className="text-sm mt-1">
                                                        {formatters.currency(datum.value)}
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
                </Modal>

                {/* Modal: Unidades por Vendedor y Tipo de Documento */}
                <Modal
                    isOpen={openChart === 'stacked-units'}
                    onClose={() => setOpenChart(null)}
                    title="Unidades por Vendedor y Tipo de Documento"
                    className="max-w-6xl"
                >
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
                                        }}
                                        axisLeft={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: 0,
                                            legend: 'Total de Unidades',
                                            legendPosition: 'middle',
                                            legendOffset: -50,
                                        }}
                                        theme={{
                                            axis: {
                                                ticks: {
                                                    text: { fill: 'hsl(var(--muted-foreground))' }
                                                },
                                                legend: {
                                                    text: { fill: 'hsl(var(--foreground))' }
                                                },
                                            },
                                            grid: {
                                                line: {
                                                    stroke: 'hsl(var(--border))',
                                                    strokeWidth: 1,
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
                </Modal>

                {/* Modal: Evolución de Ventas por Hora */}
                <Modal
                    isOpen={openChart === 'hour-evolution'}
                    onClose={() => setOpenChart(null)}
                    title="Evolución de Ventas por Hora"
                    className="max-w-4xl"
                >
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
                                        yFormat={(value) => formatters.compactCurrency(Number(value))}
                                        axisTop={null}
                                        axisRight={null}
                                        axisBottom={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: -45,
                                            legend: 'Hora del Día',
                                            legendOffset: 36,
                                            legendPosition: 'middle',
                                        }}
                                        axisLeft={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: 0,
                                            legend: 'Valor Neto',
                                            legendOffset: -60,
                                            legendPosition: 'middle',
                                            format: (value) => formatters.currency(Number(value)),
                                        }}
                                        theme={{
                                            axis: {
                                                ticks: {
                                                    text: { fill: 'hsl(var(--muted-foreground))' }
                                                },
                                                legend: {
                                                    text: { fill: 'hsl(var(--foreground))' }
                                                },
                                            },
                                            grid: {
                                                line: {
                                                    stroke: 'hsl(var(--border))',
                                                    strokeWidth: 1,
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
                </Modal>

                {/* Modal: Relación Unidades vs Valor Neto */}
                <Modal
                    isOpen={openChart === 'scatter'}
                    onClose={() => setOpenChart(null)}
                    title="Relación: Unidades vs Valor Neto (por Vendedor)"
                    className="max-w-6xl"
                >
                                <div className="h-[400px]">
                                    <ResponsiveScatterPlot
                                        data={scatterData}
                                        margin={{ top: 60, right: 140, bottom: 70, left: 90 }}
                                        xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                                        xFormat={(value) => `${value} unidades`}
                                        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                                        yFormat={(value) => formatters.compactCurrency(Number(value))}
                                        colors={(d) => scatterData.find((s) => s.id === d.serieId)?.color ?? colorPalette[0]}
                                        blendMode="normal"
                                        nodeSize={14}
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
                                        }}
                                        axisLeft={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: 0,
                                            legend: 'Valor Neto del Documento',
                                            legendPosition: 'middle',
                                            legendOffset: -70,
                                            format: (value) => formatters.compactCurrency(value),
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
                                            },
                                            grid: {
                                                line: {
                                                    stroke: 'hsl(var(--border))',
                                                    strokeWidth: 1,
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
                </Modal>
            </div>
        </ErrorBoundary>
    )
}
