import { dinero, entero, porcentaje } from '../formato'
import type { CuadreCartera } from '../ventas/tipos'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const fecha = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
const pct = (v: number | null | undefined) => (v == null ? '—' : porcentaje(v, 0))
/** Día anterior a `iso` (el saldo inicial de octubre es el saldo al 30/09). */
const diaAntes = (iso: string) => {
  const f = new Date(`${iso}T00:00:00`)
  f.setDate(f.getDate() - 1)
  return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`
}
/** "octubre" si el rango es un mes completo; si no, "el periodo". */
function nombrePeriodo(desde: string, hasta: string) {
  const fin = new Date(`${hasta}T00:00:00`)
  const ultimo = new Date(fin.getFullYear(), fin.getMonth() + 1, 0).getDate()
  const mesCompleto = desde.slice(0, 7) === hasta.slice(0, 7) && desde.endsWith('-01') && Number(hasta.slice(8)) === ultimo
  return mesCompleto ? MESES[fin.getMonth()] : 'el periodo'
}

/**
 * Cuadre práctico del mes (pedido de gerencia): el saldo inicial es lo que había por cobrar al empezar el mes
 * (= saldo final del mes anterior). Tres números: cuánto había que cobrar, cuánto se cobró de eso y cuánto quedó.
 * Lo facturado dentro del mes va aparte: se cobra en el mes siguiente (es parte del próximo saldo inicial).
 */
export function CuadreSaldos({ c, desde, hasta, titulo }: { c: CuadreCartera; desde: string; hasta: string; titulo: string }) {
  const periodo = nombrePeriodo(desde, hasta)
  const enPeriodo = periodo === 'el periodo' ? 'en el periodo' : `en ${periodo}`
  // "Cobrado" = plata que entró (recibos de caja) + cruces (anticipos aplicados). Notas y ajustes bajan la deuda pero no son cobro.
  const cobrado = c.abonos_saldo_anterior.recaudo + c.abonos_saldo_anterior.cruces
  const notas = c.abonos_saldo_anterior.notas + c.abonos_saldo_anterior.ajustes + c.abonos_saldo_anterior.otros
  const efectividad = c.saldo_anterior ? cobrado / c.saldo_anterior : null
  const tono = efectividad == null ? 'text-foreground' : efectividad >= 0.7 ? 'text-emerald-600' : efectividad >= 0.4 ? 'text-amber-600' : 'text-red-600'
  const cobradoNuevo = c.abonos_periodo.recaudo + c.abonos_periodo.cruces

  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-[15px] font-black tracking-tight text-foreground">{titulo}</h2>

      {/* Lo principal, explícito: saldo inicial y saldo final del periodo. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-muted/50 p-4">
          <p className="text-[0.7rem] font-black tracking-widest text-muted-foreground uppercase">Saldo inicial de {periodo}</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-foreground">{dinero(c.saldo_anterior)}</p>
          <p className="text-xs text-muted-foreground">Lo que se debía al {diaAntes(desde)} · {entero(c.documentos_anterior)} facturas</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-4">
          <p className="text-[0.7rem] font-black tracking-widest text-muted-foreground uppercase">Saldo final de {periodo}</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-foreground">{dinero(c.saldo_final)}</p>
          <p className="text-xs text-muted-foreground">Lo que se debe al {fecha(hasta)} · {entero(c.documentos_final)} facturas · es el saldo inicial del mes siguiente</p>
        </div>
      </div>

      {/* Qué pasó con el saldo inicial. */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-emerald-500/10 p-4">
          <p className="text-[0.625rem] font-black tracking-widest text-muted-foreground uppercase">Cobrado del saldo inicial</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-400">{dinero(cobrado)} <span className={`text-base ${tono}`}>({pct(efectividad)})</span></p>
          <p className="text-xs text-muted-foreground">Recibos de caja y cruces {enPeriodo}{notas > 0 && <> · además {dinero(notas)} en notas y ajustes</>}</p>
        </div>
        <div className="rounded-2xl bg-red-500/10 p-4">
          <p className="text-[0.625rem] font-black tracking-widest text-muted-foreground uppercase">Pendiente del saldo inicial</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-red-600">{dinero(c.saldo_final_de_anterior)} <span className="text-base">({pct(c.saldo_anterior ? c.saldo_final_de_anterior / c.saldo_anterior : null)})</span></p>
          <p className="text-xs text-muted-foreground">De lo que se debía al empezar, esto sigue sin pagar</p>
        </div>
      </div>

      {/* Barra de avance: qué parte del saldo inicial se cobró. */}
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-red-500/20" role="img" aria-label={`Se cobró ${pct(efectividad)} del saldo inicial`}>
        <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, (efectividad ?? 0) * 100))}%` }} />
      </div>

      <p className="mt-4 rounded-xl bg-muted/40 px-4 py-3 text-[12.5px] text-muted-foreground">
        Cómo se llega al saldo final: saldo inicial {dinero(c.saldo_anterior)} + facturado {enPeriodo} {dinero(c.facturado)} − cobrado y notas {dinero(c.abonos_total.total)} = <strong className="text-foreground">{dinero(c.saldo_final)}</strong>.
        {' '}De lo facturado {enPeriodo} ya se cobraron {dinero(cobradoNuevo)}.
      </p>
    </div>
  )
}
