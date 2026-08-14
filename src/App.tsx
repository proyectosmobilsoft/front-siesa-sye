import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PERMISOS } from '@/config/permisos'
import { useUIStore } from '@/store/uiStore'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout'
import { InactivityModal } from '@/components/ui/InactivityModal'

// Code-splitting por ruta: antes las ~20 páginas (con dependencias pesadas
// como exceljs, recharts, framer-motion) se importaban todas de forma
// eager en el módulo de App, así que CUALQUIER carga/recarga tenía que
// parsear y evaluar el bundle completo de la app antes de poder mostrar
// nada, aunque el usuario solo quisiera ver el Dashboard. Con React.lazy
// cada página solo se descarga/evalúa cuando se navega a su ruta.
const ClientsPage = lazy(() => import('@/pages/ClientsPage').then(m => ({ default: m.ClientsPage })))
const CompaniesPage = lazy(() => import('@/pages/CompaniesPage').then(m => ({ default: m.CompaniesPage })))
const ProductsPage = lazy(() => import('@/pages/ProductsPage').then(m => ({ default: m.ProductsPage })))
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const SalesSummaryPage = lazy(() => import('@/pages/SalesSummaryPage').then(m => ({ default: m.SalesSummaryPage })))
const VendorsPage = lazy(() => import('@/pages/VendorsPage').then(m => ({ default: m.VendorsPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const HelpPage = lazy(() => import('@/pages/HelpPage').then(m => ({ default: m.HelpPage })))
const GestionVentasPage = lazy(() => import('@/pages/GestionVentasPage').then(m => ({ default: m.GestionVentasPage })))
const AnalisisFinancieroPage = lazy(() => import('@/pages/AnalisisFinancieroPage').then(m => ({ default: m.AnalisisFinancieroPage })))
const PedidosPage = lazy(() => import('@/pages/PedidosPage').then(m => ({ default: m.PedidosPage })))
const SecuritySettingsPage = lazy(() => import('@/pages/SecuritySettingsPage').then(m => ({ default: m.SecuritySettingsPage })))
const MaestroRolesPage = lazy(() => import('@/pages/MaestroRolesPage').then(m => ({ default: m.MaestroRolesPage })))
const MaestroDescuentosFinancierosPage = lazy(() => import('@/pages/MaestroDescuentosFinancierosPage').then(m => ({ default: m.MaestroDescuentosFinancierosPage })))
const MaestroCajasPage = lazy(() => import('@/pages/MaestroCajasPage').then(m => ({ default: m.MaestroCajasPage })))
const MaestroCuentasBancariasPage = lazy(() => import('@/pages/MaestroCuentasBancariasPage').then(m => ({ default: m.MaestroCuentasBancariasPage })))
const MaestroConceptosPage = lazy(() => import('@/pages/MaestroConceptosPage').then(m => ({ default: m.MaestroConceptosPage })))
const MaestroMaquinariaPage = lazy(() => import('@/pages/MaestroMaquinariaPage').then(m => ({ default: m.MaestroMaquinariaPage })))
const InterfazContableVehiculosPage = lazy(() => import('@/pages/InterfazContableVehiculosPage').then(m => ({ default: m.InterfazContableVehiculosPage })))
const MaestroModulosPage = lazy(() => import('@/pages/MaestroModulosPage').then(m => ({ default: m.MaestroModulosPage })))
const EgresoPage = lazy(() => import('@/pages/EgresoPage').then(m => ({ default: m.EgresoPage })))
const FerregangaPage = lazy(() => import('@/pages/FerregangaPage'))
const ReciboCajaPage = lazy(() => import('@/pages/ReciboCajaPage').then(m => ({ default: m.ReciboCajaPage })))
const TesoreriaEntregaRecaudoPage = lazy(() => import('@/pages/TesoreriaEntregaRecaudoPage').then(m => ({ default: m.TesoreriaEntregaRecaudoPage })))
const TrasladoFondosPage = lazy(() => import('@/pages/TrasladoFondosPage').then(m => ({ default: m.TrasladoFondosPage })))

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 3,
            refetchOnWindowFocus: false,
        },
    },
})

function AppLayout() {
    return (
        <div className="min-h-screen bg-background">
            <div className="flex h-screen">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-auto custom-scrollbar">
                        <Suspense fallback={
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                Cargando…
                            </div>
                        }>
                            <Routes>
                                <Route path="/" element={<DashboardPage />} />

                                {/* Egreso/Anticipos: protegido por VER_ANTICIPO */}
                                <Route path="/egreso" element={
                                    <ProtectedRoute permiso={PERMISOS.EGRESO}><EgresoPage /></ProtectedRoute>
                                } />

                                {/* Relación de Conceptos: protegido por VER_CONCEPTOS (solo rol Administrador) */}
                                <Route path="/maestro/relacion-conceptos" element={
                                    <ProtectedRoute permiso={PERMISOS.CONCEPTOS}><MaestroConceptosPage /></ProtectedRoute>
                                } />

                                {/* Maquinaria: protegido por VER_MAQUINARIA (solo rol Administrador) */}
                                <Route path="/maestro/maquinaria" element={
                                    <ProtectedRoute permiso={PERMISOS.MAQUINARIA}><MaestroMaquinariaPage /></ProtectedRoute>
                                } />

                                {/* Interfaz Contable Vehículos: protegido por VER_INTERFAZ_CONTABLE */}
                                <Route path="/maestro/interfaz-contable-vehiculos" element={
                                    <ProtectedRoute permiso={PERMISOS.INTERFAZ_CONTABLE}><InterfazContableVehiculosPage /></ProtectedRoute>
                                } />

                                {/* Maestro de Cajas: protegido por VER_CAJAS (solo rol Administrador) */}
                                <Route path="/maestro/cajas" element={
                                    <ProtectedRoute permiso={PERMISOS.CAJAS}><MaestroCajasPage /></ProtectedRoute>
                                } />

                                {/* Maestro de Cuentas Bancarias: protegido por VER_CUENTAS_BANCARIAS (solo rol Administrador) */}
                                <Route path="/maestro/cuentas-bancarias" element={
                                    <ProtectedRoute permiso={PERMISOS.CUENTAS_BANCARIAS}><MaestroCuentasBancariasPage /></ProtectedRoute>
                                } />

                                {/* Módulos y Permisos (catálogo de seguridad): protegido por VER_MODULOS */}
                                <Route path="/maestro/modulos" element={
                                    <ProtectedRoute permiso={PERMISOS.MODULOS}><MaestroModulosPage /></ProtectedRoute>
                                } />

                                {/* Gestión de Ventas: protegido por VER_RECIBO */}
                                <Route path="/facturas/gestion-ventas" element={
                                    <ProtectedRoute permiso={PERMISOS.GESTION_VENTAS}><GestionVentasPage /></ProtectedRoute>
                                } />

                                {/* Dashboard ("/") queda SIN ProtectedRoute a propósito: es el
                                    destino al que ProtectedRoute redirige cuando falta un permiso,
                                    así que protegerlo con VER_DASHBOARD crearía un bucle de
                                    redirección para quien no lo tuviera. */}

                                {/* Comercial */}
                                <Route path="/clientes" element={<ProtectedRoute permiso={PERMISOS.CLIENTES}><ClientsPage /></ProtectedRoute>} />
                                <Route path="/productos" element={<ProtectedRoute permiso={PERMISOS.PRODUCTOS}><ProductsPage /></ProtectedRoute>} />
                                <Route path="/pedidos" element={<ProtectedRoute permiso={PERMISOS.PEDIDOS}><PedidosPage /></ProtectedRoute>} />
                                <Route path="/ferreganga" element={<ProtectedRoute permiso={PERMISOS.FERREGANGA}><FerregangaPage /></ProtectedRoute>} />
                                {/* /companias no está en el menú y no tiene permiso propio */}
                                <Route path="/companias" element={<CompaniesPage />} />

                                {/* Facturación */}
                                <Route path="/facturas/analisis-financiero" element={<ProtectedRoute permiso={PERMISOS.ANALISIS_FINANCIERO}><AnalisisFinancieroPage /></ProtectedRoute>} />

                                {/* Reportes: cada uno con su propio permiso de vista */}
                                <Route path="/reportes" element={<ProtectedRoute permiso={PERMISOS.REPORTE_PEDIDOS}><ReportsPage /></ProtectedRoute>} />
                                <Route path="/reportes/ventas" element={<ProtectedRoute permiso={PERMISOS.REPORTE_VENTAS}><SalesSummaryPage /></ProtectedRoute>} />
                                <Route path="/reportes/vendedores" element={<ProtectedRoute permiso={PERMISOS.REPORTE_VENDEDORES}><VendorsPage /></ProtectedRoute>} />

                                <Route path="/tesoreria/traslado-fondos" element={<ProtectedRoute permiso={PERMISOS.TRASLADO_FONDOS}><TrasladoFondosPage /></ProtectedRoute>} />
                                <Route path="/maestro/roles" element={<ProtectedRoute permiso={PERMISOS.ROLES}><MaestroRolesPage /></ProtectedRoute>} />
                                {/* Maestro de Usuarios y Configuración → Seguridad son la MISMA
                                pantalla (SecuritySettingsPage). Antes /maestro/usuarios abría
                                MaestroUsuariosPage, una versión distinta con otro modal.
                                Ambas rutas se protegen con VER_USUARIOS. */}
                                <Route path="/maestro/usuarios" element={<ProtectedRoute permiso={PERMISOS.USUARIOS}><SecuritySettingsPage /></ProtectedRoute>} />
                                <Route path="/maestro/descuentos-financieros" element={<ProtectedRoute permiso={PERMISOS.DESCUENTOS}><MaestroDescuentosFinancierosPage /></ProtectedRoute>} />
                                <Route path="/tesoreria/recibo-caja" element={<ProtectedRoute permiso={PERMISOS.RECIBO_CAJA}><ReciboCajaPage /></ProtectedRoute>} />
                                <Route path="/tesoreria/entrega-recaudo" element={<ProtectedRoute permiso={PERMISOS.ENTREGA_RECAUDO}><TesoreriaEntregaRecaudoPage /></ProtectedRoute>} />
                                <Route path="/configuracion" element={<ProtectedRoute permiso={PERMISOS.CONFIGURACION}><SettingsPage /></ProtectedRoute>} />
                                <Route path="/configuracion/seguridad" element={<ProtectedRoute permiso={PERMISOS.USUARIOS}><SecuritySettingsPage /></ProtectedRoute>} />
                                <Route path="/ayuda" element={<HelpPage />} />
                            </Routes>
                        </Suspense>
                    </main>
                </div>
            </div>
        </div>
    )
}

function AppContent() {
    const location = useLocation()
    const isLoginPage = location.pathname === '/login'
    const [showInactivityModal, setShowInactivityModal] = useState(false)
    const { isAuthenticated, logout } = useAuth()

    // Manejar timeout de inactividad solo si no está en login.
    // useCallback con deps [] es obligatorio: useInactivityTimeout registra 6
    // listeners globales en window (mousemove, scroll, click, etc.) dentro de
    // un useEffect que depende de esta función. Sin memoizar, cada render de
    // AppContent le pasaba una función nueva y el efecto volvía a montar/
    // desmontar los 6 listeners en cada render — y cada mousemove global
    // termina llamando localStorage.setItem + clearTimeout + setTimeout de
    // forma síncrona, lo que se vuelve muy costoso con el mouse en movimiento.
    const handleInactivityTimeout = useCallback(() => {
        console.log('⏰ Tiempo de inactividad superado - cerrando sesión')
        localStorage.removeItem('auth_token')
        localStorage.removeItem('last_activity')
        setShowInactivityModal(true)
    }, [])

    // El hook siempre se ejecuta, pero internamente solo funciona si hay token
    useInactivityTimeout(handleInactivityTimeout)

    const handleCloseInactivityModal = useCallback(() => {
        setShowInactivityModal(false)
        logout()
    }, [logout])

    // Si no está autenticado y no está en login, mostrar nada (useAuth redirigirá)
    if (!isAuthenticated && !isLoginPage) {
        return null // Esperar a que useAuth redirija
    }

    if (isLoginPage) {
        return (
            <>
                <Routes><Route path="/login" element={<LoginPage />} /></Routes>
            </>
        )
    }

    // Solo mostrar el layout si está autenticado
    if (isAuthenticated) {
        return (
            <>
                <AppLayout />
                <InactivityModal isOpen={showInactivityModal} onClose={handleCloseInactivityModal} />
            </>
        )
    }

    return null
}

function App() {
    const { isDarkMode } = useUIStore()

    // Verificar token al cargar la aplicación
    useEffect(() => {
        const token = localStorage.getItem('auth_token')
        const currentPath = window.location.pathname

        console.log('🚀 Aplicación iniciada:', { hasToken: !!token, path: currentPath })

        // Si no hay token y no está en login, redirigir inmediatamente
        if (!token && currentPath !== '/login') {
            console.log('🔒 Sin token al iniciar, redirigiendo a login')
            localStorage.removeItem('auth_token')
            localStorage.removeItem('last_activity')
            window.location.href = '/login'
        }
    }, [])

    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(isDarkMode ? 'dark' : 'light')
    }, [isDarkMode])

    return (
        <QueryClientProvider client={queryClient}>
            <Router
                future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                }}
            >
                <AppContent />
            </Router>
        </QueryClientProvider>
    )
}

export default App
