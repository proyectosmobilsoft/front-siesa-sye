/**
 * Configuración centralizada de la API.
 *
 * El entorno lo decide la variable ENV del .env (la resuelve vite.config.ts y
 * la inyecta como VITE_APP_ENV junto con VITE_API_ORIGIN):
 *   ENV=local → http://localhost:3010
 *   ENV=prod  → https://apisye.mobilsoft.co
 *
 * - Con `npm run dev` las peticiones salen a /api y el proxy de Vite las
 *   redirige al origen elegido (mismo origen para el navegador → sin CORS).
 * - Con `npm run build` no hay proxy, así que se usa la URL absoluta.
 */

/** Entorno resuelto por vite.config.ts a partir de ENV. */
export const APP_ENV = import.meta.env.VITE_APP_ENV ?? 'local'

/** Origen del backend (sin '/api') según ENV. */
export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3010'

const getApiBaseUrl = (): string => {
  // Override manual: si se define VITE_API_BASE_URL, gana sobre ENV.
  // Útil para apuntar a un backend puntual sin tocar el resto.
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  // En dev, el proxy de Vite ya apunta al origen correcto según ENV.
  if (import.meta.env.DEV) {
    return '/api'
  }

  return `${API_ORIGIN.replace(/\/+$/, '')}/api`
}

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: 30000, // 30 segundos para peticiones grandes
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo entre reintentos
} as const

// Validar que la configuración sea válida
if (!API_CONFIG.BASE_URL) {
  console.warn('⚠️ API_BASE_URL no está configurada. Usando valores por defecto.')
}

// Log de configuración
console.log(`🔧 API Config (ENV=${APP_ENV})`, {
  BASE_URL: API_CONFIG.BASE_URL,
  MODE: import.meta.env.MODE,
  API_ORIGIN,
  NOTE: import.meta.env.DEV
    ? `Las peticiones van a /api y Vite las redirige a ${API_ORIGIN} internamente`
    : 'Las peticiones van directamente al backend',
})
