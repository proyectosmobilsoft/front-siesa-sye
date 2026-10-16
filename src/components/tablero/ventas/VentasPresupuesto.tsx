import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import {
  Bloque,
  Malla,
  SubPestanas,
  BotonTabla,
  Tabla,
  Tarjeta,
} from '../comun'
import {
  BarrasConMeta,
  BarrasCumplimiento,
  BarrasComparadas,
} from '../graficas'
import {
  decimal,
  dinero,
  entero,
  etiquetaMes,
  kilos,
  porcentaje,
} from '../formato'
import type { DashboardVentas } from './tipos'
import { AYUDAS } from './ayudas'
import { Diferencia, Progreso } from './utiles'
import { tonoCumplimiento } from './colores'

const variacion = (a: number, b: number) => (b ? (a - b) / b : null)
const textoPct = (v: number | null) => (v == null ? '—' : porcentaje(v))

function Lectura({ d }: { d: DashboardVentas }) {
  const k = d.kpis
  const grupos = d.grupos
    .filter(g => g.cumplimiento != null && g.id !== 'OTROS')
    .sort((a, b) => (a.cumplimiento ?? 0) - (b.cumplimiento ?? 0))
  const asesores = d.asesores
    .filter(a => a.cumplimiento != null)
    .sort((a, b) => (a.cumplimiento ?? 0) - (b.cumplimiento ?? 0))
  const bajas = d.lineas
    .filter(l => l.cumplimiento != null && l.cumplimiento < 0.5)
    .slice(0, 4)
  const mes = k.proyeccion_mes
  const avance = mes ? mes.dias_transcurridos / mes.dias_mes : null
  const notas = [
    k.cumplimiento != null &&
      `Cumplimiento global: ${textoPct(k.cumplimiento)}${avance == null ? '' : `; ${k.cumplimiento >= avance ? 'adelantado' : 'atrasado'} frente al ${textoPct(avance)} del mes transcurrido`}.`,
    grupos.length > 0 &&
      `Grupo más atrasado: ${grupos[0].nombre} (${textoPct(grupos[0].cumplimiento)}). Más adelantado: ${grupos[grupos.length - 1].nombre} (${textoPct(grupos[grupos.length - 1].cumplimiento)}).`,
    asesores.length > 0 &&
      `Mejor asesor: ${asesores[asesores.length - 1].nombre} (${textoPct(asesores[asesores.length - 1].cumplimiento)}). Peor: ${asesores[0].nombre} (${textoPct(asesores[0].cumplimiento)}).`,
    bajas.length > 0 &&
      `Líneas por debajo del 50 %: ${bajas.map(l => l.nombre).join(', ')}.`,
    mes &&
      mes.meta != null &&
      `Proyección de cierre: ${dinero(mes.proyeccion)} frente a meta mensual de ${dinero(mes.meta)}.`,
    `Vendedores sin presupuesto: ${dinero(k.venta_sin_asesor_presupuesto)} en ventas.`,
    k.venta_anio_anterior > 0 &&
      `Frente al mismo periodo del año anterior, la venta ${k.venta >= k.venta_anio_anterior ? 'subió' : 'bajó'} ${porcentaje(Math.abs(variacion(k.venta, k.venta_anio_anterior) ?? 0))}.`,
  ].filter((n): n is string => Boolean(n))
  return (
    <Bloque
      titulo="Lectura del analista"
      descripcion="Señales principales del presupuesto"
      accion={<Lightbulb className="size-5 text-amber-500" />}
      ayuda={{
        fuente: 'KPIs, grupos, asesores y líneas del presupuesto 2026.',
        formula: 'Comparación de ventas y metas prorrateadas del periodo.',
      }}
    >
      <ul className="grid gap-3 lg:grid-cols-2">
        {notas.map(n => (
          <li
            key={n}
            className="rounded-2xl bg-muted/50 p-3.5 text-[13.5px] leading-relaxed text-foreground/85"
          >
            {n}
          </li>
        ))}
      </ul>
    </Bloque>
  )
}

export function VentasPresupuesto({
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
  const opciones = [
    'Resumen',
    'Asesores',
    'Líneas',
    'Matriz',
    'Descuentos',
  ].map(etiqueta => ({ etiqueta, valor: etiqueta.toLowerCase() }))
  const activa = opciones.some(opcion => opcion.valor === sub) ? sub : 'resumen'
  const diasRango = Math.max(
    1,
    (Date.parse(`${d.hasta}T00:00:00`) - Date.parse(`${d.desde}T00:00:00`)) /
      86400000 +
      1
  )
  const diasRestantes = kDiasRestantes(d.kpis.proyeccion_mes)

  const [verDescuento, setVerDescuento] = useState(false)
  const [canal, setCanal] = useState('Local')
  const k = d.kpis
  const asesores = [...d.asesores].sort(
    (a, b) =>
      (a.grupo ?? 'ZZZ').localeCompare(b.grupo ?? 'ZZZ') || b.venta - a.venta
  )
  const conMeta = d.asesores.filter(a => a.meta != null)
  const columnas = [...d.lineas.filter(l => l.meta != null)].sort(
    (a, b) =>
      Number(b.mide_kg || b.mide_unidades) -
      Number(a.mide_kg || a.mide_unidades)
  )
  const celdas = new Map(d.matriz.map(m => [`${m.asesor}\u0000${m.linea}`, m]))
  const canales = ['Local', 'Regional', 'Sub-distribución']
  const filasDescuento = d.descuento_pp.filter(
    x =>
      x.canal.toLowerCase().replace(/[-\s]/g, '') ===
      canal.toLowerCase().replace(/[-\s]/g, '')
  )
  const tramos = [...new Set(filasDescuento.map(x => x.tramo))]
  const proveedores = [...new Set(filasDescuento.map(x => x.proveedor))]
  return (
    <SubPestanas opciones={opciones} activa={activa} alElegir={alElegirSub}>
      <div className="flex flex-col gap-4">
        {activa === 'resumen' && (
          <>
            {k.meta == null && (
              <div className="rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
                El rango elegido no tiene presupuesto (solo hay metas para
                2026).
              </div>
            )}
            <Malla columnas={6}>
              <Tarjeta
                compacta
                serie={d.mensual.map(m => m.venta)}
                etiqueta="Venta del periodo"
                valor={dinero(k.venta)}
                variacion={variacion(k.venta, k.venta_previa)}
                nota="vs periodo anterior"
                ayuda={AYUDAS.venta}
              />
              <Tarjeta
                compacta
                serie={d.mensual.map(m => m.meta ?? 0)}
                etiqueta="Meta del periodo"
                valor={k.meta == null ? '—' : dinero(k.meta)}
                ayuda={AYUDAS.meta}
              />
              <Tarjeta
                compacta
                etiqueta="Cumplimiento"
                valor={textoPct(k.cumplimiento)}
                nota={
                  k.meta == null
                    ? 'Sin meta'
                    : k.cumplimiento != null && k.cumplimiento >= 1
                      ? `Superó por ${dinero((k.cumplimiento - 1) * k.meta)}`
                      : `Faltan ${dinero((1 - (k.cumplimiento ?? 0)) * k.meta)}`
                }
                tono={tonoCumplimiento(k.cumplimiento)}
                ayuda={AYUDAS.cumplimiento}
              />
              <Tarjeta
                compacta
                etiqueta="Meta de gerencia"
                valor={k.meta_gerencia == null ? '—' : dinero(k.meta_gerencia)}
                nota={`Cumplimiento ${textoPct(k.cumplimiento_gerencia)}`}
                ayuda={AYUDAS.gerencia}
              />
              <Tarjeta
                compacta
                etiqueta="Proyección de cierre del mes"
                valor={
                  k.proyeccion_mes ? dinero(k.proyeccion_mes.proyeccion) : '—'
                }
                nota={
                  k.proyeccion_mes
                    ? `${k.proyeccion_mes.dias_transcurridos} de ${k.proyeccion_mes.dias_mes} días`
                    : 'Solo disponible para el mes en curso'
                }
                ayuda={AYUDAS.proyeccion}
              />
              <Tarjeta
                compacta
                etiqueta="Kilos de líneas con meta"
                valor={`${kilos(k.kg_lineas_kg)} / ${k.meta_kg == null ? '—' : kilos(k.meta_kg)}`}
                nota={`Cumplimiento ${textoPct(k.cumplimiento_kg)}`}
                ayuda={AYUDAS.kilos}
              />
              <Tarjeta
                compacta
                etiqueta="Clientes con compra"
                valor={entero(k.clientes)}
                ayuda={{
                  fuente: AYUDAS.venta.fuente,
                  formula: 'Conteo de clientes distintos con venta > 0',
                }}
              />
              <Tarjeta
                compacta
                etiqueta="Ticket promedio"
                valor={dinero(k.ticket_promedio)}
                ayuda={{
                  fuente: AYUDAS.venta.fuente,
                  formula:
                    'Venta ÷ documentos (facturas + remisiones no facturadas)',
                }}
              />
            </Malla>

            <Malla columnas={6}>
              <Tarjeta
                compacta
                etiqueta="Venta promedio diaria"
                valor={dinero(k.venta / diasRango)}
                ayuda={{
                  fuente: AYUDAS.venta.fuente,
                  formula: 'Venta del rango ÷ días calendario inclusivos',
                }}
              />
              <Tarjeta
                compacta
                etiqueta="Venta diaria necesaria"
                valor={
                  k.proyeccion_mes?.meta == null
                    ? '—'
                    : dinero(
                        (k.proyeccion_mes.meta - k.proyeccion_mes.venta) /
                          diasRestantes
                      )
                }
                nota="Para cumplir la meta mensual"
                ayuda={{
                  fuente: AYUDAS.proyeccion.fuente,
                  formula:
                    '(Meta mensual − venta mensual) ÷ días restantes del mes',
                }}
              />
              <Tarjeta
                compacta
                etiqueta="Asesores en meta"
                valor={`${entero(d.asesores.filter(a => a.cumplimiento != null && a.cumplimiento >= 1).length)} de ${entero(d.asesores.filter(a => a.cumplimiento != null).length)}`}
                ayuda={{
                  fuente: AYUDAS.meta.fuente,
                  formula:
                    'Asesores con cumplimiento ≥ 100 % ÷ asesores con meta',
                }}
              />
              <Tarjeta
                compacta
                etiqueta="Líneas en meta"
                valor={`${entero(d.lineas.filter(l => l.cumplimiento != null && l.cumplimiento >= 1).length)} de ${entero(d.lineas.filter(l => l.cumplimiento != null).length)}`}
                ayuda={{
                  fuente: AYUDAS.meta.fuente,
                  formula: 'Líneas con cumplimiento ≥ 100 % ÷ líneas con meta',
                }}
              />
              <Tarjeta
                compacta
                etiqueta="Crecimiento anual"
                valor={textoPct(variacion(k.venta, k.venta_anio_anterior))}
                ayuda={{
                  fuente: AYUDAS.venta.fuente,
                  formula:
                    '(Venta actual − venta del mismo periodo del año anterior) ÷ venta del año anterior',
                }}
              />
              <Tarjeta
                compacta
                etiqueta="Precio promedio por kg"
                valor={
                  k.kg_lineas_kg
                    ? dinero(
                        d.lineas
                          .filter(l => l.mide_kg)
                          .reduce((suma, linea) => suma + linea.venta, 0) /
                          k.kg_lineas_kg
                      )
                    : '—'
                }
                ayuda={{
                  fuente: AYUDAS.valorKg.fuente,
                  formula:
                    'Σ venta de líneas medidas en kg ÷ kg de esas líneas',
                }}
              />
            </Malla>
            <Lectura d={d} />
            <Malla columnas={2}>
              <Bloque
                titulo="Venta vs meta por mes"
                ayuda={{
                  fuente: `${AYUDAS.venta.fuente} ${AYUDAS.meta.fuente}`,
                  formula:
                    'Σ venta y meta prorrateada por mes; comparación con igual mes del año anterior.',
                }}
              >
                <BarrasConMeta
                  datos={d.mensual.map(m => ({
                    nombre: etiquetaMes(m.mes),
                    venta: m.venta,
                    meta: m.meta,
                    anterior: m.venta_anio_anterior,
                  }))}
                />
              </Bloque>
              <Bloque
                titulo="Cumplimiento por grupo"
                ayuda={{
                  fuente: AYUDAS.meta.fuente,
                  formula: 'Venta de asesores del grupo ÷ meta del grupo',
                }}
              >
                <BarrasCumplimiento
                  datos={d.grupos
                    .filter(g => g.cumplimiento != null)
                    .map(g => ({
                      nombre: g.nombre,
                      valor: g.cumplimiento ?? 0,
                    }))}
                />
              </Bloque>
            </Malla>
          </>
        )}
        {activa === 'asesores' && (
          <>
            <Bloque
              titulo="Asesores"
              accion={
                <BotonTabla
                  visible={!!tablas.asesores}
                  alAlternar={() => alternar('asesores')}
                />
              }
              ayuda={{
                fuente: `${AYUDAS.venta.fuente} ${AYUDAS.meta.fuente}`,
                formula:
                  'Venta y meta agrupadas por asesor; faltante = meta − venta.',
              }}
            >
              <BarrasComparadas
                datos={asesores.map(a => ({
                  nombre: `${a.grupo ?? 'Sin grupo'} · ${a.nombre}`,
                  actual: a.venta,
                  meta: a.meta ?? 0,
                  cumplimiento: a.cumplimiento,
                }))}
                formato={dinero}
              />
              {tablas.asesores && (
                <Tabla
                  filas={asesores}
                  clave={a => a.nombre}
                  pie={`Total · Venta ${dinero(d.asesores.reduce((s, a) => s + a.venta, 0))} · Meta ${dinero(conMeta.reduce((s, a) => s + (a.meta ?? 0), 0))}`}
                  columnas={[
                    {
                      titulo: 'Asesor',
                      celda: a => (
                        <span className="font-medium text-foreground">
                          {a.nombre}
                        </span>
                      ),
                    },
                    {
                      titulo: 'Grupo',
                      celda: a => (
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                          {a.grupo ?? 'Sin grupo'}
                        </span>
                      ),
                    },
                    {
                      titulo: 'Venta',
                      alinear: 'der',
                      celda: a => dinero(a.venta),
                    },
                    {
                      titulo: 'Meta',
                      alinear: 'der',
                      celda: a => (a.meta == null ? '—' : dinero(a.meta)),
                    },
                    {
                      titulo: 'Cumplimiento',
                      alinear: 'der',
                      celda: a => <Progreso valor={a.cumplimiento} />,
                    },
                    {
                      titulo: 'Faltante',
                      alinear: 'der',
                      celda: a => <Diferencia venta={a.venta} meta={a.meta} />,
                    },
                    {
                      titulo: 'Meta gerencia',
                      alinear: 'der',
                      celda: a =>
                        a.meta_gerencia == null ? '—' : dinero(a.meta_gerencia),
                    },
                    {
                      titulo: 'Cumpl. gerencia',
                      alinear: 'der',
                      celda: a => textoPct(a.cumplimiento_gerencia),
                    },
                  ]}
                />
              )}
            </Bloque>
          </>
        )}
        {activa === 'líneas' && (
          <>
            <Bloque
              titulo="Líneas (proveedores con presupuesto)"
              accion={
                <BotonTabla
                  visible={!!tablas.lineas}
                  alAlternar={() => alternar('lineas')}
                />
              }
              ayuda={{
                fuente: `${AYUDAS.meta.fuente} ${AYUDAS.kilos.fuente}`,
                formula: 'Venta ÷ meta; kg ÷ meta kg; valor/kg = venta ÷ kg.',
              }}
            >
              <>
                <div className="max-h-[520px] overflow-y-auto">
                  <BarrasCumplimiento
                    datos={d.lineas
                      .filter(l => l.cumplimiento != null)
                      .map(l => ({
                        nombre: l.nombre,
                        valor: l.cumplimiento ?? 0,
                      }))}
                  />
                </div>
                <BarrasComparadas
                  datos={d.lineas
                    .filter(l => l.mide_kg || l.mide_unidades)
                    .map(l => ({
                      nombre: l.nombre,
                      actual: l.mide_kg ? l.kg : l.unidades,
                      meta: (l.mide_kg ? l.meta_kg : l.meta_unidades) ?? 0,
                      cumplimiento: l.mide_kg
                        ? l.cumplimiento_kg
                        : l.cumplimiento_unidades,
                    }))}
                  formato={entero}
                  etiquetas={['Kg / und', 'Meta física']}
                />
              </>
              {tablas.lineas && (
                <Tabla
                  filas={d.lineas}
                  clave={l => l.id}
                  columnas={[
                    {
                      titulo: 'Línea',
                      celda: l => (
                        <span className="font-medium text-foreground">
                          {l.nombre}
                        </span>
                      ),
                    },
                    {
                      titulo: 'Venta',
                      alinear: 'der',
                      celda: l => dinero(l.venta),
                    },
                    {
                      titulo: 'Meta',
                      alinear: 'der',
                      celda: l => (l.meta == null ? '—' : dinero(l.meta)),
                    },
                    {
                      titulo: 'Cumplimiento',
                      alinear: 'der',
                      celda: l => <Progreso valor={l.cumplimiento} />,
                    },
                    {
                      titulo: 'Kg / und vs meta',
                      alinear: 'der',
                      celda: l =>
                        l.mide_kg
                          ? `${kilos(l.kg)} / ${l.meta_kg == null ? '—' : kilos(l.meta_kg)}`
                          : l.mide_unidades
                            ? `${entero(l.unidades)} / ${l.meta_unidades == null ? '—' : entero(l.meta_unidades)} und`
                            : '—',
                    },
                    {
                      titulo: 'Valor/kg',
                      alinear: 'der',
                      celda: l =>
                        l.valor_kg == null ? '—' : dinero(l.valor_kg),
                    },
                    {
                      titulo: 'Var. anterior',
                      alinear: 'der',
                      celda: l => textoPct(variacion(l.venta, l.venta_previa)),
                    },
                  ]}
                />
              )}
            </Bloque>
          </>
        )}
        {activa === 'matriz' && (
          <>
            <Bloque
              titulo="Matriz asesor × línea"
              ayuda={{
                fuente:
                  'Venta SIESA y metas por línea × asesor del Excel PRESUPUESTO 2026.',
                formula:
                  'Cada celda = venta del asesor en la línea ÷ meta de esa combinación.',
              }}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-card p-2 text-left">
                        Asesor
                      </th>
                      {columnas.map(l => (
                        <th
                          key={l.id}
                          className="whitespace-nowrap p-2 text-right"
                        >
                          {l.nombre}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.asesores
                      .filter(a => a.grupo)
                      .map(a => (
                        <tr key={a.nombre} className="border-t border-border">
                          <th className="sticky left-0 z-10 whitespace-nowrap bg-card p-2 text-left font-medium">
                            {a.nombre}
                            <span className="block text-muted-foreground">
                              {a.grupo}
                            </span>
                          </th>
                          {columnas.map(l => {
                            const c =
                              celdas.get(`${a.nombre}\u0000${l.id}`) ??
                              celdas.get(`${a.nombre}\u0000${l.nombre}`)
                            const v = c?.cumplimiento ?? null
                            return (
                              <td
                                key={l.id}
                                title={`Venta: ${dinero(c?.venta ?? 0)} / Meta: ${c?.meta == null ? '—' : dinero(c.meta)}`}
                                className={`p-2 text-right tabular-nums ${v == null ? 'bg-muted/50' : v < 0.5 ? 'bg-red-500/15' : v < 0.8 ? 'bg-amber-500/15' : v < 1 ? 'bg-emerald-500/15' : 'bg-emerald-500/30'}`}
                              >
                                {textoPct(v)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Bloque>
          </>
        )}
        {activa === 'descuentos' && (
          <>
            <Bloque
              titulo="Descuento por pronto pago"
              descripcion="Consulta las condiciones por canal y días de pago"
              ayuda={AYUDAS.descuento}
              accion={
                <button
                  type="button"
                  onClick={() => setVerDescuento(!verDescuento)}
                  className="rounded-xl bg-muted px-3 py-1.5 text-sm"
                >
                  {verDescuento ? 'Ocultar tabla' : 'Ver tabla'}
                </button>
              }
            >
              {verDescuento && (
                <>
                  <div className="mb-3 flex flex-wrap gap-1 rounded-xl bg-muted p-1">
                    {canales.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCanal(c)}
                        className={`rounded-lg px-3 py-1.5 text-xs ${canal === c ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr>
                          <th className="p-2 text-left">Días de pago</th>
                          {proveedores.map(p => (
                            <th
                              key={p}
                              className="whitespace-nowrap p-2 text-right"
                            >
                              {p}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tramos.map(t => (
                          <tr key={t} className="border-t border-border">
                            <th className="whitespace-nowrap p-2 text-left">
                              {t}
                            </th>
                            {proveedores.map(p => {
                              const valor = filasDescuento.find(
                                x => x.tramo === t && x.proveedor === p
                              )?.porcentaje
                              return (
                                <td
                                  key={p}
                                  className={`p-2 text-right ${valor != null && valor < 0 ? 'text-red-600 dark:text-red-400' : ''}`}
                                >
                                  {valor == null
                                    ? '—'
                                    : `${decimal(valor, 1)} %`}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Bloque>
          </>
        )}
      </div>
    </SubPestanas>
  )
}

function kDiasRestantes(
  proyeccion: DashboardVentas['kpis']['proyeccion_mes']
): number {
  return Math.max(
    1,
    proyeccion ? proyeccion.dias_mes - proyeccion.dias_transcurridos : 1
  )
}
