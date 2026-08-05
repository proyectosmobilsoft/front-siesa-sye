import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { AlertCircle, Loader2 } from 'lucide-react'
import { maestroCajasApi, Caja } from '@/api/maestroCajas'
import { trasladoFondosApi } from '@/api/trasladoFondos'
import { CajaTraspaso } from '@/api/types'

interface CajaModalProps {
    isOpen: boolean
    onClose: () => void
    caja: Caja | null
    cajasExistentes?: Caja[]
}

export const CajaModal = ({ isOpen, onClose, caja, cajasExistentes = [] }: CajaModalProps) => {
    const isEditing = !!caja

    const [catalogo, setCatalogo] = useState<CajaTraspaso[]>([])
    const [loadingCatalogo, setLoadingCatalogo] = useState(false)
    const [seleccion, setSeleccion] = useState('')
    const [nombre, setNombre] = useState('')
    const [idCo, setIdCo] = useState('')
    const [auxiliarContable, setAuxiliarContable] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return

        setNombre(caja?.nombre ?? '')
        setIdCo(caja?.id_co ?? '')
        setAuxiliarContable(caja?.auxiliar_contable ?? '')
        setSeleccion('')
        setError(null)

        if (!isEditing) {
            setLoadingCatalogo(true)
            trasladoFondosApi.listarCajas()
                .then((lista) => {
                    const yaAgregadas = new Set(
                        cajasExistentes.map((c) => `${String(c.id_co).trim()}|${String(c.auxiliar_contable).trim()}`)
                    )
                    setCatalogo(lista.filter((c) => !yaAgregadas.has(`${String(c.id_co).trim()}|${String(c.auxiliar ?? '').trim()}`)))
                })
                .catch((err) => {
                    console.error('Error cargando catálogo de cajas SIESA:', err)
                    setCatalogo([])
                })
                .finally(() => setLoadingCatalogo(false))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, caja?.id])

    const handleSeleccionCatalogo = (idCaja: string) => {
        setSeleccion(idCaja)
        const encontrada = catalogo.find((c) => String(c.id_caja) === idCaja)
        if (encontrada) {
            setNombre(encontrada.nombre ?? '')
            setIdCo(encontrada.id_co ?? '')
            setAuxiliarContable(encontrada.auxiliar ?? '')
        }
    }

    const handleSave = async () => {
        if (!nombre.trim() || !idCo.trim() || !auxiliarContable.trim()) {
            setError('Selecciona una caja del catálogo (o completa nombre, centro y auxiliar)')
            return
        }
        if (!/^[0-9]+$/.test(auxiliarContable.trim())) {
            setError('El auxiliar contable debe contener solo dígitos (ej. 11050509)')
            return
        }

        try {
            setIsSubmitting(true)
            setError(null)

            const dto = {
                nombre: nombre.trim(),
                id_co: idCo.trim(),
                auxiliar_contable: auxiliarContable.trim(),
            }

            if (isEditing && caja?.id) {
                await maestroCajasApi.actualizarCaja(caja.id, dto)
            } else {
                await maestroCajasApi.crearCaja(dto)
            }
            onClose()
        } catch (err: any) {
            console.error('Error al guardar caja:', err)
            setError(err?.response?.data?.message || err?.message || 'Error al guardar')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Caja' : 'Nueva Caja'}
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
                            Caja SIESA <span className="text-destructive">*</span>
                        </label>
                        <Select
                            value={seleccion}
                            onChange={(e) => handleSeleccionCatalogo(e.target.value)}
                            disabled={loadingCatalogo}
                            className="h-10"
                        >
                            <option value="">
                                {loadingCatalogo ? 'Cargando cajas...' : 'Selecciona una caja'}
                            </option>
                            {catalogo.map((c, idx) => (
                                <option key={`${c.id_caja}-${c.id_co}-${idx}`} value={String(c.id_caja)}>
                                    {c.nombre ?? `Caja ${c.id_caja}`} (CO {c.id_co}){c.auxiliar ? ` · Aux ${c.auxiliar}` : ''}
                                </option>
                            ))}
                        </Select>
                        {loadingCatalogo ? (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" /> Consultando catálogo real de SIESA...
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Muestra todas las cajas de SIESA que aún no están en el maestro ({catalogo.length} disponibles).
                            </p>
                        )}
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre a mostrar <span className="text-destructive">*</span></label>
                    <Input
                        placeholder="Ej. CAJA GENERAL"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="h-10"
                        autoComplete="off"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Centro (CO)</label>
                        <Input
                            value={idCo}
                            onChange={(e) => setIdCo(e.target.value)}
                            className="h-10 font-mono"
                            autoComplete="off"
                            maxLength={3}
                            disabled={!isEditing}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Auxiliar contable</label>
                        <Input
                            value={auxiliarContable}
                            onChange={(e) => setAuxiliarContable(e.target.value)}
                            className="h-10 font-mono"
                            autoComplete="off"
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
