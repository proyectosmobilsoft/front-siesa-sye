import { motion } from 'framer-motion'
import { useState } from 'react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    SortingState,
    ColumnFiltersState,
} from '@tanstack/react-table'
import { ArrowUpDown, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { useFacturas } from '@/hooks/useFacturas'
import { Factura, FacturasParams } from '@/api/types'
import { formatters } from '@/utils/formatters'

// Función helper para convertir YYYYMM a formato legible
const formatPeriodo = (periodo: number): string => {
    const str = periodo.toString()
    if (str.length === 6) {
        const year = str.substring(0, 4)
        const month = str.substring(4, 6)
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        const monthIndex = parseInt(month) - 1
        return `${monthNames[monthIndex] || month} ${year}`
    }
    return str
}

export const GestionVentasPage = () => {
    const [filtros, setFiltros] = useState<FacturasParams>({
        periodoInicial: 202401,
        periodoFinal: 202412,
        page: 1,
        pageSize: 1000,
    })

    const [searchParams, setSearchParams] = useState<FacturasParams | null>(null)
    const { data: facturas, isLoading, error, refetch } = useFacturas(searchParams || undefined)

    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState('')

    // Generar columnas dinámicamente basadas en las claves de la primera factura
    const getColumns = (): ColumnDef<Factura>[] => {
        if (!facturas || facturas.length === 0) {
            return []
        }

        const firstFactura = facturas[0]
        const keys = Object.keys(firstFactura)

        return keys.map((key) => ({
            accessorKey: key,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        {key}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue(key)
                // Intentar formatear según el tipo de dato
                if (typeof value === 'number') {
                    // Si parece un valor monetario grande
                    if (value > 1000 && value % 1 === 0) {
                        return <div className="text-right font-medium">{formatters.currency(value)}</div>
                    }
                    return <div className="text-right">{formatters.number(value)}</div>
                }
                if (typeof value === 'string' && value.length > 50) {
                    return <div className="text-sm text-muted-foreground max-w-[200px] truncate" title={value}>{value}</div>
                }
                return <div className="text-sm">{value ?? <span className="text-muted-foreground italic">N/A</span>}</div>
            },
        }))
    }

    const columns = getColumns()

    const table = useReactTable({
        data: facturas || [],
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            columnFilters,
            globalFilter,
        },
    })

    const handleBuscar = () => {
        setSearchParams({ ...filtros })
    }

    const handlePeriodoInicialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '')
        if (value.length <= 6) {
            setFiltros({ ...filtros, periodoInicial: value ? parseInt(value) : undefined })
        }
    }

    const handlePeriodoFinalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '')
        if (value.length <= 6) {
            setFiltros({ ...filtros, periodoFinal: value ? parseInt(value) : undefined })
        }
    }

    const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value) || 1
        setFiltros({ ...filtros, page: value })
    }

    const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value) || 1000
        const pageSize = Math.min(Math.max(value, 1), 5000) // Entre 1 y 5000
        setFiltros({ ...filtros, pageSize })
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-8 p-6"
        >
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Ventas</h1>
                <p className="text-muted-foreground">
                    Consulta y gestión de facturas de ventas
                </p>
            </div>

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros de Búsqueda
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Periodo Inicial (YYYYMM)</label>
                            <Input
                                type="text"
                                placeholder="202401"
                                value={filtros.periodoInicial || ''}
                                onChange={handlePeriodoInicialChange}
                                maxLength={6}
                            />
                            {filtros.periodoInicial && (
                                <p className="text-xs text-muted-foreground">
                                    {formatPeriodo(filtros.periodoInicial)}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Periodo Final (YYYYMM)</label>
                            <Input
                                type="text"
                                placeholder="202412"
                                value={filtros.periodoFinal || ''}
                                onChange={handlePeriodoFinalChange}
                                maxLength={6}
                            />
                            {filtros.periodoFinal && (
                                <p className="text-xs text-muted-foreground">
                                    {formatPeriodo(filtros.periodoFinal)}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Página</label>
                            <Input
                                type="number"
                                placeholder="1"
                                value={filtros.page || 1}
                                onChange={handlePageChange}
                                min={1}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Registros por página (Máx. 5000)</label>
                            <Input
                                type="number"
                                placeholder="1000"
                                value={filtros.pageSize || 1000}
                                onChange={handlePageSizeChange}
                                min={1}
                                max={5000}
                            />
                        </div>
                    </div>
                    <div className="mt-6">
                        <Button onClick={handleBuscar} className="w-full md:w-auto">
                            <Search className="mr-2 h-4 w-4" />
                            Buscar Facturas
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabla */}
            {searchParams && (
                <>
                    {isLoading ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Facturas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-64 w-full" />
                                </div>
                            </CardContent>
                        </Card>
                    ) : error ? (
                        <Card className="border-red-200 bg-red-50">
                            <CardHeader>
                                <CardTitle className="text-red-800">Error al cargar facturas</CardTitle>
                            </CardHeader>
                            <CardContent className="flex items-center justify-center h-64">
                                <div className="text-center text-red-600">
                                    <p className="text-lg font-medium">No se pudieron obtener los datos</p>
                                    <p className="text-sm mt-2">Error: {error instanceof Error ? error.message : 'Error desconocido'}</p>
                                    <Button onClick={() => refetch()} className="mt-4" variant="outline">
                                        Reintentar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Facturas
                                        {facturas && (
                                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                                ({facturas.length} {facturas.length === 1 ? 'registro' : 'registros'})
                                            </span>
                                        )}
                                    </CardTitle>
                                    <div className="flex items-center space-x-2 mt-4">
                                        <div className="relative flex-1 max-w-sm">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar en facturas..."
                                                value={globalFilter ?? ''}
                                                onChange={(event) => setGlobalFilter(String(event.target.value))}
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {!facturas || facturas.length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-muted-foreground">No se encontraron facturas con los filtros seleccionados.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="rounded-md border">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            {table.getHeaderGroups().map((headerGroup) => (
                                                                <tr key={headerGroup.id} className="border-b">
                                                                    {headerGroup.headers.map((header) => (
                                                                        <th
                                                                            key={header.id}
                                                                            className="h-10 px-3 text-left align-middle font-medium text-muted-foreground"
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
                                                            {table.getRowModel().rows?.length ? (
                                                                table.getRowModel().rows.map((row) => (
                                                                    <motion.tr
                                                                        key={row.id}
                                                                        className="border-b transition-colors hover:bg-muted/50"
                                                                        initial={{ opacity: 0 }}
                                                                        animate={{ opacity: 1 }}
                                                                        transition={{ duration: 0.2 }}
                                                                    >
                                                                        {row.getVisibleCells().map((cell) => (
                                                                            <td key={cell.id} className="py-2 px-3 align-middle">
                                                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                            </td>
                                                                        ))}
                                                                    </motion.tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan={columns.length} className="h-24 text-center">
                                                                        No hay resultados.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between space-x-2 py-4">
                                                <div className="flex-1 text-sm text-muted-foreground">
                                                    {table.getFilteredRowModel().rows.length} de {table.getCoreRowModel().rows.length} filas.
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
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </>
            )}

            {!searchParams && (
                <Card>
                    <CardContent className="flex items-center justify-center h-64">
                        <div className="text-center text-muted-foreground">
                            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Selecciona los filtros y haz clic en "Buscar Facturas"</p>
                            <p className="text-sm mt-2">Los valores por defecto son: Periodo Inicial 202401, Periodo Final 202412</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </motion.div>
    )
}
