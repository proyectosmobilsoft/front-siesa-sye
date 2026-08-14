import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { AlertCircle, Loader2 } from 'lucide-react'
import { maestroCuentasBancariasApi, CuentaBancariaConfig, CuentaBancariaSiesa } from '@/api/maestroCuentasBancarias'

interface CuentaBancariaModalProps {
    isOpen: boolean
    onClose: () => void
    cuenta: CuentaBancariaConfig | null
}

export const CuentaBancariaModal = ({ isOpen, onClose, cuenta }: CuentaBancariaModalProps) => {
    const isEditing = !!cuenta

    const [catalogo, setCatalogo] = useState<CuentaBancariaSiesa[]>([])
    const [loadingCatalogo, setLoadingCatalogo] = useState(false)
    const [seleccion, setSeleccion] = useState('')
    const [idCia, setIdCia] = useState('')
    const [idCuenta, setIdCuenta] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return

        setIdCia(cuenta?.f026_id_cia != null ? String(cuenta.f026_id_cia) : '')
        setIdCuenta(cuenta?.f026_id ?? '')
        setSeleccion('')
        setError(null)

        if (!isEditing) {
            setLoadingCatalogo(true)
            maestroCuentasBancariasApi.listarCatalogoSiesa()
                .then(setCatalogo)
                .catch((err) => {
                    console.error('Error cargando catálogo de cuentas bancarias SIESA:', err)
                    setCatalogo([])
                })
                .finally(() => setLoadingCatalogo(false))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, cuenta?.id])

    const handleSeleccionCatalogo = (clave: string) => {
        setSeleccion(clave)
        const encontrada = catalogo.find((c) => `${c.f026_id_cia}|${c.f026_id}` === clave)
        if (encontrada) {
            setIdCia(String(encontrada.f026_id_cia))
            setIdCuenta(encontrada.f026_id)
        }
    }

    const handleSave = async () => {
        if (!idCia.trim() || !idCuenta.trim()) {
            setError('Compañía y código de cuenta son obligatorios')
            return
        }
        if (!/^[0-9]+$/.test(idCia.trim())) {
            setError('La compañía debe ser numérica (ej. 1)')
            return
        }

        try {
            setIsSubmitting(true)
            setError(null)

            const dto = {
                id_cia: Number(idCia.trim()),
                id_cuenta: idCuenta.trim(),
            }

            if (isEditing && cuenta?.id) {
                await maestroCuentasBancariasApi.actualizarConfig(cuenta.id, dto)
            } else {
                await maestroCuentasBancariasApi.crearConfig(dto)
            }
            onClose()
        } catch (err: any) {
            console.error('Error al guardar cuenta bancaria:', err)
            setError(err?.response?.data?.message || err?.message || 'Error al guardar')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
            className="max-w-lg"
        >
            <div className="mt-3 space-y-4">
                {error && (
                    <div className="p-2.5 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {!isEditing && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Cuenta SIESA <span className="text-destructive">*</span>
                        </label>
                        <Select
                            value={seleccion}
                            onChange={(e) => handleSeleccionCatalogo(e.target.value)}
                            disabled={loadingCatalogo}
                            className="h-10"
                        >
                            <option value="">
                                {loadingCatalogo ? 'Cargando cuentas...' : 'Selecciona una cuenta'}
                            </option>
                            {catalogo.map((c) => (
                                <option key={`${c.f026_id_cia}-${c.f026_id}`} value={`${c.f026_id_cia}|${c.f026_id}`}>
                                    {c.f026_descripcion} (CIA {c.f026_id_cia} · Cuenta {c.f026_id})
                                </option>
                            ))}
                        </Select>
                        {loadingCatalogo ? (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" /> Consultando catálogo real de SIESA...
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Muestra todas las cuentas de SIESA que aún no están en el maestro ({catalogo.length} disponibles).
                            </p>
                        )}
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    Se valida contra SIESA antes de guardar. La cuenta debe existir en la compañía indicada.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compañía (CIA) <span className="text-destructive">*</span></label>
                        <Input
                            value={idCia}
                            onChange={(e) => setIdCia(e.target.value)}
                            className="h-10 font-mono"
                            autoComplete="off"
                            placeholder="1"
                            disabled={!isEditing}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código de cuenta <span className="text-destructive">*</span></label>
                        <Input
                            value={idCuenta}
                            onChange={(e) => setIdCuenta(e.target.value)}
                            className="h-10 font-mono"
                            autoComplete="off"
                            placeholder="001"
                            disabled={!isEditing}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
