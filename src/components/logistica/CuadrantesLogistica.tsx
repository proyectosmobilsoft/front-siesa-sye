import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  logisticaApi,
  type Cuadrante,
  type PoligonoCuadrante,
  type Recursos,
} from '@/api/logistica'
import { useCuadrantesLogistica, useFacturasCuadrante } from './useLogistica'
import { MapaCuadrantes } from './MapaCuadrantes'
import {
  DireccionesCuadrante,
  type FilaDireccion,
} from './DireccionesCuadrante'
import { Cargando } from '@/components/ui/cargando'

type Punto = { lat: number; lon: number; nombre?: string }
const filasVacias = (): FilaDireccion[] =>
  Array.from({ length: 3 }, () => ({ texto: '', punto: null }))
const forma = (puntos: Punto[]): PoligonoCuadrante | null => {
  const orden = [
    ...new Map(puntos.map(p => [`${p.lon},${p.lat}`, [p.lon, p.lat]])).values(),
  ].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (orden.length < 3) return null
  const cruz = (a: number[], b: number[], c: number[]) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const mitad = (lista: number[][]) => {
    const salida: number[][] = []
    lista.forEach(p => {
      while (
        salida.length > 1 &&
        cruz(salida[salida.length - 2], salida[salida.length - 1], p) <= 0
      )
        salida.pop()
      salida.push(p)
    })
    return salida
  }
  const anillo = [
    ...mitad(orden).slice(0, -1),
    ...mitad(orden.reverse()).slice(0, -1),
  ]
  return anillo.length < 3
    ? null
    : { type: 'Polygon', coordinates: [[...anillo, anillo[0]]] }
}
const desdeAnillo = (poligono: PoligonoCuadrante) =>
  poligono.coordinates[0].slice(0, -1).map(([lon, lat]) => ({ lat, lon }))
const dinero = (n: number) => `$${n.toLocaleString('es-CO')}`
type Coordenada = [number, number]
type Fuente = 'calles' | 'osrm' | 'linea'
const unir = (tramos: Coordenada[][]) => {
  const salida: Coordenada[] = []
  tramos.forEach(tramo =>
    tramo.forEach(p => {
      const anterior = salida[salida.length - 1]
      if (!anterior || p[0] !== anterior[0] || p[1] !== anterior[1])
        salida.push(p)
    })
  )
  return salida
}
const tramosRectos = (lista: Punto[]): Coordenada[][] =>
  lista.map((p, i) =>
    i
      ? [
          [lista[i - 1].lon, lista[i - 1].lat],
          [p.lon, p.lat],
        ]
      : [[p.lon, p.lat]]
  )

export function CuadrantesLogistica({
  co,
  recursos,
}: {
  co: string | null
  recursos?: Recursos
}) {
  const qc = useQueryClient()
  const zonasQ = useCuadrantesLogistica(co)
  const [elegido, setElegido] = useState<number | null>(null)
  const facturasQ = useFacturasCuadrante(elegido)
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState('#2563eb')
  const [origen, setOrigen] = useState<'DIRECCIONES' | 'DIBUJO'>('DIRECCIONES')
  const [filas, setFilas] = useState<FilaDireccion[]>(filasVacias)
  const [eligiendo, setEligiendo] = useState<number | null>(null)
  const [puntos, setPuntos] = useState<Punto[]>([])
  const [tramos, setTramos] = useState<Coordenada[][]>([])
  const [fuentes, setFuentes] = useState<Fuente[]>([])
  const clicEnVuelo = useRef(false)
  const [borrador, setBorrador] = useState<PoligonoCuadrante | null>(null)
  const [requierePoligono, setRequierePoligono] = useState(false)
  const [dibujando, setDibujando] = useState(false)
  const [ajustar, setAjustar] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const zonas = zonasQ.data?.filter(z => z.id_co === co) || []
  const origenMapa = recursos?.origenes.find(o => o.id_co === co)

  const seleccionar = (z: Cuadrante) => {
    setElegido(z.id)
    setNombre(z.nombre)
    setColor(z.color || '#2563eb')
    setOrigen(z.origen)
    setBorrador(null)
    setRequierePoligono(false)
    setPuntos([])
    setTramos([])
    setFuentes([])
    setEligiendo(null)
    setDibujando(false)
    setMensaje('')
  }
  const nuevo = () => {
    setElegido(null)
    setNombre('')
    setColor('#2563eb')
    setOrigen('DIRECCIONES')
    setFilas(filasVacias())
    setEligiendo(null)
    setPuntos([])
    setTramos([])
    setFuentes([])
    setBorrador(null)
    setRequierePoligono(false)
    setDibujando(false)
    setMensaje('')
  }
  // El área de «Por direcciones» es la envolvente de los puntos ya ubicados.
  const cambiarFilas = (siguientes: FilaDireccion[]) => {
    const ubicados = siguientes.flatMap(f => (f.punto ? [f.punto] : []))
    setFilas(siguientes)
    setPuntos(ubicados)
    setBorrador(forma(ubicados))
    setRequierePoligono(true)
    setMensaje('')
  }
  const ubicarEnMapa = (p: Punto) => {
    if (eligiendo === null) return
    const fila = filas[eligiendo]
    setEligiendo(null)
    cambiarFilas(
      filas.map((f, n) =>
        n === eligiendo
          ? {
              texto: fila.texto.trim() || 'Punto en el mapa',
              punto: { lat: p.lat, lon: p.lon, nombre: 'Punto en el mapa' },
            }
          : f
      )
    )
  }
  const empezarDibujo = () => {
    setOrigen('DIBUJO')
    setEligiendo(null)
    const iniciales = borrador
      ? desdeAnillo(borrador)
      : elegido
        ? desdeAnillo(zonas.find(z => z.id === elegido)!.poligono)
        : []
    setPuntos(iniciales)
    setTramos(tramosRectos(iniciales))
    setFuentes(iniciales.map(() => 'linea'))
    setBorrador(null)
    setRequierePoligono(true)
    setDibujando(true)
    setMensaje(
      'Haga clic en el mapa para agregar vértices. Puede arrastrarlo para desplazarse.'
    )
  }
  const agregarVertice = async (p: Punto) => {
    if (ocupado || clicEnVuelo.current || puntos.length >= 200) return
    clicEnVuelo.current = true
    setOcupado(true)
    try {
      const anterior = puntos[puntos.length - 1] || null
      const resultado = ajustar
        ? await logisticaApi.tramoACalle(anterior, p)
        : {
            punto: p,
            coordenadas: anterior
              ? ([
                  [anterior.lon, anterior.lat],
                  [p.lon, p.lat],
                ] as Coordenada[])
              : ([[p.lon, p.lat]] as Coordenada[]),
            fuente: 'linea' as Fuente,
          }
      setPuntos(actual => [...actual, resultado.punto])
      setTramos(actual => [...actual, resultado.coordenadas])
      setFuentes(actual => [...actual, resultado.fuente])
      if (ajustar && resultado.fuente !== 'calles')
        setMensaje(
          `Sin calles locales aquí; usando ${resultado.fuente === 'osrm' ? 'ruta de OSRM' : 'línea recta'}.`
        )
      else setMensaje('')
    } catch {
      const anterior = puntos[puntos.length - 1]
      setPuntos(actual => [...actual, p])
      setTramos(actual => [
        ...actual,
        anterior
          ? [
              [anterior.lon, anterior.lat],
              [p.lon, p.lat],
            ]
          : [[p.lon, p.lat]],
      ])
      setFuentes(actual => [...actual, 'linea'])
      setMensaje('Sin calles locales aquí; usando línea recta.')
    } finally {
      clicEnVuelo.current = false
      setOcupado(false)
    }
  }
  const cerrar = async () => {
    if (ocupado || clicEnVuelo.current) return
    if (puntos.length < 3) {
      setMensaje('Agregue al menos tres vértices.')
      return
    }
    const ultimo = puntos[puntos.length - 1]
    let cierre: Coordenada[] = [
      [ultimo.lon, ultimo.lat],
      [puntos[0].lon, puntos[0].lat],
    ]
    let fuenteCierre: Fuente = 'linea'
    let aviso = 'Polígono listo para guardar.'
    if (ajustar) {
      try {
        setOcupado(true)
        setMensaje('Cerrando por las calles…')
        const resultado = await logisticaApi.tramoACalle(ultimo, puntos[0])
        cierre = resultado.coordenadas
        fuenteCierre = resultado.fuente
      } catch {
        fuenteCierre = 'linea'
      } finally {
        setOcupado(false)
      }
      const usadas = [...fuentes, fuenteCierre]
      aviso = usadas.includes('linea')
        ? 'No se pudo seguir las calles en todo el recorrido; se usó línea recta.'
        : usadas.includes('osrm')
          ? 'Ajustado con OSRM (aproximado).'
          : 'Polígono ajustado a las calles.'
    }
    const recorrido = unir([...tramos, cierre])
    const primero: Coordenada = [puntos[0].lon, puntos[0].lat]
    const final = recorrido[recorrido.length - 1]
    if (final?.[0] !== primero[0] || final?.[1] !== primero[1])
      recorrido.push(primero)
    const paso = Math.ceil((recorrido.length - 1) / 1500)
    const anillo =
      paso > 1
        ? [...recorrido.slice(0, -1).filter((_, i) => i % paso === 0), primero]
        : recorrido
    const poligono: PoligonoCuadrante = {
      type: 'Polygon',
      coordinates: [anillo],
    }
    setBorrador(poligono)
    setDibujando(false)
    setMensaje(aviso)
  }
  const guardar = async () => {
    const poligono =
      borrador ||
      (!requierePoligono && elegido
        ? zonas.find(z => z.id === elegido)?.poligono
        : null)
    if (!co || !poligono || !nombre.trim()) return
    try {
      setOcupado(true)
      setMensaje('')
      const datos = { idCo: co, nombre: nombre.trim(), color, origen, poligono }
      const guardado = elegido
        ? await logisticaApi.actualizarCuadrante(elegido, datos)
        : await logisticaApi.crearCuadrante(datos)
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['logistica', 'cuadrantes'] }),
        qc.invalidateQueries({ queryKey: ['logistica', 'cuadrante-facturas'] }),
      ])
      setElegido(guardado.id)
      setBorrador(null)
      setRequierePoligono(false)
      setPuntos([])
      setTramos([])
      setFuentes([])
      setDibujando(false)
      setMensaje('Cuadrante guardado.')
    } catch (e) {
      setMensaje(
        e instanceof Error ? e.message : 'No se pudo guardar el cuadrante'
      )
    } finally {
      setOcupado(false)
    }
  }
  const desactivar = async () => {
    if (!elegido) return
    try {
      setOcupado(true)
      await logisticaApi.desactivarCuadrante(elegido)
      await qc.invalidateQueries({ queryKey: ['logistica', 'cuadrantes'] })
      nuevo()
      setMensaje('Cuadrante desactivado.')
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo desactivar')
    } finally {
      setOcupado(false)
    }
  }
  const resumen = facturasQ.data
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(320px,410px)_1fr]">
      <div className="space-y-4">
        <section className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Cuadrantes · C.O. {co}</h2>
            <button
              className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              onClick={nuevo}
            >
              Nuevo
            </button>
          </div>
          {zonasQ.isLoading && <Cargando compacto texto="Cargando cuadrantes" />}
          {zonasQ.isError && (
            <p role="alert" className="text-sm text-destructive">
              No se pudieron cargar los cuadrantes.
            </p>
          )}
          {!zonas.length && !zonasQ.isLoading && (
            <p className="mt-2 text-sm text-muted-foreground">
              Aún no hay cuadrantes en este C.O.
            </p>
          )}
          <div className="mt-3 space-y-1">
            {zonas.map(z => (
              <button
                key={z.id}
                onClick={() => seleccionar(z)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${elegido === z.id ? 'border-primary font-semibold' : ''}`}
              >
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ background: z.color }}
                />
                {z.nombre}
              </button>
            ))}
          </div>
        </section>
        <section className="space-y-3 rounded-xl border bg-card p-4 text-sm">
          <h2 className="font-semibold">
            {elegido ? 'Editar cuadrante' : 'Nuevo cuadrante'}
          </h2>
          <label className="block">
            Nombre
            <input
              className="mt-1 w-full rounded-lg border bg-card p-2"
              maxLength={100}
              value={nombre}
              onChange={e => setNombre(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-3">
            Color
            <input
              type="color"
              value={color.slice(0, 7)}
              onChange={e => setColor(e.target.value)}
              aria-label="Color del cuadrante"
            />
          </label>
          <div className="flex gap-2">
            <button
              className={`rounded-lg border px-3 py-1.5 ${origen === 'DIRECCIONES' ? 'border-primary' : ''}`}
              onClick={() => {
                if (origen !== 'DIRECCIONES') {
                  setBorrador(null)
                  setRequierePoligono(true)
                }
                setOrigen('DIRECCIONES')
                setDibujando(false)
              }}
            >
              Por direcciones
            </button>
            <button
              className={`rounded-lg border px-3 py-1.5 ${origen === 'DIBUJO' ? 'border-primary' : ''}`}
              onClick={empezarDibujo}
            >
              Dibujar en mapa
            </button>
          </div>
          {origen === 'DIRECCIONES' && (
            <DireccionesCuadrante
              filas={filas}
              cambiar={cambiarFilas}
              eligiendo={eligiendo}
              elegirEnMapa={setEligiendo}
            />
          )}
          {origen === 'DIBUJO' && (
            <div className="space-y-2">
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={ajustar}
                  onChange={e => setAjustar(e.target.checked)}
                />
                Ajustar a la calle más cercana
              </label>
              <p>
                {dibujando
                  ? ocupado
                    ? `${puntos.length} vértices. Trazando tramo…`
                    : `${puntos.length} vértices. Haga clic en el mapa.`
                  : 'Inicie el dibujo para reemplazar el polígono.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={empezarDibujo}
                  className="rounded-lg border px-3 py-1.5"
                >
                  {dibujando ? 'Reiniciar dibujo' : 'Dibujar'}
                </button>
                <button
                  disabled={!dibujando || !puntos.length || ocupado}
                  onClick={() => {
                    setPuntos(puntos.slice(0, -1))
                    setTramos(tramos.slice(0, -1))
                    setFuentes(fuentes.slice(0, -1))
                  }}
                  className="rounded-lg border px-3 py-1.5 disabled:opacity-50"
                >
                  Deshacer último
                </button>
                <button
                  disabled={!dibujando || ocupado}
                  onClick={() => {
                    setPuntos([])
                    setTramos([])
                    setFuentes([])
                  }}
                  className="rounded-lg border px-3 py-1.5 disabled:opacity-50"
                >
                  Limpiar
                </button>
                <button
                  disabled={!dibujando || puntos.length < 3 || ocupado}
                  onClick={() => void cerrar()}
                  className="rounded-lg border px-3 py-1.5 disabled:opacity-50"
                >
                  Cerrar polígono
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              disabled={
                ocupado ||
                !co ||
                !nombre.trim() ||
                (!borrador && (!elegido || requierePoligono)) ||
                dibujando
              }
              onClick={() => void guardar()}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            >
              Guardar cuadrante
            </button>
            {elegido && (
              <button
                disabled={ocupado}
                onClick={() => void desactivar()}
                className="rounded-lg border px-3 py-2 text-destructive disabled:opacity-50"
              >
                Desactivar
              </button>
            )}
          </div>
          {mensaje && <p role="status">{mensaje}</p>}
        </section>
        {elegido && (
          <section className="rounded-xl border bg-card p-4 text-sm">
            <h2 className="font-semibold">
              Facturas pendientes dentro del cuadrante
            </h2>
            {facturasQ.isLoading && <Cargando compacto texto="Cargando facturas" />}
            {facturasQ.isError && (
              <p role="alert">No se pudieron cargar las facturas.</p>
            )}
            {resumen && (
              <>
                <p className="mt-2">
                  {resumen.totales.clientes} clientes ·{' '}
                  {resumen.totales.facturas} facturas ·{' '}
                  {resumen.totales.kg.toLocaleString('es-CO')} kg ·{' '}
                  {dinero(resumen.totales.valor)}
                </p>
                <p className="text-muted-foreground">
                  {resumen.sinUbicacion} clientes sin ubicación ·{' '}
                  {resumen.sinCuadrante} fuera de todos los cuadrantes
                </p>
                <div className="mt-2 divide-y">
                  {resumen.clientes.map(c => (
                    <details
                      key={`${c.idtercero}:${c.id_sucursal}`}
                      className="py-2"
                    >
                      <summary className="cursor-pointer">
                        <strong>{c.razon}</strong> · NIT {c.nit}
                        <br />
                        {c.numeroFacturas} facturas ·{' '}
                        {c.kg.toLocaleString('es-CO')} kg · {dinero(c.valor)}
                      </summary>
                      <ul className="ml-4 mt-1 list-disc">
                        {c.facturas.map(f => (
                          <li key={f.rowid_sa}>
                            {f.prefijo}-{f.numero} ·{' '}
                            {f.peso_kg.toLocaleString('es-CO')} kg ·{' '}
                            {dinero(f.valor)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
      <MapaCuadrantes
        origen={origenMapa}
        cuadrantes={zonas}
        elegido={elegido}
        borrador={borrador}
        puntos={puntos}
        trazo={unir(tramos).map(([lon, lat]) => [lat, lon])}
        dibujando={dibujando || eligiendo !== null}
        alClic={p =>
          eligiendo !== null ? ubicarEnMapa(p) : void agregarVertice(p)
        }
        alElegir={id => {
          const z = zonas.find(x => x.id === id)
          if (z) seleccionar(z)
        }}
      />
    </div>
  )
}
