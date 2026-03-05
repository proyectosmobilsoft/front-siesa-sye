import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Hook para manejar la autenticación y verificar el token
 * Siempre verifica al cargar la aplicación y redirige a login si no hay token
 */
export const useAuth = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('auth_token')
            const isLoginPage = location.pathname === '/login'
            
            console.log('🔍 Verificando autenticación:', { hasToken: !!token, isLoginPage, pathname: location.pathname })
            
            if (!token) {
                // No hay token - SIEMPRE redirigir a login
                console.log('🔒 No hay token, redirigiendo a login')
                localStorage.removeItem('auth_token')
                localStorage.removeItem('last_activity')
                if (!isLoginPage) {
                    navigate('/login', { replace: true })
                }
                setIsAuthenticated(false)
            } else if (token && isLoginPage) {
                // Hay token y está en login, redirigir al dashboard
                console.log('✅ Token encontrado, redirigiendo al dashboard')
                navigate('/', { replace: true })
                setIsAuthenticated(true)
            } else if (token && !isLoginPage) {
                // Hay token y no está en login, permitir acceso
                console.log('✅ Token válido, acceso permitido')
                setIsAuthenticated(true)
            }
        }

        // Ejecutar inmediatamente al montar
        checkAuth()
    }, [location.pathname, navigate])

    const logout = () => {
        localStorage.removeItem('auth_token')
        navigate('/login', { replace: true })
    }

    return {
        isAuthenticated,
        logout,
    }
}
