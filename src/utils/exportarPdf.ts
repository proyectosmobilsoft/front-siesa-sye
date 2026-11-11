import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CeldaExcel, HojaExcel } from '@/utils/exportarExcel'

/**
 * PDF con las mismas hojas que se mandan a `descargarExcel`: una tabla por hoja (título, encabezados,
 * filas agrupadas y totales), en carta horizontal.
 */
const NUMERO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const MARGEN = 28

export async function descargarPdf(archivo: string, titulo: string, subtitulo: string, hojas: HojaExcel[]): Promise<void> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const ancho = pdf.internal.pageSize.getWidth()
  const alto = pdf.internal.pageSize.getHeight()
  const generado = new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())

  pdf.setFont('helvetica', 'bold').setFontSize(14).text(titulo, MARGEN, 36)
  pdf.setFont('helvetica', 'normal').setFontSize(9).text(subtitulo, MARGEN, 50)
  let y = 64

  hojas.forEach((h, indice) => {
    if (indice > 0) {
      pdf.addPage()
      y = 36
    }
    pdf.setFont('helvetica', 'bold').setFontSize(11).text(h.nombre, MARGEN, y)
    const celda = (valor: CeldaExcel | undefined, dinero: boolean) =>
      valor == null || valor === '' ? '' : dinero && typeof valor === 'number' ? `$ ${NUMERO.format(valor)}` : String(valor)
    const filas = h.filas.map((fila) => h.columnas.map((c) => celda(fila[c.clave], !!c.dinero)))
    const estilos = h.estilos ?? []

    autoTable(pdf, {
      startY: y + 6,
      margin: { left: MARGEN, right: MARGEN, bottom: 30 },
      head: [h.columnas.map((c) => c.titulo)],
      body: filas,
      foot: h.totales ? [h.columnas.map((c) => celda(h.totales?.[c.clave], !!c.dinero))] : undefined,
      showFoot: 'lastPage',
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak', valign: 'middle', lineColor: [210, 210, 210], lineWidth: 0.4 },
      headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [219, 234, 254], textColor: 20, fontStyle: 'bold' },
      columnStyles: Object.fromEntries(h.columnas.map((c, i) => [i, c.dinero ? { halign: 'right' as const, cellWidth: 'wrap' as const } : {}])),
      didParseCell: (data) => {
        if (h.columnas[data.column.index]?.dinero) data.cell.styles.halign = 'right'
        if (data.section !== 'body') return
        const estilo = estilos[data.row.index]
        if (estilo === 'grupo') {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [232, 238, 247]
        } else if (estilo === 'total') {
          data.cell.styles.fontStyle = 'bold'
        } else if (estilo === 'detalle' && data.column.index === 0) {
          data.cell.styles.cellPadding = { top: 3, bottom: 3, right: 3, left: 12 }
        }
      },
    })
  })

  // Pie en todas las páginas: fecha de generación y "Página x de y"
  const paginas = pdf.getNumberOfPages()
  for (let i = 1; i <= paginas; i += 1) {
    pdf.setPage(i)
    pdf.setFont('helvetica', 'normal').setFontSize(7).setTextColor(110)
    pdf.text(`Generado el ${generado}`, MARGEN, alto - 14)
    pdf.text(`Página ${i} de ${paginas}`, ancho - MARGEN, alto - 14, { align: 'right' })
    pdf.setTextColor(0)
  }

  pdf.save(archivo.endsWith('.pdf') ? archivo : `${archivo}.pdf`)
}
