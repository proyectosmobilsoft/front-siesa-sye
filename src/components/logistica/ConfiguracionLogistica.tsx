import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  logisticaApi,
  type DatosVehiculo,
  type Recursos,
  type Vehiculo,
} from '@/api/logistica'
import { MapaLogistica } from './MapaLogistica'
import { useVehiculosLogistica } from './useLogistica'
import { Cargando } from '@/components/ui/cargando'

type Borrador = {
  cod: number | null
  placa: string
  descripcion: string
  capacidad: string
  conductorId: string
  activo: boolean
}
const VACIO: Borrador = {
  cod: null,
  placa: '',
  descripcion: '',
  capacidad: '',
  conductorId: '',
  activo: true,
}
const aBorrador = (v: Vehiculo): Borrador => ({
  cod: v.cod,
  placa: v.placa,
  descripcion: v.descripcion,
  capacidad: v.capacidad_kg == null ? '' : String(v.capacidad_kg),
  conductorId: v.conductor_id == null ? '' : String(v.conductor_id),
  activo: v.activo,
})
export function ConfiguracionLogistica({
  co,
  recursos,
}: {
  co: string | null
  recursos?: Recursos
}) {
  const origen = recursos?.origenes.find(o => o.id_co === co)
  const [nombre, setNombre] = useState(origen?.nombre || ''),
    [punto, setPunto] = useState<{ lat: number; lon: number } | null>(null),
    [borrador, setBorrador] = useState<Borrador | null>(null),
    [mensaje, setMensaje] = useState(''),
    [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    setNombre(origen?.nombre || '')
  }, [origen?.nombre])
  const qc = useQueryClient()
  const vehiculosQ = useVehiculosLogistica(co)
  const conductores = recursos?.conductoresDisponibles || []
  const guardar = async () => {
    if (!co || !punto) return
    try {
      setOcupado(true)
      await logisticaApi.origen(co, nombre, punto.lat, punto.lon)
      await qc.invalidateQueries({ queryKey: ['logistica', 'recursos'] })
      setMensaje('Origen guardado')
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setOcupado(false)
    }
  }
  const guardarVehiculo = async () => {
    if (!borrador) return
    const datos: DatosVehiculo = {
      placa: borrador.placa,
      descripcion: borrador.descripcion,
      capacidadKg: Number(borrador.capacidad),
      conductorId: borrador.conductorId ? Number(borrador.conductorId) : null,
      idCo: co,
      activo: borrador.activo,
    }
    try {
      setOcupado(true)
      if (borrador.cod == null) await logisticaApi.crearVehiculo(datos)
      else await logisticaApi.actualizarVehiculo(borrador.cod, datos)
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['logistica', 'vehiculos'] }),
        qc.invalidateQueries({ queryKey: ['logistica', 'recursos'] }),
      ])
      setBorrador(null)
      setMensaje('Vehículo guardado')
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setOcupado(false)
    }
  }
  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">
          Origen de salida · C.O. {co || 'sin seleccionar'}
        </h2>
        <p className="text-sm text-muted-foreground">
          Haga clic en el mapa y escriba un nombre para la bodega.
        </p>
        <div className="my-3 flex flex-wrap gap-2">
          <input
            className="rounded-lg border bg-card p-2"
            placeholder="Nombre de la bodega"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
          />
          <button
            disabled={!co || !punto || !nombre || ocupado}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            onClick={guardar}
          >
            Guardar origen
          </button>
        </div>
        <MapaLogistica
          origen={
            punto && co
              ? { id_co: co, nombre, lat: punto.lat, lon: punto.lon }
              : origen
          }
          clave={`${punto?.lat || origen?.lat}`}
          alClic={(lat, lon) => setPunto({ lat, lon })}
        />
      </section>
      <section className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Camiones</h2>
          <button
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            disabled={ocupado}
            onClick={() => setBorrador({ ...VACIO })}
          >
            Nuevo camión
          </button>
        </div>
        {borrador && (
          <div className="mb-4 grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2 lg:grid-cols-6">
            <input
              className="rounded-lg border bg-card p-2 uppercase"
              placeholder="Placa"
              maxLength={10}
              value={borrador.placa}
              onChange={e =>
                setBorrador({ ...borrador, placa: e.target.value })
              }
            />
            <input
              className="rounded-lg border bg-card p-2 lg:col-span-2"
              placeholder="Descripción (ej. Camión NPR)"
              maxLength={60}
              value={borrador.descripcion}
              onChange={e =>
                setBorrador({ ...borrador, descripcion: e.target.value })
              }
            />
            <input
              type="number"
              min="1"
              max="40000"
              className="rounded-lg border bg-card p-2"
              placeholder="Capacidad kg"
              value={borrador.capacidad}
              onChange={e =>
                setBorrador({ ...borrador, capacidad: e.target.value })
              }
            />
            <select
              className="rounded-lg border bg-card p-2"
              value={borrador.conductorId}
              onChange={e =>
                setBorrador({ ...borrador, conductorId: e.target.value })
              }
            >
              <option value="">Sin conductor fijo</option>
              {conductores.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={borrador.activo}
                onChange={e =>
                  setBorrador({ ...borrador, activo: e.target.checked })
                }
              />
              Activo
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
              <button
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                disabled={
                  ocupado ||
                  !borrador.placa.trim() ||
                  !Number(borrador.capacidad)
                }
                onClick={guardarVehiculo}
              >
                Guardar
              </button>
              <button
                className="rounded-lg border px-4 py-2"
                onClick={() => setBorrador(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        {vehiculosQ.isLoading && <Cargando compacto texto="Cargando camiones" />}
        {vehiculosQ.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay camiones registrados. Use "Nuevo camión".
          </p>
        )}
        <div className="divide-y text-sm">
          {vehiculosQ.data?.map(v => (
            <div
              key={v.cod}
              className={`flex flex-wrap items-center gap-x-4 gap-y-1 py-2 ${v.activo ? '' : 'opacity-50'}`}
            >
              <span className="w-24 font-medium">{v.placa}</span>
              <span className="min-w-32 flex-1 text-muted-foreground">
                {v.descripcion || '—'}
              </span>
              <span
                className={
                  v.capacidad_confirmada ? '' : 'font-medium text-amber-600'
                }
              >
                {v.capacidad_kg == null
                  ? 'Capacidad por confirmar'
                  : `${v.capacidad_kg.toLocaleString('es-CO')} kg`}
              </span>
              <span className="min-w-32 text-muted-foreground">
                {v.conductores[0]?.nombre || 'Sin conductor fijo'}
              </span>
              {!v.activo && <span className="text-xs">Inactivo</span>}
              <button
                className="text-primary underline disabled:opacity-50"
                disabled={ocupado}
                onClick={() => setBorrador(aBorrador(v))}
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      </section>
      {mensaje && (
        <p role="status" className="text-sm">
          {mensaje}
        </p>
      )}
    </div>
  )
}
