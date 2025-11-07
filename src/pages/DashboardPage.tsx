import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { ChartsSection } from '@/components/dashboard/ChartsSection'
import { ClientsTable } from '@/components/dashboard/ClientsTable'
import { CompaniesTable } from '@/components/dashboard/CompaniesTable'
import { ProductsTable } from '@/components/dashboard/ProductsTable'

export const DashboardPage = () => {
    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Resumen general de clientes, compañías y productos
                    </p>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <StatsCards />

            {/* Charts Section */}
            <ChartsSection />

            {/* Tables Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
            >
                <Tabs defaultValue="clients" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="clients">Clientes</TabsTrigger>
                        <TabsTrigger value="companies">Compañías</TabsTrigger>
                        <TabsTrigger value="products">Productos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="clients" className="space-y-4">
                        <ClientsTable />
                    </TabsContent>

                    <TabsContent value="companies" className="space-y-4">
                        <CompaniesTable />
                    </TabsContent>

                    <TabsContent value="products" className="space-y-4">
                        <ProductsTable />
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
    )
}
