import 'leaflet/dist/leaflet.css'
import './logistica.css'
import { useEffect } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { Cuadrante, Origen, PoligonoCuadrante } from '@/api/logistica'

type Punto = { lat: number; lon: number; nombre?: string }
const posiciones = (p: PoligonoCuadrante) =>
  p.coordinates[0].map(([lon, lat]) => [lat, lon] as [number, number])

function Centro({
  origen,
  poligono,
}: {
  origen?: Origen
  poligono?: PoligonoCuadrante | null
}) {
  const mapa = useMap()
  useEffect(() => {
    if (poligono)
      mapa.fitBounds(L.latLngBounds(posiciones(poligono)), {
        padding: [30, 30],
        maxZoom: 14,
      })
    else mapa.setView([origen?.lat ?? 10.9685, origen?.lon ?? -74.7813], 11)
  }, [mapa, origen?.lat, origen?.lon, poligono])
  return null
}
function Captura({
  activa,
  alClic,
}: {
  activa: boolean
  alClic: (p: Punto) => void
}) {
  useMapEvents({
    click: e => {
      if (activa) alClic({ lat: e.latlng.lat, lon: e.latlng.lng })
    },
  })
  return null
}
export function MapaCuadrantes({
  origen,
  cuadrantes,
  elegido,
  borrador,
  puntos,
  trazo,
  dibujando,
  alClic,
  alElegir,
}: {
  origen?: Origen
  cuadrantes: Cuadrante[]
  elegido: number | null
  borrador: PoligonoCuadrante | null
  puntos: Punto[]
  trazo: [number, number][]
  dibujando: boolean
  alClic: (p: Punto) => void
  alElegir: (id: number) => void
}) {
  const seleccionado = cuadrantes.find(c => c.id === elegido)
  return (
    <div className="h-[460px] overflow-hidden rounded-2xl border lg:h-[700px]">
      <MapContainer
        center={[origen?.lat ?? 10.9685, origen?.lon ?? -74.7813]}
        zoom={11}
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
        <Centro origen={origen} poligono={borrador || seleccionado?.poligono} />
        <Captura activa={dibujando} alClic={alClic} />
        {cuadrantes.map(c => (
          <Polygon
            key={c.id}
            positions={posiciones(c.poligono)}
            pathOptions={{
              color: c.color,
              fillColor: c.color,
              fillOpacity: elegido === c.id ? 0.3 : 0.14,
              weight: elegido === c.id ? 4 : 2,
            }}
            eventHandlers={{
              click: e => {
                L.DomEvent.stopPropagation(e)
                if (dibujando) alClic({ lat: e.latlng.lat, lon: e.latlng.lng })
                else alElegir(c.id)
              },
            }}
          >
            <Popup>
              {c.nombre} · C.O. {c.id_co}
            </Popup>
          </Polygon>
        ))}
        {borrador && (
          <Polygon
            positions={posiciones(borrador)}
            pathOptions={{ color: '#0ea5e9', fillOpacity: 0.25, weight: 3 }}
          />
        )}
        {dibujando && trazo.length > 1 && (
          <Polyline
            positions={trazo}
            pathOptions={{ color: '#0ea5e9', weight: 3 }}
          />
        )}
        {puntos.map((p, i) => (
          <Marker
            key={`${i}-${p.lat}-${p.lon}`}
            position={[p.lat, p.lon]}
            icon={L.divIcon({
              className: '',
              html: `<div style="background:#0284c7;color:white;border:2px solid white;border-radius:50%;width:25px;height:25px;text-align:center">${i + 1}</div>`,
              iconSize: [25, 25],
            })}
          >
            <Popup>{p.nombre || `Vértice ${i + 1}`}</Popup>
          </Marker>
        ))}
        {origen && (
          <Marker
            position={[origen.lat, origen.lon]}
            icon={L.divIcon({
              className: '',
              html: '<div style="font-size:24px">⌂</div>',
              iconSize: [28, 28],
            })}
          >
            <Popup>Bodega: {origen.nombre}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
