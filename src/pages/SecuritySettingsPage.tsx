import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { ArrowLeft, UserPlus, Edit, Shield, Activity, Search, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useNavigate } from 'react-router-dom'
import { UserFormModal } from '@/components/security/UserFormModal'
import { seguridadApi, UsuarioMaster } from '@/api/seguridad'

export const SecuritySettingsPage = () => {
    const navigate = useNavigate()

    // Estados modal
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<UsuarioMaster | undefined>(undefined)

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
                    <div className="flex justify-end pr-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            title="Editar / Configurar Permisos"
                            className="h-8 w-8 p-0 text-primary border border-primary/20 hover:bg-primary/10"
                        >
                            <Edit className="h-4 w-4" />
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
        </motion.div>
    )
}
