import { motion } from 'framer-motion'
import { ClientsTable } from '@/components/dashboard/ClientsTable'

export const ClientsPage = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-8 p-6"
        >
            <ClientsTable />
        </motion.div>
    )
}
