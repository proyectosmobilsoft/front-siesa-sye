import { motion } from 'framer-motion'
import { CompaniesTable } from '@/components/dashboard/CompaniesTable'

export const CompaniesPage = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex h-full min-h-0 flex-col p-6"
        >
            <CompaniesTable />
        </motion.div>
    )
}
