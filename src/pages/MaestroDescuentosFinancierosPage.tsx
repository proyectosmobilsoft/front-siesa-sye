import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Edit, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CondicionPagoModal } from '@/components/financiero/CondicionPagoModal'
import { Modal } from '@/components/ui/modal'
import { AlertTriangle } from 'lucide-react'
import { financieroApi, CondicionPago } from '@/api/financiero'
import { badgeClass } from '@/utils/badges'

export const MaestroDescuentosFinancierosPage = () => {
    const [search, setSearch] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCondicion, setEditingCondicion] = useState<CondicionPago | null>(null)
    const [deletingCondicion, setDeletingCondicion] = useState<CondicionPago | null>(null)
    const [condiciones, setCondiciones] = useState<CondicionPago[]>([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [errorDelete, setErrorDelete] = useState<string | null>(null)
    const [, setTotal] = useState(0)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetchCondiciones = async (searchTerm = search) => {
        try {
            setLoading(true)
            const res = await financieroApi.listarCondicionesPago(false)
            const data = res.data ?? []
            const filtered = searchTerm.trim()
                ? data.filter(
                      (c) =>
                          c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.name?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                : data
            setCondiciones(filtered)
            setTotal(filtered.length)
        } catch (err) {
            console.error('Error cargando condiciones de pago:', err)
            setCondiciones([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCondiciones('')
    }, [])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            fetchCondiciones(search)
        }, 400)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [search])

    const handleNew = () => {
        setEditingCondicion(null)
        setIsModalOpen(true)
    }

    const handleEdit = (condicion: CondicionPago) => {
        setEditingCondicion(condicion)
        setIsModalOpen(true)
    }

    const handleModalClose = () => {
        setIsModalOpen(false)
        setEditingCondicion(null)
        fetchCondiciones(search)
    }

    const handleDelete = (condicion: CondicionPago) => {
        setDeletingCondicion(condicion)
        setErrorDelete(null)
    }

    const confirmDelete = async () => {
        if (!deletingCondicion) return
        try {
            setDeleting(true)
            await financieroApi.eliminarCondicionPago(deletingCondicion.code)
            setDeletingCondicion(null)
            fetchCondiciones(search)
        } catch (err: any) {
            console.error('Error eliminando condición de pago:', err)
            setErrorDelete(err?.response?.data?.message || 'Error al eliminar la condición de pago')
        } finally {
            setDeleting(false)
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
                            placeholder="Buscar por código o nombre..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                            autoComplete="off"
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => fetchCondiciones(search)} disabled={loading} title="Actualizar">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button onClick={handleNew} className="whitespace-nowrap gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva Condición
                    </Button>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {condiciones.length} {condiciones.length === 1 ? 'condición' : 'condiciones'}
                </span>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card">
                        <tr className="border-b bg-muted/50">
                            <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código</th>
                            <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</th>
                            <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
                            <th className="h-11 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="h-32 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Cargando condiciones de pago...
                                    </div>
                                </td>
                            </tr>
                        ) : condiciones.length > 0 ? (
                            condiciones.map((c) => (
                                <tr key={c.code} className="border-b transition-colors hover:bg-muted/40">
                                    <td className="py-3.5 px-4 font-mono text-sm font-semibold text-primary">{c.code}</td>
                                    <td className="py-3.5 px-4">{c.name}</td>
                                    <td className="py-3.5 px-4">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass(c.status === 1 || c.status === true ? 'green' : 'red')}`}
                                        >
                                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                            {c.status === 1 || c.status === true ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(c)}
                                                className="h-8 w-8 p-0 text-primary border border-primary/20 hover:bg-primary/10"
                                                title="Editar"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(c)}
                                                className="h-8 w-8 p-0 text-destructive border border-destructive/20 hover:bg-destructive/10"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No se encontraron condiciones de pago.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <CondicionPagoModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    condicion={editingCondicion}
                />
            )}

            <Modal
                isOpen={!!deletingCondicion}
                onClose={() => {
                    if (!deleting) {
                        setDeletingCondicion(null)
                        setErrorDelete(null)
                    }
                }}
                title=""
                className="max-w-md"
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="relative mb-6">
                        <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-2 border-red-200 dark:border-red-800 flex items-center justify-center">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-foreground mb-2">¿Eliminar esta condición de pago?</h3>

                    <p className="text-muted-foreground mb-5 max-w-sm">
                        Estás a punto de eliminar permanentemente la condición:
                    </p>

                    <div className="w-full max-w-sm bg-muted/50 border border-border rounded-xl px-5 py-4 mb-6">
                        <p className="text-lg font-semibold text-foreground">{deletingCondicion?.name}</p>
                        <p className="text-sm text-muted-foreground mt-1 font-mono">{deletingCondicion?.code}</p>
                    </div>

                    <p className="text-xs text-red-500/80 dark:text-red-400/80 mb-6">
                        Se eliminarán también todos sus descuentos asociados. Esta acción no se puede deshacer.
                    </p>

                    {errorDelete && (
                        <div className="w-full max-w-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4">
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errorDelete}</p>
                        </div>
                    )}

                    <div className="flex gap-3 w-full max-w-sm">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeletingCondicion(null)
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
        </motion.div>
    )
}
