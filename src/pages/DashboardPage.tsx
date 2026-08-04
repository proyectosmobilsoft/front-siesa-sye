import { StatsCards } from '@/components/dashboard/StatsCards'
import { VendorsChart } from '@/components/dashboard/VendorsChart'
import { OrdersStatusBreakdown } from '@/components/dashboard/OrdersStatusBreakdown'
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable'

export const DashboardPage = () => {
    return (
        <div className="flex-1 space-y-6 p-6">
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
