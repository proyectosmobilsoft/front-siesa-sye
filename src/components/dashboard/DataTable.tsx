import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatters } from '@/utils/formatters'

interface Column {
    header: string
    accessor: string | ((row: any) => any)
    align?: 'left' | 'right' | 'center'
    format?: (value: any) => string
}

interface DataTableProps {
    title: string
    columns: Column[]
    data: any[]
    showTotalRow?: boolean
    totalLabel?: string
    totalAccessor?: string | ((row: any) => number)
    exportable?: boolean
    exportFilename?: string
}

export const DataTable = ({
    title,
    columns,
    data,
    showTotalRow = false,
    totalLabel = 'Total',
    totalAccessor,
    exportable = true,
    exportFilename = 'datos'
}: DataTableProps) => {
    const getCellValue = (row: any, column: Column) => {
        if (typeof column.accessor === 'function') {
            return column.accessor(row)
        }
        return row[column.accessor] ?? ''
    }

    const formatCell = (value: any, column: Column) => {
        if (column.format) {
            return column.format(value)
        }
        return value ?? 'N/A'
    }

    const handleExport = () => {
        const headers = columns.map(col => col.header).join(',')
        const rows = data.map(row => {
            return columns.map(col => {
                const value = getCellValue(row, col)
                const formatted = formatCell(value, col)
                // Escapar comillas y envolver en comillas si contiene comas
                const stringValue = String(formatted)
                if (stringValue.includes(',') || stringValue.includes('"')) {
                    return `"${stringValue.replace(/"/g, '""')}"`
                }
                return stringValue
            }).join(',')
        }).join('\n')
        
        const csvContent = `${headers}\n${rows}`
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `${exportFilename}_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const calculateTotal = () => {
        if (!showTotalRow || !totalAccessor) return null
        
        const total = data.reduce((acc, row) => {
            const value = typeof totalAccessor === 'function' 
                ? totalAccessor(row) 
                : (row[totalAccessor] || 0)
            return acc + (typeof value === 'number' ? value : 0)
        }, 0)
        
        return total
    }

    const total = calculateTotal()

    if (!data || data.length === 0) {
        return (
            <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-muted-foreground">
                            {title}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        No hay datos para mostrar
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card border rounded-lg overflow-hidden shadow-sm"
        >
            <div className="bg-muted/30 border-b px-2 py-1.5 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground">{title}</h3>
                {exportable && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExport}
                        className="h-6 text-[10px] px-2"
                    >
                        <Download className="h-2.5 w-2.5 mr-0.5" />
                        CSV
                    </Button>
                )}
            </div>
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-muted/50 border-b">
                            {columns.map((column, index) => (
                                <th
                                    key={index}
                                    className={`px-2 py-1.5 text-left font-semibold text-foreground text-[11px] ${
                                        column.align === 'right' ? 'text-right' :
                                        column.align === 'center' ? 'text-center' : 'text-left'
                                    }`}
                                >
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <motion.tr
                                key={rowIndex}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.15, delay: rowIndex * 0.01 }}
                                className="border-b hover:bg-muted/30 transition-colors"
                            >
                                {columns.map((column, colIndex) => {
                                    const value = getCellValue(row, column)
                                    const formatted = formatCell(value, column)
                                    return (
                                        <td
                                            key={colIndex}
                                            className={`px-2 py-1.5 text-[11px] ${
                                                column.align === 'right' ? 'text-right' :
                                                column.align === 'center' ? 'text-center' : 'text-left'
                                            } ${
                                                typeof value === 'number' ? 'font-mono' : ''
                                            }`}
                                        >
                                            {formatted}
                                        </td>
                                    )
                                })}
                            </motion.tr>
                        ))}
                        {showTotalRow && total !== null && (
                            <tr className="bg-muted/50 border-t-2 border-foreground/20 font-semibold">
                                <td className="px-2 py-1.5 text-xs" colSpan={columns.length - 1}>
                                    {totalLabel}
                                </td>
                                <td className="px-2 py-1.5 text-right font-mono text-xs">
                                    {totalAccessor && columns.find(c => 
                                        (typeof totalAccessor === 'function' ? totalAccessor({}) : c.accessor === totalAccessor)
                                    )?.format
                                        ? columns.find(c => typeof totalAccessor === 'function' ? totalAccessor({}) : c.accessor === totalAccessor)?.format?.(total)
                                        : formatters.number(total)
                                    }
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    )
}

