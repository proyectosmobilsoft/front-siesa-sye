import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DashboardPage } from '@/pages/DashboardPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { CompaniesPage } from '@/pages/CompaniesPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SalesSummaryPage } from '@/pages/SalesSummaryPage'
import { VendorsPage } from '@/pages/VendorsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { HelpPage } from '@/pages/HelpPage'
import { GestionVentasPage } from '@/pages/GestionVentasPage'
import { AnalisisFinancieroPage } from '@/pages/AnalisisFinancieroPage'
import { PedidosPage } from '@/pages/PedidosPage'
import { SecuritySettingsPage } from '@/pages/SecuritySettingsPage'
import { MaestroRolesPage } from '@/pages/MaestroRolesPage'
import { MaestroUsuariosPage } from '@/pages/MaestroUsuariosPage'
import { LoginPage } from '@/pages/LoginPage'
import { useUIStore } from '@/store/uiStore'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout'
import { InactivityModal } from '@/components/ui/InactivityModal'

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
                        <Routes>
                            <Route path="/" element={<DashboardPage />} />
                            <Route path="/clientes" element={<ClientsPage />} />
                            <Route path="/companias" element={<CompaniesPage />} />
                            <Route path="/productos" element={<ProductsPage />} />
                            <Route path="/facturas/gestion-ventas" element={<GestionVentasPage />} />
                            <Route path="/facturas/analisis-financiero" element={<AnalisisFinancieroPage />} />
                            <Route path="/reportes" element={<ReportsPage />} />
                            <Route path="/pedidos" element={<PedidosPage />} />
                            <Route path="/reportes/ventas" element={<SalesSummaryPage />} />
                            <Route path="/reportes/vendedores" element={<VendorsPage />} />
                            <Route path="/maestro/roles" element={<MaestroRolesPage />} />
                            <Route path="/maestro/usuarios" element={<MaestroUsuariosPage />} />
                            <Route path="/configuracion" element={<SettingsPage />} />
                            <Route path="/configuracion/seguridad" element={<SecuritySettingsPage />} />
                            <Route path="/ayuda" element={<HelpPage />} />
                        </Routes>
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

    // Manejar timeout de inactividad solo si no está en login
    const handleInactivityTimeout = () => {
        console.log('⏰ Tiempo de inactividad superado - cerrando sesión')
        localStorage.removeItem('auth_token')
        localStorage.removeItem('last_activity')
        setShowInactivityModal(true)
    }

    // El hook siempre se ejecuta, pero internamente solo funciona si hay token
    useInactivityTimeout(handleInactivityTimeout)

    const handleCloseInactivityModal = () => {
        setShowInactivityModal(false)
        logout()
    }

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
