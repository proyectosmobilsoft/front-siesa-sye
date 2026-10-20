import { useEffect, useRef, useState } from 'react'
import { ClipboardPaste, FileText, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TIPOS_ACEPTADOS = 'image/jpeg,image/png,image/webp,application/pdf'
const EXTENSION: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf' }
const dos = (n: number) => String(n).padStart(2, '0')

/** Las capturas del portapapeles llegan todas como "image.png": se renombran con la hora para distinguirlas */
function nombrar(archivo: File, indice: number): File {
  if (!/^image\.(png|jpe?g|webp|gif)$/i.test(archivo.name)) return archivo
  const d = new Date()
  const ext = EXTENSION[archivo.type] ?? 'png'
  return new File([archivo], `captura-${dos(d.getHours())}${dos(d.getMinutes())}${dos(d.getSeconds())}${indice > 0 ? `-${indice + 1}` : ''}.${ext}`, { type: archivo.type })
}

function Miniatura({ archivo }: { archivo: File }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!archivo.type.startsWith('image/')) return
    const objectUrl = URL.createObjectURL(archivo)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [archivo])
  return url
    ? <img src={url} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
    : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-muted"><FileText className="h-7 w-7 text-primary" /></span>
}

const tamano = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

/**
 * Zona para adjuntar soportes de una transferencia (fotos o PDF). Se pueden:
 * - arrastrar y soltar encima,
 * - pegar una captura con Ctrl+V (por ejemplo una imagen copiada desde WhatsApp Web o un pantallazo),
 * - o seleccionar archivos, o pulsar "Pegar captura" (si el navegador deja leer el portapapeles).
 * El padre decide si los archivos son válidos y los guarda; este componente solo los recoge y los muestra.
 */
export function ZonaSoportes({ archivos, onAgregar, onQuitar, disabled = false, ayuda }: {
  archivos: File[]
  onAgregar: (nuevos: File[]) => void
  onQuitar: (indice: number) => void
  disabled?: boolean
  ayuda?: string
}) {
  const [arrastrando, setArrastrando] = useState(false)
  const [aviso, setAviso] = useState('')
  const entrada = useRef<HTMLInputElement>(null)
  const profundidad = useRef(0)
  // La última función del padre, para no volver a suscribir el pegado en cada cambio
  const agregarRef = useRef(onAgregar)
  useEffect(() => { agregarRef.current = onAgregar })

  // Ctrl+V en cualquier parte de la ventana: si lo pegado trae archivos o imágenes, se agregan; el texto se deja pasar
  useEffect(() => {
    if (disabled) return
    const alPegar = (e: ClipboardEvent) => {
      const datos = e.clipboardData
      if (!datos) return
      const desdeItems = Array.from(datos.items ?? []).filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter((f): f is File => !!f)
      const lista = datos.files?.length ? Array.from(datos.files) : desdeItems
      if (lista.length === 0) return
      e.preventDefault()
      setAviso('')
      agregarRef.current(lista.map(nombrar))
    }
    document.addEventListener('paste', alPegar)
    return () => document.removeEventListener('paste', alPegar)
  }, [disabled])

  const pegarDesdePortapapeles = async () => {
    setAviso('')
    try {
      const items = await navigator.clipboard.read()
      const encontrados: File[] = []
      for (const item of items) {
        const tipo = item.types.find((t) => t.startsWith('image/') || t === 'application/pdf')
        if (tipo) encontrados.push(new File([await item.getType(tipo)], 'image.png', { type: tipo }))
      }
      if (encontrados.length === 0) { setAviso('No hay ninguna imagen copiada.'); return }
      onAgregar(encontrados.map(nombrar))
    } catch {
      setAviso('El navegador no dejó leer el portapapeles: pega con Ctrl+V.')
    }
  }

  const alSoltar = (e: React.DragEvent) => {
    e.preventDefault()
    profundidad.current = 0
    setArrastrando(false)
    if (disabled) return
    const lista = Array.from(e.dataTransfer.files)
    if (lista.length > 0) { setAviso(''); onAgregar(lista.map(nombrar)) }
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => { e.preventDefault(); profundidad.current += 1; setArrastrando(true) }}
      onDragLeave={() => { profundidad.current = Math.max(0, profundidad.current - 1); if (profundidad.current === 0) setArrastrando(false) }}
      onDrop={alSoltar}
      className={`rounded-lg border-2 border-dashed p-4 transition-colors ${arrastrando ? 'border-primary bg-primary/10' : 'border-border'} ${disabled ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <Upload className="h-6 w-6 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium">{arrastrando ? 'Suelta aquí la foto' : 'Arrastra la foto aquí, pega la captura con Ctrl+V o selecciona un archivo'}</p>
        <p className="text-xs text-muted-foreground">{ayuda ?? 'JPG, PNG, WEBP o PDF; máximo 10 MB cada uno.'} Sirve copiar la imagen en WhatsApp Web y pegarla aquí.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled={disabled} onClick={() => entrada.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Seleccionar archivos
          </Button>
          {typeof navigator !== 'undefined' && !!navigator.clipboard?.read && (
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled={disabled} onClick={() => void pegarDesdePortapapeles()}>
              <ClipboardPaste className="h-3.5 w-3.5" /> Pegar captura
            </Button>
          )}
        </div>
        <input ref={entrada} type="file" multiple accept={TIPOS_ACEPTADOS} className="sr-only" tabIndex={-1} aria-label="Seleccionar soportes"
          onChange={(e) => { onAgregar(Array.from(e.target.files ?? [])); setAviso(''); e.target.value = '' }} />
        {aviso && <p role="status" className="text-xs text-muted-foreground">{aviso}</p>}
      </div>

      {archivos.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {archivos.map((archivo, i) => (
            <li key={`${archivo.name}-${archivo.lastModified}-${i}`} className="flex min-w-0 items-center gap-2 rounded border border-border bg-card p-2 text-xs">
              <Miniatura archivo={archivo} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium" title={archivo.name}>{archivo.name}</span>
                <span className="text-muted-foreground">{tamano(archivo.size)}</span>
              </span>
              <button type="button" aria-label={`Quitar ${archivo.name}`} onClick={() => onQuitar(i)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
