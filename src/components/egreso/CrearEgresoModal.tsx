import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { anticiposOperativosApi } from '@/api/anticiposOperativos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useAuthStore } from '@/store/authStore'
import { aviso } from '@/store/avisosStore'

interface CrearEgresoModalProps {
  onClose: () => void
  onCreated: () => void
}

const opcionesArea = ['Logística', 'Transporte', 'Operaciones', 'Administración']
const opcionesPrioridad = ['Baja', 'Media', 'Alta', 'Urgente']
const campo = 'space-y-1.5'
const etiqueta = 'block text-sm font-medium'
const selector = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const texto = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function hoyIso() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

function fechaVisible(iso: string) {
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

export function CrearEgresoModal({ onClose, onCreated }: CrearEgresoModalProps) {
  const sesion = useAuthStore((state) => state.sesion)
  const [hoy] = useState(hoyIso)
  const [area, setArea] = useState('Logística')
  const [motivo, setMotivo] = useState('')
  const [prioridad, setPrioridad] = useState('Media')
  const [valor, setValor] = useState('')
  const [valorTocado, setValorTocado] = useState(false)
  const [observacion, setObservacion] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valorNumerico = Number(valor)
  const valido = !!area && !!motivo.trim() && valorNumerico > 0

  const solicitarConfirmacion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setValorTocado(true)
    if (valido && !guardando) {
      setError(null)
      setConfirmando(true)
    }
  }

  const guardar = async () => {
    if (!valido || guardando) return
    setGuardando(true)
    setError(null)
    try {
      const creado = await anticiposOperativosApi.crear({
        area_departamento: area,
        motivo_general: motivo.trim(),
        prioridad,
        forma_entrega: 'Transferencia',
        observaciones: observacion.trim() || null,
        valor_solicitado: valorNumerico,
      })
      aviso.exito(`Egreso creado: ${creado.numero_anticipo}`)
      onCreated()
    } catch (err: unknown) {
      const respuesta = (err as { response?: { data?: { message?: string } } }).response
      setError(respuesta?.data?.message || 'No se pudo guardar la solicitud de egreso')
      setConfirmando(false)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal isOpen onClose={() => { if (!guardando) onClose() }} title="Nuevo egreso" className="max-w-xl">
      <form onSubmit={solicitarConfirmacion} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={campo}>
            <label htmlFor="egreso-numero" className={etiqueta}>Número de egreso</label>
            <Input id="egreso-numero" value="Se genera automáticamente" disabled />
          </div>
          <div className={campo}>
            <label htmlFor="egreso-fecha" className={etiqueta}>Fecha de solicitud</label>
            <Input id="egreso-fecha" value={fechaVisible(hoy)} disabled />
          </div>
        </div>

        <div className={campo}>
          <label htmlFor="egreso-responsable" className={etiqueta}>Responsable del egreso</label>
          <Input id="egreso-responsable" value={sesion?.nombre_completo || sesion?.usuario || ''} disabled />
        </div>

        <div className={campo}>
          <label htmlFor="egreso-area" className={etiqueta}>Área / Departamento *</label>
          <select id="egreso-area" value={area} onChange={(event) => setArea(event.target.value)} className={selector} required disabled={guardando || confirmando}>
            {opcionesArea.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
          </select>
        </div>

        <div className={campo}>
          <label htmlFor="egreso-motivo" className={etiqueta}>Motivo general del egreso *</label>
          <textarea id="egreso-motivo" value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="Describa el motivo" rows={3} className={texto} required disabled={guardando || confirmando} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={campo}>
            <label htmlFor="egreso-prioridad" className={etiqueta}>Prioridad</label>
            <select id="egreso-prioridad" value={prioridad} onChange={(event) => setPrioridad(event.target.value)} className={selector} disabled={guardando || confirmando}>
              {opcionesPrioridad.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
            </select>
          </div>
          <div className={campo}>
            <label htmlFor="egreso-valor" className={etiqueta}>Valor total solicitado *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input id="egreso-valor" type="text" inputMode="numeric" value={valor ? Number(valor).toLocaleString('en-US') : ''} onChange={(event) => { setValor(event.target.value.replace(/\D/g, '')); setValorTocado(true) }} onBlur={() => setValorTocado(true)} className="pl-7" placeholder="0" disabled={guardando || confirmando} />
            </div>
            {valorTocado && valorNumerico <= 0 && <p role="alert" className="text-xs text-destructive">Debe ser mayor a 0</p>}
          </div>
        </div>

        <div className={campo}>
          <label htmlFor="egreso-observacion" className={etiqueta}>Observación</label>
          <textarea id="egreso-observacion" value={observacion} onChange={(event) => setObservacion(event.target.value)} rows={2} className={texto} disabled={guardando || confirmando} />
        </div>

        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        {confirmando && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            ¿Desea guardar esta solicitud de egreso?
          </div>
        )}

        <div className="flex justify-end gap-3">
          {confirmando ? (
            <>
              <Button type="button" variant="outline" onClick={() => setConfirmando(false)} disabled={guardando}>Volver</Button>
              <Button type="button" onClick={() => void guardar()} disabled={guardando} className="gap-2">
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}Confirmar
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
              <Button type="submit" disabled={!valido || guardando}>Guardar</Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  )
}
