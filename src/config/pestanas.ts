import { getPageMeta, RUTAS_ANTERIORES } from '@/config/navigation'

/**
 * Pestañas de trabajo (como las del navegador): cada página que se abre queda en una pestaña del header,
 * con el nombre de la SUBSECCIÓN (no el del grupo del menú), y conserva lo que estabas haciendo.
 * Lógica pura; la interfaz está en PestanasPanels (páginas) y PestanasHeader (tira del header).
 */
export const MAX_PESTANAS = 8
export interface Pestana { key: string; url: string }

/** El Dashboard está siempre primero, no se cierra y no cuenta para el máximo. */
export const INICIO: Pestana = { key: '/', url: '/' }

// Rutas que solo redirigen a otra: no son una pestaña (si no, quedaría una pestaña fantasma).
const SIN_PESTANA = new Set(['/login', '/configuracion/seguridad', ...Object.keys(RUTAS_ANTERIORES)])

export const claveDe = (pathname: string) => pathname.replace(/\/+$/, '') || '/'
export const tieneRuta = (pathname: string) => !SIN_PESTANA.has(claveDe(pathname))

/** Nombre de la subsección de una ruta (el mismo del menú); si no está en el menú, el último tramo de la ruta. */
export function etiquetaDe(key: string) {
  const meta = getPageMeta(key)
  if (meta) return { label: meta.name, icon: meta.icon }
  const ultimo = key.split('/').filter(Boolean).pop() ?? 'Página'
  const texto = decodeURIComponent(ultimo).replace(/-/g, ' ')
  return { label: texto.charAt(0).toUpperCase() + texto.slice(1), icon: undefined }
}

/** Abre (o actualiza la URL de) la pestaña. Devuelve null si ya hay MAX_PESTANAS y esta es nueva. */
export function abrirPestana(tabs: Pestana[], key: string, url: string): Pestana[] | null {
  if (key === INICIO.key) return tabs
  const indice = tabs.findIndex((t) => t.key === key)
  if (indice >= 0) return tabs.map((t, i) => (i === indice ? { key, url } : t))
  if (tabs.length >= MAX_PESTANAS) return null
  return [...tabs, { key, url }]
}

export const cerrarPestana = (tabs: Pestana[], key: string) => tabs.filter((t) => t.key !== key)

// --- Persistencia por usuario: al recargar la página se recuperan las pestañas abiertas ---
const claveAlmacen = (scope: string) => `sye_pestanas:v1:${encodeURIComponent(scope)}`

function urlSegura(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\/(?!\/)/.test(valor) || /[\\\r\n]/.test(valor)) return false
  const ruta = new URL(valor, 'http://pestanas.local')
  return ![...ruta.searchParams.keys()].some((n) => /token|password|secret|clave/i.test(n))
}

export function leerPestanas(scope: string): { tabs: Pestana[]; activa: string } {
  try {
    const guardado = JSON.parse(localStorage.getItem(claveAlmacen(scope)) || 'null')
    const tabs: Pestana[] = []
    if (Array.isArray(guardado?.tabs)) {
      for (const t of guardado.tabs) {
        if (!urlSegura(t?.url)) continue
        const key = claveDe(new URL(t.url, 'http://pestanas.local').pathname)
        if (key !== INICIO.key && tieneRuta(key) && !tabs.some((x) => x.key === key) && tabs.length < MAX_PESTANAS) tabs.push({ key, url: t.url })
      }
    }
    const activa = urlSegura(guardado?.activa) && (guardado.activa === '/' || tabs.some((t) => t.url === guardado.activa)) ? guardado.activa : '/'
    return { tabs, activa }
  } catch {
    return { tabs: [], activa: '/' }
  }
}

export function guardarPestanas(scope: string, tabs: Pestana[], activa: string) {
  try {
    localStorage.setItem(claveAlmacen(scope), JSON.stringify({ tabs: tabs.filter((t) => urlSegura(t.url)), activa: urlSegura(activa) ? activa : '/' }))
  } catch { /* sin almacenamiento disponible: las pestañas simplemente no se recuerdan */ }
}
