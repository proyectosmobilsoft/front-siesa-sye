import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Search, UserPlus, Edit, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserMasterModal } from '@/components/security/UserMasterModal'
import { Modal } from '@/components/ui/modal'
import { AlertTriangle } from 'lucide-react'
import { seguridadApi, UsuarioMaster } from '@/api/seguridad'
import { badgeClass } from '@/utils/badges'

export const MaestroUsuariosPage = () => {
    const [search, setSearch] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<UsuarioMaster | null>(null)
    const [deletingUser, setDeletingUser] = useState<UsuarioMaster | null>(null)
    const [usuarios, setUsuarios] = useState<UsuarioMaster[]>([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [errorDelete, setErrorDelete] = useState<string | null>(null)
    const [, setTotal] = useState(0)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetchUsuarios = async (searchTerm = search) => {
        try {
            setLoading(true)
            const res = await seguridadApi.listarUsuarios(1, 100, searchTerm)
            setUsuarios(res.data)
            setTotal(res.total)
        } catch (err) {
            console.error('Error cargando usuarios:', err)
        } finally {
            setLoading(false)
        }
    }

    // Fetch inicial
    useEffect(() => {
        fetchUsuarios('')
    }, [])

    // Debounce para búsqueda
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            fetchUsuarios(search)
        }, 400)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [search])

    const handleNewUser = () => {
        setEditingUser(null)
        setIsModalOpen(true)
    }

    const handleEditUser = (user: UsuarioMaster) => {
        setEditingUser(user)
        setIsModalOpen(true)
    }

    const handleModalClose = () => {
        setIsModalOpen(false)
        fetchUsuarios(search)
    }

    const handleDeleteUser = (user: UsuarioMaster) => {
        setDeletingUser(user)
        setErrorDelete(null)
    }

    const confirmDeleteUser = async () => {
        if (!deletingUser) return
        try {
            setDeleting(true)
            await seguridadApi.eliminarUsuario(deletingUser.id)
            setDeletingUser(null)
            fetchUsuarios(search)
        } catch (err: any) {
            console.error('Error eliminando usuario:', err)
            setErrorDelete(err?.response?.data?.message || 'Error al eliminar el usuario')
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
                            placeholder="Buscar por usuario, nombre o email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                            autoComplete="off"
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => fetchUsuarios(search)} disabled={loading} title="Actualizar">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button onClick={handleNewUser} className="whitespace-nowrap gap-2">
                        <UserPlus className="h-4 w-4" />
                        Nuevo Usuario
                    </Button>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {usuarios.length} {usuarios.length === 1 ? 'usuario' : 'usuarios'}
                </span>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card">
                        <tr className="border-b bg-muted/50">
                            <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">ID</th>
                            <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Usuario</th>
                            <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre Completo</th>
                            <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                            <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
                            <th className="h-11 px-4 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intentos</th>
                            <th className="h-11 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="h-32 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Cargando usuarios...
                                    </div>
                                </td>
                            </tr>
                        ) : usuarios.length > 0 ? (
                            usuarios.map((user) => (
                                <tr key={user.id} className="border-b transition-colors hover:bg-muted/40">
                                    <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">{user.id}</td>
                                    <td className="py-3.5 px-4 font-semibold text-primary">{user.usuario}</td>
                                    <td className="py-3.5 px-4">
                                        {user.nombre_completo || <span className="text-muted-foreground italic text-xs">Sin definir</span>}
                                    </td>
                                    <td className="py-3.5 px-4 text-sm">
                                        {user.email || <span className="text-muted-foreground italic text-xs">—</span>}
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass(user.activo ? 'green' : 'red')}`}>
                                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                            {user.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className={`py-3.5 px-4 font-mono text-center ${user.intentos_fallidos > 2 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                        {user.intentos_fallidos}
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditUser(user)}
                                                className="h-8 w-8 p-0 text-primary border border-primary/20 hover:bg-primary/10"
                                                title="Editar"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteUser(user)}
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
                                <td colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No se encontraron usuarios.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <UserMasterModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    user={editingUser}
                />
            )}

            {/* Modal confirmar eliminar usuario */}
            <Modal
                isOpen={!!deletingUser}
                onClose={() => { if (!deleting) { setDeletingUser(null); setErrorDelete(null) } }}
                title=""
                className="max-w-md"
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="relative mb-6">
                        <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-2 border-red-200 dark:border-red-800 flex items-center justify-center">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-foreground mb-2">¿Eliminar este usuario?</h3>

                    <p className="text-muted-foreground mb-5 max-w-sm">
                        Estás a punto de eliminar permanentemente al usuario:
                    </p>

                    <div className="w-full max-w-sm bg-muted/50 border border-border rounded-xl px-5 py-4 mb-6">
                        <p className="text-lg font-semibold text-foreground">{deletingUser?.usuario}</p>
                        {deletingUser?.nombre_completo && (
                            <p className="text-sm text-muted-foreground mt-1">{deletingUser.nombre_completo}</p>
                        )}
                    </div>

                    <p className="text-xs text-red-500/80 dark:text-red-400/80 mb-6">
                        Esta acción no se puede deshacer.
                    </p>

                    {errorDelete && (
                        <div className="w-full max-w-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4">
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errorDelete}</p>
                        </div>
                    )}

                    <div className="flex gap-3 w-full max-w-sm">
                        <Button variant="outline" onClick={() => { setDeletingUser(null); setErrorDelete(null) }} disabled={deleting} className="flex-1 h-11">
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDeleteUser} disabled={deleting} className="flex-1 h-11 gap-2">
                            {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Eliminando...</> : <><Trash2 className="h-4 w-4" /> Sí, eliminar</>}
                        </Button>
                    </div>
                </div>
            </Modal>
        </motion.div>
    )
}
