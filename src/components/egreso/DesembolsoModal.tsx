import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { anticiposOperativosApi } from '@/api/anticiposOperativos'
import type { AnticipoOperativo } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { aviso } from '@/store/avisosStore'
import { formatters } from '@/utils/formatters'

type Opcion = 'propia' | 'prestada' | 'espera'

interface DesembolsoModalProps {
  anticipo: AnticipoOperativo
  onClose: () => void
  onSaved: () => void
}

export function DesembolsoModal({ anticipo, onClose, onSaved }: DesembolsoModalProps) {
  const [opcion, setOpcion] = useState<Opcion>('propia')
  const [caja, setCaja] = useState<'001' | '002'>('001')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enEspera = anticipo.estado.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() === 'ESPERA EFECTIVO'

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (guardando) return
    setGuardando(true)
    setError(null)
    const estado = opcion === 'espera' ? 'ESPERA EFECTIVO' : 'DESEMBOLSADO'
    const observacion = opcion === 'espera'
      ? 'Sin efectivo en caja: en espera de efectivo'
      : opcion === 'prestada'
        ? `Desembolso con efectivo prestado de la caja ${caja}`
        : 'Desembolso con efectivo de caja propia'
    try {
      await anticiposOperativosApi.cambiarEstado(anticipo.id, { estado, observacion })
      aviso.exito(estado === 'DESEMBOLSADO' ? `Egreso ${anticipo.numero_anticipo} desembolsado` : `Egreso ${anticipo.numero_anticipo} en espera de efectivo`)
      onSaved()
    } catch (err: unknown) {
      const respuesta = (err as { response?: { data?: { message?: string } } }).response
      setError(respuesta?.data?.message || 'No se pudo cambiar el estado del egreso')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal isOpen onClose={() => { if (!guardando) onClose() }} title="Desembolsar egreso" className="max-w-lg">
      <form onSubmit={guardar} className="space-y-5">
        <dl className="grid gap-3 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Número</dt><dd className="font-semibold">{anticipo.numero_anticipo}</dd></div>
          <div><dt className="text-muted-foreground">Solicitante</dt><dd className="font-semibold">{anticipo.usuario_nombre}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted-foreground">Valor a desembolsar</dt><dd className="text-lg font-semibold">{formatters.currency(anticipo.valor_solicitado)}</dd></div>
        </dl>
        <fieldset className="space-y-3">
          <legend className="mb-3 text-sm font-semibold">¿Hay efectivo para desembolsar?</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name="efectivo" checked={opcion === 'propia'} onChange={() => setOpcion('propia')} />
            Sí, en mi caja
          </label>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="efectivo" checked={opcion === 'prestada'} onChange={() => setOpcion('prestada')} />
              No en mi caja: tomar de otra caja
            </label>
            {opcion === 'prestada' && (
              <select aria-label="Caja de origen" value={caja} onChange={(event) => setCaja(event.target.value as '001' | '002')} className="ml-5 h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="001">Caja 001</option>
                <option value="002">Caja 002</option>
              </select>
            )}
          </div>
          {!enEspera && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="efectivo" checked={opcion === 'espera'} onChange={() => setOpcion('espera')} />
              No hay efectivo: dejar en espera
            </label>
          )}
        </fieldset>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {opcion === 'espera' ? 'Dejar en espera' : 'Desembolsar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
