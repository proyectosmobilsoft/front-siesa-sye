import { motion } from 'framer-motion'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { VendorsChart } from '@/components/dashboard/VendorsChart'
import { OrdersStatusBreakdown } from '@/components/dashboard/OrdersStatusBreakdown'
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable'

export const DashboardPage = () => {
    return (
        <div className="flex-1 space-y-6 p-6">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col gap-1 border-l-4 border-l-primary pl-4"
            >
                <h1 className="text-3xl font-bold tracking-tight">Dashboard General</h1>
                <p className="text-muted-foreground">Resumen de actividad comercial</p>
            </motion.div>

            <StatsCards />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <VendorsChart />
                </div>
                <OrdersStatusBreakdown />
            </div>

            <RecentOrdersTable />
        </div>
    )
}
