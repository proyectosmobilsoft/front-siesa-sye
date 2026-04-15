import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  permiso: string
  children: React.ReactNode
}

/**
 * Protege una ruta verificando que el usuario tiene el permiso requerido.
 * Si no lo tiene, redirige al Dashboard (siempre accesible).
 */
export const ProtectedRoute = ({ permiso, children }: ProtectedRouteProps) => {
  const hasPermiso = useAuthStore((s) => s.hasPermiso)

  if (!hasPermiso(permiso)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
