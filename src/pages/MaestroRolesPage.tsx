import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { ArrowLeft, Plus, Edit, Shield, Loader2, Trash2, AlertTriangle, Key, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useNavigate } from 'react-router-dom'
import { seguridadApi, AuthRole } from '@/api/seguridad'

export const MaestroRolesPage = () => {
    const navigate = useNavigate()

    // Estado tabla
    const [roles, setRoles] = useState<AuthRole[]>([])
    const [loading, setLoading] = useState(true)

    // Estado modal form (crear/editar)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingRole, setEditingRole] = useState<AuthRole | null>(null)
    const [formNombre, setFormNombre] = useState('')
    const [formPin, setFormPin] = useState(false)
    const [formEstado, setFormEstado] = useState(true)
    const [saving, setSaving] = useState(false)

    // Estado modal eliminar
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [deletingRole, setDeletingRole] = useState<AuthRole | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const fetchRoles = async () => {
        try {
            setLoading(true)
            const res = await seguridadApi.listarRoles()
            setRoles(res.data || [])
        } catch (err) {
            console.error('Error cargando roles:', err)
            setRoles([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRoles()
    }, [])

    // --- Handlers CRUD ---
    const handleNewRole = () => {
        setEditingRole(null)
        setFormNombre('')
        setFormPin(false)
        setFormEstado(true)
        setIsFormOpen(true)
    }

    const handleEditRole = (role: AuthRole) => {
        setEditingRole(role)
        setFormNombre(role.nombre)
        setFormPin(role.pin)
        setFormEstado(!!role.estado)
        setIsFormOpen(true)
    }

    const handleDeleteRole = (role: AuthRole) => {
        setDeletingRole(role)
        setDeleteError(null)
        setIsDeleteOpen(true)
    }

    const handleSaveRole = async () => {
        if (!formNombre.trim()) return
        setSaving(true)

        const payload = {
            nombre: formNombre.trim().toUpperCase(),
            pin: formPin,
            estado: formEstado,
        }

        try {
            if (editingRole) {
                // Editar
                console.log(`📤 PUT /auth-secundario/roles/${editingRole.id}:`, JSON.stringify(payload, null, 2))
                await seguridadApi.actualizarRol(editingRole.id, payload)
                console.log('✅ Rol actualizado')
            } else {
                // Crear
                console.log('📤 POST /auth-secundario/roles:', JSON.stringify(payload, null, 2))
                await seguridadApi.crearRol(payload)
                console.log('✅ Rol creado')
            }
            setIsFormOpen(false)
            fetchRoles()
        } catch (err: any) {
            console.error('❌ Error guardando rol:', err)
            if (err?.response) {
                console.error('📋 Status:', err.response.status)
                console.error('📋 Response:', JSON.stringify(err.response.data, null, 2))
            }
        } finally {
            setSaving(false)
        }
    }

    const confirmDelete = async () => {
        if (!deletingRole) return
        try {
            setDeleting(true)
            setDeleteError(null)
            console.log(`🗑️ DELETE /auth-secundario/roles/${deletingRole.id}`)
            await seguridadApi.eliminarRol(deletingRole.id)
            console.log(`✅ Rol ${deletingRole.nombre} eliminado`)
            setIsDeleteOpen(false)
            setDeletingRole(null)
            fetchRoles()
        } catch (err: any) {
            console.error('❌ Error eliminando rol:', err)
            if (err?.response?.status === 409) {
                setDeleteError(err.response.data?.message || 'No se puede eliminar el rol porque tiene usuarios asignados')
            } else if (err?.response) {
                setDeleteError(err.response.data?.message || 'Error al eliminar el rol')
                console.error('📋 Status:', err.response.status)
                console.error('📋 Response:', JSON.stringify(err.response.data, null, 2))
            } else {
                setDeleteError('Error de conexión al eliminar el rol')
            }
        } finally {
            setDeleting(false)
        }
    }

    // --- Columnas ---
    const columns: ColumnDef<AuthRole>[] = [
        {
            accessorKey: 'nombre',
            header: 'Nombre del Rol',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary opacity-60" />
                    <span className="font-semibold text-primary">{row.getValue('nombre')}</span>
                </div>
            ),
        },
        {
            accessorKey: 'estado',
            header: 'Estado',
            cell: ({ row }) => {
                const activo = !!row.getValue('estado')
                return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${activo ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {activo ? 'Activo' : 'Inactivo'}
                    </span>
                )
            },
        },
        {
            accessorKey: 'pin',
            header: 'Autenticación',
            cell: ({ row }) => {
                const usaPin = row.getValue('pin') as boolean
                return (
                    <div className="flex items-center gap-2">
                        {usaPin ? (
                            <>
                                <Key className="h-4 w-4 text-amber-500" />
                                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">PIN</span>
                            </>
                        ) : (
                            <>
                                <Lock className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Contraseña</span>
                            </>
                        )}
                    </div>
                )
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-right">Acciones</div>,
            cell: ({ row }) => {
                const role = row.original
                return (
                    <div className="flex justify-end gap-1 pr-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRole(role)}
                            title="Editar rol"
                            className="h-8 w-8 p-0 text-primary border border-primary/20 hover:bg-primary/10"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role)}
                            title="Eliminar rol"
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
        data: roles,
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
                    <h1 className="text-3xl font-bold tracking-tight">Maestro de Roles</h1>
                    <p className="text-muted-foreground">
                        Gestión de roles y tipo de autenticación del sistema.
                    </p>
                </div>
            </div>

            <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Lista de Roles
                        </CardTitle>
                    </div>
                    <Button onClick={handleNewRole} className="whitespace-nowrap">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Rol
                    </Button>
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
                                                    Cargando roles...
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
                                                No se encontraron roles.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="flex items-center justify-between space-x-2 py-4">
                        <div className="flex-1 text-sm text-muted-foreground">
                            {roles.length} rol{roles.length !== 1 ? 'es' : ''} registrado{roles.length !== 1 ? 's' : ''}.
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Modal Crear / Editar Rol */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => { if (!saving) setIsFormOpen(false) }}
                title={editingRole ? 'Editar Rol' : 'Nuevo Rol'}
                className="max-w-md"
            >
                <div className="mt-4 space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre del Rol</label>
                        <Input
                            placeholder="Ej. SUPERVISOR"
                            value={formNombre}
                            onChange={(e) => setFormNombre(e.target.value.toUpperCase())}
                            className="h-10"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo de Autenticación</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFormPin(false)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                    !formPin
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                                        : 'border-border hover:border-muted-foreground/30'
                                }`}
                            >
                                <Lock className={`h-6 w-6 ${!formPin ? 'text-blue-500' : 'text-muted-foreground'}`} />
                                <span className={`text-sm font-medium ${!formPin ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                                    Contraseña
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormPin(true)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                    formPin
                                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                                        : 'border-border hover:border-muted-foreground/30'
                                }`}
                            >
                                <Key className={`h-6 w-6 ${formPin ? 'text-amber-500' : 'text-muted-foreground'}`} />
                                <span className={`text-sm font-medium ${formPin ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                    PIN
                                </span>
                            </button>
                        </div>
                    </div>

                    {editingRole && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Estado</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormEstado(true)}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                                        formEstado
                                            ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                                            : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                                    }`}
                                >
                                    Activo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormEstado(false)}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                                        !formEstado
                                            ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                                            : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                                    }`}
                                >
                                    Inactivo
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveRole} disabled={saving || !formNombre.trim()} className="gap-2">
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editingRole ? 'Actualizar' : 'Crear Rol'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal de confirmación de eliminación */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={() => { if (!deleting) { setIsDeleteOpen(false); setDeletingRole(null) } }}
                title=""
                className="max-w-lg"
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
                        <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-2 border-red-200 dark:border-red-800 flex items-center justify-center">
                            <AlertTriangle className="h-10 w-10 text-red-500" />
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-foreground mb-2">
                        ¿Eliminar este rol?
                    </h3>

                    <p className="text-muted-foreground mb-5 max-w-sm">
                        Estás a punto de eliminar permanentemente el rol:
                    </p>

                    <div className="w-full max-w-sm bg-muted/50 border border-border rounded-xl px-5 py-4 mb-6">
                        <div className="flex items-center justify-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            <p className="text-lg font-semibold text-foreground">
                                {deletingRole?.nombre}
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {deletingRole?.pin ? '🔑 Autenticación por PIN' : '🔒 Autenticación por Contraseña'}
                        </p>
                    </div>

                    <p className="text-xs text-red-500/80 dark:text-red-400/80 mb-6">
                        Los usuarios con este rol podrían perder acceso. Esta acción no se puede deshacer.
                    </p>

                    {deleteError && (
                        <div className="w-full max-w-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4">
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                {deleteError}
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 w-full max-w-sm">
                        <Button
                            variant="outline"
                            onClick={() => { setIsDeleteOpen(false); setDeletingRole(null) }}
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
