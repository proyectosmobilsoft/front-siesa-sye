import type { Conductor, Vehiculo } from '@/api/logistica'
import { elegidosPorDefecto, type ElegidosAuto } from './elegidosAuto'

/**
 * Modo automático: el usuario decide cuántos y cuáles camiones salen (y con
 * qué conductor si el camión no tiene uno fijo); el sistema reparte las
 * facturas entre ellos.
 */
export function PanelAutomatico({
  vehiculos,
  disponibles,
  elegidos,
  cambiar,
  cargaKg,
  abrirConfiguracion,
}: {
  vehiculos: Vehiculo[]
  disponibles: Conductor[]
  elegidos: ElegidosAuto
  cambiar: (e: ElegidosAuto) => void
  cargaKg: number
  abrirConfiguracion: () => void
}) {
  const usados = vehiculos.filter(v => v.cod in elegidos)
  const capacidad = usados.reduce((s, v) => s + (v.capacidad_kg || 0), 0)
  const usables = vehiculos.filter(v => v.capacidad_kg)
  // Un conductor no puede ir en dos camiones a la vez.
  const tomados = new Set(Object.values(elegidos).filter(Boolean))
  const alcanza = capacidad >= cargaKg

  const alternar = (v: Vehiculo) => {
    const nuevo = { ...elegidos }
    if (v.cod in nuevo) delete nuevo[v.cod]
    else {
      const fijo = v.conductores[0]?.id
      nuevo[v.cod] = fijo && !tomados.has(fijo) ? fijo : null
    }
    cambiar(nuevo)
  }

  return (
    <div className="space-y-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Camiones a usar</h3>
        <div className="flex gap-3 text-xs">
          <button
            className="text-primary underline"
            onClick={() => cambiar(elegidosPorDefecto(vehiculos))}
          >
            Con conductor fijo
          </button>
          <button
            className="text-primary underline"
            onClick={() => cambiar({})}
          >
            Ninguno
          </button>
        </div>
      </div>
      <p
        className={`rounded-lg px-3 py-2 text-sm ${
          !usados.length
            ? 'bg-muted'
            : alcanza
              ? 'bg-emerald-500/10 text-emerald-700'
              : 'bg-amber-500/10 text-amber-700'
        }`}
      >
        Usar <strong>{usados.length}</strong> de {usables.length} camiones ·
        capacidad {capacidad.toLocaleString('es-CO')} kg · carga{' '}
        {cargaKg.toLocaleString('es-CO')} kg
        {!!usados.length &&
          !alcanza &&
          ' — no alcanza, quedarán facturas sin asignar'}
      </p>
      <ul className="max-h-72 divide-y overflow-y-auto text-sm">
        {vehiculos.map(v => {
          const marcado = v.cod in elegidos
          const sinCapacidad = !v.capacidad_kg
          return (
            <li key={v.cod} className="flex flex-wrap items-center gap-2 py-2">
              <label
                className={`flex min-w-0 flex-1 items-center gap-2 ${sinCapacidad ? 'opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  disabled={sinCapacidad}
                  onChange={() => alternar(v)}
                />
                <span className="font-medium">{v.placa}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {sinCapacidad
                    ? 'sin capacidad'
                    : `${v.capacidad_kg!.toLocaleString('es-CO')} kg`}
                </span>
              </label>
              {sinCapacidad ? (
                <button
                  className="text-xs text-amber-700 underline"
                  onClick={abrirConfiguracion}
                >
                  Poner capacidad
                </button>
              ) : marcado ? (
                <select
                  className={`max-w-[60%] rounded-lg border bg-card p-1 text-xs ${elegidos[v.cod] ? '' : 'border-amber-500 text-amber-700'}`}
                  value={elegidos[v.cod] ?? ''}
                  onChange={e =>
                    cambiar({
                      ...elegidos,
                      [v.cod]: Number(e.target.value) || null,
                    })
                  }
                >
                  <option value="">Elegir conductor</option>
                  {/* El fijo primero; no se ofrecen los que ya van en otro camión. */}
                  {[
                    ...v.conductores.map(c => ({ ...c, fijo: true })),
                    ...disponibles
                      .filter(c => !v.conductores.some(f => f.id === c.id))
                      .map(c => ({ ...c, fijo: false })),
                  ]
                    .filter(c => c.id === elegidos[v.cod] || !tomados.has(c.id))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                        {c.fijo ? ' (fijo)' : ''}
                      </option>
                    ))}
                </select>
              ) : (
                v.conductores[0] && (
                  <span className="text-xs text-muted-foreground">
                    {v.conductores[0].nombre}
                    {tomados.has(v.conductores[0].id)
                      ? ' · ya va en otro camión'
                      : ''}
                  </span>
                )
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
