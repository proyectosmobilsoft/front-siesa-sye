import type { Conductor, Vehiculo } from '@/api/logistica'
export function PanelManual({
  vehiculos,
  disponibles,
  cod,
  conductorId,
  cambiarVehiculo,
  cambiarConductor,
  abrirConfiguracion,
}: {
  vehiculos: Vehiculo[]
  disponibles: Conductor[]
  cod: number | null
  conductorId: number | null
  cambiarVehiculo: (cod: number | null) => void
  cambiarConductor: (id: number | null) => void
  abrirConfiguracion: () => void
}) {
  const elegido = vehiculos.find(v => v.cod === cod)
  return (
    <div className="space-y-3 rounded-2xl border p-4">
      <label className="block text-sm">
        Camión
        <select
          className="mt-1 w-full rounded-lg border bg-card p-2"
          value={cod ?? ''}
          onChange={e => {
            cambiarVehiculo(Number(e.target.value) || null)
            cambiarConductor(null)
          }}
        >
          <option value="">Seleccione camión</option>
          {vehiculos.map(v => (
            <option key={v.cod} value={v.cod} disabled={!v.capacidad_kg}>
              {v.capacidad_kg
                ? `${v.placa} · ${v.capacidad_kg} kg`
                : `${v.placa} · sin capacidad (configúrela primero)`}
            </option>
          ))}
        </select>
      </label>
      {elegido && (
        <>
          <label className="block text-sm">
            Conductor
            <select
              className="mt-1 w-full rounded-lg border bg-card p-2"
              value={conductorId ?? ''}
              onChange={e => cambiarConductor(Number(e.target.value) || null)}
            >
              <option value="">Seleccione conductor</option>
              {(elegido.conductores.length
                ? elegido.conductores
                : disponibles
              ).map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} · {c.facturas_pendientes} facturas ·{' '}
                  {c.kg_pendiente.toLocaleString('es-CO')} kg pendientes
                </option>
              ))}
            </select>
          </label>
          {!elegido.capacidad_confirmada && (
            <button
              className="text-sm text-amber-700 underline"
              onClick={abrirConfiguracion}
            >
              Capacidad inferida. Confirmar en Configuración
            </button>
          )}
        </>
      )}
    </div>
  )
}
