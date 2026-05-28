import { motion } from 'framer-motion'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { ChartsSection } from '@/components/dashboard/ChartsSection'
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable'
import { RecentInvoicesTable } from '@/components/dashboard/RecentInvoicesTable'

export const DashboardPage = () => {
    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col gap-2"
            >
                <h1 className="text-3xl font-bold tracking-tight">Dashboard General</h1>
                <p className="text-muted-foreground">Monitoreo de actividad comercial y financiera en tiempo real</p>
            </motion.div>

            {/* Stats Cards */}
            <StatsCards />

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Charts Section */}
                <div className="lg:col-span-2">
                    <ChartsSection />
                </div>

                {/* Recent Activity Tables */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    <RecentOrdersTable />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <RecentInvoicesTable />
                </motion.div>
            </div>
        </div>
    )
}
