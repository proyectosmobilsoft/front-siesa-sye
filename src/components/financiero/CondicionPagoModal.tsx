import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw, Plus, Trash2, AlertCircle } from 'lucide-react'
import { financieroApi, CondicionPago } from '@/api/financiero'

export type DetalleForm = {
    id?: number
    name: string
    porcentaje_descuento: number
    dias_limite: number
    mostrar_aviso: boolean
    activo: boolean
    descripcion: string
}

interface CondicionPagoModalProps {
    isOpen: boolean
    onClose: () => void
    condicion: CondicionPago | null
}

const emptyDetalle = (): DetalleForm => ({
    name: '',
    porcentaje_descuento: 0,
    dias_limite: 0,
    mostrar_aviso: true,
    activo: true,
    descripcion: '',
})

export const CondicionPagoModal = ({ isOpen, onClose, condicion }: CondicionPagoModalProps) => {
    const isEditing = !!condicion

    const [code, setCode] = useState('')
    const [name, setName] = useState('')
    const [status, setStatus] = useState(1)
    const [detalles, setDetalles] = useState<DetalleForm[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [loadingDetail, setLoadingDetail] = useState(false)

    useEffect(() => {
        if (!isOpen) return

        setCode(condicion?.code ?? '')
        setName(condicion?.name ?? '')
        setStatus(condicion?.status === true || condicion?.status === 1 ? 1 : 0)
        setError(null)

        if (condicion?.id && condicion?.detalles === undefined) {
            setLoadingDetail(true)
            financieroApi
                .obtenerCondicionPago(condicion.id)
                .then((res) => {
                    const data = res.data
                    setCode(data.code ?? '')
                    setName(data.name ?? '')
                    setStatus(data.status === true || data.status === 1 ? 1 : 0)
                    setDetalles(
                        data.detalles?.length
                            ? data.detalles.map((d) => ({
                                  id: d.id,
                                  name: d.name ?? '',
                                  porcentaje_descuento: d.porcentaje_descuento ?? 0,
                                  dias_limite: d.dias_limite ?? 0,
                                  mostrar_aviso: d.mostrar_aviso ?? true,
                                  activo: d.activo ?? true,
                                  descripcion: d.descripcion ?? '',
                              }))
                            : [emptyDetalle()]
                    )
                })
                .catch(() => setDetalles([emptyDetalle()]))
                .finally(() => setLoadingDetail(false))
        } else if (condicion?.detalles?.length) {
            setDetalles(
                condicion.detalles.map((d) => ({
                    id: d.id,
                    name: d.name ?? '',
                    porcentaje_descuento: d.porcentaje_descuento ?? 0,
                    dias_limite: d.dias_limite ?? 0,
                    mostrar_aviso: d.mostrar_aviso ?? true,
                    activo: d.activo ?? true,
                    descripcion: d.descripcion ?? '',
                }))
            )
        } else {
            setDetalles([emptyDetalle()])
        }
    }, [isOpen, condicion?.id])

    const addDetalle = () => {
        setDetalles((prev) => [...prev, emptyDetalle()])
    }

    const removeDetalle = (index: number) => {
        setDetalles((prev) => {
            const next = prev.filter((_, i) => i !== index)
            return next.length ? next : [emptyDetalle()]
        })
    }

    const updateDetalle = (index: number, field: keyof DetalleForm, value: string | number | boolean) => {
        setDetalles((prev) =>
            prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
        )
    }

    const handleSave = async () => {
        if (!code.trim() || !name.trim()) {
            setError('Código y nombre son obligatorios')
            return
        }

        try {
            setIsSubmitting(true)
            setError(null)

            const detallesPayload = detalles
                .filter((d) => d.name.trim() !== '')
                .map((d) => ({
                    name: d.name.trim(),
                    porcentaje_descuento: Number(d.porcentaje_descuento) || 0,
                    dias_limite: Number(d.dias_limite) || 0,
                    mostrar_aviso: d.mostrar_aviso,
                    activo: d.activo,
                    descripcion: d.descripcion?.trim() || null,
                }))

            if (isEditing && condicion?.id) {
                await financieroApi.actualizarCondicionPago(condicion.id, {
                    code: code.trim(),
                    name: name.trim(),
                    status,
                    detalles: detallesPayload.length ? detallesPayload : undefined,
                })
            } else {
                await financieroApi.crearCondicionPago({
                    code: code.trim(),
                    name: name.trim(),
                    status,
                    detalles: detallesPayload.length ? detallesPayload : undefined,
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
            className="max-w-4xl"
        >
            <div className="mt-3 space-y-4">
                {loadingDetail && (
                    <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Cargando detalles...
                    </div>
                )}
                {!loadingDetail && (
                <>
                {error && (
                    <div className="p-2.5 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Código <span className="text-red-500">*</span></label>
                        <Input
                            placeholder="Ej. contraentrega"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="h-10"
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Nombre <span className="text-red-500">*</span></label>
                        <Input
                            placeholder="Ej. CONTRAENTREGA"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-10"
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Estado</label>
                        <div
                            onClick={() => setStatus((s) => (s === 1 ? 0 : 1))}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all select-none h-10 ${status === 1 ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400' : 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400'}`}
                        >
                            <div className={`w-2.5 h-2.5 rounded-full ${status === 1 ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-xs font-semibold">{status === 1 ? 'Activo' : 'Inactivo'}</span>
                        </div>
                    </div>
                </div>

                {/* Detalles (config descuentos) */}
                <div className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Configuración de descuentos</span>
                        <Button type="button" variant="outline" size="sm" onClick={addDetalle} className="gap-1">
                            <Plus className="h-4 w-4" />
                            Agregar
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="h-9 px-2 text-left font-medium text-muted-foreground">Nombre</th>
                                    <th className="h-9 px-2 text-left font-medium text-muted-foreground">% Desc.</th>
                                    <th className="h-9 px-2 text-left font-medium text-muted-foreground">Días límite</th>
                                    <th className="h-9 px-2 text-left font-medium text-muted-foreground">Aviso</th>
                                    <th className="h-9 px-2 text-left font-medium text-muted-foreground">Activo</th>
                                    <th className="h-9 px-2 text-right font-medium text-muted-foreground">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detalles.map((d, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="py-1.5 px-2">
                                            <Input
                                                placeholder="Nombre descuento"
                                                value={d.name}
                                                onChange={(e) => updateDetalle(index, 'name', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </td>
                                        <td className="py-1.5 px-2">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min={0}
                                                value={d.porcentaje_descuento || ''}
                                                onChange={(e) => updateDetalle(index, 'porcentaje_descuento', e.target.value)}
                                                className="h-8 w-20 text-sm"
                                            />
                                        </td>
                                        <td className="py-1.5 px-2">
                                            <Input
                                                type="number"
                                                min={0}
                                                value={d.dias_limite || ''}
                                                onChange={(e) => updateDetalle(index, 'dias_limite', e.target.value)}
                                                className="h-8 w-20 text-sm"
                                            />
                                        </td>
                                        <td className="py-1.5 px-2">
                                            <div
                                                onClick={() => updateDetalle(index, 'mostrar_aviso', !d.mostrar_aviso)}
                                                className={`cursor-pointer text-xs px-2 py-1 rounded border w-fit ${d.mostrar_aviso ? 'bg-green-500/10 border-green-500/30' : 'bg-muted border-border'}`}
                                            >
                                                {d.mostrar_aviso ? 'Sí' : 'No'}
                                            </div>
                                        </td>
                                        <td className="py-1.5 px-2">
                                            <div
                                                onClick={() => updateDetalle(index, 'activo', !d.activo)}
                                                className={`cursor-pointer text-xs px-2 py-1 rounded border w-fit ${d.activo ? 'bg-green-500/10 border-green-500/30' : 'bg-muted border-border'}`}
                                            >
                                                {d.activo ? 'Sí' : 'No'}
                                            </div>
                                        </td>
                                        <td className="py-1.5 px-2 text-right">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-destructive"
                                                onClick={() => removeDetalle(index)}
                                                title="Quitar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting} size="sm" className="px-4">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSubmitting} size="sm" className="px-4 gap-2">
                        {isSubmitting ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                {isEditing ? 'Actualizando...' : 'Guardando...'}
                            </>
                        ) : isEditing ? (
                            'Actualizar'
                        ) : (
                            'Guardar'
                        )}
                    </Button>
                </div>
                </>
                )}
            </div>
        </Modal>
    )
}
