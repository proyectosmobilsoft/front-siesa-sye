import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Bloque, Tabla } from '../comun'
import { Lectura, ComoLeer } from '../Guia'
import { PALETA, dinero, entero, etiquetaMes, porcentaje, decimal } from '../formato'
import { Barras3D, BarrasH3D, BarrasApiladas3D, Dona3D } from '../graficas3d'
import type { CasosCartera, CasoContraentrega } from '../ventas/tipos'
import { TarjetaBoton } from './TarjetaBoton'

type Estado = CasoContraentrega['estado']
const estados = [
  { clave: 'a_tiempo', nombre: 'A tiempo', color: PALETA[1] },
  { clave: 'tarde_30', nombre: 'Tarde, hasta 30 días', color: PALETA[2] },
  { clave: 'tarde_mas_30', nombre: 'Después de 30 días', color: PALETA[5] },
  { clave: 'sin_pagar', nombre: 'Sin pagar', color: '#9f2020' },
  { clave: 'por_vencer', nombre: 'Por vencer', color: PALETA[0] },
] as const
const fecha = (s: string | null) => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—'
const tasa = (n: number, total: number) => porcentaje(total ? n / total : 0, 1)

export function CasosEspeciales({ d }: { d: CasosCartera }) {
  const [detalle, setDetalle] = useState<Estado | 'c01' | null>(null)
  const [tercero, setTercero] = useState<number | null>(null)
  const co = d.contraentrega
  const c = d.c01
  const datos = useMemo(() => {
    // Incluye 'pagada' (saldo en cero sin fecha de pago) para que la dona sume 100 %; sin porciones vacías.
    const porEstado = [...estados, { clave: 'pagada' as const, nombre: 'Pagada (sin fecha de pago)', color: '#94a3b8' }]
      .map(e => ({ nombre: e.nombre, valor: co.estados[e.clave].documentos, color: e.color })).filter(e => e.valor > 0)
    const condiciones = co.por_condicion.map(x => ({ nombre: x.condicion, nombreLargo: x.nombre, total: x.documentos, valor: Math.round((x.problema_pct ?? (x.documentos ? x.problema_documentos / x.documentos : 0)) * 10000) / 100, color: x.problema_documentos ? PALETA[5] : PALETA[1], documentos: x.problema_documentos, monto: x.estados.tarde_mas_30.valor + x.estados.sin_pagar.valor }))
    const meses = co.mensual.map(m => ({ nombre: etiquetaMes(m.mes), a_tiempo: m.estados.a_tiempo.documentos, tarde_30: m.estados.tarde_30.documentos, tarde_mas_30: m.estados.tarde_mas_30.documentos, sin_pagar: m.estados.sin_pagar.documentos }))
    const clientes = [...co.clientes].sort((a, b) => b.valor - a.valor).slice(0, 10).map(x => { const n = x.cliente ?? x.nit ?? String(x.tercero); return { nombre: n.length > 26 ? `${n.slice(0, 25)}…` : n, valor: x.valor, color: PALETA[5] } })
    const clases = [
      { clave: 'contado', nombre: 'Contado', color: PALETA[1] },
      { clave: 'contraentrega', nombre: 'Contraentrega', color: PALETA[0] },
      { clave: 'credito_valido', nombre: 'Crédito válido CEX', color: PALETA[2] },
      { clave: 'credito_erroneo', nombre: 'Crédito erróneo', color: PALETA[5] },
    ].map(x => ({ nombre: x.nombre, color: x.color, valor: c.por_condicion.filter(y => y.clase === x.clave).reduce((s, y) => s + y.documentos, 0) }))
    return { porEstado, condiciones, meses, clientes, clases }
  }, [co, c])
  const casos = useMemo(() => co.casos.filter(x => x.estado === detalle), [co.casos, detalle])
  const clientes = useMemo(() => {
    const ids = new Set(casos.map(x => x.tercero))
    return co.clientes.filter(x => ids.has(x.tercero)).map(x => {
      const docs = casos.filter(y => y.tercero === x.tercero)
      const valor = docs.reduce((s, y) => s + y.valor, 0)
      const minimo = (l: (string | null)[]) => l.filter((v): v is string => !!v).sort()[0] ?? null
      const maximo = (l: (string | null)[]) => l.filter((v): v is string => !!v).sort().reverse()[0] ?? null
      return { ...x, desde: minimo(docs.map(y => y.fecha)), hasta: maximo(docs.map(y => y.fecha)), vence: minimo(docs.map(y => y.vence)), ultimo_pago: maximo(docs.map(y => y.pagada_el)), documentos: docs.length, valor, saldo: docs.reduce((s, y) => s + y.saldo, 0), dias_promedio: valor ? docs.reduce((s, y) => s + y.dias * y.valor, 0) / valor : null }
    }).sort((a, b) => b.valor - a.valor)
  }, [casos, co.clientes])
  const casosSeguir = co.estados.tarde_mas_30.documentos + co.estados.sin_pagar.documentos
  return <div className="flex flex-col gap-4">
    <Lectura frases={[
      <>De {entero(co.documentos)} contraentregas, {entero(co.estados.a_tiempo.documentos)} ({tasa(co.estados.a_tiempo.documentos, co.documentos)}) se pagaron a tiempo y {entero(co.estados.tarde_30.documentos)} ({tasa(co.estados.tarde_30.documentos, co.documentos)}) tarde, dentro de {d.dias_tarde} días. {entero(casosSeguir)} ({tasa(casosSeguir, co.documentos)}) son casos a seguir: {entero(co.estados.tarde_mas_30.documentos)} pagaron después de {d.dias_tarde} días y {entero(co.estados.sin_pagar.documentos)} siguen sin pagar.</>,
      <>De {entero(c.documentos)} C01, {entero(c.erroneas_documentos)} ({tasa(c.erroneas_documentos, c.documentos)}) tienen condición de crédito distinta de {c.credito_valido.join(', ') || 'CEX'}: hay que corregirlas en SIESA. Siguen sumando en “Vendido a crédito”.</>,
    ]} />
    <div className="grid gap-3 md:grid-cols-3">
      <TarjetaBoton titulo="Contraentrega sin pagar" cantidad={`${entero(co.estados.sin_pagar.documentos)} documentos`} monto={dinero(co.estados.sin_pagar.valor)} detalle={`${entero(co.casos.filter(x => x.estado === 'sin_pagar').map(x => x.tercero).filter((x, i, a) => a.indexOf(x) === i).length)} clientes · ${tasa(co.estados.sin_pagar.documentos, co.documentos)} de las contraentregas`} alAbrir={() => { setDetalle('sin_pagar'); setTercero(null) }} ayuda={{ fuente: 'SIESA: condiciones CRC y KE1 a KE7; pagos de los documentos.', formula: 'Contraentregas vencidas con saldo pendiente ÷ total de contraentregas.', nota: 'Contraentrega se paga al entregar; no es crédito.' }} />
      <TarjetaBoton titulo="Pagada después de 30 días" cantidad={`${entero(co.estados.tarde_mas_30.documentos)} documentos`} monto={dinero(co.estados.tarde_mas_30.valor)} detalle={`${entero(new Set(co.casos.filter(x => x.estado === 'tarde_mas_30').map(x => x.tercero)).size)} clientes · ${tasa(co.estados.tarde_mas_30.documentos, co.documentos)} del total · ${decimal(co.casos.filter(x => x.estado === 'tarde_mas_30').reduce((s, x) => s + x.dias, 0) / (co.estados.tarde_mas_30.documentos || 1), 0)} días promedio desde emisión`} alAbrir={() => { setDetalle('tarde_mas_30'); setTercero(null) }} ayuda={{ fuente: 'SIESA: pagos de contraentregas CRC y KE1 a KE7.', formula: `Pagadas más de ${d.dias_tarde} días después del vencimiento ÷ total de contraentregas.`, nota: 'Se usaron como crédito aunque debían pagarse al entregar.' }} />
      <TarjetaBoton titulo="C01 con condición de crédito" cantidad={`${entero(c.erroneas_documentos)} de ${entero(c.documentos)} C01`} monto={dinero(c.erroneas_valor)} detalle={`${tasa(c.erroneas_documentos, c.documentos)} del total · ver documentos`} alAbrir={() => setDetalle('c01')} ayuda={{ fuente: 'Documentos C01 y condición de pago en SIESA.', formula: 'C01 con condición de crédito distinta de CEX ÷ todas las C01.', nota: 'C01 es venta de mostrador. Solo CEX es crédito válido; las otras condiciones de crédito requieren corrección.' }} />
    </div>
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="¿Cómo se pagan las contraentregas?" descripcion="De cada 100 contraentregas, las que pagan después de 30 días o siguen sin pagar requieren seguimiento" ayuda={{ fuente: 'SIESA: documentos CRC y KE1 a KE7 y sus pagos.', formula: 'Documentos por estado ÷ total de contraentregas.', nota: '“Pagada” sin fecha de pago se excluye de la dona.' }}><Dona3D datos={datos.porEstado} formato={entero} centro="a tiempo" porcentajeCentro={co.documentos ? co.estados.a_tiempo.documentos / co.documentos : 0} /></Bloque>
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="Casos a seguir por condición" descripcion="Porcentaje de cada condición CRC o KE con pago muy tarde o saldo vencido" ayuda={{ fuente: 'SIESA: contraentregas por condición de pago.', formula: '(Pagadas después de 30 días + vencidas sin pagar) ÷ documentos de esa condición.' }}><Barras3D datos={datos.condiciones} formato={v => `${decimal(v, 2)} %`} formatoEje={v => `${decimal(v, 1)} %`} nombreValor="Casos a seguir" tooltipExtra={nombre => { const x = datos.condiciones.find(y => y.nombre === nombre); return x ? `${x.nombreLargo} · ${entero(x.documentos)} de ${entero(x.total)} documentos · ${dinero(x.monto)}` : '' }} /></Bloque>
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="Contraentregas mes a mes" descripcion="Número de documentos según cuándo se pagaron" ayuda={{ fuente: 'SIESA: contraentregas emitidas en cada mes.', formula: 'Conteo mensual de documentos por estado de pago.' }}><BarrasApiladas3D datos={datos.meses} ejeX="nombre" series={estados.filter(x => x.clave !== 'por_vencer').map(x => ({ clave: x.clave, nombre: x.nombre, color: x.color }))} formato={entero} /></Bloque>
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="Clientes con más valor en casos a seguir" descripcion="Los 10 clientes con mayor valor de contraentregas pagadas muy tarde o sin pagar" ayuda={{ fuente: 'SIESA: contraentregas por cliente.', formula: 'Suma del valor de documentos pagados después de 30 días o vencidos sin pagar.' }}><BarrasH3D datos={datos.clientes} formato={dinero} anchoEtiqueta={190} /></Bloque>
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="¿Qué tipo de venta es cada C01?" descripcion="Contado, contraentrega, crédito CEX válido o condición errónea" ayuda={{ fuente: 'SIESA: documentos C01 y condición de pago.', formula: 'Documentos de cada clase ÷ todas las C01.', nota: 'Solo CEX es crédito válido en C01.' }}><Dona3D datos={datos.clases} formato={entero} centro="contado" porcentajeCentro={c.documentos ? datos.clases[0].valor / c.documentos : 0} /></Bloque>
    </div>
    <ComoLeer items={[
      { termino: 'Contraentrega', significado: 'Condiciones CRC y KE1 a KE7. Debe pagarse al entregar; no es crédito.' },
      { termino: 'A tiempo', significado: 'Pagó en la fecha de vencimiento o antes.' },
      { termino: 'Tarde, hasta 30 días', significado: 'Pagó después del vencimiento, dentro de los siguientes 30 días.' },
      { termino: 'Caso a seguir', significado: 'Pagó más de 30 días después del vencimiento o ya venció y sigue sin pagar.' },
      { termino: 'C01 errónea', significado: 'Venta de mostrador con condición de crédito distinta de CEX. Hay que corregirla en SIESA; sigue sumando en “Vendido a crédito”.' },
    ]} />
    {detalle && <Modal isOpen onClose={() => { setDetalle(null); setTercero(null) }} title={<span>{detalle === 'c01' ? 'C01 con condición de crédito errónea' : detalle === 'sin_pagar' ? 'Contraentregas sin pagar' : 'Contraentregas pagadas después de 30 días'} <span className="text-[13px] font-normal text-muted-foreground">· emitidas del {fecha(d.desde)} al {fecha(d.hasta)}</span></span>} className="max-w-6xl">
      {detalle === 'c01' ? <Tabla filas={c.documentos_erroneos} clave={x => `${x.co}-${x.tipo}-${x.consecutivo}`} columnas={[
        { titulo: 'Documento', celda: x => `${x.tipo}-${x.consecutivo}` }, { titulo: 'Fecha', celda: x => fecha(x.fecha) }, { titulo: 'C.O.', celda: x => x.co }, { titulo: 'Cliente', celda: x => <>{x.cliente ?? '—'}<span className="block text-xs text-muted-foreground">{x.nit}</span></> }, { titulo: 'Condición', celda: x => `${x.condicion} · ${x.condicion_nombre ?? ''}` }, { titulo: 'Valor', celda: x => dinero(x.valor), alinear: 'der' },
      ]} /> : <>
        <p className="mb-3 text-sm text-muted-foreground">{entero(casos.length)} documentos de {entero(clientes.length)} clientes · {dinero(casos.reduce((s, x) => s + x.valor, 0))} de valor · {dinero(casos.reduce((s, x) => s + x.saldo, 0))} por cobrar.</p>
        <Tabla filas={clientes} clave={x => x.tercero} columnas={[
          { titulo: 'Cliente', celda: x => <button type="button" onClick={() => setTercero(tercero === x.tercero ? null : x.tercero)} className="cursor-pointer text-left font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary">{x.cliente ?? x.nit ?? x.tercero} {tercero === x.tercero ? '▾' : '▸'}</button> },
          { titulo: 'Emitidas', celda: x => x.desde === x.hasta ? fecha(x.desde) : `${fecha(x.desde)} – ${fecha(x.hasta)}` }, { titulo: 'Venció', celda: x => fecha(x.vence) }, { titulo: detalle === 'sin_pagar' ? 'Último pago' : 'Pagó el', celda: x => fecha(x.ultimo_pago) },
          { titulo: 'Documentos', celda: x => entero(x.documentos), alinear: 'der' }, { titulo: 'Valor', celda: x => dinero(x.valor), alinear: 'der' }, { titulo: 'Saldo', celda: x => dinero(x.saldo), alinear: 'der' }, { titulo: 'Días promedio', celda: x => x.dias_promedio == null ? '—' : `${decimal(x.dias_promedio, 0)} d`, alinear: 'der' },
        ]} />
        {tercero != null && <div className="mt-5"><h3 className="mb-2 font-semibold">Documentos de {clientes.find(x => x.tercero === tercero)?.cliente ?? 'este cliente'}</h3><Tabla filas={casos.filter(x => x.tercero === tercero)} clave={x => `${x.tipo}-${x.consecutivo}`} columnas={[
          { titulo: 'Documento', celda: x => `${x.tipo}-${x.consecutivo}` }, { titulo: 'Fecha', celda: x => fecha(x.fecha) }, { titulo: 'Vence', celda: x => fecha(x.vence) }, { titulo: 'Pagada el', celda: x => fecha(x.pagada_el) }, { titulo: 'Condición', celda: x => `${x.condicion} · ${x.condicion_nombre}` }, { titulo: 'Días', celda: x => entero(x.dias), alinear: 'der' }, { titulo: 'Valor', celda: x => dinero(x.valor), alinear: 'der' }, { titulo: 'Saldo', celda: x => dinero(x.saldo), alinear: 'der' },
        ]} /></div>}
      </>}
    </Modal>}
  </div>
}
