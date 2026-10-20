import { useCallback, useEffect, useRef, useState } from 'react'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Eye, EyeOff, Folder, FolderPlus, GripVertical, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Cargando } from '@/components/ui/cargando'
import { Input } from '@/components/ui/input'
import { useMenuArmado } from '@/hooks/useMenuArmado'
import { menuOrganizacionApi, MENU_ORGANIZACION_KEY } from '@/api/menuOrganizacion'
import { organizacionDesdeEntradas, type EntradaMenu, type GrupoArmado, type PaginaArmada } from '@/config/organizarMenu'
import { usePermiso } from '@/hooks/usePermiso'
import { cn } from '@/lib/utils'

/**
 * Configuración global del menú lateral: el administrador arrastra cada página al menú donde la
 * quiere, la reordena y la oculta o muestra. Se guarda solo. Lo que se define aquí lo ven todos
 * los usuarios y lo usan las pantallas de permisos; qué roles entran a cada página se decide
 * después, en Roles.
 */

const DIRECTOS = '__directos__'

const mensajeError = (e: unknown, defecto: string) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || defecto

interface Columnas { grupos: GrupoArmado[]; directos: PaginaArmada[] }

const separar = (entradas: EntradaMenu[]): Columnas => ({
    grupos: entradas.flatMap((e) => (e.tipo === 'grupo' ? [e.grupo] : [])),
    directos: entradas.flatMap((e) => (e.tipo === 'directo' ? [e.pagina] : [])),
})
const juntar = ({ grupos, directos }: Columnas): EntradaMenu[] => [
    ...directos.map((pagina): EntradaMenu => ({ tipo: 'directo', pagina })),
    ...grupos.map((grupo): EntradaMenu => ({ tipo: 'grupo', grupo })),
]

export function OrganizarMenuPage() {
    const queryClient = useQueryClient()
    const { puede, P } = usePermiso()
    const puedeEditar = puede(P.EDITAR_MODULO)
    const { entradas, cargando } = useMenuArmado({ incluirVacios: true, incluirOcultas: true })

    const [cols, setCols] = useState<Columnas | null>(null)
    const [estado, setEstado] = useState<'guardado' | 'guardando' | 'error'>('guardado')
    const [aviso, setAviso] = useState<string | null>(null)
    const [nuevoNombre, setNuevoNombre] = useState('')
    const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hayCambiosPropios = useRef(false)

    // Se toma el menú del servidor al abrir; después manda lo que el administrador va haciendo aquí
    useEffect(() => {
        if (!cargando && !hayCambiosPropios.current) setCols(separar(entradas))
    }, [entradas, cargando])
    useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current) }, [])

    const guardar = useCallback((siguiente: Columnas) => {
        hayCambiosPropios.current = true
        setCols(siguiente)
        setEstado('guardando')
        if (temporizador.current) clearTimeout(temporizador.current)
        // Un guardado cada vez que el administrador termina de mover cosas, no uno por cada arrastre
        temporizador.current = setTimeout(async () => {
            try {
                await menuOrganizacionApi.guardar(organizacionDesdeEntradas(juntar(siguiente)))
                await queryClient.invalidateQueries({ queryKey: MENU_ORGANIZACION_KEY })
                setEstado('guardado')
            } catch (e) {
                setEstado('error')
                setAviso(mensajeError(e, 'No se pudo guardar el menú'))
            }
        }, 600)
    }, [queryClient])

    const alSoltar = (r: DropResult) => {
        if (!cols || !r.destination) return
        const { source, destination, draggableId } = r
        if (source.droppableId === destination.droppableId && source.index === destination.index) return
        const lista = (id: string) => (id === DIRECTOS ? cols.directos : cols.grupos.find((g) => g.name === id)?.paginas ?? [])
        const origen = [...lista(source.droppableId)]
        const [pagina] = origen.splice(source.index, 1)
        if (!pagina || pagina.href !== draggableId) return
        if (destination.droppableId === DIRECTOS && pagina.grupoBase !== '') {
            setAviso('Solo las páginas que nacen como enlace directo (como Dashboard) pueden quedar sin menú.')
            return
        }
        setAviso(null)
        const mismo = source.droppableId === destination.droppableId
        const destinoLista = mismo ? origen : [...lista(destination.droppableId)]
        destinoLista.splice(destination.index, 0, pagina)
        guardar({
            directos: source.droppableId === DIRECTOS ? origen : destination.droppableId === DIRECTOS ? destinoLista : cols.directos,
            grupos: cols.grupos.map((g) => (g.name === source.droppableId ? { ...g, paginas: origen } : g.name === destination.droppableId ? { ...g, paginas: destinoLista } : g)),
        })
    }

    const alternarVisible = (href: string) => {
        if (!cols) return
        const cambiar = (p: PaginaArmada) => (p.href === href ? { ...p, visible: !p.visible } : p)
        guardar({ directos: cols.directos.map(cambiar), grupos: cols.grupos.map((g) => ({ ...g, paginas: g.paginas.map(cambiar) })) })
    }

    const crearMenu = () => {
        const nombre = nuevoNombre.trim()
        if (!cols || !nombre) return
        if (cols.grupos.some((g) => g.name.toLowerCase() === nombre.toLowerCase())) { setAviso(`Ya existe un menú llamado "${nombre}".`); return }
        setAviso('El menú nuevo se guarda cuando le sueltes una página.')
        setCols({ ...cols, grupos: [...cols.grupos, { name: nombre, icon: Folder, personalizado: false, paginas: [] }] })
        setNuevoNombre('')
    }

    const restablecer = async () => {
        if (!window.confirm('¿Volver al menú original? Se pierde todo lo que organizaste.')) return
        try {
            await menuOrganizacionApi.restablecer()
            hayCambiosPropios.current = false
            await queryClient.invalidateQueries({ queryKey: MENU_ORGANIZACION_KEY })
            setAviso(null); setEstado('guardado')
        } catch (e) { setAviso(mensajeError(e, 'No se pudo restablecer el menú')) }
    }

    if (cargando || !cols) return <Cargando texto="Cargando el menú" />

    const fila = (p: PaginaArmada, i: number) => (
        <Draggable key={p.href} draggableId={p.href} index={i} isDragDisabled={!puedeEditar}>
            {(prov, snap) => (
                <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} aria-label={`${p.name}. Espacio para levantar y flechas para mover`}
                    className={cn('flex items-center gap-2 rounded-md border bg-card px-2 py-2 text-sm', snap.isDragging && 'border-primary shadow-lg', !p.visible && 'opacity-50')}>
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <p.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block truncate font-mono text-[10px] text-muted-foreground">{p.href}</span>
                    </span>
                    {puedeEditar && (
                        <button type="button" onClick={() => alternarVisible(p.href)} aria-label={p.visible ? `Ocultar ${p.name}` : `Mostrar ${p.name}`} title={p.visible ? 'Ocultar del menú' : 'Mostrar en el menú'}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted">
                            {p.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                    )}
                </div>
            )}
        </Draggable>
    )

    const tarjeta = (id: string, titulo: string, subtitulo: string | null, paginas: PaginaArmada[], Icono?: GrupoArmado['icon']) => (
        <section key={id} className="flex min-h-40 flex-col rounded-xl border bg-muted/30">
            <header className="flex items-center gap-2 border-b px-3 py-2">
                {Icono && <Icono className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                <h2 className="flex-1 truncate text-xs font-bold uppercase tracking-wider">{titulo}</h2>
                {subtitulo && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{subtitulo}</span>}
                <span className="shrink-0 text-xs text-muted-foreground">{paginas.length}</span>
            </header>
            <Droppable droppableId={id}>
                {(prov, snap) => (
                    <div ref={prov.innerRef} {...prov.droppableProps} className={cn('flex flex-1 flex-col gap-1.5 p-2 transition-colors', snap.isDraggingOver && 'bg-primary/5')}>
                        {paginas.map(fila)}
                        {prov.placeholder}
                        {paginas.length === 0 && !snap.isDraggingOver && <p className="py-4 text-center text-xs text-muted-foreground">Suelta una página aquí</p>}
                    </div>
                )}
            </Droppable>
        </section>
    )

    return (
        <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-bold">Organizar el menú</h1>
                    <p className="text-sm text-muted-foreground">Arrastra cada página al menú donde la quieres. Lo ven todos los usuarios; qué roles entran a cada una se decide en Roles.</p>
                </div>
                <span className={cn('flex items-center gap-1.5 text-xs font-medium', estado === 'error' ? 'text-destructive' : 'text-muted-foreground')} role="status">
                    {estado === 'guardando' && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…</>}
                    {estado === 'guardado' && <><Check className="h-3.5 w-3.5 text-emerald-600" /> Guardado</>}
                    {estado === 'error' && 'No se guardó'}
                </span>
                {puedeEditar && (
                    <>
                        <div className="flex items-center gap-1.5">
                            <Input aria-label="Nombre del menú nuevo" placeholder="Nuevo menú…" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') crearMenu() }} className="h-9 w-40" maxLength={60} />
                            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={crearMenu} disabled={!nuevoNombre.trim()}><FolderPlus className="h-4 w-4" /> Crear</Button>
                        </div>
                        <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => void restablecer()}><RotateCcw className="h-4 w-4" /> Restablecer</Button>
                    </>
                )}
            </div>

            {aviso && <p role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">{aviso}</p>}

            <DragDropContext onDragEnd={alSoltar}>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {tarjeta(DIRECTOS, 'Enlaces directos', 'sin menú', cols.directos)}
                    {cols.grupos.map((g) => tarjeta(g.name, g.name, g.personalizado ? 'sección propia' : null, g.paginas, g.icon))}
                </div>
            </DragDropContext>
        </div>
    )
}
