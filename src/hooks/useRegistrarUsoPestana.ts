import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { LOGISTICA, navigation } from '@/config/navigation'
import { useAuthStore } from '@/store/authStore'

const ANTI_REBOTE_MS = 5_000

/** Rutas válidas declaradas en navigation.ts (excluyendo "/"). */
const RUTAS_REGISTRABLES = new Set<string>(
  [
    ...navigation.flatMap((item) => [
      ...(item.href ? [item.href] : []),
      ...(item.subItems ?? []).map((sub) => sub.href),
    ]),
    ...LOGISTICA.map((item) => item.href),
  ].filter((href) => href && href !== '/')
)

/**
 * Registra en segundo plano cada visita a una pestaña de navigation.ts (≠ "/"),
 * evitando duplicados seguidos en menos de 5 segundos y silenciando errores.
 */
export function useRegistrarUsoPestana() {
  const { pathname } = useLocation()
  const sesionId = useAuthStore((s) => s.sesion?.id)
  const ultimoRef = useRef<{ ruta: string; ts: number } | null>(null)

  useEffect(() => {
    if (!sesionId) return
    if (!RUTAS_REGISTRABLES.has(pathname)) return

    const ahora = Date.now()
    const previo = ultimoRef.current
    if (previo && previo.ruta === pathname && ahora - previo.ts < ANTI_REBOTE_MS) {
      return
    }
    ultimoRef.current = { ruta: pathname, ts: ahora }

    void apiClient
      .post('/dashboard/uso-pestana', { ruta: pathname }, { silenciarAviso: true })
      .catch(() => {})
  }, [pathname, sesionId])
}
