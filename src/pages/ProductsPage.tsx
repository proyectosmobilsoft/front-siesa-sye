import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductsTable } from '@/components/dashboard/ProductsTable'

export const ProductsPage = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-8 p-6"
        >
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
                <p className="text-muted-foreground">
                    Gestión y visualización de productos
                </p>
            </div>
            <ProductsTable />
        </motion.div>
    )
}
