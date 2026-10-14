import type { Parada } from '@/api/logistica'
export function ListaParadas({
  paradas,
  mover,
}: {
  paradas: Parada[]
  mover?: (desde: number, hacia: number) => void
}) {
  return (
    <ol className="space-y-2">
      {paradas.map((p, i) => (
        <li
          key={p.id}
          className="flex items-center gap-2 rounded-xl border p-2 text-sm"
        >
          <strong className="rounded-full bg-primary/10 px-2 py-1">
            {i + 1}
          </strong>
          <span className="min-w-0 flex-1">
            <strong>{p.cliente}</strong>
            <br />
            <span className="text-muted-foreground">
              {p.pesoKg.toLocaleString('es-CO')} kg · ETA {p.etaMin} min
            </span>
          </span>
          {mover && (
            <span className="flex gap-1">
              <button
                disabled={i === 0}
                onClick={() => mover(i, i - 1)}
                aria-label={`Subir ${p.cliente}`}
              >
                ↑
              </button>
              <button
                disabled={i === paradas.length - 1}
                onClick={() => mover(i, i + 1)}
                aria-label={`Bajar ${p.cliente}`}
              >
                ↓
              </button>
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}
