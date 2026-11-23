import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * El mismo botón "Crear" en todas las pantallas. Cada pantalla decide qué crea
 * mediante `onClick`; se ubica junto a "Exportar Excel".
 */
export function BotonCrear({ onClick, etiqueta = 'Crear', titulo, className, disabled }: {
  onClick: () => void
  etiqueta?: string
  titulo?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <Button type="button" size="sm" title={titulo} className={cn('h-9 gap-1.5 text-xs', className)} onClick={onClick} disabled={disabled}>
      <Plus className="h-3.5 w-3.5" /> {etiqueta}
    </Button>
  )
}
