import { useState } from 'react'
import {
  Bloque,
  Malla,
  SubPestanas,
  BotonTabla,
  Tabla,
  Tarjeta,
} from '../comun'
import { Areas, BarrasApiladasH, BarrasH, Dona, MapaCalor } from '../graficas'
import { PALETA, dinero, entero, etiquetaMes, porcentaje } from '../formato'
import type { DashboardVentas } from './tipos'
import { AYUDAS } from './ayudas'

const variacion = (a: number, b: number) => (b ? (a - b) / b : null)

export function VentasProveedores({
  d,
  sub,
  alElegirSub,
}: {
  d: DashboardVentas
  sub: string
  alElegirSub: (valor: string) => void
}) {
  const [tablas, setTablas] = useState<Record<string, boolean>>({})
  const alternar = (clave: string) =>
    setTablas(actual => ({ ...actual, [clave]: !actual[clave] }))
  const opciones = ['Ranking', 'Mensual', 'Cobertura'].map(etiqueta => ({
    etiqueta,
    valor: etiqueta.toLowerCase(),
  }))
  const activa = opciones.some(opcion => opcion.valor === sub) ? sub : 'ranking'

  const proveedores = d.proveedores.filter(
    p => p.proveedor !== 'OTROS PROVEEDORES'
  )
  const top = proveedores.slice(0, 5)
  const meses = [...new Set(d.mensual.map(m => m.mes))]
  const otros = d.proveedores.find(p => p.proveedor === 'OTROS PROVEEDORES')
  const filas = [...proveedores.slice(0, 30), ...(otros ? [otros] : [])]
  const total = d.kpis.venta
  const maximo = Math.max(1, ...filas.flatMap(p => p.mensual.map(m => m.venta)))
  const foco = d.cobertura.lineas_foco
  const colorFoco = new Map(
    foco.map((l, i) => [l.id, PALETA[i % PALETA.length]])
  )
  const porCambio = [...proveedores].sort(
    (a, b) => b.venta - b.venta_previa - (a.venta - a.venta_previa)
  )
  const mayorCrecimiento = porCambio.find(p => p.venta > p.venta_previa)
  const mayorCaida = [...porCambio]
    .reverse()
    .find(p => p.venta < p.venta_previa)
  return (
    <SubPestanas opciones={opciones} activa={activa} alElegir={alElegirSub}>
      <div className="flex flex-col gap-4">
        {activa === 'ranking' && (
          <>
            <Malla columnas={6}>
              <Tarjeta
                compacta
                etiqueta="Venta total"
                valor={dinero(total)}
                ayuda={AYUDAS.venta}
              />
              <Tarjeta
                compacta
                etiqueta="Proveedores con venta"
                valor={`${entero(proveedores.filter(p => p.venta > 0).length)}${otros && otros.venta > 0 ? '+' : ''}`}
                nota={
                  otros && otros.venta > 0
                    ? 'El resto está agrupado'
                    : undefined
                }
                ayuda={{
                  fuente: AYUDAS.proveedor.fuente,
                  formula:
                    'Conteo de proveedores del top 30 con venta > 0; + indica otros agrupados',
                }}
              />
              <Tarjeta
                compacta
                etiqueta="Participación del proveedor #1"
                valor={top[0] ? porcentaje(top[0].participacion) : '—'}
                nota={top[0]?.proveedor}
                ayuda={AYUDAS.proveedor}
              />
              <Tarjeta
                compacta
                etiqueta="Concentración top 5"
                valor={porcentaje(top.reduce((s, p) => s + p.participacion, 0))}
                ayuda={{
                  fuente: AYUDAS.proveedor.fuente,
                  formula: 'Σ participación de los 5 proveedores con más venta',
                }}
              />
              <Tarjeta
                compacta
                etiqueta="Variación vs periodo anterior"
                valor={
                  variacion(total, d.kpis.venta_previa) == null
                    ? '—'
                    : porcentaje(variacion(total, d.kpis.venta_previa) ?? 0)
                }
                ayuda={{
                  fuente: AYUDAS.venta.fuente,
                  formula: '(venta actual − venta anterior) ÷ venta anterior',
                }}
              />
            </Malla>

            <Malla columnas={6}>
              <Tarjeta
                compacta
                etiqueta="Crecieron / cayeron"
                valor={`${proveedores.filter(p => p.venta > p.venta_previa).length} / ${proveedores.filter(p => p.venta < p.venta_previa).length}`}
                ayuda={{
                  fuente: AYUDAS.proveedor.fuente,
                  formula:
                    'Conteo de proveedores con venta actual mayor / menor que el periodo anterior',
                }}
              />
              <Tarjeta
                compacta
                etiqueta="Mayor crecimiento"
                valor={
                  mayorCrecimiento
                    ? dinero(
                        mayorCrecimiento.venta - mayorCrecimiento.venta_previa
                      )
                    : '—'
                }
                nota={
                  mayorCrecimiento
                    ? `${mayorCrecimiento.proveedor} · ${variacion(mayorCrecimiento.venta, mayorCrecimiento.venta_previa) == null ? '—' : porcentaje(variacion(mayorCrecimiento.venta, mayorCrecimiento.venta_previa) ?? 0)}`
                    : undefined
                }
                ayuda={{
                  fuente: AYUDAS.proveedor.fuente,
                  formula:
                    'Máximo de venta actual − venta previa; porcentaje = diferencia ÷ venta previa',
                }}
              />
              <Tarjeta
                compacta
                etiqueta="Mayor caída"
                valor={
                  mayorCaida
                    ? dinero(mayorCaida.venta - mayorCaida.venta_previa)
                    : '—'
                }
                nota={
                  mayorCaida
                    ? `${mayorCaida.proveedor} · ${variacion(mayorCaida.venta, mayorCaida.venta_previa) == null ? '—' : porcentaje(variacion(mayorCaida.venta, mayorCaida.venta_previa) ?? 0)}`
                    : undefined
                }
                ayuda={{
                  fuente: AYUDAS.proveedor.fuente,
                  formula:
                    'Mínimo de venta actual − venta previa; porcentaje = diferencia ÷ venta previa',
                }}
              />
              <Tarjeta
                compacta
                etiqueta="Concentración HHI"
                valor={entero(
                  d.proveedores
                    .filter(p => p.proveedor !== 'OTROS PROVEEDORES')
                    .reduce((suma, p) => suma + p.participacion ** 2, 0) *
                    10000
                )}
                nota="< 1.500 baja · > 2.500 alta"
                ayuda={{
                  fuente: AYUDAS.proveedor.fuente,
                  formula:
                    'Σ (participación de cada proveedor)² × 10.000, top 30',
                  nota: 'El resto de proveedores pesa muy poco y no cambia el índice de forma apreciable.',
                }}
              />
              <Tarjeta
                compacta
                etiqueta="Venta por cliente"
                valor={d.kpis.clientes ? dinero(total / d.kpis.clientes) : '—'}
                ayuda={{
                  fuente: AYUDAS.venta.fuente,
                  formula: 'Venta total ÷ clientes con compra',
                }}
              />
            </Malla>
            <Malla columnas={2}>
              <Bloque
                titulo="Top 15 proveedores"
                ayuda={{
                  fuente: AYUDAS.proveedor.fuente,
                  formula: 'Σ venta sin IVA por proveedor; orden descendente.',
                }}
              >
                <BarrasH
                  datos={proveedores
                    .slice(0, 15)
                    .map(p => ({ nombre: p.proveedor, valor: p.venta }))}
                  formato={dinero}
                  anchoEtiqueta={160}
                />
              </Bloque>
              <Bloque titulo="Participación" ayuda={AYUDAS.proveedor}>
                <Dona
                  datos={[
                    ...top.map((p, i) => ({
                      nombre: p.proveedor,
                      valor: p.venta,
                      color: PALETA[i],
                    })),
                    {
                      nombre: 'Otros',
                      valor: Math.max(
                        0,
                        total - top.reduce((s, p) => s + p.venta, 0)
                      ),
                      color: PALETA[5],
                    },
                  ]}
                  formato={dinero}
                />
              </Bloque>
            </Malla>
          </>
        )}
        {activa === 'mensual' && (
          <>
            <Bloque
              titulo="Venta mensual por proveedor"
              accion={
                <BotonTabla
                  visible={!!tablas.mensual}
                  alAlternar={() => alternar('mensual')}
                />
              }
              ayuda={{
                fuente: AYUDAS.proveedor.fuente,
                formula:
                  'Σ venta de cada proveedor por mes; variación = (último mes − anterior) ÷ anterior.',
              }}
            >
              <div className="grid gap-4 xl:grid-cols-2">
                <MapaCalor
                  filas={filas.map(p => ({
                    nombre: p.proveedor,
                    valores: meses.map(
                      m => p.mensual.find(x => x.mes === m)?.venta ?? 0
                    ),
                  }))}
                  meses={meses.map(etiquetaMes)}
                  formato={dinero}
                />
                <Areas
                  datos={meses.map(m => ({
                    mes: etiquetaMes(m),
                    ...Object.fromEntries(
                      top.map((p, i) => [
                        `p${i}`,
                        p.mensual.find(x => x.mes === m)?.venta ?? 0,
                      ])
                    ),
                  }))}
                  ejeX="mes"
                  series={top.map((p, i) => ({
                    clave: `p${i}`,
                    nombre: p.proveedor,
                    color: PALETA[i],
                  }))}
                  formato={dinero}
                />
              </div>
              {tablas.mensual && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-[13px]">
                    <thead className="sticky top-0 z-20 bg-card">
                      <tr>
                        <th className="sticky left-0 z-30 bg-card p-2 text-left">
                          Proveedor
                        </th>
                        {meses.map(m => (
                          <th
                            key={m}
                            className="whitespace-nowrap p-2 text-right"
                          >
                            {etiquetaMes(m)}
                          </th>
                        ))}
                        <th className="p-2 text-right">Total</th>
                        <th className="whitespace-nowrap p-2 text-right">
                          Var. último mes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ...filas,
                        {
                          proveedor: 'Total',
                          venta: total,
                          mensual: meses.map(m => ({
                            mes: m,
                            venta: d.mensual.find(x => x.mes === m)?.venta ?? 0,
                          })),
                        },
                      ].map(p => {
                        const valores = meses.map(
                          m => p.mensual.find(x => x.mes === m)?.venta ?? 0
                        )
                        const v =
                          valores.length > 1
                            ? variacion(
                                valores[valores.length - 1],
                                valores[valores.length - 2]
                              )
                            : null
                        return (
                          <tr
                            key={p.proveedor}
                            className={`border-t border-border ${p.proveedor === 'Total' ? 'font-semibold' : ''}`}
                          >
                            <th className="sticky left-0 z-10 min-w-36 bg-card p-2 text-left">
                              {p.proveedor}
                            </th>
                            {valores.map((n, i) => (
                              <td
                                key={meses[i]}
                                className="whitespace-nowrap p-2 text-right tabular-nums"
                                style={{
                                  backgroundImage: `linear-gradient(to right, hsl(var(--primary) / .09) ${Math.max(0, (n / maximo) * 100)}%, transparent 0)`,
                                }}
                              >
                                {dinero(n)}
                              </td>
                            ))}
                            <td className="whitespace-nowrap p-2 text-right">
                              {dinero(p.venta)}
                            </td>
                            <td
                              className={`p-2 text-right ${v == null ? '' : v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                            >
                              {v == null ? '—' : porcentaje(v)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Bloque>
          </>
        )}
        {activa === 'cobertura' && (
          <>
            <Bloque
              titulo="Cobertura de líneas foco por asesor"
              accion={
                <BotonTabla
                  visible={!!tablas.cobertura}
                  alAlternar={() => alternar('cobertura')}
                />
              }
              ayuda={AYUDAS.cobertura}
            >
              <BarrasApiladasH
                datos={d.cobertura.asesores.map(a => ({
                  nombre: a.asesor,
                  con_1: a.con_1,
                  con_2: a.con_2,
                  con_3: a.con_3,
                  con_4: a.con_4,
                }))}
                series={[1, 2, 3, 4].map((n, i) => ({
                  clave: `con_${n}`,
                  nombre: `${n} líneas`,
                  color: PALETA[i],
                }))}
                formato={entero}
              />
              {tablas.cobertura && (
                <Tabla
                  filas={d.cobertura.asesores}
                  clave={a => a.asesor}
                  columnas={[
                    {
                      titulo: 'Asesor',
                      celda: a => (
                        <span className="font-medium text-foreground">
                          {a.asesor}
                        </span>
                      ),
                    },
                    {
                      titulo: 'Clientes',
                      alinear: 'der',
                      celda: a => entero(a.clientes),
                    },
                    {
                      titulo: 'Compran 1',
                      alinear: 'der',
                      celda: a => entero(a.con_1),
                    },
                    {
                      titulo: 'Compran 2',
                      alinear: 'der',
                      celda: a => entero(a.con_2),
                    },
                    {
                      titulo: 'Compran 3',
                      alinear: 'der',
                      celda: a => entero(a.con_3),
                    },
                    {
                      titulo: 'Compran 4',
                      alinear: 'der',
                      celda: a => entero(a.con_4),
                    },
                    {
                      titulo: '% compra ≥2',
                      alinear: 'der',
                      celda: a =>
                        a.clientes
                          ? porcentaje(
                              (a.con_2 + a.con_3 + a.con_4) / a.clientes
                            )
                          : '—',
                    },
                  ]}
                />
              )}
            </Bloque>
            <Bloque
              titulo="Clientes con más venta en líneas foco"
              accion={
                <BotonTabla
                  visible={!!tablas.clientes}
                  alAlternar={() => alternar('clientes')}
                />
              }
              ayuda={{
                fuente: AYUDAS.cobertura.fuente,
                formula:
                  'Σ venta de las cuatro líneas foco por cliente; líneas sin compra = oportunidad de venta cruzada.',
              }}
            >
              <BarrasH
                datos={d.cobertura.clientes
                  .slice(0, 12)
                  .map(c => ({ nombre: c.cliente, valor: c.venta_foco }))}
                formato={dinero}
                anchoEtiqueta={165}
              />
              {tablas.clientes && (
                <Tabla
                  filas={d.cobertura.clientes}
                  clave={c => `${c.nit}-${c.cliente}`}
                  columnas={[
                    {
                      titulo: 'Cliente',
                      celda: c => (
                        <span>
                          <span className="block font-medium text-foreground">
                            {c.cliente}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {c.nit}
                          </span>
                        </span>
                      ),
                    },
                    { titulo: 'Asesor', celda: c => c.asesor },
                    {
                      titulo: 'Venta foco',
                      alinear: 'der',
                      celda: c => dinero(c.venta_foco),
                    },
                    {
                      titulo: 'Líneas foco',
                      celda: c => (
                        <span className="flex flex-wrap gap-1">
                          {foco.map(l => {
                            const compra =
                              c.lineas_foco.includes(l.id) ||
                              c.lineas_foco.includes(l.nombre)
                            return (
                              <span
                                key={l.id}
                                className={`rounded-full px-2 py-0.5 text-[11px] ${compra ? 'bg-primary/10' : 'bg-muted text-muted-foreground line-through'}`}
                                style={
                                  compra
                                    ? { color: colorFoco.get(l.id) }
                                    : undefined
                                }
                              >
                                {l.nombre}
                              </span>
                            )
                          })}
                        </span>
                      ),
                    },
                  ]}
                />
              )}
            </Bloque>
          </>
        )}
      </div>
    </SubPestanas>
  )
}
