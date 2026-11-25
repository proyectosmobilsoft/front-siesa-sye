import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, ExternalLink, FileText, Image as ImagenIcono, Loader2, RefreshCw, Send, ThumbsUp, X } from 'lucide-react'
import { anticiposOperativosApi } from '@/api/anticiposOperativos'
import type { Legalizacion } from '@/api/types'
import { API_ORIGIN } from '@/config/api'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { usePermiso } from '@/hooks/usePermiso'
import { cn } from '@/lib/utils'
import { aviso } from '@/store/avisosStore'
import { formatters } from '@/utils/formatters'

// Legalizaciones de gastos de los conductores (lo mismo que se hace en la app):
//   POR APROBAR --(revisa: visto bueno, p. ej. Cristian)--> REVISADO --(aprueba: director, p. ej. Ricardo)--> APROBADO
//   Al aprobar se genera el PLC en SIESA (ENVIADO_CONTABILIDAD). Si SIESA falla queda APROBADO y se reintenta el envío.

const FILTROS = [
    ['POR APROBAR', 'Por revisar'],
    ['REVISADO', 'Por aprobar'],
    ['APROBADO', 'Aprobadas'],
    ['ENVIADO_CONTABILIDAD', 'En SIESA'],
    ['RECHAZADO', 'Rechazadas'],
] as const

const COLOR: Record<string, string> = {
    'POR APROBAR': 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    REVISADO: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    APROBADO: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    ENVIADO_CONTABILIDAD: 'bg-primary/10 text-primary',
    RECHAZADO: 'bg-red-500/10 text-red-700 dark:text-red-400',
}
const ETIQUETA: Record<string, string> = {
    'POR APROBAR': 'Por revisar', REVISADO: 'Por aprobar', APROBADO: 'Aprobada', ENVIADO_CONTABILIDAD: 'En SIESA', RECHAZADO: 'Rechazada',
}

export const LegalizacionesTab = () => {
    const { puede, P } = usePermiso()
    const queryClient = useQueryClient()
    const [filtro, setFiltro] = useState<string>('POR APROBAR')
    // Se guarda solo el id: el modal lee siempre la fila actual de la lista (no una copia vieja del clic).
    const [abiertaId, setAbiertaId] = useState<number | null>(null)
    const [foto, setFoto] = useState<string | null>(null)

    const lista = useQuery({
        queryKey: ['anticipos-operativos', 'legalizaciones'],
        queryFn: () => anticiposOperativosApi.legalizaciones(),
        staleTime: 15 * 1000,
        refetchOnMount: 'always',
    })
    const abierta: Legalizacion | null = useMemo(() => (lista.data ?? []).find((l) => l.id === abiertaId) ?? null, [lista.data, abiertaId])
    const setAbierta = (l: Legalizacion | null) => setAbiertaId(l ? l.id : null)
    const gastos = useQuery({
        queryKey: ['anticipos-operativos', 'legalizaciones', abiertaId, 'gastos'],
        queryFn: () => anticiposOperativosApi.legalizacionGastos(abiertaId!),
        enabled: abiertaId !== null,
        staleTime: 0,
        refetchOnMount: 'always',
    })

    const conteo = useMemo(() => {
        const c: Record<string, number> = {}
        for (const l of lista.data ?? []) c[l.estado] = (c[l.estado] ?? 0) + 1
        return c
    }, [lista.data])
    const visibles = useMemo(() => (lista.data ?? []).filter((l) => l.estado === filtro), [lista.data, filtro])

    const accion = useMutation({
        mutationFn: ({ id, a, motivo }: { id: number; a: 'revisar' | 'aprobar' | 'rechazar' | 'enviar-contabilidad'; motivo?: string }) =>
            anticiposOperativosApi.legalizacionAccion(id, a, { motivo }),
        onSuccess: (r, v) => {
            if (r.envio_error) aviso.error(`Quedó aprobada, pero SIESA no recibió el PLC: ${r.envio_error}`, 'Falta enviar a contabilidad')
            else if (r.envio) aviso.exito(`PLC ${r.envio.docto} creado en SIESA por ${formatters.currency(r.envio.total)}`)
            else aviso.exito(v.a === 'revisar' ? 'Visto bueno dado' : v.a === 'rechazar' ? 'Legalización rechazada' : 'Hecho')
            queryClient.invalidateQueries({ queryKey: ['anticipos-operativos'] })
            setAbierta(null)
        },
        onError: (e: unknown) => {
            const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
            aviso.error(m || 'No se pudo completar la acción')
        },
    })

    const fotoUrl = (ruta: string) => `${API_ORIGIN}/${ruta.replace(/^\//, '')}`

    const botones = (l: Legalizacion) => {
        const ocupado = accion.isPending
        const b: React.ReactNode[] = []
        if (l.estado === 'POR APROBAR' && puede(P.REVISAR_LEGALIZACION))
            b.push(<Button key="rev" disabled={ocupado} onClick={() => accion.mutate({ id: l.id, a: 'revisar' })}><Check className="mr-1.5 h-4 w-4" />Dar visto bueno</Button>)
        if (l.estado === 'REVISADO' && puede(P.APROBAR_LEGALIZACION))
            b.push(<Button key="apr" disabled={ocupado} onClick={() => accion.mutate({ id: l.id, a: 'aprobar' })}><ThumbsUp className="mr-1.5 h-4 w-4" />Aprobar y enviar a SIESA</Button>)
        if (l.estado === 'APROBADO' && (puede(P.ENVIAR_CONTABILIDAD) || puede(P.APROBAR_LEGALIZACION)))
            b.push(<Button key="env" disabled={ocupado} onClick={() => accion.mutate({ id: l.id, a: 'enviar-contabilidad' })}><Send className="mr-1.5 h-4 w-4" />Enviar a SIESA</Button>)
        if ((l.estado === 'POR APROBAR' || l.estado === 'REVISADO') && (puede(P.REVISAR_LEGALIZACION) || puede(P.APROBAR_LEGALIZACION))) {
            b.push(
                <Button key="rec" variant="outline" disabled={ocupado} onClick={() => {
                    const motivo = window.prompt('Motivo del rechazo (opcional)') // eslint-disable-line no-alert
                    if (motivo !== null) accion.mutate({ id: l.id, a: 'rechazar', motivo: motivo || undefined })
                }}><X className="mr-1.5 h-4 w-4" />Rechazar</Button>
            )
        }
        return b
    }

    return (
        <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1 nu-seg">
                    {FILTROS.map(([id, etiqueta]) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setFiltro(id)}
                            className={cn(
                                'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all',
                                filtro === id ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                            )}
                        >
                            {etiqueta}
                            <span className="rounded-full bg-muted px-1.5 font-mono text-[10px]">{conteo[id] ?? 0}</span>
                        </button>
                    ))}
                </div>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => lista.refetch()} disabled={lista.isFetching}>
                    <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', lista.isFetching && 'animate-spin')} />Actualizar
                </Button>
            </div>

            <div className="nu-card overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-border bg-muted">
                            {['Egreso', 'Conductor', 'Placa', 'Dispersado', 'Gastos', 'Estado', 'PLC SIESA', ''].map((h, i) => (
                                <th key={h || i} className={cn('whitespace-nowrap px-4 py-3 text-[10px] nu-th', ['Dispersado', 'Gastos'].includes(h) ? 'text-right' : 'text-left')}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {lista.isLoading ? (
                            <tr><td colSpan={8} className="py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
                        ) : lista.isError ? (
                            <tr><td colSpan={8} className="py-14 text-center text-sm text-red-600"><AlertCircle className="mr-1 inline h-4 w-4" />No se pudieron cargar las legalizaciones</td></tr>
                        ) : visibles.length === 0 ? (
                            <tr><td colSpan={8} className="py-14 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Sin legalizaciones en este estado</td></tr>
                        ) : (
                            visibles.map((l) => (
                                <tr key={l.id} onClick={() => setAbierta(l)} className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30">
                                    <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-primary">{l.numero_anticipo ?? `#${l.anticipo_id}`}</td>
                                    <td className="px-4 py-3 font-medium text-foreground">{l.conductor}</td>
                                    <td className="whitespace-nowrap px-4 py-3 font-mono">{l.placa ?? '—'}</td>
                                    <td className="px-4 py-3 text-right font-mono">{formatters.currency(l.valor)}</td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {formatters.currency(l.total_gastos)}
                                        <span className="ml-1 text-[10px] text-muted-foreground">({l.n_gastos})</span>
                                    </td>
                                    <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold', COLOR[l.estado])}>{ETIQUETA[l.estado] ?? l.estado}</span></td>
                                    <td className="whitespace-nowrap px-4 py-3 font-mono font-bold">{l.plc_legalizacion ?? '—'}</td>
                                    <td className="px-4 py-3 text-right text-muted-foreground"><ExternalLink className="h-3.5 w-3.5" /></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={!!abierta}
                onClose={() => setAbierta(null)}
                title={abierta ? `Legalización ${abierta.numero_anticipo ?? ''} · ${abierta.conductor}` : ''}
                subtitle={abierta ? `${abierta.placa ?? 'Sin placa'} · dispersado ${formatters.currency(abierta.valor)}` : ''}
                className="max-w-3xl"
            >
                {abierta && (
                    <div className="space-y-4">
                        {abierta.estado === 'APROBADO' && (
                            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>Está aprobada pero todavía no se creó el PLC en SIESA. Usa «Enviar a SIESA». Si falla, revisa que la placa tenga cuenta contable y que el conductor tenga tercero.</span>
                            </div>
                        )}
                        {!abierta.cuenta_contable && (
                            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>La placa {abierta.placa ?? ''} no tiene cuenta contable configurada en la interfaz contable de vehículos; sin eso no se puede enviar a SIESA.</span>
                            </div>
                        )}
                        <div className="overflow-hidden rounded-lg border border-border">
                            <table className="w-full text-xs">
                                <thead><tr className="bg-muted"><th className="px-3 py-2 text-left nu-th">Concepto</th><th className="px-3 py-2 text-left nu-th">Fecha</th><th className="px-3 py-2 text-right nu-th">Valor</th><th className="px-3 py-2 text-center nu-th">Soporte</th></tr></thead>
                                <tbody>
                                    {gastos.isLoading ? (
                                        <tr><td colSpan={4} className="py-8 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
                                    ) : (gastos.data ?? []).length === 0 ? (
                                        <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">El conductor no registró gastos</td></tr>
                                    ) : (
                                        gastos.data!.map((g) => (
                                            <tr key={g.id} className="border-t border-border/40">
                                                <td className="px-3 py-2">{g.concepto || '—'}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatters.dateOnly(g.created_at)}</td>
                                                <td className="px-3 py-2 text-right font-mono">{formatters.currency(g.valor)}</td>
                                                <td className="px-3 py-2 text-center">
                                                    {g.ruta_foto ? <button type="button" onClick={() => setFoto(fotoUrl(g.ruta_foto!))} className="text-primary hover:underline"><ImagenIcono className="inline h-4 w-4" /></button> : '—'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                                <span>Total gastos: <b className="font-mono text-foreground">{formatters.currency(abierta.total_gastos)}</b></span>
                                <span>Saldo: <b className={cn('font-mono', abierta.valor - abierta.total_gastos < 0 ? 'text-red-600' : 'text-foreground')}>{formatters.currency(abierta.valor - abierta.total_gastos)}</b></span>
                                {abierta.plc_traslado && <span><FileText className="mr-1 inline h-3.5 w-3.5" />Traslado {abierta.plc_traslado}</span>}
                                {abierta.plc_legalizacion && <span><FileText className="mr-1 inline h-3.5 w-3.5" />PLC {abierta.plc_legalizacion}</span>}
                            </div>
                            <div className="flex flex-wrap gap-2">{botones(abierta)}</div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!foto} onClose={() => setFoto(null)} title="Soporte del gasto" className="max-w-3xl">
                {foto && <img src={foto} alt="Soporte" className="mx-auto max-h-[70vh] rounded-lg object-contain" />}
            </Modal>
        </div>
    )
}
