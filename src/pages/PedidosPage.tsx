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
import { ArrowUpDown, Search, Send, AlertCircle, Loader2 } from 'lucide-react'
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
            {/* Main Table Card - Always Visible */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
                    <CardHeader className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <span className="text-primary">Pedidos</span>
                                    {pedidos && (
                                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                                            ({pedidos.length} {pedidos.length === 1 ? 'registro' : 'registros'})
                                        </span>
                                    )}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">Gestión y seguimiento de órdenes de venta</p>
                            </div>

                            {/* Integrated Filters inside Header */}
                            <div className="flex flex-col sm:flex-row items-end gap-3">
                                <div className="min-w-[150px]">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Desde</label>
                                    <DatePicker
                                        value={filtros.fechaInicial}
                                        onChange={(value) => setFiltros({ ...filtros, fechaInicial: value })}
                                        placeholder="Fecha inicial"
                                        max={filtros.fechaFinal}
                                    />
                                </div>
                                <div className="min-w-[150px]">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Hasta</label>
                                    <DatePicker
                                        value={filtros.fechaFinal}
                                        onChange={(value) => setFiltros({ ...filtros, fechaFinal: value })}
                                        placeholder="Fecha final"
                                        min={filtros.fechaInicial}
                                    />
                                </div>
                                <Button 
                                    onClick={handleBuscar} 
                                    size="sm" 
                                    className="h-10 px-4 text-xs bg-primary hover:bg-primary/90"
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                                    Buscar
                                </Button>
                            </div>
                        </div>

                        {/* Search Input below filters */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 border-t pt-4 border-primary/10">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar en pedidos..."
                                    value={globalFilter ?? ''}
                                    onChange={(event) => setGlobalFilter(String(event.target.value))}
                                    className="pl-9 h-9"
                                />
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-64 w-full" />
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="bg-red-100 p-3 rounded-full mb-4">
                                    <AlertCircle className="h-6 w-6 text-red-600" />
                                </div>
                                <p className="text-lg font-medium text-red-800">Error al cargar pedidos</p>
                                <p className="text-sm text-red-600 mt-1">{error instanceof Error ? error.message : 'Error desconocido'}</p>
                                <Button onClick={() => refetch()} className="mt-4" variant="outline">
                                    Reintentar
                                </Button>
                            </div>
                        ) : !searchParams ? (
                            <div className="text-center py-20 border-2 border-dashed rounded-xl border-muted-foreground/10 bg-muted/5">
                                <Search className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                                <p className="text-muted-foreground font-medium">Selecciona un rango de fechas y haz clic en Buscar</p>
                                <p className="text-xs text-muted-foreground/60 mt-1">Para ver los pedidos registrados en el sistema</p>
                            </div>
                        ) : !pedidos || pedidos.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">No se encontraron pedidos con los filtros seleccionados.</p>
                            </div>
                        ) : (
                            <>
                                <div className="rounded-md border bg-card">
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-sm">
                                            <thead>
                                                {table.getHeaderGroups().map((headerGroup) => (
                                                    <tr key={headerGroup.id} className="border-b bg-muted/30">
                                                        {headerGroup.headers.map((header) => (
                                                            <th
                                                                key={header.id}
                                                                className="h-10 px-3 text-left align-middle font-semibold text-muted-foreground"
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
                                                            className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            {row.getVisibleCells().map((cell) => (
                                                                <td key={cell.id} className="py-2.5 px-3 align-middle">
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
                                    <div className="flex-1 text-xs text-muted-foreground font-medium">
                                        Mostrando {table.getFilteredRowModel().rows.length} de {table.getCoreRowModel().rows.length} pedidos.
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => table.previousPage()}
                                            disabled={!table.getCanPreviousPage()}
                                            className="h-8 text-xs"
                                        >
                                            Anterior
                                        </Button>
                                        <div className="text-xs font-medium text-muted-foreground px-2">
                                            Página {table.getState().pagination.pageIndex + 1}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => table.nextPage()}
                                            disabled={!table.getCanNextPage()}
                                            className="h-8 text-xs"
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
