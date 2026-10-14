import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Truck,
  Wand2,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatters } from '@/utils/formatters'
import { Encabezado } from '@/components/tablero/comun'
import { Modal } from '@/components/ui/modal'
import {
  logisticaApi,
  type FacturaLogistica,
  type Propuesta,
  type SolicitudPlan,
} from '@/api/logistica'
import {
  useFacturasLogistica,
  useRecursosLogistica,
} from '@/components/logistica/useLogistica'
import { PanelFacturas } from '@/components/logistica/PanelFacturas'
import { PanelManual } from '@/components/logistica/PanelManual'
import { PanelAutomatico } from '@/components/logistica/PanelAutomatico'
import {
  elegidosPorDefecto,
  type ElegidosAuto,
} from '@/components/logistica/elegidosAuto'
import { TarjetaRuta } from '@/components/logistica/TarjetaRuta'
import { MapaLogistica } from '@/components/logistica/MapaLogistica'
import { RutasDelDia } from '@/components/logistica/RutasDelDia'
import { KpisLogistica } from '@/components/logistica/KpisLogistica'
import { ConfiguracionLogistica } from '@/components/logistica/ConfiguracionLogistica'
import { Transicion3D } from '@/components/logistica/Transicion3D'
import { COLORES_RUTA } from '@/components/logistica/colores'
import { SelectorUbicacionModal } from '@/components/logistica/SelectorUbicacionModal'
const CENTROS_LOGISTICA = ['001', '002']
function errorTexto(e: unknown) {
  if (e && typeof e === 'object' && 'response' in e) {
    const respuesta = (e as { response?: { data?: { message?: string } } })
      .response
    if (respuesta?.data?.message) return respuesta.data.message
  }
  return e instanceof Error ? e.message : 'No se pudo completar la operación'
}
export const MvpLogisticaPage = () => {
  const coActivo = useAuthStore(s => s.centroOperacionActivo),
    sesion = useAuthStore(s => s.sesion)
  // Logística solo opera en C.O. 001 y 002, y cada plan es de un único C.O.
  const [coElegido, setCoElegido] = useState(''),
    centros = (sesion?.centros_operacion || []).filter(c =>
      CENTROS_LOGISTICA.includes(c)
    )
  const co =
    coActivo === 'AMBOS'
      ? coElegido || centros[0] || ''
      : centros.includes(coActivo || '')
        ? coActivo || ''
        : ''
  const [pestana, setPestana] = useState<
    'planificar' | 'rutas' | 'dashboard' | 'configuracion'
  >('planificar')
  const [modo, setModo] = useState<'AUTO' | 'MANUAL'>('AUTO'),
    [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set())
  const [cod, setCod] = useState<number | null>(null),
    [conductorId, setConductorId] = useState<number | null>(null)
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null),
    [solicitud, setSolicitud] = useState<SolicitudPlan | null>(null)
  const [fijar, setFijar] = useState<FacturaLogistica | null>(null),
    [confirmar, setConfirmar] = useState(false),
    [marcarBodega, setMarcarBodega] = useState(false)
  // Asistente de 3 pasos: 1 facturas · 2 camiones · 3 rutas.
  const [paso, setPaso] = useState<1 | 2 | 3>(1),
    [verMapa, setVerMapa] = useState(true),
    [permitirSobrepeso, setPermitirSobrepeso] = useState(false),
    [repartir, setRepartir] = useState(true),
    [resaltada, setResaltada] = useState<number | null>(null)
  const [ocupado, setOcupado] = useState(false),
    [error, setError] = useState(''),
    [exito, setExito] = useState('')
  const qc = useQueryClient(),
    facturasQ = useFacturasLogistica(coActivo),
    recursosQ = useRecursosLogistica(coActivo)
  const facturas = useMemo(
    () => facturasQ.data?.filter(f => f.idco === co) || [],
    [facturasQ.data, co]
  )
  const elegidas = facturas.filter(f => seleccionadas.has(f.rowid_sa)),
    ids = elegidas.map(f => f.rowid_sa)
  const origen = recursosQ.data?.origenes.find(o => o.id_co === co)
  const [elegidosAuto, setElegidosAuto] = useState<ElegidosAuto>({})
  // Al cargar (o cambiar de C.O.) se preseleccionan los camiones con conductor fijo.
  useEffect(() => {
    setElegidosAuto(elegidosPorDefecto(recursosQ.data?.vehiculos || []))
  }, [recursosQ.data])
  const camionesAuto = Object.entries(elegidosAuto)
  const faltaConductorAuto = camionesAuto.some(([, c]) => !c)
  const cargaKg = elegidas.reduce((s, f) => s + f.peso_kg, 0)
  const nombreParada = (id: string) =>
    facturas.find(f => `${f.idtercero}:${f.id_sucursal}` === id)?.razon || id
  const MOTIVOS: Record<string, string> = {
    SIN_UBICACION: 'sin ubicación',
    SIN_CAPACIDAD: 'no cupo en los camiones elegidos',
    EXCEDE_CAPACIDAD_MAX: 'pesa más que cualquier camión',
  }
  const limpiar = () => {
    setPropuesta(null)
    setSolicitud(null)
    setError('')
    setExito('')
  }
  const ejecutar = async (accion: () => Promise<void>) => {
    try {
      setOcupado(true)
      setError('')
      await accion()
    } catch (e) {
      setError(errorTexto(e))
    } finally {
      setOcupado(false)
    }
  }
  const ubicar = async (lista: FacturaLogistica[]) =>
    ejecutar(async () => {
      await logisticaApi.geocodificar(
        lista.map(f => ({
          rowidTercero: f.idtercero,
          idSucursal: f.id_sucursal,
        }))
      )
      await qc.invalidateQueries({ queryKey: ['logistica', 'facturas'] })
    })
  const plan = async (orden?: string[], soloIds = ids) =>
    ejecutar(async () => {
      const s: SolicitudPlan = {
        modo,
        idCo: co,
        facturas: soloIds,
        vehiculos:
          modo === 'MANUAL'
            ? [{ cod: cod!, conductorId: conductorId! }]
            : camionesAuto.map(([c, conductor]) => ({
                cod: Number(c),
                conductorId: conductor!,
              })),
        permitirSobrepeso,
        repartir,
        ...(orden ? { orden } : {}),
      }
      const p = await logisticaApi.planificar(s)
      setPropuesta(p)
      setSolicitud(s)
      setResaltada(null)
      setPaso(3)
    })
  // Quita de la selección las paradas que no se pudieron asignar y recalcula.
  const quitarNoAsignadas = () => {
    if (!propuesta) return
    const fuera = new Set(propuesta.noAsignadas.map(p => p.id))
    const quedan = elegidas
      .filter(f => !fuera.has(`${f.idtercero}:${f.id_sucursal}`))
      .map(f => f.rowid_sa)
    setSeleccionadas(new Set(quedan))
    if (quedan.length) void plan(undefined, quedan)
    else {
      limpiar()
      setPaso(1)
    }
  }
  // Tocar un cliente en el mapa lo agrega o lo quita (sus facturas con peso; si no tiene, todas).
  const alternarCliente = (clave: string) => {
    const del = facturas.filter(
      f => `${f.idtercero}:${f.id_sucursal}` === clave
    )
    const objetivo = del.some(f => f.peso_kg > 0)
      ? del.filter(f => f.peso_kg > 0)
      : del
    const nuevas = new Set(seleccionadas)
    const quitar = objetivo.some(f => nuevas.has(f.rowid_sa))
    objetivo.forEach(f =>
      quitar ? nuevas.delete(f.rowid_sa) : nuevas.add(f.rowid_sa)
    )
    setSeleccionadas(nuevas)
    limpiar()
  }
  const clientesElegidos = new Set(
    elegidas.map(f => `${f.idtercero}:${f.id_sucursal}`)
  ).size
  const valorElegido = elegidas.reduce((s, f) => s + f.valor, 0)
  const mover = (desde: number, hacia: number) => {
    if (!propuesta?.rutas[0]) return
    const orden = propuesta.rutas[0].paradas.map(p => p.id)
    ;[orden[desde], orden[hacia]] = [orden[hacia], orden[desde]]
    void plan(orden)
  }
  const guardar = () =>
    ejecutar(async () => {
      if (!solicitud) return
      const rutas = await logisticaApi.confirmar({
        ...solicitud,
        rutasEsperadas: propuesta?.rutas.map(r => ({
          cod: r.cod,
          conductorId: r.conductorId,
          paradas: r.paradas.map(p => p.id),
        })),
      })
      setConfirmar(false)
      setPropuesta(null)
      setSeleccionadas(new Set())
      setPaso(1)
      setExito(`Rutas ${rutas.join(', ')} confirmadas y facturas asignadas`)
      await qc.invalidateQueries({ queryKey: ['logistica'] })
      await qc.invalidateQueries({ queryKey: ['asignacion-cobro'] })
      await qc.invalidateQueries({ queryKey: ['facturas'] })
    })
  if (!co)
    return (
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
        <Encabezado
          titulo="MVP Logística"
          descripcion="Planifique entregas por ubicación, peso y capacidad"
        />
        <p className="rounded-xl border bg-card p-4 text-sm">
          Logística solo opera en los C.O. 001 y 002. Seleccione uno de ellos (o
          «Ambos») en el selector de C.O. de arriba.
        </p>
      </div>
    )
  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
      <Encabezado
        titulo="MVP Logística"
        descripcion="Planifique entregas por ubicación, peso y capacidad"
        accion={
          coActivo === 'AMBOS' ? (
            <label className="text-sm">
              Centro de operación{' '}
              <select
                className="ml-2 rounded-lg border bg-card p-2"
                value={co}
                onChange={e => {
                  setCoElegido(e.target.value)
                  setSeleccionadas(new Set())
                  limpiar()
                }}
              >
                {centros.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          ) : undefined
        }
      />
      <div className="flex flex-wrap gap-2 border-b">
        {(
          [
            ['planificar', 'Planificar'],
            ['rutas', 'Rutas del día'],
            ['dashboard', 'Dashboard'],
            ['configuracion', 'Configuración'],
          ] as const
        ).map(([id, texto]) => (
          <button
            key={id}
            className={`border-b-2 px-3 py-2 text-sm ${pestana === id ? 'border-primary font-semibold' : 'border-transparent text-muted-foreground'}`}
            onClick={() => setPestana(id)}
          >
            {texto}
          </button>
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {exito && (
        <p
          role="status"
          className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700"
        >
          {exito}
        </p>
      )}
      {pestana === 'planificar' && (
        <>
          {/* Pasos del asistente: se puede volver a uno anterior tocándolo. */}
          <ol className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
            {(
              [
                [1, 'Facturas', `${clientesElegidos} clientes`],
                [
                  2,
                  'Camiones',
                  modo === 'AUTO'
                    ? `${camionesAuto.length} camiones`
                    : 'Manual',
                ],
                [
                  3,
                  'Rutas',
                  propuesta ? `${propuesta.rutas.length} rutas` : '—',
                ],
              ] as const
            ).map(([n, texto, sub]) => {
              const hecho = paso > n,
                actual = paso === n,
                puede =
                  n < paso ||
                  (n === 2 && !!ids.length) ||
                  (n === 3 && !!propuesta)
              return (
                <li key={n}>
                  <button
                    disabled={!puede && !actual}
                    onClick={() => setPaso(n)}
                    className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left ${actual ? 'border-primary bg-primary/5' : ''} disabled:opacity-50`}
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${hecho ? 'bg-emerald-600 text-white' : actual ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                    >
                      {hecho ? <Check className="size-3.5" /> : n}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{texto}</span>
                      <span className="block truncate text-muted-foreground">
                        {sub}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          {facturasQ.isLoading || recursosQ.isLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
          ) : facturasQ.isError || recursosQ.isError ? (
            <p className="text-destructive">
              No se pudieron cargar facturas o recursos.
            </p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
              <div className="space-y-4">
                {paso === 1 && (
                  <>
                    <h2 className="text-lg font-semibold">
                      ¿Qué va a entregar?
                    </h2>
                    <p className="-mt-3 text-sm text-muted-foreground">
                      Marque los clientes (o facturas) que salen hoy.
                    </p>
                    <PanelFacturas
                      facturas={facturas}
                      seleccionadas={seleccionadas}
                      cambiar={n => {
                        setSeleccionadas(new Set(n))
                        limpiar()
                      }}
                      fijar={setFijar}
                      ubicarFaltantes={lista => void ubicar(lista)}
                      ocupado={ocupado}
                    />
                  </>
                )}

                {paso === 2 && (
                  <>
                    <h2 className="text-lg font-semibold">
                      ¿Con qué camiones?
                    </h2>
                    {!origen ? (
                      <div className="rounded-xl border border-amber-500 bg-amber-500/5 p-3 text-sm">
                        <p className="font-medium text-amber-700">
                          Falta la bodega de donde salen los camiones (C.O. {co}
                          )
                        </p>
                        <p className="mb-2 text-xs text-muted-foreground">
                          Se marca una sola vez; las rutas salen y vuelven a
                          ella.
                        </p>
                        <button
                          className="rounded-lg bg-amber-600 px-3 py-2 text-white"
                          onClick={() => setMarcarBodega(true)}
                        >
                          Marcar bodega en el mapa
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Salida: {origen.nombre} ·{' '}
                        <button
                          className="text-primary underline"
                          onClick={() => setMarcarBodega(true)}
                        >
                          cambiar
                        </button>
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          [
                            'AUTO',
                            Wand2,
                            'Automático',
                            'El sistema reparte entre los camiones que elija',
                          ],
                          [
                            'MANUAL',
                            Truck,
                            'Manual',
                            'Usted elige un camión y el sistema ordena',
                          ],
                        ] as const
                      ).map(([valor, Icono, titulo, texto]) => (
                        <button
                          key={valor}
                          onClick={() => {
                            setModo(valor)
                            limpiar()
                          }}
                          className={`rounded-xl border p-3 text-left text-sm ${modo === valor ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}`}
                        >
                          <Icono className="mb-1 size-5 text-primary" />
                          <span className="block font-semibold">{titulo}</span>
                          <span className="block text-xs text-muted-foreground">
                            {texto}
                          </span>
                        </button>
                      ))}
                    </div>
                    {modo === 'AUTO' ? (
                      <PanelAutomatico
                        vehiculos={recursosQ.data?.vehiculos || []}
                        disponibles={
                          recursosQ.data?.conductoresDisponibles || []
                        }
                        elegidos={elegidosAuto}
                        cambiar={e => {
                          setElegidosAuto(e)
                          limpiar()
                        }}
                        cargaKg={cargaKg}
                        abrirConfiguracion={() => setPestana('configuracion')}
                      />
                    ) : (
                      <PanelManual
                        vehiculos={recursosQ.data?.vehiculos || []}
                        disponibles={
                          recursosQ.data?.conductoresDisponibles || []
                        }
                        cod={cod}
                        conductorId={conductorId}
                        cambiarVehiculo={v => {
                          setCod(v)
                          limpiar()
                        }}
                        cambiarConductor={v => {
                          setConductorId(v)
                          limpiar()
                        }}
                        abrirConfiguracion={() => setPestana('configuracion')}
                      />
                    )}
                    <div className="space-y-2 rounded-2xl border p-4 text-sm">
                      {modo === 'AUTO' && (
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4"
                            checked={repartir}
                            onChange={e => {
                              setRepartir(e.target.checked)
                              limpiar()
                            }}
                          />
                          <span>
                            <span className="block font-medium">
                              Repartir entre todos los camiones elegidos
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              Cada camión marcado sale con su propia ruta. Si lo
                              apaga, se usan los mínimos camiones posibles.
                            </span>
                          </span>
                        </label>
                      )}
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4"
                          checked={permitirSobrepeso}
                          onChange={e => {
                            setPermitirSobrepeso(e.target.checked)
                            limpiar()
                          }}
                        />
                        <span>
                          <span className="block font-medium text-red-700">
                            Permitir sobrepeso
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            Lo que no cabe se mete en el camión menos cargado y
                            se puede confirmar aunque pase su capacidad.
                          </span>
                        </span>
                      </label>
                    </div>
                  </>
                )}

                {paso === 3 && (
                  <>
                    <h2 className="text-lg font-semibold">Rutas propuestas</h2>
                    {!!propuesta?.noAsignadas.length && (
                      <div className="rounded-xl border border-amber-500 bg-amber-500/5 p-3 text-sm">
                        <strong className="text-amber-700">
                          {propuesta.noAsignadas.length} sin asignar
                        </strong>
                        <ul className="my-2 space-y-0.5 text-xs">
                          {propuesta.noAsignadas.map(p => (
                            <li key={p.id}>
                              {nombreParada(p.id)}:{' '}
                              {MOTIVOS[p.motivo] || p.motivo}
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={ocupado}
                            className="rounded-lg bg-amber-600 px-3 py-1.5 text-white disabled:opacity-50"
                            onClick={quitarNoAsignadas}
                          >
                            Quitarlas y recalcular
                          </button>
                          <button
                            className="rounded-lg border px-3 py-1.5"
                            onClick={() => setPaso(2)}
                          >
                            Agregar camiones
                          </button>
                        </div>
                      </div>
                    )}
                    {propuesta && !propuesta.rutas.length && (
                      <p className="rounded-xl border p-3 text-sm">
                        No se pudo armar ninguna ruta con esta selección.
                      </p>
                    )}
                    {propuesta?.rutas.map((r, i) => (
                      <TarjetaRuta
                        key={r.cod}
                        ruta={r}
                        indice={i}
                        color={COLORES_RUTA[i % COLORES_RUTA.length]}
                        mover={modo === 'MANUAL' ? mover : undefined}
                        resaltada={resaltada === i}
                        alResaltar={() =>
                          setResaltada(resaltada === i ? null : i)
                        }
                        sobrepesoPermitido={permitirSobrepeso}
                      />
                    ))}
                  </>
                )}
              </div>
              {/* Mapa siempre presente: arriba en el celular, a la derecha en escritorio. */}
              <div className="order-first lg:order-none">
                <div className="space-y-2 lg:sticky lg:top-4">
                  <button
                    className="text-xs text-primary underline lg:hidden"
                    onClick={() => setVerMapa(!verMapa)}
                  >
                    {verMapa ? 'Ocultar mapa' : 'Ver mapa'}
                  </button>
                  <div className={verMapa ? '' : 'hidden lg:block'}>
                    <Transicion3D
                      clave={`${modo}-${propuesta?.rutas.map(r => r.paradas.map(p => p.id).join()).join('|') || 'base'}-${exito}`}
                    >
                      <MapaLogistica
                        origen={origen}
                        facturas={
                          paso === 1
                            ? facturas.filter(
                                f =>
                                  f.peso_kg > 0 || seleccionadas.has(f.rowid_sa)
                              )
                            : elegidas
                        }
                        rutas={paso === 3 ? propuesta?.rutas : undefined}
                        seleccionadas={seleccionadas}
                        alTocarCliente={
                          paso === 1 ? alternarCliente : undefined
                        }
                        alto={
                          paso === 3
                            ? 'h-[380px] lg:h-[650px]'
                            : 'h-[280px] lg:h-[650px]'
                        }
                        // Re-encuadra al cambiar de C.O., de paso o de propuesta; no en cada selección.
                        clave={`${co}-${paso}-${propuesta?.rutas.map(r => r.paradas.length).join() || ''}`}
                      />
                    </Transicion3D>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Barra de acción: siempre muestra el siguiente paso. */}
          <div className="fixed inset-x-0 bottom-0 z-[1000] border-t bg-card/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur lg:sticky lg:rounded-xl lg:border">
            {error && (
              <p
                role="alert"
                className="mx-auto mb-2 max-w-[1600px] rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </p>
            )}
            <div className="mx-auto flex max-w-[1600px] items-center gap-2">
              {paso > 1 && (
                <button
                  className="flex items-center gap-1 rounded-xl border px-3 py-3 text-sm"
                  onClick={() => setPaso(paso === 3 ? 2 : 1)}
                >
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Atrás</span>
                </button>
              )}
              <span className="min-w-0 flex-1 text-xs leading-tight">
                <span className="block font-semibold">
                  {clientesElegidos} clientes ·{' '}
                  {cargaKg.toLocaleString('es-CO')} kg
                </span>
                <span className="block truncate text-muted-foreground">
                  {paso === 1 &&
                    (ids.length
                      ? formatters.currency(valorElegido)
                      : 'Marque al menos un cliente')}
                  {paso === 2 &&
                    (!origen
                      ? 'Falta marcar la bodega'
                      : modo === 'AUTO'
                        ? !camionesAuto.length
                          ? 'Elija al menos un camión'
                          : faltaConductorAuto
                            ? 'Falta conductor en algún camión'
                            : `${camionesAuto.length} camiones listos`
                        : !cod || !conductorId
                          ? 'Elija camión y conductor'
                          : 'Listo para calcular')}
                  {paso === 3 &&
                    (propuesta?.noAsignadas.length
                      ? 'Resuelva las paradas sin asignar'
                      : propuesta?.rutas.some(r => r.sobrepeso)
                        ? permitirSobrepeso
                          ? 'Con sobrepeso (permitido) · revise y confirme'
                          : 'Hay sobrepeso: active «Permitir sobrepeso»'
                        : 'Revise y confirme')}
                </span>
              </span>
              {paso === 1 && (
                <button
                  disabled={!ids.length}
                  className="flex items-center gap-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  onClick={() => setPaso(2)}
                >
                  Siguiente <ArrowRight className="size-4" />
                </button>
              )}
              {paso === 2 && (
                <button
                  disabled={
                    ocupado ||
                    !ids.length ||
                    !origen ||
                    (modo === 'AUTO' &&
                      (!camionesAuto.length || faltaConductorAuto)) ||
                    (modo === 'MANUAL' && (!cod || !conductorId))
                  }
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  onClick={() => void plan()}
                >
                  {ocupado ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Wand2 className="size-4" />
                  )}
                  Generar rutas
                </button>
              )}
              {paso === 3 && (
                <button
                  disabled={
                    ocupado ||
                    !propuesta?.rutas.length ||
                    !!propuesta.noAsignadas.length ||
                    (!permitirSobrepeso &&
                      propuesta.rutas.some(r => r.sobrepeso))
                  }
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={() => setConfirmar(true)}
                >
                  {ocupado ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Confirmar
                </button>
              )}
            </div>
          </div>
          <div className="h-20 lg:hidden" />
        </>
      )}
      {pestana === 'rutas' && (
        <RutasDelDia co={coActivo} origenes={recursosQ.data?.origenes} />
      )}
      {pestana === 'dashboard' && <KpisLogistica co={coActivo} activo />}
      {pestana === 'configuracion' && (
        <ConfiguracionLogistica key={co} co={co} recursos={recursosQ.data} />
      )}
      <SelectorUbicacionModal
        abierto={!!fijar}
        titulo={`Ubicar · ${fijar?.razon || ''}`}
        detalle={`Dirección en SIESA: ${fijar?.direccion || 'sin dirección'}${fijar?.ciudad ? ` · ${fijar.ciudad}` : ''}`}
        textoInicial={[fijar?.direccion, fijar?.ciudad]
          .filter(Boolean)
          .join(', ')}
        puntoInicial={
          fijar?.ubicacion
            ? { lat: fijar.ubicacion.lat, lon: fijar.ubicacion.lon }
            : null
        }
        centro={origen ? { lat: origen.lat, lon: origen.lon } : null}
        onClose={() => setFijar(null)}
        onGuardar={async p => {
          if (!fijar) return
          await logisticaApi.ubicacion(
            fijar.idtercero,
            fijar.id_sucursal,
            p.lat,
            p.lon
          )
          await qc.invalidateQueries({ queryKey: ['logistica', 'facturas'] })
        }}
      />
      <SelectorUbicacionModal
        abierto={marcarBodega}
        titulo={`Bodega de salida · C.O. ${co}`}
        detalle="Busque la dirección de la bodega o tóquela en el mapa, y póngale un nombre."
        conNombre
        nombreInicial={origen?.nombre || ''}
        puntoInicial={origen ? { lat: origen.lat, lon: origen.lon } : null}
        centro={origen ? { lat: origen.lat, lon: origen.lon } : null}
        textoGuardar="Guardar bodega"
        onClose={() => setMarcarBodega(false)}
        onGuardar={async (p, nombre) => {
          await logisticaApi.origen(co, nombre, p.lat, p.lon)
          await qc.invalidateQueries({ queryKey: ['logistica', 'recursos'] })
        }}
      />
      <Modal
        isOpen={confirmar}
        onClose={() => setConfirmar(false)}
        title="Confirmar rutas y asignaciones"
      >
        <p className="mb-3 text-sm">
          Se asignarán {ids.length} facturas a los siguientes conductores:
        </p>
        {propuesta?.rutas.map(r => (
          <p key={r.cod} className="border-b py-2 text-sm">
            <strong>{r.conductor}</strong> · {r.placa} · {r.paradas.length}{' '}
            paradas · {r.pesoKg.toLocaleString('es-CO')} kg
          </p>
        ))}
        <div className="mt-4 flex gap-3">
          <button
            disabled={ocupado}
            onClick={() => void guardar()}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            Confirmar y asignar
          </button>
          <button onClick={() => setConfirmar(false)}>Volver</button>
        </div>
      </Modal>
    </div>
  )
}
