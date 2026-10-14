import type { RutaPropuesta } from '@/api/logistica'
import { ListaParadas } from './ListaParadas'
import { Transicion3D } from './Transicion3D'
export function TarjetaRuta({
  ruta,
  color,
  mover,
  indice,
  resaltada,
  alResaltar,
  sobrepesoPermitido,
}: {
  ruta: RutaPropuesta
  color: string
  mover?: (desde: number, hacia: number) => void
  indice: number
  resaltada?: boolean
  alResaltar?: () => void
  sobrepesoPermitido?: boolean
}) {
  return (
    <Transicion3D
      clave={`${ruta.cod}-${ruta.paradas.map(p => p.id).join('-')}`}
      retraso={indice * 0.06}
    >
      <article
        className={`cursor-pointer rounded-2xl border bg-card p-4 shadow-sm transition ${resaltada ? 'ring-2' : ''}`}
        style={{
          borderLeft: `6px solid ${color}`,
          ['--tw-ring-color' as string]: color,
        }}
        onClick={alResaltar}
      >
        <h3 className="font-semibold">
          {ruta.placa} · {ruta.conductor}
        </h3>
        <p className="text-sm text-muted-foreground">
          {ruta.distanciaKm.toLocaleString('es-CO')} km · {ruta.duracionMin} min
          · {ruta.pesoKg.toLocaleString('es-CO')} /{' '}
          {ruta.capacidadKg.toLocaleString('es-CO')} kg
        </p>
        <div className="mt-2 h-2 rounded-full bg-muted">
          <div
            className={`h-2 rounded-full ${ruta.sobrepeso ? 'bg-red-500' : ruta.ocupacion >= 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, ruta.ocupacion)}%` }}
          />
        </div>
        <p
          className={`mb-3 text-xs ${ruta.sobrepeso ? 'text-red-600' : 'text-muted-foreground'}`}
        >
          {ruta.ocupacion.toFixed(1)} % de ocupación
          {ruta.sobrepeso
            ? ` · Sobrepeso: +${(ruta.pesoKg - ruta.capacidadKg).toLocaleString('es-CO', { maximumFractionDigits: 0 })} kg${sobrepesoPermitido ? ' (permitido)' : ' — active «Permitir sobrepeso» para confirmar'}`
            : ''}
        </p>
        <ListaParadas paradas={ruta.paradas} mover={mover} />
      </article>
    </Transicion3D>
  )
}
