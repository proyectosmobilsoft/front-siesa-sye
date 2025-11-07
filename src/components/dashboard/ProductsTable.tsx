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
import { ArrowUpDown, Search, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { useProducts } from '@/hooks/useProducts'
import { Product } from '@/api/types'
import { formatters } from '@/utils/formatters'

export const ProductsTable = () => {
    const { data: products, isLoading, error } = useProducts()
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState('')

    const columns: ColumnDef<Product>[] = [
        {
            accessorKey: 'f120_id',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        ID
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="font-medium">{row.getValue('f120_id')}</div>,
        },
        {
            accessorKey: 'f120_referencia',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Referencia
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f120_referencia')
                return (
                    <div className="font-medium font-mono">
                        {value && String(value).trim() ? value : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f120_descripcion',
            header: 'Descripción',
            cell: ({ row }) => {
                const value = row.getValue('f120_descripcion')
                return (
                    <div className="text-sm">
                        {value && String(value).trim() ? formatters.truncate(value, 40) : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f120_precio',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Precio
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const precio = row.getValue('f120_precio') as number | null | undefined
                return (
                    <div className="text-sm font-medium">
                        {precio !== null && precio !== undefined && precio !== 0 ? formatters.currency(precio) : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f120_stock',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Stock
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const stock = row.getValue('f120_stock') as number | null | undefined
                return (
                    <div className="text-sm">
                        {stock !== null && stock !== undefined ? formatters.number(stock) : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f120_categoria',
            header: 'Categoría',
            cell: ({ row }) => {
                const categoria = row.getValue('f120_categoria') as string
                return categoria ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {categoria}
                    </span>
                ) : (
                    <span className="text-muted-foreground text-xs">N/A</span>
                )
            },
        },
        {
            id: 'indicators',
            header: 'Indicadores',
            cell: ({ row }) => {
                const hasIndicators = 
                    row.original.f120_ind_compra === 1 ||
                    row.original.f120_ind_venta === 1 ||
                    row.original.f120_ind_manufactura === 1

                if (!hasIndicators) {
                    return <span className="text-muted-foreground italic text-xs">Sin valor</span>
                }

                return (
                    <div className="flex space-x-1">
                        {row.original.f120_ind_compra === 1 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                Compra
                            </span>
                        )}
                        {row.original.f120_ind_venta === 1 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Venta
                            </span>
                        )}
                        {row.original.f120_ind_manufactura === 1 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Manufactura
                            </span>
                        )}
                    </div>
                )
            },
        },
        {
            id: 'controls',
            header: 'Controles',
            cell: ({ row }) => {
                const hasControls = 
                    row.original.f120_ind_lote === 1 ||
                    row.original.f120_ind_serial === 1 ||
                    row.original.f120_ind_controlado === 1

                if (!hasControls) {
                    return <span className="text-muted-foreground italic text-xs">Sin valor</span>
                }

                return (
                    <div className="flex space-x-2">
                        {row.original.f120_ind_lote === 1 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                Lotes
                            </span>
                        )}
                        {row.original.f120_ind_serial === 1 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Serial
                            </span>
                        )}
                        {row.original.f120_ind_controlado === 1 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                Controlado
                            </span>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f120_fecha_creacion',
            header: 'Fecha Creación',
            cell: ({ row }) => {
                const value = row.getValue('f120_fecha_creacion')
                const formatted = formatters.date(value)
                return (
                    <div className="text-sm text-muted-foreground">
                        {formatted && formatted !== 'Fecha inválida' && formatted !== 'N/A' ? formatted : <span className="italic">Sin valor</span>}
                    </div>
                )
            },
        },
    ]

    const table = useReactTable({
        data: products || [],
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

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Productos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardHeader>
                    <CardTitle className="text-red-800">Productos</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center text-red-600">
                        <p className="text-lg font-medium">Error al cargar productos</p>
                        <p className="text-sm">No se pudieron obtener los datos</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
        >
            <Card>
                <CardHeader>
                    <CardTitle>Productos</CardTitle>
                    <div className="flex items-center space-x-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar productos..."
                                value={globalFilter ?? ''}
                                onChange={(event) => setGlobalFilter(String(event.target.value))}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <tr key={headerGroup.id} className="border-b">
                                            {headerGroup.headers.map((header) => (
                                                <th key={header.id} className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
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
                </CardContent>
            </Card>
        </motion.div>
    )
}
