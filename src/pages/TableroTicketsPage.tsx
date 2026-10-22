import { useCallback, useEffect, useState } from 'react'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { ticketsApi, type PipelineTicket, type RazonRechazo, type ResumenTickets, type Ticket, type TipoTrabajo, type VistaTickets } from '@/api/tickets'
import { CapturaProtegida } from '@/components/tickets/CapturaProtegida'
import { BotonExcelDatos } from '@/components/ui/boton-excel'
import { Button } from '@/components/ui/button'
import { descargarExcel } from '@/utils/exportarExcel'

const vistas: VistaTickets[] = ['pendientes', 'aceptados', 'cerrados', 'rechazados']
const columnas: PipelineTicket[] = ['sin_tomar', 'tomado', 'en_progreso', 'listo']
const siguiente: Partial<Record<PipelineTicket, PipelineTicket>> = { tomado: 'en_progreso', en_progreso: 'listo', listo: 'cerrado' }
const razones: RazonRechazo[] = ['duplicado', 'no_es_error', 'informacion_insuficiente', 'no_aplica', 'otro']
const rotulo = (s: string) => s.replace(/_/g, ' ')
const fecha = (s: string) => new Date(s).toLocaleString('es-CO')

export default function TableroTicketsPage() {
  const [vista, setVista] = useState<VistaTickets>('pendientes')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [resumen, setResumen] = useState<ResumenTickets | null>(null)
  const [detalle, setDetalle] = useState<Ticket | null>(null)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [tipo, setTipo] = useState<TipoTrabajo>('soporte')
  const [razon, setRazon] = useState<RazonRechazo>('duplicado')
  const [motivo, setMotivo] = useState('')
  const [rechazando, setRechazando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    try {
      const [lista, totales] = await Promise.all([ticketsApi.listar({ vista, desde: desde || undefined, hasta: hasta || undefined, search: search || undefined, page, pageSize: vista === 'aceptados' ? 100 : 25 }), ticketsApi.resumen()])
      setTickets(lista.data); setTotalPages(lista.pagination?.totalPages ?? 1); setResumen(totales); setError('')
    } catch { setError('No se pudieron cargar los tickets.') }
  }, [vista, desde, hasta, search, page])
  useEffect(() => { void cargar() }, [cargar])

  const ejecutar = async (accion: () => Promise<unknown>) => {
    setOcupado(true); setError('')
    try { await accion(); setDetalle(null); setRechazando(false); await cargar(); window.dispatchEvent(new Event('tickets:actualizar')) }
    catch { setError('No se pudo completar la acción. Revisa el estado del ticket e intenta de nuevo.') }
    finally { setOcupado(false) }
  }
  const alSoltar = (result: DropResult) => {
    if (!result.destination) return
    const ticket = tickets.find(t => String(t.id) === result.draggableId)
    const destino = result.destination.droppableId as PipelineTicket
    if (!ticket || ticket.pipeline_estado === destino) return
    if (ticket.pipeline_estado === 'sin_tomar' && destino === 'tomado') void ejecutar(() => ticketsApi.tomar(ticket.id, tipo))
    else if (siguiente[ticket.pipeline_estado] === destino) void ejecutar(() => ticketsApi.mover(ticket.id, destino))
    else setError('Solo puedes mover un ticket a la siguiente etapa. Para cerrar uno listo, usa el botón de detalle.')
  }
  const exportar = async () => {
    const datos: Ticket[] = []
    let pagina = 1
    let paginas = 1
    do {
      const resultado = await ticketsApi.listar({ vista, desde: desde || undefined, hasta: hasta || undefined, search: search || undefined, page: pagina, pageSize: 100 })
      datos.push(...resultado.data)
      paginas = resultado.pagination?.totalPages ?? 1
      pagina++
    } while (pagina <= paginas)
    await descargarExcel(`tickets_${vista}_${new Date().toISOString().slice(0, 10)}`, [{ nombre: 'Tickets', columnas: [
    { titulo: 'ID', clave: 'id' }, { titulo: 'Creado', clave: 'creado' }, { titulo: 'Categoría', clave: 'categoria' }, { titulo: 'Título', clave: 'titulo', ancho: 36 },
    { titulo: 'Descripción', clave: 'descripcion', ancho: 60 }, { titulo: 'Reportado por', clave: 'reportante', ancho: 28 }, { titulo: 'Prioridad', clave: 'prioridad' },
    { titulo: 'Estado', clave: 'estado' }, { titulo: 'Etapa', clave: 'etapa' }, { titulo: 'Tipo de trabajo', clave: 'tipo' }, { titulo: 'Razón rechazo', clave: 'razon' }, { titulo: 'Motivo rechazo', clave: 'motivo', ancho: 45 },
  ], filas: datos.map(t => ({ id: t.id, creado: fecha(t.created_at), categoria: t.categoria, titulo: t.titulo, descripcion: t.descripcion, reportante: t.reportado_por_nombre, prioridad: t.prioridad, estado: t.estado, etapa: t.pipeline_estado, tipo: t.tipo_trabajo, razon: t.razon_rechazo, motivo: t.motivo_rechazo })) }])
  }

  const abrirDetalle = (ticket: Ticket) => {
    setDetalle(ticket)
    ticketsApi.detalle(ticket.id).then(data => setDetalle(actual => actual?.id === ticket.id ? data : actual)).catch(() => {})
  }
  const tarjeta = (ticket: Ticket) => <button type="button" onClick={() => abrirDetalle(ticket)} className="w-full rounded-lg border bg-card p-3 text-left shadow-sm hover:border-primary"><span className="text-xs text-muted-foreground">INC-{String(ticket.id).padStart(6, '0')} · {ticket.prioridad}</span><p className="font-semibold">{ticket.titulo}</p><p className="line-clamp-2 text-xs text-muted-foreground">{ticket.descripcion}</p><p className="mt-2 text-xs">{ticket.reportado_por_nombre}</p></button>
  return <div className="space-y-5 p-4 lg:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Tablero de tickets</h1><p className="text-sm text-muted-foreground">Aprobación y seguimiento de los reportes</p></div><div className="flex gap-2"><BotonExcelDatos exportar={exportar} disabled={!tickets.length} /><Button variant="outline" onClick={() => void cargar()}>Actualizar</Button></div></div>
    <div role="tablist" className="flex flex-wrap gap-2">{vistas.map(v => <button key={v} role="tab" aria-selected={vista === v} onClick={() => { setVista(v); setPage(1); setDetalle(null) }} className={`rounded-lg px-3 py-2 text-sm capitalize ${vista === v ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{v} ({resumen?.[v] ?? 0})</button>)}</div>
    <div className="flex flex-wrap gap-3"><label className="text-sm">Desde <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setPage(1) }} className="rounded border bg-background p-2" /></label><label className="text-sm">Hasta <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setPage(1) }} className="rounded border bg-background p-2" /></label><input aria-label="Buscar tickets" placeholder="Buscar título, descripción o reportante" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="min-w-64 flex-1 rounded border bg-background p-2 text-sm" /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {vista === 'aceptados' ? <DragDropContext onDragEnd={alSoltar}><div className="flex gap-3 overflow-x-auto pb-3">{columnas.map(columna => <div key={columna} className="w-64 shrink-0 rounded-xl bg-muted/60 p-2"><h2 className="mb-3 px-1 text-sm font-bold capitalize">{rotulo(columna)} ({resumen?.pipeline?.[columna] ?? tickets.filter(t => t.pipeline_estado === columna).length})</h2><DroppableContent columna={columna} tickets={tickets.filter(t => t.pipeline_estado === columna)} tarjeta={tarjeta} /></div>)}</div></DragDropContext> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tickets.map(t => <div key={t.id}>{tarjeta(t)}</div>)}</div>}
    {!tickets.length && !error && <p className="rounded border p-6 text-sm text-muted-foreground">No hay tickets en esta vista.</p>}
    {totalPages > 1 && <div className="flex items-center gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button><span>{page} / {totalPages}</span><Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button></div>}
    {detalle && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setDetalle(null) }}><div role="dialog" aria-modal="true" aria-label={`Ticket ${detalle.id}`} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-card p-5">
      <div className="flex justify-between gap-3"><h2 className="text-xl font-bold">INC-{String(detalle.id).padStart(6, '0')} · {detalle.titulo}</h2><button aria-label="Cerrar detalle" onClick={() => setDetalle(null)}>✕</button></div>
      <p className="text-xs text-muted-foreground">{fecha(detalle.created_at)} · {detalle.reportado_por_nombre} · {detalle.categoria} · prioridad {detalle.prioridad}</p><p className="whitespace-pre-wrap text-sm">{detalle.descripcion}</p>
      <p className="text-sm">Estado: <strong className="capitalize">{rotulo(detalle.estado)}</strong> · etapa: <strong className="capitalize">{rotulo(detalle.pipeline_estado)}</strong></p>
      {detalle.ruta && <p className="break-all text-xs text-muted-foreground">Ruta: {detalle.ruta}</p>}
      {detalle.tomado_por_nombre && <p className="text-xs text-muted-foreground">Tomado por {detalle.tomado_por_nombre}{detalle.tomado_at ? ` · ${fecha(detalle.tomado_at)}` : ''}</p>}
      {detalle.solucionado_por_nombre && <p className="text-xs text-muted-foreground">Cerrado por {detalle.solucionado_por_nombre}</p>}
      {!!detalle.capturas?.length && <div className="flex flex-wrap gap-2">{detalle.capturas.map(c => <CapturaProtegida key={c.id} captura={c} grande />)}</div>}
      {detalle.estado === 'rechazado' && <p>Rechazo: {rotulo(detalle.razon_rechazo ?? '')} · {detalle.motivo_rechazo}</p>}
      {detalle.estado === 'pendiente' && <div className="space-y-3"><div className="flex gap-2"><Button disabled={ocupado} onClick={() => void ejecutar(() => ticketsApi.aprobar(detalle.id))}>Aprobar</Button><Button variant="destructive" disabled={ocupado} onClick={() => setRechazando(true)}>Rechazar</Button></div>{rechazando && <div className="space-y-2 rounded border p-3"><label className="block text-sm">Razón <select value={razon} onChange={e => setRazon(e.target.value as RazonRechazo)} className="ml-2 rounded border bg-background p-2">{razones.map(r => <option key={r} value={r}>{rotulo(r)}</option>)}</select></label><textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo adicional" className="w-full rounded border bg-background p-2" /><Button disabled={ocupado} onClick={() => void ejecutar(() => ticketsApi.rechazar(detalle.id, razon, motivo.trim()))}>Confirmar rechazo</Button></div>}</div>}
      {detalle.estado === 'aprobado' && <div className="flex flex-wrap items-center gap-2">{detalle.pipeline_estado === 'sin_tomar' ? <><select value={tipo} onChange={e => setTipo(e.target.value as TipoTrabajo)} className="rounded border bg-background p-2"><option value="soporte">Soporte</option><option value="adicional">Adicional</option><option value="otro">Otro</option></select><Button disabled={ocupado} onClick={() => void ejecutar(() => ticketsApi.tomar(detalle.id, tipo))}>Tomar ticket</Button></> : siguiente[detalle.pipeline_estado] && <Button disabled={ocupado} onClick={() => void ejecutar(() => ticketsApi.mover(detalle.id, siguiente[detalle.pipeline_estado]!))}>Avanzar a {rotulo(siguiente[detalle.pipeline_estado]!)}</Button>}</div>}
    </div></div>}
  </div>
}

function DroppableContent({ columna, tickets, tarjeta }: { columna: PipelineTicket; tickets: Ticket[]; tarjeta: (ticket: Ticket) => React.ReactNode }) {
  return <Droppable droppableId={columna}>{provided => <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-24 space-y-2">{tickets.map((ticket, index) => <Draggable draggableId={String(ticket.id)} index={index} key={ticket.id}>{drag => <div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps}>{tarjeta(ticket)}</div>}</Draggable>)}{provided.placeholder}</div>}</Droppable>
}
