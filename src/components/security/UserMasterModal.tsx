import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, RefreshCw, AlertCircle, User, Mail, Phone, KeyRound, FileText, CheckCircle2, Shield } from 'lucide-react'
import { seguridadApi, AuthRole } from '@/api/seguridad'
import { Select } from '@/components/ui/select'

interface UserMasterModalProps {
    isOpen: boolean
    onClose: () => void
    user?: any
}

export const UserMasterModal = ({ isOpen, onClose, user }: UserMasterModalProps) => {
    const isEditing = !!user

    const [usuario, setUsuario] = useState('')
    const [nombreCompleto, setNombreCompleto] = useState('')
    const [email, setEmail] = useState('')
    const [codigoPais, setCodigoPais] = useState('+57')
    const [telefono, setTelefono] = useState('')
    const [rolId, setRolId] = useState<number | null>(null)
    const [pin, setPin] = useState('')
    const [contraseña, setContraseña] = useState('')
    const [observaciones, setObservaciones] = useState('')
    const [activo, setActivo] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [pinCopied, setPinCopied] = useState(false)
    const [roles, setRoles] = useState<AuthRole[]>([])
    const [loadingRoles, setLoadingRoles] = useState(false)
    const [rolSeleccionado, setRolSeleccionado] = useState<AuthRole | null>(null)

    // Cargar roles y datos del usuario al abrir el modal
    useEffect(() => {
        if (isOpen) {
            // Resetear estados
            setUsuario(user?.usuario || '')
            setNombreCompleto(user?.nombre_completo || '')
            setEmail(user?.email || '')
            
            // Separar código de país y teléfono
            const telefonoCompleto = user?.telefono || ''
            if (telefonoCompleto.startsWith('+57')) {
                setCodigoPais('+57')
                setTelefono(telefonoCompleto.replace('+57', '').trim())
            } else {
                setCodigoPais('+57')
                setTelefono(telefonoCompleto)
            }
            
            const userRolId = user?.rol_id || null
            setRolId(userRolId)
            setPin(user?.pin || '')
            setContraseña('') // No mostrar contraseña existente por seguridad
            setObservaciones(user?.observaciones || '')
            setActivo(user?.activo !== false)
            setError(null)
            setIsSubmitting(false)
            setPinCopied(false)
            setRolSeleccionado(null)
            
            // Cargar roles y luego establecer el rol seleccionado si existe
            loadRoles(userRolId)
        }
    }, [isOpen, user?.id])

    const loadRoles = async (rolIdToSet?: number | null) => {
        try {
            setLoadingRoles(true)
            const res = await seguridadApi.listarRoles()
            // Filtrar solo roles activos
            const rolesActivos = (res.data || []).filter(rol => rol.Estado === true)
            setRoles(rolesActivos)
            
            // Si hay un rol_id para establecer, buscarlo en los roles cargados
            if (rolIdToSet && res.data) {
                const rol = res.data.find(r => r.id === rolIdToSet && r.Estado === true)
                if (rol) {
                    setRolSeleccionado(rol)
                }
            }
        } catch (err) {
            console.error('Error cargando roles:', err)
            setError('Error al cargar los roles disponibles')
        } finally {
            setLoadingRoles(false)
        }
    }

    const handleRolChange = (rolIdStr: string) => {
        const rolIdNum = parseInt(rolIdStr, 10)
        setRolId(rolIdNum)
        const rol = roles.find(r => r.id === rolIdNum)
        setRolSeleccionado(rol || null)
        // Limpiar campos de autenticación al cambiar de rol
        setPin('')
        setContraseña('')
    }

    const generateRandomPin = () => {
        const newPin = Math.floor(1000 + Math.random() * 9000).toString()
        setPin(newPin)
        setPinCopied(false)
    }

    const copyPin = () => {
        const textoACopiar = rolSeleccionado?.pin ? pin : contraseña
        if (textoACopiar) {
            navigator.clipboard.writeText(textoACopiar)
            setPinCopied(true)
            setTimeout(() => setPinCopied(false), 2000)
        }
    }

    const handleSave = async () => {
        if (!usuario.trim()) {
            setError('El nombre de usuario es obligatorio')
            return
        }
        if (!rolId) {
            setError('Debe seleccionar un rol')
            return
        }
        
        // Validar según el tipo de autenticación del rol
        if (rolSeleccionado?.pin) {
            if (!pin.trim()) {
                setError('El PIN de acceso es obligatorio')
                return
            }
        } else {
            if (!contraseña.trim()) {
                setError('La contraseña es obligatoria')
                return
            }
        }

        try {
            setIsSubmitting(true)
            setError(null)

            // Verificar que hay token antes de crear usuario
            const token = localStorage.getItem('auth_token')
            if (!token) {
                setError('No hay sesión activa. Por favor, inicie sesión nuevamente.')
                return
            }

            // Construir teléfono completo con código de país
            const telefonoCompleto = telefono.trim() 
                ? `${codigoPais}${telefono.trim()}` 
                : null

            const userData = {
                usuario: usuario.trim(),
                nombre_completo: nombreCompleto.trim() || null,
                email: email.trim() || null,
                telefono: telefonoCompleto,
                rol_id: rolId,
                pin: rolSeleccionado?.pin ? pin : undefined,
                contraseña: rolSeleccionado?.pin ? undefined : contraseña,
                observaciones: observaciones.trim() || null,
                activo,
            }

            console.log('📤 Enviando petición para crear usuario:', userData)
            console.log('🔑 Token disponible:', token ? `${token.substring(0, 20)}...` : 'NO HAY TOKEN')
            await seguridadApi.crearUsuario(userData)
            console.log('✅ Usuario creado exitosamente')
            onClose()
        } catch (err: any) {
            console.error('Error al crear usuario maestro:', err)
            setError(err.response?.data?.message || err.message || 'Error desconocido al crear el usuario')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
        >
            <div className="mt-2 space-y-5">
                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Información de la Cuenta */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-primary/20">
                        <User className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-primary tracking-wide uppercase">Información de la Cuenta</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Usuario (Login) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                    placeholder="Ej. conductor1"
                                    value={usuario}
                                    onChange={(e) => setUsuario(e.target.value)}
                                    className="pl-9 h-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Nombre Completo
                            </label>
                            <Input
                                placeholder="Ej. Juan Pérez"
                                value={nombreCompleto}
                                onChange={(e) => setNombreCompleto(e.target.value)}
                                className="h-10"
                            />
                        </div>
                    </div>
                </div>

                {/* Contacto */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-primary/20">
                        <Mail className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-primary tracking-wide uppercase">Contacto</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                    type="email"
                                    placeholder="usuario@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9 h-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Teléfono (Opcional)
                            </label>
                            <div className="flex gap-2 items-start">
                                <div className="space-y-1.5 w-20">
                                    <label className="text-xs text-muted-foreground">Código</label>
                                    <Input
                                        placeholder="+57"
                                        value={codigoPais}
                                        onChange={(e) => setCodigoPais(e.target.value)}
                                        className="h-10 text-center font-semibold"
                                    />
                                </div>
                                <div className="space-y-1.5 flex-1">
                                    <label className="text-xs text-muted-foreground">Número</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                        <Input
                                            placeholder="300 000 0000"
                                            value={telefono}
                                            onChange={(e) => setTelefono(e.target.value)}
                                            className="pl-9 h-10"
                                            type="tel"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rol y Seguridad */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-primary/20">
                        <Shield className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-primary tracking-wide uppercase">Rol y Seguridad</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Rol <span className="text-red-500">*</span>
                            </label>
                            <Select
                                value={rolId?.toString() || ''}
                                onChange={(e) => handleRolChange(e.target.value)}
                                disabled={loadingRoles}
                                className="h-10"
                            >
                                <option value="">{loadingRoles ? "Cargando roles..." : "Seleccione un rol"}</option>
                                {roles.map((rol) => (
                                    <option key={rol.id} value={rol.id.toString()}>
                                        {rol.nombre} {rol.pin ? '(PIN)' : '(Contraseña)'}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        {rolSeleccionado && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {rolSeleccionado.pin ? 'PIN de Acceso' : 'Contraseña'} <span className="text-red-500">*</span>
                                </label>
                                {rolSeleccionado.pin ? (
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                            <Input
                                                type="text"
                                                placeholder="1234"
                                                value={pin}
                                                onChange={(e) => setPin(e.target.value)}
                                                className="pl-9 h-10 font-mono text-lg tracking-[0.3em]"
                                                maxLength={4}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={copyPin}
                                            title="Copiar PIN"
                                            className={`h-10 w-10 shrink-0 transition-colors ${pinCopied ? 'border-green-500 text-green-500' : ''}`}
                                        >
                                            {pinCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={generateRandomPin}
                                            title="Generar PIN Aleatorio"
                                            className="h-10 shrink-0 gap-2"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                            Generar
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                            <Input
                                                type="password"
                                                placeholder="Ingrese la contraseña"
                                                value={contraseña}
                                                onChange={(e) => setContraseña(e.target.value)}
                                                className="pl-9 h-10"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={copyPin}
                                            title="Copiar Contraseña"
                                            className={`h-10 w-10 shrink-0 transition-colors ${pinCopied ? 'border-green-500 text-green-500' : ''}`}
                                        >
                                            {pinCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Observaciones */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-primary/20">
                        <FileText className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-primary tracking-wide uppercase">Notas</h3>
                    </div>
                    <div className="space-y-1.5">
                        <textarea
                            className="flex min-h-[40px] h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                            placeholder="Notas opcionales..."
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                        />
                    </div>
                </div>

                {/* Estado + Botones */}
                <div className="flex items-center justify-between pt-3 border-t">
                    <div
                        onClick={() => setActivo(!activo)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all select-none ${activo
                            ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'
                            : 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400'
                            }`}
                    >
                        <div className={`w-3 h-3 rounded-full ${activo ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-semibold">{activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="px-6">
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={isSubmitting} className="px-6 gap-2">
                            {isSubmitting ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Guardar Usuario'
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
