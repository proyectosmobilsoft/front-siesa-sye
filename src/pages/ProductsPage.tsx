import { motion } from 'framer-motion'
import { ProductsTable } from '@/components/dashboard/ProductsTable'

export const ProductsPage = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-8 p-6"
        >
            <ProductsTable />
        </motion.div>
    )
}
