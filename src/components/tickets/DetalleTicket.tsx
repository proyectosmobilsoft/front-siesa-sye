import type { ReactNode } from 'react'
import type { Ticket } from '@/api/tickets'
import { CapturaProtegida } from './CapturaProtegida'

const rotulo = (valor: string) => valor.replace(/_/g, ' ')
const fecha = (valor: string) => new Date(valor).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'medium' })
const codigoTicket = (id: number) => `INC-${String(id).padStart(6, '0')}`

function contextoComoLista(contexto: Ticket['contexto']): [string, string][] {
  let datos: unknown = contexto
  if (typeof datos === 'string') { try { datos = JSON.parse(datos) } catch { return datos ? [['Contexto', datos as string]] : [] } }
  if (!datos || typeof datos !== 'object') return []
  return Object.entries(datos as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => [rotulo(k), typeof v === 'object' ? JSON.stringify(v) : String(v)])
}

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-border/50 py-1.5 text-sm last:border-0"><dt className="text-muted-foreground">{etiqueta}</dt><dd className="min-w-0 break-words font-medium">{children}</dd></div>
}

/** Toda la información del ticket: cuándo se publicó, quién, estado, quién y cuándo lo aprobó, rechazó, tomó o cerró. */
export function InfoTicket({ ticket }: { ticket: Ticket }) {
  const extra = ticket.contexto ? contextoComoLista(ticket.contexto) : []
  return <div className="space-y-3">
    <p className="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">{ticket.descripcion}</p>
    <dl>
      <Fila etiqueta="Publicado">{fecha(ticket.created_at)}</Fila>
      <Fila etiqueta="Reportado por">{ticket.reportado_por_nombre || '—'}</Fila>
      <Fila etiqueta="Categoría">{ticket.categoria} · prioridad {ticket.prioridad}</Fila>
      <Fila etiqueta="Estado"><span className="capitalize">{rotulo(ticket.estado)}</span> · etapa <span className="capitalize">{rotulo(ticket.pipeline_estado)}</span></Fila>
      {ticket.aprobado_at && <Fila etiqueta="Aprobado">{fecha(ticket.aprobado_at)}{ticket.aprobado_por_nombre ? ` · ${ticket.aprobado_por_nombre}` : ''}</Fila>}
      {ticket.rechazado_at && <Fila etiqueta="Rechazado">{fecha(ticket.rechazado_at)}{ticket.rechazado_por_nombre ? ` · ${ticket.rechazado_por_nombre}` : ''}</Fila>}
      {ticket.estado === 'rechazado' && <Fila etiqueta="Motivo"><span className="capitalize">{rotulo(ticket.razon_rechazo ?? '')}</span>{ticket.motivo_rechazo ? ` · ${ticket.motivo_rechazo}` : ''}</Fila>}
      {ticket.tomado_at && <Fila etiqueta="Tomado">{fecha(ticket.tomado_at)}{ticket.tomado_por_nombre ? ` · ${ticket.tomado_por_nombre}` : ''}{ticket.tipo_trabajo ? ` · ${ticket.tipo_trabajo}` : ''}</Fila>}
      {ticket.solucionado_at && <Fila etiqueta="Cerrado">{fecha(ticket.solucionado_at)}{ticket.solucionado_por_nombre ? ` · ${ticket.solucionado_por_nombre}` : ''}</Fila>}
      <Fila etiqueta="Última actualización">{fecha(ticket.updated_at)}</Fila>
      {ticket.ruta && <Fila etiqueta="Pantalla">{ticket.ruta}</Fila>}
      {extra.map(([clave, valor]) => <Fila key={clave} etiqueta={clave}>{valor}</Fila>)}
    </dl>
    {!!ticket.capturas?.length && <div className="flex flex-wrap gap-2">{ticket.capturas.map(c => <CapturaProtegida key={c.id} captura={c} grande />)}</div>}
  </div>
}

export function DetalleTicketModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <div role="dialog" aria-modal="true" aria-label={`Ticket ${codigoTicket(ticket.id)}`} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-card p-5">
      <div className="flex justify-between gap-3"><h2 className="text-xl font-bold">{codigoTicket(ticket.id)} · {ticket.titulo}</h2><button aria-label="Cerrar detalle" onClick={onClose}>✕</button></div>
      <InfoTicket ticket={ticket} />
    </div>
  </div>
}
