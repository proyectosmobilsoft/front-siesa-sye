import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'
import {
    Plus,
    Edit,
    Trash2,
    RefreshCw,
    Loader2,
    AlertTriangle,
    Shield,
    Search,
    Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
    seguridadApi,
    ModuloPermisos,
    PermisoDeModulo,
    TipoPermiso,
} from '@/api/seguridad'
import { organizarPorSidebar } from '@/components/maestros/permisosSidebar'
import { EnlacesPersonalizados, NuevoModuloPersonalizadoModal } from '@/components/maestros/ModulosPersonalizados'
import { esPersonalizado, MENU_PERSONALIZADO_KEY } from '@/api/menuPersonalizado'
import { ICONOS_MENU, iconoMenu } from '@/config/iconosMenu'
import { useQueryClient } from '@tanstack/react-query'
import { badgeClass, Tono } from '@/utils/badges'
import { usePermiso } from '@/hooks/usePermiso'

/**
 * Maestro de Módulos y Permisos: el CRUD del propio catálogo de seguridad
 * (auth_modulos + auth_permisos).
 *
 * Es lo que permite que agregar un módulo nuevo al sistema no requiera un
 * script SQL a mano: se crea aquí y la pantalla de Roles lo muestra agrupado
 * de inmediato.
 *
 * Dos reglas que la pantalla hace visibles, porque el backend las aplica igual:
 *  - El código de un permiso no se edita: está escrito a mano en los
 *    requirePermiso del API y en PERMISOS del front.
 *  - No se borra un permiso asignado a roles, ni un módulo con permisos.
 */

const TIPOS: { valor: TipoPermiso; nombre: string; ayuda: string }[] = [
    { valor: 'VISTA', nombre: 'Vista', ayuda: 'Da acceso al módulo. El API lo agrega solo si el rol tiene otra acción del módulo.' },
    { valor: 'ACCION', nombre: 'Acción', ayuda: 'Operación dentro del módulo (crear, aprobar, …).' },
    { valor: 'TAB', nombre: 'Pestaña', ayuda: 'Visibilidad de una pestaña dentro del módulo.' },
    { valor: 'ESPECIAL', nombre: 'Especial', ayuda: 'Marca de comportamiento, no es una pantalla.' },
]

const colorTipo = (tipo: TipoPermiso): Tono =>
    tipo === 'VISTA' ? 'blue' : tipo === 'TAB' ? 'amber' : tipo === 'ESPECIAL' ? 'yellow' : 'green'

export const MaestroModulosPage = () => {
    const { puede, P } = usePermiso()
    const puedeCrear = puede(P.CREAR_MODULO)
    const puedeEditar = puede(P.EDITAR_MODULO)
    const puedeEliminar = puede(P.ELIMINAR_MODULO)

    const queryClient = useQueryClient()
    const [modulos, setModulos] = useState<ModuloPermisos[]>([])
    const [loading, setLoading] = useState(true)
    const [seleccionado, setSeleccionado] = useState<number | null>(null)
    const [search, setSearch] = useState('')

    // Modal módulo
    const [moduloModalOpen, setModuloModalOpen] = useState(false)
    const [editandoModulo, setEditandoModulo] = useState<ModuloPermisos | null>(null)
    const [formModulo, setFormModulo] = useState({ codigo: '', nombre: '', grupo: '', icono: '', orden: 100, estado: true })

    // Modal permiso
    const [permisoModalOpen, setPermisoModalOpen] = useState(false)
    const [editandoPermiso, setEditandoPermiso] = useState<PermisoDeModulo | null>(null)
    const [formPermiso, setFormPermiso] = useState({
        codigo: '', descripcion: '', etiqueta: '', tipo: 'ACCION' as TipoPermiso, orden: 100, estado: true,
        moduloId: null as number | null,
    })

    const [personalizadoModalOpen, setPersonalizadoModalOpen] = useState(false)

    const [saving, setSaving] = useState(false)
    const [errorForm, setErrorForm] = useState<string | null>(null)

    // Confirmación de borrado (sirve para módulo y para permiso)
    const [borrando, setBorrando] = useState<
        { tipo: 'modulo'; item: ModuloPermisos } | { tipo: 'permiso'; item: PermisoDeModulo } | null
    >(null)
    const [deleting, setDeleting] = useState(false)
    const [errorDelete, setErrorDelete] = useState<string | null>(null)

    const fetchModulos = async (mantenerSeleccion = true) => {
        try {
            setLoading(true)
            const res = await seguridadApi.listarModulos(true)
            const data = res.data || []
            setModulos(data)
            if (!mantenerSeleccion || !data.some((m) => m.id === seleccionado)) {
                setSeleccionado(data[0]?.id ?? null)
            }
        } catch (err) {
            console.error('Error cargando módulos:', err)
            setModulos([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchModulos(false)
    }, [])

    const moduloActual = modulos.find((m) => m.id === seleccionado) || null

    // Lista ordenada y agrupada como el sidebar; cada módulo sigue siendo el de BD
    const modulosMenu = useMemo(() => organizarPorSidebar(modulos, { dividir: false }), [modulos])
    const sa = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

    const modulosFiltrados = modulosMenu.filter((m) => {
        if (!search.trim()) return true
        const q = sa(search.trim())
        return (
            sa(m.nombre).includes(q) ||
            sa(m.codigo).includes(q) ||
            sa(m.grupoMenu).includes(q) ||
            sa(m.paginas || '').includes(q) ||
            m.permisos.some((p) => sa(p.codigo).includes(q) || sa(p.etiqueta).includes(q))
        )
    })

    // --- Módulo ---
    const editarModulo = (m: ModuloPermisos) => {
        setEditandoModulo(m)
        setFormModulo({
            codigo: m.codigo,
            nombre: m.nombre,
            grupo: m.grupo || '',
            icono: m.icono || '',
            orden: m.orden,
            estado: m.estado !== false,
        })
        setErrorForm(null)
        setModuloModalOpen(true)
    }

    const guardarModulo = async () => {
        if (!editandoModulo?.id || !formModulo.nombre.trim()) return
        setSaving(true)
        setErrorForm(null)
        try {
            // Solo nombre, icono, orden y estado: el código y el grupo los maneja el sistema
            await seguridadApi.actualizarModulo(editandoModulo.id, {
                nombre: formModulo.nombre.trim(),
                icono: formModulo.icono.trim() || null,
                orden: Number(formModulo.orden) || 100,
                estado: formModulo.estado,
            })
            setModuloModalOpen(false)
            await fetchModulos()
            await queryClient.invalidateQueries({ queryKey: MENU_PERSONALIZADO_KEY })
        } catch (err: any) {
            setErrorForm(err?.response?.data?.message || 'Error al guardar el módulo')
        } finally {
            setSaving(false)
        }
    }

    // --- Permiso ---
    const nuevoPermiso = () => {
        setEditandoPermiso(null)
        setFormPermiso({ codigo: '', descripcion: '', etiqueta: '', tipo: 'ACCION', orden: 100, estado: true, moduloId: seleccionado })
        setErrorForm(null)
        setPermisoModalOpen(true)
    }

    const editarPermiso = (p: PermisoDeModulo) => {
        setEditandoPermiso(p)
        setFormPermiso({
            codigo: p.codigo,
            descripcion: p.descripcion || '',
            etiqueta: p.etiqueta,
            tipo: p.tipo,
            orden: p.orden,
            estado: p.estado !== false,
            moduloId: seleccionado,
        })
        setErrorForm(null)
        setPermisoModalOpen(true)
    }

    const guardarPermiso = async () => {
        if (!formPermiso.codigo.trim()) return
        setSaving(true)
        setErrorForm(null)
        try {
            const comun = {
                descripcion: formPermiso.descripcion.trim() || null,
                etiqueta: formPermiso.etiqueta.trim() || null,
                tipo: formPermiso.tipo,
                orden: Number(formPermiso.orden) || 100,
                estado: formPermiso.estado,
            }
            if (editandoPermiso) {
                // El código sigue igual en BD; solo cambian etiqueta y módulo (null = Sin clasificar)
                await seguridadApi.actualizarPermiso(editandoPermiso.id, { ...comun, modulo_id: formPermiso.moduloId })
            } else {
                await seguridadApi.crearPermiso({
                    ...comun,
                    codigo: formPermiso.codigo.trim(),
                    modulo_id: formPermiso.moduloId,
                })
            }
            setPermisoModalOpen(false)
            await fetchModulos()
        } catch (err: any) {
            setErrorForm(err?.response?.data?.message || 'Error al guardar el permiso')
        } finally {
            setSaving(false)
        }
    }

    // --- Borrado ---
    const confirmarBorrado = async () => {
        if (!borrando) return
        setDeleting(true)
        setErrorDelete(null)
        try {
            if (borrando.tipo === 'modulo') {
                if (borrando.item.id) await seguridadApi.eliminarModulo(borrando.item.id)
            } else {
                await seguridadApi.eliminarPermiso(borrando.item.id)
            }
            setBorrando(null)
            await queryClient.invalidateQueries({ queryKey: MENU_PERSONALIZADO_KEY })
            await fetchModulos(borrando.tipo === 'permiso')
        } catch (err: any) {
            setErrorDelete(err?.response?.data?.message || 'Error al eliminar')
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
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar módulo o permiso..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                            autoComplete="off"
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => fetchModulos()} disabled={loading} title="Actualizar">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    {puedeCrear && (
                        <Button onClick={() => setPersonalizadoModalOpen(true)} className="whitespace-nowrap gap-2">
                            <Plus className="h-4 w-4" />
                            Nuevo Módulo
                        </Button>
                    )}
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {modulos.length} módulos · {modulos.reduce((n, m) => n + m.permisos.length, 0)} permisos
                </span>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_1fr]">
                {/* Lista de módulos */}
                <div className="min-h-0 overflow-auto rounded-md border">
                    {loading ? (
                        <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Cargando...
                        </div>
                    ) : modulosFiltrados.length === 0 ? (
                        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                            No se encontraron módulos.
                        </div>
                    ) : (
                        modulosFiltrados.map((m, i) => (
                          <div key={m.codigo}>
                            {(i === 0 || modulosFiltrados[i - 1].grupoMenu !== m.grupoMenu) && (
                                <p className="sticky top-0 z-10 border-b bg-muted/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">{m.grupoMenu}</p>
                            )}
                            <button
                                type="button"
                                onClick={() => setSeleccionado(m.id)}
                                className={`flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-0 ${
                                    m.id === seleccionado ? 'bg-primary/10' : 'hover:bg-muted/40'
                                }`}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-semibold">{m.nombre}</span>
                                        {m.estado === false && (
                                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass('red')}`}>
                                                Inactivo
                                            </span>
                                        )}
                                    </div>
                                    <p className="truncate text-[11px] text-muted-foreground">{esPersonalizado(m.codigo) ? 'Sección del menú' : m.paginas ? `Menú: ${m.paginas}` : 'Sin página en el menú'}</p>
                                    {!esPersonalizado(m.codigo) && <p className="truncate font-mono text-[10px] text-muted-foreground/70">{m.codigo}</p>}
                                </div>
                                <span className="shrink-0 text-xs text-muted-foreground">{m.permisos.length}</span>
                            </button>
                          </div>
                        ))
                    )}
                </div>

                {/* Permisos del módulo seleccionado */}
                <div className="flex min-h-0 flex-col overflow-hidden rounded-md border">
                    {!moduloActual ? (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            Selecciona un módulo para ver sus permisos.
                        </div>
                    ) : (
                        <>
                            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                                <Shield className="h-4 w-4 shrink-0 text-primary" />
                                <span className="text-sm font-semibold">{moduloActual.nombre}</span>
                                {!esPersonalizado(moduloActual.codigo) && <span className="font-mono text-[11px] text-muted-foreground">{moduloActual.codigo}</span>}
                                <div className="ml-auto flex items-center gap-1">
                                    {puedeCrear && !esPersonalizado(moduloActual.codigo) && (
                                        <Button size="sm" onClick={nuevoPermiso} className="h-8 gap-1.5">
                                            <Plus className="h-3.5 w-3.5" />
                                            Permiso
                                        </Button>
                                    )}
                                    {puedeEditar && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => editarModulo(moduloActual)}
                                            className="h-8 w-8 p-0 text-primary border border-primary/20 hover:bg-primary/10"
                                            title="Editar módulo"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {puedeEliminar && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => { setBorrando({ tipo: 'modulo', item: moduloActual }); setErrorDelete(null) }}
                                            className="h-8 w-8 p-0 text-destructive border border-destructive/20 hover:bg-destructive/10"
                                            title="Eliminar módulo"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {moduloActual.id !== null && esPersonalizado(moduloActual.codigo) && (
                                <EnlacesPersonalizados moduloId={moduloActual.id} puedeEditar={puedeEditar} puedeAsignarRoles={puede(P.EDITAR_ROL)} />
                            )}

                            <div className={esPersonalizado(moduloActual.codigo) ? 'hidden' : 'min-h-0 flex-1 overflow-auto'}>
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 z-10 bg-card">
                                        <tr className="border-b bg-muted/50">
                                            <th className="h-10 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Etiqueta</th>
                                            <th className="h-10 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código</th>
                                            <th className="h-10 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
                                            <th className="h-10 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Orden</th>
                                            <th className="h-10 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {moduloActual.permisos.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="h-24 text-center text-muted-foreground">
                                                    Este módulo todavía no tiene permisos.
                                                </td>
                                            </tr>
                                        ) : (
                                            moduloActual.permisos.map((p) => (
                                                <tr key={p.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{p.etiqueta}</span>
                                                            {p.estado === false && (
                                                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass('red')}`}>
                                                                    Inactivo
                                                                </span>
                                                            )}
                                                        </div>
                                                        {p.descripcion && (
                                                            <p className="truncate text-xs text-muted-foreground">{p.descripcion}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs">{p.codigo}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(colorTipo(p.tipo))}`}>
                                                            {TIPOS.find((t) => t.valor === p.tipo)?.nombre || p.tipo}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">{p.orden}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-1">
                                                            {puedeEditar && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => editarPermiso(p)}
                                                                    className="h-8 w-8 p-0 text-primary border border-primary/20 hover:bg-primary/10"
                                                                    title="Editar permiso"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {puedeEliminar && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => { setBorrando({ tipo: 'permiso', item: p }); setErrorDelete(null) }}
                                                                    className="h-8 w-8 p-0 text-destructive border border-destructive/20 hover:bg-destructive/10"
                                                                    title="Eliminar permiso"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <NuevoModuloPersonalizadoModal abierto={personalizadoModalOpen} onClose={() => setPersonalizadoModalOpen(false)} onCreado={() => void fetchModulos()} />

            {/* Editar módulo: solo lo que importa; el código y el grupo los maneja el sistema */}
            <Modal
                isOpen={moduloModalOpen}
                onClose={() => { if (!saving) setModuloModalOpen(false) }}
                title="Editar módulo"
                className="max-w-lg"
            >
                <div className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                        <label htmlFor="mod-nombre" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</label>
                        <Input id="mod-nombre" value={formModulo.nombre} onChange={(e) => setFormModulo({ ...formModulo, nombre: e.target.value })} className="h-10" autoFocus />
                    </div>
                    <div className="space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Icono</span>
                        <div className="grid grid-cols-7 gap-1.5">
                            {Object.keys(ICONOS_MENU).map((n) => {
                                const Icono = iconoMenu(n)
                                return (
                                    <button key={n} type="button" title={n} aria-label={n} aria-pressed={formModulo.icono === n} onClick={() => setFormModulo({ ...formModulo, icono: n })}
                                        className={`flex h-10 items-center justify-center rounded-lg border transition-all ${formModulo.icono === n ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/50'}`}>
                                        <Icono className="h-4 w-4" />
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="mod-orden" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Orden</label>
                            <Input id="mod-orden" type="number" value={formModulo.orden} onChange={(e) => setFormModulo({ ...formModulo, orden: Number(e.target.value) })} className="h-10" />
                        </div>
                        <div className="space-y-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</span>
                            <div className="flex gap-1.5">
                                {([[true, 'Activo'], [false, 'Inactivo']] as const).map(([valor, texto]) => (
                                    <button key={texto} type="button" aria-pressed={formModulo.estado === valor} onClick={() => setFormModulo({ ...formModulo, estado: valor })}
                                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${formModulo.estado === valor ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{texto}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    {errorForm && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorForm}</p>}
                    <div className="flex justify-end gap-2 border-t pt-4">
                        <Button variant="outline" onClick={() => setModuloModalOpen(false)} disabled={saving}>Cancelar</Button>
                        <Button onClick={guardarModulo} disabled={saving || !formModulo.nombre.trim()} className="gap-2">
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Guardar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal Permiso */}
            <Modal
                isOpen={permisoModalOpen}
                onClose={() => { if (!saving) setPermisoModalOpen(false) }}
                title={editandoPermiso ? 'Editar Permiso' : `Nuevo Permiso en ${moduloActual?.nombre ?? ''}`}
                className="max-w-lg"
            >
                <div className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código</label>
                        <Input
                            placeholder="CREAR_CAJA"
                            value={formPermiso.codigo}
                            disabled={!!editandoPermiso}
                            onChange={(e) => setFormPermiso({ ...formPermiso, codigo: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                            className="h-10 font-mono disabled:opacity-70"
                        />
                        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                            <Info className="mt-0.5 h-3 w-3 shrink-0" />
                            {editandoPermiso
                                ? 'El código no se puede cambiar: está escrito en el código fuente del API y del front. Para renombrarlo, crea el nuevo y elimina este.'
                                : 'Debe coincidir exactamente con el requirePermiso del backend.'}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Etiqueta</label>
                            <Input
                                placeholder="Crear"
                                value={formPermiso.etiqueta}
                                onChange={(e) => setFormPermiso({ ...formPermiso, etiqueta: e.target.value })}
                                className="h-10"
                            />
                            <p className="text-[11px] text-muted-foreground">Lo que se ve en la pantalla de Roles</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Orden</label>
                            <Input
                                type="number"
                                value={formPermiso.orden}
                                onChange={(e) => setFormPermiso({ ...formPermiso, orden: Number(e.target.value) })}
                                className="h-10"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="permiso-modulo" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Módulo</label>
                        <select
                            id="permiso-modulo"
                            value={formPermiso.moduloId ?? ''}
                            onChange={(e) => setFormPermiso({ ...formPermiso, moduloId: e.target.value ? Number(e.target.value) : null })}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">Sin clasificar</option>
                            {[...new Set(modulosMenu.filter((m) => m.id !== null).map((m) => m.grupoMenu))].map((grupo) => (
                                <optgroup key={grupo} label={grupo}>
                                    {modulosMenu.filter((m) => m.id !== null && m.grupoMenu === grupo).map((m) => (
                                        <option key={m.id} value={m.id as number}>{m.nombre}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <p className="text-[11px] text-muted-foreground">Es la carpeta donde se muestra este permiso al armar un rol. Mover el permiso no cambia lo que hace ni su código.</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</label>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                            {TIPOS.map((t) => (
                                <button
                                    key={t.valor}
                                    type="button"
                                    title={t.ayuda}
                                    onClick={() => setFormPermiso({ ...formPermiso, tipo: t.valor })}
                                    className={`rounded-lg border px-2 py-2 text-sm font-medium transition-all ${
                                        formPermiso.tipo === t.valor
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                                    }`}
                                >
                                    {t.nombre}
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            {TIPOS.find((t) => t.valor === formPermiso.tipo)?.ayuda}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descripción</label>
                        <Input
                            placeholder="Permite crear cajas en el maestro de Cajas"
                            value={formPermiso.descripcion}
                            onChange={(e) => setFormPermiso({ ...formPermiso, descripcion: e.target.value })}
                            className="h-10"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</label>
                        <div className="flex gap-1.5">
                            <button
                                type="button"
                                onClick={() => setFormPermiso({ ...formPermiso, estado: true })}
                                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                                    formPermiso.estado
                                        ? 'border-green-500 bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400'
                                        : 'border-border text-muted-foreground'
                                }`}
                            >
                                Activo
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormPermiso({ ...formPermiso, estado: false })}
                                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                                    !formPermiso.estado
                                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                        : 'border-border text-muted-foreground'
                                }`}
                            >
                                Inactivo
                            </button>
                        </div>
                    </div>

                    {errorForm && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                            {errorForm}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 border-t pt-4">
                        <Button variant="outline" onClick={() => setPermisoModalOpen(false)} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button onClick={guardarPermiso} disabled={saving || !formPermiso.codigo.trim()} className="gap-2">
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editandoPermiso ? 'Actualizar' : 'Crear Permiso'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Confirmación de borrado */}
            <Modal
                isOpen={!!borrando}
                onClose={() => { if (!deleting) { setBorrando(null); setErrorDelete(null) } }}
                title=""
                className="max-w-md"
            >
                <div className="flex flex-col items-center py-4 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-destructive/30 bg-destructive/10">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>

                    <h3 className="mb-2 text-xl font-bold text-foreground">
                        {borrando?.tipo === 'modulo' ? '¿Eliminar este módulo?' : '¿Eliminar este permiso?'}
                    </h3>

                    <div className="mb-6 w-full max-w-sm rounded-xl border border-border bg-muted/50 px-5 py-4">
                        <p className="text-lg font-semibold text-foreground">
                            {borrando?.tipo === 'modulo' ? borrando.item.nombre : borrando?.item.etiqueta}
                        </p>
                        <p className="mt-1 font-mono text-sm text-muted-foreground">{borrando?.item.codigo}</p>
                    </div>

                    <p className="mb-6 text-xs text-destructive/80">
                        {borrando?.tipo === 'modulo'
                            ? esPersonalizado(borrando.item.codigo)
                                ? 'Se elimina la sección completa: sus enlaces, su permiso y la asignación a los roles. Desaparece del menú.'
                                : 'Solo se puede eliminar si ya no tiene permisos.'
                            : 'Solo se puede eliminar si ningún rol lo tiene asignado.'}
                    </p>

                    {errorDelete && (
                        <div className="mb-4 w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                            <p className="text-sm font-medium text-destructive">{errorDelete}</p>
                        </div>
                    )}

                    <div className="flex w-full max-w-sm gap-3">
                        <Button
                            variant="outline"
                            onClick={() => { setBorrando(null); setErrorDelete(null) }}
                            disabled={deleting}
                            className="h-11 flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmarBorrado} disabled={deleting} className="h-11 flex-1 gap-2">
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
