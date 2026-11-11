import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { VendorsChart } from '@/components/dashboard/VendorsChart'
import { OrdersStatusBreakdown } from '@/components/dashboard/OrdersStatusBreakdown'
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable'
import { DashboardReciboCajaPage } from '@/pages/DashboardReciboCajaPage'
import { DetalleProvider } from '@/components/tablero/detalle/DetalleContext'
import { PERMISOS } from '@/config/permisos'
import { useAuthStore } from '@/store/authStore'

const ResumenPedidos = () => (
    <DetalleProvider>
    <div className="space-y-6">
        <StatsCards />

        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <VendorsChart />
            </div>
            <OrdersStatusBreakdown />
        </div>

        <RecentOrdersTable />
    </div>
    </DetalleProvider>
)

const Bienvenida = () => (
    <div className="mx-auto mt-16 max-w-md rounded-3xl bg-card p-8 text-center ring-1 ring-border/80">
        <h2 className="text-lg font-semibold text-foreground">Bienvenido a SYE</h2>
        <p className="mt-2 text-sm text-muted-foreground">Elige en el menú de la izquierda la pantalla con la que vas a trabajar.</p>
    </div>
)

export const DashboardPage = () => {
    const hasPermiso = useAuthStore((s) => s.hasPermiso)
    const [abierto, setAbierto] = useState(true)

    // Pedidos, ventas y vendedores es información gerencial: solo con VER_DASHBOARD (INC-000005).
    // "/" no lleva ProtectedRoute (es a donde redirige un permiso faltante), por eso se decide aquí.
    const verVentas = hasPermiso(PERMISOS.DASHBOARD)

    if (!hasPermiso(PERMISOS.RECIBO_CAJA)) {
        return (
            <div className="flex-1 p-6">
                {verVentas ? <ResumenPedidos /> : <Bienvenida />}
            </div>
        )
    }

    if (!verVentas) return <div className="flex-1"><DashboardReciboCajaPage /></div>

    return (
        <div className="flex-1">
            <DashboardReciboCajaPage />

            <section className="mx-auto max-w-[1600px] px-4 pb-8 sm:px-6 lg:px-8">
                <div className="rounded-3xl bg-card p-5 ring-1 ring-border/80 sm:p-6">
                    <button
                        type="button"
                        onClick={() => setAbierto((v) => !v)}
                        aria-expanded={abierto}
                        className="flex w-full items-center justify-between gap-2 text-left"
                    >
                        <div>
                            <h2 className="text-[15px] font-semibold text-foreground">Pedidos, ventas y vendedores</h2>
                            <p className="mt-0.5 text-[12.5px] text-muted-foreground">Resumen operativo del día</p>
                        </div>
                        <ChevronDown className={`size-5 text-muted-foreground transition-transform ${abierto ? 'rotate-180' : ''}`} />
                    </button>
                    {abierto && (
                        <div className="mt-5">
                            <ResumenPedidos />
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
