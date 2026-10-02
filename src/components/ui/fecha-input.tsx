import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// El <input type="date"> nativo pinta la fecha y el calendario según el idioma
// del navegador (mm/dd/aaaa, meses en inglés) y no se puede estilizar. Este
// input siempre muestra dd/mm/aaaa y trae su propio calendario en español.

interface FechaInputProps {
    value?: string // YYYY-MM-DD
    onChange: (value: string) => void
    min?: string
    max?: string
    required?: boolean
    placeholder?: string
    className?: string
    /** Sin borde ni fondo, para meterlo dentro de otro contenedor. */
    simple?: boolean
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

/** "2026-10-02" → "02/10/2026". */
function isoADdMmAaaa(iso?: string | null): string {
    const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/)
    return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

function enmascarar(texto: string): string {
    const d = texto.replace(/\D/g, '').slice(0, 8)
    if (d.length <= 2) return d
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

function aIso(anio: number, mes: number, dia: number): string {
    return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function ddMmAaaaAIso(texto: string): string | null {
    const m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!m) return null
    const [dd, mm, aaaa] = [Number(m[1]), Number(m[2]), Number(m[3])]
    const fecha = new Date(aaaa, mm - 1, dd)
    if (fecha.getFullYear() !== aaaa || fecha.getMonth() !== mm - 1 || fecha.getDate() !== dd) return null
    return aIso(aaaa, mm - 1, dd)
}

function hoyIso(): string {
    const h = new Date()
    return aIso(h.getFullYear(), h.getMonth(), h.getDate())
}

/** 42 celdas (6 semanas, empezando en lunes) del mes visible. */
function celdasMes(anio: number, mes: number) {
    const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7
    return Array.from({ length: 42 }, (_, i) => {
        const fecha = new Date(anio, mes, 1 - desfase + i)
        return {
            iso: aIso(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
            dia: fecha.getDate(),
            delMes: fecha.getMonth() === mes,
        }
    })
}

function Calendario({
    value,
    min,
    max,
    onElegir,
}: {
    value?: string
    min?: string
    max?: string
    onElegir: (iso: string) => void
}) {
    const base = value || hoyIso()
    const [anio, setAnio] = useState(Number(base.slice(0, 4)))
    const [mes, setMes] = useState(Number(base.slice(5, 7)) - 1)
    const [vista, setVista] = useState<'dias' | 'meses' | 'anios'>('dias')
    const hoy = hoyIso()
    const fueraDeRango = (iso: string) => (!!min && iso < min) || (!!max && iso > max)
    // Un mes/año queda deshabilitado solo si ningún día suyo cae en el rango.
    const mesFuera = (a: number, m: number) =>
        (!!max && aIso(a, m, 1) > max) || (!!min && aIso(a, m, new Date(a, m + 1, 0).getDate()) < min)
    const anioFuera = (a: number) => (!!max && `${a}-01-01` > max) || (!!min && `${a}-12-31` < min)
    const inicioDecada = anio - (anio % 12)
    // Con límite inferior solo se listan los años que tienen registros
    // (ej. min 2025 → 2025 y 2026); sin límite, páginas de 12 años.
    const anioMin = min ? Number(min.slice(0, 4)) : null
    const anioMax = max ? Number(max.slice(0, 4)) : new Date().getFullYear()
    const aniosVisibles =
        anioMin != null
            ? Array.from({ length: Math.max(anioMax - anioMin + 1, 1) }, (_, i) => anioMin + i)
            : Array.from({ length: 12 }, (_, i) => inicioDecada + i)
    const puedeRetroceder =
        vista === 'anios' ? anioMin == null : vista === 'meses' ? !anioFuera(anio - 1) : !mesFuera(new Date(anio, mes - 1, 1).getFullYear(), new Date(anio, mes - 1, 1).getMonth())
    const puedeAvanzar =
        vista === 'anios' ? anioMin == null : vista === 'meses' ? !anioFuera(anio + 1) : !mesFuera(new Date(anio, mes + 1, 1).getFullYear(), new Date(anio, mes + 1, 1).getMonth())

    const mover = (delta: number) => {
        if (vista === 'anios') return setAnio(anio + delta * 12)
        if (vista === 'meses') return setAnio(anio + delta)
        const fecha = new Date(anio, mes + delta, 1)
        setAnio(fecha.getFullYear())
        setMes(fecha.getMonth())
    }

    const botonNav = 'flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground'
    const botonTitulo = 'rounded-md px-1.5 py-0.5 text-sm font-bold text-foreground transition hover:bg-primary/10 hover:text-primary'
    const celdaGrande = (activo: boolean, deshabilitado: boolean) =>
        cn(
            'flex h-11 items-center justify-center rounded-xl text-sm transition',
            activo ? 'bg-primary font-bold text-primary-foreground shadow-sm' : 'text-foreground hover:bg-primary/10 hover:text-primary',
            deshabilitado && 'cursor-not-allowed opacity-30 hover:bg-transparent'
        )

    return (
        <div className="w-[280px] select-none p-3">
            <div className="mb-3 flex items-center justify-between">
                <button type="button" onClick={() => mover(-1)} disabled={!puedeRetroceder} className={cn(botonNav, 'disabled:pointer-events-none disabled:opacity-25')} title="Anterior">
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-0.5">
                    {vista === 'dias' && (
                        <button type="button" onClick={() => setVista('meses')} className={botonTitulo} title="Elegir mes">
                            {MESES[mes]}
                        </button>
                    )}
                    <button type="button" onClick={() => setVista(vista === 'anios' ? 'dias' : 'anios')} className={botonTitulo} title="Elegir año">
                        {vista === 'anios' ? (anioMin != null ? 'Año' : `${inicioDecada} – ${inicioDecada + 11}`) : anio}
                    </button>
                </div>
                <button type="button" onClick={() => mover(1)} disabled={!puedeAvanzar} className={cn(botonNav, 'disabled:pointer-events-none disabled:opacity-25')} title="Siguiente">
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {vista === 'meses' && (
                <div className="grid grid-cols-3 gap-2">
                    {MESES.map((nombre, m) => (
                        <button
                            key={nombre}
                            type="button"
                            disabled={mesFuera(anio, m)}
                            onClick={() => {
                                setMes(m)
                                setVista('dias')
                            }}
                            className={celdaGrande(m === mes, mesFuera(anio, m))}
                        >
                            {nombre.slice(0, 3)}
                        </button>
                    ))}
                </div>
            )}

            {vista === 'anios' && (
                <div className="grid grid-cols-3 gap-2">
                    {aniosVisibles.map((a) => (
                        <button
                            key={a}
                            type="button"
                            disabled={anioFuera(a)}
                            onClick={() => {
                                setAnio(a)
                                setVista('meses')
                            }}
                            className={celdaGrande(a === anio, anioFuera(a))}
                        >
                            {a}
                        </button>
                    ))}
                </div>
            )}

            {vista === 'dias' && (
            <>
            <div className="mb-1 grid grid-cols-7">
                {DIAS.map((d) => (
                    <span key={d} className="py-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
                        {d}
                    </span>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-y-0.5">
                {celdasMes(anio, mes).map((c) => {
                    const elegido = c.iso === value
                    const esHoy = c.iso === hoy
                    const deshabilitado = fueraDeRango(c.iso)
                    return (
                        <button
                            key={c.iso}
                            type="button"
                            disabled={deshabilitado}
                            onClick={() => onElegir(c.iso)}
                            className={cn(
                                'mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums transition',
                                !c.delMes && 'text-muted-foreground/40',
                                c.delMes && !elegido && 'text-foreground hover:bg-primary/10 hover:text-primary',
                                esHoy && !elegido && 'font-bold text-primary ring-1 ring-primary/40',
                                elegido && 'bg-primary font-bold text-primary-foreground shadow-sm',
                                deshabilitado && 'cursor-not-allowed opacity-30 hover:bg-transparent'
                            )}
                        >
                            {c.dia}
                        </button>
                    )
                })}
            </div>
            </>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <button
                    type="button"
                    onClick={() => onElegir('')}
                    className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                    Limpiar
                </button>
                <button
                    type="button"
                    disabled={fueraDeRango(hoy)}
                    onClick={() => onElegir(hoy)}
                    className="rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-40"
                >
                    Hoy
                </button>
            </div>
        </div>
    )
}

export const FechaInput = ({ value, onChange, min, max, required, placeholder = 'dd/mm/aaaa', className, simple }: FechaInputProps) => {
    const [texto, setTexto] = useState(isoADdMmAaaa(value))
    const [abierto, setAbierto] = useState(false)
    const [posicion, setPosicion] = useState({ top: 0, left: 0 })
    const contenedorRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setTexto(isoADdMmAaaa(value))
    }, [value])

    // El panel va en un portal (para que no lo recorte un overflow:hidden),
    // posicionado bajo el input y sin salirse de la pantalla.
    useLayoutEffect(() => {
        if (!abierto) return
        const ubicar = () => {
            const rect = contenedorRef.current?.getBoundingClientRect()
            if (!rect) return
            const ancho = 282
            const alto = panelRef.current?.offsetHeight ?? 360
            const left = Math.max(8, Math.min(rect.left, window.innerWidth - ancho - 8))
            const abajo = rect.bottom + 6
            const top = abajo + alto > window.innerHeight - 8 ? Math.max(8, rect.top - alto - 6) : abajo
            setPosicion({ top, left })
        }
        ubicar()
        window.addEventListener('resize', ubicar)
        window.addEventListener('scroll', ubicar, true)
        return () => {
            window.removeEventListener('resize', ubicar)
            window.removeEventListener('scroll', ubicar, true)
        }
    }, [abierto])

    useEffect(() => {
        if (!abierto) return
        const cerrarSiAfuera = (e: MouseEvent) => {
            const objetivo = e.target as Node
            if (contenedorRef.current?.contains(objetivo) || panelRef.current?.contains(objetivo)) return
            setAbierto(false)
        }
        const cerrarConEscape = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
        document.addEventListener('mousedown', cerrarSiAfuera)
        document.addEventListener('keydown', cerrarConEscape)
        return () => {
            document.removeEventListener('mousedown', cerrarSiAfuera)
            document.removeEventListener('keydown', cerrarConEscape)
        }
    }, [abierto])

    const handleTexto = (crudo: string) => {
        const enmascarado = enmascarar(crudo)
        setTexto(enmascarado)
        if (enmascarado === '') {
            onChange('')
            return
        }
        const iso = ddMmAaaaAIso(enmascarado)
        if (iso && (!min || iso >= min) && (!max || iso <= max)) onChange(iso)
    }

    const elegir = (iso: string) => {
        onChange(iso)
        setAbierto(false)
    }

    return (
        <div
            ref={contenedorRef}
            className={cn(
                'relative flex items-center',
                !simple &&
                    'h-10 w-full rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                className
            )}
        >
            <input
                type="text"
                inputMode="numeric"
                value={texto}
                onChange={(e) => handleTexto(e.target.value)}
                onBlur={() => setTexto(isoADdMmAaaa(value))}
                placeholder={placeholder}
                required={required}
                className={cn(
                    'h-full w-full min-w-0 bg-transparent tabular-nums outline-none placeholder:text-muted-foreground',
                    !simple && 'px-3'
                )}
            />
            <button
                type="button"
                onClick={() => setAbierto((a) => !a)}
                className={cn(
                    'flex shrink-0 items-center transition hover:text-primary',
                    abierto ? 'text-primary' : 'text-muted-foreground',
                    !simple && 'pr-3'
                )}
                title="Abrir calendario"
                tabIndex={-1}
            >
                <Calendar className="h-4 w-4" />
            </button>
            {createPortal(
                <AnimatePresence>
                    {abierto && (
                        <motion.div
                            ref={panelRef}
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                            transition={{ duration: 0.14, ease: 'easeOut' }}
                            style={{ position: 'fixed', top: posicion.top, left: posicion.left }}
                            className="z-[10000] rounded-2xl border border-border bg-card text-card-foreground shadow-xl"
                        >
                            <Calendario value={value} min={min} max={max} onElegir={elegir} />
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}
