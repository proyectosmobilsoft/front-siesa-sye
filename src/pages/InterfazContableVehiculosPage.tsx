import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Edit, Trash2, RefreshCw, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { InterfazContableModal } from '@/components/maestros/InterfazContableModal'
import { interfazContableApi, InterfazContableVehiculo } from '@/api/interfazContable'
import { badgeClass } from '@/utils/badges'
import { usePermiso } from '@/hooks/usePermiso'

export const InterfazContableVehiculosPage = () => {
    const { puede, P } = usePermiso()
    const puedeCrear = puede(P.CREAR_INTERFAZ_CONTABLE)
    const puedeEditar = puede(P.EDITAR_INTERFAZ_CONTABLE)
    const puedeEliminar = puede(P.ELIMINAR_INTERFAZ_CONTABLE)

    const [search, setSearch] = useState('')
    const [registros, setRegistros] = useState<InterfazContableVehiculo[]>([])
    const [loading, setLoading] = useState(true)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editando, setEditando] = useState<InterfazContableVehiculo | null>(null)

    const [eliminando, setEliminando] = useState<InterfazContableVehiculo | null>(null)
    const [borrando, setBorrando] = useState(false)
    const [errorDelete, setErrorDelete] = useState<string | null>(null)

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetchRegistros = async (searchTerm = search) => {
        try {
            setLoading(true)
            const res = await interfazContableApi.listar(searchTerm)
            setRegistros(res.data ?? [])
        } catch (err) {
            console.error('Error cargando interfaz contable:', err)
            setRegistros([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRegistros('')
    }, [])

    // Búsqueda en servidor con debounce
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            fetchRegistros(search)
        }, 400)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [search])

    const handleNuevo = () => {
        setEditando(null)
        setIsModalOpen(true)
    }

    const handleEditar = (r: InterfazContableVehiculo) => {
        setEditando(r)
        setIsModalOpen(true)
    }

    const handleModalClose = () => {
        setIsModalOpen(false)
        setEditando(null)
        fetchRegistros(search)
    }

    const confirmarEliminar = async () => {
        if (!eliminando) return
        try {
            setBorrando(true)
            await interfazContableApi.eliminar(eliminando.id)
            setEliminando(null)
            fetchRegistros(search)
        } catch (err: any) {
            console.error('Error eliminando relación contable:', err)
            setErrorDelete(err?.response?.data?.message || 'Error al eliminar el registro')
        } finally {
            setBorrando(false)
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
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por placa, cuenta o conductor..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                            autoComplete="off"
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => fetchRegistros(search)} disabled={loading} title="Actualizar">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    {puedeCrear && (
                        <Button onClick={handleNuevo} className="gap-2 whitespace-nowrap">
                            <Plus className="h-4 w-4" />
                            Relacionar Cuenta
                        </Button>
                    )}
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {registros.length} {registros.length === 1 ? 'relación' : 'relaciones'}
                </span>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card">
                        <tr className="border-b bg-muted/50">
                            {['Conductor', 'Placa', 'Categoría', 'Cuenta contable', 'Estado', 'Observaciones'].map((h) => (
                                <th key={h} className="h-11 whitespace-nowrap px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {h}
                                </th>
                            ))}
                            <th className="h-11 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="h-32 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Cargando relaciones...
                                    </div>
                                </td>
                            </tr>
                        ) : registros.length > 0 ? (
                            registros.map((r) => (
                                <tr key={r.id} className="border-b transition-colors hover:bg-muted/40">
                                    <td className="py-3.5 px-4">
                                        <div className="font-medium">{r.nombre_completo || r.usuario}</div>
                                        <div className="text-xs text-muted-foreground">{r.usuario}</div>
                                    </td>
                                    <td className="whitespace-nowrap py-3.5 px-4">
                                        <span className="font-mono font-semibold">{r.placa || 'Sin placa'}</span>
                                        {r.en_uso && (
                                            <span className="ml-2 rounded-full bg-green-600/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700 dark:text-green-400">
                                                En uso
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-4 text-muted-foreground">{r.categoria || '—'}</td>
                                    <td className="py-3.5 px-4 font-mono font-semibold text-primary">{r.cuenta_contable}</td>
                                    <td className="py-3.5 px-4">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(r.estado ? 'green' : 'red')}`}>
                                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                            {r.estado ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-muted-foreground">{r.observaciones || '—'}</td>
                                    <td className="py-3.5 px-4">
                                        <div className="flex justify-end gap-1">
                                            {puedeEditar && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditar(r)}
                                                    className="h-8 w-8 border border-primary/20 p-0 text-primary hover:bg-primary/10"
                                                    title="Editar"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {puedeEliminar && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setEliminando(r); setErrorDelete(null) }}
                                                    className="h-8 w-8 border border-destructive/20 p-0 text-destructive hover:bg-destructive/10"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {!puedeEditar && !puedeEliminar && (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No hay cuentas contables relacionadas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <InterfazContableModal isOpen={isModalOpen} onClose={handleModalClose} registro={editando} />
            )}

            <Modal
                isOpen={!!eliminando}
                onClose={() => { if (!borrando) { setEliminando(null); setErrorDelete(null) } }}
                title=""
                className="max-w-md"
            >
                <div className="flex flex-col items-center py-4 text-center">
                    <div className="relative mb-6">
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 dark:border-red-800 dark:from-red-950/50 dark:to-red-900/30">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
                        </div>
                    </div>

                    <h3 className="mb-2 text-xl font-bold text-foreground">¿Eliminar esta relación?</h3>
                    <p className="mb-5 max-w-sm text-muted-foreground">
                        Se quitará la cuenta contable asociada a esta placa:
                    </p>

                    <div className="mb-6 w-full max-w-sm rounded-xl border border-border bg-muted/50 px-5 py-4">
                        <p className="text-lg font-semibold text-foreground">{eliminando?.placa || 'Sin placa'}</p>
                        <p className="mt-1 font-mono text-sm text-muted-foreground">
                            Cuenta {eliminando?.cuenta_contable}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {eliminando?.nombre_completo || eliminando?.usuario}
                        </p>
                    </div>

                    <p className="mb-6 text-xs text-red-500/80 dark:text-red-400/80">
                        Esta acción no se puede deshacer.
                    </p>

                    {errorDelete && (
                        <div className="mb-4 w-full max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">{errorDelete}</p>
                        </div>
                    )}

                    <div className="flex w-full max-w-sm gap-3">
                        <Button
                            variant="outline"
                            onClick={() => { setEliminando(null); setErrorDelete(null) }}
                            disabled={borrando}
                            className="h-11 flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmarEliminar} disabled={borrando} className="h-11 flex-1 gap-2">
                            {borrando ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Eliminando...</>
                            ) : (
                                <><Trash2 className="h-4 w-4" /> Sí, eliminar</>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </motion.div>
    )
}
