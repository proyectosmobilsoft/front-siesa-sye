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
import { ArrowUpDown, ChevronDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { useClients } from '@/hooks/useClients'
import { Client } from '@/api/types'
import { formatters } from '@/utils/formatters'

export const ClientsTable = () => {
    const { data: clients, isLoading, error } = useClients()
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState('')

    const columns: ColumnDef<Client>[] = [
        {
            accessorKey: 'f9740_id',
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
            cell: ({ row }) => <div className="font-medium">{row.getValue('f9740_id')}</div>,
        },
        {
            accessorKey: 'f9740_nombre',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Nombre
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f9740_nombre')
                return (
                    <div className="font-medium">
                        {value && String(value).trim() ? value : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f9740_razon_social',
            header: 'Razón Social',
            cell: ({ row }) => {
                const value = row.getValue('f9740_razon_social')
                return (
                    <div className="text-sm text-muted-foreground">
                        {value && String(value).trim() ? value : <span className="italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f9740_nit',
            header: 'NIT',
            cell: ({ row }) => {
                const value = row.getValue('f9740_nit')
                return (
                    <div className="text-sm font-mono">
                        {value && String(value).trim() ? value : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f9740_email',
            header: 'Email',
            cell: ({ row }) => {
                const value = row.getValue('f9740_email')
                return (
                    <div className="text-sm">
                        {value && String(value).trim() ? (
                            <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-800">
                                {value}
                            </a>
                        ) : (
                            <span className="text-muted-foreground italic">Sin valor</span>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f9740_celular',
            header: 'Celular',
            cell: ({ row }) => {
                const value = row.getValue('f9740_celular')
                return (
                    <div className="text-sm font-mono">
                        {value && String(value).trim() ? value : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f9740_direccion1',
            header: 'Dirección',
            cell: ({ row }) => {
                const value = row.getValue('f9740_direccion1')
                return (
                    <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {value && String(value).trim() ? value : <span className="italic">Sin valor</span>}
                    </div>
                )
            },
        },
    ]

    const table = useReactTable({
        data: clients || [],
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
                    <CardTitle>Clientes</CardTitle>
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
                    <CardTitle className="text-red-800">Clientes</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center text-red-600">
                        <p className="text-lg font-medium">Error al cargar clientes</p>
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
            transition={{ duration: 0.5, delay: 0.4 }}
        >
            <Card>
                <CardHeader>
                    <CardTitle>Clientes</CardTitle>
                    <div className="flex items-center space-x-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar clientes..."
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
