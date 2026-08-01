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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/lib/skeleton'
import { useClients } from '@/hooks/useClients'
import { Client } from '@/api/types'

export const ClientsTable = () => {
    const { data: clients, isLoading, error } = useClients()
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState('')

    const columns: ColumnDef<Client>[] = [
        {
            accessorKey: 'id',
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
            cell: ({ row }) => <div className="font-medium">{row.getValue('id')}</div>,
        },
        {
            accessorKey: 'nombre',
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
                const value = row.getValue('nombre') as string
                return (
                    <div className="font-medium">
                        {value && String(value).trim() ? value : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'apellido',
            header: 'Apellido',
            cell: ({ row }) => {
                const value = row.getValue('apellido') as string
                return (
                    <div className="text-sm text-muted-foreground">
                        {value && String(value).trim() ? value : <span className="italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'email',
            header: 'Email',
            cell: ({ row }) => {
                const value = row.getValue('email') as string
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
            accessorKey: 'telefono',
            header: 'Teléfono',
            cell: ({ row }) => {
                const value = row.getValue('telefono') as string
                return (
                    <div className="text-sm font-mono">
                        {value && String(value).trim() ? value : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'direccion',
            header: 'Dirección',
            cell: ({ row }) => {
                const value = row.getValue('direccion') as string
                return (
                    <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {value && String(value).trim() ? value : <span className="italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'estado',
            header: 'Estado',
            cell: ({ row }) => {
                const value = row.getValue('estado') as string
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {value}
                    </span>
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
        return <ErrorState title="Error al cargar clientes" />
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
