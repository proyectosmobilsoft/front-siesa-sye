import { apiClient } from '@/api/client'
import type { EspecDetalle, FiltrosColumna, RangoDetalle, RespuestaDetalle, RespuestaValores } from './tipos'

const SIN_RANGO = new Set(['pedidos'])

/** Parámetros comunes: rango, filtros de la tarjeta y filtros por columna. */
function parametrosBase(espec: EspecDetalle, rango: RangoDetalle | undefined, cf: FiltrosColumna) {
  return {
    ...(rango && !SIN_RANGO.has(espec.conjunto) ? rango : {}),
    ...espec.filtros,
    ...(Object.keys(cf).length ? { cf: JSON.stringify(cf) } : {}),
  }
}

export interface ConsultaPagina {
  pagina: number
  tamano: number
  orden: { clave: string; dir: 'asc' | 'desc' } | null
}

export async function obtenerDetalle(espec: EspecDetalle, rango: RangoDetalle | undefined, cf: FiltrosColumna, p: ConsultaPagina, exportar = false) {
  const { data } = await apiClient.get<{ success: boolean; data: RespuestaDetalle }>(`/dashboard/detalle/${espec.conjunto}`, {
    params: {
      ...parametrosBase(espec, rango, cf),
      ...(exportar ? { exportar: '1' } : { pagina: p.pagina, tamano: p.tamano }),
      ...(p.orden ? { orden: p.orden.clave, dir: p.orden.dir } : {}),
    },
  })
  return data.data
}

export async function obtenerValores(espec: EspecDetalle, rango: RangoDetalle | undefined, cf: FiltrosColumna, columna: string, buscar: string) {
  const { data } = await apiClient.get<{ success: boolean; data: RespuestaValores }>(`/dashboard/detalle/${espec.conjunto}/valores`, {
    params: { ...parametrosBase(espec, rango, cf), columna, ...(buscar ? { buscar } : {}) },
  })
  return data.data
}
