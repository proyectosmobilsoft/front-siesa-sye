import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { maestroCuentasBancariasApi } from '@/api/maestroCuentasBancarias'
import { transferenciasConfirmacionApi, type DuplicadoConfirmacion, type FacturaConfirmacion } from '@/api/transferenciasConfirmacion'
import type { Client, ClientsResponse } from '@/api/types'
import { useAuthStore, coPuntual } from '@/store/authStore'
import { ClienteAutocomplete } from '@/components/reciboCaja/ClienteAutocomplete'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FechaInput } from '@/components/ui/fecha-input'
import { formatters } from '@/utils/formatters'
import { parseMonto } from '@/utils/reciboCajaCalculos'
import { validarSoportes } from './soportes'
import { FileText, Trash2, Upload } from 'lucide-react'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function Miniatura({ file }: { file: File }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!file.type.startsWith('image/')) return
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])
  return url ? <img src={url} alt="" className="h-10 w-10 rounded object-cover" /> : <FileText className="h-8 w-8 text-primary" />
}
const mensajeError = (error: unknown) => (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as Error).message || 'No se pudo guardar la confirmación'
const field = 'block space-y-1 text-xs font-medium text-muted-foreground'

export function NuevaConfirmacionModal({ onClose, onSaved }: { onClose: () => void; onSaved: (message: string) => void }) {
  const centro = useAuthStore(s => s.centroOperacionActivo)
  const [busqueda, setBusqueda] = useState('')
  const [cliente, setCliente] = useState<Client | null>(null)
  const [facturas, setFacturas] = useState<FacturaConfirmacion[]>([])
  const [cargandoFacturas, setCargandoFacturas] = useState(false)
  const facturaVersion = useRef(0)
  const [seleccionadas, setSeleccionadas] = useState<number[]>([])
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(hoy)
  const [cuenta, setCuenta] = useState('')
  const [referencia, setReferencia] = useState('')
  const [observacion, setObservacion] = useState('')
  const [soportes, setSoportes] = useState<File[]>([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [duplicados, setDuplicados] = useState<DuplicadoConfirmacion[] | null>(null)
  const [creadaId, setCreadaId] = useState<number | null>(null)
  const clientes = useQuery({ queryKey: ['transferencias-confirmacion', 'clientes', busqueda], queryFn: async () => (await apiClient.get<ClientsResponse>('/clients', { params: { search: busqueda, page: 1, pageSize: 20 } })).data.data ?? [], enabled: busqueda.length >= 2 })
  const bancos = useQuery({ queryKey: ['rc', 'cuentas-bancarias'], queryFn: async () => (await maestroCuentasBancariasApi.listarConfig(true)).data })
  useEffect(() => { if (bancos.data?.length === 1) setCuenta(bancos.data[0].f026_id) }, [bancos.data])
  const elegirCliente = async (c: Client) => {
    const version = ++facturaVersion.current
    setCliente(c); setFacturas([]); setSeleccionadas([]); setError('')
    setCargandoFacturas(true)
    try {
      const res = await apiClient.get<{ data: Record<string, unknown>[] }>('/factura/facturas', { params: { id_tercero: c.f9740_id, page: 1, pageSize: 100 } })
      if (version !== facturaVersion.current) return
      setFacturas((res.data.data ?? []).map(row => ({ rowid_sa: Number(row.rowidsa ?? row.rowid), documento: String(row.doccruce ?? ''), saldo: parseMonto(row.saldo) })).filter(row => row.rowid_sa > 0 && row.saldo > 0))
    } catch (e) { if (version === facturaVersion.current) setError(`No se pudieron cargar las facturas: ${mensajeError(e)}`) }
    finally { if (version === facturaVersion.current) setCargandoFacturas(false) }
  }
  const agregar = useCallback((files: File[]) => {
    const message = validarSoportes(files, soportes.length)
    if (message) { setError(message); return }
    setSoportes(prev => [...prev, ...files]); setError('')
  }, [soportes.length])
  const sumaFacturas = facturas.filter(row => seleccionadas.includes(row.rowid_sa)).reduce((sum, row) => sum + row.saldo, 0)
  const guardar = async () => {
    if (!cliente || !(Number(valor) > 0) || !fecha || !cuenta || soportes.length < 1) { setError('Completa cliente, valor, fecha, cuenta y al menos un soporte.'); return }
    setGuardando(true); setError('')
    try {
      const res = await transferenciasConfirmacionApi.crear({ rowid_tercero: cliente.f9740_id, nit: String(cliente.f9740_nit ?? ''), razon_social: cliente.f9740_razon_social || cliente.f9740_nombre || '', id_co: coPuntual(centro) ?? '', valor: Number(valor), fecha_transferencia: fecha, id_cta_bancaria: cuenta, referencia: referencia.trim(), observacion: observacion.trim(), facturas: facturas.filter(row => seleccionadas.includes(row.rowid_sa)), soportes })
      if (res.posibles_duplicados?.length) { setCreadaId(res.id); setDuplicados(res.posibles_duplicados) }
      else onSaved('Confirmación registrada correctamente')
    } catch (e) { setError(mensajeError(e)) } finally { setGuardando(false) }
  }
  return <Modal isOpen onClose={() => { if (!guardando) onClose() }} title={creadaId ? `Confirmación #${creadaId} registrada` : 'Nueva confirmación'} className="max-w-2xl">
    {creadaId ? <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
        <p className="font-semibold">Se encontraron posibles duplicados. Revísalos antes de crear otra solicitud.</p>
        <ul className="mt-2 space-y-1">{duplicados?.map(row => <li key={row.id}>#{row.id} · {row.razon_social} · {formatters.currency(Number(row.valor) || 0)} · {formatters.dateOnly(row.fecha_transferencia)} · {row.estado}</li>)}</ul>
      </div>
      <div className="text-right"><Button onClick={() => onSaved('Confirmación registrada; revisa los posibles duplicados')}>Entendido</Button></div>
    </div> : <div className="space-y-4">
      <div><p className="mb-1 text-xs font-medium text-muted-foreground">Cliente</p><ClienteAutocomplete cliente={cliente} resultados={clientes.data ?? []} termino={busqueda} buscando={clientes.isFetching} error={clientes.isError ? mensajeError(clientes.error) : undefined} onSearch={setBusqueda} onSelect={elegirCliente} onChange={() => { facturaVersion.current++; setCliente(null); setFacturas([]); setSeleccionadas([]); setCargandoFacturas(false) }} /></div>
      {cliente && <div className="rounded-lg border border-border p-3"><p className="text-sm font-semibold">Facturas pendientes <span className="font-normal text-muted-foreground">(opcional)</span></p>
        {cargandoFacturas && <p className="text-xs text-muted-foreground">Cargando facturas…</p>}
        <div className="mt-2 max-h-36 space-y-1 overflow-auto">{facturas.length ? facturas.map(row => <label key={row.rowid_sa} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={seleccionadas.includes(row.rowid_sa)} onChange={e => setSeleccionadas(prev => e.target.checked ? [...prev, row.rowid_sa] : prev.filter(id => id !== row.rowid_sa))} /><span className="flex-1">{row.documento}</span><span className="tabular-nums">{formatters.currency(row.saldo)}</span></label>) : <p className="text-xs text-muted-foreground">Sin facturas pendientes en la primera página.</p>}</div>
        <p className="mt-2 text-right text-xs tabular-nums text-muted-foreground">Suma seleccionada: {formatters.currency(sumaFacturas)} <button type="button" className="ml-2 text-primary underline" onClick={() => setValor(String(sumaFacturas))} disabled={!seleccionadas.length}>Usar como valor</button></p>
      </div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={field}>Valor<Input type="number" min="0.01" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="text-right tabular-nums" /></label>
        <label className={field}>Fecha de transferencia<FechaInput value={fecha} onChange={setFecha} /></label>
        <label className={field}>Cuenta bancaria destino<Select value={cuenta} onChange={e => setCuenta(e.target.value)}><option value="">Seleccionar cuenta</option>{bancos.data?.map(row => <option key={row.id} value={row.f026_id}>{row.f026_id} · {row.f026_descripcion}</option>)}</Select></label>
        <label className={field}>Referencia / número de comprobante<Input value={referencia} onChange={e => setReferencia(e.target.value)} /></label>
      </div>
      <label className={field}>Observación<textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={2} className="w-full rounded-md border border-input bg-background p-2 text-sm text-foreground" /></label>
      <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); agregar(Array.from(e.dataTransfer.files)) }} className="rounded-lg border border-dashed border-border p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><Upload className="h-4 w-4" /> Soportes (1 a 10; JPG, PNG, WEBP o PDF; máximo 10 MB cada uno)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className="sr-only" onChange={e => { agregar(Array.from(e.target.files ?? [])); e.target.value = '' }} /></label>
        <p className="mt-1 text-xs text-muted-foreground">Selecciona archivos o arrástralos aquí.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">{soportes.map((file, i) => <div key={`${file.name}-${i}`} className="flex min-w-0 items-center gap-2 rounded border border-border p-2 text-xs">
          <Miniatura file={file} />
          <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span><button type="button" aria-label={`Quitar ${file.name}`} onClick={() => setSoportes(prev => prev.filter((_, index) => index !== i))}><Trash2 className="h-4 w-4" /></button>
        </div>)}</div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button><Button onClick={() => void guardar()} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar solicitud'}</Button></div>
    </div>}
  </Modal>
}
