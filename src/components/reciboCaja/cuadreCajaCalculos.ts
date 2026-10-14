import type { CuadreCaja, CuadreCajaDoc } from '@/api/cuadreCaja'
import type { CajaTraspaso, TrasladoFondosMov } from '@/api/types'

// Orden y nombres de la grilla "Descripción o concepto" del cuadre de SIESA (sin cheques).
export const conceptos = [
  { clave: 'VENTAS', nombre: 'Ventas del día', titulo: 'VENTAS DEL DÍA', sentido: 'I' },
  { clave: 'RECAUDOS', nombre: 'Recaudos cartera (recibos de caja)', titulo: 'RECIBOS DE CAJA (SIESA, APP Y WEB)', sentido: 'I' },
  { clave: 'OTROS_IN', nombre: 'Otros conceptos', titulo: 'OTROS CONCEPTOS', sentido: 'I' },
  { clave: 'TRASLADO_IN', nombre: 'Transferencia de fondos', titulo: 'TRANSFERENCIA DE FONDOS (ENTRADAS)', sentido: 'I' },
  { clave: 'PROVEEDORES', nombre: 'Pagos a proveedores', titulo: 'PAGOS A PROVEEDORES', sentido: 'E' },
  { clave: 'OTROS_PAGOS', nombre: 'Otros pagos realizados', titulo: 'OTROS PAGOS REALIZADOS', sentido: 'E' },
  { clave: 'CONSIGNACIONES', nombre: 'Consignaciones', titulo: 'CONSIGNACIONES', sentido: 'E' },
  { clave: 'TRASLADO_OUT', nombre: 'Transferencia de fondos', titulo: 'TRANSFERENCIA DE FONDOS (SALIDAS)', sentido: 'E' },
  { clave: 'DEVOLUCIONES', nombre: 'Devoluciones a clientes', titulo: 'DEVOLUCIONES A CLIENTES', sentido: 'E' },
] as const

/** Documentos que reciben tarjeta y la liquidan al banco en la misma línea (salen como consignación). */
export const TIPOS_LIQUIDAN_TARJETA = ['RC', 'RC1', 'BQE', 'FCE', 'FM', 'R01']

export const columnasMonto = ['efectivo', 'tarjetas', 'credito', 'consignado', 'otros', 'total'] as const
export type ColumnaMonto = (typeof columnasMonto)[number]
export type MontosCuadre = Record<ColumnaMonto, number> & { docs: number }

const cero = (): MontosCuadre => ({ efectivo: 0, tarjetas: 0, credito: 0, consignado: 0, otros: 0, total: 0, docs: 0 })

/** "2026-10-01" → "01/10/2026" */
const formatoFecha = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')

export function sumarDocumentos(documentos: CuadreCajaDoc[]): MontosCuadre {
  return documentos.reduce((acc, doc) => {
    for (const col of columnasMonto) acc[col] += Number(doc[col]) || 0
    acc.docs += 1
    return acc
  }, cero())
}

export function calcularCuadre(datos: CuadreCaja) {
  // Con un rango de fechas los rótulos dicen "del período" y no "del día".
  const unDia = datos.fecha_inicial === datos.fecha_final
  const periodo = unDia
    ? `Día ${formatoFecha(datos.fecha_inicial)}`
    : `Del ${formatoFecha(datos.fecha_inicial)} al ${formatoFecha(datos.fecha_final)}`
  const rotulo = (texto: string) => (unDia ? texto : texto.replace('del día', 'del período').replace('DEL DÍA', 'DEL PERÍODO'))
  const porConcepto = conceptos.map((concepto) => {
    const documentos = datos.documentos
      .filter((doc) => doc.concepto === concepto.clave)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.tipo.localeCompare(b.tipo) || a.numero - b.numero)
    return { ...concepto, nombre: rotulo(concepto.nombre), titulo: rotulo(concepto.titulo), documentos, montos: sumarDocumentos(documentos) }
  })
  const ingresos = sumarDocumentos(datos.documentos.filter((doc) => doc.sentido === 'I'))
  const egresos = sumarDocumentos(datos.documentos.filter((doc) => doc.sentido === 'E'))
  const flujo = cero()
  for (const col of columnasMonto) flujo[col] = ingresos[col] - egresos[col]
  // "Otros" (anticipos, cheques) solo se muestra si hubo movimiento.
  const columnas: ColumnaMonto[] = columnasMonto.filter((col) => col !== 'otros' || datos.documentos.some((d) => d.otros !== 0))
  return { porConcepto, ingresos, egresos, flujo, columnas, unDia, periodo, rotuloFlujo: rotulo('Flujo del día') }
}

export type ConceptoCalculado = ReturnType<typeof calcularCuadre>['porConcepto'][number]

const MEDIO_TRASLADO: Record<string, string> = { EFE: 'Efectivo', TD: 'T. Débito', TC: 'T. Crédito' }

/** Pone origen → destino, medio y usuario a los TC que salieron de Traslado de Fondos. */
export function enriquecerTraslados(datos: CuadreCaja, traslados: TrasladoFondosMov[], cajas: CajaTraspaso[]): CuadreCaja {
  const porRowid = new Map(traslados.filter((t) => t.rowid_docto_siesa).map((t) => [Number(t.rowid_docto_siesa), t]))
  if (porRowid.size === 0) return datos
  const nombre = (co: string, caja: string) => {
    const id = String(caja ?? '').trim()
    const encontrada = cajas.find((c) => String(c.id_caja).trim() === id && String(c.id_co).trim() === String(co).trim())
      ?? cajas.find((c) => String(c.id_caja).trim() === id)
    return (encontrada?.nombre || `Caja ${id}`).trim().toUpperCase()
  }
  return {
    ...datos,
    documentos: datos.documentos.map((doc) => {
      const t = porRowid.get(doc.rowid)
      if (!t) return doc
      const origen = nombre(t.id_co_origen, t.id_caja_origen)
      const destino = nombre(t.id_co_destino, t.id_caja_destino)
      return {
        ...doc,
        tercero: `${origen} → ${destino}`,
        nit: '',
        traslado: {
          origen,
          destino,
          medio: MEDIO_TRASLADO[t.medio_pago || 'EFE'] ?? String(t.medio_pago),
          usuario: t.usuario_nombre || '',
          motivo: t.motivo || '',
        },
      }
    }),
  }
}
