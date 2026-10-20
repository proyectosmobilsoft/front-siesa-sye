import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Contexto } from './contexto'
import { DetalleModal } from './DetalleModal'
import type { EspecDetalle, RangoDetalle } from './tipos'

/** Aloja el modal de detalle; `rango` es el periodo del dashboard (los pedidos no lo usan). */
export function DetalleProvider({ rango, children }: { rango?: RangoDetalle; children: ReactNode }) {
  const [espec, setEspec] = useState<EspecDetalle | null>(null)
  const abrir = useCallback((nueva: EspecDetalle) => setEspec(nueva), [])
  const cerrar = useCallback(() => setEspec(null), [])
  const valor = useMemo(() => ({ abrir }), [abrir])
  return (
    <Contexto.Provider value={valor}>
      {children}
      {espec && <DetalleModal key={JSON.stringify(espec)} espec={espec} rango={rango} alCerrar={cerrar} />}
    </Contexto.Provider>
  )
}
