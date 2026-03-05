import { useEffect, useRef, useCallback } from 'react'

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutos en milisegundos
const LAST_ACTIVITY_KEY = 'last_activity'

/**
 * Hook para detectar inactividad del usuario y cerrar sesión después de 30 minutos
 * Solo se activa si hay un token de autenticación
 */
export const useInactivityTimeout = (onTimeout: () => void) => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastActivityRef = useRef<number>(Date.now())
    
    const hasToken = () => {
        return !!localStorage.getItem('auth_token')
    }

    const resetTimer = useCallback(() => {
        // Solo resetear si hay token
        if (!hasToken()) {
            return
        }

        const now = Date.now()
        lastActivityRef.current = now
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString())

        // Limpiar el timeout anterior
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        // Crear nuevo timeout
        timeoutRef.current = setTimeout(() => {
            if (hasToken()) {
                console.log('⏰ Tiempo de inactividad superado (30 minutos)')
                onTimeout()
            }
        }, INACTIVITY_TIMEOUT)
    }, [onTimeout])

    const handleActivity = useCallback(() => {
        resetTimer()
    }, [resetTimer])

    useEffect(() => {
        // Solo activar si hay token
        if (!hasToken()) {
            return
        }

        // Verificar si hay una última actividad guardada al iniciar
        const savedLastActivity = localStorage.getItem(LAST_ACTIVITY_KEY)
        if (savedLastActivity) {
            const savedTime = parseInt(savedLastActivity, 10)
            const now = Date.now()
            const timeSinceLastActivity = now - savedTime

            if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
                // Ya pasó el tiempo de inactividad antes de recargar
                console.log('⏰ Tiempo de inactividad superado antes de recargar')
                onTimeout()
                return
            } else {
                // Ajustar el timeout según el tiempo que ya pasó
                const remainingTime = INACTIVITY_TIMEOUT - timeSinceLastActivity
                timeoutRef.current = setTimeout(() => {
                    if (hasToken()) {
                        console.log('⏰ Tiempo de inactividad superado (30 minutos)')
                        onTimeout()
                    }
                }, remainingTime)
            }
        } else {
            // No hay actividad guardada, iniciar timer desde cero
            resetTimer()
        }

        // Eventos que indican actividad del usuario
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
        
        events.forEach((event) => {
            window.addEventListener(event, handleActivity, { passive: true })
        })

        // Limpiar al desmontar
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity)
            })
        }
    }, [handleActivity, resetTimer, onTimeout])

    return {
        resetTimer,
    }
}
