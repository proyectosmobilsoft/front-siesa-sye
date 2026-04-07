import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'
import { financieroApi, CondicionPago } from '@/api/financiero'

interface CondicionPagoModalProps {
    isOpen: boolean
    onClose: () => void
    condicion: CondicionPago | null
}

export const CondicionPagoModal = ({ isOpen, onClose, condicion }: CondicionPagoModalProps) => {
    const isEditing = !!condicion

    const [code, setCode] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [status, setStatus] = useState(1)
    const [diasVcto, setDiasVcto] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return

        setCode(condicion?.code ?? '')
        setDescripcion(condicion?.descripcion ?? '')
        setStatus(condicion?.status === true || condicion?.status === 1 ? 1 : 0)
        setDiasVcto(condicion?.dias_vcto ?? 0)
        setError(null)
    }, [isOpen, condicion?.code])

    const handleSave = async () => {
        if (!code.trim() || !descripcion.trim()) {
            setError('Código y descripción son obligatorios')
            return
        }

        try {
            setIsSubmitting(true)
            setError(null)

            if (isEditing && condicion?.code) {
                await financieroApi.actualizarCondicionPago(condicion.code, {
                    cia: 1,
                    descripcion: descripcion.trim(),
                    dias_vcto: Number(diasVcto) || 0,
                    dias_pronto_pago: 0,
                    tasa_descto_pp: 0,
                    tasa_mora: 0,
                    monto_min_mora: 0,
                    notas: null,
                    numero_cuotas: 1,
                    ind_estado: status,
                })
            } else {
                await financieroApi.crearCondicionPago({
                    cia: 1,
                    codigo: code.trim(),
                    descripcion: descripcion.trim(),
                    dias_vcto: Number(diasVcto) || 0,
                    dias_pronto_pago: 0,
                    tasa_descto_pp: 0,
                    tasa_mora: 0,
                    monto_min_mora: 0,
                    notas: null,
                    numero_cuotas: 1,
                    modo_periodicidad: 1,
                    ind_estado: status,
                })
            }
            onClose()
        } catch (err: any) {
            console.error('Error al guardar condición de pago:', err)
            setError(err?.response?.data?.message || err?.message || 'Error al guardar')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Condición de Pago' : 'Nueva Condición de Pago'}
            className="max-w-lg"
        >
            <div className="mt-3 space-y-4">
                {error && (
                    <div className="p-2.5 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Código <span className="text-red-500">*</span></label>
                        <Input
                            placeholder="Ej. 30D"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="h-10"
                            autoComplete="off"
                            disabled={isEditing}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Estado</label>
                        <div
                            onClick={() => setStatus((s) => (s === 1 ? 0 : 1))}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all select-none h-10 ${status === 1 ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400' : 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400'}`}
                        >
                            <div className={`w-2.5 h-2.5 rounded-full ${status === 1 ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-sm font-semibold">{status === 1 ? 'Activo' : 'Inactivo'}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Descripción <span className="text-red-500">*</span></label>
                    <Input
                        placeholder="Ej. CREDITO 30 DIAS"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="h-10"
                        autoComplete="off"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Días Límite</label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={diasVcto}
                            onChange={(e) => setDiasVcto(Number(e.target.value) || 0)}
                            className="h-10"
                            min="0"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
