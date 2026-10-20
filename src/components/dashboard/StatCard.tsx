import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { TableProperties } from 'lucide-react'
import { useDetalle } from '@/components/tablero/detalle/contexto'
import type { EspecDetalle } from '@/components/tablero/detalle/tipos'

interface StatCardProps {
    label: string
    value: string | number
    icon: LucideIcon
    isLoading?: boolean
    hasError?: boolean
    delay?: number
    /** Registros que componen el valor: al tocar la tarjeta se abre su tabla. */
    detalle?: EspecDetalle
}

export const StatCard = ({ label, value, icon: Icon, isLoading, hasError, delay = 0, detalle }: StatCardProps) => {
    const detalles = useDetalle()
    const abrir = detalle && detalles && !isLoading && !hasError
        ? () => detalles.abrir({ ...detalle, valor: detalle.valor ?? String(value) })
        : undefined
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay }}
        >
            <Card
                className={`border-l-4 border-l-primary ${abrir ? 'cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary' : ''}`}
                {...(abrir ? {
                    role: 'button', tabIndex: 0, 'aria-label': `${label}: ver los registros que componen el valor`, onClick: abrir,
                    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir() } },
                } : {})}
            >
                <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
                        {isLoading ? (
                            <Skeleton className="h-6 w-16 mt-1" />
                        ) : hasError ? (
                            <p className="text-base font-semibold text-destructive">Error</p>
                        ) : (
                            <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
                        )}
                        {abrir && <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary"><TableProperties className="h-3 w-3" />Ver registros</p>}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
