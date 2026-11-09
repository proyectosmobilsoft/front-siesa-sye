import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Modal } from '@/components/ui/modal'
import { CuerpoConsulta } from '../comun'
import { BarrasH3D, Dona3D } from '../graficas3d'
import { PALETA, dinero, entero, porcentaje } from '../formato'
import type { RespuestaFacturasCartera } from '../ventas/tipos'
import { ClientesAcordeon } from './ClientesAcordeon'

const fecha = (s: string | null) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—')
const pct = (v: number | null | undefined) => (v == null ? '—' : porcentaje(v, 0))

/** Rango de fechas de una barra: "2019" → todo el año; "2026-09" → todo el mes. */
function rangoPeriodo(periodo: string) {
  if (periodo.length === 4) return { desde: `${periodo}-01-01`, hasta: `${periodo}-12-31` }
  const [a, m] = periodo.split('-').map(Number)
  const ultimo = new Date(a, m, 0).getDate()
  return { desde: `${periodo}-01`, hasta: `${periodo}-${String(ultimo).padStart(2, '0')}` }
}

/** Facturas a crédito vencidas sin pagar que se vendieron en un año o mes: quiénes son, en qué condición y cuánto deben. */
export function VencidasPeriodo({ periodo, etiqueta, alCerrar, antigua = false }: { periodo: string; etiqueta: string; alCerrar: () => void; /** Toda la cartera antigua (antes del corte), fuera de los totales. */ antigua?: boolean }) {
  const { desde, hasta } = antigua ? { desde: '2000-01-01', hasta: periodo } : rangoPeriodo(periodo)
  const consulta = useQuery({
    queryKey: ['cartera-vencidas-periodo', periodo, antigua],
    queryFn: async () => (await apiClient.get<{ success: boolean; data: RespuestaFacturasCartera }>('/dashboard/cartera/facturas', {
      params: antigua ? { antigua: 1, estado: 'abierta', orden: 'saldo', pagina: 1, tamano: 500 } : { desde, hasta, estado: 'impaga_vencida', credito: 1, orden: 'saldo', pagina: 1, tamano: 500 },
    })).data.data,
    staleTime: 5 * 60 * 1000,
  })
  const r = consulta.data
  const { clientes, condiciones } = useMemo(() => {
    const porCliente = new Map<number, { tercero: number; cliente: string; nit: string | null; facturas: number; saldo: number; mora: number; condiciones: Set<string> }>()
    const porCond = new Map<string, { nombre: string; saldo: number; facturas: number }>()
    for (const f of r?.filas ?? []) {
      const c = porCliente.get(f.tercero) ?? { tercero: f.tercero, cliente: f.cliente ?? f.nit ?? String(f.tercero), nit: f.nit, facturas: 0, saldo: 0, mora: 0, condiciones: new Set<string>() }
      c.facturas += 1; c.saldo += f.saldo; c.mora = Math.max(c.mora, f.dias_vs_vencimiento ?? 0); c.condiciones.add(f.condicion)
      porCliente.set(f.tercero, c)
      const k = porCond.get(f.condicion) ?? { nombre: f.condicion_nombre, saldo: 0, facturas: 0 }
      k.saldo += f.saldo; k.facturas += 1
      porCond.set(f.condicion, k)
    }
    return {
      clientes: [...porCliente.values()].sort((a, b) => b.saldo - a.saldo),
      condiciones: [...porCond.entries()].map(([condicion, v]) => ({ condicion, ...v })).sort((a, b) => b.saldo - a.saldo),
    }
  }, [r])
  const total = r?.totales.saldo ?? 0
  const top = clientes[0]

  return (
    <Modal isOpen onClose={alCerrar} className="max-w-6xl"
      title={antigua
        ? <span>Cartera antigua <span className="text-[13px] font-normal text-muted-foreground">· vendida antes de {fecha(periodo)}, fuera de los totales (para depurar)</span></span>
        : <span>Vencidas sin pagar vendidas en {etiqueta} <span className="text-[13px] font-normal text-muted-foreground">· facturas a crédito del {fecha(desde)} al {fecha(hasta)}</span></span>}>
      <CuerpoConsulta consulta={{ isLoading: consulta.isLoading, isError: consulta.isError }} altura="h-48" vacio={r != null && r.total === 0} mensajeVacio="No hay facturas vencidas de ese periodo">
        {r && <>
          <p className="mb-4 text-[13.5px] text-muted-foreground">
            <strong className="text-foreground">{entero(r.total)}</strong> facturas de <strong className="text-foreground">{entero(clientes.length)}</strong> {clientes.length === 1 ? 'cliente' : 'clientes'} siguen sin pagar: <strong className="text-foreground">{dinero(total)}</strong>.
            {top && <> El que más debe es <strong className="text-foreground">{top.cliente}</strong> con <strong className="text-foreground">{dinero(top.saldo)}</strong> ({pct(total ? top.saldo / total : null)}), con hasta {entero(top.mora)} días de atraso.</>}
          </p>
          <div className="mb-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl bg-card p-3 shadow-sm">
              <p className="text-[13px] font-black tracking-tight">¿Quién debe?</p>
              <p className="text-[11.5px] text-muted-foreground">Saldo vencido por cliente</p>
              <BarrasH3D datos={clientes.slice(0, 10).map((c, i) => ({ nombre: c.cliente.length > 26 ? `${c.cliente.slice(0, 25)}…` : c.cliente, valor: c.saldo, color: PALETA[i % PALETA.length] }))} formato={dinero} nombreValor="Saldo vencido" anchoEtiqueta={180} />
            </div>
            <div className="rounded-2xl bg-card p-3 shadow-sm">
              <p className="text-[13px] font-black tracking-tight">¿En qué condición de pago?</p>
              <p className="text-[11.5px] text-muted-foreground">Saldo vencido por condición</p>
              <Dona3D datos={condiciones.map((c, i) => ({ nombre: c.condicion, valor: c.saldo, color: PALETA[i % PALETA.length] }))} formato={dinero} altura={240} centro={condiciones[0]?.condicion ?? ''} porcentajeCentro={total && condiciones[0] ? condiciones[0].saldo / total : null} />
            </div>
          </div>
          <p className="mb-1 text-[13px] font-black tracking-tight">Clientes <span className="font-normal text-muted-foreground">· toca un cliente para desplegar sus facturas pendientes</span></p>
          <ClientesAcordeon facturas={r.filas} />
        </>}
      </CuerpoConsulta>
    </Modal>
  )
}
