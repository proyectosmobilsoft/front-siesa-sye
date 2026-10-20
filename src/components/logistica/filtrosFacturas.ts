import { useEffect, useMemo, useState } from 'react'
import type { Cuadrante, FacturaLogistica } from '@/api/logistica'

export type EstadoUbicacion = 'todas' | 'ubicadas' | 'sin-ubicar'

export interface FiltrosFacturas {
  /** Ciudades normalizadas; vacío = todas. */
  ciudades: string[]
  /** `ninguno` = ubicados fuera de todos los cuadrantes. */
  cuadrante: 'todos' | 'ninguno' | number
  ubicacion: EstadoUbicacion
}

export const SIN_FILTROS: FiltrosFacturas = {
  ciudades: [],
  cuadrante: 'todos',
  ubicacion: 'todas',
}

export const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim()

const claveCliente = (f: FacturaLogistica) => `${f.idtercero}:${f.id_sucursal}`

/** Ray casting sobre un anillo GeoJSON ([lon, lat]). */
function dentro(lat: number, lon: number, anillo: number[][]) {
  let adentro = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]
    const [xj, yj] = anillo[j]
    if (
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    )
      adentro = !adentro
  }
  return adentro
}

export function useFiltrosFacturas(
  co: string,
  facturas: FacturaLogistica[],
  cuadrantes: Cuadrante[]
) {
  const [filtros, setFiltros] = useState<FiltrosFacturas>(SIN_FILTROS)
  useEffect(() => setFiltros(SIN_FILTROS), [co])

  // Cuadrante de cada cliente (por su ubicación); los sin ubicar no tienen.
  const porCliente = useMemo(() => {
    const mapa = new Map<string, Cuadrante | null>()
    facturas.forEach(f => {
      const k = claveCliente(f)
      if (mapa.has(k)) return
      const u = f.ubicacion
      mapa.set(
        k,
        u
          ? (cuadrantes.find(c =>
              dentro(u.lat, u.lon, c.poligono.coordinates[0])
            ) ?? null)
          : null
      )
    })
    return mapa
  }, [facturas, cuadrantes])
  const cuadranteDe = (f: FacturaLogistica) =>
    porCliente.get(claveCliente(f)) ?? null

  const filtradas = useMemo(
    () =>
      facturas.filter(f => {
        if (
          filtros.ciudades.length &&
          !filtros.ciudades.includes(normalizar(f.ciudad || ''))
        )
          return false
        if (filtros.ubicacion === 'ubicadas' && !f.ubicacion) return false
        if (filtros.ubicacion === 'sin-ubicar' && f.ubicacion) return false
        if (filtros.cuadrante === 'todos') return true
        const c = porCliente.get(claveCliente(f)) ?? null
        return filtros.cuadrante === 'ninguno'
          ? !!f.ubicacion && !c
          : c?.id === filtros.cuadrante
      }),
    [facturas, filtros, porCliente]
  )

  const opciones = useMemo(() => {
    const clientes = new Map<string, FacturaLogistica>()
    facturas.forEach(f => clientes.set(claveCliente(f), f))
    const ciudades = new Map<string, { etiqueta: string; clientes: number }>()
    const porZona = new Map<number, number>()
    let fuera = 0
    let sinUbicar = 0
    clientes.forEach((f, k) => {
      const clave = normalizar(f.ciudad || '')
      const actual = ciudades.get(clave)
      ciudades.set(clave, {
        etiqueta: actual?.etiqueta || f.ciudad || 'Sin ciudad',
        clientes: (actual?.clientes || 0) + 1,
      })
      const c = porCliente.get(k) ?? null
      if (!f.ubicacion) sinUbicar++
      else if (!c) fuera++
      else porZona.set(c.id, (porZona.get(c.id) || 0) + 1)
    })
    return {
      ciudades: [...ciudades]
        .map(([clave, v]) => ({ clave, ...v }))
        .sort((a, b) => b.clientes - a.clientes),
      porZona,
      fuera,
      sinUbicar,
    }
  }, [facturas, porCliente])

  const activos =
    (filtros.ciudades.length ? 1 : 0) +
    (filtros.cuadrante !== 'todos' ? 1 : 0) +
    (filtros.ubicacion !== 'todas' ? 1 : 0)

  return {
    filtros,
    setFiltros,
    filtradas,
    opciones,
    cuadranteDe,
    activos,
    clientesFiltrados: new Set(filtradas.map(claveCliente)).size,
  }
}

export type FiltrosFacturasEstado = ReturnType<typeof useFiltrosFacturas>
