import { motion } from 'framer-motion'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { ArrowRight, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { useFacturas } from '@/hooks/useFacturas'
import { Factura } from '@/api/types'
import { formatters } from '@/utils/formatters'
import { useNavigate } from 'react-router-dom'

export const RecentInvoicesTable = () => {
    // Definir un periodo reciente por defecto
    const { data: facturas, isLoading, error } = useFacturas({
        periodoInicial: 202401,
        periodoFinal: 202412,
        pageSize: 10
    })
    
    const navigate = useNavigate()

    const columns: ColumnDef<Factura>[] = [
        {
            accessorKey: 'Número de factura',
            header: 'Factura',
            cell: ({ row }) => <span className="font-mono font-bold text-slate-700">{row.getValue('Número de factura') || 'N/A'}</span>,
        },
        {
            accessorKey: 'Razón social cliente',
            header: 'Cliente',
            cell: ({ row }) => <div className="max-w-[200px] truncate">{row.getValue('Razón social cliente') || 'N/A'}</div>,
        },
        {
            accessorKey: 'Fecha factura',
            header: 'Fecha',
            cell: ({ row }) => formatters.date(row.getValue('Fecha factura')),
        },
        {
            accessorKey: 'Valor total factura',
            header: 'Monto',
            cell: ({ row }) => {
                const val = row.getValue('Valor total factura') as number
                return <span className="font-semibold text-emerald-600">{formatters.currency(val)}</span>
            },
        }
    ]

    const table = useReactTable({
        data: facturas?.slice(0, 5) || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    if (isLoading) return <Skeleton className="h-[300px] w-full" />

    return (
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                        <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Facturación Reciente</CardTitle>
                        <p className="text-xs text-muted-foreground">Últimos documentos emitidos</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/ventas-resumen')}>
                    Ver todas <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase text-muted-foreground border-b border-slate-200">
                            {table.getHeaderGroups().map(hg => (
                                <tr key={hg.id}>
                                    {hg.headers.map(h => (
                                        <th key={h.id} className="px-4 py-3 font-bold">{flexRender(h.column.columnDef.header, h.getContext())}</th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
