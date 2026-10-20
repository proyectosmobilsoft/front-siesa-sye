import { seguridadApi, type AuthRole, type ModuloPermisos, type UsuarioMaster } from '@/api/seguridad'
import { descargarExcel, type CeldaExcel, type HojaExcel } from '@/utils/exportarExcel'
import { organizarPorSidebar } from '@/components/maestros/permisosSidebar'
import type { EntradaMenu } from '@/config/organizarMenu'
import { formatters } from '@/utils/formatters'

/** Fecha de hoy local como AAAA-MM-DD, para el nombre de los archivos */
const hoy = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Excel de usuarios completo: TODOS los usuarios, activos e inactivos (no solo los que muestra el filtro de la
 * pantalla), con su rol, centros, estado y último acceso, más una hoja aparte con los conductores y su
 * maquinaria y forma de pago.
 */
export async function exportarUsuariosCompleto(): Promise<void> {
  const TAM = 100
  const primera = await seguridadApi.listarUsuarios(1, TAM)
  const usuarios: UsuarioMaster[] = [...(primera.data ?? [])]
  const paginas = primera.pagination?.totalPages ?? Math.ceil((primera.total ?? usuarios.length) / TAM)
  for (let p = 2; p <= paginas; p++) usuarios.push(...((await seguridadApi.listarUsuarios(p, TAM)).data ?? []))

  const [roles, conductores] = await Promise.all([
    seguridadApi.listarRoles().then((r) => r.data ?? []).catch(() => [] as AuthRole[]),
    seguridadApi.listarConductores().then((r) => r.data ?? []).catch(() => [] as UsuarioMaster[]),
  ])
  const nombreRol = new Map(roles.map((r) => [r.id, r.nombre]))
  const conductorPorId = new Map(conductores.map((c) => [c.id, c]))

  const rolDe = (u: UsuarioMaster) => (u.roles ?? []).map((r) => r.nombre ?? nombreRol.get(r.id) ?? `Rol ${r.id}`).join(', ')
  const centrosDe = (u: UsuarioMaster) => (u.centros_operacion?.length ? u.centros_operacion : u.centro_operacion_codigo ? [u.centro_operacion_codigo] : []).map((c) => c.trim()).join(', ')
  const fecha = (valor?: string | null) => (valor ? formatters.dateTime(valor) : '')
  const ordenados = [...usuarios].sort((a, b) => a.usuario.localeCompare(b.usuario))

  const hojas: HojaExcel[] = [
    {
      nombre: 'Usuarios',
      columnas: [
        { titulo: 'Usuario', clave: 'usuario', ancho: 18 }, { titulo: 'Nombre completo', clave: 'nombre', ancho: 32 }, { titulo: 'Correo', clave: 'email', ancho: 30 },
        { titulo: 'Teléfono', clave: 'telefono', ancho: 16 }, { titulo: 'Rol', clave: 'rol', ancho: 26 }, { titulo: 'C.O.', clave: 'co', ancho: 10 },
        { titulo: 'Estado', clave: 'estado', ancho: 11 }, { titulo: 'Conductor', clave: 'conductor', ancho: 11 }, { titulo: 'Último acceso', clave: 'acceso', ancho: 20 },
        { titulo: 'Intentos fallidos', clave: 'intentos', ancho: 10 }, { titulo: 'Usuario SIESA', clave: 'siesa', ancho: 24 }, { titulo: 'Creado', clave: 'creado', ancho: 20 },
      ],
      filas: ordenados.map((u) => ({
        usuario: u.usuario, nombre: u.nombre_completo ?? '', email: u.email ?? '', telefono: u.telefono ?? '', rol: rolDe(u), co: centrosDe(u),
        estado: u.activo ? 'Activo' : 'Inactivo', conductor: conductorPorId.has(u.id) ? 'Sí' : 'No', acceso: fecha(u.ultimo_acceso),
        intentos: u.intentos_fallidos ?? 0, siesa: u.siesa_nombre ?? '', creado: fecha(u.created_at),
      })),
    },
    {
      nombre: 'Conductores',
      columnas: [
        { titulo: 'Usuario', clave: 'usuario', ancho: 18 }, { titulo: 'Nombre completo', clave: 'nombre', ancho: 32 }, { titulo: 'Rol', clave: 'rol', ancho: 26 },
        { titulo: 'C.O.', clave: 'co', ancho: 10 }, { titulo: 'Estado', clave: 'estado', ancho: 11 }, { titulo: 'Placa en uso', clave: 'placa', ancho: 14 },
        { titulo: 'Maquinaria asignada', clave: 'maquinarias', ancho: 40 }, { titulo: 'Forma de pago', clave: 'pago', ancho: 20 }, { titulo: 'Teléfono', clave: 'telefono', ancho: 16 },
      ],
      filas: ordenados.filter((u) => conductorPorId.has(u.id)).map((u) => {
        const c = conductorPorId.get(u.id)!
        const maquinarias = c.maquinarias ?? []
        const enUso = maquinarias.find((m) => m.en_uso)
        return {
          usuario: u.usuario, nombre: u.nombre_completo ?? '', rol: rolDe(u), co: centrosDe(u), estado: u.activo ? 'Activo' : 'Inactivo',
          placa: enUso?.placa ?? c.maquinaria_placa ?? '',
          maquinarias: maquinarias.map((m) => [m.placa, m.categoria].filter(Boolean).join(' · ')).join(', '),
          pago: c.forma_pago ?? u.forma_pago ?? '', telefono: u.telefono ?? '',
        }
      }),
    },
  ]
  await descargarExcel(`usuarios_completo_${hoy()}`, hojas)
}

/**
 * Excel de roles y permisos, con los permisos organizados como el menú (Menú ▸ Submenú ▸ Acción): una hoja
 * resumen de roles, una lista de cada permiso de cada rol (para filtrar) y una matriz permisos × roles
 * para comparar perfiles de un vistazo.
 */
export async function exportarRolesYPermisos(roles: AuthRole[], modulos: ModuloPermisos[], menu: EntradaMenu[]): Promise<void> {
  const catalogo = organizarPorSidebar(modulos, { menu }).flatMap((m) =>
    m.permisos.map((p) => ({ codigo: p.codigo, menu: m.grupoMenu, submenu: m.nombre, accion: p.tipo === 'VISTA' ? 'Entrar a la pantalla' : p.etiqueta })))
  const porCodigo = new Map(catalogo.map((p) => [p.codigo, p]))
  const orden = new Map(catalogo.map((p, i) => [p.codigo, i]))
  const info = (codigo: string) => porCodigo.get(codigo) ?? { codigo, menu: 'Otros', submenu: 'Sin clasificar', accion: codigo }

  const rolesOrdenados = [...roles].sort((a, b) => a.nombre.localeCompare(b.nombre))
  const permisosDe = (r: AuthRole) => [...(r.permisos ?? [])].sort((a, b) => (orden.get(a.codigo) ?? 1e6) - (orden.get(b.codigo) ?? 1e6))
  // Igual que la tabla de Roles: cualquier valor verdadero es activo (el API devuelve 1/0 o true/false según el caso)
  const activo = (r: AuthRole) => (r.estado ? 'Activo' : 'Inactivo')

  const filasRol = (r: AuthRole): Record<string, CeldaExcel>[] => permisosDe(r).map((p) => { const i = info(p.codigo); return { rol: r.nombre, menu: i.menu, submenu: i.submenu, accion: i.accion, codigo: p.codigo } })
  const matriz = [...catalogo, ...[...new Set(roles.flatMap((r) => (r.permisos ?? []).map((p) => p.codigo)))].filter((c) => !porCodigo.has(c)).map((c) => info(c))]

  const hojas: HojaExcel[] = [
    {
      nombre: 'Roles',
      columnas: [{ titulo: 'Rol', clave: 'rol', ancho: 32 }, { titulo: 'Estado', clave: 'estado', ancho: 11 }, { titulo: 'Acceso con', clave: 'acceso', ancho: 14 }, { titulo: 'Permisos', clave: 'n', ancho: 10 }, { titulo: 'Menús con acceso', clave: 'menus', ancho: 60 }],
      filas: rolesOrdenados.map((r) => ({
        rol: r.nombre, estado: activo(r), acceso: r.pin ? 'PIN' : 'Contraseña', n: (r.permisos ?? []).length,
        menus: [...new Set(permisosDe(r).map((p) => info(p.codigo).menu))].join(', '),
      })),
    },
    {
      nombre: 'Permisos por rol',
      columnas: [{ titulo: 'Rol', clave: 'rol', ancho: 32 }, { titulo: 'Menú', clave: 'menu', ancho: 18 }, { titulo: 'Submenú', clave: 'submenu', ancho: 34 }, { titulo: 'Acción', clave: 'accion', ancho: 34 }, { titulo: 'Código', clave: 'codigo', ancho: 38 }],
      filas: rolesOrdenados.flatMap(filasRol),
    },
    {
      nombre: 'Matriz',
      columnas: [{ titulo: 'Menú', clave: 'menu', ancho: 18 }, { titulo: 'Submenú', clave: 'submenu', ancho: 34 }, { titulo: 'Acción', clave: 'accion', ancho: 30 }, { titulo: 'Código', clave: 'codigo', ancho: 38 },
        ...rolesOrdenados.map((r, i) => ({ titulo: r.nombre, clave: `r${i}`, ancho: Math.max(12, Math.min(22, r.nombre.length + 2)) }))],
      filas: matriz.map((p) => {
        const fila: Record<string, CeldaExcel> = { menu: p.menu, submenu: p.submenu, accion: p.accion, codigo: p.codigo }
        rolesOrdenados.forEach((r, i) => { fila[`r${i}`] = (r.permisos ?? []).some((x) => x.codigo === p.codigo) ? '✓' : '' })
        return fila
      }),
    },
  ]
  await descargarExcel(`roles_y_permisos_${hoy()}`, hojas)
}
