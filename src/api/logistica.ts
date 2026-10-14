import { apiClient } from './client'
export interface Ubicacion {
  lat: number
  lon: number
  fuente: string
  precision: string
}
export interface FacturaLogistica {
  rowid_sa: number
  numero: string
  prefijo: string
  valor: number
  peso_kg: number
  idco: string
  idtercero: number
  id_sucursal: string
  nit: string
  razon: string
  direccion: string
  ciudad: string
  depto: string
  fecha: string | null
  vence: string | null
  ubicacion: Ubicacion | null
}
export interface Conductor {
  id: number
  nombre: string
  en_uso: boolean
  facturas_pendientes: number
  kg_pendiente: number
}
/** Camión propio de SYE (tabla `log_vehiculo`). */
export interface Vehiculo {
  cod: number
  placa: string
  descripcion: string
  categoria: string
  capacidad_kg: number | null
  capacidad_confirmada: boolean
  conductor_id: number | null
  id_co: string | null
  activo: boolean
  conductores: Conductor[]
}
/** Candidato de búsqueda de dirección o lugar. */
export interface LugarEncontrado {
  lat: number
  lon: number
  nombre: string
}
export interface DatosVehiculo {
  placa: string
  descripcion?: string
  capacidadKg: number
  conductorId?: number | null
  idCo?: string | null
  activo?: boolean
}
export interface Origen {
  id_co: string
  nombre: string
  lat: number
  lon: number
}
export interface Recursos {
  origenes: Origen[]
  vehiculos: Vehiculo[]
  conductoresDisponibles: Conductor[]
}
export interface Parada {
  id: string
  rowidTercero: number
  idSucursal: string
  cliente: string
  direccion: string
  ubicacion: Ubicacion
  facturas: FacturaLogistica[]
  pesoKg: number
  valor: number
  orden: number
  etaMin: number
}
export interface RutaPropuesta {
  vehiculoId: number
  cod: number
  placa: string
  conductorId: number
  conductor: string
  capacidadKg: number
  capacidad_confirmada: boolean
  paradas: Parada[]
  pesoKg: number
  distanciaKm: number
  duracionMin: number
  ocupacion: number
  sobrepeso: boolean
  geometria: { type: string; coordinates: number[][]; cortes?: number[] }
  fuente_ruteo: string
}
export interface Propuesta {
  origen: Origen
  rutas: RutaPropuesta[]
  noAsignadas: { id: string; motivo: string }[]
  modo: 'AUTO' | 'MANUAL'
  idCo: string
  permitirSobrepeso?: boolean
}
export interface SolicitudPlan {
  modo: 'AUTO' | 'MANUAL'
  idCo: string
  facturas: number[]
  vehiculos?: { cod: number; conductorId: number }[]
  orden?: string[]
  /** Deja meter lo que no cabe en el camión menos cargado y confirmar con sobrepeso. */
  permitirSobrepeso?: boolean
  /** Automático: cada camión elegido sale con su ruta (por defecto true en el back). */
  repartir?: boolean
  rutasEsperadas?: { cod: number; conductorId: number; paradas: string[] }[]
}
export interface FacturaRuta {
  rowid_factura: number
  valor: number
  peso_kg: number
  estado_cobro: string | null
  asignacion_cobro_id: number | null
}
export interface ParadaGuardada {
  id: number
  orden: number
  rowid_tercero: number
  id_sucursal: string
  cliente: string
  lat: number
  lon: number
  peso_kg: number
  facturas: FacturaRuta[]
}
export interface RutaGuardada {
  id: number
  id_co: string
  fecha: string
  modo: string
  conductor: string
  placa: string
  estado: string
  peso_kg: number
  capacidad_kg: number
  distancia_km: number
  duracion_min: number
  fuente_ruteo: string
  geometria: { type: string; coordinates: number[][]; cortes?: number[] } | null
  paradas: ParadaGuardada[]
}
export interface DashboardLogistica {
  rutas: number
  km: number
  kg: number
  ocupacion: number
  paradas: number
  facturas: number
  valor: number
  cobradas: number
  pendientes: number
  kgPorDia: { nombre: string; valor: number }[]
  topConductores: { nombre: string; valor: number }[]
}
const dato = async <T>(promesa: Promise<{ data: { data: T } }>): Promise<T> =>
  (await promesa).data.data
export const logisticaApi = {
  facturas: () =>
    dato(
      apiClient.get<{ data: FacturaLogistica[] }>('/logistica/facturas', {
        timeout: 180000,
      })
    ),
  recursos: () =>
    dato(
      apiClient.get<{ data: Recursos }>('/logistica/recursos', {
        timeout: 180000,
      })
    ),
  geocodificar: (clientes: { rowidTercero: number; idSucursal: string }[]) =>
    dato(
      apiClient.post<{
        data: {
          rowidTercero: number
          idSucursal: string
          ubicacion: Ubicacion | null
        }[]
      }>('/logistica/geocodificar', { clientes }, { timeout: 180000 })
    ),
  buscarDireccion: (q: string) =>
    dato(
      apiClient.get<{ data: LugarEncontrado[] }>(
        '/logistica/buscar-direccion',
        {
          params: { q },
          timeout: 30000,
        }
      )
    ),
  ubicacion: (rowid: number, sucursal: string, lat: number, lon: number) =>
    dato(
      apiClient.put<{ data: Ubicacion }>(
        `/logistica/ubicaciones/${rowid}/${sucursal}`,
        { lat, lon }
      )
    ),
  origen: (co: string, nombre: string, lat: number, lon: number) =>
    dato(
      apiClient.put<{ data: Origen }>(`/logistica/origenes/${co}`, {
        nombre,
        lat,
        lon,
      })
    ),
  vehiculos: () =>
    dato(apiClient.get<{ data: Vehiculo[] }>('/logistica/vehiculos')),
  crearVehiculo: (datos: DatosVehiculo) =>
    dato(apiClient.post<{ data: Vehiculo }>('/logistica/vehiculos', datos)),
  actualizarVehiculo: (cod: number, datos: DatosVehiculo) =>
    dato(
      apiClient.put<{ data: Vehiculo }>(`/logistica/vehiculos/${cod}`, datos)
    ),
  planificar: (solicitud: SolicitudPlan) =>
    dato(
      apiClient.post<{ data: Propuesta }>('/logistica/planificar', solicitud, {
        timeout: 180000,
      })
    ),
  confirmar: (solicitud: SolicitudPlan) =>
    dato(
      apiClient.post<{ data: number[] }>('/logistica/rutas', solicitud, {
        timeout: 180000,
      })
    ),
  rutas: (fecha: string) =>
    dato(
      apiClient.get<{ data: RutaGuardada[] }>('/logistica/rutas', {
        params: { fecha },
      })
    ),
  cancelar: (id: number) =>
    dato(apiClient.delete<{ data: RutaGuardada }>(`/logistica/rutas/${id}`)),
  dashboard: (desde: string, hasta: string) =>
    dato(
      apiClient.get<{ data: DashboardLogistica }>('/logistica/dashboard', {
        params: { desde, hasta },
      })
    ),
}
