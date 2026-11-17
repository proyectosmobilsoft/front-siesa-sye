import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Banknote, CheckCircle2 } from 'lucide-react'
import { Bloque } from '@/components/tablero/comun'
import { entero } from '@/components/tablero/formato'
import { Button } from '@/components/ui/button'
import type { MiDiaData } from './tipos'

interface PendienteItem {
  clave: string
  titulo: string
  descripcion: string
  ruta: string
  etiquetaBoton: string
  icono: typeof BadgeCheck
}

export function PendientesHoy({ data }: { data: MiDiaData }) {
  const items: PendienteItem[] = []

  const pendTransf = data.transferencias?.pendientes
  if (pendTransf != null && pendTransf > 0) {
    items.push({
      clave: 'transferencias',
      titulo: `${entero(pendTransf)} ${pendTransf === 1 ? 'transferencia por aprobar' : 'transferencias por aprobar'}`,
      descripcion: 'Solicitudes pendientes de revisión en tesorería',
      ruta: '/tesoreria/confirmacion-transferencias',
      etiquetaBoton: 'Revisar',
      icono: BadgeCheck,
    })
  }

  const pendEntregas = data.entregas?.por_confirmar
  if (pendEntregas != null && pendEntregas > 0) {
    items.push({
      clave: 'entregas',
      titulo: `${entero(pendEntregas)} ${pendEntregas === 1 ? 'entrega de recaudo por confirmar' : 'entregas de recaudo por confirmar'}`,
      descripcion: 'Efectivo reportado por conductores pendiente de validar',
      ruta: '/tesoreria/entrega-recaudo',
      etiquetaBoton: 'Validar',
      icono: Banknote,
    })
  }

  return (
    <Bloque
      titulo="Te está esperando"
      descripcion="Pendientes que requieren tu atención"
    >
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-4 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle2 className="size-5 shrink-0" />
          <p className="text-sm font-semibold">Todo al día ✓</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icono = item.icono
            return (
              <div
                key={item.clave}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/10"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-amber-600 dark:bg-white/10 dark:text-amber-400">
                    <Icono className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.titulo}</p>
                    <p className="text-xs text-muted-foreground">{item.descripcion}</p>
                  </div>
                </div>
                <Button asChild size="sm" className="gap-1.5 rounded-xl">
                  <Link to={item.ruta}>
                    {item.etiquetaBoton}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </Bloque>
  )
}
