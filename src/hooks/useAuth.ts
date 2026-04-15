import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/**
 * Hook para manejar la autenticación.
 * Verifica el token al cargar y sincroniza con el authStore de permisos.
 * Si hay token pero no hay sesión de permisos cargada, fuerza re-login.
 */
export const useAuth = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
    const { sesion, clearSession } = useAuthStore()

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('auth_token')
            const isLoginPage = location.pathname === '/login'

            console.log('🔍 Verificando autenticación:', { hasToken: !!token, hasSesion: !!sesion, isLoginPage, pathname: location.pathname })

            if (!token) {
                // Sin token → limpiar sesión y redirigir a login
                clearSession()
                localStorage.removeItem('auth_token')
                localStorage.removeItem('last_activity')
                if (!isLoginPage) {
                    navigate('/login', { replace: true })
                }
                setIsAuthenticated(false)
                return
            }

            if (token && !sesion) {
                // Hay token pero no hay sesión con permisos cargada
                // (sesión antigua antes de la implementación de permisos)
                // Forzar re-login para cargar permisos correctamente
                console.log('🔄 Token sin sesión de permisos — forzando re-login')
                clearSession()
                localStorage.removeItem('auth_token')
                localStorage.removeItem('last_activity')
                if (!isLoginPage) {
                    navigate('/login', { replace: true })
                }
                setIsAuthenticated(false)
                return
            }

            if (token && sesion && isLoginPage) {
                // Ya autenticado → al dashboard
                navigate('/', { replace: true })
                setIsAuthenticated(true)
                return
            }

            if (token && sesion && !isLoginPage) {
                // Sesión válida con permisos
                setIsAuthenticated(true)
            }
        }

        checkAuth()
    }, [location.pathname, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

    const logout = () => {
        clearSession()
        localStorage.removeItem('auth_token')
        localStorage.removeItem('last_activity')
        navigate('/login', { replace: true })
    }

    return { isAuthenticated, logout }
}
