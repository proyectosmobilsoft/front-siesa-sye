import 'leaflet/dist/leaflet.css'
import './logistica.css'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { Circle, CircleMarker, MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Cuadrante, ReciboUbicacion } from '@/api/logistica'

type ReciboConPunto = ReciboUbicacion & { ubicacion: NonNullable<ReciboUbicacion['ubicacion']> }

const posiciones = (c: Cuadrante) =>
  c.poligono.coordinates[0].map(([lon, lat]) => [lat, lon] as [number, number])

function Centro({ recibos, elegido }: { recibos: ReciboConPunto[]; elegido: ReciboConPunto | undefined }) {
  const mapa = useMap()
  useEffect(() => {
    if (elegido) {
      mapa.flyTo([elegido.ubicacion.lat, elegido.ubicacion.lon], 17, { duration: 0.7 })
    } else if (recibos.length) {
      mapa.fitBounds(L.latLngBounds(recibos.map(r => [r.ubicacion.lat, r.ubicacion.lon])), {
        padding: [36, 36], maxZoom: 15,
      })
    } else {
      mapa.setView([10.9685, -74.7813], 11)
    }
  }, [mapa, recibos, elegido])
  return null
}

function PuntoElegido({ recibo }: { recibo: ReciboConPunto }) {
  const marcador = useRef<L.Marker>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => marcador.current?.openPopup(), 750)
    return () => window.clearTimeout(timer)
  }, [recibo.rowid_rc])
  const { ubicacion } = recibo
  const hora = recibo.fecha?.slice(11, 16) || '—'
  return <>
    {ubicacion.precision_m != null && ubicacion.precision_m > 0 &&
      <Circle center={[ubicacion.lat, ubicacion.lon]} radius={ubicacion.precision_m}
        pathOptions={{ color: 'hsl(var(--primary))', fillColor: 'hsl(var(--primary))', fillOpacity: 0.13, weight: 1 }} />}
    <Marker ref={marcador} position={[ubicacion.lat, ubicacion.lon]}
      icon={L.divIcon({ className: 'rc-marker-pulse', html: '<span></span>', iconSize: [20, 20], iconAnchor: [10, 10] })}>
      <Popup>
        <div className="space-y-1 text-sm">
          <strong>RC {recibo.id_co}-{recibo.numero_rc} se hizo aquí</strong>
          <div>{recibo.cliente} · {hora}</div>
          {ubicacion.precision_m != null && <div>Precisión ±{Math.round(ubicacion.precision_m)} m</div>}
          {ubicacion.fuente === 'ULTIMA_CONOCIDA' &&
            <div className="rounded bg-amber-100 px-2 py-1 text-amber-900">Ubicación aproximada: última conocida del celular</div>}
          {ubicacion.simulada &&
            <div className="rounded bg-amber-100 px-2 py-1 text-amber-900">El celular reportó ubicación simulada</div>}
        </div>
      </Popup>
    </Marker>
  </>
}

export function MapaUbicacionRc({ cuadrantes, recibos, seleccionado, onSeleccionar }: {
  cuadrantes: Cuadrante[]
  recibos: ReciboConPunto[]
  seleccionado: number | null
  onSeleccionar: (rowid: number) => void
}) {
  const elegido = recibos.find(r => r.rowid_rc === seleccionado)
  return <div className="h-[380px] overflow-hidden rounded-2xl border border-border lg:h-full">
    <MapContainer center={[10.9685, -74.7813]} zoom={11} scrollWheelZoom className="h-full w-full">
      <TileLayer className="tiles-logistica"
        url={import.meta.env.VITE_TILES_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      <Centro recibos={recibos} elegido={elegido} />
      {cuadrantes.map(c => <Polygon key={c.id} positions={posiciones(c)}
        bubblingMouseEvents={false}
        pathOptions={{ color: c.color, fillColor: c.color, fillOpacity: 0.08, weight: 1 }}>
        <Tooltip sticky>{c.nombre}</Tooltip>
      </Polygon>)}
      {recibos.filter(r => r.rowid_rc !== elegido?.rowid_rc).map(r =>
        <CircleMarker key={r.rowid_rc} center={[r.ubicacion.lat, r.ubicacion.lon]} radius={7}
          pathOptions={{ color: 'hsl(var(--primary))', fillColor: 'hsl(var(--primary))', fillOpacity: 0.8, weight: 2 }}
          eventHandlers={{ click: () => onSeleccionar(r.rowid_rc) }}>
          <Tooltip>RC {r.id_co}-{r.numero_rc} · {r.cliente}</Tooltip>
        </CircleMarker>)}
      {elegido && <PuntoElegido key={elegido.rowid_rc} recibo={elegido} />}
    </MapContainer>
  </div>
}
