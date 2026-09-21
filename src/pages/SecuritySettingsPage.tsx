import { motion } from 'framer-motion'
import { useState, useEffect, useMemo, useRef } from 'react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { ArrowLeft, UserPlus, Edit, Activity, Search, RefreshCw, Loader2, UserX, UserCheck, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNavigate } from 'react-router-dom'
import { UserFormModal } from '@/components/security/UserFormModal'
import { seguridadApi, UsuarioMaster } from '@/api/seguridad'
import { badgeClass } from '@/utils/badges'
import { Modal } from '@/components/ui/modal'
import { usePermiso } from '@/hooks/usePermiso'

export const SecuritySettingsPage = () => {
    const navigate = useNavigate()

    // Permisos de acción del maestro de Usuarios. La API también los exige
    // (requirePermiso en /auth-secundario/usuarios), esto solo evita mostrar
    // botones que terminarían en 403.
    const { puede, P } = usePermiso()
    const puedeCrear = puede(P.CREAR_USUARIO)
    const puedeEditar = puede(P.EDITAR_USUARIO)

    // Estados modal
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<UsuarioMaster | undefined>(undefined)

    // Estados modal activar/desactivar. El usuario nunca se elimina físicamente.
    const [isStatusOpen, setIsStatusOpen] = useState(false)
    const [statusUser, setStatusUser] = useState<UsuarioMaster | null>(null)
    const [changingStatus, setChangingStatus] = useState(false)

    // Estado tabla
    const [globalFilter, setGlobalFilter] = useState('')
    const [usuarios, setUsuarios] = useState<UsuarioMaster[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [filtroEstado, setFiltroEstado] = useState<'activos' | 'inactivos' | 'todos'>('activos')
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

    const handleStatusUser = (user: UsuarioMaster) => {
        setStatusUser(user)
        setIsStatusOpen(true)
    }

    const confirmStatusChange = async () => {
        if (!statusUser) return
        try {
            setChangingStatus(true)
            await seguridadApi.actualizarUsuario(statusUser.id, { activo: !statusUser.activo })
            setIsStatusOpen(false)
            setStatusUser(null)
            fetchUsuarios(globalFilter)
        } catch (err: any) {
            console.error('❌ Error cambiando el estado del usuario:', err)
            if (err?.response) {
                console.error('📋 Status:', err.response.status)
                console.error('📋 Response:', JSON.stringify(err.response.data, null, 2))
            }
        } finally {
            setChangingStatus(false)
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
            accessorKey: 'centro_operacion_codigo',
            header: 'C.O.',
            cell: ({ row }) => {
                const centros = row.original.centros_operacion ?? ((row.getValue('centro_operacion_codigo') as string | null) ? [row.getValue('centro_operacion_codigo') as string] : [])
                return centros.length
                    ? <span className="font-mono font-medium">{centros.join(', ')}</span>
                    : <span className="text-muted-foreground italic text-xs">Sin asignar</span>
            },
        },
        {
            id: 'rol',
            header: 'Rol',
            // El listado devuelve roles[] (auth_usuario_rol + auth_roles); se usa el
            // primero, que es el que el modal edita como rol_id.
            cell: ({ row }) => {
                const rol = row.original.roles?.[0]?.nombre
                return rol
                    ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass('blue')}`}>
                            {rol}
                        </span>
                    )
                    : <span className="text-muted-foreground italic text-xs">Sin rol</span>
            },
        },
        {
            accessorKey: 'activo',
            header: 'Estado',
            cell: ({ row }) => {
                const activo = row.getValue('activo') as boolean
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass(activo ? 'green' : 'red')}`}>
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
                        {puedeEditar && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                title="Editar usuario"
                                className="h-8 w-8 p-0 text-primary border border-primary/20 hover:bg-primary/10"
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                        )}
                        {puedeEditar && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusUser(user)}
                                title={user.activo ? 'Desactivar usuario' : 'Reactivar usuario'}
                                className={`h-8 w-8 p-0 border ${user.activo ? 'text-destructive border-destructive/20 hover:bg-destructive/10' : 'text-green-600 border-green-600/20 hover:bg-green-600/10'}`}
                            >
                                {user.activo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                        )}
                        {!puedeEditar && (
                            <span className="text-xs text-muted-foreground">—</span>
                        )}
                    </div>
                )
            },
        },
    ]

    const usuariosFiltrados = useMemo(() => {
        if (filtroEstado === 'todos') return usuarios
        const mostrarActivos = filtroEstado === 'activos'
        return usuarios.filter((usuario) => usuario.activo === mostrarActivos)
    }, [usuarios, filtroEstado])

    const conteosEstado = useMemo(() => ({
        activos: usuarios.filter((usuario) => usuario.activo).length,
        inactivos: usuarios.filter((usuario) => !usuario.activo).length,
    }), [usuarios])

    const table = useReactTable({
        data: usuariosFiltrados,
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
            <div className="flex shrink-0 flex-col gap-3 border-b pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                {/* Volver atrás: esta pantalla se alcanza desde Configuración → Seguridad
                    y también desde Maestro → Maestro de Usuarios, así que se regresa al
                    origen real en vez de forzar siempre /configuracion. */}
                <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex w-full items-center gap-3 sm:w-auto">
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
                    <Button variant="outline" size="icon" onClick={() => fetchUsuarios(globalFilter)} disabled={loading} title="Actualizar">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    {puedeCrear && <Button onClick={handleNewUser} className="whitespace-nowrap">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Nuevo Usuario
                    </Button>}
                </div>
                <div className="inline-flex shrink-0 rounded-lg border bg-muted/30 p-1" aria-label="Filtrar usuarios por estado">
                    {([
                        ['activos', 'Activos', conteosEstado.activos],
                        ['inactivos', 'Inactivos', conteosEstado.inactivos],
                        ['todos', 'Todos', usuarios.length],
                    ] as const).map(([valor, etiqueta, cantidad]) => (
                        <button
                            key={valor}
                            type="button"
                            onClick={() => setFiltroEstado(valor)}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                                filtroEstado === valor
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {etiqueta} ({cantidad})
                        </button>
                    ))}
                </div>
                <p className="shrink-0 text-sm text-muted-foreground">
                    {usuariosFiltrados.length} {usuariosFiltrados.length === 1 ? 'usuario' : 'usuarios'}
                </p>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card">
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
            <div className="flex shrink-0 items-center justify-between space-x-2">
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

            <UserFormModal
                isOpen={isFormOpen}
                onClose={handleModalClose}
                user={editingUser}
            />

            {/* Modal de confirmación de activación/desactivación */}
            <Modal
                isOpen={isStatusOpen}
                onClose={() => { if (!changingStatus) { setIsStatusOpen(false); setStatusUser(null) } }}
                title=""
                className="max-w-lg"
            >
                <div className="flex flex-col items-center text-center py-4">
                    {/* Icono grande animado */}
                    <div className="relative mb-6">
                        <div className="relative h-20 w-20 rounded-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center">
                            {statusUser?.activo ? <AlertTriangle className="h-10 w-10 text-destructive" /> : <UserCheck className="h-10 w-10 text-green-600" />}
                        </div>
                    </div>

                    {/* Título */}
                    <h3 className="text-xl font-bold text-foreground mb-2">
                        ¿{statusUser?.activo ? 'Desactivar' : 'Reactivar'} este usuario?
                    </h3>

                    {/* Descripción */}
                    <p className="text-muted-foreground mb-5 max-w-sm">
                        El usuario {statusUser?.activo ? 'perderá el acceso al sistema' : 'recuperará el acceso al sistema'}:
                    </p>

                    {/* Card con info del usuario */}
                    <div className="w-full max-w-sm bg-muted/50 border border-border rounded-xl px-5 py-4 mb-6">
                        <p className="text-lg font-semibold text-foreground">
                            {statusUser?.nombre_completo || 'Sin nombre'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            @{statusUser?.usuario}
                        </p>
                        {statusUser?.email && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {statusUser.email}
                            </p>
                        )}
                    </div>

                    {/* Advertencia */}
                    <p className="text-xs text-muted-foreground mb-6">
                        No se eliminarán datos, roles ni asignaciones. Este cambio puede revertirse.
                    </p>

                    {/* Botones */}
                    <div className="flex gap-3 w-full max-w-sm">
                        <Button
                            variant="outline"
                            onClick={() => { setIsStatusOpen(false); setStatusUser(null) }}
                            disabled={changingStatus}
                            className="flex-1 h-11"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant={statusUser?.activo ? 'destructive' : 'default'}
                            onClick={confirmStatusChange}
                            disabled={changingStatus}
                            className="flex-1 h-11 gap-2"
                        >
                            {changingStatus ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    {statusUser?.activo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                    Sí, {statusUser?.activo ? 'desactivar' : 'reactivar'}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </motion.div>
    )
}
