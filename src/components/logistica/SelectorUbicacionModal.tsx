import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { Loader2, Search } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { logisticaApi, type LugarEncontrado } from '@/api/logistica'

const TILES =
  import.meta.env.VITE_TILES_URL ||
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
// Barranquilla: centro por defecto si el C.O. aún no tiene bodega.
const CENTRO_DEFECTO = { lat: 10.9685, lon: -74.7813 }

const pin = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#d33a3a;border:3px solid white;transform:rotate(-45deg);box-shadow:0 2px 8px #0006"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
})

export type Punto = { lat: number; lon: number }

function Centrar({ punto }: { punto: Punto | null }) {
  const mapa = useMap()
  useEffect(() => {
    if (punto)
      mapa.setView([punto.lat, punto.lon], Math.max(mapa.getZoom(), 16))
  }, [mapa, punto])
  return null
}
function Clic({ alClic }: { alClic: (p: Punto) => void }) {
  useMapEvents({ click: e => alClic({ lat: e.latlng.lat, lon: e.latlng.lng }) })
  return null
}

/**
 * Elegir un punto en el mapa: se busca por dirección o nombre de lugar, se
 * elige un candidato y se ajusta el pin tocando el mapa o arrastrándolo.
 * Sirve para ubicar clientes y para marcar la bodega de salida (`conNombre`).
 */
export function SelectorUbicacionModal({
  abierto,
  titulo,
  detalle,
  textoInicial,
  puntoInicial,
  centro,
  conNombre,
  nombreInicial,
  textoGuardar = 'Guardar ubicación',
  onClose,
  onGuardar,
}: {
  abierto: boolean
  titulo: string
  detalle?: string
  textoInicial?: string
  puntoInicial?: Punto | null
  centro?: Punto | null
  conNombre?: boolean
  nombreInicial?: string
  textoGuardar?: string
  onClose: () => void
  onGuardar: (punto: Punto, nombre: string) => Promise<void> | void
}) {
  const [texto, setTexto] = useState(''),
    [nombre, setNombre] = useState(''),
    [resultados, setResultados] = useState<LugarEncontrado[] | null>(null),
    [punto, setPunto] = useState<Punto | null>(null),
    [buscando, setBuscando] = useState(false),
    [guardando, setGuardando] = useState(false),
    [error, setError] = useState('')

  useEffect(() => {
    if (!abierto) return
    setTexto(textoInicial || '')
    setNombre(nombreInicial || '')
    setResultados(null)
    setError('')
    setPunto(puntoInicial || null)
    // Solo al abrir: después manda lo que el usuario toque.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  const inicio = useMemo<Punto>(
    () => punto || centro || CENTRO_DEFECTO,
    // El centro inicial solo depende de la apertura, no de cada clic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [abierto]
  )

  const buscar = async () => {
    if (texto.trim().length < 3) return
    try {
      setBuscando(true)
      setError('')
      const lista = await logisticaApi.buscarDireccion(texto.trim())
      setResultados(lista)
      if (lista[0]) setPunto({ lat: lista[0].lat, lon: lista[0].lon })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo buscar')
    } finally {
      setBuscando(false)
    }
  }

  const guardar = async () => {
    if (!punto || (conNombre && !nombre.trim())) return
    try {
      setGuardando(true)
      setError('')
      await onGuardar(punto, nombre.trim())
      onClose()
    } catch (e) {
      const r = (e as { response?: { data?: { message?: string } } })?.response
      setError(
        r?.data?.message ||
          (e instanceof Error ? e.message : 'No se pudo guardar')
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      isOpen={abierto}
      onClose={onClose}
      title={titulo}
      className="max-w-2xl"
    >
      <div className="space-y-3 text-sm">
        {detalle && <p className="text-muted-foreground">{detalle}</p>}
        {conNombre && (
          <input
            className="w-full rounded-lg border bg-card p-2"
            placeholder="Nombre (ej. Bodega principal)"
            maxLength={100}
            value={nombre}
            onChange={e => setNombre(e.target.value)}
          />
        )}
        <form
          className="flex gap-2"
          onSubmit={e => {
            e.preventDefault()
            void buscar()
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-lg border bg-card p-2"
            placeholder="Dirección o lugar (ej. Carrera 54 # 68-196, Barranquilla)"
            value={texto}
            onChange={e => setTexto(e.target.value)}
          />
          <button
            type="submit"
            disabled={buscando || texto.trim().length < 3}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50"
          >
            {buscando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Buscar
          </button>
        </form>

        {resultados && resultados.length === 0 && (
          <p className="text-amber-600">
            Sin resultados. Pruebe con otra forma de la dirección, un lugar
            cercano o toque el mapa directamente.
          </p>
        )}
        {resultados && resultados.length > 0 && (
          <ul className="max-h-36 divide-y overflow-y-auto rounded-lg border">
            {resultados.map((r, i) => {
              const activo = punto?.lat === r.lat && punto?.lon === r.lon
              return (
                <li key={`${r.lat},${r.lon},${i}`}>
                  <button
                    className={`w-full px-3 py-2 text-left text-xs ${activo ? 'bg-primary/10 font-medium' : ''}`}
                    onClick={() => setPunto({ lat: r.lat, lon: r.lon })}
                  >
                    {r.nombre}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          {punto
            ? 'Toque el mapa o arrastre el pin para ajustar la ubicación exacta.'
            : 'Busque arriba o toque el mapa para poner el pin.'}
        </p>
        <div className="h-72 overflow-hidden rounded-xl border sm:h-80">
          {abierto && (
            <MapContainer
              center={[inicio.lat, inicio.lon]}
              zoom={punto ? 16 : 13}
              className="h-full w-full"
            >
              <TileLayer
                url={TILES}
                attribution="&copy; OpenStreetMap contributors"
              />
              <Clic alClic={setPunto} />
              <Centrar punto={punto} />
              {punto && (
                <Marker
                  position={[punto.lat, punto.lon]}
                  icon={pin}
                  draggable
                  eventHandlers={{
                    dragend: e => {
                      const p = (e.target as L.Marker).getLatLng()
                      setPunto({ lat: p.lat, lon: p.lng })
                    },
                  }}
                />
              )}
            </MapContainer>
          )}
        </div>

        {error && <p className="text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="rounded-lg border px-4 py-2" onClick={onClose}>
            Cancelar
          </button>
          <button
            disabled={!punto || guardando || (conNombre && !nombre.trim())}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            onClick={guardar}
          >
            {guardando ? 'Guardando…' : textoGuardar}
          </button>
        </div>
      </div>
    </Modal>
  )
}
