import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
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
import { useUIStore } from '@/store/uiStore'
import { useEffect } from 'react'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutos
            retry: 3,
            refetchOnWindowFocus: false,
        },
    },
})

function App() {
    const { isDarkMode } = useUIStore()

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
                                    <Route path="/configuracion" element={<SettingsPage />} />
                                    <Route path="/ayuda" element={<HelpPage />} />
                                </Routes>
                            </main>
                        </div>
                    </div>
                </div>
            </Router>
        </QueryClientProvider>
    )
}

export default App
