import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { X, ChevronRight, LogOut } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { NavItem, registrarPaginasExtra } from '@/config/navigation'
import { useMenuArmado } from '@/hooks/useMenuArmado'
import { useAlarmaTransferencias } from '@/components/transferencias/alarmaContext'
import { ticketsApi } from '@/api/tickets'
import { PERMISOS } from '@/config/permisos'

const rutaTransferencias = '/tesoreria/confirmacion-transferencias'
const rutaTickets = '/tickets/aprobador'

export const Sidebar = () => {
    const { sidebarOpen, setSidebarOpen } = useUIStore()
    const { hasPermiso, sesion, clearSession } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()
    const isMobile = useMediaQuery('(max-width: 1023px)')
    const alarma = useAlarmaTransferencias()
    const puedeVerTickets = hasPermiso(PERMISOS.APROBADOR_TICKETS)
    const [pendientesTickets, setPendientesTickets] = useState(0)
    useEffect(() => {
        if (!puedeVerTickets) { setPendientesTickets(0); return }
        let activo = true
        const actualizar = () => { ticketsApi.resumen().then(resumen => { if (activo) setPendientesTickets(resumen.pendientes ?? 0) }).catch(() => {}) }
        actualizar()
        const timer = window.setInterval(actualizar, 30_000)
        window.addEventListener('tickets:actualizar', actualizar)
        return () => { activo = false; window.clearInterval(timer); window.removeEventListener('tickets:actualizar', actualizar) }
    }, [puedeVerTickets])
    // Acordeón: un solo grupo abierto a la vez. Ahora que TODAS las rutas
    // cuelgan de un grupo, permitir varios abiertos hacía crecer el menú hasta
    // necesitar scroll a medida que el usuario navegaba entre secciones.
    const [expandedItem, setExpandedItem] = useState<string | null>(null)

    // El menú ya armado: el del código + secciones personalizadas + lo que el administrador organizó
    const { entradas } = useMenuArmado()
    useEffect(() => {
        // Los títulos del Header de las páginas que no están en `navigation` (enlaces de secciones personalizadas)
        registrarPaginasExtra(Object.fromEntries(
            entradas.flatMap((e) => (e.tipo === 'directo' ? [e.pagina] : e.grupo.paginas)).map((p) => [p.href, { name: p.name, icon: p.icon, subtitle: p.subtitle ?? '' }])
        ))
    }, [entradas])

    // Filtrar según permisos del usuario: una página sin permiso no se ve, y un menú sin páginas visibles tampoco
    const navFiltrado: NavItem[] = entradas.reduce<NavItem[]>((acc, e) => {
        if (e.tipo === 'directo') {
            const p = e.pagina
            if (!p.permiso || hasPermiso(p.permiso)) acc.push({ name: p.name, href: p.href, icon: p.icon, subtitle: p.subtitle, permiso: p.permiso })
        } else {
            const subItems = e.grupo.paginas
                .filter((p) => !p.permiso || hasPermiso(p.permiso))
                .map((p) => ({ name: p.name, href: p.href, icon: p.icon, subtitle: p.subtitle ?? '', permiso: p.permiso }))
            if (subItems.length > 0) acc.push({ name: e.grupo.name, icon: e.grupo.icon, subItems })
        }
        return acc
    }, [])

    // Abrir el grupo que contiene la ruta actual (y cerrar el resto)
    useEffect(() => {
        const grupoActivo = navFiltrado.find((item) =>
            item.subItems?.some((subItem) => subItem.href === location.pathname)
        )
        if (grupoActivo) {
            setExpandedItem(grupoActivo.name)
        }
    }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps


    const toggleExpanded = (itemName: string) => {
        setExpandedItem((prev) => (prev === itemName ? null : itemName))
    }

    const isItemExpanded = (itemName: string) => expandedItem === itemName

    // En escritorio el riel se expande al pasar el mouse; en móvil el drawer siempre muestra etiquetas.
    const [hover, setHover] = useState(false)
    const expandido = isMobile || hover
    const cerrarAlNavegar = () => {
        setHover(false)
        if (isMobile) setSidebarOpen(false)
    }

    const handleLogout = () => {
        clearSession()
        localStorage.removeItem('auth_token')
        localStorage.removeItem('last_activity')
        navigate('/login')
    }

    return (
        <>
            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Reserva el ancho del riel en el flex: el panel flota encima al expandirse, así <main>
                (y las gráficas Nivo, que recalculan en cada resize) no cambia de tamaño con el hover. */}
            <div className="hidden w-[60px] shrink-0 lg:block" aria-hidden />

            <aside
                className={cn('sidebar', expandido && 'expandido', isMobile && !sidebarOpen && '-translate-x-full')}
                aria-label="Navegación principal"
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
            >
                {/* Logo: pequeño a la izquierda en el riel; al expandir crece y se desliza al centro */}
                <div className="relative mb-4 h-14 w-full shrink-0 overflow-hidden">
                    <motion.img
                        src="/icon.png"
                        alt="SYE Distribuciones"
                        className="absolute top-1/2 object-contain"
                        initial={false}
                        animate={{
                            height: expandido ? 52 : 22,
                            width: expandido ? 100 : 42,
                            left: expandido ? '50%' : 0,
                            x: expandido ? '-50%' : 0,
                            y: '-50%',
                        }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <button
                        type="button"
                        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Cerrar menú"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex min-h-0 w-full flex-1 flex-col gap-1.5 overflow-y-auto [scrollbar-width:none]">
                    {navFiltrado.map((item) => {
                        const hasSubItems = item.subItems && item.subItems.length > 0
                        const abierto = expandido && isItemExpanded(item.name)
                        const isSubItemActive = hasSubItems ? item.subItems!.some((sub) => sub.href === location.pathname) : false
                        const isActive = !hasSubItems && location.pathname === item.href

                        if (!hasSubItems) {
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href!}
                                    className={cn('sidebar-item', isActive && 'activo')}
                                    aria-label={item.name}
                                    onClick={cerrarAlNavegar}
                                >
                                    <item.icon />
                                    <span className="sidebar-etiqueta flex-1 text-left">{item.name}</span>
                                    {item.href === rutaTransferencias && !!alarma?.total && <span className={cn('rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground', !expandido && 'absolute right-1 top-0')}>{alarma.total}</span>}
                                    {item.href === rutaTickets && pendientesTickets > 0 && <span className="rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">{pendientesTickets}</span>}
                                    <span className="sidebar-tooltip">{item.name}</span>
                                </Link>
                            )
                        }

                        return (
                            <div key={item.name} className="flex w-full flex-col">
                                <button
                                    type="button"
                                    className={cn('sidebar-item', isSubItemActive && 'activo')}
                                    aria-label={item.name}
                                    aria-expanded={abierto}
                                    onClick={() => (expandido ? toggleExpanded(item.name) : setHover(true))}
                                >
                                    <item.icon />
                                    <span className="sidebar-etiqueta flex-1 text-left">{item.name}</span>
                                    {item.subItems!.some(sub => sub.href === rutaTransferencias) && !!alarma?.total && <span className={cn('rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground', !expandido && 'absolute right-1 top-0')}>{alarma.total}</span>}
                                    {item.subItems!.some(sub => sub.href === rutaTickets) && pendientesTickets > 0 && <span className={cn('rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground', !expandido && 'absolute right-1 top-0')}>{pendientesTickets}</span>}
                                    <ChevronRight
                                        className={cn('sidebar-etiqueta !h-3.5 !w-3.5 shrink-0 opacity-60 transition-transform', abierto && 'rotate-90')}
                                    />
                                    <span className="sidebar-tooltip">{item.name}</span>
                                </button>
                                {abierto && (
                                    <ul className="sidebar-submenu">
                                        {item.subItems!.map((subItem) => (
                                            <li key={subItem.href}>
                                                <Link
                                                    to={subItem.href}
                                                    onClick={cerrarAlNavegar}
                                                    className={cn('sidebar-subitem', subItem.href === location.pathname && 'activo')}
                                                >
                                                    <span className="truncate">{subItem.name}</span>
                                                    {subItem.href === rutaTransferencias && !!alarma?.total && <span className="ml-auto rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">{alarma.total}</span>}
                                                    {subItem.href === rutaTickets && pendientesTickets > 0 && <span className="ml-auto rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">{pendientesTickets}</span>}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )
                    })}
                </nav>

                {/* Footer: usuario, rol y cerrar sesión */}
                <div className="mt-3 flex w-full shrink-0 flex-col gap-1.5 border-t border-border pt-3">
                    {sesion && (
                        <div className="flex items-center gap-3 overflow-hidden px-[3px]">
                            <div
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary"
                                title={sesion.nombre_completo || sesion.usuario}
                            >
                                {(sesion.nombre_completo || sesion.usuario || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="sidebar-etiqueta min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-foreground">{sesion.nombre_completo || sesion.usuario}</p>
                                <p className="truncate text-xs font-normal text-muted-foreground">{sesion.rol_nombre || 'Sin rol'}</p>
                            </div>
                        </div>
                    )}
                    <button type="button" className="sidebar-item sidebar-item-peligro" aria-label="Cerrar sesión" onClick={handleLogout}>
                        <LogOut />
                        <span className="sidebar-etiqueta flex-1 text-left">Cerrar sesión</span>
                        <span className="sidebar-tooltip">Cerrar sesión</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
