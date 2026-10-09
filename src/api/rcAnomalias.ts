import { apiClient } from './client'

export type SeveridadAnomalia = 'critica' | 'alta' | 'media'
export type CodigoAnomalia = 'DESCUADRE' | 'CABECERA_LINEAS' | 'AJUSTE_LADO' | 'AJUSTE_LIMITE' | 'ANTICIPO_SIN_SA' | 'SOBRANTE_SIN_ANTICIPO' | 'ANTICIPO_SUCURSAL' | 'DESCUENTO_DISTINTO' | 'MEDIOS_TOTAL' | 'LINEAS_DUPLICADAS' | 'ANULADO_SIN_DOC'
export interface AnomaliaRc { codigo: CodigoAnomalia; severidad: SeveridadAnomalia; mensaje: string; detalle: Record<string, unknown> }
export interface ResumenAnomalia { codigo: CodigoAnomalia; titulo: string; severidad: SeveridadAnomalia; cantidad: number; diferencia_total: number }
export interface RcAnomalo {
  rowid: number; co: string; tipo: string; numero: string | number; fecha: string; estado: string
  tercero_rowid: number | null; nit: string | null; cliente: string | null; usuario_creacion: string | null
  origen: 'API' | 'SIESA'; canal?: 'APP' | 'WEB' | 'SIESA'; total_db: number; total_cr: number; anomalias: AnomaliaRc[]
}
export interface ProcesoAnomalo {
  idempotency_key: string; usuario_nombre: string | null; estado: 'FAILED' | 'PROCESSING'
  error_message: string | null; created_at: string; updated_at: string; numero_recibo: string | number | null
}
export interface ConsultaRcAnomalias {
  rango: { desde: string; hasta: string; co: '001' | '002' | 'AMBOS' }
  total_rc_revisados: number; resumen: ResumenAnomalia[]; rcs: RcAnomalo[]; procesos: ProcesoAnomalo[]
}
export interface LineaRcAnomalo {
  cuenta: string; descripcion: string | null; tercero: string | null; sucursal: string | null; ind_mov_sa: string | number | null
  db: number; cr: number; db2: number; cr2: number; db3: number; cr3: number
  sa: { rowid: number; anticipo: number | null; documento: string | null } | null
}
export interface DetalleLineasRc {
  cabecera: Record<string, unknown>; lineas: LineaRcAnomalo[]
  medios: Record<string, unknown>[]; totales: Record<string, unknown>
}

export const rcAnomaliasApi = {
  consultar: async (params: { desde: string; hasta: string; co: '001' | '002' | 'AMBOS' }) =>
    (await apiClient.get<{ success: boolean; data: ConsultaRcAnomalias }>('/recibo-caja/anomalias', { params, timeout: 120000 })).data.data,
  lineas: async (rowid: number) =>
    (await apiClient.get<{ data: DetalleLineasRc }>(`/recibo-caja/anomalias/${rowid}/lineas`)).data.data,
}
