export type TipoColumna = 'texto' | 'fecha' | 'fechahora' | 'entero' | 'dinero' | 'kg' | 'dias' | 'porcentaje'

export interface ColumnaDetalle {
  clave: string
  etiqueta: string
  tipo: TipoColumna
  sumar?: boolean
  razon?: [string, string]
}

/** Filtro de una columna: valores elegidos, texto contenido o rango (como el menú de Excel). */
export interface FiltroColumna {
  v?: string[]
  q?: string
  min?: string | number
  max?: string | number
}
export type FiltrosColumna = Record<string, FiltroColumna>

export interface EspecDetalle {
  titulo: string
  /** Conjunto de registros del backend (`/dashboard/detalle/:conjunto`). */
  conjunto: string
  /** Filtros de la tarjeta que entiende el backend (estado, origen, mes…). */
  filtros?: Record<string, string>
  /** Lo que significan esos filtros, para mostrarlos como etiquetas. */
  filtrosTexto?: string[]
  /** Filtros por columna con los que abre la tabla; el usuario puede quitarlos. */
  cf?: FiltrosColumna
  /** Cómo se llega al número de la tarjeta. */
  explicacion?: string
  /** Valor que muestra la tarjeta (lo agrega la propia tarjeta). */
  valor?: string
  orden?: { clave: string; dir: 'asc' | 'desc' }
}

export interface RespuestaDetalle {
  columnas: ColumnaDetalle[]
  fuente: string
  total: number
  totalSinFiltrarColumnas: number
  totales: Record<string, number | null>
  filas: Record<string, unknown>[]
  pagina: number
  tamano: number
  orden: string
  dir: 'asc' | 'desc'
}

export interface RespuestaValores {
  columna: string
  tipo: TipoColumna
  total: number
  truncado: boolean
  valores: { valor: string; n: number }[]
}

export interface RangoDetalle {
  desde: string
  hasta: string
}

export const VACIO = '(vacío)'
