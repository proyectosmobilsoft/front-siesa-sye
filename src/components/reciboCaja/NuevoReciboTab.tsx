import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { reciboCajaApi } from '@/api/reciboCaja'
import { transferenciasConfirmacionApi } from '@/api/transferenciasConfirmacion'
import { Link } from 'react-router-dom'
import { maestroCuentasBancariasApi } from '@/api/maestroCuentasBancarias'
import type { Client, ClientsResponse } from '@/api/types'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { formatters } from '@/utils/formatters'
import { buildRcNotas } from '@/utils/rcNotasBuilder'
import { FALLBACK_RC, armarPayloadRC, elegibleDescuento, parseMonto, redondear, totalesRC, type FacturaRC, type PagoRC, type ParametrosRC, type PayloadRC } from '@/utils/reciboCajaCalculos'
import { ClienteAutocomplete } from './ClienteAutocomplete'
import { FacturasTabla } from './FacturasTabla'
import { MediosPago } from './MediosPago'
import { ResumenRecibo } from './ResumenRecibo'

type MeResponse = { data?: { siesa_rowid?: number | null; siesa_nombre?: string | null }; siesa_rowid?: number | null; siesa_nombre?: string | null }
type FacturaRaw = Record<string, unknown>
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const errorMensaje = (e: unknown) => (e as { response?: { data?: { message?: string; error?: string } }; message?: string }).response?.data?.message ?? (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? (e as Error).message ?? 'Error inesperado'
const numero = (v: unknown) => Number(v) || 0
const mapFactura = (r: FacturaRaw): FacturaRC => {
  const doc = String(r.doccruce ?? '')
  const partes = doc.split('-')
  return { rowid: numero(r.rowidsa ?? r.rowid), tipo: partes[0] || String(r.tipo ?? r.idTipoDocto ?? ''), consecutivo: partes[1] || String(r.factura ?? r.consecDocto ?? ''), prefijo: String(r.prefijo ?? partes[0] ?? '').toUpperCase(), saldo: parseMonto(r.saldo), valor: 0, seleccionada: false, idCia: numero(r.f350_id_cia ?? r.idCia) || 1 }
}
const pagoVacio = (codigo: PagoRC['codigo'] = 'EFE'): PagoRC => ({ id: crypto.randomUUID(), codigo, valor: 0, cuenta: '', fechaConsignacion: hoy(), nroTarjeta: '', autorizacion: '', vencimiento: '', voucher: '' })
const section = 'p-4 sm:p-5'
const title = 'mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground'

export function NuevoReciboTab({ onCreated }: { onCreated: () => void }) {
  const queryClient = useQueryClient()
  const sesion = useAuthStore(s => s.sesion)
  const [busqueda, setBusqueda] = useState('')
  const [cliente, setCliente] = useState<Client | null>(null)
  const [facturas, setFacturas] = useState<FacturaRC[]>([])
  const [pagina, setPagina] = useState(1)
  const [masFacturas, setMasFacturas] = useState(false)
  const [cargandoFacturas, setCargandoFacturas] = useState(false)
  const [descuentos, setDescuentos] = useState<Record<number, number>>({})
  const [cargandoDescuentos, setCargandoDescuentos] = useState(false)
  const [aplicar, setAplicar] = useState(false)
  const [pagos, setPagos] = useState<PagoRC[]>(() => [pagoVacio()])
  const [editados, setEditados] = useState<Set<string>>(() => new Set())
  const [observacion, setObservacion] = useState('')
  const [co, setCo] = useState('001')
  const [caja, setCaja] = useState('40')
  const [cajaManual, setCajaManual] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)
  const descuentoVersion = useRef(0)
  const facturasVersion = useRef(0)
  const intento = useRef<{ key: string; payload: PayloadRC } | null>(null)
  const me = useQuery({ queryKey: ['auth', 'me', sesion?.id], queryFn: async () => (await apiClient.get<MeResponse>('/auth/me')).data, enabled: !!sesion, retry: false })
  const usuarioSiesa = me.data?.data ?? me.data
  const asociado = !!usuarioSiesa?.siesa_rowid && !!usuarioSiesa?.siesa_nombre?.trim()
  const clientes = useQuery({ queryKey: ['rc', 'clientes', busqueda], queryFn: async () => (await apiClient.get<ClientsResponse>('/clients', { params: { search: busqueda, page: 1, pageSize: 20 } })).data.data ?? [], enabled: busqueda.length >= 2 && asociado })
  const parametrosQuery = useQuery({ queryKey: ['rc', 'parametros'], queryFn: reciboCajaApi.getParametros, retry: false })
  const bancos = useQuery({ queryKey: ['rc', 'cuentas-bancarias'], queryFn: async () => (await maestroCuentasBancariasApi.listarConfig(true)).data })
  const parametros: ParametrosRC = useMemo(() => {
    const p = parametrosQuery.data
    return { limite: (p?.limite_ajuste_peso ?? 0) > 0 ? p!.limite_ajuste_peso : FALLBACK_RC.limite, ajusteDescuento: p?.cuentas?.cuenta_ajuste_peso_descuento?.rowid ?? FALLBACK_RC.ajusteDescuento, ajusteIngreso: p?.cuentas?.cuenta_ajuste_peso_ingreso?.rowid ?? FALLBACK_RC.ajusteIngreso, descuentoFinanciero: p?.cuentas?.cuenta_descuento_financiero?.rowid ?? FALLBACK_RC.descuentoFinanciero, anticipo: p?.cuentas?.cuenta_anticipo?.rowid ?? FALLBACK_RC.anticipo }
  }, [parametrosQuery.data])
  const neto = useMemo(() => totalesRC(facturas, descuentos, aplicar, [], parametros.limite).neto, [facturas, descuentos, aplicar, parametros.limite])
  const totales = useMemo(() => totalesRC(facturas, descuentos, aplicar, pagos, parametros.limite), [facturas, descuentos, aplicar, pagos, parametros.limite])
  const totalTransferencia = pagos.filter(p => p.codigo === 'CG1' && p.valor > 0).reduce((sum, p) => sum + p.valor, 0)
  const requiereConfirmacion = Boolean(parametrosQuery.data?.exigir_aprobacion_transferencia && cliente && totalTransferencia > 0)
  const disponibles = useQuery({ queryKey: ['transferencias-confirmacion', 'disponibles', cliente?.f9740_id], queryFn: () => transferenciasConfirmacionApi.disponibles(cliente!.f9740_id), enabled: requiereConfirmacion, retry: false })
  const disponiblesOrdenadas = useMemo(() => [...(disponibles.data ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id), [disponibles.data])
  const seleccionAuto = useMemo(() => {
    let suma = 0
    return disponiblesOrdenadas.filter(row => { if (suma >= totalTransferencia - 1) return false; suma += Number(row.valor) || 0; return true }).map(row => row.id)
  }, [disponiblesOrdenadas, totalTransferencia])
  const seleccionKey = `${cliente?.f9740_id ?? ''}:${totalTransferencia}:${disponiblesOrdenadas.map(row => `${row.id}:${row.valor}`).join(',')}`
  const [seleccionManual, setSeleccionManual] = useState<{ key: string; ids: number[] } | null>(null)
  const confirmacionesIds = seleccionManual?.key === seleccionKey ? seleccionManual.ids : seleccionAuto
  const totalConfirmado = disponiblesOrdenadas.filter(row => confirmacionesIds.includes(row.id)).reduce((sum, row) => sum + (Number(row.valor) || 0), 0)
  const seleccionadas = useMemo(() => facturas.filter(f => f.seleccionada && f.valor > 0), [facturas])
  const cambio = () => { intento.current = null; setError(''); setExito('') }
  const reset = () => {
    cambio(); facturasVersion.current++; descuentoVersion.current++
    setBusqueda(''); setCliente(null); setFacturas([]); setPagina(1); setMasFacturas(false)
    setDescuentos({}); setAplicar(false); setPagos([pagoVacio()]); setEditados(new Set())
    setObservacion(''); setCo('001'); setCaja('40'); setCajaManual(false)
    setSeleccionManual(null)
  }
  const cargarFacturas = async (id: number, page: number, acumular = false) => {
    const version = ++facturasVersion.current
    setCargandoFacturas(true); setError('')
    try {
      const res = await apiClient.get<{ data: FacturaRaw[]; pagination?: { totalPages?: number }; hasMore?: boolean }>('/factura/facturas', { params: { id_tercero: id, page, pageSize: 100 } })
      if (version !== facturasVersion.current) return
      const rows = (res.data.data ?? []).map(mapFactura).filter(f => f.rowid > 0 && f.saldo > 0)
      setFacturas(prev => acumular ? [...prev, ...rows] : rows)
      setPagina(page)
      setMasFacturas(res.data.pagination?.totalPages != null ? page < res.data.pagination.totalPages : res.data.hasMore ?? rows.length >= 100)
    } catch (e) { if (version === facturasVersion.current) setError(errorMensaje(e)) }
    finally { if (version === facturasVersion.current) setCargandoFacturas(false) }
  }
  const limpiarCliente = () => {
    cambio(); facturasVersion.current++; descuentoVersion.current++
    setCliente(null); setFacturas([]); setDescuentos({}); setAplicar(false)
    setPagos([pagoVacio()]); setEditados(new Set()); setObservacion('')
    setMasFacturas(false); setCargandoFacturas(false); setCargandoDescuentos(false)
    setCo('001'); setCaja('40'); setCajaManual(false)
    setSeleccionManual(null)
  }
  const elegirCliente = (c: Client) => {
    limpiarCliente(); setCliente(c); setObservacion(`Recaudo ${c.f9740_razon_social || c.f9740_nombre}`)
    void cargarFacturas(c.f9740_id, 1)
  }
  const actualizarFactura = (rowid: number, valor: number, seleccionada: boolean) => {
    cambio()
    setFacturas(prev => prev.map(f => f.rowid === rowid ? { ...f, valor: seleccionada ? valor : 0, seleccionada } : f))
    setDescuentos({}); setAplicar(false)
  }
  useEffect(() => {
    const version = ++descuentoVersion.current
    const elegibles = facturas.filter(f => elegibleDescuento(f))
    if (!elegibles.length) { setDescuentos({}); setAplicar(false); setCargandoDescuentos(false); return }
    setCargandoDescuentos(true)
    Promise.all(elegibles.map(async f => {
      const r = await apiClient.post<{ data?: { valor_descuento?: number | string }; valor_descuento?: number | string }>('/financiero/hallar-dsctos-sas', { p_id_cia: f.idCia, p_fecha: hoy(), p_rowid_sa: f.rowid, p_id_medio_pago: 'CG1', p_ind_tipo_tercero: 1 })
      return [f.rowid, Math.max(0, parseMonto(r.data.data?.valor_descuento ?? r.data.valor_descuento))] as const
    })).then(entries => {
      if (version !== descuentoVersion.current) return
      setDescuentos(Object.fromEntries(entries)); setAplicar(entries.some(([, n]) => n > 0))
    }).catch(e => {
      if (version === descuentoVersion.current) { setDescuentos({}); setAplicar(false); setError(`No se pudo consultar el descuento financiero: ${errorMensaje(e)}`) }
    }).finally(() => { if (version === descuentoVersion.current) setCargandoDescuentos(false) })
  }, [facturas])
  useEffect(() => {
    if (cajaManual || !seleccionadas.length) return
    const prefijos = new Set(seleccionadas.map(f => f.prefijo))
    if (prefijos.has('BQE')) { setCo('001'); setCaja('40') }
    else if (prefijos.has('FM') || prefijos.has('FCE')) { setCo('002'); setCaja('80') }
  }, [seleccionadas, cajaManual])
  const codigosPago = pagos.map(p => p.codigo).join(',')
  useEffect(() => {
    setPagos(prev => {
      const ultimo = [...prev].reverse().find(p => !editados.has(p.id))
      if (!ultimo) return prev
      const otros = prev.reduce((s, p) => s + (p.id === ultimo.id || !editados.has(p.id) ? 0 : p.valor), 0)
      const restante = redondear(Math.max(0, neto - otros))
      if (prev.every(p => editados.has(p.id) || p.valor === (p.id === ultimo.id ? restante : 0))) return prev
      return prev.map(p => editados.has(p.id) ? p : { ...p, valor: p.id === ultimo.id ? restante : 0 })
    })
  }, [neto, editados])
  useEffect(() => {
    if (bancos.data?.length !== 1) return
    const cuenta = bancos.data[0].f026_id
    setPagos(prev => prev.map(p => p.codigo === 'CG1' && !p.cuenta ? { ...p, cuenta } : p))
  }, [bancos.data, codigosPago])
  const cambiarPago = (id: string, patch: Partial<PagoRC>, valorManual = false) => {
    cambio()
    if (valorManual) setEditados(prev => new Set(prev).add(id))
    if (patch.codigo === 'CG1' && bancos.data?.length === 1) patch = { ...patch, cuenta: bancos.data[0].f026_id }
    setPagos(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }
  const agregarPago = () => { cambio(); setPagos(prev => [...prev, pagoVacio()]) }
  const quitarPago = (id: string) => { cambio(); setPagos(prev => prev.filter(p => p.id !== id)); setEditados(prev => { const next = new Set(prev); next.delete(id); return next }) }
  const facturasValidas = seleccionadas.length > 0 && seleccionadas.every(f => Number.isFinite(f.valor) && f.valor > 0 && f.valor <= f.saldo)
  const pagosValidos = pagos.length > 0 && pagos.every(p => Number.isFinite(p.valor) && p.valor > 0 && (p.codigo !== 'CG1' || !!p.cuenta && !!p.fechaConsignacion) && (p.codigo !== 'TC' && p.codigo !== 'TD' || /^\d{4}$/.test(p.nroTarjeta.trim()) && p.autorizacion.trim().length >= 6 && !!p.vencimiento))
  const faltantes = [!cliente && 'Cliente', !facturasValidas && 'Al menos 1 factura', !pagosValidos && 'Pagos válidos', !observacion.trim() && 'Observación', cargandoDescuentos && 'Esperando descuento financiero', totales.clasificacion.tipo === 'faltanteExcesivo' && `Faltante supera el límite de ${formatters.currency(parametros.limite)}`, requiereConfirmacion && (disponibles.isLoading || disponibles.isFetching || disponibles.isError || totalConfirmado < totalTransferencia - 1) && 'Transferencia sin confirmación aprobada'].filter((v): v is string => !!v)
  const notasPreview = useMemo(() => {
    if (!observacion.trim()) return ''
    try {
      if (cliente && facturasValidas && pagosValidos && totales.clasificacion.tipo !== 'faltanteExcesivo') {
        return armarPayloadRC({ clienteId: cliente.f9740_id, facturas, descuentos, aplicar, pagos, parametros, observacion, usuario: sesion?.usuario ?? '?', co, caja, consecutivo: 1, ahora: new Date() }).p_notas
      }
      return buildRcNotas({ observacion, facturas: [], mediosPago: [], ajusteTipo: 'none', ajusteMonto: 0, usuario: sesion?.usuario ?? '?', fechaHora: new Date() })
    } catch (e) { return errorMensaje(e) }
  }, [cliente, facturas, descuentos, aplicar, pagos, parametros, observacion, sesion?.usuario, co, caja, facturasValidas, pagosValidos, totales.clasificacion.tipo])
  const guardar = async () => {
    if (faltantes.length) { setError(`Completa: ${faltantes.join(', ')}`); return }
    if (!cliente || !asociado || guardando) return
    setGuardando(true); setError('')
    try {
      if (!intento.current) {
        const res = await apiClient.get<{ proximoConsecutivo?: { f022_cons_proximo?: number }; data?: { f022_cons_proximo?: number }; f022_cons_proximo?: number }>('/recibo-caja/proximo-consecutivo', { params: { id_cia: 1, id_tipo_docto: 'RC', id_co: co, p_bloquear: 0, p_leer_mandato_tipo: 0 } })
        const consecutivo = numero(res.data.proximoConsecutivo?.f022_cons_proximo ?? res.data.data?.f022_cons_proximo ?? res.data.f022_cons_proximo)
        if (!consecutivo) throw new Error('No se recibió un consecutivo válido')
        const payload = armarPayloadRC({ clienteId: cliente.f9740_id, facturas, descuentos, aplicar, pagos, parametros, observacion, usuario: sesion?.usuario ?? '?', co, caja, consecutivo, ahora: new Date() })
        if (requiereConfirmacion) payload.p_confirmaciones_transferencia = confirmacionesIds
        intento.current = { key: crypto.randomUUID(), payload }
      }
      const actual = intento.current
      const res = await apiClient.post<{ success?: boolean; data?: Record<string, unknown>; message?: string }>('/recibo-caja/procesar', actual.payload, { headers: { 'Idempotency-Key': actual.key } })
      if (res.data.success === false) throw new Error(res.data.message || 'No se pudo crear el recibo')
      const numeroRc = String(res.data.data?.numero_docto ?? res.data.data?.p_numero_docto ?? actual.payload.p_numero_docto)
      reset(); setExito(`RC ${numeroRc} creado`)
      void queryClient.invalidateQueries({ queryKey: ['recibo-caja'] })
      void queryClient.invalidateQueries({ queryKey: ['rc'] })
      void queryClient.invalidateQueries({ queryKey: ['transferencias-confirmacion'] })
      onCreated()
    } catch (e) { setError(errorMensaje(e)) } finally { setGuardando(false) }
  }
  if (me.isLoading) return <p className="p-6 text-sm text-muted-foreground">Consultando usuario SIESA…</p>
  if (me.isError) return <div className="p-6 text-sm text-red-600 dark:text-red-400">No se pudo verificar la asociación SIESA: {errorMensaje(me.error)} <Button variant="outline" onClick={() => void me.refetch()}>Reintentar</Button></div>
  if (!asociado) return <p className="m-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-700 dark:text-amber-400">Tu usuario no está asociado a un usuario de SIESA; pide al administrador que lo asocie en Maestro de usuarios.</p>
  return <div className="p-4 pb-28 sm:p-6 lg:pb-6">
    <div className="mb-5">
      <h1 className="text-xl font-bold">Nuevo recibo de caja</h1>
      <p className="text-sm text-muted-foreground">Completa los datos en una sola vista.</p>
    </div>
    {exito && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
      <span>{exito}</span><Button variant="outline" onClick={reset}>Nuevo recibo</Button>
    </div>}
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">
        <Card className={`${section} rounded-2xl`}>
          <h2 className={title}>01 · Encabezado</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            Quedará a nombre de <Badge variant="secondary" className="max-w-full truncate">{usuarioSiesa?.siesa_nombre}</Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-muted-foreground">C.O.
              <Select value={co} onChange={e => { cambio(); setCo(e.target.value); setCajaManual(true) }}>
                <option value="001">001 · Principal</option><option value="002">002 · Almateriales</option>
              </Select>
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">Caja
              <Select value={caja} onChange={e => { cambio(); setCaja(e.target.value); setCajaManual(true) }}>
                <option value="40">40 · Vía 40</option><option value="80">80 · Ferretería</option>
              </Select>
            </label>
          </div>
        </Card>
        <Card className={`${section} rounded-2xl`}>
          <h2 className={title}>02 · Cliente</h2>
          <ClienteAutocomplete cliente={cliente} resultados={clientes.data ?? []} termino={busqueda} buscando={clientes.isFetching}
            error={clientes.isError ? errorMensaje(clientes.error) : undefined}
            onSearch={setBusqueda} onSelect={elegirCliente} onChange={limpiarCliente} />
        </Card>
        <Card className={`${section} rounded-2xl ${!cliente ? 'opacity-60' : ''}`}>
          <h2 className={title}>03 · Facturas</h2>
          {!cliente ? <p className="text-sm text-muted-foreground">Elige un cliente para cargar sus facturas.</p> :
            <FacturasTabla facturas={facturas} descuentos={descuentos} aplicar={aplicar} cargando={cargandoFacturas} mas={masFacturas}
              onChange={actualizarFactura}
              onAll={() => { cambio(); setFacturas(prev => prev.map(f => ({ ...f, seleccionada: true, valor: f.saldo }))) }}
              onClear={() => { cambio(); setFacturas(prev => prev.map(f => ({ ...f, seleccionada: false, valor: 0 }))) }}
              onMore={() => void cargarFacturas(cliente.f9740_id, pagina + 1, true)} />}
        </Card>
        <Card className={`${section} rounded-2xl ${!cliente ? 'opacity-60' : ''}`}>
          <h2 className={title}>04 · Descuento financiero</h2>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Aplicar descuento financiero <strong className="ml-1 tabular-nums">{formatters.currency(Object.values(descuentos).reduce((s, n) => s + n, 0))}</strong></span>
            <input type="checkbox" role="switch" checked={aplicar}
              disabled={!cliente || cargandoDescuentos || !Object.values(descuentos).some(n => n > 0)}
              onChange={e => { cambio(); setAplicar(e.target.checked) }} className="relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-muted ring-1 ring-border transition-colors checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-background after:shadow-sm after:transition-transform after:content-[''] checked:after:translate-x-5" />
          </label>
          {cargandoDescuentos && <p className="mt-2 text-xs text-muted-foreground">◌ Consultando descuento SAS…</p>}
          <p className="mt-3 text-xs text-muted-foreground">Solo aplica a facturas pagadas completas y a tiempo. Ajuste al peso hasta {formatters.currency(parametros.limite)}.</p>
        </Card>
        <Card className={`${section} rounded-2xl ${!cliente ? 'opacity-60' : ''}`}>
          <h2 className={title}>05 · Pago</h2>
          {!cliente ? <p className="text-sm text-muted-foreground">Elige un cliente para registrar el pago.</p> :
            <MediosPago pagos={pagos} editados={editados} cuentas={bancos.data ?? []}
              onChange={cambiarPago} onAdd={agregarPago} onRemove={quitarPago} />}
          {requiereConfirmacion && <div className="mt-4 rounded-xl border border-border p-3">
            <h3 className="text-sm font-semibold">Transferencias aprobadas del cliente</h3>
            {disponibles.isFetching && <p className="mt-2 text-xs text-muted-foreground">Consultando confirmaciones…</p>}
            {disponibles.isError && <p className="mt-2 text-xs text-destructive">No se pudieron consultar las confirmaciones.</p>}
            {!disponibles.isFetching && !disponibles.isError && disponiblesOrdenadas.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No hay transferencias aprobadas. <Link className="text-primary underline" to="/tesoreria/confirmacion-transferencias">Ir a confirmación de transferencias</Link></p>}
            <div className="mt-2 space-y-2">{disponiblesOrdenadas.map(row => <label key={row.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-2 text-sm">
              <input type="checkbox" className="mt-1" checked={confirmacionesIds.includes(row.id)} onChange={() => { cambio(); setSeleccionManual({ key: seleccionKey, ids: confirmacionesIds.includes(row.id) ? confirmacionesIds.filter(id => id !== row.id) : [...confirmacionesIds, row.id] }) }} />
              <span className="min-w-0 flex-1">{formatters.dateOnly(row.fecha_transferencia)} · {row.id_cta_bancaria} · {row.referencia || 'Sin referencia'}<span className="block text-xs text-muted-foreground">Aprobó {row.revisado_by_usuario || '—'}</span></span>
              <span className="text-right font-semibold tabular-nums">{formatters.currency(Number(row.valor) || 0)}</span>
            </label>)}</div>
            <p className={`mt-3 text-right text-sm tabular-nums ${totalConfirmado < totalTransferencia - 1 ? 'text-destructive' : 'text-foreground'}`}>Seleccionado {formatters.currency(totalConfirmado)} / Transferencia {formatters.currency(totalTransferencia)}</p>
          </div>}
        </Card>
        <Card className={`${section} rounded-2xl ${!cliente ? 'opacity-60' : ''}`}>
          <h2 className={title}>06 · Observación</h2>
          {!cliente ? <p className="text-sm text-muted-foreground">Elige un cliente para completar la observación.</p> : <>
            <textarea value={observacion} onChange={e => { cambio(); setObservacion(e.target.value) }} rows={3}
              className="w-full rounded-md border border-input bg-background p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Motivo del recaudo" />
            <p className="mt-1 text-right text-xs text-muted-foreground">{observacion.length} caracteres</p>
            <div className="mt-3 rounded-lg bg-muted/50 p-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Vista previa de notas · {notasPreview.length}/255</p>
              <p className="break-words text-xs text-muted-foreground">{notasPreview || 'La vista previa aparecerá aquí.'}</p>
            </div>
          </>}
        </Card>
      </div>
      <ResumenRecibo totales={totales} faltantes={faltantes} guardando={guardando} onSave={() => void guardar()} />
    </div>
  </div>
}
