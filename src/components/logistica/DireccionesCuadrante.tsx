import { useEffect, useRef, useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { logisticaApi, type LugarEncontrado } from '@/api/logistica'

export interface PuntoFila {
  lat: number
  lon: number
  nombre?: string
}
export interface FilaDireccion {
  texto: string
  punto: PuntoFila | null
}

const MINIMO = 3
const MAXIMO = 6

/**
 * Direcciones de un cuadrante: cada fila se escribe y se elige entre las
 * sugerencias (cercanas a la bodega), o se marca directo en el mapa.
 */
export function DireccionesCuadrante({
  filas,
  cambiar,
  eligiendo,
  elegirEnMapa,
}: {
  filas: FilaDireccion[]
  cambiar: (filas: FilaDireccion[]) => void
  /** Fila que espera un clic en el mapa. */
  eligiendo: number | null
  elegirEnMapa: (fila: number | null) => void
}) {
  const [activa, setActiva] = useState<number | null>(null)
  const [sugerencias, setSugerencias] = useState<LugarEncontrado[]>([])
  const [buscando, setBuscando] = useState(false)
  const consulta = useRef(0)
  const textoActivo = activa !== null ? filas[activa]?.texto : ''
  const fijada = activa !== null ? !!filas[activa]?.punto : false

  // Sugerencias con espera: la geocodificación pública admite ~1 petición por segundo.
  useEffect(() => {
    const texto = (textoActivo || '').trim()
    if (activa === null || fijada || texto.length < 4) {
      setSugerencias([])
      setBuscando(false)
      return
    }
    const turno = ++consulta.current
    setBuscando(true)
    const espera = setTimeout(() => {
      logisticaApi
        .buscarDireccion(texto)
        .then(lista => {
          if (turno === consulta.current) setSugerencias(lista)
        })
        .catch(() => {
          if (turno === consulta.current) setSugerencias([])
        })
        .finally(() => {
          if (turno === consulta.current) setBuscando(false)
        })
    }, 500)
    return () => clearTimeout(espera)
  }, [textoActivo, activa, fijada])

  const actualizar = (i: number, fila: FilaDireccion) =>
    cambiar(filas.map((f, n) => (n === i ? fila : f)))
  const elegir = (i: number, lugar: LugarEncontrado) => {
    actualizar(i, {
      texto: lugar.nombre,
      punto: { lat: lugar.lat, lon: lugar.lon, nombre: lugar.nombre },
    })
    setSugerencias([])
  }
  const quitar = (i: number) => {
    if (eligiendo !== null) elegirEnMapa(null)
    cambiar(filas.filter((_, n) => n !== i))
  }
  const ubicadas = filas.filter(f => f.punto).length

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground">
        Escriba de {MINIMO} a {MAXIMO} direcciones o lugares y elija una
        sugerencia, o marque el punto en el mapa. El área se forma con los
        puntos ubicados ({ubicadas} de {filas.length}).
      </p>
      {filas.map((fila, i) => (
        <div key={i} className="relative">
          <div className="flex items-center gap-1">
            <input
              className={`min-w-0 flex-1 rounded-lg border bg-card p-2 ${fila.punto ? 'border-emerald-500/60' : ''}`}
              placeholder={`Dirección ${i + 1}`}
              value={fila.texto}
              onFocus={() => setActiva(i)}
              onBlur={() =>
                setTimeout(() => setActiva(a => (a === i ? null : a)), 150)
              }
              onChange={e =>
                actualizar(i, { texto: e.target.value, punto: null })
              }
            />
            <button
              type="button"
              title="Elegir el punto en el mapa"
              aria-label={`Elegir en el mapa la dirección ${i + 1}`}
              onClick={() => elegirEnMapa(eligiendo === i ? null : i)}
              className={`shrink-0 rounded-lg border p-2 ${eligiendo === i ? 'border-primary bg-primary text-primary-foreground' : fila.punto ? 'border-emerald-500/60 text-emerald-600' : ''}`}
            >
              <MapPin className="size-4" />
            </button>
            {filas.length > MINIMO && (
              <button
                type="button"
                title="Quitar dirección"
                aria-label={`Quitar dirección ${i + 1}`}
                onClick={() => quitar(i)}
                className="shrink-0 rounded-lg border p-2 text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {eligiendo === i && (
            <p className="mt-1 text-xs text-primary">
              Haga clic en el mapa para marcar esta dirección.
            </p>
          )}
          {activa === i &&
            !fila.punto &&
            (buscando || sugerencias.length > 0) && (
              <ul className="absolute z-[1000] mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-card shadow-lg">
                {buscando && !sugerencias.length && (
                  <li className="p-2 text-xs text-muted-foreground">
                    Buscando…
                  </li>
                )}
                {sugerencias.map((s, n) => (
                  <li key={`${s.lat},${s.lon},${n}`}>
                    <button
                      type="button"
                      // mouseDown corre antes del blur del input y evita que se cierre la lista.
                      onMouseDown={e => {
                        e.preventDefault()
                        elegir(i, s)
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-muted"
                    >
                      {s.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      ))}
      <button
        type="button"
        disabled={filas.length >= MAXIMO}
        onClick={() => cambiar([...filas, { texto: '', punto: null }])}
        className="rounded-lg border px-3 py-1.5 disabled:opacity-50"
      >
        Agregar dirección
      </button>
    </div>
  )
}
