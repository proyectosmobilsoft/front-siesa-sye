import {
  LayoutDashboard,
  Store,
  User,
  Package,
  ShoppingBag,
  Ticket,
  Receipt,
  ShoppingCart,
  TrendingDown,
  Landmark,
  Banknote,
  ArrowRightLeft,
  Archive,
  Wallet,
  FileText,
  ClipboardList,
  TrendingUp,
  UserCircle,
  Database,
  UserPlus,
  Shield,
  KeyRound,
  Percent,
  ListChecks,
  Truck,
  Calculator,
  Settings,
  SlidersHorizontal,
  CircleHelp,
  type LucideIcon,
} from 'lucide-react'
import { PERMISOS } from '@/config/permisos'

/**
 * Única fuente de verdad para el menú lateral y el título/subtítulo del
 * Header por ruta — antes vivían duplicados en Sidebar.tsx y Header.tsx
 * con datos que podían desincronizarse.
 *
 * ORGANIZACIÓN DEL MENÚ
 * Dashboard es el único enlace directo (pantalla de entrada, siempre a un
 * clic); el resto de rutas cuelga de un grupo:
 *
 *   1. Dashboard     → enlace directo
 *   2. Maestros      → catálogos y configuración de datos base
 *   3. Comercial     → clientes, productos y pedidos
 *   4. Facturación   → documentos de venta y su análisis
 *   5. Tesorería     → todo el movimiento de dinero (entra, sale y se traslada)
 *   6. Reportes      → consultas de solo lectura
 *   7. Sistema       → preferencias y soporte
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
  // Dashboard: único enlace directo del menú, es la pantalla de entrada
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    subtitle: 'Resumen de pedidos, ventas y vendedores',
  },
  {
    name: 'Maestros',
    icon: Database,
    subItems: [
      {
        name: 'Usuarios',
        href: '/maestro/usuarios',
        icon: UserPlus,
        subtitle: 'Administración de usuarios del sistema',
        permiso: PERMISOS.USUARIOS,
      },
      {
        name: 'Roles',
        href: '/maestro/roles',
        icon: Shield,
        subtitle: 'Administración de roles',
        permiso: PERMISOS.ROLES,
      },
      // Módulos y Permisos: el catálogo que alimenta la pantalla de Roles.
      // Permiso VER_MODULOS, asignado solo al rol Administrador.
      {
        name: 'Módulos y Permisos',
        href: '/maestro/modulos',
        icon: KeyRound,
        subtitle: 'Catálogo de módulos y permisos del sistema',
        permiso: PERMISOS.MODULOS,
      },
      // Cajas: permiso VER_CAJAS, asignado solo al rol Administrador
      {
        name: 'Cajas',
        href: '/maestro/cajas',
        icon: Archive,
        subtitle: 'Cajas que se muestran en el tablero de tesorería',
        permiso: PERMISOS.CAJAS,
      },
      {
        name: 'Descuentos Financieros',
        href: '/maestro/descuentos-financieros',
        icon: Percent,
        subtitle: 'Condiciones y descuentos de pago',
        permiso: PERMISOS.DESCUENTOS,
      },
      // Relación de Conceptos: permiso VER_CONCEPTOS, asignado solo al rol Administrador
      {
        name: 'Relación de Conceptos',
        href: '/maestro/relacion-conceptos',
        icon: ListChecks,
        subtitle: 'Catálogo de conceptos de gasto operativo',
        permiso: PERMISOS.CONCEPTOS,
      },
      // Maquinaria: solo lectura, los datos viven en la BD Vehiman
      {
        name: 'Maquinaria',
        href: '/maestro/maquinaria',
        icon: Truck,
        subtitle: 'Inventario de equipos y maquinaria',
        permiso: PERMISOS.MAQUINARIA,
      },
      // Interfaz Contable Vehículos: cuenta contable por placa de cada conductor
      {
        name: 'Interfaz Contable Vehículos',
        href: '/maestro/interfaz-contable-vehiculos',
        icon: Calculator,
        subtitle: 'Cuenta contable asociada a cada placa del conductor',
        permiso: PERMISOS.INTERFAZ_CONTABLE,
      },
    ],
  },
  {
    name: 'Comercial',
    icon: Store,
    subItems: [
      {
        name: 'Clientes',
        href: '/clientes',
        icon: User,
        subtitle: 'Gestión y visualización de clientes',
        permiso: PERMISOS.CLIENTES,
      },
      {
        name: 'Productos',
        href: '/productos',
        icon: Package,
        subtitle: 'Gestión y visualización de productos',
        permiso: PERMISOS.PRODUCTOS,
      },
      {
        name: 'Pedidos',
        href: '/pedidos',
        icon: ShoppingBag,
        subtitle: 'Historial y seguimiento de pedidos',
        permiso: PERMISOS.PEDIDOS,
      },
      {
        name: 'Ferreganga',
        href: '/ferreganga',
        icon: Ticket,
        subtitle: 'Campañas, sorteos y clientes de Ferreganga',
        permiso: PERMISOS.FERREGANGA,
      },
    ],
  },
  {
    name: 'Facturación',
    icon: Receipt,
    subItems: [
      // Gestión de Ventas (recibos): requiere VER_RECIBO
      {
        name: 'Gestión de Ventas',
        href: '/facturas/gestion-ventas',
        icon: ShoppingCart,
        subtitle: 'Documentos y gestión de ventas',
        permiso: PERMISOS.GESTION_VENTAS,
      },
      // Análisis Financiero: sin permiso aún en backend
      {
        name: 'Análisis Financiero',
        href: '/facturas/analisis-financiero',
        icon: TrendingDown,
        subtitle: 'Análisis financiero por periodo',
        permiso: PERMISOS.ANALISIS_FINANCIERO,
      },
    ],
  },
  {
    name: 'Reportes',
    icon: FileText,
    subItems: [
      {
        name: 'Pedidos Diarios',
        href: '/reportes',
        icon: ClipboardList,
        subtitle: 'Pedidos diarios consolidados',
        permiso: PERMISOS.REPORTE_PEDIDOS,
      },
      {
        name: 'Resumen de Ventas',
        href: '/reportes/ventas',
        icon: TrendingUp,
        subtitle: 'Resumen de ventas por periodo',
        permiso: PERMISOS.REPORTE_VENTAS,
      },
      {
        name: 'Vendedores',
        href: '/reportes/vendedores',
        icon: UserCircle,
        subtitle: 'Rendimiento por vendedor',
        permiso: PERMISOS.REPORTE_VENDEDORES,
      },
    ],
  },
  {
    name: 'Tesorería',
    icon: Landmark,
    subItems: [
      {
        name: 'Recibo de Caja',
        href: '/tesoreria/recibo-caja',
        icon: Receipt,
        subtitle: 'Consulta y arqueo de recibos de caja',
        permiso: PERMISOS.RECIBO_CAJA,
      },
      {
        name: 'Entrega de Recaudo',
        href: '/tesoreria/entrega-recaudo',
        icon: Banknote,
        subtitle: 'Validación y conciliación de efectivo de conductores',
        permiso: PERMISOS.ENTREGA_RECAUDO,
      },
      // Sin permiso todavía en backend (ver docs/traslado-fondos.md): visible para
      // cualquier autenticado, igual que el resto de módulos sin permiso aún.
      {
        name: 'Traslado de Fondos',
        href: '/tesoreria/traslado-fondos',
        icon: ArrowRightLeft,
        subtitle: 'Movimientos manuales de efectivo entre cajas',
        permiso: PERMISOS.TRASLADO_FONDOS,
      },
      // Egreso/Anticipos vive aquí porque es salida de dinero: requiere VER_ANTICIPO
      {
        name: 'Egreso',
        href: '/egreso',
        icon: Wallet,
        subtitle: 'Gestión de anticipos operativos',
        permiso: PERMISOS.EGRESO,
      },
    ],
  },
  {
    name: 'Sistema',
    icon: Settings,
    subItems: [
      {
        name: 'Configuración',
        href: '/configuracion',
        icon: SlidersHorizontal,
        subtitle: 'Preferencias del sistema',
        permiso: PERMISOS.CONFIGURACION,
      },
      {
        name: 'Ayuda',
        href: '/ayuda',
        icon: CircleHelp,
        subtitle: 'Documentación y soporte',
      },
    ],
  },
]

/**
 * Rutas alcanzables desde el front que no aparecen en el menú lateral.
 * /configuracion/seguridad renderiza la misma pantalla que Maestros → Usuarios,
 * así que se mantiene accesible (card de Configuración) pero sin duplicar la
 * entrada en el menú.
 */
export const EXTRA_ROUTES: SubNavItem[] = [
  {
    name: 'Usuarios',
    href: '/configuracion/seguridad',
    icon: UserPlus,
    subtitle: 'Administración de usuarios del sistema',
  },
]

export interface PageMeta {
  name: string
  icon: LucideIcon
  subtitle: string
}

const flatRoutes: (SubNavItem | (NavItem & { href: string }))[] = [
  ...navigation.filter(
    (item): item is NavItem & { href: string } => !!item.href
  ),
  ...navigation.flatMap(item => item.subItems ?? []),
  ...EXTRA_ROUTES,
]

const routesByPath = new Map(flatRoutes.map(r => [r.href, r]))

export const getPageMeta = (pathname: string): PageMeta | undefined => {
  const route = routesByPath.get(pathname)
  if (!route) return undefined
  return { name: route.name, icon: route.icon, subtitle: route.subtitle ?? '' }
}
