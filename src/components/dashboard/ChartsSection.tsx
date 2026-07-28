import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useTendenciaMensual } from '@/hooks/useTendenciaMensual'
import { useVendors } from '@/hooks/useReports'
import { useDebouncedElementSize } from '@/hooks/useDebouncedElementSize'
import {
    ComposedChart, Area, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'
import { formatters } from '@/utils/formatters'

const AXIS_STYLE = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }

export const ChartsSection = () => {
    // Definir periodo por defecto (últimos meses)
    const { data: tendencia, isLoading: tendenciaLoading } = useTendenciaMensual({
        periodoInicial: 202401,
        periodoFinal: 202412
    })
    const { data: vendors, isLoading: vendorsLoading } = useVendors()

    // Se cambió de Nivo (ResponsiveLine/ResponsiveBar) a Recharts: Nivo trae su
    // propio ResizeObserver sin debounce y redibuja el SVG completo del chart
    // en cada notificación de resize. Al contraer/expandir el sidebar eso
    // encadenaba redibujados de ambas gráficas y colgaba la pestaña. Se
    // mantiene además la medición con debounce propia (useDebouncedElementSize)
    // como capa extra de seguridad para no depender de ningún resize interno
    // de la librería de gráficas.
    const lineSize = useDebouncedElementSize()
    const barSize = useDebouncedElementSize()

    // Preparar datos para Tendencia financiera (Ingresos + Utilidad)
    const lineData = tendencia
        ? tendencia.map(t => {
            const str = t.Periodo.toString()
            return {
                mes: `${str.substring(4, 6)}/${str.substring(0, 4)}`,
                ingresos: t.Ingresos,
                utilidad: t.Utilidad,
            }
        })
        : []

    // Los valores vienen negativos: se fuerza el dominio del eje Y con el
    // mínimo/máximo de AMBAS series para que el área de ingresos quede
    // siempre por debajo de su línea y ambas series compartan escala.
    const todosLosValores = lineData.flatMap(d => [d.ingresos, d.utilidad])
    const yMin = todosLosValores.length ? Math.min(...todosLosValores) : 0
    const yMax = todosLosValores.length ? Math.max(...todosLosValores) : 0

    // Preparar datos para Ventas por Vendedor
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
                {['Tendencia Financiera', 'Top Vendedores'].map(title => (
                    <Card key={title}>
                        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
                        <CardContent><Skeleton className="h-72 w-full" /></CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <ErrorBoundary>
            <motion.div
                className="grid gap-6 md:grid-cols-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
                {/* Tendencia financiera: Ingresos vs Utilidad */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tendencia Financiera</CardTitle>
                        <p className="text-sm text-muted-foreground">Ingresos y utilidad mensual (2024)</p>
                    </CardHeader>
                    <CardContent>
                        <div ref={lineSize.ref} className="h-72">
                            {lineData.length > 0 && lineSize.width > 0 ? (
                                <ComposedChart
                                    width={lineSize.width}
                                    height={lineSize.height}
                                    data={lineData}
                                    margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                                >
                                    <defs>
                                        <linearGradient id="tendenciaGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#B71C1C" stopOpacity={0} />
                                            <stop offset="100%" stopColor="#B71C1C" stopOpacity={0.45} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="mes" tick={AXIS_STYLE} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                                    <YAxis
                                        tick={AXIS_STYLE}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={[yMin, yMax]}
                                        tickFormatter={v => formatters.compactCurrency(v)}
                                        width={70}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => formatters.currency(value)}
                                        contentStyle={{
                                            background: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: 8,
                                            fontSize: 12
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Area
                                        type="monotone"
                                        dataKey="ingresos"
                                        name="Ingresos"
                                        stroke="#B71C1C"
                                        strokeWidth={2}
                                        fill="url(#tendenciaGradient)"
                                        dot={{ r: 4, fill: 'hsl(var(--card))', stroke: '#B71C1C', strokeWidth: 2 }}
                                        activeDot={{ r: 6 }}
                                        isAnimationActive={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="utilidad"
                                        name="Utilidad"
                                        stroke="#1D4ED8"
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: 'hsl(var(--card))', stroke: '#1D4ED8', strokeWidth: 2 }}
                                        activeDot={{ r: 5 }}
                                        isAnimationActive={false}
                                    />
                                </ComposedChart>
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
                        <div ref={barSize.ref} className="h-72">
                            {barData.length > 0 && barSize.width > 0 ? (
                                <BarChart
                                    width={barSize.width}
                                    height={barSize.height}
                                    data={barData}
                                    margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="vendedor" tick={AXIS_STYLE} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                                    <YAxis
                                        tick={AXIS_STYLE}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={v => formatters.compactCurrency(v)}
                                        width={70}
                                    />
                                    <Tooltip
                                        formatter={(value: number, _name, item) => [
                                            formatters.currency(value),
                                            item.payload.nombreCompleto
                                        ]}
                                        contentStyle={{
                                            background: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: 8,
                                            fontSize: 12
                                        }}
                                    />
                                    <Bar dataKey="ventas" fill="#B71C1C" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                </BarChart>
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
