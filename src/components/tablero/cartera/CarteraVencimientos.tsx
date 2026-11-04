import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { hoyLocalIso } from '@/hooks/useFechasLimite'
import { Modal } from '@/components/ui/modal'
import { Bloque, CuerpoConsulta, Malla, SubPestanas, Tabla, Tarjeta } from '../comun'
import { Areas, BarrasApiladas } from '../graficas'
import { BarraEstados, ComoLeer, Lectura } from '../Guia'
import { PALETA, compacto, decimal, dinero, entero, etiquetaMes, porcentaje } from '../formato'
import type { ClienteCartera, DashboardCartera, EstadoFacturaCartera, FacturaCartera, PlazoCartera, RespuestaFacturasCartera } from '../ventas/tipos'

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
  const opciones = [
    { valor: 'resumen', etiqueta: 'Resumen' },
    { valor: 'plazos', etiqueta: '¿Pagan a tiempo?' },
    { valor: 'seguimiento', etiqueta: '¿Quién no paga?' },
    { valor: 'proyeccion', etiqueta: '¿Cuánto voy a cobrar?' },
    { valor: 'mensual', etiqueta: 'Mes a mes' },
  ]
  const activa = opciones.some(o => o.valor === sub) ? sub : 'resumen'

  return (
    <SubPestanas opciones={opciones} activa={activa} alElegir={alElegirSub}>
      <div className="flex flex-col gap-4">
        {activa === 'resumen' && <Resumen d={d} irA={alElegirSub} />}
        {activa === 'plazos' && <PagoPorPlazo d={d} />}
        {activa === 'seguimiento' && <Seguimiento d={d} />}
        {activa === 'proyeccion' && <Proyeccion d={d} />}
        {activa === 'mensual' && <Bloque titulo="Crédito vendido y plata que entró, mes a mes" descripcion="Si la línea de lo recaudado queda por debajo de lo facturado varios meses seguidos, la cartera está creciendo" ayuda={{ fuente: FUENTE, formula: 'Facturado = facturas de crédito emitidas en el mes. Recaudado = abonos a facturas de crédito recibidos en el mes (de cualquier emisión).' }}>
          <Areas datos={d.mensual.map(m => ({ ...m, etiqueta: etiquetaMes(m.mes) }))} ejeX="etiqueta" series={[
            { clave: 'facturado_credito', nombre: 'Vendido a crédito', color: PALETA[0] },
            { clave: 'recaudo_credito', nombre: 'Plata que entró', color: PALETA[1] },
          ]} formato={dinero} />
        </Bloque>}
      </div>
    </SubPestanas>
  )
}

/** Primera pantalla: lo esencial dicho en frases, los seis números y el cuadro de lotes. */
function Resumen({ d, irA }: { d: DashboardCartera; irA: (v: string) => void }) {
  const k = d.kpis
  const v90 = d.vencida.find(l => l.id === 'v90')?.saldo ?? 0
  const lotes = [
    ...[...d.vencida].reverse().map(l => ({ nombre: l.nombre.replace('Vencida ', '').replace(' días', ' d'), vencida: l.saldo, por_vencer: 0 })),
    ...d.por_vencer.filter(l => l.saldo > 0).map(l => ({ nombre: l.nombre.replace('Vence en ', '').replace(' días', ' d'), vencida: 0, por_vencer: l.saldo })),
  ]
  const frases = [
    <>Vendiste <Fuerte>{dinero(k.venta_credito)}</Fuerte> a crédito{k.credito_pct != null && <> ({porcentaje(k.credito_pct, 0)} de lo facturado)</>}, con un plazo promedio de <Fuerte>{dias(k.plazo_promedio)}</Fuerte>.</>,
    k.dias_pago_promedio != null && <>Tus clientes pagan en promedio a los <Fuerte>{dias(k.dias_pago_promedio)}</Fuerte>
      {k.plazo_promedio != null && k.dias_pago_promedio > k.plazo_promedio + 1 ? <>, o sea <Fuerte>{dias(k.dias_pago_promedio - k.plazo_promedio)} más</Fuerte> de lo pactado</> : <>, dentro de lo pactado</>}
      {k.pagado_a_tiempo_pct != null && <>. Solo el <Fuerte>{porcentaje(k.pagado_a_tiempo_pct, 0)}</Fuerte> de lo que ya pagaron llegó a tiempo</>}.</>,
    <>Hoy tienes <Fuerte>{dinero(k.cartera_abierta)}</Fuerte> por cobrar: <Fuerte>{dinero(k.vence_30)}</Fuerte> vencen en los próximos 30 días y <Fuerte>{dinero(k.vencida)}</Fuerte>{k.vencida_pct != null && <> ({porcentaje(k.vencida_pct, 0)})</>} ya están vencidos.</>,
    v90 > 0 && <>De lo vencido, <Fuerte>{dinero(v90)}</Fuerte> lleva más de 90 días: probablemente toca negociar o depurar esa cartera.</>,
  ].filter(Boolean) as React.ReactNode[]
  return <>
    <Lectura frases={frases} />
    <Malla columnas={3}>
      <Tarjeta compacta etiqueta="Vendido a crédito" valor={dinero(k.venta_credito)} nota={k.credito_pct == null ? undefined : `${porcentaje(k.credito_pct, 0)} de lo facturado en el rango`} ayuda={{ fuente: FUENTE, formula: `Facturas emitidas en el rango con plazo de ${d.umbral_credito_dias} días o más` }} />
      <Tarjeta compacta etiqueta="Por cobrar hoy" valor={dinero(k.cartera_abierta)} nota="Todo lo que los clientes deben ahora" ayuda={{ fuente: FUENTE, formula: 'Suma del saldo de las facturas de venta que aún no se han pagado completas', nota: 'Es el saldo de hoy, no depende del rango de fechas.' }} />
      <Tarjeta compacta tono="ok" etiqueta="Vence en 30 días" valor={dinero(k.vence_30)} nota={`En 60 días: ${dinero(k.vence_60)}`} ayuda={{ fuente: FUENTE, formula: 'Saldo de facturas cuyo vencimiento cae entre hoy y 30 días', nota: 'Es lo que debería entrar este mes si cada cliente paga en la fecha pactada.' }} />
      <Tarjeta compacta tono="err" etiqueta="Ya vencido" valor={dinero(k.vencida)} nota={k.vencida_pct == null ? undefined : `${porcentaje(k.vencida_pct, 0)} de lo que te deben`} ayuda={{ fuente: FUENTE, formula: 'Saldo de facturas cuya fecha de vencimiento ya pasó' }} />
      <Tarjeta compacta etiqueta="Plazo que das" valor={dias(k.plazo_promedio)} nota="Promedio ponderado por valor" ayuda={{ fuente: FUENTE, formula: 'Días de la condición de pago de cada factura de crédito, ponderados por su valor' }} />
      <Tarjeta compacta tono={k.dias_pago_promedio != null && k.plazo_promedio != null && k.dias_pago_promedio > k.plazo_promedio + 1 ? 'aviso' : 'ok'} etiqueta="En cuánto te pagan" valor={dias(k.dias_pago_promedio)} nota="Promedio de las facturas ya pagadas" ayuda={{ fuente: FUENTE, formula: 'Días entre la emisión y la cancelación de las facturas de crédito ya pagadas, ponderado por valor' }} />
    </Malla>
    <Bloque titulo="¿Cuándo vence lo que me deben?" descripcion="Rojo: ya venció y toca cobrar. Azul: aún está en plazo" ayuda={{ fuente: FUENTE, formula: 'Saldo abierto agrupado por días de vencimiento respecto de hoy' }}>
      <BarrasApiladas datos={lotes} ejeX="nombre" series={[
        { clave: 'vencida', nombre: 'Vencida', color: PALETA[5] },
        { clave: 'por_vencer', nombre: 'Por vencer', color: PALETA[0] },
      ]} formato={dinero} altura={300} />
    </Bloque>
    <Malla columnas={3}>
      {[
        { id: 'plazos', t: '¿Pagan a tiempo?', e: 'Por cada plazo (8, 15, 30 días…), cuántas facturas se pagan dentro del plazo.' },
        { id: 'seguimiento', t: '¿Quién no paga?', e: 'La lista de clientes que se atrasan, para llamarlos.' },
        { id: 'proyeccion', t: '¿Cuánto voy a cobrar?', e: 'Cuánta plata debería entrar mañana, en 7, 15 o 30 días.' },
      ].map(x => (
        <button key={x.id} type="button" onClick={() => irA(x.id)} className="rounded-3xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary">
          <p className="text-[14px] font-semibold text-foreground">{x.t} →</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{x.e}</p>
        </button>
      ))}
    </Malla>
    <ComoLeer items={GLOSARIO} />
  </>
}

/** Una tarjeta por plazo: la barra muestra de un vistazo cuántas facturas pagan en el plazo. */
function PagoPorPlazo({ d }: { d: DashboardCartera }) {
  const [vista, setVista] = useState<'plazo' | 'condicion'>('plazo')
  const [abierto, setAbierto] = useState<PlazoCartera | null>(null)
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
  return <>
    <Lectura titulo="Cómo leerlo" frases={[
      <>Aquí va solo el <Fuerte>crédito</Fuerte> (8 días o más). Cada tarjeta es un plazo. La barra reparte las facturas de ese plazo: <Fuerte>verde</Fuerte> se pagó a tiempo, <Fuerte>amarillo</Fuerte> se pagó tarde, <Fuerte>rojo</Fuerte> ya venció y no han pagado, <Fuerte>gris</Fuerte> aún está en plazo.</>,
      <>Entre más verde, mejor paga ese plazo. Haz clic en cualquier tarjeta para <Fuerte>ver sus facturas</Fuerte> y filtrar las vencidas.</>,
    ]} />
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
    {principal && puntoPrincipal && <Bloque titulo="¿Cuánto llega y cuándo?" descripcion="Cada línea es un plazo. Lee de izquierda a derecha: qué % de lo vendido ya se había cobrado a los N días de facturar" ayuda={{ fuente: FUENTE, formula: 'Σ abonos con fecha hasta N días después de emitir la factura ÷ lo facturado en ese plazo', nota: 'Las facturas recientes todavía no han tenido tiempo de pagar, por eso conviene mirar un rango largo.' }}>
      <p className="mb-3 text-[13px] text-muted-foreground">Por ejemplo, de lo vendido a <Fuerte>{principal.dias} días</Fuerte>, a los <Fuerte>{puntoPrincipal.dias} días</Fuerte> de facturar ya se había cobrado el <Fuerte>{porcentaje(puntoPrincipal.porcentaje, 0)}</Fuerte>.</p>
      <Areas datos={curva} ejeX="etiqueta" series={seriesCurva} formato={v => porcentaje(Number(v), 0)} altura={300} />
    </Bloque>}
    {abierto && <FacturasDelPlazo d={d} p={abierto} alCerrar={() => setAbierto(null)} />}
  </>
}

function TarjetaPlazo({ p, alAbrir }: { p: PlazoCartera; alAbrir: () => void }) {
  const c = p.cumplimiento
  const diez = deCada10(c.a_tiempo_pct)
  const partes = ESTADOS_BARRA.map(e => ({ ...e, valor: c[e.clave].facturas, detalle: e.clave === 'impaga_vencida' && c.impaga_vencida.valor ? dinero(c.impaga_vencida.valor) : undefined }))
  const nombre = p.condicion ? p.nombre : (p.credito ? `Crédito a ${p.dias} días` : `Pago a contado (${p.dias} d)`)
  return (
    <div role="button" tabIndex={0} onClick={alAbrir} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alAbrir() } }}
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
    </div>
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

/** Tablero con todas las facturas de un plazo (o condición) y filtro por estado. */
function FacturasDelPlazo({ d, p, alCerrar }: { d: DashboardCartera; p: PlazoCartera; alCerrar: () => void }) {
  const [estado, setEstado] = useState<FiltroEstado>('todas')
  const [texto, setTexto] = useState('')
  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(1)
  useEffect(() => {
    const t = setTimeout(() => { setBuscar(texto.trim()); setPagina(1) }, 350)
    return () => clearTimeout(t)
  }, [texto])
  const c = p.cumplimiento
  const nombre = p.condicion ? p.nombre : (p.credito ? `Crédito a ${p.dias} días` : `Pago a contado (${p.dias} d)`)
  const filtros: { valor: FiltroEstado; etiqueta: string; n: number; clase: string }[] = [
    { valor: 'todas', etiqueta: 'Todas', n: c.a_tiempo.facturas + c.tarde.facturas + c.impaga_vencida.facturas + c.por_vencer.facturas, clase: 'border-primary bg-primary/10 text-primary' },
    { valor: 'impaga_vencida', etiqueta: 'Vencidas sin pagar', n: c.impaga_vencida.facturas, clase: 'border-red-500 bg-red-50 text-red-700' },
    { valor: 'tarde', etiqueta: 'Pagadas tarde', n: c.tarde.facturas, clase: 'border-amber-500 bg-amber-50 text-amber-800' },
    { valor: 'a_tiempo', etiqueta: 'Pagadas a tiempo', n: c.a_tiempo.facturas, clase: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
    { valor: 'por_vencer', etiqueta: 'Aún en plazo', n: c.por_vencer.facturas, clase: 'border-slate-400 bg-slate-100 text-slate-700' },
  ]
  const consulta = useQuery({
    queryKey: ['cartera-facturas-plazo', d.desde, d.hasta, p.condicion ?? p.dias, estado, buscar, pagina],
    queryFn: () => consultaFacturas({
      desde: d.desde, hasta: d.hasta, dias: p.condicion ? undefined : p.dias, condicion: p.condicion,
      estado: estado === 'todas' ? undefined : estado, buscar: buscar || undefined,
      orden: estado === 'impaga_vencida' ? 'mora' : 'recientes', pagina, tamano: TAMANO_PAGINA,
    }),
    placeholderData: previo => previo,
    staleTime: 5 * 60 * 1000,
  })
  const r = consulta.data
  const paginas = r ? Math.max(1, Math.ceil(r.total / r.tamano)) : 1
  return (
    <Modal isOpen onClose={alCerrar} title={<span>{nombre} <span className="text-[13px] font-normal text-muted-foreground">· facturas emitidas del {fechaCorta(d.desde)} al {fechaCorta(d.hasta)}</span></span>} className="max-w-6xl">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {filtros.map(f => (
          <button key={f.valor} type="button" onClick={() => { setEstado(f.valor); setPagina(1) }} aria-pressed={estado === f.valor}
            className={`h-9 rounded-full border px-3 text-[13px] ${estado === f.valor ? `${f.clase} font-semibold` : 'border-input bg-background text-foreground hover:bg-muted'}`}>
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
  const planes = d.plazos.filter(p => p.cumplimiento.facturas > 0)
  const porDefecto = [...planes].filter(p => p.credito).sort((a, b) => b.facturado - a.facturado)[0] ?? planes[0]
  const [dias, setDias] = useState<number | undefined>(plazoInicial ?? porDefecto?.dias)
  const [cliente, setCliente] = useState<ClienteCartera | null>(null)
  const plazo = planes.find(p => p.dias === dias)
  const clientes = useQuery({
    queryKey: ['cartera-clientes', d.desde, d.hasta, dias ?? 'todos'],
    queryFn: async () => (await apiClient.get<{ success: boolean; data: ClienteCartera[] }>('/dashboard/cartera/clientes', { params: { desde: d.desde, hasta: d.hasta, dias } })).data.data,
    staleTime: 5 * 60 * 1000,
  })
  const facturas = useQuery({
    queryKey: ['cartera-facturas-cliente', d.desde, d.hasta, dias ?? 'todos', cliente?.tercero],
    queryFn: () => consultaFacturas({ desde: d.desde, hasta: d.hasta, dias, tercero: cliente?.tercero, estado: 'no_cumple', orden: 'vencimiento', tamano: 200 }),
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
        <>Elige un plazo y verás <Fuerte>qué clientes no pagan a tiempo</Fuerte>, empezando por los que más deben ya vencido. Son los que hay que llamar.</>,
        <>Haz clic en el nombre de un cliente para ver <Fuerte>las facturas atrasadas</Fuerte> que le debes reclamar.</>,
      ]} />
      <Bloque titulo="¿Cuántas pagan dentro del plazo?" descripcion={`Facturas emitidas del ${fechaCorta(d.desde)} al ${fechaCorta(d.hasta)} que ya se pueden juzgar (pagadas o vencidas)`} ayuda={{ fuente: FUENTE, formula: 'Pagan en el plazo = facturas canceladas en o antes del vencimiento ÷ (canceladas + vencidas sin pagar)', nota: 'Las facturas abiertas que aún no vencen no cuentan: todavía están a tiempo.' }}>
        <div className="mb-4 max-w-xs">
          <Selector etiqueta="Plazo de la factura" valor={String(dias ?? '')} alCambiar={v => { setDias(v === '' ? undefined : Number(v)); setCliente(null) }}>
            <option value="">Todos los plazos</option>
            {planes.map(p => <option key={p.dias} value={p.dias}>{p.credito ? `Crédito a ${p.dias} días` : `Pago a contado (${p.dias} d)`}</option>)}
          </Selector>
        </div>
        {c && plazo ? <>
          <p className="mb-3 text-[14px] text-foreground/90">
            De <Fuerte>{entero(c.facturas)}</Fuerte> facturas a {plazo.dias} días que ya se pueden juzgar, <Fuerte>{entero(c.a_tiempo.facturas)}</Fuerte>{diez != null && <> (<Fuerte>{diez} de cada 10</Fuerte>)</>} se pagaron a tiempo.
            {c.tarde.facturas > 0 && <> <Fuerte>{entero(c.tarde.facturas)}</Fuerte> se pagaron tarde</>}
            {c.impaga_vencida.facturas > 0 && <> y <Fuerte>{entero(c.impaga_vencida.facturas)}</Fuerte> siguen sin pagar: son <Fuerte>{dinero(c.impaga_vencida.valor)}</Fuerte> por cobrar</>}.
          </p>
          <BarraEstados partes={ESTADOS_BARRA.map(e => ({ ...e, valor: c[e.clave].facturas }))} formato={entero} />
        </> : <p className="text-[14px] text-foreground/90">Resumen de <Fuerte>todos los plazos</Fuerte> juntos. Elige uno para ver su porcentaje de cumplimiento.</p>}
      </Bloque>
      <Bloque titulo="Clientes que no pagan en el plazo" descripcion={lista.length ? `${entero(lista.length)} clientes con facturas atrasadas · ${dinero(vencidoTotal)} vencido por cobrar` : undefined} ayuda={{ fuente: FUENTE, formula: 'Por cliente: facturas pagadas a tiempo, tarde y vencidas sin pagar. Retraso = días de atraso ponderados por valor (si pagó tarde, hasta que pagó; si no ha pagado, hasta hoy).' }}>
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
      {cliente && <Bloque titulo={`Facturas atrasadas de ${cliente.cliente ?? 'este cliente'}`} descripcion="Las que pagó tarde y las que siguen vencidas sin pagar" accion={<button type="button" onClick={() => setCliente(null)} className="text-xs text-muted-foreground hover:text-foreground">Cerrar</button>} ayuda={{ fuente: FUENTE, formula: 'Facturas del cliente con estado tarde o vencida sin pagar en el plazo elegido' }}>
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
      { titulo: 'Emisión', celda: f => fechaCorta(f.emision) },
      { titulo: 'Vence', celda: f => fechaCorta(f.vencimiento) },
      { titulo: 'Plazo', alinear: 'der', celda: f => `${f.dias} d` },
      { titulo: 'Estado', celda: f => <EtiquetaEstado estado={f.estado} /> },
      { titulo: 'Días vs vencimiento', alinear: 'der', celda: f => f.dias_vs_vencimiento == null ? '—' : <span className={colorDesviacion(f.dias_vs_vencimiento)}>{desviacion(f.dias_vs_vencimiento)}</span> },
      { titulo: 'Valor', alinear: 'der', celda: f => dinero(f.valor) },
      { titulo: 'Saldo', alinear: 'der', celda: f => (f.saldo > 1 ? dinero(f.saldo) : '—') },
    ]} />
  )
}

/** Cuánto debería entrar hasta una fecha, según vencimientos de la cartera abierta. */
function Proyeccion({ d }: { d: DashboardCartera }) {
  const hoy = hoyLocalIso()
  const [hasta, setHasta] = useState(() => sumarDias(hoy, 30))
  const [dias, setDias] = useState('')
  const rapidos = [{ n: 1, t: 'Mañana' }, { n: 7, t: '7 días' }, { n: 15, t: '15 días' }, { n: 30, t: '30 días' }, { n: 60, t: '60 días' }, { n: 90, t: '90 días' }]
  const filtroDias = dias === '' ? undefined : Number(dias)
  const valida = hasta >= hoy
  const ventana = useQuery({
    queryKey: ['cartera-proyeccion', hoy, hasta, filtroDias],
    queryFn: () => consultaFacturas({ vence_desde: hoy, vence_hasta: hasta, estado: 'abierta', dias: filtroDias, orden: 'vencimiento', tamano: 200 }),
    enabled: valida,
    staleTime: 5 * 60 * 1000,
  })
  const vencida = useQuery({
    queryKey: ['cartera-proyeccion-vencida', hoy, filtroDias],
    queryFn: () => consultaFacturas({ estado: 'impaga_vencida', dias: filtroDias, orden: 'saldo', tamano: 1 }),
    staleTime: 5 * 60 * 1000,
  })
  const esperado = ventana.data?.totales.saldo ?? 0
  const arrastre = vencida.data?.totales.saldo ?? 0
  const opcionesDias = [...new Set(d.condiciones.filter(c => c.credito || c.saldo > 0).map(c => c.dias))].sort((a, b) => a - b)
  const etiquetaPlazo = filtroDias == null ? 'todas las facturas' : `las facturas a ${filtroDias} días`
  return (
    <div className="flex flex-col gap-4">
      <Lectura titulo="Para qué sirve esta pantalla" frases={[
        <>Elige hasta cuándo quieres proyectar (mañana, 7, 15, 30 días o una fecha) y verás <Fuerte>cuánta plata debería entrar</Fuerte> según los vencimientos de las facturas abiertas.</>,
        <>Si quieres ver solo lo vendido a un plazo, por ejemplo a 30 días, <Fuerte>elige el plazo</Fuerte> en el filtro.</>,
      ]} />
      <Bloque titulo="¿Cuánta plata espero cobrar?" ayuda={{ fuente: FUENTE, formula: 'Σ saldo de facturas abiertas con vencimiento entre hoy y la fecha. Lo que ya venció se muestra aparte.', nota: 'Es lo que entra si cada cliente paga en la fecha pactada. Los clientes que pagan tarde (pestaña "¿Quién no paga?") hacen que lo real sea menor.' }}>
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
          <Selector etiqueta="¿De qué plazo?" valor={dias} alCambiar={setDias}>
            <option value="">Todos los plazos</option>
            {opcionesDias.map(n => <option key={n} value={n}>{n >= d.umbral_credito_dias ? `Crédito a ${n} días` : `Pago a contado (${n} d)`}</option>)}
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
      <Bloque titulo="Qué vence cada semana" descripcion="Para ver en qué semanas se concentra lo que entra" ayuda={{ fuente: FUENTE, formula: 'Saldo abierto agrupado por semana de vencimiento contando desde hoy (todos los plazos)' }}>
        <BarrasApiladas datos={d.semanas.filter(s => s.semana <= 10).map(s => ({ ...s, etiqueta: s.semana === 1 ? 'Esta semana' : `+${s.semana - 1} sem` }))} ejeX="etiqueta" series={[{ clave: 'saldo', nombre: 'Vence', color: PALETA[0] }]} formato={compacto} altura={240} />
      </Bloque>
      <Bloque titulo="Facturas que vencen en esta ventana" descripcion={ventana.data && ventana.data.total > ventana.data.filas.length ? `Se muestran las ${entero(ventana.data.filas.length)} que vencen primero, de ${entero(ventana.data.total)}` : 'Por orden de vencimiento'} ayuda={{ fuente: FUENTE, formula: 'Facturas abiertas con vencimiento entre hoy y la fecha elegida' }}>
        <CuerpoConsulta consulta={cuerpo(ventana)} vacio={!valida} mensajeVacio={valida ? 'No hay facturas por vencer en esta ventana' : 'Elige una fecha desde hoy'} altura="h-40">
          <TablaFacturas filas={ventana.data?.filas ?? []} />
        </CuerpoConsulta>
      </Bloque>
    </div>
  )
}
