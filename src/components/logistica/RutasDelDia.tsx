import { useState } from 'react'
import { FechaInput } from '@/components/ui/fecha-input'
import { formatters } from '@/utils/formatters'
import { MapaLogistica } from './MapaLogistica'
import { logisticaApi, type Origen, type RutaGuardada } from '@/api/logistica'
import { useRutasLogistica } from './useLogistica'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/modal'
const hoy = () => new Date().toLocaleDateString('sv-SE')
export function RutasDelDia({
  co,
  origenes,
}: {
  co: string | null
  origenes?: Origen[]
}) {
  const [fecha, setFecha] = useState(hoy),
    [seleccionada, setSeleccionada] = useState<RutaGuardada | null>(null),
    [cancelar, setCancelar] = useState<RutaGuardada | null>(null),
    [error, setError] = useState('')
  const consulta = useRutasLogistica(fecha, co),
    qc = useQueryClient()
  const confirmar = async () => {
    if (!cancelar) return
    try {
      await logisticaApi.cancelar(cancelar.id)
      setCancelar(null)
      setSeleccionada(null)
      await qc.invalidateQueries({ queryKey: ['logistica'] })
      await qc.invalidateQueries({ queryKey: ['asignacion-cobro'] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar la ruta')
    }
  }
  return (
    <div className="space-y-4">
      <div className="max-w-52">
        <FechaInput value={fecha} onChange={setFecha} />
      </div>
      {consulta.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : consulta.isError ? (
        <p className="text-destructive">No se pudieron cargar las rutas.</p>
      ) : !consulta.data?.length ? (
        <p className="rounded-xl border p-6 text-muted-foreground">
          No hay rutas para esta fecha.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {consulta.data.map(r => {
            const fs = r.paradas.flatMap(p => p.facturas),
              cobradas = fs.filter(f => f.estado_cobro === 'COBRADA').length
            return (
              <article key={r.id} className="rounded-xl border bg-card p-4">
                <strong>
                  Ruta {r.id} · {r.placa}
                </strong>
                <p className="text-sm">
                  {r.conductor} · {r.estado}
                </p>
                <p className="text-sm text-muted-foreground">
                  {r.peso_kg.toLocaleString('es-CO')} /{' '}
                  {r.capacidad_kg.toLocaleString('es-CO')} kg · {r.distancia_km}{' '}
                  km · {r.paradas.length} paradas
                </p>
                <p className="text-sm">
                  {cobradas} cobradas · {fs.length - cobradas} pendientes ·{' '}
                  {formatters.currency(fs.reduce((s, f) => s + f.valor, 0))}
                </p>
                <div className="mt-2 h-2 rounded bg-muted">
                  <div
                    className="h-2 rounded bg-emerald-500"
                    style={{
                      width: `${fs.length ? (cobradas / fs.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="mt-3 flex gap-3 text-sm">
                  <button
                    className="text-primary underline"
                    onClick={() => setSeleccionada(r)}
                  >
                    Ver en mapa
                  </button>
                  {r.estado === 'CONFIRMADA' && (
                    <button
                      className="text-destructive underline"
                      onClick={() => setCancelar(r)}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
      {seleccionada && (
        <MapaLogistica
          origen={origenes?.find(o => o.id_co === seleccionada.id_co)}
          guardadas={[seleccionada]}
          clave={String(seleccionada.id)}
        />
      )}
      <Modal
        isOpen={!!cancelar}
        onClose={() => setCancelar(null)}
        title="Cancelar ruta"
      >
        <p>
          ¿Cancelar la ruta {cancelar?.id} y sus facturas pendientes de cobro?
        </p>
        {error && <p className="text-destructive">{error}</p>}
        <div className="mt-4 flex gap-3">
          <button
            className="rounded-lg bg-destructive px-4 py-2 text-white"
            onClick={confirmar}
          >
            Sí, cancelar
          </button>
          <button onClick={() => setCancelar(null)}>Volver</button>
        </div>
      </Modal>
    </div>
  )
}
