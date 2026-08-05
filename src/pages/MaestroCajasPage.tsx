import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Edit, Trash2, RefreshCw, Loader2, AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CajaModal } from '@/components/maestro/CajaModal'
import { Modal } from '@/components/ui/modal'
import { maestroCajasApi, Caja } from '@/api/maestroCajas'
import { badgeClass } from '@/utils/badges'
import { usePermiso } from '@/hooks/usePermiso'

export const MaestroCajasPage = () => {
    const { puede, P } = usePermiso()
    const puedeCrear = puede(P.CREAR_CAJA)
    // Reactivar es una edición del registro, así que comparte permiso con editar
    const puedeEditar = puede(P.EDITAR_CAJA)
    const puedeEliminar = puede(P.ELIMINAR_CAJA)

    const [search, setSearch] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCaja, setEditingCaja] = useState<Caja | null>(null)
    const [deletingCaja, setDeletingCaja] = useState<Caja | null>(null)
    const [reactivandoCaja, setReactivandoCaja] = useState<Caja | null>(null)
    const [nombreReactivar, setNombreReactivar] = useState('')
    const [cajas, setCajas] = useState<Caja[]>([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [reactivando, setReactivando] = useState(false)
    const [errorDelete, setErrorDelete] = useState<string | null>(null)
    const [errorReactivar, setErrorReactivar] = useState<string | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetchCajas = async (searchTerm = search) => {
        try {
            setLoading(true)
            const res = await maestroCajasApi.listarCajas(false)
            const data = res.data ?? []
            const filtered = searchTerm.trim()
                ? data.filter(
                      (c) =>
                          c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.auxiliar_contable?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.id_co?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                : data
            setCajas(filtered)
        } catch (err) {
            console.error('Error cargando cajas:', err)
            setCajas([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCajas('')
    }, [])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            fetchCajas(search)
        }, 400)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [search])

    const handleNew = () => {
        setEditingCaja(null)
        setIsModalOpen(true)
    }

    const handleEdit = (caja: Caja) => {
        setEditingCaja(caja)
        setIsModalOpen(true)
    }

    const handleModalClose = () => {
        setIsModalOpen(false)
        setEditingCaja(null)
        fetchCajas(search)
    }

    const handleDelete = (caja: Caja) => {
        setDeletingCaja(caja)
        setErrorDelete(null)
    }

    const confirmDelete = async () => {
        if (!deletingCaja) return
        try {
            setDeleting(true)
            await maestroCajasApi.eliminarCaja(deletingCaja.id)
            setDeletingCaja(null)
            fetchCajas(search)
        } catch (err: any) {
            console.error('Error eliminando caja:', err)
            setErrorDelete(err?.response?.data?.message || 'Error al eliminar la caja')
        } finally {
            setDeleting(false)
        }
    }

    const handleReactivar = (caja: Caja) => {
        setReactivandoCaja(caja)
        setNombreReactivar(caja.nombre)
        setErrorReactivar(null)
    }

    const confirmReactivar = async () => {
        if (!reactivandoCaja) return
        if (!nombreReactivar.trim()) {
            setErrorReactivar('El nombre no puede quedar vacío')
            return
        }
        try {
            setReactivando(true)
            await maestroCajasApi.reactivarCaja(reactivandoCaja.id, nombreReactivar.trim())
            setReactivandoCaja(null)
            fetchCajas(search)
        } catch (err: any) {
            console.error('Error reactivando caja:', err)
            setErrorReactivar(err?.response?.data?.message || 'Error al reactivar la caja')
        } finally {
            setReactivando(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex h-full min-h-0 flex-col gap-4 p-6"
        >
            <div className="flex shrink-0 flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full items-center gap-3 sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, CO o auxiliar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                            autoComplete="off"
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => fetchCajas(search)} disabled={loading} title="Actualizar">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    {puedeCrear && (
                        <Button onClick={handleNew} className="whitespace-nowrap gap-2">
                            <Plus className="h-4 w-4" />
                            Nueva Caja
                        </Button>
                    )}
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {cajas.length} {cajas.length === 1 ? 'caja' : 'cajas'}
                </span>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card">
                        <tr className="border-b bg-muted/50">
                            <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</th>
                            <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Centro (CO)</th>
                            <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Auxiliar contable</th>
                            <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
                            <th className="h-11 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="h-32 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Cargando cajas...
                                    </div>
                                </td>
                            </tr>
                        ) : cajas.length > 0 ? (
                            cajas.map((c) => (
                                <tr key={c.id} className="border-b transition-colors hover:bg-muted/40">
                                    <td className="py-3.5 px-4 font-semibold text-primary">{c.nombre}</td>
                                    <td className="py-3.5 px-4 font-mono text-xs">{c.id_co}</td>
                                    <td className="py-3.5 px-4 font-mono text-xs">{c.auxiliar_contable}</td>
                                    <td className="py-3.5 px-4">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass(c.activa === 1 || c.activa === true ? 'green' : 'red')}`}
                                        >
                                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                            {c.activa === 1 || c.activa === true ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="flex justify-end gap-1">
                                            {c.activa === 1 || c.activa === true ? (
                                                <>
                                                    {puedeEditar && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEdit(c)}
                                                            className="h-8 w-8 p-0 text-primary border border-primary/20 hover:bg-primary/10"
                                                            title="Editar"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {puedeEliminar && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(c)}
                                                            className="h-8 w-8 p-0 text-destructive border border-destructive/20 hover:bg-destructive/10"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </>
                                            ) : (
                                                puedeEditar && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleReactivar(c)}
                                                        className="h-8 gap-1.5 px-3 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/10"
                                                        title="Reactivar"
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                        Reactivar
                                                    </Button>
                                                )
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No se encontraron cajas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <CajaModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    caja={editingCaja}
                    cajasExistentes={cajas}
                />
            )}

            <Modal
                isOpen={!!deletingCaja}
                onClose={() => {
                    if (!deleting) {
                        setDeletingCaja(null)
                        setErrorDelete(null)
                    }
                }}
                title=""
                className="max-w-md"
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="relative mb-6">
                        <div className="relative h-20 w-20 rounded-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-foreground mb-2">¿Eliminar esta caja?</h3>

                    <p className="text-muted-foreground mb-5 max-w-sm">
                        Estás a punto de eliminar la caja:
                    </p>

                    <div className="w-full max-w-sm bg-muted/50 border border-border rounded-xl px-5 py-4 mb-6">
                        <p className="text-lg font-semibold text-foreground">{deletingCaja?.nombre}</p>
                        <p className="text-sm text-muted-foreground mt-1 font-mono">{deletingCaja?.auxiliar_contable}</p>
                    </div>

                    <p className="text-xs text-destructive/80 mb-6">
                        Dejará de aparecer en los selectores de caja del tablero de tesorería.
                    </p>

                    {errorDelete && (
                        <div className="w-full max-w-sm bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 mb-4">
                            <p className="text-sm text-destructive font-medium">{errorDelete}</p>
                        </div>
                    )}

                    <div className="flex gap-3 w-full max-w-sm">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeletingCaja(null)
                                setErrorDelete(null)
                            }}
                            disabled={deleting}
                            className="flex-1 h-11"
                        >
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleting} className="flex-1 h-11 gap-2">
                            {deleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4" />
                                    Sí, eliminar
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!reactivandoCaja}
                onClose={() => {
                    if (!reactivando) {
                        setReactivandoCaja(null)
                        setErrorReactivar(null)
                    }
                }}
                title="Reactivar caja"
                className="max-w-md"
            >
                <div className="mt-3 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Confirma el nombre con el que se mostrará esta caja (puedes cambiarlo si quieres):
                    </p>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</label>
                        <Input
                            value={nombreReactivar}
                            onChange={(e) => setNombreReactivar(e.target.value)}
                            className="h-10"
                            autoComplete="off"
                        />
                        <p className="text-xs text-muted-foreground font-mono">
                            CO {reactivandoCaja?.id_co} · Aux {reactivandoCaja?.auxiliar_contable}
                        </p>
                    </div>

                    {errorReactivar && (
                        <div className="p-2.5 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg">
                            {errorReactivar}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setReactivandoCaja(null)
                                setErrorReactivar(null)
                            }}
                            disabled={reactivando}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={confirmReactivar} disabled={reactivando} className="gap-2">
                            {reactivando ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Reactivando...
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="h-4 w-4" />
                                    Reactivar
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </motion.div>
    )
}
