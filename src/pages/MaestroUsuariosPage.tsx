import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Users, Search, UserPlus, Edit, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserMasterModal } from '@/components/security/UserMasterModal'
import { Modal } from '@/components/ui/modal'
import { AlertTriangle } from 'lucide-react'
import { seguridadApi, UsuarioMaster } from '@/api/seguridad'

export const MaestroUsuariosPage = () => {
    const [search, setSearch] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<UsuarioMaster | null>(null)
    const [deletingUser, setDeletingUser] = useState<UsuarioMaster | null>(null)
    const [usuarios, setUsuarios] = useState<UsuarioMaster[]>([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [errorDelete, setErrorDelete] = useState<string | null>(null)
    const [total, setTotal] = useState(0)
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
            className="flex-1 space-y-6 p-6"
        >
            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => fetchUsuarios(search)} disabled={loading} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </Button>
            </div>

            <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Directorio de Usuarios
                    </CardTitle>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
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
                        <Button onClick={handleNewUser} className="whitespace-nowrap gap-2">
                            <UserPlus className="h-4 w-4" />
                            Nuevo Usuario
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border bg-card">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="h-11 px-4 text-left font-medium text-muted-foreground">ID</th>
                                        <th className="h-11 px-4 text-left font-medium text-muted-foreground">Usuario</th>
                                        <th className="h-11 px-4 text-left font-medium text-muted-foreground">Nombre Completo</th>
                                        <th className="h-11 px-4 text-left font-medium text-muted-foreground">Email</th>
                                        <th className="h-11 px-4 text-left font-medium text-muted-foreground">Estado</th>
                                        <th className="h-11 px-4 text-center font-medium text-muted-foreground">Intentos</th>
                                        <th className="h-11 px-4 text-right font-medium text-muted-foreground">Acciones</th>
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
                                            <tr key={user.id} className="border-b transition-colors hover:bg-muted/30">
                                                <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{user.id}</td>
                                                <td className="py-3 px-4 font-semibold text-primary">{user.usuario}</td>
                                                <td className="py-3 px-4">
                                                    {user.nombre_completo || <span className="text-muted-foreground italic text-xs">Sin definir</span>}
                                                </td>
                                                <td className="py-3 px-4 text-sm">
                                                    {user.email || <span className="text-muted-foreground italic text-xs">—</span>}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${user.activo ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                        {user.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className={`py-3 px-4 font-mono text-center ${user.intentos_fallidos > 2 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                                                    {user.intentos_fallidos}
                                                </td>
                                                <td className="py-3 px-4">
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
                    </div>
                </CardContent>
            </Card>

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
                    <div className="relative mb-4">
                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl" />
                        <div className="relative h-16 w-16 rounded-full bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                    </div>
                    <h3 className="text-lg font-bold mb-2">¿Eliminar este usuario?</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                        Se eliminará permanentemente: <strong>{deletingUser?.usuario}</strong>
                    </p>
                    {errorDelete && (
                        <div className="w-full mb-4 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                            {errorDelete}
                        </div>
                    )}
                    <div className="flex gap-3 w-full">
                        <Button variant="outline" onClick={() => { setDeletingUser(null); setErrorDelete(null) }} disabled={deleting} className="flex-1">
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDeleteUser} disabled={deleting} className="flex-1 gap-2">
                            {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Eliminando...</> : <><Trash2 className="h-4 w-4" /> Sí, eliminar</>}
                        </Button>
                    </div>
                </div>
            </Modal>
        </motion.div>
    )
}
