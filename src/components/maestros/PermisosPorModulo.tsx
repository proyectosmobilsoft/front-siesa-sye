import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { ModuloPermisos, PermisoDeModulo } from '@/api/seguridad'
import { agruparPorMenu, organizarPorSidebar, type ModuloMenu } from './permisosSidebar'

/**
 * Selector de permisos de un rol, como un árbol igual al menú lateral:
 *
 *   Menú (Tesorería)  ▸  Submenú (Recibo de Caja)  ▸  Acciones (ver, crear, anular…)
 *
 * La estructura sale de permisosSidebar.ts (navigation.ts + auth_modulos). El permiso de acceso
 * (VISTA) de cada submenú es la puerta: marcarlo da entrada a la pantalla; desmarcarlo quita
 * también sus acciones, porque una acción sin acceso a la pantalla no sirve de nada (el API
 * además agrega el VISTA al guardar si el rol tiene cualquier acción del submenú).
 */

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const ETIQUETA_TIPO: Record<string, string> = { TAB: 'pestaña', ESPECIAL: 'especial' }

type Estado = 'todos' | 'algunos' | 'ninguno'
const estadoDe = (marcados: number, total: number): Estado => (marcados === 0 ? 'ninguno' : marcados === total ? 'todos' : 'algunos')

/** Casilla de tres estados (marcada, parcial, vacía) */
function Casilla({ estado, onChange, label }: { estado: Estado; onChange: () => void; label: string }) {
    const ref = useRef<HTMLInputElement>(null)
    useEffect(() => { if (ref.current) ref.current.indeterminate = estado === 'algunos' }, [estado])
    return <input ref={ref} type="checkbox" aria-label={label} checked={estado === 'todos'} onChange={onChange} className="h-4 w-4 shrink-0 rounded border-input" />
}

interface Props {
    modulos: ModuloPermisos[]
    loading: boolean
    /** IDs de permisos seleccionados */
    seleccion: number[]
    onChange: (ids: number[]) => void
    /** Cambia cuando el formulario pasa a otro rol: reinicia qué ramas están abiertas */
    resetKey: string
}

export const PermisosPorModulo = ({ modulos: modulosBd, loading, seleccion, onChange, resetKey }: Props) => {
    const modulos = useMemo(() => organizarPorSidebar(modulosBd), [modulosBd])
    const seleccionSet = useMemo(() => new Set(seleccion), [seleccion])
    const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
    const [search, setSearch] = useState('')

    useEffect(() => { setAbiertos(new Set()); setSearch('') }, [resetKey, modulosBd])

    const buscando = search.trim().length > 0
    const visibles = useMemo(() => {
        if (!buscando) return modulos
        const q = sinAcentos(search)
        return modulos.filter((m) =>
            sinAcentos(m.nombre).includes(q) || sinAcentos(m.grupoMenu).includes(q) ||
            m.permisos.some((p) => sinAcentos(p.codigo).includes(q) || sinAcentos(p.etiqueta).includes(q)))
    }, [modulos, search, buscando])
    const menus = useMemo(() => agruparPorMenu(visibles), [visibles])

    const alternarRama = (clave: string) =>
        setAbiertos((prev) => { const sig = new Set(prev); if (sig.has(clave)) sig.delete(clave); else sig.add(clave); return sig })
    const estaAbierta = (clave: string) => buscando || abiertos.has(clave)

    const ids = (ms: ModuloMenu[]) => ms.flatMap((m) => m.permisos.map((p) => p.id))
    const contar = (ms: ModuloMenu[]) => { const todos = ids(ms); return { marcados: todos.filter((id) => seleccionSet.has(id)).length, total: todos.length } }

    /** Marca o desmarca varios permisos a la vez (menú o submenú completo) */
    const alternarGrupo = (ms: ModuloMenu[]) => {
        const todos = ids(ms)
        const completo = todos.every((id) => seleccionSet.has(id))
        if (completo) { const quitar = new Set(todos); onChange(seleccion.filter((id) => !quitar.has(id))) }
        else onChange([...seleccion, ...todos.filter((id) => !seleccionSet.has(id))])
    }

    const alternarPermiso = (m: ModuloMenu, p: PermisoDeModulo) => {
        const vista = m.permisos.find((x) => x.tipo === 'VISTA')
        if (p.tipo === 'VISTA') {
            // Sin acceso a la pantalla no hay acciones: se quitan todas las del submenú
            if (seleccionSet.has(p.id)) { const quitar = new Set(m.permisos.map((x) => x.id)); onChange(seleccion.filter((id) => !quitar.has(id))) }
            else onChange([...seleccion, p.id])
            return
        }
        if (seleccionSet.has(p.id)) { onChange(seleccion.filter((id) => id !== p.id)); return }
        onChange([...seleccion, p.id, ...(vista && !seleccionSet.has(vista.id) ? [vista.id] : [])])
    }

    const totalSeleccionados = seleccion.length

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permisos del Rol</span>
                <span className="text-xs text-muted-foreground">{totalSeleccionados} permiso{totalSeleccionados !== 1 ? 's' : ''}</span>
            </div>

            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Buscar menú, submenú o permiso" placeholder="Buscar menú, submenú o permiso..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8" disabled={loading} />
            </div>

            {loading ? (
                <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando permisos...</div>
            ) : menus.length === 0 ? (
                <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">No se encontraron permisos.</div>
            ) : (
                <div className="space-y-1.5">
                    {menus.map(({ menu, modulos: submenus }) => {
                        const claveMenu = `m:${menu}`
                        const abierto = estaAbierta(claveMenu)
                        const c = contar(submenus)
                        return (
                            <div key={menu} className="overflow-hidden rounded-md border">
                                {/* Nivel 1: menú */}
                                <div className="flex items-center gap-2 bg-muted/50 px-3 py-2">
                                    <Casilla estado={estadoDe(c.marcados, c.total)} onChange={() => alternarGrupo(submenus)} label={`Todo el menú ${menu}`} />
                                    <button type="button" onClick={() => alternarRama(claveMenu)} aria-expanded={abierto} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                        <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${abierto ? 'rotate-90' : ''}`} />
                                        <span className="truncate text-sm font-bold uppercase tracking-wide">{menu}</span>
                                        <span className="shrink-0 text-xs text-muted-foreground">{c.marcados} de {c.total}</span>
                                    </button>
                                </div>

                                {abierto && (
                                    <div className="divide-y">
                                        {submenus.map((m) => {
                                            const claveSub = `s:${m.codigo}`
                                            const subAbierto = estaAbierta(claveSub)
                                            const cs = contar([m])
                                            return (
                                                <div key={m.codigo}>
                                                    {/* Nivel 2: submenú */}
                                                    <div className="flex items-center gap-2 py-1.5 pl-6 pr-3">
                                                        <Casilla estado={estadoDe(cs.marcados, cs.total)} onChange={() => alternarGrupo([m])} label={`Todo ${m.nombre}`} />
                                                        <button type="button" onClick={() => alternarRama(claveSub)} aria-expanded={subAbierto} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                                            <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${subAbierto ? 'rotate-90' : ''}`} />
                                                            <span className="truncate text-sm font-semibold">{m.nombre}</span>
                                                            <span className="shrink-0 text-xs text-muted-foreground">{cs.marcados} de {cs.total}</span>
                                                        </button>
                                                    </div>

                                                    {/* Nivel 3: acciones */}
                                                    {subAbierto && (
                                                        <div className="grid gap-0.5 pb-2 pl-14 pr-3 sm:grid-cols-2">
                                                            {m.permisos.map((p) => (
                                                                <label key={p.id} title={p.codigo} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                                                                    <input type="checkbox" checked={seleccionSet.has(p.id)} onChange={() => alternarPermiso(m, p)} className="h-4 w-4 shrink-0 rounded border-input" />
                                                                    <span className="truncate">{p.tipo === 'VISTA' ? 'Entrar a la pantalla' : p.etiqueta}</span>
                                                                    {ETIQUETA_TIPO[p.tipo] && <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] uppercase text-muted-foreground">{ETIQUETA_TIPO[p.tipo]}</span>}
                                                                </label>
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
                    })}
                </div>
            )}
        </div>
    )
}
