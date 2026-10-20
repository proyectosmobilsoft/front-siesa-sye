import { Fragment, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Hash } from 'lucide-react'
import type { CuadreCaja as CuadreCajaDatos, CuadreCajaDoc } from '@/api/cuadreCaja'
import { MontoAlineado } from '@/components/ui/monto-alineado'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { formatters } from '@/utils/formatters'
import { calcularCuadre, TIPOS_LIQUIDAN_TARJETA, type ColumnaMonto, type ConceptoCalculado, type MontosCuadre } from './cuadreCajaCalculos'
import { Cargando } from '@/components/ui/cargando'

type Filtro = 'todos' | 'APP' | 'SIESA' | 'consignacion'

const TITULO_COLUMNA: Record<ColumnaMonto, string> = {
  efectivo: 'Efectivo',
  tarjetas: 'Tarjetas',
  credito: 'Crédito',
  consignado: 'Consignado',
  otros: 'Otros',
  total: 'Total',
}

const POR_PAGINA = 25

export function CuadreCaja({ datos, cargando }: { datos: CuadreCajaDatos | null; cargando: boolean }) {
  const calculo = useMemo(() => (datos ? calcularCuadre(datos) : null), [datos])
  const [abiertos, setAbiertos] = useState<string[]>(['RECAUDOS'])

  if (cargando) {
    return <div className="nu-card"><Cargando texto="Cargando cuadre de caja" /></div>
  }
  if (!datos || !calculo) {
    return <div className="nu-card py-12 text-center text-sm text-muted-foreground">No hay datos de cuadre para mostrar.</div>
  }

  const columnas = calculo.columnas
  const alternar = (clave: string) =>
    setAbiertos((prev) => (prev.includes(clave) ? prev.filter((c) => c !== clave) : [...prev, clave]))

  const filaTotal = (nombre: string, montos: MontosCuadre, flujo = false) => (
    <tr className="border-b border-border bg-sky-500/10 font-bold">
      <td className="px-4 py-3 text-foreground">{nombre}</td>
      {columnas.map((col) => (
        <td key={col} className={cn('px-4 py-3 text-right', flujo && montos[col] < 0 && 'text-red-600 dark:text-red-400', col === 'total' && !flujo && 'text-primary')}>
          <MontoAlineado value={montos[col]} alinear="derecha" />
        </td>
      ))}
      <td className="px-4 py-3 text-right tabular-nums">{flujo ? '' : montos.docs}</td>
    </tr>
  )

  const tarjetas = [
    { nombre: 'Total ingresos', valor: calculo.ingresos.total, sub: `${calculo.ingresos.docs} documentos`, color: 'text-primary' },
    { nombre: 'Total egresos', valor: calculo.egresos.total, sub: `${calculo.egresos.docs} documentos`, color: 'text-red-600 dark:text-red-400' },
    { nombre: calculo.rotuloFlujo, valor: calculo.flujo.total, sub: 'Ingresos menos egresos (incluye crédito)', color: calculo.flujo.total >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400' },
    { nombre: 'Efectivo neto en caja', valor: calculo.flujo.efectivo, sub: 'Efectivo que entró menos el que salió', color: calculo.flujo.efectivo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 font-semibold text-primary">{calculo.periodo}</span>
        {!calculo.unDia && <span className="text-muted-foreground">Acumulado de todo el período</span>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((t) => (
          <div key={t.nombre} className="nu-card p-4">
            <p className="text-[10px] nu-th">{t.nombre}</p>
            <p className={cn('mt-1 text-lg font-extrabold', t.color)}><MontoAlineado value={t.valor} /></p>
            <p className="text-[11px] text-muted-foreground">{t.sub}</p>
          </div>
        ))}
      </div>

      <div className="nu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th className="px-4 py-3 text-left nu-th">Descripción o concepto</th>
                {columnas.map((col) => (
                  <th key={col} className="whitespace-nowrap px-4 py-3 text-right nu-th">{TITULO_COLUMNA[col]}</th>
                ))}
                <th className="px-4 py-3 text-right nu-th">Docs</th>
              </tr>
            </thead>
            <tbody>
              {calculo.porConcepto.map((concepto) => (
                <Fragment key={concepto.clave}>
                  {concepto.clave === 'PROVEEDORES' && filaTotal('TOTAL INGRESOS ===>', calculo.ingresos)}
                  <FilaConcepto
                    concepto={concepto}
                    columnas={columnas}
                    abierto={abiertos.includes(concepto.clave)}
                    onAlternar={() => alternar(concepto.clave)}
                  />
                </Fragment>
              ))}
              {filaTotal('TOTAL EGRESOS ===>', calculo.egresos)}
              {filaTotal(`${calculo.rotuloFlujo.toUpperCase()} ===>`, calculo.flujo, true)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FilaConcepto({ concepto, columnas, abierto, onAlternar }: { concepto: ConceptoCalculado; columnas: ColumnaMonto[]; abierto: boolean; onAlternar: () => void }) {
  const tieneDocs = concepto.documentos.length > 0
  const Icono = concepto.sentido === 'I' ? ArrowDownLeft : ArrowUpRight

  return (
    <>
      <tr
        onClick={tieneDocs ? onAlternar : undefined}
        className={cn('border-b border-border/40 transition-colors', tieneDocs && 'cursor-pointer', abierto ? 'bg-primary/5' : tieneDocs && 'hover:bg-muted/30')}
      >
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: abierto ? 90 : 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 24 }}
              className={cn('flex-shrink-0 text-muted-foreground/70', !tieneDocs && 'invisible')}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.div>
            <div className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full', concepto.sentido === 'I' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400')}>
              <Icono className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col">
              <span className={cn('font-semibold', concepto.clave === 'VENTAS' ? 'text-primary' : 'text-foreground')}>{concepto.nombre}</span>
              {concepto.clave === 'RECAUDOS' && tieneDocs && (
                <span className="text-[11px] text-muted-foreground">
                  {concepto.documentos.length} RC · {concepto.documentos.filter((d) => d.origen === 'APP').length} app/web · {concepto.documentos.filter((d) => d.origen === 'SIESA').length} SIESA
                </span>
              )}
            </div>
          </div>
        </td>
        {columnas.map((col) => (
          <td key={col} className={cn('px-4 py-2.5 text-right', col === 'total' ? 'font-semibold text-foreground' : 'text-foreground/90')}>
            <MontoAlineado value={concepto.montos[col]} alinear="derecha" />
          </td>
        ))}
        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{concepto.montos.docs}</td>
      </tr>
      <AnimatePresence initial={false}>
        {abierto && (
          <tr>
            <td colSpan={columnas.length + 2} className="bg-muted/20 p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <DetalleConcepto concepto={concepto} />
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

function Chip({ children, tono = 'neutro' }: { children: React.ReactNode; tono?: 'neutro' | 'app' | 'consignado' }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        tono === 'app' && 'border-primary/20 bg-primary/10 text-primary',
        tono === 'consignado' && 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
        tono === 'neutro' && 'border-border/60 bg-card text-foreground'
      )}
    >
      {children}
    </span>
  )
}

function DetalleConcepto({ concepto }: { concepto: ConceptoCalculado }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [limite, setLimite] = useState(POR_PAGINA)
  const [recogida, setRecogida] = useState<CuadreCajaDoc | null>(null)
  const documentos = concepto.documentos
  const esRecaudo = concepto.clave === 'RECAUDOS'
  const esVenta = concepto.clave === 'VENTAS'

  const texto = busqueda.trim().toLocaleLowerCase('es')
  const visibles = documentos.filter((doc) => {
    if (filtro === 'consignacion' && doc.consignado <= 0) return false
    if ((filtro === 'APP' || filtro === 'SIESA') && doc.origen !== filtro) return false
    if (!texto) return true
    return `${doc.tipo}#${doc.numero} ${doc.tipo} ${doc.numero} ${doc.tercero} ${doc.nit}`.toLocaleLowerCase('es').includes(texto)
  })

  // En el detalle solo van las columnas que el concepto usa; la grilla de afuera las muestra todas.
  const montos: ColumnaMonto[] = (['efectivo', 'tarjetas', 'consignado', 'credito', 'otros'] as const)
    .filter((col) => concepto.montos[col] !== 0)
  montos.push('total')
  const consignados = documentos.filter((d) => d.consignado > 0)
  const deApp = documentos.filter((d) => d.origen === 'APP').length

  const cambiarFiltro = (f: Filtro) => {
    setFiltro(f)
    setLimite(POR_PAGINA)
  }

  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {esRecaudo && (
          <>
            <Chip>{documentos.length} RC</Chip>
            <Chip tono="app">{deApp} de la app o la web</Chip>
            <Chip>{documentos.length - deApp} de SIESA</Chip>
            <Chip tono="consignado">{consignados.length} con consignación · {formatters.currency(consignados.reduce((s, d) => s + d.consignado, 0))}</Chip>
          </>
        )}
        {concepto.clave === 'CONSIGNACIONES' && (
          <>
            <Chip>Traslados a banco (TC1): {documentos.filter((d) => d.tipo === 'TC1').length}</Chip>
            <Chip>Tarjetas liquidadas en el recibo: {documentos.filter((d) => TIPOS_LIQUIDAN_TARJETA.includes(d.tipo)).length}</Chip>
          </>
        )}
        {concepto.clave === 'PROVEEDORES' && (
          <>
            <Chip>Desde caja (CE): {documentos.filter((d) => d.tipo === 'CE').length}</Chip>
            <Chip tono="consignado">Por banco (EB): {documentos.filter((d) => d.tipo === 'EB').length}</Chip>
          </>
        )}
        {esVenta && (
          <>
            <Chip>Contado: {documentos.filter((d) => d.total - d.credito > 0).length}</Chip>
            <Chip>Crédito: {documentos.filter((d) => d.credito > 0).length}</Chip>
          </>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {esRecaudo && (
            <div className="flex gap-1 nu-seg">
              {([['todos', 'Todos'], ['APP', 'App/Web'], ['SIESA', 'SIESA'], ['consignacion', 'Con consignación']] as const).map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  onClick={() => cambiarFiltro(valor)}
                  className={cn('rounded-full px-3 py-1 text-[11px] font-semibold transition-all', filtro === valor ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          )}
          <Input
            className="h-8 w-56 text-xs"
            placeholder="Buscar documento, tercero o NIT"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setLimite(POR_PAGINA)
            }}
          />
        </div>
      </div>

      <div className="max-h-[460px] overflow-auto rounded-lg border border-border/40 bg-card">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
            <tr className="border-b border-border/60">
              <th className="px-3 py-2 text-left nu-th">Documento</th>
              <th className="px-3 py-2 text-left nu-th">C.O.</th>
              <th className="px-3 py-2 text-left nu-th">Fecha</th>
              <th className="px-3 py-2 text-left nu-th">Tercero</th>
              <th className="px-3 py-2 text-left nu-th">Creado por</th>
              {montos.map((col) => (
                <th key={col} className="px-3 py-2 text-right nu-th">{TITULO_COLUMNA[col]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.slice(0, limite).map((doc) => (
              <FilaDocumento key={doc.rowid} doc={doc} montos={montos} marcarConsignado={esRecaudo} onVerFacturas={() => setRecogida(doc)} />
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={5 + montos.length} className="py-6 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Sin documentos para este filtro</td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 bg-card">
            <tr className="border-t-2 border-border bg-muted/40 font-bold">
              <td colSpan={5} className="px-3 py-2">
                Total {concepto.nombre.toLowerCase()}
                <span className="ml-2 text-[11px] font-semibold text-muted-foreground">{documentos.length} documento{documentos.length !== 1 ? 's' : ''}</span>
              </td>
              {montos.map((col) => (
                <td key={col} className={cn('px-3 py-2 text-right', col === 'total' && 'text-primary')}>
                  <MontoAlineado value={concepto.montos[col]} alinear="derecha" />
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {visibles.length > limite && (
        <div className="flex justify-center">
          <button className="nu-btn nu-btn-soft px-4 py-1.5 text-xs font-semibold" onClick={() => setLimite((l) => l + POR_PAGINA)}>
            Ver {Math.min(POR_PAGINA, visibles.length - limite)} más (quedan {visibles.length - limite})
          </button>
        </div>
      )}

      <Modal
        isOpen={!!recogida}
        onClose={() => setRecogida(null)}
        title={
          <>
            <span className="block">Ventas de contado POS · C.O. {recogida?.co}</span>
            <span className="block text-sm font-normal text-muted-foreground">
              Recogida R01#{recogida?.numero} · Fecha: {formatters.dateOnly(recogida?.fecha)}
            </span>
          </>
        }
        className="max-w-2xl"
      >
        <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Factura</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {(recogida?.facturas_pos ?? []).map((f) => (
                <tr key={`${f.tipo}-${f.numero}`} className="border-t border-border/60">
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                    {f.tipo} {f.numero}
                    {f.tipo === 'N01' && <span className="ml-1.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-600 dark:text-red-400">Nota</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="block font-medium">{f.tercero}</span>
                    {f.nit && <span className="block text-[10px] text-muted-foreground">NIT {f.nit}</span>}
                  </td>
                  <td className={cn('px-4 py-2.5 text-right', f.valor < 0 && 'text-red-600 dark:text-red-400')}>
                    <MontoAlineado value={f.valor} alinear="derecha" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-muted">
              <tr className="border-t-2 border-border font-semibold">
                <td className="px-4 py-3" colSpan={2}>Total (igual a la recogida)</td>
                <td className="px-4 py-3 text-right font-bold text-primary">
                  <MontoAlineado value={(recogida?.facturas_pos ?? []).reduce((acc, f) => acc + f.valor, 0)} alinear="derecha" />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Modal>
    </div>
  )
}

function FilaDocumento({ doc, montos, marcarConsignado, onVerFacturas }: { doc: CuadreCajaDoc; montos: ColumnaMonto[]; marcarConsignado: boolean; onVerFacturas: () => void }) {
  return (
    <tr className="border-b border-border/30 last:border-0 hover:bg-muted/30">
      <td className="whitespace-nowrap px-3 py-2 font-semibold text-primary">
        <span className="flex items-center gap-1">
          <Hash className="h-3 w-3" />
          {doc.tipo}#{doc.numero}
          {marcarConsignado && doc.consignado > 0 && (
            <span className="ml-1 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-sky-700 dark:text-sky-300">Consignado</span>
          )}
        </span>
      </td>
      <td className="px-3 py-2 tabular-nums text-muted-foreground">{doc.co}</td>
      <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatters.dateOnly(doc.fecha)}</td>
      <td className="max-w-[260px] px-3 py-2">
        <span className="block truncate font-medium" title={doc.tercero}>{doc.tercero || '—'}</span>
        {doc.nit && <span className="block text-[10px] text-muted-foreground">NIT {doc.nit}</span>}
        {doc.traslado && (
          <span className="block truncate text-[10px] text-muted-foreground" title={doc.traslado.motivo}>
            {doc.traslado.medio}{doc.traslado.usuario ? ` · por ${doc.traslado.usuario}` : ''}{doc.traslado.motivo ? ` · ${doc.traslado.motivo}` : ''}
          </span>
        )}
        {(doc.facturas_pos?.length ?? 0) > 0 && (
          <button className="nu-btn nu-btn-soft mt-1 h-6 px-2 text-[10px] font-semibold" onClick={onVerFacturas}>
            Ver {doc.facturas_pos?.length} facturas
          </button>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <span className={cn('mr-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', doc.origen === 'APP' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
          {doc.origen === 'APP' ? 'App/Web' : 'SIESA'}
        </span>
        <span className="text-muted-foreground">{doc.origen === 'APP' ? doc.creado_por : doc.usuario}</span>
      </td>
      {montos.map((col) => (
        <td key={col} className={cn('px-3 py-2 text-right', col === 'total' && 'font-semibold')}>
          <MontoAlineado value={doc[col]} alinear="derecha" />
        </td>
      ))}
    </tr>
  )
}
