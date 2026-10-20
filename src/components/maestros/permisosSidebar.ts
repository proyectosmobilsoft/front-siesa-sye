import { navigation, LOGISTICA } from '@/config/navigation'
import { armarMenu, type EntradaMenu } from '@/config/organizarMenu'
import { PERMISOS } from '@/config/permisos'
import type { ModuloPermisos, PermisoDeModulo } from '@/api/seguridad'

/**
 * Reorganiza el catálogo de permisos con la misma estructura del sidebar
 * (Comercial, Tesorería, Maestros…), para que en Roles se busque donde se
 * ve el menú y no por los nombres internos de auth_modulos.
 *
 * Solo cambia la presentación: ids y códigos de permisos quedan intactos.
 */
export interface ModuloMenu extends ModuloPermisos {
    /** Grupo del sidebar al que pertenece (o "Otros") */
    grupoMenu: string
    /** Posición del grupo en el sidebar, para ordenar */
    ordenGrupo: number
    /** Posición de la página dentro del sidebar (módulos sin página van al final del grupo) */
    ordenItem: number
    /** Páginas del sidebar que abre este módulo (solo con dividir: false) */
    paginas?: string
}

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

interface EntradaPermiso { grupo: string; ordenGrupo: number; ordenItem: number; items: string[] }

const ORDEN_OTROS = 9999

/** Menú del código sin organizar ni secciones personalizadas: lo que se usa si nadie pasa el menú armado */
const MENU_DEL_CODIGO = armarMenu(navigation, [], [], { incluirVacios: true })

/**
 * Mapas del menú armado: permiso → página donde aparece (un permiso puede abrir varias páginas) y
 * menús por nombre. Se calculan con el menú que se le pasa, así lo que el administrador organiza
 * (mover una página de menú, crear un menú) se refleja también al armar un rol.
 */
function construirMapas(entradas: EntradaMenu[]) {
    const porPermiso = new Map<string, EntradaPermiso>()
    const gruposMenu = new Map<string, { nombre: string; orden: number }>()
    entradas.forEach((e, ordenGrupo) => {
        if (e.tipo !== 'grupo') return
        gruposMenu.set(sinAcentos(e.grupo.name), { nombre: e.grupo.name, orden: ordenGrupo })
        e.grupo.paginas.forEach((p, ordenItem) => {
            if (!p.permiso) return
            const previa = porPermiso.get(p.permiso)
            if (previa) previa.items.push(p.name)
            else porPermiso.set(p.permiso, { grupo: e.grupo.name, ordenGrupo, ordenItem, items: [p.name] })
        })
    })
    // Las páginas de Logística siguen agrupadas aparte aunque su sección no exista para este usuario
    const ordenLogistica = (gruposMenu.get('logistica')?.orden ?? (gruposMenu.get('tesoreria')?.orden ?? 0) + 0.5)
    if (!gruposMenu.has('logistica')) gruposMenu.set('logistica', { nombre: 'Logística', orden: ordenLogistica })
    LOGISTICA.forEach((item, ordenItem) => {
        if (!item.permiso || porPermiso.has(item.permiso)) return
        porPermiso.set(item.permiso, { grupo: 'Logística', ordenGrupo: ordenLogistica, ordenItem, items: [item.name] })
    })
    // Dashboard es un enlace directo del sidebar (sin permiso en navigation.ts)
    porPermiso.set(PERMISOS.DASHBOARD, { grupo: 'Dashboard', ordenGrupo: -1, ordenItem: 0, items: ['Dashboard'] })
    return { porPermiso, gruposMenu }
}

/**
 * `dividir: true` (Roles) parte los módulos por página del sidebar y reparte "Sin clasificar".
 * `dividir: false` (maestro de Módulos) deja cada módulo de BD entero, para poder
 * editarlo y borrarlo; solo lo ubica y ordena según el sidebar.
 */
export function organizarPorSidebar(modulos: ModuloPermisos[], { dividir = true, menu = MENU_DEL_CODIGO }: { dividir?: boolean; menu?: EntradaMenu[] } = {}): ModuloMenu[] {
    const { porPermiso, gruposMenu } = construirMapas(menu)
    const grupoDeBd = (m: ModuloPermisos): { nombre: string; orden: number } => {
        // Grupo guardado en BD cuando coincide con un menú del sidebar
        const g = m.grupo ? gruposMenu.get(sinAcentos(m.grupo)) : undefined
        if (g) return g
        return { nombre: m.grupo || 'Otros', orden: ORDEN_OTROS }
    }
    const resultado: ModuloMenu[] = []

    for (const m of modulos) {
        if (!dividir) {
            const entradas = m.permisos.map((p) => porPermiso.get(p.codigo)).filter((e): e is EntradaPermiso => !!e)
            const principal = entradas[0]
            const grupo = principal ? { nombre: principal.grupo, orden: principal.ordenGrupo } : m.id === null ? { nombre: 'Otros', orden: ORDEN_OTROS } : grupoDeBd(m)
            const paginas = [...new Set(entradas.flatMap((e) => e.items))].join(', ')
            resultado.push({ ...m, grupoMenu: grupo.nombre, ordenGrupo: grupo.orden, ordenItem: principal ? principal.ordenItem : ORDEN_OTROS, paginas })
            continue
        }
        if (m.id !== null) {
            // Un módulo de BD puede abrir varias páginas del sidebar (p. ej. Reportes
            // tiene un VISTA por página): cada VISTA con página propia es un módulo.
            const anclas = m.permisos.filter((p) => p.tipo === 'VISTA' && porPermiso.has(p.codigo))
            if (anclas.length === 0) {
                // Sin página en el sidebar: se queda con su nombre y su grupo de BD
                const g = m.permisos.map((p) => porPermiso.get(p.codigo)).find(Boolean)
                const grupo = g ? { nombre: g.grupo, orden: g.ordenGrupo } : grupoDeBd(m)
                resultado.push({ ...m, grupoMenu: grupo.nombre, ordenGrupo: grupo.orden, ordenItem: g ? g.ordenItem : ORDEN_OTROS })
                continue
            }
            const resto = m.permisos.filter((p) => !anclas.includes(p))
            anclas.forEach((ancla, i) => {
                const e = porPermiso.get(ancla.codigo)!
                resultado.push({
                    ...m, codigo: anclas.length > 1 ? `${m.codigo}__${ancla.codigo}` : m.codigo,
                    nombre: e.items.join(' / '), grupo: e.grupo,
                    permisos: i === 0 ? [ancla, ...resto] : [ancla],
                    grupoMenu: e.grupo, ordenGrupo: e.ordenGrupo, ordenItem: e.ordenItem,
                })
            })
            continue
        }
        // "Sin clasificar": los permisos que sí tienen página en el sidebar salen
        // como módulo de esa página (p. ej. Tesorería › Parámetros RC)
        const virtuales = new Map<string, { entrada: EntradaPermiso; permisos: PermisoDeModulo[] }>()
        const resto: PermisoDeModulo[] = []
        for (const p of m.permisos) {
            const e = porPermiso.get(p.codigo)
            if (!e) { resto.push(p); continue }
            const clave = `${e.grupo}|${e.items.join('/')}`
            const v = virtuales.get(clave) ?? { entrada: e, permisos: [] }
            v.permisos.push(p)
            virtuales.set(clave, v)
        }
        for (const [clave, v] of virtuales) {
            resultado.push({
                id: null, codigo: `MENU_${clave}`, nombre: v.entrada.items.join(' / '), grupo: v.entrada.grupo,
                icono: null, orden: 0, estado: true, permisos: v.permisos,
                grupoMenu: v.entrada.grupo, ordenGrupo: v.entrada.ordenGrupo, ordenItem: v.entrada.ordenItem,
            })
        }
        if (resto.length) resultado.push({ ...m, permisos: resto, grupoMenu: 'Otros', ordenGrupo: ORDEN_OTROS, ordenItem: ORDEN_OTROS })
    }

    return resultado.sort((a, b) => a.ordenGrupo - b.ordenGrupo || a.ordenItem - b.ordenItem || a.orden - b.orden || a.nombre.localeCompare(b.nombre))
}

/** Agrupa los módulos ya ordenados por menú (grupo del sidebar), respetando el orden en que vienen */
export function agruparPorMenu<T extends { grupoMenu: string }>(modulos: T[]): { menu: string; modulos: T[] }[] {
    const grupos: { menu: string; modulos: T[] }[] = []
    for (const m of modulos) {
        const ultimo = grupos[grupos.length - 1]
        if (ultimo && ultimo.menu === m.grupoMenu) ultimo.modulos.push(m)
        else grupos.push({ menu: m.grupoMenu, modulos: [m] })
    }
    return grupos
}
