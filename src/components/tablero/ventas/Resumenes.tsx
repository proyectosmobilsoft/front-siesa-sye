import { Malla, CuerpoConsulta } from '../comun'
import { Areas } from '../graficas'
import { TarjetaResumen } from '../Expandible'
import { PALETA, compacto, dinero, etiquetaMes, porcentaje } from '../formato'
import { AYUDAS } from './ayudas'
import type { DashboardCartera, DashboardCompras, DashboardInventario, DashboardVentas } from './tipos'
import { colorCumplimiento } from './colores'

interface ResumenRC {
  kpis: {
    recaudo_cartera: number
    recaudo_cartera_previo: number
    cobertura_recaudo: number | null
  }
  mensual: { mes: string; facturado: number; recaudo_cartera: number }[]
}
type Vista = 'recaudo' | 'presupuesto' | 'proveedores' | 'compras' | 'inventario' | 'cartera'
export function Resumenes({
  recaudo,
  ventas,
  compras,
  cartera,
  cargaCartera,
  errorCartera,
  inventario,
  cargaInventario,
  errorInventario,
  cargaCompras,
  errorCompras,
  cargaRecaudo,
  errorRecaudo,
  cargaVentas,
  errorVentas,
  vista,
  alElegir,
}: {
  recaudo?: ResumenRC
  ventas?: DashboardVentas
  compras?: DashboardCompras
  cartera?: DashboardCartera
  cargaCartera: boolean
  errorCartera: boolean
  inventario?: DashboardInventario
  cargaInventario: boolean
  errorInventario: boolean
  cargaCompras: boolean
  errorCompras: boolean
  cargaRecaudo: boolean
  errorRecaudo: boolean
  cargaVentas: boolean
  errorVentas: boolean
  vista: Vista | null
  alElegir: (v: Vista) => void
}) {
  const top =
    ventas?.proveedores
      .filter(p => p.proveedor !== 'OTROS PROVEEDORES')
      .slice(0, 5) ?? []
  const topCompras = compras?.proveedores.filter(p => p.proveedor !== 'OTROS PROVEEDORES').slice(0, 5) ?? []
  const lotesCartera = cartera ? [...cartera.vencida.slice(0, 1), ...cartera.por_vencer.slice(0, 4)] : []
  const maxCartera = Math.max(0, ...lotesCartera.map(l => l.saldo))
  const topInventario = inventario?.lineas.slice(0, 5) ?? []
  return (
    <Malla columnas={6}>
      <TarjetaResumen
        titulo="Recaudo de cartera"
        abierta={vista === 'recaudo'}
        alAlternar={() => alElegir('recaudo')}
        ayuda={{
          fuente:
            'Recibos de caja (RC) cruzados con facturas SIESA; facturas del periodo.',
          formula:
            'Cobro de cartera = Σ medios de pago de RC cruzados · Cobertura = cobro ÷ facturado',
        }}
      >
        <CuerpoConsulta
          consulta={{ isLoading: cargaRecaudo, isError: errorRecaudo }}
          altura="h-40"
        >
          <div className="text-2xl font-bold tabular-nums">
            {recaudo && dinero(recaudo.kpis.recaudo_cartera)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Variación{' '}
            {recaudo?.kpis.recaudo_cartera_previo
              ? porcentaje(
                  (recaudo.kpis.recaudo_cartera -
                    recaudo.kpis.recaudo_cartera_previo) /
                    recaudo.kpis.recaudo_cartera_previo
                )
              : '—'}{' '}
            · Cobertura{' '}
            {recaudo?.kpis.cobertura_recaudo == null
              ? '—'
              : porcentaje(recaudo.kpis.cobertura_recaudo)}
          </div>
          {recaudo && (
            <Areas
              datos={recaudo.mensual.map(m => ({
                ...m,
                etiqueta: etiquetaMes(m.mes),
              }))}
              ejeX="etiqueta"
              series={[
                { clave: 'facturado', nombre: 'Facturado', color: PALETA[0] },
                {
                  clave: 'recaudo_cartera',
                  nombre: 'Cobrado',
                  color: PALETA[1],
                },
              ]}
              formato={dinero}
              altura={100}
            />
          )}
        </CuerpoConsulta>
      </TarjetaResumen>
      <TarjetaResumen
        titulo="Ventas vs presupuesto"
        abierta={vista === 'presupuesto'}
        alAlternar={() => alElegir('presupuesto')}
        ayuda={AYUDAS.cumplimiento}
      >
        <CuerpoConsulta
          consulta={{ isLoading: cargaVentas, isError: errorVentas }}
          altura="h-40"
        >
          <div className="text-3xl font-bold tabular-nums">
            {ventas?.kpis.cumplimiento == null
              ? '—'
              : porcentaje(ventas.kpis.cumplimiento, 0)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {ventas
              ? `${dinero(ventas.kpis.venta)} / ${ventas.kpis.meta == null ? 'sin meta' : dinero(ventas.kpis.meta)}`
              : ''}
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${colorCumplimiento(ventas?.kpis.cumplimiento ?? null)}`}
              style={{
                width: `${Math.min(100, (ventas?.kpis.cumplimiento ?? 0) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-3 space-y-1">
            {ventas?.grupos
              .filter(g => g.cumplimiento != null && g.id !== 'OTROS')
              .map(g => (
                <div key={g.id} className="flex items-center gap-2 text-[11px]">
                  <span className="w-24 truncate">{g.nombre}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${colorCumplimiento(g.cumplimiento)}`}
                      style={{
                        width: `${Math.min(100, (g.cumplimiento ?? 0) * 100)}%`,
                      }}
                    />
                  </div>
                  <span>{porcentaje(g.cumplimiento ?? 0, 0)}</span>
                </div>
              ))}
          </div>
        </CuerpoConsulta>
      </TarjetaResumen>
      <TarjetaResumen
        titulo="Ventas por marca/proveedor"
        abierta={vista === 'proveedores'}
        alAlternar={() => alElegir('proveedores')}
        ayuda={AYUDAS.proveedor}
      >
        <CuerpoConsulta
          consulta={{ isLoading: cargaVentas, isError: errorVentas }}
          altura="h-40"
        >
          <div className="text-2xl font-bold tabular-nums">
            {ventas && dinero(ventas.kpis.venta)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Participación del primero:{' '}
            {top[0] ? porcentaje(top[0].participacion) : '—'}
          </div>
          <div className="mt-3 space-y-2">
            {top.map(p => (
              <div
                key={p.proveedor}
                className="flex items-center gap-2 text-[11px]"
              >
                <span className="w-24 truncate" title={p.proveedor}>
                  {p.proveedor}
                </span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${top[0]?.venta ? (p.venta / top[0].venta) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span>{compacto(p.venta)}</span>
              </div>
            ))}
          </div>
        </CuerpoConsulta>
      </TarjetaResumen>
      <TarjetaResumen
        titulo="Compras por proveedor"
        abierta={vista === 'compras'}
        alAlternar={() => alElegir('compras')}
        ayuda={{ fuente: 'Entradas de almacén EA/EAF menos notas NP (devolución a proveedor) de SIESA, sin IVA.', formula: 'Compra neta = entradas − devoluciones' }}
      >
        <CuerpoConsulta consulta={{ isLoading: cargaCompras, isError: errorCompras }} altura="h-40">
          <div className="text-2xl font-bold tabular-nums">{compras && dinero(compras.kpis.compra_neta)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Devoluciones {compras?.kpis.tasa_devolucion == null ? '—' : porcentaje(compras.kpis.tasa_devolucion)}</div>
          <div className="mt-3 space-y-2">
            {topCompras.map(p => (
              <div key={`${p.nit}-${p.proveedor}`} className="flex items-center gap-2 text-[11px]">
                <span className="w-24 truncate" title={p.proveedor}>{p.proveedor}</span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${topCompras[0]?.compra_neta ? Math.max(0, p.compra_neta / topCompras[0].compra_neta * 100) : 0}%` }} />
                </div>
                <span>{compacto(p.compra_neta)}</span>
              </div>
            ))}
          </div>
        </CuerpoConsulta>
      </TarjetaResumen>
      <TarjetaResumen
        titulo="Inventario"
        abierta={vista === 'inventario'}
        alAlternar={() => alElegir('inventario')}
        ayuda={{ fuente: 'Existencias de SIESA a costo promedio frente a compra neta y costo de lo vendido.', formula: 'Variación = compra neta − costo de ventas' }}
      >
        <CuerpoConsulta consulta={{ isLoading: cargaInventario, isError: errorInventario }} altura="h-40">
          <div className="text-2xl font-bold tabular-nums">{inventario && dinero(inventario.kpis.existencia)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Cobertura {inventario?.kpis.meses_cobertura == null ? '—' : `${inventario.kpis.meses_cobertura.toFixed(1)} meses`}
          </div>
          <div className="mt-3 space-y-2">
            {topInventario.map(l => (
              <div key={l.proveedor} className="flex items-center gap-2 text-[11px]">
                <span className="w-24 truncate" title={l.proveedor}>{l.proveedor}</span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${topInventario[0]?.existencia ? Math.max(0, l.existencia / topInventario[0].existencia * 100) : 0}%` }} />
                </div>
                <span>{compacto(l.existencia)}</span>
              </div>
            ))}
          </div>
        </CuerpoConsulta>
      </TarjetaResumen>
      <TarjetaResumen
        titulo="Cartera"
        abierta={vista === 'cartera'}
        alAlternar={() => alElegir('cartera')}
        ayuda={{ fuente: 'Saldos abiertos de facturas de venta en SIESA, por vencimiento según la condición de pago.', formula: 'Vence en 30 días = saldo con vencimiento entre hoy y 30 días' }}
      >
        <CuerpoConsulta consulta={{ isLoading: cargaCartera, isError: errorCartera }} altura="h-40">
          <div className="text-2xl font-bold tabular-nums">{cartera && dinero(cartera.kpis.vence_30)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Vence en 30 días · Vencida {cartera ? dinero(cartera.kpis.vencida) : '—'}
          </div>
          <div className="mt-3 space-y-2">
            {lotesCartera.map(l => (
              <div key={l.id} className="flex items-center gap-2 text-[11px]">
                <span className="w-24 truncate" title={l.nombre}>{l.nombre.replace('Vence en ', '').replace('Vencida ', 'Venc. ').replace(' días', ' d')}</span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div className={`h-full rounded-full ${l.id.startsWith('v') ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${maxCartera ? Math.max(0, l.saldo / maxCartera * 100) : 0}%` }} />
                </div>
                <span>{compacto(l.saldo)}</span>
              </div>
            ))}
          </div>
        </CuerpoConsulta>
      </TarjetaResumen>
    </Malla>
  )
}
