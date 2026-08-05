import { useState, useEffect, useRef, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { seguridadApi, AuthRole, UsuarioMaster, SiesaUsuario, rolTieneModuloConductor } from '@/api/seguridad'
import { paisesApi, Pais } from '@/api/paises'
import { maquinariaApi, Maquinaria } from '@/api/maquinaria'
import { ChevronDown, Loader2, CheckCircle2, XCircle, RefreshCw, Copy } from 'lucide-react'

/**
 * Genera combinaciones de usuario a partir de nombre completo.
 * Ej: "Emmanuel Monroy" → ["emonroy", "emmanuelm", "emmaroy", "monroye", "emmanuel.monroy", ...]
 */
function generarCombinacionesUsuario(nombreCompleto: string): string[] {
    const partes = nombreCompleto
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
        .replace(/[^a-z\s]/g, '') // solo letras y espacios
        .trim()
        .split(/\s+/)
        .filter(p => p.length > 0)

    if (partes.length === 0) return []

    const combinaciones: string[] = []

    if (partes.length === 1) {
        // Solo un nombre
        const n = partes[0]
        combinaciones.push(n)
        if (n.length > 3) combinaciones.push(n.slice(0, 3) + '1')
        return combinaciones
    }

    const nombre = partes[0]
    const apellido = partes[partes.length - 1]
    // Si hay segundo nombre
    const segundoNombre = partes.length > 2 ? partes[1] : null

    // Combinaciones principales
    combinaciones.push(nombre[0] + apellido)                          // emonroy
    combinaciones.push(nombre + apellido[0])                          // emmanuelm
    combinaciones.push(nombre.slice(0, 4) + apellido.slice(0, 3))    // emmaroy (si aplica)
    combinaciones.push(apellido + nombre[0])                          // monroye
    combinaciones.push(nombre + '.' + apellido)                       // emmanuel.monroy
    combinaciones.push(nombre + apellido)                             // emmanuelmonroy
    combinaciones.push(apellido + nombre)                             // monroyemmanuel
    if (segundoNombre) {
        combinaciones.push(nombre[0] + segundoNombre[0] + apellido)  // eamonroy (si tiene 2do nombre)
    }
    // Con números
    combinaciones.push(nombre[0] + apellido + '1')
    combinaciones.push(nombre + apellido[0] + '1')

    // Filtrar duplicados y vacíos
    return [...new Set(combinaciones.filter(c => c.length >= 3))]
}

interface UserFormModalProps {
    isOpen: boolean
    onClose: () => void
    user?: UsuarioMaster // If editing, pass the user object
}

/**
 * Encabezado de sección del formulario. Agrupa campos relacionados para que el
 * modal no se lea como una lista plana de inputs: el ojo ancla en el título y
 * la línea separa visualmente cada bloque.
 */
const SeccionTitulo = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-3">
        <h3 className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {children}
        </h3>
        <div className="h-px flex-1 bg-border" />
    </div>
)

/** Etiqueta de campo, con marca opcional de obligatorio. */
const Etiqueta = ({ children, requerido }: { children: React.ReactNode; requerido?: boolean }) => (
    <label className="text-sm font-medium">
        {children}
        {requerido && <span className="ml-0.5 text-destructive">*</span>}
    </label>
)

export const UserFormModal = ({ isOpen, onClose, user }: UserFormModalProps) => {
    const isEditing = !!user

    // Form states
    const [name, setName] = useState(user?.nombre_completo || '')
    const [email, setEmail] = useState(user?.email || '')
    const [codigoPais, setCodigoPais] = useState('+57')
    const [telefono, setTelefono] = useState('')
    const [roleId, setRoleId] = useState<number | null>(user?.rol_id || null)
    const [credencial, setCredencial] = useState('')
    const [password, setPassword] = useState('')
    const [usuario, setUsuario] = useState('')
    const [usuarioStatus, setUsuarioStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
    const [generandoUsuario, setGenerandoUsuario] = useState(false)
    const [roles, setRoles] = useState<AuthRole[]>([])
    const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [loadingRoles, setLoadingRoles] = useState(false)
    const [paises, setPaises] = useState<Pais[]>([])
    const [loadingPaises, setLoadingPaises] = useState(false)
    const [showCodigoDropdown, setShowCodigoDropdown] = useState(false)
    const [codigoSearch, setCodigoSearch] = useState('')
    const codigoRef = useRef<HTMLDivElement>(null)
    const [loadingUser, setLoadingUser] = useState(false)
    const [observaciones, setObservaciones] = useState('')
    const [formaPago, setFormaPago] = useState('')

    // Siesa usuario
    const [siesaSearch, setSiesaSearch] = useState('')
    const [siesaOptions, setSiesaOptions] = useState<SiesaUsuario[]>([])
    const [siesaLoading, setSiesaLoading] = useState(false)
    const [siesaSelected, setSiesaSelected] = useState<SiesaUsuario | null>(null)
    const [showSiesaDropdown, setShowSiesaDropdown] = useState(false)
    const siesaRef = useRef<HTMLDivElement>(null)
    const siesaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Maquinaria asignada — se muestra bajo la misma condición que "Forma de pago"
    // (rol con MODULO_CONDUCTOR), porque solo aplica a conductores.
    const [maqSearch, setMaqSearch] = useState('')
    const [maqOptions, setMaqOptions] = useState<Maquinaria[]>([])
    const [maqLoading, setMaqLoading] = useState(false)
    const [maqSelected, setMaqSelected] = useState<Maquinaria | null>(null)
    const [showMaqDropdown, setShowMaqDropdown] = useState(false)
    const maqRef = useRef<HTMLDivElement>(null)
    const maqDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Determinar si el rol seleccionado usa PIN
    const rolSeleccionado = roles.find(r => r.id === roleId)
    const requierePin = rolSeleccionado?.pin === true

    // Cargar roles y países al abrir el modal
    useEffect(() => {
        if (isOpen) {
            loadRoles()
            loadPaises()
            // Resetear estados si es nuevo usuario
            if (!isEditing) {
                setName('')
                setEmail('')
                setCodigoPais('+57')
                setTelefono('')
                setRoleId(null)
                setCredencial('')
                setPassword('')
                setUsuario('')
                setUsuarioStatus('idle')
                setObservaciones('')
                setFormaPago('')
                setSiesaSearch('')
                setSiesaOptions([])
                setSiesaSelected(null)
                setMaqSearch('')
                setMaqOptions([])
                setMaqSelected(null)
            } else {
                // Cargar datos básicos del objeto de la tabla
                setName(user?.nombre_completo || '')
                setEmail(user?.email || '')
                setUsuario(user?.usuario || '')
                setUsuarioStatus('idle')
                setCredencial('')
                setPassword('')
                setObservaciones(user?.observaciones || '')
                setFormaPago(user?.forma_pago || '')

                // Inicializar vinculación SIESA
                if (user?.siesa_rowid && user?.siesa_nombre) {
                    setSiesaSelected({
                        f552_rowid: user.siesa_rowid,
                        f552_nombre: user.siesa_nombre,
                        f552_descripcion: '',
                        f552_correo_electronico: null,
                        f552_esactivo: 1,
                        f552_ind_estado: 1,
                    })
                } else {
                    setSiesaSelected(null)
                    setSiesaSearch('')
                }

                // Inicializar maquinaria asignada. Solo se guardan cod/placa/categoría,
                // así que se reconstruye un objeto parcial y el resto se completa
                // cuando llega el listado.
                if (user?.maquinaria_cod) {
                    setMaqSelected({
                        Cod_Equipo: user.maquinaria_cod,
                        PLACA: user.maquinaria_placa || 'Sin Placa',
                        CATEGORIA: user.maquinaria_categoria || 'Ninguno',
                    } as Maquinaria)
                    setMaqSearch('')
                } else {
                    setMaqSelected(null)
                    setMaqSearch('')
                }

                // Separar código de país y teléfono
                const telefonoCompleto = user?.telefono || ''
                const matchCodigo = telefonoCompleto.match(/^(\+\d{1,3})/)
                if (matchCodigo) {
                    setCodigoPais(matchCodigo[1])
                    setTelefono(telefonoCompleto.replace(matchCodigo[1], '').trim())
                } else {
                    setCodigoPais('+57')
                    setTelefono(telefonoCompleto)
                }

                // rol_id desde roles[0] (API devuelve roles del usuario) o rol_id directo
                const userRolId = user?.roles?.[0]?.id ?? user?.rol_id
                if (userRolId) {
                    setRoleId(userRolId)
                }

                // Siempre traer el detalle completo: la fila de la tabla puede venir
                // sin rol_id y/o sin la vinculación SIESA, y sin esto el campo
                // "Usuario de Siesa" aparecía vacío al editar aunque el usuario
                // sí estuviera vinculado.
                if (user?.usuario) {
                    loadUserDetails(user.usuario)
                }
            }
        }
    }, [isOpen, user?.id, isEditing, user])

    const loadUserDetails = async (username: string) => {
        try {
            setLoadingUser(true)
            const fullUser = await seguridadApi.obtenerUsuario(username)
            console.log('👤 Detalles del usuario:', JSON.stringify(fullUser, null, 2))
            if (fullUser?.rol_id) {
                setRoleId(fullUser.rol_id)
            }
            if (fullUser?.nombre_completo && !name) setName(fullUser.nombre_completo)
            if (fullUser?.email && !email) setEmail(fullUser.email)
            if (fullUser?.observaciones !== undefined) setObservaciones(fullUser.observaciones || '')
            if (fullUser?.forma_pago !== undefined) setFormaPago(fullUser.forma_pago || '')
            if (fullUser?.siesa_rowid && fullUser?.siesa_nombre) {
                setSiesaSelected({
                    f552_rowid: fullUser.siesa_rowid,
                    f552_nombre: fullUser.siesa_nombre,
                    f552_descripcion: '',
                    f552_correo_electronico: null,
                    f552_esactivo: 1,
                    f552_ind_estado: 1,
                })
                setSiesaSearch('')
            }
            if (fullUser?.maquinaria_cod) {
                setMaqSelected({
                    Cod_Equipo: fullUser.maquinaria_cod,
                    PLACA: fullUser.maquinaria_placa || 'Sin Placa',
                    CATEGORIA: fullUser.maquinaria_categoria || 'Ninguno',
                } as Maquinaria)
                setMaqSearch('')
            }
        } catch (err) {
            console.error('Error cargando detalles del usuario:', err)
        } finally {
            setLoadingUser(false)
        }
    }

    const loadRoles = async () => {
        try {
            setLoadingRoles(true)
            const res = await seguridadApi.listarRoles()
            // Filtrar solo roles activos
            const rolesActivos = (res.data || []).filter(rol => !!rol.estado)
            setRoles(rolesActivos)
        } catch (err) {
            console.error('Error cargando roles:', err)
        } finally {
            setLoadingRoles(false)
        }
    }

    const loadPaises = async () => {
        try {
            setLoadingPaises(true)
            const res = await paisesApi.listarPaises()
            setPaises(res.data || [])
        } catch (err) {
            console.error('Error cargando países:', err)
        } finally {
            setLoadingPaises(false)
        }
    }

    // Filtrar países según búsqueda
    const paisesFiltrados = paises.filter(p => {
        if (!codigoSearch) return true
        const search = codigoSearch.toLowerCase()
        // Si la búsqueda es solo números, buscar por phone_code
        if (/^\d+$/.test(codigoSearch)) {
            return p.phone_code.startsWith(codigoSearch)
        }
        // Si es texto, buscar en nombre o código
        return p.nombre.toLowerCase().includes(search) ||
               p.name.toLowerCase().includes(search) ||
               p.iso2.toLowerCase().includes(search) ||
               p.phone_code.includes(codigoSearch)
    })

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (codigoRef.current && !codigoRef.current.contains(event.target as Node)) {
                setShowCodigoDropdown(false)
                setCodigoSearch('')
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Cerrar dropdown Siesa al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (siesaRef.current && !siesaRef.current.contains(event.target as Node)) {
                setShowSiesaDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Cargar/buscar usuarios Siesa con debounce 300ms.
    // Se dispara al abrir el modal (no solo al desplegar el dropdown) para que
    // el listado ya esté disponible de entrada, tanto al crear como al editar.
    useEffect(() => {
        if (siesaDebounceRef.current) clearTimeout(siesaDebounceRef.current)
        if (!isOpen) return
        siesaDebounceRef.current = setTimeout(async () => {
            setSiesaLoading(true)
            try {
                const res = await seguridadApi.listarSiesaUsuarios(siesaSearch || undefined, true)
                setSiesaOptions(res.data || [])
            } catch {
                setSiesaOptions([])
            } finally {
                setSiesaLoading(false)
            }
        }, 300)
        return () => {
            if (siesaDebounceRef.current) clearTimeout(siesaDebounceRef.current)
        }
    }, [siesaSearch, isOpen])

    // Cerrar dropdown de maquinaria al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (maqRef.current && !maqRef.current.contains(event.target as Node)) {
                setShowMaqDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Cargar/buscar maquinaria con debounce 300ms. Solo se pide si el rol es de
    // conductor, que es cuando el campo está visible.
    useEffect(() => {
        if (maqDebounceRef.current) clearTimeout(maqDebounceRef.current)
        if (!isOpen || !rolTieneModuloConductor(rolSeleccionado)) return
        maqDebounceRef.current = setTimeout(async () => {
            setMaqLoading(true)
            try {
                const res = await maquinariaApi.listar(maqSearch || undefined, 1, 500)
                setMaqOptions(res.data || [])
            } catch {
                setMaqOptions([])
            } finally {
                setMaqLoading(false)
            }
        }, 300)
        return () => {
            if (maqDebounceRef.current) clearTimeout(maqDebounceRef.current)
        }
    }, [maqSearch, isOpen, rolSeleccionado])

    // Al editar solo se guardan cod/placa/categoría: cuando llega el listado se
    // reemplaza por el registro completo para mantener una sola fuente de verdad.
    useEffect(() => {
        if (!maqSelected) return
        const completo = maqOptions.find(o => o.Cod_Equipo === maqSelected.Cod_Equipo)
        if (completo && completo !== maqSelected && !maqSelected.SERIE) setMaqSelected(completo)
    }, [maqOptions, maqSelected])

    // Al editar, la vinculación SIESA se reconstruye solo con rowid + nombre
    // (es lo único que guarda auth_usuario). Cuando llega el listado completo
    // se completa la descripción para mostrar la misma etiqueta que en el
    // dropdown en lugar de solo el nombre.
    useEffect(() => {
        if (!siesaSelected || siesaSelected.f552_descripcion) return
        const completo = siesaOptions.find(o => o.f552_rowid === siesaSelected.f552_rowid)
        if (completo) setSiesaSelected(completo)
    }, [siesaOptions, siesaSelected])

    // Limpiar credencial/contraseña si el rol cambia
    useEffect(() => {
        if (!requierePin) {
            setCredencial('')
        } else {
            setPassword('')
        }
    }, [requierePin])

    // Verificar disponibilidad de usuario (con debounce)
    const verificarUsuario = useCallback(async (usr: string) => {
        if (!usr || usr.length < 3) {
            setUsuarioStatus('idle')
            return
        }
        setUsuarioStatus('checking')
        try {
            const res = await seguridadApi.verificarUsuario(usr)
            setUsuarioStatus(res.exists ? 'taken' : 'available')
        } catch {
            setUsuarioStatus('idle')
        }
    }, [])

    // Auto-generar usuario cuando cambia el nombre
    const generarUsuarioAutomatico = useCallback(async (nombreCompleto: string) => {
        const combinaciones = generarCombinacionesUsuario(nombreCompleto)
        if (combinaciones.length === 0) {
            setUsuario('')
            setUsuarioStatus('idle')
            return
        }

        setGenerandoUsuario(true)
        // Probar cada combinación hasta encontrar una disponible
        for (const combo of combinaciones) {
            try {
                const res = await seguridadApi.verificarUsuario(combo)
                if (!res.exists) {
                    setUsuario(combo)
                    setUsuarioStatus('available')
                    setGenerandoUsuario(false)
                    return
                }
            } catch {
                // Si hay error de red, usar la primera combinación
                setUsuario(combo)
                setUsuarioStatus('idle')
                setGenerandoUsuario(false)
                return
            }
        }
        // Si todas están tomadas, usar la primera con un número random
        const fallback = combinaciones[0] + Math.floor(Math.random() * 99 + 1)
        setUsuario(fallback)
        setUsuarioStatus('idle')
        setGenerandoUsuario(false)
        // Verificar el fallback
        verificarUsuario(fallback)
    }, [verificarUsuario])

    // Efecto: cuando el nombre cambia, generar usuario automático (con debounce)
    const nombreDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => {
        if (!isEditing && name.trim().split(/\s+/).length >= 2) {
            if (nombreDebounceRef.current) clearTimeout(nombreDebounceRef.current)
            nombreDebounceRef.current = setTimeout(() => {
                generarUsuarioAutomatico(name)
            }, 600)
        }
        return () => {
            if (nombreDebounceRef.current) clearTimeout(nombreDebounceRef.current)
        }
    }, [name, isEditing, generarUsuarioAutomatico])

    // Verificar usuario cuando se edita manualmente (con debounce)
    const handleUsuarioChange = (valor: string) => {
        const limpio = valor.toLowerCase().replace(/[^a-z0-9._]/g, '')
        setUsuario(limpio)
        setUsuarioStatus('idle')
        if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)
        if (limpio.length >= 3) {
            checkTimeoutRef.current = setTimeout(() => {
                verificarUsuario(limpio)
            }, 500)
        }
    }

    // Regenerar usuario manualmente
    const handleRegenerar = () => {
        if (name.trim().split(/\s+/).length >= 2) {
            generarUsuarioAutomatico(name)
        }
    }

    const handleSave = async () => {
        // Construir teléfono completo con código de país
        const telefonoCompleto = telefono.trim() 
            ? `${codigoPais}${telefono.trim()}` 
            : null

        if (!usuario || !roleId) return

        if (isEditing && user?.id) {
            // --- MODO EDICIÓN (PATCH) ---
            const payload: Record<string, any> = {}

            // Solo enviar campos que cambiaron
            if (name.trim() !== (user.nombre_completo || '')) {
                payload.nombre_completo = name.trim() || null
            }
            if (email.trim() !== (user.email || '')) {
                payload.email = email.trim() || null
            }
            if (telefonoCompleto !== (user.telefono || null)) {
                payload.telefono = telefonoCompleto
            }
            if (roleId !== user.rol_id) {
                payload.rol_id = roleId
            }
            if (usuario !== user.usuario) {
                payload.usuario = usuario
            }
            if (observaciones.trim() !== (user.observaciones || '')) {
                payload.observaciones = observaciones.trim() || null
            }
            const valorFormaPago = rolTieneModuloConductor(rolSeleccionado)
                ? formaPago.trim() || null
                : null
            const formaAnterior = user.forma_pago ?? null
            if (valorFormaPago !== formaAnterior) {
                payload.forma_pago = valorFormaPago
            }
            // Credencial: PIN o contraseña según el rol
            const credencialValor = requierePin ? credencial : password
            if (credencialValor) {
                payload.credencial = credencialValor
            }

            // SIESA: enviar si cambió
            const siesaRowidActual = siesaSelected?.f552_rowid ?? null
            const siesaNombreActual = siesaSelected?.f552_nombre ?? null
            if (siesaRowidActual !== (user.siesa_rowid ?? null)) {
                payload.siesa_rowid = siesaRowidActual
                payload.siesa_nombre = siesaNombreActual
            }

            // Maquinaria: igual que forma_pago, solo aplica a roles de conductor.
            // Si el rol dejó de serlo, se limpia la asignación.
            const maqCodActual = rolTieneModuloConductor(rolSeleccionado)
                ? maqSelected?.Cod_Equipo ?? null
                : null
            if (maqCodActual !== (user.maquinaria_cod ?? null)) {
                payload.maquinaria_cod = maqCodActual
                payload.maquinaria_placa = maqCodActual ? maqSelected?.PLACA ?? null : null
                payload.maquinaria_categoria = maqCodActual ? maqSelected?.CATEGORIA ?? null : null
            }

            console.log('📤 JSON enviado a PATCH /auth-secundario/usuarios/' + user.id + ':')
            console.log(JSON.stringify(payload, null, 2))

            // Si no hay cambios, cerrar sin llamar al API
            if (Object.keys(payload).length === 0) {
                console.log('ℹ️ Sin cambios, cerrando modal')
                onClose()
                return
            }

            try {
                const response = await seguridadApi.actualizarUsuario(user.id, payload)
                console.log('✅ Respuesta del servidor:', JSON.stringify(response, null, 2))
                onClose()
            } catch (err: any) {
                console.error('❌ Error actualizando usuario:', err)
                if (err?.response) {
                    console.error('📋 Status:', err.response.status)
                    console.error('📋 Response data:', JSON.stringify(err.response.data, null, 2))
                }
            }
        } else {
            // --- MODO CREACIÓN (POST) ---
            const credencialValor = requierePin ? credencial : password
            const payload = {
                usuario,
                rol_id: roleId,
                credencial: credencialValor || undefined,
                email: email.trim() || null,
                telefono: telefonoCompleto,
                nombre_completo: name.trim() || null,
                observaciones: observaciones.trim() || null,
                forma_pago: rolTieneModuloConductor(rolSeleccionado)
                    ? formaPago.trim() || null
                    : null,
                activo: true,
                siesa_rowid: siesaSelected?.f552_rowid ?? null,
                siesa_nombre: siesaSelected?.f552_nombre ?? null,
                maquinaria_cod: rolTieneModuloConductor(rolSeleccionado) ? maqSelected?.Cod_Equipo ?? null : null,
                maquinaria_placa: rolTieneModuloConductor(rolSeleccionado) ? maqSelected?.PLACA ?? null : null,
                maquinaria_categoria: rolTieneModuloConductor(rolSeleccionado) ? maqSelected?.CATEGORIA ?? null : null,
            }

            console.log('📤 JSON enviado a POST /auth-secundario/usuarios:')
            console.log(JSON.stringify(payload, null, 2))

            try {
                const response = await seguridadApi.crearUsuario(payload)
                console.log('✅ Respuesta del servidor:', JSON.stringify(response, null, 2))
                onClose()
            } catch (err: any) {
                console.error('❌ Error creando usuario:', err)
                if (err?.response) {
                    console.error('📋 Status:', err.response.status)
                    console.error('📋 Response data:', JSON.stringify(err.response.data, null, 2))
                }
            }
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
            className="max-w-5xl"
        >
            <div className="mt-2 space-y-7">
                {/* ─── Información personal ─── */}
                <SeccionTitulo>Información personal</SeccionTitulo>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                        <Etiqueta requerido>Nombre Completo</Etiqueta>
                        <Input
                            placeholder="Ej. Juan Pérez"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Etiqueta>Correo Electrónico</Etiqueta>
                        <Input
                            type="email"
                            placeholder="juan@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Etiqueta>Celular</Etiqueta>
                        <div className="flex gap-1.5 items-center">
                            <div ref={codigoRef} className="relative w-20 shrink-0">
                                <div className="relative">
                                    <Input
                                        placeholder="+57"
                                        value={showCodigoDropdown ? codigoSearch : codigoPais}
                                        onChange={(e) => {
                                            const valor = e.target.value
                                            setCodigoSearch(valor)
                                            setShowCodigoDropdown(true)
                                            const paisExacto = paises.find(p => `+${p.phone_code}` === valor)
                                            if (paisExacto) {
                                                setCodigoPais(`+${paisExacto.phone_code}`)
                                                setShowCodigoDropdown(false)
                                                setCodigoSearch('')
                                            }
                                        }}
                                        onFocus={() => {
                                            setShowCodigoDropdown(true)
                                            setCodigoSearch('')
                                        }}
                                        className="h-10 text-center text-xs px-1 pr-5"
                                    />
                                    <ChevronDown 
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
                                    />
                                </div>
                                {showCodigoDropdown && (
                                    <div className="absolute left-0 z-50 mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto" style={{ width: 'calc(100vw - 2rem)', maxWidth: '320px' }}>
                                        {loadingPaises ? (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">
                                                Cargando países...
                                            </div>
                                        ) : paisesFiltrados.length > 0 ? (
                                            paisesFiltrados.map((p) => (
                                                <div
                                                    key={p.id}
                                                    className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex items-center gap-2"
                                                    onClick={() => {
                                                        setCodigoPais(`+${p.phone_code}`)
                                                        setShowCodigoDropdown(false)
                                                        setCodigoSearch('')
                                                    }}
                                                >
                                                    <span className="font-semibold whitespace-nowrap">+{p.phone_code}</span>
                                                    <span className="text-muted-foreground truncate">{p.nombre}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">
                                                No se encontraron países
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <Input
                                placeholder="300 000 0000"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                className="h-10 flex-1"
                                type="tel"
                            />
                        </div>
                    </div>
                </div>

                {/* ─── Acceso al sistema ─── */}
                <SeccionTitulo>Acceso al sistema</SeccionTitulo>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                        <Etiqueta requerido>Usuario</Etiqueta>
                        <div className="relative">
                            <Input
                                placeholder={generandoUsuario ? 'Generando...' : isEditing ? '' : 'Se genera automáticamente'}
                                value={usuario}
                                onChange={(e) => handleUsuarioChange(e.target.value)}
                                disabled={generandoUsuario || isEditing}
                                className={`h-10 pr-14 ${
                                    isEditing ? 'bg-muted/50' :
                                    usuarioStatus === 'available' ? 'border-green-500 focus-visible:ring-green-500' :
                                    usuarioStatus === 'taken' ? 'border-destructive focus-visible:ring-destructive' : ''
                                }`}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {generandoUsuario || usuarioStatus === 'checking' ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : usuarioStatus === 'available' ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : usuarioStatus === 'taken' ? (
                                    <XCircle className="h-4 w-4 text-destructive" />
                                ) : null}
                                <button
                                    type="button"
                                    onClick={handleRegenerar}
                                    disabled={generandoUsuario || name.trim().split(/\s+/).length < 2}
                                    className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Regenerar usuario"
                                >
                                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {usuarioStatus === 'available' && <span className="text-green-600">Disponible</span>}
                            {usuarioStatus === 'taken' && <span className="text-destructive">Ya existe</span>}
                            {usuarioStatus === 'checking' && 'Verificando...'}
                            {usuarioStatus === 'idle' && usuario === '' && 'Se genera con el nombre'}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Etiqueta requerido>Rol</Etiqueta>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={roleId?.toString() || ''}
                            onChange={(e) => {
                                const nextId = e.target.value ? parseInt(e.target.value, 10) : null
                                setRoleId(nextId)
                                const rol = roles.find(r => r.id === nextId)
                                if (!rolTieneModuloConductor(rol)) {
                                    setFormaPago('')
                                }
                            }}
                            disabled={loadingRoles || loadingUser}
                        >
                            <option value="">{loadingRoles || loadingUser ? "Cargando..." : "Seleccione un rol"}</option>
                            {roles.map((rol) => (
                                <option key={rol.id} value={rol.id.toString()}>
                                    {rol.nombre} {rol.pin ? '(PIN)' : '(Contraseña)'}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        {roleId && requierePin ? (
                            <>
                                <Etiqueta requerido={!isEditing}>PIN de Acceso</Etiqueta>
                                <div className="flex gap-1.5 items-center">
                                    <Input
                                        type="text"
                                        placeholder={isEditing ? 'Dejar vacío para no cambiar' : 'PIN 4 dígitos'}
                                        value={credencial}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '')
                                            setCredencial(val)
                                        }}
                                        maxLength={4}
                                        inputMode="numeric"
                                        className="h-10 flex-1 tracking-widest text-center font-mono"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-10 px-3 shrink-0"
                                        onClick={() => {
                                            const pinRandom = Math.floor(1000 + Math.random() * 9000).toString()
                                            setCredencial(pinRandom)
                                        }}
                                    >
                                        Generar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-10 px-2.5 shrink-0"
                                        disabled={!credencial}
                                        onClick={() => {
                                            navigator.clipboard.writeText(credencial)
                                        }}
                                        title="Copiar PIN"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">4 dígitos · editable</p>
                            </>
                        ) : roleId && !requierePin ? (
                            <>
                                <Etiqueta requerido={!isEditing}>Contraseña</Etiqueta>
                                <Input
                                    type="password"
                                    placeholder={isEditing ? 'Dejar vacío para no cambiar' : 'Contraseña del usuario'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </>
                        ) : (
                            <>
                                <label className="text-sm font-medium text-muted-foreground">Contraseña / PIN</label>
                                <Input
                                    disabled
                                    placeholder="Seleccione un rol primero"
                                    value=""
                                    className="h-10"
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* ─── Vinculación y operación ───
                    Usuario de Siesa siempre; Maquinaria y Forma de pago solo para
                    roles con MODULO_CONDUCTOR. Con rol no conductor la fila queda
                    en 2 columnas para que el campo no se vea perdido a 1/3. */}
                <SeccionTitulo>Vinculación y operación</SeccionTitulo>
                <div
                    className={`grid grid-cols-1 gap-5 ${rolTieneModuloConductor(rolSeleccionado) ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}
                >
                    <div className="space-y-2" ref={siesaRef}>
                        <Etiqueta>Usuario de Siesa</Etiqueta>
                        <div className="relative">
                            <Input
                                placeholder="Buscar usuario de Siesa..."
                                value={siesaSelected
                                    ? [siesaSelected.f552_nombre, siesaSelected.f552_descripcion]
                                          .filter(Boolean)
                                          .join(' — ')
                                    : siesaSearch}
                                onChange={(e) => {
                                    setSiesaSelected(null)
                                    setSiesaSearch(e.target.value)
                                    setShowSiesaDropdown(true)
                                }}
                                onFocus={() => setShowSiesaDropdown(true)}
                                className="h-10 pr-8"
                            />
                            {siesaSelected && (
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
                                    title="Quitar vinculación"
                                    onClick={() => {
                                        setSiesaSelected(null)
                                        setSiesaSearch('')
                                        setSiesaOptions([])
                                    }}
                                >
                                    <XCircle className="h-4 w-4 text-muted-foreground" />
                                </button>
                            )}
                            {!siesaSelected && siesaLoading && (
                                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            {showSiesaDropdown && !siesaSelected && (
                                <div className="absolute left-0 right-0 z-50 mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto">
                                    {siesaLoading ? (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
                                    ) : siesaOptions.length > 0 ? (
                                        siesaOptions.map((u) => (
                                            <div
                                                key={u.f552_rowid}
                                                className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex flex-col"
                                                onClick={() => {
                                                    setSiesaSelected(u)
                                                    setSiesaSearch('')
                                                    setShowSiesaDropdown(false)
                                                }}
                                            >
                                                <span className="font-medium">{u.f552_nombre}</span>
                                                <span className="text-xs text-muted-foreground">{u.f552_descripcion}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">
                                            {siesaSearch ? 'Sin resultados' : 'Escriba para buscar'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {siesaSelected && (
                            <p className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Vinculado · ID {siesaSelected.f552_rowid}
                            </p>
                        )}
                    </div>
                    {rolTieneModuloConductor(rolSeleccionado) && (
                        <div className="space-y-2" ref={maqRef}>
                            <Etiqueta>Maquinaria</Etiqueta>
                            <div className="relative">
                                <Input
                                    placeholder="Buscar por placa o categoría..."
                                    value={maqSelected
                                        ? `${maqSelected.PLACA} — ${maqSelected.CATEGORIA}`
                                        : maqSearch}
                                    onChange={(e) => {
                                        setMaqSelected(null)
                                        setMaqSearch(e.target.value)
                                        setShowMaqDropdown(true)
                                    }}
                                    onFocus={() => setShowMaqDropdown(true)}
                                    className="h-10 pr-8"
                                />
                                {maqSelected && (
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
                                        title="Quitar maquinaria asignada"
                                        onClick={() => {
                                            setMaqSelected(null)
                                            setMaqSearch('')
                                        }}
                                    >
                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                )}
                                {!maqSelected && maqLoading && (
                                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                                {showMaqDropdown && !maqSelected && (
                                    <div className="absolute left-0 right-0 z-50 mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto">
                                        {maqLoading ? (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
                                        ) : maqOptions.length > 0 ? (
                                            maqOptions.map((m) => (
                                                <div
                                                    key={m.Cod_Equipo}
                                                    className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex flex-col"
                                                    onClick={() => {
                                                        setMaqSelected(m)
                                                        setMaqSearch('')
                                                        setShowMaqDropdown(false)
                                                    }}
                                                >
                                                    <span className="font-medium">{m.PLACA}</span>
                                                    <span className="text-xs text-muted-foreground">{m.CATEGORIA}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">
                                                {maqSearch ? 'Sin resultados' : 'No hay maquinaria disponible'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {maqSelected && (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Asignada · Equipo {maqSelected.Cod_Equipo}
                                </p>
                            )}
                        </div>
                    )}
                    {rolTieneModuloConductor(rolSeleccionado) && (
                        <div className="space-y-2">
                            <Etiqueta>Forma de pago</Etiqueta>
                            <Input
                                placeholder="Ej. transferencia, efectivo..."
                                value={formaPago}
                                onChange={(e) => setFormaPago(e.target.value)}
                                className="h-10"
                            />
                        </div>
                    )}
                </div>

                {/* Observaciones a ancho completo: es texto libre y se beneficia
                    de más espacio que un tercio de fila. */}
                <div className="space-y-2">
                    <Etiqueta>Observaciones</Etiqueta>
                    <Input
                        placeholder="Notas opcionales sobre el usuario..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="h-10"
                    />
                </div>

                {/* Acciones: pegadas abajo y separadas del contenido. La nota de
                    campos obligatorios va a la izquierda para no competir con los
                    botones, que quedan alineados a la derecha (acción primaria al final). */}
                <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                        Los campos marcados con <span className="text-destructive">*</span> son obligatorios
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={onClose} className="min-w-[110px]">Cancelar</Button>
                        <Button onClick={handleSave} className="min-w-[160px]">
                            {isEditing ? 'Actualizar Usuario' : 'Guardar Usuario'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
