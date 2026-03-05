import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'

export const MaestroRolesPage = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-6 p-6"
        >
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Maestro de Roles</h1>
                <p className="text-muted-foreground">
                    Gestión de roles y permisos del sistema
                </p>
            </div>

            <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Lista de Roles
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Próximamente: Tabla de configuración de roles del sistema.</p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
