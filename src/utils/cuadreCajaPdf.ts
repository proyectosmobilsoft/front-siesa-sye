import jsPDF from 'jspdf'
import autoTable, { type CellDef, type RowInput } from 'jspdf-autotable'
import type { CuadreCaja, CuadreCajaDoc } from '@/api/cuadreCaja'
import { calcularCuadre, type ColumnaMonto, type MontosCuadre } from '@/components/reciboCaja/cuadreCajaCalculos'
import { formatters } from '@/utils/formatters'

// Réplica del "Anexo de movimiento de cuadre de caja y operaciones de ventas" de SIESA escritorio.

type Color = [number, number, number]
const COLOR_SECCION: Color = [253, 235, 211]
const COLOR_SUBTOTAL: Color = [229, 231, 235]
const COLOR_TOTAL: Color = [219, 234, 254]
const TOTAL_PAGINAS = '{total_pages_count_string}'
const MARGEN = 30
const INICIO_TABLA = 112

const TITULO_COLUMNA: Record<ColumnaMonto, string> = {
  efectivo: 'Efectivo',
  tarjetas: 'Tarjetas',
  credito: 'Crédito',
  consignado: 'Consignado',
  otros: 'Otros',
  total: 'TOTAL',
}

const NUMERO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const monto = (valor: number) => NUMERO.format(valor)

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

/** "2026-10-13" → "Martes 13 de Octubre del 2026" (como el reporte de SIESA). */
function fechaLarga(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  const fecha = new Date(a, m - 1, d)
  return `${DIAS[fecha.getDay()]} ${d} de ${MESES[m - 1]} del ${a}`
}

const finalY = (pdf: jsPDF) => (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? INICIO_TABLA

export function descargarAnexoCuadrePdf(datos: CuadreCaja, meta: { responsable: string; cedula: string; cajaDescripcion: string }) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const { porConcepto, ingresos, egresos, flujo, columnas, rotuloFlujo } = calcularCuadre(datos)
  const ancho = pdf.internal.pageSize.getWidth()
  const alto = pdf.internal.pageSize.getHeight()
  const unDia = datos.fecha_inicial === datos.fecha_final
  const periodo = unDia ? fechaLarga(datos.fecha_inicial) : `Del ${formatters.dateOnly(datos.fecha_inicial)} al ${formatters.dateOnly(datos.fecha_final)}`
  const ahora = new Date()
  const generado = `${formatters.dateOnly(ahora.toLocaleDateString('sv-SE'))} ${ahora.toTimeString().slice(0, 5)}`

  const encabezado = () => {
    pdf.setDrawColor(90)
    pdf.setLineWidth(0.8)
    pdf.rect(MARGEN, 25, ancho - MARGEN * 2, 75)
    pdf.setTextColor(0)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.text('CI DISTRIBUCIONES SYE S.A.S.', MARGEN + 10, 43)
    pdf.setFontSize(10)
    pdf.text('ANEXO DE MOVIMIENTO DE CUADRE DE CAJA Y OPERACIONES DE VENTAS', MARGEN + 10, 58)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text(`Fecha: ${periodo}`, MARGEN + 10, 73)
    pdf.text(`Generado: ${generado}`, ancho - MARGEN - 10, 73, { align: 'right' })
    pdf.setFont('helvetica', 'bold')
    pdf.text('Centro:', MARGEN + 10, 89)
    pdf.text('Responsable:', ancho / 2 + 40, 89)
    pdf.setFont('helvetica', 'normal')
    pdf.text(datos.centros.join(' y ') || '—', MARGEN + 45, 89)
    pdf.text(`${meta.cedula}  ${meta.responsable.toUpperCase()}`, ancho / 2 + 100, 89)
    pdf.setFontSize(7)
    pdf.text(`Página ${pdf.getCurrentPageInfo().pageNumber} de ${TOTAL_PAGINAS}`, ancho - MARGEN, alto - 18, { align: 'right' })
  }

  const filaResaltada = (texto: string, color: Color, montos?: MontosCuadre): CellDef[] => [
    { content: texto, colSpan: 5, styles: { fillColor: color, fontStyle: 'bold' } },
    ...columnas.map((col): CellDef => ({
      content: montos ? monto(montos[col]) : '',
      styles: { fillColor: color, fontStyle: 'bold', halign: 'right', textColor: montos && montos[col] < 0 ? [185, 28, 28] : 0 },
    })),
  ]

  const filaDocumento = (doc: CuadreCajaDoc): CellDef[] => [
    { content: doc.co },
    { content: doc.tipo },
    { content: String(doc.numero), styles: { halign: 'right' } },
    { content: formatters.dateOnly(doc.fecha) },
    { content: doc.concepto === 'RECAUDOS' && doc.origen === 'APP' ? `${doc.tercero} (App/Web)` : doc.tercero },
    ...columnas.map((col): CellDef => ({ content: monto(doc[col]), styles: { halign: 'right' } })),
  ]

  const cuerpo: RowInput[] = []
  for (const sentido of ['I', 'E'] as const) {
    for (const concepto of porConcepto.filter((c) => c.sentido === sentido && c.documentos.length > 0)) {
      cuerpo.push(filaResaltada(concepto.titulo, COLOR_SECCION))
      for (const doc of concepto.documentos) {
        cuerpo.push(filaDocumento(doc))
        // Facturas de contado que agrupa la recogida del POS (informativas: el valor ya va en la recogida).
        for (const f of doc.facturas_pos ?? []) {
          cuerpo.push([
            { content: '', colSpan: 1 },
            { content: f.tipo, styles: { textColor: 110 } },
            { content: String(f.numero), styles: { halign: 'right', textColor: 110 } },
            { content: '' },
            { content: `   ${f.tercero}`, styles: { textColor: 110, fontStyle: 'italic' } },
            ...columnas.map((col): CellDef => ({ content: col === 'total' ? monto(f.valor) : '', styles: { halign: 'right', textColor: 110, fontStyle: 'italic' } })),
          ])
        }
      }
      cuerpo.push(filaResaltada(`TOTAL ${concepto.titulo}`, COLOR_SUBTOTAL, concepto.montos))
    }
    cuerpo.push(sentido === 'I'
      ? filaResaltada('TOTAL RECAUDOS Y/O INGRESOS:', COLOR_TOTAL, ingresos)
      : filaResaltada('TOTAL EGRESOS:', COLOR_TOTAL, egresos))
  }
  cuerpo.push(filaResaltada('TOTAL MOVIMIENTO DE CAJA:', COLOR_TOTAL, flujo))

  autoTable(pdf, {
    head: [['Alm.', 'Tipo', '# Doc.', 'Fecha', 'Tercero', ...columnas.map((c) => TITULO_COLUMNA[c])]],
    body: cuerpo,
    startY: INICIO_TABLA,
    margin: { left: MARGEN, right: MARGEN, top: INICIO_TABLA, bottom: 35 },
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2.5, overflow: 'ellipsize', lineColor: [229, 231, 235], lineWidth: 0.3 },
    headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 30 }, 2: { cellWidth: 42 }, 3: { cellWidth: 52 }, 4: { cellWidth: 190 } },
    didDrawPage: encabezado,
  })

  // Resumen: la misma grilla "Descripción o concepto" que se ve en pantalla.
  const filaResumen = (nombre: string, montos: MontosCuadre, docs: string): RowInput => [nombre, ...columnas.map((c) => monto(montos[c])), docs]
  const resumen: RowInput[] = []
  const totales = new Set<number>()
  for (const concepto of porConcepto) {
    if (concepto.clave === 'PROVEEDORES') {
      totales.add(resumen.length)
      resumen.push(filaResumen('TOTAL INGRESOS ===>', ingresos, String(ingresos.docs)))
    }
    resumen.push(filaResumen(concepto.nombre, concepto.montos, String(concepto.montos.docs)))
  }
  totales.add(resumen.length)
  resumen.push(filaResumen('TOTAL EGRESOS ===>', egresos, String(egresos.docs)))
  totales.add(resumen.length)
  resumen.push(filaResumen(`${rotuloFlujo.toUpperCase()} ===>`, flujo, ''))

  let inicioResumen = finalY(pdf) + 24
  if (inicioResumen > alto - 260) {
    pdf.addPage()
    inicioResumen = INICIO_TABLA
  }
  autoTable(pdf, {
    head: [
      [{ content: 'RESUMEN DEL CUADRE', colSpan: columnas.length + 2, styles: { halign: 'left' } }],
      ['Descripción o concepto', ...columnas.map((c) => TITULO_COLUMNA[c]), 'Docs'],
    ],
    body: resumen,
    startY: inicioResumen,
    margin: { left: MARGEN, right: MARGEN, top: INICIO_TABLA, bottom: 35 },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 3.5, lineColor: [229, 231, 235], lineWidth: 0.3 },
    headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold', halign: 'right' },
    columnStyles: { 0: { halign: 'left', cellWidth: 200 } },
    didParseCell: (hook) => {
      if (hook.section === 'head' && hook.column.index === 0) hook.cell.styles.halign = 'left'
      if (hook.section !== 'body') return
      if (hook.column.index > 0) hook.cell.styles.halign = 'right'
      if (totales.has(hook.row.index)) {
        hook.cell.styles.fillColor = COLOR_TOTAL
        hook.cell.styles.fontStyle = 'bold'
      }
      if (hook.row.index === 0 && hook.column.index === 0) hook.cell.styles.textColor = [29, 78, 216]
      const valor = Number(String(hook.cell.raw ?? '').replace(/\./g, '').replace(',', '.'))
      if (hook.column.index > 0 && valor < 0) hook.cell.styles.textColor = [185, 28, 28]
    },
    didDrawPage: encabezado,
  })

  let firmaY = finalY(pdf) + 55
  if (firmaY > alto - 45) {
    pdf.addPage()
    encabezado()
    firmaY = INICIO_TABLA + 50
  }
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(0)
  const anchoFirma = (ancho - MARGEN * 2) / 3
  ;['Elaboró', 'Revisó', 'Aprobó'].forEach((etiqueta, i) => {
    const x = MARGEN + anchoFirma * i + 20
    pdf.line(x, firmaY, x + anchoFirma - 60, firmaY)
    pdf.text(etiqueta, x, firmaY + 11)
  })

  pdf.putTotalPages(TOTAL_PAGINAS)
  const centros = datos.centros.length ? datos.centros.join('_') : 'todos'
  const cajaArchivo = datos.caja ? `_caja_${datos.caja.replace(/[^0-9A-Za-z]/g, '')}` : ''
  pdf.save(`anexo_cuadre_caja_${centros}${cajaArchivo}_${datos.fecha_inicial}${unDia ? '' : `_a_${datos.fecha_final}`}.pdf`)
}
