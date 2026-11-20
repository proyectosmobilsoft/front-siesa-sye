import { LayoutGrid, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { INICIO, MAX_PESTANAS, etiquetaDe } from '@/config/pestanas'
import { usePestanasStore } from '@/store/pestanasStore'

/** Tira de pestañas del header (como las del navegador). El nombre es el de la subsección: "Asignar Facturas", no "Logística". */
export const PestanasHeader = () => {
  const navigate = useNavigate()
  const { tabs, activa, aviso, cerrar } = usePestanasStore()
  const todas = [INICIO, ...tabs]
  if (todas.length < 2 && !aviso) return null

  return (
    <nav aria-label="Pestañas de trabajo" role="tablist" className="mx-3 hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex [scrollbar-width:none]">
      {todas.map((tab) => {
        const { label, icon: Icono = LayoutGrid } = tab.key === INICIO.key ? { label: 'Dashboard', icon: undefined } : etiquetaDe(tab.key)
        const esActiva = tab.key === activa
        const Ic = Icono ?? LayoutGrid
        return (
          <span
            key={tab.key}
            className={cn(
              'group flex min-w-0 max-w-[200px] shrink-0 items-center rounded-lg border text-sm transition-colors',
              esActiva ? 'border-primary/30 bg-primary/10 font-semibold text-primary' : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <button
              type="button"
              role="tab"
              aria-selected={esActiva}
              title={label}
              className="flex min-w-0 items-center gap-1.5 py-1.5 pl-2.5 pr-1.5"
              onClick={() => navigate(tab.url)}
              onMouseDown={(e) => { if (e.button === 1 && tab.key !== INICIO.key) { e.preventDefault(); cerrar(tab.key) } }}
            >
              <Ic className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
            {tab.key !== INICIO.key && (
              <button
                type="button"
                aria-label={`Cerrar ${label}`}
                title="Cerrar pestaña"
                className={cn('mr-1 rounded p-0.5 hover:bg-foreground/10', esActiva ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}
                onClick={() => cerrar(tab.key)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        )
      })}
      {aviso && <span role="alert" className="shrink-0 whitespace-nowrap px-2 text-xs text-amber-600 dark:text-amber-400">Tienes {MAX_PESTANAS} pestañas abiertas. Cierra una para abrir otra.</span>}
    </nav>
  )
}
