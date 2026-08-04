import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BarChart3, X, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { navigation, getPageMeta, NavItem } from '@/config/navigation'

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

    const currentPage = getPageMeta(location.pathname) ?? { name: 'Dashboard', icon: BarChart3 }

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

            {/* Sidebar
                'width' NO se anima: en escritorio el sidebar es hermano flex del contenido
                principal, así que cada cambio de width redimensiona el <main> donde viven
                las gráficas Nivo. Los componentes ResponsiveLine/ResponsiveBar de Nivo usan
                un ResizeObserver interno sin debounce — si el ancho cambia en cada frame de
                una transición, Nivo recalcula escalas y re-renderiza el SVG completo en cada
                tick, saturando el hilo principal hasta colgar la pestaña. El colapso queda
                instantáneo (sin transición de layout); solo se anima 'transform' para el
                drawer mobile, que es compuesto por GPU y no dispara resize de contenido. */}
            <div
                className={cn(
                    'fixed left-0 top-0 z-50 h-full overflow-hidden bg-card',
                    'transition-transform duration-200 ease-out',
                    'lg:relative lg:z-auto',
                    isMobile
                        ? cn('w-64', sidebarOpen ? 'translate-x-0' : '-translate-x-full')
                        : cn(sidebarOpen ? 'w-64' : 'w-[76px]', 'translate-x-0')
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className={cn('flex h-16 items-center', sidebarOpen ? 'justify-between px-6' : 'justify-center px-3')}>
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
                    <nav className={cn('flex-1 space-y-2 overflow-y-auto py-6 no-scrollbar', sidebarOpen ? 'px-4' : 'px-3')}>
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
                                            <button
                                                onClick={() => sidebarOpen ? toggleExpanded(item.name) : setSidebarOpen(true)}
                                                title={!sidebarOpen ? item.name : undefined}
                                                className={cn(
                                                    'w-full flex items-center rounded-xl py-2 text-sm font-medium transition-colors active:scale-[0.98]',
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
                                            {sidebarOpen && isExpanded && (
                                                <div className="pl-4 space-y-1">
                                                    {item.subItems!.map((subItem) => {
                                                        const isSubActive = subItem.href === location.pathname
                                                        return (
                                                            <Link
                                                                key={subItem.href}
                                                                to={subItem.href}
                                                                className={cn(
                                                                    'flex items-center rounded-xl px-3 py-2 text-sm transition-colors active:scale-[0.98]',
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
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <Link
                                            to={item.href!}
                                            title={!sidebarOpen ? item.name : undefined}
                                            className={cn(
                                                'flex items-center rounded-xl py-2 text-sm font-medium transition-colors active:scale-[0.98]',
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
            </div>
        </>
    )
}
