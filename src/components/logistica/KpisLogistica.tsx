import { useState } from 'react'
import {
  Bloque,
  Malla,
  Tarjeta,
  SelectorRango,
} from '@/components/tablero/comun'
import { Barras, BarrasH } from '@/components/tablero/graficas'
import { rangoDePreset, type PresetRango } from '@/components/tablero/formato'
import { formatters } from '@/utils/formatters'
import { useDashboardLogistica } from './useLogistica'
export function KpisLogistica({
  co,
  activo,
}: {
  co: string | null
  activo: boolean
}) {
  const [preset, setPreset] = useState<PresetRango | null>('30d'),
    [rango, setRango] = useState(() => rangoDePreset('30d'))
  const elegir = (p: PresetRango) => {
    setPreset(p)
    setRango(rangoDePreset(p))
  }
  const q = useDashboardLogistica(rango.desde, rango.hasta, co, activo),
    d = q.data
  return (
    <div className="space-y-5">
      <SelectorRango
        preset={preset}
        desde={rango.desde}
        hasta={rango.hasta}
        alElegirPreset={elegir}
        alCambiarDesde={desde => {
          setPreset(null)
          setRango({ ...rango, desde })
        }}
        alCambiarHasta={hasta => {
          setPreset(null)
          setRango({ ...rango, hasta })
        }}
      />
      {q.isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      ) : q.isError ? (
        <p className="text-destructive">No se pudo cargar el dashboard.</p>
      ) : (
        d && (
          <>
            <Malla columnas={3}>
              <Tarjeta etiqueta="Rutas" valor={d.rutas} />
              <Tarjeta etiqueta="Kilómetros" valor={d.km.toFixed(1)} />
              <Tarjeta
                etiqueta="Kg despachados"
                valor={d.kg.toLocaleString('es-CO')}
              />
              <Tarjeta
                etiqueta="Ocupación promedio"
                valor={`${d.ocupacion.toFixed(1)} %`}
              />
              <Tarjeta etiqueta="Facturas en ruta" valor={d.facturas} />
              <Tarjeta
                etiqueta="Cobradas"
                valor={`${d.facturas ? Math.round((d.cobradas / d.facturas) * 100) : 0} %`}
                nota={`${d.pendientes} pendientes`}
              />
            </Malla>
            <div className="grid gap-4 lg:grid-cols-2">
              <Bloque titulo="Kg por día">
                <Barras
                  datos={d.kgPorDia.map(p => ({
                    ...p,
                    nombre: formatters.dateOnly(p.nombre),
                  }))}
                  formato={n => `${n.toLocaleString('es-CO')} kg`}
                  nombreValor="Kilogramos"
                />
              </Bloque>
              <Bloque titulo="Conductores por kg">
                <BarrasH
                  datos={d.topConductores.slice(0, 10)}
                  formato={n => `${n.toLocaleString('es-CO')} kg`}
                  nombreValor="Kilogramos"
                />
              </Bloque>
            </div>
            <p className="text-sm text-muted-foreground">
              Valor en ruta: {formatters.currency(d.valor)} · {d.paradas}{' '}
              paradas
            </p>
          </>
        )
      )}
    </div>
  )
}
