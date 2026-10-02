import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
