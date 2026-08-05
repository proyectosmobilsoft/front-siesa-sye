import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Search, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { maquinariaApi, Maquinaria } from '@/api/maquinaria'
import { badgeClass } from '@/utils/badges'

/** Placeholder para celdas sin dato, para no dejar huecos en blanco. */
const Vacio = () => <span className="text-muted-foreground">—</span>

export const MaestroMaquinariaPage = () => {
    const [search, setSearch] = useState('')
    const [equipos, setEquipos] = useState<Maquinaria[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetchEquipos = async (searchTerm = search) => {
        try {
            setLoading(true)
            const res = await maquinariaApi.listar(searchTerm, 1, 500)
            setEquipos(res.data ?? [])
            setTotal(res.total ?? 0)
        } catch (err) {
            console.error('Error cargando maquinaria:', err)
            setEquipos([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEquipos('')
    }, [])

    // Búsqueda en servidor con debounce
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            fetchEquipos(search)
        }, 400)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [search])

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
                            placeholder="Buscar por serie, placa, referencia, modelo o marca..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                            autoComplete="off"
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => fetchEquipos(search)} disabled={loading} title="Actualizar">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {total} {total === 1 ? 'equipo' : 'equipos'}
                </span>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card">
                        <tr className="border-b bg-muted/50">
                            {['Código', 'Categoría', 'Marca', 'Serie', 'Referencia', 'Placa', 'Modelo', 'Año', 'Color', 'Capacidad', 'Potencia', 'Estado'].map((h) => (
                                <th key={h} className="h-11 whitespace-nowrap px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={12} className="h-32 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Cargando maquinaria...
                                    </div>
                                </td>
                            </tr>
                        ) : equipos.length > 0 ? (
                            equipos.map((m) => (
                                <tr key={m.Cod_Equipo} className="border-b transition-colors hover:bg-muted/40">
                                    <td className="py-3.5 px-4 font-mono text-sm font-semibold text-primary">{m.Cod_Equipo}</td>
                                    <td className="whitespace-nowrap py-3.5 px-4">{m.CATEGORIA}</td>
                                    <td className="whitespace-nowrap py-3.5 px-4">{m.Nombre_Marca || <Vacio />}</td>
                                    <td className="py-3.5 px-4 font-mono text-xs">{m.SERIE || <Vacio />}</td>
                                    <td className="py-3.5 px-4">{m.REFERENCIA || <Vacio />}</td>
                                    <td className="whitespace-nowrap py-3.5 px-4">
                                        {m.PLACA === 'Sin Placa'
                                            ? <span className="text-muted-foreground italic text-xs">Sin placa</span>
                                            : <span className="font-mono font-semibold">{m.PLACA}</span>}
                                    </td>
                                    <td className="py-3.5 px-4">{m.MODELO || <Vacio />}</td>
                                    <td className="py-3.5 px-4">{m.ANIO_FABRICACION ? m.ANIO_FABRICACION : <Vacio />}</td>
                                    <td className="py-3.5 px-4">{m.COLOR}</td>
                                    <td className="py-3.5 px-4">{m.CAPACIDAD || <Vacio />}</td>
                                    <td className="py-3.5 px-4">{m.POTENCIA}</td>
                                    <td className="whitespace-nowrap py-3.5 px-4">
                                        {m.ESTADO ? (
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass('green')}`}>
                                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                {m.ESTADO}
                                            </span>
                                        ) : (
                                            <Vacio />
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={12} className="h-24 text-center text-muted-foreground">
                                    No se encontró maquinaria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    )
}
