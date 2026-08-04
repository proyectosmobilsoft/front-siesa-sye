import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'

interface StatCardProps {
    label: string
    value: string | number
    icon: LucideIcon
    isLoading?: boolean
    hasError?: boolean
    delay?: number
}

export const StatCard = ({ label, value, icon: Icon, isLoading, hasError, delay = 0 }: StatCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay }}
        >
            <Card className="border-l-4 border-l-primary">
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
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
