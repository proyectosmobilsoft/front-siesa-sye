import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ErrorState } from '@/components/ui/error-state'
import { Modal } from '@/components/ui/modal'
import { useSalesSummary } from '@/hooks/useReports'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsivePie } from '@nivo/pie'
import { formatters } from '@/utils/formatters'
import { CountUp } from '@/components/ui/count-up'
import { DataTable } from '@/components/dashboard/DataTable'
import {
    DollarSign,
    TrendingUp,
    FileText,
    BarChart3,
    PieChart,
    Package,
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

type DetailChart = 'ventas' | 'tipoDocumento' | 'unidades' | null

export const VendorsPage = () => {
    // Nota: /reports/vendors está vacío en el backend actualmente
    // ({"success":true,"data":[]}). El dato real de ventas por vendedor
    // viene de /reports/sales-summary (mismo patrón que VendorsChart y
    // SalesSummaryPage), por lo que esta página agrega sobre esa fuente.
    const { data: sales, isLoading, error, refetch } = useSalesSummary()
    const [selectedCenter, setSelectedCenter] = useState<string>('all')
    const [selectedCompany, setSelectedCompany] = useState<number | 'all'>('all')
    const [openDetail, setOpenDetail] = useState<DetailChart>(null)

    // Filtrar datos según selección
    const filteredSales = useMemo(() => {
        if (!sales || !Array.isArray(sales)) return []

        return sales.filter(sale => {
            const centerMatch = selectedCenter === 'all' || sale['Centro de OP'] === selectedCenter
            const companyMatch = selectedCompany === 'all' || sale['Compania'] === selectedCompany
            return centerMatch && companyMatch
        })
    }, [sales, selectedCenter, selectedCompany])

    // Obtener opciones únicas para filtros
    const centers = useMemo(() => {
        if (!sales || !Array.isArray(sales)) return []
        return Array.from(new Set(sales.map(s => s['Centro de OP']).filter(Boolean))).sort()
    }, [sales])

    const companies = useMemo(() => {
        if (!sales || !Array.isArray(sales)) return []
        return Array.from(new Set(sales.map(s => s['Compania']).filter(Boolean))).sort((a, b) => a - b)
    }, [sales])

    // 1. Gráfica de barras: Valor neto total por vendedor
    const salesByVendorData = useMemo(() => {
        if (!filteredSales.length) return []

        return Object.entries(
            filteredSales.reduce((acc, sale) => {
                const nombre = sale['Vendedor'] || 'Sin Nombre'
                const valor = sale['Vlr. Neto documento'] || 0
                acc[nombre] = (acc[nombre] || 0) + valor
                return acc
            }, {} as Record<string, number>)
        )
            .map(([nombre, total], index) => ({
                vendedor: nombre.length > 25 ? nombre.substring(0, 25) + '...' : nombre,
                nombreCompleto: nombre,
                ventas: total,
                color: colorPalette[index % colorPalette.length]
            }))
            .sort((a, b) => b.ventas - a.ventas)
            .slice(0, 15) // Top 15
    }, [filteredSales])

    const topVendor = salesByVendorData[0]

    // 2. Gráfica circular: Distribución por tipo de documento
    const documentTypeData = useMemo(() => {
        if (!filteredSales.length) return []

        return Object.entries(
            filteredSales.reduce((acc, sale) => {
                const tipo = sale['Desc. grupo clase docto.'] || 'Sin Tipo'
                const valor = sale['Vlr. Neto documento'] || 0
                acc[tipo] = (acc[tipo] || 0) + valor
                return acc
            }, {} as Record<string, number>)
        ).map(([tipo, total], index) => ({
            id: tipo,
            label: tipo,
            value: total,
            color: colorPalette[index % colorPalette.length]
        }))
    }, [filteredSales])

    const totalDocTypeSales = documentTypeData.reduce((acc, item) => acc + item.value, 0)
    const topDocType = [...documentTypeData].sort((a, b) => b.value - a.value)[0]

    // 3. Gráfico de barras: Unidades vendidas por vendedor
    const unitsByVendorData = useMemo(() => {
        if (!filteredSales.length) return []

        return Object.entries(
            filteredSales.reduce((acc, sale) => {
                const nombre = sale['Vendedor'] || 'Sin Nombre'
                const unidades = sale['Numero de unidades docto'] || 0
                acc[nombre] = (acc[nombre] || 0) + unidades
                return acc
            }, {} as Record<string, number>)
        )
            .map(([nombre, total], index) => ({
                vendedor: nombre.length > 25 ? nombre.substring(0, 25) + '...' : nombre,
                nombreCompleto: nombre,
                unidades: total,
                color: colorPalette[index % colorPalette.length]
            }))
            .sort((a, b) => b.unidades - a.unidades)
            .slice(0, 15)
    }, [filteredSales])

    const topUnitsVendor = unitsByVendorData[0]

    // Calcular estadísticas
    const totalSales = useMemo(() => {
        return filteredSales.reduce((acc, s) => acc + (s['Vlr. Neto documento'] || 0), 0)
    }, [filteredSales])

    const avgSalePerVendor = useMemo(() => {
        const uniqueVendors = new Set(filteredSales.map(s => s['Vendedor'])).size
        return uniqueVendors > 0 ? totalSales / uniqueVendors : 0
    }, [filteredSales, totalSales])

    const totalOperations = filteredSales.length

    const chartTheme = {
        axis: {
            ticks: {
                text: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
            },
            legend: {
                text: { fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }
            },
        },
        grid: {
            line: {
                stroke: 'hsl(var(--border))',
                strokeWidth: 1,
                opacity: 0.5,
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
    }

    if (isLoading) {
        return (
            <div className="flex-1 space-y-6 p-6">
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
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={`chart-${i}`}>
                            <CardHeader>
                                <Skeleton className="h-6 w-40" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-32 w-full" />
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
                    title="Error al cargar vendedores"
                    message={`No se pudieron obtener los datos. Error: ${error.message}`}
                    onRetry={() => refetch()}
                />
            </div>
        )
    }

    return (
        <ErrorBoundary>
            <div className="flex-1 space-y-6 p-6">
                {/* Filtros */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col md:flex-row md:items-center md:justify-end gap-4"
                >
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
                    <Card className="hover:shadow-lg transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total General de Ventas
                            </CardTitle>
                            <DollarSign className="h-5 w-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {formatters.currency(totalSales)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Suma de todos los valores netos
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Promedio por Vendedor
                            </CardTitle>
                            <TrendingUp className="h-5 w-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {formatters.currency(avgSalePerVendor)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {new Set(filteredSales.map(s => s['Vendedor'])).size} vendedores únicos
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Número de Operaciones
                            </CardTitle>
                            <FileText className="h-5 w-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                <CountUp end={totalOperations} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Total de registros procesados
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Cards resumen clicables */}
                <motion.div
                    className="grid gap-4 md:grid-cols-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    <button
                        type="button"
                        onClick={() => setOpenDetail('ventas')}
                        className="text-left"
                        disabled={!salesByVendorData.length}
                    >
                        <Card className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Valor Neto por Vendedor
                                </CardTitle>
                                <div className="rounded-md bg-primary/10 p-2">
                                    <BarChart3 className="h-4 w-4 text-primary" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                {topVendor ? (
                                    <>
                                        <div className="text-lg font-bold truncate">
                                            {topVendor.nombreCompleto}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Top vendedor · {formatters.currency(topVendor.ventas)}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
                                )}
                                <p className="text-xs text-primary mt-3">Ver detalle completo →</p>
                            </CardContent>
                        </Card>
                    </button>

                    <button
                        type="button"
                        onClick={() => setOpenDetail('tipoDocumento')}
                        className="text-left"
                        disabled={!documentTypeData.length}
                    >
                        <Card className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Distribución por Tipo de Documento
                                </CardTitle>
                                <div className="rounded-md bg-primary/10 p-2">
                                    <PieChart className="h-4 w-4 text-primary" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                {topDocType ? (
                                    <>
                                        <div className="text-lg font-bold truncate">
                                            {topDocType.label}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Principal ·{' '}
                                            {totalDocTypeSales > 0
                                                ? `${((topDocType.value / totalDocTypeSales) * 100).toFixed(1)}%`
                                                : '0%'}{' '}
                                            del total
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
                                )}
                                <p className="text-xs text-primary mt-3">Ver detalle completo →</p>
                            </CardContent>
                        </Card>
                    </button>

                    <button
                        type="button"
                        onClick={() => setOpenDetail('unidades')}
                        className="text-left"
                        disabled={!unitsByVendorData.length}
                    >
                        <Card className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Unidades Vendidas por Vendedor
                                </CardTitle>
                                <div className="rounded-md bg-primary/10 p-2">
                                    <Package className="h-4 w-4 text-primary" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                {topUnitsVendor ? (
                                    <>
                                        <div className="text-lg font-bold truncate">
                                            {topUnitsVendor.nombreCompleto}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Top vendedor · {topUnitsVendor.unidades.toLocaleString('es-CO')} unidades
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
                                )}
                                <p className="text-xs text-primary mt-3">Ver detalle completo →</p>
                            </CardContent>
                        </Card>
                    </button>
                </motion.div>

                {/* Modal: Valor Neto por Vendedor */}
                <Modal
                    isOpen={openDetail === 'ventas'}
                    onClose={() => setOpenDetail(null)}
                    title="Valor Neto Total por Vendedor"
                    className="max-w-6xl"
                >
                    <p className="text-sm text-muted-foreground mb-4">
                        Top 15 vendedores con mayor facturación
                    </p>
                    <div className="h-[450px]">
                        <ResponsiveBar
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
                            }}
                            axisLeft={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: 'Valor Neto',
                                legendPosition: 'middle',
                                legendOffset: -70,
                                format: (value) => formatters.compactCurrency(value),
                            }}
                            theme={chartTheme}
                            labelSkipWidth={12}
                            labelSkipHeight={12}
                            labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                            label={(d) => formatters.compactCurrency(d.value)}
                            animate={true}
                            motionConfig={{ tension: 90, damping: 15 }}
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
                    </div>
                    <div className="mt-6">
                        <DataTable
                            title="Datos base: Valor Neto Total por Vendedor"
                            columns={[
                                { header: 'Vendedor', accessor: 'nombreCompleto', align: 'left' },
                                { header: 'Valor Neto Total', accessor: 'ventas', align: 'right', format: (v) => formatters.currency(v) },
                            ]}
                            data={salesByVendorData}
                            showTotalRow={true}
                            totalLabel="Total Ventas"
                            totalAccessor="ventas"
                            exportFilename="valor_neto_por_vendedor"
                        />
                    </div>
                </Modal>

                {/* Modal: Distribución por Tipo de Documento */}
                <Modal
                    isOpen={openDetail === 'tipoDocumento'}
                    onClose={() => setOpenDetail(null)}
                    title="Distribución por Tipo de Documento"
                    className="max-w-6xl"
                >
                    <p className="text-sm text-muted-foreground mb-4">
                        Porcentaje de ventas según tipo de documento (Desc. grupo clase docto.)
                    </p>
                    <div className="h-[450px]">
                        <ResponsivePie
                            data={documentTypeData}
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
                                const percentage = totalDocTypeSales > 0 ? ((d.value / totalDocTypeSales) * 100).toFixed(1) : '0'
                                return `${percentage}%`
                            }}
                            valueFormat={(value) => formatters.compactCurrency(value)}
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
                                    text: { fontSize: 12, fontWeight: 600 }
                                },
                                legends: {
                                    text: { fontSize: 11 }
                                }
                            }}
                            tooltip={({ datum }) => {
                                const percentage = totalDocTypeSales > 0 ? (datum.value / totalDocTypeSales * 100).toFixed(2) : '0'
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
                                        <div className="font-bold text-base">{datum.label}</div>
                                        <div className="text-sm mt-2 font-semibold">
                                            {formatters.currency(datum.value)}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {percentage}% del total
                                        </div>
                                    </div>
                                )
                            }}
                            animate={true}
                            motionConfig={{ tension: 90, damping: 15 }}
                        />
                    </div>
                    <div className="mt-6">
                        <DataTable
                            title="Datos base: Distribución por Tipo de Documento"
                            columns={[
                                { header: 'Tipo de Documento', accessor: 'label', align: 'left' },
                                { header: 'Valor Neto', accessor: 'value', align: 'right', format: (v) => formatters.currency(v) },
                                {
                                    header: 'Porcentaje', accessor: (row) => {
                                        const percent = totalDocTypeSales > 0 ? ((row.value / totalDocTypeSales) * 100).toFixed(2) : '0'
                                        return `${percent}%`
                                    }, align: 'right'
                                },
                            ]}
                            data={documentTypeData}
                            showTotalRow={true}
                            totalLabel="Total Ventas"
                            totalAccessor="value"
                            exportFilename="distribucion_tipo_documento"
                        />
                    </div>
                </Modal>

                {/* Modal: Unidades Vendidas por Vendedor */}
                <Modal
                    isOpen={openDetail === 'unidades'}
                    onClose={() => setOpenDetail(null)}
                    title="Unidades Vendidas por Vendedor"
                    className="max-w-6xl"
                >
                    <p className="text-sm text-muted-foreground mb-4">
                        Top 15 vendedores por número de unidades vendidas
                    </p>
                    <div className="h-[450px]">
                        <ResponsiveBar
                            data={unitsByVendorData}
                            keys={['unidades']}
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
                            }}
                            axisLeft={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: 'Unidades',
                                legendPosition: 'middle',
                                legendOffset: -60,
                            }}
                            theme={chartTheme}
                            labelSkipWidth={12}
                            labelSkipHeight={12}
                            labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                            animate={true}
                            motionConfig={{ tension: 90, damping: 15 }}
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
                                        {(tooltip.value as number).toLocaleString('es-CO')} unidades
                                    </div>
                                </div>
                            )}
                        />
                    </div>
                    <div className="mt-6">
                        <DataTable
                            title="Datos base: Unidades Vendidas por Vendedor"
                            columns={[
                                { header: 'Vendedor', accessor: 'nombreCompleto', align: 'left' },
                                { header: 'Unidades', accessor: 'unidades', align: 'right', format: (v) => v.toLocaleString('es-CO') },
                            ]}
                            data={unitsByVendorData}
                            showTotalRow={true}
                            totalLabel="Total Unidades"
                            totalAccessor="unidades"
                            exportFilename="unidades_por_vendedor"
                        />
                    </div>
                </Modal>
            </div>
        </ErrorBoundary>
    )
}
