import {
  BarChart3,
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
  BadgeCheck,
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
  ShieldAlert,
  KeyRound,
  Percent,
  ListChecks,
  Route,
  Truck,
  Calculator,
  Settings,
  SlidersHorizontal,
  Settings2,
  LayoutList,
  CircleHelp,
  Presentation,
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
 *   8. Propuesta     → enlace directo a la propuesta comercial
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

/**
 * Rutas de las páginas que se han movido de grupo. App.tsx y el menú las leen de aquí:
 * si cambian de grupo otra vez, se editan en un solo lugar.
 */
export const RUTAS = {
  asignarFacturas: '/logistica/asignar-facturas',
  mvpLogistica: '/logistica/mvp',
} as const

/** Rutas anteriores (cuando vivían en Logística o en Tesorería con otro nombre): redirigen a la actual. */
export const RUTAS_ANTERIORES: Record<string, string> = {
  '/tesoreria/asignar-facturas': RUTAS.asignarFacturas,
  '/tesoreria/asignacion-cobro': RUTAS.asignarFacturas,
  '/tesoreria/mvp-logistica': RUTAS.mvpLogistica,
}

/**
 * Páginas de Logística. NO están en `navigation`: la sección "Logística" del menú la arma el
 * administrador desde Módulos y Permisos (sección personalizada). Aquí solo se declaran para
 * que el selector de enlaces, el título del Header y la pantalla de permisos las conozcan.
 */
export const LOGISTICA: SubNavItem[] = [
  {
    name: 'Asignar Facturas',
    href: RUTAS.asignarFacturas,
    icon: ListChecks,
    subtitle: 'Asignar facturas pendientes a conductores para cobro en ruta',
    permiso: PERMISOS.ASIGNACION_COBRO,
  },
  {
    name: 'MVP Logística',
    href: RUTAS.mvpLogistica,
    icon: Route,
    subtitle: 'Rutas óptimas por peso y capacidad, en mapa',
    permiso: PERMISOS.ASIGNACION_COBRO,
  },
]

export const navigation: NavItem[] = [
  // Dashboard: único enlace directo del menú, es la pantalla de entrada
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    subtitle: 'Resumen de pedidos, ventas y vendedores',
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
        name: 'Dashboard de Recaudo',
        href: '/tesoreria/dashboard-recaudo',
        icon: BarChart3,
        subtitle: 'Cobro de cartera, anulaciones, conductores, carga y clientes',
        permiso: PERMISOS.RECIBO_CAJA,
      },
      {
        name: 'Recibo de Caja',
        href: '/tesoreria/recibo-caja',
        icon: Receipt,
        subtitle: 'Consulta y arqueo de recibos de caja',
        permiso: PERMISOS.RECIBO_CAJA,
      },
      {
        name: 'RC Anómalos',
        href: '/tesoreria/rc-anomalos',
        icon: ShieldAlert,
        subtitle: 'Recibos descuadrados, anticipos y descuentos a revisar',
        permiso: PERMISOS.RC_ANOMALOS,
      },
      {
        name: 'Entrega de Recaudo',
        href: '/tesoreria/entrega-recaudo',
        icon: Banknote,
        subtitle: 'Validación y conciliación de efectivo de conductores',
        permiso: PERMISOS.ENTREGA_RECAUDO,
      },
      {
        name: 'Confirmación de Transferencias',
        href: '/tesoreria/confirmacion-transferencias',
        icon: BadgeCheck,
        subtitle: 'Soportes de transferencias de clientes y su aprobación',
        permiso: PERMISOS.CONFIRMACION_TRANSFERENCIA,
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
      {
        name: 'Parámetros RC',
        href: '/tesoreria/parametros-rc',
        icon: Settings2,
        subtitle: 'Cuentas contables y límite de ajuste al peso del recibo de caja',
        permiso: PERMISOS.PARAMETROS_RC,
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
    name: 'Propuesta',
    href: '/propuesta',
    icon: Presentation,
    subtitle: 'Propuesta de integración ERP Siesa Zero-Impact',
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
      // Organizar Menú: dónde va cada página del menú lateral (configuración global; los roles se arman sobre ese menú)
      {
        name: 'Organizar Menú',
        href: '/maestro/organizar-menu',
        icon: LayoutList,
        subtitle: 'Arrastra cada página al menú donde la quieres',
        permiso: PERMISOS.MODULOS,
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
      // Cuentas Bancarias: permiso VER_CUENTAS_BANCARIAS, asignado solo al rol Administrador
      {
        name: 'Cuentas Bancarias',
        href: '/maestro/cuentas-bancarias',
        icon: Landmark,
        subtitle: 'Whitelist de cuentas bancarias válidas para el recibo de caja',
        permiso: PERMISOS.CUENTAS_BANCARIAS,
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

/** Páginas del sistema agrupadas como el sidebar, para elegirlas al armar un módulo personalizado */
export const paginasDelSistema = (): { grupo: string; paginas: { name: string; href: string; permiso?: string }[] }[] => [
  { grupo: 'General', paginas: navigation.filter((n) => n.href).map((n) => ({ name: n.name, href: n.href!, permiso: n.permiso })) },
  ...navigation.filter((n) => n.subItems).map((n) => ({ grupo: n.name, paginas: n.subItems!.map((s) => ({ name: s.name, href: s.href, permiso: s.permiso })) })),
  { grupo: 'Logística', paginas: LOGISTICA.map((s) => ({ name: s.name, href: s.href, permiso: s.permiso })) },
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
  ...LOGISTICA,
]

const routesByPath = new Map(flatRoutes.map(r => [r.href, r]))

// Páginas que no están en `navigation` (los enlaces de los módulos personalizados llegan del API)
const paginasExtra = new Map<string, PageMeta>()
export const registrarPaginasExtra = (paginas: Record<string, PageMeta>) => {
  paginasExtra.clear()
  for (const [href, meta] of Object.entries(paginas)) paginasExtra.set(href, meta)
}

export const getPageMeta = (pathname: string): PageMeta | undefined => {
  const route = routesByPath.get(pathname)
  if (!route) return paginasExtra.get(pathname)
  return { name: route.name, icon: route.icon, subtitle: route.subtitle ?? '' }
}
