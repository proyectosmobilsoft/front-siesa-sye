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
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useNavigate } from 'react-router-dom'
import { seguridadApi, AuthRole, ModuloPermisos } from '@/api/seguridad'
import { PermisosPorModulo } from '@/components/maestros/PermisosPorModulo'
import { badgeClass } from '@/utils/badges'
import { usePermiso } from '@/hooks/usePermiso'

export const MaestroRolesPage = () => {
    const navigate = useNavigate()

    // Permisos de acción del maestro de Roles. La API también los exige
    // (requirePermiso en /auth-secundario/roles).
    const { puede, P } = usePermiso()
    const puedeCrear = puede(P.CREAR_ROL)
    const puedeEditar = puede(P.EDITAR_ROL)
    const puedeEliminar = puede(P.ELIMINAR_ROL)

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
    // Permisos: el catálogo llega ya agrupado por módulo desde auth_modulos,
    // y la selección se maneja como IDs sueltos (que es lo que espera el API).
    const [modulos, setModulos] = useState<ModuloPermisos[]>([])
    const [permisosSeleccionados, setPermisosSeleccionados] = useState<number[]>([])
    const [loadingPermisos, setLoadingPermisos] = useState(false)

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
        // También al montar, no solo al abrir el modal: la tabla resume el
        // acceso de cada rol en módulos, no en códigos sueltos.
        loadModulos()
    }, [])

    const loadModulos = async () => {
        try {
            setLoadingPermisos(true)
            const res = await seguridadApi.listarModulos()
            setModulos(res.data || [])
        } catch (err) {
            console.error('Error cargando módulos de permisos:', err)
            setModulos([])
        } finally {
            setLoadingPermisos(false)
        }
    }

    useEffect(() => {
        if (isFormOpen) {
            loadModulos()
        }
    }, [isFormOpen])

    // --- Handlers CRUD ---
    const handleNewRole = () => {
        setEditingRole(null)
        setFormNombre('')
        setFormPin(false)
        setFormEstado(true)
        setPermisosSeleccionados([])
        setIsFormOpen(true)
    }

    const handleEditRole = (role: AuthRole) => {
        setEditingRole(role)
        setFormNombre(role.nombre)
        setFormPin(role.pin)
        setFormEstado(!!role.estado)
        // Permisos asociados al rol (vienen en role.permisos del API)
        setPermisosSeleccionados(
            (role.permisos || []).map((p) => p.id).filter((id): id is number => id != null)
        )
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
            permisos: permisosSeleccionados,
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

    /** Nombres de los módulos donde el rol tiene al menos un permiso. */
    const modulosDelRol = (role: AuthRole): string[] => {
        const ids = new Set((role.permisos || []).map((p) => p.id))
        return modulos.filter((m) => m.permisos.some((p) => ids.has(p.id))).map((m) => m.nombre)
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
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass(activo ? 'green' : 'red')}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
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
            id: 'acceso',
            header: 'Acceso',
            cell: ({ row }) => {
                const role = row.original
                const nombres = modulosDelRol(role)
                const total = role.permisos?.length ?? 0
                if (nombres.length === 0) {
                    return <span className="text-sm text-muted-foreground">Sin permisos</span>
                }
                const visibles = nombres.slice(0, 2)
                const resto = nombres.length - visibles.length
                return (
                    <div className="flex flex-wrap items-center gap-1" title={`${nombres.join(', ')} — ${total} permisos`}>
                        {visibles.map((n) => (
                            <span key={n} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                {n}
                            </span>
                        ))}
                        {resto > 0 && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                +{resto}
                            </span>
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
                        {puedeEditar && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRole(role)}
                                title="Editar rol"
                                className="h-8 w-8 p-0 text-primary border border-primary/20 hover:bg-primary/10"
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                        )}
                        {puedeEliminar && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRole(role)}
                                title="Eliminar rol"
                                className="h-8 w-8 p-0 text-destructive border border-destructive/20 hover:bg-destructive/10"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                        {!puedeEditar && !puedeEliminar && (
                            <span className="text-xs text-muted-foreground">—</span>
                        )}
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
            className="flex h-full min-h-0 flex-col gap-4 p-6"
        >
            <div className="flex shrink-0 items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => navigate('/configuracion')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        {roles.length} rol{roles.length !== 1 ? 'es' : ''} registrado{roles.length !== 1 ? 's' : ''}
                    </span>
                </div>
                {puedeCrear && (
                    <Button onClick={handleNewRole} className="whitespace-nowrap">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Rol
                    </Button>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b bg-muted/50">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground"
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
                                    className="border-b transition-colors hover:bg-muted/40"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="py-3.5 px-4 align-middle">
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

            {/* Modal Crear / Editar Rol */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => { if (!saving) setIsFormOpen(false) }}
                title={editingRole ? 'Editar Rol' : 'Nuevo Rol'}
                className="max-w-2xl"
            >
                {/* Con varios módulos desplegados el formulario crece: scroll
                    propio para que los botones de guardar sigan alcanzables. */}
                <div className="mt-4 max-h-[70vh] space-y-5 overflow-y-auto pr-1">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre del Rol</label>
                        <Input
                            placeholder="Ej. SUPERVISOR"
                            value={formNombre}
                            onChange={(e) => setFormNombre(e.target.value.toUpperCase())}
                            className="h-10"
                        />
                    </div>

                    {/* Tipo de Autenticación + Estado en una sola fila compacta */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[140px] space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Autenticación</label>
                            <div className="flex gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setFormPin(false)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-sm font-medium shrink-0 ${
                                        !formPin
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                                            : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                                    }`}
                                >
                                    <Lock className="h-4 w-4" />
                                    Contraseña
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormPin(true)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-sm font-medium shrink-0 ${
                                        formPin
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                                            : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                                    }`}
                                >
                                    <Key className="h-4 w-4" />
                                    PIN
                                </button>
                            </div>
                        </div>
                        {editingRole && (
                            <div className="flex-1 min-w-[120px] space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</label>
                                <div className="flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setFormEstado(true)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-sm font-medium shrink-0 ${
                                            formEstado
                                                ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                                                : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${formEstado ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                                        Activo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormEstado(false)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-sm font-medium shrink-0 ${
                                            !formEstado
                                                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                                : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${!formEstado ? 'bg-destructive' : 'bg-muted-foreground/30'}`} />
                                        Inactivo
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Permisos agrupados por módulo (auth_modulos) */}
                    <PermisosPorModulo
                        modulos={modulos}
                        loading={loadingPermisos}
                        seleccion={permisosSeleccionados}
                        onChange={setPermisosSeleccionados}
                        resetKey={editingRole ? String(editingRole.id) : 'nuevo'}
                    />


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
                        <div className="relative h-20 w-20 rounded-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
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

                    <p className="text-xs text-destructive/80 mb-6">
                        Los usuarios con este rol podrían perder acceso. Esta acción no se puede deshacer.
                    </p>

                    {deleteError && (
                        <div className="w-full max-w-sm bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 mb-4">
                            <p className="text-sm text-destructive font-medium">
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
