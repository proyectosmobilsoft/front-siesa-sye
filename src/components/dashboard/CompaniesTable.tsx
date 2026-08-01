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
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useCompanies } from '@/hooks/useCompanies'
import { ErrorState } from '@/components/ui/error-state'
import { badgeClass } from '@/utils/badges'
import { Company } from '@/api/types'
import { formatters } from '@/utils/formatters'

export const CompaniesTable = () => {
    return (
        <ErrorBoundary>
            <CompaniesTableContent />
        </ErrorBoundary>
    )
}

const CompaniesTableContent = () => {
    const { data: companies, isLoading, error } = useCompanies()
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState('')

    const columns: ColumnDef<Company>[] = [
        {
            accessorKey: 'f010_id',
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
            cell: ({ row }) => <div className="font-medium">{row.getValue('f010_id')}</div>,
        },
        {
            accessorKey: 'f010_razon_social',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Razón Social
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f010_razon_social') as string
                return (
                    <div className="font-medium">
                        {value && String(value).trim() ? formatters.truncate(value, 30) : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f010_nit',
            header: 'NIT',
            cell: ({ row }) => {
                const value = row.getValue('f010_nit') as string
                return (
                    <div className="text-sm font-mono">
                        {value && String(value).trim() ? value : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f010_ind_estado',
            header: 'Estado',
            cell: ({ row }) => {
                const estado = row.getValue('f010_ind_estado') as number | null | undefined
                if (estado === null || estado === undefined) {
                    return <span className="text-muted-foreground italic text-sm">Sin valor</span>
                }
                const isActive = estado === 1
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass(isActive ? 'green' : 'red')}`}>
                        {isActive ? 'Activa' : 'Inactiva'}
                    </span>
                )
            },
        },
        {
            accessorKey: 'f010_ult_ano_cerrado',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Año Cerrado
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('f010_ult_ano_cerrado') as number | string | null | undefined
                return (
                    <div className="text-sm">
                        {value !== null && value !== undefined && value !== '' ? value : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f010_telefono',
            header: 'Teléfono',
            cell: ({ row }) => {
                const value = row.getValue('f010_telefono') as string
                const formatted = formatters.phone(value)
                return (
                    <div className="text-sm">
                        {formatted && formatted !== 'N/A' ? formatted : <span className="text-muted-foreground italic">Sin valor</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: 'f010_email',
            header: 'Email',
            cell: ({ row }) => {
                const value = row.getValue('f010_email') as string
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
            accessorKey: 'f010_fecha_creacion',
            header: 'Fecha Creación',
            cell: ({ row }) => {
                const value = row.getValue('f010_fecha_creacion') as string
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
        data: companies || [],
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
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <ErrorState
                    title="Error al cargar compañías"
                    message={`No se pudieron obtener los datos. Error: ${error.message}. Verifique la conexión con el servidor.`}
                />
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex h-full min-h-0 flex-col gap-4"
        >
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                    {companies?.length ?? 0} {companies?.length === 1 ? 'compañía' : 'compañías'}
                </p>
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar compañías..."
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
