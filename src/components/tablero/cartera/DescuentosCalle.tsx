import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Bloque, Tabla } from '../comun'
import { BarrasApiladas } from '../graficas'
import { Barras3D, BarrasApiladas3D, Dona3D } from '../graficas3d'
import { ComoLeer, Lectura } from '../Guia'
import { decimal, dinero, entero, etiquetaMes, porcentaje } from '../formato'
import type { ClaseCondicion, DescuentosCartera } from '../ventas/tipos'
import { TarjetaBoton } from './TarjetaBoton'

const FUENTE_CALLE = 'SIESA: saldo abierto de facturas de venta y remisiones RMA (t353), con la condición de pago de cada documento.'
const FUENTE_DTO = 'SIESA: descuento financiero aplicado en cada pago (t354, valor aplicado de pronto pago). SIESA no guarda el % ofrecido, solo lo que se aplicó.'
const CLASES: Record<ClaseCondicion, { nombre: string; color: string }> = {
  credito: { nombre: 'Crédito', color: '#3b82f6' },
  contraentrega: { nombre: 'Contraentrega', color: '#f59e0b' },
  contado: { nombre: 'Contado / anticipado', color: '#10b981' },
  sin_condicion: { nombre: 'Sin condición', color: '#94a3b8' },
}
const Fuerte = ({ children }: { children: React.ReactNode }) => <strong className="font-semibold text-foreground">{children}</strong>
const Hoy = ({ fecha }: { fecha: string }) => <span className="ml-1 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:bg-sky-500/20 dark:text-sky-200">Saldo al {fecha}</span>
const dias = (v: number | null) => (v == null ? '—' : `${decimal(v, 0)} d`)
const pct = (v: number | null | undefined, decimales: number) => (v == null ? '—' : porcentaje(v, decimales))

/** Cuánta plata hay en la calle (por condición) y si el descuento financiero hace que paguen antes. */
export function DescuentosCalle({ d }: { d: DescuentosCartera }) {
  // La plata en la calle es el saldo al cierre del rango (`hasta`); si el rango llega a hoy, es el saldo de hoy.
  const corte = d.hasta.split('-').reverse().join('/')
  const alCorte = d.hasta >= new Date().toISOString().slice(0, 10) ? 'Hoy' : `Al ${corte}`
  const [detalle, setDetalle] = useState<'calle' | 'descuento' | null>(null)
  const c = d.calle
  const x = d.descuento
  // Crédito con descuento (CFE, CFK, CSF, PFF, CFT…): ahí se ve si el descuento adelanta el pago frente a un crédito normal.
  const creditoConDto = useMemo(() => x.por_condicion.filter(f => f.clase === 'credito' && f.tomaron > 0 && f.documentos >= 20), [x.por_condicion])
  const credito30 = x.por_condicion.find(f => f.condicion === '30D')
  // Solo condiciones que de verdad dan descuento: fuera contado/anticipado (ANT, AF*) y las que casi nunca lo aplican (CRC, 30D).
  const conDescuento = useMemo(() => x.por_condicion.filter(f => f.clase !== 'contado' && f.documentos >= 20 && (f.tomaron_pct ?? 0) >= 0.05), [x.por_condicion])
  const mejor = [...creditoConDto].sort((a, b) => (b.tomaron_pct ?? 0) - (a.tomaron_pct ?? 0))[0]
  const peor = [...creditoConDto].sort((a, b) => (a.tomaron_pct ?? 0) - (b.tomaron_pct ?? 0))[0]
  const meses = x.mensual.map(m => ({ nombre: etiquetaMes(m.mes), valor: m.descuento, color: '#8b5cf6' }))
  const totalRecaudo = x.mensual.reduce((s, m) => s + m.recaudo, 0)
  const conVencido = c.por_condicion.filter(f => f.clase !== 'contado').slice(0, 8).map(f => ({ nombre: `${f.condicion} · ${pct(f.saldo ? f.vencido / f.saldo : null, 0)} venc.`, al_dia: f.saldo - f.vencido, vencido: f.vencido }))

  return <div className="flex flex-col gap-4">
    <Lectura frases={[
      <>{alCorte === 'Hoy' ? 'Hoy tienes' : `${alCorte} tenías`} <Fuerte>{dinero(c.saldo)}</Fuerte> en la calle y <Fuerte>{pct(c.vencido_pct, 0)}</Fuerte> ya está vencido. Aparte, las ventas corporativas tienen <Fuerte>{dinero(c.otra_area.saldo)}</Fuerte>.</>,
      <>En el rango diste <Fuerte>{dinero(x.total)}</Fuerte> de descuento financiero, el <Fuerte>{pct(totalRecaudo ? x.total / totalRecaudo : null, 1)}</Fuerte> de lo recaudado. En promedio, quien lo toma recibe <Fuerte>{pct(x.tasa_efectiva, 1)}</Fuerte> de la factura.</>,
      mejor && peor && <>En crédito con descuento, <Fuerte>{mejor.condicion}</Fuerte> lo toma el <Fuerte>{pct(mejor.tomaron_pct, 0)}</Fuerte> (descuento de {pct(mejor.tasa_efectiva, 1)}) y <Fuerte>{peor.condicion}</Fuerte> solo el <Fuerte>{pct(peor.tomaron_pct, 0)}</Fuerte> (descuento de {pct(peor.tasa_efectiva, 1)}). Quien lo toma paga en ~{dias(mejor.dias_con)}; un crédito a 30 días sin descuento paga en ~{dias(credito30?.dias_sin ?? null)}.</>,
    ].filter(Boolean) as React.ReactNode[]} />

    <div className="grid gap-3 md:grid-cols-3">
      <TarjetaBoton titulo="Plata en la calle" cantidad={dinero(c.saldo)} monto={`${pct(c.vencido_pct, 0)} vencido`} detalle={`${entero(c.documentos)} documentos · sin ventas corporativas`} alAbrir={() => setDetalle('calle')}
        ayuda={{ fuente: FUENTE_CALLE, formula: 'Saldo al cierre del rango de facturas y RMA sin pagar completas (movimientos de cartera hasta esa fecha).', nota: 'Cambia con la fecha final del rango: con septiembre es lo que se debía al 30/09.' }} />
      <TarjetaBoton titulo="Descuento financiero dado" cantidad={dinero(x.total)} monto={`${pct(totalRecaudo ? x.total / totalRecaudo : null, 1)} de lo recaudado`} detalle={`${entero(x.tomaron)} facturas lo tomaron · ${pct(x.tasa_efectiva, 1)} promedio`} alAbrir={() => setDetalle('descuento')}
        ayuda={{ fuente: FUENTE_DTO, formula: 'Σ descuento aplicado ÷ Σ valor de las facturas que lo tomaron.' }} />
      <TarjetaBoton titulo="Ventas corporativas (aparte)" cantidad={dinero(c.otra_area.saldo)} monto={`${pct(c.otra_area.saldo ? c.otra_area.vencido / c.otra_area.saldo : null, 0)} vencido`} detalle={`${entero(c.otra_area.documentos)} documentos · no suma en el total`} alAbrir={() => setDetalle('calle')}
        ayuda={{ fuente: FUENTE_CALLE, formula: 'Saldo al cierre del rango de los documentos de los vendedores DISTRIBUCIONES SYE (0001) y VENTAS CORPORATIVAS (9897).', nota: 'Ventas corporativas: se muestra aparte.' }} />
    </div>

    <div className="grid gap-4 xl:grid-cols-3">
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="¿De qué tipo es la plata en la calle?" descripcion={<>Por clase de condición de pago. <Hoy fecha={corte} /></>} ayuda={{ fuente: FUENTE_CALLE, formula: 'Saldo por clase ÷ saldo total' }}>
        <Dona3D datos={c.por_clase.filter(f => f.saldo > 0).map(f => ({ nombre: CLASES[f.clase].nombre, valor: f.saldo, color: CLASES[f.clase].color }))} formato={dinero} altura={280} centro="es crédito" porcentajeCentro={c.por_clase.find(f => f.clase === 'credito')?.pct ?? null} />
      </Bloque>
      <Bloque className="xl:col-span-2" titulo="¿En qué condición está la plata?" descripcion={<>Al día y vencido por condición de crédito o contraentrega (sin anticipados ni contado). <Hoy fecha={corte} /></>} ayuda={{ fuente: FUENTE_CALLE, formula: 'Saldo de hoy por condición, separado en vencido y al día' }}>
        <BarrasApiladas3D datos={conVencido} ejeX="nombre" series={[{ clave: 'vencido', nombre: 'Vencido', color: '#ef4444' }, { clave: 'al_dia', nombre: 'Al día', color: '#3b82f6' }]} formato={dinero} altura={280} />
      </Bloque>
    </div>

    <div className="grid gap-4 xl:grid-cols-3">
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="Descuento financiero mes a mes" descripcion="Lo que se dejó de cobrar por pronto pago" ayuda={{ fuente: FUENTE_DTO, formula: 'Σ descuento aplicado en los pagos de cada mes' }}>
        <Barras3D datos={meses} formato={dinero} altura={280} nombreValor="Descuento" />
      </Bloque>
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="¿Quién toma el descuento?" descripcion="% de facturas que pagaron con descuento" ayuda={{ fuente: FUENTE_DTO, formula: 'Facturas con descuento aplicado ÷ facturas emitidas de esa condición' }}>
        <Barras3D datos={conDescuento.slice(0, 10).map(f => ({
          nombre: f.condicion, valor: Math.round((f.tomaron_pct ?? 0) * 100),
          color: (f.tomaron_pct ?? 0) >= 0.75 ? '#10b981' : (f.tomaron_pct ?? 0) >= 0.5 ? '#f59e0b' : '#ef4444',
        }))} formato={v => `${v} %`} formatoEje={v => `${v} %`} altura={280} nombreValor="Lo toman" />
      </Bloque>
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="¿Pagan antes con descuento?" descripcion="Días desde la factura hasta el pago, en crédito" ayuda={{ fuente: FUENTE_DTO, formula: 'Promedio de días de pago de las facturas que tomaron el descuento y de las que no' }}>
        <BarrasApiladas agrupadas datos={creditoConDto.map(f => ({ nombre: f.condicion, con: Math.round(f.dias_con ?? 0), sin: Math.round(f.dias_sin ?? 0) }))} ejeX="nombre"
          series={[{ clave: 'con', nombre: 'Con descuento', color: '#10b981' }, { clave: 'sin', nombre: 'Sin descuento', color: '#ef4444' }]} formato={v => `${v} d`} altura={280} />
      </Bloque>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="¿Quién aprovecha el descuento?" descripcion="Por condición: % de clientes y % de facturas que pagaron con descuento" ayuda={{ fuente: FUENTE_DTO, formula: 'Clientes (o facturas) con descuento aplicado ÷ clientes (o facturas) de la condición' }}>
        <BarrasApiladas agrupadas datos={conDescuento.slice(0, 10).map(f => ({ nombre: f.condicion, clientes: Math.round((f.clientes_tomaron_pct ?? 0) * 100), facturas: Math.round((f.tomaron_pct ?? 0) * 100) }))} ejeX="nombre"
          series={[{ clave: 'clientes', nombre: '% de clientes', color: '#8b5cf6' }, { clave: 'facturas', nombre: '% de facturas', color: '#10b981' }]} formato={v => `${v} %`} altura={280} />
      </Bloque>
      <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="¿Cuánto descuento se da?" descripcion="Descuento promedio sobre la factura. Verde: lo aprovecha el 75 % o más; ámbar: 50–74 %; rojo: menos" ayuda={{ fuente: FUENTE_DTO, formula: 'Σ descuento aplicado ÷ Σ valor de las facturas que lo tomaron' }}>
        <Barras3D datos={conDescuento.slice(0, 10).map(f => ({
          nombre: f.condicion, valor: Math.round((f.tasa_efectiva ?? 0) * 1000) / 10,
          color: (f.tomaron_pct ?? 0) >= 0.75 ? '#10b981' : (f.tomaron_pct ?? 0) >= 0.5 ? '#f59e0b' : '#ef4444',
        }))} formato={v => `${decimal(v, 1)} %`} formatoEje={v => `${decimal(v, 0)} %`} altura={280} nombreValor="Descuento promedio"
          tooltipExtra={nombre => { const f = conDescuento.find(x => x.condicion === nombre); return f ? `${f.nombre} · lo aprovecha el ${pct(f.tomaron_pct, 0)} · ${dinero(f.descuento)} descontados` : '' }} />
      </Bloque>
    </div>
    <Bloque className="border-0 shadow-sm ring-0 [&_h2]:font-black [&_h2]:tracking-tight" titulo="¿El descuento es atractivo?" descripcion="Si el descuento es más alto, ¿lo toma más gente y paga antes?" ayuda={{ fuente: FUENTE_DTO, formula: 'Por condición: descuento promedio, % que lo toma y días que se adelanta el pago (sin descuento − con descuento)', nota: 'Si una condición tiene descuento bajo y poca gente lo toma, el descuento no está moviendo al cliente.' }}>
      <Tabla filas={conDescuento} clave={f => f.condicion} columnas={[
        { titulo: 'Condición', celda: f => <span title={f.nombre}><span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px] font-semibold">{f.condicion}</span> <span className="text-[12px] text-muted-foreground">{f.nombre}</span></span> },
        { titulo: 'Tipo', celda: f => CLASES[f.clase].nombre, secundaria: true },
        { titulo: 'Facturas', celda: f => entero(f.documentos), alinear: 'der' },
        { titulo: 'Descuento promedio', celda: f => pct(f.tasa_efectiva, 1), alinear: 'der' },
        { titulo: 'Lo toman', celda: f => <span className={(f.tomaron_pct ?? 0) >= 0.75 ? 'font-semibold text-emerald-600' : (f.tomaron_pct ?? 0) >= 0.5 ? 'font-semibold text-amber-600' : 'font-semibold text-red-600'}>{pct(f.tomaron_pct, 0)}</span>, alinear: 'der' },
        { titulo: 'Clientes que lo aprovechan', celda: f => <>{entero(f.clientes_tomaron)} de {entero(f.clientes)} <span className="text-[11.5px] text-muted-foreground">({pct(f.clientes_tomaron_pct, 0)})</span></>, alinear: 'der' },
        { titulo: 'Pagan con dto.', celda: f => dias(f.dias_con), alinear: 'der' },
        { titulo: 'Pagan sin dto.', celda: f => dias(f.dias_sin), alinear: 'der' },
        { titulo: 'Días que adelanta', celda: f => f.dias_ganados == null ? '—' : <span className={f.dias_ganados > 5 ? 'font-semibold text-emerald-600' : 'text-muted-foreground'}>{decimal(f.dias_ganados, 0)} d</span>, alinear: 'der' },
        { titulo: 'Descuento dado', celda: f => dinero(f.descuento), alinear: 'der' },
      ]} />
    </Bloque>

    <ComoLeer items={[
      { termino: 'Plata en la calle', significado: 'Lo que los clientes debían al cierre del rango elegido (facturas y remisiones sin pagar completas).' },
      { termino: 'Descuento financiero', significado: 'Lo que se le descuenta al cliente al pagar, normalmente por pagar antes (condiciones "con financiero" y contraentrega financiero KE).' },
      { termino: 'Lo toman', significado: 'De cada 100 facturas de esa condición, cuántas se pagaron con descuento.' },
      { termino: 'Días que adelanta', significado: 'Cuántos días antes paga quien toma el descuento frente a quien no lo toma, en la misma condición.' },
      { termino: 'Ojo', significado: 'SIESA no guarda el % de descuento que se ofrece, solo el que se aplicó al pagar. Si el descuento lo cobra una financiera, el "descuento" es el costo de cobrar rápido.' },
    ]} />

    {detalle && <Modal isOpen onClose={() => setDetalle(null)} title={detalle === 'calle' ? `Plata en la calle por condición de pago (al ${corte})` : `Descuento financiero por condición · del ${d.desde.split('-').reverse().join('/')} al ${d.hasta.split('-').reverse().join('/')}`} className="max-w-5xl">
      {detalle === 'calle' ? <Tabla filas={c.por_condicion} clave={f => f.condicion} columnas={[
        { titulo: 'Condición', celda: f => <><span className="font-mono font-semibold">{f.condicion}</span> <span className="text-[12px] text-muted-foreground">{f.nombre}</span></> },
        { titulo: 'Tipo', celda: f => CLASES[f.clase].nombre },
        { titulo: 'Documentos', celda: f => entero(f.documentos), alinear: 'der' },
        { titulo: 'Clientes', celda: f => entero(f.clientes), alinear: 'der' },
        { titulo: 'Saldo', celda: f => dinero(f.saldo), alinear: 'der' },
        { titulo: '% del total', celda: f => pct(f.pct, 1), alinear: 'der' },
        { titulo: 'Vencido', celda: f => dinero(f.vencido), alinear: 'der' },
        { titulo: '% vencido', celda: f => pct(f.saldo ? f.vencido / f.saldo : null, 0), alinear: 'der' },
      ]} /> : <Tabla filas={x.por_condicion.filter(f => f.descuento > 0)} clave={f => f.condicion} columnas={[
        { titulo: 'Condición', celda: f => <><span className="font-mono font-semibold">{f.condicion}</span> <span className="text-[12px] text-muted-foreground">{f.nombre}</span></> },
        { titulo: 'Facturas', celda: f => entero(f.documentos), alinear: 'der' },
        { titulo: 'Lo tomaron', celda: f => `${entero(f.tomaron)} (${pct(f.tomaron_pct, 0)})`, alinear: 'der' },
        { titulo: 'Descuento', celda: f => dinero(f.descuento), alinear: 'der' },
        { titulo: '% del total dado', celda: f => pct(x.total ? f.descuento / x.total : null, 1), alinear: 'der' },
        { titulo: 'Promedio', celda: f => pct(f.tasa_efectiva, 1), alinear: 'der' },
      ]} />}
    </Modal>}
  </div>
}
