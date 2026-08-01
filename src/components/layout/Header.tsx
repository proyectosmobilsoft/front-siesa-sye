import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import { useUIStore } from '@/store/uiStore'
import { getPageMeta } from '@/config/navigation'

// Decodifica el payload del JWT sin librerías externas
const decodeJwtPayload = (token: string): Record<string, string> | null => {
    try {
        const payload = token.split('.')[1]
        return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, string>
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

export const Header = () => {
    const { sidebarOpen, setSidebarOpen } = useUIStore()
    const navigate = useNavigate()
    const location = useLocation()

    const { nombre, inicial } = getUsuarioFromToken()
    const pagina = getPageMeta(location.pathname)

    const handleLogout = () => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('last_activity')
        navigate('/login')
    }

    return (
        <header className="relative sticky top-0 z-40 w-full bg-card">
            {/* Curvatura de unión con el sidebar (esquina cóncava, arco pegado a la esquina superior izquierda) */}
            <div
                className="hidden lg:block absolute left-0 top-full h-6 w-6 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(circle at 100% 100%, transparent 24px, hsl(var(--card)) 25px)'
                }}
            />
            <div className="flex h-16 items-center justify-between px-4 lg:px-6">
                {/* Left — control retráctil del menú + título/subtítulo de página */}
                <div className="flex items-center gap-3 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 rounded-xl"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        title={sidebarOpen ? 'Contraer menú' : 'Expandir menú'}
                        aria-label={sidebarOpen ? 'Contraer menú' : 'Expandir menú'}
                    >
                        {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                    </Button>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="flex min-w-0 items-center gap-2.5"
                        >
                            <div className="min-w-0 leading-tight">
                                <p className="truncate text-sm font-bold text-foreground">
                                    {pagina?.name ?? 'Dashboard'}
                                </p>
                                <p className="hidden truncate text-xs text-muted-foreground md:block">
                                    {pagina?.subtitle}
                                </p>
                            </div>
                        </motion.div>
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
