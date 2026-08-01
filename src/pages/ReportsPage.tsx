import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Modal } from '@/components/ui/modal'
import { useDailyOrders } from '@/hooks/useReports'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveLine } from '@nivo/line'
import { DataTable } from '@/components/dashboard/DataTable'
import { formatters } from '@/utils/formatters'
import { PieChart, BarChart3, Clock, LineChart, ArrowRight } from 'lucide-react'

// Theme compartido para los gráficos Nivo: usa los tokens semánticos del
// proyecto para que texto/ejes se lean bien tanto en claro como en oscuro.
const nivoTheme = {
    axis: {
        ticks: {
            text: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 },
        },
        legend: {
            text: { fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 },
        },
    },
    grid: {
        line: {
            stroke: 'hsl(var(--border))',
        },
    },
    tooltip: {
        container: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
    },
    labels: {
        text: { fontSize: 11 },
    },
    legends: {
        text: { fontSize: 11 },
    },
}

type ChartKey = 'estados' | 'compania' | 'hora' | 'evolucion'

export const ReportsPage = () => {
    const { data: orders, isLoading, error, refetch } = useDailyOrders()
    const [openChart, setOpenChart] = useState<ChartKey | null>(null)

    // Datos para gráfico de distribución de estados (Pie)
    // Memoizado: abrir un Modal cambia `openChart` y re-renderiza el
    // componente, pero eso no debe disparar de nuevo este reduce/map sobre
    // las ~800+ filas de `orders` si los datos crudos no cambiaron.
    const ordersByStatusData = useMemo(() => (
        orders && Array.isArray(orders)
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
    ), [orders])

    // Datos para gráfico de pedidos por compañía (Bar - Top 5)
    const ordersByCompanyData = useMemo(() => (
        orders && Array.isArray(orders)
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
    ), [orders])

    // Datos para gráfico de pedidos por hora (Bar)
    const ordersByHourData = useMemo(() => (
        orders && Array.isArray(orders)
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
    ), [orders])

    // Datos para gráfico de evolución por hora (Line)
    const evolutionByHourData = useMemo(() => (
        orders && Array.isArray(orders)
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
    ), [orders, ordersByHourData])

    const totalPedidos = orders?.length ?? 0

    // Resúmenes para las cards compactas
    const topStatus = [...ordersByStatusData].sort((a, b) => b.value - a.value)[0]
    const topStatusPct = topStatus && totalPedidos > 0 ? Math.round((topStatus.value / totalPedidos) * 100) : 0

    const topCompany = ordersByCompanyData[0]
    const topCompanyPct = topCompany && totalPedidos > 0 ? Math.round((topCompany.pedidos / totalPedidos) * 100) : 0

    const peakHour = [...ordersByHourData].sort((a, b) => b.pedidos - a.pedidos)[0]

    const hoursWithData = ordersByHourData.length

    if (isLoading) {
        return (
            <div className="flex-1 space-y-6 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-5 w-32" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-16 w-full" />
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
                    title="Error al cargar reportes"
                    message={`No se pudieron obtener los datos. Error: ${error.message}`}
                    onRetry={() => refetch()}
                />
            </div>
        )
    }

    return (
        <ErrorBoundary>
            <div className="flex-1 space-y-6 p-6">
                {/* Cards resumen clicables */}
                <motion.div
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    {/* Card: Distribución de Estados */}
                    <Card
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setOpenChart('estados')}
                    >
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <PieChart className="h-5 w-5 text-primary" />
                                Distribución de Estados
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {topStatus ? (
                                <>
                                    <div className="text-2xl font-bold">{topStatus.label}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {formatters.abbreviate(topStatus.value)} pedidos · {topStatusPct}% del total
                                    </p>
                                    <div className="h-24">
                                        <ResponsivePie
                                            data={ordersByStatusData}
                                            margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                                            innerRadius={0.5}
                                            padAngle={1}
                                            cornerRadius={2}
                                            colors={{ scheme: 'category10' }}
                                            enableArcLinkLabels={false}
                                            enableArcLabels={false}
                                            isInteractive={false}
                                            animate={false}
                                            legends={[]}
                                        />
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">Sin datos</p>
                            )}
                            <p className="mt-1 flex items-center justify-end gap-1 text-xs font-medium text-primary">
                                Abrir Detalle <ArrowRight className="h-3 w-3" />
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card: Pedidos por Compañía */}
                    <Card
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setOpenChart('compania')}
                    >
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <BarChart3 className="h-5 w-5 text-primary" />
                                Pedidos por Compañía
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {topCompany ? (
                                <>
                                    <div className="text-2xl font-bold truncate" title={topCompany.compañía}>
                                        {topCompany.compañía}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {formatters.abbreviate(topCompany.pedidos)} pedidos · {topCompanyPct}% del total
                                    </p>
                                    <div className="h-24">
                                        <ResponsiveBar
                                            data={ordersByCompanyData}
                                            keys={['pedidos']}
                                            indexBy="compañía"
                                            margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                                            padding={0.25}
                                            colors={['hsl(0 79% 32%)', 'hsl(0 79% 41%)', 'hsl(0 75% 52%)', 'hsl(0 70% 63%)', 'hsl(0 65% 75%)']}
                                            colorBy="indexValue"
                                            borderRadius={3}
                                            axisTop={null}
                                            axisRight={null}
                                            axisBottom={null}
                                            axisLeft={null}
                                            enableLabel={false}
                                            enableGridX={false}
                                            enableGridY={false}
                                            isInteractive={false}
                                            animate={false}
                                            legends={[]}
                                        />
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">Sin datos</p>
                            )}
                            <p className="mt-1 flex items-center justify-end gap-1 text-xs font-medium text-primary">
                                Abrir Detalle <ArrowRight className="h-3 w-3" />
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card: Pedidos por Hora */}
                    <Card
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setOpenChart('hora')}
                    >
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Clock className="h-5 w-5 text-primary" />
                                Pedidos por Hora
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {peakHour ? (
                                <>
                                    <div className="text-2xl font-bold">{peakHour.hora}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Hora pico · {formatters.abbreviate(peakHour.pedidos)} pedidos
                                    </p>
                                    <div className="h-24">
                                        <ResponsiveBar
                                            data={ordersByHourData}
                                            keys={['pedidos']}
                                            indexBy="hora"
                                            margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                                            padding={0.2}
                                            colors="hsl(var(--primary))"
                                            borderRadius={2}
                                            axisTop={null}
                                            axisRight={null}
                                            axisBottom={null}
                                            axisLeft={null}
                                            enableLabel={false}
                                            enableGridX={false}
                                            enableGridY={false}
                                            isInteractive={false}
                                            animate={false}
                                            legends={[]}
                                        />
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">Sin datos</p>
                            )}
                            <p className="mt-1 flex items-center justify-end gap-1 text-xs font-medium text-primary">
                                Abrir Detalle <ArrowRight className="h-3 w-3" />
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card: Evolución de Pedidos */}
                    <Card
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setOpenChart('evolucion')}
                    >
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <LineChart className="h-5 w-5 text-primary" />
                                Evolución de Pedidos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatters.abbreviate(totalPedidos)}</div>
                            <p className="text-xs text-muted-foreground">
                                Total del día · {hoursWithData} franjas horarias
                            </p>
                            <div className="h-24">
                                <ResponsiveLine
                                    data={evolutionByHourData}
                                    margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                                    xScale={{ type: 'point' }}
                                    yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                                    axisTop={null}
                                    axisRight={null}
                                    axisBottom={null}
                                    axisLeft={null}
                                    enableGridX={false}
                                    enableGridY={false}
                                    colors={['hsl(var(--primary))']}
                                    lineWidth={2}
                                    pointSize={0}
                                    enablePoints={false}
                                    enableArea={true}
                                    areaOpacity={0.15}
                                    useMesh={false}
                                    isInteractive={false}
                                    animate={false}
                                    legends={[]}
                                />
                            </div>
                            <p className="mt-1 flex items-center justify-end gap-1 text-xs font-medium text-primary">
                                Abrir Detalle <ArrowRight className="h-3 w-3" />
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Modal: Distribución de Estados */}
                <Modal
                    isOpen={openChart === 'estados'}
                    onClose={() => setOpenChart(null)}
                    title="Distribución de Estados"
                    className="max-w-6xl"
                >
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
                                arcLinkLabelsTextColor="hsl(var(--foreground))"
                                arcLinkLabelsThickness={2}
                                arcLinkLabelsColor={{ from: 'color' }}
                                arcLabelsSkipAngle={10}
                                arcLabelsTextColor="hsl(var(--background))"
                                valueFormat={(v) => formatters.abbreviate(Number(v))}
                                theme={nivoTheme}
                                animate={false}
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
                                        itemTextColor: 'hsl(var(--foreground))',
                                        itemDirection: 'left-to-right',
                                        itemOpacity: 1,
                                        symbolSize: 12,
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
                                    { header: 'Cantidad', accessor: 'value', align: 'right', format: (v) => formatters.abbreviate(Number(v)) },
                                ]}
                                data={ordersByStatusData}
                                showTotalRow={true}
                                totalLabel="Total Pedidos"
                                totalAccessor="value"
                                exportFilename="distribucion_estados"
                            />
                        </div>
                    </div>
                </Modal>

                {/* Modal: Pedidos por Compañía */}
                <Modal
                    isOpen={openChart === 'compania'}
                    onClose={() => setOpenChart(null)}
                    title="Pedidos por Compañía (Top 5)"
                    className="max-w-6xl"
                >
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
                                }}
                                axisLeft={{
                                    tickSize: 5,
                                    tickPadding: 5,
                                    tickRotation: 0,
                                    legend: 'Cantidad de Pedidos',
                                    legendPosition: 'middle',
                                    legendOffset: -40,
                                }}
                                theme={nivoTheme}
                                labelSkipWidth={12}
                                labelSkipHeight={12}
                                labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
                                animate={false}
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
                                    { header: 'Cantidad Pedidos', accessor: 'pedidos', align: 'right', format: (v) => formatters.abbreviate(Number(v)) },
                                ]}
                                data={ordersByCompanyData}
                                showTotalRow={true}
                                totalLabel="Total Pedidos"
                                totalAccessor="pedidos"
                                exportFilename="pedidos_por_compania"
                            />
                        </div>
                    </div>
                </Modal>

                {/* Modal: Pedidos por Hora */}
                <Modal
                    isOpen={openChart === 'hora'}
                    onClose={() => setOpenChart(null)}
                    title="Pedidos por Hora del Día"
                    className="max-w-6xl"
                >
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
                                format: (v) => formatters.abbreviate(Number(v))
                            }}
                            axisLeft={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: 'Hora',
                                legendPosition: 'middle',
                                legendOffset: -50,
                            }}
                            theme={nivoTheme}
                            labelSkipWidth={12}
                            labelSkipHeight={12}
                            labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
                            animate={false}
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
                                    { header: 'Cantidad Pedidos', accessor: 'pedidos', align: 'right', format: (v) => formatters.abbreviate(Number(v)) },
                                ]}
                                data={ordersByHourData}
                                showTotalRow={true}
                                totalLabel="Total Pedidos"
                                totalAccessor="pedidos"
                                exportFilename="pedidos_por_hora"
                            />
                        </div>
                    </div>
                </Modal>

                {/* Modal: Evolución de Pedidos */}
                <Modal
                    isOpen={openChart === 'evolucion'}
                    onClose={() => setOpenChart(null)}
                    title="Evolución de Pedidos por Hora"
                    className="max-w-6xl"
                >
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
                            }}
                            axisLeft={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: 'Cantidad',
                                legendOffset: -40,
                                legendPosition: 'middle',
                                format: (v) => formatters.abbreviate(Number(v))
                                }}
                            theme={nivoTheme}
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
                            pointLabel={(point) => `${point.yFormatted}`}
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
                                    {slice.points.map((point) => (
                                        <div key={point.id}>
                                            <strong>{point.data.xFormatted}:</strong> {point.data.yFormatted}
                                        </div>
                                    ))}
                                </div>
                            )}
                            enableCrosshair={true}
                            crosshairType="x"
                            role="application"
                            defs={[]}
                            fill={[]}
                            animate={false}
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
                                    { header: 'Cantidad Pedidos', accessor: 'pedidos', align: 'right', format: (v) => formatters.abbreviate(Number(v)) },
                                ]}
                                data={ordersByHourData}
                                showTotalRow={true}
                                totalLabel="Total Pedidos"
                                totalAccessor="pedidos"
                                exportFilename="evolucion_pedidos_hora"
                            />
                        </div>
                    </div>
                </Modal>
            </div>
        </ErrorBoundary>
    )
}
