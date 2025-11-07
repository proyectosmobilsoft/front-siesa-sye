/**
 * Configuración centralizada de la API
 * Permite cambiar fácilmente entre diferentes entornos (desarrollo, producción)
 * 
 * IMPORTANTE: En desarrollo usa el proxy de Vite (/api) que redirige a localhost:3000
 * Esto evita problemas de CORS y permite que todo funcione correctamente
 */

// Obtener la URL base de la API desde variables de entorno o usar valores por defecto
const getApiBaseUrl = (): string => {
  // Si hay una variable de entorno configurada, usarla (tiene prioridad)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // En desarrollo, usar el proxy de Vite (/api)
  // El proxy de Vite redirige internamente las peticiones a http://localhost:3000
  // Esto evita problemas de CORS porque el navegador ve las peticiones como si fueran al mismo origen
  if (import.meta.env.DEV) {
    return '/api'
  }
  
  // En producción, usar el proxy relativo o la URL configurada
  return '/api'
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

// Log solo en desarrollo
if (import.meta.env.DEV) {
  console.log('🔧 API Config:', {
    BASE_URL: API_CONFIG.BASE_URL,
    MODE: import.meta.env.MODE,
    PROXY_TARGET: 'http://localhost:3000 (via Vite proxy)',
    NOTE: 'Las peticiones van a /api y Vite las redirige a localhost:3000 internamente',
  })
}

