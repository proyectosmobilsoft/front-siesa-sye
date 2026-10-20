import { Folder, type LucideIcon } from 'lucide-react'
import type { NavItem } from '@/config/navigation'

/**
 * Arma el menú lateral aplicando lo que el administrador organizó (en qué menú va cada página, su
 * orden y si se muestra) sobre el menú que trae el código (`navigation`) y las secciones
 * personalizadas. Lo que no tiene organización se queda donde el código lo puso.
 *
 * Una página se identifica por su ruta. Las páginas que nacen como enlace directo (Dashboard,
 * Propuesta) pueden meterse en un menú y volver a ser directas; las demás no se pueden sacar de
 * un menú a "enlace directo".
 */

export interface OrganizacionPagina { ruta: string; grupo: string; orden: number; visible: boolean }

export interface PaginaArmada {
  name: string
  href: string
  icon: LucideIcon
  subtitle?: string
  permiso?: string
  /** Menú donde la deja el código / la sección personalizada */
  grupoBase: string
  ordenBase: number
  visible: boolean
}

export interface GrupoArmado { name: string; icon: LucideIcon; personalizado: boolean; paginas: PaginaArmada[] }

export type EntradaMenu =
  | { tipo: 'directo'; pagina: PaginaArmada }
  | { tipo: 'grupo'; grupo: GrupoArmado }

export interface SeccionPersonalizada {
  nombre: string
  icono: LucideIcon
  items: { nombre: string; href: string; icon: LucideIcon; subtitle?: string; permiso?: string }[]
}

export interface OpcionesArmado {
  /** Conserva los menús sin páginas (para soltar páginas en ellos en la pantalla de organizar) */
  incluirVacios?: boolean
  /** Conserva las páginas ocultas, marcadas con visible = false */
  incluirOcultas?: boolean
}

interface Hueco { tipo: 'directo' | 'grupo'; nombre: string; icon: LucideIcon; personalizado: boolean; paginas: PaginaArmada[] }

export function armarMenu(
  navigation: NavItem[],
  personalizadas: SeccionPersonalizada[],
  organizacion: OrganizacionPagina[],
  { incluirVacios = false, incluirOcultas = false }: OpcionesArmado = {},
): EntradaMenu[] {
  const org = new Map(organizacion.map((o) => [o.ruta, o]))

  // 1. Los huecos del menú tal como lo deja el código: primero el menú del código, luego las secciones personalizadas
  const huecos: Hueco[] = []
  navigation.forEach((item) => {
    if (item.subItems) {
      huecos.push({ tipo: 'grupo', nombre: item.name, icon: item.icon, personalizado: false, paginas: item.subItems.map((s, i) => ({ name: s.name, href: s.href, icon: s.icon, subtitle: s.subtitle, permiso: s.permiso, grupoBase: item.name, ordenBase: i * 10, visible: true })) })
    } else if (item.href) {
      huecos.push({ tipo: 'directo', nombre: item.name, icon: item.icon, personalizado: false, paginas: [{ name: item.name, href: item.href, icon: item.icon, subtitle: item.subtitle, permiso: item.permiso, grupoBase: '', ordenBase: 0, visible: true }] })
    }
  })
  personalizadas.forEach((p) => {
    huecos.push({ tipo: 'grupo', nombre: p.nombre, icon: p.icono, personalizado: true, paginas: p.items.map((s, i) => ({ name: s.nombre, href: s.href, icon: s.icon, subtitle: s.subtitle, permiso: s.permiso, grupoBase: p.nombre, ordenBase: i * 10, visible: true })) })
  })

  // 2. A qué menú va cada página. Si una misma ruta aparece dos veces, solo la primera se puede mover
  const destino = new Map<string, { pagina: PaginaArmada; orden: number }[]>()
  const vistas = new Set<string>()
  const poner = (grupo: string, pagina: PaginaArmada, orden: number) => {
    const lista = destino.get(grupo) ?? []
    lista.push({ pagina, orden })
    destino.set(grupo, lista)
  }
  for (const hueco of huecos) {
    for (const pagina of hueco.paginas) {
      const movible = !vistas.has(pagina.href)
      vistas.add(pagina.href)
      const o = movible ? org.get(pagina.href) : undefined
      let grupo = o ? o.grupo : pagina.grupoBase
      // Solo los enlaces directos de origen pueden quedar sin menú
      if (grupo === '' && pagina.grupoBase !== '') grupo = pagina.grupoBase
      const visible = o ? o.visible : true
      if (!visible && !incluirOcultas) continue
      poner(grupo, { ...pagina, visible }, o ? o.orden : pagina.ordenBase)
    }
  }
  const ordenadas = (grupo: string) =>
    (destino.get(grupo) ?? []).sort((a, b) => a.orden - b.orden || a.pagina.ordenBase - b.pagina.ordenBase).map((x) => x.pagina)

  // 3. Las entradas en el orden de los huecos; después, los menús nuevos en el orden en que se organizaron
  const entradas: EntradaMenu[] = []
  const nombresConocidos = new Set(huecos.filter((h) => h.tipo === 'grupo').map((h) => h.nombre))
  for (const hueco of huecos) {
    if (hueco.tipo === 'directo') {
      const pagina = (destino.get('') ?? []).find((x) => x.pagina.href === hueco.paginas[0].href)?.pagina
      if (pagina) entradas.push({ tipo: 'directo', pagina })
    } else {
      const paginas = ordenadas(hueco.nombre)
      if (paginas.length || incluirVacios) entradas.push({ tipo: 'grupo', grupo: { name: hueco.nombre, icon: hueco.icon, personalizado: hueco.personalizado, paginas } })
    }
  }
  const nuevos = [...new Set(organizacion.map((o) => o.grupo).filter((g) => g && !nombresConocidos.has(g)))]
  for (const nombre of nuevos) {
    const paginas = ordenadas(nombre)
    if (paginas.length || incluirVacios) entradas.push({ tipo: 'grupo', grupo: { name: nombre, icon: Folder, personalizado: false, paginas } })
  }
  return entradas
}

/** Convierte lo que se ve en la pantalla de organizar en lo que se guarda: solo lo que difiere del código */
export function organizacionDesdeEntradas(entradas: EntradaMenu[]): OrganizacionPagina[] {
  const resultado: OrganizacionPagina[] = []
  const guardar = (p: PaginaArmada, grupo: string, indice: number) => {
    const orden = indice * 10
    if (grupo !== p.grupoBase || orden !== p.ordenBase || !p.visible) resultado.push({ ruta: p.href, grupo, orden, visible: p.visible })
  }
  for (const e of entradas) {
    if (e.tipo === 'directo') guardar(e.pagina, '', 0)
    else e.grupo.paginas.forEach((p, i) => guardar(p, e.grupo.name, i))
  }
  return resultado
}
