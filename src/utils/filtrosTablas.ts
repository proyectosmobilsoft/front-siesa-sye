/**
 * Filtros por columna estilo Excel para cualquier `<table>` de la pantalla.
 *
 * Trabaja sobre el DOM, como el botón de Excel (`exportarTablas.ts`): no hace falta tocar cada pantalla.
 * Filtra solo lo que la tabla muestra en ese momento (con paginación, la página en curso). Las filas que
 * no pasan el filtro se ocultan con `display: none` y se marcan con `data-filtrada`, para que el Excel
 * exporte solo lo filtrado. No reordena filas: mover nodos que maneja React rompe su reconciliación.
 */

export const VACIO = '(Vacías)'
export const MARCA_FILTRADA = 'data-filtrada'
const COLUMNAS_SIN_FILTRO = ['acciones', 'acción', 'accion', 'opciones']

/** Por columna, los valores que el usuario desmarcó (los que se ocultan) */
export type EstadoFiltros = Map<number, Set<string>>

const hijos = (el: Element, ...etiquetas: string[]) => Array.from(el.children).filter((c) => etiquetas.includes(c.tagName))
const celdasDe = (fila: Element) => hijos(fila, 'TD', 'TH')
const colSpanDe = (c: Element) => Math.max(1, Number.parseInt(c.getAttribute('colspan') ?? '1', 10) || 1)

export const textoCelda = (c: Element | null | undefined) => (c?.textContent ?? '').replace(/\s+/g, ' ').trim()

/** Una fila de una sola celda que abarca varias columnas es un aviso ("No hay datos") o un detalle desplegado */
export function esFilaDetalle(fila: Element): boolean {
  const c = celdasDe(fila)
  return c.length === 1 && colSpanDe(c[0]) > 1
}

/** Última fila del encabezado; null si la tabla no tiene encabezado o usa colspan en él */
export function filaEncabezado(tabla: HTMLTableElement): HTMLTableRowElement | null {
  const filas = hijos(tabla, 'THEAD').flatMap((s) => hijos(s, 'TR'))
  const ultima = filas[filas.length - 1] as HTMLTableRowElement | undefined
  if (!ultima) return null
  const celdas = celdasDe(ultima)
  return celdas.length > 0 && celdas.every((c) => colSpanDe(c) === 1) ? ultima : null
}

export const filasCuerpo = (tabla: HTMLTableElement) =>
  hijos(tabla, 'TBODY').flatMap((s) => hijos(s, 'TR')) as HTMLTableRowElement[]

/** ¿Esta columna del encabezado admite filtro? (no: acciones ni columnas sin título) */
export function columnaFiltrable(th: Element): boolean {
  const t = textoCelda(th).toLowerCase()
  return t !== '' && !COLUMNAS_SIN_FILTRO.includes(t)
}

/** Las tablas con menos de 2 filas de datos no necesitan filtro */
export function tablaFiltrable(tabla: HTMLTableElement): boolean {
  if (tabla.hasAttribute('data-sin-filtros') || tabla.closest('[data-sin-filtros]')) return false
  const enc = filaEncabezado(tabla)
  if (!enc || !celdasDe(enc).some(columnaFiltrable)) return false
  return filasCuerpo(tabla).filter((f) => !esFilaDetalle(f)).length >= 2
}

export const valorDeFila = (fila: HTMLTableRowElement, col: number) => textoCelda(celdasDe(fila)[col]) || VACIO

function pasa(fila: HTMLTableRowElement, estado: EstadoFiltros, omitir?: number): boolean {
  for (const [col, excluidos] of estado) {
    if (col === omitir || excluidos.size === 0) continue
    if (excluidos.has(valorDeFila(fila, col))) return false
  }
  return true
}

/** Valores distintos de una columna entre las filas que pasan los filtros de las demás columnas (como Excel) */
export function valoresColumna(tabla: HTMLTableElement, col: number, estado: EstadoFiltros): string[] {
  const vistos = new Set<string>()
  for (const f of filasCuerpo(tabla)) {
    if (esFilaDetalle(f) || !pasa(f, estado, col)) continue
    vistos.add(valorDeFila(f, col))
  }
  return Array.from(vistos).sort((a, b) => {
    if (a === VACIO) return 1
    if (b === VACIO) return -1
    return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
  })
}

/** Oculta las filas que no pasan los filtros; las filas de detalle siguen a su fila de datos */
export function aplicarFiltros(tabla: HTMLTableElement, estado: EstadoFiltros): number {
  let visibles = 0
  let ocultaAnterior = false
  for (const f of filasCuerpo(tabla)) {
    let oculta: boolean
    if (esFilaDetalle(f)) oculta = ocultaAnterior
    else {
      oculta = !pasa(f, estado)
      ocultaAnterior = oculta
      if (!oculta) visibles++
    }
    if (oculta) {
      f.style.display = 'none'
      f.setAttribute(MARCA_FILTRADA, '')
    } else if (f.hasAttribute(MARCA_FILTRADA)) {
      f.style.display = ''
      f.removeAttribute(MARCA_FILTRADA)
    }
  }
  return visibles
}

export const hayFiltros = (estado: EstadoFiltros) => Array.from(estado.values()).some((s) => s.size > 0)
