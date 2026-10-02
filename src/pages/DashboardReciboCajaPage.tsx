import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Ban,
  CalendarClock,
  CircleDollarSign,
  FileText,
  Lightbulb,
  Percent,
  Scale,
  Wallet,
} from 'lucide-react'
import { apiClient } from '@/api/client'
import { useAuthStore, coPuntual } from '@/store/authStore'
import { useFechasLimite, hoyLocalIso } from '@/hooks/useFechasLimite'
import { Bloque, CuerpoConsulta, Encabezado, Malla, SelectorRango, Tabla, Tarjeta } from '@/components/tablero/comun'
import { Areas, Barras, BarrasApiladas, BarrasH, Dona } from '@/components/tablero/graficas'
import { PALETA, decimal, dinero, entero, etiquetaMes, kilos, porcentaje, rangoDePreset, type PresetRango } from '@/components/tablero/formato'

interface Mensual {
  mes: string
  recaudo_app: number
  recaudo_siesa: number
  recaudo_cartera: number
  otros_ingresos: number
  recibos: number
  anulados: number
  descuento_pp: number
  facturado: number
  kg_facturados: number
  facturas: number
}

interface Conductor {
  usuario: string
  nombre: string
  recibos: number
  recaudo: number
  efectivo: number
  descuento_pp: number
  valor_facturas: number
  anulados: number
  dias_promedio_pago: number | null
  kg: number
  facturas_cobradas: number
}

interface DashboardRC {
  desde: string
  hasta: string
  centros: string[]
  periodo_anterior: { desde: string; hasta: string }
  kpis: {
    recaudo: number
    recaudo_previo: number
    recaudo_cartera: number
    recaudo_cartera_previo: number
    otros_ingresos: number
    recibos_sin_factura: number
    recibos: number
    ticket_promedio: number
    descuento_pp: number
    valor_facturas: number
    dias_promedio_pago: number | null
    anulados: number
    tasa_anulacion: number
    tasa_anulacion_previa: number
    recaudo_app: number
    facturado: number
    cobertura_recaudo: number | null
    kg_facturados: number
    kg_cobrados_conductores: number
  }
  medios: { efectivo: number; transferencia: number; tarjeta_credito: number; tarjeta_debito: number; cheque: number }
  mensual: Mensual[]
  conductores: Conductor[]
  cajeros: { usuario: string; nombre: string; recibos: number; recaudo: number; anulados: number }[]
  clientes: { cliente: string; nit: string | null; recibos: number; recaudo: number; valor_facturas: number; descuento_pp: number; dias_promedio_pago: number | null }[]
  anulaciones: {
    por_motivo: { motivo: string; cantidad: number; valor: number }[]
    por_quien_anula: { usuario: string; nombre: string; cantidad: number; valor: number }[]
    por_creador: { usuario: string; nombre: string; origen: 'APP' | 'SIESA'; cantidad: number; valor: number }[]
    por_tiempo: { tramo: string; cantidad: number }[]
  }
}

const variacion = (actual: number, previo: number) => (previo ? (actual - previo) / previo : null)
const dias = (v: number | null) => (v == null ? '—' : `${decimal(v, 1)} días`)
const recortar = (texto: string, max = 22) => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto)

/** Conclusiones automáticas para decidir: qué cambió, dónde se pierde plata y a quién mirar. */
function lecturaAnalista(d: DashboardRC): { tono: 'ok' | 'aviso' | 'err' | 'info'; texto: ReactNode }[] {
  const k = d.kpis
  const notas: { tono: 'ok' | 'aviso' | 'err' | 'info'; texto: ReactNode }[] = []

  const vRecaudo = variacion(k.recaudo_cartera, k.recaudo_cartera_previo)
  if (vRecaudo != null) {
    notas.push({
      tono: vRecaudo >= 0 ? 'ok' : 'err',
      texto: (
        <>
          El cobro de cartera {vRecaudo >= 0 ? 'subió' : 'bajó'} <b>{porcentaje(Math.abs(vRecaudo))}</b> frente al periodo anterior ({dinero(k.recaudo_cartera)} vs {dinero(k.recaudo_cartera_previo)}).
        </>
      ),
    })
  }

  if (k.cobertura_recaudo != null) {
    notas.push({
      tono: k.cobertura_recaudo >= 0.9 ? 'ok' : k.cobertura_recaudo >= 0.7 ? 'aviso' : 'err',
      texto: (
        <>
          Por cada $100 facturados se cobraron <b>${decimal(k.cobertura_recaudo * 100, 0)}</b> de cartera en el mismo periodo.
          {k.cobertura_recaudo > 1
            ? ' Se cobró más de lo que se facturó: se están recogiendo facturas de periodos anteriores (la cartera baja).'
            : k.cobertura_recaudo < 0.9
              ? ' Se cobra menos de lo que se factura: la cartera está creciendo; revisar clientes con más días de pago.'
              : ''}
        </>
      ),
    })
  }

  if (k.valor_facturas > 0) {
    const pctDescuento = k.descuento_pp / k.valor_facturas
    notas.push({
      tono: pctDescuento > 0.04 ? 'aviso' : 'info',
      texto: (
        <>
          Los descuentos financieros costaron <b>{dinero(k.descuento_pp)}</b> ({porcentaje(pctDescuento)} de lo cobrado en facturas), con un pago promedio a <b>{dias(k.dias_promedio_pago)}</b>.
        </>
      ),
    })
  }

  const motivo = d.anulaciones.por_motivo[0]
  if (k.anulados > 0 && motivo) {
    const vAnul = k.tasa_anulacion - k.tasa_anulacion_previa
    notas.push({
      tono: k.tasa_anulacion > 0.02 ? 'err' : 'aviso',
      texto: (
        <>
          Se anuló el <b>{porcentaje(k.tasa_anulacion)}</b> de los recibos ({entero(k.anulados)})
          {Math.abs(vAnul) >= 0.001 && <>, {vAnul > 0 ? 'más' : 'menos'} que el periodo anterior ({porcentaje(k.tasa_anulacion_previa)})</>}. Causa principal:{' '}
          <b>{motivo.motivo.toLowerCase()}</b> ({porcentaje(motivo.cantidad / k.anulados, 0)} de los casos): es un error de captura, se ataca con validación y capacitación.
        </>
      ),
    })
  }

  const creador = d.anulaciones.por_creador[0]
  if (creador && creador.cantidad >= 5) {
    notas.push({
      tono: 'aviso',
      texto: (
        <>
          <b>{creador.nombre}</b> ({creador.origen === 'APP' ? 'conductor, app' : 'caja SIESA'}) acumula {entero(creador.cantidad)} recibos anulados: es el primer usuario a revisar.
        </>
      ),
    })
  }

  if (k.otros_ingresos > k.recaudo_cartera * 0.2) {
    notas.push({
      tono: 'info',
      texto: (
        <>
          {entero(k.recibos_sin_factura)} recibos no cruzan ninguna factura y suman <b>{dinero(k.otros_ingresos)}</b> (anticipos u otros ingresos). No se cuentan como cobro de cartera.
        </>
      ),
    })
  }

  const topKg = [...d.conductores].sort((a, b) => b.kg - a.kg)[0]
  if (topKg && topKg.kg > 0) {
    notas.push({
      tono: 'info',
      texto: (
        <>
          <b>{topKg.nombre}</b> es el conductor que más carga movió en facturas cobradas: <b>{kilos(topKg.kg)}</b> en {entero(topKg.facturas_cobradas)} facturas.
        </>
      ),
    })
  }

  return notas
}

const TONO_NOTA = {
  ok: 'bg-emerald-500',
  aviso: 'bg-amber-500',
  err: 'bg-red-500',
  info: 'bg-blue-500',
}

export function DashboardReciboCajaPage() {
  const centroOperacionActivo = useAuthStore((s) => s.centroOperacionActivo)
  const { data: limites } = useFechasLimite()
  const [preset, setPreset] = useState<PresetRango | null>('anio')
  const [rango, setRango] = useState(() => rangoDePreset('anio'))
  const valido = !!rango.desde && !!rango.hasta && rango.desde <= rango.hasta

  const consulta = useQuery({
    queryKey: ['dashboard-rc', rango.desde, rango.hasta, centroOperacionActivo],
    queryFn: async () =>
      (await apiClient.get<{ success: boolean; data: DashboardRC }>('/dashboard/recibo-caja', { params: rango })).data.data,
    enabled: valido,
    staleTime: 5 * 60 * 1000,
  })
  const d = consulta.data
  const co = coPuntual(centroOperacionActivo)

  return (
    <section className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <Encabezado
        titulo="Dashboard de Recibo de Caja"
        descripcion={`Cobro de cartera, anulaciones, conductores, carga y clientes${co ? ` · C.O. ${co}` : ' · todos los C.O.'}. Incluye recibos hechos en SIESA y en la app.`}
      />
      <SelectorRango
        preset={preset}
        desde={rango.desde}
        hasta={rango.hasta}
        min={limites?.recibos ?? undefined}
        max={hoyLocalIso()}
        alElegirPreset={(p) => {
          setPreset(p)
          setRango(rangoDePreset(p))
        }}
        alCambiarDesde={(v) => {
          setPreset(null)
          setRango((r) => ({ ...r, desde: v }))
        }}
        alCambiarHasta={(v) => {
          setPreset(null)
          setRango((r) => ({ ...r, hasta: v }))
        }}
      />

      <CuerpoConsulta consulta={{ isLoading: consulta.isLoading || (consulta.isFetching && !d), isError: consulta.isError }} vacio={!valido} mensajeVacio="Elige un rango de fechas válido" altura="h-96">
        {d && <Contenido d={d} />}
      </CuerpoConsulta>
    </section>
  )
}

function Contenido({ d }: { d: DashboardRC }) {
  const k = d.kpis
  const mensual = d.mensual.map((m) => ({ ...m, etiqueta: etiquetaMes(m.mes) }))
  const notas = lecturaAnalista(d)
  const conductoresPorRecaudo = d.conductores.slice(0, 10)
  const conductoresPorKg = [...d.conductores].filter((c) => c.kg > 0).sort((a, b) => b.kg - a.kg).slice(0, 10)

  const medios = [
    { nombre: 'Transferencia', valor: d.medios.transferencia, color: PALETA[0] },
    { nombre: 'Efectivo', valor: d.medios.efectivo, color: PALETA[1] },
    { nombre: 'T. Débito', valor: d.medios.tarjeta_debito, color: PALETA[2] },
    { nombre: 'T. Crédito', valor: d.medios.tarjeta_credito, color: PALETA[3] },
    { nombre: 'Cheque', valor: d.medios.cheque, color: PALETA[4] },
  ].filter((m) => m.valor > 0)

  return (
    <div className="flex flex-col gap-4">
      <Malla columnas={4}>
        <Tarjeta
          etiqueta="Cobro de cartera"
          valor={dinero(k.recaudo_cartera)}
          variacion={variacion(k.recaudo_cartera, k.recaudo_cartera_previo)}
          nota="vs periodo anterior"
          tono="marca"
          icono={Wallet}
        />
        <Tarjeta etiqueta="Facturado" valor={dinero(k.facturado)} nota="Facturas menos notas crédito" tono="info" icono={FileText} />
        <Tarjeta
          etiqueta="Cobertura de recaudo"
          valor={k.cobertura_recaudo == null ? '—' : porcentaje(k.cobertura_recaudo, 0)}
          nota={k.cobertura_recaudo != null && k.cobertura_recaudo > 1 ? 'Cobro > facturado: baja la cartera' : 'Cobro de cartera / facturado'}
          tono={k.cobertura_recaudo != null && k.cobertura_recaudo < 0.7 ? 'err' : 'ok'}
          icono={CircleDollarSign}
        />
        <Tarjeta etiqueta="Días promedio de pago" valor={dias(k.dias_promedio_pago)} nota="Desde la factura hasta el recibo" tono="neutro" icono={CalendarClock} />
        <Tarjeta
          etiqueta="Descuento financiero"
          valor={dinero(k.descuento_pp)}
          nota={k.valor_facturas ? `${porcentaje(k.descuento_pp / k.valor_facturas)} de lo cobrado` : undefined}
          tono="aviso"
          icono={Percent}
        />
        <Tarjeta
          etiqueta="Tasa de anulación"
          valor={porcentaje(k.tasa_anulacion)}
          variacion={k.tasa_anulacion_previa ? variacion(k.tasa_anulacion, k.tasa_anulacion_previa) : null}
          subirEsMalo
          nota={`${entero(k.anulados)} recibos`}
          tono="err"
          icono={Ban}
        />
        <Tarjeta etiqueta="Carga despachada" valor={kilos(k.kg_facturados)} nota={`${kilos(k.kg_cobrados_conductores)} cobrada por conductores`} tono="info" icono={Scale} />
        <Tarjeta
          etiqueta="Ticket promedio"
          valor={dinero(k.ticket_promedio)}
          nota={`${entero(k.recibos - k.recibos_sin_factura)} recibos de cartera`}
          tono="neutro"
          icono={CircleDollarSign}
        />
      </Malla>

      {notas.length > 0 && (
        <Bloque titulo="Lectura del analista" descripcion="Lo que dicen los números del periodo y qué conviene revisar" accion={<Lightbulb className="h-5 w-5 text-amber-500" />}>
          <ul className="grid gap-3 lg:grid-cols-2">
            {notas.map((n, i) => (
              <li key={i} className="flex gap-3 rounded-2xl bg-muted/50 p-3.5 text-[13.5px] leading-relaxed text-foreground/85">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONO_NOTA[n.tono]}`} />
                <span>{n.texto}</span>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      <Malla columnas={2}>
        <Bloque titulo="Facturado vs. cobrado por mes" descripcion="Si la línea de cobro queda por debajo, la cartera crece">
          <Areas
            datos={mensual}
            ejeX="etiqueta"
            series={[
              { clave: 'facturado', nombre: 'Facturado', color: PALETA[0] },
              { clave: 'recaudo_cartera', nombre: 'Cobro de cartera', color: PALETA[1] },
            ]}
            formato={dinero}
          />
        </Bloque>
        <Bloque titulo="Recaudo por mes y origen" descripcion="Recibos de la caja en SIESA y de los conductores en la app">
          <BarrasApiladas
            datos={mensual}
            ejeX="etiqueta"
            series={[
              { clave: 'recaudo_siesa', nombre: 'Caja SIESA', color: PALETA[0] },
              { clave: 'recaudo_app', nombre: 'Conductores (app)', color: PALETA[1] },
            ]}
            formato={dinero}
          />
        </Bloque>
      </Malla>

      <Malla columnas={3}>
        <Bloque titulo="Medios de pago" descripcion={`${dinero(k.recaudo)} recaudados en total`}>
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={medios.length === 0} altura="h-56">
            <Dona datos={medios} formato={dinero} />
          </CuerpoConsulta>
        </Bloque>
        <Bloque titulo="Carga despachada por mes" descripcion="Kilos de mercancía facturada (menos devoluciones)" className="lg:col-span-2">
          <Barras datos={mensual.map((m) => ({ nombre: m.etiqueta, valor: m.kg_facturados }))} formato={kilos} nombreValor="Carga" color={PALETA[4]} />
        </Bloque>
      </Malla>

      <Malla columnas={3}>
        <Bloque titulo="Causas de anulación" descripcion="Motivo registrado en SIESA">
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.anulaciones.por_motivo.length === 0} mensajeVacio="Sin anulaciones en el periodo" altura="h-48">
            <BarrasH datos={d.anulaciones.por_motivo.map((m) => ({ nombre: recortar(m.motivo.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())), valor: m.cantidad }))} formato={entero} nombreValor="Recibos" color={PALETA[5]} anchoEtiqueta={150} />
          </CuerpoConsulta>
        </Bloque>
        <Bloque titulo="Tiempo hasta anular" descripcion="Cuánto después de creado se anula el recibo">
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.anulaciones.por_tiempo.length === 0} mensajeVacio="Sin anulaciones en el periodo" altura="h-48">
            <Barras datos={d.anulaciones.por_tiempo.map((t) => ({ nombre: t.tramo, valor: t.cantidad }))} formato={entero} nombreValor="Recibos" color={PALETA[5]} altura={220} />
          </CuerpoConsulta>
        </Bloque>
        <Bloque titulo="Anulados por mes" descripcion="Cantidad de recibos anulados">
          <Barras datos={mensual.map((m) => ({ nombre: m.etiqueta, valor: m.anulados }))} formato={entero} nombreValor="Anulados" color={PALETA[5]} altura={220} />
        </Bloque>
      </Malla>

      <Malla columnas={2}>
        <Bloque titulo="Quién genera los anulados" descripcion="Creador del recibo que luego se anuló">
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.anulaciones.por_creador.length === 0} mensajeVacio="Sin anulaciones en el periodo" altura="h-40">
            <Tabla
              columnas={[
                { titulo: 'Usuario', celda: (a) => <span className="font-medium text-foreground">{a.nombre}</span> },
                { titulo: 'Origen', celda: (a) => (a.origen === 'APP' ? 'Conductor · app' : 'Caja SIESA') },
                { titulo: 'Anulados', alinear: 'der', celda: (a) => entero(a.cantidad) },
                { titulo: 'Valor', alinear: 'der', celda: (a) => dinero(a.valor) },
              ]}
              filas={d.anulaciones.por_creador}
              clave={(a) => `${a.usuario}-${a.origen}`}
            />
          </CuerpoConsulta>
        </Bloque>
        <Bloque titulo="Quién anula" descripcion="Usuario de SIESA que hizo la anulación">
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.anulaciones.por_quien_anula.length === 0} mensajeVacio="Sin anulaciones en el periodo" altura="h-40">
            <Tabla
              columnas={[
                { titulo: 'Usuario', celda: (a) => <span className="font-medium text-foreground">{a.nombre}</span> },
                { titulo: 'Anulaciones', alinear: 'der', celda: (a) => entero(a.cantidad) },
                { titulo: 'Valor', alinear: 'der', celda: (a) => dinero(a.valor) },
              ]}
              filas={d.anulaciones.por_quien_anula}
              clave={(a) => a.usuario}
            />
          </CuerpoConsulta>
        </Bloque>
      </Malla>

      <Malla columnas={2}>
        <Bloque titulo="Conductores: cobro de cartera" descripcion="Los 10 que más recaudaron en la app">
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={conductoresPorRecaudo.length === 0} mensajeVacio="Sin recibos de conductores en el periodo" altura="h-48">
            <BarrasH datos={conductoresPorRecaudo.map((c) => ({ nombre: recortar(c.nombre), valor: c.recaudo }))} formato={dinero} nombreValor="Recaudo" color={PALETA[1]} anchoEtiqueta={150} />
          </CuerpoConsulta>
        </Bloque>
        <Bloque titulo="Conductores: carga cobrada" descripcion="Kilos de las facturas que cobró cada conductor">
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={conductoresPorKg.length === 0} mensajeVacio="Sin carga registrada en el periodo" altura="h-48">
            <BarrasH datos={conductoresPorKg.map((c) => ({ nombre: recortar(c.nombre), valor: c.kg }))} formato={kilos} nombreValor="Carga" color={PALETA[4]} anchoEtiqueta={150} />
          </CuerpoConsulta>
        </Bloque>
      </Malla>

      <Bloque titulo="Detalle por conductor" descripcion="Recibos hechos desde la app">
        <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.conductores.length === 0} mensajeVacio="Sin recibos de conductores en el periodo" altura="h-40">
          <Tabla
            columnas={[
              { titulo: 'Conductor', celda: (c) => <span className="font-medium text-foreground">{c.nombre}</span> },
              { titulo: 'Recibos', alinear: 'der', celda: (c) => entero(c.recibos) },
              { titulo: 'Recaudo', alinear: 'der', celda: (c) => dinero(c.recaudo) },
              { titulo: 'Efectivo', alinear: 'der', secundaria: true, celda: (c) => dinero(c.efectivo) },
              { titulo: 'Desc. financiero', alinear: 'der', secundaria: true, celda: (c) => dinero(c.descuento_pp) },
              { titulo: 'Días de pago', alinear: 'der', celda: (c) => dias(c.dias_promedio_pago) },
              { titulo: 'Facturas', alinear: 'der', secundaria: true, celda: (c) => entero(c.facturas_cobradas) },
              { titulo: 'Carga', alinear: 'der', celda: (c) => kilos(c.kg) },
              {
                titulo: 'Anulados',
                alinear: 'der',
                celda: (c) => (
                  <span className={c.recibos + c.anulados > 0 && c.anulados / (c.recibos + c.anulados) > 0.05 ? 'font-semibold text-red-600 dark:text-red-400' : undefined}>
                    {entero(c.anulados)}
                  </span>
                ),
              },
            ]}
            filas={d.conductores}
            clave={(c) => c.usuario}
          />
        </CuerpoConsulta>
      </Bloque>

      <Malla columnas={2}>
        <Bloque titulo="Clientes que más pagan" descripcion="Top 10 por valor de facturas cobradas">
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.clientes.length === 0} altura="h-48">
            <BarrasH datos={d.clientes.map((c) => ({ nombre: recortar(c.cliente), valor: c.valor_facturas }))} formato={dinero} nombreValor="Facturas cobradas" color={PALETA[0]} anchoEtiqueta={170} />
          </CuerpoConsulta>
        </Bloque>
        <Bloque titulo="Comportamiento de pago de esos clientes" descripcion="Días de pago altos = más capital de trabajo atrapado">
          <Tabla
            columnas={[
              {
                titulo: 'Cliente',
                celda: (c) => (
                  <span>
                    <span className="block font-medium text-foreground">{recortar(c.cliente, 32)}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{c.nit}</span>
                  </span>
                ),
              },
              { titulo: 'Cobrado', alinear: 'der', celda: (c) => dinero(c.valor_facturas) },
              { titulo: 'Descuento', alinear: 'der', secundaria: true, celda: (c) => dinero(c.descuento_pp) },
              {
                titulo: 'Días de pago',
                alinear: 'der',
                celda: (c) => (
                  <span className={c.dias_promedio_pago != null && c.dias_promedio_pago > 30 ? 'font-semibold text-red-600 dark:text-red-400' : undefined}>
                    {dias(c.dias_promedio_pago)}
                  </span>
                ),
              },
            ]}
            filas={d.clientes}
            clave={(c) => `${c.nit}-${c.cliente}`}
          />
        </Bloque>
      </Malla>

      <Bloque titulo="Caja SIESA por usuario" descripcion="Recibos tecleados directamente en SIESA">
        <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.cajeros.length === 0} altura="h-32">
          <Tabla
            columnas={[
              { titulo: 'Usuario', celda: (c) => <span className="font-medium text-foreground">{c.nombre}</span> },
              { titulo: 'Recibos', alinear: 'der', celda: (c) => entero(c.recibos) },
              { titulo: 'Recaudo', alinear: 'der', celda: (c) => dinero(c.recaudo) },
              { titulo: 'Anulados', alinear: 'der', celda: (c) => entero(c.anulados) },
            ]}
            filas={d.cajeros}
            clave={(c) => c.usuario}
          />
        </CuerpoConsulta>
      </Bloque>
    </div>
  )
}
