import type { EspecDetalle } from './tipos'

// Qué registros hay detrás de cada tarjeta: conjunto del backend, filtros de la
// tarjeta y cómo se llega al número. Los totales al pie de la tabla coinciden
// con la tarjeta (se verificó contra la base).

const VIGENTES = ['Recibos no anulados']
const DIAS = 'Total del periodo ÷ días calendario del rango.'

export const DETALLE_RECAUDO = {
  cobroCartera: {
    titulo: 'Cobro de cartera', conjunto: 'recibos', filtros: { estado: 'vigente', cartera: 'si' },
    filtrosTexto: [...VIGENTES, 'Que cruzan facturas'],
    explicacion: 'Suma de la columna Recaudo (medios de pago) de los recibos que cruzan al menos una factura.',
  },
  facturado: {
    titulo: 'Facturado', conjunto: 'facturas',
    explicacion: 'Suma de la columna Valor neto: valor de las facturas menos las notas crédito (que aparecen restando).',
  },
  cobertura: {
    titulo: 'Cobertura de recaudo', conjunto: 'recaudo_mensual',
    explicacion: 'Cobertura = Cobro de cartera ÷ Facturado. Mes a mes está en la columna Cobertura; la tarjeta usa los totales de todo el periodo.',
  },
  diasPago: {
    titulo: 'Días promedio de pago', conjunto: 'recibos', filtros: { estado: 'vigente', con_factura: 'si' },
    filtrosTexto: [...VIGENTES, 'Con facturas cruzadas'],
    explicacion: 'Promedio ponderado: Σ(valor cruzado × días entre factura y recibo) ÷ Σ valor cruzado. El total de la columna Días de pago es ese promedio.',
  },
  descuento: {
    titulo: 'Descuento financiero', conjunto: 'recibos', filtros: { estado: 'vigente' }, filtrosTexto: VIGENTES,
    cf: { descuento_pp: { min: 0.01 } }, orden: { clave: 'descuento_pp', dir: 'desc' },
    explicacion: 'Suma de la columna Desc. pronto pago de los recibos que aplicaron descuento.',
  },
  tasaAnulacion: {
    titulo: 'Tasa de anulación', conjunto: 'recibos', filtrosTexto: ['Recibos vigentes y anulados'],
    explicacion: 'Tasa = recibos Anulados ÷ todos los recibos de esta tabla. Filtra la columna Estado para ver cada grupo.',
  },
  carga: {
    titulo: 'Carga despachada', conjunto: 'facturas',
    explicacion: 'Suma de la columna Kilos: ítems de inventario facturados (cantidad × peso unitario) menos devoluciones por notas crédito.',
  },
  ticket: {
    titulo: 'Ticket promedio', conjunto: 'recibos', filtros: { estado: 'vigente', cartera: 'si' }, filtrosTexto: [...VIGENTES, 'Que cruzan facturas'],
    explicacion: 'Cobro de cartera ÷ recibos de cartera. El tablero divide entre todos los recibos con valor de facturas distinto de cero (incluye algunos con valor negativo), por eso puede diferir un poco del promedio de esta tabla.',
  },
  efectivo: {
    titulo: 'Efectivo del recaudo', conjunto: 'recibos', filtros: { estado: 'vigente' }, filtrosTexto: VIGENTES,
    explicacion: 'Efectivo ÷ recaudo total: divide los totales de las columnas Efectivo y Recaudo al pie.',
  },
  app: {
    titulo: 'Recaudado por la app', conjunto: 'recibos', filtros: { estado: 'vigente' }, filtrosTexto: VIGENTES,
    cf: { origen: { v: ['APP'] } },
    explicacion: 'Recaudo de los recibos hechos en la app ÷ recaudo total vigente. Se muestran los de la app; quita el filtro de Origen para ver el total.',
  },
  recaudoDiario: {
    titulo: 'Recaudo diario', conjunto: 'recibos', filtros: { estado: 'vigente' }, filtrosTexto: VIGENTES,
    explicacion: `Recaudo total (columna Recaudo al pie) ÷ días calendario del periodo. ${DIAS}`,
  },
  recibosDia: {
    titulo: 'Recibos por día', conjunto: 'recibos', filtros: { estado: 'vigente' }, filtrosTexto: VIGENTES,
    explicacion: 'Cantidad de recibos (total de registros) ÷ días calendario del periodo.',
  },
  valorAnulado: {
    titulo: 'Valor anulado', conjunto: 'recibos', filtros: { estado: 'anulado' }, filtrosTexto: ['Recibos anulados'],
    explicacion: 'Suma de la columna Valor del recibo de los recibos anulados. Incluye quién los anuló y el motivo.',
  },
  mejorMes: {
    titulo: 'Mes de mayor recaudo', conjunto: 'recaudo_mensual', orden: { clave: 'recaudo', dir: 'desc' },
    explicacion: 'Mes con el mayor Recaudo total (recaudo SIESA + recaudo de la app).',
  },
} satisfies Record<string, EspecDetalle>

const VENTA_NETA = 'Suma de la columna Venta: movimientos de inventario de facturas y remisiones, menos notas crédito y devoluciones.'

export const DETALLE_VENTAS = {
  venta: { titulo: 'Venta del periodo', conjunto: 'ventas', explicacion: VENTA_NETA },
  meta: {
    titulo: 'Meta del periodo', conjunto: 'ventas_lineas',
    explicacion: 'Meta del presupuesto de comercial = meta mensual × proporción de cada mes que cae en el periodo. Abajo, la meta de cada línea.',
  },
  cumplimiento: {
    titulo: 'Cumplimiento', conjunto: 'ventas_asesores',
    explicacion: 'Venta de los asesores con presupuesto ÷ su meta del periodo. Cada asesor tiene su cumplimiento; los de "Sin presupuesto" no tienen meta.',
  },
  metaGerencia: {
    titulo: 'Meta de gerencia', conjunto: 'ventas_asesores', orden: { clave: 'meta_gerencia', dir: 'desc' },
    explicacion: 'Meta de gerencia por asesor (columna Meta de gerencia) y el cumplimiento contra ella.',
  },
  proyeccion: (mes?: string): EspecDetalle => ({
    titulo: 'Proyección de cierre del mes', conjunto: 'ventas_diaria',
    filtrosTexto: mes ? [`Mes en curso: ${mes}`] : undefined,
    cf: mes ? { fecha: { min: `${mes}-01`, max: `${mes}-31` } } : undefined,
    explicacion: 'Proyección = venta acumulada del mes ÷ días transcurridos × días del mes. Abajo, la venta de cada día del mes.',
  }),
  kilos: {
    titulo: 'Kilos de líneas con meta', conjunto: 'ventas_lineas', orden: { clave: 'kg', dir: 'desc' },
    explicacion: 'Kilos vendidos de las líneas cuya meta se mide en kilos, contra su meta en kilos.',
  },
  clientes: {
    titulo: 'Clientes con compra', conjunto: 'ventas_clientes', cf: { venta: { min: 0.01 } }, filtrosTexto: undefined,
    explicacion: 'Clientes con venta neta mayor a cero en el periodo.',
  },
  ticket: {
    titulo: 'Ticket promedio', conjunto: 'ventas', filtros: { agrupar: 'documento' },
    explicacion: 'Ticket = venta total ÷ documentos (facturas y remisiones, sin notas). Esta tabla agrupa los ítems por documento; las notas crédito también aparecen y restan de la venta total.',
  },
  ventaDiaria: {
    titulo: 'Venta promedio diaria', conjunto: 'ventas_diaria',
    explicacion: 'Venta total (columna Venta al pie) ÷ días calendario del periodo.',
  },
  ventaNecesaria: {
    titulo: 'Venta diaria necesaria', conjunto: 'ventas_mensual',
    explicacion: 'Lo que falta para llegar a la meta (Meta − Venta) repartido en los días que quedan del periodo. Mes a mes se ve cuánto se lleva contra su meta.',
  },
  vendedoresMeta: {
    titulo: 'Vendedores en meta', conjunto: 'ventas_asesores', orden: { clave: 'cumplimiento', dir: 'desc' },
    explicacion: 'Asesores con presupuesto cuyo cumplimiento es 100 % o más, entre los que tienen meta.',
  },
  lineasMeta: {
    titulo: 'Líneas en meta', conjunto: 'ventas_lineas', orden: { clave: 'cumplimiento', dir: 'desc' },
    explicacion: 'Líneas de proveedor cuyo cumplimiento es 100 % o más, entre las que tienen meta.',
  },
  crecimiento: {
    titulo: 'Crecimiento anual', conjunto: 'ventas_mensual',
    explicacion: 'Venta del periodo contra la venta del mismo periodo del año anterior; mes a mes está en la columna Crecimiento anual.',
  },
  precioKg: {
    titulo: 'Precio promedio por kg', conjunto: 'ventas_lineas', orden: { clave: 'valor_kg', dir: 'desc' },
    explicacion: 'Venta ÷ kilos de las líneas que se miden en kilos; columna Precio por kg.',
  },
  centro: (id: string, nombre: string): EspecDetalle => ({
    titulo: `Venta del C.O. ${id} · ${nombre}`, conjunto: 'ventas', filtros: { co: id }, filtrosTexto: [`C.O. ${id}`],
    explicacion: `${VENTA_NETA} Solo el centro de operación ${id}, asignado como lo hace comercial.`,
  }),
} satisfies Record<string, EspecDetalle | ((...args: never[]) => EspecDetalle)>

export const DETALLE_PROVEEDORES = {
  venta: { titulo: 'Venta total', conjunto: 'ventas', explicacion: VENTA_NETA },
  proveedores: {
    titulo: 'Proveedores con venta', conjunto: 'ventas_proveedores', cf: { venta: { min: 0.01 } },
    explicacion: 'Proveedores con venta mayor a cero. Se listan los 30 mayores y el resto se agrupa en "OTROS PROVEEDORES".',
  },
  participacion: {
    titulo: 'Participación del proveedor #1', conjunto: 'ventas_proveedores', orden: { clave: 'venta', dir: 'desc' },
    explicacion: 'Venta del proveedor con más venta ÷ venta total (columna Participación).',
  },
  top5: {
    titulo: 'Concentración top 5', conjunto: 'ventas_proveedores', orden: { clave: 'venta', dir: 'desc' },
    explicacion: 'Suma de la participación de los cinco proveedores con más venta.',
  },
  variacion: {
    titulo: 'Variación vs periodo anterior', conjunto: 'ventas_proveedores',
    explicacion: 'Venta del periodo contra el periodo inmediatamente anterior de igual duración; columnas Variación y Diferencia.',
  },
  crecieronCayeron: {
    titulo: 'Crecieron / cayeron', conjunto: 'ventas_proveedores', orden: { clave: 'diferencia', dir: 'desc' },
    explicacion: 'Proveedores cuya venta subió (Diferencia positiva) o bajó (negativa) frente al periodo anterior.',
  },
  mayorCrecimiento: {
    titulo: 'Mayor crecimiento', conjunto: 'ventas_proveedores', orden: { clave: 'variacion', dir: 'desc' },
    explicacion: 'Proveedores ordenados por su variación frente al periodo anterior, de mayor a menor.',
  },
  mayorCaida: {
    titulo: 'Mayor caída', conjunto: 'ventas_proveedores', orden: { clave: 'variacion', dir: 'asc' },
    explicacion: 'Proveedores ordenados por su variación frente al periodo anterior, de la mayor caída hacia arriba.',
  },
  hhi: {
    titulo: 'Concentración HHI', conjunto: 'ventas_proveedores', orden: { clave: 'participacion', dir: 'desc' },
    explicacion: 'Índice Herfindahl-Hirschman = Σ (participación en %)² de cada proveedor. Por encima de 2.500 es un mercado muy concentrado.',
  },
  ventaCliente: {
    titulo: 'Venta por cliente', conjunto: 'ventas_clientes', cf: { venta: { min: 0.01 } },
    explicacion: 'Venta total ÷ clientes con compra. Abajo, la venta de cada cliente.',
  },
} satisfies Record<string, EspecDetalle>

export const DETALLE_COMPRAS = {
  neta: {
    titulo: 'Compra neta', conjunto: 'compras',
    explicacion: 'Suma de la columna Compra neta: entradas de almacén menos devoluciones a proveedor.',
  },
  devoluciones: {
    titulo: 'Devoluciones', conjunto: 'compras', filtros: { clase: 'Devolución' }, filtrosTexto: ['Solo devoluciones'],
    explicacion: 'Suma de la columna Devolución. La tasa es devoluciones ÷ compras brutas.',
  },
  proveedores: {
    titulo: 'Proveedores con compra', conjunto: 'compras_proveedores', cf: { compra_neta: { min: 0.01 } },
    explicacion: 'Proveedores con compra neta mayor a cero.',
  },
  documentos: {
    titulo: 'Documentos de entrada', conjunto: 'compras', filtros: { clase: 'Compra', agrupar: 'documento' }, filtrosTexto: ['Solo entradas de almacén'],
    explicacion: 'Un registro por entrada de almacén (EA y EAF). Las devoluciones (NP) no cuentan.',
  },
  top5: {
    titulo: 'Concentración top 5', conjunto: 'compras_proveedores', orden: { clave: 'compra_neta', dir: 'desc' },
    explicacion: 'Suma de la participación de los cinco proveedores con más compra neta.',
  },
  kg: {
    titulo: 'Kg comprados', conjunto: 'compras',
    explicacion: 'Suma de la columna Kilos: cantidad × peso unitario de los ítems de inventario, menos devoluciones.',
  },
} satisfies Record<string, EspecDetalle>

export const DETALLE_PEDIDOS = {
  pedidos: {
    titulo: 'Pedidos de los últimos 10 días', conjunto: 'pedidos',
    explicacion: 'Cantidad de pedidos (total de registros), de todos los C.O. y en todos los estados. SIESA entrega solo los últimos 10 días, no únicamente los de hoy.',
  },
  ventasPos: {
    titulo: 'Ventas POS de hoy', conjunto: 'ventas_pos',
    explicacion: 'Suma de la columna Valor neto de las facturas POS aprobadas de hoy, menos devoluciones. No incluye las ventas de despacho ni de comercial.',
  },
  clientes: {
    titulo: 'Clientes', conjunto: 'clientes',
    explicacion: 'Cantidad de terceros marcados como cliente en SIESA, activos e inactivos (total de registros).',
  },
  productos: {
    titulo: 'Productos', conjunto: 'productos',
    explicacion: 'Cantidad de ítems del maestro de SIESA, de todos los tipos y estados (total de registros).',
  },
  estado: (estado: string): EspecDetalle => ({
    titulo: `Pedidos en estado: ${estado}`, conjunto: 'pedidos', filtros: { estado }, filtrosTexto: [`Estado: ${estado}`],
    explicacion: 'Pedidos de los últimos 10 días en este estado, de todos los C.O.',
  }),
} satisfies Record<string, EspecDetalle | ((...args: never[]) => EspecDetalle)>
