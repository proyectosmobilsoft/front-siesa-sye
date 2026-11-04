import { Bloque, Malla, SubPestanas, Tabla, Tarjeta } from '../comun'
import { Areas, BarrasApiladas, BarrasH } from '../graficas'
import { PALETA, compacto, decimal, dinero, entero, etiquetaMes, porcentaje } from '../formato'
import type { DashboardInventario, LecturaInventario } from '../ventas/tipos'

const FUENTE = 'Existencias de SIESA (t400) a costo promedio, compra neta EA/EAF − NP y costo de lo vendido (facturas y remisiones menos notas), sin IVA.'
const LECTURAS: Record<LecturaInventario, { texto: string; clase: string }> = {
  consume: { texto: 'Vendió inventario previo', clase: 'bg-amber-100 text-amber-800' },
  acumula: { texto: 'Acumuló inventario', clase: 'bg-blue-100 text-blue-800' },
  equilibrada: { texto: 'Vende lo que compra', clase: 'bg-emerald-100 text-emerald-800' },
  sin_movimiento: { texto: 'Solo existencia', clase: 'bg-muted text-muted-foreground' },
}
const Etiqueta = ({ lectura }: { lectura: LecturaInventario }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${LECTURAS[lectura].clase}`}>{LECTURAS[lectura].texto}</span>
)
const signo = (v: number) => `${v > 0 ? '+' : ''}${dinero(v)}`

export function InventarioLineas({ d, sub, alElegirSub }: { d: DashboardInventario; sub: string; alElegirSub: (valor: string) => void }) {
  const opciones = [
    { valor: 'resumen', etiqueta: 'Resumen' },
    { valor: 'lineas', etiqueta: 'Por línea' },
    { valor: 'mensual', etiqueta: 'Mensual' },
    { valor: 'bodegas', etiqueta: 'Bodegas' },
  ]
  const activa = opciones.some(o => o.valor === sub) ? sub : 'resumen'
  const k = d.kpis
  const conMovimiento = d.lineas.filter(l => l.lectura !== 'sin_movimiento')
  const mayores = [...d.lineas].sort((a, b) => b.existencia - a.existencia).slice(0, 12)
  const consumo = [...d.lineas].filter(l => l.lectura === 'consume').sort((a, b) => a.variacion_inventario - b.variacion_inventario).slice(0, 10)
  const acumulan = [...d.lineas].filter(l => l.lectura === 'acumula').sort((a, b) => b.variacion_inventario - a.variacion_inventario).slice(0, 10)
  const corto = (texto: string) => (texto.length > 16 ? `${texto.slice(0, 15)}…` : texto)

  return (
    <SubPestanas opciones={opciones} activa={activa} alElegir={alElegirSub}>
      <div className="flex flex-col gap-4">
        {activa === 'resumen' && <>
          <Malla columnas={6}>
            <Tarjeta compacta etiqueta="Inventario a costo" valor={dinero(k.existencia)} nota={`${entero(k.items)} ítems con existencia`} ayuda={{ fuente: FUENTE, formula: 'Σ existencia × costo promedio de cada ítem (todas las bodegas)', nota: 'Es la existencia de hoy, no al cierre del rango.' }} />
            <Tarjeta compacta etiqueta="Compra neta" valor={dinero(k.compra_neta)} ayuda={{ fuente: FUENTE, formula: 'Entradas EA/EAF − notas NP del periodo' }} />
            <Tarjeta compacta etiqueta="Costo de lo vendido" valor={dinero(k.costo_ventas)} ayuda={{ fuente: FUENTE, formula: 'Σ costo promedio de los movimientos vendidos, neto de notas crédito', nota: 'La venta a precio es mayor porque incluye el margen; compare compras contra el costo.' }} />
            <Tarjeta compacta etiqueta="Variación de inventario" valor={signo(k.variacion_inventario)} nota={k.variacion_inventario >= 0 ? 'Compró más de lo que vendió' : 'Vendió más de lo que compró'} ayuda={{ fuente: FUENTE, formula: 'Compra neta − costo de lo vendido' }} />
            <Tarjeta compacta etiqueta="Cobertura" valor={k.meses_cobertura == null ? '—' : `${decimal(k.meses_cobertura)} meses`} ayuda={{ fuente: FUENTE, formula: 'Inventario ÷ costo de ventas mensual promedio del periodo' }} />
            <Tarjeta compacta etiqueta={`Sin venta > ${d.dias_lento} días`} valor={dinero(k.valor_lento)} nota={k.participacion_lento == null ? undefined : `${porcentaje(k.participacion_lento)} del inventario`} ayuda={{ fuente: FUENTE, formula: 'Existencia de ítems cuya última venta fue hace más de 180 días o nunca' }} />
          </Malla>
          <Bloque titulo="Lectura por línea" descripcion={`${k.lineas_consumen} vendieron inventario previo · ${k.lineas_acumulan} acumularon · ${k.lineas_equilibradas} venden lo que compran`} ayuda={{ fuente: FUENTE, formula: 'Compra neta − costo de ventas; equilibrada si difieren menos de 3 %', nota: 'Una línea con ventas a precio mayores que sus compras no siempre usó inventario: el precio incluye el margen.' }}>
            <BarrasApiladas agrupadas datos={mayores.map(l => ({ ...l, corta: corto(l.proveedor) }))} ejeX="corta" series={[
              { clave: 'compra_neta', nombre: 'Compra neta', color: PALETA[0] },
              { clave: 'costo_ventas', nombre: 'Costo de ventas', color: PALETA[2] },
              { clave: 'existencia', nombre: 'Inventario hoy', color: PALETA[1] },
            ]} formato={dinero} altura={340} />
          </Bloque>
          <Malla columnas={2}>
            <Bloque titulo="Más inventario previo consumido" ayuda={{ fuente: FUENTE, formula: 'Costo de ventas − compra neta, líneas donde es positivo' }}>
              <BarrasH datos={consumo.map(l => ({ nombre: l.proveedor, valor: -l.variacion_inventario }))} formato={dinero} anchoEtiqueta={150} color={PALETA[2]} />
            </Bloque>
            <Bloque titulo="Más inventario acumulado" ayuda={{ fuente: FUENTE, formula: 'Compra neta − costo de ventas, líneas donde es positivo', nota: 'Debería encontrarse en la existencia actual.' }}>
              <BarrasH datos={acumulan.map(l => ({ nombre: l.proveedor, valor: l.variacion_inventario }))} formato={dinero} anchoEtiqueta={150} />
            </Bloque>
          </Malla>
        </>}
        {activa === 'lineas' && <Bloque titulo="Inventario por marca/proveedor" descripcion={`${conMovimiento.length} líneas con compra o venta en el periodo, ${d.lineas.length} con existencia o movimiento`} ayuda={{ fuente: FUENTE, formula: 'Variación = compra neta − costo de ventas; inicial estimado = inventario hoy − variación', nota: 'El inicial estimado solo es fiable si el rango termina hoy y no hubo ajustes, producción ni traslados entre compañías.' }}>
          <Tabla filas={d.lineas} clave={l => l.proveedor} columnas={[
            { titulo: 'Línea', celda: l => <span className="font-medium text-foreground">{l.proveedor}</span> },
            { titulo: 'Lectura', celda: l => <Etiqueta lectura={l.lectura} /> },
            { titulo: 'Compra neta', alinear: 'der', celda: l => dinero(l.compra_neta) },
            { titulo: 'Venta (precio)', alinear: 'der', celda: l => dinero(l.venta) },
            { titulo: 'Costo de ventas', alinear: 'der', celda: l => dinero(l.costo_ventas) },
            { titulo: 'Variación', alinear: 'der', celda: l => <span className="whitespace-nowrap">{signo(l.variacion_inventario)}</span> },
            { titulo: 'Inventario hoy', alinear: 'der', celda: l => dinero(l.existencia) },
            { titulo: 'Inicial estimado', alinear: 'der', celda: l => dinero(l.inventario_inicial_estimado) },
            { titulo: 'Cobertura', alinear: 'der', celda: l => l.meses_cobertura == null ? '—' : `${decimal(l.meses_cobertura)} m` },
            { titulo: `Sin venta > ${d.dias_lento} d`, alinear: 'der', celda: l => l.valor_lento ? dinero(l.valor_lento) : '—' },
          ]} />
        </Bloque>}
        {activa === 'mensual' && <>
          <Bloque titulo="Compra neta vs costo de ventas por mes" ayuda={{ fuente: FUENTE, formula: 'Σ compra neta y Σ costo de ventas de cada mes' }}>
            <Areas datos={d.mensual.map(m => ({ ...m, etiqueta: etiquetaMes(m.mes) }))} ejeX="etiqueta" series={[
              { clave: 'compra_neta', nombre: 'Compra neta', color: PALETA[0] },
              { clave: 'costo_ventas', nombre: 'Costo de ventas', color: PALETA[2] },
            ]} formato={dinero} />
          </Bloque>
          <Bloque titulo="Variación de inventario por mes" ayuda={{ fuente: FUENTE, formula: 'Compra neta − costo de ventas; positivo acumula, negativo consume' }}>
            <BarrasApiladas datos={d.mensual.map(m => ({ ...m, etiqueta: etiquetaMes(m.mes) }))} ejeX="etiqueta" series={[{ clave: 'variacion_inventario', nombre: 'Variación', color: PALETA[3] }]} formato={compacto} altura={280} />
          </Bloque>
        </>}
        {activa === 'bodegas' && <Bloque titulo="Inventario por bodega" ayuda={{ fuente: FUENTE, formula: 'Σ existencia × costo promedio por bodega', nota: 'Reclamos y mal estado no son mercancía vendible.' }}>
          <Tabla filas={d.bodegas} clave={b => b.codigo} columnas={[
            { titulo: 'Bodega', celda: b => <span className="font-medium text-foreground">{b.bodega}</span> },
            { titulo: 'Código', celda: b => b.codigo },
            { titulo: 'Vendible', celda: b => (b.vendible ? 'Sí' : 'No') },
            { titulo: 'Cantidad', alinear: 'der', celda: b => entero(b.cantidad) },
            { titulo: 'Valor a costo', alinear: 'der', celda: b => dinero(b.valor) },
          ]} />
        </Bloque>}
      </div>
    </SubPestanas>
  )
}
