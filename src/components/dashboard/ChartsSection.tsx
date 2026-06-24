import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useTendenciaMensual } from '@/hooks/useTendenciaMensual'
import { useVendors } from '@/hooks/useReports'
import { ResponsiveLine } from '@nivo/line'
import { ResponsiveBar } from '@nivo/bar'
import { formatters } from '@/utils/formatters'

export const ChartsSection = () => {
    // Definir periodo por defecto (últimos meses)
    const { data: tendencia, isLoading: tendenciaLoading } = useTendenciaMensual({
        periodoInicial: 202401,
        periodoFinal: 202412
    })
    const { data: vendors, isLoading: vendorsLoading } = useVendors()

    // Preparar datos para Ventas Mensuales (Line Chart)
    const lineData = tendencia ? [
        {
            id: 'Ventas',
            color: 'hsl(var(--primary))',
            data: tendencia.map(t => {
                const str = t.Periodo.toString()
                const label = `${str.substring(4, 6)}/${str.substring(0, 4)}`
                return { x: label, y: t.Ingresos }
            })
        }
    ] : []

    // Preparar datos para Ventas por Vendedor (Bar Chart)
    const barData = vendors ? vendors
        .map(v => ({
            vendedor: v['Nombre vendedor']?.split(' ')[0] || 'Vendedor',
            ventas: v['Valor neto'],
            nombreCompleto: v['Nombre vendedor']
        }))
        .sort((a, b) => b.ventas - a.ventas)
        .slice(0, 5) : []

    if (tendenciaLoading || vendorsLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2">
                {['Tendencia de Ventas', 'Top Vendedores'].map(title => (
                    <Card key={title}>
                        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
                        <CardContent><Skeleton className="h-72 w-full" /></CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    const chartTheme = {
        tooltip: {
            container: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                fontSize: 12,
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                border: '1px solid hsl(var(--border))'
            }
        },
        axis: {
            ticks: { text: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } },
            legend: { text: { fontSize: 12, fontWeight: 600, fill: 'hsl(var(--foreground))' } }
        },
        grid: { line: { stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' } }
    }

    return (
        <ErrorBoundary>
            <motion.div
                className="grid gap-6 md:grid-cols-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
                {/* Tendencia de Ventas Mensuales */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tendencia de Ventas</CardTitle>
                        <p className="text-sm text-muted-foreground">Ingresos mensuales (2024)</p>
                    </CardHeader>
                    <CardContent>
                        <div className="h-72">
                            {lineData[0]?.data.length > 0 ? (
                                <ResponsiveLine
                                    data={lineData}
                                    margin={{ top: 20, right: 20, bottom: 50, left: 80 }}
                                    xScale={{ type: 'point' }}
                                    yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                                    axisTop={null}
                                    axisRight={null}
                                    axisBottom={{
                                        tickSize: 5,
                                        tickPadding: 5,
                                        tickRotation: -45,
                                        legend: 'Mes',
                                        legendOffset: 40,
                                        legendPosition: 'middle'
                                    }}
                                    axisLeft={{
                                        tickSize: 5,
                                        tickPadding: 5,
                                        tickRotation: 0,
                                        legend: 'Monto ($)',
                                        legendOffset: -70,
                                        legendPosition: 'middle',
                                        format: v => formatters.compactCurrency(v)
                                    }}
                                    pointSize={8}
                                    pointColor={{ theme: 'background' }}
                                    pointBorderWidth={2}
                                    pointBorderColor={{ from: 'serieColor' }}
                                    pointLabelYOffset={-12}
                                    useMesh={true}
                                    colors={['#B71C1C']}
                                    theme={chartTheme}
                                    enableArea={true}
                                    areaOpacity={0.1}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sin datos de tendencia</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Vendedores */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Vendedores</CardTitle>
                        <p className="text-sm text-muted-foreground">Ventas netas por asesor</p>
                    </CardHeader>
                    <CardContent>
                        <div className="h-72">
                            {barData.length > 0 ? (
                                <ResponsiveBar
                                    data={barData}
                                    keys={['ventas']}
                                    indexBy="vendedor"
                                    margin={{ top: 20, right: 20, bottom: 50, left: 80 }}
                                    padding={0.3}
                                    valueScale={{ type: 'linear' }}
                                    indexScale={{ type: 'band', round: true }}
                                    colors={['#B71C1C']}
                                    borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                                    axisTop={null}
                                    axisRight={null}
                                    axisBottom={{
                                        tickSize: 5,
                                        tickPadding: 5,
                                        tickRotation: 0,
                                        legend: 'Asesor',
                                        legendPosition: 'middle',
                                        legendOffset: 32
                                    }}
                                    axisLeft={{
                                        tickSize: 5,
                                        tickPadding: 5,
                                        tickRotation: 0,
                                        legend: 'Ventas ($)',
                                        legendPosition: 'middle',
                                        legendOffset: -70,
                                        format: v => formatters.compactCurrency(v)
                                    }}
                                    labelSkipWidth={12}
                                    labelSkipHeight={12}
                                    labelTextColor="#ffffff"
                                    label={d => formatters.compactCurrency(d.value as number)}
                                    theme={chartTheme}
                                    tooltip={({ data }) => (
                                        <div className="bg-white p-2 border rounded shadow-sm text-xs font-medium">
                                            <span className="text-gray-500">{data.nombreCompleto}:</span>
                                            <span className="ml-1 text-primary">{formatters.currency(data.ventas)}</span>
                                        </div>
                                    )}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sin datos de vendedores</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </ErrorBoundary>
    )
}
