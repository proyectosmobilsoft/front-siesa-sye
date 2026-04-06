import { motion, AnimatePresence } from 'framer-motion'
import { Menu, LogOut } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import { useUIStore } from '@/store/uiStore'

// Decodifica el payload del JWT sin librerías externas
const decodeJwtPayload = (token: string): Record<string, any> | null => {
    try {
        const payload = token.split('.')[1]
        return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    } catch {
        return null
    }
}

const getUsuarioFromToken = (): { nombre: string; inicial: string } => {
    const token = localStorage.getItem('auth_token')
    if (!token) return { nombre: 'Usuario', inicial: 'U' }

    const payload = decodeJwtPayload(token)
    if (!payload) return { nombre: 'Usuario', inicial: 'U' }

    // Intenta distintos campos que puede traer el JWT
    const nombre: string =
        payload.nombre ??
        payload.name ??
        payload.usuario ??
        payload.username ??
        payload.sub ??
        'Usuario'

    return { nombre, inicial: nombre.charAt(0).toUpperCase() }
}

// Subtítulo dinámico por ruta — mismo texto que aparece en cada página
const PAGE_SUBTITLES: Record<string, string> = {
    '/': 'Resumen de clientes, productos y estado del inventario',
    '/clientes': 'Gestión y visualización de clientes',
    '/companias': 'Gestión y visualización de compañías',
    '/productos': 'Gestión y visualización de productos',
    '/egreso': 'Gestión de anticipos operativos',
    '/pedidos': 'Historial y seguimiento de pedidos',
    '/facturas/gestion-ventas': 'Documentos y gestión de ventas',
    '/facturas/analisis-financiero': 'Análisis financiero por periodo',
    '/reportes': 'Pedidos diarios consolidados',
    '/reportes/ventas': 'Resumen de ventas por periodo',
    '/reportes/vendedores': 'Rendimiento por vendedor',
    '/maestro/roles': 'Administración de roles y permisos',
    '/maestro/usuarios': 'Administración de usuarios del sistema',
    '/maestro/descuentos-financieros': 'Condiciones y descuentos de pago',
    '/configuracion': 'Preferencias del sistema',
    '/configuracion/seguridad': 'Configuración de seguridad',
    '/ayuda': 'Documentación y soporte',
}

export const Header = () => {
    const { sidebarOpen, setSidebarOpen } = useUIStore()
    const navigate = useNavigate()
    const location = useLocation()

    const { nombre, inicial } = getUsuarioFromToken()
    const subtitle = PAGE_SUBTITLES[location.pathname] ?? ''

    const handleLogout = () => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('last_activity')
        navigate('/login')
    }

    return (
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-4 lg:px-6">
                {/* Left — botón menú mobile + subtítulo de página */}
                <div className="flex items-center gap-3 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden flex-shrink-0"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <Menu className="h-4 w-4" />
                    </Button>

                    <AnimatePresence mode="wait">
                        <motion.p
                            key={location.pathname}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="hidden md:block text-sm text-muted-foreground truncate"
                        >
                            {subtitle}
                        </motion.p>
                    </AnimatePresence>
                </div>

                {/* Right — tema + usuario + logout */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <ThemeToggle />

                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-primary-foreground">{inicial}</span>
                        </div>
                        <span className="hidden md:block text-sm font-medium">{nombre}</span>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        title="Cerrar sesión"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </header>
    )
}
