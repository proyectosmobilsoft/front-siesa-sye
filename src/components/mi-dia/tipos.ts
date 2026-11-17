export interface MiDiaTransferencias {
  aprobadas_hoy: number
  valor_aprobado_hoy: number
  rechazadas_hoy: number
  pendientes: number | null
  creadas_hoy: number
}

export interface MiDiaEntregas {
  confirmadas_hoy: number
  valor_confirmado_hoy: number
  por_confirmar: number
}

export interface MiDiaTraslados {
  hechos_hoy: number
  valor_hoy: number
}

export interface MiDiaRecibos {
  cantidad: number
  valor: number
}

export interface MiDiaData {
  fecha: string
  transferencias: MiDiaTransferencias | null
  entregas: MiDiaEntregas | null
  traslados: MiDiaTraslados | null
  recibos: MiDiaRecibos | null
}

export type OrigenAtajos = 'usuario' | 'rol' | 'mixto' | 'ninguno'

export interface AtajosData {
  origen: OrigenAtajos
  rutas: string[]
}
