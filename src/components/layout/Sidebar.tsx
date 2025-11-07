import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
    BarChart3,
    Users,
    Building2,
    Package,
    FileText,
    Settings,
    HelpCircle,
    X,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    TrendingUp,
    UserCircle,
    Receipt,
    ShoppingCart,
    TrendingDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

interface NavItem {
    name: string
    href?: string
    icon: React.ComponentType<{ className?: string }>
    subItems?: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }> }>
}

const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Compañías', href: '/companias', icon: Building2 },
    { name: 'Productos', href: '/productos', icon: Package },
    {
        name: 'Facturas',
        icon: Receipt,
        subItems: [
            { name: 'Gestión de Ventas', href: '/facturas/gestion-ventas', icon: ShoppingCart },
            { name: 'Análisis Financiero', href: '/facturas/analisis-financiero', icon: TrendingDown }
        ]
    },
    {
        name: 'Reportes',
        icon: FileText,
        subItems: [
            { name: 'Pedidos Diarios', href: '/reportes', icon: ClipboardList },
            { name: 'Resumen Ventas', href: '/reportes/ventas', icon: TrendingUp },
            { name: 'Vendedores', href: '/reportes/vendedores', icon: UserCircle }
        ]
    },
    { name: 'Configuración', href: '/configuracion', icon: Settings },
    { name: 'Ayuda', href: '/ayuda', icon: HelpCircle },
]

export const Sidebar = () => {
    const { sidebarOpen, setSidebarOpen } = useUIStore()
    const location = useLocation()
    const isMobile = useMediaQuery('(max-width: 1023px)')
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

    // Asegurar que el sidebar esté abierto en desktop
    useEffect(() => {
        if (!isMobile) {
            setSidebarOpen(true)
        }
    }, [isMobile, setSidebarOpen])

    // Auto-expandir items si la ruta actual está en sus sub-items
    useEffect(() => {
        navigation.forEach((item) => {
            if (item.subItems) {
                const hasActiveSubItem = item.subItems.some(
                    (subItem) => subItem.href === location.pathname
                )
                if (hasActiveSubItem) {
                    setExpandedItems((prev) => new Set(prev).add(item.name))
                }
            }
        })
    }, [location.pathname])

    const toggleExpanded = (itemName: string) => {
        setExpandedItems((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(itemName)) {
                newSet.delete(itemName)
            } else {
                newSet.add(itemName)
            }
            return newSet
        })
    }

    const isItemExpanded = (itemName: string) => expandedItems.has(itemName)

    return (
        <>
            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <motion.div
                initial={false}
                animate={{ x: sidebarOpen ? 0 : '-100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={cn(
                    'fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border',
                    'lg:relative lg:z-auto lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="flex h-16 items-center justify-between px-6 border-b border-border">
                        <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                <BarChart3 className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="text-lg font-semibold">Dashboard</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                        {navigation.map((item) => {
                            const hasSubItems = item.subItems && item.subItems.length > 0
                            const isExpanded = isItemExpanded(item.name)

                            // Verificar si algún sub-item está activo
                            const isSubItemActive = hasSubItems
                                ? item.subItems!.some((subItem) => subItem.href === location.pathname)
                                : false

                            const isActive = !hasSubItems && location.pathname === item.href

                            return (
                                <div key={item.name} className="space-y-1">
                                    {hasSubItems ? (
                                        <>
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <button
                                                    onClick={() => toggleExpanded(item.name)}
                                                    className={cn(
                                                        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                                        'hover:bg-accent hover:text-accent-foreground',
                                                        isSubItemActive || isExpanded
                                                            ? 'bg-accent text-accent-foreground'
                                                            : 'text-muted-foreground'
                                                    )}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <item.icon className="h-4 w-4" />
                                                        <span>{item.name}</span>
                                                    </div>
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </motion.div>
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="pl-4 space-y-1">
                                                            {item.subItems!.map((subItem) => {
                                                                const isSubActive = subItem.href === location.pathname
                                                                return (
                                                                    <motion.div
                                                                        key={subItem.href}
                                                                        whileHover={{ scale: 1.02 }}
                                                                        whileTap={{ scale: 0.98 }}
                                                                    >
                                                                        <Link
                                                                            to={subItem.href}
                                                                            className={cn(
                                                                                'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors',
                                                                                'hover:bg-accent hover:text-accent-foreground',
                                                                                isSubActive
                                                                                    ? 'bg-accent text-accent-foreground font-medium'
                                                                                    : 'text-muted-foreground'
                                                                            )}
                                                                            onClick={() => {
                                                                                if (isMobile) {
                                                                                    setSidebarOpen(false)
                                                                                }
                                                                            }}
                                                                        >
                                                                            <subItem.icon className="h-4 w-4" />
                                                                            <span>{subItem.name}</span>
                                                                        </Link>
                                                                    </motion.div>
                                                                )
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    ) : (
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Link
                                                to={item.href!}
                                                className={cn(
                                                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                                    'hover:bg-accent hover:text-accent-foreground',
                                                    isActive
                                                        ? 'bg-accent text-accent-foreground'
                                                        : 'text-muted-foreground'
                                                )}
                                                onClick={() => {
                                                    if (isMobile) {
                                                        setSidebarOpen(false)
                                                    }
                                                }}
                                            >
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.name}</span>
                                            </Link>
                                        </motion.div>
                                    )}
                                </div>
                            )
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-border">
                        <div className="text-xs text-muted-foreground text-center">
                            Dashboard v1.0.0
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    )
}
