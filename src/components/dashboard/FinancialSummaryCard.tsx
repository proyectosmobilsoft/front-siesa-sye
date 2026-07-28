import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { usePerdidasGanancias } from '@/hooks/usePerdidasGanancias'
import { useDebouncedElementSize } from '@/hooks/useDebouncedElementSize'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { formatters } from '@/utils/formatters'

const AXIS_STYLE = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
const COLOR_BY_TIPO: Record<string, string> = {
    INGRESO: '#1D4ED8',
    INGRESOS: '#1D4ED8',
    COSTO: '#B71C1C',
    COSTOS: '#B71C1C',
    GASTO: '#D97706',
    GASTOS: '#D97706',
}
const DEFAULT_COLOR = '#6B7280'

export const FinancialSummaryCard = () => {
    const { data: perdidasGanancias, isLoading, error } = usePerdidasGanancias({
        periodoInicial: 202401,
        periodoFinal: 202412
    })

    // Se usa el mismo patrón de medición con debounce que ChartsSection: evita
    // que el ResizeObserver del chart redibuje en cascada al contraer el
    // sidebar (ver src/hooks/useDebouncedElementSize.ts).
    const size = useDebouncedElementSize()

    // Agrupar por TipoCuenta (Ingresos / Costos / Gastos) sumando el Total
    const dataPorTipo = perdidasGanancias
        ? Object.values(
            perdidasGanancias.reduce<Record<string, { tipo: string; total: number }>>((acc, item) => {
                const tipo = item.TipoCuenta || 'Otro'
                if (!acc[tipo]) acc[tipo] = { tipo, total: 0 }
                acc[tipo].total += Math.abs(item.Total)
                return acc
            }, {})
        ).sort((a, b) => b.total - a.total)
        : []

    if (isLoading) {
        return (
            <Card>
                <CardHeader><CardTitle>Pérdidas y Ganancias</CardTitle></CardHeader>
                <CardContent><Skeleton className="h-56 w-full" /></CardContent>
            </Card>
        )
    }

    return (
        <ErrorBoundary>
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Pérdidas y Ganancias</CardTitle>
                        <p className="text-sm text-muted-foreground">Ingresos, costos y gastos del periodo (2024)</p>
                    </CardHeader>
                    <CardContent>
                        <div ref={size.ref} className="h-56">
                            {!error && dataPorTipo.length > 0 && size.width > 0 ? (
                                <BarChart
                                    width={size.width}
                                    height={size.height}
                                    data={dataPorTipo}
                                    layout="vertical"
                                    margin={{ top: 10, right: 30, bottom: 10, left: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        tick={AXIS_STYLE}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={v => formatters.compactCurrency(v)}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="tipo"
                                        tick={AXIS_STYLE}
                                        axisLine={false}
                                        tickLine={false}
                                        width={90}
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
                                    <Bar dataKey="total" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                                        {dataPorTipo.map(entry => (
                                            <Cell
                                                key={entry.tipo}
                                                fill={COLOR_BY_TIPO[entry.tipo.toUpperCase()] ?? DEFAULT_COLOR}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                    Sin datos de pérdidas y ganancias
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </ErrorBoundary>
    )
}
