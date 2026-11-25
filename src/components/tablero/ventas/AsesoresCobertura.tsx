import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Briefcase,
  Search,
  ShoppingBag,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react'
import { Bloque, Malla, SubPestanas, Tabla, Tarjeta } from '../comun'
import { BarrasApiladasH, Dona } from '../graficas'
import { Lectura } from '../Guia'
import { PALETA, dinero, entero, porcentaje } from '../formato'
import type {
  AsesorCobertura,
  ClienteAsesor,
  DashboardAsesores,
  EstadoClienteAsesor,
} from './tipos'

const FUENTE_ASESORES =
  'Clientes activos en SIESA (t201) y su vendedor asignado (t210), agrupado por tercero del vendedor. Facturas del periodo (FCE, BQE, FM, FC, FV, C01) sin IVA. Excluye genéricos 0001 (DISTRIBUCIONES SYE) y 9897 (VENTAS CORPORATIVAS).'

const COLOR_ESTADO = {
  asesor: PALETA[1],
  otro: PALETA[2],
  sin_compra: PALETA[5],
} as const

const PRIORIDAD_ESTADO: Record<EstadoClienteAsesor, number> = {
  sin_compra: 0,
  otro: 1,
  asesor: 2,
}

const ETIQUETA_ESTADO: Record<EstadoClienteAsesor, string> = {
  asesor: 'Le compró',
  otro: 'Compró a otro',
  sin_compra: 'Sin compra',
}

const BADGE_ESTADO: Record<EstadoClienteAsesor, string> = {
  asesor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  otro: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  sin_compra: 'bg-red-500/15 text-red-700 dark:text-red-300',
}

const recortar = (texto: string, max = 22) =>
  texto.length > max ? `${texto.slice(0, max - 1)}…` : texto

function colorTextoCobertura(cobertura: number) {
  if (cobertura >= 0.8) return 'font-semibold text-emerald-600 dark:text-emerald-400'
  if (cobertura >= 0.5) return 'font-semibold text-amber-600 dark:text-amber-400'
  return 'font-semibold text-red-600 dark:text-red-400'
}

function tonoCobertura(cobertura: number): 'ok' | 'aviso' | 'err' {
  if (cobertura >= 0.8) return 'ok'
  if (cobertura >= 0.5) return 'aviso'
  return 'err'
}

function mesesDesde(fechaIso: string, hastaIso: string): number {
  const [ay, am, ad] = fechaIso.split('-').map(Number)
  const [hy, hm, hd] = hastaIso.split('-').map(Number)
  let meses = (hy - ay) * 12 + (hm - am)
  if (hd < ad) meses -= 1
  return Math.max(0, meses)
}

function textoHaceMeses(fechaIso: string, hastaIso: string): string {
  const meses = mesesDesde(fechaIso, hastaIso)
  if (meses === 0) return 'hace menos de 1 mes'
  if (meses === 1) return 'hace 1 mes'
  return `hace ${entero(meses)} meses`
}

function fechaCorta(fechaIso: string): string {
  return `${fechaIso.slice(8, 10)}/${fechaIso.slice(5, 7)}/${fechaIso.slice(0, 4)}`
}

function ordenarClientesPorDefecto(a: ClienteAsesor, b: ClienteAsesor): number {
  const diffGrupo = PRIORIDAD_ESTADO[a.estado] - PRIORIDAD_ESTADO[b.estado]
  if (diffGrupo !== 0) return diffGrupo

  if (a.estado === 'sin_compra') {
    // Quienes nunca han comprado o llevan más tiempo sin comprar van primero.
    if (a.ultima_compra_historica == null && b.ultima_compra_historica != null) return -1
    if (a.ultima_compra_historica != null && b.ultima_compra_historica == null) return 1
    if (a.ultima_compra_historica && b.ultima_compra_historica) {
      const cmp = a.ultima_compra_historica.localeCompare(b.ultima_compra_historica)
      if (cmp !== 0) return cmp
    }
    return a.cliente.localeCompare(b.cliente, 'es')
  }

  return b.venta_total - a.venta_total || a.cliente.localeCompare(b.cliente, 'es')
}

export function AsesoresCobertura({
  d,
  sub,
  alElegirSub,
}: {
  d: DashboardAsesores
  sub: string
  alElegirSub: (valor: string) => void
}) {
  const [parametros, setParametros] = useSearchParams()
  const opciones = [
    { valor: 'resumen', etiqueta: 'General' },
    { valor: 'asesor', etiqueta: 'Por asesor' },
  ]
  const activa = opciones.some(o => o.valor === sub) ? sub : 'resumen'

  const asesorParam = Number(parametros.get('asesor'))
  const asesorActivo: AsesorCobertura | null = useMemo(
    () => d.asesores.find(a => a.rowid === asesorParam) ?? d.asesores[0] ?? null,
    [d.asesores, asesorParam]
  )

  const abrirAsesor = (rowid: number) => {
    setParametros(actuales => {
      const siguientes = new URLSearchParams(actuales)
      siguientes.set('sub', 'asesor')
      siguientes.set('asesor', String(rowid))
      return siguientes
    })
  }

  const cambiarAsesor = (rowid: number) => {
    setParametros(actuales => {
      const siguientes = new URLSearchParams(actuales)
      siguientes.set('asesor', String(rowid))
      return siguientes
    })
  }

  return (
    <SubPestanas opciones={opciones} activa={activa} alElegir={alElegirSub}>
      <div className="flex flex-col gap-4">
        {activa === 'resumen' && <VistaGeneral d={d} alAbrirAsesor={abrirAsesor} />}
        {activa === 'asesor' && (
          <VistaPorAsesor
            d={d}
            asesor={asesorActivo}
            alCambiarAsesor={cambiarAsesor}
          />
        )}
      </div>
    </SubPestanas>
  )
}

function VistaGeneral({
  d,
  alAbrirAsesor,
}: {
  d: DashboardAsesores
  alAbrirAsesor: (rowid: number) => void
}) {
  const k = d.kpis
  const pctSinCompra = k.asignados > 0 ? k.sin_compra / k.asignados : 0

  const datosDona = [
    { nombre: 'Le compró a su asesor', valor: k.con_compra_asesor, color: COLOR_ESTADO.asesor },
    { nombre: 'Compró a otro vendedor', valor: k.con_compra_otro, color: COLOR_ESTADO.otro },
    { nombre: 'No compró', valor: k.sin_compra, color: COLOR_ESTADO.sin_compra },
  ].filter(p => p.valor > 0)

  const datosBarras = d.asesores.map(a => ({
    nombre: recortar(a.nombre, 20),
    asesor: a.con_compra_asesor,
    otro: a.con_compra_otro,
    sin_compra: a.sin_compra,
  }))

  return (
    <>
      <Lectura
        frases={[
          <>
            Hay <strong className="text-foreground">{entero(k.asesores)} asesores</strong> con{' '}
            <strong className="text-foreground">{entero(k.asignados)} clientes asignados</strong>. En el periodo se le
            vendió a <strong className="text-foreground">{entero(k.con_compra)} ({porcentaje(k.cobertura, 0)})</strong>:{' '}
            <strong className="text-foreground">{entero(k.con_compra_asesor)}</strong> le compraron a su propio asesor
            y <strong className="text-foreground">{entero(k.con_compra_otro)}</strong> compraron, pero a otro vendedor.{' '}
            <strong className="text-foreground">{entero(k.sin_compra)} ({porcentaje(pctSinCompra, 0)})</strong> no
            compraron nada.
          </>,
          <>
            Además, <strong className="text-foreground">{entero(k.clientes_sin_asesor)} clientes activos</strong> no
            tienen asesor propio (están en DISTRIBUCIONES SYE o sin vendedor) y no entran en esta cuenta.
          </>,
        ]}
      />

      <Malla columnas={4}>
        <Tarjeta
          etiqueta="Asesores"
          valor={entero(k.asesores)}
          nota={`Venta a asignados: ${dinero(k.venta_asignados)}`}
          tono="marca"
          icono={Users}
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Terceros vendedores distintos con al menos un cliente activo asignado',
          }}
        />
        <Tarjeta
          etiqueta="Clientes asignados"
          valor={entero(k.asignados)}
          nota={`${entero(k.clientes_sin_asesor)} sin asesor propio`}
          tono="info"
          icono={UserCheck}
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Suma de pares únicos (asesor, cliente activo) en SIESA',
            nota: 'Si un cliente tiene sucursales con distintos asesores, cuenta en cada uno.',
          }}
        />
        <Tarjeta
          etiqueta="Clientes con compra"
          valor={porcentaje(k.cobertura)}
          nota={`${entero(k.con_compra)} de ${entero(k.asignados)} clientes`}
          tono={tonoCobertura(k.cobertura)}
          icono={ShoppingBag}
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Clientes asignados que tuvieron factura en el periodo ÷ total asignados',
            nota: `${entero(k.con_compra_asesor)} compraron a su asesor y ${entero(k.con_compra_otro)} a otro vendedor.`,
          }}
        />
        <Tarjeta
          etiqueta="Sin compra"
          valor={entero(k.sin_compra)}
          nota={`${entero(k.sin_compra)} clientes (${porcentaje(pctSinCompra)})`}
          tono={k.sin_compra === 0 ? 'ok' : k.cobertura < 0.5 ? 'err' : 'aviso'}
          icono={UserX}
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Clientes asignados sin facturas registradas en el rango elegido',
          }}
        />
      </Malla>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Bloque
          titulo="Estado de clientes asignados"
          descripcion={`${entero(k.asignados)} asignados en total`}
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Reparto entre compra al asesor asignado, compra a otro vendedor y sin compra',
          }}
        >
          <Dona datos={datosDona} formato={entero} />
        </Bloque>

        <Bloque
          className="lg:col-span-2"
          titulo="Cobertura por asesor"
          descripcion="Clientes ordenados por tamaño de cartera asignada"
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Cantidad de clientes por estado para cada asesor',
          }}
        >
          {datosBarras.length > 0 ? (
            <BarrasApiladasH
              datos={datosBarras}
              series={[
                { clave: 'asesor', nombre: 'Le compró a su asesor', color: COLOR_ESTADO.asesor },
                { clave: 'otro', nombre: 'Compró a otro vendedor', color: COLOR_ESTADO.otro },
                { clave: 'sin_compra', nombre: 'No compró', color: COLOR_ESTADO.sin_compra },
              ]}
              formato={entero}
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Sin asesores con clientes asignados</p>
          )}
        </Bloque>
      </div>

      <Bloque
        titulo="Detalle por asesor"
        descripcion="Haz clic en el nombre de un asesor para ver la lista de sus clientes"
        ayuda={{
          fuente: FUENTE_ASESORES,
          formula: '% cobertura = con compra ÷ asignados · Venta fuera = ventas a clientes no asignados',
          nota: 'La suma de los asesores cuadra con los totales globales.',
        }}
      >
        <Tabla
          filas={d.asesores}
          clave={a => a.rowid}
          pie={`Total · ${entero(k.asignados)} asignados · ${entero(k.con_compra)} con compra (${porcentaje(k.cobertura)}) · ${dinero(k.venta_asignados)} a asignados · ${dinero(k.venta_asesor_fuera)} fuera de cartera`}
          columnas={[
            {
              titulo: 'Asesor',
              celda: a => (
                <div>
                  <button
                    type="button"
                    onClick={() => alAbrirAsesor(a.rowid)}
                    className="cursor-pointer text-left font-semibold text-primary hover:underline"
                  >
                    {a.nombre}
                  </button>
                  {a.codigos && (
                    <span className="block text-[11px] text-muted-foreground">
                      Cód. {a.codigos}
                    </span>
                  )}
                </div>
              ),
            },
            { titulo: 'Asignados', alinear: 'der', celda: a => entero(a.asignados) },
            { titulo: 'Con compra', alinear: 'der', celda: a => entero(a.con_compra) },
            {
              titulo: '% cobertura',
              alinear: 'der',
              celda: a => (
                <span className={colorTextoCobertura(a.cobertura)}>
                  {porcentaje(a.cobertura)}
                </span>
              ),
            },
            { titulo: 'A su asesor', alinear: 'der', celda: a => entero(a.con_compra_asesor) },
            { titulo: 'A otro', alinear: 'der', celda: a => entero(a.con_compra_otro) },
            { titulo: 'Sin compra', alinear: 'der', celda: a => entero(a.sin_compra) },
            { titulo: 'Venta a asignados', alinear: 'der', celda: a => dinero(a.venta_asignados) },
            {
              titulo: 'Venta fuera de su cartera',
              alinear: 'der',
              celda: a => (
                <span>
                  {dinero(a.venta_fuera)}
                  {a.clientes_fuera > 0 && (
                    <span className="block text-[11px] text-muted-foreground">
                      {entero(a.clientes_fuera)} {a.clientes_fuera === 1 ? 'cliente' : 'clientes'}
                    </span>
                  )}
                </span>
              ),
            },
          ]}
        />
      </Bloque>
    </>
  )
}

function VistaPorAsesor({
  d,
  asesor,
  alCambiarAsesor,
}: {
  d: DashboardAsesores
  asesor: AsesorCobertura | null
  alCambiarAsesor: (rowid: number) => void
}) {
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoClienteAsesor>('todos')
  const [busqueda, setBusqueda] = useState('')

  const clientesAsesor = useMemo(() => {
    if (!asesor) return []
    return d.clientes
      .filter(c => c.asesor_rowid === asesor.rowid)
      .sort(ordenarClientesPorDefecto)
  }, [d.clientes, asesor])

  const hayCiudad = useMemo(
    () => clientesAsesor.some(c => Boolean(c.ciudad)),
    [clientesAsesor]
  )

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return clientesAsesor.filter(c => {
      if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false
      if (!q) return true
      return c.cliente.toLowerCase().includes(q) || c.nit.toLowerCase().includes(q)
    })
  }, [clientesAsesor, filtroEstado, busqueda])

  if (!asesor) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No hay asesores con clientes asignados en SIESA.
      </p>
    )
  }

  const datosDona = [
    { nombre: 'Le compró a su asesor', valor: asesor.con_compra_asesor, color: COLOR_ESTADO.asesor },
    { nombre: 'Compró a otro vendedor', valor: asesor.con_compra_otro, color: COLOR_ESTADO.otro },
    { nombre: 'No compró', valor: asesor.sin_compra, color: COLOR_ESTADO.sin_compra },
  ].filter(p => p.valor > 0)

  const botonesFiltro: { valor: 'todos' | EstadoClienteAsesor; etiqueta: string; cantidad: number }[] = [
    { valor: 'todos', etiqueta: 'Todos', cantidad: asesor.asignados },
    { valor: 'asesor', etiqueta: 'Le compró', cantidad: asesor.con_compra_asesor },
    { valor: 'otro', etiqueta: 'Compró a otro', cantidad: asesor.con_compra_otro },
    { valor: 'sin_compra', etiqueta: 'Sin compra', cantidad: asesor.sin_compra },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3.5">
        <label className="flex flex-wrap items-center gap-2.5 text-sm font-medium text-foreground">
          <span>Asesor:</span>
          <select
            value={asesor.rowid}
            onChange={e => alCambiarAsesor(Number(e.target.value))}
            className="h-10 min-w-[260px] rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-primary"
          >
            {d.asesores.map(a => (
              <option key={a.rowid} value={a.rowid}>
                {a.nombre} ({entero(a.asignados)} asignados · {porcentaje(a.cobertura, 0)})
              </option>
            ))}
          </select>
        </label>
        {asesor.codigos && (
          <span className="text-xs text-muted-foreground">
            Códigos SIESA: <strong className="font-mono text-foreground">{asesor.codigos}</strong>
          </span>
        )}
      </div>

      <Lectura
        frases={[
          <>
            <strong className="text-foreground">{asesor.nombre}</strong> tiene{' '}
            <strong className="text-foreground">{entero(asesor.asignados)} clientes asignados</strong>. En el periodo
            se le vendió a{' '}
            <strong className="text-foreground">{entero(asesor.con_compra)} ({porcentaje(asesor.cobertura, 0)})</strong>:{' '}
            <strong className="text-foreground">{entero(asesor.con_compra_asesor)}</strong> le compraron a{' '}
            <strong className="text-foreground">{asesor.nombre}</strong>,{' '}
            <strong className="text-foreground">{entero(asesor.con_compra_otro)}</strong> compraron a otro vendedor y{' '}
            <strong className="text-foreground">{entero(asesor.sin_compra)}</strong> no compraron nada.
          </>,
          ...(asesor.clientes_fuera > 0
            ? [
                <>
                  Fuera de su cartera asignada le vendió{' '}
                  <strong className="text-foreground">{dinero(asesor.venta_fuera)}</strong> a{' '}
                  <strong className="text-foreground">
                    {entero(asesor.clientes_fuera)} {asesor.clientes_fuera === 1 ? 'cliente' : 'clientes'}
                  </strong>
                  .
                </>,
              ]
            : []),
        ]}
      />

      <Malla columnas={6}>
        <Tarjeta
          compacta
          etiqueta="Clientes asignados"
          valor={entero(asesor.asignados)}
          nota={asesor.codigos ? `Cód. ${asesor.codigos}` : undefined}
          tono="info"
          icono={Users}
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Clientes activos distintos asignados a cualquiera de los códigos del asesor',
          }}
        />
        <Tarjeta
          compacta
          etiqueta="Con compra"
          valor={porcentaje(asesor.cobertura)}
          nota={`${entero(asesor.con_compra)} de ${entero(asesor.asignados)}`}
          tono={tonoCobertura(asesor.cobertura)}
          icono={ShoppingBag}
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Clientes asignados con compra en el periodo ÷ clientes asignados',
          }}
        />
        <Tarjeta
          compacta
          etiqueta="Le compraron a su asesor"
          valor={entero(asesor.con_compra_asesor)}
          nota={`${porcentaje(asesor.cobertura_asesor)} de su cartera`}
          tono="ok"
          icono={UserCheck}
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Clientes asignados con facturas registradas con su asesor asignado',
          }}
        />
        <Tarjeta
          compacta
          etiqueta="Sin compra"
          valor={entero(asesor.sin_compra)}
          nota={`${entero(asesor.con_compra_otro)} compraron a otro`}
          tono={asesor.sin_compra === 0 ? 'ok' : asesor.cobertura < 0.5 ? 'err' : 'aviso'}
          icono={UserX}
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Clientes asignados sin facturas en el rango elegido',
          }}
        />
        <Tarjeta
          compacta
          etiqueta="Venta a sus clientes"
          valor={dinero(asesor.venta_asignados)}
          nota={`Propia: ${dinero(asesor.venta_asesor_asignados)}`}
          tono="marca"
          icono={Briefcase}
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Σ venta total de los clientes asignados (incluye lo que vendieron otros asesores)',
            nota: 'La línea inferior muestra solo las líneas facturadas por este asesor.',
          }}
        />
        <Tarjeta
          compacta
          etiqueta="Venta fuera de su cartera"
          valor={dinero(asesor.venta_fuera)}
          nota={`${entero(asesor.clientes_fuera)} ${asesor.clientes_fuera === 1 ? 'cliente' : 'clientes'} no asignados`}
          tono="neutro"
          icono={UserPlus}
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Σ venta del asesor a clientes que no están asignados a él en SIESA',
          }}
        />
      </Malla>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Bloque
          titulo="Distribución de su cartera"
          descripcion={`${entero(asesor.asignados)} clientes asignados`}
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Clientes del asesor repartidos por estado en el periodo',
          }}
        >
          <Dona datos={datosDona} formato={entero} />
        </Bloque>

        <Bloque
          className="lg:col-span-2"
          titulo="Clientes asignados"
          descripcion="Ordenados primero por quienes llevan más tiempo sin comprar"
          ayuda={{
            fuente: FUENTE_ASESORES,
            formula: 'Última compra histórica = fecha más reciente de factura hasta el fin del periodo',
            nota: 'Los clientes con estado "Compró a otro" muestran quién les vendió más en el periodo.',
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1" role="group" aria-label="Filtrar por estado">
              {botonesFiltro.map(b => (
                <button
                  key={b.valor}
                  type="button"
                  onClick={() => setFiltroEstado(b.valor)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    filtroEstado === b.valor
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {b.etiqueta} <span className="opacity-70">({entero(b.cantidad)})</span>
                </button>
              ))}
            </div>
            <label className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 size-3.5 text-muted-foreground" />
              <input
                type="search"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o NIT…"
                className="h-9 w-60 rounded-xl border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
              />
            </label>
          </div>

          {clientesFiltrados.length > 0 ? (
            <Tabla
              filas={clientesFiltrados}
              clave={c => `${c.asesor_rowid}-${c.cliente_rowid}`}
              columnas={[
                {
                  titulo: 'Cliente',
                  celda: c => <span className="font-medium text-foreground">{c.cliente}</span>,
                },
                {
                  titulo: 'NIT',
                  celda: c => <span className="font-mono text-xs text-muted-foreground">{c.nit || '—'}</span>,
                },
                ...(hayCiudad
                  ? [
                      {
                        titulo: 'Ciudad',
                        secundaria: true,
                        celda: (c: ClienteAsesor) => c.ciudad || '—',
                      },
                    ]
                  : []),
                {
                  titulo: 'Estado',
                  celda: c => (
                    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${BADGE_ESTADO[c.estado]}`}>
                      {ETIQUETA_ESTADO[c.estado]}
                    </span>
                  ),
                },
                {
                  titulo: 'Venta en el periodo',
                  alinear: 'der',
                  celda: c => dinero(c.venta_total),
                },
                {
                  titulo: 'Venta de su asesor',
                  alinear: 'der',
                  celda: c => dinero(c.venta_asesor),
                },
                {
                  titulo: 'Vendió',
                  celda: c =>
                    c.estado === 'otro' ? (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        {c.otro_vendedor || 'Otro vendedor'}
                      </span>
                    ) : (
                      '—'
                    ),
                },
                {
                  titulo: 'Última compra',
                  celda: c =>
                    c.ultima_compra_historica ? (
                      <span className="whitespace-nowrap">
                        <span className="block font-medium text-foreground">
                          {fechaCorta(c.ultima_compra_historica)}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {textoHaceMeses(c.ultima_compra_historica, d.hasta)}
                        </span>
                      </span>
                    ) : (
                      <span className="font-medium text-red-600 dark:text-red-400">Nunca</span>
                    ),
                },
              ]}
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay clientes que coincidan con el filtro elegido.
            </p>
          )}
        </Bloque>
      </div>
    </>
  )
}
