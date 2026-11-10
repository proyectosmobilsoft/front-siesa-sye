import { useId, useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PALETA, compacto, porcentaje } from './formato'
import type { Punto, Serie } from './graficas'

type Formato = (valor: number) => string
const EJE = { fontSize: 12, fill: 'hsl(var(--muted-foreground))' }
const REJILLA = 'hsl(var(--border))'
const tooltip = {
  contentStyle: { borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: 13 },
  labelStyle: { color: 'hsl(var(--foreground))' },
  itemStyle: { color: 'hsl(var(--foreground))' },
}
const leyenda = { iconType: 'circle' as const, wrapperStyle: { fontSize: 12, color: 'hsl(var(--muted-foreground))' } }

/** Mezcla dos colores hexadecimales sin depender del tema del navegador. */
function mezclar(color: string, destino: string, parte: number) {
  const canal = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16)
  return `#${[1, 3, 5].map(i => Math.round(canal(color, i) * (1 - parte) + canal(destino, i) * parte).toString(16).padStart(2, '0')).join('')}`
}
const oscuro = (c: string) => mezclar(c, '#000000', .28)
const claro = (c: string) => mezclar(c, '#ffffff', .24)
/** % de la leyenda: entero, salvo los menores a 1 % (0,14 % en vez de 0 %, para que la suma se entienda). */
const pctLeyenda = (v: number) => (v > 0 && v < 0.01 ? porcentaje(v, 2) : porcentaje(v, 0))
const idSeguro = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '')

// Debe llamarse como función ({defs(...)}): recharts solo pinta <defs> directo, no un componente propio.
function defs(id: string, colores: string[]) {
  return <defs>
    <filter id={`${id}-sombra`} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#000" floodOpacity=".18" /></filter>
    {colores.map((c, i) => <linearGradient key={i} id={`${id}-barra-${i}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={claro(c)} /><stop offset=".55" stopColor={c} /><stop offset="1" stopColor={oscuro(c)} /></linearGradient>)}
    {colores.map((c, i) => <radialGradient key={`d${i}`} id={`${id}-dona-${i}`} cx="35%" cy="30%" r="75%"><stop offset="0" stopColor={claro(c)} /><stop offset=".6" stopColor={c} /><stop offset="1" stopColor={oscuro(c)} /></radialGradient>)}
  </defs>
}

type Forma = { x?: number; y?: number; width?: number; height?: number; fill?: string }
function formaBarra(id: string, indice: number, color: string, horizontal: boolean) {
  return ({ x = 0, y = 0, width = 0, height = 0 }: Forma) => {
    if (width <= 0 || height <= 0) return <g />
    const prof = Math.min(7, horizontal ? height / 3 : width / 3)
    return <g filter={`url(#${id}-sombra)`}>
      <rect x={x} y={y} width={width} height={height} rx={horizontal ? 3 : 2} fill={`url(#${id}-barra-${indice})`} />
      {horizontal ? <>
        <polygon points={`${x + width},${y} ${x + width + prof},${y - prof} ${x + width + prof},${y + height - prof} ${x + width},${y + height}`} fill={oscuro(color)} />
        <polygon points={`${x},${y} ${x + prof},${y - prof} ${x + width + prof},${y - prof} ${x + width},${y}`} fill={claro(color)} />
      </> : <>
        <polygon points={`${x + width},${y} ${x + width + prof},${y - prof} ${x + width + prof},${y + height - prof} ${x + width},${y + height}`} fill={oscuro(color)} />
        <polygon points={`${x},${y} ${x + prof},${y - prof} ${x + width + prof},${y - prof} ${x + width},${y}`} fill={claro(color)} />
      </>}
    </g>
  }
}

export function Barras3D({ datos, formato, altura = 280, nombreValor = 'Valor', tooltipExtra, formatoEje = compacto, alClic }: { datos: Punto[]; formato: Formato; altura?: number; nombreValor?: string; tooltipExtra?: (nombre: string) => string; formatoEje?: Formato; /** Si se da, cada barra es clicable (recibe el índice en `datos`). */ alClic?: (indice: number) => void }) {
  const id = idSeguro(useId())
  const colores = useMemo(() => datos.map((p, i) => p.color ?? PALETA[i % PALETA.length]), [datos])
  return <div className="min-w-0 w-full" style={{ height: altura }} role="img" aria-label={`Barras de ${nombreValor}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={datos} margin={{ top: 14, right: 18, bottom: 8, left: 0 }}>
    {defs(id, colores)}<CartesianGrid stroke={REJILLA} vertical={false} /><XAxis dataKey="nombre" tick={EJE} tickLine={false} axisLine={{ stroke: REJILLA }} interval={0} height={datos.length > 7 ? 65 : 32} angle={datos.length > 7 ? -30 : 0} textAnchor={datos.length > 7 ? 'end' : 'middle'} /><YAxis tick={EJE} tickLine={false} axisLine={false} tickFormatter={formatoEje} width={52} />
    <Tooltip {...tooltip} formatter={(v, _n, item) => [formato(Number(v)), `${nombreValor}${tooltipExtra ? ` · ${tooltipExtra(String(item.payload.nombre))}` : ''}`]} /><Bar dataKey="valor" name={nombreValor} maxBarSize={42} isAnimationActive={false} cursor={alClic ? 'pointer' : undefined} onClick={alClic ? (_dato: unknown, indice: number) => alClic(indice) : undefined} shape={(valor: unknown) => { const p = valor as Forma & { index?: number }; return formaBarra(id, p.index ?? 0, colores[p.index ?? 0] ?? PALETA[0], false)(p) }}>{datos.map((p, i) => <Cell key={`${p.nombre}-${i}`} fill={colores[i]} />)}</Bar>
  </BarChart></ResponsiveContainer></div>
}

export function BarrasH3D({ datos, formato, nombreValor = 'Valor', anchoEtiqueta = 110 }: { datos: Punto[]; formato: Formato; nombreValor?: string; anchoEtiqueta?: number }) {
  const id = idSeguro(useId())
  const colores = useMemo(() => datos.map((p, i) => p.color ?? PALETA[i % PALETA.length]), [datos])
  return <div className="min-w-0 w-full" style={{ height: Math.max(160, datos.length * 38 + 40) }} role="img" aria-label={`Barras de ${nombreValor}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={datos} layout="vertical" margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
    {defs(id, colores)}<CartesianGrid stroke={REJILLA} horizontal={false} /><XAxis type="number" tick={EJE} tickLine={false} axisLine={false} tickFormatter={compacto} /><YAxis type="category" dataKey="nombre" tick={EJE} tickLine={false} axisLine={false} width={anchoEtiqueta} interval={0} /><Tooltip {...tooltip} formatter={v => [formato(Number(v)), nombreValor]} /><Bar dataKey="valor" barSize={18} isAnimationActive={false} shape={(valor: unknown) => { const p = valor as Forma & { index?: number }; return formaBarra(id, p.index ?? 0, colores[p.index ?? 0] ?? PALETA[0], true)(p) }}>{datos.map((p, i) => <Cell key={`${p.nombre}-${i}`} fill={colores[i]} />)}</Bar>
  </BarChart></ResponsiveContainer></div>
}

export function BarrasApiladas3D<T extends Record<string, unknown>>({ datos, ejeX, series, formato, altura = 300 }: { datos: T[]; ejeX: string; series: Serie[]; formato: Formato; altura?: number }) {
  const id = idSeguro(useId())
  return <div className="min-w-0 w-full" style={{ height: altura }} role="img" aria-label="Barras apiladas"><ResponsiveContainer width="100%" height="100%"><BarChart data={datos} margin={{ top: 14, right: 20, bottom: 8, left: 0 }}>
    {defs(id, series.map(s => s.color))}<CartesianGrid stroke={REJILLA} vertical={false} /><XAxis dataKey={ejeX} tick={EJE} tickLine={false} axisLine={{ stroke: REJILLA }} /><YAxis tick={EJE} tickLine={false} axisLine={false} tickFormatter={compacto} width={52} /><Tooltip {...tooltip} formatter={(v, n, item) => {
      // % de cada parte dentro de la barra (ej. vencido vs al día).
      const total = series.reduce((s, x) => s + (Number((item.payload as Record<string, unknown>)[x.clave]) || 0), 0)
      return [`${formato(Number(v))}${total ? ` (${porcentaje(Number(v) / total, 0)})` : ''}`, String(n)]
    }} /><Legend {...leyenda} />
    {series.map((s, i) => <Bar key={s.clave} dataKey={s.clave} name={s.nombre} stackId="total" fill={s.color} maxBarSize={42} isAnimationActive={false} shape={formaBarra(id, i, s.color, false)} />)}
  </BarChart></ResponsiveContainer></div>
}

export function Dona3D({ datos, formato, altura = 280, centro, porcentajeCentro }: { datos: Punto[]; formato: Formato; altura?: number; centro?: string; porcentajeCentro?: number | null }) {
  const id = idSeguro(useId())
  const colores = useMemo(() => datos.map((p, i) => p.color ?? PALETA[i % PALETA.length]), [datos])
  const total = datos.reduce((s, p) => s + p.valor, 0)
  return <div className="min-w-0 w-full" style={{ height: altura }} role="img" aria-label={`Dona de ${centro ?? 'distribución'}`}><ResponsiveContainer width="100%" height="100%"><PieChart margin={{ top: 2, right: 8, bottom: 8, left: 8 }}>
    {defs(id, colores)}
    <Pie data={datos} dataKey="valor" nameKey="nombre" cy="46%" innerRadius="52%" outerRadius="72%" paddingAngle={2} stroke="none" isAnimationActive={false} tooltipType="none" legendType="none">{datos.map((p, i) => <Cell key={`fondo-${p.nombre}-${i}`} fill={oscuro(colores[i])} />)}</Pie>
    <Pie data={datos} dataKey="valor" nameKey="nombre" cy="43%" innerRadius="52%" outerRadius="72%" paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={1} isAnimationActive={false}>{datos.map((p, i) => <Cell key={`${p.nombre}-${i}`} fill={`url(#${id}-dona-${i})`} />)}</Pie>
    <Tooltip {...tooltip} formatter={(v, n) => [`${formato(Number(v))} · ${total ? porcentaje(Number(v) / total, 1) : '0 %'}`, String(n)]} />
    {/* Leyenda explícita: si no, recharts también lista las porciones de la capa de sombra. */}
    <Legend {...leyenda} payload={datos.map((p, i) => ({ value: `${p.nombre} ${total ? pctLeyenda(p.valor / total) : ''}`, type: 'circle' as const, color: colores[i], id: `${p.nombre}-${i}` }))} />
    <text x="50%" y="39%" textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--foreground))" fontSize="23" fontWeight="700">{porcentaje(porcentajeCentro ?? (total ? Math.max(...datos.map(p => p.valor)) / total : 0), 0)}</text>
    <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--muted-foreground))" fontSize="11">{centro ?? 'del total'}</text>
  </PieChart></ResponsiveContainer></div>
}
