import { useId, useMemo } from 'react'
import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardCartera } from '../ventas/tipos'
import { compacto, dinero, etiquetaMes, porcentaje } from '../formato'

type Mes = DashboardCartera['historia'][number]
export function LineaTiempo({ historia, desde, hasta }: { historia: Mes[]; desde: string; hasta: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  // El mes en curso va incompleto: se marca para que no se lea como una caída.
  const mesActual = new Date().toISOString().slice(0, 7)
  const datos = useMemo(() => historia.map(m => ({ ...m, etiqueta: m.mes === mesActual ? `${etiquetaMes(m.mes)} (en curso)` : etiquetaMes(m.mes) })), [historia, mesActual])
  const inicio = datos.find(m => m.mes >= desde.slice(0, 7))?.etiqueta
  const fin = [...datos].reverse().find(m => m.mes <= hasta.slice(0, 7))?.etiqueta
  return <div className="h-[310px] w-full min-w-0" role="img" aria-label="Línea de tiempo de vendido a crédito, recaudado y vencido por mes">
    <ResponsiveContainer width="100%" height="100%"><ComposedChart data={datos} margin={{ top: 16, right: 8, bottom: 8, left: 0 }}>
      <defs><linearGradient id={`${id}-credito`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0891b2" stopOpacity={0.3} /><stop offset="100%" stopColor="#0891b2" stopOpacity={0} /></linearGradient></defs>
      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 4" vertical={false} />
      {inicio && fin && inicio !== fin && <ReferenceArea x1={inicio} x2={fin} fill="hsl(var(--primary))" fillOpacity={0.08} strokeOpacity={0} />}
      {inicio && fin && inicio === fin && <ReferenceLine x={inicio} stroke="hsl(var(--primary))" strokeOpacity={0.55} strokeDasharray="4 4" />}
      <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={compacto} width={52} />
      <Tooltip content={({ active, payload }) => {
        if (!active || !payload?.length) return null
        const m = payload[0].payload as Mes & { etiqueta: string }
        return <div className="rounded-xl border border-border bg-card p-3 text-xs text-foreground shadow-lg"><p className="mb-2 font-black">{m.etiqueta}</p><p>Vendido a crédito: <b>{dinero(m.vendido_credito)}</b></p><p>Recaudado: <b>{dinero(m.recaudo_credito)}</b></p><p>Vencido de ese mes: <b>{dinero(m.vencido_hoy)}</b></p><p className="mt-1 text-muted-foreground">Recaudado / vendido: {m.vendido_credito ? porcentaje(m.recaudo_credito / m.vendido_credito, 0) : '—'}</p></div>
      }} />
      <Area dataKey="vendido_credito" name="Vendido a crédito" type="monotone" stroke="#0891b2" strokeWidth={2.5} fill={`url(#${id}-credito)`} isAnimationActive={false} />
      <Bar dataKey="vencido_hoy" name="Quedó vencido de ese mes" fill="#e11d48" fillOpacity={0.8} maxBarSize={16} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      <Line dataKey="recaudo_credito" name="Recaudado" type="monotone" stroke="#059669" strokeWidth={2.5} dot={false} isAnimationActive={false} />
    </ComposedChart></ResponsiveContainer>
  </div>
}
