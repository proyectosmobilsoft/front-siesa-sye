import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { ArrowLeft, Plus, Edit, Shield, Loader2, Trash2, AlertTriangle, Key, Lock, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useNavigate } from 'react-router-dom'
import { seguridadApi, AuthRole, Permiso } from '@/api/seguridad'

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
    // Permisos
    const [permisos, setPermisos] = useState<Permiso[]>([])
    const [permisosSeleccionados, setPermisosSeleccionados] = useState<Permiso[]>([])
    const [loadingPermisos, setLoadingPermisos] = useState(false)
    const [permisosDropdownOpen, setPermisosDropdownOpen] = useState(false)
    const [permisosSearch, setPermisosSearch] = useState('')
    const permisosDropdownRef = useRef<HTMLDivElement>(null)

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

    const loadPermisos = async () => {
        try {
            setLoadingPermisos(true)
            const res = await seguridadApi.listarPermisos()
            setPermisos(res.data || [])
        } catch (err) {
            console.error('Error cargando permisos:', err)
            setPermisos([])
        } finally {
            setLoadingPermisos(false)
        }
    }

    useEffect(() => {
        if (isFormOpen) {
            loadPermisos()
        }
    }, [isFormOpen])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (permisosDropdownRef.current && !permisosDropdownRef.current.contains(e.target as Node)) {
                setPermisosDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const permisosFiltrados = permisos.filter(p => {
        if (!permisosSearch.trim()) return true
        const q = permisosSearch.toLowerCase()
        return (p.codigo?.toLowerCase().includes(q)) || (p.nombre?.toLowerCase().includes(q))
    })

    const togglePermiso = (perm: Permiso) => {
        const yaEsta = permisosSeleccionados.some(p => p.codigo === perm.codigo)
        if (yaEsta) {
            setPermisosSeleccionados(prev => prev.filter(p => p.codigo !== perm.codigo))
        } else {
            setPermisosSeleccionados(prev => [...prev, perm])
        }
    }

    const quitarPermiso = (codigo: string) => {
        setPermisosSeleccionados(prev => prev.filter(p => p.codigo !== codigo))
    }

    const estaSeleccionado = (codigo: string) => permisosSeleccionados.some(p => p.codigo === codigo)

    // --- Handlers CRUD ---
    const handleNewRole = () => {
        setEditingRole(null)
        setFormNombre('')
        setFormPin(false)
        setFormEstado(true)
        setPermisosSeleccionados([])
        setPermisosSearch('')
        setIsFormOpen(true)
    }

    const handleEditRole = (role: AuthRole) => {
        setEditingRole(role)
        setFormNombre(role.nombre)
        setFormPin(role.pin)
        setFormEstado(!!role.estado)
        // Cargar permisos asociados al rol (vienen en role.permisos del API)
        const permisosDelRol: Permiso[] = (role.permisos || []).map((p) => ({
            id: p.id,
            codigo: p.codigo,
            nombre: p.descripcion,
        }))
        setPermisosSeleccionados(permisosDelRol)
        setPermisosSearch('')
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

        const idsPermisos = permisosSeleccionados.map(p => p.id).filter((id): id is number => id != null)
        const payload = {
            nombre: formNombre.trim().toUpperCase(),
            pin: formPin,
            estado: formEstado,
            permisos: idsPermisos,
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
                className="max-w-lg"
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

                    {/* Tipo de Autenticación + Estado en una sola fila compacta */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[140px] space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Autenticación</label>
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
                                <label className="text-xs font-medium text-muted-foreground">Estado</label>
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
                                                ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                                                : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${!formEstado ? 'bg-red-500' : 'bg-muted-foreground/30'}`} />
                                        Inactivo
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Permisos: multiselect con search + tabla */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Permisos del Rol</label>
                        <div ref={permisosDropdownRef} className="relative">
                            <div
                                onClick={() => setPermisosDropdownOpen(!permisosDropdownOpen)}
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                            >
                                <span className="text-muted-foreground truncate">
                                    {loadingPermisos ? 'Cargando permisos...' : 'Seleccionar permisos para agregar'}
                                </span>
                                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                            </div>
                            {permisosDropdownOpen && (
                                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-hidden">
                                    <div className="p-2 border-b bg-muted/30">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar permiso..."
                                                value={permisosSearch}
                                                onChange={(e) => setPermisosSearch(e.target.value)}
                                                className="h-9 pl-8"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto p-1">
                                        {permisosFiltrados.length === 0 ? (
                                            <div className="py-4 text-center text-sm text-muted-foreground">
                                                {loadingPermisos ? 'Cargando...' : 'No hay permisos'}
                                            </div>
                                        ) : (
                                            permisosFiltrados.map((perm) => (
                                                <label
                                                    key={perm.codigo}
                                                    className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-muted/50 ${estaSeleccionado(perm.codigo) ? 'bg-primary/10' : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={estaSeleccionado(perm.codigo)}
                                                        onChange={() => togglePermiso(perm)}
                                                        className="rounded border-input"
                                                    />
                                                    <span className="text-sm truncate">{perm.codigo}</span>
                                                    {perm.nombre && <span className="text-xs text-muted-foreground truncate">— {perm.nombre}</span>}
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tabla de permisos seleccionados */}
                        {permisosSeleccionados.length > 0 && (
                            <div className="rounded-md border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 border-b">
                                            <th className="h-9 px-3 text-left font-medium text-muted-foreground">Código</th>
                                            <th className="h-9 px-3 text-left font-medium text-muted-foreground">Nombre</th>
                                            <th className="h-9 px-3 w-12 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {permisosSeleccionados.map((perm) => (
                                            <tr key={perm.codigo} className="border-b last:border-0 hover:bg-muted/30">
                                                <td className="py-2 px-3 font-medium">{perm.codigo}</td>
                                                <td className="py-2 px-3 text-muted-foreground">{perm.nombre || '—'}</td>
                                                <td className="py-2 px-3 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                                        onClick={() => quitarPermiso(perm.codigo)}
                                                        title="Quitar permiso"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

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
