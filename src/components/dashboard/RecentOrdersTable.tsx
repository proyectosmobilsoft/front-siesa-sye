import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { ArrowRight, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/lib/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { usePedidos } from '@/hooks/usePedidos'
import { Pedido } from '@/api/types'
import { formatters } from '@/utils/formatters'
import { useNavigate } from 'react-router-dom'

export const RecentOrdersTable = () => {
    const today = new Date().toISOString().split('T')[0]
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const { data: pedidos, isLoading, error } = usePedidos({
        fechaInicial: lastWeek,
        fechaFinal: today
    })
    
    const navigate = useNavigate()

    const columns: ColumnDef<Pedido>[] = [
        {
            accessorKey: 'f_nrodocto',
            header: 'Nro Pedido',
            cell: ({ row }) => <span className="font-mono font-bold">{row.getValue('f_nrodocto')}</span>,
        },
        {
            accessorKey: 'f_cliente_desp_razon_soc',
            header: 'Cliente',
            cell: ({ row }) => <div className="max-w-[180px] truncate">{row.getValue('f_cliente_desp_razon_soc')}</div>,
        },
        {
            accessorKey: 'f_fecha',
            header: 'Fecha',
            cell: ({ row }) => formatters.date(row.getValue('f_fecha')),
        },
        {
            accessorKey: 'f_valor_bruto_docto',
            header: 'Total',
            cell: ({ row }) => <span className="font-semibold text-primary">{formatters.currency(row.getValue('f_valor_bruto_docto'))}</span>,
        },
        {
            accessorKey: 'f_estado',
            header: 'Estado',
            cell: ({ row }) => {
                const estado = row.getValue('f_estado') as string
                return (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                        {estado}
                    </span>
                )
            }
        }
    ]

    const table = useReactTable({
        data: pedidos?.slice(0, 5) || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    if (isLoading) return <Skeleton className="h-[300px] w-full" />

    return (
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Pedidos Recientes</CardTitle>
                        <p className="text-xs text-muted-foreground">Últimas órdenes registradas</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/pedidos')}>
                    Ver todos <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase text-muted-foreground border-b border-primary/10">
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
                                <tr key={row.id} className="border-b border-primary/5 hover:bg-primary/5 transition-colors">
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
