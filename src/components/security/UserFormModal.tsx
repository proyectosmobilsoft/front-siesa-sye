import { useState, useEffect, useRef, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { seguridadApi, AuthRole } from '@/api/seguridad'
import { paisesApi, Pais } from '@/api/paises'
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
    user?: any // If editing, pass the user object
}

export const UserFormModal = ({ isOpen, onClose, user }: UserFormModalProps) => {
    const isEditing = !!user

    // Form states
    const [name, setName] = useState(user?.name || '')
    const [email, setEmail] = useState(user?.email || '')
    const [codigoPais, setCodigoPais] = useState('+57')
    const [telefono, setTelefono] = useState('')
    const [roleId, setRoleId] = useState<number | null>(user?.rol_id || null)
    const [pin, setPin] = useState('')
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
                setPin('')
                setPassword('')
                setUsuario('')
                setUsuarioStatus('idle')
            } else {
                setName(user?.name || '')
                setEmail(user?.email || '')
                
                // Separar código de país y teléfono
                const telefonoCompleto = user?.phone || ''
                if (telefonoCompleto.startsWith('+57')) {
                    setCodigoPais('+57')
                    setTelefono(telefonoCompleto.replace('+57', '').trim())
                } else {
                    setCodigoPais('+57')
                    setTelefono(telefonoCompleto)
                }
                
                setRoleId(user?.rol_id || null)
                setPin('')
                setPassword('')
                setUsuario(user?.usuario || '')
                setUsuarioStatus('idle')
            }
        }
    }, [isOpen, user?.id, isEditing, user])

    const loadRoles = async () => {
        try {
            setLoadingRoles(true)
            const res = await seguridadApi.listarRoles()
            // Filtrar solo roles activos
            const rolesActivos = (res.data || []).filter(rol => rol.Estado === true)
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

    // Limpiar PIN/contraseña si el rol cambia
    useEffect(() => {
        if (!requierePin) {
            setPin('')
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

        const payload = {
            usuario,
            rol_id: roleId,
            pin: requierePin ? pin : undefined,
            contraseña: !requierePin ? password : undefined,
            email: email.trim() || null,
            telefono: telefonoCompleto,
            nombre_completo: name.trim() || null,
            observaciones: null,
            activo: true,
        }

        // Mostrar el JSON que se envía al endpoint
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
            className="max-w-3xl"
        >
            <div className="mt-6 space-y-6">
                {/* Fila 1: Nombre / Correo / Celular */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre Completo</label>
                        <Input
                            placeholder="Ej. Juan Pérez"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Correo Electrónico</label>
                        <Input
                            type="email"
                            placeholder="juan@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Celular (Opcional)</label>
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

                {/* Fila 2: Usuario / Rol / Contraseña o PIN */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Usuario</label>
                        <div className="relative">
                            <Input
                                placeholder={generandoUsuario ? 'Generando...' : 'Se genera automáticamente'}
                                value={usuario}
                                onChange={(e) => handleUsuarioChange(e.target.value)}
                                disabled={generandoUsuario}
                                className={`h-10 pr-14 ${
                                    usuarioStatus === 'available' ? 'border-green-500 focus-visible:ring-green-500' :
                                    usuarioStatus === 'taken' ? 'border-red-500 focus-visible:ring-red-500' : ''
                                }`}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {generandoUsuario || usuarioStatus === 'checking' ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : usuarioStatus === 'available' ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : usuarioStatus === 'taken' ? (
                                    <XCircle className="h-4 w-4 text-red-500" />
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
                            {usuarioStatus === 'taken' && <span className="text-red-600">Ya existe</span>}
                            {usuarioStatus === 'checking' && 'Verificando...'}
                            {usuarioStatus === 'idle' && usuario === '' && 'Se genera con el nombre'}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Rol</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={roleId?.toString() || ''}
                            onChange={(e) => setRoleId(e.target.value ? parseInt(e.target.value, 10) : null)}
                            disabled={loadingRoles}
                        >
                            <option value="">{loadingRoles ? "Cargando roles..." : "Seleccione un rol"}</option>
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
                                <label className="text-sm font-medium">PIN de Acceso</label>
                                <div className="flex gap-1.5 items-center">
                                    <Input
                                        type="text"
                                        placeholder="PIN 4 dígitos"
                                        value={pin}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '')
                                            setPin(val)
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
                                            setPin(pinRandom)
                                        }}
                                    >
                                        Generar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-10 px-2.5 shrink-0"
                                        disabled={!pin}
                                        onClick={() => {
                                            navigator.clipboard.writeText(pin)
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
                                <label className="text-sm font-medium">Contraseña</label>
                                <Input
                                    type="password"
                                    placeholder="Contraseña del usuario"
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
                                    className="h-10"
                                />
                            </>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Usuario</Button>
                </div>
            </div>
        </Modal>
    )
}
