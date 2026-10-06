import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Loader2, Save, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  reciboCajaApi,
  ParametrosReciboCaja,
  ParametrosReciboCajaUpdate,
  CuentaParametroRC,
} from '@/api/reciboCaja'
import { AxiosError } from 'axios'

type CuentaKey =
  | 'cuenta_ajuste_peso_descuento'
  | 'cuenta_ajuste_peso_ingreso'
  | 'cuenta_descuento_financiero'
  | 'cuenta_descuento_financiero_nif'
  | 'cuenta_anticipo'

interface FormState {
  limite_ajuste_peso: string
  cuenta_ajuste_peso_descuento: string
  cuenta_ajuste_peso_ingreso: string
  cuenta_descuento_financiero: string
  cuenta_descuento_financiero_nif: string
  cuenta_anticipo: string
}

const CUENTA_FIELDS: { key: CuentaKey; label: string }[] = [
  { key: 'cuenta_ajuste_peso_descuento', label: 'Ajuste al peso — faltante (débito)' },
  { key: 'cuenta_ajuste_peso_ingreso', label: 'Ajuste al peso — sobrante (crédito)' },
  { key: 'cuenta_descuento_financiero', label: 'Descuento financiero (PCGA y Ajustes)' },
  {
    key: 'cuenta_descuento_financiero_nif',
    label: 'Descuento financiero — cuenta NIF (opcional, ej. 53053501; vacío = misma cuenta)',
  },
  { key: 'cuenta_anticipo', label: 'Anticipo de cliente' },
]

const emptyForm = (): FormState => ({
  limite_ajuste_peso: '',
  cuenta_ajuste_peso_descuento: '',
  cuenta_ajuste_peso_ingreso: '',
  cuenta_descuento_financiero: '',
  cuenta_descuento_financiero_nif: '',
  cuenta_anticipo: '',
})

const formFromData = (data: ParametrosReciboCaja): FormState => ({
  limite_ajuste_peso: String(data.limite_ajuste_peso ?? ''),
  cuenta_ajuste_peso_descuento: data.cuentas.cuenta_ajuste_peso_descuento?.cuenta ?? '',
  cuenta_ajuste_peso_ingreso: data.cuentas.cuenta_ajuste_peso_ingreso?.cuenta ?? '',
  cuenta_descuento_financiero: data.cuentas.cuenta_descuento_financiero?.cuenta ?? '',
  cuenta_descuento_financiero_nif: data.cuentas.cuenta_descuento_financiero_nif?.cuenta ?? '',
  cuenta_anticipo: data.cuentas.cuenta_anticipo?.cuenta ?? '',
})

function CuentaDescripcion({ meta, valorActual }: { meta?: CuentaParametroRC; valorActual: string }) {
  if (!meta || valorActual !== (meta.cuenta ?? '')) {
    return valorActual.trim() ? (
      <p className="mt-1 text-xs text-muted-foreground">Se validará contra SIESA al guardar</p>
    ) : null
  }
  if (meta.rowid == null && meta.cuenta.trim() !== '') {
    return <p className="mt-1 text-xs font-medium text-destructive">Cuenta no encontrada en SIESA</p>
  }
  if (meta.descripcion) {
    return <p className="mt-1 text-xs text-muted-foreground">{meta.descripcion}</p>
  }
  return null
}

export const ParametrosReciboCajaPage = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<ParametrosReciboCaja | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const applyData = (next: ParametrosReciboCaja) => {
    setData(next)
    setForm(formFromData(next))
  }

  const fetchParametros = async () => {
    try {
      setLoading(true)
      const res = await reciboCajaApi.getParametros()
      applyData(res)
    } catch (err) {
      console.error('Error cargando parámetros RC:', err)
      const ax = err as AxiosError<{ message?: string }>
      showToast('error', ax.response?.data?.message || 'Error al cargar los parámetros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParametros()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const limiteOriginal = data?.limite_ajuste_peso ?? null
  const limiteActual = Number(form.limite_ajuste_peso)
  const limiteChanged =
    data != null &&
    form.limite_ajuste_peso.trim() !== '' &&
    !Number.isNaN(limiteActual) &&
    limiteActual !== limiteOriginal

  const cuentasChanged = CUENTA_FIELDS.some(
    ({ key }) => form[key] !== (data?.cuentas[key]?.cuenta ?? '')
  )

  const hasChanges = limiteChanged || cuentasChanged
  const limiteInvalido =
    form.limite_ajuste_peso.trim() !== '' && (Number.isNaN(limiteActual) || limiteActual < 0)

  const handleSave = async () => {
    if (!data || !hasChanges || limiteInvalido) return

    const body: ParametrosReciboCajaUpdate = {}
    if (limiteChanged) body.limite_ajuste_peso = limiteActual

    for (const { key } of CUENTA_FIELDS) {
      const actual = form[key]
      const original = data.cuentas[key]?.cuenta ?? ''
      if (actual !== original) {
        body[key] = actual
      }
    }

    if (Object.keys(body).length === 0) return

    try {
      setSaving(true)
      const res = await reciboCajaApi.actualizarParametros(body)
      applyData(res)
      showToast('success', 'Parámetros guardados correctamente')
    } catch (err) {
      console.error('Error guardando parámetros RC:', err)
      const ax = err as AxiosError<{ message?: string }>
      showToast('error', ax.response?.data?.message || 'Error al guardar los parámetros')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex h-full min-h-0 flex-col gap-4 p-6"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed right-6 top-20 z-50 flex max-w-md items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === 'success'
                ? 'border-green-500/30 bg-card text-green-700 dark:text-green-400'
                : 'border-destructive/30 bg-card text-destructive'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex shrink-0 flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Los cambios aplican a los RC nuevos en máximo 1 minuto.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchParametros}
            disabled={loading || saving}
            title="Actualizar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving || loading || limiteInvalido}
            className="gap-2 whitespace-nowrap"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando parámetros...
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-auto">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Límite de ajuste al peso</CardTitle>
              <CardDescription>
                Valor máximo ($) permitido para el ajuste al peso en un recibo de caja.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Límite ($)
              </label>
              <div className="relative max-w-xs">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.limite_ajuste_peso}
                  onChange={(e) => setForm((f) => ({ ...f, limite_ajuste_peso: e.target.value }))}
                  className="pl-7 font-mono tabular-nums"
                  autoComplete="off"
                  disabled={saving}
                />
              </div>
              {limiteInvalido && (
                <p className="mt-1 text-xs font-medium text-destructive">Ingrese un número válido (≥ 0)</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Cuentas contables</CardTitle>
              <CardDescription>
                Códigos de cuenta (f253_id) usados al contabilizar el recibo de caja.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {CUENTA_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </label>
                  <Input
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="max-w-md font-mono"
                    autoComplete="off"
                    placeholder="Código de cuenta"
                    disabled={saving}
                  />
                  <CuentaDescripcion meta={data?.cuentas[key]} valorActual={form[key]} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  )
}
