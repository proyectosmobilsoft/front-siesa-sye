/**
 * Función utilitaria para realizar reintentos en peticiones HTTP
 * @param fn - Función que realiza la petición
 * @param maxRetries - Número máximo de reintentos (por defecto 2)
 * @param delay - Delay entre reintentos en ms (por defecto 1000)
 * @returns Promise con el resultado de la petición
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Si es el último intento, lanzar el error
      if (attempt === maxRetries) {
        throw lastError
      }

      // Esperar antes del siguiente intento
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      console.warn(
        `Intento ${attempt + 1} falló, reintentando en ${delay}ms...`,
        error
      )
    }
  }

  throw lastError!
}
