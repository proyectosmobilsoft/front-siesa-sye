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
import { ArrowUpDown, Search, Filter, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/lib/skeleton'
import { MonthYearPicker } from '@/components/ui/month-year-picker'
import { useEstadosFinancieros } from '@/hooks/useEstadosFinancieros'
import { usePerdidasGanancias } from '@/hooks/usePerdidasGanancias'
import { useTendenciaMensual } from '@/hooks/useTendenciaMensual'
import { EstadoFinanciero, EstadosFinancierosParams, PerdidasGanancias, TendenciaMensual } from '@/api/types'
import { formatters } from '@/utils/formatters'
import * as XLSX from 'xlsx'
import { ResponsiveBar } from '@nivo/bar'

export const AnalisisFinancieroPage = () => {
    const [filtros, setFiltros] = useState<EstadosFinancierosParams>({
        periodoInicial: 202401,
        periodoFinal: 202402,
    })

    const [searchParams, setSearchParams] = useState<EstadosFinancierosParams | null>(null)
    const { data: estadosFinancieros, isLoading: isLoadingEstados, error: errorEstados, refetch: refetchEstados } = useEstadosFinancieros(searchParams || undefined)
    const { data: perdidasGanancias, isLoading: isLoadingPG, error: errorPG, refetch: refetchPG } = usePerdidasGanancias(searchParams || undefined)
    const { data: tendenciaMensual, isLoading: isLoadingTM, error: errorTM, refetch: refetchTM } = useTendenciaMensual(searchParams || undefined)

    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState('')

    const [sortingPG, setSortingPG] = useState<SortingState>([])
    const [columnFiltersPG, setColumnFiltersPG] = useState<ColumnFiltersState>([])
    const [globalFilterPG, setGlobalFilterPG] = useState('')

    const [sortingTM, setSortingTM] = useState<SortingState>([])
    const [columnFiltersTM, setColumnFiltersTM] = useState<ColumnFiltersState>([])
    const [globalFilterTM, setGlobalFilterTM] = useState('')

    // Generar columnas dinámicamente basadas en las claves del primer estado financiero
    const getColumns = (): ColumnDef<EstadoFinanciero>[] => {
        if (!estadosFinancieros || estadosFinancieros.length === 0) {
            return []
        }

        const firstEstado = estadosFinancieros[0]
        const keys = Object.keys(firstEstado)

        // Columnas a excluir (no mostrar "Compañía" y las que se combinan)
        const excludedKeys = ['Compañía', 'Código Cuenta', 'Nombre de la Cuenta']

        // Ordenar columnas para que "Nombre Compañía" aparezca primero
        const orderedKeys = [
            'Nombre Compañía',
            'Cuenta', // Columna combinada
            'Total Cuenta',
            'Tipo de Saldo',
            ...keys.filter(k => !['Nombre Compañía', 'Compañía', 'Código Cuenta', 'Nombre de la Cuenta', 'Total Cuenta', 'Tipo de Saldo'].includes(k))
        ]

        const columns: ColumnDef<EstadoFinanciero>[] = []

        orderedKeys
            .filter(key => {
                if (key === 'Cuenta') return true // Siempre incluir la columna combinada
                return keys.includes(key) && !excludedKeys.includes(key)
            })
            .forEach((key) => {
                if (key === 'Cuenta') {
                    // Columna combinada: Código Cuenta + Nombre de la Cuenta
                    columns.push({
                        id: 'Cuenta',
                        header: ({ column }) => {
                            return (
                                <Button
                                    variant="ghost"
                                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                                    className="h-8 px-2"
                                >
                                    Cuenta
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            )
                        },
                        cell: ({ row }) => {
                            const codigo = row.original['Código Cuenta']?.toString().trim() || ''
                            const nombre = row.original['Nombre de la Cuenta']?.toString().trim() || ''

                            if (!codigo && !nombre) {
                                return <div className="text-sm text-muted-foreground italic">N/A</div>
                            }

                            return (
                                <div className="text-sm">
                                    {codigo && (
                                        <div className="font-mono text-xs text-muted-foreground mb-1">{codigo}</div>
                                    )}
                                    {nombre && (
                                        <div className="font-medium">{nombre}</div>
                                    )}
                                </div>
                            )
                        },
                        sortingFn: (rowA, rowB) => {
                            const codigoA = rowA.original['Código Cuenta']?.toString().trim() || ''
                            const codigoB = rowB.original['Código Cuenta']?.toString().trim() || ''
                            return codigoA.localeCompare(codigoB)
                        },
                    })
                } else {
                    // Columnas normales
                    columns.push({
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

                            // Formateo especial para "Nombre Compañía"
                            if (key === 'Nombre Compañía') {
                                return <div className="font-medium">{value ?? <span className="text-muted-foreground italic">N/A</span>}</div>
                            }

                            // Formateo especial para "Total Cuenta"
                            if (key === 'Total Cuenta' && typeof value === 'number') {
                                return <div className="text-right font-semibold">{formatters.currency(value)}</div>
                            }

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
                            // Limpiar espacios en blanco al final de strings
                            if (typeof value === 'string') {
                                const trimmedValue = value.trim()
                                return <div className="text-sm">{trimmedValue || <span className="text-muted-foreground italic">N/A</span>}</div>
                            }
                            return <div className="text-sm">{value ?? <span className="text-muted-foreground italic">N/A</span>}</div>
                        },
                    })
                }
            })

        return columns
    }

    const columns = getColumns()

    const table = useReactTable({
        data: estadosFinancieros || [],
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

    // Columnas para Pérdidas y Ganancias
    const columnsPG: ColumnDef<PerdidasGanancias>[] = [
        {
            accessorKey: 'TipoCuenta',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Tipo de Cuenta
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                return <div className="font-medium">{row.getValue('TipoCuenta')}</div>
            },
        },
        {
            accessorKey: 'Cuenta',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Cuenta
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                return <div className="text-sm">{row.getValue('Cuenta')}</div>
            },
        },
        {
            accessorKey: 'Total',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Total
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('Total') as number
                return <div className="text-right font-semibold">{formatters.currency(value)}</div>
            },
        },
    ]

    const tablePG = useReactTable({
        data: perdidasGanancias || [],
        columns: columnsPG,
        onSortingChange: setSortingPG,
        onColumnFiltersChange: setColumnFiltersPG,
        onGlobalFilterChange: setGlobalFilterPG,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting: sortingPG,
            columnFilters: columnFiltersPG,
            globalFilter: globalFilterPG,
        },
    })

    // Columnas para Tendencia Mensual
    const columnsTM: ColumnDef<TendenciaMensual>[] = [
        {
            accessorKey: 'Periodo',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Periodo
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const periodo = row.getValue('Periodo') as number
                const str = periodo.toString()
                if (str.length === 6) {
                    const year = str.substring(0, 4)
                    const month = str.substring(4, 6)
                    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                    const monthIndex = parseInt(month) - 1
                    return <div className="font-medium">{monthNames[monthIndex] || month} {year}</div>
                }
                return <div className="font-medium">{periodo}</div>
            },
        },
        {
            accessorKey: 'Ingresos',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Ingresos
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('Ingresos') as number
                return <div className="text-right font-semibold text-green-600">{formatters.currency(value)}</div>
            },
        },
        {
            accessorKey: 'Costos',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Costos
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('Costos') as number
                return <div className="text-right font-semibold text-red-600">{formatters.currency(value)}</div>
            },
        },
        {
            accessorKey: 'Gastos',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Gastos
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('Gastos') as number
                return <div className="text-right font-semibold text-orange-600">{formatters.currency(value)}</div>
            },
        },
        {
            accessorKey: 'Utilidad',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2"
                    >
                        Utilidad
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = row.getValue('Utilidad') as number
                const colorClass = value >= 0 ? 'text-green-600' : 'text-red-600'
                return <div className={`text-right font-bold ${colorClass}`}>{formatters.currency(value)}</div>
            },
        },
    ]

    const tableTM = useReactTable({
        data: tendenciaMensual || [],
        columns: columnsTM,
        onSortingChange: setSortingTM,
        onColumnFiltersChange: setColumnFiltersTM,
        onGlobalFilterChange: setGlobalFilterTM,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting: sortingTM,
            columnFilters: columnFiltersTM,
            globalFilter: globalFilterTM,
        },
    })

    const handleBuscar = () => {
        setSearchParams({ ...filtros })
    }

    const handleExportToExcel = () => {
        if (!estadosFinancieros || estadosFinancieros.length === 0) {
            return
        }

        // Preparar los datos para Excel
        const excelData = estadosFinancieros.map(row => {
            const excelRow: Record<string, any> = {}

            columns.forEach(col => {
                if (col.id === 'Cuenta') {
                    // Separar la columna combinada en dos columnas
                    excelRow['Código Cuenta'] = row['Código Cuenta']?.toString().trim() || ''
                    excelRow['Nombre de la Cuenta'] = row['Nombre de la Cuenta']?.toString().trim() || ''
                } else if (col.accessorKey) {
                    const key = col.accessorKey as string
                    const value = row[key]

                    if (value === null || value === undefined) {
                        excelRow[key] = 'N/A'
                    } else if (typeof value === 'number') {
                        // Mantener números como números para Excel
                        excelRow[key] = value
                    } else {
                        excelRow[key] = String(value).trim()
                    }
                }
            })

            return excelRow
        })

        // Crear el libro de trabajo
        const wb = XLSX.utils.book_new()

        // Crear la hoja de trabajo con los datos
        const ws = XLSX.utils.json_to_sheet(excelData)

        // Ajustar el ancho de las columnas
        const colWidths: { wch: number }[] = []
        columns.forEach(col => {
            if (col.id === 'Cuenta') {
                // Separar la columna combinada en dos columnas
                colWidths.push({ wch: 20 }) // Código Cuenta
                colWidths.push({ wch: 40 }) // Nombre de la Cuenta
            } else if (col.accessorKey) {
                const key = col.accessorKey as string
                if (key === 'Total Cuenta') {
                    colWidths.push({ wch: 18 })
                } else if (key === 'Nombre Compañía') {
                    colWidths.push({ wch: 35 })
                } else if (key === 'Tipo de Saldo') {
                    colWidths.push({ wch: 15 })
                } else {
                    colWidths.push({ wch: 15 })
                }
            }
        })

        ws['!cols'] = colWidths

        // Agregar la hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Estados Financieros')

        // Generar el nombre del archivo
        const fecha = new Date().toISOString().split('T')[0]
        const periodoInicial = filtros.periodoInicial || ''
        const periodoFinal = filtros.periodoFinal || ''
        const filename = `estados_financieros_${periodoInicial}_${periodoFinal}_${fecha}.xlsx`

        // Escribir el archivo
        XLSX.writeFile(wb, filename)
    }

    const handleExportToExcelPG = () => {
        if (!perdidasGanancias || perdidasGanancias.length === 0) {
            return
        }

        // Preparar los datos para Excel
        const excelData = perdidasGanancias.map(row => ({
            'Tipo de Cuenta': row.TipoCuenta,
            'Cuenta': row.Cuenta,
            'Total': row.Total,
        }))

        // Crear el libro de trabajo
        const wb = XLSX.utils.book_new()

        // Crear la hoja de trabajo con los datos
        const ws = XLSX.utils.json_to_sheet(excelData)

        // Ajustar el ancho de las columnas
        ws['!cols'] = [
            { wch: 20 }, // Tipo de Cuenta
            { wch: 40 }, // Cuenta
            { wch: 18 }, // Total
        ]

        // Agregar la hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Pérdidas y Ganancias')

        // Generar el nombre del archivo
        const fecha = new Date().toISOString().split('T')[0]
        const periodoInicial = filtros.periodoInicial || ''
        const periodoFinal = filtros.periodoFinal || ''
        const filename = `perdidas_ganancias_${periodoInicial}_${periodoFinal}_${fecha}.xlsx`

        // Escribir el archivo
        XLSX.writeFile(wb, filename)
    }

    const handleExportToExcelTM = () => {
        if (!tendenciaMensual || tendenciaMensual.length === 0) {
            return
        }

        // Preparar los datos para Excel
        const excelData = tendenciaMensual.map(row => ({
            'Periodo': row.Periodo,
            'Ingresos': row.Ingresos,
            'Costos': row.Costos,
            'Gastos': row.Gastos,
            'Utilidad': row.Utilidad,
        }))

        // Crear el libro de trabajo
        const wb = XLSX.utils.book_new()

        // Crear la hoja de trabajo con los datos
        const ws = XLSX.utils.json_to_sheet(excelData)

        // Ajustar el ancho de las columnas
        ws['!cols'] = [
            { wch: 15 }, // Periodo
            { wch: 18 }, // Ingresos
            { wch: 18 }, // Costos
            { wch: 18 }, // Gastos
            { wch: 18 }, // Utilidad
        ]

        // Agregar la hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Tendencia Mensual')

        // Generar el nombre del archivo
        const fecha = new Date().toISOString().split('T')[0]
        const periodoInicial = filtros.periodoInicial || ''
        const periodoFinal = filtros.periodoFinal || ''
        const filename = `tendencia_mensual_${periodoInicial}_${periodoFinal}_${fecha}.xlsx`

        // Escribir el archivo
        XLSX.writeFile(wb, filename)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-6 p-6"
        >
            {/* Header con título y filtros */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Análisis Financiero</h1>
                    <p className="text-muted-foreground">
                        Estados financieros y análisis de facturas
                    </p>
                </div>

                {/* Filtros al lado del título */}
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="min-w-[180px]">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Periodo Inicial</label>
                        <MonthYearPicker
                            value={filtros.periodoInicial}
                            onChange={(value) => setFiltros({ ...filtros, periodoInicial: value })}
                            placeholder="Periodo inicial"
                        />
                    </div>
                    <div className="min-w-[180px]">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Periodo Final</label>
                        <MonthYearPicker
                            value={filtros.periodoFinal}
                            onChange={(value) => setFiltros({ ...filtros, periodoFinal: value })}
                            placeholder="Periodo final"
                        />
                    </div>
                    <div className="min-w-[140px]">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block opacity-0">Buscar</label>
                        <Button onClick={handleBuscar} size="sm" className="w-full h-9 text-xs">
                            <Search className="mr-1.5 h-3.5 w-3.5" />
                            Buscar Análisis
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tablas */}
            {searchParams && (
                <Tabs defaultValue="estados-financieros" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="estados-financieros">Estados Financieros</TabsTrigger>
                        <TabsTrigger value="perdidas-ganancias">Estado de Resultados (Pérdidas y Ganancias)</TabsTrigger>
                        <TabsTrigger value="tendencia-mensual">Tendencia Mensual</TabsTrigger>
                    </TabsList>

                    <TabsContent value="estados-financieros" className="mt-6">
                        {isLoadingEstados ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Estados Financieros</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-64 w-full" />
                                    </div>
                                </CardContent>
                            </Card>
                        ) : errorEstados ? (
                            <Card className="border-red-200 bg-red-50">
                                <CardHeader>
                                    <CardTitle className="text-red-800">Error al cargar estados financieros</CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-center justify-center h-64">
                                    <div className="text-center text-red-600">
                                        <p className="text-lg font-medium">No se pudieron obtener los datos</p>
                                        <p className="text-sm mt-2">Error: {errorEstados instanceof Error ? errorEstados.message : 'Error desconocido'}</p>
                                        <Button onClick={() => refetchEstados()} className="mt-4" variant="outline">
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
                                                    <span className="text-primary">Estados Financieros</span>
                                                    {estadosFinancieros && (
                                                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                                                            ({estadosFinancieros.length} {estadosFinancieros.length === 1 ? 'registro' : 'registros'})
                                                        </span>
                                                    )}
                                                </CardTitle>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
                                            <div className="relative flex-1 max-w-sm">
                                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Buscar en estados financieros..."
                                                    value={globalFilter ?? ''}
                                                    onChange={(event) => setGlobalFilter(String(event.target.value))}
                                                    className="pl-8"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleExportToExcel}
                                                    className="h-9"
                                                >
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Exportar Excel
                                                </Button>
                                                <p className="text-xs text-muted-foreground/80 italic max-w-md hidden lg:block">
                                                    Retorna el reporte de estados financieros agrupado por cuenta auxiliar, sumando los valores netos del periodo especificado, ordenados por el total de cuenta de forma descendente.
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground/80 italic lg:hidden mt-2">
                                            Retorna el reporte de estados financieros agrupado por cuenta auxiliar, sumando los valores netos del periodo especificado, ordenados por el total de cuenta de forma descendente.
                                        </p>
                                    </CardHeader>
                                    <CardContent>
                                        {!estadosFinancieros || estadosFinancieros.length === 0 ? (
                                            <div className="text-center py-12">
                                                <p className="text-muted-foreground">No se encontraron estados financieros con los filtros seleccionados.</p>
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

                        {/* Gráfico Top Cuentas - Tipo de Saldo: Deudor */}
                        {estadosFinancieros && estadosFinancieros.length > 0 && (() => {
                            // Filtrar solo cuentas de tipo "Deudor"
                            const cuentasDeudoras = estadosFinancieros
                                .map((item) => {
                                    const tipoSaldo = item['Tipo de Saldo']?.toString().trim() || ''
                                    const total = typeof item['Total Cuenta'] === 'number' ? item['Total Cuenta'] : 0
                                    if (total <= 0 || tipoSaldo !== 'Deudor') return null
                                    return {
                                        cuenta: item['Nombre de la Cuenta']?.toString().trim() || 'Sin nombre',
                                        total: total,
                                        codigo: item['Código Cuenta']?.toString().trim() || '',
                                    }
                                })
                                .filter((item): item is NonNullable<typeof item> => item !== null)
                                .sort((a, b) => b.total - a.total)
                                .slice(0, 10) // Top 10 cuentas deudoras

                            if (cuentasDeudoras.length === 0) {
                                return null
                            }

                            // Formatear número en formato colombiano (1.000.000.000)
                            const formatCurrencyColombian = (value: number): string => {
                                return new Intl.NumberFormat('es-CO', {
                                    style: 'currency',
                                    currency: 'COP',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                }).format(value)
                            }

                            // Preparar datos para el gráfico
                            const chartData = cuentasDeudoras.map((item) => ({
                                id: item.cuenta.length > 50 ? item.cuenta.substring(0, 50) + '...' : item.cuenta,
                                cuenta: item.cuenta,
                                total: item.total,
                                totalPesos: item.total, // Mantener en pesos para el gráfico
                                label: formatCurrencyColombian(item.total),
                                codigo: item.codigo,
                            }))

                            // Colores corporativos financieros (gradiente azul oscuro)
                            const getBarColor = (index: number) => {
                                const colors = [
                                    '#1a365d', // Azul oscuro profundo
                                    '#2c5282',
                                    '#2d5a87',
                                    '#3182ce',
                                    '#4299e1',
                                    '#63b3ed',
                                    '#90cdf4',
                                    '#bee3f8',
                                ]
                                return colors[index % colors.length]
                            }

                            const totalGeneral = cuentasDeudoras.reduce((sum, item) => sum + item.total, 0)

                            return (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                    className="mt-6"
                                >
                                    <Card className="border border-border bg-background shadow-lg">
                                        <CardHeader className="border-b border-border pb-4">
                                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                                <div>
                                                    <CardTitle className="text-2xl font-bold mb-2 text-foreground" style={{ fontFamily: 'Inter, Roboto, "Open Sans", system-ui, sans-serif' }}>
                                                        Top Cuentas - Tipo de Saldo: Deudor
                                                    </CardTitle>
                                                    <p className="text-sm text-muted-foreground font-semibold" style={{ fontFamily: 'Inter, Roboto, "Open Sans", system-ui, sans-serif' }}>
                                                        CI DISTRIBUCIONES SYE S.A.S.
                                                    </p>
                                                </div>
                                                <div className="max-w-md">
                                                    <p className="text-xs text-muted-foreground leading-relaxed italic" style={{ fontFamily: 'Inter, Roboto, "Open Sans", system-ui, sans-serif' }}>
                                                        Mostrar de forma clara y visualmente impactante cuáles son las cuentas contables con los saldos más altos dentro del tipo Deudor, facilitando la toma de decisiones financieras y el análisis de concentración de cuentas.
                                                    </p>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-12">
                                            <div className="h-[600px] bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-lg p-4 mt-8">
                                                <ResponsiveBar
                                                    data={chartData}
                                                    keys={['totalPesos']}
                                                    indexBy="id"
                                                    margin={{ top: 20, right: 220, bottom: 70, left: 240 }}
                                                    padding={0.4}
                                                    layout="horizontal"
                                                    valueScale={{ type: 'linear' }}
                                                    indexScale={{ type: 'band', round: true }}
                                                    colors={(bar) => getBarColor(bar.index)}
                                                    borderColor={{ from: 'color', modifiers: [['darker', 2.0]] }}
                                                    borderWidth={1}
                                                    axisTop={null}
                                                    axisRight={null}
                                                    axisBottom={{
                                                        tickSize: 5,
                                                        tickPadding: 10,
                                                        tickRotation: 0,
                                                        legend: 'Total Cuenta (Pesos Colombianos)',
                                                        legendPosition: 'middle',
                                                        legendOffset: 50,
                                                        format: (value) => {
                                                            return formatCurrencyColombian(value)
                                                        },
                                                        tickColor: 'hsl(var(--muted-foreground))',
                                                        legendColor: 'hsl(var(--foreground))',
                                                        tickValues: 5,
                                                    }}
                                                    axisLeft={{
                                                        tickSize: 5,
                                                        tickPadding: 10,
                                                        tickRotation: 0,
                                                        legend: 'Descripción de Cuenta',
                                                        legendPosition: 'middle',
                                                        legendOffset: -220,
                                                        tickColor: 'hsl(var(--muted-foreground))',
                                                        legendColor: 'hsl(var(--foreground))',
                                                        renderTick: (tick) => {
                                                            const item = chartData.find(d => d.id === tick.value)
                                                            const label = item?.cuenta || tick.value
                                                            const displayLabel = label.length > 60 ? label.substring(0, 60) + '...' : label
                                                            return (
                                                                <g transform={`translate(${tick.x},${tick.y})`}>
                                                                    <text
                                                                        x={-8}
                                                                        y={0}
                                                                        textAnchor="end"
                                                                        dominantBaseline="middle"
                                                                        fill="hsl(var(--foreground))"
                                                                        fontSize={12}
                                                                        fontWeight={500}
                                                                        style={{ fontFamily: 'Inter, Roboto, "Open Sans", system-ui, sans-serif' }}
                                                                    >
                                                                        {displayLabel}
                                                                    </text>
                                                                </g>
                                                            )
                                                        },
                                                    }}
                                                    theme={{
                                                        axis: {
                                                            ticks: {
                                                                text: {
                                                                    fill: 'hsl(var(--foreground))',
                                                                    fontSize: 11,
                                                                    fontFamily: 'Inter, Roboto, "Open Sans", system-ui, sans-serif',
                                                                    fontWeight: 500
                                                                }
                                                            },
                                                            legend: {
                                                                text: {
                                                                    fill: 'hsl(var(--foreground))',
                                                                    fontSize: 13,
                                                                    fontWeight: 700,
                                                                    fontFamily: 'Inter, Roboto, "Open Sans", system-ui, sans-serif'
                                                                }
                                                            },
                                                            grid: {
                                                                line: {
                                                                    stroke: 'hsl(var(--border))',
                                                                    strokeWidth: 1,
                                                                    strokeDasharray: '3 3',
                                                                    opacity: 0.4
                                                                }
                                                            }
                                                        },
                                                        grid: {
                                                            line: {
                                                                stroke: 'hsl(var(--border))',
                                                                strokeWidth: 1,
                                                                strokeDasharray: '3 3',
                                                                opacity: 0.4
                                                            }
                                                        },
                                                        tooltip: {
                                                            container: {
                                                                background: 'hsl(var(--card))',
                                                                border: '2px solid hsl(var(--border))',
                                                                borderRadius: '8px',
                                                                padding: '12px 16px',
                                                                boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                                                                color: 'hsl(var(--foreground))',
                                                                fontFamily: 'Inter, Roboto, "Open Sans", system-ui, sans-serif',
                                                            }
                                                        }
                                                    }}
                                                    enableLabel={false}
                                                    labelSkipWidth={9999}
                                                    labelSkipHeight={9999}
                                                    layers={[
                                                        'grid',
                                                        'axes',
                                                        'bars',
                                                        'markers',
                                                        'legends',
                                                        (props) => {
                                                            // Renderizar etiquetas personalizadas fuera de las barras
                                                            // Filtrar solo las barras principales (sin duplicados por key)
                                                            const { bars } = props
                                                            const processedIndices = new Set<number>()

                                                            return (
                                                                <g>
                                                                    {bars
                                                                        .filter((bar) => {
                                                                            // Solo procesar una vez cada índice de dato
                                                                            if (processedIndices.has(bar.index)) {
                                                                                return false
                                                                            }
                                                                            processedIndices.add(bar.index)
                                                                            return true
                                                                        })
                                                                        .map((bar) => {
                                                                            const item = chartData[bar.index]
                                                                            if (!item) return null
                                                                            const xPosition = bar.x + bar.width + 8 // Al lado derecho de la barra con 8px de espacio
                                                                            const yPosition = bar.y + bar.height / 2 // Centrado verticalmente
                                                                            return (
                                                                                <text
                                                                                    key={`custom-label-${bar.index}-${item.total}`}
                                                                                    x={xPosition}
                                                                                    y={yPosition}
                                                                                    textAnchor="start"
                                                                                    dominantBaseline="middle"
                                                                                    fill="hsl(var(--foreground))"
                                                                                    fontSize={12}
                                                                                    fontWeight={600}
                                                                                    style={{ fontFamily: 'Inter, Roboto, "Open Sans", system-ui, sans-serif' }}
                                                                                >
                                                                                    {formatCurrencyColombian(item.total)}
                                                                                </text>
                                                                            )
                                                                        })}
                                                                </g>
                                                            )
                                                        },
                                                    ]}
                                                    animate={true}
                                                    motionConfig="gentle"
                                                    tooltip={({ id, value, indexValue }) => {
                                                        const item = chartData.find(d => d.id === indexValue)
                                                        return (
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: 6,
                                                                    padding: '12px 16px',
                                                                    background: 'hsl(var(--card))',
                                                                    border: '2px solid hsl(var(--border))',
                                                                    borderRadius: 8,
                                                                    boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                                                                    color: 'hsl(var(--foreground))',
                                                                    fontFamily: 'Inter, Roboto, "Open Sans", system-ui, sans-serif',
                                                                }}
                                                            >
                                                                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'hsl(var(--foreground))' }}>
                                                                    {item?.cuenta || indexValue}
                                                                </div>
                                                                <div style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>
                                                                    Total: {item?.label || formatCurrencyColombian(value as number)}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, paddingTop: 6, borderTop: '1px solid hsl(var(--border))' }}>
                                                                    <div
                                                                        style={{
                                                                            width: 12,
                                                                            height: 12,
                                                                            borderRadius: 2,
                                                                            backgroundColor: '#1a365d'
                                                                        }}
                                                                    />
                                                                    <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>
                                                                        Tipo de Saldo: Deudor
                                                                    </span>
                                                                </div>
                                                                {item?.codigo && (
                                                                    <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', fontFamily: 'monospace', marginTop: 2 }}>
                                                                        Código: {item.codigo}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    }}
                                                    enableGridX={true}
                                                    enableGridY={false}
                                                    defs={[
                                                        {
                                                            id: 'gradient',
                                                            type: 'linearGradient',
                                                            colors: [
                                                                { offset: 0, color: 'inherit', opacity: 1 },
                                                                { offset: 100, color: 'inherit', opacity: 0.75 }
                                                            ]
                                                        }
                                                    ]}
                                                    fill={[{ match: '*', id: 'gradient' }]}
                                                />
                                                <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-5 w-5 rounded" style={{ background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)' }}></div>
                                                        <span className="text-sm font-semibold text-foreground" style={{ fontFamily: 'Inter, Roboto, "Open Sans", system-ui, sans-serif' }}>
                                                            Tipo de Saldo: Deudor
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground" style={{ fontFamily: 'Inter, Roboto, "Open Sans", system-ui, sans-serif' }}>
                                                        <span className="font-semibold">Total: {formatCurrencyColombian(totalGeneral)}</span>
                                                        <span>•</span>
                                                        <span>Top {cuentasDeudoras.length} cuentas</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )
                        })()}
                    </TabsContent>

                    <TabsContent value="perdidas-ganancias" className="mt-6">
                        {isLoadingPG ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Estado de Resultados (Pérdidas y Ganancias)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-64 w-full" />
                                    </div>
                                </CardContent>
                            </Card>
                        ) : errorPG ? (
                            <Card className="border-red-200 bg-red-50">
                                <CardHeader>
                                    <CardTitle className="text-red-800">Error al cargar pérdidas y ganancias</CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-center justify-center h-64">
                                    <div className="text-center text-red-600">
                                        <p className="text-lg font-medium">No se pudieron obtener los datos</p>
                                        <p className="text-sm mt-2">Error: {errorPG instanceof Error ? errorPG.message : 'Error desconocido'}</p>
                                        <Button onClick={() => refetchPG()} className="mt-4" variant="outline">
                                            Reintentar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                            >
                                <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
                                    <CardHeader>
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <CardTitle className="flex items-center gap-2">
                                                    <span className="text-primary">Estado de Resultados (Pérdidas y Ganancias)</span>
                                                    {perdidasGanancias && (
                                                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                                                            ({perdidasGanancias.length} {perdidasGanancias.length === 1 ? 'registro' : 'registros'})
                                                        </span>
                                                    )}
                                                </CardTitle>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
                                            <div className="relative flex-1 max-w-sm">
                                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Buscar en pérdidas y ganancias..."
                                                    value={globalFilterPG ?? ''}
                                                    onChange={(event) => setGlobalFilterPG(String(event.target.value))}
                                                    className="pl-8"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleExportToExcelPG}
                                                    className="h-9"
                                                >
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Exportar Excel
                                                </Button>
                                                <p className="text-xs text-muted-foreground/80 italic max-w-md hidden lg:block">
                                                    Retorna el Estado de Resultados agrupado por tipo de cuenta (Ingresos, Costos, Gastos, Otros) según el primer dígito del código auxiliar. Las cuentas se clasifican automáticamente - código 4xxx para Ingresos, 5xxx para Costos, 6xxx para Gastos, otros para Otros.
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground/80 italic lg:hidden mt-2">
                                            Retorna el Estado de Resultados agrupado por tipo de cuenta (Ingresos, Costos, Gastos, Otros) según el primer dígito del código auxiliar. Las cuentas se clasifican automáticamente - código 4xxx para Ingresos, 5xxx para Costos, 6xxx para Gastos, otros para Otros.
                                        </p>
                                    </CardHeader>
                                    <CardContent>
                                        {!perdidasGanancias || perdidasGanancias.length === 0 ? (
                                            <div className="text-center py-12">
                                                <p className="text-muted-foreground">No se encontraron datos de pérdidas y ganancias con los filtros seleccionados.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="rounded-md border">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                {tablePG.getHeaderGroups().map((headerGroup) => (
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
                                                                {tablePG.getRowModel().rows?.length ? (
                                                                    tablePG.getRowModel().rows.map((row) => (
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
                                                                        <td colSpan={columnsPG.length} className="h-24 text-center">
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
                                                        {tablePG.getFilteredRowModel().rows.length} de {tablePG.getCoreRowModel().rows.length} filas.
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => tablePG.previousPage()}
                                                            disabled={!tablePG.getCanPreviousPage()}
                                                        >
                                                            Anterior
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => tablePG.nextPage()}
                                                            disabled={!tablePG.getCanNextPage()}
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
                    </TabsContent>

                    <TabsContent value="tendencia-mensual" className="mt-6">
                        {isLoadingTM ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Tendencia Mensual</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-64 w-full" />
                                    </div>
                                </CardContent>
                            </Card>
                        ) : errorTM ? (
                            <Card className="border-red-200 bg-red-50">
                                <CardHeader>
                                    <CardTitle className="text-red-800">Error al cargar tendencia mensual</CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-center justify-center h-64">
                                    <div className="text-center text-red-600">
                                        <p className="text-lg font-medium">No se pudieron obtener los datos</p>
                                        <p className="text-sm mt-2">Error: {errorTM instanceof Error ? errorTM.message : 'Error desconocido'}</p>
                                        <Button onClick={() => refetchTM()} className="mt-4" variant="outline">
                                            Reintentar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                            >
                                <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
                                    <CardHeader>
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <CardTitle className="flex items-center gap-2">
                                                    <span className="text-primary">Tendencia Mensual</span>
                                                    {tendenciaMensual && (
                                                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                                                            ({tendenciaMensual.length} {tendenciaMensual.length === 1 ? 'registro' : 'registros'})
                                                        </span>
                                                    )}
                                                </CardTitle>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
                                            <div className="relative flex-1 max-w-sm">
                                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Buscar en tendencia mensual..."
                                                    value={globalFilterTM ?? ''}
                                                    onChange={(event) => setGlobalFilterTM(String(event.target.value))}
                                                    className="pl-8"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleExportToExcelTM}
                                                    className="h-9"
                                                >
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Exportar Excel
                                                </Button>
                                                <p className="text-xs text-muted-foreground/80 italic max-w-md hidden lg:block">
                                                    Retorna la tendencia mensual de ingresos, costos y gastos agrupados por periodo contable. Calcula automáticamente la utilidad como Ingresos menos Costos y Gastos.
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground/80 italic lg:hidden mt-2">
                                            Retorna la tendencia mensual de ingresos, costos y gastos agrupados por periodo contable. Calcula automáticamente la utilidad como Ingresos menos Costos y Gastos.
                                        </p>
                                    </CardHeader>
                                    <CardContent>
                                        {!tendenciaMensual || tendenciaMensual.length === 0 ? (
                                            <div className="text-center py-12">
                                                <p className="text-muted-foreground">No se encontraron datos de tendencia mensual con los filtros seleccionados.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="rounded-md border">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                {tableTM.getHeaderGroups().map((headerGroup) => (
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
                                                                {tableTM.getRowModel().rows?.length ? (
                                                                    tableTM.getRowModel().rows.map((row) => (
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
                                                                        <td colSpan={columnsTM.length} className="h-24 text-center">
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
                                                        {tableTM.getFilteredRowModel().rows.length} de {tableTM.getCoreRowModel().rows.length} filas.
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => tableTM.previousPage()}
                                                            disabled={!tableTM.getCanPreviousPage()}
                                                        >
                                                            Anterior
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => tableTM.nextPage()}
                                                            disabled={!tableTM.getCanNextPage()}
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
                    </TabsContent>
                </Tabs>
            )}

            {!searchParams && (
                <Card>
                    <CardContent className="flex items-center justify-center h-64">
                        <div className="text-center text-muted-foreground">
                            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Selecciona los filtros y haz clic en "Buscar"</p>
                            <p className="text-sm mt-2">Los valores por defecto son: Periodo Inicial 202401, Periodo Final 202402</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </motion.div>
    )
}
