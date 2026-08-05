import { useState, useEffect, useMemo, useRef } from 'react'
import {
    Plus,
    Search,
    X,
    ChevronDown,
    Check,
    Loader2,
    Shield,
    LayoutDashboard,
    Receipt,
    Wallet,
    ClipboardList,
    Banknote,
    Archive,
    ListChecks,
    Truck,
    UserCircle,
    type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuloPermisos, PermisoDeModulo } from '@/api/seguridad'

/**
 * Selector de permisos agrupados por módulo para el formulario de Roles.
 *
 * Reemplaza la lista plana de códigos (donde había que saberse de memoria que
 * VER_ANTICIPO_TAB_RECHAZADA pertenece a Egreso): aquí se agrega un módulo y
 * se marcan las acciones que necesita el rol.
 *
 * La agrupación NO vive aquí: viene de auth_modulos vía GET /auth-secundario/
 * modulos, así que un permiso nuevo aparece solo sin tocar este archivo.
 *
 * El permiso VISTA de un módulo agregado va marcado y bloqueado: el API lo
 * agrega de todas formas al guardar, porque una acción sin acceso al módulo no
 * sirve de nada. Aquí solo se refleja esa regla para que no sorprenda.
 */

const ICONOS: Record<string, LucideIcon> = {
    LayoutDashboard,
    Receipt,
    Wallet,
    ClipboardList,
    Banknote,
    Archive,
    ListChecks,
    Truck,
    UserCircle,
}

const iconoDe = (nombre?: string | null): LucideIcon => (nombre && ICONOS[nombre]) || Shield

/** Títulos de las secciones dentro de la tarjeta de un módulo. */
const TITULO_SECCION: Record<string, string> = {
    VISTA: 'Acceso',
    ACCION: 'Acciones',
    TAB: 'Pestañas visibles',
    ESPECIAL: 'Especial',
}

const ORDEN_SECCION = ['VISTA', 'ACCION', 'TAB', 'ESPECIAL']

interface Props {
    modulos: ModuloPermisos[]
    loading: boolean
    /** IDs de permisos seleccionados */
    seleccion: number[]
    onChange: (ids: number[]) => void
    /**
     * Cambia cuando el formulario pasa a otro rol (id del rol o 'nuevo'):
     * reinicia qué módulos aparecen desplegados en la lista.
     */
    resetKey: string
}

export const PermisosPorModulo = ({ modulos, loading, seleccion, onChange, resetKey }: Props) => {
    // Códigos de módulo visibles en el formulario. Se distingue de "tiene
    // permisos marcados" para poder agregar un módulo y todavía no marcar nada.
    const [agregados, setAgregados] = useState<string[]>([])
    const [expandidos, setExpandidos] = useState<string[]>([])
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [search, setSearch] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)

    const seleccionSet = useMemo(() => new Set(seleccion), [seleccion])

    // Al abrir el formulario de otro rol, los módulos que ya tienen permisos
    // asignados aparecen agregados.
    useEffect(() => {
        const conPermisos = modulos
            .filter((m) => m.permisos.some((p) => seleccionSet.has(p.id)))
            .map((m) => m.codigo)
        setAgregados(conPermisos)
        // Contraídos al abrir: un rol con varios módulos llenaba el formulario
        // de checkboxes antes de que el usuario supiera qué venía a cambiar.
        setExpandidos([])
        setSearch('')
        setDropdownOpen(false)
        // Depende solo de resetKey/modulos a propósito: si dependiera de la
        // selección, quitar el último permiso de un módulo lo haría desaparecer
        // mientras el usuario lo está editando.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey, modulos])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const modulosAgregados = modulos.filter((m) => agregados.includes(m.codigo))
    const disponibles = modulos.filter((m) => {
        if (agregados.includes(m.codigo)) return false
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
            m.nombre.toLowerCase().includes(q) ||
            m.grupo?.toLowerCase().includes(q) ||
            m.permisos.some((p) => p.codigo.toLowerCase().includes(q) || p.etiqueta.toLowerCase().includes(q))
        )
    })

    const permisoVista = (m: ModuloPermisos) => m.permisos.find((p) => p.tipo === 'VISTA')

    const agregarModulo = (m: ModuloPermisos) => {
        setAgregados((prev) => [...prev, m.codigo])
        setExpandidos((prev) => [...prev, m.codigo])
        setDropdownOpen(false)
        setSearch('')
        // Agregar un módulo significa, como mínimo, poder entrar a él
        const vista = permisoVista(m)
        if (vista && !seleccionSet.has(vista.id)) onChange([...seleccion, vista.id])
    }

    const quitarModulo = (m: ModuloPermisos) => {
        setAgregados((prev) => prev.filter((c) => c !== m.codigo))
        setExpandidos((prev) => prev.filter((c) => c !== m.codigo))
        const idsModulo = new Set(m.permisos.map((p) => p.id))
        onChange(seleccion.filter((id) => !idsModulo.has(id)))
    }

    const togglePermiso = (m: ModuloPermisos, permiso: PermisoDeModulo) => {
        // El VISTA de un módulo agregado no se puede desmarcar: el API lo
        // reinsertaría igual al guardar.
        if (permiso.tipo === 'VISTA') return

        if (seleccionSet.has(permiso.id)) {
            onChange(seleccion.filter((id) => id !== permiso.id))
            return
        }
        const vista = permisoVista(m)
        const nuevos = [permiso.id]
        if (vista && !seleccionSet.has(vista.id)) nuevos.push(vista.id)
        onChange([...seleccion, ...nuevos])
    }

    const toggleTodoElModulo = (m: ModuloPermisos) => {
        const idsModulo = m.permisos.map((p) => p.id)
        const todosMarcados = idsModulo.every((id) => seleccionSet.has(id))
        if (todosMarcados) {
            // Deja solo el acceso: quitar todo dejaría el módulo en la lista sin
            // ningún permiso, que es un estado sin sentido.
            const vista = permisoVista(m)
            const idsQuitar = new Set(idsModulo.filter((id) => id !== vista?.id))
            onChange(seleccion.filter((id) => !idsQuitar.has(id)))
        } else {
            const faltantes = idsModulo.filter((id) => !seleccionSet.has(id))
            onChange([...seleccion, ...faltantes])
        }
    }

    const toggleExpandido = (codigo: string) => {
        setExpandidos((prev) => (prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]))
    }

    const totalSeleccionados = seleccion.length

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Permisos del Rol
                </label>
                <span className="text-xs text-muted-foreground">
                    {modulosAgregados.length} módulo{modulosAgregados.length !== 1 ? 's' : ''} · {totalSeleccionados} permiso
                    {totalSeleccionados !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Agregar módulo */}
            <div ref={dropdownRef} className="relative">
                <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    disabled={loading}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 disabled:opacity-60"
                >
                    <span className="flex items-center gap-2 text-muted-foreground">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {loading ? 'Cargando módulos...' : 'Agregar módulo'}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>

                {dropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
                        <div className="border-b bg-muted/30 p-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar módulo o permiso..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-9 pl-8"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto p-1">
                            {disponibles.length === 0 ? (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                    {modulos.length === 0 ? 'No hay módulos' : 'No quedan módulos por agregar'}
                                </div>
                            ) : (
                                disponibles.map((m) => {
                                    const Icono = iconoDe(m.icono)
                                    return (
                                        <button
                                            key={m.codigo}
                                            type="button"
                                            onClick={() => agregarModulo(m)}
                                            className="flex w-full items-center gap-2.5 rounded px-2 py-2 text-left hover:bg-muted/60"
                                        >
                                            <Icono className="h-4 w-4 shrink-0 text-primary opacity-70" />
                                            <span className="flex-1 truncate text-sm font-medium">{m.nombre}</span>
                                            {m.grupo && (
                                                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                    {m.grupo}
                                                </span>
                                            )}
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {m.permisos.length}
                                            </span>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Módulos agregados */}
            {modulosAgregados.length === 0 ? (
                <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                    Este rol no tiene permisos.
                    <br />
                    <span className="text-xs">Agrega un módulo para elegir qué puede hacer en él.</span>
                </div>
            ) : (
                <div className="space-y-2">
                    {modulosAgregados.map((m) => {
                        const Icono = iconoDe(m.icono)
                        const abierto = expandidos.includes(m.codigo)
                        const marcados = m.permisos.filter((p) => seleccionSet.has(p.id)).length
                        const todos = marcados === m.permisos.length

                        const secciones = ORDEN_SECCION.map((tipo) => ({
                            tipo,
                            permisos: m.permisos.filter((p) => p.tipo === tipo),
                        })).filter((s) => s.permisos.length > 0)

                        return (
                            <div key={m.codigo} className="overflow-hidden rounded-md border">
                                <div className="flex items-center gap-2 bg-muted/40 px-3 py-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleExpandido(m.codigo)}
                                        className="flex flex-1 items-center gap-2.5 text-left"
                                    >
                                        <ChevronDown
                                            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${abierto ? '' : '-rotate-90'}`}
                                        />
                                        <Icono className="h-4 w-4 shrink-0 text-primary" />
                                        <span className="truncate text-sm font-semibold">{m.nombre}</span>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {marcados} de {m.permisos.length}
                                        </span>
                                    </button>
                                    {m.permisos.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => toggleTodoElModulo(m)}
                                            className="shrink-0 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                                        >
                                            {todos ? 'Solo acceso' : 'Marcar todo'}
                                        </button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => quitarModulo(m)}
                                        className="h-7 w-7 shrink-0 p-0 text-destructive hover:bg-destructive/10"
                                        title="Quitar módulo del rol"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                {abierto && (
                                    <div className="space-y-3 px-3 py-2.5">
                                        {secciones.map((seccion) => (
                                            <div key={seccion.tipo} className="space-y-1">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                    {TITULO_SECCION[seccion.tipo] || seccion.tipo}
                                                </p>
                                                <div className="grid gap-1 sm:grid-cols-2">
                                                    {seccion.permisos.map((p) => {
                                                        const marcado = seleccionSet.has(p.id)
                                                        const fijo = p.tipo === 'VISTA'
                                                        return (
                                                            <label
                                                                key={p.id}
                                                                title={p.codigo}
                                                                className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                                                                    fijo
                                                                        ? 'cursor-default text-muted-foreground'
                                                                        : 'cursor-pointer hover:bg-muted/50'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={marcado}
                                                                    disabled={fijo}
                                                                    onChange={() => togglePermiso(m, p)}
                                                                    className="rounded border-input"
                                                                />
                                                                <span className="truncate">{p.etiqueta}</span>
                                                                {fijo && (
                                                                    <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wide">
                                                                        <Check className="h-3 w-3" />
                                                                        incluido
                                                                    </span>
                                                                )}
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
