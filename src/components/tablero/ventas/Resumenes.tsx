import { Malla, CuerpoConsulta } from '../comun'
import { Areas } from '../graficas'
import { TarjetaResumen } from '../Expandible'
import { PALETA, compacto, dinero, etiquetaMes, porcentaje } from '../formato'
import { AYUDAS } from './ayudas'
import type { DashboardCompras, DashboardVentas } from './tipos'
import { colorCumplimiento } from './colores'

interface ResumenRC {
  kpis: {
    recaudo_cartera: number
    recaudo_cartera_previo: number
    cobertura_recaudo: number | null
  }
  mensual: { mes: string; facturado: number; recaudo_cartera: number }[]
}
type Vista = 'recaudo' | 'presupuesto' | 'proveedores' | 'compras'
export function Resumenes({
  recaudo,
  ventas,
  compras,
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
  return (
    <Malla columnas={4}>
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
    </Malla>
  )
}
