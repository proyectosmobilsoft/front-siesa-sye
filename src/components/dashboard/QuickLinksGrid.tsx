import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
    User,
    Package,
    ShoppingBag,
    Ticket,
    Wallet,
    Receipt,
    FileText,
    Users,
    Landmark,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { PERMISOS } from '@/config/permisos'

interface QuickLink {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    permiso?: string
}

// Mismo criterio de navegación/permisos que Sidebar.tsx: módulos sin permiso
// definido aún en backend quedan visibles para todo usuario autenticado.
const quickLinks: QuickLink[] = [
    { name: 'Clientes', href: '/clientes', icon: User },
    { name: 'Productos', href: '/productos', icon: Package },
    { name: 'Pedidos', href: '/pedidos', icon: ShoppingBag },
    { name: 'Ferreganga', href: '/ferreganga', icon: Ticket },
    { name: 'Egreso', href: '/egreso', icon: Wallet, permiso: PERMISOS.EGRESO },
    { name: 'Facturas', href: '/facturas/gestion-ventas', icon: Receipt, permiso: PERMISOS.GESTION_VENTAS },
    { name: 'Reportes', href: '/reportes', icon: FileText },
    { name: 'Maestro', href: '/maestro/roles', icon: Users },
    { name: 'Tesorería', href: '/tesoreria/recibo-caja', icon: Landmark },
]

export const QuickLinksGrid = () => {
    const { hasPermiso } = useAuthStore()

    const linksFiltrados = quickLinks.filter(link => !link.permiso || hasPermiso(link.permiso))

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
            <Card>
                <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Accesos rápidos</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
                        {linksFiltrados.map(link => (
                            <Link
                                key={link.href}
                                to={link.href}
                                className="flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <link.icon className="h-5 w-5 text-primary" />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground">{link.name}</span>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
