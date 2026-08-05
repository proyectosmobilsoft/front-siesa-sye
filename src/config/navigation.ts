import {
    BarChart3,
    Users,
    Package,
    FileText,
    Settings,
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
    Banknote,
    ArrowRightLeft,
    ListChecks,
    type LucideIcon,
} from 'lucide-react'
import { PERMISOS } from '@/config/permisos'

/**
 * Única fuente de verdad para el menú lateral y el título/subtítulo del
 * Header por ruta — antes vivían duplicados en Sidebar.tsx y Header.tsx
 * con datos que podían desincronizarse.
 */
export interface SubNavItem {
    name: string
    href: string
    icon: LucideIcon
    subtitle: string
    permiso?: string
}

export interface NavItem {
    name: string
    href?: string
    icon: LucideIcon
    subtitle?: string
    permiso?: string
    subItems?: SubNavItem[]
}

export const navigation: NavItem[] = [
    // Dashboard: siempre visible para usuarios autenticados
    { name: 'Dashboard', href: '/', icon: BarChart3, subtitle: 'Resumen de pedidos, ventas y vendedores' },

    // Módulos sin permiso aún en backend → visibles para todos los autenticados
    { name: 'Clientes', href: '/clientes', icon: User, subtitle: 'Gestión y visualización de clientes' },
    { name: 'Productos', href: '/productos', icon: Package, subtitle: 'Gestión y visualización de productos' },
    { name: 'Pedidos', href: '/pedidos', icon: ShoppingBag, subtitle: 'Historial y seguimiento de pedidos' },
    { name: 'Ferreganga', href: '/ferreganga', icon: Ticket, subtitle: 'Campañas, sorteos y clientes de Ferreganga' },

    // Egreso/Anticipos: requiere VER_ANTICIPO
    { name: 'Egreso', href: '/egreso', icon: Wallet, subtitle: 'Gestión de anticipos operativos', permiso: PERMISOS.EGRESO },

    {
        name: 'Facturas',
        icon: Receipt,
        subItems: [
            // Gestión de Ventas (recibos): requiere VER_RECIBO
            { name: 'Gestión de Ventas', href: '/facturas/gestion-ventas', icon: ShoppingCart, subtitle: 'Documentos y gestión de ventas', permiso: PERMISOS.GESTION_VENTAS },
            // Análisis Financiero: sin permiso aún en backend
            { name: 'Análisis Financiero', href: '/facturas/analisis-financiero', icon: TrendingDown, subtitle: 'Análisis financiero por periodo' },
        ]
    },
    {
        name: 'Reportes',
        icon: FileText,
        subItems: [
            { name: 'Pedidos Diarios', href: '/reportes', icon: ClipboardList, subtitle: 'Pedidos diarios consolidados' },
            { name: 'Resumen Ventas', href: '/reportes/ventas', icon: TrendingUp, subtitle: 'Resumen de ventas por periodo' },
            { name: 'Vendedores', href: '/reportes/vendedores', icon: UserCircle, subtitle: 'Rendimiento por vendedor' },
        ]
    },
    {
        name: 'Maestro',
        icon: Users,
        subItems: [
            { name: 'Maestro de Roles', href: '/maestro/roles', icon: Shield, subtitle: 'Administración de roles y permisos' },
            { name: 'Maestro de Usuarios', href: '/maestro/usuarios', icon: UserPlus, subtitle: 'Administración de usuarios del sistema' },
            { name: 'Descuentos Financieros', href: '/maestro/descuentos-financieros', icon: Percent, subtitle: 'Condiciones y descuentos de pago' },
            // Relación de Conceptos: permiso VER_CONCEPTOS, asignado solo al rol Administrador
            { name: 'Relación de Conceptos', href: '/maestro/relacion-conceptos', icon: ListChecks, subtitle: 'Catálogo de conceptos de gasto operativo', permiso: PERMISOS.CONCEPTOS },
        ]
    },
    {
        name: 'Tesorería',
        icon: Landmark,
        subItems: [
            { name: 'Recibo de Caja', href: '/tesoreria/recibo-caja', icon: Receipt, subtitle: 'Consulta y arqueo de recibos de caja' },
            { name: 'Entrega de Recaudo', href: '/tesoreria/entrega-recaudo', icon: Banknote, subtitle: 'Validación y conciliación de efectivo de conductores' },
            // Sin permiso todavía en backend (ver docs/traslado-fondos.md): visible para
            // cualquier autenticado, igual que el resto de módulos sin permiso aún.
            { name: 'Traslado de Fondos', href: '/tesoreria/traslado-fondos', icon: ArrowRightLeft, subtitle: 'Movimientos manuales de efectivo entre cajas' },
        ]
    },
    { name: 'Configuración', href: '/configuracion', icon: Settings, subtitle: 'Preferencias del sistema' },
]

/** Rutas alcanzables desde el front que no aparecen en el menú lateral. */
export const EXTRA_ROUTES: SubNavItem[] = [
    { name: 'Seguridad', href: '/configuracion/seguridad', icon: Shield, subtitle: 'Configuración de seguridad' },
    { name: 'Ayuda', href: '/ayuda', icon: FileText, subtitle: 'Documentación y soporte' },
]

export interface PageMeta {
    name: string
    icon: LucideIcon
    subtitle: string
}

const flatRoutes: (SubNavItem | (NavItem & { href: string }))[] = [
    ...navigation.filter((item): item is NavItem & { href: string } => !!item.href),
    ...navigation.flatMap((item) => item.subItems ?? []),
    ...EXTRA_ROUTES,
]

const routesByPath = new Map(flatRoutes.map((r) => [r.href, r]))

export const getPageMeta = (pathname: string): PageMeta | undefined => {
    const route = routesByPath.get(pathname)
    if (!route) return undefined
    return { name: route.name, icon: route.icon, subtitle: route.subtitle ?? '' }
}
