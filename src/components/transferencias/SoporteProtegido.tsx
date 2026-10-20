import { useEffect, useState } from 'react'
import { FileText, ImageOff, Loader2 } from 'lucide-react'
import { transferenciasConfirmacionApi } from '@/api/transferenciasConfirmacion'

/**
 * Foto o PDF de un soporte de transferencia. Las fotos no son públicas: no se pueden poner como `src` de una
 * imagen ni como enlace, porque el navegador no manda la sesión. Se piden al API con el token (`apiClient`), se
 * guardan como un archivo en memoria (blob) y se muestran desde ahí; al pulsar se abren en otra pestaña.
 */
function useSoporte(url: string) {
  const [objeto, setObjeto] = useState<string | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  useEffect(() => {
    let cancelado = false
    let creado: string | null = null
    setEstado('cargando'); setObjeto(null)
    transferenciasConfirmacionApi.soporteBlob(url)
      .then((blob) => { if (cancelado) return; creado = URL.createObjectURL(blob); setObjeto(creado); setEstado('listo') })
      .catch(() => { if (!cancelado) setEstado('error') })
    return () => { cancelado = true; if (creado) URL.revokeObjectURL(creado) }
  }, [url])
  return { objeto, estado }
}

export function SoporteProtegido({ url, mime, nombre, variante }: { url: string; mime: string; nombre: string; variante: 'tarjeta' | 'miniatura' }) {
  const { objeto, estado } = useSoporte(url)
  const esImagen = mime?.startsWith('image/')
  const abrir = () => { if (objeto) window.open(objeto, '_blank', 'noopener') }
  const tamano = variante === 'miniatura' ? 'h-14 w-14' : 'h-24 w-full'

  let contenido: React.ReactNode
  if (estado === 'cargando') contenido = <span className={`flex ${tamano} items-center justify-center rounded border border-border text-muted-foreground`}><Loader2 className="h-5 w-5 animate-spin" aria-label="Cargando" /></span>
  else if (estado === 'error' || !objeto) contenido = <span className={`flex ${tamano} items-center justify-center rounded border border-border text-muted-foreground`} title="No se pudo cargar el soporte"><ImageOff className="h-5 w-5" /></span>
  else if (esImagen) contenido = <img src={objeto} alt={nombre} className={`${tamano} rounded border border-border object-cover`} />
  else contenido = <span className={`flex ${tamano} items-center justify-center rounded border border-border text-primary`}><FileText className="h-6 w-6" /></span>

  return (
    <button type="button" onClick={abrir} disabled={estado !== 'listo'} title={nombre} aria-label={`Abrir ${nombre}`}
      className={variante === 'tarjeta'
        ? 'flex min-w-0 flex-col items-center gap-2 rounded-lg border border-border p-2 text-center text-xs hover:bg-muted disabled:cursor-default'
        : 'shrink-0 disabled:cursor-default'}>
      {contenido}
      {variante === 'tarjeta' && <span className="w-full truncate">{nombre}</span>}
    </button>
  )
}
