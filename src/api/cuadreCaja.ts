import { apiClient } from './client'

export interface CuadreCajaDoc {
  rowid: number
  co: string
  caja: string | null
  sentido: 'I' | 'E'
  concepto: 'VENTAS' | 'RECAUDOS' | 'OTROS_IN' | 'TRASLADO_IN' | 'PROVEEDORES' | 'OTROS_PAGOS' | 'CONSIGNACIONES' | 'TRASLADO_OUT' | 'DEVOLUCIONES'
  tipo: string
  numero: number
  fecha: string
  tercero: string
  nit: string
  origen: 'APP' | 'SIESA'
  usuario: string
  creado_por: string
  notas: string
  efectivo: number
  tarjetas: number
  consignado: number
  otros: number
  credito: number
  total: number
  /** Solo en la recogida del POS (R01): facturas de contado C01 y notas N01 que agrupa. */
  facturas_pos?: { tipo: string; numero: number; tercero: string; nit: string; valor: number }[]
  /** Solo en TC hechos desde Traslado de Fondos (se cruza por rowid del documento en SIESA). */
  traslado?: { origen: string; destino: string; medio: string; usuario: string; motivo: string }
}

export interface CuadreCaja {
  fecha_inicial: string
  fecha_final: string
  centros: string[]
  caja: string | null
  cajas: { co: string; caja: string; descripcion: string }[]
  documentos: CuadreCajaDoc[]
}

export const cuadreCajaApi = {
  obtener: async ({ fechaInicial, fechaFinal, caja }: { fechaInicial: string; fechaFinal: string; caja?: string }): Promise<CuadreCaja> => {
    const response = await apiClient.get<{ success: boolean; data: CuadreCaja }>('/recibo-caja/cuadre-caja', {
      params: { fecha_inicial: fechaInicial, fecha_final: fechaFinal, caja: caja || undefined },
      timeout: 120000,
    })
    return response.data.data
  },
  cajas: async (): Promise<CuadreCaja['cajas']> => {
    const response = await apiClient.get<{ success: boolean; data: CuadreCaja['cajas'] }>('/recibo-caja/cuadre-caja/cajas', { timeout: 60000 })
    return response.data.data ?? []
  },
}
