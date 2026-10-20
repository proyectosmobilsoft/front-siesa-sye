import { Modal } from '@/components/ui/modal'
import type { Cuadrante } from '@/api/logistica'
import {
  SIN_FILTROS,
  type EstadoUbicacion,
  type FiltrosFacturasEstado,
} from './filtrosFacturas'

const BARRANQUILLA = 'BARRANQUILLA'

function Opcion({
  activa,
  onClick,
  children,
  cuenta,
}: {
  activa: boolean
  onClick: () => void
  children: React.ReactNode
  cuenta?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm ${activa ? 'border-primary bg-primary/5 font-semibold' : ''}`}
    >
      <span className="flex min-w-0 items-center gap-2">{children}</span>
      {cuenta != null && (
        <span className="shrink-0 text-xs text-muted-foreground">{cuenta}</span>
      )}
    </button>
  )
}

/** Filtros del paso 1: ciudad, cuadrante y estado de ubicación. */
export function FiltrosFacturasModal({
  abierto,
  cerrar,
  estado,
  cuadrantes,
}: {
  abierto: boolean
  cerrar: () => void
  estado: FiltrosFacturasEstado
  cuadrantes: Cuadrante[]
}) {
  const { filtros, setFiltros, opciones, clientesFiltrados, activos } = estado
  const hayBarranquilla = opciones.ciudades.some(c => c.clave === BARRANQUILLA)
  const soloBarranquilla =
    filtros.ciudades.length === 1 && filtros.ciudades[0] === BARRANQUILLA
  const alternarCiudad = (clave: string) =>
    setFiltros({
      ...filtros,
      ciudades: filtros.ciudades.includes(clave)
        ? filtros.ciudades.filter(c => c !== clave)
        : [...filtros.ciudades, clave],
    })
  const ubicaciones: [EstadoUbicacion, string, number?][] = [
    ['todas', 'Todas'],
    ['ubicadas', 'Ubicadas en el mapa'],
    ['sin-ubicar', 'Sin ubicación', opciones.sinUbicar],
  ]

  return (
    <Modal
      isOpen={abierto}
      onClose={cerrar}
      title="Filtrar facturas"
      className="max-w-lg"
    >
      <div className="space-y-5 text-sm">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Ciudad</h3>
            {hayBarranquilla && (
              <button
                type="button"
                onClick={() =>
                  setFiltros({
                    ...filtros,
                    ciudades: soloBarranquilla ? [] : [BARRANQUILLA],
                  })
                }
                className={`rounded-full border px-3 py-1 text-xs ${soloBarranquilla ? 'border-primary bg-primary text-primary-foreground' : ''}`}
              >
                Solo Barranquilla
              </button>
            )}
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {opciones.ciudades.map(c => (
              <label
                key={c.clave}
                className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
              >
                <input
                  type="checkbox"
                  checked={filtros.ciudades.includes(c.clave)}
                  onChange={() => alternarCiudad(c.clave)}
                />
                <span className="flex-1">{c.etiqueta}</span>
                <span className="text-xs text-muted-foreground">
                  {c.clientes}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">Cuadrante</h3>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            <Opcion
              activa={filtros.cuadrante === 'todos'}
              onClick={() => setFiltros({ ...filtros, cuadrante: 'todos' })}
            >
              Todos
            </Opcion>
            {cuadrantes.map(c => (
              <Opcion
                key={c.id}
                activa={filtros.cuadrante === c.id}
                cuenta={opciones.porZona.get(c.id) || 0}
                onClick={() => setFiltros({ ...filtros, cuadrante: c.id })}
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: c.color }}
                />
                <span className="truncate">{c.nombre}</span>
              </Opcion>
            ))}
            {cuadrantes.length > 0 && (
              <Opcion
                activa={filtros.cuadrante === 'ninguno'}
                cuenta={opciones.fuera}
                onClick={() => setFiltros({ ...filtros, cuadrante: 'ninguno' })}
              >
                Fuera de los cuadrantes
              </Opcion>
            )}
            {!cuadrantes.length && (
              <p className="rounded-lg border p-3 text-muted-foreground">
                Aún no hay cuadrantes en este C.O. Créelos en la pestaña
                Cuadrantes.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">Ubicación</h3>
          <div className="space-y-1">
            {ubicaciones.map(([valor, texto, cuenta]) => (
              <Opcion
                key={valor}
                activa={filtros.ubicacion === valor}
                cuenta={cuenta}
                onClick={() => setFiltros({ ...filtros, ubicacion: valor })}
              >
                {texto}
              </Opcion>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <button
            type="button"
            disabled={!activos}
            onClick={() => setFiltros(SIN_FILTROS)}
            className="rounded-lg border px-3 py-2 disabled:opacity-50"
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={cerrar}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
          >
            Ver {clientesFiltrados}{' '}
            {clientesFiltrados === 1 ? 'cliente' : 'clientes'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
