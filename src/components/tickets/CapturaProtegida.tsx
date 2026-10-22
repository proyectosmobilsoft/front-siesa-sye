import { useEffect, useState } from 'react'
import { ticketsApi, type CapturaTicket } from '@/api/tickets'

export function CapturaProtegida({ captura, grande = false }: { captura: CapturaTicket; grande?: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let activa = true
    let objeto: string | null = null
    ticketsApi.capturaBlob(captura.url).then(blob => {
      objeto = URL.createObjectURL(blob)
      if (activa) setUrl(objeto)
      else URL.revokeObjectURL(objeto)
    }).catch(() => { if (activa) setUrl(null) })
    return () => { activa = false; if (objeto) URL.revokeObjectURL(objeto) }
  }, [captura.url])
  return <button type="button" disabled={!url} onClick={() => url && window.open(url, '_blank', 'noopener')} title={captura.nombre_original || 'Abrir captura'} className="rounded border border-border bg-muted/30 p-1 disabled:cursor-wait">
    {url ? <img src={url} alt={captura.nombre_original || 'Captura del ticket'} className={grande ? 'max-h-80 max-w-full object-contain' : 'h-16 w-16 object-cover'} /> : <span className="flex h-16 w-16 items-center justify-center text-xs text-muted-foreground">Cargando</span>}
  </button>
}
