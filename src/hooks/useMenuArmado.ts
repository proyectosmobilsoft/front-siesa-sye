import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppWindow } from 'lucide-react'
import { navigation, paginasDelSistema } from '@/config/navigation'
import { armarMenu, type EntradaMenu, type OpcionesArmado, type SeccionPersonalizada } from '@/config/organizarMenu'
import { iconoMenu } from '@/config/iconosMenu'
import { menuOrganizacionApi, MENU_ORGANIZACION_KEY } from '@/api/menuOrganizacion'
import { menuPersonalizadoApi, MENU_PERSONALIZADO_KEY } from '@/api/menuPersonalizado'
import { useAuthStore } from '@/store/authStore'

/**
 * El menú lateral ya armado: menú del código + secciones personalizadas + lo que el administrador
 * organizó. Lo usan el Sidebar, la pantalla de organizar y las pantallas de permisos, para que
 * todas vean el mismo menú.
 */
export function useMenuArmado(opciones: OpcionesArmado = {}): { entradas: EntradaMenu[]; cargando: boolean } {
  const sesion = useAuthStore((s) => s.sesion)
  const organizacion = useQuery({ queryKey: MENU_ORGANIZACION_KEY, queryFn: menuOrganizacionApi.listar, enabled: !!sesion, retry: false, staleTime: 60_000 })
  const personalizado = useQuery({ queryKey: MENU_PERSONALIZADO_KEY, queryFn: menuPersonalizadoApi.menu, enabled: !!sesion, retry: false, staleTime: 60_000 })

  const { incluirVacios = false, incluirOcultas = false } = opciones
  const entradas = useMemo(() => {
    // Una página del sistema dentro de una sección personalizada hereda el permiso de esa página
    const permisoDe = new Map(paginasDelSistema().flatMap((g) => g.paginas.map((p) => [p.href, p.permiso] as const)))
    const secciones: SeccionPersonalizada[] = (personalizado.data ?? []).map((m) => ({
      nombre: m.nombre,
      icono: iconoMenu(m.icono),
      items: m.items.map((i) => ({
        nombre: i.nombre,
        href: i.modo === 'interno' ? i.url : `/personalizado/${i.id}`,
        icon: AppWindow,
        subtitle: m.nombre,
        permiso: i.modo === 'interno' ? permisoDe.get(i.url) : undefined,
      })),
    }))
    return armarMenu(navigation, secciones, organizacion.data ?? [], { incluirVacios, incluirOcultas })
  }, [personalizado.data, organizacion.data, incluirVacios, incluirOcultas])

  return { entradas, cargando: organizacion.isLoading || personalizado.isLoading }
}
