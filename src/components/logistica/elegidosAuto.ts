import type { Vehiculo } from '@/api/logistica'

/** Camión elegido para el plan automático → conductor (null = falta elegirlo). */
export type ElegidosAuto = Record<number, number | null>

/**
 * Por defecto: los camiones con capacidad y conductor fijo, sin repetir
 * conductor (uno fijo en varios camiones solo se asigna al primero).
 */
export function elegidosPorDefecto(vehiculos: Vehiculo[]): ElegidosAuto {
  const salida: ElegidosAuto = {}
  const tomados = new Set<number>()
  for (const v of vehiculos) {
    const fijo = v.conductores[0]?.id
    if (v.capacidad_kg && fijo && !tomados.has(fijo)) {
      salida[v.cod] = fijo
      tomados.add(fijo)
    }
  }
  return salida
}
