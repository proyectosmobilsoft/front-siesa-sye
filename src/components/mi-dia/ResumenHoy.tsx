import { ArrowRightLeft, BadgeCheck, Banknote, Receipt, Sparkles, type LucideIcon } from 'lucide-react'
import { Bloque, Malla } from '@/components/tablero/comun'
import { dinero, entero } from '@/components/tablero/formato'
import { cn } from '@/lib/utils'
import type { MiDiaData } from './tipos'

interface TarjetaResumen {
  clave: string
  titulo: string
  frase: string
  detalle?: string
  icono: LucideIcon
  activa: boolean
  tono: 'ok' | 'info' | 'marca' | 'neutro'
}

const ESTILO_TONO = {
  ok: {
    fondo: 'bg-emerald-50 dark:bg-emerald-500/10',
    icono: 'bg-white/80 text-emerald-600 dark:bg-white/10 dark:text-emerald-400',
  },
  info: {
    fondo: 'bg-blue-50 dark:bg-blue-500/10',
    icono: 'bg-white/80 text-blue-600 dark:bg-white/10 dark:text-blue-400',
  },
  marca: {
    fondo: 'bg-primary/[0.06] dark:bg-primary/10',
    icono: 'bg-primary/10 text-primary',
  },
  neutro: {
    fondo: 'bg-muted/60',
    icono: 'bg-card text-muted-foreground',
  },
} as const

function construirTarjetas(data: MiDiaData): TarjetaResumen[] {
  const tarjetas: TarjetaResumen[] = []

  if (data.transferencias !== null) {
    const t = data.transferencias
    const totalMovs = t.aprobadas_hoy + t.rechazadas_hoy + t.creadas_hoy
    let frase = 'Sin movimientos de transferencias hoy'
    const notas: string[] = []

    if (t.aprobadas_hoy > 0) {
      frase = `Aprobaste ${entero(t.aprobadas_hoy)} ${t.aprobadas_hoy === 1 ? 'transferencia' : 'transferencias'} por ${dinero(t.valor_aprobado_hoy)}`
      if (t.rechazadas_hoy > 0) {
        notas.push(`Rechazaste ${entero(t.rechazadas_hoy)}`)
      }
      if (t.creadas_hoy > 0) {
        notas.push(`Registraste ${entero(t.creadas_hoy)}`)
      }
    } else if (t.creadas_hoy > 0) {
      frase = `Creaste ${entero(t.creadas_hoy)} ${t.creadas_hoy === 1 ? 'confirmación de transferencia' : 'confirmaciones de transferencia'}`
      if (t.rechazadas_hoy > 0) {
        notas.push(`Rechazaste ${entero(t.rechazadas_hoy)}`)
      }
    } else if (t.rechazadas_hoy > 0) {
      frase = `Rechazaste ${entero(t.rechazadas_hoy)} ${t.rechazadas_hoy === 1 ? 'transferencia' : 'transferencias'} hoy`
    }

    tarjetas.push({
      clave: 'transferencias',
      titulo: 'Transferencias',
      frase,
      detalle: notas.length > 0 ? notas.join(' · ') : undefined,
      icono: BadgeCheck,
      activa: totalMovs > 0,
      tono: totalMovs > 0 ? 'ok' : 'neutro',
    })
  }

  if (data.entregas !== null) {
    const e = data.entregas
    const activa = e.confirmadas_hoy > 0
    tarjetas.push({
      clave: 'entregas',
      titulo: 'Entregas de recaudo',
      frase: activa
        ? `Confirmaste ${entero(e.confirmadas_hoy)} ${e.confirmadas_hoy === 1 ? 'entrega' : 'entregas'} de recaudo`
        : 'Sin entregas confirmadas hoy',
      detalle: activa ? `Por ${dinero(e.valor_confirmado_hoy)}` : undefined,
      icono: Banknote,
      activa,
      tono: activa ? 'info' : 'neutro',
    })
  }

  if (data.traslados !== null) {
    const tr = data.traslados
    const activa = tr.hechos_hoy > 0
    tarjetas.push({
      clave: 'traslados',
      titulo: 'Traslados de fondos',
      frase: activa
        ? `Hiciste ${entero(tr.hechos_hoy)} ${tr.hechos_hoy === 1 ? 'traslado' : 'traslados'} de fondos`
        : 'Sin traslados de fondos hoy',
      detalle: activa ? `Por ${dinero(tr.valor_hoy)}` : undefined,
      icono: ArrowRightLeft,
      activa,
      tono: activa ? 'marca' : 'neutro',
    })
  }

  if (data.recibos !== null) {
    const r = data.recibos
    const activa = r.cantidad > 0
    tarjetas.push({
      clave: 'recibos',
      titulo: 'Recibos de caja',
      frase: activa
        ? `Creaste ${entero(r.cantidad)} ${r.cantidad === 1 ? 'recibo' : 'recibos'} de caja`
        : 'Sin recibos de caja creados hoy',
      detalle: activa ? `Por ${dinero(r.valor)}` : undefined,
      icono: Receipt,
      activa,
      tono: activa ? 'ok' : 'neutro',
    })
  }

  return tarjetas
}

export function ResumenHoy({ data }: { data: MiDiaData }) {
  const tarjetas = construirTarjetas(data)
  if (tarjetas.length === 0) return null

  const hayMovimientos = tarjetas.some((t) => t.activa)

  return (
    <Bloque
      titulo="Lo que has hecho hoy"
      descripcion="Movimientos registrados con tu usuario durante la jornada"
    >
      {!hayMovimientos ? (
        <div className="flex items-center gap-3 rounded-2xl bg-muted/50 px-4 py-5 text-sm text-muted-foreground">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </span>
          <p className="font-medium text-foreground">
            Aún no has registrado movimientos hoy.
          </p>
        </div>
      ) : (
        <Malla columnas={2}>
          {tarjetas.map((t) => {
            const Icono = t.icono
            const estilo = ESTILO_TONO[t.tono]
            return (
              <div
                key={t.clave}
                className={cn(
                  'flex items-start justify-between gap-3 rounded-3xl p-4 sm:p-5',
                  estilo.fondo
                )}
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-muted-foreground">
                    {t.titulo}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold leading-snug text-foreground">
                    {t.frase}
                  </p>
                  {t.detalle && (
                    <p className="mt-1 text-[12.5px] font-medium text-muted-foreground tabular-nums">
                      {t.detalle}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-2xl',
                    estilo.icono
                  )}
                >
                  <Icono className="size-5" />
                </span>
              </div>
            )
          })}
        </Malla>
      )}
    </Bloque>
  )
}
