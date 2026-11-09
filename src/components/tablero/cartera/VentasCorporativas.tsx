import { CuerpoConsulta, Tabla } from '../comun'
import { Dona3D } from '../graficas3d'
import { Lectura } from '../Guia'
import { dinero, entero, porcentaje } from '../formato'
import type { DashboardCartera, DescuentosCartera } from '../ventas/tipos'
import { CuadreSaldos } from './CuadreSaldos'
import { useSaldosCartera } from './usoSaldos'

const pct = (v: number | null | undefined) => (v == null ? '—' : porcentaje(v, 0))

/**
 * Ventas corporativas: vendedores 0001 DISTRIBUCIONES SYE y 9897 VENTAS CORPORATIVAS. Por pedido de gerencia no suman
 * en los totales de cartera; aquí se ve lo suyo: vendido a crédito, plata en la calle y cuadre del periodo.
 */
export function VentasCorporativas({ d, descuentos }: { d: DashboardCartera; descuentos?: DescuentosCartera }) {
  const saldos = useSaldosCartera(d.desde, d.hasta)
  const otra = d.venta_credito.otra_area
  const calle = descuentos?.calle.otra_area
  const s = saldos.data?.otra_area
  return <div className="flex flex-col gap-4">
    <Lectura frases={[
      <>Son los clientes que atienden los vendedores <strong className="text-foreground">DISTRIBUCIONES SYE (0001)</strong> y <strong className="text-foreground">VENTAS CORPORATIVAS (9897)</strong> en casos puntuales. No suman en los totales de cartera: se analizan aquí aparte.</>,
      <>En el rango vendieron a crédito <strong className="text-foreground">{dinero(otra.venta_credito)}</strong>{s && <> y hoy deben <strong className="text-foreground">{dinero(s.saldo_final)}</strong> al cierre del periodo ({dinero(s.vencido_final)} vencido)</>}.</>,
    ]} />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[
        { t: 'Vendido a crédito (rango)', v: dinero(otra.venta_credito), n: 'Neto de notas, devoluciones y descargos' },
        { t: 'Plata en la calle hoy', v: calle ? dinero(calle.saldo) : '—', n: calle ? `${pct(calle.saldo ? calle.vencido / calle.saldo : null)} vencido · ${entero(calle.documentos)} documentos` : 'Abre "Plata en la calle" para cargarlo' },
        { t: 'Cobrado de lo viejo', v: s ? dinero(s.abonos_saldo_anterior.recaudo) : '—', n: s ? `${pct(s.cobrado_anterior_pct)} del saldo al empezar el periodo` : '' },
      ].map(x => (
        <div key={x.t} className="rounded-2xl bg-card p-4 shadow-sm">
          <p className="text-[0.625rem] font-black tracking-widest text-muted-foreground uppercase">{x.t}</p>
          <p className="mt-1 text-2xl font-black text-foreground tabular-nums">{x.v}</p>
          <p className="text-xs text-muted-foreground">{x.n}</p>
        </div>
      ))}
    </div>
    <CuerpoConsulta consulta={{ isLoading: saldos.isLoading, isError: saldos.isError }} altura="h-48">
      {s && <CuadreSaldos c={s} desde={d.desde} hasta={d.hasta} titulo="Cuadre de las ventas corporativas en el periodo" />}
    </CuerpoConsulta>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <p className="text-[15px] font-black tracking-tight">¿Cómo se compone lo vendido?</p>
        <p className="mb-2 text-[12px] text-muted-foreground">Documentos a crédito del rango; las notas, devoluciones y descargos restan</p>
        <Tabla filas={otra.desglose} clave={f => f.tipo} columnas={[
          { titulo: 'Tipo', celda: f => <span className="font-mono font-semibold">{f.tipo}</span> },
          { titulo: 'Efecto', celda: f => (f.resta ? 'Resta' : 'Suma') },
          { titulo: 'Documentos', celda: f => entero(f.documentos), alinear: 'der' },
          { titulo: 'Valor', celda: f => <span className={f.resta ? 'text-red-600' : ''}>{f.resta ? '−' : ''}{dinero(f.valor)}</span>, alinear: 'der' },
        ]} />
      </div>
      {s && <div className="rounded-2xl bg-card p-4 shadow-sm">
        <p className="text-[15px] font-black tracking-tight">¿Con qué bajó la deuda?</p>
        <p className="mb-2 text-[12px] text-muted-foreground">Abonos del periodo por tipo de documento</p>
        <Dona3D datos={[
          { nombre: 'Recibos de caja', valor: s.abonos_total.recaudo, color: '#10b981' },
          { nombre: 'Cruces', valor: s.abonos_total.cruces, color: '#3b82f6' },
          { nombre: 'Notas', valor: s.abonos_total.notas, color: '#f59e0b' },
          { nombre: 'Ajustes / descargos', valor: s.abonos_total.ajustes, color: '#ef4444' },
          { nombre: 'Otros', valor: s.abonos_total.otros, color: '#94a3b8' },
        ].filter(x => x.valor > 0)} formato={dinero} altura={260} centro="recibos de caja" porcentajeCentro={s.abonos_total.total ? s.abonos_total.recaudo / s.abonos_total.total : null} />
      </div>}
    </div>
  </div>
}
