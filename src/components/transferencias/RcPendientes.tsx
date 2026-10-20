import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { SoporteProtegido } from './SoporteProtegido'
import { transferenciasConfirmacionApi, type ConfirmacionTransferencia } from '@/api/transferenciasConfirmacion'
import { Button } from '@/components/ui/button'
import { formatters } from '@/utils/formatters'
import { esperaActual } from './tiempos'
import { facturaTexto, medioTexto, resumenPayload } from './payload'

function MiniaturaSoporte({ id }: { id: number }) {
  const detalle = useQuery({ queryKey: ['transferencias-confirmacion', 'detalle', id], queryFn: () => transferenciasConfirmacionApi.detalle(id), staleTime: 30_000 })
  const soporte = detalle.data?.soportes?.[0]
  if (!soporte) return <span className="flex h-14 w-14 items-center justify-center rounded border border-border text-muted-foreground"><FileText className="h-6 w-6" /></span>
  return <SoporteProtegido url={soporte.url} mime={soporte.mime ?? ''} nombre={soporte.nombre_original} variante="miniatura" />
}

export function RcPendientes({ rows, ahora, onDetalle }: { rows: ConfirmacionTransferencia[]; ahora: number; onDetalle: (id: number) => void }) {
  return <div className="divide-y divide-border">{rows.map(row => {
    const payload = resumenPayload(row)
    return <div key={row.id} className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/30">
      <MiniaturaSoporte id={row.id} />
      <div className="min-w-44 flex-1 space-y-1 text-sm">
        <p className="font-semibold">{row.conductor_nombre || 'Conductor sin nombre'} <span className="font-normal text-muted-foreground">→ {row.razon_social || (typeof payload?.cliente === 'string' ? payload.cliente : payload?.cliente?.razon_social || payload?.cliente?.nombre) || `Cliente #${row.rowid_tercero}`}</span></p>
        <p className="text-xs text-muted-foreground">Facturas: {payload?.facturas?.map(facturaTexto).join(', ') || '—'}</p>
        <p className="text-xs text-muted-foreground">Medios: {payload?.medios?.map(medioTexto).join(', ') || '—'}</p>
        <p className="text-xs text-muted-foreground">Enviado: {formatters.dateTime(row.created_at)} · Lleva esperando {esperaActual(row.created_at, ahora)} min</p>
      </div>
      <div className="flex items-center gap-3"><strong className="whitespace-nowrap tabular-nums">{formatters.currency(Number(row.valor) || 0)}</strong><Button size="sm" variant="outline" onClick={() => onDetalle(row.id)}>Ver detalle</Button></div>
    </div>
  })}</div>
}
