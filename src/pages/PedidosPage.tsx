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
import { ArrowUpDown, Search, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { DatePicker } from '@/components/ui/date-picker'
import { Modal } from '@/components/ui/modal'
import { usePedidos } from '@/hooks/usePedidos'
import { Pedido, PedidosParams } from '@/api/types'
import { formatters } from '@/utils/formatters'
import { pedidosApi } from '@/api/pedidos'

export const PedidosPage = () => {
    const today = new Date().toISOString().split('T')[0]

    const [filtros, setFiltros] = useState<PedidosParams>({
        fechaInicial: today,
        fechaFinal: today,
    })

    const [searchParams, setSearchParams] = useState<PedidosParams | undefined>(undefined)
    const { data: pedidos, isLoading, error, refetch } = usePedidos(searchParams)

    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState('')

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [previewData, setPreviewData] = useState<any>(null)
    const [loadingPreview, setLoadingPreview] = useState(false)

    const handlePreview = async (f_rowid: number) => {
        setLoadingPreview(true)
        setIsModalOpen(true)
        try {
            const data = await pedidosApi.preview(f_rowid)
            setPreviewData(data)
        } catch (err) {
            console.error('Error fetching preview:', err)
            setPreviewData({ error: 'No se pudo cargar la vista previa' })
        } finally {
            setLoadingPreview(false)
        }
    }

    // Define custom columns with specific order and formatting
    const columns: ColumnDef<Pedido>[] = [
        {
            id: 'actions',
            header: () => <div className="text-center">Acciones</div>,
            cell: ({ row }) => {
                const f_rowid = row.original.f_rowid as number
                return (
                    <div className="flex justify-center">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePreview(f_rowid)}
                            className="h-8 px-3"
                        >
                            <Send className="mr-1.5 h-3.5 w-3.5" />
                            Enviar
                        </Button>
                    </div>
                )
            },
        },
        {
            accessorKey: 'f_co',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        C.O
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f_co')
                return <div className="font-medium">{value ?? <span className="text-muted-foreground italic">N/A</span>}</div>
            },
        },
        {
            accessorKey: 'f_nrodocto',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Nro documento
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f_nrodocto')
                return <div className="font-medium font-mono text-sm">{value ?? <span className="text-muted-foreground italic">N/A</span>}</div>
            },
        },
        {
            accessorKey: 'f_fecha',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Fecha
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f_fecha') as string
                if (!value) {
                    return <div className="text-sm"><span className="text-muted-foreground italic">N/A</span></div>
                }
                // Format date as dd/mm/yyyy
                const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
                if (!dateMatch) {
                    return <div className="text-sm">{value}</div>
                }
                const [, year, month, day] = dateMatch
                const formatted = `${day}/${month}/${year}`
                return <div className="text-sm">{formatted}</div>
            },
        },
        {
            accessorKey: 'f_estado',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Estado
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f_estado') as string
                if (!value) {
                    return <div className="text-sm"><span className="text-muted-foreground italic">N/A</span></div>
                }
                return <div className="text-sm font-medium">{value}</div>
            },
        },
        {
            accessorKey: 'f_cliente_desp_razon_soc',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Cliente
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f_cliente_desp_razon_soc') as string
                if (!value) {
                    return <div className="text-sm"><span className="text-muted-foreground italic">N/A</span></div>
                }
                // Truncate long client names
                const trimmedValue = value.trim()
                if (trimmedValue.length > 40) {
                    return <div className="text-sm max-w-[300px] truncate" title={trimmedValue}>{trimmedValue}</div>
                }
                return <div className="text-sm">{trimmedValue}</div>
            },
        },
        {
            accessorKey: 'f_moneda_docto',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Moneda
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f_moneda_docto') as string
                if (!value) {
                    return <div className="text-sm"><span className="text-muted-foreground italic">N/A</span></div>
                }
                return <div className="text-sm font-mono font-semibold">{value}</div>
            },
        },
        {
            accessorKey: 'f_valor_bruto_docto',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Valor Bruto
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f_valor_bruto_docto') as number
                if (value === null || value === undefined) {
                    return <div className="text-right text-sm"><span className="text-muted-foreground italic">N/A</span></div>
                }
                return <div className="text-right font-medium">{formatters.currency(value)}</div>
            },
        },
        {
            accessorKey: 'f_valor_dscto_docto',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Valor Descuentos
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f_valor_dscto_docto') as number
                if (value === null || value === undefined) {
                    return <div className="text-right text-sm"><span className="text-muted-foreground italic">N/A</span></div>
                }
                return <div className="text-right font-medium">{formatters.currency(value)}</div>
            },
        },
        {
            accessorKey: 'f_subtotal_docto',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Valor Subtotal
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f_subtotal_docto') as number
                if (value === null || value === undefined) {
                    return <div className="text-right text-sm"><span className="text-muted-foreground italic">N/A</span></div>
                }
                return <div className="text-right font-medium">{formatters.currency(value)}</div>
            },
        },
        {
            accessorKey: 'f_valor_imp_docto',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Valor de Impuesto
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f_valor_imp_docto') as number
                if (value === null || value === undefined) {
                    return <div className="text-right text-sm"><span className="text-muted-foreground italic">N/A</span></div>
                }
                return <div className="text-right font-medium">{formatters.currency(value)}</div>
            },
        },
    ]

    const table = useReactTable({
        data: pedidos || [],
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-6 p-6"
        >
            {/* Header with title and filters */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
                    <p className="text-muted-foreground">
                        Gestión y consulta de pedidos por rango de fechas
                    </p>
                </div>

                {/* Date filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="min-w-[180px]">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fecha Inicial</label>
                        <DatePicker
                            value={filtros.fechaInicial}
                            onChange={(value) => setFiltros({ ...filtros, fechaInicial: value })}
                            placeholder="Fecha inicial"
                            max={filtros.fechaFinal}
                        />
                    </div>
                    <div className="min-w-[180px]">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fecha Final</label>
                        <DatePicker
                            value={filtros.fechaFinal}
                            onChange={(value) => setFiltros({ ...filtros, fechaFinal: value })}
                            placeholder="Fecha final"
                            min={filtros.fechaInicial}
                        />
                    </div>
                    <div className="min-w-[140px]">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block opacity-0">Buscar</label>
                        <Button onClick={handleBuscar} size="sm" className="w-full h-10 text-xs">
                            <Search className="mr-1.5 h-3.5 w-3.5" />
                            Buscar Pedidos
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table */}
            {searchParams && (
                <>
                    {isLoading ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Pedidos</CardTitle>
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
                                <CardTitle className="text-red-800">Error al cargar pedidos</CardTitle>
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
                            <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <span className="text-primary">Pedidos</span>
                                                {pedidos && (
                                                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                                                        ({pedidos.length} {pedidos.length === 1 ? 'registro' : 'registros'})
                                                    </span>
                                                )}
                                            </CardTitle>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
                                        <div className="relative flex-1 max-w-sm">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar en pedidos..."
                                                value={globalFilter ?? ''}
                                                onChange={(event) => setGlobalFilter(String(event.target.value))}
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {!pedidos || pedidos.length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-muted-foreground">No se encontraron pedidos con los filtros seleccionados.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="rounded-md border">
                                                <div className="overflow-x-auto custom-scrollbar">
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

            {/* Preview Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Vista Previa del Pedido"
            >
                {loadingPreview ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Cargando vista previa...</p>
                        </div>
                    </div>
                ) : previewData ? (
                    <div className="space-y-4">
                        <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[60vh] text-xs">
                            {JSON.stringify(previewData, null, 2)}
                        </pre>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No hay datos para mostrar</p>
                    </div>
                )}
            </Modal>
        </motion.div>
    )
}
