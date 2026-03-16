import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { ArrowLeft, UserPlus, Edit, Shield, Activity, Search, RefreshCw, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useNavigate } from 'react-router-dom'
import { UserFormModal } from '@/components/security/UserFormModal'
import { seguridadApi, UsuarioMaster } from '@/api/seguridad'
import { Modal } from '@/components/ui/modal'

export const SecuritySettingsPage = () => {
    const navigate = useNavigate()

    // Estados modal
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<UsuarioMaster | undefined>(undefined)

    // Estados modal eliminar
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [deletingUser, setDeletingUser] = useState<UsuarioMaster | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Estado tabla
    const [globalFilter, setGlobalFilter] = useState('')
    const [usuarios, setUsuarios] = useState<UsuarioMaster[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetchUsuarios = async (searchTerm = globalFilter) => {
        try {
            setLoading(true)
            const res = await seguridadApi.listarUsuarios(1, 100, searchTerm)
            setUsuarios(res.data || [])
            setTotal(res.total || 0)
        } catch (err) {
            console.error('Error cargando usuarios:', err)
            setUsuarios([])
            setTotal(0)
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
            fetchUsuarios(globalFilter)
        }, 400)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [globalFilter])

    const handleNewUser = () => {
        setEditingUser(undefined)
        setIsFormOpen(true)
    }

    const handleEditUser = (user: UsuarioMaster) => {
        setEditingUser(user)
        setIsFormOpen(true)
    }

    const handleModalClose = () => {
        setIsFormOpen(false)
        // Recargar tabla después de cerrar el modal
        fetchUsuarios(globalFilter)
    }

    const handleDeleteUser = (user: UsuarioMaster) => {
        setDeletingUser(user)
        setIsDeleteOpen(true)
    }

    const confirmDelete = async () => {
        if (!deletingUser) return
        try {
            setDeleting(true)
            await seguridadApi.eliminarUsuario(deletingUser.id)
            console.log(`✅ Usuario ${deletingUser.usuario} eliminado`)
            setIsDeleteOpen(false)
            setDeletingUser(null)
            fetchUsuarios(globalFilter)
        } catch (err: any) {
            console.error('❌ Error eliminando usuario:', err)
            if (err?.response) {
                console.error('📋 Status:', err.response.status)
                console.error('📋 Response:', JSON.stringify(err.response.data, null, 2))
            }
        } finally {
            setDeleting(false)
        }
    }

    const columns: ColumnDef<UsuarioMaster>[] = [
        {
            accessorKey: 'usuario',
            header: 'Usuario',
            cell: ({ row }) => <div className="font-semibold text-primary">{row.getValue('usuario')}</div>,
        },
        {
            accessorKey: 'nombre_completo',
            header: 'Nombre Completo',
            cell: ({ row }) => {
                const nombre = row.getValue('nombre_completo') as string | null
                return <div className="font-medium">{nombre || <span className="text-muted-foreground italic text-xs">Sin definir</span>}</div>
            },
        },
        {
            accessorKey: 'email',
            header: 'Correo Electrónico',
            cell: ({ row }) => {
                const email = row.getValue('email') as string | null
                return <div className="text-muted-foreground">{email || <span className="text-muted-foreground italic text-xs">—</span>}</div>
            },
        },
        {
            accessorKey: 'activo',
            header: 'Estado',
            cell: ({ row }) => {
                const activo = row.getValue('activo') as boolean
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${activo ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {activo ? 'Activo' : 'Inactivo'}
                    </span>
                )
            },
        },
        {
            accessorKey: 'ultimo_acceso',
            header: 'Último Acceso',
            cell: ({ row }) => {
                const ultimoAcceso = row.getValue('ultimo_acceso') as string | null
                return (
                    <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                        <Activity className="h-4 w-4 opacity-50" />
                        <span>{ultimoAcceso ? new Date(ultimoAcceso).toLocaleString('es-ES') : <span className="italic text-xs">Nunca</span>}</span>
                    </div>
                )
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-right">Acciones</div>,
            cell: ({ row }) => {
                const user = row.original
                return (
                    <div className="flex justify-end gap-1 pr-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            title="Editar usuario"
                            className="h-8 w-8 p-0 text-primary border border-primary/20 hover:bg-primary/10"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            title="Eliminar usuario"
                            className="h-8 w-8 p-0 text-destructive border border-destructive/20 hover:bg-destructive/10"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )
            },
        },
    ]

    const table = useReactTable({
        data: usuarios,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    })

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-6 p-6"
        >
            <div className="flex items-center space-x-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/configuracion')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Seguridad y Usuarios</h1>
                    <p className="text-muted-foreground">
                        Administre los usuarios (conductores, admins), módulos y permisos.
                    </p>
                </div>
            </div>

            <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Directorio de Accesos
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar usuario, email o nombre..."
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className="pl-9"
                                autoComplete="off"
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => fetchUsuarios(globalFilter)} disabled={loading} className="gap-2">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                        <Button onClick={handleNewUser} className="whitespace-nowrap">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Nuevo Usuario
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border bg-card">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <tr key={headerGroup.id} className="border-b bg-muted/50">
                                            {headerGroup.headers.map((header) => (
                                                <th
                                                    key={header.id}
                                                    className="h-11 px-4 text-left align-middle font-medium text-muted-foreground"
                                                >
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={columns.length} className="h-32 text-center">
                                                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    Cargando usuarios...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row) => (
                                            <motion.tr
                                                key={row.id}
                                                className="border-b transition-colors hover:bg-muted/30"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <td key={cell.id} className="py-3 px-4 align-middle">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                                No se encontraron usuarios.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="flex items-center justify-between space-x-2 py-4">
                        <div className="flex-1 text-sm text-muted-foreground">
                            Mostrando {table.getRowModel().rows.length} de {total} usuario{total !== 1 ? 's' : ''}.
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <UserFormModal
                isOpen={isFormOpen}
                onClose={handleModalClose}
                user={editingUser}
            />

            {/* Modal de confirmación de eliminación */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={() => { if (!deleting) { setIsDeleteOpen(false); setDeletingUser(null) } }}
                title=""
                className="max-w-lg"
            >
                <div className="flex flex-col items-center text-center py-4">
                    {/* Icono grande animado */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
                        <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-2 border-red-200 dark:border-red-800 flex items-center justify-center">
                            <AlertTriangle className="h-10 w-10 text-red-500" />
                        </div>
                    </div>

                    {/* Título */}
                    <h3 className="text-xl font-bold text-foreground mb-2">
                        ¿Eliminar este usuario?
                    </h3>

                    {/* Descripción */}
                    <p className="text-muted-foreground mb-5 max-w-sm">
                        Estás a punto de eliminar permanentemente al usuario:
                    </p>

                    {/* Card con info del usuario */}
                    <div className="w-full max-w-sm bg-muted/50 border border-border rounded-xl px-5 py-4 mb-6">
                        <p className="text-lg font-semibold text-foreground">
                            {deletingUser?.nombre_completo || 'Sin nombre'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            @{deletingUser?.usuario}
                        </p>
                        {deletingUser?.email && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {deletingUser.email}
                            </p>
                        )}
                    </div>

                    {/* Advertencia */}
                    <p className="text-xs text-red-500/80 dark:text-red-400/80 mb-6">
                        Se eliminarán sus roles y permisos. Esta acción no se puede deshacer.
                    </p>

                    {/* Botones */}
                    <div className="flex gap-3 w-full max-w-sm">
                        <Button
                            variant="outline"
                            onClick={() => { setIsDeleteOpen(false); setDeletingUser(null) }}
                            disabled={deleting}
                            className="flex-1 h-11"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleting}
                            className="flex-1 h-11 gap-2"
                        >
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
