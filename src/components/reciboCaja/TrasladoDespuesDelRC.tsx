import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, RefreshCw } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCajasTraspaso, useCrearTrasladoFondos } from '@/hooks/useTrasladoFondos'
import axios from 'axios'
import { trasladoFondosApi } from '@/api/trasladoFondos'
import type { CajaTraspaso, MedioPagoTraspaso } from '@/api/types'
import { formatters } from '@/utils/formatters'

/** Lo que dejó el RC en la caja, por medio de pago (la transferencia va al banco, no a la caja). */
export interface FondosDelRC { numero: string; co: string; caja: string; efectivo: number; debito: number; credito: number }

const MEDIOS: { codigo: MedioPagoTraspaso; etiqueta: string; campo: 'efectivo' | 'debito' | 'credito'; saldo: 'saldo_efectivo' | 'saldo_tarjeta_debito' | 'saldo_tarjeta_credito' }[] = [
  { codigo: 'EFE', etiqueta: 'Efectivo', campo: 'efectivo', saldo: 'saldo_efectivo' },
  { codigo: 'TD', etiqueta: 'Tarjeta débito', campo: 'debito', saldo: 'saldo_tarjeta_debito' },
  { codigo: 'TC', etiqueta: 'Tarjeta crédito', campo: 'credito', saldo: 'saldo_tarjeta_credito' },
]
/** Traslados ya hechos de este RC, por medio. Vive en quien abre la ventana para que cerrarla y abrirla de nuevo no permita repetirlos. */
export type TrasladosHechos = Record<string, { numeroTc: number; valor: number }>
type Estado = { fase: 'listo' | 'confirmando' | 'enviando' | 'error' | 'incierto'; mensaje?: string }
/** Sin respuesta del servidor o error 5xx: el TC pudo haberse creado aunque la petición falló. */
const resultadoIncierto = (e: unknown) => axios.isAxiosError(e) && (!e.response || e.code === 'ECONNABORTED' || e.response.status >= 500)
const diaIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const limpio = (v: unknown) => String(v ?? '').trim()
const AUXILIAR_CAJA_GENERAL = '11050501'
const mensajeError = (e: unknown) => (e as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ?? (e as Error).message ?? 'No se pudo hacer el traslado'

/**
 * Traslado de fondos justo después de crear un RC en la web: sale de la caja del RC (Vía 40 en el 001,
 * Ferretería 80 en el 002) y entra a la Caja General del mismo C.O. Por cada medio con valor se hace un
 * traslado aparte (en SIESA cada medio es su propio documento TC), con confirmación antes de crearlo.
 */
export function TrasladoDespuesDelRC({ rc, hechos, alHacer, alCerrar }: { rc: FondosDelRC; hechos: TrasladosHechos; alHacer: (codigo: string, hecho: { numeroTc: number; valor: number }) => void; alCerrar: () => void }) {
  const queryClient = useQueryClient()
  const cajas = useCajasTraspaso()
  const crear = useCrearTrasladoFondos()
  const lista = cajas.data
  const origen: CajaTraspaso | undefined = useMemo(() => lista?.find(c => limpio(c.id_caja) === rc.caja && limpio(c.id_co) === rc.co), [lista, rc.caja, rc.co])
  // La Caja General se reconoce por su auxiliar (11050501 en el 001 y en el 002): el maestro de cajas
  // la renombra ("CAJA GENERAL 002"), así que comparar el nombre exacto no la encontraba.
  const destino: CajaTraspaso | undefined = useMemo(() => {
    const delCo = lista?.filter(c => limpio(c.id_co) === rc.co) ?? []
    return delCo.find(c => limpio(c.auxiliar) === AUXILIAR_CAJA_GENERAL)
      ?? delCo.find(c => limpio(c.nombre).toUpperCase().startsWith('CAJA GENERAL'))
  }, [lista, rc.co])
  const filas = MEDIOS.filter(m => rc[m.campo] > 0)
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(MEDIOS.map(m => [m.codigo, String(rc[m.campo])])))
  const [estados, setEstados] = useState<Record<string, Estado>>({})
  const [notas, setNotas] = useState(`Traslado del RC ${rc.numero}`)
  const poner = (codigo: string, estado: Estado) => setEstados(actual => ({ ...actual, [codigo]: estado }))

  // Saldos al día: lo que se trasladó hace un momento ya no está en la lista guardada.
  useEffect(() => { void cajas.refetch() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** Busca en el historial si el traslado (mismas cajas, medio y valor) se creó después de `desde`. */
  const buscarCreado = async (medio: (typeof MEDIOS)[number], valor: number, desde: number) => {
    if (!origen || !destino) return null
    const ayer = new Date(Date.now() - 86_400_000); const manana = new Date(Date.now() + 86_400_000)
    const historial = await trasladoFondosApi.listar({ fechaInicial: diaIso(ayer), fechaFinal: diaIso(manana) })
    return historial.find(t => t.estado_siesa !== 'anulado' && limpio(t.id_caja_origen) === limpio(origen.id_caja) && limpio(t.id_co_origen) === limpio(origen.id_co)
      && limpio(t.id_caja_destino) === limpio(destino.id_caja) && limpio(t.id_co_destino) === limpio(destino.id_co)
      && Number(t.valor) === valor && (t.medio_pago || 'EFE') === medio.codigo && Date.parse(t.created_at) >= desde - 60_000 && t.numero_tc != null) ?? null
  }

  const verificar = async (medio: (typeof MEDIOS)[number], valor: number, desde: number) => {
    poner(medio.codigo, { fase: 'enviando' })
    try {
      const creado = await buscarCreado(medio, valor, desde)
      if (creado) { alHacer(medio.codigo, { numeroTc: Number(creado.numero_tc), valor }); void queryClient.invalidateQueries({ queryKey: ['caja-traspaso'] }); return }
      poner(medio.codigo, { fase: 'error', mensaje: 'El traslado no aparece en el historial: no se creó. Puedes intentarlo de nuevo.' })
    } catch {
      poner(medio.codigo, { fase: 'incierto', mensaje: 'No se pudo confirmar si el traslado se creó. No lo repitas hasta revisarlo.' })
    }
  }

  const trasladar = async (medio: (typeof MEDIOS)[number]) => {
    if (!origen || !destino || hechos[medio.codigo]) return
    const valor = Number(valores[medio.codigo])
    const desde = Date.now()
    poner(medio.codigo, { fase: 'enviando' })
    try {
      const creado = await crear.mutateAsync({
        id_caja_origen: limpio(origen.id_caja), id_caja_destino: limpio(destino.id_caja),
        id_co_origen: limpio(origen.id_co), rowid_auxiliar_origen: origen.rowid_auxiliar,
        id_co_destino: limpio(destino.id_co), rowid_auxiliar_destino: destino.rowid_auxiliar,
        valor, notas: notas.trim() || undefined, medio_pago: medio.codigo,
      })
      alHacer(medio.codigo, { numeroTc: creado.consec_docto, valor })
      void queryClient.invalidateQueries({ queryKey: ['caja-traspaso'] })
      void cajas.refetch()
    } catch (e) {
      // Si la petición falló por red o por el servidor, el TC pudo crearse: se verifica antes de permitir reintentar.
      if (resultadoIncierto(e)) await verificar(medio, valor, desde)
      else poner(medio.codigo, { fase: 'error', mensaje: mensajeError(e) })
    }
  }

  const nombre = (c?: CajaTraspaso) => c ? `${limpio(c.nombre)} (C.O. ${limpio(c.id_co)})` : '—'
  return (
    <Modal isOpen onClose={alCerrar} title={`Trasladar fondos del RC ${rc.numero}`} className="max-w-xl">
      <div className="space-y-4 text-sm">
        {cajas.isLoading && <p className="text-muted-foreground">Cargando cajas…</p>}
        {cajas.isError && <p role="alert" className="text-red-600">No se pudieron cargar las cajas. <button type="button" className="underline" onClick={() => void cajas.refetch()}>Reintentar</button></p>}
        {lista && (!origen || !destino) && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
          No se encontró la {!origen ? `caja del RC (${rc.caja}, C.O. ${rc.co})` : `Caja General del C.O. ${rc.co}`}. Haz el traslado desde Traslado de Fondos.
        </p>}
        {origen && destino && <>
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
            <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Sale de</p><p className="truncate font-semibold">{nombre(origen)}</p></div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Entra a</p><p className="truncate font-semibold">{nombre(destino)}</p></div>
          </div>
          <p className="text-xs text-muted-foreground">La caja de destino es la Caja General del mismo C.O. del recibo. Cada medio de pago se traslada por separado.</p>
          {filas.length === 0 && <p className="text-muted-foreground">Este recibo no dejó efectivo ni tarjetas en la caja (las transferencias van al banco), no hay nada que trasladar.</p>}
          {filas.map(m => {
            const hecho = hechos[m.codigo]
            const estado = estados[m.codigo] ?? { fase: 'listo' }
            const valor = Number(valores[m.codigo])
            const saldo = Number(origen[m.saldo]) || 0
            const invalido = !(valor > 0)
            const sinSaldo = valor > saldo
            return (
              <div key={m.codigo} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{m.etiqueta}</p>
                  <p className="text-xs text-muted-foreground">Del RC: {formatters.currency(rc[m.campo])} · Saldo en la caja: {formatters.currency(saldo)}</p>
                </div>
                {hecho ? (
                  <p role="status" className="mt-2 flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400"><Check className="h-4 w-4" aria-hidden />Trasladado: TC-{hecho.numeroTc} por {formatters.currency(hecho.valor)}</p>
                ) : estado.fase === 'incierto' ? (
                  <div className="mt-2 space-y-2">
                    <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">{estado.mensaje}</p>
                    <Button size="sm" variant="outline" onClick={() => void verificar(m, valor, Date.now() - 10 * 60_000)}>Revisar si se creó</Button>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`valor-${m.codigo}`}>Valor a trasladar en {m.etiqueta}</label>
                    <Input id={`valor-${m.codigo}`} type="number" min="1" step="1" className="w-40 text-right tabular-nums" value={valores[m.codigo]}
                      disabled={estado.fase === 'enviando'} onChange={e => { setValores(v => ({ ...v, [m.codigo]: e.target.value })); poner(m.codigo, { fase: 'listo' }) }} />
                    {estado.fase === 'confirmando'
                      ? <>
                        <Button size="sm" onClick={() => void trasladar(m)}>Confirmar traslado de {formatters.currency(valor)}</Button>
                        <Button size="sm" variant="outline" onClick={() => poner(m.codigo, { fase: 'listo' })}>Cancelar</Button>
                      </>
                      : <Button size="sm" disabled={invalido || estado.fase === 'enviando'} onClick={() => poner(m.codigo, { fase: 'confirmando' })}>
                        {estado.fase === 'enviando' ? <><RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />Trasladando…</> : 'Realizar traslado'}
                      </Button>}
                  </div>
                )}
                {!hecho && sinSaldo && !invalido && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">El valor supera el saldo de la caja origen ({formatters.currency(saldo)}); la caja quedaría en negativo.</p>}
                {estado.fase === 'error' && <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{estado.mensaje}</p>}
              </div>
            )
          })}
          {filas.length > 0 && <label className="block space-y-1 text-xs font-medium text-muted-foreground">Notas del traslado
            <Input value={notas} maxLength={200} onChange={e => setNotas(e.target.value)} />
          </label>}
        </>}
        <div className="flex justify-end"><Button variant="outline" onClick={alCerrar}>Cerrar</Button></div>
      </div>
    </Modal>
  )
}
