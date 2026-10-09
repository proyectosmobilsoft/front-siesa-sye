import { useEffect, useId, useState } from 'react'
import type { Client } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export function ClienteAutocomplete({ cliente, resultados, termino, buscando, error, onSearch, onSelect, onChange }: {
  cliente: Client | null
  resultados: Client[]
  termino: string
  buscando: boolean
  error?: string
  onSearch: (value: string) => void
  onSelect: (client: Client) => void
  onChange: () => void
}) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const listId = useId()
  const coincidencias = termino === texto.trim() ? resultados : []
  const esperando = termino !== texto.trim()
  useEffect(() => {
    const timer = window.setTimeout(() => onSearch(texto.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [texto, onSearch])
  const elegir = (c: Client) => {
    onSelect(c)
    setTexto('')
    setAbierto(false)
  }
  return <div className="min-w-0">
    {cliente ? <div className="flex min-w-0 items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1">
      <Badge variant="secondary" className="shrink-0">Cliente</Badge>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={`${cliente.f9740_razon_social || cliente.f9740_nombre} · NIT ${cliente.f9740_nit}`}>{cliente.f9740_razon_social || cliente.f9740_nombre} <span className="font-normal text-muted-foreground">· NIT {cliente.f9740_nit}</span></span>
      <Button variant="outline" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={() => { onChange(); setTexto(''); setAbierto(true) }}>Cambiar</Button>
    </div> : <div className="relative">
      <Input
        role="combobox" aria-expanded={abierto && texto.trim().length >= 2} aria-controls={listId}
        aria-activedescendant={abierto && coincidencias[activo] ? `${listId}-${coincidencias[activo].f9740_id}` : undefined}
        aria-autocomplete="list" autoComplete="off" value={texto} className="h-9"
        placeholder="Escribe razón social o NIT"
        onChange={e => { setTexto(e.target.value); setActivo(0); setAbierto(true) }}
        onFocus={() => setAbierto(true)} onBlur={() => window.setTimeout(() => setAbierto(false), 150)}
        onKeyDown={e => {
          if (e.key === 'Escape') setAbierto(false)
          if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(i => Math.min(i + 1, coincidencias.length - 1)); setAbierto(true) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(i => Math.max(0, i - 1)) }
          if (e.key === 'Enter' && abierto && coincidencias[activo]) { e.preventDefault(); elegir(coincidencias[activo]) }
        }}
      />
      {texto.trim().length < 2 && <p className="sr-only">Escribe al menos 2 caracteres para buscar.</p>}
      {abierto && texto.trim().length >= 2 && <div id={listId} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-card p-1 shadow-lg">
        {(buscando || esperando) && <p className="p-3 text-sm text-muted-foreground">Buscando clientes…</p>}
        {error && <p className="p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!buscando && !esperando && !error && coincidencias.length === 0 && <p className="p-3 text-sm text-muted-foreground">Sin resultados.</p>}
        {coincidencias.map((c, i) => <button
          id={`${listId}-${c.f9740_id}`} key={c.f9740_id} role="option" aria-selected={i === activo}
          type="button" onMouseDown={e => e.preventDefault()} onClick={() => elegir(c)}
          className={`block w-full rounded-lg p-3 text-left text-sm ${i === activo ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
        ><span className="block font-medium">{c.f9740_razon_social || c.f9740_nombre}</span><span className="text-xs text-muted-foreground">NIT {c.f9740_nit}</span></button>)}
      </div>}
    </div>}
  </div>
}
