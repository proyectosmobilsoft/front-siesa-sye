import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { reciboCajaApi } from '@/api/reciboCaja'
import { maestroCuentasBancariasApi } from '@/api/maestroCuentasBancarias'
import type { Client, ClientsResponse } from '@/api/types'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FechaInput, } from '@/components/ui/fecha-input'
import { formatters } from '@/utils/formatters'
import { FALLBACK_RC, armarPayloadRC, elegibleDescuento, parseMonto, totalesRC, type FacturaRC, type PagoRC, type ParametrosRC, type PayloadRC } from '@/utils/reciboCajaCalculos'

type MeResponse = { data?: { siesa_rowid?: number | null; siesa_nombre?: string | null }; siesa_rowid?: number | null; siesa_nombre?: string | null }
type FacturaRaw = Record<string, unknown>
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(n)
const errorMensaje = (e: unknown) => (e as { response?: { data?: { message?: string; error?: string } }; message?: string }).response?.data?.message ?? (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? (e as Error).message ?? 'Error inesperado'
const numero = (v: unknown) => Number(v) || 0
const mapFactura = (r: FacturaRaw): FacturaRC => {
  const doc = String(r.doccruce ?? '')
  const partes = doc.split('-')
  return { rowid: numero(r.rowidsa ?? r.rowid), tipo: partes[0] || String(r.tipo ?? r.idTipoDocto ?? ''), consecutivo: partes[1] || String(r.factura ?? r.consecDocto ?? ''), prefijo: String(r.prefijo ?? partes[0] ?? '').toUpperCase(), saldo: parseMonto(r.saldo), valor: 0, seleccionada: false, idCia: numero(r.f350_id_cia ?? r.idCia) || 1 }
}
const pagoVacio = (codigo: PagoRC['codigo'] = 'EFE'): PagoRC => ({ id: crypto.randomUUID(), codigo, valor: 0, cuenta: '', fechaConsignacion: hoy(), nroTarjeta: '', autorizacion: '', vencimiento: '', voucher: '' })
function MontoAlineado({ value }: { value: number }) { return <span className="inline-grid grid-cols-[0.75rem_10ch] justify-start gap-1 tabular-nums"><span>$</span><span className="text-right">{formatters.currency(value).replace(/^\$\s*/, '')}</span></span> }
const field = 'space-y-1.5 text-xs font-medium text-muted-foreground'
const card = 'rounded-2xl border border-border/70 bg-card p-4 shadow-xs'

export function NuevoReciboTab({ onCreated }: { onCreated: () => void }) {
  const queryClient = useQueryClient()
  const sesion = useAuthStore(s => s.sesion)
  const [paso, setPaso] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [cliente, setCliente] = useState<Client | null>(null)
  const [facturas, setFacturas] = useState<FacturaRC[]>([])
  const [pagina, setPagina] = useState(1)
  const [masFacturas, setMasFacturas] = useState(false)
  const [cargandoFacturas, setCargandoFacturas] = useState(false)
  const [descuentos, setDescuentos] = useState<Record<number, number>>({})
  const [cargandoDescuentos, setCargandoDescuentos] = useState(false)
  const [aplicar, setAplicar] = useState(false)
  const [pagos, setPagos] = useState<PagoRC[]>([])
  const [observacion, setObservacion] = useState('')
  const [co, setCo] = useState('001')
  const [caja, setCaja] = useState('40')
  const [cajaManual, setCajaManual] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)
  const descuentoVersion = useRef(0)
  const intento = useRef<{ key: string; payload: PayloadRC } | null>(null)
  const me = useQuery({ queryKey: ['auth', 'me', sesion?.id], queryFn: async () => (await apiClient.get<MeResponse>('/auth/me')).data, enabled: !!sesion, retry: false })
  const usuarioSiesa = me.data?.data ?? me.data
  const asociado = !!usuarioSiesa?.siesa_rowid && !!usuarioSiesa?.siesa_nombre?.trim()
  const clientes = useQuery({ queryKey: ['rc', 'clientes', busqueda], queryFn: async () => (await apiClient.get<ClientsResponse>('/clients', { params: { search: busqueda, page: 1, pageSize: 20 } })).data.data ?? [], enabled: busqueda.length >= 2 && asociado })
  const parametrosQuery = useQuery({ queryKey: ['rc', 'parametros'], queryFn: reciboCajaApi.getParametros, retry: false })
  const bancos = useQuery({ queryKey: ['rc', 'cuentas-bancarias'], queryFn: async () => (await maestroCuentasBancariasApi.listarConfig(true)).data })
  const parametros: ParametrosRC = useMemo(() => { const p = parametrosQuery.data; return { limite: (p?.limite_ajuste_peso ?? 0) > 0 ? p!.limite_ajuste_peso : FALLBACK_RC.limite, ajusteDescuento: p?.cuentas?.cuenta_ajuste_peso_descuento?.rowid ?? FALLBACK_RC.ajusteDescuento, ajusteIngreso: p?.cuentas?.cuenta_ajuste_peso_ingreso?.rowid ?? FALLBACK_RC.ajusteIngreso, descuentoFinanciero: p?.cuentas?.cuenta_descuento_financiero?.rowid ?? FALLBACK_RC.descuentoFinanciero, anticipo: p?.cuentas?.cuenta_anticipo?.rowid ?? FALLBACK_RC.anticipo } }, [parametrosQuery.data])
  const totales = useMemo(() => totalesRC(facturas, descuentos, aplicar, pagos, parametros.limite), [facturas, descuentos, aplicar, pagos, parametros.limite])
  const seleccionadas = facturas.filter(f => f.seleccionada && f.valor > 0)
  const cambio = () => { intento.current = null; setError(''); setExito('') }
  const reset = () => { cambio(); setPaso(0); setBuscar(''); setBusqueda(''); setCliente(null); setFacturas([]); setPagina(1); setMasFacturas(false); setDescuentos({}); setAplicar(false); setPagos([]); setObservacion(''); setCo('001'); setCaja('40'); setCajaManual(false) }
  const cargarFacturas = async (id: number, page: number, acumular = false) => {
    setCargandoFacturas(true); setError('')
    try {
      const res = await apiClient.get<{ data: FacturaRaw[]; pagination?: { totalPages?: number }; hasMore?: boolean }>('/factura/facturas', { params: { id_tercero: id, page, pageSize: 100 } })
      const rows = (res.data.data ?? []).map(mapFactura).filter(f => f.rowid > 0 && f.saldo > 0)
      setFacturas(prev => acumular ? [...prev, ...rows] : rows)
      setPagina(page)
      setMasFacturas(res.data.pagination?.totalPages != null ? page < res.data.pagination.totalPages : res.data.hasMore ?? rows.length >= 100)
    } catch (e) { setError(errorMensaje(e)) } finally { setCargandoFacturas(false) }
  }
  const elegirCliente = (c: Client) => { cambio(); descuentoVersion.current++; setCliente(c); setFacturas([]); setDescuentos({}); setAplicar(false); setPagos([]); setCajaManual(false); setPaso(1); void cargarFacturas(c.f9740_id, 1) }
  const actualizarFactura = (rowid: number, valor: number, seleccionada: boolean) => { cambio(); setFacturas(prev => prev.map(f => f.rowid === rowid ? { ...f, valor: seleccionada ? valor : 0, seleccionada } : f)); setDescuentos({}); setAplicar(false) }
  useEffect(() => {
    const version = ++descuentoVersion.current
    const elegibles = facturas.filter(f => elegibleDescuento(f))
    if (!elegibles.length) { setDescuentos({}); setAplicar(false); setCargandoDescuentos(false); return }
    setCargandoDescuentos(true)
    Promise.all(elegibles.map(async f => { const r = await apiClient.post<{ data?: { valor_descuento?: number | string }; valor_descuento?: number | string }>('/financiero/hallar-dsctos-sas', { p_id_cia: f.idCia, p_fecha: hoy(), p_rowid_sa: f.rowid, p_id_medio_pago: 'CG1', p_ind_tipo_tercero: 1 }); return [f.rowid, Math.max(0, parseMonto(r.data.data?.valor_descuento ?? r.data.valor_descuento))] as const })).then(entries => { if (version !== descuentoVersion.current) return; const result = Object.fromEntries(entries); setDescuentos(result); setAplicar(entries.some(([, n]) => n > 0)) }).catch(e => { if (version === descuentoVersion.current) { setDescuentos({}); setAplicar(false); setError(`No se pudo consultar el descuento financiero: ${errorMensaje(e)}`) } }).finally(() => { if (version === descuentoVersion.current) setCargandoDescuentos(false) })
  }, [facturas])
  useEffect(() => { if (cajaManual || !seleccionadas.length) return; const prefijos = new Set(seleccionadas.map(f => f.prefijo)); if (prefijos.has('BQE')) { setCo('001'); setCaja('40') } else if (prefijos.has('FM') || prefijos.has('FCE')) { setCo('002'); setCaja('80') } }, [facturas, cajaManual])
  const cambiarPago = (id: string, patch: Partial<PagoRC>) => { cambio(); setPagos(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p)) }
  const validarPago = () => { if (!pagos.length || pagos.some(p => !Number.isFinite(p.valor) || p.valor <= 0)) return 'Agrega al menos un medio de pago con valor mayor que cero'; if (pagos.some(p => p.codigo === 'CG1' && (!p.cuenta || !p.fechaConsignacion))) return 'Selecciona cuenta y fecha de consignación'; if (pagos.some(p => (p.codigo === 'TC' || p.codigo === 'TD') && (!/^\d{4}$/.test(p.nroTarjeta.trim()) || p.autorizacion.trim().length < 6 || !p.vencimiento))) return 'Completa número, autorización y vencimiento de cada tarjeta'; if (!observacion.trim()) return 'La observación es obligatoria'; if (totales.clasificacion.tipo === 'faltanteExcesivo') return `El faltante supera el límite de ${cop(parametros.limite)}`; if (cargandoDescuentos) return 'Espera el cálculo del descuento financiero'; return '' }
  const guardar = async () => {
    const problema = validarPago(); if (problema) { setError(problema); return }
    if (!cliente || !asociado || guardando) return
    setGuardando(true); setError('')
    try {
      if (!intento.current) {
        const res = await apiClient.get<{ proximoConsecutivo?: { f022_cons_proximo?: number }; data?: { f022_cons_proximo?: number }; f022_cons_proximo?: number }>('/recibo-caja/proximo-consecutivo', { params: { id_cia: 1, id_tipo_docto: 'RC', id_co: co, p_bloquear: 0, p_leer_mandato_tipo: 0 } })
        const consecutivo = numero(res.data.proximoConsecutivo?.f022_cons_proximo ?? res.data.data?.f022_cons_proximo ?? res.data.f022_cons_proximo)
        if (!consecutivo) throw new Error('No se recibió un consecutivo válido')
        const payload = armarPayloadRC({ clienteId: cliente.f9740_id, facturas, descuentos, aplicar, pagos, parametros, observacion, usuario: sesion?.usuario ?? '?', co, caja, consecutivo, ahora: new Date() })
        intento.current = { key: crypto.randomUUID(), payload }
      }
      const actual = intento.current
      const res = await apiClient.post<{ success?: boolean; data?: Record<string, unknown>; message?: string }>('/recibo-caja/procesar', actual.payload, { headers: { 'Idempotency-Key': actual.key } })
      if (res.data.success === false) throw new Error(res.data.message || 'No se pudo crear el recibo')
      const numeroRc = String(res.data.data?.numero_docto ?? res.data.data?.p_numero_docto ?? actual.payload.p_numero_docto)
      reset(); setExito(`Recibo de Caja RC ${numeroRc} creado correctamente`)
      void queryClient.invalidateQueries({ queryKey: ['recibo-caja'] })
      void queryClient.invalidateQueries({ queryKey: ['rc'] })
      onCreated()
    } catch (e) { setError(errorMensaje(e)) } finally { setGuardando(false) }
  }
  if (me.isLoading) return <p className="p-6 text-sm text-muted-foreground">Consultando usuario SIESA…</p>
  if (me.isError) return <div className="p-6 text-sm text-red-600">No se pudo verificar la asociación SIESA: {errorMensaje(me.error)} <Button variant="outline" onClick={() => void me.refetch()}>Reintentar</Button></div>
  if (!asociado) return <p className="m-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-700">Tu usuario no está asociado a un usuario de SIESA; pide al administrador que lo asocie en Maestro de usuarios</p>
  return <div className="space-y-5 p-4 sm:p-6">
    <div className={card}><p className="text-sm font-semibold">El recibo quedará a nombre de: {usuarioSiesa?.siesa_nombre}</p><p className="mt-1 text-xs text-muted-foreground">Selecciona cliente, facturas, ajustes y medios de pago.</p></div>
    {exito && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700">{exito}</div>}
    {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-medium text-red-600">{error}</div>}
    <div className="flex flex-wrap gap-2">{['Cliente', 'Facturas', 'Ajustes / Descuento', 'Pago y resumen'].map((t, i) => <button key={t} type="button" onClick={() => { if (i <= paso) setPaso(i) }} className={`rounded-full px-4 py-2 text-xs font-semibold ${paso === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}. {t}</button>)}</div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><div className="space-y-4">
      {paso === 0 && <div className={card}><h2 className="mb-3 font-semibold">Buscar cliente</h2><form onSubmit={e => { e.preventDefault(); setBusqueda(buscar.trim()) }} className="flex gap-2"><Input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Nombre o NIT (mínimo 2 caracteres)"/><Button type="submit">Buscar</Button></form>{clientes.isLoading && <p className="mt-3 text-xs">Buscando…</p>}{clientes.isError && <p className="mt-3 text-xs text-red-600">{errorMensaje(clientes.error)}</p>}<div className="mt-3 max-h-80 overflow-auto">{clientes.data?.map(c => <button key={c.f9740_id} type="button" onClick={() => elegirCliente(c)} className="block w-full border-b border-border/50 p-3 text-left text-sm hover:bg-muted"><b>{c.f9740_razon_social || c.f9740_nombre}</b><span className="ml-2 text-muted-foreground">{c.f9740_nit}</span></button>)}</div></div>}
      {paso === 1 && <div className={card}><h2 className="font-semibold">Facturas de {cliente?.f9740_razon_social}</h2><p className="mb-3 text-xs text-muted-foreground">Marca pago completo o digita un abono. El descuento solo aplica a facturas completas.</p>{cargandoFacturas && <p className="text-xs">Cargando facturas…</p>}{!cargandoFacturas && !facturas.length && <p className="text-xs">No hay facturas abiertas.</p>}<div className="space-y-2">{facturas.map(f => <div key={f.rowid} className="grid gap-2 rounded-xl border border-border/60 p-3 sm:grid-cols-[1fr_auto_140px] sm:items-center"><div><b className="text-sm">{f.tipo}-{f.consecutivo}</b><p className="text-xs text-muted-foreground">Saldo {cop(f.saldo)} · SA {f.rowid}</p></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={f.seleccionada} onChange={e => actualizarFactura(f.rowid, e.target.checked ? f.saldo : 0, e.target.checked)}/> Completa</label><Input type="number" min="0" max={f.saldo} step="0.01" aria-label={`Abono ${f.tipo}-${f.consecutivo}`} value={f.valor || ''} placeholder="Abono" onChange={e => actualizarFactura(f.rowid, Number(e.target.value), Number(e.target.value) > 0)}/></div>)}</div>{masFacturas && <Button variant="outline" className="mt-3" disabled={cargandoFacturas} onClick={() => cliente && void cargarFacturas(cliente.f9740_id, pagina + 1, true)}>Cargar más</Button>}</div>}
      {paso === 2 && <div className={card}><h2 className="font-semibold">Ajustes y descuento financiero</h2><p className="mt-2 text-xs text-muted-foreground">{cargandoDescuentos ? 'Consultando descuento SAS…' : `Descuento disponible: ${cop(Object.values(descuentos).reduce((s, n) => s + n, 0))}`}</p><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={aplicar} disabled={cargandoDescuentos || !Object.values(descuentos).some(n => n > 0)} onChange={e => { cambio(); setAplicar(e.target.checked) }}/> Aplicar descuento financiero</label><p className="mt-3 text-xs text-muted-foreground">Ajuste al peso hasta {cop(parametros.limite)}. El sobrante superior se registra como anticipo; el faltante superior impide guardar.</p></div>}
      {paso === 3 && <div className="space-y-4"><div className={card}><h2 className="mb-3 font-semibold">Caja y C.O.</h2><div className="grid gap-3 sm:grid-cols-2"><label className={field}>Centro de operación<Select value={co} onChange={e => { cambio(); setCo(e.target.value); setCajaManual(true) }}><option value="001">001 · Principal</option><option value="002">002 · Almateriales</option></Select></label><label className={field}>Caja<Select value={caja} onChange={e => { cambio(); setCaja(e.target.value); setCajaManual(true) }}><option value="40">40 · Vía 40</option><option value="80">80 · Ferretería</option></Select></label></div></div><div className={card}><div className="flex items-center justify-between"><h2 className="font-semibold">Medios de pago</h2><Button size="sm" variant="outline" onClick={() => { cambio(); setPagos(prev => [...prev, pagoVacio()]) }}>Agregar medio</Button></div><div className="mt-3 space-y-4">{pagos.map(p => <div key={p.id} className="rounded-xl border border-border/70 p-3"><div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className={field}>Medio<Select value={p.codigo} onChange={e => cambiarPago(p.id, { codigo: e.target.value as PagoRC['codigo'] })}><option value="EFE">Efectivo</option><option value="CG1">Transferencia / consignación</option><option value="TC">Tarjeta crédito</option><option value="TD">Tarjeta débito</option></Select></label><label className={field}>Valor<Input type="number" min="0" step="0.01" value={p.valor || ''} onChange={e => cambiarPago(p.id, { valor: Number(e.target.value) })}/></label><Button size="sm" variant="ghost" className="self-end" onClick={() => { cambio(); setPagos(prev => prev.filter(x => x.id !== p.id)) }}>Quitar</Button></div>{p.codigo === 'CG1' && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={field}>Cuenta bancaria<Select value={p.cuenta} onChange={e => cambiarPago(p.id, { cuenta: e.target.value })}><option value="">Seleccionar cuenta</option>{bancos.data?.map(b => <option key={b.id} value={b.f026_id}>{b.f026_id} · {b.f026_descripcion}</option>)}</Select></label><label className={field}>Fecha consignación<FechaInput value={p.fechaConsignacion} onChange={v => cambiarPago(p.id, { fechaConsignacion: v })}/></label></div>}{(p.codigo === 'TC' || p.codigo === 'TD') && <div className="mt-3 grid gap-3 sm:grid-cols-3"><label className={field}>Número tarjeta<Input value={p.nroTarjeta} onChange={e => cambiarPago(p.id, { nroTarjeta: e.target.value })}/></label><label className={field}>Autorización<Input value={p.autorizacion} onChange={e => cambiarPago(p.id, { autorizacion: e.target.value })}/></label><label className={field}>Vencimiento<Input type="month" value={p.vencimiento} onChange={e => cambiarPago(p.id, { vencimiento: e.target.value })}/></label></div>}{p.codigo !== 'EFE' && <label className={`${field} mt-3 block`}>Voucher (opcional)<Input value={p.voucher} onChange={e => cambiarPago(p.id, { voucher: e.target.value })}/></label>}</div>)}</div></div><div className={card}><label className={field}>Observación obligatoria<textarea value={observacion} onChange={e => { cambio(); setObservacion(e.target.value) }} rows={3} className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm text-foreground" placeholder="Motivo del recaudo"/></label></div></div>}
      <div className="flex justify-between gap-2">{paso > 0 ? <Button variant="outline" onClick={() => setPaso(paso - 1)}>Anterior</Button> : <span/>}{paso < 3 ? <Button disabled={paso === 0 ? !cliente : paso === 1 ? !seleccionadas.length || seleccionadas.some(f => f.valor > f.saldo || f.valor <= 0) : cargandoDescuentos} onClick={() => setPaso(paso + 1)}>Siguiente</Button> : <Button disabled={guardando || !!validarPago()} onClick={() => void guardar()}>{guardando ? 'Guardando…' : 'Crear recibo'}</Button>}</div>
    </div><aside className={`${card} h-fit space-y-2 lg:sticky lg:top-4`}><h2 className="font-semibold">Resumen</h2>{([['Subtotal facturas', totales.subtotal], ['Descuento financiero', totales.descuento], ['Neto', totales.neto], ['Recibido', totales.recibido], ['Diferencia', totales.diferencia]] as const).map(([label, value]) => <div key={label} className="flex justify-between gap-2 border-b border-border/40 py-1 text-xs"><span>{label}</span><span className="font-mono font-semibold"><MontoAlineado value={value}/></span></div>)}<p className="pt-2 text-xs font-medium">{totales.clasificacion.tipo === 'ajusteDescuento' ? `Faltante: descuento por ajuste al peso ${cop(totales.clasificacion.monto)}` : totales.clasificacion.tipo === 'ajusteIngreso' ? `Sobrante: ingreso por ajuste al peso ${cop(totales.clasificacion.monto)}` : totales.clasificacion.tipo === 'anticipo' ? `Sobrante: anticipo cliente ${cop(totales.clasificacion.monto)}` : totales.clasificacion.tipo === 'faltanteExcesivo' ? `Faltante superior al límite ${cop(parametros.limite)}` : 'Sin diferencia'}</p></aside></div>
  </div>
}
