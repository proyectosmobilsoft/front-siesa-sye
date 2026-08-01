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
import { ArrowUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorState } from '@/components/ui/error-state'
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
                const value = row.getValue('f120_referencia') as string
                return (
                    <div className="font-medium font-mono">
                        {value && String(value).trim() ? String(value).trim() : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f120_descripcion',
            header: 'Descripción',
            cell: ({ row }) => {
                const value = row.getValue('f120_descripcion') as string
                return (
                    <div className="text-sm">
                        {value && String(value).trim() ? formatters.truncate(value, 40) : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
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
                const value = row.getValue('f120_fecha_creacion') as string
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
            <div className="flex h-full min-h-0 flex-col gap-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="flex-1 w-full" />
            </div>
        )
    }

    if (error) {
        return <ErrorState title="Error al cargar productos" />
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex h-full min-h-0 flex-col gap-4"
        >
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                    {products?.length ?? 0} {products?.length === 1 ? 'producto' : 'productos'}
                </p>
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar productos..."
                        value={globalFilter ?? ''}
                        onChange={(event) => setGlobalFilter(String(event.target.value))}
                        className="pl-8"
                    />
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card">
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
            <div className="flex shrink-0 items-center justify-between space-x-2">
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
        </motion.div>
    )
}
