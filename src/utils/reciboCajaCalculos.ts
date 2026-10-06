import { buildRcNotas } from './rcNotasBuilder'

export interface FacturaRC { rowid: number; tipo: string; consecutivo: string; prefijo: string; saldo: number; valor: number; seleccionada: boolean; idCia: number }
export interface PagoRC { id: string; codigo: 'EFE' | 'CG1' | 'TC' | 'TD'; valor: number; cuenta: string; fechaConsignacion: string; nroTarjeta: string; autorizacion: string; vencimiento: string; voucher: string }
export interface ParametrosRC { limite: number; ajusteDescuento: number; ajusteIngreso: number; descuentoFinanciero: number; anticipo: number }
export const FALLBACK_RC: ParametrosRC = { limite: 1000, ajusteDescuento: 546, ajusteIngreso: 235, descuentoFinanciero: 697, anticipo: 193 }
export const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export const parseMonto = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const raw = String(v ?? '').trim().replace(/[^\d,.-]/g, '')
  const normal = raw.includes(',') && raw.includes('.') ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(',', '.')
  return Number(normal) || 0
}
export const elegibleDescuento = (f: FacturaRC, pp = 0) => f.seleccionada && f.valor > 0 && f.saldo > 0 && f.valor + pp >= f.saldo - 0.01
export const brutoFactura = (f: FacturaRC, aplicar: boolean, pp = 0) => aplicar && pp > 0 && f.valor < f.saldo - 0.01 && f.valor + pp >= f.saldo - 0.01 ? f.saldo : f.valor
export type TipoDiferencia = 'none' | 'ajusteDescuento' | 'ajusteIngreso' | 'anticipo' | 'faltanteExcesivo'
export function clasificarDiferencia(recibido: number, neto: number, limite: number): { tipo: TipoDiferencia; monto: number } {
  const diferencia = redondear(recibido - neto)
  if (diferencia < 0 && Math.abs(diferencia) <= limite) return { tipo: 'ajusteDescuento', monto: Math.abs(diferencia) }
  if (diferencia > 0 && diferencia <= limite) return { tipo: 'ajusteIngreso', monto: diferencia }
  if (diferencia > limite) return { tipo: 'anticipo', monto: diferencia }
  if (diferencia < -limite) return { tipo: 'faltanteExcesivo', monto: Math.abs(diferencia) }
  return { tipo: 'none', monto: 0 }
}
export function totalesRC(facturas: FacturaRC[], descuentos: Record<number, number>, aplicar: boolean, pagos: PagoRC[], limite: number) {
  const seleccionadas = facturas.filter(f => f.seleccionada && f.valor > 0)
  const subtotal = redondear(seleccionadas.reduce((s, f) => s + brutoFactura(f, aplicar, descuentos[f.rowid] ?? 0), 0))
  const descuento = aplicar ? redondear(seleccionadas.reduce((s, f) => s + (elegibleDescuento(f, descuentos[f.rowid] ?? 0) ? descuentos[f.rowid] ?? 0 : 0), 0)) : 0
  const neto = redondear(subtotal - descuento)
  const recibido = redondear(pagos.reduce((s, p) => s + p.valor, 0))
  return { subtotal, descuento, neto, recibido, diferencia: redondear(recibido - neto), clasificacion: clasificarDiferencia(recibido, neto, limite) }
}
export interface PayloadRC {
  p_cia: number; p_fecha: string; p_clase_modulo: number; p_id_co: string; p_id_tipo_docto: string; p_numero_docto: number; p_clase_docto: number; p_rowid_tercero: number; p_periodo_docto: number; p_prefijo: string; p_notas: string; p_id_caja: string; p_moneda: string; p_valor: number; p_rowid_cobrador: number; p_rowid_fe: number; p_id_un: string; p_referencia_med: string
  p_rowid_auxiliar_anticipo?: number; p_rowid_auxiliar_pp?: number; p_rowid_auxiliar_aprovecha?: number; p_tipo_aprovecha?: 'descuento' | 'ingreso'
  p_medio_pago: Array<{ p_id_medio_pago: string; p_id_cta_bancaria: string; p_valor: number; p_referencia_med: string; p_fecha_consignacion?: string; p_nro_tarjeta?: string; p_nro_autorizacion?: string; p_fecha_vcto_tarjeta?: string }>
  p_rowid_sa: Array<{ p_id: number; p_valor: number; p_tipo_docto_cruce: string; p_consec_docto_cruce: number; p_descuento_pp: number; p_aprovecha: number }>
}
export function armarPayloadRC(args: { clienteId: number; facturas: FacturaRC[]; descuentos: Record<number, number>; aplicar: boolean; pagos: PagoRC[]; parametros: ParametrosRC; observacion: string; usuario: string; co: string; caja: string; consecutivo: number; ahora: Date }): PayloadRC {
  const { clienteId, facturas, descuentos, aplicar, pagos, parametros, observacion, usuario, co, caja, consecutivo, ahora } = args
  const total = totalesRC(facturas, descuentos, aplicar, pagos, parametros.limite)
  const seleccionadas = facturas.filter(f => f.seleccionada && f.valor > 0)
  if (!clienteId || !seleccionadas.length || !observacion.trim() || !pagos.length || total.recibido <= 0 || total.clasificacion.tipo === 'faltanteExcesivo') throw new Error('Completa cliente, facturas, pagos y observación; el faltante no puede superar el límite')
  const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`
  const ref = fecha.replace(/-/g, '')
  const tipo = total.clasificacion.tipo
  const sa = seleccionadas.map((f, i) => {
    const pp = aplicar && elegibleDescuento(f, descuentos[f.rowid] ?? 0) ? descuentos[f.rowid] ?? 0 : 0
    const bruto = brutoFactura(f, aplicar, pp)
    const ajuste = (tipo === 'ajusteDescuento' || tipo === 'ajusteIngreso') && i === seleccionadas.length - 1 ? Math.min(total.clasificacion.monto, Math.max(0, bruto - pp - 0.01)) : 0
    const consecutivoFactura = Number(f.consecutivo.match(/\d+$/)?.[0] ?? 0)
    if (!f.rowid || !consecutivoFactura) throw new Error('Una factura no tiene rowid SA o consecutivo válido')
    return { p_id: f.rowid, p_valor: bruto, p_tipo_docto_cruce: f.tipo, p_consec_docto_cruce: consecutivoFactura, p_descuento_pp: pp, p_aprovecha: ajuste }
  })
  const notas = buildRcNotas({ observacion, facturas: seleccionadas.map((f, i) => ({ tipo: f.tipo, consecutivo: String(sa[i].p_consec_docto_cruce), valorRecibido: sa[i].p_valor - sa[i].p_descuento_pp, descuentoPp: sa[i].p_descuento_pp, ajusteAlPeso: sa[i].p_aprovecha })), mediosPago: pagos.map(p => ({ nombre: { EFE: 'EFECTIVO', CG1: 'TRANSFERENCIA', TC: 'T. CRÉDITO', TD: 'T. DÉBITO' }[p.codigo], valor: p.valor, voucher: p.voucher })), ajusteTipo: tipo, ajusteMonto: total.clasificacion.monto, usuario, fechaHora: ahora })
  return {
    p_cia: 1, p_fecha: `${fecha} 00:00:00`, p_clase_modulo: 2, p_id_co: co, p_id_tipo_docto: 'RC', p_numero_docto: consecutivo, p_clase_docto: 13, p_rowid_tercero: clienteId, p_periodo_docto: Number(ref.slice(0, 6)), p_prefijo: '', p_notas: notas, p_id_caja: caja, p_moneda: 'COP', p_valor: total.recibido, p_rowid_cobrador: 74, p_rowid_fe: 3, p_id_un: '99', p_referencia_med: ref,
    ...(tipo === 'anticipo' ? { p_rowid_auxiliar_anticipo: parametros.anticipo } : {}),
    ...(sa.some(s => s.p_descuento_pp > 0) ? { p_rowid_auxiliar_pp: parametros.descuentoFinanciero } : {}),
    ...(sa.some(s => s.p_aprovecha > 0) ? { p_rowid_auxiliar_aprovecha: tipo === 'ajusteDescuento' ? parametros.ajusteDescuento : parametros.ajusteIngreso, p_tipo_aprovecha: tipo === 'ajusteDescuento' ? 'descuento' as const : 'ingreso' as const } : {}),
    p_medio_pago: pagos.map(p => ({ p_id_medio_pago: p.codigo, p_id_cta_bancaria: p.codigo === 'CG1' ? p.cuenta : '', p_valor: p.valor, p_referencia_med: p.codigo === 'CG1' && p.fechaConsignacion ? '' : ref, ...(p.codigo === 'CG1' ? { p_fecha_consignacion: p.fechaConsignacion } : {}), ...(p.codigo === 'TC' || p.codigo === 'TD' ? { p_nro_tarjeta: p.nroTarjeta, p_nro_autorizacion: p.autorizacion, p_fecha_vcto_tarjeta: `${p.vencimiento}-01` } : {}) })),
    p_rowid_sa: sa,
  }
}
