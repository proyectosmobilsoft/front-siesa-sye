import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useAvisosStore } from '@/store/avisosStore'

const estilos = {
  error: { Icono: AlertCircle, color: 'text-destructive', borde: 'border-destructive/50', titulo: 'Error' },
  exito: { Icono: CheckCircle2, color: 'text-primary', borde: 'border-primary/50', titulo: 'Éxito' },
  info: { Icono: Info, color: 'text-primary', borde: 'border-border', titulo: 'Información' },
}

export function Avisos() {
  const avisos = useAvisosStore((state) => state.avisos)
  const cerrar = useAvisosStore((state) => state.cerrar)

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[10000] flex flex-col gap-2 sm:left-auto sm:w-96" role="status" aria-live="polite" aria-atomic="false">
      {avisos.map((item) => {
        const { Icono, color, borde, titulo } = estilos[item.tipo]
        return (
          <div key={item.id} className={`pointer-events-auto flex items-start gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-lg ${borde}`}>
            <Icono className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.titulo || titulo}</p>
              <p className="break-words text-sm">{item.mensaje}</p>
            </div>
            <button type="button" onClick={() => cerrar(item.id)} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Cerrar aviso">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
