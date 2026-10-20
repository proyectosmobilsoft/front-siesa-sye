import { Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { menuPersonalizadoApi, MENU_PERSONALIZADO_KEY } from '@/api/menuPersonalizado'

/**
 * Muestra un enlace de un módulo personalizado: embebido (iframe) o con un botón
 * para abrirlo en pestaña nueva. Solo se resuelven enlaces del menú del usuario,
 * que el API ya filtra por el permiso VER_PERS_* de cada módulo.
 */
export function PersonalizadoPage() {
    const { itemId } = useParams()
    const menu = useQuery({ queryKey: MENU_PERSONALIZADO_KEY, queryFn: menuPersonalizadoApi.menu, retry: false, staleTime: 60_000 })

    if (menu.isLoading) {
        return <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Cargando…</div>
    }

    const modulo = menu.data?.find((m) => m.items.some((i) => String(i.id) === itemId))
    const item = modulo?.items.find((i) => String(i.id) === itemId)
    if (!modulo || !item) {
        return <p className="m-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-700 dark:text-amber-400">Este enlace no existe o no tienes acceso a su módulo.</p>
    }

    if (item.modo === 'interno') return <Navigate to={item.url} replace />

    const abrir = () => window.open(item.url, '_blank', 'noopener,noreferrer')

    if (item.modo === 'nueva') {
        return (
            <div className="mx-auto flex max-w-xl flex-col items-center gap-4 p-10 text-center">
                <h2 className="text-lg font-semibold">{item.nombre}</h2>
                <p className="text-sm text-muted-foreground">Este enlace se abre en una pestaña nueva.</p>
                <Button onClick={abrir} className="gap-2"><ExternalLink className="h-4 w-4" /> Abrir {item.nombre}</Button>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-9rem)] min-h-96 flex-col gap-2 p-3">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">Si no carga, el sitio no permite incrustarse.</span>
                <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 text-xs" onClick={abrir}><ExternalLink className="h-3.5 w-3.5" /> Abrir en pestaña nueva</Button>
            </div>
            <iframe
                key={item.id}
                src={item.url}
                title={item.nombre}
                className="min-h-0 w-full flex-1 rounded-lg border bg-background"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                referrerPolicy="no-referrer"
                loading="lazy"
            />
        </div>
    )
}
