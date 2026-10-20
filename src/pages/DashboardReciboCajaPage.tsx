import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PanelExpandible } from '@/components/tablero/Expandible'
import { DetalleProvider } from '@/components/tablero/detalle/DetalleContext'
import { DETALLE_RECAUDO } from '@/components/tablero/detalle/especificaciones'
import { Resumenes } from '@/components/tablero/ventas/Resumenes'
import { VentasPresupuesto } from '@/components/tablero/ventas/VentasPresupuesto'
import { ComprasProveedores } from '@/components/tablero/compras/ComprasProveedores'
import { VentasProveedores } from '@/components/tablero/ventas/VentasProveedores'
import type { DashboardCompras, DashboardVentas } from '@/components/tablero/ventas/tipos'
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
import { Bloque, CuerpoConsulta, Encabezado, Malla, SelectorRango, SubPestanas, BotonTabla, Tabla, Tarjeta } from '@/components/tablero/comun'
import { Areas, Barras, BarrasApiladas, BarrasH, BarrasApiladasH, ClientesDispersion, Dona } from '@/components/tablero/graficas'
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
  const [parametros, setParametros] = useSearchParams()
  const valorVista = parametros.get('vista')
  const vista = valorVista === 'recaudo' || valorVista === 'presupuesto' || valorVista === 'proveedores' || valorVista === 'compras' ? valorVista : null
  const sub = parametros.get('sub') ?? 'resumen'
  const elegirSub = (valor: string) => setParametros(actuales => { const siguientes = new URLSearchParams(actuales); siguientes.set('sub', valor); return siguientes })
  const elegirVista = (v: 'recaudo' | 'presupuesto' | 'proveedores' | 'compras' | null) => {
    setParametros(actuales => { const siguientes = new URLSearchParams(actuales); if (v && v !== vista) siguientes.set('vista', v); else siguientes.delete('vista'); siguientes.delete('sub'); return siguientes })
  }
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
  const consultaVentas = useQuery({
    queryKey: ['dashboard-ventas', rango.desde, rango.hasta],
    queryFn: async () => (await apiClient.get<{ success: boolean; data: DashboardVentas }>('/dashboard/ventas', { params: rango })).data.data,
    enabled: valido,
    staleTime: 5 * 60 * 1000,
  })
  const consultaCompras = useQuery({
    queryKey: ['dashboard-compras', rango.desde, rango.hasta],
    queryFn: async () => (await apiClient.get<{ success: boolean; data: DashboardCompras }>('/dashboard/compras', { params: rango })).data.data,
    enabled: valido,
    staleTime: 5 * 60 * 1000,
  })
  const d = consulta.data
  const co = coPuntual(centroOperacionActivo)

  return (
    <DetalleProvider rango={valido ? rango : undefined}>
    <section className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <Encabezado
        titulo="Dashboard de Recaudo y Ventas"
        descripcion={`Recaudo de cartera${co ? ` (C.O. ${co})` : ' (todos los C.O.)'}, ventas vs presupuesto, ventas por marca y compras a proveedores (ambos C.O.).`}
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

      <Resumenes recaudo={d} ventas={consultaVentas.data} compras={consultaCompras.data} cargaCompras={consultaCompras.isLoading || (consultaCompras.isFetching && !consultaCompras.data)} errorCompras={consultaCompras.isError} cargaRecaudo={consulta.isLoading || (consulta.isFetching && !d)} errorRecaudo={consulta.isError} cargaVentas={consultaVentas.isLoading || (consultaVentas.isFetching && !consultaVentas.data)} errorVentas={consultaVentas.isError} vista={vista} alElegir={elegirVista} />
      <PanelExpandible vista={vista} titulo={vista === 'recaudo' ? 'Recaudo de cartera' : vista === 'presupuesto' ? 'Ventas vs presupuesto' : vista === 'compras' ? 'Compras por proveedor' : 'Ventas por marca/proveedor'} alCerrar={() => elegirVista(null)}>
        {vista === 'recaudo' && <CuerpoConsulta consulta={{ isLoading: consulta.isLoading || (consulta.isFetching && !d), isError: consulta.isError }} vacio={!valido} mensajeVacio="Elige un rango de fechas válido" altura="h-96">{d && <Contenido d={d} sub={sub} alElegirSub={elegirSub} />}</CuerpoConsulta>}
        {vista === 'presupuesto' && <CuerpoConsulta consulta={{ isLoading: consultaVentas.isLoading || (consultaVentas.isFetching && !consultaVentas.data), isError: consultaVentas.isError }} vacio={!valido} mensajeVacio="Elige un rango de fechas válido" altura="h-96">{consultaVentas.data && <VentasPresupuesto d={consultaVentas.data} sub={sub} alElegirSub={elegirSub} />}</CuerpoConsulta>}
        {vista === 'proveedores' && <CuerpoConsulta consulta={{ isLoading: consultaVentas.isLoading || (consultaVentas.isFetching && !consultaVentas.data), isError: consultaVentas.isError }} vacio={!valido} mensajeVacio="Elige un rango de fechas válido" altura="h-96">{consultaVentas.data && <VentasProveedores d={consultaVentas.data} sub={sub} alElegirSub={elegirSub} />}</CuerpoConsulta>}
        {vista === 'compras' && <CuerpoConsulta consulta={{ isLoading: consultaCompras.isLoading || (consultaCompras.isFetching && !consultaCompras.data), isError: consultaCompras.isError }} vacio={!valido} mensajeVacio="Elige un rango de fechas válido" altura="h-96">{consultaCompras.data && <ComprasProveedores d={consultaCompras.data} ventas={consultaVentas.data} sub={sub} alElegirSub={elegirSub} />}</CuerpoConsulta>}
      </PanelExpandible>
    </section>
    </DetalleProvider>
  )
}

function Contenido({ d, sub, alElegirSub }: { d: DashboardRC; sub: string; alElegirSub: (valor: string) => void }) {
  const [tablas, setTablas] = useState<Record<string, boolean>>({})
  const alternar = (clave: string) => setTablas(actual => ({ ...actual, [clave]: !actual[clave] }))
  const opciones = [
    { valor: 'resumen', etiqueta: 'Resumen' },
    { valor: 'tendencia', etiqueta: 'Tendencia' },
    { valor: 'anulaciones', etiqueta: 'Anulaciones' },
    { valor: 'conductores', etiqueta: 'Conductores' },
    { valor: 'clientes', etiqueta: 'Clientes y caja' },
  ]
  const activa = opciones.some(opcion => opcion.valor === sub) ? sub : 'resumen'
  const diasRango = Math.max(1, (Date.parse(`${d.hasta}T00:00:00`) - Date.parse(`${d.desde}T00:00:00`)) / 86400000 + 1)

  const k = d.kpis
  const mensual = d.mensual.map((m) => ({ ...m, etiqueta: etiquetaMes(m.mes) }))
  const notas = lecturaAnalista(d)
  const conductoresPorRecaudo = d.conductores.slice(0, 10)
  const conductoresPorKg = [...d.conductores].filter((c) => c.kg > 0).sort((a, b) => b.kg - a.kg).slice(0, 10)

  const medios = [
    { nombre: 'Efectivo', valor: d.medios.efectivo, color: PALETA[1] },
    { nombre: 'Transferencia', valor: d.medios.transferencia, color: PALETA[0] },
    { nombre: 'T. Débito', valor: d.medios.tarjeta_debito, color: PALETA[2] },
    { nombre: 'T. Crédito', valor: d.medios.tarjeta_credito, color: PALETA[3] },
    { nombre: 'Cheque', valor: d.medios.cheque, color: PALETA[4] },
  ].filter((m) => m.valor > 0)

  return (
    <SubPestanas opciones={opciones} activa={activa} alElegir={alElegirSub}>
    <div className="flex flex-col gap-4">
      {activa === 'resumen' && <>
      <Malla columnas={6}>
        <Tarjeta
          serie={mensual.map(m => m.recaudo_cartera)} etiqueta="Cobro de cartera" detalle={DETALLE_RECAUDO.cobroCartera}
          valor={dinero(k.recaudo_cartera)}
          variacion={variacion(k.recaudo_cartera, k.recaudo_cartera_previo)}
          nota="vs periodo anterior"
          tono="marca"
          icono={Wallet} ayuda={{ fuente: 'Recibos de caja (RC) de SIESA y de la app, no anulados, que cruzan al menos una factura.', formula: 'Σ medios de pago de RC no anulados con facturas cruzadas · Variación = (actual − anterior) / anterior', nota: 'Los RC sin factura (anticipos, otros ingresos) no cuentan aquí.' }}
        />
        <Tarjeta compacta serie={mensual.map(m => m.facturado)} etiqueta="Facturado" detalle={DETALLE_RECAUDO.facturado} valor={dinero(k.facturado)} nota="Facturas menos notas crédito" tono="info" icono={FileText} ayuda={{ fuente: 'Movimientos de inventario de facturas FCE, BQE, FM, FC, FV, C01 menos notas NC1, NC2, NV1, N01.', formula: 'Σ valor neto facturas − Σ valor neto notas crédito' }} />
        <Tarjeta
          etiqueta="Cobertura de recaudo" detalle={DETALLE_RECAUDO.cobertura}
          valor={k.cobertura_recaudo == null ? '—' : porcentaje(k.cobertura_recaudo, 0)}
          nota={k.cobertura_recaudo != null && k.cobertura_recaudo > 1 ? 'Cobro > facturado: baja la cartera' : 'Cobro de cartera / facturado'}
          tono={k.cobertura_recaudo != null && k.cobertura_recaudo < 0.7 ? 'err' : 'ok'}
          icono={CircleDollarSign} ayuda={{ fuente: 'RC de cartera y facturas de SIESA del mismo periodo.', formula: 'Cobro de cartera ÷ Facturado del mismo periodo', nota: '> 100 % = se cobraron facturas de periodos anteriores.' }}
        />
        <Tarjeta compacta etiqueta="Días promedio de pago" detalle={DETALLE_RECAUDO.diasPago} valor={dias(k.dias_promedio_pago)} nota="Desde la factura hasta el recibo" tono="neutro" icono={CalendarClock} ayuda={{ fuente: 'Cruce RC → factura (saldos abiertos).', formula: 'Σ (valor cruzado × días entre factura y RC) ÷ Σ valor cruzado' }} />
        <Tarjeta
          etiqueta="Descuento financiero" detalle={DETALLE_RECAUDO.descuento}
          valor={dinero(k.descuento_pp)}
          nota={k.valor_facturas ? `${porcentaje(k.descuento_pp / k.valor_facturas)} de lo cobrado` : undefined}
          tono="aviso"
          icono={Percent} ayuda={{ fuente: 'Descuento por pronto pago aplicado en el cruce del RC.', formula: 'Σ descuento PP · % = descuento ÷ valor de facturas cobradas' }}
        />
        <Tarjeta
          serie={mensual.map(m => m.anulados)} etiqueta="Tasa de anulación" detalle={DETALLE_RECAUDO.tasaAnulacion}
          valor={porcentaje(k.tasa_anulacion)}
          variacion={k.tasa_anulacion_previa ? variacion(k.tasa_anulacion, k.tasa_anulacion_previa) : null}
          subirEsMalo
          nota={`${entero(k.anulados)} recibos`}
          tono="err"
          icono={Ban} ayuda={{ fuente: 'RC de SIESA y de la app del periodo.', formula: 'RC anulados ÷ RC del periodo (vigentes + anulados)' }}
        />
        <Tarjeta compacta etiqueta="Carga despachada" detalle={DETALLE_RECAUDO.carga} valor={kilos(k.kg_facturados)} nota={`${kilos(k.kg_cobrados_conductores)} cobrada por conductores`} tono="info" icono={Scale} ayuda={{ fuente: 'Ítems de inventario facturados (sin servicios).', formula: 'Σ cantidad × peso unitario − devoluciones' }} />
        <Tarjeta
          etiqueta="Ticket promedio" detalle={DETALLE_RECAUDO.ticket}
          valor={dinero(k.ticket_promedio)}
          nota={`${entero(k.recibos - k.recibos_sin_factura)} recibos de cartera`}
          tono="neutro"
          icono={CircleDollarSign} ayuda={{ fuente: 'RC de cartera no anulados.', formula: 'Cobro de cartera ÷ número de RC de cartera' }}
        />
      </Malla>


      <Malla columnas={6}>
        <Tarjeta compacta etiqueta="Efectivo del recaudo" detalle={DETALLE_RECAUDO.efectivo} valor={porcentaje(k.recaudo ? d.medios.efectivo / k.recaudo : 0)} ayuda={{ fuente: 'Medios de pago y recaudo total de RC vigentes.', formula: 'Efectivo ÷ recaudo total' }} />
        <Tarjeta compacta etiqueta="Recaudado por la app" detalle={DETALLE_RECAUDO.app} valor={porcentaje(k.recaudo ? k.recaudo_app / k.recaudo : 0)} ayuda={{ fuente: 'RC de la app y recaudo total vigente.', formula: 'Recaudo app ÷ recaudo total' }} />
        <Tarjeta compacta etiqueta="Recaudo diario" detalle={DETALLE_RECAUDO.recaudoDiario} valor={dinero(k.recaudo / diasRango)} ayuda={{ fuente: 'Recaudo total del rango.', formula: 'Recaudo ÷ días calendario inclusivos del rango' }} />
        <Tarjeta compacta etiqueta="Recibos por día" detalle={DETALLE_RECAUDO.recibosDia} valor={decimal(k.recibos / diasRango, 1)} ayuda={{ fuente: 'RC vigentes del rango.', formula: 'Número de recibos ÷ días calendario inclusivos del rango' }} />
        <Tarjeta compacta etiqueta="Valor anulado" detalle={DETALLE_RECAUDO.valorAnulado} valor={dinero(d.anulaciones.por_motivo.reduce((suma, motivo) => suma + motivo.valor, 0))} ayuda={{ fuente: 'RC anulados por motivo.', formula: 'Σ valor de todos los motivos de anulación' }} />
        <Tarjeta compacta etiqueta="Mes de mayor recaudo" detalle={DETALLE_RECAUDO.mejorMes} valor={mensual.length ? mensual.reduce((mejor, mes) => mes.recaudo_app + mes.recaudo_siesa > mejor.recaudo_app + mejor.recaudo_siesa ? mes : mejor).etiqueta : '—'} ayuda={{ fuente: 'RC de SIESA y app agrupados por mes.', formula: 'Mes con máximo de recaudo SIESA + recaudo app' }} />
      </Malla>
      {notas.length > 0 && (
        <Bloque titulo="Lectura del analista" descripcion="Lo que dicen los números del periodo y qué conviene revisar" accion={<Lightbulb className="h-5 w-5 text-amber-500" />} ayuda={{ fuente: 'Indicadores de RC, facturas y anulaciones de SIESA y la app.', formula: 'Variaciones y proporciones de los indicadores del periodo.' }}>
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
        <Bloque titulo="Medios de pago" descripcion={`${dinero(k.recaudo)} recaudados en total`} ayuda={{ fuente: 'Medios de pago de RC vigentes.', formula: 'Σ valor de cada medio de pago.' }}>
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={medios.length === 0} altura="h-56">
            <Dona datos={medios} formato={dinero} />
          </CuerpoConsulta>
        </Bloque>
      </Malla>
      </>}
      {activa === 'tendencia' && <>
      <Malla columnas={2}>
        <Bloque titulo="Facturado vs. cobrado por mes" descripcion="Si la línea de cobro queda por debajo, la cartera crece" ayuda={{ fuente: 'Facturas y RC de cartera agrupados por mes.', formula: 'Σ facturado y Σ cobro de cartera de cada mes.' }}>
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
        <Bloque titulo="Recaudo por mes y origen" descripcion="Recibos de la caja en SIESA y de los conductores en la app" ayuda={{ fuente: 'RC de SIESA y la app agrupados por mes.', formula: 'Σ medios de pago por origen y mes.' }}>
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

        <Bloque titulo="Carga despachada por mes" descripcion="Kilos de mercancía facturada (menos devoluciones)" className="lg:col-span-2" ayuda={{ fuente: 'Ítems de inventario en facturas SIESA.', formula: 'Σ cantidad × peso unitario − devoluciones por mes.' }}>
          <Barras datos={mensual.map((m) => ({ nombre: m.etiqueta, valor: m.kg_facturados }))} formato={kilos} nombreValor="Carga" color={PALETA[4]} />
        </Bloque>
      </Malla>

      <Malla columnas={2}>
        <Bloque titulo="Anulados por mes" descripcion="Cantidad de recibos anulados" ayuda={{ fuente: 'RC anulados de SIESA y la app.', formula: 'Conteo de RC anulados por mes.' }}>
          <Barras datos={mensual.map((m) => ({ nombre: m.etiqueta, valor: m.anulados }))} formato={entero} nombreValor="Anulados" color={PALETA[5]} altura={220} />
        </Bloque>
      </Malla>
      </>}
      {activa === 'anulaciones' && <>
      <Malla columnas={3}>
        <Bloque titulo="Causas de anulación" descripcion="Motivo registrado en SIESA" ayuda={{ fuente: 'Motivos de RC anulados en SIESA.', formula: 'Conteo de RC anulados por motivo.' }}>
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.anulaciones.por_motivo.length === 0} mensajeVacio="Sin anulaciones en el periodo" altura="h-48">
            <BarrasH datos={d.anulaciones.por_motivo.map((m) => ({ nombre: recortar(m.motivo.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())), valor: m.cantidad }))} formato={entero} nombreValor="Recibos" color={PALETA[5]} anchoEtiqueta={150} />
          </CuerpoConsulta>
        </Bloque>
        <Bloque titulo="Tiempo hasta anular" descripcion="Cuánto después de creado se anula el recibo" ayuda={{ fuente: 'Fechas de creación y anulación de RC.', formula: 'Conteo de RC por tramo de tiempo hasta anular.' }}>
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.anulaciones.por_tiempo.length === 0} mensajeVacio="Sin anulaciones en el periodo" altura="h-48">
            <Barras datos={d.anulaciones.por_tiempo.map((t) => ({ nombre: t.tramo, valor: t.cantidad }))} formato={entero} nombreValor="Recibos" color={PALETA[5]} altura={220} />
          </CuerpoConsulta>
        </Bloque>

      </Malla>

      <Malla columnas={2}>
        <Bloque titulo="Quién genera los anulados" accion={<BotonTabla visible={!!tablas.creadores} alAlternar={() => alternar('creadores')} />} descripcion="Creador del recibo que luego se anuló" ayuda={{ fuente: 'Usuario creador de RC anulados.', formula: 'Conteo y Σ valor de RC anulados por creador.' }}>
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.anulaciones.por_creador.length === 0} mensajeVacio="Sin anulaciones en el periodo" altura="h-40">
<BarrasH datos={d.anulaciones.por_creador.map(a => ({ nombre: recortar(a.nombre), valor: a.cantidad }))} formato={entero} nombreValor="Anulaciones" color={PALETA[5]} />
          {tablas.creadores && (
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
          )}
          </CuerpoConsulta>
        </Bloque>
        <Bloque titulo="Quién anula" accion={<BotonTabla visible={!!tablas.anuladores} alAlternar={() => alternar('anuladores')} />} descripcion="Usuario de SIESA que hizo la anulación" ayuda={{ fuente: 'Usuario que anula el RC en SIESA.', formula: 'Conteo y Σ valor de RC anulados por usuario.' }}>
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.anulaciones.por_quien_anula.length === 0} mensajeVacio="Sin anulaciones en el periodo" altura="h-40">
<BarrasH datos={d.anulaciones.por_quien_anula.map(a => ({ nombre: recortar(a.nombre), valor: a.cantidad }))} formato={entero} nombreValor="Anulaciones" color={PALETA[5]} />
          {tablas.anuladores && (
            <Tabla
              columnas={[
                { titulo: 'Usuario', celda: (a) => <span className="font-medium text-foreground">{a.nombre}</span> },
                { titulo: 'Anulaciones', alinear: 'der', celda: (a) => entero(a.cantidad) },
                { titulo: 'Valor', alinear: 'der', celda: (a) => dinero(a.valor) },
              ]}
              filas={d.anulaciones.por_quien_anula}
              clave={(a) => a.usuario}
            />
          )}
          </CuerpoConsulta>
        </Bloque>
      </Malla>

      </>}
      {activa === 'conductores' && <>
      <Malla columnas={2}>
        <Bloque titulo="Conductores: cobro de cartera" descripcion="Los 10 que más recaudaron en la app" ayuda={{ fuente: 'RC creados por conductores en la app.', formula: 'Σ cobro de cartera por conductor.' }}>
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={conductoresPorRecaudo.length === 0} mensajeVacio="Sin recibos de conductores en el periodo" altura="h-48">
            <BarrasH datos={conductoresPorRecaudo.map((c) => ({ nombre: recortar(c.nombre), valor: c.recaudo }))} formato={dinero} nombreValor="Recaudo" color={PALETA[1]} anchoEtiqueta={150} />
          </CuerpoConsulta>
        </Bloque>
        <Bloque titulo="Conductores: carga cobrada" descripcion="Kilos de las facturas que cobró cada conductor" ayuda={{ fuente: 'Facturas cruzadas con RC de conductores.', formula: 'Σ kg de facturas cobradas por conductor.' }}>
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={conductoresPorKg.length === 0} mensajeVacio="Sin carga registrada en el periodo" altura="h-48">
            <BarrasH datos={conductoresPorKg.map((c) => ({ nombre: recortar(c.nombre), valor: c.kg }))} formato={kilos} nombreValor="Carga" color={PALETA[4]} anchoEtiqueta={150} />
          </CuerpoConsulta>
        </Bloque>
      </Malla>

      <Bloque titulo="Detalle por conductor" accion={<BotonTabla visible={!!tablas.conductores} alAlternar={() => alternar('conductores')} />} descripcion="Recibos hechos desde la app" ayuda={{ fuente: 'RC de la app cruzados con facturas SIESA.', formula: 'Conteos y sumas de recaudo, descuentos y carga por conductor.' }}>
        <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.conductores.length === 0} mensajeVacio="Sin recibos de conductores en el periodo" altura="h-40">
          <BarrasApiladasH
            datos={d.conductores.slice(0, 12).map(c => ({ nombre: recortar(c.nombre), efectivo: c.efectivo, otros: Math.max(0, c.recaudo - c.efectivo) }))}
            series={[{ clave: 'efectivo', nombre: 'Efectivo', color: PALETA[1] }, { clave: 'otros', nombre: 'Otros medios', color: PALETA[0] }]}
            formato={dinero}
          />
          {tablas.conductores && (
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
          )}
        </CuerpoConsulta>
      </Bloque>

      </>}
      {activa === 'clientes' && <>
      <Malla columnas={2}>
        <Bloque titulo="Clientes que más pagan" descripcion="Top 10 por valor de facturas cobradas" ayuda={{ fuente: 'Facturas cruzadas con RC del periodo.', formula: 'Σ valor de facturas cobradas por cliente.' }}>
          <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.clientes.length === 0} altura="h-48">
            <ClientesDispersion datos={d.clientes.filter(c => c.dias_promedio_pago != null).map(c => ({ nombre: c.cliente, dias: c.dias_promedio_pago ?? 0, valor: c.valor_facturas }))} />
          </CuerpoConsulta>
        </Bloque>
        <Bloque titulo="Comportamiento de pago de esos clientes" accion={<BotonTabla visible={!!tablas.clientes} alAlternar={() => alternar('clientes')} />} descripcion="Días de pago altos = más capital de trabajo atrapado" ayuda={{ fuente: 'Cruce RC → factura por cliente.', formula: 'Σ valor cruzado y promedio de días ponderado por valor.' }}>
          {tablas.clientes && (
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
          )}
        </Bloque>
      </Malla>

      <Bloque titulo="Caja SIESA por usuario" accion={<BotonTabla visible={!!tablas.caja} alAlternar={() => alternar('caja')} />} descripcion="Recibos tecleados directamente en SIESA" ayuda={{ fuente: 'RC creados directamente en SIESA.', formula: 'Conteo y Σ recaudo por usuario; conteo de anulados.' }}>
        <CuerpoConsulta consulta={{ isLoading: false, isError: false }} vacio={d.cajeros.length === 0} altura="h-32">
<BarrasH datos={d.cajeros.map(c => ({ nombre: recortar(c.nombre), valor: c.recaudo }))} formato={dinero} nombreValor="Recaudo" color={PALETA[0]} />
          {tablas.caja && (
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
          )}
        </CuerpoConsulta>
      </Bloque>
      </>}
    </div>
    </SubPestanas>
  )
}
