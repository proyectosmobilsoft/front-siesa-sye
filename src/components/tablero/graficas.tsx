import { Fragment } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { PALETA, compacto } from './formato'

// Gráficas de los dashboards, mismo diseño que vehiman_react (src/dashboard/graficas.tsx):
// rejilla y ejes recesivos, barras con punta redondeada, tooltip con tarjeta.
// Los colores de ejes/rejilla/tooltip salen de las variables del tema para
// que funcionen igual en claro y oscuro.

const EJE = { fontSize: 12, fill: 'hsl(var(--muted-foreground))' }
const REJILLA = 'hsl(var(--border))'

type Formato = (v: number) => string

const estiloTooltip = {
  contentStyle: {
    borderRadius: 12,
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
    boxShadow: '0 8px 24px -8px rgba(14,23,38,0.25)',
    fontSize: 13,
  },
  labelStyle: { color: 'hsl(var(--foreground))', fontWeight: 600 },
  itemStyle: { color: 'hsl(var(--foreground))' },
  cursor: { fill: 'hsl(var(--muted))', fillOpacity: 0.6 },
}

const leyenda = { iconType: 'circle' as const, wrapperStyle: { fontSize: 12.5, color: 'hsl(var(--muted-foreground))' } }

export interface Punto {
  nombre: string
  valor: number
  /** Color de la barra o porción; si falta, el primero de la paleta. */
  color?: string
}

/** Barras verticales de una sola serie. */
export function Barras({ datos, formato, altura = 280, color = PALETA[0], nombreValor = 'Valor' }: { datos: Punto[]; formato: Formato; altura?: number; color?: string; nombreValor?: string }) {
  const inclinar = datos.length > 8
  return (
    <div style={{ height: altura }} role="img" aria-label={`Gráfica de barras de ${nombreValor}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={REJILLA} vertical={false} />
          <XAxis dataKey="nombre" tick={EJE} tickLine={false} axisLine={{ stroke: REJILLA }} interval={0} angle={inclinar ? -30 : 0} textAnchor={inclinar ? 'end' : 'middle'} height={inclinar ? 64 : 30} />
          <YAxis tick={EJE} tickLine={false} axisLine={false} tickFormatter={(v: number) => compacto(v)} width={52} />
          <Tooltip {...estiloTooltip} formatter={(v) => [formato(Number(v)), nombreValor]} />
          <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={44} animationDuration={600}>
            {datos.map((d) => (
              <Cell key={d.nombre} fill={d.color ?? color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Barras horizontales: mejor para nombres largos (conductores, clientes, motivos). */
export function BarrasH({ datos, formato, color = PALETA[0], nombreValor = 'Valor', anchoEtiqueta = 130 }: { datos: Punto[]; formato: Formato; color?: string; nombreValor?: string; anchoEtiqueta?: number }) {
  const altura = Math.max(140, datos.length * 34 + 30)
  return (
    <div style={{ height: altura }} role="img" aria-label={`Gráfica de barras de ${nombreValor}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={REJILLA} horizontal={false} />
          <XAxis type="number" tick={EJE} tickLine={false} axisLine={false} tickFormatter={(v: number) => compacto(v)} />
          <YAxis type="category" dataKey="nombre" tick={EJE} tickLine={false} axisLine={false} width={anchoEtiqueta} interval={0} />
          <Tooltip {...estiloTooltip} formatter={(v) => [formato(Number(v)), nombreValor]} />
          <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={18} animationDuration={600}>
            {datos.map((d) => (
              <Cell key={d.nombre} fill={d.color ?? color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Dona con leyenda (parte de un todo, máximo 6 porciones). */
export function Dona({ datos, formato, altura = 260 }: { datos: Punto[]; formato: Formato; altura?: number }) {
  return (
    <div style={{ height: altura }} role="img" aria-label="Gráfica circular">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={datos} dataKey="valor" nameKey="nombre" innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2} animationDuration={600}>
            {datos.map((d, i) => (
              <Cell key={d.nombre} fill={d.color ?? PALETA[i % PALETA.length]} />
            ))}
          </Pie>
          <Tooltip {...estiloTooltip} formatter={(v, n) => [formato(Number(v)), String(n)]} />
          <Legend {...leyenda} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export interface Serie {
  clave: string
  nombre: string
  color: string
}

/** Barras apiladas por categoría del eje X (ej. recaudo por mes: app + SIESA). */
export function BarrasApiladas<T extends Record<string, unknown>>({ datos, ejeX, series, formato, altura = 300 }: { datos: T[]; ejeX: string; series: Serie[]; formato: Formato; altura?: number }) {
  return (
    <div style={{ height: altura }} role="img" aria-label="Gráfica de barras apiladas">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={REJILLA} vertical={false} />
          <XAxis dataKey={ejeX} tick={EJE} tickLine={false} axisLine={{ stroke: REJILLA }} />
          <YAxis tick={EJE} tickLine={false} axisLine={false} tickFormatter={(v: number) => compacto(v)} width={52} />
          <Tooltip {...estiloTooltip} formatter={(v, n) => [formato(Number(v)), String(n)]} />
          <Legend {...leyenda} />
          {series.map((s, i) => (
            <Bar
              key={s.clave}
              dataKey={s.clave}
              name={s.nombre}
              stackId="pila"
              fill={s.color}
              // Separación de 2px entre segmentos con el color de la tarjeta.
              stroke="hsl(var(--card))"
              strokeWidth={2}
              radius={i === series.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={44}
              animationDuration={600}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Área con degradado para una o varias series en el tiempo (sin apilar). */
export function Areas<T extends Record<string, unknown>>({ datos, ejeX, series, formato, altura = 280 }: { datos: T[]; ejeX: string; series: Serie[]; formato: Formato; altura?: number }) {
  return (
    <div style={{ height: altura }} role="img" aria-label="Gráfica de área">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.clave} id={`degradado-${s.clave}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={REJILLA} vertical={false} />
          <XAxis dataKey={ejeX} tick={EJE} tickLine={false} axisLine={{ stroke: REJILLA }} />
          <YAxis tick={EJE} tickLine={false} axisLine={false} tickFormatter={(v: number) => compacto(v)} width={52} />
          <Tooltip {...estiloTooltip} formatter={(v, n) => [formato(Number(v)), String(n)]} />
          {series.length > 1 && <Legend {...leyenda} />}
          {series.map((s) => (
            <Area
              key={s.clave}
              type="monotone"
              dataKey={s.clave}
              name={s.nombre}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#degradado-${s.clave})`}
              dot={{ r: 3, strokeWidth: 0, fill: s.color }}
              activeDot={{ r: 5, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
              animationDuration={700}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Venta mensual con línea de meta y barras discretas del año anterior. */
export function BarrasConMeta({ datos }: { datos: { nombre: string; venta: number; meta: number | null; anterior: number }[] }) {
  return <div className="h-[300px]" role="img" aria-label="Venta, meta y año anterior por mes"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={datos} margin={{ top: 10, right: 16, bottom: 8, left: 0 }}>
    <CartesianGrid stroke={REJILLA} vertical={false} /><XAxis dataKey="nombre" tick={EJE} tickLine={false} axisLine={{ stroke: REJILLA }} /><YAxis tick={EJE} tickLine={false} axisLine={false} tickFormatter={compacto} width={52} />
    <Tooltip {...estiloTooltip} formatter={(v, n) => [compacto(Number(v)), String(n)]} /><Legend {...leyenda} />
    <Bar dataKey="anterior" name="Año anterior" fill="hsl(var(--muted-foreground))" fillOpacity={0.22} maxBarSize={28} radius={[5, 5, 0, 0]} />
    <Bar dataKey="venta" name="Venta" fill={PALETA[0]} maxBarSize={28} radius={[5, 5, 0, 0]} />
    <Line dataKey="meta" name="Meta" stroke={PALETA[2]} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} />
  </ComposedChart></ResponsiveContainer></div>
}

/** Cumplimiento por grupo con referencia del 100 %. */
export function BarrasCumplimiento({ datos }: { datos: { nombre: string; valor: number }[] }) {
  return <div style={{ height: Math.max(200, datos.length * 42 + 42) }} role="img" aria-label="Cumplimiento por grupo"><ResponsiveContainer width="100%" height="100%"><BarChart data={datos} layout="vertical" margin={{ top: 8, right: 48, bottom: 8, left: 0 }}>
    <CartesianGrid stroke={REJILLA} horizontal={false} /><XAxis type="number" domain={[0, Math.max(1.2, ...datos.map(d => d.valor))]} tick={EJE} tickFormatter={(v: number) => `${Math.round(v * 100)} %`} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="nombre" tick={EJE} tickLine={false} axisLine={false} width={130} interval={0} />
    <Tooltip {...estiloTooltip} formatter={(v) => [`${Math.round(Number(v) * 100)} %`, 'Cumplimiento']} /><ReferenceLine x={1} stroke={PALETA[2]} strokeDasharray="4 4" />
    <Bar dataKey="valor" barSize={19} radius={[0, 5, 5, 0]}>{datos.map(d => <Cell key={d.nombre} fill={d.valor >= 1 ? PALETA[1] : d.valor >= .8 ? PALETA[2] : PALETA[5]} />)}<LabelList dataKey="valor" position="right" formatter={(v: number) => `${Math.round(v * 100)} %`} style={EJE} /></Bar>
  </BarChart></ResponsiveContainer></div>
}


export function BarrasComparadas({ datos, formato, etiquetas = ['Venta', 'Meta'] }: {
  datos: { nombre: string; actual: number; meta: number; cumplimiento?: number | null }[]
  formato: Formato
  etiquetas?: [string, string]
}) {
  return (
    <div className="max-h-[560px] overflow-y-auto" role="img" aria-label={`${etiquetas[0]} frente a ${etiquetas[1]}`}><div style={{ height: Math.max(220, datos.length * 43 + 45) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ right: 16, left: 0 }}>
          <CartesianGrid stroke={REJILLA} horizontal={false} />
          <XAxis type="number" tick={EJE} tickFormatter={compacto} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="nombre" width={135} tick={EJE} tickLine={false} axisLine={false} interval={0} />
          <Tooltip {...estiloTooltip} formatter={(v, n) => [formato(Number(v)), String(n)]} />
          <Legend {...leyenda} />
          <Bar dataKey="actual" name={etiquetas[0]} barSize={11} radius={[0, 5, 5, 0]}>
            {datos.map((d) => <Cell key={d.nombre} fill={d.cumplimiento == null ? PALETA[0] : d.cumplimiento >= 1 ? PALETA[1] : d.cumplimiento >= 0.8 ? PALETA[2] : PALETA[5]} />)}
          </Bar>
          <Bar dataKey="meta" name={etiquetas[1]} fill="hsl(var(--muted-foreground))" fillOpacity={0.35} barSize={7} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div></div>
  )
}

export function BarrasApiladasH({ datos, series, formato }: {
  datos: Record<string, string | number>[]
  series: Serie[]
  formato: Formato
}) {
  return (
    <div style={{ height: Math.max(200, datos.length * 34 + 55) }} role="img" aria-label="Gráfica horizontal apilada">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ right: 12 }}>
          <CartesianGrid stroke={REJILLA} horizontal={false} />
          <XAxis type="number" tick={EJE} tickFormatter={compacto} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="nombre" width={140} tick={EJE} tickLine={false} axisLine={false} interval={0} />
          <Tooltip {...estiloTooltip} formatter={(v, n) => [formato(Number(v)), String(n)]} />
          <Legend {...leyenda} />
          {series.map((serie) => <Bar key={serie.clave} dataKey={serie.clave} name={serie.nombre} stackId="total" fill={serie.color} barSize={20} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ClientesDispersion({ datos }: {
  datos: { nombre: string; dias: number; valor: number }[]
}) {
  return (
    <div className="h-72" role="img" aria-label="Valor cobrado frente a días de pago por cliente">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ right: 16 }}>
          <CartesianGrid stroke={REJILLA} />
          <XAxis type="number" dataKey="dias" name="Días de pago" tick={EJE} tickLine={false} unit=" d" />
          <YAxis type="number" dataKey="valor" name="Cobrado" tick={EJE} tickFormatter={compacto} tickLine={false} width={55} />
          <Tooltip {...estiloTooltip} cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const punto = payload[0].payload as { nombre: string; dias: number; valor: number }
            return <div className="rounded-xl border border-border bg-card p-3 text-xs text-foreground shadow-lg"><strong>{punto.nombre}</strong><div>{dineroGrafica(punto.valor)} · {punto.dias.toFixed(1)} días</div></div>
          }} />
          <ZAxis type="number" dataKey="valor" range={[80, 420]} />
          <Scatter data={datos} fill={PALETA[0]} fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

const dineroGrafica = (valor: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor)

export function MapaCalor({ filas, meses, formato }: {
  filas: { nombre: string; valores: number[] }[]
  meses: string[]
  formato: Formato
}) {
  return (
    <div className="max-h-[560px] overflow-auto" role="img" aria-label="Mapa de calor de venta mensual por proveedor">
      <div className="grid min-w-max gap-1" style={{ gridTemplateColumns: `minmax(150px, 1.5fr) repeat(${meses.length}, minmax(65px, 1fr))` }}>
        <span />
        {meses.map((mes) => <span key={mes} className="text-center text-xs text-muted-foreground">{mes}</span>)}
        {filas.map((fila) => {
          const maximo = Math.max(1, ...fila.valores)
          return <Fragment key={fila.nombre}>
            <span className="truncate py-2 text-xs text-foreground" title={fila.nombre}>{fila.nombre}</span>
            {fila.valores.map((valor, indice) => <span key={meses[indice]} title={`${fila.nombre} · ${meses[indice]}: ${formato(valor)}`} className="rounded-md py-2 text-center text-[11px] tabular-nums text-foreground" style={{ backgroundColor: `hsl(var(--primary) / ${0.06 + valor / maximo * 0.44})` }}>{compacto(valor)}</span>)}
          </Fragment>
        })}
      </div>
    </div>
  )
}
