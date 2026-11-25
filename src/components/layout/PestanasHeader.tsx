import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { INICIO, MAX_PESTANAS, etiquetaDe } from '@/config/pestanas'
import { usePestanasStore } from '@/store/pestanasStore'

/**
 * Barra dedicada de pestañas de trabajo debajo del header (100% del ancho).
 * Soporta hasta MAX_PESTANAS con scroll horizontal suave, flechas condicionales
 * y menú desplegable para saltar entre pestañas o cerrar las demás.
 */
export const PestanasHeader = () => {
  const navigate = useNavigate()
  const { tabs, activa, aviso, cerrar } = usePestanasStore()

  const listRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [puedeIzq, setPuedeIzq] = useState(false)
  const [puedeDer, setPuedeDer] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)

  const actualizarScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    setPuedeIzq(el.scrollLeft > 4)
    setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    actualizarScroll()
    const el = listRef.current
    if (!el) return
    const ro = new ResizeObserver(actualizarScroll)
    ro.observe(el)
    return () => ro.disconnect()
  }, [tabs.length, actualizarScroll])

  // Asegura que la pestaña activa quede visible al cambiar de ruta.
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const activaEl = el.querySelector<HTMLElement>('.tabs-bar-item.is-active')
    activaEl?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }, [activa])

  // Cierra el menú desplegable al hacer clic fuera o presionar Escape.
  useEffect(() => {
    if (!menuAbierto) return
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAbierto(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuAbierto])

  if (tabs.length === 0 && !aviso) return null

  const desplazar = (delta: number) => {
    listRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  const cerrarOtras = () => {
    for (const t of tabs) {
      if (t.key !== activa) cerrar(t.key)
    }
    setMenuAbierto(false)
  }

  return (
    <div className="tabs-bar">
      <div className="tabs-bar-scroll-wrap">
        {puedeIzq && (
          <button
            type="button"
            className="tabs-bar-nav-btn"
            onClick={() => desplazar(-220)}
            aria-label="Desplazar pestañas a la izquierda"
            title="Ver pestañas anteriores"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}

        <nav
          ref={listRef}
          aria-label="Pestañas de trabajo"
          role="tablist"
          className="tabs-bar-list"
          onScroll={actualizarScroll}
        >
          {tabs.map((tab) => {
            const { label, icon: Icono = LayoutGrid } =
              tab.key === INICIO.key ? { label: 'Dashboard', icon: undefined } : etiquetaDe(tab.key)
            const esActiva = tab.key === activa
            const Ic = Icono ?? LayoutGrid
            return (
              <span
                key={tab.key}
                className={`tabs-bar-item${esActiva ? ' is-active' : ''}`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={esActiva}
                  title={label}
                  className="tabs-bar-trigger"
                  onClick={() => navigate(tab.url)}
                  onMouseDown={(e) => {
                    if (e.button === 1) {
                      e.preventDefault()
                      cerrar(tab.key)
                    }
                  }}
                >
                  <Ic className="h-3.5 w-3.5 shrink-0" />
                  <span className="tabs-bar-label">{label}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Cerrar ${label}`}
                  title="Cerrar pestaña"
                  className="tabs-bar-close"
                  onClick={() => cerrar(tab.key)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )
          })}
        </nav>

        {puedeDer && (
          <button
            type="button"
            className="tabs-bar-nav-btn"
            onClick={() => desplazar(220)}
            aria-label="Desplazar pestañas a la derecha"
            title="Ver más pestañas"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="tabs-bar-actions" ref={menuRef}>
        {aviso && (
          <span role="alert" className="tabs-bar-aviso">
            Máximo {MAX_PESTANAS} pestañas abiertas
          </span>
        )}

        {tabs.length > 1 && (
          <>
            <button
              type="button"
              className="tabs-bar-menu-btn"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-expanded={menuAbierto}
              aria-haspopup="menu"
              title="Ver todas las pestañas abiertas"
            >
              <span>{tabs.length}/{MAX_PESTANAS}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {menuAbierto && (
              <div className="tabs-bar-popover" role="menu">
                <div className="tabs-bar-popover-list custom-scrollbar">
                  {tabs.map((tab) => {
                    const { label, icon: Icono = LayoutGrid } =
                      tab.key === INICIO.key ? { label: 'Dashboard', icon: undefined } : etiquetaDe(tab.key)
                    const esActiva = tab.key === activa
                    const Ic = Icono ?? LayoutGrid
                    return (
                      <div
                        key={tab.key}
                        className={`tabs-bar-popover-row${esActiva ? ' is-active' : ''}`}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="tabs-bar-popover-go"
                          onClick={() => {
                            navigate(tab.url)
                            setMenuAbierto(false)
                          }}
                        >
                          <Ic className="h-3.5 w-3.5 shrink-0" />
                          <span className="tabs-bar-label">{label}</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Cerrar ${label}`}
                          title="Cerrar"
                          className="detail-icon-btn detail-icon-btn--danger"
                          onClick={() => cerrar(tab.key)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="tabs-bar-popover-footer">
                  <button
                    type="button"
                    className="tabs-bar-popover-clear"
                    onClick={cerrarOtras}
                  >
                    Cerrar otras pestañas
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
