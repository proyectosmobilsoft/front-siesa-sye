import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Loader2 } from 'lucide-react'
import { interfazContableApi, InterfazContableVehiculo } from '@/api/interfazContable'
import { seguridadApi, UsuarioMaster } from '@/api/seguridad'

interface InterfazContableModalProps {
    isOpen: boolean
    onClose: () => void
    registro: InterfazContableVehiculo | null
}

export const InterfazContableModal = ({ isOpen, onClose, registro }: InterfazContableModalProps) => {
    const isEditing = !!registro

    const [conductores, setConductores] = useState<UsuarioMaster[]>([])
    const [loadingConductores, setLoadingConductores] = useState(false)

    const [usuarioId, setUsuarioId] = useState<number | null>(null)
    const [maquinariaCod, setMaquinariaCod] = useState<number | null>(null)
    const [cuenta, setCuenta] = useState('')
    const [observaciones, setObservaciones] = useState('')
    const [estado, setEstado] = useState(1)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Conductor seleccionado y las placas que tiene asignadas
    const conductor = conductores.find((c) => c.id === usuarioId) ?? null
    const placas = conductor?.maquinarias ?? []

    useEffect(() => {
        if (!isOpen) return

        setUsuarioId(registro?.usuario_id ?? null)
        setMaquinariaCod(registro?.maquinaria_cod ?? null)
        setCuenta(registro?.cuenta_contable ?? '')
        setObservaciones(registro?.observaciones ?? '')
        setEstado(registro?.estado === false ? 0 : 1)
        setError(null)

        const cargar = async () => {
            try {
                setLoadingConductores(true)
                const res = await seguridadApi.listarConductores()
                setConductores(res.data ?? [])
            } catch (err) {
                console.error('Error cargando conductores:', err)
                setConductores([])
            } finally {
                setLoadingConductores(false)
            }
        }
        cargar()
    }, [isOpen, registro?.id])

    // Al cambiar de conductor, la placa elegida deja de ser válida
    const handleConductorChange = (id: number | null) => {
        setUsuarioId(id)
        setMaquinariaCod(null)
    }

    const handleSave = async () => {
        if (!usuarioId) {
            setError('Debe seleccionar un conductor')
            return
        }
        if (!maquinariaCod) {
            setError('Debe seleccionar una placa')
            return
        }
        if (!/^\d+$/.test(cuenta.trim())) {
            setError('La cuenta contable debe contener solo dígitos')
            return
        }

        try {
            setIsSubmitting(true)
            setError(null)

            const payload = {
                usuario_id: usuarioId,
                maquinaria_cod: maquinariaCod,
                cuenta_contable: cuenta.trim(),
                observaciones: observaciones.trim() || null,
                estado: estado === 1,
            }

            if (isEditing && registro?.id != null) {
                await interfazContableApi.actualizar(registro.id, payload)
            } else {
                await interfazContableApi.crear(payload)
            }
            onClose()
        } catch (err: any) {
            console.error('Error al guardar la relación contable:', err)
            setError(err?.response?.data?.message || err?.message || 'Error al guardar')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Cuenta Contable' : 'Relacionar Cuenta Contable'}
            className="max-w-2xl"
        >
            <div className="mt-3 space-y-4">
                {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Conductor <span className="text-destructive">*</span>
                        </label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={usuarioId ?? ''}
                            onChange={(e) => handleConductorChange(e.target.value ? Number(e.target.value) : null)}
                            disabled={loadingConductores}
                        >
                            <option value="">{loadingConductores ? 'Cargando...' : 'Seleccione un conductor'}</option>
                            {conductores.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre_completo || c.usuario}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Placa <span className="text-destructive">*</span>
                        </label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={maquinariaCod ?? ''}
                            onChange={(e) => setMaquinariaCod(e.target.value ? Number(e.target.value) : null)}
                            disabled={!usuarioId || placas.length === 0}
                        >
                            <option value="">
                                {!usuarioId
                                    ? 'Seleccione primero un conductor'
                                    : placas.length === 0
                                        ? 'Este conductor no tiene placas asignadas'
                                        : 'Seleccione una placa'}
                            </option>
                            {placas.map((p) => (
                                <option key={p.maquinaria_cod} value={p.maquinaria_cod}>
                                    {p.placa || 'Sin placa'}{p.en_uso ? ' — En uso' : ''}
                                    {p.categoria ? ` (${p.categoria})` : ''}
                                </option>
                            ))}
                        </select>
                        {usuarioId && placas.length === 0 && !loadingConductores && (
                            <p className="text-xs text-muted-foreground">
                                Asigne placas al conductor desde Maestros → Usuarios.
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Cuenta contable <span className="text-destructive">*</span>
                        </label>
                        <Input
                            inputMode="numeric"
                            placeholder="Ej. 11050501"
                            value={cuenta}
                            // Solo dígitos: el backend rechaza cualquier otra cosa
                            onChange={(e) => setCuenta(e.target.value.replace(/\D/g, '').slice(0, 20))}
                            className="h-10 font-mono"
                            autoComplete="off"
                        />
                        <p className="text-xs text-muted-foreground">Solo números, máximo 20 dígitos</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</label>
                        <div
                            onClick={() => setEstado((s) => (s === 1 ? 0 : 1))}
                            className={`flex h-10 cursor-pointer select-none items-center justify-center gap-2 rounded-lg border-2 px-3 py-2 transition-all ${estado === 1 ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400' : 'border-destructive/50 bg-destructive/10 text-destructive'}`}
                        >
                            <div className={`h-2.5 w-2.5 rounded-full ${estado === 1 ? 'bg-green-500' : 'bg-destructive'}`} />
                            <span className="text-sm font-semibold">{estado === 1 ? 'Activo' : 'Inactivo'}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observaciones</label>
                    <Input
                        placeholder="Notas opcionales..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="h-10"
                        autoComplete="off"
                    />
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={isSubmitting} className="gap-2">
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
