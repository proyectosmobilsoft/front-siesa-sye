import { cn } from '@/lib/utils'

/**
 * Animación de "cargando" única para todo el sistema: un anillo que gira con tres puntos que
 * laten debajo. Para esperas de una sección o página completa; dentro de un botón, usa un icono
 * girando (Loader2 con animate-spin).
 */
export function Cargando({ texto = 'Cargando…', compacto = false, className }: { texto?: string; compacto?: boolean; className?: string }) {
    return (
        <div role="status" aria-live="polite" className={cn('flex flex-col items-center justify-center gap-3 text-muted-foreground', compacto ? 'py-6' : 'min-h-48 py-12', className)}>
            <span className="relative flex h-10 w-10" aria-hidden="true">
                <span className="absolute inset-0 rounded-full border-4 border-primary/15" />
                <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
            </span>
            <span className="flex items-center gap-2 text-sm font-medium">
                {texto}
                <span className="flex gap-0.5" aria-hidden="true">
                    {[0, 150, 300].map((retraso) => (
                        <span key={retraso} className="h-1 w-1 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${retraso}ms` }} />
                    ))}
                </span>
            </span>
        </div>
    )
}
