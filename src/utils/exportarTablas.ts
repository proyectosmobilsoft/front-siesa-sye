import { descargarExcel, type CeldaExcel, type ColumnaExcel, type HojaExcel } from '@/utils/exportarExcel'

/**
 * Exporta a Excel las tablas que se están viendo en pantalla. Lo usa el botón BotonExcel para que
 * cualquier tablero tenga "Exportar Excel" sin armar los datos aparte: lee lo que muestra la tabla
 * (con los filtros y la página actual) y convierte los valores en dinero y cantidades a números.
 */

const COLUMNAS_IGNORADAS = ['acciones', 'accion', 'acción', 'acc.']
const MAX_HOJAS = 12

const limpiar = (t: string) => t.replace(/ /g, ' ').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim()
const textoDe = (el: Element) => limpiar((el as HTMLElement).innerText ?? el.textContent ?? '')

/**
 * Convierte el texto de una celda en número cuando es dinero o una cantidad con formato es-CO
 * ("$ 1.234.567", "1.234,50", "-$ 500"). Los códigos con ceros a la izquierda ("001"), números sueltos
 * sin separadores ("86786"), fechas y porcentajes se dejan como texto para no alterarlos.
 */
export function aValorExcel(texto: string): CeldaExcel {
  const t = texto.trim()
  if (!t || t === '—' || t === '-' || t === '–') return null
  const conMoneda = /^-?\s*\$\s*-?[\d.,]+$/.test(t)
  const conMiles = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)
  const conDecimales = /^-?\d+,\d+$/.test(t)
  if (!conMoneda && !conMiles && !conDecimales) return t
  let n = t.replace(/[$\s]/g, '')
  if (n.includes(',')) n = n.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(n)) n = n.replace(/\./g, '')
  const valor = Number(n)
  return Number.isFinite(valor) ? valor : t
}

const hijos = (el: Element, ...etiquetas: string[]) => Array.from(el.children).filter((c) => etiquetas.includes(c.tagName))
const celdasDe = (fila: Element) => hijos(fila, 'TD', 'TH')
const colSpanDe = (celda: Element) => Math.max(1, Number.parseInt(celda.getAttribute('colspan') ?? '1', 10) || 1)
const filasDe = (tabla: Element, seccion: 'THEAD' | 'TBODY' | 'TFOOT') => hijos(tabla, seccion).flatMap((s) => hijos(s, 'TR'))

/** Repite cada celda tantas veces como columnas abarque (colspan), para no desalinear la tabla */
const expandir = (celdas: Element[]) => celdas.flatMap((c) => [c, ...Array.from({ length: colSpanDe(c) - 1 }, () => null)])

function tituloAntesDe(tabla: HTMLElement): string | null {
  const cap = tabla.querySelector('caption')
  if (cap && textoDe(cap)) return textoDe(cap)
  let el: HTMLElement | null = tabla
  for (let i = 0; i < 6 && el?.parentElement; i++) {
    el = el.parentElement
    const previos = Array.from(el.querySelectorAll('h1,h2,h3,h4')).filter((h) => (h.compareDocumentPosition(tabla) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0)
    const ultimo = previos[previos.length - 1]
    if (ultimo && textoDe(ultimo)) return textoDe(ultimo)
  }
  return null
}

function leerTabla(tabla: HTMLTableElement, nombre: string): HojaExcel | null {
  const cabecera = filasDe(tabla, 'THEAD')
  // Las filas que un filtro de columna dejó fuera no se exportan
  const filasCuerpo = filasDe(tabla, 'TBODY').filter((f) => !f.hasAttribute('data-filtrada'))
  const filasPie = filasDe(tabla, 'TFOOT')
  const filaTitulos = cabecera[cabecera.length - 1] ?? (filasCuerpo[0] && celdasDe(filasCuerpo[0]).some((c) => c.tagName === 'TH') ? filasCuerpo.shift() : undefined)
  if (!filaTitulos) return null

  const titulos = expandir(celdasDe(filaTitulos)).map((c) => (c ? textoDe(c) : ''))
  // Una fila de una sola celda que abarca varias columnas es un aviso ("No hay datos", "Cargando…") o un detalle desplegado
  const esDatos = (f: Element) => { const c = celdasDe(f); return !(c.length === 1 && colSpanDe(c[0]) > 1) }
  const leer = (f: Element) => expandir(celdasDe(f)).map((c) => (c ? textoDe(c) : ''))
  const cuerpo = filasCuerpo.filter(esDatos).map(leer)
  const pie = filasPie.filter(esDatos).map(leer)
  if (cuerpo.length === 0) return null

  // Columnas que no aportan al Excel: botones de acciones y columnas sin título ni texto
  const conservar = titulos.map((t, i) => {
    if (COLUMNAS_IGNORADAS.includes(t.toLowerCase())) return false
    return t !== '' || [...cuerpo, ...pie].some((f) => (f[i] ?? '') !== '')
  })
  const indices = titulos.map((_, i) => i).filter((i) => conservar[i])
  if (indices.length === 0) return null

  const valores = (fila: string[]) => indices.map((i) => aValorExcel(fila[i] ?? ''))
  const matriz = [...cuerpo, ...pie].map(valores)
  const columnas: ColumnaExcel[] = indices.map((i, j) => {
    const nums = matriz.map((f) => f[j]).filter((v): v is number => typeof v === 'number')
    const maxTexto = Math.max(titulos[i].length, ...matriz.map((f) => String(f[j] ?? '').length))
    return {
      titulo: titulos[i] || `Columna ${j + 1}`, clave: `c${j}`, ancho: Math.min(50, Math.max(10, maxTexto + 2)),
      ...(nums.length > 0 && { formato: nums.some((n) => !Number.isInteger(n)) ? '#,##0.00' : '#,##0' }),
    }
  })
  const aFila = (valoresFila: CeldaExcel[]) => Object.fromEntries(valoresFila.map((v, j) => [`c${j}`, v]))
  return {
    nombre,
    columnas,
    filas: matriz.map(aFila),
    estilos: [...cuerpo.map(() => undefined), ...pie.map(() => 'total' as const)],
  }
}

/** Primer ancestro (desde `desde`) que contiene alguna tabla; la raíz de lo que se exporta */
export function raizConTablas(desde: HTMLElement | null): HTMLElement | null {
  let el = desde?.parentElement ?? null
  while (el && !el.querySelector('table')) el = el.parentElement
  return el
}

/** Lee las tablas con datos dentro de `raiz` y las descarga como un Excel (una hoja por tabla). Devuelve cuántas exportó */
export async function exportarTablasDe(raiz: HTMLElement, archivo: string): Promise<number> {
  const tablas = Array.from(raiz.querySelectorAll('table')).filter((t) => !t.closest('[data-sin-excel]')).slice(0, MAX_HOJAS * 2)
  const usados = new Set<string>()
  const hojas: HojaExcel[] = []
  tablas.forEach((t, i) => {
    const base = (tituloAntesDe(t) ?? (tablas.length === 1 ? archivo : `Tabla ${i + 1}`)).replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 28) || `Tabla ${i + 1}`
    let nombre = base
    for (let n = 2; usados.has(nombre.toLowerCase()); n++) nombre = `${base.slice(0, 26)} ${n}`
    const hoja = leerTabla(t, nombre)
    if (hoja) { usados.add(nombre.toLowerCase()); hojas.push(hoja) }
  })
  if (hojas.length === 0) return 0
  const hoy = new Date()
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  await descargarExcel(`${archivo}_${fecha}`, hojas.slice(0, MAX_HOJAS))
  return hojas.length
}
