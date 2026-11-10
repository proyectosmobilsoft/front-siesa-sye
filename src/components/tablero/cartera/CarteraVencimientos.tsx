import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { hoyLocalIso } from '@/hooks/useFechasLimite'
import { Modal } from '@/components/ui/modal'
import { Bloque, CuerpoConsulta, Malla, SubPestanas, Tabla, Tarjeta } from '../comun'
import { Areas } from '../graficas'
import { Barras3D, BarrasH3D, BarrasApiladas3D, Dona3D } from '../graficas3d'
import { CasosEspeciales } from './CasosEspeciales'
import { DescuentosCalle } from './DescuentosCalle'
import { VencidasPeriodo } from './VencidasPeriodo'
import { ClientesAcordeon } from './ClientesAcordeon'
import { CuadreSaldos } from './CuadreSaldos'
import { useSaldosCartera } from './usoSaldos'
import { VentasCorporativas } from './VentasCorporativas'
import { TarjetaBoton } from './TarjetaBoton'
import { KpiCartera } from './KpiCartera'
import { LineaTiempo } from './LineaTiempo'
import { BanknoteArrowDown, CalendarClock, CircleAlert, Wallet } from 'lucide-react'
import { BarraEstados, ComoLeer, Lectura } from '../Guia'
import { PALETA, compacto, decimal, dinero, entero, etiquetaMes, porcentaje } from '../formato'
import type { CasosCartera, DescuentosCartera, ClienteCartera, DashboardCartera, EstadoFacturaCartera, FacturaCartera, PlazoCartera, RespuestaFacturasCartera } from '../ventas/tipos'

const FUENTE = 'Facturas de venta con saldo en SIESA (t353), con los días de la condición de pago de cada factura y los abonos con fecha (t354). Sin IVA no aplica: el valor es el total de la factura.'
const dias = (v: number | null) => (v == null ? '—' : `${decimal(v, 0)} d`)
const desviacion = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : ''}${decimal(v, 0)} d`)

function colorDesviacion(v: number | null) {
  if (v == null) return ''
  if (v <= 0) return 'text-emerald-700'
  return v <= 10 ? 'text-amber-700' : 'text-red-700'
}

const GLOSARIO = [
  { termino: 'Plazo (condición de pago)', significado: 'Los días que le das al cliente para pagar. "Crédito a 8 días" = debe pagar a los 8 días de la factura.' },
  { termino: 'Pagada a tiempo', significado: 'El cliente pagó en la fecha de vencimiento o antes.' },
  { termino: 'Pagada tarde', significado: 'Pagó, pero después de la fecha de vencimiento.' },
  { termino: 'Vencida sin pagar', significado: 'Ya pasó la fecha de vencimiento y todavía debe. Es la que hay que ir a cobrar.' },
  { termino: 'Por vencer', significado: 'Aún está dentro del plazo; no se le puede reclamar todavía.' },
  { termino: 'Crédito', significado: `Facturas con plazo de 8 días o más. Contado, anticipado y contraentrega no cuentan como crédito.` },
]
const ESTADOS_BARRA = [
  { clave: 'a_tiempo', etiqueta: 'Pagadas a tiempo', clase: 'bg-emerald-500' },
  { clave: 'tarde', etiqueta: 'Pagadas tarde', clase: 'bg-amber-400' },
  { clave: 'impaga_vencida', etiqueta: 'Vencidas sin pagar', clase: 'bg-red-500' },
  { clave: 'por_vencer', etiqueta: 'Aún en plazo', clase: 'bg-slate-300 dark:bg-slate-600' },
] as const
const deCada10 = (pct: number | null) => (pct == null ? null : Math.round(pct * 10))
const Fuerte = ({ children }: { children: React.ReactNode }) => <strong className="font-semibold text-foreground">{children}</strong>

export function CarteraVencimientos({ d, sub, alElegirSub }: { d: DashboardCartera; sub: string; alElegirSub: (valor: string) => void }) {
  const casos = useQuery({
    queryKey: ['dashboard-cartera-casos', d.desde, d.hasta],
    queryFn: async () => (await apiClient.get<{ success: boolean; data: CasosCartera }>('/dashboard/cartera/casos', { params: { desde: d.desde, hasta: d.hasta } })).data.data,
    staleTime: 5 * 60 * 1000,
  })
  const descuentos = useQuery({
    queryKey: ['dashboard-cartera-descuentos', d.desde, d.hasta],
    queryFn: async () => (await apiClient.get<{ success: boolean; data: DescuentosCartera }>('/dashboard/cartera/descuentos', { params: { desde: d.desde, hasta: d.hasta } })).data.data,
    staleTime: 5 * 60 * 1000,
    enabled: sub === 'descuentos' || sub === 'corporativas',
  })
  const totalCasos = casos.data ? casos.data.contraentrega.problema_documentos + casos.data.c01.erroneas_documentos : 0
  const opciones = [
    { valor: 'resumen', etiqueta: 'Resumen' },
    { valor: 'plazos', etiqueta: '¿Pagan a tiempo?' },
    { valor: 'seguimiento', etiqueta: '¿Quién no paga?' },
    { valor: 'proyeccion', etiqueta: '¿Cuánto voy a cobrar?' },
    { valor: 'mensual', etiqueta: 'Mes a mes' },
    { valor: 'descuentos', etiqueta: 'Plata en la calle y descuentos' },
    { valor: 'corporativas', etiqueta: 'Ventas corporativas' },
    { valor: 'casos', etiqueta: `Casos especiales${totalCasos > 0 ? ` · ${entero(totalCasos)}` : ''}` },
  ]
  const activa = opciones.some(o => o.valor === sub) ? sub : 'resumen'

  return (
    <SubPestanas opciones={opciones} activa={activa} alElegir={alElegirSub}>
      <div className="flex flex-col gap-4">
        {activa === 'resumen' && <Resumen d={d} irA={alElegirSub} totalCasos={totalCasos} />}
        {activa === 'plazos' && <PagoPorPlazo d={d} />}
        {activa === 'seguimiento' && <Seguimiento d={d} />}
        {activa === 'proyeccion' && <Proyeccion d={d} />}
        {activa === 'mensual' && <Mensual d={d} />}
        {activa === 'corporativas' && <VentasCorporativas d={d} descuentos={descuentos.data} />}
        {activa === 'descuentos' && <CuerpoConsulta consulta={cuerpo(descuentos)} vacio={descuentos.data == null} altura="h-80">{descuentos.data && <DescuentosCalle d={descuentos.data} />}</CuerpoConsulta>}
        {activa === 'casos' && <CuerpoConsulta consulta={cuerpo(casos)} vacio={casos.data == null} altura="h-80">{casos.data && <CasosEspeciales d={casos.data} />}</CuerpoConsulta>}

      </div>
    </SubPestanas>
  )
}

/** Lo que el área de cobro necesita ver primero para el rango elegido. */
function Resumen({ d, irA, totalCasos }: { d: DashboardCartera; irA: (v: string) => void; totalCasos: number }) {
  const k = d.kpis
  const [detalle, setDetalle] = useState<'credito' | 'todos' | 'pendientes' | null>(null)
  const [periodo, setPeriodo] = useState<string | null>(null)
  const [antigua, setAntigua] = useState(false)
  const saldos = useSaldosCartera(d.desde, d.hasta)
  const credito = useMemo(() => d.plazos.filter(p => p.credito), [d.plazos])
  const vencRango = useMemo(() => ({
    facturas: credito.reduce((n, p) => n + p.cumplimiento.impaga_vencida.facturas, 0),
    saldo: credito.reduce((n, p) => n + p.vencido, 0),
  }), [credito])
  const mesesRango = useMemo(() => d.historia.filter(m => m.mes >= d.desde.slice(0, 7) && m.mes <= d.hasta.slice(0, 7)), [d.historia, d.desde, d.hasta])
  const recaudado = useMemo(() => mesesRango.reduce((n, m) => n + m.recaudo_credito, 0), [mesesRango])
  // Comparar contra el mes anterior solo tiene sentido si el rango es UN mes ya cerrado.
  const mesRango = d.desde.slice(0, 7)
  const unMes = mesRango === d.hasta.slice(0, 7)
  const enCurso = unMes && mesRango === hoyLocalIso().slice(0, 7)
  const iMes = unMes && !enCurso ? d.historia.findIndex(m => m.mes === mesRango) : -1
  const ultimo = iMes >= 0 ? d.historia[iMes] : undefined
  const anterior = iMes > 0 ? d.historia[iMes - 1] : undefined
  const nMeses = d.historia.filter(m => m.mes >= mesRango && m.mes <= d.hasta.slice(0, 7)).length
  const sinComparacion = enCurso ? 'Mes en curso · aún sin comparar' : unMes ? 'Sin datos del mes anterior' : `Rango de ${nMeses} meses · ver línea de tiempo`
  const MESES_NOMBRE = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const etiquetaAnterior = anterior ? MESES_NOMBRE[Number(anterior.mes.slice(5, 7)) - 1] : 'mes anterior'
  const comparar = { sinComparacion, etiquetaAnterior }
  const topDeudores = useMemo(() => [...d.deudores].sort((a, b) => b.vencido - a.vencido).slice(0, 10), [d.deudores])
  return <>
    <PorCobrarDelRango d={d} facturas={vencRango.facturas} saldo={vencRango.saldo} alAbrir={() => setDetalle('pendientes')} />
    {saldos.data && <CuadreSaldos c={saldos.data} desde={d.desde} hasta={d.hasta} titulo="¿Cómo empezó y cómo terminó la cartera?" />}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCartera {...comparar} titulo="Vendido a crédito" valor={dinero(k.venta_credito)} nota={`${k.credito_pct == null ? '—' : porcentaje(k.credito_pct, 0)} de lo vendido`} icono={Wallet} tono="cyan" serie={d.historia.map(m => m.vendido_credito)} actual={ultimo?.vendido_credito} anterior={anterior?.vendido_credito} alAbrir={() => setDetalle('credito')} />
      <KpiCartera {...comparar} titulo="Recaudado" valor={dinero(recaudado)} nota="Cobrado de facturas a crédito" icono={BanknoteArrowDown} tono="emerald" serie={d.historia.map(m => m.recaudo_credito)} actual={ultimo?.recaudo_credito} anterior={anterior?.recaudo_credito} alAbrir={() => irA('mensual')} />
      <KpiCartera {...comparar} titulo="Vencidas del periodo" valor={dinero(vencRango.saldo)} nota={`${entero(vencRango.facturas)} facturas por cobrar`} icono={CircleAlert} tono="rose" serie={d.historia.map(m => m.vencido_hoy)} actual={ultimo?.vencido_hoy} anterior={anterior?.vencido_hoy} subirEsBueno={false} alAbrir={() => setDetalle('pendientes')} />
      <KpiCartera titulo="Toda la cartera hoy" valor={dinero(k.cartera_abierta)} nota={`${k.vencida_pct == null ? '—' : porcentaje(k.vencida_pct, 0)} vencido · saldo de hoy · desde 2023, sin ventas corporativas`} icono={CalendarClock} tono="amber" alAbrir={() => setDetalle('todos')} />
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Bloque className="border-0 shadow-sm ring-0 lg:col-span-2 [&_h2]:font-black [&_h2]:tracking-tight" titulo="Línea de tiempo de cobro" descripcion={`${d.historia.length >= 1 ? `${etiquetaMes(d.historia[0].mes)} a ${etiquetaMes(d.historia[d.historia.length - 1].mes)}` : ""} · con un rango de 3 meses o más se ven sus meses; con un mes, los 12 anteriores para comparar`}>
        <LineaTiempo historia={d.historia} desde={d.desde} hasta={d.hasta} />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-cyan-600" />Vendido a crédito</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-600" />Recaudado</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-600" />Quedó vencido de ese mes</span></div>
      </Bloque>
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="¿Qué parte ya venció?" descripcion={`De ${dinero(k.cartera_abierta)} que te deben hoy`} ayuda={{ fuente: FUENTE, formula: 'Saldo vencido y por vencer ÷ todo lo que te deben hoy' }}>
        <Dona3D datos={[
          { nombre: 'Vencido', valor: k.vencida, color: '#ef4444' },
          { nombre: 'Vence en 30 días', valor: k.vence_30, color: '#f59e0b' },
          { nombre: 'Vence después', valor: Math.max(0, k.cartera_abierta - k.vencida - k.vence_30), color: '#3b82f6' },
        ].filter(x => x.valor > 0)} formato={dinero} altura={310} centro="ya vencido" porcentajeCentro={k.vencida_pct} />
      </Bloque>
    </div>
    <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="Facturas vencidas según cuándo se vendieron" descripcion={<>Todas las facturas a crédito que ya vencieron y siguen sin pagar. En color fuerte, las del rango elegido ({fechaCorta(d.desde)} al {fechaCorta(d.hasta)}).</>}
      ayuda={{ fuente: FUENTE, formula: 'Saldo de hoy de facturas a crédito vencidas, agrupadas por el mes (este año) o el año (años anteriores) en que se emitieron.' }}>
      <Barras3D datos={d.vencidas_por_venta.map(f => {
        const enRango = f.periodo.length === 7 ? f.periodo >= d.desde.slice(0, 7) && f.periodo <= d.hasta.slice(0, 7) : f.periodo >= d.desde.slice(0, 4) && f.periodo <= d.hasta.slice(0, 4)
        return { nombre: f.periodo.length === 7 ? etiquetaMes(f.periodo) : f.periodo, valor: f.saldo, color: enRango ? '#dc2626' : '#fca5a5' }
      })} formato={dinero} altura={260} nombreValor="Saldo vencido" tooltipExtra={nombre => {
        const f = d.vencidas_por_venta.find(x => (x.periodo.length === 7 ? etiquetaMes(x.periodo) : x.periodo) === nombre)
        return f ? `${entero(f.facturas)} facturas · ${entero(f.clientes)} clientes · clic para ver quiénes` : ''
      }} alClic={i => setPeriodo(d.vencidas_por_venta[i]?.periodo ?? null)} />
      <p className="mt-1 text-[12px] text-muted-foreground">Toca una barra para ver los clientes, su NIT y las facturas pendientes.</p>
      {periodo && <VencidasPeriodo periodo={periodo} etiqueta={periodo.length === 7 ? etiquetaMes(periodo) : periodo} alCerrar={() => setPeriodo(null)} />}
      {d.cartera_antigua.saldo > 0 && <button type="button" onClick={() => setAntigua(true)}
        className="mt-3 flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/60 px-4 py-3 text-left text-[13px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
        <span><strong className="text-foreground">Cartera antigua (vendida antes de {d.cartera_antigua.corte.slice(0, 4)}): {dinero(d.cartera_antigua.saldo)}</strong> en {entero(d.cartera_antigua.facturas)} facturas de {entero(d.cartera_antigua.clientes.length)} clientes. <span className="text-muted-foreground">No suma en ningún total; es para depurar o cobro jurídico.</span></span>
        <span className="font-semibold text-primary">Ver quiénes →</span>
      </button>}
      {antigua && <VencidasPeriodo antigua periodo={d.cartera_antigua.corte} etiqueta="antes de 2023" alCerrar={() => setAntigua(false)} />}
    </Bloque>
    <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="Top 10 clientes con más deuda vencida" descripcion="Saldo vencido hoy · pasa por una barra para ver el valor" ayuda={{ fuente: FUENTE, formula: 'Clientes ordenados por saldo vencido de mayor a menor; días de mora según la cartera abierta.' }}>
      <BarrasH3D datos={topDeudores.map((x, i) => ({ nombre: `${(x.cliente ?? x.nit ?? String(x.tercero)).slice(0, 20)} · ${entero(x.dias_mora)} d`, valor: x.vencido, color: i < 3 ? '#e11d48' : '#fb7185' }))} formato={dinero} nombreValor="Saldo vencido" anchoEtiqueta={180} />
      <div className="mt-3 flex flex-wrap gap-2">{topDeudores.slice(0, 3).map(x => <span key={x.tercero} className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs text-rose-700 dark:text-rose-300">{x.cliente ?? x.nit ?? x.tercero} · {entero(x.dias_mora)} días de mora</span>)}</div>
    </Bloque>
    <nav aria-label="Más análisis de cartera" className="flex flex-wrap gap-2">
      {[
        { id: 'plazos', t: '¿Pagan a tiempo?' }, { id: 'seguimiento', t: '¿Quién no paga?' },
        { id: 'proyeccion', t: '¿Cuánto voy a cobrar?' }, { id: 'mensual', t: 'Mes a mes' },
        { id: 'descuentos', t: 'Plata en la calle y descuentos' }, { id: 'casos', t: `Casos especiales${totalCasos ? ` · ${entero(totalCasos)}` : ''}` },
      ].map(x => <button key={x.id} type="button" onClick={() => irA(x.id)} className="rounded-xl bg-card px-3 py-2 text-xs font-bold text-foreground shadow-sm transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary">{x.t} →</button>)}
    </nav>
    <ComoLeer items={GLOSARIO} />
    {detalle === 'pendientes' && <PendientesRango d={d} alCerrar={() => setDetalle(null)} />}
    {(detalle === 'credito' || detalle === 'todos') && <DetallePlazos d={d} soloCredito={detalle === 'credito'} alCerrar={() => setDetalle(null)} />}
  </>
}

/** Una tarjeta por plazo: la barra muestra de un vistazo cuántas facturas pagan en el plazo. */
function PagoPorPlazo({ d }: { d: DashboardCartera }) {
  const [vista, setVista] = useState<'plazo' | 'condicion'>('condicion')
  const [abierto, setAbierto] = useState<PlazoCartera | null>(null)
  const [detalleGeneral, setDetalleGeneral] = useState(false)
  const lista = (vista === 'plazo' ? d.plazos : d.condiciones).filter(p => p.cumplimiento.facturas + p.cumplimiento.por_vencer.facturas > 0)
  const listaCredito = lista.filter(p => p.credito)
  const listaContado = lista.filter(p => !p.credito)
  const credito = d.plazos.filter(p => p.credito && p.facturado > 0)
  const principal = [...credito].sort((a, b) => b.facturado - a.facturado)[0]
  const puntoPrincipal = principal?.curva.find(c => c.dias === Math.min(...[7, 15, 30, 45, 60, 90].filter(n => n >= principal.dias)))
  const curva = [0, 7, 15, 30, 45, 60, 90].map((n, i) => ({
    etiqueta: n === 0 ? 'Mismo día' : `${n} d`,
    ...Object.fromEntries(credito.map(p => [`p${p.dias}`, p.curva[i]?.porcentaje ?? 0])),
  }))
  const seriesCurva = credito.map((p, i) => ({ clave: `p${p.dias}`, nombre: `Crédito a ${p.dias} d`, color: PALETA[i % PALETA.length] }))
  const totalCredito = credito.reduce((n, p) => n + p.facturas, 0)
  const tarde = credito.reduce((n, p) => n + p.cumplimiento.tarde.facturas, 0)
  const vencidas = credito.reduce((n, p) => n + p.cumplimiento.impaga_vencida.facturas, 0)
  return <>
    <Lectura titulo="Cómo leerlo" frases={[
      <>Aquí va solo el <Fuerte>crédito</Fuerte> (8 días o más). Cada tarjeta es un plazo. La barra reparte las facturas de ese plazo: <Fuerte>verde</Fuerte> se pagó a tiempo, <Fuerte>amarillo</Fuerte> se pagó tarde, <Fuerte>rojo</Fuerte> ya venció y no han pagado, <Fuerte>gris</Fuerte> aún está en plazo.</>,
      <>Entre más verde, mejor paga ese plazo. Haz clic en cualquier tarjeta para <Fuerte>ver sus facturas</Fuerte> y filtrar las vencidas.</>,
    ]} />
    <div className="grid gap-3 md:grid-cols-3">
      <TarjetaBoton titulo="Facturas de crédito" cantidad={`${entero(totalCredito)} facturas`} monto={dinero(credito.reduce((n, p) => n + p.facturado, 0))} detalle="100 % de las facturas a crédito de estos plazos" alAbrir={() => setDetalleGeneral(true)} ayuda={{ fuente: FUENTE, formula: 'Facturas emitidas con plazo de crédito; elige un plazo para ver documentos.' }} />
      <TarjetaBoton titulo="Pagadas tarde" cantidad={`${entero(tarde)} facturas`} monto={dinero(credito.reduce((n, p) => n + p.cumplimiento.tarde.valor, 0))} detalle={`${porcentaje(tarde / (totalCredito || 1), 0)} de las facturas de crédito`} alAbrir={() => setDetalleGeneral(true)} ayuda={{ fuente: FUENTE, formula: 'Facturas de crédito pagadas después del vencimiento ÷ facturas de crédito.' }} />
      <TarjetaBoton titulo="Vencidas sin pagar" cantidad={`${entero(vencidas)} facturas`} monto={dinero(credito.reduce((n, p) => n + p.cumplimiento.impaga_vencida.valor, 0))} detalle={`${porcentaje(vencidas / (totalCredito || 1), 0)} de las facturas de crédito`} alAbrir={() => setDetalleGeneral(true)} ayuda={{ fuente: FUENTE, formula: 'Facturas de crédito vencidas con saldo ÷ facturas de crédito.' }} />
    </div>
    <div className="flex items-center justify-between gap-3">
      <p className="text-[13px] text-muted-foreground">Facturas emitidas del {fechaCorta(d.desde)} al {fechaCorta(d.hasta)}</p>
      <div className="inline-flex rounded-md border border-input p-0.5 text-sm" role="group" aria-label="Agrupar por">
        {([['plazo', 'Por plazo'], ['condicion', 'Por condición de pago']] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => setVista(v)} className={`rounded px-3 py-1 ${vista === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
        ))}
      </div>
    </div>
    <div className="grid gap-3 lg:grid-cols-2">
      {listaCredito.map(p => <TarjetaPlazo key={`${vista}-${p.condicion ?? p.dias}`} p={p} alAbrir={() => setAbierto(p)} />)}
    </div>
    {listaContado.length > 0 && (
      <details className="group rounded-3xl border border-border bg-card p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-foreground">
          Pago a contado: contraentrega, contado y anticipado ({listaContado.length})
          <span className="font-normal text-muted-foreground">· no es crédito: se cobra al entregar o antes</span>
          <span className="ml-auto text-[12px] font-normal text-muted-foreground group-open:hidden">Mostrar</span><span className="ml-auto hidden text-[12px] font-normal text-muted-foreground group-open:inline">Ocultar</span>
        </summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {listaContado.map(p => <TarjetaPlazo key={`${vista}-${p.condicion ?? p.dias}`} p={p} alAbrir={() => setAbierto(p)} />)}
        </div>
      </details>
    )}
    <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="¿Qué plazos se pagan a tiempo?" descripcion="Porcentaje de facturas pagadas dentro del plazo; toca una tarjeta de arriba para ver documentos" ayuda={{ fuente: FUENTE, formula: 'Pagadas a tiempo ÷ facturas ya pagadas o vencidas de cada plazo de crédito.' }}><Barras3D datos={credito.map(p => ({ nombre: `${p.dias} d`, valor: p.cumplimiento.a_tiempo_pct ?? 0, color: p.cumplimiento.a_tiempo_pct != null && p.cumplimiento.a_tiempo_pct >= .8 ? PALETA[1] : PALETA[2] }))} formato={v => porcentaje(v, 0)} nombreValor="Paga a tiempo" /></Bloque>
    {principal && puntoPrincipal && <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="¿Cuánto llega y cuándo?" descripcion="Cada línea es un plazo. Lee de izquierda a derecha: qué % de lo vendido ya se había cobrado a los N días de facturar" ayuda={{ fuente: FUENTE, formula: 'Σ abonos con fecha hasta N días después de emitir la factura ÷ lo facturado en ese plazo', nota: 'Las facturas recientes todavía no han tenido tiempo de pagar, por eso conviene mirar un rango largo.' }}>
      <p className="mb-3 text-[13px] text-muted-foreground">Por ejemplo, de lo vendido a <Fuerte>{principal.dias} días</Fuerte>, a los <Fuerte>{puntoPrincipal.dias} días</Fuerte> de facturar ya se había cobrado el <Fuerte>{porcentaje(puntoPrincipal.porcentaje, 0)}</Fuerte>.</p>
      <Areas datos={curva} ejeX="etiqueta" series={seriesCurva} formato={v => porcentaje(Number(v), 0)} altura={300} />
    </Bloque>}
    {detalleGeneral && <DetallePlazos d={d} soloCredito alCerrar={() => setDetalleGeneral(false)} />}
    {abierto && <FacturasDelPlazo d={d} p={abierto} alCerrar={() => setAbierto(null)} />}
  </>
}

function TarjetaPlazo({ p, alAbrir }: { p: PlazoCartera; alAbrir: () => void }) {
  const c = p.cumplimiento
  const diez = deCada10(c.a_tiempo_pct)
  const partes = ESTADOS_BARRA.map(e => ({ ...e, valor: c[e.clave].facturas, detalle: e.clave === 'impaga_vencida' && c.impaga_vencida.valor ? dinero(c.impaga_vencida.valor) : undefined }))
  const nombre = p.condicion ? p.nombre : nombrePlazo(p.dias, p.credito)
  return (
    <button type="button" onClick={alAbrir}
      aria-label={`Ver las facturas de ${nombre}`}
      className="flex cursor-pointer flex-col gap-3 rounded-3xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-foreground"><span className="truncate" title={nombre}>{nombre}</span>{!p.credito && <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:bg-sky-500/20 dark:text-sky-200">Pago a contado</span>}</p>
          <p className="text-[12px] text-muted-foreground">{p.condicion ? `${p.condicion} · ${p.dias} días de plazo · ` : (p.condiciones?.length ? `${p.condiciones.slice(0, 3).join(' · ')} · ` : '')}{entero(p.facturas)} facturas · {dinero(p.facturado)}</p>
        </div>
        {c.a_tiempo_pct != null && <div className="shrink-0 text-right"><p className={`text-2xl leading-none font-bold tabular-nums ${c.a_tiempo_pct >= 0.8 ? 'text-emerald-600' : c.a_tiempo_pct >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>{porcentaje(c.a_tiempo_pct, 0)}</p><p className="text-[11px] text-muted-foreground">paga a tiempo</p></div>}
      </div>
      {diez != null && !p.credito && <p className="text-[14px] text-foreground/90">Es pago a contado: se cobra al entregar o antes. SIESA la registra con {p.dias} {p.dias === 1 ? 'día' : 'días'} de plazo.{p.dias_pago != null && <> En la práctica pagan en promedio a los <Fuerte>{dias(p.dias_pago)}</Fuerte>.</>}</p>}
      {diez != null && p.credito && <p className="text-[14px] text-foreground/90">De cada 10 facturas a {p.dias} días, <Fuerte>{diez}</Fuerte> se {diez === 1 ? 'paga' : 'pagan'} dentro del plazo.{p.dias_pago != null && <> En promedio pagan a los <Fuerte>{dias(p.dias_pago)}</Fuerte>{p.desviacion_dias != null && Math.abs(p.desviacion_dias) >= 1 && <> ({decimal(Math.abs(p.desviacion_dias), 0)} días {p.desviacion_dias > 0 ? 'más tarde' : 'antes'} de lo pactado)</>}.</>}</p>}
      <BarraEstados partes={partes} formato={entero} />
      <span className="self-start rounded-md border border-input bg-background px-3 py-1.5 text-[13px] font-medium text-foreground">Ver facturas →</span>
    </button>
  )
}

const fechaCorta = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—')
const sumarDias = (iso: string, n: number) => {
  const f = new Date(`${iso}T00:00:00`)
  f.setDate(f.getDate() + n)
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
}
const ESTADOS: Record<EstadoFacturaCartera, { texto: string; clase: string }> = {
  a_tiempo: { texto: 'Pagada a tiempo', clase: 'bg-emerald-100 text-emerald-800' },
  tarde: { texto: 'Pagada tarde', clase: 'bg-amber-100 text-amber-800' },
  impaga_vencida: { texto: 'Vencida sin pagar', clase: 'bg-red-100 text-red-800' },
  por_vencer: { texto: 'Por vencer', clase: 'bg-blue-100 text-blue-800' },
  pagada: { texto: 'Pagada', clase: 'bg-muted text-muted-foreground' },
}
const EtiquetaEstado = ({ estado }: { estado: EstadoFacturaCartera }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${ESTADOS[estado].clase}`}>{ESTADOS[estado].texto}</span>
)
const consultaFacturas = async (params: Record<string, string | number | undefined>) =>
  (await apiClient.get<{ success: boolean; data: RespuestaFacturasCartera }>('/dashboard/cartera/facturas', { params })).data.data
const cuerpo = (c: { isLoading: boolean; isFetching: boolean; isError: boolean; data?: unknown }) => ({ isLoading: c.isLoading || (c.isFetching && !c.data), isError: c.isError })
const Selector = ({ etiqueta, valor, alCambiar, children }: { etiqueta: string; valor: string; alCambiar: (v: string) => void; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">{etiqueta}
    <select value={valor} onChange={e => alCambiar(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm font-normal text-foreground">{children}</select>
  </label>
)

type FiltroEstado = 'todas' | 'impaga_vencida' | 'tarde' | 'a_tiempo' | 'por_vencer'
const TAMANO_PAGINA = 50

/** Nombre del plazo según los días de la condición de pago (SIESA: CON 0 d, ANT/AF* 1 d, CRC 4 d, KE* 7 d). */
function nombrePlazo(dias: number, credito: boolean) {
  if (credito) return `Crédito a ${dias} días`
  if (dias === 0) return 'Contado (0 d)'
  if (dias === 1) return 'Anticipado (1 d)'
  if (dias === 4) return 'Contraentrega (4 d)'
  if (dias === 7) return 'Contraentrega con financiero (7 d)'
  return `Pago a contado (${dias} d)`
}

const COLOR_ESTADO = { a_tiempo: '#10b981', tarde: '#f59e0b', impaga_vencida: '#ef4444', por_vencer: '#64748b' } as const
const colorTramo = (tramo: number) => (tramo === 0 ? '#10b981' : tramo <= 15 ? '#f59e0b' : tramo <= 60 ? '#f97316' : '#dc2626')

/** Porcentajes y gráficas del plazo: cómo terminaron, cuánto se atrasan y quién concentra el valor (según el filtro). */
function GraficasPlazo({ p, r, estado = 'todas' }: { p: PlazoCartera; r?: RespuestaFacturasCartera; estado?: FiltroEstado }) {
  const [visible, setVisible] = useState(true)
  const c = p.cumplimiento
  const n = c.a_tiempo.facturas + c.tarde.facturas + c.impaga_vencida.facturas + c.por_vencer.facturas
  const pct = (x: number) => (n ? x / n : 0)
  const NOMBRES: Record<Exclude<FiltroEstado, 'todas'>, string> = { a_tiempo: 'Pagadas a tiempo', tarde: 'Pagadas tarde', impaga_vencida: 'Vencidas sin pagar', por_vencer: 'Aún en plazo' }
  const filtrado = estado !== 'todas'
  // Con un filtro, la dona resalta solo ese estado (los demás en gris) y su % va al centro.
  const estados = (['a_tiempo', 'tarde', 'impaga_vencida', 'por_vencer'] as const).map(k => ({
    nombre: NOMBRES[k], valor: c[k].facturas,
    color: !filtrado || estado === k ? COLOR_ESTADO[k] : '#cbd5e1',
  })).filter(e => e.valor > 0)
  const atraso = (r?.atraso ?? []).filter(a => a.facturas > 0).map(a => ({ nombre: a.nombre, valor: a.facturas, color: colorTramo(a.tramo) }))
  const totalValor = r?.totales.valor ?? 0
  const top = (r?.top_clientes ?? []).map((x, i) => ({ nombre: (n => n.length > 24 ? `${n.slice(0, 23)}…` : n)(x.cliente ?? String(x.tercero)), valor: x.valor, color: PALETA[i % PALETA.length] }))
  const top1 = r?.top_clientes?.[0]
  // Atraso promedio del filtro (ponderado por valor); solo si están todas las facturas cargadas en la página.
  const completas = r != null && r.filas.length >= r.total
  const atrasoProm = completas && r.totales.valor ? r.filas.reduce((s, f) => s + (f.dias_vs_vencimiento ?? 0) * f.valor, 0) / r.totales.valor : null
  const colorFiltro = filtrado ? (estado === 'a_tiempo' ? 'text-emerald-600' : estado === 'tarde' ? 'text-amber-600' : estado === 'impaga_vencida' ? 'text-red-600' : 'text-slate-600') : ''
  const chipsFiltro = filtrado && r ? [
    { etiqueta: NOMBRES[estado], valor: entero(r.total), nota: `${porcentaje(pct(r.total), 0)} de las ${entero(n)} facturas del plazo`, clase: colorFiltro },
    { etiqueta: 'Valor facturado', valor: dinero(r.totales.valor), nota: `${p.facturado ? porcentaje(r.totales.valor / p.facturado, 0) : '—'} del valor del plazo`, clase: 'text-foreground' },
    { etiqueta: estado === 'a_tiempo' || estado === 'tarde' ? 'Saldo pendiente' : 'Por cobrar', valor: dinero(r.totales.saldo), nota: `${entero(r.totales.clientes)} clientes`, clase: r.totales.saldo > 1 ? 'text-red-600' : 'text-emerald-600' },
    { etiqueta: estado === 'impaga_vencida' ? 'Llevan vencidas' : estado === 'tarde' ? 'Pagaron tarde por' : estado === 'a_tiempo' ? 'Pagaron antes por' : 'Faltan para vencer', valor: atrasoProm == null ? '—' : `${decimal(Math.abs(atrasoProm), 0)} d`, nota: 'promedio ponderado por valor', clase: colorFiltro },
  ] : null
  const chips = chipsFiltro ?? [
    { etiqueta: 'Pagan a tiempo', valor: porcentaje(pct(c.a_tiempo.facturas), 0), nota: `${entero(c.a_tiempo.facturas)} de ${entero(n)}`, clase: 'text-emerald-600' },
    { etiqueta: 'Pagan tarde', valor: porcentaje(pct(c.tarde.facturas), 0), nota: `${entero(c.tarde.facturas)} facturas`, clase: 'text-amber-600' },
    { etiqueta: 'Vencidas sin pagar', valor: porcentaje(pct(c.impaga_vencida.facturas), 0), nota: dinero(c.impaga_vencida.valor), clase: 'text-red-600' },
    { etiqueta: 'Pagan en promedio', valor: dias(p.dias_pago), nota: `plazo pactado ${p.dias} d`, clase: p.dias_pago != null && p.dias_pago > p.dias + 1 ? 'text-amber-600' : 'text-emerald-600' },
  ]
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">De un vistazo</p>
        <button type="button" onClick={() => setVisible(!visible)} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">{visible ? 'Ocultar gráficas' : 'Ver gráficas'}</button>
      </div>
      {visible && <>
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {chips.map(x => (
            <div key={x.etiqueta} className="rounded-2xl border border-border bg-gradient-to-b from-card to-muted/40 p-3 shadow-sm">
              <p className="text-[11.5px] text-muted-foreground">{x.etiqueta}</p>
              <p className={`text-2xl leading-tight font-bold tabular-nums ${x.clase}`}>{x.valor}</p>
              <p className="text-[11.5px] text-muted-foreground">{x.nota}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-border p-3">
            <p className="text-[13px] font-semibold">{filtrado ? `¿Qué parte son las ${NOMBRES[estado].toLowerCase()}?` : '¿Cómo terminaron?'}</p>
            <p className="text-[11.5px] text-muted-foreground">{filtrado ? 'En color, el filtro elegido; en gris, el resto del plazo' : 'Todas las facturas del plazo, por número'}</p>
            <Dona3D datos={estados} formato={entero} altura={230} centro={filtrado ? NOMBRES[estado].toLowerCase() : 'a tiempo'} porcentajeCentro={filtrado ? pct(c[estado].facturas) : pct(c.a_tiempo.facturas)} />
          </div>
          <div className="rounded-2xl border border-border p-3">
            <p className="text-[13px] font-semibold">¿Cuántos días tarde?</p>
            <p className="text-[11.5px] text-muted-foreground">Facturas del filtro elegido según su atraso</p>
            {atraso.length ? <Barras3D datos={atraso} formato={entero} altura={230} nombreValor="Facturas" /> : <p className="py-16 text-center text-xs text-muted-foreground">Sin datos</p>}
          </div>
          <div className="rounded-2xl border border-border p-3">
            <p className="text-[13px] font-semibold">¿Quién concentra el valor?</p>
            <p className="text-[11.5px] text-muted-foreground">{top1 && totalValor ? `${top1.cliente ?? 'El primero'} es el ${porcentaje(top1.valor / totalValor, 0)} del filtro` : 'Clientes con más valor en el filtro'}</p>
            {top.length ? <BarrasH3D datos={top} formato={dinero} nombreValor="Valor" anchoEtiqueta={180} /> : <p className="py-16 text-center text-xs text-muted-foreground">Sin datos</p>}
          </div>
        </div>
      </>}
    </div>
  )
}

const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
/** "septiembre de 2026" si el rango es un mes completo; si no, "del 01/09/2026 al 15/09/2026". */
function nombreRango(desde: string, hasta: string) {
  const fin = new Date(`${hasta}T00:00:00`)
  const ultimo = new Date(fin.getFullYear(), fin.getMonth() + 1, 0).getDate()
  if (desde.slice(0, 7) === hasta.slice(0, 7) && desde.slice(8) === '01' && Number(hasta.slice(8)) === ultimo) return `${NOMBRES_MES[fin.getMonth()]} de ${fin.getFullYear()}`
  return `del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`
}

/** Card principal para seguimiento: de lo facturado a crédito en el rango, cuántas facturas vencidas faltan por cobrar. */
function PorCobrarDelRango({ d, facturas, saldo, alAbrir }: { d: DashboardCartera; facturas: number; saldo: number; alAbrir: () => void }) {
  const periodo = nombreRango(d.desde, d.hasta)
  const enMes = periodo.startsWith('del') ? `De lo facturado ${periodo}` : `De lo facturado en ${periodo}`
  const limpio = facturas === 0
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return (
    <button type="button" onClick={alAbrir} disabled={limpio}
      className={`flex w-full flex-col gap-3 rounded-2xl p-5 text-left shadow-sm transition sm:flex-row sm:items-center sm:justify-between ${limpio ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'cursor-pointer bg-gradient-to-r from-red-50 to-card hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary dark:from-red-950/40'}`}>
      <div className="min-w-0">
        <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Facturas de {periodo} vencidas sin pagar · a hoy {hoy}</p>
        {limpio
          ? <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">{enMes}, a hoy no hay ninguna factura a crédito vencida sin pagar.</p>
          : <p className="mt-1 text-xl leading-snug text-foreground sm:text-2xl">{enMes}, a hoy siguen sin pagar <span className="font-black text-red-600">{entero(facturas)} facturas</span> ya vencidas, por <span className="font-black text-red-600">{dinero(saldo)}</span>.</p>}
        <p className="mt-1 text-[12.5px] text-muted-foreground">Solo facturas a crédito emitidas en ese periodo, que ya pasaron su fecha de vencimiento y hoy siguen sin pagar. No es el saldo final del mes: ese incluye facturas de otros meses y lo que aún no vencía.</p>
      </div>
      {!limpio && <span className="shrink-0 self-start rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white sm:self-center">Ver las {entero(facturas)} facturas →</span>}
    </button>
  )
}

/** Exactamente las facturas de la tarjeta "Facturas a crédito del rango sin cobrar": emitidas en el rango, a crédito y con saldo hoy. */
function PendientesRango({ d, alCerrar }: { d: DashboardCartera; alCerrar: () => void }) {
  const consulta = useQuery({
    queryKey: ['cartera-vencidas-rango', d.desde, d.hasta],
    queryFn: () => consultaFacturas({ desde: d.desde, hasta: d.hasta, estado: 'impaga_vencida', credito: 1, orden: 'saldo', pagina: 1, tamano: 500 }),
    staleTime: 5 * 60 * 1000,
  })
  const r = consulta.data
  const top1 = r?.top_clientes?.[0]
  // Por condición de pago (30D, CFK, CFE, 08D…): cuántas facturas, de cuántos clientes y cuánto deben.
  const porCondicion = useMemo(() => {
    const m = new Map<string, { condicion: string; nombre: string; dias: number; facturas: number; clientes: Set<number>; saldo: number; mora: number }>()
    for (const f of r?.filas ?? []) {
      const c = m.get(f.condicion) ?? { condicion: f.condicion, nombre: f.condicion_nombre, dias: f.dias, facturas: 0, clientes: new Set<number>(), saldo: 0, mora: 0 }
      c.facturas += 1; c.clientes.add(f.tercero); c.saldo += f.saldo; c.mora += (f.dias_vs_vencimiento ?? 0) * f.saldo
      m.set(f.condicion, c)
    }
    const total = r?.totales.saldo || 1
    return [...m.values()].map(c => ({ ...c, clientes: c.clientes.size, pct: c.saldo / total, mora: c.saldo ? c.mora / c.saldo : 0 })).sort((a, b) => b.saldo - a.saldo)
  }, [r])
  return (
    <Modal isOpen onClose={alCerrar} title={<span>Facturas hechas en el rango y vencidas <span className="text-[13px] font-normal text-muted-foreground">· emitidas del {fechaCorta(d.desde)} al {fechaCorta(d.hasta)}</span></span>} className="max-w-6xl">
      <CuerpoConsulta consulta={cuerpo(consulta)} altura="h-48" vacio={r != null && r.total === 0} mensajeVacio="No hay facturas vencidas de este rango">
        {r && <>
          <p className="mb-3 text-[13px] text-muted-foreground">
            <Fuerte>{entero(r.total)}</Fuerte> facturas de <Fuerte>{entero(r.totales.clientes)}</Fuerte> clientes ya vencieron y deben <Fuerte>{dinero(r.totales.saldo)}</Fuerte>.
            {porCondicion[0] && <> La condición que más pesa es <Fuerte>{porCondicion[0].condicion}</Fuerte> ({porCondicion[0].nombre}) con el <Fuerte>{porcentaje(porCondicion[0].pct, 0)}</Fuerte>.</>}
            {top1 && r.totales.valor > 0 && <> {top1.cliente} concentra el <Fuerte>{porcentaje(top1.saldo / (r.totales.saldo || 1), 0)}</Fuerte> del saldo.</>}
          </p>
          <div className="mb-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-border p-3">
              <p className="text-[13px] font-semibold">¿En qué condición de pago están?</p>
              <Dona3D datos={porCondicion.map((c, i) => ({ nombre: c.condicion, valor: c.saldo, color: PALETA[i % PALETA.length] }))} formato={dinero} altura={240} centro={porCondicion[0]?.condicion ?? ''} porcentajeCentro={porCondicion[0]?.pct ?? null} />
            </div>
            <div className="rounded-2xl border border-border p-3">
              <p className="mb-1 text-[13px] font-semibold">Por condición de pago</p>
              <Tabla filas={porCondicion} clave={c => c.condicion} columnas={[
                { titulo: 'Condición', celda: c => <span title={c.nombre}><span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px] font-semibold">{c.condicion}</span> <span className="text-[12px] text-muted-foreground">{c.nombre}</span></span> },
                { titulo: 'Plazo', celda: c => `${c.dias} d`, alinear: 'der' },
                { titulo: 'Facturas', celda: c => entero(c.facturas), alinear: 'der' },
                { titulo: 'Clientes', celda: c => entero(c.clientes), alinear: 'der', secundaria: true },
                { titulo: 'Saldo', celda: c => dinero(c.saldo), alinear: 'der' },
                { titulo: '%', celda: c => porcentaje(c.pct, 0), alinear: 'der' },
                { titulo: 'Atraso prom.', celda: c => `${decimal(c.mora, 0)} d`, alinear: 'der' },
              ]} />
            </div>
          </div>
          <div className="mb-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-border p-3">
              <p className="text-[13px] font-semibold">¿Quién debe más?</p>
              <BarrasH3D datos={(r.top_clientes ?? []).map((x, i) => ({ nombre: (x.cliente ?? String(x.tercero)).slice(0, 24), valor: x.saldo, color: PALETA[i % PALETA.length] }))} formato={dinero} nombreValor="Saldo" anchoEtiqueta={170} />
            </div>
            <div className="rounded-2xl border border-border p-3">
              <p className="text-[13px] font-semibold">¿Hace cuánto vencieron?</p>
              <Barras3D datos={(r.atraso ?? []).filter(a => a.facturas > 0 && a.tramo > 0).map(a => ({ nombre: a.nombre, valor: a.facturas, color: colorTramo(a.tramo) }))} formato={entero} altura={230} nombreValor="Facturas" />
            </div>
          </div>
          <p className="mb-1 text-[13px] font-black tracking-tight">Clientes <span className="font-normal text-muted-foreground">· toca un cliente para desplegar sus facturas</span></p>
          <ClientesAcordeon facturas={r.filas} />
        </>}
      </CuerpoConsulta>
    </Modal>
  )
}

/** Tablero con todas las facturas de un plazo (o condición) y filtro por estado. */
function FacturasDelPlazo({ d, p, alCerrar }: { d: DashboardCartera; p: PlazoCartera; alCerrar: () => void }) {
  const [estado, setEstado] = useState<FiltroEstado>('todas')
  const [conDescuento, setConDescuento] = useState(false)
  const [texto, setTexto] = useState('')
  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(1)
  useEffect(() => {
    const t = setTimeout(() => { setBuscar(texto.trim()); setPagina(1) }, 350)
    return () => clearTimeout(t)
  }, [texto])
  const c = p.cumplimiento
  const nombre = p.condicion ? p.nombre : nombrePlazo(p.dias, p.credito)
  const filtros: { valor: FiltroEstado; etiqueta: string; n: number; clase: string }[] = [
    { valor: 'todas', etiqueta: 'Todas', n: c.a_tiempo.facturas + c.tarde.facturas + c.impaga_vencida.facturas + c.por_vencer.facturas, clase: 'border-primary bg-primary/10 text-primary' },
    { valor: 'impaga_vencida', etiqueta: 'Vencidas sin pagar', n: c.impaga_vencida.facturas, clase: 'border-red-500 bg-red-50 text-red-700' },
    { valor: 'tarde', etiqueta: 'Pagadas tarde', n: c.tarde.facturas, clase: 'border-amber-500 bg-amber-50 text-amber-800' },
    { valor: 'a_tiempo', etiqueta: 'Pagadas a tiempo', n: c.a_tiempo.facturas, clase: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
    { valor: 'por_vencer', etiqueta: 'Aún en plazo', n: c.por_vencer.facturas, clase: 'border-slate-400 bg-slate-100 text-slate-700' },
  ]
  const consulta = useQuery({
    queryKey: ['cartera-facturas-plazo', d.desde, d.hasta, p.condicion ?? p.dias, estado, buscar, pagina, conDescuento],
    queryFn: () => consultaFacturas({
      desde: d.desde, hasta: d.hasta, dias: p.condicion ? undefined : p.dias, condicion: p.condicion,
      estado: estado === 'todas' ? undefined : estado, buscar: buscar || undefined, descuento: conDescuento ? 1 : undefined,
      orden: estado === 'impaga_vencida' ? 'mora' : 'recientes', pagina, tamano: TAMANO_PAGINA,
    }),
    placeholderData: previo => previo,
    staleTime: 5 * 60 * 1000,
  })
  // Aprovechamiento del descuento financiero de toda la condición (no depende del filtro elegido).
  const resumenDescuento = useQuery({
    queryKey: ['cartera-facturas-plazo-descuento', d.desde, d.hasta, p.condicion ?? p.dias],
    queryFn: () => consultaFacturas({ desde: d.desde, hasta: d.hasta, dias: p.condicion ? undefined : p.dias, condicion: p.condicion, pagina: 1, tamano: 1 }),
    staleTime: 5 * 60 * 1000,
  })
  const rd = resumenDescuento.data
  const aprovechan = rd && rd.total ? rd.totales.facturas_descuento / rd.total : null
  const r = consulta.data
  const paginas = r ? Math.max(1, Math.ceil(r.total / r.tamano)) : 1
  return (
    <Modal isOpen onClose={alCerrar} title={<span>{nombre} <span className="text-[13px] font-normal text-muted-foreground">· facturas emitidas del {fechaCorta(d.desde)} al {fechaCorta(d.hasta)}</span></span>} className="max-w-6xl">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {rd && rd.totales.facturas_descuento > 0 && (
          <button type="button" onClick={() => { setConDescuento(!conDescuento); setEstado('todas'); setPagina(1) }} aria-pressed={conDescuento}
            title={`${entero(rd.totales.clientes_descuento)} de ${entero(rd.totales.clientes)} clientes pagaron con descuento financiero · ${dinero(rd.totales.descuento)} descontados`}
            className={`h-9 rounded-full border px-3 text-[13px] ${conDescuento ? 'border-violet-500 bg-violet-50 font-semibold text-violet-800 dark:bg-violet-500/15 dark:text-violet-200' : 'border-violet-300 bg-background text-violet-700 hover:bg-violet-50 dark:text-violet-300'}`}>
            Aprovecharon el descuento <span className="tabular-nums">({entero(rd.totales.facturas_descuento)} · {porcentaje(aprovechan ?? 0, 0)})</span>
          </button>
        )}
        {filtros.map(f => (
          <button key={f.valor} type="button" onClick={() => { setEstado(f.valor); setConDescuento(false); setPagina(1) }} aria-pressed={!conDescuento && estado === f.valor}
            className={`h-9 rounded-full border px-3 text-[13px] ${!conDescuento && estado === f.valor ? `${f.clase} font-semibold` : 'border-input bg-background text-foreground hover:bg-muted'}`}>
            {f.etiqueta} <span className="tabular-nums">({entero(f.n)})</span>
          </button>
        ))}
        <input type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buscar cliente, NIT o factura" aria-label="Buscar cliente, NIT o factura"
          className="ml-auto h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-64" />
      </div>
      {r && <p className="mb-3 text-[13px] text-muted-foreground">
        <Fuerte>{entero(r.total)}</Fuerte> facturas de <Fuerte>{entero(r.totales.clientes)}</Fuerte> clientes · valor <Fuerte>{dinero(r.totales.valor)}</Fuerte>
        {r.totales.saldo > 1 && <> · por cobrar <Fuerte>{dinero(r.totales.saldo)}</Fuerte></>}
      </p>}
      <GraficasPlazo p={p} r={r} estado={estado} />
      <CuerpoConsulta consulta={cuerpo(consulta)} altura="h-48" mensajeVacio="No hay facturas con este filtro">
        {r && r.filas.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No hay facturas con este filtro</p> : <TablaFacturas filas={r?.filas ?? []} />}
      </CuerpoConsulta>
      {r && paginas > 1 && (
        <div className="mt-3 flex items-center justify-end gap-3 text-[13px]">
          <button type="button" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} className="h-8 rounded-md border border-input px-3 disabled:opacity-40">Anterior</button>
          <span className="text-muted-foreground">Página {pagina} de {paginas}</span>
          <button type="button" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)} className="h-8 rounded-md border border-input px-3 disabled:opacity-40">Siguiente</button>
        </div>
      )}
    </Modal>
  )
}

/** Por plazo: qué % paga en el plazo y qué clientes no lo hacen, con sus facturas. */
function Seguimiento({ d, plazoInicial }: { d: DashboardCartera; plazoInicial?: number }) {
  const planes = [...d.condiciones].filter(p => p.cumplimiento.facturas > 0).sort((a, b) => b.facturado - a.facturado)
  const porDefecto = planes.find(p => p.credito) ?? planes[0]
  const [condicion, setCondicion] = useState<string | undefined>(plazoInicial != null ? planes.find(p => p.dias === plazoInicial)?.condicion : porDefecto?.condicion)
  const [cliente, setCliente] = useState<ClienteCartera | null>(null)
  const [detalle, setDetalle] = useState(false)
  const plazo = planes.find(p => p.condicion === condicion)
  const clientes = useQuery({
    queryKey: ['cartera-clientes', d.desde, d.hasta, condicion ?? 'todos'],
    queryFn: async () => (await apiClient.get<{ success: boolean; data: ClienteCartera[] }>('/dashboard/cartera/clientes', { params: { desde: d.desde, hasta: d.hasta, condicion } })).data.data,
    staleTime: 5 * 60 * 1000,
  })
  const facturas = useQuery({
    queryKey: ['cartera-facturas-cliente', d.desde, d.hasta, condicion ?? 'todos', cliente?.tercero],
    queryFn: () => consultaFacturas({ desde: d.desde, hasta: d.hasta, condicion, tercero: cliente?.tercero, estado: 'no_cumple', orden: 'vencimiento', tamano: 200 }),
    enabled: cliente != null,
    staleTime: 5 * 60 * 1000,
  })
  const c = plazo?.cumplimiento
  const diez = deCada10(c?.a_tiempo_pct ?? null)
  const lista = clientes.data ?? []
  const vencidoTotal = lista.reduce((suma, x) => suma + x.vencido, 0)
  return (
    <div className="flex flex-col gap-4">
      <Lectura titulo="Para qué sirve esta pantalla" frases={[
        <>Elige una condición de pago y verás <Fuerte>qué clientes no pagan a tiempo</Fuerte>, empezando por los que más deben ya vencido. Son los que hay que llamar.</>,
        <>Haz clic en el nombre de un cliente para ver <Fuerte>las facturas atrasadas</Fuerte> que le debes reclamar.</>,
      ]} />
      <div className="grid gap-3 md:grid-cols-3">
        <TarjetaBoton titulo="Clientes con retrasos" cantidad={`${entero(lista.length)} clientes`} monto={dinero(lista.reduce((n, x) => n + x.valor, 0))} detalle={`${entero(lista.reduce((n, x) => n + x.facturas, 0))} facturas del plazo · ver clientes`} alAbrir={() => setDetalle(true)} ayuda={{ fuente: FUENTE, formula: 'Clientes con al menos una factura pagada tarde o vencida sin pagar en el plazo elegido.' }} />
        <TarjetaBoton titulo="Sin pagar vencido" cantidad={`${entero(lista.reduce((n, x) => n + x.impagas, 0))} facturas`} monto={dinero(vencidoTotal)} detalle={`${porcentaje(vencidoTotal / (lista.reduce((n, x) => n + x.valor, 0) || 1), 0)} del valor de estos clientes`} alAbrir={() => setDetalle(true)} ayuda={{ fuente: FUENTE, formula: 'Saldo vencido de los clientes con retrasos ÷ valor total de sus facturas.' }} />
        <TarjetaBoton titulo="Pagadas tarde" cantidad={`${entero(lista.reduce((n, x) => n + x.tarde, 0))} facturas`} monto={dinero(lista.reduce((n, x) => n + x.pagado_tarde, 0))} detalle={`${porcentaje(lista.reduce((n, x) => n + x.tarde, 0) / (lista.reduce((n, x) => n + x.facturas, 0) || 1), 0)} de sus facturas`} alAbrir={() => setDetalle(true)} ayuda={{ fuente: FUENTE, formula: 'Facturas pagadas tarde ÷ facturas de clientes con retrasos.' }} />
      </div>
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="Clientes con más saldo vencido" descripcion="Elige un cliente en la lista para ver sus facturas" ayuda={{ fuente: FUENTE, formula: 'Saldo vencido por cliente, ordenado de mayor a menor.' }}><BarrasH3D datos={[...lista].sort((a, b) => b.vencido - a.vencido).slice(0, 10).map(x => ({ nombre: x.cliente ?? x.nit ?? String(x.tercero), valor: x.vencido, color: PALETA[5] }))} formato={dinero} anchoEtiqueta={135} /></Bloque>
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="¿Cuántas pagan dentro del plazo?" descripcion={`Facturas emitidas del ${fechaCorta(d.desde)} al ${fechaCorta(d.hasta)} que ya se pueden juzgar (pagadas o vencidas)`} ayuda={{ fuente: FUENTE, formula: 'Pagan en el plazo = facturas canceladas en o antes del vencimiento ÷ (canceladas + vencidas sin pagar)', nota: 'Las facturas abiertas que aún no vencen no cuentan: todavía están a tiempo.' }}>
        <div className="mb-4 max-w-xs">
          <Selector etiqueta="Condición de pago" valor={condicion ?? ''} alCambiar={v => { setCondicion(v === '' ? undefined : v); setCliente(null) }}>
            <option value="">Todas las condiciones</option>
            {planes.map(p => <option key={p.condicion} value={p.condicion}>{p.condicion} · {p.nombre} ({p.dias} d)</option>)}
          </Selector>
        </div>
        {c && plazo ? <>
          <p className="mb-3 text-[14px] text-foreground/90">
            De <Fuerte>{entero(c.facturas)}</Fuerte> facturas <Fuerte>{plazo.condicion}</Fuerte> ({plazo.dias} días) que ya se pueden juzgar, <Fuerte>{entero(c.a_tiempo.facturas)}</Fuerte>{diez != null && <> (<Fuerte>{diez} de cada 10</Fuerte>)</>} se pagaron a tiempo.
            {c.tarde.facturas > 0 && <> <Fuerte>{entero(c.tarde.facturas)}</Fuerte> se pagaron tarde</>}
            {c.impaga_vencida.facturas > 0 && <> y <Fuerte>{entero(c.impaga_vencida.facturas)}</Fuerte> siguen sin pagar: son <Fuerte>{dinero(c.impaga_vencida.valor)}</Fuerte> por cobrar</>}.
          </p>
          <p className="mb-3 text-[14px] text-foreground/90">De lo facturado con {plazo.condicion} ({dinero(plazo.facturado)}) ya se ha cancelado el <Fuerte>{plazo.cobrado_pct == null ? '—' : porcentaje(plazo.cobrado_pct, 0)}</Fuerte>.</p>
          <BarraEstados partes={ESTADOS_BARRA.map(e => ({ ...e, valor: c[e.clave].facturas }))} formato={entero} />
        </> : <p className="text-[14px] text-foreground/90">Resumen de <Fuerte>todas las condiciones</Fuerte> juntas. Elige una para ver su porcentaje de cumplimiento.</p>}
      </Bloque>
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="Clientes que no pagan en el plazo" descripcion={lista.length ? `${entero(lista.length)} clientes con facturas atrasadas · ${dinero(vencidoTotal)} vencido por cobrar` : undefined} ayuda={{ fuente: FUENTE, formula: 'Por cliente: facturas pagadas a tiempo, tarde y vencidas sin pagar. Retraso = días de atraso ponderados por valor (si pagó tarde, hasta que pagó; si no ha pagado, hasta hoy).' }}>
        <CuerpoConsulta consulta={cuerpo(clientes)} altura="h-48" mensajeVacio="Ningún cliente se atrasa en este plazo">
          <Tabla filas={lista} clave={x => x.tercero} columnas={[
            { titulo: 'Cliente', celda: x => <button type="button" onClick={() => setCliente(cliente?.tercero === x.tercero ? null : x)} className={`text-left font-medium underline-offset-2 hover:underline ${cliente?.tercero === x.tercero ? 'text-primary' : 'text-foreground'}`}>{x.cliente || '—'} <span className="text-[11px] font-normal text-muted-foreground">{cliente?.tercero === x.tercero ? '▾ ocultar' : '▸ ver facturas'}</span></button> },
            { titulo: 'Facturas', alinear: 'der', celda: x => entero(x.facturas) },
            { titulo: 'Pagó a tiempo', alinear: 'der', celda: x => `${entero(x.a_tiempo)} (${x.a_tiempo_pct == null ? '—' : porcentaje(x.a_tiempo_pct, 0)})` },
            { titulo: 'Pagó tarde', alinear: 'der', celda: x => x.tarde ? entero(x.tarde) : '—' },
            { titulo: 'Sin pagar', alinear: 'der', celda: x => x.impagas ? <span className="font-medium text-red-700">{entero(x.impagas)}</span> : '—' },
            { titulo: 'Debe vencido', alinear: 'der', celda: x => x.vencido ? <span className="font-medium text-red-700">{dinero(x.vencido)}</span> : '—' },
            { titulo: 'Se atrasa en promedio', alinear: 'der', celda: x => x.dias_retraso_promedio == null ? '—' : `${decimal(x.dias_retraso_promedio, 0)} d` },
          ]} />
        </CuerpoConsulta>
      </Bloque>
      {detalle && <Modal isOpen onClose={() => setDetalle(false)} title="Clientes que no pagan en el plazo" className="max-w-6xl"><p className="mb-3 text-sm text-muted-foreground">Elige un cliente para ver sus facturas en la lista inferior.</p><Tabla filas={lista} clave={x => x.tercero} columnas={[{ titulo: 'Cliente', celda: x => <button type="button" onClick={() => { setCliente(x); setDetalle(false) }} className="cursor-pointer text-left font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">{x.cliente ?? x.nit ?? x.tercero} →</button> }, { titulo: 'Facturas', celda: x => entero(x.facturas), alinear: 'der' }, { titulo: 'Vencido', celda: x => dinero(x.vencido), alinear: 'der' }, { titulo: 'Pagadas tarde', celda: x => entero(x.tarde), alinear: 'der' }]} /></Modal>}
      {cliente && <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo={`Facturas atrasadas de ${cliente.cliente ?? 'este cliente'}`} descripcion="Las que pagó tarde y las que siguen vencidas sin pagar" accion={<button type="button" onClick={() => setCliente(null)} className="text-xs text-muted-foreground hover:text-foreground">Cerrar</button>} ayuda={{ fuente: FUENTE, formula: 'Facturas del cliente con estado tarde o vencida sin pagar en el plazo elegido' }}>
        <CuerpoConsulta consulta={cuerpo(facturas)} altura="h-40">
          <TablaFacturas filas={facturas.data?.filas ?? []} />
        </CuerpoConsulta>
      </Bloque>}
    </div>
  )
}

function TablaFacturas({ filas }: { filas: FacturaCartera[] }) {
  return (
    <Tabla filas={filas} clave={f => f.id} columnas={[
      { titulo: 'Factura', celda: f => <span className="font-medium text-foreground">{f.factura}</span> },
      { titulo: 'Cliente', celda: f => f.cliente || '—' },
      { titulo: 'Condición de pago', celda: f => <span title={f.condicion_nombre}><span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px] font-semibold text-foreground">{f.condicion}</span> <span className="text-[12px] text-muted-foreground">{f.condicion_nombre}</span></span> },
      { titulo: 'Emisión', celda: f => fechaCorta(f.emision) },
      { titulo: 'Vence', celda: f => fechaCorta(f.vencimiento) },
      { titulo: 'Plazo', alinear: 'der', celda: f => `${f.dias} d` },
      { titulo: 'Estado', celda: f => <EtiquetaEstado estado={f.estado} /> },
      { titulo: 'Días vs vencimiento', alinear: 'der', celda: f => f.dias_vs_vencimiento == null ? '—' : <span className={colorDesviacion(f.dias_vs_vencimiento)}>{desviacion(f.dias_vs_vencimiento)}</span> },
      { titulo: 'Valor', alinear: 'der', celda: f => dinero(f.valor) },
      { titulo: 'Saldo', alinear: 'der', celda: f => (f.saldo > 1 ? dinero(f.saldo) : '—') },
      ...(filas.some(f => f.descuento > 0) ? [{ titulo: 'Descuento', alinear: 'der' as const, celda: (f: FacturaCartera) => (f.descuento > 0 ? <span className="text-violet-700 dark:text-violet-300">{dinero(f.descuento)} <span className="text-[11px]">({porcentaje(f.valor ? f.descuento / f.valor : 0, 1)})</span></span> : '—') }] : []),
    ]} />
  )
}

/** Cuánto debería entrar hasta una fecha, según vencimientos de la cartera abierta. */
function Proyeccion({ d }: { d: DashboardCartera }) {
  const hoy = hoyLocalIso()
  const [hasta, setHasta] = useState(() => sumarDias(hoy, 30))
  const [condicion, setCondicion] = useState('')
  const [detalle, setDetalle] = useState<'ventana' | 'vencida' | null>(null)
  const rapidos = [{ n: 1, t: 'Mañana' }, { n: 7, t: '7 días' }, { n: 15, t: '15 días' }, { n: 30, t: '30 días' }, { n: 60, t: '60 días' }, { n: 90, t: '90 días' }]
  const filtroCond = condicion === '' ? undefined : condicion
  const valida = hasta >= hoy
  const ventana = useQuery({
    queryKey: ['cartera-proyeccion', hoy, hasta, filtroCond],
    queryFn: () => consultaFacturas({ vence_desde: hoy, vence_hasta: hasta, estado: 'abierta', condicion: filtroCond, orden: 'vencimiento', tamano: 200 }),
    enabled: valida,
    staleTime: 5 * 60 * 1000,
  })
  const vencida = useQuery({
    queryKey: ['cartera-proyeccion-vencida', hoy, filtroCond],
    queryFn: () => consultaFacturas({ estado: 'impaga_vencida', condicion: filtroCond, orden: 'saldo', tamano: 200 }),
    staleTime: 5 * 60 * 1000,
  })
  const esperado = ventana.data?.totales.saldo ?? 0
  const arrastre = vencida.data?.totales.saldo ?? 0
  const opcionesCond = [...d.condiciones].filter(c => c.credito || c.saldo > 0).sort((a, b) => b.saldo - a.saldo)
  const etiquetaPlazo = filtroCond == null ? 'todas las facturas' : `las facturas ${filtroCond}`
  return (
    <div className="flex flex-col gap-4">
      <Lectura titulo="Para qué sirve esta pantalla" frases={[
        <>Elige hasta cuándo quieres proyectar (mañana, 7, 15, 30 días o una fecha) y verás <Fuerte>cuánta plata debería entrar</Fuerte> según los vencimientos de las facturas abiertas.</>,
        <>Si quieres ver solo una condición de pago, por ejemplo 30D o CFE, <Fuerte>elígela</Fuerte> en el filtro.</>,
      ]} />
      <div className="grid gap-3 md:grid-cols-3">
        <TarjetaBoton titulo="Vence en la ventana" cantidad={`${entero(ventana.data?.total ?? 0)} facturas · ${entero(ventana.data?.totales.clientes ?? 0)} clientes`} monto={dinero(esperado)} detalle={`${porcentaje(esperado / ((esperado + arrastre) || 1), 0)} del total por cobrar en esta vista`} alAbrir={() => setDetalle('ventana')} ayuda={{ fuente: FUENTE, formula: 'Saldo abierto que vence entre hoy y la fecha elegida ÷ (ese saldo + saldo vencido).' }} />
        <TarjetaBoton titulo="Ya vencido" cantidad={`${entero(vencida.data?.total ?? 0)} facturas`} monto={dinero(arrastre)} detalle={`${porcentaje(arrastre / ((esperado + arrastre) || 1), 0)} del total por cobrar en esta vista`} alAbrir={() => setDetalle('vencida')} ayuda={{ fuente: FUENTE, formula: 'Saldo vencido ÷ (saldo vencido + saldo que vence en la ventana).' }} />
        <TarjetaBoton titulo="Total por cobrar" cantidad={`${entero((ventana.data?.total ?? 0) + (vencida.data?.total ?? 0))} facturas`} monto={dinero(esperado + arrastre)} detalle="100 % de lo proyectado más lo vencido" alAbrir={() => setDetalle('ventana')} ayuda={{ fuente: FUENTE, formula: 'Saldo que vence en la ventana + saldo ya vencido.' }} />
      </div>
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="¿Cuánta plata espero cobrar?" ayuda={{ fuente: FUENTE, formula: 'Σ saldo de facturas abiertas con vencimiento entre hoy y la fecha. Lo que ya venció se muestra aparte.', nota: 'Es lo que entra si cada cliente paga en la fecha pactada. Los clientes que pagan tarde (pestaña "¿Quién no paga?") hacen que lo real sea menor.' }}>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1 text-[12px] font-medium text-muted-foreground">¿Hasta cuándo?</p>
            <div className="flex flex-wrap gap-1.5">
              {rapidos.map(r => (
                <button key={r.n} type="button" onClick={() => setHasta(sumarDias(hoy, r.n))} className={`h-9 rounded-md border px-3 text-sm ${hasta === sumarDias(hoy, r.n) ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-input bg-background text-foreground hover:bg-muted'}`}>{r.t}</button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">O elige una fecha
            <input type="date" min={hoy} value={hasta} onChange={e => e.target.value && setHasta(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm font-normal text-foreground" />
          </label>
          <Selector etiqueta="Condición de pago" valor={condicion} alCambiar={setCondicion}>
            <option value="">Todas las condiciones</option>
            {opcionesCond.map(c => <option key={c.condicion} value={c.condicion}>{c.condicion} · {c.nombre} ({c.dias} d)</option>)}
          </Selector>
        </div>
        {valida && ventana.data && <p className="mb-4 text-[15px] leading-relaxed text-foreground/90">
          Si cada cliente paga en la fecha pactada, entre hoy y el <Fuerte>{fechaCorta(hasta)}</Fuerte> deberían entrar <Fuerte>{dinero(esperado)}</Fuerte> de {etiquetaPlazo} ({entero(ventana.data.total)} facturas de {entero(ventana.data.totales.clientes)} clientes).
          {arrastre > 0 && <> Además hay <Fuerte>{dinero(arrastre)}</Fuerte> que ya venció y también deberías cobrar.</>}
        </p>}
        <Malla columnas={3}>
          <Tarjeta compacta tono="ok" etiqueta={`Vence hasta el ${fechaCorta(hasta)}`} valor={valida ? dinero(esperado) : '—'} nota={ventana.data ? `${entero(ventana.data.total)} facturas · ${entero(ventana.data.totales.clientes)} clientes` : undefined} />
          <Tarjeta compacta tono="err" etiqueta="Ya vencido (por cobrar)" valor={dinero(arrastre)} nota={vencida.data ? `${entero(vencida.data.total)} facturas` : undefined} />
          <Tarjeta compacta etiqueta="Total por cobrar" valor={dinero(esperado + arrastre)} nota="Lo que vence + lo ya vencido" />
        </Malla>
      </Bloque>
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="Qué vence cada semana" descripcion="Para ver en qué semanas se concentra lo que entra" ayuda={{ fuente: FUENTE, formula: 'Saldo abierto agrupado por semana de vencimiento contando desde hoy (todos los plazos)' }}>
        <BarrasApiladas3D datos={d.semanas.filter(s => s.semana <= 10).map(s => ({ ...s, etiqueta: s.semana === 1 ? 'Esta semana' : `+${s.semana - 1} sem` }))} ejeX="etiqueta" series={[{ clave: 'saldo', nombre: 'Vence', color: PALETA[0] }]} formato={compacto} altura={240} />
      </Bloque>
      {detalle && <Modal isOpen onClose={() => setDetalle(null)} title={detalle === 'ventana' ? 'Facturas que vencen en la ventana' : 'Facturas vencidas'} className="max-w-6xl"><p className="mb-2 text-sm text-muted-foreground">{detalle === 'ventana' ? `${entero(ventana.data?.total ?? 0)} facturas de ${entero(ventana.data?.totales.clientes ?? 0)} clientes · ${dinero(esperado)}` : `${entero(vencida.data?.total ?? 0)} facturas · ${dinero(arrastre)}`}</p><TablaFacturas filas={detalle === 'ventana' ? ventana.data?.filas ?? [] : vencida.data?.filas ?? []} />{detalle === 'ventana' && ventana.data && ventana.data.total > ventana.data.filas.length && <p className="mt-2 text-xs text-muted-foreground">Se muestran las primeras {entero(ventana.data.filas.length)} por vencimiento.</p>}</Modal>}
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="Facturas que vencen en esta ventana" descripcion={ventana.data && ventana.data.total > ventana.data.filas.length ? `Se muestran las ${entero(ventana.data.filas.length)} que vencen primero, de ${entero(ventana.data.total)}` : 'Por orden de vencimiento'} ayuda={{ fuente: FUENTE, formula: 'Facturas abiertas con vencimiento entre hoy y la fecha elegida' }}>
        <CuerpoConsulta consulta={cuerpo(ventana)} vacio={!valida} mensajeVacio={valida ? 'No hay facturas por vencer en esta ventana' : 'Elige una fecha desde hoy'} altura="h-40">
          <TablaFacturas filas={ventana.data?.filas ?? []} />
        </CuerpoConsulta>
      </Bloque>
    </div>
  )
}

/** Abre el tablero existente de facturas desde los resúmenes agregados. */
function DetallePlazos({ d, alCerrar, soloCredito = false }: { d: DashboardCartera; alCerrar: () => void; soloCredito?: boolean }) {
  const [plazo, setPlazo] = useState<PlazoCartera | null>(null)
  return <>
    {!plazo && <Modal isOpen onClose={alCerrar} title="Facturas por condición de pago" className="max-w-4xl">
      <p className="mb-3 text-sm text-muted-foreground">Elige una condición de pago para ver clientes y facturas. Allí puedes filtrar por estado y pasar de página.</p>
      <div className="grid gap-2 sm:grid-cols-2">{[...d.condiciones].filter(p => p.facturas > 0 && (!soloCredito || p.credito)).sort((a, b) => b.facturado - a.facturado).map(p => (
        <button key={p.condicion ?? p.nombre} type="button" onClick={() => setPlazo(p)} className="cursor-pointer rounded-xl border border-border bg-card p-3 text-left hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary">
          <span className="flex items-center gap-2"><span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px] font-bold">{p.condicion}</span><strong className="truncate">{p.nombre}</strong></span>
          <span className="block text-sm text-muted-foreground">{p.dias} días · {entero(p.facturas)} facturas · {dinero(p.facturado)} · <span className={p.vencido > 0 ? 'text-red-600' : ''}>{dinero(p.vencido)} vencido</span></span>
        </button>
      ))}</div>
    </Modal>}
    {plazo && <FacturasDelPlazo d={d} p={plazo} alCerrar={() => setPlazo(null)} />}
  </>
}

function Mensual({ d }: { d: DashboardCartera }) {
  const [detalle, setDetalle] = useState(false)
  const meses = useMemo(() => d.historia.filter(m => m.mes >= d.desde.slice(0, 7) && m.mes <= d.hasta.slice(0, 7)), [d.historia, d.desde, d.hasta])
  const vendido = useMemo(() => meses.reduce((s, m) => s + m.vendido_credito, 0), [meses])
  const entrado = useMemo(() => meses.reduce((s, m) => s + m.recaudo_credito, 0), [meses])
  const vencido = useMemo(() => meses.reduce((s, m) => s + m.vencido_hoy, 0), [meses])
  return <div className="flex flex-col gap-4">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCartera titulo="Vendido a crédito" valor={dinero(vendido)} nota="En el rango elegido" icono={Wallet} tono="cyan" alAbrir={() => setDetalle(true)} />
      <KpiCartera titulo="Recaudado" valor={dinero(entrado)} nota="Abonos recibidos en el rango" icono={BanknoteArrowDown} tono="emerald" alAbrir={() => setDetalle(true)} />
      <KpiCartera titulo="Quedó vencido" valor={dinero(vencido)} nota="De las ventas de esos meses" icono={CircleAlert} tono="rose" alAbrir={() => setDetalle(true)} />
      <KpiCartera titulo="Recaudado / vendido" valor={vendido ? porcentaje(entrado / vendido, 0) : '—'} nota="Los pagos pueden ser de ventas anteriores" icono={CalendarClock} tono="amber" />
    </div>
    <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="Vendido, recaudado y vencido mes a mes" descripcion="La franja marca el rango elegido; lo vencido corresponde a ventas de cada mes" ayuda={{ fuente: FUENTE, formula: 'Vendido a crédito: venta neta con IVA. Recaudado: abonos recibidos en el mes de facturas de crédito. Vencido: saldo hoy de lo vendido a crédito en ese mes.' }}>
      <LineaTiempo historia={d.historia} desde={d.desde} hasta={d.hasta} />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>🔵 Vendido a crédito</span><span>🟢 Recaudado</span><span>🔴 Quedó vencido</span></div>
    </Bloque>
    {detalle && <DetallePlazos d={d} soloCredito alCerrar={() => setDetalle(false)} />}
  </div>
}
