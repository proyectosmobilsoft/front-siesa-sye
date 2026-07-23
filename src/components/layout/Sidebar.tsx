import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
    BarChart3,
    Users,
    Package,
    FileText,
    Settings,
    X,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    TrendingUp,
    UserCircle,
    Receipt,
    ShoppingCart,
    ShoppingBag,
    Ticket,
    TrendingDown,
    Shield,
    UserPlus,
    Percent,
    Wallet,
    User,
    Landmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { PERMISOS } from '@/config/permisos'

interface SubNavItem {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    permiso?: string
}

interface NavItem {
    name: string
    href?: string
    icon: React.ComponentType<{ className?: string }>
    permiso?: string
    subItems?: SubNavItem[]
}

const navigation: NavItem[] = [
    // Dashboard: siempre visible para usuarios autenticados
    { name: 'Dashboard', href: '/', icon: BarChart3 },

    // Módulos sin permiso aún en backend → visibles para todos los autenticados
    { name: 'Clientes',  href: '/clientes',  icon: User },
    { name: 'Productos', href: '/productos', icon: Package },
    { name: 'Pedidos',   href: '/pedidos',   icon: ShoppingBag },
    { name: 'Ferreganga', href: '/ferreganga', icon: Ticket },

    // Egreso/Anticipos: requiere VER_ANTICIPO
    { name: 'Egreso', href: '/egreso', icon: Wallet, permiso: PERMISOS.EGRESO },

    {
        name: 'Facturas',
        icon: Receipt,
        subItems: [
            // Gestión de Ventas (recibos): requiere VER_RECIBO
            { name: 'Gestión de Ventas',   href: '/facturas/gestion-ventas',    icon: ShoppingCart, permiso: PERMISOS.GESTION_VENTAS },
            // Análisis Financiero: sin permiso aún en backend
            { name: 'Análisis Financiero', href: '/facturas/analisis-financiero', icon: TrendingDown },
        ]
    },
    {
        name: 'Reportes',
        icon: FileText,
        subItems: [
            { name: 'Pedidos Diarios', href: '/reportes',           icon: ClipboardList },
            { name: 'Resumen Ventas',  href: '/reportes/ventas',    icon: TrendingUp },
            { name: 'Vendedores',      href: '/reportes/vendedores', icon: UserCircle },
        ]
    },
    {
        name: 'Maestro',
        icon: Users,
        subItems: [
            { name: 'Maestro de Roles',        href: '/maestro/roles',                    icon: Shield },
            { name: 'Maestro de Usuarios',     href: '/maestro/usuarios',                 icon: UserPlus },
            { name: 'Descuentos Financieros',  href: '/maestro/descuentos-financieros',   icon: Percent },
        ]
    },
    {
        name: 'Tesorería',
        icon: Landmark,
        subItems: [
            { name: 'Recibo de Caja', href: '/tesoreria/recibo-caja', icon: Receipt },
        ]
    },
    { name: 'Configuración', href: '/configuracion', icon: Settings },
]

export const Sidebar = () => {
    const { sidebarOpen, setSidebarOpen } = useUIStore()
    const { hasPermiso, sesion } = useAuthStore()
    const location = useLocation()
    const isMobile = useMediaQuery('(max-width: 1023px)')
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

    // Filtrar items de navegación según permisos del usuario
    const navFiltrado: NavItem[] = navigation.reduce<NavItem[]>((acc, item) => {
        if (item.subItems) {
            // Filtrar sub-items por permiso
            const subsFiltrados = item.subItems.filter(
                (sub) => !sub.permiso || hasPermiso(sub.permiso)
            )
            // Solo incluir el grupo padre si tiene al menos un sub-item visible
            if (subsFiltrados.length > 0) {
                acc.push({ ...item, subItems: subsFiltrados })
            }
        } else {
            // Item simple: mostrar si no tiene permiso requerido o si el usuario lo tiene
            if (!item.permiso || hasPermiso(item.permiso)) {
                acc.push(item)
            }
        }
        return acc
    }, [])

    // Auto-expandir items si la ruta actual está en sus sub-items
    useEffect(() => {
        navFiltrado.forEach((item) => {
            if (item.subItems) {
                const hasActiveSubItem = item.subItems.some(
                    (subItem) => subItem.href === location.pathname
                )
                if (hasActiveSubItem) {
                    setExpandedItems((prev) => new Set(prev).add(item.name))
                }
            }
        })
    }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

    const getCurrentPageInfo = () => {
        for (const item of navFiltrado) {
            if (item.subItems) {
                const sub = item.subItems.find((s) => s.href === location.pathname)
                if (sub) return { name: sub.name, icon: sub.icon }
            } else if (item.href === location.pathname) {
                return { name: item.name, icon: item.icon }
            }
        }
        return { name: 'Dashboard', icon: BarChart3 }
    }

    const currentPage = getCurrentPageInfo()

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
                animate={{
                    width: isMobile ? 256 : sidebarOpen ? 256 : 76,
                    x: isMobile && !sidebarOpen ? '-100%' : 0,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={cn(
                    'fixed left-0 top-0 z-50 h-full overflow-hidden bg-card border-r border-border shadow-xl shadow-black/5',
                    'lg:relative lg:z-auto lg:shadow-none'
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className={cn('flex h-16 items-center border-b border-border', sidebarOpen ? 'justify-between px-6' : 'justify-center px-3')}>
                        <div className={cn('flex min-w-0 items-center space-x-2', !sidebarOpen && 'justify-center')}>
                            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                <currentPage.icon className="h-5 w-5 text-primary-foreground" />
                            </div>
                            {sidebarOpen && <motion.span
                                key={currentPage.name}
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="truncate text-lg font-semibold"
                            >{currentPage.name}</motion.span>}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                            aria-label="Cerrar menú"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className={cn('flex-1 space-y-2 overflow-y-auto py-6 custom-scrollbar', sidebarOpen ? 'px-4' : 'px-3')}>
                        {navFiltrado.map((item) => {
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
                                                    onClick={() => sidebarOpen ? toggleExpanded(item.name) : setSidebarOpen(true)}
                                                    title={!sidebarOpen ? item.name : undefined}
                                                    className={cn(
                                                        'w-full flex items-center rounded-xl py-2 text-sm font-medium transition-colors',
                                                        sidebarOpen ? 'justify-between px-3' : 'justify-center px-2',
                                                        'hover:bg-accent hover:text-accent-foreground',
                                                        isSubItemActive || isExpanded
                                                            ? 'bg-accent text-accent-foreground'
                                                            : 'text-muted-foreground'
                                                    )}
                                                >
                                                    <div className={cn('flex items-center', sidebarOpen ? 'space-x-3' : 'justify-center')}>
                                                        <item.icon className="h-4 w-4" />
                                                        {sidebarOpen && <span>{item.name}</span>}
                                                    </div>
                                                    {sidebarOpen && (isExpanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    ))}
                                                </button>
                                            </motion.div>
                                            <AnimatePresence>
                                                {sidebarOpen && isExpanded && (
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
                                                                                'flex items-center rounded-xl px-3 py-2 text-sm transition-colors',
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
                                                                            title={!sidebarOpen ? subItem.name : undefined}
                                                                        >
                                                                            <subItem.icon className="h-4 w-4" />
                                                                            {sidebarOpen && <span>{subItem.name}</span>}
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
                                                    title={!sidebarOpen ? item.name : undefined}
                                                    className={cn(
                                                        'flex items-center rounded-xl py-2 text-sm font-medium transition-colors',
                                                        sidebarOpen ? 'space-x-3 px-3' : 'justify-center px-2',
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
                                                {sidebarOpen && <span>{item.name}</span>}
                                            </Link>
                                        </motion.div>
                                    )}
                                </div>
                            )
                        })}
                    </nav>

                    {/* Footer: info del usuario y rol */}
                    {sesion && (
                        <div className={cn('border-t border-border py-3', sidebarOpen ? 'px-4' : 'px-3')}>
                            {sidebarOpen ? <>
                                <p className="truncate text-xs font-medium text-foreground">{sesion.nombre_completo || sesion.usuario}</p>
                                <p className="truncate text-xs text-muted-foreground">{sesion.rol_nombre || 'Sin rol'}</p>
                            </> : <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary" title={sesion.nombre_completo || sesion.usuario}>{(sesion.nombre_completo || sesion.usuario || 'U').charAt(0).toUpperCase()}</div>}
                        </div>
                    )}

                </div>
            </motion.div>
        </>
    )
}
