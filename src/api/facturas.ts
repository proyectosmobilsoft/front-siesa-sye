import { apiClient } from './client'
import { 
  Factura, 
  FacturasResponse, 
  FacturasParams,
  EstadoFinanciero,
  EstadosFinancierosResponse,
  EstadosFinancierosParams,
  PerdidasGanancias,
  PerdidasGananciasResponse,
  PerdidasGananciasParams,
  TendenciaMensual,
  TendenciaMensualResponse,
  TendenciaMensualParams
} from './types'

/**
 * API para gestión de facturas
 * Implementación robusta con manejo de parámetros y errores
 */
export const facturasApi = {
  /**
   * Obtiene todas las facturas según los parámetros de filtrado
   * @param params - Parámetros de filtrado (periodo, paginación)
   * @returns Promise con array de facturas
   */
  getAll: async (params?: FacturasParams): Promise<Factura[]> => {
    // Construir parámetros de query de forma segura
    const queryParams = new URLSearchParams()

    // Agregar parámetros solo si están definidos
    if (params?.periodoInicial !== undefined && params.periodoInicial !== null) {
      queryParams.append('periodoInicial', params.periodoInicial.toString())
    }
    if (params?.periodoFinal !== undefined && params.periodoFinal !== null) {
      queryParams.append('periodoFinal', params.periodoFinal.toString())
    }
    if (params?.page !== undefined && params.page !== null) {
      queryParams.append('page', params.page.toString())
    }
    if (params?.pageSize !== undefined && params.pageSize !== null) {
      queryParams.append('pageSize', params.pageSize.toString())
    }

    // Construir URL final
    const queryString = queryParams.toString()
    const endpoint = `/factura/facturas${queryString ? `?${queryString}` : ''}`

    try {
      const response = await apiClient.get<FacturasResponse>(endpoint)
      
      // Validar estructura de respuesta
      if (!response.data || !response.data.success) {
        throw new Error('Respuesta inválida del servidor')
      }

      return response.data.data || []
    } catch (error) {
      console.error('Error al obtener facturas:', error)
      throw error
    }
  },

  /**
   * Obtiene los estados financieros según los parámetros de filtrado
   * @param params - Parámetros de filtrado (periodo inicial y final)
   * @returns Promise con array de estados financieros
   */
  getEstadosFinancieros: async (params?: EstadosFinancierosParams): Promise<EstadoFinanciero[]> => {
    // Construir parámetros de query de forma segura
    const queryParams = new URLSearchParams()

    // Agregar parámetros solo si están definidos
    if (params?.periodoInicial !== undefined && params.periodoInicial !== null) {
      queryParams.append('periodoInicial', params.periodoInicial.toString())
    }
    if (params?.periodoFinal !== undefined && params.periodoFinal !== null) {
      queryParams.append('periodoFinal', params.periodoFinal.toString())
    }

    // Construir URL final
    const queryString = queryParams.toString()
    const endpoint = `/factura/estados-financieros${queryString ? `?${queryString}` : ''}`

    try {
      const response = await apiClient.get<EstadosFinancierosResponse>(endpoint)
      
      // Validar estructura de respuesta
      if (!response.data || !response.data.success) {
        throw new Error('Respuesta inválida del servidor')
      }

      return response.data.data || []
    } catch (error) {
      console.error('Error al obtener estados financieros:', error)
      throw error
    }
  },

  /**
   * Obtiene el estado de resultados (pérdidas y ganancias) según los parámetros de filtrado
   * @param params - Parámetros de filtrado (periodo inicial y final)
   * @returns Promise con array de pérdidas y ganancias
   */
  getPerdidasGanancias: async (params?: PerdidasGananciasParams): Promise<PerdidasGanancias[]> => {
    // Construir parámetros de query de forma segura
    const queryParams = new URLSearchParams()

    // Agregar parámetros solo si están definidos
    if (params?.periodoInicial !== undefined && params.periodoInicial !== null) {
      queryParams.append('periodoInicial', params.periodoInicial.toString())
    }
    if (params?.periodoFinal !== undefined && params.periodoFinal !== null) {
      queryParams.append('periodoFinal', params.periodoFinal.toString())
    }

    // Construir URL final
    const queryString = queryParams.toString()
    const endpoint = `/factura/perdidas-ganancias${queryString ? `?${queryString}` : ''}`

    try {
      const response = await apiClient.get<PerdidasGananciasResponse>(endpoint)
      
      // Validar estructura de respuesta
      if (!response.data || !response.data.success) {
        throw new Error('Respuesta inválida del servidor')
      }

      return response.data.data || []
    } catch (error) {
      console.error('Error al obtener pérdidas y ganancias:', error)
      throw error
    }
  },

  /**
   * Obtiene la tendencia mensual de ingresos, costos y gastos según los parámetros de filtrado
   * @param params - Parámetros de filtrado (periodo inicial y final)
   * @returns Promise con array de tendencia mensual
   */
  getTendenciaMensual: async (params?: TendenciaMensualParams): Promise<TendenciaMensual[]> => {
    // Construir parámetros de query de forma segura
    const queryParams = new URLSearchParams()

    // Agregar parámetros solo si están definidos
    if (params?.periodoInicial !== undefined && params.periodoInicial !== null) {
      queryParams.append('periodoInicial', params.periodoInicial.toString())
    }
    if (params?.periodoFinal !== undefined && params.periodoFinal !== null) {
      queryParams.append('periodoFinal', params.periodoFinal.toString())
    }

    // Construir URL final
    const queryString = queryParams.toString()
    const endpoint = `/factura/tendencia-mensual${queryString ? `?${queryString}` : ''}`

    try {
      const response = await apiClient.get<TendenciaMensualResponse>(endpoint)
      
      // Validar estructura de respuesta
      if (!response.data || !response.data.success) {
        throw new Error('Respuesta inválida del servidor')
      }

      return response.data.data || []
    } catch (error) {
      console.error('Error al obtener tendencia mensual:', error)
      throw error
    }
  },
}
