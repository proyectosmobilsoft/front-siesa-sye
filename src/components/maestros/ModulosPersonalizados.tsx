import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Info, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ICONOS_MENU, iconoMenu } from '@/config/iconosMenu'
import { paginasDelSistema } from '@/config/navigation'
import { menuPersonalizadoApi, MENU_PERSONALIZADO_KEY, type EnlaceAdmin, type ModoEnlace } from '@/api/menuPersonalizado'

const PAGINAS = paginasDelSistema()
const nombreDePagina = (href: string) => PAGINAS.flatMap((g) => g.paginas).find((p) => p.href === href)?.name

const label = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'
const mensajeError = (e: unknown, defecto: string) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || defecto

export function NuevoModuloPersonalizadoModal({ abierto, onClose, onCreado }: { abierto: boolean; onClose: () => void; onCreado: () => void }) {
    const queryClient = useQueryClient()
    const [nombre, setNombre] = useState('')
    const [icono, setIcono] = useState('Puzzle')
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => { if (abierto) { setNombre(''); setIcono('Puzzle'); setError(null) } }, [abierto])

    const guardar = async () => {
        if (!nombre.trim()) return
        setGuardando(true); setError(null)
        try {
            await menuPersonalizadoApi.crearModulo({ nombre: nombre.trim(), icono })
            await queryClient.invalidateQueries({ queryKey: MENU_PERSONALIZADO_KEY })
            onCreado(); onClose()
        } catch (e) { setError(mensajeError(e, 'No se pudo crear el módulo')) } finally { setGuardando(false) }
    }

    return (
        <Modal isOpen={abierto} onClose={() => { if (!guardando) onClose() }} title="Nuevo módulo personalizado" className="max-w-lg">
            <div className="mt-4 space-y-4">
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Crea una sección propia en el menú lateral, como un módulo de pruebas. Después le agregas enlaces (Power BI, Sheets, otra web) y se lo asignas a los roles que lo deben ver.
                </p>
                <div className="space-y-1.5">
                    <label htmlFor="pers-nombre" className={label}>Nombre</label>
                    <Input id="pers-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Indicadores" className="h-10" autoFocus />
                </div>
                <div className="space-y-1.5">
                    <span className={label}>Icono</span>
                    <div className="grid grid-cols-7 gap-1.5">
                        {Object.keys(ICONOS_MENU).map((n) => {
                            const Icono = iconoMenu(n)
                            return (
                                <button key={n} type="button" title={n} aria-label={n} aria-pressed={icono === n} onClick={() => setIcono(n)}
                                    className={`flex h-10 items-center justify-center rounded-lg border transition-all ${icono === n ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/50'}`}>
                                    <Icono className="h-4 w-4" />
                                </button>
                            )
                        })}
                    </div>
                </div>
                {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
                <div className="flex justify-end gap-2 border-t pt-4">
                    <Button variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
                    <Button onClick={guardar} disabled={!nombre.trim() || guardando}>{guardando ? 'Creando…' : 'Crear módulo'}</Button>
                </div>
            </div>
        </Modal>
    )
}

/** Enlaces de un módulo personalizado: lo que aparece como ítems de su sección en el sidebar */
export function EnlacesPersonalizados({ moduloId, codigoPermiso, puedeEditar }: { moduloId: number; codigoPermiso: string; puedeEditar: boolean }) {
    const queryClient = useQueryClient()
    const [enlaces, setEnlaces] = useState<EnlaceAdmin[]>([])
    const [cargando, setCargando] = useState(true)
    const [editando, setEditando] = useState<EnlaceAdmin | 'nuevo' | null>(null)
    const [form, setForm] = useState({ nombre: '', url: '', modo: 'embed' as ModoEnlace, orden: 100, estado: true })
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const cargar = useCallback(async () => {
        setCargando(true)
        try { setEnlaces(await menuPersonalizadoApi.listarEnlaces(moduloId)) } catch { setEnlaces([]) } finally { setCargando(false) }
    }, [moduloId])
    useEffect(() => { void cargar() }, [cargar])

    const refrescarMenu = () => queryClient.invalidateQueries({ queryKey: MENU_PERSONALIZADO_KEY })

    const abrirForm = (e: EnlaceAdmin | 'nuevo') => {
        setEditando(e); setError(null)
        setForm(e === 'nuevo' ? { nombre: '', url: '', modo: 'embed', orden: (enlaces[enlaces.length - 1]?.orden ?? 0) + 10, estado: true }
            : { nombre: e.nombre, url: e.url, modo: e.modo, orden: e.orden, estado: !!e.estado })
    }

    const guardar = async () => {
        if (!editando) return
        setGuardando(true); setError(null)
        try {
            if (editando === 'nuevo') await menuPersonalizadoApi.crearEnlace(moduloId, form)
            else await menuPersonalizadoApi.actualizarEnlace(editando.id, form)
            setEditando(null); await cargar(); await refrescarMenu()
        } catch (e) { setError(mensajeError(e, 'No se pudo guardar el enlace')) } finally { setGuardando(false) }
    }

    const eliminar = async (e: EnlaceAdmin) => {
        if (!window.confirm(`¿Eliminar el enlace "${e.nombre}"?`)) return
        try { await menuPersonalizadoApi.eliminarEnlace(e.id); await cargar(); await refrescarMenu() } catch (err) { window.alert(mensajeError(err, 'No se pudo eliminar')) }
    }

    return (
        <div className="shrink-0 border-b bg-card">
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Enlaces del menú</p>
                    <p className="text-xs text-muted-foreground">
                        La sección aparece en el menú cuando tiene al menos un enlace activo, para los roles que tengan el permiso <span className="font-mono">{codigoPermiso}</span>. Tus roles ya lo tienen; a otros se lo das en Roles.
                    </p>
                </div>
                {puedeEditar && <Button size="sm" className="h-8 gap-1.5" onClick={() => abrirForm('nuevo')}><Plus className="h-3.5 w-3.5" /> Enlace</Button>}
            </div>
            {cargando ? (
                <div className="flex items-center gap-2 px-4 pb-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
            ) : enlaces.length === 0 ? (
                <p className="px-4 pb-3 text-sm text-muted-foreground">Todavía no hay enlaces. Agrega el primero.</p>
            ) : (
                <ul className="divide-y border-t">
                    {enlaces.map((e) => (
                        <li key={e.id} className="flex items-center gap-3 px-4 py-2">
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-2 text-sm font-medium">
                                    <span className="truncate">{e.nombre}</span>
                                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{e.modo === 'interno' ? 'Página del sistema' : e.modo === 'embed' ? 'Embebido' : 'Pestaña nueva'}</span>
                                    {!e.estado && <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">Inactivo</span>}
                                </p>
                                {e.modo === 'interno'
                                    ? <p className="truncate font-mono text-xs text-muted-foreground">{e.url}</p>
                                    : <a href={e.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:underline"><ExternalLink className="h-3 w-3 shrink-0" />{e.url}</a>}
                            </div>
                            {puedeEditar && <>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary" aria-label={`Editar ${e.nombre}`} onClick={() => abrirForm(e)}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" aria-label={`Eliminar ${e.nombre}`} onClick={() => void eliminar(e)}><Trash2 className="h-4 w-4" /></Button>
                            </>}
                        </li>
                    ))}
                </ul>
            )}

            <Modal isOpen={!!editando} onClose={() => { if (!guardando) setEditando(null) }} title={editando === 'nuevo' ? 'Nuevo enlace' : 'Editar enlace'} className="max-w-lg">
                <div className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                        <span className={label}>Qué va dentro</span>
                        <div className="grid grid-cols-2 gap-1.5">
                            {([['sistema', 'Página del sistema'], ['externo', 'Enlace externo']] as const).map(([valor, texto]) => {
                                const activo = (valor === 'sistema') === (form.modo === 'interno')
                                return (
                                    <button key={valor} type="button" aria-pressed={activo}
                                        onClick={() => !activo && setForm({ ...form, modo: valor === 'sistema' ? 'interno' : 'embed', url: '' })}
                                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${activo ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/50'}`}>{texto}</button>
                                )
                            })}
                        </div>
                    </div>
                    {form.modo === 'interno' ? (
                        <div className="space-y-1.5">
                            <label htmlFor="enl-pagina" className={label}>Página</label>
                            <select id="enl-pagina" value={form.url}
                                onChange={(e) => setForm({ ...form, url: e.target.value, nombre: form.nombre.trim() ? form.nombre : nombreDePagina(e.target.value) ?? '' })}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                <option value="">Elegir una página…</option>
                                {PAGINAS.map((g) => (
                                    <optgroup key={g.grupo} label={g.grupo}>
                                        {g.paginas.map((p) => <option key={p.href} value={p.href}>{p.name}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                            <p className="text-[11px] text-muted-foreground">Solo la ven los usuarios que ya tienen permiso en esa página.</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <label htmlFor="enl-url" className={label}>URL</label>
                                <Input id="enl-url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" className="h-10 font-mono text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <span className={label}>Cómo se abre</span>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {([['embed', 'Dentro del sistema'], ['nueva', 'Pestaña nueva']] as const).map(([valor, texto]) => (
                                        <button key={valor} type="button" aria-pressed={form.modo === valor} onClick={() => setForm({ ...form, modo: valor })}
                                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${form.modo === valor ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/50'}`}>{texto}</button>
                                    ))}
                                </div>
                                <p className="text-[11px] text-muted-foreground">Algunos sitios (Google, bancos…) no permiten verse dentro de otra página. Si no carga, usa "Pestaña nueva".</p>
                            </div>
                        </>
                    )}
                    <div className="space-y-1.5">
                        <label htmlFor="enl-nombre" className={label}>Nombre en el menú</label>
                        <Input id="enl-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ventas del mes" className="h-10" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="enl-orden" className={label}>Orden</label>
                            <Input id="enl-orden" type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} className="h-10" />
                        </div>
                        <div className="space-y-1.5">
                            <span className={label}>Estado</span>
                            <div className="flex gap-1.5">
                                {([[true, 'Activo'], [false, 'Inactivo']] as const).map(([valor, texto]) => (
                                    <button key={texto} type="button" aria-pressed={form.estado === valor} onClick={() => setForm({ ...form, estado: valor })}
                                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${form.estado === valor ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{texto}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
                    <div className="flex justify-end gap-2 border-t pt-4">
                        <Button variant="outline" onClick={() => setEditando(null)} disabled={guardando}>Cancelar</Button>
                        <Button onClick={guardar} disabled={!form.nombre.trim() || !form.url.trim() || guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
