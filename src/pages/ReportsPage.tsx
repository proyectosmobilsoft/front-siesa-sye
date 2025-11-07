import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useDailyOrders } from '@/hooks/useReports'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveLine } from '@nivo/line'
import { DailyOrder } from '@/api/types'
import { DataTable } from '@/components/dashboard/DataTable'
import { formatters } from '@/utils/formatters'

export const ReportsPage = () => {
    const { data: orders, isLoading, error } = useDailyOrders()

    // Datos para gráfico de distribución de estados (Pie)
    const ordersByStatusData = orders && Array.isArray(orders)
        ? Object.entries(
            orders.reduce((acc, order) => {
                const estado = order.Estado || 'Sin Estado'
                acc[estado] = (acc[estado] || 0) + 1
                return acc
            }, {} as Record<string, number>)
        ).map(([estado, cantidad]) => ({
            id: estado,
            label: estado,
            value: cantidad,
        }))
        : []

    // Datos para gráfico de pedidos por compañía (Bar - Top 5)
    const ordersByCompanyData = orders && Array.isArray(orders)
        ? Object.entries(
            orders.reduce((acc, order) => {
                const company = order['Desc. CO'] || 'Sin Compañía'
                acc[company] = (acc[company] || 0) + 1
                return acc
            }, {} as Record<string, number>)
        )
            .map(([company, count]) => ({ company, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((item) => ({
                compañía: item.company.length > 20 ? item.company.substring(0, 20) + '...' : item.company,
                pedidos: item.count,
            }))
        : []

    // Datos para gráfico de pedidos por hora (Bar)
    const ordersByHourData = orders && Array.isArray(orders)
        ? Object.entries(
            orders.reduce((acc, order) => {
                const hour = order['Hora creacion'] || 'Sin Hora'
                acc[hour] = (acc[hour] || 0) + 1
                return acc
            }, {} as Record<string, number>)
        )
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => {
                // Ordenar por hora (convertir "10 AM" a número para ordenar)
                const aNum = parseInt(a.hour) || 0
                const bNum = parseInt(b.hour) || 0
                return aNum - bNum
            })
            .map((item) => ({
                hora: item.hour,
                pedidos: item.count,
            }))
        : []

    // Datos para gráfico de evolución por hora (Line)
    const evolutionByHourData = orders && Array.isArray(orders)
        ? [
            {
                id: 'Pedidos',
                data: ordersByHourData.map((item) => ({
                    x: item.hora,
                    y: item.pedidos,
                })),
            },
        ]
        : []

    if (isLoading) {
        return (
            <div className="flex-1 space-y-6 p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Reportes de Pedidos</h1>
                        <p className="text-muted-foreground">
                            Análisis de pedidos diarios
                        </p>
                    </div>
                </motion.div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Distribución de Estados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Pedidos por Compañía</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Pedidos por Hora</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Evolución de Pedidos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
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
                        <h1 className="text-3xl font-bold tracking-tight">Reportes de Pedidos</h1>
                        <p className="text-muted-foreground">
                            Análisis de pedidos diarios
                        </p>
                    </div>
                </motion.div>
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="text-red-800">Error al cargar reportes</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-64">
                        <div className="text-center text-red-600">
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
                        <h1 className="text-3xl font-bold tracking-tight">Reportes de Pedidos</h1>
                        <p className="text-muted-foreground">
                            Análisis de pedidos diarios - Total: {orders?.length || 0} pedidos
                        </p>
                    </div>
                </motion.div>

                {/* Gráficas */}
                <motion.div
                    className="grid gap-6 grid-cols-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    {/* Gráfico de Pie: Distribución de Estados */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Distribución de Estados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="h-[500px] [&_svg]:overflow-visible">
                                    <ResponsivePie
                                        data={ordersByStatusData}
                                        margin={{ top: 40, right: 80, bottom: 140, left: 80 }}
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
                                                stagger: true,
                                            },
                                        ]}
                                        legends={[
                                            {
                                                anchor: 'bottom',
                                                direction: 'row',
                                                justify: false,
                                                translateX: 0,
                                                translateY: 70,
                                                itemsSpacing: 8,
                                                itemWidth: 60,
                                                itemHeight: 16,
                                                itemTextColor: '#ffffff',
                                                itemDirection: 'left-to-right',
                                                itemOpacity: 1,
                                                symbolSize: 12,
                                                symbolShape: 'circle',
                                                effects: [
                                                    {
                                                        on: 'hover',
                                                        style: {
                                                            itemTextColor: '#ffffff',
                                                            itemOpacity: 1,
                                                        },
                                                    },
                                                ],
                                            },
                                        ]}
                                        tooltip={({ datum }) => (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '8px 12px',
                                                    background: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: 6,
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                    color: 'hsl(var(--foreground))',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 12,
                                                        height: 12,
                                                        backgroundColor: datum.color,
                                                        borderRadius: 2,
                                                    }}
                                                />
                                                <span style={{ fontSize: 14, fontWeight: 500 }}>
                                                    {datum.label}: {datum.value}
                                                </span>
                                            </div>
                                        )}
                                    />
                                </div>
                                {/* Tabla de datos: Distribución de Estados */}
                                <div className="h-[500px] flex flex-col">
                                    <DataTable
                                        title="Datos base: Distribución de Estados"
                                        columns={[
                                            { header: 'Estado', accessor: 'label', align: 'left' },
                                            { header: 'Cantidad', accessor: 'value', align: 'right', format: (v) => formatters.number(v) },
                                        ]}
                                        data={ordersByStatusData}
                                        showTotalRow={true}
                                        totalLabel="Total Pedidos"
                                        totalAccessor="value"
                                        exportFilename="distribucion_estados"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gráfico de Barras: Pedidos por Compañía (Top 5) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Pedidos por Compañía (Top 5)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="h-[500px]">
                                    <ResponsiveBar
                                        data={ordersByCompanyData}
                                        keys={['pedidos']}
                                        indexBy="compañía"
                                        margin={{ top: 50, right: 50, bottom: 80, left: 60 }}
                                        padding={0.3}
                                        valueScale={{ type: 'linear' }}
                                        indexScale={{ type: 'band', round: true }}
                                        colors={{ scheme: 'category10' }}
                                        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                                        axisTop={null}
                                        axisRight={null}
                                        axisBottom={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: -45,
                                            legend: 'Compañía',
                                            legendPosition: 'middle',
                                            legendOffset: 60,
                                            tickColor: '#ffffff',
                                            legendColor: '#ffffff',
                                        }}
                                        axisLeft={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: 0,
                                            legend: 'Cantidad de Pedidos',
                                            legendPosition: 'middle',
                                            legendOffset: -40,
                                            tickColor: '#ffffff',
                                            legendColor: '#ffffff',
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
                                        labelSkipWidth={12}
                                        labelSkipHeight={12}
                                        labelTextColor="#ffffff"
                                        animate={true}
                                        motionConfig="gentle"
                                        tooltip={({ value, indexValue, color }) => (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '8px 12px',
                                                    background: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: 6,
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                    color: 'hsl(var(--foreground))',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 12,
                                                        height: 12,
                                                        backgroundColor: color,
                                                        borderRadius: 2,
                                                    }}
                                                />
                                                <span style={{ fontSize: 14, fontWeight: 500 }}>
                                                    {indexValue}: {value} pedidos
                                                </span>
                                            </div>
                                        )}
                                    />
                                </div>
                                {/* Tabla de datos: Pedidos por Compañía */}
                                <div className="h-[500px] flex flex-col">
                                    <DataTable
                                        title="Datos base: Pedidos por Compañía"
                                        columns={[
                                            { header: 'ID. CO', accessor: (row) => {
                                                const fullCompanyName = orders?.find(o => {
                                                    const desc = o['Desc. CO'] || ''
                                                    return desc === row.compañía || (desc.length > 20 && desc.substring(0, 20) + '...' === row.compañía)
                                                })
                                                return fullCompanyName?.['ID. CO'] || 'N/A'
                                            }, align: 'left' },
                                            { header: 'Compañía', accessor: 'compañía', align: 'left' },
                                            { header: 'Cantidad Pedidos', accessor: 'pedidos', align: 'right', format: (v) => formatters.number(v) },
                                        ]}
                                        data={ordersByCompanyData}
                                        showTotalRow={true}
                                        totalLabel="Total Pedidos"
                                        totalAccessor="pedidos"
                                        exportFilename="pedidos_por_compania"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gráfico de Barras Horizontal: Pedidos por Hora */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Pedidos por Hora del Día</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="h-[500px]">
                                <ResponsiveBar
                                    data={ordersByHourData}
                                    keys={['pedidos']}
                                    indexBy="hora"
                                    margin={{ top: 50, right: 50, bottom: 50, left: 60 }}
                                    padding={0.3}
                                    layout="horizontal"
                                    valueScale={{ type: 'linear' }}
                                    indexScale={{ type: 'band', round: true }}
                                    colors={{ scheme: 'nivo' }}
                                    borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                                    axisTop={null}
                                    axisRight={null}
                                    axisBottom={{
                                        tickSize: 5,
                                        tickPadding: 5,
                                        tickRotation: 0,
                                        legend: 'Cantidad de Pedidos',
                                        legendPosition: 'middle',
                                        legendOffset: 40,
                                        tickColor: '#ffffff',
                                        legendColor: '#ffffff',
                                    }}
                                    axisLeft={{
                                        tickSize: 5,
                                        tickPadding: 5,
                                        tickRotation: 0,
                                        legend: 'Hora',
                                        legendPosition: 'middle',
                                        legendOffset: -50,
                                        tickColor: '#ffffff',
                                        legendColor: '#ffffff',
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
                                    labelSkipWidth={12}
                                    labelSkipHeight={12}
                                    labelTextColor="#ffffff"
                                    animate={true}
                                    motionConfig="gentle"
                                    tooltip={({ id, value, indexValue, color }) => (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '8px 12px',
                                                background: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: 6,
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                color: 'hsl(var(--foreground))',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 12,
                                                    height: 12,
                                                    backgroundColor: color,
                                                    borderRadius: 2,
                                                }}
                                            />
                                            <span style={{ fontSize: 14, fontWeight: 500 }}>
                                                {indexValue}: {value} pedidos
                                            </span>
                                        </div>
                                    )}
                                />
                                </div>
                                {/* Tabla de datos: Pedidos por Hora */}
                                <div className="h-[500px] flex flex-col">
                                    <DataTable
                                        title="Datos base: Pedidos por Hora del Día"
                                        columns={[
                                            { header: 'Hora', accessor: 'hora', align: 'left' },
                                            { header: 'Fecha Documento', accessor: (row) => {
                                                const order = orders?.find(o => o['Hora creacion'] === row.hora)
                                                return order?.['Fecha docto'] ? formatters.date(order['Fecha docto']) : 'N/A'
                                            }, align: 'left' },
                                            { header: 'ID. CO', accessor: (row) => {
                                                const order = orders?.find(o => o['Hora creacion'] === row.hora)
                                                return order?.['ID. CO'] || 'N/A'
                                            }, align: 'left' },
                                            { header: 'Desc. CO', accessor: (row) => {
                                                const order = orders?.find(o => o['Hora creacion'] === row.hora)
                                                return order?.['Desc. CO'] || 'N/A'
                                            }, align: 'left' },
                                            { header: 'Estado', accessor: (row) => {
                                                const order = orders?.find(o => o['Hora creacion'] === row.hora)
                                                return order?.Estado || 'N/A'
                                            }, align: 'left' },
                                            { header: 'Cantidad Pedidos', accessor: 'pedidos', align: 'right', format: (v) => formatters.number(v) },
                                        ]}
                                        data={ordersByHourData}
                                        showTotalRow={true}
                                        totalLabel="Total Pedidos"
                                        totalAccessor="pedidos"
                                        exportFilename="pedidos_por_hora"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gráfico de Líneas: Evolución de Pedidos */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Evolución de Pedidos por Hora</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="h-[500px]">
                                <ResponsiveLine
                                    data={evolutionByHourData}
                                    margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
                                    xScale={{ type: 'point' }}
                                    yScale={{
                                        type: 'linear',
                                        min: 'auto',
                                        max: 'auto',
                                        stacked: false,
                                        reverse: false,
                                    }}
                                    yFormat=" >-.2f"
                                    axisTop={null}
                                    axisRight={null}
                                    axisBottom={{
                                        tickSize: 5,
                                        tickPadding: 5,
                                        tickRotation: -45,
                                        legend: 'Hora',
                                        legendOffset: 36,
                                        legendPosition: 'middle',
                                        tickColor: '#ffffff',
                                        legendColor: '#ffffff',
                                    }}
                                    axisLeft={{
                                        tickSize: 5,
                                        tickPadding: 5,
                                        tickRotation: 0,
                                        legend: 'Cantidad',
                                        legendOffset: -40,
                                        legendPosition: 'middle',
                                        tickColor: '#ffffff',
                                        legendColor: '#ffffff',
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
                                    curve="monotoneX"
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
                                        <div
                                            style={{
                                                padding: 12,
                                                color: 'hsl(var(--foreground))',
                                                background: 'hsl(var(--background))',
                                                borderRadius: 4,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                            }}
                                        >
                                            <strong>Hora:</strong> {point.data.xFormatted}
                                            <br />
                                            <strong>Pedidos:</strong> {point.data.yFormatted}
                                        </div>
                                    )}
                                    enableSlices={false}
                                    debugSlices={false}
                                    sliceTooltip={({ slice }) => (
                                        <div
                                            style={{
                                                padding: 12,
                                                color: 'hsl(var(--foreground))',
                                                background: 'hsl(var(--background))',
                                                borderRadius: 4,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                            }}
                                        >
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
                                {/* Tabla de datos: Evolución de Pedidos */}
                                <div className="h-[500px] flex flex-col">
                                    <DataTable
                                        title="Datos base: Evolución de Pedidos por Hora"
                                        columns={[
                                            { header: 'Hora', accessor: 'hora', align: 'left' },
                                            { header: 'Fecha Documento', accessor: (row) => {
                                                const order = orders?.find(o => o['Hora creacion'] === row.hora)
                                                return order?.['Fecha docto'] ? formatters.date(order['Fecha docto']) : 'N/A'
                                            }, align: 'left' },
                                            { header: 'ID. CO', accessor: (row) => {
                                                const order = orders?.find(o => o['Hora creacion'] === row.hora)
                                                return order?.['ID. CO'] || 'N/A'
                                            }, align: 'left' },
                                            { header: 'Desc. CO', accessor: (row) => {
                                                const order = orders?.find(o => o['Hora creacion'] === row.hora)
                                                return order?.['Desc. CO'] || 'N/A'
                                            }, align: 'left' },
                                            { header: 'Estado', accessor: (row) => {
                                                const order = orders?.find(o => o['Hora creacion'] === row.hora)
                                                return order?.Estado || 'N/A'
                                            }, align: 'left' },
                                            { header: 'Cantidad Pedidos', accessor: 'pedidos', align: 'right', format: (v) => formatters.number(v) },
                                        ]}
                                        data={ordersByHourData}
                                        showTotalRow={true}
                                        totalLabel="Total Pedidos"
                                        totalAccessor="pedidos"
                                        exportFilename="evolucion_pedidos_hora"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </ErrorBoundary>
    )
}

