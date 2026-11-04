import { useState } from 'react'
import { Printer, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { abrirPdfRC } from '@/utils/abrirPdfRC'

/**
 * Botón que abre el PDF de un recibo de caja. Reutilizable en cualquier lugar
 * donde aparezca un RC: solo necesita el Rowid del documento.
 */
export function BotonPdfRC({ rowid, conTexto = false, className }: { rowid: number; conTexto?: boolean; className?: string }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(false)

  const abrir = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setCargando(true)
    setError(false)
    try {
      await abrirPdfRC(rowid)
    } catch {
      setError(true)
    } finally {
      setCargando(false)
    }
  }

  return (
    <button
      type="button"
      onClick={abrir}
      disabled={cargando}
      title={error ? 'No se pudo generar el PDF, intenta de nuevo' : 'Ver PDF del recibo'}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors',
        error ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'text-primary hover:bg-primary/10',
        cargando && 'opacity-60',
        className
      )}
    >
      {cargando ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
      {conTexto && (error ? 'Reintentar PDF' : 'PDF')}
    </button>
  )
}
