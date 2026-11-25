import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { anticiposOperativosApi } from '@/api/anticiposOperativos'
import type { AnticipoOperativo, CajaDesembolso } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { aviso } from '@/store/avisosStore'
import { formatters } from '@/utils/formatters'

interface DesembolsoModalProps {
  anticipo: AnticipoOperativo
  onClose: () => void
  onSaved: () => void
}

const mensajeError = (err: unknown, fallback: string): string => {
  const respuesta = (err as { response?: { data?: { message?: string } } }).response
  return respuesta?.data?.message || fallback
}

export function DesembolsoModal({ anticipo, onClose, onSaved }: DesembolsoModalProps) {
  const [idCaja, setIdCaja] = useState<CajaDesembolso['id_caja'] | ''>('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valor = anticipo.valor_aprobado ?? anticipo.valor_solicitado
  const autorizada = anticipo.estado.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() === 'AUTORIZADA'
  const { data: cajas, isFetching, error: errorCajas, refetch } = useQuery({
    queryKey: ['cajas-desembolso'],
    queryFn: anticiposOperativosApi.cajasDesembolso,
    staleTime: 0,
    retry: false,
  })
  const ningunaAlcanza = !isFetching && !errorCajas && !!cajas && cajas.every((caja) => caja.saldo_efectivo < valor)
  const cajaElegida = !isFetching && !errorCajas && cajas?.find((caja) => caja.id_caja === idCaja && caja.saldo_efectivo >= valor)

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (guardando || !cajaElegida) return
    setGuardando(true)
    setError(null)
    try {
      const resultado = await anticiposOperativosApi.desembolsar(anticipo.id, cajaElegida.id_caja)
      aviso.exito(`Desembolsado: ${resultado.docto}`)
      onSaved()
    } catch (err: unknown) {
      setError(mensajeError(err, 'No se pudo desembolsar el egreso'))
    } finally {
      setGuardando(false)
    }
  }

  const dejarEnEspera = async () => {
    if (guardando || !autorizada || !ningunaAlcanza) return
    setGuardando(true)
    setError(null)
    try {
      await anticiposOperativosApi.cambiarEstado(anticipo.id, {
        estado: 'ESPERA EFECTIVO',
        observacion: 'Sin efectivo en caja: en espera de efectivo',
      })
      aviso.exito(`Egreso ${anticipo.numero_anticipo} en espera de efectivo`)
      onSaved()
    } catch (err: unknown) {
      setError(mensajeError(err, 'No se pudo dejar el egreso en espera'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal isOpen onClose={() => { if (!guardando) onClose() }} title="Desembolsar egreso" className="max-w-lg">
      <form onSubmit={guardar} className="space-y-5">
        <dl className="grid gap-3 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Número</dt><dd className="font-semibold">{anticipo.numero_anticipo}</dd></div>
          <div><dt className="text-muted-foreground">Solicitante (tercero del documento)</dt><dd className="font-semibold">{anticipo.usuario_nombre}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted-foreground">Valor a desembolsar</dt><dd className="text-lg font-semibold">{formatters.currency(valor)}</dd></div>
        </dl>

        <div className="space-y-2">
          <label htmlFor="caja-desembolso" className="text-sm font-medium">¿De qué caja se desembolsa?</label>
          <Select
            id="caja-desembolso"
            value={idCaja}
            onChange={(event) => { setIdCaja(event.target.value as CajaDesembolso['id_caja'] | ''); setError(null) }}
            disabled={isFetching || !!errorCajas || guardando || !cajas?.length}
          >
            <option value="">{isFetching ? 'Cargando cajas…' : 'Selecciona una caja'}</option>
            {cajas?.map((caja) => (
              <option key={caja.id_caja} value={caja.id_caja} disabled={caja.saldo_efectivo < valor}>
                {caja.nombre} — efectivo {formatters.currency(caja.saldo_efectivo)}{caja.saldo_efectivo < valor ? ' (efectivo insuficiente)' : ''}
              </option>
            ))}
          </Select>
          {errorCajas && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-destructive">{mensajeError(errorCajas, 'No se pudieron cargar las cajas')}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => { void refetch() }}>Reintentar</Button>
            </div>
          )}
          {ningunaAlcanza && <p className="text-sm text-destructive">Ninguna caja tiene efectivo suficiente</p>}
        </div>

        <p className="text-sm text-muted-foreground">Se generará en SIESA un documento PCE: débito a Anticipos camiones a nombre del solicitante y crédito a la caja elegida.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
          {ningunaAlcanza && autorizada && (
            <Button type="button" variant="outline" onClick={dejarEnEspera} disabled={guardando}>
              {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Dejar en espera de efectivo
            </Button>
          )}
          <Button type="submit" disabled={guardando || !cajaElegida}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Desembolsar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
