import { useRef, useState, type RefObject } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportarTablasDe, raizConTablas } from '@/utils/exportarTablas'
import { cn } from '@/lib/utils'

/**
 * Botón "Exportar Excel" para cualquier tablero: descarga las tablas que se están viendo.
 *
 * Se pone junto a los filtros o al botón de actualizar. Sin más datos, exporta las tablas del
 * contenedor más pequeño que lo rodea y que tenga alguna; si ese contenedor es muy amplio (varias
 * tablas que no se quieren juntas) se le pasa `alcance` con la referencia del bloque que se quiere
 * exportar. Exporta lo que muestra la pantalla: respeta filtros y la página en curso, y las celdas de
 * dinero y cantidades salen como números.
 */
export function BotonExcel({ nombre, alcance, className, disabled }: {
  /** Nombre del archivo (sin fecha ni extensión) */
  nombre: string
  alcance?: RefObject<HTMLElement | null>
  className?: string
  disabled?: boolean
}) {
  const envoltura = useRef<HTMLSpanElement>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const exportar = async () => {
    const raiz = alcance?.current ?? raizConTablas(envoltura.current)
    setAviso(null)
    if (!raiz) { setAviso('No hay nada para exportar'); return }
    setTrabajando(true)
    try {
      const n = await exportarTablasDe(raiz, nombre)
      if (n === 0) setAviso('No hay filas para exportar')
    } catch (e) {
      console.error('Error exportando a Excel:', e)
      setAviso('No se pudo exportar')
    } finally {
      setTrabajando(false)
      setTimeout(() => setAviso(null), 3500)
    }
  }

  return (
    <span ref={envoltura} className="inline-flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" className={cn('h-9 gap-1.5 text-xs', className)} onClick={() => void exportar()} disabled={trabajando || disabled}>
        {trabajando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} Exportar Excel
      </Button>
      {aviso && <span role="status" className="text-xs text-muted-foreground">{aviso}</span>}
    </span>
  )
}
