import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { API_CONFIG } from '@/config/api'

/**
 * Cliente HTTP configurado para toda la aplicación
 * Usa configuración centralizada y manejo robusto de errores
 */
export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Configuración adicional para mejorar la robustez
  validateStatus: (status) => {
    // Considerar exitosas las respuestas 2xx y 3xx
    return status >= 200 && status < 400
  },
})

/**
 * Interceptor de request: Agrega logging y configuración adicional
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Inyectar token de autenticación
    const token = localStorage.getItem('auth_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
      // Log en desarrollo para verificar que el token se está enviando
      if (import.meta.env.DEV) {
        console.log(`🔑 Token agregado a la petición: ${token.substring(0, 20)}...`)
      }
    } else if (import.meta.env.DEV) {
      console.warn('⚠️ No hay token disponible para esta petición')
    }

    // Log de la petición en desarrollo
    if (import.meta.env.DEV) {
      const fullUrl = `${config.baseURL || ''}${config.url || ''}`
      console.log(`📤 Request: ${config.method?.toUpperCase()} ${fullUrl}`)
    }
    return config
  },
  (error: AxiosError) => {
    console.error('❌ Request Error:', error.message)
    return Promise.reject(error)
  }
)

/**
 * Interceptor de response: Manejo centralizado de errores y respuestas
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log solo en desarrollo
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`)
    }
    return response
  },
  (error: AxiosError) => {
    // Manejo robusto de errores
    if (error.response) {
      // El servidor respondió con un código de error
      const status = error.response.status
      const message = error.response.data || error.message

      console.error(`❌ API Error [${status}]:`, {
        url: error.config?.url,
        method: error.config?.method,
        message,
      })

      // Manejar errores específicos
      switch (status) {
        case 401:
          console.error('🔒 No autorizado - Redirigiendo a login')
          localStorage.removeItem('auth_token')
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          break
        case 403:
          console.error('🚫 Acceso prohibido')
          break
        case 404:
          console.error('🔍 Endpoint no encontrado:', error.config?.url)
          break
        case 500:
          console.error('💥 Error interno del servidor')
          break
        case 503:
          console.error('⚠️ Servicio no disponible')
          break
      }
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      console.error('🌐 Error de red:', {
        url: error.config?.url,
        message: 'No se recibió respuesta del servidor',
      })
    } else {
      // Algo más causó el error
      console.error('❌ Error:', error.message)
    }

    return Promise.reject(error)
  }
)
