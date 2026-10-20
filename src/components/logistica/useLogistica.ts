import { useQuery } from '@tanstack/react-query'
import { logisticaApi } from '@/api/logistica'
export const useFacturasLogistica = (co: string | null) =>
  useQuery({
    queryKey: ['logistica', 'facturas', co],
    queryFn: logisticaApi.facturas,
    enabled: !!co,
  })
export const useCuadrantesLogistica = (co: string | null) =>
  useQuery({
    queryKey: ['logistica', 'cuadrantes', co],
    queryFn: logisticaApi.cuadrantes,
    enabled: !!co,
  })
export const useFacturasCuadrante = (id: number | null) =>
  useQuery({
    queryKey: ['logistica', 'cuadrante-facturas', id],
    queryFn: () => logisticaApi.facturasDeCuadrante(id!),
    enabled: id != null,
  })
export const useRecursosLogistica = (co: string | null) =>
  useQuery({
    queryKey: ['logistica', 'recursos', co],
    queryFn: logisticaApi.recursos,
    enabled: !!co,
  })
/** Camiones propios de SYE, incluidos los inactivos (para Configuración). */
export const useVehiculosLogistica = (co: string | null) =>
  useQuery({
    queryKey: ['logistica', 'vehiculos', co],
    queryFn: logisticaApi.vehiculos,
    enabled: !!co,
  })
export const useRutasLogistica = (fecha: string, co: string | null) =>
  useQuery({
    queryKey: ['logistica', 'rutas', fecha, co],
    queryFn: () => logisticaApi.rutas(fecha),
    enabled: !!co,
  })
export const useDashboardLogistica = (
  desde: string,
  hasta: string,
  co: string | null,
  activo: boolean
) =>
  useQuery({
    queryKey: ['logistica', 'dashboard', desde, hasta, co],
    queryFn: () => logisticaApi.dashboard(desde, hasta),
    enabled: !!co && activo,
  })
