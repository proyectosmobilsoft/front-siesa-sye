import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'
import { conceptosApi, Concepto } from '@/api/conceptos'

interface ConceptoModalProps {
    isOpen: boolean
    onClose: () => void
    concepto: Concepto | null
}

export const ConceptoModal = ({ isOpen, onClose, concepto }: ConceptoModalProps) => {
    const isEditing = !!concepto

    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [estado, setEstado] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return

        setNombre(concepto?.nombre ?? '')
        setDescripcion(concepto?.descripcion ?? '')
        setEstado(concepto?.estado === false ? 0 : 1)
        setError(null)
    }, [isOpen, concepto?.id])

    const handleSave = async () => {
        if (!nombre.trim()) {
            setError('El nombre es obligatorio')
            return
        }

        try {
            setIsSubmitting(true)
            setError(null)

            const payload = {
                nombre: nombre.trim(),
                descripcion: descripcion.trim() || null,
                estado: estado === 1,
            }

            if (isEditing && concepto?.id != null) {
                await conceptosApi.actualizar(concepto.id, payload)
            } else {
                await conceptosApi.crear(payload)
            }
            onClose()
        } catch (err: any) {
            console.error('Error al guardar concepto:', err)
            setError(err?.response?.data?.message || err?.message || 'Error al guardar')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Concepto' : 'Nuevo Concepto'}
            className="max-w-lg"
        >
            <div className="mt-3 space-y-4">
                {error && (
                    <div className="p-2.5 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre <span className="text-destructive">*</span></label>
                        <Input
                            placeholder="Ej. PEAJES"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="h-10"
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</label>
                        <div
                            onClick={() => setEstado((s) => (s === 1 ? 0 : 1))}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all select-none h-10 ${estado === 1 ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400' : 'border-destructive/50 bg-destructive/10 text-destructive'}`}
                        >
                            <div className={`w-2.5 h-2.5 rounded-full ${estado === 1 ? 'bg-green-500' : 'bg-destructive'}`} />
                            <span className="text-sm font-semibold">{estado === 1 ? 'Activo' : 'Inactivo'}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descripción</label>
                    <Input
                        placeholder="Detalle opcional del concepto"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="h-10"
                        autoComplete="off"
                    />
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
