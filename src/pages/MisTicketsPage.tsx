import { useEffect, useState } from 'react'
import { ticketsApi, type Ticket } from '@/api/tickets'
import { CapturaProtegida } from '@/components/tickets/CapturaProtegida'
import { Button } from '@/components/ui/button'

const fecha = (valor: string) => new Date(valor).toLocaleString('es-CO')
export default function MisTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const cargar = () => { setCargando(true); ticketsApi.mis().then(data => { setTickets(data); setError('') }).catch(() => setError('No se pudieron cargar tus tickets.')).finally(() => setCargando(false)) }
  useEffect(cargar, [])
  return <div className="mx-auto max-w-5xl space-y-5 p-4 lg:p-8">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Mis tickets</h1><p className="text-sm text-muted-foreground">Estado de los problemas y mejoras que reportaste</p></div><Button variant="outline" onClick={cargar}>Actualizar</Button></div>
    {cargando && <p>Cargando...</p>}{error && <p role="alert" className="text-destructive">{error}</p>}
    {!cargando && !error && !tickets.length && <p className="rounded-lg border p-6 text-muted-foreground">Aún no has creado tickets.</p>}
    {tickets.map(ticket => <article key={ticket.id} className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">INC-{String(ticket.id).padStart(6, '0')} · {ticket.titulo}</h2><span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold capitalize">{ticket.estado.replace('_', ' ')} · {ticket.pipeline_estado.replace('_', ' ')}</span></div>
      <p className="mt-1 text-xs text-muted-foreground">{fecha(ticket.created_at)} · {ticket.categoria} · prioridad {ticket.prioridad}</p><p className="mt-3 whitespace-pre-wrap text-sm">{ticket.descripcion}</p>
      {ticket.estado === 'rechazado' && <p className="mt-3 rounded bg-destructive/10 p-3 text-sm"><strong>Motivo del rechazo:</strong> {ticket.razon_rechazo?.replace(/_/g, ' ')}{ticket.motivo_rechazo ? ` · ${ticket.motivo_rechazo}` : ''}</p>}
      {!!ticket.capturas?.length && <div className="mt-3 flex flex-wrap gap-2">{ticket.capturas.map(c => <CapturaProtegida key={c.id} captura={c} />)}</div>}
    </article>)}
  </div>
}
