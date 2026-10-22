import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Bug, X } from 'lucide-react'
import { ticketsApi, type CategoriaTicket, type PrioridadTicket } from '@/api/tickets'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'

const permitido = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxBytes = 5 * 1024 * 1024

function VistaPrevia({ archivo }: { archivo: File }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const objeto = URL.createObjectURL(archivo)
    setUrl(objeto)
    return () => URL.revokeObjectURL(objeto)
  }, [archivo])
  return url ? <img src={url} alt={archivo.name} className="h-16 w-16 rounded object-cover" /> : null
}

export function ReportarProblema() {
  const [abierto, setAbierto] = useState(false)
  const [categoria, setCategoria] = useState<CategoriaTicket>('soporte')
  const [prioridad, setPrioridad] = useState<PrioridadTicket>('media')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [capturas, setCapturas] = useState<File[]>([])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [creado, setCreado] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { sesion, centroOperacionActivo } = useAuthStore()
  const rutas = location.pathname + location.search

  const agregar = useCallback((files: File[]) => {
    const invalidos = files.find(file => !permitido.has(file.type) || file.size > maxBytes)
    if (invalidos) { setError('Solo se admiten JPG, PNG o WebP de máximo 5 MB cada una.'); return }
    setCapturas(actual => {
      if (actual.length + files.length > 5) { setError('Puedes adjuntar hasta 5 capturas.'); return actual }
      setError('')
      return [...actual, ...files]
    })
  }, [])
  useEffect(() => {
    if (!abierto) return
    const pegar = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.items ?? []).filter(item => permitido.has(item.type)).map(item => item.getAsFile()).filter((file): file is File => !!file)
      if (files.length) { event.preventDefault(); agregar(files) }
    }
    window.addEventListener('paste', pegar)
    return () => window.removeEventListener('paste', pegar)
  }, [abierto, agregar])
  const seleccionar = (event: ChangeEvent<HTMLInputElement>) => { agregar(Array.from(event.target.files ?? [])); event.target.value = '' }
  const soltar = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); agregar(Array.from(event.dataTransfer.files)) }
  const enviar = async (event: FormEvent) => {
    event.preventDefault()
    if (!titulo.trim() || !descripcion.trim()) { setError('Escribe un título y una descripción.'); return }
    setEnviando(true); setError('')
    try {
      const ticket = await ticketsApi.crear({ categoria, titulo, descripcion, prioridad, ruta: rutas, capturas,
        contexto: { navegador: navigator.userAgent, usuario: { id: sesion?.id, nombre: sesion?.nombre_completo || sesion?.usuario }, centro_operacion: centroOperacionActivo, pantalla: `${window.innerWidth}x${window.innerHeight}`, fecha_local: new Date().toString() } })
      setCreado(ticket.id); setTitulo(''); setDescripcion(''); setCapturas([])
      window.dispatchEvent(new Event('tickets:actualizar'))
    } catch { setError('No se pudo crear el ticket. Intenta de nuevo.') }
    finally { setEnviando(false) }
  }
  return <>
    <Button variant="outline" size="sm" onClick={() => { setCreado(null); setAbierto(true) }} className="gap-1.5 whitespace-nowrap"><Bug className="h-4 w-4" /><span className="hidden sm:inline">Reportar problema</span><span className="sm:hidden">Reportar</span></Button>
    {abierto && createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setAbierto(false) }}>
      <div role="dialog" aria-modal="true" aria-label="Reportar problema" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Reportar problema</h2><button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar"><X className="h-5 w-5" /></button></div>
        {creado ? <div className="space-y-4"><p>Ticket <strong>INC-{String(creado).padStart(6, '0')}</strong> creado. Puedes seguirlo en Mis tickets.</p><Button onClick={() => { setAbierto(false); navigate('/tickets/mis') }}>Ver mis tickets</Button></div> : <form onSubmit={enviar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3"><label className="text-sm">Categoría<select className="mt-1 w-full rounded border bg-background p-2" value={categoria} onChange={e => setCategoria(e.target.value as CategoriaTicket)}><option value="soporte">Soporte</option><option value="mejora">Mejora</option><option value="otro">Otro</option></select></label><label className="text-sm">Prioridad<select className="mt-1 w-full rounded border bg-background p-2" value={prioridad} onChange={e => setPrioridad(e.target.value as PrioridadTicket)}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></label></div>
          <label className="block text-sm">Título<input required maxLength={160} value={titulo} onChange={e => setTitulo(e.target.value)} className="mt-1 w-full rounded border bg-background p-2" /></label>
          <label className="block text-sm">Descripción<textarea required rows={5} value={descripcion} onChange={e => setDescripcion(e.target.value)} className="mt-1 w-full rounded border bg-background p-2" /></label>
          <div onDragOver={e => e.preventDefault()} onDrop={soltar} className="rounded-lg border-2 border-dashed p-4 text-center text-sm"><p>Arrastra o pega capturas aquí</p><p className="text-xs text-muted-foreground">Hasta 5 archivos JPG, PNG o WebP · 5 MB por archivo</p><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={seleccionar} /><Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => input.current?.click()}>Seleccionar imágenes</Button></div>
          {!!capturas.length && <div className="flex flex-wrap gap-2">{capturas.map((file, index) => <div key={`${file.name}-${index}`} className="relative"><VistaPrevia archivo={file} /><button type="button" onClick={() => setCapturas(actual => actual.filter((_, i) => i !== index))} aria-label={`Quitar ${file.name}`} className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"><X className="h-3 w-3" /></button></div>)}</div>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button><Button disabled={enviando}>{enviando ? 'Enviando...' : 'Crear ticket'}</Button></div>
        </form>}
      </div>
    </div>, document.body)}
  </>
}
