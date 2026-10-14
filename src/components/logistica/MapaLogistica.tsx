import 'leaflet/dist/leaflet.css'
import './logistica.css'
import L from 'leaflet'
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { useEffect } from 'react'
import type {
  Origen,
  FacturaLogistica,
  RutaPropuesta,
  RutaGuardada,
} from '@/api/logistica'
import { COLORES_RUTA } from './colores'

type Punto = {
  lat: number
  lon: number
  cliente: string
  direccion: string
  peso: number
  valor: number
  facturas: number
  precision: string
  numero?: number
  color: string
  /** `tercero:sucursal`, para seleccionar desde el mapa. */
  clave?: string
  marcado?: boolean
}
function icono(texto: string, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:${color};border:3px solid white;color:white;font-weight:bold;box-shadow:0 2px 8px #0006">${texto}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}
function Ajustar({
  puntos,
  clave,
}: {
  puntos: { lat: number; lon: number }[]
  clave: string
}) {
  const mapa = useMap()
  useEffect(() => {
    if (puntos.length)
      mapa.fitBounds(L.latLngBounds(puntos.map(p => [p.lat, p.lon])), {
        padding: [35, 35],
        maxZoom: 13,
      })
  }, [mapa, clave, puntos])
  return null
}
function CapturarClic({
  alClic,
}: {
  alClic?: (lat: number, lon: number) => void
}) {
  useMapEvents({ click: e => alClic?.(e.latlng.lat, e.latlng.lng) })
  return null
}
export function MapaLogistica({
  origen,
  facturas,
  rutas,
  guardadas,
  seleccionadas,
  alClic,
  alTocarCliente,
  resaltada = null,
  alResaltar,
  alto = 'h-[420px] lg:h-[650px]',
  clave,
}: {
  origen?: Origen
  facturas?: FacturaLogistica[]
  rutas?: RutaPropuesta[]
  guardadas?: RutaGuardada[]
  seleccionadas?: Set<number>
  alClic?: (lat: number, lon: number) => void
  /** Si viene, la ficha del cliente muestra «Agregar / Quitar». */
  alTocarCliente?: (clave: string) => void
  alto?: string
  /** Índice de la ruta resaltada; las demás se atenúan. */
  resaltada?: number | null
  alResaltar?: (indice: number | null) => void
  clave: string
}) {
  const puntos: Punto[] = []
  if (rutas?.length)
    rutas.forEach((r, i) =>
      r.paradas.forEach((p, n) =>
        puntos.push({
          lat: p.ubicacion.lat,
          lon: p.ubicacion.lon,
          cliente: p.cliente,
          direccion: p.direccion,
          peso: p.pesoKg,
          valor: p.valor,
          facturas: p.facturas.length,
          precision: p.ubicacion.precision,
          numero: n + 1,
          color: COLORES_RUTA[i % COLORES_RUTA.length],
        })
      )
    )
  else if (guardadas?.length)
    guardadas.forEach((r, i) =>
      r.paradas.forEach((p, n) =>
        puntos.push({
          lat: p.lat,
          lon: p.lon,
          cliente: p.cliente,
          direccion: '',
          peso: p.peso_kg,
          valor: p.facturas.reduce((s, f) => s + f.valor, 0),
          facturas: p.facturas.length,
          precision: '',
          numero: n + 1,
          color: COLORES_RUTA[i % COLORES_RUTA.length],
        })
      )
    )
  else {
    const grupos = new Map<string, FacturaLogistica[]>()
    facturas?.forEach(f => {
      const k = `${f.idtercero}:${f.id_sucursal}`
      grupos.set(k, [...(grupos.get(k) || []), f])
    })
    grupos.forEach((fs, k) => {
      const f = fs[0]
      const marcado = fs.some(x => seleccionadas?.has(x.rowid_sa))
      if (f.ubicacion)
        puntos.push({
          clave: k,
          marcado,
          lat: f.ubicacion.lat,
          lon: f.ubicacion.lon,
          cliente: f.razon,
          direccion: f.direccion,
          peso: fs.reduce((s, x) => s + x.peso_kg, 0),
          valor: fs.reduce((s, x) => s + x.valor, 0),
          facturas: fs.length,
          precision: f.ubicacion.precision,
          color: marcado ? '#1a73d9' : '#94a3b8',
        })
    })
  }
  const limites = [...(origen ? [origen] : []), ...puntos]
  const lienzos = (rutas || guardadas || []).map((r, i) => {
    const coords = (r.geometria?.coordinates || []).map(
      ([lon, lat]) => [lat, lon] as [number, number]
    )
    // cortes = [bodega, parada 1 … parada n, bodega]: la ida termina en la última parada.
    const cortes = r.geometria?.cortes
    const finIda =
      cortes && cortes.length >= 3
        ? cortes[cortes.length - 2]
        : coords.length - 1
    return {
      ida: coords.slice(0, finIda + 1),
      regreso: coords.slice(finIda),
      color: COLORES_RUTA[i % COLORES_RUTA.length],
      linea: r.fuente_ruteo === 'linea',
      placa: 'placa' in r ? r.placa : '',
    }
  })
  return (
    <div
      className={`relative ${alto} overflow-hidden rounded-2xl border ${alClic ? 'cursor-crosshair' : ''}`}
    >
      <MapContainer
        center={[4.65, -74.1]}
        zoom={6}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          className="tiles-logistica"
          url={
            import.meta.env.VITE_TILES_URL ||
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Ajustar puntos={limites} clave={clave} />
        <CapturarClic alClic={alClic} />
        {origen && (
          <Marker
            position={[origen.lat, origen.lon]}
            icon={icono('⌂', '#111827')}
          >
            <Popup>Origen: {origen.nombre}</Popup>
          </Marker>
        )}
        {puntos.map((p, i) => (
          <Marker
            key={`${p.cliente}-${i}`}
            position={[p.lat, p.lon]}
            icon={icono(String(p.numero || (p.marcado ? '✓' : '•')), p.color)}
          >
            <Popup>
              <strong>{p.cliente}</strong>
              <br />
              {p.direccion}
              <br />
              {p.facturas} facturas · {p.peso.toLocaleString('es-CO')} kg · $
              {p.valor.toLocaleString('es-CO')}
              <br />
              {p.precision}
              {alTocarCliente && p.clave && (
                <button
                  className={`mt-2 block w-full rounded-md px-3 py-1.5 text-sm font-semibold text-white ${p.marcado ? 'bg-slate-500' : 'bg-blue-600'}`}
                  onClick={() => alTocarCliente(p.clave!)}
                >
                  {p.marcado ? 'Quitar de la ruta' : 'Agregar a la ruta'}
                </button>
              )}
            </Popup>
          </Marker>
        ))}
        {lienzos.map((l, i) => {
          const tenue = resaltada != null && resaltada !== i
          const opacidad = tenue ? 0.2 : 1
          return [
            // Regreso a la bodega: punteado y más fino, para no confundirlo con la ida.
            <Polyline
              key={`r${i}`}
              positions={l.regreso}
              pathOptions={{
                color: l.color,
                weight: 3,
                opacity: opacidad * 0.55,
                dashArray: '6 8',
              }}
              eventHandlers={{ click: () => alResaltar?.(i) }}
            />,
            <Polyline
              key={`i${i}`}
              positions={l.ida}
              pathOptions={{
                color: l.color,
                weight: resaltada === i ? 7 : 5,
                opacity: opacidad,
                dashArray: l.linea ? '8 8' : undefined,
              }}
              eventHandlers={{ click: () => alResaltar?.(i) }}
            />,
          ]
        })}
      </MapContainer>
      {lienzos.length > 0 && (
        <div className="absolute right-3 top-3 z-[500] max-w-[55%] space-y-1 rounded-lg bg-card/90 p-2 text-xs shadow">
          {lienzos.map((l, i) => (
            <button
              key={i}
              className={`flex w-full items-center gap-2 text-left ${resaltada != null && resaltada !== i ? 'opacity-40' : ''}`}
              onClick={() => alResaltar?.(resaltada === i ? null : i)}
            >
              <span
                className="inline-block h-1.5 w-5 shrink-0 rounded-full"
                style={{ background: l.color }}
              />
              <span className="truncate">{l.placa || `Ruta ${i + 1}`}</span>
            </button>
          ))}
          <p className="border-t pt-1 text-[10px] text-muted-foreground">
            ━ ida · ┅ regreso a bodega
          </p>
        </div>
      )}
      {lienzos.some(l => l.linea) && (
        <span className="absolute bottom-4 left-4 z-[500] rounded-lg bg-card/90 px-2 py-1 text-xs">
          Ruta aproximada (línea punteada)
        </span>
      )}
      {alTocarCliente && !rutas?.length && (
        <span className="absolute bottom-4 left-4 z-[500] flex gap-3 rounded-lg bg-card/90 px-2 py-1 text-xs">
          <span>
            <span className="text-blue-600">●</span> elegido
          </span>
          <span>
            <span className="text-slate-400">●</span> sin elegir
          </span>
          <span>⌂ bodega</span>
        </span>
      )}
      {alClic && (
        <span className="absolute left-4 top-4 z-[500] rounded-lg bg-card p-2 text-sm shadow">
          Haga clic para fijar la ubicación
        </span>
      )}
    </div>
  )
}
