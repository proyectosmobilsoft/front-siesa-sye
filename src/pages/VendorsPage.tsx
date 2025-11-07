import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useVendors } from '@/hooks/useReports'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveLine } from '@nivo/line'
import { Vendor } from '@/api/types'
import { formatters } from '@/utils/formatters'
import { CountUp } from '@/components/ui/count-up'
import { DataTable } from '@/components/dashboard/DataTable'
import { 
    DollarSign, 
    TrendingUp,
    FileText,
    BarChart3,
    PieChart,
    Layers,
    Filter,
    X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

// Colores modernos vibrantes
const vibrantColors = {
    neonBlue: '#00f3ff',
    neonGreen: '#39ff14',
    neonPink: '#ff10f0',
    neonYellow: '#ffeb3b',
    neonOrange: '#ff6b35',
    neonPurple: '#9d4edd',
    neonCyan: '#00e5ff',
    neonLime: '#ccff00',
}

const pastelColors = {
    pastelBlue: '#a5d8ff',
    pastelGreen: '#c9e4ca',
    pastelPink: '#ffd1dc',
    pastelYellow: '#fff4a3',
    pastelOrange: '#ffcc99',
    pastelPurple: '#e1bee7',
}

const colorPalette = [
    vibrantColors.neonBlue,
    vibrantColors.neonGreen,
    vibrantColors.neonPink,
    vibrantColors.neonYellow,
    vibrantColors.neonOrange,
    vibrantColors.neonPurple,
    vibrantColors.neonCyan,
    vibrantColors.neonLime,
]

export const VendorsPage = () => {
    const { data: vendors, isLoading, error } = useVendors()
    const [selectedCenter, setSelectedCenter] = useState<string>('all')
    const [selectedCompany, setSelectedCompany] = useState<number | 'all'>('all')

    // Filtrar datos según selección
    const filteredVendors = useMemo(() => {
        if (!vendors || !Array.isArray(vendors)) return []
        
        return vendors.filter(vendor => {
            const centerMatch = selectedCenter === 'all' || vendor['centro de op'] === selectedCenter
            const companyMatch = selectedCompany === 'all' || vendor.compania === selectedCompany
            return centerMatch && companyMatch
        })
    }, [vendors, selectedCenter, selectedCompany])

    // Obtener opciones únicas para filtros
    const centers = useMemo(() => {
        if (!vendors || !Array.isArray(vendors)) return []
        return Array.from(new Set(vendors.map(v => v['centro de op']).filter(Boolean))).sort()
    }, [vendors])

    const companies = useMemo(() => {
        if (!vendors || !Array.isArray(vendors)) return []
        return Array.from(new Set(vendors.map(v => v.compania).filter(Boolean))).sort((a, b) => a - b)
    }, [vendors])

    // 1. Gráfica de barras: Valor neto total por vendedor
    const salesByVendorData = useMemo(() => {
        if (!filteredVendors.length) return []
        
        return Object.entries(
            filteredVendors.reduce((acc, vendor) => {
                const nombre = vendor['Nombre vendedor'] || 'Sin Nombre'
                const valor = vendor['Valor neto'] || 0
                acc[nombre] = (acc[nombre] || 0) + valor
                return acc
            }, {} as Record<string, number>)
        )
            .map(([nombre, total], index) => ({
                vendedor: nombre.length > 25 ? nombre.substring(0, 25) + '...' : nombre,
                ventas: total,
                color: colorPalette[index % colorPalette.length]
            }))
            .sort((a, b) => b.ventas - a.ventas)
            .slice(0, 15) // Top 15
    }, [filteredVendors])

    // 2. Gráfica circular: Distribución por tipo de entrega
    const deliveryTypeData = useMemo(() => {
        if (!filteredVendors.length) return []
        
        return Object.entries(
            filteredVendors.reduce((acc, vendor) => {
                const tipo = vendor['Tipo de entrega'] || 'Sin Tipo'
                const valor = vendor['Valor neto'] || 0
                acc[tipo] = (acc[tipo] || 0) + valor
                return acc
            }, {} as Record<string, number>)
        ).map(([tipo, total], index) => ({
            id: tipo,
            label: tipo,
            value: total,
            color: colorPalette[index % colorPalette.length]
        }))
    }, [filteredVendors])

    const totalDeliverySales = deliveryTypeData.reduce((acc, item) => acc + item.value, 0)

    // 3. Gráfico combinado: Subtotal vs Valor Neto por vendedor
    const combinedChartData = useMemo(() => {
        if (!filteredVendors.length) return { bars: [], lines: [] }
        
        const vendorTotals = filteredVendors.reduce((acc, vendor) => {
            const nombre = vendor['Nombre vendedor'] || 'Sin Nombre'
            if (!acc[nombre]) {
                acc[nombre] = { subtotal: 0, neto: 0 }
            }
            acc[nombre].subtotal += vendor['Valor subtotal'] || 0
            acc[nombre].neto += vendor['Valor neto'] || 0
            return acc
        }, {} as Record<string, { subtotal: number; neto: number }>)

        const sorted = Object.entries(vendorTotals)
            .map(([nombre, valores]) => ({
                vendedor: nombre.length > 20 ? nombre.substring(0, 20) + '...' : nombre,
                subtotal: valores.subtotal,
                neto: valores.neto,
                margen: valores.neto - valores.subtotal
            }))
            .sort((a, b) => b.neto - a.neto)
            .slice(0, 10)

        return {
            bars: sorted.map(item => ({
                vendedor: item.vendedor,
                'Valor Subtotal': item.subtotal,
                'Valor Neto': item.neto
            })),
            lines: [{
                id: 'Margen',
                data: sorted.map(item => ({
                    x: item.vendedor,
                    y: item.margen
                }))
            }]
        }
    }, [filteredVendors])


    // Calcular estadísticas
    const totalSales = useMemo(() => {
        return filteredVendors.reduce((acc, v) => acc + (v['Valor neto'] || 0), 0)
    }, [filteredVendors])

    const avgSalePerVendor = useMemo(() => {
        const uniqueVendors = new Set(filteredVendors.map(v => v['Codigo vendedor'])).size
        return uniqueVendors > 0 ? totalSales / uniqueVendors : 0
    }, [filteredVendors, totalSales])

    const totalOperations = filteredVendors.length

    if (isLoading) {
        return (
            <div className="flex-1 space-y-6 p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Vendedores</h1>
                        <p className="text-muted-foreground">
                            Análisis de rendimiento y comportamiento de ventas
                        </p>
                    </div>
                </motion.div>
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
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
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Vendedores</h1>
                        <p className="text-muted-foreground">
                            Análisis de rendimiento y comportamiento de ventas
                        </p>
                    </div>
                </motion.div>
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                    <CardHeader>
                        <CardTitle className="text-red-800 dark:text-red-400">Error al cargar datos</CardTitle>
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
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Vendedores</h1>
                        <p className="text-muted-foreground">
                            Análisis de rendimiento y comportamiento de ventas con insights visuales
                        </p>
                    </div>

                    {/* Filtros */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex flex-wrap gap-2"
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select
                                value={selectedCenter}
                                onChange={(e) => setSelectedCenter(e.target.value)}
                            >
                                <option value="all">Todos los Centros</option>
                                {centers.map(center => (
                                    <option key={center} value={center}>
                                        Centro {center}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select
                                value={selectedCompany === 'all' ? 'all' : selectedCompany.toString()}
                                onChange={(e) => setSelectedCompany(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                            >
                                <option value="all">Todas las Compañías</option>
                                {companies.map(company => (
                                    <option key={company} value={company.toString()}>
                                        Compañía {company}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        {(selectedCenter !== 'all' || selectedCompany !== 'all') && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSelectedCenter('all')
                                    setSelectedCompany('all')
                                }}
                                className="gap-2"
                            >
                                <X className="h-4 w-4" />
                                Limpiar
                            </Button>
                        )}
                    </motion.div>
                </motion.div>

                {/* Cards de Estadísticas */}
                <motion.div
                    className="grid gap-4 md:grid-cols-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        <Card className="border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total General de Ventas
                                </CardTitle>
                                <DollarSign className="h-5 w-5" style={{ color: vibrantColors.neonBlue }} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold" style={{ 
                                    background: `linear-gradient(to right, ${vibrantColors.neonBlue}, ${vibrantColors.neonCyan})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}>
                                    {formatters.currency(totalSales)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Suma de todos los valores netos
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                    >
                        <Card className="border-green-300 dark:border-green-700 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20 dark:to-transparent hover:shadow-lg hover:shadow-green-200/50 dark:hover:shadow-green-900/50 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Promedio por Vendedor
                                </CardTitle>
                                <TrendingUp className="h-5 w-5" style={{ color: vibrantColors.neonGreen }} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold" style={{ 
                                    background: `linear-gradient(to right, ${vibrantColors.neonGreen}, ${vibrantColors.neonLime})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}>
                                    {formatters.currency(avgSalePerVendor)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {new Set(filteredVendors.map(v => v['Codigo vendedor'])).size} vendedores únicos
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                    >
                        <Card className="border-pink-300 dark:border-pink-700 bg-gradient-to-br from-pink-50/50 to-transparent dark:from-pink-950/20 dark:to-transparent hover:shadow-lg hover:shadow-pink-200/50 dark:hover:shadow-pink-900/50 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Número de Operaciones
                                </CardTitle>
                                <FileText className="h-5 w-5" style={{ color: vibrantColors.neonPink }} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold" style={{ 
                                    background: `linear-gradient(to right, ${vibrantColors.neonPink}, #a855f7)`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}>
                                    <CountUp end={totalOperations} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Total de registros procesados
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
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    {/* 1. Gráfico de barras: Valor neto por vendedor */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                    >
                        <Card className="hover:shadow-xl transition-all rounded-xl border bg-gradient-to-br from-card to-card/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" style={{ color: vibrantColors.neonBlue }} />
                                    Valor Neto Total por Vendedor
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Top 15 vendedores con mayor facturación
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[450px]">
                                    <AnimatePresence mode="wait">
                                        <ResponsiveBar
                                            key={`${selectedCenter}-${selectedCompany}`}
                                            data={salesByVendorData}
                                            keys={['ventas']}
                                            indexBy="vendedor"
                                            margin={{ top: 50, right: 50, bottom: 120, left: 90 }}
                                            padding={0.4}
                                            valueScale={{ type: 'linear' }}
                                            indexScale={{ type: 'band', round: true }}
                                            colors={(d) => d.data.color}
                                            borderColor={{ from: 'color', modifiers: [['darker', 0.5]] }}
                                            borderWidth={2}
                                            axisTop={null}
                                            axisRight={null}
                                            axisBottom={{
                                                tickSize: 5,
                                                tickPadding: 5,
                                                tickRotation: -45,
                                                legend: 'Vendedor',
                                                legendPosition: 'middle',
                                                legendOffset: 95,
                                                tickColor: 'hsl(var(--muted-foreground))',
                                                legendColor: 'hsl(var(--foreground))',
                                            }}
                                            axisLeft={{
                                                tickSize: 5,
                                                tickPadding: 5,
                                                tickRotation: 0,
                                                legend: 'Valor Neto',
                                                legendPosition: 'middle',
                                                legendOffset: -70,
                                                format: (value) => formatters.currency(value),
                                                tickColor: 'hsl(var(--muted-foreground))',
                                                legendColor: 'hsl(var(--foreground))',
                                            }}
                                            theme={{
                                                axis: {
                                                    ticks: {
                                                        text: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
                                                    },
                                                    legend: {
                                                        text: { fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }
                                                    },
                                                    grid: {
                                                        line: {
                                                            stroke: 'hsl(var(--border))',
                                                            strokeWidth: 1,
                                                            opacity: 0.5,
                                                        }
                                                    }
                                                },
                                                tooltip: {
                                                    container: {
                                                        background: 'hsl(var(--card))',
                                                        color: 'hsl(var(--foreground))',
                                                        border: '1px solid hsl(var(--border))',
                                                        borderRadius: 8,
                                                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                                                    }
                                                }
                                            }}
                                            labelSkipWidth={12}
                                            labelSkipHeight={12}
                                            labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                                            label={(d) => {
                                                const value = formatters.currency(d.value)
                                                return value.length > 12 ? value.substring(0, 12) + '...' : value
                                            }}
                                            animate={true}
                                            motionConfig={{
                                                stiffness: 90,
                                                damping: 15,
                                            }}
                                            tooltip={(tooltip) => (
                                                <div
                                                    style={{
                                                        padding: 12,
                                                        background: 'hsl(var(--card))',
                                                        border: '1px solid hsl(var(--border))',
                                                        borderRadius: 8,
                                                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                                                        color: 'hsl(var(--foreground))',
                                                    }}
                                                >
                                                    <div className="font-bold text-base">{tooltip.indexValue}</div>
                                                    <div className="text-sm mt-1 font-semibold">
                                                        {formatters.currency(tooltip.value as number)}
                                                    </div>
                                                </div>
                                            )}
                                        />
                                    </AnimatePresence>
                                </div>
                                {/* Tabla de datos: Valor Neto por Vendedor */}
                                <div className="mt-6">
                                    <DataTable
                                        title="Datos base: Valor Neto Total por Vendedor"
                                        columns={[
                                            { header: 'Código Vendedor', accessor: (row) => {
                                                const vendor = filteredVendors.find(v => {
                                                    const nombre = v['Nombre vendedor'] || ''
                                                    const shortName = nombre.length > 25 ? nombre.substring(0, 25) + '...' : nombre
                                                    return shortName === row.vendedor || nombre === row.vendedor
                                                })
                                                return vendor?.['Codigo vendedor'] || 'N/A'
                                            }, align: 'left' },
                                            { header: 'Nombre Vendedor', accessor: 'vendedor', align: 'left' },
                                            { header: 'Centro de OP', accessor: (row) => {
                                                const vendor = filteredVendors.find(v => {
                                                    const nombre = v['Nombre vendedor'] || ''
                                                    const shortName = nombre.length > 25 ? nombre.substring(0, 25) + '...' : nombre
                                                    return shortName === row.vendedor || nombre === row.vendedor
                                                })
                                                return vendor?.['centro de op'] || 'N/A'
                                            }, align: 'left' },
                                            { header: 'Compañía', accessor: (row) => {
                                                const vendor = filteredVendors.find(v => {
                                                    const nombre = v['Nombre vendedor'] || ''
                                                    const shortName = nombre.length > 25 ? nombre.substring(0, 25) + '...' : nombre
                                                    return shortName === row.vendedor || nombre === row.vendedor
                                                })
                                                return vendor?.compania || 'N/A'
                                            }, align: 'right' },
                                            { header: 'Valor Neto Total', accessor: 'ventas', align: 'right', format: (v) => formatters.currency(v) },
                                        ]}
                                        data={salesByVendorData}
                                        showTotalRow={true}
                                        totalLabel="Total Ventas"
                                        totalAccessor="ventas"
                                        exportFilename="valor_neto_por_vendedor"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* 2. Gráfica circular: Distribución por tipo de entrega */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                    >
                        <Card className="hover:shadow-xl transition-all rounded-xl border bg-gradient-to-br from-card to-card/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="h-5 w-5" style={{ color: vibrantColors.neonPink }} />
                                    Distribución por Tipo de Entrega
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Porcentaje de ventas según tipo de entrega
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[450px]">
                                    <AnimatePresence mode="wait">
                                        <ResponsivePie
                                            key={`pie-${selectedCenter}-${selectedCompany}`}
                                            data={deliveryTypeData}
                                            margin={{ top: 40, right: 80, bottom: 120, left: 80 }}
                                            innerRadius={0.65}
                                            padAngle={3}
                                            cornerRadius={6}
                                            activeOuterRadiusOffset={12}
                                            borderWidth={2}
                                            borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
                                            arcLinkLabelsSkipAngle={10}
                                            arcLinkLabelsTextColor="hsl(var(--foreground))"
                                            arcLinkLabelsThickness={3}
                                            arcLinkLabelsColor={{ from: 'color' }}
                                            arcLabelsSkipAngle={10}
                                            arcLabelsTextColor="hsl(var(--background))"
                                            arcLabel={(d) => {
                                                const percentage = ((d.value / totalDeliverySales) * 100).toFixed(1)
                                                return `${percentage}%`
                                            }}
                                            valueFormat={(value) => formatters.currency(value)}
                                            colors={(d) => d.data.color}
                                            legends={[
                                                {
                                                    anchor: 'bottom',
                                                    direction: 'row',
                                                    justify: false,
                                                    translateX: 0,
                                                    translateY: 80,
                                                    itemsSpacing: 15,
                                                    itemWidth: 90,
                                                    itemHeight: 20,
                                                    itemTextColor: 'hsl(var(--foreground))',
                                                    itemDirection: 'left-to-right',
                                                    itemOpacity: 1,
                                                    symbolSize: 16,
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
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                    }
                                                },
                                                legends: {
                                                    text: {
                                                        fontSize: 11,
                                                    }
                                                }
                                            }}
                                            tooltip={(tooltip) => {
                                                const percentage = ((tooltip.value as number) / totalDeliverySales * 100).toFixed(2)
                                                return (
                                                    <div
                                                        style={{
                                                            padding: 14,
                                                            background: 'hsl(var(--card))',
                                                            border: '2px solid hsl(var(--border))',
                                                            borderRadius: 10,
                                                            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                                                            color: 'hsl(var(--foreground))',
                                                        }}
                                                    >
                                                        <div className="font-bold text-base">{tooltip.label}</div>
                                                        <div className="text-sm mt-2 font-semibold">
                                                            {formatters.currency(tooltip.value as number)}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {percentage}% del total
                                                        </div>
                                                    </div>
                                                )
                                            }}
                                            animate={true}
                                            motionConfig={{
                                                stiffness: 90,
                                                damping: 15,
                                            }}
                                        />
                                    </AnimatePresence>
                                </div>
                                {/* Tabla de datos: Distribución por Tipo de Entrega */}
                                <div className="mt-6">
                                    <DataTable
                                        title="Datos base: Distribución por Tipo de Entrega"
                                        columns={[
                                            { header: 'Tipo de Entrega', accessor: 'label', align: 'left' },
                                            { header: 'Valor Neto', accessor: 'value', align: 'right', format: (v) => formatters.currency(v) },
                                            { header: 'Porcentaje', accessor: (row) => {
                                                const percent = ((row.value / totalDeliverySales) * 100).toFixed(2)
                                                return `${percent}%`
                                            }, align: 'right' },
                                        ]}
                                        data={deliveryTypeData}
                                        showTotalRow={true}
                                        totalLabel="Total Ventas"
                                        totalAccessor="value"
                                        exportFilename="distribucion_tipo_entrega"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* 3. Gráfico combinado: Subtotal vs Neto con línea de margen */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.7 }}
                    >
                        <Card className="hover:shadow-xl transition-all rounded-xl border bg-gradient-to-br from-card to-card/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Layers className="h-5 w-5" style={{ color: vibrantColors.neonOrange }} />
                                    Relación Subtotal vs Valor Neto (con Margen)
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Comparativa de valores y cálculo de márgenes por vendedor
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[500px]">
                                    <AnimatePresence mode="wait">
                                        <ResponsiveBar
                                            key={`combined-${selectedCenter}-${selectedCompany}`}
                                            data={combinedChartData.bars}
                                            keys={['Valor Subtotal', 'Valor Neto']}
                                            indexBy="vendedor"
                                            margin={{ top: 50, right: 130, bottom: 100, left: 80 }}
                                            padding={0.3}
                                            valueScale={{ type: 'linear' }}
                                            indexScale={{ type: 'band', round: true }}
                                            colors={[vibrantColors.neonBlue, vibrantColors.neonGreen]}
                                            borderColor={{ from: 'color', modifiers: [['darker', 0.5]] }}
                                            borderWidth={2}
                                            axisTop={null}
                                            axisRight={null}
                                            axisBottom={{
                                                tickSize: 5,
                                                tickPadding: 5,
                                                tickRotation: -45,
                                                legend: 'Vendedor',
                                                legendPosition: 'middle',
                                                legendOffset: 90,
                                                tickColor: 'hsl(var(--muted-foreground))',
                                                legendColor: 'hsl(var(--foreground))',
                                            }}
                                            axisLeft={{
                                                tickSize: 5,
                                                tickPadding: 5,
                                                tickRotation: 0,
                                                legend: 'Valor',
                                                legendPosition: 'middle',
                                                legendOffset: -60,
                                                format: (value) => formatters.currency(value),
                                                tickColor: 'hsl(var(--muted-foreground))',
                                                legendColor: 'hsl(var(--foreground))',
                                            }}
                                            theme={{
                                                axis: {
                                                    ticks: {
                                                        text: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
                                                    },
                                                    legend: {
                                                        text: { fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }
                                                    },
                                                    grid: {
                                                        line: {
                                                            stroke: 'hsl(var(--border))',
                                                            strokeWidth: 1,
                                                            opacity: 0.5,
                                                        }
                                                    }
                                                },
                                                tooltip: {
                                                    container: {
                                                        background: 'hsl(var(--card))',
                                                        color: 'hsl(var(--foreground))',
                                                        border: '1px solid hsl(var(--border))',
                                                        borderRadius: 8,
                                                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                                                    }
                                                }
                                            }}
                                            labelSkipWidth={12}
                                            labelSkipHeight={12}
                                            animate={true}
                                            motionConfig={{
                                                stiffness: 90,
                                                damping: 15,
                                            }}
                                            tooltip={(tooltip) => {
                                                const data = combinedChartData.bars.find(d => d.vendedor === tooltip.indexValue)
                                                const margen = data ? (data['Valor Neto'] - data['Valor Subtotal']) : 0
                                                return (
                                                    <div
                                                        style={{
                                                            padding: 14,
                                                            background: 'hsl(var(--card))',
                                                            border: '2px solid hsl(var(--border))',
                                                            borderRadius: 10,
                                                            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                                                            color: 'hsl(var(--foreground))',
                                                        }}
                                                    >
                                                        <div className="font-bold text-base">{tooltip.id}</div>
                                                        <div className="text-sm mt-1 font-semibold">
                                                            {formatters.currency(tooltip.value as number)}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-2">
                                                            {tooltip.indexValue}
                                                        </div>
                                                        {tooltip.id === 'Valor Neto' && (
                                                            <div className="text-xs mt-2 pt-2 border-t border-border">
                                                                <span style={{ color: vibrantColors.neonOrange }} className="font-semibold">
                                                                    Margen: {formatters.currency(margen)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            }}
                                            legends={[
                                                {
                                                    dataFrom: 'keys',
                                                    anchor: 'top-right',
                                                    direction: 'row',
                                                    justify: false,
                                                    translateX: 120,
                                                    translateY: -20,
                                                    itemsSpacing: 15,
                                                    itemWidth: 100,
                                                    itemHeight: 20,
                                                    itemDirection: 'left-to-right',
                                                    itemOpacity: 0.85,
                                                    symbolSize: 16,
                                                    itemTextColor: 'hsl(var(--foreground))',
                                                }
                                            ]}
                                        />
                                    </AnimatePresence>
                                </div>
                                {/* Tabla de datos: Subtotal vs Valor Neto */}
                                <div className="mt-6">
                                    <DataTable
                                        title="Datos base: Subtotal vs Valor Neto por Vendedor"
                                        columns={[
                                            { header: 'Código Vendedor', accessor: (row) => {
                                                const vendor = filteredVendors.find(v => {
                                                    const nombre = v['Nombre vendedor'] || ''
                                                    const shortName = nombre.length > 25 ? nombre.substring(0, 25) + '...' : nombre
                                                    return shortName === row.vendedor || nombre === row.vendedor
                                                })
                                                return vendor?.['Codigo vendedor'] || 'N/A'
                                            }, align: 'left' },
                                            { header: 'Nombre Vendedor', accessor: 'vendedor', align: 'left' },
                                            { header: 'Valor Subtotal', accessor: 'Valor Subtotal', align: 'right', format: (v) => formatters.currency(v) },
                                            { header: 'Valor Neto', accessor: 'Valor Neto', align: 'right', format: (v) => formatters.currency(v) },
                                            { header: 'Margen', accessor: (row) => {
                                                const subtotal = row['Valor Subtotal'] || 0
                                                const neto = row['Valor Neto'] || 0
                                                return neto - subtotal
                                            }, align: 'right', format: (v) => formatters.currency(v) },
                                            { header: 'Porcentaje Margen', accessor: (row) => {
                                                const subtotal = row['Valor Subtotal'] || 0
                                                const neto = row['Valor Neto'] || 0
                                                const margen = neto - subtotal
                                                if (subtotal === 0) return '0%'
                                                const percent = ((margen / subtotal) * 100).toFixed(2)
                                                return `${percent}%`
                                            }, align: 'right' },
                                        ]}
                                        data={combinedChartData.bars}
                                        showTotalRow={true}
                                        totalLabel="Totales"
                                        totalAccessor={(row) => row['Valor Neto']}
                                        exportFilename="subtotal_vs_valor_neto"
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

