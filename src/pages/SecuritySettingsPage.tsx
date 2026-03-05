import { motion } from 'framer-motion'
import { useState } from 'react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { ArrowLeft, UserPlus, Edit, Shield, Activity, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useNavigate } from 'react-router-dom'
import { UserFormModal } from '@/components/security/UserFormModal'

// Interface mockeada
interface User {
    id: string
    name: string
    email: string
    role: string
    status: 'Activo' | 'Inactivo'
    lastLogin: string
}

// Datos mockeados
const mockUsers: User[] = [
    { id: '1', name: 'Juan Pérez', email: 'juan.perez@transporte.com', role: 'Conductor', status: 'Activo', lastLogin: '2023-10-01 08:30' },
    { id: '2', name: 'María Gómez', email: 'maria.gomez@empresa.com', role: 'Administrador', status: 'Activo', lastLogin: '2023-10-02 09:15' },
    { id: '3', name: 'Carlos López', email: 'carlos.lopez@transporte.com', role: 'Conductor', status: 'Inactivo', lastLogin: '2023-09-15 14:20' },
    { id: '4', name: 'Ana Martínez', email: 'ana.martinez@empresa.com', role: 'Visualizador', status: 'Activo', lastLogin: '2023-10-02 11:10' },
]

export const SecuritySettingsPage = () => {
    const navigate = useNavigate()

    // Estados modal
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | undefined>(undefined)

    // Estado tabla
    const [globalFilter, setGlobalFilter] = useState('')

    const handleNewUser = () => {
        setEditingUser(undefined)
        setIsFormOpen(true)
    }

    const handleEditUser = (user: User) => {
        setEditingUser(user)
        setIsFormOpen(true)
    }

    const columns: ColumnDef<User>[] = [
        {
            accessorKey: 'name',
            header: 'Nombre Completo',
            cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
        },
        {
            accessorKey: 'email',
            header: 'Correo Electrónico',
            cell: ({ row }) => <div className="text-muted-foreground">{row.getValue('email')}</div>,
        },
        {
            accessorKey: 'role',
            header: 'Rol / Módulo',
            cell: ({ row }) => {
                const role = row.getValue('role') as string
                return (
                    <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-primary opacity-70" />
                        <span>{role}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: 'status',
            header: 'Estado',
            cell: ({ row }) => {
                const status = row.getValue('status') as string
                const isActive = status === 'Activo'
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {status}
                    </span>
                )
            },
        },
        {
            accessorKey: 'lastLogin',
            header: 'Último Acceso',
            cell: ({ row }) => {
                return (
                    <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                        <Activity className="h-4 w-4 opacity-50" />
                        <span>{row.getValue('lastLogin')}</span>
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

    // Filtro simple manual para el mockup
    const filteredUsers = mockUsers.filter(user =>
        user.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        user.email.toLowerCase().includes(globalFilter.toLowerCase()) ||
        user.role.toLowerCase().includes(globalFilter.toLowerCase())
    )

    const table = useReactTable({
        data: filteredUsers,
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
                                placeholder="Buscar usuario, email o rol..."
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className="pl-9"
                            />
                        </div>
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
                                    {table.getRowModel().rows?.length ? (
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
                            Mostrando {table.getRowModel().rows.length} usuarios.
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
                onClose={() => setIsFormOpen(false)}
                user={editingUser}
            />
        </motion.div>
    )
}
