import { useState } from 'react'
import { Printer, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { abrirPdfRCs } from '@/utils/abrirPdfRC'

/**
 * Genera un solo PDF con varios recibos de caja y las confirmaciones de transferencia amarradas a
 * cada uno. `obtenerRowids` se llama al hacer clic (puede ir a buscar los recibos); quedan fuera
 * los anulados porque quien arma la lista ya los descarta.
 */
export function BotonPdfRCs({ obtenerRowids, etiqueta = 'Generar PDF', titulo, compacto = false, deshabilitado = false, className }: {
  obtenerRowids: () => Promise<number[]> | number[]
  etiqueta?: string
  titulo?: string
  compacto?: boolean
  deshabilitado?: boolean
  className?: string
}) {
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const generar = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setCargando(true)
    setMensaje(null)
    try {
      const rowids = await obtenerRowids()
      if (!rowids.length) { setMensaje('No hay recibos para imprimir'); return }
      await abrirPdfRCs(rowids, { soportes: true })
    } catch {
      setMensaje('No se pudo generar el PDF, intenta de nuevo')
    } finally {
      setCargando(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={generar}
        disabled={cargando || deshabilitado}
        title={titulo ?? 'Un solo PDF con los recibos y las confirmaciones de transferencia de cada uno'}
        className={cn('nu-btn nu-btn-soft gap-1.5 text-xs', compacto ? 'h-7 px-2 text-[11px]' : 'h-9', className)}
      >
        {cargando ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
        {cargando ? 'Generando…' : etiqueta}
      </Button>
      {mensaje && <span role="alert" className="text-[10px] text-red-600 dark:text-red-400">{mensaje}</span>}
    </span>
  )
}
