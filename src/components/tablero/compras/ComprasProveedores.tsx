import { useState } from 'react'
import { Bloque, BotonTabla, Malla, SubPestanas, Tabla, Tarjeta } from '../comun'
import { Areas, BarrasApiladas, BarrasH, MapaCalor } from '../graficas'
import { PALETA, dinero, entero, etiquetaMes, kilos, porcentaje } from '../formato'
import { DETALLE_COMPRAS } from '../detalle/especificaciones'
import type { DashboardCompras, DashboardVentas } from '../ventas/tipos'

const FUENTE = 'Entradas de almacén EA/EAF menos notas NP (devolución a proveedor) de SIESA, sin IVA.'
const variacion = (actual: number, previo: number) => previo ? (actual - previo) / previo : null

export function ComprasProveedores({ d, ventas, sub, alElegirSub }: {
  d: DashboardCompras
  ventas?: DashboardVentas
  sub: string
  alElegirSub: (valor: string) => void
}) {
  const [tablas, setTablas] = useState<Record<string, boolean>>({})
  const alternar = (clave: string) => setTablas(actual => ({ ...actual, [clave]: !actual[clave] }))
  const opciones = [
    { valor: 'ranking', etiqueta: 'Ranking' },
    { valor: 'mensual', etiqueta: 'Mensual' },
    { valor: 'comparacion', etiqueta: 'Compra vs venta' },
  ]
  const activa = opciones.some(opcion => opcion.valor === sub) ? sub : 'ranking'
  const proveedores = d.proveedores.filter(p => p.proveedor !== 'OTROS PROVEEDORES')
  const top = proveedores.slice(0, 5)
  const meses = d.mensual.map(m => m.mes)
  const ventaMarca = new Map(ventas?.proveedores.map(p => [p.proveedor, p.venta]) ?? [])
  const marcas = d.marcas.map(m => ({ ...m, venta: ventaMarca.get(m.marca) ?? 0 }))

  return (
    <SubPestanas opciones={opciones} activa={activa} alElegir={alElegirSub}>
      <div className="flex flex-col gap-4">
        {activa === 'ranking' && <>
          <Malla columnas={6}>
            <Tarjeta compacta etiqueta="Compra neta" detalle={DETALLE_COMPRAS.neta} valor={dinero(d.kpis.compra_neta)} variacion={variacion(d.kpis.compra_neta, d.kpis.compra_neta_previa)} nota="vs periodo anterior" ayuda={{ fuente: FUENTE, formula: 'Compra − devoluciones; variación = (actual − anterior) ÷ anterior' }} />
            <Tarjeta compacta etiqueta="Devoluciones" detalle={DETALLE_COMPRAS.devoluciones} valor={dinero(d.kpis.devoluciones)} nota={d.kpis.tasa_devolucion == null ? 'Tasa —' : `Tasa ${porcentaje(d.kpis.tasa_devolucion)}`} ayuda={{ fuente: FUENTE, formula: 'Σ notas NP; tasa = devoluciones ÷ compra' }} />
            <Tarjeta compacta etiqueta="Proveedores con compra" detalle={DETALLE_COMPRAS.proveedores} valor={entero(d.kpis.proveedores)} ayuda={{ fuente: FUENTE, formula: 'Terceros distintos con compra neta > 0' }} />
            <Tarjeta compacta etiqueta="Documentos de entrada" detalle={DETALLE_COMPRAS.documentos} valor={entero(d.kpis.documentos)} ayuda={{ fuente: FUENTE, formula: 'Documentos EA/EAF distintos' }} />
            <Tarjeta compacta etiqueta="Concentración top 5" detalle={DETALLE_COMPRAS.top5} valor={porcentaje(top.reduce((suma, p) => suma + p.participacion, 0))} ayuda={{ fuente: FUENTE, formula: 'Σ participación de los cinco proveedores con mayor compra neta' }} />
            <Tarjeta compacta etiqueta="Kg comprados" detalle={DETALLE_COMPRAS.kg} valor={kilos(d.kpis.kg)} ayuda={{ fuente: FUENTE, formula: 'Σ cantidad base × peso unitario, neto de devoluciones' }} />
          </Malla>
          <Bloque titulo="Top 15 proveedores" ayuda={{ fuente: FUENTE, formula: 'Compra neta por tercero; orden descendente' }}>
            <BarrasH datos={proveedores.slice(0, 15).map(p => ({ nombre: p.proveedor, valor: p.compra_neta }))} formato={dinero} anchoEtiqueta={160} />
          </Bloque>
          <Bloque titulo="Detalle por proveedor" accion={<BotonTabla visible={!!tablas.ranking} alAlternar={() => alternar('ranking')} />} ayuda={{ fuente: FUENTE, formula: 'Compra neta = compra − devoluciones; participación = compra neta ÷ total; variación = (actual − anterior) ÷ anterior' }}>
            {tablas.ranking && <Tabla filas={d.proveedores} clave={p => `${p.nit}-${p.proveedor}`} columnas={[
              { titulo: 'Proveedor', celda: p => <span className="font-medium text-foreground">{p.proveedor}</span> },
              { titulo: 'NIT', celda: p => p.nit || '—' },
              { titulo: 'Compra', alinear: 'der', celda: p => dinero(p.compra) },
              { titulo: 'Devoluciones', alinear: 'der', celda: p => dinero(p.devoluciones) },
              { titulo: 'Neta', alinear: 'der', celda: p => dinero(p.compra_neta) },
              { titulo: 'Participación', alinear: 'der', celda: p => porcentaje(p.participacion) },
              { titulo: 'Variación', alinear: 'der', celda: p => { const v = variacion(p.compra_neta, p.compra_neta_previa); return v == null ? '—' : porcentaje(v) } },
            ]} />}
          </Bloque>
        </>}
        {activa === 'mensual' && <>
          <Bloque titulo="Compra y devoluciones por mes" ayuda={{ fuente: FUENTE, formula: 'Σ entradas EA/EAF y notas NP por mes' }}>
            <Areas datos={d.mensual.map(m => ({ ...m, etiqueta: etiquetaMes(m.mes) }))} ejeX="etiqueta" series={[
              { clave: 'compra', nombre: 'Compra', color: PALETA[0] },
              { clave: 'devoluciones', nombre: 'Devoluciones', color: PALETA[1] },
            ]} formato={dinero} />
          </Bloque>
          <Bloque titulo="Compra neta por proveedor y mes" ayuda={{ fuente: FUENTE, formula: 'Compra − devoluciones de cada proveedor por mes' }}>
            <MapaCalor filas={d.proveedores.map(p => ({ nombre: p.proveedor, valores: meses.map(mes => p.mensual.find(x => x.mes === mes)?.compra_neta ?? 0) }))} meses={meses.map(etiquetaMes)} formato={dinero} />
          </Bloque>
        </>}
        {activa === 'comparacion' && <Bloque titulo="Compra vs venta por marca" accion={<BotonTabla visible={!!tablas.comparacion} alAlternar={() => alternar('comparacion')} />} ayuda={{ fuente: `${FUENTE} Venta de ítems de inventario agrupada por marca del plan 05.`, formula: 'Venta ÷ compra neta por marca', nota: 'La venta está a precio de venta y la compra a costo; la razón no es un margen.' }}>
          <BarrasApiladas agrupadas datos={marcas.slice(0, 10).map(m => ({ ...m, corta: m.marca.length > 14 ? `${m.marca.slice(0, 13)}…` : m.marca }))} ejeX="corta" series={[
            { clave: 'compra_neta', nombre: 'Compra', color: PALETA[0] },
            { clave: 'venta', nombre: 'Venta', color: PALETA[1] },
          ]} formato={dinero} altura={340} />
          {tablas.comparacion && <Tabla filas={marcas} clave={m => m.marca} columnas={[
            { titulo: 'Marca', celda: m => <span className="font-medium text-foreground">{m.marca}</span> },
            { titulo: 'Compra', alinear: 'der', celda: m => dinero(m.compra_neta) },
            { titulo: 'Venta', alinear: 'der', celda: m => ventas ? dinero(m.venta) : '—' },
            { titulo: 'Venta / compra', alinear: 'der', celda: m => ventas && m.compra_neta > 0 ? porcentaje(m.venta / m.compra_neta) : '—' },
          ]} />}
        </Bloque>}
      </div>
    </SubPestanas>
  )
}
