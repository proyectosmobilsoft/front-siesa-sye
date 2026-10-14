import { useState } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import type { FacturaLogistica } from '@/api/logistica'
import { formatters } from '@/utils/formatters'
import { formatearFecha } from '@/components/asignacionCobro/facturaPendiente'

const kg = (n: number) => `${n.toLocaleString('es-CO')} kg`

/** Estado de ubicación del cliente como botón: tocarlo abre el buscador. */
function EstadoUbicacion({
  f,
  onClick,
}: {
  f: FacturaLogistica
  onClick: () => void
}) {
  const u = f.ubicacion
  const [texto, clase] = !u
    ? ['Ubicar', 'border-red-500 text-red-600']
    : u.precision === 'ciudad'
      ? ['Solo ciudad', 'border-amber-500 text-amber-600']
      : u.fuente === 'manual'
        ? ['Ubicado', 'border-emerald-500 text-emerald-600']
        : ['Aprox.', 'border-emerald-500/60 text-emerald-600']
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs ${clase}`}
      title={
        u
          ? 'Corregir ubicación'
          : 'Este cliente no tiene ubicación: toque para buscarla'
      }
    >
      <MapPin className="size-3" />
      {texto}
    </button>
  )
}

/**
 * Paso 1: elegir qué se entrega. Un cliente (+ sucursal) = una parada; se
 * despliega para ver o elegir facturas sueltas. Por defecto se ocultan los
 * documentos sin peso (notas, cartera vieja), que no son mercancía.
 */
export function PanelFacturas({
  facturas,
  seleccionadas,
  cambiar,
  fijar,
  ubicarFaltantes,
  ocupado,
}: {
  facturas: FacturaLogistica[]
  seleccionadas: Set<number>
  cambiar: (ids: number[]) => void
  fijar: (f: FacturaLogistica) => void
  ubicarFaltantes: (lista: FacturaLogistica[]) => void
  ocupado: boolean
}) {
  const [busqueda, setBusqueda] = useState(''),
    [conPeso, setConPeso] = useState(true),
    [abiertos, setAbiertos] = useState<Set<string>>(new Set())

  const sinPeso = facturas.filter(f => f.peso_kg <= 0).length
  const visibles = facturas.filter(
    f =>
      (!conPeso || f.peso_kg > 0) &&
      `${f.razon} ${f.nit} ${f.prefijo} ${f.numero}`
        .toLowerCase()
        .includes(busqueda.toLowerCase())
  )
  const grupos = new Map<string, FacturaLogistica[]>()
  visibles.forEach(f => {
    const k = `${f.idtercero}:${f.id_sucursal}`
    grupos.set(k, [...(grupos.get(k) || []), f])
  })
  const faltantes = [...grupos.values()]
    .map(fs => fs[0])
    .filter(f => !f.ubicacion)

  const alternar = (ids: number[]) => {
    const nuevos = new Set(seleccionadas)
    const todos = ids.every(id => nuevos.has(id))
    ids.forEach(id => (todos ? nuevos.delete(id) : nuevos.add(id)))
    cambiar([...nuevos])
  }
  const desplegar = (k: string) => {
    const n = new Set(abiertos)
    if (n.has(k)) n.delete(k)
    else n.add(k)
    setAbiertos(n)
  }
  const todosVisibles = visibles.map(f => f.rowid_sa)
  const todoMarcado =
    !!todosVisibles.length && todosVisibles.every(id => seleccionadas.has(id))

  return (
    <section className="space-y-3">
      <input
        className="w-full rounded-xl border bg-card p-3 text-sm"
        placeholder="Buscar cliente, NIT o factura"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={todoMarcado}
            onChange={() => alternar(todosVisibles)}
            disabled={!todosVisibles.length}
          />
          Todos ({grupos.size} clientes)
        </label>
        {sinPeso > 0 && (
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={!conPeso}
              onChange={() => setConPeso(!conPeso)}
            />
            Mostrar documentos sin peso ({sinPeso})
          </label>
        )}
      </div>
      {faltantes.length > 0 && (
        <button
          disabled={ocupado}
          onClick={() => ubicarFaltantes(faltantes.slice(0, 40))}
          className="w-full rounded-xl border border-dashed border-red-400 p-2 text-sm text-red-600 disabled:opacity-50"
        >
          {faltantes.length} clientes sin ubicación · Buscarlos automáticamente
        </button>
      )}
      {!grupos.size && (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          {facturas.length
            ? 'Ninguna factura coincide con el filtro.'
            : 'No hay facturas pendientes para este centro de operación.'}
        </p>
      )}
      {[...grupos].map(([k, fs]) => {
        const marcadas = fs.filter(f => seleccionadas.has(f.rowid_sa))
        const todas = marcadas.length === fs.length
        const peso = fs.reduce((s, f) => s + f.peso_kg, 0)
        const valor = fs.reduce((s, f) => s + f.valor, 0)
        const abierto = abiertos.has(k)
        return (
          <div
            key={k}
            className={`rounded-xl border bg-card text-sm transition-colors ${marcadas.length ? 'border-primary/60 bg-primary/5' : ''}`}
          >
            <div className="flex items-center gap-3 p-3">
              <input
                type="checkbox"
                className="size-5 shrink-0"
                aria-label={`Seleccionar ${fs[0].razon}`}
                checked={todas}
                ref={el => {
                  if (el) el.indeterminate = !todas && marcadas.length > 0
                }}
                onChange={() => alternar(fs.map(f => f.rowid_sa))}
              />
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => desplegar(k)}
              >
                <p className="truncate font-semibold">{fs[0].razon}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {fs.length} {fs.length === 1 ? 'factura' : 'facturas'} ·{' '}
                  {kg(peso)} · {formatters.currency(valor)}
                </p>
              </button>
              <EstadoUbicacion f={fs[0]} onClick={() => fijar(fs[0])} />
              <button
                aria-label="Ver facturas"
                onClick={() => desplegar(k)}
                className="shrink-0 p-1 text-muted-foreground"
              >
                <ChevronDown
                  className={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
            {abierto && (
              <div className="border-t px-3 pb-3 pt-2">
                <p className="mb-2 text-xs text-muted-foreground">
                  {fs[0].direccion || 'Sin dirección'}
                  {fs[0].ciudad ? ` · ${fs[0].ciudad}` : ''}
                </p>
                <ul className="divide-y">
                  {fs.map(f => (
                    <li key={f.rowid_sa}>
                      <label className="flex items-center gap-2 py-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={seleccionadas.has(f.rowid_sa)}
                          onChange={() => alternar([f.rowid_sa])}
                        />
                        <span className="flex-1 font-medium">
                          {f.prefijo && f.numero
                            ? `${f.prefijo}-${f.numero}`
                            : f.numero || `SA-${f.rowid_sa}`}
                        </span>
                        <span className="w-20 text-right">{kg(f.peso_kg)}</span>
                        <span className="w-24 text-right">
                          {formatters.currency(f.valor)}
                        </span>
                        <span className="hidden w-20 text-right text-muted-foreground sm:inline">
                          {formatearFecha(f.vence)}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
