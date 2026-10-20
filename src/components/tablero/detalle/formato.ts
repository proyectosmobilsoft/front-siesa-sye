import { decimal, dinero, entero, porcentaje } from '@/components/tablero/formato'
import { VACIO, type ColumnaDetalle, type FiltroColumna, type TipoColumna } from './tipos'

const fechaCorta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

/** Texto de una celda según el tipo de su columna. */
export function formatearCelda(valor: unknown, tipo: TipoColumna): string {
  if (valor == null || valor === '') return '—'
  switch (tipo) {
    case 'dinero': return dinero(Number(valor))
    case 'entero': return entero(Number(valor))
    case 'kg': return `${entero(Number(valor))} kg`
    case 'dias': return `${decimal(Number(valor), 1)} d`
    case 'porcentaje': return porcentaje(Number(valor))
    case 'fecha': return fechaCorta(String(valor))
    case 'fechahora': {
      const f = new Date(String(valor))
      return Number.isNaN(f.getTime()) ? String(valor) : f.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
    }
    default: return String(valor)
  }
}

/** Valor de la lista de un filtro: viene como texto crudo, se muestra con el formato de su columna. */
export function etiquetaValor(valor: string, tipo: TipoColumna): string {
  if (valor === VACIO) return VACIO
  return tipo === 'texto' ? valor : formatearCelda(tipo === 'fecha' || tipo === 'fechahora' ? valor : Number(valor), tipo)
}

/** Resumen corto de un filtro de columna para la etiqueta removible. */
export function resumenFiltro(columna: ColumnaDetalle, f: FiltroColumna): string {
  const partes: string[] = []
  if (f.v) partes.push(f.v.length <= 2 ? f.v.map((x) => etiquetaValor(x, columna.tipo)).join(', ') : `${f.v.length} valores`)
  if (f.q) partes.push(`contiene "${f.q}"`)
  const numerico = (x: string | number) => (columna.tipo === 'texto' ? String(x) : etiquetaValor(String(x), columna.tipo))
  if (f.min != null && f.min !== '') partes.push(`≥ ${numerico(f.min)}`)
  if (f.max != null && f.max !== '') partes.push(`≤ ${numerico(f.max)}`)
  return `${columna.etiqueta}: ${partes.join(' · ')}`
}

const celdaCsv = (valor: unknown, tipo: TipoColumna) => {
  if (valor == null) return ''
  let texto: string
  if (tipo === 'fecha') texto = fechaCorta(String(valor))
  else if (tipo === 'fechahora') texto = formatearCelda(valor, tipo)
  else if (tipo === 'texto') texto = String(valor)
  else texto = String(valor).replace('.', ',') // Excel en español espera coma decimal
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** CSV con ; como separador y BOM, para que Excel en español lo abra con tildes y columnas. */
export function aCsv(columnas: ColumnaDetalle[], filas: Record<string, unknown>[]): string {
  const encabezado = ['#', ...columnas.map((c) => celdaCsv(c.etiqueta, 'texto'))].join(';')
  const cuerpo = filas.map((fila, i) => [String(i + 1), ...columnas.map((c) => celdaCsv(fila[c.clave], c.tipo))].join(';'))
  return `\uFEFF${[encabezado, ...cuerpo].join('\r\n')}`
}
