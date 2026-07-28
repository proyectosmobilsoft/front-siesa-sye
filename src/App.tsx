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
const MaestroUsuariosPage = lazy(() => import('@/pages/MaestroUsuariosPage').then(m => ({ default: m.MaestroUsuariosPage })))
const MaestroDescuentosFinancierosPage = lazy(() => import('@/pages/MaestroDescuentosFinancierosPage').then(m => ({ default: m.MaestroDescuentosFinancierosPage })))
const EgresoPage = lazy(() => import('@/pages/EgresoPage').then(m => ({ default: m.EgresoPage })))
const FerregangaPage = lazy(() => import('@/pages/FerregangaPage'))
const ReciboCajaPage = lazy(() => import('@/pages/ReciboCajaPage').then(m => ({ default: m.ReciboCajaPage })))
const TesoreriaEntregaRecaudoPage = lazy(() => import('@/pages/TesoreriaEntregaRecaudoPage').then(m => ({ default: m.TesoreriaEntregaRecaudoPage })))

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
                            {/* Dashboard: accesible a todos los autenticados */}
                            <Route path="/" element={<DashboardPage />} />

                            {/* Egreso/Anticipos: protegido por VER_ANTICIPO */}
                            <Route path="/egreso" element={
                                <ProtectedRoute permiso={PERMISOS.EGRESO}><EgresoPage /></ProtectedRoute>
                            } />

                            {/* Gestión de Ventas: protegido por VER_RECIBO */}
                            <Route path="/facturas/gestion-ventas" element={
                                <ProtectedRoute permiso={PERMISOS.GESTION_VENTAS}><GestionVentasPage /></ProtectedRoute>
                            } />

                            {/* Rutas sin permiso aún en backend — accesibles a cualquier usuario autenticado */}
                            <Route path="/clientes"                          element={<ClientsPage />} />
                            <Route path="/companias"                         element={<CompaniesPage />} />
                            <Route path="/productos"                         element={<ProductsPage />} />
                            <Route path="/pedidos"                           element={<PedidosPage />} />
                            <Route path="/ferreganga"                        element={<FerregangaPage />} />
                            <Route path="/facturas/analisis-financiero"      element={<AnalisisFinancieroPage />} />
                            <Route path="/reportes"                          element={<ReportsPage />} />
                            <Route path="/reportes/ventas"                   element={<SalesSummaryPage />} />
                            <Route path="/reportes/vendedores"               element={<VendorsPage />} />
                            <Route path="/maestro/roles"                     element={<MaestroRolesPage />} />
                            <Route path="/maestro/usuarios"                  element={<MaestroUsuariosPage />} />
                            <Route path="/maestro/descuentos-financieros"    element={<MaestroDescuentosFinancierosPage />} />
                            <Route path="/tesoreria/recibo-caja"             element={<ReciboCajaPage />} />
                            <Route path="/tesoreria/entrega-recaudo"         element={<TesoreriaEntregaRecaudoPage />} />
                            <Route path="/configuracion"                     element={<SettingsPage />} />
                            <Route path="/configuracion/seguridad"           element={<SecuritySettingsPage />} />
                            <Route path="/ayuda"                             element={<HelpPage />} />
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
