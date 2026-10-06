/** Port de rc_notas_builder.dart. Orden: observación, facturas, pagos, ajuste, sello. */
export interface RcNotaFactura { tipo: string; consecutivo: string; valorRecibido: number; descuentoPp?: number; ajusteAlPeso?: number }
export interface RcNotaMedioPago { nombre: string; valor: number; voucher?: string }
export type RcNotaAjusteTipo = 'none' | 'ajusteDescuento' | 'ajusteIngreso' | 'anticipo'
const join = (parts: (string | null)[]) => parts.filter((p): p is string => !!p?.trim()).join(' | ')
export const formatRcCop = (n: number) => `$${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
const dd = (n: number) => String(n).padStart(2, '0')
const titleCase = (s: string) => s.trim().split(/\s+/).map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join(' ')
const truncate = (s: string, n: number) => s.length <= n ? s : n <= 1 ? '…' : `${s.slice(0, n - 1)}…`
export function buildRcNotas({ observacion, facturas, mediosPago, ajusteTipo, ajusteMonto, usuario, fechaHora, maxLength = 255 }: {
  observacion: string; facturas: RcNotaFactura[]; mediosPago: RcNotaMedioPago[]; ajusteTipo: RcNotaAjusteTipo
  ajusteMonto: number; usuario: string; fechaHora: Date; maxLength?: number
}): string {
  const sello = `Web ${usuario.trim() || '?'} ${dd(fechaHora.getDate())}/${dd(fechaHora.getMonth() + 1)}/${fechaHora.getFullYear()} ${dd(fechaHora.getHours())}:${dd(fechaHora.getMinutes())}`
  const labels: Record<RcNotaAjusteTipo, string> = { none: '', ajusteDescuento: 'Descuento por ajuste al peso', ajusteIngreso: 'Ingreso por ajuste al peso', anticipo: 'Anticipo cliente' }
  const ajuste = ajusteTipo === 'none' || Math.abs(ajusteMonto) < 0.005 ? null : `${labels[ajusteTipo]}: $ ${Math.abs(ajusteMonto).toFixed(2)}`
  let obs = observacion.trim()
  let facturasPart = facturas.map(f => {
    const extras = [f.descuentoPp && f.descuentoPp > 0.005 ? `(pp ${formatRcCop(f.descuentoPp)})` : '', f.ajusteAlPeso && f.ajusteAlPeso > 0.005 ? `(aj ${formatRcCop(f.ajusteAlPeso)})` : ''].filter(Boolean)
    return `Fact ${f.tipo}-${f.consecutivo} ${formatRcCop(f.valorRecibido)}${extras.length ? ` ${extras.join(' ')}` : ''}`
  }).join(', ')
  let pagosPart = mediosPago.length ? `Pago: ${mediosPago.map(p => `${titleCase(p.nombre)} ${formatRcCop(p.valor)}${p.voucher?.trim() ? ` Voucher: ${p.voucher.trim()}` : ''}`).join(', ')}` : ''
  const assemble = () => join([obs, facturasPart, pagosPart, ajuste, sello])
  if (assemble().length <= maxLength) return assemble()
  if (facturas.length) {
    const total = facturas.reduce((s, f) => s + f.valorRecibido, 0)
    const pp = facturas.reduce((s, f) => s + (f.descuentoPp ?? 0), 0)
    facturasPart = `${facturas.length} facturas ${formatRcCop(total)}${pp > 0.005 ? ` (pp ${formatRcCop(pp)})` : ''}`
  }
  if (assemble().length <= maxLength) return assemble()
  if (mediosPago.length) pagosPart = `Pago: ${formatRcCop(mediosPago.reduce((s, p) => s + p.valor, 0))}`
  if (assemble().length <= maxLength) return assemble()
  const reserved = join([facturasPart, pagosPart, ajuste, sello])
  const maxObs = maxLength - reserved.length - (reserved ? 3 : 0)
  if (maxObs <= 0) throw new Error('Los datos obligatorios del RC exceden p_notas')
  obs = truncate(obs, maxObs)
  return assemble()
}
