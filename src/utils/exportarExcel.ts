/**
 * Descarga de Excel para las tablas del sistema. exceljs y file-saver se cargan solo al exportar
 * (import dinámico), así que no pesan en la carga normal de las pantallas.
 */
export interface ColumnaExcel {
  titulo: string
  clave: string
  ancho?: number
  /** Formato numérico con miles, sin decimales (valores de dinero) */
  dinero?: boolean
}

export type CeldaExcel = string | number | null

export interface HojaExcel {
  nombre: string
  columnas: ColumnaExcel[]
  filas: Record<string, CeldaExcel>[]
  /** Fila final en negrita (totales). Las claves que no se pasen quedan vacías */
  totales?: Record<string, CeldaExcel>
}

export async function descargarExcel(archivo: string, hojas: HojaExcel[]): Promise<void> {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([import('exceljs'), import('file-saver')])
  const libro = new ExcelJS.Workbook()
  for (const h of hojas) {
    // Excel limita el nombre de la hoja a 31 caracteres y prohíbe algunos símbolos
    const hoja = libro.addWorksheet(h.nombre.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))
    hoja.columns = h.columnas.map((c) => ({ header: c.titulo, key: c.clave, width: c.ancho ?? (c.dinero ? 16 : 20) }))
    for (const fila of h.filas) hoja.addRow(fila)
    if (h.totales) hoja.addRow(h.totales).font = { bold: true }
    hoja.getRow(1).font = { bold: true }
    hoja.views = [{ state: 'frozen', ySplit: 1 }]
    if (h.columnas.length > 0) hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: h.columnas.length } }
    for (const c of h.columnas) if (c.dinero) hoja.getColumn(c.clave).numFmt = '#,##0'
  }
  const buffer = await libro.xlsx.writeBuffer()
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), archivo.endsWith('.xlsx') ? archivo : `${archivo}.xlsx`)
}
